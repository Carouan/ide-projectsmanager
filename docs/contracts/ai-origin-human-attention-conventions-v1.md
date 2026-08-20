# Conventions v1 — origine des contributions et attention humaine

## Statut et portée

- **Version** : `1`
- **Statut** : convention normative pour `ide-projectsmanager`
- **Portée** : pull requests et signaux dérivés affichés par le cockpit
- **Autorité** : les métadonnées GitHub déclarent une intention ; elles ne prouvent ni une identité, ni la qualité, ni la sûreté d'une contribution

Cette convention complète le [contrat Dashboard–Project Steward v1](project-steward-dashboard-contract-v1.md). Elle permet de classer de façon déterministe l'origine déclarée d'une pull request et le niveau d'attention humaine demandé, sans confondre ces deux dimensions.

Deux invariants sont absolus :

1. l'origine d'une PR ne réduit jamais son niveau d'attention ;
2. aucune combinaison de labels, d'auteur, de branche ou de contrôles verts ne signifie « sûre à fusionner ».

## Dimensions indépendantes

| Dimension | Question | Valeurs normalisées |
|---|---|---|
| Origine déclarée | Qui ou quel système a principalement préparé cette PR ? | `work`, `codex`, `human`, `other_automation`, `unknown` |
| Attention humaine | Quel type d'intervention est explicitement demandé ? | `information`, `validation`, `decision`, `blocking` |
| Santé technique | Que disent les contrôles et la fusionnabilité ? | Gérée séparément par l'adaptateur de dépôt |
| Sûreté de fusion | La PR peut-elle être fusionnée sans risque ? | **Jamais déduite par cette convention** |

Une PR de Work peut être informative, demander une validation, une décision ou une réponse bloquante. Il en va exactement de même pour une PR de Codex, d'un humain ou d'une autre automatisation.

## Labels canoniques

### Attention humaine

| Label GitHub | Valeur normalisée | Sens normatif |
|---|---|---|
| `attention:information` | `information` | Aucun acte humain n'est explicitement requis. L'élément peut rester visible comme contexte ou signal technique. |
| `attention:validation` | `validation` | Une revue humaine est demandée avant poursuite ou fusion. Ce label ne signifie pas que la PR est prête techniquement. |
| `attention:decision` | `decision` | Un arbitrage humain explicite est nécessaire entre au moins deux options ou orientations. |
| `attention:blocking` | `blocking` | Le travail responsable ne peut pas continuer sans réponse humaine. Le motif doit être écrit dans la PR. |

Ordre de prudence, du plus faible au plus fort :

`information < validation < decision < blocking`

Une PR devrait porter au maximum un label `attention:*`. Si plusieurs labels sont présents, le cockpit retient le niveau le plus prudent et expose un conflit de métadonnées.

### Origine déclarée

| Label GitHub | Valeur normalisée | Sens normatif |
|---|---|---|
| `agent:work` | `work` | La contribution a principalement été préparée dans ChatGPT Work. |
| `agent:codex` | `codex` | La contribution a principalement été préparée par Codex. |
| `agent:other` | `other_automation` | Une autre automatisation ou un autre agent a principalement préparé la contribution. |
| `origin:human` | `human` | La contribution a principalement été préparée par un humain sans agent déclaré comme auteur principal. |

Une PR devrait porter au maximum un de ces labels. Plusieurs labels d'origine sont contradictoires : le cockpit renvoie alors `unknown` avec `conflict: true`. Il ne choisit jamais arbitrairement Work, Codex, humain ou autre automatisation.

Les labels d'origine sont déclaratifs et peuvent être erronés ou usurpés. Ils servent à la traçabilité du workflow, pas à l'authentification de l'auteur.

## Bloc humain canonique dans les pull requests

Les modèles de PR doivent conserver une section lisible par une personne :

```markdown
## Human validation required

- Required: yes
- Level: validation
- Reason: Vérifier le comportement hors ligne avant fusion.
- Requested from: project-owner
```

Valeurs admises pour `Level` :

- `information`
- `validation`
- `decision`
- `blocking`

`Required: no` est cohérent uniquement avec `Level: information`. Les trois autres niveaux impliquent `Required: yes`. Le champ `Reason` est obligatoire pour `validation`, `decision` et `blocking` ; il explique l'action attendue sans devenir une seconde source de vérité.

Seule cette structure exacte peut servir de repli machine-lisible. Une phrase libre contenant par exemple « please validate » ou « blocking » ne suffit jamais à classifier automatiquement la PR.

## Algorithme déterministe

### Résolution de l'attention

1. Recueillir les labels `attention:*` reconnus.
2. Si plusieurs labels reconnus sont présents, retenir le plus prudent et définir `conflict: true`.
3. Lire, si elle existe, la valeur exacte `Level` du bloc `Human validation required`.
4. Si label et bloc structuré existent et divergent, retenir le plus prudent et définir `conflict: true`.
5. En l'absence de métadonnée explicite :
   - PR non brouillon et prête pour revue → `validation` par repli prudent ;
   - brouillon ou état de préparation inconnu → `information` ;
   - un conflit ou un contrôle en échec reste un fait de santé technique et n'invente ni `decision` ni `blocking`.
