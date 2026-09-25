@echo off
rem Pune cheile Trading 212 si Twelve Data in .dev.vars (nu sterge nimic din ce e deja acolo).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\pune-cheile.ps1"
echo.
pause
