# Spécification d'issue compagnon — `Carouan/ai-project-steward`

## Titre proposé

`Reference v1 AI-origin and human-attention conventions in Project Steward`

## Objectif

Faire de la méthode `Carouan/ai-project-steward` la référence opérationnelle pour appliquer les [conventions v1 d'origine et d'attention](../ai-origin-human-attention-conventions-v1.md), tout en laissant le cockpit responsable de la lecture et des vues dérivées.

## Tâches

- référencer la convention v1 depuis la documentation de la méthode ;
- définir à quel moment un agent ou un humain ajoute le label d'origine déclaré ;
- définir à quel moment utiliser chaque label `attention:*` ;
- exiger une raison explicite pour `validation`, `decision` et `blocking` ;
- rappeler qu'un changement de niveau d'attention doit mettre à jour le label et le bloc humain de la PR ;
- expliquer le traitement des conflits : attention la plus prudente, mais origine contradictoire ramenée à `unknown` ;
- inclure les exemples Work, Codex, humain, autre automatisation et origine inconnue ;
- intégrer ces conventions aux règles de handoff sans modifier le contrat Dashboard v1 existant.

## Responsabilités attendues

| Acteur | Responsabilité |
|---|---|
| Agent ou humain qui prépare la PR | Déclarer l'origine connue, choisir le niveau d'attention et écrire la raison. |
| Agent de revue | Vérifier la cohérence des métadonnées, présenter les faits techniques et signaler les conflits. |
| Responsable humain | Arbitrer, valider et décider de la fusion finale. |
| Cockpit | Lire et classer sans écrire sur GitHub ni transformer l'origine en confiance. |

## Contraintes

- aucune politique d'approbation ou de fusion automatique ;
- aucun agent ne s'auto-déclare validé ;
- les contrôles verts ne prouvent pas l'avancement métier ni la sûreté ;
- la branche, l'auteur et le style de texte restent des indices non normatifs ;
- les changements du template et du cockpit passent par leurs propres issues et PR ;
- les anciennes PR sans labels restent prises en charge par les replis prudents.

## Critères d'acceptation

- les labels et leur sémantique sont cités sans ambiguïté ;
- le workflow décrit clairement qui pose et met à jour les métadonnées ;
- les conflits et l'origine inconnue ont un comportement sûr ;
- la validation humaine finale reste explicite ;
- aucun passage ne permet de conclure automatiquement qu'une PR est sûre à fusionner ;
- le rôle respectif de Steward, du template et du cockpit reste séparé.

## Validation

- relire les exemples Work, Codex, humain, autre automatisation et inconnu ;
- vérifier les scénarios de label manquant et de labels contradictoires ;
- vérifier la cohérence avec le handoff et le contrat Dashboard v1 ;
- rechercher toute formulation impliquant une auto-approbation ou une auto-fusion.

## Retour arrière

Retirer la référence à la convention et restaurer les instructions précédentes. Aucun dépôt consommateur ni document projet n'est modifié automatiquement.
