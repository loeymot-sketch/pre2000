# Message tout-en-un à coller dans Claude (Terminal)

**Racine repo :** `pre2000` · **App :** `app/` (Expo / React Native)

Copie **tout** ce qui suit la ligne `---COPIER_CI_DESSOUS---` jusqu’à `---FIN_DU_MESSAGE---` (inclus les annexes).

---

---COPIER_CI_DESSOUS---

## Demande

Tu es l’**orchestrateur technique** du projet **pre2000** (app Expo, Firebase, i18n FR/AR/EN/TN, thème SSOT). **Ne pas implémenter le code** sauf ordre contraire : tu **priorises**, **découpes en phases**, **audites**, et tu produis le **format de sortie obligatoire** décrit dans l’**ANNEXE A** (méga-prompt).

**Contexte figé ci-dessous :** les annexes B et C sont le contenu actuel des docs du repo ; l’**ANNEXE D** liste les chemins de code concernés par la suite du travail (migration couleurs + garde-fous). Tu dois en tenir compte, réordonner si besoin, et dire explicitement ce qui est déjà fait (P1) vs à faire (P2–P5).

**Sortie attendue :** uniquement les sections  
`### SYNTHÈSE` · `### PHASES` · `### LOT IMMÉDIAT` · `### ANGLES MORTS` · `### DÉCISION` · `### MESSAGE À COLLER À CURSOR`  
comme dans l’ANNEXE A (titres exacts, français).

---

## ANNEXE A — Méga-prompt orchestrateur (règles + format)

Tu es l’**orchestrateur technique principal** du projet **pre2000** — application mobile **React Native / Expo** (`app/`), backend **Firebase** (Auth, Firestore), **i18n** FR / AR / EN / TN, thème SSOT `app/src/theme/index.ts`. L’**implémentation** et les commandes locales sont faites par l’**agent Cursor** ; toi, tu produis des **plans exécutables**, des **audits**, et des **décisions** sans élargir le scope par « propreté ».

### Règles non négociables

1. **Zéro scope creep** : chaque lot = objectifs mesurables, liste de fichiers bornée (≤6 fichiers par phase sauf justification critique).
2. **Santé / données** : ne jamais proposer de logger du **PHI** (messages utilisateur bruts, contenu médical identifiant). Rappeler les **disclaimers** sur les écrans sensibles si une feature touche au parcours santé.
3. **RGPD** : toute évolution touchant export, purge compte, ou stockage = expliciter impact collections / clés AsyncStorage.
4. **i18n** : toute nouvelle chaîne visible = les **4** langues ou explicitement marqué « dette i18n » avec clés proposées.
5. **Secrets** : pas de clés en dur ; variables `EXPO_PUBLIC_*` / EAS documentées, jamais dans le prompt utilisateur.
6. **Couleurs** : SSOT = `theme/index.ts` ; interdiction de laisser des littéraux `theme.colors.xxx` **dans des chaînes CSS/HTML** sans interpolation `${...}`.

### Contexte repo (rappel)

- Docs de boucle : `app/docs/ORCHESTRATION_LOOP.md` (modèle dual Cursor + Claude terminal).
- Plan hex résiduel : `app/docs/PLAN_ORCHESTRATED_HEX_RTL.md` (P1 fait côté agent : feedback + `calendarService` ; P2–P5 à enchaîner ou réviser).
- Hors scope immédiat saucisson : **iCloud**, **paiement in-app**, intégrations **non spécifiées** — seulement une phase « discovery » avec prérequis humains.

### Ta mission maintenant

1. Déduire l’**état réel** vs la dette à partir des annexes B–D.
2. Produire un **plan d’attaque réordonné** (lots de PR) avec risques et dépendances.
3. Pour **chaque lot** (phase) : `id`, `objectif`, `fichiers_max`, `critères_acceptation`, `commandes_audit` (`cd app && npx tsc --noEmit`, `cd app && npm test`, + `rg` pertinents), `gates_humains`, `rollback`.
4. **Angles morts** : 5 à 10 points (perf, RTL, offline, Firestore, assets, a11y).
5. **Décision** : `CONTINUE` | `REPLAN` | `BLOCKED:<raison>` + **prochaine action unique**.

### Format de sortie OBLIGATOIRE

Réponds **uniquement** avec :

### SYNTHÈSE (≤8 lignes)

### PHASES (tableau markdown : id | priorité | objectif | fichiers / périmètre | risque)

### LOT IMMÉDIAT (celui que l’agent Cursor doit traiter en premier)

- Fichiers
- Critères d’acceptation
- Commandes d’audit (bloc code shell)

### ANGLES MORTS

### DÉCISION

`CONTINUE` | `REPLAN` | `BLOCKED:...`

### MESSAGE À COLLER À CURSOR (≤25 lignes)

Instructions impératives, numérotées, pour l’agent qui code.

**Contrainte de ton** : pas de prose marketing. Si info manquante : `ASSUMPTION:` une ligne max par hypothèse puis continue.

---

## ANNEXE B — `app/docs/ORCHESTRATION_LOOP.md` (contenu intégral)

