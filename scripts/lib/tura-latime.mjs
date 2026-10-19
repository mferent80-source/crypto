// Tura de lățime a colectorului (v101.93, I-583): cele 150 de perp-uri USDT de pe Binance, doar cripto, cu formulele din Latime
// (public/lib/latime.js = PAZNIC-CRYPTO/decizie.mjs). Cererile pleacă DIRECT la Binance, din PC (nu prin Pages Functions): barele
// de 4h și 1d la 15 minute (300 de cereri), seriile (funding, OI, poziționare, agresiune) o dată pe oră (750), premiumIndex o dată
// (toate monedele). 5 în paralel (PAZNIC: paralel 5). O singură publicare pe tură în KV `latime`. Probat în proba-v100150-colector.mjs.
// d = { binance, trimite, jurnal, pauza, Latime, botiSimboluri, dupa? }; st = starea ei (colectorul o ține în meta și o scrie pe disc)
const MIN = 60000;
export const RITM = { bare: 15 * MIN, serii: 60 * MIN, univers: 60 * MIN };
const FAPI = "https://fapi.binance.com";
const serii = new Map();   // sym -> { fundIst, oiSerie, mari, mici, taker } - în memorie, nu în st (ar fi 2 MB scriși pe disc la fiecare tură)

// cererea la Binance: 3 încercări, la eșec null (moneda devine „lipsă”, nu cade tura)
// audit 19.10: cei 5 lucrători aveau fiecare pauza lui (un 429 oprea doar lucrătorul care l-a luat; ceilalți 4 loveau mai departe IP-ul).
// Acum starea e COMUNĂ (binance.stare): `pauzaPana` - pusă din retry-after (cel puțin 60 s) la 429, și la minutul următor (+1 s) când
// greutatea folosită (x-mbx-used-weight-1m) trece de 1800 din 2400 - verificată ÎNAINTEA fiecărei cereri; la 418 (IP interzis)
// `oprit` ⇒ nicio cerere până la sfârșitul turei (turaLatime nu publică, scrie în jurnal), iar tura următoare se sare cât ține interdicția.
const GREUTATE_MAX = 1800;
export function cereBinance({ fetch: f, pauza, jurnal, ceas }) {
  const fetchul = f || globalThis.fetch, acum = ceas || Date.now;
  const stare = { pauzaPana: 0, oprit: null };
  const pauzaPana = (t) => { if (t > stare.pauzaPana) stare.pauzaPana = t; };
  async function binance(url) {
    for (let i = 0; i < 3; i++) {
      if (stare.oprit) return null;
      const ramas = stare.pauzaPana - acum(); if (ramas > 0) await pauza(Math.ceil(ramas / 1000) * 1000);
      if (stare.oprit) return null;
      try {
        const r = await fetchul(url, { headers: { "User-Agent": "crypto-radar/1.0" }, signal: AbortSignal.timeout(20000) });   // v100.175 (M21): undici dădea abia după ~300 s
        // revizia (6): greutatea pe minut din antet (limita 2400) - PAZNIC lovește același IP în zilele de suprapunere
        const g = Number(r.headers.get("x-mbx-used-weight-1m")); if (Number.isFinite(g) && g > 1500) jurnal("latime: greutatea Binance pe minut " + g + " din 2400");
        if (Number.isFinite(g) && g > GREUTATE_MAX) pauzaPana((Math.floor(acum() / 60000) + 1) * 60000 + 1000);
        const ra = Number(r.headers.get("retry-after")) || 0;
        if (r.status === 418) { pauzaPana(acum() + Math.max(60000, ra * 1000)); stare.oprit = "Binance 418 (IP interzis)"; jurnal("latime: Binance 418 (IP interzis" + (ra ? " " + ra + " s" : "") + ") - opresc toată tura"); return null; }
        if (r.status === 429) { const ms = Math.max(60000, ra * 1000); pauzaPana(acum() + ms); jurnal("latime: Binance 429, pauză comună " + Math.round(ms / 1000) + " s"); continue; }
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) { if (i === 2) { jurnal("latime: " + url.replace(FAPI, "") + " - " + e.message); return null; } await pauza(700 * (i + 1)); }
    }
    return null;
  }
  binance.stare = stare;
  // la începutul turei: interdicția încă ține ⇒ false (tura se sare); altfel oprirea turei trecute se șterge
  binance.reia = () => { if (stare.oprit && stare.pauzaPana > acum()) return false; stare.oprit = null; return true; };
  return binance;
}
async function inParalel(lista, n, fn) { const out = new Array(lista.length); let k = 0; await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => { while (k < lista.length) { const i = k++; out[i] = await fn(lista[i], i); } })); return out; }
const bara = (k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] });

