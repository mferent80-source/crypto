// v100.271 (ideile auditului 29.10) - CERCETARE, nu probă din lanțul de teste: ajustarea riscului Monte Carlo pe termen scurt după agitația
// ultimei zile. Scris ÎNAINTE de orice rulare pe date noi (29.10, după ce văzusem doar cifrele auditorului pe tot eșantionul).
//
// ───────────── PROTOCOLUL (fixat înainte) ─────────────
// IPOTEZA (mecanismul): volatilitatea vine în valuri - o zi agitată e urmată mai des de agitație. Drumurile Monte Carlo sunt lipite din
//   blocuri de o zi trase din TOATE cele 31 de zile, deci după o zi agitată subestimează mișcarea de mâine (stopul atins mai rar decât în
//   realitate), iar după una liniștită o supraestimează. Remediul propus: drumul (log, față de prețul de acum, după scoaterea tendinței)
//   înmulțit cu k = clamp((σ ultimele 24 h / σ cele 31 de zile)^β, 0,5, 2). σ = rădăcina mediei pătratelor randamentelor log închidere-închidere.
// VARIANTELE (numărate): β ∈ {0 (metoda de azi), 0,25, 0,5, 0,75, 1} ⇒ 4 variante noi. Ferestrele (24 h / 31 de zile) și limitele [0,5; 2]
//   vin din audit și NU se caută. Înainte: auditorul a încercat pe ACELEAȘI date β = 0,64 (ales pe ele), „blocuri din ultimele 7 zile” și
//   „blocuri aliniate la ora zilei” ⇒ în total 7 variante pe idee; corecția: β se alege DOAR pe antrenare, iar pe datele nevăzute se face UN
//   SINGUR test (β* față de 0) ⇒ fără corecție pentru alegere; 1 h / 4 h sunt gărzi „nu strică” (necorectate = mai stricte).
// DATELE: 73 de monede, bare reale de 1 h (data/istoric-1h, doar citire). Notare la 00:00 UTC în fiecare zi cu ≥ 31 de zile de istoric
//   înainte și ≥ 24 h după. Pe fiecare (monedă, zi) DOUĂ setări (tipicul lui: grid 8,3% centrat pe preț, 25 de intervale, 5×, funding 0):
//   short cu stopul la 2% peste marginea de sus, long cu stopul la 2% sub marginea de jos. 300 de drumuri, metoda GridSim (blocuri de o zi,
//   tendința scoasă, mijlocul recentrat - aceeași ca în public/lib/grid-sim.js, pe 24 de bare pe zi), ACELEAȘI drumuri pentru toate β.
// ÎMPĂRȚIREA (fixată acum): monedele amestecate cu mulberry32(271) ⇒ primele 50 = antrenare, ultimele 23 = ținute deoparte.
//   Zilele: antrenare = notările dinainte de 01.08.2026 00:00 UTC; embargo 2 zile (01–02.08 nu intră nicăieri); test = de la 03.08.2026.
// ALEGEREA: β* = argmin Brier(„stopul atins”, 1 zi) pe antrenare (50 de monede × zilele de antrenare), ambele setări.
// METRICA: Brier ×100 pe „stopul atins până la h” (h = 1 h, 4 h, 1 zi); ΔBrier = Brier(β*) − Brier(β = 0), negativ = mai bine.
//   Interval 95%: bootstrap pe BLOCURI DE 5 ZILE consecutive (toate notările unei zile împreună - unitatea e ZIUA), 4000 de reeșantionări.
//   Plus, descriptiv: prezis − real pe zilele agitate (σ24/σ31 > 1,3) și liniștite (< 0,77); pierderea din cele mai proaste 5% (pinball 5%).
// TRECE dacă TOATE: (a) T1 = 23 de monede ținute deoparte × zilele de test, 1 zi: IC 95% al ΔBrier întreg sub 0;
//   (b) T1, 1 h și 4 h: IC-ul NU e întreg peste 0; (c) T2 = cele 50 de monede de antrenare × zilele de test, 1 zi: ΔBrier ≤ 0 (același sens);
//   (d) T1, 1 zi: pinball-ul pe p5 nu se înrăutățește semnificativ (IC nu e întreg peste 0) - dacă doar (d) pică, ajustarea intră DOAR la stop.
// MĂRIMEA TESTULUI (înainte de a citi T1): sub H0, y* ~ Bernoulli((pA + pB) / 2) (cele două prognoze au exact același Brier așteptat), cu
//   factor comun pe zi (copulă gaussiană, ρ = 0,1 / 0,3, persistență AR(1) 0,5 între zile) ⇒ cât de des iese IC-ul întreg sub 0 (≈ 2,5%).
// DESCRIPTIV (nu decide): pe direcții, fereastra care crește (β ales din nou la 14 zile pe tot ce era înainte), monedele ținute deoparte
//   pe zilele de antrenare.
// AMENDAMENT (29.10, după `alege` ⇒ β* = 0,75 și după `marime`, ÎNAINTE de a citi rezultatele din T1): sub H0 intervalul de 95% ieșea
//   „întreg sub 0” în 4,3–7,0% din cazuri (ținta 2,5%) - bootstrap-ul pe ~17 blocuri de zile acoperă prea puțin. Criteriul (a) folosește
//   de acum nivelul CALIBRAT: cel mai mic nivel unilateral din {2,5%, 1%, 0,5%, 0,25%} la care mărimea simulată (1000 de repetări, ρ = 0,1 și
//   0,3, 1 zi) e ≤ 2,5%. Gărzile (b) și (d) rămân pe 95% necalibrat (mai largi la „strică” = mai stricte).
// ──────────────────────────────────────────────────────
// JURNALUL CERCETĂRII (fiecare variantă, și cele picate; Brier ×100 pe „stopul atins”, Δ = variantă − azi, negativ = mai bine)
//   Datele: data/istoric-1h așa cum era la 29.10 19:10 (73 de monede, notări 28.05…27.10.2026, 21.706 = 10.853 (monedă, zi) × 2 setări).
//   Codul: public/lib/grid-proba.js + monte-simbol.js de la 7836ec8 (v100.270). Sămânța drumurilor 12, a împărțirii 271.
//   V0 (auditorul, 29.10, TOT eșantionul, o direcție trasă la întâmplare): azi prezice 20,2% după zile agitate, real 37,9%.
//   V1 (auditorul, același eșantion): β = 0,64 (ales pe ele) ⇒ 1 zi −0,6 [−0,9; −0,4] - în eșantion, nu e dovadă.
//   V2–V3 (auditorul): blocuri doar din ultimele 7 zile; blocuri aliniate la ora zilei - nu ajută (a5-evaluare.mjs).
//   V4–V7 (aici, β = 0,25 / 0,5 / 0,75 / 1, simetric): pe ANTRENARE (6.304 notări, 81 de zile, 48 de monede cu date) 1 zi 14,15 / 13,93 /
//     13,90 / 13,99 (azi 14,67) ⇒ β* = 0,75. Mărimea: la 95% necalibrat IC-ul ieșea întreg sub 0 în 4,3–7,0% sub H0 ⇒ nivelul calibrat 0,5%.
//     T1 (23 de monede deoparte × 86 de zile de test, 3.732 de notări), β* = 0,75: 1 h −0,05 [−0,08; −0,02] · 4 h −0,31 [−0,42; −0,20] ·
//     1 zi −0,28 [−0,69; 0,19] (calibrat [−0,82; 0,33]) ⇒ (a) PICĂ. T2 (50 de monede × zilele de test): 1 zi −0,74 [−1,31; −0,16].
//     De ce: după zile agitate ajută mult (1 zi prezis − real −17,5 ⇒ −4,6; Δ −3,1 [−4,7; −1,1]), dar după zile liniștite corectează PREA
//     MULT (+3,8 ⇒ −8,0; Δ +0,4 [−0,2; 1,3]) și în medie coboară stopul (20,6% ⇒ 17,6%, real 22,7%). Fereastra care crește (β ales mereu
//     0,75): −0,31 [−0,62; 0,06]. ⇒ VERDICT: NU TRECE; codul aplicației nu se schimbă.
//   După verdict (descriptiv, nu decide; alegerea pe T1 ar fi alegere pe date de test): T1 1 zi β 0,25 −0,38 [−0,53; −0,20], β 0,5 −0,46
//     [−0,73; −0,13], β 1 −0,08 [−0,60; 0,50]. V8 (asimetric, k = max(1, …)), DOAR pe antrenare: 1 zi 14,45 / 14,26 / 14,18 / 14,18 -
//     mai slab decât simetricul (13,90) chiar acolo ⇒ nu e pista. Total variante pe idee: 8 (3 ale auditorului + 4 simetrice + 1 asimetrică).
//   Ce aș face EU mai departe: un singur test nou, scris dinainte, pe zile care încă nu există (de la 28.10, ~60 de zile ⇒ după 27.12):
//     β = 0,5 (cel mai bun pe TOATE notările de acum: 1 zi 15,34, față de 15,36 la 0,75 și 16,03 azi; fixat ACUM, nu după), aceleași
//     criterii; până atunci riscul pe termen scurt rămâne nescalat.
// ──────────────────────────────────────────────────────
// Folosire:  node scripts/cercetare-v100271-agitatie.mjs reluare <dosar-iesire> <parte> <din>   (o parte din monede, în paralel)
//            node scripts/cercetare-v100271-agitatie.mjs alege   <dosar-iesire>                  (doar antrenarea)
//            node scripts/cercetare-v100271-agitatie.mjs marime  <dosar-iesire> <beta>           (mărimea, fără rezultatele T1)
//            node scripts/cercetare-v100271-agitatie.mjs testeaza <dosar-iesire> <beta> <nivel>  (T1, T2 și descriptivul; nivelul calibrat)
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const LIB = new URL("../public/lib/", import.meta.url);
for (const f of ["grid-calcul.js", "grid-proba.js", "monte-simbol.js"]) vm.runInThisContext(fs.readFileSync(new URL(f, LIB), "utf8"), { filename: f });
const GP = globalThis.GridProba, M = globalThis.MonteSimbol;

