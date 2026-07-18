@echo off
cd /d "C:\Users\Demetrius\OneDrive - Georgia Institute of Technology\Documents\Claude\Projects\Settleed"

echo Step 1: Kill any stale git processes...
taskkill /f /im git.exe 2>nul
taskkill /f /im git-remote-https.exe 2>nul
ping -n 2 127.0.0.1 >nul

echo Step 2: Remove stale git locks...
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\MERGE_HEAD" 2>nul
del /f /q ".git\MERGE_MSG" 2>nul
del /f /q ".git\ORIG_HEAD" 2>nul

echo Step 3: Verify locks gone...
if exist ".git\index.lock" echo WARNING: index.lock still exists!
if exist ".git\MERGE_HEAD" echo WARNING: MERGE_HEAD still exists!

echo Step 4: Stage all changes...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed
    pause
    exit /b 1
)

echo Step 5: Commit...
git commit -m "fix: tenant dashboard blank screen, landlord profile, signup flow, dynamic greeting"
if errorlevel 1 (
    echo ERROR: git commit failed
    pause
    exit /b 1
)

echo Step 6: Push to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: git push failed
    pause
    exit /b 1
)

echo.
echo SUCCESS! All changes pushed to GitHub. Vercel will deploy shortly.
pause
