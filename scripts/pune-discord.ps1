# Pune adresa webhook-ului Discord in .dev.vars (DISCORD_WEBHOOK), FARA sa stearga ce e deja acolo, trimite un
# mesaj de proba si reporneste colectorul, ca alertele sa vina pe Discord / telefon. Copie: .dev.vars.inainte-de-discord
param([string]$Webhook = "", [string]$Fisier = "", [switch]$FaraProba, [switch]$FaraRepornire)
$ErrorActionPreference = "Stop"
$rad = Split-Path $PSScriptRoot -Parent
$f = if ($Fisier) { $Fisier } else { Join-Path $rad ".dev.vars" }
if (-not (Test-Path $f)) { Write-Host "Nu gasesc .dev.vars. Nu schimb nimic."; exit 1 }
if (-not $Webhook) {
  Write-Host ""
  Write-Host "  Cum iei adresa (o singura data, 1 minut):"
  Write-Host "   1. In Discord, pe serverul tau: clic dreapta pe un canal -> Editeaza canalul"
  Write-Host "   2. Integrari -> Webhook-uri -> Webhook nou -> Copiaza URL-ul webhook-ului"
  Write-Host "   3. Lipeste-l aici (clic dreapta in fereastra) si apasa Enter"
  Write-Host ""
  $Webhook = Read-Host "  Adresa webhook-ului"
}
$w = $Webhook.Trim()
if ($w -notmatch '^https://(discord\.com|discordapp\.com)/api/webhooks/\d+/[A-Za-z0-9_-]+$') {
  Write-Host "  Adresa nu arata ca un webhook Discord (https://discord.com/api/webhooks/...). Nu schimb nimic."; exit 1
}
Copy-Item $f ($f + ".inainte-de-discord") -Force
$linii = @(Get-Content $f -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*DISCORD_WEBHOOK\s*=' -and $_ -notmatch '^\s*ALERTE_CANAL\s*=' })
$linii += "DISCORD_WEBHOOK=$w"
$linii += "ALERTE_CANAL=discord"
[System.IO.File]::WriteAllLines($f, [string[]]$linii, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "  Adresa e pusa in .dev.vars (si ALERTE_CANAL=discord)."
if (-not $FaraProba) {
  Write-Host "  Trimit un mesaj de proba..."
  & node (Join-Path $rad "scripts\proba-discord.mjs") $f
}
if (-not $FaraRepornire) {
  $pid0 = $null
  try { $pid0 = [int]((Get-Content (Join-Path $rad "data\colector.pid") -Raw).Split(" ")[0]) } catch {}
  if ($pid0) { try { Stop-Process -Id $pid0 -Force -ErrorAction Stop } catch {} }
  Start-Sleep -Seconds 2
  Start-Process -FilePath node -ArgumentList 'scripts\colector.mjs' -WorkingDirectory $rad -WindowStyle Hidden
  Write-Host "  Colectorul a pornit din nou: de acum alertele vin si pe Discord."
}
