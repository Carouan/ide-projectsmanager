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
- synchronisation réelle non encore active
- comportement PWA sur Android à clarifier

### Encore manquant

- export / import de tous les projets
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

## Repères historiques récents

Merges récents confirmés dans le dépôt :

- 2026-03-31 : refactor écrans, settings, i18n, preview Markdown
- 2026-04-01 : attachments, profil utilisateur local
- 2026-04-02 : repository layer, IndexedDB, sync metadata, sync engine skeleton, conflict detection, sync status badge, workflow de seed d’issues GitHub

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

La suite logique du projet consiste à :

1. stabiliser la documentation dans le dépôt
2. seed de petits lots d’issues versionnés
3. continuer à travailler par PR atomiques
4. réserver la wiki GitHub comme miroir éventuel, pas comme source principale
