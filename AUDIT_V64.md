# v64 · MARKET BREADTH INTELLIGENCE PRO · FINAL AUDIT

## Final status

**Release:** `v64 · MARKET BREADTH INTELLIGENCE PRO · AUDITED`  
**Engine Contract:** `54.1`  
**Data schema:** `54`  
**Base:** v63 Live-Cost & Execution Realism Pro  
**Audit scope:** static analysis, deterministic runtime fixtures, mocked security/provider gates, exact v63→v64 DOM/function parity, inherited release gates and dedicated Market Breadth fixtures.  
**Live production/provider/profitability validation:** not claimed.

The inherited severe remediation matrix remains **62 findings: 51 FIXED / 11 MITIGATED / 0 OPEN**. This refers to the tracked v53 severe-audit matrix and its remediations, not a claim that all possible defects are impossible.

## What v64 adds

v64 introduces **Market Breadth Intelligence Pro** as a market-participation/context layer rather than a standalone trading signal.

### Dashboard breadth

The Dashboard now exposes:

- composite Breadth Score `0–100`;
- `BULLISH / NEUTRAL / BEARISH` breadth state;
- advancing participation;
- trend breadth from EMA20 / EMA50 / EMA200 participation;
- momentum breadth from RSI > 50 participation;
- advancing-volume breadth;
- 20-bar new-high / new-low breadth;
- benchmark-vs-breadth divergence;
- universe coverage and sample count;
- Fast and explicit Full-universe refresh modes.

For US Stocks/Nasdaq, the engine samples the maintained Nasdaq-100 reference universe and fetches daily history for constituents. For Crypto, it uses the Pionex-supported universe with Binance daily candles. If complete data cannot be retrieved, the UI reports reduced coverage or an explicit proxy instead of presenting incomplete breadth as exact.

## Cross-module integration

Market Breadth is integrated into:

- **Master Verdict:** directional breadth contributes a deliberately limited context-family weight and remains subject to family caps so correlated context cannot dominate the verdict.
- **Verdict Explainer / Verdict Center:** breadth support, opposition and divergence are surfaced as explanatory context.
- **Scanner:** candidate score receives only a bounded breadth adjustment, with state/score/coverage visible in the scanner strip.
- **Replay:** only archived breadth evidence at or before the replay timestamp may be displayed; current breadth is not borrowed into the past.
- **Historical Scanner:** a historical breadth snapshot is calculated from the same historical scan rows and archived with the historical anchor.
- **Forward Validation:** resolved forward outcomes are segmented by the breadth regime stored with the original signal; historical outcomes are not retroactively relabeled using today's breadth.
- **Auto Journal Review:** the review records whether breadth aligned with or opposed the original direction and records divergence context.
- **Local Data / Research Bundle:** `market_breadth_v64` snapshots are retained and exported as research evidence.

## Breadth methodology

For each eligible constituent, v64 evaluates daily participation and derives component rates. The composite score is intentionally interpretable rather than ML-generated:

```text
20% participation
30% trend breadth
20% momentum breadth
18% advancing-volume breadth
12% high/low breadth
```

State thresholds in the shipped policy are:

- `>= 65` → BULLISH
- `<= 35` → BEARISH
- otherwise → NEUTRAL

Benchmark divergence is flagged when benchmark direction materially disagrees with broad participation. These values are research-policy parameters, not guarantees of predictive power.

## Deterministic Market Breadth runtime fixture

The v64 fixture validates aggregation, proxy behavior, directional alignment and forward segmentation:

```text
V64_BREADTH_RUNTIME_PASS state=BULLISH score=76.4 participation=80 proxy=59.5 longAlign=0.50 forwardN=4
```

This proves deterministic software behavior on synthetic inputs. It does not prove future trading profitability.

## Exact v63 → v64 parity

```text
V64_UI_PARITY_PASS ids=1342 base_ids=1314 functions=861 base_functions=852 lost_ids=0 lost_functions=0 dom_refs=1150
```

v64 adds **28 DOM IDs** and **9 named functions** while losing **0** v63 IDs and **0** v63 named functions.

## Full inherited test gate

The complete suite passes:

```text
V64_SYNTAX_PASS 126 executable JS/MJS surfaces + JSON manifests
V64_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V64_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V64_VERDICT_EXPLAINER_PASS base=SHORT risk=BLOCAT_·_1 agreement=67% support=2 opposition=1
V64_PROFIT_READINESS_PASS live=SMALL_LIVE_READY paper=PAPER_READY not=NOT_READY live_gates=18 paper_gates=6
V64_REPLAY_RUNTIME_PASS prefix=240 score=88.2 hist=77.6 future_isolated=1 outcome_changed=1
V64_PAPER_RUNTIME_PASS layers=3 partial=3.23 conservative=STOP scale=6.50 trail=105.00 time=TIME STOP
V64_UI_PARITY_PASS ids=1342 base_ids=1314 functions=861 base_functions=852 lost_ids=0 lost_functions=0 dom_refs=1150
V64_EDGE_INHERITED_PASS ci=0.23..0.91 stability=100 book_vwap=100.43 shadow=STOP review=A
V64_GOVERNANCE_RUNTIME_PASS stable=1 drift=.25 severe=0 quality=.50 policy=T68 · S1.75 · R2.5 · C1.0×
V64_UNIVERSE_RUNTIME_PASS current=101 may17=101 jun21=101 jan06=102 reversed=5
V64_PROVIDER_HEALTH_PASS probes=11 score=100 state=OK auth=1 secrets=0
V64_LIVE_EXECUTION_PASS funding24=0.0300% borrow24=0.100% carryR=0.006 eligible=93 blocked=NEAR_·_NOT_ELIGIBLE
V64_BREADTH_RUNTIME_PASS state=BULLISH score=76.4 participation=80 proxy=59.5 longAlign=0.50 forwardN=4
V64_STATIC_AUDIT_PASS 27 inherited hardening + market-breadth cross-module invariants
V64_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## Limits that remain explicit

- Market breadth is only as complete as constituent history successfully retrieved; provider limits, delistings, symbol changes and missing candles can reduce coverage.
- Fast mode is intentionally a lower-cost sample; Full mode increases breadth coverage but also provider load.
- Crypto breadth still inherits the current-Pionex-membership limitation rather than reconstructing historical crypto exchange membership.
- Breadth components are correlated. The Master Verdict therefore treats them as one bounded context family rather than five independent votes.
- Breadth divergence can persist for extended periods; it is not an automatic reversal signal.
- v63 execution limitations remain: Paper/Shadow still cannot prove queue priority, hidden liquidity, exact tick sequencing, broker routing or actual real-money fills.
- A passing software audit and a favorable Breadth Score do not establish profitable edge.

## Final conclusion

v64 successfully adds observable market participation to the decision stack without allowing breadth to become an unbounded or standalone trade trigger. The release is suitable for continued Paper, Forward and Shadow validation. Live-money eligibility still depends on the existing strict Profit Readiness and v63 Live Readiness evidence gates, not on Market Breadth alone.
