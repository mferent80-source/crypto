// Proba v100.271-r (ideile mici rămase din auditul 29.10 al Crypto Radar) - șase reparații, fiecare cu testul care pica pe codul de dinainte.
//  1. „Mișcare mare” = O definiție și O cifră (GridCalcul.miscareMare: pe 24 h peste percentila 90 a mișcărilor pe o zi ale monedei, ~1 zi din 10):
//     Sfaturile (titlul cita maximul 4 h / 24 h - alerta „1,6× pe 24 h”, sfatul „2,8× pe 4 h” pe același bot), verdictul fișei, „cât mai ține
//     liniștea” (linisteTine), laboratorul gridului, „În mișcare mare” la Nasdaq pe Acasă (|azi| > 1,5 × P75), rândul Radar/Busola din Consiliu și
//     treapta de volatilitate din panoul de cost (ATR% ≥ 3 ⇒ percentila ATR% a monedei, ca atrPctMare). + rata de aprindere înainte / după.
//     NU e „dovedit” pe definiția nouă: proba Busolei („după mișcare gridul iese cel mai rău”) e pe pragul vechi; laboratorul o remăsoară.
//  2. setupQualityCurrent: trendul (și structura) intră în direcția setup-ului - SHORT cu trend în jos = LONG cu trend în sus.
//  3. Harta lichidărilor mai veche de ~30 min (niciun mesaj) nu intră în Master Verdict / Verdict Center (pondere 0), iar cipul o spune.
//  4. „Starea aplicației”: la acțiuni verificarea WS e „NU SE APLICĂ” (gri), nu „NEVERIFICAT … până la prima măsurătoare”.
//  5. grOreFisa: moneda tânără (sub 150 de zile de istoric) stă în memorie cu ora; o nouă căutare (KV + Pionex 60M) abia după ~1 h.
//  6. Cipul „ML Ensemble v2 OOS gate passed · N încercări”.
// Funcțiile din public/app.js se iau după text și rulează cu dependențele injectate (ca proba-v100267-b); bibliotecile din public/lib cu vm.
// PROBA_RAD = alt dosar cu public/ + functions/ (mutațiile); DATE_1H = dosarul cu barele de 1 h ale colectorului (doar citire) pentru rata reală.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { verifica } from "./garda-texte.mjs";

const RADS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAD = process.env.PROBA_RAD ? path.resolve(process.env.PROBA_RAD) : RADS;
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const APP = citeste("public", "app.js");
/* de la „function nume(” (sau „async function nume(”) la început de rând până la următoarea funcție de la început de rând */
const areFn = (nume) => APP.indexOf("\nfunction " + nume + "(") >= 0 || APP.indexOf("\nasync function " + nume + "(") >= 0;
const fnApp = (nume) => {
  let i = APP.indexOf("\nfunction " + nume + "("); if (i < 0) i = APP.indexOf("\nasync function " + nume + "(");
  assert.ok(i >= 0, "lipsește " + nume + " în app.js");
  const j = APP.slice(i + 10).search(/\n(async )?function /); return APP.slice(i + 1, j < 0 ? undefined : i + 10 + j);
};
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ").slice(0, 900)}`); }
}
const aprox = (a, b, eps, msg) => assert.ok(Number.isFinite(a) && Math.abs(a - b) <= eps, (msg || "") + ` așteptat ≈${b}, primit ${a}`);
function mulberry32(seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
console.log("\nV100.271-r · IDEILE MICI ALE AUDITULUI 29.10 · o definiție a mișcării + calitatea simetrică + harta veche + WS la acțiuni + monedele tinere + încercările ML\n");

for (const f of ["grid-calcul.js", "grid-proba.js", "grid-laborator.js", "alerte.js", "acasa.js"]) vm.runInThisContext(lib(f), { filename: f });
const { GridCalcul: G, GridLaborator: GL, Alerte: AL, Acasa: AC } = globalThis;
const S = new Function(`${lib("semnale-bot.js")}; return SemnaleBot;`)(); globalThis.SemnaleBot = S;
const SF = new Function(`${lib("sfaturi.js")}; return Sfaturi;`)();
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();

// ---------- bare sintetice: mers aleator cu agitația grupată (mulberry32), închideri {t,o,h,l,c} ----------
function bare(seed, n, pasMs, volBara, o = {}) {
  const rnd = mulberry32(seed), out = []; let p = 100, mult = 1, pana = 0;
  for (let i = 0; i < n; i++) {
    if (i >= pana) { mult = o.grupat === false ? 1 : 0.4 + 2.2 * rnd() * rnd(); pana = i + 20 + Math.floor(rnd() * (o.bloc || 300)); }
    const z = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()), coada = o.coada && rnd() < 0.03 ? 3 : 1;
    const o0 = p; p = p * Math.exp(volBara * mult * coada * z); out.push({ t: Date.UTC(2026, 3, 1) + i * pasMs, o: o0, h: Math.max(o0, p) * 1.001, l: Math.min(o0, p) * 0.999, c: p, v: 1 });
  }
  return out;
}
const M15 = 900000;
const B15 = [bare(271, 96 * 45, M15, 0.004), bare(272, 96 * 45, M15, 0.006, { coada: true }), bare(273, 96 * 45, M15, 0.003, { bloc: 900 })];
/* monedă „subțire” (fără cozi): mișcarea pe 24 h e mereu între 0,9% și 1,1% ⇒ 1,2 × P75 trece de P90 - aici se vede dacă o bară „mare” poate începe o liniște */
function subtire(seed, zile) {
  const rnd = mulberry32(seed), n = zile * 96, c = [];
  for (let i = 0; i < n; i++) c.push(i < 96 ? 100 * (1 + 0.001 * rnd()) : c[i - 96] * (1 + (rnd() < 0.5 ? -1 : 1) * (0.009 + 0.002 * rnd())));
  return c.map((v, i) => ({ t: Date.UTC(2026, 3, 1) + i * M15, o: i ? c[i - 1] : v, h: Math.max(v, i ? c[i - 1] : v) * 1.001, l: Math.min(v, i ? c[i - 1] : v) * 0.999, c: v, v: 1 }));
}
const SUBTIRI = [subtire(274, 45)];

