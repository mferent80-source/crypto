// v100.320 (el, 11.11.2026: „vreau Technicals și Technical Ratings din TradingView, cele 2 scripturi pe care le folosesc și eu, în pagina
// botului și în pagina Trade 212”). Amândouă sunt ACELAȘI motor TradingView (help center 43000614331; scriptul oficial Jdw7wW2g dă, la
// setările implicite, aceleași cifre ca vitezometrele „Technicals”): 15 medii + 11 oscilatoare votează +1 / 0 / −1, grupul = media voturilor,
// nota = media celor două grupuri. Cifrele se iau de la scannerul public TradingView (aceleași ca pe graficul lui; probat 11.11 pe 8 monede ×
// 4 intervale: calculul nostru după regulile oficiale dă medii 32/32, oscilatoare 30/32 la fel). Doar funcții pure aici - ruta e în api/market.js.

// intervalele scannerului: sufixul coloanei („” = 1 zi) și numele arătat
export const TV_INTERVALE = [["5", "5m"], ["15", "15m"], ["60", "1h"], ["240", "4h"], ["", "1D"], ["1W", "1W"]];
const GRUPE = ["Recommend.All", "Recommend.MA", "Recommend.Other"];
export function tvColoane() { const o = ["name", "exchange", "close"];   /* v100.339: + prețul, ca pagina să vadă că e instrumentul botului */ for (const [s] of TV_INTERVALE) for (const g of GRUPE) o.push(s ? g + "|" + s : g); return o; }

// v100.339 (I-869, auditul din 13.11): TradingView ARE Pionex (PIONEX:HYPEUSDT.P verificat pe scanner în 13.11) ⇒ întâi instrumentul botului,
// apoi contractul Binance. La Binance unele monede se tranzacționează „în mii” (1000PEPEUSDT): fără hartă, PEPE / SHIB / BONK / FLOKI
// rămâneau fără notă („TradingView n-are simbolul”). scara = de câte ori e mai mare prețul contractului decât al monedei.
export const IN_MII = { PEPE: "1000PEPE", SHIB: "1000SHIB", BONK: "1000BONK", FLOKI: "1000FLOKI", LUNC: "1000LUNC", XEC: "1000XEC", SATS: "1000SATS", RATS: "1000RATS", CAT: "1000CAT", CHEEMS: "1000CHEEMS", WHY: "1000WHY", MOG: "1000000MOG", BABYDOGE: "1MBABYDOGE" };
const scaraDin = (b) => (/^(1000000|1M)/.test(b) ? 1000000 : /^1000/.test(b) ? 1000 : 1);
// candidații în ordine: [{ ticker, scara }]; simbol nerecunoscut ⇒ [] (pagina spune „nu știu ce simbol îi corespunde”)
export function tvLantPionex(s) {
  const m = /^([A-Z0-9]{1,20})_(USDT|USDC)(_PERP)?$/.exec(String(s || "").toUpperCase()); if (!m) return [];
  const suf = m[3] ? ".P" : "", bz = m[3] && IN_MII[m[1]] ? IN_MII[m[1]] : m[1];
  return [{ ticker: "PIONEX:" + m[1] + m[2] + suf, scara: 1 }, { ticker: "BINANCE:" + bz + m[2] + suf, scara: bz === m[1] ? 1 : scaraDin(bz) }];
}
// contractul Binance al simbolului Pionex (ultimul din lanț); păstrat pentru cine vrea un singur simbol
export function tvDinPionex(s) { const l = tvLantPionex(s); return l.length ? l[l.length - 1].ticker : null; }

// simbolul de bursă (Yahoo, din functions/_shared/simboluri.js) ⇒ TradingView. Acțiunile americane n-au bursa în simbol: se caută după nume
// (pe NASDAQ / NYSE / AMEX); restul au bursa în sufix. Necunoscut ⇒ null (rândul arată „—”, nu o notă de la altă firmă).
const BURSE = { ".L": "LSE", ".DE": "XETR", ".PA": "EURONEXT", ".AS": "EURONEXT", ".SW": "SIX", ".MI": "MIL", ".VI": "VIE", ".TO": "TSX" };
export function tvDinYahoo(y) {
  const s = String(y || "").toUpperCase();
  if (/^[A-Z][A-Z0-9-]{0,9}$/.test(s)) return { us: s.replace(/-/g, ".") };   // BRK-B (Yahoo) = BRK.B (TradingView)
  const m = /^([A-Z0-9][A-Z0-9-]{0,11})(\.[A-Z]{1,2})$/.exec(s);
  if (!m || !BURSE[m[2]]) return null;
  const t = BURSE[m[2]] + ":" + m[1].replace(/-/g, ".");
  /* v100.340: la LSE simbolul de două litere se scrie cu punct la coadă (LSE:BP., LSE:RR.) - verificat pe scannerul public, 14.11.2026;
     se cere întâi cu punct, apoi fără (lanț, ca la Pionex → Binance), ca o excepție să nu rămână fără notă */
  return m[2] === ".L" && /^[A-Z0-9]{2}$/.test(m[1]) ? { tickere: [{ ticker: t + ".", scara: 1 }, { ticker: t, scara: 1 }] } : { ticker: t };
}

