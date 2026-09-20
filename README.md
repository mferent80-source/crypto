# Crypto Radar Pro · Multi-Market

**Current release: v54 · FULL HARDENING · AUDITED**

Crypto Radar is a research/paper-trading PWA for crypto and U.S. stocks. The stable crypto technical path keeps direct browser-side Binance spot data; Pionex is used for its spot universe/native optional paths, while paid or account-backed integrations stay behind authenticated Cloudflare Pages Functions.

The application does **not** place real-money orders. Master Verdict, ML, volatility, portfolio and scanner outputs are research signals and risk diagnostics, not guaranteed probabilities of profit.

## Deploy v54

Use **`DEPLOY_V54.md`** as the authoritative deployment guide. Older deployment documents are retained under `docs/legacy/` only for historical reference.

Cloudflare Pages baseline:

- Framework preset: None
- Build command: blank / no build
- Output directory: `public`
- Repository root: blank
- Keep `functions/` at repository root

For protected API routes, configure the Cloudflare secret `APP_API_TOKEN` and enter the same value in **Settings → Protected API session** after opening the app. The browser keeps it in `sessionStorage`, not in persistent app backup data.

## Local verification

```bash
npm test
```

The v54 test gate covers syntax, API security/origin/rate-limit behavior, deterministic runtime fixtures, static hardening invariants and the 62-finding remediation matrix.

## Local development

```bash
npm run dev
```

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

## v46 · RESEARCH GOVERNANCE PRO
Adds purged expanding-window walk-forward ML, configurable embargo, moving-block bootstrap confidence intervals, coefficient stability diagnostics, a structural leakage audit and a persistent Experiment Registry with duplicate-history/parameter detection.

No new external API is required and no research result automatically rewrites the validated base engine.

## v47 · DECISION CORE
Adds a main-dashboard Master Verdict that consolidates the major engine, model, structure, flow, liquidation, context, risk and data-quality results. Also adds Regime Engine v2, TRADE/SKIP meta-labeling, context-aware Calibration v2, local model versioning, Binance aggregate-trade CVD history, observed liquidation heatmap persistence and a Ctrl/Cmd+K command palette.

The Master Verdict is a research composite and does not automatically place trades.

## v48 · LOCAL DATA & AUTO REPORTING

v48 adds an IndexedDB-based historical research archive while preserving the existing localStorage working sets. Signals, Paper trades, scanner runs, snapshots, experiments, research models, Decision Core snapshots, observed liquidations and aggregate-trade flow can now accumulate beyond the small runtime windows.

It also adds automatic Daily / Weekly / Monthly research reports, best/worst observed setup contexts, HTML/JSON report export, versioned research-bundle export with integrity checksum, archive retention controls and storage-health diagnostics.

No new provider or API key is required.

## v49 · STRESS & PORTFOLIO V3

Adds rolling 20D/60D/120D portfolio VaR/CVaR, historical Expected Shortfall 97.5%, dynamic-correlation and diversification-decay diagnostics, correlation-cluster transition monitoring, inverse-volatility sizing, rolling Component VaR contribution history, internal common-factor beta/high-vol sensitivity and an eight-scenario stress suite.

Stress and Portfolio v3 state are incorporated into Master Verdict and Paper-only adaptive risk sizing. v49 uses the existing data paths and adds no new API dependency.

## v50 · ML ENSEMBLE V2

v50 upgrades meta-labeling with three local model forms: L2/ridge-style logistic, Elastic-Net logistic and lightweight boosted stumps.

The equal-weight ensemble receives a usable state only when every component and the ensemble itself pass chronological OOS gates. Current probability is shrunk toward 50% when the component models disagree, and disagreement above the configured ceiling forces SKIP.

The model is versioned locally with a dataset fingerprint. A changed research dataset marks the saved ensemble `STALE DATASET` until it is deliberately retrained.

v50 also fixes the pre-existing `modelEval()` Brier-baseline label bug used by several research-model paths.

No new provider or API key is required.


## v51 · EXTERNAL INTELLIGENCE

Implements the first five remaining external-data intelligence modules:

1. Trading Economics economic calendar with a high-impact event blackout gate.
2. Coin Metrics Community network metrics plus optional Whale Alert attributed exchange/whale flows.
3. CoinGlass provider-model predictive liquidation heatmap.
4. Deribit public options intelligence: OI PCR, ATM IV term structure, wing-skew proxy, max-pain proxy and strike concentration.
5. CoinGlass historical Spot taker buy/sell CVD with 1d/7d/30d coverage validation.

The five modules are integrated into the main Master Verdict and archived in IndexedDB / Research Bundle v51.

New optional server secrets:
- `TRADING_ECONOMICS_API_KEY`
- `WHALE_ALERT_API_KEY`
- `COINGLASS_API_KEY`

Coin Metrics Community and Deribit public market data require no new key in this implementation.

Paid provider failures are isolated from the base engine and scanner.


## v52 · VERDICT CENTER PRO

The Dashboard Master Verdict now includes a full Verdict Center with 51 decision-relevant module rows.

Every current module is exposed as Bullish, Bearish, Neutral or Blocker/Warning. The UI calculates directional agreement with the base signal, module coverage, weighted module consensus, weighted conviction and family-level summaries for Technical, Models, Flow, Context and Risk/Execution.

The center also provides a full module table with current value and interpretation. Module-count agreement is explicitly descriptive and is not presented as a probability of profit because many modules share underlying market data.

Verdict Center summaries are archived in IndexedDB and included in v52 research reporting/bundles.

No new provider or API key is required by v52 itself.


## v53 · VOLATILITY INTELLIGENCE PRO

Adds a dedicated volatility dashboard with annualized realized volatility, a 10/20/60/120-bar volatility cone, ATR and Bollinger-width percentiles, Parkinson/Garman-Klass estimators, volatility-of-volatility, downside/upside semivolatility, volatility clustering, empirical 2σ/3σ shock counts, expected-move ranges, multi-timeframe volatility regimes and compression/expansion breakout alerts.

For supported crypto options, the existing Deribit public data is reused for ATM implied volatility, IV/RV ratio, IV term slope and realized-vs-implied expected moves.

Volatility remains direction-neutral. v53 uses it mainly for risk context and Paper-only adaptive sizing.

No new API key is required.

## v54 · FULL HARDENING

v54 is the remediation release for the severe v53 audit. It fixes or closes the implementation path for all 62 findings: **51 FIXED, 11 MITIGATED, 0 OPEN**.

Major changes include API authentication/rate limiting, tenant-isolated D1 history, symbol/source/market state isolation, MTF coverage gating, chronological historical CVD, seven-day liquidation retention, stock split guards, exact outcome purging for research ML, archive-backed datasets, conservative same-candle backtests, maturity-matched IV/RV, opt-in experimental volatility sizing, full IndexedDB backup with SHA-256, CSP/security headers, a split frontend (`index.html` + `app.js` + `app.css`), research Web Worker offload, privacy session mode, reference-data aging, Engine Contract 54.1 and a reproducible npm audit/test harness.

The remaining 11 mitigated items are explicitly bounded methodological or architectural risks rather than open defects; see `AUDIT.md` and `AUDIT_V54_FINDINGS.json`.

