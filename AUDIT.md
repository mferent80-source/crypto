# v44 · BINANCE FALLBACK · SEVERE AUDIT

## Requested behavior
- Binance becomes the stable main crypto analysis source whenever Pionex fails.
- The crypto scanner keeps **only coins from the Pionex SPOT/USDT universe**.
- The scanner no longer uses Pionex candle calls for every coin.

## Changes

### Main analysis
- If Pionex is already in cooldown, analysis switches to Binance before requesting data.
- If a Pionex analysis fails for another reason, the application switches and saves `BINANCE`, then retries the same analysis once.
- The one-retry guard prevents a fallback loop.
- Clicking a scanner or Crypto Opportunity result forces Binance for the main analysis.

### Scanner architecture
- Pionex supplies only the coin universe and 24h turnover ranking.
- FAST uses Binance 4H candles.
- DEEP uses Binance 15m / 1h / 4h / 1d candles.
- Scanner rows store:
  - `source: BINANCE`
  - `universeSource: PIONEX`
- Per-coin Pionex kline calls have been removed from the scanner.
- Binance scanner concurrency is 4.

### Strict Pionex universe
- A successful Pionex universe is persisted locally.
- During a later Pionex outage/cooldown, the saved Pionex universe is reused and clearly labeled as cached.
- If no Pionex universe has ever been saved, the scanner stops.
- It does **not** silently replace the universe with Binance-listed coins.

### Error cleanup
- Nested Pionex error prefixes are normalized so repeated `Pionex indisponibil · proxy:` strings do not multiply.

## Severe audit
- frontend-check.js: syntax PASS
- market-check.mjs: syntax PASS
- stocks-check.mjs: syntax PASS
- intel-check.mjs: syntax PASS
- history-check.mjs: syntax PASS
- monitor-proxy-check.mjs: syntax PASS
- account-check.mjs: syntax PASS
- push-check.mjs: syntax PASS
- monitor-worker-check.mjs: syntax PASS
- sw-check.js: syntax PASS
- UI parity v43→v44: PASS · lost IDs 0 · total IDs 806
- Function parity v43→v44: PASS · lost functions 0 · total named functions 462
- onclick handlers resolved: PASS (81 refs)
- Primary Pionex → Binance automatic fallback wiring: PASS
- Pionex scanner rows use Binance candles while retaining Pionex-universe attribution: PASS
- Scanner no longer consumes Pionex per-coin kline quota: PASS
- Persistent Pionex-only universe cache fallback: PASS
- Scanner and Opportunity selection force Binance main analysis: PASS
- PIONEX_UNIVERSE_CACHE_PASS
- Service Worker `/api/*` network-only bypass retained: PASS

## Limitation
A coin can be in the Pionex universe but have no matching `BASEUSDT` market on Binance. Such a coin is skipped by technical scanning rather than being analyzed from a different universe or fabricated mapping.
