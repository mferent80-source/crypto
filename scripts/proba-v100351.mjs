// Proba v100.351 (16.11.2026, el: „ok, fă tot dar vreau să dezvolți mai mult ideea nr 2 că are potențial”):
//   ideea 2 = „Ce fac cu botul ăsta?” - pe ACELEAȘI drumuri, din poziția Pionex: îl țin · îl închid acum · mut TP-ul · mut stopul · planul tău ca
//   stop · îl închid și pornesc (setarea fișei / același bot centrat pe preț); recomand altceva doar CU DOVADĂ (media mai bună cu prag, diferența
//   pe zile peste 0, coada nu mai rea, verificat pe drumuri noi); Simulator + Tablou + Discord; urmărirea pe barele reale.
//   + ideile 1 / 3 și măruntele rămase (pe valuri, în același fișier).
//   node scripts/proba-v100351.mjs
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
function bare(zile, P0, s, seed, f) { const r = mulberry(seed), out = [], T0 = Date.UTC(2026, 9, 1); let p = P0; for (let i = 0; i < zile * 96; i++) { const o = p; p = p * Math.exp(s * (r() * 2 - 1)); if (f) p = f(i, p); out.push({ t: T0 + i * 9e5, o, h: Math.max(o, p) * (1 + s / 3), l: Math.min(o, p) * (1 - s / 3), c: p, v: 1 }); } return out; }
console.log("\nV100.351 · „Ce fac cu botul ăsta?” + ideile 1 / 3 + măruntele · proba\n");

const B = bare(31, 1.42, 0.003, 21), P = B[B.length - 1].c, N = B.length;
const BOT = { jos: P * 0.93, sus: P * 1.03, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: { sus: P * 1.08 }, tp: P * 0.93, tip: "aritmetic", fundingZi: 0.0002, fundingCost: false };
const O = { pornitLa: B[N - 120].t, n: 300, seed: 12, orizonturi: [1, 7], zile: 7, plan: { minus: 6, plus: 4 } };

await test("🔑 D1 acțiunile: îl țin · îl închid acum · TP mai aproape / la margine / fără · stopul la margine / mai larg · planul tău ca stop · îl închid și pornesc - toate pe ACELEAȘI drumuri, din aceeași stare", () => {
  const h = GS.hotarare(B, BOT, O); assert.ok(!h.eroare, h.eroare);
  const k = h.actiuni.map((a) => a.cheie); for (const c of ["tine", "inchide", "tpAproape", "tpFara", "stopMargine", "stopLarg", "plan", "reporneste"]) assert.ok(k.includes(c), "lipsește " + c + " din " + k.join(","));
  const t = h.actiuni.find((a) => a.cheie === "tine"), i = h.actiuni.find((a) => a.cheie === "inchide");
  for (const a of h.actiuni) if (!a.eroare) assert.equal(a.oriz[1].n, t.oriz[1].n, "același număr de drumuri: " + a.cheie);
  assert.ok(i.oriz[1].media === 0 && i.oriz[1].p5 === 0, "închiderea e sigură și e referința (0): traseul are deja scăzut comisionul de închidere de acum");
  assert.equal(t.oriz[1].dif, null, "„îl țin” e referința");
});
await test("🔑 D2 diferența față de „îl țin” e PE ACELEAȘI DRUMURI (pereche), cu marja ei pe zile; drum cu drum", () => {
  const h = GS.hotarare(B, BOT, O), a = h.actiuni.find((x) => x.cheie === "tpAproape");
  assert.ok(a && !a.eroare, a && a.eroare); const d = a.oriz[1].dif; assert.ok(d && isFinite(d.media) && d.marja > 0 && d.maiBun + d.maiRau + d.egal > 0.999);
  const t = h.actiuni.find((x) => x.cheie === "tine"); assert.ok(Math.abs(d.media - (a.oriz[1].media - t.oriz[1].media)) < 1e-9);
});
await test("🔑 D3 regula: altceva decât „îl țin” doar CU DOVADĂ (prag, marginea de jos a diferenței > 0, coada nu mai rea, verificat pe drumuri noi); altfel „îl țin”", () => {
  const h = GS.hotarare(B, BOT, O); assert.ok(h.ales && typeof h.ales.cheie === "string" && h.ales.motiv);
  const R = GS.alegeHotarare([{ cheie: "tine", oriz: [null, { media: -0.5, p5: -10, dif: null }] }, { cheie: "tpAproape", oriz: [null, { media: 2, p5: -9, dif: { media: 2.5, marja: 1, maiBun: 0.7, maiRau: 0.2, egal: 0.1 } }] }], { prag: 1, oriz: 1 });
  assert.equal(R.cheie, "tpAproape");
  assert.equal(GS.alegeHotarare([{ cheie: "tine", oriz: [null, { media: -0.5, p5: -10, dif: null }] }, { cheie: "tpAproape", oriz: [null, { media: 2, p5: -9, dif: { media: 2.5, marja: 3, maiBun: 0.7, maiRau: 0.2, egal: 0.1 } }] }], { prag: 1, oriz: 1 }).cheie, "tine", "marginea de jos sub 0 ⇒ îl țin");
  assert.equal(GS.alegeHotarare([{ cheie: "tine", oriz: [null, { media: -0.5, p5: -10, dif: null }] }, { cheie: "tpAproape", oriz: [null, { media: 2, p5: -14, dif: { media: 2.5, marja: 1, maiBun: 0.7, maiRau: 0.2, egal: 0.1 } }] }], { prag: 1, oriz: 1 }).cheie, "tine", "coada mai rea ⇒ îl țin");
  assert.equal(GS.alegeHotarare([{ cheie: "tine", oriz: [null, { media: -0.5, p5: -10, dif: null }] }, { cheie: "tpAproape", oriz: [null, { media: 0.2, p5: -9, dif: { media: 0.7, marja: 0.2, maiBun: 0.7, maiRau: 0.2, egal: 0.1 } }] }], { prag: 1, oriz: 1 }).cheie, "tine", "sub prag ⇒ îl țin");
});
await test("D4 acțiunile de partea greșită a prețului de acum nu se simulează (spus pe nume)", () => {
  const b2 = Object.assign({}, BOT, { tp: P * 1.01 }), h = GS.hotarare(B, b2, O), x = h.actiuni.find((a) => a.cheie === "tpAproape");
  assert.ok(!x || x.eroare, "TP-ul short peste preț ⇒ fără „mai aproape”");
});

