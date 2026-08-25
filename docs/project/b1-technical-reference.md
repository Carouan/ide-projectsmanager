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
- sauvegardes portables, miroir de dossier facultatif et revue des divergences
  déjà disponibles ; transport inter-appareils et extensions métier progressifs

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

### Tableau de bord du portefeuille

L'inbox d'attention et la collection de projets restent deux vues dérivées
distinctes. Elles partagent les snapshots de dépôt lus par `useAttentionInbox`,
ce qui garantit le même avancement effectif manuel / roadmap / étape sans
déclencher de lecture réseau supplémentaire pour les filtres ou les tris.

`projectDashboardModel.js` dérive des lignes locales et fournit la recherche,
les options de filtre et un ordre déterministe. La recherche couvre les
métadonnées, les tags, la catégorie et le dépôt ; les filtres combinent statut,
catégorie/tag, présence d'un dépôt et catégories d'attention humaine. Le tri
porte sur le titre, la dernière modification ou l'avancement effectif ; les
valeurs indisponibles sont toujours placées après les valeurs mesurables.

Les paramètres globaux `dashboardView`, `dashboardSortField` et
`dashboardSortDirection` sont normalisés avec des valeurs de repli et conservés
dans la persistance applicative existante. Les recherches et filtres temporaires
restent uniquement dans l'état React, sans migration du `ProjectDocument`.

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
- `workstreams` (facultatif, normalisé et compatible avec le schéma `1.0`)
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

### `workstreams` — modèle et interface compatibles livrés

Les étapes décrivent la maturité temporelle ; les chantiers décrivent les
fronts parallèles du projet. Un document existant sans collection est
normalisé vers `workstreams: []`, sans modifier sa version `1.0` ni supprimer
ses propriétés historiques.

Chaque chantier possède :

- `id` : identifiant stable ;
- `title` et `description` ;
- `status` : `planned`, `active`, `paused`, `blocked` ou `completed` ;
- `order` : ordre déterministe ;
- `archived` : archivage distinct de l'état métier ;
- `category`, `icon` et `color` : présentation facultative.

Les actions du backlog peuvent ajouter `workstreamId` et `stageKey`, sans
remplacer l'ancien `relatedStage`. Les références inconnues sont conservées,
diagnostiquées et rendues explicites dans l'export Markdown ; aucune dépendance
de tâche artificielle n'est ajoutée au modèle existant.

`projectWorkstreams.js` propose des modèles facultatifs localisés pour les
projets logiciels, scientifiques, associatifs et personnels. Un nouveau projet
reste vide ; seule la démonstration IDE, explicitement logicielle, présente
trois chantiers exemples. La progression du projet ne dépend pas du nombre de
chantiers.

`workstreamPlanningModel.js` dérive une synthèse locale sans mutation : actions
ouvertes, chantiers bloqués, prochain focus et cellules étapes × chantiers. Il
gère également l'ordre, l'archivage, la fusion non destructive des suggestions
et l'association backlog / chantier / étape. Changer l'étape d'une action met à
jour `stageKey`, `relatedStage` et `linkedBacklogIds` de manière cohérente.

L'onglet **Chantiers** expose les suggestions, le formulaire de gestion, une
synthèse explicable, les cartes de chaque front et la matrice compacte. Le
backlog fournit un filtre ainsi que des sélecteurs facultatifs par action. Sur
mobile, seules les cellules réellement occupées sont présentées sous forme de
cartes. Aucune progression artificielle ni dépendance entre tâches n'est créée.

[DR-003](../decisions/DR-003-stages-workstreams-project-model.md) fixe le cadre
du modèle ; les issues #94 et #95 livrent respectivement les données et
l'interface associée.

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

### Frontière de sauvegarde portable

L'issue #82 introduit une frontière distincte dans
`src/repositories/portableBackup/`. Elle n'est reliée ni au repository
IndexedDB ni aux fournisseurs de lecture des dépôts GitHub.

Un fournisseur de sauvegarde possède un identifiant stable, une inspection et
jusqu'à trois opérations :

