/**
 * @fileoverview TTC (Trying To Conceive) fertility calculations.
 *
 * Provides ovulation and fertile window estimates for users in TTC mode.
 * These are NOT pregnancy calculations — they are pre-conception estimates
 * used to display the next fertile window.
 *
 * Model used: Calendar-based (Knaus–Ogino style).
 * - Ovulation occurs roughly `cycleLength - 14` days after the first day
 *   of the last period (the luteal phase is the most stable at ~14 days).
 * - Fertile window: 5 days before ovulation up to and including 1 day after,
 *   matching the egg + sperm survival window used by most fertility apps.
 *
 * Limits:
 * - Calendar method, not BBT/LH/cervical-mucus based.
 * - Assumes a regular cycle. Highly irregular cycles need a different model.
 *
 * Source: ACOG fertility awareness — https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning
 */

export const TTC_MIN_CYCLE_LENGTH = 21;
export const TTC_MAX_CYCLE_LENGTH = 35;
export const TTC_LUTEAL_PHASE_DAYS = 14;
export const TTC_FERTILE_WINDOW_DAYS_BEFORE_OVULATION = 5;
export const TTC_FERTILE_WINDOW_DAYS_AFTER_OVULATION = 1;

export interface FertileWindow {
    ovulationDate: Date;
    fertileWindowStart: Date;
    fertileWindowEnd: Date;
}

const isValidDate = (d: Date | null | undefined): d is Date =>
    !!d && d instanceof Date && !isNaN(d.getTime());

const clampCycleLength = (cycleLength: number): number => {
    if (!Number.isFinite(cycleLength)) return 28;
    return Math.max(
        TTC_MIN_CYCLE_LENGTH,
        Math.min(TTC_MAX_CYCLE_LENGTH, Math.round(cycleLength)),
    );
};

/**
 * Estimate the ovulation date for the cycle starting on `lastPeriodDate`.
 *
 * Formula: ovulation = lastPeriodDate + (cycleLength - 14) days.
 * Cycle length is clamped to [21, 35] days for safety.
 *
 * @param lastPeriodDate - First day of the last menstrual period.
 * @param cycleLength    - Average cycle length in days (default 28).
 */
export const calculateOvulationDate = (
    lastPeriodDate: Date,
    cycleLength: number = 28,
): Date => {
    if (!isValidDate(lastPeriodDate)) {
        throw new Error('calculateOvulationDate: invalid lastPeriodDate');
    }
    const cycle = clampCycleLength(cycleLength);
    const ovulationOffset = cycle - TTC_LUTEAL_PHASE_DAYS;
    const ovulation = new Date(lastPeriodDate.getTime());
    ovulation.setDate(ovulation.getDate() + ovulationOffset);
    return ovulation;
};

/**
 * Compute the full fertile window around an ovulation date.
 *
 * Window: [ovulation - 5 days, ovulation + 1 day] (inclusive).
 */
export const calculateFertileWindow = (
    lastPeriodDate: Date,
    cycleLength: number = 28,
): FertileWindow => {
    const ovulationDate = calculateOvulationDate(lastPeriodDate, cycleLength);

    const fertileWindowStart = new Date(ovulationDate.getTime());
    fertileWindowStart.setDate(
        fertileWindowStart.getDate() - TTC_FERTILE_WINDOW_DAYS_BEFORE_OVULATION,
    );

    const fertileWindowEnd = new Date(ovulationDate.getTime());
    fertileWindowEnd.setDate(
        fertileWindowEnd.getDate() + TTC_FERTILE_WINDOW_DAYS_AFTER_OVULATION,
    );

    return { ovulationDate, fertileWindowStart, fertileWindowEnd };
};

/**
 * 1-based day of the cycle for `today` given a `lastPeriodDate`.
 * Day 1 = first day of the period. Returns null if the period is in the future.
 */
export const calculateCycleDay = (
    lastPeriodDate: Date,
    today: Date = new Date(),
): number | null => {
    if (!isValidDate(lastPeriodDate) || !isValidDate(today)) return null;

    const lmpUtc = Date.UTC(
        lastPeriodDate.getUTCFullYear(),
        lastPeriodDate.getUTCMonth(),
        lastPeriodDate.getUTCDate(),
    );
    const todayUtc = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
    );
    const diffDays = Math.floor((todayUtc - lmpUtc) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    return diffDays + 1;
};
