# DR-003 — Modèle professionnel phases × chantiers

- **Statut** : accepté
- **Date** : 2026-08-21
- **Décideur produit** : responsable du projet
- **Portée** : structuration, planification et représentation de l'avancement

## Contexte

Les étapes `v0.0 → v1.0` décrivent la maturité globale d'un projet. Elles ne
représentent pas correctement les fronts qui avancent en parallèle. Un projet
logiciel peut travailler simultanément sur le produit, l'UI/UX, le frontend, le
backend, les données, les tests et le déploiement. Un projet non informatique
rencontre la même réalité avec d'autres domaines : recherche, juridique,
finances, opérations, communication ou partenariats.

Dans un cadre professionnel, ces fronts sont généralement appelés **chantiers**
ou *workstreams*. Ils traversent les phases du projet et convergent vers des
jalons communs.

## Décision

L'IDE représentera le projet selon deux dimensions indépendantes :

1. **les phases / étapes** indiquent où le projet se situe dans son cycle de
   maturité ;
2. **les chantiers / workstreams** indiquent sur quels domaines parallèles le
   travail porte.

Une tâche, un livrable, une décision, un risque ou une dépendance peut être lié
à une phase, à un chantier, aux deux, ou rester transversal.

## Vocabulaire du modèle

| Concept | Question traitée | Exemple |
|---|---|---|
| Phase / étape | Où en est le projet dans son cycle ? | Analyse, conception, beta |
| Chantier / workstream | Sur quel front travaille-t-on ? | UI/UX, juridique, recherche |
| Tâche | Quelle action faut-il exécuter ? | Tester le parcours d'import |
| Livrable | Quel résultat vérifiable doit exister ? | Prototype, rapport, procédure |
| Jalon | Quels résultats doivent converger ? | POC validé, lancement public |
| Dépendance | Qu'est-ce qui doit précéder autre chose ? | Schéma avant interface |
| Risque | Qu'est-ce qui menace le résultat ? | Permission navigateur instable |
| Décision | Quel arbitrage doit rester traçable ? | Stockage local-first |

Les étapes et les chantiers ne doivent pas être confondus. « Backend » n'est
pas une phase, et « Beta » n'est pas un chantier.

## Modèle minimal visé

Le futur `ProjectDocument` pourra ajouter une collection facultative
`workstreams` :

```json
{
  "workstreams": [
    {
      "id": "ws_ui_ux",
      "title": "UI/UX",
      "description": "Parcours, accessibilité et interface",
      "status": "active",
      "order": 10,
      "archived": false
    }
  ]
}
```

Les éléments du backlog pourront recevoir un `workstreamId` et un `stageKey`
facultatifs. Les projets historiques seront normalisés avec une collection vide.
Cette évolution nécessite une stratégie de compatibilité explicite dans #94.

## Représentation dans l'interface

La première interface doit rester simple :

- un onglet **Chantiers** pour créer, ordonner et archiver les axes ;
- une affectation facultative des éléments du backlog ;
- des filtres par chantier ;
- une matrice compacte **étapes × chantiers** pour la synthèse ;
- des cellules vides visuellement discrètes ;
- une vue mobile regroupée plutôt qu'un large tableau illisible.

La matrice est une vue de pilotage, pas un second éditeur complet. Les détails
restent dans les écrans de tâche, d'étape, de décision ou de livrable.

## Modèles suggérés, jamais imposés

L'IDE pourra proposer des chantiers de départ selon la nature du projet :

- **logiciel** : produit, UI/UX, frontend, backend, données, qualité,
  déploiement ;
- **recherche** : état de l'art, méthode, collecte, analyse, éthique,
  diffusion ;
- **association** : juridique, finances, opérations, communication,
  partenariats ;
- **projet personnel** : planification, achats, production, documentation.

Un projet peut rester sans chantier, utiliser une suggestion ou définir son
propre vocabulaire. Le noyau du produit ne devient donc pas un outil réservé à
l'informatique.

## Progression et état

La progression métier déclarée reste une valeur facultative saisie
consciemment. [DR-004](DR-004-measurable-roadmap-effective-progress.md)
introduit une **progression effective dérivée**, distincte et jamais écrite
automatiquement dans le projet : saisie manuelle prioritaire, puis roadmap
constituée d'objectifs vérifiables, puis estimation depuis l'étape actuelle.

Une étape `v.0.4` peut donc fournir un repli affiché à `40 %`, sans prétendre
que chaque phase, chantier ou tâche représente exactement la même quantité de
travail. Une roadmap mesurable est plus informative et prévaut lorsqu'elle
existe. Les commits, pull requests et chantiers non reliés à des objectifs ne
deviennent pas des preuves arbitraires d'avancement.

Les vues doivent continuer à séparer :

1. la progression métier du projet ;
2. l'état des phases et chantiers ;
3. la santé du dépôt ;
4. l'attention humaine requise.

## Conséquences

### Positives

- représentation fidèle du travail professionnel parallèle ;
- modèle applicable aux projets IT et non IT ;
- dépendances et responsabilités plus lisibles ;
- synthèse portefeuille plus utile ;
- conservation du cycle `v0.0 → v1.0` existant.

### Contraintes

- une dimension supplémentaire peut densifier l'interface ;
- les chantiers doivent rester facultatifs ;
- les migrations et exports demandent une compatibilité ascendante ;
- une matrice exhaustive serait inutilisable sur mobile ;
- la progression ne doit pas devenir un calcul opaque.

## Alternatives écartées

- **Une seule liste de tâches** : simple, mais ne montre ni maturité ni fronts
  parallèles.
- **Transformer chaque chantier en étape** : mélange temps et domaine et rend
  les dépendances incompréhensibles.
- **Imposer Scrum ou un modèle logiciel** : inadapté aux projets scientifiques,
  associatifs ou personnels.
- **Ajouter immédiatement un Gantt complet** : complexité prématurée avant la
  validation du modèle minimal.

## Plan d'implémentation

- #90 : réduire la densité de la navigation des étapes ;
- #91 : intégrer l'aide contextuelle ;
- #92 : structurer la progression déclarée ;
- #105 : rendre la roadmap mesurable et expliquer la progression effective ;
- #93 : enrichir les vues et tris du dashboard ;
- #94 : ajouter le modèle de chantiers ;
- #95 : ajouter l'interface et la matrice étapes × chantiers.

Chaque incrément conserve la règle une issue, une branche et une PR.
