// Proba v100.272-b (auditul 29.10, felia 1 - Tabloul botului): constatările rămase + ultimele locuri cu „mișcare” pe definiția veche.
//  1. Funding-ul din 2 surse pe același ecran: KPI-ul pe ratele PIONEX (7 zile), sfatul pe rata BINANCE - semne diferite pe același bot.
//     Botul plătește rata Pionex ⇒ sfatul (și rândul „Funding” al graficului) pe Pionex, cu aceeași cifră; Binance doar fără Pionex, spus ca reper.
//  2. Prețul viu stătea lângă distanța la lichidare din citirea botului (8–60 s în urmă): distanța se socotește din prețul arătat.
//  3. Botul neutru: totalul cuprinde poziția deschisă cu „semn nesigur” fără să se spună lângă cifră.
//  4. Încrederea semnalelor: pe intrări (nu pe ZILE) și față de 50% (nu de rata de bază) ⇒ „merită ascultat” fals la cel puțin un sfat
//     în 36–90% din rulările fără efect (scratch: simularea de mărime). Acum: pe zile, față de rata de bază, cu corecția BH.
//  5. „Mișcare mare” are o definiție (GridCalcul.miscareMare, cifra pe 24 h): Acasă, cartela „Mișcarea”, BTC, clasamentul și Scan-ul o urmează.
//  6. Basis-ul amestecă bursele (perp Pionex, spot Binance) - se spune pe ecran; comisionul pe zi cuprindea taxa de intrare - separat.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js");
const lib = (f) => citeste("public", "lib", f);
/* de la „function nume(” la început de rând până la următorul „\nfunction ” (un comentariu cu același text nu păcălește) */
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i + 1, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.272-b · AUDITUL 29.10, FELIA 1 · funding, lichidarea vie, neutrul, încrederea pe zile, mișcarea, basis/comision\n");

// bibliotecile paginii, în ordinea din index.html
for (const f of ["grid-calcul.js", "pret-viu.js", "grid-clasament.js", "tablou-extra.js", "semnale-bot.js", "sfaturi.js", "scan.js"]) vm.runInThisContext(lib(f), { filename: f });
const { GridCalcul: G, PretViu: PV, GridClasament: GC, TabloExtra: TE, SemnaleBot: SB, Sfaturi: SF, Scan: SC, TextRo } = globalThis;

class El {
  constructor() { this.textContent = ""; this.className = ""; this.innerHTML = ""; this.hidden = false; this.title = ""; this.style = {}; this.parti = {}; this.classList = { contains: (c) => String(this.className).split(/\s+/).includes(c), add: () => {} }; }
  querySelector(s) { const m = /data-k="([a-z]+)"/.exec(s); return m ? (this.parti[m[1]] || null) : null; }
}
const pagina = () => { const els = {}; return { els, $: (id) => (els[id] ??= new El()) }; };
const ruleaza = (nume, box) => { vm.createContext(box); vm.runInContext(nume.map(fnApp).join("\n"), box, { filename: "app-extras.js" }); return box; };
const botiNr = (v) => (v == null || v === "" || typeof v === "boolean" ? null : Number.isFinite(+v) ? +v : null);
const TabloBot = { simboluri: (baza, quote, sp) => ({ pionex: sp || `${baza}_${quote}_PERP`, binance: `${baza}${quote}` }) };
const ZI = 864e5, ORA = 36e5, T0 = Date.UTC(2026, 9, 1);

