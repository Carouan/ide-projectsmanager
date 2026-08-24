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
- `workstreams` (facultatif, planifié par #94)
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
- `progressPercent` (facultatif ; entier de 0 à 100, ou `null` si non déclaré)

Les anciens projets ne nécessitent aucune migration de schéma : une progression
absente ou invalide est normalisée vers `null` en conservant les autres champs.
Les variantes historiques connues `Progression déclarée : N %.` et
`Progression déclarée dans Sites : N %.` peuvent être prévisualisées puis
récupérées explicitement, sans remplacer une valeur déjà déclarée.

La progression **effective** n'ajoute aucun champ persisté. Elle est calculée à
l'affichage avec la priorité suivante : progression manuelle valide, roadmap
GitHub mesurable, puis position de l'étape. La source et les éventuelles données
GitHub périmées sont affichées explicitement. Voir
[DR-004](../decisions/DR-004-measurable-roadmap-effective-progress.md).

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

### `workstreams` — direction acceptée

Les étapes décrivent la maturité temporelle. Les futurs chantiers décriront les
fronts parallèles du projet. Ils resteront facultatifs et génériques : UI/UX et
backend ne sont que des exemples logiciels parmi des chantiers de recherche,
juridiques, financiers, opérationnels ou de communication.

[DR-003](../decisions/DR-003-stages-workstreams-project-model.md) fixe le modèle
conceptuel. #94 doit définir sa normalisation compatible, puis #95 son
interface et sa matrice étapes × chantiers. Aucune propriété décrite ici comme
planifiée ne doit être considérée comme déjà disponible dans les exports.

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
- fusion possible/conflits et statuts de commit lorsqu’ils sont disponibles ;
- objectifs feuilles cochés/non cochés de `ROADMAP.md`, ou d'une section
  roadmap explicite du README lorsqu'aucun fichier dédié n'est exploitable.

La roadmap peut délimiter ses objectifs avec les commentaires
`roadmap-progress:start` / `roadmap-progress:end` et attribuer un poids par
`<!-- weight:N -->`. Les groupes parents et exemples dans les blocs de code ne
sont pas comptés. Un document absent ou non mesurable laisse les autres
informations du dépôt disponibles et réactive le repli sur l'étape.

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
- Syncthing ou un autre outil peut transporter les fichiers sans être intégré
  comme base de données ;
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
- restauration du bundle global avec aperçu nouveaux/conflits
- import JSON
- export Markdown
- preview Markdown intégré
- attachments
- base PWA
- progression manuelle et progression effective expliquée
- lecture d'une roadmap GitHub mesurable avec cache
- parcours des étapes focalisé et guides utilisateur contextuels

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

La restauration d’un bundle complet préserve le comportement de l’import
unitaire existant. Elle valide le wrapper et sa version, rejette les identifiants
dupliqués dans le fichier, affiche le nombre de projets nouveaux et déjà
présents, puis demande une stratégie explicite : ignorer les conflits ou les
importer comme copies avec de nouveaux identifiants. Aucun remplacement
silencieux n'est proposé.

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
- transports facultatifs non encore comparés sous Windows et Android
- gestion de vrais fichiers binaires pour attachments non encore traitée
- dashboard limité à une grille fixe
- chantiers parallèles non représentés

## Roadmap technique courte recommandée

1. conserver les fonctionnalités livrées et la progression mesurable (`#105`)
2. enrichir les vues, filtres et tris du dashboard (`#93`)
3. ajouter le modèle puis l'interface des chantiers (`#94`, `#95`)
4. introduire le fournisseur et le miroir de sauvegarde (`S1.1`, `S1.2`)
5. écrire les instantanés et détecter les divergences (`S1.3`, `S1.4`)
6. comparer les modes autonomes et transports facultatifs (`S1.5`)
7. traiter `.ipm` et les pièces jointes binaires plus tard (`S2.1`)

Les migrations de modèle restent séparées des PR d'interface. Chaque incrément
doit préserver les projets et bundles existants.
