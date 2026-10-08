# Cahier de charges — Plateforme de demande de bourse en ligne (Mahajanga)

**Nom du dépôt :** `plateforme-inscription-mahajanga` (le nom du dossier est trompeur : ce n'est pas un système d'inscription universitaire, c'est une plateforme de **dépôt de dossier de demande de bourse en ligne**. Étudiant, établissement et scolarité centrale collaborent autour d'un seul document : le dossier de bourse.)

Ce document décrit, du plus petit détail (chaque fichier) jusqu'à la vue d'ensemble (le fonctionnement global), comment le site est construit, comment il fonctionne, et quel rôle joue chaque type d'utilisateur.

---

## 1. Vue d'ensemble — à quoi sert le site

Un étudiant crée un compte, choisit son établissement/niveau/parcours, renseigne un **quitus** (numéro de reçu de paiement délivré par son établissement) et téléverse ses pièces justificatives (CIN, quitus, certificat de résidence, relevé de bac, etc.). Une fois le dossier complet, il le **soumet**.

Le dossier soumis part ensuite vers la **Scolarité centrale**, qui l'examine et décide de le **valider** (la bourse est accordée) ou de le **refuser** (avec un motif obligatoire). L'étudiant suit l'état de son dossier en temps réel et peut télécharger une attestation une fois validé.

En parallèle, chaque **établissement** (aujourd'hui : ISSTM) gère sa propre base d'étudiants inscrits/réinscrits, configure ses niveaux et parcours, et génère les quitus que les étudiants utiliseront pour appuyer leur demande de bourse.

Un **administrateur** supervise l'ensemble : comptes du personnel (établissements, scolarité centrale, secrétaires), listes globales d'étudiants, apparence du site public, et journal d'audit.

Schéma du flux principal :

```
Étudiant                Établissement (ISSTM…)         Scolarité centrale
   │                            │                              │
   │  s'inscrit, remplit        │  inscrit/réinscrit l'étudiant │
   │  établissement/niveau/     │  dans sa base, génère un      │
   │  parcours                  │  quitus (reçu de paiement)    │
   │                            │                              │
   │◄── vérifie le quitus ──────┤                              │
   │                            │                              │
   │  téléverse les pièces      │                              │
   │  (CIN, quitus, résidence,  │                              │
   │  bac si L1…)               │                              │
   │                            │                              │
   │  SOUMET le dossier ────────┼─────────────────────────────►│
   │                            │                    examine, VALIDE ou REFUSE
   │◄───────────────────────────┼── notifie le statut ─────────┤
   │  télécharge l'attestation  │                              │
   │  (si validé)               │                              │
```

Le tout est piloté par un **Administrateur** qui gère les comptes du personnel, la liste globale des étudiants/établissements et l'apparence du site public.

---

## 2. Les deux applications

| Partie | Technologie | Rôle |
| --- | --- | --- |
| `backend/` | NestJS 12, Prisma 6, PostgreSQL | API REST, authentification, base de données, gestion des rôles, stockage des fichiers |
| `frontend/` | Next.js 16, React 19, Tailwind CSS | Site public + 4 espaces connectés (étudiant, établissement, scolarité, admin) |

Le frontend appelle le backend via `NEXT_PUBLIC_API_URL` (par défaut `http://localhost:3001`). La session est stockée côté navigateur dans `sessionStorage` (jeton, rôle, infos utilisateur) — pas de cookie.

---

## 3. Les rôles (personnages) de la plateforme

La base de données définit 6 rôles (`enum UserRole` dans `backend/prisma/schema.prisma:10-17`) :

### 3.1 ÉTUDIANT (`ETUDIANT`)
Le demandeur de bourse. Il crée son propre compte (email/mot de passe ou Google), vérifie son adresse e-mail, puis :
- choisit son établissement, son niveau et son parcours ;
- entre le numéro de quitus délivré par son établissement et le fait vérifier ;
- téléverse ses pièces justificatives obligatoires ;
- soumet son dossier de bourse (une seule fois, tant qu'il n'est pas déjà soumis) ;
- suit le statut de son dossier (Brouillon → Soumis → En révision → Validé/Refusé) ;
- télécharge une attestation une fois le dossier validé.
Espace : `/student`.

### 3.2 ADMIN (`ADMIN`)
Le super-administrateur de la plateforme. Il :
- voit tous les étudiants et tous les établissements ;
- crée et gère les comptes du personnel (établissements et scolarité centrale) : activer/désactiver, renommer, réinitialiser le mot de passe, mettre à la corbeille, restaurer, purger définitivement ;
- consulte le journal d'audit de toutes ces actions ;
- change manuellement le statut d'un dossier étudiant si besoin ;
- personnalise l'apparence du site public (logo, favicon, couleurs, texte d'accueil, images du hero).
Espace : `/admin`.

