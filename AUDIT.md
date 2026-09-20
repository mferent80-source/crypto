# v54 · FULL HARDENING · FINAL SEVERE AUDIT

## Final status

**Release:** `v54 · FULL HARDENING · AUDITED`  
**Engine Contract:** `54.1`  
**Audit scope:** static analysis, syntax validation, deterministic runtime fixtures, mocked security/provider gates, remediation-matrix verification.  
**Live production/provider validation:** not claimed.

The severe v53 audit contained **62 findings**: 20 HIGH, 32 MEDIUM and 10 LOW; no CRITICAL findings were recorded.

v54 closes the implementation matrix as:

- **51 FIXED**
- **11 MITIGATED**
- **0 OPEN**

Original HIGH findings: **18 fixed / 2 mitigated / 0 open**.

“MITIGATED” is used deliberately where the residual issue is an inherent methodology/architecture/reference-data limitation rather than a defect that can truthfully be eliminated by local code.

## Final automated verification

```text
V54_SYNTAX_PASS 21 executable JS/MJS surfaces + JSON manifests
V54_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V54_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V54_STATIC_AUDIT_PASS 37 hardening invariants
V54_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

`npm test` executes all five gates. `npm run deploy` runs the test gate before Pages deployment.

## Final-audit fixes added after the first hardening checkpoint

The final pass found and corrected additional release-level issues before packaging:

- corrected the D1 Pionex global pacing reservation from a stale `updated_at` column reference to the real `monitor_state.updated_ts` schema;
- added a runtime security test that exercises the authenticated Pionex proxy with the D1 global gate;
- changed the Pages monitor-status proxy to forward server-side `MONITOR_TOKEN` when requesting private Worker health;
- added a runtime test proving that private health forwarding uses the token;
- corrected the PWA manifest description from v53 to v54;
- removed the unreferenced legacy `bootstrap-v47.js` scratch artifact from the release payload;
- moved historical deployment documents under `docs/legacy/` so stale instructions are not confused with v54 deployment.

## Security / abuse controls

Final v54 includes:

- server-side `APP_API_TOKEN` gate for protected Pages API routes;
- constant-time digest comparison for token validation;
- same-origin enforcement on consequential POST actions;
- optional shared `API_RATE_LIMIT` KV with local-isolate fallback;
- server-only Pionex private-account credentials;
- server-only provider credentials;
- tenant-isolated D1 research/history rows;
- public monitor `/health` reduced to `{"ok":true}`;
- authenticated private monitor health through the Pages proxy;
- CSP, frame denial, MIME sniff protection, referrer policy and permissions policy;
- delegated CSP-safe UI actions instead of inline event attributes;
- escaping on audited provider/error-driven HTML sinks;
- no real-money order endpoint.

## Correctness repairs

The final build includes the v54 corrections for:

- market/source/symbol/TF identity isolation;
- MTF coverage gating and confidence shrinkage;
- chronological, deduplicated Historical CVD accumulation and coverage diagnostics;
- 7-day observed-liquidation retention;
- stock corporate-action/split-like discontinuity guard;
- conservative same-candle stop-first backtest resolution;
- exact label-interval purging / embargo logic;
- Brier baseline correctness and stricter sample gates;
- archive-backed ML/research data instead of only the 250-row working set;
- automatic research cohort support to reduce manual-journal selection bias;
- maturity-matched realized/implied-volatility comparison;
- experimental volatility sizing disabled by default;
- full IndexedDB/research backup with SHA-256;
- reference-snapshot aging warnings;
- shared Engine Contract 54.1 drift invariant.

## Performance / architecture

The original monolithic frontend was split into:

- `public/index.html`
- `public/app.css`
- `public/app.js`
- `public/research-worker.js`

Heavy research/bootstrap/Monte-Carlo/model work has a dedicated Web Worker path. `app.js` remains large, therefore maintainability is improved but not claimed solved completely.

## 11 explicitly mitigated residuals

- **ML-03 · HIGH · Master Verdict double-counts correlated evidence and presents a probability-like 0–100 composite** — Master Verdict is explicitly HEURISTIC_FAMILY_CAPPED with TECH/MODEL/FLOW/CONTEXT family caps; calibrated probability remains separate. Correlated evidence cannot be made statistically independent, so this is mitigated rather than labeled a probability.
- **PERF-01 · HIGH · Frontend is a 717KB single HTML monolith with heavy main-thread research loops** — 717KB HTML monolith split into index.html/app.js/app.css and heavy ML/bootstrap/Monte Carlo moved to research-worker.js. app.js remains large, so maintainability risk is reduced but not eliminated.
- **PERF-02 · MEDIUM · Similar provider/scoring logic exists in browser, Pages Functions and monitor Worker** — ENGINE_CONTRACT_VERSION 54.1 is pinned across browser, research worker, Pages market/external functions and monitor worker with a shared contract JSON + audit invariant. Logic is still distributed, so drift risk is mitigated, not eliminated.
- **COR-06 · MEDIUM · Whale exchange-flow classification/value are heuristic at transaction level** — Whale flow uses per-leg provider attribution and USD values, reports input/output exchange USD and ambiguity; ownership still depends on provider labels, so semantics remain explicitly heuristic.
- **OPS-04 · MEDIUM · Pionex rate coordination is not global across Cloudflare isolates** — Pionex proxy reserves pacing through shared D1 monitor_state when DB is bound, with local-isolate fallback. Global coordination therefore depends on the D1 binding.
- **GOV-02 · MEDIUM · Nasdaq universe is a static snapshot dated 2026-09-18** — Nasdaq static snapshot now exposes age/FRESH-AGING-STALE governance and requires confirmation/warning when stale. Membership is still a snapshot until a live universe provider is configured.
- **VOL-04 · MEDIUM · v53 volatility risk multipliers are heuristic and not OOS-validated** — Experimental volatility sizing is disabled by default and must be explicitly opted in; heuristic multipliers are no longer silently applied. They remain research heuristics until separately OOS-validated.
- **STO-01 · MEDIUM · Research/account-related local data are unencrypted at rest in browser storage** — Optional session-only privacy mode keeps new research/model/flow/Paper state in memory and erases persistent IndexedDB/journal/Paper data. Persistent mode is intentionally still browser storage, not encrypted-at-rest.
- **PWA-01 · LOW · Offline mode is shell-only for most research features** — Offline state is explicit read-only local research mode and network-dependent actions are disabled with aria-disabled. Full online analysis is intentionally not simulated offline.
- **GOV-03 · LOW · Embedded Pionex fallback coin snapshot will age** — Embedded Pionex fallback snapshot exposes age/state and stale warnings; stale membership is not presented as current. Snapshot itself necessarily ages between live refreshes.
- **UX-02 · LOW · Mixed Romanian/English terminology is pervasive** — A Romanian/English research glossary was added and primary explanatory text is Romanian; standard market acronyms remain English by design.

## Remediation matrix — all 62 findings

| ID | Original severity | v54 status | Finding | Verification | Resolution |
|---|---|---|---|---|---|
| BT-01 | HIGH | FIXED | Same-candle stop+target ambiguity is silently dropped in walk-forward backtest | RUNTIME+STATIC | wfTrade() and paramWfTrade() resolve same-candle stop+target conflicts stop-first; runtime fixture asserts -1R and ambiguity counting. |
| COR-02 | HIGH | FIXED | Multi-timeframe engine can report 100% confidence with only one surviving timeframe | RUNTIME+STATIC | mtfComposite() requires >=3/4 coverage, shrinks score by coverage² and caps confidence by coverage; runtime 1-TF fixture returns NEUTRAL/25%. |
| COR-03 | HIGH | FIXED | Historical CVD is accumulated before rows are sorted chronologically | RUNTIME+STATIC | Historical CVD normalizes, sorts and deduplicates provider rows before cumulative delta; runtime descending fixture returns chronological rows and final CVD 130. |
| COR-04 | HIGH | FIXED | Observed 7-day liquidation heatmap is effectively pruned to 30 minutes | STATIC+SYNTHETIC | Observed liquidation memory/heatmap retains and queries 7 days; DB hydration uses 7-day cutoff. |
| COR-01 | HIGH | FIXED | Stale crypto/external state can contaminate another symbol or US-stock verdict | STATIC+SYNTHETIC | Decision state is identity-stamped by market/source/symbol/TF and invalidated on symbol/market changes; async responses are rejected when identity changed. |
| ML-04 | HIGH | FIXED | Data Quality can remain high with missing MTF/context or stale mismatched states | STATIC+SYNTHETIC | masterDataQuality() now includes MTF coverage, identity/source freshness, flow/CVD coverage, external context freshness, model staleness and stock corporate-action guard with hard caps. |
| ML-03 | HIGH | MITIGATED | Master Verdict double-counts correlated evidence and presents a probability-like 0–100 composite | STATIC+SYNTHETIC | Master Verdict is explicitly HEURISTIC_FAMILY_CAPPED with TECH/MODEL/FLOW/CONTEXT family caps; calibrated probability remains separate. Correlated evidence cannot be made statistically independent, so this is mitigated rather than labeled a probability. |
| OPS-01 | HIGH | FIXED | Monitor Worker config ships with placeholder D1/KV IDs | STATIC+SYNTHETIC | wrangler.monitor.toml contains no placeholder IDs; configure-monitor.mjs generates deployment config from required environment IDs. |
| SEC-06 | HIGH | FIXED | Multiple unescaped innerHTML sinks plus no CSP/security headers | STATIC+SYNTHETIC | Frontend JS/CSS split enables CSP; _headers sets CSP/frame/object/referrer/permissions protections; provider/error HTML sinks are escaped and audit checks known dynamic sinks. |
| ML-01 | HIGH | FIXED | ML/calibration uses only the latest 250 localStorage journal rows, not the larger IndexedDB archive | STATIC+SYNTHETIC | researchJournalArchive + researchJournalRows merge IndexedDB history with working set; ML/resolved analyses use the merged archive instead of only 250 localStorage rows. |
| PERF-01 | HIGH | MITIGATED | Frontend is a 717KB single HTML monolith with heavy main-thread research loops | STATIC+SYNTHETIC | 717KB HTML monolith split into index.html/app.js/app.css and heavy ML/bootstrap/Monte Carlo moved to research-worker.js. app.js remains large, so maintainability risk is reduced but not eliminated. |
| COR-05 | HIGH | FIXED | Whale Alert transaction pagination is not followed | STATIC+SYNTHETIC | Whale Alert follows provider next/next_url pagination with deduplication, page cap and completeness flag. |
| ML-02 | HIGH | FIXED | Training cohort depends on manually saved signals | STATIC+SYNTHETIC | Every analysis seeds an AUTO_RESEARCH prospective cohort; user save marks/merges rather than defining the training cohort. |
| SEC-03 | HIGH | FIXED | Push subscription endpoint accepts unauthenticated arbitrary endpoints when Origin is absent | RUNTIME+STATIC | Push write routes require APP_API_TOKEN plus strict same-origin Origin; missing-Origin runtime test returns 403. |
| SEC-05 | HIGH | FIXED | Paid-provider proxy endpoints are public and can burn API quota | RUNTIME+STATIC | Paid/provider proxy routes require APP_API_TOKEN and rate limits; public config/health remains non-secret only. |
| SEC-02 | HIGH | FIXED | Monitor trigger can be invoked without Origin and receives the server monitor token | RUNTIME+STATIC | Monitor trigger requires APP_API_TOKEN and strict Origin for POST; missing-Origin runtime test returns 403. |
| SEC-01 | HIGH | FIXED | Pionex private account data endpoint has no application authentication | RUNTIME+STATIC | Pionex private account endpoint requires APP_API_TOKEN and rate limiting; runtime no/wrong token tests return 401. |
| SEC-04 | HIGH | FIXED | D1 history GET is public and not partitioned by user | STATIC+SYNTHETIC | History API requires APP_API_TOKEN; D1 browser history is tenant-keyed from HISTORY_TENANT or token digest, and queries/writes filter tenant. Monitor rows remain separately tagged monitor. |
| COR-10 | HIGH | FIXED | Twelve Data intraday series are unadjusted for splits but engine treats them as continuous prices | STATIC+SYNTHETIC | Twelve Data daily path uses split-adjusted series; intraday path detects split-like discontinuities and truncates/guards contaminated history. |
| VOL-01 | HIGH | FIXED | IV/RV ratio compares unmatched horizons | STATIC+SYNTHETIC | IV/RV comparison now matches RV horizon to nearest option expiry and uses maturity-specific realized volatility. |
| A11Y-01 | MEDIUM | FIXED | 22 form controls are potentially unlabeled and 4 canvases lack accessible alternatives | STATIC+SYNTHETIC | Form/button/canvas audit found no unlabeled controls; canvas alternatives/ARIA labels were added and static A11Y checks pass. |
| PERF-02 | MEDIUM | MITIGATED | Similar provider/scoring logic exists in browser, Pages Functions and monitor Worker | STATIC+SYNTHETIC | ENGINE_CONTRACT_VERSION 54.1 is pinned across browser, research worker, Pages market/external functions and monitor worker with a shared contract JSON + audit invariant. Logic is still distributed, so drift risk is mitigated, not eliminated. |
| BT-02 | MEDIUM | FIXED | Rolling examples can have overlapping future outcome windows | STATIC+SYNTHETIC | rollingPoints() advances by the full outcome horizon and stores eventStartTs/eventEndTs, avoiding overlapping outcome windows. |
| STO-02 | MEDIUM | FIXED | Standard Backup does not contain the full IndexedDB archive | STATIC+SYNTHETIC | Full backup exports IndexedDB records/reports/meta in addition to working sets and wraps payload in mandatory SHA-256 integrity metadata. |
| OPS-05 | MEDIUM | FIXED | No pinned runtime/dependencies, lockfile, lint/typecheck or shipped automated test suite | STATIC+SYNTHETIC | Node 22.x/npm 10.9.2 are pinned; package-lock and automated syntax/security/runtime/static audit scripts ship in the artifact and run via npm test/predeploy. |
| ML-05 | MEDIUM | FIXED | Governed ensemble gives 25% weight to a PAV calibrator fit/evaluated on the full resolved sample | STATIC+SYNTHETIC | PAV governance now uses out-of-fold diagnostics and is usable only with sufficient OOF sample and positive skill. |
| OPS-02 | MEDIUM | FIXED | D1 schema/worker has no retention pruning | STATIC+SYNTHETIC | Cloud monitor applies configurable D1 retention pruning to monitor/history tables and records last-retention state. |
| GOV-01 | MEDIUM | FIXED | Visible “AUDITED” badge can imply live/security validation that has not occurred | STATIC+SYNTHETIC | The release keeps the visible AUDITED badge but pairs it with an explicit `AUDIT: STATIC+RUNTIME · LIVE UNVERIFIED` scope chip and Health disclosure; DEPLOY_V54.md separately requires post-deploy live validation. |
| COR-08 | MEDIUM | FIXED | CVD coverage uses row count, not timestamp continuity/uniqueness | STATIC+SYNTHETIC | Historical CVD coverage uses unique timestamps, interval continuity, start/end coverage and missing-interval counts, not row count alone. |
| STO-03 | MEDIUM | FIXED | Paper working set is capped at 200 localStorage trades | STATIC+SYNTHETIC | Paper analytics merge the IndexedDB archive with the local working set instead of being limited to 200 localStorage trades. |
| ML-06 | MEDIUM | FIXED | Brier-skill baseline in modelEval uses test-set prevalence | STATIC+SYNTHETIC | Brier-skill baseline uses training/base-rate metadata per model/fold rather than test-set prevalence; worker pooled metrics use each prediction base. |
| ML-10 | MEDIUM | FIXED | Experiment Registry has duplicate detection but no statistical correction for repeated parameter search | STATIC+SYNTHETIC | Experiment Registry adds locked holdout, bootstrap candidate-vs-baseline difference test, Bonferroni adjustment and family trial cap. |
| ML-09 | MEDIUM | FIXED | ML label is binary netR>0 and ignores payoff magnitude | STATIC+SYNTHETIC | ML target is utility-aware (>=0.10R) and samples are weighted by capped absolute R utility, rather than binary netR>0 only. |
| VOL-03 | MEDIUM | FIXED | Displayed ATM IV is an ATM-band proxy, not formal forward/delta ATM | STATIC+SYNTHETIC | Options/volatility UI now labels ATM values explicitly as ATM-band IV proxy; no formal delta/forward ATM claim. |
| COR-07 | MEDIUM | FIXED | Coin Metrics request is limited to page_size=100 without pagination | STATIC+SYNTHETIC | Coin Metrics follows pagination instead of relying on a single page_size=100 response. |
| COR-09 | MEDIUM | FIXED | Historical CVD fallback skips the 30m level available to Startup plans | STATIC+SYNTHETIC | Historical CVD fallback ladder is requested interval -> 30m -> 4h with attempts exposed. |
| COR-06 | MEDIUM | MITIGATED | Whale exchange-flow classification/value are heuristic at transaction level | STATIC+SYNTHETIC | Whale flow uses per-leg provider attribution and USD values, reports input/output exchange USD and ambiguity; ownership still depends on provider labels, so semantics remain explicitly heuristic. |
| ML-08 | MEDIUM | FIXED | Purged walk-forward uses a fixed observation gap, not exact label-interval overlap | STATIC+SYNTHETIC | Purged walk-forward stores exact outcome intervals and removes train labels whose outcome interval overlaps the test start; fixed gap remains only an additional buffer. |
| OPS-03 | MEDIUM | FIXED | Worker broadcasts pushes by listing all KV subscriptions and sending sequentially | STATIC+SYNTHETIC | Push broadcast is batched with bounded concurrency instead of fully sequential per-subscription delivery. |
| VOL-06 | MEDIUM | FIXED | Garman-Klass can underrepresent overnight jump risk in stocks | STATIC+SYNTHETIC | Stock volatility includes separate overnight-gap/intraday diagnostics so Garman-Klass is not presented as complete jump risk. |
| OPS-04 | MEDIUM | MITIGATED | Pionex rate coordination is not global across Cloudflare isolates | STATIC+SYNTHETIC | Pionex proxy reserves pacing through shared D1 monitor_state when DB is bound, with local-isolate fallback. Global coordination therefore depends on the D1 binding. |
| GOV-02 | MEDIUM | MITIGATED | Nasdaq universe is a static snapshot dated 2026-09-18 | STATIC+SYNTHETIC | Nasdaq static snapshot now exposes age/FRESH-AGING-STALE governance and requires confirmation/warning when stale. Membership is still a snapshot until a live universe provider is configured. |
| ML-07 | MEDIUM | FIXED | Repeated model/version experiments reuse the same chronological OOS segment | STATIC+SYNTHETIC | Experiment development OOS excludes a locked final 15%, repeated family trials are counted/penalized, and the locked holdout is not reused for candidate selection. |
| VOL-04 | MEDIUM | MITIGATED | v53 volatility risk multipliers are heuristic and not OOS-validated | STATIC+SYNTHETIC | Experimental volatility sizing is disabled by default and must be explicitly opted in; heuristic multipliers are no longer silently applied. They remain research heuristics until separately OOS-validated. |
| SEC-07 | MEDIUM | FIXED | History POST sameOrigin check also allows missing Origin | RUNTIME+STATIC | History POST requires strict same-origin with Origin present; missing Origin returns 403 in runtime security test. |
| BT-03 | MEDIUM | FIXED | Several research gates allow very small trade counts | STATIC+SYNTHETIC | Research thresholds raised: OOS threshold selection and forward retirement require N>=20; calibration uses N>=30 calibrated / N>=20 watch; empirical setup estimates require N>=20. |
| STO-01 | MEDIUM | MITIGATED | Research/account-related local data are unencrypted at rest in browser storage | STATIC+SYNTHETIC | Optional session-only privacy mode keeps new research/model/flow/Paper state in memory and erases persistent IndexedDB/journal/Paper data. Persistent mode is intentionally still browser storage, not encrypted-at-rest. |
| COR-12 | MEDIUM | FIXED | True trade-flow CVD uses a count-limited history, not fixed elapsed-time windows | STATIC+SYNTHETIC | True trade-flow CVD fetches an elapsed 15-minute window over multiple aggTrades pages and records start/end coverage instead of a single count-limited page. |
| COR-11 | MEDIUM | FIXED | Date-only stock bars are hard-coded to 20:00 UTC | STATIC+SYNTHETIC | US-stock date-only timestamps are normalized using exchange/DST-aware session handling rather than hard-coded 20:00 UTC. |
| UX-01 | MEDIUM | FIXED | Dashboard and Verdict Center expose 53 modules with limited progressive disclosure | STATIC+SYNTHETIC | Verdict Center details/family/module matrix are behind progressive disclosure (<details>) with concise top-level KPIs retained. |
| VOL-02 | MEDIUM | FIXED | 1d/7d implied expected moves reuse nearest-expiry IV without term interpolation | STATIC+SYNTHETIC | Expected moves interpolate/match IV across term structure for 1d/7d horizons instead of reusing nearest expiry IV blindly. |
| VOL-05 | MEDIUM | FIXED | US-stock intraday annualization uses approximate fixed bars/year | STATIC+SYNTHETIC | US-stock annualization derives observed bars/year from loaded intraday cadence/session data instead of only fixed approximations. |
| A11Y-02 | LOW | FIXED | Command palette and More drawer lack robust dialog semantics/focus management | STATIC+SYNTHETIC | Command palette and More drawer now use dialog semantics, aria-modal/labels, tabindex and focus helpers/return-focus behavior. |
| SEC-08 | LOW | FIXED | Monitor worker /health is public | STATIC+SYNTHETIC | Unauthenticated monitor /health now returns only {ok:true}; detailed service/config state requires MONITOR_TOKEN. |
| STO-05 | LOW | FIXED | Research checksum falls back to FNV-1a when WebCrypto is unavailable | STATIC+SYNTHETIC | Research/backup integrity requires WebCrypto SHA-256; weak FNV fallback was removed. |
| STO-04 | LOW | FIXED | Local DB migration marker remains migration-v48 while schema is v53 | STATIC+SYNTHETIC | Migration bookkeeping uses migration-v54 and schema-migrations records covering 48..54. |
| PWA-01 | LOW | MITIGATED | Offline mode is shell-only for most research features | STATIC+SYNTHETIC | Offline state is explicit read-only local research mode and network-dependent actions are disabled with aria-disabled. Full online analysis is intentionally not simulated offline. |
| PWA-02 | LOW | FIXED | Service-worker install uses cache.addAll for shell assets | STATIC+SYNTHETIC | Service-worker shell install uses per-asset Promise.allSettled/cache.put so one optional asset failure does not abort all cached shell assets. |
| GOV-03 | LOW | MITIGATED | Embedded Pionex fallback coin snapshot will age | STATIC+SYNTHETIC | Embedded Pionex fallback snapshot exposes age/state and stale warnings; stale membership is not presented as current. Snapshot itself necessarily ages between live refreshes. |
| UX-02 | LOW | MITIGATED | Mixed Romanian/English terminology is pervasive | STATIC+SYNTHETIC | A Romanian/English research glossary was added and primary explanatory text is Romanian; standard market acronyms remain English by design. |
| VOL-07 | LOW | FIXED | 2σ/3σ shock counts use sample sigma and are not Gaussian tail probabilities | STATIC+SYNTHETIC | UI now calls these empirical >2×SD/>3×SD exceedances and no longer implies Gaussian tail probabilities. |
| VOL-08 | LOW | FIXED | Volatility-cone windows are heavily overlapping | STATIC+SYNTHETIC | Volatility cone reports both overlapping and non-overlapping samples/percentiles, exposing sample dependence rather than hiding it. |

## Release limitations

- This audit does not prove production Cloudflare routing/bindings or provider-plan entitlement.
- Exchange/provider availability, live quotas and CORS/network behavior require post-deploy validation.
- Browser persistent mode is not encrypted-at-rest; use the session-only privacy mode when persistence is undesirable.
- Module consensus is descriptive; correlated indicators are not independent probability observations.
- Static Nasdaq/Pionex fallback universes age and are explicitly governed/warned rather than represented as live membership.
- Provider-attributed whale/exchange classification remains dependent on provider labels.
- There is no real-money execution route in this release.

## Verdict

The v54 artifact is suitable to package as the hardened **research / paper-trading release** after the included test gate passes. The remediation matrix has **0 OPEN** audit items. The 11 MITIGATED entries remain visible because claiming they were completely eliminated would overstate what the implementation can prove.
