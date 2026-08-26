# DR-001 — Architecture du cockpit, des dépôts et de Project Steward

Statut : Proposed  
Date : 2026-08-20

## Contexte

`ide-projectsmanager` est une application React/Vite/PWA local-first qui structure des idées et des projets dans le navigateur. Le nouveau Dashboard doit devenir son portefeuille global : il montre ce qui avance, ce qui bloque et ce qui demande une intervention humaine, puis ouvre l’espace de travail détaillé du projet.

Les projets substantiels assistés par IA suivent parallèlement une gouvernance fondée sur deux dépôts de référence :

- `Carouan/ai-project-template` fournit la structure de départ d’un dépôt de projet ;
- `Carouan/ai-project-steward` définit la méthode de gouvernance, de documentation, de handoff et de gestion de l’attention humaine.

Une architecture explicite est nécessaire avant d’ajouter des métadonnées de dépôt, des appels à GitHub ou des panneaux de validation. Elle doit préserver le fonctionnement local et hors ligne de l’application tout en reconnaissant le dépôt d’un projet gouverné comme sa source de vérité durable.

## Décision

### 1. Répartition des responsabilités

| Composant | Responsabilité |
|---|---|
| `ide-projectsmanager` | Cockpit humain, registre local-first, navigation, vues synthétiques, préférences d’interface, cache de lecture et éléments d’attention dérivés. |
| Dashboard | Vue portefeuille de `ide-projectsmanager`, et non application séparée. Il agrège les projets et ouvre leur espace de travail. |
| Dépôt lié à un projet | Source de vérité durable du mandat, du contexte, de l’état opérationnel, des recherches, décisions, livrables et changements versionnés du projet gouverné. |
| `ai-project-template` | Structure initiale et fichiers canoniques proposés aux nouveaux projets substantiels. |
| `ai-project-steward` | Méthode générique indiquant comment humains et agents travaillent, documentent, transmettent et signalent l’attention requise. |
| Work / agent de recherche | Recherche, analyse, spécifications et synthèses durables, déposées dans le dépôt lorsque le projet est gouverné. |
| Codex / agent de dépôt | Modifications du dépôt, branches, commits, tests, migrations et préparation des pull requests. |
| Responsable humain | Priorités, arbitrages, décisions importantes, validation et fusion finales. |

La méthodologie Project Steward ne sera pas copiée dans le code de l’application. L’application consommera un contrat d’intégration minimal et versionné, défini séparément.

### 2. Deux modes de projet

#### Projet local

Une idée, une capture ou un petit projet peut rester sans dépôt lié.

Dans ce mode :

- le document conservé par `ide-projectsmanager` est la source opérationnelle locale ;
- IndexedDB reste le stockage principal, avec le mécanisme de repli existant ;
- les exports JSON et Markdown assurent la portabilité ;
- aucune connexion GitHub n’est requise ;
- toutes les fonctions non liées à GitHub doivent rester disponibles hors ligne.

#### Projet gouverné et lié à un dépôt

Lorsqu’un projet devient suffisamment substantiel pour nécessiter plusieurs itérations, des recherches, décisions, livrables ou validations, il peut être lié à un dépôt créé à partir de `ai-project-template` et gouverné par `ai-project-steward`.

Dans ce mode :

- le dépôt lié devient la source de vérité durable du contenu gouverné ;
- `ide-projectsmanager` conserve l’identifiant du lien, les préférences locales et un cache de lecture ;
- les fichiers exécutifs du dépôt, notamment `PROJECT_STATUS.md`, décrivent l’état durable du projet ;
- les issues, pull requests et contrôles GitHub décrivent l’état du travail versionné ;
- l’application ne doit pas présenter une donnée en cache comme une donnée GitHub actuelle.

Le passage du mode local au mode gouverné est explicite. Il ne doit ni créer un dépôt silencieusement ni supprimer les données locales existantes.

### 3. Autorité des données

| Type de donnée | Autorité | Comportement dans le cockpit |
|---|---|---|
| Projet sans dépôt | Document local | Lecture et écriture locales ; export portable. |
| Mandat, contexte, statut, décisions et preuves d’un projet gouverné | Dépôt du projet | Lecture projetée ou mise en cache ; aucune divergence silencieuse. |
| Préférences d’interface et état d’affichage | Stockage local de l’application | Local-only ; ne modifie pas le dépôt. |
| Métadonnées GitHub, PR et contrôles | GitHub | Cache horodaté ; état frais, périmé ou indisponible explicite. |
| Compteurs du Dashboard et éléments d’attention | Données dérivées | Recalculables ; jamais une seconde source de vérité. |
| Code de `ide-projectsmanager` | Dépôt `Carouan/ide-projectsmanager` | Déployé sur GitHub Pages ; séparé des données personnelles de projets. |

