# Roadmap — Sauvegarde autonome et transports facultatifs

Cette roadmap applique
[DR-002](../decisions/DR-002-local-first-syncthing-backup-architecture.md).
Elle remplace l'idée imprécise d'un « backend de synchronisation » par de
petites étapes testables, sans changer la source de vérité locale ni imposer de
logiciel compagnon.

## Résultat recherché

Une personne peut :

- continuer à travailler hors ligne avec IndexedDB ;
- sauvegarder et restaurer tout son portefeuille ;
- utiliser le flux manuel sans compte ni installation ;
- sélectionner facultativement un dossier local lorsque le navigateur le permet ;
- utiliser facultativement Syncthing ou un autre transport pour retrouver les instantanés sur un autre appareil ;
- être avertie avant toute restauration ou divergence ;
- revenir à l'import/export manuel sur un navigateur non compatible.

## Hors périmètre

- comptes distants et authentification applicative ;
- invitations, rôles et autorisations par projet ou phase ;
- collaboration en temps réel ;
- fusion automatique champ par champ ;
- daemon ou service d'arrière-plan fourni par l'IDE ;
- pièces jointes binaires dans la première itération.

## Ordre d'exécution

### R1.7 — Restaurer un bundle global

Compléter la sauvegarde globale déjà livrée par un import sûr : validation du wrapper, choix explicite de la stratégie et absence d'écrasement silencieux.

Ce ticket est le prérequis fonctionnel de toutes les étapes suivantes : tout
transport ne fait que déplacer des sauvegardes que l'application doit d'abord
savoir restaurer correctement.

### S1.1 — Introduire un fournisseur de sauvegarde portable

Définir une petite interface indépendante du transport pour :

- écrire un instantané ;
- lister ou lire les instantanés connus ;
- signaler capacité, permission et erreur ;
- conserver le téléchargement manuel comme fournisseur de repli.

Cette abstraction ne remplace ni le repository IndexedDB ni l'adaptateur GitHub de suivi des dépôts.

### S1.2 — Ajouter l'adaptateur de dossier sélectionné

Utiliser l'API File System Access comme amélioration progressive :

- détection de capacité ;
- sélection explicite d'un dossier en lecture/écriture ;
- mémorisation sûre du handle lorsque possible ;
- renouvellement clair des permissions ;
- fallback manuel ailleurs.

Première cible : Chrome/Edge sous Windows. Deuxième cible : Chrome Android sur Galaxy S23.

### S1.3 — Écrire des instantanés propres à chaque appareil

Créer une identité locale d'appareil non secrète et écrire un `latest.json` par appareil. Déclencher l'écriture sur sauvegarde logique ou après un délai court, uniquement lorsque l'application est ouverte et autorisée.

L'instantané doit être atomique autant que le permet l'API et ne doit pas modifier le format interne de chaque `ProjectDocument` sans migration dédiée.

### S1.4 — Détecter restauration et divergence

À l'ouverture ou sur action manuelle :

- détecter un instantané inconnu ou plus récent ;
- distinguer un descendant d'une divergence ;
- afficher la source, la date et l'impact ;
- proposer restaurer, importer comme copie ou ignorer ;
- ne jamais écraser silencieusement.

### S1.5 — Valider les modes de sauvegarde Windows/Android

Fournir un guide court qui commence par le parcours autonome :

- export et restauration manuels sans installation ;
- sélection dans l'IDE ;
- restauration sur un deuxième appareil ;
- renouvellement des permissions ;
- scénario de conflit ;
- désactivation et retour à l'import/export manuel ;
- configuration facultative d'au moins un transport de dossier, par exemple
  Syncthing, dans une section clairement séparée.

La validation doit inclure une matrice Chrome/Edge Windows, Chrome Android, un
navigateur sans File System Access, le parcours sans installation et au moins
un transport facultatif.

### S2.1 — Définir le format `.ipm` avec pièces jointes

Étape ultérieure, après retour d'expérience sur la synchronisation JSON : conteneur versionné, manifeste, projets, blobs identifiés par hash et migrations. Ne pas commencer avant stabilisation de S1.

## Dépendances

```text
R1.7 -> S1.1 -> S1.2 -> S1.3 -> S1.4 -> S1.5 -> S2.1
```

## Principes de validation communs

- une issue, une branche et une PR par incrément ;
- tests ciblés de sérialisation, permissions et conflits ;
- build et lint avant PR ;
- compatibilité ascendante des exports ;
- aucune perte silencieuse de données ;
- aucune promesse de support non vérifiée sur un navigateur.

## Place des chantiers GitHub / Project Steward

Les fonctionnalités de cockpit GitHub déjà livrées restent indépendantes de cette roadmap. Les tickets de création de dépôt gouverné et d'accès sécurisé aux dépôts privés peuvent continuer après le socle de restauration, mais ne doivent pas introduire de compte applicatif multi-utilisateur.
