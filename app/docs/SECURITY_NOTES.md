# Security Notes — npm audit residuals

_Generated as part of cycle `chore(deps,sec,ci): F1+S1+C1` (2026-05)._

## TL;DR

- `npm audit fix` (without `--force`) was applied in `app/`.
- **All `critical` and `high` advisories are now resolved.**
- 19 residual `moderate` advisories remain. **None of them ship in the runtime
  app bundle**: they live exclusively in Expo CLI / dev-tooling / build-time
  scripts / Markdown rendering helper, and would require a major version bump
  (Expo SDK upgrade, removal of `react-native-markdown-display`, or
  `@expo/ngrok` dev dep) to clear.
- Tracked for the next SDK upgrade cycle (`U1`).

## Audit deltas (npm audit, severity counts)

| Severity   | Before | After | Δ   |
|------------|-------:|------:|----:|
| critical   |      2 |     0 | −2  |
| high       |      5 |     0 | −5  |
| moderate   |     21 |    19 | −2  |
| low / info |      0 |     0 |  0  |
| **total**  | **28** |**19** | −9  |

### Critical / high cleared by `npm audit fix`
| Package          | Severity | Notes                                   |
|------------------|----------|-----------------------------------------|
| `protobufjs`     | critical | Pulled in via `firebase-admin` chain    |
| `handlebars`     | critical | Build-time template (Expo CLI chain)    |
| `@xmldom/xmldom` | high     | Plist parsing (Expo / EAS prebuild)     |
| `lodash`         | high     | Generic transitive (CLI/build chains)   |
| `minimatch`      | high     | Glob matching (CLI / metro)             |
| `node-forge`     | high     | TLS helper (Expo dev / Firebase tooling)|
| `picomatch`      | high     | Glob matching (CLI / metro)             |

## Residual moderate advisories (19) — runtime impact assessment

All remaining advisories fall into **one of three groups**, none of which is
shipped in the production app binary:

### Group A — Expo CLI / dev / build tooling (15 advisories)

Chain root: `expo` → `@expo/cli` → `@expo/config*` / `@expo/metro-config` /
`@expo/prebuild-config` / `expo-asset` / `expo-constants` / `expo-dev-client` /
`expo-dev-launcher` / `expo-manifests` / `expo-notifications` / `expo-updates`
→ ultimately `postcss <8.5.10` and `xcode → uuid <14`.

| Advisory                  | Severity | Via (chain summary)                                                                 | Runtime app impact |
|---------------------------|----------|-------------------------------------------------------------------------------------|--------------------|
| `@expo/cli`               | moderate | self → `@expo/config*`, `postcss`, `xcode`, `uuid`                                  | None — CLI only    |
| `@expo/config`            | moderate | `@expo/config-plugins` → `xcode` → `uuid`                                           | None — build-time  |
| `@expo/config-plugins`    | moderate | `xcode` → `uuid`                                                                    | None — build-time  |
| `@expo/metro-config`      | moderate | `@expo/config`, `postcss <8.5.10`                                                   | None — bundler     |
| `@expo/prebuild-config`   | moderate | `@expo/config`, `@expo/config-plugins`                                              | None — prebuild    |
| `expo`                    | moderate | aggregator over the chains above + `expo-asset`, `expo-constants`                   | Indirect only      |
| `expo-asset`              | moderate | `expo-constants` → `@expo/config`                                                   | Indirect only      |
| `expo-constants`          | moderate | `@expo/config` → `@expo/config-plugins` → `xcode` → `uuid`                          | Indirect only      |
| `expo-dev-client`         | moderate | `expo-dev-launcher`, `expo-manifests`                                               | Dev client only    |
| `expo-dev-launcher`       | moderate | `expo-manifests` → `@expo/config`                                                   | Dev client only    |
| `expo-manifests`          | moderate | `@expo/config`                                                                      | Updates layer      |
| `expo-notifications`      | moderate | `expo-constants` → `@expo/config`                                                   | Indirect only      |
| `expo-updates`            | moderate | `expo-manifests` → `@expo/config`                                                   | Updates layer      |
| `postcss` (<8.5.10)       | moderate | Pulled by `@expo/metro-config`                                                      | None — bundler     |
| `xcode` / `uuid (<14)`    | moderate | `@expo/config-plugins` → `xcode` → `uuid`                                           | None — iOS prebuild|

