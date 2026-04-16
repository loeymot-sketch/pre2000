/**
 * Unit Tests for contextMatcher.ts
 * 
 * Tests the context matching logic for Reminders V2.1.1
 */

import {
    matchContext,
    applyContextRules,
    isHotSeason,
    buildContextProfile
} from '../contextMatcher';
import { ContextProfile, ReminderDefinition, ContextRule } from '../../types/remindersV2';

// ============================================
// TEST: matchContext
// ============================================

describe('matchContext', () => {
    const baseProfile: ContextProfile = {
        trimester: 2,
        week_of_pregnancy: 20,
        is_hot_season: false,
        is_ramadan: false,
    };

    test('should match exact trimester', () => {
        expect(matchContext({ trimester: 2 }, baseProfile)).toBe(true);
        expect(matchContext({ trimester: 1 }, baseProfile)).toBe(false);
    });

    test('should match week with exact value', () => {
        expect(matchContext({ week_of_pregnancy: 20 }, baseProfile)).toBe(true);
        expect(matchContext({ week_of_pregnancy: 21 }, baseProfile)).toBe(false);
    });

    test('should match week with comparator gte', () => {
        expect(matchContext({ week_of_pregnancy: { gte: 20 } }, baseProfile)).toBe(true);
        expect(matchContext({ week_of_pregnancy: { gte: 21 } }, baseProfile)).toBe(false);
    });

    test('should match week with comparator lt', () => {
        expect(matchContext({ week_of_pregnancy: { lt: 24 } }, baseProfile)).toBe(true);
        expect(matchContext({ week_of_pregnancy: { lt: 20 } }, baseProfile)).toBe(false);
    });

    test('should match week with comparator range', () => {
        expect(matchContext({ week_of_pregnancy: { gte: 15, lte: 25 } }, baseProfile)).toBe(true);
        expect(matchContext({ week_of_pregnancy: { gte: 21, lte: 25 } }, baseProfile)).toBe(false);
    });

    test('should match boolean flags', () => {
        expect(matchContext({ is_hot_season: false }, baseProfile)).toBe(true);
        expect(matchContext({ is_hot_season: true }, baseProfile)).toBe(false);
    });

    test('should match multiple conditions (AND logic)', () => {
        expect(matchContext({ trimester: 2, is_hot_season: false }, baseProfile)).toBe(true);
        expect(matchContext({ trimester: 2, is_hot_season: true }, baseProfile)).toBe(false);
    });

    test('should return true for empty conditions', () => {
        expect(matchContext({}, baseProfile)).toBe(true);
    });
});

// ============================================
// TEST: applyContextRules
// ============================================

describe('applyContextRules', () => {
    const profile: ContextProfile = {
        trimester: 1,
        week_of_pregnancy: 8,
        is_hot_season: false,
        is_ramadan: false,
    };

    // Create a minimal valid ReminderDefinition for testing
    const createTestReminder = (overrides: Partial<ReminderDefinition> = {}): ReminderDefinition => ({
        id: 'test-reminder',
        category_id: 'test',
        title: { fr: 'Test', ar: 'Test', en: 'Test' },
        description: { fr: 'Desc', ar: 'Desc', en: 'Desc' },
        default_enabled: true,
        frequency_type: 'per_day',
        intensity_options: [1, 2, 3],
        preset_times: { 1: ['09:00'], 2: ['09:00', '15:00'], 3: ['09:00', '13:00', '19:00'] },
        source_ui: 'reminders_only',
        ...overrides
    });

    test('should return empty object when no rules', () => {
        const reminder = createTestReminder({ context_rules: undefined });
        const result = applyContextRules(reminder, profile);
        expect(result).toEqual({});
    });

    test('should return null when rule disables reminder', () => {
        const reminder = createTestReminder({
            context_rules: [
                {
                    priority: 1,
                    when: { week_of_pregnancy: { lt: 24 } },
                    then: { disable: true }
                }
            ]
        });
        const result = applyContextRules(reminder, profile);
        expect(result).toBeNull();
    });

    test('should return override_intensity when rule matches', () => {
        const reminder = createTestReminder({
            context_rules: [
                {
                    priority: 1,
                    when: { trimester: 1 },
                    then: { override_intensity: 1 }
                }
            ]
        });
        const result = applyContextRules(reminder, profile);
        expect(result).toEqual({ override_intensity: 1 });
    });

    test('should merge multiple matching rules', () => {
        const reminder = createTestReminder({
            context_rules: [
                {
                    priority: 1,
                    when: { trimester: 1 },
                    then: { override_intensity: 1 }
                },
                {
                    priority: 2,
                    when: { is_hot_season: false },
                    then: { add_note: { fr: 'Note', ar: 'Note', en: 'Note' } }
                }
            ]
        });
        const result = applyContextRules(reminder, profile);
        expect(result?.override_intensity).toBe(1);
        expect(result?.add_note).toBeDefined();
    });

    test('should respect priority order (higher priority wins)', () => {
        const reminder = createTestReminder({
            context_rules: [
                {
                    priority: 2, // Lower priority
                    when: { trimester: 1 },
                    then: { override_intensity: 2 }
                },
                {
                    priority: 1, // Higher priority
                    when: { trimester: 1 },
                    then: { override_intensity: 1 }
                }
            ]
        });
        const result = applyContextRules(reminder, profile);
        expect(result?.override_intensity).toBe(1); // Priority 1 wins
    });
});

// ============================================
// TEST: buildContextProfile
// ============================================

describe('buildContextProfile', () => {
    test('should correctly calculate trimester 1', () => {
        const profile = buildContextProfile(8);
        expect(profile.trimester).toBe(1);
        expect(profile.week_of_pregnancy).toBe(8);
    });

    test('should correctly calculate trimester 2', () => {
        const profile = buildContextProfile(20);
        expect(profile.trimester).toBe(2);
    });

    test('should correctly calculate trimester 3', () => {
        const profile = buildContextProfile(32);
        expect(profile.trimester).toBe(3);
    });

    test('should include is_hot_season', () => {
        const profile = buildContextProfile(20);
        expect(typeof profile.is_hot_season).toBe('boolean');
    });

    test('should include optional user flags', () => {
        const profile = buildContextProfile(20, {
            has_gestational_diabetes: true,
            is_twins: true
        });
        expect(profile.has_gestational_diabetes).toBe(true);
        expect(profile.is_twins).toBe(true);
    });
});

// ============================================
// TEST: isHotSeason
// ============================================

describe('isHotSeason', () => {
    test('should return boolean', () => {
        expect(typeof isHotSeason()).toBe('boolean');
    });
});
