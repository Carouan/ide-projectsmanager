# Documentation — index et source de vérité

Cette arborescence est la **source documentaire versionnée du projet**. Ses
documents sont relus avec le code dans les issues, branches et pull requests.
Le wiki GitHub présente un parcours de lecture simplifié ; il ne remplace pas
les documents canoniques du dépôt.

## Lire selon son besoin

| Besoin | Document recommandé |
|---|---|
| Découvrir le produit et ses capacités réelles | [README principal](../README.md) |
| Suivre l'avancement de la release active | [Roadmap produit mesurable](../ROADMAP.md) |
| Utiliser l'application en français | [Guide utilisateur](user-guide.md) |
| Utiliser l'application en anglais | [User guide](user-guide.en.md) |
| Sauvegarder, restaurer ou comprendre les instantanés | [Guide des sauvegardes](portable-backup-user-guide.md) |
| Comprendre les choix structurants | [Décisions d'architecture](#decisions--pourquoi-ces-choix) |
| Connaître la suite après `1.0.0` | [Roadmap après la v1.0](roadmaps/post-v1-evolution-roadmap.md) |
| Comprendre un terme | [Glossaire](project/c-glossary.md) |

## `project/` — vision, méthode et références

- [A1 — Historique, cadrage et roadmap](project/a1-history-roadmap.md) : état
  du produit, arbitrages et repères chronologiques.
- [A2 — Complétion méthodologique](project/a2-methodological-completion.md) :
  livrables, critères de sortie et bonnes pratiques pour un projet logiciel.
- [B1 — Référence technique](project/b1-technical-reference.md) : architecture,
  `ProjectDocument`, stockage, GitHub, sauvegardes et limites connues.
- [B2 — Automatisation agent–GitHub](project/b2-codex-github-automation-guide.md) :
  méthode de travail et revues des pull requests.
- [C — Glossaire](project/c-glossary.md) : vocabulaire métier et technique.
- [Release, déploiement et package](project/github-release-deployment-package-differences.md) :
  différences entre version publiée, GitHub Pages et archive distribuée.

## `decisions/` — pourquoi ces choix

- [DR-001 — Cockpit, dépôts et Project Steward](decisions/DR-001-cockpit-repository-project-steward-architecture.md).
- [DR-002 — Stockage local-first et sauvegardes portables](decisions/DR-002-local-first-syncthing-backup-architecture.md).
- [DR-003 — Étapes et chantiers parallèles](decisions/DR-003-stages-workstreams-project-model.md).
- [DR-004 — Roadmap mesurable et progression effective](decisions/DR-004-measurable-roadmap-effective-progress.md).
- [DR-005 — Lecture privée GitHub limitée à la session](decisions/DR-005-private-github-session-read-access.md).
- [DR-006 — Première release et évolution après la v1.0](decisions/DR-006-first-release-and-post-release-evolution.md).

Une décision acceptée explique son contexte, ses limites et les solutions
écartées. Elle ne doit pas annoncer comme livrée une capacité seulement prévue.

## `roadmaps/` — séquences détaillées

- [Sauvegarde autonome et transports facultatifs](roadmaps/local-first-syncthing-roadmap.md) :
  historique des lots R1/S1, preuves d'implémentation et validations différées.
- [Évolutions après la version 1.0](roadmaps/post-v1-evolution-roadmap.md) :
  réconciliation et transport, compréhension de projets UFI/SUMP, méthode,
  personnalisation et accessibilité future.

Seul le périmètre explicitement délimité dans `ROADMAP.md` détermine le
pourcentage de la release en cours. Les objectifs futurs restent visibles sans
diminuer artificiellement ce pourcentage.

## `contracts/` — échanges et compatibilité

- [Contrat Dashboard–Project Steward v1](contracts/project-steward-dashboard-contract-v1.md).
- [Conventions d'origine et d'attention humaine](contracts/ai-origin-human-attention-conventions-v1.md).
- [Exemple `.project-steward.yml`](contracts/examples/project-steward-dashboard-v1.yml).
- [Exemples JSON machine-lisibles](contracts/examples/ai-origin-human-attention-v1.json).
- [Proposition pour `ai-project-template`](contracts/companion-issues/ai-project-template-attention-conventions.md).
- [Proposition pour `ai-project-steward`](contracts/companion-issues/ai-project-steward-attention-conventions.md).

Les fichiers `companion-issues/` documentent des propositions pour les dépôts
compagnons ; ils ne signifient pas qu'une modification y a déjà été appliquée.

## `history/` et documents de travail hérités

- [Historique du seed GitHub](history/github-issue-seeding/README.md) : archive
  des premiers scripts de création d'issues.
- [`codex-master-plan.md`](codex-master-plan.md) : plan historique volumineux,
  utile pour retrouver l'intention initiale mais non canonique pour la suite.
- [`ordered-issues-workflow.md`](ordered-issues-workflow.md) : séquence initiale
  des issues F0–U3 ; conservée comme historique, pas comme backlog actif.
- [`review-findings-backlog.md`](review-findings-backlog.md) : observations
  d'audits antérieurs ; chaque élément doit être revérifié avant réutilisation.

Pour une décision actuelle, consulter prioritairement `ROADMAP.md`, DR-006 et
la roadmap après `1.0.0` plutôt qu'un document de travail historique.

## Publication du wiki

Le wiki GitHub possède son propre dépôt Git, imposé par GitHub. Il est utilisé
comme **miroir utilisateur en français** : accueil, démarrage, progression,
chantiers, sauvegardes, thèmes/accessibilité et limites connues. Les références
techniques détaillées restent liées au dépôt principal.

## Création assistée d'issues GitHub

Le workflow manuel **Seed GitHub Issues** utilise :

- `.github/workflows/seed-issues.yml` ;
- `scripts/github/create_github_issues.ps1` ;
- `scripts/github/issues.ide-projectsmanager.next-batch.json`.

Lancer d'abord le workflow avec `dry_run = true`, contrôler le résultat, puis
utiliser `dry_run = false` uniquement pour le lot réellement validé.
