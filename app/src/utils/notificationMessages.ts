/**
 * Notification Messages - Caring & Personalized
 * 
 * Messages conçus pour accompagner les futures mamans en douceur.
 * Chaque type a plusieurs variations pour éviter la répétition.
 * Ton : doux, bienveillant, jamais culpabilisant.
 */

import i18n from '../i18n';

// Types for our notification messages
interface NotificationMessage {
    title: string;
    body: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a random message from an array
 */
const getRandomMessage = <T>(messages: T[]): T | null => {
    if (!messages || messages.length === 0) return null;
    return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Helper to get messages from i18n
 */
const getMessages = (key: string, locale?: string): NotificationMessage[] => {
    const options: any = { returnObjects: true };
    if (locale) {
        options.lng = locale;
    }
    // U-FIX-12: i18n is configured with a SINGLE namespace ('translation') and the
    // notifications.json content is exported under the `notifications` root key in
    // each locale's index.ts. So the lookup must be `notifications.X` (dot path),
    // not `notifications:X` (colon = namespace prefix that doesn't exist here).
    const messages = i18n.t(`notifications.${key}`, options) as unknown as NotificationMessage[];
    return Array.isArray(messages) ? messages : [];
};

/**
 * Manual interpolation helper since we fetch raw strings from object array
 */
const interpolate = (text: string, params: Record<string, string>): string => {
    let result = text;
    Object.keys(params).forEach(key => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
    });
    return result;
};

// ============================================
// EXPORTED FUNCTIONS
// ============================================

/**
 * Get a hydration notification message
 */
export const getHydrationMessage = (locale?: string): NotificationMessage => {
    const messages = getMessages('hydration', locale);
    const msg = getRandomMessage(messages);
    return msg || { title: 'Hydratation', body: 'Pensez à boire de l\'eau' }; // Fallback should rarely happen
};

/**
 * Get a RDV notification message
 */
export const getRDVMessage = (type: 'J-1' | 'J' | 'H-2', eventTitle: string, locale?: string) => {
    const keyMap = {
        'J-1': 'rdv.j1',
        'J': 'rdv.j',
        'H-2': 'rdv.h2'
    };

    // Get messages for this type
    const messages = getMessages(keyMap[type], locale);
    const msg = getRandomMessage(messages);

    if (!msg) return { title: 'Rendez-vous', body: eventTitle };

    // Interpolate event title
    return {
        title: msg.title,
        body: interpolate(msg.body, { eventTitle }),
    };
};

/**
 * Get a task notification message
 */
export const getTaskMessage = (taskTitle: string, locale?: string) => {
    const messages = getMessages('tasks', locale);
    const msg = getRandomMessage(messages);

    if (!msg) return { title: 'Tâche', body: taskTitle };

    return {
        title: msg.title,
        body: interpolate(msg.body, { taskTitle }),
    };
};

/**
 * Get a vitamin reminder message
 */
export const getVitaminMessage = (locale?: string) => {
    const messages = getMessages('vitamins', locale);
    return getRandomMessage(messages) || { title: 'Vitamines', body: 'Pensez à vos vitamines' };
};

/**
 * Get a rest reminder message
 */
export const getRestMessage = (locale?: string) => {
    const messages = getMessages('rest', locale);
    return getRandomMessage(messages) || { title: 'Repos', body: 'Prenez un moment pour vous' };
};

/**
 * Get an exercise reminder message
 */
export const getExerciseMessage = (locale?: string) => {
    const messages = getMessages('exercise', locale);
    return getRandomMessage(messages) || { title: 'Exercice', body: 'Bougez un peu si vous le pouvez' };
};

/**
 * Get a meal reminder message
 */
export const getMealMessage = (locale?: string) => {
    const messages = getMessages('meal', locale);
    return getRandomMessage(messages) || { title: 'Repas', body: 'Bon appétit' };
};

/**
 * Get a baby daily message
 */
export const getBabyDailyMessage = (locale?: string) => {
    const messages = getMessages('babyDaily', locale);
    return getRandomMessage(messages) || { title: 'Bébé', body: 'Message de votre bébé' };
};

/**
 * Get a wellness message (journal, relaxation)
 */
export const getWellnessMessage = (locale?: string) => {
    const messages = getMessages('wellness', locale);
    return getRandomMessage(messages) || { title: 'Bien-être', body: 'Prenez soin de vous' };
};

/**
 * Get a medical tracking message (glucose, tension)
 */
export const getMedicalTrackingMessage = (locale?: string) => {
    const messages = getMessages('medical', locale);
    return getRandomMessage(messages) || { title: 'Suivi médical', body: 'Pensez à votre suivi' };
};

/**
 * Get message by reminder type.
 *
 * F14 FIX: matches first by V2 catalogue PREFIX (rem_<family>_*) which is the
 * canonical convention (deterministic, no overlap), then falls back to the
 * legacy substring `includes` paths for backward compatibility with older IDs.
 *
 * Default fallback is now the WELLNESS family (generic encouraging tone) instead
 * of HYDRATION (which would say "drink water!" for unrelated reminders).
 */
export const getReminderMessage = (reminderType: string, locale?: string): { title: string; body: string } => {
    const type = reminderType.toLowerCase();

    // ── Path A: explicit V2 prefix (rem_<family>_*) — deterministic
    if (type.startsWith('rem_hyd_')) return getHydrationMessage(locale);
    if (type.startsWith('rem_vit_') || type.startsWith('rem_med_')) return getVitaminMessage(locale);
    if (type.startsWith('rem_sleep_') || type.startsWith('rem_rest_')) return getRestMessage(locale);
    if (type.startsWith('rem_mov_') || type.startsWith('rem_exercise_')) return getExerciseMessage(locale);
    if (type.startsWith('rem_meal_') || type.startsWith('rem_food_')) return getMealMessage(locale);
    if (type.startsWith('rem_glucose_') || type.startsWith('rem_bp_') || type.startsWith('rem_weight_')) {
        return getMedicalTrackingMessage(locale);
    }
    if (type.startsWith('rem_well_') || type.startsWith('rem_journal_') || type.startsWith('rem_relax_')) {
        return getWellnessMessage(locale);
    }

    // ── Path B: legacy substring matching (kept for backward compat with old custom ids)
    if (type.includes('hydration') || type.includes('eau') || type.includes('water')) return getHydrationMessage(locale);
    if (type.includes('vitamin') || type.includes('medication') || type.includes('medicament') || type.includes('fer') || type.includes('iron') || type.includes('folate') || type.includes('acide_folique')) return getVitaminMessage(locale);
    if (type.includes('rest') || type.includes('sieste') || type.includes('sleep') || type.includes('repos')) return getRestMessage(locale);
    if (type.includes('exercise') || type.includes('walk') || type.includes('marche') || type.includes('yoga') || type.includes('kegel')) return getExerciseMessage(locale);
    if (type.includes('meal') || type.includes('snack') || type.includes('repas') || type.includes('collation') || type.includes('petit_dejeuner') || type.includes('dejeuner') || type.includes('diner')) return getMealMessage(locale);
    if (type.includes('glucose') || type.includes('tension') || type.includes('bp') || type.includes('blood') || type.includes('poids') || type.includes('weight')) return getMedicalTrackingMessage(locale);
    if (type.includes('journal') || type.includes('relaxation') || type.includes('meditation') || type.includes('respiration') || type.includes('breathing')) return getWellnessMessage(locale);

    // F14 FIX: safer default (was hydration → "drink water!" for ANY unmapped reminder).
    // Wellness is generic encouragement and won't mislead.
    return getWellnessMessage(locale);
};