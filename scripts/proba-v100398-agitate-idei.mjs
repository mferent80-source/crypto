// Proba v100.398 (28.11.2026, el după v100.397: „fa idei” ⇒ I-972…I-975 din backlog, pagina „Agitate acum”):
//   A. formulele noi (public/lib/agitate.js): regula „s-a aprins”, amplitudinea de pe Binance, „peste Binance”
//   B. pagina: semnul „peste Binance” (I-973), legătura „Grafic ↗” spre TradingView + garda de antete cu legături de NAVIGARE (I-974),
//      blocul „Aprinse în ultimele 24 h” din ce scrie colectorul (I-972)
//   C. Tabloul botului: rândul „Agitată acum” (I-975)
//   D. colectorul (scripts/lib/tura-agitate.mjs, I-972): lista o dată pe minut, lumânările cu buget, aprinderea confirmată pe lumânări
//      proaspete, un mesaj pe tură, o dată pe monedă la 24 h, plafonul pe zi; ruta action=agitate; legarea în colector
// REGULA ALERTEI: scrisă ÎNAINTE de orice cifră (28.11.2026 10:10) cu ≥ 3% și ≥ 3×; după măsurătoarea FRECVENȚEI (18,8 mesaje pe zi, bugetul
// ~5) schimbată o dată: pe o oră ≥ 5% ȘI ≥ 3× obișnuitul monedei, iar mișcarea pieței întregi = un singur mesaj (jurnalul: public/lib/agitate.js).
// Trecere de jos în sus; o dată pe monedă la 24 h; monedele aprinse în aceeași tură = un mesaj; cel mult 8 mesaje pe zi. Nu e semnal de direcție.
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const exista = (...p) => fs.existsSync(path.join(RAD, ...p));
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
const plain = (o) => JSON.parse(JSON.stringify(o));
const aproape = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-9), `${a} ≠ ${b}`);
const M5 = 300000, ACUM = Date.UTC(2026, 10, 28, 8, 2, 30), SLOT = Math.floor(ACUM / M5) * M5;
const A = new Function(citeste("public", "lib", "agitate.js") + "; return Agitate;")();
// pagina (fără DOM) pentru șiruri; lumea prefăcută pentru mers e mai jos
const P = (() => { const ctx = { Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date, Intl, TextRo: globalThis.TextRo, console }; vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "agitate.js") + "\n" + citeste("public", "lib", "agitate-ecran.js") + "\nthis.agHtml = agHtml; this.agStare = agStare; this.agTbText = typeof agTbText === 'function' ? agTbText : null; this.Agitate = Agitate;", ctx); return ctx; })();
const tick = (b, o, h, l, c, vol) => ({ symbol: b + "_USDT_PERP", time: ACUM, open: String(o), high: String(h), low: String(l), close: String(c), volume: "1", amount: String(vol == null ? 2e6 : vol), count: 10 });
// n lumânări de 5 min până la `slot`, liniștite (fiecare 1% între minim și maxim, în jurul prețului 100)
const bare = (n, slot, sus) => Array.from({ length: n }, (_, i) => ({ t: (slot == null ? SLOT : slot) - (n - 1 - i) * M5, o: 100, h: 100 * (1 + (sus == null ? 0.01 : sus)), l: 100, c: 100 }));
const kl = (b) => ({ result: true, data: { klines: b.slice().reverse().map((x) => ({ time: x.t, open: String(x.o), high: String(x.h), low: String(x.l), close: String(x.c) })) } });

// ── A. formulele noi ──
await test("A1. „s-a aprins”: pe o oră ≥ 5% ȘI ≥ 3× obișnuitul; una singură nu ajunge; nemăsurată / fără reper ⇒ nu", () => {
  assert.deepEqual(plain(A.APRINS), { amp: 5, ori: 3 });
  assert.equal(A.aprinsa({ masurat: true, amp: 5, ori: 3 }), true); assert.equal(A.aprinsa({ masurat: true, amp: 4.99, ori: 9 }), false);
  assert.equal(A.aprinsa({ masurat: true, amp: 9, ori: 2.99 }), false); assert.equal(A.aprinsa({ masurat: true, amp: 9, ori: null }), false);
  assert.equal(A.aprinsa({ masurat: false, amp: 9, ori: 9 }), false); assert.equal(A.aprinsa(null), false);
});
await test("A1b. „piața întreagă”: cel puțin 8 monede ȘI 15% din cele măsurate, deodată la ≥ 3% și ≥ 3×; nemăsuratele nu intră la numărătoare", () => {
  assert.deepEqual(plain(A.PIATA), { amp: 3, ori: 3, parte: 0.15, minim: 8 });
  const sus = { masurat: true, amp: 3, ori: 3 }, jos = { masurat: true, amp: 1, ori: 1 }, fara = { masurat: false };
  const lista = (nSus, nJos) => Array.from({ length: nSus }, () => sus).concat(Array.from({ length: nJos }, () => jos), [fara, null]);
  assert.deepEqual(plain(A.piataAprinsa(lista(8, 12))), { n: 8, din: 20, da: true }); assert.equal(A.piataAprinsa(lista(7, 13)).da, false, "sub 8 monede nu e piață");
  assert.equal(A.piataAprinsa(lista(12, 73)).da, false, "12 din 85 = 14%: sub 15%"); assert.equal(A.piataAprinsa(lista(13, 72)).da, true);
  assert.deepEqual(plain(A.piataAprinsa(null)), { n: 0, din: 0, da: false });
});
await test("A2. amplitudinea pe 24 h de pe Binance Futures, pe baza monedei: contractele „în mii” fără multiplicator, trimestrialele și rândurile stricate sar", () => {
  const b = A.dinBinance([{ symbol: "BTCUSDT", highPrice: "104", lowPrice: "100" }, { symbol: "1000PEPEUSDT", highPrice: "0.0110", lowPrice: "0.0100" }, { symbol: "1MBABYDOGEUSDT", highPrice: "2", lowPrice: "1" },
    { symbol: "ETHUSDT_260327", highPrice: "9", lowPrice: "1" }, { symbol: "XRPUSDC", highPrice: "9", lowPrice: "1" }, { symbol: "SOLUSDT", highPrice: "x", lowPrice: "1" }, { symbol: "ADAUSDT", highPrice: "1", lowPrice: "0" }, null]);
  assert.deepEqual(Object.keys(b).sort(), ["BABYDOGE", "BTC", "PEPE"]); aproape(b.BTC, 4); aproape(b.PEPE, 10); aproape(b.BABYDOGE, 100);
  assert.deepEqual(plain(A.dinBinance(null)), {}); assert.deepEqual(plain(A.dinBinance({ code: -1003 })), {});
  /* revizia: un contract delistat / în lichidare rămâne în listă cu mișcarea înghețată - ultima tranzacție veche de peste o oră sau prea puține tranzacții ⇒ nu se compară */
  const viu = { highPrice: "2", lowPrice: "1", closeTime: ACUM - 60000, count: 5000 };
  assert.deepEqual(Object.keys(A.dinBinance([{ symbol: "AAAUSDT", ...viu, closeTime: ACUM - 2 * 3600000 }, { symbol: "BBBUSDT", ...viu, count: 12 }, { symbol: "CCCUSDT", ...viu }], ACUM)), ["CCC"]);
});
await test("A3. „peste Binance”: mișcarea de pe Pionex de cel puțin 1,5× cea de pe Binance ȘI cu cel puțin 2 puncte mai mare; fără Binance ⇒ nu se spune nimic", () => {
  assert.deepEqual(plain(A.fataDeBinance(9, 6)), { binance: 6, raport: 1.5, peste: true });
  assert.equal(A.fataDeBinance(8.9, 6).peste, false); assert.equal(A.fataDeBinance(3, 1.5).peste, false, "dublu, dar doar 1,5 puncte");
  assert.equal(A.fataDeBinance(4, 2).peste, true); assert.equal(A.fataDeBinance(9, undefined), null); assert.equal(A.fataDeBinance(9, 0), null); assert.equal(A.fataDeBinance(null, 5), null);
});

