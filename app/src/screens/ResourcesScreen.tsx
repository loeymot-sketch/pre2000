import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ArticlesListScreen } from './ArticlesListScreen';
import { SupplementsListScreen } from './SupplementsListScreen';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

const Tab = createMaterialTopTabNavigator();

export const ResourcesScreen = () => {
    useScreenAnalytics('ResourcesScreen');
    const { t } = useTranslation();
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textLight,
                tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
                tabBarStyle: { backgroundColor: theme.colors.white },
                tabBarLabelStyle: { fontWeight: '600' },
            }}
        >
            <Tab.Screen name="Articles" component={ArticlesListScreen} options={{ tabBarLabel: t('common.screen.articles') }} />
            <Tab.Screen name="Compléments" component={SupplementsListScreen} options={{ tabBarLabel: t('common.screen.supplements') }} />
        </Tab.Navigator>
    );
};
