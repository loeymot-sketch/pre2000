/**
 * Pure helpers extracted from AuthContext.tsx for unit-testability.
 *
 * Kept in a `.ts` (no JSX) file so tests can import these helpers without
 * loading AuthContext.tsx — which pulls in Firebase, Sentry, RN persistence,
 * and a JSX Provider, all of which crash under Jest/Node.
 */

import { UserProfile } from '../types';

/**
 * Result of resolving the post-login profile from a Firestore snapshot.
 * `isMinimal` is `true` when the Firestore `userProfiles/{uid}` doc is missing
 * and we synthesised a placeholder so the app can still render (F4 fix).
 */
export interface ResolvedLoginProfile {
    profile: UserProfile;
    isMinimal: boolean;
}

/**
 * Build the post-login `UserProfile` from a Firestore docSnap + Firebase user.
 *
 * Two branches:
 *  - docSnap.exists() === true  → spread Firestore data, inject uid (Firestore docs
 *    don't carry their own id), and fall back `pregnancyStartDate` to `lmp` for
 *    backward-compat with old profile shapes.
 *  - docSnap.exists() === false → return a minimal placeholder (uid + email only,
 *    isGuest: false) so the app can render MainTabs and prompt the user to
 *    complete onboarding. This is the F4 fix: previously `setUser` was never
 *    called in this branch and the user got stuck on AuthStack with an open
 *    Firebase session.
 *
 * Pure: no I/O, no React state, no globals. Safe to unit-test.
 */
export const resolveLoginProfile = (
    docSnap: { exists: () => boolean; data: () => any },
    firebaseUser: { uid: string; email: string | null | undefined }
): ResolvedLoginProfile => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        const profile = {
            ...data,
            uid: firebaseUser.uid,
            pregnancyStartDate: data.pregnancyStartDate || data.lmp,
        } as UserProfile;
        return { profile, isMinimal: false };
    }
    const minimal = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        firstName: '',
        country: '',
        isGuest: false,
    } as unknown as UserProfile;
    return { profile: minimal, isMinimal: true };
};
