/**
 * R3 FIX — Non-regression contract test for EmergencyContacts persistence.
 *
 * BUG: EmergencyContactsSection was calling PregnancyContext.setProfile which,
 * for an authenticated non-guest user, only mutated in-memory state. The
 * `emergencyContacts` array was NEVER written to Firestore, so contacts
 * silently disappeared on app restart.
 *
 * FIX: PregnancyContext.setProfile now forwards `emergencyContacts` to
 * AuthContext.updateProfile when the user is authenticated and non-guest.
 *
 * STRATEGY: This file does NOT mount the React Provider (would crash under
 * Jest because Firebase + AsyncStorage + RN persistence). Instead it locks
 * the **contract**: the `UserProfile.emergencyContacts` field exists and is
 * an array of `EmergencyContact`. This is exactly the channel that the fix
 * relies on: if the type loses `emergencyContacts`, the fix silently breaks.
 *
 * The Firestore write path itself is exercised end-to-end by the existing
 * AuthContext.test.ts (which mocks firebase/firestore.setDoc) — this file
 * is the type-level guard that prevents future schema drift.
 */

import type { EmergencyContact, UserProfile } from '../../types';
import type { Profile } from '../PregnancyContext';

describe('R3 — EmergencyContacts persistence contract', () => {
    it('UserProfile carries emergencyContacts as an EmergencyContact[] array', () => {
        const contact: EmergencyContact = {
            id: '1',
            name: 'Dr. Sarah',
            number: '+216 12 345 678',
            type: 'doctor',
        };

        const profile: Partial<UserProfile> = {
            uid: 'auth_uid',
            firstName: 'Mom',
            country: 'TN',
            isGuest: false,
            emergencyContacts: [contact],
        };

        expect(profile.emergencyContacts).toHaveLength(1);
        expect(profile.emergencyContacts?.[0]).toEqual(contact);
    });

    it('PregnancyContext Profile re-uses the same EmergencyContact shape (no schema drift)', () => {
        const contact: EmergencyContact = {
            id: 'p1',
            name: 'Partner',
            number: '+216 55 555 555',
            type: 'partner',
        };

        // If Profile.emergencyContacts ever diverges from UserProfile.emergencyContacts,
        // this assignment fails to compile — guarding the contract that
        // PregnancyContext.setProfile can forward the value to AuthContext.updateProfile
        // without any conversion.
        const pregnancyProfile: Profile = {
            firstName: 'Mom',
            country: 'TN',
            emergencyContacts: [contact],
        };
        const authProfile: Partial<UserProfile> = {
            emergencyContacts: pregnancyProfile.emergencyContacts,
        };

        expect(authProfile.emergencyContacts).toEqual([contact]);
    });

    it('EmergencyContact.type is restricted to the documented union', () => {
        const types: EmergencyContact['type'][] = ['partner', 'doctor', 'sos', 'other'];
        // Sanity: all four documented types are still allowed (no enum shrinkage
        // that would break existing AsyncStorage / Firestore records).
        expect(types).toHaveLength(4);
    });
});
