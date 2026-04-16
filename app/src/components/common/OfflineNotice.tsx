import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { theme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export const OfflineNotice = () => {
    const netInfo = useNetInfo();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    // Don't show on initial load (unknown) or if connected
    if (netInfo.type === 'unknown' || netInfo.isInternetReachable !== false) {
        return null;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.contentContainer}>
                <Text style={styles.text}>
                    {t('offline_title', '📡 Pas de connexion Internet')}
                </Text>
                <Text style={styles.subtext}>
                    {t('offline_message', 'Mode hors-ligne activé. Vos données seront synchronisées ultérieurement.')}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.error,
        width: '100%',
        zIndex: 9999,
        position: 'absolute',
        top: 0,
    },
    contentContainer: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    subtext: {
        color: '#FFFFFF',
        fontSize: 12,
        marginTop: 2,
        textAlign: 'center',
    },
});

