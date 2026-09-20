# v45 · SCANNER RECOVERY · SEVERE AUDIT

## Exact failure found in v44

v44 correctly moved per-coin scanner candles to Binance, but `scan()` still had to call `pionexTop100()` first.

`pionexTop100()` had only two valid sources:
1. live Pionex metadata/tickers;
2. a Pionex universe previously saved in localStorage.

On a fresh deployment/browser, or on a device that had never completed a successful v44 Pionex universe refresh, no saved universe existed. If Pionex was already in `upstream cooldown 75s`, the scanner stopped **before any Binance candle scan started**.

That is the scanner failure corrected in v45.

## v45 recovery architecture

### 1. Strict Pionex universe is retained
The scanner still does **not** switch to a generic Binance universe.

Universe priority:
1. in-memory Pionex universe;
2. live Pionex SPOT/USDT universe;
3. saved Pionex universe from v45;
4. saved Pionex universe migrated from v44;
5. bundled verified Pionex/USDT crypto-core snapshot.

Every fallback row remains marked as a Pionex-universe row.

### 2. Embedded Pionex fallback core
- 41 crypto USDT markets are bundled as a last-resort Pionex universe.
- Stablecoin bases are excluded.
- This exists so a Pionex REST cooldown cannot make the scanner completely unusable.
- The UI explicitly labels this state as `PIONEX SNAPSHOT`, not live Pionex.

### 3. Binance remains the technical data engine
FAST:
- Pionex coin universe.
- Binance 4H candles.
- Binance-derived approximate 24h turnover and change from the latest six 4H candles.

DEEP:
- Pionex coin universe.
- Binance 15m / 1h / 4h / 1d candles.
- 24h turnover/change derived from Binance 4H candles.

No Pionex per-coin kline calls are used by the scanner.

### 4. Pionex cooldown no longer blocks scanner start
If a Pionex cooldown is already active:
- v45 does not wait for the cooldown;
- it immediately uses saved Pionex universe data if available;
- otherwise it immediately uses the bundled Pionex snapshot;
- Binance technical scanning starts at once.

### 5. Transparent scanner status
New scanner line shows:
- `PIONEX LIVE`
- `PIONEX SAVED`
- or `PIONEX SNAPSHOT 2026-09-20`

The status note explains that Binance supplies technical candles.

### 6. Main analysis behavior retained
The v44 main-analysis behavior remains:
- failed Pionex primary analysis automatically switches to Binance;
- the same symbol/timeframe retries once through Binance;
- scanner and Opportunity selections force Binance for main crypto analysis.

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
- UI parity v44→v45: PASS · lost IDs 0 · total IDs 809
- Function parity v44→v45: PASS · lost functions 0 · total named functions 465
- onclick handlers resolved: PASS
- Pionex cooldown → saved/static Pionex universe recovery: PASS
- Pionex universe → Binance candle engine: PASS
- Binance-derived 24h turnover/change for fallback rows: PASS
- v44 saved universe migration into v45: PASS
- V45_SCANNER_END_TO_END_PASS · 41 fallback Pionex coins processed
- Service Worker `/api/*` network-only bypass retained: PASS
- v44 Binance main-analysis fallback retained: PASS

## End-to-end synthetic scanner test
The audit forced:
- active Pionex cooldown,
- no live Pionex response,
- no saved Pionex universe,
- synthetic Binance candle availability.

Result:
- bundled Pionex fallback universe loaded;
- 41/41 fallback rows passed through the scanner;
- every result used `source=BINANCE`;
- every result retained Pionex universe attribution;
- scan completed without touching Pionex per-coin candle endpoints.

## Limitation
A Pionex fallback coin with no corresponding Binance `BASEUSDT` market is skipped individually. The scanner does not invent a mapping or replace it with a non-Pionex coin.
