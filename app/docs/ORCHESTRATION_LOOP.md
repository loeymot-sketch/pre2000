# Boucle d’orchestration — Pregnancy App (pre2000)

Ce document définit **comment** travailler en cycles (plan → exécuter → auditer → décision), sans prétendre que des briques inexistantes dans le dépôt sont déjà branchées.

---

## 0. Modèle dual — **Cursor (agent)** vs **Claude (terminal)**

Tu as un abonnement **Claude** utilisable **depuis le Terminal** (ex. Claude Code ou équivalent). La boucle recommande une **séparation stricte des rôles** :

| Rôle | Outil | Quand | Contenu typique |
|------|--------|--------|------------------|
| **Alimentation** — contexte, exploration, patches, commandes | **Agent Cursor** (modèle de l’IDE) | tout le développement quotidien | lire le repo, modifier des fichiers, lancer `tsc` / `npm test`, résoudre des erreurs, préparer un **paquet de remise** pour l’étape suivante |
| **Orchestration** — découpage des phases, arbitrages, dépendances | **Claude Terminal** | début de cycle ou quand le périmètre est flou | « quelles étapes dans quel ordre », quels risques RGPD / store, quoi mettre en gate humain |
| **Audit post-alimentation** — relecture froide après livraison agent | **Claude Terminal** | **après** que l’agent a fini un lot | coller le diff / la liste des fichiers + sorties tests ; demander contre-audit (angles morts, scope creep, sécurité) |

**Règles :**

1. **Toute alimentation** (fichiers, commandes, correctifs) = **agent Cursor**, pas le terminal Claude, pour garder une trace dans l’IDE et éviter de dupliquer le travail.
2. **Claude Terminal** ne remplace pas l’agent pour éditer le projet en parallèle sans discipline : il sert à **penser** et **auditer** sur la base d’un **brief** que tu (ou l’agent) rédiges.
3. Après audit Claude, si des actions code sont requises, **retour à l’agent Cursor** avec une liste d’items numérotés (évite les allers-retours vagues).

### Si Claude Terminal refuse l’auth (abonnement désactivé côté org)

Exemple d’erreur : *« Your organization has disabled Claude subscription access for Claude Code »*.

**Contournements :** configurer `ANTHROPIC_API_KEY`, ou demander à l’admin d’activer l’accès abonnement pour Claude Code, ou **rédiger / figer le plan** dans `app/docs/PLAN_*.md` (comme `PLAN_ORCHESTRATED_HEX_RTL.md`) et laisser **l’agent Cursor** enchaîner les phases.

### Paquet minimal à coller dans Claude (audit)

- Branche / commit (hash court).
- Liste des chemins modifiés.
- Résumé en 5–10 lignes de l’intention.
- Sorties : `tsc --noEmit`, `npm test` (réussite / échec + extrait).
- Questions explicites : « y a-t-il une fuite de scope ? », « auth / PHI touchés ? ».

---

## 1. Périmètre réel du dépôt (état au 2026-05-03)

| Domaine | Dans le code aujourd’hui |
|--------|---------------------------|
| Auth / données | Firebase (Auth, Firestore), stockage local |
| Paiement in-app / abonnement | **Absent** (pas Stripe, pas RevenueCat, pas StoreKit exposé) |
| iCloud / CloudKit / sync Apple | **Absent** |
| API « fournisseur externe » nommé | **Non référencé** — tout intégrateur doit être spécifié par le produit (docs API, contrat, DPA) |

**Conséquence :** les phases « iCloud + API externe + paiement » ne sont **pas exécutables en boucle automatique** tant que les prérequis §4 ne sont pas fournis par l’humain.

---

## 2. Boucle obligatoire (chaque lot de travail)

Pour **chaque** incrément (même petit) :

1. **Plan** — 1–3 objectifs mesurables, fichiers touchés, risques (données perso, auth, stores).  
   - *Option A (léger)* : l’agent Cursor rédige le plan dans le chat.  
   - *Option B (lourd / gate)* : **Claude Terminal** produit le découpage et les critères d’acceptation ; l’agent exécute ensuite.
