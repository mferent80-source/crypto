// v100.331 (12.11.2026, el: „3 … fă tot”): lărgimea crypto de pe Piața azi, socotită o dată la 30 de minute de colector (scripts/lib/tura-largime-crypto.mjs),
// nu la fiecare deschidere din fiecare telefon (32 de cereri la Binance). Formulele sunt CELE ALE PAGINII, copiate întocmai din app.js
// (ema, RSI, volBara, v64BreadthRow, v64AggregateBreadth), iar universul = pionexTop100 (Pionex SPOT/USDT după volum, fără stabile și fără
// levier, doar crypto, primele 24). Paritatea pe 40 de serii: scripts/proba-v100331-largime.mjs. Agregarea de aici NU întoarce rândurile monedelor.
var LargimeCrypto = (function () {
  "use strict";
  const STABILE = new Set(["USDT", "USDC", "FDUSD", "TUSD", "USDP", "DAI", "USDE", "PYUSD"]);   // = PIONEX_STABLE_BASES
  function levier(base) { return /(3L|3S|5L|5S|BULL|BEAR)$/i.test(base || ""); }   // = pionexLeveragedBase
  function ema(a, n) { let k = 2 / (n + 1), v = a[0], o = []; for (const x of a) { v = x * k + v * (1 - k); o.push(v); } return o; }
  function RSI(a, n = 14) { let g = 0, l = 0, o = Array(a.length).fill(50); for (let i = 1; i < a.length; i++) { let d = a[i] - a[i - 1], u = Math.max(d, 0), dn = Math.max(-d, 0); if (i <= n) { g += u; l += dn; if (i === n) { g /= n; l /= n; } } else { g = (g * (n - 1) + u) / n; l = (l * (n - 1) + dn) / n; if (i >= n) o[i] = l ? 100 - 100 / (1 + g / l) : 100; } } return o; }
  function volBara(x) { const v = x && x[5]; if (v == null || v === "") return null; const n = +v; return Number.isFinite(n) ? n : null; }
  // = v64BreadthRow
  function rand(symbol, rows) {
    const j = [...(rows || [])].sort((a, b) => +a[0] - +b[0]); if (j.length < 55) return null;
    const c = j.map((x) => +x[4]), n = c.length, last = c.at(-1), prev = c.at(-2), e20 = ema(c, 20).at(-1), e50 = ema(c, 50).at(-1), e200 = j.length >= 200 ? ema(c, 200).at(-1) : NaN, rsi = RSI(c, 14).at(-1),
      look = j.slice(-21, -1), priorHigh = Math.max(...look.map((x) => +x[2])), priorLow = Math.min(...look.map((x) => +x[3])), adv = last > prev, ret = prev ? last / prev - 1 : 0, vol = volBara(j.at(-1));
    void n;
    return { symbol, advance: adv, ret, volume: vol, advVolume: vol === null ? null : adv ? vol : 0, decVolume: vol === null ? null : adv ? 0 : vol, above20: last > e20, above50: last > e50, above200: Number.isFinite(e200) ? last > e200 : null,
      rsiAbove50: Number.isFinite(rsi) ? rsi > 50 : null, newHigh: last > priorHigh, newLow: last < priorLow, last, prev };
  }
  // = v64AggregateBreadth, fără `rows` în rezultat și cu market / source din meta (pagina le lua din assetClass / analysisSource)
  function agrega(rows, meta = {}) {
    const a = (rows || []).filter(Boolean), n = a.length, total = Math.max(n, +meta.total || n);
    if (!n) return { ts: Date.now(), state: "UNAVAILABLE", score: NaN, n: 0, total, coverage: 0, ...meta };
    const pct = (fn) => 100 * a.filter(fn).length / n, participation = pct((x) => x.advance), above20 = pct((x) => x.above20), above50 = pct((x) => x.above50), a200 = a.filter((x) => x.above200 !== null),
      above200 = a200.length ? 100 * a200.filter((x) => x.above200).length / a200.length : NaN, momRows = a.filter((x) => x.rsiAbove50 !== null), momentum = momRows.length ? 100 * momRows.filter((x) => x.rsiAbove50).length / momRows.length : NaN,
      cuVol = a.filter((x) => x.volume != null), volTotal = cuVol.reduce((z, x) => z + x.volume, 0), volume = volTotal ? 100 * cuVol.reduce((z, x) => z + x.advVolume, 0) / volTotal : 50,
      highs = a.filter((x) => x.newHigh).length, lows = a.filter((x) => x.newLow).length, highLow = highs + lows ? 50 + 50 * (highs - lows) / (highs + lows) : 50,
      trendVals = [above20, above50, above200].filter(Number.isFinite), trend = trendVals.length ? trendVals.reduce((x, y) => x + y, 0) / trendVals.length : 50,
      score = Math.max(0, Math.min(100, .20 * participation + .30 * trend + .20 * momentum + .18 * volume + .12 * highLow)), state = score >= 65 ? "BULLISH" : score <= 35 ? "BEARISH" : "NEUTRAL",
      coverage = 100 * n / Math.max(1, total), bench = +meta.benchmarkReturn || 0, divergence = bench >= 3 && score < 45 ? "BEARISH DIVERGENCE" : bench <= -3 && score > 55 ? "BULLISH DIVERGENCE" : "NONE",
      nonBench = a.filter((x) => !["BTC", "BTCUSDT", "QQQ"].includes(String(x.symbol).toUpperCase())), altParticipation = nonBench.length ? 100 * nonBench.filter((x) => x.advance).length / nonBench.length : participation;
    return { ts: Date.now(), state, score, participation, trend, above20, above50, above200, momentum, volume, highs, lows, highLow, divergence, coverage, n, total, altParticipation, benchmarkReturn: bench,
      depth: meta.depth || "FAST", market: meta.market || "CRYPTO", source: meta.source || "BINANCE", universe: meta.universe || "REPRESENTATIVE" };
  }
  // = pionexTop100 (ramura vie) + filtrul eCrypto din refreshMarketBreadthV64 ⇒ primele N baze
  function univers(symbols, tickers, eCrypto, N) {
    const tm = new Map((tickers || []).map((x) => [x.symbol, x]));
    const rows = (symbols || []).filter((x) => { const base = (x.baseCurrency || "").toUpperCase(), quote = (x.quoteCurrency || "").toUpperCase(); return x.type === "SPOT" && quote === "USDT" && x.enable !== false && !STABILE.has(base) && !levier(base) && tm.has(x.symbol); })
      .map((x) => { const t = tm.get(x.symbol) || {}, turnover = Number(t.amount || 0), close = Number(t.close || 0); return { base: x.baseCurrency.toUpperCase(), turnover, close }; })
      .filter((x) => x.turnover > 0 && x.close > 0).sort((a, b) => b.turnover - a.turnover).slice(0, 100);
    return rows.filter((x) => typeof eCrypto !== "function" || eCrypto(x.base)).slice(0, N || 24).map((x) => x.base);
  }
  return { STABILE: STABILE, levier: levier, ema: ema, RSI: RSI, volBara: volBara, rand: rand, agrega: agrega, univers: univers };
})();
if (typeof globalThis !== "undefined") globalThis.LargimeCrypto = LargimeCrypto;
