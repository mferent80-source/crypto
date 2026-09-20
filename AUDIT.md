# v20 · PRODUCT SUITE · SEVERE AUDIT

## Features added
- S/R heatmap with proximity highlighting.
- Colored support/resistance/pivot zones directly on candlestick chart.
- Order-flow style proxy panel: buy/sell pressure, volume impulse, close location, money-flow delta.
- Derivatives pressure panel: longs, shorts, OI, OI trend, funding.
- Market Overview with 12 coins and breadth summary.
- Alert Center: near S1/R1/Pivot, long/short extremes, funding extremes, OI expansion, strong signals.
- Optional browser notifications while app is open.
- Settings page with presets and alert toggles.
- Signal confidence threshold and near-level threshold are configurable.
- Performance by strategy mode.
- Journal-driven conservative auto-calibration of signal threshold.
- Existing quant engine, signal lab, scanner, futures, backtest and watchlist retained.

## Severe audit results
- frontend-check.js: syntax PASS
- backend-check.mjs: syntax PASS
- HTML IDs unique: PASS (186 ids)
- Required v20 DOM: PASS
- onclick handlers resolved: PASS (22 funcs)
- Known regression patterns: PASS
- Direct spot-data architecture: PASS
- CORE_RUNTIME_PASS
- Full-script bootstrap with DOM stubs: PASS
- Product-suite functions: PASS
- Cloudflare package structure: PASS

## Limitations deliberately preserved
- “Order flow” is a candle/volume/money-flow proxy, not raw exchange bid/ask footprint or Level-2 tape.
- Futures endpoints are optional and may be unavailable because of exchange/network restrictions; spot analysis remains isolated.
- Browser notifications are not background push notifications when the page is closed.
- Auto-calibration only adjusts the confidence threshold conservatively and requires at least 15 resolved journal signals; it does not self-optimize indicator weights, which reduces overfitting risk.
- Backtests/journal results exclude commissions, slippage and actual fill quality.
