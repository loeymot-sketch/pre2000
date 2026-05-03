import { createLogger } from '../utils/logger';
const log = createLogger('HomeScreen');
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
    RefreshControl,
    Dimensions,
    Modal,
    Alert,
    ActivityIndicator,
    Animated,
    TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeHeader } from '../components/home/HomeHeader';
import { BabyGrowthCard } from '../components/home/BabyGrowthCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentWeek } from '../services/useCurrentWeek';
import { useAuth } from '../context/AuthContext';
import { usePregnancy } from '../context/PregnancyContext';
import { theme } from '../theme';
import { getShadowStyle, getTextShadowStyle } from '../utils/styleUtils';
import { Card } from '../components/common/Card';
import { SectionHeader } from '../components/common/SectionHeader';
import { Skeleton } from '../components/common/Skeleton'; // D4
import { EmptyState } from '../components/common/EmptyState'; // D5
import { RtlAwareChevron } from '../components/common/RtlAwareChevron';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getArticlesByIds, getSupplementsByIds } from '../services/contentService';
import { getUpcomingAppointments } from '../services/calendarService';
import { getTipForDay } from '../services/tipsService'; // ANTIGRAVITY
import { getMessageForDay } from '../services/babyMessageService'; // BABY MESSAGES
import { Article, Supplement, UserEvent, Tip, BabyMessage } from '../types';
import { format, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getLocalizedContent } from '../utils/i18nHelpers';
import { useDateLocale } from '../hooks/useDateLocale';
// V3 NEW COMPONENTS
import { BabyFactsCard } from '../components/home/BabyFactsCard';
import { MomTipsCard } from '../components/home/MomTipsCard';

import { BabyMessageCard } from '../components/home/BabyMessageCard'; // Quick Win #1
import { CollapsibleCard } from '../components/common/CollapsibleCard'; // Reorganization
import { DailyRoutinesTracker } from '../components/home/DailyRoutinesTracker'; // Unified Tracker
import { UserTask } from '../types';
import { trackPositiveAction } from '../services/inAppReviewService';
import { getUserTasks } from '../services/taskService';
import { HomeScreenNavigationProp } from '../types/navigation';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

const { width } = Dimensions.get('window');

