@echo off
del /f /q "C:\Users\Demetrius\Documents\Claude\Projects\Settleed\.git\HEAD.lock" 2>nul
del /f /q "C:\Users\Demetrius\Documents\Claude\Projects\Settleed\.git\objects\maintenance.lock" 2>nul
echo Done - lock files removed.
pause
