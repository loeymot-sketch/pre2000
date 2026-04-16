import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { theme } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    style?: ViewStyle;
    loading?: boolean;
    disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    style,
    loading = false,
    disabled = false,
    ...props
}) => {
    const getBackgroundColor = () => {
        if (disabled) return theme.colors.disabled;
        switch (variant) {
            case 'primary': return theme.colors.primary;
            case 'secondary': return theme.colors.secondary;
            case 'outline': return 'transparent';
            default: return theme.colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.colors.white;
        switch (variant) {
            case 'primary': return theme.colors.white;
            case 'secondary': return theme.colors.white;
            case 'outline': return theme.colors.primary;
            default: return theme.colors.white;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && styles.outlineButton,
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={title}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.borderRadius.round,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    text: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