Cette décision ne définit pas encore un mécanisme de synchronisation bidirectionnelle. Une future écriture vers un dépôt devra être explicitement conçue, autorisée et traçable.

### 4. Trois états à ne pas confondre

Le cockpit affichera séparément :

1. **État du projet** — phase, progression déclarée, priorité, prochaine action et blocages métier ;
2. **Santé du dépôt** — activité récente, branche principale, contrôles, conflits et disponibilité ;
3. **Attention humaine** — information, décision requise, validation requise ou question bloquante.

Une activité Git ou un contrôle vert ne prouve pas l’avancement métier du projet. Une pull request ouverte ne nécessite pas nécessairement une validation immédiate. Les règles de classement devront être déterministes et explicables.

### 5. Flux de lecture et comportement hors ligne

Pour un projet lié, le flux cible est :

1. le document local fournit l’identité du dépôt ;
2. un adaptateur de fournisseur interroge GitHub en lecture seule ;
3. la réponse normalisée est conservée avec `fetchedAt`, son origine et son état d’erreur ;
4. le moteur d’attention dérive les indicateurs utiles ;
5. le Dashboard et l’espace du projet affichent ces informations sans les rendre canoniques.

Hors ligne ou en cas d’échec :

- le projet local reste ouvrable et modifiable ;
- le dernier instantané connu peut être affiché ;
- son horodatage et son caractère périmé doivent être visibles ;
- l’absence de réponse ne doit pas être interprétée comme « aucun problème » ;
- aucun état distant inconnu ne doit être inventé.

Le seuil précis de péremption sera défini avec l’adaptateur GitHub.

### 6. Gestion de l’attention humaine

Le cockpit reprend les catégories de Project Steward :

- **Information** — aucun acte requis ;
- **Décision requise** — arbitrage humain nécessaire ;
- **Validation requise** — revue humaine recommandée avant poursuite ou fusion ;
- **Question bloquante** — le travail responsable ne peut pas continuer sans réponse.

Les agents peuvent préparer, contrôler et commenter une pull request. Ils ne se substituent pas au responsable humain pour la fusion finale. Une PR attribuée à Work ou Codex ne sera jamais considérée comme sûre uniquement en raison de son origine.

### 7. Frontières de sécurité

Le déploiement GitHub Pages est statique et son bundle est publiquement inspectable. Par conséquent :

- aucun token, PAT, secret OAuth, secret GitHub App ou jeton de rafraîchissement ne peut être intégré au code ou au build ;
- aucun secret ne peut être stocké dans un document projet exportable, un export Markdown/JSON, un cache de dépôt, un journal ou un message d’erreur ;
- l’intégration initiale est en lecture seule et vise les dépôts publics ;
- l’accès aux dépôts privés nécessite une décision de sécurité distincte ;
- les opérations GitHub sensibles — approbation, fermeture, fusion ou écriture — sont hors périmètre de cette architecture initiale.

### 8. Frontières entre dépôts

Les changements restent atomiques et propres à leur dépôt :

- UI, stockage local, adaptateurs et vues d’attention : `ide-projectsmanager` ;
- structure générée et métadonnées par défaut : `ai-project-template` ;
- règles génériques de gouvernance et conventions d’agents : `ai-project-steward` ;
- contenu métier et historique : dépôt du projet concerné.

Une issue de coordination dans `ide-projectsmanager` peut décrire un changement transversal, mais chaque modification de `ai-project-template` ou `ai-project-steward` doit passer par sa propre issue, branche et PR.

### 9. Séquence d’intégration

L’implémentation suit neuf étapes distinctes :

