/**
 * WeightTrackerScreen
 * 
 * Track maternal weight during pregnancy with:
 * - Visual graph showing weight evolution
 * - Color zones (green=normal, orange=attention, red=outside norm)
 * - Add new weight entry
 * - History list
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { usePregnancy } from '../context/PregnancyContext';
import { theme } from '../theme';
import { styles } from './WeightTrackerScreen.styles';
import { hexToRgba } from '../utils/styleUtils';
import {
    WeightEntry,
    saveWeightEntry,
    getWeightHistory,
    deleteWeightEntry,
    getRecommendedWeightRange,
    evaluateWeightStatus,
    calculateBMICategory,
} from '../services/weightService';
import { detectTrend, getSmartSuggestions, getTrimesterMessage } from '../services/weightIntelligence';
import { createLogger } from '../utils/logger';
import { useDateLocale } from '../hooks/useDateLocale';
import { useTranslation } from 'react-i18next';
import { LineChart } from "react-native-chart-kit";
import { trackPositiveAction } from '../services/inAppReviewService';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

const log = createLogger('WeightTrackerScreen');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WeightTrackerScreen = () => {
    useScreenAnalytics('WeightTrackerScreen');
    const { t } = useTranslation(); // Initialize t
    const navigation = useNavigation();
    const { user } = useAuth();
    const { pregnancyInfo, profile, setProfile } = usePregnancy();
    const dateLocale = useDateLocale();

    const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [saving, setSaving] = useState(false);
    const [showEducation, setShowEducation] = useState(false);

    // Setup form state
    const [showSetup, setShowSetup] = useState(false);
    const [setupWeight, setSetupWeight] = useState('');
    const [setupHeight, setSetupHeight] = useState('');
    const [savingSetup, setSavingSetup] = useState(false);

    // Debug & Testing utilities
    const [tapCount, setTapCount] = useState(0);
    const [showDebugMode, setShowDebugMode] = useState(false);



    // Check if profile needs setup (no pre-pregnancy weight or height)
    const needsSetup = !profile?.prePregnancyWeight || !profile?.height;

    // User's pre-pregnancy data - NO DEFAULT VALUES for safety
    const prePregnancyWeight = profile?.prePregnancyWeight || 0;
    const height = profile?.height || 0;

    // P0.5: No silent fallback - null if unavailable
    const currentWeek = pregnancyInfo?.week ?? null;
    const hasWeekInfo = currentWeek !== null && currentWeek > 0;

    // Safety check: don't calculate if essential data is missing
    const hasValidData = prePregnancyWeight > 0 && height > 0 && hasWeekInfo;

    // Show setup form automatically if needed
    React.useEffect(() => {
        if (needsSetup && !loading) {
            setShowSetup(true);
        }
    }, [needsSetup, loading]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.uid])
    );

    const loadData = async () => {
        setLoading(true);
        let isMounted = true;
        try {
            const userId = user?.uid;
            if (!userId) {
                setLoading(false);
                return;
            }
            const history = await getWeightHistory(userId);
            if (isMounted) setWeightHistory(history);
        } catch (error) {
            log.error('Error loading weight history:', error);
        } finally {
            if (isMounted) setLoading(false);
        }
        return () => { isMounted = false; };
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleAddWeight = async () => {
        const weight = parseFloat(newWeight.replace(',', '.'));

        // P0.2: Détection douce lb/kg pour 120-200 kg (zone ambiguë) - AVANT validation
        if (!isNaN(weight) && weight >= 120 && weight <= 200) {
            Alert.alert(
                t('weight.unitCheckTitle'),
                t('weight.unitCheckMsg', { weight, converted: (weight * 0.453592).toFixed(1) }),
                [
                    {
                        text: t('weight.yesKg'),
                        onPress: () => {
                            // Continue avec validation normale
                            continueValidation(weight);
                        }
                    },
                    {
                        text: t('weight.oopsLb'),
                        onPress: () => {
                            const convertedWeight = parseFloat((weight * 0.453592).toFixed(1));
                            setNewWeight(convertedWeight.toString());
                            Alert.alert(t('weight.convertedTitle'), t('weight.convertedMsg', { original: weight, converted: convertedWeight }));
                        }
                    }
                ]
            );
            return;
        }

        continueValidation(weight);
    };

    const continueValidation = async (weight: number) => {
        // Validation basique
        if (isNaN(weight) || weight < 35 || weight > 200) {
            // Si > 200, probablement des livres (lb)
            if (weight > 200) {
                Alert.alert(
                    t('weight.verifyTitle'),
                    t('weight.highWeightMsg', { weight, converted: (weight * 0.453592).toFixed(1) }),
                    [{ text: t('weight.understood') }]
                );
            } else {
                Alert.alert(t('weight.verifyTitle'), t('weight.invalidWeight'));
            }
            return;
        }

        // Vérifier doublon même jour
        const today = new Date().toISOString().split('T')[0];
        const existingToday = weightHistory.find((e: WeightEntry) => e.date.split('T')[0] === today);
        if (existingToday) {
            Alert.alert(
                t('weight.entryExistsTitle'),
                t('weight.entryExistsMsg', { weight: existingToday.weight }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('weight.replace'),
                        onPress: async () => {
                            try {
                                const userId = user?.uid;
                                if (!userId) return;
                                await deleteWeightEntry(userId, existingToday.id!);
                                await saveAndConfirm(weight);
                            } catch (error) {
                                log.error('Error replacing entry:', error);
                            }
                        }
                    }
                ]
            );
            return;
        }

        // P0: Bloquer dates futures (Note: actuellement on accepte aujourd'hui)
        // Si besoin futur: vérifier que la date saisie n'est pas > aujourd'hui

        // P1: Vérifier perte de poids excessive (>3kg = possible complication)
        if (weightHistory.length > 0) {
            const lastEntry = weightHistory[0];
            const weightLoss = lastEntry.weight - weight;

            if (weightLoss > 3) {
                Alert.alert(
                    t('weight.lossTitle'),
                    t('weight.lossMsg', { loss: weightLoss.toFixed(1) }),
                    [
                        { text: t('weight.correctInput'), style: 'cancel' },
                        {
                            text: t('weight.saveAnyway'),
                            style: 'destructive',
                            onPress: () => saveAndConfirm(weight)
                        }
                    ]
                );
                return;
            }
        }

        // Vérifier variation importante (>2kg en 24h)
        if (weightHistory.length > 0) {
            const lastEntry = weightHistory[0];
            const variation = Math.abs(weight - lastEntry.weight);
            if (variation > 2) {
                Alert.alert(
                    t('weight.variationTitle'),
                    t('weight.variationMsg', { variation: variation.toFixed(1), last: lastEntry.weight }),
                    [
                        { text: t('weight.correct'), style: 'cancel' },
                        { text: t('weight.isCorrect'), onPress: () => saveAndConfirm(weight) }
                    ]
                );
                return;
            }
        }

        await saveAndConfirm(weight);
    };

    const saveAndConfirm = async (weight: number) => {
        setSaving(true);
        try {
            const userId = user?.uid;
            if (!userId) {
                Alert.alert(t('common.error'), t('weight.errorSave'));
                return;
            }
            await saveWeightEntry({
                user_id: userId,
                weight,
                date: new Date().toISOString(),
                week_of_pregnancy: currentWeek ?? 0,
            });
            setNewWeight('');
            setShowAddForm(false);
            await loadData();

            // Engagement: Track positive action
            trackPositiveAction('add_weight');

            Alert.alert(t('weight.savedTitle'), t('weight.savedMsg'));
        } catch (error) {
            log.error('Error saving weight:', error);
            Alert.alert(t('common.error'), t('weight.errorSave'));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSetup = async () => {
        const weight = parseFloat(setupWeight.replace(',', '.'));
        const heightNum = parseFloat(setupHeight.replace(',', '.'));

        if (isNaN(weight) || weight < 30 || weight > 200) {
            Alert.alert(t('common.error'), t('weight.invalidWeight'));
            return;
        }
        if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
            Alert.alert(t('common.error'), t('weight.invalidHeight'));
            return;
        }

        setSavingSetup(true);
        try {
            // P0.4: Create profile even if currently null
            const baseProfile = (profile || {}) as Partial<typeof profile>;

            // Update profile with pre-pregnancy data
            const updatedProfile = {
                firstName: baseProfile?.firstName || '',
                lastName: baseProfile?.lastName || '',
                country: baseProfile?.country || '',
                lmp: baseProfile?.lmp,
                dpa: baseProfile?.dpa,
                prePregnancyWeight: weight,
                height: heightNum,
            };

            // Remove undefined values (Firebase doesn't accept undefined)
            const cleanProfile = Object.fromEntries(
                Object.entries(updatedProfile).filter(([_, v]) => v !== undefined)
            );

            await setProfile(cleanProfile as any); // P0.4: Allow setting profile even if initially null
            setShowSetup(false);
            Alert.alert(t('common.configSaved'), t('common.configSavedMsg'));
        } catch (error) {
            log.error('Error saving setup:', error);
            Alert.alert(t('common.error'), t('weight.errorSave'));
        } finally {
            setSavingSetup(false);
        }
    };

    const handleDeleteEntry = (entryId: string) => {
        Alert.alert(
            t('weight.resetConfirmTitle'),
            t('weight.resetConfirmMsg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('weight.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const userId = user?.uid;
                            if (!userId) return;
                            await deleteWeightEntry(userId, entryId!);
                            await loadData();
                            Alert.alert(t('weight.resetDoneTitle'), t('weight.resetDoneMsg'));
                        } catch (error) {
                            log.error('Error resetting data:', error);
                            Alert.alert(t('common.error'), t('weight.errorReset'));
                        }
                    }
                }
            ]
        );
    };

    // Edit profile info (re-open setup)
    const handleEditProfile = () => {
        setSetupWeight(prePregnancyWeight > 0 ? prePregnancyWeight.toString() : '');
        setSetupHeight(height > 0 ? height.toString() : '');
        setShowSetup(true);
    };

    // Triple-tap to toggle debug mode (DEV-only feature)
    // MS6: Alert is debug-only, no need to i18n the lock emoji label.
    // Wrapped to log only in dev so prod build doesn't show this Alert if user triple-taps.
    const handleTitlePress = () => {
        if (!__DEV__) return;
        const newCount = tapCount + 1;
        setTapCount(newCount);
        if (newCount >= 3) {
            setShowDebugMode(!showDebugMode);
            Alert.alert(showDebugMode ? 'Debug OFF' : 'Debug ON');
            setTapCount(0);
        }
        setTimeout(() => setTapCount(0), 1500);
    };

    // Reset all weight data
    const handleResetData = async () => {
        Alert.alert(t('common.resetConfirmShort'), t('common.resetConfirmMsgShort'), [
            { text: t('common.no') },
            {
                text: t('common.yes'), onPress: async () => {
                    const userId = user?.uid;
                    if (!userId) return;
                    const history = await getWeightHistory(userId);
                    for (const e of history) await deleteWeightEntry(userId, e.id!);
                    await loadData();
                }
            }
        ]);
    };

    // Get current status (use real data only)
    const latestWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
    const weightStatus = latestWeight && hasValidData
        ? evaluateWeightStatus(latestWeight, prePregnancyWeight, height, currentWeek)
        : null;
    const recommendedRange = hasValidData
        ? getRecommendedWeightRange(prePregnancyWeight, height, currentWeek)
        : { min: 0, max: 0, targetGain: { min: 0, max: 0 } };
    const bmiCategory = hasValidData
        ? calculateBMICategory(prePregnancyWeight, height)
        : { category: 'normal' as const, minGain: 0, maxGain: 0, weeklyGainT2T3: 0 };

    // PERFECT-FIX-2: derive BMI numeric value + map OMS category → semantic theme color.
    // bmiCategory was previously computed but never surfaced in the UI; users now
    // see both their pre-pregnancy BMI and the WHO/OMS classification.
    const bmiValue = hasValidData
        ? prePregnancyWeight / Math.pow(height / 100, 2)
        : null;
    const BMI_CATEGORY_COLOR: Record<typeof bmiCategory.category, string> = {
        underweight: theme.colors.warning,
        normal: theme.colors.success,
        overweight: theme.colors.warning,
        obese: theme.colors.error,
    };

    // Intelligence: Detect trend and generate smart suggestions
    const trend = React.useMemo(() => detectTrend(weightHistory), [weightHistory]);
    const suggestions = React.useMemo(() => {
        if (!currentWeek) return [];
        const status = weightStatus?.status || 'normal';
        // Filter out 'unknown' status
        const validStatus = status === 'unknown' ? 'normal' : status as 'normal' | 'low' | 'high';
        return getSmartSuggestions(currentWeek, validStatus, trend || undefined);
    }, [currentWeek, weightStatus?.status, trend]);
    const trimesterMessage = currentWeek ? getTrimesterMessage(currentWeek) : null;

    // ── Render the IA locale intelligence block (trend + trimesterMessage + suggestions) ──
    const renderIntelligence = () => {
        if (!hasValidData || weightHistory.length < 1) return null;

        const trendSeverityColor: Record<string, string> = {
            normal: theme.colors.green500,
            attention: theme.colors.orange500,
            warning: theme.colors.critical,
        };

        return (
            <View style={styles.intelligenceCard}>
                {/* Trimester message */}
                {trimesterMessage && (
                    <View style={styles.trimesterBanner}>
                        <Text style={styles.trimesterBannerText}>
                            {t(trimesterMessage)}
                        </Text>
                    </View>
                )}

                {/* Trend badge */}
                {trend && (
                    <View style={[
                        styles.trendBadge,
                        { backgroundColor: trendSeverityColor[trend.severity] + '18', borderColor: trendSeverityColor[trend.severity] + '55' }
                    ]}>
                        <Text style={[styles.trendText, { color: trendSeverityColor[trend.severity] }]}>
                            {t(trend.messageKey, trend.messageParams)}
                        </Text>
                    </View>
                )}

                {/* Smart suggestions from weightIntelligence */}
                {suggestions.length > 0 && (
                    <View style={styles.suggestionsGrid}>
                        {suggestions.map((s, i) => (
                            <View key={i} style={styles.suggestionChip}>
                                <Text style={styles.suggestionIcon}>{s.icon}</Text>
                                <Text style={styles.suggestionText}>{t(s.textKey)}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // Visual chart with weight progression
    const renderMiniChart = () => {
        if (weightHistory.length < 1) return null;

        const sortedHistory = [...weightHistory].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Show last 6 entries to keep it readable
        const entries = sortedHistory.slice(-6);

        // If less than 2 points, chart might look weird, but library handles it.
        // We need labels (weeks) and data (weights)
        const labels = entries.map(e => `${t('weight.weekShort')}${e.week_of_pregnancy}`);
        const data = entries.map(e => e.weight);

        // Calculate min/max for chart scale to avoid flat lines
        const minWeight = Math.min(...data, prePregnancyWeight) - 2;
        const maxWeight = Math.max(...data) + 2;

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{t('weight.evolution')}</Text>

                <LineChart
                    data={{
                        labels: labels,
                        datasets: [
                            {
                                data: data,
                                color: (opacity = 1) => hexToRgba(theme.colors.pinkAccent, opacity),
                                strokeWidth: 2
                            },
                            {
                                // Baseline (pre-pregnancy) integration if desired, 
                                // or just let the user see the trend relative to start via text
                                data: [prePregnancyWeight],
                                withDots: false,
                                color: () => 'transparent' // Invisible, just to anchor scale if needed
                            }
                        ]
                    }}
                    width={SCREEN_WIDTH - 32} // padding 16*2
                    height={220}
                    yAxisSuffix={t('common.kg')}
                    yAxisInterval={1}
                    chartConfig={{
                        backgroundColor: theme.colors.white,
                        backgroundGradientFrom: theme.colors.white,
                        backgroundGradientTo: theme.colors.white,
                        decimalPlaces: 1,
                        color: (opacity = 1) => hexToRgba(theme.colors.accent, opacity),
                        labelColor: (opacity = 1) => hexToRgba(theme.colors.textSecondary, opacity),
                        style: {
                            borderRadius: 16
                        },
                        propsForDots: {
                            r: "4",
                            strokeWidth: "2",
                            stroke: theme.colors.accent
                        }
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                    fromZero={false}
                    // Force y-axis range via dataset tricks if needed
                    segments={4}
                />

                {/* Starting weight reference */}
                <View style={styles.chartStartRef}>
                    <Text style={styles.startRefText}>{t('weight.startWeightValue', { weight: prePregnancyWeight })}</Text>
                </View>
            </View>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header with triple-tap */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleTitlePress}>
                    <Text style={styles.title}>{t('weight.title')}</Text>
                    <Text style={styles.subtitle}>{t('common.weekLabel', { number: currentWeek || '?' })}</Text>
                </TouchableOpacity>

                {/* Debug controls */}
                {showDebugMode && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                            onPress={handleEditProfile}
                            style={{ padding: 8, backgroundColor: theme.colors.blue600, borderRadius: 4 }}
                        >
                            <Text style={{ color: 'white', fontSize: 12 }}>{t('weight.edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleResetData}
                            style={{ padding: 8, backgroundColor: theme.colors.critical, borderRadius: 4 }}
                        >
                            <Text style={{ color: 'white', fontSize: 12 }}>{t('weight.reset')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Setup Form - shown when weight/height not configured */}
            {showSetup && (
                <View style={styles.setupCard}>
                    <Text style={styles.setupTitle}>{t('weight.setupTitle')}</Text>
                    <Text style={styles.setupDescription}>
                        {t('weight.setupDesc')}
                    </Text>

                    <View style={styles.setupField}>
                        <Text style={styles.setupLabel}>{t('weight.setupWeight')}</Text>
                        <TextInput
                            style={styles.setupInput}
                            placeholder={t('common.weightPlaceholder')}
                            keyboardType="decimal-pad"
                            value={setupWeight}
                            onChangeText={setSetupWeight}
                        />
                    </View>

                    <View style={styles.setupField}>
                        <Text style={styles.setupLabel}>{t('weight.setupHeight')}</Text>
                        <TextInput
                            style={styles.setupInput}
                            placeholder={t('common.heightPlaceholder')}
                            keyboardType="decimal-pad"
                            value={setupHeight}
                            onChangeText={setSetupHeight}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.setupButton, savingSetup && styles.saveButtonDisabled]}
                        onPress={handleSaveSetup}
                        disabled={savingSetup}
                        accessibilityRole="button"
                        accessibilityLabel={t('weight.save')}
                        accessibilityState={{ disabled: savingSetup, busy: savingSetup }}
                    >
                        <Text style={styles.setupButtonText}>
                            {savingSetup ? t('common.saving') : `✓ ${t('weight.save')}`}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.setupNote}>
                        {t('weight.confidential')}
                    </Text>
                </View>
            )}


            {/* Only show content if setup is complete */}
            {!needsSetup && (
                <>

                    {/* SIMPLIFIED: Huge Weight Display */}
                    <View style={styles.weightDisplay}>
                        {latestWeight && hasValidData ? (
                            <>
                                <Text style={styles.hugeWeight}>{latestWeight} {t('weight.hugeWeight')}</Text>
                                <View style={styles.weightMeta}>
                                    <Text style={styles.weightGainText}>
                                        {weightStatus!.gain >= 0 ? '+' : ''}{weightStatus!.gain.toFixed(1)} {t('weight.hugeWeight')} {t('weight.sinceStart')}
                                    </Text>
                                    {weightStatus?.status !== 'normal' && (
                                        <Text style={styles.miniStatus}>
                                            {weightStatus?.status === 'low' && t('weight.below')}
                                            {weightStatus?.status === 'high' && t('weight.above')}
                                        </Text>
                                    )}
                                </View>

                                {/* Visual Gauge */}
                                <View style={styles.gaugeContainer}>
                                    <Text style={styles.gaugeLabel}>{t('weight.indicativeZone')}</Text>
                                    <View style={styles.gaugeBar}>
                                        <View style={styles.gaugeRange} />
                                        <View
                                            style={[
                                                styles.gaugeDot,
                                                {
                                                    left: `${Math.min(Math.max(
                                                        ((latestWeight - recommendedRange.min) / (recommendedRange.max - recommendedRange.min)) * 100,
                                                        0
                                                    ), 100)}%`
                                                }
                                            ]}
                                        />
                                    </View>
                                    <View style={styles.gaugeLabels}>
                                        <Text style={styles.gaugeLabelText}>{recommendedRange.min.toFixed(0)}{t('common.kg')}</Text>
                                        <Text style={styles.gaugeIcon}>👍</Text>
                                        <Text style={styles.gaugeLabelText}>{recommendedRange.max.toFixed(0)}{t('common.kg')}</Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.noDataText}>{t('weight.noData')}</Text>
                        )}
                    </View>

                    {/* Recommended Range Info - SIMPLIFIED */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <Text style={styles.infoTitle}>{t('weight.targetWeekNumber', { week: currentWeek })}</Text>
                            <TouchableOpacity
                                style={styles.infoButton}
                                onPress={() => Alert.alert(
                                    t('weight.howItWorks'),
                                    t('weight.howItWorksDesc'),
                                    [{ text: t('weight.understood') }]
                                )}
                                accessibilityRole="button"
                                accessibilityLabel={t('weight.howItWorks')}
                            >
                                <Text style={styles.infoIcon}>ℹ️</Text>
                            </TouchableOpacity>
                        </View>
                        {/* PERFECT-FIX-2: surface pre-pregnancy BMI + OMS/WHO category badge */}
                        {bmiValue !== null && (
                            <View style={styles.bmiRow}>
                                <Text style={styles.bmiLabel}>
                                    {t('weight.bmi')}: <Text style={styles.bmiValue}>{bmiValue.toFixed(1)}</Text>
                                </Text>
                                <View
                                    style={[
                                        styles.bmiCategoryBadge,
                                        {
                                            backgroundColor: BMI_CATEGORY_COLOR[bmiCategory.category] + '22',
                                            borderColor: BMI_CATEGORY_COLOR[bmiCategory.category],
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.bmiCategoryText,
                                            { color: BMI_CATEGORY_COLOR[bmiCategory.category] },
                                        ]}
                                    >
                                        {t(`weight.bmiCategory.${bmiCategory.category}`)}
                                    </Text>
                                </View>
                            </View>
                        )}
                        <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.info, marginTop: 8 }}>
                            {recommendedRange.min.toFixed(1)} - {recommendedRange.max.toFixed(1)} {t('common.kg')}
                        </Text>
                        <Text style={styles.infoDetail}>
                            {t('weight.about')} +{recommendedRange.targetGain.min.toFixed(1)} - +{recommendedRange.targetGain.max.toFixed(1)} {t('common.kg')} {t('weight.sinceStart')}
                        </Text>
                    </View>

                    {/* Mini Chart */}
                    {renderMiniChart()}

                    {/* Add Weight Button / Form */}
                    {showAddForm ? (
                        <View style={styles.addForm}>
                            <Text style={styles.addFormTitle}>{t('weight.addWeightTitle')}</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.weightInput}
                                    placeholder={t('common.decimalWeightPlaceholder')}
                                    keyboardType="decimal-pad"
                                    value={newWeight}
                                    onChangeText={setNewWeight}
                                    autoFocus
                                />
                                <Text style={styles.kgLabel}>{t('common.kg')}</Text>
                            </View>
                            <View style={styles.formButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => { setShowAddForm(false); setNewWeight(''); }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('a11y.cancel')}
                                >
                                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                    onPress={handleAddWeight}
                                    disabled={saving}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('a11y.save')}
                                    accessibilityState={{ disabled: saving, busy: saving }}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {saving ? t('common.saving') : t('weight.save')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowAddForm(true)}
                            accessibilityRole="button"
                            accessibilityLabel={t('a11y.addWeight')}
                        >
                            <Text style={styles.addButtonText}>{t('weight.addDailyWeight')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* History */}
                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>{t('weight.history')}</Text>
                        {weightHistory.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 32 }}>
                                <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.neutral900, marginBottom: 8 }}>{t('weight.startTracking')}</Text>
                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' }}>{t('weight.startTrackingDesc')}</Text>
                            </View>
                        ) : (
                            weightHistory.slice(0, 10).map((entry: WeightEntry) => {
                                const entryStatus = evaluateWeightStatus(entry.weight, prePregnancyWeight, height, entry.week_of_pregnancy);
                                return (
                                    <View key={entry.id} style={styles.historyItem}>
                                        <View style={styles.historyLeft}>
                                            <Text style={styles.historyWeight}>{entry.weight} {t('common.kg')}</Text>
                                            <Text style={styles.historyDate}>
                                                {format(new Date(entry.date), 'dd MMM yyyy', { locale: dateLocale })} • {t('common.weekLabel', { number: entry.week_of_pregnancy })}
                                            </Text>
                                        </View>
                                        <View style={styles.historyRight}>
                                            <View style={[
                                                styles.historyBadge,
                                                entryStatus.status === 'normal' && styles.badgeNormal,
                                                entryStatus.status !== 'normal' && styles.badgeWarning,
                                            ]}>
                                                <Text style={styles.historyBadgeText}>
                                                    {entryStatus.status === 'normal' ? '✓' : '≈'}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleDeleteEntry(entry.id!)}
                                                accessibilityRole="button"
                                                accessibilityLabel={t('a11y.deleteWeight')}
                                                accessibilityHint={`${entry.weight} ${t('common.kg')}, ${format(new Date(entry.date), 'dd MMM yyyy', { locale: dateLocale })}`}
                                            >
                                                <Text style={styles.deleteButtonText}>🗑️</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* ── IA Locale: Trimester message + trend + suggestions ── */}
                    {renderIntelligence()}

                    {/* Educational Section - SIMPLIFIED */}
                    <TouchableOpacity
                        style={styles.educationHeader}
                        onPress={() => setShowEducation(!showEducation)}
                        accessibilityRole="button"
                        accessibilityLabel={t('weight.whyTrack')}
                        accessibilityHint={showEducation ? t('a11y.collapseSection') : t('a11y.expandSection')}
                        accessibilityState={{ expanded: showEducation }}
                    >
                        <Text style={styles.educationHeaderText}>{t('weight.whyTrack')}</Text>
                        <Text style={styles.educationToggle}>{showEducation ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {showEducation && (
                        <View style={styles.educationContent}>
                            {/* Simple explanation */}
                            <View style={styles.eduCard}>
                                <Text style={styles.eduCardText}>
                                    {t('weight.bodyChanges')}
                                </Text>
                                <View style={styles.eduTips}>
                                    <Text style={styles.eduTip}>{t('weight.babyGrowing')}</Text>
                                    <Text style={styles.eduTip}>{t('weight.moreBlood')}</Text>
                                    <Text style={styles.eduTip}>{t('weight.energyReserves')}</Text>
                                </View>
                            </View>

                            {/* What to do */}
                            <View style={[styles.eduCard, styles.eduCardImportant]}>
                                <Text style={styles.eduCardTitle}>{t('weight.goal')}</Text>
                                <Text style={styles.eduCardText}>
                                    {t('weight.goalDesc')}
                                </Text>
                                <View style={styles.eduTips}>
                                    <Text style={styles.eduTip}>{t('weight.weighWeekly')}</Text>
                                    <Text style={styles.eduTip}>{t('weight.shareDoctor')}</Text>
                                    <Text style={styles.eduTip}>{t('weight.noDiet')}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Medical Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerText}>
                            {t('weight.consultDoctor')}
                        </Text>
                    </View>
                </>
            )}
        </ScrollView>
    );
};

