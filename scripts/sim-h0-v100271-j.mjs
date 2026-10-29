// v100.271 (ideile auditului 29.10): simularea de MĂRIME sub H0 pentru verificarea riscului pe termen scurt (raportScurt, tura-monte-carlo-bot.mjs).
// Ipoteza scrisă ÎNAINTE de date: riscul e CORECT - fiecare notare are stopul atins cu exact șansa prezisă (pStop) și pierderea sub p5 cu exact 5%.
// Zilele au piață comună: în aceeași zi notările se mișcă împreună (copulă gaussiană, corelația ρ în zi), stopul și „sub p5” din aceeași notare
// sunt și ele legate (un stop e de obicei o pierdere mare). Pragul: pe ecran „prezice prea puțin” (stopul sau „sub p5”) în cel mult ~5% din seturi,
// „prea …” în oricare direcție tot în ~5%. Unitatea = setul (o istorie de notări a lui); pe ecran stă un singur orizont, cel cu cele mai multe judecate.
// Ca informație: aceeași regulă când riscul e GREȘIT de 2 ori (stopul atins de 2× cât zice, „sub p5” 10%) - cât de des vede („prea puțin”) și cât de
// des ar zice fals „se potrivește”; și uitatul zilnic (60 de zile, de la ziua 10) - de câte ori apare MĂCAR O DATĂ „prea …” pe date corecte.
// Rulare: node scripts/sim-h0-v100271-j.mjs [--seturi 4000]   (~40 s)
// Rezultatele (29.10, 4000 de seturi pe scenariu, 1 h / 4 h / 24 h × 10–60 de zile × ρ 0 / 0,3 / 0,6), ÎNAINTE de orice dată reală:
//   prima variantă (varianța pe zile cu podeaua aruncărilor INDEPENDENTE): „prea puțin” ≤ 1,6%, dar „prea mult” fals până la 7,0% (ρ 0,3) și
//   15,4% (ρ 0,6) la ~600 de judecate - când setul n-a prins „zilele rele”, varianța pe zile iese prea mică ⇒ podeaua cu corelația în zi 0,1.
//   regula de acum: „prea puțin” ≤ 1,3% peste tot; „prea mult” ≤ 2,2% până la ρ 0,3, 4,2–6,0% la ρ 0,6 cu ~600; oricare ≤ 3,4% până la ρ 0,3
//   (6,7% doar la 4 h, ρ 0,6, ~600). Uitatul zilnic 60 de zile: măcar o dată „prea …” în 2,0%.
//   H1 (riscul de 2×): „prea puțin” 1 h 3% / 26% / 86% (~42 / 150 / 600 de judecate), 4 h 22% / 80% / 100%, 24 h 88% / 100%; „se potrivește”
//   fals: stopul ≤ 0,3%, „sub p5” ≤ 4,8% (10% e chiar marginea de ±5 puncte).
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const { raportScurt } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs")).href);
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const Phi = (x) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
const T0 = Date.UTC(2026, 9, 1), ZI = 86400000, R = Number(arg("--seturi", 4000));
// șansele prezise pe orizont (cum le dă simulatorul pe boții lui: o parte fără stop ⇒ 0)
const PSTOP = { 1: (r) => (r() < 0.2 ? 0 : 0.005 + r() * 0.095), 4: (r) => (r() < 0.2 ? 0 : 0.02 + r() * 0.28), 24: (r) => (r() < 0.2 ? 0 : 0.05 + r() * 0.65) };
// un set: `zile` zile, câte 1..2·med−1 judecate pe zi; fact = de câte ori e mai mare riscul adevărat (1 = H0); rho = corelația în zi
function set(r, { ore, zile, med, rho, fact = 1, q5 = 0.05 }) {
  const g = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()), j = [], a = Math.sqrt(rho), b = Math.sqrt(1 - rho);
  for (let z = 0; z < zile; z++) {
    const uS = g(), u5 = g(), k = 1 + Math.floor(r() * (2 * med - 1)), zz = new Date(T0 + z * ZI).toISOString().slice(0, 10);
    for (let i = 0; i < k; i++) {
      const p = PSTOP[ore](r), eS = g(), e5 = Math.SQRT1_2 * eS + Math.SQRT1_2 * g();
      const stop = Phi(a * uS + b * eS) < Math.min(1, p * fact) ? 1 : 0, sub5 = Phi(a * u5 + b * e5) < q5 ? 1 : 0;
      j.push({ id: "b" + z + "-" + i, ore: 1, t: T0 + z * ZI, z: zz, pStop: p, p5: -1, total: 0, stare: "judecat", stop, sub5 });
    }
  }
  return raportScurt(j).ore[0];
}
const pct = (k) => (100 * k / R).toFixed(1).replace(".", ",") + "%";
function scenariu(eticheta, o) {
  const r = mulberry32(271 + Math.round(o.zile * 7 + o.med * 13 + o.rho * 101 + o.ore * 3 + (o.fact || 1) * 17));
  let pp = 0, pm = 0, oric = 0, potS = 0, pot5 = 0, putine = 0, n = 0;
  for (let s = 0; s < R; s++) {
    const x = set(r, o); n += x.n;
    const PP = x.verdictStop === "prea-putin" || x.verdictP5 === "prea-putin", PM = x.verdictStop === "prea-mult" || x.verdictP5 === "prea-mult";
    if (PP) pp++; if (PM) pm++; if (PP || PM) oric++; if (x.verdictStop === "potrivit") potS++; if (x.verdictP5 === "potrivit") pot5++; if (x.verdictStop === "putine") putine++;
  }
  console.log(eticheta.padEnd(46) + " · ~" + Math.round(n / R) + " judecate · prea puțin " + pct(pp) + " · prea mult " + pct(pm) + " · oricare " + pct(oric) + " · se potrivește: stop " + pct(potS) + ", sub p5 " + pct(pot5) + " · strâng date " + pct(putine));
  return { pp: pp / R, oric: oric / R };
}
console.log("\nSIMULAREA SUB H0 · v100.271-j · riscul pe termen scurt verificat (" + R + " de seturi pe rând)\n");
console.log("H0 - riscul corect:");
const rele = [];
for (const ore of [1, 4, 24]) for (const [zile, med] of [[10, 3], [14, 3], [30, 5], [60, 10]]) for (const rho of [0, 0.3, 0.6]) {
  const x = scenariu("  " + ore + " h · " + zile + " zile × ~" + med + "/zi · ρ " + String(rho).replace(".", ","), { ore, zile, med, rho });
  if (x.pp > 0.06 || x.oric > 0.07) rele.push(ore + " h, " + zile + " zile, ρ " + rho + ": prea puțin " + (100 * x.pp).toFixed(1) + "%, oricare " + (100 * x.oric).toFixed(1) + "%");
}
console.log("\nH1 - riscul de 2 ori mai mare decât zice (informativ: cât vede, cât zice fals „se potrivește”):");
for (const ore of [1, 4, 24]) for (const [zile, med] of [[14, 3], [30, 5], [60, 10]]) scenariu("  " + ore + " h · " + zile + " zile × ~" + med + "/zi · ρ 0,3", { ore, zile, med, rho: 0.3, fact: 2, q5: 0.1 });
// uitatul zilnic: 60 de zile, ~5 judecate pe zi, ecranul citit în fiecare zi de la ziua 10 - măcar o dată „prea …” pe date corecte
{
  const r = mulberry32(2710), g = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()); let odata = 0; const RS = Math.max(200, Math.round(R / 10));
  for (let s = 0; s < RS; s++) {
    const j = []; let vazut = false;
    for (let z = 0; z < 60; z++) {
      const uS = g(), u5 = g(), k = 1 + Math.floor(r() * 9), zz = new Date(T0 + z * ZI).toISOString().slice(0, 10);
      for (let i = 0; i < k; i++) { const p = PSTOP[1](r), eS = g(), e5 = Math.SQRT1_2 * eS + Math.SQRT1_2 * g(); j.push({ id: "b", ore: 1, t: T0 + z * ZI, z: zz, pStop: p, p5: -1, total: 0, stare: "judecat", stop: Phi(Math.sqrt(0.3) * uS + Math.sqrt(0.7) * eS) < p ? 1 : 0, sub5: Phi(Math.sqrt(0.3) * u5 + Math.sqrt(0.7) * e5) < 0.05 ? 1 : 0 }); }
      if (z >= 9) { const x = raportScurt(j).ore[0]; if (/^prea-/.test(x.verdictStop) || /^prea-/.test(x.verdictP5)) vazut = true; }
    }
    if (vazut) odata++;
  }
  console.log("\nUitatul zilnic (1 h, 60 de zile × ~5/zi, ρ 0,3, de la ziua 10): măcar o dată „prea …” pe date corecte în " + (100 * odata / RS).toFixed(1).replace(".", ",") + "% din " + RS + " de istorii");
}
console.log(rele.length ? "\nPESTE PRAG (H0):\n  " + rele.join("\n  ") : "\nH0: în toate scenariile „prea puțin” ≤ 6% și „prea …” oricare ≤ 7%");
process.exit(rele.length ? 1 : 0);
