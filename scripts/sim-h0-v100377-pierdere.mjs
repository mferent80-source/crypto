// v100.377 (22.11.2026): simularea de MĂRIME sub H0 pentru proba pierderii („închid la −5% din sumă”; bilant cu intervalul de 99% pe zile).
// Pre-înregistrarea: docs/cercetare/2026-11-22-v100377-proba-pierderii.md. Ipoteza scrisă ÎNAINTE de date: închiderea la prag nu e nici mai bună,
// nici mai rea (diferența adevărată zero). Zilele au piață comună (corelația ρ în zi). Pragul: „închiderea” sau „lăsatul” în cel mult ~4% din
// seturi. Și cu diferențe cu coadă grea într-o parte (câteva pierderi foarte mari, ca la boții lui), recentrate la zero.
// Ca informație: aceeași regulă când închiderea e cu adevărat mai bună cu 3% din sumă - cât de des se vede.
// Rulare: node scripts/sim-h0-v100377-pierdere.mjs [--seturi 300]   (~1–2 min)
// REZULTATELE (22.11.2026, înainte de orice drum citit) sunt la capătul fișierului.
import { bilant, COADA_PIERDERE, START_PIERDERE, MIN_EPISOADE, MIN_ZILE } from "./lib/proba-margine.mjs";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = Number(arg("--seturi", 300)), ZI = 86400000, SD = 10;   // abaterea diferenței, în % din sumă
function set(r, o) {
  const g = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()), E = [], a = Math.sqrt(o.rho), b = Math.sqrt(1 - o.rho);
  /* coada grea: 10% din episoade sunt de 5 ori mai mari și doar în jos; media se scade ca H0 să rămână adevărată (0,1 × 5 × E|g| = 0,399) */
  const zgomot = () => (o.coada ? (r() < 0.1 ? -5 * Math.abs(g()) : g()) + 0.1 * 5 * 0.7979 : g());
  for (let z = 0; z < o.zile; z++) {
    const u = g(), k = 1 + Math.floor(r() * (2 * o.med - 1)), zz = new Date(START_PIERDERE + z * ZI).toISOString().slice(0, 10);
    for (let i = 0; i < k; i++) { const dPct = SD * (a * u + b * zgomot()) + (o.efect || 0); E.push({ id: z + "-" + i, t0: START_PIERDERE + z * ZI + i * 60000, zi: zz, d: dPct, dPct, nou: true, stop: false, dupa: {} }); }
  }
  return bilant(E, { coada: COADA_PIERDERE, samanta: 1 + Math.floor(r() * 1e9) });
}
const pct = (k) => (100 * k / R).toFixed(1).replace(".", ",") + "%";
function scenariu(et, o) {
  const r = mulberry32(377 + Math.round(o.zile * 7 + o.med * 13 + o.rho * 101 + (o.coada ? 500 : 0) + (o.efect || 0) * 17));
  let inc = 0, las = 0, na = 0, fara = 0, n = 0;
  for (let s = 0; s < R; s++) { const x = set(r, o); n += x.n; if (x.verdict === "inchiderea") inc++; else if (x.verdict === "lasatul") las++; else if (x.verdict === "n-am aflat") na++; else fara++; }
  console.log(et.padEnd(48) + " · ~" + Math.round(n / R) + " episoade · „închiderea” " + pct(inc) + " · „lăsatul” " + pct(las) + " · oricare " + pct(inc + las) + " · „n-am aflat” " + pct(na) + " · sub prag " + pct(fara));
  return (inc + las) / R;
}
console.log("\nSIMULAREA SUB H0 · v100.377 · proba pierderii (" + R + " de seturi pe rând; pragul: " + MIN_EPISOADE + " de episoade pe " + MIN_ZILE + " de zile; intervalul 99%)\n\nH0 - diferența adevărată zero:");
const rele = [];
for (const coada of [false, true]) for (const [zile, med] of [[20, 4], [30, 3], [45, 3], [60, 4]]) for (const rho of [0, 0.3, 0.6]) {
  const x = scenariu("  " + zile + " zile × ~" + med + "/zi · ρ " + String(rho).replace(".", ",") + (coada ? " · coadă grea" : ""), { zile, med, rho, coada });
  if (x > 0.04) rele.push(zile + " zile, ρ " + rho + (coada ? ", coadă grea" : "") + ": " + (100 * x).toFixed(1) + "%");
}
console.log("\nH1 - închiderea chiar e mai bună cu 3% din sumă (informativ: cât de des se vede):");
for (const [zile, med] of [[20, 4], [30, 3], [60, 4]]) scenariu("  " + zile + " zile × ~" + med + "/zi · ρ 0,3 · coadă grea", { zile, med, rho: 0.3, coada: true, efect: -3 });
console.log("\n" + (rele.length ? "PESTE 4% sub H0:\n  " + rele.join("\n  ") : "Sub H0, verdictul fals rămâne sub 4% în toate scenariile."));
// REZULTATELE (22.11.2026, 300 de seturi pe rând, înainte de orice drum citit), cu intervalul de 99%:
//   H0 (diferența adevărată zero): verdict fals („închiderea” sau „lăsatul”) în 0,3–3,7% din seturi; 5,0% într-un singur scenariu (20 de zile, coadă
//   grea, fără corelație în zi) - acolo aproape tot e „lăsatul” fals (4,7%). Cu coadă grea, falsul „lăsatul” (1,0–4,7%) e mai des decât falsul
//   „închiderea” (0,0–0,7%).
//   Prima variantă, cu intervalul de 97,5%: 2,3–6,0% ⇒ schimbată la 99% înainte de date (vezi pre-înregistrarea).
//   H1 (închiderea chiar mai bună cu 3% din sumă, ρ 0,3, coadă grea): „închiderea” în 17,0% / 19,7% / 49,3% din seturi (~80 / 90 / 240 de episoade).
//   LIMITĂ: puterea e mică - la prag (60–90 de episoade) o îmbunătățire adevărată de 3% din sumă rămâne „n-am aflat” în patru cazuri din cinci.
