const fs = require('fs');
const path = require('path');
const locDir = path.join(__dirname, '../src/i18n/locales');

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

// French translations for the 59 missing keys
const FR_MISSING = {
    'a11y.passwordMin': 'Mot de passe (6 caractères minimum)',
    'a11y.retypePassword': 'Retapez le mot de passe',
    'a11y.createMyAccount': 'Créer mon compte',
    'a11y.termsDisclaimer': 'En continuant, vous acceptez les conditions',
    'a11y.guestDisclaimer': 'Vos données ne seront pas sauvegardées sans compte',
    'saving': 'Sauvegarde...',
    'loadError': 'Erreur de chargement',
    'errors.auth.invalid_credential': 'Identifiant invalide',
    'errors.auth.user_not_found': 'Utilisateur non trouvé',
    'errors.auth.wrong_password': 'Mot de passe incorrect',
    'errors.auth.email_already_in_use': 'Cet email est déjà utilisé',
    'errors.auth.weak_password': 'Mot de passe trop faible',
    'errors.auth.invalid_email': 'Email invalide',
    'errors.auth.user_disabled': 'Compte désactivé',
    'errors.auth.too_many_requests': 'Trop de tentatives. Réessayez plus tard.',
    'errors.auth.network_request_failed': 'Erreur réseau. Vérifiez votre connexion.',
    'errors.auth.operation_not_allowed': 'Opération non autorisée',
    'errors.auth.configuration_not_found': 'Configuration introuvable',
    'errors.auth.invalid_action_code': 'Code action invalide',
    'errors.auth.expired_action_code': 'Code action expiré',
    'errors.auth.requires_recent_login': 'Reconnexion nécessaire',
    'errors.auth.credential_already_in_use': 'Identifiant déjà utilisé',
    'errors.auth.account_exists_with_different_credential': 'Compte existant avec une autre méthode',
    'errors.auth.popup_closed_by_user': 'Fenêtre fermée',
    'errors.auth.cancelled_popup_request': 'Demande annulée',
    'errors.auth.popup_blocked': 'Fenêtre bloquée',
    'errors.auth.default': 'Une erreur est survenue',
    'errors.permission_denied': 'Permission refusée',
    'errors.not_found': 'Non trouvé',
    'errors.already_exists': 'Existe déjà',
    'errors.resource_exhausted': 'Ressource épuisée',
    'errors.failed_precondition': 'Condition préalable non remplie',
    'errors.out_of_range': 'Hors limites',
    'errors.data_loss': 'Perte de données',
    'errors.storage.unauthorized': 'Non autorisé',
    'errors.storage.canceled': 'Annulé',
    'errors.storage.unknown': 'Erreur inconnue',
    'errors.week_data_missing': 'Données de la semaine indisponibles',
    'errors.fetch_error': 'Erreur de récupération des données',
    'ui.cancel': 'Annuler',
    'ui.confirm': 'Confirmer',
    'pdf.title': 'Mon suivi de grossesse',
    'pdf.generated': 'Généré le {{date}}',
    'pdf.profile': 'Profil',
    'pdf.name': 'Nom',
    'pdf.country': 'Pays',
    'pdf.lmp': 'Date des dernières règles',
    'pdf.dpa': 'Date prévue d\'accouchement',
    'pdf.weightHistory': 'Historique du poids',
    'pdf.date': 'Date',
    'pdf.weight': 'Poids',
    'pdf.appointments': 'Rendez-vous',
    'pdf.apptTitle': 'Titre',
    'pdf.notes': 'Notes',
    'pdf.personalNotes': 'Notes personnelles',
    'pdf.footer': 'Document confidentiel',
    'pdf.care': 'Prenez soin de vous ! 💕',
    'pdf.emptyWeight': 'Aucune donnée de poids',
    'pdf.emptyAppts': 'Aucun rendez-vous',
};

// Also fix onboarding & reminders for FR
const ONBOARDING_FR = {
    'common.back': undefined, // extra in others — ignore
    'common.continue': undefined,
};

const filePath = path.join(locDir, 'fr/common.json');
const fr = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

let added = 0;
for (const [key, value] of Object.entries(FR_MISSING)) {
    const parts = key.split('.');
    let current = fr;
    let exists = true;
    for (let i = 0; i < parts.length; i++) {
        if (current && typeof current === 'object' && parts[i] in current) {
            current = current[parts[i]];
        } else {
            exists = false;
            break;
        }
    }
    if (!exists) {
        setValue(fr, key, value);
        added++;
    }
}

fs.writeFileSync(filePath, JSON.stringify(fr, null, 4) + '\n');
console.log('✅ fr/common.json: +' + added + ' keys');

// Now add missing keys to EN for errors.not_found etc.
const enMissing = {
    'errors.not_found': 'Not found',
    'errors.already_exists': 'Already exists',
    'errors.resource_exhausted': 'Resource exhausted',
    'errors.failed_precondition': 'Failed precondition',
    'errors.out_of_range': 'Out of range',
    'errors.data_loss': 'Data loss',
};
const enPath = path.join(locDir, 'en/common.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
let enAdded = 0;
for (const [key, value] of Object.entries(enMissing)) {
    const parts = key.split('.');
    let current = en;
    let exists = true;
    for (let i = 0; i < parts.length; i++) {
        if (current && typeof current === 'object' && parts[i] in current) {
            current = current[parts[i]];
        } else { exists = false; break; }
    }
    if (!exists) { setValue(en, key, value); enAdded++; }
}
fs.writeFileSync(enPath, JSON.stringify(en, null, 4) + '\n');
console.log('✅ en/common.json: +' + enAdded + ' keys');