### 3.3 ETABLISSEMENT (`ETABLISSEMENT`) et ADMIN_ETABLISSEMENT (`ADMIN_ETABLISSEMENT`)
Le responsable d'un établissement (aujourd'hui uniquement ISSTM — codé en dur dans le backend). Il :
- inscrit de nouveaux étudiants dans la base de son établissement (formulaires distincts pour Licence 1, Master 1, ou réinscription d'un étudiant existant) ;
- génère les quitus (reçus de paiement) pour ses étudiants inscrits, un par un ou en masse ;
- configure les niveaux et parcours propres à son établissement (structure académique) ;
- définit la mention affichée sur les attestations ;
- (ADMIN_ETABLISSEMENT uniquement) crée et gère les comptes secrétaires de son établissement.
Espace : `/etablissement`.

### 3.4 SECRETAIRE (`SECRETAIRE`)
Un compte assistant créé par un ADMIN_ETABLISSEMENT. Accès au même espace `/etablissement` que le responsable, mais sans droit de créer d'autres comptes secrétaires ni de modifier les paramètres sensibles de l'établissement (ces actions exigent `requireEstablishmentAdmin`, réservé à ETABLISSEMENT/ADMIN_ETABLISSEMENT).

### 3.5 SCOLARITE_CENTRALE (`SCOLARITE_CENTRALE`)
L'autorité qui décide de l'attribution des bourses. Elle :
- consulte tous les dossiers soumis, en révision, validés ou refusés (tous établissements confondus) ;
- ouvre le détail d'un dossier et ses pièces jointes ;
- **valide** ou **refuse** un dossier (un motif texte est obligatoire en cas de refus) ;
- consulte l'historique de ses décisions.
Espace : `/scolarite`.

Note de cohérence : dans `auth.controller.ts`, la redirection après connexion Google ne gère pas explicitement `SCOLARITE_CENTRALE` (elle route ADMIN → `/admin`, ETABLISSEMENT/ADMIN_ETABLISSEMENT/SECRETAIRE → `/etablissement`, sinon → `/student`) ; seule la connexion classique par mot de passe (`login/page.tsx`) route correctement ce rôle vers `/scolarite`.

---

## 4. Le backend, dossier par dossier

Racine : `backend/src/`

| Fichier | Contenu |
| --- | --- |
| `main.ts` | Point d'entrée NestJS. Active CORS pour le frontend, sert les fichiers statiques du site (logo, favicon, images hero) en public via `/uploads/site-settings`, démarre le serveur sur le port `3001` par défaut. |
| `app.module.ts` | Déclare tous les contrôleurs et fournisseurs de l'application (liste centrale des routes actives). |
| `auth.controller.ts` | Routes publiques d'authentification : `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-email`, `POST /auth/resend-verification-email`, `GET /auth/google` et `GET /auth/google/callback` (connexion via Google). |
| `auth.service.ts` | Toute la logique d'authentification et de gestion des comptes : hachage des mots de passe (scrypt + sel), création/vérification de jetons de session signés HMAC (durée de vie 8h), vérification d'e-mail par jeton à durée de vie 24h, garde-fous par rôle (`requireAdmin`, `requireEstablishmentManager`, `requireEstablishmentAdmin`, `requireCentralRegistrar`), gestion complète des comptes du personnel (création, activation/désactivation, renommage, réinitialisation de mot de passe, corbeille, restauration, purge) et journal d'audit. |
| `google-auth.service.ts` | Encapsule le flux OAuth2 Google (génère l'URL d'autorisation, vérifie le jeton d'identité renvoyé). Nécessite `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` configurés. |
| `mail.service.ts` | Envoie l'e-mail de vérification d'adresse via SMTP (nodemailer), avec lien pointant vers `/verify-email?token=...` sur le frontend. |
| `admin.controller.ts` | Toutes les routes réservées au rôle ADMIN : liste des étudiants, liste des établissements avec effectifs, étudiants d'un établissement (recherche/filtre), gestion des comptes du personnel (CRUD + corbeille), journal d'audit, changement de statut d'un dossier étudiant. |
| `establishment.controller.ts` | Toutes les routes de l'espace établissement (ISSTM en dur) : référentiel de niveaux/parcours (curriculum), liste des étudiants inscrits, gestion des comptes secrétaires, inscription/réinscription d'un étudiant, paramètres (mention), génération de quitus, vérification publique d'un quitus. |
| `student.controller.ts` | Routes de l'espace étudiant : lecture du dossier (`GET /student/application`), lecture du profil, enregistrement d'un brouillon (`PUT /student/application`), soumission définitive (`POST /student/application/submit` — vérifie que toutes les pièces obligatoires sont présentes et qu'un quitus valide est associé). |
| `central-registrar.controller.ts` | Routes de l'espace scolarité centrale : liste des dossiers soumis/en révision/validés/refusés, décision (`PATCH /scolarite/applications/:id/decision`) avec motif obligatoire si refus. |
| `document.controller.ts` | Téléversement et consultation des pièces justificatives : upload d'une pièce par type (`POST /student/application/documents/:type`, max 10 Mo, PDF/PNG/JPG), liste des pièces d'un dossier, consultation du "dossier" complet (infos + pièces) pour admin/scolarité/établissement, téléchargement/visualisation sécurisée d'un fichier (`GET /documents/:id/file`) avec contrôle d'accès selon le rôle. |
| `document.service.ts` | Logique de stockage des fichiers sur disque (`uploads/documents/`), validation du type MIME et de la taille, remplacement d'une pièce existante du même type. |
| `site-settings.controller.ts` / `site-settings.service.ts` | Réglages visuels du site public (page d'accueil) : couleurs, logo, favicon, type de fond du hero (couleur/dégradé/image), textes, liens des boutons d'action. Upload d'images limité à l'ADMIN. |
| `prisma.service.ts` | Connexion Prisma/PostgreSQL, injectée dans tous les services ayant besoin de la base. |
| `app.controller.ts` / `app.service.ts` | Route de base héritée du squelette NestJS (`GET /`). |

### Base de données (`backend/prisma/schema.prisma`)

| Modèle | Rôle |
| --- | --- |
| `User` | Compte de connexion (tous rôles confondus) : identité, mot de passe, statut de vérification e-mail, rôle, établissement rattaché (pour le personnel), statut global d'inscription. |
| `AuditLogEntry` | Historique des actions administratives sur les comptes du personnel. |
| `EmailVerificationToken` | Jetons à usage unique pour la vérification d'adresse e-mail. |
| `Quitus` | Le reçu de paiement : code unique, étudiant, établissement, qui l'a émis, éventuellement lié à un `EnrolledStudent` et à un `EnrollmentApplication`. |
| `EnrollmentApplication` | **Le dossier de demande de bourse** : un par étudiant, avec établissement/niveau/parcours choisis, quitus associé, statut (Brouillon/Soumis/En révision/Validé/Refusé), note de refus, qui a décidé et quand. |
| `ApplicationDocument` | Une pièce justificative téléversée, liée à un dossier et un type (`cin`, `quitus`, `residence`, `bac`, `unemployment`…). |
| `EnrolledStudent` | La fiche complète d'un étudiant dans la base d'un établissement (identité, famille, parcours antérieur, matricule, etc.) — distincte du compte `User` ; les deux peuvent être liés par e-mail/`userId`. |
| `EstablishmentCurriculumOption` | Les niveaux et parcours propres à un établissement, activables/désactivables. |
| `EstablishmentSettings` | Réglages propres à un établissement (actuellement : la mention affichée sur les attestations). |
| `SiteSettings` | Apparence et contenus du site public (couleurs, logo, hero, textes des boutons). |

---

## 5. Le frontend, page par page

Racine : `frontend/src/app/`

| Page (route) | Contenu |
| --- | --- |
| `page.tsx` (`/`) | Page d'accueil publique. Bandeau avec logo et bouton "Se connecter", grand hero avec carrousel de photos de campus (ou fond personnalisé via les réglages admin), section "trois étapes" (parcours, quitus, profil), pied de page. Récupère les réglages visuels via `GET /site-settings`. |
| `login/page.tsx` (`/login`) | Écran unique de connexion **et** création de compte (bascule par un lien). Formulaire email/mot de passe, connexion Google, gestion des erreurs (dont le cas "e-mail non vérifié" avec bouton pour renvoyer l'e-mail). Redirige selon le rôle renvoyé par l'API après connexion (`ADMIN→/admin`, `ETABLISSEMENT/ADMIN_ETABLISSEMENT/SECRETAIRE→/etablissement`, `SCOLARITE_CENTRALE→/scolarite`, `ETUDIANT→/student`). |
| `verify-email/page.tsx` (`/verify-email`) | Page atteinte via le lien reçu par e-mail (`?token=...`). Appelle `POST /auth/verify-email` et affiche le résultat. |
| `student/page.tsx` (`/student`) | **Espace étudiant.** Formulaire en 5 étapes (établissement → niveau → parcours → quitus → pièces), sauvegarde automatique du brouillon à chaque étape, vérification du quitus, upload des pièces obligatoires, soumission finale, affichage du statut du dossier et de l'attestation imprimable une fois validé. Contient aussi un onglet Notifications et un onglet Paramètres (apparence de l'interface). |
| `etablissement/page.tsx` (`/etablissement`) | **Espace établissement (ISSTM).** Liste des étudiants inscrits (recherche, sélection, génération de quitus individuelle/en masse), formulaire d'ajout d'étudiant (3 modes : inscription Licence 1, inscription Master 1, réinscription d'un étudiant existant), gestion des comptes secrétaires (réservé aux responsables), paramètres (apparence, structure académique : niveaux/parcours, mention de l'établissement), et un visualiseur de dossier (pièces jointes) par étudiant. |
| `scolarite/page.tsx` (`/scolarite`) | **Espace scolarité centrale.** Tableau de bord avec compteurs (dossiers finalisés, à examiner, bourses validées, refusés), liste des dossiers à traiter avec action Valider/Refuser (motif obligatoire pour un refus), historique des décisions, visualiseur de dossier, réglages d'apparence. |
| `admin/page.tsx` (`/admin`) | **Espace administrateur.** Tableau de bord global, liste des étudiants (globale ou filtrée par établissement), gestion des comptes du personnel (créer, activer/désactiver, renommer, réinitialiser mot de passe, corbeille/restauration/purge), journal d'audit, réglages d'apparence de la plateforme et de la page d'accueil publique (logo, couleurs, textes, images). |
| `layout.tsx` | Mise en page racine : police (Playfair Display pour les titres), métadonnées (titre, manifeste PWA, icônes), enregistrement du service worker, et le `PlatformThemeProvider` qui applique le thème visuel choisi selon l'espace visité. |

### Composants partagés (`frontend/src/components/`)

| Fichier | Rôle |
| --- | --- |
| `DossierViewer.tsx` | Fenêtre modale en lecture seule affichant le détail d'un dossier (infos étudiant, statut, quitus, liste des pièces avec bouton ouvrir/télécharger). Utilisée par établissement, scolarité et admin. |
| `ConfirmDialog.tsx` | Boîte de dialogue de confirmation générique (ex. confirmer la déconnexion). |
| `HomepageHero.tsx` | Fond et contenu textuel du hero de la page d'accueil, pilotés par les réglages du site (couleur unie, dégradé, ou une/plusieurs images en diaporama). |
| `HomepageSettingsPanel.tsx` | Panneau (dans `/admin`) permettant de modifier logo, favicon, couleurs, textes et images du hero de la page d'accueil publique. |
| `AdminSettingsPanel.tsx` | Panneau générique de personnalisation d'interface (thème, couleurs, police, largeur, animations) partagé par les 4 espaces connectés. |
| `siteSettings.ts` | Type et valeurs par défaut des réglages du site public, fonction pour les récupérer depuis l'API et construire l'URL d'un asset. |
| `adminSettings.ts` | Type, valeurs par défaut, migration et sérialisation des réglages d'interface personnels (stockés en `localStorage`, par espace) ; génère le CSS de thème appliqué dynamiquement. |
| `useInterfaceSettings.ts` | Hook React qui charge/sauvegarde les réglages d'interface d'un espace donné et les synchronise entre onglets. |
| `PlatformThemeProvider.tsx` | Composant racine qui détecte l'espace visité (`/admin`, `/etablissement`, `/scolarite`, `/student`) et injecte le CSS du thème correspondant. |
| `ServiceWorkerRegistration.tsx` | Enregistre le service worker en production (PWA) ; le désinstalle en développement pour éviter les conflits de cache. |

---

## 6. Parcours détaillé du dossier de bourse (le cœur du système)

1. **Création de compte** (`/login`, mode inscription) → e-mail de vérification envoyé → l'étudiant clique le lien (`/verify-email`) → compte activé.
2. **Connexion** → redirection vers `/student`.
3. **Étape 1 : Établissement** — l'étudiant choisit parmi la liste (ENS, Médecine, FSTE, ISSTM, etc.). Seul ISSTM a un référentiel dynamique de niveaux/parcours ; les autres établissements utilisent des listes statiques côté frontend.
4. **Étape 2 : Niveau** (L1 à M2).
5. **Étape 3 : Parcours/spécialité.**
   → Après chaque étape, le formulaire est sauvegardé en brouillon (`PUT /student/application`).
6. **Étape 4 : Quitus** — l'étudiant entre le code du quitus délivré par son établissement ; vérification en direct (`POST /quitus/verify`) qu'il existe et correspond à l'établissement choisi.
7. **Étape 5 : Pièces justificatives** — upload de chaque pièce requise (CIN, quitus scanné, certificat de résidence, et bac si niveau L1) via `POST /student/application/documents/:type`.
8. **Soumission** (`POST /student/application/submit`) — bloquée tant que les pièces obligatoires ne sont pas toutes présentes ou que le quitus n'est pas validé. Le statut passe à `SOUMIS`.
9. **Traitement par la Scolarité centrale** (`/scolarite`) — le dossier apparaît dans la liste à examiner ; la scolarité consulte les pièces (`DossierViewer`) puis décide `VALIDE` ou `REFUSE` (motif obligatoire pour un refus).
10. **Retour à l'étudiant** — le statut se met à jour (l'interface étudiant re-vérifie toutes les 30 secondes) ; si validé, l'étudiant peut imprimer une attestation.

En parallèle, côté établissement : un responsable ou secrétaire inscrit/réinscrit ses étudiants dans sa propre base (`EnrolledStudent`), ce qui n'est pas la même chose qu'un compte `User` — un même étudiant peut exister des deux côtés, reliés par e-mail ou `userId`. C'est l'établissement qui génère les quitus utilisés à l'étape 4 ci-dessus.

---

## 6 bis. Règles — modification du compte (e-mail et mot de passe)

Un utilisateur connecté modifie **son propre** e-mail et **son propre** mot de passe depuis l'onglet « Mon compte ». L'onglet existe dans les espaces **scolarité centrale** (`frontend/src/app/scolarite/page.tsx`), **administrateur** (`admin/page.tsx`) et **établissement** (`etablissement/page.tsx`, pour le responsable comme pour le secrétaire). Il n'existe pas encore dans l'espace étudiant. Tous utilisent le même composant `AccountPanel` (`frontend/src/components/AccountPanel.tsx`). Côté serveur : `backend/src/account.controller.ts` (routes `/account/*`) et `backend/src/account.service.ts` (règles).

### Mot de passe (`PATCH /account/password`)
1. L'utilisateur doit être connecté.
2. Le **mot de passe actuel est obligatoire** et doit être correct (sinon 401 « Le mot de passe actuel est incorrect »).
3. Le nouveau mot de passe fait **8 caractères minimum** et doit être **différent** de l'actuel.
4. Le champ de confirmation du nouveau mot de passe est contrôlé côté interface.
5. **Protection contre les essais répétés** : après **5 mots de passe actuels faux en 15 minutes**, l'action est bloquée (429), même avec le bon mot de passe. Le compteur est en mémoire du serveur : il repart à zéro au redémarrage.
6. Un compte sans mot de passe (connexion Google uniquement) ne peut pas utiliser cette action : message explicatif.
7. Le mot de passe est haché (scrypt avec sel), jamais stocké ni renvoyé en clair.
8. L'action est inscrite dans le **journal d'audit** (`ACCOUNT_PASSWORD_CHANGED`).

### Adresse e-mail (`POST /account/email`, puis `POST /account/email/confirm`)
1. Il faut saisir la **nouvelle adresse** et le **mot de passe actuel** (mêmes contrôles et même blocage que ci-dessus).
2. La nouvelle adresse doit avoir un format valide, être différente de l'adresse actuelle et **ne pas être déjà utilisée** par un autre compte (409).
3. Rien ne change à ce stade : l'**ancienne adresse reste active** tant que le lien n'est pas confirmé.
4. Un **lien de confirmation** est envoyé à la **nouvelle** adresse. Il est valable **1 heure**, à **usage unique**, stocké haché (SHA-256). Une nouvelle demande remplace la précédente.
5. Le clic sur le lien (page `/confirm-email-change`) applique le changement : la nouvelle adresse devient celle du compte et est marquée **vérifiée**. Cette confirmation est publique : le jeton reçu à la nouvelle adresse fait office de preuve.
6. Un lien invalide, expiré ou déjà utilisé est refusé. Si l'adresse a été prise entre-temps par un autre compte, le changement est refusé (409).
7. Après confirmation, une **alerte de sécurité** est envoyée à l'**ancienne** adresse (envoi non bloquant : un échec est seulement journalisé).
8. Les sessions en cours ne sont pas coupées : le jeton de session repose sur l'identifiant du compte, pas sur l'e-mail. Il faut utiliser la nouvelle adresse à la prochaine connexion.
9. L'action est inscrite dans le **journal d'audit** (`ACCOUNT_EMAIL_CHANGED`, avec « ancien e-mail → nouvel e-mail »).
10. **En développement** (`NODE_ENV` différent de `production`), le lien de confirmation est aussi écrit dans la console du backend et un échec d'envoi d'e-mail n'empêche pas la demande. **En production**, l'échec d'envoi renvoie une erreur et le lien n'est jamais journalisé.

### Limites connues
- Ne couvre pas un mot de passe **oublié** (voir section 7) : il faut connaître le mot de passe actuel.
- L'e-mail d'une **fiche d'étudiant inscrit** (`EnrolledStudent`) n'est pas modifié par ce mécanisme : il reste géré par l'établissement.
- L'envoi réel dépend de la configuration SMTP (`SMTP_*` dans `.env`) et de la remise par le fournisseur d'e-mail (expéditeur validé, courrier indésirable).
- Les anciennes adresses ne sont pas conservées au-delà du journal d'audit.

## 6 ter. Personnalisation de la page d'accueil (administrateur)

L'**administrateur** (`ADMIN`, plus haut rôle du projet) modifie la page d'accueil publique sans toucher au code.

- **Accès** : icône crayon dans l'en-tête de `/admin`, à côté de la bascule clair/sombre → ouvre `/?mode=personnalisation`. Le mode n'est actif que si la session est `ADMIN` **et** confirmée par le serveur (`GET /admin/homepage`) ; sinon redirection vers `/`. Sans ce mode, la page est identique à celle des visiteurs (aucun crayon, bouton ou barre).
- **Ce qui est modifiable** : tous les textes (clés `section.N` de `homepage-defaults.json`), titre / sous-titre / bouton du bandeau, coordonnées (e-mail, téléphone, horaires, adresse, assistance), logo, images du carrousel (4 max), actualités (ajout, modification, suppression). En mode personnalisation, la barre du bas propose une bascule « Vue : visiteur / utilisateur connecté » pour atteindre aussi les textes réservés aux connectés.
- **Stockage** : table `SiteSettings` existante — `homepageContent` (JSON : seulement les textes modifiés, le reste vient de `homepage-defaults.json`), `homepageNews` (JSON), plus les champs `hero*` et `logoUrl` déjà présents. Images dans `uploads/site-settings/` (PNG/JPG, SVG pour le logo, 5 Mo max ; l'ancienne image est supprimée).
- **API** (`backend/src/homepage.controller.ts`) : `GET /homepage` (public) ; `GET /admin/homepage`, `PATCH /admin/homepage/content`, `PATCH /admin/homepage/hero`, `POST|PATCH|DELETE /admin/homepage/news[/:id]` ; images via `POST|DELETE /admin/site-settings/hero-images`, `POST /admin/site-settings/upload/logo`. Toutes les écritures passent par `requireAdmin` (contrôle serveur).
- **Audit** : actions `HOMEPAGE_CONTENT_UPDATED`, `HOMEPAGE_IMAGE_UPDATED`, `HOMEPAGE_CAROUSEL_UPDATED`, `HOMEPAGE_NEWS_CREATED|UPDATED|DELETED`, visibles dans l'onglet « Historique des actions ».
- **Ajouter un texte modifiable** : ajouter la clé dans **les deux** `homepage-defaults.json` (`backend/src/` pour la validation, `frontend/src/components/home/` pour l'affichage) et utiliser `<HomeText contentKey="…" />`.

## 7. Points d'attention connus (dette technique)

- **Incohérence de nommage** : le dépôt s'appelle "plateforme-inscription-mahajanga" et les textes de l'interface (page d'accueil, attestations) parlent encore d'"inscription universitaire", alors que la fonction réelle et validée par le porteur du projet est la **demande de bourse**. Les futurs textes/écrans devraient être alignés sur "dossier de bourse" plutôt que "dossier d'inscription".
- **ISSTM codé en dur** : tout l'espace établissement (`establishment.controller.ts`) est écrit spécifiquement pour "ISSTM" (constante `ISSTM`). Les autres établissements listés côté étudiant (ENS, Médecine, FSTE…) n'ont pas de référentiel backend ni de flux de quitus réel.
- **Redirection Google incomplète** : la connexion via Google ne route pas le rôle `SCOLARITE_CENTRALE` vers `/scolarite` (voir section 3.5).
- **Deux entités étudiant distinctes** : `User` (compte de connexion) et `EnrolledStudent` (fiche dans la base d'un établissement) ne sont reliées que par e-mail ou un `userId` optionnel — source de désynchronisation possible.
- **Jetons de session** stockés en `sessionStorage` (pas de cookie httpOnly) — acceptable en développement, à revoir avant mise en production.
- **Pas de réinitialisation de mot de passe** en libre-service (le lien "mot de passe oublié" renvoie un message invitant à contacter la scolarité).
