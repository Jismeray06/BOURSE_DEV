# Cahier des charges — Plateforme de demande de bourse en ligne (Université de Mahajanga)

| | |
| --- | --- |
| **Nom du dépôt** | `plateforme-inscription-mahajanga` |
| **Nature réelle du projet** | Plateforme de **dépôt et de traitement de dossiers de demande de bourse** (et non une plateforme d'inscription universitaire, malgré le nom du dépôt) |
| **Version documentée** | État du code au 1er octobre 2026 (branche `main`, y compris les modifications non encore commitées) |
| **Périmètre actuel** | Un seul établissement entièrement géré : **ISSTM**. Dix autres établissements sont listés côté étudiant, sans gestion backend. |
| **Langue de l'interface** | Français |

> Ce document décrit **ce que le système fait réellement aujourd'hui** (constaté dans le code), puis liste les écarts, risques et évolutions à prévoir. Les passages marqués ⚠️ sont des écarts ou des défauts constatés, pas des fonctionnalités.

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
- Donner à l'**administrateur** la supervision globale : comptes, étudiants, apparence du site public, journal d'audit.

### 1.3 Hors périmètre actuel
- Paiement en ligne du quitus (le quitus est un code délivré par l'établissement, hors plateforme).
- Calcul ou versement de la bourse.
- Réinitialisation de mot de passe en libre-service.
- Gestion backend des établissements autres que l'ISSTM.
- Application mobile native (une PWA minimale existe).

---

## 2. Acteurs et rôles

Six rôles sont définis dans l'énumération `UserRole` ([schema.prisma](backend/prisma/schema.prisma)).

| Rôle | Code | Création du compte | Espace | Droits principaux |
| --- | --- | --- | --- | --- |
| Étudiant | `ETUDIANT` | Auto-inscription (e-mail + mot de passe, ou Google) | `/student` | Constituer, enregistrer et soumettre son dossier ; téléverser ses pièces ; suivre le statut ; imprimer l'attestation si validé |
| Administrateur | `ADMIN` | Script de seed (variables d'environnement) | `/admin` | Tout superviser ; créer/gérer les comptes du personnel ; modifier manuellement un statut de dossier ; régler la page d'accueil ; consulter le journal d'audit |
| Responsable d'établissement | `ADMIN_ETABLISSEMENT` | Créé par l'ADMIN | `/etablissement` | Inscrire/réinscrire des étudiants ; générer les quitus ; configurer curriculum, pièces requises, mention, apparence ; gérer les secrétaires |
| Établissement (ancien rôle) | `ETABLISSEMENT` | Hérité | `/etablissement` | Mêmes droits que `ADMIN_ETABLISSEMENT` (ce rôle est converti en `ADMIN_ETABLISSEMENT` à la création d'un compte par l'admin) |
| Secrétaire | `SECRETAIRE` | Créé par un responsable d'établissement | `/etablissement` | Consulter les étudiants, inscrire/réinscrire, téléverser des pièces, voir les dossiers. **Ne peut pas** : générer des quitus, gérer les comptes, modifier curriculum/pièces/mention/apparence |
| Scolarité centrale | `SCOLARITE_CENTRALE` | Créé par l'ADMIN | `/scolarite` | Consulter tous les dossiers soumis ; valider ou refuser (motif obligatoire au refus) |

### 2.1 Matrice de droits (constatée dans le code)

| Action | Étudiant | Secrétaire | Resp. établissement | Scolarité | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Créer/éditer son dossier de bourse | ✅ | – | – | – | – |
| Téléverser ses pièces de dossier | ✅ | – | – | – | – |
| Vérifier un quitus (`POST /quitus/verify`) | ✅ (tout utilisateur connecté) | ✅ | ✅ | ✅ | ✅ |
| Lister les étudiants inscrits de l'établissement | – | ✅ | ✅ | – | – |
| Inscrire / réinscrire un étudiant | – | ✅ | ✅ | – | – |
| Téléverser une pièce d'inscription pour un étudiant | – | ✅ | ✅ | – | – |
| Générer des quitus | – | ❌ | ✅ | – | – |
| Gérer les secrétaires | – | ❌ (lecture seule de la liste) | ✅ | – | – |
| Modifier curriculum / pièces requises / mention / apparence | – | ❌ | ✅ | – | – |
| Voir le dossier d'un étudiant | – | ✅ (son établissement) | ✅ (son établissement) | ✅ (tous) | ✅ (tous) |
| Valider / refuser un dossier | – | – | – | ✅ | – |
| Forcer le statut d'un dossier | – | – | – | – | ✅ |
| Gérer les comptes du personnel | – | – | – | – | ✅ |
| Journal d'audit | – | – | – | – | ✅ |
| Régler la page d'accueil publique | – | – | – | – | ✅ |

---

## 3. Vue d'ensemble du fonctionnement

### 3.1 Flux principal

```
 Étudiant                      Établissement (ISSTM)               Scolarité centrale
    │                                  │                                  │
    │ crée un compte, vérifie l'e-mail │                                  │
    │                                  │ inscrit / réinscrit l'étudiant   │
    │                                  │ génère le QUITUS (QT-…)          │
    │◄──── code du quitus (hors plateforme) ──┤                           │
    │ 1 Établissement                  │                                  │
    │ 2 Niveau                         │                                  │
    │ 3 Parcours   (brouillon auto)    │                                  │
    │ 4 Vérifie le quitus              │                                  │
    │ 5 Téléverse les pièces           │                                  │
    │ SOUMET ─────────────────────────────────────────────────────────►  │
    │                                  │              examine le dossier  │
    │                                  │              VALIDE ou REFUSE    │
    │◄───────────── e-mail de décision + statut mis à jour ──────────────┤
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

### 4.2 Espace étudiant (`/student`)

| Réf. | Exigence | État |
| --- | --- | --- |
| F-STU-01 | Garde d'accès : sans jeton ou sans rôle `ETUDIANT`, redirection vers `/login` ; réponse 401 → purge de session | [OK] |
| F-STU-02 | Assistant en **5 étapes** avec barre de progression : Établissement → Niveau → Parcours → Quitus → Pièces | [OK] |
| F-STU-03 | Étape 1 : choix parmi 11 établissements avec recherche textuelle (ENS, Faculté de Médecine, FSTE, IOSTM, ILC-SS, ISSTM, IUGM, IUTAM, EDSP, École de Pharmacie, ELCI) | [OK] |
| F-STU-04 | Étape 2 : niveaux L1, L2, L3, M1, M2 (ISSTM : liste dynamique issue du backend, niveaux actifs) | [OK] |
| F-STU-05 | Étape 3 : parcours avec recherche ; ISSTM : parcours filtrés par cycle (Licence/Master) du niveau choisi ; autres établissements : liste statique générique de 10 parcours | [Partiel] — liste statique non propre à chaque établissement |
| F-STU-06 | **Sauvegarde automatique en brouillon** (`PUT /student/application`) à chaque clic sur « Suivant » | [OK] |
| F-STU-07 | Étape 4 : saisie du numéro de quitus, vérification immédiate (`POST /quitus/verify`) puis enregistrement et passage à l'étape 5 | [OK] |
| F-STU-08 | Étape 5 : téléversement de chaque pièce requise (PDF/PNG/JPG, 10 Mo max, contrôle côté client puis serveur), remplacement possible (« Changer le fichier »), compteur « n/N pièce(s) obligatoire(s) téléversée(s) » | [OK] |
| F-STU-09 | Liste des pièces : pour l'ISSTM, issue de la configuration de l'établissement (contexte `CANDIDATURE`) ; à défaut ou pour les autres établissements, liste par défaut (CIN, quitus, certificat de résidence, attestation de chômage, relevé de bac) | [OK] |
| F-STU-10 | Pièces **facultatives** : « attestation de chômage » (`unemployment`) ; **relevé de bac** obligatoire uniquement en Licence 1 | [OK] |
| F-STU-11 | Bouton « Finaliser le dépôt » actif seulement si quitus vérifié et toutes les pièces obligatoires déposées ; soumission → statut `SOUMIS` | [OK] |
| F-STU-12 | Reprise du dossier à la reconnexion (étape 5 si quitus déjà associé) ; si dossier non brouillon → écran « Dossier soumis » | [OK] |
| F-STU-13 | Rafraîchissement automatique du dossier toutes les **30 s** | [OK] |
| F-STU-14 | Onglet **Mon dossier** (débloqué après vérification du quitus) : état, informations académiques, quitus, liste des pièces « Déposée / Non déposée », motif du refus affiché si `REFUSE` | [OK] |
| F-STU-15 | **Attestation** imprimable / enregistrable en PDF (via impression navigateur) active uniquement si `VALIDE` | [OK] — ⚠️ le libellé de l'attestation étudiante dit « Attestation d'inscription » et « est inscrit(e) à… », alors que le contexte est une bourse |
| F-STU-16 | Onglet **Notifications** (débloqué après soumission) | [Partiel] — contenu **statique** (« Ouverture des inscriptions 2025-2026 », pastille « 1 » codée en dur) ; aucune notification réelle n'est stockée |
| F-STU-17 | Onglet **Paramètres** (débloqué après soumission) : panneau d'apparence + identité du compte en lecture seule | [OK] |
| F-STU-18 | Bloc **NOTA-BENE** permanent : la bourse n'est pas automatique ; les nouveaux inscrits en 1re année avec un bac antérieur ne sont pas éligibles ; « tout dossier incomplet ne sera pas pris en compte » | [OK] |
| F-STU-19 | Statut dans l'en-tête : « Étape n/5 en cours », « Dossier en attente », « Dossier en révision », « Dossier validé », « Dossier refusé » | [OK] |
| F-STU-20 | Interface responsive : barre latérale en tiroir sous 1025 px, cibles tactiles 44 px | [OK] |

### 4.3 Espace établissement (`/etablissement`) — ISSTM

| Réf. | Exigence | État |
| --- | --- | --- |
| F-EST-01 | Garde d'accès : rôles `ETABLISSEMENT`, `ADMIN_ETABLISSEMENT`, `SECRETAIRE` ; compte sans établissement associé → erreur « Aucun établissement n'est associé à ce compte » | [OK] |
| F-EST-02 | **Liste des étudiants inscrits** triée par matricule, recherche (nom, matricule, téléphone), filtres serveur `gender` et `level`, colonne quitus (« Non généré » ou code) | [OK] |
| F-EST-03 | **Génération de quitus** : « Générer les manquants » (tous les étudiants actifs sans quitus) ou « Générer la sélection » ; sélection multiple avec « tout sélectionner » ; réponse `{created, alreadyGenerated}` ; **un seul quitus par étudiant** | [OK] — réservé au responsable |
| F-EST-04 | **Nouvelle inscription** (assistant à étapes) : choix du cycle (Licence/Master) ; identité et contact ; parcours antérieur (Licence : établissement/bac année-série-centre ; Master : établissement/année/mention de licence/parcours/niveau précédents) ; famille et répondant (Licence uniquement) ; choix du parcours ; **dépôt de dossier** (pièces) | [OK] |
| F-EST-05 | Champs obligatoires côté serveur pour une nouvelle fiche : nom complet, e-mail (unique), téléphone, genre, niveau, parcours ; niveau/parcours doivent être **actifs** dans le curriculum du **cycle** concerné | [OK] |
| F-EST-06 | **Matricule** attribué par le serveur : `<ÉTABLISSEMENT>-<ANNÉE>-<8 hex>`, 3 tentatives en cas de collision | [OK] |
| F-EST-07 | **Réinscription** d'un étudiant existant : recherche du dossier, mise à jour niveau/parcours/qualité (Passant/Redoublant) et coordonnées ; remise `active = true` | [OK] |
| F-EST-08 | **Attestation d'inscription** imprimable proposée après ajout (nom, naissance, mention de l'établissement, parcours, niveau, matricule, tél., e-mail, année universitaire) | [OK] |
| F-EST-09 | **Dépôt de pièces d'inscription** pour un étudiant : listes par cycle (Licence : photo, ancienne carte étudiant, lettre d'engagement légalisée, certificat de résidence du répondant, reçu de versement ; Master : photo, certificat de résidence des parents, diplôme/attestation de licence, acte de naissance < 3 mois, CIN légalisée, reçu de versement) ou liste configurée | [OK] |
| F-EST-10 | **Visualiseur de dossier** (lecture seule) par étudiant : profil complet, statut, quitus, pièces ouvrables/téléchargeables ; bascule automatique sur le dossier de bourse en ligne si l'étudiant en a déposé un | [OK] |
| F-EST-11 | **Gestion des secrétaires** (responsable uniquement) : créer, activer/désactiver, renommer, changer le mot de passe (≥ 8 car.) | [OK] — ⚠️ pas de journal d'audit pour ces actions (le journal ne couvre que les actions de l'admin) |
| F-EST-12 | **Structure académique** (responsable) : ajouter / renommer / activer-désactiver / supprimer des **niveaux** et **parcours** par cycle | [OK] |
| F-EST-13 | **Pièces requises — Inscription** (par cycle) : ajouter / renommer / activer-désactiver / supprimer | [OK] |
| F-EST-14 | **Pièces requises — Dépôt de dossier étudiant (candidature)** : ajouter / renommer / activer-désactiver / supprimer ; ces pièces pilotent l'étape 5 de l'espace étudiant | [OK] |
| F-EST-15 | **Mention de l'établissement** affichée sur les attestations (responsable) | [OK] |
| F-EST-16 | **Apparence partagée** : réglages définis par le responsable, enregistrés côté serveur (`interfaceSettings`, JSON ≤ 5 000 caractères), appliqués en lecture seule aux secrétaires | [OK] |
| F-EST-17 | Boutons masqués ou désactivés pour le secrétaire (`isEstablishmentAdmin`) | [OK] |

### 4.4 Espace scolarité centrale (`/scolarite`)

| Réf. | Exigence | État |
| --- | --- | --- |
| F-SCO-01 | Garde d'accès : rôle `SCOLARITE_CENTRALE` uniquement | [OK] |
| F-SCO-02 | **Vue d'ensemble** : 4 compteurs (dossiers finalisés, à examiner, bourses validées, refusés) + 5 dossiers prioritaires | [OK] |
| F-SCO-03 | **Dossiers à examiner** : liste des dossiers `SOUMIS` / `EN_REVISION`, recherche (nom, e-mail, établissement, parcours), champ de motif par dossier | [OK] |
| F-SCO-04 | **Décision** : boutons Valider / Refuser ; **motif obligatoire pour un refus** (contrôle client et serveur) ; seuls les dossiers `SOUMIS`/`EN_REVISION` sont décidables | [OK] |
| F-SCO-05 | Enregistrement de la décision : statut, note, date, relecteur (`reviewedById`) ; mise à jour synchronisée du statut du compte `User` (transaction) | [OK] |
| F-SCO-06 | **E-mail de décision** automatique à l'étudiant (validé : remarque facultative ; refusé : motif) ; non bloquant : en cas d'échec d'envoi, la décision est conservée et l'erreur journalisée | [OK] |
| F-SCO-07 | **Historique des décisions** (validés + refusés) avec recherche et nom du relecteur | [OK] |
| F-SCO-08 | **Visualiseur de dossier** (infos, quitus, pièces, profil d'inscription s'il existe) | [OK] |
| F-SCO-09 | Paramètres d'apparence (3 onglets : Apparence & Affichage, Comportement, Identité) | [OK] |
| F-SCO-10 | Une décision ne peut pas être annulée ni corrigée par la scolarité (seul l'admin peut forcer un statut) | Constat |

### 4.5 Espace administrateur (`/admin`)

| Réf. | Exigence | État |
| --- | --- | --- |
| F-ADM-01 | Garde d'accès : rôle `ADMIN` | [OK] |
| F-ADM-02 | **Tableau de bord** : étudiants inscrits, à examiner, validés, refusés + dossiers à traiter | [OK] |
| F-ADM-03 | **Étudiants** : recherche globale (nom/e-mail) + filtre par statut ; export **CSV** (séparateur `;`, BOM UTF-8) ; export **PDF** (impression navigateur) | [OK] |
| F-ADM-04 | **Navigation par établissement** : cartes avec effectif, puis liste filtrable (recherche, niveau, parcours) | [OK] — ⚠️ la liste des établissements est déduite des `User` ayant un établissement, pas d'une table d'établissements |
| F-ADM-05 | **Changement manuel du statut** d'un dossier (5 statuts) avec confirmation optionnelle (`confirmStatus`) ; met à jour `User` et `EnrollmentApplication` | [OK] |
| F-ADM-06 | **Visualiseur de dossier** (`/admin/students/:id/dossier`) | [OK] |
| F-ADM-07 | **Création de comptes du personnel** : responsable d'établissement (nom de l'établissement obligatoire) ou scolarité centrale ; e-mail marqué vérifié ; mot de passe ≥ 8 car. | [OK] |
| F-ADM-08 | **Comptes créés** : activer/désactiver, renommer, réinitialiser le mot de passe, mettre à la corbeille | [OK] |
| F-ADM-09 | **Tous les comptes** : recherche, filtre par rôle, activation/désactivation, suppression (corbeille) ; **garde-fous** : impossible d'agir sur son propre compte, impossible de désactiver/supprimer le **dernier admin actif** | [OK] |
| F-ADM-10 | **Corbeille** : restaurer, ou **supprimer définitivement** après saisie du nom complet du compte pour confirmer ; refus si le compte est lié à des données (clé étrangère) | [OK] |
| F-ADM-11 | **Historique / journal d'audit** : 200 dernières actions sur les comptes du personnel (création, statut, nom, mot de passe, corbeille, restauration, purge) avec auteur, cible, détail, date | [OK] |
| F-ADM-12 | **Paramètres de la page d'accueil** (voir §4.6) | [OK] |
| F-ADM-13 | Actualisation manuelle et automatique (désactivée / 30 s / 1 min / 5 min) | [OK] |

### 4.6 Page d'accueil publique (`/`) et réglages du site

| Réf. | Exigence | État |
| --- | --- | --- |
| F-PUB-01 | Page d'accueil : en-tête (logo, nom « Univ Mahajanga », bouton principal, bascule clair/sombre), hero, section « Une inscription en toute confiance » (3 cartes : parcours, vérification de quitus, profil étudiant), pied de page | [OK] |
| F-PUB-02 | Carrousel par défaut de 4 photos de campus (changement toutes les 4 s, flèches, pastilles) quand aucune image personnalisée n'est configurée | [OK] |
| F-PUB-03 | Réglages pilotés par l'admin : couleurs primaire/secondaire/fond (hexadécimal `#RRGGBB`), logo et favicon (PNG/JPG/SVG ≤ 5 Mo), type de fond du hero (couleur / dégradé / images), jusqu'à **4 photos** (PNG/JPG ≤ 5 Mo) avec diaporama si ≥ 2, opacité du filtre (0–100 %), titre, sous-titre, texte et lien des deux boutons d'action | [OK] |
| F-PUB-04 | Réinitialisation complète des réglages (supprime les fichiers téléversés) | [OK] |
| F-PUB-05 | Liens des boutons : internes (`router.push`) ou externes (`http(s)://`) | [OK] |
| F-PUB-06 | Les ressources du site sont servies **publiquement** sous `/uploads/site-settings` | [OK] |
| F-PUB-07 | Textes du hero | ⚠️ valeurs par défaut et textes fixes parlent d'« inscription universitaire » ; statistiques fixes **« 15+ facultés », « 10 000+ étudiants », « 100 % en ligne »** codées en dur ; badge « Inscriptions académiques ouvertes » en dur |

### 4.7 Documents et fichiers

| Réf. | Exigence | État |
| --- | --- | --- |
| F-DOC-01 | Formats acceptés : PDF, PNG, JPEG ; taille max **10 Mo** (pièces) / **5 Mo** (ressources du site) | [OK] |
| F-DOC-02 | Une seule pièce par type et par dossier (`@@unique([applicationId, type])`) ; le remplacement supprime l'ancien fichier du disque | [OK] |
| F-DOC-03 | Stockage sur disque : `uploads/documents/` (nom `UUID + extension`), `uploads/site-settings/` | [OK] |
| F-DOC-04 | Téléchargement/visualisation sécurisés via `GET /documents/:id/file` avec contrôle d'accès par rôle et par établissement ; en-tête `inline` avec nom assaini | [OK] |
| F-DOC-05 | Clé de type de pièce validée par `^[a-z0-9_-]+$` ; clés des pièces configurées générées par slug depuis le libellé (accents retirés) | [OK] |
| F-DOC-06 | Pièces liées à la **candidature** (`ApplicationDocument`) et pièces liées à l'**inscription** établissement (`EnrolledStudentDocument`) | [OK] |

### 4.8 Notifications par e-mail

| Événement | Destinataire | Contenu |
| --- | --- | --- |
| Création de compte étudiant / renvoi | Étudiant | Lien de vérification valable 24 h |
| Décision de la scolarité | Étudiant | « Votre dossier a été validé / refusé » + remarque ou motif + lien vers l'espace |

Transport : SMTP via Nodemailer (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Le contenu HTML est échappé.

### 4.9 Personnalisation de l'interface (4 espaces connectés)

Réglages **par espace** (`admin`, `etablissement`, `student`, `scolarite`), enregistrés en `localStorage`, synchronisés entre onglets : thème (Sombre / Minuit / Clair / Auto), couleur d'accentuation (9 préréglages + libre), couleur de fond (7 préréglages + libre), style de fond (uni / dégradé / points), lueur décorative, police (système / serif / mono), taille du texte (4 niveaux), arrondi, largeur du contenu, contraste élevé, réduction des animations, confirmation avant changement de statut, actualisation automatique, onglet de démarrage, nom de l'université et année universitaire. Le thème est appliqué par génération de CSS dynamique (`buildThemeCss`) qui surcharge les classes Tailwind `slate/blue`.

### 4.10 PWA

Manifeste (`manifest.webmanifest`, mode `standalone`, couleur `#0b3b60`, icônes SVG 192/512) et Service Worker (`sw.js`, cache `mahajanga-inscription-v2`) : précache des icônes/manifeste, cache des ressources `/_next/static/`, navigation « réseau d'abord » avec secours hors ligne. Enregistré **en production uniquement** ; désinstallé en développement. ⚠️ Les textes du manifeste parlent d'« inscription académique ».

---

## 5. Règles de gestion

| Réf. | Règle |
| --- | --- |
| RG-01 | Un étudiant (compte) a **au plus un** dossier de bourse (`EnrollmentApplication.userId` unique). |
| RG-02 | Un dossier n'est modifiable que s'il est `BROUILLON` ou `REFUSE`. |
| RG-03 | Toute sauvegarde d'un dossier `REFUSE` le remet en `BROUILLON` et efface la date de soumission. |
| RG-04 | Soumission : établissement, niveau, parcours et **code de quitus** obligatoires ; le quitus doit exister **et** appartenir à l'établissement du dossier. |
| RG-05 | Soumission : toutes les pièces obligatoires doivent être présentes. Liste = pièces `CANDIDATURE` actives de l'ISSTM (si configurées) sinon liste par défaut `cin, quitus, residence` (+ `bac` si L1) ; `unemployment` jamais obligatoire ; `bac` obligatoire seulement en L1. |
| RG-06 | « L1 » détecté par l'expression `/licence\s*1\|\bL1\b/i` sur le libellé du niveau. |
| RG-07 | Pour l'ISSTM, niveau et parcours d'un dossier doivent être **actifs** dans le curriculum ; pour les autres établissements aucune validation. |
| RG-08 | Un quitus est unique (`code`), lié à au plus un étudiant inscrit et à au plus un dossier. |
| RG-09 | Code de quitus : `QT-` + 40 caractères hexadécimaux majuscules (160 bits aléatoires) ; comparaison insensible à la casse (mise en majuscules). |
| RG-10 | Seuls les étudiants **actifs** sans quitus reçoivent un quitus lors de la génération. |
| RG-11 | La scolarité ne décide que des dossiers `SOUMIS`/`EN_REVISION` ; la décision est `VALIDE` ou `REFUSE` ; le refus exige un motif non vide. |
| RG-12 | Le statut du `User` et celui du dossier sont mis à jour dans une même transaction (décision, soumission, forçage admin). |
| RG-13 | Un secrétaire ne peut pas : générer des quitus, créer/modifier des comptes, modifier le curriculum, les pièces requises, la mention ou l'apparence. |
| RG-14 | Un responsable d'établissement ne voit et ne modifie que les données **de son établissement** (champ `establishment` du compte). |
| RG-15 | Un admin ne peut pas désactiver/supprimer son propre compte, ni le dernier admin actif. |
| RG-16 | Suppression d'un compte : d'abord corbeille (`deletedAt`, compte désactivé) ; purge définitive seulement depuis la corbeille et si aucune donnée liée. |
| RG-17 | Chaque action admin sur les comptes du personnel est consignée dans le journal d'audit. |
| RG-18 | Mots de passe : minimum 8 caractères (aucune autre règle de complexité). |
| RG-19 | Niveau/parcours d'une inscription établissement doivent exister, être actifs et appartenir au **cycle** (Licence/Master) de l'inscription. |
| RG-20 | Unicité : e-mail utilisateur, e-mail et matricule de fiche étudiante, (établissement, type, nom, cycle) pour le curriculum, (établissement, contexte, cycle, type) pour les pièces requises. |

---

## 6. Exigences non fonctionnelles

| Domaine | Exigence | Constat |
| --- | --- | --- |
| **Ergonomie** | Interface responsive (mobile, tablette, bureau), cibles tactiles ≥ 44 px, champs ≥ 16 px sur mobile | Respecté |
| **Accessibilité** | Libellés `aria-label`, rôles `alertdialog`/`switch`/`dialog`, `aria-pressed`, contraste élevé optionnel | Partiel (pas d'audit formel) |
| **Langue** | Interface 100 % française | Respecté |
| **Performance** | Requêtes Prisma directes ; liste des étudiants sans pagination | ⚠️ pas de pagination (étudiants, dossiers, comptes ; journal limité à 200) |
| **Disponibilité** | Rafraîchissement automatique côté étudiant (30 s) et admin (option) | Respecté |
| **Maintenabilité** | TypeScript strict, ESLint (frontend), oxlint + Prettier (backend), migrations Prisma versionnées (20 migrations) | Respecté |
| **Portabilité** | Variables d'environnement pour URL, SMTP, Google, base de données | Respecté |
| **Hors ligne** | PWA minimale | Partiel |
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
├── PROJECT_HISTORY.md           ← ancienne description du projet
├── backend/
│   ├── prisma/ (schema.prisma, seed.mjs, migrations/ ×20)
│   ├── src/ (main, app.module, *.controller.ts, *.service.ts)
│   ├── test/ (e2e)
│   └── uploads/ (créé à l'exécution : documents/, site-settings/)
└── frontend/
    ├── public/ (images campus, icônes, manifest, sw.js)
    └── src/
        ├── app/ (page.tsx, login/, login/google/, verify-email/, student/, etablissement/, scolarite/, admin/, layout.tsx, globals.css)
        └── components/ (voir §10.2)
```

### 7.4 Backend — modules

| Fichier | Responsabilité |
| --- | --- |
| [main.ts](backend/src/main.ts) | Démarrage, CORS (origine = `FRONTEND_URL`, méthodes GET/POST/PUT/PATCH/DELETE, en-têtes `Content-Type` et `Authorization`), fichiers statiques `/uploads/site-settings`, délai de tentative réseau porté à 5 s (corrige les timeouts vers Google), port `PORT` (3001) |
| [app.module.ts](backend/src/app.module.ts) | Déclaration des 8 contrôleurs et 7 fournisseurs ; module d'observabilité conditionnel |
| [auth.controller.ts](backend/src/auth.controller.ts) | Routes `/auth/*`, validation des entrées, flux Google |
| [auth.service.ts](backend/src/auth.service.ts) | Inscription/connexion, jetons, vérification d'e-mail, gardes de rôle (`requireAdmin`, `requireEstablishmentManager`, `requireEstablishmentAdmin`, `requireCentralRegistrar`, `requireUser`), gestion des comptes du personnel, corbeille, journal d'audit |
| [google-auth.service.ts](backend/src/google-auth.service.ts) | Client OAuth2 Google, vérification du jeton d'identité |
| [mail.service.ts](backend/src/mail.service.ts) | E-mails de vérification et de décision |
| [admin.controller.ts](backend/src/admin.controller.ts) | Routes `/admin/*` |
| [establishment.controller.ts](backend/src/establishment.controller.ts) | Routes établissement (curriculum, pièces requises, étudiants, secrétaires, paramètres, quitus) |
| [student.controller.ts](backend/src/student.controller.ts) | Routes `/student/*` (dossier de bourse) |
| [central-registrar.controller.ts](backend/src/central-registrar.controller.ts) | Routes `/scolarite/*` (liste, décision) |
| [document.controller.ts](backend/src/document.controller.ts) / [document.service.ts](backend/src/document.service.ts) | Téléversement, listage, lecture des pièces ; dossiers consultables |
| [site-settings.controller.ts](backend/src/site-settings.controller.ts) / [site-settings.service.ts](backend/src/site-settings.service.ts) | Réglages de la page d'accueil |
| [prisma.service.ts](backend/src/prisma.service.ts) | Connexion Prisma |
| [app.controller.ts](backend/src/app.controller.ts) | `GET /` → « Hello World! » (squelette NestJS) |

Particularités d'implémentation : l'autorisation se fait **manuellement dans chaque route** (lecture de l'en-tête `Authorization`, appel à une méthode `require…`) ; il n'y a ni `Guard` Nest, ni `ValidationPipe`/DTO — la validation est écrite à la main dans chaque contrôleur.

---

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
| `AuditAction` | `STAFF_ACCOUNT_CREATED`, `_STATUS_CHANGED`, `_NAME_UPDATED`, `_PASSWORD_RESET`, `_TRASHED`, `_RESTORED`, `_PURGED` |
| `HeroBackgroundType` | `COLOR`, `GRADIENT`, `IMAGE` |

### 8.2 Modèles

| Modèle | Champs clés | Relations / contraintes |
| --- | --- | --- |
| **User** | `id` (cuid), `fullName`, `email` (unique), `passwordHash?`, `emailVerified`, `active`, `role`, `registrationStatus`, `establishment?`, `level?`, `program?`, `deletedAt?`, horodatages | 1–1 `EnrollmentApplication` ; 0–1 `EnrolledStudent` ; N `Quitus` émis ; N `EmailVerificationToken` ; N dossiers relus |
| **EmailVerificationToken** | `tokenHash` (unique, SHA-256), `userId`, `expiresAt` | Suppression en cascade avec l'utilisateur ; index `userId`, `expiresAt` |
| **AuditLogEntry** | `action`, `actorId?`, `actorName`, `targetId?`, `targetName`, `detail?`, `createdAt` | Index `createdAt` ; pas de clé étrangère (conserve l'historique après purge) |
| **Quitus** | `code` (unique), `studentName`, `studentEmail?`, `establishment`, `issuedAt`, `issuedById?`, `enrollmentId?` (unique) | Lié à `EnrolledStudent` et à au plus un `EnrollmentApplication` |
| **EnrollmentApplication** (dossier de bourse) | `userId` (unique), `establishment`, `level`, `program`, `quitusId?` (unique), `status`, `submittedAt?`, `reviewNote?`, `reviewedAt?`, `reviewedById?` | Cascade avec l'utilisateur ; `reviewedBy` → `SetNull` ; N `ApplicationDocument` |
| **ApplicationDocument** | `applicationId`, `type`, `originalName`, `storageName` (unique), `mimeType`, `size` | Unique `(applicationId, type)` ; cascade |
| **EnrolledStudent** | `registrationNumber` (unique), `fullName`, `email?` (unique), `phone`, `gender`, `registrationForm` (`LICENCE`/`MASTER`), `birthDatePlace`, `cin`, `nationality`, `address`, `previousEstablishment`, `bacYear/Series/Center`, `previousUniversityRegistration`, `fatherName`, `motherName`, `parentsPhone`, `parentsCity`, `respondentName/Phone/Address`, `maritalStatus`, `licenceYear`, `mention`, `previousLevel`, `previousProgram`, `quality`, `establishment`, `level`, `program`, `active`, `userId?` (unique) | Lien optionnel vers `User` (`SetNull`) ; 0–1 `Quitus` ; N `EnrolledStudentDocument` |
| **EnrolledStudentDocument** | `enrolledStudentId`, `type`, fichier (mêmes champs que ci-dessus) | Unique `(enrolledStudentId, type)` ; cascade |
| **EstablishmentCurriculumOption** | `establishment`, `type` (NIVEAU/PARCOURS), `name`, `cycle`, `active` | Unique `(establishment, type, name, cycle)` |
| **DocumentRequirement** | `establishment`, `context`, `cycle`, `type`, `label`, `active` | Unique `(establishment, context, cycle, type)` |
| **EstablishmentSettings** | `establishment` (clé), `mention?`, `interfaceSettings` (JSON) | – |
| **SiteSettings** | `id = "default"`, couleurs, `logoUrl`, `faviconUrl`, `heroBackgroundType`, `heroBackgroundImages[]`, `heroOverlayOpacity`, `heroTitle`, `heroSubtitle`, libellés et liens des 2 boutons | Ligne unique créée à la volée |

### 8.3 Historique des migrations (20)

`initial_schema` → `establishment_quitus` → `enrolled_students` → `enrollment_applications` → `link_users_to_enrolled_students` → `central_registrar` → `establishment_curriculum` → `email_verification` → `staff_account_active` → `establishment_account_roles` → `application_documents` → `enrollment_form_details` → `curriculum_cycle_and_enrollment_extras` → `scope_curriculum_unique_by_cycle` → `staff_account_trash_and_audit_log` → `site_settings` → `hero_background_images` → `enrolled_student_documents` → `document_requirements` → `document_requirement_context` → *(non commitée)* `add_establishment_interface_settings`.

---

## 9. API REST — catalogue complet

Toutes les routes protégées attendent `Authorization: Bearer <jeton>`. Les erreurs renvoient le format NestJS `{ statusCode, message, error }`. URL de base : `http://localhost:3001`.

### 9.1 Authentification (public)

| Méthode | Route | Corps / paramètres | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | `fullName, email, password` | Crée un compte `ETUDIANT`, envoie l'e-mail de vérification |
| POST | `/auth/login` | `email, password` | Retourne `{ accessToken, user }` |
| POST | `/auth/verify-email` | `token` | Consomme le jeton, vérifie l'adresse |
| POST | `/auth/resend-verification-email` | `email` | Renvoie le lien |
| GET | `/auth/google` | – | Pose le cookie `state`, redirige vers Google |
| GET | `/auth/google/callback` | `code, state` | Vérifie `state`, crée/connecte l'utilisateur, redirige vers `/login/google?code=…` |
| POST | `/auth/google/exchange` | `code` | Échange le code à usage unique (60 s) contre `{ accessToken, user }` |

### 9.2 Étudiant (rôle `ETUDIANT`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/student/application` | Dossier de l'étudiant (avec code du quitus) ou `null` |
| GET | `/student/profile` | Nom, e-mail, établissement, niveau, parcours |
| PUT | `/student/application` | Enregistre le brouillon `{ establishment, level, program, quitusCode? }` |
| POST | `/student/application/submit` | Soumission finale (contrôle quitus + pièces) |
| POST | `/student/application/documents/:type` | Téléverse une pièce (multipart, champ `file`) |
| GET | `/student/application/documents` | Liste des pièces déposées |
| POST | `/quitus/verify` | `{ code, establishment }` → `{ valid, code, studentName, establishment }` (tout utilisateur connecté) |
| GET | `/establishments/isstm/curriculum` | **Public** : niveaux et parcours actifs de l'ISSTM |
| GET | `/establishments/isstm/document-requirements` | **Public** : pièces actives `CANDIDATURE` de l'ISSTM |

### 9.3 Établissement (rôles `ETABLISSEMENT`, `ADMIN_ETABLISSEMENT`, `SECRETAIRE`, sauf mention « resp. »)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/establishment/isstm/curriculum` | Curriculum complet (actifs et inactifs) |
| POST | `/establishment/isstm/curriculum` | **resp.** Ajoute `{ type, name, cycle }` |
| PATCH | `/establishment/isstm/curriculum/:id` | **resp.** Modifie `name`, `active`, `cycle` |
| DELETE | `/establishment/isstm/curriculum/:id` | **resp.** Supprime |
| GET | `/establishment/isstm/document-requirements?context=` | Pièces requises (INSCRIPTION par défaut) |
| POST | `/establishment/isstm/document-requirements` | **resp.** `{ cycle, context, label, type? }` |
| PATCH | `/establishment/isstm/document-requirements/:id` | **resp.** `label`, `active`, `cycle` |
| DELETE | `/establishment/isstm/document-requirements/:id` | **resp.** Supprime |
| GET | `/establishment/isstm/students?search=&gender=&level=` | Étudiants inscrits (avec quitus) |
| POST | `/establishment/isstm/students` | Inscription ou réinscription (`existingStudentId`) |
| GET | `/establishment/isstm/students/:id/dossier` | Dossier consultable |
| GET | `/establishment/isstm/students/:id/documents` | Pièces d'inscription |
| POST | `/establishment/isstm/students/:id/documents/:type` | Téléverse une pièce d'inscription |
| GET | `/establishment/isstm/secretaries` | Liste des secrétaires |
| POST | `/establishment/isstm/secretaries` | **resp.** Crée un secrétaire |
| PATCH | `/establishment/isstm/secretaries/:id` | **resp.** Nom / mot de passe |
| PATCH | `/establishment/isstm/secretaries/:id/status` | **resp.** Active / désactive |
| GET / PATCH | `/establishment/isstm/settings` | Lecture ; **resp.** écriture de la mention |
| GET / PUT | `/establishment/isstm/interface-settings` | Lecture ; **resp.** écriture de l'apparence partagée |
| POST | `/establishment/isstm/quitus/generate` | **resp.** `{ studentIds? }` → `{ created, alreadyGenerated }` |

### 9.4 Scolarité centrale (rôle `SCOLARITE_CENTRALE`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/scolarite/applications` | Dossiers `SOUMIS`, `EN_REVISION`, `VALIDE`, `REFUSE` (du plus récent) |
| PATCH | `/scolarite/applications/:id/decision` | `{ status: 'VALIDE'\|'REFUSE', note? }` + e-mail à l'étudiant |
| GET | `/scolarite/applications/:id/dossier` | Dossier complet |

### 9.5 Administrateur (rôle `ADMIN`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/admin/users` | Tous les comptes non supprimés |
| PATCH | `/admin/users/:id/status` | Active/désactive (gardes soi-même / dernier admin) |
| DELETE | `/admin/users/:id` | Corbeille (mêmes gardes) |
| GET | `/admin/students` | Comptes étudiants et statut |
| GET | `/admin/establishments` | Établissements et effectifs |
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
| PUT | `/admin/site-settings` | Met à jour les réglages (couleurs validées, opacité 0–100) |
| POST | `/admin/site-settings/upload/:asset` | `asset` = `logo` ou `favicon` |
| POST / DELETE | `/admin/site-settings/hero-images` · `/:index` | Ajoute (max 4) / supprime une photo |
| POST | `/admin/site-settings/reset` | Réinitialise tout |

### 9.6 Communs

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/site-settings` | **Public** : réglages de la page d'accueil |
| GET | `/documents/:id/file` | Fichier (étudiant : le sien ; personnel d'établissement : son établissement ; scolarité et admin : tous) |
| GET | `/uploads/site-settings/*` | **Public** : images du site |
| GET | `/` | « Hello World! » |

---

## 10. Frontend — pages et composants

### 10.1 Pages (App Router)

| Route | Fichier | Description |
| --- | --- | --- |
| `/` | [page.tsx](frontend/src/app/page.tsx) | Accueil public |
| `/login` | [login/page.tsx](frontend/src/app/login/page.tsx) | Connexion / création de compte, Google, renvoi de la vérification |
| `/login/google` | [login/google/page.tsx](frontend/src/app/login/google/page.tsx) | Reçoit le code Google, l'échange une seule fois (garde `useRef` contre le double effet en mode strict), stocke la session, redirige |
| `/verify-email` | [verify-email/page.tsx](frontend/src/app/verify-email/page.tsx) | Valide le jeton reçu par e-mail |
| `/student` | [student/page.tsx](frontend/src/app/student/page.tsx) (≈ 1 000 lignes) | Espace étudiant |
| `/etablissement` | [etablissement/page.tsx](frontend/src/app/etablissement/page.tsx) (≈ 2 150 lignes) | Espace établissement |
| `/scolarite` | [scolarite/page.tsx](frontend/src/app/scolarite/page.tsx) | Espace scolarité centrale |
| `/admin` | [admin/page.tsx](frontend/src/app/admin/page.tsx) | Espace administrateur |

Navigation par espace :
- **Étudiant** : Dépôt de dossier · Mon dossier · Notifications · Paramètres.
- **Établissement** : Liste des étudiants · Ajouter (Nouvelle inscription / Réinscription) · Ajouter secrétaire (resp.) · Paramètres (Apparence & Affichage · Comportement · Structure académique & mentions · Pièces — Inscription · Pièces — Dépôt de dossier étudiant).
- **Scolarité** : Vue d'ensemble · Dossiers à examiner · Historique des décisions · Paramètres.
- **Admin** : Tableau de bord · Étudiants · Création des comptes · Tous les comptes · Historique · Corbeille · Paramètres (Apparence & Affichage · Comportement · Identité · Page d'accueil).

### 10.2 Composants partagés

| Composant | Rôle |
| --- | --- |
| [DossierViewer](frontend/src/components/DossierViewer.tsx) | Fenêtre de consultation d'un dossier (profil de 26 champs, pièces ouvrables/téléchargeables via blob) |
| [ConfirmDialog](frontend/src/components/ConfirmDialog.tsx) | Confirmation de déconnexion |
| [HomepageHero](frontend/src/components/HomepageHero.tsx) | Fond et contenu du hero |
| [HomepageSettingsPanel](frontend/src/components/HomepageSettingsPanel.tsx) | Éditeur de la page d'accueil (admin) |
| [AdminSettingsPanel](frontend/src/components/AdminSettingsPanel.tsx) | Panneau d'apparence commun aux 4 espaces |
| [adminSettings.ts](frontend/src/components/adminSettings.ts) | Types, valeurs par défaut, migration d'anciens réglages, génération du CSS de thème |
| [useInterfaceSettings](frontend/src/components/useInterfaceSettings.ts) | Hook de chargement/sauvegarde des réglages |
| [PlatformThemeProvider](frontend/src/components/PlatformThemeProvider.tsx) | Applique le thème selon l'espace visité |
| [HomeThemeToggle](frontend/src/components/HomeThemeToggle.tsx) | Bascule clair/sombre des pages publiques |
| [dashboardPath.ts](frontend/src/components/dashboardPath.ts) | Rôle → chemin du tableau de bord |
| [siteSettings.ts](frontend/src/components/siteSettings.ts) | Types, valeurs par défaut, récupération des réglages du site |
| [ServiceWorkerRegistration](frontend/src/components/ServiceWorkerRegistration.tsx) | Enregistrement du Service Worker |

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
- Journal d'audit des actions admin ; garde-fous « dernier admin » et « soi-même ».

### 11.2 Vulnérabilités et faiblesses constatées ⚠️

| # | Constat | Gravité | Recommandation |
| --- | --- | --- | --- |
| S-01 | **Aucune limitation de débit** (connexion, inscription, renvoi d'e-mail, vérification de quitus) : force brute et énumération possibles | Élevée | `@nestjs/throttler` |
| S-02 | Jeton de session en `sessionStorage` (accessible à tout script de la page) ; pas de révocation avant expiration (8 h) | Moyenne | Cookie `httpOnly` + jeton de rafraîchissement |
| S-03 | Secret de repli codé en dur `development-only-secret-change-before-production` si `AUTH_TOKEN_SECRET` est absent hors production | Moyenne | Refuser le démarrage sans secret |
| S-04 | `.env.example` contient un **identifiant client Google réel** (`GOOGLE_CLIENT_ID=…apps.googleusercontent.com`) et des mots de passe de démonstration | Faible/Moyenne | Remplacer par des valeurs factices |
| S-05 | Validation du type de fichier basée sur le **`mimetype` déclaré** par le client (pas d'inspection du contenu) ; les SVG ne sont acceptés que pour logo/favicon et servis tels quels (risque de script dans un SVG) | Moyenne | Vérifier les « magic bytes » ; assainir ou interdire le SVG |
| S-06 | Le fichier est écrit sur disque **avant** la vérification d'existence/la mise à jour en base ; un échec laisse un fichier orphelin | Faible | Ordre inverse ou nettoyage |
| S-07 | **`/quitus/verify` accessible à tout utilisateur connecté** et renvoie le nom de l'étudiant titulaire du quitus ; un quitus n'est pas rattaché au compte qui l'utilise : n'importe quel étudiant connaissant un code l'utilise (code à 160 bits, donc difficile à deviner, mais transmissible) | Moyenne | Vérifier que le quitus correspond à l'e-mail/étudiant du demandeur |
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

Scripts : `build`, `start`, `start:dev`, `start:debug`, `start:prod`, `lint`, `format`, `test`, `test:watch`, `test:cov`, `test:e2e`, `prisma:generate`, `prisma:migrate`, `prisma:seed`.

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
- Le Service Worker n'est actif qu'en production.
- ⚠️ Le fichier `backend/tsconfig.build.tsbuildinfo` (artefact de compilation) est versionné et modifié à chaque build : à ajouter au `.gitignore`.

---

## 13. Données de démonstration (seed)

Le script [seed.mjs](backend/prisma/seed.mjs) est **idempotent** (upserts) et crée :

- 1 administrateur, 1 responsable ISSTM (`ADMIN_ETABLISSEMENT`), 1 compte scolarité centrale (e-mails vérifiés) ;
- le **curriculum ISSTM** — Niveaux : L1, L2, L3 (Licence), M1, M2 (Master) ; Parcours Licence : GI, GC, GT, GE, GInfo, GEI, GBM, GH, GArch ; Parcours Master : GE (ISEA), GAOH, G.Logiciel, GC, EII, TR, GI, GBM ;
- **16 pièces requises** (5 inscription-Licence, 6 inscription-Master, 5 candidature-Licence) ;
- **20 étudiants fictifs** `ISSTM-2026-001…020` avec comptes de connexion liés (mot de passe commun) ;
- **8 quitus de démonstration** `ISSTM-2026-DEMO-001…008` (pour les 8 premiers étudiants) ;
- **3 dossiers de bourse déjà `SOUMIS`** (étudiants 001 à 003) pour tester la scolarité.

⚠️ Les quitus de démonstration ont un format différent des quitus réels (`QT-…`) et sont **faciles à deviner** : à ne jamais laisser en production.

---

## 14. Tests et qualité

| Élément | État |
| --- | --- |
| Test unitaire | 1 seul test : [app.controller.spec.ts](backend/src/app.controller.spec.ts) (« Hello World! ») |
| Test e2e | Squelette [app.e2e-spec.ts](backend/test/app.e2e-spec.ts) (non revu en détail) |
| Tests frontend | Aucun |
| Couverture des règles métier (soumission, décision, quitus, droits) | **Aucune** |
| Lint | oxlint (backend), ESLint 9 + `eslint-config-next` (frontend) |

Plan de test minimal recommandé (voir §16) : tests d'intégration sur RG-02, RG-04, RG-05, RG-11, RG-13, RG-14, RG-15.

### 14.1 Scénarios de recette (à dérouler à la main)

1. Création de compte → réception de l'e-mail → clic sur le lien → connexion.
2. Connexion avec un e-mail non vérifié → message + renvoi du lien.
3. Connexion Google (nouveau compte, puis compte existant, puis compte désactivé).
4. Étudiant : choix ISSTM → L1 → GInfo → quitus `ISSTM-2026-DEMO-001` → téléversement de 4 pièces (CIN, quitus, résidence, bac) → soumission.
5. Même parcours en L2 : le relevé de bac n'est plus exigé.
6. Soumission avec une pièce manquante → refus. Pièce > 10 Mo ou `.docx` → refus.
7. Quitus d'un autre établissement → refus.
8. Scolarité : refuser sans motif (bloqué) ; refuser avec motif (e-mail reçu) ; valider (e-mail reçu).
9. Étudiant refusé : modifier le dossier → retour en `BROUILLON` → re-soumettre.
10. Étudiant validé : l'attestation devient imprimable ; le dossier n'est plus modifiable.
11. Établissement : inscrire un étudiant Licence puis Master ; réinscrire ; générer quitus (sélection puis « manquants ») ; imprimer l'attestation.
12. Secrétaire : vérifier l'absence des boutons de génération de quitus, de gestion des comptes et de paramètres.
13. Isolation : un responsable d'un autre établissement ne peut pas ouvrir le dossier ni les pièces d'un étudiant de l'ISSTM.
14. Admin : créer un compte, le désactiver, le renommer, réinitialiser son mot de passe, le mettre à la corbeille, le restaurer, le purger (saisie du nom) ; vérifier chaque ligne du journal d'audit ; tenter de désactiver le dernier admin.
15. Admin : personnaliser la page d'accueil (logo, favicon, 4 photos, couleurs, textes) puis réinitialiser.
16. Export CSV et PDF des étudiants.

---

## 15. Écarts, dette technique et risques

### 15.1 Cohérence métier et textes
| # | Constat |
| --- | --- |
| T-01 | Le dépôt, le titre HTML (« Portail d'inscription »), le manifeste PWA, le hero par défaut (« Votre inscription universitaire… »), les pages d'accueil/connexion, l'attestation étudiante, l'e-mail du `SMTP_FROM` (« Plateforme d'inscription ») et le thème de l'espace admin (« Gestion des inscriptions ») emploient le vocabulaire de l'**inscription**, alors que la fonction réelle est la **demande de bourse**. À harmoniser. |
| T-02 | L'attestation délivrée à l'étudiant validé dit « est inscrit(e) à … pour l'Année Universitaire 2025-2026 » : ce n'est pas une attestation de bourse. |
| T-03 | L'année universitaire est **codée en dur** (« 2025-2026 » côté étudiant ; fonction `academicYear()` côté établissement ; réglage local « Année universitaire » dans les paramètres) et n'est pas liée à une donnée serveur. |
| T-04 | Statistiques de l'accueil (15+, 10 000+, 100 %) et badge « Inscriptions académiques ouvertes » **codés en dur**. |
| T-05 | La page étudiant contient des données factices par défaut (`RAKOTO Jean`, `etudiant@gmail.com`, « 11 Septembre 2026 ») visibles brièvement avant le chargement. |

### 15.2 Architecture
| # | Constat |
| --- | --- |
| A-01 | **ISSTM codé en dur** : routes `/establishment/isstm/…`, constante `ISSTM`, filtres `establishment === 'ISSTM'` côté étudiant et backend. Les 10 autres établissements n'ont ni curriculum, ni pièces requises, ni quitus, ni personnel. Un étudiant peut choisir « ENS » mais ne pourra pas soumettre (aucun quitus ne peut exister pour cet établissement). |
| A-02 | Pas de table `Establishment` : l'établissement est une **chaîne de caractères** répétée dans `User`, `Quitus`, `EnrolledStudent`, `EnrollmentApplication`, etc. (risque de fautes de frappe, renommage impossible proprement). |
| A-03 | Deux entités « étudiant » (`User` / `EnrolledStudent`) reliées par e-mail ou `userId` : désynchronisation possible (changement d'e-mail, doublons). |
| A-04 | Les champs `User.establishment/level/program/registrationStatus` **dupliquent** ceux du dossier ; synchronisés manuellement dans plusieurs transactions. |
| A-05 | Pas de couche DTO/validation ni de garde Nest : validation et autorisation dupliquées dans chaque route. |
| A-06 | Pages frontend monolithiques (1 000 à 2 150 lignes) mêlant état, appels API et affichage ; appels `fetch` répétés sans client API commun. |
| A-07 | Le thème des espaces connectés repose sur la **réécriture dynamique de classes Tailwind** par CSS `!important` : fragile à chaque nouvelle classe. |
| A-08 | `StaffRole` côté admin n'expose que `ETABLISSEMENT` et `SCOLARITE_CENTRALE` ; le backend convertit `ETABLISSEMENT` en `ADMIN_ETABLISSEMENT` : le rôle `ETABLISSEMENT` est un reliquat. |
| A-09 | L'admin crée un responsable en **saisissant librement** le nom de l'établissement (aucune liste de référence). |
| A-10 | Le « statut » du dossier côté admin se modifie par un simple sélecteur, sans motif ni trace dans le journal d'audit (le journal ne couvre que les comptes du personnel). De même, les décisions de la scolarité et les actions des secrétaires/responsables ne sont pas auditées. |

### 15.3 Fonctionnel
| # | Constat |
| --- | --- |
| P-01 | Pas de réinitialisation de mot de passe en libre-service. |
| P-02 | Notifications étudiantes factices ; seul l'e-mail de décision existe. |
| P-03 | `EN_REVISION` jamais atteint par le flux normal. |
| P-04 | Pas de pagination ni d'export côté établissement et scolarité (CSV/PDF uniquement côté admin). |
| P-05 | L'« export PDF » admin est une impression du navigateur, sans mise en page dédiée. |
| P-06 | Aucune date limite, campagne ou année de bourse : un étudiant n'a qu'un dossier à vie (`userId` unique), sans notion d'année universitaire ; impossible de redéposer l'année suivante. |
| P-07 | Un dossier `REFUSE` modifié perd son motif de refus précédent à la nouvelle décision ; l'historique des décisions successives n'est pas conservé. |
| P-08 | Case « Se souvenir de moi » sans effet. |
| P-09 | Le bouton « Mon dossier » n'est débloqué qu'après vérification du quitus ; les onglets Notifications/Paramètres seulement après soumission (choix d'interface, pas une règle métier). |
| P-10 | Suppression d'un niveau/parcours/pièce requise possible même s'ils sont utilisés par des dossiers existants (aucune protection d'intégrité). |
| P-11 | `POST /establishment/isstm/students` : pour un nouvel étudiant, seuls certains champs sont obligatoires côté serveur ; les champs requis par étape côté client (ex. CIN, bac) ne sont pas imposés par l'API. |
| P-12 | Un utilisateur Google dont l'e-mail correspond à un compte du personnel se connecte avec le rôle de ce compte (comportement voulu, mais à documenter : l'e-mail Google fait foi). |

---

## 16. Évolutions recommandées

### 16.1 Priorité haute
1. **Aligner le vocabulaire** sur la bourse (textes, attestation, manifeste, e-mails, titre).
2. **Limitation de débit** et en-têtes de sécurité (S-01, S-10).
3. **Rattacher le quitus au demandeur** (S-07) et inspecter le contenu des fichiers (S-05).
4. **Réinitialisation de mot de passe** par e-mail (P-01).
5. **Tests automatisés** sur les règles RG-02/04/05/11/13/14/15 et sur l'autorisation par rôle.
6. Nettoyer `.env.example` (S-04) et le `.gitignore` (`tsbuildinfo`, `uploads/`).

### 16.2 Priorité moyenne
7. Table **`Establishment`** et routes génériques `/establishments/:id/…` (levée de A-01/A-02/A-09).
8. **Campagnes / années de bourse** : dossier lié à une année universitaire, dates d'ouverture/clôture (P-06).
9. **Journal d'audit étendu** à tous les rôles (décisions, changements de statut, quitus générés) (A-10).
10. Historique des décisions par dossier ; passage `SOUMIS → EN_REVISION` explicite (« prendre en charge ») (P-03, P-07).
11. Vraies **notifications** (table + cloche + e-mails) (P-02).
12. Guards/DTO Nest (`class-validator`) et client API frontend mutualisé ; découpage des grosses pages (A-05, A-06).
13. Pagination et filtres serveur ; exports CSV pour établissement et scolarité (P-04).

### 16.3 Priorité basse
14. Stockage objet pour les pièces, antivirus sur les fichiers, sauvegardes automatiques (S-13).
15. Cookie `httpOnly` + jeton de rafraîchissement (S-02).
16. Tableau de bord statistique (par établissement, par niveau, délais de traitement).
17. Mise en page PDF dédiée pour les exports et l'attestation de bourse.
18. Internationalisation (français / malgache).
19. Audit d'accessibilité (WCAG) et tests e2e (Playwright).

---

## 17. Glossaire

| Terme | Définition |
| --- | --- |
| **Dossier de bourse** | Ensemble (choix établissement/niveau/parcours + quitus + pièces) déposé par l'étudiant ; modèle `EnrollmentApplication` |
| **Quitus** | Reçu/attestation de paiement des droits d'inscription délivré par l'établissement ; ici un code unique `QT-…` généré par l'établissement et vérifié par l'étudiant |
| **Scolarité centrale** | Service de l'université qui examine et décide des dossiers |
| **Établissement** | Faculté, école ou institut (ISSTM, ENS, FSTE…) |
| **ISSTM** | Établissement de l'université de Mahajanga — seul établissement géré de bout en bout (le code ne donne pas la signification de l'acronyme : à compléter) |
| **Curriculum** | Niveaux (L1…M2) et parcours (GInfo, GC…) d'un établissement, par cycle |
| **Cycle** | `LICENCE` ou `MASTER` |
| **Pièce requise** | Type de document exigé, configurable par établissement, contexte (inscription / candidature) et cycle |
| **Candidature** | Contexte « dépôt de dossier de bourse par l'étudiant » (par opposition à `INSCRIPTION`, saisie par l'établissement) |
| **Matricule** | Numéro d'inscription d'un étudiant dans la base de l'établissement |
| **Passant / Redoublant** | Qualité d'un étudiant lors d'une réinscription |
| **Corbeille** | Suppression logique d'un compte (`deletedAt`) avant purge définitive |
| **PWA** | Application web installable avec cache hors ligne minimal |