export const HomeScreen = () => {
    useScreenAnalytics('HomeScreen');
    const [overrideWeek, setOverrideWeek] = useState<number | null>(null);
    const [overrideDay, setOverrideDay] = useState<number | null>(null);
    const { weekData, loading, error, currentWeekNumber, currentDay, isInvalid } = useCurrentWeek(overrideWeek ?? undefined);
    const { t, i18n } = useTranslation();
    const dateLocale = useDateLocale();
    const { user } = useAuth();
    const { profile } = usePregnancy();
    const navigation = useNavigation();

    const [articles, setArticles] = useState<Article[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [appointments, setAppointments] = useState<UserEvent[]>([]);
    const [tasks, setTasks] = useState<UserTask[]>([]); // Tasks for SmartReminders
    const [dailyTip, setDailyTip] = useState<Tip | null>(null); // ANTIGRAVITY
    const [babyMessage, setBabyMessage] = useState<BabyMessage | null>(null); // BABY MESSAGES
    const [showFullWarnings, setShowFullWarnings] = useState(false); // UI Refinement
    const [showFullBodyText, setShowFullBodyText] = useState(false); // UI Refinement

    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.95));
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: false,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: false,
            }),
        ]).start();

        // Pulse animation for profile button
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: false,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: false,
                }),
            ])
        );
        pulseLoop.start();

        // Engagement: Track daily check
        trackPositiveAction('daily_check');

        return () => {
            pulseLoop.stop();
        };
    }, []);

    // ── PERF: Articles + Supplements in parallel (was sequential) ──────────
    useEffect(() => {
        let isMounted = true;
        const fetchRecommendations = async () => {
            try {
                if (weekData) {
                    const articleIds = (weekData.recommended_articles_ids && typeof weekData.recommended_articles_ids === 'string')
                        ? weekData.recommended_articles_ids.split(',').map(id => id.trim()).filter(id => id)
                        : [];
                    const supplementIds = (weekData.recommended_supplements_ids && typeof weekData.recommended_supplements_ids === 'string')
                        ? weekData.recommended_supplements_ids.split(',').map(id => id.trim()).filter(id => id)
                        : [];

                    const [arts, supps] = await Promise.all([
                        articleIds.length > 0 ? getArticlesByIds(articleIds) : Promise.resolve([]),
                        supplementIds.length > 0 ? getSupplementsByIds(supplementIds) : Promise.resolve([]),
                    ]);

                    if (isMounted) {
                        log.debug('[HomeScreen] 📰 Loaded', arts.length, 'articles + 💊', supps.length, 'supplements for week', currentWeekNumber);
                        setArticles(arts);
                        setSupplements(supps);
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    log.error('Error fetching recommendations:', error);
                }
            }
        };
        fetchRecommendations();
        return () => { isMounted = false; };
    }, [weekData]);

    // ── PERF: Appointments + Tasks in parallel (was sequential) ────────────
    useFocusEffect(
        useCallback(() => {
            const fetchAppointmentsAndTasks = async () => {
                if (user?.uid) {
                    const [apps, userTasks] = await Promise.all([
                        getUpcomingAppointments(user.uid),
                        getUserTasks(user.uid),
                    ]);
                    setAppointments(apps);
                    setTasks(userTasks);
                }
            };
            fetchAppointmentsAndTasks();
        }, [user?.uid])
    );

    // ── PERF: Tip + BabyMessage in parallel (same deps, was 2 separate effects) ──
    useEffect(() => {
        let isMounted = true;
        const fetchDailyContent = async () => {
            if (currentWeekNumber && (overrideDay || currentDay)) {
                const dayToUse = overrideDay || currentDay;
                const [tip, message] = await Promise.all([
                    getTipForDay(currentWeekNumber, dayToUse),
                    getMessageForDay(currentWeekNumber, dayToUse),
                ]);
                if (isMounted) {
                    setDailyTip(tip);
                    setBabyMessage(message);
                }
            }
        };
        fetchDailyContent();
        return () => { isMounted = false; };
    }, [currentWeekNumber, currentDay, overrideDay]);

    const handlePrevWeek = useCallback(() => {
        if (currentWeekNumber > 1) {
            setOverrideWeek(currentWeekNumber - 1);
            // Animate transition
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0.7, duration: 150, useNativeDriver: false }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
            ]).start();
        }
    }, [currentWeekNumber, fadeAnim]);

    const handleNextWeek = useCallback(() => {
        if (currentWeekNumber < 40) {
            setOverrideWeek(currentWeekNumber + 1);
            setOverrideDay(null); // Reset day when changing week
            // Animate transition
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0.7, duration: 150, useNativeDriver: false }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
            ]).start();
        }
    }, [currentWeekNumber, fadeAnim]);



    if (loading) {
        // D4: Skeleton-based loading replaces opaque ActivityIndicator. Mimics the
        // structure of the ready-state hero card → user perceives the screen as fast.
        return (
            <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 16 }}>
                <Skeleton.Title width="60%" />
                <Skeleton width="40%" height={14} style={{ marginTop: 8, marginBottom: 24 }} />
                <Skeleton.Card style={{ height: 200, marginBottom: 16 }} />
                <Skeleton.Card style={{ height: 120, marginBottom: 16 }} />
                <Skeleton width="50%" height={18} style={{ marginTop: 8, marginBottom: 12 }} />
                <Skeleton.Card style={{ height: 80, marginBottom: 8 }} />
                <Skeleton.Card style={{ height: 80 }} />
            </ScrollView>
        );
    }

    if (error || !weekData) {
        return (
            <EmptyState
                icon="😔"
                title={error ? t(error) : t('common.noDataAvailable')}
            />
        );
    }

    const cleanTitle = getLocalizedContent(weekData, 'title', i18n.language).replace(/###\s*/g, '').trim();
    const babyFacts = getLocalizedContent(weekData, 'baby_facts', i18n.language)?.split('•').filter(f => f.trim()).map(f => f.trim()) || [];
    const momTips = getLocalizedContent(weekData, 'mom_tips', i18n.language)?.split('•').filter(t => t.trim()).map(t => t.trim()) || [];

    const displayName = profile?.firstName || user?.firstName || t('home.futureMom');
    const userEmail = user?.email || t('profile.guestUser');
    const trimesterText = t('common.trimester_' + weekData.trimester);



    const renderRecommendationCard = ({ item }: { item: Article | Supplement }) => {
        const isArticle = 'article_id' in item;
        const title = getLocalizedContent(item, isArticle ? 'title' : 'name', i18n.language);
        const subtitle = isArticle ? (item as Article).category : t('common.supplements');

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    if (isArticle) {
                        navigation.navigate('ArticleDetail', { articleId: (item as Article).article_id });
                    } else {
                        navigation.navigate('SupplementDetail', { supplementId: (item as Supplement).supplement_id });
                    }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${subtitle}`}
                accessibilityHint={isArticle ? t('a11y.readArticle') : t('a11y.openSupplement')}
            >
                <View style={styles.recommendationCard}>
                    <LinearGradient
                        colors={isArticle ? [theme.colors.gradientPinkStart, theme.colors.gradientPinkEnd] : [theme.colors.surfaceBlueTint, theme.colors.surfaceBluePale]}
                        style={styles.recommendationGradient}
                    >
                        <View style={styles.recHeader}>
                            <Text style={styles.recEmoji}>{isArticle ? '📰' : '💊'}</Text>
                        </View>
                        <Text style={styles.recTitle} numberOfLines={2}>{title}</Text>
                        <View style={styles.recBadge}>
                            <Text style={styles.recBadgeText}>{subtitle}</Text>
                        </View>
                    </LinearGradient>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Gradient Header */}
            <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent, theme.colors.deepPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    {/* Profile Button - Absolute Top Right */}
                    <Animated.View style={[styles.profileButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
                        <TouchableOpacity
                            style={styles.profileButton}
                            onPress={() => navigation.navigate('Profile')}
                            activeOpacity={0.8}
                            accessibilityLabel={t('a11y.profile')}
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={[theme.colors.whiteAlpha30, theme.colors.whiteAlpha10]}
                                style={styles.profileGradient}
                            >
                                <Text style={styles.profileButtonText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Centered Content */}
                    <View style={styles.centerContent}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.greeting}>
                                {t('home.greeting', { name: profile?.firstName || user?.firstName || t('home.futureMom') })}
                            </Text>
                        </View>
                        {/* Week Navigation */}
                        {/* MA7-FIX: hide pregnancy week badge + navigation for TTC users.
                            They are not pregnant, so showing "Semaine X" is medically wrong. */}
                        {!user?.isTTC && (
                            <View style={styles.weekNavContainer}>
                                <TouchableOpacity
                                    onPress={handlePrevWeek}
                                    disabled={currentWeekNumber <= 1}
                                    style={styles.navButton}
                                    activeOpacity={0.7}
                                    accessibilityLabel={t('a11y.previousWeek')}
                                    accessibilityRole="button"
                                >
                                    <RtlAwareChevron
                                        direction="back"
                                        size={36}
                                        color={currentWeekNumber <= 1 ? theme.colors.whiteAlpha30 : theme.colors.white}
                                        style={{ fontWeight: 'bold' }}
                                    />
                                </TouchableOpacity>
                                <View style={styles.weekBadge}>
                                    <Text style={styles.weekTitle}>{t('common.week')} {currentWeekNumber}</Text>
                                    <Text style={styles.trimesterBadge}>{trimesterText}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={handleNextWeek}
                                    disabled={currentWeekNumber >= 40}
                                    style={styles.navButton}
                                    activeOpacity={0.7}
                                    accessibilityLabel={t('a11y.nextWeek')}
                                    accessibilityRole="button"
                                >
                                    <RtlAwareChevron
                                        direction="forward"
                                        size={36}
                                        color={currentWeekNumber >= 40 ? theme.colors.whiteAlpha30 : theme.colors.white}
                                        style={{ fontWeight: 'bold' }}
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Week Title (without repeating 'Semaine X') */}
                        <Text style={styles.weekSubtitle}>
                            {getLocalizedContent(weekData, 'title', i18n.language).replace(/^#{1,4}\s*/g, '').replace(/^(Semaine|Week|الأسبوع)\s*\d+\s*[-–]\s*/i, '').trim()} {weekData.emoji}
                        </Text>



                        {/* Minimal Quick Links - Single Row */}
                        <View style={styles.quickLinksRow}>
                            <TouchableOpacity onPress={() => navigation.navigate('Calendrier')} activeOpacity={0.7} testID="home_quick_appointments" accessibilityRole="button">
                                <Text style={styles.quickLink}>📅 {t('home.myAppointments')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.linkDivider}>•</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Rappels', { screen: 'RemindersMain', params: { screen: 'TasksTab', params: { action: 'add' } } })} activeOpacity={0.7} testID="home_quick_add_task" accessibilityRole="button">
                                <Text style={styles.quickLink}>➕ {t('home.addTask', 'Tâche')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.linkDivider}>•</Text>
                            <TouchableOpacity onPress={() => {
                                let targetDate = new Date();
                                if (profile?.lmp && currentWeekNumber) {
                                    const dayOffset = (overrideDay || currentDay || 1) - 1;
                                    const weekOffset = (currentWeekNumber - 1) * 7;
                                    targetDate = addDays(new Date(profile.lmp), weekOffset + dayOffset);
                                }
                                navigation.navigate('Calendrier', {
                                    screen: 'AddAppointment',
                                    params: { selectedDate: targetDate.toISOString() }
                                });
                            }} activeOpacity={0.7} testID="home_quick_add_appointment" accessibilityRole="button">
                                <Text style={styles.quickLink}>➕ {t('home.addAppointment', 'RDV')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.linkDivider}>•</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Ressources', { screen: 'ResourcesMain', params: { openSearch: true } })} activeOpacity={0.7} testID="home_quick_search" accessibilityRole="button">
                                <Text style={styles.quickLink}>🔍 {t('common.search')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* GROUP 2.5: UNIFIED DAILY TRACKER (RDV + Tasks) */}
                        <View style={{ marginTop: 12 }}>
                            <DailyRoutinesTracker appointments={appointments} />
                        </View>

                    </View>
                </Animated.View>
            </LinearGradient>

            <View style={[styles.contentContainer, { marginTop: -60 }]}>
                {/* POST-PARTUM / ETERNAL PREGNANCY BANNER */}
                {isInvalid && (
                    <View style={styles.postpartumBanner}>
                        <Text style={styles.postpartumEmoji}>🍼</Text>
                        <View style={styles.postpartumTextContainer}>
                            <Text style={styles.postpartumTitle}>Avez-vous accueilli votre bébé ?</Text>
                            <Text style={styles.postpartumDesc}>Il semblerait que votre date prévue d'accouchement soit passée ! Mettez à jour votre profil pour passer en mode post-partum.</Text>
                            <TouchableOpacity 
                                style={styles.postpartumButton}
                                onPress={() => navigation.navigate('Profile')}
                                accessibilityRole="button"
                                accessibilityLabel={t('home.updateStatus', 'Mettre à jour le statut')}
                            >
                                <Text style={styles.postpartumButtonText}>Mettre à jour le statut</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* HERO CARD #1: Baby Growth 3D (NEW) */}
                {/* U-FIX-6: pass currentDay so the displayed "day of pregnancy" is exact
                    (was ~7 days too high before because it used currentWeek * 7).
                    MA7-FIX: skip baby-growth card for TTC users — they are not pregnant. */}
                {!user?.isTTC && (
                    <BabyGrowthCard
                        currentWeek={currentWeekNumber}
                        currentDay={currentDay}
                        weekData={weekData}
                    />
                )}

                {/* SECTION 1: HERO CARD PREMIUM (Phase 1) */}
                {weekData && (
                    <View style={[styles.sectionContainer, { marginTop: -50, paddingTop: 24 }]}>
                        {/* Title outside the card for cleaner look */}
                        <Text style={styles.sectionTitleMain}>🍼 {t('common.heroTitle')}</Text>

                        <LinearGradient
                            colors={[theme.colors.gradientPeachStart, theme.colors.gradientPeachEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCardGradient}
                        >
                            {/* 1. Giant Emoji Centered */}
                            <View style={styles.heroEmojiContainer}>
                                <Text style={styles.heroEmoji}>{weekData.emoji}</Text>
                            </View>

                            {/* 2. Size & Weight Mini-Cards */}
                            <View style={styles.heroStatsRow}>
                                <View style={styles.heroStatCard}>
                                    <Text style={styles.heroStatValue}>{weekData.baby_size_cm} cm</Text>
                                    <Text style={styles.heroStatLabel}>{t('common.size')}</Text>
                                </View>
                                <View style={styles.heroStatCard}>
                                    <Text style={styles.heroStatValue}>{weekData.baby_weight_g} g</Text>
                                    <Text style={styles.heroStatLabel}>{t('common.weight')}</Text>
                                </View>
                            </View>

                            {/* 3. Comparison Box */}
                            <View style={styles.heroComparisonBox}>
                                {/* Don't show "Taille d'un(e)" for adjectives like "Microscopique" */}
                                {!['microscopique', 'minuscule', 'invisible', 'microscopic'].includes(getLocalizedContent(weekData, 'baby_size_label', i18n.language)?.toLowerCase()) && (
                                    <Text style={styles.heroComparisonLabel}>{t('onboarding.step4.babySize', { label: '', emoji: '' }).split('{{')[0].trim()}</Text>
                                )}
                                <Text style={styles.heroComparisonValue}>
                                    {getLocalizedContent(weekData, 'baby_size_label', i18n.language)}
                                </Text>
                            </View>

                            {/* 4. Development Text */}
                            <Text style={styles.heroDevText}>
                                {getLocalizedContent(weekData, 'baby_dev_text', i18n.language, { stripMarkdown: true })}
                            </Text>
                        </LinearGradient>
                    </View>
                )}



                {/* GROUP 2: L'ESSENTIEL DU JOUR (Message + Tip) */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitleMain}>🌟 {t('home.dailyEssentials')}</Text>

                    {/* Baby Message */}
                    {babyMessage && (
                        <BabyMessageCard
                            message={getLocalizedContent(babyMessage, 'message', i18n.language)}
                            week={currentWeekNumber}
                            day={overrideDay || currentDay}
                        />
                    )}

                    {/* Daily Tip - Premium Design (Phase 2) */}
                    {dailyTip && babyMessage && (
                        <View style={{ height: 24 }} /> // Increased spacing
                    )}
                    {dailyTip && (
                        <LinearGradient
                            colors={[theme.colors.gradientAmberStart, theme.colors.gradientAmberEnd]} // Light Amber/Cream gradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.tipCardGradient}
                        >
                            <View style={styles.tipHeader}>
                                <Text style={styles.tipEmoji}>💡</Text>
                                <Text style={styles.tipTitle}>{t('home.dailyTip')}</Text>
                            </View>
                            <Text style={styles.tipShort}>{getLocalizedContent(dailyTip, 'short', i18n.language)}</Text>
                            <View style={styles.tipCategory}>
                                <Text style={styles.tipCategoryText}>🏷️ {dailyTip.category}</Text>
                            </View>
                        </LinearGradient>
                    )}
                </View>

                {/* GROUP 3: CETTE SEMAINE (Premium Info Cards) */}
                {weekData && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitleMain}>📅 {t('common.thisWeek')}</Text>

                        {/* Mom Body Changes - Premium Card */}
                        <View style={styles.infoCardPremium}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setShowFullBodyText(!showFullBodyText)}
                                style={styles.infoCardHeader}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.yourBody')}
                                accessibilityHint={showFullBodyText ? t('a11y.collapseSection') : t('a11y.expandSection')}
                                accessibilityState={{ expanded: showFullBodyText }}
                            >
                                <Text style={styles.infoCardEmoji}>🤰</Text>
                                <Text style={styles.infoCardTitle}>{t('common.yourBody')}</Text>
                                <Text style={{ marginStart: 'auto', fontSize: 12, color: theme.colors.accentPurple, fontWeight: '600' }}>
                                    {showFullBodyText ? t('common.seeLess') : t('common.seeMore')}
                                </Text>
                            </TouchableOpacity>
                            <Text
                                style={[styles.infoCardText, { lineHeight: 24, marginBottom: 8 }]}
                                numberOfLines={showFullBodyText ? undefined : 3}
                            >
                                {getLocalizedContent(weekData, 'mom_body_text', i18n.language, { stripMarkdown: true })}
                            </Text>
                        </View>

                        {/* Warnings / Medical Info - Redesigned List */}
                        <View style={[styles.infoCardPremium, styles.infoCardPremiumAlert, { marginTop: 16 }]}>
                            <View style={styles.infoCardHeader}>
                                <Text style={styles.infoCardEmoji}>⚠️</Text>
                                <Text style={styles.infoCardTitle}>{t('common.toMonitor')}</Text>
                            </View>

                            <View style={{ marginTop: 8 }}>
                                {(getLocalizedContent(weekData, 'warnings_text', i18n.language, { stripMarkdown: true }) || t('home.defaultWarning')).split('\n').map((line, index) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) return null;

                                    // Headers (bold)
                                    if (trimmed.startsWith('**') || trimmed.endsWith(':')) {
                                        return (
                                            <Text key={index} style={{ fontSize: 15, fontWeight: '700', color: theme.colors.error, marginTop: 12, marginBottom: 6 }}>
                                                {trimmed.replace(/\*\*/g, '')}
                                            </Text>
                                        );
                                    }

                                    // Bullet points
                                    if (trimmed.startsWith('*') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
                                        return (
                                            <View key={index} style={{ flexDirection: 'row', marginBottom: 6, paddingStart: 8 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.critical, marginTop: 8, marginEnd: 10 }} />
                                                <Text style={{ flex: 1, fontSize: 14, color: theme.colors.neutral800, lineHeight: 22 }}>
                                                    {trimmed.replace(/^[\*\•\-]\s*/, '')}
                                                </Text>
                                            </View>
                                        );
                                    }

                                    // Normal text
                                    return (
                                        <Text key={index} style={{ fontSize: 14, color: theme.colors.neutral800, lineHeight: 22, marginBottom: 4 }}>
                                            {trimmed}
                                        </Text>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}

                {/* GROUP 4: ORGANISATION (Grid Layout) */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitleMain}>📝 {t('common.organization')}</Text>

                    <View style={styles.toolsGrid}>
                        {/* Rappels Card */}
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={() => navigation.navigate('Rappels')}
                            accessibilityLabel={t('common.reminders')}
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={[theme.colors.surfaceBlueTint, theme.colors.blue100]}
                                style={styles.toolIconContainer}
                            >
                                <Text style={styles.toolEmoji}>🔔</Text>
                            </LinearGradient>
                            <Text style={styles.toolTitle}>{t('common.reminders')}</Text>
                            <Text style={styles.toolSubtitle}>{t('home.medicines')}</Text>
                        </TouchableOpacity>

                        {/* Calendrier Card */}
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={() => navigation.navigate('Calendrier')}
                            accessibilityLabel={t('home.calendar')}
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={[theme.colors.gradientGreenStart, theme.colors.gradientGreenEnd]}
                                style={styles.toolIconContainer}
                            >
                                <Text style={styles.toolEmoji}>📅</Text>
                            </LinearGradient>
                            <Text style={styles.toolTitle}>{t('home.calendar')}</Text>
                            <Text style={styles.toolSubtitle}>{t('common.appointments')}</Text>
                        </TouchableOpacity>

                        {/* Suivi du Poids Card */}
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={() => navigation.navigate('WeightTracker')}
                            accessibilityLabel={t('home.myWeight')}
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={[theme.colors.gradientRoseStart, theme.colors.gradientRoseEnd]}
                                style={styles.toolIconContainer}
                            >
                                <Text style={styles.toolEmoji}>⚖️</Text>
                            </LinearGradient>
                            <Text style={styles.toolTitle}>{t('home.myWeight')}</Text>
                            <Text style={styles.toolSubtitle}>{t('home.weeklyTracking')}</Text>
                        </TouchableOpacity>

                        {/* Aliments Interdits Card */}
                        <TouchableOpacity
                            style={styles.toolCard}
                            onPress={() => navigation.navigate('ForbiddenFoods')}
                            accessibilityLabel={t('home.foods')}
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={[theme.colors.gradientOrangeStart, theme.colors.gradientOrangeEnd]}
                                style={styles.toolIconContainer}
                            >
                                <Text style={styles.toolEmoji}>🍽️</Text>
                            </LinearGradient>
                            <Text style={styles.toolTitle}>{t('home.foods')}</Text>
                            <Text style={styles.toolSubtitle}>{t('home.toAvoid')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* GROUP 5: APPOINTMENTS (Restored) */}
                {appointments.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <SectionHeader
                            title={`📅 ${t('home.upcomingAppointments')}`}
                            actionLabel={t('common.seeAll')}
                            onAction={() => navigation.navigate('Calendrier')}
                        />
                        {appointments.slice(0, 3).map((app) => (
                            <TouchableOpacity
                                key={app.event_id}
                                style={styles.unifiedCard}
                                onPress={() => navigation.navigate('Calendrier')}
                                accessibilityRole="button"
                                accessibilityLabel={`${app.title}, ${format(new Date(app.date), 'dd MMMM, HH:mm', { locale: dateLocale })}`}
                                accessibilityHint={t('a11y.openAppointment')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.m }}>
                                    <View style={{ width: 4, height: 40, backgroundColor: theme.colors.success, borderRadius: 2, marginEnd: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{app.title}</Text>
                                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 }}>
                                            {format(new Date(app.date), 'dd MMMM', { locale: dateLocale })} • {format(new Date(app.date), 'HH:mm', { locale: dateLocale })}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}


                {/* 9. RECOMMENDATIONS (All Articles + Supplements) */}
                {
                    ([...articles, ...supplements].length > 0) && (
                        <Animated.View style={{ opacity: fadeAnim }}>
                            <SectionHeader
                                title={t('common.recommendationsTitle')}
                                actionLabel={t('common.seeAll')}
                                onAction={() => navigation.navigate('Ressources')}
                            />

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.recommendationsList}
                                contentContainerStyle={{ paddingEnd: 16 }}
                            >
                                {[...articles, ...supplements].map((item, index) => (
                                    <View key={index} style={{ marginEnd: 12 }}>
                                        {renderRecommendationCard({ item })}
                                    </View>
                                ))}
                            </ScrollView>
                        </Animated.View>
                    )
                }
            </View >
        </ScrollView >
    );
};

const styles = StyleSheet.create({
    // NEW STYLES FOR UNIFIED DESIGN
    sectionContainer: {
        backgroundColor: theme.colors.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        marginHorizontal: 16,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitleMain: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 16,
        // marginStart: 4, // Removed for better alignment with cards
    },
    unifiedCard: {
        marginBottom: 8,
    },
    unifiedContent: {
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.borderLight,
        marginVertical: 16,
    },
    warningContainer: {
        backgroundColor: theme.colors.surfaceWashPink,
        borderRadius: theme.borderRadius.m,
        padding: 12,
        marginTop: 8,
    },
    postpartumBanner: {
        backgroundColor: theme.colors.surfaceOrangeTint,
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    postpartumEmoji: {
        fontSize: 40,
        marginRight: 16,
    },
    postpartumTextContainer: {
        flex: 1,
    },
    postpartumTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.orange900,
        marginBottom: 4,
    },
    postpartumDesc: {
        fontSize: 13,
        color: theme.colors.orange900,
        opacity: 0.9,
        lineHeight: 18,
        marginBottom: 12,
    },
    postpartumButton: {
        backgroundColor: theme.colors.orange500,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    postpartumButtonText: {
        color: theme.colors.white,
        fontSize: 13,
        fontWeight: 'bold',
    },
    // EXISTING STYLES (Kept for compatibility)
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 20,
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 60, // Increased to allow for overlap
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        width: '100%',
        paddingBottom: 24,
    },
    headerTextContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    weekInfo: {
        fontSize: 14,
        color: theme.colors.whiteAlpha90,
        fontWeight: '500',
        marginTop: 4,
    },
    profileButtonContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    profileButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    profileGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.colors.whiteAlpha50,
        borderRadius: 28,
    },
    profileButtonText: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 24,
    },
    centerContent: {
        alignItems: 'center',
        width: '100%',
    },
    greeting: {
        fontSize: 18,
        color: theme.colors.white,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    weekNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    navButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    weekBadge: {
        alignItems: 'center',
        marginHorizontal: 16,
    },
    weekTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.white,
        textAlign: 'center',
    },
    trimesterBadge: {
        fontSize: 12,
        color: theme.colors.whiteAlpha80,
        fontWeight: '600',
        marginTop: 4,
        backgroundColor: theme.colors.whiteAlpha20,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    weekSubtitle: {
        fontSize: 16,
        color: theme.colors.white,
        textAlign: 'center',
        fontWeight: '600',
        marginTop: 4,
    },
    progressContainer: {
        marginTop: 16,
        width: '100%',
        alignItems: 'center',
    },
    dayNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
        justifyContent: 'space-between',
    },
    dayNavButton: {
        padding: 8,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayNavText: {
        fontSize: 28,
        color: theme.colors.white,
        fontWeight: 'bold',
    },
    progressBarWrapper: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    progressBar: {
        flexDirection: 'row',
        height: 10,
        width: '100%',
        backgroundColor: theme.colors.whiteAlpha20,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressSegment: {
        flex: 1,
        marginHorizontal: 1,
    },
    progressSegmentActive: {
        backgroundColor: theme.colors.white,
    },
    progressSegmentInactive: {
        backgroundColor: theme.colors.whiteAlpha30,
    },
    roundedLeft: {
        borderTopLeftRadius: 5,
        borderBottomLeftRadius: 5,
    },
    roundedRight: {
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5,
    },
    progressText: {
        fontSize: 13,
        color: theme.colors.whiteAlpha90,
        marginTop: 8,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: theme.colors.blackAlpha60,
        justifyContent: 'flex-end',
    },
    personalDataModal: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '85%',
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    modalProfileCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.whiteAlpha30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.colors.whiteAlpha50,
        marginBottom: 16,
    },
    modalProfileText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    modalName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginBottom: 4,
    },
    modalEmail: {
        fontSize: 14,
        color: theme.colors.whiteAlpha90,
    },
    modalContent: {
        maxHeight: 400,
    },
    dataSection: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    dataLabel: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    dataValue: {
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    highlightValue: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    modalActions: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        gap: 12,
    },
    modalActionButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        padding: 12,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surface,
    },
    modalActionIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    modalActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    logoutButton: {
        backgroundColor: theme.colors.surfaceRose,
    },
    logoutText: {
        color: theme.colors.error,
    },
    contentContainer: {
        paddingBottom: 40, // Reduced from 100 to 40
    },
    quickNavContainer: {
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        justifyContent: 'center',
    },
    quickNavButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.whiteAlpha25,
        borderRadius: theme.borderRadius.s,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: theme.colors.whiteAlpha40,
    },
    quickNavIcon: {
        fontSize: 12,
    },
    quickNavLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.white,
    },
    quickLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 12,
        gap: 8,
    },
    quickLink: {
        fontSize: 11,
        color: theme.colors.white,
        fontWeight: '600',
        opacity: 0.9,
    },
    linkDivider: {
        fontSize: 10,
        color: theme.colors.white,
        opacity: 0.5,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 16,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.m,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 6,
        shadowColor: theme.colors.black,
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    quickActionIcon: {
        fontSize: 16,
    },
    quickActionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.accent,
    },
    glassCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.xl,
        padding: 20,
        marginBottom: 16,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    quickFactsCard: {
        backgroundColor: theme.colors.surfaceBluePale,
        borderWidth: 1,
        borderColor: theme.colors.blue100,
    },
    factsSection: {
        marginTop: 4,
    },
    factItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    factIconContainer: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.l,
        backgroundColor: theme.colors.whiteAlpha80,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    factIcon: {
        fontSize: 16,
    },
    factText: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
    },
    cardDescription: {
        fontSize: 15,
        color: theme.colors.neutral850,
        lineHeight: 22,
    },
    babyCard: {
        backgroundColor: theme.colors.lavenderBlush,
        borderWidth: 1,
        borderColor: theme.colors.borderPinkPastel,
    },
    babyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    babyInfo: {
        flex: 1,
    },
    babyStats: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        marginBottom: 8,
    },
    statItem: {
        backgroundColor: theme.colors.primaryAlpha15,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.m,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textLight,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.accent,
        marginTop: 2,
    },
    babyLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    emojiContainer: {
        width: 100,
        height: 100,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    emojiLarge: {
        fontSize: 52,
    },
    emojiWeek: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontWeight: 'bold',
        marginTop: 4,
    },
    warningCard: {
        backgroundColor: theme.colors.surfaceAmberTint,
        borderWidth: 1,
        borderColor: theme.colors.amberBorder,
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.accentOrangeDeep,
        marginBottom: 12,
    },
    appointmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    appointmentDate: {
        backgroundColor: theme.colors.surfaceBlueTint,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        marginEnd: 16,
        minWidth: 64,
    },
    appointmentDay: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.info,
    },
    appointmentMonth: {
        fontSize: 11,
        color: theme.colors.info,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginTop: 2,
    },
    appointmentDetails: {
        flex: 1,
    },
    appointmentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    appointmentTime: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
    recommendationsList: {
        marginTop: 12,
        marginBottom: 16,
    },
    recommendationCard: {
        width: width * 0.45,
        minWidth: 180,
        height: 140,
        borderRadius: theme.borderRadius.l,
        overflow: 'hidden',
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    recommendationGradient: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    recHeader: {
        alignSelf: 'flex-start',
    },
    recEmoji: {
        fontSize: 32,
    },
    recTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.text,
        lineHeight: 20,
    },
    recSummary: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginTop: 6,
    },
    recBadge: {
        backgroundColor: theme.colors.whiteAlpha60,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.m,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    recBadgeText: {
        color: theme.colors.accent, // Dark Pink for better readability
        fontSize: 11,
        fontWeight: '700',
    },
    // ANTIGRAVITY: Tip Card Styles
    tipCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: theme.colors.surfaceTip,
        borderStartWidth: 4,
        borderStartColor: theme.colors.accentAmber,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tipEmoji: {
        fontSize: 24,
        marginEnd: 8,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    tipShort: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
        lineHeight: 22,
    },
    tipLong: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    tipCategory: {
        backgroundColor: theme.colors.white,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.m,
        alignSelf: 'flex-start',
    },
    tipCategoryText: {
        fontSize: 12,
        color: theme.colors.accentOrangeDeep,
        fontWeight: '600',
    },

    // ==========================================
    // PREMIUM HERO CARD STYLES (Phase 1)
    // ==========================================
    heroCardGradient: {
        borderRadius: 24,
        padding: 24,
        marginTop: 12,
        shadowColor: theme.colors.shadowHeroPink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    heroEmojiContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    heroEmoji: {
        fontSize: 64,
        marginBottom: 8,
        ...getTextShadowStyle(theme.colors.black, 0.1, 8, { width: 0, height: 4 }),
    },
    heroWeekText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    heroStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    heroStatCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        paddingVertical: 12,
        paddingHorizontal: 16,
        width: '48%',
        alignItems: 'center',
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    heroStatValue: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.coral,
        marginBottom: 4,
    },
    heroStatLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    heroComparisonBox: {
        backgroundColor: theme.colors.whiteAlpha60,
        borderRadius: theme.borderRadius.l,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.whiteAlpha80,
    },
    heroComparisonLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    heroComparisonValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
    },
    heroDevText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    tipCardGradient: {
        borderRadius: theme.borderRadius.l,
        padding: 20,
        borderStartWidth: 4,
        borderStartColor: theme.colors.accentAmberDark,
        shadowColor: theme.colors.accentAmberDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    // Premium Info Card (Cette semaine)
    infoCardPremium: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: 16,
        borderStartWidth: 4,
        borderStartColor: theme.colors.accentPurple,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 8,
    },
    /** Variante liste rouge à surveiller — bordure début logique (RTL-safe) */
    infoCardPremiumAlert: {
        borderStartColor: theme.colors.critical,
        borderWidth: 1,
        borderColor: theme.colors.surfaceRose,
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoCardEmoji: {
        fontSize: 20,
        marginEnd: 8,
    },
    infoCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    infoCardText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    // Tools Grid
    toolsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    toolCard: {
        width: '48%',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: 16,
        alignItems: 'center',
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    },
    toolIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    toolEmoji: {
        fontSize: 24,
    },
    toolTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    toolSubtitle: {
        fontSize: 12,
        color: theme.colors.neutral400,
        textAlign: 'center',
    },

    // ==========================================
    // OLD STYLES (kept for compatibility)
    // ==========================================
    babySizeContainerPro: {
        marginTop: 16,
    },
    babySizeRowPro: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    babySizeStatPro: {
        alignItems: 'center',
        flex: 1,
    },
    babySizeLabelPro: {
        fontSize: 16,
        color: theme.colors.neutral400,
        marginBottom: 8,
        fontWeight: '400',
    },
    babySizeValuePro: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.coral, // Orange vif comme screenshot
    },
    babyComparisonContainerPro: {
        backgroundColor: theme.colors.surfacePinkWash,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        marginBottom: 20,
        marginHorizontal: 4,
    },
    babyComparisonEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    babyComparisonLabelPro: {
        fontSize: 16,
        color: theme.colors.neutral400,
        marginBottom: 8,
    },
    babyComparisonValuePro: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.coral, // Orange vif
        textAlign: 'center',
    },
    babyDevTextPro: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 24,
        paddingHorizontal: 4,
    },
    // OLD STYLES (kept for compatibility)
    babySizeContainer: {
        marginTop: theme.spacing.m,
    },
    babySizeRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing.m,
    },
    babySizeStat: {
        alignItems: 'center',
        flex: 1,
    },
    babySizeLabel: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: 4,
    },
    babySizeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    babyComparisonContainer: {
        backgroundColor: theme.colors.lavenderBlush,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    babyComparisonLabel: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: 4,
    },
    babyComparisonValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    babyDevText: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22,
    },
});
