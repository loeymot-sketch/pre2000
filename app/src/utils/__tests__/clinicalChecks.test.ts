/**
 * Unit tests for clinicalChecks — SAFETY-CRITICAL.
 *
 * Every threshold is a boundary in clinical guidance (gestational diabetes,
 * pre-eclampsia, weight-loss complication). A regression here can mean a
 * dangerous value gets saved silently. Each boundary is therefore tested
 * just-below / at / just-above.
 */

import {
    AlertSeverity,
    checkBloodPressure,
    checkGlucose,
    checkWeightChange,
    getEmergencyNumber,
} from '../clinicalChecks';

const expectSeverity = (
    alert: ReturnType<typeof checkGlucose>,
    severity: AlertSeverity,
) => {
    expect(alert).not.toBeNull();
    expect(alert!.severity).toBe(severity);
};

describe('checkGlucose (mmol/L, fasting)', () => {
    it('returns null for normal value (3.5)', () => {
        expect(checkGlucose(3.5)).toBeNull();
    });

    it('returns null for normal value (5.5 — upper boundary)', () => {
        expect(checkGlucose(5.5)).toBeNull();
    });

    it('returns critical for hypoglycemia (3.4 — just below threshold)', () => {
        const a = checkGlucose(3.4);
        expectSeverity(a, 'critical');
        expect(a!.emergencyAction).toBe('call');
        expect(a!.titleKey).toContain('glucoseLow');
    });

    it('returns warning for surveillance (5.6 — just above normal)', () => {
        const a = checkGlucose(5.6);
        expectSeverity(a, 'warning');
        expect(a!.emergencyAction).toBeUndefined();
    });

    it('returns warning for surveillance upper bound (6.9)', () => {
        expectSeverity(checkGlucose(6.9), 'warning');
    });

    it('returns severe for elevated (7.0 — boundary)', () => {
        const a = checkGlucose(7.0);
        expectSeverity(a, 'severe');
        expect(a!.titleKey).toContain('glucoseHigh');
        expect(a!.emergencyAction).toBeUndefined();
    });

    it('returns severe at upper bound (10.0)', () => {
        expectSeverity(checkGlucose(10.0), 'severe');
    });

    it('returns critical for very high (10.1 — just above 10)', () => {
        const a = checkGlucose(10.1);
        expectSeverity(a, 'critical');
        expect(a!.emergencyAction).toBe('call');
        expect(a!.titleKey).toContain('glucoseVeryHigh');
    });

    it('returns critical for extreme value (15)', () => {
        expectSeverity(checkGlucose(15), 'critical');
    });

    it('returns null for invalid input (NaN, 0, negative)', () => {
        expect(checkGlucose(Number.NaN)).toBeNull();
        expect(checkGlucose(0)).toBeNull();
        expect(checkGlucose(-1)).toBeNull();
    });
});

describe('checkBloodPressure (mmHg)', () => {
    it('returns null for normal BP (120/75)', () => {
        expect(checkBloodPressure(120, 75)).toBeNull();
    });

    it('returns null for low-normal BP (110/70)', () => {
        expect(checkBloodPressure(110, 70)).toBeNull();
    });

    it('returns warning for pre-hypertension (130/80 — sys boundary)', () => {
        expectSeverity(checkBloodPressure(130, 80), 'warning');
    });

    it('returns warning for pre-hypertension via diastolic alone (125/85)', () => {
        expectSeverity(checkBloodPressure(125, 85), 'warning');
    });

    it('returns severe for hypertension (140/85 — sys boundary)', () => {
        const a = checkBloodPressure(140, 85);
        expectSeverity(a, 'severe');
        expect(a!.titleKey).toContain('bpHigh');
        expect(a!.emergencyAction).toBeUndefined();
    });

    it('returns severe for hypertension via diastolic alone (135/95)', () => {
        expectSeverity(checkBloodPressure(135, 95), 'severe');
    });

    it('returns severe at the upper bound (159/109)', () => {
        expectSeverity(checkBloodPressure(159, 109), 'severe');
    });

    it('returns critical for severe hypertension (160/100 — sys boundary)', () => {
        const a = checkBloodPressure(160, 100);
        expectSeverity(a, 'critical');
        expect(a!.emergencyAction).toBe('call');
        expect(a!.titleKey).toContain('bpSevere');
    });

    it('returns critical for severe hypertension via diastolic (140/110)', () => {
        // dia >= 110 alone triggers critical even if sys is in the severe band.
        expectSeverity(checkBloodPressure(140, 110), 'critical');
    });

    it('returns warning for hypotension (85/60)', () => {
        const a = checkBloodPressure(85, 60);
        expectSeverity(a, 'warning');
        expect(a!.titleKey).toContain('bpLow');
    });

    it('returns warning for hypotension via diastolic alone (95/55)', () => {
        expectSeverity(checkBloodPressure(95, 55), 'warning');
    });

    it('returns null for invalid inputs', () => {
        expect(checkBloodPressure(0, 80)).toBeNull();
        expect(checkBloodPressure(120, 0)).toBeNull();
        expect(checkBloodPressure(Number.NaN, 80)).toBeNull();
    });
});

