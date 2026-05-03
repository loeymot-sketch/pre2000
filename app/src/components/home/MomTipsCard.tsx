import { theme } from '../../theme';
import { createLogger } from '../../utils/logger';
const log = createLogger('MomTipsCard');
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { parseBullets } from '../../utils/textParsers';
import { getShadowStyle } from '../../utils/styleUtils';
import { useTranslation } from 'react-i18next';

interface MomTipsCardProps {
    tips_short?: string;
    tips_bullets?: string;
}

/**
 * MomTipsCard - Displays practical tips for mom for the current week
 * Uses V3 data: mom_tips_short_fr and mom_tips_bullets_fr
 */
export const MomTipsCard: React.FC<MomTipsCardProps> = ({
    tips_short,
    tips_bullets
}) => {
    const { t } = useTranslation();
    log.debug('[MomTipsCard] Rendering with:', {
        has_short: !!tips_short,
        has_bullets: !!tips_bullets,
        bullets_length: tips_bullets?.length || 0,
    });

    // Parse bullet points
    const bulletPoints = parseBullets(tips_bullets);
    log.debug('[MomTipsCard] Parsed bullets:', bulletPoints.length);

    // Don't render if no data
    if (!tips_short && bulletPoints.length === 0) {
        log.debug('[MomTipsCard] No data, skipping render');
        return null;
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.colors.cyan50, theme.colors.sky50, theme.colors.white]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>💖</Text>
                    <Text style={styles.title}>{t('home.momTipsTitle')}</Text>
                </View>

                {/* Short summary */}
                {tips_short && (
                    <Text style={styles.shortText}>{tips_short}</Text>
                )}

                {/* Bullet points */}
                {bulletPoints.length > 0 && (
                    <View style={styles.bulletsContainer}>
                        {bulletPoints.map((tip, index) => (
                            <View key={index} style={styles.bulletRow}>
                                <Text style={styles.bulletDot}>•</Text>
                                <Text style={styles.bulletText}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
        ...getShadowStyle(3, theme.colors.black, 0.1, 4, { width: 0, height: 2 }),
    },
    gradient: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    emoji: {
        fontSize: 28,
        marginEnd: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.cyan600,
        flex: 1,
    },
    shortText: {
        fontSize: 15,
        color: theme.colors.blueGrey900,
        lineHeight: 22,
        marginBottom: 12,
    },
    bulletsContainer: {
        marginTop: 8,
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    bulletDot: {
        fontSize: 16,
        color: theme.colors.lightBlue300,
        marginEnd: 8,
        marginTop: 2,
    },
    bulletText: {
        fontSize: 14,
        color: theme.colors.blueGrey800,
        lineHeight: 20,
        flex: 1,
    },
});