```markdown
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
   - **Machine** : `npx tsc --noEmit`, `npm test`, `rg` ciblé (ex. chaînes CSS `theme.colors`, hex hors `theme/index.ts`).
   - **Humain + Claude Terminal** (*recommandé pour lots sensibles*) : contre-audit avec le **paquet §0**.
4. **Décision** — mergeable / une autre itération / bloqué (prérequis manquant).

Répéter jusqu’à verdict **mergeable** ou **bloqué** documenté.

---

## 3. Backlog technique déjà cartographié (boucle locale, sans cloud Apple)

Ces items sont **dans le repo** et peuvent tourner en boucle plan/audit sans secret externe :

- [x] Chaînes CSS web : `border: '… theme.colors…'` → `` `…${theme.colors…}` `` (`AddTaskModal`, `OnboardingScreen`) — vérifier `rg 'solid theme\\.colors'` = 0.
- [ ] Hex résiduels hors `app/src/theme/index.ts` (liste dans audit précédent).
- [x] `calendarService` : harmoniser palette priorité (hex vs `theme.colors`).
- [ ] Option CI : script qui échoue si une chaîne contient le motif littéral `theme.colors.` dans un contexte CSS/HTML.

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

*Dernière mise à jour : §0 modèle dual Cursor / Claude terminal ; bordures web corrigées (voir historique git).*
```

---

## ANNEXE C — `app/docs/PLAN_ORCHESTRATED_HEX_RTL.md` (contenu intégral)

```markdown
# Plan orchestré — migration hex résiduels

**Source d’orchestration :** ce document remplace une sortie Claude Terminal si `claude --print` est indisponible (ex. org sans accès abonnement Claude Code → utiliser clé API ou admin).

**Exécutant :** agent Cursor (implémentation + `tsc` + `npm test` + `rg`).

---

## P1 — Feedback + calendrier (fait cycle courant)

| Fichier | Action |
|---------|--------|
| `theme/index.ts` | Jetons `feedbackSuccessBg`, `feedbackSuccessText`, `feedbackErrorBg`, `calendarPriority*` |
| `SuccessMessage.tsx` | Hex → `theme.colors` |
| `ErrorMessage.tsx` | Hex → `theme.colors` |
| `calendarService.ts` | `PRIORITY_COLORS` → `theme.colors` |

**Critères :** `rg '#[0-9A-Fa-f]{6}' app/src/services/calendarService.ts` ne matche plus les anciennes couleurs priorité ; `tsc` + tests OK.

---

## P2 — Auth + calendrier UI léger (≤4 fichiers)

| Fichier | Action |
|---------|--------|
| `AuthChoiceScreen.tsx` | `#aaa` → `theme.colors.neutral400` (ou équivalent) |
| `WeeklyStrip.tsx` | `#F0F9FF` → `theme.colors.sky50` |
| `WeekInfoSection.tsx` | `#FFECB3` → jeton ambre léger ou `gradientAmberEnd` si visuel OK |
| `MomTipsCard.tsx` | `#F0F9FF`, `#4FC3F7` → thème |

**Audit :** `rg '#[0-9A-Fa-f]{3,8}'` sur ces chemins uniquement.

---

## P3 — Home cards (≤5 fichiers)

| Fichier | Action |
|---------|--------|
| `BabyGrowthCard.tsx` | Gradients / `#2D2D2D` / `#5D4E37` → tokens |
| `BabyFactsCard.tsx` | `#5D4037` |
| `WeekRemindersCard.tsx` | `#FF6F00` → `orangeDeepAccent`, texte brun |

---

## P4 — Rappels / réglages (≤6 fichiers)

| Fichier | Action |
|---------|--------|
| `HydrationCard.tsx` | Gradients + bordures + switch |
| `RemindersTab.tsx` | `#FF80AB`, `#856404` |
| `ReminderEditModal.tsx` | `#FF80AB` |
| `StatisticsScreen.tsx` | gradient streak |
| `SettingsScreen.tsx` | `#E1BEE7`, `#FFE69C`, `#856404` |

---

## P5 — Garde-fou (optionnel)

Script ou règle : échouer si une chaîne contient le motif `'…theme.colors.` ou `` `…theme.colors. `` dans un contexte style CSS/HTML (hors commentaires).

---

*Ordre : P1 → P2 → P3 → P4 ; arrêt si régression tests.*
```

---

## ANNEXE D — Fichiers du repo à considérer (liste exhaustive orchestration couleurs / UX)

### Documentation (référence)

1. `app/docs/MEGA_PROMPT_ORCHESTRATEUR_CLAUDE.md`
2. `app/docs/ORCHESTRATION_LOOP.md`
3. `app/docs/PLAN_ORCHESTRATED_HEX_RTL.md`
4. `app/docs/COPY_PASTE_MESSAGE_CLAUDE_ORCHESTRATION.md` (ce fichier)

### SSOT thème

5. `app/src/theme/index.ts`

### Déjà traités récemment (P1 + correctifs web)

6. `app/src/components/common/SuccessMessage.tsx`
7. `app/src/components/common/ErrorMessage.tsx`
8. `app/src/services/calendarService.ts`
9. `app/src/components/tasks/AddTaskModal.tsx` (bordures web interpolées)
10. `app/src/screens/OnboardingScreen.tsx` (idem)
11. `app/src/services/pdfExportService.ts` (HTML `${theme.colors...}`)

### Cibles P2 (prochain lot typique)

12. `app/src/screens/AuthChoiceScreen.tsx`
13. `app/src/components/calendar/WeeklyStrip.tsx`
14. `app/src/components/home/WeekInfoSection.tsx`
15. `app/src/components/home/MomTipsCard.tsx`

### Cibles P3

16. `app/src/components/home/BabyGrowthCard.tsx`
17. `app/src/components/home/BabyFactsCard.tsx`
18. `app/src/components/home/WeekRemindersCard.tsx`

### Cibles P4

19. `app/src/components/reminders/HydrationCard.tsx`
20. `app/src/screens/reminders/RemindersTab.tsx`
21. `app/src/components/reminders/ReminderEditModal.tsx`
22. `app/src/screens/reminders/StatisticsScreen.tsx`
23. `app/src/screens/SettingsScreen.tsx`

### Contexte produit (optionnel lecture)

24. `app/ARCHITECTURE.md`
25. `app/CHANGELOG.md`

---FIN_DU_MESSAGE---
