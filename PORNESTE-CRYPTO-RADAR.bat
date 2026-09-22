@echo off
setlocal EnableExtensions
title Crypto Radar - local
cd /d "%~dp0"

echo.
echo ================================================================
echo   CRYPTO RADAR - pornire LOCALA
echo ================================================================
echo.
echo   De ce local: bursele refuza cererile venite de pe Cloudflare.
echo   Pionex raspunde 429 acolo chiar si cu limita nefolosita.
echo   De pe calculatorul tau raspunde normal.
echo.

if not exist "public\index.html" (
  echo   EROARE: nu gasesc public\index.html
  echo   Pune fisierul asta in radacina proiectului crypto.
  echo.
  pause
  exit /b 1
)

if exist ".dev.vars" goto :pornire

echo   ----------------------------------------------------------
echo   Prima pornire: am nevoie de trei valori.
echo   Le scriu in .dev.vars, care NU se comite in git.
echo.
echo   Le gasesti in Cloudflare:
echo     Workers ^& Pages  ^>  crypto  ^>  Settings  ^>  Variables
echo   Daca nu-ti mai amintesti APP_API_TOKEN, pune ORICE text lung
echo   aici si acelasi text in aplicatie, la campul de token.
echo   ----------------------------------------------------------
echo.

set "APPTOK="
set "PXKEY="
set "PXSEC="
set /p "APPTOK=APP_API_TOKEN     : "
set /p "PXKEY=PIONEX_API_KEY    : "
set /p "PXSEC=PIONEX_API_SECRET : "

if "%APPTOK%"=="" (
  echo.
  echo   APP_API_TOKEN nu poate fi gol. Reporneste si incearca din nou.
  echo.
  pause
  exit /b 1
)

>".dev.vars" echo APP_API_TOKEN=%APPTOK%
>>".dev.vars" echo PIONEX_API_KEY=%PXKEY%
>>".dev.vars" echo PIONEX_API_SECRET=%PXSEC%

echo.
echo   Scris in .dev.vars. Data viitoare nu te mai intreb.
echo.

:pornire
echo   Pornesc serverul pe http://127.0.0.1:8788
echo   Prima data dureaza mai mult - descarca wrangler.
echo.
echo   Cand scrie "Ready on http://127.0.0.1:8788", deschid browserul.
echo   Ca sa opresti: inchizi fereastra asta sau Ctrl+C.
echo.

start "" /b cmd /c "ping -n 14 127.0.0.1 >nul && start """" http://127.0.0.1:8788/"

call npx --yes wrangler@4 pages dev public --port 8788 --compatibility-date=2026-01-01

echo.
echo   Serverul s-a oprit.
echo.
pause
endlocal
