// v100.25 (30.09, el: „FA IDEILE” - ideea 2): colectorul strange botii inchisi Pionex in arhiva din KV-ul de acasa
// (istoric-bot?action=botiInchisi). Pionex da istoria pe pagini de cate 10, cu cursor (nextPageToken).
// Prima data: TOATA istoria, pagina cu pagina (la 30.09: ~226 de pagini), cu pauza intre ele - ruta si Pionex au limite.
// Dupa ce arhiva e completa: doar botii noi - se opreste la prima pagina care are un bot deja stiut.
// Picata la jumatate: ce s-a strans se trimite, arhiva ramane „incompleta”, tura urmatoare reia de la inceput (sare peste cei stiuti).
import { compactBot, idArhiva, FORMA_ARHIVA } from "../../functions/_shared/boti-arhiva.js";

export async function strangeBoti({ cere, trimite, pauza = (ms) => new Promise((r) => setTimeout(r, ms)), pauzaMs = 2000, bucata = 400, maxPagini = 600 }) {
  const arh = await cere("/api/istoric-bot?action=botiInchisi");
  // v100.26: „stiut” = deja pe forma de acum; botii de forma veche (fara campurile noi) se retrimit, iar arhiva de forma veche
  // nu e completa pana nu trece tura prin toata istoria
  const stiute = new Set((arh && Array.isArray(arh.boti) ? arh.boti : []).filter((b) => b && Number(b.forma) === FORMA_ARHIVA).map(idArhiva));
  const complet = !!(arh && arh.complet && Number(arh.forma || 1) === FORMA_ARHIVA);
  let tampon = [], noi = 0, pagini = 0, tok = null, gata = false, atinsStiut = false, spusComplet = false;
  const trimiteTampon = async (ultima) => {
    while (tampon.length >= bucata || (ultima && tampon.length)) {
      const b = tampon.slice(0, bucata); tampon = tampon.slice(bucata);
      const c = !!(ultima && gata && !tampon.length);
      await trimite("/api/istoric-bot?action=botiInchisi", { boti: b, complet: c });
      if (c) spusComplet = true;
    }
  };
  try {
    while (pagini < maxPagini) {
      if (pagini) await pauza(pauzaMs);
      const d = await cere("/api/bot-orders?status=finished&brut=1" + (tok ? "&pageToken=" + encodeURIComponent(tok) : ""));
      pagini++;
      for (const b of Array.isArray(d && d.bots) ? d.bots : []) {
        const c = compactBot(b); if (!c) continue;
        if (stiute.has(c.strategyId)) { atinsStiut = true; continue; }
        stiute.add(c.strategyId); tampon.push(c); noi++;
      }
      tok = d && d.nextPageToken || null;
      if (!tok) { gata = true; break; }
      if (complet && atinsStiut) break;
      await trimiteTampon(false);
    }
  } catch (e) {
    try { await trimiteTampon(true); } catch {}
    throw e;
  }
  await trimiteTampon(true);
  // arhiva devine completa si cand tamponul era gol la capat (ultimii boti deja stiuti sau trimisi in bucata dinainte)
  if (gata && !complet && !spusComplet) await trimite("/api/istoric-bot?action=botiInchisi", { boti: [], complet: true });
  return { noi, pagini, complet: complet || gata, total: stiute.size };
}
