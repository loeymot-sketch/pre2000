# Master Gate Plan — décisions actées 2026-05-04

Décisions humaines confirmées :

| Gate | Choix | Motif |
|------|-------|-------|
| **R1-sec** | **D** — bloquer release publique tant que non signé | Domaine santé/GDPR : pas de production sans sign-off écrit |
| **V1-smoke** | **B** — smoke étendu fr + ar/tn (2-3 h) | App multilingue/RTL : couverture LTR seule insuffisante |
| **U1** | **B** — séquentiel : R1-sec + V1-smoke d'abord, U1 ensuite sur branche | Découpage du risque : on valide l'état actuel avant de bouger le SDK |
| **R1-arch** | **E** — strangler-fig en 3 sous-phases (enum dérivé → UI-9 → migration data plus tard) | Débloque l'UI sans toucher aux données utilisateur |

Stratégie de release confirmée : **v1.0 sur SDK 54** dès que R1-sec + V1-smoke verts ; **v1.1 sur SDK 55** plus tard (cycle U1 isolé).

V1-smoke owner : **utilisateur + assistance Claude** (script + checklist + analyse captures).

Périmètre ultra-review : **360°** (sécurité + UI/UX + data + sync + perf + a11y + offline + store-readiness).

---

## 1. Orchestration globale

```
PHASE 1 — VALIDATION DE L'ÉTAT ACTUEL (parallèle, bloque release v1.0)
    R1-sec   ──┐
    V1-smoke ──┼──> Sign-off humain → tag v1.0-rc
               │
PHASE 2 — REFACTO INTERNE (séquentiel après v1.0-rc, non bloquant pour v1.0)
    R1-arch.1 (enum dérivé)
       ↓
    R1-arch.2 = UI-9 Onboarding (refacto enum-driven)
               │
PHASE 3 — UPGRADE STACK (séquentiel, isolé sur branche)
    U1 (Expo 55 + RN 0.85 + Sentry 8) → tag v1.1-rc → re-smoke ciblé → merge
               │
PHASE 4 — CHANTIER DATA (cycle isolé, gate humain dédié)
    R1-arch.3 (migration Firestore + AsyncStorage, retrait booléens)
```

---

## 2. R1-sec — Plan détaillé (domaine D)

### 2.1 Périmètre figé
- `firestore.rules` (toutes collections, mode deny-by-default attendu)
- `app/src/context/AuthContext.tsx` + tests `AuthContext.{login,gdpr}.test.ts` + `EmergencyContacts.contract.test.ts`
- `app/src/services/migrateGuestData.ts` + test
- `app/src/services/__tests__/firestoreRulesParity.test.ts`
- Flux : signup, login, logout, guest → registered, reset password, delete account (RGPD), exports/imports utilisateur, partage emergency contacts, autorisations Firestore par doc, isolation par `uid`.

### 2.2 Étapes
1. **R1-sec.1 PLAN** (cycle 1) — rédiger checklist : ~40 questions Yes/No couvrant auth flows, GDPR rights, Firestore rules per collection, error handling, rate limiting, secrets in repo, env var leakage, logging PII.
2. **R1-sec.2 EXEC** (cycle 2) — exécuter l'audit avec le **message ultra-deep ci-dessous** (section 6) côté Claude ; produire `docs/gates/R1_SEC_REPORT_<DATE>.md` (forces, failles, gravité, action).
3. **R1-sec.3 GATE** — sign-off humain dans `docs/gates/GATE_R1_SEC_<DATE>.md` (case à cocher + nom + date). Si une faille HIGH+ détectée → cycle de correction → re-audit → re-gate.

### 2.3 Critères de sortie (sign-off possible)
- 0 faille `critical` ou `high` détectée non corrigée
- Toutes failles `medium` documentées avec décision (fix / accept / defer)
- Test `firestoreRulesParity` couvre les nouvelles collections introduites depuis le dernier audit
- Pas de secret dans le repo (vérifié par scan)

---

## 3. V1-smoke — Plan détaillé (domaine B avec assistance Claude)

