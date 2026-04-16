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
    return dotPath.split('.').reduce(function (o: any, k: any) { return o && o[k] !== undefined ? o[k] : undefined; }, obj);
}

function fixFile(lang: any, file: any, keys: any) {
    var fp = path.join(locDir, lang, file);
    var data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    var added = 0;
    for (var k in keys) {
        if (getValue(data, k) === undefined) {
            setValue(data, k, keys[k]);
            added++;
        }
    }
    if (added > 0) {
        fs.writeFileSync(fp, JSON.stringify(data, null, 4) + '\n');
        console.log('  +' + added + ' ' + lang + '/' + file);
    }
    return added;
}

var total = 0;

// 1. Fix 6 missing error keys in EN/AR/TN common.json
console.log('common.json - error keys:');
total += fixFile('en', 'common.json', {
    'errors.not_found': 'Not found', 'errors.already_exists': 'Already exists',
    'errors.resource_exhausted': 'Resource exhausted', 'errors.failed_precondition': 'Failed precondition',
    'errors.out_of_range': 'Out of range', 'errors.data_loss': 'Data loss'
});
total += fixFile('ar', 'common.json', {
    'errors.not_found': 'غير موجود', 'errors.already_exists': 'موجود مسبقاً',
    'errors.resource_exhausted': 'الموارد نفدت', 'errors.failed_precondition': 'شرط مسبق غير متوفر',
    'errors.out_of_range': 'خارج النطاق', 'errors.data_loss': 'فقدان بيانات'
});
total += fixFile('tn', 'common.json', {
    'errors.not_found': 'ما لقيناش', 'errors.already_exists': 'موجود من قبل',
    'errors.resource_exhausted': 'الموارد خلصت', 'errors.failed_precondition': 'الشرط مش متوفر',
    'errors.out_of_range': 'خارج الحدود', 'errors.data_loss': 'ضاعت البيانات'
});

// 2. Add FR extras for onboarding.json (common.back, common.continue)
console.log('\nonboarding.json:');
total += fixFile('fr', 'onboarding.json', { 'common.back': 'Retour', 'common.continue': 'Continuer' });

// 3. Add FR extras for reminders.json
console.log('\nreminders.json:');
total += fixFile('fr', 'reminders.json', {
    'hydration.save': 'Sauvegarder',
    'myDay.title': 'Ma Journée', 'myDay.loading': 'Chargement...',
    'myDay.emptyTitle': 'Tout est fait !', 'myDay.emptyMsg': 'Pas de tâches pour aujourd\'hui',
    'myDay.allDone': 'Toutes les tâches terminées !',
    'myDay.remainingTasks': '{{count}} tâches restantes',
    'myDay.hideTodayTitle': 'Masquer pour aujourd\'hui ?',
    'myDay.hideTodayMsg': 'Cette tâche réapparaîtra demain',
    'myDay.hide': 'Masquer', 'myDay.cancel': 'Annuler',
    'reminderEdit.duplicate': 'Doublon détecté',
    'reminderEdit.minLimit': 'Limite minimum atteinte',
    'reminderEdit.maxLimit': 'Limite maximum atteinte',
    'reminderEdit.yourSchedule': 'Votre planning',
    'reminderEdit.hint': 'Astuce',
    'reminderEdit.recommendedPace': 'Rythme recommandé',
    'reminderEdit.resetToDefault': 'Réinitialiser',
    'types.title': 'Ma journée',
    'types.loading': 'Chargement...',
    'types.emptyTitle': 'Tout est fait !',
    'types.emptyMsg': 'Pas de tâches pour aujourd\'hui',
    'types.allDone': 'Toutes les tâches terminées !',
    'types.remainingTasks': '{{count}} tâches restantes',
    'types.hideTodayTitle': 'Masquer pour aujourd\'hui ?',
    'types.hideTodayMsg': 'Cette tâche réapparaîtra demain',
    'types.hide': 'Masquer',
    'types.cancel': 'Annuler'
});

// Also add missing keys to EN reminders.json (types.*)
total += fixFile('en', 'reminders.json', {
    'types.title': 'My Day', 'types.loading': 'Loading...',
    'types.emptyTitle': 'All done!', 'types.emptyMsg': 'No tasks for today',
    'types.allDone': 'All tasks completed!',
    'types.remainingTasks': '{{count}} tasks remaining',
    'types.hideTodayTitle': 'Hide for today?',
    'types.hideTodayMsg': 'This task will reappear tomorrow',
    'types.hide': 'Hide', 'types.cancel': 'Cancel',
    'reminderEdit.duplicate': 'Duplicate detected',
    'reminderEdit.minLimit': 'Minimum limit reached',
    'reminderEdit.maxLimit': 'Maximum limit reached',
    'reminderEdit.yourSchedule': 'Your schedule',
    'reminderEdit.hint': 'Tip',
    'reminderEdit.recommendedPace': 'Recommended pace',
    'reminderEdit.resetToDefault': 'Reset to default'
});

// Add AR/TN reminders with types.* keys
total += fixFile('ar', 'reminders.json', {
    'types.title': 'يومي', 'types.loading': 'جاري التحميل...',
    'types.emptyTitle': 'كل شيء تم!', 'types.emptyMsg': 'لا توجد مهام لليوم',
    'types.allDone': 'تم إنجاز كل المهام!',
    'types.remainingTasks': '{{count}} مهام متبقية',
    'types.hideTodayTitle': 'إخفاء لليوم؟',
    'types.hideTodayMsg': 'ستظهر المهمة غداً',
    'types.hide': 'إخفاء', 'types.cancel': 'إلغاء',
    'myDay.title': 'يومي', 'myDay.loading': 'جاري التحميل...',
    'myDay.emptyTitle': 'كل شيء تم!', 'myDay.emptyMsg': 'لا توجد مهام لليوم',
    'myDay.allDone': 'تم إنجاز كل المهام!',
    'myDay.remainingTasks': '{{count}} مهام متبقية',
    'myDay.hideTodayTitle': 'إخفاء لليوم؟',
    'myDay.hideTodayMsg': 'ستظهر المهمة غداً',
    'myDay.hide': 'إخفاء', 'myDay.cancel': 'إلغاء'
});

total += fixFile('tn', 'reminders.json', {
    'types.title': 'يومي', 'types.loading': 'يتحمّل...',
    'types.emptyTitle': 'كملت الكل!', 'types.emptyMsg': 'ما فمّاش حاجة اليوم',
    'types.allDone': 'كملت كل شي!',
    'types.remainingTasks': '{{count}} حاجات باقيين',
    'types.hideTodayTitle': 'نخبّيها اليوم؟',
    'types.hideTodayMsg': 'ترجع تبان غدوة',
    'types.hide': 'خبّي', 'types.cancel': 'بطّل',
    'myDay.title': 'يومي', 'myDay.loading': 'يتحمّل...',
    'myDay.emptyTitle': 'كملت الكل!', 'myDay.emptyMsg': 'ما فمّاش حاجة اليوم',
    'myDay.allDone': 'كملت كل شي!',
    'myDay.remainingTasks': '{{count}} حاجات باقيين',
    'myDay.hideTodayTitle': 'نخبّيها اليوم؟',
    'myDay.hideTodayMsg': 'ترجع تبان غدوة',
    'myDay.hide': 'خبّي', 'myDay.cancel': 'بطّل'
});

console.log('\n✅ Total keys added: ' + total);
