@echo off
echo Deleting old connect API files...
del /f "api\create-connect-account.js"
del /f "api\create-connect-login.js"
echo Done! Now commit and push in GitHub Desktop.
pause
