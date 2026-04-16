/**
 * Script to add trimester labels and chooseLanguage key to all locale files.
 */
const fs = require('fs');
const path = require('path');
const locDir = path.join(__dirname, '../src/i18n/locales');

function setValue(obj: any, dotPath: any, value: any) {
    const parts = dotPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function getValue(obj: any, dotPath: any) {
    return dotPath.split('.').reduce((o: any, k: any) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

function fixFile(lang: any, file: any, keys: any) {
    const fp = path.join(locDir, lang, file);
    if (!fs.existsSync(fp)) { console.log(`  ⚠️ Not found: ${fp}`); return 0; }
    const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    let added = 0;
    for (const [k, v] of Object.entries(keys)) {
        if (getValue(data, k) === undefined) {
            setValue(data, k, v);
            added++;
        }
    }
    if (added > 0) {
        fs.writeFileSync(fp, JSON.stringify(data, null, 4) + '\n');
        console.log(`  ✅ ${lang}/${file}: +${added} keys`);
    } else {
        console.log(`  ✓ ${lang}/${file}: already up to date`);
    }
    return added;
}

let total = 0;

// ─── onboarding.json: trimester labels ───────────────────────────────────────
console.log('\n📁 onboarding.json — trimester labels');

total += fixFile('fr', 'onboarding.json', {
    'trimester1': 'T1',
    'trimester2': 'T2',
    'trimester3': 'T3',
});
total += fixFile('en', 'onboarding.json', {
    'trimester1': 'T1',
    'trimester2': 'T2',
    'trimester3': 'T3',
});
total += fixFile('ar', 'onboarding.json', {
    'trimester1': 'الثلث الأول',
    'trimester2': 'الثلث الثاني',
    'trimester3': 'الثلث الثالث',
});
total += fixFile('tn', 'onboarding.json', {
    'trimester1': 'الثلث الأول',
    'trimester2': 'الثلث الثاني',
    'trimester3': 'الثلث الثالث',
});

// ─── common.json: chooseLanguage ──────────────────────────────────────────────
console.log('\n📁 common.json — chooseLanguage');

total += fixFile('fr', 'common.json', { 'chooseLanguage': 'Choisir la langue' });
total += fixFile('en', 'common.json', { 'chooseLanguage': 'Choose language' });
total += fixFile('ar', 'common.json', { 'chooseLanguage': 'اختر اللغة' });
total += fixFile('tn', 'common.json', { 'chooseLanguage': 'اختار اللغة' });

console.log(`\n✅ Total keys added: ${total}`);
