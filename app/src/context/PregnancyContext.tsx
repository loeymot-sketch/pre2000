import { createLogger } from '../utils/logger';
const log = createLogger('PregnancyContext');
// src/context/PregnancyContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { calculatePregnancyWeek } from '../utils/pregnancyCalculator';

export type Profile = {
    firstName: string;
    lastName?: string;
    country: string;
    lmp?: string; // ISO date string
    dpa?: string; // ISO date string
    prePregnancyWeight?: number; // kg - for weight tracking
    height?: number; // cm - for BMI calculation
    emergencyContacts?: EmergencyContact[];
};

export type EmergencyContact = {
    id: string;
    name: string;
    number: string;
    type: 'partner' | 'doctor' | 'sos' | 'other';
};

type PregnancyInfo = {
    week: number;
    dayInWeek: number;
};

type PregnancyContextType = {
    profile: Profile | null;
    setProfile: (p: Profile) => Promise<void>;
    pregnancyInfo: PregnancyInfo | null;
    loading: boolean;
};

const PregnancyContext = createContext<PregnancyContextType | undefined>(undefined);

export const PregnancyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [profile, setProfileState] = useState<Profile | null>(null);
    const [pregnancyInfo, setPregnancyInfo] = useState<PregnancyInfo | null>(null);
    const [loading, setLoading] = useState(true);

    // Debug: Component mount
    useEffect(() => {
        log.debug('[PregnancyContext] 🚀 Component mounted, user:', user?.uid);
    }, []);

    // Load existing profile on mount or when user changes
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (user) {
                    // OPTIMIZATION: Use data from AuthContext if available (it's already loaded from AsyncStorage/Firestore)
                    // Guests also have their LMP saved in AuthContext when they do onboarding
                    if (user.lmp || user.pregnancyStartDate) {
                        const profileData: Profile = {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            country: user.country,
                            lmp: user.lmp || user.pregnancyStartDate,
                            dpa: user.dpa
                        };
                        setProfileState(profileData);
                        computeInfo(profileData);
                        log.debug('[PregnancyContext] ⚡️ Used profile from AuthContext');
                    } else if (!user.isGuest) {
                        // Fallback to Firestore if AuthContext data is incomplete and not a guest
                        if (!user.uid) {
                            log.warn('[PregnancyContext] ⚠️ User object exists but has no UID, skipping Firestore load');
                            setLoading(false);
                            return;
                        }
                        const snap = await getDoc(doc(db, 'userProfiles', user.uid));
                        if (snap.exists()) {
                            const data = snap.data() as Profile;
                            setProfileState(data);
                            computeInfo(data);
                        }
                    }
                } else {
                    const stored = await AsyncStorage.getItem('guestProfile');
                    if (stored) {
                        const data = JSON.parse(stored) as Profile;
                        setProfileState(data);
                        computeInfo(data);
                    }
                }
            } catch (e) {
                log.error('[PregnancyContext] ❌ Error loading profile', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    // 🚀 AUTO-SYNC: Recalculate pregnancy info every hour
    useEffect(() => {
        log.debug('[PregnancyContext] 🔍 Auto-sync effect triggered, profile.lmp:', profile?.lmp);
        if (!profile) {
            log.debug('[PregnancyContext] ⚠️ No profile, skipping auto-sync setup');
            return;
        }

        log.debug('[PregnancyContext] 🔄 Setting up auto-sync interval');

        // Recalculate immediately
        computeInfo(profile);

        // Recalculate every hour (3600000 ms)
        const interval = setInterval(() => {
            log.debug('[PregnancyContext] ⏰ Auto-sync triggered');
            computeInfo(profile);
        }, 3600000); // 1 hour

        return () => {
            log.debug('[PregnancyContext] 🛑 Clearing auto-sync interval');
            clearInterval(interval);
        };
    }, [profile?.lmp]); // Depend on lmp to avoid recreating interval on profile object changes

    const computeInfo = (p: Profile) => {
        let lmpDate: Date | null = null;

        if (p.lmp) {
            // Standard case: LMP is directly available
            lmpDate = new Date(p.lmp);
        } else if (p.dpa) {
            // NEW-03 FIX: DPA (Due Date) = LMP + 280 days → LMP = DPA - 280 days
            // CRITICAL: Using DPA directly as LMP would give ~week 80, a medical impossibility.
            const dpa = new Date(p.dpa);
            lmpDate = new Date(dpa.getTime() - 280 * 24 * 60 * 60 * 1000);
            log.debug('[PregnancyContext] 🔄 Derived LMP from DPA:', lmpDate.toISOString());
        }

        if (!lmpDate) {
            log.debug('[PregnancyContext] ⚠️ No LMP or DPA found');
            return;
        }

        const { week, day } = calculatePregnancyWeek(lmpDate);
        log.debug(`[PregnancyContext] 📊 Week ${week}, Day ${day}`);
        setPregnancyInfo({ week, dayInWeek: day });
    };

    const setProfile = async (p: Profile) => {
        setLoading(true);
        try {
            // NEW-05 FIX: PregnancyContext.setProfile only manages LOCAL state.
            // For authenticated users, Firestore is written by AuthContext.updateProfile (called by ProfileScreen).
            // This eliminates the double Firestore write to userProfiles.
            if (!user || user.isGuest) {
                await AsyncStorage.setItem('guestProfile', JSON.stringify(p));
            }
            // For auth users: only update in-memory state. AuthContext owns Firestore.
            setProfileState(p);
            computeInfo(p);
        } catch (e) {
            log.error('[PregnancyContext] ❌ Error setting profile', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PregnancyContext.Provider value={{ profile, setProfile, pregnancyInfo, loading }}>
            {children}
        </PregnancyContext.Provider>
    );
};

export const usePregnancy = () => {
    const context = useContext(PregnancyContext);
    if (!context) throw new Error('usePregnancy must be used within PregnancyProvider');
    return context;
};
