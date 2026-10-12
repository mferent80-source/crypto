// Proba rotației sectoarelor US în Radar (v100.167, 12.10.2026, direcția lui „o aplicație și atât”, pasul 4.4):
// pagina sector-rotation din premarket_scanner se mută în Radar ca BLOC în pagina Acțiuni (el: „Bloc în pagina Acțiuni”),
// + un rând în „Ce spune piața acum” + alertă pe Discord DOAR la schimbarea regimului (el: „Doar când se schimbă regimul”).
// Logica = pagina veche: Δ pe 1/5/21/63 de ședințe, RS-Ratio pe 21 + momentum pe 5 (RRG), regim = media ciclicelor − media
// defensivelor pe o săptămână, prag ±0,6 pp, XLRE în afara regimului; bara de azi intră doar după închiderea bursei.
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
console.log("\nRotația sectoarelor US în Radar · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "sectoare.js"), ctx);
const SC = ctx.Sectoare;

// ── date sintetice: 130 de zile, bara la 09:30 New York; ultima = luni 07.09.2026 ──
const ZI = 86400000, N = 130, L = N - 1, T0 = Date.UTC(2026, 4, 1, 13, 30);
const INCHIS = Date.UTC(2026, 8, 7, 21, 0), DESCHIS = Date.UTC(2026, 8, 7, 15, 0);   // 17:00 / 11:00 New York
const serie = (f) => Array.from({ length: N }, (_, i) => ({ t: T0 + i * ZI, c: f(i) }));
const plus = (p) => (i) => (i <= L - 5 ? 100 : 100 * (1 + (p / 100) * (i - (L - 5)) / 5));
const revine = (i) => (i < L - 30 ? 100 : i <= L - 5 ? 100 - (10 * (i - (L - 30))) / 25 : 90 + (1.5 * (i - (L - 5))) / 5);
function serii(fara) {
  const o = { SPY: serie(() => 100) };
  for (const s of ["XLY", "XLC", "XLF", "XLI", "XLE"]) o[s] = serie(plus(1));
  o.XLK = serie(plus(-1)); o.XLB = serie(revine); o.XLRE = serie(plus(10));
  for (const s of ["XLV", "XLP", "XLU"]) o[s] = serie(plus(3));
  for (const s of fara || []) delete o[s];
  return o;
}
const J = (x) => JSON.parse(JSON.stringify(x));

await test("LISTA: cele 11 sectoare S&P, în română, cu grupa (7 ciclice, 3 defensive, XLRE separat)", () => {
  assert.equal(SC.LISTA.length, 11);
  assert.deepEqual(J(SC.LISTA.map((x) => x.s)), ["XLK", "XLY", "XLC", "XLF", "XLI", "XLB", "XLE", "XLRE", "XLV", "XLP", "XLU"]);
  assert.equal(SC.LISTA.filter((x) => x.g === "ciclic").length, 7); assert.equal(SC.LISTA.filter((x) => x.g === "defensiv").length, 3);
  assert.equal(SC.LISTA.find((x) => x.s === "XLU").n, "Utilități"); assert.equal(SC.LISTA.find((x) => x.s === "XLRE").g, "dobanzi");
});
await test("calculeaza: Δ pe 1 / 5 / 21 / 63 de ședințe, din închideri", () => {
  const d = SC.calculeaza(serii(), INCHIS), u = d.randuri.find((r) => r.s === "XLU");
  assert.ok(Math.abs(u.s1 - 3) < 1e-9, "1 săpt."); assert.ok(Math.abs(u.z1 - (103 / 102.4 - 1) * 100) < 1e-9, "1 zi"); assert.ok(Math.abs(u.l1 - 3) < 1e-9); assert.ok(Math.abs(u.l3 - 3) < 1e-9);
  assert.equal(d.zi, "luni, 07.09");
});
await test("cadranele față de S&P (RRG 21/5): urcă ⇒ Conduce, coboară ⇒ În urmă, a căzut și își revine ⇒ Revine", () => {
  const d = SC.calculeaza(serii(), INCHIS), c = (s) => d.randuri.find((r) => r.s === s).cadran.text;
  assert.equal(c("XLU"), "Conduce"); assert.equal(c("XLK"), "În urmă"); assert.equal(c("XLB"), "Revine");
  assert.equal(d.randuri.find((r) => r.s === "XLU").coada.length, 4, "drumul pe 4 săptămâni");
});
// v100.172 (revizia Opus): forța față de S&P se socotește pe ZILE comune, nu pe poziție — o zi lipsă la un ETF strica toată fereastra
await test("v100.172 forța față de S&P aliniată pe dată: o zi lipsă la un sector (raport sector/SPY constant) ⇒ tot 0 / 0, nu cifre false", () => {
  const o = serii(); o.SPY = serie((i) => 100 + i * 0.7 + (i % 3)); o.XLK = o.SPY.map((x) => ({ t: x.t, c: 2 * x.c })); o.XLK.splice(L - 10, 1);
  const r = SC.calculeaza(o, INCHIS).randuri.find((x) => x.s === "XLK");
  assert.ok(Math.abs(r.x) < 1e-9 && Math.abs(r.y) < 1e-9, "x=" + r.x + " y=" + r.y);
});
await test("regimul: ciclicele (fără XLRE) față de defensive pe o săptămână, prag ±0,6 pp ⇒ spre defensive (risk-off)", () => {
  const d = SC.calculeaza(serii(), INCHIS), xlb = d.randuri.find((r) => r.s === "XLB").s1, cyc = (5 * 1 - 1 + xlb) / 7;
  assert.ok(Math.abs(d.regim.ciclice - cyc) < 1e-9, "XLRE nu intră"); assert.ok(Math.abs(d.regim.defensive - 3) < 1e-9);
  assert.equal(d.regim.cod, "off"); assert.equal(d.regim.text, "spre defensive (risk-off)"); assert.equal(d.regim.stare, "atentie"); assert.equal(d.regim.partial, false);
  assert.equal(SC.regimDin(0.7).cod, "on"); assert.equal(SC.regimDin(0.6).cod, "neutru"); assert.equal(SC.regimDin(-0.61).cod, "off");
});
await test("rândurile sunt în ordinea săptămânii (cea mai bună sus); „conduc” = cadranul Conduce, în aceeași ordine", () => {
  const d = SC.calculeaza(serii(), INCHIS);
  assert.equal(d.randuri[0].s, "XLRE"); assert.equal(d.randuri[d.randuri.length - 1].s, "XLK");
  assert.equal(d.conduc[0], "Imobiliare"); assert.ok(!d.conduc.includes("Tehnologie"));
});
await test("bara de azi intră DOAR după închiderea bursei (16:00 New York) — altfel ziua e cea de dinainte", () => {
  const d = SC.calculeaza(serii(), DESCHIS);
  assert.equal(d.zi, "duminică, 06.09"); assert.ok(Math.abs(d.randuri.find((r) => r.s === "XLU").s1 - (102.4 / 100 - 1) * 100) < 1e-9);
});
await test("un sector lipsă (Yahoo n-a dat) ⇒ rândul lipsește, regimul e „parțial” (nu se folosește pentru alertă); fără SPY ⇒ null", () => {
  const d = SC.calculeaza(serii(["XLE"]), INCHIS);
  assert.equal(d.randuri.length, 10); assert.equal(d.regim.partial, true); assert.deepEqual(J(d.lipsa), ["XLE"]);
  assert.equal(SC.calculeaza(serii(["SPY"]), INCHIS), null); assert.equal(SC.calculeaza(null, INCHIS), null);
});
await test("textCitire: rândul din „Ce spune piața acum” — regimul + cine conduce; fără date ⇒ spus, nu tăcut", () => {
  const d = SC.calculeaza(serii(), INCHIS), r = SC.textCitire(d);
  assert.equal(r.ce, "Sectoarele US"); assert.equal(r.stare, "atentie");
  assert.match(r.text, /^rotație spre defensive \(risk-off\) · ciclicele \+0,8%, defensivele \+3,0% pe săptămână · conduc pe termen scurt: Imobiliare \(/);   // v100.170: cu orizontul
  assert.match(r.text, / · închiderea de luni, 07\.09$/);
  assert.equal(SC.textCitire(null).stare, "atentie"); assert.match(SC.textCitire(null).text, /nu s-au putut citi/);
  assert.match(SC.textCitire(SC.calculeaza(serii(["XLE"]), INCHIS)).text, /parțial/);
});
await test("htmlBloc: verdictul, graficul de rotație (11 puncte, 4 cadrane), tabelul cu 11 rânduri în română, nota; fără undefined/NaN", () => {
  const h = SC.htmlBloc(SC.calculeaza(serii(), INCHIS));
  assert.match(h, /<b>Rotația sectoarelor US<\/b>/); assert.match(h, /<b>Rotație spre defensive \(risk-off\)<\/b>/);
  assert.equal((h.match(/<circle /g) || []).length, 11); for (const q of ["conduce", "revine", "în urmă", "slăbește"]) assert.ok(h.includes(">" + q + "<"), q);
  assert.equal((h.match(/<tr><td><b>/g) || []).length, 11); assert.match(h, /<b>Utilități<\/b>/); assert.match(h, /class="srCad cdI">Revine</);
  assert.match(h, /Context, nu semnal/); assert.ok(!/undefined|NaN/.test(h));
  assert.match(SC.htmlBloc(null), /nu s-au putut citi/);
});
// ── v100.170 (12.10, el: „nu prea arată la fel ca Market Breadth”, apoi „da repară textul … și pune și market breadth lângă
// sectoare să fie de comparație”): „conduc” spune ORIZONTUL (săptămâna + 3 luni, „revine după cădere” când 3 luni e pe minus)
// și lângă fiecare sector stă procentul de acțiuni pe trend din Market Breadth (latest.json, sources.uptrend.sectors) ──
const NUME_BT = { XLK: "Technology", XLV: "Healthcare", XLE: "Energy", XLC: "Communication Services", XLI: "Industrials", XLP: "Consumer Defensive",
  XLY: "Consumer Cyclical", XLB: "Basic Materials", XLRE: "Real Estate", XLF: "Financial Services", XLU: "Utilities" };
const RATIO = { XLK: 0.448, XLV: 0.228, XLE: 0.222, XLC: 0.221, XLI: 0.167, XLP: 0.154, XLY: 0.152, XLB: 0.114, XLRE: 0.098, XLF: 0.08, XLU: 0.013 };
const latime = (fara) => ({ sources: { uptrend: { asOf: "2026-09-04", sectors: Object.keys(NUME_BT).filter((s) => !(fara || []).includes(s)).map((s) => ({ name: NUME_BT[s], date: "2026-09-04", count: Math.round(RATIO[s] * 100), total: 100, ratio: RATIO[s], trend: RATIO[s] > 0.1 ? "up" : "down" })) } } });
const scade3 = (i) => (i < L - 63 ? 100 : i <= L - 5 ? 100 - (12 * (i - (L - 63))) / 58 : 88 + (4 * (i - (L - 5))) / 5);   // −12 % în 3 luni, apoi +4,5 % pe săptămână
await test("v100.170 „conduc” cu orizontul: (+săpt., 3 luni) lângă fiecare; 3 luni pe minus ⇒ „revine după cădere”", () => {
  const s = serii(); s.XLU = serie(scade3);
  const d = SC.calculeaza(s, INCHIS), r = SC.textCitire(d).text, u = d.randuri.find((x) => x.s === "XLU");
  assert.ok(u.l3 < 0 && u.cadran.cod === "cdL", "XLU: 3 luni pe minus, dar cadranul Conduce");
  assert.match(r, / · conduc pe termen scurt: /);
  assert.match(r, /Utilități \(\+[0-9,]+% săpt\., −[0-9,]+% în 3 luni — revine după cădere\)/);
  assert.ok(!/ · conduc Imobiliare/.test(r), "formularea veche, fără orizont, a dispărut");
  assert.match(SC.htmlBloc(d), /conduc pe termen scurt: Imobiliare \(/);
});
await test("v100.170 Market Breadth lângă sectoare: % acțiuni pe trend pe fiecare rând + media ciclice / defensive + cele mai multe / puține", () => {
  const d = SC.calculeaza(serii(), INCHIS, latime());
  assert.ok(Math.abs(d.randuri.find((x) => x.s === "XLU").trend.ratio - 0.013) < 1e-9); assert.equal(d.randuri.find((x) => x.s === "XLK").trend.dir, "up");
  assert.equal(d.latime.zi, "04.09"); assert.equal(d.latime.sus[0].n, "Tehnologie"); assert.equal(d.latime.jos[0].n, "Utilități");
  const cyc = (0.448 + 0.152 + 0.221 + 0.08 + 0.167 + 0.114 + 0.222) / 7, def = (0.228 + 0.154 + 0.013) / 3;
  assert.ok(Math.abs(d.latime.ciclice - cyc) < 1e-9 && Math.abs(d.latime.defensive - def) < 1e-9, "XLRE în afara mediilor, ca la regim");
  const h = SC.htmlBloc(d);
  assert.match(h, /<th class="num">Pe trend<\/th>/); assert.match(h, /<td class="num srBt rau" title="pe trend: 1 din 100 · Market Breadth">1,3% ↓<\/td>/); assert.match(h, /<td class="num srBt bun" title="pe trend: 45 din 100 · Market Breadth">44,8% ↑<\/td>/);
  assert.match(h, /Market Breadth, 04\.09: în medie ciclicele au 20,1% din acțiuni pe trend, defensivele 13,2%/);
  assert.match(h, /câte acțiuni din sector sunt pe trend \(se schimbă încet\), nu cât a urcat sectorul săptămâna asta/);
  assert.match(SC.textCitire(d).text, / · Market Breadth \(04\.09\): pe trend cele mai multe Tehnologie 44,8%, cele mai puține Utilități 1,3%/);
  assert.ok(!/undefined|NaN/.test(h));
});
await test("v100.170 fără Market Breadth (sau sector lipsă) ⇒ coloana arată „—”, rândul de comparație lipsește, nimic stricat", () => {
  const h0 = SC.htmlBloc(SC.calculeaza(serii(), INCHIS)); assert.ok(!/Market Breadth,/.test(h0)); assert.match(h0, /<td class="num srBt">—<\/td>/);
  const d = SC.calculeaza(serii(), INCHIS, latime(["XLU"])); assert.equal(d.randuri.find((x) => x.s === "XLU").trend, null);
  assert.equal(SC.calculeaza(serii(), INCHIS, { sources: {} }).latime, null);
});
await test("v100.170 app.js dă blocului și rândului din citire și Market Breadth (latimeUsStare.j)", () => {
  const a = citeste("public", "app.js");
  assert.match(a, /Sectoare\.calculeaza\(sectoareStare\.j\.serii,Date\.now\(\),latimeUsStare\.j\)/);
  assert.match(a, /if\(latimeUsStare\.j&&sectoareStare\.la&&typeof sectoareDeseneaza==="function"\)sectoareDeseneaza\(\)\}/, "sosirea Market Breadth redesenează sectoarele");
  assert.match(a, /if\(latimeUsStare\.inLucru\)\{if\(typeof dupa==="function"\)latimeUsStare\.inLucru\.then\(dupa\);return latimeUsStare\.inLucru\}/, "o cerere deja pornită își cheamă și ea „dupa”");
});

await test("mesajSchimbare: alerta doar când regimul se SCHIMBĂ (prima citire doar se ține minte; parțial ⇒ nimic)", () => {
  const off = SC.calculeaza(serii(), INCHIS), m = SC.mesajSchimbare("on", off);
  assert.equal(m.titlu, "🔄 Rotația sectoarelor US s-a schimbat"); assert.match(m.mesaj, /^Din „spre ciclice \(risk-on\)” în „spre defensive \(risk-off\)”/); assert.equal(m.nivel, "atentie");
  assert.equal(SC.mesajSchimbare("off", off), null); assert.equal(SC.mesajSchimbare(null, off), null); assert.equal(SC.mesajSchimbare("on", SC.calculeaza(serii(["XLE"]), INCHIS)), null);
});

// ── B. ruta de pe server: seriile de la Yahoo, pentru SPY + 11 sectoare, cache 30 min ──
const API = await import("../functions/api/sectoare.js");
const cerere = (faraJeton) => new Request("http://127.0.0.1:8788/api/sectoare", { headers: faraJeton ? {} : { authorization: "Bearer proba-jeton" } });
const env = { APP_API_TOKEN: "proba-jeton" };
const fetchOrig = globalThis.fetch, cereri = [];
const yahoo = (s) => ({ chart: { result: [{ timestamp: [1, 2, 3].map((k) => 1790000000 + k * 86400), indicators: { quote: [{ close: s === "XLE" ? [null, null, null] : [10, 11, 12] }] } }] } });
await test("(B) fără jeton ⇒ 401", async () => { assert.equal((await API.onRequestGet({ request: cerere(true), env })).status, 401); });
await test("(B) seriile pentru SPY + 11 sectoare (6 luni, zilnic); închiderile goale scoase; a doua cerere din cache", async () => {
  API._golesteCache(); cereri.length = 0;
  globalThis.fetch = async (u) => { cereri.push(String(u)); const s = decodeURIComponent(String(u).split("/chart/")[1].split("?")[0]); return new Response(JSON.stringify(yahoo(s)), { status: 200 }); };
  const r = await (await API.onRequestGet({ request: cerere(), env })).json();
  assert.equal(cereri.length, 12); assert.ok(cereri.every((u) => u.includes("interval=1d&range=6mo")));
  assert.deepEqual(r.serii.SPY.map((x) => x.c), [10, 11, 12]); assert.equal(r.serii.SPY[0].t, (1790000000 + 86400) * 1000);
  assert.equal(r.serii.XLE, undefined, "fără închideri ⇒ lipsește"); assert.ok(r.la > 0);
  await API.onRequestGet({ request: cerere(), env }); assert.equal(cereri.length, 12, "din cache");
});
// v100.172 (revizia Opus): cache-ul de 30 min nu trece peste închiderea bursei — altfel alerta de după 16:00 judeca un preț din ședință
await test("v100.172 (B) cache luat în ședință (15:50 New York) NU se mai dă după închidere (16:10): se cer închiderile din nou", async () => {
  API._golesteCache(); cereri.length = 0;
  globalThis.fetch = async (u) => { cereri.push(String(u)); const s = decodeURIComponent(String(u).split("/chart/")[1].split("?")[0]); return new Response(JSON.stringify(yahoo(s)), { status: 200 }); };
  const nowOrig = Date.now;
  try {
    Date.now = () => Date.UTC(2026, 8, 8, 19, 50);   // 15:50 New York
    await API.onRequestGet({ request: cerere(), env }); assert.equal(cereri.length, 12);
    Date.now = () => Date.UTC(2026, 8, 8, 19, 58); await API.onRequestGet({ request: cerere(), env }); assert.equal(cereri.length, 12, "tot în ședință: din cache");
    Date.now = () => Date.UTC(2026, 8, 8, 20, 10);   // 16:10 New York, la 20 de minute de la cerere
    await API.onRequestGet({ request: cerere(), env }); assert.equal(cereri.length, 24, "după închidere: cerere nouă");
    Date.now = () => Date.UTC(2026, 8, 8, 20, 20); await API.onRequestGet({ request: cerere(), env }); assert.equal(cereri.length, 24, "luat după închidere: din cache");
  } finally { Date.now = nowOrig; }
});
await test("(B) Yahoo cade pe tot ⇒ 502 cu motivul (nu serii goale tăcute)", async () => {
  API._golesteCache(); globalThis.fetch = async () => new Response("x", { status: 500 });
  const r = await API.onRequestGet({ request: cerere(), env }); assert.equal(r.status, 502); assert.match((await r.json()).error, /Yahoo/);
});
globalThis.fetch = fetchOrig;

// ── C. legăturile din pagină ──
const idx = citeste("public", "index.html"), sw = citeste("public", "sw.js"), app = citeste("public", "app.js"), css = citeste("public", "app.css");
await test("index.html: blocul #sectoareBloc imediat după lățimea US, în #stocks; scriptul lib/sectoare.js", () => {
  assert.match(idx, /<div id="latimeUsBloc" class="latimeUsBloc"><\/div><div id="sectoareBloc" class="sectoareBloc"><\/div>/);
  assert.match(idx, /<script src="\/lib\/sectoare\.js"><\/script>/);
});
await test("sw.js: lib/sectoare.js în APP_SHELL", () => { assert.match(sw, /"\/lib\/sectoare\.js"/); });
await test("app.js: pagina Acțiuni desenează blocul; „Ce spune piața acum” are rândul după lățimea US", () => {
  assert.match(app, /if\(typeof sectoareDeseneaza==="function"\)sectoareDeseneaza\(\)/);
  assert.match(app, /if\(ex\.latimeUs\)out\.push\(rd\(ex\.latimeUs\)\);if\(ex\.sectoare\)out\.push\(rd\(ex\.sectoare\)\);/);
  assert.match(app, /getJSON\("\/api\/sectoare"\)/);
});
await test("CSS: blocul are locul lui în pagina Acțiuni (după lățimea US) și rândurile pe telefon; regula pândei rămâne ultima", () => {
  assert.match(css, /\.pzDemo #stocks\.on>\.sectoareBloc\{order:10\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.srTab thead\{display:none\}/);
  assert.ok(css.lastIndexOf(".sugPandaTab thead{display:table-header-group}") > css.lastIndexOf(".srTab"));
});

console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
