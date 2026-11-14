// G2 — pe date nevăzute: tăietura după volum a rețetei „Candidați de grid” (V) și „merită gridul, în medie?” (M). Regulile sunt în
// docs/cercetare/2026-11-13-tablou-acuratete.md („G2 — pe date nevăzute…”), scrise ÎNAINTEA oricărei lumânări a ferestrei. Aici e doar logica,
// fără rețea și fără fișiere; se sprijină pe cea din G1 (testul cu gardă, valorile pe blocuri, etichetele statornice, gridul rulat).
// Față de G1: universul e ales la ÎNCEPUTUL ferestrei; clasele lui V sunt după VOLUM (ca filtrul rețetei); un DOVEDIT la V cere și poarta pe
// etichete statornice; M e un test pe media perioadelor care nu se suprapun, cu statistica Johnson (valorile au coadă în jos).
import { pStudentSus } from "./statistica-blocuri.mjs";
import { testCuGarda, valoriBlocuri, rezultatGrid, placebo, ziIso } from "./g1-candidati-grid.mjs";

const ZI = 86400000, H4 = 14400000;
export const G2 = {
  pana: Date.UTC(2026, 3, 28),    // capătul ferestrei: 28.04.2026 00:00 UTC (începutul ferestrei lui G1)
  zile: 400, zilePeBloc: 5,       // 80 de blocuri
  bare4h: 500, minBare4h: 50,
  taieturaVolum: 60,              // filtrul rețetei din Scan: locul după volum ≤ 60
  orizonturi: [3, 7],             // zile; perioade care nu se suprapun
  minBare: 0.94,                  // o monedă-perioadă cu mai puțin de 94% din lumânările de 15 minute nu se rulează
  minMonedePerioada: 10,          // o perioadă cu mai puțin de 10 candidați rulați nu intră în test (media ei ar fi a câtorva monede)
  teste: 41, alfa: 0.05 / 82,     // 37 de teste până la G1 inclusiv + cele patru de aici, într-o parte
  minRaport: 1.2, minDiferenta: 0.0005, minPeZi: 0.001,
  adaosGarda: 1.5, permutari: 10000,
};
export const primaZi2 = () => G2.pana - G2.zile * ZI;
function cateSub(b, limita) { let lo = 0, hi = b.length; while (lo < hi) { const m = (lo + hi) >> 1; if (b[m].t < limita) lo = m + 1; else hi = m; } return lo; }

// Clasele unei zile după VOLUM, la clipa t. Clasamentul se judecă din cel mult G2.bare4h lumânări de 4 ore închise până la t; locul după volum
// e locul monedei în univers după volumul în USDT (qv) al celor 6 lumânări de 4 ore închise chiar înainte de t (24 h). „top” = candidații cu
// locul 1…G2.taieturaVolum; „rest” = candidații de după. bare4h: { simbol: [{t,o,h,l,c,qv}] crescător }.
export function claseVolumLaZi(GC, bare4h, t) {
  const l = [];
  for (const s of Object.keys(bare4h).sort()) {
    const b = bare4h[s], k = cateSub(b, t - H4 + 1); if (k < 6) continue;
    let vol = 0, plin = true; for (let i = k - 6; i < k; i++) { if (!(b[i].t >= t - 6 * H4) || !Number.isFinite(b[i].qv)) { plin = false; break; } vol += b[i].qv; }
    if (!plin) continue;   /* fără cele 6 lumânări ale ultimelor 24 h moneda nu are loc după volum */
    l.push({ simbol: s, vol, j: k >= G2.minBare4h ? GC.judeca(s, b.slice(Math.max(0, k - G2.bare4h), k), null) : null });
  }
  l.sort((x, y) => y.vol - x.vol || (x.simbol < y.simbol ? -1 : 1));
  return l.map((x, i) => ({ simbol: x.simbol, loc: i + 1, vol: x.vol, clasa: x.j && x.j.stare === "candidat" ? (i + 1 <= G2.taieturaVolum ? "top" : "rest") : null, j: x.j }));
}

