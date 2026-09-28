# Settleed iOS Capacitor Prep - Steps 2-4
# Run via: run-steps-2-4.bat (which launches this script)
# Steps: Place icons | Install Capacitor | Verify build

$ErrorActionPreference = "Continue"
$repoRoot = "C:\Users\Demetrius\Documents\Claude\Projects\Settleed"
$repoUnix = "/c/Users/Demetrius/Documents/Claude/Projects/Settleed"
Set-Location $repoRoot

# ============================================================
# STEP 2: Place app icons
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " STEP 2: Place app icons" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$sessionSuffix = "local-agent-mode-sessions\7df6e468-d067-435c-af32-cdf84ba6a499\7ae23bcf-6d90-4a70-9819-209b4b266962\local_4e39ad9b-1184-492b-b450-adc62bf34919\uploads\Settleed_App_Icon_Package (2).zip"

$zipCandidates = @()

# Search every Claude_* package (MSIX app - files are under LocalCache, not standard AppData)
$pkgsRoot = "$env:LOCALAPPDATA\Packages"
if (Test-Path $pkgsRoot) {
    Get-ChildItem $pkgsRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "Claude_*" } |
        ForEach-Object {
            $zipCandidates += "$($_.FullName)\LocalCache\Roaming\Claude\$sessionSuffix"
        }
}

$zipCandidates += "$env:APPDATA\Claude\$sessionSuffix"
$zipCandidates += "$env:USERPROFILE\Downloads\Settleed_App_Icon_Package.zip"
$zipCandidates += "$env:USERPROFILE\Downloads\Settleed_App_Icon_Package (2).zip"
$zipCandidates += "$env:USERPROFILE\Desktop\Settleed_App_Icon_Package.zip"

$zipFound = $null
foreach ($c in $zipCandidates) {
    if (Test-Path -LiteralPath $c) {
        $zipFound = $c
        Write-Host "  Found zip at: $c" -ForegroundColor Green
        break
    }
}

if ($zipFound) {
    $safePath = Join-Path $env:TEMP "settleed-icons.zip"
    Copy-Item -LiteralPath $zipFound -Destination $safePath -Force
    Write-Host "  Copied to safe temp path: $safePath" -ForegroundColor Gray
    & "$repoRoot\resources\setup-icons.ps1" -ZipPath $safePath
    Remove-Item $safePath -Force -ErrorAction SilentlyContinue
} else {
    Write-Warning "Icon zip not found. Skipping (icons can be placed manually later)."
    Write-Host "  To place icons manually, copy your zip to Downloads and re-run this script." -ForegroundColor Yellow
}

# ============================================================
# STEP 3 & 4: Install Capacitor + Verify Build
# We find npm via: system PATH → common install dirs → Git Bash fallback
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Finding npm..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$npmCmd = $null
$gitBashExe = $null
$useGitBash = $false

# 1. Try current process PATH
try {
    $npmCmd = (Get-Command npm -ErrorAction Stop).Source
    Write-Host "  npm in process PATH: $npmCmd" -ForegroundColor Green
} catch { }

# 2. Read User + Machine PATH directly from Windows registry (bypasses inherited process PATH)
if (-not $npmCmd) {
    Write-Host "  Scanning registry PATH for node/npm directories..." -ForegroundColor Gray
    try {
        $regMachine = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Control\Session Manager\Environment')
        $regUser    = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment')
        $allDirs = @()
        if ($regMachine) { $allDirs += ($regMachine.GetValue('Path','') -split ';') }
        if ($regUser)    { $allDirs += ($regUser.GetValue('Path','')    -split ';') }
        $allDirs = $allDirs | Where-Object { $_ -ne "" } | Select-Object -Unique

        foreach ($dir in $allDirs) {
            $expanded = [Environment]::ExpandEnvironmentVariables($dir)
            if (-not $expanded) { continue }
            $candidate = Join-Path $expanded "npm.cmd"
            if (Test-Path -LiteralPath $candidate) {
                $npmCmd = $candidate
                Write-Host "  npm found in registry PATH: $npmCmd" -ForegroundColor Green
                break
            }
        }
    } catch {
        Write-Host "  Registry PATH scan failed: $_" -ForegroundColor DarkGray
    }
}

# 3. Try where.exe (native Windows search)
if (-not $npmCmd) {
    $whereOut = (where.exe npm 2>&1)
    if ($LASTEXITCODE -eq 0 -and $whereOut) {
        $npmCmd = ($whereOut | Select-Object -First 1).ToString().Trim()
        Write-Host "  npm found via where.exe: $npmCmd" -ForegroundColor Green
    }
}