// ───────────── 1. Funding-ul: o singură sursă, cea pe care o plătește botul (Pionex) ─────────────
const BOT_F = { id: "f1", baza: "SOL", quote: "USDT", directie: "long", pozitie: 2, pretCurent: 150, investit: 100, levier: 3, finantare: -0.4 };
const PIONEX = { rataZi: 0.0006, rata: 0.0002, intervalOre: 8, zile: 7, n: 21, veche: false, ultimaLa: T0 };   /* GridSim.rataFunding: long-ul plătește */
await test("1a același bot ⇒ aceeași cifră și același semn în KPI și în sfat (Pionex), chiar când Binance zice invers", () => {
  assert.equal(typeof TE.fundingPct, "function", "lipsește TabloExtra.fundingPct (formatul comun al cifrei)");
  const kpi = TE.fundingBot(BOT_F, PIONEX).text, cifra = TE.fundingPct(PIONEX.rataZi);
  const s = SF.sfaturi({ bot: BOT_F, funding: -0.0002, fundingOre: 8, fundingPionex: PIONEX }).find((x) => x.cod === "funding");
  assert.ok(s, "lipsește sfatul de funding");
  assert.ok(kpi.includes(cifra) && s.titlu.includes(cifra), "cifra diferă: KPI „" + kpi + "” · sfat „" + s.titlu + "”");
  assert.match(kpi, /plătești/); assert.match(s.titlu, /îl plătești/, s.titlu);
  assert.doesNotMatch(s.titlu + s.text, /−0,020|încasezi/, "rata Binance (de semn opus) nu intră în sfat: " + s.titlu + " · " + s.text);
  assert.match(s.sursa, /Pionex/); assert.match(s.titlu + s.text, /media 7 zile/);
  assert.match(s.text, /0,02(0)?% la 8 ore/, "ultima rată Pionex la intervalul ei rămâne spusă: " + s.text);
  // semnul pe dos: shortul încasează, la fel în amândouă
  const sh = Object.assign({}, BOT_F, { directie: "short", pozitie: -2 });
  assert.match(TE.fundingBot(sh, PIONEX).text, /încasezi/);
  assert.match(SF.sfaturi({ bot: sh, funding: -0.0009, fundingPionex: PIONEX }).find((x) => x.cod === "funding").titlu, /îl încasezi/);
});
await test("1b fără ratele Pionex, sfatul folosește Binance și spune că e doar reper (KPI-ul n-are atunci funding de contrazis)", () => {
  assert.equal(TE.fundingBot(BOT_F, null), null);
  const s = SF.sfaturi({ bot: BOT_F, funding: 0.0005, fundingOre: 8 }).find((x) => x.cod === "funding");
  assert.ok(s); assert.match(s.sursa, /Binance/); assert.match(s.sursa, /reper/); assert.match(s.sursa, /n-am aici ratele Pionex, iar botul plătește rata Pionex/);
});
await test("1c Sfaturi.intrare duce ratele Pionex mai departe (și forma colectorului: rate, rataZi, intervalOre)", () => {
  assert.equal(SF.intrare({ bot: BOT_F, fundingPionex: PIONEX }).fundingPionex.rataZi, 0.0006);
  const col = SF.intrare({ bot: BOT_F, fundingPionex: { rate: 0.0002, rataZi: 0.0006, intervalOre: 8, hist: [] } }).fundingPionex;
  assert.equal(col.rataZi, 0.0006); assert.equal(col.rata, 0.0002); assert.equal(col.intervalOre, 8);
  assert.equal(SF.intrare({ bot: BOT_F }).fundingPionex, null);
});
function sfaturiTablou(tbStare) {
  let intrare = null; const { $ } = pagina();
  ruleaza(["tbCheieDir", "renderTabloSfaturi"], {
    $, tbStare, TabloBot, Directie: { rezumat: () => null }, Scenariu: {}, escapeHtml: String, tbTextFaraBot: () => "fără bot", tbFisa: { botId: null }, tbRenderTodo: () => {},
    Sfaturi: { intrare: (x) => { intrare = x; return x; }, sfaturi: () => [] },
  }).renderTabloSfaturi();
  return intrare;
}
await test("1d Tabloul dă sfatului ratele Pionex ale monedei botului de acum (nu ale celei vechi)", () => {
  const st = (sim) => ({ bot: BOT_F, routeOk: true, directie: null, extra: { bot: "f1", funding: -0.0002 }, funding: { sim, la: Date.now(), info: PIONEX } });
  assert.equal(sfaturiTablou(st("SOL_USDT_PERP")).fundingPionex, PIONEX);
  assert.equal(sfaturiTablou(st("ETH_USDT_PERP")).fundingPionex ?? null, null, "ratele altei monede nu intră");
});
await test("1e rândul „Funding” al graficului (tbFundingPt): rata Pionex și plata următoare după ritmul Pionex; Binance doar fără ea, spus", () => {
  const acum = Date.now(), ult = acum - 3 * ORA;
  const box = (funding, extra) => ruleaza(["tbFundingPt"], { tbStare: { bot: BOT_F, funding, extra }, TabloBot, Date, isFinite, Number, Array });
  const r = box({ sim: "SOL_USDT_PERP", la: acum, info: Object.assign({}, PIONEX, { ultimaLa: ult }) }, { bot: "f1", funding: -0.0009, fundingHist: [] }).tbFundingPt();
  assert.ok(r, "fără rândul de funding"); assert.equal(r.rata, 0.0002); assert.match(r.sursa, /Pionex/);
  assert.equal(r.urmatoarea, ult + 8 * ORA);
  const b = box(null, { bot: "f1", funding: 0.0001, fundingHist: [{ fundingTime: acum - 9 * ORA }, { fundingTime: acum - ORA }] }).tbFundingPt();
  assert.equal(b.rata, 0.0001); assert.match(b.sursa, /Binance/);
});