6. Conserver la source de la décision (`label`, `section`, `fallback` ou `combined`) et une raison explicable.

Le texte libre peut enrichir l'explication affichée, mais ne peut jamais diminuer ou augmenter seul le niveau calculé.

### Résolution de l'origine

1. Recueillir les labels d'origine reconnus.
2. Un label unique donne la valeur normalisée correspondante avec `source: label`.
3. Aucun label reconnu donne `unknown` avec `source: none`.
4. Plusieurs labels reconnus donnent `unknown` avec `source: conflict` et `conflict: true`.
5. Le nom de branche, le login GitHub, le type d'auteur `User`/`Bot`, le texte de la PR et le style d'écriture peuvent être affichés comme indices factuels, mais ne remplacent jamais un label d'origine.

Ainsi, une branche `codex/fix-cache` créée par un compte humain reste d'origine `unknown` sans `agent:codex`.

## Précédence et désaccords

| Situation | Résultat sûr |
|---|---|
| `attention:information` + bloc `Level: blocking` | `blocking`, conflit signalé |
| `attention:decision` + bloc `Level: validation` | `decision`, conflit signalé |
| Deux labels d'attention | Niveau le plus prudent, conflit signalé |
| `agent:work` + `origin:human` | `unknown`, conflit signalé |
| Aucun label d'origine + auteur GitHub de type `Bot` | `unknown`; le type `Bot` reste un fait séparé |
| Label d'attention absent + PR prête pour revue | `validation` par repli, origine inchangée |
| Label d'attention absent + brouillon en échec | `information` avec santé critique, pas de validation inventée |
| Label inconnu, par exemple `agent:new-tool` | Ignoré pour le classement v1 et signalé comme métadonnée non prise en charge |

Un désaccord ne peut donc jamais abaisser silencieusement l'attention, tandis qu'un désaccord d'origine ne peut jamais créer une fausse certitude.

## Forme normalisée attendue

Le cockpit peut dériver la structure suivante sans la persister comme source canonique :

```json
{
  "attention": {
    "level": "validation",
    "source": "label",
    "conflict": false,
    "reason": "attention_label"
  },
  "origin": {
    "value": "codex",
    "source": "label",
    "conflict": false
  },
  "mergeSafety": "not_assessed"
}
```

`mergeSafety` reste toujours `not_assessed` dans cette convention. Une future capacité distincte pourrait présenter des faits de revue ou de CI, mais jamais transformer automatiquement l'origine en autorisation de fusion.

## Exemples de référence

Les cas machine-lisibles sont conservés dans [l'exemple JSON v1](examples/ai-origin-human-attention-v1.json).

### Work

- labels : `agent:work`, `attention:validation`
- résultat : origine `work`, attention `validation`
- conséquence : validation humaine toujours requise ; aucune sûreté de fusion déduite

### Codex

- labels : `agent:codex`, `attention:decision`
- résultat : origine `codex`, attention `decision`
- conséquence : l'arbitrage humain prime, même avec des contrôles verts

### Humain

- labels : `origin:human`, `attention:information`
- résultat : origine `human`, attention `information`
- conséquence : le cockpit n'invente pas de validation du seul fait qu'une PR est humaine

### Autre automatisation

- labels : `agent:other`, `attention:validation`
- résultat : origine `other_automation`, attention `validation`

### Origine inconnue

- aucun label d'origine ; branche et auteur éventuellement disponibles
- résultat : origine `unknown`
- l'attention est résolue séparément à partir de son label, du bloc structuré ou du repli draft/ready

## Compatibilité et évolution

- Les consommateurs v1 ignorent les labels non reconnus et les exposent comme diagnostics lorsqu'ils peuvent le faire.
- Ajouter une nouvelle origine demande une mise à jour explicite de la convention et des consommateurs ; aucune correspondance par sous-chaîne n'est admise.
- Modifier la précédence, la signification d'un label ou la politique de conflit impose une nouvelle version majeure.
- Les couleurs et descriptions GitHub sont des aides visuelles ; elles ne participent jamais à la classification.
- Les changements dans `ai-project-template` et `ai-project-steward` sont volontairement séparés dans les spécifications compagnons liées ci-dessous.

## Travaux compagnons

- [Spécification pour `Carouan/ai-project-template`](companion-issues/ai-project-template-attention-conventions.md)
- [Spécification pour `Carouan/ai-project-steward`](companion-issues/ai-project-steward-attention-conventions.md)

## Retour arrière

La convention ne modifie aucun document projet ni donnée distante. Son retour arrière consiste à retirer ce document, son exemple et les deux spécifications compagnons. Les classificateurs actuels de #65 et #66 continuent alors à utiliser leurs replis prudents.
