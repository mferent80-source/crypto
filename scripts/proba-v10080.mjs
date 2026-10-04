// Proba v100.80 - rețeaua neuronală, livrarea 1 (specul docs/superpowers/specs/2026-10-02-retea-neuronala-design.md): modulul pur
// public/lib/retea.js - trăsăturile fără privire în viitor, intrările pe țintă, trecerea înainte, pragul „dovedită”.
//   node scripts/proba-v10080.mjs
import "./lib/text-ro-global.mjs";   // TextRo înaintea modulelor
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const ActiuniSemnale = new Function("GridCalcul", lib("actiuni-semnale.js") + "; return ActiuniSemnale;")(GridCalcul);
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", lib("probabilitati.js") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);
const Retea = new Function("Probabilitati", lib("retea.js") + "; return Retea;")(Probabilitati);
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const ORA = 3600000;

console.log("Proba v100.80 · rețeaua: trăsăturile, intrările, trecerea înainte, pragul");
const b = bare(2000, { seed: 7 }), btc = bare(2000, { seed: 11, p0: 60000 });

await test("(1) trăsăturile la bara i nu văd nimic de după: aceleași cu și fără barele (și BTC-ul) de după i; null sub 30 de zile (720 de bare)", () => {
  const cu = Retea.trasaturiBare(b, 1500, btc), fara = Retea.trasaturiBare(b.slice(0, 1501), 1500, btc.slice(0, 1501));
  assert.ok(cu && cu.x.length === Retea.TRASATURI.length && Retea.TRASATURI.length === 17, JSON.stringify(cu && cu.x));
  assert.deepEqual(fara.x, cu.x);
  assert.equal(cu.t, b[1500].t + ORA, "momentul deciziei = închiderea barei i");
  assert.equal(Retea.trasaturiBare(b, 719, btc), null);
  const viitor = btc.concat(bare(50, { seed: 3, t0: btc[btc.length - 1].t + ORA, p0: 1 }));
  assert.deepEqual(Retea.trasaturiBare(b, 1500, viitor).x, cu.x);
});

await test("(1) revizia finală (I3): fără BTC proaspăt - lipsă sau ultima bară BTC încheiată cu peste 2 h înainte de t - nicio trăsătură (rețeaua n-a învățat cu BTC lipsă)", () => {
  assert.equal(Retea.trasaturiBare(b, 1500, null), null);
  assert.equal(Retea.trasaturiBare(b, 1500, btc.slice(0, 1498)), null, "BTC vechi de 3 h");
  assert.ok(Retea.trasaturiBare(b, 1500, btc.slice(0, 1500)), "BTC de acum o oră e bun");
});
await test("(1) trăsăturile sunt tăiate la ±10 (o urcare bruscă după liniște nu strică rețeaua); o serie fără mișcare -> null, nu NaN", () => {
  const plat = Array.from({ length: 900 }, (_, i) => ({ t: Date.UTC(2025, 0, 1) + i * ORA, o: 100, h: 100.0001, l: 99.9999, c: 100 * (1 + (i % 2 ? 1e-6 : -1e-6)) }));
  let pret = 100;   // urcarea alternează 3% și 1% (pași egali ar da volatilitate zero -> null)
  const urca = plat.concat(Array.from({ length: 30 }, (_, k) => { const o1 = pret; pret = o1 * (k % 2 ? 1.01 : 1.03); return { t: plat[899].t + (k + 1) * ORA, o: o1, h: pret, l: o1, c: pret }; }));
  const f = Retea.trasaturiBare(urca, urca.length - 1, bare(urca.length, { seed: 5, t0: urca[0].t, p0: 60000 }));
  assert.ok(f.x.every((v) => v >= -10 && v <= 10), JSON.stringify(f.x));
  assert.ok(f.x.some((v) => Math.abs(v) === 10), "nicio trăsătură tăiată: " + JSON.stringify(f.x));
  const mort = Array.from({ length: 900 }, (_, i) => ({ t: Date.UTC(2025, 0, 1) + i * ORA, o: 100, h: 100, l: 100, c: 100 }));
  assert.equal(Retea.trasaturiBare(mort, 899, null), null);
});

