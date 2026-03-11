# Guide de Déploiement Production - SODJA GATE

Ce guide vous explique comment déployer votre application complète (Frontend + Backend) sur des plateformes professionnelles.

## Option 1 : Render.com (Recommandé)

1. Créez un compte sur [Render.com](https://render.com).
2. Cliquez sur **"New +"** > **"Blueprint"**.
3. Connectez votre dépôt GitHub.
4. Render détectera automatiquement le fichier `render.yaml`.
5. Dans le tableau de bord Render, allez dans **Environment** et ajoutez les variables suivantes :
   - `DATABASE_URL` : Votre URL de connexion Supabase (PostgreSQL).
   - `GEMINI_API_KEY` : Votre clé API Google Gemini.
   - `JWT_SECRET` : Une phrase secrète longue et aléatoire.
   - `SMTP_USER` / `SMTP_PASS` : Vos identifiants Gmail pour les emails.

## Option 2 : Railway.app

1. Créez un compte sur [Railway.app](https://railway.app).
2. Cliquez sur **"New Project"** > **"Deploy from GitHub repo"**.
3. Railway utilisera le `Procfile` pour démarrer l'application.
4. Ajoutez les mêmes variables d'environnement que ci-dessus dans l'onglet **Variables**.

## Pourquoi pas Surge ?

Surge est un hébergeur de fichiers **statiques**. Il ne peut pas exécuter de code Node.js (votre serveur). Si vous utilisez Surge, votre frontend s'affichera mais il ne pourra pas communiquer avec la base de données ou envoyer des emails.

## Rappel important pour Supabase

Assurez-vous que votre base de données Supabase est configurée avec les tables nécessaires. Vous pouvez trouver le schéma SQL dans le fichier `SUPABASE_SCHEMA.sql` à la racine du projet.
