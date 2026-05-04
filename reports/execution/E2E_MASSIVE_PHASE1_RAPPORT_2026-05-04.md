# Rapport Phase 1 — Tests massifs (E2E + unitaires)

**Date :** 2026-05-04  
**Portée :** constats et preuves uniquement — **aucune correction appliquée dans ce document.**  
**Objectif :** alimenter l’assemblage des rapports, puis les plans de correction, audit et re-tests.

---

## 1. Synthèse exécutive

| Volet | Verdict |
|--------|---------|
| **Tests Jest (`npm run verify`)** | **OK** — 26 suites, 347 tests, `tsc` OK, lint couleurs OK |
| **E2E Web (Playwright MCP, `localhost:8081`)** | **Partiel** — navigation principale OK ; données distantes et API natives web **cassent ou bruitent** la console ; plusieurs parcours **non automatisables** sans sélecteurs dédiés |
| **Blocage produit majeur (web, env incomplet)** | Contenu Firestore (articles, compléments, tips, messages bébé) → **permissions insuffisantes** + UI « Error loading data » / « Oops » |
| **Blocage plateforme (web)** | **expo-notifications** : méthodes absentes (`getAllScheduledNotificationsAsync`, etc.) → erreurs dans `RemindersScheduler` |
| **Deep linking web** | URLs du type `/Home/WeekRecommendations`, `/Profile`, etc. **ne stabilisent pas** l’écran attendu (retombée fréquente sur `HomeMain`) |

---

## 2. Environnement de test

- **App :** Expo web, Metro sur **8081** (processus `node` en écoute au moment des tests).
- **Session :** profil **guest** déjà hydraté dans le navigateur Playwright (parcours antérieur langue → invité → onboarding).
- **Variables :** contexte type **sans secrets Firebase complets** (ou `EXPO_NO_DOTENV` / placeholders) — **impact direct** sur Firestore et sur la représentativité des tests « données réelles ».
- **Session Playwright longue :** la collecte `browser_console_messages` avec `all: true` inclut des **messages historiques** (ex. anciennes erreurs `getReactNativePersistence` si rechargements avant correctif bundle). À filtrer côté processus d’assemblage si besoin de « dernier run uniquement ».

---

## 3. Tests automatisés unitaires / statiques

**Commande :** `cd app && npm run verify`

- `lint:colors` (scripts) : **OK** (fallback `grep` si `rg` absent sur la machine).
- `npx tsc --noEmit` : **OK**.
- Jest : **26** fichiers de tests, **347** tests — **tous verts**.

**Limite :** ces tests **ne couvrent pas** le rendu web réel, ni les intégrations Expo Notifications / Firestore rules en navigateur.

---

## 4. E2E Playwright — parcours exécutés (preuve URL)

### 4.1 Onglets principaux (noms complets avec emojis)

Séquence validée : chaque clic mène à l’URL attendue.

- `🏠 🏠 Home` → `http://localhost:8081/HomeMain`
- `📅 📅 Calendar` → `http://localhost:8081/CalendarMain`
- `🔔 🔔 Reminders` → `http://localhost:8081/RemindersMain/RemindersTab`
- `📚 📚 Resources` → `http://localhost:8081/Ressources/ResourcesMain/Articles`
- `💬 💬 Chatbot` → `http://localhost:8081/Chatbot`

### 4.2 Calendrier

- Bouton **Today** : OK (reste sur `CalendarMain`).
- **+ Add Appointment** (sélection `getByText(/Add Appointment/i)`) : OK →  
  `http://localhost:8081/AddAppointment?selectedDate=...`

### 4.3 Rappels

- Sous-onglet **Tasks** (`getByRole('tab', { name: 'Tasks' }).first()`) : OK → `RemindersMain/TasksTab`.
- Lien **View Statistics** : OK → `http://localhost:8081/Statistics` (titre **My Statistics**).

### 4.4 Ressources

- Onglet **Supplements** : URL du type `.../ResourcesMain/Compl%C3%A9ments` (compléments) ; contenu en **erreur** côté données (voir §5).

### 4.5 Anti-pattern E2E découvert (régression outil, pas produit)

- `getByRole('tab', { name: /Calendar/ })` a déjà conduit vers le **mauvais** onglet (ex. `RemindersMain`) — **à bannir** ; utiliser les **libellés complets** des tabs.

### 4.6 `testID` home (quick links)

Après `goto HomeMain`, **`getByTestId`** pour :

- `home_quick_appointments`
- `home_quick_add_task`
- `home_quick_add_appointment`
- `home_quick_search`

→ **0 élément** (`NO_TESTID` dans la trace Playwright).

**Problématique :** sur RN Web, les `testID` ne remontent pas forcément comme attribut **`data-testid`** attendu par Playwright — **E2E web non fiable** sans stratégie dédiée (`dataSet`, `nativeID`, rôle + nom accessible, etc.).

