# Sauvegardes personnelles : guide et matrice de validation

IDE-projectsmanager fonctionne seul dans le navigateur. Aucun compte, service,
logiciel compagnon ou synchroniseur n'est nécessaire pour sauvegarder puis
restaurer ses projets. Le dossier facultatif et un éventuel transport externe
constituent deux options séparées.

## 1. Parcours autonome, sans aucune installation

### Sauvegarder tous les projets

1. Ouvrir **Paramètres** dans IDE-projectsmanager.
2. Dans **Exporter tous les projets**, sélectionner **Télécharger la sauvegarde
   complète**.
3. Conserver le fichier JSON téléchargé dans un emplacement de son choix.
4. Si nécessaire, copier ce fichier sur un autre appareil avec un moyen déjà
   disponible : clé USB, partage de fichiers, dossier personnel ou autre.

Ce fichier contient le portefeuille global versionné et les projets existants.
Il ne contient ni autorisation GitHub, ni référence de dossier navigateur, ni
secret d'appareil.

### Restaurer la sauvegarde sur cet appareil ou sur un autre

1. Ouvrir l'application puis **Paramètres** sur l'appareil de destination.
2. Dans **Restaurer tous les projets**, sélectionner **Choisir une sauvegarde
   JSON** et désigner le fichier téléchargé.
3. Vérifier l'aperçu : nombre de projets, nouvelles entrées et conflits.
4. Pour chaque conflit, choisir entre conserver la version locale ou importer la
   version externe comme copie.
5. Déclencher explicitement la restauration.

Cette procédure ne remplace jamais silencieusement un projet existant. Elle
reste disponible si l'accès direct à un dossier est absent, refusé ou révoqué.

## 2. Dossier local facultatif

L'option **Paramètres → Dossier local de sauvegarde** dépend à la fois du
navigateur, du système, du contexte sécurisé et des permissions effectives. Son
affichage ne signifie pas que tous les navigateurs ou tous les appareils Android
permettent réellement la sélection d'un dossier.

Si le sélecteur échoue, l'IDE distingue désormais une annulation ou un dossier
sensible (`AbortError`), un blocage du contexte de sécurité (`SecurityError`),
un refus de permission (`NotAllowedError`) et un paramètre interne invalide
(`TypeError`). Dans tous les cas, l'export et la restauration JSON manuels
restent disponibles. Sous Chrome, choisir un sous-dossier dédié dans
**Documents** ou **Téléchargements** plutôt qu'une racine ou un dossier système.

1. Vérifier que le panneau indique **Aucun dossier connecté**, et non **Dossier
   direct non pris en charge**.
2. Sélectionner **Choisir un dossier**, puis désigner volontairement un dossier.
3. Si le navigateur le demande, autoriser sa lecture et son écriture.
4. Vérifier le nom du dossier, l'identité locale de l'appareil et l'état
   **Dossier autorisé**.
5. Sélectionner **Sauvegarder cet appareil dans le dossier**.
6. Vérifier la présence de `snapshots/<device-id>/latest.json` dans le dossier.

Chaque appareil écrit uniquement son propre `latest.json`. L'identité locale
est aléatoire et ne contient ni compte, ni nom d'hôte, ni secret. Le dossier ne
se synchronise pas lui-même. Rien n'est écrit lorsque l'application est fermée.

### Renouveler ou retirer l'autorisation

- Si le panneau affiche **Autorisation à renouveler**, utiliser **Réautoriser
  le dossier** et confirmer la demande du navigateur.
- Si l'accès a été refusé, le réautoriser ou sélectionner **Changer de dossier**.
- Si la mémorisation sûre n'est pas supportée, le dossier reste disponible
  uniquement pendant la session courante.
- Utiliser **Déconnecter le dossier** pour retirer le lien local ; le dossier et
  les sauvegardes existantes ne sont pas supprimés.
- Après déconnexion, l'export et la restauration JSON manuels restent inchangés.

## 3. Examiner les sauvegardes d'autres appareils

Un instantané externe devient visible uniquement si un fichier provenant d'un
autre appareil arrive réellement dans le dossier sélectionné. Cette arrivée peut
résulter d'une copie manuelle ou d'un transport externe choisi séparément.

1. Ouvrir **Paramètres → Sauvegardes des autres appareils**.
2. Sélectionner **Vérifier les autres appareils**.
3. Examiner l'origine, la date, le nombre de projets et les impacts indiqués.
4. Choisir explicitement l'une des actions disponibles :

| Action | Effet sur les données locales |
|---|---|
| **Importer comme copies** | Conserve les projets locaux et crée des copies distinctes pour les conflits. |
| **Conserver mon état local** | Ne modifie aucun projet et mémorise ce choix pour cet instantané. |
| **Ignorer pour le moment** | Ne modifie aucun projet ; l'instantané pourra réapparaître. |
| **Restaurer cet état…** | Remplace le portefeuille local uniquement après lecture de l'impact, case cochée et confirmation explicite. |

