#Requires -Version 5.1
<#
.SYNOPSIS
  Build a signed WGT for AzanTV (TV runtime files only).

.DESCRIPTION
  Packages from .buildResult so companion/docs/scripts are not included.
  Uses signing profile azanTV_profile by default.
#>
[CmdletBinding()]
param(
    [string]$ProjectDir = "",
    [string]$CertProfile = "azanTV_profile"
)

$ErrorActionPreference = "Stop"

if (-not $ProjectDir) {
    $ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$TizenCli = "C:\tizen-studio\tools\ide\bin\tizen.bat"
$env:JAVA_HOME = "C:\tizen-studio\jdk"

function Remove-IfExists([string]$Path) {
    if (Test-Path $Path) {
        Remove-Item $Path -Recurse -Force
    }
}

Write-Host "==> Clean build artifacts" -ForegroundColor Cyan
Push-Location $ProjectDir
try {
    Remove-IfExists (Join-Path $ProjectDir ".buildResult")
    Remove-IfExists (Join-Path $ProjectDir ".metadata")
    Remove-Item (Join-Path $ProjectDir "*.wgt") -Force -ErrorAction SilentlyContinue

    & $TizenCli clean | Write-Host
    & $TizenCli build-web -- . | Write-Host
    if ($LASTEXITCODE -ne 0) { throw "build-web failed ($LASTEXITCODE)" }

  # Strip non-runtime folders that may have been copied into .buildResult
    $buildResult = Join-Path $ProjectDir ".buildResult"
    foreach ($name in @(".metadata", "companion", "docs", "scripts", "README.md", ".gitignore")) {
        Remove-IfExists (Join-Path $buildResult $name)
    }

    & $TizenCli package -t wgt -s $CertProfile -- $buildResult | Write-Host
    if ($LASTEXITCODE -ne 0) { throw "package failed ($LASTEXITCODE)" }

    $wgt = Join-Path $buildResult "AzanTV.wgt"
    if (-not (Test-Path $wgt)) {
        $wgt = Get-ChildItem $buildResult -Filter "*.wgt" | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $wgt) { throw "No .wgt produced in .buildResult" }

    $dest = Join-Path $ProjectDir (Split-Path $wgt -Leaf)
    Copy-Item $wgt $dest -Force
    $sizeKb = [math]::Round((Get-Item $dest).Length / 1KB, 1)
    Write-Host "WGT ready: $dest ($sizeKb KB)" -ForegroundColor Green
    return $dest
}
finally {
    Pop-Location
}
