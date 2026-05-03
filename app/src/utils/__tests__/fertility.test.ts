import {
    calculateCycleDay,
    calculateFertileWindow,
    calculateOvulationDate,
} from '../fertility';

describe('fertility', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    describe('calculateOvulationDate', () => {
        it('should return LMP + 14 days for a 28-day cycle (textbook case)', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 28);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-01-15');
        });

        it('should return LMP + 7 days for a short 21-day cycle', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 21);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-01-08');
        });

        it('should return LMP + 21 days for a long 35-day cycle', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 35);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-01-22');
        });

        it('should clamp absurdly short cycles to the 21-day floor', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 10);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-01-08'); // clamped to 21 → +7
        });

        it('should clamp absurdly long cycles to the 35-day ceiling', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 60);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-01-22'); // clamped to 35 → +21
        });

        it('should default to a 28-day cycle when cycleLength is omitted', () => {
            const lmp = new Date('2024-02-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-02-15');
        });

        it('should round non-integer cycle lengths', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 28.7);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-01-16'); // 29 → +15
        });

        it('should throw on an invalid lastPeriodDate', () => {
            expect(() =>
                calculateOvulationDate(new Date('not-a-date'), 28),
            ).toThrow(/invalid lastPeriodDate/);
        });

        it('should correctly cross a month boundary', () => {
            const lmp = new Date('2024-01-25T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 28);
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-02-08');
        });

        it('should correctly cross a leap day (Feb 29 2024)', () => {
            const lmp = new Date('2024-02-20T12:00:00.000Z');
            const ovulation = calculateOvulationDate(lmp, 28); // +14 → 2024-03-05
            expect(ovulation.toISOString().split('T')[0]).toBe('2024-03-05');
        });
    });

    describe('calculateFertileWindow', () => {
        it('should return a window from ovulation-5 to ovulation+1 (28-day cycle)', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const { ovulationDate, fertileWindowStart, fertileWindowEnd } =
                calculateFertileWindow(lmp, 28);

            expect(ovulationDate.toISOString().split('T')[0]).toBe('2024-01-15');
            expect(fertileWindowStart.toISOString().split('T')[0]).toBe('2024-01-10');
            expect(fertileWindowEnd.toISOString().split('T')[0]).toBe('2024-01-16');
        });

        it('should return a 7-day window total (start..end inclusive)', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const { fertileWindowStart, fertileWindowEnd } =
                calculateFertileWindow(lmp, 28);

            const diffDays = Math.round(
                (fertileWindowEnd.getTime() - fertileWindowStart.getTime()) /
                    (1000 * 60 * 60 * 24),
            );
            expect(diffDays).toBe(6); // 6 days span = 7 days inclusive
        });

        it('should shift the window earlier for short 21-day cycles', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const { ovulationDate, fertileWindowStart } =
                calculateFertileWindow(lmp, 21);
            expect(ovulationDate.toISOString().split('T')[0]).toBe('2024-01-08');
            expect(fertileWindowStart.toISOString().split('T')[0]).toBe('2024-01-03');
        });

        it('should shift the window later for long 35-day cycles', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const { ovulationDate, fertileWindowEnd } =
                calculateFertileWindow(lmp, 35);
            expect(ovulationDate.toISOString().split('T')[0]).toBe('2024-01-22');
            expect(fertileWindowEnd.toISOString().split('T')[0]).toBe('2024-01-23');
        });
    });

    describe('calculateCycleDay', () => {
        it('should return 1 when today equals lastPeriodDate', () => {
            const lmp = new Date('2024-01-10T08:00:00.000Z');
            const today = new Date('2024-01-10T22:00:00.000Z');
            expect(calculateCycleDay(lmp, today)).toBe(1);
        });

        it('should return 8 when today is 7 days after LMP', () => {
            const lmp = new Date('2024-01-01T12:00:00.000Z');
            const today = new Date('2024-01-08T12:00:00.000Z');
            expect(calculateCycleDay(lmp, today)).toBe(8);
        });

        it('should return null when LMP is in the future', () => {
            const lmp = new Date('2024-02-01T12:00:00.000Z');
            const today = new Date('2024-01-15T12:00:00.000Z');
            expect(calculateCycleDay(lmp, today)).toBeNull();
        });

        it('should return null on invalid inputs', () => {
            expect(calculateCycleDay(new Date('xxx'), new Date())).toBeNull();
        });
    });
});
