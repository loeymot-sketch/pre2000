/**
 * Non-regression tests for getReminderMessage(reminderType, locale) (F14 fix).
 *
 * F14 BUG (pre-fix):
 *  1. Default fallback was `getHydrationMessage` → ANY unknown reminder produced
 *     "drink water!" copy, which misled users for unrelated reminders (e.g. a
 *     custom "appointment_prep" id was sent as a hydration nudge).
 *  2. The mapping was substring-only (legacy `includes()` chain), so V2 ids
 *     could collide unexpectedly (e.g. "rem_meal_iron_breakfast" → matched
 *     "iron" first and routed to vitamins instead of meal).
 *
 * F14 FIX:
 *  - Path A: explicit V2 prefix matching (`rem_<family>_*`) — deterministic,
 *    checked first.
 *  - Path B: legacy substring `includes()` chain kept for backward compat.
 *  - Default fallback: WELLNESS (generic encouragement, never misleading).
 *
 * STRATÉGIE: i18n.t est mocké pour retourner un array à 1 élément par famille,
 * dont le `title` encode la famille appelée. On vérifie le routage par le titre
 * retourné — pas besoin de stub Math.random puisque chaque array a 1 élément.
 */

// ────────────────────────────────────────────────────────────────────────────
// MOCK i18n
// ────────────────────────────────────────────────────────────────────────────

/**
 * Family marker — the test verifies which getXMessage() was reached by reading
 * the title returned. Each family resolves to a distinct, single-element array
 * so the random-pick step in `getRandomMessage` is deterministic.
 */
const FAMILY_TITLES = {
    hydration: 'FAMILY_HYDRATION',
    vitamins: 'FAMILY_VITAMINS',
    rest: 'FAMILY_REST',
    exercise: 'FAMILY_EXERCISE',
    meal: 'FAMILY_MEAL',
    medical: 'FAMILY_MEDICAL',
    wellness: 'FAMILY_WELLNESS',
} as const;

const i18nMap: Record<string, Array<{ title: string; body: string }>> = {
    'notifications.hydration': [{ title: FAMILY_TITLES.hydration, body: 'b' }],
    'notifications.vitamins': [{ title: FAMILY_TITLES.vitamins, body: 'b' }],
    'notifications.rest': [{ title: FAMILY_TITLES.rest, body: 'b' }],
    'notifications.exercise': [{ title: FAMILY_TITLES.exercise, body: 'b' }],
    'notifications.meal': [{ title: FAMILY_TITLES.meal, body: 'b' }],
    'notifications.medical': [{ title: FAMILY_TITLES.medical, body: 'b' }],
    'notifications.wellness': [{ title: FAMILY_TITLES.wellness, body: 'b' }],
};

jest.mock('../../i18n', () => ({
    __esModule: true,
    default: {
        t: jest.fn((key: string, _options?: unknown) => {
            return i18nMap[key] ?? [];
        }),
    },
}));

import { getReminderMessage } from '../notificationMessages';

