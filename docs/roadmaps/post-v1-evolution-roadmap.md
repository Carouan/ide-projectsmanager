# Roadmap après la version 1.0

Cette feuille de route décrit les fonctionnalités **acceptées mais non encore
livrées** après la première release `1.0.0`. Ses objectifs ne diminuent pas le
pourcentage du périmètre `1.0.0` dans la [roadmap canonique](../../ROADMAP.md).
Chaque réalisation doit conserver sa propre issue, sa propre branche et sa
propre pull request.

La décision de référence est
[DR-006](../decisions/DR-006-first-release-and-post-release-evolution.md).

## A — Continuité entre appareils et transports facultatifs

- [ ] A1 — Réconciliation sûre des instantanés
  - [x] Identifier les projets identiques par leur identifiant stable (#134).
  - [x] Détecter les projets ajoutés sur un seul appareil (#134).
  - [x] Distinguer une modification unilatérale d'un conflit réel (#134).
  - [x] Distinguer les champs modifiés et leur provenance dans l'analyse (#134).
  - [x] Reconnaître explicitement les suppressions vérifiables (#134).
  - [x] Comparer les éléments du backlog, du journal et des décisions (#134).
  - [x] Prévisualiser toutes les décisions avant application (#136).
  - [ ] Garantir une annulation sans modification locale.
- [ ] A2 — Partage natif Windows / Android
  - [ ] Détecter les capacités réelles de partage du navigateur.
  - [ ] Partager manuellement un instantané depuis Windows.
  - [ ] Partager manuellement un instantané depuis Android.
  - [ ] Importer le fichier partagé dans le parcours de réconciliation.
  - [ ] Documenter les limites de transfert et l'absence de synchronisation implicite.
- [ ] A3 — Relais Raspberry Pi / WebDAV facultatif
  - [ ] Décrire l'architecture minimale et les frontières de confiance.
  - [ ] Définir la découverte ou configuration explicite du relais.
  - [ ] Séparer les identifiants d'appareil et les dossiers distants.
  - [ ] Tester lecture, écriture, indisponibilité et révocation.
  - [ ] Préserver le fonctionnement autonome sans relais.
- [ ] A4 — Appairage direct QR / WebRTC
  - [ ] Définir un appairage explicite et temporaire.
  - [ ] Générer et lire un QR code d'invitation.
  - [ ] Échanger un instantané entre appareils connectés.
  - [ ] Expliquer les limites ICE/STUN/TURN.
  - [ ] Appliquer le même moteur de réconciliation.
- [ ] A5 — Fournisseurs cloud optionnels
  - [ ] Comparer Google Drive, OneDrive et WebDAV.
  - [ ] Définir permissions, expiration et révocation.
  - [ ] Préserver l'absence de compte obligatoire.
- [ ] A6 — Conteneur ZIP `.ipm` si des binaires deviennent nécessaires
  - [ ] Définir un manifeste versionné et documenté.
  - [ ] Inclure le document projet JSON inchangé.
  - [ ] Ajouter les pièces jointes binaires sous des chemins sûrs.
  - [ ] Vérifier tailles, intégrité et compatibilité ZIP standard.
  - [ ] Conserver l'import/export JSON autonome.

## B — Méthode projet et import de projets existants

- [ ] B1 — Analyse de dépôt public en lecture seule
  - [ ] Valider une URL GitHub publique sans accepter une autre origine.
  - [ ] Lire la description, le README et une roadmap éventuelle.
  - [ ] Identifier les objectifs explicites et leur hiérarchie.
  - [ ] Distinguer une roadmap formelle d'une checklist seulement indicative.
  - [ ] Compter les objectifs feuilles sans double comptage.
  - [ ] Conserver la provenance et un niveau de confiance.
- [ ] B2 — Prévisualisation et adaptation au canevas IDE
  - [ ] Proposer titre, résumé, description et dépôt canonique.
  - [ ] Proposer une étape compatible avec les preuves observées.
  - [ ] Proposer des chantiers sans écraser leur structure d'origine.
  - [ ] Proposer un backlog traçable vers les objectifs sources.
  - [ ] Autoriser correction, annulation et validation humaines.
  - [ ] Créer uniquement un projet local après confirmation.
- [ ] B3 — Valider les deux cas pilotes
  - [ ] Intégrer UFI comme projet distinct à formaliser.
  - [ ] Analyser les cases imbriquées du README de SUMP.
  - [ ] Distinguer ses 21 objectifs feuilles de ses 27 lignes cochables.
  - [ ] Conserver son organisation existante et les liens de provenance.
  - [ ] Vérifier qu'aucun dépôt source n'est modifié.
- [ ] B4 — Parcours et domaines
  - [ ] Définir un parcours idée rapide.
  - [ ] Définir un parcours projet standard.
  - [ ] Définir un parcours projet gouverné.
  - [ ] Adapter les suggestions aux projets scientifiques.
  - [ ] Adapter les suggestions aux projets associatifs.
  - [ ] Adapter les suggestions aux projets personnels.
- [ ] B5 — Continuité après `v.1.0`
  - [ ] Décrire maintenance, évolution et nouveau cycle.
  - [ ] Préserver l'historique du premier cycle.
  - [ ] Définir jalons ultérieurs et sous-projets liés.

## C — Interface et personnalisation

- [ ] C1 — Densité de lecture et préférences visuelles
  - [ ] Rendre fonctionnelle la densité déjà présente dans les paramètres.
  - [ ] Conserver les thèmes et contrastes accessibles.
  - [ ] Vérifier la lisibilité sur mobile et desktop.
- [ ] C2 — Disposition contrôlée des panneaux
  - [ ] Définir les zones de placement autorisées.
  - [ ] Déplacer un panneau sans masquer les fonctions critiques.
  - [ ] Réordonner les sections du tableau de bord.
  - [ ] Sauvegarder les préférences locales de disposition.
  - [ ] Permettre un retour à la disposition par défaut.
- [ ] C3 — Redimensionnement et fonctionnalités complémentaires
  - [ ] Redimensionner le panneau Markdown dans des limites accessibles.
  - [ ] Conserver un mode mobile stable.
  - [ ] Étudier une lecture vocale facultative.
  - [ ] Évaluer les autres besoins d'accessibilité réels.

## Contrôles différés indépendants

- [ ] Tester un navigateur ne prenant pas en charge la sélection de dossier.
- [ ] Tester la restauration complète sur deux appareils physiques.
- [ ] Tester une vraie divergence sur deux appareils physiques.
- [ ] Tester au moins un transport de fichiers réellement partagé.
