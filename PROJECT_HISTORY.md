# Historique et état du projet — Plateforme d'inscription Mahajanga

**Dernière analyse : 14 septembre 2026**
**Statut : prototype fonctionnel en développement local — non prêt pour la production**

Ce document est une photographie factuelle du dépôt à la date indiquée. Il sépare les fonctionnalités observables, les éléments partiellement réalisés et les travaux encore absents. Lorsqu'un élément historique ne peut pas être confirmé par Git, il est indiqué comme tel.

## 1. Objectif du projet

La plateforme vise à gérer les inscriptions universitaires de l'Université de Mahajanga :

- connexion et création de compte étudiant ;
- choix d'un établissement, niveau et parcours ;
- contrôle d'un quitus ;
- espace d'administration des inscriptions ;
- espace propre à un établissement, actuellement **ISSTM**.

Le projet est organisé en deux applications :

| Partie | Technologie | Rôle |
| --- | --- | --- |
| `frontend/` | Next.js 16, React 19, Tailwind CSS | Interfaces publique, connexion, étudiant, administrateur et établissement |
| `backend/` | NestJS 12, Prisma 6, PostgreSQL | API, authentification, données, quitus et contrôle des rôles |

## 2. Historique vérifiable

### Historique Git

- Le dépôt ne contient qu'un commit visible : `aa05eaf — Premier commit`.
- Les développements décrits ci-dessous sont actuellement en grande partie **non commités** (modifiés ou nouveaux fichiers). Il n'est donc pas possible de reconstituer une chronologie détaillée par commits.

### Historique déclaré dans une version antérieure de ce document

Une version précédente de `PROJECT_HISTORY.md`, datée du 11 septembre 2026, indiquait :

- la correction d'une page `frontend/src/app/register/page.tsx` qui aurait été vide ou corrompue ;
- la séparation des ports frontend (`3000`) et backend (`3001`) pour éviter un conflit ;
- des builds frontend et backend annoncés comme réussis à cette date.

Ces faits sont conservés comme contexte historique, mais la route `/register` n'est plus présente dans l'arborescence actuelle : l'inscription est maintenant intégrée à `/login`.

### Évolutions visibles dans le code actuel

Les migrations Prisma datées du 14 septembre 2026 montrent cette séquence :

1. `20260914101500_initial_schema` : création de `User`, des rôles `ETUDIANT` / `ADMIN` et des statuts d'inscription.
2. `20260914113000_add_establishment_quitus` : ajout du rôle `ETABLISSEMENT` et de la table `Quitus`.
3. `20260914120000_add_enrolled_students` : ajout de `EnrolledStudent`, du genre, et du lien optionnel entre un quitus et un étudiant inscrit.
4. `20260914130000_add_enrollment_applications` : ajout des dossiers d'inscription persistants (`EnrollmentApplication`).

### Journal de développement — 14 septembre 2026

- Création de la migration `20260914130000_add_enrollment_applications`, appliquée à PostgreSQL local avec `prisma migrate deploy`.
- Ajout du contrôleur étudiant et des endpoints de lecture, sauvegarde de brouillon et soumission d'un dossier.
- Liaison de l'interface `/student` avec ces endpoints : les choix établissement, niveau, parcours et quitus sont maintenant sauvegardés.
- Soumission du dossier seulement après validation d'un quitus lié à l'étudiant connecté et à l'établissement choisi.
- Synchronisation du statut entre `EnrollmentApplication` et `User` lors d'une décision de l'administrateur.
- Correction de l'expérience de progression étudiant : le passage à l'étape suivante dépend de la sauvegarde du brouillon ; un message visible indique désormais lorsque le backend n'est pas démarré sur le port `3001`.
- Vérifications réussies : compilation NestJS et vérification TypeScript du frontend.

## 3. Fonctionnalités réalisées

### 3.1 Frontend

Les routes actuellement présentes sont :

| Route | État | Fonctionnalité |
| --- | --- | --- |
| `/` | Réalisée | Page d'accueil et présentation du service |
| `/login` | Réalisée | Connexion e-mail/mot de passe, création de compte et redirection selon le rôle |
| `/student` | Partielle | Parcours en 5 étapes : établissement, niveau, parcours, quitus et pièces justificatives |
| `/admin` | Réalisée partiellement | Liste des comptes étudiants et modification du statut |
| `/etablissement` | Réalisée pour ISSTM | Liste des étudiants ISSTM, recherche et génération de quitus |

Les interfaces utilisent une gestion de session côté navigateur via `sessionStorage` et des appels HTTP vers `NEXT_PUBLIC_API_URL` ou, par défaut, `http://localhost:3001`.

### 3.2 Backend et sécurité d'accès

Les éléments suivants sont implémentés :

