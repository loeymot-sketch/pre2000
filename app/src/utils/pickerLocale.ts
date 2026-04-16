/**
 * Maps i18n language codes to valid BCP47 locale strings for
 * @react-native-community/datetimepicker (used on iOS and Android).
 *
 * Problem: iOS DateTimePicker requires a real BCP47 locale (e.g. 'ar-MA').
 * Passing 'ar' alone causes iOS to fall back to the device's system locale,
 * which may show months in an unexpected language (e.g. Sesotho on some devices).
 */
export const getPickerLocale = (language: string): string => {
    switch (language) {
        case 'ar': return 'ar-DZ-u-nu-latn'; // Algerian Arabic uses Janvi, Fevri, Mars and Latin digits (1,2,3)
        case 'tn': return 'ar-TN-u-nu-latn'; // Tunisian Arabic uses identical Maghreb styles + Latin digits
        case 'en': return 'en-US';
        case 'fr': return 'fr-FR';
        default: return 'fr-FR';
    }
};
