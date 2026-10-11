// Proba v100.150 / colector v101.93 (11.10, el: „un tool, nu 10”): lățimea pieței pe 150 perp-uri (I-583), pânda în Sugestii (I-584),
// „SUS de N zile” (I-585), monedele boților CU / CONTRA (I-586). Formulele = PAZNIC-CRYPTO/decizie.mjs (percentila :389, ema :397,
// atrSerie :405, directia :591, permisiune :598, latimea :1641, regimPietei :2710, verdictPiata :2718).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.150 · lățimea pieței pe 150 perp-uri, pânda în Sugestii · proba\n");

const sandbox = (fisiere, extra) => { const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }, extra || {}); vm.createContext(ctx); for (const f of fisiere) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f }); return ctx; };
const L = sandbox(["latime.js"]).Latime;
const P = L.PRAGURI;
const ACUM = Date.UTC(2026, 9, 11, 8, 0, 0), H4 = 4 * 3600000, ZI = 86400000;

// bare de 4h: preț după o funcție, maximul/minimul ± 1 %
const bare4 = (n, f) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * H4, o: f(i), h: f(i) * 1.01, l: f(i) * 0.99, c: f(i) }));
const bare1d = (n, f) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * ZI, o: f(i), h: f(i) + 2, l: f(i) - 2, c: f(i) }));
const serie = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const intrari = (o) => Object.assign({
  sym: "BTCUSDT", pret: 100, b4: bare4(600, (i) => 100 + i * 0.05), b1d: bare1d(30, () => 100),
  frAcum: 0.0001, fundIst: serie(500, (i) => 0.0001 * (i % 10) / 10), oiSerie: serie(500, () => 1000),
  mari: serie(200, () => ({ longAccount: 0.62 })), mici: serie(200, () => ({ longAccount: 0.45 })), taker: serie(500, (i) => ({ buySellRatio: 0.9 + (i % 5) * 0.05 })),
}, o || {});

