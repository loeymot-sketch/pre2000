import { I18nManager } from 'react-native';
import i18n from './index';
import * as Updates from 'expo-updates';
import { createLogger } from '../utils/logger';
const log = createLogger('rtl');

export const isRTL = (): boolean => {
    return i18n.language === 'ar' || i18n.language === 'tn';
};

export const setupRTL = async () => {
    const shouldBeRTL = isRTL();

    if (I18nManager.isRTL !== shouldBeRTL) {
        log.info(`Switching RTL mode: ${I18nManager.isRTL} -> ${shouldBeRTL}`);
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);

        // Persist immediately to avoid race condition on reload
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        // Verify if language matches direction
        if (shouldBeRTL && (i18n.language !== 'ar' && i18n.language !== 'tn')) {
            // Logic mismatch, don't reload yet? No, trust isRTL()
        }

        // Reload app to apply RTL changes
        try {
            // Small delay to ensure Async storage is written
            setTimeout(async () => {
                await Updates.reloadAsync();
            }, 100);
        } catch (error) {
            log.warn('Could not reload app for RTL change:', error);
        }
    }
};

export const changeLanguage = async (lang: string) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('app_locale', lang); // Force save first
    await i18n.changeLanguage(lang);
    // Track language as analytics user property for segmentation
    try {
        const { analyticsService } = require('../services/analyticsService');
        analyticsService.setUserProperties({ app_language: lang });
        analyticsService.logEvent('language_changed', { language: lang });
    } catch (_e) { /* Analytics not critical */ }
    await setupRTL();
};
