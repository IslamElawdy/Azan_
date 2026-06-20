#Requires -Version 5.1
<#
.SYNOPSIS
  Build, sign, install, and launch AzanTV on a Samsung Smart TV (Developer Mode).

.EXAMPLE
  .\deploy-to-tv.ps1
  .\deploy-to-tv.ps1 -TvSerial "192.168.178.50:26101"
  .\deploy-to-tv.ps1 -InstallOnly
#>
[CmdletBinding()]
param(
    [string]$ProjectDir = "",
    [string]$CertProfile = "azanTV_profile",
    [string]$AppId = "GfnCKw2I8W.AzanTV",
    [string]$TvSerial = "",
    [switch]$BuildOnly,
    [switch]$InstallOnly,
    [switch]$SkipRun
)

$ErrorActionPreference = "Stop"

if (-not $ProjectDir) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectDir = (Resolve-Path (Join-Path $scriptRoot "..")).Path
}

$TizenCli = "C:\tizen-studio\tools\ide\bin\tizen.bat"
$Sdb = "C:\tizen-studio\tools\sdb.exe"
$env:JAVA_HOME = "C:\tizen-studio\jdk"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-TvSerial {
    $lines = & $Sdb devices 2>&1 | Out-String
    $matches = [regex]::Matches($lines, "(?m)^([^\s]+)\s+device\s*$")
    $serials = @($matches | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch "^List of" })
    if ($serials.Count -eq 0) {
        $connectHelp = @(
            "Kein TV verbunden.",
            "",
            "1. Developer Mode am Fernseher aktivieren",
            "2. Device Manager: TV-IP, Port 26101, Verbindung On",
            "3. Erneut: .\deploy-to-tv.ps1"
        ) -join "`n"
        throw $connectHelp
    }
    if ($serials.Count -gt 1 -and -not $TvSerial) {
        Write-Host "Mehrere Geraete gefunden:" -ForegroundColor Yellow
        $serials | ForEach-Object { Write-Host "  - $_" }
        throw "Bitte -TvSerial angeben, z.B. -TvSerial `"$($serials[0])`""
    }
    if ($TvSerial) { return $TvSerial }
    return $serials[0]
}

function Invoke-TizenBuild {
    param([string]$Dir)
    Push-Location $Dir
    try {
        Write-Step "Build Web Application in $Dir"
        & $TizenCli build-web -- . | Write-Host
        if ($LASTEXITCODE -ne 0) { throw "build-web fehlgeschlagen (Exit $LASTEXITCODE)" }
    }
    finally {
        Pop-Location
    }
}

function Invoke-TizenPackage {
    param([string]$Dir)
    Push-Location $Dir
    try {
        Write-Step "Paket signieren mit Profil '$CertProfile'"
        & $TizenCli package -t wgt -s $CertProfile -- . | Write-Host
        if ($LASTEXITCODE -ne 0) { throw "package fehlgeschlagen (Exit $LASTEXITCODE)" }
        $wgt = Join-Path $Dir "AzanTV.wgt"
        if (-not (Test-Path $wgt)) { throw "AzanTV.wgt wurde nicht erzeugt" }
        $sizeKb = [math]::Round((Get-Item $wgt).Length / 1KB, 1)
        Write-Host "WGT: $wgt ($sizeKb KB)" -ForegroundColor Green
        return $wgt
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $TizenCli)) {
    throw "Tizen CLI nicht gefunden: $TizenCli"
}

$buildDir = $ProjectDir
$wgtPath = Join-Path $ProjectDir "AzanTV.wgt"

function Test-BuildDirLocked {
    param([string]$Dir)
    Push-Location $Dir
    try {
        & $TizenCli build-web -- . 2>&1 | Out-Null
        return @{ Ok = ($LASTEXITCODE -eq 0); ExitCode = $LASTEXITCODE }
    }
    finally {
        Pop-Location
    }
}

function Build-And-Package {
    param([string]$Dir)
    Invoke-TizenBuild -Dir $Dir | Out-Null
    return Invoke-TizenPackage -Dir $Dir
}

if (-not $InstallOnly) {
    $probe = Test-BuildDirLocked -Dir $buildDir
    if ($probe.Ok) {
        $wgtPath = Invoke-TizenPackage -Dir $buildDir
    }
    else {
        Write-Host 'Direkt-Build fehlgeschlagen - verwende Temp-Kopie (Tizen Studio schliessen hilft).' -ForegroundColor Yellow
        $buildDir = Join-Path (Split-Path $ProjectDir -Parent) ('azanTV-deploy-' + (Get-Date -Format 'yyyyMMddHHmmss'))
        $null = New-Item -ItemType Directory -Path $buildDir -Force
        robocopy $ProjectDir $buildDir /E /XD .metadata .buildResult .settings /XF *.wgt /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
        $wgtPath = Build-And-Package -Dir $buildDir
    }
}

if ($BuildOnly) {
    Write-Host "Fertig (nur Build)." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $wgtPath)) {
    throw "Keine WGT gefunden: $wgtPath (ohne -InstallOnly zuerst bauen)"
}

$serial = Get-TvSerial
Write-Step "Installiere auf $serial"
& $TizenCli install -n (Split-Path $wgtPath -Leaf) -s $serial -- (Split-Path $wgtPath -Parent) | Write-Host
if ($LASTEXITCODE -ne 0) {
    $installHelp = @(
        "Installation fehlgeschlagen.",
        "",
        "Haeufige Ursachen:",
        "* DUID des TVs nicht im Samsung-Zertifikat",
        "* Developer Mode aus oder falsche PC-IP",
        "* Alte App: tizen uninstall -p ${AppId} -s $serial"
    ) -join "`n"
    throw $installHelp
}

if (-not $SkipRun) {
    Write-Step "Starte ${AppId}"
    & $TizenCli run -p $AppId -s $serial | Write-Host
    if ($LASTEXITCODE -ne 0) { throw "App-Start fehlgeschlagen (Exit $LASTEXITCODE)" }
}

Write-Host ''
Write-Host 'AzanTV ist auf dem Fernseher installiert.' -ForegroundColor Green
Write-Host 'App in Smart Hub unter Meine Apps suchen (nicht im oeffentlichen Store).'
