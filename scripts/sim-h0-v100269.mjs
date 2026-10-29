// v100.269 (ideile auditului 29.10, ideea 1): simularea de MĂRIME sub H0 pentru fișa gridului - cât de des zice PORNEȘTE pe date FĂRĂ avantaj.
// Ipoteza scrisă ÎNAINTE de date: prețul e o martingală (mers aleator log cu drift −σ²/2, pași de 1 minut, volatilitatea pe zi 2–6%), deci orice
// grid pierde în medie comisioanele și funding-ul; un PORNEȘTE aici e o alarmă falsă. Pragul: cu regula nouă (proba pe bare de 1 h, ~6 luni) rata la
// H = 2 și H = 3 trebuie să fie mică (≤ 5%) și comparabilă cu H = 1 de azi (cel mult +2 puncte). Unitatea = moneda (fiecare monedă e o istorie
// independentă); se raportează și „fără Monte Carlo” (contrafactualul rulează așa) și „cu Monte Carlo” (pagina, colectorul).
// Rulare: node scripts/sim-h0-v100269.mjs [--monede 300] [--grupat] [--fire 5] [--rad <rădăcina cu public/lib>]
//   --grupat = agitație grupată (volatilitatea pe regimuri de 1–5 zile, ×0,5…×2,5), tot fără avantaj. Durează câteva minute (~1 s pe fișă).
// Rezultatele (29.10, pe codul v100.269), 300 de monede pe fiecare proces - PORNEȘTE pe date fără avantaj (fără MC / cu MC):
//   volatilitate constantă: H = 1 (15 min, neschimbat) 25,3% / 25,3% · H = 2 nou 1,0% / 1,0% · H = 3 nou 1,3% / 1,3% · H = 2–3 pe 15 min 0%
//   agitație grupată:       H = 1 16,3% / 16,3% · H = 2 nou 0,7% / 0,3% · H = 3 nou 1,0% / 1,0%
//   aceeași regulă pe 1 h FĂRĂ cerința t ≥ 1,65: H = 2 12,3% / 6,7%, H = 3 18,3% / 12,0% (const. / grupată) - de aici cerința t (grid-calcul.js, verdict)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const AICI = fileURLToPath(import.meta.url);
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
function mulberry32(seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// o monedă sintetică: 183 de zile de pași de 1 minut ⇒ bare de 15 min, 1 h, 4 h, 1 zi din ACELAȘI drum (barele mari = agregarea celor mici)
function moneda(seed, zile, grupat) {
  const rnd = mulberry32(seed), volZi = 0.02 + 0.04 * rnd(), n = zile * 1440, sMin = volZi / Math.sqrt(1440), T0 = Date.UTC(2026, 3, 1);
  const m1 = new Float64Array(n + 1); let p = 100 * Math.exp(rnd() * 3), mult = 1, pana = 0; m1[0] = p;
  for (let i = 1; i <= n; i++) {
    if (grupat && i >= pana) { mult = 0.5 + 2 * rnd() * rnd(); pana = i + Math.floor(1440 * (1 + 4 * rnd())); }
    const s = sMin * mult, z = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    p = p * Math.exp(s * z - s * s / 2); m1[i] = p;
  }
  const agr = (min) => { const out = []; for (let s = 0; s + min <= n; s += min) { let h = -Infinity, l = Infinity; for (let k = s; k <= s + min; k++) { const v = m1[k]; if (v > h) h = v; if (v < l) l = v; } out.push({ t: T0 + s * 60000, o: m1[s], h, l, c: m1[s + min], v: 1 }); } return out; };
  const b15 = agr(15), b1h = agr(60), b4h = agr(240), b1d = agr(1440);
  return { b15: b15.slice(-3000), b1h, b4h: b4h.slice(-300), b1d: b1d.slice(-200), volZi };
}
const nivelFaraMc = (f) => f.mc && f.mc.contrazice && f.verdict && f.verdict.motive && f.verdict.motive[0] === f.mc.motiv ? "porneste" : f.verdict.nivel;

if (!isMainThread) {
  const { rad, seeds, grupat, Hs } = workerData;
  for (const f of ["text-ro.js", "grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(fs.readFileSync(path.join(rad, "public", "lib", f), "utf8"), { filename: f });
  const GP = globalThis.GridProba;
  for (const seed of seeds) {
    const m = moneda(seed, 183, grupat), pret = m.b15[m.b15.length - 1].c, rez = { seed };
    for (const H of Hs) {
      const o = { simbol: "SINT", pret, b15: m.b15, b4h: m.b4h, b1d: m.b1d, suma: 100, fundingZi: null, H, dir: null, levier: null, minNotional: null };
      // „vechi” = fără barele de 1 h (cum era până acum la orice H); „nou” = cu ele (la H = 1 regula nouă nu le folosește)
      for (const fel of H === 1 ? ["vechi"] : ["vechi", "nou"]) {
        const f = GP.fisa(fel === "nou" ? Object.assign({ b1h: m.b1h }, o) : o);
        rez[H + fel] = f.eroare ? { eroare: f.eroare } : { mc: f.verdict.nivel, faraMc: nivelFaraMc(f), bare: f.proba.barePeZi || 96, ind: f.proba.ferestre.testIndependente };
      }
    }
    parentPort.postMessage(rez);
  }
  process.exit(0);
}

const N = Number(arg("--monede", 300)), grupat = process.argv.includes("--grupat"), fire = Number(arg("--fire", Math.max(1, os.cpus().length - 1)));
const rad = path.resolve(arg("--rad", path.join(path.dirname(AICI), ".."))), Hs = [1, 2, 3], baza = grupat ? 900000 : 700000;
const seeds = Array.from({ length: N }, (_, i) => baza + i), toate = [], t0 = Date.now();
await Promise.all(Array.from({ length: fire }, (_, k) => new Promise((gata, rau) => {
  const w = new Worker(AICI, { workerData: { rad, seeds: seeds.filter((_, i) => i % fire === k), grupat, Hs } });
  w.on("message", (r) => { toate.push(r); if (toate.length % 25 === 0) process.stderr.write(`  ${toate.length}/${N} (${Math.round((Date.now() - t0) / 1000)} s)\n`); });
  w.on("error", rau); w.on("exit", gata);
})));
const wilson = (k, n) => { const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; };
const pr = (k, n) => { const w = wilson(k, n); return `${k}/${n} = ${(k / n * 100).toFixed(1).replace(".", ",")}% (95%: ${(w[0] * 100).toFixed(1).replace(".", ",")}–${(w[1] * 100).toFixed(1).replace(".", ",")}%)`; };
console.log(`\nSUB H0 · ${N} monede sintetice (${grupat ? "agitație grupată" : "volatilitate constantă"}), 183 de zile, fără avantaj · rădăcina ${rad}\n`);
for (const H of Hs) for (const fel of H === 1 ? ["vechi"] : ["vechi", "nou"]) {
  const l = toate.map((r) => r[H + fel]).filter((x) => x && !x.eroare), k = l.filter((x) => x.mc === "porneste").length, k0 = l.filter((x) => x.faraMc === "porneste").length;
  const ind = l.map((x) => x.ind).sort((a, b) => a - b), bare = [...new Set(l.map((x) => x.bare))].join("/");
  console.log(`H = ${H} ${fel === "nou" ? "regula NOUĂ (1 h)" : "de azi (15 min)"}: PORNEȘTE fără Monte Carlo ${pr(k0, l.length)} · cu Monte Carlo ${pr(k, l.length)} · ferestre independente de test (mediana) ${ind[ind.length >> 1]} · bare/zi ${bare}`);
}
console.log(`\n${Math.round((Date.now() - t0) / 1000)} s`);
