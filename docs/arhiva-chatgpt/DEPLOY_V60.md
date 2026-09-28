# v60 · EDGE VALIDATION & SHADOW EXECUTION PRO · Deployment

## Cloudflare Pages

- Framework preset: **None**
- Build command: **blank**
- Output directory: **public**
- Root directory: **blank**
- Keep `functions/` at repository root.

PWA cache: `crypto-radar-v60`. `/api/*` stays network-only.

## Existing security / provider configuration

v60 keeps the v54+ security model. Configure `APP_API_TOKEN` for protected API routes. Optional provider secrets remain server-side only: `TWELVE_DATA_API_KEY`, `TRADING_ECONOMICS_API_KEY`, `WHALE_ALERT_API_KEY`, `COINGLASS_API_KEY`, `COINGECKO_API_KEY`, and read-only `PIONEX_API_KEY` / `PIONEX_API_SECRET` when used. Optional D1/KV/Push/monitor bindings are unchanged.

## Pre-deploy gate

Run:

```bash
npm test
```

Expected v60 gates include:

```text
V60_SYNTAX_PASS
V60_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V60_RUNTIME_PASS ...
V60_VERDICT_EXPLAINER_PASS ...
V60_PROFIT_READINESS_PASS ...
V60_REPLAY_RUNTIME_PASS ... future_isolated=1 outcome_changed=1
V60_PAPER_RUNTIME_PASS ...
V60_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V60_EDGE_RUNTIME_PASS ... shadow=STOP review=A
V60_STATIC_AUDIT_PASS ...
V60_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## First production validation

1. Confirm badge `v60 · EDGE VALIDATION & SHADOW EXECUTION PRO · AUDITED`.
2. Hard reload / reopen the installed PWA so `crypto-radar-v60` replaces the previous cache.
3. Run a normal BTC or Nasdaq analysis and confirm v59 Master Verdict / Paper behavior remains intact.
4. Open **Edge Validation Pro**.
5. Start/continue a Forward cohort and verify N, expectancy, CI, rolling stability and segment evidence.
6. Change Performance Breakdown dimensions and verify symbol/TF/regime/direction/session/mode/volatility/setup tables.
7. Run the multi-fold Walk-Forward Optimizer; verify each row shows train parameters and untouched OOS metrics.
8. Run Risk-of-Ruin with at least 20 resolved outcomes; verify ruin, DD and loss-streak outputs.
9. For Crypto, refresh Execution Model Pro and verify spread, imbalance, visible-book slippage and tape delta. Provider/network limits can make some fields unavailable.
10. Add a Shadow setup. Confirm the blotter records a simulated entry and `Refresh outcomes` advances it without sending a real exchange order.
11. Enable Alert Engine Pro and set gates. Confirm only current setups that clear those gates create a PRO alert.
12. Evaluate the signal journal / run Auto Trade Review and confirm resolved rows receive deterministic attribution.
13. Recheck Profit Readiness and Paper Trading v3.
14. Recheck protected provider APIs and read-only Pionex account access.

## Validation boundary

The packaged tests validate static/runtime logic with deterministic fixtures and mocked provider/security paths. They do not prove Cloudflare production routing, paid-provider entitlements, live exchange fills, hidden liquidity, queue priority or future profitability.
