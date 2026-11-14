// G1 — „Candidați de grid”: aduc primele din clasament mai mult decât ceilalți candidați? Regulile sunt în
// docs/cercetare/2026-11-13-tablou-acuratete.md („G1 — …”), scrise ÎNAINTEA oricărei lumânări. Aici e doar logica, fără rețea și fără
// fișiere: clasele unei zile (clasamentul refăcut numai din ce se știa atunci), gridul propus rulat pe ziua următoare cu motorul fișei,
// valorile pe blocuri de 5 zile, testul cu garda pentru blocuri legate între ele, verdictul, etichetele puse la întâmplare (P1 / P2),
// stricarea viitorului (autenticitatea). Modulele paginii (GridCalcul, GridClasament, GridProba) se dau din afară.
// DE ȘTIUT (revizia independentă, 14.11.2026): (1) clasele sunt pozițiile listei ordonate după scor, nu tăietura după volum a rețetei din Scan;
// (2) P1 amestecă etichetele în fiecare zi și le rupe statornicia - e o poartă prea blândă, iar puterea socotită din abaterea ei e prea
// optimistă; pe etichete statornice (P2) testul NU ține mărimea ⇒ un DOVEDIT sau un PE DOS ieșit cu unealta aceasta nu se citește fără o
// poartă pe etichete statornice; (3) garda e simulată doar până la ρ = 0,6 și pe valori simetrice.
import { pStudentSus, blocuriDinZile, valoriPeBlocuri } from "./statistica-blocuri.mjs";

const ZI = 86400000, H4 = 14400000;
export const G1 = {
  pana: Date.UTC(2026, 10, 14),   // capătul datelor: 14.11.2026 00:00 UTC
  zile: 200, zilePeBloc: 5,       // 40 de blocuri
  bare4h: 500, minBare4h: 50,     // ca tura de clasament a colectorului și ca GridClasament.judeca
  top: 60,                        // primele 60 de poziții ale listei ORDONATE după scor - lista ferestrei „Grid: ce setez?” (app.js: ordoneaza + slice(0,60)).
                                  // NU e tăietura rețetei din Scan: acolo `rang ≤ 60` e locul după volum (îndreptare după revizia independentă)
  bare15: 96, minBare15: 90,
  teste: 37, alfa: 0.05 / 74,     // toate testele cu verdict de până acum (35) + acestea două, într-o parte
  minRaport: 1.2, minDiferenta: 0.0005, minClasa: 20,
  adaosGarda: 1.5,                // garda: autocorelația corectată + 1,5 ÷ √n (simulată înaintea datelor)
  h0Rulari: 4000, h0Limita: 0.04,
};
export const primaZi = () => G1.pana - G1.zile * ZI;
export const ziIso = (t) => new Date(t).toISOString().slice(0, 10);

// câte bare au timpul < limita (barele sunt crescătoare după t)
function cateSub(b, limita) { let lo = 0, hi = b.length; while (lo < hi) { const m = (lo + hi) >> 1; if (b[m].t < limita) lo = m + 1; else hi = m; } return lo; }

// Testul într-o singură parte „media blocurilor > 0”, cu garda pentru blocuri legate între ele: r = autocorelația de ordinul 1, corectată
// de deplasare (r + (1 + 3r) ÷ n), plus adaosGarda ÷ √n, plafonată la 0,9; dacă r > 0, t se înmulțește cu √((1 − r) ÷ (1 + r)) și gradele
// de libertate sunt ale eșantionului efectiv. Garda nu umflă niciodată t. Sub 5 valori nu se judecă.
export function testCuGarda(valori) {
  const v = (Array.isArray(valori) ? valori : []).filter((x) => Number.isFinite(x)), n = v.length;
  if (n < 5) return { n, medie: n ? v.reduce((a, x) => a + x, 0) / n : NaN, sd: NaN, t: NaN, r1: NaN, rGarda: NaN, tGarda: NaN, df: NaN, p: NaN };
  const medie = v.reduce((a, x) => a + x, 0) / n; let s2 = 0, c1 = 0;
  for (let i = 0; i < n; i++) { s2 += (v[i] - medie) * (v[i] - medie); if (i) c1 += (v[i] - medie) * (v[i - 1] - medie); }
  if (!(s2 > 0)) return { n, medie, sd: 0, t: medie > 0 ? Infinity : medie < 0 ? -Infinity : 0, r1: NaN, rGarda: NaN, tGarda: medie > 0 ? Infinity : medie < 0 ? -Infinity : 0, df: n - 1, p: medie > 0 ? 0 : 1 };
  const sd = Math.sqrt(s2 / (n - 1)), t = medie / (sd / Math.sqrt(n)), r1 = c1 / s2;
  const rGarda = Math.min(0.9, r1 + (1 + 3 * r1) / n + G1.adaosGarda / Math.sqrt(n)), f2 = rGarda > 0 ? (1 - rGarda) / (1 + rGarda) : 1;
  const tGarda = t * Math.sqrt(f2), df = rGarda > 0 ? Math.max(2, n * f2 - 1) : n - 1;
  return { n, medie, sd, t, r1, rGarda, tGarda, df, p: pStudentSus(tGarda, df) };
}

