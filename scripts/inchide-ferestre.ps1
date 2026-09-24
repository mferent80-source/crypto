# Inchide ferestrele de APLICATIE ale Radarului de acasa (deschise de lansator cu
# msedge --app), ca la o pornire noua sa ramana una singura. Recunoaste fereastra
# dupa titlul EXACT al paginii ("Crypto Radar Pro Lite") si dupa proces (Edge sau
# Chrome). O fereastra de browser obisnuita are in titlu si numele browserului
# ("... - Microsoft Edge") si NU se inchide: ar lua cu ea si celelalte file.
# Folosire: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\inchide-ferestre.ps1 [-Titlu x] [-Proba]
param([string]$Titlu = 'Crypto Radar Pro Lite', [switch]$Proba)
Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class FerestreRadar {
  public delegate bool CB(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, IntPtr p);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public static List<object[]> Vizibile() {
    var l = new List<object[]>();
    EnumWindows((h, p) => { if (!IsWindowVisible(h)) return true; var s = new StringBuilder(512); GetWindowText(h, s, 512);
      uint pid; GetWindowThreadProcessId(h, out pid); l.Add(new object[] { h, (int)pid, s.ToString() }); return true; }, IntPtr.Zero);
    return l;
  }
}
'@
$inchise = 0
foreach ($f in [FerestreRadar]::Vizibile()) {
  $h = $f[0]; $id = $f[1]; $t = [string]$f[2]
  if ($t -ne $Titlu) { continue }
  $p = Get-Process -Id $id -ErrorAction SilentlyContinue
  if (-not $p -or $p.ProcessName -notin @('msedge', 'chrome')) { continue }
  if ($Proba) { Write-Host ('  ar inchide: ' + $t + ' (' + $p.ProcessName + ')') } else { [void][FerestreRadar]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }
  $inchise++
}
if ($inchise) { Write-Host ('  [OK] Am inchis ' + $inchise + ' fereastra(e) veche(i) a Radarului.') }
exit 0
