/**
 * Script to add new i18n keys introduced by Phase 2 fixes.
 * Keys added:
 *   home.babyMessage, home.weekDay (BabyMessageCard)
 *   common.bodyChanges (WeekInfoSection)
 *   common.errors.weekDataNotFound, common.errors.loadingFailed (useCurrentWeek)
 */
const fs = require('fs');
const path = require('path');
const locDir = path.join(__dirname, '../src/i18n/locales');

function getValue(obj: any, dotPath: any) {
    return dotPath.split('.').reduce((o: any, k: any) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

function setValue(obj: any, dotPath: any, value: any) {
    const parts = dotPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function fixFile(lang: any, file: any, keys: any) {
    const fp = path.join(locDir, lang, file);
    if (!fs.existsSync(fp)) { console.log(`  ⚠️ Not found: ${fp}`); return 0; }
    const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    let added = 0;
    for (const [k, v] of Object.entries(keys)) {
        if (getValue(data, k) === undefined) { setValue(data, k, v); added++; }
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

// ─── home.json ────────────────────────────────────────────────────────────────
console.log('\n📁 home.json — babyMessage, weekDay');
total += fixFile('fr', 'home.json', {
    'babyMessage': 'Message de Bébé',
    'weekDay': 'Semaine {{week}}, Jour {{day}}',
});
total += fixFile('en', 'home.json', {
    'babyMessage': 'Baby\'s Message',
    'weekDay': 'Week {{week}}, Day {{day}}',
});
total += fixFile('ar', 'home.json', {
    'babyMessage': 'رسالة من طفلك',
    'weekDay': 'الأسبوع {{week}}، اليوم {{day}}',
});
total += fixFile('tn', 'home.json', {
    'babyMessage': 'رسالة من صغيرك',
    'weekDay': 'الأسبوع {{week}}، اليوم {{day}}',
});

// ─── common.json ──────────────────────────────────────────────────────────────
console.log('\n📁 common.json — bodyChanges, errors.weekDataNotFound, errors.loadingFailed');
total += fixFile('fr', 'common.json', {
    'bodyChanges': 'Changements du corps',
    'errors.weekDataNotFound': 'Données de la semaine introuvables',
    'errors.loadingFailed': 'Erreur lors du chargement des données',
});
total += fixFile('en', 'common.json', {
    'bodyChanges': 'Body changes',
    'errors.weekDataNotFound': 'Week data not found',
    'errors.loadingFailed': 'Error loading data',
});
total += fixFile('ar', 'common.json', {
    'bodyChanges': 'تغيرات الجسم',
    'errors.weekDataNotFound': 'بيانات الأسبوع غير موجودة',
    'errors.loadingFailed': 'خطأ في تحميل البيانات',
});
total += fixFile('tn', 'common.json', {
    'bodyChanges': 'تغيرات الجسم',
    'errors.weekDataNotFound': 'معلومات الأسبوع ما لقيناهاش',
    'errors.loadingFailed': 'صار خطأ في تحميل المعلومات',
});

console.log(`\n✅ Total keys added: ${total}`);
