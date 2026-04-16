import { createLogger } from '../utils/logger';
const log = createLogger('HealthDashboardScreen');
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { usePregnancy } from '../context/PregnancyContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import {
    getHealthStats,
    getWeightHistory,
    getBloodPressureHistory,
    saveWeightEntry,
    saveBloodPressureEntry,
    saveGlucoseEntry,
    getGlucoseHistory,
    saveDailySymptoms,
    getDailySymptoms,
    type GlucoseEntry,
    type SymptomKey,
} from '../services/healthService';
import { HealthStats, HealthMetric } from '../types';
import { theme } from '../theme';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

const screenWidth = Dimensions.get('window').width;

export const HealthDashboardScreen = () => {
    useScreenAnalytics('HealthDashboardScreen');
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { pregnancyInfo } = usePregnancy();
    const navigation = useNavigation();

    const [stats, setStats] = useState<HealthStats | null>(null);
    const [weightHistory, setWeightHistory] = useState<HealthMetric[]>([]);
    const [bpHistory, setBpHistory] = useState<HealthMetric[]>([]);
    const [glucoseHistory, setGlucoseHistory] = useState<GlucoseEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [showBPModal, setShowBPModal] = useState(false);
    const [showGlucoseModal, setShowGlucoseModal] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [newBPSystolic, setNewBPSystolic] = useState('');
    const [newBPDiastolic, setNewBPDiastolic] = useState('');
    const [newGlucose, setNewGlucose] = useState('');
    const [symptoms, setSymptoms] = useState<string[]>([]);

    // Common symptoms chips for quick-add
    const SYMPTOM_CHIPS = [
        { key: 'nausea', label: t('dashboard.symptomNausea'), emoji: '🤢' },
        { key: 'fatigue', label: t('dashboard.symptomFatigue'), emoji: '😴' },
        { key: 'backPain', label: t('dashboard.symptomBackPain'), emoji: '🧘' },
        { key: 'headache', label: t('dashboard.symptomHeadache'), emoji: '🤕' },
        { key: 'swelling', label: t('dashboard.symptomSwelling'), emoji: '👣' },
        { key: 'insomnia', label: t('dashboard.symptomInsomnia'), emoji: '🌙' },
    ];

    // GUARD: Guest users cannot use Firestore health tracking
    const isGuest = (user as any)?.isGuest === true;

    useEffect(() => {
        if (isGuest) {
            setLoading(false);
            return;
        }
        let isMounted = true;
        const safeLoadData = async () => {
            if (!user?.uid || !pregnancyInfo?.week || isGuest) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const [healthStats, weights, bps, glucoses, todaySymptoms] = await Promise.all([
                    getHealthStats(user.uid, pregnancyInfo.week),
                    getWeightHistory(user.uid),
                    getBloodPressureHistory(user.uid),
                    getGlucoseHistory(user.uid),
                    getDailySymptoms(user.uid), // ── now parallel (was sequential)
                ]);
                if (!isMounted) return;
                setStats(healthStats);
                setWeightHistory(weights);
                setBpHistory(bps);
                setGlucoseHistory(glucoses);
                if (todaySymptoms?.symptoms) {
                    setSymptoms(todaySymptoms.symptoms as string[]);
                }
            } catch (err) {
                if (!isMounted) return;
                log.error('[HealthDashboard] Error loading data:', err);
                setError(t('dashboard.errorLoading'));
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        safeLoadData();
        return () => { isMounted = false; };
    }, [user?.uid, pregnancyInfo?.week, isGuest]);

    const loadData = async () => {
        if (!user?.uid || !pregnancyInfo?.week || isGuest) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [healthStats, weights, bps, glucoses] = await Promise.all([
                getHealthStats(user.uid, pregnancyInfo.week),
                getWeightHistory(user.uid),
                getBloodPressureHistory(user.uid),
                getGlucoseHistory(user.uid),
            ]);
            setStats(healthStats);
            setWeightHistory(weights);
            setBpHistory(bps);
            setGlucoseHistory(glucoses);
        } catch (err) {
            log.error('[HealthDashboard] Error loading data:', err);
            setError(t('dashboard.errorLoading'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddWeight = async () => {
        if (!user?.uid || !pregnancyInfo?.week || !newWeight) return;
        try {
            await saveWeightEntry(user.uid, parseFloat(newWeight), new Date(), pregnancyInfo.week);
            setNewWeight('');
            setShowWeightModal(false);
            loadData();
        } catch (err) {
            log.error('[HealthDashboard] Error saving weight:', err);
            Alert.alert(t('common.error'), t('dashboard.errorSaving'));
        }
    };

    const handleAddBP = async () => {
        if (!user?.uid || !pregnancyInfo?.week || !newBPSystolic || !newBPDiastolic) return;
        try {
            await saveBloodPressureEntry(
                user.uid,
                parseInt(newBPSystolic),
                parseInt(newBPDiastolic),
                new Date(),
                pregnancyInfo.week
            );
            setNewBPSystolic('');
            setNewBPDiastolic('');
            setShowBPModal(false);
            loadData();
        } catch (err) {
            log.error('[HealthDashboard] Error saving BP:', err);
            Alert.alert(t('common.error'), t('dashboard.errorSaving'));
        }
    };

    /**
     * Save glucose entry to Firestore and refresh history
     */
    const handleAddGlucose = async () => {
        if (!user?.uid || !pregnancyInfo?.week || !newGlucose) return;
        const value = parseFloat(newGlucose.replace(',', '.'));
        if (isNaN(value) || value <= 0 || value > 30) {
            Alert.alert(t('common.error'), t('dashboard.glucoseTarget'));
            return;
        }
        try {
            await saveGlucoseEntry(user.uid, {
                value,
                meal_context: 'fasting',
                date: new Date().toISOString(),
                week: pregnancyInfo.week,
            });
            setNewGlucose('');
            setShowGlucoseModal(false); // ── fixed: was double toggle (true+false)
            loadData();
        } catch (err) {
            log.error('[HealthDashboard] Error saving glucose:', err);
            Alert.alert(t('common.error'), t('dashboard.errorSaving'));
        }
    };

    /**
     * Toggle a symptom chip and auto-save to Firestore
     */
    const handleToggleSymptom = async (key: string) => {
        if (!user?.uid || !pregnancyInfo?.week) return;
        const updated = symptoms.includes(key)
            ? symptoms.filter(s => s !== key)
            : [...symptoms, key];
        setSymptoms(updated);
        try {
            await saveDailySymptoms(user.uid, pregnancyInfo.week, updated as SymptomKey[]);
        } catch (err) {
            log.error('[HealthDashboard] Error saving symptoms:', err);
        }
    };

    // GUEST GUARD: Show upgrade prompt
    if (isGuest) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
                <Text style={styles.loadingText}>{t('dashboard.guestNotice')}</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
                <Text style={styles.loadingText}>{error}</Text>
                <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }} onPress={loadData}>
                    <Text style={{ color: theme.colors.white, fontWeight: '600' }}>{t('common.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const weightData = weightHistory.map(w => w.value as number);
    const weightLabels = weightHistory.map(w => `${t('weight.weekShort')}${w.week}`);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={styles.header}>
                <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('dashboard.week')} {pregnancyInfo?.week || '—'}</Text>
            </LinearGradient>

            {/* Section 1: Poids */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('dashboard.weightTracking')}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setShowWeightModal(true)}>
                        <Text style={styles.addButtonText}>{t('dashboard.add')}</Text>
                    </TouchableOpacity>
                </View>

                {weightHistory.length > 0 ? (
                    <>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{t('dashboard.current')}</Text>
                                <Text style={styles.statValue}>{stats?.weightCurrent || '—'} kg</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{t('dashboard.gain')}</Text>
                                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                                    +{stats?.weightGain?.toFixed(1) || '0'} kg
                                </Text>
                            </View>
                        </View>

                        {weightData.length >= 2 && (
                            <LineChart
                                data={{
                                    labels: weightLabels.slice(-6), // Last 6 weeks
                                    datasets: [{ data: weightData.slice(-6) }],
                                }}
                                width={screenWidth - 48}
                                height={180}
                                chartConfig={{
                                    backgroundColor: theme.colors.white,
                                    backgroundGradientFrom: theme.colors.white,
                                    backgroundGradientTo: theme.colors.white,
                                    decimalPlaces: 1,
                                    color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                    style: { borderRadius: theme.borderRadius.l },
                                    propsForDots: {
                                        r: '4',
                                        strokeWidth: '2',
                                        stroke: theme.colors.primary,
                                    },
                                }}
                                bezier
                                style={styles.chart}
                            />
                        )}
                    </>
                ) : (
                    <Text style={styles.emptyText}>{t('dashboard.noDataWeight')}</Text>
                )}
            </View>

            {/* Section 2: Tension */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('dashboard.bloodPressure')}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setShowBPModal(true)}>
                        <Text style={styles.addButtonText}>{t('dashboard.add')}</Text>
                    </TouchableOpacity>
                </View>

                {bpHistory.length > 0 ? (
                    <>
                        <View style={styles.bpCard}>
                            <Text style={styles.bpLabel}>{t('dashboard.lastMeasurement')}</Text>
                            <Text style={styles.bpValue}>
                                {stats?.lastBP?.systolic || '—'} / {stats?.lastBP?.diastolic || '—'}
                            </Text>
                            <Text style={styles.bpDate}>
                                {stats?.lastBP?.date
                                    ? new Date(stats.lastBP.date).toLocaleDateString(i18n.language)
                                    : ''}
                            </Text>
                        </View>

                        {bpHistory.slice(0, 3).map((bp, index) => {
                            const value = bp.value as { systolic: number; diastolic: number };
                            return (
                                <View key={bp.metric_id} style={styles.bpHistoryItem}>
                                    <Text style={styles.bpHistoryValue}>
                                        {value.systolic} / {value.diastolic}
                                    </Text>
                                    <Text style={styles.bpHistoryDate}>
                                        {new Date(bp.date).toLocaleDateString(i18n.language)} • S{bp.week}
                                    </Text>
                                </View>
                            );
                        })}
                    </>
                ) : (
                    <Text style={styles.emptyText}>{t('dashboard.noDataBP')}</Text>
                )}
            </View>

            {/* Section 3: Glycémie */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🩸 {t('dashboard.glucose')}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setShowGlucoseModal(true)}>
                        <Text style={styles.addButtonText}>{t('dashboard.add')}</Text>
                    </TouchableOpacity>
                </View>
                {glucoseHistory.length > 0 ? (
                    <>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{t('dashboard.glucose')}</Text>
                                <Text style={[styles.statValue, { color: '#F57C00' }]}>
                                    {glucoseHistory[0].value} mmol/L
                                </Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{t('dashboard.glucoseNormal')}</Text>
                                <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', maxWidth: 120 }}>
                                    {t('dashboard.glucoseTarget')}
                                </Text>
                            </View>
                        </View>
                        {glucoseHistory.slice(1, 3).map((g, i) => (
                            <View key={i} style={styles.bpHistoryItem}>
                                <Text style={styles.bpHistoryValue}>{g.value} mmol/L</Text>
                                <Text style={styles.bpHistoryDate}>
                                    {new Date(g.date).toLocaleDateString(i18n.language)}
                                </Text>
                            </View>
                        ))}
                    </>
                ) : (
                    <>
                        <Text style={styles.emptyText}>{t('dashboard.glucoseNormal')}</Text>
                        <Text style={[styles.emptyText, { color: '#999', fontSize: 12, marginTop: 4 }]}>
                            {t('dashboard.glucoseTarget')}
                        </Text>
                    </>
                )}
            </View>

            {/* Section 4: Symptômes du jour */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🗒️ {t('dashboard.symptomsToday')}</Text>
                <View style={styles.symptomsGrid}>
                    {SYMPTOM_CHIPS.map(chip => (
                        <TouchableOpacity
                            key={chip.key}
                            style={[
                                styles.symptomChip,
                                symptoms.includes(chip.key) && styles.symptomChipActive,
                            ]}
                            onPress={() => handleToggleSymptom(chip.key)}
                        >
                            <Text style={styles.symptomEmoji}>{chip.emoji}</Text>
                            <Text style={[
                                styles.symptomLabel,
                                symptoms.includes(chip.key) && styles.symptomLabelActive,
                            ]}>{chip.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {symptoms.length === 0 && (
                    <Text style={styles.emptyText}>{t('dashboard.noSymptomsToday')}</Text>
                )}
            </View>

            {/* Section 5: Rendez-vous */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('dashboard.appointments')}</Text>
                    <TouchableOpacity onPress={() => Alert.alert(t('dashboard.soonAvailable'), t('dashboard.soonAvailableDesc'))}>
                        <Text style={styles.linkText}>{t('dashboard.seeAll')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.appointmentsRow}>
                    <View style={[styles.appointmentBox, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={styles.appointmentNumber}>{stats?.upcomingAppointments || 0}</Text>
                        <Text style={styles.appointmentLabel}>{t('dashboard.upcoming')}</Text>
                    </View>
                    <View style={[styles.appointmentBox, { backgroundColor: '#F3E5F5' }]}>
                        <Text style={styles.appointmentNumber}>{stats?.pastAppointments || 0}</Text>
                        <Text style={styles.appointmentLabel}>{t('dashboard.past')}</Text>
                    </View>
                </View>
            </View>

            {/* Section 4: Rappels */}
            <View style={[styles.section, { marginBottom: 40 }]}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('dashboard.remindersThisWeek')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Rappels')}>
                        <Text style={styles.linkText}>{t('dashboard.seeAll')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        {stats?.remindersCompletedThisWeek || 0} / {stats?.remindersTotalThisWeek || 0} {t('dashboard.completed')}
                    </Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${((stats?.remindersCompletedThisWeek || 0) /
                                        (stats?.remindersTotalThisWeek || 1)) *
                                        100}%`,
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressPercentage}>
                        {Math.round(
                            ((stats?.remindersCompletedThisWeek || 0) / (stats?.remindersTotalThisWeek || 1)) * 100
                        )}
                        %
                    </Text>
                </View>
            </View>

            {/* Modal: Add Weight */}
            <Modal visible={showWeightModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>{t('dashboard.addWeight')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('dashboard.weightPlaceholder')}
                            keyboardType="decimal-pad"
                            value={newWeight}
                            onChangeText={setNewWeight}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    setShowWeightModal(false);
                                    setNewWeight('');
                                }}
                            >
                                <Text style={styles.modalButtonText}>{t('dashboard.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={handleAddWeight}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.colors.white }]}>{t('dashboard.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal: Add Blood Pressure */}
            <Modal visible={showBPModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>{t('dashboard.addBP')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('dashboard.systolic')}
                            keyboardType="number-pad"
                            value={newBPSystolic}
                            onChangeText={setNewBPSystolic}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={t('dashboard.diastolic')}
                            keyboardType="number-pad"
                            value={newBPDiastolic}
                            onChangeText={setNewBPDiastolic}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    setShowBPModal(false);
                                    setNewBPSystolic('');
                                    setNewBPDiastolic('');
                                }}
                            >
                                <Text style={styles.modalButtonText}>{t('dashboard.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={handleAddBP}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.colors.white }]}>{t('dashboard.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Modal: Add Glucose */}
            <Modal visible={showGlucoseModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>🩸 {t('dashboard.glucose')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('dashboard.glucoseTarget', { defaultValue: '3.5 – 7.8 mmol/L' })}
                            keyboardType="decimal-pad"
                            value={newGlucose}
                            onChangeText={setNewGlucose}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => { setShowGlucoseModal(false); setNewGlucose(''); }}
                            >
                                <Text style={styles.modalButtonText}>{t('dashboard.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSave]}
                                onPress={handleAddGlucose}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.colors.white }]}>{t('dashboard.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    header: {
        padding: 24,
        paddingTop: 40,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    section: {
        backgroundColor: theme.colors.white,
        margin: 16,
        padding: 20,
        borderRadius: theme.borderRadius.l,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.m,
    },
    addButtonText: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    linkText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    chart: {
        marginVertical: 8,
        borderRadius: theme.borderRadius.l,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        fontStyle: 'italic',
        paddingVertical: 20,
    },
    bpCard: {
        backgroundColor: '#F3E5F5',
        padding: 16,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        marginBottom: 16,
    },
    bpLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    bpValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#9C27B0',
    },
    bpDate: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    bpHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    bpHistoryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    bpHistoryDate: {
        fontSize: 14,
        color: '#999',
    },
    appointmentsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    appointmentBox: {
        flex: 1,
        padding: 20,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
    },
    appointmentNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    appointmentLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    progressContainer: {
        alignItems: 'center',
    },
    progressText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 12,
        backgroundColor: theme.colors.disabled,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.success,
    },
    progressPercentage: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '85%',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.xl,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.disabled,
        borderRadius: theme.borderRadius.m,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: theme.colors.borderLight,
    },
    modalButtonSave: {
        backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    symptomsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    symptomChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.borderLight,
    },
    symptomChipActive: {
        backgroundColor: '#FFE5EC',
        borderColor: theme.colors.primary,
    },
    symptomEmoji: {
        fontSize: 16,
    },
    symptomLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    symptomLabelActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
