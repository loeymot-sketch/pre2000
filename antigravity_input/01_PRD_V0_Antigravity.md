# PRD V0 – Application de suivi de grossesse (Maghreb / Monde arabe)

## 1. Vision

Créer une application mobile simple, stable et riche en contenu pour accompagner les femmes enceintes du Maghreb et du monde arabe.

La V0 est **data-first** :
- toutes les infos médicales viennent des datasets fournis (semaines, articles, compléments, red flags, calendrier, chatbot) ;
- on privilégie la clarté et la fiabilité plutôt que des features complexes ;
- l’objectif est une app fonctionnelle, agréable, prête à être améliorée en V1.

## 2. Plateformes & stack cible

- Plateformes : iOS + Android (via **Expo React Native**).
- Langage : TypeScript.
- Backend / BaaS : **Firebase** (Authentication + Firestore, éventuellement Storage).
- App gratuite (pas de paywall ni pub en V0).

## 3. Périmètre fonctionnel V0

### 3.1. Onboarding & profil grossesse

- Écran d’accueil avec explication rapide de l’app.
- Formulaire pour :
  - Date de début de grossesse (ou date des dernières règles).
  - Pays (liste simple, par ex. Tunisie / Maroc / Algérie / Autre).
  - Langue = FR (prévoir champ pour futur AR/EN mais FR seulement pour V0).
- Calcul automatique de la semaine de grossesse actuelle (1–40).
- Sauvegarde des infos profil dans Firestore (collection `userProfiles`) si l’utilisatrice crée un compte.

Options :
- Mode invité possible (stockage local du profil sans création de compte).
- Auth email + mot de passe suffisant pour V0 si on active l’Auth.

### 3.2. Écran Home (écran principal)

Home = l’écran que l’utilisatrice voit après l’onboarding.

Depuis la collection `weeks` (issue de `weeks_db_final`) :
- Afficher la **semaine actuelle** : titre, emoji, trimestre.
- Afficher la taille et le poids du bébé (baby_size_label_fr, baby_size_cm, baby_weight_g).
- Afficher le texte “Développement du bébé” (baby_dev_text_fr).
- Afficher le texte “Corps de la maman” (mom_body_text_fr).
- Afficher la section “À surveiller / Quand consulter ?” (warnings_text_fr).

Recommandations :
- Articles liés (via `recommended_articles_ids`).
- Compléments liés (via `recommended_supplements_ids`).
- Événements de calendrier de la semaine (via `calendar_template_ids`).

La Home doit être **entièrement pilotée par les données Firestore** ; pas de texte médical hard-codé dans le code.

### 3.3. Calendrier

Basé sur la collection `calendarTemplates` (issue de `calendar_templates_db`).

Fonctionnement :
- En fonction de la semaine actuelle (weekNumber calculée),
  - sélectionner les templates où week_min <= weekNumber <= week_max ;
  - trier par importance_level et éventuellement recommended_day.

UI :
- Liste d’événements : titre, type (médical / self-care / administratif), description.
- Possible d’indiquer quels évènements sont “faits” (state local ou Firestore userEvents).

V0 :
- Pas de notifications push obligatoires.
- Pas d’intégration avec le calendrier système.

### 3.4. Articles

Basé sur la collection `articles` (issue de `articles_db_enriched`).

Écran “Articles” :
- Liste des articles avec titre, catégorie, résumé.
- Filtre possible par catégorie (symptômes, travail, nutrition, post-partum, etc.).

Écran “Détail article” :
- Affiche le contenu complet (content_markdown_fr rendu en composants texte/scroll).
- Affiche les compléments liés (`related_supplements_ids`).
- Peut être ouvert depuis :
  - la liste d’articles ;
  - les recommandations de la Home ;
  - le chatbot.

### 3.5. Compléments alimentaires

Basé sur la collection `supplements` (issue de `supplements_pregnancy_enriched`).

Affichage :
- Nom du complément (name_fr).
- Catégorie (vitamine, minéral, acide gras, etc.).
- Description courte (short_description_fr).
- Informations grossesse (pregnancy_notes_fr).
- Texte sur doses typiques (typical_dose_text_fr) en mode informatif (pas de prescription personnalisée).
- Précautions (precautions_fr).
- Sources.

Les compléments ne sont jamais “prescrits” par l’app ; ils sont présentés comme informations générales, avec rappel de consulter un médecin.

### 3.6. Chatbot V0

Objectif : offrir un premier niveau de réponse et de triage vers les contenus, **pas** de diagnostic.

Basé sur :
- `redFlags` (issue de `red_flags_db`) pour les symptômes d’alerte.
- `chatbotSuggestions` pour les questions fréquentes.
- `articles` pour proposer des ressources.

Comportement V0 :
- L’utilisatrice saisit une question OR clique sur une suggestion.
- L’app analyse la question :
  - si mots-clés matchent un red flag (keywords_fr) :
    - afficher label_fr du red flag ;
    - afficher un message d’alerte rassurant (standard_message_fr ou message générique pré-défini) ;
    - proposer les articles liés ;
    - rappeler clairement : “Cette application ne remplace pas un avis médical. Consultez un professionnel de santé.”
  - sinon :
    - proposer une ou plusieurs fiches article pertinentes ;
    - éventuellement proposer des compléments ou un rappel calendrier.

### 3.7. Navigation

- Navigation par tab bar en bas :
  - Home
  - Calendrier
  - Articles
  - Chatbot
- Navigation simple, sans sous-menus compliqués.

## 4. Contenu & langues

- Tous les textes médicaux viennent des datasets (CSV/JSON) fournis.
- V0 : français uniquement, même si certaines colonnes `_ar` et `_en` existent (souvent vides).
- Préparer le code pour que l’on puisse plus tard :
  - ajouter AR/EN ;
  - supporter RTL pour l’arabe.

## 5. Design & UX

- Cible : femmes enceintes Maghreb/MENA.
- Ambiance :
  - couleurs douces, rassurantes (roses, pêches, beiges, bleu clair…) ;
  - icônes et illustrations simples, non anxiogènes.
- Typographie :
  - taille de police confortable ;
  - espacement suffisant ;
  - attention à l’accessibilité (contraste).

Priorité UX :
- Home très claire et rassurante.
- Navigation évidente.
- Textes pas trop longs sur un seul écran (scroll autorisé, mais aéré).

## 6. Limites de la V0

- Pas de notifications push avancées.
- Pas de partage social, communauté, ni chat entre utilisatrices.
- Pas de suivi médical personnalisé (tension, glycémie…).
- Pas de recommandations automatiques complexes (ex: IA médicale de haut niveau).

## 7. Exigences médicales & légales

- Toujours rappeler que l’app :
  - ne remplace pas un médecin ;
  - ne doit pas être utilisée en cas d’urgence à la place des services d’urgence.
- Aucune modification des textes médicaux sans revue humaine côté produit/médecin.
- Le ton des messages d’alerte doit être :
  - ferme mais rassurant ;
  - clair sur la nécessité de consulter si doute.

## 8. Rôle de ce document

Ce PRD V0 doit être utilisé par l’agent de planification (Antigravity) pour :
- construire un **plan d’implémentation** complet ;
- identifier les zones floues et poser des questions ;
- guider ensuite le développement étape par étape, en lien avec le DATA PACK.
