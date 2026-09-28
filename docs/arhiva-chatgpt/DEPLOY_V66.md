# v66 · REAL-TIME EDGE VALIDATION & CALIBRATION PRO · Deployment

This is the authoritative deployment guide for v66.

## Cloudflare Pages

Use the inherited static/PWA deployment model:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**
- keep `functions/` at repository root.

The PWA cache is `crypto-radar-v66`. `/api/*` remains network-only.

## Security / providers

Keep the hardened settings inherited from prior releases. `APP_API_TOKEN` remains required for protected Pages APIs. Optional provider credentials remain server-side only. v66 introduces no new external provider secret and no live-order credential.

## v66 behavior

After a normal analysis, the Dashboard and Decision Center contain **Real-Time Edge Validation & Calibration Pro**.

The validation layer reads resolved local research outcomes and inherited Paper/Shadow/replay evidence. With little evidence it should display `LEARNING`, `LOW SAMPLE` or `LOW` sufficiency rather than inventing a validated edge.

Key interpretation rules:

- ECE is calibration error, not expected return;
- contribution/ablation is observational, not causal;
- Setup DNA whitelist/blacklist is research governance;
- small samples cannot create the v66 hard blocker;
- severe mature edge decay can block new research/Paper setups;
- v66 does not send live orders.

## Required pre-deploy gate

Run:

```bash
npm test
```

Expected final outputs include:

```text
V66_SYNTAX_PASS ...
V66_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V66_RUNTIME_PASS ...
V66_VERDICT_EXPLAINER_PASS ...
V66_PROFIT_READINESS_PASS ...
V66_REPLAY_RUNTIME_PASS ... future_isolated=1 outcome_changed=1
V66_PAPER_RUNTIME_PASS ...
V66_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V66_EDGE_INHERITED_PASS ...
V66_GOVERNANCE_RUNTIME_PASS ...
V66_UNIVERSE_RUNTIME_PASS ...
V66_PROVIDER_HEALTH_PASS ...
V66_LIVE_EXECUTION_PASS ...
V66_BREADTH_RUNTIME_PASS ...
V66_DECISION_OS_PASS ...
V66_CALIBRATION_RUNTIME_PASS ...
V66_STATIC_AUDIT_PASS ...
V66_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## First production validation

1. Confirm badge `v66 · REAL-TIME EDGE VALIDATION & CALIBRATION PRO · AUDITED`.
2. Hard reload/reopen the installed PWA so `crypto-radar-v66` replaces the older cache.
3. Run a Crypto or Nasdaq analysis.
4. Confirm the Dashboard v66 card renders all thirteen validation engines.
5. Open Decision Center and confirm the same evidence layer is visible there.
6. Confirm Master Verdict shows Edge Validation, Setup DNA and Evidence Sufficiency.
7. If the journal has few resolved outcomes, verify the UI stays conservative (`LOW SAMPLE` / `LEARNING`).
8. With enough resolved outcomes, inspect confidence buckets: predicted and observed rates must be shown separately.
9. Inspect Module Contribution and Ablation; confirm the disclosure says they are observational diagnostics.
10. Confirm Setup DNA reports its exact cohort N before whitelist/blacklist interpretation.
11. Confirm Edge Decay compares recent evidence with a prior baseline rather than the same window.
12. Check 24H/7D/30D/90D calibration windows.
13. Confirm the layer table keeps Historical Replay in `%` and Journal/Paper/Shadow/Forward in `R`.
14. Run `Refresh evidence` after resolving new Paper/Shadow/journal observations.
15. Open Local Data and confirm `Edge validation v66` snapshots increment.
16. Generate a Research Bundle and confirm `edgeValidationV66` is included.
17. Re-test v65 Kill Switch and ensure a v66 warning cannot override capital-preservation blockers.

## Validation boundary

The package validates deterministic software behavior and historical/local evidence calculations. It does not validate future profitability, live provider entitlements, live exchange fills, matching-engine queue position, or real-money execution. Keep v66 in research/Paper/Shadow mode until its own forward evidence becomes sufficiently mature.
