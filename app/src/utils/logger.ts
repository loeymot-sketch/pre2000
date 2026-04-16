/**
 * @fileoverview Production-ready logger utility
 * Provides conditional logging that only outputs in development mode.
 * Use this instead of console.log throughout the application.
 * 
 * @example
 * import { logger } from '../utils/logger';
 * 
 * logger.info('CalendarService', 'Loading events...');
 * logger.success('CalendarService', 'Event saved', eventId);
 * logger.error('CalendarService', 'Failed to save', error);
 */

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
     * Log error message (always logged, even in production)
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
}

/**
 * Production-ready logger
 * - info, success, warn, debug: Only log in development
 * - error: Always logs (important for production debugging)
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
        // Errors are always logged, even in production
        console.error(formatMessage('error', context, message), ...error);
    },

    debug: (context: string, message: string, ...data: any[]) => {
        if (isDev) {
            console.log(formatMessage('debug', context, message), ...data);
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
});

export default logger;
