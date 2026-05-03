# Rapport d'audit dur — état réel session 2026-05-04

> Audit exhaustif demandé par l'utilisateur après la chaîne UI-1…UI-3.
> Réponse honnête : **NON, pas tout bon**. La couche "verify + CI verts" cache 5 risques sérieux non traités par le rapport `AUDIT_DEEP_FINAL.md`.

---

## 0. TL;DR

| Niveau | Constat | Action |
|--------|---------|--------|
| ✅ | `npm run verify` vert (24/24 suites · 294/294 tests · `tsc` · `lint:colors`) | RAS |
| ✅ | CI `App CI` verte sur `a60c448` (run `25292407047`) | RAS |
| ✅ | Working tree propre, push synchro, 0 conflit, 0 régression mesurée | RAS |
| 🟠 | **Couverture refacto incomplète** : 7 fichiers > 700 lignes jamais touchés (`CalendarScreen` 1217 > Onboarding 1203) | Plan **UI-4…UI-9** |
| 🔴 | **`@expo/vector-icons` non déclaré dans `package.json`** mais utilisé dans 6 fichiers | Plan **F1** (1 ligne) |
| 🔴 | **2 vulnérabilités critical + 5 high** (handlebars, protobufjs, xmldom, lodash, minimatch, node-forge, picomatch) | Plan **S1** (analyse + bump) |
| 🟠 | **Expo SDK 54 → 55 disponible**, RN 0.81 → 0.85, Sentry 7 → 8 | Plan **U1** (cycle dédié) |
| 🟠 | **Workflows GH Node 20 deprecated** (juin 2026) | Plan **C1** (bump `actions/*@v5`) |
| 🟠 | **Dépendances "non utilisées"** suspectes (depcheck) à valider | Plan **D1** (review) |
| 🟠 | **Dette TODO** : 5 marqueurs (dont `Strategy B` isTTC/isGuest enum) | Plan **R1** (refacto modèle) |
| 🟡 | Gates humains R1-sécurité (Firestore/Auth) + V1 smoke RTL | Inchangés |

**Verdict** : code stable et testé, mais **3 corrections triviales (F1/C1/S1)** à pousser immédiatement, puis **2 chantiers de fond (U1 SDK + UI-4…UI-9)** avant publication store.

---

## 1. Audit machine — preuves brutes

### 1.1 Build & tests (re-run)
```
npm run verify
→ lint:colors     PASS
→ tsc --noEmit    PASS
→ jest            24 / 24 suites · 294 / 294 tests
```

### 1.2 Git
```
HEAD = 357eed4 (docs sync)  → origin/main à jour
Tree = clean
```

### 1.3 Top fichiers volumineux (`wc -l src/**`)
| Lignes | Fichier | Statut refacto |
|-------:|---------|----------------|
| 2 396 | `src/data/chatbot_data.ts` | data (OK, généré) |
| **1 217** | `src/screens/CalendarScreen.tsx` | ❌ JAMAIS audité |
| **1 203** | `src/screens/OnboardingScreen.tsx` | ✅ styles extraits (UI-1) — JSX encore lourd |
| **1 089** | `src/screens/HealthDashboardScreen.tsx` | ❌ JAMAIS audité |
| 1 015 | `src/screens/HomeScreen.styles.ts` | ✅ extrait (UI-2) |
| **906** | `src/screens/AddAppointmentScreen.tsx` | ❌ JAMAIS audité |
| **890** | `src/components/tasks/AddTaskModal.tsx` | ❌ JAMAIS audité |
| 889 | `src/screens/WeightTrackerScreen.tsx` | ✅ styles extraits (UI-3) |
| **887** | `src/screens/ProfileScreen.tsx` | ❌ JAMAIS audité |
| **789** | `src/screens/reminders/RemindersTab.tsx` | ❌ JAMAIS audité |
| **747** | `src/services/reminderPersistence.ts` | ❌ JAMAIS audité |
| 745 | `src/screens/HomeScreen.tsx` | ✅ (UI-2) |
| **716** | `src/components/reminders/ReminderEditModal.tsx` | ❌ JAMAIS audité |
| **656** | `src/components/tasks/MyDaySection.tsx` | ❌ JAMAIS audité |
| **646** | `src/context/AuthContext.tsx` | ⚠️ touché en R1-gate |

