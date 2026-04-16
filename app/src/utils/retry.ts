import { createLogger } from './logger';
const log = createLogger('retry');
import { isNetworkError } from './firebaseErrors';

interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    factor?: number;
}

/**
 * Retries an async operation with exponential backoff if it fails with a network error.
 * 
 * @param operation The async function to execute
 * @param options Configuration for retries (maxRetries, initialDelay, factor)
 * @returns The result of the operation
 */
export const retryOperation = async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> => {
    const { maxRetries = 3, initialDelay = 1000, factor = 2 } = options;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            // If it's the last attempt, throw the error
            if (attempt === maxRetries) {
                throw error;
            }

            // Check if the error is retriable (network error)
            // If error.code exists, check it. If not, assume it might be retriable if it's a standard Error? 
            // For now, we strictly check isNetworkError which relies on error.code.
            // If error doesn't have a code, we might want to check message or type, but let's stick to safe defaults.
            const errorCode = error?.code || error?.message;
            if (!errorCode || !isNetworkError(errorCode)) {
                throw error;
            }

            log.debug(`[Retry] Attempt ${attempt + 1} failed with ${errorCode}. Retrying in ${delay}ms...`);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= factor; // Exponential backoff
        }
    }

    throw new Error('Operation failed after max retries');
};
