// Probele v100.213 (18.10.2026, găsit la livrarea v100.212): serverul 8788 NU lua Functions reconstruite.
// v100.211 a pus worker-ul construit în .wrangler\worker-local și a scris „wrangler dev îl reîncarcă singur (probat 18.10)”.
// Fals pe serverul viu: wrangler IGNORĂ orice schimbare sub un dosar `.wrangler` (acolo își ține starea KV), deci rebuild-ul
// din `livreaza` rămânea pe disc, iar serverul servea Functions VECHI fără niciun semn (health v100.211 după livrarea v100.212).
// Proba v100.211 „pe viu” ținea worker-ul în tmp\worker — de aceea a trecut. Probat controlat 18.10 21:07–21:08 pe 8790:
// același worker rescris în scratchpad ⇒ preluat în 2 s; sub .wrangler\worker-local ⇒ niciodată.
//  1. radar-local.toml: main = "worker-local/index.js", nu sub .wrangler
//  2. lansatorul construiește exact acolo, înainte de wrangler dev; .gitignore ignoră /worker-local/
//  3. livreaza construiește tot acolo și VERIFICĂ health-ul 8788 față de functions/_shared/versiune.js (ieșirea 3 dacă nu)
//  4. pe viu, cu martor: worker sub worker-local ⇒ rescrierea e preluată; același worker sub .wrangler ⇒ nu (capcana e reală)
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
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.213 · serverul local ia Functions reconstruite (worker-ul nu mai stă sub .wrangler) · proba\n");
const WR = (String(JSON.parse(citeste("package.json")).scripts?.dev || "").match(/wrangler@[\d.]+/) || [])[0];

