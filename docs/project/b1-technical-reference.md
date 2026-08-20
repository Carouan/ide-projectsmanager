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
- convention de dossier de travail utilisateur encore à formaliser
- gestion de vrais fichiers binaires pour attachments non encore traitée

## Roadmap technique courte recommandée

1. stabiliser la v1.0 réellement livrée
2. auditer modèle ↔ UI ↔ exports
3. finaliser les settings réellement branchés
4. clarifier identité / update PWA
5. ajouter l’import global de tous les projets
6. ajouter preview `étape active` vs `export complet`
