# DATA PACK – Vue d’ensemble des datasets

Les données ont été préparées et enrichies en amont. Elles sont la **source unique de vérité** pour tous les contenus médicaux de l’application.

Tu ne dois pas :
- régénérer ces données à partir du web ;
- inventer de nouveaux red flags, articles ou compléments ;
- modifier le sens des textes médicaux.

Tu peux ajouter des champs techniques (paths d’images, flags booléens, etc.) si nécessaire, mais sans toucher au fond médical.

## 1. Liste des datasets

Pour chaque dataset, nous disposons de fichiers en CSV et JSON :

1. `weeks_db_final.csv` / `weeks_db_final.json`
2. `articles_db_enriched.csv` / `articles_db_enriched.json`
3. `supplements_pregnancy_enriched.csv` / `supplements_pregnancy_enriched.json`
4. `calendar_templates_db.csv` / `calendar_templates_db.json`
5. `red_flags_db.csv` / `red_flags_db.json`
6. `chatbot_suggestions.csv` / `chatbot_suggestions.json`

## 2. weeks_db_final – Collection `weeks`

- 40 lignes, une par semaine de grossesse (1 à 40).
- Champs principaux :
  - `week_number` : entier 1–40.
  - `title_fr` : titre de la semaine.
  - `emoji` : visuel associé.
  - `trimester` : 1, 2 ou 3.
  - `baby_size_label_fr`, `baby_size_cm`, `baby_weight_g` : taille/poids.
  - `baby_dev_text_fr` : développement du bébé.
  - `mom_body_text_fr` : état/symptômes de la maman.
  - `warnings_text_fr` : texte “quand consulter”.
  - `recommended_articles_ids` : liste d’IDs article (ex: ["a01","a05"]). 
  - `recommended_supplements_ids` : liste d’IDs complément (ex: ["s01","s03"]). 
  - `calendar_template_ids` : liste d’IDs d’événements.
  - `baby_image_static_url` : nom du fichier image (ex: "week_20.png").
  - `baby_3d_model_url` : placeholder pour futur modèle 3D (souvent vide en V0).

Utilisation :
- Calcul de la Home (contenu de la semaine).
- Lien vers les articles, compléments et événements pertinents.

## 3. articles_db_enriched – Collection `articles`

- ~20 articles éditoriaux complets.
- Champs principaux :
  - `article_id` : identifiant unique (ex: "a01_symptomes_grossesse").
  - `slug` : slug pour routage éventuel.
  - `title_fr` : titre.
  - `category` : catégorie (symptômes, travail, droits, etc.).
  - `summary_fr` : résumé court.
  - `content_markdown_fr` : contenu markdown complet.
  - `risk_level` : sensibilité du sujet (normal / sensible / critique).
  - `week_links` : semaines concernées (ex: "12,13,14" ou "1-40").
  - `related_supplements_ids` : compléments liés.
  - `note_localisation` : info sur contexte France / générique / à adapter.

Utilisation :
- Écran Articles (liste + détail).
- Recommandations sur la Home.
- Références pour le chatbot.

## 4. supplements_pregnancy_enriched – Collection `supplements`

- ~15 compléments alimentaires pertinents pour la grossesse.
- Champs principaux :
  - `supplement_id` : ex: "s01_acide_folique".
  - `name_fr`.
  - `category` (vitamine, minéral, etc.).
  - `short_description_fr`.
  - `pregnancy_safety` : indicateur (ok / a_surveiller / deconseille).
  - `pregnancy_notes_fr` : contexte et importance.
  - `typical_dose_text_fr` : fourchettes/doses typiques d’information générale.
  - `precautions_fr` : avertissements.
  - `sources` : références (OMS, HAS, etc.).
  - `related_article_ids` : articles associés.
  - `notes_localisation` : ex: aliments riches typiques du Maghreb.

Utilisation :
- Sections compléments recommandés.
- Détail dans les fiches compléments ou articles.

## 5. calendar_templates_db – Collection `calendarTemplates`

- ~15–25 modèles d’événements (médicaux, self-care, administratifs).
- Champs principaux :
  - `template_id` : ex: "c01_echo_t1".
  - `title_fr`.
  - `description_fr`.
  - `type` : "medical", "self_care", "administratif", etc.
  - `week_min`, `week_max` : plage de semaines.
  - `recommended_day` : jour conseillé (optionnel).
  - `importance_level` : 1–3.
  - `country_scope` : "generique_MENA", etc.
  - `sources` : références médicales/administratives.

Utilisation :
- Génération du calendrier en fonction de la semaine de grossesse.

## 6. red_flags_db – Collection `redFlags`

- ~15 red flags majeurs (situations à risque à ne pas ignorer).
- Champs principaux :
  - `red_flag_id` : ex: "rf01_saignements_abondants".
  - `label_fr` : titre du symptôme.
  - `keywords_fr` : liste de mots-clés pour matching (ex: "saignement, sang, hémorragie").
  - `severity` : niveau de gravité (peut être incomplet ou à normaliser).
  - `standard_message_fr` : message d’alerte type (parfois imparfait ; possible d’utiliser un message générique dans le code).
  - `linked_articles_ids` : articles explicatifs.
  - `sources` : références (OMS, ACOG, etc.).

Utilisation :
- Détection de red flags dans le chatbot V0.
- Affichage de messages d’alerte + redirection vers contenus.

## 7. chatbot_suggestions – Collection `chatbotSuggestions`

- ~25 suggestions de questions fréquentes.
- Champs principaux :
  - `suggestion_id`.
  - `label_fr` : texte de la suggestion (ex: "J’ai des nausées le matin").
  - `topic` : catégorie.
  - `linked_article_ids`.
  - `linked_red_flag_ids` (parfois vide).

Utilisation :
- Boutons de suggestions sous le champ de saisie du chatbot.

## 8. Règles d’utilisation

- Tous les textes d’information médicale doivent venir de ces datasets.
- Les colonnes `_ar` et `_en` peuvent être ignorées pour la V0 (souvent vides).
- Tu peux :
  - caster les champs de type liste (ex: "a01,a02") en tableaux ;
  - ajouter des champs dérivés (ex: `weekRange` calculé depuis `week_links`).
- Tu ne dois pas :
  - réécrire le fond des textes médicaux ;
  - supprimer des entrées sans signaler le problème.
