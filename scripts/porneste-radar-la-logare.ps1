# PORNIREA RADARULUI LA LOGARE (16.10.2026, el: „poți face să pornească singur Radarul?”).
# Sarcina Windows „Crypto Radar pornire” (la logare, cu 1 min întârziere) rulează scriptul ăsta:
#   1. deschide lansatorul obișnuit PORNESTE-CRYPTO-RADAR.bat (fereastra lui vizibilă — serverul 8788 trăiește în ea);
#   2. așteaptă până răspunde serverul (cel mult 4 min);
#   3. pornește colectorul dacă nu merge deja (data\colector.pid / procesul).
# Nu oprește nimic: dacă Radarul merge deja, lansatorul însuși știe să nu-l pornească de două ori.
$rad = 'C:\Users\Cimin\crypto'
$jurnal = Join-Path $rad 'data\pornire-la-logare.log'
function scrie($t) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $t" | Out-File -Append -Encoding utf8 $jurnal }
Set-Location $rad
scrie 'logare: pornesc lansatorul'
# v100.275 (30.10): ascultă = intrarea cu 0.0.0.0:0 / :::0 la distanță, nu -State Listen (tabela TCP a dat stări greșite cât serverul asculta)
$ascultaDeja = Get-NetTCPConnection -LocalPort 8788 -ErrorAction SilentlyContinue | Where-Object { $_.RemotePort -eq 0 -and ([string]$_.RemoteAddress -eq '0.0.0.0' -or [string]$_.RemoteAddress -eq '::') }
if (-not $ascultaDeja) { Start-Process cmd -ArgumentList '/c', ('"' + (Join-Path $rad 'PORNESTE-CRYPTO-RADAR.bat') + '"') -WorkingDirectory $rad } else { scrie 'serverul 8788 asculta deja - nu pornesc alt lansator' }
$gata = $false
for ($i = 0; $i -lt 48; $i++) {
  try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8788/api/market?type=health' -TimeoutSec 5 -ErrorAction Stop; $gata = $true; break } catch { Start-Sleep -Seconds 5 }
}
if (-not $gata) { scrie 'serverul 8788 nu a raspuns in 4 min - colectorul nu-l pornesc (s-ar opri singur fara server)'; exit 1 }
scrie 'serverul raspunde'
$col = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ([string]$_.CommandLine) -match 'colector\.mjs' }
if (-not $col) {
  Start-Process node -ArgumentList 'scripts\colector.mjs' -WindowStyle Hidden -WorkingDirectory $rad
  scrie 'colectorul pornit'
} else { scrie ('colectorul merge deja (PID ' + ($col | Select-Object -First 1).ProcessId + ')') }
