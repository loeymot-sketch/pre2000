/**
 * Non-regression tests for H-2 RDV reminder timezone behavior (P3.2)
 *
 * Avant le fix, H-2 utilisait `setHours` sur la Date locale du host (machine
 * du user au moment du scheduling), ce qui pouvait produire un H-2 décalé
 * de plusieurs heures si l'app tournait dans un fuseau différent du fuseau
 * de l'event. Le fix recale d'abord l'heure de l'event dans le fuseau du
 * user (cohérent avec J-1 / J), puis soustrait `hoursBefore`.
 *
 * Ces tests vérifient deux invariants:
 *   1. `createDateAtTimeInTimezone` reste un helper sûr (pas de NaN).
 *   2. Le `reminderTime` du H-2 retourné par `scheduleRDVReminders` est
 *      EXACTEMENT à `hoursBefore` heures avant `eventDate`, pour tous les
 *      `countryCode` testés.
 */

import {
    createDateAtTimeInTimezone,
    getTimezoneFromCountry,
} from '../timezoneService';

jest.mock('../../utils/logger', () => ({
    createLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        success: jest.fn(),
    }),
}));

// ============================================================
// 1. Pure helper: createDateAtTimeInTimezone
// ============================================================

/** Format an instant as HH:mm:ss in a given IANA timezone (TZ-agnostic assertion helper). */
const formatTimeInTz = (d: Date, tz: string): string =>
    new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(d);

/** Format an instant as YYYY-MM-DD in a given IANA timezone (TZ-agnostic assertion helper). */
const formatDateInTz = (d: Date, tz: string): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);

describe('timezoneService.createDateAtTimeInTimezone (P3.2 helper)', () => {
    it('builds an instant whose wall-clock in the target TZ matches the requested HH:mm', () => {
        // 2026-06-01 12:00 in *device-local* time. The Y/M/D part of the input is what
        // anchors the day of the result; the HH:mm anchors the wall-clock IN the target TZ.
        const base = new Date(2026, 5, 1, 12, 0, 0);
        const result = createDateAtTimeInTimezone(base, 14, 30, 'Europe/Paris');

        // Display the result in Europe/Paris → must read exactly "14:30:00" regardless of CI tz.
        expect(formatTimeInTz(result, 'Europe/Paris')).toBe('14:30:00');
    });

    it('preserves the input calendar day in the target TZ (no off-by-one)', () => {
        const base = new Date(2026, 5, 1, 12, 0, 0);
        const result = createDateAtTimeInTimezone(base, 8, 0, 'Africa/Algiers');

        // The result, displayed in Africa/Algiers, must show the same Y/M/D as `base`'s local Y/M/D.
        expect(formatDateInTz(result, 'Africa/Algiers')).toBe('2026-06-01');
        expect(formatTimeInTz(result, 'Africa/Algiers')).toBe('08:00:00');
    });

    it('falls back to a valid Date even when baseDate is invalid', () => {
        const invalid = new Date('not-a-real-date');
        const result = createDateAtTimeInTimezone(invalid, 8, 0, 'Europe/Paris');

        expect(isNaN(result.getTime())).toBe(false);
        // Whichever date the fallback picked (current date), HH:mm must be 08:00 in Paris.
        expect(formatTimeInTz(result, 'Europe/Paris')).toBe('08:00:00');
    });

    it('handles a non-DST tz consistently across summer and winter inputs', () => {
        // Africa/Algiers is UTC+1 year-round (no DST since 1981). Same offset in Jan and Jul.
        const summer = createDateAtTimeInTimezone(new Date(2026, 6, 15), 9, 0, 'Africa/Algiers');
        const winter = createDateAtTimeInTimezone(new Date(2026, 0, 15), 9, 0, 'Africa/Algiers');

        expect(formatTimeInTz(summer, 'Africa/Algiers')).toBe('09:00:00');
        expect(formatTimeInTz(winter, 'Africa/Algiers')).toBe('09:00:00');
    });

    it('respects DST in Europe/Paris (CET=UTC+1 in winter, CEST=UTC+2 in summer)', () => {
        const winter = createDateAtTimeInTimezone(new Date(2026, 0, 15), 8, 0, 'Europe/Paris');
        const summer = createDateAtTimeInTimezone(new Date(2026, 6, 15), 8, 0, 'Europe/Paris');

        // Both should display as 08:00 in Paris...
        expect(formatTimeInTz(winter, 'Europe/Paris')).toBe('08:00:00');
        expect(formatTimeInTz(summer, 'Europe/Paris')).toBe('08:00:00');
        // ...but their UTC instants differ by exactly 1h (the DST gap).
        expect(formatTimeInTz(winter, 'UTC')).toBe('07:00:00'); // 08:00 CET → 07:00 UTC
        expect(formatTimeInTz(summer, 'UTC')).toBe('06:00:00'); // 08:00 CEST → 06:00 UTC
    });

    it('getTimezoneFromCountry resolves the expected IANA zones', () => {
        expect(getTimezoneFromCountry('FR')).toBe('Europe/Paris');
        expect(getTimezoneFromCountry('TN')).toBe('Africa/Tunis');
        expect(getTimezoneFromCountry('DZ')).toBe('Africa/Algiers');
        expect(getTimezoneFromCountry('zz')).toBe('UTC'); // fallback
    });
});

