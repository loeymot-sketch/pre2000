/**
 * @fileoverview Analytics service — currently a NO-OP wrapper on React Native.
 *
 * STATUS (2026-05): firebase/analytics (Web SDK) is NOT supported in React Native /
 * Hermes runtime. `isSupported()` returns false, so the analytics instance resolves
 * to null and ALL methods (logEvent, setUserId, etc.) are silently dropped in prod.
 *
 * This file preserves the API surface so all call-sites (useScreenAnalytics,
 * LoginScreen, RegisterScreen, App.tsx onStateChange) continue to compile and
 * behave as no-ops without crashing.
 *
 * MIGRATION PATH (when telemetry becomes a priority):
 *   1. Install @react-native-firebase/app and @react-native-firebase/analytics
 *      (requires native build = expo prebuild + EAS rebuild, not Expo Go)
 *   2. Replace `firebase/analytics` imports below with @react-native-firebase/analytics
 *   3. Remove the isSupported() guard and the null-instance branches — the native
 *      SDK is always available on iOS / Android once linked
 *   4. Test on a real device (analytics events do not surface on simulators)
 *
 * Until then, every method here is intentionally a no-op. In __DEV__ we log a
 * single warning at startup to surface this state, instead of silently dropping
 * thousands of events with no observability.
 */

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
 *
 * On React Native (Hermes), the underlying analyticsInstance always resolves to
 * `null` because firebase/analytics (Web SDK) is unsupported. All public methods
 * therefore short-circuit silently — see file header for the migration path.
 */
class AnalyticsService {
    private analyticsInstance: Promise<Analytics | null>;

    constructor() {
        this.analyticsInstance = analytics;

        // Surface the no-op state ONCE at startup in dev. The constructor runs a
        // single time (module-level singleton below), so this fires exactly once
        // per app launch — no per-event spam.
        this.analyticsInstance.then(instance => {
            if (!instance && __DEV__) {
                logger.warn(
                    'Analytics',
                    'firebase/analytics is unavailable on this runtime — all events will be no-ops. See migration path in analyticsService.ts JSDoc.'
                );
            }
        });
    }

    /**
     * Indicates whether analytics is actually operational on this runtime.
     *
     * Returns `true` only when the underlying Firebase Analytics instance was
     * successfully initialized (i.e. running on a supported web environment).
     * On React Native this currently always resolves to `false` — useful for
     * surfacing the state in DiagnosticScreen or feature flags.
     */
    async isOperational(): Promise<boolean> {
        try {
            const instance = await this.analyticsInstance;
            return instance !== null;
        } catch {
            return false;
        }
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
