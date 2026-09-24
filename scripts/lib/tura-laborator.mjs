// Tura laboratorului de grid (v79.5): top N PERP dupa volum, ~31 de zile de 15M pe moneda,
// ferestrele de grid neutru cu conditiile stiute la pornire, puse la un loc, apoi cele 3
// intrebari. Folosita de colector (o data pe zi) si de scripts/grid-laborator-real.mjs.
// deps: { cere(cale) -> JSON cu forma Pionex {data:{...}}, trimite?, jurnal, pauza,
//         GridCalcul, GridLaborator, GridClasament, top (20), H (2), pauzaMs (1600) }
export async function turaLaborator(d) {
  const top = d.top || 20, H = d.H || 2, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs, t0 = Date.now();
  const tk = await d.cere("tickers");
  const lista = d.GridClasament.topDupaVolum(tk && tk.data && tk.data.tickers, top);
  let rows = [], monede = 0, fara = 0;
  for (const m of lista) {
    try {
      let r15 = [], end = null;
      for (let p = 0; p < 6; p++) {
        const k = await d.cere("klines", m.simbol, end);
        const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
        if (!r) throw new Error((k && (k.error || k.message)) || "fara lumanari");
        r15 = r15.concat(r);
        const t = r.map((x) => Number(x && x.time)).filter(Number.isFinite);
        if (r.length < 500 || !t.length) break;
        end = Math.min(...t) - 1;
        if (pauzaMs) await d.pauza(pauzaMs);
      }
      const f = d.GridLaborator.ferestre(d.GridCalcul.bare(r15), H);
      if (!f.length) { fara++; continue; }
      rows = rows.concat(f.map((x) => Object.assign({ simbol: m.simbol }, x)));
      monede++;
    } catch (e) { fara++; d.jurnal("laborator", m.simbol, e.message); }
    if (pauzaMs) await d.pauza(pauzaMs);
  }
  const intrebari = d.GridLaborator.intrebari(rows, H);
  const rez = { la: Date.now(), H, monede, fara, ferestre: rows.length, intrebari };
  d.jurnal("laborator:", monede, "monede,", rows.length, "ferestre in", Math.round((Date.now() - t0) / 1000) + " s; " + intrebari.map((q) => q.id + "=" + q.verdict).join(" "));
  return rez;
}