// urmărirea: hotărârea notată pe primele 31 de zile, judecată pe barele REALE care urmează (alegerea LUI: „pe barele reale”)
const BL = bare(39, 1.42, 0.003, 21), ND = 31 * 96, BD = BL.slice(0, ND), PD = BD[ND - 1].c;
const BOTD = { jos: PD * 0.93, sus: PD * 1.03, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: { sus: PD * 1.08 }, tp: PD * 0.93, tip: "aritmetic", fundingZi: 0.0002, fundingCost: false };
const OD = { pornitLa: BD[ND - 120].t, n: 300, plan: { minus: 6, plus: 4 } };
await test("🔑 D5 judecata pe barele reale: „îl țin” = reluarea botului pe barele de după (închis la capăt), „îl închid” = 0 (referința); aceleași setări ca la notare", () => {
  const h = GS.hotarare(BD, BOTD, OD), nota = GS.notaHotarare(h, BOTD, OD, BD, BD[ND - 1].t + 9e5);
  assert.ok(nota && nota.actiuni.length >= 5 && nota.tUrm === BD[ND - 1].t + 9e5);
  const j = GS.judecaHotarare(BL.slice(0, ND + 96), nota, 1); assert.ok(!j.eroare && !j.asteapta, JSON.stringify(j));
  for (const a of nota.actiuni) assert.ok(j.val[a.cheie] !== undefined, "lipsește " + a.cheie);
  // „îl țin” verificat altfel: reluarea întreagă (prefix + ziua reală) față de reluarea până la hotărâre - amândouă au comisionul de închidere scăzut (netLa)
  const opt = { pornitLa: OD.pornitLa, stPrefix: BOTD, botRuleaza: true, n: 1, orizonturi: [1], zile: 1 };
  const capat = GS.simuleaza(BL.slice(0, ND + 96), BOTD, opt).acum, inceput = GS.simuleaza(BD, BOTD, opt).acum;
  const asteptat = capat.oprit ? null : capat.usdt - inceput.usdt;
  assert.ok(asteptat !== null, "botul de probă trebuie să ruleze încă"); assert.ok(Math.abs(j.val.tine - asteptat) < 0.02, j.val.tine + " vs " + asteptat);
  assert.equal(j.val.inchide, 0, "îl închid = referința");
});
await test("D6 judecata nu vede viitorul: bare în plus după orizont nu schimbă nimic; fără destule bare ⇒ „aștept”", () => {
  const h = GS.hotarare(BD, BOTD, OD), nota = GS.notaHotarare(h, BOTD, OD, BD, 0);
  assert.ok(GS.judecaHotarare(BL.slice(0, ND + 50), nota, 1).asteapta);
  const a = GS.judecaHotarare(BL.slice(0, ND + 96), nota, 1), b = GS.judecaHotarare(BL, nota, 1);
  assert.deepEqual(a.val, b.val);
});