// cererile către scanner (cel mult două): „global” cu tickere întregi, „america” după nume. tinte: [{cheie, tickere: [{ticker, scara}]} | {cheie, ticker} | {cheie, us}]
export function tvCereri(tinte) {
  const col = tvColoane(), tick = [...new Set(tinte.flatMap((t) => (Array.isArray(t.tickere) ? t.tickere.map((x) => x.ticker) : t.ticker ? [t.ticker] : [])))], us = [...new Set(tinte.filter((t) => t.us).map((t) => t.us))], o = [];
  if (tick.length) o.push({ piata: "global", corp: { symbols: { tickers: tick, query: { types: [] } }, columns: col } });
  if (us.length) o.push({ piata: "america", corp: { filter: [{ left: "name", operation: "in_range", right: us }, { left: "exchange", operation: "in_range", right: ["NASDAQ", "NYSE", "AMEX"] }], columns: col, range: [0, Math.min(100, us.length * 3)] } });
  return o;
}

// un rând al scannerului ⇒ { tv, iv: { "5m": {all, ma, osc}, … } }; valorile lipsă rămân null (nu 0 - 0 ar însemna „neutru”)
export function tvRand(d) {
  if (!d || !Array.isArray(d.d)) return null;
  const v = d.d, iv = {}; let k = 3, vreuna = false;   /* v100.339: coloana 2 = prețul */
  const close = typeof v[2] === "number" && Number.isFinite(v[2]) && v[2] > 0 ? v[2] : null;
  const n = (x) => (typeof x === "number" && Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : null);
  for (const [, nume] of TV_INTERVALE) { const all = n(v[k]), ma = n(v[k + 1]), osc = n(v[k + 2]); k += 3; if (all !== null) vreuna = true; iv[nume] = { all, ma, osc }; }
  return vreuna ? { tv: String(d.s || ""), close, iv } : null;
}

// răspunsurile scannerului ⇒ notele pe cheia cerută (simbolul Pionex / Yahoo); la US, primul rând cu numele lui (NASDAQ / NYSE înaintea AMEX)
export function tvPotriveste(tinte, raspunsuri) {
  const peTicker = {}, peNume = {}, rang = { NASDAQ: 0, NYSE: 1, AMEX: 2 };
  for (const j of raspunsuri) for (const d of (j && j.data) || []) {
    const r = tvRand(d); if (!r) continue; peTicker[r.tv] = r;
    const nume = Array.isArray(d.d) ? String(d.d[0] || "") : "", bursa = Array.isArray(d.d) ? String(d.d[1] || "") : "";
    if (nume && (peNume[nume] === undefined || (rang[bursa] ?? 9) < (rang[peNume[nume].bursa] ?? 9))) peNume[nume] = { bursa, r };
  }
  const o = {};
  // v100.339: lipsa își spune motivul (înainte: null ⇒ „TradingView n-are simbolul ăsta” pentru orice) - nemapat (nu știu ce simbol îi
  // corespunde) / negasit (căutat și inexistent, cu ce s-a căutat); din lanț se ia primul candidat găsit, cu scara lui
  for (const t of tinte) {
    if (Array.isArray(t.tickere)) {
      const g = t.tickere.find((x) => peTicker[x.ticker]);
      o[t.cheie] = !t.tickere.length ? { lipsa: "nemapat" } : g ? Object.assign({}, peTicker[g.ticker], { scara: g.scara }) : { lipsa: "negasit", cautat: t.tickere.map((x) => x.ticker) };
    } else o[t.cheie] = t.ticker ? peTicker[t.ticker] || { lipsa: "negasit", cautat: [t.ticker] } : t.us ? (peNume[t.us] && peNume[t.us].r) || { lipsa: "negasit", cautat: [t.us] } : { lipsa: "nemapat" };
  }
  return o;
}
