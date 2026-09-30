// Proba v100.29 (30.09, el: „fa idei” - ideea 3 din trei): avertisment la PORNIRE pe o moneda unde pierzi (pe toata istoria).
// Simetric (regula lui): spune si unde castigi; avertizeaza - nu refuza (pragul e un privilegiu) - doar de la 3 boti cu net pe minus.
// + sfatul „închiderile din prima oră” (pe istoria lui: 1469 de boti, net −2.065 USDT) si alerta colectorului cand porneste
// din Pionex un bot nou pe o asemenea moneda.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT);
const { avertizariPornire } = await import("./lib/tura-pornire.mjs");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.29 · avertisment la pornire pe monedele unde pierzi · proba\n");
const T0 = Date.UTC(2026, 5, 1), H = 3600000;
// trade-uri de jurnal INVENTATE (forma JurnalTrade.din)
const tr = (m, rez, o) => rez.map((r, i) => Object.assign({ id: m + i, moneda: m, pornit: T0 + i * 5 * H, inchis: T0 + i * 5 * H + 2 * H, durataOre: 2, rezultat: r, comisioane: -0.5, funding: 0, greseli: [] }, o ? o(i) : {}));

await test("istoricMoneda: pierzi -> avertizare, cu cifrele (boti, pe plus, net, cel mai rau)", () => {
  const r = OB.istoricMoneda(tr("KAITO", [10.5, -300, -600]), "KAITO");
  assert.equal(r.n, 3); assert.equal(r.plus, 1); assert.ok(Math.abs(r.net - (10 - 300.5 - 600.5)) < 1e-9); assert.equal(r.avertizare, true);
  assert.match(r.text, /Pe KAITO pierzi/); assert.match(r.text, /3 boți/); assert.match(r.text, /−891,00 USDT|−891\.00 USDT/); assert.match(r.text, /cel mai rău −600/);
});
await test("istoricMoneda: castigi des dar pierderile mari mananca tot -> avertizare cu nuanta", () => {
  const r = OB.istoricMoneda(tr("RIVER", [2.5, 2.5, 2.5, -40]), "RIVER");
  assert.equal(r.avertizare, true); assert.match(r.text, /câștigi des \(75%\), dar pierderile mari mănâncă tot/);
});
await test("istoricMoneda: simetric - unde castigi o spune (fara avertizare); sub 3 boti nu trage concluzii; niciunul -> spune", () => {
  const b = OB.istoricMoneda(tr("ONG", [5.5, 5.5, -2, 5.5]), "ONG");
  assert.equal(b.avertizare, false); assert.match(b.text, /Pe ONG: 4 boți, 3 pe plus \(75%\), net \+/);
  const p = OB.istoricMoneda(tr("ABC", [-50, -50]), "ABC");
  assert.equal(p.avertizare, false); assert.match(p.text, /Prea puțini/);
  assert.match(OB.istoricMoneda([], "XYZ").text, /N-ai mai avut boți închiși pe XYZ/);
});
await test("subOOra: inchiderile din prima ora - de la 10, doar cand pierd; cu comisioanele lor", () => {
  const scurti = tr("A", Array(12).fill(-1), () => ({ durataOre: 0.5 })), lungi = tr("B", Array(5).fill(3), () => ({ durataOre: 5 }));
  const s = OB.subOOra(scurti.concat(lungi));
  assert.equal(s.n, 12); assert.ok(Math.abs(s.net - (-18)) < 1e-9); assert.ok(Math.abs(s.comisioane - (-6)) < 1e-9);
  assert.match(s.text, /Boții închiși în prima oră: 12/); assert.match(s.text, /comisioane −6,00 USDT|comisioane −6\.00 USDT/);
  assert.equal(OB.subOOra(scurti.slice(0, 9)), null, "sub 10: nimic");
  assert.equal(OB.subOOra(tr("A", Array(12).fill(3), () => ({ durataOre: 0.5 }))), null, "pe plus: nimic");
});
await test("poarta: regula „moneda” din istoric (✗ unde pierzi, ✓ unde castigi) + sfatul primei ore; poarta nu refuza, doar spune", () => {
  const trades = tr("KAITO", [10.5, -300, -600]).concat(tr("A", Array(12).fill(-1), () => ({ durataOre: 0.5 })));
  const f = { simbol: "KAITO_USDT_PERP", verdict: { nivel: "porneste" }, setare: { levierSigur: 5 } };
  const r = OB.poarta({ fisa: f, trades, acum: T0 + 400 * H, dir: "long", levier: 3, plan: { plus: 5, minus: 10 } });
  const m = r.reguli.find((x) => x.cod === "moneda");
  assert.ok(m, "regula moneda"); assert.equal(m.ok, false); assert.match(m.text, /Pe KAITO pierzi/);
  assert.equal(r.trecut, false);
  assert.ok(Array.isArray(r.sfaturi) && r.sfaturi.some((x) => /prima oră/.test(x)));
  const r2 = OB.poarta({ fisa: Object.assign({}, f, { simbol: "ONG_USDT_PERP" }), trades: tr("ONG", [5.5, 5.5, -2, 5.5]), acum: T0 + 400 * H, dir: "long", levier: 3, plan: { plus: 5 } });
  assert.equal(r2.reguli.find((x) => x.cod === "moneda").ok, true);
});

