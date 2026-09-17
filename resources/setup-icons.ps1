# Settleed Icon Setup Script
# Run this once in PowerShell from the repo root to place all icon assets.
# Usage: cd <repo root>; .\resources\setup-icons.ps1 <path-to-zip>
#
# Example:
#   .\resources\setup-icons.ps1 "C:\Users\Demetrius\Downloads\Settleed_App_Icon_Package.zip"

param(
    [Parameter(Mandatory=$true)]
    [string]$ZipPath
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$tempDir  = Join-Path $env:TEMP "settleed-icons-$(Get-Random)"

Write-Host "Extracting $ZipPath ..." -ForegroundColor Cyan
Expand-Archive -Path $ZipPath -DestinationPath $tempDir -Force

# List what was extracted
Write-Host "Extracted files:" -ForegroundColor Gray
Get-ChildItem $tempDir -Recurse -File | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

# Helper: find a file by pattern inside extracted dir
function Find-Icon([string]$pattern) {
    Get-ChildItem $tempDir -Recurse -Filter $pattern | Select-Object -First 1
}

# ---- icon-192.png ----
$src192 = Find-Icon "icon-192.png"
if (-not $src192) { $src192 = Find-Icon "*192*" }
if ($src192) {
    $dst = Join-Path $repoRoot "public\icon-192.png"
    Copy-Item $src192.FullName -Destination $dst -Force
    Write-Host "Placed icon-192.png -> public\icon-192.png" -ForegroundColor Green
} else {
    Write-Warning "Could not find a 192px icon in the zip. Check extracted files above."
}

# ---- icon-512.png ----
$src512 = Find-Icon "icon-512.png"
if (-not $src512) { $src512 = Find-Icon "*512*" }
if ($src512) {
    $dst = Join-Path $repoRoot "public\icon-512.png"
    Copy-Item $src512.FullName -Destination $dst -Force
    Write-Host "Placed icon-512.png -> public\icon-512.png" -ForegroundColor Green
} else {
    Write-Warning "Could not find a 512px icon in the zip. Check extracted files above."
}

# ---- 1024px master ----
$src1024 = Find-Icon "icon-1024.png"
if (-not $src1024) { $src1024 = Find-Icon "*1024*" }
if (-not $src1024) { $src1024 = Find-Icon "icon.png" }
if ($src1024) {
    $dst = Join-Path $repoRoot "resources\icon.png"
    Copy-Item $src1024.FullName -Destination $dst -Force
    Write-Host "Placed 1024px master -> resources\icon.png" -ForegroundColor Green
} else {
    Write-Warning "Could not find a 1024px icon in the zip. Save it manually as resources\icon.png"
}

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "Done. Verify with:" -ForegroundColor Cyan
Write-Host "  ls public\icon-192.png, public\icon-512.png" -ForegroundColor Cyan
Write-Host "  ls resources\icon.png" -ForegroundColor Cyan
