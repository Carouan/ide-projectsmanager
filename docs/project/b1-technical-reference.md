# B1 — Référence technique du projet

Ce document décrit l’application elle-même : architecture, modèle de données, état réel d’implémentation, limites et roadmap technique.

## Résumé technique

L’application est une PWA locale développée avec React et Vite, centrée sur un fonctionnement **local-first** et **sans backend de production** à ce stade.

Principes structurants :

- frontend only pour le noyau actuel
- aucune vraie authentification distante
- aucune collaboration temps réel réelle
- JSON comme support d’échange principal
- export Markdown comme sortie documentaire lisible
- persistance locale robuste
- architecture prête à accueillir sync future, profils utilisateurs plus poussés et extensions métier

## Stack actuelle

- React
- Vite
- `vite-plugin-pwa`
- import / export JSON
- export / preview Markdown
- persistance locale
- i18n FR / EN
- IndexedDB
- couche repository de stockage

## Architecture fonctionnelle actuelle

### Écrans principaux

- liste / tableau de bord des projets
- écran projet
- écran paramètres

### Sous-zones de l’écran projet

- métadonnées projet
- navigation entre étapes
- édition de l’étape active
- backlog
- journal
- décisions
- attachments
- import / export
- badge de synchronisation
- panneau latéral de preview Markdown

## Modèle de données de référence

Le cœur de l’application reste un **ProjectDocument**.

Structure logique :

- `project`
- `stages`
- `backlog`
- `journal`
- `decisions`
- `attachments`
- `settings`
- `sync`

Champs importants :

### `project`
- `id`
- `slug`
- `title`
- `summary`
- `description`
- `status`
- `createdAt`
- `updatedAt`
- `ownerId`
- `currentStage`

### `stages`
Chaque étape versionnée peut porter :

- `version`
- `title`
- `status`
- `goal`
- `notes`
- `deliverable`
- `definitionOfDone`
- `linkedBacklogIds`
- `linkedJournalIds`

### `attachments`
Types prévus :

- `url`
- `note`
- `snippet`
- `file_ref`

### `sync`
Métadonnées préparatoires à la synchronisation :

- `localVersion`
- `remoteVersion`
- `lastSyncedAt`
- `dirty`

## État réel d’implémentation

### Noyau produit
Implémenté :

- création, ouverture, suppression de projet
- édition des métadonnées projet
- navigation multi-étapes
- édition des champs d’étape
- backlog
- journal
- décisions
- arbre de décision / capture d’idée
- export JSON
- import JSON
- export Markdown
- preview Markdown intégré
- attachments
- base PWA

### Paramètres / UX
Implémenté :

- écran paramètres
- persistance de la langue
- persistance du toggle preview Markdown
- structure de settings globale

Encore incomplet :

- thème réellement appliqué partout
- densité UI réellement exploitée
- formats d’export multiples réellement branchés
- chemins par défaut import / export / attachments

### Persistances
Implémenté :

- repository layer
- migration projets vers IndexedDB
- migration settings + user profile vers IndexedDB
- fallback legacy localStorage
- hydratation asynchrone robuste
- `ownerId`
- profil utilisateur local minimal

### Synchronisation
Implémenté / préparé :

- métadonnées `sync`
- squelette `syncEngine`
- calcul explicite de conflit minimal
- badge UI d’état de sync

Non fait :

- push réel distant
- pull réel distant
- politique de fusion avancée
- résolution de conflit assistée par UI
- stockage / transport distant réel

## Limites connues

- comportement de mise à jour / réinstallation PWA à clarifier sur Android
- besoin d’un switch `stage preview` ↔ `full export`
- settings présents dans le modèle mais encore partiellement branchés
- convention de dossier de travail utilisateur encore à formaliser
- gestion de vrais fichiers binaires pour attachments non encore traitée

## Roadmap technique courte recommandée

1. stabiliser la v1.0 réellement livrée
2. auditer modèle ↔ UI ↔ exports
3. finaliser les settings réellement branchés
4. clarifier identité / update PWA
5. ajouter export / import global de tous les projets
6. ajouter preview `étape active` vs `export complet`
