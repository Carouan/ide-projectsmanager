# DR-007 — Réconciliation sûre des projets entre instantanés

- **État** : accepté.
- **Date** : 25 août 2026.
- **Portée** : sauvegardes personnelles, comparaison et décisions utilisateur.

## Contexte

Un instantané contient un portefeuille complet. Deux appareils peuvent créer,
modifier ou supprimer des projets indépendamment. Une date plus récente ne
prouve pas qu'une version doit remplacer l'autre, et deux instantanés issus
d'un même parent peuvent avoir divergé.

## Décision

Comparer les projets par **identifiant stable**, sans modifier le format JSON,
sans dépendre du mode de transport et sans appliquer automatiquement la
moindre modification.

Une comparaison à trois versions n'est autorisée que si un **ancêtre commun
vérifiable** est effectivement disponible parmi les instantanés connus. Son
identifiant doit apparaître dans les filiations des deux branches.

### États produits

- projet identique ;
- ajout vérifié sur un seul appareil ;
- suppression vérifiée sur un seul appareil ;
- modification unilatérale vérifiée ;
- modifications indépendantes sur des champs distincts ;
- conflit réel sur le même champ ;
- différences ou présence sur un seul appareil sans ancêtre vérifié.

En l'absence de preuve, un projet absent n'est jamais assimilé silencieusement
à une suppression ou à un ajout. Les choix destructifs ne sont pas proposés
pour une disparition dont l'origine ne peut pas être établie.

### Champs et collections

La comparaison examine les champs métier, les étapes et les éléments identifiés
du backlog, du journal, des décisions, des chantiers et des pièces jointes.
Chaque changement indique sa provenance : local, appareil externe, changement
convergent, conflit ou origine non vérifiée.

Les éléments de collection sont rapprochés par identifiant plutôt que par leur
position. Le réordonnancement seul ne crée donc pas un conflit artificiel. Les
métadonnées locales `sync` et `project.updatedAt` ne sont pas traitées comme
des conflits métier.

### Application

Le premier incrément fournit uniquement un résultat de comparaison immuable :
il ne crée, ne remplace et ne supprime aucun projet. L'affichage utilisateur,
le choix projet par projet et l'éventuelle fusion de changements indépendants
feront l'objet d'issues séparées.

Une annulation ne doit jamais modifier les données locales. Toute suppression
et toute substitution d'un projet exigent une confirmation explicite.

## Références

- [DR-002 — Sauvegardes local-first](DR-002-local-first-syncthing-backup-architecture.md)
- [DR-006 — Première release et axes futurs](DR-006-first-release-and-post-release-evolution.md)
- [Roadmap post-v1](../roadmaps/post-v1-evolution-roadmap.md)