// universul: exchangeInfo + ticker/24hr; filtrul e cel din PAZNIC univers.mjs - când dă 0, se SPUNE, nu se cade pe „orice *USDT”
// revizia (1, 2b): două feluri de eșec - `retea` (Binance mut: se ține universul vechi dacă există) și `eroare` (un câmp redenumit:
// filtrul dă 0 - se spune, nu se cade pe „orice *USDT”); ticker/24hr e verificat la fel ca exchangeInfo
async function universul(d, P, acum) {
  const info = await d.binance(FAPI + "/fapi/v1/exchangeInfo");
  if (info === null) return { retea: "exchangeInfo n-a răspuns" };
  const lista = Array.isArray(info.symbols) ? info.symbols : [], minMs = P.minZileListate * 86400000;
  const cripto = new Map(lista.filter((x) => x.quoteAsset === "USDT" && x.status === "TRADING" && x.contractType === "PERPETUAL" && x.underlyingType === "COIN").map((x) => [x.symbol, Number.isFinite(+x.onboardDate) ? +x.onboardDate : null]));
  if (!cripto.size) return { eroare: "universul e gol: " + lista.length + " simboluri de la Binance, 0 trec filtrul (quoteAsset / status / contractType / underlyingType) - s-a schimbat un nume de câmp?" };
  const tick = await d.binance(FAPI + "/fapi/v1/ticker/24hr");
  if (tick === null) return { retea: "ticker/24hr n-a răspuns" };
  const t = Array.isArray(tick) ? tick.filter((x) => cripto.has(x.symbol) && (cripto.get(x.symbol) === null || acum - cripto.get(x.symbol) >= minMs)) : [];
  if (!t.length) return { eroare: "ticker/24hr: 0 simboluri cu volum dintre " + cripto.size + " cripto - s-a schimbat un nume de câmp (symbol / quoteVolume)?" };
  t.sort((a, b) => +b.quoteVolume - +a.quoteVolume);
  return { univers: t.slice(0, P.nSimboluri).map((x) => ({ sym: x.symbol, onboard: cripto.get(x.symbol) })) };
}
async function seriile(d, sym) {
  const [istF, oih, mari, mici, taker] = await Promise.all([
    d.binance(`${FAPI}/fapi/v1/fundingRate?symbol=${sym}&limit=500`), d.binance(`${FAPI}/futures/data/openInterestHist?symbol=${sym}&period=1h&limit=500`),
    d.binance(`${FAPI}/futures/data/topLongShortPositionRatio?symbol=${sym}&period=1h&limit=200`), d.binance(`${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=1h&limit=200`),
    d.binance(`${FAPI}/futures/data/takerlongshortRatio?symbol=${sym}&period=1h&limit=500`)]);
  serii.set(sym, { fundIst: Array.isArray(istF) ? istF.map((x) => +x.fundingRate) : null, oiSerie: Array.isArray(oih) && oih.length > 60 ? oih.map((x) => +x.sumOpenInterest) : null, mari: Array.isArray(mari) ? mari : null, mici: Array.isArray(mici) ? mici : null, taker: Array.isArray(taker) ? taker : null });
}
export async function turaLatime(d, st, acum) {
  acum = acum || Date.now(); const P = d.Latime.PRAGURI, la = (k) => st["la_" + k] || 0;
  if (acum - la("bare") < RITM.bare) return st;
  st.la_bare = acum;
  // audit 19.10: 418 la tura trecută și interdicția încă ține ⇒ tura se sare (fiecare cerere ar prelungi-o); oprită pe drum ⇒ nu se publică
  const oprita = () => !!(d.binance && d.binance.stare && d.binance.stare.oprit);
  if (d.binance && typeof d.binance.reia === "function" && !d.binance.reia()) { d.jurnal("latime: Binance a interzis IP-ul (418) - sar tura"); return st; }
  if (!st.univers || !st.univers.length || acum - la("univers") >= RITM.univers) {
    const u = await universul(d, P, acum);
    if (oprita()) { d.jurnal("latime: tura oprită (Binance 418), nu public"); return st; }
    if (u.univers) { st.univers = u.univers; st.la_univers = acum; }
    else if (u.retea && st.univers && st.univers.length) d.jurnal("latime: " + u.retea + " - țin universul vechi, " + st.univers.length + " la număr");   /* fără „N monede” lipit: garda v100.75 */
    else {
      const motiv = u.eroare || u.retea; st.univers = null; st.la_univers = 0; d.jurnal("latime: " + motiv);
      const gol = { la: acum, n: 0, lipsa: 0, incomplet: true, eroare: motiv, regim: { cod: "NECUNOSCUT", pctSus: null, pctJos: null }, lat: d.Latime.latimea([], P), monede: [] };
      if (typeof d.dupa === "function") d.dupa(gol);   /* v101.107: colectorul ține ultima lățime pentru paza boților */
      await d.trimite("/api/istoric-bot?action=latime", gol);
      return st;
    }
  }
  // revizia (6): seriile se refac pe SFERTURI de univers la fiecare tură de 15 min (fiecare monedă o dată pe oră) - salturi de 4× mai mici pe IP
  // prima tură a unei stări noi (colector repornit) aduce TOATE seriile, apoi sferturile 0..3
  const toate = st.rot == null, rot = toate ? 0 : st.rot;
  const prem = await d.binance(FAPI + "/fapi/v1/premiumIndex"), fr = new Map(Array.isArray(prem) ? prem.map((x) => [x.symbol, +x.lastFundingRate]) : []);
  const randuri = await inParalel(st.univers, P.paralel, async ({ sym }, i) => {
    if (toate || !serii.has(sym) || i % 4 === rot) await seriile(d, sym);
    const b4 = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${sym}&interval=4h&limit=${P.bare4h}`), b1d = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${sym}&interval=1d&limit=30`);
    if (!Array.isArray(b4) || !Array.isArray(b1d)) return null;
    const s = serii.get(sym) || {};
    return d.Latime.masuraMoneda({ sym, pret: +b4[b4.length - 1][4], b4: b4.map(bara), b1d: b1d.map(bara), frAcum: fr.has(sym) ? fr.get(sym) : null, fundIst: s.fundIst, oiSerie: s.oiSerie, mari: s.mari, mici: s.mici, taker: s.taker }, P);
  });
  if (oprita()) { d.jurnal("latime: tura oprită (Binance 418), nu public"); return st; }
  const lat = d.Latime.latimea(randuri, P), regim = d.Latime.regimPietei(lat), monede = randuri.filter(Boolean);
  const corp = { la: acum, n: st.univers.length, lipsa: lat.lipsa, incomplet: lat.lipsa > 0.2 * st.univers.length, eroare: null, regim, lat, monede };
  if (typeof d.dupa === "function") d.dupa(corp);   /* v101.107: paza boților (botul CONTRA monedei din pândă) */
  await d.trimite("/api/istoric-bot?action=latime", corp);
  st.rot = toate ? 0 : (rot + 1) % 4; st.ultima = { la: acum, n: corp.n, lipsa: corp.lipsa, cod: regim.cod };
  d.jurnal("latime: " + regim.cod + " · " + lat.sus + " sus · " + lat.jos + " jos · lipsă " + lat.lipsa + (toate ? " · toate seriile" : " · seriile sfertului " + rot));
  return st;
}
