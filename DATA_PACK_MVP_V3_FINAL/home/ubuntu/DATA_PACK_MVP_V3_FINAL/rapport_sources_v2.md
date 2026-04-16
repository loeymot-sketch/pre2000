# Rapport des Sources - DATA PACK V2 (V1.1)

Ce rapport liste les principales sources et références utilisées pour l'enrichissement et la validation des données des datasets pour la version V2 (V1.1) du Data Pack.

## 1. Sources Générales et Médicales

Les données médicales et les conseils de sécurité sont basés sur les recommandations des organisations de santé reconnues internationalement :

*   **Organisation Mondiale de la Santé (OMS) :** Recommandations générales sur la grossesse, l'accouchement et le post-partum.
*   **National Health Service (NHS - Royaume-Uni) :** Guidelines cliniques et conseils pratiques pour les femmes enceintes.
*   **American College of Obstetricians and Gynecologists (ACOG - États-Unis) :** Standards de soins et recommandations pour les complications.
*   **Centers for Disease Control and Prevention (CDC - États-Unis) :** Informations sur les vaccins, les infections et la sécurité pendant la grossesse.
*   **Haute Autorité de Santé (HAS - France) :** Protocoles de suivi de grossesse et d'examens obligatoires.

## 2. Sources Spécifiques par Dataset

| Dataset | Contenu enrichi | Sources utilisées |
| :--- | :--- | :--- |
| **WEEKS** | `baby_facts_fr`, `mom_tips_fr` | Combinaison des guidelines OMS/ACOG pour le développement fœtal et des conseils pratiques (nutrition, sommeil) adaptés au contexte Maghrébin (Ramadan, alimentation locale). |
| **CALENDAR TEMPLATES** | Normalisation des types, `recommended_week_exact`, `patient_notes_fr` | Protocoles HAS et ACOG pour le calendrier des examens prénataux (échos T1/T2/T3, consultations mensuelles, bilans sanguins). |
| **RED FLAGS** | `keywords_fr`, `description_fr`, `action_fr` | Guidelines d'urgence obstétricale ACOG et NHS. Les niveaux de sévérité (`urgent_consult`, `emergency`) sont basés sur les protocoles de triage. |
| **CHATBOT SUGGESTIONS** | `keywords_fr`, `response_fr`, `week_min/max` | Synthèse des FAQ des sites de santé publique (NHS, Ameli) et des conseils de sages-femmes, structurée par trimestre et thème. |
| **VIDEOS** | `title_fr`, `youtube_url`, `category` | Recherche ciblée sur YouTube pour des chaînes de professionnels de santé (médecins, sages-femmes) ou d'institutions reconnues, garantissant la fiabilité du contenu. |

## 3. Cohérence et Validation

La cohérence des données, notamment les mappings croisés entre les articles, les suppléments, les red flags et les suggestions du chatbot, a été vérifiée par un script de validation. L'objectif est de garantir que chaque référence (`linked_article_ids`, `linked_red_flag_ids`, etc.) pointe vers un identifiant existant dans le dataset cible.

---
*Ce rapport est un résumé des sources utilisées pour la V2 (V1.1) du Data Pack. Il ne remplace pas une vérification médicale professionnelle.*
