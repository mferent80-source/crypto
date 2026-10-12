// Probele v100.173 (12.10.2026, el: „repară și fă audit pe tot”) — reparațiile din auditul Opus pe server, colector și interfață.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.173 · reparațiile din auditul Opus · proba\n");
const fetchOrig = globalThis.fetch;

// ── colector: botul „dispărut” și arhiva incompletă ──
const PB = await import("./lib/paza-boti.mjs");
await test("bot lipsă din listă: alerta abia la a 3-a tură la rând; găsit printre cei închiși ⇒ imediat; reapărut ⇒ contorul de la zero", () => {
  const c = { activ: true };
  assert.equal(PB.lipsaConfirmata(c, { prezent: false }), false); assert.equal(PB.lipsaConfirmata(c, { prezent: false }), false);
  PB.lipsaConfirmata(c, { prezent: true }); assert.equal(c.lipsa, undefined);
  assert.equal(PB.lipsaConfirmata(c, { prezent: false }), false); assert.equal(PB.lipsaConfirmata(c, { prezent: false }), false); assert.equal(PB.lipsaConfirmata(c, { prezent: false }), true);
  assert.equal(PB.lipsaConfirmata({ activ: true }, { prezent: false, gasitInchis: true }), true);
});
const col = citeste("scripts", "colector.mjs");
await test("colectorul folosește lipsaConfirmata înainte de „lipsește din Pionex”; raportul, frâna și socoteala cer arhiva completă", () => {
  assert.match(col, /if \(!lipsaConfirmata\(m\.cunoscuti\[id\], \{ prezent: false, gasitInchis: !!fisa \}\)\) continue;/);
  assert.match(col, /lista\.complet = arhivaOk;/);
  assert.equal((col.match(/if \(!toti\.complet\)/g) || []).length, 3, "raport + socoteală + frână");
  assert.match(col, /if \(!Object\.keys\(m\)\.length\) throw new Error\("lista goală/);
});

// ── market.js: refuzul Pionex (HTTP 200, result:false) nu se ține minte ──
await test("market: Pionex răspunde 200 cu result:false ⇒ nu intră în cache (cererea următoare ajunge iar la Pionex)", async () => {
  const pus = [];
  globalThis.caches = { default: { match: async () => null, put: async (k) => { pus.push(String(k.url)); } } };
  let n = 0;
  globalThis.fetch = async () => { n++; return new Response(JSON.stringify(n === 1 ? { result: false, code: "TRADE_PARAMETER_ERROR" } : { result: true, data: { symbols: [{ symbol: "BTC_USDT_PERP", baseCurrency: "BTC" }] } }), { status: 200 }); };
  const m = await import(`../functions/api/market.js?t=${Math.random()}`);
  const cere = () => m.onRequestGet({ request: new Request("http://127.0.0.1:8788/api/market?type=pionex_symbols&market=PERP", { headers: { authorization: "Bearer proba-token-1234567890", "cf-connecting-ip": "10.173.0.3" } }), env: { APP_API_TOKEN: "proba-token-1234567890" } });
  await cere(); assert.equal(pus.length, 0, "refuzul s-a pus în cache");
  await cere(); assert.equal(pus.length, 1, "răspunsul bun intră în cache");
  delete globalThis.caches;
});

// ── t212.js / stiri.js / rezultate: timeouts și eșecuri care nu se țin minte ──
const t212 = citeste("functions", "api", "t212.js"), stiri = citeste("functions", "api", "stiri.js");
await test("t212.js: toate cererile externe au timeout (o cerere agățată bloca pozițiile până la repornire)", () => {
  const l = t212.split("\n").filter((x) => /await fetch\(/.test(x));
  assert.ok(l.length >= 5); for (const x of l) assert.match(x, /AbortSignal\.timeout\(/, x.slice(0, 120));
});
await test("stiri.js: toate cererile externe au timeout", () => {
  const l = stiri.split("\n").filter((x) => /fetch\(/.test(x) && !/^\s*\/\//.test(x));
  assert.ok(l.length >= 4); for (const x of l) assert.match(x, /AbortSignal\.timeout\(/, x.slice(0, 120));
});
await test("stiri piata: Yahoo nu dă nimic (qqq, spy, vix lipsă) ⇒ nu se ține minte 30 de minute", async () => {
  const m = await import(`../functions/api/stiri.js?t=${Math.random()}`);
  const ENV = { APP_API_TOKEN: "proba-token-1234567890" }, H = { authorization: "Bearer proba-token-1234567890", "cf-connecting-ip": "10.173.0.1" };
  let bun = false;
  globalThis.fetch = async (u) => {
    u = String(u);
    if (u.includes("alternative.me")) return new Response(JSON.stringify({ data: [{ value: "50", value_classification: "Neutral" }] }), { status: 200 });
    if (!bun) return new Response("x", { status: 500 });
    return new Response(JSON.stringify({ chart: { result: [{ timestamp: [1790000000], indicators: { quote: [{ close: [10], open: [10], high: [10], low: [10], volume: [1] }] } }] } }), { status: 200 });
  };
  const cere = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/stiri?action=piata", { headers: H }), env: ENV })).text());
  const a = await cere(); assert.equal(a.qqq, null); assert.match(a.eroare || "", /Yahoo/);
  bun = true; const b = await cere(); assert.ok(b.qqq, "eșecul s-a ținut minte");
});
await test("t212 rezultate: Nasdaq dă o pagină care nu e JSON ⇒ eroare, nu „fără dată” ținut 12 ore", async () => {
  const m = await import(`../functions/api/t212.js?t=${Math.random()}`);
  const ENV = { APP_API_TOKEN: "proba-token-1234567890", T212_API_KEY: "k", T212_API_SECRET: "s" }, H = { authorization: "Bearer proba-token-1234567890", "cf-connecting-ip": "10.173.0.2" };
  let bun = false;
  globalThis.fetch = async () => (bun ? new Response(JSON.stringify({ data: { reportText: "Apple is expected to report on 10/30/2026" } }), { status: 200 }) : new Response("<html>verificare</html>", { status: 200 }));
  const cere = async () => { const r = await m.onRequestGet({ request: new Request("https://exemplu.test/api/t212?action=rezultate&ticker=AAPL_US_EQ", { headers: H }), env: ENV }); return { s: r.status, j: JSON.parse(await r.text()) }; };
  const a = await cere(); assert.ok(a.s >= 500 || a.j.error, "pagina ne-JSON trebuia să fie eroare: " + JSON.stringify(a));
  bun = true; const b = await cere(); assert.equal(b.s, 200); assert.ok(b.j.data, "eșecul s-a ținut minte: " + JSON.stringify(b.j));
});

// ── copia de siguranță: atomică ──
const { faCopie } = await import("./lib/copie.mjs");
await test("copia de siguranță se face în .tmp și se redenumește; o copie ciuntită rămasă (.tmp) nu blochează copia zilei", () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "copie173-")), src = path.join(t, "src"), dst = path.join(t, "dst");
  fs.mkdirSync(src); fs.writeFileSync(path.join(src, "a.sqlite"), "x");
  fs.mkdirSync(path.join(dst, "kv-2026-10-12.tmp"), { recursive: true });
  const r = faCopie({ sursa: src, dest: dst, zi: "2026-10-12" });
  assert.equal(r.facut, true); assert.ok(fs.existsSync(path.join(dst, "kv-2026-10-12", "a.sqlite"))); assert.ok(!fs.existsSync(path.join(dst, "kv-2026-10-12.tmp")));
  fs.rmSync(t, { recursive: true, force: true });
});

// ── interfața: banii și statistica ──
import vm from "node:vm";
const ctxUi = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, localStorage: { getItem: () => null, setItem() {} } };
ctxUi.window = ctxUi; ctxUi.globalThis = ctxUi; vm.createContext(ctxUi);
for (const f of ["grid-calcul.js", "probabilitati.js", "risc-luna.js", "scan.js", "grid-jurnal.js", "asemanatoare.js"]) vm.runInContext(citeste("public", "lib", f), ctxUi);
const RL = ctxUi.RiscLuna, SC = ctxUi.Scan, GJ = ctxUi.GridJurnal, AS = ctxUi.Asemanatoare;
await test("risc: rezultatul unui bot = (realizat + comisioane + funding) / suma pusă reală (cu marja adăugată), ca în JurnalTrade", () => {
  const b = { buOrderType: "futures_grid", createTime: 1, closeTime: 2, base: "X.PERP", buOrderData: { usdtInvestment: "100", quoteInvestment: "100", extraMargin: "50", totalRealizedProfit: "10", totalFee: "-3", totalFundingFee: "-1", leverage: "3", trend: "long" } };
  const l = RL.bazinBoti([b]);
  assert.equal(l.length, 1); assert.ok(Math.abs(l[0].r - 6 / 150) < 1e-12, "r=" + l[0].r); assert.equal(l[0].inv, 150);
});
await test("Scan: „mărime la 1% risc” are plafonul de 20% din cont (ca Poarta); ATR mic nu mai dă tot contul", () => {
  const p = SC.plan({ atrPct: 0.8, p: 100 }, 30000);
  assert.equal(p.marime, 6000); assert.equal(p.plafonat, true);
  const q = SC.plan({ atrPct: 5, p: 100 }, 30000); assert.equal(q.marime, 3000); assert.ok(!q.plafonat);
});
// generator determinist (mulberry32) pentru seturile fără efect
const gen = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const norm = (r) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
await test("Grid jurnal ÎNGUST vs LARG: pe 200 de seturi FĂRĂ efect, „dovedit / pe dos” în cel mult 3% (era ~15% cu IC 90%)", () => {
  let fals = 0, judecate = 0;
  for (let k = 0; k < 200; k++) {
    const r = gen(1000 + k), l = [];
    for (let m = 0; m < 8; m++) { const ef = 0; for (let j = 0; j < 5; j++) l.push({ botId: "b" + m + "_" + j, activ: false, simbol: "C" + m + "_USDT_PERP", investit: 100, rezultat: 100 * (ef + norm(r) * 0.04 * (1 + 3 * r())), fereastra: r() < 0.5 ? "ingust" : "larg" }); }
    const v = GJ.bilantFerestre(l).verdict; if (v !== "puține") judecate++; if (v === "dovedit" || v === "pe dos") fals++;
  }
  assert.ok(judecate > 100, "prea puține seturi judecate: " + judecate); assert.ok(fals / 200 <= 0.03, "dovedit fals " + fals + "/200");
});
const caz = (r, m, k, extra) => Object.assign({ moneda: "C" + m, pct: 0, t: k, dir: "long" }, extra);
await test("Becurile la pornire (cu botul / împotrivă): pe 200 de seturi FĂRĂ efect, „dovedit / pe dos” în cel mult 3% (era ~7%)", () => {
  let fals = 0;
  for (let k = 0; k < 200; k++) {
    const r = gen(5000 + k), l = [], lit = ["u", "c", "n"];
    for (let m = 0; m < 15; m++) { const ef = norm(r) * 0.05; for (let j = 0; j < 14; j++) l.push(caz(r, m, m * 100 + j, { tf: "x" + lit[Math.floor(r() * 3)] + lit[Math.floor(r() * 3)], pct: ef + norm(r) * 0.05 })); }
    const v = AS.bilantSemafor(l, { rep: 400 }).verdict; if (v === "dovedit" || v === "pe dos") fals++;
  }
  assert.ok(fals / 200 <= 0.03, "dovedit fals " + fals + "/200");
});
await test("ADX la pornire: pe 200 de seturi FĂRĂ efect, „dovedit / pe dos” în cel mult 3%", () => {
  let fals = 0;
  for (let k = 0; k < 200; k++) {
    const r = gen(9000 + k), l = [];
    for (let m = 0; m < 15; m++) { const ef = norm(r) * 0.05; for (let j = 0; j < 14; j++) l.push(caz(r, m, m * 100 + j, { adx: 5 + r() * 45, pct: ef + norm(r) * 0.05 })); }
    const v = AS.bilantAdx(l, { rep: 400 }).verdict; if (v === "dovedit" || v === "pe dos") fals++;
  }
  assert.ok(fals / 200 <= 0.03, "dovedit fals " + fals + "/200");
});

await test("pagina de risc spune că ~12 obiceiuri testate deodată pot da un „dovedit” din întâmplare, și că rezultatul e după comisioane", () => {
  const re = citeste("public", "lib", "risc-ecran.js");
  assert.match(re, /Se testează ~12 obiceiuri deodată/); assert.match(re, /după comisioane și funding, împărțit la suma pusă cu tot cu marja adăugată/);
});

globalThis.fetch = fetchOrig;
console.log(`\n${teste - picate}/${teste} probe trecute`);
if (picate) process.exit(1);
