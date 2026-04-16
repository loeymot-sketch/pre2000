import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Switch, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { HydrationData, loadHydrationData, addIntake, saveHydrationData } from '../../services/hydrationService';
import { getShadowStyle } from '../../utils/styleUtils';

export const HydrationCard = () => {
    const { t } = useTranslation();
    const [data, setData] = useState<HydrationData | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [tempGoal, setTempGoal] = useState('3000');
    const [tempFreq, setTempFreq] = useState('8');
    const [fillAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (data) {
            const progress = Math.min(data.currentIntake / data.dailyGoal, 1);
            Animated.timing(fillAnim, {
                toValue: progress,
                duration: 1000,
                useNativeDriver: false,
            }).start();
        }
    }, [data]);

    const loadData = async () => {
        const d = await loadHydrationData();
        setData(d);
        setTempGoal(d.dailyGoal.toString());
        setTempFreq(d.reminderFrequency.toString());
    };

    const handleAddWater = async () => {
        if (!data) return;
        const newData = await addIntake(250); // Add 250ml
        setData(newData);
    };

    const handleSaveSettings = async () => {
        if (!data) return;
        const newData = {
            ...data,
            dailyGoal: parseInt(tempGoal) || 3000,
            reminderFrequency: parseInt(tempFreq) || 8,
        };
        await saveHydrationData(newData);
        setData(newData);
        setShowSettings(false);
    };

    if (!data) return null;

    const percentage = Math.round((data.currentIntake / data.dailyGoal) * 100);
    const widthInterpolated = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    // Theme Colors (Pink/Peach)
    const cardGradient = ['#FFF0F5', '#FFE4E1'] as const; // LavenderBlush to MistyRose
    const progressGradient = ['#FF80AB', '#FF4081'] as const; // Pink Accent
    const buttonGradient = ['#FF6B9D', '#EC407A'] as const; // Primary Pink
    const iconColor = '#D81B60';
    const textColor = '#880E4F';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                {/* Header with Settings */}
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.emoji}>💧</Text>
                        </View>
                        <View>
                            <Text style={styles.title}>{t('reminders.hydration.title')}</Text>
                            <Text style={styles.subtitle}>{t('reminders.hydration.subtitle')}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={styles.settingsButton}
                    >
                        <Ionicons name="settings-outline" size={20} color={iconColor} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {/* Main Stats Row */}
                    <View style={styles.statsRow}>
                        <View>
                            <Text style={styles.amountLarge}>
                                {(data.currentIntake / 1000).toFixed(2)}
                                <Text style={styles.unit}>L</Text>
                            </Text>
                            <Text style={styles.goalText}>
                                sur {(data.dailyGoal / 1000).toFixed(1)}L
                            </Text>
                        </View>
                        <View style={styles.percentageContainer}>
                            <Text style={styles.percentage}>{percentage}%</Text>
                        </View>
                    </View>

                    {/* Premium Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBg}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    { width: widthInterpolated }
                                ]}
                            >
                                <LinearGradient
                                    colors={progressGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ flex: 1 }}
                                />
                            </Animated.View>
                        </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddWater}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={buttonGradient}
                            style={styles.addButtonGradient}
                        >
                            <View style={styles.addIconCircle}>
                                <Ionicons name="add" size={20} color="#C2185B" />
                            </View>
                            <Text style={styles.addButtonText}>{t('reminders.hydration.addWater')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('reminders.hydration.settingsTitle')}</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)}>
                                <Ionicons name="close" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('reminders.hydration.dailyGoalInput')}</Text>
                            <TextInput
                                style={styles.input}
                                value={tempGoal}
                                onChangeText={setTempGoal}
                                keyboardType="numeric"
                                placeholder="3000"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('reminders.hydration.remindersPerDay')}</Text>
                            <TextInput
                                style={styles.input}
                                value={tempFreq}
                                onChangeText={setTempFreq}
                                keyboardType="numeric"
                                placeholder="8"
                            />
                            <Text style={styles.hint}>{t('reminders.hydration.remindersTimeRange')}</Text>
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>{t('reminders.hydration.enableReminders')}</Text>
                            <Switch
                                value={data.reminderEnabled}
                                onValueChange={async (val) => {
                                    const newData = { ...data, reminderEnabled: val };
                                    await saveHydrationData(newData);
                                    setData(newData);
                                }}
                                trackColor={{ false: '#ccc', true: '#FF4081' }}
                            />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                            <Text style={styles.saveButtonText}>{t('reminders.hydration.save')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        borderRadius: 24,
        ...getShadowStyle(8, '#D81B60', 0.15, 12, { width: 0, height: 4 }),
    },
    card: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FFC1E3',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
        ...getShadowStyle(2, '#D81B60', 0.1, 4, { width: 0, height: 2 }),
    },
    emoji: {
        fontSize: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#880E4F',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: '#AD1457',
        fontWeight: '500',
    },
    settingsButton: {
        padding: 4,
    },
    content: {
        gap: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 4,
    },
    amountLarge: {
        fontSize: 32,
        fontWeight: '800',
        color: '#C2185B',
        lineHeight: 38,
    },
    unit: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E91E63',
    },
    goalText: {
        fontSize: 13,
        color: '#AD1457',
        fontWeight: '500',
        marginTop: 2,
    },
    percentageContainer: {
        backgroundColor: '#FCE4EC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    percentage: {
        fontSize: 16,
        fontWeight: '700',
        color: '#C2185B',
    },
    progressBarContainer: {
        height: 16,
        backgroundColor: '#FFF',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F8BBD0',
    },
    progressBarBg: {
        flex: 1,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 8,
        overflow: 'hidden',
    },
    addButton: {
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
        ...getShadowStyle(4, '#D81B60', 0.2, 8, { width: 0, height: 4 }),
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    addIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        ...getShadowStyle(10, '#000', 0.15, 20, { width: 0, height: 8 }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#880E4F',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#AD1457',
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#F8BBD0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#FFF0F5',
        color: '#880E4F',
    },
    hint: {
        fontSize: 12,
        color: '#F48FB1',
        marginTop: 6,
        marginStart: 4,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        marginTop: 8,
    },
    saveButton: {
        backgroundColor: '#EC407A',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#EC407A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
