# Documentation du dépôt

Cette documentation est conservée **dans le dépôt** comme source de vérité versionnée.

## Pourquoi dans le dépôt plutôt que dans la wiki GitHub

Pour ce projet, la documentation dans le dépôt est plus adaptée que la wiki GitHub :

- elle voyage dans les branches, PR et reviews
- elle reste synchronisée avec l'état réel du code
- elle peut être refactorisée par petits commits via Codex
- elle peut ensuite être publiée plus tard avec MkDocs, GitHub Pages ou un autre générateur si nécessaire

La wiki GitHub pourra éventuellement servir plus tard comme **miroir simplifié** ou espace de lecture, mais pas comme source principale de vérité documentaire.

## Structure

- `project/` : documentation structurante du produit et du workflow
- `history/` : archives utiles pour comprendre le cheminement du dépôt

## Entrées principales

- [A1 — Historique, cadrage et roadmap](project/a1-history-roadmap.md)
- [A2 — Complétion méthodologique](project/a2-methodological-completion.md)
- [B1 — Référence technique](project/b1-technical-reference.md)
- [B2 — Guide d’automatisation Codex–GitHub](project/b2-codex-github-automation-guide.md)
- [C — Glossaire et explications](project/c-glossary.md)
- [Releases, Deployments, Packages — différences exactes](project/github-release-deployment-package-differences.md)

## Issues GitHub seedées par workflow

Le dépôt contient un workflow manuel **Seed GitHub Issues** et un script officiel de seed :

- workflow : `.github/workflows/seed-issues.yml`
- script : `scripts/github/create_github_issues.ps1`

Le prochain lot prêt à l’emploi est conservé ici :

- `scripts/github/issues.ide-projectsmanager.next-batch.json`

### Procédure recommandée

1. Aller dans **Actions**
2. Ouvrir **Seed GitHub Issues**
3. Lancer d’abord avec `dry_run = true`
4. Vérifier les logs
5. Relancer avec `dry_run = false`
