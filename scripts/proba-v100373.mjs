// Proba v100.373 (20.11.2026, el: „putem să optimizăm pagina botului, la verdicte etc. și idei?” ⇒ auditul Tabloului ⇒ hotărârile lui):
// capul paginii = marginea contra botului (cu dovada de pe boții lui), orizonturi de 1 h / 4 h / 24 h, rândul de cost; plus defectele
// găsite la audit: verdictul de sus ales după bani „nesiguri”, registrul sfaturilor fără rata de bază, cipurile „–”, ritmul perechilor,
// gridul propus când fișa oprește, comisionul perechilor scăzut de două ori.
//   node scripts/proba-v100373.mjs
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
console.log("\nv100.373 · Tabloul botului: marginea în cap, orizonturile lui, costul, registrul cinstit · proba\n");
function module_(...f) {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, setTimeout, clearTimeout, TextRo: globalThis.TextRo });
  c.globalThis = c; c.window = c;
  for (const x of f) vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", x), "utf8"), c, { filename: x });
  return c;
}
const curat = (x) => JSON.parse(JSON.stringify(x));
const ORA = 3600000, T0 = Date.UTC(2026, 0, 1);
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mers(ore, sigma, seed) {
  const r = rng(seed), v = []; let c = 100;
  for (let i = 0; i < ore; i++) { const o = c; c = o * Math.exp(sigma * (r() + r() + r() - 1.5) * 2); v.push({ t: T0 + i * ORA, o, h: Math.max(o, c) * (1 + 0.002 * r()), l: Math.min(o, c) * (1 - 0.002 * r()), c }); }
  return v;
}
/* un bot închis, în forma rutei botiInchisi */
const bot = (o) => ({ strategyId: String(o.id || 1), buOrderType: "futures_grid", base: "X.PERP", createTime: o.creat || T0, closeTime: (o.creat || T0) + (o.min || 30) * 60000,
  buOrderData: { totalRealizedProfit: o.real ?? 0, gridProfit: o.grid ?? 0, totalFee: o.fee ?? 0, totalFundingFee: o.fund ?? 0, usdtInvestment: o.inv ?? 100, quoteInvestment: o.inv ?? 100, leverage: 3,
    trend: o.dir || "long", bottom: o.jos ?? 90, top: o.sus ?? 110, row: o.row ?? 21, gridType: o.tip || "geometric", closedPrice: o.pi ?? 100 } });

// ---------- A. șansa marginii pe orizonturile lui ----------
await test("A1 șansele: marginea de jos și de sus au și 1 h și 4 h (nu doar 24 h și 3 zile), crescătoare cu orizontul", () => {
  const c = module_("grid-calcul.js", "probabilitati.js"), b = mers(120 * 24, 0.006, 5), u = b[b.length - 1];
  const r = curat(c.Probabilitati.pentruBot(b, { acum: u.t + ORA, pret: u.c, dir: "long", jos: u.c * 0.985, sus: u.c * 1.02, lichidare: u.c * 0.7 }));
  for (const k of ["jos1", "jos4", "sus1", "sus4", "jos24", "sus24", "jos72", "sus72"]) assert.ok(r.iese[k] && typeof r.iese[k].p === "number", "lipsește iese." + k);
  assert.equal(r.iese.jos1.orizontOre, 1); assert.equal(r.iese.jos4.orizontOre, 4);
  assert.ok(r.iese.jos1.p <= r.iese.jos4.p + 0.05 && r.iese.jos4.p <= r.iese.jos24.p + 0.05, "1 h " + r.iese.jos1.p + " · 4 h " + r.iese.jos4.p + " · 24 h " + r.iese.jos24.p);
  assert.ok(r.iese.jos1.nIndep > r.iese.jos24.nIndep, "la 1 h sunt mai multe ferestre independente decât la 24 h");
});
await test("A2 jurnalul de calibrare: tipurile de 4 h intră; cele de 1 h nu (judecata pe bare de o oră ar ieși decalată cu cât e orizontul)", () => {
  const c = module_("grid-calcul.js", "probabilitati.js"), b = mers(120 * 24, 0.006, 5), u = b[b.length - 1];
  const r = c.Probabilitati.pentruBot(b, { acum: u.t + ORA, pret: u.c, dir: "long", jos: u.c * 0.985, sus: u.c * 1.02, lichidare: u.c * 0.7 });
  const l = curat(c.Probabilitati.intrari(r, { t: u.t + ORA, bot: "7", simbol: "X_USDT_PERP" })), tip = (t) => l.find((e) => e.tip === t);
  for (const t of ["iese-jos-4", "iese-sus-4"]) assert.ok(tip(t), "lipsește intrarea " + t);
  for (const t of ["iese-jos-1", "iese-sus-1"]) assert.equal(tip(t), undefined, t + " nu se notează");
  assert.equal(tip("iese-jos-4").H, 4); assert.equal(tip("iese-jos-4").ev.fel, "atinge"); assert.equal(tip("iese-sus-4").ev.sus, true);
  const t0 = Math.ceil((u.t + ORA) / ORA) * ORA, bara = (k, l, h) => ({ t: t0 + k * ORA, o: u.c, h: h || u.c, l: l || u.c, c: u.c });
  assert.equal(c.Probabilitati.judeca(tip("iese-jos-4"), [bara(0)]), null, "orizontul de 4 h n-are încă barele lui");
  assert.equal(c.Probabilitati.judeca(tip("iese-jos-4"), [bara(0), bara(1), bara(2, u.c * 0.97), bara(3)]), 1, "marginea de jos atinsă în a treia oră");
  assert.equal(c.Probabilitati.judeca(tip("iese-sus-4"), [bara(0), bara(1), bara(2, u.c * 0.97), bara(3)]), 0);
});

