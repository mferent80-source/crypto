// Proba v100.51 (01.10, el: „fă tot” - pachetul 4: graficul si autopsia, docs/superpowers/plans/2026-10-01-pachetul-4-graficul-si-autopsia.md).
// I-470 zona de valoare + pivotii confirmati (+ intrebarea din laborator); I-476 ziua obisnuita + liniile Consilierului pe grafic;
// I-477 perechile reale vs estimarea fisei + factorul pe moneda; I-478 autopsia sfaturilor gresite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const poate = (f, nume, par = [], arg = []) => { try { return new Function(...par, `${lib(f)}; return ${nume};`)(...arg); } catch (e) { return null; } };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G); globalThis.GridProba = GP;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();
const VA = poate("valoare.js", "Valoare"); if (VA) globalThis.Valoare = VA;
const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const LAB = poate("grid-laborator.js", "GridLaborator", ["GridCalcul", "GridProba", "Valoare"], [G, GP, VA]);
const PER = poate("perechi.js", "Perechi", ["GridCalcul", "GridProba"], [G, GP]);
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G); globalThis.JurnalTrade = JT;
const PR = new Function("GridCalcul", `${lib("probabilitati.js")}; return Probabilitati;`)(G); globalThis.Probabilitati = PR;
const OB = poate("obiceiuri.js", "Obiceiuri", ["GridCalcul", "GridProba", "JurnalTrade", "Probabilitati"], [G, GP, JT, PR]);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.51 · Graficul si autopsia: zona de valoare, ziua obisnuita, perechile, autopsia · proba\n");
const are = (x, nume) => assert.ok(x, "lipseste " + nume);

// ---- pasul 1: valoare.js (I-470) ----
await test("I-470 zona: 70% din volum in jurul POC; volumul lipsa -> dupa timp (TPO), spus pe fata", () => {
  are(VA, "valoare.js");
  const bare = []; for (let i = 0; i < 168; i++) { const p = 1 + 0.02 * Math.sin(i / 9); bare.push({ t: i * 3600000, o: p, h: p * 1.003, l: p * 0.997, c: p, v: i % 24 < 12 ? 100 : 10 }); }
  const z = VA.zona(bare, {}); assert.ok(z && z.val < z.poc && z.poc < z.vah && z.dupa === "volum", JSON.stringify(z)); assert.ok(z.acoperire >= 0.7 && z.acoperire < 0.8, String(z.acoperire));
  const fara = VA.zona(bare.map((b) => ({ ...b, v: null })), {}); assert.equal(fara.dupa, "timp");
  assert.equal(VA.zona(bare.slice(0, 10), {}), null);
});
await test("I-470 pivotii: doar CONFIRMATI (k bare dupa), varful de pe bara curenta nu intra; apropiati < 0,3% se comaseaza", () => {
  are(VA, "valoare.js");
  const p = [1, 1.01, 1.03, 1.01, 1, 0.98, 0.97, 0.98, 1, 1.02, 1.0301, 1.02, 1, 0.99, 1.05];
  const bare = p.map((c, i) => ({ t: i, o: c, h: c, l: c, c }));
  const v = VA.pivoti(bare, 2);
  assert.ok(v.some((x) => x.tip === "sus" && Math.abs(x.p - 1.03) < 0.002 && x.atingeri === 2), JSON.stringify(v));
  assert.ok(v.some((x) => x.tip === "jos" && x.p === 0.97)); assert.ok(!v.some((x) => x.p === 1.05), "ultima bara nu e confirmata");
});
await test("I-470 gridul fata de zona: cat din grid sta in zona de valoare si daca POC e in grid", () => {
  are(VA, "valoare.js");
  const f = VA.fataDeGrid({ poc: 1, vah: 1.02, val: 0.98 }, 0.99, 1.05);
  assert.ok(Math.abs(f.inZona - 0.5) < 1e-9); assert.equal(f.pocInGrid, true); assert.match(f.text, /50% din grid e în zona de valoare/);
});
await test("I-470 lumanarile pastreaza volumul (GridCalcul.bare), null cand lipseste", () => {
  const b = G.bare([{ time: 1, open: 1, high: 1.1, low: 0.9, close: 1, volume: 42 }, [2, 1, 1.1, 0.9, 1], [3, 1, 1.1, 0.9, 1, 5]]);   // ultima (in formare) cade
  assert.equal(b[0].v, 42); assert.equal(b[1].v, null);
});

// ---- pasul 2: graficul botului (I-476 + I-470) ----
await test("I-476 ziua obisnuita: banda P50/P75 pe 24 h de la pretul de acum, din profil; fara profil -> null", () => {
  are(GB.ziObisnuita, "GraficBot.ziObisnuita");
  const q = (a) => Array.from({ length: 21 }, (_, k) => a * k / 20);
  const z = GB.ziObisnuita(1, { z24: { jos: q(0.08), sus: q(0.06) }, simbol: "CRV_USDT_PERP", zile: 185 });
  assert.ok(Math.abs(z.p50Jos - 0.96) < 1e-9 && Math.abs(z.p75Jos - 0.94) < 1e-9 && Math.abs(z.p75Sus - 1.045) < 1e-9, JSON.stringify(z)); assert.match(z.sursa, /185 de zile/);
  assert.equal(GB.ziObisnuita(1, null), null);
});
await test("I-476/I-470 desen: banda zilei, zona de valoare, POC, pivotii DOAR cu comutatorul pornit; stopul planului mereu (e linie de Consilier)", () => {
  const bare = Array.from({ length: 60 }, (_, i) => ({ t: i * 9e5, o: 1, h: 1.01, l: 0.99, c: 1 + (i % 5) / 500, v: 10 }));
  const baza = { bare, W: 900, niv: [], grila: { jos: 0.95, sus: 1.05, linii: 11 }, zi: { p50Jos: 0.97, p75Jos: 0.95, p50Sus: 1.02, p75Sus: 1.04, sursa: "x" },
    val: { zona: { poc: 1, vah: 1.01, val: 0.99, dupa: "volum" }, pivoti: [{ p: 1.008, tip: "sus", atingeri: 2 }] }, consLinii: { stopAcum: 0.93, stopPlan: 0.945 } };
  const cu = GB.desen({ ...baza, st: { zi: true, val: true } }).svg, fara = GB.desen({ ...baza, st: { zi: false, val: false } }).svg;
  for (const c of ["gbZi", "gbVa", "gbPoc", "gbPivot"]) { assert.match(cu, new RegExp('class="' + c)); assert.ok(!new RegExp('class="' + c).test(fara), c + " fara comutator"); }
  assert.match(cu, /class="gbStopPlan/); assert.match(fara, /class="gbStopPlan/, "stopul planului e linie de Consilier, nu indicator");
});
await test("Tabloul: comutatoarele „Ziua obișnuită” si „Zona de valoare” in sistemul existent (aria-pressed, TB_IND_KEY)", () => {
  const html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(html, /id="tbInd-zi"[^>]*aria-pressed/); assert.match(html, /id="tbInd-val"[^>]*aria-pressed/);
  assert.match(app, /var d=\{bb:true,ema:true,rsi:true,vp:true,zi:true,val:true\}/); assert.match(app, /GraficBot\.ziObisnuita\(/); assert.match(app, /Valoare\.zona\(/);
  assert.match(app, /tbStare\.consLinii=/); assert.match(app, /Valoare\.fataDeGrid\(/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
