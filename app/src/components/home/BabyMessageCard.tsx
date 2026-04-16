import { createLogger } from '../../utils/logger';
const log = createLogger('BabyMessageCard');
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getShadowStyle } from '../../utils/styleUtils';
import { useTranslation } from 'react-i18next';

interface BabyMessageCardProps {
    message: string;
    week: number;
    day: number;
}

/**
 * BabyMessageCard - Displays daily message from baby to mom
 * Feature: Quick Win #1 - High emotional impact
 */
export const BabyMessageCard: React.FC<BabyMessageCardProps> = ({
    message,
    week,
    day
}) => {
    const { t } = useTranslation();
    log.debug('[BabyMessageCard] Rendering for week', week, 'day', day);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFE5F1', '#FFF0F5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.header}>
                    <Text style={styles.emoji}>👶</Text>
                    <Text style={styles.title}>{t('home.babyMessage')}</Text>
                </View>

                <Text style={styles.message}>{message}</Text>

                <Text style={styles.footer}>
                    {t('home.weekDay', { week, day })}
                </Text>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // Removed margins to align with other cards in the section
    },
    gradient: {
        borderRadius: 16,
        padding: 20,
        borderStartWidth: 4,
        borderStartColor: '#FF69B4', // Hot Pink accent
        ...getShadowStyle(4, '#FF69B4', 0.1, 8, { width: 0, height: 4 }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    emoji: {
        fontSize: 24,
        marginEnd: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#C2185B',
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        color: '#424242',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    footer: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#757575',
        textAlign: 'right',
    },
});
