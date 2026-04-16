import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export const OrganizationGrid: React.FC = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();

    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitleMain}>📝 {t('common.organization')}</Text>

            <View style={styles.toolsGrid}>
                {/* Rappels Card */}
                <TouchableOpacity
                    style={styles.toolCard}
                    onPress={() => navigation.navigate('Rappels')}
                >
                    <LinearGradient
                        colors={['#E3F2FD', '#BBDEFB']}
                        style={styles.toolIconContainer}
                    >
                        <Text style={styles.toolEmoji}>🔔</Text>
                    </LinearGradient>
                    <Text style={styles.toolTitle}>{t('common.reminders')}</Text>
                    <Text style={styles.toolSubtitle}>{t('home.medicines')}</Text>
                </TouchableOpacity>

                {/* Calendrier Card */}
                <TouchableOpacity
                    style={styles.toolCard}
                    onPress={() => navigation.navigate('Calendrier')}
                >
                    <LinearGradient
                        colors={['#E8F5E9', '#C8E6C9']}
                        style={styles.toolIconContainer}
                    >
                        <Text style={styles.toolEmoji}>📅</Text>
                    </LinearGradient>
                    <Text style={styles.toolTitle}>{t('home.calendar')}</Text>
                    <Text style={styles.toolSubtitle}>{t('home.myAppointments')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitleMain: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
        marginStart: 4,
    },
    toolsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    toolCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    toolIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    toolEmoji: {
        fontSize: 28,
    },
    toolTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    toolSubtitle: {
        fontSize: 12,
        color: '#888',
    },
});
