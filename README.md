# ide-projectsmanager

Outil local-first et PWA pour cadrer, suivre, enrichir et rouvrir des projets de
manière structurée, sans perdre la souplesse de notes éditables ni la portabilité
des exports JSON et Markdown.

La première version publique préparée est **`1.0.0`** ; son tag GitHub prévu
est **`v1.0.0`**. Cette version logicielle est distincte des étapes de projet
affichées sous la forme `v.0.0 → v.1.0`.

## Fonctionnalités actuelles

- gestion multi-projets
- cockpit portefeuille en grille ou en liste, avec recherche, filtres et tris
- tableau de bord responsive élargi lorsqu'aucun aperçu latéral n'est affiché
- étapes versionnées `v.0.0 → v.1.0`, avec parcours focalisé et aide contextuelle
- backlog
- journal de projet
- bloc décisions
- arbre de décision pour trier les nouvelles idées
- pièces jointes et références textuelles
- export JSON
- sauvegarde globale de tous les projets en JSON
- restauration globale avec aperçu et gestion explicite des conflits
- import JSON
- export Markdown
- aperçu Markdown complet
- interface française et anglaise
- thèmes système, sombre et clair réellement appliqués et mémorisés
- taille de texte adaptable, contraste renforcé et réduction des animations
- navigation clavier et accès direct au contenu principal
- PWA installable
- lien facultatif vers un dépôt GitHub public, lu sans jeton ni écriture
- lecture facultative des dépôts GitHub privés avec autorisation fine-grained de session
- suivi des pull requests, de la santé du dépôt et des validations humaines
- inbox globale des décisions, blocages et validations réellement requis
- avancement explicable : valeur manuelle, roadmap mesurable ou étape du projet
- même progression visible dans l'inbox, la collection et chaque fiche projet
- chantiers parallèles facultatifs, suggestions multi-domaines et matrice étapes
- actions du backlog associables et filtrables par chantier
- création gouvernée facultative avec mandat, critères mesurables et fichiers relisibles
- frontière de sauvegarde portable avec téléchargement/import JSON comme repli
- dossier de sauvegarde facultatif, choisi et autorisé explicitement
- instantanés JSON versionnés et séparés pour chaque appareil
- comparaison des sauvegardes externes et restauration confirmée sans écrasement silencieux
- projet de démonstration facultatif relié au dépôt GitHub public de l'application

## Piloter le portefeuille

Le tableau de bord sépare les signaux **À votre attention** de la collection des
projets. Chaque carte affiche la même progression expliquée, y compris pour un
projet lié à une roadmap GitHub.

- Présentation en grille ou en liste ; préférence mémorisée sur l'appareil.
- Recherche locale par titre, résumé, description, catégorie, tag ou dépôt.
- Filtres cumulables par statut, catégorie/tag, dépôt lié et attention humaine.
- Tri par titre, dernière mise à jour ou avancement effectif, dans les deux sens.
- Nombre de résultats visible et réinitialisation explicite des filtres.
- La recherche et les filtres temporaires ne sont jamais sauvegardés.
- Les snapshots GitHub déjà disponibles sont réutilisés sans lecture réseau
  supplémentaire pour filtrer ou trier les projets.

## Calcul de l'avancement

Le tableau de bord affiche toujours la meilleure source exploitable :

1. **Valeur manuelle** si un pourcentage a été explicitement renseigné.
2. **Roadmap GitHub** si le dépôt lié contient des objectifs cochés/non cochés.
3. **Étape du projet** en dernier recours : `v.0.2 → 20 %`, `v.0.7 → 70 %`.

Une valeur calculée ne modifie jamais les données enregistrées. La source, le
nombre d'objectifs terminés et un cache éventuellement périmé restent visibles.
La formule, la granularité et la pondération facultative sont décrites dans
[`ROADMAP.md`](ROADMAP.md) et dans
[DR-004](docs/decisions/DR-004-measurable-roadmap-effective-progress.md).

## Étapes et chantiers parallèles

Une **étape** indique la maturité globale du projet, par exemple `v.0.2`. Un
**chantier** désigne un front de travail pouvant traverser plusieurs étapes :

- logiciel : produit, interface, frontend, backend, qualité et déploiement ;
- recherche : bibliographie, méthode, collecte, analyse, éthique et diffusion ;
- association : juridique, finances, opérations, communication et partenariats ;
- projet personnel : planification, achats, production et documentation.

L'onglet **Chantiers** permet de créer, modifier, ordonner, archiver et
réactiver ces fronts. Des modèles facultatifs proposent des suggestions selon
la nature du projet sans remplacer les chantiers déjà existants.

Chaque action du backlog peut être associée à un chantier, à une étape, aux
deux ou à aucun. Le backlog se filtre par chantier ; la matrice **étapes ×
chantiers** n'affiche que les associations réelles et devient une liste de
cartes lisibles sur mobile. Une synthèse, les blocages et la prochaine action
utile rendent le pilotage plus immédiat sans inventer de pourcentage de
progression par chantier.

