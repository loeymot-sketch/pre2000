import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

interface ErrorMessageProps {
    message?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    const { t } = useTranslation();
    if (!message) return null;

    // Translate the message if it looks like an i18n key (contains dots, no spaces)
    const displayMessage = message.includes('.') && !message.includes(' ')
        ? t(message, message) // fallback to raw message if key not found
        : message;

    return (
        <View style={styles.container}>
            <Text style={styles.text}>⚠️ {displayMessage}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fee',
        borderStartWidth: 4,
        borderLeftColor: '#dc3545',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
        marginTop: theme.spacing.m,
    },
    text: {
        color: '#dc3545',
        fontSize: 14,
        fontWeight: '500',
    },
});