// ───────────── 2. Distanța la lichidare socotită din prețul arătat lângă ea ─────────────
const BOT_L = { id: "l1", baza: "SOL", quote: "USDT", directie: "long", levier: 5, pretCurent: 100, lichidareJos: 90, lichidareSus: null, pretLichidare: 90, lichidarePartea: "jos", distantaLichidarePct: 10, lichidareDepasita: false, profitTotal: 1.2, investit: 100 };
await test("2a PretViu.botLaPret: distanța, partea și „depășită” din prețul viu, cu aceeași regulă ca serverul (cea mai apropiată parte)", () => {
  const v = PV.botLaPret(BOT_L, 95);
  assert.equal(v.pretCurent, 95); assert.equal(v.distantaLichidarePct, 5.26); assert.equal(v.lichidarePartea, "jos"); assert.equal(v.pretLichidare, 90); assert.equal(v.lichidareDepasita, false);
  const d = PV.botLaPret(BOT_L, 89); assert.equal(d.distantaLichidarePct, -1.12); assert.equal(d.lichidareDepasita, true);
  const doua = PV.botLaPret(Object.assign({}, BOT_L, { lichidareSus: 120 }), 115); assert.equal(doua.lichidarePartea, "sus"); assert.equal(doua.pretLichidare, 120); assert.equal(doua.distantaLichidarePct, 4.35);
  const fara = PV.botLaPret(Object.assign({}, BOT_L, { motivFaraDistanta: "fara-pret", distantaLichidarePct: null }), 95);
  assert.equal(fara.distantaLichidarePct, 5.26); assert.equal(fara.motivFaraDistanta, undefined, "cu prețul viu distanța se poate socoti");
  assert.equal(PV.botLaPret(BOT_L, null), BOT_L, "fără preț viu rămâne citirea botului");
  assert.equal(BOT_L.distantaLichidarePct, 10, "botul citit nu se atinge");
});
await test("2b banda de sus: lângă prețul viu, distanța la lichidare din prețul viu (nu din citirea de acum 8–60 s)", () => {
  const acum = Date.now();
  const r = PV.banda({ bot: BOT_L, pretViu: { pret: 95, text: "95", primitLa: acum - 2000, dir: "jos" }, botLa: acum - 30000, acum });
  assert.equal(r.parti.find((p) => p.k === "pret").t.startsWith("95"), true);
  assert.equal(r.parti.find((p) => p.k === "lich").t, "lichidare 5,3%");
  assert.equal(r.clasa, "bad", "5,3% e sub pragul de 15%");
  const vechi = PV.banda({ bot: BOT_L, pretViu: { pret: 95, text: "95", primitLa: acum - 120000 }, botLa: acum - 30000, acum });
  assert.equal(vechi.parti.find((p) => p.k === "lich").t, "lichidare 10,0%", "prețul viu mort ⇒ prețul și distanța din citire");
});
await test("2c KPI „Lichidare” din Tablou pe prețul viu (tbKpiLichDeseneaza, chemat și la fiecare tranzacție prin tbKpiPretDeseneaza)", () => {
  const { els, $ } = pagina();
  const box = ruleaza(["tbKpiLichDeseneaza", "tbKpiPretDeseneaza"], { $, TextRo, botiNr, tbPretScurt: String, TabloExtra: { distanteGrid: () => null }, pvBotLive: (b) => PV.botLaPret(b, 95) });
  box.tbKpiPretDeseneaza(BOT_L);
  assert.equal(els.tbKpiLich.textContent, "5,3%"); assert.match(els.tbKpiLich.className, /bad/); assert.equal(els.tbKpiLichSub.textContent, "prețul trebuie să scadă până la 90");
  assert.doesNotMatch(fnApp("tbDeseneazaKpi"), /b\.distantaLichidarePct/, "tbDeseneazaKpi nu mai scrie distanța din citire");
});
await test("2d pvArata rescrie și „lichidare …” din bandă la fiecare tranzacție, ca „azi” și distanțele gridului", () => {
  const { els, $ } = pagina(); const banda = $("botStrip"); banda.parti.lich = new El(); banda.parti.lich.textContent = "lichidare 10,0%";
  const acum = Date.now();
  ruleaza(["pvArata"], { $, tbStare: { bot: BOT_L, routeOk: true, botLa: acum - 30000 }, PretViu: PV, pvPretPentru: () => ({ pret: 95, text: "95", primitLa: Date.now(), dir: "jos" }), pvZiPentru: () => null,
    bsPretText: (pa) => String(pa.text), bsTonEfect: (t) => t, TabloExtra: { distanteGrid: () => null }, pvBotLive: (b) => PV.botLaPret(b, 95), tbPanouVizibil: () => false }).pvArata();
  assert.equal(banda.parti.lich.textContent, "lichidare 5,3%");
});

