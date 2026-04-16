/**
 * In-App Review Service
 * 
 * Tracks "positive moments" (completing tasks, adding appointments, reading articles)
 * and prompts for App Store rating at appropriate times.
 */

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/logger';

const log = createLogger('InAppReviewService');

const STORAGE_KEY_ACTIONS = 'in_app_review_actions_count';
const STORAGE_KEY_LAST_PROMPT = 'in_app_review_last_prompt';
const STORAGE_KEY_INSTALL_DATE = 'in_app_review_install_date';

// Thresholds
const ACTIONS_THRESHOLD = 5; // Minimum positive actions before prompt
const DAYS_INSTALLED_THRESHOLD = 3; // Minimum days strict
const DAYS_BETWEEN_PROMPTS = 120; // Don't annoy user (4 months)

export const initReviewService = async () => {
    try {
        const installDate = await AsyncStorage.getItem(STORAGE_KEY_INSTALL_DATE);
        if (!installDate) {
            await AsyncStorage.setItem(STORAGE_KEY_INSTALL_DATE, new Date().toISOString());
        }
    } catch (error) {
        log.error('Error initializing review service', error);
    }
};

/**
 * Track a positive user action
 * @param actionType 'complete_task' | 'add_rdv' | 'read_article' | 'daily_check'
 */
export const trackPositiveAction = async (actionType: string) => {
    try {
        const currentCountStr = await AsyncStorage.getItem(STORAGE_KEY_ACTIONS);
        let currentCount = currentCountStr ? parseInt(currentCountStr) : 0;

        currentCount++;
        await AsyncStorage.setItem(STORAGE_KEY_ACTIONS, currentCount.toString());

        log.debug(`Positive action tracked: ${actionType} (Total: ${currentCount})`);

        // Check if we should prompt
        if (currentCount >= ACTIONS_THRESHOLD) {
            await checkAndPromptReview();
        }
    } catch (error) {
        log.error('Error tracking positive action', error);
    }
};

const checkAndPromptReview = async () => {
    try {
        const now = new Date();

        // 1. Check install date
        const installDateStr = await AsyncStorage.getItem(STORAGE_KEY_INSTALL_DATE);
        if (!installDateStr) return; // Should be set by init

        const installDate = new Date(installDateStr);
        const daysInstalled = (now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysInstalled < DAYS_INSTALLED_THRESHOLD) {
            log.debug(`Too early for review: ${daysInstalled.toFixed(1)} days (Threshold: ${DAYS_INSTALLED_THRESHOLD})`);
            return;
        }

        // 2. Check last prompt date
        const lastPromptStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_PROMPT);
        if (lastPromptStr) {
            const lastPrompt = new Date(lastPromptStr);
            const daysSinceLast = (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceLast < DAYS_BETWEEN_PROMPTS) {
                log.debug(`Recently prompted: ${daysSinceLast.toFixed(1)} days ago`);
                return;
            }
        }

        // 3. Prompt!
        if (await StoreReview.hasAction()) {
            log.info('Requesting In-App Review...');
            await StoreReview.requestReview();

            // Update last prompt date and reset count
            await AsyncStorage.setItem(STORAGE_KEY_LAST_PROMPT, now.toISOString());
            await AsyncStorage.setItem(STORAGE_KEY_ACTIONS, '0'); // Reset counter to require new engagement
        } else {
            log.warn('StoreReview not supported on this device/OS version');
        }
    } catch (error) {
        log.error('Error in checkAndPromptReview', error);
    }
};
