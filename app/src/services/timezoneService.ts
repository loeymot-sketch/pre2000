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
 * Create a Date object representing a wall-clock time (HH:mm) on a given day in a
 * specific IANA timezone, regardless of the device's local timezone.
 *
 * Calendar day (Y/M/D) is taken from `baseDate` interpreted in **device-local time**
 * — this preserves the existing call-site contract where callers build dates with
 * `new Date(y, m, d)` or `setDate(...)` and expect those local-day values to anchor
 * the result. Hours / minutes are then anchored in the target IANA timezone.
 *
 * The returned Date is the absolute UTC instant such that, when displayed in
 * `timezone`, the wall clock reads exactly `hours:minutes:00`.
 *
 * Algorithm: build a "fake UTC" instant matching the desired wall clock, ask
 * `Intl.DateTimeFormat` what it would display in `timezone`, derive the offset
 * from the difference, and shift the instant by that offset. Handles DST.
 *
 * @example
 *   // June 15 2026, 08:00 in Europe/Paris (CEST = UTC+2)
 *   const d = createDateAtTimeInTimezone(new Date(2026, 5, 15), 8, 0, 'Europe/Paris');
 *   // Verification:
 *   //   d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris',
 *   //     dateStyle: 'short', timeStyle: 'medium' })
 *   //   → "15/06/2026 08:00:00"
 *
 * If `Intl.DateTimeFormat` with `timeZone` support is unavailable (very old JS
 * runtime), falls back to the legacy device-local `setHours` behavior and logs
 * a warning so the regression is visible.
 */
export const createDateAtTimeInTimezone = (
    baseDate: Date,
    hours: number,
    minutes: number,
    timezone: string
): Date => {
    let safeDate = baseDate;
    if (!safeDate || isNaN(safeDate.getTime())) {
        log.warn('Invalid baseDate, using current date');
        safeDate = new Date();
    }

    const year = safeDate.getFullYear();
    const month = safeDate.getMonth(); // 0-indexed
    const day = safeDate.getDate();

    try {
        // Step 1: pretend the desired wall-clock IS UTC. This anchors the calendar
        // day from the input and the requested HH:mm into a concrete instant.
        const fakeUtc = Date.UTC(year, month, day, hours, minutes, 0, 0);

        // Step 2: ask Intl what that instant would display as in `timezone`.
        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
        });

        const parts = dtf.formatToParts(new Date(fakeUtc));
        const get = (type: string): number => {
            const found = parts.find(p => p.type === type);
            return found ? parseInt(found.value, 10) : NaN;
        };

        const tzYear = get('year');
        const tzMonth = get('month');
        const tzDay = get('day');
        let tzHour = get('hour');
        const tzMinute = get('minute');
        const tzSecond = get('second');

        if ([tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond].some(Number.isNaN)) {
            throw new Error('Intl.DateTimeFormat returned invalid parts');
        }

        // Some Intl backends (notably en-US, hour12:false) report midnight as "24"
        // instead of "0". Normalize so Date.UTC stays in range.
        if (tzHour === 24) tzHour = 0;

        // Step 3: derive the timezone's offset at this instant from the discrepancy
        // between what was "shown" and the fake UTC instant we plugged in.
        const tzShown = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
        const offsetMs = tzShown - fakeUtc;

        // Step 4: shift the fake UTC by the offset to produce the real instant
        // that will display as the requested wall-clock in `timezone`.
        const result = new Date(fakeUtc - offsetMs);

        if (isNaN(result.getTime())) {
            throw new Error('Computed Date is NaN');
        }

        return result;
    } catch (error) {
        log.warn(
            `createDateAtTimeInTimezone: Intl.DateTimeFormat unavailable or failed for timezone="${timezone}". Falling back to device-local time. Notifications may fire at the wrong moment for users whose device timezone differs from their country.`,
            error
        );
        const fallback = new Date(safeDate);
        fallback.setHours(hours, minutes, 0, 0);
        if (isNaN(fallback.getTime())) {
            const last = new Date();
            last.setHours(hours, minutes, 0, 0);
            return last;
        }
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
