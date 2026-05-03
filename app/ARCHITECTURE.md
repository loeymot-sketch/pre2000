# 🏗️ Architecture - Pregnancy App

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ HomeScreen  │ │ Calendar    │ │ Chatbot     │ │ Health      ││
│  │             │ │ Screen      │ │ Screen      │ │ Dashboard   ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘│
└─────────┼───────────────┼───────────────┼───────────────┼───────┘
          │               │               │               │
┌─────────┴───────────────┴───────────────┴───────────────┴───────┐
│                         COMPONENTS LAYER                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ EventCard   │ │ WeeklyStrip │ │ HealthChart │ │ ReminderCard││
│  │ BabyMessage │ │ MonthGrid   │ │ WeightGraph │ │ TaskItem    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │               │               │               │
┌─────────┴───────────────┴───────────────┴───────────────┴───────┐
│                          CONTEXT LAYER                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │   AuthContext    │  │   ToastContext   │  │  i18nContext   │ │
│  │  (User Session)  │  │  (Notifications) │  │  (Languages)   │ │
│  └────────┬─────────┘  └──────────────────┘  └────────────────┘ │
└───────────┼─────────────────────────────────────────────────────┘
            │
┌───────────┴─────────────────────────────────────────────────────┐
│                         SERVICES LAYER                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ calendar    │ │ health      │ │ notification│ │ reminder    ││
│  │ Service     │ │ Service     │ │ Service     │ │ Service     ││
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤│
│  │ chatbot     │ │ content     │ │ babyMessage │ │ tips        ││
│  │ Service     │ │ Service     │ │ Service     │ │ Service     ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘│
└─────────┼───────────────┼───────────────┼───────────────┼───────┘
          │               │               │               │
┌─────────┴───────────────┴───────────────┴───────────────┴───────┐
│                          DATA LAYER                              │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐│
│  │       Firebase/Firestore    │  │      AsyncStorage          ││
│  │  - userEvents               │  │  - reminderSettings        ││
│  │  - userProfiles             │  │  - completedTasks          ││
│  │  - healthMetrics            │  │  - preferences             ││
│  └─────────────────────────────┘  └────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Static JSON Data                          ││
│  │  weeks_db.json │ articles.json │ supplements.json │ tips    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de Données

### Authentification

```
User Login/Register
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AuthChoice  │────▶│   Firebase   │────▶│  AuthContext │
│   Screen     │     │     Auth     │     │  (Provider)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                            ┌─────────────────────┼─────────────────────┐
                            ▼                     ▼                     ▼
                     ┌──────────┐          ┌──────────┐          ┌──────────┐
                     │   Home   │          │ Calendar │          │ Profile  │
                     │  Screen  │          │  Screen  │          │  Screen  │
                     └──────────┘          └──────────┘          └──────────┘
```

### Calendrier & RDV

```
┌──────────────┐
│ CalendarScreen│
└───────┬──────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                    calendarService.ts                      │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ loadUserEvents  │  │ loadTemplates   │                 │
│  │ (Firestore)     │  │ (Static JSON)   │                 │
│  └────────┬────────┘  └────────┬────────┘                 │
│           │                    │                          │
│           ▼                    ▼                          │
│  ┌─────────────────────────────────────────┐              │
│  │      getCombinedEventsForWeek()         │              │
│  │  - Merge user events + templates        │              │
│  │  - Filter by date range                 │              │
│  │  - Sort by date                         │              │
│  └─────────────────────────────────────────┘              │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  Display in UI                                             │
│  - Week View: WeeklyStrip + EventList                     │
│  - Month View: MonthGrid + EventDetails                   │
└───────────────────────────────────────────────────────────┘
```

---

## 📁 Services Détaillés

### calendarService.ts
```typescript
// Responsabilité: Gestion complète du calendrier
export {
  loadCalendarTemplates,  // Charge templates depuis Firestore
  generateAllEvents,      // Génère événements selon semaine
  loadUserEvents,         // Charge RDV utilisateur
  saveUserEvent,          // Sauvegarde nouveau RDV
  updateUserEvent,        // Modifie RDV existant
  deleteUserEvent,        // Supprime RDV
  getCombinedEventsForWeek, // Combine templates + user events
  getLocalDateKey,        // Formate date timezone local
}
```

### healthService.ts
```typescript
// Responsabilité: Suivi santé (poids, tension)
export {
  saveHealthMetric,       // Enregistre mesure
  getHealthHistory,       // Historique par type
  getHealthStats,         // Statistiques agrégées
  calculateBMI,           // Calcul IMC
}
```

### notificationService.ts
```typescript
// Responsabilité: Notifications push
export {
  requestPermissions,     // Demande permissions
  scheduleNotification,   // Programme notification
  cancelNotification,     // Annule notification
  scheduleRDVReminder,    // Rappel RDV
}
```

---

## 🗃️ Modèle de Données

### Source-of-truth par feature (audited 2026-05)

