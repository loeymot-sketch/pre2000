import React from 'react';
import { StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RemindersTab } from './reminders/RemindersTab';
import { TasksTab } from './reminders/TasksTab';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

const Tab = createMaterialTopTabNavigator();

/**
 * RemindersScreen - V1.2 Feature
 * Full reminders and tasks management with local notifications
 * Refactored to use split components
 */
export const RemindersScreen = () => {
    useScreenAnalytics('RemindersScreen');
    const { t } = useTranslation();
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: '#999',
                tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
                tabBarStyle: { backgroundColor: '#FFF' },
                tabBarIndicatorStyle: { backgroundColor: '#C2185B' },
            }}
        >
            <Tab.Screen
                name="RemindersTab"
                component={RemindersTab}
                options={{ tabBarLabel: t('common.screen.remindersAlerts') }}
            />
            <Tab.Screen
                name="TasksTab"
                component={TasksTab}
                options={{ tabBarLabel: t('common.screen.remindersTasks') }}
            />
        </Tab.Navigator>
    );
};
