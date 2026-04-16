# Documentation Complète des Datasets - DATA PACK V1 FINAL (UX)

**Auteur :** Manus AI
**Date :** 23 Novembre 2025
**Version :** V1.0 (UX Ready)

Ce document fournit la documentation détaillée des six datasets qui constituent le **DATA PACK V1 FINAL (UX)**. Les données ont été enrichies avec des champs orientés Expérience Utilisateur (UX) pour la V1.

---

## 1. Dataset WEEKS (`weeks_db_v1.csv` / `.json`)

Ce dataset contient les informations hebdomadaires sur le développement du fœtus et les changements corporels de la mère, de la semaine 1 à la semaine 40 de grossesse.

| Champ | Type | Description | Nouveauté V1 |
| :--- | :--- | :--- | :--- |
| `week_number` | `int` | Numéro de la semaine de grossesse (1 à 40). | |
| `title_fr` | `string` | Titre de la semaine (Français). | |
| **`weekly_summary_fr`** | `string` | **Phrase d'accroche courte et percutante (UX Home).** | **NOUVEAU** |
| **`baby_facts_fr`** | `text` | **3 faits courts sur le développement du bébé (UX Home).** | **NOUVEAU** |
| **`mom_tips_fr`** | `text` | **2-3 conseils pratiques pour la maman (UX Home).** | **NOUVEAU** |
| `baby_size_label_fr` | `string` | Étiquette de taille du bébé (ex: "Avocat (4,1 cm)"). | |
| `baby_dev_text_fr` | `text` | Description du développement du bébé (Français). | |
| `mom_body_text_fr` | `text` | Description des changements corporels de la mère (Français). | |
| `warnings_text_fr` | `text` | Texte d'avertissement et de vigilance (référence aux Red Flags). | |
| `recommended_articles_ids` | `string` | Liste des `article_id` recommandés. | |
| `recommended_supplements_ids` | `string` | Liste des `supplement_id` recommandés. | |
| `calendar_template_ids` | `string` | Liste des `template_id` d'événements de calendrier suggérés. | |
| **`recommended_videos_ids`** | `string` | **Liste des IDs de vidéos recommandées (Placeholder).** | **NOUVEAU** |
| `..._ar`, `..._en` | `text` | Contenu (Arabe, Anglais). | Vides (prêts pour la traduction). |

---

## 2. Dataset ARTICLES (`articles_db_v1.csv` / `.json`)

Ce dataset contient les articles thématiques pour l'éducation de la mère.

| Champ | Type | Description | Nouveauté V1 |
| :--- | :--- | :--- | :--- |
| `article_id` | `string` | Identifiant unique de l'article (slug). | |
| `title_fr` | `string` | Titre de l'article (Français). | |
| `category` | `string` | Catégorie de l'article. | |
| `summary_fr` | `text` | Résumé de l'article (Français). | |
| `content_markdown_fr` | `text` | Contenu complet de l'article au format Markdown (Placeholder V0). | |
| **`tags`** | `string` | **5-10 mots-clés normalisés (UX Recherche).** | **ENRICHI** |
| **`cover_image_url`** | `string` | **URL de l'image d'illustration (Placeholder).** | **NOUVEAU** |
| **`reading_time_min`** | `int` | **Temps de lecture estimé en minutes (UX).** | **NOUVEAU** |
| **`country_notes_fr`** | `text` | **Notes spécifiques à la localisation (ex: Maghreb).** | **NOUVEAU** |
| `related_supplements_ids` | `string` | Suppléments mentionnés ou liés. | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides (prêts pour la traduction). |

---

## 3. Dataset SUPPLEMENTS (`supplements_db_v1.csv` / `.json`)

Ce dataset liste les suppléments alimentaires pertinents pendant la grossesse.

