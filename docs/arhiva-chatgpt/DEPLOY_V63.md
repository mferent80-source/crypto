# v63 · LIVE-COST & EXECUTION REALISM PRO · Deployment

This is the authoritative deployment guide for v63.

## 1. Cloudflare Pages

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**
- Keep `functions/` at repository root.

PWA cache: `crypto-radar-v63`. `/api/*` remains network-only.

## 2. Existing security/provider configuration

Retain the v62/v54 hardened configuration, including `APP_API_TOKEN` for protected routes and server-side provider keys only. v63 adds no live-order credential and no order-placement endpoint.

## 3. v63 cost-model setup

Open **Edge Validation Pro → Live Cost & Market Friction v63**.

- Leave `AUTO` to map Stocks → STOCK and Crypto → SPOT.
- Select `PERP` only when the research/Paper setup is intended to model a perpetual instrument.
- For PERP, verify a current funding value is visible and set the funding interval appropriate to the instrument/provider assumption.
- For a stock short, set the annualized borrow assumption and locate state. `UNAVAILABLE` blocks a new Paper short.
- The interruption guard is a timestamp-gap diagnostic, not an official halt/LULD feed.

## 4. Shadow execution calibration

After adding Shadow setups, refresh outcomes as new bars arrive. v63 records the next bar-open proxy and compares it with the entry slippage model.

Review:

- proxy sample count;
- signed gap;
- mean absolute error;
- P90 absolute gap.

Do not interpret this proxy as a real broker fill.

## 5. Live Readiness Score

Run/refresh these inputs before interpreting the v63 gate:

1. Profit Readiness;
2. Forward Validation;
3. Shadow Live outcomes;
4. Provider Health / Data Integrity;
5. Model / Edge Drift Monitor;
6. Automatic Risk Governor;
7. v63 cost-model inputs.

`SMALL CAPITAL ELIGIBLE` is shown only after the strict hard gates pass. It remains a research eligibility label, not a profit promise or trade instruction.

## 6. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final outputs include:

```text
V63_SYNTAX_PASS
V63_SECURITY_RUNTIME_PASS
V63_RUNTIME_PASS
V63_VERDICT_EXPLAINER_PASS
V63_PROFIT_READINESS_PASS
V63_REPLAY_RUNTIME_PASS
V63_PAPER_RUNTIME_PASS
V63_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V63_EDGE_INHERITED_PASS
V63_GOVERNANCE_RUNTIME_PASS
V63_UNIVERSE_RUNTIME_PASS
V63_PROVIDER_HEALTH_PASS
V63_LIVE_EXECUTION_PASS ... eligible=93 ...
V63_STATIC_AUDIT_PASS
V63_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## 7. First production validation

1. Confirm badge `v63 · LIVE-COST & EXECUTION REALISM PRO · AUDITED`.
2. Hard reload/reopen the installed PWA so `crypto-radar-v63` replaces the previous cache.
3. Recheck protected provider APIs with `APP_API_TOKEN`.
4. Run Provider Health and verify no secret values are exposed.
5. Run a Crypto SPOT setup and verify modeled carry is zero.
6. Switch the v63 instrument model to PERP and verify current funding appears when futures data is available.
7. Run a stock SHORT research setup and verify `UNAVAILABLE` locate blocks a new Paper short.
8. Add Shadow setups and verify execution-gap samples populate only after a later observed bar exists.
9. Confirm Shadow table still states that no exchange order is sent.
10. Confirm Paper v3 exit events record carry when a non-SPOT carry model is used.
11. Confirm a suspected data gap is labeled `POSSIBLE INTERRUPTION (NOT OFFICIAL HALT)` rather than asserted as an exchange halt.
12. Recompute Live Readiness. Without strict evidence/provider/execution inputs it must remain `NEAR · NOT ELIGIBLE` or `NOT ELIGIBLE`.
13. Export a research bundle and confirm `liveReadinessV63` and `shadowLiveV60` evidence are included.

## 8. Validation boundary

The packaged audit validates deterministic software behavior, mocked security/provider gates and exact v62→v63 parity. It does not validate real broker fills, official halt feeds, real borrow availability, future funding changes, production network behavior or future profitability.
