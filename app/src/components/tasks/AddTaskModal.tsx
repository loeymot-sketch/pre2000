import { createLogger } from '../../utils/logger';
const log = createLogger('AddTaskModal');
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Switch,
    ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useDateLocale } from '../../hooks/useDateLocale';
import { useTranslation } from 'react-i18next';
import { getPickerLocale } from '../../utils/pickerLocale';
import { addDays, isSameDay } from 'date-fns';
import { getShadowStyle } from '../../utils/styleUtils';
import { theme } from '../../theme';
import { RecurrenceRule } from '../../types';

interface AddTaskModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (title: string, priority: 'high' | 'medium' | 'low', reminderTime?: Date, recurrence?: RecurrenceRule) => Promise<void>;
    initialTask?: {
        title: string;
        priority: 'high' | 'medium' | 'low';
        reminderTime?: Date;
        recurrence?: RecurrenceRule;
    };
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
    visible,
    onClose,
    onCreate,
    initialTask,
}) => {
    const { t, i18n } = useTranslation();
    const dateLocale = useDateLocale();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderDate, setReminderDate] = useState(new Date());
    const [tempTimeDate, setTempTimeDate] = useState<Date | null>(null);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<'daily' | 'interval' | 'specific_days'>('daily');
    const [intervalDays, setIntervalDays] = useState('2');
    const [specificDays, setSpecificDays] = useState<number[]>([]); // 1=Mon, 7=Sun

    // Days mapping
    const DAYS_MAP = [
        { key: 1, label: t('tasks.modal.days.mon') },
        { key: 2, label: t('tasks.modal.days.tue') },
        { key: 3, label: t('tasks.modal.days.wed') },
        { key: 4, label: t('tasks.modal.days.thu') },
        { key: 5, label: t('tasks.modal.days.fri') },
        { key: 6, label: t('tasks.modal.days.sat') },
        { key: 0, label: t('tasks.modal.days.sun') },
    ];

    // Load initial task data if editing
    React.useEffect(() => {
        if (visible) {
            log.debug('[AddTaskModal] Opened. InitialTask:', JSON.stringify(initialTask));

            if (initialTask) {
                setTitle(initialTask.title || '');
                setPriority(initialTask.priority);
                if (initialTask.reminderTime) {
                    setReminderEnabled(true);
                    setReminderDate(initialTask.reminderTime);
                } else {
                    setReminderEnabled(false);
                    setReminderDate(new Date());
                }
                if (initialTask.recurrence) {
                    setIsRecurring(true);
                    setRecurrenceType(initialTask.recurrence.type);
                    if (initialTask.recurrence.interval) setIntervalDays(initialTask.recurrence.interval.toString());
                    if (initialTask.recurrence.days) setSpecificDays(initialTask.recurrence.days);
                } else {
                    setIsRecurring(false);
                }
            } else {
                // Reset if opening as new
                setTitle('');
                setPriority('medium');
                setReminderEnabled(false);
                setIsRecurring(false);
                setRecurrenceType('daily');
                setIntervalDays('2');
                setSpecificDays([]);
                const now = new Date();
                log.debug('[AddTaskModal] New task, setting date to:', now.toISOString());
                setReminderDate(now);
            }
        }
    }, [visible]);

    const handleCreate = async () => {
        const safeTitle = (title || '').trim();
        // Validation
        if (safeTitle.length < 3) {
            setError(t('tasks.modal.errorTitle'));
            return;
        }

        // Validate Reminder Date
        let finalReminderDate = reminderDate;

        // If there's a custom time selected (especially on iOS), merge it carefully into final date
        if (tempTimeDate && Platform.OS === 'ios') {
            finalReminderDate = new Date(reminderDate);
            finalReminderDate.setHours(tempTimeDate.getHours(), tempTimeDate.getMinutes(), 0, 0);
        }

        if (reminderEnabled && finalReminderDate < new Date()) {
            setError(t('tasks.modal.errorDate'));
            return;
        }

        setError('');
        setLoading(true);
        try {
            let finalRecurrence: RecurrenceRule | undefined = undefined;
            if (isRecurring) {
                finalRecurrence = { type: recurrenceType };
                if (recurrenceType === 'interval') finalRecurrence.interval = parseInt(intervalDays) || 2;
                if (recurrenceType === 'specific_days') finalRecurrence.days = specificDays.length > 0 ? specificDays : [new Date().getDay()];
            }

            await onCreate(safeTitle, priority, reminderEnabled ? finalReminderDate : undefined, finalRecurrence);

            // Reset form
            setTitle('');
            setPriority('medium');
            setReminderEnabled(false);
            onClose();
        } catch (err) {
            setError(t('tasks.modal.errorSave'));
            log.error('[AddTaskModal] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setPriority('medium');
        setReminderEnabled(false);
        setIsRecurring(false);
        setError('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {initialTask ? t('tasks.modal.editTitle') : t('tasks.modal.newTitle')}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable Form Content */}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Info Box */}
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                {t('tasks.modal.info')}
                            </Text>
                        </View>

                        {/* Title Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('tasks.modal.titleLabel')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('tasks.modal.placeholder')}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={100}
                                autoFocus
                            />
                        </View>

                        {/* Priority Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('tasks.modal.priority')}</Text>
                            <View style={styles.priorityButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        priority === 'high' && styles.priorityButtonActiveHigh,
                                    ]}
                                    onPress={() => setPriority('high')}
                                >
                                    <Text
                                        style={[
                                            styles.priorityButtonText,
                                            priority === 'high' && styles.priorityButtonTextActive,
                                        ]}
                                    >
                                        {t('tasks.modal.high')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        priority === 'medium' && styles.priorityButtonActiveMedium,
                                    ]}
                                    onPress={() => setPriority('medium')}
                                >
                                    <Text
                                        style={[
                                            styles.priorityButtonText,
                                            priority === 'medium' && styles.priorityButtonTextActive,
                                        ]}
                                    >
                                        {t('tasks.modal.medium')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        priority === 'low' && styles.priorityButtonActiveLow,
                                    ]}
                                    onPress={() => setPriority('low')}
                                >
                                    <Text
                                        style={[
                                            styles.priorityButtonText,
                                            priority === 'low' && styles.priorityButtonTextActive,
                                        ]}
                                    >
                                        {t('tasks.modal.low')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Recurrence Section */}
                        <View style={styles.inputGroup}>
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>{t('tasks.modal.routine')}</Text>
                                <Switch
                                    value={isRecurring}
                                    onValueChange={setIsRecurring}
                                    trackColor={{ false: theme.colors.neutral200, true: theme.colors.primary }}
                                    thumbColor={isRecurring ? theme.colors.accent : theme.colors.iosGroupedBackground}
                                />
                            </View>

                            {isRecurring && (
                                <View style={styles.recurrenceContainer}>
                                    {/* Recurrence Type Segmented Control */}
                                    <View style={styles.segmentControl}>
                                        <TouchableOpacity
                                            style={[styles.segmentButton, recurrenceType === 'daily' && styles.segmentButtonActive]}
                                            onPress={() => setRecurrenceType('daily')}
                                        >
                                            <Text style={[styles.segmentButtonText, recurrenceType === 'daily' && styles.segmentButtonTextActive]}>
                                                {t('tasks.modal.repeatType_daily')}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.segmentButton, recurrenceType === 'specific_days' && styles.segmentButtonActive]}
                                            onPress={() => setRecurrenceType('specific_days')}
                                        >
                                            <Text style={[styles.segmentButtonText, recurrenceType === 'specific_days' && styles.segmentButtonTextActive]}>
                                                {t('tasks.modal.repeatType_specific')}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.segmentButton, recurrenceType === 'interval' && styles.segmentButtonActive]}
                                            onPress={() => setRecurrenceType('interval')}
                                        >
                                            <Text style={[styles.segmentButtonText, recurrenceType === 'interval' && styles.segmentButtonTextActive]}>
                                                {t('tasks.modal.repeatType_interval')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Interval Input */}
                                    {recurrenceType === 'interval' && (
                                        <View style={styles.intervalRow}>
                                            <Text style={styles.intervalLabel}>{t('tasks.modal.intervalLabel')}</Text>
                                            <TextInput
                                                style={styles.intervalInput}
                                                value={intervalDays}
                                                onChangeText={(text) => setIntervalDays(text.replace(/[^0-9]/g, ''))}
                                                keyboardType="number-pad"
                                                maxLength={2}
                                            />
                                        </View>
                                    )}

                                    {/* Specific Days Bubbles */}
                                    {recurrenceType === 'specific_days' && (
                                        <View style={styles.daysContainer}>
                                            {DAYS_MAP.map(day => (
                                                <TouchableOpacity
                                                    key={day.key}
                                                    style={[
                                                        styles.dayBubble,
                                                        specificDays.includes(day.key) && styles.dayBubbleActive
                                                    ]}
                                                    onPress={() => {
                                                        setSpecificDays(prev =>
                                                            prev.includes(day.key)
                                                                ? prev.filter(d => d !== day.key)
                                                                : [...prev, day.key]
                                                        )
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dayBubbleText,
                                                        specificDays.includes(day.key) && styles.dayBubbleTextActive
                                                    ]}>
                                                        {day.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Reminder Section */}
                        <View style={styles.inputGroup}>
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>{t('tasks.modal.addReminder')}</Text>
                                <Switch
                                    value={reminderEnabled}
                                    onValueChange={setReminderEnabled}
                                    trackColor={{ false: theme.colors.neutral200, true: theme.colors.primary }}
                                    thumbColor={reminderEnabled ? theme.colors.accent : theme.colors.iosGroupedBackground}
                                />
                            </View>

                            {reminderEnabled && (
                                <View>
                                    {(Platform.OS as string) === 'web' ? (
                                        /* WEB SPECIFIC LAYOUT: Always show Date and Time inputs */
                                        <View style={{ gap: 12 }}>
                                            <View>
                                                <Text style={styles.dateLabel}>{t('tasks.modal.dateLabel')}</Text>
                                                <input
                                                    type="date"
                                                    min={format(new Date(), 'yyyy-MM-dd')}
                                                    value={format(reminderDate, 'yyyy-MM-dd')}
                                                    onChange={(e: any) => {
                                                        if (e.target.value) {
                                                            const [year, month, day] = e.target.value.split('-').map(Number);
                                                            const newDate = new Date(reminderDate);
                                                            newDate.setFullYear(year, month - 1, day);
                                                            setReminderDate(newDate);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: 10,
                                                        borderRadius: 8,
                                                        border: `1px solid ${theme.colors.neutral200}`,
                                                        fontSize: 16,
                                                        width: '100%',
                                                        fontFamily: 'system-ui',
                                                        backgroundColor: theme.colors.surfaceGrayStripe
                                                    }}
                                                />
                                            </View>
                                            <View>
                                                <Text style={styles.dateLabel}>{t('tasks.modal.timeLabel')}</Text>
                                                <input
                                                    type="time"
                                                    value={format(reminderDate, 'HH:mm')}
                                                    onChange={(e: any) => {
                                                        const [hours, minutes] = e.target.value.split(':');
                                                        const newDate = new Date(reminderDate);
                                                        newDate.setHours(parseInt(hours), parseInt(minutes));
                                                        setReminderDate(newDate);
                                                    }}
                                                    style={{
                                                        padding: 10,
                                                        borderRadius: 8,
                                                        border: `1px solid ${theme.colors.neutral200}`,
                                                        fontSize: 16,
                                                        width: '100%',
                                                        fontFamily: 'system-ui',
                                                        backgroundColor: theme.colors.surfaceGrayStripe
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        /* MOBILE LAYOUT: Buttons + Picker */
                                        <View>
                                            {/* Date Selection Buttons */}
                                            <View style={styles.dateButtonsRow}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.dateOptionButton,
                                                        isSameDay(reminderDate, new Date()) && styles.dateOptionButtonActive
                                                    ]}
                                                    onPress={() => {
                                                        const now = new Date();
                                                        const newDate = new Date(reminderDate);
                                                        newDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                                                        setReminderDate(newDate);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dateOptionText,
                                                        isSameDay(reminderDate, new Date()) && styles.dateOptionTextActive
                                                    ]}>{t('tasks.modal.today')}</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.dateOptionButton,
                                                        isSameDay(reminderDate, addDays(new Date(), 1)) && styles.dateOptionButtonActive
                                                    ]}
                                                    onPress={() => {
                                                        const tomorrow = addDays(new Date(), 1);
                                                        const newDate = new Date(reminderDate);
                                                        newDate.setFullYear(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
                                                        setReminderDate(newDate);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dateOptionText,
                                                        isSameDay(reminderDate, addDays(new Date(), 1)) && styles.dateOptionTextActive
                                                    ]}>{t('tasks.modal.tomorrow')}</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.dateOptionButton,
                                                        !isSameDay(reminderDate, new Date()) && !isSameDay(reminderDate, addDays(new Date(), 1)) && styles.dateOptionButtonActive
                                                    ]}
                                                    onPress={() => setShowDatePicker(true)}
                                                >
                                                    <Text style={[
                                                        styles.dateOptionText,
                                                        !isSameDay(reminderDate, new Date()) && !isSameDay(reminderDate, addDays(new Date(), 1)) && styles.dateOptionTextActive
                                                    ]}>{t('tasks.modal.other')}</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {/* Date Picker Modal (Android/iOS) */}
                                            {showDatePicker && (
                                                <DateTimePicker
                                                    value={reminderDate}
                                                    minimumDate={new Date()}
                                                    mode="date"
                                                    display="default"
                                                    locale={getPickerLocale(i18n.language)}
                                                    onChange={(event, date) => {
                                                        setShowDatePicker(false);
                                                        if (date) {
                                                            const newDate = new Date(reminderDate);
                                                            newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                                            setReminderDate(newDate);
                                                        }
                                                    }}
                                                />
                                            )}

                                            <View style={styles.datePickerContainer}>
                                                <Text style={styles.dateLabel}>{t('tasks.modal.timeLabel')}</Text>
                                                {Platform.OS === 'android' ? (
                                                    <TouchableOpacity
                                                        style={styles.dateButton}
                                                        onPress={() => setShowTimePicker(true)}
                                                    >
                                                        <Text style={styles.dateButtonText}>
                                                            {format(reminderDate, 'HH:mm', { locale: dateLocale })}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={{ alignItems: 'center' }}>
                                                        <DateTimePicker
                                                            value={tempTimeDate || reminderDate}
                                                            mode="time"
                                                            display="spinner"
                                                            onChange={(event, date) => {
                                                                if (date) {
                                                                    const newDate = tempTimeDate ? new Date(tempTimeDate) : new Date(reminderDate);
                                                                    newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                                                                    setTempTimeDate(newDate); // Buffer the change
                                                                }
                                                            }}
                                                            style={{ width: 120, height: 120 }}
                                                            themeVariant="light"
                                                        />
                                                        {tempTimeDate && (
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 12 }}
                                                                onPress={() => {
                                                                    setReminderDate(tempTimeDate);
                                                                    setTempTimeDate(null);
                                                                }}
                                                            >
                                                                <Text style={{ color: theme.colors.white, fontWeight: 'bold' }}>Valider l'heure</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}

                                                {Platform.OS === 'android' && showTimePicker && (
                                                    <DateTimePicker
                                                        value={tempTimeDate || reminderDate}
                                                        mode="time"
                                                        display="default"
                                                        onChange={(event, date) => {
                                                            setShowTimePicker(false);
                                                            if (date) {
                                                                const newDate = new Date(reminderDate);
                                                                newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                                                                setReminderDate(newDate);
                                                                setTempTimeDate(null);
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </View>

                                            {/* Display selected date text if not today/tomorrow */}
                                            {!isSameDay(reminderDate, new Date()) && !isSameDay(reminderDate, addDays(new Date(), 1)) && (
                                                <Text style={styles.selectedDateText}>
                                                    {format(reminderDate, 'dd MMMM yyyy', { locale: dateLocale })}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                    </ScrollView>

                    {/* Error Message */}
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>{t('tasks.modal.cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.createButton,
                                (loading || (title || '').trim().length < 3) && styles.createButtonDisabled,
                            ]}
                            onPress={handleCreate}
                            disabled={loading || (title || '').trim().length < 3}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.white} size="small" />
                            ) : (
                                <Text style={styles.createButtonText}>
                                    {initialTask ? t('tasks.modal.update') : t('tasks.modal.create')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: theme.colors.blackAlpha50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '90%',
        backgroundColor: theme.colors.white,
        borderRadius: 20,
        padding: 24,
        ...getShadowStyle(8, theme.colors.black, 0.3, 8, { width: 0, height: 4 }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.neutral900,
    },
    closeButton: {
        padding: 4,
    },
    closeText: {
        fontSize: 24,
        color: theme.colors.neutral400,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.neutral700,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        backgroundColor: theme.colors.surfaceGrayStripe,
    },
    priorityButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.neutral200,
        backgroundColor: theme.colors.surfaceGrayStripe,
        alignItems: 'center',
    },
    priorityButtonActiveHigh: {
        borderColor: theme.colors.red600,
        backgroundColor: theme.colors.red600,
    },
    priorityButtonActiveMedium: {
        borderColor: theme.colors.orange400,
        backgroundColor: theme.colors.orange400,
    },
    priorityButtonActiveLow: {
        borderColor: theme.colors.green400,
        backgroundColor: theme.colors.green400,
    },
    priorityButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    priorityButtonTextActive: {
        color: theme.colors.white,
    },
    error: {
        color: theme.colors.red600,
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.accent,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.accent,
    },
    createButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.white,
    },

    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surfaceGrayStripe,
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    dateLabel: {
        fontSize: 14,
        color: theme.colors.neutral700,
    },
    dateButton: {
        backgroundColor: theme.colors.white,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
    },
    dateButtonText: {
        fontSize: 16,
        color: theme.colors.neutral900,
        fontWeight: '600',
    },
    dateButtonsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    dateOptionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        backgroundColor: theme.colors.white,
        alignItems: 'center',
    },
    dateOptionButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    dateOptionText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    dateOptionTextActive: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    selectedDateText: {
        fontSize: 14,
        color: theme.colors.accent,
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '500',
    },
    infoBox: {
        backgroundColor: theme.colors.surfaceBlueTint,
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.blue200,
    },
    infoText: {
        fontSize: 13,
        color: theme.colors.blue800,
        lineHeight: 18,
    },
    recurrenceContainer: {
        marginTop: 12,
        backgroundColor: theme.colors.surfaceGrayStripe,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.neutral50,
    },
    segmentControl: {
        flexDirection: 'row',
        backgroundColor: theme.colors.disabled,
        borderRadius: 8,
        padding: 2,
        marginBottom: 12,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentButtonActive: {
        backgroundColor: theme.colors.white,
        ...getShadowStyle(1, theme.colors.black, 0.1, 2, { width: 0, height: 1 }),
    },
    segmentButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    segmentButtonTextActive: {
        color: theme.colors.neutral900,
        fontWeight: 'bold',
    },
    intervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    intervalLabel: {
        fontSize: 14,
        color: theme.colors.neutral700,
    },
    intervalInput: {
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        width: 60,
        textAlign: 'center',
        backgroundColor: theme.colors.white,
        fontSize: 16,
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    dayBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.neutral50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayBubbleActive: {
        backgroundColor: theme.colors.accent,
    },
    dayBubbleText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    dayBubbleTextActive: {
        color: theme.colors.white,
    },
});
