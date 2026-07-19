@echo off
echo Clearing git lock files...
cd /d "%~dp0"
del /f ".git\HEAD.lock" 2>nul
del /f ".git\index.lock" 2>nul
echo Pushing to GitHub...
git push origin main
echo Done!
pause
