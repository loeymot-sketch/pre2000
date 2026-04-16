import { createLogger } from '../utils/logger';
const log = createLogger('CalendarScreen');
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../config/firebase'; // FIX: Import auth and db for direct access
import { doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
    loadCalendarTemplates,
    generateAllEvents,
    loadUserEvents,
    getCombinedEventsForWeek,
    deleteUserEvent,
    GeneratedEvent,
    groupEventsByDate,
    getWeekDates,
    getLocalDateKey,
} from '../services/calendarService';
import { UserEvent, CombinedEvent } from '../types';
import { theme } from '../theme';
import { getShadowStyle } from '../utils/styleUtils';
import { EventCard } from '../components/calendar/EventCard';
import { WeeklyStrip } from '../components/calendar/WeeklyStrip';
import { CalendarSkeleton } from '../components/calendar/CalendarSkeleton';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, getDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useDateLocale } from '../hooks/useDateLocale';
import { I18nManager } from 'react-native';
import { getLocalizedContent } from '../utils/i18nHelpers';
import { calculateCurrentWeek } from '../utils/pregnancyCalculator';
import { CalendarScreenNavigationProp } from '../types/navigation';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

type ViewMode = 'suggestions' | 'myEvents' | 'all';
type CalendarView = 'week' | 'month';

