# Roadmap produit mesurable — IDE Projects Manager

Cette feuille de route est la source canonique de la progression produit. Une
case cochée correspond à une capacité réellement disponible sur `main` ; une
case vide décrit un objectif accepté mais non encore livré. Les groupes servent
à organiser le travail : seules leurs cases les plus détaillées entrent dans le
calcul. Les références `#N` pointent vers les issues de ce dépôt.

Le calcul porte uniquement sur le périmètre accepté de la **première release
applicative `1.0.0`**. Les lots A à D décrivent des familles de capacités, pas
d'anciennes releases publiques qui auraient réellement existé. Les transports
entre appareils, l'import intelligent de dépôts et la personnalisation avancée
forment une roadmap ultérieure distincte.

Le tag de distribution prévu est `v1.0.0`. Il ne faut pas le confondre avec les
étapes méthodologiques d'un projet `v.0.0 → v.1.0`. L'absence d'un tag ou d'une
release publiée ne doit jamais être présentée comme une publication déjà faite.

| Périmètre | État | Critère principal |
|---|---|---|
| Lots A–D | Inclus dans `1.0.0` | Socle local-first, cockpit, sauvegardes et gouvernance. |
| Stabilisation | Incluse dans `1.0.0` | Thèmes, accessibilité, documentation, wiki et archive. |
| Axe A | Après `1.0.0` | Réconciliation sûre et transports facultatifs. |
| Axe B | Après `1.0.0` | Compréhension de projets, UFI/SUMP et méthode adaptable. |
| Axe C | Après `1.0.0` | Densité, disposition et personnalisation avancée. |

<!-- roadmap-progress:start -->

## Lot A — Socle local-first exploitable