const DATE = "C:/Users/Cimin/crypto/data/istoric-1h/";
const BZ = 24, IST = 31 * BZ, ORIZ = [1, 4, 24], N = 300, BETE = [0, 0.25, 0.5, 0.75, 1], KMIN = 0.5, KMAX = 2;
const ZI_SPLIT = Math.floor(Date.UTC(2026, 7, 1) / 864e5), EMBARGO = 2, BLOC = 5, BOOT = 4000;
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pc = (v, p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];

function monede() { return fs.readdirSync(DATE).filter((f) => f.endsWith("_USDT_PERP.json")).map((f) => f.replace("_USDT_PERP.json", "")).sort(); }
function impartire() {   // fixată: mulberry32(271), Fisher-Yates ⇒ 50 / 23
  const m = monede(), r = mulberry32(271);
  for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; }
  return { antrenare: new Set(m.slice(0, 50)), deoparte: new Set(m.slice(50)) };
}
function bare1h(mon) {
  const a = JSON.parse(fs.readFileSync(DATE + mon + "_USDT_PERP.json", "utf8"));
  return a.map((x) => ({ t: Number(x.time), o: Number(x.open), h: Number(x.high), l: Number(x.low), c: Number(x.close), v: Number(x.volume) })).filter((x) => x.c > 0 && x.h >= x.l);
}
function tendinta(b) { let s = 0, n = 0; for (let i = 1; i < b.length; i++) if (b[i].c > 0 && b[i - 1].c > 0) { s += Math.log(b[i].c / b[i - 1].c); n++; } return n ? s / n : 0; }
function sigma(a) { let s = 0, n = 0; for (let i = 1; i < a.length; i++) { const r = Math.log(a[i].c / a[i - 1].c); if (isFinite(r)) { s += r * r; n++; } } return n ? Math.sqrt(s / n) : NaN; }
// drumul înmulțit cu k în log, față de P0 (= randamentul fiecărei bare față de închiderea de dinainte, înmulțit cu k; tendința deja scoasă)
function scalat(d, P0, k) { if (k === 1) return d; const f = (v) => P0 * Math.pow(v / P0, k); return d.map((x) => ({ t: x.t, o: f(x.o), h: f(x.h), l: f(x.l), c: f(x.c), v: x.v })); }

