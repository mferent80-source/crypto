# CRYPTO RADAR pe serverul închiriat (VPS) - lansatorul sarcinii „Crypto Radar pornire” (la pornirea serverului + la 10 minute, ca paza),
# rulat ca utilizatorul Cimin. Face ce făcea PORNESTE-CRYPTO-RADAR.bat pe PC, fără fereastră și fără browser:
#   1. git pull --ff-only (nu blochează pornirea dacă nu merge);
#   2. v101.166 (I-833, auditul final 05.11): dacă functions/ de pe disc nu e cel din care s-a construit worker-local (semnătura arborelui
#      git `HEAD:functions`, ținută în radar-server\functions-construite.txt) ⇒ oprește wrangler-ul (și workerd-ul care ascultă pe 8788) și
#      reface Functions. Pe 05.11 colectorul nou a mers 7 minute peste Functions vechi: pull-ul aducea functions/, dar serverul rămânea pornit;
#   3. dacă 8788 nu ascultă: curăță urmele wrangler, construiește Functions în worker-local, pornește wrangler dev (ascuns);
#   4. așteaptă /api/market?type=health (cel mult 4 min);
#   5. pornește colectorul dacă nu merge deja.
# Idempotent: dacă totul merge și Functions sunt la zi, iese în câteva secunde, fără să scrie nimic.
# Jurnale: C:\Users\Cimin\radar-server\pornire.log (rotit la 2MB) și wrangler.log (v101.166: rotit la 20MB, ca pornire.log - 11 MB în
# 2,5 zile pe 03–05.11). wrangler.log e ținut deschis cât rulează serverul, deci se rotește doar când serverul nu merge (înainte de pornire).
# Salvat cu BOM (PowerShell 5.1 citește altfel diacriticele greșit).
$rad = 'C:\Users\Cimin\crypto'
$dir = 'C:\Users\Cimin\radar-server'
$jurnal = Join-Path $dir 'pornire.log'
$wlog = Join-Path $dir 'wrangler.log'
$semnFis = Join-Path $dir 'functions-construite.txt'
function scrie($t) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $t" | Out-File -Append -Encoding utf8 $jurnal }
if ((Test-Path $jurnal) -and (Get-Item $jurnal).Length -gt 2MB) { Move-Item $jurnal ($jurnal + '.vechi') -Force }
# wrangler.log: peste 20MB se rotește când nu e ținut deschis (serverul oprit); ținut deschis ⇒ la următoarea pornire a serverului
function rotesteWranglerLog {
  if ((Test-Path $wlog) -and (Get-Item $wlog).Length -gt 20MB) {
    try { Move-Item $wlog ($wlog + '.vechi') -Force -ErrorAction Stop; return $true } catch { return $false }
  }
  return $false
}
Set-Location $rad
$env:COLECTOR_RADACINA = $rad

function asculta8788 {
  Get-NetTCPConnection -LocalPort 8788 -ErrorAction SilentlyContinue | Where-Object { $_.RemotePort -eq 0 -and ([string]$_.RemoteAddress -eq '0.0.0.0' -or [string]$_.RemoteAddress -eq '::') }
}
function sanatos {
  try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8788/api/market?type=health' -TimeoutSec 5 -ErrorAction Stop; return ($r -and $r.ok -eq $true -and $r.service -eq 'crypto-radar') } catch { return $false }
}
function colectorul {
  Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ([string]$_.CommandLine) -match 'colector\.mjs' }
}
# semnătura lui functions/ din git (arborele de la HEAD) - aceeași cât fișierele nu se schimbă; goală dacă git nu răspunde
function semnFunctions { $s = (& git rev-parse 'HEAD:functions' 2>$null); if ($LASTEXITCODE -eq 0 -and $s) { return ([string]$s).Trim() } else { return '' } }
function semnConstruit { if (Test-Path $semnFis) { return ([string](Get-Content $semnFis -Raw -ErrorAction SilentlyContinue)).Trim() } else { return '' } }
# oprește serverul Radarului: wrangler (node + cmd-ul care l-a pornit) și workerd-ul care ascultă pe 8788; NU și shell-ul curent ($PID),
# al cărui rând de comandă poate conține aceleași cuvinte (ssh)
function opresteServerul {
  $l = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and (([string]$_.CommandLine) -match 'wrangler' -and ([string]$_.CommandLine) -match 'radar-local\.toml') }
  foreach ($p in $l) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { } }
  foreach ($c in (asculta8788)) { if ($c.OwningProcess -and $c.OwningProcess -ne $PID) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch { } } }
  Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'workerd.exe' -and ([string]$_.CommandLine) -match [regex]::Escape($rad) } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { } }
  for ($i = 0; $i -lt 30; $i++) { if (-not (asculta8788)) { return $true }; Start-Sleep -Seconds 1 }
  return (-not (asculta8788))
}

