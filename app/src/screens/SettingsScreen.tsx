import { createLogger, logger } from '../utils/logger';
const log = createLogger('SettingsScreen');
import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Linking,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePregnancy } from '../context/PregnancyContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import {
    loadBabyMessageEnabled,
    saveBabyMessageEnabled,
    loadBabyMessageHour,
    saveBabyMessageHour,
} from '../services/reminderPersistence';
import { updateBabyMessageSchedule } from '../services/babyMessageService';
import { useTranslation } from 'react-i18next';
import { exportUserData } from '../services/dataExportService';
import { useDateLocale } from '../hooks/useDateLocale';
// DEAD-CODE-FIX: DemoDataService import removed — was imported but never used.
// DemoDataService should only ever be called in __DEV__ contexts.
import { requestNotificationPermissions } from '../services/notificationService';
import { sendTestNotification, getScheduledNotifications } from '../services/rdvNotificationService';
import { generateAndSharePDF } from '../services/pdfExportService';
import { getWeightHistory } from '../services/weightService';
import { getAppointments } from '../services/appointmentService';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

/**
 * SettingsScreen - V1.2 Feature
 * Manage notification settings
 */
export const SettingsScreen = () => {
    useScreenAnalytics('SettingsScreen');
    const { t, i18n } = useTranslation();

    const dateLocale = useDateLocale();
    const { pregnancyInfo } = usePregnancy();
    const { user } = useAuth();
    const navigation = useNavigation();
    const [babyMessageEnabled, setBabyMessageEnabled] = useState(true);
    const [babyMessageHour, setBabyMessageHour] = useState(10);
    const [loading, setLoading] = useState(true);

    log.debug('[SettingsScreen] Rendering...');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        log.debug('[SettingsScreen] Loading settings...');
        setLoading(true);

        try {
            const enabled = await loadBabyMessageEnabled();
            const hour = await loadBabyMessageHour();

            setBabyMessageEnabled(enabled);
            setBabyMessageHour(hour);

            log.debug('[SettingsScreen] Loaded settings:', { enabled, hour });
        } catch (error) {
            log.error('[SettingsScreen] Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBabyMessageToggle = async (value: boolean) => {
        log.debug('[SettingsScreen] Baby message toggle:', value);
        setBabyMessageEnabled(value);

        try {
            await saveBabyMessageEnabled(value);

            if (pregnancyInfo) {
                await updateBabyMessageSchedule(
                    pregnancyInfo.week,
                    value,
                    babyMessageHour
                );
            }

            log.debug('[SettingsScreen] ✅ Baby message setting saved');
        } catch (error) {
            log.error('[SettingsScreen] Error toggling baby message:', error);
        }
    };

    const handleHourChange = async (newHour: number) => {
        log.debug('[SettingsScreen] Hour change:', newHour);
        setBabyMessageHour(newHour);

        try {
            await saveBabyMessageHour(newHour);

            if (pregnancyInfo && babyMessageEnabled) {
                await updateBabyMessageSchedule(
                    pregnancyInfo.week,
                    babyMessageEnabled,
                    newHour
                );
            }

            log.debug('[SettingsScreen] ✅ Hour setting saved');
        } catch (error) {
            log.error('[SettingsScreen] Error changing hour:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>{t('common.loading')}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>⚙️ {t('common.settings')}</Text>
                <Text style={styles.headerSubtitle}>{t('common.notifications')}</Text>
            </View>

            {/* Baby Message Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>💕 {t('common.babyMessage')}</Text>
                </View>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>{t('common.dailyMessage')}</Text>
                        <Text style={styles.settingDescription}>
                            {t('common.dailyMessageDesc')}
                        </Text>
                    </View>
                    <Switch
                        value={babyMessageEnabled}
                        onValueChange={handleBabyMessageToggle}
                        trackColor={{ false: '#ccc', true: theme.colors.accent }}
                        thumbColor={babyMessageEnabled ? '#fff' : '#f4f3f4'}
                        accessibilityLabel={t('common.a11y.toggleBabyMessage')}
                        accessibilityRole="switch"
                    />
                </View>

                {babyMessageEnabled && (
                    <View style={styles.hourSelector}>
                        <Text style={styles.hourLabel}>{t('common.notifHour')}</Text>
                        <View style={styles.hourButtons}>
                            {[8, 9, 10, 11, 12].map(hour => (
                                <TouchableOpacity
                                    key={hour}
                                    style={[
                                        styles.hourButton,
                                        babyMessageHour === hour && styles.hourButtonActive
                                    ]}
                                    onPress={() => handleHourChange(hour)}
                                    accessibilityLabel={t('common.a11y.selectHour', { hour })}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: babyMessageHour === hour }}
                                >
                                    <Text style={[
                                        styles.hourButtonText,
                                        babyMessageHour === hour && styles.hourButtonTextActive
                                    ]}>
                                        {hour}:00
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Permissions Debug Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🔔 {t('common.permissions')}</Text>
                </View>
                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={async () => {
                        const granted = await requestNotificationPermissions();

                        if (granted) {
                            alert(t('common.permissionsGranted'));
                        } else {
                            // On iOS, if permission is already denied, we must open settings
                            // Alert, Linking, Platform already imported at top
                            Alert.alert(
                                t('common.permissionsDenied'),
                                t('common.permissionsDeniedMsg'),
                                [
                                    { text: t('common.cancel'), style: "cancel" },
                                    {
                                        text: t('common.openSettings'),
                                        onPress: () => Linking.openSettings()
                                    }
                                ]
                            );
                        }
                    }}
                >
                    <View style={styles.settingRowLeft}>
                        <Text style={styles.menuIcon}>👉</Text>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('common.requestPermissions')}</Text>
                            <Text style={styles.settingDescription}>
                                {t('common.requestPermissionsDesc')}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                {/* Test Notification Button */}
                <TouchableOpacity
                    style={[styles.settingRow, { borderBottomWidth: 0 }]}
                    onPress={async () => {
                        // sendTestNotification, getScheduledNotifications already imported at top
                        const success = await sendTestNotification();
                        if (success) {
                            alert(t('common.testNotificationsSent'));
                            // Also show how many notifications are scheduled
                            const scheduled = await getScheduledNotifications();
                            log.debug('Scheduled notifications:', scheduled.length);
                        } else {
                            alert(t('common.testNotificationsFailed'));
                        }
                    }}
                >
                    <View style={styles.settingRowLeft}>
                        <Text style={styles.menuIcon}>▶️</Text>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('common.testNotifications')}</Text>
                            <Text style={styles.settingDescription}>
                                {t('common.testNotificationsDesc')}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                    {t('common.reminderInfo')}
                </Text>
            </View>

            {/* Data & Privacy Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🛡️ {t('common.privacyData.title')}</Text>
                </View>

                {/* PDF Journal Export - ENABLED */}
                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={async () => {
                        try {
                            setLoading(true);
                            const userId = auth.currentUser?.uid;
                            if (!userId) {
                                Alert.alert(t('common.error'), t('common.loginRequired'));
                                return;
                            }

                            const weightHistoryData = await getWeightHistory(userId);
                            const appointmentsData = await getAppointments();

                            await generateAndSharePDF({
                                profile: pregnancyInfo as any,
                                weightHistory: weightHistoryData,
                                appointments: appointmentsData as any,
                                notes: []
                            }, t, dateLocale, 'Journal_Grossesse.pdf', i18n.language);
                        } catch (e) {
                            logger.error("SettingsScreen", "PDF Export Error", e);
                            Alert.alert(t('common.error'), t('export.errorMessage') || t('common.error'));
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    <View style={styles.settingRowLeft}>
                        <Text style={styles.menuIcon}>📕</Text>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('common.privacyData.exportPDF')}</Text>
                            <Text style={styles.settingDescription}>
                                {t('common.privacyData.exportPDFDesc')}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.settingRow, { borderBottomWidth: 0 }]}
                    onPress={() => exportUserData(user, pregnancyInfo, t)}
                >
                    <View style={styles.settingRowLeft}>
                        <Text style={styles.menuIcon}>📤</Text>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('common.privacyData.export')}</Text>
                            <Text style={styles.settingDescription}>
                                {t('common.privacyData.exportDesc')}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Legal Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📋 {t('common.legal')}</Text>
                </View>
                <TouchableOpacity
                    style={styles.legalRow}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                    <View style={styles.settingRowLeft}>
                        <Text style={styles.menuIcon}>🔒</Text>
                        <Text style={styles.legalText}>{t('common.privacyPolicy')}</Text>
                    </View>
                    <Text style={styles.legalArrow}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Developer Section (Only in DEV) */}
            {__DEV__ && (
                <View style={[styles.section, { borderColor: '#7B1FA2', borderWidth: 1 }]}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#F3E5F5' }]}>
                        <Text style={[styles.sectionTitle, { color: '#7B1FA2' }]}>👨‍💻 Developer Tools</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: '#E1BEE7', borderBottomWidth: 0 }]}
                        onPress={() => navigation.navigate('Diagnostic')}
                    >
                        <View style={styles.settingRowLeft}>
                            <Text style={styles.menuIcon}>🩺</Text>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Run Diagnostics</Text>
                                <Text style={styles.settingDescription}>
                                    Check database integrity and content status.
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                </View >
            )}
        </ScrollView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        padding: 20,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.disabled,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    section: {
        marginTop: 16,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.m,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    sectionHeader: {
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.disabled,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    settingRowLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIcon: {
        fontSize: 22,
        marginEnd: 16,
        width: 28,
        textAlign: 'center',
    },
    menuArrow: {
        fontSize: 20,
        color: '#CCC',
        marginStart: 8,
    },
    settingInfo: {
        flex: 1,
        marginEnd: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    hourSelector: {
        padding: 16,
    },
    hourLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    hourButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    hourButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.white,
        alignItems: 'center',
    },
    hourButtonActive: {
        backgroundColor: theme.colors.accent,
    },
    hourButtonText: {
        fontSize: 14,
        color: theme.colors.accent,
        fontWeight: '600',
    },
    hourButtonTextActive: {
        color: theme.colors.white,
    },
    infoSection: {
        margin: 16,
        padding: 16,
        backgroundColor: '#FFF9E6',
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: '#FFE69C',
    },
    infoText: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    legalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    legalText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    legalArrow: {
        fontSize: 20,
        color: '#999',
    },
});
