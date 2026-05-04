# Plan de correction R1-sec — orchestré, prêt-à-exécuter

> **Statut** : PRÊT — en attente de GO humain pour démarrer.
>
> ## Décisions humaines actées (2026-05-04)
> - **F1** = **investigate_first** : Claude fait recherche officielle (Ministère Santé TN/MA/DZ + sources médicales) AVANT de modifier `EMERGENCY_NUMBERS`. Présente les sources, l'humain valide, puis commit. **Pas de failsafe immédiat** (les numéros actuels restent en place pendant la recherche, mais le sign-off R1-sec attend la validation).
> - **F3** = **mode "le plus intelligent et propre sans limitation"** : combinaison **(a)** quick-win API key restrictions GCP + **(b)** resserrer rules statiques `allow read: if isAuthenticated()` sur les 11 collections de contenu + **(c)** Firebase App Check natif via `@react-native-firebase/app-check` (le projet a déjà `app/android/` → prebuild déjà fait, donc faisable sans U1). **3 sous-cycles dédiés**, App Check **inclus dans v1.0**.
> - **F6** = **no_encrypt_warn** : pas de chiffrement passphrase ; popup d'avertissement clair avant share + export via fichier `expo-sharing.shareAsync`.
> **Source** : `app/docs/ULTRA_AUDIT_360_2026-05-04.md` (30 findings).
> **Cible** : signer **R1-sec** (option D — bloque release publique) puis enchaîner V1-smoke + R1-arch + U1.
> **Méthode** : sub-agent `routine-implementer` pour exécution + Claude orchestrateur pour audit après chaque cycle (boucle audit→exécution→audit, comme la session UI-4…UI-9).
> **Garde-fou absolu** : aucun changement de logique métier ; tout fix touche soit la **config**, soit un **point précis bordé** ; toute modification de comportement utilisateur (UX reauth, popup) est explicite et tracée.

---

## 0. Vue d'ensemble (gantt — après décisions humaines)

```
PHASE A — BLOCKERS R1-sec (sign-off requirements)  ── ~2 jours dev
  C1  : F9 + F2 + F5            (config + ErrorBoundary safe)
  C2  : F7 + F18                (ipapi retrait + validateProfile au submit)
  C3  : F6                      (export GDPR via fichier + UX warning)
  C4  : F4                      (deleteAccount reauth flow)
  C5  : F1                      (Claude WebSearch officiel TN/MA/DZ → validation humaine → fix)

PHASE B — HIGH (INCLUS DANS v1.0 suite décision F3 = "no limitation")  ── ~5 jours dev
  C6a : F3a rules statiques resserrées (allow read: if isAuthenticated)
  C6b : F3b API key restrictions GCP (humain, 30 min)
  C6c : F3c App Check natif (@react-native-firebase/app-check, prebuild OK)
  C7  : F8 firestore.rules schema validation + tests deep
  C8  : F11 audit Markdown XSS + decision retrait

PHASE C — MEDIUMS bundlables  ── ~3 jours dev
  C9  : F12 + F18 + F19         (password policy + sentry hash)
  C10 : F13 + F14               (saveDailySymptoms idempotent + export 46→1 query)
  C11 : F15 + F16               (tel: validation + expo-secure-store PII)
  C12 : F17 + F20               (SCHEDULE_EXACT_ALARM justify + vuln monitoring)

PHASE D — LOWs hygiène (1 cycle bundle)  ── ~0.5 jour
  C13 : F21 + F23 + F24 + F25 + F26 + F29 + F30

PHASE E — différés (post-release)
  F22 → R1-arch.2 (UI-9 Onboarding refacto, déjà planifié)
  F27, F28 → V1-smoke (vérifications terrain)
```

**Total bloquant R1-sec v1.0** : Phases A (5 cycles, ~2 jours) **+ Phase B C6a-c (App Check inclus, ~5 jours)** → puis sign-off possible.
**Total post-release v1.0** : Phases C+D (5 cycles, ~3.5 jours).

