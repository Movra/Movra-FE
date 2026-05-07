param(
    [ValidateSet("quick", "full")]
    [string]$Mode = "quick",

    [switch]$SkipPackageScripts,
    [switch]$StrictAny
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$script:Errors = 0
$script:Warnings = 0

function Write-Info {
    param([string]$Message)
    Write-Host "[agent-verify] $Message"
}

function Add-Error {
    param([string]$Message)
    $script:Errors += 1
    Write-Host "[error] $Message" -ForegroundColor Red
}

function Add-Warning {
    param([string]$Message)
    $script:Warnings += 1
    Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Test-RequiredDocs {
    $requiredDocs = @(
        "AGENT.md",
        "docs/prd.md",
        "docs/API-specification.md",
        "docs/FEATURE-SPECIFICATION.md",
        "docs/design.md",
        "docs/frontend-conventions.md",
        "docs/workflow.md",
        "docs/phase/README.md",
        "docs/phase/phase-plan.md"
    )

    Write-Info "checking required harness documents"

    foreach ($relativePath in $requiredDocs) {
        $path = Join-Path $Root $relativePath
        if (-not (Test-Path -LiteralPath $path)) {
            Add-Error "missing required document: $relativePath"
            continue
        }

        $item = Get-Item -LiteralPath $path
        if ($item.Length -eq 0) {
            Add-Error "required document is empty: $relativePath"
        }
    }
}

function Get-PackageScripts {
    $packagePath = Join-Path $Root "package.json"
    if (-not (Test-Path -LiteralPath $packagePath)) {
        return $null
    }

    try {
        $packageJson = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    }
    catch {
        Add-Error "package.json is not valid JSON"
        return $null
    }

    if (-not ($packageJson.PSObject.Properties.Name -contains "scripts")) {
        return @{}
    }

    $scriptMap = @{}
    foreach ($property in $packageJson.scripts.PSObject.Properties) {
        $scriptMap[$property.Name] = [string]$property.Value
    }
    return $scriptMap
}

function Invoke-NpmScriptIfPresent {
    param(
        [hashtable]$ScriptMap,
        [string]$Name
    )

    if (-not $ScriptMap.ContainsKey($Name)) {
        Add-Warning "package script not found, skipped: $Name"
        return
    }

    Write-Info "running npm script: $Name"
    Push-Location $Root
    try {
        & npm run $Name
        if ($LASTEXITCODE -ne 0) {
            Add-Error "npm script failed: $Name"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-PackageVerification {
    if ($SkipPackageScripts) {
        Add-Warning "package script execution skipped by flag"
        return
    }

    $scriptMap = Get-PackageScripts
    if ($null -eq $scriptMap) {
        Add-Warning "package.json not found, skipped npm verification"
        return
    }

    $names = @("lint", "typecheck", "test")
    if ($Mode -eq "full") {
        $names += "build"
    }

    foreach ($name in $names) {
        Invoke-NpmScriptIfPresent -ScriptMap $scriptMap -Name $name
    }
}

function Get-CodeFiles {
    $candidateDirs = @(
        "src",
        "app",
        "pages",
        "components",
        "features",
        "shared",
        "lib",
        "test",
        "tests",
        "__tests__",
        "e2e"
    )

    $extensions = @(".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte")
    $files = New-Object System.Collections.Generic.List[string]

    foreach ($dir in $candidateDirs) {
        $path = Join-Path $Root $dir
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }

        Get-ChildItem -LiteralPath $path -Recurse -File |
            Where-Object { $extensions -contains $_.Extension } |
            ForEach-Object { $files.Add($_.FullName) }
    }

    return $files
}

function Test-AntiPatterns {
    $files = @(Get-CodeFiles)
    if ($files.Count -eq 0) {
        Add-Warning "no frontend source files found, skipped anti-pattern scan"
        return
    }

    Write-Info "scanning source files for agent anti-patterns"

    foreach ($file in $files) {
        $relativePath = Resolve-Path -LiteralPath $file -Relative
        $lines = Get-Content -LiteralPath $file

        for ($index = 0; $index -lt $lines.Count; $index += 1) {
            $lineNumber = $index + 1
            $line = $lines[$index]

            if ($line -match "\b(describe|it|test)\.skip\s*\(") {
                Add-Error "test skip detected: ${relativePath}:$lineNumber"
            }

            if ($line -match "\b(describe|it|test)\.only\s*\(") {
                Add-Error "focused test detected: ${relativePath}:$lineNumber"
            }

            if ($line -match "(:\s*any\b|\bas\s+any\b|<any>)") {
                if ($StrictAny) {
                    Add-Error "any usage detected: ${relativePath}:$lineNumber"
                }
                else {
                    Add-Warning "any usage should be justified: ${relativePath}:$lineNumber"
                }
            }

            if ($line -match "\bconsole\.log\s*\(") {
                Add-Warning "console.log left in source: ${relativePath}:$lineNumber"
            }
        }
    }
}

Write-Info "mode: $Mode"
Test-RequiredDocs
Invoke-PackageVerification
Test-AntiPatterns

if ($script:Errors -gt 0) {
    Write-Host "[agent-verify] failed with $script:Errors error(s), $script:Warnings warning(s)" -ForegroundColor Red
    exit 1
}

Write-Host "[agent-verify] passed with $script:Warnings warning(s)" -ForegroundColor Green
exit 0
