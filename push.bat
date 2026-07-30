@echo off
cd /d "C:\Users\Demetrius\Documents\Claude\Projects\Settleed"
set PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin
echo Clearing git locks...
del /f ".git\HEAD.lock" 2>nul
del /f ".git\index.lock" 2>nul
echo Committing and pushing...
git add src/pages/Landing.jsx
git commit -m "fix: add Admin button to nav bar on landing page"
git push origin main
echo.
echo Done! You can delete push.bat now.
pause
