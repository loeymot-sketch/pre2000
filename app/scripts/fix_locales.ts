/**
 * Locale Sync Script
 * Adds missing keys from FR (reference) to EN, AR, and TN locale files.
 * Uses FR value as placeholder for EN, and Arabic placeholder for AR/TN.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const LANGS_TO_FIX = ['en', 'ar', 'tn'];

// Recursively get all keys with full path
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

// Get value at a dot-separated path
function getValue(obj: any, path: any) {
    return path.split('.').reduce((o: any, k: any) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

// Set value at a dot-separated path
function setValue(obj: any, path: any, value: any) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

// Translation helpers for AR/TN based on known patterns
const AR_TRANSLATIONS = {
    'categories.all': 'الكل',
    'categories.pregnancy': 'الحمل',
    'categories.health': 'الصحة',
    'categories.nutrition': 'التغذية',
    'categories.wellbeing': 'الرفاهية',
    'categories.birth': 'الولادة',
    'categories.examens': 'الفحوصات',
    'categories.developpement': 'التطور',
    'categories.preparation': 'التحضير',
    'categories.lifestyle': 'الحياة اليومية',
    'categories.administratif': 'الإداري',
    'categories.medical': 'المتابعة الطبية',
    'article.notFound': 'المقال غير موجود',
    'article.errorSpecified': 'خطأ: لم يتم تحديد المقال',
    'article.contentComingSoon': 'المحتوى قيد التحضير...',
    'article.preview': 'معاينة',
    'article.readTime': 'القراءة: {{min}} دقيقة',
    'supplementSafety.safe': '✅ آمن',
    'supplementSafety.caution': '⚠️ باعتدال',
    'supplementSafety.avoid': '⛔ يجب تجنبه',
    'supplementSafety.unknown': '❓ غير معروف',
    'privacyData.title': 'بياناتي',
    'privacyData.exportPDF': 'تصدير PDF',
    'privacyData.exportPDFDesc': 'تصدير بياناتك كملف PDF',
    'privacyData.passwordMin': 'كلمة المرور (6 أحرف على الأقل)',
    'privacyData.retypePassword': 'أعد كتابة كلمة المرور',
    'privacyData.createMyAccount': 'إنشاء حسابي',
    'privacyData.termsDisclaimer': 'بالمتابعة، أنت توافق على شروط الاستخدام',
    'privacyData.guestDisclaimer': 'بياناتك لن يتم حفظها بدون حساب',
    'privacyData.export': 'تصدير',
    'privacyData.exportDesc': 'تصدير بياناتك كملف JSON',
    'privacyData.deleteAccount': 'حذف حسابي',
    'emergency.title': 'جهات الاتصال في حالات الطوارئ',
    'emergency.empty': 'لا توجد جهات اتصال بعد',
    'emergency.add': 'إضافة جهة اتصال',
    'emergency.name': 'الاسم',
    'emergency.phone': 'رقم الهاتف',
    'emergency.types.partner': 'الشريك',
    'emergency.types.doctor': 'الطبيب',
    'emergency.types.sos': 'طوارئ',
    'emergency.types.other': 'آخر',
    'emergency.deleteConfirm': 'هل أنت متأكد من حذف جهة الاتصال هذه؟',
    'emergency.callError': 'تعذر إجراء المكالمة',
    'emergency.validationError': 'يرجى ملء جميع الحقول',
    'emergency.addError': 'تعذرت إضافة جهة الاتصال',
    'emergency.deleteError': 'تعذر حذف جهة الاتصال',
    'gamification.currentStreak': 'السلسلة الحالية',
    'gamification.maxStreak': 'أطول سلسلة',
    'gamification.days': 'يوم',
    'gamification.badges': 'الشارات',
    'gamification.locked': 'مقفل',
    'gamification.unlockedAt': 'تم فتحه في {{date}}',
    // Error keys with / separator
    'errors.auth/account-exists-with-different-credential': 'هذا الحساب مسجل بطريقة أخرى',
    'errors.auth/popup-closed-by-user': 'تم إغلاق النافذة',
    'errors.auth/cancelled-popup-request': 'تم إلغاء الطلب',
    'errors.auth/popup-blocked': 'تم حظر النافذة المنبثقة',
    'errors.permission-denied': 'رفض الإذن',
    'errors.storage/unauthorized': 'غير مصرح',
    'errors.storage/canceled': 'تم الإلغاء',
    'errors.storage/unknown': 'خطأ غير معروف',
};

const TN_TRANSLATIONS = {
    'categories.all': 'الكل',
    'categories.pregnancy': 'الحمل',
    'categories.health': 'الصحة',
    'categories.nutrition': 'الماكلة',
    'categories.wellbeing': 'الراحة',
    'categories.birth': 'الولادة',
    'categories.examens': 'التحاليل',
    'categories.developpement': 'التطور',
    'categories.preparation': 'التحضير',
    'categories.lifestyle': 'حياتك اليومية',
    'categories.administratif': 'الأوراق',
    'categories.medical': 'المتابعة الطبية',
    'article.notFound': 'المقال ما لقيناهش',
    'article.errorSpecified': 'خطأ: المقال ما تحدّدش',
    'article.contentComingSoon': 'المحتوى يتحضر...',
    'article.preview': 'معاينة',
    'article.readTime': 'قراءة: {{min}} دقيقة',
    'supplementSafety.safe': '✅ آمن',
    'supplementSafety.caution': '⚠️ بالميزان',
    'supplementSafety.avoid': '⛔ إيّاك',
    'supplementSafety.unknown': '❓ ما نعرفوش',
    'privacyData.title': 'بياناتي',
    'privacyData.exportPDF': 'حمّل PDF',
    'privacyData.exportPDFDesc': 'صدّر المعلومات متاعك',
    'privacyData.passwordMin': 'كلمة السر (6 حروف على الأقل)',
    'privacyData.retypePassword': 'عاود اكتب كلمة السر',
    'privacyData.createMyAccount': 'أنشئ حسابي',
    'privacyData.termsDisclaimer': 'كي تكمّل، أنت موافق على الشروط',
    'privacyData.guestDisclaimer': 'بياناتك ما تتسجّلش بلا حساب',
    'privacyData.export': 'صدّر',
    'privacyData.exportDesc': 'صدّر بياناتك JSON',
    'privacyData.deleteAccount': 'فسّخ حسابي',
    'emergency.title': 'أرقام الطوارئ',
    'emergency.empty': 'مازال ما عندك حتى رقم',
    'emergency.add': 'زيد رقم',
    'emergency.name': 'الاسم',
    'emergency.phone': 'النمرة',
    'emergency.types.partner': 'الراجل',
    'emergency.types.doctor': 'الطبيب',
    'emergency.types.sos': 'طوارئ',
    'emergency.types.other': 'واحد آخر',
    'emergency.deleteConfirm': 'متأكد تنحّي هالرقم؟',
    'emergency.callError': 'ما نجمش نعيّط',
    'emergency.validationError': 'عمّر الخانات الكل',
    'emergency.addError': 'ما نجمش نزيد الرقم',
    'emergency.deleteError': 'ما نجمش ننحّي الرقم',
    'gamification.currentStreak': 'السلسلة الحالية',
    'gamification.maxStreak': 'أحسن سلسلة',
    'gamification.days': 'يوم',
    'gamification.badges': 'الشارات',
    'gamification.locked': 'مسكّر',
    'gamification.unlockedAt': 'تفتح في {{date}}',
    'errors.auth/account-exists-with-different-credential': 'الحساب هذا مسجّل بطريقة أخرى',
    'errors.auth/popup-closed-by-user': 'سكّرت النافذة',
    'errors.auth/cancelled-popup-request': 'بطّلت',
    'errors.auth/popup-blocked': 'النافذة محظورة',
    'errors.permission-denied': 'ما عندكش الإذن',
    'errors.storage/unauthorized': 'ما عندكش الحق',
    'errors.storage/canceled': 'بطّلت',
    'errors.storage/unknown': 'خطأ مش معروف',
};

const EN_TRANSLATIONS = {
    'categories.all': 'All',
    'categories.pregnancy': 'Pregnancy',
    'categories.health': 'Health',
    'categories.nutrition': 'Nutrition',
    'categories.wellbeing': 'Wellbeing',
    'categories.birth': 'Birth',
    'categories.examens': 'Tests',
    'categories.developpement': 'Development',
    'categories.preparation': 'Preparation',
    'categories.lifestyle': 'Lifestyle',
    'categories.administratif': 'Administrative',
    'categories.medical': 'Medical',
    'article.notFound': 'Article not found',
    'article.errorSpecified': 'Error: Article not specified',
    'article.contentComingSoon': 'Content coming soon...',
    'article.preview': 'Preview',
    'article.readTime': 'Read: {{min}} min',
    'supplementSafety.safe': '✅ Safe',
    'supplementSafety.caution': '⚠️ With caution',
    'supplementSafety.avoid': '⛔ Avoid',
    'supplementSafety.unknown': '❓ Unknown',
    'privacyData.title': 'My Data',
    'privacyData.exportPDF': 'Export PDF',
    'privacyData.exportPDFDesc': 'Export your data as PDF',
    'privacyData.passwordMin': 'Password (minimum 6 characters)',
    'privacyData.retypePassword': 'Retype password',
    'privacyData.createMyAccount': 'Create my account',
    'privacyData.termsDisclaimer': 'By continuing, you agree to the terms',
    'privacyData.guestDisclaimer': 'Your data won\'t be saved without an account',
    'privacyData.export': 'Export',
    'privacyData.exportDesc': 'Export your data as JSON',
    'privacyData.deleteAccount': 'Delete my account',
    'emergency.title': 'Emergency Contacts',
    'emergency.empty': 'No contacts yet',
    'emergency.add': 'Add Contact',
    'emergency.name': 'Name',
    'emergency.phone': 'Phone',
    'emergency.types.partner': 'Partner',
    'emergency.types.doctor': 'Doctor',
    'emergency.types.sos': 'Emergency',
    'emergency.types.other': 'Other',
    'emergency.deleteConfirm': 'Are you sure you want to delete this contact?',
    'emergency.callError': 'Could not make the call',
    'emergency.validationError': 'Please fill all fields',
    'emergency.addError': 'Could not add contact',
    'emergency.deleteError': 'Could not delete contact',
    'gamification.currentStreak': 'Current Streak',
    'gamification.maxStreak': 'Best Streak',
    'gamification.days': 'days',
    'gamification.badges': 'Badges',
    'gamification.locked': 'Locked',
    'gamification.unlockedAt': 'Unlocked on {{date}}',
    'errors.auth/account-exists-with-different-credential': 'Account exists with different sign-in method',
    'errors.auth/popup-closed-by-user': 'Popup closed',
    'errors.auth/cancelled-popup-request': 'Request cancelled',
    'errors.auth/popup-blocked': 'Popup blocked',
    'errors.permission-denied': 'Permission denied',
    'errors.storage/unauthorized': 'Unauthorized',
    'errors.storage/canceled': 'Cancelled',
    'errors.storage/unknown': 'Unknown error',
};

// HOME.json missing keys
const HOME_EN = { 'day': 'Day', 'yourBaby': 'Your Baby', 'month': 'Month' };
const HOME_AR = { 'day': 'يوم', 'yourBaby': 'طفلك', 'month': 'شهر' };
const HOME_TN = { 'day': 'يوم', 'yourBaby': 'بيبيك', 'month': 'شهر' };

// ONBOARDING missing keys
const ONBOARDING_EN = { 'back': 'Back', 'continue': 'Continue', 'step2Curious.title': 'How far along?', 'step2Curious.subtitle': 'Enter your approximate week', 'step2Curious.sizeComparison': 'Your baby is about the size of' };
const ONBOARDING_AR = { 'back': 'رجوع', 'continue': 'متابعة' };
const ONBOARDING_TN = { 'back': 'ارجع', 'continue': 'كمّل' };

// REMINDERS missing keys
const REMINDERS_EN = {
    'types.title': 'My Day',
    'types.loading': 'Loading...',
    'types.emptyTitle': 'All done!',
    'types.emptyMsg': 'No tasks for today',
    'types.allDone': 'All tasks completed!',
    'types.remainingTasks': '{{count}} tasks remaining',
    'types.hideTodayTitle': 'Hide for today?',
    'types.hideTodayMsg': 'This task will reappear tomorrow',
    'types.hide': 'Hide',
    'types.cancel': 'Cancel'
};
const REMINDERS_AR = { 'reminderEdit.resetToDefault': 'إعادة الضبط' };
const REMINDERS_TN = { 'reminderEdit.resetToDefault': 'رجّع الأول' };

// WEIGHT missing keys
const WEIGHT_ALL = { en: { 'noData': 'No data yet' }, ar: { 'noData': 'لا توجد بيانات بعد' }, tn: { 'noData': 'مازال ما فمّاش بيانات' } };

function fixLocaleFile(lang: any, file: any, keysToAdd: any) {
    const filePath = path.join(LOCALES_DIR, lang, file);
    if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️ File not found: ${filePath}`);
        return 0;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let added = 0;
    for (const [key, value] of Object.entries(keysToAdd)) {
        if (getValue(data, key) === undefined) {
            setValue(data, key, value);
            added++;
        }
    }
    if (added > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
        console.log(`   ✅ ${lang}/${file}: +${added} keys`);
    } else {
        console.log(`   ⏭️  ${lang}/${file}: already up to date`);
    }
    return added;
}

console.log('🔧 LOCALE SYNC — Fixing missing keys\n');

let totalFixed = 0;

// Fix common.json
console.log('📁 common.json');
totalFixed += fixLocaleFile('en', 'common.json', EN_TRANSLATIONS);
totalFixed += fixLocaleFile('ar', 'common.json', AR_TRANSLATIONS);
totalFixed += fixLocaleFile('tn', 'common.json', TN_TRANSLATIONS);

// Fix home.json
console.log('\n📁 home.json');
totalFixed += fixLocaleFile('en', 'home.json', HOME_EN);
totalFixed += fixLocaleFile('ar', 'home.json', HOME_AR);
totalFixed += fixLocaleFile('tn', 'home.json', HOME_TN);

// Fix onboarding.json
console.log('\n📁 onboarding.json');
totalFixed += fixLocaleFile('en', 'onboarding.json', ONBOARDING_EN);
totalFixed += fixLocaleFile('ar', 'onboarding.json', ONBOARDING_AR);
totalFixed += fixLocaleFile('tn', 'onboarding.json', ONBOARDING_TN);

// Fix reminders.json
console.log('\n📁 reminders.json');
totalFixed += fixLocaleFile('en', 'reminders.json', REMINDERS_EN);
totalFixed += fixLocaleFile('ar', 'reminders.json', REMINDERS_AR);
totalFixed += fixLocaleFile('tn', 'reminders.json', REMINDERS_TN);

// Fix weight.json
console.log('\n📁 weight.json');
totalFixed += fixLocaleFile('en', 'weight.json', WEIGHT_ALL.en);
totalFixed += fixLocaleFile('ar', 'weight.json', WEIGHT_ALL.ar);
totalFixed += fixLocaleFile('tn', 'weight.json', WEIGHT_ALL.tn);

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Total keys added: ${totalFixed}`);
