# v56 · VERDICT EXPLAINER · FINAL AUDIT

## Final status

**Release:** `v56 · VERDICT EXPLAINER · AUDITED`  
**Engine Contract:** `54.1` (unchanged)  
**Data / IndexedDB schema:** `54` (unchanged)  
**Base UI:** v55 Wide Terminal retained  
**Audit scope:** syntax, deterministic runtime, mocked API/security gates, dedicated Verdict Explainer runtime fixture, inherited 62-finding remediation matrix, DOM/function parity and static wide-layout invariants.  
**Live Cloudflare/provider/device validation:** not claimed.

## Why v56 exists

The previous Master Verdict exposed many numbers but could still leave the user with a vague `WAIT`, `LONG` or `SHORT`. v56 keeps the underlying decision rules and adds an explicit explanation layer.

The top of Master Verdict now answers four questions directly:

1. **What is the base directional bias?**
2. **Why is the final result LONG / SHORT / WAIT?**
3. **What evidence supports and opposes the current direction?**
4. **Exactly what must change before a blocked WAIT can become active?**

## New decision brief

The new `Verdict executabil` block exposes:

- final verdict;
- explicit risk state: `FĂRĂ BLOCKER HARD`, `ATENȚIE`, or `BLOCAT`;
- one-sentence interpretation of the verdict;
- explicit research/paper action line;
- base bias;
- directional agreement;
- calibrated probability for the **base direction** (kept separate from the heuristic score);
- weighted module consensus;
- module coverage;
- data quality.

## Evidence explanation

Three visible panels now show:

### De ce susține direcția
The strongest currently aligned directional modules, sorted by signed signal strength × research weight.

### Ce se opune
The strongest opposing directional modules. When directional opposition is absent, current warnings can be surfaced instead.

### Ce trebuie să se schimbe
Hard decision gates are converted into explicit unlock requirements. The app no longer stops at a generic `WAIT` message.

Gate explanations include:

- base engine WAIT;
- usable Meta-label `SKIP`;
- Portfolio `BLOCK / PAUSE`;
- macro `BLACKOUT`;
- Stress `SEVERE`;
- Risk Guard `BLOCK` / zero multiplier;
- Strategy lifecycle `RETIRED`;
- Data Quality below 55/100;
- family-capped consensus below the ±12/100 activation threshold.

## WAIT behavior

When final verdict is `WAIT` but the base engine has a directional candidate, v56 explicitly displays the candidate direction and trade map as **INACTIV**.

This prevents an inactive candidate Entry/Stop/TP map from looking like an active trade signal.

## LONG / SHORT behavior

When the existing hardened gates pass, the explainer states that the setup is active for research/paper context and shows the same current Entry / Stop / TP map. No live-money execution route is added.

## Methodology integrity

v56 does **not** turn module agreement into a probability of profit.

- Master score remains `HEURISTIC_FAMILY_CAPPED`.
- calibrated probability remains a separate historical model output;
- module counts remain descriptive and correlated;
- the explainer changes communication, not the underlying statistical claims.

## Parity

Compared with v55:

- DOM IDs: **1102 → 1118**;
- lost DOM IDs: **0**;
- duplicate DOM IDs: **0**;
- named app functions: **712 → 716**;
- lost named functions: **0**.

New named functions:

- `veSetList`
- `veModuleScore`
- `veModuleText`
- `renderVerdictExplainer`

## Security / hardened core

The v54 remediation matrix remains inherited and re-tested:

- **51 FIXED**
- **11 MITIGATED**
- **0 OPEN**

v56 does not weaken APP_API_TOKEN gates, same-origin POST protections, D1 tenant isolation, CSP/security headers, provider-secret handling, Pionex read-only restrictions or Service Worker `/api/*` network-only behavior.

## Automated verification

```text
V56_SYNTAX_PASS 32 executable JS/MJS surfaces + JSON manifests
V56_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V56_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V56_VERDICT_EXPLAINER_PASS base=SHORT risk=BLOCAT_·_1 agreement=67% support=2 opposition=1
V56_STATIC_AUDIT_PASS 53 hardening + wide-ui invariants
V56_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

The dedicated verdict fixture verifies a `SHORT` base candidate that is forced to final `WAIT` by a macro blackout. It asserts:

- explicit base direction;
- explicit `BLOCAT · 1` status;
- plain-language WAIT action;
- calibrated base-direction probability label;
- supporting evidence list;
- opposing evidence list;
- unlock-condition list;
- inactive candidate trade plan.

## Limitations

- The explainer can only explain the data/state currently available to the app.
- Missing providers reduce coverage; they are not silently converted into negative signals.
- Correlated indicators remain correlated.
- The family-capped Master score is heuristic, not a calibrated probability.
- Live provider entitlements, Cloudflare bindings, production routing and physical-device rendering still require post-deploy validation.
- There is no real-money execution route.

## Release conclusion

v56 retains the wide v55 terminal and hardened v54 engine but makes the main verdict materially more useful: `WAIT` now states **why it is WAIT**, what direction exists underneath, what opposes it, which hard gates are active, and what conditions must change before the setup can activate.
