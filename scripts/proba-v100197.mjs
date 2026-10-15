// Probele v100.197 (15.10.2026, el: „afișează” — valoarea contului pe zile, `cont:zile` din KV, scrisă de colector o dată pe zi și
// necitită până acum de nicio pagină): secțiunea „Valoarea contului pe zile” în „Contul întreg” — cifra de azi, schimbarea față de
// ziua dinainte (săgeată + semn, nu doar culoare), linia pe zile cu detaliile la trecerea mouse-ului, tabelul pe surse, zilele parțiale.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.197 · valoarea contului pe zile · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, document: { getElementById: () => null } };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "cont-ecran.js"), ctx);
const ZILE = [
  { z: "2026-10-13", valoare: 38492, complet: true, pionex: 164, t212: 28227, salt: 10101 },
  { z: "2026-10-14", valoare: 38985, complet: false, pionex: 173, t212: 28588, salt: 10224 },
  { z: "2026-10-15", valoare: 37607, complet: true, pionex: 146, t212: 27117, salt: 10345 },
];

await test("fără zile ⇒ spune de unde vin și când apar; o singură zi ⇒ cifra, fără grafic, „graficul apare de la a doua zi”", () => {
  assert.equal(typeof ctx.ciZileHtml, "function");
  assert.match(ctx.ciZileHtml(null), /Valoarea contului pe zile/); assert.match(ctx.ciZileHtml([]), /colectorul o scrie o dată pe zi/);
  const h1 = ctx.ciZileHtml([ZILE[0]]);
  assert.match(h1, /38\.492 lei/); assert.ok(!/<svg/.test(h1)); assert.match(h1, /graficul apare de la a doua zi/);
});
await test("trei zile: cifra de azi, schimbarea față de ziua dinainte cu săgeată și semn (−1.378 lei, −3,5%), ziua dinainte parțială spusă", () => {
  const h = ctx.ciZileHtml(ZILE);
  assert.match(h, /37\.607 lei/);
  assert.match(h, /▼ −1\.378 lei \(−3,5%\)/, "săgeată + semn + o zecimală");
  assert.match(h, /class="ciZileSch bad"/, "culoarea vine cu săgeată, nu singură");
  assert.match(h, /ziua dinainte era parțială/);
  assert.match(h, /include și depunerile și retragerile/, "schimbarea nu e doar profit — spus cinstit");
});
await test("graficul: o linie, câte un punct pe zi cu detaliile la trecerea mouse-ului (Pionex / Trading 212 / Salt), punctul zilei parțiale gol", () => {
  const h = ctx.ciZileHtml(ZILE);
  assert.equal((h.match(/<svg/g) || []).length, 1); assert.equal((h.match(/<polyline/g) || []).length, 1);
  assert.equal((h.match(/class="ciZilePct/g) || []).length, 3, "un punct pe zi");
  assert.match(h, /<title>15\.10\.2026: 37\.607 lei · Pionex 146 lei · Trading 212 27\.117 lei · Salt 10\.345 lei<\/title>/);
  assert.match(h, /class="ciZilePct ciZileGol"/, "ziua parțială are punctul gol");
  assert.match(h, /role="img" aria-label="Valoarea contului pe 3 zile, de la 38\.492 lei la 37\.607 lei"/);
});
await test("tabelul: cea mai nouă zi sus, totalul, schimbarea, sursele; „parțial” la ziua cu o sursă lipsă; numele coloanelor pe telefon (data-et)", () => {
  const h = ctx.ciZileHtml(ZILE), tb = h.slice(h.indexOf("<table"));
  assert.ok(tb.indexOf("15.10.2026") < tb.indexOf("14.10.2026") && tb.indexOf("14.10.2026") < tb.indexOf("13.10.2026"));
  assert.match(tb, /<td data-et="Pionex">146 lei<\/td>/); assert.match(tb, /<td data-et="Trading 212">27\.117 lei<\/td>/); assert.match(tb, /<td data-et="Salt">10\.345 lei<\/td>/);
  assert.match(tb, /14\.10\.2026<span class="t212Mic"> · parțial<\/span>/);
  assert.match(tb, /▲ \+493 lei \(\+1,3%\)/, "13→14: +493 lei");
  assert.equal((tb.match(/<tr>/g) || []).length, 4, "capul + 3 zile");
});
await test("datele stricate nu strică pagina: zile fără valoare sau cu z greșit ies; ordinea vine din z, nu din listă", () => {
  const h = ctx.ciZileHtml([ZILE[2], { z: "nu", valoare: 5 }, { z: "2026-10-12", valoare: null }, ZILE[0]]);
  assert.ok(!/NaN|undefined/.test(h)); assert.equal((h.match(/class="ciZilePct/g) || []).length, 2);
});
await test("pagina: ciPorneste aduce `contZile` și pune secțiunea sus, înaintea raportului; CSS-ul ei înaintea pândei", () => {
  const ce = citeste("public", "lib", "cont-ecran.js"), css = citeste("public", "app.css");
  assert.match(ce, /getJSON\("\/api\/istoric-bot\?action=contZile"\)/);
  assert.equal((ce.match(/ciZileHtml\(ciStare\.zile\) \+ /g) || []).length, 2, "și din memorie, și după aducere");
  const iZ = css.indexOf(".ciZileGraf{"), iPanda = css.lastIndexOf("@media (max-width:640px){.sugPandaTab thead"); assert.ok(iZ > 0 && iPanda > iZ, "pânda rămâne ultima");
});
await test("versiunile: v100.197, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 197);   /* v100.198: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.196\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100196 && npm run test:v100197/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