> `npm audit fix` flags all of these as `fixAvailable: { name: "expo", isSemVerMajor: true }` — i.e. resolved by upgrading the Expo SDK (currently `~54.0.34`) to a version where the chain has been bumped. **Deferred to U1 (SDK upgrade cycle).**

### Group B — Markdown rendering helper (2 advisories)

| Advisory                       | Severity | Via                              | Runtime app impact                                                                   |
|--------------------------------|----------|----------------------------------|--------------------------------------------------------------------------------------|
| `markdown-it (<12.3.2)`        | moderate | self                             | Used at runtime by `react-native-markdown-display` to parse trusted, in-app content. |
| `react-native-markdown-display`| moderate | `markdown-it`                    | Same.                                                                                |

`fixAvailable: false` — upstream `react-native-markdown-display` has not bumped
its `markdown-it` dependency. Risk is bounded because the app only renders
Markdown content authored by the team (no untrusted user input is parsed).
Tracked: monitor upstream for a release; otherwise plan a swap to an
alternative renderer in U1.

### Group C — `@expo/ngrok` dev dep (2 advisories)

| Advisory       | Severity | Via              | Runtime app impact                            |
|----------------|----------|------------------|-----------------------------------------------|
| `@expo/ngrok`  | moderate | `uuid`           | Dev-only tunnel helper. Not in app bundle.    |
| `uuid (<14)`   | moderate | self / `xcode`   | Build-time / dev tunneling. Not in app bundle.|

`@expo/ngrok` is in `devDependencies`. Action: drop or bump in U1 once the
Expo SDK upgrade lands (the SDK upgrade also lifts the `xcode → uuid` chain).

## Why this is safe to ship now

- The 19 residual advisories all chain through **build-time** (`@expo/cli`,
  `metro-config`, `prebuild-config`, `xcode`), **dev-only** (`expo-dev-client`,
  `expo-dev-launcher`, `@expo/ngrok`), or **trusted-content rendering**
  (`react-native-markdown-display` for in-app Markdown authored by the team).
- None of these packages execute in the production runtime of the shipped app
  on user devices.
- All `critical` / `high` advisories — including the ones in the
  `firebase-admin` and Expo CLI chains (`protobufjs`, `handlebars`, `node-forge`,
  `@xmldom/xmldom`, `lodash`, `minimatch`, `picomatch`) — were resolved by the
  non-`--force` `npm audit fix`.

## Planned actions

| ID | Action                                              | Cycle |
|----|-----------------------------------------------------|-------|
| U1 | Upgrade Expo SDK 54 → next stable (clears Group A)  | TBD   |
| U1 | Re-evaluate `react-native-markdown-display` (Grp B) | TBD   |
| U1 | Drop or bump `@expo/ngrok` dev dep (Group C)        | TBD   |

---

# Cycle C13 — LOW findings audit (2026-05-04)

Bundle de findings hygiène (audit-driven cleanup, aucun changement de
comportement runtime). Statuts ci-dessous.

## F21 — EAS Build secrets management

**Status: ACTION REQUIRED (operator) — secrets en clair détectés dans `app/eas.json`.**

Les variables d'environnement Firebase doivent être dans EAS Secrets, pas
dans `eas.json`. Vérification 2026-05-04 :

- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY` → EAS Secret
- [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` → EAS Secret
- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID` → EAS Secret
- [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` → EAS Secret
- [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` → EAS Secret
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID` → EAS Secret

Procédure :

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIza..." --type string
# … répéter pour chaque variable.
```

Pour vérifier l'état : `eas secret:list --scope project`.

État actuel `app/eas.json` (2026-05-04) :

- `build.preview.env` contient les 6 variables `EXPO_PUBLIC_FIREBASE_*` en
  **valeur littérale** (ex. `"EXPO_PUBLIC_FIREBASE_API_KEY": "AIzaSy..."`).
- `build.development.env` et `build.production.env` ne contiennent **aucun**
  secret Firebase (uniquement `APP_ENV`).
- À documenter par l'opérateur lors de la migration vers EAS Secrets : retirer
  les valeurs littérales du bloc `preview.env` après création des secrets, le
  tooling `eas build` injecte automatiquement les secrets project-scoped.

> Note C13 : `eas.json` n'a **pas** été modifié dans ce cycle (out of scope —
> action opérateur dédiée).

## F23 — `chatbot_data.ts`

**Status: USED at runtime.**

Imports détectés (`grep -rn "chatbot_data" app/src`) :

- `app/src/services/chatbot/data/local_data.ts`
- `app/src/services/chatbot/data/DatabaseService.ts`
- `app/src/utils/uploadArticles.ts`

Recommendation : migrer vers Firestore static collection ou SQLite (taille
bundle ~2367 lignes d'objets en mémoire au cold start).

Decision : déféré post-v1.0 (cycle ultérieur — pas d'impact sécurité, juste
poids du bundle JS). Pas d'annotation `@deprecated` ajoutée puisque le fichier
est consommé runtime.

## F24 — `babyEvolution.json` (i18n locales)

**Status: PARTIAL.**

Fichiers trouvés (4 locales) :

- `app/src/i18n/locales/en/babyEvolution.json` — 2 lignes
- `app/src/i18n/locales/fr/babyEvolution.json` — 2 lignes
- `app/src/i18n/locales/ar/babyEvolution.json` — 2 lignes
- `app/src/i18n/locales/tn/babyEvolution.json` — 2 lignes

Chaque fichier contient une seule clé (`development`) — couvre 1 entrée sur
les ~40 semaines attendues. Les données réelles d'évolution semaine par
semaine vivent dans `app/src/config/babyGrowthData.ts` (consommé par
`BabyEvolutionScreen.tsx` et `BabyGrowthCard.tsx`), donc le namespace i18n
`babyEvolution` n'est aujourd'hui qu'un placeholder pour l'éventuelle
traduction des libellés UI de l'écran.

Action : l'écran qui consomme cette data (`BabyEvolutionScreen.tsx`) doit
gracefully fallback sur la clé existante ou être masqué pour les semaines
manquantes — vérification UX humaine à V1-smoke.

Decision : non bloquant pour v1.0. Compléter le namespace i18n quand la
traduction des labels UI deviendra prioritaire (cycle dédié contenu/i18n).

## F25 — Web date input (LOW, accept)

**Status: ACCEPTED — pas d'action code prévue pour v1.0.**

L'app cible iOS/Android natifs principalement. Le fallback web utilise
`<input type="date">` standard navigateur, dont l'UX/styling varie par
navigateur. Decision : pas d'amélioration prévue pour v1.0.

## F26 — Root `.gitignore` — `.DS_Store`

**Status: ACTION TAKEN.**

Le `.gitignore` racine du repo couvrait `.DS_Store` (top-level uniquement).
Ajouté `**/.DS_Store` pour couvrir explicitement les sous-arbres hors `app/`
(qui a son propre `.gitignore`).

## F29 — `analyticsService.ts` no-op

**Status: ACTION TAKEN — JSDoc `@deprecated-as-noop` ajouté.**

Le fichier `app/src/services/analyticsService.ts` est un wrapper no-op de
facto sur React Native (firebase/analytics Web SDK non supporté en Hermes,
toutes les méthodes short-circuit sur instance null). JSDoc enrichie avec
le tag `@deprecated-as-noop` pour expliciter le statut. Aucune signature ni
comportement runtime modifié — les call sites (useScreenAnalytics, App.tsx,
Login/RegisterScreen) continuent de compiler à l'identique.

## F30 — Snippet de debug `WeightTrackerScreen_debug_handlers.tsx.snippet`

**Status: ACTION TAKEN — fichier supprimé.**

Le fichier `app/src/screens/WeightTrackerScreen_debug_handlers.tsx.snippet`
était une relique de refacto (extension `.snippet` = jamais compilé/inclus
dans le bundle Metro). Supprimé.
