# Roadmap produit mesurable — IDE Projects Manager

Cette feuille de route est la source canonique de la progression produit. Une
case cochée correspond à une capacité réellement disponible sur `main` ; une
case vide décrit un objectif accepté mais non encore livré. Les groupes servent
à organiser le travail : seules leurs cases les plus détaillées entrent dans le
calcul. Les références `#N` pointent vers les issues de ce dépôt.

Le calcul porte uniquement sur les releases A à D, qui correspondent au périmètre
produit accepté. Les explorations non engagées de la release E sont visibles
pour mémoire mais ne dégradent pas artificiellement le pourcentage.

Les releases ci-dessous sont des **cibles de livraison semver planifiées**, pas
des tags Git ni des releases GitHub déjà publiées. Le cycle méthodologique d'un
projet `v.0.0 → v.1.0` reste distinct de la version distribuée de
l'application : par exemple, une application `0.2.0` peut piloter un projet
actuellement à l'étape `v.0.7`.

| Cible applicative | Jalon | Critère principal |
|---|---|---|
| `0.1.0` | Release A | Socle local-first, PWA, projets et sauvegarde JSON sûre. |
| `0.2.0` | Release B | Dashboard exploitable, progression vérifiable et chantiers parallèles. |
| `0.3.0` | Release C | Sauvegardes portables et continuité Windows / Android. |
| `0.4.0` | Release D | Projets gouvernés et stratégie sûre pour les dépôts privés. |
| `1.0.0` | Horizon E | Stabilisation ultérieure après arbitrage des explorations. |

<!-- roadmap-progress:start -->

## Release A — cible `0.1.0` — Socle local-first exploitable

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

## Release B — cible `0.2.0` — Cockpit de pilotage et avancement vérifiable

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
- [ ] Structurer les fronts de travail parallèles (#94, #95)
  - [ ] Ajouter des chantiers facultatifs aux anciens et nouveaux projets.
  - [ ] Permettre des chantiers logiciels, scientifiques, associatifs ou personnels.
  - [ ] Créer, modifier, ordonner, archiver et réactiver un chantier.
  - [ ] Associer une action du backlog à un chantier et à une étape.
  - [ ] Filtrer le backlog par chantier.
  - [ ] Présenter une matrice synthétique étapes × chantiers.
  - [ ] Adapter cette synthèse aux écrans mobiles.
  - [ ] Préserver les exports/imports et projets historiques.

## Release C — cible `0.3.0` — Sauvegardes portables et continuité personnelle

- [ ] Isoler un fournisseur de sauvegarde portable (#82)
  - [ ] Définir les capacités de lecture, écriture et diagnostic.
  - [ ] Conserver le téléchargement manuel comme repli universel.
  - [ ] Garder IndexedDB comme unique stockage de travail.
- [ ] Proposer un dossier local facultatif (#83)
  - [ ] Détecter explicitement la compatibilité File System Access.
  - [ ] Demander le choix volontaire d'un dossier.
  - [ ] Expliquer, mémoriser et renouveler les permissions quand c'est possible.
  - [ ] Continuer à fonctionner sans dossier ni installation supplémentaire.
- [ ] Produire des instantanés sûrs par appareil (#84)
  - [ ] Créer une identité locale d'appareil non secrète.
  - [ ] Écrire des sauvegardes distinctes par appareil.
  - [ ] Versionner et dater les instantanés JSON.
  - [ ] Éviter les écritures concurrentes dans un fichier partagé.
- [ ] Gérer les restaurations et divergences (#85)
  - [ ] Détecter les sauvegardes inconnues ou plus récentes.
  - [ ] Distinguer un descendant d'un état divergent.
  - [ ] Expliquer l'origine, la date et l'impact avant application.
  - [ ] Restaurer, importer comme copie ou ignorer explicitement.
- [ ] Valider Windows, Android et les replis (#86)
  - [ ] Vérifier Chrome/Edge sous Windows.
  - [ ] Vérifier Chrome Android sur les appareils réellement visés.
  - [ ] Vérifier un navigateur sans accès facultatif au dossier.
  - [ ] Documenter un parcours autonome sans logiciel complémentaire.
  - [ ] Documenter Syncthing comme transport externe facultatif.

## Release D — cible `0.4.0` — Gouvernance avancée des projets liés

- [ ] Préparer un projet gouverné depuis AI Project Template (#68)
  - [ ] Conserver la création immédiate d'une idée purement locale.
  - [ ] Préparer un mandat et un identifiant de projet explicites.
  - [ ] Générer un ensemble de fichiers relisibles avant toute création de dépôt.
  - [ ] Relier explicitement le dépôt canonique et Project Steward.
- [ ] Concevoir l'accès en lecture aux dépôts privés (#69)
  - [ ] Comparer les modèles de confiance et documenter la décision de sécurité.
  - [ ] Exclure tout secret du code, du build, des exports et des logs.
  - [ ] Permettre une autorisation explicite, minimale et révocable.
  - [ ] Conserver l'usage public et hors ligne sans authentification.

<!-- roadmap-progress:end -->

## Horizon E — cible `1.0.0` — Explorations ultérieures non engagées

- [ ] Définir un conteneur `.ipm` versionné après stabilisation de S1.
- [ ] Intégrer des pièces jointes binaires avec manifeste et intégrité.
- [ ] Étudier WebDAV ou un fournisseur de fichiers cloud facultatif.
- [ ] Étudier un transfert direct entre appareils sans service obligatoire.
- [ ] Évaluer séparément WebRTC, QR animés ou un outil de partage local.
- [ ] Définir la continuité d'un projet après son étape `v.1.0`.
- [ ] Clarifier les niveaux de complexité et les parcours hors informatique.
- [ ] Capturer UFI comme projet distinct sans l'implémenter dans l'IDE.

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
