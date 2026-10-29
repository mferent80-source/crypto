// Proba v100.267-e (auditul 29.10, al doilea val 🟡): datele vechi arătate drept proaspete.
//  1. analyze() n-avea jeton: două analize pornite repede (alt simbol / interval), răspunsul VECHI venit al doilea rescria __radarState,
//     prețul și verdictul cu moneda veche (felia 6). Acum, după fiecare așteptare, analiza veche iese (ca __derivSeq la Futures).
//  2. Tabloul: citirea goală a boților (Pionex dă lista goală, boții de dinainte se țin 10 min) punea botLa = acum - banda spunea „citit acum”
//     despre date vechi - și scria în istoric valorile ÎNGHEȚATE ale botului, la fiecare 8 s (felia 1).
// Funcțiile se iau din public/app.js după text și rulează într-o lume dată de probă; numele nedate sunt cioturi (nu globalele Node).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
const fnApp = (nume) => { const i = APP.search(new RegExp("\\n(async )?function " + nume + "\\(")); assert.ok(i >= 0, "lipsește " + nume); const j = APP.indexOf("\nfunction ", i + 10), k = APP.indexOf("\nasync function ", i + 10); const f = [j, k].filter((x) => x > 0); return APP.slice(i + 1, f.length ? Math.min(...f) : undefined); };
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }
}
console.log("\nV100.267-e · AUDITUL 29.10 · analiza cu jeton, citirea goală a botului\n");

