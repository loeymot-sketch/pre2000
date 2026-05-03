/**
 * Unit tests for validateHealthEntry — guards against invalid medical input.
 *
 * Critical because the app collects weight, BP, glucose data used to display
 * health stats. Bad input = bad displayed stats = patient confusion.
 */

import { validateHealthEntry } from '../validation';

describe('validateHealthEntry', () => {
    describe('weight', () => {
        it('rejects 0 weight', () => {
            const r = validateHealthEntry({ type: 'weight', value: 0 });
            expect(r.valid).toBe(false);
            expect(r.error).toBe('weight.errors.weightPositive');
        });

        it('rejects negative weight', () => {
            const r = validateHealthEntry({ type: 'weight', value: -5 });
            expect(r.valid).toBe(false);
        });

        it('rejects weight above 300 kg', () => {
            const r = validateHealthEntry({ type: 'weight', value: 350 });
            expect(r.valid).toBe(false);
            expect(r.error).toBe('weight.errors.weightTooHigh');
        });

        it('accepts a normal weight (60 kg)', () => {
            const r = validateHealthEntry({ type: 'weight', value: 60 });
            expect(r.valid).toBe(true);
        });

        it('accepts weight at the upper boundary (300 kg)', () => {
            const r = validateHealthEntry({ type: 'weight', value: 300 });
            expect(r.valid).toBe(true);
        });

        it('rejects undefined value', () => {
            const r = validateHealthEntry({ type: 'weight' });
            expect(r.valid).toBe(false);
        });
    });

    describe('blood_pressure', () => {
        it('rejects when systolic is missing', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', diastolic: 80 });
            expect(r.valid).toBe(false);
            expect(r.error).toBe('weight.errors.bpRequired');
        });

        it('rejects when diastolic is missing', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 120 });
            expect(r.valid).toBe(false);
        });

        it('rejects systolic out of bounds (low)', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 40, diastolic: 80 });
            expect(r.valid).toBe(false);
            expect(r.error).toBe('weight.errors.bpSystolicInvalid');
        });

        it('rejects systolic out of bounds (high)', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 400, diastolic: 80 });
            expect(r.valid).toBe(false);
        });

        it('rejects diastolic out of bounds', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 120, diastolic: 250 });
            expect(r.valid).toBe(false);
            expect(r.error).toBe('weight.errors.bpDiastolicInvalid');
        });

        it('rejects diastolic >= systolic (medically impossible)', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 80, diastolic: 80 });
            expect(r.valid).toBe(false);
            expect(r.error).toBe('weight.errors.bpDiastolicHigher');
        });

        it('rejects diastolic > systolic', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 80, diastolic: 120 });
            expect(r.valid).toBe(false);
        });

        it('accepts a normal BP (120/80)', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 120, diastolic: 80 });
            expect(r.valid).toBe(true);
        });

        it('accepts edge case (sys just above dia)', () => {
            const r = validateHealthEntry({ type: 'blood_pressure', systolic: 81, diastolic: 80 });
            expect(r.valid).toBe(true);
        });
    });

    describe('error keys are all i18n-mappable', () => {
        // Ensures all returned error strings look like i18n keys (no hardcoded FR)
        const errorCases = [
            { type: 'weight' as const, value: 0 },
            { type: 'weight' as const, value: 999 },
            { type: 'blood_pressure' as const, systolic: 80, diastolic: 80 },
            { type: 'blood_pressure' as const, systolic: 0, diastolic: 0 },
        ];
        errorCases.forEach((input, i) => {
            it(`case #${i + 1} returns an i18n key (no spaces, no accented chars)`, () => {
                const r = validateHealthEntry(input);
                expect(r.valid).toBe(false);
                expect(r.error).toMatch(/^[a-zA-Z][\w.]+$/);
            });
        });
    });
});
