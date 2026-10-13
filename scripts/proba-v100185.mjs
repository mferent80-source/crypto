// Probele v100.185 (13.10.2026, el: „ok fă idei” — ideile 1 și 2 din v100.184)
// 1) fișa botului (Tablou, „Ce spune piața acum”): rândul „În pândă, PLUME” — moneda botului în tabelul celor 150
// 2) pânda din Sugestii (și pliată): o propoziție când un bot al lui e CONTRA direcției monedei lui
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.185 · moneda botului în pândă + boții contra · proba\n");

const ctx = { console, navTo() {}, getJSON() {}, $: () => null, document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js"), ctx);
vm.runInContext(citeste("public", "lib", "latime.js"), ctx);
vm.runInContext(citeste("public", "lib", "busola.js"), ctx);
vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);
const L = ctx.Latime, ACUM = 1_000_000_000_000;
const l = { acum: { la: ACUM - 5 * 60000, n: 3, lat: { sus: 2, jos: 1, mariLong: 2 }, regim: { cod: "LARG-SUS" }, monede: [
  { sym: "PLUMEUSDT", pret: 0.02, dir: "SUS", zileDir: 51, volPctl: 98, extPctl: 40, adrUsed: 120.4, fundPctl: 80, oiPctl: 50 },
  { sym: "ADAUSDT", pret: 0.5, dir: "JOS", zileDir: 3, volPctl: 20, extPctl: 10, adrUsed: 30, fundPctl: 50, oiPctl: 10 },
  { sym: "1000PEPEUSDT", pret: 0.01, dir: "neclara", zileDir: null, volPctl: null, extPctl: null, adrUsed: null, fundPctl: null, oiPctl: null }] }, istoric: [] };

await test("textMoneda: direcția cu zilele, cifrele și pragurile atinse; botul CU direcția ⇒ info", () => {
  const r = L.textMoneda(l, "PLUME", "long", ACUM);
  assert.equal(r.ce, "În pândă, PLUME");
  assert.equal(r.stare, "info");
  assert.match(r.text, /^SUS de 51 de zile · volatilitate 98 · extensie 40 · bugetul zilei 120% · funding 80 · OI 50 · prag atins: volatilitate extremă, bugetul zilei epuizat, funding extrem · acum 5 min$/);
});
await test("textMoneda: botul CONTRA direcției monedei ⇒ atenție și o spune", () => {
  const r = L.textMoneda(l, "PLUME", "short", ACUM);
  assert.equal(r.stare, "atentie");
  assert.match(r.text, /botul tău e CONTRA direcției monedei/);
  assert.equal(L.textMoneda(l, "ADA", "long", ACUM).stare, "atentie");
});
await test("textMoneda: simbolul în orice formă (PLUME_USDT_PERP, PLUMEUSDT, pepe ⇒ 1000PEPE); fără date ⇒ null", () => {
  assert.equal(L.textMoneda(l, "PLUME_USDT_PERP", "long", ACUM).ce, "În pândă, PLUME");
  assert.equal(L.textMoneda(l, "plumeusdt", "long", ACUM).ce, "În pândă, PLUME");
  assert.equal(L.textMoneda(l, "PLUME.PERP", "long", ACUM).ce, "În pândă, PLUME", "baza din Pionex");
  const p = L.textMoneda(l, "PEPE", "long", ACUM);
  assert.equal(p.ce, "În pândă, PEPE"); assert.match(p.text, /^direcția neclară · acum 5 min$/);
  assert.equal(L.textMoneda(l, "XYZ", "long", ACUM), null, "moneda din afara celor 150");
  assert.equal(L.textMoneda(null, "PLUME", "long", ACUM), null);
  assert.equal(L.textMoneda({ acum: { la: ACUM, eroare: "Binance mut" } }, "PLUME", "long", ACUM), null);
});
await test("textMoneda: lățimea veche își spune ora", () => {
  const v = L.textMoneda({ ...l, acum: { ...l.acum, la: ACUM - 120 * 60000 } }, "ADA", "short", ACUM);
  assert.equal(v.vechi, true); assert.match(v.text, /· veche, de la \d\d:\d\d$/);
});
await test("botiContra: doar boții contra direcției (neutru și neclară nu intră)", () => {
  const c = L.botiContra(l, [{ s: "PLUME", dir: "short" }, { s: "ADA", dir: "short" }, { s: "PEPE", dir: "long" }, { s: "PLUME", dir: "neutru" }]);
  assert.equal(c.length, 1);
  assert.equal(c[0].s, "PLUME"); assert.equal(c[0].dirBot, "short"); assert.equal(c[0].dir, "SUS"); assert.equal(c[0].zileDir, 51);
});
await test("pânda (pliată și desfăcută): propoziția despre boții contra, doar când există", () => {
  ctx.Latime = L;
  for (const desf of [false, true]) {
    ctx.sugStare.panda.desfacut = desf; ctx.sugStare.panda.filtru = "toate";
    const h = ctx.sugPandaHtml(l, [{ s: "PLUME", dir: "short" }], ACUM);
    assert.match(h, /<p class="tbCitScurt sugPandaContra">⚠ Contra direcției monedei: <b>PLUME<\/b> \(botul short, moneda SUS de 51 de zile\)\.<\/p>/);
    assert.doesNotMatch(ctx.sugPandaHtml(l, [{ s: "PLUME", dir: "long" }], ACUM), /sugPandaContra/);
  }
});
await test("Tabloul: rândul vine în citire după lățimea pieței, cu moneda botului (baza)", () => {
  const app = citeste("public", "app.js");
  assert.match(app, /out\.latimeMoneda=typeof Latime!=="undefined"&&typeof tbLatimeKv!=="undefined"&&Latime\.textMoneda\?Latime\.textMoneda\(tbLatimeKv\.d,b\.baza,b\.directie,Date\.now\(\)\):null;/);
  assert.match(app, /if\(ex\.latime\)out\.push\(rd\(ex\.latime\)\);if\(ex\.latimeMoneda\)out\.push\(rd\(ex\.latimeMoneda\)\);/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
