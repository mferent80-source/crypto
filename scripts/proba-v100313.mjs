// Proba v100.313 / colector v101.171 (08.11.2026, el: „fă ideea cu curba în Radar” + „evidențiată să iasă mai mult în evidență și în
// general sfaturile care chiar contează evidențiază-le în Radar” ⇒ macheta aprobată: „fa”):
//   1. CurbaStop: curba simetrică rulantă (21 de perechi, 1h, 30 de zile) — paritate cu Python, șansa la distanța stopului în ATR;
//   2. Conteaza: cel mult 3 rânduri „CONTEAZĂ ACUM”, după banii în joc; Acasă: linia roșie;
//   3. serverul (KV curbaStop), colectorul (tura curbei, atr1h în prob);
//   4. pagina: blocul, rândul stopului din grafic, drumul botului, Acasă; 5. Monte Carlo fără „stopul atins 100%” când reluarea arată botul oprit.
//   node scripts/proba-v100313.mjs
import "./lib/text-ro-global.mjs";   // garda din proba v10062: o probă care pomenește sfaturi.js încarcă întâi TextRo
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.313 · Contează acum + curba stopului · proba\n");
const ORA = 3600000, ZI = 86400000;
const J = (x) => JSON.parse(JSON.stringify(x));
const eq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function module_(...fis) {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp };
  vm.createContext(ctx);
  vm.runInContext(fis.map((f) => citeste("public", "lib", f)).join("\n") + "\nthis.CurbaStop = typeof CurbaStop !== 'undefined' ? CurbaStop : null; this.Conteaza = typeof Conteaza !== 'undefined' ? Conteaza : null;", ctx);
  return ctx;
}
const M = () => module_("text-ro.js", "curba-stop.js", "conteaza.js");
const FIX = JSON.parse(citeste("scripts", "date", "curba-stop-fixtura.json"));
const bare = (s) => s.t.map((t, i) => ({ t, o: s.o[i], h: s.h[i], l: s.l[i], c: s.c[i] }));
// o curbă mică, cunoscută: p24 scade liniar 0,95 → 0 pe 0,25 … 15 (60 de puncte), p72 = mai mare
const D = Array.from({ length: 60 }, (_, k) => 0.25 * (k + 1));
const CURBA = (la) => ({ la, zile: 30, perechi: 21, d: D, p24: D.map((d) => Math.max(0, +(0.95 - 0.1 * d).toFixed(6))), p72: D.map((d) => Math.max(0, +(0.99 - 0.06 * d).toFixed(6))), n24: 1000, n72: 1000 });
const ACUM = Date.parse("2026-11-08T10:00:00Z");

