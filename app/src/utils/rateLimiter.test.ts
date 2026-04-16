/**
 * Rate Limiter Tests
 */

import { RateLimiter, chatbotLimiter, authLimiter } from './rateLimiter';

describe('RateLimiter', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Basic functionality', () => {
        it('should allow requests under the limit', () => {
            const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

            expect(limiter.tryRequest()).toBe(true);
            expect(limiter.tryRequest()).toBe(true);
            expect(limiter.tryRequest()).toBe(true);
            expect(limiter.getRemainingRequests()).toBe(0);
        });

        it('should block requests over the limit', () => {
            const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

            expect(limiter.tryRequest()).toBe(true);
            expect(limiter.tryRequest()).toBe(true);
            expect(limiter.tryRequest()).toBe(false); // blocked
        });

        it('should reset after time window', () => {
            const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

            limiter.tryRequest();
            limiter.tryRequest();
            expect(limiter.tryRequest()).toBe(false);

            // Advance time by 1 second
            jest.advanceTimersByTime(1000);

            // Should be able to make requests again
            expect(limiter.tryRequest()).toBe(true);
        });
    });

    describe('getRemainingRequests', () => {
        it('should return correct remaining count', () => {
            const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

            expect(limiter.getRemainingRequests()).toBe(5);
            limiter.tryRequest();
            expect(limiter.getRemainingRequests()).toBe(4);
            limiter.tryRequest();
            limiter.tryRequest();
            expect(limiter.getRemainingRequests()).toBe(2);
        });
    });

    describe('getTimeUntilReset', () => {
        it('should return 0 when requests are available', () => {
            const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

            expect(limiter.getTimeUntilReset()).toBe(0);
        });

        it('should return time until reset when rate limited', () => {
            const limiter = new RateLimiter({ maxRequests: 1, windowMs: 5000 });

            limiter.tryRequest();
            expect(limiter.tryRequest()).toBe(false);

            const timeUntilReset = limiter.getTimeUntilReset();
            expect(timeUntilReset).toBeGreaterThan(0);
            expect(timeUntilReset).toBeLessThanOrEqual(5000);
        });
    });

    describe('reset', () => {
        it('should clear all recorded requests', () => {
            const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

            limiter.tryRequest();
            limiter.tryRequest();
            expect(limiter.getRemainingRequests()).toBe(0);

            limiter.reset();

            expect(limiter.getRemainingRequests()).toBe(2);
        });
    });

    describe('Pre-configured limiters', () => {
        it('chatbotLimiter should allow 20 requests per minute', () => {
            chatbotLimiter.reset();

            for (let i = 0; i < 20; i++) {
                expect(chatbotLimiter.tryRequest()).toBe(true);
            }
            expect(chatbotLimiter.tryRequest()).toBe(false);
        });

        it('authLimiter should allow 5 requests per 5 minutes', () => {
            authLimiter.reset();

            for (let i = 0; i < 5; i++) {
                expect(authLimiter.tryRequest()).toBe(true);
            }
            expect(authLimiter.tryRequest()).toBe(false);
        });
    });
});