// ───────────── 3. Botul neutru: „semn nesigur” lângă total ─────────────
const NEUTRU = { id: "n1", baza: "SOL", quote: "USDT", directie: "neutral", pnlNerealizatSigur: false, pnlNerealizat: -2.1, profitTotal: -1.5, investit: 100, profitNet: 0.6 };
const LONG = Object.assign({}, NEUTRU, { directie: "long", pnlNerealizatSigur: true });
await test("3a TabloExtra.notaTotal: „semn nesigur la botul neutru” doar la neutru (pnlNerealizatSigur false), cu totalul citit", () => {
  assert.equal(typeof TE.notaTotal, "function", "lipsește TabloExtra.notaTotal");
  assert.equal(TE.notaTotal(NEUTRU), "semn nesigur la botul neutru");
  assert.equal(TE.notaTotal(LONG), null); assert.equal(TE.notaTotal(Object.assign({}, NEUTRU, { profitTotal: null })), null);
});
function kpi(bot) {
  const { els, $ } = pagina();
  ruleaza(["tbFormateazaSemn", "tbTon", "tbCheieDir", "tbDeseneazaKpi"], { $, tbStare: { bot, routeOk: true, directie: null }, TabloBot, TextRo, TabloExtra: TE, GridCalcul: G, tbTextFaraBot: () => "fără bot", botiNr, botiClasa: () => "", tbKpiPretDeseneaza: () => {}, tbPretScurt: String }).tbDeseneazaKpi();
  return els;
}
await test("3b KPI „Total” la neutru: cifra rămâne, dedesubt scrie „semn nesigur la botul neutru”; la long nu", () => {
  const n = kpi(NEUTRU); assert.equal(n.tbKpiTotal.textContent, "−1,5"); assert.match(n.tbKpiTotalSub.textContent, /semn nesigur la botul neutru/);
  assert.doesNotMatch(kpi(LONG).tbKpiTotalSub.textContent, /semn nesigur/);
});
await test("3c „Banii” din Tablou: rândul „Total” al neutrului poartă nota (ca „Poziția deschisă”)", () => {
  const { els, $ } = pagina(), nimic = () => {};
  const box = { $, tbStare: {}, TabloExtra: TE, GridCalcul: G, TextRo, botiNr, botiBan: (v) => (v == null ? "—" : TextRo.num(v, 1)), botiClasa: () => "", escapeHtml: String, tbRandUmpleri: () => "", tbRenderTodo: nimic };
  for (const k of ["tbAduUmpleri", "tbDeseneazaExtra", "tbAduFisaBot", "tbDeseneazaSaptPlan", "tbAduSaptamana", "tbDeseneazaSemafor", "tbAduSemnale", "tbDeseneazaPortofoliu"]) box[k] = nimic;
  ruleaza(["tbDeseneazaBanii"], box).tbDeseneazaBanii(NEUTRU);
  const total = els.tbBani.innerHTML.split("tbLinieTotal")[1] || "";
  assert.match(total.slice(0, 200), /semn nesigur la botul neutru/, total.slice(0, 200));
  const p2 = pagina(); ruleaza(["tbDeseneazaBanii"], Object.assign({}, box, { $: p2.$ })).tbDeseneazaBanii(LONG);
  assert.doesNotMatch((p2.els.tbBani.innerHTML.split("tbLinieTotal")[1] || "").slice(0, 200), /nesigur/, "la long nu");
});
await test("3d banda de sus: totalul neutrului spune „semn nesigur” lângă cifră (și în titlu)", () => {
  const p = PV.banda({ bot: NEUTRU, acum: Date.now() }).parti.find((x) => x.k === "total");
  assert.match(p.t, /^total −1,5 USDT/); assert.match(p.t + " " + (p.title || ""), /semn nesigur/);
  assert.doesNotMatch(PV.banda({ bot: LONG, acum: Date.now() }).parti.find((x) => x.k === "total").t, /nesigur/);
});

