// Proba v100.320 (11.11.2026, el: „vreau Technicals și Technical Ratings din TradingView, cele 2 scripturi pe care le folosesc și eu, în
// pagina botului și în pagina Trade 212” ⇒ „da, fă-le așa în ambele pagini”).
// Același motor TradingView în amândouă (15 medii + 11 oscilatoare ⇒ +1/0/−1, grupul = media, nota = media grupurilor; praguri ±0,1 / ±0,5).
// Cifrele vin de la scannerul public TradingView, prin server (o rută cu cheia, cel mult 2 cereri, ținute minte 2 minute):
//   - botul: simbolul Pionex ⇒ contractul Binance (Pionex nu e în TradingView);
//   - T212: simbolul de bursă ⇒ bursa TradingView (US după nume pe NASDAQ / NYSE / AMEX; Londra, Xetra, Euronext, SIX, Milano, Viena, Toronto).
// Arătat ca INFORMAȚIE: nu intră în verdictul botului și nici în semaforul pozițiilor (nedovedit pe boții / trade-urile lui).
// Fără rețea: ruta se importă cu fetch simulat; biblioteca paginii rulează în vm.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.stack || e).split("\n").slice(0, 3).join("\n      ")); } };
console.log("Proba v100.320 - TradingView Technicals / Technical Ratings în Tablou și în T212");

const TV = await import("../functions/_shared/tv-note.js");
// un rând de scanner: name, exchange, apoi All/MA/Other pe 5, 15, 60, 240, 1D, 1W
const rand = (s, nume, bursa, baza) => ({ s, d: [nume, bursa, 1, ...Array.from({ length: 18 }, (_, i) => baza + i / 100)] });   // v100.339: a treia coloană e prețul („close”)

await test("simbolul botului: Pionex ⇒ Binance (perp ⇒ .P, spot fără); altceva ⇒ nimic", () => {
  assert.equal(TV.tvDinPionex("STX_USDT_PERP"), "BINANCE:STXUSDT.P");
  assert.equal(TV.tvDinPionex("stx_usdt"), "BINANCE:STXUSDT");
  assert.equal(TV.tvDinPionex("1000PEPE_USDT_PERP"), "BINANCE:1000PEPEUSDT.P");
  // v100.339 (auditul din 13.11): simbolul pe care Pionex îl ARE e PEPE_USDT_PERP - la Binance contractul e „în mii”
  assert.equal(TV.tvDinPionex("PEPE_USDT_PERP"), "BINANCE:1000PEPEUSDT.P"); assert.equal(TV.tvDinPionex("SHIB_USDT_PERP"), "BINANCE:1000SHIBUSDT.P"); assert.equal(TV.tvDinPionex("PEPE_USDT"), "BINANCE:PEPEUSDT");
  for (const x of ["", "STX", "STX-USDT", "STX_EUR_PERP", null, "A".repeat(30) + "_USDT"]) assert.equal(TV.tvDinPionex(x), null, String(x));
});

await test("simbolul acțiunii: US după nume (BRK-B ⇒ BRK.B), restul cu bursa din sufix; sufix necunoscut ⇒ nimic (nu nota altei firme)", () => {
  assert.deepEqual(TV.tvDinYahoo("AAPL"), { us: "AAPL" }); assert.deepEqual(TV.tvDinYahoo("BRK-B"), { us: "BRK.B" });
  const tab = { "VUSA.L": "LSE:VUSA", "SAP.DE": "XETR:SAP", "AIR.PA": "EURONEXT:AIR", "ASML.AS": "EURONEXT:ASML", "NESN.SW": "SIX:NESN", "ENI.MI": "MIL:ENI", "EBS.VI": "VIE:EBS", "SHOP.TO": "TSX:SHOP" };
  for (const [y, t] of Object.entries(tab)) assert.deepEqual(TV.tvDinYahoo(y), { ticker: t }, y);
  for (const x of ["7203.T", "X.ZZ", "", null, "^GSPC", "EURUSD=X"]) assert.equal(TV.tvDinYahoo(x), null, String(x));
});