function reluare(dosar, parte, din) {
  const out = [], t0 = Date.now(), lista = monede().filter((_, i) => i % din === parte);
  for (const mon of lista) {
    const b = bare1h(mon);
    for (let i0 = IST; i0 + BZ <= b.length; i0++) {
      if (new Date(b[i0].t).getUTCHours() !== 0) continue;
      const hist = b.slice(i0 - IST, i0), P0 = hist[hist.length - 1].c, rv = sigma(hist.slice(-25)) / sigma(hist);
      if (!isFinite(rv) || !(rv > 0)) continue;
      // drumurile ca în GridSim.simuleaza: întâi mijlocul (mediana capetelor), apoi aceeași sămânță ⇒ drumurile
      const mu = tendinta(hist), r0 = M.generator(12), v0 = [];
      for (let q = 0; q < N; q++) { const d0 = M.drum(hist, BZ, BZ, P0, r0, mu); v0.push(Math.log(d0[d0.length - 1].c / P0)); }
      v0.sort((a, c) => a - c); const m = mu + pc(v0, 0.5) / BZ, rnd = M.generator(12), drumuri = [];
      for (let q = 0; q < N; q++) drumuri.push(M.drum(hist, BZ, BZ, P0, rnd, m));
      for (const dir of ["short", "long"]) {
        const st = { jos: P0 * (1 - 0.0415), sus: P0 * (1 + 0.0415), grile: 25, levier: 5, dir, stop: null, tip: null, fundingZi: 0 };
        st.stop = dir === "short" ? { sus: st.sus * 1.02 } : { jos: st.jos * 0.98 };
        const rr = GP.simuleaza(b, i0, BZ, st, { traseu: true, barePeZi: BZ }), Lr = rr.traseu.net.length;
        const ys = ORIZ.map((h) => (rr.oprit && rr.bare <= h ? 1 : 0)), netR = ORIZ.map((h) => rr.traseu.net[Math.min(h, Lr) - 1]);
        const ps = [], p5 = [], pl = [], ks = [];
        for (const beta of BETE) {
          const k = beta === 0 ? 1 : Math.min(KMAX, Math.max(KMIN, Math.pow(rv, beta))); ks.push(k);
          const s = [0, 0, 0], l = [0, 0, 0], nets = [[], [], []];
          for (const d of drumuri) {
            const r = GP.simuleaza(scalat(d, P0, k), 0, BZ, st, { traseu: true, barePeZi: BZ }), L = r.traseu.net.length;
            ORIZ.forEach((h, j) => { if (r.oprit && r.bare <= h) s[j]++; if (r.lichidat && r.bare <= h) l[j]++; nets[j].push(r.traseu.net[Math.min(h, L) - 1]); });
          }
          ps.push(s.map((x) => x / N)); pl.push(l.map((x) => x / N)); p5.push(nets.map((v) => pc(v.sort((a, c) => a - c), 0.05)));
        }
        out.push({ mon, zi: Math.floor(b[i0].t / 864e5), dir, rv, ks, ys, netR, ps, p5, pl });
      }
    }
    process.stderr.write(mon + " " + out.length + " " + Math.round((Date.now() - t0) / 1000) + "s\n");
  }
  fs.mkdirSync(dosar, { recursive: true });
  fs.writeFileSync(path.join(dosar, "parte-" + parte + "-din-" + din + ".json"), JSON.stringify(out));
  console.log("parte", parte, "notări", out.length, "secunde", Math.round((Date.now() - t0) / 1000));
}

