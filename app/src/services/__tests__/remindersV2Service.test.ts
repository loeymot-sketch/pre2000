import {
    getCatalogue,
    getEssentialReminders,
    getAvailableReminders,
    enableReminder
} from '../remindersV2Service';
import { applyContextRules } from '../../utils/contextMatcher';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({
    db: {},
}));
jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
    createLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }),
}));

// Mock Data
jest.mock('../../data/REMINDERS_V2.json', () => ({
    categories: [{ id: 'cat1', order: 1 }],
    reminders: [
        { id: 'rem-1', category_id: 'cat1', source_ui: 'reminders_only', ui: { essential_rank: 2 } },
        { id: 'rem-2', category_id: 'cat1', source_ui: 'reminders_only', ui: { essential_rank: 1 } },
        { id: 'rem-3', category_id: 'cat1', source_ui: 'reminders_only' }, // No rank
    ]
}));

jest.mock('../../utils/contextMatcher', () => ({
    applyContextRules: jest.fn(),
}));

describe('RemindersV2Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCatalogue', () => {
        it('should load catalogue data', () => {
            const catalogue = getCatalogue();
            expect(catalogue.reminders).toHaveLength(3);
        });
    });

    describe('getEssentialReminders', () => {
        it('should sort reminders by essential_rank', () => {
            const essentials = getEssentialReminders();
            expect(essentials).toHaveLength(2);
            expect(essentials[0].id).toBe('rem-2'); // Rank 1
            expect(essentials[1].id).toBe('rem-1'); // Rank 2
        });

        it('should filter by context if profile provided', () => {
            (applyContextRules as jest.Mock).mockReturnValue(true); // Default allow

            // Mock specific one to be filtered out
            (applyContextRules as jest.Mock).mockImplementation((reminder) => {
                return reminder.id === 'rem-2' ? null : true;
            });

            const essentials = getEssentialReminders({} as any);
            expect(essentials).toHaveLength(1);
            expect(essentials[0].id).toBe('rem-1');
        });
    });

    describe('getAvailableReminders', () => {
        it('should filter reminders based on context rules', () => {
            (applyContextRules as jest.Mock).mockImplementation((reminder) => {
                return reminder.id === 'rem-1' ? true : null;
            });

            const available = getAvailableReminders({} as any);
            expect(available).toHaveLength(1);
            expect(available[0].id).toBe('rem-1');
        });
    });
});
