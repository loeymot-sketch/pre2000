# Documentation Complète des Datasets - DATA PACK V1.1 (V2 Data UX)

**Auteur :** Manus AI
**Date :** 23 Novembre 2025
**Version :** V1.1 (Contenu Riche FR)

Ce document fournit la documentation détaillée des sept datasets qui constituent le **DATA PACK V1.1 (V2 Data UX)**. Les données ont été enrichies de manière exhaustive en Français pour être prêtes à la production.

---

## 1. Dataset WEEKS (`weeks_db_v1_1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `week_number` | `int` | Numéro de la semaine de grossesse (1 à 40). | Complet |
| `title_fr` | `string` | Titre de la semaine (Français). | Complet |
| `weekly_summary_fr` | `string` | Phrase d'accroche courte et percutante (UX Home). | **Contenu Riche FR** |
| `baby_facts_fr` | `text` | 2-3 faits courts sur le développement du bébé (UX Home). | **Contenu Riche FR** |
| `mom_tips_fr` | `text` | 2-3 conseils pratiques pour la maman (UX Home). | **Contenu Riche FR** |
| `baby_size_label_fr` | `string` | Étiquette de taille du bébé. | Complet |
| `baby_dev_text_fr` | `text` | Description du développement du bébé (Français). | **Contenu Riche FR** |
| `mom_body_text_fr` | `text` | Description des changements corporels de la mère (Français). | **Contenu Riche FR** |
| `warnings_text_fr` | `text` | Texte d'avertissement et de vigilance (format "Consultez rapidement si..." / "Appelez les urgences si..."). | **Contenu Riche FR** |
| `recommended_articles_ids` | `string` | Liste des `article_id` recommandés. | Mappings vérifiés |
| `recommended_supplements_ids` | `string` | Liste des `supplement_id` recommandés. | Mappings vérifiés |
| `calendar_template_ids` | `string` | Liste des `template_id` d'événements de calendrier suggérés. | Mappings vérifiés |
| `recommended_videos_ids` | `string` | Liste des IDs de vidéos recommandées. | Mappings vérifiés |
| `..._ar`, `..._en` | `text` | Contenu (Arabe, Anglais). | Vides |

---

## 2. Dataset ARTICLES (`articles_db_v1_1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `article_id` | `string` | Identifiant unique (slug). | Complet |
| `title_fr` | `string` | Titre de l'article (Français). | Complet |
| `category` | `string` | Catégorie de l'article. | Complet |
| `summary_fr` | `text` | Résumé de l'article (Français) avec 3-5 *key points* en bullet points. | **Contenu Riche FR** |
| `content_markdown_fr` | `text` | Contenu complet de l'article au format Markdown. | **Contenu Riche FR (Simulé)** |
| `tags` | `string` | 5-10 mots-clés normalisés. | Complet |
| `cover_image_url` | `string` | URL de l'image d'illustration. | Placeholder |
| `reading_time_min` | `int` | Temps de lecture estimé en minutes. | Complet |
| `country_notes_fr` | `text` | Notes spécifiques à la localisation (ex: Maghreb). | Complet |
| `risk_level` | `string` | Niveau de risque associé (low, medium, high). | Complet |
| `trimester_focus` | `string` | Trimestre(s) de pertinence (T1, T2, T3, all). | Complet |
| `related_supplements_ids` | `string` | Suppléments mentionnés ou liés. | Mappings vérifiés |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides |

---

