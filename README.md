# ide-projectsmanager

Outil local-first et PWA pour cadrer, suivre, enrichir et rouvrir des projets de
manière structurée, sans perdre la souplesse de notes éditables ni la portabilité
des exports JSON et Markdown.

## Fonctionnalités actuelles

- gestion multi-projets
- étapes versionnées `v.0.0 → v.1.0`, avec parcours focalisé et aide contextuelle
- backlog
- journal de projet
- bloc décisions
- arbre de décision pour trier les nouvelles idées
- pièces jointes et références textuelles
- export JSON
- sauvegarde globale de tous les projets en JSON
- restauration globale avec aperçu et gestion explicite des conflits
- import JSON
- export Markdown
- aperçu Markdown complet
- interface française et anglaise
- PWA installable
- lien facultatif vers un dépôt GitHub public, lu sans jeton ni écriture
- suivi des pull requests, de la santé du dépôt et des validations humaines
- inbox globale des décisions, blocages et validations réellement requis
- avancement explicable : valeur manuelle, roadmap mesurable ou étape du projet
- projet de démonstration facultatif relié au dépôt GitHub public de l'application

## Calcul de l'avancement

Le tableau de bord affiche toujours la meilleure source exploitable :

1. **Valeur manuelle** si un pourcentage a été explicitement renseigné.
2. **Roadmap GitHub** si le dépôt lié contient des objectifs cochés/non cochés.
3. **Étape du projet** en dernier recours : `v.0.2 → 20 %`, `v.0.7 → 70 %`.

Une valeur calculée ne modifie jamais les données enregistrées. La source, le
nombre d'objectifs terminés et un cache éventuellement périmé restent visibles.
La formule, la granularité et la pondération facultative sont décrites dans
[`ROADMAP.md`](ROADMAP.md) et dans
[DR-004](docs/decisions/DR-004-measurable-roadmap-effective-progress.md).

## Roadmap mesurable et releases

- [x] Cible `0.1.0` : socle local-first, PWA, projets, exports et restauration.
- [ ] Cible `0.2.0` : cockpit portefeuille, progression et chantiers parallèles.
- [ ] Cible `0.3.0` : sauvegardes portables et continuité Windows/Android.
- [ ] Cible `0.4.0` : gouvernance des projets liés et accès GitHub avancé.
- [ ] Horizon `1.0.0` : explorations ultérieures, `.ipm` et transports directs.

Les objectifs détaillés, leurs cases vérifiables et leurs issues associées sont
dans la [roadmap produit canonique](ROADMAP.md). Ces jalons organisent le
travail ; ils ne prétendent pas qu'une release GitHub ou un tag a déjà été créé.

## Données et sauvegarde

- IndexedDB reste le stockage de travail local de chaque appareil.
- L'export global produit un bundle JSON portable de tous les projets.
- La restauration analyse le bundle avant application et ne remplace jamais
  silencieusement un projet existant.
- L'import/export manuel reste le parcours universel, autonome et sans
  installation supplémentaire.
- Un dossier choisi pourra servir de miroir facultatif lorsque le navigateur le
  permet ; il ne se synchronise pas à lui seul.
- Syncthing ou un autre transport pourra synchroniser ce dossier, sans devenir
  une dépendance de l'application.

La décision complète et l'ordre d'implémentation sont documentés dans
[DR-002](docs/decisions/DR-002-local-first-syncthing-backup-architecture.md),
[DR-003](docs/decisions/DR-003-stages-workstreams-project-model.md) et la
[roadmap de sauvegarde portable](docs/roadmaps/local-first-syncthing-roadmap.md).

Les comptes applicatifs distants, la collaboration multi-utilisateur et un
service de synchronisation obligatoire ne font pas partie du périmètre retenu.

## Stack

- React
- Vite
- vite-plugin-pwa

## Développement local

```bash
npm install
npm run dev
npm test
```

Build
```bash
npm run build
npm run preview
```

Déploiement

Le dépôt est prévu pour être publié via GitHub Pages avec GitHub Actions.