function inLume(baza, cod, nume) {
  const ciot = () => undefined;
  const M = new Proxy(baza, {
    has: (t, k) => typeof k === "string" && (k in t || !(k in globalThis)),
    get: (t, k) => (typeof k !== "string" ? undefined : k in t ? t[k] : ciot),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return new Function("M", "with (M) { " + cod + "\n return " + nume + "; }")(M);
}
const amanat = () => { let da; const p = new Promise((r) => { da = r; }); return { p, da }; };
const el = () => ({ value: "", textContent: "", innerHTML: "", disabled: false, classList: { add() {}, remove() {}, toggle() {} }, style: {} });

// ---------------------------------------------------------------- 1. analyze() cu jeton
function lumeAnaliza() {
  const els = {}, $ = (id) => (els[id] ??= el()), window = { __signalState: { sm: {} } }, kl = {};
  const bare = (pret) => Array.from({ length: 200 }, (_, i) => [i * 3600000, pret, pret, pret, pret, 1]);
  const b = {
    window, $, els, applyNetworkState: () => true, norm: (s) => String(s).toUpperCase(), analysisSource: () => "BINANCE", assetClass: () => "CRYPTO",
    pionexCooldownRemaining: () => 0, coin: (s) => s, stockSymbol: (s) => s, setBusy: () => {}, toast: () => {},
    analysisKlines: (sym) => kl[sym].p, analysisTicker: async () => ({}), mtfData: async () => ({}),
    bareInchise: (j) => j, calc: (j) => ({ price: +j.at(-1)[4] }), historicalSet: () => ({}), mtfComposite: () => ({}),
    refreshMarketBreadthV64: async () => null, derivatives: async () => {}, loadPionexMicrostructure: async () => {},
    evaluateResearchJournalSilent: async () => {}, pionexScannerActive: true,
  };
  return { b, kl, bare, analyze: inLume(b, fnApp("analyze"), "analyze") };
}
await test("1a două analize repede: răspunsul VECHI (ETH, venit al doilea) nu rescrie starea analizei noi (SOL)", async () => {
  const L = lumeAnaliza();
  L.kl.ETHUSDT = amanat(); L.kl.SOLUSDT = amanat();
  L.b.$("symbol").value = "ETHUSDT"; L.b.$("tf").value = "4h"; L.b.$("mode").value = "swing";
  const a = L.analyze(false);
  L.b.$("symbol").value = "SOLUSDT";
  const s = L.analyze(false);
  L.kl.SOLUSDT.da(L.bare(150)); await s;
  assert.equal(L.b.window.__radarState && L.b.window.__radarState.symbol, "SOLUSDT", "premisa: SOL a scris starea");
  L.kl.ETHUSDT.da(L.bare(3900)); await a;
  assert.equal(L.b.window.__radarState.symbol, "SOLUSDT", "analiza veche (ETH) a rescris starea: " + L.b.window.__radarState.symbol);
  assert.equal(L.b.window.__radarState.q.price, 150);
});
await test("1b o singură analiză (fără alta în zbor) scrie starea ca înainte", async () => {
  const L = lumeAnaliza(); L.kl.BTCUSDT = amanat();
  L.b.$("symbol").value = "BTCUSDT"; L.b.$("tf").value = "1h"; L.b.$("mode").value = "swing";
  const a = L.analyze(false); L.kl.BTCUSDT.da(L.bare(65000)); await a;
  assert.equal(L.b.window.__radarState.symbol, "BTCUSDT"); assert.equal(L.b.window.__radarState.q.price, 65000);
});

// ---------------------------------------------------------------- 2. Tabloul: citirea goală nu e „citit acum”
function lumeTablou(raspunsuri) {
  const scrise = [], tbStare = { gen: 0, boti: [{ id: "b1", activ: true, baza: "SOL", quote: "USDT", pretCurent: 150, ordinePerechi: 40 }], bot: { id: "b1", activ: true, baza: "SOL", quote: "USDT", pretCurent: 150, ordinePerechi: 40 }, botLa: 1000, istoric: [] };
  let n = 0;
  const b = {
    tbStare, getJSON: async (u) => (/bot-orders/.test(u) ? raspunsuri[Math.min(n++, raspunsuri.length - 1)] : /klines/.test(u) ? { data: { klines: [] } } : { data: { rates: [] } }),
    TabloBot: { alegeBot: (l) => ({ bot: l[0], motiv: "activ" }), simboluri: () => ({ pionex: "SOL_USDT_PERP", binance: "SOLUSDT" }), istoricAdauga: (ist, x) => ist.concat([x]), imbinaIstoric: (ist) => ist },
    tbCiteste: () => [], tbScrie: (k, ist) => { scrise.push(ist.length); return true; }, tbPretSpotProaspat: () => false, tbPanouVizibil: () => false, textEroare: String, renderTabloBot: () => {},
    TB_ISTORIC_PREFIX: "tb-ist-", TB_BOT_ALES: "tb-ales", gsRataFunding: () => null,
  };
  return { b, scrise, tbAduDate: inLume(b, fnApp("tbAduDate"), "tbAduDate") };
}
await test("2a citirea goală ținută (boții de dinainte): botLa NU devine „acum” și istoricul nu primește valorile înghețate", async () => {
  const goala = { bots: [], probleme: { listaNula: true } };
  const L = lumeTablou([goala]);
  const inainte = L.b.tbStare.botLa;
  await L.tbAduDate();
  assert.equal(L.b.tbStare.citireGoala, true, "premisa: citirea goală e ținută");
  assert.equal(L.b.tbStare.botLa, inainte, "botLa a devenit „acum” deși botul e cel de dinainte (citirea a venit goală)");
  assert.deepEqual(L.scrise, [], "în istoric s-au scris valorile înghețate ale botului");
});
await test("2b citirea bună: botLa = acum și istoricul primește rândul (ca înainte)", async () => {
  const L = lumeTablou([{ bots: [{ id: "b1", activ: true, baza: "SOL", quote: "USDT", pretCurent: 151, ordinePerechi: 41 }] }]);
  const t0 = Date.now(); await L.tbAduDate();
  assert.ok(L.b.tbStare.botLa >= t0); assert.deepEqual(L.scrise, [1]);
});

// ---------------------------------------------------------------- 3. avertismentele Tabloului se văd
await test("3a avertismentele (lumânări învechite, botul ales dispărut, stocarea) apar într-un rând VIZIBIL, nu doar în cardul ascuns din v82", () => {
  const card = { id: "tbVerdictCard", parentNode: null }, inainte = [];
  const parinte = { insertBefore: (x, ref) => { assert.equal(ref, card); inainte.push(x); } }; card.parentNode = parinte;
  const els = { tbVerdictCard: card }, $ = (id) => els[id] || null;
  const document = { createElement: () => { const x = { hidden: false, textContent: "", className: "", setAttribute(k, v) { this[k] = v; } }; Object.defineProperty(x, "id", { set(v) { els[v] = x; this._id = v; }, get() { return this._id; } }); return x; } };
  const f = inLume({ $, document }, fnApp("tbAvertVizibil"), "tbAvertVizibil");
  f(["lumânările sunt învechite - ultima citire a picat", "botul ales de tine nu mai e în listă - se arată SOL"]);
  assert.equal(inainte.length, 1, "rândul vizibil trebuia creat lângă card");
  assert.equal(els.tbAvertVizibil.hidden, false); assert.match(els.tbAvertVizibil.textContent, /învechite.*nu mai e în listă/);
  f([]); assert.equal(els.tbAvertVizibil.hidden, true, "fără avertismente rândul se ascunde"); assert.equal(inainte.length, 1, "creat o singură dată");
  assert.match(fnApp("renderTabloBot"), /tbAvertVizibil\(\(!eroareActiva&&b&&tbStare\.stocareStricata\?\[v\.titlu\]:\[\]\)\.concat\(note\)\)/, "renderTabloBot nu trimite notele în rândul vizibil");
  assert.match(fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8"), /#tabloubot #tbVerdictCard\{display:none\}/, "premisa: cardul e ascuns");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