---

## 1. PHASE A — BLOCKERS R1-sec (5 cycles)

### Cycle C1 — F9 + F2 + F5 (config + ErrorBoundary safe)
**Objectif** : 3 corrections déclaratives à risque très faible, regroupées en 1 commit.

#### F9 — ErrorBoundary masquer stack en prod
- **Fichier** : `app/src/components/common/ErrorBoundary.tsx`
- **Action** : entourer l'affichage de la stack par `__DEV__`. Texte fallback i18n pour utilisatrice.
- **Risque** : nul.
- **Test** : `npm run verify`.

#### F2 — Manifeste Privacy iOS complet
- **Fichier** : `app/app.json` (clés `expo.ios.privacyManifests`)
- **Action** : ajouter tous les types collectés réellement (Name, EmailAddress, CoarseLocation, HealthAndFitness, SensitiveInfo, OtherUserContent, UserID, DeviceID, CrashData, OtherDiagnosticData, ProductInteraction, Contacts pour emergency) + `NSPrivacyAccessedAPITypes` (UserDefaults, DiskSpace, FileTimestamp).
- **Risque** : déclaratif, pas de code.
- **Test** : `npm run verify` + validation visuelle JSON.

#### F5 — Permissions Android propres
- **Fichier** : `app/app.json` (`expo.android.blockedPermissions` + liste `permissions` exhaustive)
- **Action** : 
  ```json
  "android": {
    "permissions": ["INTERNET","POST_NOTIFICATIONS","RECEIVE_BOOT_COMPLETED","SCHEDULE_EXACT_ALARM","VIBRATE"],
    "blockedPermissions": ["android.permission.SYSTEM_ALERT_WINDOW","android.permission.WRITE_EXTERNAL_STORAGE","android.permission.READ_EXTERNAL_STORAGE"]
  }
  ```
- **Note** : ne PAS faire `npx expo prebuild --clean` (régénère le projet natif, hors scope refacto agent). Le prebuild propre sera fait dans U1 ou en cycle EAS dédié. Pour v1.0, `app.json` propre suffit ; le build EAS appliquera les blockedPermissions.
- **Risque** : faible (config) ; vérifier qu'aucun module n'a besoin de SYSTEM_ALERT_WINDOW (notifications full-screen ?). Audit `grep` recommandé avant.
- **Test** : `npm run verify` + EAS preview build (différé V1-smoke).

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(security): R1S-1..3 ErrorBoundary __DEV__ guard + iOS Privacy Manifest + Android blockedPermissions`.
**Critère sortie** : verify vert, CI verte, `app.json` validé visuellement par humain (1 minute).

---

### Cycle C2 — F7 + F18 (ipapi retrait + validateProfile)
**Objectif** : retirer fuite IP pre-consent + brancher la validation déjà existante au submit Onboarding.

#### F7 — ipapi.co retrait
- **Fichier** : `app/src/screens/OnboardingScreen.tsx:90-117`
- **Action** : remplacer `fetch('https://ipapi.co/json/')` par `Localization.region` (depuis `expo-localization`, déjà en deps). Mapping local → `country` existant.
- **Risque** : faible. La détection est moins précise (region OS) mais légale et locale.
- **Test** : `verify` + smoke device (V1-smoke).

#### F18 — Onboarding validateProfile au submit
- **Fichier** : `app/src/screens/OnboardingScreen.tsx` (handler `handleFinish` ou équivalent)
- **Action** : appeler `validateProfile(profileData)` (déjà défini `app/src/utils/validation.ts:148-177`) avant `loginAsGuest()`. Si invalide → `setError(message)` + abort.
- **Risque** : faible. Comportement utilisateur enrichi (erreur bloquante au lieu de défaut silencieux).
- **Test** : `verify` + ajouter test unitaire `Onboarding.handleFinish.test.ts` si possible (mock `loginAsGuest`).

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(onboarding): R1S-4..5 use expo-localization region + validate profile before submit`.
**Critère sortie** : verify vert, plus aucun appel `ipapi.co` (`grep -r "ipapi" app/src/` → 0).

