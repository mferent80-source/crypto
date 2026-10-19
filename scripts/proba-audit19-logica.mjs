// Probele auditului din 19.10.2026 (el: „fă tot”), felia LOGICA DE TRADING (public/lib: semnale, alerte, grid, statistici).
// (1) stopul propus ÎN grid (TAKE 05.10: long 5×, grid 0,05330–0,07224, plan −6,5 ⇒ prețul planului ~0,0614, în grid) · (2) „Cât investesc?”
// la levierul ales · (3) grilele reduse la minimul pe ordin · (4) Monte Carlo „Aș opri” simetric · (5) stopul din MAE pe net · (6) banda pe
// net + Wilson · (7) „dovedit” pe un prag de număr · (8) reveniri „mai bine / mai slab” cu eroarea standard · (9) gridul îngust = un singur
// bloc · (10) reparațiile mici. Depozit PUBLIC ⇒ cifre construite (forma botului TAKE din proba-v100101).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul;
globalThis.GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
const A = new Function(`${lib("alerte.js")}; return Alerte;`)();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 600)}`); }); }
console.log("\naudit 19.10 · logica de trading · proba\n");

// ---------- (1) stopul propus ÎN grid ----------
const TAKE = (o) => ({ id: "B", baza: "TAKE.PERP", directie: "long", activ: true, investit: 40, levier: 5, pretCurent: 0.06505, pretDeschidere: 0.066, pozitie: 1070, profitNet: -0.1, profitTotal: -1,
  gridJos: 0.0533, gridSus: 0.07224, pnlNerealizatSigur: true, brut: { buOrderData: { row: 50, gridType: "geometric", perVolume: "72" } }, ...o });
const cuStop = (op) => TAKE({ opritorPierdereActiv: true, opritorPierdere: op });
const cartelaStop = (b, extra) => { const z = TE.dacaInchizi(b); return SB.acumConcret({ bot: b, fisa: null, zero: z, costuri: null, plan: TE.planStare(b, { minus: 6.5 }, {}, 0), acum: 0, ...extra }).find((x) => x.cod === "stop"); };
const alertaStop = (b) => { const z = TE.dacaInchizi(b); return A.reguli(b, { plan: TE.planStare(b, { minus: 6.5 }, {}, 0), pretZero: z.pretZero }, {})["plan-stop"]; };
const PRET_PLAN = /0\.061\d*/;   // prețul planului (~0,0614), în grid
const totTxt = (c) => [c.act, c.deCe, c.text, c.mic].join(" | ");

await test("(1) planStare: prețul planului TAKE cade în grid (~0,0614) și se spune pe față (planInGrid), cu stopul de dincolo de marginea de jos", () => {
  const m = TE.planStare(TAKE(), { minus: 6.5 }, {}, 0).minus;
  assert.ok(m.opritorPlan > 0.0533 && m.opritorPlan < 0.07224, String(m.opritorPlan));
  assert.equal(m.planInGrid, true);
  assert.ok(m.stopAfara > 0 && m.stopAfara < 0.0533, "stopul propus stă sub grid: " + m.stopAfara);
  assert.ok(m.laStopAfara < -6.5 && m.laStopAfara < m.laMargine, "sub grid pierzi mai mult decât la margine: " + m.laStopAfara + " / " + m.laMargine);
  const larg = TE.planStare(TAKE({ gridJos: 0.0635 }), { minus: 6.5 }, {}, 0).minus;
  assert.equal(larg.planInGrid, false, "gridul strâmt (0,0635): planul cade sub grid");
});
await test("(1) cartela Stop, fără stop: NU „Aș pune stopul la 0,0614”; propune sub grid sau închiderea la zero, cu pierderea la marginea de jos față de plan", () => {
  const c = cartelaStop(TAKE());
  assert.ok(!/Aș (pune|muta) stopul la 0\.061/.test(totTxt(c)), totTxt(c));
  assert.ok(!/în procente: −16/.test(c.act), "procentul planului e același preț din grid: " + c.act);
  assert.match(c.act, /^Aș /); assert.ok(c.act.length <= 110, c.act.length + ": " + c.act);
  assert.match(c.act, /sub grid, la 0\.052\d+/); assert.match(c.act, /la zero \(0\.0662\d*\)/);
  assert.match(c.deCe, /cade în grid, la 0\.061\d+/); assert.match(c.deCe, /marginea de jos pierzi ≈ 28,2 USDT/); assert.ok(c.deCe.length <= 160, c.deCe.length + ": " + c.deCe);
  assert.match(c.text, /botul următor, grid mai îngust cât planul la 5×, sau același grid la levier 1×/);
  assert.ok(c.pretPropus > 0 && c.pretPropus < 0.0533, "stopul propus (și linia de pe grafic) stă sub grid: " + c.pretPropus);
});
await test("(1) cartela Stop, stopul LUI în grid (0,06097, atins ≈ planul): NU „pus” verde, ci „stop în grid” (warn) și ce parte a gridului moare", () => {
  const c = cartelaStop(cuStop(0.06097));
  assert.notEqual(c.tag.t, "pus"); assert.deepEqual(c.tag, { t: "stop în grid", c: "warn" });
  assert.match(c.deCe, /sub el, \d+ din 49 de grile nu lucrează/); assert.ok(c.deCe.length <= 160, c.deCe.length + ": " + c.deCe);
  assert.match(c.act, /^Aș /); assert.ok(c.act.length <= 110, c.act);
});
await test("(1) cartela Stop, stopul LUI departe (0,045, ≈ −40): „peste plan” rămâne roșu, dar NU „Aș muta stopul la 0,0614”", () => {
  const c = cartelaStop(cuStop(0.045));
  assert.deepEqual(c.tag, { t: "peste plan", c: "bad" });
  assert.ok(!/stopul la 0\.061/.test(c.act), c.act); assert.match(c.act, /sub grid/); assert.ok(c.act.length <= 110, c.act);
  assert.match(c.deCe, /te costă ≈ 40,0 USDT, nu 6,5/); assert.ok(c.deCe.length <= 160, c.deCe);
});
await test("(1) control: cu planul SUB grid (grid strâmt 0,0635), propunerea „Aș pune stopul la <prețul planului>” rămâne", () => {
  const b = TAKE({ gridJos: 0.0635 }), c = cartelaStop(b), m = TE.planStare(b, { minus: 6.5 }, {}, 0).minus;
  assert.ok(m.opritorPlan < 0.0635, String(m.opritorPlan));
  assert.match(c.act, /^Aș pune stopul la 0\.0\d+/, c.act);
});
await test("(1) alerta „plan-stop” fără stop: tot critică, dar nu cere stopul la 0,0614; spune că planul cade în grid și cât pierzi la margine", () => {
  const a = alertaStop(TAKE());
  assert.equal(a.nivel, "critic");
  assert.ok(!PRET_PLAN.test(a.mesaj.split("\n")[1]), a.mesaj);
  assert.match(a.mesaj, /cade în grid/); assert.match(a.mesaj, /≈ 28,2 USDT/);
  const [l1, l2] = a.mesaj.split("\n"); assert.ok(l1.length <= 160, l1.length + ": " + l1); assert.match(l2, /^👉 Aș /); assert.ok(l2.length - 3 <= 110, l2);
});
await test("(1) alerta „plan-stop” cu stopul departe (0,045): critică (≥ 2× planul), fără „Aș muta stopul în Pionex la 0,0614”", () => {
  const a = alertaStop(cuStop(0.045));
  assert.equal(a.nivel, "critic");
  assert.ok(!/stopul în Pionex la 0\.061/.test(a.mesaj), a.mesaj); assert.match(a.mesaj, /sub grid/); assert.match(a.mesaj, /cade în grid/);
  const [l1, l2] = a.mesaj.split("\n"); assert.ok(l1.length <= 160, l1.length + ": " + l1); assert.ok(l2.length - 3 <= 110, l2);
});
await test("(1) alerta „plan-stop” cu stopul LUI în grid (0,06097): spune ce parte a gridului moare", () => {
  const a = alertaStop(cuStop(0.06097));
  assert.match(a.mesaj, /stă în grid/); assert.match(a.mesaj, /\d+ din 49 de grile/);
});
await test("(1) simulatorul spune la fel: stopul în grid ⇒ ce parte moare și stopul sub grid", () => {
  const s = citeste("public", "lib", "grid-sim-ecran.js");
  assert.ok(!/e ÎN grid/.test(s), "textul vechi cu majuscule");
  assert.match(s, /stă în grid \(/); assert.match(s, /nu mai lucrează/);
});

// ---------- (2) „Cât investesc?” la levierul ales · (3) grilele reduse la minimul pe ordin ----------
const GP = globalThis.GridProba;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const Q = 15 * 60000;
function bareSint(n, seed, vol) { const r = mulberry32(seed); let p = 1; const out = []; for (let i = 0; i < n; i++) { const o = p; p *= 1 + (r() - 0.5) * vol; out.push({ t: 1_780_000_000_000 + i * Q, o, h: Math.max(o, p) * 1.001, l: Math.min(o, p) * 0.999, c: p }); } return out; }
const B15 = bareSint(30 * 96 + 1, 11, 0.006), B4 = bareSint(300, 5, 0.02), B1 = bareSint(200, 6, 0.04);
const FISA = (o) => GP.fisa({ simbol: "TEST_USDT_PERP", pret: B15[B15.length - 1].c, b15: B15, b4h: B4, b1d: B1, suma: 100, H: 2, dir: "long", levier: null, minNotional: 1, ...o });
const peFerestre = (f, st) => GP.probaSetare(B15, 2, null, (pret) => G.construieste({ pret, lat: st.lat, pas: st.pas, dir: f.dir, levier: st.levier, grile: st.grile }));
await test("(2) fără levier ales: statistica fișei e chiar proba (levierul sigur), nimic re-rulat", () => {
  const f = FISA();
  assert.ok(!f.eroare, f.eroare);
  assert.equal(f.setare.levier, f.setare.levierSigur);
  assert.deepEqual(f.stat.antren, f.proba.pe.long.antren);
  assert.equal(f.probaLa.levier, f.setare.levier); assert.equal(f.probaLa.reRulata, false);
});
await test("(2) cu levierul ales peste cel sigur: cea mai proastă fereastră și mediana sunt la levierul ales (re-rulate pe aceleași ferestre), nu la cel sigur", () => {
  const f0 = FISA(), L = f0.setare.levierSigur * 3, f = FISA({ levier: L });
  assert.equal(f.setare.levier, L);
  assert.equal(f.probaLa.levier, L); assert.equal(f.probaLa.reRulata, true);
  const lat = f0.proba.latimi[f0.proba.pe.long.wi], pas = f0.proba.pasi[f0.proba.pe.long.pi];
  const sts = f.propusa === "deasa" ? f.deasa : null;   // gridul des propus are statistica lui
  const st = f.propusa === "deasa" ? { lat, pas: f0.proba.pasi[0], levier: L } : { lat, pas, levier: L };
  const asteptat = peFerestre(f, st);
  assert.deepEqual(f.stat.antren, asteptat.antren, "statistica fișei = setarea afișată re-rulată");
  assert.ok(f.stat.antren.ceaMaiProasta < f0.stat.antren.ceaMaiProasta, "la levier mai mare, cea mai proastă fereastră e mai rea: " + f.stat.antren.ceaMaiProasta + " vs " + f0.stat.antren.ceaMaiProasta);
  void sts;
});
await test("(2) „Cât investesc?” spune la ce levier e cifra (și suma scade la levier mai mare)", () => {
  const src = citeste("public", "app.js"), i = src.indexOf("function grRandSumaMaxima("), cod = src.slice(i, src.indexOf("\n// =====", i));
  const rand = (et, val) => et + ": " + val;
  const fn = new Function("$", "grSoldCitit", "grNumar", "grRand", "GridProba", "GridCalcul", "TextRo", cod + "; return grRandSumaMaxima;")(
    (id) => ({ grSold: { value: "1000" }, grPierdere: { value: "5" } })[id], () => ({ sold: 1000 }), Number, rand, GP, G, globalThis.TextRo);
  const f0 = FISA(), f = FISA({ levier: f0.setare.levierSigur * 3 });
  const t0 = fn(f0), t = fn(f);
  assert.match(t, new RegExp("la " + f.setare.levier + "×"), t);
  assert.match(t0, new RegExp("la " + f0.setare.levier + "×"), t0);
  const suma = (s) => Number((s.match(/cel mult (\d+) USDT/) || [])[1]);
  assert.ok(suma(t) < suma(t0), t + " | " + t0);
});
await test("(2, 3) pagina spune pe față că tabelul probei e la levierul sigur, iar verdictul pe setarea de copiat", () => {
  assert.match(citeste("public", "app.js"), /Tabelul e la levierul sigur, pe toate grilele pasului; verdictul și „Cât investesc\?” sunt pe setarea de copiat/);
});
await test("(3) grilele reduse la minimul pe ordin: verdictul și mediana vin de la setarea cu grilele reduse", () => {
  const f = FISA({ minNotional: 100, suma: 50 });   // 3 grile × 83 USDT < 100 ⇒ 2 grile
  const s = f.propusa === "deasa" ? f.deasa.setare : f.setare;
  assert.ok(f.setare.redus, "fixtura: grilele trebuie reduse (" + JSON.stringify(f.setare.redus) + ")");
  assert.equal(f.probaLa.reRulata, true); assert.equal(f.probaLa.grile, f.setare.grile);
  const f0 = FISA(), lat = f0.proba.latimi[f0.proba.pe.long.wi], pas = f.propusa === "deasa" ? f0.proba.pasi[0] : f0.proba.pasi[f0.proba.pe.long.pi];
  const asteptat = peFerestre(f, { lat, pas, levier: f.setare.levier, grile: f.setare.grile });
  assert.deepEqual(f.stat.antren, asteptat.antren);
  void s;
});

// ---------- (4) Monte Carlo: „Aș opri” cere simetric P + marja < 50 ----------
const GS = new Function("GridCalcul", "GridProba", "MonteSimbol", "globalThis", `${lib("grid-sim.js")}\n; return GridSim;`)(G, GP, {}, {});
const { categorie } = await import(new URL("./lib/tura-monte-carlo-bot.mjs", import.meta.url).href);
const OR = (pC, marja, o) => ({ zile: 7, pCastig: pC, pPierde: 1 - pC, pZero: 0, p50: pC > 0.5 ? 1.2 : -1.4, p5: -6, p95: 4, marja, zileDistincte: 20, pLich: 0, pStop: 0, plan: null, reluare: { media: -0.5, pPlus: 0.4, n: 40, independente: 6 }, ...o });
const REZ_MEU = (pC, marja) => ({ acum: { usdt: -0.3 }, orizonturi: [OR(0.5, 30, { deAici: { pCastig: pC, pPierde: 1 - pC, pZero: 0, p50: -1.4, p5: -6, p95: 4, marja } })] });
await test("(4) botul care rulează: câștigă în 40% dar ±28 de puncte (40 + 28 ≥ 50 ⇒ poate fi și peste 50%) ⇒ NU „Aș opri”, ci aruncare de ban; pe Discord nu pleacă „aș opri”", () => {
  const v = GS.verdict(REZ_MEU(0.40, 28), {}, null, 0, { profitNet: -0.3 });
  assert.ok(!/^Aș opri/.test(v.faCe), v.faCe);
  assert.match(v.faCe, /^O aruncare de ban de aici încolo/);
  assert.notEqual(categorie(v.faCe), "opreste");
  assert.notEqual(v.culoare, "bad");
});
await test("(4) botul care rulează: pierde în 70% cu ±10 puncte (30 + 10 < 50) ⇒ „Aș opri” rămâne, roșu", () => {
  const v = GS.verdict(REZ_MEU(0.30, 10), {}, null, 0, { profitNet: -0.3 });
  assert.match(v.faCe, /^Aș opri/); assert.equal(categorie(v.faCe), "opreste"); assert.equal(v.culoare, "bad");
});
await test("(4) botul nou: pierde în 58% cu ±20 de puncte ⇒ NU „N-aș porni”, ci aruncare de ban (nu s-a dovedit că pierde)", () => {
  const v = GS.verdict({ orizonturi: [OR(0.42, 20)] }, {}, null, 0, null);
  assert.ok(!/^N-aș porni/.test(v.faCe), v.faCe); assert.match(v.faCe, /^O aruncare de ban/);
  const v2 = GS.verdict({ orizonturi: [OR(0.30, 10)] }, {}, null, 0, null);
  assert.match(v2.faCe, /^N-aș porni/);
});

// ---------- (5) stopul din MAE: economia NETĂ, în eșantion, fără propunere la net ≤ 0 ----------
const Factori = new Function(`${lib("factori.js")}; return Factori;`)();
const ZI = 86400000, TZ = Date.UTC(2026, 0, 5);
function trade(i, rez, mae, cost) {
  const pc = 100, pv = 100 * (1 + rez), t0 = TZ + i * 10 * ZI, lo = 100 * (1 + mae), hi = Math.max(pc, pv) * 1.001;
  return { t: { ticker: "T" + i, id: i, simbol: "T" + i, pornit: t0 + 10 * 3600000, inchis: t0 + 2 * ZI + 10 * 3600000, pretCumparare: pc, pretVanzare: pv, cost: cost || 1000, rezultat: rez * (cost || 1000) },
    bare: [{ t: t0, o: 100, c: 100, l: lo, h: 100 }, { t: t0 + ZI, o: 100, c: 100, l: 100, h: hi }, { t: t0 + 2 * ZI, o: pv, c: pv, l: Math.min(pv, 100), h: hi }] };
}
const MAE = (lista) => { const tr = lista.map((x, i) => trade(i, x[0], x[1])), bare = {}; tr.forEach((x) => { bare[x.t.ticker] = x.bare; }); return Factori.maeMfe(tr.map((x) => x.t), bare, {}); };
// 12 câștigători +10% (3 coboară întâi la −8…−10%), pierzători mici (−8%, au atins −9%): stopul ~−6,7% ar fi tăiat 3 câștigători ⇒ net pe minus
const CASTIG = [[0.1, -0.10], [0.1, -0.09], [0.1, -0.08]].concat(Array.from({ length: 9 }, () => [0.1, -0.02]));
await test("(5) stopul din MAE: netul (pierderi salvate − câștiguri tăiate) ≤ 0 ⇒ nu se propune stopul", () => {
  const m = MAE(CASTIG.concat([[-0.08, -0.09], [-0.08, -0.09]]));
  assert.ok(m.stopCandidat < -0.06 && m.stopCandidat > -0.08, String(m.stopCandidat));
  assert.ok(m.costat > 0.4 && m.salvat < 0.05, m.costat + " / " + m.salvat);
  assert.ok(m.economieNeta <= 0, String(m.economieNeta));
  assert.equal(m.stopSugerat, null, "netul e pe minus: fără stop propus");
  assert.equal(m.inEsantion, true);
});
await test("(5) stopul din MAE: pierderi mari (−30%) ⇒ netul e pe plus, stopul se propune, cu banii salvați și cei tăiați", () => {
  const m = MAE(CASTIG.concat(Array.from({ length: 5 }, () => [-0.30, -0.35])));
  assert.ok(m.stopSugerat < 0 && m.economieNeta > 0, m.stopSugerat + " / " + m.economieNeta);
  assert.equal(m.taiatePierderi, 5); assert.equal(m.castigTaiat, 3);
  assert.ok(Math.abs(m.netBani - (m.salvatBani - m.costatBani)) < 1e-9 && m.netBani > 0, String(m.netBani));
});
await test("(5) pagina Contul întreg: textul spune netul și că e măsurat pe aceleași trade-uri; la net ≤ 0 nu propune stopul", () => {
  const vm = { TextRo: globalThis.TextRo }; const fnE = new Function("TextRo", citeste("public", "lib", "cont-ecran.js") + "; return ciHtml;")(globalThis.TextRo);
  const rap = (mm) => ({ la: Date.now(), valoare: { total: 30000, complet: true, lipsa: [] }, risc: {}, reconciliere: {}, randament: {}, maeMfe: mm });
  const bun = { n: 40, castig: 15, pierd: 25, maeCastig: -0.04, maePierd: -0.22, pierdDupaPlus5: 6, lasatPeMasa: 0.08, stopSugerat: -0.07, stopCandidat: -0.07, taiatePierderi: 14, castigTaiat: 3, economie: 0.12, salvat: 1.7, costat: 0.5, economieNeta: 1.2, salvatBani: 1700, costatBani: 500, netBani: 1200, inEsantion: true };
  const h = fnE(rap(bun), { acum: Date.now() });
  assert.match(h, /Un stop la −7,0% de la cumpărare ar fi păstrat 80 % din câștigători și ar fi tăiat mai devreme 14 pierderi/);
  assert.match(h, /3 câștigători/); assert.match(h, /net \+1\.200 lei/); assert.match(h, /pe aceleași trade-uri/);
  const rau = Object.assign({}, bun, { stopSugerat: null, economieNeta: -0.3, salvatBani: 200, costatBani: 500, netBani: -300 });
  const h2 = fnE(rap(rau), { acum: Date.now() });
  assert.ok(!/Ce aș face eu:<\/b> Un stop la/.test(h2), "net ≤ 0: nu se propune");
  assert.match(h2, /nu-l propun/);
  void vm;
});

// ---------- (6) banda: rezultatul pe net, Wilson 95%, „regula de până acum”, lecția pe orele afară fără întrerupere ----------
const Disc = new Function(`${lib("disciplina.js")}; return Disciplina;`)();
const ORA = 3600000, TB = Date.UTC(2026, 1, 2);
// botul A: long 95–105; afară 3 h, înapoi 2 h, afară 4 h ⇒ fără întrerupere cel mult 4 h, în total 7 h; brut +10%, net −5 USDT din 100 puși
const preturiA = [100, 100, 90, 90, 90, 100, 100, 90, 90, 90, 90].concat(Array.from({ length: 30 }, () => 100));
const bareA = preturiA.map((c, i) => ({ t: TB + i * ORA, o: c, h: c, l: c, c }));
const botA = { id: "A", moneda: "AAA", dir: "long", jos: 95, sus: 105, pornit: TB, inchis: TB + 20 * ORA, pct: 0.10, net: -5, pus: 100, investit: 100 };
await test("(6) banda: „Rezultatul net” pe net (net / pus, după comisioane și funding), nu pe realizatul brut", () => {
  const r = Disc.iesiriBanda([botA], () => bareA, {});
  const g = r.grupe.find((x) => x.n > 0);
  assert.equal(g.netMedian, -0.05, JSON.stringify(r.grupe));
});
await test("(6) lecția: orele afară FĂRĂ întrerupere (ca regula), nu suma pe viața botului", () => {
  const r = Disc.iesiriBanda([botA], () => bareA, {});
  assert.equal(r.oreAfaraPe.A, 4, "fără întrerupere: 4 h (în total 7 h)");
  const l = Disc.lectia({ de: TB, pana: TB + 7 * 24 * ORA, trades: [], boti: [{ id: "A", moneda: "AAA", inchis: botA.inchis, net: -5, oreAfara: r.oreAfaraPe.A }], usdLei: 4.4, regulaOre: 6 });
  assert.equal(l.toate, 0, "4 h fără întrerupere < pragul de 6 h ⇒ nu încalcă regula");
});
await test("(6) Wilson 95% lângă procentul de întoarceri (5 din 20 ⇒ 11–47%)", () => {
  const w = Disc.wilson(5, 20);
  assert.ok(Math.abs(w[0] - 0.1119) < 0.001 && Math.abs(w[1] - 0.4687) < 0.001, String(w));
  assert.equal(Disc.wilson(0, 0), null);
});
await test("(6) pagina: „regula de până acum (n cazuri, interval …)”, intervalul în tabel, fără „în medie” pe o mediană", () => {
  const fnD = new Function("TextRo", citeste("public", "lib", "cont-ecran.js") + "; return ciDisciplinaHtml;")(globalThis.TextRo);
  const x = { h: 6, n: 45, boti: 50, intoarse: 0.25, intoarseLo: 0.14, intoarseHi: 0.38, miscareImpotriva: -0.03, netMedian: -0.04 };
  const h = fnD({}, { tabel: [x], regula: x, grupe: [] }, []);
  assert.match(h, /[Rr]egula de până acum \(45 de cazuri, interval 95%: 14–38%\)/);
  assert.match(h, /25% \(14–38%\)/);
  assert.ok(!/în medie/.test(h), "„în medie” pe o mediană");
  assert.ok(!/Regula ta:/.test(h));
});

await test("(6) Discord, banda: intervalul Wilson și numărul de cazuri, mediana nu mai e „în medie”", async () => {
  const MC = await import(new URL("./lib/mesaje-colector.mjs", import.meta.url).href);
  const a = MC.afaraDinBanda("PLUME", 13.4, { h: 12, n: 45, intoarse: 0.25, intoarseLo: 0.14, intoarseHi: 0.38, miscareImpotriva: -0.005 });
  assert.match(a.mesaj, /doar 25% s-au mai întors în 24 h \(interval 95%: 14–38%, 45 de cazuri\)/);
  assert.ok(!/în medie/.test(a.mesaj), a.mesaj); assert.match(a.mesaj, /\(mediana\)/);
  assert.ok(a.mesaj.split("\n")[0].length <= 160, a.mesaj);
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? `, ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
