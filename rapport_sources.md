# Rapport des Sources Médicales et Scientifiques - DATA PACK V0 FINAL

**Auteur :** Manus AI
**Date :** 23 Novembre 2025
**Version :** V0.9 (Pré-production)

Ce rapport liste les principales sources médicales et scientifiques utilisées pour la vérification, la correction et la complétion des données dans le **DATA PACK V0 FINAL**, notamment pour les informations relatives au développement fœtal, aux signes d'alerte (`RED_FLAGS`), aux recommandations de suppléments (`SUPPLEMENTS`) et aux événements de calendrier (`CALENDAR_TEMPLATES`).

---

## 1. Organismes de Santé et Institutions

Les données ont été alignées sur les recommandations des organismes internationaux et nationaux suivants :

| Acronyme | Nom Complet | Domaine d'Application |
| :--- | :--- | :--- |
| **OMS** | Organisation Mondiale de la Santé | Recommandations globales sur la santé maternelle et infantile, normes de croissance fœtale. |
| **ACOG** | American College of Obstetricians and Gynecologists | Directives cliniques pour la pratique obstétricale et gynécologique, notamment pour les signes d'alerte et les examens. |
| **NHS** | National Health Service (Royaume-Uni) | Guides pratiques pour la grossesse, le suivi et les soins post-partum. |
| **CDC** | Centers for Disease Control and Prevention (États-Unis) | Recommandations sur la vaccination, les infections et les facteurs de risque pendant la grossesse. |
| **HAS** | Haute Autorité de Santé (France) | Protocoles et recommandations pour le suivi de grossesse en France (utilisé pour les `CALENDAR_TEMPLATES` spécifiques). |

---

## 2. Utilisation des Sources par Dataset

Les sources sont référencées de manière spécifique dans les colonnes `sources` des datasets `RED_FLAGS`, `SUPPLEMENTS`, et `CALENDAR_TEMPLATES`.

### 2.1. RED FLAGS

Les signes d'alerte sont directement basés sur les critères d'urgence définis par l'**ACOG** et l'**OMS**, avec une classification de gravité (`severity`) pour guider l'utilisateur vers une consultation urgente (`urgent_consult`) ou une urgence vitale (`emergency`).

*   **Exemple de Source :** `ACOG 2023, CDC` pour les signes de pré-éclampsie (`rf04`, `rf05`, `rf08`).
*   **Exemple de Source :** `OMS 2024, ACOG 2023, NHS` pour les hémorragies (`rf01`).

### 2.2. SUPPLEMENTS

Les recommandations de sécurité (`pregnancy_safety`) et les notes sur la posologie sont basées sur les consensus scientifiques concernant les besoins nutritionnels pendant la grossesse.

*   **Exemple de Source :** Les recommandations sur l'acide folique (`s01_acide_folique`) et la vitamine D (`s03_vitamine_d`) sont alignées sur les directives de l'**OMS** et de l'**ACOG**.

### 2.3. CALENDAR TEMPLATES

Les événements de calendrier (échographies, bilans sanguins) sont structurés autour du calendrier de suivi prénatal standard, principalement celui de la **HAS** (France) et des recommandations générales de l'**ACOG** pour les examens clés.

*   **Exemple de Source :** `HAS, ACOG, NHS` pour les échographies de datation (`c02`) et morphologiques (`c06`).

---

## 3. Données de Croissance Fœtale (WEEKS)

Les valeurs de taille (`baby_size_cm`) et de poids (`baby_weight_g`) pour les 40 semaines de grossesse sont des moyennes statistiques issues de grandes études de cohortes internationales (ex: Intergrowth-21st, Hadlock), et sont considérées comme des valeurs de référence standard pour le développement fœtal.

---

## 4. Note sur le Contenu Textuel (ARTICLES et WEEKS)

Le contenu textuel (descriptions, avertissements, articles) a été rédigé en s'appuyant sur les connaissances médicales validées par les organismes cités ci-dessus. Bien que les articles (`ARTICLES`) contiennent des placeholders pour le contenu complet (`content_markdown_fr`), les résumés et les mappings ont été établis sur la base d'une structure thématique cohérente avec les directives médicales.

**Avertissement :** Ce DATA PACK V0 est destiné à une application d'information et ne remplace en aucun cas un avis ou un suivi médical professionnel. Les utilisateurs doivent toujours consulter un professionnel de santé pour toute question ou urgence.
