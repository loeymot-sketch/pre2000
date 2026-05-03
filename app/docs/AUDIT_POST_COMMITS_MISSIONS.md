# Audit post-boucle (push fait) + plan de correction — 2026-05-03 (rev 2)

État après les boucles **C1 / C2 / M2 / C3 / H1 / I1** + le `git push origin main`
(commits jusqu'à `cd61d0b`).

---

## 1. Verdict global

| Verdict | Détail |
|---------|--------|
| **Code mergé `main`** | OUI — push réussi (`4cdc2f2..cd61d0b`). |
| **CI distante prouve quoi ?** | **RIEN** — voir bug bloquant **B1** ci-dessous. |
| **Tests / typage / SSOT** | OK local — `npm run verify` vert, **294 / 294** Jest. |
| **Action immédiate requise** | OUI — corriger B1 avant tout autre cycle. |

---

## 2. Gates machine (rappel)

| Gate | Résultat |
|------|----------|
| `lint:colors` (hex + `rgba(` + needles bug) | OK |
| `tsc --noEmit` | OK |
| Jest | **24 suites / 294 tests** |
| `git status` | propre |
| `main` poussé sur `origin` | OK (`cd61d0b`) |

Reste hors du thème **couleurs/RTL** : aucun `#hex` ni `rgba(` parasite ; aucun `getShadowStyle('rgba…'` ni `'#…'` (la dette **R4** est bien refermée).

---

## 3. Bugs / risques détectés en post-push

### 🔴 B1 — Workflows GitHub Actions au mauvais endroit (BLOQUANT)

**Symptôme :** `gh api repos/.../actions/workflows` renvoie liste vide ; `gh workflow list` vide.

**Cause :** GitHub ne lit les workflows **qu'à la racine** du dépôt :

```
.github/workflows/*.yml        ✅ détecté
app/.github/workflows/*.yml    ❌ ignoré
```

Les workflows actuels sont sous `app/.github/workflows/{ci,eas-build}.yml` → **aucun job ne s'exécute** depuis le push. La promesse "verify dans la CI" est cassée côté distant. Le code passe localement mais aucune preuve sur le repo.

**Sévérité :** haute (le filet de sécurité CI n'existe pas tant que ce n'est pas corrigé).

**Fix proposé (cycle B1) :**
1. `git mv app/.github .github` (déplacer le dossier).
2. Ajuster les `working-directory: ./app` (déjà bons).
3. Push → vérifier `gh run list` revient avec des runs.

### 🟠 B2 — `findFirstError` peut perdre l'Error en `error: Error`

**Constat code (`logger.ts:80`) :**
```ts
const findFirstError = (args: any[]): Error | undefined => {
    for (const a of args) if (a instanceof Error) return a;
    return undefined;
};
```
Combiné à H1 récent : OK pour `info/warn/debug`, **mais** sous Jest les tests qui assertent un `console.error` continueront à voir l'erreur (souhaité). Pas de régression. **Faux positif initial — RAS.**

### 🟡 B3 — Workflow EAS conditionne sur `release/*` uniquement

**Constat (`eas-build.yml`) :** `branches: [release/*]`. Donc même corrigé (B1), `eas-build` ne tournera pas sur `main`. C'est un **choix produit** valide (build EAS = release explicite), mais à documenter.

**Sévérité :** info — pas de bug.

### 🟡 B4 — Ouverture massive de fichiers communs au commit `feat(app)` (117 fichiers)

Déjà signalé. **Pas un bug**, mais le `firestore.rules` et `AuthContext.tsx` voyagent dans le même commit que des écrans UI. Une **PR security skim** humaine est toujours dûe.

### 🟢 B5 — `react-native-web` mappé pour Jest

`jest.config.js` : `'^react-native$': 'react-native-web'`. Cela **fonctionne** (294 tests verts), mais ça veut dire que toute la branche **iOS/Android** de `Platform.OS` n'est testée par personne (les conditionnels `Platform.OS === 'android' | 'ios' | 'web'` ne sont effectivement testés qu'en **web**). Notamment `getShadowStyle` et `buildShadow` : la branche corrigée (web) est exercée, les branches iOS/Android ne le sont pas. **Acceptable** (pas un bug), mais à connaître.

