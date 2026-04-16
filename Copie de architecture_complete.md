# Architecture complète des datasets - Application de suivi de grossesse

## Vue d'ensemble

L'application de suivi de grossesse repose sur une architecture data-first composée de **5 datasets interconnectés** qui fournissent une expérience riche et personnalisée aux futures mamans du marché Maghreb/monde arabe.

### Principes architecturaux

1. **Data-first** : Les données structurées pilotent l'expérience utilisateur
2. **Multilingue** : Support natif FR/AR/EN (V0 : FR avec colonnes vides)
3. **Synchronisation hebdomadaire** : Contenu adapté à la semaine de grossesse
4. **Interconnexion** : Relations explicites entre datasets via IDs
5. **Évolutivité** : Structure extensible pour futures fonctionnalités

---

## 1. Datasets principaux

### 1.1 `weeks_db` - Base de données hebdomadaire

**Rôle** : Dataset central qui synchronise tout le contenu de l'application en fonction de la semaine de grossesse (1 à 40).

**Cardinalité** : 40 entrées (1 par semaine)

**Structure** :
```
week_number (PK) → Identifiant unique de la semaine
title_fr/ar/en → Titre de la semaine
emoji → Emoji représentatif (à améliorer)
trimester → Trimestre (1, 2, ou 3)
baby_size_label_fr/ar/en → Taille comparative (ex: "Grain de raisin")
baby_size_cm → Taille en cm (numérique)
baby_weight_g → Poids en grammes (numérique)
baby_dev_text_fr/ar/en → Description du développement du bébé
mom_body_text_fr/ar/en → Symptômes et sensations de la maman
warnings_text_fr/ar/en → Symptômes d'alerte et quand consulter
recommended_articles_ids → Liste d'IDs d'articles (ex: "a01,a02,a03")
recommended_supplements_ids → Liste d'IDs de compléments (ex: "s01,s02")
calendar_template_ids → Liste d'IDs d'événements (ex: "c01,c02")
baby_image_static_url → URL de l'image du bébé
baby_3d_model_url → URL du modèle 3D (optionnel, V2)
```

**Relations** :
- `weeks_db.recommended_articles_ids` → `articles_db.article_id` (1:N)
- `weeks_db.recommended_supplements_ids` → `supplements_pregnancy.supplement_id` (1:N)
- `weeks_db.calendar_template_ids` → `calendar_templates_db.template_id` (1:N)

---

### 1.2 `articles_db` - Base de données des articles thématiques

**Rôle** : Contenu éditorial riche sur des sujets clés de la grossesse.

**Cardinalité** : 20 articles (extensible)

**Structure** :
```
article_id (PK) → Identifiant unique (ex: "a01")
title_fr/ar/en → Titre de l'article
category → Catégorie (santé, nutrition, bien-être, etc.)
summary_fr/ar/en → Résumé court (2-3 phrases)
content_markdown_fr/ar/en → Contenu complet en Markdown
tags → Mots-clés séparés par virgules
author → Auteur (ex: "Équipe médicale")
sources → Sources médicales (ex: "OMS, NHS, ACOG")
image_url → URL de l'image d'illustration
related_weeks → Semaines pertinentes (ex: "12,13,14")
related_supplements_ids → Compléments mentionnés (ex: "s01,s02")
```

**Relations** :
- `articles_db.related_supplements_ids` → `supplements_pregnancy.supplement_id` (N:N)
- `weeks_db.recommended_articles_ids` → `articles_db.article_id` (N:1)

---

### 1.3 `supplements_pregnancy` - Fiches compléments alimentaires

**Rôle** : Informations détaillées et fiables sur les compléments alimentaires pertinents pendant la grossesse.

**Cardinalité** : 15 compléments (extensible)