---

### Cycle C3 — F6 (export GDPR via fichier + warning UX)
**Objectif** : remplacer `Share.share(jsonString)` par `expo-sharing.shareAsync(uri)` + popup d'avertissement explicite. Décision actée = `no_encrypt_warn`.

- **Fichier** : `app/src/services/dataExportService.ts:182-201` + `app/src/screens/ProfileScreen.tsx` (UX warning)
- **Action** :
  1. **UX warning** : avant l'export, afficher `Alert.alert(title, message, [Cancel, Continue])` avec message explicite : `"Cet export contient TOUTES vos données de santé (poids, tension, glycémie, symptômes, rendez-vous, contacts d'urgence). Choisissez une destination sécurisée et privée. Évitez les apps de stockage cloud non chiffrées."` (i18n fr/en/ar/tn).
  2. Si Continue → écrire le JSON dans `FileSystem.documentDirectory + 'mama-bebe-export-DATE.json'`.
  3. `await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: t('profile.gdprExport.title') })`.
  4. Cleanup du fichier après share (best-effort, ne bloque pas si fail).
- **Deps requises** : `expo-file-system` (vérifier présence ; si absent, `npx expo install expo-file-system`). `expo-sharing` déjà en deps.
- **Risque** : moyen. UX change (Alert + sheet de partage natif au lieu de message). Nécessite test V1-smoke iOS+Android.
- **Test** : `verify` + ajout test unitaire mock `Sharing.shareAsync`.
- **PAS de chiffrement** (décision actée).

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(gdpr): R1S-6 export via shareAsync file + UX warning (no clipboard PII)`.
**Critère sortie** : verify vert, mock test Sharing OK, V1-smoke iOS+Android validé.

---

### Cycle C4 — F4 (deleteAccount reauth flow)
**Objectif** : empêcher suppression Firestore prématurée si `firebaseUser.delete()` échoue avec `auth/requires-recent-login`.

- **Fichier** : `app/src/context/AuthContext.tsx:513-619` + `app/src/screens/ProfileScreen.tsx` (UX dialog)
- **Action** :
  1. **Inverser l'ordre** : tenter `firebaseUser.delete()` AVANT la purge Firestore.
  2. **Catch** `auth/requires-recent-login` → throw une erreur typée `RequiresReauthError`.
  3. Côté `ProfileScreen` : catch `RequiresReauthError` → afficher dialog "Pour confirmer la suppression, veuillez vous reconnecter" + champ password + flow `reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(email, password))` → retry deleteAccount.
  4. **Test à ajouter** dans `app/src/context/__tests__/AuthContext.gdpr.test.ts` :
     - mock `firebaseUser.delete()` rejette avec `auth/requires-recent-login` → vérifier que **aucune** collection Firestore n'a été purgée.
     - mock délégué `reauthenticateWithCredential` réussit → vérifier ordre purge correct.
- **Risque** : élevé (touche auth + UX). Testable en unit.
- **Note** : la doctrine "Firebase Auth must happen LAST so Firestore rules still apply" du commentaire actuel est **inexacte** — `firebaseUser.delete()` n'invalide pas les rules tant que l'app a encore `currentUser`. L'ordre correct est : reauth → delete Auth → si OK alors purge Firestore (dernière chance d'audit) → logout local.
- **Test** : `verify` + nouveau test gdpr.

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(auth): R1S-7 deleteAccount reauth flow + reorder (delete Auth -> Firestore purge)`.
**Critère sortie** : verify vert, 2 tests GDPR ajoutés et verts, V1-smoke OK.

---

### Cycle C5 — F1 (numéros d'urgence — INVESTIGATION officielle)
**Objectif** : recherche sourcée avant toute modification. Décision humaine actée = `investigate_first`.

