param(
    [string]$Repo = "Carouan/ide-projectsmanager",
    [string]$JsonPath = "scripts/github/issues.ide-projectsmanager.json",
    [switch]$DryRun
)

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )

    $prefix = "[{0}]" -f $Level
    switch ($Level) {
        "WARN" { Write-Host "$prefix $Message" -ForegroundColor Yellow }
        "ERROR" { Write-Host "$prefix $Message" -ForegroundColor Red }
        "SUCCESS" { Write-Host "$prefix $Message" -ForegroundColor Green }
        default { Write-Host "$prefix $Message" }
    }
}

if (-not $env:GITHUB_TOKEN) {
    Write-Log "Please set GITHUB_TOKEN environment variable" "ERROR"
    exit 1
}

if (-not (Test-Path $JsonPath)) {
    Write-Log "JSON file not found at $JsonPath" "ERROR"
    exit 1
}

$headers = @{
    Authorization = "token $env:GITHUB_TOKEN"
    "User-Agent" = "codex-issue-seeder"
    Accept = "application/vnd.github+json"
}

$issues = Get-Content -Raw $JsonPath | ConvertFrom-Json

if (-not $issues -or $issues.Count -eq 0) {
    Write-Log "No issues found in $JsonPath" "WARN"
    exit 0
}

Write-Log "Seeding issues for repository '$Repo' from '$JsonPath'"
if ($DryRun) {
    Write-Log "Dry-run enabled: no issues will be created" "WARN"
}

$openIssueTitles = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
$page = 1

while ($true) {
    $openIssuesUrl = "https://api.github.com/repos/$Repo/issues?state=open&per_page=100&page=$page"
    $openIssues = Invoke-RestMethod -Uri $openIssuesUrl -Method Get -Headers $headers

    if (-not $openIssues -or $openIssues.Count -eq 0) {
        break
    }

    foreach ($openIssue in $openIssues) {
        if ($openIssue.pull_request) {
            continue
        }

        [void]$openIssueTitles.Add($openIssue.title)
    }

    if ($openIssues.Count -lt 100) {
        break
    }

    $page++
}

Write-Log "Found $($openIssueTitles.Count) open issues (excluding pull requests)"

$createdCount = 0
$skippedCount = 0

foreach ($issue in $issues) {
    if (-not $issue.title) {
        Write-Log "Skipping entry with missing title" "WARN"
        $skippedCount++
        continue
    }

    if ($openIssueTitles.Contains($issue.title)) {
        Write-Log "Skipping duplicate open issue: $($issue.title)" "WARN"
        $skippedCount++
        continue
    }

    if ($DryRun) {
        Write-Log "[DRY-RUN] Would create issue: $($issue.title)"
        $createdCount++
        continue
    }

    Write-Log "Creating issue: $($issue.title)"

    $body = @{
        title = $issue.title
        body  = $issue.body
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/issues" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json" | Out-Null

    [void]$openIssueTitles.Add($issue.title)
    $createdCount++
    Start-Sleep -Milliseconds 500
}

if ($DryRun) {
    Write-Log "Dry-run completed: $createdCount issue(s) would be created, $skippedCount skipped" "SUCCESS"
} else {
    Write-Log "Issue seeding completed: $createdCount created, $skippedCount skipped" "SUCCESS"
}
