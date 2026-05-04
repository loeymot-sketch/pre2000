/**
 * @fileoverview SAFETY: scheme-whitelist for Linking.openURL.
 *
 * react-native-markdown-display emits onLinkPress(url) for any link in user-visible
 * markdown. Even though our markdown content currently comes from internal Firestore
 * collections (write:false), defense-in-depth requires us to whitelist the URL scheme
 * before handing the value to Linking.openURL — which on iOS/Android can dispatch
 * exotic schemes (tel:, sms:, file:, javascript: where supported, intent://, etc.)
 * and trigger native side-effects.
 *
 * Whitelist (must remain conservative):
 *   - http   : public web links
 *   - https  : public web links (preferred)
 *   - mailto : email composition
 *   - tel    : phone dialer (used by emergency CTA + contacts)
 *
 * Anything else (file:, data:, javascript:, intent:, content:, ftp:, ws://, etc.)
 * is REJECTED — the function returns false and the caller should not open the URL.
 */

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Extract the scheme of a URL string without throwing on malformed input.
 * Returns the scheme INCLUDING the trailing colon, lowercased (e.g. "https:").
 * Returns null when no scheme can be parsed.
 */
const parseScheme = (raw: string): string | null => {
    if (typeof raw !== 'string' || raw.length === 0) {
        return null;
    }
    const trimmed = raw.trim();
    const idx = trimmed.indexOf(':');
    if (idx <= 0) {
        return null;
    }
    const scheme = trimmed.slice(0, idx + 1).toLowerCase();
    if (!/^[a-z][a-z0-9+\-.]*:$/.test(scheme)) {
        return null;
    }
    return scheme;
};

/**
 * Returns true when the URL's scheme is in the whitelist (safe to open).
 * Returns false when the URL is malformed, missing a scheme, or uses a
 * non-whitelisted scheme (file:, data:, javascript:, intent:, etc.).
 */
export const isSafeUrl = (raw: string | null | undefined): boolean => {
    if (raw === null || raw === undefined) {
        return false;
    }
    const scheme = parseScheme(raw);
    if (!scheme) {
        return false;
    }
    return ALLOWED_SCHEMES.has(scheme);
};

/**
 * Same as isSafeUrl but also returns the parsed scheme for logging callers.
 * Test seam — production code should prefer isSafeUrl.
 */
export const inspectUrl = (raw: string | null | undefined): {
    safe: boolean;
    scheme: string | null;
} => {
    if (raw === null || raw === undefined) {
        return { safe: false, scheme: null };
    }
    const scheme = parseScheme(raw);
    return { safe: scheme ? ALLOWED_SCHEMES.has(scheme) : false, scheme };
};
