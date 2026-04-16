#!/usr/bin/env node
/**
 * Deep Value Audit — flags keys whose value is identical to French (= likely not translated)
 * Excludes: proper nouns, URLs, emojis-only, numbers, strings <= 4 chars, Firebase error codes
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const LANGS = ['en', 'ar', 'tn'];

function flattenKeys(obj, prefix = '') {
    return Object.entries(obj).flatMap(([k, v]) => {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            return flattenKeys(v, fullKey);
        }
        return [{ key: fullKey, value: v }];
    });
}

function loadJson(lang, filename) {
    const fp = path.join(LOCALES_DIR, lang, filename);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function isLikelyProperNoun(val) {
    if (!val || typeof val !== 'string') return true;
    if (val.length <= 4) return true;
    if (/^https?:/.test(val)) return true;
    if (/^\d+(\.\d+)?$/.test(val)) return true;
    // Firebase error code format
    if (/^auth\//.test(val)) return true;
    // Only emojis
    if (/^[\u{1F300}-\u{1FFFF}\u{2700}-\u{27BF}→←↑↓●○◉\s]+$/u.test(val)) return true;
    // Contains {{interpolation}} only
    if (/^[\{\}\w\s.]+$/.test(val) && val.includes('{{')) return true;
    // Short / single word proper names (capitalized)
    if (/^[A-Z][a-z]+$/.test(val.trim())) return true;
    return false;
}

const files = fs.readdirSync(path.join(LOCALES_DIR, 'fr')).filter(f => f.endsWith('.json'));

let grandTotal = 0;

for (const filename of files) {
    const frData = loadJson('fr', filename);
    if (!frData) continue;
    const frKeys = flattenKeys(frData);
    const frMap = Object.fromEntries(frKeys.map(k => [k.key, k.value]));

    const namespaceIssues = [];

    for (const lang of LANGS) {
        const data = loadJson(lang, filename);
        if (!data) continue;
        const langKeys = flattenKeys(data);

        const suspects = langKeys.filter(k => {
            const frVal = frMap[k.key];
            if (!frVal || !k.value) return false;
            if (isLikelyProperNoun(frVal)) return false;
            return frVal === k.value; // Same value as French = suspect
        });

        if (suspects.length > 0) {
            grandTotal += suspects.length;
            namespaceIssues.push(`  [${lang.toUpperCase()}] ${suspects.length} potentially untranslated:`);
            suspects.forEach(s => {
                namespaceIssues.push(`    ⚠️  "${s.key}" = "${s.value}"`);
            });
        }
    }

    if (namespaceIssues.length > 0) {
        console.log(`\n📄 ${filename} ─────────────────────`);
        namespaceIssues.forEach(l => console.log(l));
    } else {
        console.log(`✅ ${filename}`);
    }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`Total suspect (FR-identical, possibly untranslated): ${grandTotal}`);
if (grandTotal === 0) {
    console.log('🎉 All values appear translated correctly.');
} else {
    console.log('⚠️  Review suspects above — some may be intentional (brand names, etc)');
}
