$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Demetrius\Documents\Claude\Projects\Settleed"

# Build list of candidate git paths
$candidates = [System.Collections.Generic.List[string]]@(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe"
)

# Search GitHub Desktop bundled git
$ghBase = "$env:LOCALAPPDATA\GitHubDesktop"
if (Test-Path $ghBase) {
    Get-ChildItem $ghBase -Directory -Filter "app-*" | ForEach-Object {
        $p = Join-Path $_.FullName "resources\app\git\cmd\git.exe"
        if (Test-Path $p) { $candidates.Add($p) }
    }
}

# Try system git last (might be in PATH under a different name)
$sysGit = (Get-Command git -ErrorAction SilentlyContinue)?.Source
if ($sysGit) { $candidates.Insert(0, $sysGit) }

$git = $null
foreach ($p in $candidates) {
    try {
        $ver = & "$p" --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $git = $p
            Write-Host "Found git: $p ($ver)"
            break
        }
    } catch { }
}

if (-not $git) {
    Write-Host "ERROR: Could not find git.exe"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Pushing to GitHub..."
& "$git" push origin main
Write-Host ""
Write-Host "Exit code: $LASTEXITCODE"
Read-Host "Press Enter to exit"
