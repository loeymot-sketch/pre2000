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

    // R1 FIX: anti-loop guard — if I18nManager already matches the desired
    // direction, do NOT reload. This prevents an infinite reload loop when
    // setupRTL runs both at boot and again from the languageChanged listener.
    if (I18nManager.isRTL !== shouldBeRTL) {
        log.info(`Switching RTL mode: ${I18nManager.isRTL} -> ${shouldBeRTL}`);
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);

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

// R1 FIX: idempotent listener registration. registerRTLListener() is called once
// at app boot from src/i18n/index.ts so that:
//   1. setupRTL() runs as soon as i18n is initialised (async LANGUAGE_DETECTOR
//      may finish AFTER App.tsx's first useEffect, leaving I18nManager
//      desynchronised when the saved locale is 'ar'/'tn').
//   2. setupRTL() re-runs on every languageChanged event — covering both
//      changeLanguage() flows AND any future programmatic switch.
let rtlListenerRegistered = false;

export const registerRTLListener = () => {
    if (rtlListenerRegistered) return;
    rtlListenerRegistered = true;

    const triggerSetup = () => {
        // Fire-and-forget: setupRTL is itself idempotent (anti-loop guard above).
        setupRTL().catch((err) => log.warn('setupRTL from listener failed:', err));
    };

    // If i18n has already finished initialising before this call (unlikely on
    // cold start but possible during HMR), run setupRTL immediately.
    if (i18n.isInitialized) {
        triggerSetup();
    } else {
        i18n.on('initialized', triggerSetup);
    }

    i18n.on('languageChanged', triggerSetup);
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
    // Note: setupRTL is also triggered by the languageChanged listener registered
    // by registerRTLListener(). Calling it here too is safe (idempotent) and
    // preserves the historical contract for callers that don't rely on the listener.
    await setupRTL();
};