| Feature | Source réelle | Notes |
|---|---|---|
| Auth | Firebase Auth + AsyncStorage `user_profile` | Restauration rapide depuis cache |
| Profil grossesse | Firestore `userProfiles/{uid}` (auth) ou AsyncStorage `guestProfile` (guest) + PregnancyContext | 3 sources synchronisées |
| Home daily | Firestore `weeks`, `tips`, `babyMessages`, `articles` (recos), `userEvents`, `userTasks` | Pas de `calendarTemplates` direct |
| Calendrier | Firestore `userEvents` + `calendarTemplates` | RDV temps réel + templates de suggestions |
| Articles | Firestore `articles` ∪ `articlesAntigravity` (fusion) | Détail = priorité Antigravity, fallback `articles` |
| Suppléments | Firestore `supplements` | Cache via `contentService` côté Home |
| Health Dashboard | Firestore `healthMetrics`, `glucoseMetrics`, `symptomsLog`, `weight_entries`, `userEvents`, `userTaskStatuses` | `getMergedWeightHistory` fusionne `healthMetrics` + `weight_entries` |
| Weight Tracker | Firestore `weight_entries` (via `weightService`) + AsyncStorage `@weight_entries_${uid}` (guest) | Distinct de `healthMetrics`, helper de fusion dans `healthService` |
| Rappels V2 | Firestore `reminder_settings_v2` (auth) + AsyncStorage `reminders_v2_settings_guest` (guest) | Completions toujours en AsyncStorage par design |
| Chatbot | **Local** : `LocalChatbotRepository` + `KeywordEngine` + `VectorEngine` sur `chatbot_data` (JSON embarqué) | Aucun appel LLM externe ; 100% offline ; RGPD-friendly |
| Évolution Bébé | Statique : `babyGrowthData.ts` + assets `assets/images/baby-3d/month-{1..9}.png` | Lit la semaine via PregnancyContext uniquement |
| Aliments interdits | Statique : `data/forbidden_foods.json` + i18n (fr/en/ar/tn) | TN partiel, fallback chain TN→AR→EN→FR |
| Export PDF/JSON | Firestore (collections user) — voir `dataExportService.ts` | Parité requise avec `deleteAccount` (RGPD) |
| Diagnostic | Firestore `getCountFromServer` sur catalogues publics | Bouton accessible en `__DEV__` uniquement |
| Analytics | `firebase/analytics` (Web SDK) — **no-op en RN** | Migration vers `@react-native-firebase/analytics` requise |
| i18n | JSON `src/i18n/locales/{fr,ar,en,tn}/*.json` + Firestore (champs suffixés `_fr`, `_ar`, etc.) | Helpers `getLocalizedContent` + `getLocalizedTrilang` |

### Collections Firestore complètes

```
firestore/
├── users/{userId}                       # legacy, peu utilisé
├── userProfiles/{userId}                # profil grossesse (auth)
│
├── userEvents/{eventId}                 # RDV (filtré par user_id)
├── userTasks/{taskId}                   # tâches custom (filtré par user_id)
├── userTaskStatuses/{statusId}          # complétion des reminders V1
├── userReminderSettings/{settingId}     # réglages V1 (legacy)
│
├── healthMetrics/{metricId}             # type: 'weight' | 'blood_pressure'
├── weight_entries/{entryId}             # pipeline weightService (séparé)
├── glucoseMetrics/{metricId}            # glycémie (P1.1 — rules ajoutées)
├── symptomsLog/{logId}                  # symptômes du jour (P1.1 — rules ajoutées)
│
├── reminder_settings_v2/{userId}        # réglages V2 (auth)
│
└── [catalogues lecture publique — non liés à un user]
    ├── weeks/{1..40}
    ├── articles/{articleId}
    ├── articlesAntigravity/{articleId}
    ├── supplements/{supplementId}
    ├── calendarTemplates/{templateId}
    ├── reminderTemplates/{templateId}
    ├── babyMessages/{messageId}
    ├── tips/{tipId}
    ├── redFlags/{flagId}
    └── chatbotSuggestionsAG/{suggestionId}
```

### Invariants critiques (vérifiés au build)

1. **INV-2** : Toute collection écrite par le code DOIT avoir un `match` dans `firestore.rules`
2. **INV-3** : Toute collection user DOIT être purgée par `AuthContext.deleteAccount()` (RGPD)
3. **INV-5** : `syncRemindersToNotifications` DOIT recevoir `user.uid` (sinon fallback guest erroné)
4. **INV-9** : Toute notif RDV DOIT utiliser le timezone du `user.country`

### Types Principaux

```typescript
interface UserProfile {
  uid: string;
  firstName: string;
  pregnancyStartDate: string;  // ISO date
  currentWeek: number;         // 1-40
  country: string;
  isGuest: boolean;
}

interface UserEvent {
  event_id: string;
  user_id: string;
  title: string;
  date: string;      // ISO date
  week: number;
  type: 'appointment';
  location?: string;
  notes?: string;
}

interface CombinedEvent {
  id: string;
  title: string;
  date: Date;
  source: 'template' | 'user';
  // ...
}
```

---

## 🌐 Internationalisation (i18n)

```
i18n/
├── index.ts          # Configuration i18next
├── rtl.ts            # Support Right-to-Left (Arabe)
└── locales/
    ├── fr/
    │   ├── common.json    # Textes communs
    │   ├── auth.json      # Authentification
    │   └── calendar.json  # Calendrier
    ├── ar/               # Arabe (structure identique)
    └── en/               # Anglais (structure identique)
```

### Utilisation
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<Text>{t('common:welcome')}</Text>
```

---

## 🔐 Sécurité

### Règles Firestore (firestore.rules)
```javascript
// Chaque utilisateur peut lire/écrire ses propres données
match /userEvents/{eventId} {
  allow read, write: if request.auth != null 
    && request.auth.uid == resource.data.user_id;
}
```

### Bonnes Pratiques
- ✅ Variables sensibles dans .env
- ✅ Authentification Firebase obligatoire
- ✅ Règles Firestore par utilisateur
- ⚠️ API keys client-side (normal pour Firebase web)

---

## 🧪 Testing Strategy

```
tests/
├── unit/
│   ├── services/
│   │   └── calendarService.test.ts
│   └── utils/
│       └── dateUtils.test.ts
│
├── integration/
│   └── screens/
│       └── CalendarScreen.test.tsx
│
└── e2e/
    └── flows/
        └── createAppointment.test.ts
```

---

*Architecture Document - Pregnancy App - Décembre 2025*
