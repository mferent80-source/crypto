@echo off
rem Leaga alertele Radarului de Discord: pune adresa webhook-ului in .dev.vars, trimite o proba, reporneste colectorul.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\pune-discord.ps1"
echo.
pause
