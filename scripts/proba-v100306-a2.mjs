// Proba v100.306 · A2 (I-837): garda convențiilor de pe ecran (scripts/proba-ecran-telefon-conventii.mjs) - prinde abaterile din auditul
// final 05.11 și lasă în pace excepțiile scrise (prețurile Pionex, ratele mici, sumele sub 0,1, datele, versiunile, coeficienții);
// proba de telefon o folosește pe fiecare pagină zilnică. node scripts/proba-v100306-a2.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { abateri, PAGINI_CONVENTII, TEXT_VAZUT_JS, CUVINTE_ENGLEZE } from "./proba-ecran-telefon-conventii.mjs";

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
const tipuri = (t) => abateri(t).map((x) => x.tip);
console.log("\nV100.306 · A2 · garda convențiilor de pe ecran · proba\n");

await test("1. prinde abaterile din auditul final (05.11): două zecimale, punct, minus ASCII, fără mii, engleză", () => {
  assert.deepEqual(tipuri("BTC 76.053 ¦ −5,62% ¦ ETH"), ["zecimale"]);
  assert.deepEqual(tipuri("interval 15,70% · 0,26% net pe grilă"), ["zecimale"]);
  assert.deepEqual(tipuri("dividendele, separat: +57,20 lei ¦ Dacă"), ["zecimale"]);
  assert.deepEqual(tipuri("la stop pierzi −2,80 USDT"), ["zecimale"]);
  assert.deepEqual(tipuri("cel mai slab: trend MM200 (49.0%)"), ["punct"]);
  assert.deepEqual(tipuri("stopul calculat ($25.17) — mai jos"), ["punct"]);
  assert.deepEqual(tipuri("mixt / neconcludent (VIX 16.6)"), ["punct"]);
  assert.ok(tipuri("Crypto · BEARISH · score 14 · benchmark -5.5%").includes("minus"));
  assert.ok(tipuri("Crypto · BEARISH · score 14 · benchmark -5.5%").includes("engleza"));
  assert.deepEqual(tipuri("Înainte de 26.10: 56,1% din 2401 boți"), ["mii"]);
  assert.deepEqual(tipuri("net −6430,9 USDT"), ["mii"]);
  assert.deepEqual(tipuri("pe 1000 de bare"), ["mii"]);
  assert.deepEqual(tipuri("Win 46 · Loss 34"), ["engleza", "engleza"]);
  assert.deepEqual(tipuri("ASTEAPTA · long activ"), ["engleza"]);
  assert.deepEqual(tipuri("52,3 ¦ Neutral ¦ expunere"), ["engleza"]);
});
await test("2. excepțiile scrise: prețurile Pionex, ratele sub 1%, sumele sub 0,1, datele, orele, versiunile, coeficienții, anii, mii corecte", () => {
  for (const ok of ["Preț de jos 0.3419", "BTC 75.923,90 USDT", "AKE 0,00215 USDT", "PEPE 0.000004962", "75923.90 USDT", "pas 0,30% · 0,26% net pe grilă",
    "Rata de funding 0,0100% la 8 h", "costul pe zi 0,04 USDT", "−0,04 USDT", "ultimul închis 05.11 · Jurnal", "Proba din 04.11.2026", "6.10 ¦ 21.10 ¦ 5.11",
    "Range Filter B&S v2.5 / v2.6", "v100.306 · doar citire", "corelația (0,72)", "Brier 0,077", "p = 0,23", "−10.305 lei", "−6.430,9 USDT", "2.401 boți",
    "anul 2026", "4h-1z", "I-824", "2026-11-05", "+12,8%", "−5,6%", "+1,4 · ies dacă pierd −2,8", "1–2 zile", "port 8791", "74,80 EUR", "$4,22", "stop $3,83", "β −0,16", "Sharpe −1,69", "IC −0,19…0,03", "+0,031 (IC −0,033…+0,112)", "20:29", "0 din 20", "−0,8% pe fereastră"]) {
    assert.deepEqual(abateri(ok), [], ok + " ⇒ " + JSON.stringify(abateri(ok)));
  }
});
await test("3. fiecare abatere vine cu fragmentul ei (ca raportul să spună unde e), iar lista paginilor e cea zilnică, fără laboratorul vechi", () => {
  const a = abateri("ceva text înainte, apoi rezultatul −5,62% și altceva după");
  assert.equal(a.length, 1); assert.match(a[0].text, /−5,62%/);
  for (const p of ["dash", "tabloubot", "sugestii", "gridset", "tradezilei", "rangefilter", "t212", "alerts", "deriv"]) assert.ok(PAGINI_CONVENTII.includes(p), p);
  for (const p of ["engine", "mtf", "opportunity", "settings", "health"]) assert.ok(!PAGINI_CONVENTII.includes(p), p);
  for (const w of ["WIN", "LOSS", "score", "Neutral", "ASTEAPTA"]) assert.ok(CUVINTE_ENGLEZE.includes(w), w);
  assert.match(TEXT_VAZUT_JS, /input,select,textarea,svg,code,pre/); assert.match(TEXT_VAZUT_JS, /\[data-conv-ecou\]/); assert.match(TEXT_VAZUT_JS, /getClientRects/);
});
await test("4. proba de telefon folosește garda pe paginile zilnice și scrie lista întreagă lângă poze", () => {
  const p = fs.readFileSync(new URL("./proba-ecran-telefon.mjs", import.meta.url), "utf8");
  assert.match(p, /from "\.\/proba-ecran-telefon-conventii\.mjs"/);
  assert.match(p, /PAGINI_CONVENTII\.includes\(p\)/); assert.match(p, /abateri\(/); assert.match(p, /conventii-/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