// Monedele-zi ale lui V: gridul clasamentului rulat 24 h, fără stop (ca la G1). { zi, simbol, clasa, loc, a, b }.
export function coinZileVolum(G, GC, GP, date, o = {}) {
  const deLa = o.deLa == null ? primaZi2() : o.deLa, zile = o.zile == null ? G2.zile : o.zile, doar = o.doarZilele || null;
  const b4 = {}; for (const s of Object.keys(date)) b4[s] = date[s].b4h;
  const randuri = [], sarite = { faraBare15: 0, grilaImposibila: 0 };
  for (let d = 0; d < zile; d++) {
    if (doar && !doar.includes(d)) continue;
    const t = deLa + d * ZI, zi = ziIso(t);
    for (const x of claseVolumLaZi(GC, b4, t)) {
      if (!x.clasa) continue;
      const m = date[x.simbol], start = cateSub(m.b15, t), n = cateSub(m.b15, t + ZI) - start;
      if (n < 90) { sarite.faraBare15++; continue; }
      if (!(x.j.latime > 0) || !(x.j.pret > 0)) { sarite.grilaImposibila++; continue; }
      let fz = 0; for (const [tf, rata] of m.f || []) if (tf > t && tf <= t + ZI && Number.isFinite(rata)) fz += rata;
      const r = rezultatGrid(G, GP, x.j, m.b15, start, n, fz);
      if (!Number.isFinite(r.a) || !Number.isFinite(r.b)) { sarite.grilaImposibila++; continue; }
      randuri.push({ zi, simbol: x.simbol, clasa: x.clasa, loc: x.loc, a: r.a, b: r.b });
    }
  }
  return { randuri, sarite };
}

// Verdictul lui V (regulile din jurnal). valori = valorile adevărate pe blocuri; tPerm = t-urile cu gardă ale ordinilor întâmplătoare fixe.
// DOVEDIT cere p-ul testului cu gardă sub prag ȘI p-ul de permutare sub prag (și mărimea cel puțin cea minimă); PE DOS, la fel pe invers.
export function verdictV(valori, fel, tPerm) {
  const sus = testCuGarda(valori), jos = testCuGarda((valori || []).map((x) => -x)), tp = (tPerm || []).filter(Number.isFinite), N = tp.length;
  const pPermSus = N ? (1 + tp.filter((x) => x >= sus.tGarda).length) / (N + 1) : NaN, pPermJos = N ? (1 + tp.filter((x) => x <= sus.tGarda).length) / (N + 1) : NaN;
  const marime = fel === "a" ? Math.exp(sus.medie) : sus.medie, minim = fel === "a" ? G2.minRaport : G2.minDiferenta;
  const trece = (p, pp) => p <= G2.alfa && pp <= G2.alfa;
  const verdict = !(sus.n >= 5) || !N ? "NEMĂSURAT" : trece(sus.p, pPermSus) ? (marime >= minim ? "DOVEDIT" : "EXISTĂ, DAR MIC") : trece(jos.p, pPermJos) ? "PE DOS" : "NEDOVEDIT";
  return { verdict, marime, minim, n: sus.n, t: sus.t, tGarda: sus.tGarda, r1: sus.r1, sd: sus.sd, df: sus.df, p: sus.p, pInvers: jos.p, pPerm: pPermSus, pPermInvers: pPermJos, permutari: N };
}
// t-urile cu gardă ale celor n ordini întâmplătoare fixe (aceeași ordine a monedelor în toate zilele ține locul volumului), pentru A și B
export function permutariStatornice(randuri, n, rnd, o = {}) { const p = placebo(randuri, "fix", n, rnd, { deLa: o.deLa == null ? primaZi2() : o.deLa }); return { a: p.a.t, b: p.b.t }; }

