# Plan orchestré — migration hex résiduels

**Source d’orchestration :** ce document remplace une sortie Claude Terminal si `claude --print` est indisponible (ex. org sans accès abonnement Claude Code → utiliser clé API ou admin).

**Exécutant :** agent Cursor (implémentation + `tsc` + `npm test` + `rg`).

---

## P1 — Feedback + calendrier (fait cycle courant)

| Fichier | Action |
|---------|--------|
| `theme/index.ts` | Jetons `feedbackSuccessBg`, `feedbackSuccessText`, `feedbackErrorBg`, `calendarPriority*` |
| `SuccessMessage.tsx` | Hex → `theme.colors` |
| `ErrorMessage.tsx` | Hex → `theme.colors` |
| `calendarService.ts` | `PRIORITY_COLORS` → `theme.colors` |

**Critères :** `rg '#[0-9A-Fa-f]{6}' app/src/services/calendarService.ts` ne matche plus les anciennes couleurs priorité ; `tsc` + tests OK.

---

## P2 — Auth + calendrier UI léger (≤4 fichiers) (**fait**)

| Fichier | Action |
|---------|--------|
| `AuthChoiceScreen.tsx` | `#aaa` → `theme.colors.neutral400` (ou équivalent) |
| `WeeklyStrip.tsx` | `#F0F9FF` → `theme.colors.sky50` |
| `WeekInfoSection.tsx` | `#FFECB3` → jeton ambre léger ou `gradientAmberEnd` si visuel OK |
| `MomTipsCard.tsx` | `#F0F9FF`, `#4FC3F7` → thème |

**Audit :** `rg '#[0-9A-Fa-f]{3,8}'` sur ces chemins uniquement.

---

## P3 — Home cards (≤5 fichiers) (**fait**)

| Fichier | Action |
|---------|--------|
| `theme/index.ts` | Jetons `pinkSoft300`, `brownText800`, `brownText700` |
| `BabyGrowthCard.tsx` | Gradient fin → `pinkSoft300` ; `#2D2D2D` → `neutral900` ; `#5D4E37` → `brownText700` |
| `BabyFactsCard.tsx` | `#5D4037` → `brownText800` |
| `WeekRemindersCard.tsx` | `ActivityIndicator` + styles → `orangeDeepAccent` / `brownText800` |

---

## P4 — Rappels / réglages (≤6 fichiers) (**fait**)

| Fichier | Action |
|---------|--------|
| `theme/index.ts` | Jetons `pinkAccentA100`, `warningTextDark`, `orangeStreakLight`, `purpleBorderLight`, `amberSurfaceSoft`, `pinkBorderSoft` |
| `HydrationCard.tsx` | Gradients / switch / bordures / bouton save → `theme.colors` |
| `RemindersTab.tsx` | Switch + bannière permission |
| `ReminderEditModal.tsx` | Bordure +/- |
| `StatisticsScreen.tsx` | Gradient streak |
| `SettingsScreen.tsx` | Bordure dev + encart info |

---

## P5 — Garde-fou (**fait**)

| Livrable | Détail |
|----------|--------|
| `scripts/check-theme-strings.sh` | Hex hors `theme/index.ts` ; aiguilles fixes `solid theme.colors`, `1px/2px solid theme.colors` en chaîne ; repli `grep` si `rg` absent |
| `package.json` | Script `npm run lint:colors` |

**Audit :** `cd app && npm run lint:colors` → exit 0.

---

## P6 — `rgba(...)` hors SSOT (**fait**)

- Tokens alpha dans `theme/index.ts` (`whiteAlpha*`, `blackAlpha*`, `primaryAlpha*`, `amber500Alpha*`, badges, etc.).
- Ombres **HTML/PDF** (chaînes `box-shadow` complètes) : `theme.shadows.pdfRoot` / `theme.shadows.pdfHeader` — pas sous `colors`.
- Écrans / composants : plus de littéraux `rgba(...)` hors `theme/index.ts` et `styleUtils` (`hexToRgba` exporté pour chart-kit / opacité dynamique). `buildShadow` web garde `rgba(0,0,0,${opacity})` (opacité variable).
- **C1 — garde-fou** : `lint:colors` scanne aussi `rgba(` (exit **3** si hors SSOT) ; `npm run verify` = colors + tsc + jest.
- **C2 — CI** : `app/.github/workflows/ci.yml` et `eas-build.yml` appellent `npm run verify` après `npm ci`.

**Audit :** `npm run lint:colors && npx tsc --noEmit && npm test` → exit 0 (294 tests).

---

*Ordre : P1 → P6 ; arrêt si régression tests.*
