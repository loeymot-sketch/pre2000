/**
 * Context Matcher for Reminders V2.1.1
 * 
 * Evaluates context rules against user's profile
 * to determine adaptive behavior (intensity, times, disable).
 */

import {
    NumComparator,
    ContextRuleWhen,
    ContextProfile,
    ContextRule,
    ReminderDefinition,
    ContextRuleThen
} from '../types/remindersV2';

/**
 * Match a number against a comparator or exact value
 */
function matchNum(value: number, cond: number | NumComparator): boolean {
    if (typeof cond === 'number') return value === cond;

    if (cond.eq !== undefined && value !== cond.eq) return false;
    if (cond.lt !== undefined && !(value < cond.lt)) return false;
    if (cond.lte !== undefined && !(value <= cond.lte)) return false;
    if (cond.gt !== undefined && !(value > cond.gt)) return false;
    if (cond.gte !== undefined && !(value >= cond.gte)) return false;
    if (cond.in && !cond.in.includes(value)) return false;

    return true;
}

/**
 * Check if a rule's "when" condition matches the user's profile
 */
export function matchContext(rule: ContextRuleWhen, profile: ContextProfile): boolean {
    for (const key of Object.keys(rule) as (keyof ContextRuleWhen)[]) {
        const expected = rule[key];
        const actual = profile[key as keyof ContextProfile];

        if (expected === undefined) continue;

        if (key === 'week_of_pregnancy') {
            if (!matchNum(actual as number, expected as number | NumComparator)) {
                return false;
            }
        } else {
            if (actual !== expected) return false;
        }
    }
    return true;
}

/**
 * Apply all matching context rules to a reminder
 * Returns the merged "then" actions, or null if reminder should be disabled
 */
export function applyContextRules(
    reminder: ReminderDefinition,
    profile: ContextProfile
): ContextRuleThen | null {
    if (!reminder.context_rules || reminder.context_rules.length === 0) {
        return {}; // No rules, use defaults
    }

    // Sort rules by priority (1 = highest)
    const sortedRules = [...reminder.context_rules].sort(
        (a, b) => a.priority - b.priority
    );

    const mergedThen: ContextRuleThen = {};

    for (const rule of sortedRules) {
        if (matchContext(rule.when, profile)) {
            // Check for disable first
            if (rule.then.disable) {
                return null; // Reminder should be hidden/disabled
            }

            // Merge other actions (higher priority = applied first)
            if (rule.then.override_intensity !== undefined && mergedThen.override_intensity === undefined) {
                mergedThen.override_intensity = rule.then.override_intensity;
            }
            if (rule.then.override_times !== undefined && mergedThen.override_times === undefined) {
                mergedThen.override_times = rule.then.override_times;
            }
            if (rule.then.add_note !== undefined && mergedThen.add_note === undefined) {
                mergedThen.add_note = rule.then.add_note;
            }
        }
    }

    return mergedThen;
}

/**
 * Check if current date is in hot season (for Maghreb)
 * Hot season: June 1 - September 30
 */
export function isHotSeason(): boolean {
    const month = new Date().getMonth(); // 0-indexed
    return month >= 5 && month <= 8; // June (5) to September (8)
}

/**
 * Check if current date is during Ramadan
 * NOTE: This is a simplified version. For production,
 * use a proper Hijri calendar library.
 */
export function isRamadan(): boolean {
    // TODO: Implement with Hijri calendar
    // For now, return false (will be set manually in user profile)
    return false;
}

/**
 * Build a ContextProfile from user data
 */
export function buildContextProfile(
    weekOfPregnancy: number,
    userFlags?: {
        has_gestational_diabetes?: boolean;
        has_hypertension?: boolean;
        is_twins?: boolean;
        work_schedule?: 'home' | 'office' | 'shift';
        is_ramadan?: boolean;
    }
): ContextProfile {
    const trimester: 1 | 2 | 3 = weekOfPregnancy <= 12 ? 1 : weekOfPregnancy <= 27 ? 2 : 3;

    return {
        trimester,
        week_of_pregnancy: weekOfPregnancy,
        is_hot_season: isHotSeason(),
        is_ramadan: userFlags?.is_ramadan ?? false,
        has_gestational_diabetes: userFlags?.has_gestational_diabetes,
        has_hypertension: userFlags?.has_hypertension,
        is_twins: userFlags?.is_twins,
        work_schedule: userFlags?.work_schedule,
    };
}
