# Installer l'archive web d'IDE Projects Manager

Cette archive contient les fichiers statiques compilés de l'application web.
Elle n'est ni un installateur Windows, ni un APK Android, ni un package npm.

## Vérifier l'intégrité

Sous Linux, macOS ou un terminal compatible :

```bash
sha256sum -c ide-projectsmanager-v1.0.0-web.zip.sha256
```

Sous PowerShell :

```powershell
Get-FileHash .\ide-projectsmanager-v1.0.0-web.zip -Algorithm SHA256
```

Comparer le résultat avec la valeur figurant dans le fichier `.sha256`.

## Servir l'application

1. Créer un répertoire nommé `ide-projectsmanager`.
2. Extraire tous les fichiers de l'archive dans ce répertoire.
3. Servir le répertoire parent avec un serveur web.
4. Ouvrir `https://votre-serveur/ide-projectsmanager/`.

Pour un essai local lorsque Python est déjà présent :

```bash
mkdir ide-projectsmanager
unzip ide-projectsmanager-v1.0.0-web.zip -d ide-projectsmanager
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/ide-projectsmanager/`.

L'accès local `localhost` convient au développement. Pour une installation
distante, l'accès PWA et certaines API de dossier nécessitent HTTPS. Ouvrir
`index.html` directement via `file://` n'est pas supporté.

## Sauvegardes et continuité

Les données actives restent dans le navigateur. Exporter les projets en JSON
avant tout changement important. Les instantanés locaux de deux appareils ne
deviennent visibles ensemble que lorsqu'un transfert ou un dossier réellement
partagé déplace les fichiers entre eux.
