import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { RtlAwareChevron } from '../common/RtlAwareChevron';
import { useTranslation } from 'react-i18next';

interface WeekHeaderProps {
    weekNumber: number;
    onPrevious: () => void;
    onNext: () => void;
    canGoPrevious: boolean;
    canGoNext: boolean;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({
    weekNumber,
    onPrevious,
    onNext,
    canGoPrevious,
    canGoNext,
}) => {
    const { t } = useTranslation();
    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={onPrevious}
                    disabled={!canGoPrevious}
                    style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
                >
                    <RtlAwareChevron
                        direction="back"
                        variant="caret"
                        size={24}
                        color={canGoPrevious ? theme.colors.primary : theme.colors.textLight}
                    />
                </TouchableOpacity>

                <View style={styles.weekInfo}>
                    <Text style={styles.weekTitle}>{t('common.weekLabel', { number: weekNumber })}</Text>
                </View>

                <TouchableOpacity
                    onPress={onNext}
                    disabled={!canGoNext}
                    style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
                >
                    <RtlAwareChevron
                        direction="forward"
                        variant="caret"
                        size={24}
                        color={canGoNext ? theme.colors.primary : theme.colors.textLight}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: theme.colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.l,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginTop: theme.spacing.m,
    },
    navButton: {
        padding: theme.spacing.s,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    weekInfo: {
        flex: 1,
        alignItems: 'center',
    },
    weekTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
});
