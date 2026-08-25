@echo off
echo Clearing git lock files...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\objects\maintenance.lock" 2>nul
echo Lock files cleared. Opening GitHub Desktop...
start "" "C:\Users\Demetrius\AppData\Local\GitHubDesktop\GitHubDesktop.exe"
echo Done. Click "Push origin" in GitHub Desktop.
pause
