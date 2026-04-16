import { createLogger } from '../utils/logger';
const log = createLogger('AuthContext');

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { UserProfile } from '../types';
import { calculateCurrentWeek } from '../utils/pregnancyCalculator';
import { migrateAllGuestDataToAuth } from '../services/reminderPersistence';
import { clearContentCache } from '../services/contentService';
import { cancelAllNotifications } from '../services/notificationService';

// NEW-01 & NEW-02 FIX: Single source of truth for ALL private local data keys.
// Any key added here is automatically purged on logout, resetProfile, and deleteAccount.
const PRIVATE_STORAGE_KEYS = [
    'user_profile',
    'guestProfile',
    // NOTE: 'app_locale' intentionally NOT purged — language is a device preference, not per-session
    '@pregnancy_context',
    '@reminder_settings_v1',
    '@task_statuses_v1',
    '@baby_message_enabled_v1',
    '@baby_message_hour_v1',
    'reminder_settings_v2',
    'reminders_v2_settings_guest',       // RemindersV2Service guest settings
    'reminders_v2_completions',          // NOTIF-06: streak/completion data
    '@rdv_reminders',                    // RDV notification records (@ prefix required)
    '@rdv_preferences',                  // RDV user preferences (@ prefix required)
    'in_app_review_actions_count',       // STORAGE-FIX: Review trigger count
    'in_app_review_last_prompt',         // STORAGE-FIX: Last review prompt date
    'in_app_review_install_date',        // STORAGE-FIX: App install date for review
] as const;

interface AuthContextType {
    user: UserProfile | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    register: (email: string, password: string) => Promise<FirebaseUser>;
    login: (email: string, password: string) => Promise<void>;
    loginAsGuest: (
        firstName: string,
        pregnancyStartDate: Date,
        country: string,
        lastName?: string,
        city?: string,
        ageRange?: string,
        isFirstPregnancy?: boolean,
        authenticatedUser?: FirebaseUser  // NEW: Pass the firebase user directly
    ) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    setLocale: (locale: string) => Promise<void>;
    resetProfile: () => Promise<void>;
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // 1. Try to restore from AsyncStorage first (fastest)
        const loadLocalUser = async () => {
            try {
                const storedProfile = await AsyncStorage.getItem('user_profile');
                if (storedProfile) {
                    const profile = JSON.parse(storedProfile);
                    setUser(profile);
                    log.debug('[AuthContext] ⚡️ Restored user from AsyncStorage');
                }
            } catch (e) {
                log.error('Failed to load local user', e);
            }
        };
        loadLocalUser();

