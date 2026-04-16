import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface SuccessMessageProps {
    message?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => {
    if (!message) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.text}>✓ {message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#d4edda',
        borderStartWidth: 4,
        borderLeftColor: '#28a745',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
        marginTop: theme.spacing.m,
    },
    text: {
        color: '#155724',
        fontSize: 14,
        fontWeight: '500',
    },
});
