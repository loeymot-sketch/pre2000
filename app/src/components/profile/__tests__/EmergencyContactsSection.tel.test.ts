/**
 * C11/F15 — tel:-URI sanitizer guards.
 *
 * EmergencyContactsSection.handleCall() builds `tel:${number}` and dispatches
 * via Linking.openURL. Without input constraints, a crafted contact number
 * could embed extra URI components or other schemes that native dispatchers
 * may interpret unpredictably.
 *
 * This file pins the regex + strip behavior. It exercises ONLY the pure
 * sanitizer (sibling helper module) — no React rendering, no provider mount.
 */

import {
    sanitizeTelNumber,
    TEL_VALIDATION_REGEX,
} from '../EmergencyContactsSection.helpers';

describe('C11/F15 — sanitizeTelNumber', () => {
    describe('valid inputs (regex passes, formatting stripped)', () => {
        it('accepts plain digits', () => {
            expect(sanitizeTelNumber('0612345678')).toBe('0612345678');
        });

        it('accepts E.164 with leading +', () => {
            expect(sanitizeTelNumber('+33612345678')).toBe('+33612345678');
        });

        it('strips spaces, dashes, dots, parentheses', () => {
            expect(sanitizeTelNumber('+33 (6) 12-34.56-78')).toBe('+33612345678');
        });

        it('trims surrounding whitespace before validating', () => {
            expect(sanitizeTelNumber('  0612345678  ')).toBe('0612345678');
        });

        it('accepts the minimum length (4 chars after trim)', () => {
            expect(sanitizeTelNumber('1234')).toBe('1234');
        });

        it('accepts 20-char inputs at the upper bound', () => {
            const twenty = '+1234567890123456789';
            expect(twenty.length).toBe(20);
            expect(sanitizeTelNumber(twenty)).toBe('+1234567890123456789');
        });
    });

    describe('invalid inputs (regex rejects)', () => {
        it.each([
            ['empty string', ''],
            ['whitespace only', '   '],
            ['too short (3 chars)', '123'],
            ['too long (21 chars)', '+12345678901234567890'],
            ['letters mixed in', 'abc12345'],
            ['HTML/script payload', 'invalid<script>'],
            ['shell injection attempt', '190;rm -rf'],
            ['embedded URI scheme', 'tel:1234'],
            ['javascript: scheme attempt', 'javascript:alert(1)'],
            ['comma not allowed', '06,12,34,56'],
            ['slash not allowed', '06/12/34'],
            ['embedded newline injection', '0612\n345678'],
            ['null byte', '0612345\x00'],
        ])('rejects %s', (_label, raw) => {
            expect(sanitizeTelNumber(raw)).toBeNull();
        });

        it('rejects non-string inputs (defensive)', () => {
            expect(sanitizeTelNumber(undefined as unknown as string)).toBeNull();
            expect(sanitizeTelNumber(null as unknown as string)).toBeNull();
            expect(sanitizeTelNumber(12345 as unknown as string)).toBeNull();
        });
    });

    describe('TEL_VALIDATION_REGEX (form-level check)', () => {
        it('matches the same charset / length window the sanitizer accepts', () => {
            expect(TEL_VALIDATION_REGEX.test('+33 6 12 34 56 78')).toBe(true);
            expect(TEL_VALIDATION_REGEX.test('190;rm -rf')).toBe(false);
            expect(TEL_VALIDATION_REGEX.test('')).toBe(false);
        });
    });
});