### 1.4 Dépendances
- **`@expo/vector-icons` MANQUANT dans `package.json`** mais utilisé dans :
  `ArticleDetailScreen`, `CalendarScreen`, `ProfileScreen`, `SettingsScreen`, `SupplementDetailScreen`, `components/reminders/HydrationCard`. Fonctionne par accident (résolu via `expo` transitif). **Cassera dès qu'on bumpera Expo SDK.**
- **`firebase-admin` MANQUANT** — utilisé dans `scripts/update-firestore-emojis.ts`. Script dev seulement, mais cassé tel quel.
- **`npm outdated`** : `expo 54→55`, `react-native 0.81→0.85`, `@sentry/react-native 7→8`, `firebase 12.6→12.12`, `i18next 25→26`, `react-i18next 16→17`, `react-native-pager-view 6→8`. Plusieurs majors en retard.
- **`depcheck` (faux positifs probables mais à confirmer)** : `expo-dev-client`, `expo-localization`, `react-dom`, `react-native-pager-view`, `react-native-screens`, `react-native-tab-view`, `react-native-web`. Les 5 dernières sont *implicitement* requises par `@react-navigation/*` ou par Expo Web — à documenter.

### 1.5 Sécurité npm (`npm audit`)
```
{ info:0, low:0, moderate:21, high:5, critical:2, total:28 }

CRITICAL : handlebars, protobufjs
HIGH     : @xmldom/xmldom, lodash, minimatch, node-forge, picomatch
```
**Toutes transitives** (chaînes via `firebase-admin`, `expo CLI`, `@expo/config-plugins`). **Pas exploitables au runtime app** (ces deps tournent côté build/scripts), mais à patcher pour propreté + revue de licence avant store.

### 1.6 CI / workflows
- `.github/workflows/ci.yml` ✅ (à la racine, vu par GitHub)
- `.github/workflows/eas-build.yml` ✅ (déclencheur `release/*` — non testé en CI)
- **Pas de duplication** dans `app/.github/` (vérifié `ls`).
- Annotation persistante : `actions/checkout@v4` + `setup-node@v4` sur Node 20 deprecated (force Node 24 le **2 juin 2026**).

### 1.7 Code semi-statique
| Catégorie | Détail |
|-----------|--------|
| TODO/FIXME | 5 marqueurs : `OnboardingScreen.tsx:985` + `types/index.ts:274` (Strategy B isTTC/isGuest), `dailyChecklistService.ts:71`, `contextMatcher.ts:108` (note historique), `chatbot_data.ts:18` (regen) |
| `lint:colors` | ✅ 0 violation hex/rgba hors SSOT |
| RTL | 20 écrans `RtlAwareChevron`, 3 écrans utilisent encore `Ionicons` natifs avec inversion manuelle (cohérent, documenté) |

---

## 2. Raisonnement fort — ce que `AUDIT_DEEP_FINAL.md` n'avait pas vu

Le précédent rapport disait :
> "Verdict : production-ready côté technique. Bugs/régressions détectés : **0**."

**Nuances majeures** :

1. **"0 bug détecté" ≠ "0 risque caché"**. La suite de tests Jest (294) **ne couvre pas** :
   - les imports manquants côté runtime natif (ex. `@expo/vector-icons` cassé sur upgrade) — Jest mocke RN.
   - les chaînes de vulnérabilités transitives (npm audit jamais lancé dans le rapport précédent).
   - le décalage SDK Expo (1 major en retard = EAS build cassera dans 6-9 mois).

2. **"production-ready" est exagéré** sans :
   - revue manuelle Firestore rules + AuthContext (gate R1, **non levé**).
   - test visuel RTL `ar`/`tn` (gate V1, **non levé**).
   - un cycle de bump SDK Expo + lockfile cohérent.

3. **Couverture refacto biaisée** : on a refactoré les 3 écrans **les plus visibles** (Onboarding/Home/Weight) mais **pas les plus gros** (`CalendarScreen` 1217 > `OnboardingScreen` 1203). Choix défendable côté priorité produit, mais **annoncer "UI traitée" est trompeur**.

4. **CI Node 20 deprecated** : annotation déjà visible 3 fois — D5 listé mais **pas planifié**. Risque de pipeline cassé en juin 2026 sans prévenir.

5. **Tests `Platform.OS === 'web'` uniquement** (mapping `react-native → react-native-web` dans Jest) : `getShadowStyle` Android/iOS et `buildShadow` Android/iOS **non testés**. Risque silencieux sur EAS build natif.

---

## 3. Plan de correction (priorisé)

### Étage 1 — corrections triviales, 1 cycle (PR petite)