// ── B. pagina ──
const stPlin = () => {
  const harta = A.ranguri([{ simbol: "BTC", rang: 1, nume: "Bitcoin" }, { simbol: "XMR", rang: 14, nume: "Monero" }, { simbol: "WLFI", rang: 90, nume: "World Liberty" }], 150);
  const u = A.univers([tick("BTC", 100, 104, 98, 102, 5e9), tick("XMR", 400, 410, 350, 360, 1e6), tick("WLFI", 0.04, 0.042, 0.016, 0.018, 7e5)], harta, {});
  return { k: "1h", monede: u.monede, scoase: u.scoase, harta, hartaLa: ACUM - 3600000, hartaSursa: "CoinGecko", tickLa: ACUM - 12000, faraContract: 61, inLucru: false, boti: {}, toate: false, eroare: null };
};
const randul = (h, s) => { const i = h.indexOf('data-ag-simbol="' + s + '"'), j = h.indexOf('data-ag-simbol="', i + 10); return h.slice(i, j < 0 ? h.indexOf('<div class="agMai"', i) < 0 ? h.length : h.indexOf('<div class="agMai"', i) : j); };
await test("B1. I-973: semnul „peste Binance” doar la moneda care se mișcă mult mai tare pe Pionex, cu cifra Binance la îndemână; sursele spun vârsta comparației", () => {
  const st = stPlin(); st.binance = { BTC: 6.1, XMR: 5.0, WLFI: 160 }; st.binanceLa = ACUM - 4 * 60000;   /* XMR: 17,1% pe Pionex, 5,0% pe Binance */
  const h = P.agHtml(st, ACUM);
  assert.match(randul(h, "XMR"), /peste Binance/); assert.match(randul(h, "XMR"), /Pe Binance Futures, în aceleași 24 h: 5,0%/);
  assert.ok(!/peste Binance/.test(randul(h, "BTC"))); assert.ok(!/peste Binance/.test(randul(h, "WLFI")));
  assert.match(h, /Binance \(comparația pe 24 h\): acum 4 min/); assert.match(h, /<b>Peste Binance<\/b>/);
  delete st.binance; const fara = P.agHtml(st, ACUM); assert.ok(!/peste Binance<\/span>/.test(fara)); assert.ok(!/comparația pe 24 h/.test(fara.slice(0, fara.indexOf("agNote"))));
});
await test("B2. I-974: fiecare rând are „Grafic ↗” (contractul Pionex pe TradingView, filă nouă, fără referent) lângă „Grid ›”", () => {
  const h = P.agHtml(stPlin(), ACUM), r = randul(h, "XMR");
  assert.match(r, /<a class="agGrafic agLeg" href="https:\/\/www\.tradingview\.com\/chart\/\?symbol=PIONEX%3AXMRUSDT\.P" target="_blank" rel="noopener noreferrer"[^>]*>Grafic ↗<\/a>/);
  assert.match(r, /data-action-click="agLaGrid\('XMR'\)"/);
  assert.equal((h.match(/href="https:\/\/www\.tradingview\.com\/chart\/\?symbol=PIONEX%3A[A-Z0-9]+USDT\.P"/g) || []).length, 3);
  assert.equal((h.match(/https?:\/\//g) || []).length, 3, "nicio altă adresă din afară în pagină");
});
await test("B3. I-974: garda de antete deosebește NAVIGAREA de cerere - adresa trece doar într-un href, connect-src rămâne neatins; folosită altfel, pică", async () => {
  const L = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "legaturi-navigare.mjs")).href);
  assert.deepEqual(L.NAVIGARE, ["https://www.tradingview.com"]);
  let r = L.adreseDinSursa(`x='<a href="https://www.tradingview.com/chart/?s=' + s; getJSON("https://fapi.binance.com/fapi/v1/ticker/24hr")`);
  assert.deepEqual(r.chemate, ["https://fapi.binance.com"]); assert.deepEqual(r.navigare, ["https://www.tradingview.com"]); assert.deepEqual(r.rele, []);
  r = L.adreseDinSursa(`fetch("https://www.tradingview.com/scan")`); assert.equal(r.rele.length, 1, "adresa de navigare într-o cerere");
  r = L.adreseDinSursa(`var u = "https://www.tradingview.com/chart/"; location.href = u`); assert.equal(r.rele.length, 1, "doar href-ul scris pe loc trece");
  r = L.adreseDinSursa(`'<link rel="prefetch" href="https://www.tradingview.com/x">'`); assert.equal(r.rele.length, 1, "doar un <a href> e navigare, nu orice href");
  r = L.adreseDinSursa(`'<a class="x" title="t" href="https://www.tradingview.com/chart/">'`); assert.deepEqual(r.rele, []); assert.deepEqual(r.navigare, ["https://www.tradingview.com"]);
  r = L.adreseDinSursa(`'<a href="https://alt-site.example/x">'`); assert.deepEqual(r.chemate, ["https://alt-site.example"], "un domeniu care nu e pe listă rămâne „chemat”");
  const g = citeste("scripts", "garzi-v746.mjs"); assert.match(g, /legaturi-navigare\.mjs/); assert.match(g, /adreseDinSursa\(/);
  const csp = (citeste("public", "_headers").match(/connect-src([^;]*)/) || [])[1] || ""; assert.ok(!/tradingview/.test(csp), "connect-src nu primește TradingView");
  const e = citeste("public", "lib", "agitate-ecran.js"); assert.deepEqual(L.adreseDinSursa(e).rele, []); assert.deepEqual(L.adreseDinSursa(e).chemate, ["https://fapi.binance.com"]);
  assert.deepEqual(L.adreseDinSursa(citeste("public", "lib", "agitate.js")).chemate, []);
});
await test("B4. I-972 pe pagină: „Aprinse în ultimele 24 h” din ce scrie colectorul - ora, moneda, cât s-a mișcat și ce a făcut prețul DE ATUNCI; colectorul tăcut se spune", () => {
  const st = stPlin(); st.colector = { la: ACUM - 40000, n: 86, masurate: 86, prag: { amp: 5, ori: 3 }, mesaje24: 2, aprinse: [{ s: "XMR", la: ACUM - 2 * 3600000, amp: 5.24, net: 3.1, ori: 4.12, pret: 400 }, { s: "DISPARUT", la: ACUM - 3600000, amp: 4, net: -1, ori: 3.3, pret: 2 },
    { s: "BTC", la: ACUM - 5 * 3600000, amp: 5.7, net: -3.1, ori: 6.5, pret: 100, piata: true }, { s: "WLFI", la: ACUM - 5 * 3600000 + 300000, amp: 6, net: -4, ori: 4, pret: 0.02, piata: true }] };
  let h = P.agHtml(st, ACUM);
  assert.match(h, /Aprinse în ultimele 24 h/); assert.match(h, /XMR[^<]*<\/b>[^<]*5,2% într-o oră \(\+3,1% net\), de 4,1× obișnuitul ei/); assert.match(h, /de atunci −10,0%/);   /* 400 ⇒ 360 */
  assert.match(h, /DISPARUT/); assert.match(h, /colectorul urmărește lista și cu pagina închisă/i); assert.match(h, /mesaje în 24 h: 2/);
  { const st2 = stPlin(); st2.colector = { la: ACUM - 1000, aprinse: [{ s: "FARANET", la: ACUM - 1000, amp: 6, net: null, ori: 3.5, pret: 1 }] }; assert.match(P.agHtml(st2, ACUM), /FARANET<\/b> 6,0% într-o oră \(— net\)/, "netul lipsă nu se scrie 0,0%"); }
  assert.match(h, /și 2 aprinderi în timpul unei mișcări a pieței întregi \(ultima la \d\d:\d\d\)/); assert.ok(!/<b>BTC<\/b> 5,7%/.test(h), "cele din mișcarea pieței nu se înșiră rând cu rând"); assert.match(h, /de la 5,0% pe o oră și 3,0× obișnuitul/);
  { const st3 = stPlin(); st3.colector = { la: ACUM - 1000, aprinse: [{ s: "XMR", la: ACUM - 9 * 3600000, amp: 9.9, net: 1, ori: 5, pret: 300 }, { s: "XMR", la: ACUM - 5 * 3600000, amp: 7.7, net: 1, ori: 4, pret: 350 }, { s: "XMR", la: ACUM - 3600000, amp: 5.5, net: 2, ori: 3.2, pret: 400 }, { s: "BTC", la: ACUM - 7200000, amp: 6.1, net: -2, ori: 6, pret: 100 }] };
    const h3 = P.agHtml(st3, ACUM); assert.equal((h3.match(/<b>XMR<\/b>/g) || []).length, 1, "o monedă, un rând"); assert.match(h3, /<b>XMR<\/b> 5,5% într-o oră[^<]*<span[^>]*>·<\/span> <span[^>]*>de atunci −10,0%<\/span> <span class="agMut">· a 3-a oară în 24 h<\/span>/, "ultima aprindere, cu numărul");
    assert.ok(!/<b>BTC<\/b>[^\n]*oară în 24 h/.test(h3.slice(h3.indexOf("<b>BTC</b>"), h3.indexOf("<b>BTC</b>") + 400)), "o singură aprindere nu poartă numărul"); }
  st.colector.aprinse = []; h = P.agHtml(st, ACUM); assert.match(h, /Aprinse în ultimele 24 h: niciuna/);
  st.colector.la = ACUM - 6 * 60000; h = P.agHtml(st, ACUM); assert.match(h, /Colectorul n-a mai scris de 6 min/); assert.match(h, /alertele pe Discord nu pleacă/);
  delete st.colector; h = P.agHtml(st, ACUM); assert.ok(!/Aprinse în ultimele 24 h/.test(h));
  st.colector = { la: ACUM - 1000, aprinse: [{ s: '<img src=x onerror=1>', la: ACUM - 1000, amp: 5, net: 1, ori: 4, pret: 1 }] }; assert.ok(!/<img/.test(P.agHtml(st, ACUM)));
});

await test("B5. I-972: alertele „s-a aprins” și „se mișcă toată piața” din pagina Alerte duc la „Agitate acum” (nu la Piața azi); restul drumurilor rămân", () => {
  const src = citeste("public", "lib", "alerte-ecran.js"), m = /var AlCentru = \(function \(\) \{[\s\S]*?\r?\n\}\)\(\);/.exec(src); assert.ok(m, "modulul AlCentru");
  const AC = new Function(m[0] + "; return AlCentru;")();
  assert.deepEqual(plain(AC.drum({ cheie: "agitate:BTW" })), { pag: "agitate", et: "Deschide Agitate acum" }); assert.equal(AC.drum({ cheie: "agitate-piata" }).pag, "agitate");
  assert.equal(AC.drum({ cheie: "tradezilei-x" }).pag, "tradezilei"); assert.equal(AC.drum({ cheie: "frana-zi" }).pag, "comportament"); assert.equal(AC.drum({ cheie: "altceva" }).pag, "dash");
});

// ── C. Tabloul botului ──
await test("C1. I-975: textul rândului „Agitată acum” - o zecimală, netul cu semn, față de obișnuit, „fapt, nu semnal”; „atenție” doar când e aprinsă", () => {
  assert.equal(typeof P.agTbText, "function");
  let t = P.agTbText({ masurat: true, amp: 4.24, net: 1.06, ori: 2.31, blocuri: 40, fel: "" });
  assert.equal(t.stare, "info"); assert.equal(t.text, "4,2% între minim și maxim în ultima oră (+1,1% net) · de 2,3× cât obișnuiește (peste obișnuit) · fapt, nu semnal");
  t = P.agTbText({ masurat: true, amp: 6.5, net: -5.9, ori: 5.02, blocuri: 40, fel: "jos" }); assert.equal(t.stare, "atentie"); assert.match(t.text, /^6,5% între minim și maxim în ultima oră \(−5,9% net, aproape drept\) · de 5,0× cât obișnuiește/);
  t = P.agTbText({ masurat: true, amp: 0.8, net: 0.1, ori: null, blocuri: 0, fel: "dus" }); assert.equal(t.stare, "info"); assert.match(t.text, /fără reper/);
  assert.equal(P.agTbText({ masurat: false, motiv: "veche" }), null); assert.equal(P.agTbText(null), null);
});
await test("C2. I-975: rândul e legat în citirea Tabloului, după „Monede de bot”, și duce la pagina „Agitate acum”", () => {
  const app = cuTablou(citeste("public", "app.js")), e = citeste("public", "lib", "agitate-ecran.js");
  assert.match(app, /out\.agitata=typeof tbAgitataRand==="function"\?tbAgitataRand\(b\):null;/); assert.match(app, /monedeBot:null,agitata:null,/);
  assert.match(app, /if\(ex\.monedeBot\)out\.push\(rd\(ex\.monedeBot\)\);if\(ex\.agitata\)out\.push\(rd\(ex\.agitata\)\);/);
  assert.match(e, /function tbAgitataRand\(b\)/); assert.match(e, /ce: "Agitată acum"/); assert.match(e, /actiune: "navTo\('agitate',true\)"/);
});
await test("C3. I-975 în mers: o cerere de lumânări pentru moneda botului, apoi rândul; nu se cere din nou sub 150 s; alt bot ⇒ altă cerere", async () => {
  const cereri = []; const ceas = { t: ACUM }; let redesen = 0;
  class DataFalsa extends Date { constructor(...a) { if (a.length) super(...a); else super(ceas.t); } static now() { return ceas.t; } }
  const b100 = bare(120, Math.floor(ACUM / M5) * M5); b100[b100.length - 1].h = 105.5; b100[b100.length - 1].c = 101;
  const ctx = { Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date: DataFalsa, Intl, Promise, encodeURIComponent, TextRo: globalThis.TextRo, console,
    getJSON: async (u) => { cereri.push(u); return kl(b100); }, TabloBot: { simboluri: (baza) => ({ pionex: baza + "_USDT", moneda: baza }) },
    tbPanouVizibil: () => true, tbStare: { bot: {}, citireO: {} }, tbDeseneazaCitire: () => { redesen++; } };
  vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "agitate.js") + "\n" + citeste("public", "lib", "agitate-ecran.js") + "\nthis.tbAgitataRand = tbAgitataRand;", ctx);
  const gol = async () => { for (let i = 0; i < 20; i++) await new Promise((ok) => setImmediate(ok)); };
  assert.equal(ctx.tbAgitataRand({ baza: "ZEC", quote: "USDT" }), null); await gol();
  assert.equal(cereri.length, 1); assert.match(cereri[0], /type=pionex_klines&symbol=ZEC_USDT_PERP&interval=5M&limit=500/); assert.equal(redesen, 1);
  const r = ctx.tbAgitataRand({ baza: "ZEC", quote: "USDT" }); assert.equal(r.ce, "Agitată acum"); assert.match(r.text, /^5,5% între minim și maxim în ultima oră \(\+1,0% net, dus-întors\) · de 5,5× cât obișnuiește/); assert.equal(r.stare, "atentie");   /* 5,5% drum, 1,0% net ⇒ „dus-întors”, ca pe pagină */ assert.equal(r.linkText, "Agitate acum ›");
  ceas.t += 100000; ctx.tbAgitataRand({ baza: "ZEC", quote: "USDT" }); await gol(); assert.equal(cereri.length, 1, "sub 150 s nu se cere din nou");
  ceas.t += 60000; ctx.tbAgitataRand({ baza: "ZEC", quote: "USDT" }); await gol(); assert.equal(cereri.length, 2);
  assert.equal(ctx.tbAgitataRand({ baza: "ENA", quote: "USDT" }), null, "alt bot: nu se arată lumânările celuilalt"); await gol(); assert.equal(cereri.length, 3);
});