# git care nu răspunde (semnătura goală) NU pornește o buclă de reporniri: atunci Functions se socotesc la zi
$semn0 = semnFunctions
$functiiLaZi = ($semn0 -eq '') -or ($semn0 -eq (semnConstruit))
if ((asculta8788) -and (sanatos) -and (colectorul) -and $functiiLaZi) { [void](rotesteWranglerLog); exit 0 }   # totul merge: paza tace

scrie '--- pornire ---'
$inainte = (& git rev-parse --short HEAD 2>$null)
$pull = (& git pull --ff-only 2>&1 | Out-String).Trim()
$codPull = $LASTEXITCODE
$dupa = (& git rev-parse --short HEAD 2>$null)
if ($codPull -ne 0) { scrie "git pull a picat - continui cu ce e pe disc: $pull" } elseif ($inainte -ne $dupa) { scrie "git: $inainte -> $dupa" } else { scrie "git: la zi ($dupa)" }
if ($inainte -and $dupa -and $inainte -ne $dupa) {
  $schimbate = (& git diff --name-only $inainte $dupa -- functions 2>$null | Out-String).Trim()
  if ($schimbate) { scrie ("pull-ul a adus functions/: " + (($schimbate -split "`r?`n") -join ', ')) }
}

# Functions construite din alt functions/ decât cel de pe disc (pull nou, pull de mână, semnătura lipsă) ⇒ serverul se oprește și se reface
$semn = semnFunctions
if ((asculta8788) -and $semn -ne '' -and $semn -ne (semnConstruit)) {
  scrie ("functions/ s-a schimbat (" + $(if (semnConstruit) { semnConstruit } else { 'fără semnătură' }) + " -> " + $(if ($semn) { $semn } else { '?' }) + ") - opresc serverul ca să refac Functions")
  if (opresteServerul) { scrie 'serverul 8788 oprit' } else { scrie 'serverul 8788 tot ascultă după 30 s - îl las, reîncerc la tura următoare'; exit 1 }
}

if (-not (asculta8788)) {
  if (rotesteWranglerLog) { scrie 'wrangler.log peste 20MB - rotit în wrangler.log.vechi' }
  $st = Join-Path $rad '.wrangler\state\v3'
  foreach ($d in 'observability', 'cache\default') { $p = Join-Path $st $d; if (Test-Path -LiteralPath $p -PathType Container) { try { Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction Stop } catch { } } }
  $b = (& cmd /c 'npx --yes wrangler@4.137.0 pages functions build functions --outdir "worker-local" --compatibility-date=2026-01-01' 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0) { scrie "EROARE la construirea Functions: $($b.Trim())"; exit 1 }
  if ($semn) { Set-Content -Path $semnFis -Value $semn -Encoding ascii }
  scrie ("Functions construite în worker-local (functions/ " + $(if ($semn) { $semn.Substring(0, [Math]::Min(12, $semn.Length)) } else { 'fără semnătură git' }) + ")")
  $arg = '/c npx --yes wrangler@4.137.0 dev --config radar-local.toml --env-file .dev.vars --no-bundle --port 8788 --ip 127.0.0.1 --persist-to "' + $rad + '\.wrangler\state" --compatibility-date=2026-01-01 >> "' + $wlog + '" 2>&1'
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList $arg -WorkingDirectory $rad -WindowStyle Hidden -PassThru
  scrie "wrangler dev pornit (cmd PID $($p.Id))"
} else { scrie 'serverul 8788 ascultă deja' }

$gata = $false
for ($i = 0; $i -lt 48; $i++) { if (sanatos) { $gata = $true; break }; Start-Sleep -Seconds 5 }
if (-not $gata) { scrie 'serverul 8788 nu a răspuns în 4 min - colectorul nu-l pornesc (s-ar opri singur fără server)'; exit 1 }
scrie 'serverul răspunde'

$col = colectorul
if (-not $col) {
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList ('/c node scripts\colector.mjs >> "' + (Join-Path $dir 'colector-consola.log') + '" 2>&1') -WorkingDirectory $rad -WindowStyle Hidden -PassThru
  scrie "colectorul pornit (cmd PID $($p.Id))"
} else { scrie ('colectorul merge deja (PID ' + ($col | Select-Object -First 1).ProcessId + ')') }
exit 0
