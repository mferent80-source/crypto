# v47 · DECISION CORE · Deployment

v47 requires **no new API key or Cloudflare binding**.

Deploy it the same way as v46.

## Public data used by new modules
- Binance Spot public `aggTrades` for recent true trade-flow CVD.
- Existing Binance Futures public liquidation WebSocket for observed liquidation history.

No account credential is used by these modules.

## First test after deploy
1. Confirm badge:
   `v47 · DECISION CORE · AUDITED`
2. Hard reload / reopen the PWA so service worker `crypto-radar-v47` is active.
3. Run a normal Crypto analysis.
4. On Dashboard verify **Master Verdict · All Results** populates.
5. Open **Decision Core**.
6. Verify Regime Engine v2 and Calibration v2 populate.
7. Press **Train meta model** if enough resolved signals exist.
8. Press **Refresh aggTrades** and verify True Trade-Flow CVD.
9. Press **Start / keep live** for observed liquidations.
10. Save a research model version and test **Activate research**.
11. Use `Ctrl+K` / `Cmd+K` to test the command palette.

## Scanner
The v45 scanner architecture is unchanged:
- Pionex coin universe,
- Binance technical candles,
- Pionex LIVE / SAVED / SNAPSHOT fallback.

## Important
The liquidation heatmap is based on observed public liquidation events. It is not a predictive map of unliquidated positions.
