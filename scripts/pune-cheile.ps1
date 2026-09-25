# Pune cheile Trading 212 si Twelve Data in .dev.vars, FARA sa stearga ce e deja acolo.
# Face intai o copie (.dev.vars.inainte-de-chei). O cheie lasata goala nu se schimba.
$ErrorActionPreference = "Stop"
$f = Join-Path (Split-Path $PSScriptRoot -Parent) ".dev.vars"
if (-not (Test-Path $f)) { Write-Host "Nu gasesc .dev.vars langa acest fisier. Nu schimb nimic."; exit 1 }
Copy-Item $f ($f + ".inainte-de-chei") -Force
Write-Host ""
Write-Host "  Cheile se pun DOAR pe PC-ul tau (in .dev.vars). Lasa gol si apasa Enter ca sa sari peste una."
Write-Host ""
$noi = [ordered]@{}
$noi["T212_API_KEY"]        = Read-Host "  Trading 212 - API Key"
$noi["T212_API_SECRET"]     = Read-Host "  Trading 212 - API Secret"
$noi["TWELVE_DATA_API_KEY"] = Read-Host "  Twelve Data - API Key (optional)"
$linii = @(Get-Content $f -Encoding UTF8)
foreach ($k in $noi.Keys) {
  $v = ($noi[$k]).Trim()
  if ($v -eq "") { continue }
  if ($v -match "\s") { Write-Host "  $k are spatii in ea - o sar (verifica ce ai copiat)."; continue }
  $linii = @($linii | Where-Object { $_ -notmatch ("^\s*" + [regex]::Escape($k) + "\s*=") })
  $linii += "$k=$v"
  Write-Host "  $k pusa."
}
[System.IO.File]::WriteAllLines($f, [string[]]$linii, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ""
Write-Host "  Gata. Chei in .dev.vars acum (fara valori):"
Get-Content $f | ForEach-Object { if ($_ -match "^\s*([A-Za-z0-9_]+)\s*=") { Write-Host ("   - " + $matches[1]) } }
Write-Host ""
Write-Host "  Reporneste Radarul (PORNESTE-CRYPTO-RADAR.bat) ca sa vada cheile noi."
