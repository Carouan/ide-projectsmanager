# Spécification d'issue compagnon — `Carouan/ai-project-template`

## Titre proposé

`Adopt v1 AI-origin and human-attention conventions in project pull requests`

## Objectif

Adapter `Carouan/ai-project-template` pour que les nouveaux projets gouvernés disposent d'un modèle de pull request compatible avec les [conventions v1 d'origine et d'attention](../ai-origin-human-attention-conventions-v1.md), sans automatiser la création ou la fusion de PR.

## Tâches

- ajouter ou mettre à jour `.github/pull_request_template.md` avec la section exacte `Human validation required` ;
- documenter les valeurs `information`, `validation`, `decision` et `blocking` ;
- expliquer quels labels d'attention et d'origine doivent être appliqués au moment de la création d'une PR ;
- fournir des exemples Work, Codex, humain, autre automatisation et origine inconnue ;
- préciser que les labels sont déclaratifs et ne prouvent ni l'identité ni la qualité ;
- conserver les sections existantes du template pour l'objectif, les changements, les risques, la validation et le rollback ;
- ne pas créer de label distant automatiquement sans action GitHub explicitement autorisée.

## Section de modèle attendue

```markdown
## Human validation required

- Required: yes|no
- Level: information|validation|decision|blocking
- Reason: <what the project owner must know or do>
- Requested from: project-owner
```

## Contraintes

- aucun token, secret ou workflow GitHub en écriture ;
- aucune fusion, approbation ou fermeture automatique ;
- aucune origine déduite du nom de branche ou de l'auteur GitHub ;
- `unknown` reste le repli lorsque l'origine n'est pas explicitement déclarée ;
- ne pas recopier toute la méthodologie Project Steward dans le template.

## Critères d'acceptation

- le modèle de PR produit une section humaine structurée et non ambiguë ;
- les quatre niveaux d'attention sont documentés ;
- les cinq origines normalisées sont illustrées ;
- les exemples contradictoires expliquent le comportement sûr ;
- aucun texte ne présente une PR d'agent comme sûre à fusionner ;
- les projets existants restent utilisables sans migration obligatoire.

## Validation

- vérifier manuellement le rendu du modèle de PR ;
- vérifier les exemples Work, Codex, humain, autre automatisation et inconnu ;
- rechercher toute formulation impliquant une approbation ou fusion automatique ;
- vérifier que les liens vers la convention v1 sont valides.

## Retour arrière

Rétablir le modèle de PR et la documentation précédents. Les dépôts déjà créés conservent leurs fichiers et labels éventuels sans migration destructive.
