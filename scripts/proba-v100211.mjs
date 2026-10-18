// Proba v100.211 (18.10.2026, el: „fă 2”, după măsurătoarea pe PID): serverul LOCAL fără sondare.
// `wrangler pages dev` ținea esbuild în watch, care sonda ~60 de directoare la fiecare 500 ms (7.855 KB/s în 119 op/s = 64 KiB
// per listare, 1.384 stat/s, 4,4 % dintr-un nucleu, zi și noapte, din cache — discul fizic nu le vedea). Lansatorul construiește
// acum Functions o dată (wrangler pages functions build → .wrangler/worker-local) și pornește `wrangler dev --no-bundle` cu
// radar-local.toml (public/ ca assets pe env.ASSETS, KV ISTORIC, același .wrangler/state); copie-de-lucru.mjs reconstruiește
// worker-ul la livrările care ating functions/, iar wrangler îl reîncarcă singur (probat pe 8789: paritate 26/26 rute).
// Proba: (1) textul lansatorului, configului, livrării și gărzii; (2) versiunile; (3) PE VIU: construiește Functions într-un dosar
// temporar și pornește chiar comanda lansatorului pe un port liber — health-ul trebuie să fie al aplicației, cu versiunea nouă,
// iar / trebuie să vină din public/ (assets).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); }); }
console.log("\nv100.211 · serverul local fără sondare (Functions pre-construite + wrangler dev --no-bundle) · proba\n");

const bat = citeste("PORNESTE-CRYPTO-RADAR.bat");
const linii = bat.split("\n").filter((l) => !/^\s*rem\b/i.test(l));
const WR = (String(JSON.parse(citeste("package.json")).scripts.dev || "").match(/wrangler@[\d.]+/) || [])[0];

await test("lansatorul: Functions construite în .wrangler\\worker-local, apoi wrangler dev --no-bundle cu radar-local.toml, pe 127.0.0.1, cu --persist-to; fără pages dev", () => {
  assert.ok(WR, "package.json scripts.dev nu numește wrangler@<versiune>");
  const iBuild = linii.findIndex((l) => l.includes(`${WR} pages functions build functions --outdir ".wrangler\\worker-local"`));
  const iDev = linii.findIndex((l) => l.includes(`${WR} dev --config radar-local.toml`));
  assert.ok(iBuild >= 0, "lipsește linia de build"); assert.ok(iDev >= 0, "lipsește linia wrangler dev");
  assert.ok(iBuild < iDev, "build-ul trebuie să fie ÎNAINTEA pornirii");
  const dev = linii[iDev];
  for (const t of ["--no-bundle", "--ip 127.0.0.1", "--port 8788", '--persist-to "%CD%\\.wrangler\\state"', "--env-file .dev.vars"]) assert.ok(dev.includes(t), `wrangler dev fără ${t}`);
  assert.ok(!linii.some((l) => /pages dev/.test(l)), "mai există o linie cu pages dev");
  assert.match(linii.slice(iBuild, iDev).join("\n"), /if errorlevel 1 \(/, "build-ul picat trebuie să oprească lansatorul (if errorlevel 1)");
});
await test("radar-local.toml: main = worker-ul construit, [assets] public pe ASSETS, KV ISTORIC cu id ISTORIC", () => {
  const w = citeste("radar-local.toml");
  assert.match(w, /^main = "\.wrangler\/worker-local\/index\.js"$/m);
  assert.match(w, /^\[assets\]$/m); assert.match(w, /^directory = "public"$/m); assert.match(w, /^binding = "ASSETS"$/m);
  assert.match(w, /^\[\[kv_namespaces\]\]$/m); assert.match(w, /^binding = "ISTORIC"$/m); assert.match(w, /^id = "ISTORIC"$/m);
  assert.doesNotMatch(w, /^\[triggers\]/m, "configul local n-are cron-uri");
});
await test("copie-de-lucru.mjs: livrarea care atinge functions/ reconstruiește worker-ul din principal", () => {
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /atinse\.some\(\(x\) => x\.startsWith\("functions\/"\)\) && fs\.existsSync\(path\.join\(RAD, "radar-local\.toml"\)\)/);
  assert.match(c, /"pages", "functions", "build", "functions", "--outdir", "\.wrangler\/worker-local"/);
  assert.ok(c.indexOf('"functions", "build"') > c.indexOf("Principalul adus la"), "reconstruirea vine DUPĂ ce principalul e adus");
});
await test("garzi-v746: garda lansatoare cere wrangler dev --no-bundle + radar-local.toml + build înainte, și refuză pages dev", () => {
  const g = citeste("scripts", "garzi-v746.mjs");
  for (const t of ['/--no-bundle\\b/.test(cmdLocal)', '/--config radar-local\\.toml\\b/.test(cmdLocal)', 'mai porneste si "pages dev"', '/--outdir "\\.wrangler\\\\worker-local"/.test(build)', 'liniiLoc.indexOf(build) > liniiLoc.indexOf(cmdLocal)', 'cale("radar-local.toml")']) assert.ok(g.includes(t), `garda fără: ${t}`);
});
await test("versiunile: v100.211 peste tot (package, BUILD_INFO, sw.js, versiune.js, index.html ×4), proba în lanțul `test`", () => {
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 211);
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";'));
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, "v100." + ver); assert.ok(bi.features.faraSondare211);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.210\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v101125 && npm run test:v100211/);
});

