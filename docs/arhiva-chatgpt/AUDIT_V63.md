# v63 · LIVE-COST & EXECUTION REALISM PRO · FINAL AUDIT

## Final status

**Release:** `v63 · LIVE-COST & EXECUTION REALISM PRO · AUDITED`  
**Engine Contract:** `54.1`  
**Data schema:** `54`  
**Base:** v62 Historical Universe & Data Integrity Pro  
**Scope:** static analysis, deterministic runtime fixtures, mocked security/provider gates, exact v62→v63 UI/function parity, Paper v3 regression tests, live-cost arithmetic, execution-gap gate logic and inherited findings matrix.  
**Real-money execution validation:** not claimed.

The inherited severe audit matrix remains **62 findings: 51 FIXED / 11 MITIGATED / 0 OPEN**. This means all tracked findings from the severe-audit matrix have a fixed or explicit mitigation state; it does not prove the software is defect-free or profitable.

## What v63 adds

### 1. Live Cost & Market Friction

v63 adds an explicit instrument-aware carry model:

- **CRYPTO SPOT:** no funding carry is applied.
- **CRYPTO PERP:** current public funding rate can be captured at setup time; the funding interval is explicit/configurable rather than hidden.
- **STOCK LONG:** no borrow cost is applied.
- **STOCK SHORT:** annualized borrow cost and locate state are explicit inputs. A trade marked `UNAVAILABLE` for locate is blocked in Paper mode.

Funding/borrow carry is integrated into both Shadow outcomes and Paper v3 exits. Positive funding/borrow costs reduce modeled P&L; negative perp funding can be represented as a credit. Carry inputs are snapshotted at setup creation so later UI changes do not silently rewrite an existing trade's assumptions.

### 2. Suspected market-interruption guard

v63 detects unexplained intraday timestamp gaps relative to the selected timeframe and records a `DATA GAP · POSSIBLE INTERRUPTION (NOT OFFICIAL HALT)` event in Paper execution. The UI also reports a current interruption state.

This is deliberately **not** labeled as an official trading-halt/LULD feed. Normal overnight stock gaps are excluded from the intraday detector.

### 3. Shadow vs Execution Model calibration

New Shadow setups store:

- entry reference price;
- modeled slippage;
- next observed bar-open proxy;
- proxy slippage;
- signed model gap in basis points.

The lab aggregates sample count, signed gap, MAE and P90 absolute gap. The proxy is intentionally described as a latency/model mismatch measurement, **not** a broker/exchange fill receipt.

### 4. Live Readiness Score v63

The score combines five planes:

- evidence maturity;
- execution calibration;
- provider/data quality;
- edge/model stability;
- cost-model completeness.

`SMALL CAPITAL ELIGIBLE` requires both a high composite score and all hard gates:

- strict inherited `SMALL LIVE READY` evidence;
- Provider Health score ≥75;
- at least 10 completed Shadow outcomes with non-materially negative expectancy;
- at least 8 execution-proxy samples with MAE ≤15 bps;
- no severe edge drift and non-zero governor;
- valid cost inputs, including known funding for PERP and explicit available locate for a current STOCK SHORT context.

The label is an **eligibility gate only**. It is not a profit prediction, order authorization or recommendation to trade.

## Deterministic v63 runtime fixture

```text
V63_LIVE_EXECUTION_PASS funding24=0.0300% borrow24=0.100% carryR=0.006 eligible=93 blocked=NEAR_·_NOT_ELIGIBLE
```

The fixture verifies:

- positive PERP funding costs a LONG and credits a SHORT under the configured interval model;
- annualized stock borrow converts correctly to a 24-hour carry fraction;
- carry converts to R using stop-distance risk;
- the suspected intraday-gap detector fires on a synthetic 3× timeframe gap;
- a fully satisfied evidence/data/execution fixture becomes `SMALL CAPITAL ELIGIBLE`;
- removing Provider Health evidence prevents eligibility even when the numerical score remains relatively high.

## Exact v62 → v63 parity

```text
V63_UI_PARITY_PASS ids=1314 base_ids=1291 functions=852 base_functions=837 lost_ids=0 lost_functions=0 dom_refs=1136
```

v63 adds 23 DOM IDs and 15 named functions, with **0 lost IDs and 0 lost functions** relative to v62.

## Full gate summary

```text
V63_SYNTAX_PASS 110 executable JS/MJS surfaces + JSON manifests
V63_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V63_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V63_VERDICT_EXPLAINER_PASS ...
V63_PROFIT_READINESS_PASS live=SMALL_LIVE_READY paper=PAPER_READY not=NOT_READY live_gates=18 paper_gates=6
V63_REPLAY_RUNTIME_PASS ... future_isolated=1 outcome_changed=1
V63_PAPER_RUNTIME_PASS layers=3 partial=3.23 conservative=STOP scale=6.50 trail=105.00 time=TIME STOP
V63_UI_PARITY_PASS ids=1314 base_ids=1291 functions=852 base_functions=837 lost_ids=0 lost_functions=0 dom_refs=1136
V63_EDGE_INHERITED_PASS ...
V63_GOVERNANCE_RUNTIME_PASS ...
V63_UNIVERSE_RUNTIME_PASS ...
V63_PROVIDER_HEALTH_PASS probes=11 score=100 state=OK auth=1 secrets=0
V63_LIVE_EXECUTION_PASS funding24=0.0300% borrow24=0.100% carryR=0.006 eligible=93 blocked=NEAR_·_NOT_ELIGIBLE
V63_STATIC_AUDIT_PASS 32 inherited hardening + live-cost + execution-calibration + readiness invariants
V63_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## Remaining limitations

v63 materially improves cost and execution realism but still cannot truthfully know:

- actual exchange/broker queue priority;
- hidden/replenishing liquidity and full market impact;
- exact tick sequencing from OHLCV history;
- a real broker fill unless a broker/exchange execution receipt is integrated;
- actual stock borrow availability/rate unless a borrow/locate provider supplies it;
- official exchange halt/LULD status unless a dedicated official/market-data feed is integrated;
- future funding-rate changes over a long holding period when using a setup-time funding snapshot;
- routing latency, rejection behavior and broker-specific auction mechanics.

There is still **no real-money order-placement route** in v63.

## Final conclusion

v63 is a stronger **research / Paper / Shadow validation platform**. It can now refuse a live-readiness eligibility label when critical evidence, execution calibration, provider health or cost inputs are missing. It does not establish future profitability and should not be described as an autonomous money-making system.
