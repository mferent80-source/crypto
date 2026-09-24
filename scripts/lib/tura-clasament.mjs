// Tura orara de clasament a colectorului, scoasa aici ca sa poata fi probata cu
// un server fals (scripts/colector-v77.mjs). Colectorul ii da functiile de retea.
//
// deps: { cere(cale) -> JSON, trimite(cale, corp) -> JSON, jurnal(...), pauza(ms),
//         GridCalcul, GridClasament, top (100), pauzaMs (1600), maxEsecuri (15) }
// Ruta publica a serverului are 45 de cereri/minut pe IP, impartite cu browserul:
// la 1,6 s intre cereri raman ~35/min. O lista cu >20% goluri NU se urca.
export async function turaClasament(d) {
  const top = d.top || 100, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs, maxEsecuri = d.maxEsecuri || 15;
  const t0 = Date.now();
  const tk = await d.cere("/api/market?type=pionex_tickers&market=PERP");
  const lista = d.GridClasament.topDupaVolum(tk && tk.data && tk.data.tickers, top);
  const monede = [];
  let esecuri = 0;
  for (const m of lista) {
    try {
      const k = await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(m.simbol) + "&interval=4H&limit=500");
      const bare = d.GridCalcul.bare(k && k.data && k.data.klines);
      if (!bare.length) throw new Error((k && (k.error || k.message || k.code)) || "fara lumanari");   // 200 cu result:false e tot esec
      monede.push(d.GridClasament.judeca(m.simbol, bare, m.volum));
    } catch (e) {
      esecuri++; monede.push(d.GridClasament.judeca(m.simbol, null, m.volum));
      if (esecuri >= maxEsecuri) { d.jurnal("clasament: prea multe esecuri, ma opresc la", monede.length); break; }
    }
    if (pauzaMs) await d.pauza(pauzaMs);
  }
  const rz = d.GridClasament.rezumat({ la: Date.now(), monede });
  if (!monede.length || rz.faraDate > monede.length * 0.2) {
    d.jurnal("clasament NEURCAT:", rz.faraDate, "fara date din", monede.length);
    return { urcat: false, monede, rz, durataS: Math.round((Date.now() - t0) / 1000) };
  }
  const r = await d.trimite("/api/istoric-bot?action=clasament", { la: Date.now(), monede });
  const urcat = !!(r && r.ok);
  d.jurnal("clasament:", monede.length, "monede in", Math.round((Date.now() - t0) / 1000) + " s;", rz.evita, "de evitat,", rz.candidati, "candidati,", rz.faraDate, "fara date;", urcat ? "urcat" : "NEURCAT");
  return { urcat, monede, rz, durataS: Math.round((Date.now() - t0) / 1000) };
}
