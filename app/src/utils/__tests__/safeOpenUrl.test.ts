/**
 * Tests for safeOpenUrl scheme whitelist.
 *
 * Defense-in-depth: even when Markdown content comes from internal CMS (Firestore
 * static collections, write:false), we whitelist URL schemes before dispatching
 * to React Native's Linking.openURL. This file pins the whitelist so a future
 * "small" change can't accidentally re-enable file:, data:, javascript:, intent:.
 */

import { isSafeUrl, inspectUrl } from '../safeOpenUrl';

describe('safeOpenUrl — scheme whitelist (defense-in-depth)', () => {
    describe('isSafeUrl', () => {
        it('accepts http://', () => {
            expect(isSafeUrl('http://example.com')).toBe(true);
            expect(isSafeUrl('HTTP://example.com')).toBe(true);
        });

        it('accepts https:// (preferred)', () => {
            expect(isSafeUrl('https://example.com')).toBe(true);
            expect(isSafeUrl('HTTPS://EXAMPLE.COM')).toBe(true);
        });

        it('accepts mailto:', () => {
            expect(isSafeUrl('mailto:contact@example.com')).toBe(true);
            expect(isSafeUrl('MAILTO:contact@example.com')).toBe(true);
        });

        it('accepts tel:', () => {
            expect(isSafeUrl('tel:190')).toBe(true);
            expect(isSafeUrl('tel:+33145678901')).toBe(true);
            expect(isSafeUrl('TEL:911')).toBe(true);
        });

        it('rejects javascript:', () => {
            expect(isSafeUrl('javascript:alert(1)')).toBe(false);
            expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
            expect(isSafeUrl('  javascript:alert(1)  ')).toBe(false);
        });

        it('rejects data: URIs', () => {
            expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
            expect(isSafeUrl('data:image/png;base64,iVBOR...')).toBe(false);
        });

        it('rejects file://', () => {
            expect(isSafeUrl('file:///etc/passwd')).toBe(false);
            expect(isSafeUrl('file://C:/Windows/system.ini')).toBe(false);
        });

        it('rejects intent:// (Android)', () => {
            expect(isSafeUrl('intent://launch#Intent;scheme=app;end')).toBe(false);
        });

        it('rejects content:// (Android)', () => {
            expect(isSafeUrl('content://com.android.contacts')).toBe(false);
        });

        it('rejects ftp://, ws://, smb://', () => {
            expect(isSafeUrl('ftp://files.example.com')).toBe(false);
            expect(isSafeUrl('ws://example.com')).toBe(false);
            expect(isSafeUrl('smb://server/share')).toBe(false);
        });

        it('rejects custom app schemes', () => {
            expect(isSafeUrl('myapp://action?id=1')).toBe(false);
            expect(isSafeUrl('whatsapp://send?text=hi')).toBe(false);
        });

        it('rejects scheme-less / malformed input', () => {
            expect(isSafeUrl('')).toBe(false);
            expect(isSafeUrl('   ')).toBe(false);
            expect(isSafeUrl('example.com')).toBe(false);
            expect(isSafeUrl('//example.com')).toBe(false);
            expect(isSafeUrl('://example.com')).toBe(false);
            expect(isSafeUrl(':')).toBe(false);
        });

        it('rejects null / undefined', () => {
            expect(isSafeUrl(null)).toBe(false);
            expect(isSafeUrl(undefined)).toBe(false);
        });

        it('rejects non-string types defensively', () => {
            expect(isSafeUrl(123 as any)).toBe(false);
            expect(isSafeUrl({} as any)).toBe(false);
            expect(isSafeUrl([] as any)).toBe(false);
        });
    });

    describe('inspectUrl', () => {
        it('returns parsed scheme for whitelisted URLs', () => {
            expect(inspectUrl('https://example.com')).toEqual({ safe: true, scheme: 'https:' });
            expect(inspectUrl('TEL:190')).toEqual({ safe: true, scheme: 'tel:' });
        });

        it('returns scheme + safe:false for blocked URLs', () => {
            expect(inspectUrl('javascript:alert(1)')).toEqual({ safe: false, scheme: 'javascript:' });
            expect(inspectUrl('file:///etc/passwd')).toEqual({ safe: false, scheme: 'file:' });
        });

        it('returns null scheme for malformed input', () => {
            expect(inspectUrl('')).toEqual({ safe: false, scheme: null });
            expect(inspectUrl('no-scheme.example.com')).toEqual({ safe: false, scheme: null });
            expect(inspectUrl(null)).toEqual({ safe: false, scheme: null });
        });
    });
});
