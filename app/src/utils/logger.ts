/**
 * @fileoverview Production-ready logger utility
 * Provides conditional logging that only outputs in development mode.
 * Use this instead of console.log throughout the application.
 *
 * Production behavior:
 * - info / success / warn / debug : silenced (no console, no Sentry)
 * - error : console.error + automatic forwarding to Sentry
 *
 * Dev behavior (`__DEV__ === true`):
 * - All levels print to the console.
 * - Sentry is intentionally NOT called to keep the prod project clean
 *   (and Sentry.init is not run in dev — see App.tsx).
 *
 * @example
 * import { logger } from '../utils/logger';
 *
 * logger.info('CalendarService', 'Loading events...');
 * logger.success('CalendarService', 'Event saved', eventId);
 * logger.error('CalendarService', 'Failed to save', error);
 *
 * // Identify the current user for crash reports (RGPD note: Firebase UID is
 * // already an opaque identifier, but it ties crashes to a single account
 * // — consider hashing if you ever need stricter anonymisation).
 * logger.setUser(uid);
 *
 * // Drop a breadcrumb that will be attached to the next captured event.
 * logger.addBreadcrumb('navigation', 'open weight tracker');
 */

import * as Sentry from '@sentry/react-native';

// Check if we're in development mode
// __DEV__ is a global variable set by React Native/Expo
declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Color codes for different log types (for terminal/console styling)
const LogColors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    debug: '\x1b[35m',   // Magenta
    reset: '\x1b[0m',    // Reset
};

// Emoji prefixes for better console readability
const LogEmojis = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
};

/**
 * Format the current timestamp
 */
const getTimestamp = (): string => {
    return new Date().toISOString().split('T')[1].split('.')[0];
};

/**
 * Format a log message with context
 */
const formatMessage = (
    level: keyof typeof LogEmojis,
    context: string,
    message: string
): string => {
    return `${LogEmojis[level]} [${getTimestamp()}] [${context}] ${message}`;
};

/**
 * Find the first Error instance in a list of error arguments.
 * Logger callers vary widely (some pass `error`, some `error.message`, some
 * a plain object), so we scan the rest args and pick the first real Error.
 */
const findFirstError = (args: any[]): Error | undefined => {
    for (const a of args) {
        if (a instanceof Error) return a;
    }
    return undefined;
};

/**
 * Forward an error log to Sentry. Always wrapped in try/catch so a Sentry
 * misconfiguration (missing DSN, native module not linked, etc.) can NEVER
 * take down the caller.
 *
 * Skipped entirely in dev to avoid polluting the prod Sentry project — and
 * also because App.tsx only calls Sentry.init() when !__DEV__.
 */
const forwardErrorToSentry = (
    context: string,
    message: string,
    extras: any[]
): void => {
    if (isDev) return;
    try {
        const err = findFirstError(extras);
        if (err) {
            Sentry.captureException(err, {
                tags: { context },
                extra: { message, args: extras.length > 1 ? extras : undefined },
            });
        } else {
            Sentry.captureMessage(message, {
                level: 'error',
                tags: { context },
                extra: extras.length > 0 ? { data: extras } : undefined,
            });
        }
    } catch {
        // Sentry must never break logging. Swallow silently — the local
        // console.error has already happened and is the user-visible signal.
    }
};

/**
 * Logger interface for type safety
 */
interface Logger {
    /**
     * Log informational message (dev only)
     * @param context - Service/Component name
     * @param message - Log message
     * @param data - Optional additional data
     */
    info: (context: string, message: string, ...data: any[]) => void;

    /**
     * Log success message (dev only)
     * @param context - Service/Component name
     * @param message - Log message
     * @param data - Optional additional data
     */
    success: (context: string, message: string, ...data: any[]) => void;

    /**
     * Log warning message (dev only)
     * @param context - Service/Component name
     * @param message - Log message
     * @param data - Optional additional data
     */
    warn: (context: string, message: string, ...data: any[]) => void;

    /**
     * Log error message (always logged, even in production).
     * In production, also forwarded to Sentry as an exception (if an Error
     * is passed) or a captured message otherwise. The `context` becomes a
     * Sentry tag for easy filtering.
     * @param context - Service/Component name
     * @param message - Error message
     * @param error - Error object or additional data
     */
    error: (context: string, message: string, ...error: any[]) => void;

    /**
     * Log debug message (dev only, verbose)
     * @param context - Service/Component name
     * @param message - Debug message
     * @param data - Optional additional data
     */
    debug: (context: string, message: string, ...data: any[]) => void;

    /**
     * Identify the current user on Sentry. Pass `null` on logout to detach.
     * No-op in dev (Sentry not initialised) and never throws.
     *
     * RGPD note: we forward the Firebase UID, which is already opaque to
     * third parties but still ties crash reports to a single account. If a
     * future audit demands stricter anonymisation, hash the UID here.
     */
    setUser: (uid: string | null) => void;

    /**
     * Drop a Sentry breadcrumb describing a notable event. Breadcrumbs are
     * attached to the next captured event and are invaluable for tracing
     * what the user did right before a crash.
     * No-op in dev and never throws.
     */
    addBreadcrumb: (category: string, message: string, data?: any) => void;
}

/**
 * Production-ready logger
 * - info, success, warn, debug: Only log in development
 * - error: Always logs (important for production debugging) + forwarded to Sentry in prod
 */
export const logger: Logger = {
    info: (context: string, message: string, ...data: any[]) => {
        if (isDev) {
            console.log(formatMessage('info', context, message), ...data);
        }
    },

    success: (context: string, message: string, ...data: any[]) => {
        if (isDev) {
            console.log(formatMessage('success', context, message), ...data);
        }
    },

    warn: (context: string, message: string, ...data: any[]) => {
        if (isDev) {
            console.warn(formatMessage('warn', context, message), ...data);
        }
    },

    error: (context: string, message: string, ...error: any[]) => {
        // Errors are always logged locally, even in production
        console.error(formatMessage('error', context, message), ...error);
        // Forward to Sentry in production. Wrapped internally — never throws.
        forwardErrorToSentry(context, message, error);
    },

    debug: (context: string, message: string, ...data: any[]) => {
        if (isDev) {
            console.log(formatMessage('debug', context, message), ...data);
        }
    },

    setUser: (uid: string | null) => {
        if (isDev) return;
        try {
            if (uid) {
                Sentry.setUser({ id: uid });
            } else {
                Sentry.setUser(null);
            }
        } catch {
            // Identity tracking is best-effort; never break the auth flow.
        }
    },

    addBreadcrumb: (category: string, message: string, data?: any) => {
        if (isDev) return;
        try {
            Sentry.addBreadcrumb({
                category,
                message,
                level: 'info',
                data,
            });
        } catch {
            // Breadcrumbs are diagnostic-only; failure must stay invisible.
        }
    },
};

/**
 * Create a scoped logger for a specific context
 * Useful for services that always log with the same context
 *
 * @example
 * const log = createLogger('CalendarService');
 * log.info('Loading events...');
 * log.success('Event saved', eventId);
 */
export const createLogger = (context: string) => ({
    info: (message: string, ...data: any[]) => logger.info(context, message, ...data),
    success: (message: string, ...data: any[]) => logger.success(context, message, ...data),
    warn: (message: string, ...data: any[]) => logger.warn(context, message, ...data),
    error: (message: string, ...error: any[]) => logger.error(context, message, ...error),
    debug: (message: string, ...data: any[]) => logger.debug(context, message, ...data),
    addBreadcrumb: (message: string, data?: any) => logger.addBreadcrumb(context, message, data),
});

export default logger;
