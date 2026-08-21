# DR-002 — Stockage local-first et sauvegardes portables

- **Statut** : accepté
- **Date** : 2026-08-20, amendé le 2026-08-21
- **Décideur produit** : responsable du projet
- **Portée** : persistance, sauvegarde, synchronisation personnelle et limites de collaboration

## Contexte

L'application conserve actuellement ses projets dans IndexedDB. Ce choix offre une expérience rapide, hors ligne et sans serveur, mais les données internes d'un navigateur ne constituent pas un dossier que Syncthing peut synchroniser directement.

Le produit doit permettre à une même personne de sauvegarder et retrouver son
portefeuille sans introduire un backend obligatoire, des comptes distants, un
logiciel compagnon obligatoire ou une architecture multi-utilisateur
disproportionnée par rapport à son objectif principal : gérer facilement ses
projets.

## Décision

1. **IndexedDB reste le stockage de travail local.** L'application ne déplace pas sa base interne dans Syncthing et ne dépend pas d'un dossier distant pour démarrer.
2. **L'import/export manuel est le parcours autonome de référence.** Un
   utilisateur peut sauvegarder et restaurer ses projets sans compte, service,
   API de système de fichiers ou installation supplémentaire.
3. **Un dossier choisi par l'utilisateur est un miroir facultatif.** Lorsque le
   navigateur le permet, l'application peut y lire et écrire des instantanés
   portables. Ce dossier ne fournit pas à lui seul une synchronisation entre
   appareils.
4. **Les transports restent interchangeables et externes.** Syncthing peut
   synchroniser le dossier, comme un autre synchroniseur, un futur fournisseur
   cloud/WebDAV ou un futur transfert direct. L'application n'impose ni ne
   pilote leur installation, leur compte ou leur réseau.
5. **Chaque appareil écrit son propre instantané.** Une première version ne fait pas écrire plusieurs appareils dans un même fichier mutable.
6. **Aucun écrasement silencieux n'est autorisé.** Une sauvegarde plus récente peut être proposée ; des modifications divergentes doivent produire un état explicite demandant une décision.
7. **Le format JSON global v1 reste la base immédiate.** Un futur conteneur `.ipm` versionné pourra inclure des pièces jointes binaires, mais il n'est pas requis pour la première synchronisation.
8. **Le multi-utilisateur est reporté sans échéance.** Comptes partagés, invitations, rôles, permissions par phase et collaboration temps réel ne font pas partie de la roadmap prévisible.

## Flux cible

```text
IndexedDB local
  -> bundle global manuel (parcours autonome universel)
  -> éventuellement instantané propre à l'appareil
  -> éventuellement dossier sélectionné
  -> éventuellement transport externe interchangeable
  -> détection et restauration explicite sur un autre appareil
```

Le navigateur n'a pas besoin de travailler en arrière-plan. Il écrit un
instantané lorsque l'application est ouverte. Si l'utilisateur a configuré un
transport externe, celui-ci peut déplacer le fichier indépendamment ; l'autre
appareil le lit lors de la prochaine ouverture de l'IDE.

## Structure logique proposée

```text
IDE-Projects/
  snapshots/
    <device-id>/
      latest.json
      history/
  attachments/        # réservé au futur format .ipm
```

Chaque instantané doit pouvoir exposer au minimum :

- un identifiant d'instantané ;
- un identifiant d'appareil non secret ;
- la date de création ;
- la version du format ;
- le portefeuille exporté ;
- une référence au parent connu lorsque cette information existe.

La date seule ne suffit pas pour décider automatiquement qu'un état descend d'un autre. La filiation ou une révision équivalente est nécessaire pour distinguer « plus récent » de « divergent ».

## Accès au dossier

L'accès direct au dossier est une amélioration progressive :

- utiliser l'API File System Access lorsque le navigateur la propose ;
- détecter la capacité au runtime ;
- demander une action et une autorisation explicites à l'utilisateur ;
- tolérer qu'une autorisation doive être renouvelée ;
- conserver téléchargement et import de fichier comme fallback.

La première validation vise Chrome/Edge sous Windows, puis Chrome Android sur le Galaxy S23. Le produit ne doit jamais présenter l'accès direct au dossier comme universel.

## Politique de conflit v1

- un appareil ne modifie que son propre fichier `latest.json` ;
- l'application compare les instantanés connus à l'ouverture et lors d'une synchronisation manuelle ;
- un descendant non ambigu peut être proposé comme restauration ;
- deux descendants différents d'un même parent sont marqués comme divergents ;
- la v1 propose de conserver l'état local, restaurer l'autre état ou importer l'autre état comme copie ;
- aucune fusion automatique champ par champ n'est requise.

## Conséquences

### Positives

- fonctionnement hors ligne et rapidité actuels préservés ;
- pas de serveur, compte ou secret obligatoire ;
- solution autonome compatible avec l'orientation G.L.O.M. ;
- aucun logiciel tiers n'est nécessaire au parcours de base ;
- Syncthing reste une option interchangeable plutôt qu'une direction imposée ;
- conflits de fichiers fortement réduits grâce aux instantanés propres à chaque appareil ;
- migration progressive à partir de l'export global déjà disponible.

### Contraintes

- le confort du miroir de dossier dépend du navigateur et du système ;
- une autorisation explicite reste nécessaire pour ce miroir ;
- la continuité automatique entre appareils nécessite encore un transport externe ;
- les pièces jointes binaires demandent un format ultérieur ;
- la première version ne fournit pas de collaboration simultanée.

## Alternatives écartées pour cette phase

- **Remplacer IndexedDB par un dossier** : trop risqué pour la compatibilité, l'UX et les navigateurs non compatibles.
- **Synchroniser directement IndexedDB ou OPFS** : ces stockages appartiennent à l'espace privé du navigateur et ne constituent pas un dossier Syncthing portable.
- **Backend cloud obligatoire** : contraire au périmètre, au coût et à l'orientation G.L.O.M.
- **Application native compagnon obligatoire** : contraire à l'expérience
  autonome recherchée ; elle pourra seulement rester une option ultérieure.
- **Multi-utilisateur** : coût disproportionné en identité, autorisations, sécurité, résolution de conflits et exploitation.

## Critères de réexamen

Cette décision sera réévaluée si :

- Chrome/Edge ou Android ne permettent pas une expérience de dossier suffisamment fiable ;
- les tests montrent que les utilisateurs ne comprennent pas la restauration proposée ;
- les pièces jointes deviennent un besoin prioritaire ;
- un transport sans installation devient suffisamment fiable pour être intégré
  comme fournisseur facultatif ;
- une application native légère devient justifiée par des usages réels.
