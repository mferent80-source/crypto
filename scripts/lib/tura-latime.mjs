// Tura de lățime a colectorului (v101.93, I-583): cele 150 de perp-uri USDT de pe Binance, doar cripto, cu formulele din Latime
// (public/lib/latime.js = PAZNIC-CRYPTO/decizie.mjs). Cererile pleacă DIRECT la Binance, din PC (nu prin Pages Functions): barele
// de 4h și 1d la 15 minute (300 de cereri), seriile (funding, OI, poziționare, agresiune) o dată pe oră (750), premiumIndex o dată
// (toate monedele). 5 în paralel (PAZNIC: paralel 5). O singură publicare pe tură în KV `latime`. Probat în proba-v100150-colector.mjs.
// d = { binance, trimite, jurnal, pauza, Latime, botiSimboluri }; st = starea ei (colectorul o ține în meta și o scrie pe disc)
const MIN = 60000;
export const RITM = { bare: 15 * MIN, serii: 60 * MIN, univers: 60 * MIN };
const FAPI = "https://fapi.binance.com";
const serii = new Map();   // sym -> { fundIst, oiSerie, mari, mici, taker } - în memorie, nu în st (ar fi 2 MB scriși pe disc la fiecare tură)

// cererea la Binance: 3 încercări, la 429 / 418 o pauză de 60 s (o singură dată), la eșec null (moneda devine „lipsă”, nu cade tura)
export function cereBinance({ fetch: f, pauza, jurnal }) {
  const fetchul = f || globalThis.fetch;
  return async function binance(url) {
    let pauzat = false;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetchul(url, { headers: { "User-Agent": "crypto-radar/1.0" } });
        if ((r.status === 429 || r.status === 418) && !pauzat) { pauzat = true; jurnal("latime: Binance " + r.status + ", pauză 60 s"); await pauza(60000); continue; }
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) { if (i === 2) { jurnal("latime: " + url.replace(FAPI, "") + " - " + e.message); return null; } await pauza(700 * (i + 1)); }
    }
    return null;
  };
}
async function inParalel(lista, n, fn) { const out = new Array(lista.length); let k = 0; await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => { while (k < lista.length) { const i = k++; out[i] = await fn(lista[i], i); } })); return out; }
const bara = (k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] });

// universul: exchangeInfo + ticker/24hr; filtrul e cel din PAZNIC univers.mjs - când dă 0, se SPUNE, nu se cade pe „orice *USDT”
async function universul(d, P, acum) {
  const info = await d.binance(FAPI + "/fapi/v1/exchangeInfo"), tick = await d.binance(FAPI + "/fapi/v1/ticker/24hr");
  const lista = info && Array.isArray(info.symbols) ? info.symbols : [], minMs = P.minZileListate * 86400000;
  const cripto = new Map(lista.filter((x) => x.quoteAsset === "USDT" && x.status === "TRADING" && x.contractType === "PERPETUAL" && x.underlyingType === "COIN").map((x) => [x.symbol, Number.isFinite(+x.onboardDate) ? +x.onboardDate : null]));
  if (!cripto.size) return { eroare: "universul e gol: " + lista.length + " simboluri de la Binance, 0 trec filtrul (quoteAsset / status / contractType / underlyingType) - s-a schimbat un nume de câmp?" };
  const t = Array.isArray(tick) ? tick.filter((x) => cripto.has(x.symbol) && (cripto.get(x.symbol) === null || acum - cripto.get(x.symbol) >= minMs)) : [];
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
  if (!st.univers || acum - la("univers") >= RITM.univers) {
    const u = await universul(d, P, acum);
    if (u.eroare) { st.univers = null; st.la_univers = 0; d.jurnal("latime: " + u.eroare); await d.trimite("/api/istoric-bot?action=latime", { la: acum, n: 0, lipsa: 0, incomplet: true, eroare: u.eroare, regim: { cod: "NECUNOSCUT", pctSus: null, pctJos: null }, lat: d.Latime.latimea([], P), monede: [] }); return st; }
    st.univers = u.univers; st.la_univers = acum;
  }
  const refaSerii = acum - la("serii") >= RITM.serii; if (refaSerii) st.la_serii = acum;
  const prem = await d.binance(FAPI + "/fapi/v1/premiumIndex"), fr = new Map(Array.isArray(prem) ? prem.map((x) => [x.symbol, +x.lastFundingRate]) : []);
  const randuri = await inParalel(st.univers, P.paralel, async ({ sym }) => {
    if (refaSerii || !serii.has(sym)) await seriile(d, sym);
    const b4 = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${sym}&interval=4h&limit=${P.pctlBare}`), b1d = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${sym}&interval=1d&limit=30`);
    if (!Array.isArray(b4) || !Array.isArray(b1d)) return null;
    const s = serii.get(sym) || {};
    return d.Latime.masuraMoneda({ sym, pret: +b4[b4.length - 1][4], b4: b4.map(bara), b1d: b1d.map(bara), frAcum: fr.has(sym) ? fr.get(sym) : null, fundIst: s.fundIst, oiSerie: s.oiSerie, mari: s.mari, mici: s.mici, taker: s.taker }, P);
  });
  const lat = d.Latime.latimea(randuri, P), regim = d.Latime.regimPietei(lat), monede = randuri.filter(Boolean);
  const corp = { la: acum, n: st.univers.length, lipsa: lat.lipsa, incomplet: lat.lipsa > 0.2 * st.univers.length, eroare: null, regim, lat, monede };
  await d.trimite("/api/istoric-bot?action=latime", corp);
  st.ultima = { la: acum, n: corp.n, lipsa: corp.lipsa, cod: regim.cod };
  d.jurnal("latime: " + regim.cod + " · " + lat.sus + " sus · " + lat.jos + " jos · lipsă " + lat.lipsa + (refaSerii ? " · seriile refăcute" : ""));
  return st;
}
