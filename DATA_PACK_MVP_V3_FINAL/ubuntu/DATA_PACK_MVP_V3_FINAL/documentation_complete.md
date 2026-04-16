# Documentation Complète des Datasets - DATA PACK V0 FINAL

**Auteur :** Manus AI
**Date :** 23 Novembre 2025
**Version :** V0.9 (Pré-production)

Ce document fournit la documentation détaillée des six datasets qui constituent le **DATA PACK V0 FINAL** pour l'application de suivi de grossesse. Ces données ont été vérifiées, corrigées et complétées conformément aux spécifications du MASTER DOCUMENT.

---

## 1. Dataset WEEKS (`weeks_db_final.csv` / `.json`)

Ce dataset contient les informations hebdomadaires sur le développement du fœtus et les changements corporels de la mère, de la semaine 1 à la semaine 40 de grossesse. Il sert de base pour l'affichage du contenu principal de l'application.

| Champ | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `week_number` | `int` | Numéro de la semaine de grossesse (1 à 40). | Clé Primaire |
| `title_fr` | `string` | Titre de la semaine (Français). | |
| `title_ar`, `title_en` | `string` | Titres (Arabe, Anglais). | Vides dans V0, à compléter. |
| `emoji` | `string` | Émoji représentant la taille du bébé. | |
| `trimester` | `string` | Trimestre de grossesse (ex: "1er", "2ème"). | |
| `baby_size_label_fr` | `string` | Étiquette de taille du bébé (ex: "Avocat (4,1 cm)"). | |
| `baby_size_cm` | ``float`` | Taille moyenne du bébé en centimètres. | |
| `baby_weight_g` | `float` | Poids moyen du bébé en grammes. | |
| `baby_dev_text_fr` | `text` | Description du développement du bébé (Français). | |
| `mom_body_text_fr` | `text` | Description des changements corporels de la mère (Français). | |
| `warnings_text_fr` | `text` | Texte d'avertissement et de vigilance (Français). | Contient des références aux `red_flag_id` (ex: `(rf01)`). |
| `recommended_articles_ids` | `string` | Liste des `article_id` recommandés pour cette semaine. | Mapping vers `ARTICLES` (séparés par des virgules). |
| `recommended_supplements_ids` | `string` | Liste des `supplement_id` recommandés pour cette semaine. | Mapping vers `SUPPLEMENTS` (séparés par des virgules). |
| `calendar_template_ids` | `string` | Liste des `template_id` d'événements de calendrier suggérés. | Mapping vers `CALENDAR_TEMPLATES` (séparés par des virgules). |
| `baby_image_static_url` | `string` | URL statique de l'image du bébé pour la semaine. | Placeholder (ex: `week_01.png`). |
| `baby_3d_model_url` | `string` | URL du modèle 3D du bébé. | Vide dans V0, à compléter. |
| `..._ar`, `..._en` | `text` | Contenu (Arabe, Anglais). | Vides dans V0, à compléter. |

---

## 2. Dataset ARTICLES (`articles_db_enriched.csv` / `.json`)

Ce dataset contient les articles thématiques pour l'éducation de la mère.

| Champ | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `article_id` | `string` | Identifiant unique de l'article (slug). | Clé Primaire |
| `title_fr` | `string` | Titre de l'article (Français). | |
| `category` | `string` | Catégorie de l'article (ex: `nutrition`, `symptomes`, `examens`). | |
| `summary_fr` | `text` | Résumé de l'article (Français). | |
| `content_markdown_fr` | `text` | Contenu complet de l'article au format Markdown. | Contient des placeholders dans V0. |
| `tags` | `string` | Mots-clés associés à l'article (séparés par des virgules). | |
| `author` | `string` | Auteur de l'article. | |
| `sources` | `string` | Références médicales ou scientifiques. | |
| `image_url` | `string` | URL de l'image d'illustration. | |
| `risk_level` | `string` | Niveau de risque associé (ex: `normal`, `urgent`). | |
| `week_links` | `string` | Semaines de grossesse pertinentes pour cet article. | (ex: `1-40`, `5,6,7`). |
| `related_articles_ids` | `string` | Articles connexes. | Mapping vers `ARTICLES` (séparés par des virgules). |
| `related_supplements_ids` | `string` | Suppléments mentionnés ou liés. | Mapping vers `SUPPLEMENTS` (séparés par des virgules). |
| `note_localisation` | `text` | Note sur la localisation du contenu (si applicable). | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides dans V0, à compléter. |

