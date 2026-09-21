# v57 · PROFIT READINESS GATE · Deployment

This is the authoritative deployment guide for v57. Historical deployment documents are under `docs/legacy/`.

## Cloudflare Pages

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**
- Keep `functions/` at repository root.

The PWA cache is `crypto-radar-v57`. `/api/*` remains network-only in the Service Worker.

## Existing v54 security requirements remain

Protected provider/account/history/monitor/push routes still use `APP_API_TOKEN`. Optional provider secrets and D1/KV bindings are unchanged from v54/v56. v57 adds no new provider secret, database binding or live-order route.

## Profit Readiness Gate

The gate has three states:

- `NOT READY` — minimum research evidence is incomplete or degraded.
- `PAPER READY` — the six Paper evidence gates pass; continue simulated/forward validation.
- `SMALL LIVE READY` — all Paper gates and all 18 stricter live-evidence gates pass. This is an **eligibility label only**, not a profit prediction, recommendation, or permission to ignore Master Verdict/risk controls.

### Paper Ready policy

Requires all six:

1. at least 40 resolved cost-aware outcomes;
2. positive net expectancy;
3. profit factor ≥ 1.10;
4. max drawdown ≥ -15R;
5. evidence span ≥ 7 days;
6. recent sample N≥10 with expectancy > -0.15R.

### Small Live Ready policy

Requires the Paper gate plus all 18 live gates, including:

- ≥150 resolved cost-aware outcomes;
- expectancy ≥ +0.10R;
- PF ≥1.25;
- drawdown ≥ -10R;
- ≥30 days evidence;
- forward N≥60, expectancy ≥+0.08R, PF≥1.25;
- completed Paper N≥50, expectancy ≥+0.05R, PF≥1.20, DD≥-8R;
- ≥3 regimes with N≥10;
- recent-20 expectancy ≥0;
- fresh current-setup OOS pass (N≥20, positive expectancy, PF≥1.20, age≤14d);
- usable model and stable drift;
- current data quality ≥80/100;
- manually confirmed live provider/deployment behavior and online state.

The manual provider checkbox must be set **only after** post-deploy live validation. It is stored as a local/session preference and does not prove network/provider correctness by itself.

## Required pre-deploy gate

Run:

```bash
npm test
```

Expected key outputs include:

```text
V57_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V57_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V57_VERDICT_EXPLAINER_PASS ...
V57_PROFIT_READINESS_PASS live=SMALL_LIVE_READY paper=PAPER_READY not=NOT_READY live_gates=18 paper_gates=6
V57_STATIC_AUDIT_PASS 39 hardening + wide-ui + verdict + readiness invariants
V57_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## First production validation

1. Confirm badge `v57 · PROFIT READINESS GATE · AUDITED`.
2. Hard reload / reopen the installed PWA to replace older cache.
3. Verify ordinary BTC Binance analysis.
4. Verify Master Verdict / Verdict Explainer still updates.
5. Open **Profit Readiness** and verify it starts conservatively from actual stored evidence.
6. Verify Crypto and US Stocks evidence are not mixed.
7. Run OOS on the current symbol/TF/mode and verify the OOS gate updates.
8. Add/resolve Paper trades and verify Paper metrics update.
9. Start/continue the Forward cohort and verify forward N/expectancy/PF.
10. Only after provider/live behavior is actually checked, enable the manual provider-confirmed checkbox.
11. Confirm the gate never changes the current Master Verdict or places an order.
12. Confirm Local Data shows `Profit readiness snapshots`.

## Validation boundary

The packaged audit is static + deterministic runtime + mocked security/provider validation. It does **not** claim that Cloudflare production bindings, provider entitlements, quotas, live prices or future profitability were validated from this environment.
