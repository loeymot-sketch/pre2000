/**
 * @fileoverview Reminder Service
 * Manages reminder templates and task tracking including:
 * - Fetching reminders for specific pregnancy weeks
 * - User reminder settings management
 * - Task status tracking
 * 
 * @module services/reminderService
 */

import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ReminderTemplate, WeeklyTask, UserReminderSettings, UserTaskStatus } from '../types';
import { createLogger } from '../utils/logger';

// Create scoped logger for this service
const log = createLogger('ReminderService');

/**
 * Fetch reminder templates for a specific week
 * Filters by week_min <= weekNumber <= week_max
 */
export const fetchRemindersForWeek = async (weekNumber: number): Promise<ReminderTemplate[]> => {
    log.info('Fetching all reminders for week:', weekNumber);

    try {
        // Fetch both:
        // 1. Calendar templates (appointments for this week)
        // 2. Reminder templates (daily habits for all weeks)

        // 1. Calendar Appointments for this specific week
        log.info(' 📅 Fetching calendar appointments...');
        const calendarRef = collection(db, 'calendarTemplates');
        const calendarQuery = query(calendarRef, where('week', '==', weekNumber));
        const calendarSnap = await getDocs(calendarQuery);
        log.info(' Found', calendarSnap.size, 'appointments');

        const calendarReminders = calendarSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                reminder_id: doc.id,
                title_fr: data.title_fr || '',
                title_ar: data.title_ar || '',
                title_en: data.title_en || '',
                title_tn: data.title_tn || '',
                description_fr: data.description_fr || '',
                description_ar: data.description_ar || '',
                description_en: data.description_en || '',
                description_tn: data.description_tn || '',
                category: 'checkup',
                week_min: data.week_min || weekNumber,
                week_max: data.week_max || weekNumber,
                importance_level: data.importance_level || 2,
                is_mandatory: data.is_mandatory || false,
                default_times_per_day: 1,
                suggested_hours: ['09:00'],
                can_user_customize: false, // Calendar appointments are not customizable
                priority: 'medium' as const,
            } as ReminderTemplate;
        });

        // 2. Daily habit reminders (all weeks)
        log.info(' 💧 Fetching daily habit reminders...');
        const reminderRef = collection(db, 'reminderTemplates');
        const reminderQuery = query(
            reminderRef,
            where('week_min', '<=', weekNumber),
            where('week_max', '>=', weekNumber)
        );

        let dailyReminders: ReminderTemplate[] = [];
        try {
            const reminderSnap = await getDocs(reminderQuery);
            log.info(' Found', reminderSnap.size, 'daily reminders');
            dailyReminders = reminderSnap.docs.map(doc => doc.data() as ReminderTemplate);
        } catch (indexError: any) {
            // If composite index doesn't exist, fetch all and filter manually
            log.warn(' ⚠️ Index not available, fetching all reminders');
            const allRemindersSnap = await getDocs(collection(db, 'reminderTemplates'));
            dailyReminders = allRemindersSnap.docs
                .map(doc => doc.data() as ReminderTemplate)
                .filter(r => r.week_min <= weekNumber && r.week_max >= weekNumber);
            log.info(' Filtered to', dailyReminders.length, 'daily reminders');
        }

        // Combine both types
        const allReminders = [...calendarReminders, ...dailyReminders];

        // DEDUPLICATE: Remove duplicates by reminder_id AND normalized title
        const seenIds = new Set<string>();
        const seenTitles = new Set<string>();

        const uniqueReminders = allReminders.filter(r => {
            const id = r.reminder_id;
            const normalizedTitle = r.title_fr?.toLowerCase().trim() || '';

            // Check if we've seen this ID
            if (id && seenIds.has(id)) {
                log.info(' ⚠️ Skipping duplicate ID:', id);
                return false;
            }

            // Check if we've seen this title (normalized)
            if (normalizedTitle && seenTitles.has(normalizedTitle)) {
                log.info(' ⚠️ Skipping duplicate title:', r.title_fr);
                return false;
            }

            // Add to seen sets
            if (id) seenIds.add(id);
            if (normalizedTitle) seenTitles.add(normalizedTitle);

            return true;
        });

        log.info(' ✅ Total reminders:', uniqueReminders.length);
        log.info('    - Appointments:', calendarReminders.length);
        log.info('    - Daily habits:', dailyReminders.length);
        log.info('    - Duplicates removed:', allReminders.length - uniqueReminders.length);

        if (uniqueReminders.length > 0) {
            log.info(' Sample:', uniqueReminders[0].title_fr);
        }

        return uniqueReminders;
    } catch (error) {
        log.error(' ❌ Error fetching reminders:', error);
        return [];
    }
};