function incarca(dosar) {
  const R = []; for (const f of fs.readdirSync(dosar).filter((x) => /^parte-\d+-din-\d+\.json$/.test(x))) R.push(...JSON.parse(fs.readFileSync(path.join(dosar, f), "utf8")));
  const { antrenare, deoparte } = impartire();
  for (const e of R) e.set = e.zi < ZI_SPLIT ? (antrenare.has(e.mon) ? "antr" : "deoparteAntr") : e.zi >= ZI_SPLIT + EMBARGO ? (deoparte.has(e.mon) ? "T1" : "T2") : "embargo";
  return R;
}
const f1 = (x) => (x * 100).toFixed(1).replace(".", ",").replace("-", "−"), f2 = (x) => (x * 100).toFixed(2).replace(".", ",").replace("-", "−");
const brier = (L, b, j) => L.reduce((s, e) => s + (e.ps[b][j] - e.ys[j]) ** 2, 0) / L.length;
const pinball = (q, y, tau = 0.05) => (y - q) * (tau - (y < q ? 1 : 0));
// bootstrap pe blocuri de zile consecutive; perZi = [{ n, d }] în ordinea zilelor; ⇒ [2,5%; 97,5%] din Σd / Σn
function blocBootV(perZi, rnd, B = BOOT, L = BLOC) {
  const D = perZi.length, v = [];
  for (let r = 0; r < B; r++) { let n = 0, d = 0, luate = 0; while (luate < D) { const s = Math.floor(rnd() * (D - L + 1)); for (let j = 0; j < L && luate < D; j++, luate++) { n += perZi[s + j].n; d += perZi[s + j].d; } } v.push(d / n); }
  return v.sort((a, c) => a - c);
}
const icDin = (v, a) => [v[Math.floor(a * v.length)], v[Math.ceil((1 - a) * v.length) - 1]];   // a = nivelul unilateral (0,025 ⇒ 95%)
function blocBoot(perZi, rnd, B = BOOT, L = BLOC, a = 0.025) { return icDin(blocBootV(perZi, rnd, B, L), a); }
function peZile(L, fd) {
  const zile = [...new Set(L.map((e) => e.zi))].sort((a, c) => a - c), iz = new Map(zile.map((z, i) => [z, i])), perZi = zile.map(() => ({ n: 0, d: 0 }));
  for (const e of L) { const z = perZi[iz.get(e.zi)]; z.n++; z.d += fd(e); }
  return perZi;
}
function dif(L, fd, seed) { const pz = peZile(L, fd), T = pz.reduce((a, z) => ({ n: a.n + z.n, d: a.d + z.d }), { n: 0, d: 0 }); return { est: T.d / T.n, ic: blocBoot(pz, mulberry32(seed)), zile: pz.length, n: T.n }; }
const txtDif = (r) => f2(r.est) + " [" + f2(r.ic[0]) + "; " + f2(r.ic[1]) + "] (n " + r.n + ", " + r.zile + " zile)";

