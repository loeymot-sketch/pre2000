# CHANGELOG - DATA PACK V2 (V1.1)

Ce journal des modifications détaille les enrichissements apportés aux datasets pour la **V2 Data UX**, conformément aux exigences de personnalisation, de suivi et d'adaptation culturelle.

## Version V2 (V1.1) - Enrichissement UX et Contenu Complet

| Dataset | Modifications |
| :--- | :--- |
| **WEEKS** | **Contenu UX enrichi :** `baby_facts_fr` (3-5 bullets) et `mom_tips_fr` (3-5 conseils) complétés pour les 40 semaines avec un ton rassurant et des adaptations culturelles (Maghreb). |
| **CALENDAR TEMPLATES** | **Complétion et Normalisation :** Augmentation à **33 templates** (contre 25) pour couvrir les consultations du 8e/9e mois, le post-natal, et la rééducation du périnée. Normalisation du champ `type` en `medical`, `self_care`, ou `admin`. Ajout des champs `recommended_week_exact` et `patient_notes_fr` (message court pour la maman). |
| **RED FLAGS** | **Robustesse du Matching :** Augmentation à **30 Red Flags** (contre 15). Enrichissement du champ `keywords_fr` avec des synonymes et expressions naturelles. Ajout des champs `description_fr` (signification) et `action_fr` (consigne simple) pour une réponse immédiate. Normalisation du champ `severity` en `urgent_consult` ou `emergency`. |
| **CHATBOT SUGGESTIONS** | **Expansion du Contenu :** Augmentation à **80 suggestions** (contre 45) réparties sur les 3 trimestres et le post-partum. Finalisation des champs `keywords_fr` et `response_fr` pour un matching et une réponse efficaces. |
| **VIDEOS** | **Nouveau Dataset :** Création du dataset `videos_db_v2.csv` avec **20 vidéos** éducatives (placeholders d'URL) classées par `category` et `week_min/max`. |
| **ARTICLES / SUPPLEMENTS** | **Statut :** Non modifiés dans cette phase. Les versions `v1_1` sont conservées. |

## Qualité et Cohérence

*   **Validation des Mappings :** Validation croisée complète des 7 datasets. Tous les IDs référencés (`articles`, `supplements`, `red_flags`, `calendar`, `videos`) existent dans leurs datasets cibles.
*   **Documentation :** Création du `rapport_sources_v2.md` listant les sources médicales (OMS, ACOG, NHS, HAS) utilisées pour la validation et l'enrichissement.
*   **Livrables :** Fichiers CSV et JSON finaux pour les 7 datasets.

---
*Ce Data Pack est prêt pour l'intégration par l'agent Antigravity. Seule la traduction (AR/EN) reste à effectuer.*
