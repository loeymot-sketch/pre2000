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

### Collections Firestore

```
firestore/
├── users/
│   └── {userId}/
│       ├── profile: UserProfile
│       ├── preferences: {...}
│       └── ...
│
├── userEvents/
│   └── {eventId}/
│       ├── user_id: string
│       ├── title: string
│       ├── date: timestamp
│       └── ...
│
├── healthMetrics/
│   └── {metricId}/
│       ├── user_id: string
│       ├── type: 'weight' | 'blood_pressure'
│       ├── value: number | object
│       └── ...
│
└── userTasks/
    └── {taskId}/
        ├── user_id: string
        ├── completed: boolean
        └── ...
```

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