// ---------- B. capul paginii ----------
const SM = (c) => ({ nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (short, tare)", faCe: c.SemnaleBot.textTrend("tare", true), componente: [
  { nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (short, tare)", faCe: c.SemnaleBot.textTrend("tare", true) },
  { nivel: "atentie", cod: "miscare", motiv: "mișcare mare împotriva botului (2,8× obișnuitul pe 24 h)", faCe: "N-aș adăuga bani acum; l-aș lăsa cât lichidarea e departe.", deCe: "…" } ] });
const SFAT = [{ cod: "margine", ton: "atentie", parte: "jos", pctJos: 1.5, zile: 66, titlu: "Marginea de jos (60.0000) e cu 1,5% sub preț", text: "Acolo botul ar avea ~4,2 HYPE…", faCe: "N-aș mări levierul și n-aș pune bani în plus în botul ăsta." }];
const SOC = (stareTrend) => ({ trend: { n: 90, judecate: 88, corecte: 34, bani: 307.2, baniN: 88, zile: 19, rataZile: 0.386, reper: 0.322, p: 0.2, ic: [0.24, 0.65], stare: stareTrend, nume: "Trendul împotriva botului" },
  muta: { n: 125, judecate: 125, corecte: 39, bani: 270.7, baniN: 125, zile: 21, rataZile: 0.312, reper: 0.33, p: 0.6, ic: [0.18, 0.55], stare: "nesigur", nume: "„Mută gridul”" },
  btc: { n: 29, judecate: 29, corecte: 5, bani: -54.5, baniN: 29, zile: 11, rataZile: 0.17, reper: 0.33, p: 0.9, ic: [0.02, 0.52], stare: "nesigur", nume: "„BTC în mișcare”" } });
