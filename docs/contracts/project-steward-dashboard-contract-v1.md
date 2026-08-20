# Contrat Dashboard–Project Steward v1

Statut : Proposed

Version du contrat : `1`

Date : 2026-08-20

## Objet

Ce contrat permet à `ide-projectsmanager` de découvrir, en lecture seule, les fichiers exécutifs d'un dépôt gouverné par [AI Project Steward](https://github.com/Carouan/ai-project-steward). Il complète le schéma existant de `.project-steward.yml` sans copier la méthodologie dans l'application et sans modifier le comportement des dépôts existants.

Le contrat décrit uniquement l'interopérabilité. Il n'ajoute ni appel à un fournisseur Git, ni synchronisation, ni écriture distante. L'adaptateur de lecture est traité séparément dans l'issue #64.

## Principes

- Le dépôt gouverné reste la source de vérité durable.
- Le document local de `ide-projectsmanager` ne conserve qu'un lien et, plus tard, un cache explicitement daté.
- La version du contrat Dashboard est indépendante de la version de la méthodologie Project Steward.
- Les ajouts au YAML sont rétrocompatibles : un consommateur doit ignorer les clés inconnues.
- Un état absent, invalide ou non pris en charge reste inconnu ; il ne devient jamais implicitement « sain », « sans blocage » ou « à jour ».
- Les chemins sont relatifs au dépôt et l'identité du fournisseur reste explicite afin de ne pas enfermer le contrat dans GitHub.

## Emplacement et forme

Le manifeste se trouve à la racine du dépôt sous le nom `.project-steward.yml`. Le contrat v1 ajoute un bloc `dashboard` sous le bloc existant `project_steward` :

```yaml
project_steward:
  methodology_repository: "Carouan/ai-project-steward"
  version: "v1-draft"
  canonical_repository_is_source_of_truth: true
  handoff_file: ".project/HANDOFF.md"
  language:
    human_facing_default: "fr"
    technical_default: "en"

  dashboard:
    contract_version: "1"
    enabled: true
    project_id: "8de0e638-1f91-4d8e-9474-0e7cd2f89123"
    canonical_repository:
      provider: "github"
      full_name: "Carouan/example-project"
      url: "https://github.com/Carouan/example-project"
      default_branch: "main"
      visibility: "public"
    executive_status_file: "PROJECT_STATUS.md"
```

L'[exemple complet](examples/project-steward-dashboard-v1.yml) reprend également les autres propriétés présentes dans le template actuel.

## Champs du contrat

Les propriétés suivantes sont canoniques dans `.project-steward.yml`.

