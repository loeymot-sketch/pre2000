/**
 * Non-regression tests for `migrateAllGuestDataToAuth(uid)` (Sub-A migration pipeline).
 *
 * Garde-fous:
 *  1. Après migration, les clés guest doivent être retirées d'AsyncStorage.
 *  2. Firestore doit recevoir les bons docs (collection + docId) pour V1 + V2.
 *  3. `Promise.allSettled` tolère les échecs partiels — la pipeline doit rester
 *     non-bloquante (l'orchestrateur ne doit jamais propager).
 *  4. JSON corrompu d'une étape ne doit pas faire échouer les autres.
 *  5. Cas vide: pas de Firestore write, pas de crash.
 *
 * Tout I/O (Firestore + AsyncStorage) est mocké — aucun appel réseau.
 */

// ────────────────────────────────────────────────────────────────────────────
// MOCKS
// ────────────────────────────────────────────────────────────────────────────

const mockStorage: Map<string, string> = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key: string) =>
        Promise.resolve(mockStorage.has(key) ? (mockStorage.get(key) as string) : null)
    ),
    setItem: jest.fn((key: string, value: string) => {
        mockStorage.set(key, value);
        return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
        mockStorage.delete(key);
        return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
        keys.forEach(k => mockStorage.delete(k));
        return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStorage.keys()))),
}));

jest.mock('../../config/firebase', () => ({
    db: {},
    auth: {},
    analytics: Promise.resolve(null),
}));

jest.mock('firebase/firestore', () => ({
    // doc(db, collection, id) → marker we can introspect on setDoc(...)
    doc: jest.fn((_db: unknown, collection: string, id: string) => ({
        __collection: collection,
        __id: id,
    })),
    setDoc: jest.fn(() => Promise.resolve()),
    collection: jest.fn((_db: unknown, name: string) => ({ __collection: name })),
    query: jest.fn((...args: unknown[]) => ({ __query: args })),
    where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
    getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
    deleteDoc: jest.fn(() => Promise.resolve()),
    deleteField: jest.fn(() => '__DELETE_FIELD__'),
}));

jest.mock('../../utils/logger', () => ({
    createLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        success: jest.fn(),
    }),
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        success: jest.fn(),
    },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDoc } from 'firebase/firestore';
import { migrateAllGuestDataToAuth } from '../reminderPersistence';

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const UID = 'auth_user_123';

const seedV1ReminderSettings = (data: Record<string, unknown>): void => {
    mockStorage.set('@reminder_settings_v1', JSON.stringify(data));
};

const seedV1TaskStatuses = (data: Record<string, unknown>): void => {
    mockStorage.set('@task_statuses_v1', JSON.stringify(data));
};

const seedV2GuestSettings = (data: Record<string, unknown>): void => {
    mockStorage.set('reminders_v2_settings_guest', JSON.stringify(data));
};

const seedV2GuestCompletions = (data: Record<string, unknown>): void => {
    mockStorage.set('reminders_v2_completions', JSON.stringify(data));
};

/** Returns all setDoc calls grouped by their collection. */
const setDocCallsByCollection = (): Record<string, Array<{ id: string; data: any }>> => {
    const calls = (setDoc as jest.Mock).mock.calls;
    const grouped: Record<string, Array<{ id: string; data: any }>> = {};
    for (const [docRef, data] of calls) {
        const col = (docRef as any).__collection ?? '<unknown>';
        const id = (docRef as any).__id ?? '<unknown>';
        if (!grouped[col]) grouped[col] = [];
        grouped[col].push({ id, data });
    }
    return grouped;
};

