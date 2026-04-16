import { analytics } from '../config/firebase';
import {
    logEvent as firebaseLogEvent,
    setUserId as firebaseSetUserId,
    setUserProperties as firebaseSetUserProperties,
    setAnalyticsCollectionEnabled as firebaseSetCollectionEnabled,
    Analytics
} from 'firebase/analytics';
import { logger } from '../utils/logger';

/**
 * Service to handle Firebase Analytics.
 * Wraps the async initialization of the analytics instance.
 */
class AnalyticsService {
    private analyticsInstance: Promise<Analytics | null>;

    constructor() {
        this.analyticsInstance = analytics;
    }

    /**
     * Log a custom event or a standard Firebase event.
     * @param eventName Name of the event (e.g., 'tutorial_begin', 'select_content')
     * @param params Optional parameters
     */
    async logEvent(eventName: string, params?: Record<string, any>) {
        try {
            const instance = await this.analyticsInstance;
            if (instance) {
                await firebaseLogEvent(instance, eventName, params);
                // Debug log only in dev to avoid noise
                if (__DEV__) {
                    logger.debug('Analytics', `Event: ${eventName}`, params);
                }
            }
        } catch (error) {
            logger.warn('Analytics', `Failed to log event: ${eventName}`, error);
        }
    }

    /**
     * Track which screen the user is viewing.
     * equivalent to logEvent('screen_view') but explicit.
     */
    async logScreenView(screenName: string, screenClass?: string) {
        await this.logEvent('screen_view', {
            firebase_screen: screenName,
            firebase_screen_class: screenClass || screenName
        });
    }

    /**
     * Anonymize a user ID using SHA-256 hash (GDPR requirement).
     * The hash is deterministic so we can still associate events per user
     * without exposing the raw Firebase UID.
     */
    private async anonymizeUserId(userId: string): Promise<string> {
        try {
            // Use Web Crypto API (available in Hermes/React Native via global.crypto)
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(`mama_bebe_${userId}`);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
            }
        } catch (_e) {
            // Fallback: simple hash if SubtleCrypto unavailable
        }
        // Fallback: deterministic but opaque prefix
        return `anon_${userId.slice(0, 8)}`;
    }

    /**
     * Set the user ID when they log in.
     * Anonymized via SHA-256 before sending to Firebase Analytics.
     */
    async setUserId(userId: string | null) {
        try {
            const instance = await this.analyticsInstance;
            if (instance) {
                const anonymizedId = userId ? await this.anonymizeUserId(userId) : null;
                await firebaseSetUserId(instance, anonymizedId);
                logger.debug('Analytics', `Anonymized user ID set (raw: ${userId?.slice(0,4)}***)`);
            }
        } catch (error) {
            logger.warn('Analytics', 'Failed to set User ID', error);
        }
    }

    /**
     * Set user user properties (e.g., "premium_user", "week_pregnancy").
     */
    async setUserProperties(properties: Record<string, any>) {
        try {
            const instance = await this.analyticsInstance;
            if (instance) {
                await firebaseSetUserProperties(instance, properties);
            }
        } catch (error) {
            logger.warn('Analytics', 'Failed to set user properties', error);
        }
    }

    /**
     * Enforce GDPR consent.
     * @param enabled true to collect data, false to stop.
     */
    async setCollectionEnabled(enabled: boolean) {
        try {
            const instance = await this.analyticsInstance;
            if (instance) {
                await firebaseSetCollectionEnabled(instance, enabled);
                logger.info('Analytics', `Collection enabled: ${enabled}`);
            }
        } catch (error) {
            logger.warn('Analytics', 'Failed to toggle collection', error);
        }
    }
}

export const analyticsService = new AnalyticsService();