| Chemin YAML | Requis | Règle v1 |
|---|---:|---|
| `project_steward.dashboard.contract_version` | Oui si le bloc `dashboard` existe | Chaîne exacte `"1"`. Cette version concerne le contrat Dashboard, pas la méthodologie. |
| `project_steward.dashboard.enabled` | Oui | Booléen. `false` désactive volontairement toute lecture Dashboard du manifeste et des fichiers référencés. |
| `project_steward.dashboard.project_id` | Oui si `enabled: true` | Identifiant opaque, non vide, stable et immuable. Un UUID est recommandé. Il ne doit pas être dérivé du nom ou de l'URL du dépôt et survit à un renommage ou un transfert. |
| `project_steward.dashboard.canonical_repository.provider` | Oui si activé | Identifiant de fournisseur en minuscules, par exemple `github`. Un fournisseur inconnu n'est pas une erreur de syntaxe, mais peut être non pris en charge par l'application. |
| `project_steward.dashboard.canonical_repository.full_name` | Oui si activé | Identifiant canonique du dépôt chez le fournisseur, par exemple `Carouan/example-project`. |
| `project_steward.dashboard.canonical_repository.url` | Non | URL HTTPS canonique. Si elle manque, l'adaptateur peut en dériver une pour l'affichage, mais cette valeur dérivée n'est pas canonique. |
| `project_steward.dashboard.canonical_repository.default_branch` | Non | Nom déclaré de la branche principale. Une valeur observée ultérieurement chez le fournisseur reste une donnée distante mise en cache. |
| `project_steward.dashboard.canonical_repository.visibility` | Non | Valeur déclarative telle que `public`, `private` ou `internal`. Elle ne remplace pas les autorisations du fournisseur. |
| `project_steward.dashboard.executive_status_file` | Oui si activé | Chemin POSIX relatif vers le résumé exécutif, normalement `PROJECT_STATUS.md`. |
| `project_steward.methodology_repository` | Oui pour un dépôt gouverné | Dépôt qui définit la méthodologie. Le Dashboard le lit tel quel ; il ne charge ni ne copie la skill. |
| `project_steward.version` | Oui pour un dépôt gouverné | Version de la méthodologie Project Steward, distincte de `contract_version`. |
| `project_steward.canonical_repository_is_source_of_truth` | Oui pour un dépôt gouverné | Doit rester `true` pour que le Dashboard traite le dépôt comme autorité durable. |
| `project_steward.handoff_file` | Non | Chemin POSIX relatif vers un handoff éventuel. L'absence de la clé ou du fichier ne rend pas le contrat invalide. |
| `project_steward.language.human_facing_default` | Non | Langue BCP 47 préférée pour le contenu humain, par exemple `fr`. |
| `project_steward.language.technical_default` | Non | Langue BCP 47 préférée pour le contenu technique, par exemple `en`. |

Un chemin de fichier du contrat :

- utilise `/` comme séparateur ;
- est relatif à la racine du dépôt ;
- ne commence ni par `/` ni par une URL ;
- ne contient aucun segment `..`.

Ces contraintes permettent à l'adaptateur de borner ses lectures au dépôt concerné.

## Compatibilité et dégradation sûre

| Situation | Comportement requis |
|---|---|
| `.project-steward.yml` absent | Projet non gouverné ou non détectable. Le projet local et son lien de dépôt restent utilisables. |
| Bloc `project_steward.dashboard` absent | Dépôt Steward historique. L'intégration Dashboard est indisponible ; aucune valeur n'est devinée. |
| `enabled: false` | Désactivation volontaire. Ne pas lire le statut exécutif ni le handoff par ce contrat. |
| `enabled: true` avec un champ requis absent ou invalide | Contrat invalide. Afficher une configuration indisponible sans inventer de statut distant. |
| `contract_version` absent | Contrat historique/non versionné, donc non pris en charge. |
| `contract_version` inconnu | Contrat non pris en charge. Ne pas interpréter partiellement ses références comme si elles étaient en v1. |
| Clé supplémentaire inconnue dans un contrat v1 | L'ignorer sans échouer. Elle peut appartenir à une extension rétrocompatible. |
| Fournisseur inconnu | Conserver le lien local, signaler l'adaptateur indisponible et n'effectuer aucun appel fournisseur. |
| Fichier `executive_status_file` configuré mais absent | Statut exécutif indisponible/configuration à corriger ; ne pas conclure qu'il n'y a aucun blocage. |
| `handoff_file` absent du YAML ou fichier optionnel inexistant | Aucun handoff disponible ; le reste du contrat demeure valide. |
| Lecture distante impossible | Le dernier cache peut être montré avec son horodatage et son état périmé ; sinon l'état reste inconnu. |

La politique v1 distingue donc une extension inconnue, qui est tolérée, d'une version majeure inconnue, qui n'est pas interprétée.

## Autorité, cache et données dérivées

