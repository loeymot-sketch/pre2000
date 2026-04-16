import { createLogger } from '../utils/logger';
const log = createLogger('AddAppointmentScreen');
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Platform,
    ScrollView,
    Alert,
    Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePregnancy } from '../context/PregnancyContext';
import { saveUserEvent, calculateWeekFromDate, updateUserEvent } from '../services/calendarService';
import { scheduleRDVReminders, cancelRDVReminders, getRDVReminders, getRDVPreference } from '../services/rdvNotificationService';
import { analyticsService } from '../services/analyticsService';
import { trackPositiveAction } from '../services/inAppReviewService';
import { theme } from '../theme';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useDateLocale } from '../hooks/useDateLocale';
import { getPickerLocale } from '../utils/pickerLocale';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';






export const AddAppointmentScreen = () => {
    useScreenAnalytics('AddAppointmentScreen');
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { user, firebaseUser } = useAuth();

    const { profile } = usePregnancy();
    const { showToast } = useToast();
    const { t, i18n } = useTranslation();

    // Get date locale based on current language
    // Get date locale using shared hook (handles tn -> arTN correctly)
    const dateLocale = useDateLocale();

    // Check if we are in edit mode
    const editingEvent = route.params?.event;

    // DEBUG: Log incoming params
    useEffect(() => {
        log.debug('[AddAppointmentScreen] Params:', JSON.stringify(route.params));
        // Note: date is initialized from route.params, logged above
    }, []);

    const [title, setTitle] = useState(editingEvent?.title || '');
    const [type, setType] = useState<'medical' | 'other'>(editingEvent?.type === 'appointment' ? 'medical' : 'other'); // Simplified mapping

    // FIX: Ensure valid date initialization with smart time defaults
    const getInitialDate = () => {
        if (editingEvent?.date) return new Date(editingEvent.date);

        if (route.params?.selectedDate) {
            const dateStr = route.params.selectedDate;
            const paramDate = new Date(dateStr);
            // Check if valid date
            if (!isNaN(paramDate.getTime())) {
                // Determine if it was passed as a simple date string (YYYY-MM-DD)
                if (typeof dateStr === 'string' && dateStr.length <= 10) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 9, 0, 0);
                    }
                }

                // SMART UX: If the time is essentially midnight locally (00:00, or 01:00 from UTC offset)
                if (paramDate.getHours() <= 2 && paramDate.getMinutes() === 0) {
                    const now = new Date();
                    const isToday = paramDate.toDateString() === now.toDateString();

                    if (isToday) {
                        return now; // Default to NOW if adding for today
                    } else {
                        // For future dates, default to 09:00 instead of midnight
                        const smartTime = new Date(paramDate);
                        smartTime.setHours(9, 0, 0, 0);
                        return smartTime;
                    }
                }
                return paramDate;
            }
        }
        return new Date(); // Fallback to now
    };

    const [date, setDate] = useState(getInitialDate());
    const [tempDate, setTempDate] = useState<Date>(date);
    const [location, setLocation] = useState(editingEvent?.location || '');
    const [notes, setNotes] = useState(editingEvent?.notes || editingEvent?.description || '');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    // Reminder settings - 3 independent options
    const [reminderJ1, setReminderJ1] = useState(true);   // Veille à 8h
    const [reminderJ, setReminderJ] = useState(true);     // Jour J à 8h
    const [reminderH2, setReminderH2] = useState(false);  // 2h avant
    const [loadingReminders, setLoadingReminders] = useState(!!editingEvent);

    // Load existing reminder preferences when editing
    useEffect(() => {
        const loadExistingPreferences = async () => {
            if (editingEvent?.id) {
                try {
                    // Use preferences (what user WANTED) instead of scheduled reminders
                    const preference = await getRDVPreference(editingEvent.id);

                    if (preference) {
                        setReminderJ1(preference.reminderJ1);
                        setReminderJ(preference.reminderJ);
                        setReminderH2(preference.reminderH2);
                    } else {
                        // No preference found, try to load from actually scheduled reminders (backward compatibility)
                        const existingReminders = await getRDVReminders(editingEvent.id);
                        if (existingReminders.length > 0) {
                            const hasJ1 = existingReminders.some(r => r.reminderType === 'J-1');
                            const hasJ = existingReminders.some(r => r.reminderType === 'J');
                            const hasH2 = existingReminders.some(r => r.reminderType === 'H-2');
                            setReminderJ1(hasJ1);
                            setReminderJ(hasJ);
                            setReminderH2(hasH2);
                        } else {
                            // No existing reminders, default all to false for existing events
                            setReminderJ1(false);
                            setReminderJ(false);
                            setReminderH2(false);
                        }
                    }
                } catch (error) {
                    log.error('Error loading existing preferences:', error);
                } finally {
                    setLoadingReminders(false);
                }
            }
        };

        loadExistingPreferences();
    }, [editingEvent?.id]);

    const isTitleValid = title.trim().length > 0;

    // Check for unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        const initialTitle = editingEvent?.title || '';
        const initialNotes = editingEvent?.notes || editingEvent?.description || '';

        return title.trim() !== initialTitle || notes.trim() !== initialNotes;
    }, [title, notes, editingEvent]);

    // Prevent accidental back navigation if changes exist
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!hasUnsavedChanges || saving) {
                // If we don't have changes, or we are currently saving, proceed
                return;
            }

            // Prevent default behavior of leaving the screen
            e.preventDefault();

            // Prompt the user before leaving
            Alert.alert(
                t('addAppointment.discardTitle'),
                t('addAppointment.discardMsg'),
                [
                    { text: t('addAppointment.keepEditing'), style: 'cancel', onPress: () => { } },
                    {
                        text: t('addAppointment.discard'),
                        style: 'destructive',
                        // If the user confirmed, then we dispatch the action we blocked earlier
                        // This will continue the action that had triggered the removal of the screen
                        onPress: () => navigation.dispatch(e.data.action),
                    },
                ]
            );
        });

        return unsubscribe;
    }, [navigation, hasUnsavedChanges, saving, t]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
                const newDate = new Date(date);
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                setDate(newDate);
            }
        } else if (Platform.OS === 'ios') {
            if (selectedDate) {
                const newDate = new Date(tempDate);
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                setTempDate(newDate); // Buffer the change
            }
        }
    };

    const handleWebDateChange = (e: any) => {
        const value = e.target?.value || e.nativeEvent?.text;
        if (value) {
            const [year, month, day] = value.split('-').map(Number);
            const newDate = new Date(date);
            newDate.setFullYear(year, month - 1, day);
            setDate(newDate);
        }
    };

    const handleWebTimeChange = (e: any) => {
        const value = e.target?.value || e.nativeEvent?.text;
        if (value) {
            const [hours, minutes] = value.split(':').map(Number);
            const newDate = new Date(date);
            newDate.setHours(hours, minutes);
            setDate(newDate);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
            if (event.type === 'set' && selectedTime) {
                const newDate = new Date(date);
                newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                setDate(newDate);
            }
        } else if (Platform.OS === 'ios') {
            if (selectedTime) {
                const newDate = new Date(tempDate);
                newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                setTempDate(newDate); // Buffer the change
            }
        }
    };

    const handleSave = async () => {
        if (!isTitleValid) {
            Alert.alert(t('addAppointment.missingTitleTitle'), t('addAppointment.missingTitleMsg'));
            return;
        }

        // DEBUG: Log user and profile state
        // NOTE: firebaseUser is already available from component-level useAuth() call
        log.debug('[AddAppointmentScreen] Saving event. UserUID:', user?.uid, 'FirebaseUID:', firebaseUser?.uid, 'Profile LMP:', profile?.lmp);

        // Robust check: Ensure we have at least a UID and a pregnancy start date (from either context)
        const effectiveLmp = profile?.lmp || user?.pregnancyStartDate || user?.lmp || new Date().toISOString(); // Fallback to now if absolutely everything fails

        // Use the correct UID (user.uid should now be populated from AuthContext fix)
        // Fallback chain: user.uid (from profile) > firebaseUser.uid (from Firebase auth)
        const effectiveUid = user?.uid || firebaseUser?.uid;

        // Log the decision
        log.info('[AddAppointmentScreen] Using effective UID:', effectiveUid, 'LMP:', effectiveLmp);

        if (!effectiveUid) {
            log.error('[AddAppointmentScreen] No UID available. User may not be authenticated.');
            Alert.alert(t('addAppointment.notConnectedTitle'), t('addAppointment.notConnectedMsg'));
            return;
        }

        // Guest check
        if (user?.isGuest) {
            Alert.alert(
                t('addAppointment.guestAlertTitle'),
                t('addAppointment.guestAlertMsg'),
                [
                    { text: t('addAppointment.cancel'), style: 'cancel' },
                    {
                        text: t('addAppointment.guestAlertCreate'),
                        onPress: () => navigation.navigate('AuthChoice')
                    }
                ]
            );
            return;
        }

        setSaving(true);

        try {
            const lmpDate = new Date(effectiveLmp);
            const week = calculateWeekFromDate(lmpDate, date);

            let eventId: string;

            if (editingEvent?.id) {
                // UPDATE existing event
                eventId = editingEvent.id;
                await updateUserEvent(editingEvent.id, {
                    title: title.trim(),
                    date: date.toISOString(),
                    week,
                    type: 'appointment',
                    location: location.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                showToast(t('addAppointment.successEdit'), 'success');
            } else {
                // CREATE new event
                const result = await saveUserEvent({
                    user_id: effectiveUid, // Use the robust UID
                    title: title.trim(),
                    date: date.toISOString(),
                    week,
                    type: 'appointment',
                    location: location.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                eventId = (result as any)?.id || `temp_${Date.now()}`;
                showToast(t('addAppointment.successAdd'), 'success');
                // Engagement: Track positive action
                trackPositiveAction('add_rdv');
                await analyticsService.logEvent('appointment_created', { type: type });
            }

            // Schedule reminders based on individual toggles
            // WRAP IN TRY/CATCH so it doesn't block the save if it fails
            try {
                const hasAnyReminder = reminderJ1 || reminderJ || reminderH2;
                if (hasAnyReminder && eventId) {
                    log.debug('[AddAppointmentScreen] Scheduling reminders for:', eventId);
                    await scheduleRDVReminders(eventId, title.trim(), date, {
                        reminderJ1: reminderJ1,
                        reminderJ: reminderJ,
                        reminderH2: reminderH2,
                    });
                } else if (editingEvent?.id) {
                    // If no reminders selected, cancel existing ones
                    await cancelRDVReminders(editingEvent.id);
                }
            } catch (notifError) {
                log.error('[AddAppointmentScreen] Failed to schedule reminders (non-blocking):', notifError);
                // We don't throw here to ensure the RDV is kept
                Alert.alert(t('addAppointment.reminderInfoTitle'), t('addAppointment.reminderInfoMsg'));
            }

            navigation.goBack();
        } catch (error: any) {
            log.error('Error saving appointment:', error);
            Alert.alert(t('addAppointment.errorSaveTitle'), t('addAppointment.errorSaveMsg', { error: error.message || t('common.unknownError') }));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{editingEvent ? t('addAppointment.editTitle') : t('addAppointment.newTitle')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {editingEvent ? t('addAppointment.editSubtitle') : t('addAppointment.newSubtitle')}
                    </Text>
                </View>

                <View style={styles.form}>
                    {/* Title Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('addAppointment.titleLabel')}</Text>
                        <TextInput
                            style={[styles.input, !isTitleValid && title.length > 0 && { borderColor: 'red' }]}
                            placeholder={t('addAppointment.titlePlaceholder')}
                            placeholderTextColor={theme.colors.textLight}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                    </View>

                    {/* Type Selector */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('addAppointment.typeLabel')}</Text>
                        <View style={styles.typeContainer}>
                            <TouchableOpacity
                                style={[styles.typeButton, type === 'medical' && styles.typeButtonActive]}
                                onPress={() => setType('medical')}
                            >
                                <Text style={[styles.typeText, type === 'medical' && styles.typeTextActive]}>{t('addAppointment.typeMedical')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeButton, type === 'other' && styles.typeButtonActive]}
                                onPress={() => setType('other')}
                            >
                                <Text style={[styles.typeText, type === 'other' && styles.typeTextActive]}>{t('addAppointment.typeOther')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Date & Time Pickers Row */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>{t('addAppointment.dateLabel')}</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={styles.dateButton}
                                    value={format(date, 'yyyy-MM-dd')}
                                    onChangeText={(text) => handleWebDateChange({ target: { value: text } })}
                                    placeholder="YYYY-MM-DD"
                                    // @ts-ignore - Web specific attribute
                                    inputMode="none"
                                />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.dateButton, showDatePicker && { borderColor: theme.colors.primary, borderWidth: 2 }]}
                                    onPress={() => {
                                        setTempDate(date); // Initialize buffer to current date before opening
                                        setShowDatePicker(true);
                                        setShowTimePicker(false); // Close other picker
                                    }}
                                >
                                    <Text style={styles.dateText}>
                                        {format(date, 'dd MMMM yyyy', { locale: dateLocale })}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>{t('addAppointment.timeLabel')}</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={styles.dateButton}
                                    value={format(date, 'HH:mm')}
                                    onChangeText={(text) => handleWebTimeChange({ target: { value: text } })}
                                    placeholder="HH:MM"
                                    // @ts-ignore - Web specific attribute
                                    inputMode="none"
                                />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.dateButton, showTimePicker && { borderColor: theme.colors.primary, borderWidth: 2 }]}
                                    onPress={() => {
                                        setTempDate(date); // Initialize buffer to current time before opening
                                        setShowTimePicker(true);
                                        setShowDatePicker(false); // Close other picker
                                    }}
                                >
                                    <Text style={styles.dateText}>
                                        {format(date, 'HH:mm')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Native Pickers Area (Android) */}
                    {Platform.OS === 'android' && (showDatePicker || showTimePicker) && (
                        <View>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                    locale={getPickerLocale(i18n.language)}
                                    minimumDate={new Date()}
                                />
                            )}
                            {showTimePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="time"
                                    display="default"
                                    onChange={handleTimeChange}
                                    locale={getPickerLocale(i18n.language)}
                                />
                            )}
                        </View>
                    )}

                    {/* Location Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('addAppointment.locationLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('addAppointment.locationPlaceholder')}
                            placeholderTextColor={theme.colors.textLight}
                            value={location}
                            onChangeText={setLocation}
                            maxLength={200}
                        />
                    </View>

                    {/* Notes Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('addAppointment.notesLabel')}</Text>
                        <TextInput
                            style={[styles.input, styles.notesInput]}
                            placeholder={t('addAppointment.notesPlaceholder')}
                            placeholderTextColor={theme.colors.textLight}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                        />
                    </View>

                    {/* Reminders Section */}
                    <View style={styles.remindersSection}>
                        <Text style={styles.remindersSectionTitle}>🔔 {t('addAppointment.remindersLabel')}</Text>

                        {/* J-1: Veille à 8h */}
                        <View style={styles.reminderRow}>
                            <View style={styles.reminderInfo}>
                                <Text style={styles.reminderLabel}>{t('addAppointment.reminderJ1')}</Text>
                                <Text style={styles.reminderDesc}>{t('addAppointment.reminderJ1Desc')}</Text>
                            </View>
                            <Switch
                                value={reminderJ1}
                                onValueChange={setReminderJ1}
                                trackColor={{ false: theme.colors.disabled, true: '#FF6B9D50' }}
                                thumbColor={reminderJ1 ? '#FF6B9D' : '#999'}
                            />
                        </View>

                        {/* J: Jour même à 8h */}
                        <View style={styles.reminderRow}>
                            <View style={styles.reminderInfo}>
                                <Text style={styles.reminderLabel}>{t('addAppointment.reminderJ')}</Text>
                                <Text style={styles.reminderDesc}>{t('addAppointment.reminderJDesc')}</Text>
                            </View>
                            <Switch
                                value={reminderJ}
                                onValueChange={setReminderJ}
                                trackColor={{ false: theme.colors.disabled, true: '#FF6B9D50' }}
                                thumbColor={reminderJ ? '#FF6B9D' : '#999'}
                            />
                        </View>

                        {/* H-2: 2 heures avant */}
                        <View style={styles.reminderRow}>
                            <View style={styles.reminderInfo}>
                                <Text style={styles.reminderLabel}>{t('addAppointment.reminderH2')}</Text>
                                <Text style={styles.reminderDesc}>{t('addAppointment.reminderH2Desc')}</Text>
                            </View>
                            <Switch
                                value={reminderH2}
                                onValueChange={setReminderH2}
                                trackColor={{ false: theme.colors.disabled, true: '#FF6B9D50' }}
                                thumbColor={reminderH2 ? '#FF6B9D' : '#999'}
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => navigation.goBack()}
                            disabled={saving}
                        >
                            <Text style={styles.cancelButtonText}>{t('addAppointment.cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.saveButton,
                                (!isTitleValid || saving) && styles.saveButtonDisabled
                            ]}
                            onPress={handleSave}
                            disabled={saving || !isTitleValid}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? t('addAppointment.saving') : t('addAppointment.save')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* iOS Overlays for Date & Time Pickers */}
            {
                Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
                    <View style={styles.iosPickerOverlay}>
                        <View style={styles.iosPickerContent}>
                            <View style={styles.iosPickerHeader}>
                                <Text style={styles.iosPickerTitle}>
                                    {showDatePicker ? t('addAppointment.dateLabel') : t('addAppointment.timeLabel')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDate(tempDate); // COMMIT the buffered changes when 'Valider' is clicked
                                        setShowDatePicker(false);
                                        setShowTimePicker(false);
                                    }}
                                >
                                    <Text style={styles.iosPickerDoneText}>{t('addAppointment.validate', 'Valider ✓')}</Text>
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={tempDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    locale={getPickerLocale(i18n.language)}
                                    minimumDate={new Date()}
                                    style={{ flex: 1, height: 200 }}
                                    themeVariant="light"
                                />
                            )}

                            {showTimePicker && (
                                <DateTimePicker
                                    value={tempDate}
                                    mode="time"
                                    display="spinner"
                                    onChange={handleTimeChange}
                                    locale={getPickerLocale(i18n.language)}
                                    style={{ flex: 1, height: 200 }}
                                    themeVariant="light"
                                />
                            )}
                        </View>
                    </View>
                )
            }
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        padding: theme.spacing.l,
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700' as const,
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    headerSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textLight,
    },
    form: {
        gap: theme.spacing.l,
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing.m,
    },
    inputGroup: {
        marginBottom: theme.spacing.m,
    },
    label: {
        fontSize: 14,
        fontWeight: '600' as const,
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    input: {
        ...theme.typography.body,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.white,
    },
    notesInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    dateButton: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.white,
    },
    dateText: {
        ...theme.typography.body,
        color: theme.colors.text,
    },
    actions: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        marginTop: theme.spacing.l,
    },
    button: {
        flex: 1,
        padding: theme.spacing.m,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: theme.colors.text,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: theme.colors.white,
    },
    typeContainer: {
        flexDirection: 'row',
        gap: theme.spacing.m,
    },
    typeButton: {
        flex: 1,
        padding: theme.spacing.m,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.white,
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    typeText: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: theme.colors.text,
    },
    typeTextActive: {
        color: theme.colors.white,
    },
    remindersSection: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.l,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    remindersSectionTitle: {
        fontSize: 15,
        fontWeight: '600' as const,
        color: '#F57C00',
        marginBottom: theme.spacing.m,
    },
    reminderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
    },
    reminderInfo: {
        flex: 1,
    },
    reminderLabel: {
        fontSize: 14,
        fontWeight: '500' as const,
        color: theme.colors.text,
    },
    reminderDesc: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 2,
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
        backgroundColor: theme.colors.white,
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
        borderBottomColor: theme.colors.disabled,
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
        color: theme.colors.accent,
    },
    pickerContainer: {
        marginTop: theme.spacing.m,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    picker: {
        width: '100%',
        backgroundColor: '#F9F9F9',
    },
    closePickerButton: {
        padding: theme.spacing.m,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.borderLight,
    },
    closePickerText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 16,
    },
});