## 3. Dataset SUPPLEMENTS (`supplements_db_v1_1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `supplement_id` | `string` | Identifiant unique (slug). | Complet |
| `name_fr` | `string` | Nom du supplément (Français). | Complet |
| `category` | `string` | Catégorie. | Complet |
| `short_description_fr` | `text` | Description courte. | **Contenu Riche FR** |
| `pregnancy_safety` | `string` | Niveau de sécurité. | Complet |
| `pregnancy_notes_fr` | `text` | Notes de sécurité claires. | **Contenu Riche FR** |
| `typical_dose_text_fr` | `text` | Posologie, toujours avec la mention "Selon avis médical". | **Contenu Riche FR** |
| `precautions_fr` | `text` | Liste lisible des précautions (allergies, interactions). | **Contenu Riche FR** |
| `when_to_take_fr` | `text` | Conseils de prise (moment de la journée). | Complet |
| `food_sources_local_fr` | `text` | Sources alimentaires locales. | Complet |
| `contraindications_fr` | `text` | Contre-indications. | Complet |
| `trimester_relevance` | `string` | Trimestres pertinents (ex: T1, T2, T3). | Complet |
| `related_symptoms_ids` | `string` | Mots-clés de symptômes liés. | Mappings vérifiés |
| `related_article_ids` | `string` | Articles connexes. | Mappings vérifiés |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides |

---

## 4. Dataset RED FLAGS (`red_flags_db_v1_1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `red_flag_id` | `string` | Identifiant unique (slug). | Complet |
| `label_fr` | `string` | Libellé court (Français). | Complet |
| `severity` | `string` | Niveau d'urgence. | Complet |
| `standard_message_fr` | `text` | Message d'alerte standard à afficher. | **Contenu Riche FR** |
| `triage_questions_fr` | `text` | 2 questions courtes pour aider au triage. | Complet |
| `next_steps_fr` | `text` | Actions immédiates et sûres à entreprendre. | Complet |
| `linked_articles_ids` | `string` | Articles liés. | Mappings vérifiés |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides |

---

## 5. Dataset CALENDAR TEMPLATES (`calendar_templates_db_v1_1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `template_id` | `string` | Identifiant unique. | Complet |
| `title_fr` | `string` | Titre de l'événement (Français). | Complet |
| `description_fr` | `text` | Description de l'événement (Français). | **Contenu Riche FR** |
| `prep_checklist_fr` | `text` | 3-5 items très concrets pour la préparation. | **Contenu Riche FR** |
| `doctor_notes_fr` | `text` | 2-3 phrases sur ce que le médecin va surveiller. | **Contenu Riche FR** |
| `type` | `string` | Type d'événement. | Complet |
| `week_min`, `week_max` | `int` | Plage de semaines de grossesse pertinentes. | Complet |
| `duration_min` | `int` | Durée estimée de l'événement en minutes. | Complet |
| `location_hint_fr` | `text` | Indice sur le lieu du rendez-vous. | Complet |
| `prep_instructions_fr` | `text` | Instructions de préparation (ex: à jeun). | Complet |
| `is_mandatory` | `bool` | Indique si l'événement est obligatoire. | Complet |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides |

---

## 6. Dataset CHATBOT SUGGESTIONS (`chatbot_suggestions_db_v1_1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `suggestion_id` | `string` | Identifiant unique. | Complet |
| `label_fr` | `string` | Question suggérée (Français). | **100 entrées** |
| `trimestre` | `int` | Trimestre de pertinence (1, 2 ou 3). | Complet |
| `topic` | `string` | Thème de la question. | Complet |
| `linked_article_ids` | `string` | Article(s) à afficher en réponse. | Mappings vérifiés |
| `linked_red_flag_ids` | `string` | Red Flag(s) à vérifier ou à afficher. | Mappings vérifiés |
| `..._ar`, `..._en` | `string` | Contenu (Arabe, Anglais). | Vides |

---

## 7. Dataset VIDEOS (`videos_db_v1.csv` / `.json`)

| Champ | Type | Description | État V1.1 |
| :--- | :--- | :--- | :--- |
| `video_id` | `string` | Identifiant symbolique. | Complet |
| `week_min`, `week_max` | `int` | Plage de semaines de pertinence. | Complet |
| `title_fr`, `description_fr` | `string` | Titre et description de la vidéo. | Complet |
| `youtube_search_query_fr` | `string` | Requête de recherche YouTube suggérée. | Complet |
| `youtube_url` | `string` | Placeholder pour l'URL réelle. | Placeholder |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides |
