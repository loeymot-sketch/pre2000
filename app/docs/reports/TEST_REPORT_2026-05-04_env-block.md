# Rapport Technique des Tests (E2E, Unitaires, Lint)
**Date :** 2026-05-04
**Contexte :** Application Expo / React Native mama-bebe (pre2000)

## 1. Résumé Exécutif
La campagne de tests a été sévèrement bloquée par un problème critique d'environnement : l'absence d'accès réseau (sandbox) combinée à un état `node_modules` corrompu (dossier `.bin` manquant). Par conséquent, les commandes `npm ci`, `npx tsc`, `jest`, et `expo start` ont toutes échoué, empêchant l'exécution des tests automatisés et manuels. L'application ne peut actuellement pas être validée en local dans cet environnement.

## 2. Environnement de Test
*   **OS :** mac
*   **Node.js :** v18.20.7 (Attention : la CI utilise la v20)
*   **Git Branch :** main
*   **Git Commit :** 4ba64c91c9c7f53f54d01c5ef702925a081cdde0
*   **Versions Clés :**
    *   expo : 54.0.34
    *   @playwright/test : 1.59.1
    *   react-native : 0.81.5
    *   react-native-web : 0.21.2
*   **Variables d'environnement (.env) :** Présent (clés présentes : oui)
*   **URL E2E :** http://localhost:8081 (Défaut)
*   **Expo Start `--clear` :** Utilisé (mais échec au lancement)

## 3. Tableau des Résultats

| ID | Suite / Scénario | Statut | Durée | Remarques |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | Vérification projet (npm ci + verify) | **FAIL** | 10s | Échec réseau sur `npx tsc` et `npm ci`. Dossier `.bin` manquant dans `node_modules`. |
| **A2** | Jest seul | **SKIP** | - | Bloqué par l'échec de A1 (binaire `jest` non trouvé et échec réseau `npx`). |
| **A3** | E2E web Playwright | **FAIL** | - | Impossible de télécharger les navigateurs (`npx playwright install chromium` = `ENOTFOUND`) ou de démarrer le serveur Expo. |
| **M1** | Cold start web | **SKIP** | - | Impossible de lancer `expo start --web`. |
| **M2** | Onboarding invité | **SKIP** | - | Idem. |
| **M3** | Onglets principaux | **SKIP** | - | Idem. |
| **M4** | Calendrier → ajouter RDV | **SKIP** | - | Idem. |
| **M5** | Reminders → Tasks → Stats | **SKIP** | - | Idem. |
| **M6** | Changement de langue | **SKIP** | - | Idem. |
| **M7** | Réseau désactivé/lent | **SKIP** | - | Idem. |
| **O1** | Alignement local avec CI | **FAIL** | - | La CI utilise Node 20, l'environnement local Node 18.20.7. |

## 4. Findings et Artefacts

### F-001 : Environnement réseau restreint et node_modules corrompus (P0)
*   **Gravité :** P0 (Bloquant complet)
*   **Fichier Suspect :** `package.json` (usage de `npx` dans les scripts de vérification au lieu d'utiliser le binaire local), environnement sandbox.
*   **Repro :** Lancer `npm run verify` ou `npm install` sans réseau externe.
*   **Preuve :**
    ```
    npm error network request to https://registry.npmjs.org/tsc failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
    ```

### F-002 : Désalignement de version Node.js entre local et CI (P1)
*   **Gravité :** P1
*   **Fichier Suspect :** `.github/workflows/ci.yml` / Environnement local
*   **Repro :** Comparer `node -v` (v18.20.7) et la définition `.github/workflows/ci.yml` (node-version: '20').
*   **Preuve :** Warnings NPM `Unsupported engine { package: '@react-native/...', required: { node: '>= 20.19.4' }, current: { node: 'v18.20.7' } }`.

## 5. Annexes
*   *Aucune trace Playwright générée car l'installation du navigateur a échoué.*
