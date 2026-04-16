import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface TagProps {
    label: string;
    color?: string; // Optional override
}

export const Tag: React.FC<TagProps> = ({ label, color }) => {
    return (
        <View style={[styles.container, { backgroundColor: color || theme.colors.secondary }]}>
            <Text style={styles.text}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
        alignSelf: 'flex-start',
        marginEnd: theme.spacing.xs,
    },
    text: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
});
