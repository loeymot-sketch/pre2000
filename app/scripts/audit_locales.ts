const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const LANGS = ['fr', 'en', 'ar', 'tn'];

// Recursively count and collect keys
function getKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys = keys.concat(getKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

// Get all JSON files in a locale directory
function getLocaleFiles(lang: any) {
    return fs.readdirSync(path.join(LOCALES_DIR, lang))
        .filter((f: any) => f.endsWith('.json'))
        .sort();
}

console.log('🌍 LOCALE PARITY AUDIT — ALL LANGUAGES\n');
console.log('='.repeat(70));

const frFiles = getLocaleFiles('fr');
console.log(`\n📁 Reference (FR) has ${frFiles.length} JSON files:\n   ${frFiles.join(', ')}\n`);

// Check file presence
console.log('📋 FILE PRESENCE CHECK');
console.log('-'.repeat(70));
console.log(`${'File'.padEnd(25)} | ${'FR'.padEnd(5)} | ${'EN'.padEnd(5)} | ${'AR'.padEnd(5)} | ${'TN'.padEnd(5)}`);
console.log('-'.repeat(70));

for (const file of frFiles) {
    if (file === 'index.ts') continue;
    const row = [file.padEnd(25)];
    for (const lang of LANGS) {
        const exists = fs.existsSync(path.join(LOCALES_DIR, lang, file));
        row.push((exists ? '✅' : '❌').padEnd(5));
    }
    console.log(row.join(' | '));
}

// Deep key comparison
console.log('\n\n📊 KEY COUNT COMPARISON');
console.log('-'.repeat(70));
console.log(`${'File'.padEnd(25)} | ${'FR'.padEnd(5)} | ${'EN'.padEnd(5)} | ${'AR'.padEnd(5)} | ${'TN'.padEnd(5)} | Status`);
console.log('-'.repeat(70));

let totalMissing: any[] = [];

for (const file of frFiles) {
    if (file === 'index.ts') continue;

    const counts: Record<string, number> = {};
    const keysByLang: Record<string, Set<string>> = {};

    for (const lang of LANGS) {
        const filePath = path.join(LOCALES_DIR, lang, file);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const keys = getKeys(data);
            counts[lang] = keys.length;
            keysByLang[lang] = new Set(keys);
        } else {
            counts[lang] = 0;
            keysByLang[lang] = new Set();
        }
    }

    const frCount = counts['fr'] || 0;
    const allMatch = LANGS.every((l: any) => counts[l] === frCount);
    const status = allMatch ? '✅ PARITY' : '⚠️ MISMATCH';

    console.log(`${file.padEnd(25)} | ${String(counts['fr'] || 0).padEnd(5)} | ${String(counts['en'] || 0).padEnd(5)} | ${String(counts['ar'] || 0).padEnd(5)} | ${String(counts['tn'] || 0).padEnd(5)} | ${status}`);

    // Find missing keys
    if (!allMatch && keysByLang['fr']) {
        for (const lang of ['en', 'ar', 'tn']) {
            if (keysByLang[lang]) {
                const missing = [...keysByLang['fr']].filter((k: any) => !keysByLang[lang].has(k));
                const extra = [...keysByLang[lang]].filter((k: any) => !keysByLang['fr'].has(k));
                if (missing.length > 0) {
                    totalMissing.push({ file, lang, missing, type: 'MISSING' });
                }
                if (extra.length > 0) {
                    totalMissing.push({ file, lang, extra, type: 'EXTRA' });
                }
            }
        }
    }
}

// Report missing keys
if (totalMissing.length > 0) {
    console.log('\n\n🔍 DETAILED MISSING/EXTRA KEYS');
    console.log('='.repeat(70));
    for (const item of totalMissing) {
        if (item.type === 'MISSING') {
            console.log(`\n❌ ${item.file} [${item.lang.toUpperCase()}] — ${item.missing.length} missing key(s):`);
            item.missing.forEach((k: any) => console.log(`   - ${k}`));
        } else {
            console.log(`\n➕ ${item.file} [${item.lang.toUpperCase()}] — ${item.extra.length} extra key(s):`);
            item.extra.forEach((k: any) => console.log(`   + ${k}`));
        }
    }
}

// Summary
console.log('\n\n📊 SUMMARY');
console.log('='.repeat(70));
const totalFiles = frFiles.filter((f: any) => f !== 'index.ts').length;
const totalIssues = totalMissing.filter((m: any) => m.type === 'MISSING').reduce((sum: any, m: any) => sum + m.missing.length, 0);
console.log(`Total locale files checked: ${totalFiles}`);
console.log(`Total missing keys across all languages: ${totalIssues}`);
console.log(totalIssues === 0 ? '✅ PERFECT PARITY — All languages are in sync!' : `⚠️ ${totalIssues} key(s) need attention`);