// Clasele unei zile, la clipa t: clasamentul refăcut din cel mult G1.bare4h lumânări de 4 ore ÎNCHISE până la t (t_bară + 4 h ≤ t), ordonat
// ca pe pagină; „top” = candidații de pe pozițiile 1…G1.top, „rest” = candidații de după. bare4h: { simbol: [{t,o,h,l,c}] crescător }.
export function claseLaZi(GC, bare4h, t) {
  const lista = [];
  for (const s of Object.keys(bare4h).sort()) {
    const b = bare4h[s], k = cateSub(b, t - H4 + 1);
    if (k < G1.minBare4h) continue;
    lista.push(GC.judeca(s, b.slice(Math.max(0, k - G1.bare4h), k), null));
  }
  return GC.ordoneaza(lista).map((j, i) => ({ simbol: j.simbol, poz: i + 1, clasa: j.stare === "candidat" ? (i + 1 <= G1.top ? "top" : "rest") : null, j }));
}

// Gridul pe care îl socotește clasamentul (intervalul din plaseaza, pasul minim, geometric, direcția lui), fără levier, fără stop, rulat pe
// barele de 15 minute [start, start + n) și închis la piață. a = grilele încasate în unitatea scorului; b = rezultatul total (din sumă).
export function rezultatGrid(G, GP, j, b15, start, n, fundingZi) {
  const c = G.construieste({ pret: j.pret, lat: j.latime, dir: j.dir, pas: G.C.PAS_MIN, levier: 1 });
  const st = { dir: c.dir, jos: c.jos, sus: c.sus, grile: c.grile, levier: 1, tip: "geometric", fundingZi: Number.isFinite(fundingZi) ? fundingZi : 0 };
  const r = GP.simuleaza(b15, start, n, st, {});
  return { a: c.profitGrila * r.perechi / c.grile, b: r.net, perechi: r.perechi, grile: c.grile, lichidat: !!r.lichidat };
}

// Monedele-zi ale ferestrei [de la, de la + zile): { zi, simbol, clasa, poz, a, b }. date: { simbol: { b4h, b15, f: [[t, rata]] } }.
// Rezultatul unei zile folosește doar barele de 15 minute cu t în [zi, zi + 24 h) și plățile de funding cu t în (zi, zi + 24 h].
export function coinZile(G, GC, GP, date, o = {}) {
  const deLa = o.deLa == null ? primaZi() : o.deLa, zile = o.zile == null ? G1.zile : o.zile, doar = o.doarZilele || null;
  const b4 = {}; for (const s of Object.keys(date)) b4[s] = date[s].b4h;
  const randuri = [], sarite = { faraBare15: 0, grilaImposibila: 0 };
  for (let d = 0; d < zile; d++) {
    if (doar && !doar.includes(d)) continue;
    const t = deLa + d * ZI, zi = ziIso(t);
    for (const x of claseLaZi(GC, b4, t)) {
      if (!x.clasa) continue;
      const m = date[x.simbol], b15 = m.b15, start = cateSub(b15, t), n = cateSub(b15, t + ZI) - start;
      if (n < G1.minBare15) { sarite.faraBare15++; continue; }
      if (!(x.j.latime > 0) || !(x.j.pret > 0)) { sarite.grilaImposibila++; continue; }
      let fz = 0; for (const [tf, rata] of m.f || []) if (tf > t && tf <= t + ZI && Number.isFinite(rata)) fz += rata;
      const r = rezultatGrid(G, GP, x.j, b15, start, n, fz);
      if (!Number.isFinite(r.a) || !Number.isFinite(r.b)) { sarite.grilaImposibila++; continue; }
      randuri.push({ zi, simbol: x.simbol, clasa: x.clasa, poz: x.poz, a: r.a, b: r.b });
    }
  }
  return { randuri, sarite };
}

// Valorile pe blocuri de 5 zile, numărate de la prima zi a ferestrei: fel "a" ⇒ ln(media top ÷ media rest); fel "b" ⇒ media top − media rest.
// clasaDe(rând) poate înlocui eticheta (probele cu etichete la întâmplare).
export function valoriBlocuri(randuri, fel, o = {}) {
  const zile = {}; zile[ziIso(o.deLa == null ? primaZi() : o.deLa)] = {};
  for (const r of randuri) { const c = o.clasaDe ? o.clasaDe(r) : r.clasa; if (c !== "top" && c !== "rest") continue;
    const z = zile[r.zi] || (zile[r.zi] = {}), q = z[c] || (z[c] = { n: 0, s: 0 }); q.n++; q.s += r[fel]; }
  return valoriPeBlocuri(blocuriDinZile(zile, G1.zilePeBloc), "top", "rest", fel === "a" ? "logRaport" : "diferenta", G1.minClasa);
}

