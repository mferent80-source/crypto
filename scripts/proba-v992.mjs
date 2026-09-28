// Probele v99.2 - lansatoarele (auditul din 28.09, #6 si #8). Un .bat nu se poate rula in proba fara sa porneasca servere
// adevarate, asa ca aici se verifica STRUCTURA (ce garda 9 din garzi-v746 nu acopera), iar PowerShell-ul din blocuri e
// verificat pe uscat: se parseaza si, cu Stop/Remove inlocuite prin Write-Host, se ruleaza ca sa arate ce AR face.
//   - [ps:tunel-vechi] in AMBELE lansatoare: opreste doar cloudflared cu --url http://127.0.0.1:8788, cu taskkill (nu Stop-Process)
//   - [ps:curata-urme] in AMBELE: doar .wrangler\state\v3\observability si cache\default, cu Join-Path + Test-Path + -LiteralPath,
//     niciodata kv\ (istoricul), niciodata `del`/`rd` cu variabila; sta INAINTE de pornirea serverului
//   - telefon: curatenia e dupa `if defined REFOLOSIT goto :asteptare` (nu se sterge nimic cat serverul altcuiva merge);
//     oprirea tunelului vechi e dupa "Ridic tunelul" si inainte de pornirea celui nou
//   - simplu: oprirea tunelului vechi e in :INCHIDVECHI; curatenia e chiar inainte de `call npx ... wrangler pages dev`
//   - CRLF pe toate liniile (cmd toaca liniile cu LF)
// Rulare: node scripts/proba-v992.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const citeste = (f) => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const LOCAL = "PORNESTE-CRYPTO-RADAR.bat", TELEFON = "PORNESTE-SI-PE-TELEFON.bat";
function bloc(text, nume) {
  const linii = text.split(/\r?\n/), i = linii.findIndex((l) => l.trim().toLowerCase() === `rem [ps:${nume}]`);
  if (i < 0) return null;
  const l = linii[i + 1] || "", a = l.indexOf('-Command "'), b = l.lastIndexOf('"');
  return a < 0 || b <= a + 10 ? null : { linie: i + 1, ps: l.slice(a + 10, b) };
}
const poz = (text, s) => { const i = text.indexOf(s); assert.ok(i >= 0, "lipseste: " + s.slice(0, 60)); return i; };

console.log("\nV99.2 · lansatoarele · proba\n");