// Testul lui M: media valorilor (perioade care nu se suprapun) față de zero, pe ambele părți, cu statistica Johnson (1978), care îndreaptă t
// pentru asimetrie - t_J = [m + μ3 ÷ (6·s²·n) + μ3·m² ÷ (3·s⁴)] · √n ÷ s - și cu garda de autocorelație a lui G1. Sub 8 valori nu judecă.
export function testJohnson(valori) {
  const v = (Array.isArray(valori) ? valori : []).filter((x) => Number.isFinite(x)), n = v.length;
  if (n < 8) return { n, medie: n ? v.reduce((a, x) => a + x, 0) / n : NaN, sd: NaN, t: NaN, tJ: NaN, r1: NaN, rGarda: NaN, df: NaN, pPlus: NaN, pMinus: NaN };
  const m = v.reduce((a, x) => a + x, 0) / n; let s2 = 0, c1 = 0, m3 = 0;
  for (let i = 0; i < n; i++) { const d = v[i] - m; s2 += d * d; m3 += d * d * d; if (i) c1 += d * (v[i - 1] - m); }
  if (!(s2 > 0)) return { n, medie: m, sd: 0, t: m > 0 ? Infinity : m < 0 ? -Infinity : 0, tJ: m > 0 ? Infinity : m < 0 ? -Infinity : 0, r1: NaN, rGarda: NaN, df: n - 1, pPlus: m > 0 ? 0 : 1, pMinus: m < 0 ? 0 : 1 };
  const vr = s2 / (n - 1), s = Math.sqrt(vr), mu3 = m3 / n, r1 = c1 / s2, rGarda = Math.min(0.9, r1 + (1 + 3 * r1) / n + G2.adaosGarda / Math.sqrt(n));
  const f2 = rGarda > 0 ? (1 - rGarda) / (1 + rGarda) : 1, df = rGarda > 0 ? Math.max(2, n * f2 - 1) : n - 1, k = Math.sqrt(f2);
  const t = m / (s / Math.sqrt(n)), tJ = (m + mu3 / (6 * vr * n) + mu3 * m * m / (3 * vr * vr)) * Math.sqrt(n) / s;
  return { n, medie: m, sd: s, asimetrie: mu3 / (s * s * s), t, tJ, r1, rGarda, df, tGarda: tJ * k, pPlus: pStudentSus(tJ * k, df), pMinus: pStudentSus(-tJ * k, df) };
}
// Verdictul lui M pentru orizontul H (zile): DOVEDIT PE PLUS / DOVEDIT PE MINUS (p sub prag și |media| cel puțin 0,1% pe zi) / EXISTĂ, DAR MIC / NEDOVEDIT
export function verdictM(valori, H) {
  const T = testJohnson(valori), minim = G2.minPeZi * H, mare = Math.abs(T.medie) >= minim;
  const verdict = !(T.n >= 8) ? "NEMĂSURAT" : T.pPlus <= G2.alfa ? (mare ? "DOVEDIT PE PLUS" : "EXISTĂ, DAR MIC") : T.pMinus <= G2.alfa ? (mare ? "DOVEDIT PE MINUS" : "EXISTĂ, DAR MIC") : "NEDOVEDIT";
  return Object.assign({ verdict, minim }, T);
}

