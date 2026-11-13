# I-865 (v100.336): sarcina programată „Crypto Radar paza pagini” pe VPS - dimineața la 07:50 (înainte de deschiderea magazinelor, gestiunea e
# pe același VPS) și la cerere după fiecare livrare (schtasks /Run /TN "Crypto Radar paza pagini"). Rulează scripts\vps\paza-pagini.mjs cu
# prioritate joasă, cel mult 30 de minute (rondul are termenul lui de 15), o singură instanță. Idempotent: o rulare nouă înlocuiește sarcina cu aceleași setări.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Cimin\crypto\scripts\vps\paza-pagini-sarcina.ps1
$ErrorActionPreference = 'Stop'
$rad = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node).Source
$act = New-ScheduledTaskAction -Execute $node -Argument ('"' + (Join-Path $rad 'scripts\vps\paza-pagini.mjs') + '" --motiv=dimineata') -WorkingDirectory $rad
$cand = New-ScheduledTaskTrigger -Daily -At '07:50'
$set = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew -Priority 7 -StartWhenAvailable:$false -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
# contul din COMPUTERNAME: pe ssh, USERDOMAIN e „WORKGROUP” ⇒ 0x80070534 (livrarea v100.336, 13.11)
$cine = New-ScheduledTaskPrincipal -UserId ($env:COMPUTERNAME + '\' + $env:USERNAME) -LogonType S4U -RunLevel Limited
Register-ScheduledTask -TaskName 'Crypto Radar paza pagini' -Action $act -Trigger $cand -Settings $set -Principal $cine -Description 'I-865: Piața azi, Tabloul, T212 la 1920 și 412 px; abaterile repetate pleacă pe Discord. Jurnal: data\paza-pagini.log' -Force | Out-Null
$t = Get-ScheduledTask -TaskName 'Crypto Radar paza pagini'
'sarcina: ' + $t.TaskName + ' | ' + $t.State + ' | ' + ($t.Triggers | ForEach-Object { $_.StartBoundary }) + ' | ' + $t.Actions.Execute + ' ' + $t.Actions.Arguments
