# Plan — Suite E2E web (Playwright in-repo)

## État actuel (baseline)

- **Commande** : `cd app && npm run e2e:web` (Playwright, `e2e/`, `baseURL` = `E2E_BASE_URL` ou `http://localhost:8081`).
- **Prérequis** : Expo web déjà servi sur le port attendu (`npx expo start --web --port 8081` ou équivalent).
- **Résultat** : 4 scénarios smoke verts (tabs, URLs onglets, calendrier → ajout RDV, rappels → Tasks → Stats).
- **Stats** : assertion finale = **URL** `/Statistics/` (stable avec Metro « périmé » ou pile de navigation). **`testID` `statistics_screen_root`** est présent dans `StatisticsScreen.tsx` pour tooling / future assert dès bundle CI frais (voir phase 1.2 / 4.0).

## Objectif produit

Avoir une **preuve reproductible en local et en CI** que les parcours critiques web ne régressent pas, sans dépendre du MCP navigateur dans le chat.

---

## Phase 1 — Qualité des assertions (court terme)

| # | Action | Critère d’acceptation | Statut |
|---|--------|----------------------|--------|
| 1.1 | Ajouter `testID` racine sur `StatisticsScreen` (`statistics_screen_root` sur loading / vide / `ScrollView`) | Cible Playwright / accessibilité tooling | **Fait** |
| 1.2 | Assert Playwright `getByTestId('statistics_screen_root')` après `/Statistics/` | Vert avec bundle à jour | **Différé** : un Expo déjà lancé sert souvent un bundle **sans** ce `testID` → 0 match. Réactiver après **Phase 4** (`webServer` CI ou doc stricte `--clear`). |
| 1.3 | (Optionnel) Même principe pour l’écran Tasks si des flakies apparaissent | `testID` documenté dans le composant | À faire si besoin |

**Hors scope** : refonte i18n globale — seulement vérifier que l’UI Stats n’affiche plus de littéraux `common.*` après rebuild Metro si un cas réapparaît.

**Smoke actuel** : assertion **URL** `/Statistics/` uniquement (stable même si Metro périmé).

---

## Phase 2 — Documentation développeur

| # | Action | Critère d’acceptation | Statut |
|---|--------|----------------------|--------|
| 2.1 | Section courte dans `app/README.md` : prérequis, `E2E_BASE_URL`, commandes `e2e:web` / `:ui` / `:headed` | Nouveau dev peut lancer les E2E en < 5 min | **Fait** (sous « E2E web (Playwright) ») |
| 2.2 | Note **Metro** : en cas de textes de clés i18n bruts, `npx expo start --web --clear` | Réduit les « stale bundle » | **Fait** (même section README) |

---

## Phase 3 — Intégration `verify` (local / PR)

| # | Action | Critère d’acceptation |
|---|--------|----------------------|
| 3.1 | Décision : **ne pas** inclure Playwright dans `npm run verify` par défaut (serveur web requis) | `verify` reste rapide et sans serveur |
| 3.2 | Ajouter script explicite `verify:e2e:web` ou documenter « pipeline complet » = démarrer Expo puis `e2e:web` | README + éventuel script shell `scripts/e2e-web.sh` qui attend `HTTP 200` sur `baseURL` puis lance Playwright |

---

## Phase 4 — CI (GitHub Actions ou équivalent)

| # | Action | Critère d’acceptation |
|---|--------|----------------------|
| 4.0 | (Recommandé) `webServer` dans `playwright.config.ts` : démarrer Expo web dans le job, `reuseExistingServer: false` en CI | Bundle aligné sur le commit testé → débloque **1.2** (`getByTestId`) |
| 4.1 | Job dédié `e2e-web` : install deps app, `npx expo start --web --port 8081` en arrière-plan, attente health (curl / wait-on), `E2E_BASE_URL=http://127.0.0.1:8081 npm run e2e:web` | Job vert sur branche principale |
| 4.2 | Artefacts : `playwright-report/` + traces sur échec (déjà support Playwright) | Diagnostic sans machine locale |

**Contraintes** : timeout généreux premier cold start ; cache `node_modules` / Expo si possible.

---

## Phase 5 — Extension de couverture (priorisée)

Ordre suggéré (faible coût → valeur) :

1. **Resources** : ouverture d’un article / liste (URL stable).
2. **Chatbot** : présence du champ ou du conteneur (sans appeler API externe si flaky).
3. **Langue** : si bootstrap multi-langue, un test « URL Language » ou skip documenté.

Chaque nouveau test doit **nommer** son prérequis data (guest vs compte).

---

## Risques / points d’attention

- **Flaky** : timing réseau / Firebase / App Check sur web → préférer mocks ou parcours guest-only dans le smoke.
- **Isolation** : ne pas mélanger tests qui nécessitent compte réel sans secrets CI.
- **Coût CI** : limiter à Chromium pour le smoke ; Firefox/WebKit en job optionnel ou hebdo.

---

## Ordre d’exécution recommandé

1. Phase **1** : **1.1** fait ; **1.2** après **4.0** (bundle garanti).  
2. Phase **2** (README — section E2E ajoutée ; compléter si besoin).  
3. Phase **3** (script / convention verify).  
4. Phase **4** (CI + idéalement `webServer` Playwright).  
5. Phase **5** (nouveaux scénarios au fil des régressions observées).

---

## Suivi

Cocher les cases au fil des implémentations ; une PR peut couvrir Phase 1 + 2 ensemble.
