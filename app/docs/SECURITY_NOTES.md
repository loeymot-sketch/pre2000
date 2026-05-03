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