# 4. Try common install locations + version managers
if (-not $npmCmd) {
    $npmCandidates = @(
        "C:\Program Files\nodejs\npm.cmd",
        "C:\Program Files (x86)\nodejs\npm.cmd",
        "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd",
        "$env:APPDATA\nvm\current\npm.cmd",
        "$env:USERPROFILE\.volta\bin\npm.cmd",
        "$env:USERPROFILE\scoop\apps\nodejs\current\npm.cmd",
        "$env:USERPROFILE\scoop\apps\nodejs-lts\current\npm.cmd",
        "C:\ProgramData\chocolatey\bin\npm.cmd",
        "$env:LOCALAPPDATA\pnpm\nodejs\npm.cmd",
        "$env:LOCALAPPDATA\fnm\node-versions"
    )

    # NVM_SYMLINK / NVM_HOME env vars (nvm-for-windows)
    if ($env:NVM_SYMLINK)  { $npmCandidates = @("$env:NVM_SYMLINK\npm.cmd") + $npmCandidates }
    if ($env:NVM_HOME) {
        Get-ChildItem $env:NVM_HOME -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match 'v?\d' } | Sort-Object Name -Descending |
            ForEach-Object { $npmCandidates += "$($_.FullName)\npm.cmd" }
    }
    # fnm node versions
    $fnmDir = "$env:LOCALAPPDATA\fnm\node-versions"
    if (Test-Path $fnmDir) {
        Get-ChildItem $fnmDir -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object {
                $npmCandidates += "$($_.FullName)\installation\npm.cmd"
                $npmCandidates += "$($_.FullName)\npm.cmd"
            }
    }

    # Node.js registry key
    $nodeReg = Get-ItemProperty 'HKLM:\SOFTWARE\Node.js' -ErrorAction SilentlyContinue
    if ($nodeReg.InstallPath) {
        $npmCandidates = @("$($nodeReg.InstallPath.TrimEnd('\'))\npm.cmd") + $npmCandidates
    }

    foreach ($c in $npmCandidates) {
        if ($c -and (Test-Path -LiteralPath $c -ErrorAction SilentlyContinue)) {
            $npmCmd = $c
            Write-Host "  npm found at: $npmCmd" -ForegroundColor Green
            break
        }
    }
}

# 5. Git Bash login shell fallback
if (-not $npmCmd) {
    $gitBashPaths = @("C:\Program Files\Git\bin\bash.exe", "C:\Program Files (x86)\Git\bin\bash.exe")
    foreach ($gbp in $gitBashPaths) { if (Test-Path $gbp) { $gitBashExe = $gbp; break } }

    if ($gitBashExe) {
        # Try login shell (loads .bash_profile), then interactive (loads .bashrc)
        foreach ($flags in @("--login", "-i --login")) {
            Write-Host "  Trying Git Bash ($flags) for npm..." -ForegroundColor Gray
            $r = (& $gitBashExe $flags.Split(" ") -c "command -v npm 2>/dev/null" 2>&1)
            if ($r -and ($r | Out-String).Trim() -match "npm") {
                $useGitBash = $true
                Write-Host "  npm available in Git Bash ($flags)" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $npmCmd -and -not $useGitBash) {
    Write-Host ""
    Write-Host "[ERROR] Cannot find npm anywhere." -ForegroundColor Red
    Write-Host "  Is Node.js installed? Download: https://nodejs.org/en/download" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Diagnostic - PATH entries containing 'node':" -ForegroundColor Gray
    $env:PATH -split ";" | Where-Object { $_ -match "node|npm|nvm" } | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Helper: run npm with the right method
function Run-Npm {
    param([string]$NpmArgs)
    if ($useGitBash) {
        & $gitBashExe --login -i -c "cd '$repoUnix' && npm $NpmArgs"
    } else {
        Invoke-Expression "& `"$npmCmd`" $NpmArgs"
    }
    return $LASTEXITCODE
}

# ============================================================
# STEP 3: Install Capacitor packages
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " STEP 3: Install Capacitor packages" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "  >> npm install @capacitor/core @capacitor/ios"
Run-Npm "install @capacitor/core @capacitor/ios"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  >> npm install -D @capacitor/cli @capacitor/assets"
Run-Npm "install -D @capacitor/cli @capacitor/assets"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install -D failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================
# STEP 4: Verify build
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " STEP 4: Verify build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Run-Npm "run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "  Check the Vite output above for the specific error." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " STEPS 2-4 COMPLETE - no errors!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next: commit icon files + package.json changes to feature/ios-capacitor-prep" -ForegroundColor Cyan
Write-Host "      then push via GitHub Desktop." -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"