- création de compte étudiant par e-mail/mot de passe ;
- connexion e-mail/mot de passe ;
- hachage des mots de passe avec `scrypt` et un sel aléatoire ;
- jeton signé par HMAC avec une durée de vie de 8 heures ;
- rôles `ETUDIANT`, `ADMIN`, `ETABLISSEMENT` ;
- protection des endpoints administrateur et établissement ;
- CORS configuré pour le frontend local ;
- début d'intégration Google OAuth, avec contrôle du `state` et validation du jeton d'identité Google.

Endpoints disponibles :

| Méthode | Endpoint | Rôle requis | État |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Réalisé |
| `POST` | `/auth/login` | Public | Réalisé |
| `GET` | `/auth/google` | Public | Réalisé, mais nécessite les secrets Google |
| `GET` | `/auth/google/callback` | Public | Réalisé, mais nécessite les secrets Google |
| `GET` | `/admin/students` | Admin | Réalisé |
| `PATCH` | `/admin/students/:id/status` | Admin | Réalisé |
| `GET` | `/establishment/isstm/students` | Responsable établissement | Réalisé, actuellement limité à ISSTM |
| `POST` | `/establishment/isstm/quitus/generate` | Responsable établissement | Réalisé |
| `POST` | `/quitus/verify` | Utilisateur connecté | Réalisé |

### 3.3 Base de données et données fictives ISSTM

Le schéma Prisma contient :

| Modèle | Rôle |
| --- | --- |
| `User` | Compte de connexion et état administratif |
| `EnrolledStudent` | Référentiel des étudiants inscrits dans un établissement |
| `Quitus` | Quitus unique, émetteur et étudiant référencé |

Le seed `backend/prisma/seed.mjs` est idempotent. Il crée ou met à jour :

- un administrateur ;
- un responsable ISSTM ;
- **20 étudiants fictifs ISSTM** ;
- les comptes de connexion fictifs correspondant aux étudiants ;
- huit quitus de démonstration, puis permet la création des quitus restants depuis l'espace établissement.

Les données ISSTM sont isolées logiquement dans la même base PostgreSQL par le champ `establishment = 'ISSTM'`. Il ne s'agit pas d'une instance PostgreSQL distincte par établissement.

La vérification de quitus contrôle désormais que :

1. le code existe ;
2. l'établissement demandé correspond ;
3. le quitus est associé à un étudiant inscrit et actif ;
4. l'adresse e-mail de l'utilisateur connecté correspond à celle de cet étudiant.

## 4. Éléments commencés mais non terminés

### Dépôt de dossier étudiant

**Réalisé le 14 septembre 2026.** Le modèle `EnrollmentApplication` conserve un dossier par étudiant : établissement, niveau, parcours, quitus, statut, dates et propriétaire. La migration `20260914130000_add_enrollment_applications` a été appliquée à la base locale.

Les endpoints suivants existent désormais :

- `GET /student/application` : récupération du dossier de l'étudiant connecté ;
- `PUT /student/application` : enregistrement du brouillon ;
- `POST /student/application/submit` : soumission définitive avec quitus obligatoire.

L'interface étudiant enregistre le brouillon lors du passage des étapes, sauvegarde le quitus vérifié et soumet réellement le dossier. L'admin retrouve le statut synchronisé du dossier via la liste des étudiants.

### Pièces justificatives

L'interface permet de choisir des fichiers, mais ceux-ci restent dans l'état React du navigateur.

Il manque :

- téléversement HTTP sécurisé ;
- stockage de fichiers (local en développement, stockage objet en production) ;
- modèle de données des documents ;
- limites de taille, validation de type, contrôle antivirus et suppression ;
- consultation et validation/refus des documents par l'administration.

### Administration des dossiers

L'administrateur peut afficher les comptes étudiants et changer un statut. Cette partie ne traite pas encore un dossier complet.

Il manque :

- liste des dossiers réels avec filtres ;
- visualisation des documents ;
- commentaire interne et motif de refus ;
- historique des changements de statut ;
- notification de l'étudiant après une décision ;
- pagination et tri côté serveur.

### Google OAuth

Le code est en place, mais `GOOGLE_CLIENT_SECRET` est vide dans la configuration de développement. La connexion Google ne fonctionnera pas tant que les identifiants et l'URL de redirection ne seront pas configurés dans Google Cloud.

## 5. Incohérences et dette technique observées

### Modèle métier

- `User` et `EnrolledStudent` représentent tous deux une personne, sans relation directe. Le contrôle actuel repose sur l'e-mail. À terme, `EnrolledStudent` devrait référencer `User` via `userId` ou le dossier devrait porter une relation explicite vers les deux entités.
- Les établissements sont des chaînes de caractères. Il n'existe pas de modèle `Establishment`, ni de table des formations/parcours. L'API ISSTM est codée en dur.
- La date affichée par l'interface est parfois 2025-2026 tandis que les données fictives et migrations sont datées 2026. Il faut définir une unique année universitaire configurable.
- Les parcours proposés au frontend couvrent plusieurs établissements, mais seul ISSTM dispose actuellement d'un référentiel backend et d'un flux de quitus.

