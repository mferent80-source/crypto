// Proba lățimii pieței US în Radar (11.10.2026, direcția lui „o aplicație și atât”, pasul 4.1):
// pagina market-breadth din premarket_scanner se mută în Radar. Datele le face în continuare robotul
// de pe GitHub (pages.yml → market-breadth/data/latest.json); Radarul doar le CITEȘTE și le arată:
// un rând în „Ce spune piața acum” și un bloc sus în pagina de acțiuni.
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
console.log("\nLățimea pieței US în Radar · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "latime-us.js"), ctx);
const LU = ctx.LatimeUS;

const ACUM = Date.UTC(2026, 9, 11, 17, 0, 0); // duminică 11.10.2026
const zi = (k) => new Date(Date.UTC(2026, 9, 9) - k * 86400000).toISOString().slice(0, 10);
function json(o) {
  o = o || {};
  const dataObs = o.data || "2026-10-09";
  return {
    schemaVersion: 1, checkedAt: "2026-10-10T01:45:42+00:00",
    sources: {
      uptrend: { fetchStatus: "OK", history: Array.from({ length: 60 }, (_, i) => ({ date: zi(59 - i), ratio: 0.15 + i * 0.001 })) },
      sp500: { fetchStatus: "OK", history: Array.from({ length: 60 }, (_, i) => ({ date: zi(59 - i), above200: 0.6 - i * 0.002 })) },
    },
    full: {
      status: o.status || "COMPLETE",
      engine: {
        data: {
          sp: { score: 27.6, zone: "Weakening", exposure: "40-60%", data_date: dataObs },
          uptrend: { score: 49.1, zone: "Neutral", exposure: "Reduced Exposure (60-80%)", data_date: dataObs },
          ndx: { score: 54.3, zone: "Healthy", exposure: "75-90%", data_date: dataObs },
          r2k: { score: 34.8, zone: "Weakening", exposure: "40-60%", data_date: dataObs },
        },
        master: { score: -2, stance: o.stance || "PRUDENTA / DEFENSIV", action: "Redu expunerea, ridica cash, doar setup-uri A+. Protejeaza castigurile." },
      },
      ideas: {
        rising_sectors: ["XLE", "XLK", "XLV"], rising_count: 3,
        early_buy: [{ ticker: "MRVL", sector: "Information Technology", pct_from_high: -13, ret_1m: 21.3, earnings: "2026-12-01" }, { ticker: "<b>X</b>", sector: "Industrials", pct_from_high: -5.25, ret_1m: 1, earnings: null }], early_count: 2,
        contrarian: [{ ticker: "NCLH", sector: "Consumer Discretionary", pct_from_high: -37.8, ret_1m: 6.9, earnings: "2026-11-04" }], contrarian_count: 1,
      },
    },
  };
}

await test("normalizeaza: verdictul, cele 4 scoruri cu zona în română și expunerea curată", () => {
  const n = LU.normalizeaza(json(), ACUM);
  assert.equal(n.data, "2026-10-09");
  assert.equal(n.stanta, "prudență / defensiv");
  assert.equal(n.stare, "atentie");
  assert.deepEqual(JSON.parse(JSON.stringify(n.scoruri.map((s) => [s.nume, s.scor, s.zona, s.expunere]))), [
    ["S&P 500", 27.6, "slăbire", "40-60%"], ["Participare în trend", 49.1, "neutru", "60-80%"],
    ["Nasdaq 100", 54.3, "sănătos", "75-90%"], ["Russell 2000", 34.8, "slăbire", "40-60%"],
  ]);
  assert.equal(n.actiune, "Redu expunerea, ridică cash, doar setup-uri A+. Protejează câștigurile.");
});
await test("normalizeaza: seriile pe 60 de zile în procente, sectoarele cu numele lor", () => {
  const n = LU.normalizeaza(json(), ACUM);
  assert.equal(n.serii.uptrend.length, 60); assert.equal(n.serii.sp200.length, 60);
  assert.ok(Math.abs(n.serii.uptrend[59].v - 20.9) < 1e-9); assert.ok(Math.abs(n.serii.sp200[0].v - 60) < 1e-9);
  assert.deepEqual(JSON.parse(JSON.stringify(n.sectoare.map((s) => s.text))), ["Energie (XLE)", "Tehnologie (XLK)", "Sănătate (XLV)"]);
  assert.equal(n.early.length, 2); assert.equal(n.contrarian.length, 1);
});
await test("toate verdictele motorului au stare și text: RISK-ON/CONSTRUCTIV bine, MIXT info, PRUDENȚĂ atenție, RISK-OFF rău", () => {
  const st = (s) => { const n = LU.normalizeaza(json({ stance: s }), ACUM); return JSON.parse(JSON.stringify([n.stare, n.stanta])); };
  assert.deepEqual(st("RISK-ON"), ["bine", "risk-on (piață largă, pe creștere)"]);
  assert.deepEqual(st("CONSTRUCTIV"), ["bine", "constructiv"]);
  assert.deepEqual(st("MIXT / PRUDENTA SELECTIVA"), ["info", "mixt / prudență selectivă"]);
  assert.deepEqual(st("MIXT"), ["info", "mixt"]);
  assert.deepEqual(st("PRUDENTA / DEFENSIV"), ["atentie", "prudență / defensiv"]);
  assert.deepEqual(st("RISK-OFF"), ["rau", "risk-off (păstrează capitalul)"]);
  assert.deepEqual(st("CEVA NOU"), ["info", "ceva nou"]);
});
await test("vechimea: o observație de vineri e proaspătă duminică; una de acum 6 zile e „veche”", () => {
  assert.equal(LU.normalizeaza(json(), ACUM).vechi, false);
  assert.equal(LU.normalizeaza(json({ data: "2026-10-05" }), ACUM).vechi, true);
});
await test("date stricate sau goale ⇒ null, nu excepție", () => {
  for (const x of [null, {}, { full: {} }, { full: { engine: {} } }, "text"]) assert.equal(LU.normalizeaza(x, ACUM), null);
});
await test("textCitire: un rând cu verdictul, zonele, expunerea S&P, sectoarele și ziua observației; deschide pagina de acțiuni", () => {
  const r = LU.textCitire(LU.normalizeaza(json(), ACUM), ACUM);
  assert.equal(r.ce, "Acțiuni US (lățimea pieței)");
  assert.equal(r.stare, "atentie");
  assert.match(r.text, /^prudență \/ defensiv · S&P slăbire, Nasdaq sănătos, Russell slăbire · expunere 40-60% · 3 sectoare în creștere · date de vineri, 09\.10$/);
  assert.equal(r.actiune, "latimeUsDeschide()"); assert.equal(r.linkText, "lățimea US ›"); assert.equal(r.vechi, false);
});
await test("textCitire: datele lipsă se spun pe față (atenție), nu tac", () => {
  const r = LU.textCitire(null, ACUM);
  assert.equal(r.stare, "atentie"); assert.match(r.text, /nu s-au putut citi/);
});
await test("textCitire: datele vechi se marchează (rândul „vechi”, ca la lățimea crypto)", () => {
  const r = LU.textCitire(LU.normalizeaza(json({ data: "2026-10-05" }), ACUM), ACUM);
  assert.equal(r.vechi, true); assert.match(r.text, /date de luni, 05\.10/);
});
await test("regula „de”: 1 sector / 3 sectoare / 20 de sectoare", () => {
  const n = LU.normalizeaza(json(), ACUM);
  n.sectoare = n.sectoare.slice(0, 1); assert.match(LU.textCitire(n, ACUM).text, / 1 sector în creștere/);
  n.sectoare = Array.from({ length: 20 }, () => ({ text: "x" })); assert.match(LU.textCitire(n, ACUM).text, / 20 de sectoare în creștere/);
  n.sectoare = []; assert.match(LU.textCitire(n, ACUM).text, /niciun sector în creștere/);
});
await test("htmlBloc: verdictul, 4 cartele, graficul, sectoarele, Early Buy și Contrarian; textele din date sunt escapate", () => {
  const h = LU.htmlBloc(LU.normalizeaza(json(), ACUM));
  assert.match(h, /Lățimea pieței US/); assert.match(h, /prudență \/ defensiv/);
  assert.equal((h.match(/class="luCartela"/g) || []).length, 4);
  assert.match(h, /<svg[^>]*class="luGrafic"/); assert.match(h, /Energie \(XLE\)/);
  assert.match(h, /Early Buy<\/b> · 2/); assert.match(h, /Contrarian<\/b> · 1/);
  assert.ok(!h.includes("<b>X</b>"), "simbolul din date nu intră ca HTML"); assert.ok(h.includes("&lt;b&gt;X&lt;/b&gt;"));
  assert.match(h, /−13,0%/); assert.match(h, /21,3%/); assert.match(h, /−5,3%/, "o singură zecimală, minus tipografic");
  assert.match(h, /class="luSector"/, "coloana Sector are clasa ei (se ascunde pe telefon)");
  assert.match(h, /Context, nu semnal de intrare/);
});
await test("htmlBloc: fără date ⇒ un mesaj scurt cu ce să faci, nu un bloc gol", () => {
  const h = LU.htmlBloc(null);
  assert.match(h, /nu s-au putut citi/); assert.ok(!h.includes("luCartela"));
});

// ── legătura în pagină ───────────────────────────────────────────────────────
const app = citeste("public", "app.js"), idx = citeste("public", "index.html"), sw = citeste("public", "sw.js"), css = citeste("public", "app.css");
await test("index.html încarcă lib/latime-us.js și are locul blocului sus în pagina de acțiuni", () => {
  assert.match(idx, /<script src="\/lib\/latime-us\.js"><\/script>/);
  const s = idx.indexOf('id="stocks"'), b = idx.indexOf('id="latimeUsBloc"'), ctxUs = idx.indexOf("Sesiunea US");   /* v100.214: titlul tradus */
  assert.ok(s > 0 && b > s && b < ctxUs, "blocul e în #stocks, înaintea „US Session Context”");
});
await test("pe 1920 blocul stă SUS (sub titlu, înaintea „US Session Context”): pagina de acțiuni trimite la capăt tot ce nu e numit (order:900)", () => {
  // proba pe pagină (1920) a arătat blocul sub cardul Trading 212: `#stocks.on>*{order:900}`
  assert.match(css, /\.pzDemo #stocks\.on>\.latimeUsBloc\{order:10\}/, "scrisă ca celelalte reguli de ordine, mai tare decât .pzDemo #stocks.on>* (garda din proba-v100152)");
  const h = css.indexOf(".pzDemo #stocks.on>.stockHeroGrid{order:20"); assert.ok(h > 0, "eroul paginii are order:20 (blocul 10 vine înainte)");
});
await test("sw.js pune lib/latime-us.js în APP_SHELL", () => { assert.match(sw, /"\/lib\/latime-us\.js"/); });
await test("tbCitireExtra pune rândul lățimii US în citire, după lățimea crypto", () => {
  assert.match(app, /out\.latimeUs=/); assert.match(app, /if\(ex\.latimeUs\)out\.push\(rd\(ex\.latimeUs\)\)/);
});
await test("pagina de acțiuni desenează blocul la deschidere; latimeUsDeschide duce acolo", () => {
  assert.match(app, /latimeUsDeseneaza\(/); assert.match(app, /function latimeUsDeschide\(\)/);
  assert.match(app, /id==="stocks"\)\{[^}]*latimeUsDeseneaza/);
});
await test("CSS: pe telefon coloana Sector se ascunde și cartelele trec două pe rând", () => {
  // proba pe pagină (390 px) a arătat coloana încă vizibilă: `.luTab td{display:table-cell}` (0,1,1) bătea `.luSector{display:none}` (0,1,0)
  const m = css.slice(css.indexOf("@media (max-width:640px){.luSector"));
  const celule = m.indexOf(".luTab td,.luTab th{display:table-cell}"), ascunde = m.indexOf(".luTab .luSector{display:none}");
  assert.ok(celule > 0 && ascunde > celule, "ascunderea coloanei Sector vine DUPĂ regula care face celulele table-cell, cu specificitate egală");
  assert.match(css, /@media \(max-width:640px\)\{[^}]*\.luSector\{display:none\}/);
});

await test("meniul are „Alerte · ce dețin / urmăresc ↗” (pagina alerts din suită, care rămâne mereu) și în Alert Center un link spre ea", () => {
  const side = idx.indexOf('data-nav="alerts"');
  const buton = idx.indexOf('data-action-click="deschideAlertsPagina()"');
  assert.ok(buton > side && buton - side < 600, "butonul stă imediat după Alerts din meniu");
  assert.ok((idx.match(/deschideAlertsPagina\(\)/g) || []).length >= 2, "și în capul Alert Center");
  assert.match(app, /function deschideAlertsPagina\(\)\{[^}]*premarket_scanner\.html\/alerts\/[^}]*noopener/);
});
console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