await test("(1) intrarea pe țintă: atinge (distanța, în volatilități, semnul), cursa, liniștea, direcția; fără distanță -> null", () => {
  const f = Retea.trasaturiBare(b, 1500, btc);
  const a = Retea.intrare("atinge-24", f, { rel: -0.03, H: 24 });
  assert.equal(a.length, 20); assert.equal(a[17], -0.03); assert.equal(a[19], -1);
  assert.ok(Math.abs(a[18] - Math.min(10, 0.03 / (f.s1 * Math.sqrt(24)))) < 1e-12, String(a[18]));
  assert.equal(Retea.intrare("atinge-72", f, { rel: 0, H: 72 }), null);
  assert.equal(Retea.intrare("cursa", f, { relT: 0.05, relS: -0.03 }).length, 21);
  assert.equal(Retea.intrare("liniste", f, { H: 48 }).length, 18);
  assert.deepEqual(Retea.intrare("directie", f, {}), f.x);
  assert.equal(Retea.intrare("necunoscuta", f, {}), null);
});

await test("(1) rezultatul tău: rata ta doar din boții închiși ÎNAINTE de pornire, trasă spre medie (k = 10); piața la pornire = trăsăturile barei de dinainte", () => {
  const por = b[1500].t + ORA + 1800000, t = { moneda: "AAVE", dir: "long", levier: 5, jos: 90, sus: 110, pasNet: 0.004, pus: 50, pornit: por };
  const ist = [{ moneda: "AAVE", net: 2, inchis: por - 86400000 }, { moneda: "AAVE", net: -1, inchis: por - ORA }, { moneda: "X", net: 3, inchis: por - 2 * ORA }, { moneda: "AAVE", net: 5, inchis: por + ORA }];
  const r = Retea.trasaturiBot(t, b, btc, ist);
  assert.equal(r.n, 3); assert.ok(Math.abs(r.glob - 2 / 3) < 1e-12, String(r.glob));
  assert.ok(Math.abs(r.rata - (1 + 10 * (2 / 3)) / (2 + 10)) < 1e-12, String(r.rata));
  assert.equal(r.x.length, 26); assert.equal(r.x[7], r.rata);
  assert.deepEqual(r.x.slice(9), Retea.trasaturiBare(b, Retea.indexLa(b, por), btc).x);
  assert.equal(Retea.indexLa(b, por), 1500);
  assert.equal(Retea.trasaturiBot({ ...t, sus: 80 }, b, btc, ist), null, "gridul întors -> null");
});

await test("(1) revizia finală (C1): rezultatul tău ia suma de PORNIRE (investit), nu „pus” (suma de la închidere, cu marja adăugată pe drum)", () => {
  const por = b[1500].t + ORA + 1800000, t = { moneda: "AAVE", dir: "long", levier: 5, jos: 90, sus: 110, pasNet: 0.004, investit: 50, pus: 80, pornit: por };
  const a = Retea.trasaturiBot(t, b, btc, []), c = Retea.trasaturiBot({ ...t, pus: 500, extraMargin: 400 }, b, btc, []);
  assert.deepEqual(a.x, c.x, "suma de la închidere / marja de pe drum au intrat în trăsături"); assert.equal(a.x[6], Math.log(51));
});
await test("(1) trecerea înainte = socoteala de mână (normalizarea, relu, sigmoid, media ansamblului); intrare greșită -> null", () => {
  const m = { versiune: Retea.VERSIUNE, norm: { m: [1, 0], s: [2, 0] }, ansamblu: [
    [{ W: [[1, -1], [0.5, 2]], b: [0, 0.1], act: "relu" }, { W: [[1], [-1]], b: [0.2], act: "sigmoid" }],
    [{ W: [[0.3], [0.3]], b: [-0.1], act: "sigmoid" }]] };
  const sig = (v) => 1 / (1 + Math.exp(-v));
  // z = [(3−1)/2, (4−0)/1] = [1, 4]; membrul 1: relu([1+2, −1+8+0,1]) = [3; 7,1] -> sig(3 − 7,1 + 0,2); membrul 2: sig(0,3 + 1,2 − 0,1)
  assert.ok(Math.abs(Retea.prezice(m, [3, 4]) - (sig(-3.9) + sig(1.4)) / 2) < 1e-12);
  assert.equal(Retea.prezice(m, [3]), null); assert.equal(Retea.prezice(null, [3, 4]), null); assert.equal(Retea.prezice(m, [3, NaN]), null);
});

