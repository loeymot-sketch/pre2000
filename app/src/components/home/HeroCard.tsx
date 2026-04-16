import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Week } from '../../types';

import { useTranslation } from 'react-i18next';
import { getLocalizedContent } from '../../utils/i18nHelpers';

interface HeroCardProps {
    weekData: Week;
    currentWeekNumber: number;
}

export const HeroCard: React.FC<HeroCardProps> = ({ weekData, currentWeekNumber }) => {
    const { t, i18n } = useTranslation();

    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitleMain}>🍼 {t('common.heroTitle')}</Text>

            <LinearGradient
                colors={['#FFEEE8', '#FFE8F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCardGradient}
            >
                {/* Giant Emoji Centered */}
                <View style={styles.heroEmojiContainer}>
                    <Text style={styles.heroEmoji}>{weekData.emoji}</Text>
                    <Text style={styles.heroWeekText}>
                        {t('common.week')} {currentWeekNumber}
                    </Text>
                </View>

                {/* Size & Weight Mini-Cards */}
                <View style={styles.heroStatsRow}>
                    <View style={styles.heroStatCard}>
                        <Text style={styles.heroStatValue}>{weekData.baby_size_cm} cm</Text>
                        <Text style={styles.heroStatLabel}>{t('common.size')}</Text>
                    </View>
                    <View style={styles.heroStatCard}>
                        <Text style={styles.heroStatValue}>{weekData.baby_weight_g} g</Text>
                        <Text style={styles.heroStatLabel}>{t('common.weight')}</Text>
                    </View>
                </View>

                {/* Comparison Box */}
                <View style={styles.heroComparisonBox}>
                    <Text style={styles.heroComparisonLabel}>{t('onboarding.step4.babySize', { label: '', emoji: '' }).split('{{')[0].trim()}</Text>
                    <Text style={styles.heroComparisonValue}>
                        {getLocalizedContent(weekData, 'baby_size_label', i18n.language, { stripMarkdown: true })}
                    </Text>
                </View>

                {/* Development Text */}
                <Text style={styles.heroDevText}>
                    {getLocalizedContent(weekData, 'baby_dev_text', i18n.language, { stripMarkdown: true })}
                </Text>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: -50,
        paddingTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitleMain: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
        marginStart: 4,
    },
    heroCardGradient: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    heroEmojiContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    heroEmoji: {
        fontSize: 72,
        marginBottom: 8,
    },
    heroWeekText: {
        fontSize: 14,
        color: '#C2185B',
        fontWeight: '600',
    },
    heroStatsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 16,
    },
    heroStatCard: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    heroStatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#C2185B',
    },
    heroStatLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    heroComparisonBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    heroComparisonLabel: {
        fontSize: 12,
        color: '#666',
    },
    heroComparisonValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 4,
    },
    heroDevText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 24,
        textAlign: 'center',
    },
});
