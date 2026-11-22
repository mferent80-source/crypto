// v100.376 (21.11.2026): simularea de MĂRIME sub H0 pentru verificarea șansei take-profit-ului (raportScurt: nTp / verdictTp, tura-monte-carlo-bot.mjs).
// Pre-înregistrarea: docs/cercetare/2026-11-21-v100376-sansa-take-profit.md. Ipoteza scrisă ÎNAINTE de date: șansa e CORECTĂ - fiecare notare are
// take-profit-ul atins cu exact șansa prezisă (pTp). Zilele au piață comună (copulă gaussiană, corelația ρ în zi). Pragul: pe ecran „prezice prea
// puțin” sau „prea mult” în cel mult ~5% din seturi. Unitatea = setul (o istorie de notări a lui).
// Ca informație: aceeași regulă când șansa adevărată e de 2 ori cea prezisă - cât de des se vede și cât de des ar zice fals „se potrivește”.
// Rulare: node scripts/sim-h0-v100376-tp.mjs [--seturi 4000]   (~30 s)
// REZULTATELE (21.11.2026, 4000 de seturi pe rând, înainte de orice notare reală) sunt sub cod, la capătul fișierului.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const { raportScurt } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs")).href);
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const Phi = (x) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
const T0 = Date.UTC(2026, 10, 22), ZI = 86400000, R = Number(arg("--seturi", 4000));
// șansele prezise pe orizont, cum le dă simulatorul pe boții lui cu take-profit (mici pe 1 h, mai mari pe o zi; botul lui din 21.11: sub 0,1% / sub 0,1% / 2,8%)
const PTP = { 1: (r) => 0.0005 + r() * 0.03, 4: (r) => 0.002 + r() * 0.1, 24: (r) => 0.01 + r() * 0.35 };
function set(r, { ore, zile, med, rho, fact = 1 }) {
  const g = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()), j = [], a = Math.sqrt(rho), b = Math.sqrt(1 - rho);
  for (let z = 0; z < zile; z++) {
    const u = g(), k = 1 + Math.floor(r() * (2 * med - 1)), zz = new Date(T0 + z * ZI).toISOString().slice(0, 10);
    for (let i = 0; i < k; i++) {
      const p = PTP[ore](r), tp = Phi(a * u + b * g()) < Math.min(1, p * fact) ? 1 : 0;
      j.push({ id: "b" + z + "-" + i, ore: 1, t: T0 + z * ZI, z: zz, pStop: 0.05, p5: -1, total: 0, stare: "judecat", stop: 0, sub5: 0, pTp: p, areTp: true, tp });
    }
  }
  return raportScurt(j).ore[0];
}
const pct = (k) => (100 * k / R).toFixed(1).replace(".", ",") + "%";
function scenariu(eticheta, o) {
  const r = mulberry32(376 + Math.round(o.zile * 7 + o.med * 13 + o.rho * 101 + o.ore * 3 + (o.fact || 1) * 17));
  let pp = 0, pm = 0, pot = 0, putine = 0, n = 0;
  for (let s = 0; s < R; s++) { const x = set(r, o); n += x.nTp; if (x.verdictTp === "prea-putin") pp++; if (x.verdictTp === "prea-mult") pm++; if (x.verdictTp === "potrivit") pot++; if (x.verdictTp === "putine") putine++; }
  console.log(eticheta.padEnd(40) + " · ~" + Math.round(n / R) + " judecate · prea puțin " + pct(pp) + " · prea mult " + pct(pm) + " · oricare " + pct(pp + pm) + " · se potrivește " + pct(pot) + " · strânge date " + pct(putine));
  return { oric: (pp + pm) / R };
}
console.log("\nSIMULAREA SUB H0 · v100.376 · șansa take-profit-ului verificată (" + R + " de seturi pe rând)\n");
console.log("H0 - șansa corectă:");
const rele = [];
for (const ore of [1, 4, 24]) for (const [zile, med] of [[10, 3], [14, 3], [30, 5], [60, 10]]) for (const rho of [0, 0.3, 0.6]) {
  const x = scenariu("  " + ore + " h · " + zile + " zile × ~" + med + "/zi · ρ " + String(rho).replace(".", ","), { ore, zile, med, rho });
  if (x.oric > 0.06) rele.push(ore + " h, " + zile + " zile, ρ " + rho + ": oricare " + (100 * x.oric).toFixed(1) + "%");
}
console.log("\nH1 - șansa adevărată de 2 ori cea prezisă (informativ: cât vede, cât zice fals „se potrivește”):");
for (const ore of [1, 4, 24]) for (const [zile, med] of [[14, 3], [30, 5], [60, 10]]) scenariu("  " + ore + " h · " + zile + " zile × ~" + med + "/zi · ρ 0,3", { ore, zile, med, rho: 0.3, fact: 2 });
console.log("\n" + (rele.length ? "PESTE 6% sub H0:\n  " + rele.join("\n  ") : "Sub H0, „prea puțin / prea mult” rămâne sub 6% în toate scenariile."));
// REZULTATELE (21.11.2026, 4000 de seturi pe rând, 1 h / 4 h / 24 h × 10–60 de zile × ρ 0 / 0,3 / 0,6), înainte de orice notare reală:
//   H0 (șansa corectă): „prea puțin” ≤ 0,4% peste tot; „prea mult” ≤ 2,3% (24 h, ρ 0,6, ~600 de judecate); oricare ≤ 2,6%. Cu ~30 de judecate
//   pe 10 zile, 45% din seturi rămân la „strânge date” (pragul de 30 de judecate), restul fără niciun verdict greșit.
//   H1 (șansa adevărată de 2× cea prezisă, ρ 0,3): „prea puțin” la 24 h 31% / 90% / 100% (~42 / 150 / 600 de judecate), la 4 h 2% / 12% / 65%,
//   la 1 h 0,1% / 0,7% / 10%.
//   LIMITĂ: la 1 h șansele prezise sunt de ~1,5%, iar marja lui „se potrivește” e de ±3 puncte ⇒ cu ~600 de judecate, o șansă de 2× mai mare
//   primește „se potrivește” în 31% din seturi. La 1 h „se potrivește” înseamnă doar „în marja de 3 puncte”; la 4 h și 24 h falsul „se potrivește” e 0%.
