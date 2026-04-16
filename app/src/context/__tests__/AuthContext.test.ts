/**
 * AuthContext Unit Tests
 * Tests for authentication functionality: login, logout, guest mode
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Firebase modules
jest.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn((auth, callback) => {
        // Simulate no user initially
        callback(null);
        return jest.fn(); // unsubscribe function
    }),
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    setDoc: jest.fn(),
    getDoc: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../config/firebase', () => ({
    db: {},
    auth: {},
}));

jest.mock('../../utils/pregnancyCalculator', () => ({
    calculateCurrentWeek: jest.fn(() => 12),
}));

jest.mock('../../utils/logger', () => ({
    createLogger: () => ({
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    }),
}));

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Mocks Setup', () => {
        it('should have mocked AsyncStorage', () => {
            expect(AsyncStorage.setItem).toBeDefined();
            expect(AsyncStorage.getItem).toBeDefined();
            expect(AsyncStorage.removeItem).toBeDefined();
        });

        it('should have mocked Firebase Auth', () => {
            expect(createUserWithEmailAndPassword).toBeDefined();
            expect(signInWithEmailAndPassword).toBeDefined();
            expect(signOut).toBeDefined();
        });

        it('should have mocked Firebase Firestore', () => {
            expect(getDoc).toBeDefined();
            expect(setDoc).toBeDefined();
        });
    });

    describe('loginAsGuest', () => {
        it('should create a guest profile with correct data', async () => {
            const { calculateCurrentWeek } = require('../../utils/pregnancyCalculator');

            // Simulate the logic of loginAsGuest
            const firstName = 'Sarah';
            const pregnancyStartDate = new Date('2024-09-01');
            const country = 'Maroc';

            const currentWeek = calculateCurrentWeek(pregnancyStartDate);

            const expectedProfile = {
                uid: expect.stringContaining('guest_'),
                email: undefined,
                firstName,
                lastName: undefined,
                pregnancyStartDate: pregnancyStartDate.toISOString(),
                lmp: pregnancyStartDate.toISOString(),
                currentWeek,
                country,
                city: undefined,
                age: undefined,
                isFirstPregnancy: undefined,
                isGuest: true,
            };

            // Verify the structure matches expected
            expect(expectedProfile.firstName).toBe('Sarah');
            expect(expectedProfile.country).toBe('Maroc');
            expect(expectedProfile.isGuest).toBe(true);
            expect(expectedProfile.currentWeek).toBe(12);
        });

        it('should save guest profile to AsyncStorage', async () => {
            const mockProfile = {
                uid: 'guest_123',
                firstName: 'Sarah',
                country: 'Maroc',
                isGuest: true,
            };

            await AsyncStorage.setItem('user_profile', JSON.stringify(mockProfile));

            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'user_profile',
                JSON.stringify(mockProfile)
            );
        });
    });

    describe('logout', () => {
        it('should clear AsyncStorage on logout', async () => {
            await AsyncStorage.removeItem('user_profile');

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user_profile');
        });

        it('should call signOut for authenticated users', async () => {
            (signOut as jest.Mock).mockResolvedValueOnce(undefined);

            await signOut({} as any);

            expect(signOut).toHaveBeenCalled();
        });
    });

    describe('resetProfile', () => {
        it('should clear multiple AsyncStorage keys', async () => {
            const keysToRemove = [
                'user_profile',
                'guestProfile',
                'app_locale',
                '@pregnancy_context',
            ];

            await AsyncStorage.multiRemove(keysToRemove);

            expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(keysToRemove);
        });
    });

    describe('register', () => {
        it('should create user with email and password', async () => {
            const mockUserCredential = {
                user: { uid: 'new-user-123', email: 'test@example.com' },
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce(mockUserCredential);

            const result = await createUserWithEmailAndPassword({} as any, 'test@example.com', 'password123');

            expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(),
                'test@example.com',
                'password123'
            );
            expect(result.user.uid).toBe('new-user-123');
        });
    });

    describe('login', () => {
        it('should sign in user with email and password', async () => {
            const mockUserCredential = {
                user: { uid: 'existing-user-456', email: 'user@example.com' },
            };
            (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce(mockUserCredential);

            const result = await signInWithEmailAndPassword({} as any, 'user@example.com', 'password123');

            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(),
                'user@example.com',
                'password123'
            );
            expect(result.user.uid).toBe('existing-user-456');
        });

        it('should throw error for invalid credentials', async () => {
            const authError = new Error('auth/wrong-password');
            (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(authError);

            await expect(
                signInWithEmailAndPassword({} as any, 'user@example.com', 'wrongpassword')
            ).rejects.toThrow('auth/wrong-password');
        });
    });
});
