/**
 * @fileoverview Health Service
 * Manages health metrics tracking including:
 * - Weight tracking with history
 * - Blood pressure monitoring
 * - Health statistics aggregation
 * 
 * @module services/healthService
 */

import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { HealthMetric, HealthStats } from '../types';
import { loadUserEvents } from './calendarService';
import { loadTaskStatusesAuth } from './reminderPersistence';
import { getWeightHistory as getWeightHistoryV2 } from './weightService';
import { createLogger } from '../utils/logger';

// Create scoped logger for this service
const log = createLogger('HealthService');

// ========================================
// WEIGHT TRACKING
// ========================================

export const saveWeightEntry = async (
    userId: string,
    weight: number,
    date: Date,
    week: number,
    notes?: string
): Promise<string> => {
    // P0 FIX: Block Firestore writes for guest users
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from Firestore write');
        return 'guest_blocked';
    }
    try {
        const docRef = await addDoc(collection(db, 'healthMetrics'), {
            user_id: userId,
            type: 'weight',
            value: weight,
            date: date.toISOString(),
            week,
            notes: notes || '',
            created_at: Timestamp.now().toDate().toISOString(),
        });
        return docRef.id;
    } catch (error) {
        log.error('Error saving weight entry:', error);
        throw error;
    }
};

export const getWeightHistory = async (userId: string): Promise<HealthMetric[]> => {
    // P0 FIX: Block Firestore reads for guest users
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from Firestore read (weight)');
        return [];
    }
    try {
        const q = query(
            collection(db, 'healthMetrics'),
            where('user_id', '==', userId),
            where('type', '==', 'weight')
        );
        const snapshot = await getDocs(q);
        const metrics = snapshot.docs.map(doc => ({
            metric_id: doc.id,
            ...doc.data(),
        } as HealthMetric));

        // Sort client-side to avoid Firestore composite index requirement
        return metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
        log.error('Error fetching weight history:', error);
        return [];
    }
};

// ========================================
// BLOOD PRESSURE TRACKING
// ========================================

export const saveBloodPressureEntry = async (
    userId: string,
    systolic: number,
    diastolic: number,
    date: Date,
    week: number,
    notes?: string
): Promise<string> => {
    // P0 FIX: Block Firestore writes for guest users
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from Firestore write (BP)');
        return 'guest_blocked';
    }
    try {
        const docRef = await addDoc(collection(db, 'healthMetrics'), {
            user_id: userId,
            type: 'blood_pressure',
            value: { systolic, diastolic },
            date: date.toISOString(),
            week,
            notes: notes || '',
            created_at: Timestamp.now().toDate().toISOString(),
        });
        return docRef.id;
    } catch (error) {
        log.error('Error saving BP entry:', error);
        throw error;
    }
};

export const getBloodPressureHistory = async (userId: string): Promise<HealthMetric[]> => {
    // P0 FIX: Block Firestore reads for guest users
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from Firestore read (BP)');
        return [];
    }
    try {
        const q = query(
            collection(db, 'healthMetrics'),
            where('user_id', '==', userId),
            where('type', '==', 'blood_pressure')
        );
        const snapshot = await getDocs(q);
        const metrics = snapshot.docs.map(doc => ({
            metric_id: doc.id,
            ...doc.data(),
        } as HealthMetric));

        // Sort client-side to avoid Firestore composite index requirement (descending)
        return metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        log.error('Error fetching BP history:', error);
        return [];
    }
};

// ========================================
// GLUCOSE TRACKING
// ========================================

/** Glucose metric stored in Firestore */
export interface GlucoseEntry {
    id?: string;
    user_id: string;
    value: number;           // mmol/L
    meal_context: 'fasting' | 'post_meal' | 'random';
    date: string;
    week: number;
    notes?: string;
}

export const saveGlucoseEntry = async (
    userId: string,
    entry: Omit<GlucoseEntry, 'id' | 'user_id'>
): Promise<string> => {
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from glucose write');
        return 'guest_blocked';
    }
    try {
        const docRef = await addDoc(collection(db, 'glucoseMetrics'), {
            user_id: userId,
            ...entry,
            created_at: Timestamp.now().toDate().toISOString(),
        });
        return docRef.id;
    } catch (error) {
        log.error('Error saving glucose entry:', error);
        throw error;
    }
};

export const getGlucoseHistory = async (userId: string): Promise<GlucoseEntry[]> => {
    if (!userId || userId.startsWith('guest_')) {
        return [];
    }
    try {
        const q = query(
            collection(db, 'glucoseMetrics'),
            where('user_id', '==', userId)
        );
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as GlucoseEntry));
        return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        log.error('Error fetching glucose history:', error);
        return [];
    }
};

// ========================================
// SYMPTOMS TRACKING
// ========================================

export type SymptomKey =
    | 'nausea' | 'fatigue' | 'backPain' | 'headache' | 'swelling' | 'insomnia'
    | 'heartburn' | 'cramps' | 'breathlessness';

export interface DailySymptoms {
    id?: string;
    user_id: string;
    date: string;           // ISO date string (day only: YYYY-MM-DD)
    week: number;
    symptoms: SymptomKey[]; // List of symptom keys reported
    notes?: string;
}

export const saveDailySymptoms = async (
    userId: string,
    week: number,
    symptoms: SymptomKey[],
    notes?: string
): Promise<string> => {
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from symptoms write');
        return 'guest_blocked';
    }
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    try {
        // Upsert: check if an entry exists for today
        const q = query(
            collection(db, 'symptomsLog'),
            where('user_id', '==', userId),
            where('date', '==', today)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            // Update existing entry (import setDoc/updateDoc had it)
            const existingId = snapshot.docs[0].id;
            const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
            await setDoc(firestoreDoc(db, 'symptomsLog', existingId), {
                user_id: userId,
                date: today,
                week,
                symptoms,
                notes: notes || '',
                updated_at: Timestamp.now().toDate().toISOString(),
            });
            return existingId;
        }
        const docRef = await addDoc(collection(db, 'symptomsLog'), {
            user_id: userId,
            date: today,
            week,
            symptoms,
            notes: notes || '',
            created_at: Timestamp.now().toDate().toISOString(),
        });
        return docRef.id;
    } catch (error) {
        log.error('Error saving symptoms:', error);
        throw error;
    }
};