const CONS = () => module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "consiliu.js");
await test("B1 Consilierul: un sfat „nesigur” nu urcă sus după banii din registru - ordinea fixă (marginea înaintea trendului)", () => {
  const c = CONS(), r = c.Consiliu.alcatuieste({ sm: SM(c), sfaturi: SFAT, socoteala: SOC("nesigur"), laJos: -8.9, jos: 60 });
  assert.equal(r.motive[0].cod, "margine", "sus: " + r.motive.map((m) => m.cod).join(" > "));
  assert.match(r.faCe, /N-aș mări levierul/);
  const fara = c.Consiliu.alcatuieste({ sm: SM(c), sfaturi: SFAT, socoteala: null, laJos: -8.9, jos: 60 });
  assert.equal(fara.motive[0].cod, r.motive[0].cod, "cu și fără registru, aceeași ordine cât nimic nu e dovedit");
});
await test("B2 Consilierul: sfatul DOVEDIT (stare „ajuta”) urcă înaintea celor nemăsurate; unul măsurat pe minus nu urcă peste unul nemăsurat", () => {
  const c = CONS(), r = c.Consiliu.alcatuieste({ sm: SM(c), sfaturi: SFAT, socoteala: SOC("ajuta"), laJos: -8.9, jos: 60 });
  assert.equal(r.motive[0].cod, "trend", "sus: " + r.motive.map((m) => m.cod).join(" > "));
  const sm2 = { nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc grilele", faCe: "Aș lua levier mai mic.", componente: [
    { nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc grilele", faCe: "Aș lua levier mai mic." }, { nivel: "atentie", cod: "btc", motiv: "BTC în mișcare", faCe: "N-aș adăuga bani până nu se vede încotro trage BTC." }] };
  assert.equal(c.Consiliu.alcatuieste({ sm: sm2, sfaturi: [], socoteala: SOC("nesigur") }).motive[0].cod, "costuri");
});
await test("B3 cipul de sub motiv spune dovada în cuvinte: rata față de cea de obicei, pe câte zile, și „nedovedit” / „dovedit”", () => {
  const c = CONS(), cip = (s) => c.Consiliu.alcatuieste({ sm: SM(c), sfaturi: [], socoteala: SOC(s) }).motive.find((m) => m.cod === "trend").cip;
  const n = cip("nesigur"), d = cip("ajuta");
  assert.match(n.t, /nedovedit/); assert.match(n.t, /38,6% față de 32,2% de obicei/); assert.match(n.t, /19 zile/); assert.doesNotMatch(n.t, /dacă-l urmai/);
  assert.match(d.t, /dovedit/); assert.doesNotMatch(d.t, /nedovedit/);
  /* forma veche din KV (fără zile și reper), până la prima tură a colectorului nou */
  const vechi = SOC("nesigur"); delete vechi.trend.zile; delete vechi.trend.reper; delete vechi.trend.rataZile;
  const v = c.Consiliu.alcatuieste({ sm: SM(c), sfaturi: [], socoteala: vechi }).motive.find((m) => m.cod === "trend").cip;
  assert.match(v.t, /34 din 88/); assert.match(v.t, /nedovedit/);
});
await test("B4 altaVoce: vorbește și când treapta e aceeași, dar motivul de sus (și acțiunea) diferă de ale colectorului", () => {
  const c = CONS(), aici = { nivel: "atentie", titlu: "Trendul e împotriva botului", faCe: "aș închide botul lângă zero", motive: [{ cod: "trend", c: "g" }] };
  const kv = { acum: { nivel: "atentie", eticheta: "🟡 Atenție", titlu: "Marginea de jos e la −1,5%", faCe: "N-aș mări levierul.", motive: [{ cod: "margine", c: "g" }] } };
  const t = c.Consiliu.altaVoce(kv, aici); assert.ok(t, "tace la aceeași treaptă"); assert.match(t, /Marginea de jos e la −1,5%/);
  assert.equal(c.Consiliu.altaVoce({ acum: { nivel: "atentie", titlu: "x", motive: [{ cod: "trend", c: "g" }] } }, aici), null, "același motiv de sus = aceeași voce");
  assert.match(c.Consiliu.altaVoce({ acum: { nivel: "iesi", eticheta: "🔴 Ieși", titlu: "y", motive: [{ cod: "trend", c: "r" }] } }, aici), /Ieși/);
});
await test("B5 capul: marginea contra botului - long ⇒ jos, short ⇒ sus; titlul, șansele pe 1 h / 4 h / 24 h, banii la margine și la stop", () => {
  const c = module_("text-ro.js", "cap-margine.js"), f = (p, scurt) => ({ p, scurt: scurt || Math.round(p * 100) + "%" });
  const x = { dir: "long", pret: 60.9, jos: 60, sus: 66, stop: 56, laMargine: (parte) => (parte === "jos" ? -8.9 : 3.6), laStop: -25.7,
    sanse: { jos: { 1: f(0.12), 4: f(0.35), 24: f(0.74) }, sus: { 1: f(0.01) } }, sansePret: 60.9, sanseOra: "21:05", sfat: SFAT[0], cons: { nivel: "atentie", titlu: "Trendul e împotriva botului (short, tare)", cod: "trend", dovedit: false, siguranta: false } };
  const k = curat(c.CapMargine.alcatuieste(x));
  assert.equal(k.parte, "jos"); assert.match(k.titlu, /^Marginea de jos \(60\.0000\) e la 1,5% sub preț$/);
  assert.equal(c.CapMargine.textSanse(k), "o atinge: în 1 h — 12 din 100 · în 4 h — 35 din 100 · în 24 h — 74 din 100 (istoria monedei, socotit la 21:05; amănuntele în Probabilități)");
  assert.equal(c.CapMargine.textBani(k), "la margine: −8,9 USDT · la stopul tău (56.0000): −25,7 USDT");
  assert.equal(k.faCe, "N-aș mări levierul și n-aș pune bani în plus în botul ăsta.");
  assert.deepEqual(k.cons, { titlu: "Trendul e împotriva botului (short, tare)", dovedit: false }, "Consilierul coboară sub margine, cu dovada lui");
  const s = curat(c.CapMargine.alcatuieste({ ...x, dir: "short", pret: 65, laStop: null, stop: null }));
  assert.equal(s.parte, "sus"); assert.match(s.titlu, /^Marginea de sus \(66\.0000\) e la 1,5% peste preț$/); assert.match(c.CapMargine.textBani(s), /fără stop pus/);
});
await test("B6 capul: prețul trecut de margine se spune ca atare; siguranța (lichidarea, stopul, planul) rămâne titlul, marginea vine sub ea", () => {
  const c = module_("text-ro.js", "cap-margine.js"), baza = { dir: "long", jos: 60, sus: 66, stop: 56, laMargine: -8.9, laStop: -25.7, sanse: {} };
  const a = curat(c.CapMargine.alcatuieste({ ...baza, pret: 59.4 }));
  assert.equal(a.afara, true); assert.match(a.titlu, /Prețul a trecut de marginea de jos \(60\.0000\) cu 1,0%: botul nu mai tranzacționează/); assert.equal(c.CapMargine.textSanse(a), "");
  const g = curat(c.CapMargine.alcatuieste({ ...baza, pret: 60.9, cons: { nivel: "iesi", titlu: "Lichidarea e la 6,0%", faCe: "Aș închide botul acum.", cod: "lichidare", siguranta: true, dovedit: false } }));
  assert.equal(g.sigur, true); assert.equal(g.titlu, "Lichidarea e la 6,0%"); assert.equal(g.faCe, "Aș închide botul acum."); assert.match(g.fapt, /Marginea de jos/); assert.equal(g.cons, null);
  assert.equal(c.CapMargine.alcatuieste({ dir: "long", pret: 0, jos: 60, sus: 66 }), null, "fără preț nu se inventează nimic");
  assert.equal(c.CapMargine.parteaContra("", 61, 60, 66), "jos", "fără direcție: marginea mai apropiată");
});

// ---------- C. dovada de pe boții lui ----------
await test("C1 boții închiși: netul = realizat + comisioane + funding; „afară, contra” = long sub marginea de jos, short peste cea de sus", () => {
  const c = module_("text-ro.js", "cap-margine.js"), B = [
    bot({ id: 1, real: 5, fee: -1, fund: -0.5, pi: 100, min: 10 }), bot({ id: 2, real: -30, fee: -2, pi: 89, min: 300 }), bot({ id: 3, real: -8, fee: -1, dir: "short", pi: 111, min: 90 }),
    bot({ id: 4, real: 4, fee: -1, dir: "short", pi: 89, min: 2000 }), bot({ id: 5, real: 2, fee: -0.5, pi: 112, min: 30 }), { strategyId: "6", buOrderType: "spot_grid", createTime: T0, closeTime: T0 + 1, buOrderData: {} }];
  const d = curat(c.CapMargine.dinBoti(B));
  assert.equal(d.n, 5, "doar boții futures cu bani"); assert.equal(d.margine.afara.n, 2); assert.ok(Math.abs(d.margine.afara.net - (-41)) < 1e-9, "afară net " + d.margine.afara.net);
  assert.equal(d.margine.rest.n, 3); assert.ok(Math.abs(d.margine.rest.net - 8) < 1e-9, "restul net " + d.margine.rest.net);
  assert.equal(d.durate.medianaMin, 90); assert.deepEqual(d.durate.la.map((x) => x.n), [3, 2, 1, 0, 0]);
});
await test("C2 textele dovezii: se spun doar de la 30 de boți; cifrele cu o zecimală, numărul cu „de”", () => {
  const c = module_("text-ro.js", "cap-margine.js"), B = [];
  for (let i = 0; i < 40; i++) B.push(bot({ id: i, real: i < 4 ? -50 : 3, fee: -0.5, pi: i < 4 ? 85 : 100, min: i < 2 ? 11000 : 20, creat: T0 + i * 864e5 }));
  const d = c.CapMargine.dinBoti(B), t = c.CapMargine.textDovada(d);
  assert.match(t, /^Pe boții tăi închiși \(40 de boți, 01\.01\.2026 – /); assert.match(t, /contra botului — 4 \(10,0%\): −202,0 USDT; toți ceilalți: \+90,0 USDT\./); assert.match(t, /nu ce urmează/);
  assert.equal(c.CapMargine.textDurata(d, 168), "2 din 40 de boți închiși de-ai tăi au ajuns la 7 zile (5,0%)");
  assert.equal(c.CapMargine.textDurata(d, 72), "2 din 40 de boți închiși de-ai tăi au ajuns la 3 zile (5,0%)");
  assert.equal(c.CapMargine.textDovada(c.CapMargine.dinBoti(B.slice(0, 10))), "", "sub 30 de boți nu se trage nicio concluzie");
});

// ---------- D. costul ----------
await test("D1 comisionul perechilor nu se scade a doua oară: gridProfit e după el; costul = pornirea + închiderea", () => {
  const c = module_("text-ro.js", "cap-margine.js"), pas = Math.pow(66 / 60, 1 / 30) - 1;
  /* botul de pe viu (20.11): 55 de perechi, grile 1,3270663 după comision, comisioane −0,264292448, închiderea ≈ −0,1 */
  const k = curat(c.CapMargine.cost({ grile: 1.3270663, comisioane: -0.264292448, inchidere: -0.1, pas, varstaMin: 400 }, null));
  assert.ok(k.perechi < -0.15 && k.perechi > -0.22, "comisionul perechilor refăcut: " + k.perechi);
  assert.ok(Math.abs(k.cost - (k.pornire + k.inchidere)) < 1e-12); assert.ok(k.cost > -0.25 && k.cost < -0.12, "costul " + k.cost); assert.equal(k.acoperit, true);
  const t = c.CapMargine.textCost(k); assert.match(t.text, /^pornirea și închiderea ≈ −0,2 USDT · grilele au adus \+1,3 USDT \(după comisionul perechilor\)$/); assert.match(t.stare, /^acoperit de \d+,\d ori$/);
  const n = c.CapMargine.textCost(c.CapMargine.cost({ grile: 0.02, comisioane: -0.3, inchidere: -0.1, pas, varstaMin: 4 }, null)); assert.equal(n.stare, "încă neacoperit"); assert.equal(n.ton, "atentie");
});
await test("D2 „la boții tăi de durata asta”: cutia vârstei botului, doar cu cel puțin 30 de boți în ea", () => {
  const c = module_("text-ro.js", "cap-margine.js"), B = [];
  for (let i = 0; i < 40; i++) B.push(bot({ id: i, min: 5, grid: i < 10 ? 2 : 0.01, fee: -0.6, real: 1 }));
  for (let i = 0; i < 12; i++) B.push(bot({ id: 100 + i, min: 600, grid: 5, fee: -0.6, real: 3 }));
  const d = c.CapMargine.dinBoti(B), pas = 0.004;
  const scurt = curat(c.CapMargine.cost({ grile: 0.1, comisioane: -0.4, inchidere: -0.1, pas, varstaMin: 6 }, d));
  assert.deepEqual(scurt.cutie, { et: "sub 15 minute", n: 40, acoperit: 10, parte: 0.25 });
  assert.match(c.CapMargine.textCost(scurt).sub, /^la boții tăi care au ținut sub 15 minute: grilele au acoperit costul la 10 din 40 \(25,0%, estimat\)$/);
  /* botul fără niciun comision și nicio grilă n-a făcut nimic: nu intră în cutie (revizia: 53 din 1.084 la boții de sub 15 minute) */
  const cuGoi = c.CapMargine.dinBoti(B.concat(Array.from({ length: 20 }, (_, i) => bot({ id: 500 + i, min: 5, grid: 0, fee: 0, real: 0 }))));
  assert.equal(cuGoi.cost[0].n, 40); assert.equal(cuGoi.cost[0].acoperit, 10); assert.equal(cuGoi.n, 72, "în dovada marginii și în durate rămân toți");
  assert.equal(c.CapMargine.cost({ grile: 0.1, comisioane: -0.4, inchidere: -0.1, pas, varstaMin: 700 }, d).cutie, null, "12 boți în cutie: prea puțini");
});

await test("D3 cu taxa de intrare estimată de pagină: pornirea = taxa, restul comisioanelor sunt ale perechilor (nu intră în cost)", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const k = curat(c.CapMargine.cost({ grile: 1.3270663, comisioane: -0.264292448, pornire: -0.076, inchidere: -0.1, pas: 0.0032, varstaMin: 400 }, null));
  assert.ok(Math.abs(k.pornire + 0.076) < 1e-12, "pornirea " + k.pornire); assert.ok(Math.abs(k.perechi + (0.264292448 - 0.076)) < 1e-9, "perechile " + k.perechi); assert.ok(Math.abs(k.cost + 0.176) < 1e-9, "costul " + k.cost);
  /* taxa estimată mai mare decât tot comisionul plătit: pornirea nu trece de ce s-a plătit */
  assert.ok(Math.abs(c.CapMargine.cost({ grile: 0.5, comisioane: -0.05, pornire: -0.2, inchidere: 0 }, null).pornire + 0.05) < 1e-12);
});

// ---------- E. registrul sfaturilor ----------
const intr = (t, cod, nivel, total, dupa) => ({ t, cod, nivel, motiv: "", total, dreptate: nivel === "tine" ? dupa >= total - 0.5 : dupa < total - 0.5, totalDupa: dupa, judecatLa: t + ORA });
await test("E1 același sfat pe același bot se numără o singură dată (prima apariție), oricâte întoarceri a făcut semaforul", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js");
  const unBot = [intr(T0, "trend", "atentie", -1, -20), intr(T0 + ORA, "muta", "atentie", -6, -20), intr(T0 + 2 * ORA, "trend", "atentie", -9, -20), intr(T0 + 3 * ORA, "muta", "atentie", -12, -20), intr(T0 + 4 * ORA, "trend", "atentie", -14, -20)];
  const r = curat(c.SemnaleBot.socotealaToti([unBot]));
  assert.equal(r.trend.judecate, 1); assert.equal(r.muta.judecate, 1); assert.ok(Math.abs(r.trend.bani - 19) < 1e-9, "banii trendului: " + r.trend.bani); assert.ok(Math.abs(r.muta.bani - 14) < 1e-9);
});
await test("E2 banii au reper: „peste ies la orice sfat” (media celorlalte sfaturi de ieșire), nu față de zero", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js"), L = [];
  for (let i = 0; i < 10; i++) L.push([intr(T0 + i * 864e5, "trend", "atentie", 0, -4)]);
  for (let i = 0; i < 10; i++) L.push([intr(T0 + i * 864e5, "muta", "atentie", 0, -2)]);
  const r = curat(c.SemnaleBot.socotealaToti(L));
  assert.ok(Math.abs(r.trend.bani - 40) < 1e-9); assert.ok(Math.abs(r.trend.baniPeste - 10) < 1e-9, "peste reper: " + r.trend.baniPeste); assert.ok(Math.abs(r.muta.baniPeste + 10) < 1e-9);
  const t = c.SemnaleBot.textIncredere(r.trend); assert.match(t, /dacă închideai botul la semnal/); assert.match(t, /peste „ies la orice sfat”/); assert.doesNotMatch(t, /dacă-l urmai/);
});
await test("E3 ruta registrului păstrează dovada pe zile (zile, rataZile, reper, p) și banii peste reper", () => {
  const s = citeste("functions", "api", "istoric-bot.js"), i = s.indexOf('const STARI=["necunoscut"'), z = s.slice(i, i + 900);
  for (const k of ["zile:nr(x.zile)", "rataZile:nr(x.rataZile)", "reper:nr(x.reper)", "p:nr(x.p)", "baniPeste:nr(x.baniPeste)"]) assert.ok(z.includes(k), "ruta aruncă " + k);
});