**Structure** :
```
supplement_id (PK) → Identifiant unique (ex: "s01_acide_folique")
name_fr/ar/en → Nom du complément
category → Catégorie (vitamine, minéral, acide gras, etc.)
short_description_fr/ar/en → Description courte (1 phrase)
pregnancy_safety → Statut (ok, à_surveiller, déconseillé)
pregnancy_notes_fr/ar/en → Informations détaillées sur l'usage pendant la grossesse
typical_dose_text_fr/ar/en → Dosage recommandé avec disclaimer médical
precautions_fr/ar/en → Précautions et effets secondaires
sources → Sources médicales (ex: "OMS 2024, ACOG 2021")
related_symptoms_ids → Symptômes associés (ex: "fatigue,anemie")
related_article_ids → Articles mentionnant ce complément (ex: "a01,a02")
notes_localisation → Adaptation culturelle Maghreb/MENA
```

**Relations** :
- `supplements_pregnancy.related_article_ids` → `articles_db.article_id` (N:N)
- `weeks_db.recommended_supplements_ids` → `supplements_pregnancy.supplement_id` (N:1)

---

### 1.4 `red_flags_db` - Base des symptômes d'alerte

**Rôle** : Détection et gestion des symptômes d'alerte pour le chatbot médical V0.

**Cardinalité** : 15 entrées (extensible)

**Structure** :
```
red_flag_id (PK) → Identifiant unique (ex: "rf01")
label_fr/ar/en → Nom du symptôme d'alerte
keywords_fr/ar/en → Mots-clés pour détection (ex: "saignements,hémorragie,sang")
severity → Niveau de gravité (emergency, urgent_consult)
standard_message_fr/ar/en → Message standardisé (ton ferme et rassurant)
linked_articles_ids → Articles liés (ex: "a01,a12,a19")
sources → Sources médicales (ex: "ACOG, RCOG, NHS")
```

**Relations** :
- `red_flags_db.linked_articles_ids` → `articles_db.article_id` (N:N)
- Utilisé par le **chatbot V0** pour détecter les red flags dans les questions utilisateur

---

### 1.5 `calendar_templates_db` - Modèles d'événements de calendrier

**Rôle** : Événements médicaux, administratifs et de bien-être synchronisés par semaine de grossesse.

**Cardinalité** : 15 modèles (extensible)

**Structure** :
```
template_id (PK) → Identifiant unique (ex: "c01")
title_fr/ar/en → Titre de l'événement
description_fr/ar/en → Description détaillée
type → Type (medical, administratif, self_care)
week_min → Semaine minimale de déclenchement
week_max → Semaine maximale de déclenchement
importance_level → Niveau d'importance (1=faible, 2=moyen, 3=élevé)
country_scope → Portée géographique (générique_MENA, TN, MA, DZ, etc.)
sources → Sources médicales (ex: "HAS, ACOG")
```

**Relations** :
- `weeks_db.calendar_template_ids` → `calendar_templates_db.template_id` (N:1)
- Génère des **événements personnalisés** dans le calendrier utilisateur

---

## 2. Diagramme relationnel