### 4.7 Deep links `goto` directs

Après navigation vers :

- `/Home/WeekRecommendations`
- `/Home/HealthDashboard`
- `/Home/WeightTracker`
- `/Home/ForbiddenFoods`
- `/Home/LanguageSelect`

→ URL observée **`HomeMain`** (pas d’écran cible stable).

**Problématique :** linking incomplet ou non aligné sur les chemins web utilisés pour les tests / partage URL.

### 4.8 Profil (accessibilité)

- `getByLabel('User profile')` : **timeout** (pas d’élément joignable ainsi sur web dans ce run).

### 4.9 Chatbot

- Aucun `textarea` / `input[type="text"]` classique détecté après ouverture onglet Chatbot — **saisie non scriptable** avec sélecteurs HTML standards.

### 4.10 UI / arbre d’accessibilité

- Sur certains états, **plusieurs « stacks »** (ex. calendrier + ressources) apparaissent dans le **même** snapshot YAML — suspicion de **superposition / couches non démontées** ou limitation snapshot ; **à investiguer** en Phase correction (layout web, `detachInactiveScreens`, etc.).

---

## 5. Problématiques regroupées (backlog correction)

### P1 — Données & Firebase (environnement + rules)

- `FirebaseError: Missing or insufficient permissions` sur **tipsService**, **babyMessageService**, et effets du type **useCurrentWeek** (message console associé).
- UI : région **« Error loading data »** sur l’accueil ; **« Oops! »** + **Retry** sur Articles / Compléments.
- **Cause probable combinée :** règles Firestore / auth anonyme / **variables `EXPO_PUBLIC_*` absentes ou invalides** en local.

### P2 — API natives sur Web (Expo)

- `RemindersScheduler` : `UnavailabilityError` sur **`Notifications.getAllScheduledNotificationsAsync`** (non disponible sur web).
- Avertissement : **push token listener** sans effet sur web.
- **`expo-updates`** : `CodedError` — usage de `reloadAsync` en **dev** / mauvaise configuration « production app » (bruit ou erreur selon niveau de log).

### P3 — Internationalisation / RTL (web)

- **Require cycle** : `src/i18n/index.ts` ↔ `src/i18n/rtl.ts`.
- **RTL** : échec `registerRTLListener` — `Cannot read properties of undefined (reading 'isInitialized')`.

### P4 — Performance / animations (web)

- `Animated: useNativeDriver is not supported` — repli JS (warning).

### P5 — Styles dépréciés (web)

- Warnings `shadow*` → migration vers **`boxShadow`**.

### P6 — React Native Firebase (interop)

- Warning **API namespaced dépréciée** — migration vers API modulaire (`getApps()` etc.).

### P7 — Sécurité / formulaires (DOM)

- Avertissement navigateur : champ **mot de passe** hors `<form>` (onboarding / création compte).

### P8 — E2E & observabilité

- Tabs : matchers **trop larges** (`/Calendar/`) dangereux.
- **`testID`** home invisibles à Playwright web.
- Profil / Chatbot : **pas de hooks** stables pour automation.
- Deep links **non utilisables** pour tests directs sur plusieurs écrans.

### P9 — Historique bundle / cache Metro (à documenter pour l’équipe)

- Erreurs **`getReactNativePersistence is not a function`** peuvent encore apparaître dans une **session navigateur longue** si d’anciennes navigations / bundles sont mémorisées — **à distinguer** d’un build courant après correctif + `expo start --clear`.

---

## 6. Agrégat console (session Playwright, niveau `error`)

Catégories observées (doublons possibles sur la durée de session) :

1. **Firestore permissions** — tips / baby messages.
2. **RemindersScheduler** — `getAllScheduledNotificationsAsync` indisponible sur web.
3. **`getReactNativePersistence`** — traces historiques possibles (voir §4.9 Phase précédente / cache).
4. **expo-updates `reloadAsync`** — erreur répétée en dev.

*(Pour une extraction brute, réexécuter `browser_console_messages` sur une session fraîche après `page.close()` / nouvel onglet.)*

---

## 7. Livrables pour la Phase « assemblage »

| Fichier | Rôle |
|---------|------|
| `reports/execution/E2E_MASSIVE_PHASE1_RAPPORT_2026-05-04.md` | **Rapport humain** (ce document) |
| `reports/execution/E2E_MASSIVE_PHASE1_TRACE.json` | **Trace machine** (JSON : parcours + résultats `testID`) |

---

## 8. Suite recommandée (hors périmètre Phase 1)

1. Regrouper ce rapport avec d’autres sources (audits manuels, devices iOS/Android, logs EAS).
2. Prioriser : **P2 web notifications** et **P1 données** (séparer « env » vs « bug rules »).
3. Définir **stratégie E2E** : `data-testid` web explicite, ou `@expo/e2e` / Detox mobile en parallèle.
4. Re-lancer **même batterie** après corrections → Phase audit de régression.
