# Plan de Correction Priorisé
**Date :** 2026-05-04
**Application :** mama-bebe (pre2000)

## Backlog Priorisé

### 🔴 P1 : Désalignement Environnement Node.js (Priorité Haute)
*   **Description :** La CI utilise Node 20, le local Node 18.20.7. Cela a causé des avertissements `EBADENGINE` lors des installations et peut créer des builds inconsistants.
*   **Fichier concerné :** `package.json` et Environnement Local (NVM).
*   **Effort :** Small (S)
*   **Solution :**
    1.  Mettre à jour le dev de la machine (`nvm install 20 && nvm alias default 20`).
    2.  Ajouter un champ `"engines": { "node": ">=20.0.0" }` strict dans `package.json`.

### 🟡 P2 : Optimisation des scripts CI (Priorité Moyenne)
*   **Description :** Le script `verify` appelle TypeScript avec `npx tsc`. Cela provoque un téléchargement à chaque build ou une dépendance au réseau non justifiée.
*   **Fichier concerné :** `app/package.json`
*   **Effort :** Small (S)
*   **Solution :**
    1. Remplacer `"verify": "npm run lint:colors && npx tsc --noEmit && npm test -- --passWithNoTests"` par `"verify": "npm run lint:colors && tsc --noEmit && npm test -- --passWithNoTests"`.

### 🟢 P3 : Surveillance i18n
*   **Description :** Bien que l'écran StatisticsScreen utilise correctement `t('noDataYet')` de façon résolue par `index.ts`, une convention Namespace comme `t('common.noDataYet')` serait plus robuste.
*   **Fichier concerné :** `app/src/screens/reminders/StatisticsScreen.tsx`
*   **Effort :** Small (S)

## Ordre d'implémentation suggéré :
1.  **Immédiat (Développeur) :** `nvm use 20`
2.  **Commit 1 :** Correction du `package.json` (script `verify`).
3.  **Commit 2 :** Optionnel - Ajout du namespace explicite `common:` dans l'utilisation de `i18n`.