#### C5.1 — Recherche par Claude (PAS de modif code)
- **Action** : Claude (orchestrateur) utilise **WebSearch** sur sources officielles :
  - Ministère de la Santé Tunisie (`http://www.santetunisie.rns.tn` ou équivalent), site officiel SAMU 190 vs Protection Civile 198, recommandations urgences obstétricales.
  - Ministère de la Santé Maroc, SAMU/Heure Médicale 141 vs Protection Civile 150, couverture régionale.
  - Ministère de la Santé Algérie, numéro SAMU national (14 ou 115), couverture wilaya.
  - Cross-check avec OMS, ambassades de France au TN/MA/DZ (recommandations expatriés), guides voyage médecine.
- **Livrable Claude** : `docs/gates/EMERGENCY_NUMBERS_RESEARCH.md` avec :
  - Tableau pays × numéro proposé × source URL × date consultation × niveau de confiance
  - Recommandation explicite par pays (numéro à mettre, fallback si confiance basse)
  - Cas spéciaux : Maroc régional (Casablanca vs autres), Algérie nord vs sud
- **Effort** : ~30 min Claude.

#### C5.2 — Validation humaine
- **Owner** : utilisateur lit `EMERGENCY_NUMBERS_RESEARCH.md`, signe ou demande complément.
- **Optionnel** : valider avec 1 médecin tunisien si possible (best effort).

#### C5.3 — Implémentation après validation
- **Fichier** : `app/src/utils/clinicalChecks.ts:225-249, 275-283`
- **Action sub-agent** :
  1. Mettre à jour `EMERGENCY_NUMBERS` avec les numéros validés.
  2. Pour pays sans confiance suffisante → **`null`** + masquer bouton (failsafe).
  3. Ajouter test fixture `clinicalChecks.test.ts` avec source citée en commentaire.
  4. Ajouter dans le UI un lien "Voir tous les numéros officiels du pays" (Linking vers Ministère Santé local).

**Sub-agent** : `routine-implementer` (uniquement C5.3 après validation humaine).
**Commit** : `fix(safety): F1 emergency numbers updated from official ministry sources (#R1S-8)`.
**Critère sortie** : verify vert, doc research validée, fixture test ajoutée.

---

### Sign-off R1-sec après Phase A
Après C1 + C2 + C3 + C4 + C5 (auto) + validation médicale F1 :
- Créer `docs/gates/GATE_R1_SEC_<DATE>.md` avec checklist Yes/No couvrant les 7 R1S-* du rapport.
- Signature humaine (case + nom + date).
- Tag git `v1.0-rc1` (préfixe rc tant que V1-smoke pas fait).

---

## 2. PHASE B — HIGH escalator (3 cycles, post sign-off ou en parallèle si bande passante)

### Cycle C6 — F3 (Firebase App Check) — 3 sous-cycles, INCLUS DANS v1.0
**Stratégie actée** = `mode "le plus intelligent et propre sans limitation"` : (a) + (b) + (c) combinés. App Check natif **fait partie de la release v1.0** (pas reporté à U1).

