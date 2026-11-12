// Tura lărgimii crypto (v101.174, Radar v100.331, el 12.11: „3 … fă tot”): o dată la 30 de minute, universul paginii (Pionex SPOT/USDT după volum,
// doar crypto, primele 24 - LargimeCrypto.univers) ⇒ barele zilnice Binance spot (260) ⇒ aceleași formule ca Piața azi (LargimeCrypto.rand / agrega)
// ⇒ KV `largime-crypto` (ruta action=largimeCrypto). Pagina o citește sub 90 de minute; altfel o socotește singură, ca înainte.
// d = { acum, cere(cale), binance(url) -> json | null, LargimeCrypto, eCrypto(base), trimite(cale, corp), jurnal(...) }; st = { la } (în memorie)
export const RITM_MS = 30 * 60000;
// numărătorile din jurnal - „1 monedă”, „24 de monede” (TextRo.cate; rezerva știe aceeași regulă, ca tura-sugestii)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export async function turaLargimeCrypto(d, st) {
  if (d.acum - (st.la || 0) < RITM_MS) return null;
  st.la = d.acum;
  const L = d.LargimeCrypto;
  // revizia Opus (🔵7): ca celelalte ture Binance - întâi voie (după un 418 / rețeaua moartă din altă tură); monedele care nu sunt pe Binance spot
  // (HTTP 400, 3 încercări) ținute minte pe zi, ca să nu le cerem la fiecare 30 de minute
  if (d.binance && typeof d.binance.reia === "function" && !d.binance.reia()) { d.jurnal("lărgimea crypto: Binance a interzis IP-ul (418) - sar tura"); return { facut: false, motiv: "418" }; }
  const zi = new Date(d.acum).toISOString().slice(0, 10); if (!st.lipsa || st.lipsaZi !== zi) { st.lipsa = {}; st.lipsaZi = zi; }
  let si = null, ti = null;
  try { si = await d.cere("/api/market?type=pionex_symbols"); ti = await d.cere("/api/market?type=pionex_tickers"); } catch { si = ti = null; }
  const baze = L.univers(si && si.data && si.data.symbols || [], ti && ti.data && ti.data.tickers || [], d.eCrypto, 24);
  if (baze.length < 10) { d.jurnal("lărgimea crypto: doar " + cate(baze.length, "monedă", "monede") + " de la Pionex - sar tura"); return { facut: false, motiv: "univers" }; }
  const rows = [];
  for (const b of baze) {
    if (st.lipsa[b]) continue;
    let k = null; try { k = await d.binance("https://api.binance.com/api/v3/klines?symbol=" + b + "USDT&interval=1d&limit=260"); } catch { k = null; }
    if (!Array.isArray(k)) { st.lipsa[b] = 1; continue; }
    const r = L.rand(b, k); if (r) rows.push(r);
  }
  if (rows.length < 10) { d.jurnal("lărgimea crypto: doar " + cate(rows.length, "serie", "serii") + " de la Binance - nu public"); return { facut: false, motiv: "serii" }; }
  const btc = rows.find((x) => x.symbol === "BTC"), bc = btc && btc.prev ? (btc.last / btc.prev - 1) * 100 : NaN;
  const largime = L.agrega(rows, { market: "CRYPTO", source: "BINANCE", total: baze.length, depth: "FAST", universe: "PIONEX TOP24 / BINANCE DAILY", benchmarkReturn: bc });
  await d.trimite("/api/istoric-bot?action=largimeCrypto", { la: d.acum, largime });
  return { facut: true, n: rows.length, total: baze.length, score: largime.score, state: largime.state };
}