await test("cererile către scanner: cel mult două (global cu tickere, america după nume pe NASDAQ/NYSE/AMEX), fără dubluri", () => {
  const c = TV.tvCereri([{ cheie: "a", ticker: "LSE:VUSA" }, { cheie: "b", ticker: "LSE:VUSA" }, { cheie: "c", us: "AAPL" }, { cheie: "d", us: "AAPL" }, { cheie: "e", ticker: "BINANCE:STXUSDT.P" }]);
  assert.equal(c.length, 2);
  assert.equal(c[0].piata, "global"); assert.deepEqual(c[0].corp.symbols.tickers, ["LSE:VUSA", "BINANCE:STXUSDT.P"]);
  assert.equal(c[1].piata, "america"); assert.deepEqual(c[1].corp.filter[0], { left: "name", operation: "in_range", right: ["AAPL"] });
  assert.deepEqual(c[1].corp.filter[1].right, ["NASDAQ", "NYSE", "AMEX"]);
  assert.equal(c[0].corp.columns.length, 3 + 18); assert.equal(c[0].corp.columns[2], "close"); assert.ok(c[0].corp.columns.includes("Recommend.Other|240") && c[0].corp.columns.includes("Recommend.All") && c[0].corp.columns.includes("Recommend.MA|1W"));
  assert.deepEqual(TV.tvCereri([]), []);
});

await test("citirea: nota pe interval (All / medii / oscilatoare), lipsa rămâne lipsă (nu 0 = neutru), valorile ținute între −1 și 1", () => {
  const r = TV.tvRand(rand("BINANCE:STXUSDT.P", "STXUSDT.P", "BINANCE", -0.3));
  assert.equal(r.tv, "BINANCE:STXUSDT.P"); assert.deepEqual(Object.keys(r.iv), ["5m", "15m", "1h", "4h", "1D", "1W"]);
  assert.ok(Math.abs(r.iv["5m"].all + 0.3) < 1e-9 && Math.abs(r.iv["1W"].osc - (-0.3 + 0.17)) < 1e-9);
  const g = rand("X:Y", "Y", "X", 0); g.d[3] = null; g.d[4] = "abc"; g.d[20] = 7; const q = TV.tvRand(g);
  assert.equal(q.iv["5m"].all, null); assert.equal(q.iv["5m"].ma, null); assert.equal(q.iv["1W"].osc, 1);
  const gol = { s: "X:Y", d: ["Y", "X", 1, ...Array(18).fill(null)] }; assert.equal(TV.tvRand(gol), null, "fără nicio notă ⇒ nimic");
});

await test("potrivirea: cheia cerută primește rândul ei; la US, NASDAQ / NYSE înaintea AMEX; negăsit ⇒ null", () => {
  const tinte = [{ cheie: "AAPL", us: "AAPL" }, { cheie: "VUSA.L", ticker: "LSE:VUSA" }, { cheie: "LIPSA.L", ticker: "LSE:LIPSA" }, { cheie: "X", us: "X" }];
  const o = TV.tvPotriveste(tinte, [{ data: [rand("LSE:VUSA", "VUSA", "LSE", 0.2)] }, { data: [rand("AMEX:AAPL", "AAPL", "AMEX", -0.9), rand("NASDAQ:AAPL", "AAPL", "NASDAQ", 0.4)] }]);
  assert.equal(o.AAPL.tv, "NASDAQ:AAPL"); assert.equal(o["VUSA.L"].tv, "LSE:VUSA"); assert.equal(o["LIPSA.L"].lipsa, "negasit"); assert.deepEqual(o["LIPSA.L"].cautat, ["LSE:LIPSA"]); assert.equal(o.X.lipsa, "negasit");   // v100.339: lipsa își spune motivul
});

// ---- ruta: /api/market?type=tv_rating
const TOKEN = "proba-token-1234567890", ENV = { APP_API_TOKEN: TOKEN };
const fetchReal = globalThis.fetch;
const marketNou = () => import("../functions/api/market.js?v100320=" + Math.random());
const cerere = (cale, cuCheie = true) => new Request("http://127.0.0.1:8788" + cale, { headers: cuCheie ? { authorization: "Bearer " + TOKEN, "x-forwarded-for": "10.32.0.1" } : { "x-forwarded-for": "10.32.0.2" } });
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const lume = (raspuns) => { const cereri = []; globalThis.fetch = async (u, opt) => { cereri.push({ u: String(u), corp: opt && opt.body ? JSON.parse(opt.body) : null, metoda: opt && opt.method }); return raspuns(String(u), opt && opt.body ? JSON.parse(opt.body) : null); }; return cereri; };