describe('checkWeightChange (kg)', () => {
    it('returns null when there is no previous weight (first entry)', () => {
        expect(checkWeightChange(65)).toBeNull();
        expect(checkWeightChange(65, undefined)).toBeNull();
    });

    it('returns null for stable weight (no variation)', () => {
        expect(checkWeightChange(65, 65)).toBeNull();
    });

    it('returns null for small gain (+1.5 kg)', () => {
        expect(checkWeightChange(66.5, 65)).toBeNull();
    });

    it('returns null at the variation boundary (exactly 2 kg gain)', () => {
        // Threshold is strictly greater than 2 kg.
        expect(checkWeightChange(67, 65)).toBeNull();
    });

    it('returns warning for large gain (>2 kg, e.g. +2.5 kg)', () => {
        const a = checkWeightChange(67.5, 65);
        expectSeverity(a, 'warning');
        expect(a!.titleKey).toContain('weightVariation');
    });

    it('returns warning for moderate loss (-2.5 kg)', () => {
        const a = checkWeightChange(62.5, 65);
        expectSeverity(a, 'warning');
    });

    it('returns severe for rapid loss (-3.5 kg)', () => {
        const a = checkWeightChange(61.5, 65);
        expectSeverity(a, 'severe');
        expect(a!.titleKey).toContain('weightLossRapid');
    });

    it('falls back to warning at the loss boundary (exactly -3 kg)', () => {
        // loss of exactly 3 is NOT > 3 → not severe; variation > 2 → warning.
        const a = checkWeightChange(62, 65);
        expectSeverity(a, 'warning');
    });

    it('returns null for invalid inputs', () => {
        expect(checkWeightChange(0, 65)).toBeNull();
        expect(checkWeightChange(Number.NaN, 65)).toBeNull();
        expect(checkWeightChange(65, 0)).toBeNull();
        expect(checkWeightChange(65, Number.NaN)).toBeNull();
    });
});

describe('getEmergencyNumber', () => {
    it('returns the right number for known countries', () => {
        expect(getEmergencyNumber('FR')).toBe('15');
        expect(getEmergencyNumber('fr')).toBe('15');
        expect(getEmergencyNumber('France')).toBe('15');
        expect(getEmergencyNumber('TN')).toBe('197');
        expect(getEmergencyNumber('Tunisia')).toBe('197');
        expect(getEmergencyNumber('MA')).toBe('141');
        expect(getEmergencyNumber('US')).toBe('911');
    });

    it('returns null for unknown / empty country (NEVER guess)', () => {
        expect(getEmergencyNumber('')).toBeNull();
        expect(getEmergencyNumber('   ')).toBeNull();
        expect(getEmergencyNumber(undefined)).toBeNull();
        expect(getEmergencyNumber(null)).toBeNull();
        expect(getEmergencyNumber('Atlantis')).toBeNull();
    });
});
