// Ideile de cumparare pe actiuni (v90): colectorul trece o data pe zi prin universul lui (Nasdaq-100 + actiunile
// pe care a castigat + lista lui), judeca fiecare cu Idei.judecaActiune si pastreaza primele 5.
// deps: { tickere: ["AAPL_US_EQ"...], cereBare(ticker) -> bare, cereRezultate(ticker) -> "YYYY-MM-DD"|null,
//         Idei, inchise, pauza, jurnal, acum, ndx?: Set(simboluri Nasdaq 100), rezumat?: Acasa.rezumatActiune }
// v93: pentru actiunile din Nasdaq 100 pune si rezumatul zilei (Home: largimea, cine se misca, cele 7 mari).
// v101.55 (ideea 2): numărătorile din jurnal - „1 bot”, „25 de boți” (TextRo.cate; rezerva știe aceeași regulă)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export async function turaIdei(d) {
  const l = [], preturi = {}, vazute = new Set(), sim = d.simbol || ((tk) => tk.split("_")[0]), ndx = [], rev = [], serii = [];
  let judecate = 0, i = 0;
  for (const tk of d.tickere) {
    // acelasi simbol de bursa sub doua tickere T212 (SNDK1 = SNDK): o singura data, cu primul (al lui)
    const s = sim(tk); if (vazute.has(s)) continue; vazute.add(s);
    if (i++ > 0) await d.pauza(1000);
    let bare = null;
    try { bare = await d.cereBare(tk); } catch (e) { continue; }
    if (!bare || !bare.length) continue;
    judecate++; preturi[tk] = bare[bare.length - 1].c;
    if (d.ndx && d.rezumat && d.ndx.has(s)) { const z = d.rezumat(bare); if (z) ndx.push({ s, ...z }); }
    let r = d.Idei.judecaActiune(bare, bare[bare.length - 1].c, { acum: d.acum, Probabilitati: d.Probabilitati, ProfilMoneda: d.ProfilMoneda, simbol: tk });
    // data rezultatelor doar pentru cele care trec (o cerere in plus pe fiecare)
    if (r.trece) { let rz = null; try { rz = await d.cereRezultate(tk); } catch {} if (rz) r = d.Idei.judecaActiune(bare, bare[bare.length - 1].c, { acum: d.acum, rezultate: rz, Probabilitati: d.Probabilitati, ProfilMoneda: d.ProfilMoneda, simbol: tk }); }
    l.push({ ticker: tk, simbol: s, r });
    // v101.58 (reveniri): aceleași bare zilnice - acțiunea pe revenire (doar long) și punctele pentru istoricul regulii
    if (d.Reveniri) { try { const rv = d.Reveniri.actiunePeRevenire(bare); if (rv && rv.revine) rev.push({ ticker: tk, simbol: s, ...rv }); serii.push(d.Reveniri.puncte(bare, { r: d.Reveniri.REGULI.actiune })); } catch {} }
  }
  // v101.57 (03.10, ideea 1): și celelalte care trec de poartă (după scor, cel mult 40) - pagina le arată pliate; primele 5 rămân exact ca înainte
  const trecute = l.filter((x) => x.r.trece).length, toate = d.Idei.alegeActiuni(l, Math.min(Math.max(trecute, 5), 45), d.inchise), actiuni = toate.slice(0, 5), restul = toate.slice(5);
  // v101.58 (reveniri): cel mult 10, cea mai mare cădere întâi, cu istoricul LUI pe acțiune; istoricul regulii pe toate acțiunile judecate
  const ist = (tk) => { const t = (d.inchise || []).filter((x) => x && x.ticker === tk); return { n: t.length, pePlus: t.filter((x) => x.rezultat > 0).length, total: t.reduce((a, x) => a + (x.rezultat || 0), 0) }; };
  const reveniri = rev.sort((a, b) => b.cadere - a.cadere).slice(0, 10).map((x) => ({ ...x, istoric: ist(x.ticker) }));
  const dovadaReveniri = d.Reveniri ? d.Reveniri.dovada(serii, "revine", { pauzaZile: 14 }) : null;
  d.jurnal("idei: " + cate(judecate, "acțiune judecată", "acțiuni judecate") + ", " + (trecute === 1 ? "una trece" : trecute + " trec") + " de poarta" + (actiuni.length ? ": " + actiuni.map((x) => x.simbol).join(", ") : "") + (reveniri.length ? "; pe revenire: " + reveniri.map((x) => x.simbol).join(", ") : ""));
  return { judecate, trecute, actiuni, restul, reveniri, dovadaReveniri, preturi, ndx };
}
