# Audit post-commits + plan orchestré — 2026-05-03

Document de synthèse après les lots **C1/C2** (SSOT couleurs, `verify`, CI), **M2** (découpage commits), et le mega-commit applicatif `6ec5481`.

---

## 1. Verdict global

| Verdict | Détail |
|--------|--------|
| **Mergeable (technique)** | Oui — `npm run verify` vert : `lint:colors` + `tsc` + **294** tests Jest. |
| **Mergeable (produit)** | Conditionnel — revue humaine recommandée sur **Firestore rules**, **auth/export/notifications** (contenu du commit `6ec5481`), et **smoke visuel** (RTL + écrans sensibles). |

**Synthèse :** la base est **cohérente et gardée par la CI** ; les risques restants sont surtout **revue de fond**, **taille de diff**, et **preuve visuelle**, pas des régressions détectées par les tests actuels.

---

## 2. Gates machine (preuve)

| Gate | Commande / critère | Résultat |
|------|-------------------|----------|
| SSOT hex | `lint:colors` (hors `theme/index.ts` + `__tests__`) | OK |
| SSOT `rgba(` | idem (hors `theme/index.ts` + `styleUtils.ts`) | OK |
| Motifs CSS bug | `solid theme.colors` (aiguilles fixes) | **0** occurrence |
| TypeScript | `tsc --noEmit` | OK |
| Tests | Jest — 24 suites | **294 / 294** |
| CI GitHub | `ci.yml` + `eas-build.yml` appellent `npm run verify` | OK (à valider au **premier push** sur `origin`) |

---

## 3. Cohérence repo (git + structure)

- **8 commits** au-dessus de `origin/main` : découpage logique (CI → theme → docs → common → tests → app massif → `.gitignore` racine).
- **Point faible connu :** `6ec5481` concentre **117 fichiers** (écrans, services, i18n, assets, `firestore.rules`). C’est **acceptable pour livrer**, mais **coûteux à relire** et à cherry-pick. Les prochains lots devraient rester **< 30 fichiers** quand possible.
- **Branche :** `main...origin/main [ahead 8]` — **push + PR** (ou push direct) restent à faire côté humain / réseau.

---

## 4. Risques résiduels (raisonnement)

### R1 — Sévérité **haute** (process / sécurité)

- **`firestore.rules`** et **`AuthContext`** ont voyagé dans le même commit massif que l’UI. Les tests (`firestoreRulesParity`, auth) **augmentent la confiance** mais ne remplacent pas une **relecture sécurité** (chemins `match`, `request.auth.uid`, données sensibles).

**Action :** gate humain « security skim » avant prod ; idéalement PR dédiée rules/auth à l’avenir.

### R2 — Sévérité **moyenne** (régressions visuelles)

- Thème **alpha** + **RTL** : les tests ne voient pas les **contrastes** ni les **gradients** cassés.
- **Action :** smoke manuel court (liste §6).

### R3 — Sévérité **moyenne** (CI réelle)

- Tant que GitHub Actions n’a **pas tourné** sur cette série de commits, reste une incertitude (cache npm, version Node 18 vs politique Expo, chemins `working-directory: ./app`). Probabilité de casse : **faible** (déjà validé en local).

**Action :** ouvrir la PR et vérifier le run vert.

### R4 — ~~Sévérité basse (dette technique)~~ **traité (C3)**

- `buildShadow` (branche **web**) utilise désormais **`hexToRgba(color, opacity)`** ; `hexToRgba` vit dans `src/utils/hexToRgba.ts` (pas de cycle `theme` ↔ `styleUtils`).

### R5 — ~~Hygiène tests~~ **partiellement traité (H1)**

- Sous **`NODE_ENV=test`**, `logger.info` / `success` / `warn` / `debug` ne **loggent plus** en console ; **`logger.error`** reste inchangé.  
- D’autres `console.*` directs dans des services peuvent encore apparaître — hors scope du logger central.

### R6 — Sévérité **basse** (outillage)

- `lint:colors` sans `rg` en local : fallback `grep` (déjà documenté). CI Ubuntu a souvent `rg` ; sinon le scan hex reste via `grep`.

**Action :** optionnel — `sudo apt-get install ripgrep` dans le job CI.

---

## 5. Plan de correction orchestré (cycles)

Convention : **PLAN → EXECUTE → VALIDATE** avec `npm run verify` en fin de lot.

| ID | Objectif | Fichiers typiques | Gate |
|----|----------|-------------------|------|
| **C3** | ~~Corriger `buildShadow` web~~ **fait** | `theme/index.ts`, `utils/hexToRgba.ts`, `styleUtils.ts`, `check-theme-strings.sh` | `verify` |
| **H1** | ~~Silence logger en Jest~~ **fait** (partiel) | `logger.ts` | `verify` |
| **I1** | ~~Option CI : installer `rg`~~ **fait** | `ci.yml`, `eas-build.yml` | run GH vert |
| **V1** | Smoke visuel manuel (FR + AR/TN) | — | checklist humaine |
| **G1** | Push `main` → `origin` + vérifier Actions | — | humain |
| **R2** | (Option) Éclater rétroactivement `6ec5481` en 3–5 commits via `git rebase -i` **avant push** si l’équipe exige historique fin | — | **humain** (risque de réécrire l’historique) |

**Recommandation :** ne **pas** rebaser `6ec5481` si `main` est déjà poussé partagé ; à la place, **discipline forward** sur les prochains lots.

---

## 6. Checklist smoke manuel (V1) — 15–20 min

1. **Home** — header gradient, chevrons semaine, modale profil, `EmptyState` / `Skeleton` si déclenchés.  
2. **Calendrier** — header, badges, toggle de vue, RTL **ar** ou **tn**.  
3. **Statistiques** — graphiques (couleurs axes), streak.  
4. **Export PDF** — une génération : en-tête, ombre cartes (`theme.shadows`).  
5. **Onboarding** — retour matériel (`BackHandler`) sans boucle.  

Critère d’échec : texte illisible, chevron du mauvais côté, overlay noir complet, PDF blanc cassé.

---

## 7. Missions restantes (ordre suggéré)

1. **`git push origin main`** (ou PR) — débloque la **preuve CI** (R3).  
2. **V1** — smoke §6 ; noter les écarts dans une issue ou `CHANGELOG` « Known UI ».  
3. **C3** — alignement ombre web `buildShadow` (dette R4).  
4. **H1** — silence logs tests (R5).  
5. **Roadmap produit bloquée** (hors ce doc) — paiement, iCloud, fournisseur externe : prérequis humains déjà décrits dans `ORCHESTRATION_LOOP.md` §4.

---

## 8. Conclusion

- **Côté machine :** tout est **bon** — SSOT couleurs/`rgba`, typage, tests, CI configurée.  
- **Côté livraison :** il manque la **preuve distante** (Actions), la **revue** du bloc sécurité/rules/auth, et un **smoke visuel** RTL.  
- **Plan de correction** : cycles **C3**, **H1**, **I1** (option), plus **V1** + **G1** humains.

*Dernière boucle : **C3** + **H1** exécutés localement (`verify` vert). Prochaine mise à jour : après premier run GitHub Actions + smoke **V1**.*
