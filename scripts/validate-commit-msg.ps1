param(
    [string]$MessageFile,
    [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$allowedTypes = @("feat", "fix", "refactor", "docs", "test", "chore", "perf", "ci")
$allowedPhases = @("red", "green", "refactor", "structural", "behavioral", "chore")

function Fail {
    param([string]$Reason)

    Write-Host "[commit-msg] invalid commit message: $Reason" -ForegroundColor Red
    Write-Host ""
    Write-Host "Required format:"
    Write-Host "  <type>[<phase>]: <subject>"
    Write-Host ""
    Write-Host "Allowed types:"
    Write-Host "  $($allowedTypes -join ', ')"
    Write-Host ""
    Write-Host "Allowed phases:"
    Write-Host "  $($allowedPhases -join ', ')"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  test[red]: login failure message spec"
    Write-Host "  feat[green]: show login api error"
    Write-Host "  refactor[refactor]: simplify login field rendering"
    Write-Host "  docs[behavioral]: add api error handling rule"
    Write-Host "  docs[structural]: reorder workflow sections"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    if ([string]::IsNullOrWhiteSpace($MessageFile)) {
        Fail "message file or message is required"
    }

    if (-not (Test-Path -LiteralPath $MessageFile)) {
        Fail "message file not found: $MessageFile"
    }

    $Message = Get-Content -LiteralPath $MessageFile |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    Fail "subject is empty"
}

$firstLine = $Message.Trim()

if ($firstLine.Length -gt 120) {
    Fail "first line is longer than 120 characters"
}

$pattern = "^(?<type>feat|fix|refactor|docs|test|chore|perf|ci)\[(?<phase>red|green|refactor|structural|behavioral|chore)\]: (?<subject>.+)$"
$match = [regex]::Match($firstLine, $pattern)

if (-not $match.Success) {
    Fail "expected '<type>[<phase>]: <subject>'"
}

$type = $match.Groups["type"].Value
$phase = $match.Groups["phase"].Value
$subject = $match.Groups["subject"].Value.Trim()

if ([string]::IsNullOrWhiteSpace($subject)) {
    Fail "subject is empty"
}

if ($subject -match "^(wip|temp|temporary|quick fix)\b") {
    Fail "subject must not start with WIP or temporary language"
}

if ($type -eq "docs" -and @("red", "green", "refactor") -contains $phase) {
    Fail "docs commits must use behavioral, structural, or chore phase"
}

if ($type -eq "refactor" -and $phase -notin @("refactor", "structural")) {
    Fail "refactor commits must use refactor or structural phase"
}

Write-Host "[commit-msg] valid: $firstLine" -ForegroundColor Green
exit 0
