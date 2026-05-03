/**
 * Skeleton — placeholder animé "pulse" pour les états de chargement.
 *
 * Usage:
 *   <Skeleton width={200} height={20} radius={4} />
 *   <Skeleton.Card />
 *   <Skeleton.Avatar size={48} />
 *   <Skeleton.Line width="80%" />
 *   <Skeleton.Title />
 *
 * Animation: opacity 0.3 → 0.7 → 0.3 en boucle via Animated API native (pas de dep externe).
 * Cleanup: l'animation est arrêtée au unmount.
 * RTL: aucun layout directionnel — le composant est purement visuel.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';

type DimensionValue = number | `${number}%`;

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    radius?: number;
    style?: StyleProp<ViewStyle>;
    /** Désactive l'animation (utile pour snapshot tests). */
    animated?: boolean;
}

interface SkeletonComponent extends React.FC<SkeletonProps> {
    Card: React.FC<{ style?: StyleProp<ViewStyle> }>;
    Avatar: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }>;
    Line: React.FC<{ width?: DimensionValue; style?: StyleProp<ViewStyle> }>;
    Title: React.FC<{ width?: DimensionValue; style?: StyleProp<ViewStyle> }>;
}

const PULSE_MIN = 0.3;
const PULSE_MAX = 0.7;

const SkeletonBase: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 16,
    radius = theme.borderRadius.s,
    style,
    animated = true,
}) => {
    const opacity = useRef(new Animated.Value(PULSE_MIN)).current;

    useEffect(() => {
        if (!animated) {
            opacity.setValue(PULSE_MIN);
            return;
        }
        const sequence = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: PULSE_MAX,
                    duration: theme.animation.durations.slow,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: PULSE_MIN,
                    duration: theme.animation.durations.slow,
                    useNativeDriver: true,
                }),
            ])
        );
        sequence.start();
        return () => sequence.stop();
    }, [animated, opacity]);

    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
                styles.base,
                {
                    width: width as ViewStyle['width'],
                    height: height as ViewStyle['height'],
                    borderRadius: radius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

const SkeletonCard: SkeletonComponent['Card'] = ({ style }) => (
    <View style={[styles.card, style]}>
        <SkeletonBase width="40%" height={14} />
        <View style={styles.cardSpacer} />
        <SkeletonBase width="100%" height={12} />
        <View style={styles.cardSpacerSm} />
        <SkeletonBase width="85%" height={12} />
        <View style={styles.cardSpacerSm} />
        <SkeletonBase width="60%" height={12} />
    </View>
);

const SkeletonAvatar: SkeletonComponent['Avatar'] = ({ size = 48, style }) => (
    <SkeletonBase width={size} height={size} radius={size / 2} style={style} />
);

const SkeletonLine: SkeletonComponent['Line'] = ({ width = '100%', style }) => (
    <SkeletonBase width={width} height={12} radius={4} style={style} />
);

const SkeletonTitle: SkeletonComponent['Title'] = ({ width = '60%', style }) => (
    <SkeletonBase width={width} height={22} radius={6} style={style} />
);

export const Skeleton = SkeletonBase as SkeletonComponent;
Skeleton.Card = SkeletonCard;
Skeleton.Avatar = SkeletonAvatar;
Skeleton.Line = SkeletonLine;
Skeleton.Title = SkeletonTitle;

const styles = StyleSheet.create({
    base: {
        backgroundColor: theme.colors.borderLight,
    },
    card: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.card,
        padding: theme.spacing.m,
        marginVertical: theme.spacing.s,
        ...theme.shadows.sm,
    },
    cardSpacer: {
        height: theme.spacing.m,
    },
    cardSpacerSm: {
        height: theme.spacing.s,
    },
});
