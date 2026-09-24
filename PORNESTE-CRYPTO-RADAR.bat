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

rem Proba de pornire ruleaza in fundal cat merge serverul; daca serverul
rem merge deja din alta fereastra, ruleaza in fata si fereastra asta se inchide.
set "PORNIRE=start "" /b"
set "DEJA="

rem ---- aduc ultima versiune, dar nu blochez pornirea daca nu merge ----
if not exist ".git" goto :versiune
where git >nul 2>&1
if errorlevel 1 (
  echo   [ ] git nu e instalat - pornesc cu ce e pe disc.
  goto :versiune
)
echo   Caut o versiune mai noua...
rem Tot pasul de actualizare sta intr-un singur bloc ( ... ): cmd il citeste
rem INTREG inainte sa-l ruleze. Altfel, un git pull care schimba chiar acest
rem .bat ar face cmd sa citeasca fisierul nou de la pozitia veche si sa ruleze
rem bucati de randuri. Daca s-a schimbat un lansator, il pornesc din nou curat.
(
  git pull --ff-only
  if errorlevel 1 (
    echo.
    echo   [!] Nu am putut aduce versiunea noua - continui cu ce e pe disc.
    echo       Daca se repeta, deschide un terminal aici si ruleaza: git pull
    echo.
  ) else (
    git diff --quiet "HEAD@{1}" HEAD -- PORNESTE-CRYPTO-RADAR.bat PORNESTE-SI-PE-TELEFON.bat >nul 2>&1
    if errorlevel 1 (
      echo   [OK] Am adus si un lansator nou. Il pornesc din nou, intr-o fereastra noua.
      start "" "%~f0"
      exit
    )
    echo   [OK] La zi.
    echo.
  )
)

:versiune
set "VERS="
for /f "tokens=2 delims=:," %%v in ('findstr /c:"\"version\"" BUILD_INFO.json') do set "VERS=%%~v"
if defined VERS set "VERS=%VERS:"=%"
if defined VERS set "VERS=%VERS: =%"
if defined VERS echo   Versiune pe disc: %VERS%
echo.

rem ---- portul 8788: liber, deja al acestui folder, sau al altcuiva? ----
rem Nu opresc NICIODATA un proces strain: pe calculatorul asta mai stau si alte
rem servere. Serverul acestui folder il recunosc dupa linia lui de comanda:
rem wrangler pornit cu --persist-to in folderul asta.
rem [ps:port]
powershell -NoProfile -Command "$port = 8788; $dir = (Get-Location).Path.TrimEnd('\') + '\'; $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if (-not $c) { exit 0 }; $id = [int]$c.OwningProcess; $lant = @(); $x = $id; for ($i = 0; $i -lt 8 -and $x -gt 0; $i++) { $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $x) -ErrorAction SilentlyContinue; if (-not $p) { break }; $lant += $p; $x = [int]$p.ParentProcessId }; $txt = (($lant | ForEach-Object { [string]$_.CommandLine }) -join ' ').ToLower(); $nume = 'necunoscut'; if ($lant.Count -gt 0) { $nume = [string]$lant[0].Name }; if (($nume -match '^(workerd|node)\.exe$') -and $txt.Contains('wrangler') -and $txt.Contains($dir.ToLower())) { Write-Host ('  [OK] Crypto Radar merge deja din folderul asta (PID ' + $id + ').'); exit 3 }; Write-Host ''; Write-Host ('  EROARE: portul ' + $port + ' e ocupat de alt program: ' + $nume + ' (PID ' + $id + ').'); Write-Host '  Nu il opresc eu - poate e al tau. Inchide-l (sau opreste-l din Task Manager)'; Write-Host '  si porneste din nou.'; exit 4"
set "RC=%ERRORLEVEL%"
if "%RC%"=="4" (
  echo.
  pause
  exit /b 1
)
if "%RC%"=="3" goto :DEJAPORNIT
if not "%RC%"=="0" (
  echo   [!] Nu am putut verifica portul 8788 - incerc oricum.
  echo.
)

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
echo   Secretul Pionex NU se vede cand il scrii - e normal.
echo   ----------------------------------------------------------
echo.