// colectorul: Discord doar la schimbare confirmată (2 socotiri, cel mult o dată pe oră), prima tace; notarea o dată pe zi + la anunț; bilanțul
const TMC = await import("./lib/tura-monte-carlo-bot.mjs");
const hFals = (cheie, motiv) => ({ ales: { cheie, motiv: motiv || "m" }, actiuni: [{ cheie: "tine", nume: "îl țin așa" }, { cheie: "inchide", nume: "îl închid acum" }] });
await test("🔑 D7 Discord: prima socotire tace; altă recomandare se anunță abia la a doua socotire la rând; cel mult o dată pe oră; până atunci rămâne cea veche", () => {
  const t0 = Date.UTC(2026, 10, 16, 10); let p = TMC.pasHotarare(null, hFals("tine"), t0, "PENDLE");
  assert.ok(!p.anunt && p.hot.cheie === "tine");
  let q = TMC.pasHotarare(p.hot, hFals("inchide"), t0 + 30 * 60000, "PENDLE"); assert.ok(!q.anunt && q.hot.cheie === "tine" && q.hot.candidat === "inchide");
  let r = TMC.pasHotarare(q.hot, hFals("inchide", "în medie +3,1"), t0 + 60 * 60000, "PENDLE"); assert.ok(r.anunt && /PENDLE: acum aș face «îl închid acum» \(era «îl țin așa»/.test(r.anunt.titlu) && r.anunt.nivel === "atentie" && r.dupaAnunt.cheie === "inchide");
  // înapoi la „îl țin” în mai puțin de o oră de la anunț ⇒ se ține, nu se anunță
  let u = TMC.pasHotarare(r.dupaAnunt, hFals("tine"), t0 + 90 * 60000, "PENDLE"), w = TMC.pasHotarare(u.hot, hFals("tine"), t0 + 110 * 60000, "PENDLE");
  assert.ok(!w.anunt && w.hot.cheie === "inchide");
  assert.ok(!TMC.pasHotarare(w.hot, hFals("tine"), t0 + 125 * 60000, "PENDLE").anunt, "înapoi la ce era înainte, în 6 ore: abia la a 4-a socotire (histerezis, revizia 🟡4 - RV4)");
  assert.ok(!TMC.pasHotarare(p.hot, { eroare: "x" }, t0, "P").anunt);
});
await test("D8 notarea: o dată pe bot pe zi + fiecare anunț; judecata pe barele reale după 1 / 7 zile; bilanțul spune cinstit cât s-a judecat", () => {
  const h = GS.hotarare(BD, BOTD, OD), nota = GS.notaHotarare(h, BOTD, OD, BD, BD[ND - 1].t + 9e5);
  let j = TMC.noteazaHotarare([], { id: 7, sim: "X", nota }); j = TMC.noteazaHotarare(j, { id: 7, sim: "X", nota }); assert.equal(j.length, 1);
  j = TMC.noteazaHotarare(j, { id: 7, sim: "X", nota, forta: true }); assert.equal(j.length, 2);
  const jj = TMC.judecaHotarari(j, { X: BL }, GS, nota.tUrm + 8 * 86400000);
  assert.ok(jj[0].y1 && jj[0].y1.val && jj[0].y7 && jj[0].y7.val, JSON.stringify(jj[0].y7));
  // v100.352 (auditul): pe același bot doar note la cel puțin 7 zile una de alta (ferestrele suprapuse se lasă deoparte, spus)
  const rp = TMC.raportHotarari(jj); assert.equal(rp.j7, 1); assert.equal(rp.suprapuse, 1); assert.ok(/judecate pe barele reale după 7 zile: 1 hotărâre/.test(rp.text) && /prea puține/.test(rp.text) && /ferestre suprapuse/.test(rp.text), rp.text);
  assert.ok(/încă niciuna/.test(TMC.raportHotarari(j).text));
});
await test("D9 tura colectorului pune hotărârea pe bot (la 30 de minute) și o dă la notat; ruta păstrează câmpul hot și bilanțul", async () => {
  const id = 99, bot = { id, activ: true, baza: "TST", gridJos: BOTD.jos, gridSus: BOTD.sus, brut: { buOrderData: { row: 15, gridType: "arithmetic" } }, levier: 3, directie: "short", investit: 82.53, pornitLa: OD.pornitLa, opritorPierdereActiv: true, opritorPierdere: BOTD.stop.sus, pretCurent: PD, opritorProfitActiv: true, opritorProfit: BOTD.tp };
  const stare = { boti: {} }, out = await TMC.turaMonteCarloBot({ boti: [bot], GridSim: GS, GridCalcul, stare, randuri15: async () => BL.slice(0, ND + 1).map((b) => [b.t, b.o, b.h, b.l, b.c, b.v]), anunta: async () => true, acum: BD[ND - 1].t + 9e5, n: 200, nHot: 200 });
  assert.ok(stare.boti[String(id)].hot && stare.boti[String(id)].hot.cheie, JSON.stringify(out));
  assert.equal(out.hotNote.length, 1);
});
await test("D10 ruta mcVerdict păstrează hot (doar chei din listă) și bilanțul hotărârilor", () => {
  const src = citeste("functions", "api", "istoric-bot.js");
  assert.ok(/const HOT=\["tine","inchide","tpAproape","tpMargine","tpFara","stopMargine","stopLarg","plan","reporneste"\]/.test(src));
  assert.ok(/hot:x\.hot&&typeof x\.hot==="object"&&HOT\.includes\(x\.hot\.cheie\)/.test(src) && /JSON\.stringify\(\{la,boti,calibrare,calibrareScurt,hotarari\}\)/.test(src));
  const col = citeste("scripts", "colector.mjs"); assert.ok(/hotarari: hotarari \}/.test(col) && /scrieHotJurnal\(jh\)/.test(col));   // v100.352: în fișierul lui (hot-jurnal.json + .bak)
});