- [x] Gouvernance et architecture frontend
  - [x] Règle une issue, une branche et une pull request (#1).
  - [x] Application shell et écrans organisés par fonctionnalités (#2, #3).
  - [x] Panneau latéral pour les vues complémentaires (#4).
  - [x] Déploiement statique par GitHub Pages.
- [x] Paramètres et internationalisation
  - [x] Modèle de paramètres, persistance et écran dédié (#5, #6, #7).
  - [x] Traductions françaises et anglaises de l'application (#8, #9, #10, #11).
  - [x] Dates et heures locales harmonisées sans modifier les dates ISO (#99).
- [x] Gestion quotidienne des projets
  - [x] Créer, rouvrir et supprimer plusieurs projets locaux.
  - [x] Renseigner titre, résumé, description et statut.
  - [x] Parcourir les étapes canoniques `v.0.0 → v.1.0` (#98).
  - [x] Documenter objectif, notes, livrable et définition de terminé.
  - [x] Capturer les actions dans le backlog.
  - [x] Conserver un journal daté et des décisions.
  - [x] Orienter les nouvelles idées avec l'arbre de décision.
  - [x] Gérer les références et pièces jointes textuelles (#15, #16, #17).
- [x] Lecture humaine et documentation
  - [x] Produire et télécharger un export Markdown (#12, #13, #14).
  - [x] Prévisualiser le document complet à côté de l'éditeur (#42).
  - [x] Proposer des guides utilisateur en français et en anglais (#91).
- [x] Données locales et sauvegarde autonome
  - [x] Créer un profil local et attribuer un propriétaire logique (#18, #19).
  - [x] Isoler la couche de stockage et utiliser IndexedDB (#20, #21, #22).
  - [x] Importer et exporter un projet individuel en JSON.
  - [x] Exporter tous les projets dans une sauvegarde JSON versionnée (#77).
  - [x] Prévisualiser et restaurer une sauvegarde sans écrasement silencieux (#81).
  - [x] Installer l'application comme PWA et conserver l'usage hors ligne.
  - [x] Préparer les métadonnées, conflits et badge de continuité (#23, #24, #25, #26).

## Lot B — Cockpit de pilotage et avancement vérifiable

- [x] Relier un projet à son dépôt public
  - [x] Définir les responsabilités IDE / dépôt / Project Steward (#61).
  - [x] Enregistrer un lien de dépôt compatible avec les anciens projets (#62).
  - [x] Définir le contrat d'intégration Project Steward (#63).
  - [x] Lire les dépôts GitHub publics sans jeton ni écriture (#64).
  - [x] Afficher les pull requests, validations et santé technique (#65).
  - [x] Rassembler décisions, blocages et validations dans l'inbox (#66).
  - [x] Distinguer l'origine des contributions et l'attention humaine (#67).
  - [x] Installer explicitement un projet IDE de démonstration (#88).
- [x] Réduire la friction du parcours projet
  - [x] Masquer les étapes futures encore entièrement vides (#90).
  - [x] Conserver un accès explicite au parcours complet (#90).
  - [x] Guider le remplissage des étapes sans tutoriel bloquant (#91).
  - [x] Afficher partout les versions au format `v.0.2` (#98).
- [x] Expliquer chaque pourcentage affiché
  - [x] Préserver une progression manuelle facultative de 0 à 100 % (#92).
  - [x] Compter uniquement les objectifs feuilles d'une roadmap mesurable (#105).
  - [x] Accepter une pondération explicite des objectifs lorsque nécessaire (#105).
  - [x] Utiliser d'abord la valeur manuelle, puis la roadmap, puis l'étape (#105).
  - [x] Afficher la source et le nombre d'objectifs réellement terminés (#105).
  - [x] Conserver le cache et le caractère périmé des données GitHub (#105).
  - [x] Reconnaître les variantes historiques du portfolio Sites (#105).
- [x] Transformer la collection en vrai cockpit portefeuille (#93)
  - [x] Choisir une présentation en grille ou en liste.
  - [x] Rechercher un projet par texte.
  - [x] Filtrer par statut, tags et catégorie.
  - [x] Filtrer les projets liés ou non à un dépôt.
  - [x] Filtrer selon l'attention humaine requise.
  - [x] Trier par titre, dernière mise à jour ou progression effective.
  - [x] Choisir l'ordre croissant ou décroissant.
  - [x] Afficher le nombre de résultats et réinitialiser les filtres.
  - [x] Conserver localement les préférences de présentation.
  - [x] Afficher le même avancement mesuré dans l'inbox et la collection.
- [x] Structurer les fronts de travail parallèles (#94, #95)
  - [x] Ajouter des chantiers facultatifs aux anciens et nouveaux projets (#94).
  - [x] Permettre des chantiers logiciels, scientifiques, associatifs ou personnels (#94).
  - [x] Créer, modifier, ordonner, archiver et réactiver un chantier (#95).
  - [x] Associer une action du backlog à un chantier et à une étape
    - [x] Conserver des références facultatives et diagnostiquer les liens invalides (#94).
    - [x] Modifier ces associations depuis l'interface du backlog (#95).
  - [x] Filtrer le backlog par chantier (#95).
  - [x] Présenter une matrice synthétique étapes × chantiers (#95).
  - [x] Adapter cette synthèse aux écrans mobiles (#95).
  - [x] Préserver les exports/imports et projets historiques (#94).

## Lot C — Sauvegardes portables et continuité personnelle

- [x] Isoler un fournisseur de sauvegarde portable (#82)
  - [x] Définir les capacités de lecture, écriture et diagnostic (#82).
  - [x] Conserver le téléchargement manuel comme repli universel (#82).
  - [x] Garder IndexedDB comme unique stockage de travail (#82).
- [x] Proposer un dossier local facultatif (#83)
  - [x] Détecter explicitement la compatibilité File System Access.
  - [x] Demander le choix volontaire d'un dossier.
  - [x] Expliquer, mémoriser et renouveler les permissions quand c'est possible.
  - [x] Continuer à fonctionner sans dossier ni installation supplémentaire.
- [x] Produire des instantanés sûrs par appareil (#84)
  - [x] Créer une identité locale d'appareil non secrète.
  - [x] Écrire des sauvegardes distinctes par appareil.
  - [x] Versionner et dater les instantanés JSON.
  - [x] Éviter les écritures concurrentes dans un fichier partagé.
- [x] Gérer les restaurations et divergences (#85)
  - [x] Détecter les sauvegardes inconnues ou plus récentes.
  - [x] Distinguer un descendant d'un état divergent.
  - [x] Expliquer l'origine, la date et l'impact avant application.
  - [x] Restaurer, importer comme copie ou ignorer explicitement.
- [x] Vérifier les appareils prioritaires et documenter les limites (#86)
  - [x] Confirmer le choix de dossier et l'écriture JSON sous Windows/PWA.
  - [x] Confirmer le choix de dossier et l'écriture JSON sous Android.
  - [x] Documenter un parcours autonome sans logiciel complémentaire.
  - [x] Expliquer qu'un dossier ne se synchronise pas seul entre appareils.

## Lot D — Gouvernance avancée des projets liés

- [x] Préparer un projet gouverné depuis AI Project Template (#68)
  - [x] Conserver la création immédiate d'une idée purement locale.
  - [x] Préparer un mandat et un identifiant de projet explicites.
  - [x] Générer un ensemble de fichiers relisibles avant toute création de dépôt.
  - [x] Relier explicitement le dépôt canonique et Project Steward.
- [x] Concevoir l'accès en lecture aux dépôts privés (#69)
  - [x] Comparer les modèles de confiance et documenter la décision de sécurité.
  - [x] Exclure tout secret du code, du build, des exports et des logs.
  - [x] Permettre une autorisation explicite, minimale et révocable.
  - [x] Conserver l'usage public et hors ligne sans authentification.

## Stabilisation de la première release `1.0.0`

- [x] Offrir un tableau de bord lisible sur grand écran (#118)
  - [x] Supprimer la colonne vide lorsque l'aperçu Markdown est absent.
  - [x] Élargir uniquement le tableau de bord et conserver le comportement mobile.
- [x] Garantir une qualité vérifiable avant distribution (#120)
  - [x] Exclure les fichiers PWA générés des contrôles de code.
  - [x] Exécuter sans erreur le lint global, les tests et le build.
- [x] Rendre les thèmes réellement fonctionnels (#122)
  - [x] Choisir automatiquement le thème du système.
  - [x] Appliquer explicitement le thème sombre ou clair.
  - [x] Conserver les préférences historiques et les libellés français/anglais.
- [x] Proposer les réglages essentiels d'accessibilité (#124)
  - [x] Ajuster la taille du texte sans dépasser les limites prévues.
  - [x] Renforcer le contraste des deux thèmes.
  - [x] Respecter ou réduire explicitement les animations.
  - [x] Proposer un accès direct clavier au contenu principal.
- [x] Aligner la documentation et les preuves disponibles (#126)
  - [x] Décrire la structure et l'autorité de chaque famille documentaire.
  - [x] Distinguer les validations Windows/Android observées des tests reportés.
  - [x] Séparer les axes A, B et C de la release `1.0.0`.
  - [x] Définir les cas pilotes UFI et SUMP sans modifier leurs dépôts.
- [ ] Préparer la diffusion publique
  - [x] Publier un miroir wiki utilisateur depuis les documents canoniques (#128).
  - [x] Identifier l'application distribuée sous son nom et sa version `1.0.0` (#130).
  - [ ] Produire une archive statique téléchargeable et son contrôle SHA-256.

<!-- roadmap-progress:end -->

## Après `1.0.0` — objectifs visibles hors périmètre mesuré

- [ ] **A — Réconciliation et transports** : partage natif Windows/Android,
  relais Raspberry Pi/WebDAV, QR/WebRTC puis connecteurs cloud facultatifs.
- [ ] **B — Méthode et compréhension de projets** : import public en lecture
  seule, cas pilotes UFI et SUMP, profils et cycles après `v.1.0`.
- [ ] **C — Interface et personnalisation** : densité, placement contrôlé,
  redimensionnement des panneaux et accessibilité complémentaire.
- [ ] **Validation différée** : navigateur sans sélection de dossier, scénario
  physique de divergence et transfert réel entre deux appareils.
- [ ] **Conteneur `.ipm` facultatif** : ZIP ouvert et documenté uniquement si
  de vraies pièces jointes binaires rendent le JSON insuffisant.

Le détail mesurable de chaque front se trouve dans la
[roadmap après la version 1.0](docs/roadmaps/post-v1-evolution-roadmap.md).

## Méthode de mesure

Une case sans sous-case vaut un objectif. Une case parente sert uniquement à
regrouper ses sous-objectifs et n'est pas comptée une seconde fois. Le poids
vaut `1` par défaut ; un objectif majeur peut déclarer un multiplicateur
explicite à la fin de sa ligne :

```markdown
- [x] Objectif terminé <!-- weight:2 -->
- [ ] Objectif encore ouvert <!-- weight:3 -->
```

La formule est `somme(poids des objectifs terminés) / somme(poids de tous les
objectifs)`, arrondie au pourcentage entier le plus proche. Les exemples dans
un bloc de code ne comptent jamais. Un pourcentage manuel saisi dans l'IDE reste
prioritaire ; sans roadmap mesurable, l'étape `v.0.4` fournit seulement une
estimation de `40 %`.

## Exclusions confirmées

Le produit n'impose ni compte applicatif distant, ni collaboration
multi-utilisateur, ni invitations/permissions par phase, ni backend obligatoire,
ni Syncthing, ni écrasement automatique des données locales. Ces exclusions ne
sont pas des objectifs manquants et n'entrent donc pas dans le pourcentage.
