/**
 * Script to add missing validation i18n keys to all locale files.
 * Run: node scripts/add_validation_keys.ts
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
    }
    return added;
}

let total = 0;

// ─── auth.json: validation error keys ───────────────────────────────────────
console.log('\n📁 auth.json — validation error keys');

total += fixFile('fr', 'auth.json', {
    'errors.emailRequired': 'L\'email est requis',
    'errors.passwordRequired': 'Le mot de passe est requis',
    'errors.passwordTooLong': 'Le mot de passe est trop long',
    'errors.firstNameTooLong': 'Le prénom ne peut pas dépasser 50 caractères',
    'errors.lastNameTooLong': 'Le nom ne peut pas dépasser 50 caractères',
    'errors.lmpInvalid': 'Date des dernières règles invalide',
    'guestDisclaimer': 'Vos données ne seront pas sauvegardées sans compte',
    'curiousDefaultName': 'Curieuse',
});

total += fixFile('en', 'auth.json', {
    'errors.emailRequired': 'Email is required',
    'errors.passwordRequired': 'Password is required',
    'errors.passwordTooLong': 'Password is too long',
    'errors.firstNameTooLong': 'First name cannot exceed 50 characters',
    'errors.lastNameTooLong': 'Last name cannot exceed 50 characters',
    'errors.lmpInvalid': 'Invalid last period date',
    'guestDisclaimer': 'Your data won\'t be saved without an account',
    'curiousDefaultName': 'Curious',
});

total += fixFile('ar', 'auth.json', {
    'errors.emailRequired': 'البريد الإلكتروني مطلوب',
    'errors.passwordRequired': 'كلمة المرور مطلوبة',
    'errors.passwordTooLong': 'كلمة المرور طويلة جداً',
    'errors.firstNameTooLong': 'الاسم الأول لا يمكن أن يتجاوز 50 حرفاً',
    'errors.lastNameTooLong': 'اسم العائلة لا يمكن أن يتجاوز 50 حرفاً',
    'errors.lmpInvalid': 'تاريخ آخر دورة شهرية غير صالح',
    'guestDisclaimer': 'لن يتم حفظ بياناتك بدون حساب',
    'curiousDefaultName': 'فضولية',
});

total += fixFile('tn', 'auth.json', {
    'errors.emailRequired': 'الإيميل مطلوب',
    'errors.passwordRequired': 'كلمة السر مطلوبة',
    'errors.passwordTooLong': 'كلمة السر طويلة بزاف',
    'errors.firstNameTooLong': 'الاسم ما يعديش 50 حرف',
    'errors.lastNameTooLong': 'اللقب ما يعديش 50 حرف',
    'errors.lmpInvalid': 'تاريخ آخر دورة مش صحيح',
    'guestDisclaimer': 'بياناتك ما تتسجّلش بلا حساب',
    'curiousDefaultName': 'فضولية',
});

// ─── add_appointment.json: validation error keys ─────────────────────────────
console.log('\n📁 add_appointment.json — validation error keys');

total += fixFile('fr', 'add_appointment.json', {
    'errors.titleTooShort': 'Le titre doit contenir au moins 2 caractères',
    'errors.titleTooLong': 'Le titre ne peut pas dépasser 100 caractères',
    'errors.dateRequired': 'La date est obligatoire',
    'errors.dateInvalid': 'Date invalide',
});

total += fixFile('en', 'add_appointment.json', {
    'errors.titleTooShort': 'Title must be at least 2 characters',
    'errors.titleTooLong': 'Title cannot exceed 100 characters',
    'errors.dateRequired': 'Date is required',
    'errors.dateInvalid': 'Invalid date',
});

total += fixFile('ar', 'add_appointment.json', {
    'errors.titleTooShort': 'العنوان يجب أن يحتوي على حرفين على الأقل',
    'errors.titleTooLong': 'العنوان لا يمكن أن يتجاوز 100 حرف',
    'errors.dateRequired': 'التاريخ مطلوب',
    'errors.dateInvalid': 'تاريخ غير صالح',
});

total += fixFile('tn', 'add_appointment.json', {
    'errors.titleTooShort': 'العنوان لازم يكون فيه حرفين على الأقل',
    'errors.titleTooLong': 'العنوان ما يعديش 100 حرف',
    'errors.dateRequired': 'التاريخ مطلوب',
    'errors.dateInvalid': 'تاريخ مش صحيح',
});

// ─── weight.json: validation error keys ──────────────────────────────────────
console.log('\n📁 weight.json — validation error keys');

total += fixFile('fr', 'weight.json', {
    'errors.weightPositive': 'Le poids doit être supérieur à 0',
    'errors.weightTooHigh': 'Le poids semble incorrect',
    'errors.bpRequired': 'La pression systolique et diastolique sont requises',
    'errors.bpSystolicInvalid': 'La pression systolique semble incorrecte',
    'errors.bpDiastolicInvalid': 'La pression diastolique semble incorrecte',
    'errors.bpDiastolicHigher': 'La pression diastolique doit être inférieure à la systolique',
});

total += fixFile('en', 'weight.json', {
    'errors.weightPositive': 'Weight must be greater than 0',
    'errors.weightTooHigh': 'Weight seems incorrect',
    'errors.bpRequired': 'Systolic and diastolic pressure are required',
    'errors.bpSystolicInvalid': 'Systolic pressure seems incorrect',
    'errors.bpDiastolicInvalid': 'Diastolic pressure seems incorrect',
    'errors.bpDiastolicHigher': 'Diastolic pressure must be lower than systolic',
});

total += fixFile('ar', 'weight.json', {
    'errors.weightPositive': 'الوزن يجب أن يكون أكبر من 0',
    'errors.weightTooHigh': 'الوزن يبدو غير صحيح',
    'errors.bpRequired': 'الضغط الانقباضي والانبساطي مطلوبان',
    'errors.bpSystolicInvalid': 'الضغط الانقباضي يبدو غير صحيح',
    'errors.bpDiastolicInvalid': 'الضغط الانبساطي يبدو غير صحيح',
    'errors.bpDiastolicHigher': 'الضغط الانبساطي يجب أن يكون أقل من الانقباضي',
});

total += fixFile('tn', 'weight.json', {
    'errors.weightPositive': 'الوزن لازم يكون أكبر من 0',
    'errors.weightTooHigh': 'الوزن مش صحيح',
    'errors.bpRequired': 'الضغط الانقباضي والانبساطي مطلوبين',
    'errors.bpSystolicInvalid': 'الضغط الانقباضي مش صحيح',
    'errors.bpDiastolicInvalid': 'الضغط الانبساطي مش صحيح',
    'errors.bpDiastolicHigher': 'الضغط الانبساطي لازم يكون أقل من الانقباضي',
});

// ─── onboarding.json: curiousDefaultName ─────────────────────────────────────
console.log('\n📁 onboarding.json — curiousDefaultName');

total += fixFile('fr', 'onboarding.json', { 'curiousDefaultName': 'Curieuse' });
total += fixFile('en', 'onboarding.json', { 'curiousDefaultName': 'Curious' });
total += fixFile('ar', 'onboarding.json', { 'curiousDefaultName': 'فضولية' });
total += fixFile('tn', 'onboarding.json', { 'curiousDefaultName': 'فضولية' });

console.log(`\n✅ Total keys added: ${total}`);
