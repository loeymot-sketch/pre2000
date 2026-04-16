# Guide d’utilisation pour Antigravity – Planification & Exécution

Ce fichier explique à l’agent Antigravity comment travailler sur ce projet en deux phases :
1. Phase **Planification** (plan & questions).
2. Phase **Développement** (implémentation du plan).

## 1. Phase Planification

Ton rôle dans cette phase : **Lead Dev + Planner**.

Tu dois :

1. Lire attentivement :
   - `01_PRD_V0_Antigravity.md`
   - `02_DATA_PACK_OVERVIEW.md`
   - `03_BACKLOG_V0_TASKS.md`
   - les fichiers d’architecture existants (par ex. `architecture_complete.md` si présent).

2. Créer un ou plusieurs Artifacts :
   - **Roadmap V0** : les grandes étapes (EPICs).
   - **Task List détaillée** : liste de tâches concrètes (tu peux t’appuyer sur `03_BACKLOG_V0_TASKS.md`).
   - **Implementation Plan** : ordre d’exécution, dépendances, stratégie de test.
   - **Questions ouvertes** : tout ce qui n’est pas clair et que tu dois confirmer avec moi.

3. Vérifier que :
   - tous les écrans demandés sont couverts (Onboarding, Home, Calendrier, Articles, Chatbot V0) ;
   - l’import des données Firestore est bien prévu ;
   - l’utilisation des datasets (weeks, articles, supplements, calendarTemplates, redFlags, chatbotSuggestions) est claire.

4. Ne PAS commencer le code tant que :
   - la Roadmap V0 n’est pas claire ;
   - les questions critiques (auth, design, options techniques) n’ont pas été posées.

**Important :**
- Si quelque chose est ambigu (par ex : mode invité ou non, style de design exact), tu dois le signaler dans un Artifact “Questions” au lieu de faire des suppositions fortes.

## 2. Phase Développement / Exécution

Une fois le plan validé, ton rôle : **Agent Développeur principal**.

Règles générales :

1. Tu suis l’ordre logique des phases du backlog (Phase 0 → … → Phase 6).
2. Après chaque phase importante, tu produis un Artifact “Checkpoint” :
   - ce qui a été fait ;
   - quels fichiers ont été créés/modifiés ;
   - comment les données sont utilisées ;
   - quels tests ont été réalisés (manuels ou automatisés).

3. Tu n’ajoutes pas de fonctionnalités hors PRD sans les proposer d’abord dans un Artifact.

4. Tu n’inventes pas de contenu médical :
   - les textes médicaux viennent uniquement des datasets ;
   - les transformations éventuelles sont purement techniques (formats, parsing, etc.).

## 3. Utilisation des données

- Tu importes le DATA PACK tel quel dans Firestore (voir `02_DATA_PACK_OVERVIEW.md`).
- Tu considères les datasets comme **read-only** côté app.
- Tu fais attention aux IDs et aux relations (weeks → articles → supplements → calendarTemplates, etc.).

Si tu détectes une incohérence (ID manquant, valeur étrange) :
- tu la documentes dans un Artifact ;
- tu continues en mettant en place un fallback propre (ex: ignorer l’ID manquant) ;
- mais tu ne corriges pas les données sans instruction explicite.

## 4. Fin de V0

La V0 est considérée comme terminée lorsque :

- un nouveau profil peut être créé (ou chargé) ;
- la semaine de grossesse est calculée correctement ;
- la Home affiche les infos de la semaine depuis Firestore ;
- le Calendrier affiche les événements pertinents ;
- les Articles sont consultables (liste + détail) ;
- le Chatbot V0 fonctionne pour :
  - des questions “red flag” (qui déclenchent des messages d’alerte + articles) ;
  - des questions “normales” (qui renvoient vers du contenu) ;
- un build Expo est disponible et testable sur appareil ;
- les limitations V0 et le disclaimer médical sont bien en place.

À chaque fois que tu termines une phase, tu dois produire un Artifact résumant l’état et les éventuels points à revoir.