// ───────────── 4. Încrederea semnalelor: pe ZILE, față de rata de bază, cu BH ─────────────
const intr = (cod, nivel, zi, dreptate, extra) => Object.assign({ t: T0 + zi * ZI + 3 * ORA, cod, nivel, total: 0, totalDupa: dreptate === (nivel === "tine") ? 1 : -1, dreptate }, extra || {});
await test("4a unitatea e ZIUA: 40 de intrări corecte în 3 zile nu fac „merită ascultat” (încă nu știm)", () => {
  /* la minute diferite, în aceeași zi (40 de semnale de la boți diferiți) - o unitate mai mică decât ziua le-ar număra pe toate */
  const log = []; for (let i = 0; i < 40; i++) log.push(intr("muta", "atentie", i % 3, true, { t: T0 + (i % 3) * ZI + 3 * ORA + i * 60000 }));
  for (let z = 0; z < 3; z++) log.push(intr("btc", "atentie", z, false));
  const s = SB.socotealaToti([log]);
  assert.equal(s.muta.zile, 3); assert.equal(s.muta.stare, "necunoscut", "40 din 40, dar în 3 zile: " + s.muta.stare);
  assert.match(SB.textIncredere(s.muta), /încă nu știm \(40 de judecate\)/); assert.match(SB.textIncredere(s.muta), /pe 3 zile; judec de la 10 zile/);
});
await test("4b reperul e RATA DE BAZĂ: „Ține-l” corect în 2/3 din cazuri, când totalul nu scade oricum în 2/3 din zile, nu „merită ascultat”", () => {
  const log = [];
  for (let z = 0; z < 30; z++) { [true, true, false].forEach((d) => log.push(intr("tine", "tine", z, d))); [true, false, false].forEach((d) => log.push(intr("btc", "atentie", z, d))); }
  const s = SB.socotealaToti([log]);
  assert.equal(s.tine.judecate, 90); assert.equal(s.tine.zile, 30);
  assert.ok(Math.abs(s.tine.reper - 2 / 3) < 1e-9, "reperul „Ține-l” = cât de des NU scade totalul după celelalte semnale: " + s.tine.reper);
  assert.ok(Math.abs(s.btc.reper - 1 / 3) < 1e-9, "reperul „BTC” = cât de des scade: " + s.btc.reper);
  assert.notEqual(s.tine.stare, "ajuta", "66,7% față de 66,7% de obicei nu e avantaj");
  assert.match(SB.textIncredere(s.tine), /de obicei/);
});
await test("4c un semnal cu adevărat bun pe destule zile iese „ajuta” (testul nu e mut)", () => {
  const log = [];
  for (let z = 0; z < 20; z++) { log.push(intr("muta", "atentie", z, z !== 7)); [true, true, false].forEach((d) => log.push(intr("tine", "tine", z, d))); }
  const s = SB.socotealaToti([log]);
  assert.equal(s.muta.stare, "ajuta", JSON.stringify({ rz: s.muta.rataZile, reper: s.muta.reper, p: s.muta.p }));
  assert.equal(s.muta.zile, 20); assert.ok(s.muta.p < 0.01);
});
await test("4d mărimea sub H0 (fără efect, zile cu piața comună, 8 sfaturi): „merită ascultat” fals la vreun sfat în ≤ ~5% din rulări", () => {
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(272), CODURI = [["tine", "tine"], ["cu-botul", "tine"], ["muta", "atentie"], ["btc", "atentie"], ["trend", "atentie"], ["miscare", "atentie"], ["lichidare", "iesi"], ["costuri", "atentie"]];
  const R = 400; let fals = 0;
  for (let it = 0; it < R; it++) {
    const log = [];
    for (let z = 0; z < 30; z++) {
      const pz = 0.2 + 0.5 * rnd();   /* ziua pieței: cât de des scad toți boții azi */
      for (const [cod, nivel] of CODURI) { if (rnd() < 0.5) continue; const m = 1 + Math.floor(rnd() * 3); for (let j = 0; j < m; j++) { const scade = rnd() < pz; log.push(intr(cod, nivel, z, nivel === "tine" ? !scade : scade)); } }
    }
    const s = SB.socotealaToti([log]);
    if (Object.values(s).some((x) => x.stare === "ajuta")) fals++;
  }
  console.log("       (fals „merită ascultat” la vreun sfat: " + (100 * fals / R).toFixed(1) + "% din " + R + " de rulări)");
  assert.ok(fals / R <= 0.07, "fals „merită ascultat” în " + (100 * fals / R).toFixed(1) + "% din rulări");
});
await test("4f varianța e cea dintre ZILE: 5 boți care spun același lucru în aceeași zi nu fac de 5 ori mai sigur (8 din 12 zile, față de 50%)", () => {
  const log = [];
  for (let z = 0; z < 12; z++) {
    for (let j = 0; j < 5; j++) log.push(intr("trend", "atentie", z, z < 8, { t: T0 + z * ZI + 3 * ORA + j * 60000 }));   /* toată ziua dreaptă sau toată greșită */
    log.push(intr("btc", "atentie", z, true)); log.push(intr("btc", "atentie", z, false));                                  /* reperul zilei: 50% */
  }
  const s = SB.socotealaToti([log]);
  assert.ok(Math.abs(s.trend.reper - 0.5) < 1e-9); assert.ok(Math.abs(s.trend.rataZile - 8 / 12) < 1e-9);
  assert.notEqual(s.trend.stare, "ajuta", "66,7% pe 12 zile față de 50% nu se vede (p = " + s.trend.p + ")");
  assert.ok(s.trend.p > 0.05, "p = " + s.trend.p);
});
await test("4e textul: zilele și rata de bază, cu o zecimală; fără „dovedit”; forma veche (fără zile, din KV) se citește ca înainte", () => {
  const log = []; for (let z = 0; z < 12; z++) { log.push(intr("muta", "atentie", z, z % 3 !== 0)); log.push(intr("tine", "tine", z, z % 2 === 0)); }
  const s = SB.socotealaToti([log]), t = SB.textIncredere(s.muta);
  assert.match(t, /^a avut dreptate 8 din 12 \(67%\)/, t); assert.match(t, /pe 12 zile/); assert.match(t, /\d+,\d% de obicei/); assert.doesNotMatch(t, /dovedit/);
  const vechi = { nume: "„Ține-l”", corecte: 21, judecate: 39, bani: -132.1, baniN: 39, stare: "tace" };
  assert.match(SB.textIncredere(vechi), /^a avut dreptate 21 din 39 \(54%\), ~−132,1 USDT dacă-l urmai de fiecare dată · nu-l trimit pe Discord/);
  const tace = { nume: "„Ține-l”", corecte: 50, judecate: 90, bani: -40, baniN: 90, stare: "tace", zile: 25, rataZile: 0.55, reper: 0.6, p: 0.7 };
  assert.match(SB.textIncredere(tace), /nu-l trimit pe Discord: nu se vede peste rata de bază/); assert.doesNotMatch(SB.textIncredere(tace), /întâmplarea|dovedit/);
});

