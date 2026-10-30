// Proba v100.255 (23.10, el: „fa idei”): frica crypto în afara 0–100 nu intră în scor;
// sub prețul 10 bucățile ies întregi pe poziție, pe trade-ul închis și pe Salt.
// Pragurile rămân. Colectorul pe disc rămâne v101.137. Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.escapeHtml = (s) => String(s == null ? "" : s);
ctx.localStorage = { getItem() { return null; }, setItem() {} };
ctx.ActiuniSemnale = { usd(v) { return v == null || !isFinite(Number(v)) ? "—" : "$" + Number(v); }, monedaTicker() { return "USD"; }, pretIn(v) { return ctx.ActiuniSemnale.usd(v); }, greseli()   /* v100.272: t212-ecran ia moneda poziției din monedaTicker / pretIn */ { return []; }, rezumatJurnal() { return { total: 0, n: 1, pePlus: 0, totalOficial: 0, comisioane: 0, ext: { total: 0, n: 0 }, greseli: [] }; } };
ctx.T212 = { simbol(t) { return String(t || "").replace(/_US_EQ$/, ""); }, perechi() { return { inchise: [] }; } };
ctx.$ = () => null;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
vm.runInContext(citeste("public", "lib", "salt-ecran.js"), ctx);
vm.runInContext(citeste("public", "lib", "t212-ecran.js"), ctx);
const MC = ctx.Macro;

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.255 · SCALĂ · proba\n");

const ZI = 86400000, N = 60, T0 = Date.UTC(2026, 7, 1);
const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, open: f(i), high: f(i), low: f(i), close: f(i) }));
const r = (i) => 0.01 * Math.sin(i * 1.7);
const cum = (k) => { const a = [100]; for (let i = 1; i < N; i++) a.push(a[i - 1] * (1 + k * r(i))); return a; };
const SPY = cum(1), BTC = cum(2);
function date(o) {
  o = o || {};
  return {
    vix: zil(() => 14.8),
    tnx: zil((i) => (i < N - 22 ? 4.94 : i === N - 1 ? 5.24 : 4.94)),
    dxy: zil((i) => (i < N - 1 ? 100 : 103.1)),
    spy: zil((i) => SPY[i]),
    btc: BTC.map((c, i) => ({ time: String(T0 + i * ZI), close: String(c) })),
    fg: o.faraFg ? null : { valoare: o.fg ?? 69 },
  };
}
const ACUM = T0 + N * ZI;
const frica = (o) => MC.scor(date(o), ACUM).semne[4];

await test("frica în afara 0–100 nu adună scor și nu se numără; lipsa rămâne „lipsește”", () => {
  const peste = frica({ fg: 101 }), sub = frica({ fg: -1 }), gol = frica({ faraFg: true });
  const sPeste = MC.scor(date({ fg: 101 }), ACUM), sIn = MC.scor(date({ fg: 69 }), ACUM);
  assert.equal(peste.ok, false); assert.equal(peste.scor, 0); assert.equal(peste.valoare, "101"); assert.equal(peste.text, "în afara 0–100");
  assert.equal(sub.ok, false); assert.equal(sub.scor, 0); assert.equal(sub.valoare, "-1"); assert.equal(sub.text, "în afara 0–100");
  assert.doesNotMatch(peste.text + sub.text, /lipsește/);
  assert.equal(sPeste.valide, 4); assert.equal(sPeste.partial, false); assert.equal(sPeste.scor, sIn.scor - 1);
  assert.equal(gol.ok, false); assert.equal(gol.scor, 0); assert.equal(gol.valoare, "—"); assert.equal(gol.text, "lipsește");
});

await test("0, 20, 50, 69, 75 și 100 rămân pe benzile vechi", () => {
  const band = (fg) => { const x = frica({ fg }); return [x.ok, x.scor, x.text, x.valoare]; };
  assert.deepEqual(band(0), [true, -2, "frică", "0"]);
  assert.deepEqual(band(20), [true, -2, "frică", "20"]);
  assert.deepEqual(band(50), [true, 0, "neutru", "50"]);
  assert.deepEqual(band(69), [true, 1, "spre lăcomie", "69"]);
  assert.deepEqual(band(75), [true, 2, "lăcomie", "75"]);
  assert.deepEqual(band(100), [true, 2, "lăcomie", "100"]);
});