### API et validation

- Les contrôleurs utilisent des types manuels plutôt que des DTO NestJS validés avec `class-validator` et `ValidationPipe`.
- Les erreurs ne suivent pas encore un format d'API documenté et uniforme.
- Il n'y a ni versionnement (`/api/v1`), ni documentation OpenAPI/Swagger.
- Les endpoints de liste ne sont pas paginés.

### Authentification et sécurité

- Les jetons sont stockés dans `sessionStorage`, donc accessibles au JavaScript de la page en cas de faille XSS. Pour une production, privilégier des cookies `httpOnly`, `secure` et `sameSite` adaptés.
- Il n'y a pas de réinitialisation de mot de passe, vérification d'e-mail, limitation des essais de connexion, ni révocation de session.
- `AUTH_TOKEN_SECRET` doit être remplacé par un secret long, aléatoire et propre à chaque environnement avant la mise en ligne.
- Les mots de passe fictifs sont pratiques en développement mais ne doivent jamais être conservés en production.
- Les données réellement sensibles ne doivent pas être ajoutées à Git ; `.env` doit rester ignoré.

### Qualité et tests

- `npm run build` du backend a réussi lors de la dernière vérification.
- `npx prisma validate` a validé le schéma Prisma.
- `npx tsc --noEmit` dans le frontend a réussi.
- Le build complet Next.js n'a pas pu être confirmé dans l'environnement d'analyse : Turbopack a échoué lors de la création d'un processus/port, avec une erreur de permission de l'environnement, pas une erreur TypeScript du projet.
- Le test e2e ne couvre actuellement que `GET /` et attend encore `Hello World!`.
- Une vérification TypeScript du backend a signalé une incompatibilité d'import dans `backend/test/app.e2e-spec.ts` : `supertest/types` n'est pas résolu. Les tests doivent être corrigés puis étendus aux règles métier.

### Exploitation et déploiement

- Aucun `docker-compose.yml` n'est présent pour démarrer de manière reproductible PostgreSQL, backend et frontend.
- Les migrations ont été appliquées avec `prisma migrate deploy` sur la base locale. `prisma migrate dev` requiert un utilisateur PostgreSQL ayant le droit `CREATEDB` pour la shadow database.
- Le `README` backend contient encore principalement le contenu standard NestJS et doit être réécrit pour le projet.
- Le message Prisma indique que `package.json#prisma` sera déprécié avec Prisma 7 ; une future migration vers `prisma.config.ts` est à prévoir.
- Les sauvegardes PostgreSQL, la supervision, la journalisation applicative et une configuration de production ne sont pas définies.

## 6. Priorités recommandées

### Priorité 1 — Rendre l'inscription réelle

1. Ajouter le modèle `Document` et le téléversement sécurisé des pièces.
2. Afficher le détail complet du dossier et de ses documents côté admin.
3. Ajouter commentaires, motifs de refus et historique des décisions.
4. Ajouter les notifications de changement d'état.

### Priorité 2 — Documents et décision administrative

1. Ajouter le téléversement et le stockage des pièces.
2. Permettre à l'admin de consulter, approuver ou refuser chaque pièce.
3. Ajouter motifs de refus, commentaires et historique des décisions.
4. Notifier l'étudiant de chaque changement important.

### Priorité 3 — Généraliser les établissements

1. Remplacer les chaînes codées en dur par les modèles `Establishment`, `Program` et `AcademicYear`.
2. Associer un responsable à son établissement.
3. Générer des routes génériques au lieu de routes limitées à ISSTM.
4. Importer les listes officielles d'étudiants et conserver les données fictives uniquement pour le développement.

### Priorité 4 — Production, sécurité et qualité

1. Mettre les secrets réels hors du dépôt et créer les variables de production.
2. Ajouter validation DTO, limitation de débit, récupération de mot de passe et gestion de sessions plus robuste.
3. Ajouter les tests unitaires, d'intégration et e2e couvrant auth, quitus, dépôt et administration.
4. Ajouter Docker Compose, CI, sauvegardes et documentation de déploiement.

## 7. Commandes utiles en développement local

```bash
# Backend
cd backend
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

```bash
# Frontend, dans un autre terminal
cd frontend
npm run dev
```

Adresses locales :

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:3001`

## 8. Conclusion

Le projet dispose désormais d'une base technique cohérente pour l'authentification, la gestion admin simple, le cas ISSTM avec quitus et la persistance d'un dossier d'inscription. Le prochain jalon indispensable est le téléversement sécurisé des **documents**, puis leur examen administratif. Tant que les pièces restent uniquement dans le navigateur, la plateforme ne peut pas encore gérer un dépôt universitaire complet de bout en bout.
