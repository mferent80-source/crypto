// Tura laboratorului de grid (v79.5): top N PERP dupa volum, ~31 de zile de 15M pe moneda,
// ferestrele de grid neutru cu conditiile stiute la pornire, puse la un loc, apoi cele 3
// intrebari. Folosita de colector (o data pe zi) si de scripts/grid-laborator-real.mjs.
// deps: { cere(cale) -> JSON cu forma Pionex {data:{...}}, trimite?, jurnal, pauza,
//         GridCalcul, GridLaborator, GridClasament, top (20), H (2), pauzaMs (1600) }
// v101.9 (optional): GridPlan, plan {plus, minus}, suma, levier, notaPlan, miscareZi(bare) -> pe aceleasi lumanari, „gridul dupa
// planul tau” pe fiecare moneda: cele doua variante cu proba pe 30 de zile, in rez.planMonede (fara ele: null).
// v101.10: si SHORT langa long (taS, meaS) + extraSimboluri = monedele botilor care ruleaza: intra in tabel (botulTau), chiar daca
// nu sunt in top; intrebarile laboratorului raman doar pe top.
export async function turaLaborator(d) {
  const top = d.top || 20, H = d.H || 2, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs, t0 = Date.now();
  const tk = await d.cere("tickers");
  const lista = d.GridClasament.topDupaVolum(tk && tk.data && tk.data.tickers, top);
  let rows = [], monede = 0, fara = 0;
  const cuPlan = !!(d.GridPlan && d.plan && d.plan.plus > 0 && d.plan.minus > 0), planMonede = [];
  const extra = (Array.isArray(d.extraSimboluri) ? d.extraSimboluri : []).map(String).filter(Boolean);
  const scurt = (x, p) => x ? { levier: x.levier, jos: x.jos / p - 1, sus: x.sus / p - 1, laStop: x.laStop, laTinta: x.laTinta, n: x.proba ? x.proba.n : null, stop: x.proba ? x.proba.stop : null, tinta: x.proba ? x.proba.tinta : null, inGrid: x.proba ? x.proba.inGrid : null, lichidari: x.proba ? x.proba.lichidari : null, mediaUsdt: x.proba ? x.proba.mediaUsdt : null, oreTipic: x.proba ? x.proba.oreTipic : null } : null;
  // ~31 de zile de 15M: pana la 6 pagini de 500, cea mai noua intai
  async function aduce15(simbol) {
    let r15 = [], end = null;
    for (let p = 0; p < 6; p++) {
      const k = await d.cere("klines", simbol, end);
      const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
      if (!r) throw new Error((k && (k.error || k.message)) || "fara lumanari");
      r15 = r15.concat(r);
      const t = r.map((x) => Number(x && x.time)).filter(Number.isFinite);
      if (r.length < 500 || !t.length) break;
      end = Math.min(...t) - 1;
      if (pauzaMs) await d.pauza(pauzaMs);
    }
    return d.GridCalcul.bare(r15);
  }
  function adaugaPlan(simbol, b15) {
    if (!cuPlan || !b15.length) return;
    try {
      const p = b15[b15.length - 1].c, amp = d.miscareZi ? d.miscareZi(b15) : null;
      const pe = (dir) => d.GridPlan.variante({ pret: p, dir, suma: d.suma || 100, levier: d.levier || 5, plan: d.plan, amp, pas: d.GridCalcul.C.PAS_MIN, b15 });
      const L = pe("long"), S = pe("short");
      if (L.eroare && S.eroare) return;
      planMonede.push({ simbol, botulTau: extra.includes(simbol), ta: L.eroare ? null : scurt(L.ta, p), mea: L.eroare ? null : scurt(L.mea, p), taS: S.eroare ? null : scurt(S.ta, p), meaS: S.eroare ? null : scurt(S.mea, p) });
    } catch (e) { d.jurnal("laborator plan", simbol, e.message); }
  }
  for (const m of lista) {
    try {
      const b15 = await aduce15(m.simbol), f = d.GridLaborator.ferestre(b15, H);
      adaugaPlan(m.simbol, b15);
      if (!f.length) { fara++; continue; }
      rows = rows.concat(f.map((x) => Object.assign({ simbol: m.simbol }, x)));
      monede++;
    } catch (e) { fara++; d.jurnal("laborator", m.simbol, e.message); }
    if (pauzaMs) await d.pauza(pauzaMs);
  }
  // botii care ruleaza, pe monede din afara topului: doar in tabel (nu si in intrebari)
  if (cuPlan) for (const s of extra) {
    if (lista.some((m) => m.simbol === s) || planMonede.some((x) => x.simbol === s)) continue;
    try { adaugaPlan(s, await aduce15(s)); } catch (e) { d.jurnal("laborator botul tau", s, e.message); }
    if (pauzaMs) await d.pauza(pauzaMs);
  }
  const intrebari = d.GridLaborator.intrebari(rows, H);
  const rez = { la: Date.now(), H, monede, fara, ferestre: rows.length, intrebari,
    planMonede: cuPlan && planMonede.length ? { dir: "long", plan: { plus: d.plan.plus, minus: d.plan.minus }, suma: d.suma || 100, levier: d.levier || 5, nota: d.notaPlan || "", monede: planMonede } : null };
  d.jurnal("laborator:", monede, "monede,", rows.length, "ferestre in", Math.round((Date.now() - t0) / 1000) + " s; " + intrebari.map((q) => q.id + "=" + q.verdict).join(" "));
  return rez;
}
