# v69 · LIVE PERFORMANCE & CAPITAL SCALING PRO · Deployment

Deploy with the same Cloudflare Pages configuration and v68 secrets/bindings. Run `npm test` first.

## Recommended rollout

1. Start from the v68 deployment with `LIVE_TRADING_ENABLED=0`.
2. Run all v68 post-deploy checks.
3. Use tiny `LIVE_MAX_ORDER_USDT` and daily limits.
4. Enable live only after Live Readiness and Operations are healthy.
5. Keep the user capital stage at `0%` initially.
6. Complete and reconcile app-created LIVE round trips. A controlled close requires typing `CLOSE LIVE` and can only close a BUY previously created by the application.
7. Press **Sync LIVE performance** to reconcile exchange order fields.
8. Review expectancy, PF, drawdown and the six-layer comparison.
9. Increase the user stage only with **Accept recommended increase**. Evidence deterioration can automatically lower the effective stage even when a higher stage was previously approved.

## Exit behavior

A risk-reducing controlled close is not blocked by entry notional/daily-turnover caps. It still requires application authentication, same-origin request, explicit confirmation and an app-owned filled BUY order. Generic naked SELL entry remains unavailable.

## Fee handling

If Pionex reports a USDT-denominated fee, v69 uses it directly. If the fee coin cannot be converted reliably from the returned order fields, v69 uses the configured fee-bps fallback and marks fee coverage as conservative rather than assuming zero cost.
