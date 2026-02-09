[CmdletBinding()]
param(
    [string]$Message,
    [switch]$Push
)

$repoRoot = Resolve-Path "$PSScriptRoot/.."
Set-Location $repoRoot

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Nada para commitar; working tree limpa."
    exit 0
}

if (-not $Message) {
    $Message = "auto-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
}

git add -A
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if ($Push) {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    git push -u origin $branch
}
