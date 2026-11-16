// v101.184 (Radar v100.346, 16.11.2026; el: „DE CE TOT APARE N-AM AFLAT?”): verdictul unei liste urmărite înainte, calculat, nu scris de mână.
// Regula, fixată ÎNAINTE de cifre:
//   - o zi judecată = diferența listei față de reper (piața, QQQ / indicele EU, media sectorului) la orizontul ei, după cost: { t, e };
//   - ferestrele care nu se suprapun: zilele în ordine, o zi nouă la cel puțin L după precedenta (lacom) - dovezile independente;
//   - verdictul O SINGURĂ DATĂ, pe primele 26 de ferestre (ca proba gridului; privitul repetat după 26 ar umfla verdictele false):
//     t ≥ 2 și medie > 0 ⇒ „mai bine”; t ≤ −2 ⇒ „mai slab”; altfel „n-am aflat” (nedovedit nu înseamnă egal); sub 26 ⇒ „prea devreme”;
//   - media și t merg mai departe, ca cifre.
// Mărimea sub H0, simulată înainte (t3 + GARCH, orizonturi suprapuse, 0 / 30% zile lipsă, 20.000 de rulări): fals „mai bine” 2,6–2,8%,
// fals „mai slab” 2,6–2,9% (teoretic 2,8%); puterea la un avantaj de 0,25 sd pe zi: 88–99%.
export const REG_VERDICT = { ferestre: 26, pragT: 2 };
const r6 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1e6) / 1e6);
function st(l) { const n = l.length, m = n ? l.reduce((q, v) => q + v, 0) / n : null, sd = n > 1 ? Math.sqrt(l.reduce((q, v) => q + (v - m) * (v - m), 0) / (n - 1)) : null; return { n, m, sd, t: n > 1 && sd > 0 ? m / (sd / Math.sqrt(n)) : null }; }
export function verdictFerestre(zile, L) {
  const z = (Array.isArray(zile) ? zile : []).filter((x) => x && Number.isFinite(x.t) && Number.isFinite(x.e)).sort((a, b) => a.t - b.t);
  const fer = []; let ult = -Infinity; for (const x of z) if (x.t - ult >= L) { fer.push(x.e); ult = x.t; }
  const tot = st(fer), V = fer.length >= REG_VERDICT.ferestre ? st(fer.slice(0, REG_VERDICT.ferestre)) : null;
  const verdict = !V ? "prea devreme" : V.t != null && V.t >= REG_VERDICT.pragT && V.m > 0 ? "mai bine" : V.t != null && V.t <= -REG_VERDICT.pragT ? "mai slab" : "n-am aflat";
  return { ferestre: tot.n, nVerdict: REG_VERDICT.ferestre, medie: r6(tot.m), sd: r6(tot.sd), t: tot.t == null ? null : Math.round(tot.t * 100) / 100, verdict };
}
// textul scurt pentru „prea devreme” (aceeași formă peste tot)
export const preaDevreme = (n, cate) => "prea devreme pentru o concluzie: " + cate(n, "fereastră", "ferestre") + " din 26 (verdictul se dă o singură dată, la 26 de ferestre care nu se suprapun)";
