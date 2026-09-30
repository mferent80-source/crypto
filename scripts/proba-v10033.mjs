// Proba v100.33 (30.09, el: „fa idei” - ideea 1 din trei): din alerta „bot nou pe o monedă unde pierzi”, un LINK care deschide
// fereastra Grid pe moneda aceea si ruleaza singur poarta de pornire (…/#ecran=gridset&moneda=LIT). Tickerul din simbolPionex
// (botul „LIGHTER” -> LIT_USDT_PERP -> LIT), adresa = adresa fixa a Radarului (Tailscale / tunel), ceruta doar cand e o alerta.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT);
const { avertizariPornire } = await import("./lib/tura-pornire.mjs");
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(i, j + 1); }
console.log("\nV100.33 · link din alerta de pornire spre poarta · proba\n");

await test("crLegaturaDin: #ecran=gridset&moneda=LIT; moneda doar litere si cifre; linkurile vechi (parola, tabloubot, t212 + poz) merg ca inainte", () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(functia(app, "crLegaturaDin") + ";this.f=crLegaturaDin;", ctx);
  const a = ctx.f("#ecran=gridset&moneda=LIT");
  assert.equal(a.ecran, "gridset"); assert.equal(a.moneda, "LIT"); assert.equal(a.parola, null);
  assert.equal(ctx.f("#ecran=gridset&moneda=LI%3Cscript").moneda, null);
  const b = ctx.f("#parola=abc%20d&ecran=tabloubot"); assert.equal(b.ecran, "tabloubot"); assert.equal(b.parola, "abc d");
  const c = ctx.f("#ecran=t212&poz=AVGO_US_EQ"); assert.equal(c.ecran, "t212"); assert.equal(c.poz, "AVGO_US_EQ");
  assert.equal(ctx.f("#ecran=altceva").ecran, null); assert.equal(ctx.f("").ecran, null);
  assert.equal(ctx.f("#ecran=tabloubot&moneda=LIT").moneda, null, "moneda doar pentru gridset");
});

const T0 = Date.UTC(2026, 5, 1), H = 3600000;
const tr = (m, rez) => rez.map((r, i) => ({ id: m + i, moneda: m, pornit: T0 + i * 5 * H, inchis: T0 + i * 5 * H + 2 * H, durataOre: 2, rezultat: r, comisioane: -0.5, funding: 0, greseli: [] }));
await test("alerta de pornire are linkul spre poarta, cu TICKERUL (LIGHTER -> LIT din simbolPionex); adresa se cere doar cand e o alerta", async () => {
  const acum = T0 + 1000 * H, trades = tr("LIGHTER", [5.5, -20, -30, 2.5, -8]);
  let adrese = 0;
  const boti = [{ id: "1", baza: "LIGHTER.PERP", simbolPionex: "LIT_USDT_PERP", activ: true, pornitLa: acum - 60000 }];
  const r = await avertizariPornire({ boti, cunoscuti: {}, acum, trades: async () => trades, Obiceiuri: OB, adresa: async () => { adrese++; return "https://mau.tail9144fe.ts.net:8443"; } });
  assert.equal(r.length, 1); assert.match(r[0].mesaj, /Poarta pe LIT: https:\/\/mau\.tail9144fe\.ts\.net:8443\/#ecran=gridset&moneda=LIT/);
  assert.equal(adrese, 1);
  // fara adresa (Radarul nu raspunde) -> alerta fara link; fara simbolPionex -> tickerul din numele botului
  const r2 = await avertizariPornire({ boti, cunoscuti: {}, acum, trades: async () => trades, Obiceiuri: OB, adresa: async () => null });
  assert.doesNotMatch(r2[0].mesaj, /#ecran=/);
  const r3 = await avertizariPornire({ boti: [{ id: "2", baza: "LIGHTER.PERP", activ: true, pornitLa: acum - 60000 }], cunoscuti: {}, acum, trades: async () => trades, Obiceiuri: OB, adresa: async () => "https://x.test" });
  assert.match(r3[0].mesaj, /moneda=LIGHTER/);
  // moneda buna -> nicio alerta, adresa nici nu se cere
  let a4 = 0; await avertizariPornire({ boti: [{ id: "3", baza: "ONG.PERP", activ: true, pornitLa: acum - 60000 }], cunoscuti: {}, acum, trades: async () => tr("ONG", [5, 5, 5]), Obiceiuri: OB, adresa: async () => { a4++; return "x"; } });
  assert.equal(a4, 0);
});

await test("pagina: la deschiderea din link, fereastra Grid pe moneda ceruta, calculeaza fisa si ruleaza poarta singura", () => {
  const f = functia(app, "grDinLegatura");
  assert.match(f, /grMoneda/); assert.match(f, /gridCalculeaza\(true\)/); assert.match(f, /gridPoarta\(\)/);
  assert.match(app, /if\(ecranDinLegatura==="gridset"&&monedaDinLegatura\)/);
});
await test("colectorul da adresa Radarului alertei de pornire; versiunea v101.18", () => {
  const c = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.match(c, /avertizariPornire\(\{[^)]*adresa: adresaRadarului/);
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.(1[8-9]|[2-9]\d)";/, "cel putin v101.18");
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