```
┌─────────────────────────────────────────────────────────────────┐
│                         weeks_db (40)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ week_number (PK)                                         │   │
│  │ title_fr/ar/en, emoji, trimester                         │   │
│  │ baby_size_label_fr/ar/en, baby_size_cm, baby_weight_g   │   │
│  │ baby_dev_text_fr/ar/en                                   │   │
│  │ mom_body_text_fr/ar/en                                   │   │
│  │ warnings_text_fr/ar/en                                   │   │
│  │ recommended_articles_ids ────────────────────┐           │   │
│  │ recommended_supplements_ids ─────────────┐   │           │   │
│  │ calendar_template_ids ───────────────┐   │   │           │   │
│  │ baby_image_static_url, baby_3d_model_url │   │           │   │
│  └──────────────────────────────────────│───│───│───────────┘   │
└─────────────────────────────────────────│───│───│───────────────┘
                                          │   │   │
                        ┌─────────────────┘   │   │
                        │                     │   │
                        ▼                     │   │
        ┌───────────────────────────┐         │   │
        │ calendar_templates_db (15)│         │   │
        ├───────────────────────────┤         │   │
        │ template_id (PK)          │         │   │
        │ title_fr/ar/en            │         │   │
        │ description_fr/ar/en      │         │   │
        │ type, week_min, week_max  │         │   │
        │ importance_level          │         │   │
        │ country_scope, sources    │         │   │
        └───────────────────────────┘         │   │
                                              │   │
                        ┌─────────────────────┘   │
                        │                         │
                        ▼                         ▼
        ┌───────────────────────────┐ ┌───────────────────────────┐
        │ supplements_pregnancy (15)│ │    articles_db (20)       │
        ├───────────────────────────┤ ├───────────────────────────┤
        │ supplement_id (PK)        │ │ article_id (PK)           │
        │ name_fr/ar/en             │ │ title_fr/ar/en            │
        │ category                  │ │ category, summary_fr/ar/en│
        │ short_description_fr/ar/en│ │ content_markdown_fr/ar/en │
        │ pregnancy_safety          │ │ tags, author, sources     │
        │ pregnancy_notes_fr/ar/en  │ │ image_url                 │
        │ typical_dose_text_fr/ar/en│ │ related_weeks             │
        │ precautions_fr/ar/en      │ │ related_supplements_ids ──┼──┐
        │ sources                   │ │                           │  │
        │ related_symptoms_ids      │ └───────────────────────────┘  │
        │ related_article_ids ──────┼────────────────────────────────┘
        │ notes_localisation        │
        └───────────────────────────┘
                                              
                        ┌───────────────────────────┐
                        │   red_flags_db (15)       │
                        ├───────────────────────────┤
                        │ red_flag_id (PK)          │
                        │ label_fr/ar/en            │
                        │ keywords_fr/ar/en         │
                        │ severity                  │
                        │ standard_message_fr/ar/en │
                        │ linked_articles_ids ──────┼──► articles_db
                        │ sources                   │
                        └───────────────────────────┘
                                    │
                                    │ Utilisé par
                                    ▼
                        ┌───────────────────────────┐
                        │    Chatbot V0             │
                        │  (Détection red flags)    │
                        └───────────────────────────┘
```

---

## 3. Flux de données principaux

### 3.1 Synchronisation hebdomadaire (Home Screen)

```
Utilisateur entre sa date de début de grossesse
    ↓
Calcul de la semaine actuelle (1-40)
    ↓
Récupération de weeks_db[week_number]
    ↓
Affichage :
    - Carte du bébé (image, taille, poids, description)
    - Symptômes de la maman (mom_body_text_fr)
    - Alertes (warnings_text_fr)
    - Articles recommandés (via recommended_articles_ids)
    - Compléments recommandés (via recommended_supplements_ids)
    - Événements du calendrier (via calendar_template_ids)
```

### 3.2 Navigation vers un article

```
Utilisateur clique sur un article recommandé
    ↓
Récupération de articles_db[article_id]
    ↓
Affichage du contenu complet (content_markdown_fr)
    ↓
Affichage des compléments liés (via related_supplements_ids)
```

### 3.3 Chatbot médical V0

```
Utilisateur pose une question
    ↓
Analyse des mots-clés de la question
    ↓
Recherche dans red_flags_db.keywords_fr
    ↓
Si match trouvé :
    - Afficher red_flags_db.standard_message_fr
    - Proposer articles liés (via linked_articles_ids)
Sinon :
    - Recherche dans articles_db.tags
    - Proposer articles pertinents
```

---

## 4. Schémas JSON pour Firestore

### 4.1 Collection `weeks`

```json
{
  "weekNumber": 12,
  "title": {
    "fr": "Semaine 12 – Fin du premier trimestre",
    "ar": "",
    "en": ""
  },
  "emoji": "🍋",
  "trimester": 1,
  "baby": {
    "sizeLabel": {
      "fr": "Citron",
      "ar": "",
      "en": ""
    },
    "sizeCm": 5.4,
    "weightG": 14,
    "development": {
      "fr": "Tous les organes vitaux sont formés...",
      "ar": "",
      "en": ""
    },
    "imageUrl": "week_12.png",
    "model3dUrl": ""
  },
  "mom": {
    "bodyText": {
      "fr": "La 12e semaine marque la fin du premier trimestre...",
      "ar": "",
      "en": ""
    },
    "warningsText": {
      "fr": "Consultez immédiatement si vous constatez...",
      "ar": "",
      "en": ""
    }
  },
  "recommendations": {
    "articleIds": ["a01", "a02", "a03"],
    "supplementIds": ["s01", "s02"],
    "calendarTemplateIds": ["c01", "c02"]
  }
}
```