Les chantiers restent facultatifs, personnalisables et indépendants des dépôts
GitHub. Les projets historiques, les exports JSON/Markdown et le projet IDE de
démonstration restent compatibles.

## Apparence et accessibilité

Dans **Paramètres**, choisir **Suivre le système**, **Sombre** ou **Clair**.
Le mode système réagit également aux changements d'apparence du navigateur ou
de l'appareil pendant l'utilisation.

La section **Accessibilité et confort** propose :

- trois tailles de texte : normale, grande et très grande ;
- un contraste standard ou renforcé pour chaque thème ;
- le respect du réglage système ou la réduction explicite des animations ;
- un lien d'accès direct au contenu principal lors de la navigation au clavier.

Ces préférences sont mémorisées localement sans modifier les documents projet.

## Préparer un projet gouverné

Le bouton **+ Nouveau projet** conserve la création locale immédiate. Le bouton
distinct **Projet gouverné** prépare un projet compatible avec
[AI Project Template](https://github.com/Carouan/ai-project-template) et
[AI Project Steward](https://github.com/Carouan/ai-project-steward) :

1. Renseigner explicitement l'objectif, le contexte, au moins un livrable et un
   critère de réussite vérifiable.
2. Déclarer le dépôt GitHub canonique prévu et sa visibilité ; le mode privé
   reste la valeur par défaut.
3. Relire les cinq fichiers générés : `PROJECT_MANDATE.md`, `PROJECT_CONTEXT.md`,
   `PROJECT_STATUS.md`, `.project-steward.yml` et `README.md`.
4. Télécharger un fichier individuel ou le paquet JSON versionné, puis créer le
   projet local avec ses documents conservés comme pièces jointes textuelles.

Un même identifiant opaque et stable relie le projet local, le manifeste et le
dépôt déclaré. Le mandat utilise exclusivement les informations saisies. Le
statut indique explicitement que l'existence du dépôt n'est pas vérifiée ; la
méthodologie Project Steward reste référencée dans son dépôt source et n'est
jamais copiée dans l'application.

**Aucun dépôt GitHub n'est créé, modifié ou publié automatiquement.** La
création effective du dépôt et la publication des fichiers nécessitent une
action humaine distincte. Annuler ce parcours ne crée aucun projet local.

## Lire un dépôt GitHub privé

**Paramètres → Accès GitHub privé** active, si nécessaire, la lecture des dépôts
déclarés privés ou internes dans les projets liés. L'accès public et les projets
locaux restent disponibles sans autorisation.

1. Créer dans GitHub un jeton personnel **fine-grained**, limité aux dépôts
   choisis, avec expiration courte.
2. Accorder uniquement `Metadata: Read-only`, `Contents: Read-only` et
   `Pull requests: Read-only` ; `Commit statuses: Read-only` est facultatif.
3. Coller le jeton dans le champ masqué de l'application et choisir
   **Autoriser la lecture pour cette session**.
4. Ouvrir le projet privé ou revenir au tableau de bord pour lire sa roadmap et
   ses demandes de validation.
5. Choisir **Déconnecter et effacer le cache privé** lorsque l'accès n'est plus
   nécessaire ; supprimer également le jeton sur GitHub pour le révoquer.

Le jeton reste exclusivement dans la mémoire de l'onglet et n'est envoyé que
vers `https://api.github.com/repos/…` par des requêtes `GET`. Il n'apparaît ni
dans IndexedDB, ni dans les projets, sauvegardes, exports, journaux ou build.
Les snapshots privés sont eux aussi limités à la mémoire de session. Recharger
la page, se déconnecter ou recevoir une réponse `401` efface l'autorisation et
ces snapshots. Les dépôts publics ne reçoivent jamais le jeton.

Les compromis, permissions minimales, limites XSS/appareil compromis et modèles
écartés sont décrits dans
[DR-005](docs/decisions/DR-005-private-github-session-read-access.md).

## Roadmap mesurable et releases

La [roadmap produit canonique](ROADMAP.md) mesure exclusivement le périmètre de
la première release `1.0.0` : socle local-first, cockpit et progression,
sauvegardes JSON, gouvernance, apparence, accessibilité et diffusion.

Les lots historiques A à D ne correspondent pas à des releases GitHub déjà
publiées. Une case cochée décrit un comportement disponible ; une case vide
reste un objectif réel et vérifiable de cette première livraison.

Après `1.0.0`, trois axes distincts sont planifiés :

1. **A — Continuité entre appareils** : réconciliation sûre, partage natif,
   relais facultatif, WebRTC/QR et fournisseurs cloud optionnels.
2. **B — Méthode et projets existants** : import GitHub en lecture seule,
   prévisualisation humaine, projets pilotes UFI/SUMP et parcours adaptatifs.
3. **C — Interface et personnalisation** : densité, disposition et
   redimensionnement progressifs des panneaux.

La [roadmap détaillée après la v1.0](docs/roadmaps/post-v1-evolution-roadmap.md)
garde ces objectifs visibles sans réduire artificiellement le pourcentage de
la release actuellement préparée.

## Données et sauvegarde

- IndexedDB reste le stockage de travail local de chaque appareil.
- L'export global produit un bundle JSON portable de tous les projets.
- La restauration analyse le bundle avant application et ne remplace jamais
  silencieusement un projet existant.
- L'import/export manuel reste le parcours universel, autonome et sans
  installation supplémentaire.
- Les opérations de sauvegarde passent par un contrat indépendant du transport
  qui expose disponibilité, permission, lecture, écriture et erreurs normalisées.
- Le téléchargement et l'import JSON existants restent le fournisseur de repli
  universel, y compris lorsque le navigateur ne permet aucun accès à un dossier.
- **Paramètres → Dossier local de sauvegarde** permet, quand le navigateur le
  prend en charge, de choisir volontairement un dossier, de vérifier ou renouveler
  son autorisation, d'y écrire une sauvegarde et de le déconnecter.
- Le dossier n'est mémorisé que si IndexedDB peut conserver son handle de manière
  sûre ; sinon il reste limité à la session courante. Aucun accès n'est demandé
  silencieusement et le dossier ne se synchronise pas à lui seul.
- Chaque appareil possède une identité locale aléatoire et non secrète ; une
  sauvegarde explicite écrit uniquement `snapshots/<device-id>/latest.json`.
- Cet instantané contient son identifiant, sa date, le parent connu et le bundle
  global intact. Deux appareils ne modifient jamais le même fichier de sauvegarde.
- **Paramètres → Sauvegardes des autres appareils** identifie les filiations
  vérifiées, les états antérieurs, divergents, inconnus ou illisibles. La date
  seule ne sert jamais à décider qu'un état peut remplacer les données locales.
- Avant toute action, l'interface détaille l'appareil, la date et les projets
  ajoutés, remplacés ou retirés. Importer comme copies préserve les données ;
  restaurer exige une confirmation explicite. Il n'existe aucune restauration
  automatique.
- Un dossier local ne se synchronise jamais seul : un partage, une copie ou un
  transport séparé doit effectivement déplacer les fichiers entre appareils.
- Syncthing, un partage natif ou un futur relais pourront assurer ce transport
  sans devenir des dépendances obligatoires de l'application.

Le [guide pratique des sauvegardes personnelles](docs/portable-backup-user-guide.md)
commence par le parcours autonome sans installation et distingue les validations
Windows et Android effectivement observées des tests de navigateur
supplémentaire, restauration physique et transport externe encore reportés.

La décision complète et l'ordre d'implémentation sont documentés dans
[DR-002](docs/decisions/DR-002-local-first-syncthing-backup-architecture.md),
[DR-003](docs/decisions/DR-003-stages-workstreams-project-model.md) et la
[roadmap de sauvegarde portable](docs/roadmaps/local-first-syncthing-roadmap.md).

Le périmètre de release, les conflits d'instantanés, les pistes de transport,
le futur import UFI/SUMP et le rôle facultatif d'un conteneur ZIP `.ipm` sont
documentés dans
[DR-006](docs/decisions/DR-006-first-release-and-post-release-evolution.md).

Les comptes applicatifs distants, la collaboration multi-utilisateur et un
service de synchronisation obligatoire ne font pas partie du périmètre retenu.

## Stack

- React
- Vite
- vite-plugin-pwa

## Développement local

```bash
npm install
npm run dev
npm run lint
npm test
```

Build
```bash
npm run build
npm run preview
```

Déploiement

Le dépôt est prévu pour être publié via GitHub Pages avec GitHub Actions.

## Première release et archive téléchargeable

La release GitHub **`v1.0.0`** fournit une archive web statique et son empreinte
SHA-256 :

```bash
npm run build
npm run package:release
cd release
sha256sum -c ide-projectsmanager-v1.0.0-web.zip.sha256
```

Le fichier `ide-projectsmanager-v1.0.0-web.zip` contient la PWA compilée et un
guide `INSTALLATION.md`. Il doit être servi par un serveur web sous
`/ide-projectsmanager/` ; il ne constitue pas un installateur Windows ou
Android natif. Les [notes de version](docs/releases/v1.0.0.md) distinguent les
capacités disponibles des transports et validations volontairement reportés.

## Documentation et wiki

L'[index de `/docs`](docs/README.md) explique le rôle de chaque guide,
décision, contrat, roadmap et document historique. Le dépôt principal reste la
source de vérité versionnée ; le wiki GitHub en présente un miroir utilisateur
en français, sans remplacer la documentation technique complète.
