// Rețeaua neuronală în colector (specul rețelei, livrarea 1): noaptea (02–05), o dată pe zi - (1) istoria de ~400 de zile a barelor de 1 h
// în data/retea/ore/ (separat: profilul și sfaturile rămân pe 185 de zile), (2) boții închiși în data/retea/boti.json, (3) antrenorul
// într-un proces SEPARAT (prioritate scăzută, oprit după 35 de minute - colectorul nu încarcă TensorFlow), (4) modelele urcate în KV
// (`retea`). Antrenorul care pică lasă modelul de ieri (pe disc și în KV). d.forta = o tură acum, oricând (steagul porneste-acum).
// deps: { acum, stare, forta, eNoapte(t), ziRo(t), simboluri, cereKlines(simbol, end), pauza(ms), citesteOre(s), scrieOre(s, rânduri),
//         boti() -> [JurnalTrade + simbol], scrieBoti(l), porneste() -> Promise<{cod, minute}>, citesteModele(), trimite, jurnal, scrieStare(st) }
const ORA = 3600000, ZILE = 400, PAGINI = 300;
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const tBara = (r) => Number(r && r.time);
// paginile mai vechi până la ~400 de zile (sau până spune Pionex că nu mai are: MARKET_INVALID_TIME / pagină goală), plus pagina cea
// mai nouă; ce era pe disc rămâne; buget.pagini scade cu fiecare cerere
export async function aduInapoi(simbol, vechi, d, buget) {
  const h = new Map(); let cea = Infinity;
  const pune = (r) => { const t = tBara(r); if (Number.isFinite(t)) { h.set(t, r); if (t < cea) cea = t; } };
  for (const r of Array.isArray(vechi) ? vechi : []) pune(r);
  const ia = async (end) => {
    buget.pagini--; const k = await d.cereKlines(simbol, end), r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r) { if (/INVALID_TIME|endTime/i.test(JSON.stringify(k || {}))) return []; throw new Error((k && (k.error || k.message)) || "fără lumânări 60M"); }
    r.forEach(pune); return r;
  };
  const deLa = d.acum - ZILE * 24 * ORA; let complet = false, pagini = 1;
  await ia(null);
  while (buget.pagini > 0) {
    if (cea <= deLa) { complet = true; break; }
    await d.pauza(1600);
    const inainte = cea, r = await ia(cea - 1); pagini++;
    if (!r.length || cea >= inainte) { complet = true; break; }
  }
  return { randuri: [...h.values()].sort((a, b) => tBara(a) - tBara(b)), complet, pagini };
}
export async function turaRetea(d) {
  const st = d.stare, azi = d.ziRo(d.acum);
  if (st.inLucru) return null;
  if (!d.forta && (!d.eNoapte(d.acum) || st.zi === azi)) return null;
  st.inLucru = true;
  try {
    st.complete = st.complete || {};
    const buget = { pagini: PAGINI };
    for (const s of d.simboluri) {
      if (buget.pagini <= 0) break;
      if (st.complete[s] && s !== "BTC_USDT_PERP") continue;   // BTC nu e în istoric-1h: se ține la zi în fiecare noapte
      try { const r = await aduInapoi(s, d.citesteOre(s), d, buget); d.scrieOre(s, r.randuri); if (r.complet) st.complete[s] = true; }
      catch (e) { d.jurnal("retea: istoria " + s, e.message); }
    }
    try { const l = await d.boti(); d.scrieBoti(l); d.jurnal("retea: " + cate(l.length, "bot închis", "boți închiși") + " pentru rezultatul tău"); } catch (e) { d.jurnal("retea: boții", e.message); }
    const r = await d.porneste();
    d.jurnal("retea: antrenorul a ieșit cu " + r.cod + " după " + cate(r.minute, "minut", "minute"));
    const m = r.cod === 0 ? d.citesteModele() : null;
    if (m && m.modele && Object.keys(m.modele).length) {
      try { await d.trimite("/api/istoric-bot?action=retea", { la: m.la, versiune: m.versiune, modele: m.modele }); d.jurnal("retea: urcate " + cate(Object.keys(m.modele).length, "model", "modele")); }
      catch (e) { d.jurnal("retea: urcarea", e.message); }
    } else d.jurnal("retea: nimic urcat, modelele de ieri rămân");
    st.zi = azi;
    return { cod: r.cod };
  } finally { st.inLucru = false; d.scrieStare(st); }
}