await test("sub prețul 10, poziția și trade-ul închis scriu 144 buc, nu 144,118", () => {
  const box = { hidden: false, innerHTML: "" };
  ctx.$ = (id) => (id === "jtActiuni" ? box : null);
  ctx.t212Cireasa = () => "";
  ctx.t212StopBloc = () => "";
  ctx.t212ReguliBloc = () => "";
  ctx.t212DeclaratieBloc = () => "";
  ctx.t212SfatStop = () => ({ fac: "N-aș schimba stopul din durata.", nota: "" });
  const penny = {
    sem: { nivel: "tine", motive: [] }, niv: null, ticker: "PENNY_US_EQ", plan: null,
    pret: 4.2, pretMediu: 3.8, st: { trend: { dir: "sus", tarie: "tare" }, distMax52: null },
    qty: 144.118, simbol: "PENNY", ppl: 10, pctLei: 0.01, pond: 0.05, maxDupaCumparare: null,
  };
  const h = ctx.t212RandPozitie(penny);
  assert.match(h, /144 buc · mediu/);
  assert.doesNotMatch(h, /144,118/);
  const scump = ctx.t212RandPozitie(Object.assign({}, penny, { pret: 111.99, pretMediu: 100, qty: 3.6238, simbol: "INTC", ticker: "INTC_US_EQ" }));
  assert.match(scump, /3,624 buc · mediu/);
  const t = { id: "1", ticker: "PENNY_US_EQ", qty: 144.118, pretCumparare: 4.2, pretVanzare: 5, rezultat: -10, rezultatOficial: -9, comisioane: 1, durataOre: 5, pornit: T0, inchis: T0 + ZI, pct: -0.02 };
  ctx.t212.istoric = { umpleri: [{}], stare: { complet: true, ordine: 1 } };
  ctx.t212.cf = {};
  ctx.T212.perechi = () => ({ inchise: [t] });
  ctx.jtFiltru = "actiuni";
  ctx.t212JurnalCache = { n: -1, v: null };
  ctx.jtRenderActiuni();
  assert.match(box.innerHTML, /144 buc · /);
  assert.doesNotMatch(box.innerHTML, /144,118/);
  const t2 = Object.assign({}, t, { qty: 3.6238, pretCumparare: 111.99, pretVanzare: 120, ticker: "INTC_US_EQ" });
  ctx.T212.perechi = () => ({ inchise: [t2] });
  ctx.t212JurnalCache = { n: -1, v: null };
  ctx.jtRenderActiuni();
  assert.match(box.innerHTML, /3,624 buc · /);
});

await test("Salt: sub 10 bucăți întregi pe rând, în detaliu și pe bilet; de la 10 rămân 3 zecimale; GBp 250 nu se rotunjește la întreg", () => {
  const p = { isin: "X", simbol: "PENNY", nume: "Penny Co", qty: 144.118, pretMediu: 3.8, de: "2026-05-11", plata: "EUR" };
  const h = ctx.saltPozRandHtml({ a: null, p, m: "EUR", pret: 4.2 }, { deschis: {}, incarcate: true });
  assert.match(h, /144 buc · mediu/);
  assert.doesNotMatch(h, /144,118/);
  const a = { p: { pret: 111.99, pretMediu: 100 }, st: { trend: { dir: "sus" } }, niv: { stopPozitie: 90, tintaPozitie: 130 }, cons: { nivel: "tine", eticheta: "ȚINE", titlu: "ține", faCe: "" }, beta: 1 };
  const det = ctx.saltPozRandHtml({ a, p: Object.assign({}, p, { qty: 3.6238, pretMediu: 100 }), m: "USD", pret: 111.99, fx: 1.1, rez: 1, pct: 0.01, cost: 10, val: 11, pond: 0.1 }, { deschis: { X: true }, incarcate: true });
  assert.match(det, /3,624 buc · mediu/);
  assert.match(det, /3,624 buc · plătit/);
  const b = ctx.saltBiletHtml({ simbol: "PENNY", moneda: "USD", intrare: 5, stop: 4, tinta: 7 }, 144.118, 1);
  assert.match(b, /144 buc ≈ /);
  assert.doesNotMatch(b, /144,118/);
  const sus = ctx.saltBiletHtml({ simbol: "INTC", moneda: "USD", intrare: 111.99, stop: 100, tinta: 130 }, 3.6238 * 11.99, 1);
  assert.match(sus, /3,624 buc ≈ /);
  const gbp = ctx.saltPozRandHtml({ a: null, p: Object.assign({}, p, { qty: 1.5, pretMediu: 250, simbol: "ULVR.L" }), m: "GBp", pret: 250 }, { deschis: {}, incarcate: true });
  assert.match(gbp, /1,5 buc · mediu/);
  assert.doesNotMatch(gbp, /2 buc · mediu/);
});

await test("probele v100239–v100252 nu mai cer colectorul exact v101.136; fișierul rămâne v101.137", () => {
  const nume = ["proba-v100239.mjs", "proba-v100240.mjs", "proba-v100241.mjs", "proba-v100242.mjs", "proba-v100243.mjs", "proba-v100244.mjs", "proba-v100245.mjs", "proba-v100246.mjs", "proba-v100247.mjs", "proba-v100248.mjs", "proba-v100249.mjs", "proba-v100250.mjs", "proba-v100251.mjs", "proba-v100252.mjs"];
  for (const f of nume) {
    const s = citeste("scripts", f);
    assert.doesNotMatch(s, /VERSIUNE_COLECTOR = "v101\\.136"/, f);
    assert.match(s, /Number\((?:mv\[1\]|mv|mvCol\[1\])\) >= 136/, f);
  }
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [0, 0])[1]) >= 137);
});

await test("versiunea e cel puțin v100.255, lanțul are proba o singură dată", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.ok(Number(P.version.split(".")[1]) >= 255, P.version);
  assert.equal(P.scripts["test:v100255"], "node scripts/proba-v100255.mjs");
  assert.equal((P.scripts.test.match(/test:v100255/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100254/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100255"], /npm run test:v100255/);
  assert.doesNotMatch(P.scripts["test:v100255"], /test:v100254/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(Number(String(info.version).replace(/^v/, "").split(".")[1]) >= 255, info.version);
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.scala255, /în afara 0–100/);
  assert.match(info.features.poarta254, /v101\.137/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