// ── D. colectorul ──
const T = exista("scripts", "lib", "tura-agitate.mjs") ? await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-agitate.mjs")).href) : {};
// lumea turei: monedele și lumânările lor se pot schimba între ture; d.cere numără cererile
function lumeTura(o = {}) {
  const L = { t: ACUM, monede: o.monede || ["AAA", "BBB", "CCC"], pret: {}, bareDe: {}, cereri: { top: 0, tick: 0, kl: {} }, trimise: [], alerte: [], jurnal: [], disc: {}, st: {}, pica: {} };
  const harta = () => { const h = L.monede.map((s, i) => ({ simbol: s, rang: i + 1, nume: s })); while (h.length < 150) h.push({ simbol: "Z" + h.length, rang: h.length + 1, nume: "z" }); return h; };
  L.slot = () => Math.floor(L.t / M5) * M5;
  L.bare = (s) => (L.bareDe[s] ? L.bareDe[s](L.slot()) : bare(120, L.slot()));
  L.d = () => ({ acum: L.t, Agitate: A, TextRo: globalThis.TextRo, eCrypto: () => true, pauza: async () => {}, jurnal: (...a) => L.jurnal.push(a.join(" ")),
    cere: async (cale) => {
      const u = new URL(cale, "http://radar"), tip = u.searchParams.get("type");
      if (tip === "top_cap") { L.cereri.top++; if (L.pica.top) throw new Error("HTTP 502"); return { result: true, sursa: "CoinGecko", la: L.t, monede: harta() }; }
      if (tip === "pionex_tickers") { L.cereri.tick++; if (L.pica.tick) return { result: false, error: "Pionex tickers unavailable", retryAfter: null };
        return { result: true, timestamp: L.t, data: { tickers: L.monede.map((s) => tick(s, 100, 104, 100, L.pret[s] || 100)) } }; }
      if (tip === "pionex_klines") { const s = u.searchParams.get("symbol").replace("_USDT_PERP", ""); L.cereri.kl[s] = (L.cereri.kl[s] || 0) + 1; if (L.pica.kl) return { result: false, error: "Pionex klines unavailable", retryAfter: 120 }; if (L.pica.klFaraPauza) return { result: false, error: "Pionex klines unavailable", retryAfter: null }; return kl(L.bare(s)); }
      throw new Error("cerere neașteptată: " + cale);
    },
    trimite: async (cale, corp) => { if (L.pica.kv) throw new Error("HTTP 413"); L.trimise.push([cale, plain(corp)]); return { ok: true }; },
    trimiteAlerta: async (m, bot, cheie) => { L.alerte.push({ m: plain(m), bot, cheie }); return true; },
    citesteDisc: () => plain(L.disc), scrieDisc: (x) => { L.disc = plain(x); } });
  L.tura = async (ms) => { L.t += ms == null ? 60000 : ms; return T.turaAgitate(L.d(), L.st); };
  L.kl = () => Object.values(L.cereri.kl).reduce((a, b) => a + b, 0);
  /* aprinde moneda: ultima lumânare a ei urcă la `sus` % peste minim (pe lumânările exacte și, prin preț, pe cele ținute de tură) */
  L.aprinde = (s, sus) => { L.bareDe[s] = (slot) => { const b = bare(120, slot); b[b.length - 1].h = 100 + sus; b[b.length - 1].c = 100 + sus; return b; }; L.pret[s] = 100 + sus; };
  L.stinge = (s) => { delete L.bareDe[s]; L.pret[s] = 100; };
  return L;
}
await test("D1. prima tură: rangurile, lista, lumânările cu buget (cel mult 12 pe tură, cele mai agitate întâi), scrie în KV; o monedă DEJA aprinsă la pornire nu dă mesaj", async () => {
  const monede = Array.from({ length: 30 }, (_, i) => "M" + i), L = lumeTura({ monede }); L.aprinde("M3", 6);
  let r = await L.tura(0); assert.equal(r.facut, true); assert.equal(L.cereri.top, 1); assert.equal(L.cereri.tick, 1); assert.equal(L.kl(), T.PE_TURA); assert.equal(T.PE_TURA, 12);
  assert.equal(L.trimise.length, 1); assert.equal(L.trimise[0][0], "/api/istoric-bot?action=agitate");
  const c = L.trimise[0][1]; assert.equal(c.n, 30); assert.equal(c.masurate, 12); assert.deepEqual(c.prag, { amp: 5, ori: 3 }); assert.equal(c.mesaje24, 0); assert.deepEqual(c.aprinse, []); assert.equal(c.la, L.t);
  assert.equal(await T.turaAgitate(L.d(), L.st), null, "sub un minut nu rulează a doua oară");
  r = await L.tura(); r = await L.tura(); assert.equal(L.kl(), 30, "în trei ture toate cele 30 au lumânări"); assert.equal(L.trimise[2][1].masurate, 30);
  for (let i = 0; i < 5; i++) await L.tura(); assert.equal(L.kl(), 30, "apoi nicio cerere de lumânări până la recitirea de 6 ore"); assert.equal(L.cereri.top, 1); assert.equal(L.alerte.length, 0, "M3 era aprinsă de la început: fără mesaj");
});
await test("D2. aprinderea: moneda trece de regulă ⇒ o confirmare pe lumânări proaspete ⇒ UN mesaj (titlu ≤ 60, o zecimală, „nu încotro”), intră în „aprinse” și pe disc", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); const inainte = L.cereri.kl.BBB;
  L.aprinde("BBB", 5.2); const r = await L.tura();
  assert.deepEqual(r.noi, ["BBB"]); assert.equal(L.cereri.kl.BBB, inainte + 1, "o singură confirmare");
  assert.equal(L.alerte.length, 1); const a = L.alerte[0]; assert.equal(a.cheie, "agitate:BBB"); assert.equal(a.bot, null); assert.equal(a.m.nivel, "info");
  assert.equal(a.m.titlu, "⚡ S-a aprins BBB: 5,2% într-o oră"); assert.ok(a.m.titlu.length <= 60);
  assert.match(a.m.mesaj, /^BBB: 5,2% între minim și maxim în ultima oră \(\+5,2% net\), de 5,2× cât obișnuiește\. Preț 105\.20/); assert.match(a.m.mesaj, /\nFapt, nu semnal: spune unde e mișcare, nu încotro merge\.$/);
  assert.equal(a.m.mesaj.split("\n").length, 2); assert.ok(!/\d\.\d%/.test(a.m.mesaj));
  const c = L.trimise[L.trimise.length - 1][1]; assert.equal(c.aprinse.length, 1); assert.equal(c.aprinse[0].s, "BBB"); aproape(c.aprinse[0].amp, 5.2, 1e-6); assert.equal(c.aprinse[0].pret, 105.2); assert.equal(c.aprinse[0].la, L.t); assert.equal(c.aprinse[0].piata, undefined, "aprinsă singură, nu în mișcarea pieței");
  assert.equal(L.disc.aprinse.length, 1); assert.ok(L.disc.alertat.BBB > 0);
});
await test("D3. fără repetare: cât stă sus nu mai scrie; coborâtă și aprinsă iar în aceleași 24 h ⇒ tot nu; după 24 h ⇒ da", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); L.aprinde("BBB", 5); await L.tura(); assert.equal(L.alerte.length, 1);
  for (let i = 0; i < 4; i++) await L.tura(); assert.equal(L.alerte.length, 1, "stă sus: un singur mesaj");
  L.stinge("BBB"); for (let i = 0; i < 14; i++) await L.tura(5 * 60000);   /* 70 de minute liniștite */
  L.aprinde("BBB", 6); await L.tura(); assert.equal(L.alerte.length, 1, "a doua aprindere în 24 h: doar pe pagină"); assert.equal(L.trimise[L.trimise.length - 1][1].aprinse.length, 2);
  L.stinge("BBB"); for (let i = 0; i < 24 * 4; i++) await L.tura(15 * 60000);  /* 24 de ore */
  L.aprinde("BBB", 6); await L.tura(); assert.equal(L.alerte.length, 2, "după 24 h scrie din nou");
  assert.ok(L.trimise[L.trimise.length - 1][1].aprinse.every((x) => L.t - x.la <= 24 * 3600000), "pe pagină rămân doar aprinderile din ultimele 24 h");
});
await test("D4. mai multe deodată = UN mesaj cu toate; plafonul de 8 mesaje pe zi (restul rămân pe pagină)", async () => {
  const L = lumeTura({ monede: ["AAA", "BBB", "CCC", "DDD", "EEE"] }); await L.tura(0); await L.tura();
  L.aprinde("AAA", 5); L.aprinde("CCC", 7); L.aprinde("EEE", 6); L.aprinde("DDD", 4); const r = await L.tura();   /* DDD: 4% într-o oră, sub regulă */
  assert.deepEqual(r.noi.slice().sort(), ["AAA", "CCC", "EEE"]); assert.equal(L.alerte.length, 1);
  const a = L.alerte[0]; assert.equal(a.m.titlu, "⚡ S-au aprins 3 monede: CCC, EEE, AAA"); assert.equal(a.cheie, "agitate:AAA,CCC,EEE"); assert.ok(a.m.titlu.length <= 60);
  assert.match(a.m.mesaj, /^CCC 7,0% \(\+7,0% net, 7,0×\) · EEE 6,0% \(\+6,0% net, 6,0×\) · AAA 5,0% \(\+5,0% net, 5,0×\)\nFapt, nu semnal/);
  assert.equal(T.REGULA.maxZi, 8);
  const M = lumeTura({ monede: Array.from({ length: 12 }, (_, i) => "K" + i) }); await M.tura(0); await M.tura();
  for (let i = 0; i < 12; i++) { M.aprinde("K" + i, 6); await M.tura(); M.stinge("K" + i); for (let k = 0; k < 14; k++) await M.tura(5 * 60000); }   /* una pe rând, la ~70 de minute */
  assert.equal(M.alerte.length, 8, "al nouălea și următoarele nu mai pleacă azi"); assert.equal(M.trimise[M.trimise.length - 1][1].aprinse.length, 12); assert.equal(M.trimise[M.trimise.length - 1][1].mesaje24, 8);
  /* revizia: plafonul e pe ultimele 24 h, nu pe ziua UTC - la 2 ore după miezul nopții UTC (04:00 la noi) nu se deschide un plafon nou */
  for (let k = 0; k < 8; k++) await M.tura(15 * 60000);
  assert.ok(new Date(M.t).toISOString().slice(0, 10) > new Date(ACUM).toISOString().slice(0, 10), "proba a trecut de miezul nopții UTC");
  M.aprinde("K11", 7); await M.tura(); assert.equal(M.alerte.length, 8, "tot 8 în ultimele 24 h");
  /* titlul rămâne sub 60 de semne și cu simboluri lungi */
  const lungi = ["ABCDEFGHIJKLMNO", "BCDEFGHIJKLMNOP", "CDEFGHIJKLMNOPQ", "DEFGHIJKLMNOPQR", "EFGHIJKLMNOPQRS"].map((x, i) => ({ s: x, la: ACUM, amp: 9 - i, net: 1, ori: 4, pret: 1 }));
  const ml = T.mesajMonede(lungi, { TextRo: globalThis.TextRo }); assert.ok(ml.titlu.length <= 60, ml.titlu); assert.match(ml.titlu, /…$/); assert.match(ml.mesaj, / · \+ încă 1\n/);
});
await test("D10. mișcarea pieței întregi (cel puțin 8 monede și 15% deodată la ≥ 3% și ≥ 3×) = UN mesaj de piață; o oră fără mesaje pe monedă; cel mult o dată la 6 ore", async () => {
  const monede = Array.from({ length: 20 }, (_, i) => "P" + i), L = lumeTura({ monede }); await L.tura(0); await L.tura();
  for (let i = 0; i < 9; i++) L.aprinde("P" + i, 6);   /* 9 din 20 sar deodată */
  let r = await L.tura(); assert.equal(L.alerte.length, 1); const a = L.alerte[0];
  assert.equal(a.cheie, "agitate-piata"); assert.equal(a.m.titlu, "⚡ Se mișcă toată piața: 9 din 20 de monede"); assert.ok(a.m.titlu.length <= 60);
  assert.match(a.m.mesaj, /^9 din 20 de monede urmărite sunt deodată la cel puțin 3,0% într-o oră și de 3,0× obișnuitul lor\. Cele mai agitate: /); assert.equal(T.REGULA.piataAsteptareMs, 24 * 3600000, "ca politica de repetare a casei: aceeași cheie o dată la 24 h"); assert.match(a.m.mesaj, /\nFapt, nu semnal/); assert.equal(a.m.mesaj.split("\n").length, 2);
  assert.equal(r.piata, true); assert.equal(L.trimise[L.trimise.length - 1][1].aprinse.length, 9, "aprinderile rămân pe pagină"); assert.ok(L.trimise[L.trimise.length - 1][1].aprinse.every((e) => e.piata === true), "cu semnul că au fost în mișcarea pieței");
  for (let i = 0; i < 9; i++) L.stinge("P" + i);
  for (let k = 0; k < 6; k++) await L.tura(5 * 60000);   /* 30 de minute după: încă în ora de liniște */
  L.aprinde("P15", 7); await L.tura(); assert.equal(L.alerte.length, 1, "în ora de după mișcarea pieței nu pleacă mesaje pe monedă");
  L.stinge("P15"); for (let k = 0; k < 26; k++) await L.tura(5 * 60000);   /* cele 9 rămân „aprinse” cât lumânarea săriturii e în ora măsurată (~60 de minute), apoi încă o oră de liniște */
  L.aprinde("P16", 7); await L.tura(); assert.equal(L.alerte.length, 2); assert.equal(L.alerte[1].cheie, "agitate:P16");
  for (let i = 0; i < 9; i++) L.aprinde("P" + i, 6); await L.tura(); assert.equal(L.alerte.length, 2, "a doua mișcare a pieței în 6 ore: fără alt mesaj");
});
await test("D17. plafonul de 8 mesaje atins când se mișcă toată piața: mesajul de piață NU își pierde rândul pe 24 h - pleacă la următoarea mișcare, când e loc", async () => {
  const monede = Array.from({ length: 20 }, (_, i) => "Q" + i), L = lumeTura({ monede }); await L.tura(0); await L.tura();
  for (let i = 10; i < 18; i++) { L.aprinde("Q" + i, 6); await L.tura(); L.stinge("Q" + i); for (let k = 0; k < 14; k++) await L.tura(5 * 60000); }   /* 8 mesaje pe monedă, la ~70 de minute */
  assert.equal(L.alerte.length, 8, "plafonul e plin"); assert.ok(L.alerte.every((a) => /^agitate:Q1\d$/.test(a.cheie)));
  for (let i = 0; i < 9; i++) L.aprinde("Q" + i, 6); let r = await L.tura();
  assert.equal(L.alerte.length, 8, "plafonul e atins: mesajul de piață nu pleacă acum"); assert.equal(r.piata, false);
  assert.equal(L.trimise[L.trimise.length - 1][1].aprinse.filter((e) => e.piata === true).length, 9, "pe pagină aprinderile rămân, cu semnul pieței");
  for (let k = 0; k < 4; k++) await L.tura();
  assert.equal(L.jurnal.filter((x) => /se mișcă toată piața, dar plafonul de 8 mesaje/.test(x)).length, 1, "o singură linie în jurnal pe mișcare, nu una pe minut");
  for (let i = 0; i < 9; i++) L.stinge("Q" + i);
  for (let k = 0; k < 16 * 12; k++) await L.tura(5 * 60000);   /* 16 ore mai târziu: primele mesaje au ieșit din cele 24 de ore */
  assert.equal(L.alerte.length, 8);
  for (let i = 0; i < 9; i++) L.aprinde("Q" + i, 6); r = await L.tura();
  assert.equal(L.alerte.length, 9, "la următoarea mișcare a pieței, cu loc sub plafon, mesajul pleacă"); assert.equal(L.alerte[8].cheie, "agitate-piata"); assert.equal(r.piata, true);
});
await test("D5. candidatul NEconfirmat de lumânările proaspete nu dă mesaj și nu e întrebat din nou la fiecare minut", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); const inainte = L.cereri.kl.AAA;
  L.pret.AAA = 105;                                   /* prețul din listă sare, dar lumânările exacte rămân liniștite (o citire greșită / o fitilă deja întoarsă) */
  let r = await L.tura(); assert.deepEqual(r.noi, []); assert.equal(L.alerte.length, 0); assert.equal(L.cereri.kl.AAA, inainte + 1);
  await L.tura(); await L.tura(); assert.equal(L.cereri.kl.AAA, inainte + 1, "aceeași monedă nu se confirmă din nou sub 5 minute");
});
await test("D6. căderi: lista Pionex picată ⇒ nimic scris (pagina vede colectorul tăcut), fără mesaje; rangurile picate, dar cu lista veche ⇒ merge mai departe; KV refuzat ⇒ eșec", async () => {
  const L = lumeTura(); await L.tura(0); const scrise = L.trimise.length;
  L.pica.tick = true; let r = await L.tura(); assert.equal(r.facut, false); assert.match(r.motiv, /lista Pionex/); assert.equal(L.trimise.length, scrise); assert.equal(L.alerte.length, 0);
  L.pica.tick = false; L.pica.top = true; L.t += 7 * 3600000; r = await L.tura(); assert.equal(r.facut, true, "rangurile vechi rămân în folosință");
  L.pica.kv = true; r = await L.tura(); assert.equal(r.facut, false); assert.match(r.motiv, /serverul a refuzat/);
  const F = lumeTura(); F.pica.top = true; r = await F.tura(0); assert.equal(r.facut, false); assert.match(r.motiv, /primelor 150/); assert.equal(F.cereri.tick, 0);
});
await test("D7. Pionex cere pauză la lumânări (429) ⇒ tura se oprește din cerut și nu mai cere deloc până trece pauza", async () => {
  const L = lumeTura({ monede: Array.from({ length: 20 }, (_, i) => "M" + i) }); L.pica.kl = true;
  const r = await L.tura(0); assert.equal(r.facut, true); assert.equal(L.kl(), 1, "după primul refuz nu mai cere"); assert.equal(L.trimise[0][1].masurate, 0);
  await L.tura(); assert.equal(L.kl(), 1, "pauza de 120 s ține și la tura următoare");
  L.pica.kl = false; await L.tura(); assert.ok(L.kl() > 1);
});
await test("D11. 🔴 după o cădere de peste o oră (lista n-a venit), lumânările cu gol NU se judecă: se recitesc întâi - nici mesaj de piață fals, nici aprinderi umflate", async () => {
  const monede = Array.from({ length: 20 }, (_, i) => "G" + i), L = lumeTura({ monede }); await L.tura(0); await L.tura(); await L.tura();
  const kl0 = L.kl(); L.pica.tick = true; for (let k = 0; k < 9; k++) await L.tura(10 * 60000);   /* 90 de minute fără listă */
  /* între timp prețul a urcat ÎNCET cu 4% (în 90 de minute): pe o oră adevărată sunt ~2,6%, sub orice prag */
  const urcat = (slot) => { const b = bare(120, slot), n = b.length; for (let j = 0; j < 18; j++) { const x = b[n - 18 + j]; x.o = 100 + 4 * j / 18; x.c = 100 + 4 * (j + 1) / 18; x.h = x.c; x.l = x.o; } return b; };
  for (const sm of monede) { L.pret[sm] = 104; L.bareDe[sm] = urcat; }
  L.pica.tick = false; let r = await L.tura(); assert.equal(r.facut, true); assert.equal(L.alerte.length, 0, "fără mesaj de piață pe lumânări cu gol"); assert.equal(r.piata, false);
  await L.tura(); await L.tura();
  assert.equal(L.kl() - kl0, 20, "toate cele 20 recitite, o dată fiecare"); assert.equal(L.alerte.length, 0); assert.equal(L.trimise[L.trimise.length - 1][1].aprinse.length, 0); assert.equal(L.trimise[L.trimise.length - 1][1].masurate, 20);
});
await test("D12. 🟡 cu prea puțin din piață măsurat (pornire, recitire după o cădere) nu se judecă nici piața, nici monedele: doar se ține minte", async () => {
  const monede = Array.from({ length: 30 }, (_, i) => "H" + i), L = lumeTura({ monede }); for (let k = 0; k < 4; k++) await L.tura(k ? undefined : 0);
  L.pica.tick = true; for (let k = 0; k < 9; k++) await L.tura(10 * 60000); L.pica.tick = false;
  for (let i = 0; i < 12; i++) L.aprinde("H" + i, 7);   /* în cădere, primele 12 chiar s-au aprins */
  const r = await L.tura();   /* prima tură după cădere: recitește 12 din 30 = 40% din piață */
  assert.equal(L.trimise[L.trimise.length - 1][1].masurate, 12); assert.equal(L.alerte.length, 0, "nici „toată piața: 12 din 12”, nici mesaje pe monedă"); assert.equal(r.piata, false); assert.deepEqual(r.noi, []);
});
await test("D13. repornirea colectorului (memoria goală, discul rămas): fără val de mesaje, iar cele 24 h pe monedă se țin de pe disc", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); L.aprinde("BBB", 6); await L.tura(); assert.equal(L.alerte.length, 1);
  L.st = {};   /* repornire: lumânările și stările din memorie s-au dus; data/agitate.json a rămas */
  await L.tura(); await L.tura(); assert.equal(L.alerte.length, 1, "BBB e tot aprinsă la repornire: doar se ține minte");
  L.stinge("BBB"); for (let k = 0; k < 14; k++) await L.tura(5 * 60000);
  L.aprinde("BBB", 7); await L.tura(); assert.equal(L.alerte.length, 1, "se aprinde iar după o oră: cele 24 h de pe disc o țin doar pe pagină");
  L.aprinde("AAA", 6); await L.tura(); assert.equal(L.alerte.length, 2); assert.equal(L.alerte[1].cheie, "agitate:AAA");
});
await test("D14. recitirea de 6 ore care pică NU șterge lumânările bune (moneda rămâne măsurată) și se reîncearcă rar, nu la fiecare minut", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); const kl0 = L.kl(); L.pica.klFaraPauza = true;
  for (let k = 0; k < 76; k++) await L.tura(5 * 60000);   /* 6 ore și 20 de minute, cu lista vie */
  assert.equal(L.trimise[L.trimise.length - 1][1].masurate, 3, "lumânările vechi, ținute la zi cu prețul, rămân în folosință");
  assert.ok(L.kl() - kl0 >= 3 && L.kl() - kl0 <= 9, "reîncercări la 10 minute, nu la fiecare tură: " + (L.kl() - kl0));
});
await test("D15. moneda abia recitită în aceeași tură nu se mai cere o dată pentru confirmare (lumânările sunt deja proaspete)", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura();
  for (let k = 0; k < 71; k++) await L.tura(5 * 60000);   /* 5 ore și 56 de minute: încă fără recitire */
  assert.equal(L.cereri.kl.AAA, 1); L.aprinde("AAA", 6); await L.tura(5 * 60000);   /* tura recitirii de 6 ore, cu AAA abia aprinsă */
  assert.equal(L.cereri.kl.AAA, 2, "o singură cerere: recitirea"); assert.equal(L.alerte.length, 1); assert.equal(L.alerte[0].cheie, "agitate:AAA");
});
await test("D16. 🟡 noaptea (23–07, ora României) mesajele „s-a aprins” și „se mișcă toată piața” așteaptă rezumatul de dimineață, ca restul informărilor", async () => {
  const POL = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "politica-alerte.mjs")).href), m = { nivel: "info", titlu: "⚡ S-a aprins BTW: 8,0% într-o oră", mesaj: "x" };
  const noaptea = Date.UTC(2026, 10, 28, 1, 0), ziua = Date.UTC(2026, 10, 28, 10, 0);   /* 03:00 și 12:00 în România */
  let r = POL.politicaNoapte(m, "agitate:BTW", noaptea); assert.equal(r.doarRadar, true); assert.equal(r.noapte, true);
  r = POL.politicaNoapte(m, "agitate-piata", noaptea); assert.equal(r.doarRadar, true);
  r = POL.politicaNoapte(m, "agitate:BTW", ziua); assert.ok(!r.doarRadar, "ziua pleacă pe loc");
});
await test("D8. serverul: POST agitate curăță și ține (simboluri stricate, prea multe aprinderi ⇒ refuz); GET o dă înapoi", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=agitate", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=agitate", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV });
  const bun = { la: ACUM, n: 86, masurate: 80, prag: { amp: 3, ori: 3 }, mesaje24: 3, aprinse: [{ s: "XMR", la: ACUM - 1000, amp: 5.2, net: 3.1, ori: 4.1, pret: 400, gunoi: "<script>", piata: "da" }, { s: "BTC", la: ACUM - 500, amp: 4, net: -3, ori: 5, pret: 90000, piata: true }] };
  let r = await post(bun); assert.equal(r.status, 200);
  const v = (await (await get()).json()).agitate; assert.equal(v.la, ACUM); assert.equal(v.n, 86); assert.equal(v.masurate, 80); assert.deepEqual(v.prag, { amp: 3, ori: 3 }); assert.equal(v.mesaje24, 3);
  assert.deepEqual(v.aprinse, [{ s: "XMR", la: ACUM - 1000, amp: 5.2, net: 3.1, ori: 4.1, pret: 400 }, { s: "BTC", la: ACUM - 500, amp: 4, net: -3, ori: 5, pret: 90000, piata: true }], "doar câmpurile știute; semnul pieței doar când e true");
  r = await post({ ...bun, aprinse: [{ s: "<img>", la: 1, amp: 1, net: 1, ori: 1, pret: 1 }] }); assert.equal(r.status, 400);
  r = await post({ ...bun, aprinse: Array.from({ length: 61 }, () => bun.aprinse[0]) }); assert.equal(r.status, 400);
  r = await post({ ...bun, la: 0 }); assert.equal(r.status, 400);
  assert.equal((await (await get()).json()).agitate.la, ACUM, "refuzurile nu strică ce era ținut");
});
await test("D9. legarea în colector: tura la fiecare bătaie (ritmul în modul), cu oprire prin mediu și pază de suprapunere; formulele paginii; versiunea v101.216", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \{ turaAgitate \} from "\.\/lib\/tura-agitate\.mjs";/); assert.match(c, /const Agitate = incarca\("agitate\.js", "Agitate"\);/);
  assert.match(c, /async function turaAgitateColector\(\) \{\s*if \(agitateInLucru \|\| process\.env\.COLECTOR_FARA_AGITATE\) return;/);
  assert.match(c, /turaAgitateColector\(\)\.catch\(\(e\) => jurnal\("agitate", e\.message\)\);/);
  /* revizia: cererile turei (lista o dată pe minut, de regulă din memoria serverului) nu intră în numărătoarea „prețuri moarte” a boților - altfel o ascundeau */
  assert.match(c, /const ePret = !opt\.faraContorPret && cale\.startsWith\("\/api\/market\?type=pionex_"\);/); assert.match(c, /cere: \(cale\) => cere\(cale, \{ faraContorPret: true \}\)/); assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(c) || [])[1] >= 216);
});

// ── versiunea ──
await test("V. versiunea de la v100.398 în sus (index ×4, sw, versiune.js, package + lanț după v100.397, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(+pk.version.split(".")[1] >= 398); assert.ok(bi.li398 && bi.li398.length > 100);
  assert.ok((citeste("public", "index.html").match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 398).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 398);
  assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 398);
  assert.match(pk.scripts.test, /npm run test:v100397 && npm run test:v100398 && /); assert.equal(pk.scripts["test:v100398"], "node scripts/proba-v100398-agitate-idei.mjs");
});
console.log(`\nproba v100.398 (ideile paginii „Agitate acum”): ${teste - picate} / ${teste}`);
process.exit(picate ? 1 : 0);