// măruntele rămase din v100.350
await test("M1 „95.000” la BTC = 95 000, „1.325” la PENDLE = 1,325; „95.000,5” / „1,325” / „0.0123”; altceva ⇒ null", () => {
  const src = lib("monte-simbol-ecran.js"), f = new Function(src.slice(src.indexOf("function mcsNrRo("), src.indexOf("function mcsPretAcum(")) + "; return mcsNrRo;")();
  assert.equal(f("95.000", 94800), 95000); assert.equal(f("1.325", 1.31), 1.325); assert.equal(f("95.000", null), 95);
  assert.equal(f("95.000,5", 1), 95000.5); assert.equal(f("95,000.5", 1), 95000.5); assert.equal(f("1,325", 1.3), 1.325); assert.equal(f("0.0123", 0.01), 0.0123);
  assert.equal(f("1.000.000", 1), 1000000); assert.equal(f("1 200", 1), 1200); assert.equal(f("abc", 1), null); assert.equal(f("", 1), null); assert.equal(f("1.5", 1), 1.5);
  assert.ok(/mcsNumar\("mcsStop", null\)/.test(src) && /num\(s, v\)/.test(src));   // v100.352 (auditul): câmpurile de procente fără prețul ca reper
  assert.ok(/mcsNumar\(id, REF\[id\]\)/.test(lib("grid-sim-ecran.js")));
});
await test("M2 stopul în PROCENTE și TP-ul în aceeași bară ⇒ stopul întâi (pesimist), oricare ar fi culoarea lumânării", () => {
  const T0 = Date.UTC(2026, 9, 1), mk = (o, h, l, c, i) => ({ t: T0 + i * 9e5, o, h, l, c, v: 1 });
  const st = { jos: 90, sus: 110, grile: 10, levier: 5, dir: "long", suma: 100, stop: { sus: 109 }, stopRaport: -0.2, tip: "aritmetic" };
  for (const verde of [true, false]) {
    const b = [mk(100, 100.2, 99.8, 100, 0), verde ? mk(100, 109.5, 92, 108, 1) : mk(100, 109.5, 92, 95, 1), mk(100, 100.2, 99.8, 100, 2)];
    const r = GridProba.simuleaza(b, 0, b.length, st, {});
    assert.ok(r.oprit && r.iesit === "jos", (verde ? "verde" : "roșie") + ": " + JSON.stringify({ oprit: r.oprit, iesit: r.iesit, net: r.net }));
  }
});
await test("M3 funding-ul la orele reale (00 / 08 / 16 UTC): botul pornit la 07:45 plătește la 08:00; pe o zi tot 3 plăți", () => {
  const T0 = Date.UTC(2026, 9, 1, 7, 45), b = []; for (let i = 0; i < 96; i++) b.push({ t: T0 + i * 9e5, o: 100, h: 100.01, l: 99.99, c: 100, v: 1 });
  const st = { jos: 99, sus: 101, grile: 4, levier: 2, dir: "long", suma: 100, tip: "aritmetic", fundingZi: 0.003 };
  const r = GridProba.simuleaza(b, 0, b.length, st, { traseu: true, tStart: T0 }), f = r.traseu.fund;
  assert.equal(f[0], 0, "la 07:45 încă nu"); assert.ok(f[1] > 0, "la 08:00 da");
  const plati = f.filter((x, i) => i === 0 ? x !== 0 : x !== f[i - 1]).length; assert.equal(plati, 3);
  const vechi = GridProba.simuleaza(b, 0, b.length, st, { traseu: true }); assert.ok(vechi.traseu.fund[0] > 0, "fără ora primei bare rămâne regula veche");
});
await test("M4 mesajul de noapte numără doar variantele simulate („aleasă dintre N variante”)", () => {
  assert.ok(/cate\(rowsV\.filter\(\(r\) => !\(r\.g && r\.g\.eroare\)\)\.length - 1, "variantă", "variante"\)/.test(citeste("scripts", "lib", "tura-variante-noapte.mjs")));
});

