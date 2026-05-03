import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { getShadowStyle } from '../../utils/styleUtils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleCardProps {
    title: string;
    emoji: string;
    shortContent: string;
    bullets?: string | string[]; // Can be string with newlines or array
    defaultExpanded?: boolean;
    accentColor?: string;
}

/**
 * CollapsibleCard - Reusable component for expandable content sections
 * Used for Baby Facts, Mom Tips, etc.
 */
export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
    title,
    emoji,
    shortContent,
    bullets = [],
    defaultExpanded = false,
    accentColor = theme.colors.accent,
}) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(defaultExpanded);

    // Parse bullets if it's a string (newline separated)
    const bulletsArray: string[] = typeof bullets === 'string'
        ? bullets.split('\n').filter(b => b.trim().length > 0)
        : bullets;

    const toggleExpanded = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity
                    onPress={toggleExpanded}
                    activeOpacity={0.7}
                >
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Text style={styles.emoji}>{emoji}</Text>
                            <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
                        </View>
                        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
                    </View>

                    {!expanded && (
                        <View style={styles.preview}>
                            <Text style={styles.previewText} numberOfLines={2}>
                                {shortContent}
                            </Text>
                            <View style={styles.seeMoreContainer}>
                                <Text style={[styles.seeMore, { color: accentColor }]}>
                                    👁️ {t('common.seeMore')}
                                </Text>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>

                {expanded && (
                    <View style={styles.fullContent}>
                        {/* Bullets if provided */}
                        {bulletsArray && bulletsArray.length > 0 && (
                            <View style={styles.bulletsContainer}>
                                {bulletsArray.map((bullet: string, index: number) => (
                                    <View key={index} style={styles.bulletItem}>
                                        <Text style={styles.bulletDot}>•</Text>
                                        <Text style={styles.bulletText}>{bullet}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* See less button */}
                        <TouchableOpacity
                            onPress={toggleExpanded}
                            style={styles.seeLessContainer}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.seeLess')}
                        >
                            <Text style={[styles.seeLess, { color: accentColor }]}>
                                👁️ {t('common.seeLess')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: theme.spacing.m,
        marginVertical: theme.spacing.s,
    },
    card: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        ...getShadowStyle(3, theme.colors.text, 0.1, 4, { width: 0, height: 2 }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    emoji: {
        fontSize: 24,
        marginEnd: theme.spacing.s,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    chevron: {
        fontSize: 16,
        color: theme.colors.textLight,
        marginStart: theme.spacing.s,
    },
    preview: {
        marginTop: theme.spacing.s,
    },
    previewText: {
        fontSize: 15,
        lineHeight: 22,
        color: theme.colors.text,
    },
    seeMoreContainer: {
        marginTop: theme.spacing.s,
        alignItems: 'flex-end',
    },
    seeMore: {
        fontSize: 14,
        fontWeight: '600',
    },
    fullContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
    },
    shortDescription: {
        fontSize: 15,
        lineHeight: 22,
        color: theme.colors.text,
        marginBottom: theme.spacing.s + 4,
    },
    bulletsContainer: {
        marginTop: theme.spacing.s,
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: theme.spacing.s,
        alignItems: 'flex-start',
    },
    bulletDot: {
        fontSize: 18,
        color: theme.colors.accent,
        marginEnd: theme.spacing.s,
        marginTop: 2,
    },
    bulletText: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    seeLessContainer: {
        marginTop: theme.spacing.s + 4,
        alignItems: 'flex-end',
    },
    seeLess: {
        fontSize: 14,
        fontWeight: '600',
    },
});
