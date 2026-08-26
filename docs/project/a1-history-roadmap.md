# A1 — Historique, cadrage et roadmap

Ce document sert de mémoire projet côté vision, arbitrages, historique et roadmap.

## Problème initial

L’outil vise à éviter qu’un projet personnel dérive en notes éparses, idées non triées, pivots techniques non documentés, et reprises difficiles après interruption.

L’application doit permettre de :

- cadrer un projet par étapes versionnées `v.0.0 → v.1.0`
- capturer les nouvelles idées sans casser le flux
- documenter backlog, journal, décisions et pièces jointes
- rouvrir un projet proprement plus tard
- exporter un état durable du projet

## Ce que le MVP devait démontrer

Le MVP ne désigne pas une maquette jetable. Ici, il vise à prouver que :

- un **ProjectDocument** peut être l’unité centrale
- une UI React locale suffit à l’éditer
- un projet peut être repris plus tard
- ce projet peut être exporté durablement
- on peut éviter d’introduire trop tôt backend, comptes réels et collaboration temps réel

## État réel du dépôt

Le dépôt a déjà dépassé le MVP initial.

### Clairement implémenté

- liste des projets
- navigation projet / paramètres / liste
- édition des métadonnées projet
- navigation multi-étapes
- backlog
- journal
- décisions
- import / export JSON du projet courant
- sauvegarde globale de tous les projets dans un bundle JSON versionné
- restauration globale avec aperçu et import sûr des conflits
- export Markdown
- preview Markdown du projet complet
- écran paramètres
- i18n FR / EN
- attachments v1
- profil utilisateur local
- `ownerId` sur les projets
- IndexedDB avec fallback
- métadonnées de sync
- squelette de sync + détection de conflit + badge UI
- base PWA
- liaison à un dépôt GitHub public, panneau de validation et inbox globale
- projet de démonstration facultatif relié au véritable dépôt IDE
- navigation focalisée, guides contextuels et présentation canonique `v.0.2`
- dates localisées en français et en anglais
- progression manuelle et avancement effectif depuis roadmap ou étape
- roadmap canonique structurée en releases et objectifs vérifiables
- dashboard en grille/liste, recherche, filtres cumulables et tris persistants
- même progression effective dans l'inbox, les cartes et les fiches projet
- chantiers facultatifs, suggestions multi-domaines, gestion et archivage
- backlog filtrable et associable aux chantiers ainsi qu'aux étapes
- matrice étapes × chantiers, synthèse et cartes adaptées au mobile
- frontière de sauvegarde portable et repli manuel JSON indépendant du transport
- dossier choisi explicitement, permissions expliquées et miroir JSON par appareil
- revue des sauvegardes externes, filiation, divergences et restauration confirmée
- création guidée de projets gouvernés et lecture privée GitHub limitée à la session
- tableau de bord élargi sur grands écrans sans pénaliser la navigation mobile
- thèmes système, sombre et clair appliqués et mémorisés
- taille de texte, contraste, réduction des animations et navigation clavier
- lint global, tests automatisés et compilation de production exécutables

### Partiellement réalisé

- arbre de décision présent mais encore à mieux cadrer fonctionnellement
- continuité entre appareils : instantanés locaux implémentés, mais aucun
  transport partagé ni rapprochement automatique champ par champ
- choix du dossier validé physiquement sous Windows et Android ; autres
  navigateurs et restauration physique entre appareils reportés

### Encore manquant à court terme

- publication de la première release `v1.0.0` et de son archive statique
- publication du wiki utilisateur dérivé de la documentation versionnée
- partage natif facultatif et réconciliation sûre des projets divergents
- intégration progressive de projets existants : pilotes UFI et SUMP
- parcours adaptatifs et organisation post-`v.1.0` des projets suivis
- chemin de travail par défaut / nominal
- switch preview étape vs export complet
- désactivation par défaut de la preview sur mobile
- continuité post-`v.1.0` via cycle lié ou sous-projet
- splash screen
- édition bidirectionnelle preview ↔ formulaire
- formats d’édition / export supplémentaires
- niveaux de complexité de l’outil
- adaptation hors ICT
- widgets spécialisés par étape

### Explicitement hors roadmap prévisible

