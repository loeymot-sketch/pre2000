import { retryOperation } from './retry';
import { isNetworkError } from './firebaseErrors';

// Mock isNetworkError
jest.mock('./firebaseErrors', () => ({
    isNetworkError: jest.fn(),
}));

describe('retryOperation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return result immediately if operation succeeds', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const result = await retryOperation(operation);
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
        const networkError = { code: 'auth/network-request-failed' };
        (isNetworkError as jest.Mock).mockReturnValue(true);

        const operation = jest.fn()
            .mockRejectedValueOnce(networkError)
            .mockResolvedValue('success');

        const result = await retryOperation(operation, { initialDelay: 1, factor: 1 }); // Fast retry
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on non-network error', async () => {
        const userError = { code: 'auth/invalid-email' };
        (isNetworkError as jest.Mock).mockReturnValue(false);

        const operation = jest.fn().mockRejectedValue(userError);

        await expect(retryOperation(operation)).rejects.toEqual(userError);
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
        const networkError = { code: 'auth/network-request-failed' };
        (isNetworkError as jest.Mock).mockReturnValue(true);

        const operation = jest.fn().mockRejectedValue(networkError);

        await expect(retryOperation(operation, { maxRetries: 2, initialDelay: 1, factor: 1 }))
            .rejects.toEqual(networkError);

        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
});
