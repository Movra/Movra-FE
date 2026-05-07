Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$VerifyScript = Join-Path $Root "scripts/agent-verify.ps1"

if (-not (Test-Path -LiteralPath $VerifyScript)) {
    Write-Host "[pre-commit] missing script: scripts/agent-verify.ps1" -ForegroundColor Red
    exit 1
}

& $VerifyScript -Mode quick
exit $LASTEXITCODE
