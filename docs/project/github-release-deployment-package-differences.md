# Releases, Deployments, Packages — différences exactes

Ces trois notions parlent toutes de sortie ou de publication, mais elles ne désignent pas la même chose.

## Release

Une **release** est une **version publiée du projet**, côté produit / distribution.

Elle sert à :

- marquer un jalon stable
- publier des notes de version
- proposer éventuellement des fichiers à télécharger

Exemples utiles pour ce projet :

- `v0.4.0` : preview Markdown + settings + i18n
- `v0.5.0` : attachments + user profile + storage layer
- `v0.6.0` : sync metadata + sync UI

Règle simple : **release = version officielle publiée**.

## Deployment

Un **deployment** est une **mise en ligne technique** vers un environnement d’exécution.

Exemples :

- `production`
- `staging`
- `preview`
- `github-pages`

Dans ce dépôt, GitHub Pages correspond à cette logique de deployment.

Règle simple : **deployment = mise en ligne technique**.

## Package

Un **package** est un **artefact publié dans un registre de paquets**.

Exemples classiques :

- package npm
- image Docker / OCI
- package NuGet
- package Maven

Pour une app Vite/React publiée sur GitHub Pages, cette notion n’est pas centrale pour l’instant.

Règle simple : **package = artefact réutilisable par d’autres systèmes**.

## Vue synthétique

| Notion | Rôle | Exemple ici |
|---|---|---|
| Release | version officielle publiée | `v0.5.0` avec notes de version |
| Deployment | mise en ligne technique | build déployé sur `github-pages` |
| Package | artefact publié dans un registre | pas prioritaire pour l’instant |

## Recommandation pour ce dépôt

À faire :

1. protéger `main`
2. continuer à utiliser GitHub Pages pour les déploiements
3. commencer à créer des releases à chaque gros jalon fonctionnel

Pas nécessaire immédiatement :

- packages, sauf si le projet devient un composant npm, une image Docker ou une librairie réutilisable
