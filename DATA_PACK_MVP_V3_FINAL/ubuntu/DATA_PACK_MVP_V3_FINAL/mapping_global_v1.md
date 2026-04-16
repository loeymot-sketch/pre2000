# Mapping Global des Datasets - DATA PACK V1 FINAL (UX)

**Auteur :** Manus AI
**Date :** 23 Novembre 2025
**Version :** V1.0 (UX Ready)

Ce document présente le schéma de relations (mapping) entre les six datasets du **DATA PACK V1 FINAL (UX)**.

---

## 1. Schéma de Relations (Entité-Relation)

Le modèle de données reste centré sur l'entité `WEEKS`.

| Entité Source | Champ de Mapping | Entité Cible | Type de Relation | Description |
| :--- | :--- | :--- | :--- | :--- |
| **WEEKS** | `recommended_articles_ids` | **ARTICLES** | 1:N | Articles pertinents pour la semaine. |
| **WEEKS** | `recommended_supplements_ids` | **SUPPLEMENTS** | 1:N | Suppléments recommandés pour la semaine. |
| **WEEKS** | `calendar_template_ids` | **CALENDAR_TEMPLATES** | 1:N | Événements de calendrier suggérés. |
| **WEEKS** | `warnings_text_fr` | **RED_FLAGS** | 1:N (Référence textuelle) | Référence textuelle aux IDs de Red Flags (ex: `(hémorragie)`). |
| **ARTICLES** | `related_supplements_ids` | **SUPPLEMENTS** | N:N | Suppléments mentionnés ou liés. |
| **ARTICLES** | `related_articles_ids` | **ARTICLES** | N:N | Articles suggérés pour une lecture approfondie. |
| **SUPPLEMENTS** | `related_article_ids` | **ARTICLES** | N:N | Articles fournissant des informations sur le supplément. |
| **SUPPLEMENTS** | `related_symptoms_ids` | **(Mots-clés)** | N:N | Mots-clés de symptômes liés au supplément (nouvel enrichissement V1). |
| **RED_FLAGS** | `linked_articles_ids` | **ARTICLES** | 1:N | Articles expliquant le Red Flag. |
| **CHATBOT_SUGGESTIONS** | `linked_article_ids` | **ARTICLES** | 1:N | Articles affichés en réponse à la suggestion. |
| **CHATBOT_SUGGESTIONS** | `linked_red_flag_ids` | **RED_FLAGS** | 1:N | Red Flags à vérifier ou à afficher en réponse à la suggestion. |

---

## 2. Cohérence des Mappings (Validation Qualité)

La validation croisée a été effectuée avec succès sur tous les datasets enrichis de la V1.

| Dataset Source | Colonne de Mapping | Statut de Validation |
| :--- | :--- | :--- |
| **WEEKS** | `recommended_articles_ids` | **OK** |
| **WEEKS** | `recommended_supplements_ids` | **OK** |
| **WEEKS** | `calendar_template_ids` | **OK** |
| **ARTICLES** | `related_supplements_ids` | **OK** |
| **ARTICLES** | `related_articles_ids` | **OK** |
| **SUPPLEMENTS** | `related_article_ids` | **OK** |
| **RED_FLAGS** | `linked_articles_ids` | **OK** |
| **CHATBOT_SUGGESTIONS** | `linked_article_ids` | **OK** |
| **CHATBOT_SUGGESTIONS** | `linked_red_flag_ids` | **OK** |

---

## 3. Structure des IDs (Clés Primaires)

| Dataset | Clé Primaire | Format de l'ID | Exemple |
| :--- | :--- | :--- | :--- |
| **WEEKS** | `week_number` | `int` | `1`, `40` |
| **ARTICLES** | `article_id` | `slug` | `a01_symptômes_de_grossesse` |
| **SUPPLEMENTS** | `supplement_id` | `slug` | `s01_acide_folique` |
| **RED_FLAGS** | `red_flag_id` | `slug` | `hémorragie` |
| **CALENDAR_TEMPLATES** | `template_id` | `string` | `c01` |
| **CHATBOT_SUGGESTIONS** | `suggestion_id` | `string` | `cs001` |

---

## 4. Données Linguistiques (Internationalisation)

Les colonnes pour l'Arabe (`_ar`) et l'Anglais (`_en`) ont été ajoutées aux nouveaux champs (ex: `baby_facts_ar`, `triage_questions_en`) et sont **vides**, prêtes pour la phase de traduction. Le contenu en Français (`_fr`) est complet.