| Donnée | Nature | Règle d'affichage |
|---|---|---|
| Identifiant stable, coordonnées du dépôt, version de contrat, version de méthodologie, chemins et politique de langue | Canonique dans `.project-steward.yml` | Montrer la valeur du manifeste ou signaler son absence/invalidité. |
| Contenu de `PROJECT_STATUS.md` et du handoff éventuel | Canonique dans les fichiers référencés | Lire sans le réécrire depuis le cache local. |
| `fetchedAt`, état frais/périmé, erreur de lecture et instantané fournisseur | Cache local | Toujours attribuer la source et afficher la fraîcheur. |
| Extrait du statut, progression interprétée, santé du dépôt, compteurs de PR/contrôles et catégorie d'attention | Dérivé | Recalculable et explicable ; jamais une seconde source de vérité. |
| URL construite en l'absence de `canonical_repository.url` | Dérivée | Identifier comme telle et ne pas la persister dans le dépôt sans action explicite. |

## Correspondance avec le document projet local

Le bloc `repository` ajouté au modèle local par l'issue #62 reste un lien/cache, pas l'autorité du contrat. La correspondance attendue est :

| Contrat Steward canonique | Champ local `ProjectDocument.repository` | Note |
|---|---|---|
| `dashboard.project_id` | `externalProjectId` | Extension préservée par le modèle ; stable même si le dépôt est renommé. |
| `dashboard.canonical_repository.provider` | `provider` | Valeur normalisée par l'application. |
| `dashboard.canonical_repository.full_name` | `fullName` | Coordonnée fournisseur. |
| `dashboard.canonical_repository.url` | `url` | Peut être omise dans le contrat et dérivée localement. |
| `dashboard.canonical_repository.default_branch` | `defaultBranch` | Copie de liaison/cache ; le manifeste reste canonique pour la valeur déclarée. |
| `dashboard.canonical_repository.visibility` | `visibility` | Information déclarative, non autorisation d'accès. |
| `methodology_repository` + `version` | `governance` | Libellé compact possible, par exemple `Carouan/ai-project-steward@v1-draft`. |

Les chemins, langues, versions et contenus référencés n'ont pas besoin d'être recopiés dans le document projet. Un futur adaptateur peut les conserver dans un instantané séparé avec sa source et son `fetchedAt`.

## Évolution du contrat

- Les nouvelles clés optionnelles peuvent être ajoutées à la version `1` si leur absence conserve exactement le comportement actuel.
- Toute modification de sens, suppression de champ ou nouvelle exigence incompatible impose une nouvelle valeur de `contract_version`.
- Un consommateur v1 ignore les clés inconnues mais refuse d'interpréter une version majeure inconnue.
- Le contrat ne dépend pas d'une API GitHub particulière ; les capacités propres à un fournisseur appartiennent à son adaptateur.

## Travaux compagnons, volontairement séparés

Cette PR ne modifie aucun autre dépôt.

### `Carouan/ai-project-template`

Créer une issue et une PR dédiées pour ajouter le bloc `dashboard` au template. Le template devrait utiliser `enabled: false` et ne pas fournir de `project_id` partagé : l'initialisation d'un vrai projet devra générer cet identifiant et renseigner son dépôt canonique. `executive_status_file` peut déjà valoir `PROJECT_STATUS.md`. Le chemin optionnel `handoff_file` peut rester déclaré même si le fichier n'existe pas encore.

### `Carouan/ai-project-steward`

Créer une issue documentaire dédiée pour référencer ce contrat et stabiliser le sens des champs existants consommés ici : dépôt/version de méthodologie, source de vérité, statut exécutif, handoff et politique de langue. La skill reste dans son dépôt ; elle n'est ni embarquée ni copiée dans l'application.

### `Carouan/ide-projectsmanager`

L'issue #64 pourra implémenter la validation et la lecture seule de ce contrat derrière un adaptateur de fournisseur. Les vues, compteurs de PR, contrôles et règles d'attention appartiennent aux étapes suivantes de la roadmap.

## Validation et retour arrière

L'exemple YAML doit être analysable par un parseur YAML standard et les coordonnées du dépôt se mapper aux métadonnées `repository` existantes sans migration de données.

Le retour arrière consiste à supprimer ce document, son exemple et leurs liens dans l'index. Aucun comportement d'exécution ni format persistant de `ide-projectsmanager` n'est modifié.