for (const f of [LOCAL, TELEFON]) {
  const t = citeste(f);
  await test(`${f}: CRLF pe toate liniile, fara del/rd cu variabila, fara Stop-Process`, () => {
    assert.ok(!/[^\r]\n/.test(t) && !/\r(?!\n)/.test(t), "linii fara CRLF");
    assert.ok(!/\b(del|rd|rmdir)\b[^\r\n]*%/i.test(t), "del/rd cu variabila");
    assert.ok(!/Stop-Process/.test(t), "Stop-Process (regula: doar taskkill pe ce e al nostru)");
  });
  await test(`${f}: [ps:tunel-vechi] opreste DOAR cloudflared cu --url http://127.0.0.1:8788, cu taskkill; PowerShell-ul se parseaza`, () => {
    const b = bloc(t, "tunel-vechi"); assert.ok(b, "blocul lipseste");
    assert.match(b.ps, /Name -eq 'cloudflared\.exe'/); assert.match(b.ps, /--url\\s\+http:\/\/127\\\.0\\\.0\\\.1:8788/); assert.match(b.ps, /taskkill \/PID \$p\.ProcessId/);
    assert.ok(!b.ps.includes('"') && !b.ps.includes("%") && !b.ps.includes("!"), "caractere pe care cmd le strica");
    const uscat = b.ps.replace(/taskkill \/PID \$p\.ProcessId \/T \/F \*> \$null/, "Write-Host ('AR OPRI ' + $p.ProcessId)");
    const r = spawnSync("powershell", ["-NoProfile", "-Command", uscat], { encoding: "utf8", timeout: 30000 });
    assert.equal(r.status, 0, "PowerShell a picat: " + (r.stderr || "").slice(0, 200));
    assert.ok(!/AR OPRI/.test(r.stdout) || /AR OPRI \d+/.test(r.stdout), r.stdout);
  });
  await test(`${f}: [ps:curata-urme] sterge doar observability si cache\\default din .wrangler\\state\\v3 (niciodata kv), cu Join-Path/Test-Path/-LiteralPath; pe uscat, intr-un folder gol, nu atinge nimic`, () => {
    const b = bloc(t, "curata-urme"); assert.ok(b, "blocul lipseste");
    assert.match(b.ps, /Join-Path \(Get-Location\)\.Path '\.wrangler\\state\\v3'/); assert.match(b.ps, /'observability','cache\\default'/); assert.ok(!/\bkv\b/.test(b.ps), "atinge kv");
    assert.match(b.ps, /Test-Path -LiteralPath \$p -PathType Container/); assert.match(b.ps, /Remove-Item -LiteralPath \$p -Recurse -Force/);
    assert.ok(!b.ps.includes('"') && !b.ps.includes("%") && !b.ps.includes("!"), "caractere pe care cmd le strica");
    const gol = fs.mkdtempSync(new URL("file:///" + process.env.TEMP.replace(/\\/g, "/") + "/proba-v992-").pathname.replace(/^\/([A-Za-z]:)/, "$1"));
    const r = spawnSync("powershell", ["-NoProfile", "-Command", b.ps], { cwd: gol, encoding: "utf8", timeout: 30000 });
    assert.equal(r.status, 0, "PowerShell a picat: " + (r.stderr || "").slice(0, 200)); assert.ok(!/Curatat|Nu am putut/.test(r.stdout), "in folder gol nu are ce curata: " + r.stdout);
    try { fs.rmSync(gol, { recursive: true, force: true }); } catch {}
  });
}
await test(`${TELEFON}: curatenia sta dupa 'if defined REFOLOSIT goto :asteptare' si inainte de pornirea serverului; tunelul vechi e oprit dupa 'Ridic tunelul' si inainte de Start-Process cloudflared`, () => {
  const t = citeste(TELEFON);
  const refolosit = poz(t, "if defined REFOLOSIT goto :asteptare"), urme = poz(t, "rem [ps:curata-urme]"), server = poz(t, "echo   Pornesc serverul pe http://127.0.0.1:8788");
  assert.ok(refolosit < urme && urme < server, `ordine: REFOLOSIT ${refolosit} < urme ${urme} < server ${server}`);
  const ridic = poz(t, "echo   Ridic tunelul ..."), tunel = poz(t, "rem [ps:tunel-vechi]"), porneste = poz(t, "Start-Process -FilePath '%CF%' -ArgumentList 'tunnel'");
  assert.ok(ridic < tunel && tunel < porneste, `ordine: ridic ${ridic} < tunel ${tunel} < porneste ${porneste}`);
});
await test(`${LOCAL}: tunelul vechi e oprit in :INCHIDVECHI (inaintea inchiderii sesiunii vechi); curatenia e chiar inainte de 'call npx ... wrangler pages dev' (serverul inca nu e pornit)`, () => {
  const t = citeste(LOCAL);
  // etichetele (la inceput de linie), nu `goto :ETICHETA` de mai sus
  const inchid = poz(t, "\r\n:INCHIDVECHI\r\n"), tunel = poz(t, "rem [ps:tunel-vechi]"), inchide = poz(t, "rem [ps:inchide]");
  assert.ok(inchid < tunel && tunel < inchide, `ordine: :INCHIDVECHI ${inchid} < tunel ${tunel} < [ps:inchide] ${inchide}`);
  const urme = poz(t, "rem [ps:curata-urme]"), call = poz(t, "call npx --yes wrangler@"), dejaGata = poz(t, "\r\n:DEJAGATA\r\n");
  assert.ok(urme < call && call < dejaGata, `ordine: urme ${urme} < call ${call} < :DEJAGATA ${dejaGata}`);
  assert.ok(!t.slice(urme, call).includes("start \"\""), "intre curatenie si pornire nu se mai porneste nimic");
});

console.log(`\nV992 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute\n`);
process.exit(picate ? 1 : 0);