// ideea 1: drumurile după agitația de acum (V3: ultimele 2 zile, stinsă cu 10% pe zi; h0media/jurnal-idee1.txt)
function bareAgit(zileCalme, zileAgit, seed) { const r = mulberry(seed), out = [], T0 = Date.UTC(2026, 9, 1); let p = 1.4; for (let d = 0; d < zileCalme + zileAgit; d++) { const s = d < zileCalme ? 0.002 : 0.006; for (let i = 0; i < 96; i++) { const o = p; p *= Math.exp(s * (r() * 2 - 1)); out.push({ t: T0 + (d * 96 + i) * 9e5, o, h: Math.max(o, p) * 1.0005, l: Math.min(o, p) * 0.9995, c: p, v: 1 }); } } return out; }
const STA = (P) => ({ jos: P * 0.95, sus: P * 1.05, grile: 12, levier: 2, dir: "long", suma: 100, stop: null, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false });
await test("🔑 I1a ultimele 2 zile agitate ⇒ drumurile mai largi decât pe toată luna; calme ⇒ mai strânse; raportul pe pagină (rez.agitatie)", () => {
  const ag = bareAgit(29, 2, 4), Pa = ag[ag.length - 1].c, ra = GS.simuleaza(ag, STA(Pa), { n: 400, orizonturi: [1], zile: 1 }), rf = GS.simuleaza(ag, STA(Pa), { n: 400, orizonturi: [1], zile: 1, faraAgitatie: true });
  assert.ok(ra.agitatie > 1.5, "raportul " + ra.agitatie); assert.ok(ra.orizonturi[0].p95 - ra.orizonturi[0].p5 > (rf.orizonturi[0].p95 - rf.orizonturi[0].p5) * 1.2, "mai larg");
  // lună agitată, ultimele 2 zile calme: o serie continuă (fără salt de preț între bucăți)
  const r = mulberry(5), mix = [], T0 = Date.UTC(2026, 9, 1); let p = 1.4; for (let d = 0; d < 31; d++) { const s = d < 29 ? 0.006 : 0.002; for (let i = 0; i < 96; i++) { const o = p; p *= Math.exp(s * (r() * 2 - 1)); mix.push({ t: T0 + (d * 96 + i) * 9e5, o, h: Math.max(o, p) * 1.0005, l: Math.min(o, p) * 0.9995, c: p, v: 1 }); } }
  const Pm = mix[mix.length - 1].c, rm = GS.simuleaza(mix, STA(Pm), { n: 300, orizonturi: [1], zile: 1 }), rmf = GS.simuleaza(mix, STA(Pm), { n: 300, orizonturi: [1], zile: 1, faraAgitatie: true });
  assert.ok(rm.agitatie < 0.7, "calm acum: " + rm.agitatie); assert.ok(rm.orizonturi[0].p95 - rm.orizonturi[0].p5 < rmf.orizonturi[0].p95 - rmf.orizonturi[0].p5, "mai strâns");
});
await test("I1b media prețului rămâne prețul de acum (centrarea după scalare); drumul real și regimul nu se scalează", () => {
  const ag = bareAgit(29, 2, 9), Pa = ag[ag.length - 1].c, st = STA(Pa);
  const r = GS.simuleaza(ag, st, { n: 600, orizonturi: [7], zile: 7, peDrum: true }); assert.ok(r.agitatie > 1.5);
  assert.ok(/agitatieAcum\(b15\)/.test(lib("grid-sim.js")) && /o\.drumFix \|\| ST \|\| o\.faraAgitatie \? null/.test(lib("grid-sim.js")));
  // drumul real (judecata) nu e scalat: judecaVerdict e identic cu GridProba pe aceleași bare (I3a o verifică pe lumea calmă; aici pe una agitată)
  const B2 = ag.concat(bareAgit(0, 7, 10).map((b, i) => Object.assign({}, b, { t: ag[ag.length - 1].t + (i + 1) * 9e5, o: b.o * Pa / 1.4, h: b.h * Pa / 1.4, l: b.l * Pa / 1.4, c: b.c * Pa / 1.4 })));
  const j = GS.judecaVerdict(B2, { tUrm: ag[ag.length - 1].t + 9e5, st }), real = B2.slice(ag.length, ag.length + 7 * 96), g = GridProba.simuleaza(real, 0, real.length, Object.assign({}, st, { stop: null }), {});
  assert.ok(Math.abs(j.val - g.net * st.suma) < 0.05, j.val + " vs " + g.net * st.suma);
});

