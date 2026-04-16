import { createLogger } from '../../utils/logger';
const log = createLogger('ReminderCard');
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ReminderTemplate, REMINDER_SCHEDULES } from '../../types';
import { useTranslation } from 'react-i18next';
import { getLocalizedContent } from '../../utils/i18nHelpers';
import {
    loadReminderSettingsGuest,
    loadReminderSettingsAuth,
    saveReminderSettingGuest,
    saveReminderSettingAuth,
} from '../../services/reminderPersistence';
import { scheduleMultipleReminders, cancelReminderNotifications } from '../../services/notificationService';

interface ReminderCardProps {
    reminder: ReminderTemplate;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({ reminder }) => {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [enabled, setEnabled] = useState(false);

    // Get default intensity based on category
    const getDefaultIntensity = () => {
        const schedule = REMINDER_SCHEDULES[reminder.category] || REMINDER_SCHEDULES['default'];
        return schedule.intensityOptions[0];
    };

    const [intensity, setIntensity] = useState(getDefaultIntensity());
    const [loading, setLoading] = useState(false);

    // Load saved settings on mount
    useEffect(() => {
        loadSettings();
    }, [reminder.reminder_id, user]);

    const loadSettings = async () => {
        try {
            const settings = user
                ? await loadReminderSettingsAuth(user.uid)
                : await loadReminderSettingsGuest();

            const saved = settings[reminder.reminder_id];
            if (saved) {
                setEnabled(saved.enabled);
                setIntensity(saved.timesPerDay);
            }
        } catch (error) {
            log.error('[ReminderCard] Error loading settings:', error);
        }
    };

    const handleToggle = async (value: boolean) => {
        setLoading(true);
        setEnabled(value);

        try {
            // Save to persistence
            if (user) {
                await saveReminderSettingAuth(user.uid, reminder.reminder_id, value, intensity);
            } else {
                await saveReminderSettingGuest(reminder.reminder_id, value, intensity);
            }

            // Schedule or cancel notifications
            if (value) {
                await scheduleReminderNotifications(reminder, intensity);
            } else {
                await cancelReminderNotifications(reminder.reminder_id);
            }
        } catch (error) {
            log.error('[ReminderCard] Error toggling:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleIntensityChange = async (value: number) => {
        setLoading(true);
        setIntensity(value);

        try {
            // Save to persistence
            if (user) {
                await saveReminderSettingAuth(user.uid, reminder.reminder_id, enabled, value);
            } else {
                await saveReminderSettingGuest(reminder.reminder_id, enabled, value);
            }

            // Reschedule notifications if enabled
            if (enabled) {
                await cancelReminderNotifications(reminder.reminder_id);
                await scheduleReminderNotifications(reminder, value);
            }
        } catch (error) {
            log.error('[ReminderCard] Error changing intensity:', error);
        } finally {
            setLoading(false);
        }
    };

    const scheduleReminderNotifications = async (reminder: ReminderTemplate, timesPerDay: number) => {

        // Calculate hours based on intensity
        const hours = getHoursForIntensity(timesPerDay);
        const description = getLocalizedContent(reminder, 'description', i18n.language) || reminder.description_fr;
        const body = t('reminders.card.notifBody', { description });

        await scheduleMultipleReminders(
            reminder.reminder_id,
            getLocalizedContent(reminder, 'title', i18n.language) || reminder.title_fr,
            body,
            hours
        );
    };

    const getHoursForIntensity = (times: number): number[] => {
        const schedule = REMINDER_SCHEDULES[reminder.category] || REMINDER_SCHEDULES['default'];
        return schedule.schedules[times] || schedule.schedules[schedule.intensityOptions[0]];
    };

    const getIntensityOptions = (): number[] => {
        const schedule = REMINDER_SCHEDULES[reminder.category] || REMINDER_SCHEDULES['default'];
        return schedule.intensityOptions;
    };

    const formatHour = (hour: number): string => {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
    };

    return (
        <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
                <View style={styles.reminderTitleRow}>
                    <Text style={styles.reminderTitle}>{getLocalizedContent(reminder, 'title', i18n.language) || reminder.title_fr}</Text>
                    <Switch
                        value={enabled}
                        onValueChange={handleToggle}
                        trackColor={{ false: '#ccc', true: '#C2185B' }}
                        thumbColor={enabled ? '#fff' : '#f4f3f4'}
                    />
                </View>
                <Text style={styles.reminderDesc} numberOfLines={2}>
                    {getLocalizedContent(reminder, 'description', i18n.language) || reminder.description_fr}
                </Text>
            </View>

            {enabled && (
                <View style={styles.reminderControls}>
                    <Text style={styles.controlLabel}>{t('reminders.card.intensity')}</Text>
                    <View style={styles.intensityButtons}>
                        {getIntensityOptions().map(value => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.intensityButton,
                                    intensity === value && styles.intensityButtonActive
                                ]}
                                onPress={() => handleIntensityChange(value)}
                            >
                                <Text style={[
                                    styles.intensityButtonText,
                                    intensity === value && styles.intensityButtonTextActive
                                ]}>
                                    {t('reminders.card.timesPerDay', { count: value })}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Display scheduled hours */}
                    <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleLabel}>{t('reminders.card.scheduledHours')}</Text>
                        <Text style={styles.scheduleText}>
                            {getHoursForIntensity(intensity).map(h => formatHour(h)).join(' • ')}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    reminderCard: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    reminderHeader: {
        marginBottom: 8,
    },
    reminderTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reminderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    reminderDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    reminderControls: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    controlLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    intensityButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    intensityButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C2185B',
        backgroundColor: '#FFF',
        alignItems: 'center',
    },
    intensityButtonActive: {
        backgroundColor: '#C2185B',
    },
    intensityButtonText: {
        fontSize: 14,
        color: '#C2185B',
        fontWeight: '600',
    },
    intensityButtonTextActive: {
        color: '#FFF',
    },
    scheduleInfo: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
    },
    scheduleLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
    },
    scheduleText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
});