#### C6a — Resserrer rules statiques (auto, sub-agent)
- **Fichier** : `firestore.rules:126-136`
- **Action** :
  1. Pour les 11 collections de contenu (`articles`, `articlesAntigravity`, `tips`, `weeks`, `babyMessages`, `supplements`, `redFlags`, `chatbotSuggestionsAG`, `weeklyTasks`, `reminderTemplates`, `calendarTemplates`) → passer de `allow read: if true` à `allow read: if request.auth != null`.
  2. **Pré-vérification** : confirmer qu'AUCUN écran n'est lu en pre-auth (Onboarding lit-il `weeks` ou `calendarTemplates` avant `loginAsGuest` ? À vérifier — si oui, déplacer la lecture POST-loginAsGuest car même guest est authentifié anonymously par Firebase).
  3. Vérifier `loginAsGuest` utilise `signInAnonymously` Firebase (sinon ajouter, c'est ce qui donne `request.auth != null` en mode guest).
  4. Mettre à jour test `firestoreRulesParity` pour couvrir le nouveau contrat.
- **Risque** : moyen (peut casser pre-auth read si guest n'est pas anonymously signed). **Pré-audit obligatoire** avant délégation sub-agent.

#### C6b — Quick-win API key restrictions GCP (humain)
- **Action humaine** (pas d'agent) :
  1. GCP Console → Project Firebase → APIs & Services → Credentials → API key `EXPO_PUBLIC_FIREBASE_API_KEY`.
  2. Restreindre par : Application restrictions = iOS bundle ID + Android SHA-1 (keystore release) + HTTP referrers (si web).
  3. Restreindre par API : Cloud Firestore API + Identity Toolkit API uniquement.
- **Effort** : 30 min, zéro code.

#### C6c — Firebase App Check natif (auto, sub-agent)
- **Pré-requis confirmés** : le projet a déjà `app/android/` (prebuild fait), donc pas besoin d'attendre U1.
- **Action** :
  1. `npx expo install @react-native-firebase/app-check` (vérifier compat SDK 54 ; sinon utiliser `expo-app-check` si publié).
  2. Activer App Attest (iOS) + Play Integrity (Android) via Firebase console.
  3. Initialiser App Check dans `app/src/config/firebase.ts` (avant `initializeAuth` et `initializeFirestore`).
  4. **Mode debug pour dev** : `FIREBASE_APPCHECK_DEBUG_TOKEN` pour Expo Go / simulateurs.
  5. Côté Firebase console : passer App Check en **enforcement** sur Cloud Firestore + Auth après vérification 1-2 jours en mode "monitor only".
  6. Ajouter au `app.json` les permissions/configs natives requises (DeviceCheck.framework côté iOS, etc.).
  7. Test : tenter `curl` direct Firestore avec API key → doit échouer 403 après enforcement.
- **Risque** : élevé (touche init Firebase + native deps). **Tester sur device réel obligatoire** avant merge.

**Sub-agent** : `routine-implementer` pour C6a + C6c ; humain pour C6b.
**Commits** : 3 commits séparés (`fix(rules): F3a tighten static collections to authenticated reads`, `feat(security): F3c Firebase App Check (Play Integrity + App Attest)`, doc humain pour C6b).
**Critère sortie** : verify vert, App Check enforcement actif Firebase console (mode monitor avant enforcement), curl test 403 confirmé.

---

### Cycle C7 — F8 (firestore.rules + tests)
**Objectif** : valider schema/types/tailles/plages dans les rules + tester via `@firebase/rules-unit-testing`.

- **Fichier** : `firestore.rules` (à la racine ou dans `app/`)
- **Action** :
  1. Pour chaque collection user (`healthMetrics`, `weight_entries`, `glucoseMetrics`, `symptomsLog`, `userEvents`, `tasks`, `reminders`, `appointments`) ajouter validation :
     - `request.resource.data.user_id == request.auth.uid` (déjà via helper)
     - `request.resource.data.date is string && request.resource.data.date.matches('\\d{4}-\\d{2}-\\d{2}')`
     - bornes numériques (poids 0..300, semaine 0..45, etc.)
     - taille des champs string (`notes.size() <= 500`, `name.size() <= 100`)
     - timestamps (`request.time` >= `request.resource.data.createdAt` ± window)
  2. Créer `app/src/__tests__/firestoreRules.deep.test.ts` avec `@firebase/rules-unit-testing` couvrant chaque règle.
- **Risque** : moyen. Le moindre erreur de syntaxe rules → bloque toutes les écritures. **OBLIGATOIRE** : déployer en mode "draft" et tester avant merge.
- **Test** : suite `firestoreRulesParity` + nouvelle suite `firestoreRules.deep`.

**Sub-agent** : `routine-implementer`.
**Commit** : `feat(security): F8 firestore.rules schema validation + deep test suite`.

---

### Cycle C8 — F11 (audit Markdown XSS + decision)
**Objectif** : confirmer/infirmer le risque réel avant retrait `react-native-markdown-display`.

- **Action** :
  1. `grep -rn "Markdown\|markdown-it" app/src/` → lister tous les call-sites.
  2. Pour chacun, identifier la source de la string : `articles_db.json` (collection `articles`, lecture publique mais write false), `chatbotService` réponses (à investiguer), autres.
  3. Si toutes les sources sont contrôlées par l'équipe → documenter dans `SECURITY_NOTES.md` + risque accepté.
  4. Si une source provient de l'utilisateur → fix immédiat (sanitize avant render OU passer en text plain).
  5. Plan de retrait `react-native-markdown-display` : à programmer en U1 (lib peu maintenue).

**Sub-agent** : `routine-implementer` (audit + doc).
**Commit** : `docs(security): F11 audit Markdown XSS risk + decision matrix`.

---

## 3. PHASE C — MEDIUMS bundlables (4 cycles)

### Cycle C9 — F12 + F18 + F19 (sécurité auth)

#### F12 — Password policy 10+ chars
- **Fichier** : `app/src/utils/validation.ts:37-56`
- **Action** : passer min à 10 chars + au moins 1 majuscule (option). Aligner messages i18n.
- **Bonus** : activer Firebase Auth Password Policy depuis console (configurable serveur, sans code).

#### F18 — déjà fait en C2
(Doublon dans le rapport — C2 le couvre.)

#### F19 — Sentry hash UID
- **Fichier** : `app/src/utils/logger.ts:228-238`
- **Action** : hash SHA-256 truncated (16 chars) avant `Sentry.setUser({id: hash})`. Utiliser `expo-crypto` ou crypto natif (`Crypto.digestStringAsync('SHA-256', uid).slice(0, 16)`).

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(security): F12+F19 password 10 chars + Sentry UID hashed`.

---

### Cycle C10 — F13 + F14 (data fixes)

#### F13 — saveDailySymptoms idempotent
- **Fichier** : `app/src/services/healthService.ts:215-261`
- **Action** : remplacer `query → addDoc` par `setDoc(doc(db, 'symptomsLog', \`${userId}_${today}\`), data, {merge: true})`.

#### F14 — Export 46 round-trips → 1 query
- **Fichier** : `app/src/services/dataExportService.ts:67-91`
- **Action** : 1 query `where('user_id','==',uid)` + dispatch en mémoire par week.

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(data): F13+F14 idempotent symptoms save + GDPR export 1 query`.

---

### Cycle C11 — F15 + F16 (sécurité device)

#### F15 — `tel:` validation
- **Fichier** : `app/src/components/profile/EmergencyContactsSection.tsx:22-33, 42-58`
- **Action** : RegExp `^[+0-9 \-().]{4,20}$` au save + escape avant `tel:`.

#### F16 — expo-secure-store pour PII
- **Fichiers** : `AuthContext.tsx` + services qui stockent emergency contact numbers, ovulation data, email
- **Action** : migrer les **3 valeurs les plus sensibles** vers `expo-secure-store` (Keychain iOS / EncryptedSharedPrefs Android) :
  - `emergencyContacts[].number`
  - `ovulationDate`, `fertileWindowStart/End`
  - email (si stocké en plus du Firebase Auth)
- **Bonus** : `android:allowBackup="false"` dans AndroidManifest (via `app.json` `android.allowBackup: false`).

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(security): F15+F16 tel validation + expo-secure-store for PII`.

---

### Cycle C12 — F17 + F20 (notifications + monitoring)

#### F17 — SCHEDULE_EXACT_ALARM justification
- **Action** :
  1. Vérifier dans `notificationService.ts:120-144` si `setExactAndAllowWhileIdle` est utilisé.
  2. Si tolerance ±5-15 min → migrer vers `setRepeating` inexact + retirer `SCHEDULE_EXACT_ALARM` de app.json.
  3. Sinon → préparer `docs/store/SCHEDULE_EXACT_ALARM_JUSTIFICATION.md` pour Play Console.

#### F20 — Vuln monitoring
- **Action** : ajouter cron `npm audit --audit-level=high --json` dans CI workflow weekly + open issue auto si nouveau finding.

**Sub-agent** : `routine-implementer`.
**Commit** : `chore(notif,ci): F17+F20 inexact alarms (if applicable) + weekly vuln cron`.

---

## 4. PHASE D — LOWs hygiène (1 cycle bundle)

### Cycle C13 — F21 + F23 + F24 + F25 + F26 + F29 + F30

| Finding | Action |
|---------|--------|
| F21 | Migrer Firebase keys de `eas.json` vers EAS Secrets |
| F23 | Confirmer si `chatbot_data.ts` est utilisé runtime → migrer vers SQLite ou marquer pour retrait |
| F24 | Décider : compléter `babyEvolution.json` ou masquer écran avant release |
| F25 | (LOW) accepter ou améliorer date input web |
| F26 | Ajouter `**/.DS_Store` au `.gitignore` global du repo |
| F29 | Supprimer `analyticsService.ts` ou commenter ses no-ops (clean code) |
| F30 | Supprimer `WeightTrackerScreen_debug_handlers.tsx.snippet` |

**Sub-agent** : `routine-implementer`.
**Commit** : `chore(hygiene): F21+F23..F30 cleanup (LOW findings bundle)`.

---

## 5. PHASE E — Différés (post-release)

| Finding | Renvoyé vers | Note |
|---------|--------------|------|
| F22 | R1-arch.2 (UI-9 Onboarding) | déjà planifié dans MASTER_GATE_PLAN.md |
| F27 | V1-smoke axe i18n | vérification visuelle terrain |
| F28 | observation post-release | reconsidérer si > 1000 entrées/user |
| C6b (App Check natif) | U1 (cycle Expo 55) | requiert prebuild |

---

## 6. Méthodologie d'exécution (rappel cadre)

Pour chaque cycle :
1. **Audit pré** : Claude lit fichiers cibles, confirme bornes exactes, identifie risques cachés.
2. **Délégation** : prompt précis au sub-agent `routine-implementer` avec :
   - Règles absolues (ce qu'il NE PEUT PAS toucher).
   - Scope mécanique limité.
   - Validation intégrée (`npm run verify` + `git diff` scope vide hors zone).
   - Commit + push + `gh run watch --exit-status`.
3. **Audit post** : Claude vérifie :
   - Diff scope strict (rien hors fichiers prévus).
   - `npm run verify` re-run.
   - CI verte distant.
   - Comportement préservé (grep des fonctions critiques inchangées).
4. **Si KO** : correction immédiate dans le même cycle, re-audit, **pas d'enchaînement** sans cycle vert.

---

## 7. Décisions humaines actées (2026-05-04)

Voir bloc en tête du document. F1=investigate_first, F3=mode complet (App Check inclus v1.0), F6=warn sans chiffrement.

---

## 8. Critères de sortie globaux

| Étape | Critère | Statut |
|-------|---------|--------|
| Phase A complète | C1..C5 verts + validation médicale F1 humaine | bloque tag v1.0-rc1 |
| Sign-off R1-sec | `docs/gates/GATE_R1_SEC_<DATE>.md` signé humain | bloque release publique |
| V1-smoke complet | `docs/gates/GATE_V1_SMOKE_<DATE>.md` signé humain | bloque release publique |
| Tag v1.0 | Phase A + R1-sec + V1-smoke verts | release SDK 54 |
| Phase B+C+D | dans 2 cycles post-v1.0 | sinon escalator |
| U1 + R1-arch.2 | branche dédiée, gate dédié | tag v1.1 |

---

*Plan figé en attente de GO humain. Pas d'exécution automatique. Sub-agents prêts à recevoir les prompts cycle par cycle dès l'ordre donné.*