/**
 * Fetch weekly tasks for a specific week
 * Filters by week_min <= weekNumber <= week_max
 * Reads from local WEEKLY_TASKS.json
 */
export const fetchTasksForWeek = async (weekNumber: number): Promise<WeeklyTask[]> => {
    log.info(' Fetching tasks for week:', weekNumber);

    try {
        // Import local JSON data
        const weeklyTasksData = require('../data/WEEKLY_TASKS.json');
        const allTasks: WeeklyTask[] = weeklyTasksData.tasks || [];

        // Filter tasks for the current week
        const tasksForWeek = allTasks.filter(
            task => task.week_min <= weekNumber && task.week_max >= weekNumber
        );

        // Sort by priority (high -> medium -> low)
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        tasksForWeek.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

        log.info(' Found tasks:', tasksForWeek.length);
        return tasksForWeek;
    } catch (error) {
        log.error(' Error fetching tasks:', error);
        return [];
    }
};

/**
 * Fetch both reminders and tasks for a week
 * Convenience function that combines both queries
 */
export const fetchWeekRemindersAndTasks = async (weekNumber: number) => {
    log.info(' Fetching both reminders and tasks for week:', weekNumber);

    const [reminders, tasks] = await Promise.all([
        fetchRemindersForWeek(weekNumber),
        fetchTasksForWeek(weekNumber)
    ]);

    log.info(' Total items:', {
        reminders: reminders.length,
        tasks: tasks.length
    });

    return { reminders, tasks };
};

/**
 * Get user's reminder settings
 */
export const getUserReminderSettings = async (userId: string): Promise<UserReminderSettings[]> => {
    log.info(' Fetching user reminder settings for:', userId);

    try {
        const settingsRef = collection(db, 'userReminderSettings');
        const q = query(settingsRef, where('user_id', '==', userId));
        const snapshot = await getDocs(q);

        const settings = snapshot.docs.map(doc => doc.data() as UserReminderSettings);
        log.info(' Found user settings:', settings.length);

        return settings;
    } catch (error) {
        log.error(' Error fetching user settings:', error);
        return [];
    }
};

/**
 * Update user's reminder settings
 */
export const updateReminderSettings = async (
    userId: string,
    reminderId: string,
    settings: Partial<UserReminderSettings>
): Promise<void> => {
    log.info(' Updating reminder settings:', { userId, reminderId, settings });

    try {
        const docId = `${userId}_${reminderId}`;
        const docRef = doc(db, 'userReminderSettings', docId);

        await setDoc(docRef, {
            user_id: userId,
            reminder_id: reminderId,
            ...settings,
            last_modified: new Date(),
        }, { merge: true });

        log.info(' Settings updated successfully');
    } catch (error) {
        log.error(' Error updating settings:', error);
        throw error;
    }
};

/**
 * Get user's task completion statuses for a week
 */
export const getUserTaskStatuses = async (
    userId: string,
    weekNumber: number
): Promise<UserTaskStatus[]> => {
    log.info(' Fetching task statuses:', { userId, weekNumber });

    try {
        const statusRef = collection(db, 'userTaskStatuses');
        const q = query(
            statusRef,
            where('user_id', '==', userId),
            where('week_number', '==', weekNumber)
        );
        const snapshot = await getDocs(q);

        const statuses = snapshot.docs.map(doc => doc.data() as UserTaskStatus);
        log.info(' Found task statuses:', statuses.length);

        return statuses;
    } catch (error) {
        log.error(' Error fetching task statuses:', error);
        return [];
    }
};

/**
 * Update user's task completion status
 */
export const updateTaskStatus = async (
    userId: string,
    taskId: string,
    weekNumber: number,
    completed: boolean
): Promise<void> => {
    log.info(' Updating task status:', { userId, taskId, weekNumber, completed });

    try {
        const docId = `${userId}_${taskId}_${weekNumber}`;
        const docRef = doc(db, 'userTaskStatuses', docId);

        await setDoc(docRef, {
            user_id: userId,
            task_id: taskId,
            week_number: weekNumber,
            completed,
            completed_at: completed ? new Date() : null,
        }, { merge: true });

        log.info(' Task status updated successfully');
    } catch (error) {
        log.error(' Error updating task status:', error);
        throw error;
    }
};