// Gridul clasamentului cu STOPUL casei (GridCalcul.stopuri prin construieste().stop), fără levier, pe barele [start, start + n).
export function rezultatGridStop(G, GP, j, b15, start, n, fundingZi) {
  const c = G.construieste({ pret: j.pret, lat: j.latime, dir: j.dir, pas: G.C.PAS_MIN, levier: 1 });
  const st = { dir: c.dir, jos: c.jos, sus: c.sus, grile: c.grile, levier: 1, tip: "geometric", fundingZi: Number.isFinite(fundingZi) ? fundingZi : 0, stop: { jos: c.stop.jos, sus: c.stop.sus } };
  const r = GP.simuleaza(b15, start, n, st, {});
  return { b: r.net, oprit: !!r.oprit, lichidat: !!r.lichidat, iesit: r.iesit || null };
}
// Perioadele lui M: H zile, una după alta, de la începutul ferestrei. La începutul fiecăreia, toți candidații (oricare ar fi volumul) primesc
// gridul clasamentului cu stopul casei; valoarea perioadei = media rezultatului total. Întoarce valorile și, pentru fiecare perioadă, câte
// monede a avut, câte s-au oprit pe stop, câte au fost lichidări. o.comision = de câte ori se înmulțesc comisioanele motorului (rularea de alături).
export function perioade(G, GC, GP, date, H, o = {}) {
  const deLa = o.deLa == null ? primaZi2() : o.deLa, zile = o.zile == null ? G2.zile : o.zile, nPer = Math.floor(zile / H), doar = o.doarPerioadele || null, mult = o.comision > 0 ? o.comision : 1;
  const b4 = {}; for (const s of Object.keys(date)) b4[s] = date[s].b4h;
  const C = G.C, c0 = C.COMISION, c1 = C.COMISION_GRILA, per = [], sarite = { faraBare15: 0, grilaImposibila: 0 };
  C.COMISION = c0 * mult; C.COMISION_GRILA = c1 * mult;
  try {
    for (let k = 0; k < nPer; k++) {
      if (doar && !doar.includes(k)) continue;
      const t = deLa + k * H * ZI, sf = t + H * ZI; let n = 0, s = 0, stop = 0, lich = 0; const rez = [];
      for (const x of claseVolumLaZi(GC, b4, t)) {
        if (!x.clasa) continue;   /* doar candidații; clasa după volum nu contează aici */
        const m = date[x.simbol], start = cateSub(m.b15, t), nb = cateSub(m.b15, sf) - start;
        if (nb < G2.minBare * H * 96) { sarite.faraBare15++; continue; }
        if (!(x.j.latime > 0) || !(x.j.pret > 0)) { sarite.grilaImposibila++; continue; }
        let fz = 0; for (const [tf, rata] of m.f || []) if (tf > t && tf <= sf && Number.isFinite(rata)) fz += rata;
        const r = rezultatGridStop(G, GP, x.j, m.b15, start, nb, fz / H);
        if (!Number.isFinite(r.b)) { sarite.grilaImposibila++; continue; }
        n++; s += r.b; if (r.oprit) stop++; if (r.lichidat) lich++; if (o.cuRanduri) rez.push({ simbol: x.simbol, b: r.b, oprit: r.oprit, iesit: r.iesit });
      }
      per.push(Object.assign({ k, zi: ziIso(t), n, medie: n ? s / n : NaN, stopuri: stop, lichidari: lich }, o.cuRanduri ? { randuri: rez } : {}));
    }
  } finally { C.COMISION = c0; C.COMISION_GRILA = c1; }
  return { perioade: per, valori: per.filter((p) => p.n >= G2.minMonedePerioada).map((p) => p.medie), sarite };
}

