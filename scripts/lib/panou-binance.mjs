// v101.170 (07.11.2026, I-847, el: „fă tot”): un singur panou zilnic Binance pentru turele „căderi” și „direcție”. Amândouă cer barele zilnice
// ale acelorași ~520 de perpetue (200 de bare, aceeași adresă) + exchangeInfo ⇒ ~1.040 de cereri pe zi, iar direcția aștepta căderile ca să nu
// se apropie de plafonul de 2.400 pe minut. Acum a doua tură primește din panoul primei ACELAȘI răspuns, pe aceeași zi UTC:
//   - doar /fapi/v1/klines cu interval=1d fără startTime / endTime (adresa întreagă e cheia: simbol + limită) și /fapi/v1/exchangeInfo;
//   - restul (funding, OI, klines pe alte intervale) trece direct, necontat;
//   - un eșec (null) nu se ține minte: tura următoare cere din nou; la schimbarea zilei UTC panoul se golește;
//   - fiecare tură primește o COPIE (structuredClone): una nu poate strica datele celeilalte.
// Calculele turelor nu se schimbă (bareInchise taie bara încă deschisă după ora ei de închidere, la fel pe răspunsul din panou).
const ZI = 86400000;
export function cheiePanou(url) {
  const u = String(url || "");
  if (/\/fapi\/v1\/exchangeInfo(\?|$)/.test(u)) return "info";
  const m = /\/fapi\/v1\/klines\?(.*)$/.exec(u); if (!m) return null;
  const q = new URLSearchParams(m[1]);
  if (q.get("interval") !== "1d" || q.has("startTime") || q.has("endTime")) return null;
  return "k:" + q.get("symbol") + ":" + (q.get("limit") || "");
}
export function cuPanouZilnic(binance, { ceas = Date.now, jurnal } = {}) {
  let zi = null, harta = new Map(), luate = 0, cerute = 0;
  async function b(url) {
    const k = cheiePanou(url);
    if (!k) return binance(url);
    const z = Math.floor(ceas() / ZI);
    if (z !== zi) { if (zi != null && jurnal && (luate || cerute)) jurnal("panoul Binance al zilei: " + cerute + " cerute, " + luate + " luate din panou"); zi = z; harta = new Map(); luate = 0; cerute = 0; }
    if (harta.has(k)) { luate++; return structuredClone(harta.get(k)); }
    const v = await binance(url); cerute++;
    if (v != null) harta.set(k, v);
    return v == null ? v : structuredClone(v);
  }
  b.stare = binance.stare;   // aceeași frână (418 / rețea moartă) ca a clientului de dedesubt
  if (typeof binance.reia === "function") b.reia = () => binance.reia();
  b.goleste = () => { harta = new Map(); };   // revizia: după tura direcției panoul nu mai trebuie (~520 de serii ținute degeaba toată ziua)
  b.panou = () => ({ zi: zi == null ? null : new Date(zi * ZI).toISOString().slice(0, 10), serii: harta.size, luate, cerute });
  return b;
}
