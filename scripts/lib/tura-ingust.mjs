// v100.58 (el, 01.10): gridul ingust pe monedele sugerate - colectorul, la 6 h. deps: { clasament, Idei, GridProba, GridCalcul,
// cere(simbol, end) -> klines Pionex 15M (500), trimite(url, corp), pauza(ms), jurnal, pagini? (12 = ~62 de zile), pauzaMs? }
export async function turaIngust(d) {
  const pagini = d.pagini > 0 ? d.pagini : 12, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs;
  const l = d.Idei.ideiBoti(d.clasament, [], 5);
  let monede = 0, propuse = 0;
  for (const x of l) {
    let r15 = [], end = null;
    try {
      for (let p = 0; p < pagini; p++) {
        const k = await d.cere(x.simbol, end), r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
        if (!r || !r.length) break;
        r15 = r15.concat(r);
        const t = r.map((y) => Number(y && y.time)).filter(Number.isFinite);
        if (r.length < 500 || !t.length) break;
        end = Math.min(...t) - 1; if (pauzaMs) await d.pauza(pauzaMs);
      }
      const b = d.GridCalcul.bare(r15);
      const ing = d.GridProba.ingust(b, { dir: x.dir, miscare: !!(x.regim && x.regim.miscare), pret: b.length ? b[b.length - 1].c : null, suma: 100 });
      await d.trimite("/api/istoric-bot?action=ingust", { simbol: x.simbol, ingust: { ...ing, la: Date.now(), zile: Math.round(b.length / 96) } });
      monede++; if (ing.propus) propuse++;
    } catch (e) { d.jurnal("ingust " + x.simbol, e.message); }
  }
  d.jurnal("ingust: " + monede + " monede sugerate, " + propuse + " cu grid ingust propus");
  return { monede, propuse };
}