// =============================== IDEEA 1: o definiție a mișcării ===============================
const BOT = (o) => Object.assign({ id: "1", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, pretCurent: 0.3907, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30, profitTotal: -1 }, o);
const RG = (o) => Object.assign({ r4h: 2.8, r24h: 1.6, miscare: true, sens: "coboara", s4h: -0.04, s24h: -0.05, mare: { mare: true, pct: 95, rata: "~1 zi din 10" } }, o);
const sfat = (bot, rg, cod) => SF.sfaturi({ bot, fisa: { regim: rg } }).find((x) => x.cod === cod);
const cifra24 = (t) => { const m = /(\d+,\d)× (?:obișnuitul )?pe 24 h/.exec(t); return m ? m[1] : null; };

await test("1a Sfatul „Mișcare mare” citează cifra alertei (pe 24 h), nu maximul cu 4 h: alerta „1,6× pe 24 h” = sfatul „1,6× obișnuitul pe 24 h”", () => {
  const b = BOT(), rg = RG(), s = sfat(b, rg, "miscare"), a = AL.reguli(b, { regim: rg }).miscare;
  assert.ok(s, "sfatul „miscare” lipsește"); assert.ok(a && a.nivel !== "ok", "alerta lipsește");
  assert.equal(s.titlu, "Mișcare mare contra botului: 1,6× obișnuitul pe 24 h");
  assert.equal(cifra24(s.titlu), cifra24(a.titlu), `sfatul „${s.titlu}” ≠ alerta „${a.titlu}”`);
  assert.doesNotMatch(s.titlu, /2,8×|(?<!2)4 h/);
  assert.match(s.text, /^Pe 4 h e 2,8× obișnuitul; /);
  assert.match(s.sursa, /pe 24 h peste 9 zile din 10/); assert.match(s.sursa, /~1 zi din 10/);
  for (const [t, tip] of [[s.titlu, "titlu"], [s.text, "deCe"]]) assert.deepEqual(verifica(t, tip), [], tip + ": " + t);
  /* și când 24 h e mai mare decât 4 h: aceeași formă */
  const s2 = sfat(b, RG({ r4h: 1.2, r24h: 1.9 }), "miscare"); assert.equal(s2.titlu, "Mișcare mare contra botului: 1,9× obișnuitul pe 24 h"); assert.match(s2.text, /^Pe 4 h e 1,2× obișnuitul; /);
});
await test("1b Sfatul „Mișcare cu botul”: tot cifra pe 24 h, ca alerta „mișcare mare cu botul, 1,6× pe 24 h”", () => {
  const b = BOT({ directie: "short" }), rg = RG(), s = sfat(b, rg, "miscare-cu"), a = AL.reguli(b, { regim: rg }).miscare;
  assert.ok(s, "sfatul „miscare-cu” lipsește"); assert.match(a.titlu, /cu botul, 1,6× pe 24 h/);
  assert.equal(s.titlu, "Mișcare cu botul: 1,6× obișnuitul pe 24 h");
  assert.equal(cifra24(s.titlu), cifra24(a.titlu));
  assert.match(s.text, /^Pe 4 h e 2,8× obișnuitul, în direcția botului: grilele de jos încasează pe drum/);
  for (const [t, tip] of [[s.titlu, "titlu"], [s.text, "deCe"]]) assert.deepEqual(verifica(t, tip), [], tip + ": " + t);
});
await test("1c verdictul fișei: rândul „mișcare” citează cifra pe 24 h (1,6×), nu maximul (2,8×); fără „dovedit”; ≤ 110", () => {
  const v = G.verdict({ regim: RG(), stat: { antren: { lichidari: 0, mediana: 0.01 }, test: { lichidari: 0, mediana: 0.01, medie: 0.01 } }, zile: 30, pozitie: 0.5 });
  const m = v.motive[0];
  assert.equal(v.nivel, "nu");
  assert.equal(m, "prețul abia a făcut o mișcare mare: 1,6× obișnuitul pe 24 h — un grid pornit după mișcare iese cel mai rău");
  assert.doesNotMatch(m, /dovedit|2,8/); assert.deepEqual(verifica(m, "rand"), [], m);
  /* fără cifra pe 24 h: tot „mișcare mare”, fără „NaN” */
  const v2 = G.verdict({ regim: { miscare: true, r4h: 2.8, r24h: null }, stat: { antren: { lichidari: 0, mediana: 0.01 } }, zile: 30 });
  assert.doesNotMatch(v2.motive[0], /NaN|null|undefined|2,8/); assert.match(v2.motive[0], /mișcare mare/);
});
await test("1d linisteTine: o mișcare mare (definiția comună) încheie liniștea - niciodată „liniște acum” cu mișcarea pe 24 h peste percentila 90", () => {
  let verif = 0, rele = [];
  for (const [serii, pas] of [[B15, 7], [SUBTIRI, 2]]) for (const b of serii) for (let n = 2 * 96 + 50; n <= b.length; n += pas) {
    const w = b.slice(0, n), mm = G.miscareMare(w, { k: 96 }); if (mm.mare !== true) continue;
    verif++; const L = G.linisteTine(w, 1); if (L && L.linisteAcum) rele.push(n + ": pct " + mm.pct.toFixed(1) + ", r " + mm.r.toFixed(2));
  }
  assert.ok(verif >= 30, "prea puține situații cu mișcare mare: " + verif);
  assert.equal(rele.length, 0, rele.length + " din " + verif + " cu „liniște acum” peste P90: " + rele.slice(0, 6).join("; "));
});
await test("1e linisteTine: liniștea începe sub 1,2 × P75 (ca înainte), dar niciodată peste P90 - o bară „mare” nu începe o liniște", () => {
  /* la ultima bară: liniștea abia începută (zileLiniste ≈ 0) ⇒ mișcarea de acum pe 24 h e sub min(1,2 × P75, P90) */
  let verif = 0, rele = [];
  for (const b of B15.concat(SUBTIRI)) for (let n = 2 * 96 + 50; n <= b.length; n += 3) {
    const w = b.slice(0, n), L = G.linisteTine(w, 1); if (!L || !L.linisteAcum || L.zileLiniste > 1.5 / 96) continue;
    const m = []; for (let i = 96; i < w.length; i++) m.push(Math.abs(w[i].c - w[i - 96].c) / w[i - 96].c);
    verif++; const p75 = G.percentila(m, 0.75), p90 = G.percentila(m, 0.9), azi = m[m.length - 1];
    if (!(azi < Math.min(1.2 * p75, p90))) rele.push(n + ": azi " + (azi / p75).toFixed(2) + "× P75, " + (azi / p90).toFixed(2) + "× P90");
  }
  assert.ok(verif >= 10, "prea puține începuturi de liniște: " + verif);
  assert.equal(rele.length, 0, rele.length + " din " + verif + " începuturi peste prag: " + rele.slice(0, 6).join("; "));
});
await test("1f laboratorul gridului: „pornit după mișcare” = pe 24 h peste P90 din primele 2/3 (fără 4 h, fără 1,5 × P75); liniștea ca în linisteTine", () => {
  let rand = 0;
  for (const b of B15.concat(SUBTIRI)) {
    const rows = GL.ferestre(b, 2), nA = Math.round(b.length * 2 / 3), l24 = [], m24 = (i) => i >= 96 ? Math.abs(b[i].c - b[i - 96].c) / b[i - 96].c : null;
    for (let i = 96; i < nA; i++) l24.push(m24(i));
    const p75 = G.percentila(l24, 0.75), p90 = G.percentila(l24, 0.9), intra = Math.min(1.2 * p75, p90);
    /* zilele de liniște cerute: histerezisul lui linisteTine (intră sub min(1,2 × P75, P90), iese la prima mișcare mare, peste P90) */
    const run = []; let inMis = true, lung = 0;
    for (let i = 0; i < b.length; i++) { const m = m24(i); if (m === null) inMis = true; else if (inMis && m < intra) inMis = false; else if (!inMis && m > p90) inMis = true; lung = inMis ? 0 : lung + 1; run[i] = lung; }
    assert.ok(rows.length > 50, "ferestre: " + rows.length);
    for (const r of rows) {
      const u = r.s - 1; rand++;
      assert.equal(r.miscare, m24(u) > p90, `fereastra ${r.s}: miscare=${r.miscare}, m24/P90=${(m24(u) / p90).toFixed(2)}`);
      if (r.miscare) assert.equal(r.linisteZile, 0, `fereastra ${r.s}: după mișcare mare, liniște de ${r.linisteZile} zile`);
      assert.equal(r.linisteZile, run[u] / 96, `fereastra ${r.s}: liniște de ${r.linisteZile} zile, cerut ${run[u] / 96}`);
    }
  }
  assert.ok(rand > 150);
});
/* bare zilnice ale unei acțiuni: ultima zi cu mișcarea dată (|azi| / P75 = r) - pentru Nasdaq */
const zilnice = (seed, n, ultima) => { const b = bare(seed, n, 86400000, 0.018, { coada: true, bloc: 40 }).map((x) => ({ t: x.t, c: x.c })); if (ultima != null) b[b.length - 1].c = b[b.length - 2].c * (1 + ultima); return b; };
await test("1g Nasdaq pe Acasă: rezumatActiune spune `mare` = GridCalcul.miscareMare (k = 1 zi), la fel ca pagina Acțiuni", () => {
  let n = 0, difVechi = 0;
  for (let s = 1; s <= 60; s++) for (const ult of [null, 0.01, 0.025, 0.04, -0.03, -0.06]) {
    const b = zilnice(1000 + s, 260, ult), z = AC.rezumatActiune(b), mm = G.miscareMare(b, { k: 1 });
    assert.equal(typeof z.mare, "boolean", "rezumatActiune fără `mare` (seed " + s + ")");
    assert.equal(z.mare, mm.mare, "seed " + s + " ult " + ult + ": mare " + z.mare + " vs " + mm.mare); n++;
    if ((z.mis > 1.5) !== mm.mare) difVechi++;
  }
  assert.ok(n > 300); assert.ok(difVechi > 0, "datele de probă nu despart definiția veche de cea nouă");
});
await test("1h Nasdaq pe Acasă: „În mișcare mare” și ⚡ din top numără după `mare` (definiția comună), nu după mis > 1,5; rândurile vechi fără `mare` rămân pe raport", () => {
  const l = [{ s: "AAA", ch: 2.1, mis: 1.4, mare: true }, { s: "BBB", ch: -3.2, mis: 1.7, mare: false }, { s: "CCC", ch: 1.1, mis: 1.6 }, { s: "DDD", ch: -0.4, mis: 0.3, mare: false }];
  const r = AC.largimeNdx(l);
  assert.deepEqual(r.inMiscare, ["AAA", "CCC"]);
  assert.equal(r.sus.find((x) => x.s === "AAA").miscare, true); assert.equal(r.jos.find((x) => x.s === "BBB").miscare, false);
  /* serverul (t212.js, salveazaNdx) păstrează câmpul `mare` - altfel pagina nu-l vede niciodată */
  const T = citeste("functions", "api", "t212.js"), i = T.indexOf("async function salveazaNdx("), corp = T.slice(i, T.indexOf("\n}\n", i));
  assert.ok(i > 0, "lipsește salveazaNdx");
  /* doar când vine (rândurile fără el rămân identice cu cele de dinainte - proba acasa-v93 le compară) */
  assert.match(corp, /\.\.\.\(typeof \(x && x\.mare\) === "boolean" \? \{ mare: x\.mare \} : \{\}\)/, "salveazaNdx nu păstrează `mare`");
});
await test("1i Consiliul: rândul Radar / Busola spune definiția comună (pe 24 h, ~1 zi din 10), nu „4h/24h față de obișnuit”; ≤ 110", () => {
  const sm = S.semafor({ bot: BOT(), fisa: null }), x = (busola, regim) => CS.alcatuieste({ sm, concret: [], sfaturi: [], busola, regim });
  const a = x({ stare: "miscare" }, { miscare: false }).busolaVsRadar, b = x({ stare: "liniste" }, { miscare: true }).busolaVsRadar;
  assert.equal(a, "Radarul: liniște (24 h, prag ~1 zi din 10) · Busola: mai agitată (ATR 4h față de un an) — orizonturi diferite");
  assert.equal(b, "Radarul: mișcare (24 h, prag ~1 zi din 10) · Busola: mai calmă (ATR 4h față de un an) — orizonturi diferite");
  for (const t of [a, b]) { assert.ok(t.length <= 110, "lung: " + t.length); assert.doesNotMatch(t, /4h\/24h/); }
});
/* panoul de cost (executionFriction): treapta de volatilitate din percentila ATR% a monedei (q.atrPctPercentila, atrPctMare), nu ATR% ≥ 3 */
function frictiune(q) {
  const box = { Math, Number, window: { __signalState: null }, appSettings: () => ({ feeBps: 4 }), areVolLipsa: () => false };
  vm.createContext(box); vm.runInContext(fnApp("executionFriction"), box);
  const j = Array.from({ length: 20 }, (_, i) => [i, 100, 101, 99, 100, 5000]);
  return box.executionFriction({ j, q, source: "BINANCE" });
}
await test("1j panoul de cost: treapta de volatilitate = percentila ATR% a monedei (HIGH de la P80, ca atrPctMare), nu ATR% ≥ 3; costul rămâne pe ATR%", () => {
  const t = (atrPct, p, scurt = false) => frictiune({ atrPct, atrPctPercentila: p, atrIstoricScurt: scurt });
  assert.equal(t(4, 50).volTier, "NORMAL", "ATR 4% dar obișnuit pentru monedă");
  assert.equal(t(1, 90).volTier, "HIGH", "ATR 1% dar mare pentru monedă (pe 15m nu trecea niciodată de 3%)");
  assert.equal(t(1, 80).volTier, "HIGH"); assert.equal(t(1, 79.9).volTier, "NORMAL");
  assert.equal(t(2, 96).volTier, "EXTREME"); assert.equal(t(7, 10).volTier, "LOW");
  assert.equal(t(2, null, true).volTier, "NECUNOSCUT (istoric scurt)");
  assert.equal(t(4, 50).slippageBps, t(4, 95).slippageBps, "alunecarea trebuie să rămână pe ATR% (bani), nu pe treaptă");
  aprox(t(4, 50).slippageBps, 12 + 4 * 0.85, 1e-9, "alunecarea (12 bps lichiditatea la 0,5 mil. pe bară + 0,85 × ATR%):");
});
// rata de aprindere înainte / după, pe aceleași bare (fereastra = istoricul pe care îl vede fișa, ~30 de zile; la fiecare 6 h)
function rate(b, k4, k24, W, pas) {
  let n = 0, vechi = 0, vechi24 = 0, nou = 0;
  for (let e = W; e <= b.length; e += pas) {
    const w = b.slice(e - W, e), r = (k) => { const m = []; for (let i = k; i < w.length; i++) m.push(Math.abs(w[i].c - w[i - k].c) / w[i - k].c); return m[m.length - 1] / G.percentila(m, 0.75); };
    const r4 = r(k4), r24 = r(k24); n++;
    if (r4 > 1.5 || r24 > 1.5) vechi++; if (r24 > 1.5) vechi24++;
    if (G.miscareMare(w, { k: k24 }).mare === true) nou++;
  }
  return { n, vechi: vechi / n, vechi24: vechi24 / n, nou: nou / n };
}
const pc = (x) => (x * 100).toFixed(1).replace(".", ",") + "%";
await test("1k rata de aprindere înainte / după pe aceleași bare (descriptiv: ~1 zi din 10 după; nu e un test „dovedit”)", () => {
  const tot = { n: 0, vechi: 0, vechi24: 0, nou: 0 }, adauga = (r) => { for (const k of ["vechi", "vechi24", "nou"]) tot[k] += r[k] * r.n; tot.n += r.n; };
  for (const b of B15) adauga(rate(b, 16, 96, 30 * 96, 24));
  console.log(`       sintetic 15 min (3 monede, fereastra 30 z, la 6 h, n ${tot.n}): înainte (4 h SAU 24 h > 1,5 × P75) ${pc(tot.vechi / tot.n)} · doar 24 h > 1,5 × P75 (liniștea, laboratorul) ${pc(tot.vechi24 / tot.n)} · după (24 h > P90) ${pc(tot.nou / tot.n)}`);
  assert.ok(tot.nou / tot.n > 0.04 && tot.nou / tot.n < 0.2, "după: " + pc(tot.nou / tot.n));
  const dir = process.env.DATE_1H || path.join(RAD, "data", "istoric-1h");
  if (!fs.existsSync(dir)) { console.log("       barele reale de 1 h lipsesc (DATE_1H) - doar sinteticul"); return; }
  const real = { n: 0, vechi: 0, vechi24: 0, nou: 0 }, zi = { n: 0, vechi: 0, nou: 0 };
  let monede = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    let b; try { b = G.bare(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))); } catch { continue; }
    if (!b || b.length < 30 * 24 + 48) continue; monede++;
    const r = rate(b, 4, 24, 30 * 24, 6); for (const k of ["vechi", "vechi24", "nou"]) real[k] += r[k] * r.n; real.n += r.n;
    /* pe ZILE (unitatea independentă): ziua „aprinsă” dacă cel puțin o probă de 6 h din ea s-a aprins */
    const pz = rate(b, 4, 24, 30 * 24, 24); zi.n += pz.n; zi.vechi += pz.vechi * pz.n; zi.nou += pz.nou * pz.n;
  }
  console.log(`       real 1 h (${monede} monede, ${real.n} probe la 6 h): înainte ${pc(real.vechi / real.n)} · doar 24 h > 1,5 × P75 ${pc(real.vechi24 / real.n)} · după ${pc(real.nou / real.n)}; o probă pe zi (${zi.n}): înainte ${pc(zi.vechi / zi.n)} · după ${pc(zi.nou / zi.n)}`);
  assert.ok(real.nou / real.n > 0.03 && real.nou / real.n < 0.25, "după, real: " + pc(real.nou / real.n));
});