// ---------- F. defectele mărunte ----------
await test("F1 ritmul perechilor: împărțit la vârsta botului (cel mult 24 h), nu mereu la 24", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-bot.js"), acum = T0 + 100 * ORA;
  const m = (ore) => c.TabloBot.masoara({ bot: { createTime: acum - ore * ORA, buOrderData: { trx24h: 49 } }, acum }).ritmPerechi;
  assert.ok(Math.abs(m(5).valoare - 9.8) < 1e-9, "bot de 5 h: " + m(5).valoare); assert.ok(Math.abs(m(30).valoare - 49 / 24) < 1e-9); assert.ok(Math.abs(m(24).valoare - 49 / 24) < 1e-9);
  assert.ok(m(0.05).valoare <= 49 / 0.25 + 1e-9, "botul de 3 minute nu dă un ritm uriaș");
  assert.match(m(5).eticheta, /5 h/); assert.match(m(30).eticheta, /24 ?h/);
});
await test("F2 cartela Gridul: fără „propus: N grile” când fișa de azi oprește (nu porni / mișcare mare)", () => {
  const s = citeste("public", "lib", "semnale-bot.js");
  assert.match(s, /sp && f && !fisaOpreste\(f\) \? "propus: "/, "„propus” se scrie și când fișa oprește");
  assert.match(s, /fisaOpreste\(f\) \? "fișa de azi: nu porni unul nou"/);
});

