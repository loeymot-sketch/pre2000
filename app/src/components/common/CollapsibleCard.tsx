import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
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
    accentColor = '#C2185B',
}) => {
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
                                    👁️ Voir plus
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
                        <TouchableOpacity onPress={toggleExpanded} style={styles.seeLessContainer}>
                            <Text style={[styles.seeLess, { color: accentColor }]}>
                                👁️ Voir moins
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
        marginHorizontal: 16,
        marginVertical: 8,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        ...getShadowStyle(3, '#000', 0.1, 4, { width: 0, height: 2 }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    emoji: {
        fontSize: 24,
        marginEnd: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    chevron: {
        fontSize: 16,
        color: '#999',
        marginStart: 8,
    },
    preview: {
        marginTop: 8,
    },
    previewText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#424242',
    },
    seeMoreContainer: {
        marginTop: 8,
        alignItems: 'flex-end',
    },
    seeMore: {
        fontSize: 14,
        fontWeight: '600',
    },
    fullContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    shortDescription: {
        fontSize: 15,
        lineHeight: 22,
        color: '#424242',
        marginBottom: 12,
    },
    bulletsContainer: {
        marginTop: 8,
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    bulletDot: {
        fontSize: 18,
        color: '#C2185B',
        marginEnd: 8,
        marginTop: 2,
    },
    bulletText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#616161',
        flex: 1,
    },
    seeLessContainer: {
        marginTop: 12,
        alignItems: 'flex-end',
    },
    seeLess: {
        fontSize: 14,
        fontWeight: '600',
    },
});
