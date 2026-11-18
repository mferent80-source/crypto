// Proba v100.360 (18.11, auditul paginii „Comportament” pe 2.456 de boți / 263 de zile; hotărârea lui: regulile RĂMÂN, spuse cinstit):
// scripts/lib/comportament-dovezi.mjs - regulile PE BOT cu starea lor (dovedita / nedovedita / contrazisa / putine / descriere), H0 prin
// amestecarea netului între boții aceleiași zile + regula refăcută, martorul la întâmplare, pragul pe familie; evaluarea pe două axe (față
// de ziua ta + regulile atinse) pe pagină și pe Discord; câmpurile noi din raport (reguliDovezi, grafice, botiActivi, ultimInchis).
//   node scripts/proba-v100360-comportament.mjs        (iese 0 la succes)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as DV from "./lib/comportament-dovezi.mjs";
import * as CO from "./lib/comportament.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import * as PC from "./lib/pagina-comportament.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const [f, g] of [["grid-calcul.js", "GridCalcul"], ["jurnal-trade.js", "JurnalTrade"], ["obiceiuri.js", "Obiceiuri"]]) if (!globalThis[g]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Obiceiuri: OB, JurnalTrade: JT } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 1200)}`); }); }
console.log("\nV100.360 · COMPORTAMENT: REGULILE PE BOT, CU STAREA LOR · proba\n");

const ORA = 3600000, MIN = 60000, ZI = 86400000;
const P7 = OB.praguriFrana({ zi: 20, sapt: 60, rand: 3, boti: 7 });
const fZi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }), ziRo = (t) => fZi.format(new Date(t));
const plusZile = (zi, d) => new Date(Date.parse(zi + "T12:00:00Z") + d * ZI).toISOString().slice(0, 10);
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------- generatorul: zile cu efectul pieței, boți porniți 08–22, durate de la minute la ore; efectul (dacă e) doar pe boții regulii,
// hotărât în clipa pornirii cu ce se știa ATUNCI (frâna lui Obiceiuri, șirul de pierderi din aceeași zi, ziua de ieri, al câtelea bot) ----------------
function atinge(cod, t, l, P) {
  const z = ziRo(t.pornit);
  if (cod === "prag") return l.filter((x) => ziRo(x.pornit) === z && x.pornit <= t.pornit).length >= P.boti;
  if (cod === "frana") { const d = new Set((OB.franaLaPornire(t, l, P).depasit || []).map((x) => x.cod)); return d.has("zi") || d.has("sapt") || d.has("rand"); }
  if (cod === "treiLaRand") { const c = l.filter((x) => x.inchis < t.pornit && ziRo(x.inchis) === z).sort((a, b) => a.inchis - b.inchis); let r = 0; for (const x of c) { r = x.net < 0 ? r + 1 : 0; if (r >= P.rand) return true; } return false; }
  if (cod === "dupaProasta") { const ieri = plusZile(z, -1), s = l.filter((x) => ziRo(x.pornit) === ieri).reduce((a, x) => a + x.net, 0); return s <= DV.ZI_PROASTA && l.filter((x) => ziRo(x.pornit) === z).length + 1 > DV.DUPA_PROASTA; }
  return false;
}
function genereaza({ zile = 120, seed = 1, efect = null, P = P7, start = "2026-03-02", maxZi = 25, sdZi = 2, medie = 0 }) {
  const rnd = mulberry32(seed), l = [], norm = () => { let s = 0; for (let k = 0; k < 6; k++) s += rnd(); return (s - 3) * Math.SQRT2; };
  let id = 0;
  for (let d = 0; d < zile; d++) {
    const zi = plusZile(start, d), k = rnd() < 0.12 ? 0 : 1 + Math.floor(rnd() * rnd() * maxZi), ef = medie + norm() * sdZi, t0 = OB.inceputZiRo(Date.parse(zi + "T12:00:00Z")) + 8 * ORA;
    const porniri = Array.from({ length: k }, () => Math.round(t0 + rnd() * 14 * ORA)).sort((a, b) => a - b);
    for (const p of porniri) {
      const u = rnd(), dur = u < 0.4 ? (1 + rnd() * 13) * MIN : u < 0.85 ? (15 + rnd() * 330) * MIN : (6 * 60 + rnd() * 900) * MIN;
      const t = { id: "g" + seed + "-" + (++id), moneda: "SOL", dir: "long", pornit: p, inchis: Math.round(p + dur), durataOre: dur / ORA, grile: 0.2, comisioane: -0.3, funding: 0, pozitie: 0 };
      let v = ef + norm() * 4;
      if (efect && atinge(efect.cod, t, l, P)) v += efect.m;
      t.net = t.rezultat = Math.round(v * 100) / 100; l.push(t);
    }
  }
  return l;
}
const acumDin = (l) => Math.max(...l.map((t) => t.inchis)) + ORA;
const stare = (r, c) => r.reguliDovezi.find((x) => x.cod === c).stare;

// ---------------- 1. frâna rapidă = Obiceiuri.franaLaPornire ----------------
await test("1. frâna la pornire (zi / 7 zile / la rând) și pragul zilei, socotite rapid, dau EXACT ce dă Obiceiuri.franaLaPornire (bot cu bot)", () => {
  for (const seed of [11, 12]) {
    const l = genereaza({ zile: 90, seed }); DV.golesteMemo();
    const C = DV.calculMemo(l, P7, [], {});
    let dF = 0, dP = 0, nF = 0;
    for (let i = 0; i < C.S.n; i++) { const d = new Set((OB.franaLaPornire(C.S.L[i].t, l, P7).depasit || []).map((x) => x.cod)), tr = d.has("zi") || d.has("sapt") || d.has("rand"); if (tr !== !!C.real.frana[i]) dF++; if (d.has("boti") !== !!C.real.prag[i]) dP++; if (tr) nF++; }
    assert.equal(dF, 0, "frâna diferă la " + dF + " boți"); assert.equal(dP, 0, "pragul diferă la " + dP + " boți"); assert.ok(nF > 20 && nF < C.S.n - 20, "frâna trasă la " + nF + " din " + C.S.n);
  }
});

// ---------------- 2. cazuri construite: efect pe boții regulii ⇒ dovedită; efect invers ⇒ contrazisă; puține ⇒ putine ----------------
for (const cod of DV.TESTATE) {
  await test("2. „" + cod + "”: boții regulii cu −6 USDT ⇒ „dovedita”; cu +6 ⇒ „contrazisa” (H0 în aceeași zi + martor + familie)", () => {
    // frâna: piața pe plus în medie (altfel −6 pe boții ei o ține trasă mereu și nu rămâne grupa „liberă”); ziua proastă: zile mai pline și mai agitate
    // (frâna cu −6 se autoîntreține: boții ei pierd și o țin trasă ⇒ efect ±4 pe o piață pe plus)
    const g = cod === "frana" ? { zile: 160, medie: 2.5 } : cod === "dupaProasta" ? { zile: 300, sdZi: 4, maxZi: 40 } : { zile: 160 }, m = cod === "frana" ? 4 : 6;
    const rau = genereaza(Object.assign({ seed: 21, efect: { cod, m: -m } }, g)), bun = genereaza(Object.assign({ seed: 21, efect: { cod, m } }, g));
    const r1 = DV.reguliDovezi(rau, P7, [], acumDin(rau)), x1 = r1.reguliDovezi.find((x) => x.cod === cod);
    assert.equal(x1.stare, "dovedita", JSON.stringify(x1)); assert.ok(x1.dif < 0 && x1.ic[1] < 0 && x1.pFamilie <= 0.05 && x1.martor.p <= 0.05);
    assert.match(x1.text, /⇒ dovedită\.$/);
    const r2 = DV.reguliDovezi(bun, P7, [], acumDin(bun)), x2 = r2.reguliDovezi.find((x) => x.cod === cod);
    assert.equal(x2.stare, "contrazisa", JSON.stringify(x2)); assert.ok(x2.dif > 0);
  });
}
await test("2. prea puține date (8 zile) ⇒ „putine” la toate regulile testate, cu textul care spune de ce; durata ⇒ „descriere”", () => {
  const l = genereaza({ zile: 8, seed: 5 }), r = DV.reguliDovezi(l, P7, [], acumDin(l));
  for (const c of DV.TESTATE) { assert.equal(stare(r, c), "putine", c); assert.match(r.reguliDovezi.find((x) => x.cod === c).text, /prea puține ca să judec|niciun bot/); }
  assert.equal(stare(r, "ore6"), "descriere"); assert.equal(stare(r, "minute"), "descriere");
  for (const c of ["ore6", "minute"]) { const x = r.reguliDovezi.find((y) => y.cod === c); assert.equal(x.p, null); assert.equal(x.martor, null); }
});

// ---------------- 3. H0: fără niciun efect, „dovedita” cel mult ~5% (pe familie), deși comparația naivă în aceeași zi „găsește” mecanica ----------------
await test("3. simulare sub H0 (200 de istorii fără efect): orice regulă „dovedita” ≤ 8% (nominal 5%), „contrazisa” ≤ 8%; naiv (IC în aceeași zi), „3 la rând” și frâna ies mecanic „semnificative” des", () => {
  const M = 200, o = { B: 199, BM: 199 }, nDov = {}, nCon = {}, naiv = { treiLaRand: 0, frana: 0 }; let oriceDov = 0, oriceCon = 0, mecTr = 0, valid = 0;
  for (const c of DV.TESTATE) { nDov[c] = 0; nCon[c] = 0; }
  for (let s = 1; s <= M; s++) {
    const l = genereaza({ zile: 90, seed: 1000 + s }), r = DV.reguliDovezi(l, P7, [], acumDin(l), Object.assign({ samanta: 500 + s }, o)), C = DV.calculMemo(l, P7, [], Object.assign({ samanta: 500 + s }, o));
    let d = false, k = false;
    for (const c of DV.TESTATE) { const x = r.reguliDovezi.find((y) => y.cod === c); if (x.stare === "dovedita") { nDov[c]++; d = true; } if (x.stare === "contrazisa") { nCon[c]++; k = true; } }
    if (d) oriceDov++; if (k) oriceCon++;
    const t3 = r.reguliDovezi.find((y) => y.cod === "treiLaRand"); if (t3.mecanic !== null) { valid++; if (t3.mecanic > 0) mecTr++; }
    // naiv: diferența în aceeași zi, interval bootstrap pe zile, FĂRĂ regula refăcută pe netul amestecat (cum făcea pagina / auditul)
    for (const c of ["treiLaRand", "frana"]) {
      const m = new Map(); for (let i = 0; i < C.S.n; i++) { const z = C.S.ziDe[i], x = m.get(z) || { sc: 0, nc: 0, sf: 0, nf: 0 }; if (C.real[c][i]) { x.sc += C.v0[i]; x.nc++; } else { x.sf += C.v0[i]; x.nf++; } m.set(z, x); }
      const W = [], Cc = []; for (const x of m.values()) if (x.nc && x.nf) { const w = x.nc * x.nf / (x.nc + x.nf); W.push(w); Cc.push(w * (x.sc / x.nc - x.sf / x.nf)); }
      if (W.length < 5) continue;
      const rnd = mulberry32(s), v = []; for (let b = 0; b < 200; b++) { let a1 = 0, a2 = 0; for (let j = 0; j < W.length; j++) { const q = (rnd() * W.length) | 0; a1 += Cc[q]; a2 += W[q]; } v.push(a1 / a2); }
      v.sort((a, b) => a - b); if (v[5] > 0 || v[194] < 0) naiv[c]++;
    }
  }
  const pc = (x) => Math.round(1000 * x / M) / 10 + "%";
  console.log("       H0: „dovedita” " + DV.TESTATE.map((c) => c + " " + pc(nDov[c])).join(", ") + " · oricare " + pc(oriceDov) + " · „contrazisa” oricare " + pc(oriceCon));
  console.log("       naiv (fără regula refăcută): „3 la rând” " + pc(naiv.treiLaRand) + ", frâna " + pc(naiv.frana) + " · mecanica „3 la rând” > 0 în " + mecTr + " din " + valid);
  assert.ok(oriceDov / M <= 0.08, "oricare dovedita " + pc(oriceDov)); assert.ok(oriceCon / M <= 0.08, "oricare contrazisa " + pc(oriceCon));
  for (const c of DV.TESTATE) assert.ok(nDov[c] / M <= 0.06, c + " dovedita " + pc(nDov[c]));
  assert.ok(naiv.treiLaRand / M >= 0.2 && naiv.frana / M >= 0.2, "capcana naivă trebuie să se vadă în simulare");
  assert.ok(mecTr / valid >= 0.8, "boții de după șir ies mecanic mai buni sub H0");
});

// ---------------- 4. evaluarea pe două axe ----------------
const ZI1 = "2026-06-10";
function ziMica() {
  const t0 = OB.inceputZiRo(Date.parse(ZI1 + "T12:00:00Z"));
  const b = (id, h, ore, net) => ({ id, moneda: "SOL", dir: "long", pornit: t0 + h * ORA, inchis: t0 + (h + ore) * ORA, durataOre: ore, net, rezultat: net, grile: 0.5, comisioane: -0.2, funding: 0, pozitie: net });
  return [b("a", 9, 1, -5), b("b", 10, 1, 1), b("c", 11, 1, 4), b("s", 24 + 10, 7, -2)];   // ziua 10.06: trei boți; 11.06: unul singur, ținut 7 h
}
await test("4. axa (a): netul față de media CELORLALȚI boți ai zilei pornirii (−5 față de +1 și +4 ⇒ −7,5); singurul bot al zilei ⇒ null", () => {
  const l = ziMica(), r = DV.reguliDovezi(l, P7, [], acumDin(l));
  assert.equal(r.peBot.get("a").fataDeZi, -7.5); assert.equal(r.peBot.get("a").nZi, 3); assert.equal(r.peBot.get("s").fataDeZi, null);
  const ax = DV.axePeEvaluare({ id: "a", net: -5, rele: ["boti"] }, r, l, P7);
  assert.equal(ax.fataDeZi, -7.5); assert.equal(ax.nZi, 3); assert.deepEqual(ax.reguliAtinse, [{ cod: "prag", stare: "putine" }]);
  assert.equal(ax.eticheta2, "Pe minus, −5,0; față de ziua ta −7,5; reguli atinse, cu prea puține date: peste pragul zilei.");
  const s = DV.axePeEvaluare({ id: "s", net: -2, rele: [] }, r, l, P7);
  assert.equal(s.fataDeZi, null); assert.equal(s.eticheta2, "Pe minus, −2,0; singurul bot al zilei; fapte: ținut peste 6 ore.");
});
await test("4. axa (b): „Noroc” / „Greșeala a costat” DOAR cu o regulă DOVEDITĂ atinsă; altfel titlul descrie (pagină și Discord)", () => {
  const at = (st) => [{ cod: "prag", stare: st, nume: "peste pragul zilei" }, { cod: "minute", stare: "descriere", nume: "închis în minute" }];
  assert.equal(DV.eticheta2(-3.21, -1.04, at("dovedita")), "Greșeala a costat, −3,2; față de ziua ta −1,0; regulă dovedită atinsă: peste pragul zilei.");
  assert.equal(DV.eticheta2(2, 0.5, at("dovedita")), "Noroc, +2,0; față de ziua ta +0,5; regulă dovedită atinsă: peste pragul zilei.");
  assert.equal(DV.eticheta2(-3.21, -1.04, at("nedovedita")), "Pe minus, −3,2; față de ziua ta −1,0; reguli atinse, nedovedite: peste pragul zilei; fapte: închis în minute.");
  assert.equal(DV.eticheta2(1.25, null, []), "Pe plus, +1,3; singurul bot al zilei.");
  // Discord: botul al 8-lea al zilei, regula nedovedită ⇒ titlul „pe minus”, fără „noroc” / „pierderea vine din piață”
  const l = genereaza({ zile: 60, seed: 77 }), dv = DV.reguliDovezi(l, P7, [], acumDin(l));
  const C = DV.calculMemo(l, P7, [], {}), i8 = [...Array(C.S.n).keys()].find((i) => C.real.prag[i] && C.v0[i] < 0), t = C.S.L[i8].t;
  const mk = (stari) => { const ev = CO.evalueaza({ t, frana: OB.franaLaPornire(t, l, P7), afaraOre: null, banda: { dv: null, r: null }, dovezi: CO.dovezi(l, 7), motiv: null }); return DV.cuAxe(ev, Object.assign({}, dv, { stari }), l, P7); };
  const ev1 = mk(Object.assign({}, dv.stari, { prag: "nedovedita", frana: "nedovedita" })), m1 = MC.evaluareBot(ev1);
  assert.match(m1.titlu, /^SOL long: pe minus −\d+,\d USDT$/); assert.match(m1.mesaj, /\n📊 Față de ziua ta: [+−]/); assert.match(m1.mesaj, /\n⚖️ Reguli atinse, pe istoria ta: .*peste pragul zilei - nedovedită/);
  assert.doesNotMatch(m1.mesaj, /pierderea vine din piață|piața te-a ajutat|zilele tale cu peste|\/zi/); assert.match(m1.mesaj, /Regulile atinse nu sunt dovedite/);
  const ev2 = mk(Object.assign({}, dv.stari, { prag: "dovedita" })), m2 = MC.evaluareBot(ev2);
  assert.match(m2.titlu, /^SOL long: greșeala a costat −/); assert.match(m2.mesaj, /Regula încălcată e dovedită pe istoria ta/); assert.match(ev2.eticheta2, /^Greșeala a costat, −/);
  for (const m of [m1, m2]) for (const r of m.mesaj.split("\n")) { assert.ok(r.length <= 160, "rând > 160: " + r); if (r.startsWith("👉 ")) assert.ok(r.length <= 113, "sfat > 110: " + r); }
  // fără reguliAtinse (evaluările vechi refăcute) ⇒ mesajul de dinainte, dar fără netul PE ZI la „peste prag”
  const ev0 = CO.evalueaza({ t, frana: OB.franaLaPornire(t, l, P7), afaraOre: null, banda: { dv: null, r: null }, dovezi: CO.dovezi(l, 7), motiv: null });
  assert.doesNotMatch(MC.evaluareBot(ev0).mesaj, /zilele tale cu peste/);
});
await test("4. minutele pe Discord (pe două axe): „ℹ️ … descriere, nu greșeală dovedită”, fără „la tine, sub 15 min comisioanele sunt N× grilele”; sfatul nu e despre minute", () => {
  const l = ziMica(), t = Object.assign({}, l[1], { inchis: l[1].pornit + 6 * MIN }), dv = DV.reguliDovezi(l, P7, [], acumDin(l));
  const ev = DV.cuAxe(CO.evalueaza({ t, frana: OB.franaLaPornire(t, l, P7), afaraOre: null, banda: { dv: null, r: null }, dovezi: { minute: { n: 40, grile: 10, comisioane: -34 } }, motiv: null }), dv, l, P7);
  const m = MC.evaluareBot(ev);
  assert.match(m.mesaj, /\nℹ️ Închis după 6 min: .*\(descriere, nu greșeală dovedită\)\./); assert.doesNotMatch(m.mesaj, /la tine, sub 15 min|❌ Închis/);
  assert.doesNotMatch(m.mesaj, /👉 Aș porni gridul doar când îl las să lucreze/); assert.match(m.titlu, /: pe plus \+1,0 USDT$/);
});

// ---------------- 5. raportul paginii: câmpurile noi, cele vechi păstrate, textele scoase ----------------
function scenariu() {
  const l = genereaza({ zile: 120, seed: 31 }), acum = acumDin(l), ult = l.slice().sort((a, b) => b.inchis - a.inchis).slice(0, 5);
  const inreg = ult.map((t, k) => ({ id: t.id, moneda: "SOL", dir: "long", pornit: t.pornit, inchis: t.inchis, net: t.net, verdict: t.net >= 0 ? "bune" : "ghinion", rele: k === 0 ? ["boti", "minute"] : [], bune: [], titlu: "SOL long: x", mesaj: "y" }));
  const deschise = [{ id: "d1", activ: true, pornitLa: acum - 30 * MIN, baza: "SOL.PERP", directie: "LONG", profitTotal: -0.4 }, { id: "d2", activ: true, pornitLa: acum - 3 * ORA, baza: "ETH.PERP", directie: "SHORT", profitTotal: 0.2 }];
  return { acum, P: P7, f: OB.frana({ trades: l, deschise, acum, praguri: P7 }), toate: l, deschise, motive: new Map(), inreg, st: {}, fl: OB.franaLaPornire, dovezi: CO.dovezi(l, 7), istoria: null, profit: null, banda: null, versiune: "v101.196", botiActivi: 2 };
}
let R = null, O = null;
await test("5. raportul: câmpurile noi (reguliDovezi pe 6 reguli, grafice, botiActivi, ultimInchis, axele pe fiecare evaluare) + TOATE cele vechi", () => {
  O = scenariu(); R = PC.raportPagina(O);
  for (const k of ["forma", "la", "versiune", "praguri", "sfat", "disciplina", "bine", "rau", "corectii", "azi", "seara", "porniri", "porniriN", "evaluariLegat", "evaluari", "nEvaluari", "verdicte", "reguli", "franaSapt", "oglinda", "oglindaNota", "profit"]) assert.ok(k in R, "lipsește câmpul vechi " + k);
  assert.deepEqual(R.reguliDovezi.map((x) => x.cod), ["frana", "prag", "dupaProasta", "treiLaRand", "ore6", "minute"]);
  for (const x of R.reguliDovezi) {
    for (const k of ["cod", "regula", "stare", "peBotCu", "peBotFara", "dif", "ic", "p", "pFamilie", "martor", "n", "zile", "text"]) assert.ok(k in x, x.cod + " fără " + k);
    assert.ok(["dovedita", "nedovedita", "contrazisa", "putine", "descriere"].includes(x.stare));
    if (DV.TESTATE.includes(x.cod) && x.stare !== "putine") { assert.equal(x.ic.length, 2); for (const k of ["blocati", "castig", "medieIntamplare", "p"]) assert.ok(k in x.martor); }
  }
  assert.deepEqual(R.grafice.durata.map((x) => x.et), ["sub 15 min", "15–60 min", "1–6 h", "peste 6 h"]);
  for (const x of R.grafice.durata) for (const k of ["et", "n", "zile", "netPeBot", "ic", "putine"]) assert.ok(k in x);
  assert.deepEqual(R.grafice.botiZi.map((x) => x.et), ["1–3", "4–7", "8–15", "16+"]);
  for (const x of R.grafice.botiZi) for (const k of ["et", "boti", "zile", "netPeBot", "ic", "putine"]) assert.ok(k in x);
  assert.deepEqual(R.grafice.proasta.map((x) => x.strat), ["1–7", "8–15", "16+"]); for (const x of R.grafice.proasta) for (const k of ["strat", "dupa", "altfel", "nDupa", "nAltfel"]) assert.ok(k in x);
  assert.equal(R.grafice.frana30.length, 30); assert.equal(R.grafice.frana30[29].zi, ziRo(O.acum)); for (const x of R.grafice.frana30) for (const k of ["zi", "trasa", "boti", "net"]) assert.ok(k in x);
  assert.equal(R.grafice.frana30[29].boti, O.toate.filter((t) => ziRo(t.pornit) === ziRo(O.acum)).length + 2, "azi: închișii + cei 2 încă porniți");
  assert.equal(R.botiActivi, 2); assert.equal(R.ultimInchis, Math.max(...O.toate.map((t) => t.inchis)));
  assert.equal(PC.raportPagina(Object.assign({}, O, { botiActivi: undefined })).botiActivi, 2, "fără câmp: din deschise");
  for (const e of R.evaluari) { for (const k of ["fataDeZi", "nZi", "reguliAtinse", "eticheta2", "titlu", "mesaj", "verdict", "net"]) assert.ok(k in e, "evaluare fără " + k); assert.match(e.eticheta2, /^(Pe plus|Pe minus|Noroc|Greșeala a costat), /); }
  const e0 = R.evaluari[0]; assert.ok(e0.reguliAtinse.some((a) => a.cod === "prag") && e0.reguliAtinse.some((a) => a.cod === "minute" && a.stare === "descriere"));
  assert.ok(JSON.stringify(R).length < 200000, "raportul rămâne mic: " + JSON.stringify(R).length);
});
await test("5. textele scoase: „minute” nu mai e greșeală (nici la „bine”, nici la „rău”, nici în sfat); „Cel mult 7” pe bot, nu pe zi; „după o zi proastă” pe straturi; regulile cu starea lor", () => {
  const tot = R.bine.concat(R.rau).join(" | ");
  assert.doesNotMatch(tot, /minute|Ții mai mult|ținut mai rar|×/); assert.doesNotMatch(R.sfat, /lasă gridul|în minute/);
  assert.doesNotMatch(tot, /pornești mai mulți boți|nu te oprești/);
  const c = Object.fromEntries(R.corectii.map((x) => [x.cod, x]));
  assert.deepEqual(R.corectii.map((x) => x.cod), ["frana", "prag", "dupaProasta", "treiLaRand", "banda", "minute"]);
  assert.doesNotMatch(c.prag.dece, /pe zi, celelalte|au dat .* pe zi/); assert.match(c.prag.dece, /^Al 8-lea bot al zilei și următorii: [+−]?\d.* pe bot/);
  assert.doesNotMatch(c.dupaProasta.dece, /pornești de obicei/); assert.match(c.dupaProasta.dece, /la același număr de boți în ziua proastă: boți (1–7|8–15|16\+): \d+,\d după o zi proastă, \d+,\d după celelalte/);
  assert.doesNotMatch(c.minute.dece, /comisioanele au luat|grilele au prins|×/); assert.match(c.minute.dece, /Durata se știe abia la închidere/); assert.equal(c.minute.ton, ""); assert.equal(c.minute.stareDovezi, "descriere");
  for (const k of ["frana", "prag", "dupaProasta", "treiLaRand"]) assert.equal(c[k].stareDovezi, R.reguliDovezi.find((x) => x.cod === k).stare);
  for (const l of R.rau.filter((x) => /^Pornești cu frâna trasă|^Ai trecut de pragul|^După /.test(x))) assert.match(l, / Regula ta; pe istoria ta, (dovedită|nedovedită|contrazisă|prea puține date)\.$/);
  // o singură zecimală în tot ce e nou
  const texte = R.reguliDovezi.map((x) => x.text).concat(R.evaluari.map((e) => e.eticheta2), R.corectii.map((x) => x.dece));
  for (const t of texte) assert.doesNotMatch(t, /\d,\d\d/, "două zecimale: " + t);
});
await test("5. pe datele frânei trase: „Pornești cu frâna trasă” poartă starea regulii; „după o zi proastă” fără „mai mulți”", () => {
  const z = R.rau.find((x) => /^Pornești cu frâna trasă/.test(x));
  if (z) assert.match(z, /Regula ta; pe istoria ta, /);
  assert.ok(!R.bine.some((t) => /^Închiderile în minute|^Ai ținut mai rar/.test(t)));
});

// ---------------- 6. determinism, memoria pe cheia arhivei, timpul ----------------
await test("6. determinist (mulberry32, sămânță fixă): două calcule de la zero dau același raport; memoria ține până se schimbă arhiva", () => {
  DV.golesteMemo(); const a = JSON.stringify(PC.raportPagina(O).reguliDovezi); DV.golesteMemo(); const b = JSON.stringify(PC.raportPagina(O).reguliDovezi);
  assert.equal(a, b);
  const C1 = DV.calculMemo(O.toate, P7, O.deschise, {}), C2 = DV.calculMemo(O.toate.slice(), P7, O.deschise, {}); assert.equal(C1, C2, "aceeași arhivă ⇒ aceeași socoteală, fără recalcul");
  const C3 = DV.calculMemo(O.toate.concat([Object.assign({}, O.toate[0], { id: "nou", pornit: O.acum - ORA, inchis: O.acum - MIN })]), P7, O.deschise, {}); assert.notEqual(C1, C3, "un bot nou ⇒ socoteală nouă");
});
await test("6. timpul: 2.500 de boți (999 de amestecări + martorii) sub 2 s; din memorie sub 50 ms", () => {
  const l = genereaza({ zile: 263, seed: 99, maxZi: 42 }); DV.golesteMemo();
  let t0 = Date.now(); DV.reguliDovezi(l, P7, [], acumDin(l)); const t1 = Date.now() - t0;
  t0 = Date.now(); DV.reguliDovezi(l, P7, [], acumDin(l)); const t2 = Date.now() - t0;
  console.log("       " + l.length + " de boți: " + t1 + " ms prima dată, " + t2 + " ms din memorie");
  assert.ok(l.length >= 2400, "boți " + l.length); assert.ok(t1 < 2000, t1 + " ms"); assert.ok(t2 < 50, t2 + " ms");
});

// ---------------- 7. pe datele reale (dacă arhiva auditului e în scratchpad) ----------------
const SCR = "C:/Users/Cimin/AppData/Local/Temp/claude/4e861e315d503741/af6830ac-1b75-445f-b332-e878fafb4356/scratchpad/";
const arh = ["audit-stat/date/boti.json", "audit-comp-stat/date/boti.json"].map((f) => SCR + f).find((f) => fs.existsSync(f));
if (arh) await test("7. datele reale (" + arh.split("scratchpad/")[1] + "): ce stare iese pe fiecare regulă; frâna rapidă = Obiceiuri bot cu bot", () => {
  const j = JSON.parse(fs.readFileSync(arh, "utf8")), toti = Array.isArray(j) ? j : j.boti || j.lista || [];
  const l = JT.din(toti).filter((t) => t && t.pornit != null && t.inchis != null), acum = Math.max(...l.map((t) => t.inchis)) + MIN;
  DV.golesteMemo(); const t0 = Date.now(), r = DV.reguliDovezi(l, P7, [], acum), ms = Date.now() - t0, C = DV.calculMemo(l, P7, [], {});
  let dF = 0; for (let i = 0; i < C.S.n; i++) { const d = new Set((OB.franaLaPornire(C.S.L[i].t, l, P7).depasit || []).map((x) => x.cod)); if ((d.has("zi") || d.has("sapt") || d.has("rand")) !== !!C.real.frana[i]) dF++; }
  console.log("       " + C.S.n + " de boți, " + C.S.zile.length + " de zile, " + ms + " ms; frâna diferită la " + dF + " boți");
  for (const x of r.reguliDovezi) console.log("       " + x.cod.padEnd(12) + (x.stare + "").padEnd(11) + " " + x.text);
  console.log("       straturi după o zi proastă: " + r.grafice.proasta.map((s) => s.strat + " " + s.dupa + "/" + s.altfel + " (" + s.nDupa + "/" + s.nAltfel + " zile)").join(" · "));
  assert.equal(dF, 0); assert.ok(ms < 2000, ms + " ms");
  const t3 = r.reguliDovezi.find((x) => x.cod === "treiLaRand"); assert.ok(t3.mecanic > 0, "mecanica „3 la rând” pozitivă pe datele lui");
  for (const x of r.reguliDovezi) assert.doesNotMatch(x.text, /\d,\d\d/);
});
else console.log("  --   7. datele reale: arhiva auditului nu e în scratchpad, sar peste");

console.log("\n" + (picate ? picate + " PICĂ din " + teste : "toate " + teste + " ok"));
process.exit(picate ? 1 : 0);
