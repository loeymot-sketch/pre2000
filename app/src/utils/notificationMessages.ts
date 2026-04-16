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
    const messages = i18n.t(`notifications:${key}`, options) as unknown as NotificationMessage[];
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
 * Get message by reminder type
 * Complete mapping of all reminder types to appropriate message families
 */
export const getReminderMessage = (reminderType: string, locale?: string): { title: string; body: string } => {
    const type = reminderType.toLowerCase();

    // Hydration family
    if (type.includes('hydration') || type.includes('eau') || type.includes('water')) {
        return getHydrationMessage(locale);
    }

    // Vitamins/Medication family
    if (type.includes('vitamin') || type.includes('medication') || type.includes('medicament') || type.includes('fer') || type.includes('iron') || type.includes('folate') || type.includes('acide_folique')) {
        return getVitaminMessage(locale);
    }

    // Rest family
    if (type.includes('rest') || type.includes('sieste') || type.includes('sleep') || type.includes('repos')) {
        return getRestMessage(locale);
    }

    // Exercise family
    if (type.includes('exercise') || type.includes('walk') || type.includes('marche') || type.includes('yoga') || type.includes('kegel')) {
        return getExerciseMessage(locale);
    }

    // Meal family
    if (type.includes('meal') || type.includes('snack') || type.includes('repas') || type.includes('collation') || type.includes('petit_dejeuner') || type.includes('dejeuner') || type.includes('diner')) {
        return getMealMessage(locale);
    }

    // Medical tracking family (glucose, tension, etc.)
    if (type.includes('glucose') || type.includes('tension') || type.includes('bp') || type.includes('blood') || type.includes('poids') || type.includes('weight')) {
        return getMedicalTrackingMessage(locale);
    }

    // Wellness family (journal, relaxation, meditation)
    if (type.includes('journal') || type.includes('relaxation') || type.includes('meditation') || type.includes('respiration') || type.includes('breathing')) {
        return getWellnessMessage(locale);
    }

    // Default fallback
    return getHydrationMessage(locale);
};