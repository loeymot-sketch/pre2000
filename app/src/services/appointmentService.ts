/**
 * Appointment Service
 * Bridges calendar events (userEvents) to a unified appointment interface.
 * Previously a stub returning []; now delegates to calendarService.
 */

import { loadUserEvents } from './calendarService';
import { auth } from '../config/firebase';
import { createLogger } from '../utils/logger';

const log = createLogger('AppointmentService');

export interface Appointment {
    id: string;
    title: string;
    date: Date;
    type: string;
    doctor?: string;
    notes?: string;
}

/**
 * Get all appointments for the current user.
 * Fetches from calendarService.loadUserEvents (the real data source).
 */
export const getAppointments = async (): Promise<Appointment[]> => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            log.warn('[AppointmentService] No authenticated user, returning empty');
            return [];
        }

        const events = await loadUserEvents(userId);

        // Map UserEvent → Appointment
        return events.map(event => ({
            id: event.event_id || '',
            title: event.title || '',
            date: new Date(event.date),
            type: event.type || 'appointment',
            doctor: undefined, // UserEvent doesn't have doctor; could be added as metadata later
            notes: event.notes || undefined,
        }));
    } catch (error) {
        log.error('[AppointmentService] Error fetching appointments:', error);
        return [];
    }
};