### 🟡 B6 — Tests log noise restant

Le bruit qu'on voit dans `verify` (`Object.<anonymous> (src/services/__tests__/dailyChecklistService.test.ts:7:1)`) provient d'un **import side-effect d'`expo-modules-core`** au démarrage (chargement de Sentry / setUpJsLogger). Ce n'est pas du `logger.info` (qui est silencé), c'est un `console.log` natif d'Expo. Mocker `expo-modules-core` complet est risqué ; une suite plus fine consisterait à mocker `expo-updates` + `Updates` dans Jest.

**Sévérité :** basse (cosmétique).

### 🟡 B7 — Grosseur des écrans (HomeScreen 1756 lignes, OnboardingScreen 1830 lignes)

Dette pré-existante. Hors scope SSOT couleurs.

---

## 4. Cohérence repo

```
HEAD = cd61d0b   docs: mark I1 done in post-commit audit missions
       195aeea   chore(ci): install ripgrep on Ubuntu when missing before verify
       3b8b67e   fix(theme): web buildShadow uses hexToRgba; extract hexToRgba module
       4a20d73   chore: stop tracking root .DS_Store, add repo .gitignore
       6ec5481   feat(app): screens, services, i18n, assets, Firestore rules
       bc73b85   test: streak, Firestore rules parity, health merge, guest migrate, RDV TZ
       14ce66f   test(context): Auth GDPR/login tests, emergency contacts, Sentry mock
       7bd10aa   feat(common): RtlAwareChevron, Badge, Skeleton, EmptyState, helpers
       a34dc88   docs: orchestration loop, hex/RTL plan, changelog, architecture
       97cf11d   feat(theme): SSOT palette, pdf shadows, lint:colors, hexToRgba guard
       703443a   chore(ci): run npm run verify on PR and before EAS build
```

11 commits propres au-dessus du baseline. **Aucun fichier non commité**, aucun `.DS_Store` suivi.

---

## 5. Plan de correction orchestré (ordre exécutable)

| # | ID | Type | Action | Gate |
|---|----|------|--------|------|
| 1 | **B1** | 🔴 critique | `git mv app/.github .github` + commit + push | `gh run list` non vide |
| 2 | **G1** | gate humain | Vérifier que le 1er run CI passe vert sur `cd61d0b+B1` | run vert |
| 3 | **B6** | 🟡 confort | Mocker `expo-updates` dans Jest pour silence total | `verify` toujours vert |
| 4 | **V1** | gate humain | Smoke visuel Home / Calendrier / Stats / PDF en `fr` puis `ar`/`tn` | aucun écart bloquant |
| 5 | **R1** | 🟠 process | PR review humaine **rules + auth** (commit `6ec5481`) | sign-off humain |
| 6 | **B7** | 🟡 dette | Refacto progressif `HomeScreen` / `OnboardingScreen` en sous-composants | `verify` + diff < 30 fichiers / cycle |

### Hors scope ce cycle (déjà documenté dans `ORCHESTRATION_LOOP.md` §4)
- Phase A — paiement (RevenueCat / Stripe) : prérequis humains.
- Phase B — iCloud / CalDAV : prérequis humains.
- Phase C — fournisseur externe : nom + contrat manquants.

---

## 6. Décision

1. ~~Exécuter **B1 maintenant**~~ **fait** (commit `2e5133e`, push effectué).
2. ~~Vérifier la **première exécution CI** (G1)~~ **fait** — run **`25286622383` ✅ verte** en `1m25s` (`Validate Code Quality` : `Verify (theme SSOT + typecheck + unit tests)`).
3. Annotation GH : `actions/checkout@v4` et `actions/setup-node@v4` tournent sur Node 20 (deprecated juin 2026). Non bloquant — futur upgrade `@v5` quand dispo.
4. Optionnel : enchaîner **B6** (confort tests) si tu valides.
5. **STOP autonome** sur **R1** (relecture sécurité humaine) et **V1** (smoke visuel humain) — pas de gate auto.