export const CalendarScreen = () => {
    useScreenAnalytics('CalendarScreen');
    const { user } = useAuth();
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();
    const dateLocale = useDateLocale();

    // State
    const [currentWeek, setCurrentWeek] = useState(user?.currentWeek || 1);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [calendarView, setCalendarView] = useState<CalendarView>('week');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showScrollIndicator, setShowScrollIndicator] = useState(true);

    // Data
    const [allTemplateEvents, setAllTemplateEvents] = useState<GeneratedEvent[]>([]);
    const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Animation
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web', // Fix for web compatibility
        }).start();
    }, []);

    // Sync currentWeek with user profile when it changes
    // Sync currentWeek with user profile when it changes
    useEffect(() => {
        if (user?.pregnancyStartDate) {
            const today = new Date();
            // FIX: Always default to TODAY on mount/update to prevent jumping back to start date
            setSelectedDate(today);

            // Calculate REAL current week based on Today
            const realCurrentWeek = calculateCurrentWeek(new Date(user.pregnancyStartDate));

            if (realCurrentWeek !== currentWeek) {
                log.debug(`[CalendarScreen] 🔄 Auto-correcting week from ${currentWeek} to ${realCurrentWeek}`);
                setCurrentWeek(realCurrentWeek);
            }
        }
    }, [user?.pregnancyStartDate]);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            // FIX: Stop loading if data is missing
            if (!user?.pregnancyStartDate) {
                log.warn('Missing pregnancyStartDate, stopping load');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                // FIX: Use user.uid from AuthContext (restored from AsyncStorage)
                const effectiveUid = user?.uid;

                if (!effectiveUid) {
                    log.warn('[CalendarScreen] No user UID available, skipping load');
                    setLoading(false);
                    return;
                }

                log.info(`Loading calendar data for user: ${effectiveUid ? 'found' : 'missing'} (week ${user?.currentWeek})`);

                const [templates, uEvents] = await Promise.all([
                    loadCalendarTemplates(),
                    // Only load user events if authenticated (not guest)
                    (!user.isGuest && effectiveUid) ? loadUserEvents(effectiveUid) : Promise.resolve([])
                ]);

                log.info(`Loaded ${templates.length} templates and ${uEvents.length} user events`);

                const generatedEvents = generateAllEvents(templates, new Date(user.pregnancyStartDate));
                setAllTemplateEvents(generatedEvents);
                setUserEvents(uEvents);
            } catch (err) {
                log.error('Error loading calendar data:', err);
                setError(t('common.errorLoadingData'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user?.pregnancyStartDate, user?.uid]);

    // Refresh user events when screen focuses
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (user?.uid && !user.isGuest) {
                loadUserEvents(user.uid).then(setUserEvents);
            }
        });
        return unsubscribe;
    }, [navigation, user?.uid]);

    // Derived Data
    const weekDates = useMemo(() => {
        if (!user?.pregnancyStartDate) return { start: new Date(), end: new Date() };
        return getWeekDates(new Date(user.pregnancyStartDate), currentWeek);
    }, [user?.pregnancyStartDate, currentWeek]);

    const currentWeekEvents = useMemo(() => {
        const events = getCombinedEventsForWeek(allTemplateEvents, userEvents, currentWeek, weekDates.start, weekDates.end);

        // Localize events for display (Week View Suggestions)
        return events.map(e => ({
            ...e,
            title: getLocalizedContent(e, 'title', i18n.language),
            description: getLocalizedContent(e, 'description', i18n.language)
        }));
    }, [allTemplateEvents, userEvents, currentWeek, weekDates, i18n.language]);

    const eventsByDate = useMemo(() => {
        return groupEventsByDate(currentWeekEvents);
    }, [currentWeekEvents]);

    const allEventsByDate = useMemo(() => {
        const grouped: Record<string, CombinedEvent[]> = {};

        // Add template events
        allTemplateEvents.forEach((event) => {
            const dateKey = getLocalDateKey(new Date(event.date));
            if (!grouped[dateKey]) grouped[dateKey] = [];

            // Localize content here
            const localizedTitle = getLocalizedContent(event, 'title', i18n.language);
            const localizedDesc = getLocalizedContent(event, 'description', i18n.language);

            grouped[dateKey].push({
                id: event.id || event.templateId || `template-${event.week}-${event.title}`,
                title: localizedTitle,
                date: new Date(event.date),
                description: localizedDesc,
                type: event.type,
                week: event.week,
                source: 'template' as const,
            });
        });

        // Add user events
        userEvents.forEach((event) => {
            const dateKey = getLocalDateKey(new Date(event.date));
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({
                id: event.event_id,
                title: event.title,
                date: new Date(event.date),
                description: event.notes || '',
                type: event.type,
                week: event.week,
                source: 'user' as const,
            });
        });

        return grouped;
    }, [allTemplateEvents, userEvents, i18n.language]);

    // Count only USER events this week (not suggestions) - use date range for accuracy
    const eventsThisWeekCount = useMemo(() => {
        const { start, end } = weekDates;
        // Count user events that fall within this week's date range
        const count = userEvents.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate >= start && eventDate <= end;
        }).length;
        return count;
    }, [userEvents, weekDates]);

    // Count suggestions for this week
    const suggestionsThisWeekCount = useMemo(() => {
        return currentWeekEvents.filter(e => e.source === 'template').length;
    }, [currentWeekEvents]);

    // Week suggestions (all for the week, not per day)
    const weekSuggestions = useMemo(() => {
        return currentWeekEvents.filter(e => e.source === 'template');
    }, [currentWeekEvents]);

    // Month suggestions - all template events for the selected month
    const monthSuggestions = useMemo(() => {
        const monthKey = format(selectedDate, 'yyyy-MM', { locale: dateLocale });
        const suggestions: CombinedEvent[] = [];

        Object.entries(allEventsByDate).forEach(([dateKey, events]) => {
            if (dateKey.startsWith(monthKey)) {
                events.filter(e => e.source === 'template').forEach(e => suggestions.push(e));
            }
        });

        const uniqueSuggestions = suggestions.reduce((acc, current) => {
            const x = acc.find(item => item.title === current.title);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, [] as CombinedEvent[]);

        return uniqueSuggestions.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [allEventsByDate, selectedDate]);

    const suggestionsThisMonthCount = useMemo(() => {
        return monthSuggestions.length;
    }, [monthSuggestions]);

    const filteredEvents = useMemo(() => {
        const dateKey = getLocalDateKey(selectedDate);
        const dayEvents = (calendarView === 'week' ? eventsByDate : allEventsByDate)[dateKey] || [];

        // ALWAYS show only user events - suggestions are accessed via dedicated button
        return dayEvents.filter(e => e.source === 'user');
    }, [eventsByDate, allEventsByDate, selectedDate, calendarView]);

    const eventCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.keys(calendarView === 'week' ? eventsByDate : allEventsByDate).forEach(date => {
            counts[date] = (calendarView === 'week' ? eventsByDate : allEventsByDate)[date].length;
        });
        return counts;
    }, [eventsByDate, allEventsByDate, calendarView]);

    // Month view data - with proper padding for grid alignment
    const monthDays = useMemo(() => {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start, end });

        // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
        // Convert to Monday-first format (0 = Monday, 6 = Sunday)
        const firstDayOfWeek = getDay(start);
        const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        // Create padding array with null values
        const padding: (Date | null)[] = Array(paddingDays).fill(null);

        return [...padding, ...days];
    }, [selectedDate]);

    // User-only event counts (excluding suggestions)
    const userEventCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        userEvents.forEach(event => {
            const dateKey = getLocalDateKey(new Date(event.date));
            counts[dateKey] = (counts[dateKey] || 0) + 1;
        });
        return counts;
    }, [userEvents]);

    const monthStats = useMemo(() => {
        const monthKey = format(selectedDate, 'yyyy-MM', { locale: dateLocale });
        let totalEvents = 0;
        let userEventCount = 0;
        let suggestionCount = 0;

        Object.keys(allEventsByDate).forEach(dateKey => {
            if (dateKey.startsWith(monthKey)) {
                const events = allEventsByDate[dateKey];
                totalEvents += events.length;
                userEventCount += events.filter(e => e.source === 'user').length;
                suggestionCount += events.filter(e => e.source === 'template').length;
            }
        });

        return { totalEvents, userEventCount, suggestionCount };
    }, [allEventsByDate, selectedDate]);

    // Handlers
    const handlePrevWeek = useCallback(() => {
        if (currentWeek > 1 && user?.pregnancyStartDate) {
            const newWeek = currentWeek - 1;
            setCurrentWeek(newWeek);
            const { start } = getWeekDates(new Date(user.pregnancyStartDate), newWeek);
            setSelectedDate(start);
        }
    }, [currentWeek, user?.pregnancyStartDate]);

    const handleNextWeek = useCallback(() => {
        if (currentWeek < 40 && user?.pregnancyStartDate) {
            const newWeek = currentWeek + 1;
            setCurrentWeek(newWeek);
            const { start } = getWeekDates(new Date(user.pregnancyStartDate), newWeek);
            setSelectedDate(start);
        }
    }, [currentWeek, user?.pregnancyStartDate]);

    const handlePrevMonth = useCallback(() => {
        setSelectedDate(prev => subMonths(prev, 1));
    }, []);

    const handleNextMonth = useCallback(() => {
        setSelectedDate(prev => addMonths(prev, 1));
    }, []);

    const handleToday = useCallback(() => {
        if (user?.currentWeek) {
            setCurrentWeek(user.currentWeek);
            setSelectedDate(new Date());
        }
    }, [user?.currentWeek]);

    const handleEditEvent = useCallback((item: CombinedEvent) => {
        if (item.source === 'user') {
            navigation.navigate('AddAppointment', { event: item });
        }
    }, [navigation]);

    const handleDeleteEvent = async (eventId: string) => {
        // Guest check
        if (user?.isGuest) {
            Alert.alert(t('calendar.guestModeTitle'), t('calendar.guestModeMessage'));
            return;
        }

        log.debug('[CalendarScreen] Deleting event with ID:', eventId);

        // Use window.confirm on web, Alert.alert on native
        const confirmDelete = Platform.OS === 'web'
            ? window.confirm(t('calendar.deleteEventMessage'))
            : await new Promise<boolean>((resolve) => {
                Alert.alert(
                    t('calendar.deleteEventTitle'),
                    t('calendar.deleteEventMessage'),
                    [
                        { text: t('calendar.cancel'), style: "cancel", onPress: () => resolve(false) },
                        { text: t('calendar.delete'), style: "destructive", onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmDelete) {
            log.debug('[CalendarScreen] Delete cancelled');
            return;
        }

        try {
            log.debug('[CalendarScreen] Confirmed delete for:', eventId);
            await deleteUserEvent(eventId);
            log.debug('[CalendarScreen] Delete successful, reloading events...');
            if (user?.uid) {
                const updatedEvents = await loadUserEvents(user.uid);
                setUserEvents(updatedEvents);
                log.debug('[CalendarScreen] Events reloaded:', updatedEvents.length);
            }
        } catch (error) {
            log.error('[CalendarScreen] Delete error:', error);
            if (Platform.OS === 'web') {
                window.alert(t('calendar.cannotDeleteEvent'));
            } else {
                Alert.alert(t('calendar.error'), t('calendar.cannotDeleteEvent'));
            }
        }
    };

    const renderMonthDay = (day: Date | null) => {
        // Empty cell for padding
        if (day === null) {
            return <View style={styles.monthDayEmpty} />;
        }

        const dateKey = getLocalDateKey(day);
        const userEventCount = userEventCounts[dateKey] || 0;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, selectedDate);

        return (
            <TouchableOpacity
                key={day.toISOString()}
                style={[
                    styles.monthDay,
                    isSelected && styles.monthDaySelected,
                    isToday && !isSelected && styles.monthDayToday,
                ]}
                onPress={() => setSelectedDate(day)}
                activeOpacity={0.7}
            >
                <Text
                    style={[
                        styles.monthDayText,
                        !isCurrentMonth && styles.monthDayTextDisabled,
                        isToday && !isSelected && styles.monthDayTextToday,
                    ]}
                >
                    {format(day, 'd')}
                </Text>
                {userEventCount > 0 && (
                    <View style={styles.eventDotSmall} />
                )}
            </TouchableOpacity>
        );
    };

    const renderHeader = () => {
        const isRTL = I18nManager.isRTL;
        const monthLabel = format(selectedDate, 'MMMM yyyy', { locale: dateLocale });
        const weekLabel = t('calendar.weekOfPregnancy', { week: currentWeek });

        // RTL: swap chevrons so navigation stays intuitive (prev=right, next=left)
        const prevIcon = isRTL ? 'chevron-forward' : 'chevron-back';
        const nextIcon = isRTL ? 'chevron-back' : 'chevron-forward';

        return (
            <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent, '#880E4F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={[styles.headerTop, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity
                        onPress={isRTL ? handleNextWeek : handlePrevWeek}
                        style={styles.navButton}
                        accessibilityLabel={t('a11y.previousWeek')}
                        accessibilityRole="button"
                    >
                        <Ionicons name={prevIcon as any} size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, isRTL && { textAlign: 'center' }]}>
                            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                        </Text>
                        <Text style={styles.headerSubtitle}>{weekLabel}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={isRTL ? handlePrevWeek : handleNextWeek}
                        style={styles.navButton}
                        accessibilityLabel={t('a11y.nextWeek')}
                        accessibilityRole="button"
                    >
                        <Ionicons name={nextIcon as any} size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.viewSelector}>
                    <View style={styles.selectorGroup}>
                        <TouchableOpacity
                            style={[styles.selectorButton, calendarView === 'week' && styles.selectorButtonActive]}
                            onPress={() => setCalendarView('week')}
                        >
                            <Text style={[styles.selectorText, calendarView === 'week' && styles.selectorTextActive]}>
                                {t('calendar.week')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectorButton, calendarView === 'month' && styles.selectorButtonActive]}
                            onPress={() => setCalendarView('month')}
                        >
                            <Text style={[styles.selectorText, calendarView === 'month' && styles.selectorTextActive]}>
                                {t('calendar.month')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.suggestionBadge}
                        onPress={() => setShowSuggestions(prev => !prev)}
                        accessibilityRole="button"
                    >
                        <Ionicons name="bulb" size={16} color="#FFF" style={{ marginEnd: 4 }} />
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
                    onPress={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        if (user?.currentWeek) {
                            setCurrentWeek(user.currentWeek);
                        }
                    }}
                    accessibilityRole="button"
                >
                    <Text style={styles.todayButtonText}>{t('calendar.today')}</Text>
                </TouchableOpacity>
            </LinearGradient>
        );
    };
    const renderMonthStats = () => (
        <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 {t('calendar.thisMonth')}</Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{monthStats.totalEvents}</Text>
                    <Text style={styles.statLabel}>{t('calendar.total')}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.primary }]}>{monthStats.userEventCount}</Text>
                    <Text style={styles.statLabel}>{t('calendar.myAppointments')}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.info }]}>{monthStats.suggestionCount}</Text>
                    <Text style={styles.statLabel}>{t('calendar.suggestions')}</Text>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return <CalendarSkeleton />;
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
                <Text style={styles.loadingText}>{error}</Text>
                <TouchableOpacity
                    style={{ marginTop: 16, padding: 14, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }}
                    onPress={() => {
                        setError(null);
                        setLoading(true);
                    }}
                >
                    <Text style={{ color: theme.colors.white, fontWeight: '600' }}>{t('common.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    data={filteredEvents}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <>
                            {calendarView === 'month' ? (
                                <>
                                    {renderMonthStats()}
                                    <View style={styles.monthGrid}>
                                        <View style={styles.weekDaysHeader}>
                                            {[t('calendar.weekDays.monday'), t('calendar.weekDays.tuesday'), t('calendar.weekDays.wednesday'), t('calendar.weekDays.thursday'), t('calendar.weekDays.friday'), t('calendar.weekDays.saturday'), t('calendar.weekDays.sunday')].map((day, index) => (
                                                <Text key={`day-${index}`} style={styles.weekDayLabel}>{day}</Text>
                                            ))}
                                        </View>
                                        <View style={styles.monthDaysGrid}>
                                            {monthDays.map((day, index) =>
                                                <View key={`month-day-${index}`} style={styles.monthDayWrapper}>
                                                    {renderMonthDay(day)}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <WeeklyStrip
                                    weekStartDate={weekDates.start}
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                    userEventCounts={userEventCounts}
                                    rdvWeekCount={eventsThisWeekCount}
                                />
                            )}

                            {/* Suggestions Section (Collapsible) - Moved inside ListHeaderComponent */}
                            {showSuggestions && (
                                (calendarView === 'week' && weekSuggestions.length > 0) ||
                                (calendarView === 'month' && monthSuggestions.length > 0)
                            ) && (
                                    <View style={styles.suggestionsSection}>
                                        <View style={styles.suggestionsSectionHeader}>
                                            <Text style={styles.suggestionsSectionTitle}>
                                                💡 {calendarView === 'week' ? t('calendar.suggestionsForWeek') : t('calendar.suggestionsForMonth')}
                                            </Text>
                                            <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                                                <Text style={styles.suggestionsSectionClose}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.suggestionsContainer}>
                                            {/* Use View instead of ScrollView here to avoid nested virtualization error */}
                                            <View style={styles.suggestionsScrollContent}>
                                                {(calendarView === 'week' ? weekSuggestions : monthSuggestions).map(suggestion => (
                                                    <View key={suggestion.id} style={styles.suggestionItem}>
                                                        <Text style={styles.suggestionItemTitle}>{suggestion.title}</Text>
                                                        {suggestion.description && (
                                                            <Text style={styles.suggestionItemDesc} numberOfLines={2}>{suggestion.description}</Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                )}
                        </>
                    }
                    renderItem={({ item }) => (
                        <EventCard
                            event={item}
                            onEdit={item.source === 'user' ? () => handleEditEvent(item) : undefined}
                            onDelete={item.source === 'user' ? () => handleDeleteEvent(item.id) : undefined}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text style={styles.emptyStateText}>{t('calendar.noEventsForDay')}</Text>
                            <Text style={styles.emptyStateSubtext}>{t('calendar.enjoyRest')}</Text>
                            <TouchableOpacity
                                style={[styles.todayButton, { marginTop: 16, backgroundColor: theme.colors.primary, paddingHorizontal: 24 }]}
                                onPress={() => navigation.navigate('AddAppointment', { selectedDate: selectedDate.toISOString() })}
                            >
                                <Text style={[styles.todayButtonText, { fontSize: 14 }]}>{t('calendar.addAppointment')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            </Animated.View>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddAppointment', { selectedDate: selectedDate.toISOString() })}
            >
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.accent]}
                    style={styles.fabGradient}
                >
                    <Text style={styles.fabIcon}>+</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
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
        color: theme.colors.textSecondary,
        fontSize: 15,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    headerContent: {},
    monthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    navButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthContainer: {
        alignItems: 'center',
        flex: 1,
    },
    monthText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.white,
        textTransform: 'capitalize',
    },
    weekText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        marginTop: 4,
    },
    rdvInfoText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4,
    },
    navArrow: {
        fontSize: 32,
        color: theme.colors.white,
        fontWeight: 'bold',
    },
    disabledArrow: {
        opacity: 0.3,
    },
    headerActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    rdvCountBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    rdvCountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    rdvCountLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    weekBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    weekBadgeText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    suggestionsButton: {
        backgroundColor: 'rgba(255, 193, 7, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.xl,
    },
    suggestionsButtonText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '600',
    },
    suggestionsSection: {
        backgroundColor: '#FFF8E1',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: theme.borderRadius.m,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    suggestionsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    suggestionsSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F57C00',
    },
    suggestionsSectionClose: {
        fontSize: 18,
        color: theme.colors.textLight,
        padding: 4,
    },
    suggestionsContainer: {
        position: 'relative',
    },
    suggestionsScrollView: {
        maxHeight: 300,
    },
    suggestionsScrollContent: {
        paddingBottom: 30,
    },
    scrollIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(255, 193, 7, 0.85)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        alignItems: 'center',
    },
    scrollIndicatorText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#F57C00',
        textAlign: 'center',
    },
    suggestionItem: {
        backgroundColor: theme.colors.white,
        padding: 10,
        borderRadius: theme.borderRadius.s,
        marginBottom: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#FFC107',
    },
    suggestionItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    suggestionItemDesc: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    suggestionItemDate: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    todayButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    todayButtonText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    viewToggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: theme.borderRadius.xl,
        padding: 2,
    },
    viewToggle: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 18,
    },
    viewToggleActive: {
        backgroundColor: theme.colors.white,
    },
    viewToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    viewToggleTextActive: {
        color: theme.colors.accent,
    },
    statsCard: {
        backgroundColor: theme.colors.white,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: theme.borderRadius.l,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 4,
    },
    monthGrid: {
        backgroundColor: theme.colors.white,
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: theme.borderRadius.l,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    weekDaysHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekDayLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textLight,
    },
    monthDaysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    monthDayWrapper: {
        width: '14.28%',
        aspectRatio: 1,
    },
    monthDay: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.s,
    },
    monthDaySelected: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: '#FFF0F5',
    },
    monthDayToday: {
        backgroundColor: '#E3F2FD',
    },
    monthDayText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    monthDayTextSelected: {
        color: theme.colors.accent,
        fontWeight: 'bold',
    },
    monthDayTextToday: {
        color: theme.colors.info,
        fontWeight: 'bold',
    },
    monthDayTextDisabled: {
        color: '#CCCCCC',
    },
    monthDayEmpty: {
        width: '14.28%',
        aspectRatio: 1,
    },
    eventDotSmall: {
        position: 'absolute',
        bottom: 4,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
    },
    eventBadge: {
        position: 'absolute',
        bottom: 2,
        backgroundColor: theme.colors.primary,
        minWidth: 16,
        height: 16,
        borderRadius: theme.borderRadius.s,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    eventBadgeSelected: {
        backgroundColor: theme.colors.white,
    },
    eventBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    eventBadgeTextSelected: {
        color: theme.colors.primary,
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
        position: 'absolute',
        bottom: 4,
    },
    eventDotSelected: {
        backgroundColor: theme.colors.white,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.disabled,
    },
    activeFilterChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    activeFilterText: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        padding: 24,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        ...getShadowStyle(8, '#000', 0.3, 8, { width: 0, height: 4 }),
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabIcon: {
        fontSize: 32,
        color: theme.colors.white,
        fontWeight: '300',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.white,
        textTransform: 'capitalize',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 2,
    },
    viewSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectorGroup: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: theme.borderRadius.xl,
        padding: 2,
    },
    selectorButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
    },
    selectorButtonActive: {
        backgroundColor: theme.colors.white,
    },
    selectorText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    selectorTextActive: {
        color: theme.colors.accent,
    },
    suggestionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 193, 7, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.l,
    },
    suggestionText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
});
