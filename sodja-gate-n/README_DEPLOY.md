# Guide de Déploiement SODJA GATE

Ce guide vous explique comment déployer votre application en utilisant **Supabase** pour la base de données et **Surge** pour le site web.

## 1. Base de données (Supabase)
1. Allez sur votre projet [Supabase](https://supabase.com).
2. Ouvrez le **SQL Editor**.
3. Copiez le contenu du fichier `supabase.sql` (que j'ai créé à la racine du projet) et exécutez-le.
4. Allez dans **Project Settings > Database** et copiez votre **Connection String** (URI). Elle ressemble à :
   `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## 2. Serveur (Backend)
Le serveur Express doit être hébergé sur une plateforme comme **Render** ou **Railway**.
1. Créez un service sur [Render.com](https://render.com).
2. Ajoutez les variables d'environnement suivantes :
   - `DATABASE_URL` : Votre lien Supabase (étape 1).
   - `JWT_SECRET` : Une phrase secrète (ex: `ma-super-cle-secrete`).
   - `SMTP_USER` : Votre email Gmail.
   - `SMTP_PASS` : Votre mot de passe d'application Gmail.
3. Notez l'URL de votre serveur une fois déployé (ex: `https://sodja-gate-api.onrender.com`).

## 3. Site Web (Frontend - Surge)
1. Ouvrez votre terminal dans le dossier du projet.
2. Lancez la commande suivante en remplaçant l'URL par celle de votre serveur (étape 2) :
   ```bash
   VITE_API_URL=https://votre-url-serveur.onrender.com npm run deploy:frontend
   ```
3. Surge vous demandera de vous connecter et de choisir un domaine (ex: `sodja-gate.surge.sh`).

---
**Note :** Toutes les modifications sont déjà en place dans ce dossier. Vous pouvez le télécharger et suivre ces étapes !
