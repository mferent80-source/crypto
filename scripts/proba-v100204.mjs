// Probele v100.204 (16.10.2026, el: „în grid ce setez, după ce calculează, să afișeze explicit trendul pe diferite tf 5/15/1h/4h/1zi”).
//  „Grid: ce setez acum?” aduce în plus 5 min și 1 oră; sub „Direcția” stă „Trendul pe intervale”: pe fiecare interval urcă / coboară /
//  lateral, de cât timp, și față de gridul ales — aceeași regulă ca „Trendul pe TF-uri” din Tabloul botului (Directie.analizeaza)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.204 · trendul pe intervale în Grid · proba\n");

const cx = {}; vm.createContext(cx); vm.runInContext(citeste("public", "lib", "directie.js"), cx);
const D = cx.Directie;
const H = 3600000;
// lumânări Pionex (cum vin: obiecte cu time/close), cea mai nouă ULTIMA; ultima e „în formare”
const bare = (n, pas, f) => Array.from({ length: n }, (_, i) => ({ time: 1e12 + i * pas, open: f(i), high: f(i) * 1.001, low: f(i) * 0.999, close: f(i) }));
const sus = (n, pas) => bare(n, pas, (i) => 100 * Math.pow(1.004, i));
const jos = (n, pas) => bare(n, pas, (i) => 100 * Math.pow(0.996, i));
const lat = (n, pas) => bare(n, pas, (i) => 100 + (i % 2 ? 0.3 : -0.3));

await test("cele 5 intervale, în ordinea cerută: 5m · 15m · 1h · 4h · 1z", () => {
  assert.equal(JSON.stringify(D.INTERVALE_GRID.map((x) => x.scurt)), JSON.stringify(["5m", "15m", "1h", "4h", "1z"]));   // JSON: tablourile din vm sunt din alt realm
  assert.equal(JSON.stringify(D.INTERVALE_GRID.map((x) => x.tf)), JSON.stringify(["5M", "15M", "60M", "4H", "1D"]));
});
await test("urcă / coboară / lateral pe fiecare interval, cu aceeași regulă ca Tabloul (Directie.analizeaza)", () => {
  const pe = { "5M": sus(300, 5 * 60000), "15M": jos(300, 15 * 60000), "60M": lat(300, H), "4H": sus(300, 4 * H), "1D": jos(200, 24 * H) };
  const r = D.peIntervale(pe, "long");
  assert.equal(JSON.stringify(r.map((x) => x.dir)), JSON.stringify(["urca", "coboara", "lateral", "urca", "coboara"]));
  for (const x of r) assert.equal(x.dir, D.analizeaza(pe[x.tf], D.INTERVALE_GRID.find((y) => y.tf === x.tf).orizont, "long").dir);
});
await test("față de gridul ales: long ⇒ „coboară” e împotrivă; short invers; neutru ⇒ trendul împinge spre o margine; lateral = bun pentru grid", () => {
  const pe = { "5M": sus(300, 5 * 60000), "15M": jos(300, 15 * 60000), "60M": lat(300, H) };
  const L = D.peIntervale(pe, "long"), S = D.peIntervale(pe, "short"), N = D.peIntervale(pe, "neutru");
  assert.equal(L[0].fata.ton, "bine"); assert.equal(L[1].fata.ton, "rau"); assert.equal(L[2].fata.ton, "bine");
  assert.equal(S[0].fata.ton, "rau"); assert.equal(S[1].fata.ton, "bine");
  assert.equal(N[0].fata.ton, "atentie"); assert.equal(N[2].fata.eticheta, "bun pentru grid");
});
await test("„de cât timp”: barele aceleiași stări × intervalul, pe românește (min / h / zile)", () => {
  assert.equal(D.durataTf(6, "5M"), "30 min"); assert.equal(D.durataTf(12, "15M"), "3 h"); assert.equal(D.durataTf(30, "60M"), "1,3 zile");
  assert.equal(D.durataTf(3, "4H"), "12 h"); assert.equal(D.durataTf(9, "1D"), "9 zile"); assert.equal(D.durataTf(1, "1D"), "1 zi"); assert.equal(D.durataTf(null, "4H"), null);
});
await test("interval fără lumânări / prea puține ⇒ rândul spune de ce, nu inventează", () => {
  const r = D.peIntervale({ "5M": sus(30, 5 * 60000) }, "long");
  assert.equal(r[0].dir, null); assert.match(r[0].motiv, /sub 60/);
  assert.equal(r[1].dir, null); assert.match(r[1].motiv, /fără lumânări/);
});

const app = citeste("public", "app.js");
await test("pagina aduce în plus 5 min și 1 oră (500 de bare), cu pauza între cereri (Pionex numără)", () => {
  const f = app.slice(app.indexOf("async function grAduLumanari("), app.indexOf("function grTextEroare("));
  assert.match(f, /interval=5M&limit=500/); assert.match(f, /interval=60M&limit=500/);
  assert.match(f, /return \{r15:r15,r4:r4\|\|\[\],r1:r1\|\|\[\],r5:r5\|\|\[\],r60:r60\|\|\[\],fundingZi:fz\}/);
});
await test("după calcul, sub „Direcția”: blocul „Trendul pe intervale” din Directie.peIntervale pe gridul fișei", () => {
  const r = app.slice(app.indexOf("function renderGrid("), app.indexOf("function renderGrid(") + 9000);
  assert.ok(r.indexOf("grTrendTfHtml(f)") > r.indexOf("<h4>Direcția</h4>"));
  assert.match(app, /function grTrendTfHtml\(f\)\{/);
  assert.match(app, /Directie\.peIntervale\(\{"5M":d\.r5,"15M":d\.r15,"60M":d\.r60,"4H":d\.r4,"1D":d\.r1\},f\.dir\)/);
  assert.match(app, /Trendul pe intervale/);
  assert.match(app, /„Lateral” aici = prețul se plimbă, chiar dacă EMA-urile din „Direcția” au pantă/);   // cele două reguli pot diferi (MET, 16.10) ⇒ se spune
});
await test("stilul tabelului e și pe pagina Grid (#gridset)", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#gridset \.tbTrendTab\{/); assert.match(css, /#gridset \.tbTrendBec\.bine\{/);
});
await test("versiunile: v100.204, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  assert.equal(JSON.parse(citeste("package.json")).version, "100.204.0"); assert.match(citeste("public", "sw.js"), /^const CACHE="crypto-radar-v100-204";/);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.204"); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.204"/);
  assert.equal((idx.match(/v100\.204/g) || []).length, 4); assert.ok(!/v100\.203\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100203 && npm run test:v100204/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
