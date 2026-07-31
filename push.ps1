$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Demetrius\Documents\Claude\Projects\Settleed"

# Remove ALL stale git lock/temp files from .git
Get-ChildItem ".git" -File | Where-Object { $_.Name -match "\.(lock|bak|gone)$" } | ForEach-Object {
  Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
  Write-Host "Removed: $($_.Name)"
}

# Find git.exe
$candidates = [System.Collections.Generic.List[string]]@(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe"
)
$ghBase = "$env:LOCALAPPDATA\GitHubDesktop"
if (Test-Path $ghBase) {
    Get-ChildItem $ghBase -Directory -Filter "app-*" | ForEach-Object {
        $p = Join-Path $_.FullName "resources\app\git\cmd\git.exe"
        if (Test-Path $p) { $candidates.Add($p) }
    }
}
$sysGit = (Get-Command git -ErrorAction SilentlyContinue)?.Source
if ($sysGit) { $candidates.Insert(0, $sysGit) }

$git = $null
foreach ($p in $candidates) {
    try {
        $ver = & "$p" --version 2>&1
        if ($LASTEXITCODE -eq 0) { $git = $p; break }
    } catch { }
}

if (-not $git) {
    Write-Host "ERROR: Could not find git.exe"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Found git: $git ($ver)"

# Show what's pending
Write-Host ""
Write-Host "Local commits not yet on GitHub:"
& "$git" log --oneline origin/main..HEAD
Write-Host ""

# Push
Write-Host "Pushing to GitHub..."
& "$git" push origin main
Write-Host ""
Write-Host "Exit code: $LASTEXITCODE"
Read-Host "Press Enter to exit"