// =============================== IDEEA 2: calitatea setup-ului, simetrică ===============================
/* revizia 29.10: volumul are sens ⇒ oglinda lui 60 la LONG e 40 la SHORT (cazurile 2a / 2b compară oglinzi) */
function calitate({ dir, trend, mom, structura = 50, volum = dir === "SHORT" ? 40 : 60 }) {
  const long = dir === "LONG", tm = dir === "WAIT" ? { direction: "WAIT", entryLow: 99.5, entryHigh: 100.5, stop: 95, tp2: 110 } : long ? { direction: "LONG", entryLow: 99.5, entryHigh: 100.5, stop: 95, tp2: 110 } : { direction: "SHORT", entryLow: 99.5, entryHigh: 100.5, stop: 105, tp2: 90 };
  const box = {
    Math, Number, Date, window: { __radarState: { symbol: "ETHUSDT", source: "BINANCE", q: { trendScore: trend, momScore: mom, structureScore: structura, volScore: volum, smc: { trap: false }, regime: "RANGE" } }, __signalState: { sm: { long: long ? 70 : 30, short: long ? 30 : 70 }, tm }, __microState: null },
    assetClass: () => "CRYPTO", coin: (s) => String(s).replace(/USDT$/, ""), dataFresh: { rest: Date.now() }, analysisSource: () => "BINANCE", appSettings: () => ({ signalMin: 55 }),
    journalReliabilityForCoin: () => ({ n: 0, exp: 0 }), stockSymbol: (s) => s,
  };
  vm.createContext(box); vm.runInContext(["clamp", "researchGrade", "setupQualityCurrent"].map(fnApp).join("\n"), box);
  return box.setupQualityCurrent();
}
await test("2a setupQualityCurrent pe 4 cazuri: LONG cu trend în sus = SHORT cu trend în jos; LONG cu trend în jos = SHORT cu trend în sus", () => {
  const A = calitate({ dir: "LONG", trend: 80, mom: 76 }), B = calitate({ dir: "SHORT", trend: 20, mom: 24 });
  const C = calitate({ dir: "LONG", trend: 20, mom: 24 }), D = calitate({ dir: "SHORT", trend: 80, mom: 76 });
  aprox(B.trend, A.trend, 1e-9, "trendul SHORT/jos față de LONG/sus:"); aprox(B.overall, A.overall, 1e-9, "calitatea SHORT/jos față de LONG/sus:"); assert.equal(B.grade, A.grade);
  aprox(D.trend, C.trend, 1e-9, "trendul SHORT/sus față de LONG/jos:"); aprox(D.overall, C.overall, 1e-9, "calitatea SHORT/sus față de LONG/jos:");
  assert.ok(A.trend > C.trend && B.trend > D.trend, `cu trendul > contra trendului: LONG ${A.trend}/${C.trend}, SHORT ${B.trend}/${D.trend}`);
  aprox(A.trend, 78, 1e-9, "LONG/sus rămâne ca înainte:");
});
/* revizia 29.10: și volumul are sens (lumânare în sus cu volum mare = peste 50) - SHORT cu volum pe scădere = LONG cu volum pe creștere */
await test("2c setupQualityCurrent: și volumul intră în direcția setup-ului - SHORT cu volum pe scădere = LONG cu volum pe creștere", () => {
  const A = calitate({ dir: "LONG", trend: 50, mom: 50, volum: 82 }), B = calitate({ dir: "SHORT", trend: 50, mom: 50, volum: 18 });
  aprox(B.liq, A.liq, 1e-9, "lichiditatea SHORT/volum în jos față de LONG/volum în sus:"); aprox(B.overall, A.overall, 1e-9, "calitatea:");
});
await test("2b setupQualityCurrent: și structura (BOS / sweep, peste 50 = în sus) intră în direcția setup-ului - SHORT cu structură în jos = LONG cu structură în sus", () => {
  const A = calitate({ dir: "LONG", trend: 50, mom: 50, structura: 80 }), B = calitate({ dir: "SHORT", trend: 50, mom: 50, structura: 20 });
  aprox(B.entry, A.entry, 1e-9, "intrarea:"); aprox(B.overall, A.overall, 1e-9, "calitatea:");
  const C = calitate({ dir: "SHORT", trend: 50, mom: 50, structura: 80 }); assert.ok(C.entry < B.entry, "SHORT cu structura în sus trebuie să iasă mai slab: " + C.entry + " vs " + B.entry);
});
await test("2c setupQualityCurrent: fără direcție (WAIT) rămâne ca înainte (trendul brut, blocajul „No directional setup”)", () => {
  const W = calitate({ dir: "WAIT", trend: 80, mom: 76, structura: 70 });
  aprox(W.trend, 78, 1e-9, "trend:"); aprox(W.entry, 55 + 70 * 0.25 + 10, 1e-9, "intrare:"); assert.equal(W.blocker, "No directional setup");
});