await test("(1) pragul „dovedită”: toate patru; motivele în ordine (în lucru, prea puține cazuri, reperul, formula simplă, ultimele 3 luni, log-loss)", () => {
  const v = { luni: 11, luniGata: 11, nIndep: 300, reper: "🎲", brier: 0.17, brierReper: 0.18, brierLog: 0.175, ic: [0.01, 0.09], icLog: [0.005, 0.04], bss3: 0.02, logloss: 0.5, loglossReper: 0.52, loglossLog: 0.51 };
  assert.deepEqual(Retea.decide(v), { dovedita: true, motiv: null });
  assert.equal(Retea.decide({ ...v, luniGata: 6 }).motiv, "verificarea în lucru: 6 din 11 luni");
  assert.match(Retea.decide({ ...v, nIndep: 48 }).motiv, /^prea puține cazuri: 48 din 100( · încă ~\d+ (de )?(lună|luni|an|ani))?$/, "v100.95 adaugă „încă ~N luni” când există luni judecate");
  assert.equal(Retea.decide({ ...v, ic: [-0.01, 0.05] }).motiv, "nu bate 🎲 (Brier 0,170 față de 0,180)");
  assert.equal(Retea.decide({ ...v, icLog: [-0.002, 0.03] }).motiv, "nu face mai mult decât o formulă simplă");
  assert.equal(Retea.decide({ ...v, bss3: -0.01 }).motiv, "pică pe ultimele 3 luni");
  assert.equal(Retea.decide({ ...v, bss3: null }).motiv, "pică pe ultimele 3 luni");
  assert.equal(Retea.decide({ ...v, logloss: 0.515 }).motiv, "log-loss mai rău decât formula simplă");
  assert.equal(Retea.decide({ ...v, logloss: 0.53, loglossLog: 0.54 }).motiv, "log-loss mai rău decât 🎲");
  assert.equal(Retea.decide(null).motiv, "neverificată încă");
});

await test("(1) verdictul pe model: vechimea peste 2 zile se spune; altă versiune a trăsăturilor -> null (modelul vechi nu se folosește)", () => {
  const v = { luni: 11, luniGata: 11, nIndep: 300, reper: "🎲", brier: 0.17, brierReper: 0.18, brierLog: 0.175, ic: [0.01, 0.09], icLog: [0.005, 0.04], bss3: 0.02, logloss: 0.5, loglossReper: 0.52, loglossLog: 0.51 };
  const mod = { tinta: "atinge-72", versiune: Retea.VERSIUNE, la: Date.UTC(2026, 9, 1), verificare: v };
  const azi = Retea.verdict(mod, Date.UTC(2026, 9, 2));
  assert.deepEqual(azi, { dovedita: true, motiv: null, nIndep: 300, bloc: 72, vechi: null });
  assert.equal(Retea.verdict(mod, Date.UTC(2026, 9, 4, 1)).vechi, 3);
  assert.equal(Retea.verdict({ ...mod, versiune: "r0" }, Date.UTC(2026, 9, 2)), null);
  assert.equal(Retea.verdict(null, Date.now()), null);
  assert.equal(Retea.verdict({ ...mod, verificare: null }, Date.UTC(2026, 9, 2)).motiv, "neverificată încă");
});

console.log("\n" + (pica ? "V100.80 PICA · " + pica + " din " + (ok + pica) : "V100.80 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
