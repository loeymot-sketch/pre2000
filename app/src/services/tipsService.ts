import { createLogger } from '../utils/logger';
const log = createLogger('tipsService');

/**
 * TIPS SERVICE (Antigravity)
 * Manages daily pregnancy tips (280 tips across 40 weeks × 7 days)
 * Each tip has short/long versions in FR/AR/EN
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Tip } from '../types';

/**
 * Get tip for specific week and day
 */
export const getTipForDay = async (week: number, day: number): Promise<Tip | null> => {
    log.info(`[TipsService] 📖 Fetching tip for Week ${week}, Day ${day}`);

    try {
        const tipId = `tip_w${String(week).padStart(2, '0')}_d${String(day).padStart(2, '0')}`;
        const tipDoc = await getDoc(doc(db, 'tips', tipId));

        if (tipDoc.exists()) {
            const data = tipDoc.data() as Tip;
            log.info(`[TipsService] ✅ Found tip: ${tipId}`, data.short_fr?.substring(0, 50) + '...');
            return data;
        } else {
            log.warn(`[TipsService] ⚠️ No tip found for ${tipId}`);
            return null;
        }
    } catch (error: any) {
        if (error.code !== 'unavailable' && error.name !== 'AbortError') {
            log.error('[TipsService] ❌ Error fetching tip:', error);
        }
        return null;
    }
};

/**
 * Get all tips for a specific week (7 tips)
 */
export const getTipsForWeek = async (week: number): Promise<Tip[]> => {
    log.info(`[TipsService] 📚 Fetching all tips for Week ${week}`);

    try {
        const q = query(
            collection(db, 'tips'),
            where('week', '==', week)
        );

        const snapshot = await getDocs(q);
        const tips = snapshot.docs.map(doc => doc.data() as Tip);

        // Sort by day
        tips.sort((a, b) => a.day - b.day);

        log.info(`[TipsService] ✅ Found ${tips.length} tips for week ${week}`);
        return tips;
    } catch (error) {
        log.error('[TipsService] ❌ Error fetching tips for week:', error);
        return [];
    }
};

/**
 * Get tips by category
 */
export const getTipsByCategory = async (category: string): Promise<Tip[]> => {
    log.info(`[TipsService] 🏷️ Fetching tips for category: ${category}`);

    try {
        const q = query(
            collection(db, 'tips'),
            where('category', '==', category)
        );

        const snapshot = await getDocs(q);
        const tips = snapshot.docs.map(doc => doc.data() as Tip);

        log.info(`[TipsService] ✅ Found ${tips.length} tips in category ${category}`);
        return tips;
    } catch (error) {
        log.error('[TipsService] ❌ Error fetching tips by category:', error);
        return [];
    }
};

/**
 * Get random tip (for variety)
 */
export const getRandomTip = async (): Promise<Tip | null> => {
    log.info('[TipsService] 🎲 Fetching random tip');

    try {
        const randomWeek = Math.floor(Math.random() * 40) + 1;
        const randomDay = Math.floor(Math.random() * 7) + 1;

        return await getTipForDay(randomWeek, randomDay);
    } catch (error) {
        log.error('[TipsService] ❌ Error fetching random tip:', error);
        return null;
    }
};
