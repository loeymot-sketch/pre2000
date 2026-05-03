import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { styles } from '../../screens/CalendarScreen.styles';

type CalendarView = 'week' | 'month';

interface CalendarHeaderProps {
    monthLabel: string;
    weekLabel: string;
    calendarView: CalendarView;
    isRTL: boolean;
    showSuggestions: boolean;
    suggestionsThisWeekCount: number;
    suggestionsThisMonthCount: number;
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onSelectWeekView: () => void;
    onSelectMonthView: () => void;
    onToggleSuggestions: () => void;
    onPressToday: () => void;
    t: (key: string, options?: any) => string;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    monthLabel,
    weekLabel,
    calendarView,
    isRTL,
    showSuggestions,
    suggestionsThisWeekCount,
    suggestionsThisMonthCount,
    onPrevWeek,
    onNextWeek,
    onSelectWeekView,
    onSelectMonthView,
    onToggleSuggestions,
    onPressToday,
    t,
}) => {
    // RTL: swap chevrons so navigation stays intuitive (prev=right, next=left)
    const prevIcon = isRTL ? 'chevron-forward' : 'chevron-back';
    const nextIcon = isRTL ? 'chevron-back' : 'chevron-forward';

    return (
        <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent, theme.colors.deepPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
            <View style={[styles.headerTop, isRTL && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity
                    onPress={isRTL ? onNextWeek : onPrevWeek}
                    style={styles.navButton}
                    accessibilityLabel={t('a11y.previousWeek')}
                    accessibilityRole="button"
                >
                    <Ionicons name={prevIcon as any} size={24} color={theme.colors.white} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, isRTL && { textAlign: 'center' }]}>
                        {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                    </Text>
                    <Text style={styles.headerSubtitle}>{weekLabel}</Text>
                </View>

                <TouchableOpacity
                    onPress={isRTL ? onPrevWeek : onNextWeek}
                    style={styles.navButton}
                    accessibilityLabel={t('a11y.nextWeek')}
                    accessibilityRole="button"
                >
                    <Ionicons name={nextIcon as any} size={24} color={theme.colors.white} />
                </TouchableOpacity>
            </View>

            <View style={styles.viewSelector}>
                <View style={styles.selectorGroup}>
                    <TouchableOpacity
                        style={[styles.selectorButton, calendarView === 'week' && styles.selectorButtonActive]}
                        onPress={onSelectWeekView}
                        accessibilityRole="button"
                        accessibilityLabel={t('calendar.week')}
                        accessibilityState={{ selected: calendarView === 'week' }}
                    >
                        <Text style={[styles.selectorText, calendarView === 'week' && styles.selectorTextActive]}>
                            {t('calendar.week')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.selectorButton, calendarView === 'month' && styles.selectorButtonActive]}
                        onPress={onSelectMonthView}
                        accessibilityRole="button"
                        accessibilityLabel={t('calendar.month')}
                        accessibilityState={{ selected: calendarView === 'month' }}
                    >
                        <Text style={[styles.selectorText, calendarView === 'month' && styles.selectorTextActive]}>
                            {t('calendar.month')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.suggestionBadge}
                    onPress={onToggleSuggestions}
                    accessibilityRole="button"
                    accessibilityLabel={t('calendar.suggestions')}
                    accessibilityState={{ expanded: showSuggestions }}
                >
                    <Ionicons name="bulb" size={16} color={theme.colors.white} style={{ marginEnd: 4 }} />
                    <Text style={styles.suggestionText}>
                        {calendarView === 'month'
                            ? (suggestionsThisMonthCount > 0 ? t('calendar.suggestionsCount', { count: suggestionsThisMonthCount }) : t('calendar.suggestions'))
                            : (suggestionsThisWeekCount > 0 ? t('calendar.suggestionsCount', { count: suggestionsThisWeekCount }) : t('calendar.suggestions'))
                        }
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.todayButton}
                onPress={onPressToday}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.today')}
            >
                <Text style={styles.todayButtonText}>{t('calendar.today')}</Text>
            </TouchableOpacity>
        </LinearGradient>
    );
};
