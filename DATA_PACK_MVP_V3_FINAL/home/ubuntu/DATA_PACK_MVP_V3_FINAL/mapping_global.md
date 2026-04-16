# Mapping Global des Datasets - DATA PACK V0 FINAL

**Auteur :** Manus AI
**Date :** 23 Novembre 2025
**Version :** V0.9 (Pré-production)

Ce document présente le schéma de relations (mapping) entre les six datasets du **DATA PACK V0 FINAL**.

---

## 1. Schéma de Relations (Entité-Relation)

Le modèle de données est basé sur un schéma relationnel où l'entité `WEEKS` est centrale, liant les autres entités par des identifiants (IDs).

| Entité Source | Champ de Mapping | Entité Cible | Type de Relation | Description |
| :--- | :--- | :--- | :--- | :--- |
| **WEEKS** | `recommended_articles_ids` | **ARTICLES** | 1:N (Plusieurs articles par semaine) | Articles pertinents pour la semaine en cours. |
| **WEEKS** | `recommended_supplements_ids` | **SUPPLEMENTS** | 1:N (Plusieurs suppléments par semaine) | Suppléments recommandés pour la semaine en cours. |
| **WEEKS** | `calendar_template_ids` | **CALENDAR_TEMPLATES** | 1:N (Plusieurs événements par semaine) | Événements de calendrier suggérés pour la semaine. |
| **WEEKS** | `warnings_text_fr` | **RED_FLAGS** | 1:N (Référence textuelle) | Référence textuelle aux IDs de Red Flags (ex: `(rf01)`) pour alerter l'utilisateur. |
| **ARTICLES** | `related_supplements_ids` | **SUPPLEMENTS** | N:N (Plusieurs suppléments par article) | Suppléments mentionnés ou liés au sujet de l'article. |
| **ARTICLES** | `related_articles_ids` | **ARTICLES** | N:N (Articles connexes) | Articles suggérés pour une lecture approfondie. |
| **SUPPLEMENTS** | `related_article_ids` | **ARTICLES** | N:N (Plusieurs articles par supplément) | Articles fournissant des informations sur le supplément. |
| **RED_FLAGS** | `linked_articles_ids` | **ARTICLES** | 1:N (Plusieurs articles par Red Flag) | Articles expliquant le Red Flag ou les démarches à suivre. |
| **CHATBOT_SUGGESTIONS** | `linked_article_ids` | **ARTICLES** | 1:N (Plusieurs articles par suggestion) | Articles affichés en réponse à la suggestion. |
| **CHATBOT_SUGGESTIONS** | `linked_red_flag_ids` | **RED_FLAGS** | 1:N (Plusieurs Red Flags par suggestion) | Red Flags à vérifier ou à afficher en réponse à la suggestion. |

---

## 2. Cohérence des Mappings (Validation Qualité)

La cohérence des mappings a été vérifiée par un script de validation croisée (Phase 4). Tous les IDs référencés dans les colonnes de mapping (`*_ids`) existent dans les datasets cibles correspondants.

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
| **RED_FLAGS** | `red_flag_id` | `slug` | `rf01` (ou `hémorragie`) |
| **CALENDAR_TEMPLATES** | `template_id` | `string` | `c01` |
| **CHATBOT_SUGGESTIONS** | `suggestion_id` | `string` | `cs01` |

---

## 4. Données Linguistiques (Internationalisation)

Les colonnes pour l'Arabe (`_ar`) et l'Anglais (`_en`) ont été ajoutées à tous les datasets pour faciliter l'internationalisation future.

> **Statut V0 :** Toutes les colonnes `_ar` et `_en` sont actuellement **vides** et devront être remplies lors de la phase de traduction. Le contenu en Français (`_fr`) est complet.
