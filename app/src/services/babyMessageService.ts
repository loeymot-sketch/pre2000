import { createLogger } from '../utils/logger';
const log = createLogger('babyMessageService');

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BabyMessage } from '../types';
import { scheduleBabyMessage, cancelBabyMessage } from './notificationService';
import { loadBabyMessageEnabled, loadBabyMessageHour } from './reminderPersistence';
import i18n from '../i18n';

/**
 * Baby Message Service for V1.2
 * Handles daily baby messages adapted to pregnancy week
 */

/**
 * NOTIF-04 FIX: Private helper — single source of truth for locale-aware content selection.
 * Avoids the duplicated if-chain that existed in scheduleTodaysBabyMessage AND updateBabyMessageSchedule.
 */
const getBabyMessageContent = (message: BabyMessage, locale: string): string => {
    if (locale === 'en' && message.message_en) return message.message_en;
    if (locale === 'ar' && message.message_ar) return message.message_ar;
    if (locale === 'tn') {
        // TN: prefer Tunisian Arabic, fallback to Standard Arabic, then French
        return message.message_tn || message.message_ar || message.message_fr;
    }
    return message.message_fr; // Default: French
};

/**
 * Fetch all baby messages for a specific week
 */
export const getBabyMessagesForWeek = async (weekNumber: number): Promise<BabyMessage[]> => {
    log.info('[babyMessageService] Fetching messages for week:', weekNumber);

    try {
        const q = query(
            collection(db, 'babyMessages'),
            where('week', '==', weekNumber)
        );

        const snapshot = await getDocs(q);
        const messages = snapshot.docs.map(doc => doc.data() as BabyMessage);

        log.info('[babyMessageService] Found', messages.length, 'messages for week', weekNumber);
        return messages;
    } catch (error: any) {
        if (error.code !== 'unavailable' && error.name !== 'AbortError') {
            log.error('[babyMessageService] Error fetching messages:', error);
        }
        return [];
    }
};

/**
 * Get today's baby message for the current week
 * Uses day of week (0-6) to pick message
 */
export const getTodaysBabyMessage = async (weekNumber: number): Promise<BabyMessage | null> => {
    log.info('[babyMessageService] Getting today\'s message for week:', weekNumber);

    try {
        const messages = await getBabyMessagesForWeek(weekNumber);

        if (messages.length === 0) {
            log.warn('[babyMessageService] No messages found for week', weekNumber);
            return null;
        }

        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const today = new Date().getDay();

        // Try to find message for today (day 1-7 in our data = Sunday-Saturday)
        const dayNumber = today === 0 ? 7 : today; // Convert Sunday from 0 to 7
        let message = messages.find(m => m.day === dayNumber);

        // Fallback: pick random message if exact day not found
        if (!message) {
            const randomIndex = Math.floor(Math.random() * messages.length);
            message = messages[randomIndex];
            log.info('[babyMessageService] Day', dayNumber, 'not found, using random message');
        }

        log.info('[babyMessageService] Selected message:', message.message_id);
        return message;
    } catch (error: any) {
        if (error.code !== 'unavailable' && error.name !== 'AbortError') {
            log.error('[babyMessageService] Error getting today\'s message:', error);
        }
        return null;
    }
};

/**
 * Get baby message for specific week and day
 * Similar to getTipForDay for consistency
 */
export const getMessageForDay = async (week: number, day: number): Promise<BabyMessage | null> => {
    log.info(`[babyMessageService] 💝 Fetching message for Week ${week}, Day ${day}`);

    try {
        const messages = await getBabyMessagesForWeek(week);

        if (messages.length === 0) {
            log.warn(`[babyMessageService] ⚠️  No messages found for week ${week}`);
            return null;
        }

        // Find message for specific day (1-7)
        let message = messages.find(m => m.day === day);

        // Fallback: use first message if specific day not found
        if (!message) {
            message = messages[0];
            log.info(`[babyMessageService] ⚠️  Day ${day} not found, using first message`);
        }

        log.info(`[babyMessageService] ✅ Found message: ${message.message_id}`);
        return message;
    } catch (error: any) {
        if (error.code !== 'unavailable' && error.name !== 'AbortError') {
            log.error('[babyMessageService] ❌ Error fetching message:', error);
        }
        return null;
    }
};

/**
 * Schedule today's baby message notification
 * Called on app start and when settings change
 */
export const scheduleTodaysBabyMessage = async (weekNumber: number, locale: string = 'fr'): Promise<void> => {
    log.info('[babyMessageService] Scheduling today\'s baby message for week:', weekNumber, 'Locale:', locale);

    try {
        // Check if enabled
        const enabled = await loadBabyMessageEnabled();
        if (!enabled) {
            log.info('[babyMessageService] Baby messages disabled, skipping');
            return;
        }

        // Get message
        const message = await getTodaysBabyMessage(weekNumber);
        if (!message) {
            log.warn('[babyMessageService] No message to schedule');
            return;
        }

        // Get hour setting
        const hour = await loadBabyMessageHour();

        // NOTIF-04 FIX: Use shared helper instead of duplicated if-chain
        const content = getBabyMessageContent(message, locale);

        // Schedule notification
        await scheduleBabyMessage(
            content,
            message.emoji,
            hour,
            0 // minute
        );

        log.info('[babyMessageService] ✅ Scheduled baby message for', hour, ':00');
    } catch (error) {
        log.error('[babyMessageService] Error scheduling message:', error);
    }
};

/**
 * Cancel baby message notification
 * Called when user disables in settings
 */
export const cancelBabyMessageNotification = async (): Promise<void> => {
    log.info('[babyMessageService] Canceling baby message...');

    try {
        await cancelBabyMessage();
        log.info('[babyMessageService] ✅ Baby message canceled');
    } catch (error) {
        log.error('[babyMessageService] Error canceling message:', error);
    }
};

/**
 * Update baby message schedule
 * Called when user changes hour in settings
 */
export const updateBabyMessageSchedule = async (
    weekNumber: number,
    enabled: boolean,
    hour: number
): Promise<void> => {
    log.info('[babyMessageService] Updating baby message schedule:', {
        weekNumber,
        enabled,
        hour,
    });

    try {
        if (!enabled) {
            await cancelBabyMessageNotification();
            return;
        }

        // Reschedule with new hour
        await cancelBabyMessageNotification();

        const message = await getTodaysBabyMessage(weekNumber);
        if (message) {
            // NOTIF-04 FIX: Use shared helper — no more duplicated locale if-chain
            const locale = i18n.language || 'fr';
            const content = getBabyMessageContent(message, locale);
            await scheduleBabyMessage(content, message.emoji, hour, 0);
            log.info('[babyMessageService] ✅ Rescheduled for', hour, ':00');
        }
    } catch (error) {
        log.error('[babyMessageService] Error updating schedule:', error);
    }
};

/**
 * Initialize baby message on app start
 * Should be called in App.tsx or main component
 */
export const initializeBabyMessage = async (weekNumber: number): Promise<void> => {
    log.info('[babyMessageService] 🚀 Initializing baby message for week:', weekNumber);

    try {
        const enabled = await loadBabyMessageEnabled();

        if (enabled) {
            await scheduleTodaysBabyMessage(weekNumber);
        } else {
            log.info('[babyMessageService] Baby messages disabled');
        }
    } catch (error) {
        log.error('[babyMessageService] Error initializing:', error);
    }
};
