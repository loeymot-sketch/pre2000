/**
 * Non-regression tests for AuthContext login bootstrap (F4 fix).
 *
 * F4 BUG: when a Firebase Auth account exists but the matching `userProfiles/{uid}`
 * Firestore doc is missing (orphan account, manual deletion, race during signup),
 * the previous `login()` implementation never called `setUser`, leaving the user
 * stuck on the AuthStack with an open Firebase session.
 *
 * STRATÉGIE: Option C (refactor minimal). La logique de résolution du profil a
 * été extraite dans une pure function `resolveLoginProfile(docSnap, firebaseUser)`
 * exportée depuis `../loginHelpers` (fichier .ts sans JSX, indépendant du
 * Provider React). On la teste ici sans monter AuthContext — c'est le cœur du
 * fix F4 et c'est suffisant pour garantir la non-régression du branchement
 * `docSnap.exists() ? full : minimal`.
 *
 * Note: les side-effects (setUser + AsyncStorage.setItem + migrateAllGuestDataToAuth)
 * sont déjà couverts par d'autres tests (AuthContext.test.ts, migrateGuestData.test.ts).
 * Ce fichier verrouille la pure function — la seule branche où F4 pouvait régresser.
 */

import { resolveLoginProfile } from '../loginHelpers';

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const fakeDocSnap = (exists: boolean, data: Record<string, unknown> = {}) => ({
    exists: () => exists,
    data: () => data,
});

const fakeFbUser = (overrides: Partial<{ uid: string; email: string | null }> = {}) => ({
    uid: 'auth_uid_42',
    email: 'mom@example.com',
    ...overrides,
});

// ────────────────────────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('resolveLoginProfile — F4 minimal bootstrap', () => {
    describe('docSnap.exists() === false (F4 critical path)', () => {
        it('returns isMinimal: true so the caller can short-circuit migration + log warn', () => {
            const result = resolveLoginProfile(fakeDocSnap(false), fakeFbUser());

            expect(result.isMinimal).toBe(true);
        });

        it('synthesises a minimal profile carrying uid + email + isGuest:false (NOT isGuest:true)', () => {
            const { profile } = resolveLoginProfile(fakeDocSnap(false), fakeFbUser());

            expect(profile.uid).toBe('auth_uid_42');
            expect(profile.email).toBe('mom@example.com');
            // CRITICAL: an authenticated user with no Firestore doc is NOT a guest —
            // setting isGuest: true here would route writes back to AsyncStorage and
            // permanently orphan the data.
            expect(profile.isGuest).toBe(false);
        });

        it('initialises firstName and country to empty strings (signal for onboarding to prompt)', () => {
            const { profile } = resolveLoginProfile(fakeDocSnap(false), fakeFbUser());

            expect(profile.firstName).toBe('');
            expect(profile.country).toBe('');
        });

        it('normalises email: null Firebase email becomes undefined (Firestore-friendly)', () => {
            const { profile } = resolveLoginProfile(
                fakeDocSnap(false),
                fakeFbUser({ email: null })
            );

            expect(profile.email).toBeUndefined();
        });

        it('handles Firebase user with undefined email without crashing', () => {
            const { profile } = resolveLoginProfile(
                fakeDocSnap(false),
                fakeFbUser({ email: undefined as unknown as null })
            );

            expect(profile.email).toBeUndefined();
            expect(profile.uid).toBe('auth_uid_42');
        });
    });

    describe('docSnap.exists() === true (regular path)', () => {
        it('returns isMinimal: false', () => {
            const result = resolveLoginProfile(
                fakeDocSnap(true, {
                    firstName: 'Sarah',
                    country: 'Maroc',
                    pregnancyStartDate: '2025-01-01T00:00:00Z',
                    isGuest: false,
                }),
                fakeFbUser()
            );

            expect(result.isMinimal).toBe(false);
        });

        it('spreads all Firestore fields into the resulting profile', () => {
            const { profile } = resolveLoginProfile(
                fakeDocSnap(true, {
                    firstName: 'Sarah',
                    lastName: 'Bennani',
                    country: 'Maroc',
                    city: 'Casablanca',
                    pregnancyStartDate: '2025-01-01T00:00:00Z',
                    currentWeek: 14,
                }),
                fakeFbUser()
            );

            expect(profile.firstName).toBe('Sarah');
            expect(profile.lastName).toBe('Bennani');
            expect(profile.country).toBe('Maroc');
            expect(profile.city).toBe('Casablanca');
        });

        it('always overrides uid with the Firebase Auth uid (Firestore docs do NOT carry their id)', () => {
            const { profile } = resolveLoginProfile(
                // Even if Firestore happened to store a stale uid, it MUST be overwritten
                fakeDocSnap(true, {
                    uid: 'STALE_DO_NOT_USE',
                    firstName: 'X',
                    pregnancyStartDate: '2025-01-01T00:00:00Z',
                }),
                fakeFbUser({ uid: 'fresh_uid_999' })
            );

            expect(profile.uid).toBe('fresh_uid_999');
        });

        it('falls back pregnancyStartDate to lmp when the new field is missing (legacy docs)', () => {
            const { profile } = resolveLoginProfile(
                fakeDocSnap(true, {
                    firstName: 'Legacy',
                    lmp: '2024-12-01T00:00:00Z',
                    // pregnancyStartDate intentionally absent → legacy schema
                }),
                fakeFbUser()
            );

            expect(profile.pregnancyStartDate).toBe('2024-12-01T00:00:00Z');
        });

        it('prefers pregnancyStartDate over lmp when both are present', () => {
            const { profile } = resolveLoginProfile(
                fakeDocSnap(true, {
                    firstName: 'Modern',
                    lmp: '2024-11-01T00:00:00Z',          // stale
                    pregnancyStartDate: '2024-12-15T00:00:00Z', // current
                }),
                fakeFbUser()
            );

            expect(profile.pregnancyStartDate).toBe('2024-12-15T00:00:00Z');
        });
    });

    describe('regression guards', () => {
        it('does NOT mutate the docSnap.data() object (callers may reuse it)', () => {
            const fsData = {
                firstName: 'X',
                pregnancyStartDate: '2025-01-01T00:00:00Z',
            };
            const original = { ...fsData };

            resolveLoginProfile(fakeDocSnap(true, fsData), fakeFbUser());

            expect(fsData).toEqual(original);
        });

        it('returns a fresh profile object on each call (no shared reference)', () => {
            const a = resolveLoginProfile(fakeDocSnap(false), fakeFbUser());
            const b = resolveLoginProfile(fakeDocSnap(false), fakeFbUser());

            expect(a.profile).not.toBe(b.profile);
        });
    });
});
