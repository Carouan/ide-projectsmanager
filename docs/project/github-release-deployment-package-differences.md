# Release, déploiement et archive — différences utiles

Ces notions se complètent mais ne décrivent pas la même livraison.

## Release GitHub

Une **release GitHub** publie une version officielle du projet à partir d'un
tag Git, par exemple **`v1.0.0`**. Elle présente des notes de version et peut
proposer un ou plusieurs fichiers téléchargeables.

La version logicielle `1.0.0` ne doit pas être confondue avec l'étape `v.1.0`
d'un projet suivi dans l'IDE : la première identifie l'application publiée, la
seconde décrit la maturité d'un document projet.

## Déploiement GitHub Pages

Un **déploiement** met une compilation en ligne sur un environnement
d'exécution. Ici, GitHub Pages publie l'application web et sa PWA.

Un déploiement peut intervenir sans release. Inversement, une release archive
un état précis du projet mais ne remplace pas le déploiement web.

## Archive de distribution

Une **archive de release** est un fichier ZIP téléchargeable joint à la release.
Pour ce projet, elle contient l'application statique compilée et permet de
l'héberger soi-même sur un serveur web compatible.

Une somme **SHA-256** jointe permet de vérifier que le fichier téléchargé n'a
pas été altéré. L'archive n'est ni un installateur Windows, ni une application
Android native, ni une synchronisation automatique entre appareils.

## Registre de packages

Un **package de registre** est distribué via npm, Docker/OCI, NuGet, Maven ou
un système équivalent. Ce mode n'est nécessaire que si l'IDE devient une
bibliothèque réutilisable ou si une image serveur doit être publiée.

L'archive ZIP de la release suffit pour la première version publique.

| Élément | Fonction | Première version prévue |
|---|---|---|
| Release GitHub | Identifier officiellement une livraison stable | `v1.0.0` et ses notes |
| GitHub Pages | Exécuter l'application en ligne | Déploiement de la branche `main` |
| Archive ZIP | Télécharger les fichiers web compilés | Archive statique `1.0.0` |
| Somme SHA-256 | Vérifier l'intégrité de l'archive | Fichier de contrôle associé |
| Registre npm / Docker | Distribuer un package à d'autres systèmes | Non nécessaire pour la v1.0 |

L'application statique doit être servie par un serveur web ; ouvrir simplement
`index.html` avec `file://` ne constitue pas un déploiement PWA supporté.
