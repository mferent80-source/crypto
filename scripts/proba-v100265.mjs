// Proba v100.265 (29.10, el: „fa ideile”) - ideile F1–F5 de pe pagina Futures:
//  F1 funding-ul Pionex (unde stau boții) lângă cel Binance · F2 intervalul oficial (/fapi/v1/fundingInfo) · F3 istoria pe 21 de zile desenată
//  F4 conturile mari (poziții) + cumpărătorii agresivi (taker) · F5 prima futures față de spot (markPrice / indexPrice).
// Toate sunt informație de context: niciuna nu intră în votul „înghesuit” (nimic dovedit despre preț).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";
import "./lib/text-ro-global.mjs";

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
const FC = () => new Function(citeste("public", "lib", "futures-citire.js") + "; return FuturesCitire;")();
// grid-sim.js cere GridCalcul și GridProba - același lanț ca proba-mc-regim.mjs (și ca pagina)
const GS = () => new Function(["grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js"].map((f) => citeste("public", "lib", f)).join(";\n") + "; return GridSim;")();
const istoric = (n, f) => Array.from({ length: n }, (_, i) => [1793000000000 + i * 3600000, f(i)]);
console.log("\nV100.265 · IDEILE FUTURES · proba\n");

// ---------------------------------------------------------------- 1. modulul
await test("F5 prima futures față de spot, în puncte de bază; text cu sensul pentru funding", () => {
  const F = FC();
  assert.ok(Math.abs(F.prima(100.021, 100) - 2.1) < 1e-9); assert.equal(F.prima(null, 100), null); assert.equal(F.prima(100, 0), null);
  assert.equal(F.primaText(2.1), "+2,1 bp"); assert.equal(F.primaText(-3.44), "−3,4 bp"); assert.equal(F.primaText(null), "—");
  assert.match(F.subPrima(2.1), /mai scump decât spotul/); assert.match(F.subPrima(-3), /mai ieftin decât spotul/); assert.match(F.subPrima(0.4), /la paritate/);
});
await test("F1 funding-ul Pionex: rata, intervalul, costul pe zi, media pe 7 zile și comparația cu Binance pe 8 h", () => {
  const F = FC(), G = GS(), acum = 1793270000000;
  const rates = Array.from({ length: 50 }, (_, i) => ({ fundingTime: 1793260800000 - i * 4 * 3600000, fundingRate: i === 0 ? "-0.0001635309" : "-0.00005" }));
  const px = G.rataFunding(rates, acum);
  assert.equal(px.intervalOre, 4);
  const t = F.subPionex(px, -0.00034534);
  assert.match(t, /la 4 h/); assert.match(t, /shorturile plătesc/); assert.match(t, /media pe 7 zile/); assert.match(t, /Binance/);
  assert.equal(F.pionexText(px), "−0,0164%");
  assert.match(F.subPionex(null, 0.0001), /Pionex nu are/);
  assert.doesNotMatch(t, /NaN|undefined|null/);
});
await test("F4 conturile mari pe poziții față de toate conturile, cu diferența în puncte; cumpărătorii agresivi pe 24 h cu percentila", () => {
  const F = FC();
  const taker = Array.from({ length: 200 }, (_, i) => [i, i >= 176 ? 40 : 50, 50]);   // ultimele 24 h: 40 cumpărate / 50 vândute
  const b = F.baniMari({ ls: 1.2873, topLs: 2.2877, topIst: istoric(500, (i) => 1.8 + (i % 50) / 100), takerIst: taker });
  assert.equal(Math.round(b.longTop), 70); assert.equal(Math.round(b.longToti), 56);
  assert.match(b.divergenta, /conturile mari sunt mai long decât mulțimea/); assert.match(b.divergenta, /\+14 pp/);
  assert.ok(Math.abs(b.cump24 - 40 / 90 * 100) < 1e-9); assert.ok(b.takerPct <= 5, "p" + b.takerPct);
  assert.equal(F.baniMariText(b), "70% long");
  assert.match(F.subBaniMari(b), /toate conturile: 56% long/); assert.match(F.subBaniMari(b), /cumpărători agresivi în 24 h: 44%/);
  assert.equal(F.baniMari({}), null);
});
await test("F3 graficul: SVG accesibil, două panouri (raportul cu p1/p99, funding-ul pe plăți), culori validate, fără NaN", () => {
  const F = FC();
  const fh = Array.from({ length: 30 }, (_, i) => ({ fundingTime: 1793000000000 + i * 4 * 3600000, fundingRate: i % 3 ? "0.0001" : "-0.0002" }));
  const s = F.grafic({ lsIst: istoric(500, (i) => 2.5 + (i % 100) / 100), fundingHist: fh, ls: 3.53 });
  assert.match(s, /^<svg [^>]*role="img"/); assert.match(s, /aria-label="Raportul long\/short/);
  assert.equal((s.match(/class="fBara"/g) || []).length, 30);
  assert.match(s, /#BE7F22/); assert.match(s, /#5B8FC7/);   // validate cu dataviz (fond #1A242E): ΔE 21,6 la daltonism
  // barele poartă culoarea polarității (legenda singură nu ajunge - stricarea cu bare gri trecea): 20 plătite de longuri, 10 de shorturi
  assert.equal((s.match(/class="fBara"[^>]*fill="#BE7F22"/g) || []).length, 20);
  assert.equal((s.match(/class="fBara"[^>]*fill="#5B8FC7"/g) || []).length, 10);
  assert.match(s, /p99 /); assert.match(s, /p1 /); assert.match(s, /acum 3,53/);
  assert.ok((s.match(/<title>/g) || []).length >= 30, "fără tooltip-uri");
  assert.doesNotMatch(s, /NaN|undefined|Infinity/);
  assert.equal(F.grafic({}), "");
  // poza din 29.10: pe telefon (640 strâns la ~340 px) textul ieșea ~6 px ⇒ se desenează la lățimea cartelei, textul rămâne 11 px
  assert.match(F.grafic({ lsIst: istoric(500, (i) => 2.5 + (i % 100) / 100), fundingHist: fh, ls: 3.53, lat: 360 }), /viewBox="0 0 360 242"/);
  assert.match(F.grafic({ lsIst: istoric(500, (i) => 2.5 + (i % 100) / 100), ls: 3.53, lat: 100 }), /viewBox="0 0 320 242"/);
  // „acum” lângă linia p99 se scrie SUB punct (poza COTI: eticheta călca pe linia punctată)
  const lang = F.grafic({ lsIst: istoric(500, (i) => 2.5 + (i % 100) / 100), ls: 3.49 });
  const yPunct = Number(lang.match(/<circle cx="[^"]+" cy="([^"]+)" r="4"/)[1]), yEt = Number(lang.match(/<text x="[^"]+" y="([^"]+)"[^>]*>acum /)[1]);
  assert.ok(yEt > yPunct, "eticheta deasupra punctului, pe linia p99: " + yEt + " / " + yPunct);
  // poza COTI (a doua): punctul la ~15 px SUB linia p99 ⇒ eticheta de deasupra lui călca pe linie ⇒ tot dedesubt
  const sub = F.grafic({ lsIst: istoric(500, (i) => 1 + (i % 100) / 100), ls: 1.78 });
  const yP2 = Number(sub.match(/<circle cx="[^"]+" cy="([^"]+)" r="4"/)[1]), yE2 = Number(sub.match(/<text x="[^"]+" y="([^"]+)"[^>]*>acum /)[1]), yL = Number(sub.match(/<line [^>]*y1="([^"]+)"/)[1]);
  // 12–24 px sub linie: zona în care regula veche (|punct − linie| < 12) lăsa eticheta deasupra, pe linie
  assert.ok(yP2 - yL > 12 && yP2 - yL < 24, "punctul de probă trebuie să stea 12–24 px sub linie: " + (yP2 - yL));
  assert.ok(yE2 > yP2, "eticheta pe linia p99: " + yE2 + " / punct " + yP2 + " / linie " + yL);
  assert.match(sub, /paint-order="stroke"/);
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
  const res = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/market?type=futures&symbol=" + (opt.simbol || "COTIUSDT"), { headers: { authorization: `Bearer ${TOKEN}` } }), env: { APP_API_TOKEN: TOKEN } });
  return { corp: JSON.parse(await res.text()), cerute, mod };
}
const H8 = [0, 1, 2].map((i) => ({ fundingTime: 1793232000000 + i * 8 * 3600000, fundingRate: "0.0001" }));
const binance = (url) => {
  if (/fundingInfo/.test(url)) return { corp: '[{"symbol":"COTIUSDT","fundingIntervalHours":4},{"symbol":"BTCUSDT","fundingIntervalHours":8}]' };
  if (/premiumIndex/.test(url)) return { corp: '{"markPrice":"0.0101","indexPrice":"0.0100","lastFundingRate":"-0.0002","nextFundingTime":1793275200000}' };
  if (/openInterest\?/.test(url)) return { corp: '{"openInterest":"1000"}' };
  if (/topLongShortPositionRatio/.test(url)) return { corp: '[{"longShortRatio":"2.3135","timestamp":1793264400000},{"longShortRatio":"2.2877","timestamp":1793268000000}]' };
  if (/takerlongshortRatio/.test(url)) return { corp: '[{"buySellRatio":"0.6302","buyVol":"4639706","sellVol":"7362323","timestamp":1793264400000}]' };
  if (/globalLongShortAccountRatio/.test(url)) return { corp: '[{"longShortRatio":"1.29","timestamp":1793264400000}]' };
  if (/fundingRate\?/.test(url)) return { corp: JSON.stringify(H8) };
  return { corp: "[]" };
};
await test("F2 intervalul oficial din /fapi/v1/fundingInfo bate intervalul din plăți (COTI 4 h, deși istoria arată 8 h); sursa e spusă", async () => {
  const { corp } = await server(binance);
  assert.equal(corp.fundingIntervalHours, 4); assert.equal(corp.fundingIntervalSursa, "binance");
});
await test("F2 lista oficială se cere o dată și se ține minte; fără ea rămâne intervalul din plăți", async () => {
  const a = await server(binance);
  const b = await server(binance, { modul: a.mod });
  assert.equal(b.cerute.filter((u) => /fundingInfo/.test(u)).length, 0);
  const c = await server((u) => /fundingInfo/.test(u) ? { status: 403, corp: "nu" } : binance(u));
  assert.equal(c.corp.fundingIntervalHours, 8); assert.equal(c.corp.fundingIntervalSursa, "plati");
  assert.ok(!c.corp.probleme || !c.corp.probleme.fundingInfo, "lista oficială nu e o problemă a datelor");
});
await test("F4 serverul trimite raportul conturilor mari (poziții) și cumpărătorii agresivi, cu istoria lor", async () => {
  const { corp } = await server(binance);
  assert.equal(corp.topLs, 2.2877); assert.deepEqual(corp.topIst, [[1793264400000, 2.3135], [1793268000000, 2.2877]]);
  assert.deepEqual(corp.takerIst, [[1793264400000, 4639706, 7362323]]);
});

// ---------------------------------------------------------------- 3. pagina
function cutie(raspunsuri, opt = {}) {
  const el = {}, cerute = [];
  const $ = (id) => (el[id] = el[id] || { textContent: "", className: "", innerHTML: "", title: "", value: "" });
  const src = fnApp("derivatives").replace(/^function derivatives\(\)/, "async function()").replace(/\nlet scannerRows=\[\];[\s\S]*$/, "");
  const win = {};
  const deps = { $, assetClass: () => "CRYPTO", norm: (s) => s, document: { getElementById: (id) => $(id) }, window: win, markFresh() {},
    simBinanceFut: new Function("return " + APP.match(/function simBinanceFut\([^\n]*/)[0])(),
    getJSON: async (u) => { cerute.push(u); if (/type=pionex_funding/.test(u)) return raspunsuri.pionex; if (u.startsWith("/api/")) return raspunsuri.futures; throw new Error("400"); },
    oiChangeAt: new Function("return " + fnApp("oiChangeAt"))(), pctText: new Function("return " + fnApp("pctText"))(),
    fundingSummary: new Function("pctRank", "return " + fnApp("fundingSummary"))(new Function("return " + fnApp("pctRank"))()),
    fundingRo: new Function("return " + fnApp("fundingRo"))(), compact: (x) => Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 2 }).format(x),
    eroareDeParola: () => false, textEroare: (e) => String(e && e.message), updateFlowWindow() {}, renderLiquidationProxy() {}, renderQuantFlow() {},
    FuturesCitire: FC(), GridSim: opt.faraGridSim ? undefined : GS() };
  $("symbol").value = opt.simbol || "COTIUSDT";
  const f = new Function(...Object.keys(deps), "return (" + src + ")")(...Object.values(deps));
  return { f, el, cerute, win };
}
const fut = { funding: -0.00017267, openInterest: 366756507, longShort: 1.2873, simbol: "COTIUSDT", markPrice: 0.010121, indexPrice: 0.0101, nextFundingTime: Date.now() + 3600000,
  fundingIntervalHours: 4, fundingIntervalSursa: "binance", oiUsd: 3706000, lsIst: istoric(500, (i) => 1.1 + (i % 50) / 100),
  fundingHist: Array.from({ length: 30 }, (_, i) => ({ fundingTime: 1793000000000 + i * 4 * 3600000, fundingRate: i % 2 ? "0.0001" : "-0.0002" })),
  oiHist5m: [{ sumOpenInterest: "355000000", sumOpenInterestValue: "3620000" }, { sumOpenInterest: "366756507", sumOpenInterestValue: "3706000" }],
  topLs: 2.2877, topIst: istoric(500, (i) => 1.8 + (i % 50) / 100), takerIst: Array.from({ length: 200 }, (_, i) => [i, 50, 50]) };
const pionex = { result: true, data: { rates: Array.from({ length: 60 }, (_, i) => ({ fundingTime: Date.now() - 600000 - i * 4 * 3600000, fundingRate: "-0.00016" })) } };
await test("F1 pagina cere funding-ul Pionex pe moneda de bază (PEPE ⇒ PEPE_USDT_PERP, nu 1000PEPE) și îl scrie lângă Binance", async () => {
  const c = cutie({ futures: { ...fut, simbol: "1000PEPEUSDT" }, pionex }, { simbol: "PEPEUSDT" }); await c.f();
  assert.ok(c.cerute.some((u) => /type=pionex_funding&symbol=PEPE_USDT_PERP$/.test(u)), c.cerute.join(" "));
  assert.equal(c.el.pxFunding.textContent, "−0,0160%"); assert.match(c.el.pxSub.textContent, /la 4 h/); assert.match(c.el.pxSub.textContent, /Binance/);
});
await test("F1 fără GridSim sau fără răspuns Pionex: „—”, fără excepție", async () => {
  const c = cutie({ futures: fut, pionex: null }, { faraGridSim: true }); await c.f();
  assert.equal(c.el.pxFunding.textContent, "—"); assert.match(c.el.pxSub.textContent, /Pionex nu are/);
});
await test("F2–F5 pe pagină: sursa intervalului, prima în bp, conturile mari, graficul", async () => {
  const c = cutie({ futures: fut, pionex }); await c.f();
  assert.match(c.el.fundingSub.textContent, /la 4 h \(Binance\)/);
  assert.equal(c.el.fPrima.textContent, "+20,8 bp"); assert.match(c.el.fPrimaSub.textContent, /mai scump decât spotul/);
  assert.equal(c.el.fTop.textContent, "70% long"); assert.match(c.el.fTopSub.textContent, /toate conturile: 56% long/);
  assert.match(c.el.fIstoric.innerHTML, /^<svg /);
  assert.doesNotMatch(Object.values(c.el).map((x) => x.textContent).join(" "), /NaN|undefined/);
});

// ---------------------------------------------------------------- 4. HTML, CSS, versiunea
await test("HTML: trei cartele noi (Pionex, prima, conturile mari) și istoria; capul paginii neatins", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /<section class="panel cryptoContextOnly" id="deriv"><div class="sectionHead"><h3>Futures · funding și OI<\/h3><span class="small">Binance USDⓈ-M · doar citire<\/span><\/div><div class="grid">/);
  const d = html.slice(html.indexOf('id="deriv"'), html.indexOf('id="edgepro"'));
  for (const id of ["pxFunding", "pxSub", "fPrima", "fPrimaSub", "fTop", "fTopSub", "fIstoric"]) assert.match(d, new RegExp('id="' + id + '"'), id);
  assert.equal((d.match(/class="card fCifra"/g) || []).length, 3);
});
await test("CSS: cartelele noi pe un rând peste 760 px, pe rândul lor pe telefon; graficul pe lățime; pânda la locul ei", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /\n#deriv \.grid>\.card\.fCifra\{grid-column:span 4\}/);
  assert.match(css, /@media \(max-width:760px\)\{#deriv \.grid>\.card\.fCifra\{grid-column:1\/-1\}\}/);
  assert.match(css, /#deriv \.fIstoric svg\{[^}]*width:100%/);
  assert.equal(pandaInainteaCozii(css), "");
});
await test("versiunea ≥ v100.265 peste tot, nota IDEI în BUILD_INFO, proba în lanț", () => {
  const P = JSON.parse(citeste("package.json")), ver = Number(P.version.split(".")[1]), V = "v100." + ver;
  assert.ok(ver >= 265, V); assert.equal(P.version, "100." + ver + ".0");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, V); assert.ok(bi.badge.startsWith(V + " · ")); assert.match(String(bi.features.idei265), /Pionex/);
  assert.ok(citeste("public", "sw.js").startsWith('const CACHE="crypto-radar-v100-' + ver + '";'));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('VERSIUNE = "' + V + '"'));
  assert.equal(P.scripts["test:v100265"], "node scripts/proba-v100265.mjs"); assert.match(P.scripts.test, /npm run test:v100265/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
