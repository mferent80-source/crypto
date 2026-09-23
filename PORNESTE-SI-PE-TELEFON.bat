@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Crypto Radar - si pe telefon
cd /d "%~dp0"

set "CFDIR=%LOCALAPPDATA%\cloudflared"
set "CF=%CFDIR%\cloudflared.exe"
set "LOG=%TEMP%\crypto-radar-tunel.log"
set "PIDSRV=%TEMP%\crypto-radar-server.pid"
set "PIDTUN=%TEMP%\crypto-radar-tunel.pid"
set "TURL="

echo.
echo ================================================================
echo   CRYPTO RADAR - pornire cu acces de pe TELEFON
echo ================================================================
echo.
echo   Cum merge: aplicatia ruleaza tot pe calculatorul asta, deci
echo   cererile catre Pionex pleaca de la IP-ul tau de acasa - singurul
echo   pe care Pionex il accepta. Tunelul doar iti da o adresa publica
echo   prin care ajungi la ea de pe telefon.
echo.
echo   Cheile Pionex NU pleaca nicaieri. Raman in .dev.vars, aici.
echo   Adresa e publica, dar datele sunt incuiate cu APP_API_TOKEN.
echo.
echo   IMPORTANT: cat timp fereastra asta e inchisa, nu vezi nimic
echo   de pe telefon. Calculatorul trebuie sa ramana pornit.
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
  echo   [!] Nu am putut aduce versiunea noua - continui cu ce e pe disc.
) else (
  echo   [OK] La zi.
)
echo.

:versiune
set "VERS="
for /f "tokens=2 delims=:," %%v in ('findstr /c:"\"version\"" BUILD_INFO.json') do set "VERS=%%~v"
if defined VERS set "VERS=%VERS:"=%"
if defined VERS set "VERS=%VERS: =%"
if defined VERS echo   Versiune pe disc: %VERS%
echo.

if exist ".dev.vars" goto :cloudflared

echo   ----------------------------------------------------------
echo   Prima pornire: am nevoie de trei valori.
echo   Le scriu in .dev.vars, care NU se comite in git.
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
  echo   APP_API_TOKEN nu poate fi gol - el incuie adresa publica.
  echo   Reporneste si incearca din nou.
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

:cloudflared
if exist "%CF%" goto :pornire
echo   Prima data: aduc unealta de tunel (cloudflared, ~53 MB).
echo   Se pune in %CFDIR% - nu se instaleaza nimic in Windows.
echo.
if not exist "%CFDIR%" mkdir "%CFDIR%" >nul 2>&1
powershell -NoProfile -Command "try { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%CF%' -UseBasicParsing; exit 0 } catch { exit 1 }"
if not exist "%CF%" (
  echo   [!] Nu am putut aduce cloudflared. Verifica internetul si reincearca.
  echo       Pornesc doar local, fara telefon.
  echo.
  pause
  goto :doarlocal
)
echo   [OK] Adus.
echo.

:pornire
echo   Pornesc serverul pe http://127.0.0.1:8788 ...
rem Retin PID-ul: oprirea dupa titlul ferestrei NU functioneaza (masurat -
rem serverul ramanea pornit dupa inchiderea lansatorului). Cu PID-ul propriu
rem opresc exact arborele meu, fara sa ating alt wrangler sau uvicorn-ul de pe 8787.
if exist "%PIDSRV%" del "%PIDSRV%" >nul 2>&1
powershell -NoProfile -Command "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npx --yes wrangler@4 pages dev public --port 8788 --ip 127.0.0.1 --compatibility-date=2026-01-01' -WindowStyle Minimized -PassThru; $p.Id | Out-File -Encoding ascii -NoNewline '%PIDSRV%'"

set "GATA="
for /l %%i in (1,1,60) do (
  if not defined GATA (
    powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:8788/' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 set "GATA=1"
    if not defined GATA ping -n 3 127.0.0.1 >nul
  )
)
if not defined GATA (
  echo   [!] Serverul nu a pornit in 3 minute. Uita-te in fereastra
  echo       "Crypto Radar - server" ca sa vezi ce scrie acolo.
  echo.
  pause
  goto :oprire
)
echo   [OK] Serverul merge.
echo.

echo   Ridic tunelul ...
if exist "%LOG%" del "%LOG%" >nul 2>&1
if exist "%PIDTUN%" del "%PIDTUN%" >nul 2>&1
if exist "%LOG%.out" del "%LOG%.out" >nul 2>&1
rem Pornesc exe-ul DIRECT: prin cmd, din powershell, din batch, cu redirectare
rem erau prea multe straturi de ghilimele si nu pornea deloc.
rem cloudflared scrie adresa pe STDERR, deci acolo ma uit.
powershell -NoProfile -Command "$p = Start-Process -FilePath '%CF%' -ArgumentList 'tunnel','--url','http://127.0.0.1:8788','--no-autoupdate' -WindowStyle Hidden -RedirectStandardError '%LOG%' -RedirectStandardOutput '%LOG%.out' -PassThru; $p.Id | Out-File -Encoding ascii -NoNewline '%PIDTUN%'"

for /l %%i in (1,1,40) do (
  if not defined TURL (
    if exist "%LOG%" (
      for /f "delims=" %%u in ('powershell -NoProfile -Command "$m = Select-String -Path '%LOG%' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue; if ($m) { $m.Matches[0].Value }"') do set "TURL=%%u"
    )
    if not defined TURL ping -n 3 127.0.0.1 >nul
  )
)

if not defined TURL (
  echo   [!] Tunelul nu a dat o adresa. Aplicatia merge totusi local.
  echo       Jurnalul tunelului: %LOG%
  echo.
  goto :doarlocal
)

start "" http://127.0.0.1:8788/
echo %TURL% | clip

echo.
echo ================================================================
echo.
echo     DE PE TELEFON, DESCHIDE:
echo.
echo     %TURL%
echo.
echo     (adresa e si in clipboard - poti sa ti-o trimiti pe WhatsApp)
echo.
echo ================================================================
echo.
echo   Pe telefon iti cere APP_API_TOKEN o data - acelasi text pe
echo   care l-ai pus la pornire. Fara el nu vede nimeni datele tale.
echo.
echo   Adresa asta se schimba la FIECARE pornire. E normal.
echo.
echo   Ca sa OPRESTI tot (server + tunel): apasa o tasta aici.
echo.
pause >nul
goto :oprire

:doarlocal
echo   Merge doar local: http://127.0.0.1:8788/
start "" http://127.0.0.1:8788/
echo.
echo   Apasa o tasta ca sa opresti serverul.
pause >nul

:oprire
echo.
echo   Opresc...
for %%f in ("%PIDTUN%" "%PIDSRV%") do (
  if exist %%f (
    for /f "usebackq delims=" %%i in (%%f) do taskkill /f /t /pid %%i >nul 2>&1
    del %%f >nul 2>&1
  )
)
rem Plasa de siguranta: daca a scapat ceva de pe 8788, il opresc dupa PORT,
rem nu dupa nume - ca sa nu ating alte procese node de-ale mele.
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo   Gata. Nu mai esti vizibil de pe telefon.
echo.
pause
endlocal
