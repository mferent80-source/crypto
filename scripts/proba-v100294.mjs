// Proba v100.294 (02.11, după pozele de pe 8788 ale v100.293 la toate lățimile lui): la 1920 și 2560 px eticheta celulei
// „Mișcarea pe 24 h” din fișa boților se rupea între cifră și unitate („Mișcarea pe 24” / „h”). Cifra și unitatea stau împreună:
// spațiu fără rupere (U+00A0) în „24 h” și în „pe 4 h” (rândul de sub cifră).
// Ce probează:
//   1. eticheta și rândul de sub cifră țin „24 h” / „4 h” cu spațiu fără rupere; cifrele rămân cele din v100.293;
//   2. versiunile v100.294; v100.293 pe „≥”.
//   node scripts/proba-v100294.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.294 · Sugestii: „24 h” nu se rupe în fișa boților · proba\n");

const ACUM = Date.parse("2026-11-02T10:00:00Z"), NB = " ";
const cl = { la: ACUM, monede: [{ simbol: "HYPE_USDT_PERP", stare: "candidat", dir: "long", tarie: "tare", regim: { r4h: 0.5763, r24h: 0.2908, s24h: 0.0123, mr: 0.31, miscare: false }, volum: 6.6e6, pret: 88.61, latime: 0.0857, pas: 0.00304, grile: 28, profitGrila: 0.00264, traversariZi: 15.2, scor: 0.0014 }] };
const D = { latime: { acum: { la: ACUM, n: 150, monede: [] }, istoric: [] }, boti: [], clasament: cl, sugMonede: { sugestii: { la: ACUM, urmarire: {} } }, idei: null, sugActiuni: null, sectoare: null, trend12: null };
function ecran() {
  const ctx = { console, escapeHtml: (s) => String(s == null ? "" : s), Idei: { ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 5) },
    Busola: { adresaBusola: () => "https://busola.local/" }, GraficBot: { desen: () => ({ svg: "", legenda: "", valori: "" }) }, getJSON: async () => ({}), navTo() {},
    setTimeout, clearTimeout, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, Promise, TextRo: globalThis.TextRo, window: null };
  vm.createContext(ctx);
  for (const f of ["latime.js", "reveniri.js", "sugestii-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
  return ctx;
}

await test("1. „Mișcarea pe 24 h”: eticheta și rândul de sub cifră țin cifra lângă unitate (spațiu fără rupere); cifrele rămân cele din v100.293", () => {
  const c = ecran(), r = c.sugRanduri(D, ACUM).filter((x) => x.k === "porn:HYPE")[0], f = JSON.parse(JSON.stringify(c.sugFisa(r, D, ACUM)));
  const cel = f.cele.filter((x) => /^Mișcarea pe 24\s+h$/.test(x.et))[0];
  assert.ok(cel, JSON.stringify(f.cele.map((x) => x.et)));
  assert.equal(cel.et, "Mișcarea pe 24" + NB + "h", "„24” și „h” nu se mai despart la capăt de rând");
  assert.equal(cel.v, "+1,2%");
  assert.equal(cel.sub, "0,3× obișnuitul · pe 4" + NB + "h 0,6×");
  // și fișa desenată poartă spațiul fără rupere (nu e pierdut la escapare)
  const h = c.sugFisaHtml ? c.sugFisaHtml(c.sugFisa(r, D, ACUM), r) : "";
  if (h) assert.ok(h.indexOf("Mișcarea pe 24" + NB + "h") >= 0, "desenul fișei păstrează U+00A0");
});
await test("2. versiunile v100.294 (aplicația, BUILD_INFO, pagina, cache-ul, package.json, lanțul); v100.293 pe „≥”", () => {
  assert.ok(Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]) >= 294, "v100.294 sau mai nouă");
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(Number(B.version.match(/v100\.(\d+)/)[1]) >= 294); assert.ok(B.features.sugestii294, "cheia v100.294 rămâne"); assert.ok(B.features.sugestii293, "cheia v100.293 rămâne");
  const H = citeste("public", "index.html"); assert.ok(Number(H.match(/id="healthAppVersion">v100\.(\d+)</)[1]) >= 294);
  assert.ok(Number(citeste("public", "sw.js").match(/crypto-radar-v100-(\d+)/)[1]) >= 294);
  const pk = JSON.parse(citeste("package.json")); assert.ok(Number(pk.version.split(".")[1]) >= 294); assert.equal(pk.scripts["test:v100294"], "node scripts/proba-v100294.mjs"); assert.match(pk.scripts.test, /npm run test:v100293 && npm run test:v100294( |$)/);
  assert.doesNotMatch(citeste("scripts", "proba-v100293.mjs"), /VERSIUNE = "v100\\\.293"\/\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
