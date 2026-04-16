# Backlog V0 – Application de suivi de grossesse

Ce backlog sert de référence principale pour le développement. L’agent doit s’en inspirer fortement et ne pas sauter d’étapes sans raison.

---

## Phase 0 – Setup & import data

### Tâche 0.1 – Initialiser le projet

- Créer un projet Expo React Native + TypeScript.
- Installer React Navigation avec une tab bar (Home, Calendrier, Articles, Chatbot).
- Créer une structure de dossiers claire (`src/screens`, `src/components`, `src/services`, `src/types`, etc.).

**Critères d’acceptation :**
- L’app démarre sur un écran de base sans erreur.
- La navigation tab bar est visible (même avec des écrans vides).

### Tâche 0.2 – Configurer Firebase

- Créer ou configurer un projet Firebase.
- Ajouter le SDK Web (config dans un fichier dédié).
- Activer Firestore.
- Activer Authentication (email+mot de passe, même si V0 peut supporter un mode invité).

**Critères d’acceptation :**
- Une fonction test de lecture/écriture dans Firestore fonctionne (doc de test).
- Aucune erreur de configuration au lancement.

### Tâche 0.3 – Importer le DATA PACK dans Firestore

- Créer les collections :
  - `weeks`
  - `articles`
  - `supplements`
  - `calendarTemplates`
  - `redFlags`
  - `chatbotSuggestions`
- Écrire un script d’import ou une procédure documentée pour :
  - lire les JSON des datasets ;
  - insérer les documents dans les collections avec les IDs appropriés.

**Critères d’acceptation :**
- 40 docs dans `weeks`.
- 20 docs dans `articles`.
- ~15 docs dans `supplements`.
- ~15–25 docs dans `calendarTemplates`.
- ~15 docs dans `redFlags`.
- ~25 docs dans `chatbotSuggestions`.

---

## Phase 1 – Profil utilisateur & calcul de la semaine

### Tâche 1.1 – Écran Onboarding

- Écran qui explique en 1–2 phrases l’objectif de l’app.
- Formulaire de saisie :
  - date de début de grossesse (ou dernières règles) ;
  - pays (liste simple).
- Bouton “Continuer”.

**Critères d’acceptation :**
- Les champs sont validés (date cohérente, non vide).
- Les données sont stockées en state local (ou contexte).

### Tâche 1.2 – Création / chargement du profil

- Si l’utilisatrice choisit de créer un compte :
  - Auth email+mot de passe (Firebase Auth).
  - Sauvegarde de pregnancyStartDate, country, language dans `userProfiles/{userId}`.
- Si mode invité :
  - Sauvegarde en local (AsyncStorage) suffisante pour V0.

**Critères d’acceptation :**
- Revenir dans l’app permet de retrouver les infos du profil (date de grossesse, etc.).

### Tâche 1.3 – Calcul de la semaine de grossesse

- Implémenter une fonction utilitaire :
  - input : pregnancyStartDate ;
  - output : weekNumber (1–40) et dayInWeek (1–7).

**Critères d’acceptation :**
- Tests sur quelques dates d’exemple donnent des résultats cohérents.
- La semaine est toujours bornée entre 1 et 40.

---

## Phase 2 – Écran Home

### Tâche 2.1 – Service “Week data”

- Créer un service ou hook (ex: `useCurrentWeek`) qui :
  - calcule la semaine actuelle à partir du profil ;
  - charge dans Firestore le document `weeks` correspondant (week_number).

**Critères d’acceptation :**
- Pour une date test fixée (ex: 12 semaines), les données affichées correspondent au doc Firestore de la semaine 12.

### Tâche 2.2 – UI Home

- Construire l’écran Home avec :
  - header “Bonjour/Bonsoir + prénom (si connu), semaine X” ;
  - carte “Bébé cette semaine” (taille, poids, texte bébé) ;
  - carte “Votre corps cette semaine” (mom_body_text_fr) ;
  - bloc “À surveiller / Quand consulter ?” (warnings_text_fr) ;
  - section “Articles recommandés” ;
  - section “Compléments recommandés” ;
  - lien vers Calendrier.

**Critères d’acceptation :**
- Tous les contenus texte viennent du document `weeks` + `articles` + `supplements`.
- Aucun texte médical important n’est écrit en dur dans le code.

---

## Phase 3 – Calendrier

### Tâche 3.1 – Service calendrier

- Créer une fonction qui :
  - prend weekNumber ;
  - interroge `calendarTemplates` ;
  - renvoie les événements où week_min <= weekNumber <= week_max.

**Critères d’acceptation :**
- Des tests avec plusieurs weeks (ex: 10, 20, 32) retournent des événements cohérents.

### Tâche 3.2 – Écran Calendrier

- Écran affichant la liste des événements pour la semaine actuelle.
- Afficher au minimum :
  - titre, type, description, importance.

**Critères d’acceptation :**
- Depuis la Home, un bouton “Calendrier” ouvre cet écran et les événements correspondent aux données Firestore.

---

## Phase 4 – Articles

### Tâche 4.1 – Liste d’articles

- Écran listant tous les articles (titre, catégorie, résumé).
- Possibilité de filtrer par catégorie (ex: symptômes, alimentation…).

### Tâche 4.2 – Détail d’un article

- Écran qui charge le contenu `content_markdown_fr` et le rend en texte scrollable.
- Affiche les compléments liés via `related_supplements_ids`.

**Critères d’acceptation :**
- Cliquer sur un article recommandé depuis Home ouvre bien l’article correct.

---

## Phase 5 – Chatbot V0

### Tâche 5.1 – UI chatbot

- Écran avec :
  - zone de texte pour la question ;
  - boutons de suggestions basés sur `chatbotSuggestions` ;
  - zone de réponse.

### Tâche 5.2 – Matching red flags

- Fonction qui :
  - prend la question utilisateur ;
  - cherche des correspondances dans `keywords_fr` des `redFlags` ;
  - retourne les red flags pertinents.

**Critères d’acceptation :**
- Pour quelques tests (saignements, maux de tête sévères, moins de mouvements bébé), la fonction trouve les bons red flags.

### Tâche 5.3 – Génération de la réponse

- Si red flag trouvé :
  - afficher le label_fr ;
  - afficher un message d’alerte rassurant (“consulter rapidement” / “urgence”) ;
  - proposer les articles liés ;
  - afficher le disclaimer.

- Sinon :
  - proposer des articles pertinents (via `linked_article_ids` des suggestions ou via catégorie).

**Critères d’acceptation :**
- Le chatbot ne donne pas de diagnostic personnalisée (“vous avez X”), mais oriente vers la consultation médicale.

---

## Phase 6 – QA & Build

### Tâche 6.1 – Vérification des mappings

- Scripts ou tests pour vérifier que :
  - tous les IDs dans `recommended_articles_ids` existent dans `articles` ;
  - tous les `recommended_supplements_ids` existent dans `supplements` ;
  - tous les `calendar_template_ids` existent dans `calendarTemplates` ;
  - tous les `linked_article_ids` et `linked_red_flag_ids` existent.

### Tâche 6.2 – Tests manuels de parcours

- Scénarios :
  - nouvelle utilisatrice → onboarding → Home → Calendrier → Articles → Chatbot ;
  - utilisatrice existante (profil chargé) ;
  - changement de date de grossesse.

### Tâche 6.3 – Build Expo

- Générer un build de test (Android et/ou iOS) pour installation sur appareil.

**Critères d’acceptation :**
- L’app est installable et utilisable sans crash.