// =============================== IDEEA 3: harta lichidărilor veche ===============================
class El {
  constructor() { this.textContent = ""; this.className = ""; this.innerHTML = ""; this.hidden = false; this.style = {}; this.children = []; this.classList = { contains: (c) => String(this.className).split(/\s+/).includes(c) }; }
  append(...x) { this.children.push(...x); } appendChild(x) { this.children.push(x); return x; } replaceChildren(...x) { this.children = [...x]; }
}
const pagina = () => { const els = {}; return { els, $: (id) => (els[id] ??= new El()) }; };
const MOTOR = (() => { const i = APP.indexOf("\nvar MOTOR_PONDERI="); assert.ok(i >= 0, "lipsește MOTOR_PONDERI în app.js"); return APP.slice(i + 1, APP.indexOf("};", i) + 2); })();
const MIN = 60000;
/* renderMasterVerdict întreg, cu modulele din jur ca stub-uri (ca proba-v100267-b) */
function verdict({ dir = "LONG", conf = 60, varstaMin = null, heat = null, ml = null } = {}) {
  const { els, $ } = pagina(); let expl = null; const acum = Date.now();
  const window = { __radarState: { symbol: "ETHUSDT", tf: "4h" }, __signalState: { tm: { direction: dir, entryLow: 100, entryHigh: 101, stop: dir === "LONG" ? 95 : 105, tp1: 103, tp2: 106, tp3: 109 }, sm: { long: dir === "LONG" ? conf : 100 - conf, short: dir === "SHORT" ? conf : 100 - conf } } };
  /* două evenimente: cel mai nou (orice monedă) dă vârsta hărții */
  const liqEvents = varstaMin == null ? [] : [{ symbol: "XRPUSDT", ts: acum - varstaMin * MIN, notional: 1 }, { symbol: "BTCUSDT", ts: acum - (varstaMin + 180) * MIN, notional: 1 }];
  const h = heat || (varstaMin == null ? { rows: [], short: 0, long: 0 } : { rows: [{ ts: acum - 2 * 3600000 }], short: 3e6, long: 1e6 });
  const nume = ["clamp", "contextScoreFrom", "v64BreadthAlignment", "renderMasterVerdict"].concat(areFn("liqHartaVarsta") ? ["liqHartaVarsta"] : []);
  const box = {
    window, $, TextRo: globalThis.TextRo, liqEvents, Date, Math, Number, JSON, Object, Array, String, Set, Map,
    renderVerdictCenter: () => ({}), renderVerdictExplainer: (a) => { expl = a; return {}; }, masterDataQuality: () => 92,
    regimeV2State: null, renderRegimeV2: () => null, currentMetaDecision: () => ({ action: "WAIT", p: NaN, state: "LEARNING" }),
    calibrationV2State: null, renderCalibrationV2: () => null, decisionStateMatches: (x) => !!x, trueFlowState: null,
    observedLiquidationHeatmap: () => h, setupQualityCurrent: () => null,
    portfolioBudgetSummary: () => ({ state: "PASS" }), governedComponents: () => ({}),
    strategyLifecycle: () => ({ state: "ACTIVE" }), riskGuard: () => ({ state: "OK", mult: 1 }), externalIntelState: {},
    v65DecisionSuite: () => ({ killSwitch: { state: "NORMAL", detail: "" }, conflict: { state: "CLEAR", score: 80, detail: "" }, failure: { state: "NONE" }, eventRisk: { state: "CLEAR" }, entry: { action: "ENTER", state: "OK" }, exit: { action: "HOLD", state: "OK" }, summary: { state: "OK", quality: 80 } }),
    v66EdgeValidationSuite: () => ({ state: "OK", score: 70, quality: { score: 70 }, hardBlock: false, hardReasons: [], decay: { state: "STABLE", detail: "" }, dna: { state: "NEUTRAL", current: { n: 0 } }, sufficiency: { state: "OK", score: 70 } }),
    assetClass: () => "CRYPTO", FuturesCitire: { inVerdict: () => null }, driftSnapshot: null,
    metaEnsembleV2: ml ? { models: { a: 1 }, config: { maxDisagreement: 0.2 } } : null, ensembleCurrentPrediction: () => ml, ensembleV2Config: () => ({ maxDisagreement: 0.2 }),
    verdictChip: (x) => x, num: (x) => String(x), compact: (x) => String(x), activeModelVersionId: null, metaLabelState: null, mlShadow: null, extMinsText: String,
    renderProfitReadiness: () => {}, renderV65DecisionOS: () => {}, renderV66EdgeValidation: () => {},
  };
  vm.createContext(box); vm.runInContext(MOTOR + "\n" + nume.map(fnApp).join("\n"), box, { filename: "app-extras.js" });
  const mv = box.renderMasterVerdict();
  const fam = Object.fromEntries((window.__masterFamilyScores || []).map((f) => [f.family, f.v]));
  return { mv, expl, els, fam };
}
await test("3a Master Verdict: harta lichidărilor fără mesaj de 45 min nu intră (familia FLOW lipsește) și celula spune „harta lichidărilor veche (de 45 min)”", () => {
  const r = verdict({ varstaMin: 45 });
  assert.equal(r.fam.FLOW, undefined, "FLOW=" + r.fam.FLOW);
  assert.equal(r.els.masterLiquidation.textContent, "harta lichidărilor veche (de 45 min)");
  assert.ok(!(r.expl.pos || []).concat(r.expl.risks || []).some((x) => /Observed liquidations/.test(x)), "„aligned / opposed” din harta veche");
  const ore = verdict({ varstaMin: 5 * 60 + 18 }); assert.equal(ore.els.masterLiquidation.textContent, "harta lichidărilor veche (de 5,3 h)");
  const zile = verdict({ varstaMin: 3 * 1440 + 100 }); assert.equal(zile.els.masterLiquidation.textContent, "harta lichidărilor veche (de 3 zile)");
});
await test("3b Master Verdict: harta proaspătă (ultimul mesaj acum 2 min, orice monedă) intră ca înainte: FLOW = (short − long) / total", () => {
  const r = verdict({ varstaMin: 2 });
  aprox(r.fam.FLOW, 0.5, 1e-9, "FLOW:"); assert.equal(r.els.masterLiquidation.textContent, "SHORTS hit · 4000000");
  assert.ok((r.expl.pos || []).includes("Observed liquidations aligned"));
  const p30 = verdict({ varstaMin: 29 }); aprox(p30.fam.FLOW, 0.5, 1e-9, "la 29 min: ");
});
await test("3c Verdict Center: modulul „Observed liquidation tape” cu harta veche = indisponibil, pondere 0, valoarea „harta lichidărilor veche (de X min)”", () => {
  const sursa = fnApp("buildVerdictCenterSnapshot"), a = sursa.indexOf("const liqBias="), b = sursa.indexOf("\n", sursa.indexOf('add(vcItem("Observed liquidation tape"', a));
  assert.ok(a > 0 && b > a, "nu găsesc rândurile lichidărilor în buildVerdictCenterSnapshot");
  const MP = new Function(MOTOR + "; return MOTOR_PONDERI;")();
  /* vcItem / vcBiasLabel / clamp reale (ponderea și disponibilitatea le pune vcItem); pw ca în buildVerdictCenterSnapshot, din MOTOR_PONDERI */
  const ruleazaFrag = (varstaMin) => {
    const acum = Date.now(), ctx = { Math, Number, Date, String, TextRo: globalThis.TextRo, MOTOR_PONDERI: MP, liqEvents: [{ symbol: "XRPUSDT", ts: acum - varstaMin * MIN }], item: null };
    ctx.heat = { rows: [{ ts: acum - 3600000 }], short: 3e6, long: 1e6 }; ctx.compact = String;
    ctx.add = (x) => { ctx.item = x; }; ctx.pw = (k, o = {}) => ({ ...o, weight: MP[k].w });
    vm.createContext(ctx);
    vm.runInContext(["clamp", "vcBiasLabel", "vcItem"].concat(areFn("liqHartaVarsta") ? ["liqHartaVarsta"] : []).map(fnApp).join("\n") + "\nitem=null;" + sursa.slice(a, b) + "\n", ctx); return ctx.item;
  };
  const vechi = ruleazaFrag(45), nou = ruleazaFrag(3);
  assert.equal(vechi.available, false, JSON.stringify(vechi)); assert.equal(vechi.weight, 0, "ponderea hărții vechi"); assert.ok(!Number.isFinite(vechi.bias));
  assert.equal(vechi.value, "harta lichidărilor veche (de 45 min)");
  assert.equal(nou.available, true); aprox(nou.bias, 0.5, 1e-9, "bias:"); aprox(nou.weight, 0.06, 1e-9, "ponderea:"); assert.equal(nou.value, "Long 1000000 · Short 3000000");
});

