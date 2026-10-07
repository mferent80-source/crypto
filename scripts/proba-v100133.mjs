// Proba v100.133 (07.10, el: „fa idei” după v100.132): (2) codul pentru GRID-FISA poartă câmpul 20 = TP aproximat (Pionex l-a dat în %
// din investiție), DOAR atunci - GRID-FISA v2.4 refuză peste 19 câmpuri, deci ceilalți boți rămân pe 19; (3) orizontul la alegere în
// Monte Carlo pe simbol (coin: 3 și 7 / 7 și 30 / 30 și 90 de zile; acțiune: 5 și 20 / 20 și 60 / 60 și 120 de zile de bursă).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
const TE = new Function("GridCalcul", `${citeste("public", "lib", "tablou-extra.js")}; return TabloExtra;`)(globalThis.GridCalcul);
const MSE = citeste("public", "lib", "monte-simbol-ecran.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const M = globalThis.MonteSimbol, G = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.133 · câmpul 20 (TP aproximat) · orizontul la alegere · proba\n");
const ZI = 864e5;
function bareZi(n, seed, pas) { const g = M.generator(seed), b = []; let c = 100; for (let i = 0; i < n; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.06)); b.push({ t: i * ZI, o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c, v: 1 }); } return b; }
function bare15(zile, seed) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const EXTRA = { copiatLa: 1791302056000, margJos: 0.031, margSus: 0.034 };
const lng = (o) => Object.assign({ id: "1", directie: "long", gridJos: 0.38, gridSus: 0.44, levier: 3, investit: 50, opritorPierdereActiv: true, opritorPierdere: 0.36, opritorProfitActiv: true, opritorProfit: 0.47, lichidareJos: 0.3, lichidareSus: null, pornitLa: 1791301681464, brut: { buOrderData: { row: 30 } } }, o);

// ---------------- (2) câmpul 20 ----------------
await test("(2a) long cu TP dat de Pionex în procente: 20 de câmpuri, al 20-lea = „1”", () => {
  const p = TE.codTVBot(lng({ opritorProfitTip: "raport", opritorProfitRaport: 0.2 }), null, EXTRA).cod.split(";");
  assert.equal(p.length, 20, p.join(";")); assert.equal(p[19], "1"); assert.equal(p[6], "0.47", "TP-ul tot ca preț în câmpul 7");
});
await test("(2b) fără TP în procente (preț, fără TP, short, neutru) sau fără „extra”: ca înainte (19 / mai puține) - GRID-FISA v2.4 refuză peste 19", () => {
  assert.equal(TE.codTVBot(lng({ opritorProfitTip: "pret" }), null, EXTRA).cod.split(";").length, 19);
  assert.equal(TE.codTVBot(lng({ opritorProfitActiv: false, opritorProfitTip: "raport" }), null, EXTRA).cod.split(";").length, 19);
  assert.equal(TE.codTVBot(lng({ directie: "short", opritorPierdere: 0.46, opritorProfit: 0.35, opritorProfitTip: "raport" }), null, EXTRA).cod.split(";").length, 19, "la short TP-ul nu intră în cod");
  assert.equal(TE.codTVBot(lng({ opritorProfitTip: "raport" }), null).cod.split(";").length, 10, "fără extra: neschimbat");
  // revizia (R11): la TP în procente semnătura are „≈” în locul prețului TP (vezi (R11)); câmpul 20 în sine nu intră în ea
  assert.equal(TE.codTVBot(lng({ opritorProfitTip: "raport" }), null, EXTRA).sig.split(";").length, TE.codTVBot(lng({}), null, EXTRA).sig.split(";").length, "câmpul 20 nu intră în semnătură");
});

