# 🚀 Guide de Déploiement du Site Web

Voici comment mettre en ligne votre site (Landing Page + Privacy Policy + Support) gratuitement avec Vercel en 2 minutes.

## Option 1 : Via le Terminal (Recommandé & Rapide)

Vous avez mentionné connaître Vercel. Voici les commandes exactes à lancer depuis votre projet :

1.  **Ouvrez le terminal** dans le dossier principal du projet (`pregnancy-app`).
2.  **Allez dans le dossier website** :
    ```bash
    cd website
    ```
3.  **Lancez le déploiement** :
    ```bash
    vercel deploy --prod
    ```
    *(Si on vous demande "Set up and deploy?", dites `Y`. Laissez les options par défaut).*

🎉 **C'est tout !** Vercel va vous donner une URL (ex: `mamabebe-website.vercel.app`).

## Option 2 : Via GitHub (Automatique)

1.  Poussez ce dossier `website` sur votre GitHub.
2.  Allez sur [Vercel.com](https://vercel.com) > "New Project".
3.  Importez votre repo GitHub.
4.  **IMPORTANT** : Dans "Root Directory", cliquez sur "Edit" et sélectionnez le dossier `website`.
5.  Cliquez sur "Deploy".

## 🔗 URL à mettre dans App Store Connect

Une fois déployé, vous aurez une URL (ex: `https://votre-projet.vercel.app`).
Utilisez-la pour remplir les champs dans App Store Connect :

*   **URL Politique de confidentialité** : `https://votre-projet.vercel.app/privacy.html`
*   **URL Assistance (Support)** : `https://votre-projet.vercel.app/support.html`
*   **URL Marketing** : `https://votre-projet.vercel.app/index.html`

## 🌍 Nom de Domaine Personnalisé (Optionnel mais Pro)

Si vous achetez `mamabebe.tn` ou `.com` :

1.  Allez sur votre tableau de bord **Vercel** > **Settings** > **Domains**.
2.  Entrez votre domaine (ex: `mamabebe.tn`).
3.  Vercel vous donnera des **DNS (Nameservers)** ou un **Enregistrement A** à copier chez votre "Registrar" (là où vous avez acheté le domaine, ex: OVH, GoDaddy).
4.  C'est tout ! Vercel gère le HTTPS automatiquement.

### 💡 Stratégie Multi-Domaines (.com + .tn)
Puisque vous avez les deux :
1.  Ajoutez **les deux** domaines dans Vercel.
2.  Définissez le **.com** comme "Primary" (Principal).
3.  Mettez le **.tn** en mode "Redirect to Primary".
👉 Ainsi, tout le trafic ira vers le `.com` (meilleur pour le SEO et l'image de marque), mais les gens qui tapent `.tn` arriveront quand même au bon endroit.

C'est prêt ! ✅
