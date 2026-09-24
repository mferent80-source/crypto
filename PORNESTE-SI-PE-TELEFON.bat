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
set "REFOLOSIT="
set "FARATUNEL="

rem PID-urile de la o rulare veche nu se mai opresc: pana scriu unul nou,
rem PID-ul acela poate fi al altui program.
rem Nicio stergere cu variabila in .bat (un del cu variabila goala a sters odata
rem o radacina intreaga): PowerShell sterge doar fisiere cu nume FIX din TEMP.
powershell -NoProfile -Command "$d = $env:TEMP; if ($d -and (Test-Path -LiteralPath $d -PathType Container)) { foreach ($n in 'crypto-radar-server.pid','crypto-radar-tunel.pid') { $f = Join-Path $d $n; if (Test-Path -LiteralPath $f -PathType Leaf) { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } } }"

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
rem Tot pasul de actualizare sta intr-un singur bloc ( ... ): cmd il citeste
rem INTREG inainte sa-l ruleze. Altfel, un git pull care schimba chiar acest
rem .bat ar face cmd sa citeasca fisierul nou de la pozitia veche si sa ruleze
rem bucati de randuri. Daca s-a schimbat un lansator, il pornesc din nou curat.
(
  git pull --ff-only
  if errorlevel 1 (
    echo.
    echo   [ATENTIE] Nu am putut aduce versiunea noua - continui cu ce e pe disc.
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
  echo   [ATENTIE] Nu am putut verifica portul 8788 - incerc oricum.
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
  echo   [ATENTIE] .dev.vars exista dar e incomplet - ti le cer din nou.
  echo.
)

echo   ----------------------------------------------------------
echo   Prima pornire: am nevoie de trei valori.
echo   Le scriu in .dev.vars, care NU se comite in git.
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
goto :cloudflared

:DEJAPORNIT
rem Serverul acestui folder merge deja din alta fereastra: ridic doar tunelul
rem si la oprire NU il opresc - nu l-am pornit eu.
set "REFOLOSIT=1"
echo   Folosesc serverul care merge deja. Ridic doar tunelul.
echo.

:cloudflared
rem cloudflared fixat pe o versiune, cu amprenta sha256 publicata in release-ul
rem GitHub. Amprenta gresita = fisier sters, tunel nepornit.
rem [ps:cloudflared]
powershell -NoProfile -Command "$ver = '2026.9.1'; $sha = '2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712'; $dir = Join-Path $env:LOCALAPPDATA 'cloudflared'; $cf = Join-Path $dir 'cloudflared.exe'; if ((Test-Path -LiteralPath $cf) -and ((Get-FileHash -Algorithm SHA256 -LiteralPath $cf).Hash.ToLower() -eq $sha)) { exit 0 }; New-Item -ItemType Directory -Force -Path $dir | Out-Null; $tmp = $cf + '.descarcat'; Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue; Write-Host ('  Aduc cloudflared ' + $ver + ' - unealta de tunel, ~60 MB - si ii verific amprenta...'); try { $ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri ('https://github.com/cloudflare/cloudflared/releases/download/' + $ver + '/cloudflared-windows-amd64.exe') -OutFile $tmp -UseBasicParsing -ErrorAction Stop } catch { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue; Write-Host '  [ATENTIE] Nu am putut descarca cloudflared.'; exit 1 }; $h = (Get-FileHash -Algorithm SHA256 -LiteralPath $tmp).Hash.ToLower(); if ($h -ne $sha) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue; Write-Host '  [ATENTIE] AMPRENTA GRESITA la cloudflared descarcat - l-am sters si NU il pornesc.'; Write-Host ('      asteptat ' + $sha); Write-Host ('      primit   ' + $h); exit 2 }; try { Move-Item -LiteralPath $tmp -Destination $cf -Force -ErrorAction Stop } catch { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue; Write-Host '  [ATENTIE] Nu pot inlocui cloudflared.exe - poate ruleaza deja un tunel.'; exit 1 }; Write-Host '  [OK] cloudflared adus si verificat.'; exit 0"
if errorlevel 1 (
  echo   [ATENTIE] Fara tunel: merge doar local, nu si de pe telefon.
  echo.
  set "FARATUNEL=1"
)

if defined REFOLOSIT goto :asteptare
echo   Pornesc serverul pe http://127.0.0.1:8788 ...
rem Retin PID-ul: oprirea dupa titlul ferestrei NU functioneaza (masurat -
rem serverul ramanea pornit dupa inchiderea lansatorului). Cu PID-ul propriu
rem opresc exact arborele meu, fara sa ating alt wrangler sau alt server.
powershell -NoProfile -Command "$q = [char]34; $st = Join-Path (Get-Location).Path '.wrangler\state'; $p = Start-Process -FilePath 'cmd.exe' -ArgumentList ('/c title Crypto Radar - server && npx --yes wrangler@4.137.0 pages dev public --port 8788 --ip 127.0.0.1 --kv ISTORIC --persist-to ' + $q + $st + $q + ' --compatibility-date=2026-01-01') -WindowStyle Minimized -PassThru; $p.Id | Out-File -Encoding ascii -NoNewline '%PIDSRV%'"

:asteptare
rem Proba de pornire: JSON-ul aplicatiei pe /api/market?type=health, nu orice 200.
rem [ps:sanatate]
powershell -NoProfile -Command "$u = 'http://127.0.0.1:8788/api/market?type=health'; for ($i = 0; $i -lt 90; $i++) { try { $r = Invoke-RestMethod -Uri $u -TimeoutSec 3 -ErrorAction Stop; if ($r -and $r.ok -eq $true -and $r.service -eq 'crypto-radar') { try { Start-Process -FilePath 'node' -ArgumentList 'scripts\colector.mjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -ErrorAction Stop } catch { Write-Host '  [ATENTIE] Colectorul de alerte nu a pornit (node lipsa?).' }; exit 0 } } catch {}; Start-Sleep -Seconds 2 }; Write-Host ''; Write-Host '  [ATENTIE] Pe 127.0.0.1:8788 nu raspunde Crypto Radar (am cerut /api/market?type=health).'; Write-Host '      Nu deschid browserul pe un raspuns care nu e al aplicatiei.'; exit 1"
if errorlevel 1 (
  echo   [ATENTIE] Serverul nu a raspuns ca Crypto Radar in 3 minute. Uita-te in
  echo       fereastra minimizata "Crypto Radar - server" ca sa vezi ce scrie acolo.
  echo.
  pause
  goto :oprire
)
echo   [OK] Serverul merge.
echo.
if defined FARATUNEL goto :doarlocal

echo   Ridic tunelul ...
powershell -NoProfile -Command "$d = $env:TEMP; if ($d -and (Test-Path -LiteralPath $d -PathType Container)) { foreach ($n in 'crypto-radar-tunel.log','crypto-radar-tunel.log.out') { $f = Join-Path $d $n; if (Test-Path -LiteralPath $f -PathType Leaf) { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } } }"
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
  echo   [ATENTIE] Tunelul nu a dat o adresa. Aplicatia merge totusi local.
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
echo   Apasa o tasta ca sa opresti.
pause >nul

:oprire
echo.
echo   Opresc...
rem Opresc DOAR ce am pornit eu in rularea asta (PID-urile din fisiere). Nu mai
rem opresc "orice asculta pe 8788": acolo putea fi alt program al tau.
for %%f in ("%PIDTUN%" "%PIDSRV%") do (
  if exist %%f (
    for /f "usebackq delims=" %%i in (%%f) do taskkill /f /t /pid %%i >nul 2>&1
  )
)
powershell -NoProfile -Command "$d = $env:TEMP; if ($d -and (Test-Path -LiteralPath $d -PathType Container)) { foreach ($n in 'crypto-radar-server.pid','crypto-radar-tunel.pid') { $f = Join-Path $d $n; if (Test-Path -LiteralPath $f -PathType Leaf) { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } } }"
if defined REFOLOSIT echo   Serverul era pornit din alta fereastra - il las sa mearga.
echo   Gata. Nu mai esti vizibil de pe telefon.
echo.
pause
endlocal
