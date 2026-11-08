// v101.171 (08.11.2026, Radar v100.313, el: „fă ideea cu curba în Radar”): CURBA STOPULUI - o dată la 6 ore, 21 de perechi Binance perp,
// bare de 1 h (ultimele 1.000 ≈ 41 de zile, doar cele închise), CurbaStop.curba(…, 30 de zile) ⇒ data/curba-stop.json + KV `curbaStop`.
// Aceleași 21 de perechi ca proba din 08.11 (CURBA-STOP-VARIANTE-2026-11-08.md: varianta rulantă simetrică = singura calibrată pe 24 / 72 h).
// Sub 10 perechi aduse (Binance căzut / 418) nu se scrie nimic: curba ar fi strâmbă; se reîncearcă peste o oră.
// deps: { acum, binance(url) -> json | null, CurbaStop, trimite(cale, corp), scrieDisc(curba), jurnal(...), pauza(ms) }
import "./text-ro-global.mjs";   // TextRo.cate: „de” de la 20, singularul la 1 (garda din proba v100.75)
export const FAPI = "https://fapi.binance.com";
export const SIMBOLURI = ["BTCUSDT", "ETHUSDT", "ZECUSDT", "HYPEUSDT", "SOLUSDT", "BNBUSDT", "NEARUSDT", "XRPUSDT", "DOGEUSDT",
  "ENAUSDT", "WLDUSDT", "SUIUSDT", "ADAUSDT", "UNIUSDT", "PUMPUSDT", "INITUSDT", "LINKUSDT", "FILUSDT", "BCHUSDT", "AVAXUSDT", "EGLDUSDT"];
const ORA = 3600000;
export const PAS_TURA = 6 * ORA, REINCERC = ORA, MIN_PERECHI = 10;

export async function turaCurbaStop(d, st) {
  const acum = d.acum;
  if (st.inLucru) return { facut: false, motiv: "inLucru" };   // revizia (08.11): lanțul greu pornește la 60 s; o tură lungă nu se dublează
  if (acum - (st.la || 0) < PAS_TURA || acum - (st.esecLa || 0) < REINCERC) return { facut: false };
  st.inLucru = true;
  try { return await tura(d, st, acum); } finally { st.inLucru = false; }
}

async function tura(d, st, acum) {
  const seturi = [];
  for (const s of SIMBOLURI) {
    let k = null;
    try { k = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${s}&interval=1h&limit=1000`); } catch { k = null; }
    if (Array.isArray(k) && k.length > 100) {
      const b = k.filter((r) => Array.isArray(r) && Number(r[0]) + ORA <= acum)
        .map((r) => ({ t: Number(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) }))
        .filter((x) => x.h >= x.l && x.l > 0 && x.c > 0);
      if (b.length > 100) seturi.push(b);
    }
    if (d.pauza) await d.pauza(250);
  }
  if (seturi.length < MIN_PERECHI) {
    st.esecLa = acum;
    d.jurnal("curba stopului: doar " + seturi.length + " din " + TextRo.cate(SIMBOLURI.length, "pereche", "perechi") + " aduse - nu scriu, reîncerc peste o oră");
    return { facut: false, motiv: "perechi", perechi: seturi.length };
  }
  const c = d.CurbaStop.curba(seturi, acum, { zile: 30 });
  if (!d.CurbaStop.valida(c)) { st.esecLa = acum; d.jurnal("curba stopului: curba nevalidă - nu scriu"); return { facut: false, motiv: "nevalida" }; }
  try { await d.trimite("/api/istoric-bot?action=curbaStop", { curba: c }); }
  catch (e) { st.esecLa = acum; d.jurnal("curba stopului: serverul n-a primit-o (" + String(e && e.message || e).slice(0, 80) + ") - reîncerc peste o oră"); return { facut: false, motiv: "trimitere" }; }
  d.scrieDisc(c);   // revizia (08.11): ABIA după ce a primit-o serverul - ora de pe disc, citită la pornire, nu mai amână 6 h o curbă netrimisă
  st.la = acum; st.esecLa = 0;
  return { facut: true, perechi: seturi.length, n24: c.n24, n72: c.n72 };
}