rem Valorile NU trec prin variabile de batch: o parola cu %% sau & spargea
rem parsarea si bat-ul murea FARA sa scrie fisierul - deci cerea la nesfarsit.
rem PowerShell le citeste si le scrie literal, si verifica imediat ce-a scris.
rem Secretul se citeste cu -AsSecureString (nu ramane pe ecran) si se scrie ca text.
rem [ps:chei]
powershell -NoProfile -Command "$t = Read-Host 'APP_API_TOKEN    '; $k = Read-Host 'PIONEX_API_KEY   '; $ss = Read-Host 'PIONEX_API_SECRET' -AsSecureString; $s = (New-Object System.Net.NetworkCredential('', $ss)).Password; if ([string]::IsNullOrWhiteSpace($t)) { Write-Host ''; Write-Host '  APP_API_TOKEN nu poate fi gol - el incuie adresa.'; exit 2 }; $nl = [string][char]10; $body = 'APP_API_TOKEN=' + $t + $nl + 'PIONEX_API_KEY=' + $k + $nl + 'PIONEX_API_SECRET=' + $s + $nl; try { [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path '.dev.vars'), $body, (New-Object System.Text.UTF8Encoding $false)) } catch { exit 3 }; $t2 = Get-Content -LiteralPath '.dev.vars' -Raw; if ($t2 -match '(?m)^APP_API_TOKEN=\S' -and $t2 -match '(?m)^PIONEX_API_KEY=' -and $t2 -match '(?m)^PIONEX_API_SECRET=') { exit 0 } else { exit 3 }"
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
echo   Pornesc serverul pe http://127.0.0.1:8788 - doar pe calculatorul asta.
echo   Prima data dureaza mai mult - descarca wrangler.
echo.
echo   Deschid browserul abia cand serverul raspunde ca Crypto Radar.
echo   Ca sa opresti: inchizi fereastra asta sau Ctrl+C.
echo.
goto :PROBA

:DEJAPORNIT
set "PORNIRE="
set "DEJA=1"
echo   Nu mai pornesc inca unul. Verific ca raspunde si deschid browserul.
echo.

:PROBA
rem Browserul se deschide doar dupa ce /api/market?type=health raspunde cu
rem JSON-ul aplicatiei - nu dupa un ceas si nu pe orice 200 de pe 8788.
rem [ps:sanatate]
%PORNIRE% powershell -NoProfile -Command "$u = 'http://127.0.0.1:8788/api/market?type=health'; for ($i = 0; $i -lt 90; $i++) { try { $r = Invoke-RestMethod -Uri $u -TimeoutSec 3 -ErrorAction Stop; if ($r -and $r.ok -eq $true -and $r.service -eq 'crypto-radar') { try { Start-Process -FilePath 'node' -ArgumentList 'scripts\colector.mjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -ErrorAction Stop } catch { Write-Host '  [ATENTIE] Colectorul de alerte nu a pornit (node lipsa?).' }; Start-Process 'http://127.0.0.1:8788/'; exit 0 } } catch {}; Start-Sleep -Seconds 2 }; Write-Host ''; Write-Host '  [ATENTIE] Pe 127.0.0.1:8788 nu raspunde Crypto Radar (am cerut /api/market?type=health).'; Write-Host '      Nu deschid browserul pe un raspuns care nu e al aplicatiei.'; exit 1"
set "RC=%ERRORLEVEL%"
if defined DEJA goto :DEJAGATA

rem --ip 127.0.0.1: serverul are cheile Pionex, deci asculta DOAR pe
rem calculatorul asta. Telefonul intra prin tunel (PORNESTE-SI-PE-TELEFON.bat).
rem --persist-to cu calea folderului: dupa ea recunoaste [ps:port] serverul nostru.
rem --kv ISTORIC: istoricul botului strans de colector (scripts\colector.mjs),
rem pastrat pe disc in .wrangler\state. Colectorul porneste ascuns cand serverul
rem raspunde si se opreste singur la 5 minute dupa ce serverul se opreste.
call npx --yes wrangler@4.137.0 pages dev public --port 8788 --ip 127.0.0.1 --kv ISTORIC --persist-to "%CD%\.wrangler\state" --compatibility-date=2026-01-01

echo.
echo   Serverul s-a oprit.
echo.
pause
endlocal
exit /b 0

:DEJAGATA
if not "%RC%"=="0" (
  echo.
  echo   Serverul din cealalta fereastra nu raspunde. Inchide-o si porneste din nou.
) else (
  echo   [OK] Deschis in browser. Serverul merge in cealalta fereastra.
)
echo.
pause
endlocal
