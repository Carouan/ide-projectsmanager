# A1 — Historique, cadrage et roadmap

Ce document sert de mémoire projet côté vision, arbitrages, historique et roadmap.

## Problème initial

L’outil vise à éviter qu’un projet personnel dérive en notes éparses, idées non triées, pivots techniques non documentés, et reprises difficiles après interruption.

L’application doit permettre de :

- cadrer un projet par étapes versionnées `v0.0 → v1.0`
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

### Partiellement réalisé

- thème personnalisable présent mais incomplètement branché
- arbre de décision présent mais encore à mieux cadrer fonctionnellement
- synchronisation personnelle réelle non encore active ; le transport par
  instantanés de dossier est décidé mais pas implémenté
- comportement PWA sur Android à clarifier

### Encore manquant à court terme

- fournisseur de sauvegarde portable
- accès facultatif à un dossier choisi par l'utilisateur
- instantanés propres à chaque appareil
- détection d'une sauvegarde plus récente et des divergences
- guide et tests des modes de sauvegarde sous Windows et Android
- chemin de travail par défaut / nominal
- switch preview étape vs export complet
- désactivation par défaut de la preview sur mobile
- continuité post-`v1.0` via cycle lié ou sous-projet
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
[DR-004](../decisions/DR-004-measurable-roadmap-effective-progress.md) et la
[roadmap de sauvegarde portable](../roadmaps/local-first-syncthing-roadmap.md) :

1. conserver IndexedDB et la restauration JSON sûre déjà disponibles ;
2. expliquer l'avancement avec priorité manuel / roadmap / étape (#105) ;
3. conserver le dashboard filtrable et la progression cohérente livrés (#93) ;
4. conserver l'interface, le backlog lié et la matrice des chantiers (#95) ;
5. conserver le fournisseur de sauvegarde portable interchangeable livré (#82) ;
6. proposer facultativement un dossier et des instantanés par appareil (#83, #84) ;
7. détecter explicitement les restaurations et divergences (#85) ;
8. valider Windows, Android et les transports facultatifs (#86) ;
9. traiter séparément projets gouvernés et accès aux dépôts privés (#68, #69) ;
10. reporter `.ipm`, binaires et explorations directes après stabilisation.

## Audit historique de l'aide utilisateur

La première implémentation complète contenait déjà une capture guidée des
nouvelles idées. Elle ne contenait toutefois aucun guide de remplissage des
étapes : les champs objectif, notes, livrable et définition de fini étaient
présentés sans explication ni exemple. Le glossaire ajouté en avril 2026 a servi
d'onboarding documentaire, sans être intégré à l'interface.

Les issues #90 et #91 doivent donc restaurer l'intention de guidage sans
prétendre réactiver une interface qui aurait déjà existé.

Le travail continue par petites issues et PR atomiques. La documentation du
dépôt reste la source maîtresse ; la wiki GitHub demeure un miroir éventuel.