// ───────────── 5. „Mișcare mare”: cifra pe 24 h, definiția comună ─────────────
await test("5a Acasă (BTC și „Mediul lui”): cifra pe 24 h, nu maximul 4 h / 24 h", () => {
  const ec = lib("acasa-ecran.js");
  assert.doesNotMatch(ec, /Math\.max\(btc\.regim\.r4h \|\| 0, btc\.regim\.r24h \|\| 0\)/, "BTC: încă maximul cu 4 h");
  assert.doesNotMatch(ec, /Math\.max\(rg\.r4h \|\| 0, rg\.r24h \|\| 0\)/, "Mediul lui: încă maximul cu 4 h");
  /* cele două expresii, scoase din rândurile lor și rulate (fără să încarc tot ecranul Acasă) */
  for (const [v, et] of [["btc.regim", "Mișcarea"], ["rg", "Mediul lui"]]) {
    const rand = ec.split("\n").find((l) => l.includes("<span>" + et + "</span>")) || "";
    const ex = new RegExp("\\(" + v.replace(".", "\\.") + "\\.r24h != null \\? [^]*?\"× pe 4 h\"\\)").exec(rand);
    assert.ok(ex, et + ": lipsește cifra pe 24 h (cu 4 h doar fără ea): " + rand.slice(0, 260));
    const f = (r) => vm.runInNewContext(ex[0], v === "rg" ? { rg: r } : { btc: { regim: r } });
    assert.equal(f({ r4h: 2.8, r24h: 1.6 }), "1,6× pe 24 h", et); assert.equal(f({ r4h: 2.8, r24h: null }), "2,8× pe 4 h", et);
  }
});
const FISA = (rg) => ({ regim: Object.assign({ mare: { rata: "~1 zi din 10" } }, rg) });
await test("5b cartela „Mișcarea” (Acum, concret): cifra mare e cea pe 24 h; cea pe 4 h rămâne în rând", () => {
  const mi = SB.acumConcret({ bot: { directie: "long", pretCurent: 100, gridJos: 90, gridSus: 110 }, fisa: FISA({ r4h: 2.8, r24h: 1.6, miscare: true, sens: "coboara" }) }).find((c) => c.cod === "miscare");
  assert.equal(mi.mare, TextRo.ori(1.6)); assert.equal(mi.mic, "pe 24 h față de obișnuit");
  assert.ok(mi.act.includes(TextRo.ori(2.8) + " pe 4 h"), mi.act);
});
await test("5c BTC în mișcare: cifra pe 24 h (definiția), nu maximul cu 4 h - în avertizare și în motivul semaforului", () => {
  const b = SB.btcAvertizare({ miscare: true, r4h: 3.6, r24h: 1.2 }, { miscare: false });
  assert.equal(b.r, 1.2); assert.match(b.text, /1,2× obișnuitul lui pe 24 h/);
  const k = SB.semafor({ bot: { directie: "long" }, fisa: { regim: { miscare: false } }, btc: b }).componente.find((x) => x.cod === "btc");
  assert.equal(k.motiv, "BTC în mișcare (1,2× obișnuitul pe 24 h), moneda încă nu");
});
await test("5d clasamentul grid: monedele de evitat, după cifra pe 24 h (nu după maximul cu 4 h)", () => {
  const A = { simbol: "A", stare: "evita", regim: { r4h: 5, r24h: 1.2 } }, B = { simbol: "B", stare: "evita", regim: { r4h: 1, r24h: 2 } };
  assert.deepEqual(GC.ordoneaza([A, B]).map((x) => x.simbol), ["B", "A"]);
});
await test("5e Scan „⚡ Mișcare neobișnuită” = mișcarea mare comună (ziua peste 9 din 10 ale ei); rata ~1 zi din 10", () => {
  const r = SC.RETETE.find((x) => x.k === "miscare");
  assert.doesNotMatch(r.sub + r.e, /2×|două ori/); assert.match(r.sub, /9 zile din 10/);
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(5), bare = []; let c = 100;
  for (let i = 0; i < 400; i++) { const z = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()); c *= 1 + 0.03 * z * (rnd() < 0.1 ? 3 : 1); bare.push({ t: i * ZI, h: c * 1.01, l: c * 0.99, c }); }
  let aprins = 0, n = 0, potriv = 0;
  for (let d = 200; d < 400; d++) {
    const b = bare.slice(0, d + 1), z = SC.rezumat(b); z.fel = "c";
    assert.equal(typeof z.mare, "boolean", "rezumatul spune „mare” după definiția comună");
    const def = G.miscareMare(b.slice(-91), { k: 1 }).mare === true; if (def === z.mare) potriv++;   /* istoricul: cele 90 de zile ale „zilei obișnuite” din Scan */
    n++; if (SC.retete(z).includes("miscare")) aprins++;
    assert.equal(SC.retete(z).includes("miscare"), z.mare);
  }
  assert.equal(potriv, n, "aceeași zi, aceeași decizie ca GridCalcul.miscareMare");
  console.log("       (rețeta „miscare” aprinsă în " + (100 * aprins / n).toFixed(1) + "% din " + n + " zile)");
  assert.ok(aprins / n > 0.04 && aprins / n < 0.2, "rata " + (100 * aprins / n).toFixed(1) + "%");
  assert.equal(SC.retete({ mis: 2.5, ch: 4 }).includes("miscare"), true, "rezumatul vechi (fără „mare”, din KV) - regula veche până la tura nouă");
});

