# Roadmap — Sauvegarde autonome et transports facultatifs

Cette roadmap applique
[DR-002](../decisions/DR-002-local-first-syncthing-backup-architecture.md).
Elle remplace l'idée imprécise d'un « backend de synchronisation » par de
petites étapes testables, sans changer la source de vérité locale ni imposer de
logiciel compagnon.

La [roadmap produit canonique](../../ROADMAP.md) porte le pourcentage global.
Ce document détaille les preuves spécifiques au chantier de sauvegarde : une
case cochée décrit un comportement déjà livré, une case vide reste à réaliser.

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

- [x] Exporter un bundle JSON versionné contenant tous les projets (#77).
- [x] Valider le wrapper, sa version et le nombre de projets (#81).
- [x] Prévisualiser projets nouveaux et identifiants en conflit (#81).
- [x] Ignorer explicitement les conflits ou les importer comme copies (#81).
- [x] Refuser tout écrasement silencieux et conserver l'import individuel (#81).

### S1.1 — Introduire un fournisseur de sauvegarde portable

Définir une petite interface indépendante du transport pour :

- [x] Écrire un instantané via un contrat indépendant du transport (#82).
- [x] Lister ou lire les instantanés connus (#82).
- [x] Signaler capacité, permission et erreur (#82).
- [x] Conserver le téléchargement manuel comme fournisseur de repli (#82).

Cette abstraction ne remplace ni le repository IndexedDB ni l'adaptateur GitHub de suivi des dépôts.

Implémentation livrée :

- `portableBackupProvider.js` normalise disponibilité, permission, capacités et
  erreurs des adaptateurs ;
- `portableBackupService.js` fournit les opérations d'écriture, de liste et de
  lecture sans connaître le transport ;
- `manualDownloadBackupProvider.js` branche le téléchargement et l'import JSON
  existants comme repli explicite disponible dans tous les navigateurs pris en
  charge ;
- aucun accès direct au système de fichiers n'est encore introduit.

### S1.2 — Ajouter l'adaptateur de dossier sélectionné

Utiliser l'API File System Access comme amélioration progressive :

- [x] Détecter la compatibilité de File System Access (#83).
- [x] Demander la sélection explicite d'un dossier en lecture/écriture (#83).
- [x] Mémoriser le handle uniquement lorsque c'est sûr et supporté (#83).
- [x] Expliquer et renouveler clairement les permissions (#83).
- [x] Maintenir le fallback manuel partout ailleurs (#83).

Implémentation livrée :

- `selectedFolderBackupProvider.js` détecte l'API disponible, demande un choix
  explicite et expose lecture, écriture, liste et état des permissions ;
- le handle est mémorisé uniquement par clonage structuré dans IndexedDB lorsque
  le navigateur l'autorise, jamais dans `localStorage` ni dans les exports ;
- **Paramètres → Dossier local de sauvegarde** permet de choisir, changer,
  réautoriser ou déconnecter le dossier et de déclencher une sauvegarde ;
- un navigateur incompatible conserve intégralement le téléchargement et
  l'import JSON manuels ; aucune autorisation n'est demandée en arrière-plan.

Première cible : Chrome/Edge sous Windows. Deuxième cible : Chrome Android sur Galaxy S23.

### S1.3 — Écrire des instantanés propres à chaque appareil

Créer une identité locale d'appareil non secrète et écrire un `latest.json` par appareil. Déclencher l'écriture sur sauvegarde logique ou après un délai court, uniquement lorsque l'application est ouverte et autorisée.

L'instantané doit être atomique autant que le permet l'API et ne doit pas modifier le format interne de chaque `ProjectDocument` sans migration dédiée.

- [x] Générer un identifiant local d'appareil non secret (#84).
- [x] Produire un espace d'instantané distinct par appareil (#84).
- [x] Versionner et dater chaque sauvegarde JSON (#84).
- [x] Écrire uniquement lorsque l'application est ouverte et autorisée (#84).
- [x] Préserver la structure de tous les `ProjectDocument` historiques (#84).

Implémentation livrée :

- `portableBackupSnapshots.js` crée et valide un instantané versionné contenant
  son identifiant, la date, l'appareil, le parent connu et le bundle JSON intact ;
- chaque navigateur autorisé écrit exclusivement son propre fichier
  `snapshots/<device-id>/latest.json` dans le dossier explicitement sélectionné ;
- l'identité aléatoire de l'appareil est locale, non secrète et indépendante de
  tout compte, nom d'hôte, navigateur ou profil utilisateur ;
- l'écriture utilise le flux transactionnel du navigateur et annule un flux
  interrompu afin de conserver autant que possible le dernier fichier valide ;
- la sauvegarde n'est déclenchée que par l'action explicite de l'utilisateur,
  application ouverte et permission accordée ; l'export manuel reste inchangé.

### S1.4 — Détecter restauration et divergence

À l'ouverture ou sur action manuelle :

- [x] Détecter un instantané inconnu ou plus récent (#85).
- [x] Distinguer un descendant d'une divergence (#85).
- [x] Afficher la source, la date et l'impact avant décision (#85).
- [x] Proposer restaurer, importer comme copie ou ignorer (#85).
- [x] Vérifier qu'aucune branche n'écrase silencieusement les données (#85).

Implémentation livrée :

- `portableBackupReview.js` compare les identifiants d'instantanés et leur
  filiation explicite ; une date récente ne prouve jamais seule une descendance ;
- les états identique, descendant, antérieur, divergent, inconnu et illisible
  sont distingués sans appliquer de changement au portefeuille local ;
- **Paramètres → Sauvegardes des autres appareils** affiche appareil, date,
  projets nouveaux, projets remplacés et projets absents avant toute décision ;
- importer comme copies conserve les projets existants ; remplacer le portefeuille
  exige une case de confirmation explicite puis une deuxième action volontaire ;
- conserver l'état local mémorise la décision, ignorer la diffère, et une
  sauvegarde invalide demeure visible sans jamais être appliquée.

### S1.5 — Valider les modes de sauvegarde Windows/Android

Fournir un guide court qui commence par le parcours autonome :

- [ ] Tester export et restauration manuels sans installation (#86).
- [ ] Tester la sélection d'un dossier dans l'IDE (#86).
- [ ] Tester une restauration sur un deuxième appareil (#86).
- [ ] Tester le renouvellement des permissions (#86).
- [ ] Tester un scénario de divergence ou de conflit (#86).
- [ ] Tester la désactivation et le retour à l'import/export manuel (#86).
- [x] Documenter séparément un transport facultatif, par exemple Syncthing (#86).
- [ ] Publier la matrice réelle Chrome/Edge Windows et Chrome Android (#86).

Le [guide de sauvegarde et sa matrice de validation](../portable-backup-user-guide.md)
documentent le parcours autonome sans installation, le dossier facultatif, les
permissions, les conflits et le transport externe optionnel. Ils distinguent
explicitement les scénarios déjà couverts par les tests automatisés des essais
sur appareils physiques qui restent à réaliser. L'issue #86 demeure ouverte
tant que ces résultats réels ne sont pas observés.

La validation doit inclure une matrice Chrome/Edge Windows, Chrome Android, un
navigateur sans File System Access, le parcours sans installation et au moins
un transport facultatif.

### S2.1 — Définir le format `.ipm` avec pièces jointes

Étape ultérieure, après retour d'expérience sur la synchronisation JSON : conteneur versionné, manifeste, projets, blobs identifiés par hash et migrations. Ne pas commencer avant stabilisation de S1.

- [ ] Définir un manifeste versionné et une stratégie de migration.
- [ ] Inclure projets JSON et pièces jointes binaires identifiées par hash.
- [ ] Vérifier l'intégrité et la compatibilité ascendante avant import.

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
