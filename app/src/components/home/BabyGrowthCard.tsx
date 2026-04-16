import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Week } from '../../types';
import { getLocalizedContent } from '../../utils/i18nHelpers';
import { LinearGradient } from 'expo-linear-gradient';
import { getBabyGrowthForWeek } from '../../config/babyGrowthData';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface BabyGrowthCardProps {
    currentWeek: number;
    babyName?: string;
    dueDate?: Date;
    weekData?: Week;
}

export const BabyGrowthCard = React.memo<BabyGrowthCardProps>(({
    currentWeek,
    babyName,
    dueDate,
    weekData,
}) => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // Get baby growth data for current week
    const monthData = getBabyGrowthForWeek(currentWeek);

    // Calculate progression
    const totalWeeks = 40;
    const progressPercent = Math.min((currentWeek / totalWeeks) * 100, 100);
    const dayOfPregnancy = currentWeek * 7;

    // Animation on mount/update
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, [monthData.month]);

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.babyName}>
                    👶 {babyName || t('home.yourBaby')}
                </Text>
                <Text style={styles.monthBadge}>
                    {t('home.month')} {monthData.month}
                </Text>
            </View>

            {/* Image Container avec dégradé */}
            <LinearGradient
                colors={['#FFE5EC', '#FFF0F5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.imageContainer}
            >
                <Image
                    source={monthData.image}
                    style={styles.babyImage}
                    resizeMode="contain"
                />


            </LinearGradient>

            {/* Timeline Info */}
            <View style={[styles.timeline, { justifyContent: 'center' }]}>
                <View style={[styles.timelineItem, { justifyContent: 'center' }]}>
                    <Text style={styles.timelineIcon}>📅</Text>
                    <Text style={styles.timelineText}>
                        {t('home.day')} {dayOfPregnancy}
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <LinearGradient
                        colors={['#FF6B9D', '#FF8FB3']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${progressPercent}%` }]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {progressPercent.toFixed(0)}%
                </Text>
            </View>

            {/* Fun Fact */}
            {monthData.facts && monthData.facts.length > 0 && (
                <View style={styles.factContainer}>
                    <Text style={styles.factIcon}>💡</Text>
                    <Text style={styles.factText} numberOfLines={2}>
                        {t(monthData.facts[0])}
                    </Text>
                </View>
            )}

            {/* CTA Button */}
            <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                    navigation.navigate('BabyEvolution' as never);
                }}
                activeOpacity={0.8}
            >
                <Text style={styles.ctaText}>
                    {t('home.babyEvolution')}
                </Text>
                <Text style={styles.ctaIcon}>→</Text>
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        shadowColor: '#FF6B9D',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    babyName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    monthBadge: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B9D',
        backgroundColor: '#FFE5EC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    imageContainer: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 280,
        position: 'relative',
        marginBottom: 16,
    },
    babyImage: {
        width: width * 0.6,
        height: 240,
    },
    comparisonBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
        alignItems: 'center',
    },
    comparisonEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    comparisonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 2,
    },
    sizeText: {
        fontSize: 11,
        color: '#757575',
    },
    timeline: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#FFF5F7',
        borderRadius: 12,
        marginBottom: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timelineIcon: {
        fontSize: 16,
    },
    timelineText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    timelineDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#FFB6C1',
        opacity: 0.3,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#FFE5EC',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF6B9D',
        minWidth: 45,
        textAlign: 'right',
    },
    factContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF9E6',
        padding: 12,
        borderRadius: 12,
        marginBottom: 14,
        gap: 10,
    },
    factIcon: {
        fontSize: 16,
        marginTop: 2,
    },
    factText: {
        flex: 1,
        fontSize: 13,
        color: '#5D4E37',
        lineHeight: 18,
    },
    ctaButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FF6B9D',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 8,
        shadowColor: '#FF6B9D',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        marginBottom: 12, // Fix: Avoid button cut-off
    },
    ctaText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    ctaIcon: {
        fontSize: 18,
        color: '#FFFFFF',
    },
});
