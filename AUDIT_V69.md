# v69 · LIVE PERFORMANCE & CAPITAL SCALING PRO · FINAL AUDIT

## Status

**Release:** `v69 · LIVE PERFORMANCE & CAPITAL SCALING PRO · AUDITED`  
**Base:** v68 Controlled Live Execution Pro  
**Engine Contract:** 54.1

## What v69 adds

- controlled closing of an app-created Pionex Spot BUY;
- server verification that a close references a real application entry and has filled quantity;
- no naked-short creation path;
- synchronization of actual Pionex order fields for entry/exit;
- LIVE P&L in R using actual filled amount/size when available;
- exact USDT fee use when returned, otherwise a conservative configured-fee fallback;
- comparison of Historical Replay / Journal / Paper / Shadow / Forward / LIVE;
- evidence-gated capital ramp: `0% → 10% → 25% → 50% → 100%` of the **configured live allowance**;
- automatic downside cap: effective stage is always the lower of user-approved stage and evidence-supported stage;
- manual confirmation required to increase the approved stage;
- Provider/Operations/Live Readiness/Edge deterioration can reduce recommendation to 0%;
- Dashboard and Decision Center LIVE performance panels;
- persistent live-performance audit data and research-bundle export.

## Capital-ramp policy

The deterministic research policy requires progressively more LIVE evidence. The included fixture verifies: fewer than 5 closed LIVE outcomes → 0%; a healthy positive N=25 fixture → at least 25%; N=60 → at least 50%; N=120 with stronger expectancy/PF/quality → 100%. Provider degradation forces the recommendation back to 0%. These are governance thresholds, not a profit guarantee.

`100%` means 100% of the already-configured live-risk/notional allowance. It never means 100% of account equity. Server hard caps remain authoritative.

## Required test gate

```text
V69_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V69_LIVE_GATEWAY_PASS ...
V69_CAPITAL_SCALING_PASS n4=0 n25=25% n60=50% n120=100% unhealthy=0 controlled_close=1
V69_STATIC_AUDIT_PASS ...
V69_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## Validation boundary

No live Pionex order was placed during build validation. The LIVE performance engine becomes meaningful only after real app-created entries and controlled exits are completed and reconciled after deployment. A green ramp is evidence eligibility under the encoded policy, not assurance of future profitability.
