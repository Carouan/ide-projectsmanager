param(
    [string]$Repo = "Carouan/ide-projectsmanager",
    [string]$JsonPath = "scripts/github/issues.ide-projectsmanager.json"
)

if (-not $env:GITHUB_TOKEN) {
    Write-Error "Please set GITHUB_TOKEN environment variable"
    exit 1
}

if (-not (Test-Path $JsonPath)) {
    Write-Error "JSON file not found at $JsonPath"
    exit 1
}

$headers = @{
    Authorization = "token $env:GITHUB_TOKEN"
    "User-Agent" = "codex-issue-seeder"
}

$issues = Get-Content $JsonPath | ConvertFrom-Json

foreach ($issue in $issues) {
    Write-Host "Creating issue: $($issue.title)"

    $body = @{
        title = $issue.title
        body  = $issue.body
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod \
        -Uri "https://api.github.com/repos/$Repo/issues" \
        -Method Post \
        -Headers $headers \
        -Body $body \
        -ContentType "application/json"

    Start-Sleep -Milliseconds 500
}

Write-Host "All issues created successfully."
