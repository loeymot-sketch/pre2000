import { theme } from '../../theme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getShadowStyle } from '../../utils/styleUtils';
import { Week } from '../../types';
import { useTranslation } from 'react-i18next';
import { getLocalizedContent } from '../../utils/i18nHelpers';

interface WeekInfoSectionProps {
    weekData: Week;
}

export const WeekInfoSection: React.FC<WeekInfoSectionProps> = ({ weekData }) => {
    const { t, i18n } = useTranslation();

    const momBodyText = getLocalizedContent(weekData, 'mom_body_text', i18n.language, { stripMarkdown: true });
    const warningsText = getLocalizedContent(weekData, 'warnings_text', i18n.language, { stripMarkdown: true });

    return (
        <View style={styles.container}>
            {/* Body Changes Section */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitleMain}>🫄 {t('common.bodyChanges')}</Text>
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        {momBodyText}
                    </Text>
                </View>
            </View>

            {/* Warnings Section */}
            {warningsText ? (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitleMain}>⚠️ {t('common.toMonitor')}</Text>
                    <LinearGradient
                        colors={[theme.colors.surfaceOrangeTint, theme.colors.amber100]}
                        style={styles.alertCard}
                    >
                        <Text style={styles.alertText}>
                            {warningsText}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
    },
    sectionContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitleMain: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.neutral900,
        marginBottom: 12,
        marginStart: 4,
    },
    infoCard: {
        backgroundColor: theme.colors.white,
        borderRadius: 16,
        padding: 16,
        ...getShadowStyle(3, theme.colors.black, 0.06, 8, { width: 0, height: 2 }),
    },
    infoText: {
        fontSize: 15,
        color: theme.colors.neutral800,
        lineHeight: 24,
    },
    alertCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.warning,
    },
    alertText: {
        fontSize: 15,
        color: theme.colors.orange900,
        lineHeight: 24,
    },
});
