import { createLogger } from '../utils/logger';
const log = createLogger('i18n');
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import fr from './locales/fr';
import ar from './locales/ar';
import tn from './locales/tn';
import en from './locales/en';

const LANGUAGE_DETECTOR = {
    type: 'languageDetector' as const,
    async: true,
    detect: async (callback: (lang: string) => void) => {
        try {
            const savedLang = await AsyncStorage.getItem('app_locale');
            callback(savedLang || 'fr');
        } catch (error) {
            log.debug('[i18n] Error detecting language:', error);
            callback('fr');
        }
    },
    init: () => { },
    cacheUserLanguage: async (lang: string) => {
        try {
            await AsyncStorage.setItem('app_locale', lang);
        } catch (error) {
            log.debug('[i18n] Error caching language:', error);
        }
    },
};

i18n
    .use(LANGUAGE_DETECTOR as any)
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            ar: { translation: ar },
            tn: { translation: tn },
            en: { translation: en },
        },
        fallbackLng: {
            'tn': ['ar', 'en', 'fr'],
            'ar': ['en', 'fr'],
            'en': ['fr'],
            'default': ['fr']
        },
        // lng: 'fr', // Commented out to allow language detector to work from AsyncStorage
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

log.debug('[i18n] ✅ i18n initialized');

// R1 FIX: register the RTL listener here (not in App.tsx) so it is wired up
// the moment the i18n module is imported — BEFORE App.tsx mounts. This way
// the async LANGUAGE_DETECTOR can finish reading 'app_locale' from
// AsyncStorage and the resulting 'initialized' / 'languageChanged' event
// will trigger setupRTL() with the correct language even on cold start.
// Done lazily via require() to avoid a circular import (rtl.ts imports i18n).
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerRTLListener } = require('./rtl');
    registerRTLListener();
} catch (e) {
    log.warn('[i18n] Failed to register RTL listener:', e);
}

export default i18n;
