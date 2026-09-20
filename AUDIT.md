# v42 · PORTFOLIO INTELLIGENCE · SEVERE AUDIT

## Added

### Portfolio return alignment
- Portfolio daily returns are now aligned by calendar date before multi-asset risk calculations.
- This matters for mixed Crypto + US Stock paper portfolios because crypto trades weekends while US equities do not.
- Risk calculations use only dates common to the positions being compared.

### Historical VaR / CVaR refinement
- Existing 1-day Historical VaR 95% and CVaR 95% remain.
- Dollar PnL is calculated directly from signed current exposures and aligned daily returns.
- LONG exposure is positive, SHORT exposure is negative.

### Parametric VaR decomposition
- Added covariance-based 1-day 95% Parametric VaR.
- Added Marginal VaR per $1,000 of signed exposure.
- Added Component VaR for every portfolio symbol.
- Component VaR uses the standard Euler covariance decomposition and sums back to total Parametric VaR, subject only to floating-point precision.
- A negative component is displayed as a diversification contribution rather than silently forced positive.
- Standalone VaR per symbol is displayed beside component risk.
- Diversification benefit is the difference between summed standalone VaR and portfolio Parametric VaR.

### Correlation clusters
- Positions form a graph using configurable **positive** return correlation, default `0.65`.
- Connected components become portfolio correlation clusters.
- Displays:
  - cluster members,
  - gross exposure,
  - signed/net exposure,
  - open initial-risk USD,
  - cluster concentration.
- Strong negative-correlation pairs are counted separately as hedge pairs rather than being treated as concentration clusters.

### Paper risk budgets
Local paper-only limits:
- total committed portfolio initial risk,
- per-market risk,
- per-regime risk,
- per-correlation-cluster risk,
- per-symbol committed exposure.
- Defaults:
  - total risk: 4% of paper equity,
  - one market: 3%,
  - one regime: 2.5%,
  - one correlation cluster: 2%,
  - one symbol exposure: 30%.
- Pending v41 limit orders reserve both risk and planned exposure before fill.
- Budget states:
  - PASS,
  - WATCH,
  - BLOCK.
- A new Paper order is rejected if the local paper-risk budget would already be in BLOCK after the candidate.

### Adaptive paper sizing v42
The v41 adaptive risk multiplier now also considers:
- portfolio correlation,
- largest Component VaR share,
- largest correlation-cluster share,
- current portfolio risk-budget state.
- WATCH reduces new Paper risk.
- Existing portfolio BLOCK reduces adaptive new-paper risk to zero.
- The candidate-specific hard budget gate is still checked separately before a Paper order is created.

### Pre-Trade Portfolio Impact
For the current active LONG/SHORT setup:
- calculates planned candidate notional,
- loads the same existing daily market-data route already used by the app,
- compares base portfolio and candidate portfolio over a common historical sample,
- reports Incremental Historical VaR,
- Incremental CVaR,
- maximum absolute candidate correlation,
- post-trade symbol concentration,
- candidate risk-budget gate.
- The candidate is not added automatically.

### Strategy Families
- Resolved strategy observations are grouped into segments:
  `source + timeframe + mode + direction + regime`.
- Segments require N >= 8.
- Each segment gets a normalized feature profile from:
  - trend,
  - momentum,
  - volume,
  - structure,
  - ADX,
  - ATR%,
  - MFI,
  - CMF,
  - historical analog score,
  - MTF,
  - microstructure,
  - sweep confirmation,
  - execution friction.
- Similar same-source / same-direction segments are connected into strategy families.
- Default similarity threshold: `0.82`.
- Reports:
  - eligible segments,
  - number of families,
  - largest family,
  - redundant-segment count,
  - family-diversification score,
  - family expectancy / PF / similarity.
- The purpose is to avoid treating several nearly identical strategy labels as independent evidence.

### Paper attribution
- New v42 Paper trades store their current market regime.
- New Paper orders store the portfolio-budget state at creation.

### Backup
- Backup schema bumped to `42`.
- Portfolio risk-budget settings are included.
- Existing v41 execution-state paper trades remain supported.

## Severe audit
- frontend-check.js: syntax PASS
- market-check.mjs: syntax PASS
- stocks-check.mjs: syntax PASS
- intel-check.mjs: syntax PASS
- history-check.mjs: syntax PASS
- monitor-proxy-check.mjs: syntax PASS
- account-check.mjs: syntax PASS
- push-check.mjs: syntax PASS
- monitor-worker-check.mjs: syntax PASS
- sw-check.js: syntax PASS
- UI parity v41→v42: PASS · lost IDs 0 · total IDs 804
- Function parity v41→v42: PASS · lost functions 0 · total named functions 455
- onclick handlers resolved: PASS (81 refs)
- Parametric VaR Euler decomposition: PASS
- Historical VaR/CVaR aligned-return engine: PASS
- Correlation clusters + negative-correlation hedge detection: PASS
- Paper risk-budget gate: PASS
- Pending-risk reserve ledger: PASS
- Strategy-family clustering: PASS
- V42_PORTFOLIO_RUNTIME_PASS
- v41 execution realism / v40 governance / cloud / multi-market modules retained: PASS
- Package structure: PASS

## Important limitations
- Historical VaR/CVaR are backward-looking and can miss gaps or new stress regimes.
- Parametric Marginal/Component VaR assumes covariance is a useful local approximation and should not be treated as a hard maximum-loss estimate.
- Correlation changes under stress; clusters are therefore diagnostics, not permanent asset classifications.
- Strategy families are based on feature-profile similarity, not proof that strategies are economically identical.
- Pre-trade portfolio analysis is research/paper-only.
- No new API/provider was introduced in v42.
- No live-money order endpoint was added.