// ────────────────────────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('getReminderMessage — F14 prefix mapping & safe default', () => {
    describe('Path A: V2 prefix matching (rem_<family>_*) — deterministic', () => {
        it('rem_hyd_* → hydration family', () => {
            expect(getReminderMessage('rem_hyd_morning').title).toBe(FAMILY_TITLES.hydration);
            expect(getReminderMessage('rem_hyd_afternoon').title).toBe(FAMILY_TITLES.hydration);
        });

        it('rem_vit_* → vitamins family', () => {
            expect(getReminderMessage('rem_vit_iron').title).toBe(FAMILY_TITLES.vitamins);
            expect(getReminderMessage('rem_vit_folate').title).toBe(FAMILY_TITLES.vitamins);
        });

        it('rem_med_* → vitamins family (medication tagged with vitamins copy)', () => {
            expect(getReminderMessage('rem_med_aspirin').title).toBe(FAMILY_TITLES.vitamins);
        });

        it('rem_sleep_* and rem_rest_* → rest family', () => {
            expect(getReminderMessage('rem_sleep_night').title).toBe(FAMILY_TITLES.rest);
            expect(getReminderMessage('rem_rest_afternoon').title).toBe(FAMILY_TITLES.rest);
        });

        it('rem_mov_* and rem_exercise_* → exercise family', () => {
            expect(getReminderMessage('rem_mov_walk').title).toBe(FAMILY_TITLES.exercise);
            expect(getReminderMessage('rem_exercise_yoga').title).toBe(FAMILY_TITLES.exercise);
        });

        it('rem_meal_* and rem_food_* → meal family', () => {
            expect(getReminderMessage('rem_meal_breakfast').title).toBe(FAMILY_TITLES.meal);
            expect(getReminderMessage('rem_food_snack').title).toBe(FAMILY_TITLES.meal);
        });

        it('rem_glucose_*, rem_bp_*, rem_weight_* → medical family', () => {
            expect(getReminderMessage('rem_glucose_morning').title).toBe(FAMILY_TITLES.medical);
            expect(getReminderMessage('rem_bp_evening').title).toBe(FAMILY_TITLES.medical);
            expect(getReminderMessage('rem_weight_weekly').title).toBe(FAMILY_TITLES.medical);
        });

        it('rem_well_*, rem_journal_*, rem_relax_* → wellness family', () => {
            expect(getReminderMessage('rem_well_breath').title).toBe(FAMILY_TITLES.wellness);
            expect(getReminderMessage('rem_journal_evening').title).toBe(FAMILY_TITLES.wellness);
            expect(getReminderMessage('rem_relax_meditation').title).toBe(FAMILY_TITLES.wellness);
        });

        it('lowercases the type before matching prefixes (case-insensitive)', () => {
            expect(getReminderMessage('REM_HYD_MORNING').title).toBe(FAMILY_TITLES.hydration);
            expect(getReminderMessage('Rem_Vit_Iron').title).toBe(FAMILY_TITLES.vitamins);
        });
    });

    describe('Path B: legacy substring matching (backward compat with old custom ids)', () => {
        it('substring "hydration" / "eau" / "water" → hydration family', () => {
            expect(getReminderMessage('legacy_hydration_id').title).toBe(FAMILY_TITLES.hydration);
            expect(getReminderMessage('boire_de_l_eau').title).toBe(FAMILY_TITLES.hydration);
            expect(getReminderMessage('drink_water_now').title).toBe(FAMILY_TITLES.hydration);
        });

        it('substring "vitamin" / "fer" / "iron" / "folate" → vitamins family', () => {
            expect(getReminderMessage('daily_vitamin_id').title).toBe(FAMILY_TITLES.vitamins);
            expect(getReminderMessage('prise_de_fer').title).toBe(FAMILY_TITLES.vitamins);
            expect(getReminderMessage('iron_supplement').title).toBe(FAMILY_TITLES.vitamins);
        });

        it('substring "sieste" / "sleep" / "repos" → rest family', () => {
            expect(getReminderMessage('sieste_apres_midi').title).toBe(FAMILY_TITLES.rest);
            expect(getReminderMessage('go_to_sleep').title).toBe(FAMILY_TITLES.rest);
        });

        it('substring "walk" / "yoga" / "kegel" → exercise family', () => {
            expect(getReminderMessage('morning_walk').title).toBe(FAMILY_TITLES.exercise);
            expect(getReminderMessage('prenatal_yoga').title).toBe(FAMILY_TITLES.exercise);
            expect(getReminderMessage('kegel_session').title).toBe(FAMILY_TITLES.exercise);
        });

        it('substring "snack" / "repas" / "dejeuner" → meal family', () => {
            expect(getReminderMessage('healthy_snack').title).toBe(FAMILY_TITLES.meal);
            expect(getReminderMessage('petit_dejeuner').title).toBe(FAMILY_TITLES.meal);
        });

        it('substring "tension" / "blood" / "poids" → medical family', () => {
            expect(getReminderMessage('check_tension').title).toBe(FAMILY_TITLES.medical);
            expect(getReminderMessage('blood_glucose').title).toBe(FAMILY_TITLES.medical);
            expect(getReminderMessage('peser_poids').title).toBe(FAMILY_TITLES.medical);
        });

        it('substring "journal" / "meditation" / "breathing" → wellness family', () => {
            expect(getReminderMessage('write_journal').title).toBe(FAMILY_TITLES.wellness);
            expect(getReminderMessage('meditation_evening').title).toBe(FAMILY_TITLES.wellness);
            expect(getReminderMessage('breathing_5min').title).toBe(FAMILY_TITLES.wellness);
        });
    });

    describe('F14 FIX: default fallback is WELLNESS (NOT hydration)', () => {
        it('totally unmapped id → wellness family (not hydration)', () => {
            const result = getReminderMessage('totally_unmapped_xyz');
            expect(result.title).toBe(FAMILY_TITLES.wellness);
            expect(result.title).not.toBe(FAMILY_TITLES.hydration);
        });

        it('empty string → wellness family (not hydration)', () => {
            expect(getReminderMessage('').title).toBe(FAMILY_TITLES.wellness);
        });

        it('numeric-only id → wellness family', () => {
            expect(getReminderMessage('12345').title).toBe(FAMILY_TITLES.wellness);
        });

        it('regression: plain "appointment" / "rdv" id (legacy custom) does NOT route to hydration', () => {
            // Pre-F14 these would have hit the default and shown "drink water!".
            expect(getReminderMessage('appointment_prep').title).toBe(FAMILY_TITLES.wellness);
            expect(getReminderMessage('rdv_demain').title).toBe(FAMILY_TITLES.wellness);
        });
    });

    describe('Path A vs Path B precedence', () => {
        it('V2 prefix wins over a misleading substring (e.g. rem_meal_iron_breakfast → meal, NOT vitamins)', () => {
            // "iron" would match path B (vitamins) — but rem_meal_ is path A (meal).
            // Path A is checked first, so the result must be meal.
            expect(getReminderMessage('rem_meal_iron_breakfast').title).toBe(FAMILY_TITLES.meal);
        });

        it('V2 prefix wins over substring "water" inside the id', () => {
            // "rem_well_water_break" — well prefix should win even though "water" is present.
            expect(getReminderMessage('rem_well_water_break').title).toBe(FAMILY_TITLES.wellness);
        });
    });

    describe('return shape', () => {
        it('always returns an object with title and body strings', () => {
            const r = getReminderMessage('rem_hyd_morning');
            expect(typeof r.title).toBe('string');
            expect(typeof r.body).toBe('string');
        });

        it('forwards locale option to i18n.t (used for translation)', () => {
            const i18n = require('../../i18n').default;
            (i18n.t as jest.Mock).mockClear();

            getReminderMessage('rem_hyd_morning', 'ar');

            expect(i18n.t).toHaveBeenCalledWith(
                'notifications.hydration',
                expect.objectContaining({ lng: 'ar', returnObjects: true })
            );
        });

        it('does not pass lng when locale is omitted (uses i18n default)', () => {
            const i18n = require('../../i18n').default;
            (i18n.t as jest.Mock).mockClear();

            getReminderMessage('rem_hyd_morning');

            const call = (i18n.t as jest.Mock).mock.calls[0];
            expect(call[1]).toEqual(expect.objectContaining({ returnObjects: true }));
            expect(call[1]).not.toHaveProperty('lng');
        });
    });
});
