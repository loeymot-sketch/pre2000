import { getBadgeColors, getBadgeSize } from '../Badge.helpers';
import { theme } from '../../../theme';

describe('Badge helpers', () => {
    describe('getBadgeColors', () => {
        it('returns greenish palette for success', () => {
            const c = getBadgeColors('success');
            expect(c.bg).toMatch(/rgba\(/);
            expect(c.text).toBe('#2E7D32');
        });

        it('returns orange palette for warning', () => {
            const c = getBadgeColors('warning');
            expect(c.text).toBe('#E65100');
        });

        it('returns red palette for error', () => {
            const c = getBadgeColors('error');
            expect(c.text).toBe('#C62828');
        });

        it('returns info color for info', () => {
            const c = getBadgeColors('info');
            expect(c.text).toBe(theme.colors.info);
        });

        it('returns accent for primary', () => {
            const c = getBadgeColors('primary');
            expect(c.text).toBe(theme.colors.accent);
        });

        it('returns neutral palette by default', () => {
            const c = getBadgeColors('neutral');
            expect(c.bg).toBe(theme.colors.borderLight);
            expect(c.text).toBe(theme.colors.textSecondary);
        });
    });

    describe('getBadgeSize', () => {
        it('returns smaller paddings/font for small', () => {
            const s = getBadgeSize('small');
            expect(s.fontSize).toBe(12);
            expect(s.paddingVertical).toBe(2);
            expect(s.paddingHorizontal).toBe(8);
        });

        it('returns medium dimensions', () => {
            const m = getBadgeSize('medium');
            expect(m.fontSize).toBe(14);
            expect(m.paddingVertical).toBe(4);
            expect(m.paddingHorizontal).toBe(10);
        });
    });
});
