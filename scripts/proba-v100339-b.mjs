// Proba v100.339-b (auditul Tabloului botului din 13.11, valul B: indicatorii și textele lor). Rulează modulele reale ale paginii.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as TVS from "../functions/_shared/tv-note.js";
import { incarcaMotor, taie } from "./lib/motor-pagina.mjs";
import * as REF from "./lib/indicatori-referinta.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
for (const f of ["tv-note.js", "indicatori-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, IB = G.IndicatoriBot, TvNote = G.TvNote;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.339-b · auditul Tabloului: indicatorii și textele lor · proba\n");
const R = (a, b, c, d) => [["15 min", a], ["1 oră", b], ["4 ore", c], ["1 zi", d]].map(([eticheta, ver]) => ({ eticheta, q: ver ? { ver } : null }));

// ---------------- (A4) „Și 4 ore, și 1 zi” doar cu AMBELE intervale citite ----------------
await test("(A4a) 1 zi fără date, 4 ore împotrivă: nu se spune „Și 4 ore, și 1 zi”; se numește intervalul și se spune ce lipsește", () => {
  const r = IB.rezumat(R("NEUTRAL", "NEUTRAL", "BULLISH", null), "short");
  assert.doesNotMatch(r.text, /Și 4 ore, și 1 zi/); assert.match(r.text, /4 ore arată urcare/); assert.match(r.text, /1 zi n-are (încă )?date/); assert.notEqual(r.ton, "rau");
});
await test("(A4b) control: ambele intervale lungi citite și împotrivă ⇒ fraza rămâne", () => {
  assert.match(IB.rezumat(R("NEUTRAL", "NEUTRAL", "BULLISH", "BULLISH"), "short").text, /Și 4 ore, și 1 zi arată urcare/);
});
await test("(A4c) un singur interval lung împotrivă, celălalt citit: e numit cel împotrivă", () => {
  const r = IB.rezumat(R("NEUTRAL", "NEUTRAL", "NEUTRAL", "BULLISH"), "short"); assert.match(r.text, /1 zi e împotrivă/); assert.doesNotMatch(r.text, /Unul din intervalele lungi \(4 ore \/ 1 zi\)/);
});
await test("(A4d) împotrivă doar pe termen scurt, 4 ore neutru, 1 zi cu botul: „1 zi arată coborâre”, nu „4 ore și 1 zi, care arată”", () => {
  const r = IB.rezumat(R("BULLISH", "NEUTRAL", "NEUTRAL", "BEARISH"), "short"); assert.doesNotMatch(r.text, /4 ore și 1 zi, care arată/); assert.match(r.text, /1 zi arată coborâre/);
  assert.match(IB.rezumat(R("BULLISH", "NEUTRAL", "BEARISH", "BEARISH"), "short").text, /4 ore și 1 zi, care arată coborâre/);
});

// ---------------- (A6) nota TradingView: lanțul de simboluri, motivul lipsei, prețul verificat, culoarea față de bot ----------------
const IV = (all) => ({ "5m": { all, ma: all, osc: all }, "15m": { all, ma: all, osc: all }, "1h": { all, ma: all, osc: all }, "4h": { all, ma: all, osc: all }, "1D": { all, ma: all, osc: all }, "1W": { all, ma: all, osc: all } });
const randScanner = (s, close, all) => { const col = TVS.tvColoane(), d = col.map((c) => (c === "name" ? s.split(":")[1] : c === "exchange" ? s.split(":")[0] : c === "close" ? close : all)); return { s, d }; };
await test("(A6a) serverul: lanțul pentru un bot Pionex = întâi PIONEX:, apoi Binance; monedele „în mii” iau contractul 1000… cu scara lui", () => {
  assert.deepEqual(TVS.tvLantPionex("HYPE_USDT_PERP"), [{ ticker: "PIONEX:HYPEUSDT.P", scara: 1 }, { ticker: "BINANCE:HYPEUSDT.P", scara: 1 }]);
  assert.deepEqual(TVS.tvLantPionex("PEPE_USDT_PERP"), [{ ticker: "PIONEX:PEPEUSDT.P", scara: 1 }, { ticker: "BINANCE:1000PEPEUSDT.P", scara: 1000 }]);
  assert.deepEqual(TVS.tvLantPionex("MOG_USDT_PERP")[1], { ticker: "BINANCE:1000000MOGUSDT.P", scara: 1000000 });
  assert.deepEqual(TVS.tvLantPionex("BTC_USDT"), [{ ticker: "PIONEX:BTCUSDT", scara: 1 }, { ticker: "BINANCE:BTCUSDT", scara: 1 }]);
  assert.deepEqual(TVS.tvLantPionex("ABC_EUR"), []); assert.equal(TVS.tvDinPionex("PEPE_USDT_PERP"), "BINANCE:1000PEPEUSDT.P");
});
await test("(A6b) serverul: cererea duce toți candidații; se alege primul găsit, cu prețul lui și scara; lipsa își spune motivul", () => {
  const tinte = [{ cheie: "HYPE_USDT_PERP", tickere: TVS.tvLantPionex("HYPE_USDT_PERP") }, { cheie: "PEPE_USDT_PERP", tickere: TVS.tvLantPionex("PEPE_USDT_PERP") }, { cheie: "ZZZ_USDT_PERP", tickere: TVS.tvLantPionex("ZZZ_USDT_PERP") }, { cheie: "ABC_EUR", tickere: [] }];
  const cer = TVS.tvCereri(tinte); assert.equal(cer.length, 1); assert.deepEqual(cer[0].corp.symbols.tickers.sort(), ["BINANCE:1000PEPEUSDT.P", "BINANCE:HYPEUSDT.P", "BINANCE:ZZZUSDT.P", "PIONEX:HYPEUSDT.P", "PIONEX:PEPEUSDT.P", "PIONEX:ZZZUSDT.P"]);
  assert.ok(TVS.tvColoane().includes("close"));
  const o = TVS.tvPotriveste(tinte, [{ data: [randScanner("BINANCE:HYPEUSDT.P", 72.8, -0.3), randScanner("PIONEX:HYPEUSDT.P", 72.79, -0.27), randScanner("BINANCE:1000PEPEUSDT.P", 0.0044569, 0.2)] }]);
  assert.equal(o.HYPE_USDT_PERP.tv, "PIONEX:HYPEUSDT.P"); assert.equal(o.HYPE_USDT_PERP.close, 72.79); assert.equal(o.HYPE_USDT_PERP.scara, 1); assert.equal(o.HYPE_USDT_PERP.iv["4h"].all, -0.27);
  assert.equal(o.PEPE_USDT_PERP.tv, "BINANCE:1000PEPEUSDT.P"); assert.equal(o.PEPE_USDT_PERP.scara, 1000);
  assert.equal(o.ZZZ_USDT_PERP.lipsa, "negasit"); assert.deepEqual(o.ZZZ_USDT_PERP.cautat, ["PIONEX:ZZZUSDT.P", "BINANCE:ZZZUSDT.P"]); assert.equal(o.ABC_EUR.lipsa, "nemapat");
});
await test("(A6c) pagina: la pragul ±0,1 / ±0,5 cifra se scrie cu două zecimale (aceeași cifră nu mai apare cu două cuvinte)", () => {
  assert.equal(TvNote.valoare(-0.112), "−0,11"); assert.equal(TvNote.valoare(-0.091), "−0,09"); assert.equal(TvNote.valoare(0.54), "+0,54"); assert.equal(TvNote.valoare(0.3), "+0,3"); assert.equal(TvNote.valoare(-0.8), "−0,8"); assert.equal(TvNote.valoare(0), "0,0");
});
await test("(A6d) pagina: fiecare lipsă își spune motivul; „n-are simbolul” doar când chiar a fost căutat și nu există", () => {
  assert.match(TvNote.tabel({ lipsa: "negasit", cautat: ["PIONEX:ZZZUSDT.P", "BINANCE:ZZZUSDT.P"] }), /TradingView n-are simbolul \(căutat: PIONEX:ZZZUSDT\.P, BINANCE:ZZZUSDT\.P\)/);
  assert.match(TvNote.tabel({ lipsa: "nemapat" }), /nu știu ce simbol TradingView îi corespunde/); assert.match(TvNote.tabel({ lipsa: "nesigur" }), /simbol nesigur/); assert.match(TvNote.tabel({ lipsa: "necerut" }), /n-a fost cerut/);
  assert.doesNotMatch(TvNote.tabel({ lipsa: "nemapat" }), /n-are simbolul ăsta/);
});
await test("(A6e) pagina: prețul din TradingView departe de prețul botului ⇒ fără notă („alt instrument”); la scara 1000 se compară corect", () => {
  const alt = TvNote.tabel({ tv: "BINANCE:XUSDT.P", close: 100, scara: 1, iv: IV(0.6) }, { directie: "short", pret: 72 }); assert.match(alt, /alt instrument/); assert.doesNotMatch(alt, /<table/);
  assert.match(TvNote.tabel({ tv: "BINANCE:XUSDT.P", close: 72.5, scara: 1, iv: IV(0.6) }, { directie: "short", pret: 72 }), /<table/);
  assert.match(TvNote.tabel({ tv: "BINANCE:1000PEPEUSDT.P", close: 0.0044569, scara: 1000, iv: IV(0.6) }, { directie: "long", pret: 0.0000044569 }), /<table/);
});
await test("(A6f) pagina: pe un bot short, „vinde” e colorat ca fiind CU botul, „cumpără” împotrivă; fără bot rămâne sus = verde; legenda e la vedere", () => {
  const sh = TvNote.tabel({ tv: "PIONEX:XUSDT.P", iv: IV(-0.6) }, { directie: "short" }), cump = TvNote.tabel({ tv: "PIONEX:XUSDT.P", iv: IV(0.6) }, { directie: "short" });
  assert.match(sh, /<td class="good"[^>]*><b>vinde tare<\/b>/); assert.match(cump, /<td class="bad"[^>]*><b>cumpără tare<\/b>/);
  assert.match(TvNote.tabel({ tv: "X", iv: IV(0.6) }, {}), /<td class="good"[^>]*><b>cumpără tare<\/b>/);
  assert.match(sh, /verde = cu botul/); assert.match(sh, /bara în curs/); assert.match(sh, /bare închise/);
});
await test("(A6g) pagina: vârsta e a serverului, iar rândurile scurte mai vechi decât intervalul lor sunt estompate", () => {
  const la = Date.UTC(2026, 10, 13, 18, 0), h = TvNote.tabel({ tv: "X", iv: IV(0.2) }, { la, acum: la + 7 * 60000 });
  assert.match(h, /<tr class="tvVechi"[^>]*><th>5m<\/th>/); assert.doesNotMatch(h, /<tr class="tvVechi"[^>]*><th>15m<\/th>/); assert.match(h, /acum 7 min/);
});
await test("(A6h) banda: „≠” doar când nota TradingView e limpede (|nota| ≥ 0,3), nu la −0,11 lângă un Radar la un fir de prag", () => {
  const b = [{ eticheta: "4 ore", ver: "BULLISH" }], n = (v) => ({ iv: { "4h": { all: v } } });
  assert.equal(IB.tvBanda(n(-0.11), b, TvNote.clasa)[0].diferit, false); assert.equal(IB.tvBanda(n(-0.4), b, TvNote.clasa)[0].diferit, true);
});
await test("(A6j) T212: și banda „Detaliile indicatorilor” ține garda simbolului nesigur (găsit după nume sau cu bare nepotrivite) - nota altei firme nu ajunge în bandă", () => {
  const T2 = citeste("public", "lib", "t212-ecran.js"), src = taie(T2, "t212TvNesigur"); assert.ok(src, "t212TvNesigur");
  const mk = (cod) => { const c = { t212: { dupaNume: { DUPA_US_EQ: true }, poz: [{ ticker: "AAA_US_EQ", currentPrice: 10 }, { ticker: "BBB_US_EQ", currentPrice: 20 }], bare: { AAA_US_EQ: [{ c: 10 }], BBB_US_EQ: [{ c: 900 }] } },
    ActiuniSemnale: { verificaBare: (b, pret, tk) => ({ cod: tk === "BBB_US_EQ" ? cod : "ok" }) }, t212Pozitie: (x) => ({ pret: x.currentPrice }), Date }; vm.createContext(c); vm.runInContext(src, c); return c; };
  const c = mk("nepotrivit");
  assert.equal(c.t212TvNesigur("DUPA_US_EQ"), true, "găsit după nume"); assert.equal(c.t212TvNesigur("BBB_US_EQ"), true, "bare ale altui simbol"); assert.equal(c.t212TvNesigur("AAA_US_EQ"), false); assert.equal(c.t212TvNesigur("NU_E_US_EQ"), false, "fără poziție: nu inventează");
  assert.equal(mk("vechi").t212TvNesigur("BBB_US_EQ"), false, "barele vechi nu fac simbolul nesigur");
  assert.match(T2, /t212IndHtml\(tk, l, t212Istoric4hGata\(tk\), t212\.tv && t212\.tv\.note && !t212TvNesigur\(tk\) \? t212\.tv\.note\[tk\] : null, sch,/);
  assert.match(T2, /if \(t212TvNesigur\(p\.ticker\) \|\| p\.bareCod === "nepotrivit"\) return \{ lipsa: "nesigur" \};/, "rândul și fișa folosesc aceeași gardă");
});
await test("(A6i) T212: pe simbol nesigur rândul listei spune „simbol nesigur”, nu o notă", () => {
  assert.match(TvNote.mic({ lipsa: "nesigur" }, "1D"), /TV: — simbol nesigur/); assert.equal(TvNote.mic({ lipsa: "negasit" }, "1D"), "");
});

// ---------------- (B) indicatorii: calculul paginii rulat din app.js ----------------
const M = incarcaMotor({ extra: ["stochPret"] }), calc = (j) => M.c.calc(j, "auto");
// bare în forma lui calc: [t, o, h, l, c, v, tÎnchidere, vQuote], din închideri date
const bareDin = (inchideri, lat = 0.4) => inchideri.map((p, i) => [i * 3600000, String(i ? inchideri[i - 1] : p), String(Math.max(p, i ? inchideri[i - 1] : p) + lat), String(Math.min(p, i ? inchideri[i - 1] : p) - lat), String(p), "1000", i * 3600000 + 1, String(1000 * p)]);
// 300 de bare: urcare lungă, apoi cădere în ultimele 12 bare și o revenire mică a RSI-ului din fund ⇒ prețul jos în interval, Stoch RSI sus
const SERIE = (() => { const a = []; for (let i = 0; i < 280; i++) a.push(100 + i * 0.2 + 2 * Math.sin(i / 5)); let p = a[a.length - 1]; for (let k = 0; k < 14; k++) { p -= 1.6; a.push(p); } for (let k = 0; k < 6; k++) { p += 0.35; a.push(p); } return a; })();
await test("(B1a) rândul „Stochastic” e Stochasticul PREȚULUI %K(14, 3), socotit ca în TradingView; Stoch RSI are rândul lui, netezit", () => {
  const j = bareDin(SERIE), q = calc(j), n = j.length, H = j.map((x) => +x[2]), L = j.map((x) => +x[3]), C = j.map((x) => +x[4]);
  const brut = (i) => { const hh = Math.max(...H.slice(i - 13, i + 1)), ll = Math.min(...L.slice(i - 13, i + 1)); return (C[i] - ll) / (hh - ll) * 100; };
  const k3 = (brut(n - 1) + brut(n - 2) + brut(n - 3)) / 3;
  assert.ok(Math.abs(q.stochK - k3) < 1e-9, q.stochK + " ≠ " + k3); assert.ok(q.stochK < 45, "premisa: prețul e jos în interval: " + q.stochK); assert.ok(q.stoch > 70, "premisa: Stoch RSI brut e sus: " + q.stoch);
  const c = IB.celule(q); assert.equal(c.stoch.t, String(Math.round(q.stochK))); assert.equal(c.stochRsi.t, String(Math.round(q.stochRsiK)));
  const r = Object.fromEntries(IB.RANDURI.map((x) => [x.k, x])); assert.match(r.stoch.titlu, /prețul/); assert.match(r.stochRsi.titlu, /RSI-ul/); assert.equal(r.stochRsi.eticheta, "Stoch RSI");
});
await test("(B1b) scorul rămâne pe intrarea veche (Stoch RSI brut): impulsul recalculat din câmpurile lui dă aceeași cifră", () => {
  const j = bareDin(SERIE), q = calc(j), C = j.map((x) => +x[4]), i = C.length - 1, roc10 = (C[i] / C[i - 10] - 1) * 100;
  let m = 50; m += q.rsi >= 55 ? 10 : q.rsi <= 45 ? -10 : 0; m += q.macd ? 13 : -13; m += roc10 > 0 ? 10 : -10; m += q.stoch > 55 ? 7 : q.stoch < 45 ? -7 : 0; m = Math.max(0, Math.min(100, m));
  assert.equal(q.momScore, m);
});
await test("(B2) explicația verdictului spune pragul adevărat (din q.prag), nu „~60 / ~40”; Supertrend își scrie parametrii", () => {
  const r = Object.fromEntries(IB.RANDURI.map((x) => [x.k, x])); assert.doesNotMatch(r.verdict.titlu, /~60|~40/); assert.match(r.verdict.titlu, /prag/); assert.match(r.verdict.titlu, /Bollinger și MFI nu intră/);
  assert.match(r.supertrend.titlu, /ATR 14/); assert.match(r.supertrend.titlu, /TradingView/);
  const c = IB.celule({ ver: "NEUTRAL", score: 61, prag: 66 }); assert.match(c.verdict.titlu, /urcă de la 66 în sus, coboară de la 34 în jos/);
});
await test("(B3) banda numără trei familii (trend, impuls, poziție), fiecare o dată, nu opt indicatori", () => {
  const q = { ver: "NEUTRAL", score: 50, prag: 66, e20Now: 3, e50Now: 2, e200Now: 1, e200Valid: true, supertrend: "BULL", adx: 30, pdi: 30, mdi: 10, macd: false, rsi: 40, mfi: 40, stochRsiK: 30, stochK: 50, bbpos: 50 };
  const b = IB.banda([{ eticheta: "4 ore", q }], "short")[0];
  assert.equal(b.total, 3); assert.equal(b.cu, 1); assert.equal(b.contra, 1); assert.equal(b.neutru, 1);
  assert.deepEqual(b.familii.map((f) => f.k + ":" + f.dir), ["trend:sus", "impuls:jos", "pozitie:neutru"]); assert.match(b.numeCu[0], /^impuls \(/); assert.match(b.numeContra[0], /^trend \(.*Supertrend ↑/);
  assert.match(IB.bandaHtml(IB.banda([{ eticheta: "4 ore", q }], "short"), null, null, "short"), /trei familii/);
});
await test("(B5) sub 200 de bare „EMA 200” nu se judecă: celula spune asta, iar scorul nu ia cele ±13 puncte ale ei", () => {
  const scurt = calc(bareDin(SERIE.slice(-150))), lung = calc(bareDin(SERIE));
  assert.equal(scurt.bare, 150); assert.equal(scurt.e200Valid, false); assert.equal(lung.e200Valid, true);
  const c = IB.celule(scurt); assert.match(c.ema.titlu, /sub 200 de bare/); assert.notEqual(c.ema.c, "good"); assert.notEqual(c.ema.c, "bad");
  // trendul fără termenul EMA50 / EMA200: 50 ± 9 ± 11 ± 12 ± 5 ⇒ restul la 2 e impar față de varianta cu ±13
  const paritate = (scurt.trendScore - 50 - 9 - 11 - 12 - 5) % 2; assert.equal(Math.abs(paritate), 0, "trendScore " + scurt.trendScore + " conține încă ±13");
});
await test("(B6) preț pe loc / volum zero / bare fără maxim sau minim: „—”, nu „încins” / „epuizat”", () => {
  const plat = calc(Array.from({ length: 300 }, (_, i) => [i * 3600000, "50", "50", "50", "50", "0", i * 3600000 + 1, "0"])); assert.equal(plat.plat, true);
  const c = IB.celule(plat); for (const k of ["rsi", "stoch", "stochRsi", "bb", "mfi", "macd"]) { assert.equal(c[k].t, "—", k + " = " + c[k].t); assert.equal(c[k].c, "lipsa"); }
  const r = IB.dinPionex([{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 3 }, { time: 2, open: 1, high: null, low: 0.5, close: 1.5, volume: 3 }, { time: 3, open: 1, high: 2, low: "x", close: 1.5, volume: 3 }]);
  assert.equal(r.length, 1, "barele fără maxim / minim se aruncă (altfel ATR devine NaN până la capăt)");
});
await test("(B7) lângă prag, scorul din tabel are o zecimală (65,6 cu pragul 66 nu e „↔ 66”)", () => {
  assert.equal(IB.celule({ ver: "NEUTRAL", score: 65.6, prag: 66 }).verdict.t, "↔ 65,6"); assert.equal(IB.celule({ ver: "BULLISH", score: 71.2, prag: 66 }).verdict.t, "↑ 71");
});
await test("(B8) zone neutre: RSI 45–55 fără culoare; ADX se colorează doar cu +DI și −DI la cel puțin un punct distanță; Bollinger „lipit” de la 95% / 5%", () => {
  const c = (o) => IB.celule(Object.assign({ ver: "NEUTRAL", score: 50, prag: 66 }, o));
  assert.equal(c({ rsi: 50.4 }).rsi.c, "neutral"); assert.equal(c({ rsi: 56 }).rsi.c, "good"); assert.equal(c({ rsi: 44 }).rsi.c, "bad");
  assert.equal(c({ adx: 30, pdi: 20.01, mdi: 20 }).adx.c, "neutral"); assert.equal(c({ adx: 30, pdi: 24, mdi: 20 }).adx.c, "good");
  assert.equal(c({ bbpos: 85 }).bb.c, "good"); assert.doesNotMatch(c({ bbpos: 85 }).bb.titlu, /lipit/); assert.equal(c({ bbpos: 96 }).bb.c, "tbWarn"); assert.match(c({ bbpos: 96 }).bb.titlu, /lipit de banda de sus/); assert.equal(c({ bbpos: 4 }).bb.c, "tbWarn");
});
await test("(B9) graficul mic: fiecare bară își ține verdictul de atunci, iar barele cu direcție sunt punctate (nu judecate cu pragul de azi)", () => {
  const ist = [{ s: 65, prag: 64, ver: "BULLISH" }, { s: 60, prag: 67, ver: "NEUTRAL" }, { s: 30, prag: 67, ver: "BEARISH" }, { s: 50, prag: 67, ver: "NEUTRAL" }];
  const h = IB.sparkHtml(ist, "short"); assert.equal((h.match(/class="ibSpPct /g) || []).length, 2); assert.match(h, /ibSpPctContra/); assert.match(h, /ibSpPctCu/); assert.match(h, /punctele = barele cu direcție/);
  const j = bareDin(SERIE); assert.ok(IB.istoricScor(j, 3, calc).every((x) => typeof x.ver === "string"));
});
await test("(B4 + B10 + B11) tabelul din pagină: culoarea e față de bot (la short „↓” e verde), cu legendă; explicația se poate atinge; „ADX · RSI (cu bara de acum)”", () => {
  const APP = citeste("public", "app.js"), src = taie(APP, "tbIndTabelHtml"); assert.ok(src, "tbIndTabelHtml");
  const c = { IndicatoriBot: IB, escapeHtml: G.escapeHtml, TextRo: G.TextRo }; vm.createContext(c); vm.runInContext(src, c);
  const q = { ver: "BEARISH", score: 30, prag: 66, supertrend: "BEAR", macd: false, rsi: 40 }, l = [{ eticheta: "4 ore", q, hp: null }];
  const sh = c.tbIndTabelHtml(l, "short"), lg = c.tbIndTabelHtml(l, "long"), fara = c.tbIndTabelHtml(l, null);
  assert.match(sh, /<td class="good"[^>]*>↓ 30<\/td>/); assert.match(lg, /<td class="bad"[^>]*>↓ 30<\/td>/); assert.match(fara, /<td class="bad"[^>]*>↓ 30<\/td>/);
  assert.match(sh, /verde = cu botul \(short\)/); assert.doesNotMatch(fara, /verde = cu botul/); assert.match(sh, /class="tbSub tbIndExplic" hidden/); assert.match(sh, /Atinge o celulă/);
  assert.match(APP, /<th>ADX · RSI <small>\(cu bara de acum\)<\/small><\/th>/);
});

// ---------------- (B12) ce e nedovedit nu apare cu verde ----------------
await test("(B12a) rândul ADX din citire: „piața stă pe loc (vremea gridului)” e informație, nu bifă verde", () => {
  const GB = new Function(citeste("public", "lib", "grafic-bot.js") + "; return GraficBot;")();
  const B = Array.from({ length: 80 }, (_, i) => { const c = 100 + 0.2 * Math.sin(i / 2); return { t: i * 900000, o: c, h: c + 0.15, l: c - 0.15, c, v: 10 }; });
  const o = GB.intrareBot({ bot: { id: "x", directie: "long" }, bare: B, W: 900, TabloExtra: null });
  const r = GB.citire(o, { directie: "long" }, B[B.length - 1].c).randuri.find((x) => x.ce === "ADX 14");
  assert.match(r.text, /piața stă pe loc/, "premisa: ADX sub 20 · " + r.text); assert.equal(r.stare, "info");
});
await test("(B12b) regimul macro în citirea botului: informație (e măsurat pe S&P, nu pe moneda botului), oricare ar fi treapta", () => {
  const APP = citeste("public", "app.js"), src = taie(APP, "tbMacroRand"); assert.ok(src, "tbMacroRand");
  for (const st of ["bine", "atentie", "info"]) {
    const c = { macroCitire: () => ({ ce: "Regim macro", stare: st, text: "risk-on (scor +2)" }), Object }; vm.createContext(c); vm.runInContext(src, c);
    const r = c.tbMacroRand(); assert.equal(r.stare, "info"); assert.match(r.text, /^risk-on \(scor \+2\) · nemăsurat pe crypto/); assert.equal(r.actiune, "navTo('dash',true)");
  }
  assert.match(APP, /out\.macro=macroStare\.la\?tbMacroRand\(\):null/);
});

// ---------------- (D1) regimul profilului, cu histerezis ----------------
await test("(D1a) regimul „trend” intră la ADX 27 și iese abia sub 24; „agitat” intră la percentila 80 și iese abia sub 70 - fără sărituri la prag", () => {
  const D = incarcaMotor({ extra: ["regimProfil", "profilDinRegim"] }).c, n = 80, atr = Array(n).fill(1), c = Array(n).fill(100);
  let perc = Array(n).fill(10); D.atrPctMare = (a, cc, k) => ({ percentila: perc[k], mare: perc[k] >= 80 });
  const adx = Array(n).fill(15); adx[76] = 27.5; adx[77] = 25; adx[78] = 24.2; adx[79] = 23.5;
  assert.equal(D.regimProfil(atr, c, adx, 76), "trend"); assert.equal(D.regimProfil(atr, c, adx, 77), "trend", "25 după 27,5: încă trend (fără memorie ar fi calm)");
  assert.equal(D.regimProfil(atr, c, adx, 78), "trend"); assert.equal(D.regimProfil(atr, c, adx, 79), "calm");
  const jos = Array(n).fill(15); perc = Array(n).fill(10); perc[77] = 81; perc[78] = 74; perc[79] = 69;
  assert.equal(D.regimProfil(atr, c, jos, 77), "agitat"); assert.equal(D.regimProfil(atr, c, jos, 78), "agitat", "74 după 81: încă agitat"); assert.equal(D.regimProfil(atr, c, jos, 79), "calm");
  assert.equal(JSON.stringify(D.profilDinRegim("trend")), JSON.stringify(D.profileParams("auto", false, 30))); assert.equal(JSON.stringify(D.profilDinRegim("agitat")), JSON.stringify(D.profileParams("auto", true, 10))); assert.equal(JSON.stringify(D.profilDinRegim("calm")), JSON.stringify(D.profileParams("auto", false, 10)));
});
await test("(D1b) calc folosește regimul cu histerezis în modul „auto” și îl spune (q.regimProfil); cu opt.faraHisterezis dă regula fără memorie", () => {
  const j = bareDin(SERIE), q = calc(j), v1 = M.c.calc(j, "auto", { faraHisterezis: true });
  assert.ok(["trend", "agitat", "calm"].includes(q.regimProfil), String(q.regimProfil)); assert.equal(v1.regimProfil, null);
  assert.ok([64, 66, 67].includes(q.prag) && [64, 66, 67].includes(v1.prag)); assert.equal(M.c.calc(j, "swing").prag, 64, "modurile fixe rămân fixe");
});

// ---------------- (D3) cât de des nimerește, la vedere; fără roșu / verde pe „susțin / nu susțin” ----------------
await test("(D3) rezumatul indicatorilor nu mai dă roșu / verde (direcția lui e nedovedită); nota de sub tabel și nota TradingView spun cât de des a fost nimerită direcția", () => {
  assert.equal(IB.rezumat(R("NEUTRAL", "NEUTRAL", "BULLISH", "BULLISH"), "short").ton, "atentie"); assert.equal(IB.rezumat(R("BEARISH", "BEARISH", "BEARISH", "BEARISH"), "short").ton, "neutru");
  assert.match(IB.MASURAT_DIRECTIE, /nimerită după 4 bare în \d+–\d+ din 100 de cazuri \(măsurat 13\.11\.2026, 21 de monede\): nedovedit/);
  const APP = citeste("public", "app.js"), src = taie(APP, "tbIndTabelHtml"), c = { IndicatoriBot: IB, escapeHtml: G.escapeHtml, TextRo: G.TextRo }; vm.createContext(c); vm.runInContext(src, c);
  assert.ok(c.tbIndTabelHtml([{ eticheta: "4 ore", q: { ver: "BEARISH", score: 30, prag: 66 }, hp: null }], "short").includes(G.escapeHtml(IB.MASURAT_DIRECTIE)));
  assert.match(TvNote.tabel({ tv: "X", iv: IV(0.2) }, {}), /direcția lui, măsurată cu formula ei refăcută, pe bare închise \(crypto\): 48–49 din 100 \(nedovedit\)/);
});

// ---------------- (D1) verdictul confirmat pe două bare închise ----------------
await test("(D1c) confirmarea: verdictul se schimbă abia când două bare închise la rând zic la fel; până atunci rămâne cel dinainte (sau neutru), cu „⏳”", () => {
  const cf = (a, b, c) => { const r = IB.confirma(a, b, c); return r.ver + "|" + (r.neconfirmat || ""); };
  assert.equal(cf("BULLISH", "BULLISH", "NEUTRAL"), "BULLISH|"); assert.equal(cf("BULLISH", "NEUTRAL", "NEUTRAL"), "NEUTRAL|BULLISH");
  assert.equal(cf("NEUTRAL", "BULLISH", "BULLISH"), "BULLISH|NEUTRAL", "o singură bară neutră nu șterge direcția"); assert.equal(cf("BULLISH", "NEUTRAL", "BEARISH"), "NEUTRAL|BULLISH"); assert.equal(cf("BEARISH", null, null), "BEARISH|", "fără barele dinainte: verdictul barei");
  const c = IB.celule({ ver: "NEUTRAL", verBrut: "BULLISH", neconfirmat: "BULLISH", score: 70, prag: 66 }).verdict; assert.equal(c.t, "↔ 70⏳"); assert.match(c.titlu, /pe ultima bară scorul zice „urcă”: aștept a doua bară închisă/);
  const t = IB.celule({ ver: "BEARISH", score: 30, prag: 66, tineDe: 5, miscatDe: { nume: "impulsul", d: -14 } }).verdict; assert.match(t.titlu, /ține de 5 bare/); assert.doesNotMatch(t.titlu, /l-a mișcat/, "componenta se spune doar la o schimbare");
  assert.match(IB.celule({ ver: "NEUTRAL", verBrut: "BEARISH", neconfirmat: "BEARISH", score: 33, prag: 66, miscatDe: { nume: "impulsul", d: -14 } }).verdict.titlu, /l-a mișcat impulsul \(−14\)/);
  const b = IB.banda([{ eticheta: "4 ore", q: { ver: "NEUTRAL", verBrut: "BULLISH", neconfirmat: "BULLISH", score: 70, prag: 66 } }], "long")[0]; assert.equal(b.neconfirmat, "BULLISH"); assert.match(IB.bandaHtml([b], null, null, "long"), /<span class="ibVer">↔ 70⏳<\/span>/);
});
await test("(D1d) pagina: barele dinainte se socotesc o singură dată pe bară închisă, după desen; apoi verdictul arătat e cel confirmat", () => {
  const APP = citeste("public", "app.js"), src = taie(APP, "tbVerdictConfirmat"); assert.ok(src, "tbVerdictConfirmat");
  let chemari = 0; const amanate = [], c = { IndicatoriBot: IB, tbVerAnt: { simbol: null, pe: {} }, tbStare: { directie: null }, calc: (j) => { chemari++; return { ver: j.length >= 99 ? "NEUTRAL" : "BULLISH", trendScore: 50, momScore: 40, volScore: 50, structureScore: 50 }; }, setTimeout: (f) => amanate.push(f), renderTabloDirectia() {}, renderTabloIndicatori() {}, Object, Math };
  vm.createContext(c); vm.runInContext("var tbVerAnt={simbol:null,pe:{}};" + src, c);
  const j = Array.from({ length: 100 }, (_, i) => [i * 3600000]), q = { ver: "BULLISH", score: 70, prag: 66, trendScore: 50, momScore: 60, volScore: 50, structureScore: 50 };
  c.tbStare.directie = { simbol: "X|long", indicatori: [{ tf: "60M", q }] };
  c.tbVerdictConfirmat("60M", j, q, "X|long"); assert.equal(q.ver, "BULLISH", "înainte de socoteală: verdictul barei"); assert.equal(amanate.length, 1); assert.equal(chemari, 0, "nimic pe loc");
  amanate.shift()(); assert.equal(chemari, 2); assert.equal(q.ver, "NEUTRAL", "bara dinainte zicea neutru ⇒ direcția așteaptă a doua bară"); assert.equal(q.neconfirmat, "BULLISH"); assert.equal(q.miscatDe.nume, "impulsul");
  const q2 = { ver: "BULLISH", score: 71, prag: 66 }; c.tbVerdictConfirmat("60M", j, q2, "X|long"); assert.equal(chemari, 2, "aceeași bară ⇒ din memorie"); assert.equal(q2.ver, "NEUTRAL");
});

// ---------------- (E1) formulele paginii față de o referință independentă ----------------
await test("(E1) calc dă aceleași cifre ca referința scrisă de la zero (definițiile TradingView / Wilder): RSI, MACD, ADX / ±DI, Bollinger %B, MFI, Stochastic, Stoch RSI", () => {
  const j = bareDin(SERIE), q = calc(j), n = j.length - 1, Hh = j.map((x) => +x[2]), Ll = j.map((x) => +x[3]), Cc = j.map((x) => +x[4]), Vv = j.map((x) => +x[5]);
  const aproape = (a, b, tol, ce) => assert.ok(Math.abs(a - b) <= tol, ce + ": pagina " + a + " · referința " + b);
  aproape(q.rsi, REF.rsi(Cc)[n], 0.05, "RSI"); assert.equal(q.macd, REF.macd(Cc).h[n] > 0, "semnul histogramei MACD");
  const D = REF.dmi(Hh, Ll, Cc); aproape(q.adx, D.adx[n], 0.3, "ADX"); aproape(q.pdi, D.pdi[n], 0.3, "+DI"); aproape(q.mdi, D.mdi[n], 0.3, "−DI");
  aproape(q.bbpos, REF.bb(Cc).pctB[n], 0.01, "Bollinger %B"); aproape(q.mfi, REF.mfi(Hh, Ll, Cc, Vv)[n], 0.05, "MFI");
  aproape(q.stochK, REF.stoch(Hh, Ll, Cc).k[n], 1e-6, "Stochastic %K(14, 3)"); aproape(q.stochRsiK, REF.stochRsi(Cc).k[n], 0.5, "Stoch RSI K");
});

await test("(D1e) „ține de N bare”: pe 4 ore, câte bare închise la rând au același verdict ca ultima (din istoria scorului); fără istorie nu inventează", () => {
  const APP = citeste("public", "app.js"), src = taie(APP, "tbTineDe"); assert.ok(src, "tbTineDe");
  const c = { tbIstoric4hGata: () => [{ ver: "NEUTRAL" }, { ver: "BEARISH" }, { ver: "BEARISH" }, { ver: "BEARISH" }], Array }; vm.createContext(c); vm.runInContext(src, c);
  const q = { ver: "BEARISH" }; c.tbTineDe({ simbol: "X|short", indicatori: [{ tf: "60M", q: { ver: "BEARISH" } }, { tf: "4H", q }] }); assert.equal(q.tineDe, 3);
  const q2 = { ver: "NEUTRAL", verBrut: "BULLISH" }; c.tbTineDe({ simbol: "X|short", indicatori: [{ tf: "4H", q: q2 }] }); assert.equal(q2.tineDe, undefined, "bara de acum zice altceva decât istoria: nu se numără");
  c.tbIstoric4hGata = () => null; const q3 = { ver: "BEARISH" }; c.tbTineDe({ simbol: "X|short", indicatori: [{ tf: "4H", q: q3 }] }); assert.equal(q3.tineDe, undefined);
  assert.match(APP, /renderTabloTrend\(\);[^\n]*\n  var b=tbStare\.routeOk===false\?null:tbStare\.bot,d=tbStare\.directie,[^\n]*\n  tbTineDe\(d\);/);
});

// ---------------- revizia independentă (14.11) ----------------
await test("(B13a) estimarea din situații asemănătoare: banda e pe cuantila Student (mai lată decât 1,96), nu pe aproximarea normală; varianta de măsurătoare păstrează 1,96", () => {
  const j = bareDin(Array.from({ length: 420 }, (_, i) => 100 + 6 * Math.sin(i / 7) + 3 * Math.sin(i / 23) + i * 0.01)), HP = M.c.historicalProbability;
  const r = HP(j, 4), n2 = HP(j, 4, { bandaNormala: true }); assert.ok(r && n2, "fără estimare");
  const normala = 1.96 * Math.sqrt(0.25 / Math.max(1, r.nEff)) * 100; assert.ok(r.banda > normala * 1.02, "banda " + r.banda + " față de cea normală " + normala);
  const gl = Math.max(1, r.nEff - 1), zT = 1.96 + (1.96 ** 3 + 1.96) / (4 * gl) + (5 * 1.96 ** 5 + 16 * 1.96 ** 3 + 3 * 1.96) / (96 * gl * gl); assert.ok(Math.abs(r.banda - zT * Math.sqrt(0.25 / Math.max(1, r.nEff)) * 100) < 1e-9);
  assert.ok(Math.abs(n2.banda - 1.96 * Math.sqrt(0.25 / Math.max(1, n2.nEff)) * 100) < 1e-9, "bandaNormala rămâne pe 1,96");
  assert.equal(r.inBanda, Math.abs(r.up - 50) <= r.banda); assert.equal(r.ver === "NEUTRAL" || !r.inBanda, true, "în bandă ⇒ fără culoare");
});
await test("(B13b) vecinii estimării stau la cel puțin un orizont unul de altul (rezultatele lor nu se suprapun), cel mult 20; regula veche îi lua și lipiți", () => {
  const j = bareDin(Array.from({ length: 420 }, (_, i) => 100 + 6 * Math.sin(i / 7) + 3 * Math.sin(i / 23) + i * 0.01)), HP = M.c.historicalProbability;
  for (const h of [4, 8]) { const r = HP(j, h, { detalii: true }); assert.ok(Array.isArray(r.vecini) && r.vecini.length === r.k && r.k <= 20 && r.k >= 5, "vecini: " + JSON.stringify(r && r.vecini));
    const s = r.vecini.slice().sort((a, b) => a - b); for (let i = 1; i < s.length; i++) assert.ok(s[i] - s[i - 1] >= h, "orizont " + h + ": vecinii " + s[i - 1] + " și " + s[i] + " se suprapun");
    assert.ok(Math.max(...s) + h <= j.length - 1, "vecinul își vede rezultatul în trecut"); }
  assert.equal(HP(j, 4).vecini, undefined, "fără opt.detalii nu se întoarce lista");
});
await test("(B13c) randamentul zero nu e „coborâre”: pe bare identice estimarea iese 50 / 50, în bandă, fără culoare (înainte: „↓100%”)", () => {
  const plat = Array.from({ length: 500 }, (_, i) => [i * 3600000, "100", "100", "100", "100", "1000", i * 3600000 + 1, "100000"]), r = M.c.historicalProbability(plat, 4);
  if (r) { assert.equal(r.up, 50, "up " + r.up); assert.equal(r.inBanda, true); assert.equal(r.ver, "NEUTRAL"); }
  // jumătate din vecini pe zero, restul în sus: zerourile se împart, nu se numără „jos”
  const trepte = bareDin(Array.from({ length: 420 }, (_, i) => 100 + Math.floor(i / 8) * 0.5), 0), r2 = M.c.historicalProbability(trepte, 4);
  if (r2) assert.ok(r2.up >= 50, "pe o scară care doar urcă sau stă, „sus” nu poate ieși sub 50: " + r2.up);
});
await test("(B14) rezumatul fără intervalele lungi: cu 4 ore și 1 zi fără date nu mai spune „contează 4 ore și 1 zi” ca și cum le-ar fi citit", () => {
  const I = IndicatoriBot, R = (et, ver) => ({ eticheta: et, q: { ver } });
  const scurte = I.rezumat([R("15 min", "BULLISH"), R("1 oră", "BULLISH")], "short");
  assert.match(scurte.text, /4 ore și 1 zi n-au încă date/); assert.doesNotMatch(scurte.text, /contează 4 ore și 1 zi\.$/); assert.equal(scurte.ton, "atentie");
  const cuBotul = I.rezumat([R("15 min", "BEARISH"), R("1 oră", "NEUTRAL")], "short"); assert.match(cuBotul.text, /4 ore și 1 zi n-au încă date/); assert.equal(cuBotul.ton, "neutru");
  const una = I.rezumat([R("15 min", "BULLISH"), R("1 oră", "NEUTRAL"), R("4 ore", "BEARISH")], "short"); assert.match(una.text, /4 ore arată coborâre/); assert.match(una.text, /1 zi n-are încă date/);
  // cu amândouă citite, fraza veche rămâne
  assert.match(I.rezumat([R("15 min", "BULLISH"), R("1 oră", "NEUTRAL"), R("4 ore", "BEARISH"), R("1 zi", "BEARISH")], "short").text, /contează 4 ore și 1 zi, care arată coborâre\.$/);
});
await test("(A6k) nota TradingView: culoarea în oglindă la long; prețul lipsă din TradingView se spune; „alt instrument” scrie prețurile cu virgulă; pe fișa unei acțiuni cifra măsurată e a crypto-ului, spusă ca atare", () => {
  const n = { tv: "PIONEX:ABCUSDT.P", iv: { "4h": { all: 0.6, ma: 0.4, osc: -0.3 } }, close: 10, scara: 1 };
  const lg = TvNote.tabel(n, { directie: "long", pret: 10 }), sh = TvNote.tabel(n, { directie: "short", pret: 10 });
  assert.match(lg, /<td class="good" title="cumpără tare/); assert.match(sh, /<td class="bad" title="cumpără tare/); assert.match(lg, /<td class="bad" title="vinde/); assert.match(sh, /<td class="good" title="vinde/);
  assert.match(lg, /culoarea: verde = cu botul \(long\), roșu = împotrivă/);
  const fara = TvNote.tabel(Object.assign({}, n, { close: null }), { directie: "short", pret: 10 }); assert.match(fara, /prețul din TradingView n-a venit: instrument neverificat/); assert.doesNotMatch(lg, /instrument neverificat/);
  const alt = TvNote.tabel(Object.assign({}, n, { close: 0.000012 }), { directie: "short", pret: 0.5 }); assert.match(alt, /alt instrument: la TradingView PIONEX:ABCUSDT\.P are prețul 0,0000120, al tău e 0,500\./); assert.doesNotMatch(alt, /\d\.\d/);
  const act = TvNote.tabel({ tv: "NASDAQ:AAPL", iv: n.iv }, { directie: "long", cu: "poziția", actiuni: true });
  assert.match(act, /direcția lui: pe acțiuni nemăsurată \(pe crypto, cu formula ei refăcută pe bare închise: 48–49 din 100, nedovedit\)/); assert.doesNotMatch(act, /măsurată cu formula ei refăcută, pe bare închise \(crypto\)/);
  const T2 = citeste("public", "lib", "t212-ecran.js"); assert.match(T2, /TvNote\.tabel\(t212NotaTv\(p\), \{ directie: "long", cu: "poziția", actiuni: true, la:/);
  assert.match(IndicatoriBot.MASURAT_DIRECTIE, /nota TradingView \(formula ei, refăcută pe bare închise\)/); assert.match(IndicatoriBot.MASURAT_DIRECTIE_ACT, /pe acțiuni n-a fost măsurată; pe crypto/);
  assert.match(citeste("public", "app.js"), /escapeHtml\(\(opt\.vorbe\?IndicatoriBot\.MASURAT_DIRECTIE_ACT:IndicatoriBot\.MASURAT_DIRECTIE\)\|\|""\)/, "fișa acțiunii poartă varianta ei");
});
await test("(A6l) răspunsul întârziat al monedei de dinainte nu mai suprascrie nota monedei de acum", async () => {
  const APP = citeste("public", "app.js"), src = taie(APP, "tbAduTv"); assert.ok(src, "tbAduTv");
  const cereri = [], d = { simbol: "A|short" }, c = { tbStare: { directie: d }, renderTabloTv() {}, renderTabloIndicatori() {}, textEroare: String, encodeURIComponent, Number, Date,
    getJSON: (u) => new Promise((ok) => cereri.push({ u, ok })) }; vm.createContext(c); vm.runInContext(src, c);
  c.tbAduTv(d, "A_USDT_PERP", "A|short"); d.simbol = "B|short"; c.tbAduTv(d, "B_USDT_PERP", "B|short");
  cereri[1].ok({ note: { B_USDT_PERP: { tv: "PIONEX:BUSDT.P", iv: {} } }, la: 5 }); await new Promise((r) => setTimeout(r, 5)); assert.equal(d.tv.simbol, "B|short");
  cereri[0].ok({ note: { A_USDT_PERP: { tv: "PIONEX:AUSDT.P", iv: {} } }, la: 4 }); await new Promise((r) => setTimeout(r, 5));
  assert.equal(d.tv.simbol, "B|short", "nota lui A a suprascris-o pe a lui B"); assert.equal(d.tv.n.tv, "PIONEX:BUSDT.P");
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
