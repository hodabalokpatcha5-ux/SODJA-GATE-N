# Guide de Déploiement SODJA GATE (Supabase + Surge)

Pour que votre site soit stable et permanent, suivez ces étapes simples :

## 1. Configurer Supabase (Base de données)
1. Allez sur [Supabase](https://supabase.com/) et créez un nouveau projet.
2. Allez dans le menu **SQL Editor** à gauche.
3. Cliquez sur **New Query** et collez le contenu du fichier `SUPABASE_SCHEMA.sql`.
4. Cliquez sur **Run**. Vos tables sont prêtes !
5. Allez dans **Project Settings > Database** et copiez le **Connection String** (URI).
   - *Exemple : postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres*
   - Remplacez `[PASSWORD]` par votre mot de passe de projet.

## 2. Déployer le Serveur (Backend)
Le serveur (Node.js) doit être hébergé sur une plateforme comme **Render** ou **Railway** car Surge ne supporte que les sites statiques.
1. Créez un compte sur [Render.com](https://render.com/).
2. Créez un **Web Service** et connectez votre dépôt GitHub (ou téléchargez les fichiers).
3. Dans les **Environment Variables**, ajoutez :
   - `DATABASE_URL` = (Le Connection String de Supabase copié à l'étape 1)
   - `JWT_SECRET` = (Une clé secrète au hasard, ex: `sodja-gate-2026`)
   - `SMTP_USER` = (Votre email Gmail)
   - `SMTP_PASS` = (Votre mot de passe d'application Gmail)
   - `PORT` = `3000`
4. Une fois déployé, Render vous donnera une URL (ex: `https://sodja-gate.onrender.com`). **Copiez cette URL.**

## 3. Déployer le Site (Frontend) sur Surge
1. Dans votre dossier local, créez ou modifiez le fichier `.env` :
   - `VITE_API_URL` = (L'URL de votre serveur Render copiée à l'étape 2)
2. Ouvrez un terminal dans le dossier du projet.
3. Exécutez : `npm run build`
4. Exécutez : `npx surge dist`
5. Choisissez un nom de domaine (ex: `sodja-gate.surge.sh`).

**Bravo ! Votre site est maintenant en ligne et 100% fonctionnel.**
