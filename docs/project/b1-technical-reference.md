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
- architecture prête à accueillir des sauvegardes portables, une synchronisation
  personnelle par dossier et des extensions métier

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
- `repository` (facultatif)
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

### `repository`
Lien facultatif vers le dépôt canonique du projet :

- `provider` (par défaut `github`)
- `fullName` (`organisation/depot`)
- `url`
- `defaultBranch`
- `visibility` (`public`, `private` ou `internal`)
- `governance`

Des propriétés supplémentaires, comme un futur identifiant externe stable, sont
préservées par la normalisation. Un projet sans dépôt lié conserve
`repository: null`. Lors de l’hydratation ou de l’import, un document ancien qui
ne contient pas cette propriété est normalisé de la même manière.

Cet ajout reste compatible avec le schéma `1.0` : il est facultatif, n’entraîne
aucune migration destructive et l’export JSON le préserve. L’export Markdown
reste inchangé.

### Adaptateur de dépôt en lecture seule

La couche fournisseur est isolée dans `src/repositories/providers/`. Une
implémentation expose un identifiant `id` et une fonction asynchrone
`readRepository(repository)`. Le premier adaptateur interroge uniquement l’API
publique GitHub, sans token ni opération d’écriture, et normalise :

- identité, visibilité, branche par défaut et dernière activité du dépôt ;
- pull requests ouvertes, état brouillon/prête et liens GitHub ;
- fusion possible/conflits et statuts de commit lorsqu’ils sont disponibles.

`repositorySnapshotService` orchestre le fournisseur et un cache séparé du
`ProjectDocument`. Chaque résultat expose un état explicite (`fresh`, `stale`,
`offline`, `error`, `unsupported` ou `unlinked`), sa source (`network` ou
`cache`), un `fetchedAt`, l’âge du cache et une erreur normalisée éventuelle.
Une erreur réseau ou une limite d’API ne remplace jamais un ancien snapshot par
un faux état sain. Hors ligne, le dernier snapshot reste lisible mais est
toujours signalé comme périmé.

Le cache est conservé dans l’espace applicatif IndexedDB, avec le même repli
`localStorage` que les autres préférences. Il n’est pas exporté avec le projet
et ne devient donc jamais une source de vérité concurrente.

### `sync`
Métadonnées préparatoires à la synchronisation :

- `localVersion`
- `remoteVersion`
- `lastSyncedAt`
- `dirty`

Ces métadonnées ne désignent ni un compte distant ni un utilisateur
collaboratif. Elles restent des signaux locaux pour préparer la détection de
restauration et de divergence.

### Direction de sauvegarde acceptée

[DR-002](../decisions/DR-002-local-first-syncthing-backup-architecture.md)
fixe les responsabilités suivantes :

- IndexedDB est le stockage de travail de l'application ;
- le bundle JSON global est le format portable immédiat ;
- un fournisseur facultatif peut recopier des instantanés dans un dossier choisi ;
- chaque appareil écrit son propre instantané ;
- Syncthing transporte les fichiers sans être intégré comme base de données ;
- l'application relit les instantanés à l'ouverture et n'écrase jamais
  silencieusement un état divergent ;
- le téléchargement et l'import manuels restent disponibles partout.

L'accès direct au dossier doit être détecté au runtime. Un navigateur qui ne
propose pas l'API requise continue à utiliser le flux manuel existant.

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
- export global de tous les projets dans un bundle JSON versionné
- import JSON
- export Markdown
- preview Markdown intégré
- attachments
- base PWA

Le bundle de sauvegarde globale utilise le format suivant sans modifier le
schéma de chaque projet :

```json
{
  "format": "ide-projectsmanager.project-bundle",
  "version": 1,
  "exportedAt": "2026-08-20T10:00:00.000Z",
  "projectCount": 2,
  "projects": []
}
```

La restauration d’un bundle complet est traitée séparément afin de préserver
le comportement de l’import unitaire existant.

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
- accès au dossier sélectionné et persistance des permissions à valider sur les
  navigateurs cibles
- restauration du bundle global non encore implémentée
- transport Syncthing non encore validé sous Windows et Android
- gestion de vrais fichiers binaires pour attachments non encore traitée

## Roadmap technique courte recommandée

1. ajouter la restauration sûre du bundle global (`R1.7`)
2. introduire le fournisseur de sauvegarde portable (`S1.1`)
3. ajouter l'adaptateur de dossier sélectionné (`S1.2`)
4. écrire les instantanés propres à chaque appareil (`S1.3`)
5. détecter restauration et divergence (`S1.4`)
6. valider et documenter Windows/Android (`S1.5`)
7. traiter `.ipm` et les pièces jointes binaires plus tard (`S2.1`)

Les améliorations UX restantes — thème, preview et PWA — peuvent être
intercalées uniquement si elles ne retardent pas le socle de restauration.