function alege(dosar) {
  const R = incarca(dosar), A = R.filter((e) => e.set === "antr");
  console.log("ANTRENARE: notări", A.length, "zile", new Set(A.map((e) => e.zi)).size, "monede", new Set(A.map((e) => e.mon)).size);
  BETE.forEach((beta, b) => console.log("  β", String(beta).padEnd(5), "Brier stop 1 h", f2(brier(A, b, 0)), "· 4 h", f2(brier(A, b, 1)), "· 1 zi", f2(brier(A, b, 2))));
  let best = 0; BETE.forEach((_, b) => { if (brier(A, b, 2) < brier(A, best, 2)) best = b; });
  console.log("β* (ales pe antrenare, 1 zi) =", BETE[best]);
}
function indice(beta) { const b = BETE.indexOf(Number(beta)); if (b < 0) throw new Error("β necunoscut: " + beta); return b; }
function marime(dosar, beta) {
  const R = incarca(dosar), b = indice(beta), T1 = R.filter((e) => e.set === "T1");   // doar PROGNOZELE din T1, fără e.ys
  const g = mulberry32(4242), gauss = () => { let u = 0; while (u === 0) u = g(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * g()); };
  const erf = (x) => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
  const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2)), zile = [...new Set(T1.map((e) => e.zi))].sort((a, c) => a - c), iz = new Map(zile.map((z, i) => [z, i]));
  const NIV = [0.025, 0.01, 0.005, 0.0025], REP = Number(process.env.REP || 1000);
  for (const rho of [0.1, 0.3]) for (let j = 0; j < 3; j++) {
    const sub = NIV.map(() => 0), peste = NIV.map(() => 0);
    for (let r = 0; r < REP; r++) {
      const Z = []; let z = gauss(); for (let i = 0; i < zile.length; i++) { z = 0.5 * z + Math.sqrt(1 - 0.25) * gauss(); Z.push(z); }
      const pz = zile.map(() => ({ n: 0, d: 0 }));
      for (const e of T1) { const i = iz.get(e.zi), pA = e.ps[b][j], pB = e.ps[0][j], m = (pA + pB) / 2, y = Phi(Math.sqrt(rho) * Z[i] + Math.sqrt(1 - rho) * gauss()) < m ? 1 : 0, q = pz[i]; q.n++; q.d += (pA - y) ** 2 - (pB - y) ** 2; }
      const v = blocBootV(pz, mulberry32(9000 + r), 2000);
      NIV.forEach((a, k) => { const ic = icDin(v, a); if (ic[1] < 0) sub[k]++; if (ic[0] > 0) peste[k]++; });
    }
    console.log("MĂRIME sub H0 · ρ", rho, "·", ["1 h", "4 h", "1 zi"][j], "· IC întreg sub 0 / peste 0 la nivelul unilateral " + NIV.map((a, k) => f2(a) + "%: " + f1(sub[k] / REP) + "% / " + f1(peste[k] / REP) + "%").join(" · ") + " (ținta ≤ 2,5%)");
  }
}
function testeaza(dosar, beta) {
  const R = incarca(dosar), b = indice(beta), H3 = ["1 h", "4 h", "1 zi"];
  const dB = (j) => (e) => (e.ps[b][j] - e.ys[j]) ** 2 - (e.ps[0][j] - e.ys[j]) ** 2, dQ = (j) => (e) => pinball(e.p5[b][j], e.netR[j]) - pinball(e.p5[0][j], e.netR[j]);
  const rez = {};
  for (const set of ["T1", "T2", "deoparteAntr"]) {
    const L = R.filter((e) => e.set === set);
    console.log("\n=== " + set + ": notări " + L.length + ", zile " + new Set(L.map((e) => e.zi)).size + ", monede " + new Set(L.map((e) => e.mon)).size + " · β* = " + beta);
    rez[set] = [];
    for (let j = 0; j < 3; j++) {
      const r = dif(L, dB(j), 100 + j), q = dif(L, dQ(j), 200 + j); rez[set].push({ r, q });
      const mp = (f) => f1(L.reduce((s, e) => s + f(e), 0) / L.length);
      console.log(H3[j].padEnd(5), "ΔBrier stop (β* − azi) ×100:", txtDif(r), "| prezis azi", mp((e) => e.ps[0][j]), "β*", mp((e) => e.ps[b][j]), "real", mp((e) => e.ys[j]),
        "| Δpinball p5 ×100:", txtDif(q), "| sub p5 real: azi", mp((e) => (e.netR[j] < e.p5[0][j] ? 1 : 0)) + "%", "β*", mp((e) => (e.netR[j] < e.p5[b][j] ? 1 : 0)) + "%");
    }
    for (const [nume, f] of [["ieri agitat (>1,3×)", (e) => e.rv > 1.3], ["ieri liniștit (<0,77×)", (e) => e.rv < 0.77], ["short", (e) => e.dir === "short"], ["long", (e) => e.dir === "long"]]) {
      const S = L.filter(f); if (!S.length) continue;
      const linii = [];
      for (let j = 0; j < 3; j++) {
        const bias = (bb) => dif(S, (e) => e.ps[bb][j] - e.ys[j], 300 + j);
        linii.push(H3[j] + ": prezis−real azi " + txtDif(bias(0)).split(" (")[0] + ", β* " + txtDif(bias(b)).split(" (")[0] + "; ΔBrier " + txtDif(dif(S, dB(j), 400 + j)).split(" (")[0]);
      }
      console.log("  " + nume.padEnd(22) + " n " + S.length + " · " + linii.join(" · "));
    }
  }
  // fereastra care crește (descriptiv): β ales pe tot ce era înainte (monedele de antrenare), aplicat pe următoarele 14 zile (monedele ținute deoparte)
  const zileT = [...new Set(R.map((e) => e.zi))].sort((a, c) => a - c), start = Math.floor(Date.UTC(2026, 6, 1) / 864e5), { antrenare, deoparte } = impartire(), pe = [];
  for (let z0 = start; z0 <= zileT[zileT.length - 1]; z0 += 14) {
    const A = R.filter((e) => antrenare.has(e.mon) && e.zi < z0 - EMBARGO); let bb = 0; BETE.forEach((_, k) => { if (brier(A, k, 2) < brier(A, bb, 2)) bb = k; });
    const T = R.filter((e) => deoparte.has(e.mon) && e.zi >= z0 && e.zi < z0 + 14); if (!T.length) continue;
    for (const e of T) pe.push({ zi: e.zi, d: (e.ps[bb][2] - e.ys[2]) ** 2 - (e.ps[0][2] - e.ys[2]) ** 2 });
    console.log("  fereastra care crește: de la", new Date(z0 * 864e5).toISOString().slice(0, 10), "β ales", BETE[bb], "ΔBrier 1 zi pe următoarele 14 zile", f2(T.reduce((s, e) => s + (e.ps[bb][2] - e.ys[2]) ** 2 - (e.ps[0][2] - e.ys[2]) ** 2, 0) / T.length), "(n " + T.length + ")");
  }
  console.log("  fereastra care crește, totul:", txtDif(dif(pe, (e) => e.d, 500)));
  const t1 = rez.T1, t2 = rez.T2;
  // AMENDAMENTUL: criteriul (a) pe nivelul calibrat prin `marime` (argumentul al treilea, unilateral; implicit 0,025)
  const niv = Number(process.argv[5] || 0.025), L1 = R.filter((e) => e.set === "T1"), icCal = icDin(blocBootV(peZile(L1, dB(2)), mulberry32(102)), niv);
  console.log("\nT1 1 zi, IC la nivelul calibrat (unilateral " + f2(niv) + "%): [" + f2(icCal[0]) + "; " + f2(icCal[1]) + "]");
  const a = icCal[1] < 0, bOk = t1[0].r.ic[0] <= 0 && t1[1].r.ic[0] <= 0, c = t2[2].r.est <= 0, d = t1[2].q.ic[0] <= 0;
  console.log("\nVERDICTUL protocolului: (a) T1 1 zi IC sub 0:", a, "· (b) T1 1 h / 4 h fără înrăutățire:", bOk, "· (c) T2 1 zi ≤ 0:", c, "· (d) p5 fără înrăutățire:", d, "⇒", a && bOk && c ? (d ? "TRECE" : "TRECE doar la stop") : "NU TRECE");
}

