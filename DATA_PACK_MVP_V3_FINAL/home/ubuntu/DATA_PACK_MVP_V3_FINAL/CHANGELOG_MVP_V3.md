# JOURNAL DES MODIFICATIONS - DATA PACK MVP V3

**Date de livraison :** 27 Novembre 2025
**Version :** MVP V3 (Finalisation)
**Basé sur :** MVP V2

## 1. Résumé des Changements Majeurs

Cette version **MVP V3** représente la finalisation du jeu de données pour le lancement initial de l'application. L'accent a été mis sur l'enrichissement des fonctionnalités UX (tâches, rappels, chatbot) et la garantie d'une **qualité de données irréprochable** (zéro erreur de mapping, zéro valeur "None").

| Composant | Changement | Impact |
| :--- | :--- | :--- |
| **weekly_tasks_db** | Correction du bug critique `None` dans `linked_calendar_template_ids`. | **Stabilité critique** : Assure la bonne intégration des tâches avec le calendrier. |
| **reminders_templates_db** | Ajout des champs `default_times_per_day` et `suggested_hours`. | **UX/Fonctionnalité** : Permet une personnalisation avancée des rappels. |
| **calendar_templates_db** | Ajout des champs `is_checkable` et `reminder_offsets`. | **UX/Fonctionnalité** : Permet de marquer les événements comme faits et d'affiner les rappels. |
| **chatbot_suggestions_db** | Enrichissement du contenu à **140 entrées** (vs 120 en V2). | **Richesse du contenu** : Couverture plus large des questions fréquentes. |
| **Validation Globale** | Validation croisée complète de tous les IDs entre les 8 datasets. | **Qualité des données** : Zéro erreur de mapping confirmée. |
| **Format de Livraison** | Tous les datasets sont livrés en **CSV** et **JSON** (UTF-8, format FireStore-ready). | **Intégration** : Prêt pour l'importation directe par l'agent Antigravity. |

## 2. Détail des Modifications par Dataset

### `weekly_tasks_db_mvp_v3.csv`

*   **Correction de Bug Critique :** Remplacement de toutes les occurrences de la chaîne `"None"` par une chaîne vide (`""`) dans la colonne `likd_caldar_tmplat_ids`.
*   **Correction des Mappings :** Harmonisation des IDs d'articles (`likd_articl_ids`) et de calendrier (`likd_caldar_tmplat_ids`) pour correspondre aux IDs réels des datasets `articles_db` et `calendar_templates_db`.

### `reminders_templates_db_mvp_v3.csv`

*   **Nouveaux Champs :**
    *   `default_times_per_day` (Integer) : Nombre de fois par jour où le rappel doit être suggéré par défaut (ex: 3 pour l'hydratation).
    *   `suggested_hours` (String, Array JSON) : Liste des heures suggérées pour le rappel (ex: `["08:00", "14:00", "20:00"]`).

### `calendar_templates_db_mvp_v3.csv`

*   **Nouveaux Champs :**
    *   `is_checkable` (Boolean) : Indique si l'utilisateur peut marquer l'événement comme "fait" (ex: `false` pour une échographie, `true` pour un achat).
    *   `reminder_offsets` (String, Array JSON) : Liste des décalages de rappel avant l'événement (ex: `["-1d", "-1h"]` pour un rappel la veille et une heure avant).

### `chatbot_suggestions_db_mvp_v3.csv`

*   **Enrichissement :** Ajout de 20 nouvelles suggestions pour atteindre un total de 140 entrées.
*   **Validation :** Vérification des mappings vers `articles_db` et `red_flags_db`.

## 3. Validation et Qualité des Données

*   **Statut de Validation :** **SUCCÈS**.
*   **Règles Validées :**
    *   **Weeks** -> Articles, Suppléments, Calendrier.
    *   **Tasks** -> Articles, Calendrier.
    *   **Chatbot** -> Articles, Red Flags.
    *   **Articles** -> Suppléments.
*   **Formats de Sortie :** Tous les 8 datasets sont disponibles en **CSV** (source) et **JSON** (prêt à l'emploi).

---
*Ce Data Pack est conforme aux exigences de l'MVP V3 et est prêt pour l'intégration dans l'application.*
