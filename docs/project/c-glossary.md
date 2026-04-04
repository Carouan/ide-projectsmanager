# C — Explications et glossaire

Ce document sert d’onboarding, de clarification terminologique et de référence rapide.

## IDE de projet personnel

Ici, “IDE” ne veut pas dire IDE de code classique.

Il désigne un **environnement intégré de gestion et de structuration de projet**.

Il sert à :

- cadrer
- suivre
- documenter
- exporter
- reprendre un projet plus tard

## ProjectDocument

Le **ProjectDocument** est le document racine d’un projet.

C’est la vraie unité de travail. L’interface React ne fait que l’éditer.

Structure typique :

```json
{
  "schemaVersion": "1.0",
  "project": {},
  "stages": {},
  "backlog": [],
  "journal": [],
  "decisions": [],
  "attachments": [],
  "settings": {},
  "sync": {}
}
```

## MVP

Dans ce projet, le **MVP** désigne la plus petite version capable de démontrer que l’outil a une valeur réelle.

Ce n’est pas :

- une maquette cosmétique
- une version parfaite
- une version déjà cloud / collaborative / enterprise

C’est :

- une version exploitable
- une version qui prouve la logique du produit
- une version volontairement limitée

## Stages

Les **stages** sont les étapes `v0.0 → v1.0`.

Elles servent à suivre l’avancement avec une logique de cycle.

Exemples :

- `v0.0` = problème initial
- `v0.2` = formalisation du MVP
- `v0.4` = assemblage
- `v1.0` = première release fonctionnelle

## Backlog

Le **backlog** contient ce qui doit être capturé sans interrompre le flux principal :

- idées futures
- améliorations
- tâches non prioritaires
- chantiers reportés

Formule utile : **capturer sans dériver**.

## Journal

Le **journal** est la mémoire chronologique du projet.

Il répond à la question : **qu’est-ce qui s’est passé, quand, et pourquoi ?**

Il sert à noter :

- décisions
- comptes-rendus de session
- pistes de réflexion
- extraits utiles
- impacts constatés

## Décisions

Le bloc **décisions** formalise les arbitrages importants :

- contexte
- décision retenue
- conséquences

Quand la décision mérite une trace durable, elle peut devenir une **ADR**.

## Attachments v1

Les **attachments** sont des pièces jointes légères ou des références structurées liées à un projet.

Types actuellement prévus :

- `url`
- `note`
- `snippet`
- `file_ref`

Ce ne sont pas encore de vrais binaires gérés comme dans une application desktop complète.

## Settings

Les **settings** sont les préférences d’interface et de comportement.

Exemples :

- langue
- thème
- preview Markdown
- densité UI
- format d’export
- autosave

Un réglage peut être présent dans le modèle sans être encore pleinement exploité dans l’UI.

## Preview Markdown

Le **preview Markdown** est le panneau d’aperçu latéral.

Historique important :

- preview minimal
- puis preview de l’étape active
- puis preview du projet complet via le même export que le téléchargement

Conséquence : un switch **étape / export complet** devient un vrai besoin fonctionnel.

## PWA

**PWA** signifie *Progressive Web App*.

Dans ce projet, cela veut dire :

- installable
- utilisable comme app locale
- service worker
- prompt d’update

## localStorage et IndexedDB

- `localStorage` : simple, rapide, mais limité
- `IndexedDB` : plus robuste pour une app qui évolue

Le projet utilise désormais **IndexedDB comme stockage principal** avec fallback legacy.

## Repository de stockage

La couche repository sert à découpler le store du détail technique `localStorage vs IndexedDB`.

Cela facilite :

- migration
- test
- évolution future

## UserProfile local

Le **profil utilisateur local** est une identité minimale créée côté client.

Il sert à :

- identifier le propriétaire logique local
- préparer `ownerId`
- préparer la suite sync / multi-user

## ownerId

`ownerId` est l’identifiant persistant du propriétaire logique d’un projet.

Il remplace une logique plus floue de simple nom affiché.

## Métadonnées de synchronisation

Le bloc `sync` contient des informations minimales comme :

- `localVersion`
- `remoteVersion`
- `lastSyncedAt`
- `dirty`

Il prépare une synchronisation future sans signifier qu’elle est déjà pleinement active.

## Readiness ops

**Readiness ops** = niveau de préparation du produit pour être exploité dans des conditions plus sérieuses :

- sauvegarde / restauration
- états d’erreur visibles
- robustesse de persistance
- préparation maintenance
- comportements sûrs en cas de panne

## ADR

**ADR** signifie *Architecture Decision Record*.

Structure courte typique :

- contexte
- décision
- alternatives
- conséquences

Exemples adaptés au projet :

- React + PWA plutôt que backend immédiat
- IndexedDB plutôt que localStorage seul
- preview projet complet plutôt que preview d’étape uniquement

## QuadraFrame

**QuadraFrame** est la logique méthodologique A / B / C / D.

Dans ce projet :

- **A** = historique, vision, arbitrages, roadmap
- **B** = architecture, implémentation, workflow technique
- **C** = explications, onboarding, glossaire
- **D** = export vivant du projet

## Chemin de travail par défaut

Le **chemin de travail par défaut** est le dossier préféré où l’utilisateur souhaite ranger imports, exports, attachments et backups.

Dans une simple web app, ce chemin n’est pas manipulable comme dans une application desktop native sans API spécifique supplémentaire du navigateur.
