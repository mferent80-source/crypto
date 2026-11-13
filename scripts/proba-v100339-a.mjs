// Proba v100.339-a (auditul Tabloului botului din 13.11, valul A: semnale greșite). Fiecare test rulează modulul real al paginii.
// (A1) Monte Carlo pe botul care RULEAZĂ, dar pe care reluarea îl oprește pe stop / țintă: pragurile se socotesc de aici încolo, iar
//      „Reluarea arată…” (lichidat pe drumul real) nu mai e voce „contra botului”.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { p7DeNotat, pCastig7 } from "./lib/tura-monte-carlo-bot.mjs";
import { botDeProba } from "./lib/bot-de-proba.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
for (const f of ["grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js", "busola.js", "scenariu.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "conteaza.js", "consiliu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, GS = G.GridSim, Busola = G.Busola;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.339-a · auditul Tabloului: semnale greșite · proba\n");

// ---------------- (A1) Monte Carlo ----------------
// 12 zile de bare de 15 minute care oscilează în grid (0,988–1,012); `groapa` = barele pe care prețul stă la `fund` (sub țintă / peste stop)
const T0 = Date.UTC(2026, 9, 1), PORNIT = 900;
function bare(groapa, fund) {
  const b = []; let c = 1;
  for (let i = 0; i < 12 * 96; i++) { const o = c; c = groapa && i >= groapa[0] && i <= groapa[1] ? fund : 1 + 0.012 * Math.sin(i / 9); b.push({ t: T0 + i * 9e5, o, h: Math.max(o, c) * 1.0005, l: Math.min(o, c) * 0.9995, c, v: 1000 }); }
  return b;
}
const SHORT = { jos: 0.98, sus: 1.02, grile: 10, levier: 2, dir: "short", suma: 50, stop: { sus: 1.06 }, tp: 0.975, fundingZi: 0 };
const OPT = (x) => Object.assign({ n: 200, seed: 12, orizonturi: [1, 7], zile: 7, pornitLa: T0 + PORNIT * 9e5 + 60000, stPrefix: SHORT }, x || {});
const sub = bare([950, 960], 0.968);   // după pornire prețul coboară sub ținta 0,975, apoi revine în grid

await test("(A1a) premisa: cu pragurile botului pe drumul real, reluarea îl arată OPRIT", () => {
  const r = GS.simuleaza(sub, SHORT, OPT()); assert.equal(r.eroare, undefined); assert.equal(r.acum.oprit, "oprit"); assert.ok(!r.praguriDeAici);
});
await test("(A1b) botRuleaza: pe drumul real rămâne gridul, pragurile se socotesc de aici încolo ⇒ cifre adevărate, nu „0% / 0% / 100%”", () => {
  const r = GS.simuleaza(sub, SHORT, OPT({ botRuleaza: true })); assert.equal(r.eroare, undefined);
  assert.equal(r.praguriDeAici, true); assert.ok(!r.acum.oprit, "tot oprit: " + r.acum.oprit);
  const o7 = r.orizonturi[r.orizonturi.length - 1]; assert.ok(o7.deAici.pCastig + o7.deAici.pPierde > 0.5, "drumurile stau pe loc: " + JSON.stringify([o7.deAici.pCastig, o7.deAici.pPierde, o7.deAici.pZero]));
  const v = GS.verdictScurt(r, SHORT, null, null); assert.doesNotMatch(v.text, /Reluarea arată/); assert.match(v.text, /CÂȘTIGĂ în \d+% din drumuri/);
  assert.ok(o7.pTp + o7.pStop > 0, "pragurile nu se mai aplică deloc de aici încolo");
});
await test("(A1c) botul neoprit pe drumul real: botRuleaza nu schimbă nimic (aceleași cifre, fără steag)", () => {
  const b = bare(null), a = GS.simuleaza(b, SHORT, OPT()), c = GS.simuleaza(b, SHORT, OPT({ botRuleaza: true }));
  assert.equal(a.acum.oprit, null); assert.ok(!c.praguriDeAici); assert.equal(c.orizonturi[1].p50, a.orizonturi[1].p50); assert.equal(c.orizonturi[1].deAici.pCastig, a.orizonturi[1].deAici.pCastig);
});
await test("(A1d) lichidat pe drumul real: rămâne „Reluarea arată botul LICHIDAT”, dar ca informație (stare info), nu ca „rău”", () => {
  const sus = bare([950, 960], 1.2), st = Object.assign({}, SHORT, { levier: 20, stop: null, tp: null });
  const r = GS.simuleaza(sus, st, OPT({ botRuleaza: true, stPrefix: st })); assert.equal(r.acum.oprit, "lichidat"); assert.ok(!r.praguriDeAici);
  const v = GS.verdictScurt(r, st, null, null); assert.match(v.text, /«Reluarea arată botul LICHIDAT pe drumul real»/); assert.equal(v.stare, "info");
});
await test("(A1e) oprit pe drumul real fără botRuleaza (Simulatorul, unde omul își verifică setările): textul rămâne, starea e info", () => {
  const v = GS.verdictScurt(GS.simuleaza(sub, SHORT, OPT()), SHORT, null, null); assert.match(v.text, /«Reluarea arată botul OPRIT pe drumul real»/); assert.equal(v.stare, "info");
});
await test("(A1h) pragul e depășit și ACUM (stop 1,06 cu prețul la 1,07; oglinda la long; stopul mutat dincoace de prețul de acum; stopul în procente): a doua trecere nu inventează „CÂȘTIGĂ în 100% · stopul atins 100%” / „PIERDE în 100%” - rămâne „Reluarea arată…”, ca informație", () => {
  const LONG = Object.assign({}, SHORT, { dir: "long", stop: { jos: 0.94 }, tp: 1.025 });
  const cazuri = [[bare([950, 12 * 96], 1.07), SHORT, "short"], [bare([950, 12 * 96], 0.93), LONG, "long"], [bare(null), Object.assign({}, SHORT, { stop: { sus: 0.995 }, tp: null }), "stop mutat"],
    [bare([950, 12 * 96], 1.07), Object.assign({}, SHORT, { stop: null, tp: null, stopRaport: -0.05 }), "stop în procente"]];
  for (const [b, st, ce] of cazuri) {
    const r = GS.simuleaza(b, st, OPT({ botRuleaza: true, stPrefix: st })); assert.equal(r.eroare, undefined, ce); assert.equal(r.acum.oprit, "oprit", ce); assert.ok(!r.praguriDeAici, ce + ": a doua trecere a rămas");
    const v = GS.verdictScurt(r, st, null, null); assert.equal(v.stare, "info", ce); assert.match(v.text, /«Reluarea arată botul OPRIT pe drumul real»/, ce); assert.doesNotMatch(v.text, /CÂȘTIGĂ|PIERDE|stopul atins/, ce + ": " + v.text);
  }
});
await test("(A1i) oglinzile: STOPUL (nu doar ținta) atins pe drumul real și prețul întors în grid, la short și la long ⇒ cifre de aici încolo, cu stopul aplicat din nou", () => {
  const LONG = Object.assign({}, SHORT, { dir: "long", stop: { jos: 0.94 }, tp: 1.025 });
  for (const [b, st, ce] of [[bare([950, 960], 1.07), SHORT, "short"], [bare([950, 960], 0.93), LONG, "long"], [bare([950, 960], 1.032), LONG, "long, ținta"]]) {
    const r = GS.simuleaza(b, st, OPT({ botRuleaza: true, stPrefix: st })); assert.equal(r.eroare, undefined, ce); assert.equal(r.praguriDeAici, true, ce); assert.ok(!r.acum.oprit, ce);
    const o7 = r.orizonturi[r.orizonturi.length - 1]; assert.ok(o7.deAici.pCastig + o7.deAici.pPierde > 0.5, ce + ": drumurile stau pe loc");
    assert.ok(o7.pStop > 0 && o7.pStop < 1, ce + ": stopul de aici încolo " + o7.pStop); assert.ok(r.opritImediat < 0.5, ce + ": oprite la prima bară " + r.opritImediat);
  }
});
await test("(A1j) reluarea oprită sau lichidată: textul nu mai poartă „CÂȘTIGĂ în 0% · PIERDE în 0% · pe zero 100%”, nici „pe o zi”, nici funding-ul unor drumuri care stau pe loc", () => {
  const st = Object.assign({}, SHORT, { levier: 20, stop: null, tp: null });
  const vL = GS.verdictScurt(GS.simuleaza(bare([950, 960], 1.2), st, OPT({ botRuleaza: true, stPrefix: st })), st, null, null), vO = GS.verdictScurt(GS.simuleaza(sub, SHORT, OPT()), SHORT, null, null);
  for (const v of [vL, vO]) { assert.doesNotMatch(v.text, /CÂȘTIGĂ|PIERDE|pe zero|pe o zi|funding/, v.text); assert.match(v.text, /^de aici încolo, 7 zile: fără procente - drumurile simulate stau pe loc · «Reluarea arată botul (OPRIT|LICHIDAT) pe drumul real»$/, v.text); }
  // botul care NU e oprit pe drumul real își păstrează procentele și rândul pe o zi
  assert.match(GS.verdictScurt(GS.simuleaza(bare(null), SHORT, OPT()), SHORT, null, null).text, /CÂȘTIGĂ în \d+% din drumuri.*pe o zi: CÂȘTIGĂ/);
});
await test("(A1f) vocile de sub verdict: Monte Carlo „info” nu mai e „contra botului”; „rau” adevărat rămâne contra", () => {
  const f = Busola.concluzie({ bot: "short", grafic: "lateral", busola: null, mc: "info" }); assert.ok(!f || !/contra botului|Monte Carlo/.test(f.text), f && f.text);
  assert.match(Busola.concluzie({ bot: "short", grafic: "lateral", busola: null, mc: "rau" }).text, /Monte Carlo spune: contra botului tău \(short\)/);
});
await test("(A1g) jurnalul de scor: reluarea care oprește botul și verdictul cu pragurile de aici încolo NU se notează (înainte: șansă 0%)", () => {
  const oprit = GS.simuleaza(sub, SHORT, OPT()); assert.equal(pCastig7(oprit), 0, "premisa: reluarea oprită dă șansa 0"); assert.equal(p7DeNotat(oprit), null);
  assert.equal(p7DeNotat(GS.simuleaza(sub, SHORT, OPT({ botRuleaza: true }))), null);
  const bun = p7DeNotat(GS.simuleaza(bare(null), SHORT, OPT())); assert.ok(bun >= 0 && bun <= 1, String(bun));
});

// ---------------- (A2) stopul propus nu stă de partea greșită a prețului de acum; (A3) stopul la zero nu se propune prematur ----------------
const TE = G.TabloExtra, SB = G.SemnaleBot, Sfaturi = G.Sfaturi, Consiliu = G.Consiliu, ACUM = Date.UTC(2026, 10, 13, 12), ORA = 3600000;
// tot ce vede omul pe cartela Stopul și în Consilier, din modulele paginii
function ecran(b, o) {
  o = o || {}; const z = TE.dacaInchizi(b), cost = TE.grileVsCosturi(b, ACUM), fisa = o.fisa || null;
  const sf = Sfaturi.sfaturi(Sfaturi.intrare({ bot: b, fisa, acum: ACUM }));
  const sm = SB.semafor({ bot: b, fisa, zero: z, plan: null, costuri: cost, muta: SB.mutaGridul(b, fisa, 0, null), iaProfit: SB.iaProfit(b, fisa) });
  const conc = SB.acumConcret({ bot: b, fisa, zero: z, costuri: cost, plan: null, acum: ACUM, pragStop: o.pragStop || null, cifre: (pr) => TE.cifreActiuni(b, { protectie: pr }) });
  const cons = Consiliu.alcatuieste({ sm, concret: conc, sfaturi: sf, laJos: TE.totalCuGridLa(b, b.gridJos), jos: b.gridJos, laSus: TE.totalCuGridLa(b, b.gridSus), sus: b.gridSus, opritor: SB.pretStopEcran(b), opritorProc: SB.etichetaStopProc(b) });
  const st = conc.filter((c) => c.cod === "stop")[0];
  return { st, cons, sf, tot: [st.act, st.deCe, st.text, st.bani, cons.faCe, cons.bani, cons.titlu].concat(sf.map((s) => s.faCe)).filter(Boolean).join(" ¦ ") };
}
// prețurile scrise în text ca „la 76.4903” / „la 64.4882”
const preturiDin = (t) => (String(t).match(/\bla (\d+[.,]\d+)/g) || []).map((m) => Number(m.replace(/^la /, "").replace(",", ".")));

await test("(A2a) short, prețul ieșit PESTE grid, fără stop, fără fișă și fără profil: niciun stop propus sub prețul de acum și nicio cifră de bani pe el", () => {
  const b = botDeProba("short", 76, 77.5), e = ecran(b); assert.equal(b.pretCurent, 77.5); assert.ok(b.profitTotal < -10, "premisa: pe minus mare " + b.profitTotal);
  assert.ok(e.st.pretPropus == null, "stop propus " + e.st.pretPropus + " sub prețul 77,5");
  const rele = preturiDin(e.st.act + " " + e.cons.faCe).filter((x) => x > 70 && x <= 77.5); assert.deepEqual(rele, [], "preț de stop de partea greșită: " + rele + " în „" + e.st.act + "” / „" + e.cons.faCe + "”");
  assert.doesNotMatch(String(e.cons.bani) + String(e.st.bani), /cu (cel propus|stopul planului|stopul propus)/); assert.match(e.st.act, /prețul de acum/);
});
await test("(A2b) oglinda la long: prețul SUB grid ⇒ niciun stop propus peste prețul de acum", () => {
  const b = botDeProba("long", 65, 63.5), e = ecran(b); assert.ok(e.st.pretPropus == null, String(e.st.pretPropus));
  const rele = preturiDin(e.st.act + " " + e.cons.faCe).filter((x) => x >= 63.5 && x < 70); assert.deepEqual(rele, [], e.st.act + " / " + e.cons.faCe); assert.match(e.st.act, /prețul de acum/);
});
await test("(A2c) control: prețul ÎN grid ⇒ stopul propus rămâne la o grilă peste margine; cu profilul sosit, dincolo de o zi obișnuită", () => {
  const e = ecran(botDeProba("short", 75, 75.3)); assert.ok(e.st.pretPropus > 76 && e.st.pretPropus < 77, String(e.st.pretPropus)); assert.match(e.st.act, /peste gridul de sus, la 76[.,]5/);
  const cuProfil = ecran(botDeProba("short", 76, 77.5), { pragStop: { dist: 0.05, sursa: "profilul monedei" } }); assert.ok(Math.abs(cuProfil.st.pretPropus - 77.5 * 1.05) < 1e-6, String(cuProfil.st.pretPropus));
});
await test("(A3a) bot de 20 de minute, plus mic, zero-ul la sub o grilă de preț: nu se propune stopul la zero (ar închide botul la prima oscilație)", () => {
  const b = botDeProba("short", 70.5, 70.45, { pornitLa: ACUM - 20 * 60000 }), e = ecran(b); assert.ok(b.profitTotal > 0 && b.profitTotal < 0.02 * b.investit, "premisa: plus mic " + b.profitTotal);
  assert.doesNotMatch(e.tot, /(muta|pun|pune) stopul la (zero|\d)/, e.tot.slice(0, 600)); assert.match(e.tot, /l-ar închide la prima oscilație/); assert.ok(e.st.pretPropus == null, String(e.st.pretPropus));
});
await test("(A3b) control: bot de 5 ore, plus de peste 1% din bani, zero-ul la peste două grile ⇒ stopul la zero se propune ca înainte", () => {
  const b = botDeProba("short", 67, 67), e = ecran(b); assert.ok(b.profitTotal >= 0.01 * b.investit, "premisa: plus " + b.profitTotal);
  assert.match(e.tot, /stopul la (zero-ul botului|\d)/, e.tot.slice(0, 600));
});

await test("(A3c) gărzile stopului la zero, una câte una (fiecare singură oprește propunerea; cu toate trecute, se propune)", () => {
  const b = botDeProba("short", 67, 67), departe = b.pretCurent * 1.05;
  assert.equal(SB.stopLaZeroPrematur(b, departe, ACUM), null, "bot de 5 ore, plus peste 1%, zero-ul departe");
  assert.equal(SB.stopLaZeroPrematur(Object.assign({}, b, { pornitLa: ACUM - 20 * 60000 }), departe, ACUM), "botul are sub o oră");
  assert.equal(SB.stopLaZeroPrematur(Object.assign({}, b, { profitTotal: 0.005 * b.investit }), departe, ACUM), "plusul e sub 1% din bani");
  assert.equal(SB.stopLaZeroPrematur(b, b.pretCurent * 1.001, ACUM), "zero-ul e la sub o grilă de preț");
  assert.equal(SB.stopLaZeroPrematur(Object.assign({}, b, { profitTotal: 0.0101 * b.investit }), departe, ACUM), null, "chiar peste 1%");
  assert.equal(SB.stopLaZeroPrematur(Object.assign({}, b, { pornitLa: ACUM - 61 * 60000 }), departe, ACUM), null, "chiar peste o oră");
});
await test("(A2d) rândul de acțiune al stopului când prețul a trecut de marginea gridului: cel mult 110 caractere, la short și la long", () => {
  for (const [dir, pg, p, parte] of [["short", 76, 77.5, "peste"], ["long", 65, 63.5, "sub"]]) {
    const e = ecran(botDeProba(dir, pg, p)); assert.ok(e.st && e.st.act, dir + ": fără cartela stopului");
    assert.match(e.st.act, new RegExp("stopul s-ar pune " + parte + " prețul de acum"), e.st.act); assert.ok(e.st.act.length <= 110, dir + ": " + e.st.act.length + " caractere: " + e.st.act);
  }
});

// ---------------- (A5) rândul Range Filter din Tablou ----------------
const APP = citeste("public", "app.js");
function randRf(citire, dirBot) {
  const i0 = APP.indexOf("var tbRfStare={"), i1 = APP.indexOf("function tbCitireExtra(b,o){"); assert.ok(i0 > 0 && i1 > i0);
  const c = { TextRo: G.TextRo, Date, Math, String, Number, console, TabloBot: { simboluri: (baza) => ({ pionex: baza + "_USDT_PERP", moneda: baza }) }, RangeFilter: { MIN_EP: 20, citire: () => citire } };
  vm.createContext(c); vm.runInContext(APP.slice(i0, i1), c);
  const t = Date.UTC(2026, 10, 13, 18, 0); c.tbRfStare.cheie = "XYZ_USDT_PERP"; c.tbRfStare.bare = Array.from({ length: 150 }, (_, i) => ({ t: t - (149 - i) * 3600000, o: 1, h: 1, l: 1, c: 1 })); c.tbRfStare.la = Date.now(); c.tbRfStare.ok = true; c.tbRfStare.urm = Date.now() + 3600000;
  return { r: c.tbRangeFilterRand({ baza: "XYZ", quote: "USDT", directie: dirBot }), ora: new Date(t).toTimeString().slice(0, 5) };
}
const CIT = (o) => Object.assign({ dir: -1, bareDir: 8, semnal: { fel: "SELL", acum: 8 }, semnalAcum: false, regim: { cons: false }, dovada: { n: 12, k: 3, hit: 25, dovedit: false }, distPct: 0.004, costNu: true, cost: 0.003, flipAtr: 1.8 }, o || {});
await test("(A5a) fără semnal pe bara închisă: nu scrie „NU TRECE”, ci doar că filtrul e sub pragul de cost; nu mai scrie „stop (filtru)”", () => {
  const { r } = randRf(CIT(), "LONG"); assert.doesNotMatch(r.text, /NU TRECE/); assert.match(r.text, /filtrul e la 0,4% de preț \(sub pragul de 2× cost, 0,60%\)/); assert.doesNotMatch(r.text, /stop \(filtru\)/);
});
await test("(A5b) cu semnal pe ultima bară închisă și stopul sub prag: „NU TRECE”", () => {
  const { r } = randRf(CIT({ semnal: { fel: "SELL", acum: 0 }, semnalAcum: true }), "LONG"); assert.match(r.text, /filtrul e la 0,4% de preț ⇒ NU TRECE \(sub prag 0,60%\)/);
});
await test("(A5c) „nedovedit” se spune și când filtrul e CU botul, nu doar la CONTRA; rândul poartă ora barei închise", () => {
  const cu = randRf(CIT(), "SHORT"), contra = randRf(CIT(), "LONG");
  assert.doesNotMatch(cu.r.text, /CONTRA/); assert.match(cu.r.text, /direcția filtrului: nedovedită/); assert.match(contra.r.text, /CONTRA botului/); assert.match(contra.r.text, /direcția filtrului: nedovedită/);
  assert.ok(cu.r.text.includes("bara de la " + cu.ora), cu.r.text); assert.equal(cu.r.stare, "info");
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