### 3.1 Méthode
- **Script** rédigé par Claude (parcours numérotés, captures attendues à chaque étape).
- Utilisateur exécute le script sur device/émulateur, collecte captures + journal d'observations.
- Claude analyse les captures + journal et produit `docs/gates/V1_SMOKE_REPORT_<DATE>.md`.

### 3.2 Périmètre par écran (priorité décroissante)
1. **Onboarding** (multi-modes : guest/TTC/curieux/enceinte) — toutes les transitions, validation, persistance, RTL.
2. **Calendrier** — vue semaine/mois, suggestions générées (10/sem × 40 sem), ajout RDV, modification, suppression, navigation week/month, FAB, FlatList scroll, RTL chevrons.
3. **Santé (HealthDashboard)** — saisie poids/TA/glycémie, charts, calculs IMC/trends, modaux, erreurs validation.
4. **Rappels** — permissions notifications, daily cap (8/jour), edit modal, persistence, scheduling.
5. **PDF export** — génération + partage.
6. **Profil** — auth (login/logout), GDPR (export/delete account), changement langue (avec restart RTL), emergency contacts.
7. **Tasks** — création (modal), récurrence, completion, archivage.
8. **Articles + Suppléments + Forbidden Foods** — listes + détails.
9. **Chatbot** — FAQ, suggestions, conversational flow.
10. **Offline** — bandeau, comportement read-only, reprise sync.

### 3.3 Couvertures linguistiques
- **fr-FR** (LTR, locale primaire)
- **ar-TN** (RTL strict)
- **tn-TN** (tamazight tunisien, RTL)

Pour chaque combinaison écran × langue : capture initiale + capture après interaction.

### 3.4 Critères de sortie
- 0 crash
- 0 string non traduite visible
- 0 débordement RTL (icônes, chevrons, padding)
- Tous les flux critiques (Onboarding → Home → Calendar → AddRDV → ViewRDV → Edit → Delete) fonctionnent end-to-end
- Performance subjective acceptable (pas de freeze > 1s sur scroll/nav)

### 3.5 Sign-off
`docs/gates/GATE_V1_SMOKE_<DATE>.md` avec case à cocher + nom + date + lien vers le rapport.

---

## 4. U1 — Plan détaillé (Expo 54 → 55)

### 4.1 Pré-requis
- v1.0-rc taggé sur SDK 54 (R1-sec + V1-smoke verts)
- Branche `feat/expo-55` créée depuis `main`
- Aucune autre dette critique en cours

