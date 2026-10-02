// Proba v100.30 (30.09, el: „fa 1/2/3” - ideea 1): poarta de pornire recunoaste monedele al caror bot are ALT nume decat tickerul.
// Pionex: tickerul LIT_USDT_PERP, botul „LIGHTER.PERP” (la fel PUMP→PUMPFUN, 0G→ZEROG, 1INCH→INCH, NEIRO→NEIROCTO... ~12 pe USDT).
// Poarta cauta istoricul si reintrarea dupa numele BOTULUI (baseCurrency din lista oficiala Pionex), nu dupa ticker - altfel la
// LIT scria „n-ai mai avut boti”, desi pe LIGHTER ai 5 boti cu net pe minus.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.30 · poarta pe numele botului (LIT -> LIGHTER) · proba\n");
const T0 = Date.UTC(2026, 8, 1), H = 3600000;
const tr = (m, rez) => rez.map((r, i) => ({ id: m + i, moneda: m, pornit: T0 + i * 5 * H, inchis: T0 + i * 5 * H + 2 * H, durataOre: 2, rezultat: r, comisioane: -0.5, funding: 0, greseli: [] }));
const fisa = (simbol) => ({ simbol, verdict: { nivel: "porneste" }, setare: { levierSigur: 5 } });
const TR = tr("LIGHTER", [5.5, -20, -30, 2.5, -8]);
const ultim = TR[TR.length - 1].inchis;

await test("cu numele botului: istoricul si reintrarea se cauta pe LIGHTER, iar textul spune ca LIT se numeste LIGHTER la boti", () => {
  const r = OB.poarta({ fisa: fisa("LIT_USDT_PERP"), numeBot: "LIGHTER", trades: TR, acum: ultim + 5 * 60000, dir: "long", levier: 3, plan: { plus: 5, minus: 10 } });
  const m = r.reguli.find((x) => x.cod === "moneda"), re = r.reguli.find((x) => x.cod === "reintrare");
  assert.equal(m.ok, false); assert.match(m.text, /Pe LIGHTER pierzi: 5 boți/); assert.match(m.text, /LIT = LIGHTER/);   /* v100.72: numele botului în aceeași frază, „(LIT = LIGHTER la boții Pionex)” */
  assert.equal(re.ok, false, "botul pe LIGHTER s-a inchis acum 5 minute"); assert.match(re.text, /LIGHTER/);
});
await test("fara numele botului (sau acelasi nume): ca inainte - dupa ticker, fara nota", () => {
  const r = OB.poarta({ fisa: fisa("LIT_USDT_PERP"), trades: TR, acum: ultim + 5 * 60000, dir: "long", levier: 3, plan: { plus: 5 } });
  assert.match(r.reguli.find((x) => x.cod === "moneda").text, /N-ai mai avut boți închiși pe LIT/);
  const r2 = OB.poarta({ fisa: fisa("LIGHTER_USDT_PERP"), numeBot: "LIGHTER", trades: TR, acum: ultim + 5 * 60000, dir: "long", levier: 3, plan: { plus: 5 } });
  assert.doesNotMatch(r2.reguli.find((x) => x.cod === "moneda").text, /se numește/);
});
await test("pagina: poarta primeste numele botului din lista oficiala Pionex (baseCurrency), pentru moneda aleasa", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const i = app.indexOf("async function gridPoarta("), corp = app.slice(i, app.indexOf("\n}", i));
  assert.match(corp, /numeBot:grStare\.monede&&grStare\.monede\[f\.simbol\]&&grStare\.monede\[f\.simbol\]\.baseCurrency/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