---

## 3. Dataset SUPPLEMENTS (`supplements_pregnancy_enriched.csv` / `.json`)

Ce dataset liste les suppléments alimentaires pertinents pendant la grossesse.

| Champ | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `supplement_id` | `string` | Identifiant unique du supplément (slug). | Clé Primaire |
| `name_fr` | `string` | Nom du supplément (Français). | |
| `category` | `string` | Catégorie (ex: `vitamine`, `mineral`). | |
| `short_description_fr` | `text` | Description courte (Français). | |
| `pregnancy_safety` | `string` | Niveau de sécurité pendant la grossesse (ex: `safe`, `consult_doctor`). | |
| `pregnancy_notes_fr` | `text` | Notes spécifiques à la grossesse (Français). | |
| `typical_dose_text_fr` | `text` | Posologie typique (Français). | |
| `precautions_fr` | `text` | Précautions d'usage (Français). | |
| `sources` | `string` | Références médicales ou scientifiques. | |
| `related_symptoms_ids` | `string` | Mots-clés de symptômes liés. | Non mappé à un dataset. |
| `related_article_ids` | `string` | Articles connexes. | Mapping vers `ARTICLES` (séparés par des virgules). |
| `notes_localisation` | `text` | Note sur la localisation du contenu (si applicable). | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides dans V0, à compléter. |

---

## 4. Dataset RED FLAGS (`red_flags_db.csv` / `.json`)

Ce dataset contient les signes d'alerte (urgences médicales) pendant la grossesse.

| Champ | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `red_flag_id` | `string` | Identifiant unique (slug, ex: `rf01`). | Clé Primaire |
| `label_fr` | `string` | Libellé court (Français). | |
| `keywords_fr` | `string` | Mots-clés pour la recherche (Français). | |
| `severity` | `string` | Niveau d'urgence (ex: `emergency`, `urgent_consult`). | |
| `standard_message_fr` | `text` | Message d'alerte standard à afficher (Français). | |
| `linked_articles_ids` | `string` | Articles liés pour plus d'informations. | Mapping vers `ARTICLES` (séparés par des virgules). |
| `sources` | `string` | Références médicales ou scientifiques. | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides dans V0, à compléter. |

---

## 5. Dataset CALENDAR TEMPLATES (`calendar_templates_db.csv` / `.json`)

Ce dataset contient les modèles d'événements de calendrier suggérés (rendez-vous médicaux, achats, préparation).

| Champ | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `template_id` | `string` | Identifiant unique (ex: `c01`). | Clé Primaire |
| `title_fr` | `string` | Titre de l'événement (Français). | |
| `description_fr` | `text` | Description de l'événement (Français). | |
| `type` | `string` | Type d'événement (ex: `examen`, `preparation`, `self_care`). | |
| `week_min` | `int` | Semaine de grossesse la plus précoce pour cet événement. | |
| `week_max` | `int` | Semaine de grossesse la plus tardive pour cet événement. | |
| `recommended_day` | `int` | Jour recommandé de la semaine (1=Lundi, 7=Dimanche). | |
| `importance_level` | `int` | Niveau d'importance (1=Faible, 5=Élevé). | |
| `country_scope` | `string` | Portée géographique (ex: `global`, `france`). | |
| `sources` | `string` | Références (si applicable). | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides dans V0, à compléter. |

---

## 6. Dataset CHATBOT SUGGESTIONS (`chatbot_suggestions.csv` / `.json`)

Ce dataset fournit des suggestions de questions pour le chatbot, facilitant l'accès aux informations clés.

| Champ | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `suggestion_id` | `string` | Identifiant unique (ex: `cs01`). | Clé Primaire |
| `label_fr` | `string` | Question suggérée (Français). | |
| `topic` | `string` | Thème de la question (ex: `symptomes`, `nutrition`). | |
| `linked_article_ids` | `string` | Article(s) à afficher en réponse. | Mapping vers `ARTICLES` (séparés par des virgules). |
| `linked_red_flag_ids` | `string` | Red Flag(s) à vérifier ou à afficher. | Mapping vers `RED_FLAGS` (séparés par des virgules). |
| `..._ar`, `..._en` | `string` | Contenu (Arabe, Anglais). | Vides dans V0, à compléter. |