// =============================== IDEEA 4: WS la acțiuni ===============================
function ops(clasa, cuAnaliza = true, tick = 0) {
  const NOW = Date.UTC(2026, 9, 29, 12);
  const box = {
    Math, Number, Date, JSON, window: { __providerHealthV62: null, __decisionIntelV65: null, __radarState: cuAnaliza ? { symbol: "X" } : null }, navigator: { onLine: true },
    v67Now: () => NOW, v67OpsSettings: () => ({ watchdogMs: 30000, heartbeatStaleMs: 90000, wsStaleMs: 60000, providerStaleMs: 1200000, duplicateWindowMs: 900000 }),
    v60StoreGet: (k, d) => d, v60StoreSet: () => {}, v67LastReconcile: { activeDuplicateFingerprints: 0 }, v67ReconcileArrays: () => ({ activeDuplicateFingerprints: 0 }),
    paperTrades: () => [], shadowTradesV60: () => [], paperMigrateTrade: () => {}, paperOrderActive: () => false, v67ManualState: () => false, localDbSupported: () => true,
    v67Incidents: () => [], assetClass: () => clasa, lastWsTick: tick, appSettings: () => ({}), escapeHtml: (s) => String(s), v67RecoverySnapshot: () => ({}),
  };
  vm.createContext(box); vm.runInContext(["v67OpsScore", "v67OperationsSnapshot", "v67OpsToolHtml"].map(fnApp).join("\n"), box);
  const x = box.v67OperationsSnapshot(false), ws = x.checks.find((c) => c.code === "WS");
  return { x, ws, html: box.v67OpsToolHtml(ws) };
}
await test("4a „Starea aplicației” la acțiuni: WS = „NU SE APLICĂ” (gri), nu „NEVERIFICAT … până la prima măsurătoare”; nu stă în „încă nemăsurat”", () => {
  const r = ops("STOCKS");
  assert.equal(r.ws.nuSeAplica, true, JSON.stringify(r.ws));
  assert.match(r.html, /<span class="decisionToolState">NU SE APLICĂ<\/span>/); assert.match(r.html, /class="decisionTool mutedInfo"/);
  assert.doesNotMatch(r.html, /NEVERIFICAT|prima măsurătoare/);
  assert.ok(!r.x.nemasurate.includes("WS"), "nemăsurate: " + r.x.nemasurate.join(","));
  assert.equal(r.x.state, "NORMAL"); assert.equal(r.x.score, 100);
});
await test("4b la crypto rămâne ca înainte: fără prima bătaie NEVERIFICAT, cu bătaie veche WARN, proaspătă OK", () => {
  const NOW = Date.UTC(2026, 9, 29, 12);
  const a = ops("CRYPTO", true, 0); assert.match(a.html, /NEVERIFICAT/); assert.ok(a.x.nemasurate.includes("WS")); assert.ok(!a.ws.nuSeAplica);
  const b = ops("CRYPTO", true, NOW - 5 * MIN); assert.equal(b.ws.ok, false); assert.match(b.html, />WARN</);
  const c = ops("CRYPTO", true, NOW - 10000); assert.equal(c.ws.ok, true); assert.match(c.html, />OK</);
});

