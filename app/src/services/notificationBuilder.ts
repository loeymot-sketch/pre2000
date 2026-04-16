/**
 * Notification Builder Service
 * 
 * Generates personalized, warm notification messages
 * using templates from REMINDERS_V2.json
 */

import { ReminderDefinition, ReminderUserSetting, Trilang } from '../types/remindersV2';
import { createLogger } from '../utils/logger';
import { getLocalizedTrilang } from '../utils/i18nHelpers';
import i18n from '../i18n';

const log = createLogger('NotificationBuilder');

// ============================================
// TYPES
// ============================================

export interface NotificationContent {
    title: string;
    body: string;
    icon?: string;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Build a personalized notification message for a reminder
 * 
 * @param reminder - The reminder definition
 * @param userName - User's display name (e.g., "Princess")
 * @param language - Language code (fr, ar, en)
 * @returns NotificationContent with personalized title and body
 */
export function buildNotificationMessage(
    reminder: ReminderDefinition,
    userName?: string,
    language: 'fr' | 'ar' | 'en' | 'tn' = 'fr'
): NotificationContent {
    try {
        const messages = (reminder as any).notification_messages as Record<string, string[]> | undefined;

        let title: string;
        let body: string;

        // Try to get a random personalized message
        if (messages && messages[language] && messages[language].length > 0) {
            const variants = messages[language];
            const randomIndex = Math.floor(Math.random() * variants.length);
            title = variants[randomIndex];

            // Replace {name} placeholder
            if (userName && title.includes('{name}')) {
                title = title.replace('{name}', userName);
            } else if (title.includes('{name}')) {
                // Default to "Maman" if no name provided
                title = title.replace('{name}', language === 'ar' ? 'ماما' : 'Maman');
            }

            log.debug(`Built personalized message for ${reminder.id}:`, title);
        } else {
            title = getLocalizedTrilang(reminder.title, language);
            log.debug(`Using fallback title for ${reminder.id}`);
        }

        // Body is always the description
        body = getLocalizedTrilang(reminder.description, language);

        return { title, body, icon: reminder.ui?.icon };
    } catch (error) {
        log.error(`[NotificationBuilder] Failed to build message for reminder ${reminder?.id}:`, error);
        return {
            title: language === 'ar' ? 'تذكير 🔔' : language === 'tn' ? 'تذكير 🔔' : 'Rappel 🔔',
            body: '',
            icon: '🔔',
        };
    }
}

/**
 * Build notification content for a grouped notification
 * (when multiple reminders are combined into one notification)
 * 
 * @param reminders - Array of reminders to group
 * @param userName - User's display name
 * @param language - Language code
 * @returns NotificationContent for the grouped notification
 */
export function buildGroupedNotification(
    reminders: ReminderDefinition[],
    userName?: string,
    language: 'fr' | 'ar' | 'en' | 'tn' = 'fr'
): NotificationContent {
    try {
        const name = userName || (language === 'ar' ? 'ماما' : 'Maman');
        const titleKey = reminders.length === 1 ? 'single' : 'multiple';
        const title = i18n.t(`notifications:grouped.${titleKey}`, {
            name,
            count: reminders.length,
            lng: language
        });

        const body = reminders
            .map(r => `${r.ui?.icon || '📌'} ${getLocalizedTrilang(r.title, language)}`)
            .join('\n');

        return { title, body, icon: '🔔' };
    } catch (error) {
        log.error('[NotificationBuilder] Failed to build grouped notification:', error);
        return {
            title: language === 'ar' ? `${reminders.length} تذكيرات 🔔` : `${reminders.length} rappels 🔔`,
            body: reminders.map(r => r.ui?.icon || '📌').join(' '),
            icon: '🔔',
        };
    }
}

/**
 * Get a random encouraging prefix for notifications
 */
export function getRandomEncouragement(language: 'fr' | 'ar' | 'en' | 'tn' = 'fr'): string {
    try {
        const encouragements = i18n.t('notifications:encouragements', { returnObjects: true, lng: language });
        if (Array.isArray(encouragements) && encouragements.length > 0) {
            return encouragements[Math.floor(Math.random() * encouragements.length)];
        }
        return '💪';
    } catch (error) {
        log.error('[NotificationBuilder] Failed to get encouragement:', error);
        return '💪';
    }
}
