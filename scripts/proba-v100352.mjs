// Proba v100.352 (17.11.2026, el: „refă audit pe tot ce s-a lucrat cu toate skilurile” ⇒ raportul ⇒ „fa tot”): reparațiile auditului v100.351.
//   🔴 planul ⇒ „îl închid” (nu „stopul la plan”) · stopul botului nou fără câmpuri null · neutrul cu stopurile mutate · fișa în eșantion (arătată, nu aleasă)
//   · prețurile cu precizia gridului · judecata fără găuri · nota = ce s-a afișat · … (pe valuri, în același fișier)
//   node scripts/proba-v100352.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const MonteSimbol = new Function(`${lib("monte-simbol.js")}; return MonteSimbol;`)();
const GS = new Function("GridCalcul", "GridProba", "MonteSimbol", "globalThis", `${lib("grid-sim.js")}; return GridSim;`)(GridCalcul, GridProba, MonteSimbol, {});
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function bare(zile, P0, s, seed, f) { const r = mulberry(seed), out = [], T0 = Date.UTC(2026, 9, 1); let p = P0; for (let i = 0; i < zile * 96; i++) { const o = p; p = p * Math.exp(s * (r() * 2 - 1)); if (f) p = f(i, p); out.push({ t: T0 + i * 9e5, o, h: Math.max(o, p) * (1 + s * r() * 0.3), l: Math.min(o, p) * (1 - s * r() * 0.3), c: p, v: 1 }); } return out; }
console.log("\nV100.352 · reparațiile auditului v100.351 · proba\n");

const B = bare(31, 1.0, 0.004, 31), N = B.length, P = B[N - 1].c;
// long 20× deja pe plus, cu planul −5 de la pornire: coada lui „îl țin” trece de plan
const LONG = { jos: P * 0.9, sus: P * 1.04, grile: 20, levier: 20, dir: "long", suma: 50, stop: { jos: P * 0.85 }, tip: "aritmetic", fundingZi: 0, fundingCost: false };
const O = { pornitLa: B[N - 200].t, n: 300, seed: 12, orizonturi: [1, 7], plan: { minus: 5, plus: 40 } };