await test("radar-local.toml: main = \"worker-local/index.js\", nu sub .wrangler", () => {
  const w = citeste("radar-local.toml");
  assert.match(w, /^main = "worker-local\/index\.js"$/m);
  assert.ok(!/^main\s*=\s*"[^"]*\.wrangler/m.test(w), "main e încă sub .wrangler (wrangler ignoră schimbările acolo)");
});
await test("lansatorul construiește în worker-local înainte de wrangler dev; .gitignore ignoră /worker-local/", () => {
  const linii = citeste("PORNESTE-CRYPTO-RADAR.bat").split("\n");
  const iBuild = linii.findIndex((l) => /^call npx --yes wrangler@[\d.]+ pages functions build functions --outdir "worker-local" /.test(l));
  const iDev = linii.findIndex((l) => /wrangler@[\d.]+ dev --config radar-local\.toml/.test(l));
  assert.ok(iBuild > 0, "nu găsesc construirea în \"worker-local\"");
  assert.ok(iDev > iBuild, "wrangler dev trebuie să vină DUPĂ construire");
  assert.ok(!linii.some((l) => !/^rem /i.test(l) && /--outdir "\.wrangler/.test(l)), "încă se construiește sub .wrangler");
  assert.match(citeste(".gitignore"), /^\/worker-local\/$/m);
});
await test("livreaza: construiește în worker-local și verifică health-ul 8788 față de versiune.js (ieșirea 3)", async () => {
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /"pages", "functions", "build", "functions", "--outdir", "worker-local"/);
  assert.ok(!/"--outdir", "\.wrangler/.test(c), "livreaza construiește încă sub .wrangler");
  assert.match(c, /Ieșire: 0 gata · 1 [^·]*· 2 [^·]*· 3 publicat/, "antetul nu documentează ieșirea 3");
  const m = await import(new URL("./copie-de-lucru.mjs", import.meta.url));
  assert.equal(typeof m.versiuneaAsteptata, "function"); assert.equal(typeof m.asteaptaVersiunea, "function");
  assert.equal(m.versiuneaAsteptata(RAD), "v100." + Number(JSON.parse(citeste("package.json")).version.split(".")[1]));
  // un server care nu răspunde ⇒ ok:false, fără excepție, în timpul dat
  const t0 = Date.now(), r = m.asteaptaVersiunea("v100.999", "http://127.0.0.1:9/api/market?type=health", 3);
  assert.equal(r.ok, false); assert.equal(r.v, null); assert.ok(Date.now() - t0 < 15000, "așteptarea nu se oprește la timp");
  assert.match(c, /asteaptaVersiunea\(/); assert.match(c, /return 3;/);
});

// ── (4) pe viu, cu martor ────────────────────────────────────────────────────────────────────────────────────────────────────
const portLiber = () => new Promise((rez, rej) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => rez(p)); }); s.on("error", rej); });
const opreste = (p) => { try { if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], { windowsHide: true }); else p.kill("SIGKILL"); } catch {} };
const ia = async (u) => { try { const r = await fetch(u); return { status: r.status, text: await r.text() }; } catch { return null; } };
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
async function server(tmp, dosar, procese) {
  const main = dosar + "/index.js";
  fs.mkdirSync(path.join(tmp, dosar), { recursive: true });
  for (const f of fs.readdirSync(path.join(tmp, "construit"))) fs.cpSync(path.join(tmp, "construit", f), path.join(tmp, dosar, f), { recursive: true });
  const toml = path.join(tmp, dosar.replace(/[^a-z]/gi, "") + ".toml");
  fs.writeFileSync(toml, `name = "crypto-radar-proba-v100213"\nmain = "${main}"\ncompatibility_date = "2026-01-01"\n[assets]\ndirectory = "${path.join(RAD, "public").replace(/\\/g, "/")}"\nbinding = "ASSETS"\n[[kv_namespaces]]\nbinding = "ISTORIC"\nid = "ISTORIC"\n`);
  const port = await portLiber();
  const p = spawn("npx", ["--yes", WR, "dev", "--config", toml, "--no-bundle", "--port", String(port), "--ip", "127.0.0.1", "--persist-to", path.join(tmp, "state-" + port), "--compatibility-date=2026-01-01", "--show-interactive-dev-session=false", "--log-level", "error"], { cwd: tmp, shell: true, windowsHide: true });
  procese.push(p); let err = ""; p.stderr.on("data", (d) => (err += d)); p.stdout.on("data", () => {});
  const url = `http://127.0.0.1:${port}/api/market?type=health`;
  let h = null; for (let i = 0; i < 40 && !h; i++) { await pauza(1500); const r = await ia(url); if (r && r.status === 200) h = r; if (p.exitCode !== null) break; }
  assert.ok(h, `serverul din ${dosar} n-a răspuns în 60 s: ${err.slice(-300)}`);
  return { url, fisier: path.join(tmp, dosar, "index.js"), versiune: JSON.parse(h.text).version };
}
const rescrie = (f, din, in_) => { const s = fs.readFileSync(f, "utf8"); assert.equal(s.split(din).length - 1, 1, `${din} nu apare o dată în ${f}`); fs.writeFileSync(f, s.replace(din, in_)); };
async function ia_versiunea(url, dorita, secunde) { let v = null; for (let i = 0; i < secunde * 2; i++) { const r = await ia(url); try { v = JSON.parse(r.text).version; } catch {} if (v === dorita) return v; await pauza(500); } return v; }
if (process.platform !== "win32") console.log("  SARIT proba pe viu (nu e Windows)");
else await test("pe viu: worker-local preia rescrierea worker-ului; martorul sub .wrangler NU (capcana e reală)", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proba-v100213-")), procese = [];
  try {
    const b = spawnSync("npx", ["--yes", WR, "pages", "functions", "build", "functions", "--outdir", path.join(tmp, "construit"), "--compatibility-date=2026-01-01"], { cwd: RAD, shell: true, encoding: "utf8", windowsHide: true, timeout: 120000 });
    assert.equal(b.status, 0, `build picat: ${(b.stderr || b.stdout || "").slice(-300)}`);
    const [bun, martor] = await Promise.all([server(tmp, "worker-local", procese), server(tmp, ".wrangler/worker-local", procese)]);
    const v = bun.versiune; assert.match(v, /^v100\.\d+$/); assert.equal(martor.versiune, v);
    rescrie(bun.fisier, `"${v}"`, '"v100.9991"'); rescrie(martor.fisier, `"${v}"`, '"v100.9992"');
    const vb = await ia_versiunea(bun.url, "v100.9991", 20), vm = await ia_versiunea(martor.url, "v100.9992", 8);
    console.log(`       (worker-local: ${v} ⇒ ${vb} · martor .wrangler: ${v} ⇒ ${vm})`);
    assert.equal(vb, "v100.9991", "serverul NU a preluat worker-ul rescris din worker-local");
    assert.equal(vm, v, "martorul sub .wrangler a preluat rescrierea — capcana nu mai e reală, revizuiește proba");
  } finally { for (const p of procese) opreste(p); await pauza(500); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} }
});

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
