$ErrorActionPreference = "Stop"

Write-Host "=== Final label repair ===" -ForegroundColor Cyan

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Replace-InFile {
    param(
        [string]$Path,
        [hashtable]$Map
    )

    if (-not (Test-Path $Path)) {
        Write-Host "Missing: $Path" -ForegroundColor DarkYellow
        return
    }

    $content = [System.IO.File]::ReadAllText((Resolve-Path $Path))
    $original = $content

    foreach ($key in $Map.Keys) {
        $content = $content.Replace($key, $Map[$key])
    }

    if ($content -ne $original) {
        $backup = "$Path.bak"
        if (-not (Test-Path $backup)) {
            Copy-Item $Path $backup
        }

        [System.IO.File]::WriteAllText((Resolve-Path $Path), $content, $utf8NoBom)
        Write-Host "Fixed: $Path" -ForegroundColor Yellow
    }
    else {
        Write-Host "No change: $Path" -ForegroundColor DarkGray
    }
}

$bullet = [string][char]0x2022
$leftArrow = [string][char]0x2190
$EAcute = [string][char]0x00C9
$eAcute = [string][char]0x00E9

# src/screens/ProjectListScreen.jsx
Replace-InFile -Path "src/screens/ProjectListScreen.jsx" -Map @{
    "MVP LOCAL �?� REACT + VITE" = "MVP LOCAL $bullet REACT + VITE"
}

# src/screens/ProjectScreen.jsx
Replace-InFile -Path "src/screens/ProjectScreen.jsx" -Map @{
    "�?� Retour" = "$leftArrow Retour"
}

# src/components/StageEditor.jsx
Replace-InFile -Path "src/components/StageEditor.jsx" -Map @{
    "�‰dition de l'�‰tape v.0.0" = "${EAcute}dition de l'${EAcute}tape v.0.0"
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Restart Vite with:" -ForegroundColor Cyan
Write-Host "  npm run dev"