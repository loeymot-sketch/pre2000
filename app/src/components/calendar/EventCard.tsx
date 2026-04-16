import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../../utils/i18nHelpers';
import { CombinedEvent } from '../../types';
import { theme } from '../../theme';
import { getShadowStyle } from '../../utils/styleUtils';

interface EventCardProps {
    event: CombinedEvent;
    onEdit?: () => void;
    onDelete?: () => void;
    onPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onEdit, onDelete, onPress }) => {
    const isUserEvent = event.source === 'user';
    const { t, i18n } = useTranslation();
    const dateLocale = getDateLocale(i18n.language);

    return (
        <View style={[styles.card, isUserEvent && styles.userEventCard]}>
            <View style={[styles.priorityIndicator, { backgroundColor: isUserEvent ? '#6B46C1' : event.priorityColor }]} />

            <TouchableOpacity
                style={styles.content}
                onPress={onPress}
                activeOpacity={0.7}
                disabled={!onPress}
            >
                {/* Header Row */}
                <View style={styles.header}>
                    <View style={styles.iconBadge}>
                        <Text style={styles.iconText}>{isUserEvent ? '📝' : '📅'}</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
                </View>

                {/* Date & Time Row */}
                <View style={styles.dateTimeRow}>
                    <View style={styles.timeBadge}>
                        <Text style={styles.timeText}>
                            {format(event.date, 'HH:mm', { locale: dateLocale })}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>
                        {format(event.date, 'EEEE dd MMM', { locale: dateLocale })}
                    </Text>
                </View>

                {/* Location (for user events) */}
                {isUserEvent && event.location && (
                    <View style={styles.locationRow}>
                        <Text style={styles.locationIcon}>📍</Text>
                        <Text style={styles.locationText} numberOfLines={1}>
                            {event.location}
                        </Text>
                    </View>
                )}

                {/* Tags */}
                <View style={styles.tagsContainer}>
                    <View style={[styles.tag, isUserEvent && styles.userTag]}>
                        <Text style={[styles.tagText, isUserEvent && styles.userTagText]}>
                            {isUserEvent ? t('calendar.myAppointment') : event.type}
                        </Text>
                    </View>
                    {event.importance && !isUserEvent && (
                        <View style={[styles.tag, { backgroundColor: event.priorityColor + '20' }]}>
                            <Text style={[styles.tagText, { color: event.priorityColor }]}>
                                {event.importance}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Description or Notes */}
                {event.description && !isUserEvent && (
                    <Text style={styles.description} numberOfLines={2}>
                        {event.description}
                    </Text>
                )}

                {event.notes && isUserEvent && (
                    <Text style={styles.notes} numberOfLines={2}>
                        💬 {event.notes}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Action Buttons for User Events */}
            {isUserEvent && (
                <View style={styles.actionsContainer}>
                    {onEdit && (
                        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                            <Text style={styles.actionIcon}>✏️</Text>
                            <Text style={styles.actionLabel}>{t('common.edit')}</Text>
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                            <Text style={styles.actionIcon}>🗑️</Text>
                            <Text style={styles.deleteLabel}>{t('common.delete')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        overflow: 'hidden',
        ...getShadowStyle(2, '#000', 0.1, 2, { width: 0, height: 1 }),
    },
    userEventCard: {
        borderWidth: 1,
        borderColor: '#6B46C120',
        backgroundColor: '#FAFAFA',
    },
    priorityIndicator: {
        height: 4,
    },
    content: {
        padding: theme.spacing.m,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    iconBadge: {
        marginEnd: theme.spacing.xs,
    },
    iconText: {
        fontSize: 20,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600' as const,
        color: theme.colors.text,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
        gap: 10,
    },
    timeBadge: {
        backgroundColor: '#FF6B9D',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dateText: {
        fontSize: 13,
        color: theme.colors.textLight,
        textTransform: 'capitalize',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
        gap: 4,
    },
    locationIcon: {
        fontSize: 12,
    },
    locationText: {
        fontSize: 12,
        color: theme.colors.textLight,
        flex: 1,
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.s,
    },
    tag: {
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
        backgroundColor: theme.colors.secondary,
    },
    userTag: {
        backgroundColor: '#6B46C1' + '20',
    },
    tagText: {
        fontSize: 11,
        color: theme.colors.primary,
        fontWeight: '500' as const,
    },
    userTagText: {
        color: '#6B46C1',
    },
    description: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    notes: {
        fontSize: 13,
        color: theme.colors.textLight,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    actionsContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
        borderEndWidth: 1,
        borderRightColor: '#F0F0F0',
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    actionIcon: {
        fontSize: 14,
    },
    actionLabel: {
        fontSize: 12,
        color: '#6B46C1',
        fontWeight: '500',
    },
    deleteLabel: {
        fontSize: 12,
        color: '#E53935',
        fontWeight: '500',
    },
});

