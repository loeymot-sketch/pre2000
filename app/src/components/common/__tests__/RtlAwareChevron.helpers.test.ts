/**
 * Tests purs pour resolveChevronGlyph (helper sans rendering React).
 * Les tests utilisent le 3e param `isRtl` pour simuler I18nManager.
 */
import { resolveChevronGlyph } from '../RtlAwareChevron.helpers';

describe('resolveChevronGlyph', () => {
    describe('thin variant (default)', () => {
        it("forward in LTR returns '›'", () => {
            expect(resolveChevronGlyph('forward', 'thin', false)).toBe('›');
        });
        it("forward in RTL returns '‹' (mirrored)", () => {
            expect(resolveChevronGlyph('forward', 'thin', true)).toBe('‹');
        });
        it("back in LTR returns '‹'", () => {
            expect(resolveChevronGlyph('back', 'thin', false)).toBe('‹');
        });
        it("back in RTL returns '›' (mirrored)", () => {
            expect(resolveChevronGlyph('back', 'thin', true)).toBe('›');
        });
    });

    describe('arrow variant', () => {
        it("forward in LTR returns '→'", () => {
            expect(resolveChevronGlyph('forward', 'arrow', false)).toBe('→');
        });
        it("forward in RTL returns '←'", () => {
            expect(resolveChevronGlyph('forward', 'arrow', true)).toBe('←');
        });
        it("back in LTR returns '←'", () => {
            expect(resolveChevronGlyph('back', 'arrow', false)).toBe('←');
        });
        it("back in RTL returns '→'", () => {
            expect(resolveChevronGlyph('back', 'arrow', true)).toBe('→');
        });
    });

    describe('bold and caret variants', () => {
        it("bold forward LTR/RTL", () => {
            expect(resolveChevronGlyph('forward', 'bold', false)).toBe('❯');
            expect(resolveChevronGlyph('forward', 'bold', true)).toBe('❮');
        });
        it("caret forward LTR/RTL", () => {
            expect(resolveChevronGlyph('forward', 'caret', false)).toBe('▶');
            expect(resolveChevronGlyph('forward', 'caret', true)).toBe('◀');
        });
    });

    describe('vertical directions never mirror', () => {
        it("up returns '▲' regardless of RTL", () => {
            expect(resolveChevronGlyph('up', 'thin', false)).toBe('▲');
            expect(resolveChevronGlyph('up', 'thin', true)).toBe('▲');
        });
        it("down returns '▼' regardless of RTL", () => {
            expect(resolveChevronGlyph('down', 'thin', false)).toBe('▼');
            expect(resolveChevronGlyph('down', 'thin', true)).toBe('▼');
        });
        it("arrow up = '↑' both directions", () => {
            expect(resolveChevronGlyph('up', 'arrow', false)).toBe('↑');
            expect(resolveChevronGlyph('up', 'arrow', true)).toBe('↑');
        });
    });

    describe('default variant is thin', () => {
        it("omitting variant defaults to thin", () => {
            expect(resolveChevronGlyph('forward', undefined, false)).toBe('›');
        });
    });
});