// ───────────── 1. CurbaStop ─────────────
await test("CurbaStop: paritate cu Python pe fixtură (3 perechi × 800 de bare, 30 de zile): p24, p72, n24, n72, ATR-ul ultim", () => {
  const { CurbaStop } = M();
  const c = CurbaStop.curba(FIX.seturi.map(bare), FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  eq(c.d, FIX.d);
  assert.equal(c.n24, FIX.asteptat.n24); assert.equal(c.n72, FIX.asteptat.n72);
  c.p24.forEach((p, k) => assert.ok(Math.abs(p - FIX.asteptat.p24[k]) < 1e-12, "p24[" + k + "]"));
  c.p72.forEach((p, k) => assert.ok(Math.abs(p - FIX.asteptat.p72[k]) < 1e-12, "p72[" + k + "]"));
  FIX.seturi.forEach((s, i) => assert.ok(Math.abs(CurbaStop.atr14(bare(s)) - FIX.asteptat.atrUltim[i]) < 1e-12, "atr " + s.simbol));
  assert.equal(c.perechi, 3); assert.equal(c.zile, 30); assert.equal(c.la, FIX.acum);
});
await test("CurbaStop: curba scade (supraviețuire) și e validă; o curbă stricată nu trece de `valida`", () => {
  const { CurbaStop } = M();
  const c = CurbaStop.curba(FIX.seturi.map(bare), FIX.acum, {});
  for (let k = 1; k < c.p24.length; k++) { assert.ok(c.p24[k] <= c.p24[k - 1]); assert.ok(c.p72[k] <= c.p72[k - 1]); }
  assert.equal(CurbaStop.valida(c), true);
  assert.equal(CurbaStop.valida(Object.assign({}, c, { p24: c.p24.slice(1) })), false);
  assert.equal(CurbaStop.valida(Object.assign({}, c, { p24: c.p24.map((p, k) => (k === 3 ? 1.5 : p)) })), false);
  assert.equal(CurbaStop.valida(Object.assign({}, c, { d: c.d.slice().reverse() })), false);
  assert.equal(CurbaStop.valida(null), false);
});
await test("CurbaStop.sansa: interpolare liniară; sub prima distanță = prima, peste ultima = ultima", () => {
  const { CurbaStop } = M(); const c = CURBA(ACUM);
  assert.ok(Math.abs(CurbaStop.sansa(c, 24, 2) - 0.75) < 1e-9);
  assert.ok(Math.abs(CurbaStop.sansa(c, 24, 2.125) - 0.7375) < 1e-9);
  assert.equal(CurbaStop.sansa(c, 24, 0.1), c.p24[0]);
  assert.equal(CurbaStop.sansa(c, 24, 99), c.p24[59]);
  assert.ok(Math.abs(CurbaStop.sansa(c, 72, 2) - 0.87) < 1e-9);
});
await test("CurbaStop.pentruStop: long cu stopul sub preț ⇒ d, p24, p72, mutarea la ~20 din 100", () => {
  const { CurbaStop } = M(); const c = CURBA(ACUM);
  const s = CurbaStop.pentruStop({ curba: c, atr: 0.004, pret: 0.3375, stop: 0.33, dir: "long", acum: ACUM });
  assert.ok(Math.abs(s.d - 1.875) < 1e-9);
  assert.ok(Math.abs(s.p24 - 0.7625) < 1e-9);
  assert.ok(Math.abs(s.p72 - (0.99 - 0.06 * 1.875)) < 1e-9);
  assert.ok(Math.abs(s.dMut20 - 7.5) < 1e-9, "p24 = 0,20 la d = 7,5");
  assert.ok(Math.abs(s.mut20 - (0.3375 - 7.5 * 0.004)) < 1e-12);
  assert.ok(Math.abs(CurbaStop.sansa(c, 24, s.dMut20) - 0.2) < 1e-9);
});
await test("CurbaStop.pentruStop: SHORT cu stopul deasupra (distanța în sus, mutarea în sus); stop trecut / lipsă ⇒ null", () => {
  const { CurbaStop } = M(); const c = CURBA(ACUM);
  const s = CurbaStop.pentruStop({ curba: c, atr: 2, pret: 100, stop: 104, dir: "short", acum: ACUM });
  assert.ok(Math.abs(s.d - 2) < 1e-9); assert.ok(s.mut20 > 104 && Math.abs(s.mut20 - 115) < 1e-9);
  assert.equal(CurbaStop.pentruStop({ curba: c, atr: 2, pret: 100, stop: 99, dir: "short", acum: ACUM }), null, "short cu stopul sub preț = deja trecut");
  assert.equal(CurbaStop.pentruStop({ curba: c, atr: 2, pret: 100, stop: 101, dir: "long", acum: ACUM }), null, "long cu stopul peste preț = deja trecut");
  assert.equal(CurbaStop.pentruStop({ curba: c, atr: 2, pret: 100, stop: null, dir: "long", acum: ACUM }), null);
  assert.equal(CurbaStop.pentruStop({ curba: c, atr: null, pret: 100, stop: 95, dir: "long", acum: ACUM }), null);
  assert.equal(CurbaStop.pentruStop({ curba: null, atr: 2, pret: 100, stop: 95, dir: "long", acum: ACUM }), null);
});
await test("CurbaStop.pentruStop: curba mai veche de 36 h ⇒ null (nu se arată o cifră stătută); deja ≤ 20 din 100 ⇒ fără mutare", () => {
  const { CurbaStop } = M();
  assert.equal(CurbaStop.pentruStop({ curba: CURBA(ACUM - 37 * ORA), atr: 2, pret: 100, stop: 95, dir: "long", acum: ACUM }), null);
  assert.ok(CurbaStop.pentruStop({ curba: CURBA(ACUM - 35 * ORA), atr: 2, pret: 100, stop: 95, dir: "long", acum: ACUM }));
  const s = CurbaStop.pentruStop({ curba: CURBA(ACUM), atr: 1, pret: 100, stop: 90, dir: "long", acum: ACUM });
  assert.equal(s.mut20, null); assert.equal(s.dMut20, null);
});

// ───────────── 2. Conteaza ─────────────
const STX = () => ({
  stop: { d: 1.88, p24: 0.54, p72: 0.73, mut20: 0.3209, dMut20: 4.2, stop: 0.33, perechi: 21, zile: 30 },
  sfaturi: [
    { cod: "trend", ton: "info", titlu: "Trendul e lateral, botul e long", text: "4h: …", faCe: "L-aș lăsa să facă perechi." },
    { cod: "margine", ton: "atentie", parte: "jos", titlu: "Marginea de jos (0.3330) e cu 1,1% sub preț", text: "Acolo botul ar avea ~742 STX…", faCe: "N-aș mări levierul și n-aș pune bani în plus în botul ăsta." },
    { cod: "zero", ton: "info", pctZero: 1.0, titlu: "Botul iese pe zero la 0.3399 (+1,0% de aici)", text: "Închis acum, ai lua 87,13 USDT din 89,18 investiți.", faCe: "Aș pune take-profit-ul botului la 0.3399 ca să ies fără pierdere.", copiaza: [{ ce: "take-profit", pret: "0.3399" }] },
  ],
  lista: [{ c: "g", titlu: "24 h pe minus (−2,0 USDT)", text: "…" }, { c: "n", titlu: "Nu ai un plan pentru bot", text: "…" }],
  sanse: [{ cod: "iese-jos-24", p: 0.82 }, { cod: "iese-sus-24", p: 0.14 }],
});
await test("Conteaza.alege pe STX (macheta): exact 3 rânduri — stopul (roșu, 54), marginea (galben, 82), zero (galben, +1,0, cu butonul)", () => {
  const { Conteaza } = M(); const l = Conteaza.alege(STX());
  assert.equal(l.length, 3);
  eq(l.map((x) => x.cheie), ["stop", "margine", "zero"]);
  eq(l.map((x) => x.ton), ["rosu", "galben", "galben"]);
  assert.equal(l[0].nr, "54"); assert.equal(l[0].nrSub, "din 100 · 24 h");
  assert.equal(l[0].titlu, "Stopul tău (0.3300) e atins într-o zi în ~54 din 100 de cazuri");
  assert.equal(l[0].sub, "e la 1,9 ATR de preț · în 3 zile: ~73 din 100 · măsurat pe 21 de monede, ultimele 30 de zile, jos și sus la un loc (direcția nu se știe)");
  assert.equal(l[0].faCe, "Hotărăște acum: ori accepți ieșirea la 0.3300, ori muți stopul la ~0.3209 (acolo ~20 din 100 într-o zi).");
  assert.equal(l[1].nr, "82"); assert.equal(l[1].nrSub, "din 100 · 24 h");
  assert.equal(l[1].sub, "o atinge într-o zi în 82 din 100 de cazuri (istoria monedei)");
  assert.equal(l[2].nr, "+1,0"); assert.equal(l[2].nrSub, "% până la zero");
  eq(l[2].copiaza, [{ ce: "take-profit", pret: "0.3399" }]);
});
await test("Conteaza.alege: pragurile — stop 0,29 ⇒ fără stop; 0,30 ⇒ galben; 0,50 ⇒ roșu și înaintea marginii; stop 0,30–0,50 vine DUPĂ margine", () => {
  const { Conteaza } = M();
  const cu = (p) => { const x = STX(); x.stop = Object.assign({}, x.stop, { p24: p }); return Conteaza.alege(x); };
  assert.ok(!cu(0.29).some((x) => x.cheie === "stop"));
  const g = cu(0.3); assert.equal(g.filter((x) => x.cheie === "stop")[0].ton, "galben");
  eq(g.map((x) => x.cheie), ["margine", "stop", "zero"]);
  eq(cu(0.5).map((x) => x.cheie), ["stop", "margine", "zero"]);
  assert.equal(cu(0.5)[0].ton, "rosu");
  assert.equal(cu(1)[0].nr, "99", "„N din 100” niciodată 100"); assert.match(cu(1)[0].titlu, /~99 din 100/);
});
await test("Conteaza.alege: pericolul critic și alerta roșie din listă urcă primele; cel mult 3; nimic calificat ⇒ []", () => {
  const { Conteaza } = M();
  const x = STX(); x.sfaturi.unshift({ cod: "pericol", tip: "lich", ton: "critic", titlu: "Lichidarea la 4,1%", text: "Mai e 4,1% până la lichidare.", faCe: "Aș adăuga marjă sau aș închide botul acum." });
  const l = Conteaza.alege(x);
  assert.equal(l.length, 3); assert.equal(l[0].cheie, "pericol"); assert.equal(l[0].ton, "rosu"); assert.equal(l[0].nr, "!"); assert.equal(l[0].nrSub, "lichidare");
  eq(l.map((q) => q.cheie), ["pericol", "stop", "margine"]);
  const y = STX(); y.lista.unshift({ c: "r", titlu: "Botul s-a oprit în Pionex", text: "Stare: oprit." });
  assert.equal(Conteaza.alege(y)[0].titlu, "Botul s-a oprit în Pionex");
  const z = STX(); z.lista.unshift({ c: "r", titlu: "Alertă veche", text: "", depasit: "nu mai e așa acum" });
  assert.ok(!Conteaza.alege(z).some((q) => q.titlu === "Alertă veche"), "rândul depășit nu urcă");
  eq(Conteaza.alege({ stop: null, sfaturi: [{ cod: "nimic", ton: "bine", titlu: "Nimic urgent" }], lista: [], sanse: [] }), []);
  eq(Conteaza.alege({}), []);
});
await test("Conteaza.alege: marginea fără șansă măsurată ⇒ cifra = distanța în % (nu se inventează o șansă); marginea „info” nu urcă", () => {
  const { Conteaza } = M();
  const x = STX(); x.sanse = []; x.sfaturi[1].pctJos = 1.1;
  const m = Conteaza.alege(x).filter((q) => q.cheie === "margine")[0];
  assert.equal(m.nr, "1,1"); assert.equal(m.nrSub, "% până la margine"); assert.equal(m.sub, "");
  const y = STX(); y.sfaturi[1].ton = "info";
  assert.ok(!Conteaza.alege(y).some((q) => q.cheie === "margine"));
});
await test("Conteaza.html: cifra mare, titlul, „👉” îngroșat, butonul de copiere ca în listă; escape pe text", () => {
  const { Conteaza } = M();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const l = Conteaza.alege(STX()); l[1].titlu = "Marginea <b>x</b>";
  const h = Conteaza.html(l, esc);
  assert.match(h, /class="ctCap"><b>CONTEAZĂ ACUM<\/b>/);
  assert.match(h, /class="ctRand ctRosu"><div class="ctNr">54<small>din 100 · 24 h<\/small><\/div>/);
  assert.match(h, /data-action-click="gridCopiaza\(this\.value\)"/); assert.match(h, /value="0\.3399"/);
  assert.match(h, /<p class="ctFac">👉 Hotărăște acum/);
  assert.ok(h.includes("Marginea &lt;b&gt;x&lt;/b&gt;") && !h.includes("<b>x</b>"));
  assert.equal(Conteaza.html([], esc), "");
});
await test("Conteaza.acasa: doar stopul sau un roșu ajung pe Acasă; textul scurt cu numele botului", () => {
  const { Conteaza } = M();
  const a = Conteaza.acasa(Conteaza.alege(STX()), "STX");
  assert.equal(a.titlu, "STX: stopul (0.3300) e atins într-o zi în ~54 din 100 de cazuri");
  assert.equal(a.text, "👉 hotărăște în Tablou · încă 2 de văzut acolo");
  const x = STX(); x.stop = null;
  assert.equal(Conteaza.acasa(Conteaza.alege(x), "STX"), null, "doar marginea galbenă ⇒ nimic pe Acasă");
  assert.equal(Conteaza.acasa([], "STX"), null);
});
await test("Conteaza.titluriSus: titlurile urcate (pentru „↑ e și sus” în listă)", () => {
  const { Conteaza } = M();
  eq(Conteaza.titluriSus(Conteaza.alege(STX())), ["Marginea de jos (0.3330) e cu 1,1% sub preț", "Botul iese pe zero la 0.3399 (+1,0% de aici)"]);
});
await test("sfaturi.js: sfatul „zero” poartă cifra `pctZero` (pentru cifra mare din bloc), restul neschimbat", () => {
  const s = citeste("public", "lib", "sfaturi.js");
  assert.match(s, /out\.push\(\{ cod: "zero", ton: "info", pctZero: 100 \* z\.distantaZeroPct, titlu: "Botul iese pe zero la "/);
});

// ───────────── 3. server + colector ─────────────
await test("server: GET/POST action=curbaStop — curba bună se ține (curățată), una stricată ⇒ 400, fără cheie ⇒ null", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=curbaStop", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = async () => (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=curbaStop", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV })).json();
  assert.equal((await get()).curbaStop, null);
  const c = Object.assign(CURBA(ACUM), { strain: "<script>" });
  assert.equal((await post({ curba: c })).status, 200);
  const g = (await get()).curbaStop;
  eq(g.d, c.d); eq(g.p24, c.p24); eq(g.p72, c.p72); assert.equal(g.perechi, 21); assert.equal(g.zile, 30); assert.equal(g.strain, undefined);
  for (const rau of [{ curba: Object.assign(CURBA(ACUM), { p24: CURBA(ACUM).p24.map((p, k) => (k === 5 ? 1.2 : p)) }) },
    { curba: Object.assign(CURBA(ACUM), { d: CURBA(ACUM).d.slice().reverse() }) },
    { curba: Object.assign(CURBA(ACUM), { p72: [0.5] }) },
    { curba: Object.assign(CURBA(ACUM), { p24: CURBA(ACUM).p24.slice().reverse() }) },
    { curba: Object.assign(CURBA(ACUM), { la: 0 }) }, {}]) assert.equal((await post(rau)).status, 400, JSON.stringify(rau).slice(0, 60));
});
await test("colector: turaCurbaStop — 21 de perechi ⇒ disc + KV; o dată la 6 h; sub 10 perechi ⇒ nimic scris, reîncercare peste o oră; doar barele închise", async () => {
  const { turaCurbaStop, SIMBOLURI, PAS_TURA } = await import("./lib/tura-curba-stop.mjs");
  const { CurbaStop } = M();
  const s0 = bare(FIX.seturi[0]), acum = FIX.acum, klines = s0.map((b) => [b.t, String(b.o), String(b.h), String(b.l), String(b.c), "1"]);
  const cuForm = klines.concat([[acum, "1", "999", "0.0001", "1", "1"]]);   // bara în curs (nu se ia)
  let cereri = 0, disc = null, trimis = [];
  const d = (ok) => ({ acum, CurbaStop, binance: async () => { cereri++; return cereri <= ok ? cuForm : null; }, trimite: async (c, o) => trimis.push([c, o]), scrieDisc: (c) => { disc = c; }, jurnal: () => {}, pauza: null });
  const st = {};
  const r = await turaCurbaStop(d(99), st);
  assert.equal(r.facut, true); assert.equal(r.perechi, SIMBOLURI.length); assert.equal(cereri, 21);
  assert.equal(trimis.length, 1); assert.equal(trimis[0][0], "/api/istoric-bot?action=curbaStop"); assert.ok(CurbaStop.valida(trimis[0][1].curba)); assert.ok(disc && disc.la === acum);
  const singur = CurbaStop.curba([s0], acum, { zile: 30 });
  eq(trimis[0][1].curba.p24, singur.p24, "aceeași pereche de 21 de ori = aceeași curbă (bara în curs scoasă)");
  cereri = 0; assert.equal((await turaCurbaStop(d(99), st)).facut, false); assert.equal(cereri, 0, "nu mai cere înainte de 6 h");
  const st2 = {}; cereri = 0; trimis = []; disc = null;
  const r2 = await turaCurbaStop(d(9), st2);
  assert.equal(r2.facut, false); assert.equal(r2.perechi, 9); assert.equal(trimis.length, 0); assert.equal(disc, null); assert.equal(st2.esecLa, acum);
  cereri = 0; assert.equal((await turaCurbaStop(Object.assign(d(99), { acum: acum + 30 * 60000 }), st2)).facut, false); assert.equal(cereri, 0, "reîncearcă abia peste o oră");
  assert.equal(PAS_TURA, 6 * ORA);
});
await test("colector: tura probabilităților pune atr1h (CurbaStop.atr14 pe barele de 1 h) în prob:<bot>; colectorul încarcă CurbaStop, v101.171, tura în lanțul greu", () => {
  const tp = citeste("scripts", "lib", "tura-probabilitati.mjs"), co = citeste("scripts", "colector.mjs");
  assert.match(tp, /if \(rez && d\.CurbaStop\) \{ try \{ const a = d\.CurbaStop\.atr14\(bare\); if \(a > 0\) rez\.atr1h = a;/);
  assert.match(co, /const CurbaStop = incarca\("curba-stop\.js", "CurbaStop"\);/);
  assert.match(co, /GridCalcul, Probabilitati, Dovada, TabloExtra, CurbaStop,/);
  assert.match(co, /const VERSIUNE_COLECTOR = "v101\.(?:17[1-9]|1[89]\d)";/);   /* v100.314: cel puțin v101.171 */
  assert.match(co, /\.then\(\(\) => turaProbeColector\(\)\)\.catch\(\(e\) => jurnal\("probe", e\.message\)\);/, "lanțul vechi neatins");
  assert.match(co, /catch \(e\) \{ jurnal\("caiet ESEC", SR\.motivEroare\(e\)\); \}\n  await turaCurbaStopColector\(\);/, "curba în tura probelor, după direcție");
});

// ───────────── 4. pagina ─────────────
const APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), CSS = citeste("public", "app.css");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
function pagina(o) {
  const el = { innerHTML: "", hidden: true, scrieri: 0 }, apeluri = { prob: 0, todo: 0 };
  const ctx = module_("text-ro.js", "curba-stop.js", "conteaza.js");
  Object.assign(ctx, {
    $: (id) => (id === "ctAcum" ? new Proxy(el, { set(t, k, v) { if (k === "innerHTML") t.scrieri++; t[k] = v; return true; } }) : null),
    escapeHtml: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    botiNr: (v) => { const x = Number(v); return v === null || v === undefined || v === "" || !Number.isFinite(x) ? null : x; },
    tbStare: o.tbStare, tbProb: o.tbProb || { botId: null }, tbProbPt: () => { apeluri.prob++; return { rez: o.rez, cal: null }; }, tbProbVechi: () => o.vechi || null, tbCurbaPt: () => o.curba,
    pvPretViuAcum: () => o.pretViu || null, TabloExtra: Object.assign({ pretStopLive: (b) => Number(b.opritorPierdere) }, o.TE || {}), Probabilitati: { randuri: () => o.randuri || [] },
    tbRenderTodo: () => { apeluri.todo++; },
  });
  vm.runInContext(["tbSansePt", "tbStopSansa", "tbStopSansaDrum", "tbConteazaLista", "tbRenderConteaza", "tbEsteSus"].map((n) => functie(APP, n)).join("\n")
    + "\nthis.tbSansePt = tbSansePt; this.tbStopSansa = tbStopSansa; this.tbStopSansaDrum = tbStopSansaDrum; this.tbRenderConteaza = tbRenderConteaza; this.tbEsteSus = tbEsteSus;", ctx);
  return { ctx, el, apeluri };
}
const BOT = () => ({ id: "2630", baza: "STX.PERP", directie: "long", activ: true, opritorPierdereActiv: true, opritorPierdere: 0.33, pretCurent: 0.3375 });
await test("pagina: blocul „CONTEAZĂ ACUM” se desenează din cifrele reale (curba + atr1h + prețul viu), se ascunde fără bot, nu se rescrie la aceleași cifre", () => {
  const st = { bot: BOT(), routeOk: true, sfaturiLista: STX().sfaturi, todoLista: [] };
  const { ctx, el } = pagina({ tbStare: st, rez: { la: ACUM, atr1h: 0.004 }, curba: CURBA(Date.now()), pretViu: 0.3375, randuri: [{ cod: "iese-jos-24", p: 0.82 }] });
  const s = ctx.tbStopSansa(st.bot);
  assert.ok(Math.abs(s.d - 1.875) < 1e-9); assert.ok(Math.abs(s.p24 - 0.7625) < 1e-9);
  const l = J(ctx.tbRenderConteaza());
  eq(l.map((x) => x.cheie), ["stop", "margine", "zero"]);
  assert.equal(el.hidden, false); assert.match(text(el.innerHTML), /^CONTEAZĂ ACUM .* 76 din 100 · 24 h Stopul tău \(0\.3300\) e atins într-o zi în ~76 din 100 de cazuri/);
  assert.equal(el.scrieri, 1); ctx.tbRenderConteaza(); assert.equal(el.scrieri, 1, "aceleași cifre ⇒ fără rescriere (clicul pe butoane nu se pierde)");
  assert.equal(ctx.tbEsteSus("marginea de jos (0.3330) e cu 1,1% sub preț"), true); assert.equal(ctx.tbEsteSus("Nu ai un plan pentru bot"), false);
  st.bot = null; ctx.tbRenderConteaza(); assert.equal(el.hidden, true); assert.equal(el.innerHTML, "");
});
await test("pagina: rândul stopului în șanse (stop-24) și eticheta drumului „24 h: ~N%”; fără stop activ / fără atr1h / cifre vechi ⇒ nimic", () => {
  const mk = (bot, rez, vechi) => pagina({ tbStare: { bot, routeOk: true }, rez, curba: CURBA(Date.now()), pretViu: 0.3375, vechi, randuri: [{ cod: "iese-jos-24", p: 0.82 }] }).ctx;
  const c = mk(BOT(), { la: ACUM, atr1h: 0.004 });
  const r = J(c.tbSansePt(BOT())).filter((x) => x.cod === "stop-24")[0];
  assert.ok(Math.abs(r.p - 0.7625) < 1e-9); assert.equal(r.titlu, "Stopul atins într-o zi"); assert.match(r.text, /^în 3 zile ~88% · curba pe 21 de monede, ultimele 30 de zile \(direcția nu se știe\)$/);
  assert.equal(c.tbStopSansaDrum(BOT()), "24 h: ~76%");
  const faraStop = Object.assign(BOT(), { opritorPierdereActiv: false });
  assert.ok(!J(mk(faraStop, { la: ACUM, atr1h: 0.004 }).tbSansePt(faraStop)).some((x) => x.cod === "stop-24"), "fără stop activ ⇒ fără rândul stop-24");
  assert.equal(mk(Object.assign(BOT(), { opritorPierdereActiv: false }), { la: ACUM, atr1h: 0.004 }).tbStopSansa(Object.assign(BOT(), { opritorPierdereActiv: false })), null);
  assert.equal(mk(BOT(), { la: ACUM }).tbStopSansa(BOT()), null, "fără atr1h");
  assert.equal(mk(BOT(), { la: ACUM, atr1h: 0.004 }, 5).tbStopSansa(BOT()), null, "cifre de acum 5 h");
  eq(J(mk(BOT(), { la: ACUM }).tbSansePt(BOT())).map((x) => x.cod), ["iese-jos-24"]);
});
await test("pagina: lista „Ce ai de făcut acum” cheamă blocul ÎNAINTE de rânduri și pune „↑ e și sus” pe cele urcate (nu pe cele depășite)", () => {
  const f = functie(APP, "tbRenderTodo");
  const ap = 'tbStare.todoLista=l;if(typeof tbRenderConteaza==="function")tbRenderConteaza(true);';
  assert.ok(f.indexOf(ap) >= 0 && f.indexOf(ap) < f.indexOf("box.innerHTML=(tbStare.citireGoala"));
  assert.match(f, /\(!x\.depasit&&typeof tbEsteSus==="function"&&tbEsteSus\(t\)\?'<span class="ctSus">↑ e și sus<\/span>':''\)/);
  assert.match(f, /tbStare\.todoLista=\[\];if\(typeof tbRenderConteaza==="function"\)tbRenderConteaza\(true\);return\}/, "fără bot: blocul se golește");
  const css = CSS.slice(CSS.indexOf("/* v100.313"), CSS.indexOf("@media (max-width:640px){.sugPandaTab thead"));
  assert.ok(css.length > 500 && css.indexOf("#ctAcum") > 0, "stilurile blocului stau ÎNAINTEA pândei (blocul v100.224 rămâne ultimul)");
  assert.doesNotMatch(css, /border-radius:\s*\d{2,}px|border-radius:\s*[6-9]px|#[0-9a-fA-F]{6}/, "jetoanele temei: colțuri ≤ 5 px, fără culori noi");
  assert.match(functie(APP, "tbProbPt"), /tbRenderConteaza\(\);if\(typeof acasaPe==="function"&&acasaPe\(\)&&typeof acasaDeseneaza==="function"\)acasaDeseneaza\(\)/);
  assert.match(functie(APP, "tbCurbaPt"), /getJSON\("\/api\/istoric-bot\?action=curbaStop"\)/); assert.match(APP, /Date\.now\(\)-tbCurba\.la>30\*60000/);
});
await test("pagina: index.html (blocul în .tbCadru, scripturile înaintea app.js, versiunea de EXACT 4 ori), CSS (order 11 între erou 10 și 12, toată lățimea), SW, versiunile", () => {
  assert.ok(HTML.includes('<section id="tbMcSus" class="tbBloc" hidden></section><section id="ctAcum" class="ctAcum" hidden aria-label="Contează acum"></section>'));
  const iC = HTML.indexOf('<script src="/lib/curba-stop.js"></script><script src="/lib/conteaza.js"></script>'), iA = HTML.search(/<script[^>]+src="\/app\.js/);
  assert.ok(iC > 0 && iA > iC, "modulele înaintea app.js");
  assert.equal((HTML.match(/v100\.31[3-9]/g) || []).length, 4); assert.equal((HTML.match(/v100\.312/g) || []).length, 0);
  assert.match(CSS, /\.pzDemo #tabloubot \.tbCadru>#ctAcum\{order:11\}/); assert.match(CSS, /#tabloubot \.tbCadru>#ctAcum\{grid-column:1\/-1\}/);
  assert.match(CSS, /\.pzDemo #tabloubot \.tbCadru>#pzVerdict\{order:10\}/); assert.match(CSS, /\.pzDemo #tabloubot \.tbCadru>#tbGridLarg\{order:12\}/);
  assert.match(CSS, /@media \(max-width:600px\)\{\.ctRand\{grid-template-columns:70px minmax\(0,1fr\)\}/);
  const SW = citeste("public", "sw.js");
  assert.match(SW, /const CACHE="crypto-radar-v100-31[3-9]";/); assert.ok(SW.includes('"/lib/curba-stop.js","/lib/conteaza.js"'));
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.31[3-9]"/);
  const BI = JSON.parse(citeste("BUILD_INFO.json")); assert.match(BI.version, /^v100\.31[3-9]$/); assert.ok(BI.features.conteaza313 && BI.features.probe312);
  const PK = JSON.parse(citeste("package.json")); assert.match(PK.version, /^100\.31[3-9]\.0$/); assert.match(PK.scripts.test, /npm run test:v100312 && npm run test:v100313 && (?:npm run test:v10031[4-9] && )*node scripts\/mutatii\.mjs --doar-tiparele/);
});
await test("grafic: rândul „stopul tău” primește „24 h: ~N%” din stop-24 (cu „~”, e curba pieței); marginile rămân fără „~”", () => {
  const ctx = { console, Math, JSON, Number, String, Array, Object, RegExp, isFinite, Date, Intl };
  vm.createContext(ctx); vm.runInContext(["text-ro.js", "grid-calcul.js", "grafic-bot.js"].map((f) => citeste("public", "lib", f)).join("\n") + "\nthis.GB = GraficBot;", ctx);
  const r = J(ctx.GB.cuSanse([{ k: "stop", pret: 0.33 }, { k: "gridJos", pret: 0.333 }], [{ cod: "stop-24", p: 0.54, titlu: "Stopul atins într-o zi", text: "în 3 zile ~73%" }, { cod: "iese-jos-24", p: 0.82, titlu: "Atinge marginea de jos în 24 h" }]));
  const s = r.filter((x) => x.k === "stop")[0], g = r.filter((x) => x.k === "gridJos")[0];
  assert.equal(s.sansa, "24 h: ~54%"); assert.equal(s.sansaScurt, "~54%"); assert.match(s.sansaLung, /^Stopul atins într-o zi: ~54% · în 3 zile ~73%$/);
  assert.equal(g.sansa, "24 h: 82%");
});
await test("drumul botului și Acasă: eticheta stopului cu cifra (lățimea o socotește), linia roșie de pe Acasă doar pentru botul din Tablou", () => {
  const PZ = citeste("public", "lib", "asezare-paznic.js"), AC = citeste("public", "lib", "acasa-ecran.js");
  assert.match(PZ, /if \(s && L\.length && typeof tbStopSansaDrum === "function"\) \{ var sj = null; try \{ sj = tbStopSansaDrum\(bl\); \} catch \(e\) \{ sj = null; \} if \(sj\) L\[L\.length - 1\]\.sansa = sj; \}/);
  assert.match(PZ, /\(x\.n\.length \+ 1 \+ fP\(x\.p\)\.length \+ \(x\.sansa \? x\.sansa\.length \+ 1 : 0\)\) \* 6\.3/);
  assert.match(PZ, /\(x\.sansa \? ' <span class="pzDrumSansa">' \+ esc\(x\.sansa\) \+ '<\/span>' : ''\)/);
  assert.match(AC, /var ctB = typeof tbStare !== "undefined" && tbStare\.routeOk !== false && tbStare\.bot && act\.some\(function \(b\) \{ return b\.id === tbStare\.bot\.id; \}\) \? tbStare\.bot : null;/);
  assert.match(AC, /Conteaza\.acasa\(tbConteazaLista\(ctB\)/); assert.match(AC, /'<div class="acCtLinie' \+ \(ctA\.ton === "galben" \? ' acCtGalben' : ''\) \+ '">⚠ <b>' \+ escapeHtml\(ctA\.titlu\) \+ '<\/b><br>' \+ escapeHtml\(ctA\.text\) \+ '<\/div>'/);
});

// ───────────── 5. Monte Carlo cinstit ─────────────
await test("Monte Carlo: reluarea arată botul OPRIT ⇒ rândul NU mai scrie „stopul atins …%”; botul care rulează îl scrie în continuare", () => {
  const ctx = { console, Math, JSON, Number, String, Array, Object, RegExp, isFinite, Date, Intl, Float64Array, Uint32Array, Int32Array };
  vm.createContext(ctx);
  vm.runInContext(["text-ro.js", "grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js", "grid-sim.js"].map((f) => citeste("public", "lib", f)).join("\n") + "\nthis.GS = GridSim; this.MS = MonteSimbol;", ctx);
  const g = ctx.MS.generator(3), B = []; let c = 1;
  for (let i = 0; i < 20 * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); B.push({ t: Date.now() - (20 * 96 - i) * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); }
  const P0 = B[B.length - 1].c, pornitLa = B[B.length - 288].t, minPre = Math.min(...B.slice(-288).map((x) => x.l));
  const ST = { jos: P0 * 0.9, sus: P0 * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: minPre * 1.002 }, tp: null, tip: "geometric" };
  const rez = ctx.GS.simuleaza(B, ST, { plan: null, pornitLa, stPrefix: ST, n: 60, seed: 12, orizonturi: [1, 7], zile: 14 });
  assert.ok(rez.acum && rez.acum.oprit, "fixtura: reluarea trebuie să vadă botul oprit");
  const v = ctx.GS.verdictScurt(rez, ST, null, null);
  assert.match(v.text, /Reluarea arată botul OPRIT pe drumul real/); assert.doesNotMatch(v.text, /stopul atins/);
  const ST2 = Object.assign({}, ST, { stop: { jos: minPre * 0.995 } }), v2 = ctx.GS.verdictScurt(ctx.GS.simuleaza(B, ST2, { plan: null, pornitLa, stPrefix: ST2, n: 60, seed: 12, orizonturi: [1, 7], zile: 14 }), ST2, null, null);
  assert.doesNotMatch(v2.text, /Reluarea arată botul OPRIT/); assert.match(v2.text, / · stopul atins \d+%/, "stopul aproape de un bot viu rămâne scris: " + v2.text);
});
await test("Monte Carlo pe termen scurt: cu reluarea OPRIT ⇒ fără „stopul atins în 1 h: 100,0%”, trimite la rândul stopului; altfel neschimbat", () => {
  const ctx = { escapeHtml: (s) => String(s), Number, Math, String, Array };
  vm.createContext(ctx); vm.runInContext(functie(APP, "tbMcScurtHtml") + "\nthis.f = tbMcScurtHtml;", ctx);
  const sc = [{ ore: 1, pStop: 1, pLich: 0, p5: 0 }, { ore: 4, pStop: 1, pLich: 0, p5: 0 }, { ore: 24, pStop: 1, pLich: 0, p5: 0 }];
  const da = text(ctx.f(sc, true, true)), nu = text(ctx.f(sc, false));
  assert.doesNotMatch(da, /stopul atins/); assert.match(da, /reluarea nu se potrivește cu Pionex \(arată botul oprit\), deci fără cifrele ei — șansa măsurată a stopului e pe rândul „stopul tău” din grafic/);
  assert.match(nu, /stopul atins în 1 h: 100,0% · în 4 h: 100,0% · într-o zi: 100,0%/);
  assert.ok(APP.includes('tbMcScurtHtml(mc.scurt,(/Reluarea arată botul (OPRIT|LICHIDAT)/.exec(String(mc.text||""))||[])[1],!!(typeof tbStopSansa==="function"&&tbStopSansa(b)))'));
});

// ───────────── 6. Revizia Opus (08.11.2026) ─────────────
await test("revizia 🔴: drumul altui bot NU cere cifrele lui (tbProbPt doar pentru botul din Tablou; altfel doar ce e deja adus) — pe telefon nu se mai calcă", () => {
  const st = { bot: BOT(), routeOk: true }, alt = Object.assign(BOT(), { id: "9999", baza: "ETH.PERP" });
  const { ctx, apeluri } = pagina({ tbStare: st, rez: { la: ACUM, atr1h: 0.004 }, curba: CURBA(Date.now()), pretViu: 0.3375 });
  assert.equal(ctx.tbStopSansa(alt), null); assert.equal(apeluri.prob, 0, "alt bot ⇒ nicio cerere");
  ctx.tbProb.botId = "9999"; ctx.tbProb.rez = { la: ACUM, atr1h: 0.004 };
  assert.ok(ctx.tbStopSansa(alt), "alt bot cu cifrele deja aduse ⇒ cifra"); assert.equal(apeluri.prob, 0);
  assert.ok(ctx.tbStopSansa(st.bot)); assert.equal(apeluri.prob, 1, "botul din Tablou ⇒ tbProbPt");
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /sj = tbStopSansaDrum\(bl\);/, "drumul: cifra pe botul cu prețul viu, ca prețul stopului");
});
await test("revizia 🟡1: același fapt nu apare de două ori în bloc (alerta „Lichidarea la 12.0%” și sfatul „lichidarea la 7.0%”) — rămâne sfatul de acum, cu majusculă", () => {
  const { Conteaza } = M();
  const l = J(Conteaza.alege({ stop: { p24: 0.6, p72: 0.8, d: 1.5, stop: 0.33, mut20: 0.32, perechi: 21, zile: 30 },
    sfaturi: [{ cod: "pericol", ton: "critic", tip: "lich", titlu: "lichidarea la 7.0%", text: "Mai ai 7%.", faCe: "Adaugă marjă." }],
    lista: [{ c: "r", titlu: "Lichidarea la 12.0%", text: "Mai erau 12% 👉 Adaugă marjă." }, { c: "r", titlu: "Prețul a ieșit din grid pe jos", text: "x" }] }));
  eq(l.map((x) => x.cheie), ["pericol", "alerta", "stop"]);
  assert.equal(l[0].titlu, "Lichidarea la 7.0%"); assert.equal(l[1].titlu, "Prețul a ieșit din grid pe jos");
});
await test("revizia 🟡2 + 🔵: „de” la monede și zile prin TextRo.cate; perechile lipsă nu se inventează; pragul pe cifra ARĂTATĂ (~30 intră, ~29 nu, ~50 roșu)", () => {
  const { Conteaza } = M(); const s = (p, perechi) => ({ p24: p, p72: 0.9, d: 2, stop: 0.33, mut20: 0.32, perechi, zile: 30 });
  const sub = (o) => J(Conteaza.alege({ stop: o }))[0].sub;
  assert.match(sub(s(0.6, 15)), / · măsurat pe 15 monede, ultimele 30 de zile,/); assert.match(sub(s(0.6, 21)), / · măsurat pe 21 de monede, ultimele 30 de zile,/);
  assert.match(sub(s(0.6, undefined)), / · măsurat pe monedele mari, ultimele 30 de zile,/);
  assert.equal(J(Conteaza.alege({ stop: s(0.296, 21) }))[0].ton, "galben", "~30 pe grafic ⇒ intră");
  eq(J(Conteaza.alege({ stop: s(0.294, 21) })), []); assert.equal(J(Conteaza.alege({ stop: s(0.496, 21) }))[0].ton, "rosu");
  const c = pagina({ tbStare: { bot: BOT(), routeOk: true }, rez: { la: ACUM, atr1h: 0.004 }, curba: Object.assign(CURBA(Date.now()), { perechi: 15 }), pretViu: 0.3375 }).ctx;
  assert.match(J(c.tbSansePt(BOT())).filter((x) => x.cod === "stop-24")[0].text, /curba pe 15 monede, ultimele 30 de zile/);
});
await test("revizia 🟡3: Monte Carlo — „lichidat” spus ca atare, fără cifra lichidării / a celor 5% (reluarea nu se potrivește); trimite la rândul stopului DOAR când rândul are cifra", () => {
  const ctx = { escapeHtml: (x) => String(x), Number, Math, String, Array }; vm.createContext(ctx);
  vm.runInContext(functie(APP, "tbMcScurtHtml") + "\nthis.f = tbMcScurtHtml;", ctx);
  const sc = [{ ore: 1, pStop: 0, pLich: 1, p5: -50 }, { ore: 4, pStop: 0, pLich: 1, p5: -50 }, { ore: 24, pStop: 0, pLich: 1, p5: -50 }];
  const lich = text(ctx.f(sc, "LICHIDAT", true)), opr = text(ctx.f(sc, "OPRIT", false));
  assert.match(lich, /reluarea nu se potrivește cu Pionex \(arată botul lichidat\), deci fără cifrele ei — șansa măsurată a stopului e pe rândul „stopul tău” din grafic/);
  assert.doesNotMatch(lich, /lichidare într-o zi|cele mai proaste 5%/);
  assert.match(opr, /\(arată botul oprit\), deci fără cifrele ei$/); assert.doesNotMatch(opr, /rândul „stopul tău”/);
  assert.match(citeste("public", "lib", "grid-sim.js"), /var opritMeu = !!\(meu && rez\.acum\.oprit\);\n    if \(o7\.pStop >= 0\.005 && !opritMeu\) parti\.push\("stopul atins " \+ pr\(o7\.pStop\)\); if \(o7\.pLich >= 0\.005 && !opritMeu\) parti\.push\("lichidare " \+ pr\(o7\.pLich\)\); if \(o7\.pTp >= 0\.005 && !opritMeu\)/);
});
await test("revizia 🟡4: stopul pus în PROCENTE — blocul spune procentul din Pionex (și prețul de acum), iar mutarea ca procent (cu grilele de pe drum)", () => {
  const b = Object.assign(BOT(), { opritorPierdereTip: "raport", opritorPierdereRaport: -0.15, investit: 89.18 });
  const TE = { pretStopLive: () => 0.33, totalCuGridLa: (bb, x) => (x - 0.3375) * 1000 };
  const { ctx } = pagina({ tbStare: { bot: b, routeOk: true }, rez: { la: ACUM, atr1h: 0.004 }, curba: CURBA(Date.now()), pretViu: 0.3375, TE });
  const s = J(ctx.tbStopSansa(b));
  assert.equal(s.raport, -0.15); assert.ok(Math.abs(s.mutRaport - (s.mut20 - 0.3375) * 1000 / 89.18) < 1e-9, JSON.stringify(s));
  const { Conteaza } = M(); const r = J(Conteaza.alege({ stop: s }))[0];
  assert.match(r.titlu, /^Stopul tău \(−15,0% din investiție, acum pe la 0\.3300\) e atins într-o zi în ~\d+ din 100 de cazuri$/);
  assert.match(r.faCe, /^Hotărăște acum: ori accepți ieșirea la −15,0%, ori muți stopul la ~−\d+,\d% din investiție \(acum pe la ~0\.\d{4}; acolo ~20 din 100 într-o zi\)\.$/);
  assert.match(J(Conteaza.acasa([r], "STX")).titlu, /^STX: stopul \(−15,0% din investiție/);
});
await test("revizia 🟡5 + 🟡6: stopul dincolo de lichidare ⇒ fără cifră (lichidarea vine întâi); stopul dincolo de margine nu e atins mai des decât marginea (plafon, spus)", () => {
  const st = { bot: BOT(), routeOk: true };
  assert.equal(pagina({ tbStare: st, rez: { la: ACUM, atr1h: 0.004 }, curba: CURBA(Date.now()), pretViu: 0.3375, TE: { stopDincoloDeLichidare: () => true } }).ctx.tbStopSansa(st.bot), null);
  const mk = (bot, cod, pm) => pagina({ tbStare: { bot, routeOk: true }, rez: { la: ACUM, atr1h: 0.004 }, curba: CURBA(Date.now()), pretViu: 0.3375, randuri: [{ cod, p: pm }] }).ctx;
  const lg = (gridJos) => Object.assign(BOT(), { gridJos, gridSus: 0.36 });
  const s1 = J(mk(lg(0.333), "iese-jos-24", 0.4).tbStopSansa(lg(0.333)));
  assert.equal(s1.p24, 0.4); assert.equal(s1.plafon, "jos");
  const { Conteaza } = M(); assert.match(J(Conteaza.alege({ stop: s1 }))[0].sub, / · plafonat la șansa marginii de jos \(stopul e dincolo de ea\)$/);
  const s2 = J(mk(lg(0.32), "iese-jos-24", 0.4).tbStopSansa(lg(0.32)));
  assert.ok(Math.abs(s2.p24 - 0.7625) < 1e-9); assert.equal(s2.plafon, undefined, "stopul în grid ⇒ fără plafon");
  assert.ok(Math.abs(J(mk(lg(0.333), "iese-jos-24", 0.9).tbStopSansa(lg(0.333))).p24 - 0.7625) < 1e-9, "marginea mai probabilă ⇒ nimic de plafonat");
  const sh = Object.assign(BOT(), { directie: "short", opritorPierdere: 0.345, gridJos: 0.31, gridSus: 0.34 });
  const s3 = J(mk(sh, "iese-sus-24", 0.3).tbStopSansa(sh)); assert.equal(s3.p24, 0.3); assert.equal(s3.plafon, "sus");
});
await test("revizia 🟡7: când blocul își schimbă rândurile (curba / cifrele sosesc după listă), lista se redesenează o dată („↑ e și sus” la zi); din listă nu se cheamă înapoi", () => {
  const st = { bot: BOT(), routeOk: true, sfaturiLista: STX().sfaturi, todoLista: [] };
  const { ctx, apeluri } = pagina({ tbStare: st, rez: { la: ACUM, atr1h: 0.004 }, curba: CURBA(Date.now()), pretViu: 0.3375, randuri: [{ cod: "iese-jos-24", p: 0.82 }] });
  ctx.tbRenderConteaza(true); assert.equal(apeluri.todo, 0, "din listă ⇒ fără întoarcere");
  st.sfaturiLista = []; ctx.tbRenderConteaza(); assert.equal(apeluri.todo, 1, "s-a schimbat ce e sus ⇒ lista se redesenează");
  ctx.tbRenderConteaza(); assert.equal(apeluri.todo, 1, "nimic schimbat ⇒ nimic");
});
await test("revizia 🟡8 + 🔵: Acasă — fără linie când citirea botului a picat (ca Tabloul); fără role=status (nu se anunță la fiecare desen); stopul galben (30–49) în galben", () => {
  const AC = citeste("public", "lib", "acasa-ecran.js");
  assert.doesNotMatch(AC, /acCtLinie[^"]*" role=/);
  const { Conteaza } = M(); const s = { p24: 0.4, p72: 0.6, d: 2, stop: 0.33, mut20: 0.32, perechi: 21, zile: 30 };
  assert.equal(J(Conteaza.acasa(Conteaza.alege({ stop: s }), "STX")).ton, "galben");
  assert.equal(J(Conteaza.acasa(Conteaza.alege({ stop: Object.assign({}, s, { p24: 0.6 }) }), "STX")).ton, "rosu");
  assert.match(CSS, /\.acCtLinie\.acCtGalben\{[^}]*var\(--pzAur\)/);
});
await test("revizia 🔵: drumul scrie ca graficul („< 1%” / „> 99%”, altfel „~N%”); curba cu n = 0 nu trece de valida; mutarea ≤ 0 nu se dă; curba bună rămâne la o cădere de rețea", async () => {
  const mk = (curba) => pagina({ tbStare: { bot: BOT(), routeOk: true }, rez: { la: ACUM, atr1h: 0.004 }, curba, pretViu: 0.3375 }).ctx;
  const plat = (p) => Object.assign(CURBA(Date.now()), { p24: D.map(() => p), p72: D.map(() => p) });
  assert.equal(mk(plat(0.004)).tbStopSansaDrum(BOT()), "24 h: < 1%"); assert.equal(mk(plat(0.996)).tbStopSansaDrum(BOT()), "24 h: > 99%");
  const { CurbaStop } = M();
  assert.equal(CurbaStop.valida(Object.assign(CURBA(ACUM), { n24: 0 })), false); assert.equal(CurbaStop.valida(Object.assign(CURBA(ACUM), { n72: undefined })), false);
  const s = J(CurbaStop.pentruStop({ curba: CURBA(ACUM), atr: 0.05, pret: 0.3375, stop: 0.33, dir: "long", acum: ACUM }));
  assert.ok(s && s.mut20 === null && s.dMut20 === null, "mutarea ar cădea sub zero: " + JSON.stringify(s));
  const cx = { Date, Promise, tbStare: {}, getJSON: null, acasaPe: () => false }; vm.createContext(cx);
  vm.runInContext("var tbCurba={la:0,c:null,inLucru:false};" + functie(APP, "tbCurbaPt") + "\nthis.f=tbCurbaPt; this.st=function(){return tbCurba};", cx);
  const asteapta = () => new Promise((r) => setTimeout(r, 15));
  cx.getJSON = async () => ({ curbaStop: { la: 1 } }); cx.f(); await asteapta(); eq(cx.st().c, { la: 1 });
  cx.st().la = 0; cx.getJSON = async () => { throw new Error("rețea"); }; cx.f(); await asteapta(); eq(cx.st().c, { la: 1 }, "cădere de rețea ⇒ curba de dinainte rămâne");
  cx.st().la = 0; cx.getJSON = async () => ({ curbaStop: null }); cx.f(); await asteapta(); assert.equal(cx.st().c, null, "serverul spune că nu e curbă ⇒ nimic");
});
await test("revizia 🔵: serverul cere NUMERE — cifrele ca text („9e-1” / „0.95”) nu mai trec prin comparația pe șiruri", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=curbaStop", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const c = CURBA(ACUM);
  for (const rau of [Object.assign({}, c, { p24: c.p24.map(String) }), Object.assign({}, c, { d: c.d.map(String) }),
    Object.assign({}, c, { p24: ["9e-1", "0.95"].concat(c.p24.slice(2)) }), Object.assign({}, c, { la: String(ACUM) })]) assert.equal((await post({ curba: rau })).status, 400);
  assert.equal((await post({ curba: c })).status, 200);
});
await test("revizia 🔵: colectorul scrie pe disc DOAR după ce serverul a primit curba (altfel reîncearcă peste o oră); două ture deodată ⇒ a doua nu cere nimic", async () => {
  const { turaCurbaStop } = await import("./lib/tura-curba-stop.mjs"); const { CurbaStop } = M();
  const s0 = bare(FIX.seturi[0]), acum = FIX.acum, kl = s0.map((b) => [b.t, String(b.o), String(b.h), String(b.l), String(b.c), "1"]);
  let disc = null, cereri = 0; const st = {};
  const d = { acum, CurbaStop, binance: async () => { cereri++; return kl; }, trimite: async () => { throw new Error("server oprit"); }, scrieDisc: (c) => { disc = c; }, jurnal: () => {}, pauza: null };
  const r = await turaCurbaStop(d, st);
  assert.equal(r.facut, false); assert.equal(r.motiv, "trimitere"); assert.equal(disc, null, "fără server ⇒ fără disc"); assert.equal(st.esecLa, acum); assert.ok(!st.la); assert.ok(!st.inLucru);
  const st2 = {}, d2 = Object.assign({}, d, { trimite: async () => {}, binance: async () => { cereri++; await new Promise((x) => setTimeout(x, 2)); return kl; } });
  cereri = 0; const p1 = turaCurbaStop(d2, st2), r2 = await turaCurbaStop(d2, st2);
  assert.equal(r2.facut, false); assert.equal(r2.motiv, "inLucru"); await p1;
  assert.equal(cereri, 21, "a doua tură n-a cerut nimic"); assert.equal(st2.la, acum); assert.ok(!st2.inLucru); assert.ok(disc && disc.la === acum);
});

// ───────────── 7. Consilierul pe bot (el, 08.11: „fa ambele” — și rândul „+24,29 USDT” prins de gardă) ─────────────
await test("Consilierul pe bot: totalul boților cu O zecimală („+24,3 USDT”, nu „+24,29”); suma mică nu iese „0,0”; la fel și fără TextRo (probele vechi)", () => {
  const ist = (ctx, trades) => ctx.Consilier.sfaturiBot({ baza: "STX.PERP" }, { trades: trades.map((r) => ({ moneda: "STX", rezultat: r })), acum: ACUM }).find((x) => x.sursa === "istoric").titlu;
  for (const ctx of [module_("text-ro.js", "consilier.js"), module_("consilier.js")]) {
    const cu = typeof ctx.TextRo !== "undefined" ? "cu TextRo" : "fără TextRo";
    assert.equal(ist(ctx, [12.1, 12.19]), "Pe STX: 2 boți, 2 pe plus, total +24,3 USDT", cu);
    assert.equal(ist(ctx, [1, -2, 1, -2, 1, -2]), "Pe STX: 6 boți, 3 pe plus, total −3,0 USDT", cu);
    assert.equal(ist(ctx, [0.03, 0.01]), "Pe STX: 2 boți, 2 pe plus, total +0,04 USDT", cu + ": suma mică");
    assert.equal(ist(ctx, [1, -1]), "Pe STX: 2 boți, 1 pe plus, total 0,0 USDT", cu + ": zero fără semn");
  }
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}\n`);
if (picate) process.exit(1);
