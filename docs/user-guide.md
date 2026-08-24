# Guide utilisateur

Ce guide explique comment utiliser IDE-projectsmanager sans imposer une méthode
réservée aux projets informatiques. L'application fonctionne localement dans le
navigateur et organise les informations en plusieurs espaces complémentaires.

## Commencer un projet

1. Créer un projet et lui donner un titre explicite.
2. Résumer en quelques phrases le besoin et le résultat recherché.
3. Ouvrir l'onglet **Étapes** et commencer par `v.0.0`.
4. Utiliser le backlog pour les actions futures, le journal pour conserver le
   contexte et les décisions pour les arbitrages importants.
5. Effectuer régulièrement un export JSON de sauvegarde.

Le bouton **Nouvelle idée** sert à classer une idée apparue pendant un projet.
Il ne crée pas automatiquement un autre projet et ne remplace pas le guide.

## Comprendre et ajuster l'avancement

Le tableau de bord et l'onglet **Projet** affichent un pourcentage accompagné de
son origine :

1. une **progression déclarée manuellement** reste prioritaire ;
2. sinon, une **roadmap GitHub mesurable** compte les objectifs terminés ;
3. sinon, l'**étape du projet** fournit une estimation : `v.0.2` correspond à
   `20 %`, `v.0.7` à `70 %` et `v.1.0` à `100 %`.

Dans les métadonnées, renseigner une valeur entre 0 et 100 permet de corriger
l'estimation. Effacer cette valeur réactive le choix automatique. Une roadmap
périmée est signalée et ne remplace jamais les données enregistrées du projet.

Si un ancien journal contient une mention connue comme
`Progression déclarée : 20 %.` ou
`Progression déclarée dans Sites : 20 %.`, un aperçu propose de récupérer cette
valeur. Rien n'est appliqué sans confirmation et une valeur déjà renseignée
n'est jamais remplacée.

## Comprendre les étapes

Une étape décrit d'abord la **maturité globale** du projet. Sa position ne sert
que d'estimation de repli lorsqu'aucune valeur manuelle ni roadmap mesurable
n'est disponible. Une étape future peut être ouverte dès qu'elle devient utile ;
le parcours n'est pas une contrainte rigide.

| Étape | Intention principale | Preuve de sortie possible |
|---|---|---|
| `v.0.0` | Clarifier le besoin réel | Problème, personnes concernées et résultat attendu |
| `v.0.1` | Explorer le contexte et les options | Sources, constats et hypothèses à vérifier |
| `v.0.2` | Définir le périmètre utile | Résultat minimal, priorités et exclusions |
| `v.0.3` | Préparer l'approche | Plan, ressources, dépendances et risques |
| `v.0.4` | Assembler les éléments | Premier ensemble cohérent et testable |
| `v.0.5` | Tester une première version | Observations issues d'un usage contrôlé |
| `v.0.6` | Corriger les défauts bloquants | Problèmes prioritaires corrigés et revérifiés |
| `v.0.7` | Tester en conditions plus réalistes | Retours d'une bêta limitée |
| `v.0.8` | Stabiliser après les retours | Défauts traités et documentation à jour |
| `v.0.9` | Réaliser la validation finale | Recette, approbation et plan de lancement |
| `v.1.0` | Livrer et organiser la continuité | Résultat disponible, suivi et maintenance définis |

## Remplir une étape

- **Objectif** : le résultat précis recherché pendant cette étape.
- **Notes** : les faits, contraintes, idées et éléments de réflexion utiles.
- **Livrable attendu** : une preuve observable, comme un document, une décision,
  un prototype, un résultat ou une action terminée.
- **Definition of Done** : des critères vérifiables permettant de décider que
  l'étape peut être quittée.

Il n'est pas nécessaire de tout remplir immédiatement. Une formulation courte
et honnête vaut mieux qu'une réponse artificiellement complète.

## Choisir le bon espace

- **Projet** : identité, besoin et description générale.
- **Étapes** : maturité et livrables successifs.
- **Backlog** : actions, idées et questions à traiter plus tard.
- **Journal** : notes datées, contexte et traces de travail.
- **Décisions** : arbitrages qui doivent rester compréhensibles.
- **Pièces jointes** : documents liés au projet.
- **Dépôt et validations** : état GitHub lorsque le projet possède un dépôt.

## Sauvegarde et partage

L'export **JSON** est le format de sauvegarde machine-lisible à conserver.
L'export **Markdown** est une vue lisible destinée à la consultation ou au
partage. Le stockage actif reste local au navigateur tant qu'aucun mécanisme de
sauvegarde facultatif n'est configuré.
