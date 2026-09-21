# v66 · REAL-TIME EDGE VALIDATION & CALIBRATION PRO · FINAL AUDIT

**Release:** `v66 · REAL-TIME EDGE VALIDATION & CALIBRATION PRO · AUDITED`  
**Engine Contract:** `54.1`  
**Data schema:** `54`  
**Base:** v65 Decision Intelligence OS Pro  
**Scope:** syntax/static checks, deterministic runtime fixtures, inherited security/runtime/Paper/Replay/governance/breadth gates, exact v65→v66 DOM/function parity, and dedicated calibration/attribution tests.  
**Live profitability / broker execution validation:** not claimed.

## What v66 adds

v66 adds a forward-aware evidence layer above the v65 Decision Intelligence OS. The new layer is rendered both on the **Dashboard** and the **Decision Center / Verdict page** and contains thirteen validation engines:

1. Real-Time Verdict Outcome Tracker;
2. Confidence Calibration Pro;
3. Module Contribution Analyzer;
4. proxy Ablation Testing;
5. Verdict Quality Score;
6. Setup DNA;
7. Edge Decay Alarm;
8. Regime-Specific Research Policies;
9. Live Calibration windows (24H / 7D / 30D / 90D);
10. Decision Attribution;
11. automatic Research Whitelist / Blacklist;
12. Historical Replay / Journal / Paper / Shadow / Forward comparison;
13. Data Sufficiency Meter.

The objective is not to add another directional indicator. It is to measure whether existing signals remain useful, calibrated and sufficiently supported by new outcomes.

## Confidence calibration

Resolved signal records are grouped into confidence buckets. v66 compares the mean declared confidence with observed positive-outcome frequency and reports:

- sample N;
- predicted vs observed hit rate;
- empirical/shrunk bucket rate;
- expectancy in R;
- Expected Calibration Error (ECE);
- Brier score.

Raw engine confidence is therefore no longer presented as if it were automatically a statistically calibrated probability.

## Module contribution and ablation

v66 evaluates directional/alignment features already stored at decision time, including confidence, trend, momentum, volume, structure, MTF, trade flow, breadth, cross-asset context, event/news risk, Decision OS state and conflict state.

Contribution diagnostics compare factor alignment with resolved R outcomes. Ablation recomputes a composite score after removing one factor and measures the change in historical score/outcome correlation.

These are **observational diagnostics**. They can identify useful or suspicious relationships but do not establish causal contribution. Promotion still requires OOS/forward evidence through the inherited governance stack.

## Setup DNA and research lists

A Setup DNA key combines direction, regime, breadth state, session, Adaptive Entry state and Conflict state. v66 tracks expectancy, profit factor, win rate, drawdown and an approximate 95% mean-R interval for each DNA cohort.

Research whitelist/blacklist rules intentionally require mature samples. Small samples remain `LEARNING`/`NEUTRAL` and cannot create a hard block.

A current DNA can become a mature blocker only when the negative evidence threshold is met and the upper confidence bound remains below the conservative limit. This is a research safety gate, not a claim that future trades must lose.

## Edge decay

The Edge Decay Alarm compares the latest resolved cohort against a preceding baseline cohort. States are:

- `LEARNING`;
- `STABLE`;
- `WATCH`;
- `DRIFT`;
- `SEVERE`.

Only a mature `SEVERE` state can create the v66 Master Verdict evidence blocker. `WATCH` and `DRIFT` are warnings and are intended to work alongside the v61 Risk Governor.

## Verdict Quality and Data Sufficiency

Verdict Quality combines evidence sufficiency, empirical calibration, edge stability, Shadow execution calibration and Data Quality. Data Sufficiency separately measures resolved sample size, Forward, Paper, Shadow, current Setup DNA, regime coverage and calibration-bucket coverage.

Neither score is a profit probability. A high score means the decision has better supporting evidence and observability, not that the next trade is guaranteed to win.

## Layer comparison

v66 compares evidence layers while preserving their units:

- Historical Replay: average net outcome in percent;
- resolved Journal: R;
- Paper: R;
- Shadow: R;
- Forward cohort: R.

The UI explicitly notes that historical replay percent and R-based execution layers are not directly interchangeable.

## Master Verdict integration

v66 adds three compact fields to Master Verdict:

- Edge Validation state / quality;
- current Setup DNA state / N;
- Data Sufficiency state / score.

Verdict Center also receives v66 Edge Validation, Setup DNA, Edge Decay and Data Sufficiency entries.

A v66 hard block can occur only for mature severe edge decay or a mature negative Setup DNA. The v65 Kill Switch, Event Risk, Conflict Resolver and existing portfolio/risk/data-quality gates retain priority.

## Persistence and audit trail

v66 stores validation snapshots under IndexedDB type `edge_validation_v66`, adds the dataset to Local Data and Research Bundle exports, and stores a compact v66 validation snapshot on newly created signal records.

This makes it possible to reconstruct what evidence quality was known when a setup was recorded.

## Dedicated v66 fixture

The deterministic calibration fixture intentionally includes a badly calibrated synthetic dataset and verifies that v66 flags it rather than smoothing it away:

```text
V66_CALIBRATION_RUNTIME_PASS n=80 ece=33.5 corr=1.00 factors=12 decay=SEVERE
```

The correlation value belongs only to the deliberately constructed synthetic fixture and is not a performance claim for the trading application.

## Final test gate

The packaged suite requires PASS for syntax, security, runtime, Verdict Explainer, Profit Readiness, Replay, Paper v3, UI parity, Edge Validation, Governance, historical universe, Provider Health, execution realism, Market Breadth, Decision OS, v66 calibration and the severe-audit findings matrix.

Exact v65→v66 parity requires **zero lost DOM IDs and zero lost named application functions**.

## Remaining limitations

v66 does not prove future profitability. Specific limitations remain:

- observational contribution/ablation can be confounded by correlated inputs;
- confidence calibration needs enough independent forward outcomes;
- repeated experimentation can still create selection bias if governance is ignored;
- replay, Paper and Shadow models cannot reproduce full matching-engine behavior;
- provider availability and data correctness can change in production;
- real-money order routing is not present in this release.

## Final conclusion

v66 materially improves the ability to answer *which parts of the decision system are supported by evidence, how well confidence is calibrated, whether edge is decaying, and whether there is enough data to make a conclusion*. It remains a research/Paper/Shadow platform. The correct next step after deployment is accumulation of real forward evidence, not immediate capital scaling.
