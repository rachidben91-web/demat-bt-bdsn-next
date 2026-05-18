param(
    [string]$ServerHost,
    [string]$ServerUser,
    [int]$ServerPort = 22,
    [string]$RemoteDir,
    [string]$ArchiveOutputDir = "$env:USERPROFILE\Desktop\pc-backup",
    [string[]]$AdditionalPaths = @(),
    [switch]$SkipUpload,
    [switch]$IncludeFullCodex,
    [switch]$IncludeGitHubRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Add-ExistingPath {
    param(
        [System.Collections.Generic.List[string]]$Collection,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $expandedPath = [Environment]::ExpandEnvironmentVariables($Path)
    if (Test-Path -LiteralPath $expandedPath) {
        $resolvedPath = (Resolve-Path -LiteralPath $expandedPath).Path
        if (-not $Collection.Contains($resolvedPath)) {
            $Collection.Add($resolvedPath)
        }
    }
    else {
        Write-Warning "Chemin introuvable, ignoré : $expandedPath"
    }
}

function Copy-ItemSafe {
    param(
        [string]$SourcePath,
        [string]$DestinationRoot
    )

    $resolvedSource = (Resolve-Path -LiteralPath $SourcePath).Path
    $driveQualifier = ""

    if ($resolvedSource.Length -ge 2 -and $resolvedSource[1] -eq ":") {
        $driveQualifier = $resolvedSource.Substring(0, 1)
        $relativePath = $resolvedSource.Substring(2).TrimStart("\")
    }
    else {
        $relativePath = $resolvedSource.TrimStart("\")
    }

    $destinationPath = if ($driveQualifier) {
        Join-Path $DestinationRoot (Join-Path $driveQualifier $relativePath)
    }
    else {
        Join-Path $DestinationRoot $relativePath
    }

    $destinationParent = Split-Path -Parent $destinationPath
    if (-not (Test-Path -LiteralPath $destinationParent)) {
        New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }

    if ((Get-Item -LiteralPath $resolvedSource) -is [System.IO.DirectoryInfo]) {
        Copy-Item -LiteralPath $resolvedSource -Destination $destinationPath -Recurse -Force
    }
    else {
        Copy-Item -LiteralPath $resolvedSource -Destination $destinationPath -Force
    }
}

function Copy-RepositorySnapshot {
    param(
        [string]$RepositoryPath,
        [string]$DestinationRoot
    )

    $resolvedRepo = (Resolve-Path -LiteralPath $RepositoryPath).Path
    $destinationRepoRoot = Join-Path $DestinationRoot (Join-Path $resolvedRepo.Substring(0, 1) $resolvedRepo.Substring(2).TrimStart("\"))

    if (-not (Test-Path -LiteralPath $destinationRepoRoot)) {
        New-Item -ItemType Directory -Path $destinationRepoRoot -Force | Out-Null
    }

    $gitDirectory = Join-Path $resolvedRepo ".git"
    if (-not (Test-Path -LiteralPath $gitDirectory)) {
        Copy-ItemSafe -SourcePath $resolvedRepo -DestinationRoot $DestinationRoot
        return
    }

    $repoFiles = & git -C $resolvedRepo ls-files --cached --others --exclude-standard
    if ($LASTEXITCODE -ne 0) {
        throw "Impossible de lister les fichiers du depot Git : $resolvedRepo"
    }

    $excludedRepoPatterns = @(
        ".next-dev.err",
        ".next-dev.log",
        "*.log"
    )

    foreach ($relativeFile in $repoFiles) {
        if ($excludedRepoPatterns | Where-Object { $relativeFile -like $_ }) {
            continue
        }

        $sourceFile = Join-Path $resolvedRepo $relativeFile
        if (-not (Test-Path -LiteralPath $sourceFile)) {
            continue
        }

        $destinationFile = Join-Path $destinationRepoRoot $relativeFile
        $destinationParent = Split-Path -Parent $destinationFile
        if (-not (Test-Path -LiteralPath $destinationParent)) {
            New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
        }

        Copy-Item -LiteralPath $sourceFile -Destination $destinationFile -Force
    }
}

function Test-CommandExists {
    param([string]$CommandName)

    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "windows-migration-$timestamp"
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) $backupName
$archiveDirectory = Join-Path $ArchiveOutputDir ""
$archivePath = Join-Path $archiveDirectory "$backupName.zip"

$codexRoot = Join-Path $env:USERPROFILE ".codex"
$githubRoot = Join-Path $env:USERPROFILE "Documents\GitHub"
$currentRepo = (Resolve-Path ".").Path

$pathsToBackup = [System.Collections.Generic.List[string]]::new()

Write-Section "Collecte des chemins"

Add-ExistingPath -Collection $pathsToBackup -Path (Join-Path $currentRepo ".env.local")
Add-ExistingPath -Collection $pathsToBackup -Path (Join-Path $env:USERPROFILE ".gitconfig")
Add-ExistingPath -Collection $pathsToBackup -Path (Join-Path $env:USERPROFILE ".ssh")

if ($IncludeFullCodex) {
    Add-ExistingPath -Collection $pathsToBackup -Path $codexRoot
}
else {
    @(
        "config.toml",
        "auth.json",
        ".codex-global-state.json",
        "memories",
        "sessions",
        "skills",
        "rules",
        "state_5.sqlite",
        "state_5.sqlite-shm",
        "state_5.sqlite-wal",
        "logs_2.sqlite",
        "logs_2.sqlite-shm",
        "logs_2.sqlite-wal",
        "transcription-history.jsonl"
    ) | ForEach-Object {
        Add-ExistingPath -Collection $pathsToBackup -Path (Join-Path $codexRoot $_)
    }
}

if ($IncludeGitHubRoot) {
    Add-ExistingPath -Collection $pathsToBackup -Path $githubRoot
}

foreach ($additionalPath in $AdditionalPaths) {
    Add-ExistingPath -Collection $pathsToBackup -Path $additionalPath
}

if ($pathsToBackup.Count -eq 0) {
    throw "Aucun chemin valide à sauvegarder."
}

if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
New-Item -ItemType Directory -Path $archiveDirectory -Force | Out-Null

Write-Section "Copie vers la zone de staging"

Write-Host "Copie du depot (sans node_modules/.next et autres ignores Git) : $currentRepo"
Copy-RepositorySnapshot -RepositoryPath $currentRepo -DestinationRoot $stagingRoot

foreach ($path in $pathsToBackup) {
    Write-Host "Copie : $path"
    Copy-ItemSafe -SourcePath $path -DestinationRoot $stagingRoot
}

$summaryPath = Join-Path $stagingRoot "BACKUP_SUMMARY.txt"
$summaryLines = @(
    "Sauvegarde de migration Windows",
    "Date : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")",
    "Machine : $env:COMPUTERNAME",
    "Utilisateur : $env:USERNAME",
    "",
    "Archive : $archivePath",
    "Depot courant : $currentRepo",
    "",
    "Le depot Git est sauvegarde via git ls-files pour exclure les fichiers ignores.",
    "",
    "Chemins inclus :"
) + ($pathsToBackup | ForEach-Object { "- $_" })

Set-Content -LiteralPath $summaryPath -Value $summaryLines -Encoding UTF8

if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}

Write-Section "Creation de l'archive"
Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $archivePath -CompressionLevel Optimal
Write-Host "Archive creee : $archivePath" -ForegroundColor Green

if (-not $SkipUpload) {
    if ([string]::IsNullOrWhiteSpace($ServerHost) -or [string]::IsNullOrWhiteSpace($ServerUser) -or [string]::IsNullOrWhiteSpace($RemoteDir)) {
        Write-Warning "Upload ignore : renseigne -ServerHost, -ServerUser et -RemoteDir, ou utilise -SkipUpload."
    }
    else {
        if (-not (Test-CommandExists -CommandName "ssh")) {
            throw "La commande ssh est introuvable. Installe OpenSSH Client ou utilise -SkipUpload."
        }

        if (-not (Test-CommandExists -CommandName "scp")) {
            throw "La commande scp est introuvable. Installe OpenSSH Client ou utilise -SkipUpload."
        }

        Write-Section "Preparation du dossier distant"
        & ssh -p $ServerPort "$ServerUser@$ServerHost" "mkdir -p '$RemoteDir'"

        Write-Section "Upload vers le serveur"
        & scp -P $ServerPort $archivePath "${ServerUser}@${ServerHost}:$RemoteDir/"

        Write-Host "Upload termine vers ${ServerUser}@${ServerHost}:$RemoteDir/" -ForegroundColor Green
    }
}

Write-Section "Termine"
Write-Host "Archive locale : $archivePath"
Write-Host "Resume : $summaryPath"
