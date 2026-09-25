// Ideile de cumparare pe actiuni (v90): colectorul trece o data pe zi prin universul lui (Nasdaq-100 + actiunile
// pe care a castigat + lista lui), judeca fiecare cu Idei.judecaActiune si pastreaza primele 5.
// deps: { tickere: ["AAPL_US_EQ"...], cereBare(ticker) -> bare, cereRezultate(ticker) -> "YYYY-MM-DD"|null,
//         Idei, inchise, pauza, jurnal, acum }
export async function turaIdei(d) {
  const l = [], preturi = {}, vazute = new Set(), sim = d.simbol || ((tk) => tk.split("_")[0]);
  let judecate = 0, i = 0;
  for (const tk of d.tickere) {
    // acelasi simbol de bursa sub doua tickere T212 (SNDK1 = SNDK): o singura data, cu primul (al lui)
    const s = sim(tk); if (vazute.has(s)) continue; vazute.add(s);
    if (i++ > 0) await d.pauza(1000);
    let bare = null;
    try { bare = await d.cereBare(tk); } catch (e) { continue; }
    if (!bare || !bare.length) continue;
    judecate++; preturi[tk] = bare[bare.length - 1].c;
    let r = d.Idei.judecaActiune(bare, bare[bare.length - 1].c, { acum: d.acum });
    // data rezultatelor doar pentru cele care trec (o cerere in plus pe fiecare)
    if (r.trece) { let rz = null; try { rz = await d.cereRezultate(tk); } catch {} if (rz) r = d.Idei.judecaActiune(bare, bare[bare.length - 1].c, { acum: d.acum, rezultate: rz }); }
    l.push({ ticker: tk, simbol: s, r });
  }
  const trecute = l.filter((x) => x.r.trece).length, actiuni = d.Idei.alegeActiuni(l, 5, d.inchise);
  d.jurnal("idei: " + judecate + " actiuni judecate, " + trecute + " trec de poarta" + (actiuni.length ? ": " + actiuni.map((x) => x.simbol).join(", ") : ""));
  return { judecate, trecute, actiuni, preturi };
}