// ───────────── 6. Basis-ul cu sursa spusă; taxa de intrare separată de comisionul pe zi ─────────────
await test("6a basis-ul spune pe ecran că amestecă bursele: perp Pionex față de spot Binance", () => {
  const r = fnApp("renderTabloBot");
  assert.match(r, /\["basis perp Pionex vs spot Binance",m\.basis\]/);
  assert.match(r, /"spot Binance "\+tbStare\.pretSpot/);
  assert.match(fnApp("tbDeschideWs"), /"spot Binance "\+d\.p/);
});
const BOT_C = { directie: "long", investit: 100, levier: 5, gridJos: 90, gridSus: 110, pornitLa: T0, comisioane: -0.5, finantare: -0.1, brut: { buOrderData: { initPrice: "100", gridProfit24h: "0.6", trx24h: "12" } } };
await test("6b grileVsCosturi: taxa de intrare (poziția de la pornire × comisionul taker) stă separat; comisionul pe zi e fără ea", () => {
  const z = TE.grileVsCosturi(BOT_C, T0 + 2 * ZI);
  assert.ok(Math.abs(z.taxaIntrare - (-100 * 5 * 0.5 * G.C.COMISION)) < 1e-12, "taxa: " + z.taxaIntrare);
  assert.ok(Math.abs(z.comisionZi - (-0.5 + 0.125) / 2) < 1e-12, "comisionul pe zi: " + z.comisionZi);
  assert.ok(Math.abs(z.netZi - (0.6 + z.comisionZi + -0.05)) < 1e-12);
  const sh = TE.grileVsCosturi(Object.assign({}, BOT_C, { directie: "short", brut: { buOrderData: { initPrice: "95", gridProfit24h: "0.6" } } }), T0 + 2 * ZI);
  assert.ok(Math.abs(sh.taxaIntrare - (-100 * 5 * 0.25 * G.C.COMISION)) < 1e-12, "short: pozitia de la pornire = nivelurile de sub preț");
  assert.equal(TE.grileVsCosturi(Object.assign({}, BOT_C, { directie: "neutral" }), T0 + 2 * ZI).taxaIntrare, 0, "neutrul nu cumpără la pornire");
  const mic = TE.grileVsCosturi(Object.assign({}, BOT_C, { comisioane: -0.05 }), T0 + 2 * ZI);
  assert.equal(mic.taxaIntrare, -0.05); assert.equal(mic.comisionZi, 0, "taxa estimată nu trece de comisioanele plătite");
  const fara = TE.grileVsCosturi(Object.assign({}, BOT_C, { brut: { buOrderData: { gridProfit24h: "0.6" } } }), T0 + 2 * ZI);
  assert.equal(fara.taxaIntrare, null); assert.ok(Math.abs(fara.comisionZi - (-0.25)) < 1e-12, "fără prețul de pornire: ca înainte");
});
await test("6c eticheta: sfatul „Costurile” și rândul din Tablou spun că taxa de intrare e separată (o dată, estimată)", () => {
  const co = TE.grileVsCosturi(Object.assign({}, BOT_C, { brut: { buOrderData: { initPrice: "100", gridProfit24h: "0.01", trx24h: "1" } } }), T0 + 2 * ZI);
  const s = SF.sfaturi({ bot: BOT_C, costuri: co }).find((x) => x.cod === "costuri");
  assert.ok(s, "lipsește sfatul de costuri"); assert.match(s.text, /comisioanele iau 0,19 pe zi \(fără taxa de intrare, ≈ 0,13 o dată\)/, s.text);
  const ex = fnApp("tbDeseneazaExtra");
  assert.match(ex, /linie\("Taxa de intrare \(o dată\)"/); assert.match(ex, /"medie de la pornire, fără taxa de intrare"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
