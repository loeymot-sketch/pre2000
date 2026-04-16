# CHANGELOG - DATA PACK V1.1 (V2 Data UX)

**Date :** 23 Novembre 2025
**Version :** V1.1 (Contenu Riche FR)

Ce document récapitule les modifications et enrichissements apportés aux datasets entre la version V1.0 (UX) et la version V1.1 (Contenu Riche FR).

---

## 1. Changements de Schéma (Aucun)

**Le schéma de données est resté inchangé.**

Aucune nouvelle colonne n'a été ajoutée. Les enrichissements ont porté exclusivement sur le contenu des colonnes existantes en Français (`_fr`).

---

## 2. Enrichissements par Dataset

L'objectif principal de cette version était de rendre le contenu en Français **prêt pour la production** (V2 Data UX).

### 2.1. WEEKS (`weeks_db_v1_1`)

| Champ | Modification | Détails |
| :--- | :--- | :--- |
| `baby_dev_text_fr` | **Contenu enrichi** | 4-6 phrases très concrètes, sans répétition, alignées sur les guidelines (OMS, NHS, ACOG). |
| `mom_body_text_fr` | **Contenu enrichi** | 3-5 phrases sur les symptômes, changements physiques et émotions, avec un ton rassurant. |
| `warnings_text_fr` | **Contenu enrichi** | Liste claire "Consultez rapidement si..." vs "Appelez les urgences si...", alignée sur les Red Flags. |
| `baby_facts_fr` | **Contenu enrichi** | 2-3 "fun facts" par semaine, au format texte simple. |
| `mom_tips_fr` | **Contenu enrichi** | 2-3 conseils pratiques courts et réalistes pour le contexte Maghreb/MENA. |
| `weekly_summary_fr` | **Contenu enrichi** | 2-3 phrases max, résumant l'évolution du bébé, le point clé pour la maman et la vigilance. |
| `recommended_videos_ids` | **Mapping complété** | Les IDs symboliques sont maintenant mappés à un nouveau dataset `videos_db_v1`. |

### 2.2. ARTICLES (`articles_db_v1_1`)

| Champ | Modification | Détails |
| :--- | :--- | :--- |
| `content_markdown_fr` | **Contenu complet généré** | Le contenu Markdown des 20 articles a été rédigé (simulé) pour être riche, structuré (sections, sous-titres) et sourcé (simulé). |
| `summary_fr` | **Contenu enrichi** | Ajout de 3-5 *key points* en bullet points dans le résumé pour l'UX "À retenir". |
| `tags`, `risk_level`, `trimester_focus` | **Vérification/Finalisation** | Les métadonnées ont été vérifiées et complétées pour chaque article. |

### 2.3. SUPPLEMENTS (`supplements_db_v1_1`)

| Champ | Modification | Détails |
| :--- | :--- | :--- |
| `short_description_fr` | **Contenu enrichi** | Descriptions plus précises du rôle de chaque supplément. |
| `pregnancy_notes_fr` | **Contenu enrichi** | Notes de sécurité claires et non ambiguës. |
| `typical_dose_text_fr` | **Contenu enrichi** | Texte informatif sur la posologie, toujours avec la mention "Selon avis médical". |
| `precautions_fr` | **Contenu enrichi** | Liste lisible des précautions (allergies, interactions). |

### 2.4. CALENDAR TEMPLATES (`calendar_templates_db_v1_1`)

| Champ | Modification | Détails |
| :--- | :--- | :--- |
| `description_fr` | **Contenu enrichi** | Texte clair expliquant le quoi et le pourquoi de l'événement. |
| `prep_checklist_fr` | **Contenu enrichi** | Ajout de 3-5 items concrets (ex: "Prendre carnet de maternité"). |
| `doctor_notes_fr` | **Contenu enrichi** | Ajout de 2-3 phrases sur ce que le médecin va surveiller. |

### 2.5. RED FLAGS (`red_flags_db_v1_1`)

| Champ | Modification | Détails |
| :--- | :--- | :--- |
| `standard_message_fr` | **Contenu enrichi** | Messages d'alerte plus précis et non alarmistes, expliquant la complication possible. |
| `linked_articles_ids` | **Mapping complété** | Vérification et complétion des liens vers les articles pertinents. |

### 2.6. CHATBOT SUGGESTIONS (`chatbot_suggestions_db_v1_1`)

| Champ | Modification | Détails |
| :--- | :--- | :--- |
| `label_fr` | **Augmentation** | Le nombre de suggestions est passé de 45 à **100** (environ 35 par trimestre + post-partum), couvrant un éventail plus large de thèmes (Ramadan, voyages, etc.). |
| `linked_article_ids` / `linked_red_flag_ids` | **Mapping finalisé** | Tous les mappings ont été vérifiés et corrigés pour pointer vers les IDs corrects (articles et red flags slugs). |

---

## 3. Nouveau Dataset

Un nouveau dataset a été créé pour supporter les recommandations de vidéos :

### VIDEOS (`videos_db_v1`)

| Champ | Type | Description |
| :--- | :--- | :--- |
| `video_id` | `string` | Identifiant symbolique (ex: `v01_semaine01_intro`). |
| `week_min`, `week_max` | `int` | Plage de semaines de pertinence. |
| `title_fr`, `description_fr` | `string` | Titre et description de la vidéo. |
| `youtube_search_query_fr` | `string` | Requête de recherche YouTube suggérée pour trouver la vidéo. |
| `youtube_url` | `string` | Placeholder pour l'URL réelle. |

---

## 4. Limitations (Pour la V2)

*   **Contenu AR/EN :** Les colonnes de traduction (`_ar`, `_en`) restent vides.
*   **Contenu Article :** Le contenu Markdown des articles est simulé (riche en structure mais générique) et doit être remplacé par le contenu final sourcé si la V2 est destinée à la publication.
*   **Vidéos :** Les IDs et les requêtes de recherche sont symboliques ; les URLs réelles doivent être ajoutées.
