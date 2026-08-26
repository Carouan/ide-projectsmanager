# B2 — Guide d’automatisation Codex–GitHub

Ce document répond à la question : **comment faire évoluer proprement le dépôt avec un maximum d’automatisation raisonnable ?**

## Workflow cible

Chaîne d’automatisation visée :

1. définir un lot de travail dans un fichier JSON d’issues
2. injecter ce lot dans GitHub
3. traiter chaque issue individuellement avec Codex
4. produire une branche dédiée
5. ouvrir une PR petite, testable et réversible
6. merger seulement si le scope est clair, validé et documenté
7. garder le dépôt comme source de vérité des changements réellement livrés

## Pourquoi ce workflow existe

Il vise à éviter :

- la perte de vue d’ensemble
- les PR trop grosses
- les prompts Codex sans cadre stable
- les changements sans rollback explicite
- les dérives par rapport au besoin initial
- la casse du format des projets ou des imports / exports

## Source de vérité des tâches

Chaque entrée d’issue suit un format simple :

```json
{
  "title": "F1.1 - Introduce AppShell layout",
  "body": "## Objective\n...\n## Tasks\n...\n## Validation\n...\n## Rollback\n..."
}
```

Bonnes pratiques :

- un titre court et stable
- un objectif clair
- des tâches concrètes
- des contraintes explicites
- une section validation
- une section rollback
- pas de body flou ni narratif

## Script et workflow officiels

Le dépôt contient maintenant :

- `scripts/github/create_github_issues.ps1`
- `.github/workflows/seed-issues.yml`

Le workflow manuel **Seed GitHub Issues** permet de lancer le seed depuis l’onglet Actions sans dépendre d’un terminal local.

Inputs :

- `repo`
- `json_path`
- `dry_run`

## Cycle opératoire recommandé

### Préparer le lot

- écrire ou mettre à jour le fichier JSON d’issues
- vérifier titres, bodies et granularité
- s’assurer qu’une issue = un objectif unique

### Créer les issues

- lancer d’abord le workflow en `dry_run = true`
- lire les logs
- corriger si besoin
- relancer avec `dry_run = false`

### Traiter une issue avec Codex

- ouvrir le dépôt
- sélectionner une issue
- donner à Codex un prompt strict
- imposer une branche dédiée
- imposer une PR petite et documentée

### Valider et merger

- build OK
- scope respecté
- validation manuelle explicite
- rollback possible
- merge seulement si la PR reste lisible

## Règles impératives pour Codex

- une branche dédiée par PR
- une PR = un objectif unique
- ne pas mélanger refactor structurel et feature métier
- préserver le comportement existant sauf changement explicitement voulu
- build obligatoire avant proposition de PR
- ne jamais casser les imports / exports JSON
- toute migration de données doit être expliquée
- toute PR doit documenter risques, validation et rollback

## Politique de taille des PR

- viser petit
- refuser les PR monolithiques
- scinder si plusieurs thèmes apparaissent
- éviter les mélanges architecture + données + feature

## Prompt minimal réutilisable

```text
Analyze the repository and read AGENTS.md carefully.

Implement GitHub issue: "<ISSUE TITLE>".

Constraints:
- keep implementation minimal
- do not expand scope
- preserve existing behavior

Expected result:
- <3 bullets max>

If the current session is not write-enabled, stop immediately and say so clearly.
Otherwise:
- implement
- validate
- commit
- push
- create PR
```

## Conventions de nommage

### Branches

Formats recommandés :

- `feat/front-01-app-shell`
- `feat/front-02-settings-slice`
- `feat/front-03-i18n-core`
- `feat/front-04-markdown-preview`
- `feat/sync-01-user-profile`
- `feat/sync-02-storage-abstraction`

### Commits

Utiliser des **Conventional Commits** :

- `feat(front): add app shell layout`
- `feat(settings): persist ui settings`
- `feat(markdown): add right panel preview`
- `feat(sync): add project sync metadata`

## État actuel recommandé

Pour ce dépôt, la bonne pratique est maintenant :

- de considérer le script du repo comme version officielle
- d’archiver le vieux seed local comme historique
- d’ajouter les nouveaux lots dans `scripts/github/`
- d’utiliser GitHub Actions comme point d’entrée normal du seed d’issues
