import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../../theme';
import { styles } from '../../screens/WeightTrackerScreen.styles';
import type { Trend, SmartSuggestion } from '../../services/weightIntelligence';

interface WeightIntelligenceCardProps {
    hasValidData: boolean;
    historyCount: number;
    trimesterMessage: string | null;
    trend: Trend | null;
    suggestions: SmartSuggestion[];
    t: (key: string, options?: any) => string;
}

export const WeightIntelligenceCard: React.FC<WeightIntelligenceCardProps> = ({
    hasValidData,
    historyCount,
    trimesterMessage,
    trend,
    suggestions,
    t,
}) => {
    if (!hasValidData || historyCount < 1) return null;

    const trendSeverityColor: Record<string, string> = {
        normal: theme.colors.green500,
        attention: theme.colors.orange500,
        warning: theme.colors.critical,
    };

    return (
        <View style={styles.intelligenceCard}>
            {/* Trimester message */}
            {trimesterMessage && (
                <View style={styles.trimesterBanner}>
                    <Text style={styles.trimesterBannerText}>
                        {t(trimesterMessage)}
                    </Text>
                </View>
            )}

            {/* Trend badge */}
            {trend && (
                <View style={[
                    styles.trendBadge,
                    { backgroundColor: trendSeverityColor[trend.severity] + '18', borderColor: trendSeverityColor[trend.severity] + '55' }
                ]}>
                    <Text style={[styles.trendText, { color: trendSeverityColor[trend.severity] }]}>
                        {t(trend.messageKey, trend.messageParams)}
                    </Text>
                </View>
            )}

            {/* Smart suggestions from weightIntelligence */}
            {suggestions.length > 0 && (
                <View style={styles.suggestionsGrid}>
                    {suggestions.map((s, i) => (
                        <View key={i} style={styles.suggestionChip}>
                            <Text style={styles.suggestionIcon}>{s.icon}</Text>
                            <Text style={styles.suggestionText}>{t(s.textKey)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};
