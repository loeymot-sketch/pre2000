#!/usr/bin/env node
/**
 * Comprehensive Translation Audit Script
 * Compares all JSON namespaces across FR / EN / AR / TN
 * Reports: missing keys, extra keys, empty values, non-translated values
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const LANGS = ['fr', 'en', 'ar', 'tn'];
const REFERENCE_LANG = 'fr'; // FR is the source of truth

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    try {
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
        return { __error__: e.message };
    }
}

function getJsonFiles() {
    const frDir = path.join(LOCALES_DIR, 'fr');
    return fs.readdirSync(frDir).filter(f => f.endsWith('.json'));
}

// ─── Core Audit ─────────────────────────────────────────────────────────────

const files = getJsonFiles();
let totalMissing = 0;
let totalEmpty = 0;
let totalExtra = 0;
const report = [];

for (const filename of files) {
    const refData = loadJson(REFERENCE_LANG, filename);
    if (!refData) continue;
    if (refData.__error__) {
        report.push(`❌ PARSE ERROR [${REFERENCE_LANG}/${filename}]: ${refData.__error__}`);
        continue;
    }

    const refKeys = flattenKeys(refData);
    const refKeySet = new Set(refKeys.map(k => k.key));

    const nsIssues = [];

    for (const lang of LANGS) {
        if (lang === REFERENCE_LANG) continue;

        const data = loadJson(lang, filename);
        if (!data) {
            nsIssues.push(`  ⚠️  [${lang.toUpperCase()}] FILE MISSING: ${filename}`);
            totalMissing += refKeySet.size;
            continue;
        }
        if (data.__error__) {
            nsIssues.push(`  ❌ [${lang.toUpperCase()}] PARSE ERROR: ${data.__error__}`);
            continue;
        }

        const langKeys = flattenKeys(data);
        const langKeySet = new Set(langKeys.map(k => k.key));
        const langKeyMap = Object.fromEntries(langKeys.map(k => [k.key, k.value]));

        // Missing keys (in FR but not in this lang)
        const missing = [...refKeySet].filter(k => !langKeySet.has(k));
        // Extra keys (in this lang but not in FR)
        const extra = [...langKeySet].filter(k => !refKeySet.has(k));
        // Empty/null values
        const empty = langKeys.filter(k => !k.value && k.value !== 0 && k.value !== false);
        // Possibly not translated (same as FR value - could be intentional for proper nouns)
        // We only flag if same as FR AND key is not a URL/number/brand
        const refKeyMap = Object.fromEntries(refKeys.map(k => [k.key, k.value]));
        const sameAsFr = langKeys.filter(k => {
            const refVal = refKeyMap[k.key];
            if (!refVal || !k.value) return false;
            if (typeof refVal !== 'string' || typeof k.value !== 'string') return false;
            // Skip URLs, numbers, emojis-only, very short strings
            if (refVal.startsWith('http') || /^\d+$/.test(refVal) || refVal.length <= 3) return false;
            return refVal === k.value;
        });

        totalMissing += missing.length;
        totalEmpty += empty.length;
        totalExtra += extra.length;

        if (missing.length || extra.length || empty.length) {
            nsIssues.push(`  [${lang.toUpperCase()}] ${filename}:`);
            if (missing.length) {
                nsIssues.push(`    🔴 MISSING (${missing.length}): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`);
            }
            if (extra.length) {
                nsIssues.push(`    🟠 EXTRA   (${extra.length}): ${extra.slice(0, 5).join(', ')}`);
            }
            if (empty.length) {
                nsIssues.push(`    🟡 EMPTY   (${empty.length}): ${empty.slice(0, 5).map(k => k.key).join(', ')}`);
            }
        } else if (sameAsFr.length > 3) {
            nsIssues.push(`  [${lang.toUpperCase()}] ${filename}: ✅ (${sameAsFr.length} keys identical to FR - verify intentional)`);
        } else {
            nsIssues.push(`  [${lang.toUpperCase()}] ${filename}: ✅`);
        }
    }

    if (nsIssues.some(l => l.includes('🔴') || l.includes('⚠️') || l.includes('❌'))) {
        report.push(`\n📄 ${filename} ─────────────────────`);
        report.push(...nsIssues);
    } else {
        report.push(`✅ ${filename} — OK for all langs`);
    }
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('   TRANSLATION AUDIT REPORT — Mama & Bébé');
console.log('═'.repeat(60));
console.log(`📁 Namespaces scanned: ${files.length}`);
console.log(`🌐 Languages compared: EN, AR, TN (vs FR reference)`);
console.log(`🔴 Total missing keys: ${totalMissing}`);
console.log(`🟡 Total empty values: ${totalEmpty}`);
console.log(`🟠 Total extra keys:   ${totalExtra}`);
console.log('═'.repeat(60) + '\n');

report.forEach(l => console.log(l));

if (totalMissing === 0 && totalEmpty === 0) {
    console.log('\n🎉 PERFECT: 0 missing keys, 0 empty values across all languages!\n');
} else {
    console.log(`\n⛔ ACTION REQUIRED: ${totalMissing} missing + ${totalEmpty} empty values need attention.\n`);
}
