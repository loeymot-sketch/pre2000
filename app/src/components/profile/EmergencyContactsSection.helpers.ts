/**
 * SECURITY (C11/F15): tel:-URI input must be constrained to a small,
 * human-friendly dial-string charset. Without this, a crafted contact number
 * could embed extra URI components or other schemes that native iOS/Android
 * dispatchers may interpret unpredictably.
 *
 * Accepted format (raw user input, before stripping): digits, leading +,
 * spaces, parentheses, dots, dashes — length 4..20.
 * The returned dial-string has all whitespace and formatting characters
 * stripped, leaving only digits and the optional leading +.
 *
 * Co-located helper (sibling file pattern, see Button.helpers.ts) so the
 * pure logic can be unit-tested without mounting React Native primitives.
 */

export const TEL_VALIDATION_REGEX = /^[+0-9 ().\-]{4,20}$/;

export const sanitizeTelNumber = (raw: string): string | null => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!TEL_VALIDATION_REGEX.test(trimmed)) return null;
    return trimmed.replace(/[\s().\-]/g, '');
};