### 4.2 Collection `articles`

```json
{
  "articleId": "a01",
  "title": {
    "fr": "Les examens médicaux du premier trimestre",
    "ar": "",
    "en": ""
  },
  "category": "santé",
  "summary": {
    "fr": "Découvrez les examens essentiels...",
    "ar": "",
    "en": ""
  },
  "content": {
    "fr": "## Introduction\n\nLe premier trimestre...",
    "ar": "",
    "en": ""
  },
  "tags": ["examens", "premier trimestre", "échographie"],
  "author": "Équipe médicale",
  "sources": "HAS, ACOG, NHS",
  "imageUrl": "article_a01.jpg",
  "relatedWeeks": [8, 9, 10, 11, 12],
  "relatedSupplementIds": ["s01", "s02"]
}
```

### 4.3 Collection `supplements`

```json
{
  "supplementId": "s01_acide_folique",
  "name": {
    "fr": "Acide folique (Vitamine B9)",
    "ar": "",
    "en": ""
  },
  "category": "vitamine",
  "shortDescription": {
    "fr": "Vitamine essentielle pour prévenir les anomalies du tube neural.",
    "ar": "",
    "en": ""
  },
  "pregnancySafety": "ok",
  "pregnancyNotes": {
    "fr": "L'acide folique est crucial dès la conception...",
    "ar": "",
    "en": ""
  },
  "typicalDose": {
    "fr": "L'OMS recommande 400 µg par jour...",
    "ar": "",
    "en": ""
  },
  "precautions": {
    "fr": "Aucun effet secondaire majeur aux doses recommandées...",
    "ar": "",
    "en": ""
  },
  "sources": "OMS 2024, ACOG 2020, HAS",
  "relatedSymptomIds": ["fatigue", "anemie"],
  "relatedArticleIds": ["a01", "a02"],
  "localizationNotes": "Aliments riches au Maghreb : légumes verts..."
}
```

### 4.4 Collection `redFlags`

```json
{
  "redFlagId": "rf01",
  "label": {
    "fr": "Saignements abondants",
    "ar": "",
    "en": ""
  },
  "keywords": {
    "fr": "saignements,hémorragie,sang,perte de sang,caillots",
    "ar": "",
    "en": ""
  },
  "severity": "emergency",
  "standardMessage": {
    "fr": "Des saignements abondants peuvent indiquer une complication sérieuse...",
    "ar": "",
    "en": ""
  },
  "linkedArticleIds": ["a01", "a12", "a19"],
  "sources": "ACOG, RCOG, NHS"
}
```

### 4.5 Collection `calendarTemplates`

```json
{
  "templateId": "c01",
  "title": {
    "fr": "Première consultation prénatale",
    "ar": "",
    "en": ""
  },
  "description": {
    "fr": "Votre premier rendez-vous officiel de suivi de grossesse...",
    "ar": "",
    "en": ""
  },
  "type": "medical",
  "weekMin": 8,
  "weekMax": 12,
  "importanceLevel": 3,
  "countryScope": "générique_MENA",
  "sources": "HAS, ACOG"
}
```

---

## 5. Améliorations structurelles proposées

### 5.1 Emojis améliorés pour `weeks_db`

**Problème actuel** : Les emojis actuels sont génériques et peu évocateurs.

**Proposition** : Utiliser des emojis plus pertinents et évolutifs par trimestre.

