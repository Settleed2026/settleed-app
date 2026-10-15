# Diagnostic: find where node.exe and npm live on this machine
Write-Host "=== NODE.JS DIAGNOSTIC ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. where.exe node:" -ForegroundColor Yellow
where.exe node 2>&1

Write-Host ""
Write-Host "2. where.exe npm:" -ForegroundColor Yellow
where.exe npm 2>&1

Write-Host ""
Write-Host "3. Current process PATH entries with node/npm/nvm/volta:" -ForegroundColor Yellow
$env:PATH -split ";" | Where-Object { $_ -match "node|npm|nvm|volta|fnm" } | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "4. User PATH (registry) entries with node/npm/nvm/volta:" -ForegroundColor Yellow
try {
    $up = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment').GetValue('Path','')
    $up -split ";" | Where-Object { $_ -match "node|npm|nvm|volta|fnm" } | ForEach-Object { Write-Host "  $_" }
} catch { Write-Host "  (error reading registry)" }

Write-Host ""
Write-Host "5. Machine PATH (registry) entries with node/npm/nvm/volta:" -ForegroundColor Yellow
try {
    $mp = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Control\Session Manager\Environment').GetValue('Path','')
    $mp -split ";" | Where-Object { $_ -match "node|npm|nvm|volta|fnm" } | ForEach-Object { Write-Host "  $_" }
} catch { Write-Host "  (error reading registry)" }

Write-Host ""
Write-Host "6. node/npm environment variables:" -ForegroundColor Yellow
Get-ChildItem Env: | Where-Object { $_.Name -match "NVM|NODE|NPM|VOLTA|FNM" } | ForEach-Object { Write-Host "  $($_.Name) = $($_.Value)" }

Write-Host ""
Write-Host "7. Searching common directories for node.exe..." -ForegroundColor Yellow
$searchRoots = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\nvm",
    "$env:USERPROFILE\.volta",
    "$env:USERPROFILE\.nvm",
    "$env:USERPROFILE\scoop",
    "C:\ProgramData\chocolatey"
)
foreach ($r in $searchRoots) {
    if (Test-Path $r) {
        $found = Get-ChildItem $r -Recurse -Name "node.exe" -ErrorAction SilentlyContinue | Select-Object -First 3
        if ($found) {
            $found | ForEach-Object { Write-Host "  Found: $r\$_" -ForegroundColor Green }
        } else {
            Write-Host "  $r exists but no node.exe found" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "8. Git Bash environment PATH (with --login):" -ForegroundColor Yellow
$gitBash = "C:\Program Files\Git\bin\bash.exe"
if (Test-Path $gitBash) {
    $gitPath = (& $gitBash --login -c "echo \$PATH" 2>&1)
    $gitPath -split ":" | ForEach-Object { Write-Host "  $_" }
} else { Write-Host "  Git Bash not found" }

Write-Host ""
Write-Host "=== END DIAGNOSTIC ===" -ForegroundColor Cyan
Read-Host "Press Enter to close"
