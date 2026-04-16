import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../theme';
import { getShadowStyle } from '../../utils/styleUtils';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    return (
        <View style={[styles.card, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginVertical: theme.spacing.s,
        ...getShadowStyle(2, theme.colors.text, 0.05, 4, { width: 0, height: 2 }),
    },
});
