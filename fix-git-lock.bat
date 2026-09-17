@echo off
echo ========================================
echo  Settleed Git Lock File Fix
echo ========================================
echo.
echo Searching for ALL .lock files in .git folders...
echo.

set FOUND=0

for /r "C:\Users\Demetrius\Documents" %%f in (*.lock) do (
    echo [FOUND] %%f
    del "%%f" 2>nul && (
        echo [DELETED] %%f
        set FOUND=1
    ) || echo [ERROR] Could not delete %%f - may need admin rights
)

if %FOUND%==0 (
    echo No .lock files found.
    echo.
    echo Trying direct path for this repo...
)

REM Also target the specific HEAD.lock we know about
set TARGET=C:\Users\Demetrius\Documents\Claude\Projects\Settleed\.git\HEAD.lock
if exist "%TARGET%" (
    echo.
    echo [FOUND] %TARGET%
    del "%TARGET%" 2>nul && echo [DELETED] %TARGET% || echo [ERROR] Could not delete
) else (
    echo [OK] HEAD.lock not found at %TARGET%
)

echo.
echo ========================================
echo  Done! Go back to GitHub Desktop and
echo  try your commit again.
echo ========================================
echo.
pause
