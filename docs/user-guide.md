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

## Préparer un projet gouverné

**+ Nouveau projet** reste le parcours immédiat pour une idée purement locale.
Choisir **Projet gouverné** lorsqu'un projet doit posséder un mandat explicite
et un dépôt GitHub canonique compatible avec Project Steward :

1. Renseigner le nom, l'objectif, le contexte et le dépôt prévu sous la forme
   `propriétaire/dépôt` ou avec son URL GitHub HTTPS.
2. Ajouter au moins un livrable et un critère de réussite mesurable, un par
   ligne ; compléter si utile le périmètre inclus, exclu et les contraintes.
3. Vérifier la visibilité déclarée, privée par défaut, puis ouvrir chaque
   fichier dans **Fichiers prêts à relire**.
4. Télécharger les fichiers individuellement ou exporter le paquet JSON
   versionné avant toute publication.
5. Choisir **Créer le projet local gouverné** pour ouvrir le projet ; les cinq
   documents restent accessibles dans **Pièces jointes**.

Les fichiers préparés sont `PROJECT_MANDATE.md`, `PROJECT_CONTEXT.md`,
`PROJECT_STATUS.md`, `.project-steward.yml` et `README.md`. Le même identifiant
stable figure dans le projet, le manifeste et le lien de dépôt.

Aucun dépôt n'est créé ni modifié automatiquement. La visibilité est déclarative
et l'existence réelle du dépôt reste à vérifier. **Annuler** revient au tableau
de bord sans créer de projet.

## Organiser le tableau de bord

La zone **À votre attention** conserve une vue globale des décisions,
validations et blocages. Ses cartes affichent aussi l'avancement du projet
concerné, avec la même source et le même pourcentage que sa fiche détaillée.

La collection **Vos projets** reste distincte :

- Choisir **Grille** ou **Liste** selon l'écran et le nombre de projets.
- Rechercher un titre, un résumé, une description, un tag ou un dépôt.
- Ouvrir **Filtres et tri** pour combiner statut, catégorie/tag, présence d'un
  dépôt et besoin d'attention humaine.
- Trier par titre, date de modification ou avancement réel, dans l'ordre voulu.
- Consulter le nombre de résultats et réinitialiser les filtres si nécessaire.

La présentation et le tri sont mémorisés localement. La recherche et les filtres
ne le sont pas. Filtrer les projets n'effectue aucune lecture GitHub
supplémentaire et ne masque jamais les alertes globales.

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

Les **chantiers** constituent une dimension différente : ils représentent les
fronts pouvant avancer simultanément pendant une même étape. Par exemple, un
projet scientifique à l'étape `v.0.2` peut préparer sa méthodologie, examiner
les exigences réglementaires et organiser sa documentation en parallèle.

## Organiser des chantiers parallèles

L'onglet **Chantiers** est facultatif : un projet simple peut continuer sans
aucun front de travail séparé. Pour structurer un projet plus riche :

1. Créer un chantier en lui donnant un nom et, si utile, une description, une
   catégorie, une couleur, une icône ou un état.
2. Utiliser éventuellement un modèle logiciel, scientifique, associatif ou
   personnel ; seuls les fronts manquants sont ajoutés.
3. Ouvrir le **Backlog** et associer chaque action à un chantier et/ou à une
   étape. Ces deux informations restent facultatives.
4. Filtrer le backlog pour voir un seul chantier ou les actions non attribuées.
5. Revenir à l'onglet **Chantiers** pour consulter la prochaine action utile,
   les fronts bloqués et la matrice étapes × chantiers.

Les flèches déplacent un chantier sans modifier ses actions. L'archivage masque
un front sans supprimer son historique ; afficher les archivés permet ensuite
de le réactiver. Sur téléphone, la matrice se transforme en cartes synthétiques.

Les cases vides de la matrice ne représentent pas du travail manquant : elles
signifient simplement qu'aucune action n'est associée à ce couple chantier /
étape. Les chantiers ne fabriquent jamais un pourcentage fictif.

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
- **Chantiers** : fronts parallèles, prochaines actions et matrice de synthèse.
- **Backlog** : actions, idées et questions à traiter plus tard.
- **Journal** : notes datées, contexte et traces de travail.
- **Décisions** : arbitrages qui doivent rester compréhensibles.
- **Pièces jointes** : documents liés au projet.
- **Dépôt et validations** : état GitHub lorsque le projet possède un dépôt.

## Sauvegarde et partage

L'export **JSON** est le format de sauvegarde machine-lisible à conserver.
L'export **Markdown** est une vue lisible destinée à la consultation ou au
partage. Le stockage actif reste toujours local au navigateur.

Dans **Paramètres**, télécharger une sauvegarde globale puis la restaurer sur
un autre appareil ne demande aucun logiciel supplémentaire. Si le navigateur
le permet, un dossier local facultatif peut également recevoir un instantané
distinct par appareil. Les sauvegardes externes peuvent être examinées,
importées comme copies ou restaurées après confirmation explicite.

Le [guide complet des sauvegardes personnelles](portable-backup-user-guide.md)
détaille le parcours autonome, les permissions, les divergences, le transport
externe facultatif et les validations sur appareils réels encore attendues.