- comptes applicatifs distants
- invitations et collaboration multi-utilisateur
- rôles et permissions par projet ou par phase
- édition collaborative temps réel

## Repères historiques récents

Merges récents confirmés dans le dépôt :

- 2026-03-31 : refactor écrans, settings, i18n, preview Markdown
- 2026-04-01 : attachments, profil utilisateur local
- 2026-04-02 : repository layer, IndexedDB, sync metadata, sync engine skeleton, conflict detection, sync status badge, workflow de seed d’issues GitHub
- 2026-08-20 : dashboard et suivi GitHub/Project Steward intégrés, export global
  livré, choix d'IndexedDB comme stockage de travail et d'un miroir
  d'instantanés portable
- 2026-08-21 : Syncthing replacé parmi les transports facultatifs ; parcours
  autonome sans installation confirmé ; modèle professionnel phases ×
  chantiers adopté
- 2026-08-24 : progression effective priorisée manuelle / roadmap / étape ;
  roadmap produit mesurable et jalons de release documentés
- 2026-08-24 : cockpit portefeuille filtrable ; avancement GitHub harmonisé
  entre l'inbox globale, la collection et les projets ouverts
- 2026-08-24 : modèle de chantiers compatibles avec l'historique ; exemples
  logiciels, scientifiques, associatifs et personnels
- 2026-08-24 : interface complète des chantiers ; prochaine action recommandée,
  backlog associé et matrice responsive étapes × chantiers
- 2026-08-24 : fournisseur de sauvegarde portable abstrait ; capacités,
  permissions, erreurs et repli téléchargement/import JSON normalisés
- 2026-08-25 : dossiers et instantanés propres à chaque appareil, revue des
  différences, projets gouvernés et lecture GitHub privée livrés
- 2026-08-25 : sélection de dossier et écriture réellement confirmées sous
  Windows et Android ; transport entre appareils et autre navigateur reportés
- 2026-08-25 : dashboard élargi, lint assaini, thèmes système/sombre/clair et
  préférences d'accessibilité livrés avant la première release

## Arborescence de travail locale recommandée

Structure recommandée côté utilisateur :

- `01_imports/json`
- `02_exports/json`
- `03_exports/markdown`
- `04_attachments`
- `05_backups`
- `06_templates`
- `07_archives`

## Direction recommandée

La [roadmap produit canonique](../../ROADMAP.md) est la source mesurable des
objectifs livrés et ouverts. La suite logique du produit est définie par
[DR-002](../decisions/DR-002-local-first-syncthing-backup-architecture.md),
[DR-003](../decisions/DR-003-stages-workstreams-project-model.md),
[DR-004](../decisions/DR-004-measurable-roadmap-effective-progress.md),
[DR-006](../decisions/DR-006-first-release-and-post-release-evolution.md) et la
[roadmap détaillée après la v1.0](../roadmaps/post-v1-evolution-roadmap.md) :

1. conserver IndexedDB, les sauvegardes JSON et les garanties anti-écrasement ;
2. publier la documentation utilisateur, le wiki et la release `v1.0.0` ;
3. axe A : réconciliation sûre, partage natif puis transports facultatifs ;
4. axe B : import GitHub lu et validé humainement, pilotes UFI et SUMP ;
5. axe C : personnalisation progressive, densité et disposition des panneaux ;
6. reprendre plus tard les validations physiques reportées de l'issue #86 ;
7. n'étudier un conteneur ZIP documenté `.ipm` qu'en présence d'un besoin réel.

## Audit historique de l'aide utilisateur

La première implémentation complète contenait déjà une capture guidée des
nouvelles idées. Elle ne contenait toutefois aucun guide de remplissage des
étapes : les champs objectif, notes, livrable et définition de fini étaient
présentés sans explication ni exemple. Le glossaire ajouté en avril 2026 a servi
d'onboarding documentaire, sans être intégré à l'interface.

Les issues #90 et #91 doivent donc restaurer l'intention de guidage sans
prétendre réactiver une interface qui aurait déjà existé.

Le travail continue par petites issues et PR atomiques. La documentation du
dépôt reste la source maîtresse ; le wiki GitHub en constitue le miroir destiné
aux utilisateurs.
