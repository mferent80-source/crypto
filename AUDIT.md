# v25 · FORWARD EDGE · SEVERE AUDIT

## Added
- Forward-only validation cohort with explicit start timestamp.
- Forward cohort expectancy, PF, drawdown and win rate.
- Risk Guard using recent cost-aware outcomes with NORMAL / LEARNING / CAUTION / PAUSE states.
- Segment Reliability Overlay by symbol + timeframe + mode + regime.
- Bayesian-style shrinkage toward neutral for small samples; overlay capped at ±8 points and remains advisory.
- Suggested confidence threshold derived from shrunk segment evidence without rewriting base engine weights.
- Rolling 3-fold out-of-sample validation.
- Evidence Quality Gate: attribution coverage, ambiguity rate, out-of-range rate and confidence-vs-hit-rate calibration gap.
- Entry expiry after a configurable number of candles; expired entries are not scored as losses.
- Recalibration upgraded to require at least 30 cost-aware resolved outcomes and uses recent net-R evidence.
- All v24 functionality retained.

## Severe audit
- frontend-check.js: syntax PASS
- backend-check.mjs: syntax PASS
- sw-check.js: syntax PASS
- UI parity v24→v25: PASS · lost IDs 0 · total IDs 342
- Function parity v24→v25: PASS · lost functions 0 · total functions 144
- onclick handlers resolved: PASS (36 refs)
- v25 DOM required IDs: PASS
- Direct spot architecture regression check: PASS
- EVALUATOR_V25_PASS
- RELIABILITY_GUARD_PASS
- CORE_RUNTIME_PASS
- Full bootstrap with DOM/PWA/WebSocket stubs: PASS
- Package structure: PASS

## Research limitations
- Reliability overlay is descriptive/advisory, not a proven probability calibration.
- Forward cohorts need enough independent signals before interpretation.
- Risk Guard is a research control, not an automated trading kill switch.
- Rolling OOS still uses public historical candle data and modeled costs.
- No claim of future profitability is made.
