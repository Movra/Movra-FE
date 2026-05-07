Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$GitDir = Join-Path $Root ".git"
$GitHooksDir = Join-Path $GitDir "hooks"

if (-not (Test-Path -LiteralPath $GitDir)) {
    Write-Host "[install-git-hooks] .git directory not found. Run this after git init or clone." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path -LiteralPath $GitHooksDir)) {
    New-Item -ItemType Directory -Path $GitHooksDir | Out-Null
}

$preCommit = @'
#!/bin/sh
if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File "./hooks/pre-commit.ps1"
else
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "./hooks/pre-commit.ps1"
fi
exit $?
'@

$commitMsg = @'
#!/bin/sh
MSG_FILE="$1"
if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File "./hooks/commit-msg.ps1" -MessageFile "$MSG_FILE"
else
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "./hooks/commit-msg.ps1" -MessageFile "$MSG_FILE"
fi
exit $?
'@

Set-Content -LiteralPath (Join-Path $GitHooksDir "pre-commit") -Value $preCommit -Encoding ASCII
Set-Content -LiteralPath (Join-Path $GitHooksDir "commit-msg") -Value $commitMsg -Encoding ASCII

Write-Host "[install-git-hooks] installed pre-commit and commit-msg hooks" -ForegroundColor Green
exit 0
