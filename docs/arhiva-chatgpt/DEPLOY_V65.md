# v65 · DECISION INTELLIGENCE OS PRO · Deployment

This is the authoritative deployment guide for v65. Older deployment guides are historical only.

## 1. Cloudflare Pages

Deploy with:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**

Keep `functions/` at repository root. The PWA cache is `crypto-radar-v65`; `/api/*` remains network-only in the Service Worker.

## 2. Existing security/provider configuration

v65 retains the hardened configuration from prior releases:

- `APP_API_TOKEN` for protected Pages APIs;
- optional `API_RATE_LIMIT` KV;
- optional `DB` D1 history binding;
- optional `PUSH_SUBSCRIPTIONS` KV;
- optional provider secrets such as `TWELVE_DATA_API_KEY`, `TRADING_ECONOMICS_API_KEY`, `WHALE_ALERT_API_KEY`, `COINGLASS_API_KEY`, `COINGECKO_API_KEY`;
- read-only Pionex credentials where used.

Provider/account secrets remain server-side. Do not put them in `public/`, source-controlled frontend constants or browser persistent storage.

## 3. Decision Intelligence OS behavior

Open the Dashboard after a normal analysis. The new **Decision Intelligence OS Pro** card must show all twelve engines:

1. Regime Intelligence Pro
2. Liquidity & Market Structure
3. Cross-Asset Confirmation
4. Signal Conflict Resolver
5. Adaptive Entry Engine
6. Dynamic Exit Intelligence
7. Portfolio Opportunity Allocator
8. False-Signal / Failure Pattern Memory
9. Event Risk Engine
10. Decision Replay / Why Was I Wrong?
11. Live Performance Control Room
12. Kill Switch / Capital Preservation

Open **Decision Center** to verify the same instruments appear in the full Verdict view.

### Capital-preservation priority

`NO NEW TRADES` from the Kill Switch is a hard gate for new Paper entries and for an otherwise-active Master Verdict. `HIGH CONFLICT` is also a Master Verdict blocker. Neither feature creates live orders.

### Entry / exit behavior

The Adaptive Entry Engine can select market, aggressive limit, breakout, retest or structure-limit behavior. Dynamic Exit can recommend hold, tighten, break-even/trail, partial take-profit or close/protect. These actions are research/Paper guidance and are not broker/exchange order commands.

## 4. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final gates include:

```text
V65_SYNTAX_PASS ...
V65_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V65_RUNTIME_PASS ...
V65_VERDICT_EXPLAINER_PASS ...
V65_PROFIT_READINESS_PASS ...
V65_REPLAY_RUNTIME_PASS ...
V65_PAPER_RUNTIME_PASS ...
V65_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V65_EDGE_INHERITED_PASS ...
V65_GOVERNANCE_RUNTIME_PASS ...
V65_UNIVERSE_RUNTIME_PASS ...
V65_PROVIDER_HEALTH_PASS ...
V65_LIVE_EXECUTION_PASS ...
V65_BREADTH_RUNTIME_PASS ...
V65_DECISION_OS_PASS ...
V65_STATIC_AUDIT_PASS ...
V65_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## 5. First production validation

1. Confirm badge **`v65 · DECISION INTELLIGENCE OS PRO · AUDITED`**.
2. Hard reload/reopen the PWA so `crypto-radar-v65` replaces the older cache.
3. Run a normal BTC analysis and confirm all twelve Dashboard cards populate.
4. Open Decision Center and confirm the full Verdict view shows the same twelve modules.
5. Confirm Master Verdict shows both `Decision OS v65` and `Capital preservation`.
6. Verify a normal healthy state does not create a false Kill Switch block.
7. Verify a known blocker (for example an existing Paper circuit-breaker pause in test/research conditions) changes the Kill Switch to `NO NEW TRADES` and prevents a new Paper setup.
8. Verify a `HIGH CONFLICT` state keeps the active candidate at `WAIT` rather than allowing directional confidence alone to override it.
9. Open Paper with an active position and verify Dynamic Exit changes with position R/conflict context.
10. Run Scanner and verify Portfolio Opportunity Allocator has candidates to allocate when portfolio risk allows it.
11. Refresh economic/news context and verify Event Risk reflects the current calendar/news state.
12. Resolve several journal outcomes and verify Failure Pattern Memory / Control Room begin using evidence rather than remaining `LEARNING`.
13. Open Local Data and confirm `Decision OS v65` snapshot count increases.
14. Export a research bundle and verify `decisionIntelV65` is present.
15. Recheck inherited Market Breadth, Live Readiness, Provider Health, Shadow Live, Paper v3 and Profit Readiness behavior.

## 6. Validation boundary

The packaged audit validates software invariants using static checks, deterministic runtime fixtures and mocked provider/security states. It does not prove future profitability, real broker/exchange fills, live provider entitlements/quotas, unscheduled-event coverage or real-money execution safety. v65 contains no automatic live-money order placement route.
