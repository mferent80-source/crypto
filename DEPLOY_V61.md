# v61 · ADAPTIVE GOVERNANCE & CHAMPION-CHALLENGER PRO · Deployment

This is the authoritative deployment guide for v61. v61 is built directly on the audited v60 Edge Validation & Shadow Execution Pro release.

## 1. Cloudflare Pages

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**
- Keep `functions/` at repository root.

PWA cache: `crypto-radar-v61`. `/api/*` remains network-only in the Service Worker.

## 2. Existing security/provider configuration

Keep the hardened configuration inherited from v54-v60:

- `APP_API_TOKEN` for protected Pages APIs;
- optional `API_RATE_LIMIT` KV;
- optional `DB` D1 binding;
- optional `PUSH_SUBSCRIPTIONS` KV;
- provider keys only server-side (`TWELVE_DATA_API_KEY`, `TRADING_ECONOMICS_API_KEY`, `WHALE_ALERT_API_KEY`, `COINGLASS_API_KEY`, `COINGECKO_API_KEY`);
- read-only Pionex credentials if the account panel is enabled.

v61 adds no live order-placement endpoint and no new secret.

## 3. What v61 adds

### Model / Edge Drift Monitor

The new monitor compares chronological baseline evidence with the most recent sample and combines:

- expectancy decay;
- recent profit factor;
- win-rate shift;
- rolling-window stability;
- inherited feature-distribution PSI state;
- forward-only evidence;
- completed Shadow Live evidence.

It reports `LEARNING`, `STABLE`, `WATCH`, `DRIFT`, or `SEVERE`, plus an edge-health score.

### Automatic Risk Governor

The governor is enabled by default and acts only as a **Paper sizing cap**. Its discrete caps are:

- `1.00×` NORMAL;
- `0.75×` CAUTION;
- `0.50×` REDUCED;
- `0.25×` DEFENSIVE;
- `0.00×` PAUSE.

The cap considers recent risk guard state, edge drift, model/feature drift, current Data Quality, Profit Readiness and Shadow evidence. It is multiplied by the existing Paper strategy lifecycle, circuit breaker, volatility, portfolio-correlation, budget and tail-risk controls.

The governor does **not** change LONG/SHORT direction and does not send live orders.

### Champion vs Challenger

The research-policy comparison now has an explicit champion and challenger. A challenger is sourced from eligible research experiments or the v60 multi-fold walk-forward result.

A comparison uses:

1. the last 15% of rolling historical points as a locked holdout;
2. the same modeled costs for Champion and Challenger;
3. bootstrap difference evidence on the holdout when enough trades exist;
4. post-start Forward Validation points when enough are available.

A challenger becomes `ELIGIBLE` only when it leads on the locked holdout **and** on enough forward points. Promotion changes only the stored research champion policy. It does not rewrite the base directional engine.

## 4. Required test gate

Run:

```bash
npm test
```

Expected final outputs include:

```text
V61_SYNTAX_PASS 80 executable JS/MJS surfaces + JSON manifests
V61_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V61_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V61_VERDICT_EXPLAINER_PASS ...
V61_PROFIT_READINESS_PASS ...
V61_REPLAY_RUNTIME_PASS ... future_isolated=1 outcome_changed=1
V61_PAPER_RUNTIME_PASS ... conservative=STOP ... trail=105.00 time=TIME STOP
V61_UI_PARITY_PASS ids=1280 base_ids=1257 functions=829 base_functions=812 lost_ids=0 lost_functions=0
V61_EDGE_INHERITED_PASS ...
V61_GOVERNANCE_RUNTIME_PASS stable=1 drift=.25 severe=0 quality=.50 ...
V61_STATIC_AUDIT_PASS 31 inherited hardening + adaptive-governance invariants
V61_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## 5. First production validation

1. Confirm badge **`v61 · ADAPTIVE GOVERNANCE & CHAMPION-CHALLENGER PRO · AUDITED`**.
2. Hard reload/reopen the PWA so `crypto-radar-v61` replaces the previous cache.
3. Run a normal Crypto or Nasdaq analysis and open **Edge Validation Pro**.
4. Confirm Model / Edge Drift Monitor renders a state and edge-health score.
5. Confirm Automatic Risk Governor shows a multiplier. With little evidence it should remain conservative rather than claim a proven edge.
6. Open Paper Trading and confirm new Paper orders store the adaptive multiplier and still obey all existing circuit-breaker/portfolio controls.
7. Run Walk-Forward Optimizer Pro, then run **Champion vs Challenger**.
8. Confirm a challenger cannot be promoted unless its state is `ELIGIBLE`.
9. Start/continue Forward Validation. Re-run Champion vs Challenger after enough post-start points exist.
10. Confirm Local Data counters for `Edge drift v61` and `Champion/Challenger v61` increase after snapshots/comparisons.
11. Export a research bundle and verify `edgeDriftV61` and `championChallengerV61` are present.
12. Recheck Pionex remains read-only and protected APIs still require `APP_API_TOKEN`.

## 6. Validation boundary

The package validates software invariants using static checks, deterministic runtime fixtures and mocked provider/security gates. It does not prove future profitability and does not claim live Cloudflare/provider/exchange behavior was tested from the build environment.
