# Crypto Radar Web App

Aplicație mobilă cu frontend static și proxy server-side pentru datele Binance.

## Deploy Cloudflare Pages
1. Pune acest folder într-un repository GitHub.
2. În Cloudflare: Workers & Pages → Create → Pages → Import existing Git repository.
3. Build command: `exit 0`
4. Build output directory: `public`
5. Deploy.

Folderul `functions/` trebuie să rămână în rădăcina repository-ului. Endpoint-ul `/api/market` rulează server-side, deci telefonul nu mai apelează direct Binance.

## Local
`npx wrangler pages dev public`

Nu este un sistem de predicție garantată. Procentele istorice sunt frecvențe ale configurațiilor similare din eșantionul analizat.


## v21 · ULTIMATE TERMINAL
Adds WebSocket live ticker, Volume Profile, Anchored VWAP, Risk Manager, order-book depth, market context, signal explanation/lifecycle, PWA support and health diagnostics.


## v22 · PRO DESK
Adds Decision Center, correlation/relative-strength analytics, volatility/squeeze engine, liquidation-risk proxy and paper portfolio.


## v23 · RESEARCH LAB
Adds strategy analytics, confidence calibration, Monte Carlo, scenario analysis, backup/restore and data freshness.


## v25 · FORWARD EDGE
Adds forward-only cohorts, risk guard, shrunk segment reliability, rolling 3-fold OOS, evidence-quality checks and configurable entry expiry.


## v26 · PIONEX TOP100
Scanner now dynamically uses only the Top 100 enabled Pionex SPOT/USDT markets ranked by Pionex 24h turnover, with FAST 4H and DEEP MTF modes.


## v27 · PERFORMANCE CORE
Optimizes network traffic, Pionex Top 100 scanning, cache/de-duplication, cancellation, WebSocket resilience, mobile navigation and diagnostics.


## v28 · ORDER FLOW & REGIME
Adds CVD/Delta proxy, TTM/Keltner, CHOP, Efficiency Ratio, Hurst, advanced volatility, calendar VWAP bands, liquidity/FVG lifecycle, Regime Fusion and OI/funding history matrix.


## v29 · MICROSTRUCTURE TAPE
Adds Pionex public recent trades, reported-side trade delta, recent Micro-CVD, order-book imbalance/microprice/walls, slippage estimates, tape view and advisory microstructure pressure.


## v30 · PIONEX NATIVE ENGINE
Adds a provider-consistent main engine. Pionex is now the default primary spot source for analysis, ticker, MTF, correlation, backtest and OOS, with Binance available as an explicit alternate source. Signal validation is isolated by source.


## v31 · FULL PWA
Turns Crypto Radar into a complete installable PWA with icons, standalone mode, install prompt, offline shell, update flow, deep links and PWA health diagnostics.


## v32 · RESILIENCE HOTFIX
Fixes the raw HTTP 502 failure path. Binance direct-data is the stable default for the main engine; Pionex remains explicit and the Top 100 scanner stays Pionex-only. Pionex proxy failures now expose diagnostic detail without crashing the main analysis.


## v33 · PIONEX RATE SAFE
Adds client/server Pionex throttling, edge response caching and automatic 429 cooldown. The scanner stays Pionex-only but intentionally trades speed for reliability under Pionex's IP-based request limit.

## v34 · OPPORTUNITY SUITE
Adds Opportunity Top 10 ranking, Daily Trading Desk, capital-aware paper account, empirical signal calibration, microstructure validation, server-side Pionex read-only account access and PWA PushSubscription infrastructure.

## v35 · MULTI-MARKET ENGINE
Adds a CRYPTO / US STOCKS market switch, Twelve Data server-side stock provider, Nasdaq-100 research scanner, QQQ/SPY/IWM context, U.S. session/gap/RVOL/relative-strength analytics, optional earnings risk, and source-isolated stock integration across the existing quant, Opportunity, Backtest, Validation and Paper Trading modules.

US Stocks require the Cloudflare secret `TWELVE_DATA_API_KEY`. Crypto remains usable without it.

## v36 · ROBUSTNESS & PORTFOLIO
Adds embargoed parameter perturbation, hierarchical reliability, strategy promotion/retirement gates, block-bootstrap Monte Carlo, cost-aware scenarios, portfolio correlation/VaR/CVaR, adaptive paper sizing and daily/weekly/drawdown circuit breakers. All controls remain research/paper-only.

## v37 · CLOUD MONITOR & PROFILE
Adds an optional D1 historical research database, a separately deployable 15-minute Cloudflare scheduled monitor, real Web Push encryption/VAPID sender, server-lite opportunity history, manual monitor proxy, advanced OHLCV Market Profile/TPO proxies, repeated-liquidity clusters, Fibonacci confluence and a Pionex recent trade-by-price footprint.

The scheduled monitor is intentionally a separate Worker and is not activated merely by deploying the Pages app.

## v39 · INTELLIGENCE LAYER
Adds server-side cross-asset/crypto-global context, BTC mempool/hashrate/difficulty pulse, GDELT/Twelve Data event radar, a public Binance futures liquidation tape, and a chronological logistic-regression shadow model with OOS AUC/Brier/Brier-skill diagnostics, Wilson intervals and an advisory research probability lens.

All context and ML layers remain non-executing and do not automatically rewrite the base signal engine.

## v40 · MODEL GOVERNANCE
Adds a governed research ensemble, regime-specific shadow models, monotonic PAV confidence calibration, ECE/MCE/Brier diagnostics, PSI feature drift monitoring, performance drift checks and a transparent current-decision waterfall.

v40 introduces no new API dependency and keeps the validated base engine frozen.

## v41 · EXECUTION REALISM
Fixes the PWA `/api/*` caching path, introduces backup schema v41, and replaces instant paper entry assumptions with a stateful execution simulator: pending/partial/filled entries, deterministic liquidity-aware partial fills, entry expiry, adverse market slippage, gap-through-stop execution, intrabar ambiguity policy, reserved pending exposure and a full execution-event ledger.

No new API dependency is introduced.

## v42 · PORTFOLIO INTELLIGENCE
Adds aligned multi-asset portfolio returns, covariance-based Marginal/Component VaR, correlation clusters, hedge-pair detection, paper risk budgets by market/regime/cluster, candidate incremental VaR/CVaR before a new Paper position, portfolio-aware adaptive sizing and feature-similarity Strategy Families.

v42 introduces no new API dependency and retains the v41 realistic execution simulator.

## v43 · PIONEX RESILIENCE
Hotfix for Pionex HTTP 429 pressure: weighted pacing, escalating backoff, backend isolate cooldown, longer success caches, scanner pause/resume with partial-result preservation, and suppression of background Pionex REST polling while a scanner run is active.

## v44 · BINANCE FALLBACK
Automatic Pionex-to-Binance fallback for primary crypto analysis. The scanner remains a strict Pionex SPOT/USDT coin universe while all per-coin scanner candles use the known-good direct Binance path. The last successful Pionex universe is cached locally for temporary Pionex outages.

## v45 · SCANNER RECOVERY
Fixes the remaining v44 scanner dependency on a live or previously cached Pionex universe. During Pionex cooldown, the scanner now immediately uses a saved Pionex universe or an embedded Pionex USDT crypto-core snapshot, while all technical candle analysis stays on Binance. Scanner state explicitly reports LIVE / SAVED / SNAPSHOT universe provenance.