await test("F3 „Ține-l” din registrul vechi (fără `fel`) nu scrie „dacă închideai botul”: felul se ia din codul sfatului", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js"), x = { nume: "„Ține-l”", corecte: 21, judecate: 39, bani: -132.1, baniN: 39, stare: "tace" };
  assert.match(c.SemnaleBot.textIncredere(x, "tine"), /~−132,1 USDT ținându-l de fiecare dată/);
  assert.match(c.SemnaleBot.textIncredere(Object.assign({}, x, { nume: "Trendul împotriva botului", stare: "nesigur" }), "trend"), /dacă închideai botul la semnal/);
  assert.match(c.SemnaleBot.textIncredere(x), /dacă-l urmai de fiecare dată/, "fără cod și fără fel: forma veche, neutră");
});
await test("F4 costurile pe zi: comisionul perechilor e deja în grile ⇒ netul pe zi = grile + funding; „comision vs grid” se raportează la brutul refăcut", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "tablou-bot.js"), acum = T0 + 100 * ORA;
  const b = { pornitLa: acum - 48 * ORA, finantare: -0.2, comisioane: -1.0, directie: "", investit: 100, levier: 3, gridJos: 90, gridSus: 110, ordinePerechi: 100, brut: { buOrderData: { gridProfit24h: 0.6, trx24h: 50, initPrice: 100 } } };
  const z = curat(c.TabloExtra.grileVsCosturi(b, acum));
  assert.equal(z.comisionInGrile, true); assert.ok(Math.abs(z.netZi - (0.6 + z.fundingZi)) < 1e-12, "netZi " + z.netZi + " · funding " + z.fundingZi); assert.ok(z.comisionZi < 0, "comisionul rămâne arătat");
  const m = c.TabloBot.masoara({ bot: { createTime: acum - 30 * ORA, buOrderData: { gridProfit: "2.30", totalFee: "-0.45", top: "110", bottom: "90", trend: "neutral" } }, acum, pretPerpViu: 100 }).comision;
  assert.ok(Math.abs(m.valoare - 100 * 0.45 / 2.75) < 1e-6, "comision: " + m.valoare); assert.equal(m.prag, 50);
});
await test("F5 ritmul perechilor: fără vârstă sau cu o vârstă imposibilă rămân cele 24 h ale lui Pionex", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-bot.js"), acum = T0 + 100 * ORA;
  const r = (ct) => c.TabloBot.masoara({ bot: { createTime: ct, buOrderData: { trx24h: 48 } }, acum }).ritmPerechi;
  assert.equal(r(acum + 5 * ORA).valoare, 2); assert.equal(r(acum + 5 * ORA).eticheta, "din Pionex 24h"); assert.equal(r(undefined).valoare, 2);
});
await test("F6 Monte Carlo: „aruncarea de ban” își păstrează motivul în rândul scurt (pagina o tăia la primul „:”)", () => {
  const s = citeste("public", "lib", "grid-sim.js");
  assert.match(s, /mDar = \/\^\(\[\^:\]\+\): \(\?:câștigă\|pierde\) în \.\*\?, dar \(\[\^;\]\+\);\//);
  const re = /^([^:]+): (?:câștigă|pierde) în .*?, dar ([^;]+);/, m = re.exec("O aruncare de ban de aici încolo: câștigă în 64% din drumuri, dar marja pe zile coboară sub 50%; deocamdată nu zic «Aș ține». Ține-l doar cu planul tău pus.");
  assert.equal(m[1] + ": " + m[2], "O aruncare de ban de aici încolo: marja pe zile coboară sub 50%");
  assert.match(re.exec("O aruncare de ban: pierde în 58% din drumuri, în medie −1,2 USDT, dar incertitudinea reală e ±12 puncte (din ~9 zile distincte), deci poate fi și peste 50%; n-am aflat că pierde")[2], /^incertitudinea reală e ±12 puncte/);
  const app = citeste("public", "app.js"); assert.match(app, /\(h\.motiv\?escapeHtml\(h\.motiv\):"nicio schimbare nu iese sigur mai bună pe bani"\)/, "motivul hotărârii se arată și la „îl țin”");
  assert.match(app, /nu la 7 zile: scorul nu confirmă și nu infirmă verdictul pe 7 zile/);
});

// ---------- G. legarea în pagină ----------
await test("G1 capul: stratul cere marginea (tbCapMargine) și păstrează forma veche când lipsesc cifrele; siguranța o dă Consiliu.FIX", () => {
  const p = citeste("public", "lib", "asezare-paznic.js"), app = citeste("public", "app.js"), c = CONS();
  assert.match(p, /cap = !dinSalvat && typeof tbCapMargine === "function" && typeof CapMargine !== "undefined" \? tbCapMargine\(b\) : null/, "cât Consilierul socotește, capul e verdictul salvat");
  assert.match(p, /\{ dinSalvat = true; verb = salvat\.verb; tonV = salvat\.ton;/);
  assert.match(p, /if \(cap\) \{/); assert.match(p, /class="pzVerbTxt pzMarg"/); assert.match(p, /\+ corpV \+ surseTablou\(\) \+ '<\/div>'/);
  assert.match(p, /din: Consilierul · motivele întregi în cartela lui, mai jos/, "forma veche rămâne pentru cazul fără cifre");
  assert.match(app, /function tbCapMargine\(b\)\{/); assert.match(app, /siguranta:!!\(m0&&\(m0\.cod==="podea"\|\|\(Consiliu\.FIX&&Consiliu\.FIX\[m0\.cod\]\)\)\)/, "și podeaua (ținta atinsă) ține titlul"); assert.match(app, /dovedit:!!\(m0&&m0\.cip&&m0\.cip\.cls==="ajuta"\)/);
  assert.deepEqual(Object.keys(curat(c.Consiliu.FIX)).sort(), ["lichidare", "opreste", "pericol", "plan", "stop"]);
});
await test("G2 cipurile de sub verdict iau tonul din DATE (tbSemaforTf), cu săgeata becului; culoarea temei nu mai hotărăște", () => {
  const p = citeste("public", "lib", "asezare-paznic.js");
  assert.match(p, /semD = typeof tbSemaforTf === "function" && D\.bot \? tbSemaforTf\(D\.bot\) : null/);
  assert.match(p, /TON_D = \{ bine: "da", rau: "nu", atentie: "atentie" \}/); assert.match(p, /\(v\.sageata \|\| SIMB\[v\.ton\] \|\| "–"\)/);
  assert.match(p, /else document\.querySelectorAll\("#tbGrafic \.gbSem"\)/, "fără date rămâne citirea veche");
});
await test("G3 Probabilitățile: rândurile de 1 h și 4 h înaintea celor de 24 h; doar marginile pe 3 zile intră în pliu (lichidarea și ținta planului rămân la vedere)", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "probabilitati.js"), b = mers(120 * 24, 0.006, 5), u = b[b.length - 1];
  const r = c.Probabilitati.pentruBot(b, { acum: u.t + ORA, pret: u.c, dir: "long", jos: u.c * 0.985, sus: u.c * 1.02, lichidare: u.c * 0.7 });
  const l = curat(c.Probabilitati.randuri(r, null)), cod = l.map((x) => x.cod);
  assert.ok(cod.indexOf("iese-jos-1") >= 0 && cod.indexOf("iese-jos-1") < cod.indexOf("iese-jos-4") && cod.indexOf("iese-jos-4") < cod.indexOf("iese-jos-24"), cod.join(" "));
  assert.deepEqual(l.filter((x) => x.lung).map((x) => x.cod).sort(), ["iese-jos-72", "iese-sus-72"]); assert.ok(cod.includes("lichidare") && !l.find((x) => x.cod === "lichidare").lung, "lichidarea rămâne la vedere");
  assert.ok(l.filter((x) => /-(1|4|24)$/.test(x.cod)).every((x) => !x.lung));
  const app = citeste("public", "app.js"); assert.match(app, /function tbProbRanduriHtml\(l\)\{/); assert.match(app, /class="tbProbFara tbProbLung"><summary>Pe 3 zile · /);
});
await test("G4 rândul de cost, alerta de zero, „Deschide tot”, etichetele: legate în pagină", () => {
  const app = citeste("public", "app.js"), html = citeste("public", "index.html"), p = citeste("public", "lib", "asezare-paznic.js");
  assert.ok(html.includes('<span id="tbKpiGrid" class="tbKpiGrid">—</span><div id="tbKpiCost" class="tbKpiCost" hidden></div>'));
  assert.match(app, /if\(typeof tbCostDeseneaza==="function"\)tbCostDeseneaza\(b\);/); assert.match(app, /pornire:tx,inchidere:/);
  assert.match(app, /Alerte\.reguli\(b,\{plan:plA\|\|null,pretZero:zrA\},\{"p-zero":\{nivel:"atentie"\}\}\)/, "pagina judecă banda de ieșire a alertei, nu intrarea în ea"); assert.match(app, /if\(typeof pzFoldToate==="function"\)pzFoldToate\(!!deschis\)/); assert.match(p, /window\.pzFoldToate = function \(deschis\)/);
  assert.match(app, /"după comisionul perechilor"\)\+/); assert.doesNotMatch(app, /brut, fără comisioane/); assert.match(app, /"deja scăzute din grile"\)/);
});
await test("G5 viteza: pazele de așezare sar peste nodurile graficului (SVG) și citesc lățimea o singură dată pe tură", () => {
  const r = citeste("public", "lib", "asezare-randuri.js"), p = citeste("public", "lib", "asezare-paznic.js");
  assert.match(r, /!toate\[i\]\.ownerSVGElement && toate\[i\]\.tagName !== "svg" &&/); assert.match(r, /function cuSub\(e\) \{ if \(e && \(e\.ownerSVGElement \|\| e\.tagName === "svg"\)\) return;/);
  assert.match(r, /!pan\.contains\(t\) \|\| t\.ownerSVGElement \|\| t\.tagName === "svg"\) continue;/);
  assert.match(p, /var ingust = function \(\) \{ return latime\(\) <= 550; \};/); assert.match(p, /latTura = innerWidth;/); assert.match(p, /latTura = null;/); assert.match(p, /lat = latime\(\) >= 1280/);
});
await test("G6 stilurile noi stau înaintea zonei păzite a temei și nu poartă culori scrise direct", () => {
  const css = citeste("public", "app.css"), i = css.indexOf("/* v100.373 ("), j = css.indexOf("/* v100.313");
  assert.ok(i > 0 && i < j, "blocul v100.373 trebuie pus înaintea blocului v100.313"); const bloc = css.slice(i, css.indexOf("/* v100.369", i));
  assert.match(bloc, /\.pzMargSanse/); assert.match(bloc, /\.tbKpiCost/); assert.doesNotMatch(bloc, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, "culoare scrisă direct");
});

// ---------- H. îndreptările reviziei independente ----------
await test("H1 șansele depășite: când prețul s-a apropiat de margine cu peste o cincime din distanța de la socoteală, capul o spune, nu le arată ca valabile", () => {
  const c = module_("text-ro.js", "cap-margine.js"), f = (p) => ({ p, scurt: Math.round(p * 100) + "%" });
  const x = (pret) => ({ dir: "long", pret, jos: 60, sus: 66, stop: 56, laMargine: -8.9, laStop: -25.7, sanse: { jos: { 1: f(0.07), 4: f(0.34), 24: f(0.72) } }, sansePret: 60.852, sanseOra: "19:44" });
  const t = (pret) => c.CapMargine.textSanse(c.CapMargine.alcatuieste(x(pret)));
  assert.equal(t(60.12), "o atinge mai des decât arătau cifrele socotite cu marginea la 1,4% (în 1 h — 7 din 100 · în 4 h — 34 din 100 · în 24 h — 72 din 100): acum e la 0,2%; se refac în cel mult 10 minute");
  assert.match(t(62.5), /^o atinge mai rar decât arătau cifrele socotite cu marginea la 1,4% \(.*\): acum e la 4,0%; se refac în cel mult 10 minute$/);
  assert.match(t(60.9), /^o atinge: în 1 h — 7 din 100 · .* \(istoria monedei, socotit la 19:44; amănuntele în Probabilități\)$/, "aproape aceeași distanță: cifrele rămân");
  assert.equal(c.CapMargine.PRAG_VECHI, 0.2);
});
await test("H2 colectorul reface șansele o dată pe oră sau, cel mult la 10 minute, când distanța până la o margine s-a schimbat cu peste o cincime", async () => {
  const { seReface } = await import("./lib/tura-probabilitati.mjs"), MIN = 60000;
  assert.equal(seReface(61 * MIN, 60.85, 60.85, 60, 66), true, "a trecut ora");
  assert.equal(seReface(5 * MIN, 60.85, 60.12, 60, 66), false, "sub 10 minute nu se reface, oricât s-a mutat prețul");
  assert.equal(seReface(20 * MIN, 60.85, 60.12, 60, 66), true, "de la 1,4% la 0,2% de marginea de jos");
  assert.equal(seReface(20 * MIN, 60.85, 60.80, 60, 66), false, "prețul aproape pe loc");
  assert.equal(seReface(20 * MIN, null, 60.12, 60, 66), false, "fără prețul de la socoteala dinainte rămâne ora");
  const src = citeste("scripts", "lib", "tura-probabilitati.mjs"); assert.match(src, /st\.pret\[b\.id\] = nr\(b\.pretCurent\)/); assert.match(src, /!seReface\(d\.acum - \(st\.la\[b\.id\] \|\| 0\), st\.pret && st\.pret\[b\.id\], b\.pretCurent, b\.gridJos, b\.gridSus\)/);
});
await test("H3 capul: aceeași cifră ca în cardul Probabilităților („sub N din 100” la capete, niciodată 0 sau 100 goale); distanța față de preț", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  assert.equal(c.CapMargine.textSansa({ p: 0, scurt: "sub 5%" }), "sub 5 din 100"); assert.equal(c.CapMargine.textSansa({ p: 0 }), "sub 1 din 100"); assert.equal(c.CapMargine.textSansa({ p: 1 }), "peste 99 din 100"); assert.equal(c.CapMargine.textSansa({ p: 0.724, scurt: "72%" }), "72 din 100");
  const k = c.CapMargine.alcatuieste({ dir: "long", pret: 100, jos: 95, sus: 110 }); assert.match(k.titlu, /e la 5,0% sub preț$/, k.titlu);
  const app = citeste("public", "app.js"); assert.match(app, /Probabilitati\.randuri\(rz,tp\.cal\)\.forEach\(function\(r\)\{R\[r\.cod\]=r\}\)/, "capul ia rândurile cardului, cu calibrarea");
  assert.match(app, /sansePret:rz\?botiNr\(rz\.pret\):null,sanseOra:ora/);
});
await test("H4 stopul: în procente și fără preț (botul neutru) nu e „fără stop pus”; stopul scurt din Monte Carlo nu se arată când reluarea nu e a botului", () => {
  const c = module_("text-ro.js", "cap-margine.js"), b = { dir: "", pret: 61, jos: 60, sus: 66, laMargine: -3, laStop: null, stop: null };
  assert.equal(c.CapMargine.textBani(c.CapMargine.alcatuieste({ ...b, stopActiv: true, stopEticheta: "stop −10%" })), "la margine: −3,0 USDT · stopul tău: stop −10% (fără preț socotit)");
  assert.equal(c.CapMargine.textBani(c.CapMargine.alcatuieste({ ...b, stopActiv: false })), "la margine: −3,0 USDT · fără stop pus");
  const app = citeste("public", "app.js"); assert.match(app, /stopActiv:!!b\.opritorPierdereActiv/); assert.match(app, /!\/Reluarea arată botul\/\.test\(String\(mr\.text\|\|""\)\+" "\+String\(mr\.faCe\|\|""\)\)\?mr\.scurt:null/); assert.match(app, /tbMc\.rand&&!tbMc\.eroare\?tbMc\.rand:null/);
});
await test("H5 prețul trecut de marginea CEALALTĂ (long peste cea de sus): capul rămâne al Consilierului, nu vorbește despre o margine aflată la 9% în spate", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  assert.equal(c.CapMargine.alcatuieste({ dir: "long", pret: 66.5, jos: 60, sus: 66, laMargine: 1 }), null); assert.equal(c.CapMargine.alcatuieste({ dir: "short", pret: 59.5, jos: 60, sus: 66, laMargine: 1 }), null);
  assert.ok(c.CapMargine.alcatuieste({ dir: "long", pret: 65.9, jos: 60, sus: 66, laMargine: 1 }));
});
await test("H6 textele rămase: costurile cu funding-ul (comisionul perechilor e în grile), cipul Monte Carlo după „aș ține / aș opri”, „fel” lipsă rămâne lipsă", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js"), sm = citeste("public", "lib", "semnale-bot.js"), sf = citeste("public", "lib", "sfaturi.js");
  assert.match(sm, /x\.costuri\.comisionInGrile \? "funding-ul pe zi depășește grilele: " : "costurile pe zi depășesc grilele: "/); assert.match(sf, /co\.comisionInGrile \? ", după comisionul perechilor" : "; comisioanele iau "/); assert.match(sf, /faCe: co\.fundingMananca \|\| co\.comisionInGrile \?/);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /ton: \/aș opri\|contra\/i\.test\(sgM\) \? "nu" : \/aș ține\|cu botul\/i\.test\(sgM\) \? "da" : "neutru"/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /fel:x\.fel==="tine"\?"tine":x\.fel==="iesi"\?"iesi":null,/);
  assert.match(citeste("public", "lib", "consiliu.js"), /SemnaleBot\.textIncredere\(ss, SOC\[sm\.cod\] \|\| sm\.cod\) : ""\) \+ "\."/);
  assert.ok(c.SemnaleBot);
});