// ────────────────────────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('migrateAllGuestDataToAuth — Sub-A guest→auth pipeline', () => {
    beforeEach(() => {
        mockStorage.clear();
        jest.clearAllMocks();
    });

    describe('happy path', () => {
        it('writes V1 reminder settings to userReminderSettings collection then clears guest key', async () => {
            seedV1ReminderSettings({
                rem_a: { enabled: true, timesPerDay: 2, customHours: ['08:00'], lastModified: '2025-01-01' },
                rem_b: { enabled: false, timesPerDay: 1, lastModified: '2025-01-02' },
            });

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            expect(grouped.userReminderSettings).toBeDefined();
            expect(grouped.userReminderSettings).toHaveLength(2);

            const ids = grouped.userReminderSettings.map(c => c.id);
            expect(ids).toContain(`${UID}_rem_a`);
            expect(ids).toContain(`${UID}_rem_b`);

            // Per-doc shape must carry user_id + reminder_id (data isolation invariant)
            grouped.userReminderSettings.forEach(({ data }) => {
                expect(data.user_id).toBe(UID);
                expect(typeof data.reminder_id).toBe('string');
            });

            // Guest key must be removed after a successful migration loop
            expect(mockStorage.has('@reminder_settings_v1')).toBe(false);
        });

        it('writes V1 task statuses to userTaskStatuses (parses key into taskId + week)', async () => {
            seedV1TaskStatuses({
                'task_echo_w12': { completed: true, completedAt: '2025-01-01' },
                'task_glucose_w24': { completed: false },
            });

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            expect(grouped.userTaskStatuses).toBeDefined();
            expect(grouped.userTaskStatuses).toHaveLength(2);

            const echo = grouped.userTaskStatuses.find(c => c.id === `${UID}_task_echo_w12`);
            expect(echo).toBeDefined();
            expect(echo!.data.user_id).toBe(UID);
            expect(echo!.data.task_id).toBe('task_echo');
            expect(echo!.data.week_number).toBe(12);
            expect(echo!.data.completed).toBe(true);

            expect(mockStorage.has('@task_statuses_v1')).toBe(false);
        });

        it('writes V2 reminder settings to reminder_settings_v2 with normalized user_id/reminder_id', async () => {
            seedV2GuestSettings({
                rem_hyd_morning: {
                    reminder_id: 'rem_hyd_morning',
                    user_id: 'guest', // Must be overwritten with UID
                    enabled: true,
                    intensity: 2,
                    times: ['08:00', '14:00'],
                    origin: 'preset',
                    last_modified_at: '2025-01-01T00:00:00Z',
                },
            });

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            expect(grouped.reminder_settings_v2).toHaveLength(1);

            const call = grouped.reminder_settings_v2[0];
            expect(call.id).toBe(`${UID}_rem_hyd_morning`);
            expect(call.data.user_id).toBe(UID); // Normalized — guest must be replaced
            expect(call.data.reminder_id).toBe('rem_hyd_morning');
            expect(call.data.enabled).toBe(true);

            expect(mockStorage.has('reminders_v2_settings_guest')).toBe(false);
        });

        it('strips undefined fields from V2 settings before Firestore (Firestore rejects undefined)', async () => {
            seedV2GuestSettings({
                rem_x: {
                    reminder_id: 'rem_x',
                    user_id: 'guest',
                    enabled: true,
                    intensity: 2,
                    times: ['09:00'],
                    days: undefined, // Must be filtered out
                    origin: 'preset',
                    custom_name: undefined, // Must be filtered out
                    last_modified_at: '2025-01-01T00:00:00Z',
                },
            });

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            const call = grouped.reminder_settings_v2[0];

            expect(call.data).not.toHaveProperty('days');
            expect(call.data).not.toHaveProperty('custom_name');
            expect(call.data.enabled).toBe(true);
        });

        it('migrates V2 completions to user-scoped key and removes guest key', async () => {
            seedV2GuestCompletions({
                rem_hyd_morning: ['2025-01-01', '2025-01-02', '2025-01-02'], // dup
                rem_vit_iron: ['2024-12-31'],
            });

            await migrateAllGuestDataToAuth(UID);

            const userKey = `reminders_v2_completions_${UID}`;
            expect(mockStorage.has(userKey)).toBe(true);

            const stored = JSON.parse(mockStorage.get(userKey) as string);
            // Dedup + sort guarantee
            expect(stored.rem_hyd_morning).toEqual(['2025-01-01', '2025-01-02']);
            expect(stored.rem_vit_iron).toEqual(['2024-12-31']);

            // Guest key is dropped only after a successful merge
            expect(mockStorage.has('reminders_v2_completions')).toBe(false);
        });

        it('merges V2 completions with pre-existing user-scoped completions (dedup + 90 cap)', async () => {
            const userKey = `reminders_v2_completions_${UID}`;
            mockStorage.set(userKey, JSON.stringify({
                rem_hyd_morning: ['2025-01-05'],
            }));
            seedV2GuestCompletions({
                rem_hyd_morning: ['2025-01-01', '2025-01-05'], // overlap
            });

            await migrateAllGuestDataToAuth(UID);

            const stored = JSON.parse(mockStorage.get(userKey) as string);
            expect(stored.rem_hyd_morning).toEqual(['2025-01-01', '2025-01-05']);
        });
    });

    describe('empty inputs (no guest data)', () => {
        it('does not call setDoc when nothing is in AsyncStorage', async () => {
            await migrateAllGuestDataToAuth(UID);

            expect(setDoc).not.toHaveBeenCalled();
        });

        it('skips entirely when V1 settings array is present but empty', async () => {
            seedV1ReminderSettings({});

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            expect(grouped.userReminderSettings).toBeUndefined();
        });
    });

    describe('error tolerance (Promise.allSettled)', () => {
        it('continues with other migrations even if one Firestore write rejects', async () => {
            // First setDoc rejects (V1 settings) → should NOT abort the rest
            (setDoc as jest.Mock).mockRejectedValueOnce(new Error('firestore unavailable'));

            seedV1ReminderSettings({ rem_a: { enabled: true, timesPerDay: 2, lastModified: 'x' } });
            seedV2GuestCompletions({ rem_hyd: ['2025-01-01'] });

            await expect(migrateAllGuestDataToAuth(UID)).resolves.toBeUndefined();

            // Completions migration must have succeeded despite the V1 failure
            const userKey = `reminders_v2_completions_${UID}`;
            expect(mockStorage.has(userKey)).toBe(true);
        });

        it('does NOT throw on corrupted V2 settings JSON — guest key stays, others run', async () => {
            mockStorage.set('reminders_v2_settings_guest', '{not valid json');
            seedV1TaskStatuses({ 'task_a_w10': { completed: true } });

            await expect(migrateAllGuestDataToAuth(UID)).resolves.toBeUndefined();

            const grouped = setDocCallsByCollection();
            // No V2 settings written
            expect(grouped.reminder_settings_v2).toBeUndefined();
            // V1 task statuses still migrated
            expect(grouped.userTaskStatuses).toBeDefined();
            expect(grouped.userTaskStatuses).toHaveLength(1);
            // Corrupted guest key NOT removed (so user can retry / inspect)
            expect(mockStorage.has('reminders_v2_settings_guest')).toBe(true);
        });

        it('does NOT throw on corrupted V2 completions JSON', async () => {
            mockStorage.set('reminders_v2_completions', ']][[');

            await expect(migrateAllGuestDataToAuth(UID)).resolves.toBeUndefined();

            // No write to user-scoped completions key
            expect(mockStorage.has(`reminders_v2_completions_${UID}`)).toBe(false);
        });

        it('skips an entry whose value is not an object in V2 settings (defensive parsing)', async () => {
            seedV2GuestSettings({
                rem_valid: {
                    reminder_id: 'rem_valid',
                    user_id: 'guest',
                    enabled: true,
                    intensity: 1,
                    times: ['09:00'],
                    origin: 'preset',
                    last_modified_at: '2025-01-01T00:00:00Z',
                },
                rem_garbage: 'not_an_object', // must be skipped, not crash
                rem_null: null,                // must be skipped, not crash
            });

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            expect(grouped.reminder_settings_v2).toHaveLength(1);
            expect(grouped.reminder_settings_v2[0].id).toBe(`${UID}_rem_valid`);
        });
    });

    describe('full pipeline integration', () => {
        it('migrates V1 + V2 in one call — every guest key cleared, every collection written', async () => {
            seedV1ReminderSettings({
                rem_a: { enabled: true, timesPerDay: 2, lastModified: '2025-01-01' },
            });
            seedV1TaskStatuses({ 'task_echo_w12': { completed: true } });
            seedV2GuestSettings({
                rem_hyd: {
                    reminder_id: 'rem_hyd', user_id: 'guest', enabled: true,
                    intensity: 1, times: ['08:00'], origin: 'preset',
                    last_modified_at: '2025-01-01T00:00:00Z',
                },
            });
            seedV2GuestCompletions({ rem_hyd: ['2025-01-01'] });

            await migrateAllGuestDataToAuth(UID);

            const grouped = setDocCallsByCollection();
            expect(Object.keys(grouped).sort()).toEqual([
                'reminder_settings_v2',
                'userReminderSettings',
                'userTaskStatuses',
            ]);

            // All guest keys gone
            expect(mockStorage.has('@reminder_settings_v1')).toBe(false);
            expect(mockStorage.has('@task_statuses_v1')).toBe(false);
            expect(mockStorage.has('reminders_v2_settings_guest')).toBe(false);
            expect(mockStorage.has('reminders_v2_completions')).toBe(false);
            // User-scoped completions written
            expect(mockStorage.has(`reminders_v2_completions_${UID}`)).toBe(true);
        });
    });
});
