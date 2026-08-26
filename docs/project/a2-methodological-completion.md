# A2 — Complétion méthodologique d’un cycle de projet ICT basé sur versions

Ce document joue le rôle d’**annexe méthodologique**. Il ne remplace pas le cadrage produit du dépôt ; il complète la méthode.

## Rôle

Il sert à enrichir le cycle `v.0.0 → v.1.0` avec :

- des livrables par étape
- des critères de sortie
- des repères de qualité
- des points de sécurité / privacité / robustesse
- une logique plus explicite de préparation à l’exploitation

## Complément du cycle

Versionnement recommandé :

- `v.0.0` : besoin initial
- `v.0.1` : analyse exploratoire
- `v.0.2` : cadrage produit et MVP
- `v.0.3` : conception et préparation delivery
- `v.0.4` : assemblage / intégration
- `v.0.5` : POC / alpha
- `v.0.6` : correction des bugs
- `v.0.7` : bêta
- `v.0.8` : stabilisation / corrections post-bêta
- `v.0.9` : release candidate / recette
- `v.1.0` : première livraison du projet suivi

## Ce que cette annexe apporte

### Livrables et critères de sortie

Chaque étape gagne à avoir :

- un livrable explicite
- une définition claire de terminé
- des risques identifiés
- une logique de validation

### Gouvernance

Elle aide à préciser :

- qui décide
- qui arbitre
- qui valide
- qui exploite / maintient ensuite

### Qualité et robustesse

Elle pousse à intégrer progressivement :

- stratégie de tests
- contrôle des régressions
- règles de rollback
- indicateurs de stabilité
- préparation à la maintenance

### Readiness ops

Elle prépare la transition du simple développement vers un produit plus exploitable :

- sauvegarde / restauration
- visibilité des erreurs
- comportements sûrs en cas de panne
- documentation de maintenance

## Positionnement dans ce dépôt

Pour `ide-projectsmanager`, ce document ne doit pas être lu comme une check-list MVP obligatoire.

Il sert plutôt de :

- réserve méthodologique
- cadre de montée en rigueur
- source d’amélioration pour les futures versions

## Consigne pratique

Quand un point de cette annexe entre en conflit avec le principe de petites PR atomiques ou avec le périmètre réel du MVP, la priorité reste :

1. préserver le noyau produit
2. rester compatible avec les imports / exports
3. avancer par incréments simples et réversibles
