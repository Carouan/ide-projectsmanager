$ErrorActionPreference = "Stop"

Write-Host "=== Réparation des caractères corrompus ===" -ForegroundColor Cyan

$extensions = @("*.js", "*.jsx", "*.css", "*.html", "*.json", "*.md", "*.ps1", "*.txt")

$replacements = [ordered]@{
    "Ã©" = "é"
    "Ã¨" = "è"
    "Ãª" = "ê"
    "Ã«" = "ë"
    "Ã " = "à"
    "Ã¢" = "â"
    "Ã¤" = "ä"
    "Ã®" = "î"
    "Ã¯" = "ï"
    "Ã´" = "ô"
    "Ã¶" = "ö"
    "Ã¹" = "ù"
    "Ã»" = "û"
    "Ã¼" = "ü"
    "Ã§" = "ç"

    "Ã‰" = "É"
    "Ãˆ" = "È"
    "ÃŠ" = "Ê"
    "Ã‹" = "Ë"
    "Ã€" = "À"
    "Ã‚" = "Â"
    "Ã„" = "Ä"
    "ÃŽ" = "Î"
    "Ã�" = "Ï"
    "Ã”" = "Ô"
    "Ã–" = "Ö"
    "Ã™" = "Ù"
    "Ã›" = "Û"
    "Ãœ" = "Ü"
    "Ã‡" = "Ç"

    "â€¢" = "•"
    "â€“" = "–"
    "â€”" = "—"
    "â€˜" = "‘"
    "â€™" = "’"
    "â€œ" = "“"
    "â€�" = "”"
    "â€¦" = "…"

    "MÃ©tadonnÃ©es" = "Métadonnées"
    "RÃ©sumÃ©" = "Résumé"
    "DerniÃ¨re mise Ã jour" = "Dernière mise à jour"
    "sauvegardÃ©s" = "sauvegardés"
    "Ã‰tape" = "Étape"
    "Ã©dition" = "édition"
    "IdÃ©e" = "Idée"
    "DÃ©finition" = "Définition"
    "CrÃ©er" = "Créer"
    "SupprimÃ©" = "Supprimé"
    "projets locaux" = "projets locaux"
    "MVP LOCAL â€¢ REACT + VITE" = "MVP LOCAL • REACT + VITE"
}

$files = Get-ChildItem -Path . -Recurse -File -Include $extensions |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" -and $_.FullName -notmatch "\\dist\\" }

$changedCount = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $original = $content

    foreach ($pair in $replacements.GetEnumerator()) {
        $content = $content.Replace($pair.Key, $pair.Value)
    }

    if ($content -ne $original) {
        $backupPath = "$($file.FullName).bak"

        if (-not (Test-Path $backupPath)) {
            Copy-Item $file.FullName $backupPath
        }

        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Corrigé : $($file.FullName)" -ForegroundColor Yellow
        $changedCount++
    }
}

Write-Host ""
Write-Host "=== Terminé ===" -ForegroundColor Green
Write-Host "Fichiers modifiés : $changedCount"
Write-Host "Des sauvegardes .bak ont été créées pour les fichiers modifiés."
Write-Host ""
Write-Host "Relance ensuite Vite avec :" -ForegroundColor Cyan
Write-Host "  npm run dev"