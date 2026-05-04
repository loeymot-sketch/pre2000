# C8 — Audit Markdown XSS-equivalent (F11)

Date: 2026-05-04
Scope: usage de `react-native-markdown-display` v7.0.2

## Surface attaquable identifiée

| Composant | Source du contenu | Sink | Risque résiduel |
|---|---|---|---|
| `ArticleDetailScreen` | Firestore `articles` / `articlesAntigravity` (write:false, lecture auth required) | `<Markdown>` + `onLinkPress` → `Linking.openURL(url)` | **Avant fix** : URL dispatchée sans whitelist → vector pour `file:`, `data:`, `javascript:`, `intent://` si CMS compromis |

## Sources non-Markdown (pour mémoire)

- `HomeScreen`, `HeroCard`, `WeekInfoSection` — chaînes contenant le mot "markdown" en JSDoc/commentaires uniquement, **n'utilisent pas** le composant `<Markdown>` (vérifié via `<Markdown>` greppé : 1 seul match dans `ArticleDetailScreen`).
- `Linking.openURL` direct ailleurs (ChatbotScreen, HealthDashboardScreen, EmergencyContactsSection, supportService, PrivacyPolicyScreen) : tous emploient des URI **construites côté code** (`tel:${number}`, `mailto:...`) avec données issues d'`EMERGENCY_NUMBERS` (whitelist enum) ou de constantes hardcoded → **pas de surface utilisateur libre**.

## Modèle de menace

1. **Contenu CMS interne** : nous contrôlons le contenu via Firestore (rules `write: if false`). Risque dépend du compromise du compte admin Firebase.
2. **Defense-in-depth** : si une rule s'érode ou un compte admin se fait phish, un attaquant pourrait pousser un article Markdown contenant `[Click](javascript:exfiltrateToken())` ou `[icon](file:///etc/passwd)` → impact native.
3. **Schemes natifs dangereux** :
   - `javascript:` — si webview ou contexte JS bridge (dans RN, peu probable mais non garanti future-proof)
   - `file://` — accès filesystem app (lecture privée possible sur iOS via Files app)
   - `data:` — peut déclencher download / preview avec contenu malicieux
   - `intent://` (Android) — peut lancer arbitrary apps avec params
   - `content://` (Android) — accès content provider
   - Custom schemes (`whatsapp://`, etc.) — fuite contextuelle

## Fix appliqué

### `app/src/utils/safeOpenUrl.ts` (nouveau)
Whitelist conservatrice : `http`, `https`, `mailto`, `tel`. Tout le reste rejeté.

```ts
export const isSafeUrl = (raw: string | null | undefined): boolean => { ... }
```

### `app/src/screens/ArticleDetailScreen.tsx`
`onLinkPress` validé via `isSafeUrl` avant dispatch :

```tsx
onLinkPress={(url) => {
    if (!isSafeUrl(url)) {
        log.warn('Blocked Markdown link with non-whitelisted scheme:', url);
        return false;
    }
    Linking.openURL(url).catch(...);
    return true;
}}
```

### `app/src/utils/__tests__/safeOpenUrl.test.ts` (nouveau)
22 tests couvrant : http/https/mailto/tel acceptés, javascript/data/file/intent/content/ftp/custom rejetés, malformed input rejeté, null/undefined/non-string rejetés.

## Résultat

- Surface XSS-equivalent (Markdown link) : **bloquée**
- Test bench verrouille la whitelist contre régression future
- CMS interne reste fonctionnel (toutes les URLs http(s) légitimes passent)
- Performance impact : nul (regex simple, pas d'I/O)

## Recommandations futures (non bloquantes v1.0)

1. Si un nouveau scheme légitime apparaît (ex: `sms:` pour rappels), l'ajouter explicitement dans `ALLOWED_SCHEMES`.
2. Si une `WebView` est introduite (chatbot ou autre), AUDITER `originWhitelist`, `injectedJavaScript`, `onShouldStartLoadWithRequest`. Aucune `WebView` actuellement dans le code.
3. Garder l'invariant : **toute** nouvelle source de contenu user-libre doit passer par une util de sanitisation centralisée (idéalement étendre `safeOpenUrl.ts` ou créer un module sœur).

## Status F11

**RÉSOLU** par cycle C8 (commit suivant).
