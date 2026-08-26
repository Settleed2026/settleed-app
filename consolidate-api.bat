@echo off
echo Consolidating API to 12 functions...
cd /d "%~dp0"

REM Clear any git locks
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul

REM Remove the 12 old API files
git rm --cached api/ai-listing-writer.js api/ai-qa.js api/sign-lease.js api/activate-lease.js api/create-subscription.js api/cancel-subscription.js api/create-service-checkout.js api/feature-listing.js api/admin-notify.js api/send-match-alerts.js api/recertification-alerts.js api/saved-search-alerts.js

del /f "api\ai-listing-writer.js"
del /f "api\ai-qa.js"
del /f "api\sign-lease.js"
del /f "api\activate-lease.js"
del /f "api\create-subscription.js"
del /f "api\cancel-subscription.js"
del /f "api\create-service-checkout.js"
del /f "api\feature-listing.js"
del /f "api\admin-notify.js"
del /f "api\send-match-alerts.js"
del /f "api\recertification-alerts.js"
del /f "api\saved-search-alerts.js"

REM Stage the 4 new combined files
git add api/ai.js api/lease.js api/subscription.js api/alerts.js
git add vercel.json vite.config.js package-lock.json

echo.
echo API files remaining:
dir /b api\*.js
echo.

REM Commit and push
git commit -m "fix: consolidate to 12 API functions for Vercel Hobby plan"
git push origin main

echo.
echo Done. Check Vercel dashboard for new deployment.
pause
