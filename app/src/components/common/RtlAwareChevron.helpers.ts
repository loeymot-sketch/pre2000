/**
 * Pure helper for chevron glyph resolution — no React, no React Native imports.
 * Lives in a separate file from RtlAwareChevron.tsx so it can be unit-tested
 * in a Node Jest environment without needing react-native to be importable.
 *
 * IMPORTANT : si tu as besoin du glyph dans un composant React, utilise
 * <RtlAwareChevron /> qui appelle ce helper avec `I18nManager.isRTL` runtime.
 * Ne pas appeler `resolveChevronGlyph()` directement dans le rendu : tu perdrais
 * l'inversion automatique au switch de langue.
 */

export type ChevronDirection = 'forward' | 'back' | 'up' | 'down';
export type ChevronVariant = 'thin' | 'bold' | 'arrow' | 'caret';

export const GLYPH_MAP: Record<
    ChevronVariant,
    { ltrForward: string; ltrBack: string; up: string; down: string }
> = {
    thin: { ltrForward: '›', ltrBack: '‹', up: '▲', down: '▼' },
    bold: { ltrForward: '❯', ltrBack: '❮', up: '⌃', down: '⌄' },
    arrow: { ltrForward: '→', ltrBack: '←', up: '↑', down: '↓' },
    caret: { ltrForward: '▶', ltrBack: '◀', up: '▲', down: '▼' },
};

/**
 * Pure resolver. `isRtl` is required (no implicit dep on I18nManager) so this
 * file stays test-able in a pure Node env.
 */
export function resolveChevronGlyph(
    direction: ChevronDirection,
    variant: ChevronVariant = 'thin',
    isRtl: boolean = false
): string {
    const set = GLYPH_MAP[variant];
    if (direction === 'up') return set.up;
    if (direction === 'down') return set.down;
    if (direction === 'forward') return isRtl ? set.ltrBack : set.ltrForward;
    return isRtl ? set.ltrForward : set.ltrBack;
}
