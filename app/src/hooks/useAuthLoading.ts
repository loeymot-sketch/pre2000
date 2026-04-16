import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

interface UseAuthLoadingReturn {
    loading: boolean;
    startLoading: () => void;
    stopLoading: () => void;
    withLoading: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * Hook to manage authentication loading states consistently.
 * Prevents double submissions and handles loading UI.
 */
export const useAuthLoading = (initialState = false): UseAuthLoadingReturn => {
    const [loading, setLoading] = useState(initialState);

    const startLoading = useCallback(() => setLoading(true), []);
    const stopLoading = useCallback(() => setLoading(false), []);

    const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
        if (loading) return; // Prevent double submission

        setLoading(true);
        try {
            const result = await fn();
            return result;
        } catch (error) {
            // Error handling is usually done inside the fn or by the caller, 
            // but we ensure loading is stopped.
            throw error;
        } finally {
            setLoading(false);
        }
    }, [loading]);

    return {
        loading,
        startLoading,
        stopLoading,
        withLoading,
    };
};
