# Historique du projet — Plateforme d'inscription Mahajanga

## Date de mise à jour
- 2026-09-11

## Contexte du projet
Ce projet contient deux applications :
- Frontend : Next.js
- Backend : NestJS

Le but est de fournir une plateforme d'inscription universitaire avec une interface d'accueil, une étape d'inscription, puis un espace étudiant.

---

## Problèmes identifiés et corrigés

### 1) Frontend — fichier de route corrompu / vide
Problème constaté :
- Le fichier `frontend/src/app/register/page.tsx` était vide ou partiellement corrompu.
- Cela provoquait l'erreur TypeScript suivante :
  - `File '.../src/app/register/page.tsx' is not a module.`
- Conséquence : le build Next.js échouait à l'étape de validation des types.

Correction appliquée :
- Reconstruction du fichier de page d'inscription avec une version complète et valide.
- Vérification du composant dans un contexte Next.js standard.

Résultat :
- Le frontend compile correctement.

### 2) Backend — conflit de port
Problème constaté :
- Le backend utilisait le port par défaut `3000`.
- Le frontend ou un autre service était déjà sur ce port, ce qui provoquait :
  - `Error: listen EADDRINUSE: address already in use :::3000`

Correction appliquée :
- Changement du port d'écoute du backend vers `3001` dans `backend/src/main.ts`.

Résultat :
- Le backend démarre sans conflit de port.

---

## Vérifications réalisées

### Build frontend
Commande exécutée :
```bash
cd /home/bluxmax/plateforme-inscription-mahajanga/frontend
npm run build
```

Résultat :
- Build réussi
- Route générée : `/`, `/register`, `/student`

### Build backend
Commande exécutée :
```bash
cd /home/bluxmax/plateforme-inscription-mahajanga/backend
npm run build
```

Résultat :
- Build réussi

### Vérification de port
Commande exécutée :
```bash
lsof -iTCP -sTCP:LISTEN -P | grep -E ':3000|:3001'
```

Résultat observé :
- Le frontend répond sur le port 3000
- Le backend écoute sur le port 3001

---

## État actuel du projet

### Frontend
- Projet Next.js fonctionnel
- Démarrage possible sur `http://localhost:3000`

### Backend
- Projet NestJS fonctionnel
- Démarrage possible sur `http://localhost:3001`

---

## Commandes de lancement

### Frontend
```bash
cd /home/bluxmax/plateforme-inscription-mahajanga/frontend
npm run dev
```

### Backend
```bash
cd /home/bluxmax/plateforme-inscription-mahajanga/backend
PORT=3001 npm run start
```

---

## Notes
- Le projet est maintenant dans un état fonctionnel pour le développement local.
- Le port backend a été séparé du frontend afin d'éviter les collisions de ports.
- Ce fichier sert de mémoire d'historique du projet pour garder une trace des actions effectuées.
