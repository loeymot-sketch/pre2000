# CHANGELOG - DATA PACK MVP V2 (Data-First)

Ce journal des modifications détaille les enrichissements apportés aux datasets pour la **MVP V2 (Data-First)**, conformément aux exigences de consolidation et de création de nouveaux datasets.

## Version MVP V2 - Consolidation et Nouveaux Datasets

| Dataset | Modifications |
| :--- | :--- |
| **WEEKS** | **Contenu UX consolidé :** Ajout des champs `baby_facts_short_fr`, `baby_facts_bullets_fr`, `mom_tips_short_fr`, `mom_tips_bullets_fr` pour une meilleure flexibilité d'affichage en frontend. Contenu généré à partir des champs riches existants. |
| **CALENDAR TEMPLATES** | **Complétion des métadonnées :** Ajout des champs `recommended_day` (1-7 ou 'any_day'), `timing_in_day` ('morning', 'afternoon', 'evening', 'any_time') et `estimated_duration_min` pour une meilleure planification. Vérification et nettoyage des champs `week_min/max`, `type` et `importance`. |
| **RED FLAGS** | **Amélioration du Matching :** Amélioration des `keywords_fr` avec des synonymes et des termes adaptés au contexte Maghreb. Standardisation du `standard_message_fr` pour inclure une alerte, une action claire et un disclaimer court. |
| **CHATBOT SUGGESTIONS** | **Expansion du Contenu :** Augmentation à **120 suggestions** (contre 80) pour couvrir plus de scénarios par trimestre et post-partum. |
| **REMINDERS TEMPLATES** | **NOUVEAU DATASET :** Création de **20 rappels** santé généraux (`reminder_id`, `title_fr`, `description_fr`, `category`, `default_times`, `default_intensity_levels`, `week_min`, `week_max`, `sources`). |
| **WEEKLY TASKS** | **NOUVEAU DATASET :** Création de **60 tâches** à cocher (`task_id`, `label_fr`, `week_min`, `week_max`, `type`, `priority`, `linked_article_ids`). |
| **VIDEOS / ARTICLES / SUPPLEMENTS** | **Statut :** Non modifiés dans cette phase. Les versions précédentes sont conservées. |

## Qualité et Cohérence

*   **Validation des Mappings :** Validation croisée complète des 8 datasets (Weeks, Calendar, Red Flags, Chatbot, Reminders, Tasks, Articles, Supplements). Tous les IDs référencés existent dans leurs datasets cibles.
*   **Formatage :** Tous les fichiers CSV ont été nettoyés et convertis en JSON, avec un encodage UTF-8 et des guillemets pour garantir la bonne tokenisation des champs de texte.

---
*Ce Data Pack est prêt pour l'intégration par l'agent Antigravity. Seule la traduction (AR/EN) reste à effectuer.*
