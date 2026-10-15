# Cahier des charges — Plateforme de demande de bourse en ligne (Université de Mahajanga)

| | |
| --- | --- |
| **Nom du dépôt** | `plateforme-inscription-mahajanga` |
| **Nature réelle du projet** | Plateforme de **dépôt et de traitement de dossiers de demande de bourse** (et non une plateforme d'inscription universitaire, malgré le nom du dépôt) |
| **Version documentée** | État du code au 14 octobre 2026 (branche `main`, commit `5d7be57`) — 30 migrations, 12 contrôleurs, 8 pages |
| **Périmètre actuel** | **Plusieurs établissements** gérés par l'administrateur (table `Establishment` : ENS, Faculté de Médecine, IOSTM, EDSP, École de Vétérinaire, IUGM, IUTAM, ILC-SS, ELCI, FSTE, Écoles doctorales, École de Pharmacie, ISSTM, etc. ; la liste exacte dépend de la base, les migrations en ajoutent aussi plusieurs antennes). Chaque établissement dispose de son espace dès qu'un compte responsable lui est rattaché ; **ISSTM** est uniquement l'établissement de démonstration (développement et tests). Les routes de l'API conservent le préfixe historique `/establishment/isstm/…` mais l'établissement visé est **toujours celui du compte connecté**. |
| **Langue de l'interface** | Français |

> Ce document décrit **ce que le système fait réellement aujourd'hui** (constaté dans le code), puis liste les écarts, risques et évolutions à prévoir. Les passages marqués ⚠️ sont des écarts ou des défauts constatés, pas des fonctionnalités.

### Clarification du périmètre (précisée par l'auteur le 14 octobre 2026)

| | |
| --- | --- |
| **Périmètre du projet** | **L'ensemble des établissements de l'Université de Mahajanga**, et non l'ISSTM seul. |
| **Établissement de démonstration** | **ISSTM** : **uniquement** l'établissement de démonstration, utilisé pour développer, configurer et tester la plateforme. Ce choix ne signifie pas que l'application lui est destinée. |
| **Objectif** | Permettre à plusieurs établissements de gérer leurs étudiants, inscriptions, réinscriptions et quitus, tout en centralisant les demandes de bourse nationale. |
| **Évolution prévue** | L'intégration complète des autres établissements sera poursuivie **après la soutenance**. |

Règles à respecter dans tout texte, code ou réponse concernant ce projet (mémoire de Licence 3 en Génie informatique) :
- Ne jamais présenter l'ISSTM comme le seul établissement concerné ; ne pas limiter l'architecture ni les fonctionnalités à l'ISSTM ; conserver une architecture multi-établissements.
- Dans les descriptions générales, écrire « Université de Mahajanga » ; ne citer l'ISSTM que pour les exemples, configurations ou tests effectivement réalisés avec lui.
- Distinguer clairement ce qui est **développé**, **partiellement réalisé** et **à faire** ; ne jamais présenter une fonctionnalité prévue comme réalisée. Les réponses techniques s'appuient sur le code réellement implémenté.

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Acteurs et rôles](#2-acteurs-et-rôles)
3. [Vue d'ensemble du fonctionnement](#3-vue-densemble-du-fonctionnement)
4. [Exigences fonctionnelles](#4-exigences-fonctionnelles)
5. [Règles de gestion](#5-règles-de-gestion)
6. [Exigences non fonctionnelles](#6-exigences-non-fonctionnelles)
7. [Architecture technique](#7-architecture-technique)
8. [Modèle de données](#8-modèle-de-données)
9. [API REST — catalogue complet](#9-api-rest--catalogue-complet)
10. [Frontend — pages et composants](#10-frontend--pages-et-composants)
11. [Sécurité](#11-sécurité)
12. [Installation, configuration et déploiement](#12-installation-configuration-et-déploiement)
13. [Données de démonstration](#13-données-de-démonstration)
14. [Tests et qualité](#14-tests-et-qualité)
15. [Écarts, dette technique et risques](#15-écarts-dette-technique-et-risques)
16. [Évolutions recommandées](#16-évolutions-recommandées)
17. [Glossaire](#17-glossaire)

---

## 1. Contexte et objectifs

### 1.1 Contexte
À l'Université de Mahajanga, un étudiant qui souhaite obtenir une bourse doit déposer un dossier comprenant des pièces justificatives (CIN, quitus de paiement, certificat de résidence, relevé du baccalauréat…). Ce dépôt se faisait sur papier. La plateforme dématérialise ce processus et le met sous le contrôle de trois acteurs : l'étudiant, son établissement, et la scolarité centrale qui décide.

### 1.2 Objectifs
- Permettre à l'étudiant de **constituer et déposer son dossier de bourse en ligne**, avec sauvegarde automatique en brouillon.
- Garantir que le dossier repose sur un **quitus authentique** (reçu de paiement délivré par l'établissement).
- Donner à la **scolarité centrale** une file de dossiers à examiner, avec décision **Validé / Refusé** motivée, et notification de l'étudiant par e-mail.
- Permettre à chaque **établissement** de tenir sa base d'étudiants inscrits, de générer les quitus et de configurer sa structure académique et ses pièces requises.
- Donner à l'**administrateur** la supervision globale : comptes, étudiants, **établissements (nom, logo, activation)**, contenu et apparence de la page d'accueil publique, journal d'audit.
- Informer chaque utilisateur par **notifications intégrées** (cloche) et par e-mail, et lui laisser gérer son propre compte (photo, mot de passe, adresse e-mail).

### 1.3 Hors périmètre actuel
- Paiement en ligne du quitus (le quitus est un code délivré par l'établissement, hors plateforme).
- Calcul ou versement de la bourse.
- Réinitialisation du mot de passe **oublié** en libre-service (le changement de mot de passe depuis « Mon compte » existe, lui, pour l'utilisateur connecté).
- Campagnes / années de bourse (aucune date d'ouverture ou de clôture n'est gérée côté serveur).
- Application mobile native et application web installable (PWA) : la PWA minimale qui existait a été retirée.

---

## 2. Acteurs et rôles

Six rôles sont définis dans l'énumération `UserRole` ([schema.prisma](backend/prisma/schema.prisma)). Tous les rôles disposent d'une page **Mon compte** (photo de profil, mot de passe, adresse e-mail) et d'une cloche de notifications.

| Rôle | Code | Création du compte | Espace | Droits principaux |
| --- | --- | --- | --- | --- |
| Étudiant | `ETUDIANT` | Auto-inscription (e-mail + mot de passe, ou Google) | `/student` | Constituer, enregistrer et soumettre son dossier ; téléverser ses pièces ; suivre le statut ; imprimer l'attestation si validé |
| Administrateur | `ADMIN` | Script de seed (variables d'environnement) | `/admin` | Tout superviser ; créer/gérer les comptes du personnel ; **gérer les établissements (création, renommage, logo, activation, suppression)** ; modifier manuellement un statut de dossier ; **personnaliser la page d'accueil (textes, images, actualités, réglages)** ; consulter le journal d'audit |
| Responsable d'établissement | `ADMIN_ETABLISSEMENT` | Créé par l'ADMIN | `/etablissement` | Inscrire/réinscrire/modifier/supprimer des étudiants ; générer les quitus ; **tableau de bord de l'établissement** ; configurer curriculum, pièces d'inscription, mention, apparence ; **modifier le nom et le logo de l'établissement** ; gérer les secrétaires |
| Établissement (ancien rôle) | `ETABLISSEMENT` | Hérité | `/etablissement` | Mêmes droits que `ADMIN_ETABLISSEMENT` (ce rôle est converti en `ADMIN_ETABLISSEMENT` à la création d'un compte par l'admin) |
| Secrétaire | `SECRETAIRE` | Créé par un responsable d'établissement | `/etablissement` | Consulter les étudiants, inscrire/réinscrire, **modifier, mettre à la corbeille et restaurer** des étudiants (la purge définitive lui est refusée), téléverser des pièces, voir les dossiers. **Ne peut pas** : générer des quitus, voir le tableau de bord, gérer les comptes, modifier curriculum/pièces/mention/apparence/identité de l'établissement |
| Scolarité centrale | `SCOLARITE_CENTRALE` | Créé par l'ADMIN | `/scolarite` | Consulter tous les dossiers soumis ; valider ou refuser (motif obligatoire au refus) ; **définir les pièces à téléverser par les étudiants (par établissement ou liste commune)** |

### 2.1 Matrice de droits (constatée dans le code)

| Action | Étudiant | Secrétaire | Resp. établissement | Scolarité | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Créer/éditer son dossier de bourse | ✅ | – | – | – | – |
| Téléverser ses pièces de dossier | ✅ | – | – | – | – |
| Vérifier un quitus (`POST /quitus/verify` puis `/quitus/confirm`) | ✅ (tout utilisateur connecté, limité à 30 essais / 10 min) | ✅ | ✅ | ✅ | ✅ |
| Lister les étudiants inscrits de l'établissement | – | ✅ | ✅ | – | – |
| Inscrire / réinscrire / modifier un étudiant | – | ✅ | ✅ | – | – |
| Mettre un étudiant à la corbeille, le restaurer | – | ✅ | ✅ | – | – |
| Purger définitivement un étudiant (depuis la corbeille) | – | ❌ | ✅ | – | – |
| Téléverser une pièce d'inscription pour un étudiant | – | ✅ | ✅ | – | – |
| Générer des quitus | – | ❌ | ✅ | – | – |
| Tableau de bord de l'établissement | – | ❌ | ✅ | – | – |
| Gérer les secrétaires | – | ❌ (lecture seule de la liste) | ✅ | – | – |
| Modifier curriculum / pièces d'inscription / mention / apparence | – | ❌ | ✅ | – | – |
| Modifier le nom et le logo de son établissement | – | ❌ | ✅ | – | – |
| Définir les pièces du dépôt de dossier étudiant (par établissement ou liste commune) | – | – | ❌ | ✅ | – |
| Voir le dossier d'un étudiant | – | ✅ (son établissement) | ✅ (son établissement) | ✅ (tous) | ✅ (tous) |
| Valider / refuser un dossier | – | – | – | ✅ | – |
| Forcer le statut d'un dossier | – | – | – | – | ✅ |
| Gérer les comptes du personnel | – | – | – | – | ✅ |
| Gérer les établissements (liste, logo, activation, suppression) | – | – | – | – | ✅ |
| Journal d'audit | – | – | – | – | ✅ |
| Personnaliser la page d'accueil publique | – | – | – | – | ✅ |
| Gérer son propre compte (photo, mot de passe, e-mail) et ses notifications | ✅ | ✅ | ✅ | ✅ | ✅ |

La purge définitive (`DELETE …/students/:id/permanent`) exige la garde « responsable » (`requireEstablishmentAdmin`) ; la modification, la mise à la corbeille et la restauration restent ouvertes au personnel de l'établissement.

## 3. Vue d'ensemble du fonctionnement

### 3.1 Flux principal

```
 Étudiant                      Établissement                       Scolarité centrale
    │                                  │                                  │
    │ crée un compte, vérifie l'e-mail │                                  │
    │                                  │ inscrit / réinscrit l'étudiant   │
    │                                  │ génère le QUITUS (QT-…)          │
    │◄──── code du quitus (hors plateforme) ──┤                           │
    │ 1 Établissement                  │                                  │
    │ 2 Niveau                         │                                  │
    │ 3 Parcours   (brouillon auto)    │                                  │
    │ 4 Saisit le quitus ; si l'e-mail │                                  │
    │   du compte ≠ e-mail de la fiche,│                                  │
    │   code à 6 chiffres envoyé à     │                                  │
    │   l'e-mail de la fiche           │                                  │
    │ 5 Téléverse les pièces           │                                  │
    │ SOUMET ─────────────────────────────────────────────────────────►  │
    │ (notification « Dossier soumis ») │             examine le dossier  │
    │                                  │              VALIDE ou REFUSE    │
    │◄── notification + e-mail de décision + statut mis à jour ───────────┤
    │ attestation imprimable (si validé)│                                 │
```

### 3.2 Cycle de vie d'un dossier (`RegistrationStatus`)

```
BROUILLON ──(soumission)──► SOUMIS ──(décision)──► VALIDE
    ▲                         │                    
    │                         └──────(décision)──► REFUSE
    └──── (modification par l'étudiant après un refus : retour à BROUILLON)
```

- `EN_REVISION` existe dans l'énumération et dans les écrans, mais **aucune action de l'interface ne place un dossier dans cet état** (seul l'admin peut forcer ce statut via le sélecteur). La scolarité traite indifféremment `SOUMIS` et `EN_REVISION`.
- Un dossier `SOUMIS`, `EN_REVISION` ou `VALIDE` n'est **plus modifiable** par l'étudiant. Un dossier `REFUSE` peut être modifié : toute sauvegarde le repasse en `BROUILLON` (et efface `submittedAt`).

### 3.3 Deux notions d'« étudiant » à ne pas confondre
- **`User` (rôle `ETUDIANT`)** : le *compte de connexion* du demandeur de bourse.
- **`EnrolledStudent`** : la *fiche d'inscription* de l'étudiant dans la base d'un établissement (identité, famille, bac, matricule…).
Les deux sont reliés par `userId` (optionnel) ou, à défaut, par l'adresse e-mail.

---

## 4. Exigences fonctionnelles

Légende : **[OK]** implémenté · **[Partiel]** implémenté avec réserve · **[Absent]** non implémenté.

### 4.1 Authentification et comptes

| Réf. | Exigence | État |
| --- | --- | --- |
| F-AUTH-01 | Création d'un compte étudiant par nom complet, e-mail, mot de passe (≥ 8 caractères) et confirmation du mot de passe | [OK] |
| F-AUTH-02 | Unicité de l'adresse e-mail (normalisée en minuscules) ; message « Cette adresse e-mail est déjà utilisée » | [OK] |
| F-AUTH-03 | Envoi d'un e-mail de vérification (lien `/verify-email?token=…`, valable **24 h**, jeton stocké haché SHA-256, usage unique) | [OK] |
| F-AUTH-04 | Connexion refusée tant que l'e-mail n'est pas vérifié ; bouton « Renvoyer l'e-mail de vérification » | [OK] |
| F-AUTH-05 | Renvoi de l'e-mail de vérification sans révéler si le compte existe | [OK] |
| F-AUTH-06 | Connexion par e-mail / mot de passe ; message générique en cas d'échec | [OK] |
| F-AUTH-07 | Connexion / création de compte via **Google OAuth 2.0** (scope `openid email profile`, e-mail Google obligatoirement vérifié, création automatique du compte `ETUDIANT` avec e-mail marqué vérifié) | [OK] |
| F-AUTH-08 | Protection du flux Google : `state` aléatoire (32 octets) en cookie `httpOnly`, comparaison en temps constant ; code de connexion à usage unique valable 60 s échangé contre la session (`/auth/google/exchange`) afin de ne pas exposer le jeton dans l'URL | [OK] |
| F-AUTH-09 | Redirection après connexion selon le rôle (`ADMIN→/admin`, établissement/secrétaire→`/etablissement`, `SCOLARITE_CENTRALE→/scolarite`, `ETUDIANT→/student`) ; fonction partagée `dashboardPathForRole` pour le mot de passe **et** Google | [OK] |
| F-AUTH-10 | Un utilisateur déjà connecté qui ouvre `/login` est redirigé vers son espace | [OK] |
| F-AUTH-11 | Session : jeton signé HMAC-SHA256 valable **8 h**, stocké dans `sessionStorage` (`auth_token`, `user_role`, `auth_user`) ; déconnexion = `sessionStorage.clear()` après confirmation | [OK] |
| F-AUTH-12 | Compte désactivé ou supprimé : connexion et requêtes refusées (« Ce compte est désactivé ») | [OK] |
| F-AUTH-13 | Réinitialisation du mot de passe par l'utilisateur | [Absent] — le lien « Mot de passe oublié ? » affiche seulement « Contactez le service de scolarité » |
| F-AUTH-14 | Case « Se souvenir de moi » | [Absent] — la case existe mais n'a aucun effet |
| F-AUTH-15 | Mode clair/sombre des pages publiques (accueil, connexion), mémorisé en `localStorage` (`home_theme`), à défaut selon la préférence système | [OK] |
| F-AUTH-16 | Page **Mon compte** (tous les rôles) : photo de profil (PNG/JPG/WebP ≤ **3 Mo**, signature du fichier contrôlée côté serveur, ancienne photo supprimée), changement de mot de passe (mot de passe actuel exigé, ≥ 8 car., différent de l'actuel), changement d'adresse e-mail | [OK] |
| F-AUTH-17 | Changement d'e-mail en deux temps : mot de passe actuel requis, lien envoyé à la **nouvelle** adresse (valable **1 h**, jeton haché, usage unique, page `/confirm-email-change`) ; rien ne change avant le clic ; une **alerte** part vers l'ancienne adresse ; action inscrite au journal d'audit | [OK] |
| F-AUTH-18 | Limitation des essais de mot de passe actuel : **5 échecs / 15 min** par utilisateur (en mémoire) ; un compte Google sans mot de passe ne peut pas utiliser ces formulaires | [OK] |
| F-AUTH-19 | Notifications intégrées (cloche de l'en-tête) pour tous les rôles : 50 dernières, compteur de non lues, marquage lu / tout lire, actualisation toutes les 30 s tant que l'onglet est visible | [OK] — les notifications créées par le serveur concernent aujourd'hui l'étudiant (soumission, validation, refus) |
| F-AUTH-20 | **Limitation des tentatives** (en mémoire, par adresse IP) : connexion **30 tentatives / 15 min** par IP et **5 échecs / 15 min** par couple IP + adresse e-mail (le compteur est remis à zéro après une connexion réussie) ; création de compte **5 / heure** par IP ; réponse HTTP 429 avec message en français, affiché tel quel par la page de connexion | [OK] |

### 4.2 Espace étudiant (`/student`)

| Réf. | Exigence | État |
| --- | --- | --- |
| F-STU-01 | Garde d'accès : sans jeton ou sans rôle `ETUDIANT`, redirection vers `/login` ; réponse 401 → purge de session | [OK] |
| F-STU-02 | Assistant en **5 étapes** avec barre de progression : Établissement → Niveau → Parcours → Quitus → Pièces | [OK] |
| F-STU-03 | Étape 1 : choix parmi les établissements **actifs** de la table `Establishment` (liste publique `GET /establishments`, avec **logo rond** ou pictogramme de repli) et recherche textuelle ; l'ordre est celui défini par l'admin (`position`) | [OK] |
| F-STU-04 | Étape 2 : niveaux issus du **curriculum de l'établissement choisi** (`GET /establishments/:nom/curriculum`, niveaux actifs, filtrés par cycle Licence/Master) | [OK] |
| F-STU-05 | Étape 3 : parcours de l'établissement filtrés par le cycle du niveau choisi, avec recherche | [OK] — un établissement sans curriculum configuré ne propose aucun niveau/parcours |
| F-STU-06 | **Sauvegarde automatique en brouillon** (`PUT /student/application`) à chaque clic sur « Suivant » | [OK] |
| F-STU-07 | Étape 4 : **vérification du quitus en deux temps**. (1) Saisie du code → `POST /quitus/verify` : si le compte est déjà rattaché à ce quitus ou si son e-mail est celui de la fiche, vérifié ; sinon un **code à 6 chiffres** est envoyé à l'e-mail enregistré par l'établissement (affiché masqué). (2) Saisie du code → `POST /quitus/confirm` ; le quitus est alors **rattaché au compte** | [OK] |
| F-STU-08 | Étape 5 : téléversement de chaque pièce requise (PDF/PNG/JPG, 10 Mo max, contrôle côté client puis serveur), remplacement possible (« Changer le fichier »), compteur « n/N pièce(s) obligatoire(s) téléversée(s) » | [OK] |
| F-STU-09 | Liste des pièces : celle définie par la **scolarité centrale** pour l'établissement (contexte `CANDIDATURE`, `GET /establishments/:nom/document-requirements`) ou, si le mode « identique pour tous » est activé, la liste commune ; à défaut, liste par défaut (CIN, quitus, certificat de résidence, attestation de chômage, relevé de bac) | [OK] |
| F-STU-10 | Pièces **facultatives** : « attestation de chômage » (`unemployment`) ; **relevé de bac** obligatoire uniquement en Licence 1 | [OK] |
| F-STU-11 | Bouton « Finaliser le dépôt » actif seulement si quitus vérifié et toutes les pièces obligatoires déposées ; soumission → statut `SOUMIS` + notification « Dossier soumis » | [OK] |
| F-STU-12 | Reprise du dossier à la reconnexion (étape 5 si quitus déjà associé) ; si dossier non brouillon → écran « Dossier soumis » | [OK] |
| F-STU-13 | Rafraîchissement automatique du dossier toutes les **30 s** | [OK] |
| F-STU-14 | Onglet **Mon dossier** (débloqué après vérification du quitus) : état, informations académiques, quitus, liste des pièces « Déposée / Non déposée », motif du refus affiché si `REFUSE` | [OK] |
| F-STU-15 | **Attestation** imprimable / enregistrable en PDF (via impression navigateur) active uniquement si `VALIDE` | [OK] — ⚠️ le libellé de l'attestation étudiante dit « Attestation d'inscription » et « est inscrit(e) à… pour l'Année Universitaire 2025-2026 », alors que le contexte est une bourse |
| F-STU-16 | Onglet **Notifications** (débloqué après soumission) et cloche de l'en-tête alimentés par les **vraies notifications** du serveur (`GET /notifications`) : « Dossier soumis », « Dossier validé », « Dossier refusé » | [OK] |
| F-STU-17 | Onglet **Paramètres** (débloqué après soumission) : panneau d'apparence + identité du compte ; page **Mon compte** (photo, mot de passe, e-mail) accessible depuis le menu du profil | [OK] |
| F-STU-18 | Bloc **NOTA-BENE** permanent : la bourse n'est pas automatique ; les nouveaux inscrits en 1re année avec un bac antérieur ne sont pas éligibles ; « tout dossier incomplet ne sera pas pris en compte » | [OK] |
| F-STU-19 | Statut dans l'en-tête : « Étape n/5 en cours », « Dossier en attente », « Dossier en révision », « Dossier validé », « Dossier refusé » | [OK] |
| F-STU-20 | Interface responsive : barre latérale en tiroir sous 1025 px, cibles tactiles 44 px | [OK] |
| F-STU-21 | En-tête de la barre latérale : **logo rond** de l'Université (logo du site téléversé, sinon `logo.png`) et nom « Univ Mahajanga » ; navigation : Dépôt de dossier · Mon dossier · Notifications · Nota-bene · Paramètres | [OK] |

### 4.3 Espace établissement (`/etablissement`)

L'établissement géré est celui du compte connecté (champ `User.establishment`). Les routes portent encore le préfixe historique `/establishment/isstm/…`.

| Réf. | Exigence | État |
| --- | --- | --- |
| F-EST-01 | Garde d'accès : rôles `ETABLISSEMENT`, `ADMIN_ETABLISSEMENT`, `SECRETAIRE` ; compte sans établissement associé → erreur « Aucun établissement n'est associé à ce compte » | [OK] |
| F-EST-02 | **Liste des étudiants inscrits** (hors corbeille) triée par matricule, recherche (nom, matricule, téléphone), filtres serveur `gender` et `level`, colonne quitus (« Non généré » ou code) | [OK] |
| F-EST-03 | **Génération de quitus** : « Générer les manquants » (tous les étudiants actifs, non supprimés, sans quitus) ou « Générer la sélection » ; sélection multiple avec « tout sélectionner » ; réponse `{created, alreadyGenerated}` ; **un seul quitus par étudiant** | [OK] — réservé au responsable |
| F-EST-04 | **Nouvelle inscription** (assistant à étapes) : choix du cycle (Licence/Master) ; identité et contact ; parcours antérieur (Licence : établissement/bac année-série-centre ; Master : établissement/année/mention de licence/parcours/niveau précédents) ; famille et répondant (Licence uniquement) ; choix du parcours ; **dépôt de dossier** (pièces) | [OK] |
| F-EST-05 | Champs obligatoires côté serveur pour une nouvelle fiche : nom complet, e-mail (unique), téléphone, genre, niveau, parcours ; niveau/parcours doivent être **actifs** dans le curriculum du **cycle** concerné | [OK] |
| F-EST-06 | **Matricule** attribué par le serveur : `<ÉTABLISSEMENT>-<ANNÉE>-<8 hex>` (préfixe = 10 premiers caractères alphanumériques du nom, en majuscules), 3 tentatives en cas de collision | [OK] |
| F-EST-07 | **Réinscription** d'un étudiant existant : recherche du dossier, mise à jour niveau/parcours/qualité (Passant/Redoublant) et coordonnées ; remise `active = true` | [OK] |
| F-EST-08 | **Attestation d'inscription** imprimable proposée après ajout (nom, naissance, mention de l'établissement, parcours, niveau, matricule, tél., e-mail, année universitaire) | [OK] |
| F-EST-09 | **Dépôt de pièces d'inscription** pour un étudiant : listes par cycle (Licence : photo, ancienne carte étudiant, lettre d'engagement légalisée, certificat de résidence du répondant, reçu de versement ; Master : photo, certificat de résidence des parents, diplôme/attestation de licence, acte de naissance < 3 mois, CIN légalisée, reçu de versement) ou liste configurée | [OK] |
| F-EST-10 | **Visualiseur de dossier** (lecture seule) par étudiant : profil complet, statut, quitus, pièces ouvrables/téléchargeables ; bascule automatique sur le dossier de bourse en ligne si l'étudiant en a déposé un | [OK] |
| F-EST-11 | **Gestion des secrétaires** (responsable uniquement) : créer, activer/désactiver, renommer, changer le mot de passe (≥ 8 car.) | [OK] — ⚠️ la création est consignée via le service de comptes, mais pas les changements de statut/nom/mot de passe faits par le responsable |
| F-EST-12 | **Structure académique** (responsable) : ajouter / renommer / activer-désactiver / supprimer des **niveaux** et **parcours** par cycle | [OK] |
| F-EST-13 | **Pièces requises — Inscription** (par cycle) : ajouter / renommer / activer-désactiver / supprimer | [OK] |
| F-EST-14 | Les pièces du **dépôt de dossier étudiant** (contexte `CANDIDATURE`) ne se gèrent **plus** ici : le serveur refuse ce contexte (« gérées par la scolarité centrale ») ; voir F-SCO-11 | [OK] — changement par rapport à la version précédente |
| F-EST-15 | **Mention de l'établissement** affichée sur les attestations (responsable) | [OK] |
| F-EST-16 | **Apparence partagée** : réglages définis par le responsable, enregistrés côté serveur (`interfaceSettings`, JSON ≤ 5 000 caractères), appliqués en lecture seule aux secrétaires | [OK] |
| F-EST-17 | Boutons masqués ou désactivés pour le secrétaire (`isEstablishmentAdmin`) | [OK] |
| F-EST-18 | **Tableau de bord** (responsable, `GET /establishment/isstm/dashboard`) : étudiants inscrits (actifs / inactifs), quitus générés et manquants, secrétaires (actifs), dossiers de bourse par statut (brouillon, soumis, en révision, validés, refusés), répartition par niveau (barres), par genre et par cycle, 5 dernières inscriptions | [OK] |
| F-EST-19 | **Modifier un étudiant** (`PATCH`) : nom, e-mail (unicité), téléphone, genre, qualité, niveau/parcours/cycle (revalidés contre le curriculum), naissance, CIN, nationalité, adresse | [OK] |
| F-EST-20 | **Corbeille des étudiants** : la suppression est **logique** (`deletedAt`) ; un étudiant supprimé disparaît de la liste, du dashboard, de la génération de quitus et de la vérification de quitus (« l'inscription liée a été supprimée ») ; **restauration** possible ; **suppression définitive** (responsable uniquement) depuis la corbeille (efface la fiche, les pièces sur disque et le quitus, sauf si le quitus est déjà utilisé par un dossier en ligne) | [OK] |
| F-EST-21 | **Identité de l'établissement** (page « Mon compte », responsable) : renommer l'établissement (propagé à toutes les tables) et téléverser/supprimer son **logo** (PNG/JPG/WebP ≤ 5 Mo) ; le logo apparaît à l'étudiant, dans l'encadré du menu latéral et sur l'accueil ; **aperçu rond** | [OK] |
| F-EST-22 | Menu latéral : en-tête avec le **logo rond de l'Université** ; encadré avec le **logo rond de l'établissement** (ou son pictogramme) et son nom. Navigation : Tableau de bord (resp.) · Liste des étudiants · Corbeille · Ajouter secrétaire (resp.) · Ajouter un étudiant (Nouvelle inscription / Réinscription) · Paramètres (resp. : Apparence & Affichage, Comportement, Structure académique & mentions, Pièces — Inscription) · Mon compte | [OK] |
| F-EST-23 | Actualisation discrète des chiffres (cloche, tableau de bord) toutes les **30 s** | [OK] |

### 4.4 Espace scolarité centrale (`/scolarite`)

| Réf. | Exigence | État |
| --- | --- | --- |
| F-SCO-01 | Garde d'accès : rôle `SCOLARITE_CENTRALE` uniquement | [OK] |
| F-SCO-02 | **Tableau de bord** : 4 compteurs (dossiers finalisés, à examiner, bourses validées, refusés), **répartition** à traiter / validés / refusés (anneau) et **dépôts des 14 derniers jours** (histogramme), dossiers prioritaires | [OK] |
| F-SCO-03 | **Dossiers à traiter** : liste des dossiers `SOUMIS` / `EN_REVISION` (pastille de compteur dans le menu), recherche (nom, e-mail, établissement, parcours), affichage en liste ou en cartes, champ de motif par dossier | [OK] |
| F-SCO-04 | **Décision** : boutons Valider / Refuser ; **motif obligatoire pour un refus** (contrôle client et serveur) ; seuls les dossiers `SOUMIS`/`EN_REVISION` sont décidables | [OK] |
| F-SCO-05 | Enregistrement de la décision : statut, note, date, relecteur (`reviewedById`) ; mise à jour synchronisée du statut du compte `User` et **création de la notification** de l'étudiant (une transaction) | [OK] |
| F-SCO-06 | **E-mail de décision** automatique à l'étudiant (validé : remarque facultative ; refusé : motif) ; non bloquant : en cas d'échec d'envoi, la décision est conservée et l'erreur journalisée | [OK] |
| F-SCO-07 | **Historique** des décisions (validés + refusés) avec recherche et nom du relecteur | [OK] |
| F-SCO-08 | **Visualiseur de dossier** (infos, quitus, pièces, profil d'inscription s'il existe) | [OK] |
| F-SCO-09 | Paramètres d'apparence (3 onglets : Apparence & Affichage, Comportement, Identité) | [OK] |
| F-SCO-10 | Une décision ne peut pas être annulée ni corrigée par la scolarité (seul l'admin peut forcer un statut) | Constat |
| F-SCO-11 | **Pièces à téléverser** (onglet dédié, composant `CandidatureDocumentsPanel`) : la scolarité définit, **par établissement**, les pièces du dépôt de dossier (ajout, renommage, activation/désactivation, suppression ; clé technique générée depuis le libellé ; doublon refusé) | [OK] |
| F-SCO-12 | **Mode « identique pour tous »** (`PUT /scolarite/document-requirements-mode`) : une **liste commune** (clé d'établissement réservée `*`) remplace les listes par établissement pour tous les étudiants | [OK] |
| F-SCO-13 | Menu : Tableau de bord · Historique · Dossiers à traiter · Pièces à téléverser · Mon compte · Paramètres ; en-tête avec **logo rond** de l'Université | [OK] |

### 4.5 Espace administrateur (`/admin`)

| Réf. | Exigence | État |
| --- | --- | --- |
| F-ADM-01 | Garde d'accès : rôle `ADMIN` | [OK] |
| F-ADM-02 | **Tableau de bord** (`GET /admin/dashboard`) : étudiants (dont e-mail non vérifié), dossiers par statut, effectifs par établissement, personnel par rôle (dont comptes inactifs), comptes à la corbeille, 5 dossiers à traiter, 5 dernières actions | [OK] |
| F-ADM-03 | **Étudiants** : recherche globale (nom/e-mail) + filtre par statut ; export **CSV** (séparateur `;`, BOM UTF-8) ; export **PDF** (impression navigateur) | [OK] |
| F-ADM-04 | **Navigation par établissement** : cartes (avec le **logo rond** de l'établissement ou son pictogramme) et effectif, puis liste filtrable (recherche, niveau, parcours) | [OK] |
| F-ADM-05 | **Changement manuel du statut** d'un dossier (5 statuts) avec confirmation optionnelle (`confirmStatus`) ; met à jour `User` et `EnrollmentApplication` | [OK] |
| F-ADM-06 | **Visualiseur de dossier** (`/admin/students/:id/dossier`) | [OK] |
| F-ADM-07 | **Création de comptes du personnel** : responsable d'établissement (établissement choisi dans une **liste déroulante**) ou scolarité centrale ; e-mail marqué vérifié ; mot de passe ≥ 8 car. | [OK] |
| F-ADM-08 | **Gestion des comptes** (comptes créés) : activer/désactiver, renommer, réinitialiser le mot de passe, mettre à la corbeille | [OK] |
| F-ADM-09 | **Tous les comptes** : recherche, filtre par rôle, activation/désactivation, suppression (corbeille) ; **garde-fous** : impossible d'agir sur son propre compte, impossible de désactiver/supprimer le **dernier admin actif** | [OK] |
| F-ADM-10 | **Corbeille** : restaurer, ou **supprimer définitivement** après saisie du nom complet du compte pour confirmer ; refus si le compte est lié à des données (clé étrangère) | [OK] |
| F-ADM-11 | **Historique / journal d'audit** : 200 dernières actions (comptes du personnel : création, statut, nom, mot de passe, corbeille, restauration, purge ; **comptes : changement de mot de passe ou d'e-mail par l'utilisateur ; page d'accueil : textes, images, carrousel, actualités**) avec auteur, cible, détail, date | [OK] |
| F-ADM-12 | **Paramètres** (4 onglets : Apparence & Affichage, Comportement, Identité, **Page d'accueil**) ; l'onglet « Page d'accueil » ouvre le panneau de réglages du site (§4.6) | [OK] |
| F-ADM-13 | Actualisation manuelle et automatique (désactivée / 30 s / 1 min / 5 min) | [OK] |
| F-ADM-14 | **Établissements** (menu « Gestion » → Établissements, composant `EstablishmentsAdminPanel`) : liste avec effectifs (étudiants, dossiers, personnel) ; **ajouter** (2 à 60 caractères, nom unique sans tenir compte de la casse) ; **renommer** (le nouveau nom est propagé à `User`, `EnrollmentApplication`, `Quitus`, `EnrolledStudent`, curriculum, pièces requises et réglages en une transaction) ; **activer/désactiver** (un établissement inactif disparaît de la liste étudiante) ; **logo** (PNG/JPG/WebP ≤ 5 Mo, aperçu **rond**, ajout/suppression, ancien fichier supprimé) ; **supprimer** (refusé si des comptes, étudiants, dossiers ou quitus y sont rattachés : il faut le désactiver) | [OK] |
| F-ADM-15 | **Mode personnalisation de l'accueil** : icône crayon dans l'en-tête → `/?mode=personnalisation` (voir F-PUB-08) | [OK] |
| F-ADM-16 | Menu latéral organisé en sections : Général (Tableau de bord, Historique) · Gestion (Étudiants, Établissements) · Comptes (Gestion des comptes, Tous les comptes, Corbeille) · Configuration (Mon compte, Paramètres) ; en-tête avec **logo rond** de l'Université | [OK] |

### 4.6 Page d'accueil publique (`/`) et réglages du site

| Réf. | Exigence | État |
| --- | --- | --- |
| F-PUB-01 | Page d'accueil complète : **barre de navigation** collante (logo rond, « Univ Mahajanga », liens Accueil · La bourse · Étapes · Établissements · FAQ · Actualités, boutons Se connecter / Créer un compte ou accès à l'espace, bascule clair/sombre, recherche), **hero** (badge « Bourse nationale », titre, sous-titre, boutons, slogan, carte « Informations importantes », 4 statistiques), puis sections **La bourse**, **Étapes**, **Préparer son dossier**, **Avantages**, **Établissements**, **Statuts du dossier**, **Actualités**, **FAQ**, **Aide**, **Appel à l'action final** et **pied de page** (coordonnées de la scolarité, liens, retour en haut) | [OK] |
| F-PUB-02 | Carrousel par défaut de 4 photos de campus (changement toutes les 4 s, flèches, pastilles) quand aucune image personnalisée n'est configurée | [OK] |
| F-PUB-03 | Réglages pilotés par l'admin : couleurs primaire/secondaire/fond (hexadécimal `#RRGGBB`), logo et favicon (PNG/JPG/**SVG** ≤ 5 Mo), type de fond du hero (couleur / dégradé / images), jusqu'à **4 photos** (PNG/JPG ≤ 5 Mo) avec diaporama si ≥ 2, opacité du filtre (0–100 %), titre, sous-titre, texte et lien des deux boutons d'action | [OK] |
| F-PUB-04 | Réinitialisation complète des réglages (supprime les fichiers téléversés) | [OK] |
| F-PUB-05 | Liens des boutons : internes (`router.push`) ou externes (`http(s)://`) | [OK] |
| F-PUB-06 | Les ressources du site sont servies **publiquement** sous `/uploads/site-settings` (logos d'établissements : `/uploads/establishments`, photos de profil : `/uploads/avatars`) | [OK] |
| F-PUB-07 | Textes de l'accueil : les **161 textes** (clés `section.N` de `homepage-defaults.json`) sont **modifiables**, y compris les statistiques du hero et le badge ; les textes d'origine parlent de **bourse nationale** | [OK] |
| F-PUB-08 | **Mode personnalisation** (admin uniquement) : `/?mode=personnalisation` n'est actif que si la session est `ADMIN` **et** confirmée par le serveur (`GET /admin/homepage`). Chaque texte reçoit un crayon (composant `HomeText`) ; édition en fenêtre modale ; bouton « retour au texte d'origine » ; modification du logo, du carrousel, des coordonnées de contact et du bandeau ; bascule « Vue : visiteur / utilisateur connecté » pour atteindre les textes réservés aux connectés. Sans ce mode, la page est identique à celle des visiteurs | [OK] |
| F-PUB-09 | Stockage : `SiteSettings.homepageContent` (JSON : **seulement les textes modifiés**, le reste vient des valeurs par défaut) ; ≤ 1 000 caractères par texte, ≤ 40 clés par requête ; les clés `contact.*` peuvent être vidées (la ligne ou le bouton disparaît) ; titre ≤ 160, sous-titre ≤ 500, bouton ≤ 60 caractères | [OK] |
| F-PUB-10 | **Actualités** (`SiteSettings.homepageNews`, JSON) : ajout, modification, suppression ; titre ≤ 150, texte ≤ 2 000 caractères, **50 maximum**, triées de la plus récente à la plus ancienne ; affichées dans la section « Actualités » | [OK] |
| F-PUB-11 | Section **Établissements** : une carte par établissement actif (**logo rond** sur fond blanc ou pictogramme) ; la statistique « Établissements » du hero compte les établissements actifs | [OK] |
| F-PUB-12 | **Logo par défaut** : si aucun logo n'est téléversé, la page utilise `/logo.png` (PNG 512 × 512 converti de l'icône d'origine) ; le logo s'affiche **en cercle** sur fond blanc dans la barre de navigation, le pied de page et les menus latéraux (composants `HomeNavbar`, `HomeFooter`, `SidebarLogo`) | [OK] |
| F-PUB-13 | Toute modification de la page d'accueil est inscrite au **journal d'audit** (`HOMEPAGE_CONTENT_UPDATED`, `_IMAGE_UPDATED`, `_CAROUSEL_UPDATED`, `_NEWS_CREATED/UPDATED/DELETED`) | [OK] |
| F-PUB-14 | Données de campagne (`campaign.ts`) : types prévus pour une future API de campagne et d'annonces ; **aucune API n'existe** et la page n'affiche rien de fictif tant que rien n'est fourni | [Partiel] |

### 4.7 Documents et fichiers

| Réf. | Exigence | État |
| --- | --- | --- |
| F-DOC-01 | Formats acceptés : PDF, PNG, JPEG ; taille max **10 Mo** (pièces) / **5 Mo** (ressources du site, logos d'établissements) / **3 Mo** (photos de profil) | [OK] |
| F-DOC-02 | Une seule pièce par type et par dossier (`@@unique([applicationId, type])`) ; le remplacement supprime l'ancien fichier du disque | [OK] |
| F-DOC-03 | Stockage sur disque : `uploads/documents/` (nom `UUID + extension`), `uploads/site-settings/`, `uploads/establishments/` (logos), `uploads/avatars/` (photos de profil) | [OK] |
| F-DOC-04 | Téléchargement/visualisation sécurisés via `GET /documents/:id/file` avec contrôle d'accès par rôle et par établissement ; en-tête `inline` avec nom assaini | [OK] |
| F-DOC-05 | Clé de type de pièce validée par `^[a-z0-9_-]+$` ; clés des pièces configurées générées par slug depuis le libellé (accents retirés) | [OK] |
| F-DOC-06 | Pièces liées à la **candidature** (`ApplicationDocument`) et pièces liées à l'**inscription** établissement (`EnrolledStudentDocument`) | [OK] |
| F-DOC-07 | Suppression définitive d'un étudiant : ses fichiers sont effacés du disque après suppression des lignes (`DocumentService.removeFiles`, un fichier déjà absent est ignoré) | [OK] |

### 4.8 Notifications

**E-mails** (SMTP via Nodemailer) :

| Événement | Destinataire | Contenu |
| --- | --- | --- |
| Création de compte étudiant / renvoi | Étudiant | Lien de vérification valable 24 h |
| Vérification d'un quitus (e-mail du compte ≠ e-mail de la fiche) | Adresse enregistrée par l'établissement | Code à 6 chiffres, valable **10 min** |
| Demande de changement d'adresse | Nouvelle adresse | Lien de confirmation valable **1 h** |
| Adresse e-mail modifiée | Ancienne adresse | Alerte de sécurité indiquant la nouvelle adresse |
| Décision de la scolarité | Étudiant | « Votre dossier a été validé / refusé » + remarque ou motif + lien vers l'espace |

Transport : `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Le contenu HTML est échappé. Hors production, le code de quitus et le lien de changement d'e-mail sont aussi écrits dans les journaux du serveur lorsque l'envoi n'est pas configuré.

**Notifications intégrées** (table `Notification`, cloche de l'en-tête) : `APPLICATION_SUBMITTED` (« Dossier soumis »), `APPLICATION_VALIDATED` (« Dossier validé », avec la remarque éventuelle), `APPLICATION_REFUSED` (« Dossier refusé », avec le motif). Chaque utilisateur ne lit et ne marque comme lues que **ses propres** notifications.

### 4.9 Personnalisation de l'interface (4 espaces connectés)

Réglages **par espace** (`admin`, `etablissement`, `student`, `scolarite`), enregistrés en `localStorage`, synchronisés entre onglets : thème (Sombre / Minuit / Clair / Auto), couleur d'accentuation (9 préréglages + libre), couleur de fond (7 préréglages + libre), style de fond (uni / dégradé / points), lueur décorative, police (système / serif / mono), taille du texte (4 niveaux), arrondi, largeur du contenu, contraste élevé, réduction des animations, confirmation avant changement de statut, actualisation automatique, onglet de démarrage, nom de l'université et année universitaire. Le thème est appliqué par génération de CSS dynamique (`buildThemeCss`) qui surcharge les classes Tailwind `slate/blue`.

### 4.10 PWA (retirée)

Le manifeste (`manifest.webmanifest`), le Service Worker (`sw.js`) et son composant d'enregistrement (`ServiceWorkerRegistration.tsx`) ont été **supprimés** à la demande de l'auteur, la PWA n'étant pas utilisée. Les icônes SVG (`icon-192.svg`, `icon-512.svg`) sont conservées comme icônes du site (`layout.tsx`). ⚠️ Un navigateur qui avait déjà enregistré l'ancien Service Worker doit le désinstaller une fois (outils de développement → Application → Service Workers → Unregister).

---

## 5. Règles de gestion

| Réf. | Règle |
| --- | --- |
| RG-01 | Un étudiant (compte) a **au plus un** dossier de bourse (`EnrollmentApplication.userId` unique). |
| RG-02 | Un dossier n'est modifiable que s'il est `BROUILLON` ou `REFUSE`. |
| RG-03 | Toute sauvegarde d'un dossier `REFUSE` le remet en `BROUILLON` et efface la date de soumission. |
| RG-04 | Soumission : établissement, niveau, parcours et **code de quitus** obligatoires ; le quitus doit exister, appartenir à l'établissement du dossier **et avoir été vérifié par ce compte** (« Vérifiez d'abord ce quitus ») ; un quitus déjà utilisé par le dossier d'un autre compte est refusé. |
| RG-05 | Soumission : toutes les pièces obligatoires doivent être présentes. Liste = pièces `CANDIDATURE` actives de l'établissement (ou de la liste commune `*` si le mode « identique pour tous » est activé), si configurées, sinon liste par défaut `cin, quitus, residence` (+ `bac` si L1) ; `unemployment` jamais obligatoire ; `bac` obligatoire seulement en L1. |
| RG-06 | « L1 » détecté par l'expression `/licence\s*1\|\bL1\b/i` sur le libellé du niveau. |
| RG-07 | Si l'établissement a configuré un curriculum, niveau et parcours d'un dossier doivent être **actifs** dans ce curriculum ; sans curriculum, aucune validation. |
| RG-08 | Un quitus est unique (`code`), lié à au plus un étudiant inscrit et à au plus un dossier. |
| RG-09 | Code de quitus : `QT-` + 12 caractères majuscules/chiffres sans ambiguïté (alphabet de 32 signes, 60 bits aléatoires) ; comparaison insensible à la casse (mise en majuscules). |
| RG-10 | Seuls les étudiants **actifs** sans quitus reçoivent un quitus lors de la génération. |
| RG-11 | La scolarité ne décide que des dossiers `SOUMIS`/`EN_REVISION` ; la décision est `VALIDE` ou `REFUSE` ; le refus exige un motif non vide. |
| RG-12 | Le statut du `User` et celui du dossier sont mis à jour dans une même transaction (décision, soumission, forçage admin). |
| RG-13 | Un secrétaire ne peut pas : générer des quitus, consulter le tableau de bord, créer/modifier des comptes, modifier le curriculum, les pièces requises, la mention, l'apparence, le nom ou le logo de l'établissement. |
| RG-14 | Un responsable d'établissement ne voit et ne modifie que les données **de son établissement** (champ `establishment` du compte). |
| RG-15 | Un admin ne peut pas désactiver/supprimer son propre compte, ni le dernier admin actif. |
| RG-16 | Suppression d'un compte : d'abord corbeille (`deletedAt`, compte désactivé) ; purge définitive seulement depuis la corbeille et si aucune donnée liée. |
| RG-17 | Chaque action admin sur les comptes du personnel est consignée dans le journal d'audit. |
| RG-18 | Mots de passe : minimum 8 caractères (aucune autre règle de complexité). |
| RG-19 | Niveau/parcours d'une inscription établissement doivent exister, être actifs et appartenir au **cycle** (Licence/Master) de l'inscription. |
| RG-20 | Unicité : e-mail utilisateur, e-mail et matricule de fiche étudiante, nom d'établissement (insensible à la casse), (établissement, type, nom, cycle) pour le curriculum, (établissement, contexte, cycle, type) pour les pièces requises. |
| RG-21 | **Quitus** : le code à 6 chiffres de vérification est valable **10 min**, haché avec l'identifiant du défi, **5 essais** maximum, **1 envoi par minute** et **5 envois par heure** et par compte ; 30 requêtes de vérification / 10 min et par compte. Un quitus ne peut être rattaché qu'à **un seul compte** et à un seul dossier. |
| RG-22 | Un quitus n'est vérifiable que si la fiche liée est **active** et **non supprimée** et appartient à l'établissement choisi. |
| RG-23 | Suppression d'un étudiant inscrit : d'abord corbeille (`deletedAt`) ; purge définitive seulement depuis la corbeille ; le quitus est supprimé avec la fiche sauf s'il est utilisé par un dossier en ligne. |
| RG-24 | Renommer un établissement met à jour **toutes** les tables qui le référencent dans une seule transaction ; le supprimer est refusé tant que des comptes, étudiants, dossiers ou quitus y sont rattachés (le désactiver le retire de la liste étudiante). |
| RG-25 | Les pièces du dépôt de dossier (contexte `CANDIDATURE`) ne sont gérées que par la **scolarité centrale** ; les responsables d'établissement ne gèrent que le contexte `INSCRIPTION`. |
| RG-26 | Mode « identique pour tous » (`SiteSettings.uniformCandidatureDocuments`) : la liste portant la clé d'établissement `*` est utilisée pour **tous** les établissements, côté étudiant (affichage) comme côté serveur (contrôle à la soumission). |
| RG-27 | Changement d'adresse e-mail : lien envoyé à la nouvelle adresse (1 h, jeton haché) ; un seul changement en attente par utilisateur ; application seulement après clic ; unicité revérifiée à la confirmation ; alerte envoyée à l'ancienne adresse. |
| RG-28 | Chaque utilisateur ne voit et ne marque comme lues que **ses propres** notifications. |
| RG-29 | Les modifications de la page d'accueil (textes, images, carrousel, actualités, réglages) sont réservées à l'`ADMIN`, contrôlées côté serveur, et inscrites au journal d'audit. |
| RG-30 | Une clé de texte d'accueil inconnue est refusée ; une valeur `null` rétablit le texte d'origine. |
| RG-31 | Seul le **responsable** de l'établissement peut purger définitivement un étudiant ; le secrétaire peut le mettre à la corbeille et le restaurer. |
| RG-32 | Tentatives de connexion et de création de compte limitées par IP (voir F-AUTH-20) ; réponse 429 au-delà. |

---

## 6. Exigences non fonctionnelles

| Domaine | Exigence | Constat |
| --- | --- | --- |
| **Ergonomie** | Interface responsive (mobile, tablette, bureau), cibles tactiles ≥ 44 px, champs ≥ 16 px sur mobile | Respecté |
| **Accessibilité** | Libellés `aria-label`, rôles `alertdialog`/`switch`/`dialog`, `aria-pressed`, contraste élevé optionnel | Partiel (pas d'audit formel) |
| **Langue** | Interface 100 % française | Respecté |
| **Performance** | Requêtes Prisma directes ; liste des étudiants sans pagination | ⚠️ pas de pagination (étudiants, dossiers, comptes ; journal limité à 200) |
| **Disponibilité** | Rafraîchissement automatique côté étudiant (30 s), établissement (30 s), notifications (30 s, onglet visible) et admin (option) | Respecté |
| **Sécurité (limitation de débit)** | Limites ciblées en mémoire : vérification de quitus, codes de quitus, mot de passe actuel (comptes) | Partiel — voir S-01 |
| **Maintenabilité** | TypeScript strict, ESLint (frontend), oxlint + Prettier (backend), migrations Prisma versionnées (30 migrations) | Respecté |
| **Portabilité** | Variables d'environnement pour URL, SMTP, Google, base de données | Respecté |
| **Hors ligne** | Non pris en charge (PWA retirée) | – |
| **Observabilité** | Module `@nestjs/observe` activé seulement si `OBSERVE_APP_KEY` et `OBSERVE_APP_SECRET` sont définis ; journalisation de l'échec d'envoi d'e-mail | Partiel |
| **Navigateurs** | Navigateurs modernes (CSS `color-mix`, `useSyncExternalStore`, Tailwind 4) | – |

---

## 7. Architecture technique

### 7.1 Vue d'ensemble

```
┌──────────────────────────┐   HTTPS / JSON + multipart   ┌───────────────────────────┐
│ Frontend (Next.js 16)    │ ───────────────────────────► │ Backend (NestJS 12)       │
│ React 19, Tailwind 4     │   Authorization: Bearer …    │ Contrôleurs + Services    │
│ port 3000                │                              │ port 3001                 │
└──────────────────────────┘                              └─────┬───────────┬─────────┘
                                                                │ Prisma 6  │ fichiers
                                                          ┌─────▼─────┐ ┌───▼──────────┐
                                                          │PostgreSQL │ │ uploads/ (disque)│
                                                          └───────────┘ └──────────────┘
                                                                │ SMTP (Nodemailer)  │ Google OAuth
```

### 7.2 Technologies

| Couche | Technologie | Version |
| --- | --- | --- |
| Backend | NestJS (+ plateforme Express), TypeScript (ESM, extensions `.js` dans les imports) | 12 / TS 6 |
| ORM / BDD | Prisma Client, PostgreSQL | 6.19.0 |
| Authentification | Jetons maison HMAC-SHA256, hachage `scrypt` (sel 16 o, clé 64 o), `google-auth-library` | – |
| E-mail | Nodemailer | 10 |
| Tests backend | Vitest, Supertest | 4 |
| Lint / format | oxlint, Prettier | – |
| Frontend | Next.js (App Router), React, Tailwind CSS, lucide-react | 16.3.4 / 19.2.8 / 4 / 1.43 |
| Polices | Playfair Display (titres, via `next/font/google`) | – |

### 7.3 Organisation du dépôt

```
plateforme-inscription-mahajanga/
├── CAHIER_DES_CHARGES.md        ← ce document
├── PROJECT_HISTORY.md           ← description fonctionnelle et historique du projet
├── backend/
│   ├── README.md                ← installation, dossiers de démonstration, nettoyage
│   ├── prisma/ (schema.prisma, seed.mjs, seed-demo.mjs, clean-pending-demo.mjs, sync-isstm-curriculum.mjs, migrations/ ×30)
│   ├── src/ (main, app.module, *.controller.ts, *.service.ts, document-type.ts, homepage-defaults.json)
│   ├── test/ (e2e)
│   └── uploads/ (créé à l'exécution : documents/, site-settings/, establishments/, avatars/)
└── frontend/
    ├── public/ (images campus, icônes SVG, logo.png)
    └── src/
        ├── app/ (page.tsx, login/, login/google/, verify-email/, confirm-email-change/, student/, etablissement/, scolarite/, admin/, layout.tsx, globals.css)
        └── components/ (voir §10.2 ; sous-dossier home/ pour la page d'accueil)
```

### 7.4 Backend — modules

| Fichier | Responsabilité |
| --- | --- |
| [main.ts](backend/src/main.ts) | Démarrage, CORS (origine = `FRONTEND_URL`, méthodes GET/POST/PUT/PATCH/DELETE, en-têtes `Content-Type` et `Authorization`), fichiers statiques publics `/uploads/site-settings`, `/uploads/establishments` et `/uploads/avatars`, délai de tentative réseau porté à 5 s (corrige les timeouts vers Google), port `PORT` (3001) |
| [app.module.ts](backend/src/app.module.ts) | Déclaration des **12 contrôleurs** et **11 fournisseurs** ; module d'observabilité conditionnel |
| [auth.controller.ts](backend/src/auth.controller.ts) | Routes `/auth/*`, validation des entrées, flux Google |
| [auth.service.ts](backend/src/auth.service.ts) | Inscription/connexion, jetons, vérification d'e-mail, gardes de rôle (`requireAdmin`, `requireEstablishmentManager`, `requireEstablishmentAdmin`, `requireCentralRegistrar`, `requireUser`), gestion des comptes du personnel, corbeille, journal d'audit |
| [account.controller.ts](backend/src/account.controller.ts) / [account.service.ts](backend/src/account.service.ts) | `/account/*` : profil, photo, changement de mot de passe, changement d'e-mail en deux temps ; limitation des mots de passe erronés |
| [notifications.controller.ts](backend/src/notifications.controller.ts) | `/notifications` : liste, « tout lire », lecture d'une notification |
| [google-auth.service.ts](backend/src/google-auth.service.ts) | Client OAuth2 Google, vérification du jeton d'identité |
| [mail.service.ts](backend/src/mail.service.ts) | E-mails de vérification, de décision, de code de quitus, de changement d'adresse et d'alerte |
| [admin.controller.ts](backend/src/admin.controller.ts) | Routes `/admin/*` (tableau de bord, comptes, étudiants, journal d'audit) |
| [establishment.controller.ts](backend/src/establishment.controller.ts) | Routes établissement (curriculum, pièces d'inscription, étudiants, corbeille, tableau de bord, secrétaires, paramètres, génération de quitus) et routes de vérification du quitus |
| [establishments.controller.ts](backend/src/establishments.controller.ts) / [establishments.service.ts](backend/src/establishments.service.ts) | Table des établissements : liste publique, gestion par l'admin (création, renommage en cascade, logo, activation, suppression), identité de son propre établissement |
| [quitus.service.ts](backend/src/quitus.service.ts) | Vérification du quitus en deux temps (code à 6 chiffres), rattachement au compte, limitation des essais |
| [student.controller.ts](backend/src/student.controller.ts) | Routes `/student/*` (dossier de bourse, notification de soumission) |
| [central-registrar.controller.ts](backend/src/central-registrar.controller.ts) | Routes `/scolarite/*` (liste, décision + notification, pièces du dépôt de dossier, mode « identique pour tous ») |
| [document.controller.ts](backend/src/document.controller.ts) / [document.service.ts](backend/src/document.service.ts) | Téléversement, listage, lecture et suppression physique des pièces ; dossiers consultables |
| [document-type.ts](backend/src/document-type.ts) | Clé technique d'une pièce (`documentTypeSlug`), clé d'établissement réservée `*`, portée des pièces du dépôt (`candidatureRequirementScope`) |
| [site-settings.controller.ts](backend/src/site-settings.controller.ts) / [site-settings.service.ts](backend/src/site-settings.service.ts) | Réglages du site (couleurs, logo, favicon, hero) et journalisation des modifications |
| [homepage.controller.ts](backend/src/homepage.controller.ts) / [homepage.service.ts](backend/src/homepage.service.ts) / [homepage-defaults.json](backend/src/homepage-defaults.json) | Textes modifiables de la page d'accueil (161 clés), titre/sous-titre/bouton du hero, actualités |
| [prisma.service.ts](backend/src/prisma.service.ts) | Connexion Prisma |
| [app.controller.ts](backend/src/app.controller.ts) | `GET /` → « Hello World! » (squelette NestJS) |

Particularités d'implémentation : l'autorisation se fait **manuellement dans chaque route** (lecture de l'en-tête `Authorization`, appel à une méthode `require…`) ; il n'y a ni `Guard` Nest, ni `ValidationPipe`/DTO — la validation est écrite à la main dans chaque contrôleur.

## 8. Modèle de données

### 8.1 Énumérations

| Énumération | Valeurs |
| --- | --- |
| `UserRole` | `ETUDIANT`, `ADMIN`, `ETABLISSEMENT`, `ADMIN_ETABLISSEMENT`, `SECRETAIRE`, `SCOLARITE_CENTRALE` |
| `RegistrationStatus` | `BROUILLON`, `SOUMIS`, `EN_REVISION`, `VALIDE`, `REFUSE` |
| `Gender` | `FEMININ`, `MASCULIN`, `AUTRE` |
| `CurriculumOptionType` | `NIVEAU`, `PARCOURS` |
| `CurriculumCycle` | `LICENCE`, `MASTER` |
| `DocumentRequirementContext` | `INSCRIPTION`, `CANDIDATURE` |
| `EnrollmentQuality` | `PASSANT`, `REDOUBLANT` |
| `AuditAction` | `STAFF_ACCOUNT_CREATED`, `_STATUS_CHANGED`, `_NAME_UPDATED`, `_PASSWORD_RESET`, `_TRASHED`, `_RESTORED`, `_PURGED` ; `ACCOUNT_PASSWORD_CHANGED`, `ACCOUNT_EMAIL_CHANGED` ; `HOMEPAGE_CONTENT_UPDATED`, `HOMEPAGE_IMAGE_UPDATED`, `HOMEPAGE_CAROUSEL_UPDATED`, `HOMEPAGE_NEWS_CREATED`, `HOMEPAGE_NEWS_UPDATED`, `HOMEPAGE_NEWS_DELETED` |
| `HeroBackgroundType` | `COLOR`, `GRADIENT`, `IMAGE` |

### 8.2 Modèles

| Modèle | Champs clés | Relations / contraintes |
| --- | --- | --- |
| **User** | `id` (cuid), `fullName`, `email` (unique), `passwordHash?`, `emailVerified`, `active`, `role`, `registrationStatus`, `establishment?`, `level?`, `program?`, `avatarUrl?`, `deletedAt?`, horodatages | 1–1 `EnrollmentApplication` ; 0–1 `EnrolledStudent` ; N `Quitus` émis ; N `EmailVerificationToken` ; N `QuitusChallenge` ; N `EmailChangeRequest` ; N `Notification` ; N dossiers relus |
| **EmailVerificationToken** | `tokenHash` (unique, SHA-256), `userId`, `expiresAt` | Suppression en cascade avec l'utilisateur ; index `userId`, `expiresAt` |
| **EmailChangeRequest** | `userId`, `newEmail`, `tokenHash` (unique), `expiresAt` | Cascade avec l'utilisateur ; un seul changement en attente par utilisateur |
| **Notification** | `userId`, `type`, `title`, `message`, `readAt?`, `createdAt` | Cascade ; index `(userId, createdAt)` et `(userId, readAt)` |
| **AuditLogEntry** | `action`, `actorId?`, `actorName`, `targetId?`, `targetName`, `detail?`, `createdAt` | Index `createdAt` ; pas de clé étrangère (conserve l'historique après purge) |
| **Quitus** | `code` (unique), `studentName`, `studentEmail?`, `establishment`, `issuedAt`, `issuedById?`, `enrollmentId?` (unique) | Lié à `EnrolledStudent` et à au plus un `EnrollmentApplication` ; N `QuitusChallenge` |
| **QuitusChallenge** | `userId`, `quitusId`, `codeHash`, `attempts`, `expiresAt` | Code à 6 chiffres envoyé à l'e-mail de la fiche pour prouver que le demandeur est le titulaire du quitus ; cascade |
| **EnrollmentApplication** (dossier de bourse) | `userId` (unique), `establishment`, `level`, `program`, `quitusId?` (unique), `status`, `submittedAt?`, `reviewNote?`, `reviewedAt?`, `reviewedById?` | Cascade avec l'utilisateur ; `reviewedBy` → `SetNull` ; N `ApplicationDocument` |
| **ApplicationDocument** | `applicationId`, `type`, `originalName`, `storageName` (unique), `mimeType`, `size` | Unique `(applicationId, type)` ; cascade |
| **EnrolledStudent** | `registrationNumber` (unique), `fullName`, `email?` (unique), `phone`, `gender`, `registrationForm` (`LICENCE`/`MASTER`), `birthDatePlace`, `cin`, `nationality`, `address`, `previousEstablishment`, `bacYear/Series/Center`, `previousUniversityRegistration`, `fatherName`, `motherName`, `parentsPhone`, `parentsCity`, `respondentName/Phone/Address`, `maritalStatus`, `licenceYear`, `mention`, `previousLevel`, `previousProgram`, `quality`, `establishment`, `level`, `program`, `active`, **`deletedAt?`** (corbeille), `userId?` (unique) | Lien optionnel vers `User` (`SetNull`) ; 0–1 `Quitus` ; N `EnrolledStudentDocument` |
| **EnrolledStudentDocument** | `enrolledStudentId`, `type`, fichier (mêmes champs que ci-dessus) | Unique `(enrolledStudentId, type)` ; cascade |
| **Establishment** | `id`, `name` (unique), `logoUrl?`, `active`, `position`, horodatages | Le **nom** est la valeur stockée comme texte dans toutes les autres tables ; pas de clé étrangère (renommage en cascade applicatif) |
| **EstablishmentCurriculumOption** | `establishment`, `type` (NIVEAU/PARCOURS), `name`, `cycle`, `active` | Unique `(establishment, type, name, cycle)` |
| **DocumentRequirement** | `establishment` (ou `*` pour la liste commune), `context`, `cycle`, `type`, `label`, `active` | Unique `(establishment, context, cycle, type)` |
| **EstablishmentSettings** | `establishment` (clé), `mention?`, `interfaceSettings` (JSON) | – |
| **SiteSettings** | `id = "default"`, couleurs, `logoUrl`, `faviconUrl`, `heroBackgroundType`, `heroBackgroundImages[]`, `heroOverlayOpacity`, `heroTitle`, `heroSubtitle`, libellés et liens des 2 boutons, **`homepageContent` (JSON), `homepageNews` (JSON), `uniformCandidatureDocuments`** | Ligne unique créée à la volée |

### 8.3 Historique des migrations (30)

`initial_schema` → `establishment_quitus` → `enrolled_students` → `enrollment_applications` → `link_users_to_enrolled_students` → `central_registrar` → `establishment_curriculum` → `email_verification` → `staff_account_active` → `establishment_account_roles` → `application_documents` → `enrollment_form_details` → `curriculum_cycle_and_enrollment_extras` → `scope_curriculum_unique_by_cycle` → `staff_account_trash_and_audit_log` → `site_settings` → `hero_background_images` → `enrolled_student_documents` → `document_requirements` → `document_requirement_context` → `establishment_interface_settings` → `add_establishments` → `add_quitus_challenge` → `add_account_security` → `add_user_avatar` → `add_notifications` → `add_missing_establishments` (École de Vétérinaire, Écoles doctorales, IUGM Antsohihy, IUGM Maevatanana, EDSP Antsohihy, UFRSS Mandritsara ; insertion idempotente) → `homepage_customization` → `uniform_candidature_documents` → `enrolled_student_trash`.

## 9. API REST — catalogue complet

Toutes les routes protégées attendent `Authorization: Bearer <jeton>`. Les erreurs renvoient le format NestJS `{ statusCode, message, error }`. URL de base : `http://localhost:3001`.

### 9.1 Authentification et compte

| Méthode | Route | Corps / paramètres | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | `fullName, email, password` | Public (5 / heure / IP). Crée un compte `ETUDIANT`, envoie l'e-mail de vérification |
| POST | `/auth/login` | `email, password` | Public (30 / 15 min / IP, 5 échecs / 15 min / IP + e-mail). Retourne `{ accessToken, user }` |
| POST | `/auth/verify-email` | `token` | Public. Consomme le jeton, vérifie l'adresse |
| POST | `/auth/resend-verification-email` | `email` | Public. Renvoie le lien |
| GET | `/auth/google` | – | Public. Pose le cookie `state`, redirige vers Google |
| GET | `/auth/google/callback` | `code, state` | Public. Vérifie `state`, crée/connecte l'utilisateur, redirige vers `/login/google?code=…` |
| POST | `/auth/google/exchange` | `code` | Public. Échange le code à usage unique (60 s) contre `{ accessToken, user }` |
| GET | `/account/me` | – | Connecté. `{ id, fullName, email, role, avatarUrl }` |
| POST / DELETE | `/account/avatar` | multipart `file` (≤ 3 Mo) | Connecté. Ajoute / supprime la photo de profil |
| PATCH | `/account/password` | `{ currentPassword, newPassword }` | Connecté. Change le mot de passe (5 échecs / 15 min) |
| POST | `/account/email` | `{ newEmail, currentPassword }` | Connecté. Envoie le lien de confirmation à la nouvelle adresse |
| POST | `/account/email/confirm` | `{ token }` | Public (le jeton fait foi). Applique le changement d'adresse |
| GET | `/notifications` | – | Connecté. `{ items (50 max), unread }` |
| POST | `/notifications/read-all` | – | Connecté. Marque tout comme lu |
| PATCH | `/notifications/:id/read` | – | Connecté. Marque une notification comme lue |

### 9.2 Étudiant (rôle `ETUDIANT`) et routes publiques associées

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/student/application` | Dossier de l'étudiant (avec code du quitus) ou `null` |
| GET | `/student/profile` | Nom, e-mail, établissement, niveau, parcours |
| PUT | `/student/application` | Enregistre le brouillon `{ establishment, level, program, quitusCode? }` |
| POST | `/student/application/submit` | Soumission finale (contrôle quitus + pièces) ; crée la notification « Dossier soumis » |
| POST | `/student/application/documents/:type` | Téléverse une pièce (multipart, champ `file`) |
| GET | `/student/application/documents` | Liste des pièces déposées |
| POST | `/quitus/verify` | Connecté. `{ code, establishment }` → `{ verified, requiresCode, code, establishment, maskedEmail? }` ; envoie le code à 6 chiffres si nécessaire |
| POST | `/quitus/confirm` | Connecté. `{ code, establishment, otp }` (6 chiffres) → rattache le quitus au compte |
| GET | `/establishments` | **Public** : établissements actifs `{ id, name, logoUrl }` |
| GET | `/establishments/:nom/curriculum` | **Public** : niveaux et parcours actifs d'un établissement |
| GET | `/establishments/:nom/document-requirements` | **Public** : pièces actives du dépôt de dossier (liste de l'établissement ou liste commune) |

### 9.3 Établissement (rôles `ETABLISSEMENT`, `ADMIN_ETABLISSEMENT`, `SECRETAIRE`, sauf mention « resp. »)

L'établissement visé est celui du compte connecté. Le préfixe `isstm` est un nom historique.

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/establishment/isstm/curriculum` | Curriculum complet (actifs et inactifs) |
| POST | `/establishment/isstm/curriculum` | **resp.** Ajoute `{ type, name, cycle }` |
| PATCH | `/establishment/isstm/curriculum/:id` | **resp.** Modifie `name`, `active`, `cycle` |
| DELETE | `/establishment/isstm/curriculum/:id` | **resp.** Supprime |
| GET | `/establishment/isstm/document-requirements?context=` | Pièces requises d'inscription |
| POST | `/establishment/isstm/document-requirements` | **resp.** `{ cycle, label, type? }` (contexte `INSCRIPTION` uniquement ; `CANDIDATURE` refusé) |
| PATCH | `/establishment/isstm/document-requirements/:id` | **resp.** `label`, `active`, `cycle` |
| DELETE | `/establishment/isstm/document-requirements/:id` | **resp.** Supprime |
| GET | `/establishment/isstm/students?search=&gender=&level=` | Étudiants inscrits non supprimés (avec quitus) |
| POST | `/establishment/isstm/students` | Inscription ou réinscription (`existingStudentId`) |
| PATCH | `/establishment/isstm/students/:id` | Modifie la fiche (nom, e-mail, téléphone, genre, qualité, niveau/parcours/cycle, identité) |
| DELETE | `/establishment/isstm/students/:id` | Met l'étudiant à la corbeille |
| GET | `/establishment/isstm/students/trash` | Étudiants de la corbeille |
| POST | `/establishment/isstm/students/:id/restore` | Restaure un étudiant de la corbeille |
| DELETE | `/establishment/isstm/students/:id/permanent` | **resp.** Suppression définitive (depuis la corbeille uniquement) |
| GET | `/establishment/isstm/students/:id/dossier` | Dossier consultable |
| GET | `/establishment/isstm/students/:id/documents` | Pièces d'inscription |
| POST | `/establishment/isstm/students/:id/documents/:type` | Téléverse une pièce d'inscription |
| GET | `/establishment/isstm/dashboard` | **resp.** Statistiques de l'établissement |
| GET | `/establishment/isstm/secretaries` | Liste des secrétaires |
| POST | `/establishment/isstm/secretaries` | **resp.** Crée un secrétaire |
| PATCH | `/establishment/isstm/secretaries/:id` | **resp.** Nom / mot de passe |
| PATCH | `/establishment/isstm/secretaries/:id/status` | **resp.** Active / désactive |
| GET / PATCH | `/establishment/isstm/settings` | Lecture ; **resp.** écriture de la mention |
| GET / PUT | `/establishment/isstm/interface-settings` | Lecture ; **resp.** écriture de l'apparence partagée |
| POST | `/establishment/isstm/quitus/generate` | **resp.** `{ studentIds? }` → `{ created, alreadyGenerated }` |
| GET | `/establishment/isstm/profile` | `{ id, name, logoUrl }` de son établissement (le crée s'il n'existait qu'en texte) |
| PATCH | `/establishment/isstm/profile` | **resp.** Renomme l'établissement (cascade) |
| POST / DELETE | `/establishment/isstm/profile/logo` | **resp.** Ajoute (PNG/JPG/WebP ≤ 5 Mo) / supprime le logo |

### 9.4 Scolarité centrale (rôle `SCOLARITE_CENTRALE`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/scolarite/applications` | Dossiers `SOUMIS`, `EN_REVISION`, `VALIDE`, `REFUSE` (du plus récent) |
| PATCH | `/scolarite/applications/:id/decision` | `{ status: 'VALIDE'\|'REFUSE', note? }` + notification et e-mail à l'étudiant |
| GET | `/scolarite/applications/:id/dossier` | Dossier complet |
| GET / PUT | `/scolarite/document-requirements-mode` | Lit / définit le mode « identique pour tous » `{ uniform }` |
| GET | `/scolarite/document-requirements?establishment=` | Pièces du dépôt de dossier d'un établissement (ou `*`) |
| POST | `/scolarite/document-requirements` | `{ establishment, label }` ; refuse un doublon |
| PATCH | `/scolarite/document-requirements/:id` | `label`, `active` |
| DELETE | `/scolarite/document-requirements/:id` | Supprime |

### 9.5 Administrateur (rôle `ADMIN`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/admin/dashboard` | Statistiques du tableau de bord |
| GET | `/admin/users` | Tous les comptes non supprimés |
| PATCH | `/admin/users/:id/status` | Active/désactive (gardes soi-même / dernier admin) |
| DELETE | `/admin/users/:id` | Corbeille (mêmes gardes) |
| GET | `/admin/students` | Comptes étudiants et statut |
| GET | `/admin/establishments` | Établissements déduits des comptes, avec effectifs |
| GET | `/admin/establishments/:establishment/students?search=&level=&program=` | Étudiants d'un établissement |
| GET | `/admin/students/:id/dossier` | Dossier d'un étudiant |
| PATCH | `/admin/students/:id/status` | Force le statut `{ status }` |
| GET | `/admin/staff-accounts` / `/admin/staff-accounts/trash` | Comptes du personnel / corbeille |
| POST | `/admin/staff-accounts` | Crée un compte `{ fullName, email, password, role, establishment? }` |
| PATCH | `/admin/staff-accounts/:id/status` · `/name` · `/password` | Statut, nom, mot de passe |
| DELETE | `/admin/staff-accounts/:id` | Corbeille |
| POST | `/admin/staff-accounts/:id/restore` | Restaure |
| DELETE | `/admin/staff-accounts/:id/permanent` | Purge définitive |
| GET | `/admin/audit-log` | 200 dernières entrées |
| GET | `/admin/institutions` | Établissements (table `Establishment`) avec effectifs (étudiants, dossiers, personnel) |
| POST | `/admin/institutions` | Crée un établissement `{ name }` |
| PATCH | `/admin/institutions/:id` | `{ name?, active? }` (renommage en cascade) |
| POST / DELETE | `/admin/institutions/:id/logo` | Ajoute (PNG/JPG/WebP ≤ 5 Mo) / supprime le logo |
| DELETE | `/admin/institutions/:id` | Supprime (409 si des données y sont rattachées) |
| PUT | `/admin/site-settings` | Met à jour les réglages (couleurs validées, opacité 0–100) |
| POST | `/admin/site-settings/upload/:asset` | `asset` = `logo` ou `favicon` (PNG/JPG/SVG ≤ 5 Mo) |
| POST / DELETE | `/admin/site-settings/hero-images` · `/:index` | Ajoute (max 4) / supprime une photo |
| POST | `/admin/site-settings/reset` | Réinitialise tout |
| GET | `/admin/homepage` | Contenu de l'accueil ; sert aussi à confirmer qu'une session est `ADMIN` |
| PATCH | `/admin/homepage/content` | Modifie des textes `{ clé: texte \| null }` |
| PATCH | `/admin/homepage/hero` | `heroTitle`, `heroSubtitle`, `ctaSecondaryLabel` |
| POST | `/admin/homepage/news` | Ajoute une actualité `{ title, body, publishedAt? }` |
| PATCH / DELETE | `/admin/homepage/news/:id` | Modifie / supprime une actualité |

### 9.6 Communs

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/site-settings` | **Public** : réglages de la page d'accueil |
| GET | `/homepage` | **Public** : textes (valeurs d'origine + modifications) et actualités |
| GET | `/documents/:id/file` | Fichier (étudiant : le sien ; personnel d'établissement : son établissement ; scolarité et admin : tous) |
| GET | `/uploads/site-settings/*`, `/uploads/establishments/*`, `/uploads/avatars/*` | **Public** : images du site, logos d'établissements, photos de profil |
| GET | `/` | « Hello World! » |

## 10. Frontend — pages et composants

### 10.1 Pages (App Router)

| Route | Fichier | Description |
| --- | --- | --- |
| `/` | [page.tsx](frontend/src/app/page.tsx) | Accueil public (et mode personnalisation `?mode=personnalisation` pour l'admin) |
| `/login` | [login/page.tsx](frontend/src/app/login/page.tsx) | Connexion / création de compte (bascule sur place), Google, renvoi de la vérification |
| `/login/google` | [login/google/page.tsx](frontend/src/app/login/google/page.tsx) | Reçoit le code Google, l'échange une seule fois (garde `useRef` contre le double effet en mode strict), stocke la session, redirige |
| `/verify-email` | [verify-email/page.tsx](frontend/src/app/verify-email/page.tsx) | Valide le jeton reçu par e-mail |
| `/confirm-email-change` | [confirm-email-change/page.tsx](frontend/src/app/confirm-email-change/page.tsx) | Valide le lien de changement d'adresse e-mail |
| `/student` | [student/page.tsx](frontend/src/app/student/page.tsx) (≈ 1 150 lignes) | Espace étudiant |
| `/etablissement` | [etablissement/page.tsx](frontend/src/app/etablissement/page.tsx) (≈ 2 600 lignes) | Espace établissement |
| `/scolarite` | [scolarite/page.tsx](frontend/src/app/scolarite/page.tsx) (≈ 1 000 lignes) | Espace scolarité centrale |
| `/admin` | [admin/page.tsx](frontend/src/app/admin/page.tsx) (≈ 1 000 lignes) | Espace administrateur |

Navigation par espace :
- **Étudiant** : Dépôt de dossier · Mon dossier · Notifications · Nota-bene · Paramètres (+ Mon compte via le menu du profil).
- **Établissement** : Tableau de bord (resp.) · Liste des étudiants · Corbeille · Ajouter secrétaire (resp.) · Ajouter un étudiant (Nouvelle inscription / Réinscription) · Paramètres (resp. : Apparence & Affichage · Comportement · Structure académique & mentions · Pièces — Inscription) · Mon compte (avec l'identité de l'établissement pour le responsable).
- **Scolarité** : Tableau de bord · Historique · Dossiers à traiter · Pièces à téléverser · Mon compte · Paramètres (Apparence & Affichage · Comportement · Identité).
- **Admin** : Tableau de bord · Historique · Étudiants · Établissements · Gestion des comptes · Tous les comptes · Corbeille · Mon compte · Paramètres (Apparence & Affichage · Comportement · Identité · Page d'accueil).

### 10.2 Composants partagés

| Composant | Rôle |
| --- | --- |
| [DossierViewer](frontend/src/components/DossierViewer.tsx) | Fenêtre de consultation d'un dossier (profil de 26 champs, pièces ouvrables/téléchargeables via blob) |
| [ConfirmDialog](frontend/src/components/ConfirmDialog.tsx) | Confirmation de déconnexion |
| [HeaderToolbar](frontend/src/components/HeaderToolbar.tsx) | En-tête commun des espaces connectés : bascule de thème, crayon de personnalisation (admin), cloche de notifications, menu du profil (photo, nom, rôle, Mon compte, Actualiser, Paramètres, Déconnexion) |
| [AccountPanel](frontend/src/components/AccountPanel.tsx) | Page « Mon compte » : photo, adresse e-mail, mot de passe ; accepte des enfants (ex. identité de l'établissement) |
| [SidebarLogo](frontend/src/components/SidebarLogo.tsx) | Logo **rond** de l'en-tête des menus latéraux : logo fourni, sinon logo du site, sinon `logo.png` |
| [EstablishmentIdentityPanel](frontend/src/components/EstablishmentIdentityPanel.tsx) | Nom et logo de l'établissement (responsable) |
| [EstablishmentsAdminPanel](frontend/src/components/EstablishmentsAdminPanel.tsx) | Gestion des établissements par l'admin |
| [establishments.ts](frontend/src/components/establishments.ts) | Hook `useEstablishments`, `logoSrc`, `EstablishmentIcon` (pictogrammes de repli) et `EstablishmentBadge` (pastille ronde logo/pictogramme) |
| [CandidatureDocumentsPanel](frontend/src/components/CandidatureDocumentsPanel.tsx) | Pièces du dépôt de dossier et mode « identique pour tous » (scolarité) |
| [HomepageHero](frontend/src/components/HomepageHero.tsx) | Fond et contenu du hero |
| [HomepageSettingsPanel](frontend/src/components/HomepageSettingsPanel.tsx) | Réglages de l'accueil dans l'espace admin (couleurs, logo, favicon, hero) |
| [components/home/](frontend/src/components/home/) | Sections de l'accueil (`HomeNavbar`, `HeroExtras`, `BourseSection`, `StepsSection`, `PrepareSection`, `BenefitsSection`, `EstablishmentsSection`, `StatusesSection`, `AnnouncementsList`, `FaqSection`, `HelpSection`, `FinalCta`, `HomeFooter`, `SectionShell`), édition en place (`HomepageEditor`, `HomepageEditModals`, `homepageStore`, `HomeText`), session (`useHomeSession`), valeurs par défaut (`homepage-defaults.json`, à garder **identique** à celle du backend) |
| [AdminSettingsPanel](frontend/src/components/AdminSettingsPanel.tsx) | Panneau d'apparence commun aux 4 espaces |
| [adminSettings.ts](frontend/src/components/adminSettings.ts) | Types, valeurs par défaut, migration d'anciens réglages, génération du CSS de thème |
| [useInterfaceSettings](frontend/src/components/useInterfaceSettings.ts) | Hook de chargement/sauvegarde des réglages |
| [useNotifications](frontend/src/components/useNotifications.ts) / [usePolling](frontend/src/components/usePolling.ts) / [useProfile](frontend/src/components/useProfile.ts) | Notifications (30 s), actualisation périodique tant que l'onglet est visible, profil de l'utilisateur connecté |
| [PlatformThemeProvider](frontend/src/components/PlatformThemeProvider.tsx) | Applique le thème selon l'espace visité |
| [HomeThemeToggle](frontend/src/components/HomeThemeToggle.tsx) | Bascule clair/sombre des pages publiques |
| [dashboardPath.ts](frontend/src/components/dashboardPath.ts) | Rôle → chemin du tableau de bord |
| [siteSettings.ts](frontend/src/components/siteSettings.ts) | Types, valeurs par défaut, `assetUrl`, `DEFAULT_LOGO` (`/logo.png`), récupération des réglages du site |

### 10.3 Variables d'environnement frontend

| Variable | Défaut | Usage |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL de l'API |
| `NEXT_PUBLIC_GOOGLE_AUTH_URL` | `${API}/auth/google` | Point d'entrée Google |

### 10.4 Stockage navigateur

| Clé | Support | Contenu |
| --- | --- | --- |
| `auth_token`, `user_role`, `auth_user` | `sessionStorage` | Session |
| `home_theme` | `localStorage` | Thème des pages publiques |
| `admin_ui_settings`, `_etablissement_ui_settings`, `_student_ui_settings`, `_scolarite_ui_settings` | `localStorage` | Apparence par espace |

---

## 11. Sécurité

### 11.1 Mesures en place
- Mots de passe hachés par **scrypt** avec sel aléatoire ; comparaison en temps constant.
- Jetons de session signés HMAC-SHA256, expiration 8 h, vérification en temps constant, **rechargement de l'utilisateur en base à chaque requête** (rôle et état `active` revérifiés).
- En production, `AUTH_TOKEN_SECRET` est obligatoire (sinon erreur 503).
- Jetons de vérification d'e-mail : 256 bits, stockés **hachés**, à usage unique (suppression avant mise à jour, transaction), expiration 24 h.
- OAuth Google : `state` en cookie `httpOnly`/`sameSite=lax`/`secure` en production, jeton d'identité vérifié (audience), e-mail Google vérifié exigé, code d'échange à usage unique de 60 s.
- Contrôle d'accès par rôle **et** par établissement sur les dossiers et fichiers.
- Fichiers stockés sous un nom UUID (pas de nom client sur le disque) ; nom assaini dans l'en-tête de réponse.
- Contenu HTML des e-mails échappé ; CORS limité à l'origine du frontend.
- Message de connexion identique pour e-mail inconnu et mot de passe erroné ; renvoi de vérification sans fuite d'existence.
- Journal d'audit des actions admin, des changements de mot de passe/e-mail et des modifications de l'accueil ; garde-fous « dernier admin » et « soi-même ».
- **Quitus lié au demandeur** : code à 6 chiffres envoyé à l'e-mail de la fiche, haché, 10 min, 5 essais, envois limités ; un quitus ne se rattache qu'à un seul compte.
- Changement d'e-mail confirmé par lien sur la nouvelle adresse, avec alerte à l'ancienne ; mot de passe actuel exigé et limité à 5 échecs / 15 min.
- Photos de profil : type annoncé **et** signature du fichier (PNG/JPEG/WebP) contrôlés ; logos d'établissements limités à PNG/JPG/WebP.
- Modification de l'accueil : contrôlée côté serveur (`requireAdmin`), clés de texte validées contre la liste connue, longueurs bornées.

### 11.2 Vulnérabilités et faiblesses constatées ⚠️

| # | Constat | Gravité | Recommandation |
| --- | --- | --- | --- |
| S-01 | **Limitation de débit partielle** : connexion (30 / 15 min / IP et 5 échecs / 15 min / IP + e-mail), création de compte (5 / h / IP), vérification de quitus, codes de quitus et mot de passe actuel sont limités, **en mémoire** (perdu au redémarrage, non partagé entre instances ; derrière un proxy, l'IP lue est celle du proxy tant que `trust proxy` n'est pas activé). Le **renvoi d'e-mail de vérification** n'est toujours pas limité | Moyenne | `@nestjs/throttler` ou stockage partagé ; limiter `/auth/resend-verification-email` ; activer `trust proxy` en production |
| S-02 | Jeton de session en `sessionStorage` (accessible à tout script de la page) ; pas de révocation avant expiration (8 h) | Moyenne | Cookie `httpOnly` + jeton de rafraîchissement |
| S-03 | Secret de repli codé en dur `development-only-secret-change-before-production` si `AUTH_TOKEN_SECRET` est absent hors production | Moyenne | Refuser le démarrage sans secret |
| S-04 | `.env.example` contient un **identifiant client Google réel** (`GOOGLE_CLIENT_ID=…apps.googleusercontent.com`) et des mots de passe de démonstration | Faible/Moyenne | Remplacer par des valeurs factices |
| S-14 | `backend/.local-credentials.txt` a été versionné (commit `c22cdc3`) et contient adresses et **mots de passe** des comptes de démonstration. **Retiré du suivi et ajouté au `.gitignore`** ; mais le fichier **reste dans l'historique Git** et sur GitHub tant que l'historique n'est pas réécrit | **Élevée** | Changer les mots de passe concernés (même s'ils ont déjà changé), puis réécrire l'historique (`git filter-repo`) |
| S-15 | ~~La purge définitive des étudiants était ouverte au secrétaire~~ **Corrigé** : elle exige maintenant le rôle responsable (RG-31) ; le bouton « Supprimer définitivement » est masqué pour le secrétaire | Résolu | – |
| S-05 | Validation du type de fichier basée sur le **`mimetype` déclaré** par le client (pas d'inspection du contenu) pour les pièces de dossier, les logos de site/d'établissement (seules les photos de profil contrôlent la signature) ; les SVG ne sont acceptés que pour logo/favicon et servis tels quels (risque de script dans un SVG) | Moyenne | Vérifier les « magic bytes » ; assainir ou interdire le SVG |
| S-06 | Le fichier est écrit sur disque **avant** la vérification d'existence/la mise à jour en base ; un échec laisse un fichier orphelin | Faible | Ordre inverse ou nettoyage |
| S-07 | ~~Quitus utilisable par n'importe quel étudiant connaissant le code~~ **Corrigé** : le quitus doit être vérifié par e-mail (code à 6 chiffres) puis est rattaché au compte (`QuitusChallenge`, RG-21). Reste : `/quitus/verify` est ouvert à tout utilisateur connecté (le résultat ne révèle plus le nom de l'étudiant, seulement l'adresse masquée) | Résolu | – |
| S-08 | Autorisation répétée à la main dans chaque route, sans `Guard` ni `ValidationPipe`/DTO : risque d'oubli lors de l'ajout de routes | Moyenne | Guards + décorateur `@Roles()` + DTO validés |
| S-09 | Erreurs d'accès aux fichiers renvoyées en **400** (« Pièce inaccessible ») au lieu de **403/404** | Faible | Codes HTTP appropriés |
| S-10 | Pas d'en-têtes de sécurité (Helmet), pas de contrôle CSRF (atténué car jeton en en-tête et non en cookie) | Faible | Helmet |
| S-11 | Mot de passe : 8 caractères minimum, sans règle de complexité ni liste de mots de passe courants | Faible | Politique renforcée |
| S-12 | Codes de connexion Google conservés **en mémoire** : perdus au redémarrage, non partagés entre plusieurs instances | Faible | Stockage partagé (Redis/BDD) si montée en charge |
| S-13 | Fichiers servis depuis le disque local : pas de sauvegarde ni de réplication intégrée | Moyenne | Stockage objet (S3 compatible) + sauvegardes |

---

## 12. Installation, configuration et déploiement

### 12.1 Prérequis
Node.js récent, npm, PostgreSQL, (optionnel) compte SMTP et projet Google Cloud OAuth.

### 12.2 Backend

```bash
cd backend
npm install
cp .env.example .env          # puis renseigner les variables
npm run prisma:migrate        # crée/applique les migrations
npm run prisma:seed           # crée admin, responsable ISSTM, scolarité, données de démo
npm run start:dev             # http://localhost:3001
```

Scripts : `build`, `start`, `start:dev`, `start:debug`, `start:prod`, `lint`, `format`, `test`, `test:watch`, `test:cov`, `test:e2e`, `prisma:generate`, `prisma:migrate`, `prisma:seed`, `prisma:seed:demo` (brouillons et décisions fictives), `prisma:clean:pending-demo` (aperçu du nettoyage ; `-- --apply` sauvegarde dans `.local-backups/` puis supprime les anciens dossiers fictifs soumis ou en révision), `prisma:curriculum:isstm` (synchronise le curriculum ISSTM).

### 12.3 Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

Scripts : `dev`, `build`, `start`, `lint`. ⚠️ Le fichier [frontend/AGENTS.md](frontend/AGENTS.md) prévient que cette version de Next.js présente des changements incompatibles : consulter `node_modules/next/dist/docs/` avant de modifier le code.

### 12.4 Variables d'environnement backend

| Variable | Rôle | Défaut / remarque |
| --- | --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL | **Obligatoire** (base `inscription_mahajanga`) |
| `AUTH_TOKEN_SECRET` | Clé de signature des jetons | **Obligatoire en production** |
| `FRONTEND_URL` | Origine CORS, liens des e-mails, redirection Google | `http://localhost:3000` |
| `PORT` | Port de l'API | `3001` |
| `NODE_ENV` | `production` active cookies `secure` et le contrôle du secret | – |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | OAuth Google | Callback par défaut `http://localhost:3001/auth/google/callback` ; sans configuration → 503 sur la connexion Google |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | E-mail | Port 587 par défaut ; sans configuration → l'inscription échoue (503) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Compte admin du seed | `admin@univ-mahajanga.mg` / `Changez-Moi-2026!` |
| `ISSTM_MANAGER_EMAIL`, `ISSTM_MANAGER_PASSWORD`, `ISSTM_MANAGER_NAME` | Responsable ISSTM du seed | `responsable.isstm@univ-mahajanga.mg` / `ISSTM-2026!` |
| `SCOLARITE_EMAIL`, `SCOLARITE_PASSWORD`, `SCOLARITE_NAME` | Scolarité du seed | `scolarite@univ-mahajanga.mg` ; ⚠️ le mot de passe par défaut du code est `Scolarite-2026!` alors que `.env.example` indique `Changez-Moi-2026!` |
| `ISSTM_STUDENT_PASSWORD` | Mot de passe des 20 étudiants fictifs | `ISSTM-2026!` |
| `OBSERVE_APP_KEY`, `OBSERVE_APP_SECRET` | Observabilité NestJS | Facultatif |

### 12.5 Déploiement — points d'attention
- Créer le dossier `uploads/` avec droits d'écriture et le **sauvegarder** (il contient les pièces des étudiants).
- Changer **tous** les mots de passe et secrets de démonstration ; ne pas exécuter le seed de démonstration en production sans adaptation.
- Configurer HTTPS, `NODE_ENV=production`, `FRONTEND_URL` et `GOOGLE_CALLBACK_URL` de production (URI autorisées dans Google Cloud).
- ⚠️ **Ne pas versionner `backend/.local-credentials.txt`** (voir S-14). Le `.gitignore` exclut `*.tsbuildinfo`, `.local-backups/` et `backend/.local-credentials.txt`.
- Sauvegarder aussi `uploads/establishments/` et `uploads/avatars/` (logos, photos de profil) et `uploads/site-settings/`.

---

## 13. Données de démonstration (seed)

Le script [seed.mjs](backend/prisma/seed.mjs) est **idempotent** (upserts) et crée :

- 1 administrateur, 1 responsable ISSTM (`ADMIN_ETABLISSEMENT`), 1 compte scolarité centrale (e-mails vérifiés) ;
- le **curriculum ISSTM** — Niveaux : L1, L2, L3 (Licence), M1, M2 (Master) ; Parcours Licence : GI, GC, GT, GE, GInfo, GEI, GBM, GH, GArch ; Parcours Master : GE (ISEA), GAOH, G.Logiciel, GC, EII, TR, GI, GBM ;
- **16 pièces requises** (5 inscription-Licence, 6 inscription-Master, 5 candidature-Licence) ;
- **20 étudiants fictifs** `ISSTM-2026-001…020` avec comptes de connexion liés (mot de passe commun) ;
- **8 quitus de démonstration** `ISSTM-2026-DEMO-001…008` (pour les 8 premiers étudiants).

**Aucun dossier à traiter n'est créé** : la liste de la scolarité n'est alimentée que par les dépôts réels des étudiants. Le script optionnel [seed-demo.mjs](backend/prisma/seed-demo.mjs) crée des brouillons et des décisions fictives pour les tableaux de bord ; [clean-pending-demo.mjs](backend/prisma/clean-pending-demo.mjs) retire les anciens dossiers fictifs encore `SOUMIS`/`EN_REVISION` (les comptes, quitus et dossiers validés/refusés sont conservés ; arrêt si un dossier fictif contient des pièces).

Les établissements viennent des migrations (`add_establishments`, `add_missing_establishments`) et se gèrent ensuite depuis l'espace admin.

⚠️ Les quitus de démonstration ont un format différent des quitus réels (`QT-…`) et sont **faciles à deviner** : à ne jamais laisser en production. Comme les adresses des fiches fictives sont factices, le code à 6 chiffres de vérification est écrit dans les journaux du serveur **hors production**.

## 14. Tests et qualité

| Élément | État |
| --- | --- |
| Test unitaire | 1 seul test : [app.controller.spec.ts](backend/src/app.controller.spec.ts) (« Hello World! ») |
| Test e2e | Squelette [app.e2e-spec.ts](backend/test/app.e2e-spec.ts) (non revu en détail ; le type `App` de Supertest n'y est plus importé) |
| Tests frontend | Aucun |
| Couverture des règles métier (soumission, décision, quitus, droits) | **Aucune** |
| Lint | oxlint (backend), ESLint 9 + `eslint-config-next` (frontend) |

Plan de test minimal recommandé (voir §16) : tests d'intégration sur RG-02, RG-04, RG-05, RG-11, RG-13, RG-14, RG-15.

### 14.1 Scénarios de recette (à dérouler à la main)

1. Création de compte → réception de l'e-mail → clic sur le lien → connexion.
2. Connexion avec un e-mail non vérifié → message + renvoi du lien.
3. Connexion Google (nouveau compte, puis compte existant, puis compte désactivé).
4. Étudiant : choix ISSTM → L1 → GInfo → quitus `ISSTM-2026-DEMO-001` → saisie du **code à 6 chiffres** reçu à l'adresse de la fiche (hors production : visible dans les journaux du serveur) → téléversement de 4 pièces (CIN, quitus, résidence, bac) → soumission → vérifier la notification « Dossier soumis ».
5. Même parcours en L2 : le relevé de bac n'est plus exigé.
6. Soumission avec une pièce manquante → refus. Pièce > 10 Mo ou `.docx` → refus.
7. Quitus d'un autre établissement → refus.
8. Scolarité : refuser sans motif (bloqué) ; refuser avec motif (e-mail reçu) ; valider (e-mail reçu).
9. Étudiant refusé : modifier le dossier → retour en `BROUILLON` → re-soumettre.
10. Étudiant validé : l'attestation devient imprimable ; le dossier n'est plus modifiable.
11. Établissement : inscrire un étudiant Licence puis Master ; réinscrire ; générer quitus (sélection puis « manquants ») ; imprimer l'attestation.
12. Secrétaire : vérifier l'absence des boutons de génération de quitus, de gestion des comptes et de paramètres.
13. Isolation : un responsable d'un autre établissement ne peut pas ouvrir le dossier ni les pièces d'un étudiant rattaché à un autre établissement.
14. Admin : créer un compte, le désactiver, le renommer, réinitialiser son mot de passe, le mettre à la corbeille, le restaurer, le purger (saisie du nom) ; vérifier chaque ligne du journal d'audit ; tenter de désactiver le dernier admin.
15. Admin : personnaliser la page d'accueil (logo, favicon, 4 photos, couleurs, textes) puis réinitialiser.
16. Export CSV et PDF des étudiants.
17. Quitus : 6 codes erronés (blocage après 5), redemande avant 1 minute (refus), code expiré (10 min), quitus déjà rattaché à un autre compte (refus).
18. Compte : changer la photo (> 3 Mo ou fichier non image → refus), le mot de passe (6 mauvais essais → blocage), l'adresse e-mail (lien reçu à la nouvelle adresse, alerte à l'ancienne).
19. Établissement : modifier un étudiant, le mettre à la corbeille, vérifier qu'il disparaît de la liste et que son quitus devient inutilisable, le restaurer, puis le purger (fichiers et quitus supprimés).
20. Établissement : tableau de bord du responsable (et absence pour le secrétaire) ; renommer l'établissement et changer son logo (visible côté étudiant, accueil, admin).
21. Admin : créer, renommer, désactiver, supprimer un établissement (refusé s'il contient des données) ; changer son logo.
22. Scolarité : définir les pièces d'un établissement, vérifier l'étape 5 côté étudiant ; activer « identique pour tous » et vérifier que tous les établissements affichent la liste commune.
23. Scolarité : valider puis refuser → notification dans la cloche de l'étudiant et e-mail.
24. Accueil : mode personnalisation (crayon admin) — modifier un texte, ajouter/modifier/supprimer une actualité, changer le logo et le carrousel ; vérifier le journal d'audit ; retour au texte d'origine.
25. Vérifier que le logo de l'accueil, des menus latéraux et des cartes d'établissements s'affiche en **cercle** sur fond blanc, avec et sans logo téléversé.

---

## 15. Écarts, dette technique et risques

### 15.1 Cohérence métier et textes
| # | Constat |
| --- | --- |
| T-01 | Le titre HTML et la description parlent désormais de **demande de bourse nationale**, ainsi que les textes d'accueil. Restent du vocabulaire d'**inscription** : le nom du dépôt, les valeurs par défaut du hero en base (`SiteSettings.heroTitle/heroSubtitle/ctaSecondaryLabel`), le thème de l'espace admin (« Gestion des inscriptions »), l'expéditeur `SMTP_FROM` (« Plateforme d'inscription »), la page de connexion et l'attestation étudiante. À harmoniser. |
| T-02 | L'attestation délivrée à l'étudiant validé dit « est inscrit(e) à … pour l'Année Universitaire 2025-2026 » : ce n'est pas une attestation de bourse. |
| T-03 | L'année universitaire est **codée en dur** (« 2025-2026 » côté étudiant ; fonction `academicYear()` côté établissement ; réglage local « Année universitaire » dans les paramètres) et n'est pas liée à une donnée serveur. La période de dépôt affichée sur l'accueil (« 01 Septembre au 31 Octobre 2026 ») n'est qu'un **texte modifiable**, sans effet sur le dépôt. |
| T-04 | Les statistiques de l'accueil (« + 12 000 étudiants », « 100 % dématérialisé ») sont des textes modifiables non reliés aux données ; seul le nombre d'établissements est calculé. |
| T-05 | La page étudiant contient des données factices par défaut (`RAKOTO Jean`, `etudiant@gmail.com`, « 11 Septembre 2026 ») visibles brièvement avant le chargement. |
| T-06 | `homepage-defaults.json` existe en **deux exemplaires** (backend et frontend) qui doivent rester identiques à la main ; l'oubli de l'un fait refuser ou ignorer des clés. |
| T-07 | Le placeholder du champ quitus (« ISSTM-2026-DEMO-001 ») et le préfixe des routes (`/establishment/isstm/…`) rappellent l'ISSTM alors que l'application est multi-établissements. |

### 15.2 Architecture
| # | Constat |
| --- | --- |
| A-01 | **Préfixe `isstm` historique** : les routes `/establishment/isstm/…` servent tous les établissements (l'établissement vient du compte). Les noms, la constante `ISSTM` du seed et certains textes sont à renommer. Un établissement n'a de curriculum, de pièces d'inscription et de quitus que si son responsable les configure. |
| A-02 | La table `Establishment` existe, mais l'établissement reste une **chaîne de caractères** répétée dans `User`, `Quitus`, `EnrolledStudent`, `EnrollmentApplication`, etc. (pas de clé étrangère) : le renommage est géré par une transaction applicative qui doit être complétée à chaque nouvelle table. |
| A-03 | Deux entités « étudiant » (`User` / `EnrolledStudent`) reliées par e-mail ou `userId` : désynchronisation possible (changement d'e-mail, doublons). |
| A-04 | Les champs `User.establishment/level/program/registrationStatus` **dupliquent** ceux du dossier ; synchronisés manuellement dans plusieurs transactions. |
| A-05 | Pas de couche DTO/validation ni de garde Nest : validation et autorisation dupliquées dans chaque route. |
| A-06 | Pages frontend monolithiques (1 000 à 2 600 lignes) mêlant état, appels API et affichage ; appels `fetch` répétés sans client API commun. |
| A-07 | Le thème des espaces connectés repose sur la **réécriture dynamique de classes Tailwind** par CSS `!important` : fragile à chaque nouvelle classe. |
| A-08 | `StaffRole` côté admin n'expose que `ETABLISSEMENT` et `SCOLARITE_CENTRALE` ; le backend convertit `ETABLISSEMENT` en `ADMIN_ETABLISSEMENT` : le rôle `ETABLISSEMENT` est un reliquat. |
| A-09 | ~~L'admin saisit librement le nom de l'établissement~~ **Corrigé** : liste déroulante d'établissements à la création d'un compte. |
| A-10 | Le « statut » du dossier côté admin se modifie par un simple sélecteur, sans motif ni trace dans le journal d'audit. Les décisions de la scolarité, la génération de quitus et la plupart des actions des responsables/secrétaires (changement de statut/nom/mot de passe d'un secrétaire, suppression d'étudiants, modification du curriculum) ne sont pas auditées. |
| A-11 | Limitations de débit (connexion, inscription, quitus, comptes) et codes Google conservés **en mémoire** : perdus au redémarrage, non partagés entre plusieurs instances. |
| A-12 | Les écrans d'accueil et d'espaces dupliquent le style de logo rond (classes Tailwind répétées) ; seul `SidebarLogo` et `EstablishmentBadge` sont mutualisés. |

### 15.3 Fonctionnel
| # | Constat |
| --- | --- |
| P-01 | Pas de réinitialisation de mot de passe oublié en libre-service (le changement depuis « Mon compte » existe). |
| P-02 | Notifications limitées à l'étudiant (soumission, décision) ; ni notifications pour le personnel, ni préférences, ni suppression. |
| P-03 | `EN_REVISION` jamais atteint par le flux normal. |
| P-04 | Pas de pagination côté étudiants/dossiers/comptes ; exports CSV/PDF seulement côté admin. |
| P-05 | L'« export PDF » admin est une impression du navigateur, sans mise en page dédiée. |
| P-06 | Aucune date limite, campagne ou année de bourse : un étudiant n'a qu'un dossier à vie (`userId` unique), sans notion d'année universitaire ; impossible de redéposer l'année suivante. |
| P-07 | Un dossier `REFUSE` modifié perd son motif de refus précédent à la nouvelle décision ; l'historique des décisions successives n'est pas conservé. |
| P-08 | Case « Se souvenir de moi » sans effet. |
| P-09 | Le bouton « Mon dossier » n'est débloqué qu'après vérification du quitus ; les onglets Notifications/Paramètres seulement après soumission (choix d'interface, pas une règle métier). |
| P-10 | Suppression d'un niveau/parcours/pièce requise possible même s'ils sont utilisés par des dossiers existants (aucune protection d'intégrité). |
| P-11 | `POST /establishment/isstm/students` : pour un nouvel étudiant, seuls certains champs sont obligatoires côté serveur ; les champs requis par étape côté client (ex. CIN, bac) ne sont pas imposés par l'API. |
| P-12 | Un utilisateur Google dont l'e-mail correspond à un compte du personnel se connecte avec le rôle de ce compte (comportement voulu, mais à documenter : l'e-mail Google fait foi). |
| P-13 | Si l'établissement choisi n'a **aucun curriculum configuré**, l'étudiant ne voit aucun niveau ni parcours et ne peut pas avancer. |
| P-14 | Un étudiant dont la fiche est mise à la corbeille après qu'il a vérifié son quitus garde son dossier ; seul un nouveau contrôle de quitus est bloqué. |
| P-15 | Suppression d'un établissement impossible dès qu'il a des données : seule la désactivation le retire de la liste étudiante, mais les comptes existants restent rattachés. |

## 16. Évolutions recommandées

### 16.1 Priorité haute
1. **Sécurité des secrets** : changer les mots de passe concernés, purger `backend/.local-credentials.txt` de l'historique Git (le fichier n'est plus suivi), nettoyer `.env.example` (S-14, S-04).
2. **Aligner le vocabulaire** sur la bourse (valeurs par défaut en base, attestation, e-mails, thème admin) (T-01, T-02).
3. **Limitation de débit** : compléter (renvoi d'e-mail, stockage partagé, `trust proxy`) et ajouter les en-têtes de sécurité (S-01, S-10).
4. **Inspection du contenu des fichiers** (pièces, logos) et interdiction ou assainissement du SVG (S-05).
5. **Réinitialisation du mot de passe oublié** par e-mail (P-01).
6. ~~Réserver la purge définitive des étudiants au responsable (S-15)~~ — fait.
7. **Tests automatisés** sur les règles RG-02/04/05/11/13/14/15/21 et sur l'autorisation par rôle.

### 16.2 Priorité moyenne
8. Renommer les routes `/establishment/isstm/…` en `/establishment/…` et supprimer les références à l'ISSTM (A-01, T-07).
9. Clé étrangère `Establishment` à la place de la chaîne de caractères (A-02).
10. **Campagnes / années de bourse** : dossier lié à une année universitaire, dates d'ouverture/clôture reliées à la bannière de l'accueil (P-06, T-03).
11. **Journal d'audit étendu** à tous les rôles (décisions, changements de statut, quitus générés, suppression d'étudiants) (A-10).
12. Historique des décisions par dossier ; passage `SOUMIS → EN_REVISION` explicite (« prendre en charge ») (P-03, P-07).
13. Notifications pour le personnel (nouveau dossier à traiter, etc.) et préférences (P-02).
14. Guards/DTO Nest (`class-validator`) et client API frontend mutualisé ; découpage des grosses pages (A-05, A-06).
15. Pagination et filtres serveur ; exports CSV pour établissement et scolarité (P-04).
16. Stocker les limites de débit et les codes Google dans un stockage partagé (A-11).

### 16.3 Priorité basse
17. Stockage objet pour les pièces, antivirus sur les fichiers, sauvegardes automatiques (S-13).
18. Cookie `httpOnly` + jeton de rafraîchissement (S-02).
19. Tableau de bord statistique global (délais de traitement, comparaison entre établissements).
20. Mise en page PDF dédiée pour les exports et l'attestation de bourse.
21. Internationalisation (français / malgache).
22. Audit d'accessibilité (WCAG) et tests e2e (Playwright).
23. Favicon en PNG en plus des SVG.

## 17. Glossaire

| Terme | Définition |
| --- | --- |
| **Dossier de bourse** | Ensemble (choix établissement/niveau/parcours + quitus + pièces) déposé par l'étudiant ; modèle `EnrollmentApplication` |
| **Quitus** | Reçu/attestation de paiement des droits d'inscription délivré par l'établissement ; ici un code unique `QT-…` généré par l'établissement et vérifié par l'étudiant |
| **Scolarité centrale** | Service de l'université qui examine et décide des dossiers |
| **Établissement** | Faculté, école ou institut (ISSTM, ENS, FSTE…) |
| **ISSTM** | Établissement de l'Université de Mahajanga utilisé comme **établissement de démonstration** pour développer et tester la plateforme (le code ne donne pas la signification de l'acronyme : à compléter) |
| **Curriculum** | Niveaux (L1…M2) et parcours (GInfo, GC…) d'un établissement, par cycle |
| **Cycle** | `LICENCE` ou `MASTER` |
| **Pièce requise** | Type de document exigé, configurable par établissement, contexte (inscription / candidature) et cycle |
| **Candidature** | Contexte « dépôt de dossier de bourse par l'étudiant » (par opposition à `INSCRIPTION`, saisie par l'établissement) |
| **Matricule** | Numéro d'inscription d'un étudiant dans la base de l'établissement |
| **Passant / Redoublant** | Qualité d'un étudiant lors d'une réinscription |
| **Corbeille** | Suppression logique (`deletedAt`) d'un compte du personnel ou d'un étudiant inscrit, avant purge définitive |
| **Défi de quitus** (`QuitusChallenge`) | Code à 6 chiffres envoyé à l'e-mail de la fiche pour prouver qu'un compte est bien le titulaire d'un quitus |
| **Liste commune** | Liste de pièces du dépôt de dossier (clé d'établissement `*`) appliquée à tous les établissements quand le mode « identique pour tous » est actif |
| **Mode personnalisation** | Mode de l'accueil réservé à l'admin (`/?mode=personnalisation`) où chaque texte, image et actualité est modifiable en place |
| **Logo rond** | Style commun des logos (cercle, fond blanc, petite marge, liseré) utilisé sur l'accueil, les menus latéraux et les cartes d'établissements |
| **PWA** | Application web installable (fonction retirée du projet) |