        // 2. Listen to Firebase auth state (source of truth)
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);
            if (fbUser) {
                // Load profile from Firestore for authenticated users
                try {
                    const docSnap = await getDoc(doc(db, 'userProfiles', fbUser.uid));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // FIX: Add uid from Firebase auth (it's not stored in Firestore document)
                        // FIX: Ensure pregnancyStartDate exists, fallback to lmp if missing (backward compatibility)
                        const profile = {
                            ...data,
                            uid: fbUser.uid, // CRITICAL: Add UID from Firebase auth
                            pregnancyStartDate: data.pregnancyStartDate || data.lmp
                        } as UserProfile;

                        // Recalculate current week to ensure it's up to date
                        if (profile.pregnancyStartDate) {
                            const lmpDate = new Date(profile.pregnancyStartDate);
                            const calculatedWeek = calculateCurrentWeek(lmpDate);

                            if (calculatedWeek !== profile.currentWeek) {
                                log.debug(`[AuthContext] 🔄 Updating current week from ${profile.currentWeek} to ${calculatedWeek}`);
                                profile.currentWeek = calculatedWeek;
                                // Update in Firestore silently
                                setDoc(doc(db, 'userProfiles', fbUser.uid), { currentWeek: calculatedWeek }, { merge: true });
                            }
                        }

                        setUser(profile);
                        await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
                    }
                } catch (error) {
                    log.error('Failed to load user profile:', error);
                }
            }
            // Don't load guest profile automatically - let user go through auth flow
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const register = async (email: string, password: string): Promise<FirebaseUser> => {
        log.debug('[AuthContext] 📝 Registering new user:', email);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            setFirebaseUser(userCredential.user);
            log.debug('[AuthContext] ✅ User registered successfully:', userCredential.user.uid);
            // Return the user so it can be passed to loginAsGuest immediately
            return userCredential.user;
        } catch (error) {
            log.error('[AuthContext] ❌ Registration error:', error);
            throw error;
        }
    };

    const login = async (email: string, password: string) => {
        log.debug('[AuthContext] 🔐 Logging in user:', email);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setFirebaseUser(userCredential.user);
            log.debug('[AuthContext] ✅ User logged in:', userCredential.user.uid);

            // Load profile
            const docSnap = await getDoc(doc(db, 'userProfiles', userCredential.user.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                // BUG FIX: Firestore docs don't store their own ID — must inject uid from Auth
                const profile = {
                    ...data,
                    uid: userCredential.user.uid,
                    pregnancyStartDate: data.pregnancyStartDate || data.lmp,
                } as UserProfile;
                setUser(profile);
                await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
                log.debug('[AuthContext] ✅ User profile loaded from Firestore');

                // P1 FIX: Auto-migrate any guest data (tasks, reminders) to Firestore
                try {
                    await migrateAllGuestDataToAuth(userCredential.user.uid);
                    log.info('[AuthContext] ✅ Guest data migration completed after login');
                } catch (migrationError) {
                    log.warn('[AuthContext] ⚠️ Guest data migration failed (non-blocking):', migrationError);
                }
            } else {
                log.warn('[AuthContext] ⚠️ User profile not found in Firestore');
            }
        } catch (error) {
            log.error('[AuthContext] ❌ Login error:', error);
            throw error;
        }
    };

    const loginAsGuest = async (
        firstName: string,
        pregnancyStartDate: Date,
        country: string,
        lastName?: string,
        city?: string,
        ageRange?: string,
        isFirstPregnancy?: boolean,
        authenticatedUser?: FirebaseUser  // NEW: Pass the firebase user directly (fixes timing issue)
    ) => {
        // Use passed authenticatedUser OR the state firebaseUser
        const effectiveUser = authenticatedUser || firebaseUser;
        const isAuthenticated = !!effectiveUser;
        const uid = effectiveUser?.uid || 'guest_' + Date.now();

        log.debug('[AuthContext] 👤 Creating profile:', {
            firstName,
            country,
            city,
            ageRange,
            isAuthenticated,
            uid,
            hasAuthenticatedUser: !!authenticatedUser,
            hasFirebaseUser: !!firebaseUser
        });

        const currentWeek = calculateCurrentWeek(pregnancyStartDate);
        log.debug('[AuthContext] 📅 Calculated current week:', currentWeek);

        const newUser: UserProfile = {
            uid,
            email: effectiveUser?.email || undefined,
            firstName,
            lastName,
            pregnancyStartDate: pregnancyStartDate.toISOString(), // For AuthContext
            lmp: pregnancyStartDate.toISOString(), // For PregnancyContext - CRITICAL!
            currentWeek,
            country,
            city,
            ageRange,
            isFirstPregnancy,
            isGuest: !isAuthenticated,
        };

        try {
            if (isAuthenticated) {
                // Save to Firestore for authenticated users
                // IMPORTANT: Firestore doesn't accept undefined values, so we filter them out
                log.debug('[AuthContext] 💾 Saving to Firestore for authenticated user:', uid);

                const profileData: Record<string, any> = {
                    firstName,
                    lmp: pregnancyStartDate.toISOString(),
                    pregnancyStartDate: pregnancyStartDate.toISOString(), // FIX: Explicitly save pregnancyStartDate
                    dpa: new Date(pregnancyStartDate.getTime() + 280 * 24 * 60 * 60 * 1000).toISOString(), // 280 days
                    country,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                // Only add optional fields if they are defined
                if (lastName !== undefined) profileData.lastName = lastName;
                if (city !== undefined) profileData.city = city;
                if (ageRange !== undefined) profileData.ageRange = ageRange;
                if (isFirstPregnancy !== undefined) profileData.isFirstPregnancy = isFirstPregnancy;

                await setDoc(doc(db, 'userProfiles', uid), profileData, { merge: true });
                log.debug('[AuthContext] ✅ Profile saved to Firestore');
            }

            // Also save to AsyncStorage for offline access
            await AsyncStorage.setItem('user_profile', JSON.stringify(newUser));
            log.debug('[AuthContext] ✅ Profile saved to AsyncStorage');
            log.debug('[AuthContext] 📅 LMP saved:', pregnancyStartDate.toISOString());

            setUser(newUser);
        } catch (error) {
            log.error('[AuthContext] ❌ Failed to save profile:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (firebaseUser) {
                await signOut(auth);
            }
            
            // NEW: Cancel native ghost notifications
            try {
                await cancelAllNotifications();
                log.info('[AuthContext] 🧹 All local notifications cancelled (Auth)');
            } catch (err) {
                log.warn('[AuthContext] ⚠️ Failed to cancel notifications:', err);
            }

            // NEW-01 & NEW-02 FIX: Purge ALL private data (shared constant = no key ever missed)
            await AsyncStorage.multiRemove([...PRIVATE_STORAGE_KEYS]);
            // Clear in-memory Firestore content cache (articles, supplements)
            clearContentCache();
            log.info('[AuthContext] 🧹 All local data purged on logout');
            setUser(null);
            setFirebaseUser(null);
        } catch (error) {
            log.error('Failed to logout:', error);
        }
    };

    const updateProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;
        const updatedUser = { ...user, ...data };
        try {
            await AsyncStorage.setItem('user_profile', JSON.stringify(updatedUser));

            // Only update Firestore if not a guest and authenticated
            if (!user.isGuest && firebaseUser) {
                // BUG FIX: Only write safe server fields to Firestore.
                // Never write client-only fields like isGuest, uid, currentWeek (recalculated on load).
                const { isGuest, uid, currentWeek, ...serverSafeData } = data;
                if (Object.keys(serverSafeData).length > 0) {
                    await setDoc(
                        doc(db, 'userProfiles', user.uid),
                        { ...serverSafeData, updatedAt: new Date().toISOString() },
                        { merge: true }
                    );
                }
            }

            setUser(updatedUser);
        } catch (error) {
            log.error('Failed to update profile:', error);
        }
    };

    const setLocale = async (locale: string) => {
        try {
            await AsyncStorage.setItem('app_locale', locale);
            if (user) {
                await updateProfile({ locale });
            }
        } catch (error) {
            log.error('Failed to set locale:', error);
        }
    };

    const resetProfile = async () => {
        try {
            // Delete from Firestore if authenticated user
            if (firebaseUser) {
                const userDocRef = doc(db, 'userProfiles', firebaseUser.uid);
                await deleteDoc(userDocRef);
                await signOut(auth);
            }

            // NEW: Cancel native ghost notifications
            try {
                await cancelAllNotifications();
            } catch (err) {
                log.warn('[AuthContext] ⚠️ Failed to cancel notifications:', err);
            }

            // NEW-01 FIX: Purge ALL private keys including reminder/task data
            await AsyncStorage.multiRemove([...PRIVATE_STORAGE_KEYS]);

            // Reset states
            setUser(null);
            setFirebaseUser(null);

            log.debug('[AuthContext] ✅ Profile reset complete — all local data purged');
        } catch (error) {
            log.error('Failed to reset profile:', error);
            throw error;
        }
    };

    const deleteAccount = async () => {
        try {
            if (firebaseUser) {
                const uid = firebaseUser.uid;
                log.debug('[AuthContext] Starting account deletion for:', uid);

                // BUG FIX: App stores data in TOP-LEVEL collections, not subcollections.
                // These must all be queried by user_id and deleted. GDPR compliance.
                const topLevelCollectionsToDelete = [
                    'userTasks',
                    'userEvents',
                    'healthMetrics',
                    'userReminderSettings',
                    'userTaskStatuses',
                    'weight_entries',       // FIX: Added - used by weightService.ts
                    'reminder_settings_v2', // FIX: Added - used by remindersV2Service.ts
                ];

                // 1. Delete Firestore Data (User Profile) - Do this first or alongside collections
                const userDocRef = doc(db, 'userProfiles', uid);
                await deleteDoc(userDocRef);
                log.debug('[AuthContext] Firestore profile deleted');

                for (const colName of topLevelCollectionsToDelete) {
                    try {
                        const colRef = collection(db, colName);
                        const q = query(colRef, where('user_id', '==', uid));
                        const snap = await getDocs(q);
                        log.debug(`[AuthContext] Deleting ${snap.size} docs from ${colName}`);

                        // RGPD FIX: writeBatch cannot be reused after commit().
                        // We must create a fresh batch after every 400-doc commit.
                        let batch = writeBatch(db);
                        let counter = 0;
                        for (const document of snap.docs) {
                            batch.delete(document.ref);
                            counter++;
                            if (counter >= 400) {
                                await batch.commit();
                                batch = writeBatch(db); // CRITICAL: create fresh batch
                                counter = 0;
                            }
                        }
                        if (counter > 0) await batch.commit();
                    } catch (err) {
                        log.warn(`[AuthContext] Failed to cleanup collection ${colName}`, err);
                    }
                }

                // Also clean any legacy subcollections under userProfiles
                const legacySubCollections = ['weights', 'events', 'journal', 'chatbot_history'];
                for (const subColName of legacySubCollections) {
                    try {
                        const subColRef = collection(db, 'userProfiles', uid, subColName);
                        const subSnap = await getDocs(subColRef);
                        if (subSnap.size > 0) {
                            // RGPD FIX: Same batching logic for subcollections
                            let batch = writeBatch(db);
                            let counter = 0;
                            for (const d of subSnap.docs) {
                                batch.delete(d.ref);
                                counter++;
                                if (counter >= 400) {
                                    await batch.commit();
                                    batch = writeBatch(db);
                                    counter = 0;
                                }
                            }
                            if (counter > 0) await batch.commit();
                        }
                    } catch (err) {
                        log.warn(`[AuthContext] Failed to cleanup subcollection ${subColName}`, err);
                    }
                }

                // 2. Delete Firebase Auth User (Must happen LAST so Firestore rules still apply)
                await firebaseUser.delete();
                log.debug('[AuthContext] Firebase Auth user deleted');

                // NEW: Cancel native ghost notifications
                try {
                    await cancelAllNotifications();
                } catch (err) {
                    log.warn('[AuthContext] ⚠️ Failed to cancel notifications:', err);
                }

                // 3. Clear Local Storage (use shared constant — no key is missed)
                await AsyncStorage.multiRemove([...PRIVATE_STORAGE_KEYS]);

                // 4. Reset State
                setUser(null);
                setFirebaseUser(null);
            }
        } catch (error) {
            log.error('Failed to delete account:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
            register,
            login,
            loginAsGuest,
            logout,
            updateProfile,
            setLocale,
            resetProfile,
            deleteAccount
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
