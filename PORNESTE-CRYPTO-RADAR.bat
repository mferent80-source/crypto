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

rem ---- aduc ultima versiune, dar nu blochez pornirea daca nu merge ----
if not exist ".git" goto :versiune
where git >nul 2>&1
if errorlevel 1 (
  echo   [ ] git nu e instalat - pornesc cu ce e pe disc.
  goto :versiune
)
echo   Caut o versiune mai noua...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo   [!] Nu am putut aduce versiunea noua - continui cu ce e pe disc.
  echo       Daca se repeta, deschide un terminal aici si ruleaza: git pull
  echo.
) else (
  echo   [OK] La zi.
  echo.
)

:versiune
set "VERS="
for /f "tokens=2 delims=:," %%v in ('findstr /c:"\"version\"" BUILD_INFO.json') do set "VERS=%%~v"
if defined VERS set "VERS=%VERS:"=%"
if defined VERS set "VERS=%VERS: =%"
if defined VERS echo   Versiune pe disc: %VERS%
echo.

rem Un .dev.vars care EXISTA nu inseamna ca e bun: gol sau cu o cheie lipsa
rem ar porni aplicatia care apoi da AUTH_REQUIRED, fara sa spuna de ce.
set "CHEIOK="
if exist ".dev.vars" (
  powershell -NoProfile -Command "$t = Get-Content -LiteralPath '.dev.vars' -Raw -ErrorAction SilentlyContinue; $ok = $true; foreach ($k in 'APP_API_TOKEN','PIONEX_API_KEY','PIONEX_API_SECRET') { if ($t -notmatch ('(?m)^' + $k + '=\S')) { $ok = $false } }; if ($ok) { exit 0 } else { exit 1 }"
  if not errorlevel 1 set "CHEIOK=1"
)
if defined CHEIOK (
  echo   [OK] Folosesc cheile salvate din .dev.vars - nu ti le mai cer.
  echo.
  goto :DUPACHEI
)
if exist ".dev.vars" (
  echo   [!] .dev.vars exista dar e incomplet - ti le cer din nou.
  echo.
)

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

rem Valorile NU mai trec prin variabile de batch: o parola cu %% sau & spargea
rem parsarea si bat-ul murea FARA sa scrie fisierul - deci cerea la nesfarsit.
rem PowerShell le citeste si le scrie literal, si verifica imediat ce-a scris.
powershell -NoProfile -Command "$t = Read-Host 'APP_API_TOKEN    '; $k = Read-Host 'PIONEX_API_KEY   '; $s = Read-Host 'PIONEX_API_SECRET'; if ([string]::IsNullOrWhiteSpace($t)) { Write-Host ''; Write-Host '  APP_API_TOKEN nu poate fi gol - el incuie adresa.'; exit 2 }; $nl = [string][char]10; $body = 'APP_API_TOKEN=' + $t + $nl + 'PIONEX_API_KEY=' + $k + $nl + 'PIONEX_API_SECRET=' + $s + $nl; try { [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path '.dev.vars'), $body, (New-Object System.Text.UTF8Encoding $false)) } catch { exit 3 }; $t2 = Get-Content -LiteralPath '.dev.vars' -Raw; if ($t2 -match '(?m)^APP_API_TOKEN=\S' -and $t2 -match '(?m)^PIONEX_API_KEY=' -and $t2 -match '(?m)^PIONEX_API_SECRET=') { exit 0 } else { exit 3 }"
set "RC=%ERRORLEVEL%"
if "%RC%"=="2" (
  echo.
  echo   Reporneste si incearca din nou.
  echo.
  pause
  exit /b 1
)
if not "%RC%"=="0" (
  echo.
  echo   EROARE: nu am putut scrie .dev.vars in %CD%
  echo   Fara el ti le-as cere la FIECARE pornire. Verifica daca dosarul
  echo   e read-only sau daca un antivirus blocheaza scrierea.
  echo.
  pause
  exit /b 1
)

echo.
echo   Scris in .dev.vars. De acum nu te mai intreb.
echo.

:DUPACHEI
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
