param(
    [Parameter(Mandatory = $true)]
    [string]$MessageFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ValidatorScript = Join-Path $Root "scripts/validate-commit-msg.ps1"

if (-not (Test-Path -LiteralPath $ValidatorScript)) {
    Write-Host "[commit-msg] missing script: scripts/validate-commit-msg.ps1" -ForegroundColor Red
    exit 1
}

& $ValidatorScript -MessageFile $MessageFile
exit $LASTEXITCODE