await test("ruta: fără cheie ⇒ refuz, și nimic nu pleacă spre TradingView", async () => {
  const { onRequestGet } = await marketNou(); const c = lume(() => J({ data: [] }));
  try { const r = await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=crypto&simboluri=STX_USDT_PERP", false), env: ENV }); assert.ok(r.status === 401 || r.status === 403, "status " + r.status); assert.equal(c.length, 0); }
  finally { globalThis.fetch = fetchReal; }
});

await test("ruta, botul: STX_USDT_PERP ⇒ o cerere POST la scanner (global, BINANCE:STXUSDT.P) ⇒ notele pe cheia Pionex; a doua cerere în 2 minute ⇒ din memorie", async () => {
  const { onRequestGet } = await marketNou(); const c = lume((u, corp) => J({ data: corp.symbols.tickers.map((t) => rand(t, t.split(":")[1], "BINANCE", -0.2)) }));
  try {
    const j = await (await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=crypto&simboluri=STX_USDT_PERP"), env: ENV })).json();
    assert.equal(c.length, 1); assert.equal(c[0].u, "https://scanner.tradingview.com/global/scan"); assert.equal(c[0].metoda, "POST"); assert.deepEqual(c[0].corp.symbols.tickers, ["PIONEX:STXUSDT.P", "BINANCE:STXUSDT.P"]);   // v100.339 (I-869): întâi instrumentul botului
    assert.equal(j.result, true); assert.equal(j.note.STX_USDT_PERP.tv, "PIONEX:STXUSDT.P"); assert.equal(j.note.STX_USDT_PERP.scara, 1); assert.equal(j.note.STX_USDT_PERP.close, 1); assert.ok(Math.abs(j.note.STX_USDT_PERP.iv["4h"].all + 0.11) < 1e-9); assert.ok(j.la > 0);
    await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=crypto&simboluri=STX_USDT_PERP"), env: ENV }); assert.equal(c.length, 1, "a doua oară din memorie");
  } finally { globalThis.fetch = fetchReal; }
});

await test("ruta, T212: AAPL + VUSA.L + un sufix necunoscut ⇒ două cereri (global + america), cel necunoscut ⇒ null; simbolurile curățate și cel mult 30", async () => {
  const { onRequestGet } = await marketNou(); const c = lume((u, corp) => J({ data: u.includes("/global/") ? corp.symbols.tickers.map((t) => rand(t, t.split(":")[1], t.split(":")[0], 0.3)) : [rand("NASDAQ:AAPL", "AAPL", "NASDAQ", 0.6)] }));
  try {
    const j = await (await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=actiuni&simboluri=" + encodeURIComponent("AAPL,VUSA.L,7203.T,<b>")), env: ENV })).json();
    assert.equal(c.length, 2); assert.equal(j.note.AAPL.tv, "NASDAQ:AAPL"); assert.equal(j.note["VUSA.L"].tv, "LSE:VUSA"); assert.equal(j.note["7203.T"].lipsa, "nemapat");
    assert.ok(!Object.keys(j.note).some((k) => /[<>]/.test(k)), "simbolurile se curăță");
    const multe = Array.from({ length: 45 }, (_, i) => "S" + i).join(",");
    const j2 = await (await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=actiuni&simboluri=" + multe), env: ENV })).json();
    assert.ok(Object.keys(j2.note).length <= 30, "cel mult 30");
  } finally { globalThis.fetch = fetchReal; }
});

await test("ruta: TradingView picat (HTTP 500 sau rețea) ⇒ {result:false} cu motivul, fără să cadă; piața necunoscută ⇒ 400", async () => {
  const { onRequestGet } = await marketNou(); lume(() => J({ error: "x" }, 500));
  try {
    const j = await (await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=crypto&simboluri=BTC_USDT_PERP"), env: ENV })).json();
    assert.equal(j.result, false); assert.match(String(j.error) + String(j.detail), /TradingView/);
    globalThis.fetch = async () => { throw new Error("rețea"); };
    const j2 = await (await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=crypto&simboluri=ETH_USDT_PERP"), env: ENV })).json(); assert.equal(j2.result, false);
    const r3 = await onRequestGet({ request: cerere("/api/market?type=tv_rating&piata=forex&simboluri=EURUSD"), env: ENV }); assert.equal(r3.status, 400);
  } finally { globalThis.fetch = fetchReal; }
});

// ---- biblioteca paginii: public/lib/tv-note.js
const LIB = citeste("public", "lib", "tv-note.js");
const ctxLib = () => { const ctx = { Math, Number, String, Array, Object, isFinite, JSON, Date }; vm.createContext(ctx); vm.runInContext(LIB + ";this.TvNote=TvNote", ctx); return ctx.TvNote; };
await test("biblioteca: clasele după pragurile TradingView (< −0,5 · [−0,5, −0,1) · [−0,1, 0,1] · (0,1, 0,5] · > 0,5), cifra cu o zecimală", () => {
  const T = ctxLib(), c = (x) => T.clasa(x).cod;
  assert.equal(c(-0.51), "vinde-tare"); assert.equal(c(-0.5), "vinde"); assert.equal(c(-0.11), "vinde"); assert.equal(c(-0.1), "neutru"); assert.equal(c(0), "neutru"); assert.equal(c(0.1), "neutru");
  assert.equal(c(0.11), "cumpara"); assert.equal(c(0.5), "cumpara"); assert.equal(c(0.51), "cumpara-tare"); assert.equal(c(null), "lipsa"); assert.equal(c(NaN), "lipsa");
  assert.equal(T.clasa(-0.3).text, "vinde"); assert.equal(T.clasa(0.7).text, "cumpără tare"); assert.equal(T.clasa(-0.3).ton, "bad"); assert.equal(T.clasa(0.3).ton, "good"); assert.equal(T.clasa(0).ton, "mutedInfo");
  assert.equal(T.valoare(-0.333), "−0,3"); assert.equal(T.valoare(0.45), "+0,45"); assert.equal(T.valoare(0.7), "+0,7");   /* v100.339: lângă pragul 0,5 două zecimale (0,45 e „cumpără”, 0,54 „cumpără tare”: nu amândouă „+0,5”) */
  assert.equal(T.valoare(0.04), "0,0"); assert.equal(T.valoare(null), "—");
});
await test("biblioteca: tabelul (6 intervale × rezumat / medii / oscilatoare), tickerul scăpat, lipsa ⇒ „—”; fără note ⇒ mesajul de așteptare; linia mică pe 1D", () => {
  const T = ctxLib(); const n = { tv: "BINANCE:STX<i>", iv: { "5m": { all: -0.33, ma: -0.67, osc: 0 }, "15m": { all: null, ma: null, osc: null }, "1h": { all: 0.6, ma: 0.8, osc: 0.4 }, "4h": { all: -0.45, ma: -0.8, osc: -0.09 }, "1D": { all: -0.13, ma: -0.27, osc: 0 }, "1W": { all: 0.11, ma: 0.31, osc: -0.09 } } };
  const h = T.tabel(n, { directie: "short", la: Date.UTC(2026, 10, 11, 6, 31) });
  for (const tf of ["5m", "15m", "1h", "4h", "1D", "1W"]) assert.ok(h.includes(">" + tf + "<"), tf);
  for (const r of ["Rezumat", "Medii", "Oscilatoare"]) assert.ok(h.includes(r), r);
  assert.ok(h.includes("TradingView") && h.includes("Technicals"));
  assert.ok(!h.includes("<i>") && h.includes("&lt;i&gt;"), "tickerul scăpat");
  assert.ok(h.includes("cumpără tare") && h.includes("vinde"), "clasele"); assert.ok(/—/.test(h), "15m lipsă ⇒ —");
  assert.ok(/nu intră în verdict/.test(h), "spus că e informație"); assert.ok(/short/.test(h), "pentru un short, spus ce înseamnă „vinde”");
  assert.ok(/class="tvNoteTab"/.test(h));
  assert.match(T.tabel(null, {}), /Aștept/); assert.match(T.tabel({ eroare: "TradingView nu răspunde (HTTP 500)" }, {}), /TradingView nu răspunde/);
  const m = T.mic(n); assert.ok(/TV 1D/.test(m) && /vinde/.test(m)); assert.equal(T.mic(null), ""); assert.equal(T.mic({ tv: "x", iv: { "1D": { all: null } } }), "");
  assert.ok(/class="t212Mic tvMic bad tvMicTel"/.test(T.mic(n, "1D", "tvMicTel")), "clasa în plus pentru telefon");
  assert.ok(h.indexOf("<thead>") > 0 && h.indexOf("<th>TF</th>") > h.indexOf("<thead>"), "capul de tabel cu TF / Rezumat / Medii / Oscilatoare");
});

// ---- Tabloul botului
const APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js"), T212 = citeste("public", "lib", "t212-ecran.js"), CSS = citeste("public", "app.css");
await test("Tabloul: cererea vine cu lumânările direcției (același ritm, simbolul Pionex al botului), nota se ține pe moneda botului și se desenează în cardul „Trendul pe TF-uri”", () => {
  const f = APP.slice(APP.indexOf("async function tbAduDirectie(){"), APP.indexOf("function tbCalculeazaIndicatorii(d){"));
  // v100.339 (auditul din 13.11): cererea pleacă din tbAduDirectie FĂRĂ await, prin tbAduTv (nu ține în loc direcția), iar nota poartă cheia monedei ei
  assert.ok(f.includes("tbAduTv(d,s,cheie);") && !/await getJSON\("\/api\/market\?type=tv_rating/.test(f), "cererea pornită din tbAduDirectie, fără await");
  const fTv = APP.slice(APP.indexOf("function tbAduTv(d,s,cheie){"), APP.indexOf("function renderTabloTv(){"));
  assert.ok(fTv.includes('getJSON("/api/market?type=tv_rating&piata=crypto&simboluri="+encodeURIComponent(s))'), "cererea în tbAduTv");
  assert.ok(/d\.tv=\{n:n,la:la,simbol:cheie\}/.test(fTv), "ținută pe d, cu moneda ei");
  assert.ok(/function renderTabloTv\(\)\{/.test(APP)); const r = APP.slice(APP.indexOf("function renderTabloTv(){"), APP.indexOf("function renderTabloTv(){") + 900);
  assert.ok(r.includes('$("tbTvNote")') && r.includes("TvNote.tabel(") && r.includes("tbCheieDir(b)"), "desenul, cu garda pe moneda de acum");
  assert.ok(APP.slice(APP.indexOf("function renderTabloDirectia(){"), APP.indexOf("function renderTabloDirectia(){") + 400).includes("renderTabloTv()"), "chemat din renderTabloDirectia");
  assert.ok(HTML.includes('<p class="tbSub" id="tbTrendBoti"></p><div class="tvNote" id="tbTvNote"><p class="tbSub">Aștept notele TradingView…</p></div>'), "locul din card");
});
await test("pagina și cache-ul aplicației încarcă biblioteca; nota NU intră în verdict / semafor (nimeni în afară de desen nu citește d.tv)", () => {
  assert.ok(HTML.includes('<script src="/lib/indicatori-bot.js"></script><script src="/lib/tv-note.js"></script>'));
  assert.ok(SW.includes('"/lib/indicatori-bot.js","/lib/tv-note.js",'));
  // v100.324 (I-859): banda din rândul închis al indicatorilor desenează și ea nota ⇒ în loc de un număr de citiri, FIECARE citire stă într-o funcție
  // care aduce sau desenează (tbAduDirectie, renderTabloTv, renderTabloIndicatori) - niciuna în verdict / semafor / sfaturi
  const unde = []; for (const m of APP.matchAll(/\.tv\b(?!_)/g)) { const inainte = APP.slice(0, m.index), k = inainte.lastIndexOf("function "); unde.push(/^function (?:\s*)([\w$]+)/.exec(APP.slice(k))?.[1] || "?"); }
  assert.ok(unde.length >= 3, "citirile notei: " + unde.join(", "));
  for (const f of unde) assert.ok(["tbAduDirectie", "tbAduTv", "tbTvDe", "renderTabloTv", "renderTabloIndicatori"].includes(f), "nota TradingView citită în " + f + " (doar adus / desen)");
  assert.ok(!/TvNote/.test(APP.slice(APP.indexOf("function tbVerdict"), APP.indexOf("function tbVerdict") + 4000)), "verdictul nu vede nota");
});

// ---- Trade 212
await test("T212: o cerere pentru toate pozițiile, doar cu pagina la vedere, cel mult o dată la 5 minute; simbolul de bursă din prețuri", () => {
  assert.ok(/function t212TvAdu\(forta\)\s*\{/.test(T212)); const f = T212.slice(T212.indexOf("function t212TvAdu(forta)"), T212.indexOf("function t212TvAdu(forta)") + 1500);
  assert.ok(f.includes("t212LaVedere()"), "doar la vedere"); assert.ok(/5 \* 60000/.test(f), "5 minute"); assert.ok(f.includes("t212.simbolPret["), "simbolul de bursă");
  assert.ok(f.includes('getJSON("/api/market?type=tv_rating&piata=actiuni&simboluri=" + encodeURIComponent('), "o singură cerere");
  assert.ok(/t212Render\(true\)/.test(f), "redesenează rândurile când vin notele");
  assert.ok(/t212TvAdu\(\)/.test(T212.slice(T212.indexOf("function t212Render(viu)"), T212.indexOf("function t212Render(viu)") + 9000)), "chemat din t212Render");
});
await test("T212: în coloana Trend apare „TV 1D: …”, în fișă tabelul întreg; semaforul / consilierul nu folosesc nota", () => {
  const r = T212.slice(T212.indexOf("function t212RandPozitie(p) {"), T212.indexOf("function t212RandPozitie(p) {") + 12000);
  assert.ok(/var iTrend = [^\n]*TvNote\.mic\(/.test(r), "linia mică în Trend");
  assert.ok(/var iSim = [^\n]*TvNote\.mic\(t212NotaTv\(p\), "1D", "tvMicTel"\)/.test(r), "pe telefon coloana Trend e ascunsă: linia stă și sub nume");
  assert.ok(/TvNote\.tabel\(/.test(r), "tabelul în fișă");
  assert.ok(!/t212\.tv\b/.test(T212.slice(T212.indexOf("function t212Semafor"), T212.indexOf("function t212Semafor") + 3000)), "semaforul nu vede nota");
});

await test("foaia de stil: blocul notei TradingView DUPĂ stratul desenului (v100.316 / v100.319 citesc stratul până la marcaj) și înaintea pândei; doar variabile și clase existente, colțuri ≤ 5 px", () => {
  const i = CSS.indexOf("/* v100.320 (el, 11.11.2026"), j = CSS.indexOf("/* v100.320: sfârșitul notei TradingView */"), cap = CSS.indexOf("/* v100.316: sfârșitul desenului nou */"), p = CSS.lastIndexOf("@media (max-width:640px){.sugPandaTab thead");
  assert.ok(cap > 0 && i > cap && j > i && p > j, "ordinea: strat ⇒ blocul v100.320 ⇒ pânda");
  const b = CSS.slice(i, j).replace(/\/\*[^]*?\*\//g, "");
  assert.ok(/\.tvNoteTab\{/.test(b) && /font-variant-numeric:tabular-nums/.test(b));
  // în fișa T212 tabelul stă ÎN tabelul pozițiilor: „#t212Continut .t212Tab thead{display:none}” și, pe telefon, „.t212Tab tbody{display:block}” îl atingeau
  assert.ok(b.includes("#t212Continut .tvNoteTab thead{display:table-header-group}") && b.includes(".tvNoteTab tbody{display:table-row-group}"), "capul și corpul tabelului înapoi în fișa T212");
  /* v100.321: lista n-are coloana Trend nici pe calculator ⇒ linia de sub nume la orice lățime (proba-v100321), tot doar în rândul listei */
  assert.ok(b.includes(".tvMicTel{display:none}") && b.includes("#t212Continut tr.t212Rand .t212Sim .t212Mic.tvMicTel{display:block}"), "linia de sub nume doar în rândul listei");
  // regula paginii care ascunde liniile mici de sub nume pe telefon trebuie să stea MAI SUS (aceeași greutate ⇒ câștigă ultima)
  assert.ok(CSS.indexOf("#t212Continut tr.t212Rand .t212Sim .t212Mic:not(.t212Modele){display:none}") < CSS.indexOf("#t212Continut tr.t212Rand .t212Sim .t212Mic.tvMicTel{display:block}"));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(/.test(b.replace(/var\([^)]*\)/g, "")), "fără culori scrise de mână");
  for (const m of b.matchAll(/border-radius:([^;}]*)/g)) for (const v of m[1].split(/\s+/)) assert.ok(parseFloat(v) <= 5 || v === "0", m[1]);
  assert.equal(pandaInainteaCozii(CSS), "");
});

await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json", () => {
  const B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json")), V = "3(?:2\\d|[3-9]\\d)";
  assert.equal((HTML.match(new RegExp("v100\\." + V, "g")) || []).length, 4); assert.equal((HTML.match(/v100\.319/g) || []).length, 0);
  assert.match(SW, new RegExp('const CACHE="crypto-radar-v100-' + V + '";'));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + V + '"'));
  assert.match(B.version, new RegExp("^v100\\." + V + "$")); assert.ok(B.features.tv320); assert.match(P.version, new RegExp("^100\\." + V + "\\."));
  assert.ok(P.scripts.test.includes("npm run test:v100319 && npm run test:v100320")); assert.equal(P.scripts["test:v100320"], "node scripts/proba-v100320.mjs");
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
