import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { getHistoricalData } from '../../services/dailyChecklistService';
import { getReminderCompletions, calculateStreak, getAllReminders } from '../../services/remindersV2Service';
import { createLogger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useDateLocale } from '../../hooks/useDateLocale';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { useScreenAnalytics } from '../../hooks/useScreenAnalytics';

const log = createLogger('StatisticsScreen');
const screenWidth = Dimensions.get('window').width;

export const StatisticsScreen = () => {
    useScreenAnalytics('StatisticsScreen');
    const navigation = useNavigation();
    const { t } = useTranslation(['common', 'profile', 'reminders']);
    const dateLocale = useDateLocale();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
    const [data, setData] = useState<{
        dates: string[];
        completionRates: number[];
        hydration: number[];
        vitamins: number[];
    } | null>(null);
    // STATS-FIX: Streak and reminder stats from remindersV2
    const [overallStreak, setOverallStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [reminderBadges, setReminderBadges] = useState<Array<{
        id: string;
        emoji: string;
        title: string;
        streak: number;
        unlocked: boolean;
    }>>([]);


    useEffect(() => {
        loadStats();
    }, [timeRange]);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const days = timeRange === 'week' ? 7 : 30;
            // Checklist historical data (completion rates, hydration, vitamins)
            const stats = await getHistoricalData(days);
            setData(stats);

            // STATS-FIX: Load real streaks from remindersV2
            const userId = user?.isGuest ? undefined : user?.uid;
            const allReminders = getAllReminders();

            // Compute streak for each reminder & find global best
            const KEY_REMINDERS = ['rem_hyd_water', 'rem_vit_prenatal', 'rem_mov_walk', 'rem_sleep_quality'];
            const EMOJIS: Record<string, string> = {
                'rem_hyd_water': '💧',
                'rem_vit_prenatal': '💊',
                'rem_mov_walk': '🚶‍♀️',
                'rem_sleep_quality': '😴',
            };

            let globalMax = 0;
            const badges = await Promise.all(
                KEY_REMINDERS.map(async (id) => {
                    const reminder = allReminders.find(r => r.id === id);
                    const dates = await getReminderCompletions(id, userId);
                    const streak = calculateStreak(dates);
                    if (streak > globalMax) globalMax = streak;
                    return {
                        id,
                        emoji: EMOJIS[id] || '⭐',
                        title: reminder
                            ? (typeof reminder.title === 'string'
                                ? reminder.title
                                : (reminder.title as any)?.fr || id)
                            : id,
                        streak,
                        unlocked: streak >= 3,
                    };
                })
            );

            // Overall streak = max streak across all key reminders
            setOverallStreak(globalMax);
            setBestStreak(prev => Math.max(prev, globalMax));
            setReminderBadges(badges);
        } catch (error) {
            log.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, user?.uid]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('common.loadingStats')}</Text>
            </View>
        );
    }

    if (!data || data.dates.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>{t('common.noDataYet')}</Text>
                <Text style={styles.emptyText}>
                    {t('common.useAppForStats')}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← {t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('common.myStats')}</Text>
            </View>
            {/* Streak Hero Card */}
            <View style={styles.streakContainer}>
                <LinearGradient
                    colors={overallStreak >= 7 ? ['#FF6F00', '#FF8F00'] : overallStreak >= 3 ? ['#C2185B', '#E91E63'] : ['#7B1FA2', '#9C27B0']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.streakCard}
                >
                    <View style={styles.streakContent}>
                        <Text style={styles.streakEmoji}>
                            {overallStreak >= 14 ? '🔥' : overallStreak >= 7 ? '⚡' : overallStreak >= 3 ? '✨' : '💪'}
                        </Text>
                        <View>
                        <Text style={styles.streakCount}>{overallStreak} {t('common.gamification.days')}</Text>
                            <Text style={styles.streakLabel}>{t('common.gamification.currentStreak')}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Reminder Badges */}
            {reminderBadges.length > 0 && (
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{t('common.gamification.reminderStreaks', 'Streaks par rappel')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {reminderBadges.map(badge => (
                            <View key={badge.id} style={[styles.badgeItem, !badge.unlocked && styles.badgeLocked]}>
                                <View style={[styles.badgeIconContainer, !badge.unlocked && styles.badgeIconLocked]}>
                                    <Text style={styles.badgeIcon}>{badge.emoji}</Text>
                                </View>
                                <Text style={styles.badgeTitle} numberOfLines={2}>{badge.title}</Text>
                                <Text style={[styles.badgeStatus, { color: badge.unlocked ? theme.colors.success : theme.colors.textLight }]}>
                                    {badge.streak}j{badge.unlocked ? ' 🏆' : ''}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.rangeSelector}>
                <TouchableOpacity
                    style={[styles.rangeButton, timeRange === 'week' && styles.rangeButtonActive]}
                    onPress={() => setTimeRange('week')}
                >
                    <Text style={[styles.rangeText, timeRange === 'week' && styles.rangeTextActive]}>{t('common.sevenDays')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.rangeButton, timeRange === 'month' && styles.rangeButtonActive]}
                    onPress={() => setTimeRange('month')}
                >
                    <Text style={[styles.rangeText, timeRange === 'month' && styles.rangeTextActive]}>{t('common.thirtyDays')}</Text>
                </TouchableOpacity>
            </View>

            {/* Global Progress Chart */}
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{t('common.globalSuccess')}</Text>
                <LineChart
                    data={{
                        labels: data.dates.map(d => format(parseISO(d), 'dd/MM', { locale: dateLocale })),
                        datasets: [{ data: data.completionRates }]
                    }}
                    width={screenWidth - 48}
                    height={220}
                    yAxisSuffix="%"
                    chartConfig={{
                        backgroundColor: theme.colors.white,
                        backgroundGradientFrom: theme.colors.white,
                        backgroundGradientTo: theme.colors.white,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(194, 24, 91, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForDots: { r: "6", strokeWidth: "2", stroke: "#C2185B" }
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>



            {/* Hydration Chart */}
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{t('common.hydrationLiters')}</Text>
                <BarChart
                    data={{
                        labels: data.dates.map(d => format(parseISO(d), 'dd/MM', { locale: dateLocale })),
                        datasets: [{ data: data.hydration }]
                    }}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix="L"
                    chartConfig={{
                        backgroundColor: theme.colors.white,
                        backgroundGradientFrom: theme.colors.white,
                        backgroundGradientTo: theme.colors.white,
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        barPercentage: 0.5,
                    }}
                    style={styles.chart}
                />
            </View>

            {/* Vitamins Consistency */}
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{t('common.vitaminIntake')}</Text>
                <View style={styles.vitaminGrid}>
                    {data.dates.map((date, index) => (
                        <View key={index} style={styles.vitaminDay}>
                            <Text style={styles.vitaminDate}>{format(parseISO(date), 'dd/MM', { locale: dateLocale })}</Text>
                            <View style={[
                                styles.vitaminCircle,
                                data.vitamins[index] ? styles.vitaminTaken : styles.vitaminMissed
                            ]}>
                                <Text style={styles.vitaminIcon}>
                                    {data.vitamins[index] ? '✓' : '✗'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: theme.colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.disabled,
    },
    backButton: {
        marginEnd: 16,
    },
    backButtonText: {
        fontSize: 16,
        color: theme.colors.primary,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    // New Gamification Styles
    streakContainer: {
        padding: 16,
    },
    streakCard: {
        borderRadius: 16,
        padding: 16,
        elevation: 4,
        shadowColor: '#F57C00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    streakContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakEmoji: {
        fontSize: 40,
        marginEnd: 16,
    },
    streakCount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    streakLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
    },
    badgesContainer: {
        paddingVertical: 8,
    },
    badgeItem: {
        alignItems: 'center',
        marginEnd: 16,
        width: 80,
    },
    badgeLocked: {
        opacity: 0.5,
    },
    badgeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: theme.colors.warning,
    },
    badgeIconLocked: {
        backgroundColor: '#EEEEEE',
        borderColor: '#BDBDBD',
    },
    badgeIcon: {
        fontSize: 24,
    },
    badgeTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeStatus: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    // Existing Styles
    rangeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 16,
        backgroundColor: theme.colors.white,
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
    },
    rangeButton: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    rangeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    rangeText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    rangeTextActive: {
        color: theme.colors.white,
    },
    chartCard: {
        backgroundColor: theme.colors.white,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.textSecondary,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    vitaminGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    vitaminDay: {
        alignItems: 'center',
        width: '13%',
    },
    vitaminDate: {
        fontSize: 10,
        color: theme.colors.textLight,
        marginBottom: 4,
    },
    vitaminCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vitaminTaken: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    vitaminMissed: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#EF5350',
    },
    vitaminIcon: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
});
