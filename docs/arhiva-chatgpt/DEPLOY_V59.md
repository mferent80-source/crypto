# v59 · PAPER TRADING v3 · EXECUTION REALISM PRO · Deployment

This is the authoritative deployment guide for v59. Older deployment guides under `docs/legacy/` are historical only.

## 1. Cloudflare Pages

Deploy with:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**

Keep `functions/` at repository root. The PWA cache is `crypto-radar-v59`; `/api/*` remains network-only in the Service Worker.

## 2. Security and provider configuration

v59 inherits the v54 hardening model. Configure `APP_API_TOKEN` for protected Pages APIs. Optional provider credentials remain server-side only:

- `TWELVE_DATA_API_KEY`
- `TRADING_ECONOMICS_API_KEY`
- `WHALE_ALERT_API_KEY`
- `COINGLASS_API_KEY`
- `COINGECKO_API_KEY`
- read-only `PIONEX_API_KEY` + `PIONEX_API_SECRET`, if used

Recommended bindings remain `API_RATE_LIMIT`, `DB`, `PUSH_SUBSCRIPTIONS` and the monitor-worker bindings described by the hardened deployment model. Do not put provider or account secrets in `public/`, source-controlled frontend code or browser storage.

## 3. Paper Trading v3 behavior

Paper v3 is **simulation only**. It does not expose a live order-placement API.

The simulator supports:

- 1–3 limit entry layers;
- partial fills and entry expiry;
- configurable TP1/TP2 scale-outs and TP3 remainder;
- OCO-style stop/target lifecycle;
- break-even trigger in R;
- ATR trailing stop;
- ATR volatility stop;
- bar-count time stop;
- gap-through exits;
- fee/slippage model;
- MFE/MAE and execution-event logging;
- manual BE, 25% scale-out, cancel ladder, close and flatten-all controls.

The model is OHLCV-based. Real queue priority and exact intrabar path are not known. `CONSERVATIVE` fill mode resolves a stop+target touch in the same candle stop-first; `BALANCED` remains an explicit heuristic, not observed tick sequencing.

## 4. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final gates:

```text
V59_SYNTAX_PASS 57 executable JS/MJS surfaces + JSON manifests
V59_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V59_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V59_VERDICT_EXPLAINER_PASS ...
V59_PROFIT_READINESS_PASS ...
V59_REPLAY_RUNTIME_PASS ... future_isolated=1 outcome_changed=1
V59_PAPER_RUNTIME_PASS layers=3 partial=3.23 conservative=STOP scale=6.50 trail=105.00 time=TIME_STOP
V59_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V59_STATIC_AUDIT_PASS 46 hardening + wide-ui + verdict + readiness + replay + paper-v3 invariants
V59_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

The exact Paper runtime output prints `time=TIME STOP` with a space; the semantic state is the same.

## 5. First production validation

After deployment:

1. Confirm badge **`v59 · PAPER TRADING v3 · EXECUTION REALISM PRO · AUDITED`**.
2. Hard reload/reopen the installed PWA so `crypto-radar-v59` replaces the previous cache.
3. Run a normal BTC or Nasdaq analysis and add a Paper setup.
4. With `LIMIT` + 3 layers, confirm the blotter shows three entry layers and partial fill state when only part of the zone trades.
5. Confirm `Cancel ladder` cancels remaining entry layers without incorrectly closing an already-filled position.
6. Confirm TP1/TP2 scale-out quantities match the selected percentages and TP3 closes the remainder.
7. Confirm BE/ATR trail/volatility stop only tighten the managed stop.
8. Confirm a configured time stop closes an aged Paper position at the modeled current-bar close with modeled slippage.
9. Confirm gap-through stop events are recorded distinctly from ordinary stop touches.
10. Confirm `Flatten all` acts only on Paper orders/positions.
11. Open Local Data and verify `Paper v3 snapshots` increments.
12. Generate a research report/bundle and verify `paper_v3` evidence is included.
13. Re-run Profit Readiness after enough completed Paper outcomes; readiness must still depend on evidence gates, not merely the existence of v59.
14. Recheck protected provider APIs and the read-only Pionex account panel after production deployment.

## 6. Validation boundary

The packaged audit covers static analysis, deterministic runtime fixtures, mocked API/security gates and exact v58→v59 UI/function parity. It does **not** claim that live Cloudflare routing/bindings, provider entitlements, exchange responses, quotas or real execution conditions were validated from the build environment.
