/**
 * Badge — petite pastille de statut (sévérité, BMI, RDV, etc.).
 *
 * Usage:
 *   <Badge variant="success">Normal</Badge>
 *   <Badge variant="warning">Attention</Badge>
 *   <Badge variant="error">Critique</Badge>
 *   <Badge variant="info">Info</Badge>
 *   <Badge variant="neutral">Default</Badge>
 *   <Badge variant="primary" size="small">12</Badge>
 *
 * Implémentation: background = couleur sémantique avec opacité (~14%) ;
 * text = couleur sémantique pleine pour un fort contraste.
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import {
    BadgeSize,
    BadgeVariant,
    getBadgeColors,
    getBadgeSize,
} from './Badge.helpers';

export type { BadgeSize, BadgeVariant } from './Badge.helpers';
export { getBadgeColors, getBadgeSize } from './Badge.helpers';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    /** Override accessibility label (par défaut: contenu textuel). */
    accessibilityLabel?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    size = 'medium',
    style,
    textStyle,
    accessibilityLabel,
}) => {
    const colors = getBadgeColors(variant);
    const dims = getBadgeSize(size);

    return (
        <View
            style={[
                styles.base,
                {
                    backgroundColor: colors.bg,
                    paddingVertical: dims.paddingVertical,
                    paddingHorizontal: dims.paddingHorizontal,
                },
                style,
            ]}
            accessibilityRole="text"
            accessible
            accessibilityLabel={
                accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
            }
        >
            {typeof children === 'string' || typeof children === 'number' ? (
                <Text
                    style={[
                        styles.text,
                        { color: colors.text, fontSize: dims.fontSize },
                        textStyle,
                    ]}
                    numberOfLines={1}
                >
                    {children}
                </Text>
            ) : (
                children
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    base: {
        alignSelf: 'flex-start',
        borderRadius: theme.borderRadius.round,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});