// Verdictul unui test (regulile din jurnal): DOVEDIT / EXISTĂ, DAR MIC / PE DOS / NEDOVEDIT; sub 5 blocuri: NEMĂSURAT.
export function verdictG1(valori, fel) {
  const sus = testCuGarda(valori), jos = testCuGarda((valori || []).map((x) => -x));
  const marime = fel === "a" ? Math.exp(sus.medie) : sus.medie, minim = fel === "a" ? G1.minRaport : G1.minDiferenta;
  const verdict = !(sus.n >= 5) ? "NEMĂSURAT" : sus.p <= G1.alfa ? (marime >= minim ? "DOVEDIT" : "EXISTĂ, DAR MIC") : jos.p <= G1.alfa ? "PE DOS" : "NEDOVEDIT";
  return { verdict, marime, minim, n: sus.n, t: sus.t, tGarda: sus.tGarda, r1: sus.r1, sd: sus.sd, p: sus.p, pInvers: jos.p };
}

// Etichete la întâmplare, pe aceleași rezultate. fel "zi" (P1): în fiecare zi „top” se dă la întâmplare aceluiași număr de candidați câți au
// fost de fapt; fel "fix" (P2): o ordine întâmplătoare a monedelor, aceeași în toate zilele, ține locul scorului. rnd = generatorul (mulberry32).
// Întoarce, pentru a și b: câte rulări resping la 2,5% și la pragul verdictului, abaterea medie a valorilor pe blocuri, t-urile cu gardă.
export function placebo(randuri, fel, rulari, rnd, o = {}) {
  const peZi = new Map(); for (const r of randuri) { if (r.clasa !== "top" && r.clasa !== "rest") continue; let z = peZi.get(r.zi); if (!z) peZi.set(r.zi, (z = [])); z.push(r); }
  const zile = [...peZi.keys()].sort(), simboluri = [...new Set(randuri.map((r) => r.simbol))].sort();
  const out = { fel, rulari, a: { resp25: 0, respAlfa: 0, sd: 0, t: [] }, b: { resp25: 0, respAlfa: 0, sd: 0, t: [] } };
  for (let k = 0; k < rulari; k++) {
    const eticheta = new Map(), loc = new Map(); if (fel === "fix") for (const s of simboluri) loc.set(s, rnd());
    for (const zi of zile) { const l = peZi.get(zi), nTop = l.reduce((a, r) => a + (r.clasa === "top" ? 1 : 0), 0);
      const ord = fel === "fix" ? l.slice().sort((x, y) => loc.get(x.simbol) - loc.get(y.simbol)) : l.slice();
      if (fel !== "fix") for (let i = ord.length - 1; i > 0; i--) { const q = Math.floor(rnd() * (i + 1)), aux = ord[i]; ord[i] = ord[q]; ord[q] = aux; }
      ord.forEach((r, i) => eticheta.set(r, i < nTop ? "top" : "rest")); }
    for (const f of ["a", "b"]) { const T = testCuGarda(valoriBlocuri(randuri, f, { deLa: o.deLa, clasaDe: (r) => eticheta.get(r) || null }));
      if (T.p <= 0.025) out[f].resp25++; if (T.p <= G1.alfa) out[f].respAlfa++; out[f].sd += Number.isFinite(T.sd) ? T.sd : 0; out[f].t.push(T.tGarda); }
  }
  for (const f of ["a", "b"]) { out[f].sd /= rulari; out[f].rata25 = out[f].resp25 / rulari; }
  return out;
}

// Șansa de DOVEDIT pe n blocuri independente cu abaterea sd, dacă efectul adevărat pe bloc e `efect` (în unitatea valorilor pe blocuri:
// ln(raport) pentru a, diferență pentru b). norm = generator de normale standard.
export function sansaDovedit(fel, efect, sd, n, rulari, norm) {
  let dov = 0; for (let k = 0; k < rulari; k++) { const v = new Array(n); for (let i = 0; i < n; i++) v[i] = efect + sd * norm(); if (verdictG1(v, fel).verdict === "DOVEDIT") dov++; }
  return dov / rulari;
}

// Autenticitatea: aceleași date cu tot ce e DUPĂ o clipă stricat anume (prețurile înmulțite cu un factor întâmplător între 0,2 și 5, funding
// absurd). Barele de 4 ore se strică de la `t4` (cele care se închid după t4), cele de 15 minute și funding-ul de la `t15`.
export function stricaViitorul(date, t4, t15, rnd) {
  const out = {};
  for (const s of Object.keys(date)) { const m = date[s];
    const st = (b, lim, pas) => b.map((x) => { if (x.t + pas <= lim) return x; const k = 0.2 + 4.8 * rnd(); return { t: x.t, o: x.o * k, h: x.h * k * 1.3, l: x.l * k * 0.7, c: x.c * k }; });
    out[s] = { b4h: st(m.b4h, t4, H4), b15: m.b15.map((x) => { if (x.t < t15) return x; const k = 0.2 + 4.8 * rnd(); return { t: x.t, o: x.o * k, h: x.h * k * 1.3, l: x.l * k * 0.7, c: x.c * k }; }),
      f: (m.f || []).map(([tf, r]) => (tf <= t15 ? [tf, r] : [tf, 0.5])) }; }
  return out;
}