// =============================== IDEEA 5: monedele tinere pe pagina Grid ===============================
await test("5a grOreFisa: moneda tânără (~33 de zile) - prima dată KV + Pionex, a doua oară (5 min mai târziu) NIMIC; după ~1 h caută din nou", async () => {
  const H1 = 3600000; let ACUM = Date.UTC(2026, 9, 29, 12); const cereri = [];
  const rand = (t) => ({ time: t, open: "1", high: "1.1", low: "0.9", close: "1" });
  const pag = (end, n) => Array.from({ length: n }, (_, i) => rand(Math.floor(end / H1) * H1 - i * H1)).reverse();
  const NASCUT = ACUM - 800 * H1;   /* prima bară a monedei: Pionex nu are nimic mai vechi */
  const box = {
    GridCalcul: G, Math, Number, Object, Array, isFinite, Infinity, encodeURIComponent, grPauza: async () => {},
    Date: { now: () => ACUM },
    getJSON: async (u) => { cereri.push(u); if (/action=ore/.test(u)) return { ore: null }; const m = /endTime=(\d+)/.exec(u), end = m ? Number(m[1]) : ACUM; return { data: { klines: pag(end, 500).filter((r) => r.time >= NASCUT) } }; },
  };
  vm.createContext(box); vm.runInContext(["grRanduri", "grOreFisa"].map(fnApp).join("\n") + "\nvar grOre={};", box);
  const r60 = () => pag(ACUM, 500);
  const v1 = await box.grOreFisa("TANAR_USDT_PERP", r60());
  assert.equal(cereri.filter((u) => /action=ore/.test(u)).length, 1); assert.equal(cereri.filter((u) => /pionex_klines/.test(u)).length, 1, cereri.join(" "));
  assert.ok(G.bare(v1).length >= 790, "bare: " + G.bare(v1).length);
  cereri.length = 0; ACUM += 5 * MIN; const v2 = await box.grOreFisa("TANAR_USDT_PERP", r60());
  assert.equal(cereri.length, 0, "la 5 min: " + cereri.join(" "));
  assert.ok(G.bare(v2)[G.bare(v2).length - 1].t >= G.bare(v1)[G.bare(v1).length - 1].t, "pagina nouă de 60M tot se lipește");
  cereri.length = 0; ACUM += 50 * MIN; await box.grOreFisa("TANAR_USDT_PERP", r60()); assert.equal(cereri.length, 0, "la 55 min: " + cereri.join(" "));
  cereri.length = 0; ACUM += 10 * MIN; await box.grOreFisa("TANAR_USDT_PERP", r60());
  assert.equal(cereri.filter((u) => /action=ore/.test(u)).length, 1, "după ~1 h caută din nou: " + cereri.join(" "));
});
await test("5b grOreFisa: o cerere picată (eroare, nu capătul istoricului) nu ține moneda „tânără” - reîncearcă data viitoare; scoasă din memorie, se caută din nou", async () => {
  const H1 = 3600000, ACUM = Date.UTC(2026, 9, 29, 12), cereri = []; let pica = true;
  const rand = (t) => ({ time: t, open: "1", high: "1.1", low: "0.9", close: "1" });
  const pag = (end, n) => Array.from({ length: n }, (_, i) => rand(Math.floor(end / H1) * H1 - i * H1)).reverse();
  const box = {
    GridCalcul: G, Math, Number, Object, Array, isFinite, Infinity, encodeURIComponent, grPauza: async () => {}, Date: { now: () => ACUM },
    getJSON: async (u) => { cereri.push(u); if (/action=ore/.test(u)) return { ore: null }; if (pica) throw Error("RATE_LIMITED"); const m = /endTime=(\d+)/.exec(u); return { data: { klines: pag(Number(m[1]), 300) } }; },
  };
  vm.createContext(box); vm.runInContext(["grRanduri", "grOreFisa"].map(fnApp).join("\n") + "\nvar grOre={};", box);
  await box.grOreFisa("A_USDT_PERP", pag(ACUM, 500));
  cereri.length = 0; pica = false; await box.grOreFisa("A_USDT_PERP", pag(ACUM, 500));
  assert.equal(cereri.filter((u) => /pionex_klines/.test(u)).length, 1, "după o eroare trebuie să reîncerce: " + cereri.join(" "));
  cereri.length = 0; await box.grOreFisa("A_USDT_PERP", pag(ACUM, 500)); assert.equal(cereri.length, 0, "acum e tânără: din memorie");
  for (const s of ["B", "C", "D", "E", "F", "G"]) await box.grOreFisa(s + "_USDT_PERP", pag(ACUM, 500));   /* 6 monede noi ⇒ A iese din memorie */
  cereri.length = 0; await box.grOreFisa("A_USDT_PERP", pag(ACUM, 500));
  assert.ok(cereri.length >= 2, "scoasă din memorie, trebuie căutată din nou (altfel rămâne pe 500 de bare): " + cereri.join(" "));
});

// =============================== IDEEA 6: încercările ML pe cip ===============================
await test("6 cipul „ML Ensemble v2 OOS gate passed” arată și numărul de încercări (TextRo.cate); fără număr - ca înainte", () => {
  const cip = (incercari) => (verdict({ ml: { state: "USABLE ENSEMBLE", disagreement: 0.05, incercari } }).expl.pos || []).find((x) => /^ML Ensemble v2 OOS gate passed/.test(x));
  assert.equal(cip(7), "ML Ensemble v2 OOS gate passed · 7 încercări");
  assert.equal(cip(1), "ML Ensemble v2 OOS gate passed · 1 încercare");
  assert.equal(cip(20), "ML Ensemble v2 OOS gate passed · 20 de încercări");
  assert.equal(cip(null), "ML Ensemble v2 OOS gate passed");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
