@echo off
cd /d "C:\Users\Demetrius\Documents\Claude\Projects\Settleed"

echo.
echo ========================================
echo  STEP 1: Amend commit message
echo ========================================
git checkout feature/ios-capacitor-prep
git commit --amend -m "feat: iOS Capacitor preparation - viewport, platform detection, payment audit, build config"
if %errorlevel% neq 0 (
    echo [ERROR] git commit amend failed - check output above
    pause
    exit /b 1
)
git push --force-with-lease origin feature/ios-capacitor-prep
if %errorlevel% neq 0 (
    echo [ERROR] git push failed - check output above
    pause
    exit /b 1
)

echo.
echo ========================================
echo  STEP 2: Place app icons
echo ========================================
powershell -ExecutionPolicy Bypass -Command "& '.\resources\setup-icons.ps1' -ZipPath 'C:\Users\Demetrius\AppData\Roaming\Claude\local-agent-mode-sessions\7df6e468-d067-435c-af32-cdf84ba6a499\7ae23bcf-6d90-4a70-9819-209b4b266962\local_4e39ad9b-1184-492b-b450-adc62bf34919\uploads\Settleed_App_Icon_Package (2).zip'"
if %errorlevel% neq 0 (
    echo [ERROR] Icon setup failed - check output above
    pause
    exit /b 1
)

echo.
echo ========================================
echo  STEP 3: Install Capacitor packages
echo ========================================
npm install @capacitor/core @capacitor/ios
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed - check output above
    pause
    exit /b 1
)
npm install -D @capacitor/cli @capacitor/assets
if %errorlevel% neq 0 (
    echo [ERROR] npm install -D failed - check output above
    pause
    exit /b 1
)

echo.
echo ========================================
echo  STEP 4: Verify build
echo ========================================
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed - check output above
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ALL STEPS COMPLETE - no errors!
echo ========================================
pause