// ideea 3: verdictele Simulatorului pentru un bot nou, judecate pe barele reale după 7 zile
const TSU = await import("./lib/tura-sim-urmarire.mjs");
await test("🔑 I3a judecata unui verdict de bot nou: botul pornit la prima bară de după notare, pe barele REALE, 7 zile; bare în plus nu schimbă nimic; fără 7 zile ⇒ aștept", () => {
  const st = { jos: PD * 0.95, sus: PD * 1.05, grile: 12, levier: 2, dir: "long", suma: 100, stop: { jos: PD * 0.9 }, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const nota = { tUrm: BD[ND - 1].t + 9e5, st };
  assert.ok(GS.judecaVerdict(BL.slice(0, ND + 300), nota).asteapta);
  const a = GS.judecaVerdict(BL.slice(0, ND + 7 * 96), nota), b = GS.judecaVerdict(BL, nota); assert.ok(isFinite(a.val)); assert.equal(a.val, b.val);
  // verificat altfel: botul pornit pe barele reale de la aceeași bară, cu GridProba direct, închis la capăt
  const real = BL.slice(ND, ND + 7 * 96), opr = { jos: st.stop.jos }, r = GridProba.simuleaza(real, 0, real.length, Object.assign({}, st, { stop: opr }), {});
  assert.ok(Math.abs(a.val - r.net * st.suma) < 0.05, a.val + " vs " + r.net * st.suma);
});
await test("I3b raportul: Brier față de ban și față de „mereu rata de bază”; pe fel (Aș porni / N-aș porni) câte pe plus și media reală vs prezisă; sub 30 ⇒ „prea puține”", () => {
  // v100.352: notele poartă versiunea motorului (v) și moneda; „orientativ” sub 300 de unități (o monedă pe zi)
  const j = [{ sim: "A", t: 1, v: 2, p: 0.7, val: 2, fel: "porni", media: 1, z: "2026-11-01" }, { sim: "B", t: 2, v: 2, p: 0.6, val: -1, fel: "porni", media: 0.5, z: "2026-11-02" }, { sim: "C", t: 3, v: 2, p: 0.3, val: -3, fel: "nu", media: -2, z: "2026-11-02" }];
  const r = TSU.raportSim(j); assert.equal(r.n, 3); assert.ok(Math.abs(r.brier - ((0.3 ** 2 + 0.6 ** 2 + 0.3 ** 2) / 3)) < 1e-9);
  assert.ok(/«Aș porni» \(2\): pe plus în 1, media reală \+0,5 USDT \(prezisă \+0,8\)/.test(r.text) && /«N-aș porni» \(1\)/.test(r.text) && /orientativ/.test(r.text), r.text);
  assert.ok(/încă niciunul/.test(TSU.raportSim([]).text));
});
await test("I3c tura: judecă doar notele ajunse la 7 zile, o dată; trimite raportul; ruta validează nota (monedă, setare, fel din listă)", async () => {
  const st = { jos: PD * 0.95, sus: PD * 1.05, grile: 12, levier: 2, dir: "long", suma: 100, stop: null, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const note = [{ id: "TST-1", sim: "TST_USDT_PERP", t: BD[ND - 1].t + 9e5, tUrm: BD[ND - 1].t + 9e5, st, p: 0.6, media: 0.4, fel: "porni", v: 2 }, { id: "TST-2", sim: "TST_USDT_PERP", t: BL[BL.length - 10].t, tUrm: BL[BL.length - 10].t, st, p: 0.5, media: 0, fel: "alt", v: 2 }];
  let trimis = null; const stare = {};
  const r = await TSU.turaSimUrmarire({ acum: BL[BL.length - 1].t + 9e5, cere: async () => ({ note }), trimite: async (c, b) => { trimis = b; }, GridSim: GS, GridCalcul, randuri15: async () => BL.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v]).concat([[BL[BL.length - 1].t + 9e5, 1, 1, 1, 1, 1]]) }, stare);
  assert.ok(stare.judecate["TST-1"] && isFinite(stare.judecate["TST-1"].val) && !stare.judecate["TST-2"], JSON.stringify(stare.judecate));
  assert.equal(r.n, 1); assert.ok(trimis && trimis.rezumat && trimis.rezumat.n === 1);
  const src = citeste("functions", "api", "istoric-bot.js"); assert.ok(/if\(action==="simNota"\)/.test(src) && /\["porni","nu","alt"\]\.includes\(n\.fel\)/.test(src) && /if\(action==="simUrmarire"\)\{if\(!\(nr\(corp&&corp\.la\)>0\)\)/.test(src));
  const E = lib("grid-sim-ecran.js"); assert.ok(/else if \(gsStare\.rez && !gsStare\.rez\.acum\) gsNoteazaVerdict\(\)/.test(E) && /action=simNota/.test(E));
});

// revizia Opus (17.11): reparațiile, fiecare cu proba ei
await test("🔑 RV1 (🔴1) agitația scalează drumul DUPĂ ce tendința lunii e scoasă: media prețului ≈ prețul de acum la 1, 3 și 7 zile, și pe o lună în cădere (cablajul vechi o abătea)", () => {
  const r = mulberry(31), b = [], T0 = Date.UTC(2026, 9, 1); let p = 1.4;
  for (let d = 0; d < 31; d++) { const s = d < 29 ? 0.002 : 0.006; for (let i = 0; i < 96; i++) { const o = p; p *= Math.exp(s * (r() * 2 - 1) - 0.019 / 96); b.push({ t: T0 + (d * 96 + i) * 9e5, o, h: Math.max(o, p) * 1.0003, l: Math.min(o, p) * 0.9997, c: p, v: 1 }); } }
  const P0 = b[b.length - 1].c, H = 7 * 96, ag = GS.agitatieAcum(b); assert.ok(ag && ag.r > 2, "agitat: " + (ag && ag.r));
  let s0 = 0, n0 = 0; for (let i = 1; i < b.length; i++) { s0 += Math.log(b[i].c / b[i - 1].c); n0++; } const mu = s0 / n0;
  const mediiLa = (DR) => { const g0 = MonteSimbol.generator(12), v0 = []; for (let q = 0; q < 1500; q++) { const d = DR(g0, mu); v0.push(Math.log(d[d.length - 1].c / P0)); } const m = mu + Math.log(v0.reduce((a, x) => a + Math.exp(x), 0) / v0.length) / H; const g = MonteSimbol.generator(12), S = [0, 0, 0]; for (let q = 0; q < 1500; q++) { const d = DR(g, m); [96, 288, 672].forEach((k, j) => { S[j] += d[k - 1].c / P0; }); } return S.map((x) => x / 1500); };
  const nou = mediiLa((g, mm) => GS.scaleazaDrum(MonteSimbol.drum(b, H, 96, P0, g, mu), P0, ag.r, mm - mu));
  const vechi = mediiLa((g, mm) => GS.scaleazaDrum(MonteSimbol.drum(b, H, 96, P0, g, 0), P0, ag.r, mm));
  nou.forEach((x, j) => assert.ok(Math.abs(x - 1) < 0.004, "nou la " + [1, 3, 7][j] + " zile: " + x));
  assert.ok(Math.abs(vechi[1] - 1) > Math.abs(nou[1] - 1) * 2, "cablajul vechi abătea mai mult: " + vechi[1] + " vs " + nou[1]);
  assert.ok(/scaleazaDrum\(DRUM0\(b, hh, bz, p, r, mu, urme\), p, agit\.r, muu - mu\)/.test(lib("grid-sim.js")));
});
await test("RV2 (🔴2 / 🔵11) un rezultat (variante, ținte, hotărâre) sosit după o simulare nouă nu se mai pune peste ea", () => {
  const E = lib("grid-sim-ecran.js");
  assert.equal((E.match(/if \(gsStare\.rez !== rez0\) \{/g) || []).length, 3);
});
await test("RV4 (🟡4) Discord: întoarcerea la recomandarea de dinainte, în 6 ore de la anunț, cere 4 socotiri la rând, nu 2", () => {
  const t0 = Date.UTC(2026, 10, 16, 10); let h = TMC.pasHotarare(null, hFals("tine"), t0, "P").hot;
  h = TMC.pasHotarare(h, hFals("inchide"), t0 + 18e5, "P").hot; const a = TMC.pasHotarare(h, hFals("inchide"), t0 + 36e5, "P"); assert.ok(a.anunt); h = a.dupaAnunt; assert.equal(h.fost, "tine");
  let t = t0 + 36e5; const pasi = []; for (let k = 1; k <= 4; k++) { t += 18e5; const x = TMC.pasHotarare(h, hFals("tine"), t, "P"); pasi.push(!!x.anunt); h = x.anunt ? x.dupaAnunt : x.hot; if (x.anunt) break; }
  assert.deepEqual(pasi, [false, false, false, true], "abia la a 4-a: " + pasi);
});
await test("RV5 (🟡5) Tabloul nu arată o hotărâre veche când cea nouă a picat", () => { assert.ok(/function tbHotHtml\(h\)\{if\(!h\|\|!h\.cheie\|\|h\.eroare\|\|/.test(citeste("public", "app.js"))); });
await test("RV6 (🟡6) „îl închid și pornesc”: botul nou fără corecția de mărime a celui vechi; (🔵9) la neutru se mută ambele părți ale stopului", () => {
  const S = lib("grid-sim.js"); assert.ok(!/cuK\(a\.nou\)|cuK\(a2\.nou\)/.test(S) && /a\.r = a\.nou \? simuleazaBaza\(b15, stA, \{/.test(S));
  const neu = { jos: P * 0.95, sus: P * 1.05, grile: 14, levier: 2, dir: "neutru", suma: 80, stop: { jos: P * 0.9, sus: P * 1.1 }, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const h = GS.hotarare(B, neu, Object.assign({}, O, { plan: null })), rp = h.actiuni.find((a) => a.cheie === "reporneste");
  assert.ok(rp && rp.nou && rp.nou.stop && rp.nou.stop.jos > 0 && rp.nou.stop.sus > 0, JSON.stringify(rp && rp.nou && rp.nou.stop));
});
await test("RV7 (🟡7) colectorul aduce bare doar pentru hotărârile scadente acum (y1 la o zi, y7 la 7 zile); (🔵10) o listă goală nu șterge ce s-a judecat", async () => {
  assert.ok(/\(\(!e\.y1 && acumH - Number\(e\.nota\.tUrm\) >= 86400000 \+ 15 \* 60000\) \|\| \(!e\.y7 && acumH - Number\(e\.nota\.tUrm\) >= 7 \* 86400000 \+ 15 \* 60000\)\)/.test(citeste("scripts", "colector.mjs")));
  const st = { judecate: { a: { id: "a", val: 1, p: 0.5, fel: "porni", z: "2026-11-01" } } };
  await TSU.turaSimUrmarire({ acum: Date.now(), cere: async () => ({ note: [] }), trimite: async () => {}, GridSim: GS, GridCalcul, randuri15: async () => [] }, st);
  assert.ok(st.judecate.a, "nu s-a șters");
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