2. **Exécuter** — **uniquement agent Cursor** : patch minimal, pas de refacto opportuniste.
3. **Auditer** (immédiatement après l’agent) :
   - **Machine** : `npm run verify` (ou `lint:colors` + `tsc` + `npm test`), `rg` ciblé si besoin (hex / `rgba(` / chaînes CSS `theme.colors`).
   - **Humain + Claude Terminal** (*recommandé pour lots sensibles*) : contre-audit avec le **paquet §0**.
4. **Décision** — mergeable / une autre itération / bloqué (prérequis manquant).

Répéter jusqu’à verdict **mergeable** ou **bloqué** documenté.

---

## 3. Backlog technique déjà cartographié (boucle locale, sans cloud Apple)

Ces items sont **dans le repo** et peuvent tourner en boucle plan/audit sans secret externe :

- [x] Chaînes CSS web : `border: '… theme.colors…'` → `` `…${theme.colors…}` `` (`AddTaskModal`, `OnboardingScreen`) — vérifier `rg 'solid theme\\.colors'` = 0.
- [x] Hex résiduels hors `app/src/theme/index.ts` (migration P1–P4 + SSOT `theme/index.ts`).
- [x] `calendarService` : palette priorité → `theme.colors` (P1).
- [x] Garde-fou couleurs : `npm run lint:colors` → `scripts/check-theme-strings.sh` (hex + **`rgba(`** hors `theme/index.ts` / `styleUtils.ts` → exit **3** + motifs `solid theme.colors` connus ; `grep` si `rg` absent).
- [x] **Policy** : aucun `#hex` ni `rgba(` dans les écrans/composants — uniquement `theme.colors.*`, `theme.shadows.*` (PDF), ou `hexToRgba(theme.colors.*Hex, opacity)` pour chart-kit.
- [x] Gate locale rapide : `npm run verify` (= `lint:colors` + `tsc` + `jest`).
- [x] **CI GitHub** : `app/.github/workflows/ci.yml` et `eas-build.yml` exécutent `npm run verify` dans `./app` après `npm ci`.
- [x] **CI** : installation conditionnelle de **ripgrep** sur Ubuntu si absent (accélère / fiabilise `lint:colors`).

---

## 4. Phases « cloud / paiement » — **bloquées jusqu’à prérequis humains**

### Phase A — Paiement (à préciser)

L’humain doit trancher : **abonnement** (RevenueCat + App Store / Play Billing) vs **paiement web** (Stripe) vs **aucun** pour l’instant.

Livrables requis avant code :

- Choix du stack + comptes marchands.
- Politique de remboursement / essai gratuit.
- Flux légaux (CGU, mentions, facture si applicable).

### Phase B — iCloud / Apple (à préciser)

« iCloud via API externe » peut signifier plusieurs choses incompatibles entre elles :

- **CloudKit** (SDK Apple, entitlements, pas « un fournisseur » générique).
- **CalDAV / CardDAV** (serveur tiers, pas toujours iCloud grand public).
- **Export utilisateur** (déjà partiellement couvert par PDF / GDPR côté app).

Livrables requis avant code :

- Quelle donnée exacte doit vivre sur iCloud (calendrier grossesse, contacts urgence, sauvegarde complète ?).
- Compte développeur Apple, profils, capacités activées.
- Si un **fournisseur tiers** est visé : URL de la doc API, modèle d’auth (OAuth2, clé API), DPA / RGPD.

### Phase C — « Fournisseur Crieras » (nom à confirmer)

Tant que le nom exact du service, la documentation API et les variables d’environnement ne sont pas fournis, cette phase reste **non planifiable techniquement**.

---

## 5. Rôles — agent Cursor, Claude Terminal, humain

| Acteur | Responsabilité |
|--------|----------------|
| **Agent Cursor** | Toute **alimentation** : code, tests locaux, grep, préparation du paquet d’audit §0 |
| **Claude (terminal)** | **Orchestration** (optionnelle) et **audit** post-lot sur brief + sorties ; pas de substitut systématique aux tests machine |
| **Humain** | Secrets, contrats, choix produit, validation store, validation juridique paiement, validation finale merge |

---

## 6. Prochaine action recommandée

1. Continuer la boucle §3 (dettes visibles dans le code).
2. En parallèle, remplir §4 (une ligne de décision par ligne : paiement oui/non, iCloud oui/non, fournisseur exact).

*Dernière mise à jour : C1 — `lint:colors` inclut scan `rgba(` ; `theme.shadows.pdf*` ; `npm run verify`.*