- `writeSnapshot` : écrire un bundle global existant ;
- `listSnapshots` : retourner les références d'instantanés connus ;
- `readSnapshot` : relire un bundle à partir d'une référence.

L'inspection expose explicitement :

- disponibilité : `available` ou `unavailable` ;
- permission : `granted`, `prompt`, `denied` ou `unknown` ;
- capacités réelles : `write`, `list` et `read` ;
- motif d'indisponibilité et erreur normalisée.

`portableBackupService.js` contrôle ces états avant chaque opération. Une
permission manquante, un adaptateur indisponible, une opération non prise en
charge ou une réponse invalide ne devient jamais silencieusement un résultat
vide. L'erreur conserve l'identifiant du fournisseur, l'opération et le repli
manuel disponible.

`manualDownloadBackupProvider.js` est le premier adaptateur. Il réutilise sans
les modifier le bundle global JSON v1, le téléchargement et la lecture d'un
fichier choisi. Il sait écrire et lire, mais ne prétend pas pouvoir lister les
fichiers téléchargés par le navigateur. Les boutons de sauvegarde et de
restauration existants passent désormais par ce contrat.

Historiquement, l'issue #82 seule n'ajoutait pas `showDirectoryPicker` ni de
handle persistant. Les incréments #83, #84 et #85 ont ensuite livré le dossier
choisi, l'instantané propre à chaque appareil et la revue explicite des
différences. Aucun transport Syncthing, cloud ou réseau n'est intégré.

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
- vues grille/liste, recherche, filtres portefeuille et tri déterministe
- progression cohérente dans les cartes d'attention et de projet
- chantiers facultatifs, suggestions multi-domaines et références backlog/étape
- exports JSON/Markdown compatibles et diagnostic des références inconnues
- fournisseur de sauvegarde portable indépendant avec repli JSON manuel
- accès explicite au dossier, permissions détaillées et handle IndexedDB
- instantanés versionnés par appareil et comparaison de leur filiation
- revue des différences, import comme copies et restauration confirmée
- projets gouvernés et consultation privée GitHub limitée à la session

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
- persistance locale de la vue et du tri du tableau de bord
- thèmes système, sombre et clair appliqués et mémorisés
- taille de texte, contraste renforcé et réduction des animations
- lien d'évitement clavier et focus visible

Encore incomplet :

- densité UI réellement exploitée
- formats d’export multiples réellement branchés
- chemins par défaut import / export / attachments
- positionnement et redimensionnement persistants des panneaux

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
- dossiers choisis, instantanés distincts et comparaison de leur filiation
- revue explicite des projets ajoutés, remplacés ou absents
- import comme copies et restauration complète après confirmation

Non fait :

- push réel distant
- pull réel distant
- politique de fusion avancée
- fusion automatique champ par champ ou réconciliation fine des projets
- stockage / transport distant réel
- partage natif intégré, relais Pi/WebDAV, QR/WebRTC et fournisseurs cloud

## Limites connues

- comportement de mise à jour / réinstallation PWA à approfondir sur Android
- besoin d’un switch `stage preview` ↔ `full export`
- densité, formats d'export additionnels et placement libre non encore branchés
- choix du dossier et écriture confirmés sous Windows et Android ; renouvellement
  des permissions et essai d'un autre navigateur reportés
- aucun transport partagé configuré entre les appareils pour le moment
- gestion de vrais fichiers binaires pour attachments non encore traitée

## Roadmap technique courte recommandée

1. publier le wiki, l'identité applicative `1.0.0` et l'archive de release ;
2. axe A : réconciliation sûre puis transport partagé facultatif ;
3. axe B : import GitHub lu et validé, pilotes UFI et SUMP ;
4. axe C : préférences avancées, densité et placement des panneaux ;
5. reprendre séparément les validations matérielles reportées (`#86`) ;
6. ne traiter `.ipm` et les binaires qu'en cas de besoin documenté.

Les migrations de modèle restent séparées des PR d'interface. Chaque incrément
doit préserver les projets et bundles existants.