| Champ | Type | Description | Nouveauté V1 |
| :--- | :--- | :--- | :--- |
| `supplement_id` | `string` | Identifiant unique du supplément (slug). | |
| `name_fr` | `string` | Nom du supplément (Français). | |
| `category` | `string` | Catégorie. | |
| **`when_to_take_fr`** | `text` | **Conseils de prise (moment de la journée, avec/sans repas).** | **NOUVEAU** |
| **`food_sources_local_fr`** | `text` | **Sources alimentaires locales (orienté Maghreb/MENA).** | **NOUVEAU** |
| **`contraindications_fr`** | `text` | **Contre-indications et précautions d'usage.** | **NOUVEAU** |
| **`trimester_relevance`** | `string` | **Trimestres pertinents (ex: T1, T2, T3).** | **NOUVEAU** |
| `related_symptoms_ids` | `string` | Mots-clés de symptômes liés. | **ENRICHI** |
| `related_article_ids` | `string` | Articles connexes. | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides (prêts pour la traduction). |

---

## 4. Dataset RED FLAGS (`red_flags_db_v1.csv` / `.json`)

Ce dataset contient les signes d'alerte (urgences médicales) pendant la grossesse.

| Champ | Type | Description | Nouveauté V1 |
| :--- | :--- | :--- | :--- |
| `red_flag_id` | `string` | Identifiant unique (slug). | |
| `label_fr` | `string` | Libellé court (Français). | |
| `severity` | `string` | Niveau d'urgence (ex: `emergency`, `urgent_consult`). | |
| `standard_message_fr` | `text` | Message d'alerte standard à afficher. | |
| **`triage_questions_fr`** | `text` | **2 questions courtes pour aider au triage (UX Chatbot).** | **NOUVEAU** |
| **`next_steps_fr`** | `text` | **Actions immédiates et sûres à entreprendre.** | **NOUVEAU** |
| `linked_articles_ids` | `string` | Articles liés pour plus d'informations. | |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides (prêts pour la traduction). |

---

## 5. Dataset CALENDAR TEMPLATES (`calendar_templates_db_v1.csv` / `.json`)

Ce dataset contient les modèles d'événements de calendrier suggérés.

| Champ | Type | Description | Nouveauté V1 |
| :--- | :--- | :--- | :--- |
| `template_id` | `string` | Identifiant unique. | |
| `title_fr` | `string` | Titre de l'événement (Français). | |
| `description_fr` | `text` | Description de l'événement (Français). | |
| `type` | `string` | Type d'événement (ex: `examen`, `preparation`). | |
| `week_min`, `week_max` | `int` | Plage de semaines de grossesse pertinentes. | |
| **`duration_min`** | `int` | **Durée estimée de l'événement en minutes (UX).** | **NOUVEAU** |
| **`location_hint_fr`** | `text` | **Indice sur le lieu du rendez-vous.** | **NOUVEAU** |
| **`prep_instructions_fr`** | `text` | **Instructions de préparation (ex: à jeun).** | **NOUVEAU** |
| **`is_mandatory`** | `bool` | **Indique si l'événement est obligatoire.** | **NOUVEAU** |
| `..._ar`, `..._en` | `string`/`text` | Contenu (Arabe, Anglais). | Vides (prêts pour la traduction). |

---

## 6. Dataset CHATBOT SUGGESTIONS (`chatbot_suggestions_db_v1.csv` / `.json`)

Ce dataset fournit des suggestions de questions pour le chatbot.

| Champ | Type | Description | Nouveauté V1 |
| :--- | :--- | :--- | :--- |
| `suggestion_id` | `string` | Identifiant unique. | |
| `label_fr` | `string` | Question suggérée (Français). | |
| **`trimestre`** | `int` | **Trimestre de pertinence (1, 2 ou 3).** | **NOUVEAU** |
| `topic` | `string` | Thème de la question. | |
| `linked_article_ids` | `string` | Article(s) à afficher en réponse. | |
| `linked_red_flag_ids` | `string` | Red Flag(s) à vérifier ou à afficher. | |
| `..._ar`, `..._en` | `string` | Contenu (Arabe, Anglais). | Vides (prêts pour la traduction). |
