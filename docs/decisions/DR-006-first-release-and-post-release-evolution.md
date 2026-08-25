# DR-006 — Première release et évolution après la version 1.0

- **État** : accepté.
- **Date** : 25 août 2026.
- **Portée** : produit, documentation, sauvegardes, intégration de projets et
  interface utilisateur.

## Décision de release

La première version distribuée de l'application est **`1.0.0`** et son tag
GitHub est **`v1.0.0`**. Ces identifiants concernent le logiciel distribué et
ne doivent jamais être confondus avec les étapes méthodologiques d'un projet,
présentées sous la forme **`v.0.0` à `v.1.0`**.

Le périmètre `1.0.0` comprend le portefeuille local-first, les projets et
chantiers, l'avancement explicable, la consultation facultative de GitHub, les
sauvegardes JSON, les instantanés locaux par appareil, les thèmes, les réglages
d'accessibilité essentiels, la documentation et une archive de déploiement.

La sélection d'un dossier et l'écriture d'un instantané ont été confirmées par
l'utilisateur sous Windows et Android. Le test d'un autre navigateur, la
restauration entre deux appareils physiques et les transports de fichiers sont
explicitement reportés : ils ne doivent être ni inventés, ni présentés comme
conditions bloquantes de cette première release.

## État réel des instantanés et conflits

Un instantané représente le **portefeuille complet** d'un appareil. La version
actuelle compare son identifiant, sa filiation, son appareil, sa date et les
projets affectés. Elle distingue un état identique, descendant, antérieur,
divergent, inconnu ou illisible.

Il n'existe actuellement **aucune fusion automatique champ par champ** :

| Situation | Comportement actuel | Évolution visée |
|---|---|---|
| Projet présent sur un seul appareil | Visible dans l'aperçu de restauration. | Proposer son ajout sans écraser le reste. |
| Même projet modifié sur un seul appareil | Restauration globale ou import comme copie. | Proposer la version modifiée si sa filiation est prouvée. |
| Même projet modifié sur les deux appareils | Divergence visible ; aucune application automatique. | Présenter les différences et demander une décision explicite. |
| Projet supprimé d'un côté | Impact indiqué dans une restauration globale. | Introduire une preuve de suppression et une validation humaine. |
| Backlog, journal ou décisions modifiés | Inclus dans l'instantané complet. | Réconcilier les éléments par identifiant stable lorsque c'est sûr. |
| Instantané corrompu ou filiation inconnue | Bloquer l'application silencieuse. | Conserver cette protection. |

La politique retenue est : **analyser d'abord, expliquer les différences,
proposer une décision, ne jamais écraser silencieusement**.

## Axe A — Réconciliation et transport entre appareils

L'ordre de progression retenu est :

1. définir une réconciliation indépendante du mode de transport ;
2. utiliser les mécanismes de partage natifs déjà disponibles sous Windows et
   Android ;
3. proposer, si utile, un relais Raspberry Pi ou WebDAV facultatif ;
4. explorer l'appairage direct par QR code et WebRTC ;
5. envisager ensuite des connecteurs facultatifs Google Drive, OneDrive ou
   d'autres fournisseurs.

L'IDE ne promet pas qu'un dossier local apparaît sur un autre appareil sans
copie, partage ou transport réel. IndexedDB reste la source de travail locale ;
les transports n'acquièrent jamais le droit d'écraser un projet sans décision.

### Format de sauvegarde

Le **JSON versionné reste le format normal** tant qu'il transporte correctement
les projets et références textuelles. Une extension `.ipm` n'est pertinente
que lorsque de vraies pièces jointes binaires doivent voyager avec le projet.

Si ce besoin apparaît, `.ipm` désignera un **conteneur ZIP ouvert et
documenté**, contenant par exemple `manifest.json`, `project.json` et un
dossier `attachments/`. Il ne s'agit ni d'un format de compression propriétaire,
ni d'une condition de la première release.

## Axe B — Méthode projet et intégration de dépôts existants

Le premier importateur de projet devra :

1. accepter l'URL d'un dépôt GitHub public ;
2. lire son README, sa roadmap éventuelle, sa structure et ses indices publics ;
3. distinguer les faits observés des hypothèses de classement ;
4. proposer étapes, chantiers, objectifs et progression dans une prévisualisation ;
5. laisser l'utilisateur corriger ou refuser la proposition ;
6. créer uniquement un projet local après validation explicite.

Le dépôt source reste **strictement en lecture seule**. Les projets pilotes
sont complémentaires :

- **UFI** sert de cas de cadrage et de structuration d'une idée à formaliser.
- **[SetUpMyPi — SUMP](https://github.com/Carouan/SetUpMyPi---SUMP)** sert de
  cas de projet existant déjà avancé : son README contient 27 cases imbriquées,
  dont 21 cochées. Une lecture naïve donnerait 78 % ; le comptage des seuls
  objectifs feuilles produit **16 objectifs terminés sur 21, soit 76 %** avant
  toute correction humaine. Comme ce README ne possède pas de section roadmap
  explicite, cette estimation doit être présentée comme une proposition et non
  comme une progression officielle.

Les évolutions méthodologiques comprennent ensuite des parcours adaptés à la
complexité, des profils logiciel/scientifique/associatif/personnel et des
cycles de projet au-delà de `v.1.0`.

## Axe C — Interface, confort et personnalisation

Les thèmes système/clair/sombre, la taille du texte, le contraste, la réduction
des animations et la navigation clavier appartiennent au socle `1.0.0`.

Les prochaines évolutions restent graduelles : densité de lecture, placement
contrôlé des panneaux, redimensionnement, préférences de disposition et,
éventuellement, lecture vocale. La liberté de disposition ne doit pas
compromettre l'accessibilité ou le fonctionnement mobile.

## Autorité documentaire

`README.md`, `ROADMAP.md` et `/docs` constituent les sources de vérité
versionnées et relues dans les pull requests. Le wiki GitHub peut publier une
vue utilisateur simplifiée, mais ne doit pas devenir une seconde documentation
contradictoire. Les pages publiées doivent renvoyer vers leurs documents
canoniques.

## Références

- [Roadmap produit et périmètre mesuré](../../ROADMAP.md)
- [Roadmap détaillée après la version 1.0](../roadmaps/post-v1-evolution-roadmap.md)
- [Guide et matrice des sauvegardes](../portable-backup-user-guide.md)
- [DR-002 — Sauvegardes local-first](DR-002-local-first-syncthing-backup-architecture.md)
- [DR-003 — Étapes et chantiers](DR-003-stages-workstreams-project-model.md)
- [DR-004 — Progression mesurable](DR-004-measurable-roadmap-effective-progress.md)