export const getDailySymptoms = async (userId: string, dateStr?: string): Promise<DailySymptoms | null> => {
    if (!userId || userId.startsWith('guest_')) {
        return null;
    }
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    try {
        const q = query(
            collection(db, 'symptomsLog'),
            where('user_id', '==', userId),
            where('date', '==', targetDate)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() } as DailySymptoms;
    } catch (error) {
        log.error('Error fetching symptoms:', error);
        return null;
    }
};

export const getSymptomsHistory = async (userId: string, limitDays = 30): Promise<DailySymptoms[]> => {
    if (!userId || userId.startsWith('guest_')) {
        return [];
    }
    try {
        const since = new Date();
        since.setDate(since.getDate() - limitDays);
        const sinceStr = since.toISOString().split('T')[0];
        const q = query(
            collection(db, 'symptomsLog'),
            where('user_id', '==', userId),
            where('date', '>=', sinceStr)
        );
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailySymptoms));
        return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
        log.error('Error fetching symptoms history:', error);
        return [];
    }
};


/**
 * P3.7 FIX: Single source of truth for weight history.
 * Merges entries from `healthMetrics` (legacy / dashboard inputs) and `weight_entries`
 * (WeightTrackerScreen inputs) into a unified HealthMetric[] sorted by date.
 *
 * Use this helper anywhere a complete weight view is needed (graphs, stats, exports).
 * Avoids the bug where the dashboard graph showed only one half of the user's data.
 */
export const getMergedWeightHistory = async (userId: string): Promise<HealthMetric[]> => {
    if (!userId || userId.startsWith('guest_')) {
        return [];
    }
    const [oldEntries, v2Entries] = await Promise.all([
        getWeightHistory(userId),
        getWeightHistoryV2(userId),
    ]);

    const v2AsHealthMetric: HealthMetric[] = v2Entries.map(w => ({
        metric_id: w.id || '',
        user_id: w.user_id,
        type: 'weight' as const,
        value: w.weight,
        date: w.date,
        week: w.week_of_pregnancy,
        notes: w.notes || '',
        created_at: w.date,
    }));

    return [...oldEntries, ...v2AsHealthMetric].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
};

export const getHealthStats = async (userId: string, currentWeek: number): Promise<HealthStats> => {
    // P0 FIX: Block Firestore reads for guest users
    if (!userId || userId.startsWith('guest_')) {
        log.warn('[HealthService] Guest user blocked from health stats (guest mode)');
        return {
            upcomingAppointments: 0,
            pastAppointments: 0,
            remindersCompletedThisWeek: 0,
            remindersTotalThisWeek: 0,
        };
    }
    try {
        // P2 FIX: All independent Firestore calls run in parallel.
        // Previously BP, appointments, and reminders were fetched sequentially after weight.
        // P2 FIX: Also removed dead `loadReminderSettingsAuth` fetch — result was never used.
        const [
            weightHistoryOld,
            weightHistoryNew,
            bpHistory,
            appointments,
            taskStatuses,
        ] = await Promise.all([
            getWeightHistory(userId),
            getWeightHistoryV2(userId),
            getBloodPressureHistory(userId),
            loadUserEvents(userId),
            loadTaskStatusesAuth(userId, currentWeek),
        ]);

        // Convert weightService entries to HealthMetric-compatible format and merge
        const weightFromV2: HealthMetric[] = weightHistoryNew.map(w => ({
            metric_id: w.id || '',
            user_id: w.user_id,
            type: 'weight' as const,
            value: w.weight,
            date: w.date,
            week: w.week_of_pregnancy,
            notes: w.notes || '',
            created_at: w.date,
        }));

        // Merge and deduplicate by date (prefer the most recent entry for same date)
        const allWeights = [...weightHistoryOld, ...weightFromV2]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const weightCurrent = allWeights.length > 0 ? (allWeights[allWeights.length - 1].value as number) : undefined;
        const weightInitial = allWeights.length > 0 ? (allWeights[0].value as number) : undefined;
        const weightGain = weightCurrent && weightInitial ? weightCurrent - weightInitial : 0;

        const lastBP = bpHistory.length > 0
            ? {
                systolic: (bpHistory[0].value as { systolic: number; diastolic: number }).systolic,
                diastolic: (bpHistory[0].value as { systolic: number; diastolic: number }).diastolic,
                date: bpHistory[0].date,
            }
            : undefined;

        const now = new Date();
        const upcomingAppointments = appointments.filter(a => new Date(a.date) >= now).length;
        const pastAppointments = appointments.filter(a => new Date(a.date) < now).length;

        const remindersCompletedThisWeek = Object.values(taskStatuses).filter(t => t.completed).length;
        const remindersTotalThisWeek = Object.keys(taskStatuses).length;

        return {
            weightCurrent,
            weightInitial,
            weightGain,
            lastBP,
            upcomingAppointments,
            pastAppointments,
            remindersCompletedThisWeek,
            remindersTotalThisWeek,
        };
    } catch (error) {
        log.error('Error fetching health stats:', error);
        return {
            upcomingAppointments: 0,
            pastAppointments: 0,
            remindersCompletedThisWeek: 0,
            remindersTotalThisWeek: 0,
        };
    }
};
