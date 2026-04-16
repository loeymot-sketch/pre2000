/**
 * Timezone Service
 * Handles date/time synchronization based on user's country
 */
import { createLogger } from '../utils/logger';
const log = createLogger('timezoneService');

// Country to timezone mapping (major countries for the app's target audience)
const COUNTRY_TIMEZONES: Record<string, string> = {
    // North Africa & Middle East
    'DZ': 'Africa/Algiers',       // Algeria
    'MA': 'Africa/Casablanca',    // Morocco
    'TN': 'Africa/Tunis',         // Tunisia
    'EG': 'Africa/Cairo',         // Egypt
    'LY': 'Africa/Tripoli',       // Libya
    'SA': 'Asia/Riyadh',          // Saudi Arabia
    'AE': 'Asia/Dubai',           // UAE
    'QA': 'Asia/Qatar',           // Qatar
    'KW': 'Asia/Kuwait',          // Kuwait
    'BH': 'Asia/Bahrain',         // Bahrain
    'OM': 'Asia/Muscat',          // Oman
    'JO': 'Asia/Amman',           // Jordan
    'LB': 'Asia/Beirut',          // Lebanon
    'SY': 'Asia/Damascus',        // Syria
    'IQ': 'Asia/Baghdad',         // Iraq
    'PS': 'Asia/Gaza',            // Palestine

    // Europe (French speaking)
    'FR': 'Europe/Paris',         // France
    'BE': 'Europe/Brussels',      // Belgium
    'CH': 'Europe/Zurich',        // Switzerland
    'LU': 'Europe/Luxembourg',    // Luxembourg
    'MC': 'Europe/Monaco',        // Monaco

    // Africa (French speaking)
    'SN': 'Africa/Dakar',         // Senegal
    'CI': 'Africa/Abidjan',       // Ivory Coast
    'ML': 'Africa/Bamako',        // Mali
    'CM': 'Africa/Douala',        // Cameroon
    'CD': 'Africa/Kinshasa',      // DR Congo
    'MG': 'Indian/Antananarivo',  // Madagascar

    // Americas
    'CA': 'America/Montreal',     // Canada (French)
    'US': 'America/New_York',     // USA (Eastern)

    // Default
    'DEFAULT': 'UTC',
};

/**
 * Get timezone from country code
 */
export const getTimezoneFromCountry = (countryCode: string): string => {
    return COUNTRY_TIMEZONES[countryCode.toUpperCase()] || COUNTRY_TIMEZONES['DEFAULT'];
};

/**
 * Get current time in user's timezone
 */
export const getCurrentTimeInTimezone = (timezone: string): Date => {
    const now = new Date();
    // Create a date string in the target timezone
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(now);

    const getValue = (type: string) => {
        const part = parts.find(p => p.type === type);
        return part ? parseInt(part.value, 10) : 0;
    };

    return new Date(
        getValue('year'),
        getValue('month') - 1,
        getValue('day'),
        getValue('hour'),
        getValue('minute'),
        getValue('second')
    );
};

/**
 * Convert a date to user's timezone for display
 */
export const formatDateInTimezone = (
    date: Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions,
    locale: string = 'fr-FR'
): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        ...options,
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
};

/**
 * Create a Date object at a specific time in a given timezone
 * This function is simplified to work with local device time for notifications
 */
export const createDateAtTimeInTimezone = (
    baseDate: Date,
    hours: number,
    minutes: number,
    timezone: string // timezone parameter is kept for consistency but not actively used in simplified logic
): Date => {
    try {
        // Validate input date
        if (!baseDate || isNaN(baseDate.getTime())) {
            log.warn('Invalid baseDate, using current date');
            baseDate = new Date();
        }

        // SIMPLIFIED APPROACH: Create date at the specified time directly
        // The previous timezone offset calculation was causing NaN issues
        // Since we're targeting local notifications, the device's local time is what matters
        const result = new Date(baseDate);
        result.setHours(hours, minutes, 0, 0);

        // Validate the result
        if (isNaN(result.getTime())) {
            log.warn('Date validation failed, using current date');
            const fallback = new Date();
            fallback.setHours(hours, minutes, 0, 0);
            return fallback;
        }

        return result;
    } catch (error) {
        log.warn('Error in createDateAtTimeInTimezone:', error);
        // Return a simple fallback
        const fallback = new Date();
        fallback.setHours(hours, minutes, 0, 0);
        return fallback;
    }
};

/**
 * Get timezone offset in hours from UTC
 */
export const getTimezoneOffset = (timezone: string): number => {
    const now = new Date();
    const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzString = now.toLocaleString('en-US', { timeZone: timezone });

    const utcDate = new Date(utcString);
    const tzDate = new Date(tzString);

    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
};

/**
 * List of supported countries for selection
 */
export const SUPPORTED_COUNTRIES = [
    { code: 'DZ', name: 'Algérie', nameAr: 'الجزائر' },
    { code: 'MA', name: 'Maroc', nameAr: 'المغرب' },
    { code: 'TN', name: 'Tunisie', nameAr: 'تونس' },
    { code: 'EG', name: 'Égypte', nameAr: 'مصر' },
    { code: 'SA', name: 'Arabie Saoudite', nameAr: 'السعودية' },
    { code: 'AE', name: 'Émirats Arabes Unis', nameAr: 'الإمارات' },
    { code: 'FR', name: 'France', nameAr: 'فرنسا' },
    { code: 'BE', name: 'Belgique', nameAr: 'بلجيكا' },
    { code: 'CH', name: 'Suisse', nameAr: 'سويسرا' },
    { code: 'CA', name: 'Canada', nameAr: 'كندا' },
    { code: 'SN', name: 'Sénégal', nameAr: 'السنغال' },
    { code: 'CI', name: "Côte d'Ivoire", nameAr: 'ساحل العاج' },
    { code: 'LB', name: 'Liban', nameAr: 'لبنان' },
    { code: 'JO', name: 'Jordanie', nameAr: 'الأردن' },
    { code: 'PS', name: 'Palestine', nameAr: 'فلسطين' },
    { code: 'QA', name: 'Qatar', nameAr: 'قطر' },
    { code: 'KW', name: 'Koweït', nameAr: 'الكويت' },
    { code: 'IQ', name: 'Irak', nameAr: 'العراق' },
];
