# DR-004 — Roadmap mesurable et progression effective explicable

- **Statut** : accepté.
- **Date** : 2026-08-24.
- **Décideur produit** : responsable du projet.
- **Portée** : roadmap produit, lecture GitHub et affichage de l'avancement.

## Contexte

La décision précédente distinguait correctement une estimation métier
volontaire de la santé d'un dépôt et des étapes méthodologiques. Son application
stricte laissait cependant tous les projets historiques sur « Non déclarée »,
même lorsque leur journal, leur étape ou une roadmap versionnée fournissaient un
repère explicite. Le responsable produit demande désormais un avancement utile
par défaut, sans transformer une estimation automatique en vérité persistée.

## Décision

Le produit conserve deux notions différentes :

1. **Progression déclarée** : `project.progressPercent`, facultative, choisie
   consciemment et stockée dans le document du projet.
2. **Progression effective** : vue dérivée, recalculable et non persistée,
   affichée avec sa source.

La priorité de la vue effective est toujours :

1. valeur manuelle valide, y compris `0 %` ;
2. objectifs explicites d'une roadmap GitHub liée ;
3. estimation depuis l'étape `v.0.0 → v.1.0` ;
4. indisponible si aucune de ces sources n'existe.

Une estimation issue de `v.0.4` signifie « position dans le parcours : 40 % » ;
elle ne prétend pas prouver que 40 % du travail réel est accompli. Une roadmap
mesurable est donc préférée dès qu'elle est disponible.

## Contrat de roadmap

Le fichier canonique est [`ROADMAP.md`](../../ROADMAP.md). Pour un autre dépôt,
l'adaptateur essaie d'abord le fichier homonyme, puis une section explicitement
nommée « Roadmap » ou « Feuille de route » dans son `README.md`.

Le calcul ne retient que :

- des cases Markdown `- [ ]` ou `- [x]` ;
- les objectifs feuilles lorsqu'une case possède des sous-objectifs ;
- un poids facultatif déclaré par `<!-- weight:N -->` ;
- les lignes situées hors des blocs de code ;
- une portée explicite `<!-- roadmap-progress:start -->` /
  `<!-- roadmap-progress:end -->` lorsqu'elle est présente.

Le résultat expose le nombre terminé/total, les poids, le chemin du document,
son lien et l'état frais ou périmé du snapshot. Les commits, contrôles, PR et
issues non rattachées à des objectifs ne servent jamais à inventer un chiffre.

## Autorité et compatibilité

- IndexedDB reste le stockage de travail des projets.
- Les faits GitHub restent dans le cache de snapshots, pas dans `ProjectDocument`.
- Une roadmap indisponible ne bloque jamais un projet local ou la PWA.
- Une valeur calculée ne remplace jamais silencieusement la saisie manuelle.
- Les anciennes mentions Sites reconnues ne sont reprises qu'après aperçu et
  confirmation explicites.
- Progression, santé du dépôt et attention humaine restent des signaux séparés.

## Conséquences sur les décisions antérieures

DR-004 précise DR-001 et remplace uniquement l'interdiction de toute estimation
automatique inscrite dans DR-003 et #92. Elle ne modifie ni le modèle
étapes × chantiers, ni la gouvernance des dépôts, ni les exclusions
multi-utilisateur, ni la stratégie de sauvegarde autonome.

## Séquencement

L'issue #105 précède #93 afin que les futurs filtres et tris utilisent un
avancement explicable. Les chantiers (#94, #95), sauvegardes portables
(#82–#86), projets gouvernés (#68) et dépôts privés (#69) conservent leurs
issues et leurs pull requests indépendantes.
