@echo off
echo Clearing git lock files...
cd /d "%~dp0"
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\MERGE_HEAD.lock" 2>nul
del /f /q ".git\COMMIT_EDITMSG.lock" 2>nul
echo Pushing to GitHub...
git push origin main
echo.
echo Done. Check Vercel dashboard for deployment status.
pause