await test("PRAGURI = cele din PAZNIC (11.10.2026)", () => {
  assert.deepEqual([P.volPctl, P.extPctl, P.adrConsumat, P.fundPctlSus, P.fundPctlJos, P.oiPctl, P.emaRapid, P.emaLent, P.atrLen, P.pctlBare, P.minZileListate, P.nSimboluri, P.paralel, P.REGIM_LARG], [90, 90, 90, 75, 25, 95, 21, 55, 14, 564, 10, 150, 5, 65]);
});
await test("percentila: rangul median, null sub 30 de valori", () => {
  assert.equal(L.percentila(serie(100, (i) => i), 90), 91, "rang median: 90 mai mici + jumătate din cea egală = 90,5 ⇒ 91 (ca în PAZNIC)"); assert.equal(L.percentila(serie(100, (i) => i), 89.5), 90); assert.equal(L.percentila(serie(100, (i) => i), 200), 100);
  assert.equal(L.percentila(serie(10, (i) => i), 5), null); assert.equal(L.percentila(serie(100, () => 7), 7), 50);
});
await test("atrSerie: media SIMPLĂ a TR pe len bare (decizie.mjs:405), NaN înaintea primei", () => {
  const b = bare4(20, () => 100), a = L.atrSerie(b, 14);
  assert.equal(a.length, 20); assert.ok(Number.isNaN(a[12])); assert.ok(Math.abs(a[13] - 2) < 1e-9, "TR = h − l = 2 la preț constant"); assert.ok(Math.abs(a[19] - 2) < 1e-9);
});
await test("directia: SUS cere EMA21 > EMA55 ȘI prețul peste EMA21; JOS invers; altfel neclară; sub 100 bare neclară", () => {
  assert.equal(L.directia(serie(600, (i) => 100 + i), P).dir, "SUS");
  assert.equal(L.directia(serie(600, (i) => 700 - i), P).dir, "JOS");
  const urcaApoiCade = serie(600, (i) => i < 590 ? 100 + i : 690 - (i - 590) * 3);   // EMA21 încă peste EMA55, prețul sub EMA21
  assert.equal(L.directia(urcaApoiCade, P).dir, "neclara");
  assert.equal(L.directia(serie(99, (i) => 100 + i), P).dir, "neclara");
});
await test("zileDir: bare consecutive cu același semn EMA21−EMA55, împărțite la 6", () => {
  assert.equal(L.zileDir(serie(600, (i) => 100 + i), P), 99);   // tot istoricul (599 bare utile ÷ 6)
  const cotitura = serie(600, (i) => i < 540 ? 700 - i : 160 + (i - 540) * 4);   // ultimele 60 de bare urcă
  const z = L.zileDir(cotitura, P); assert.ok(z >= 5 && z <= 9, "cotitură de ~60 bare ⇒ 5–9 zile, nu " + z);
});
await test("masuraMoneda: percentilele pe fereastra de 564, bugetul zilei, poziționarea, delta; sub 100 bare ⇒ null", () => {
  const r = L.masuraMoneda(intrari(), P);
  assert.equal(r.sym, "BTCUSDT"); assert.equal(r.dir, "SUS"); assert.ok(r.volPctl >= 0 && r.volPctl <= 100);
  assert.equal(r.lMari, 62); assert.equal(r.lMici, 45); assert.equal(r.diverg, 17);
  assert.equal(r.adrUsed, 100, "range azi 4 ÷ media 4 = 100 %");
  assert.ok(r.fundPctl !== null && r.oiPctl !== null && r.deltaPctl !== null);
  assert.equal(L.masuraMoneda(intrari({ b4: bare4(90, () => 100) }), P), null);
  assert.equal(L.masuraMoneda(intrari({ b1d: bare1d(10, () => 100) }), P), null);
  const faraSerii = L.masuraMoneda(intrari({ fundIst: null, oiSerie: null, mari: null, mici: null, taker: null }), P);
  assert.equal(faraSerii.dir, "SUS"); assert.equal(faraSerii.fundPctl, null); assert.equal(faraSerii.lMari, null, "seria lipsă nu omoară rândul");
});
await test("latimea: numără pe praguri; rândurile null = lipsă; neclarele nu sunt nici sus, nici jos", () => {
  const rand = (o) => Object.assign({ sym: "X", dir: "SUS", adrUsed: 10, volPctl: 10, oiPctl: 10, fundPctl: 50, lMari: 40 }, o);
  const Lx = L.latimea([rand(), rand({ dir: "JOS", lMari: 70 }), rand({ dir: "neclara", adrUsed: 95, volPctl: 95, oiPctl: 99, fundPctl: 80 }), null, rand({ fundPctl: 10 })], P);
  assert.deepEqual(JSON.parse(JSON.stringify(Lx)), { n: 5, sus: 2, jos: 1, neclar: 1, lipsa: 1, bugetEpuizat: 1, volExtrem: 1, oiExtrem: 1, fundExtrem: 2, mariLong: 1 });   /* obiectul vine din vm: altă lume de prototipuri */
});
await test("regimPietei: LARG-SUS la ≥ 65 % sus, LARG-JOS la ≥ 65 % jos, altfel AMESTECAT; fără n ⇒ NECUNOSCUT", () => {
  assert.equal(L.regimPietei({ n: 150, sus: 136, jos: 9 }).cod, "LARG-SUS");
  assert.equal(L.regimPietei({ n: 100, sus: 20, jos: 65 }).cod, "LARG-JOS");
  assert.equal(L.regimPietei({ n: 100, sus: 50, jos: 40 }).cod, "AMESTECAT");
  assert.equal(L.regimPietei({ n: 0, sus: 0, jos: 0 }).cod, "NECUNOSCUT");
  assert.equal(Math.round(L.regimPietei({ n: 150, sus: 136, jos: 9 }).pctSus * 10) / 10, 90.7);
});
await test("regimDeCand: de când ține codul de acum, din istoric", () => {
  const ist = [{ la: ACUM - 5 * ZI, cod: "AMESTECAT" }, { la: ACUM - 3 * ZI, cod: "LARG-SUS" }, { la: ACUM - ZI, cod: "LARG-SUS" }, { la: ACUM - 900000, cod: "LARG-SUS" }];
  assert.equal(L.regimDeCand(ist, ACUM).text, "de 3 zile");
  assert.equal(L.regimDeCand([{ la: ACUM - 7 * 3600000, cod: "LARG-SUS" }], ACUM).text, "de 7 ore");
  assert.equal(L.regimDeCand([{ la: ACUM - 600000, cod: "LARG-SUS" }], ACUM).text, "de sub o oră");
  assert.equal(L.regimDeCand([], ACUM).text, "");
});
const latimeKv = (o) => Object.assign({ acum: { la: ACUM - 7 * 60000, n: 150, lipsa: 0, incomplet: false, regim: { cod: "LARG-SUS", pctSus: 90.7, pctJos: 6 }, lat: { n: 150, sus: 136, jos: 9, neclar: 5, lipsa: 0, bugetEpuizat: 16, volExtrem: 31, oiExtrem: 16, fundExtrem: 59, mariLong: 145 } }, istoric: [{ la: ACUM - 3 * ZI, cod: "LARG-SUS" }, { la: ACUM - 7 * 60000, cod: "LARG-SUS" }] }, o || {});
await test("textCitire: textul rândului, vechimea; info implicit", () => {
  const r = L.textCitire(latimeKv(), { directie: "neutru" }, ACUM);
  assert.equal(r.ce, "Lățimea pieței (150 perp-uri)"); assert.equal(r.stare, "info"); assert.equal(r.link, "sugestii"); assert.equal(r.vechi, false);
  assert.equal(r.text, "larg SUS de 3 zile · 136 sus · 9 jos · conturile mari long pe 145 din 150 · funding extrem 59 · OI extrem 16 · acum 7 min");
});
await test("textCitire: atenție la LARG contra botului, la buget epuizat ≥ 60 %, la volatilitate extremă ≥ 40 %; neutru rămâne info", () => {
  assert.equal(L.textCitire(latimeKv(), { directie: "short" }, ACUM).stare, "atentie");
  assert.match(L.textCitire(latimeKv(), { directie: "short" }, ACUM).text, /riscul e corelat, nu diversificat/);
  assert.equal(L.textCitire(latimeKv(), { directie: "long" }, ACUM).stare, "info");
  assert.equal(L.textCitire(latimeKv({ acum: Object.assign(latimeKv().acum, { lat: Object.assign({}, latimeKv().acum.lat, { bugetEpuizat: 95 }) }) }), { directie: "long" }, ACUM).stare, "atentie");
  assert.equal(L.textCitire(latimeKv({ acum: Object.assign(latimeKv().acum, { lat: Object.assign({}, latimeKv().acum.lat, { volExtrem: 70 }) }) }), { directie: "neutru" }, ACUM).stare, "atentie");
  assert.equal(L.esteBotContra("long", "LARG-JOS"), true); assert.equal(L.esteBotContra("short", "LARG-SUS"), true); assert.equal(L.esteBotContra("neutru", "LARG-SUS"), false); assert.equal(L.esteBotContra("long", "AMESTECAT"), false);
});
await test("textCitire: incomplet ⇒ „pe N din 150”; veche > 45 min ⇒ „veche, de la HH:MM” + vechi; lipsă ⇒ aștept", () => {
  const inc = latimeKv({ acum: Object.assign(latimeKv().acum, { lipsa: 19, incomplet: true, n: 150 }) });
  assert.match(L.textCitire(inc, null, ACUM).text, /pe 131 din 150/);
  const veche = L.textCitire(latimeKv({ acum: Object.assign(latimeKv().acum, { la: ACUM - 50 * 60000 }) }), null, ACUM);
  assert.equal(veche.vechi, true); assert.match(veche.text, /veche, de la \d\d:\d\d/);
  const lipsa = L.textCitire(null, null, ACUM); assert.equal(lipsa.stare, "info"); assert.equal(lipsa.text, "aștept lățimea pieței (vine o dată la 15 minute)"); assert.equal(lipsa.link, null);
});
await test("filtreaza: toate / boți / contra mulțimii (|diverg| ≥ 15) / extreme / sus / jos; boții primii", () => {
  const m = [{ sym: "AAAUSDT", dir: "SUS", diverg: 2, volPctl: 10, oiPctl: 10, fundPctl: 50 }, { sym: "BBBUSDT", dir: "JOS", diverg: 20, volPctl: 10, oiPctl: 10, fundPctl: 50 }, { sym: "CCCUSDT", dir: "SUS", diverg: -16, volPctl: 95, oiPctl: 10, fundPctl: 50 }, { sym: "DDDUSDT", dir: "neclara", diverg: 0, volPctl: 10, oiPctl: 10, fundPctl: 20 }];
  assert.deepEqual(L.filtreaza(m, "toate", ["CCC"]).map((x) => x.sym), ["CCCUSDT", "AAAUSDT", "BBBUSDT", "DDDUSDT"]);
  assert.deepEqual(L.filtreaza(m, "boti", ["CCC"]).map((x) => x.sym), ["CCCUSDT"]);
  assert.deepEqual(L.filtreaza(m, "contra", []).map((x) => x.sym), ["BBBUSDT", "CCCUSDT"]);
  assert.deepEqual(L.filtreaza(m, "extreme", []).map((x) => x.sym), ["CCCUSDT", "DDDUSDT"]);
  assert.deepEqual(L.filtreaza(m, "sus", []).map((x) => x.sym), ["AAAUSDT", "CCCUSDT"]); assert.deepEqual(L.filtreaza(m, "jos", []).map((x) => x.sym), ["BBBUSDT"]);
});
await test("textele: diacritice, fără „predicție”", () => {
  const src = citeste("public", "lib", "latime.js");
  assert.doesNotMatch(src, /predic[țt]ie/i); assert.match(src, /lățimea/i);
});

console.log(`\n${teste - picate}/${teste} verzi\n`); if (picate) process.exit(1);