#### F1 — Déclarer `@expo/vector-icons` dans `package.json`
- **Why** : import implicite via Expo, casse à l'upgrade SDK.
- **How** : `npm i @expo/vector-icons@^15` (version alignée Expo SDK 54).
- **Validate** : `verify` vert, `npm ls @expo/vector-icons` montre racine.
- **Risque** : aucun.
- **Effort** : ≤ 10 min.

#### C1 — Bump GitHub Actions sur Node 24
- **Why** : annotation deprecated, deadline 2 juin 2026.
- **How** : dans `.github/workflows/ci.yml` et `eas-build.yml` :
  - `actions/checkout@v4` → `@v5` (quand publié — sinon `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env)
  - `actions/setup-node@v4` → `@v5`, `node-version: 24` (mais vérifier compat Expo 54)
- **Validate** : workflow run vert.
- **Risque** : moyen — Expo 54 peut grincer sur Node 24 ; alternative immédiate = ajouter `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` au workflow.
- **Effort** : ≤ 30 min (test inclus).

#### S1 — Audit & quick fixes vulnérabilités npm
- **Why** : 2 critical + 5 high (transitifs).
- **How** :
  - `npm audit fix` (sans `--force`) → patch ce qui peut l'être sans semver-major.
  - Documenter les vulns restantes (transitifs Expo/firebase-admin) dans `app/docs/SECURITY_NOTES.md` avec impact runtime = 0 et calendrier upgrade.
- **Validate** : `npm audit` après ; ajouter check non-bloquant en CI.
- **Risque** : bas — pas de bump major non sollicité.
- **Effort** : 30-60 min.

### Étage 2 — chantier de fond (cycles dédiés)

#### U1 — Bump Expo SDK 54 → 55 (+ React Native 0.81 → 0.85)
- **Why** : retard d'1 major. EAS build risque blocage Apple/Google d'ici 6 mois.
- **How** :
  - `npx expo install --check` puis `npx expo install --fix`.
  - Bumper `react-native`, `react`, `expo-*` selon matrice Expo 55.
  - Vérifier breaking changes (notamment `expo-notifications` v55, `expo-sqlite` v55, `react-native-screens` 4 → 5).
  - Re-run `verify` + `eas build --profile preview` smoke.
- **Validate** : verify + 1 build EAS preview vert.
- **Risque** : ÉLEVÉ — multiples deps natives. **Gate humain** recommandé avant.
- **Effort** : 1 journée + smoke device.
- **Dépendance** : F1 + S1 d'abord (pour partir d'un state propre).

#### UI-4 → UI-9 — Refacto fichiers volumineux non traités
Ordre proposé (impact UX × volume) :

| Cycle | Fichier(s) | Cible | Stratégie |
|-------|-----------|-------|-----------|
| UI-4 | `CalendarScreen.tsx` (1 217) | < 800 | Extract `CalendarScreen.styles.ts` + `components/calendar/{MonthGrid,EventList}.tsx` |
| UI-5 | `HealthDashboardScreen.tsx` (1 089) | < 800 | Extract styles + `components/health/{Charts,DailyEntryCard,RiskSummary}.tsx` |
| UI-6 | `AddAppointmentScreen.tsx` (906) + `AddTaskModal.tsx` (890) | < 700 chacun | Extract form sections + `useAppointmentForm` hook |
| UI-7 | `ProfileScreen.tsx` (887) | < 700 | Extract `components/profile/{InfoSection,SettingsSection,DataSection}.tsx` |
| UI-8 | `RemindersTab.tsx` (789) + `ReminderEditModal.tsx` (716) | < 600 | Extract sub-components + factoriser logique avec `MyDaySection` |
| UI-9 | `OnboardingScreen.tsx` (1 203) JSX, `WeightTrackerScreen.tsx` JSX | < 800 | Sous-composants par étape (Onboarding) / par onglet (Weight) |

**Méthode systématique par cycle** :
1. Audit pré (lire fichier, identifier blocs JSX > 100 lignes & states & effects).
2. Extract styles → `*.styles.ts`.
3. Extract sub-composants pure (props in, JSX out).
4. Extract hooks custom si > 50 lignes de logique.
5. `verify` vert + commit atomique + push + CI verte.
6. Audit post (wc -l, lints, smoke logique).

#### R1 — Stratégie B : enum `UserMode` (isTTC/isGuest)
- **Why** : 2 TODOs `Strategy B` croisés (`OnboardingScreen` + `types/index.ts`) + impact architecture (model SSOT).
- **How** : créer `enum UserMode { GUEST, TTC, PREGNANT, POSTPARTUM }` ; migrer code + persistance AsyncStorage avec migration 1.x → 2.x.
- **Risque** : moyen-élevé (migration data utilisateur). **Gate humain produit**.
- **Effort** : 0.5 - 1 journée.

#### D1 — Audit dépendances dépcheck-flagged
- **Why** : 13 deps marquées non utilisées (peut-être faux positifs).
- **How** : pour chaque dep dans la liste, vérifier (1) usage transitif requis, (2) trace dans `node_modules` consumer. Documenter dans `app/docs/DEPS_RATIONALE.md` ou supprimer.
- **Effort** : 1-2h.

### Étage 3 — gates humains (inchangés, à programmer)

| Gate | Action | Bloque |
|------|--------|--------|
| **R1-sec** | Revue sécurité `firestore.rules` + `AuthContext.tsx` + tests `firestoreRulesParity` / `AuthContext.{gdpr,login}` (mega-commit `6ec5481`) | Publication store |
| **V1-smoke** | Smoke RTL `fr` puis `ar`/`tn` : Home, Calendar, Stats, PDF, Onboarding, HealthDashboard | Publication store |

---

## 4. Orchestration (boucle d'exécution)

### Phase A — quick wins (1 PR)
```
F1 (vector-icons)  →  S1 (npm audit fix)  →  C1 (Node 24 GH actions)
                              │
                              ▼
                       npm run verify + CI vert
                              │
                              ▼
                     1 commit "chore(deps,ci): F1 + S1 + C1"
```
**Critère sortie** : `npm audit` montre `critical:0`, CI verte sur Node 24, `@expo/vector-icons` dans `package.json`.

### Phase B — refacto UI (6 cycles indépendants, 1 commit chacun)
```
UI-4 Calendar  →  UI-5 Health  →  UI-6 Forms  →  UI-7 Profile  →  UI-8 Reminders  →  UI-9 (Onb+Weight JSX)
```
**Règle** : 1 cycle = audit pré + extract + verify + commit + push + CI verte + audit post. **Pas d'enchaînement sans CI verte.**

### Phase C — bump SDK (gate humain avant)
```
[Gate humain U1]  →  upgrade Expo 55 / RN 0.85 / Sentry 8  →  verify  →  EAS preview  →  smoke device
```

### Phase D — gates humains (parallèle B/C)
```
R1-sec  ┐
V1-smoke┴─→ docs/gates/GATE_*.md  →  publication store
```

---

## 5. Métriques de sortie attendues (après plan exécuté)

| Métrique | Avant | Cible |
|---------:|-------|-------|
| Vuln npm critical | 2 | **0** |
| Vuln npm high | 5 | ≤ 1 (transitif documenté) |
| Fichiers > 800 lignes (`src/**/*.tsx`) | 7 | ≤ 2 (Onboarding/Calendar acceptables si ratio JSX/logique justifié) |
| Deps `package.json` cohérentes avec usage | NON (vector-icons absent) | **OUI** |
| GH Actions Node | 20 (deprecated) | 24 (ou env temporaire) |
| Expo SDK | 54 (n-1 major) | 55 (current) |
| Gates humains résolus | 0 / 2 | **2 / 2** |
| CI verts consécutifs sur main | ✅ | ✅ |

---

## 6. Risques résiduels acceptés (post-plan)

- Tests `Platform.OS` cible web uniquement (mapping Jest). À combler par 1 batch de snapshot tests RN si on veut couvrir iOS/Android. **Sévérité basse**.
- 5 TODO produits qui survivront tant que la migration `Strategy B` (R1 ci-dessus) n'est pas validée. **Sévérité basse**.
- Vulns transitives non patchables sans bump major firebase-admin / expo CLI. **Documentées dans SECURITY_NOTES.md**.

---

## 7. Conclusion (réponse directe à la question)

**Est-ce tout bon ?** → **Non.** Le code compile, les tests passent et la CI est verte, mais 5 angles morts sérieux subsistent (déclaré dans §0). Aucun n'est un crash bloquant *aujourd'hui*, mais 3 (F1, C1, S1) sont **triviaux à corriger maintenant** et leur absence affaiblit la confiance "production-ready" annoncée précédemment.

**Plan d'action immédiat** : Phase A (F1+S1+C1) en 1 commit ; puis Phase B en 6 cycles atomiques ; puis Phase C sous gate humain.

*— Rapport produit après audit machine + raisonnement croisé avec `AUDIT_DEEP_FINAL.md`. Aucune auto-approbation des gates humains.*