// Autenticitatea: tot ce e DUPĂ o clipă stricat anume - prețurile și VOLUMELE lumânărilor de 4 ore care se închid după t4, lumânările de 15
// minute și funding-ul de la t15 încolo.
export function stricaViitorul2(date, t4, t15, rnd) {
  const out = {};
  for (const s of Object.keys(date)) { const m = date[s];
    out[s] = { b4h: m.b4h.map((x) => { if (x.t + H4 <= t4) return x; const k = 0.2 + 4.8 * rnd(); return { t: x.t, o: x.o * k, h: x.h * k * 1.3, l: x.l * k * 0.7, c: x.c * k, qv: x.qv * (0.01 + 50 * rnd()) }; }),
      b15: m.b15.map((x) => { if (x.t < t15) return x; const k = 0.2 + 4.8 * rnd(); return { t: x.t, o: x.o * k, h: x.h * k * 1.3, l: x.l * k * 0.7, c: x.c * k }; }),
      f: (m.f || []).map(([tf, r]) => (tf <= t15 ? [tf, r] : [tf, 0.5])) }; }
  return out;
}
// ---- Reperul lui M (adăugat DUPĂ rezultat, în urma reviziei independente din 15.11.2026; nu e un test cu verdict) ----
// Motorul merge prin fiecare lumânare pe drumul cel mai scurt care atinge O, H, L, C; prețul adevărat face mai multe dus-întorsuri, iar fiecare e
// o grilă încasată pe care simularea n-o vede. De aceea, pe un preț fără nicio direcție, motorul NU arată zero, ci un minus (costurile + partea
// nevăzută), cu atât mai mare cu cât lumânarea e mai mare. Un rezultat al motorului se judecă față de reperul acesta, nu față de zero.
// k lumânări la rând adunate într-una (15 min ⇒ 30 min cu k = 2, o oră cu k = 4); coada incompletă se lasă
export function adunaLumanari(b, k) {
  const o = [];
  for (let i = 0; i + k <= b.length; i += k) { let h = -Infinity, l = Infinity; for (let j = i; j < i + k; j++) { if (b[j].h > h) h = b[j].h; if (b[j].l < l) l = b[j].l; } o.push({ t: b[i].t, o: b[i].o, h, l, c: b[i + k - 1].c }); }
  return o;
}
// Aceeași agitație, niciun sens: fiecare lumânare se întoarce pe dos cu probabilitate 1/2 (în logaritm: urcarea devine coborâre, cu tot cu
// fitile) și se lipesc cap la cap de la prețul de pornire al primei. rnd = generatorul (mulberry32).
export function intoarceLumanari(b, rnd) {
  const o = []; let p = b.length ? b[0].o : NaN;
  for (const x of b) { let su = Math.log(x.h / x.o), jo = Math.log(x.l / x.o), r = Math.log(x.c / x.o); if (rnd() < 0.5) { const a = su; su = -jo; jo = -a; r = -r; }
    o.push({ t: x.t, o: p, h: p * Math.exp(su), l: p * Math.exp(jo), c: p * Math.exp(r) }); p = p * Math.exp(r); }
  return o;
}
// Pentru fiecare perioadă a lui M: media pe datele adevărate (lumânări de 15, 30 și 60 de minute) și media pe reperul fără direcție (două trageri).
export function reperM(G, GC, GP, date, H, rnd, o = {}) {
  const deLa = o.deLa == null ? primaZi2() : o.deLa, zile = o.zile == null ? G2.zile : o.zile, nPer = Math.floor(zile / H), b4 = {}, per = []; for (const s of Object.keys(date)) b4[s] = date[s].b4h;
  for (let k = 0; k < nPer; k++) {
    const t = deLa + k * H * ZI, sf = t + H * ZI, a = { real: 0, real30: 0, real60: 0, reper: 0 }; let n = 0, stopReal = 0, stopReper = 0;
    for (const x of claseVolumLaZi(GC, b4, t)) {
      if (!x.clasa) continue; const m = date[x.simbol], start = cateSub(m.b15, t), fr = m.b15.slice(start, cateSub(m.b15, sf));
      if (fr.length < G2.minBare * H * 96 || !(x.j.latime > 0) || !(x.j.pret > 0)) continue;
      let fz = 0; for (const [tf, rata] of m.f || []) if (tf > t && tf <= sf && Number.isFinite(rata)) fz += rata; fz /= H;
      const R = (bb) => rezultatGridStop(G, GP, x.j, bb, 0, bb.length, fz), r15 = R(fr), q1 = R(intoarceLumanari(fr, rnd)), q2 = R(intoarceLumanari(fr, rnd));
      if (![r15.b, q1.b, q2.b].every(Number.isFinite)) continue;
      a.real += r15.b; a.real30 += R(adunaLumanari(fr, 2)).b; a.real60 += R(adunaLumanari(fr, 4)).b; a.reper += (q1.b + q2.b) / 2; n++; if (r15.oprit) stopReal++; if (q1.oprit) stopReper++;
    }
    per.push({ k, zi: ziIso(t), n, real: n ? a.real / n : NaN, real30: n ? a.real30 / n : NaN, real60: n ? a.real60 / n : NaN, reper: n ? a.reper / n : NaN, stopReal, stopReper });
  }
  return { perioade: per.filter((p) => p.n >= G2.minMonedePerioada) };
}
export { valoriBlocuri, testCuGarda, ziIso };
