@echo off
cd /d "C:\Users\Demetrius\Documents\Claude\Projects\Settleed"

rem Add the most common Node.js install locations to PATH so PowerShell inherits them.
rem If Node.js lives elsewhere (e.g. nvm), the PS1 script will search for it automatically.
set "PATH=C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\nvm\current;%APPDATA%\npm;%PATH%"

echo Launching Steps 2-4 via PowerShell...
powershell -ExecutionPolicy Bypass -File ".\resources\run-steps-2-4.ps1"
