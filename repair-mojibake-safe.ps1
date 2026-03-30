$ErrorActionPreference = "Stop"

Write-Host "=== Repair mojibake (safe mode) ===" -ForegroundColor Cyan

$extensions = @("*.js", "*.jsx", "*.css", "*.html", "*.json", "*.md", "*.ps1", "*.txt")

$latin1 = [System.Text.Encoding]::GetEncoding(28591)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-SuspiciousScore {
    param([string]$Text)

    if ([string]::IsNullOrEmpty($Text)) { return 0 }

    $score = 0

    $bad1 = [char]0x00C3   # Ã
    $bad2 = [char]0x00C2   # Â
    $bad3 = [char]0x00E2   # â
    $bad4 = [char]0xFFFD   # replacement char

    $score += ($Text.ToCharArray() | Where-Object { $_ -eq $bad1 }).Count * 3
    $score += ($Text.ToCharArray() | Where-Object { $_ -eq $bad2 }).Count * 2
    $score += ($Text.ToCharArray() | Where-Object { $_ -eq $bad3 }).Count * 2
    $score += ($Text.ToCharArray() | Where-Object { $_ -eq $bad4 }).Count * 5

    return $score
}

function Repair-TextIfNeeded {
    param([string]$Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return $Text
    }

    $originalScore = Get-SuspiciousScore -Text $Text

    # If nothing looks suspicious, keep original
    if ($originalScore -eq 0) {
        return $Text
    }

    # Classic mojibake repair:
    # text wrongly interpreted as latin1/cp1252 instead of utf8
    $bytes = $latin1.GetBytes($Text)
    $candidate = [System.Text.Encoding]::UTF8.GetString($bytes)

    $candidateScore = Get-SuspiciousScore -Text $candidate

    if ($candidateScore -lt $originalScore) {
        return $candidate
    }

    return $Text
}

$files = Get-ChildItem -Path . -Recurse -File -Include $extensions |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\.git\\"
    }

$changedCount = 0

foreach ($file in $files) {
    try {
        $original = [System.IO.File]::ReadAllText($file.FullName)
        $repaired = Repair-TextIfNeeded -Text $original

        if ($repaired -ne $original) {
            $backupPath = "$($file.FullName).bak"

            if (-not (Test-Path $backupPath)) {
                Copy-Item $file.FullName $backupPath
            }

            [System.IO.File]::WriteAllText($file.FullName, $repaired, $utf8NoBom)
            Write-Host "Fixed: $($file.FullName)" -ForegroundColor Yellow
            $changedCount++
        }
    }
    catch {
        Write-Host "Skipped: $($file.FullName)" -ForegroundColor DarkYellow
        Write-Host $_.Exception.Message -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Files changed: $changedCount"
Write-Host "Backup files (*.bak) created when a file was modified."
Write-Host ""
Write-Host "Next step:"
Write-Host "  npm run dev" -ForegroundColor Cyan