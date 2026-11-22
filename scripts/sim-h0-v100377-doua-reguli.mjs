// v100.377 (22.11.2026): simularea sub H0 pentru DOUĂ reguli de ieșire puse la probă deodată („închid la −5% din sumă” și „închid după 4 ore pe minus”).
// Întrebarea, scrisă ÎNAINTE de date: cu două probe pe aceiași boți, cât de des dă MĂCAR UNA un verdict fals când niciuna nu schimbă nimic - cu
// intervalul de 99% la fiecare (coada 0,005) și cu cel de 99,5% (coada 0,0025)? Pragul hotărât dinainte: familia (oricare din două) la cel mult ~5%
// sub H0; altfel amândouă trec la intervalul mai larg.
//
// A DOUA VARIANTĂ (22.11, după auditul independent; tot înainte de orice drum citit pentru verdict). Prima variantă avea trei greșeli:
//   1. regula a doua avea ~0,7 episoade pe zi, deci în scenariile de 60 de zile nu ajungea la 60 de episoade și nu putea da niciun verdict -
//      „familia” măsura acolo doar prima regulă;
//   2. judeca amândouă regulile la o dată fixă; pe viu fiecare se îngheață la PRIMA tură cu 60 de episoade pe 20 de zile (mărimea minimă);
//   3. zilele erau independente; un bot ținut trei zile trăiește aceeași piață ca unul pornit a doua zi.
// Acum: zilele vin una după alta până când fiecare regulă își atinge pragul și se îngheață acolo (ca tura colectorului); pe lângă zilele
// independente sunt scenarii în care factorul zilei ține de cel de ieri (AR(1) 0,5) - o PRESUPUNERE, nemăsurată pe boții lui.
// Rulare: node scripts/sim-h0-v100377-doua-reguli.mjs [--seturi 600]   (~5 min)
// REZULTATELE sunt la capătul fișierului.
import { bilant, START_PIERDERE, MIN_EPISOADE, MIN_ZILE } from "./lib/proba-margine.mjs";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = Number(arg("--seturi", 600)), ZI = 86400000, SD = 10, MAX_ZILE = 600;
/* câte episoade într-o zi, cu media `m` (0,5 ⇒ o zi din două are unul; 1 ⇒ 0, 1 sau 2; 3 ⇒ 1…5) */
const cate = (r, m) => (m < 1 ? (r() < m ? 1 : 0) : Math.floor(r() * (2 * m + 1)));
// un set: cele două reguli, fiecare înghețată la prima zi în care are MIN_EPISOADE pe MIN_ZILE (o singură privire)
function pereche(r, o, coada) {
  const g = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()), a = Math.sqrt(o.rho), b = Math.sqrt(1 - o.rho), E = [[], []], zile = [new Set(), new Set()], V = [null, null];
  const zgomot = () => (o.grea ? (r() < 0.1 ? -5 * Math.abs(g()) : g()) + 0.1 * 5 * 0.7979 : g());
  let u = g();
  for (let z = 0; z < MAX_ZILE && (V[0] === null || V[1] === null); z++) {
    /* factorul zilei: independent sau legat de cel de ieri (aceeași varianță) */
    u = o.ar ? o.ar * u + Math.sqrt(1 - o.ar * o.ar) * g() : g();
    const zz = new Date(START_PIERDERE + z * ZI).toISOString().slice(0, 10);
    for (const k of [0, 1]) {
      if (V[k] !== null) continue;
      const n = cate(r, k === 0 ? o.m1 : o.m2);
      for (let i = 0; i < n; i++) { const dPct = SD * (a * u + b * zgomot()) + (o.efect || 0); E[k].push({ id: k + "-" + z + "-" + i, t0: START_PIERDERE + z * ZI + (k * 100 + i) * 60000, zi: zz, d: dPct, dPct, nou: true, stop: false, dupa: {} }); zile[k].add(zz); }
      if (E[k].length >= MIN_EPISOADE && zile[k].size >= MIN_ZILE) V[k] = { v: bilant(E[k], { coada, samanta: 1 + Math.floor(r() * 1e9) }).verdict, n: E[k].length, zile: z + 1 };
    }
  }
  return V;
}
const pct = (k) => (100 * k / R).toFixed(1).replace(".", ",") + "%", hot = (x) => !!x && (x.v === "inchiderea" || x.v === "lasatul");
function scenariu(et, o, coada) {
  const r = mulberry32(37712 + Math.round(o.m1 * 7 + o.m2 * 31 + o.rho * 101 + (o.grea ? 500 : 0) + (o.ar || 0) * 1009 + (o.efect || 0) * 17 + coada * 1e6));
  let f1 = 0, f2 = 0, oricare = 0, b1 = 0, b2 = 0, z1 = 0, z2 = 0, fara = 0;
  for (let s = 0; s < R; s++) { const [x, y] = pereche(r, o, coada); if (!x || !y) fara++; if (hot(x)) f1++; if (hot(y)) f2++; if (hot(x) || hot(y)) oricare++; if (x && x.v === "inchiderea") b1++; if (y && y.v === "inchiderea") b2++; z1 += x ? x.zile : MAX_ZILE; z2 += y ? y.zile : MAX_ZILE; }
  console.log(et.padEnd(46) + " · prag atins în ~" + Math.round(z1 / R) + " / ~" + Math.round(z2 / R) + " zile · verdict la prima " + pct(f1) + " · la a doua " + pct(f2) + " · la MĂCAR una " + pct(oricare) + (o.efect ? " · „închiderea”: " + pct(b1) + " / " + pct(b2) : "") + (fara ? " · fără prag: " + fara : ""));
  return oricare / R;
}
const S = [
  ["A. 1 / 0,5 pe zi · ρ 0,3", { m1: 1, m2: 0.5, rho: 0.3 }], ["B. 1 / 0,5 pe zi · ρ 0,3 · coadă grea", { m1: 1, m2: 0.5, rho: 0.3, grea: true }],
  ["C. 1 / 0,5 pe zi · ρ 0,6 · coadă grea", { m1: 1, m2: 0.5, rho: 0.6, grea: true }], ["D. 3 / 1,5 pe zi · ρ 0,3 · coadă grea", { m1: 3, m2: 1.5, rho: 0.3, grea: true }],
  ["E. ca B, zile legate (AR 0,5)", { m1: 1, m2: 0.5, rho: 0.3, grea: true, ar: 0.5 }], ["F. ca C, zile legate (AR 0,5)", { m1: 1, m2: 0.5, rho: 0.6, grea: true, ar: 0.5 }],
  ["G. ca D, zile legate (AR 0,5)", { m1: 3, m2: 1.5, rho: 0.3, grea: true, ar: 0.5 }],
];
for (const coada of [0.005, 0.0025]) {
  console.log("\n=== intervalul de " + (coada === 0.005 ? "99%" : "99,5%") + " la fiecare regulă · fiecare înghețată la primul prag (" + MIN_EPISOADE + " de episoade pe " + MIN_ZILE + " de zile) · " + R + " de seturi pe rând ===\nH0 - niciuna din reguli nu schimbă nimic:");
  let indep = 0, legate = 0;
  for (const [et, o] of S) { const x = scenariu("  " + et, o, coada); if (o.ar) legate = Math.max(legate, x); else indep = Math.max(indep, x); }
  console.log("  cel mai rău, la MĂCAR una: zile independente " + (100 * indep).toFixed(1).replace(".", ",") + "% · zile legate " + (100 * legate).toFixed(1).replace(".", ",") + "%");
  console.log("H1 - amândouă chiar mai bune cu 3% din sumă (informativ: cât de des se vede la prag):");
  scenariu("  ca B, efect −3%", { m1: 1, m2: 0.5, rho: 0.3, grea: true, efect: -3 }, coada);
  scenariu("  ca D, efect −3%", { m1: 3, m2: 1.5, rho: 0.3, grea: true, efect: -3 }, coada);
}
// REZULTATELE (22.11.2026, a doua variantă, 600 de seturi pe rând, înainte de orice drum citit pentru verdict; eroarea unei cifre: ~±1 punct):
//   Cu 99% la fiecare, sub H0, verdict fals la MĂCAR una din două: zile independente 2,3% (A) · 4,8% (B) · 3,2% (C) · 6,8% (D: 3 / 1,5 episoade pe zi,
//   pragul atins în ~24 de zile); zile legate (AR 0,5, presupunere) 7,7% · 7,8% · 10,2%. ⇒ TRECE de pragul de ~5% scris dinainte.
//   Cu 99,5% la fiecare: zile independente 2,5% · 3,3% · 1,5% · 3,7%; zile legate 6,0% · 5,7% · 7,5%.
//   ⇒ HOTĂRÂREA (după regula scrisă dinainte): amândouă probele trec la intervalul de 99,5% (COADA_PIERDERE = COADA_TIMP = 0,0025). Cu zile
//   independente familia rămâne sub 4%; dacă zilele sunt legate cât am presupus, e în jur de 6–7,5% - spus în pre-înregistrări, la „Ce NU poate spune”.
//   H1 (amândouă chiar mai bune cu 3% din sumă), cu 99,5%, la primul prag: „închiderea” în 8,7% / 10,7% din seturi (B) și 9,3% / 5,8% (D).
//   LIMITĂ: puterea la prag e mică - o îmbunătățire adevărată de 3% din sumă rămâne „n-am aflat” în aproximativ nouă cazuri din zece.
//   Prima variantă (22.11, dimineața) scria „0,3–3,7%”: regula a doua nu-și atingea pragul în scenariile de 60 de zile și nicio regulă nu era oprită
//   la primul prag - cifra aceea nu măsura familia. Găsit de auditul independent; varianta de față o înlocuiește.