// ---------------- (3) orizontul la alegere ----------------
await test("(3a) mcsOrizonturi: perechile pe fel (coin zile, acțiune zile de bursă), implicit a doua; index greșit ⇒ implicit", () => {
  assert.deepEqual(G.mcsOrizonturi("coin"), [[3, 7], [7, 30], [30, 90]]); assert.deepEqual(G.mcsOrizonturi("stock"), [[5, 20], [20, 60], [60, 120]]);
  assert.deepEqual(G.mcsOrizontAles("coin", undefined), [7, 30]); assert.deepEqual(G.mcsOrizontAles("coin", 0), [3, 7]); assert.deepEqual(G.mcsOrizontAles("stock", 9), [20, 60]);
});
await test("(3b) mcsCalculeaza ia orizontul ales: coin (bare zilnice și doar 15 minute), acțiune; tabelele de stop / țintă pe orizontul lung ales", () => {
  const c = G.mcsCalculeaza({ tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: bareZi(120, 4, 0.08), ist: { r: { cazuri: 0 } } }, { oriz: 0 });
  assert.deepEqual(c.pretMc.orizonturi.map((o) => o.H), [3, 7]); assert.ok(c.pretMc.orizonturi[1].stopuri);
  const c15 = G.mcsCalculeaza({ tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: [], ist: { r: { cazuri: 0 } } }, { oriz: 0 });
  assert.deepEqual(c15.pretMc.orizonturi.map((o) => o.H), [3, 7]);
  const s = G.mcsCalculeaza({ tip: "stock", sim: "X", b: bareZi(400, 9, 0.05), ist: { r: { cazuri: 0 } } }, { oriz: 2 });
  assert.deepEqual(s.pretMc.orizonturi.map((o) => o.H), [60, 120]);
  assert.match(G.mcsPretHtml(s), /Alt stop, aceleași drumuri \(120 de zile de bursă/);
  const s0 = G.mcsCalculeaza({ tip: "stock", sim: "X", b: bareZi(400, 9, 0.05), ist: { r: { cazuri: 0 } } }, {});
  assert.deepEqual(s0.pretMc.orizonturi.map((o) => o.H), [20, 60], "fără alegere: ca înainte");
});
await test("(3c) caseta: butoanele orizontului (aria-pressed pe cel ales, mcsAlegeOriz(i)); alegerea trece prin „Refă”, botul ales și revenirea pe simbol", () => {
  const c = G.mcsCalculeaza({ tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: bareZi(120, 4, 0.08), ist: { r: { cazuri: 0 } } }, { oriz: 2 });
  const h = G.mcsPretHtml(c);
  assert.match(h, /<div class="mcsOriz" role="group" aria-label="Orizontul"><span class="tbSub">Orizontul:<\/span><button type="button" class="tbIntBtn" aria-pressed="false" data-action-click="mcsAlegeOriz\(0\)">3 și 7 zile<\/button>/);
  assert.match(h, /aria-pressed="true" data-action-click="mcsAlegeOriz\(2\)">30 și 90 de zile<\/button>/);
  const hs = G.mcsPretHtml(G.mcsCalculeaza({ tip: "stock", sim: "X", b: bareZi(400, 9, 0.05), ist: { r: { cazuri: 0 } } }, {}));
  assert.match(hs, /aria-pressed="true" data-action-click="mcsAlegeOriz\(1\)">20 și 60 de zile de bursă<\/button>/);
  for (const f of ["mcsResimuleaza", "mcsAlegeBot", "mcsAnalizeaza"]) assert.match(functie(MSE, f), /oriz: mcsStare\.oriz\[/, f);
  assert.match(functie(MSE, "mcsAlegeOriz"), /mcsResimuleaza\(\)/);
});

// ---------------- revizia Opus ----------------
await test("(R11) semnătura gridului ignoră TP-ul în procente (prețul lui se mută cu botul) - altfel „Ai schimbat gridul” revenea", () => {
  const a = TE.codTVBot(lng({ opritorProfitTip: "raport", opritorProfit: 0.47 }), null, EXTRA).sig, b = TE.codTVBot(lng({ opritorProfitTip: "raport", opritorProfit: 0.49 }), null, EXTRA).sig;
  assert.equal(a, b); assert.notEqual(a, TE.codTVBot(lng({}), null, EXTRA).sig, "un bot marcat pe v2.4 e chemat o dată să recopieze (câmpul 20)");
  assert.notEqual(TE.codTVBot(lng({ opritorProfit: 0.47 }), null, EXTRA).sig, TE.codTVBot(lng({ opritorProfit: 0.49 }), null, EXTRA).sig, "TP-ul ca preț rămâne în semnătură");
});
await test("(R3) prețurile foarte mici cu cifre semnificative (pe Discord și în cheia anti-repetare), nu „0,0000”", () => {
  assert.equal(G.mcsPretTxt(0.00001234), "0,00001234"); assert.equal(G.mcsPretTxt(0.005123), "0,005123"); assert.equal(G.mcsPretTxt(0.4), "0,4000"); assert.equal(G.mcsPretTxt(1349.6), "1.349,60");
});
await test("(R12/R13) 🎲 din rând (mcsPozitie) deschide orizontul 20 / 60 (cifra din rând e pe 60); „istoric scurt” scrie zile de bursă la acțiuni", () => {
  assert.match(functie(MSE, "mcsAnalizeaza"), /if \(poz && d\.tip === "stock"\) mcsStare\.oriz\.stock = 1;/);
  const s = G.mcsCalculeaza({ tip: "stock", sim: "X", b: bareZi(100, 9, 0.05), ist: { r: { cazuri: 0 } } }, { oriz: 2 });
  assert.match(G.mcsPretHtml(s), /la 120 de zile de bursă simularea doar reamestecă/);
});

await test("(E) versiunea de la v100.133 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3[3-9]|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3[3-9]|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3[3-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[3-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[3-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[3-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[3-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
