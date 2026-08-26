# Historique — seed initial des issues GitHub

Ce dossier archive les fichiers qui ont servi au **premier seed local** des issues GitHub avant l’introduction du workflow GitHub Actions manuel.

## Pourquoi conserver ces fichiers

Ils documentent le cheminement réel du projet :

- premier script local exécuté depuis PowerShell sur le laptop
- premier lot d’issues JSON ayant servi à structurer les PR atomiques
- transition vers une logique plus industrialisée dans le dépôt

## Important

Ces fichiers sont conservés comme **références historiques**.

La source officielle à utiliser maintenant est :

- `scripts/github/create_github_issues.ps1`
- `.github/workflows/seed-issues.yml`
- `scripts/github/issues.ide-projectsmanager.next-batch.json` et les futurs lots du même type
