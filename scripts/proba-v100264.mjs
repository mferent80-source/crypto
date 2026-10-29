// Proba v100.264 (29.10, el: „crypto radar pagina futures, audit complet din toate direcțiile, îmbunătățire și optimizare, adăugare idei”).
// Ce ține:
//  · intervalul de funding e cel REAL (Binance: 464 din 814 contracte plătesc la 4 h, 3 la o oră; COTI la 4 h) - nu „8 h” presupus;
//  · raportul long/short se judecă față de istoria MONEDEI (percentila pe ~500 h), nu față de 1,5 / 0,67 fix
//    (măsurat 29.10: cu pragul fix, „aglomerat” ieșea în 100% din ore pe ETH, SOL, XRP, DOGE, ADA, SUI, PEPE, LTC, BNB);
//  · un răspuns vechi (altă monedă) nu mai scrie peste cel nou; aceeași monedă în 30 s nu se mai cere de două ori;
//  · serverul cere cele 5 date Binance deodată, găsește singur 1000PEPE / 1000000MOG / 1MBABYDOGE, spune „fără contract”;
//  · pagina spune moneda, ora, cine plătește, cât pe zi, OI în USD, și o frază din cifre, în română.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";
import "./lib/text-ro-global.mjs";   // proba v100.61 (RF4): orice probă care încarcă semnale-bot.js încarcă întâi TextRo

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js");
const fnApp = (nume) => { const i = APP.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
const incarcaFC = () => new Function(citeste("public", "lib", "futures-citire.js") + "; return FuturesCitire;")();
console.log("\nV100.264 · FUTURES · proba\n");

// ---------------------------------------------------------------- mostre reale (Binance, 29.10.2026)
const H4 = [   // COTIUSDT fundingRate, la 4 h
  { symbol: "COTIUSDT", fundingTime: 1793232000000, fundingRate: "0.00005000" },
  { symbol: "COTIUSDT", fundingTime: 1793246400000, fundingRate: "-0.00006879" },
  { symbol: "COTIUSDT", fundingTime: 1793260800000, fundingRate: "-0.00020586" },
];
const H8 = [0, 1, 2].map((i) => ({ fundingTime: 1793232000000 + i * 8 * 3600000, fundingRate: "0.0001" }));
const H1 = [0, 1, 2].map((i) => ({ fundingTime: 1793232000000 + i * 3600000, fundingRate: "0.0001" }));
const istoric = (n, f) => Array.from({ length: n }, (_, i) => [1793000000000 + i * 3600000, f(i)]);

// ---------------------------------------------------------------- 1. modulul pur
await test("1a intervalul de funding din orele plăților: 4 h la COTI, 8 h, 1 h; lipsă ⇒ null", () => {
  const F = incarcaFC();
  assert.equal(F.interval(H4), 4); assert.equal(F.interval(H8), 8); assert.equal(F.interval(H1), 1);
  assert.equal(F.interval([H4[0]]), null); assert.equal(F.interval(null), null); assert.equal(F.interval([{ fundingTime: "x" }, { fundingTime: "y" }]), null);
});
await test("1b rata adusă la 8 h (pragul de 0,03% e pe 8 h); fără interval rămâne cum e", () => {
  const F = incarcaFC();
  assert.ok(Math.abs(F.pe8h(-0.00017267, 4) - -0.00034534) < 1e-12);
  assert.equal(F.pe8h(0.0005, null), 0.0005);
  assert.equal(F.pe8h(null, 4), null);
});
await test("1c percentila: sub 50 de ore de istoric nu judecă", () => {
  const F = incarcaFC();
  const a = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(F.percentila(a, 96), 96);
  assert.equal(F.percentila(a.slice(0, 49), 10), null);
});
await test("1d aglomerarea: funding-ul la 8 h, raportul față de istoria MONEDEI; conflictul se spune; fără date ⇒ null", () => {
  const F = incarcaFC();
  // funding singur, ca proba audit 23.10 (4c): 0,05% fără interval ⇒ tot CROWDED
  assert.equal(F.aglomerare({ funding: 0.0005 }).context, "CROWDED");
  // COTI azi: −0,0173% la 4 h = −0,0345% la 8 h ⇒ shorturile înghesuite (pragul vechi pe perioadă zicea „echilibrat”)
  assert.equal(F.aglomerare({ funding: -0.00017267, ore: 4 }).context, "CONTRARIAN +");
  assert.equal(F.aglomerare({ funding: -0.00017267, ore: 8 }).context, "BALANCED");
  // ETH: raportul stă mereu pe la 3 ⇒ 3,0 e OBIȘNUIT pentru el, nu aglomerare (pragul fix 1,5 zicea CROWDED în 100% din ore)
  const eth = istoric(500, (i) => 2.5 + (i % 100) / 100);
  const r = F.aglomerare({ funding: 0.00005, ore: 8, ls: 3.0, lsIst: eth });
  assert.equal(r.context, "BALANCED"); assert.equal(r.lsVot, 0); assert.ok(r.lsPct > 40 && r.lsPct < 60, "p" + r.lsPct);
  // votul doar la extrem (p99 / p1 - ținta de ~10% din ore, măsurată 29.10): 3,47 e p98 ⇒ „sus”, fără vot; 3,5 e peste tot istoricul ⇒ CROWDED
  assert.equal(F.aglomerare({ funding: 0.00005, ore: 8, ls: 3.47, lsIst: eth }).context, "BALANCED");
  assert.match(F.subLs({ ls: 3.47, lsPct: F.aglomerare({ ls: 3.47, lsIst: eth }).lsPct }), /sus pentru moneda asta/);
  assert.equal(F.aglomerare({ funding: 0.00005, ore: 8, ls: 3.5, lsIst: eth }).context, "CROWDED");
  // pe ecran percentila se rotunjește spre mijloc: 98,8 nu se scrie „p99” (pragul de vot) lângă „nu la extrem”
  assert.equal(F.pr(98.8), 98); assert.equal(F.pr(1.2), 2); assert.equal(F.pr(99), 99); assert.equal(F.pr(null), null);
  assert.match(F.subContext(F.aglomerare({ funding: 0.00005, ore: 8, ls: 3.47, lsIst: eth })), /raportul sus, nu la extrem/);
  assert.match(F.subLs({ ls: 3.0, lsPct: 98.8 }), /\(p98\)/);
  assert.equal(F.aglomerare({ funding: 0.00005, ore: 8, ls: 2.5, lsIst: eth }).context, "CONTRARIAN +");
  // funding pe long + raport neobișnuit de jos ⇒ BALANCED pentru verdict, dar conflictul se spune
  const c = F.aglomerare({ funding: 0.0005, ore: 8, ls: 2.5, lsIst: eth });
  assert.equal(c.context, "BALANCED"); assert.equal(c.conflict, true);
  assert.equal(F.aglomerare({}).context, null);
  // raport fără istoric: nu votează (nu mai e 1,5 fix)
  const s = F.aglomerare({ ls: 2.2 });
  assert.equal(s.lsVot, 0); assert.equal(s.lsPct, null); assert.equal(s.context, "BALANCED");
});
await test("1e OI și prețul în 24 h, din aceleași rânduri (preț = valoare / bucăți), cu bandă moartă de 1% pe OI", () => {
  const F = incarcaFC();
  const rand = (oi, pret) => ({ sumOpenInterest: String(oi), sumOpenInterestValue: String(oi * pret) });
  assert.equal(F.oiPret([rand(100, 1), rand(103, 1.02)]).stare, "noi-sus");
  assert.equal(F.oiPret([rand(100, 1), rand(103, 0.98)]).stare, "noi-jos");
  assert.equal(F.oiPret([rand(100, 1), rand(97, 1.02)]).stare, "acoperire");
  assert.equal(F.oiPret([rand(100, 1), rand(97, 0.98)]).stare, "iesire");
  assert.equal(F.oiPret([rand(100, 1), rand(100.5, 1.03)]).stare, "pe-loc");
  const x = F.oiPret([rand(100, 1), rand(103, 1.02)]);
  assert.ok(Math.abs(x.oi24 - 3) < 1e-9 && Math.abs(x.pret24 - 2) < 1e-9);
  assert.equal(F.oiPret([]), null); assert.equal(F.oiPret(null), null);
});
await test("1f costul pe zi la 1.000 USDT: 0,01% la 8 h = 0,3 USDT; COTI la 4 h ≈ −1,04 (shorturile plătesc)", () => {
  const F = incarcaFC();
  assert.ok(Math.abs(F.cost1000(0.0001, 8) - 0.3) < 1e-9);
  assert.ok(Math.abs(F.cost1000(-0.00017267, 4) - -1.03602) < 1e-6);
  assert.equal(F.cost1000(null, 8), null);
});
await test("1g etichetele în română; codurile rămân pentru verdict", () => {
  const F = incarcaFC();
  assert.equal(F.eticheta("CROWDED"), "Longurile înghesuite");
  assert.equal(F.eticheta("CONTRARIAN +"), "Shorturile înghesuite");
  assert.equal(F.eticheta("BALANCED"), "Echilibrat");
  assert.equal(F.eticheta("BALANCED", true), "În conflict");
  assert.equal(F.eticheta(null), "— fără date");
});
await test("1h motivul lipsei: fără contract spune moneda; refuzul spune codul", () => {
  const F = incarcaFC();
  assert.match(F.motiv({ faraContract: true, simbol: "XYZUSDT" }), /XYZUSDT.*nu are contract perpetuu/);
  assert.match(F.motiv({ probleme: { funding: "upstream HTTP 403" } }), /403/);
  assert.equal(F.motiv({}), "");
});
await test("1i fraza din cifre: cine plătește, la câte ore, cât pe zi (o zecimală), OI cu prețul, raportul, „context, nu semnal”", () => {
  const F = incarcaFC();
  const t = F.fraza({ funding: -0.00017267, ore: 4, oiPret: { oi24: 3.2, pret24: -1.5, stare: "noi-jos" }, ls: 1.29, lsPct: 35, simbol: "COTIUSDT" });
  assert.match(t, /Shorturile plătesc longurilor/); assert.match(t, /la fiecare 4 h/); assert.match(t, /1,0 USDT pe zi/);
  assert.match(t, /intră poziții noi pe scădere/); assert.match(t, /56% din conturi sunt long/); assert.match(t, /Context, nu semnal/);
  assert.doesNotMatch(t, /NaN|undefined|null/);
  const g = F.fraza({});
  assert.doesNotMatch(g, /NaN|undefined|null/);
  // revizia Opus 5–7: „1.000 USDT” e valoarea poziției, nu marja; maximul nu e „mai sus decât în 100%”; o listare nouă nu e „în 24 h”
  assert.match(t, /poziție de 1\.000 USDT \(valoarea poziției, nu marja\)/);
  assert.match(F.subFunding({ funding: 0.0001, ore: 8 }), /la o poziție de 1\.000 USDT/);
  const ist = Array.from({ length: 100 }, (_, i) => [i, 1 + i / 100]);
  const varf = F.aglomerare({ ls: 5, lsIst: ist });
  assert.match(F.fraza({ ls: 5, lsPct: varf.lsPct, lsMax: varf.lsMax }), /cel mai sus din ultimele ore/);
  assert.doesNotMatch(F.fraza({ ls: 5, lsPct: varf.lsPct, lsMax: varf.lsMax }), /100%/);
  const fund = F.aglomerare({ ls: 0.5, lsIst: ist });
  assert.match(F.fraza({ ls: 0.5, lsPct: fund.lsPct, lsMin: fund.lsMin }), /cel mai jos din ultimele ore/);
  const nou = F.oiPret([{ sumOpenInterest: "100", sumOpenInterestValue: "100", timestamp: 0 }, { sumOpenInterest: "110", sumOpenInterestValue: "110", timestamp: 600000 }]);
  assert.equal(nou.ore, 0);
  assert.match(F.fraza({ oiPret: nou }), /În ultima oră OI/);
});

// ---------------------------------------------------------------- 2. serverul
const TOKEN = "proba-token-1234567890";
async function server(raspuns, opt = {}) {
  const cerute = [];
  globalThis.fetch = async (url) => {
    url = String(url); cerute.push(url);
    const r = typeof raspuns === "function" ? await raspuns(url) : raspuns;
    return new Response(r.corp ?? "{}", { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
  const mod = opt.modul || await import(pathToFileURL(path.join(RAD, "functions", "api", "market.js")).href + "?t=" + Date.now() + Math.random());
  const res = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/market?type=futures&symbol=" + (opt.simbol || "BTCUSDT"), { headers: { authorization: `Bearer ${TOKEN}` } }), env: { APP_API_TOKEN: TOKEN } });
  return { corp: JSON.parse(await res.text()), cerute, mod };
}
const invalid = { status: 400, corp: '{"code":-1121,"msg":"Invalid symbol."}' };
const coti = (url) => {
  if (/premiumIndex/.test(url)) return { corp: '{"symbol":"COTIUSDT","markPrice":"0.01010613","indexPrice":"0.01010787","lastFundingRate":"-0.00017267","nextFundingTime":1793275200000,"time":1793263126004}' };
  if (/openInterest\?/.test(url)) return { corp: '{"symbol":"COTIUSDT","openInterest":"366756507","time":1793263119207}' };
  if (/globalLongShortAccountRatio/.test(url)) return { corp: '[{"longShortRatio":"1.3148","timestamp":1793257200000},{"longShortRatio":"1.2873","timestamp":1793260800000}]' };
  if (/openInterestHist/.test(url)) return { corp: '[{"sumOpenInterest":"366648870","sumOpenInterestValue":"3699120.44943","timestamp":1793262600000}]' };
  if (/fundingRate\?/.test(url)) return { corp: JSON.stringify(H4) };
  return { corp: "[]" };
};
await test("2a cele 5 cereri Binance pleacă deodată (60 ms fiecare: sub 200 ms, nu 300+)", async () => {
  const t0 = Date.now();
  const r = await server(async (url) => { await new Promise((z) => setTimeout(z, 60)); return coti(url); }, { simbol: "COTIUSDT" });
  const ms = Date.now() - t0;
  assert.ok(ms < 200, ms + " ms");
  assert.equal(r.corp.funding, -0.00017267);
});
await test("2b câmpurile noi: simbolul, markPrice, ora plății, intervalul 4 h, OI în USD, istoria raportului (ultimul = longShort)", async () => {
  const { corp } = await server(coti, { simbol: "COTIUSDT" });
  assert.equal(corp.simbol, "COTIUSDT"); assert.equal(corp.markPrice, 0.01010613); assert.equal(corp.nextFundingTime, 1793275200000);
  assert.equal(corp.fundingIntervalHours, 4);
  assert.ok(Math.abs(corp.oiUsd - 366756507 * 0.01010613) < 1e-6);
  assert.equal(corp.longShort, 1.2873);
  assert.deepEqual(corp.lsIst, [[1793257200000, 1.3148], [1793260800000, 1.2873]]);
  assert.ok(!corp.probleme);
});
await test("2c PEPE se cere direct ca 1000PEPEUSDT (și MOG = 1000000MOG, BABYDOGE = 1MBABYDOGE)", async () => {
  for (const [s, b] of [["PEPEUSDT", "1000PEPEUSDT"], ["MOGUSDT", "1000000MOGUSDT"], ["BABYDOGEUSDT", "1MBABYDOGEUSDT"]]) {
    const r = await server(coti, { simbol: s });
    // v100.265: lista oficială a intervalelor (/fapi/v1/fundingInfo) e o cerere fără simbol, ca ticker/price
    const bin = r.cerute.filter((u) => /fapi\.binance\.com\/(fapi|futures)/.test(u) && !/ticker\/price|fundingInfo/.test(u));
    assert.ok(bin.length >= 5, s + ": " + bin.length);
    for (const u of bin) assert.match(u, new RegExp("symbol=" + b + "&|symbol=" + b + "$"), u);
    assert.equal(r.corp.simbol, b);
  }
});
await test("2d o monedă nouă în mii se găsește din lista Binance, după „Invalid symbol”", async () => {
  const r = await server((url) => {
    if (/ticker\/price/.test(url)) return { corp: '[{"symbol":"BTCUSDT"},{"symbol":"1000NEWCOINUSDT"}]' };
    if (/symbol=NEWCOINUSDT/.test(url)) return invalid;
    return coti(url);
  }, { simbol: "NEWCOINUSDT" });
  assert.equal(r.corp.simbol, "1000NEWCOINUSDT"); assert.equal(r.corp.funding, -0.00017267); assert.ok(!r.corp.faraContract);
});
await test("2e fără contract pe Binance: faraContract, valorile null; a doua cerere nu mai bate Binance (ținut minte)", async () => {
  const rasp = (url) => /ticker\/price/.test(url) ? { corp: '[{"symbol":"BTCUSDT"}]' } : invalid;
  const r1 = await server(rasp, { simbol: "NOPEUSDT" });
  assert.equal(r1.corp.faraContract, true); assert.equal(r1.corp.funding, null); assert.equal(r1.corp.simbol, "NOPEUSDT");
  const r2 = await server(rasp, { simbol: "NOPEUSDT", modul: r1.mod });
  assert.equal(r2.corp.faraContract, true);
  assert.equal(r2.cerute.length, 0, r2.cerute.join(" "));
});
await test("2g simbolul cerut se taie la 30 de caractere (memoria „fără contract” nu crește cu șiruri lungi)", async () => {
  const rasp = (url) => /ticker\/price/.test(url) ? { corp: "[]" } : invalid;
  const r = await server(rasp, { simbol: "A".repeat(200) + "USDT" });
  assert.ok(r.corp.simbol.length <= 30, r.corp.simbol.length);
  for (const u of r.cerute) assert.ok(!/A{31}/.test(u), u.slice(0, 120));
});
await test("2f refuzul Binance (403) rămâne spus pe fiecare din cele 5 cereri, fără „fără contract”", async () => {
  const { corp } = await server({ status: 403, corp: "<html>forbidden</html>" });
  assert.ok(Object.keys(corp.probleme || {}).length >= 5); assert.match(String(corp.probleme.funding), /403/);
  assert.ok(!corp.faraContract); assert.equal(corp.funding, null);
});

// ---------------------------------------------------------------- 3. pagina: derivatives()
function cutie(raspunsServer, opt = {}) {
  const el = {}, cerute = [], fresh = [];
  const $ = (id) => { if (opt.arunca && opt.arunca.id === id && opt.arunca.n-- > 0) throw new Error("proba: " + id); return (el[id] = el[id] || { textContent: "", className: "", innerHTML: "", title: "", value: "" }); };
  const src = fnApp("derivatives").replace(/^function derivatives\(\)/, "async function()").replace(/\nlet scannerRows=\[\];[\s\S]*$/, "");
  const win = opt.window || {};
  const deps = { $, assetClass: () => (opt.clasaFn ? opt.clasaFn() : opt.clasa || "CRYPTO"), norm: (s) => s, document: { getElementById: (id) => $(id) }, window: win, markFresh: (k) => fresh.push(k),
    simBinanceFut: new Function("return " + APP.match(/function simBinanceFut\([^\n]*/)[0])(),
    getJSON: async (u) => { cerute.push(u); if (u.startsWith("/api/")) return typeof raspunsServer === "function" ? raspunsServer(u) : raspunsServer; throw new Error("400"); },
    oiChangeAt: new Function("return " + fnApp("oiChangeAt"))(), pctText: new Function("return " + fnApp("pctText"))(),
    fundingSummary: new Function("pctRank", "return " + fnApp("fundingSummary"))(new Function("return " + fnApp("pctRank"))()),
    fundingRo: new Function("return " + fnApp("fundingRo"))(), compact: (x) => Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 2 }).format(x),
    eroareDeParola: () => false, textEroare: (e) => String(e && e.message), updateFlowWindow() {}, renderLiquidationProxy() {}, renderQuantFlow() {},
    FuturesCitire: incarcaFC() };
  $("symbol").value = opt.simbol || "COTIUSDT";
  const f = new Function(...Object.keys(deps), "return (" + src + ")")(...Object.values(deps));
  return { f, el, cerute, fresh, win, $ };
}
const serverCoti = { funding: -0.00017267, openInterest: 366756507, longShort: 1.2873, simbol: "COTIUSDT", markPrice: 0.01010613, nextFundingTime: Date.now() + 3600000, fundingIntervalHours: 4,
  oiUsd: 366756507 * 0.01010613, lsIst: istoric(500, (i) => 1.1 + (i % 50) / 100), fundingHist: H4,
  oiHist5m: [{ sumOpenInterest: "355000000", sumOpenInterestValue: "3620000" }, { sumOpenInterest: "366756507", sumOpenInterestValue: "3706000" }] };
await test("3a pagina: moneda și ora, cine plătește la 4 h, OI în USD, raportul cu percentila, fraza; contextul în română, codul în stare", async () => {
  const c = cutie(serverCoti); await c.f();
  assert.match(c.el.fMeta.textContent, /COTIUSDT/);
  assert.match(c.el.fundingSub.textContent, /la 4 h/); assert.match(c.el.fundingSub.textContent, /shorturile plătesc/i);
  assert.match(c.el.oi.textContent, /USD/); assert.match(c.el.oiSub.textContent, /COTI|bucăți/);
  assert.match(c.el.lsSub.textContent, /% din conturi long/);
  assert.equal(c.win.__derivativesState.context, "CONTRARIAN +");
  assert.equal(c.el.fcontext.textContent, "Shorturile înghesuite");
  assert.equal(c.win.__derivativesState.fundingIntervalHours, 4);
  // starea poartă și votul raportului și rata la 8 h - alertele (FuturesCitire.alertaLs / alertaFunding) le citesc de aici
  assert.equal(c.win.__derivativesState.lsVot, 0); assert.ok(Math.abs(c.win.__derivativesState.fr8 - -0.00034534) < 1e-12);
  assert.match(c.el.ftext.textContent, /Context, nu semnal/);
  assert.match(c.el.oiContext.textContent, /^OI .+ COTI/);   // bucățile au unitate
  assert.doesNotMatch(Object.values(c.el).map((x) => x.textContent).join(" "), /NaN|undefined|CROWDED|CONTRARIAN|BALANCED/);
  assert.deepEqual(c.fresh, ["futures"]);
});
await test("3b răspunsul vechi (BTC, lent) nu scrie peste cel nou (ETH, rapid)", async () => {
  const win = {};
  const lent = (u) => new Promise((z) => setTimeout(() => z(/BTCUSDT/.test(u) ? { ...serverCoti, simbol: "BTCUSDT", funding: 0.0001 } : { ...serverCoti, simbol: "ETHUSDT", funding: 0.0002 }), /BTCUSDT/.test(u) ? 80 : 10));
  const a = cutie(lent, { window: win, simbol: "BTCUSDT" });
  const p1 = a.f();
  a.$("symbol").value = "ETHUSDT";
  const p2 = a.f();
  await Promise.all([p1, p2]);
  assert.equal(win.__derivativesState.funding, 0.0002);
  assert.match(a.el.fMeta.textContent, /ETHUSDT/);
});
// revizia Opus (29.10), punctul 1: analyze(ETH) schimbă caseta și golește starea, dar cheamă derivatives() abia după lumânări
await test("3g caseta s-a schimbat fără o cerere nouă (analyze în curs): răspunsul vechi nu scrie starea și nici pagina", async () => {
  const win = {};
  const lent = () => new Promise((z) => setTimeout(() => z({ ...serverCoti, simbol: "BTCUSDT", funding: 0.0001 }), 40));
  const a = cutie(lent, { window: win, simbol: "BTCUSDT" });
  const p1 = a.f();
  a.$("symbol").value = "ETHUSDT"; win.__derivativesState = {};
  await p1;
  assert.deepEqual(win.__derivativesState, {});
  assert.doesNotMatch(String(a.el.fMeta && a.el.fMeta.textContent), /BTCUSDT/);
  assert.doesNotMatch(String(a.el.funding && a.el.funding.textContent), /0,0100/);
});
await test("3h trecerea pe acțiuni în timpul cererii: răspunsul crypto nu mai scrie, cache-ul se golește", async () => {
  let clasa = "CRYPTO"; const win = {};
  const lent = () => new Promise((z) => setTimeout(() => z(serverCoti), 40));
  const a = cutie(lent, { window: win, clasaFn: () => clasa });
  const p1 = a.f(); clasa = "STOCKS"; await a.f(); await p1;
  assert.deepEqual(win.__derivativesState, {}); assert.equal(win.__derivCache, null);
});
// revizia Opus, punctul 2: o excepție în desenare lăsa în cache o promisiune respinsă ⇒ moneda rămânea blocată
await test("3i o excepție în desenare nu blochează moneda: următoarea cerere pleacă din nou", async () => {
  const c = cutie(serverCoti, { arunca: { id: "oiPret24", n: 1 } });
  await assert.rejects(c.f());
  await c.f();
  // v100.265: pagina cere și funding-ul Pionex ⇒ se numără doar cererile futures
  assert.equal(c.cerute.filter((u) => /type=futures/.test(u)).length, 2, c.cerute.join(" "));
  assert.match(c.el.ftext.textContent, /Context, nu semnal/);
});
await test("3c aceeași monedă în 30 s: o singură cerere; în zbor: tot una; „↻” (true) cere din nou", async () => {
  const c = cutie(serverCoti);
  await Promise.all([c.f(), c.f()]);
  // v100.265: pagina cere și funding-ul Pionex ⇒ se numără doar cererile futures
  const fut = () => c.cerute.filter((u) => /type=futures/.test(u)).length;
  assert.equal(fut(), 1, c.cerute.join(" "));
  await c.f();
  assert.equal(fut(), 1);
  await c.f(true);
  assert.equal(fut(), 2);
});
await test("3d fără contract: nicio cerere directă la Binance, fraza spune de ce, prospețimea nu se bifează", async () => {
  const c = cutie({ funding: null, openInterest: null, longShort: null, faraContract: true, simbol: "XYZUSDT" }, { simbol: "XYZUSDT" });
  await c.f();
  assert.equal(c.cerute.filter((u) => /fapi\.binance\.com/.test(u)).length, 0);
  assert.match(c.el.ftext.textContent, /nu are contract perpetuu/);
  assert.deepEqual(c.fresh, []);
  assert.equal(c.el.fcontext.textContent, "— fără date");
});
await test("3e acțiunile: textul în română", async () => {
  const c = cutie(serverCoti, { clasa: "STOCKS" }); await c.f();
  assert.doesNotMatch(c.el.ftext.textContent, /not mixed/); assert.match(c.el.ftext.textContent, /acțiun/);
});
await test("3f fundingSummary pe ORE, nu pe ultimele 3 / 9 plăți: la 4 h, „24 h” = ultimele 6 plăți", () => {
  const fs2 = new Function("pctRank", "return " + fnApp("fundingSummary"))(new Function("return " + fnApp("pctRank"))());
  // ultimele 6 plăți (24 h la 4 h): trei de 0 și trei de 0,06% ⇒ media 0,03%; codul vechi (ultimele 3) zicea 0,06%
  const h = Array.from({ length: 30 }, (_, i) => ({ fundingTime: 1793232000000 + i * 4 * 3600000, fundingRate: i >= 27 ? "0.0006" : "0" }));
  assert.ok(Math.abs(fs2(h).avg24 - 0.0003) < 1e-12, String(fs2(h).avg24));
  const vechi = Array.from({ length: 10 }, () => ({ fundingRate: "0.0001" }));   // fără fundingTime: ca înainte
  assert.ok(Math.abs(fs2(vechi).avg24 - 0.0001) < 1e-12);
});

// ---------------------------------------------------------------- 5. consumatorii aceleiași stări (el, 29.10: „Da, în aceeași livrare”)
const ethIst = istoric(500, (i) => 2.5 + (i % 100) / 100);
await test("5a alerta Long/Short sare doar la extrem (p99 / p1), nu la 1,5 fix; textul în română", () => {
  const F = incarcaFC();
  const a = F.alertaLs({ ls: 3.56, lsVot: -1, lsPct: 100 });
  assert.equal(a.titlu, "Long/Short la extrem"); assert.match(a.text, /longurile înghesuite/); assert.match(a.text, /p100/);
  assert.equal(F.alertaLs({ ls: 3.0, lsVot: 0, lsPct: 51 }), null); assert.equal(F.alertaLs({}), null); assert.equal(F.alertaLs(null), null);
});
await test("5b alerta de funding pe rata adusă la 8 h (−0,03% la 4 h = −0,06% la 8 h sare; 0,04% la 8 h nu)", () => {
  const F = incarcaFC();
  const a = F.alertaFunding({ funding: -0.0003, fundingIntervalHours: 4, fr8: -0.0006 });
  assert.equal(a.titlu, "Funding la extrem"); assert.match(a.text, /la 4 h/); assert.match(a.text, /−0,0600% la 8 h/);
  assert.equal(F.alertaFunding({ funding: 0.0004, fr8: 0.0004 }), null); assert.equal(F.alertaFunding({}), null);
});
await test("5c checkAlerts: ETH cu raportul obișnuit (3,0) nu mai dă „Long/Short la extrem”; cu lsVot dă", () => {
  const ruleaza = (deriv) => {
    const alerte = [];
    const deps = { appSettings: () => ({ nearPct: 1, signalMin: 101, alerts: { sr: false, signal: false, ls: true, funding: true, oi: true } }), addAlert: (k, t, x) => alerte.push([k, t, x]),
      coin: (s) => s, norm: (s) => s, $: () => ({ value: "ETH" }), num: String, fundingRo: new Function("return " + fnApp("fundingRo"))(), FuturesCitire: incarcaFC() };
    // după checkAlerts nu urmează „\nfunction ” (vine alt cod) ⇒ blocul până la „}” pe rândul lui
    const i = APP.indexOf("\nfunction checkAlerts(") + 1, bloc = APP.slice(i, APP.indexOf("\n}\n", i) + 2);
    new Function(...Object.keys(deps), "return (" + bloc + ")")(...Object.values(deps))({ price: 1, levels: {} }, null, deriv);
    return alerte;
  };
  assert.deepEqual(ruleaza({ ls: 3.0, lsVot: 0, lsPct: 51, funding: 0.00004, fr8: 0.00004, oiTrend: "+0.20%" }), []);
  const x = ruleaza({ ls: 3.56, lsVot: -1, lsPct: 100, funding: 0.00004, fr8: 0.00004, oiTrend: "N/A" });
  assert.equal(x.length, 1); assert.equal(x[0][0], "ls"); assert.equal(x[0][1], "Long/Short la extrem");
});
await test("5d proxy-ul de lichidări ia partea din contextul paginii: ETH 3,0 echilibrat ⇒ BALANCED (înainte: LONG LIQUIDATION RISK de la 1,35)", () => {
  const ruleaza = (deriv) => {
    const el = {}; const $ = (id) => (el[id] = el[id] || { textContent: "", className: "", innerHTML: "" });
    new Function("$", "num", "FuturesCitire", "return (" + fnApp("renderLiquidationProxy") + ")")($, String, incarcaFC())({ price: 100, atr: 1 }, deriv);
    return el.proxyBias.textContent;
  };
  assert.equal(ruleaza({ context: "BALANCED", ls: 3.0, funding: 0.0001, oiTrend: "+0.10%" }), "BALANCED");
  assert.equal(ruleaza({ context: "CROWDED", ls: 3.6, funding: 0.0001, oiTrend: "+0.10%" }), "LONG LIQUIDATION RISK");
  assert.equal(ruleaza({ context: "CONTRARIAN +", ls: 0.5, funding: -0.0005, oiTrend: "+4.00%" }), "SHORT SQUEEZE RISK · OI EXPANSION");
  assert.equal(ruleaza({}), "BALANCED");
});
await test("5e costul v63 ia intervalul măsurat al funding-ului (COTI 4 h), setarea rămâne rezerva", () => {
  const ruleaza = (stare) => new Function("v63CostSettings", "v63ResolvedInstrument", "window", "return (" + fnApp("v63CostInputSnapshot") + ")")(
    () => ({ instrument: "AUTO", borrowAnnualPct: 8, locate: "UNKNOWN", fundingIntervalHours: 8, holdHours: 24 }), () => "PERP", { __derivativesState: stare })("LONG");
  assert.equal(ruleaza({ funding: -0.0001, fundingIntervalHours: 4 }).fundingIntervalHours, 4);
  assert.equal(ruleaza({ funding: -0.0001 }).fundingIntervalHours, 8);
  assert.equal(ruleaza({}).fundingIntervalHours, 8);
});
await test("5f verdictul: contextul futures pe direcție (longuri înghesuite susțin un short, sunt risc pentru un long)", () => {
  const F = incarcaFC();
  assert.equal(F.inVerdict("CROWDED", -1).parte, "pos"); assert.equal(F.inVerdict("CROWDED", 1).parte, "risks"); assert.equal(F.inVerdict("CROWDED", 0).parte, "risks");
  assert.equal(F.inVerdict("CONTRARIAN +", -1).parte, "risks"); assert.equal(F.inVerdict("CONTRARIAN +", 1).parte, "pos");
  assert.equal(F.inVerdict("BALANCED", 1), null); assert.equal(F.inVerdict(null, 1), null);
  const mv = fnApp("renderMasterVerdict");
  assert.match(mv, /FuturesCitire\.inVerdict\(window\.__derivativesState\?\.context,dir\)/);
  assert.doesNotMatch(mv, /risks\.push\("Futures positioning crowded"\)/);
});
await test("5g aglomerarea boților: funding adus la 8 h cu intervalul scris; raportul față de istoria monedei (fără istorie: regula veche)", async () => {
  const S = new Function("GridCalcul", citeste("public", "lib", "semnale-bot.js") + "; return SemnaleBot;")({});
  const oiSus = [{ sumOpenInterest: 100 }, { sumOpenInterest: 120 }];
  // ETH, bot long: raportul 3,0 e obișnuit pentru ETH ⇒ doar OI ⇒ un singur semn ⇒ nimic (înainte: 3,0 ≥ 1,5 ⇒ două semne)
  assert.equal(S.aglomerare({ funding: 0.00004, fundingIntervalHours: 8, longShort: 3.0, lsIst: ethIst, oiHist5m: oiSus }, "long"), null);
  // același, raportul la vârf ⇒ două semne
  assert.ok(S.aglomerare({ funding: 0.00004, fundingIntervalHours: 8, longShort: 3.6, lsIst: ethIst, oiHist5m: oiSus }, "long"));
  // COTI la 4 h, bot short: −0,02% la 4 h = −0,04% la 8 h ⇒ semn, scris „/4 h”
  const c = S.aglomerare({ funding: -0.0002, fundingIntervalHours: 4, longShort: 0.5, lsIst: istoric(500, (i) => 0.9 + (i % 50) / 100), oiHist5m: [] }, "short");
  assert.ok(c, "COTI short fără semne"); assert.match(c.dovezi, /\/4 h/); assert.doesNotMatch(c.dovezi, /\/8 h/);
  // fără istoria raportului (server vechi): regula veche, neschimbată (garda textelor)
  assert.equal(S.aglomerare({ funding: 0.0006, longShort: 2.1, oiHist5m: oiSus }, "long").semne, 3);
});

// ---------------------------------------------------------------- 4. HTML, CSS, sw, versiunea
await test("4a capul paginii neatins (proba v100.247), cartelele au rândul de sub cifră, meta + „↻”, două rânduri noi în rezumat", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /<section class="panel cryptoContextOnly" id="deriv"><div class="sectionHead"><h3>Futures · funding și OI<\/h3><span class="small">Binance USDⓈ-M · doar citire<\/span><\/div><div class="grid">/);
  const d = html.slice(html.indexOf('id="deriv"'), html.indexOf('id="edgepro"'));
  for (const id of ["funding", "oi", "lsratio", "fcontext", "ftext", "fundingBias", "crowdingRisk", "oiContext", "fundingSub", "oiSub", "lsSub", "fcontextSub", "fMeta", "fundingMed", "oiPret24"]) assert.match(d, new RegExp('id="' + id + '"'), id);
  assert.match(d, /data-action-click="derivatives\(true\)"/);
});
await test("4b modulul se încarcă înaintea app.js și stă în APP_SHELL", () => {
  const html = citeste("public", "index.html"), sw = citeste("public", "sw.js");
  const i = html.indexOf('<script src="/lib/futures-citire.js"></script>'), j = html.indexOf(' src="/app.js"');
  assert.ok(i > 0 && j > i, i + " / " + j);
  assert.match(sw, /"\/lib\/futures-citire\.js"/);
});
await test("4c CSS: rândul de sub cifră și meta există; pânda rămâne înaintea cozii", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#deriv \.fSub\{/); assert.match(css, /#deriv \.fMeta\{/);
  // cele trei cifre pe un rând peste 760 px, fiecare pe rândul ei pe telefon; contextul pe lățime
  assert.match(css, /\n#deriv \.grid>\.card:has\(#funding\),#deriv \.grid>\.card:has\(#oi\),#deriv \.grid>\.card:has\(#lsratio\)\{grid-column:span 4\}/);
  assert.match(css, /@media \(max-width:760px\)\{#deriv \.grid>\.card:has\(#funding\),#deriv \.grid>\.card:has\(#oi\),#deriv \.grid>\.card:has\(#lsratio\)\{grid-column:1\/-1\}\}/);
  assert.match(css, /\n#deriv \.grid>\.card:has\(#fcontext\)\{grid-column:1\/-1\}/);
  assert.equal(pandaInainteaCozii(css), "");
});
await test("4d versiunea ≥ v100.264 peste tot, nota FUT în BUILD_INFO, proba în lanț", () => {
  const P = JSON.parse(citeste("package.json")), ver = Number(P.version.split(".")[1]), V = "v100." + ver;
  assert.ok(ver >= 264, V); assert.equal(P.version, "100." + ver + ".0");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, V); assert.ok(bi.badge.startsWith(V + " · ")); assert.match(String(bi.features.fut264), /4 h/);
  const html = citeste("public", "index.html");
  assert.match(html, new RegExp('<meta content="' + V.replace(".", "\\.") + '" name="app-version"/>'));
  assert.match(html, new RegExp('id="sideVersiune"[^>]*>' + V.replace(".", "\\.") + " · "));
  assert.ok(citeste("public", "sw.js").startsWith('const CACHE="crypto-radar-v100-' + ver + '";'));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('VERSIUNE = "' + V + '"'));
  assert.equal(P.scripts["test:v100264"], "node scripts/proba-v100264.mjs"); assert.match(P.scripts.test, /npm run test:v100264/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