// DUPĂ verdict (descriptiv, nu decide): (1) T1 la 1 zi pe fiecare β; (2) varianta ASIMETRICĂ (k = max(1, …): doar zilele agitate urcă drumurile)
// - β ales DOAR pe antrenare, ca s-o fixez pentru un test viitor; pe T1 nu se citește (ideea vine din ce am văzut pe T1 ⇒ T1 nu mai e nevăzut pentru ea)
function descriptiv(dosar) {
  const R = incarca(dosar), T1 = R.filter((e) => e.set === "T1"), A = R.filter((e) => e.set === "antr");
  BETE.forEach((beta, b) => { if (!b) return; const r = dif(T1, (e) => (e.ps[b][2] - e.ys[2]) ** 2 - (e.ps[0][2] - e.ys[2]) ** 2, 600 + b); console.log("T1 1 zi (după test, descriptiv) β", beta, "ΔBrier", txtDif(r)); });
  const asim = (e, b, j) => (e.rv > 1 ? e.ps[b][j] : e.ps[0][j]);   // k = max(1, rv^β): sub 1 ⇒ drumurile de azi
  BETE.forEach((beta, b) => console.log("ANTRENARE, asimetric β", beta, "Brier stop 1 h", f2(A.reduce((s, e) => s + (asim(e, b, 0) - e.ys[0]) ** 2, 0) / A.length), "· 4 h", f2(A.reduce((s, e) => s + (asim(e, b, 1) - e.ys[1]) ** 2, 0) / A.length), "· 1 zi", f2(A.reduce((s, e) => s + (asim(e, b, 2) - e.ys[2]) ** 2, 0) / A.length)));
}
// toate părțile în paralel (procese separate), cu jurnalul fiecăreia în dosar
async function toate(dosar, P) {
  const { spawn } = await import("node:child_process"), t0 = Date.now(); fs.mkdirSync(dosar, { recursive: true });
  const coduri = await Promise.all(Array.from({ length: P }, (_, p) => new Promise((ok) => {
    const log = fs.openSync(path.join(dosar, "log-" + p + ".txt"), "w");
    spawn(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "reluare", dosar, String(p), String(P)], { stdio: ["ignore", log, log] }).on("exit", ok);
  })));
  console.log("coduri", coduri.join(","), "secunde", Math.round((Date.now() - t0) / 1000));
}

const [mod, dosar, x, y] = process.argv.slice(2);
if (!mod || !dosar) { console.log("folosire: toate <dosar> <procese> | reluare <dosar> <parte> <din> | alege <dosar> | marime <dosar> <beta> | testeaza <dosar> <beta>"); process.exit(2); }
if (mod === "toate") await toate(dosar, Number(x || 6));
else if (mod === "reluare") reluare(dosar, Number(x || 0), Number(y || 1));
else if (mod === "alege") alege(dosar);
else if (mod === "marime") marime(dosar, x);
else if (mod === "testeaza") testeaza(dosar, x);
else if (mod === "descriptiv") descriptiv(dosar);
else { console.log("mod necunoscut", mod); process.exit(2); }