Une **suite directe vérifiée** possède une filiation prouvée par les identifiants
d'instantanés. Un **état divergent** représente des évolutions concurrentes ou
des changements locaux non sauvegardés. Une **filiation indéterminée** n'est
jamais considérée comme sûre sur la seule base de sa date. Une sauvegarde
illisible reste signalée mais n'est jamais appliquée.

## 4. Transport externe facultatif : exemple Syncthing

Syncthing n'est pas une fonctionnalité intégrée, une dépendance ni une condition
d'utilisation d'IDE-projectsmanager. L'application ne l'installe pas, ne le
configure pas, ne le contrôle pas et n'utilise aucune API Syncthing.

Si un utilisateur possède déjà un outil de synchronisation de dossiers et
souhaite l'utiliser :

1. Configurer cet outil de manière indépendante, sous sa propre responsabilité.
2. Lui confier le dossier choisi précédemment dans l'IDE, si son environnement
   et ses permissions l'autorisent.
3. Laisser l'outil transférer les sous-dossiers `snapshots/<device-id>/` entre
   les appareils.
4. Ouvrir l'IDE sur l'autre appareil, choisir son dossier local correspondant
   et vérifier les sauvegardes externes.
5. Résoudre explicitement une éventuelle divergence dans l'IDE.

Un autre synchroniseur de dossiers peut remplir le même rôle. Les fournisseurs
cloud, WebDAV et le transfert direct entre appareils restent des pistes futures,
non promises comme fonctionnalités déjà intégrées.

## 5. Matrice de validation réelle

État au **25 août 2026**. Les tests automatisés ne remplacent pas une exécution
sur Windows, sur un Samsung Galaxy S23 ou avec un synchroniseur réel.

| Environnement / scénario | Résultat réel | Action restante |
|---|---|---|
| Chrome sous Windows : choix du dossier, écriture, relecture | Échec observé le 25 août 2026 avant ouverture du sélecteur : identifiant interne de 36 caractères, alors que l'API en autorise 32 au maximum. Correctif préparé. | Retester le choix, l'écriture et la relecture après déploiement du correctif. |
| Edge sous Windows : permissions, reconnexion, déconnexion | Non exécuté sur appareil réel | Vérifier le renouvellement et le retour au mode manuel. |
| Chrome Android sur Samsung Galaxy S23 | Même échec observé le 25 août 2026 avant que la capacité réelle d'Android puisse être déterminée. Correctif préparé. | Retester après déploiement ; si le sélecteur reste indisponible, valider le repli manuel. |
| Navigateur sans accès direct au dossier | Non exécuté sur navigateur réel | Vérifier le message d'incompatibilité et l'export/import JSON. |
| Deux appareils : restauration et divergence | Non exécuté avec deux appareils réels | Produire deux instantanés et tester copie, conservation et restauration confirmée. |
| Syncthing ou autre transport externe | Non exécuté avec un transport réel | Vérifier facultativement le transfert des dossiers sans rendre ce logiciel obligatoire. |

### Ce qui a été effectivement vérifié automatiquement

- Détection de navigateur compatible et incompatible ; absence d'autorisation
  demandée silencieusement.
- Permission accordée, refusée, renouvelée ou limitée à la session.
- Export/import JSON universel et conservation des projets historiques.
- Deux appareils simulés écrivant dans des fichiers distincts.
- Instantanés versionnés, ascendance directe et transitive, état antérieur,
  divergence et modifications locales non sauvegardées.
- Fichiers corrompus, erreurs d'écriture, confirmations obligatoires et import
  comme copies sans écrasement local.
- Suite de **249 tests automatisés réussis** et compilation PWA réussie.

### Protocole court de recette réelle

Pour chaque appareil, noter le système, le navigateur, sa version, la date et
le résultat de chaque étape :

1. Créer ou modifier un projet sans dossier connecté.
2. Exporter un bundle JSON ; le restaurer sur un second appareil sans installer
   de logiciel supplémentaire.
3. Si le navigateur le permet, choisir un dossier et écrire son propre
   `snapshots/<device-id>/latest.json`.
4. Fermer puis rouvrir l'application ; vérifier l'état de permission et, si
   nécessaire, utiliser **Réautoriser le dossier**.
5. Placer un instantané externe valide dans le dossier et vérifier l'origine,
   la date et les projets affectés.
6. Produire deux évolutions concurrentes ; vérifier que la divergence reste
   visible et qu'aucune restauration ne démarre automatiquement.
7. Tester séparément **Importer comme copies**, **Conserver mon état local** et
   une restauration explicitement confirmée sur des projets de test.
8. Déconnecter le dossier et revérifier l'export/import manuel.
9. Si un transport externe déjà choisi est disponible, vérifier son rôle sans
   modifier le parcours autonome.

La release de continuité personnelle ne doit pas être déclarée complètement
validée tant que ces lignes matérielles n'ont pas de résultats observés.