await test("🔑 E1 (🔴 auditul) coada de la pornire trece de planul tău ⇒ „îl închid” (alegerea ta), NICIODATĂ „stopul la plan” ca recomandare; rândul planului rămâne în tabel", () => {
  const h = GS.hotarare(B, LONG, O); assert.ok(!h.eroare, h.eroare);
  assert.equal(h.ales.cheie, "inchide", "ales: " + h.ales.cheie + " — " + h.ales.motiv); assert.ok(h.ales.plan && /planul tău zice −5,0 USDT: închide-l/.test(h.ales.motiv), h.ales.motiv);
  assert.ok(h.actiuni.some((a) => a.cheie === "plan"), "rândul „stopul la planul tău” rămâne ca variantă");
  for (const m of [1, 3, 5, 8, 12, 20]) { const x = GS.hotarare(B, LONG, Object.assign({}, O, { plan: { minus: m, plus: 40 }, n: 150 })); assert.notEqual(x.ales.cheie, "plan", "planul −" + m + " ⇒ " + x.ales.cheie); }
  const g = lib("grid-sim.js"); assert.ok(/if \(ales\.cheie !== "inchide" && o\.plan/.test(g), "verificarea planului la ORICE ales, nu doar la „îl țin”");
});
await test("🔑 E2 (auditul) „îl închid și pornesc unul la fel” la un long cu stop pe preț și fără TP: stopul nou fără câmpul „sus” (null era citit ca stop la 0 ⇒ ieșit la prima bară)", () => {
  // v100.354: la 20× stopul la −15% stă dincolo de lichidare (~−8%) ⇒ rândul e scos acum (garda lichidării); scenariul de aici: același bot la 3×
  const h = GS.hotarare(B, Object.assign({}, LONG, { levier: 3 }), Object.assign({}, O, { plan: null })), r = h.actiuni.find((a) => a.cheie === "reporneste");
  assert.ok(r && !r.eroare, r && r.eroare); assert.deepEqual(Object.keys(r.nou.stop), ["jos"]);
  assert.ok(r.oriz[1].pStop < 0.9, "stopul atins pe " + r.oriz[1].pStop); assert.ok(r.oriz[1].p5 < r.oriz[1].p50 - 0.5, "coada nu mai e o singură valoare");
  // garda în motor: un câmp null / 0 nu e stop
  const bot = { jos: P * 0.9, sus: P * 1.04, grile: 20, levier: 3, dir: "long", suma: 50, tip: "aritmetic" };
  const a = GridProba.simuleaza(B.slice(-200), 0, 200, Object.assign({}, bot, { stop: { jos: P * 0.5, sus: null } })), b = GridProba.simuleaza(B.slice(-200), 0, 200, Object.assign({}, bot, { stop: { jos: P * 0.5 } }));
  assert.equal(a.net, b.net); assert.ok(!(a.oprit && a.bare <= 1));
});
await test("E3 (auditul) neutrul: și stopurile mutate (la margini / mai largi, pe ambele părți); TP-ul pe preț nu există la neutru", () => {
  const NE = { jos: P * 0.95, sus: P * 1.05, grile: 20, levier: 3, dir: "neutru", suma: 50, stop: { jos: P * 0.9, sus: P * 1.1 }, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const h = GS.hotarare(B, NE, Object.assign({}, O, { plan: null })); assert.ok(!h.eroare, h.eroare);
  const k = h.actiuni.map((a) => a.cheie); for (const c of ["tine", "inchide", "stopMargine", "stopLarg", "reporneste"]) assert.ok(k.includes(c), "lipsește " + c);
  const sl = h.actiuni.find((a) => a.cheie === "stopLarg"); assert.ok(sl.st.stop.jos < NE.stop.jos && sl.st.stop.sus > NE.stop.sus);
});
await test("E4 (auditul) fișa Grid: rândul se arată, dar e ales pe aceeași lună ⇒ nu poate fi recomandat; „unul la fel” e mereu acolo (ca în colector)", () => {
  const fisa = { jos: P * 0.97, sus: P * 1.06, grile: 30, levier: 2, dir: "long", suma: 50, tip: "aritmetic", stop: { jos: P * 0.94 } };
  const h = GS.hotarare(B, LONG, Object.assign({}, O, { plan: null, fisa })), f = h.actiuni.find((a) => a.cheie === "reportFisa");
  assert.ok(f && f.inEsantion); assert.ok(h.actiuni.some((a) => a.cheie === "reporneste"));
  const R = GS.alegeHotarare([{ cheie: "tine", oriz: [null, { media: -0.5, p5: -10, dif: null }] }, { cheie: "reportFisa", inEsantion: true, oriz: [null, { media: 9, p5: -5, dif: { media: 9.5, marja: 1, maiBun: 0.9, maiRau: 0.1, egal: 0 } }] }], { prag: 1, oriz: 1 });
  assert.equal(R.cheie, "tine");
});
await test("E5 (auditul) prețurile din numele acțiunilor cu precizia gridului: „1,4485”, nu „1,45” (altfel „stopul (1,45) sub prețul (1,45)”)", () => {
  assert.equal(GS.pretH(1.4485, (1.45 - 1.325) / 30), "1,4485"); assert.equal(GS.pretH(1.45, (1.45 - 1.325) / 30), "1,45"); assert.equal(GS.pretH(95123.4, 50), "95.123,40");
});
await test("🔑 E6 (auditul) judecata pe barele reale: o gaură în fereastră (cache-ul colectorului) ⇒ eroare pe nume, nu un rezultat pe 7,8 zile", () => {
  const BL = bare(39, 1.0, 0.004, 33), ND = 31 * 96, BD = BL.slice(0, ND);
  const bot = Object.assign({}, LONG, { levier: 3, jos: BD[ND - 1].c * 0.9, sus: BD[ND - 1].c * 1.04, stop: { jos: BD[ND - 1].c * 0.85 } });
  const h = GS.hotarare(BD, bot, { pornitLa: BD[ND - 200].t, n: 100 }), nota = GS.notaHotarare(h, bot, { pornitLa: BD[ND - 200].t }, BD, 1);
  const bun = GS.judecaHotarare(BL, nota, 7); assert.ok(!bun.eroare && !bun.asteapta, JSON.stringify(bun));
  const cuGaura = BL.slice(0, ND + 200).concat(BL.slice(ND + 280)); const r = GS.judecaHotarare(cuGaura, nota, 7);
  assert.ok(r.eroare && /gaură de 20,3 h/.test(r.eroare), JSON.stringify(r).slice(0, 200));
  const v = GS.judecaVerdict(cuGaura, { tUrm: BD[ND - 1].t + 9e5, st: bot }); assert.ok(v.eroare && /gaură/.test(v.eroare), JSON.stringify(v));
  const vechi = GS.judecaHotarare(BL.slice(ND - 150), nota, 7); assert.ok(vechi.vechi && /Pionex dă cam 31 de zile/.test(vechi.eroare), "motivul pe nume la boții vechi");
});
await test("E7 (auditul) nota zilei înregistrează ce s-a AFIȘAT (recomandarea confirmată), candidatul separat și versiunea regulii", () => {
  const h = GS.hotarare(B, LONG, Object.assign({}, O, { plan: null })), n1 = GS.notaHotarare(h, LONG, { pornitLa: O.pornitLa, afisat: "tine" }, B, 5);
  assert.equal(n1.ales, "tine"); assert.equal(n1.cand, h.ales.cheie); assert.equal(n1.v, GS.VERS_HOT); assert.ok(GS.VERS_HOT >= 2);
});

// ── colectorul: Discord, nota, bilanțul ──────────────────────────────────────────────────────────────────────────────────────────────────────
const TMC = await import("./lib/tura-monte-carlo-bot.mjs"), TSU = await import("./lib/tura-sim-urmarire.mjs");
const hFals = (ch) => ({ ales: { cheie: ch, motiv: "m" }, actiuni: [{ cheie: ch, nume: "N-" + ch }] });
await test("🔑 E8 (auditul) Discord: pauza 2 h (ca verdictul MC), întoarcerea la ORICARE din ultimele 3 recomandări în 6 h cere 4 socotiri, cel mult 4 anunțuri pe bot pe zi", () => {
  assert.equal(TMC.PAUZA_HOT_MS, 2 * 3600000); const H = 3600000, T0 = Date.UTC(2026, 10, 17, 0);   // o zi UTC întreagă (plafonul e pe zi)
  let p = TMC.pasHotarare(null, hFals("tine"), T0, "B").hot, anunt = [];
  const pas = (ch, t) => { const r = TMC.pasHotarare(p, hFals(ch), t, "B"); if (r.anunt) { anunt.push(ch); p = r.dupaAnunt; } else p = r.hot; return !!r.anunt; };
  // un ciclu tine → tpAproape → stopLarg → tine, o schimbare pe oră: pe 3 chei ocolea histerezisul pe una (23 de anunțuri în 24 h la audit)
  const ciclu = ["tpAproape", "tpAproape", "stopLarg", "stopLarg", "tine", "tine"]; let t = T0;
  for (let i = 0; i < 46; i++) { t += 30 * 60000; pas(ciclu[Math.floor(i / 2) % 6], t); }
  assert.ok(anunt.length <= 4, "anunțuri în ziua asta: " + anunt.length + " " + anunt.join(","));
  // pauza: anunțat acum o oră și jumătate ⇒ o schimbare confirmată tot așteaptă
  p = { cheie: "tine", nume: "x", la: T0, anuntatLa: T0, candidat: null, candidatN: 0 }; assert.equal(pas("inchide", T0 + 1.5 * H), false); assert.equal(pas("inchide", T0 + 1.6 * H), false); assert.equal(pas("inchide", T0 + 2.1 * H), true);
  const MC = citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"); assert.ok(/\? "hotplan-" : "hot-"\)/.test(MC), "„îl închid” pe planul tău cu cheia lui (pleacă și noaptea)");
  assert.ok(/\[\/\^hot-\/, "hot"\]/.test(citeste("scripts", "lib", "politica-alerte.mjs")), "restul „Ce fac cu botul” așteaptă dimineața");
});
await test("🔑 E9 (auditul) tura MC: nota zilei = recomandarea AFIȘATĂ (hot.cheie), candidatul separat; bucla cedează după fiecare hotărâre", async () => {
  const BL = bare(32, 1.0, 0.004, 35), ND = 31 * 96, BD = BL.slice(0, ND), PD = BD[ND - 1].c;
  const bot = { id: 5, activ: true, baza: "TST", gridJos: PD * 0.93, gridSus: PD * 1.03, brut: { buOrderData: { row: 15, gridType: "arithmetic" } }, levier: 3, directie: "short", investit: 80, pornitLa: BD[ND - 150].t, opritorPierdereActiv: true, opritorPierdere: PD * 1.08, pretCurent: PD };
  const stare = { boti: { "5": { cat: "tine", text: "x", la: 1, ultima: 1, hot: { cheie: "tine", nume: "îl țin așa", la: 1, ultima: 1, anuntatLa: 0 } } } };
  const out = await TMC.turaMonteCarloBot({ boti: [bot], GridSim: GS, GridCalcul, stare, randuri15: async () => BD.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v]), anunta: async () => true, acum: BD[ND - 1].t + 9e5, n: 150, nHot: 150 });
  assert.equal(out.hotNote.length, 1); const n = out.hotNote[0].nota; assert.equal(n.ales, stare.boti["5"].hot.cheie); assert.ok(n.cand && n.v === GS.VERS_HOT);
  assert.ok(/await new Promise\(\(r\) => setImmediate\(r\)\)/.test(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs")));
  assert.equal(TMC.VERS_HOT, GS.VERS_HOT, "versiunea regulii aceeași în motor și în bilanț");
});
await test("E10 (auditul) bilanțul hotărârilor: doar regula de acum (v), pe un bot note la ≥ 7 zile una de alta, sub 30 ⇒ „prea puține”; boții prea vechi pe nume", () => {
  const z = (t, id, v, y7) => ({ id, sim: "X", z: "z" + t, nota: { t, tUrm: t, v, ales: "tine" }, y1: null, y7 });
  const V = GS.VERS_HOT;   // v100.354: regula de acum din motor (3), nu scrisă de mână
  const D = 86400000, j = [z(0, "a", undefined, { val: { tine: 1, inchide: 0 } }), z(1 * D, "a", V, { val: { tine: 1, inchide: 0 } }), z(3 * D, "a", V, { val: { tine: -1, inchide: 0 } }), z(9 * D, "a", V, { val: { tine: 2, inchide: 0 } }), z(2 * D, "b", V, { eroare: "botul era pornit de prea mult: Pionex dă cam 31 de zile" })];
  const r = TMC.raportHotarari(j); assert.equal(r.altaRegula, 1); assert.equal(r.j7, 2); assert.equal(r.suprapuse, 1); assert.equal(r.vechi, 1);
  assert.ok(/sub 30 de hotărâri independente/.test(r.text) && /1 bot prea vechi/.test(r.text) && /regula de dinainte/.test(r.text), r.text);
});
await test("E11 (auditul) ruta simNota: nota proaspătă (t în ultimele 10 minute, ultima bară cu cel mult 2 h înainte), limite pe cifre, peCheie, id cu amprenta, versiunea", () => {
  const src = citeste("functions", "api", "istoric-bot.js");
  assert.ok(/t<Date\.now\(\)-600000/.test(src) && /tUrm<t-7200000/.test(src) && /Math\.abs\(media\)>1e6/.test(src) && /Math\.abs\(fz\)>0\.05/.test(src));
  assert.ok(/return peCheie\("kv:sim:note",async\(\)=>/.test(src) && /"-"\+hk\.toString\(36\)/.test(src) && /v:vN\}/.test(src));
  assert.ok(/candidat:HOT\.includes\(x\.hot\.candidat\)/.test(src), "Tabloul primește și schimbarea în așteptare");
});
await test("🔑 E12 (auditul) urmărirea Simulatorului: cel mult 3 monede noi pe tură, coada se rotește (notele fără rezultat nu blochează), o notă pe monedă pe zi, doar versiunea de acum", async () => {
  const T = Date.UTC(2026, 10, 1), st = { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: null, tp: null, tip: "aritmetic" };
  const note = []; for (let i = 0; i < 20; i++) note.push({ id: "N" + i, sim: "S" + (i % 6) + "_USDT_PERP", t: T, tUrm: T, st, p: 0.5, media: 0, fel: "alt", v: 2 });
  let cereri = 0; const stare = {}, d = { acum: T + 8 * 86400000, pauza: 0, cere: async () => ({ note }), trimite: async () => {}, GridSim: { judecaVerdict: () => ({ asteapta: true }) }, GridCalcul: { bare: (x) => x }, randuri15: async () => { cereri++; return []; } };
  await TSU.turaSimUrmarire(d, stare); assert.ok(cereri <= 3, "monede aduse: " + cereri);
  const prima = Object.keys(stare.incercat); d.acum += 3600001; cereri = 0; await TSU.turaSimUrmarire(d, stare);
  assert.ok(Object.keys(stare.incercat).some((k) => !prima.includes(k)), "a doua tură încearcă și alte note");
  const r = TSU.raportSim([{ sim: "A", z: "1", t: 1, v: 2, p: 0.6, val: 1 }, { sim: "A", z: "1", t: 2, v: 2, p: 0.6, val: 1 }, { sim: "B", z: "1", t: 3, v: 1, p: 0.6, val: 1 }]);
  assert.equal(r.n, 1); assert.equal(TSU.VERS_SIM, GS.VERS_SIM);
});
// ── pagina Monte Carlo pe aceleași drumuri ──────────────────────────────────────────────────────────────────────────────────────────────────
await test("🔑 E13 (auditul) cardul MC și tabelele de sub el pe ACELEAȘI drumuri: MonteSimbol.grid are agitația (stingerea 0,6, aleasă pe barele reale), ca Simulatorul", () => {
  assert.equal(MonteSimbol.STINGERE, 0.6);
  const Bz = bare(31, 1.0, 0.002, 41, (i, p) => p * (i >= 29 * 96 ? Math.exp(0.006 * (Math.sin(i) > 0 ? 1 : -1)) : 1)), Pz = Bz[Bz.length - 1].c;
  const a = GS.agitatieAcum(Bz); assert.ok(a && a.r > 1.5 && a.stingere === 0.6, JSON.stringify(a));
  const bot = { jos: Pz * 0.95, sus: Pz * 1.05, grile: 20, levier: 3, dir: "long", suma: 50, stop: { jos: Pz * 0.93 }, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const card = GS.simuleaza(Bz, bot, { n: 600, seed: 12, orizonturi: [7], zile: 7 }), tab = MonteSimbol.grid(Bz, Object.assign({ pret: Pz }, bot), { zile: 7, n: 600, seed: 12, GridProba }), fara = MonteSimbol.grid(Bz, Object.assign({ pret: Pz }, bot), { zile: 7, n: 600, seed: 12, GridProba, faraAgitatie: true });
  const pc = card.orizonturi[0].pStop; assert.ok(Math.abs(pc - tab.pStop) < 0.06, "card " + pc + " · tabel " + tab.pStop); assert.ok(tab.pStop > fara.pStop * 1.5, "agitația contează: " + tab.pStop + " vs " + fara.pStop); assert.ok(tab.agitatie && tab.agitatie.r > 1.5);
});
await test("E14 (auditul) „95,000” cu virgulă se citește după preț ca „95.000”; câmpurile de procente, levierul și liniile nu iau prețul ca reper", () => {
  const E = lib("monte-simbol-ecran.js"), f = new Function(`${E.match(/function mcsNrRo\(t, P\) \{[\s\S]*?\n\}/)[0]}; return mcsNrRo;`)();
  assert.equal(f("95,000", 95000), 95000); assert.equal(f("2,950", 3000), 2950); assert.equal(f("1,325", 1.4), 1.325); assert.equal(f("7,125", null), 7.125); assert.equal(f("95.000", 95000), 95000);
  assert.ok(/stop: mcsNumar\("mcsStop", null\), tinta: mcsNumar\("mcsTinta", null\)/.test(E) && /lv = mcsNrRo\(c\.levier, null\)/.test(E));
  assert.ok(/r\.gsimEroare = r\.gsim \? null/.test(E) && /Nu am putut simula botul/.test(E), "simularea picată spusă pe card");
  assert.ok(/rowsT\.filter\(\(r\) => !\(r\.g && r\.g\.eroare\)\)\.length - 1/.test(citeste("scripts", "lib", "tura-variante-noapte.mjs")));
});
// ── Simulatorul RULAT (nu doar textul): cursa, blocul, worker-ul ──────────────────────────────────────────────────────────────────────────────
{
  const vm = await import("node:vm"), G = globalThis;
  for (const f of ["tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js"]) { try { vm.runInThisContext(lib(f), { filename: f }); } catch (e) { /* module opționale pentru pagină */ } }
  G.GridCalcul = GridCalcul; G.GridProba = GridProba; G.MonteSimbol = MonteSimbol; G.escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  vm.runInThisContext(lib("monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" }); vm.runInThisContext(lib("grid-sim.js"), { filename: "grid-sim.js" }); vm.runInThisContext(lib("grid-sim-ecran.js"), { filename: "grid-sim-ecran.js" });
  const Bp = bare(20, 1.0, 0.004, 3), Pp = Bp[Bp.length - 1].c;
  await test("🔑 E15 (auditul) cursa: „short → long” apăsat în timpul calculului se aplică DUPĂ el - nu rămâne verdictul short sub setarea long (rulat)", async () => {
    Object.assign(G.gsStare, { mod: "nou", sim: "TST", st: { jos: Pp * 0.95, sus: Pp * 1.05, grile: 10, levier: 2, dir: "short", suma: 50, stop: null, tp: null, tip: "aritmetic" }, date: { sim: "TST", b15: Bp }, dateLa: Date.now(), pret: Pp, fundingSursa: "manual", fundingSim: "TST", fundingZi: 0, inLucru: false, rez: null });
    const citVechi = G.gsCiteste; G.gsCiteste = () => null;
    try { const p = G.gsSimuleaza(); G.gsDirectie("long"); assert.equal(G.gsStare.st.dir, "short", "în timpul calculului setarea nu se schimbă"); await p; assert.equal(G.gsStare.st.dir, "long"); assert.equal(G.gsStare.rez, null, "rezultatul short nu rămâne sub setarea long"); }
    finally { G.gsCiteste = citVechi; }
  });
  await test("🔑 E16 (auditul) blocul „Ce fac cu botul ăsta?” (rulat): textele din date escapate, unitatea în antet, rândul fișei „doar de comparat”, motivul cu majusculă, legătura cu planul", () => {
    const st = { jos: Pp * 0.95, sus: Pp * 1.05, grile: 10, levier: 3, dir: "long", suma: 50, stop: { jos: Pp * 0.9 }, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false }, pornitLa = Bp[Bp.length - 150].t;
    const rez = GS.simuleaza(Bp, st, { pornitLa, stPrefix: st, n: 200, seed: 12, orizonturi: [1, 3, 7, 14], zile: 14 });
    const hot = GS.hotarare(Bp, st, { pornitLa, n: 150, plan: { minus: 0.5, plus: 50 }, fisa: { jos: Pp * 0.96, sus: Pp * 1.06, grile: 12, levier: 2, dir: "long", tip: "aritmetic" } });
    hot.actiuni[2].nume = "<img src=x onerror=alert(1)>";
    Object.assign(G.gsStare, { mod: "meu", rez, st, pornitLa, plan: { minus: 0.5, plus: 50 }, oriz: 2, hot, hotInLucru: false, hotEroare: null, hotBilant: { text: "<b>bilanț</b>" } });
    const h = G.gsHotHtml(G.gsStare);
    assert.ok(!/<img/.test(h) && /&lt;img/.test(h) && !/<b>bilanț/.test(h), "escapat");
    assert.ok(/Cele mai proaste 5% \(USDT, de aici\)/.test(h) && /aleasă pe aceeași lună: doar de comparat/.test(h));
    assert.equal(hot.ales.cheie, "inchide"); assert.ok(/Îl închid” vine din planul tău/.test(h) && /Aș face: îl închid acum\.<\/b> În cele mai proaste 5%/.test(h), h.slice(0, 600));
    assert.ok(/data-et="De ce nu"/.test(G.gsHotRand({ cheie: "x", nume: "x", eroare: "e" }, 0, "tine", null)));
  });
  await test("🔑 E17 (auditul) worker-ul: la timeout iese doar cererea expirată; hotărârea dă eroare (nu îngheață pagina pe fir), simularea din coadă se trimite din nou (rulat)", async () => {
    const st0 = G.setTimeout, W0 = G.Worker, trimise = [];
    G.Worker = class { constructor() { } postMessage(m) { trimise.push(m.fel); } terminate() { } };
    G.setTimeout = (f, ms) => st0(f, ms >= 20000 ? 5 : ms);
    try {
      const st = { jos: Pp * 0.95, sus: Pp * 1.05, grile: 10, levier: 2, dir: "long", suma: 50, stop: null, tp: null, tip: "aritmetic" };
      const [h, s] = await Promise.all([G.gsInWorker("hotarare", Bp, st, { n: 50 }), G.gsInWorker("simuleaza", Bp, st, { n: 50, orizonturi: [1], zile: 1 })]);
      assert.ok(h && /a durat prea mult în fundal/.test(h.eroare), JSON.stringify(h).slice(0, 120)); assert.ok(s && !s.eroare && s.orizonturi, "simularea a venit (pe fir, după ce și worker-ul nou a tăcut)");
      assert.ok(trimise.filter((f) => f === "simuleaza").length >= 2, "simularea retrimisă într-un worker nou: " + trimise.join(","));
    } finally { G.setTimeout = st0; G.Worker = W0; }
  });
}
await test("E18 (auditul) Tabloul: rândul 🧭 cu ora de la care ține, schimbarea care așteaptă a doua socotire și ce înseamnă „îl țin” (rulat)", () => {
  const A = citeste("public", "app.js"), f = new Function("escapeHtml", `${A.match(/function tbHotHtml\(h\)\{[^\n]*\}/)[0]}; return tbHotHtml;`)((s) => String(s));
  const t = f({ cheie: "tine", nume: "îl țin așa", la: Date.UTC(2026, 10, 17, 8, 30), ultima: Date.now(), candidat: "inchide", candNume: "îl închid acum" });
  assert.ok(/\(de la 10:30\)/.test(t) && /se poate schimba în «îl închid acum» \(aștept a doua socotire\)/.test(t) && /nu înseamnă că stopul e bine pus/.test(t), t);
  assert.ok(/#gsPagina \.gsHot tr\.gsHotEr td\.gsStins\{white-space:normal\}/.test(citeste("public", "app.css")), "rândul de eroare se rupe pe telefon");
});

// ── revizia Opus a reparațiilor (17.11) ──────────────────────────────────────────────────────────────────────────────────────────────────────
await test("🔑 RV8 (revizia, 🔴) bilanțul: ferestrele pe bot ȘI pe fel - nota zilnică „îl țin” nu mai aruncă nota anunțului „îl închid” din aceeași zi", () => {
  const D = 86400000, j = []; for (let b = 0; b < 3; b++) for (let d = 0; d < 30; d++) { j.push({ id: "b" + b, z: "z" + d, nota: { t: d * D, v: GS.VERS_HOT, ales: "tine" }, y7: { val: { tine: 1, inchide: 0 } } }); if (d % 10 === 0) j.push({ id: "b" + b, z: "z" + d, nota: { t: d * D + 60000, v: GS.VERS_HOT, ales: "inchide" }, anunt: true, y7: { val: { tine: -2, inchide: 0 } } }); }
  const r = TMC.raportHotarari(j); assert.equal(r.alt, 9, JSON.stringify(r).slice(0, 300)); assert.ok(r.tin > 0 && /când am zis altceva decât «îl țin» \(9\)/.test(r.text), r.text);
});
await test("🔑 RV9 (revizia) „îl închid” pe planul tău: anunțat la prima socotire, fără pauză, plafon pe zi sau histerezis; starea veche cu „plan” e citită ca „îl țin”", () => {
  const T = Date.UTC(2026, 10, 17, 12), hp = { ales: { cheie: "inchide", motiv: "planul", plan: true }, actiuni: [{ cheie: "inchide", nume: "îl închid acum" }] };
  const prev = { cheie: "tine", nume: "îl țin așa", la: T - 3600000, anuntatLa: T - 600000, anuntZi: "2026-11-17", anuntN: 4, fosti: [{ cheie: "inchide", la: T - 600000 }] };
  const r = TMC.pasHotarare(prev, hp, T, "B"); assert.ok(r.anunt && /regula planului tău/.test(r.anunt.mesaj), JSON.stringify(r).slice(0, 200));
  const v = TMC.pasHotarare({ cheie: "plan", nume: "stopul la plan", la: 1, anuntatLa: 1 }, hFals("tine"), T, "B"); assert.equal(v.hot.cheie, "tine"); assert.ok(!v.anunt);
  assert.ok(/\+ p\.dupaAnunt\.cheie \+ "-" \+ b\.id\)/.test(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs")), "cheia Discord cu botul");
});
await test("RV10 (revizia) rândul „stopul la planul tău” e doar de comparat (nu poate fi recomandat); planul se judecă și pe drumurile verdictului de sus (p5Plan)", () => {
  const R = GS.alegeHotarare([{ cheie: "tine", oriz: [null, { media: -0.5, p5: -10, dif: null }] }, { cheie: "plan", doarComparat: true, oriz: [null, { media: 3, p5: -9, dif: { media: 3.5, marja: 1, maiBun: 0.8, maiRau: 0.1, egal: 0.1 } }] }], { prag: 1, oriz: 1 });
  assert.equal(R.cheie, "tine");
  const h0 = GS.hotarare(B, LONG, Object.assign({}, O, { plan: { minus: 1e6, plus: 1e6 }, n: 150 })); assert.notEqual(h0.ales.cheie, "inchide", "planul foarte larg nu închide");
  const h1 = GS.hotarare(B, LONG, Object.assign({}, O, { plan: { minus: 1e6, plus: 1e6 }, n: 150, p5Plan: -2e6 })); assert.equal(h1.ales.cheie, "inchide"); assert.ok(h1.ales.plan);
  const E = lib("grid-sim-ecran.js"); assert.ok(/p5Plan: z7 && isFinite\(z7\.p5\)/.test(E) && /cadere: function \(\) \{ if \(fel === "hotarare"\) fin\(\{ eroare:/.test(E));
  assert.ok(/p5Plan: p5PlanDin\(rez, opt\)/.test(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs")), "și colectorul");
  assert.ok(/Din 25 de situații[^.]*a prins 14/.test(E) && /de 15 ori/.test(E));
  assert.equal(GS.FACTOR_MARJA, 0.5, "marja la jumătate: adoptată după H0 (h0hot/jurnal-marja.txt: 0 false din 71, puterea 4 → 14 din 25)");
});
await test("RV11 (revizia) jurnalul hotărârilor stricat (și .bak) nu se suprascrie cu o listă goală; versiunile dintr-o singură sursă; Tabloul cu data la recomandările vechi", () => {
  const C = citeste("scripts", "colector.mjs"); assert.ok(/if \(s === hotJurnalScris \|\| hotJurnalBlocat\) return;/.test(C) && /raportHotarari\(jh, GridSim\.VERS_HOT\)/.test(C));
  assert.ok(/raportSim\(Object\.values\(st\.judecate\), d\.GridSim && d\.GridSim\.VERS_SIM \|\| VERS_SIM\)/.test(citeste("scripts", "lib", "tura-sim-urmarire.mjs")));
  assert.equal(TSU.raportSim([{ sim: "A", z: "1", t: 1, v: 3, p: 0.5, val: 1 }], 3).n, 1);
  const A = citeste("public", "app.js"), f = new Function("escapeHtml", `${A.match(/function tbHotHtml\(h\)\{[^\n]*\}/)[0]}; return tbHotHtml;`)((s) => String(s));
  assert.ok(/\(de la \d\d\.\d\d\.?\d*,? \d\d:\d\d\)/.test(f({ cheie: "tine", la: Date.now() - 3 * 86400000, ultima: Date.now() })), f({ cheie: "tine", la: Date.now() - 3 * 86400000, ultima: Date.now() }));
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
