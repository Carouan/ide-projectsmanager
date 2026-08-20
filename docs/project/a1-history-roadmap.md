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
- guide et tests Syncthing sous Windows et Android
- chemin de travail par défaut / nominal
- switch preview étape vs export complet
- désactivation par défaut de la preview sur mobile
- continuité post-`v1.0` via cycle lié ou sous-projet
- aides contextuelles
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
  livré, choix d'IndexedDB comme stockage de travail et de Syncthing comme
  synchroniseur externe d'un miroir d'instantanés portable

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

La suite logique du produit est définie par
[DR-002](../decisions/DR-002-local-first-syncthing-backup-architecture.md)
et la [roadmap Syncthing](../roadmaps/local-first-syncthing-roadmap.md) :

1. ajouter la restauration du bundle global
2. conserver IndexedDB comme stockage de travail local
3. ajouter un fournisseur de sauvegarde portable interchangeable
4. utiliser facultativement un dossier sélectionné comme miroir
5. laisser Syncthing synchroniser ce dossier hors de l'application
6. détecter explicitement les restaurations et divergences
7. reporter le format `.ipm` et les binaires après validation du flux JSON

Le travail continue par petites issues et PR atomiques. La documentation du
dépôt reste la source maîtresse ; la wiki GitHub demeure un miroir éventuel.
