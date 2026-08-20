# ide-projectsmanager

Outil local et PWA pour cadrer, suivre, enrichir et réouvrir des projets de manière structurée, sans perdre la souplesse de notes éditables ni la portabilité d’un fichier Markdown.

## Fonctionnalités actuelles

- gestion multi-projets
- étapes versionnées `v0.0 → v1.0`
- backlog
- journal de projet
- bloc décisions
- arbre de décision pour trier les nouvelles idées
- export JSON
- sauvegarde globale de tous les projets en JSON
- restauration globale avec aperçu et gestion explicite des conflits
- import JSON
- export Markdown
- PWA installable

## Données et sauvegarde

- IndexedDB reste le stockage de travail local de chaque appareil.
- L'export global produit un bundle JSON portable de tous les projets.
- La restauration analyse le bundle avant application et ne remplace jamais
  silencieusement un projet existant.
- La synchronisation personnelle visera ensuite un dossier facultatif contenant
  des instantanés propres à chaque appareil, synchronisable par Syncthing.
- L'import/export manuel restera disponible comme solution universelle.

La décision complète et l'ordre d'implémentation sont documentés dans
[DR-002](docs/decisions/DR-002-local-first-syncthing-backup-architecture.md) et
la [roadmap Syncthing](docs/roadmaps/local-first-syncthing-roadmap.md).

## Stack

- React
- Vite
- vite-plugin-pwa

## Développement local

```bash
npm install
npm run dev
```

Build
```bash
npm run build
npm run preview
```

Déploiement

Le dépôt est prévu pour être publié via GitHub Pages avec GitHub Actions.