// ---- colectorul: bot nou pornit din Pionex ----
const botViu = (id, baza, pornitLa) => ({ id, baza, activ: true, pornitLa });
const arhiva = { boti: [] };
await test("colectorul: bot NOU pe o moneda unde pierzi -> o alerta (atentie) cu istoricul si sfatul primei ore; bot vechi sau moneda buna -> nimic", async () => {
  const trades = tr("KAITO", [10.5, -300, -600]).concat(tr("ONG", [5.5, 5.5, -2, 5.5])).concat(tr("A", Array(12).fill(-1), () => ({ durataOre: 0.5 })));
  const acum = T0 + 1000 * H;
  const boti = [botViu("1", "KAITO.PERP", acum - 5 * 60000), botViu("2", "ONG.PERP", acum - 5 * 60000), botViu("3", "KAITO.PERP", acum - 5 * 3600000), botViu("4", "MET.PERP", acum - 60000)];
  let cereri = 0;
  const r = await avertizariPornire({ boti, cunoscuti: { 4: { activ: true } }, acum, trades: async () => { cereri++; return trades; }, Obiceiuri: OB });
  assert.equal(r.length, 1, JSON.stringify(r)); assert.equal(r[0].bot, "1"); assert.equal(r[0].nivel, "atentie");
  assert.match(r[0].titlu, /KAITO/); assert.match(r[0].mesaj, /Pe KAITO pierzi/); assert.match(r[0].mesaj, /prima oră/);
  assert.equal(cereri, 1, "istoria se cere o singura data pe tura");
  // niciun bot nou -> istoria nici nu se cere
  let c2 = 0; await avertizariPornire({ boti: [botViu("4", "MET.PERP", acum)], cunoscuti: { 4: { activ: true } }, acum, trades: async () => { c2++; return []; }, Obiceiuri: OB });
  assert.equal(c2, 0);
});
await test("colectorul: tura legata in bucla principala, inainte ca botii sa fie trecuti la „cunoscuti”; versiunea v101.16", () => {
  const c = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.match(c, /import \{ avertizariPornire \} from "\.\/lib\/tura-pornire\.mjs";/);
  const i = c.indexOf("avertizariPornire({"), j = c.indexOf("for (const b of boti) if (b && b.id) m.cunoscuti[b.id] =");
  assert.ok(i > 0 && j > 0 && i < j, "avertizarea vede lista de cunoscuti de DINAINTE");
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.16";/);
});
await test("pagina: poarta arata sfaturile (sub reguli)", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const i = app.indexOf("function grPoartaHtml("), corp = app.slice(i, app.indexOf("\nfunction ", i + 10));
  assert.match(corp, /p\.rez\.sfaturi/);
  // si chiar il deseneaza (nu doar il pomeneste)
  const ctx = { $: () => null, grPlanDinScan: () => null, escapeHtml: (s) => String(s), grPoartaRez: { simbol: "KAITO_USDT_PERP", rez: { reguli: [{ cod: "moneda", ok: false, text: "Pe KAITO pierzi" }], trecut: false, sfaturi: ["Boții închiși în prima oră: 12"] } } };
  vm.createContext(ctx); vm.runInContext(corp + ";this.f=grPoartaHtml;", ctx);
  const h = ctx.f({ simbol: "KAITO_USDT_PERP" });
  assert.match(h, /💡 Boții închiși în prima oră: 12/); assert.match(h, /✗ Pe KAITO pierzi/);
  // cand pica DOAR istoricul monedei (fisa, planul, levierul in regula): nu „aș aștepta”, ci suma mai mica si stopul la plan
  assert.match(h, /sumă mai mică/); assert.doesNotMatch(h, /aș aștepta/);
  ctx.grPoartaRez.rez.reguli.push({ cod: "verde", ok: false, text: "Fișa zice 🔴 NU PORNI" });
  assert.match(ctx.f({ simbol: "KAITO_USDT_PERP" }), /aș aștepta/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
