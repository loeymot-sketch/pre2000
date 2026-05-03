declare const __DEV__: boolean;

/**
 * Convert `#RRGGBB` / `#RGB` to `rgba(r,g,b,a)`.
 * Non-hex input falls back to black (same as previous inline implementation).
 */
export const hexToRgba = (hex: string, opacity: number): string => {
    const h = hex.trim();
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !/^#([A-Fa-f0-9]{3}){1,2}$/.test(h)) {
        console.warn(
            `[hexToRgba] expected #RGB or #RRGGBB, got ${JSON.stringify(hex)} — using black fallback`
        );
    }
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(h)) {
        c = h.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
    }
    return `rgba(0,0,0,${opacity})`;
};
