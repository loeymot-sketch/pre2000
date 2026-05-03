/**
 * Unit tests for calculateStreak (P-FIX-4 algo).
 *
 * The streak counts consecutive days a reminder was completed, walking backwards from
 * today. A 1-day grace period applies: if today wasn't completed but yesterday was,
 * the streak still counts (UX: late-day completion).
 */

// Mock firebase config so importing remindersV2Service in node env doesn't try to load
// React Native auth persistence (which throws under Jest).
jest.mock('../../config/firebase', () => ({
    db: {},
    auth: {},
    analytics: Promise.resolve(null),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiRemove: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

import { calculateStreak } from '../remindersV2Service';

const isoDay = (offsetDays: number): string => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
};

describe('calculateStreak', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns 0 for empty input', () => {
        expect(calculateStreak([])).toBe(0);
    });

    it('returns 0 for an array of invalid dates', () => {
        expect(calculateStreak(['not-a-date', ''])).toBe(0);
    });

    it('returns 1 when only today is completed', () => {
        expect(calculateStreak([isoDay(0)])).toBe(1);
    });

    it('returns 1 when only yesterday is completed (grace period)', () => {
        expect(calculateStreak([isoDay(-1)])).toBe(1);
    });

    it('returns 0 when last completion is 2 days ago (grace expired)', () => {
        expect(calculateStreak([isoDay(-2)])).toBe(0);
    });

    it('returns 3 for today + yesterday + 2 days ago', () => {
        expect(calculateStreak([isoDay(0), isoDay(-1), isoDay(-2)])).toBe(3);
    });

    it('returns 10 for a 10-day chain ending today', () => {
        const dates = Array.from({ length: 10 }, (_, i) => isoDay(-i));
        expect(calculateStreak(dates)).toBe(10);
    });

    it('handles unsorted input (regression: previous algo assumed sorted)', () => {
        const dates = [isoDay(-2), isoDay(0), isoDay(-1)];
        expect(calculateStreak(dates)).toBe(3);
    });

    it('dedupes duplicate dates', () => {
        const today = isoDay(0);
        expect(calculateStreak([today, today, today])).toBe(1);
    });

    it('breaks the streak on a gap', () => {
        // Today, yesterday, then a gap of 2 days, then 3 more days
        const dates = [
            isoDay(0),
            isoDay(-1),
            isoDay(-4), // gap (-2, -3 missing)
            isoDay(-5),
            isoDay(-6),
        ];
        expect(calculateStreak(dates)).toBe(2);
    });

    it('ignores future dates (date in the future = noise)', () => {
        // Note: future dates are added to the day Set but the cursor walks backwards
        // from today, so they are simply not visited. This documents that behavior.
        expect(calculateStreak([isoDay(2), isoDay(0)])).toBe(1);
    });

    it('returns the previous algo would have failed on (3+ consecutive days)', () => {
        // Regression test: old code used `diff === streak` which broke after streak=2.
        // 5-day chain from today should now correctly return 5.
        const dates = [isoDay(0), isoDay(-1), isoDay(-2), isoDay(-3), isoDay(-4)];
        expect(calculateStreak(dates)).toBe(5);
    });
});