// ---------- versiunea ----------
await test("versiunile: v100.373 peste tot (de la v100.373 încolo), modulul nou încărcat și ținut de service worker, proba în lanț", () => {
  const pk = JSON.parse(citeste("package.json")), nr = (v) => { const m = /^100\.(\d+)\./.exec(String(v)); return m ? +m[1] : 0; };
  assert.ok(nr(pk.version) >= 373, "package.json: " + pk.version);
  const SW = citeste("public", "sw.js"), HTML = citeste("public", "index.html");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(SW) || [])[1] >= 373, "sw.js");
  assert.ok(+(/v100\.(\d+)/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 373, "versiune.js");
  assert.ok(SW.includes('"/lib/conteaza.js","/lib/cap-margine.js"'), "sw.js nu ține cap-margine.js");
  assert.ok(HTML.includes('<script src="/lib/conteaza.js"></script><script src="/lib/cap-margine.js"></script>'), "index.html nu încarcă cap-margine.js");
  assert.equal(pk.scripts["test:v100373"], "node scripts/proba-v100373.mjs");
  assert.match(pk.scripts.test + " " + Object.keys(pk.scripts).filter((k) => /^test:lant-/.test(k)).map((k) => pk.scripts[k]).join(" "), /test:v100373\b/);
});

console.log(`\n${teste - picate}/${teste} teste trecute\n`);
process.exit(picate ? 1 : 0);
