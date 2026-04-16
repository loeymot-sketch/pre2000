/**
 * ReminderEditModal
 * 
 * Modal pour personnaliser un rappel:
 * - Modifier la fréquence (adapté à per_day/per_week)
 * - Modifier les horaires avec validation
 * - Interface simple et chaleureuse
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ReminderDefinition, ReminderUserSetting } from '../../types/remindersV2';
import { updateReminderSettings } from '../../services/remindersV2Service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getLocalizedContent, getLocalizedTrilang } from '../../utils/i18nHelpers';
import { createLogger } from '../../utils/logger';
const log = createLogger('ReminderEditModal');

interface ReminderEditModalProps {
    visible: boolean;
    reminder: ReminderDefinition;
    setting?: ReminderUserSetting;
    onClose: () => void;
    onSave: (newSetting: Partial<ReminderUserSetting>) => void;
}

export const ReminderEditModal: React.FC<ReminderEditModalProps> = ({
    visible,
    reminder,
    setting,
    onClose,
    onSave
}) => {
    const { user } = useAuth();
    const { t } = useTranslation();

    // V2.2: Maximum allowed time slots
    const MAX_TIME_SLOTS = 10;
    const MIN_TIME_SLOTS = 1;

    // Local state for editing
    const [selectedIntensity, setSelectedIntensity] = useState(
        setting?.intensity ?? reminder.intensity_options[0]
    );
    const [customTimes, setCustomTimes] = useState<string[]>(
        setting?.times ?? reminder.preset_times[selectedIntensity] ?? ['09:00']
    );
    const [timeLabels, setTimeLabels] = useState<Record<string, string>>(
        setting?.time_labels ?? {}
    );
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showAdvancedIntensity, setShowAdvancedIntensity] = useState(false);
    const [showPickerForIndex, setShowPickerForIndex] = useState<number | null>(null);
    const [tempPickerDate, setTempPickerDate] = useState<Date | null>(null);

    // Get default values for reset
    const defaultIntensity = reminder.intensity_options[0];
    const defaultTimes = reminder.preset_times[defaultIntensity] || ['09:00'];

    // V2.2: Sync intensity with times count (intensity = number of times)
    useEffect(() => {
        setSelectedIntensity(customTimes.length);
        setValidationError(null);
    }, [customTimes.length]);

    // Get frequency short label for button display
    const getFrequencyShort = (): string => {
        return t(`reminders.frequenciesShort.${reminder.frequency_type}`, '');
    };

    // Get frequency full label
    const getFrequencyFull = (): string => {
        return t(`reminders.frequencies.${reminder.frequency_type}`, '');
    };

    // Validate and normalize time format (HH:MM)
    const normalizeTime = (time: string): string | null => {
        // Remove all non-digit characters except colon
        const cleaned = time.replace(/[^\d:]/g, '');

        // Try to parse HH:MM format
        const match = cleaned.match(/^(\d{1,2}):?(\d{2})$/);
        if (!match) return null;

        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    // Validate all times before save
    const validateTimes = (): string[] | null => {
        const normalized: string[] = [];

        for (const time of customTimes) {
            const norm = normalizeTime(time);
            if (!norm) {
                setValidationError(t('reminders.reminderEdit.invalidTime', { time }));
                return null;
            }
            normalized.push(norm);
        }

        // Remove duplicates
        const unique = [...new Set(normalized)];
        if (unique.length !== normalized.length) {
            setValidationError(t('reminders.reminderEdit.duplicate'));
            return null;
        }

        // Sort times
        unique.sort();

        // V2.2: Check min/max limits only
        if (unique.length < MIN_TIME_SLOTS) {
            setValidationError(t('reminders.reminderEdit.minLimit', { count: MIN_TIME_SLOTS }));
            return null;
        }
        if (unique.length > MAX_TIME_SLOTS) {
            setValidationError(t('reminders.reminderEdit.maxLimit', { count: MAX_TIME_SLOTS }));
            return null;
        }

        return unique;
    };

    // Handle save with validation
    const handleSave = async () => {
        const validatedTimes = validateTimes();
        if (!validatedTimes) return;

        setSaving(true);
        setValidationError(null);

        try {
            // V2.2: Save with time_labels
            const updatedSetting = {
                intensity: validatedTimes.length,
                times: validatedTimes,
                time_labels: timeLabels
            };

            await updateReminderSettings(reminder.id, updatedSetting, user?.uid);

            onSave(updatedSetting);
            onClose();
        } catch (error) {
            log.error('Error saving reminder settings:', error);
            setValidationError(t('reminders.reminderEdit.saveError'));
        } finally {
            setSaving(false);
        }
    };

    // Handle time edit via picker
    const handlePickerChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPickerForIndex(null);
            if (event.type === 'set' && selectedDate && showPickerForIndex !== null) {
                applyTimeUpdate(showPickerForIndex, selectedDate);
            }
        } else if (Platform.OS === 'ios') {
            // iOS: Just update temp date (it won't forcefully reset the picker if we pass it directly)
            if (event.type === 'set' && selectedDate) {
                setTempPickerDate(selectedDate);
            }
        }
    };

    const applyTimeUpdate = (index: number, dateObj: Date) => {
        const newTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
        const updated = [...customTimes];
        const oldTime = customTimes[index];
        updated[index] = newTime;
        setCustomTimes(updated);

        // Update time_labels key if time changed
        if (timeLabels[oldTime]) {
            const newLabels = { ...timeLabels };
            newLabels[newTime] = newLabels[oldTime];
            delete newLabels[oldTime];
            setTimeLabels(newLabels);
        }
        setValidationError(null);
    };

    // Called when iOS "Valider" is pressed
    const handleIosValidate = () => {
        if (showPickerForIndex !== null && tempPickerDate) {
            applyTimeUpdate(showPickerForIndex, tempPickerDate);
        }
        setShowPickerForIndex(null);
    };

    const openPickerForIndex = (index: number | null) => {
        setShowPickerForIndex(index);
        if (index !== null) {
            setTempPickerDate(parseTimeStr(customTimes[index]));
        } else {
            setTempPickerDate(null);
        }
    };

    // V2.2: Handle label edit for a time slot
    const handleLabelEdit = (time: string, newLabel: string) => {
        setTimeLabels(prev => ({
            ...prev,
            [time]: newLabel
        }));
    };

    // V2.2: Add a new time slot
    const addTimeSlot = () => {
        if (customTimes.length >= MAX_TIME_SLOTS) return;

        // Find next available time (add 2 hours to last time, or default to 12:00)
        const lastTime = customTimes[customTimes.length - 1] || '10:00';
        const [hours] = lastTime.split(':').map(Number);
        const nextHour = (hours + 2) % 24;
        const newTime = `${nextHour.toString().padStart(2, '0')}:00`;

        setCustomTimes([...customTimes, newTime]);
        setValidationError(null);
    };

    // V2.2: Remove a time slot
    const removeTimeSlot = (index: number) => {
        if (customTimes.length <= MIN_TIME_SLOTS) return;

        const timeToRemove = customTimes[index];
        const updated = customTimes.filter((_, i) => i !== index);
        setCustomTimes(updated);

        // Clean up label for removed time
        if (timeLabels[timeToRemove]) {
            const newLabels = { ...timeLabels };
            delete newLabels[timeToRemove];
            setTimeLabels(newLabels);
        }
        setValidationError(null);
    };

    // Reset to defaults
    const resetToDefaults = () => {
        setCustomTimes([...defaultTimes]);
        setTimeLabels({});
        setShowAdvancedIntensity(false);
        setShowPickerForIndex(null);
        setTempPickerDate(null);
        setValidationError(null);
    };

    // Helper to convert HH:MM to Date for picker
    const parseTimeStr = (timeStr: string): Date => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours || 0, minutes || 0, 0, 0);
        return date;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerIcon}>{reminder.ui?.icon || '📌'}</Text>
                            <Text style={styles.headerTitle}>
                                {getLocalizedTrilang(reminder.title)}
                            </Text>
                        </View>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* V2.2: Dynamic time slots with labels */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {t('reminders.reminderEdit.yourSchedule', { count: customTimes.length, freq: getFrequencyShort() })}
                            </Text>

                            <View style={styles.timesContainer}>
                                {customTimes.map((time, index) => (
                                    <View key={index} style={styles.timeRowV2}>
                                        {/* Time input button */}
                                        <View style={styles.timeInputGroup}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.timeInputV2,
                                                    styles.timeButtonV2,
                                                    showPickerForIndex === index && { borderColor: '#C2185B', borderWidth: 2 },
                                                    validationError && styles.timeInputError
                                                ]}
                                                onPress={() => openPickerForIndex(showPickerForIndex === index ? null : index)}
                                            >
                                                <Text style={styles.timeButtonText}>{time}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {customTimes.length > MIN_TIME_SLOTS && (
                                            <TouchableOpacity
                                                style={styles.removeTimeButton}
                                                onPress={() => removeTimeSlot(index)}
                                            >
                                                <Text style={styles.removeTimeIcon}>🗑️</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* V2.2: Add time slot button */}
                            {
                                customTimes.length < MAX_TIME_SLOTS && (
                                    <TouchableOpacity style={styles.addTimeButton} onPress={addTimeSlot}>
                                        <Text style={styles.addTimeText}>{t('reminders.reminderEdit.addTime')}</Text>
                                    </TouchableOpacity>
                                )
                            }

                            <Text style={styles.hint}>
                                {t('reminders.reminderEdit.hint')}
                            </Text>
                        </View>

                        {/* Validation error */}
                        {validationError && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{validationError}</Text>
                            </View>
                        )}

                    </ScrollView>

                    {/* Footer with reset + save */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={resetToDefaults}
                        >
                            <Text style={styles.resetButtonText}>{t('reminders.reminderEdit.recommendedPace')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? t('common.save') : t('common.save').replace('...', ' 💕')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Native Time Picker (Android invokes its own native dialog, so wrapper doesn't matter) */}
                    {Platform.OS === 'android' && showPickerForIndex !== null && (
                        <DateTimePicker
                            value={parseTimeStr(customTimes[showPickerForIndex])}
                            mode="time"
                            display="default"
                            onChange={handlePickerChange}
                        />
                    )}

                    {/* iOS Full-Screen Overlay Picker */}
                    {Platform.OS === 'ios' && showPickerForIndex !== null && (
                        <View style={styles.iosPickerOverlay}>
                            <View style={styles.iosPickerContent}>
                                <View style={styles.iosPickerHeader}>
                                    <Text style={styles.iosPickerTitle}>
                                        {t('reminders.reminderEdit.addTime')}
                                    </Text>
                                    <TouchableOpacity onPress={handleIosValidate}>
                                        <Text style={styles.iosPickerDoneText}>{t('addAppointment.validate', 'Valider ✓')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempPickerDate || parseTimeStr(customTimes[showPickerForIndex])}
                                    mode="time"
                                    display="spinner"
                                    onChange={handlePickerChange}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFF',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        maxHeight: '80%',
        minHeight: 400,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
    },
    headerContent: {
        alignItems: 'center',
        paddingTop: 8,
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    intensityOptions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    intensityOption: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    intensityOptionActive: {
        borderColor: '#C2185B',
        backgroundColor: '#FFF5F8',
    },
    intensityOptionText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
    },
    intensityOptionTextActive: {
        color: '#C2185B',
    },
    timesContainer: {
        gap: 12,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeLabel: {
        fontSize: 14,
        color: '#666',
        width: 80,
    },
    timeInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    hint: {
        fontSize: 13,
        color: '#888',
        marginTop: 8,
        fontStyle: 'italic',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    saveButton: {
        backgroundColor: '#C2185B',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    intensityOptionSubtext: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    timeInputError: {
        borderColor: '#E57373',
        backgroundColor: '#FFEBEE',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#C62828',
        fontSize: 14,
        textAlign: 'center',
    },
    // Simple +/- mode styles
    simpleIntensityContainer: {
        alignItems: 'center',
        gap: 12,
    },
    simpleIntensityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    plusMinusButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF0F5',
        borderWidth: 2,
        borderColor: '#FF80AB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusMinusDisabled: {
        borderColor: '#E0E0E0',
        backgroundColor: '#F5F5F5',
    },
    plusMinusText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#C2185B',
    },
    intensityDisplay: {
        alignItems: 'center',
        minWidth: 80,
    },
    intensityDisplayText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#C2185B',
    },
    intensityDisplaySubtext: {
        fontSize: 14,
        color: '#888',
    },
    advancedLink: {
        fontSize: 13,
        color: '#888',
        textDecorationLine: 'underline',
        marginTop: 8,
    },
    resetButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    resetButtonText: {
        fontSize: 14,
        color: '#888',
    },
    // V2.2: Dynamic time slots styles
    timeRowV2: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    timeInputGroup: {
        flex: 1,
    },
    timeInputV2: {
        height: 48,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 8,
        backgroundColor: '#FFF',
    },
    removeTimeButton: {
        width: 40,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF0F5',
        borderRadius: 12,
        marginLeft: 4,
    },
    removeTimeIcon: {
        fontSize: 18,
    },
    addTimeButton: {
        borderWidth: 1,
        borderColor: '#C2185B',
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    addTimeText: {
        fontSize: 14,
        color: '#C2185B',
        fontWeight: '500',
    },
    timeButtonV2: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeButtonText: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
    },
    iosPickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        overflow: 'hidden',
    },
    iosPickerContent: {
        backgroundColor: '#FFF',
        height: 300,
        paddingBottom: 20,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FAFAFA',
    },
    iosPickerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    iosPickerDoneText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#C2185B',
    },
});