### 4.2 Étapes
1. **U1.1 PLAN** — lire matrice Expo 55 (https://expo.dev/changelog/sdk-55), lister les breaking changes affectant les deps actuelles (notifications, sqlite, screens v5, navigation 7.x, sentry 8).
2. **U1.2 EXEC** sur branche :
   - `npx expo install --fix` puis `--check`
   - Bumper RN 0.81 → 0.85
   - Bumper Sentry 7 → 8 (suivre guide migration)
   - Bumper firebase 12.6 → 12.12 (mineur)
   - `npm run verify` doit passer
   - Build EAS preview iOS + Android
3. **U1.3 RE-SMOKE CIBLÉ** — focus sur zones impactées par SDK :
   - Notifications (planification + reception)
   - SQLite (chatbot data load)
   - Navigation v7 (transitions, gesture)
   - Sentry capture
   - RTL (vérifier que `I18nManager` reste cohérent)
4. **U1.4 GATE** — sign-off humain device-tested (iOS + Android au minimum un device chacun).

### 4.3 Critères de sortie
- Verify vert
- EAS preview build success iOS + Android
- Re-smoke ciblé : 0 régression
- Sign-off `docs/gates/GATE_U1_<DATE>.md`

### 4.4 Rollback
Si U1 échoue → conserver v1.0 sur SDK 54, abandonner branche `feat/expo-55`, replanifier U1 plus tard.

---

## 5. R1-arch — Plan détaillé (option E strangler-fig)

### 5.1 Sous-phase R1-arch.1 — Enum dérivé (cycle agent autonome, sans gate)
- Créer `app/src/types/UserMode.ts` :
  ```ts
  export enum UserMode { GUEST = 'guest', TTC = 'ttc', CURIOUS = 'curious', PREGNANT = 'pregnant' }
  ```
- Créer helper pur `app/src/utils/computeUserMode.ts` :
  ```ts
  export function computeUserMode(profile: UserProfile): UserMode {
    if (profile.isGuest) return UserMode.GUEST;
    if (profile.isTTC) return UserMode.TTC;
    if (profile.isCurious) return UserMode.CURIOUS;
    return UserMode.PREGNANT;
  }
  ```
- Tests unitaires (table-driven) couvrant toutes les combinaisons booléennes existantes.
- Aucune écriture Firestore, aucune migration AsyncStorage, aucun changement comportemental.
- 1 commit, CI verte.

### 5.2 Sous-phase R1-arch.2 — UI-9 Onboarding refacto
- Consommer `useMemo(() => computeUserMode(profile), [profile])` dans `OnboardingScreen.tsx`.
- Extraire les 8 `renderStepN*` en composants par mode :
  - `app/src/components/onboarding/PregnantSteps.tsx` (Step2, Step3, Step4)
  - `app/src/components/onboarding/TTCSteps.tsx` (Step2TTC, Step3TTC)
  - `app/src/components/onboarding/CuriousSteps.tsx` (Step2Curious, Step3Curious)
  - `Step1` reste inline (commun à tous les modes).
- Switch principal :
  ```tsx
  switch (mode) {
    case UserMode.PREGNANT: return <PregnantSteps step={step} {...handlers} />
    case UserMode.TTC:      return <TTCSteps step={step} {...handlers} />
    ...
  }
  ```
- Cible : `OnboardingScreen.tsx` < 800 lignes.
- 1 commit, CI verte.

### 5.3 Sous-phase R1-arch.3 — Migration data (cycle isolé, gate humain dédié)
- **Pas planifié dans cette session.** Plan séparé requis :
  - Ajouter `userMode` champ persistant Firestore + AsyncStorage
  - Écriture parallèle (booléens + enum) pendant 1-2 sprints
  - Backfill des comptes existants (script idempotent)
  - Suppression des booléens
- Gate humain : revue migration + plan rollback.

---

## 6. Message ULTRA-DEEP pour Claude (R1-sec audit) — copier-coller manuel

> **Voir section dédiée ci-dessous (chat).** Ce message est conçu pour produire un rapport 360° complet : sécurité, UI/UX, data, sync, perf, a11y, offline, store-readiness.

---

## 7. Calendrier prévisionnel (indicatif, à confirmer)

| Sprint | Contenu | Gate fin de sprint |
|--------|---------|--------------------|
| S1 | R1-sec.2 EXEC + V1-smoke.2 EXEC en parallèle | R1-sec.3 + V1-smoke.3 → tag v1.0-rc |
| S2 | (si gates verts) Release v1.0 sur SDK 54 + R1-arch.1 + R1-arch.2 | UI-9 Onboarding < 800 lignes |
| S3 | U1 sur branche `feat/expo-55` + EAS preview + re-smoke ciblé | U1 sign-off → tag v1.1-rc |
| S4 | (plus tard) R1-arch.3 migration data | Gate data dédié |

---

## 8. Garde-fous orchestration (rappel)

- L'agent **n'auto-approuve aucun gate**. Tous les sign-off restent humains.
- Aucun changement de logique métier sans gate humain explicite.
- Boucle audit→exécution→audit après chaque cycle (`npm run verify` + `git diff` scope vide + CI verte).
- Échec d'un cycle → STOP, rapport, pas d'enchaînement automatique.

---

*Plan maître — figé après décisions humaines 2026-05-04. Pas d'exécution code dans ce commit. Prochaine action humaine : copier le message ultra-deep (section 6 / chat) à Claude pour démarrer R1-sec.2 EXEC.*
