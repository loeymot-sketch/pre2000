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

export default i18n;