| Semaine | Emoji actuel | Emoji proposé | Justification |
|---------|--------------|---------------|---------------|
| 1-4 | 🌱 | 🌱 | Graine (début de vie) |
| 5-8 | 🫘 | 🫘 | Haricot (taille embryon) |
| 9-12 | 🍋 | 🍋 | Citron (fin T1) |
| 13-16 | 🍊 | 🥑 | Avocat (plus évocateur) |
| 17-20 | 🍐 | 🍐 | Poire (mi-parcours) |
| 21-24 | 🥭 | 🥭 | Mangue |
| 25-28 | 🥥 | 🥥 | Noix de coco |
| 29-32 | 🍉 | 🍉 | Pastèque |
| 33-36 | 🎃 | 🎃 | Citrouille |
| 37-40 | 👶 | 👶 | Bébé (terme) |

**Action recommandée** : Créer un script pour mettre à jour les emojis selon cette nouvelle logique.

### 5.2 Indexation et recherche

**Proposition** : Ajouter des champs d'indexation pour optimiser les recherches.

```json
{
  "searchIndex": {
    "keywords": ["fatigue", "nausées", "premier trimestre"],
    "weekRange": [1, 12],
    "categories": ["symptômes", "examens"]
  }
}
```

### 5.3 Versioning des contenus

**Proposition** : Ajouter un champ `version` et `lastUpdated` pour gérer les mises à jour médicales.

```json
{
  "metadata": {
    "version": "1.0",
    "lastUpdated": "2024-11-23",
    "reviewedBy": "Dr. X"
  }
}
```

---

## 6. Recommandations d'implémentation

### 6.1 Firebase/Firestore

- **Collections** : `weeks`, `articles`, `supplements`, `redFlags`, `calendarTemplates`
- **Indexation** : Créer des index composites sur `weekNumber`, `category`, `tags`
- **Sécurité** : Règles de lecture publique, écriture admin uniquement
- **Cache** : Utiliser le cache local Firestore pour mode hors-ligne

### 6.2 Structure de code (React/TypeScript)

```typescript
// types/database.ts
export interface Week {
  weekNumber: number;
  title: LocalizedText;
  emoji: string;
  trimester: 1 | 2 | 3;
  baby: BabyData;
  mom: MomData;
  recommendations: Recommendations;
}

export interface LocalizedText {
  fr: string;
  ar: string;
  en: string;
}

export interface BabyData {
  sizeLabel: LocalizedText;
  sizeCm: number;
  weightG: number;
  development: LocalizedText;
  imageUrl: string;
  model3dUrl?: string;
}

export interface MomData {
  bodyText: LocalizedText;
  warningsText: LocalizedText;
}

export interface Recommendations {
  articleIds: string[];
  supplementIds: string[];
  calendarTemplateIds: string[];
}
```

### 6.3 Migration des données

**Script de migration CSV → Firestore** :

```python
import firebase_admin
from firebase_admin import firestore
import pandas as pd

# Initialiser Firebase
firebase_admin.initialize_app()
db = firestore.client()

# Charger weeks_db.csv
df = pd.read_csv('weeks_db.csv')

# Migrer vers Firestore
for _, row in df.iterrows():
    doc_ref = db.collection('weeks').document(str(row['week_number']))
    doc_ref.set({
        'weekNumber': int(row['week_number']),
        'title': {
            'fr': row['title_fr'],
            'ar': row['title_ar'] or '',
            'en': row['title_en'] or ''
        },
        # ... autres champs
    })
```

---

## 7. Conclusion

Cette architecture fournit une base solide, évolutive et documentée pour l'application de suivi de grossesse. Les 5 datasets sont interconnectés de manière cohérente et prêts pour une intégration dans Firebase/Firestore.

**Points forts** :
- ✅ Structure multilingue native
- ✅ Relations explicites entre datasets
- ✅ Schémas JSON validés
- ✅ Documentation technique complète
- ✅ Propositions d'amélioration (emojis, indexation, versioning)

**Prochaines étapes** :
1. Validation de l'architecture par le client
2. Amélioration des emojis (si validée)
3. Création des scripts de migration CSV → Firestore
4. Initialisation du projet React + Firebase
