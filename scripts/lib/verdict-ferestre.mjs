// v101.184 (Radar v100.346, 16.11.2026; el: „DE CE TOT APARE N-AM AFLAT?”): verdictul unei liste urmărite înainte, calculat, nu scris de mână.
// Regula, fixată ÎNAINTE de cifre:
//   - o zi judecată = diferența listei față de reper (piața, QQQ / indicele EU, media sectorului) la orizontul ei, după cost: { t, e };
//   - ferestrele care nu se suprapun: zilele în ordine, o zi nouă la cel puțin L după precedenta (lacom) - dovezile independente;
//   - verdictul O SINGURĂ DATĂ, pe primele 26 de ferestre (ca proba gridului; privitul repetat după 26 ar umfla verdictele false):
//     t ≥ 2 și medie > 0 ⇒ „mai bine”; t ≤ −2 ⇒ „mai slab”; altfel „n-am aflat” (nedovedit nu înseamnă egal); sub 26 ⇒ „prea devreme”;
//   - media și t merg mai departe, ca cifre.
// Mărimea sub H0, simulată înainte (t3 + GARCH, orizonturi suprapuse, 0 / 30% zile lipsă, 20.000 de rulări): fals „mai bine” 2,6–2,8%,
// fals „mai slab” 2,6–2,9% (teoretic 2,8%); puterea la un avantaj de 0,25 sd pe zi: 88–99%.
// v101.185 (revizia v100.346, 🔴1): datele din care se judecă alunecă (notările monedelor țin 150 de zile, ale acțiunilor 120, barele sectoarelor
// 2 ani) ⇒ 26 de ferestre nu se strângeau niciodată, iar verdictul s-ar fi recalculat. De aceea REGISTRUL: ferestrele intră o singură dată și
// rămân (doar crește), verdictul se scrie la a 26-a și nu se mai atinge; colectorul îl ține pe disc (data/verdict-registre.json).
export const REG_VERDICT = { ferestre: 26, pragT: 2, maxFerestre: 400 };
const r6 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1e6) / 1e6);
function st(l) { const n = l.length, m = n ? l.reduce((q, v) => q + v, 0) / n : null, sd = n > 1 ? Math.sqrt(l.reduce((q, v) => q + (v - m) * (v - m), 0) / (n - 1)) : null; return { n, m, sd, t: n > 1 && sd > 0 ? m / (sd / Math.sqrt(n)) : null }; }
const eticheta = (V) => (V.t != null && V.t >= REG_VERDICT.pragT && V.m > 0 ? "mai bine" : V.t != null && V.t <= -REG_VERDICT.pragT ? "mai slab" : "n-am aflat");
/** Registrul unei liste: { L, f: [{t, e}] (ferestrele, în ordine, doar cresc), verdict: null | { v, la, medie, t } }. Zilele noi (orice ordine,
 *  orice fereastră de timp) intră lacom după ultima fereastră; o zi mai veche decât ea nu mai intră. Altă lungime L ⇒ registru nou. */
export function registruFerestre(reg, zile, L) {
  const r = reg && reg.L === L && Array.isArray(reg.f) ? { L, f: reg.f.filter((x) => x && Number.isFinite(x.t) && Number.isFinite(x.e)), verdict: reg.verdict || null } : { L, f: [], verdict: null };
  const z = (Array.isArray(zile) ? zile : []).filter((x) => x && Number.isFinite(x.t) && Number.isFinite(x.e)).sort((a, b) => a.t - b.t);
  let ult = r.f.length ? r.f[r.f.length - 1].t : -Infinity;
  for (const x of z) if (x.t - ult >= L) { r.f.push({ t: x.t, e: r6(x.e) }); ult = x.t; }
  if (r.f.length > REG_VERDICT.maxFerestre) r.f = r.f.slice(0, REG_VERDICT.ferestre).concat(r.f.slice(-(REG_VERDICT.maxFerestre - REG_VERDICT.ferestre)));   // primele 26 rămân mereu
  if (!r.verdict && r.f.length >= REG_VERDICT.ferestre) { const V = st(r.f.slice(0, REG_VERDICT.ferestre).map((x) => x.e)); r.verdict = { v: eticheta(V), la: r.f[REG_VERDICT.ferestre - 1].t, medie: r6(V.m), t: V.t == null ? null : Math.round(V.t * 100) / 100 }; }
  const tot = st(r.f.map((x) => x.e));
  return { reg: r, vf: { ferestre: r.f.length, nVerdict: REG_VERDICT.ferestre, medie: r6(tot.m), sd: r6(tot.sd), t: tot.t == null ? null : Math.round(tot.t * 100) / 100, verdict: r.verdict ? r.verdict.v : "prea devreme" } };
}
/** Fără registru (probe, pagini): aceeași socoteală pe zilele date. */
export function verdictFerestre(zile, L) { return registruFerestre(null, zile, L).vf; }
/** Registrul unei liste din dependențele turei (d.registru = { citeste(k), scrie(k, r) }, ținut de colector pe disc); fără el, nimic. */
export function registruPe(d, k) { return d && d.registru ? { registru: d.registru.citeste(k), laRegistru: (r) => d.registru.scrie(k, r) } : {}; }
// textul scurt pentru „prea devreme” (aceeași formă peste tot)
export const preaDevreme = (n, cate) => "prea devreme pentru o concluzie: " + cate(n, "fereastră", "ferestre") + " din 26 (verdictul se dă o singură dată, la 26 de ferestre care nu se suprapun)";