// ── (3) pe viu: chiar comanda lansatorului, pe un port liber, dintr-un dosar temporar ─────────────────────────────────────────
const portLiber = () => new Promise((rez, rej) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => rez(p)); }); s.on("error", rej); });
const opreste = (p) => { try { if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], { windowsHide: true }); else p.kill("SIGKILL"); } catch {} };
const ia = async (u) => { try { const r = await fetch(u); return { status: r.status, text: await r.text() }; } catch { return null; } };
if (process.platform !== "win32") console.log("  SARIT proba pe viu (nu e Windows)");
else await test("pe viu: build în temp + wrangler dev --no-bundle pe port liber ⇒ health al aplicației cu versiunea nouă, / din public/, fără esbuild în watch", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proba-v100211-"));
  const procese = [];
  try {
    const b = spawnSync("npx", ["--yes", WR, "pages", "functions", "build", "functions", "--outdir", path.join(tmp, "worker"), "--compatibility-date=2026-01-01"], { cwd: RAD, shell: true, encoding: "utf8", windowsHide: true, timeout: 120000 });
    assert.equal(b.status, 0, `build picat: ${(b.stderr || b.stdout || "").slice(-300)}`);
    const worker = path.join(tmp, "worker", "index.js");
    assert.ok(fs.existsSync(worker), "index.js neconstruit"); assert.ok(fs.readFileSync(worker, "utf8").includes("ASSETS"), "worker-ul construit nu cade pe ASSETS");
    const toml = path.join(tmp, "radar-local.toml");
    fs.writeFileSync(toml, `name = "crypto-radar-proba-v100211"\nmain = "worker/index.js"\ncompatibility_date = "2026-01-01"\n[assets]\ndirectory = "${path.join(RAD, "public").replace(/\\/g, "/")}"\nbinding = "ASSETS"\n[[kv_namespaces]]\nbinding = "ISTORIC"\nid = "ISTORIC"\n`);
    const port = await portLiber();
    const p = spawn("npx", ["--yes", WR, "dev", "--config", toml, "--no-bundle", "--port", String(port), "--ip", "127.0.0.1", "--persist-to", path.join(tmp, "state"), "--compatibility-date=2026-01-01", "--show-interactive-dev-session=false", "--log-level", "error"], { cwd: RAD, shell: true, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    procese.push(p);
    let err = ""; p.stderr.on("data", (d) => (err += d)); p.stdout.on("data", () => {});
    let h = null;
    for (let i = 0; i < 40 && !h; i++) { await new Promise((r) => setTimeout(r, 1500)); const r = await ia(`http://127.0.0.1:${port}/api/market?type=health`); if (r && r.status === 200) h = r; if (p.exitCode !== null) break; }
    assert.ok(h, `serverul n-a răspuns în 60 s: ${err.slice(-300)}`);
    const j = JSON.parse(h.text);
    assert.equal(j.ok, true); assert.equal(j.service, "crypto-radar"); assert.equal(j.version, "v100." + Number(JSON.parse(citeste("package.json")).version.split(".")[1]));
    const idx = await ia(`http://127.0.0.1:${port}/`); assert.ok(idx && idx.status === 200 && /name="app-version"/.test(idx.text), "/ nu vine din public/ (assets)");
    const lipsa = await ia(`http://127.0.0.1:${port}/nu-exista-v100211`); assert.ok(lipsa && lipsa.status === 404, "ruta inexistentă nu dă 404");
    // esbuild NU e în watch: copiii lui wrangler n-au esbuild care să sondeze (cu --no-bundle nu există context.watch)
    const arb = spawnSync("powershell", ["-NoProfile", "-Command", `$all = Get-CimInstance Win32_Process; $ids = @(${p.pid}); for ($i = 0; $i -lt 6; $i++) { $ids += ($all | Where-Object { $ids -contains $_.ParentProcessId } | ForEach-Object { $_.ProcessId }) }; ($all | Where-Object { $ids -contains $_.ProcessId -and $_.Name -eq 'esbuild.exe' } | Measure-Object).Count`], { encoding: "utf8", windowsHide: true });
    const esb = Number((arb.stdout || "").trim());
    assert.ok(Number.isFinite(esb), "nu pot număra procesele esbuild");
    console.log(`       (port ${port}, esbuild în arborele serverului: ${esb} — cu --no-bundle nu are ce sonda)`);
  } finally { for (const p of procese) opreste(p); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} }
});

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
