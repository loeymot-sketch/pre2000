# Phase 2 : Architecture et structure de données

## 📋 Livrables de la Phase 2

Ce dossier contient tous les livrables de la **Phase 2 : Conception de l'architecture et structure de données** pour l'application de suivi de grossesse.

### Fichiers principaux

| Fichier | Description |
|---------|-------------|
| `architecture_complete.md` | Documentation complète de l'architecture des 5 datasets avec diagrammes relationnels, schémas JSON, et recommandations d'implémentation |
| `database.ts` | Schémas TypeScript pour tous les types de données (Week, Article, Supplement, RedFlag, CalendarTemplate, etc.) |
| `migrate_to_firestore.py` | Script Python complet pour migrer les datasets CSV vers Firebase Firestore |
| `improve_emojis.py` | Script Python pour améliorer les emojis dans weeks_db |
| `diagrams/data_model.mmd` | Diagramme Mermaid des relations entre datasets |
| `diagrams/data_model.png` | Version PNG du diagramme relationnel |

---

## 🏗️ Architecture des datasets

L'application repose sur **5 datasets interconnectés** :

1. **weeks_db** (40 entrées) - Dataset central synchronisé par semaine de grossesse
2. **articles_db** (20 entrées) - Contenu éditorial thématique
3. **supplements_pregnancy** (15 entrées) - Fiches compléments alimentaires
4. **red_flags_db** (15 entrées) - Symptômes d'alerte pour le chatbot V0
5. **calendar_templates_db** (15 entrées) - Modèles d'événements de calendrier

### Relations clés

```
weeks_db (central)
    ├─► articles_db (via recommended_articles_ids)
    ├─► supplements_pregnancy (via recommended_supplements_ids)
    └─► calendar_templates_db (via calendar_template_ids)

articles_db
    └─► supplements_pregnancy (via related_supplements_ids)

red_flags_db
    └─► articles_db (via linked_articles_ids)
```

---

## 🚀 Utilisation

### 1. Améliorer les emojis dans weeks_db

```bash
python3 improve_emojis.py
```

**Résultat** : Les emojis dans `weeks_db.csv` et `weeks_db.json` seront mis à jour avec des emojis plus pertinents et évolutifs par trimestre.

### 2. Migrer les données vers Firestore

**Prérequis** :
```bash
pip install firebase-admin pandas
```

**Exécution** :
```bash
python3 migrate_to_firestore.py \
    --credentials path/to/serviceAccountKey.json \
    --data-dir ../output
```

**Résultat** : Tous les datasets seront migrés vers les collections Firestore suivantes :
- `weeks`
- `articles`
- `supplements`
- `redFlags`
- `calendarTemplates`

### 3. Intégrer les schémas TypeScript dans le projet React

Copiez le fichier `database.ts` dans votre projet React/TypeScript :

```bash
cp database.ts /path/to/your/react-project/src/types/
```

**Utilisation dans le code** :

```typescript
import { Week, Article, Supplement } from './types/database';
import { calculateCurrentWeek, getLocalizedText } from './types/database';

// Exemple : Récupérer la semaine actuelle
const pregnancyStartDate = new Date('2024-03-15');
const currentWeek = calculateCurrentWeek(pregnancyStartDate);

// Exemple : Afficher un texte localisé
const week: Week = await getWeekData(currentWeek);
const title = getLocalizedText(week.title, 'fr');
```

---

## 📊 Diagramme relationnel

![Diagramme relationnel](diagrams/data_model.png)

Le diagramme complet est disponible dans `diagrams/data_model.mmd` (format Mermaid) et `diagrams/data_model.png` (format PNG).

---

## ✅ Améliorations apportées

### Emojis améliorés

Les emojis ont été revus pour être plus pertinents et évolutifs :

| Trimestre | Semaines | Emoji | Justification |
|-----------|----------|-------|---------------|
| T1 | 1-4 | 🌱 | Graine (début de vie) |
| T1 | 5-8 | 🫘 | Haricot (taille embryon) |
| T1 | 9-12 | 🍋 | Citron (fin T1) |
| T2 | 13-16 | 🥑 | Avocat |
| T2 | 17-20 | 🍐 | Poire (mi-parcours) |
| T2 | 21-24 | 🥭 | Mangue |
| T3 | 25-28 | 🥥 | Noix de coco |
| T3 | 29-32 | 🍉 | Pastèque |
| T3 | 33-36 | 🎃 | Citrouille |
| T3 | 37-40 | 👶 | Bébé (terme) |

### Schémas JSON validés

Tous les schémas JSON ont été validés et sont prêts pour une intégration directe dans Firestore. Ils suivent une structure cohérente avec :
- Support multilingue natif (FR/AR/EN)
- Relations explicites via IDs
- Types de données cohérents

### Documentation technique complète

Le fichier `architecture_complete.md` contient :
- Vue d'ensemble de l'architecture
- Structure détaillée de chaque dataset
- Diagrammes relationnels
- Flux de données principaux
- Schémas JSON pour Firestore
- Recommandations d'implémentation
- Propositions d'amélioration

---

## 📝 Prochaines étapes (Phase 3)

1. Initialiser le projet React + Firebase
2. Configurer Firebase (Authentication, Firestore, Hosting)
3. Implémenter les services de récupération de données
4. Développer les composants UI principaux

---

## 📞 Support

Pour toute question ou clarification sur l'architecture, consultez le fichier `architecture_complete.md` ou contactez l'équipe de développement.
