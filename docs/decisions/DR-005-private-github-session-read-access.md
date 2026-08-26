# DR-005 — Lecture privée GitHub strictement limitée à la session

- **Statut** : accepté.
- **Date** : 2026-08-24.
- **Portée** : lecture facultative des dépôts GitHub privés déjà liés.
- **Issue** : #69.

## Contexte et frontière de confiance

IDE-projectsmanager est une application statique React/PWA publiée sur GitHub
Pages. Elle ne possède ni serveur de confiance, ni coffre distant, ni système
de comptes. Les dépôts publics restent consultables sans authentification et
IndexedDB demeure le stockage local des seuls documents de projet.

Une lecture privée exige une autorisation GitHub appartenant à l'utilisateur.
Cette autorisation ne doit jamais devenir une donnée de projet, un secret du
build, un cookie, un paramètre d'URL, une sauvegarde ou un journal applicatif.

## Modèles évalués

| Modèle | Bénéfice | Limite ou risque principal | Décision |
|---|---|---|---|
| Jeton personnel GitHub fine-grained, uniquement en mémoire de session | Aucun serveur, autorisation explicite, dépôts précis, expiration choisie et retrait immédiat | Une nouvelle saisie est requise après fermeture/rechargement ; une XSS ou un appareil compromis peut lire la mémoire de session | **Retenu pour la première version** |
| Coffre local chiffré | Autorisation conservée entre sessions | La clé doit être saisie, dérivée ou conservée quelque part ; le chiffrement ne protège ni contre une XSS active ni contre un appareil déverrouillé compromis | Non retenu sans modèle cryptographique et ergonomique séparé |
| OAuth / GitHub App avec broker minimal de confiance | Consentement fournisseur plus ergonomique et permissions administrables | GitHub Pages ne peut protéger un client secret ; un broker ajoute hébergement, exploitation, surface d'attaque et responsabilité de conservation | Évolution possible, jamais simulée dans une application statique |
| Pont local ou auto-hébergé optionnel, compatible avec G.L.O.M. | Le secret peut rester hors du navigateur et servir plusieurs outils | Exige une installation, une authentification locale, une politique CORS et des mises à jour distinctes | Exploration ultérieure, strictement facultative |

## Décision

L'application accepte exclusivement un **fine-grained personal access token**
saisi volontairement dans **Paramètres → Accès GitHub privé**. Ce jeton :

1. reste dans une fermeture JavaScript non sérialisée, pour la session courante ;
2. n'est écrit ni dans IndexedDB, ni dans localStorage/sessionStorage, ni dans
   les paramètres, documents projet, exports JSON/Markdown ou caches persistés ;
3. n'est ajouté qu'à l'en-tête HTTP `Authorization: Bearer …` pour une requête
   `GET` vers l'origine HTTPS exacte `https://api.github.com`, sous `/repos/` ;
4. n'est jamais transmis à un dépôt public, une URL tierce, une redirection,
   un paramètre de requête, un corps de requête ou un rapport d'erreur ;
5. disparaît lors de **Déconnecter**, d'un rechargement, d'une fermeture de
   l'onglet ou d'une réponse GitHub `401` ;
6. ne réalise jamais d'écriture GitHub, de création de dépôt, de synchronisation
   ni d'action sur une pull request.

Le jeton est configuré sur GitHub pour une durée courte, uniquement pour les
dépôts explicitement sélectionnés, avec les permissions repository minimales :

- `Metadata: Read-only` ;
- `Contents: Read-only` pour le README et la roadmap ;
- `Pull requests: Read-only` pour les demandes ouvertes ;
- `Commit statuses: Read-only` uniquement si l'enrichissement des contrôles est
  souhaité ; sans cette permission, le statut reste simplement inconnu.

Le navigateur ne peut pas garantir qu'un utilisateur n'a pas accordé des
permissions supplémentaires dans GitHub. L'application refuse les anciens
jetons classiques, explique les permissions recommandées et borne elle-même son
transport à des lectures ; la configuration effective reste visible et révocable
dans GitHub.

## Cache, révocation et mode hors ligne

Les snapshots des dépôts publics conservent le cache persistant existant. Les
snapshots d'un dépôt déclaré privé ou interne sont stockés **uniquement en
mémoire de session**. Changer, révoquer ou expirer l'autorisation vide ce cache.
Une révocation ne réutilise jamais un ancien snapshot privé comme si l'accès
restait valide.

Pendant une session autorisée, un snapshot privé déjà lu peut être affiché hors
ligne comme périmé. Après rechargement ou déconnexion, il n'est plus disponible.
Les projets purement locaux et les dépôts publics continuent à fonctionner sans
jeton et sans modifier leurs sauvegardes historiques.

## Limites assumées

- Une vulnérabilité XSS active, une extension malveillante ou un appareil
  compromis peut accéder aux données ouvertes pendant la session.
- Une autorisation n'est pas un chiffrement des données du projet ni une
  protection contre le propriétaire de l'appareil déverrouillé.
- Les outils réseau du navigateur peuvent afficher l'en-tête HTTP à leur
  utilisateur ; il ne doit jamais être partagé dans une capture ou un support.
- La déconnexion efface la session locale ; pour invalider durablement le jeton,
  l'utilisateur doit également le supprimer ou le faire expirer dans GitHub.
- Une réponse `403` distingue un refus ou une permission insuffisante sans
  révéler le jeton ; une réponse `401` ferme immédiatement la session.

## Validation et retour arrière

Les tests couvrent l'autorisation explicite, les destinations non autorisées,
les méthodes d'écriture, les dépôts publics sans jeton, la lecture privée, la
révocation, l'expiration, le cache volatile, les sauvegardes et les erreurs
sanitisées. Le build de production et les exports sont vérifiés avec un jeton
sentinelle absent des fichiers produits.

Retour arrière : retirer le panneau de session et l'adaptateur privé ; les
projets locaux, les exports et la lecture GitHub publique restent inchangés.
