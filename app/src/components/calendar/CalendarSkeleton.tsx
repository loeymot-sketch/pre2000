import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { theme } from '../../theme';

/**
 * Skeleton loading component for CalendarScreen
 * Shows shimmer effect while data is loading
 */
export const CalendarSkeleton: React.FC = () => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        );
        shimmer.start();
        return () => shimmer.stop();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const SkeletonBox = ({ style }: { style?: any }) => (
        <Animated.View style={[styles.skeleton, { opacity }, style]} />
    );

    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <SkeletonBox style={styles.headerTitle} />
                <SkeletonBox style={styles.headerSubtitle} />
            </View>

            {/* Week Strip Skeleton */}
            <View style={styles.weekStrip}>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <View key={i} style={styles.dayItem}>
                        <SkeletonBox style={styles.dayName} />
                        <SkeletonBox style={styles.dayNumber} />
                    </View>
                ))}
            </View>

            {/* Events Skeleton */}
            <View style={styles.eventsContainer}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.eventCard}>
                        <SkeletonBox style={styles.eventBar} />
                        <View style={styles.eventContent}>
                            <SkeletonBox style={styles.eventTitle} />
                            <SkeletonBox style={styles.eventDate} />
                            <SkeletonBox style={styles.eventDesc} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },
    skeleton: {
        backgroundColor: theme.colors.disabled,
        borderRadius: 4,
    },
    header: {
        marginBottom: theme.spacing.l,
    },
    headerTitle: {
        width: 200,
        height: 24,
        marginBottom: 8,
    },
    headerSubtitle: {
        width: 150,
        height: 16,
    },
    weekStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        paddingHorizontal: theme.spacing.s,
    },
    dayItem: {
        alignItems: 'center',
        width: 40,
    },
    dayName: {
        width: 24,
        height: 12,
        marginBottom: 6,
    },
    dayNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    eventsContainer: {
        gap: theme.spacing.m,
    },
    eventCard: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    eventBar: {
        height: 4,
        width: '100%',
    },
    eventContent: {
        padding: theme.spacing.m,
        gap: 8,
    },
    eventTitle: {
        width: '70%',
        height: 18,
    },
    eventDate: {
        width: '40%',
        height: 14,
    },
    eventDesc: {
        width: '90%',
        height: 14,
    },
});
