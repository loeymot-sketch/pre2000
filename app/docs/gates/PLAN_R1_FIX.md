# Plan de correction R1-sec — orchestré, prêt-à-exécuter

> **Statut** : PRÊT — en attente de GO humain pour démarrer.
> **Source** : `app/docs/ULTRA_AUDIT_360_2026-05-04.md` (30 findings).
> **Cible** : signer **R1-sec** (option D — bloque release publique) puis enchaîner V1-smoke + R1-arch + U1.
> **Méthode** : sub-agent `routine-implementer` pour exécution + Claude orchestrateur pour audit après chaque cycle (boucle audit→exécution→audit, comme la session UI-4…UI-9).
> **Garde-fou absolu** : aucun changement de logique métier ; tout fix touche soit la **config**, soit un **point précis bordé** ; toute modification de comportement utilisateur (UX reauth, popup) est explicite et tracée.

---

## 0. Vue d'ensemble (gantt)

```
PHASE A — BLOCKERS R1-sec (sign-off requirements)  ── ~2 jours dev
  C1  : F9 + F2 + F5            (config + ErrorBoundary safe)
  C2  : F7 + F18                (ipapi retrait + validateProfile au submit)
  C3  : F6                      (export GDPR via fichier)
  C4  : F4                      (deleteAccount reauth flow)
  C5  : F1                      (escalade médicale + failsafe null TN/MA/DZ)

PHASE B — HIGH escalator (à faire dans 2 cycles post-release)  ── ~5 jours dev
  C6  : F3 (Firebase App Check) — 2 sous-cycles (quick-win + complet)
  C7  : F8 (firestore.rules schema validation + tests)
  C8  : F11 (audit Markdown XSS + plan retrait markdown-display)

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

**Total bloquant R1-sec** : Phases A (5 cycles, ~2 jours) → puis sign-off possible.
**Total souhaitable post-release** : Phases B+C+D (8 cycles, ~8.5 jours).

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

### Cycle C3 — F6 (export GDPR via fichier)
**Objectif** : remplacer `Share.share(jsonString)` (PII en mémoire/clipboard) par `expo-sharing.shareAsync(uri, {mimeType: 'application/json'})`.

- **Fichier** : `app/src/services/dataExportService.ts:182-201`
- **Action** :
  1. Écrire le JSON dans un fichier temporaire via `expo-file-system` (`FileSystem.documentDirectory + 'mama-bebe-export-DATE.json'`).
  2. `await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: t('profile.gdprExport.title') })`.
  3. Cleanup du fichier après share (best-effort).
  4. Optionnel : popup d'avertissement avant export ("Choisissez une destination sécurisée").
- **Deps requises** : `expo-file-system` (vérifier présence ; si absent, `npx expo install expo-file-system`). `expo-sharing` est déjà en deps.
- **Risque** : moyen. UX change (sheet de partage natif au lieu de message). Nécessite test V1-smoke iOS+Android.
- **Test** : `verify` + ajout test unitaire mock `Sharing.shareAsync`.
- **Décision optionnelle (humain)** : faut-il chiffrer l'export avec passphrase utilisateur ? **Non recommandé** pour v1.0 (UX lourde) ; ajouter avertissement clair suffit. Décision dans formulaire ci-dessous.

**Sub-agent** : `routine-implementer`.
**Commit** : `fix(gdpr): R1S-6 export user data via shareAsync file (no PII in clipboard)`.
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

### Cycle C5 — F1 (numéros d'urgence — ESCALADE)
**Objectif** : NE PAS deviner. Failsafe + escalade médicale humaine.

#### Action immédiate (auto, sécurise sans bloquer)
- **Fichier** : `app/src/utils/clinicalChecks.ts:225-249, 275-283`
- **Action** :
  1. **TN, MA, DZ → retourner `null`** dans `EMERGENCY_NUMBERS` (commenté `unverified — pending medical review #F1`).
  2. **HealthDashboardScreen** déjà respecte `getEmergencyNumber → null` (le bouton est masqué). Vérifier que c'est bien le cas (audit `grep "EMERGENCY_NUMBERS"`).
  3. Garder FR=15 (validé).
  4. Ajouter dans le UI une icône info qui dirige vers les numéros officiels du pays (lien externe `Linking.openURL` vers la page officielle Ministère de la Santé du pays sélectionné).
  5. Ajouter test fixture `clinicalChecks.test.ts` : `getEmergencyNumber('TN') === null` jusqu'à validation médicale.

#### Action humaine (escalade — bloque sign-off complet)
- **Owner** : utilisateur doit obtenir confirmation par 1 médecin tunisien (et idéalement marocain, algérien) ou source officielle (sites Ministère de la Santé) sur :
  - **TN** : SAMU = 190 ? Protection Civile / ambulance = 198 ? Numéro à choisir prioritairement ?
  - **MA** : SAMU = 141 (Casablanca/Rabat) ou Protection Civile = 150 ?
  - **DZ** : SAMU = 14 ou 115 selon région ?
- **Livrable humain** : `docs/gates/EMERGENCY_NUMBERS_VALIDATION.md` avec source officielle + signature.

**Sub-agent** : `routine-implementer` (action auto seulement).
**Commit** : `fix(safety): R1S-8 emergency numbers TN/MA/DZ -> null pending medical review (#F1)`.
**Critère sortie** : verify vert, test fixture ajouté, **gate signé seulement après validation médicale**.

**Note** : ce cycle est le seul où le sign-off R1-sec dépend d'une action humaine externe (médecin). Tous les autres cycles sont auto-validables.

---

### Sign-off R1-sec après Phase A
Après C1 + C2 + C3 + C4 + C5 (auto) + validation médicale F1 :
- Créer `docs/gates/GATE_R1_SEC_<DATE>.md` avec checklist Yes/No couvrant les 7 R1S-* du rapport.
- Signature humaine (case + nom + date).
- Tag git `v1.0-rc1` (préfixe rc tant que V1-smoke pas fait).

---

## 2. PHASE B — HIGH escalator (3 cycles, post sign-off ou en parallèle si bande passante)

### Cycle C6 — F3 (Firebase App Check) — 2 sous-cycles
**Stratégie** : quick-win immédiat + chantier complet en U1.

#### C6a — Quick-win API key restrictions GCP
- **Action humaine** (pas d'agent) :
  1. GCP Console → Project `pregnancy-app-1f939` → APIs & Services → Credentials → API key `EXPO_PUBLIC_FIREBASE_API_KEY`.
  2. Restreindre par : Application restrictions = iOS bundle ID `com.mamabebe.pregnancyapp` + Android SHA-1 (du keystore release) + HTTP referrers (web).
  3. Restreindre par API : Cloud Firestore API + Identity Toolkit API (Firebase Auth) uniquement.
- **Effort** : 30 min, zéro code.
- **Limite** : ne bloque pas un attaquant qui aurait extrait le bundle iOS/Android et signé une app bidon avec le même bundle ID (très improbable hors device root).

#### C6b — Firebase App Check natif (cycle U1)
- **Différé** dans `feat/expo-55` (U1) car nécessite :
  - migration partielle vers `@react-native-firebase/app-check` ou
  - `expo-app-check` (si publié pour SDK 55) ou
  - prebuild propre + AppAttest iOS + PlayIntegrity Android + tests TestFlight/Internal Testing.

**Sub-agent** : aucun pour C6a (humain) ; C6b lié à U1.

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

## 7. Décisions humaines requises AVANT démarrage

3 points qui modifient le plan ci-dessus selon ton choix. Voir formulaire séparé dans la conversation chat.

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
