/**
 * Rate Limiter Utility
 * Client-side rate limiting to prevent API abuse and control costs
 * 
 * Usage:
 *   const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
 *   if (limiter.canMakeRequest()) {
 *       // proceed with API call
 *   } else {
 *       // show "too many requests" message
 *   }
 */

interface RateLimiterConfig {
    maxRequests: number;    // Maximum requests allowed in the time window
    windowMs: number;       // Time window in milliseconds
}

interface RequestLog {
    timestamps: number[];
}

export class RateLimiter {
    private maxRequests: number;
    private windowMs: number;
    private requests: number[] = [];

    constructor(config: RateLimiterConfig) {
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
    }

    /**
     * Check if a new request can be made
     */
    canMakeRequest(): boolean {
        this.cleanOldRequests();
        return this.requests.length < this.maxRequests;
    }

    /**
     * Record a new request
     */
    recordRequest(): void {
        this.requests.push(Date.now());
    }

    /**
     * Check and record in one call (most common usage)
     * Returns true if request is allowed, false if rate limited
     */
    tryRequest(): boolean {
        if (this.canMakeRequest()) {
            this.recordRequest();
            return true;
        }
        return false;
    }

    /**
     * Get remaining requests in current window
     */
    getRemainingRequests(): number {
        this.cleanOldRequests();
        return Math.max(0, this.maxRequests - this.requests.length);
    }

    /**
     * Get time until next request is allowed (in ms)
     */
    getTimeUntilReset(): number {
        if (this.canMakeRequest()) return 0;

        const oldestRequest = this.requests[0];
        if (!oldestRequest) return 0;

        return Math.max(0, (oldestRequest + this.windowMs) - Date.now());
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.requests = [];
    }

    /**
     * Remove requests outside the current time window
     */
    private cleanOldRequests(): void {
        const now = Date.now();
        const cutoff = now - this.windowMs;
        this.requests = this.requests.filter(timestamp => timestamp > cutoff);
    }
}

// ============================================
// PRE-CONFIGURED LIMITERS FOR COMMON USE CASES
// ============================================

/**
 * Limiter for chatbot queries
 * 20 messages per minute (prevents abuse while allowing conversation flow)
 */
export const chatbotLimiter = new RateLimiter({
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
});

/**
 * Limiter for Firestore writes
 * 30 writes per minute (generous for normal usage)
 */
export const firestoreWriteLimiter = new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000,
});

/**
 * Limiter for Firestore reads
 * 100 reads per minute (generous, covers navigation)
 */
export const firestoreReadLimiter = new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000,
});

/**
 * Limiter for authentication attempts
 * 5 attempts per 5 minutes (security)
 */
export const authLimiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
});

/**
 * Limiter for notification scheduling
 * 10 per minute (prevents notification spam)
 */
export const notificationLimiter = new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000,
});

// ============================================
// HELPER FUNCTION
// ============================================

/**
 * Wrapper to rate limit any async function
 * 
 * Usage:
 *   const rateLimitedFetch = withRateLimit(chatbotLimiter, fetchChatbotResponse);
 *   const response = await rateLimitedFetch(query);
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
    limiter: RateLimiter,
    fn: T,
    onRateLimited?: () => void
): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
        if (!limiter.tryRequest()) {
            onRateLimited?.();
            return null;
        }
        return fn(...args);
    }) as T;
}