1. [#61 — définir cette architecture](https://github.com/Carouan/ide-projectsmanager/issues/61) ;
2. [#62 — ajouter les métadonnées de liaison au dépôt](https://github.com/Carouan/ide-projectsmanager/issues/62) ;
3. [#63 — définir le contrat d’intégration Project Steward](https://github.com/Carouan/ide-projectsmanager/issues/63) ;
4. [#64 — ajouter un adaptateur GitHub en lecture seule](https://github.com/Carouan/ide-projectsmanager/issues/64) ;
5. [#65 — ajouter le panneau Dépôt et validations](https://github.com/Carouan/ide-projectsmanager/issues/65) ;
6. [#66 — ajouter la boîte de réception globale de l’attention humaine](https://github.com/Carouan/ide-projectsmanager/issues/66) ;
7. [#67 — normaliser l’origine IA et les conventions d’attention](https://github.com/Carouan/ide-projectsmanager/issues/67) ;
8. [#68 — initialiser les projets gouvernés depuis AI Project Template](https://github.com/Carouan/ide-projectsmanager/issues/68) ;
9. [#69 — concevoir l’accès sécurisé aux dépôts privés](https://github.com/Carouan/ide-projectsmanager/issues/69).

Chaque étape conserve la règle une issue, une branche et une PR. Les étapes ultérieures ne doivent pas être anticipées dans une PR antérieure.

## Raisons

Cette architecture :

- préserve les usages légers et hors ligne au lieu d’imposer GitHub à chaque idée ;
- rend les projets substantiels auditables et reprenables via leur dépôt ;
- évite de dupliquer Project Steward dans l’application ;
- sépare les faits canoniques des caches et indicateurs dérivés ;
- protège l’attention humaine en montrant seulement ce qui nécessite réellement une action ;
- évite d’exposer des secrets dans une application GitHub Pages ;
- permet d’ajouter plus tard d’autres fournisseurs derrière une abstraction.

## Alternatives considérées

### Tout conserver uniquement dans le navigateur

Rejeté pour les projets gouvernés : ce modèle ne fournit pas de mémoire commune durable, de revue par PR ni de reprise fiable entre agents.

### Créer immédiatement un dépôt pour chaque idée

Rejeté : cela impose trop de friction et produit des dépôts inutiles pour des captures encore exploratoires.

### Faire du Dashboard une application séparée

Rejeté : cela dupliquerait navigation, données et logique. Le Dashboard est la vue portefeuille de `ide-projectsmanager`.

### Copier Project Steward dans l’application

Rejeté : la méthodologie doit rester versionnée dans son dépôt et réutilisable indépendamment de cette interface.

### Utiliser directement un token GitHub dans le navigateur

Rejeté comme choix par défaut : un secret intégré au bundle est exposé, et un secret persistant côté navigateur nécessite un modèle de menace et une décision dédiés.

## Conséquences

### Positives

- continuité entre capture locale et projet gouverné ;
- séparation nette des responsabilités ;
- architecture compatible avec le fonctionnement PWA ;
- indicateurs GitHub utiles sans confondre activité technique et progrès métier ;
- évolutions plus petites, testables et réversibles.

### Coûts et limites

- deux modes de projet doivent être expliqués dans l’interface ;
- les données distantes nécessitent cache, horodatage et gestion de péremption ;
- le contrat entre l’IDE et les dépôts doit être versionné ;
- les dépôts privés restent indisponibles jusqu’à une solution d’authentification sûre ;
- la synchronisation bidirectionnelle et les écritures GitHub sont différées.

## Questions ouvertes

1. Quel schéma et quelle version utiliser pour le contrat `.project-steward.yml` ?
2. Quel seuil rend un instantané GitHub « périmé » selon le contexte en ligne ou hors ligne ?
3. Quelle stratégie d’authentification convient aux dépôts privés : session locale, coffre chiffré, OAuth/GitHub App avec intermédiaire, ou pont auto-hébergé ?
4. Comment proposer plus tard une écriture vers le dépôt sans créer deux sources de vérité concurrentes ?
5. Quelle partie de la création depuis le template peut être automatisée sans action distante implicite ?
6. Quels signaux permettent d’identifier de manière fiable l’origine Work, Codex, humaine ou inconnue d’une PR ?

Ces questions sont volontairement différées vers les issues #63, #64, #67, #68 et #69.

## Revoir cette décision lorsque

- le premier contrat d’intégration Project Steward est stabilisé ;
- une écriture bidirectionnelle vers GitHub est envisagée ;
- une méthode d’accès aux dépôts privés est sélectionnée ;
- un autre fournisseur de dépôt doit être pris en charge ;
- l’expérience réelle montre que la séparation projet local/projet gouverné est insuffisante.

## Références

- [AI Project Steward](https://github.com/Carouan/ai-project-steward)
- [Workflow idée vers projet](https://github.com/Carouan/ai-project-steward/blob/main/WORKFLOW_IDEE_VERS_PROJET.md)
- [AI Project Template](https://github.com/Carouan/ai-project-template)
- [Issue #61](https://github.com/Carouan/ide-projectsmanager/issues/61)