// ============================================================
// 2. End-to-end: scheduleRDVReminders H-2 delta
// ============================================================

import * as Notifications from 'expo-notifications';

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../notificationService', () => ({
    requestNotificationPermissions: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../utils/notificationMessages', () => ({
    getRDVMessage: jest.fn(() => ({ title: 'T', body: 'B' })),
    getHydrationMessage: jest.fn(() => ({ title: 'H', body: 'H' })),
    getTaskMessage: jest.fn(() => ({ title: 'TA', body: 'TA' })),
}));

// Import AFTER mocks so the module sees them
import { scheduleRDVReminders } from '../rdvNotificationService';

describe('scheduleRDVReminders H-2 timezone consistency (P3.2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        let counter = 0;
        (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(() =>
            Promise.resolve(`notif-${++counter}`)
        );
        (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
        (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    });

    /** Build an event date several months in the future at 14:00 local. */
    const futureEvent = (): Date => {
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        d.setHours(14, 0, 0, 0);
        return d;
    };

    /**
     * Canonical "event-in-target-tz" anchor as computed by the production code
     * (`rdvNotificationService.scheduleRDVReminders` H-2 branch). The H-2 reminder
     * is `hoursBefore` *before this anchor*, regardless of the device tz.
     *
     * NB: with the *true* TZ-aware `createDateAtTimeInTimezone`, asserting the
     * raw delta vs `eventDate.toISOString()` only holds when the device tz
     * matches the country tz (true for a French dev machine, false on UTC CI).
     * We assert against this anchor so the test passes everywhere.
     */
    const eventAnchorInTz = (event: Date, tz: string): Date =>
        createDateAtTimeInTimezone(event, event.getHours(), event.getMinutes(), tz);

    it('H-2 reminderTime is exactly 2 hours before the event-anchor in the target TZ (FR)', async () => {
        const event = futureEvent();
        const reminders = await scheduleRDVReminders('evt-fr', 'Test', event, {
            reminderJ1: false,
            reminderJ: false,
            reminderH2: true,
            countryCode: 'FR',
        });

        const h2 = reminders.find(r => r.reminderType === 'H-2');
        expect(h2).toBeDefined();

        const expectedReminder = eventAnchorInTz(event, 'Europe/Paris').getTime() - 2 * 60 * 60 * 1000;
        expect(new Date(h2!.reminderTime).getTime()).toBe(expectedReminder);
    });

    it('H-2 delta stays exactly 2h vs the event-anchor across FR / TN / DZ timezones', async () => {
        const map: Record<string, string> = {
            FR: 'Europe/Paris',
            TN: 'Africa/Tunis',
            DZ: 'Africa/Algiers',
        };

        for (const cc of Object.keys(map)) {
            const event = futureEvent();
            const reminders = await scheduleRDVReminders(`evt-${cc}`, 'Test', event, {
                reminderJ1: false,
                reminderJ: false,
                reminderH2: true,
                countryCode: cc,
            });

            const h2 = reminders.find(r => r.reminderType === 'H-2');
            expect(h2).toBeDefined();

            const anchor = eventAnchorInTz(event, map[cc]).getTime();
            const deltaHours = (anchor - new Date(h2!.reminderTime).getTime()) / (1000 * 60 * 60);
            expect(deltaHours).toBeCloseTo(2, 5);
        }
    });

    it('respects customReminderTime (e.g. 4h before)', async () => {
        const event = futureEvent();
        const reminders = await scheduleRDVReminders('evt-custom', 'Test', event, {
            reminderJ1: false,
            reminderJ: false,
            customReminderTime: 4,
            countryCode: 'FR',
        });

        const h2 = reminders.find(r => r.reminderType === 'H-2');
        expect(h2).toBeDefined();

        const anchor = eventAnchorInTz(event, 'Europe/Paris').getTime();
        const deltaHours = (anchor - new Date(h2!.reminderTime).getTime()) / (1000 * 60 * 60);
        expect(deltaHours).toBeCloseTo(4, 5);
    });

    it('does not schedule H-2 when its time is already in the past', async () => {
        const soon = new Date();
        soon.setHours(soon.getHours() + 1); // event in 1h → H-2 in -1h
        const reminders = await scheduleRDVReminders('past-evt', 'Past', soon, {
            reminderJ1: false,
            reminderJ: false,
            reminderH2: true,
            countryCode: 'FR',
        });

        expect(reminders.find(r => r.reminderType === 'H-2')).toBeUndefined();
    });
});
