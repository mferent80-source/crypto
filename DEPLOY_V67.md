# v67 · PRODUCTION TRADING OPERATIONS PRO · Deployment

This is the authoritative deployment guide for v67.

## 1. Cloudflare Pages

Deploy with the inherited static/PWA configuration:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**
- keep `functions/` at repository root.

The PWA cache is `crypto-radar-v67`. `/api/*` remains network-only.

## 2. Security / provider configuration

Keep the hardened configuration inherited from prior releases:

- `APP_API_TOKEN` for protected Pages APIs;
- optional `API_RATE_LIMIT` KV;
- optional `DB` D1 binding;
- optional `PUSH_SUBSCRIPTIONS` KV and monitor-worker configuration;
- provider credentials only on the server side.

v67 introduces no new provider secret and no live-order credential.

## 3. Operations Control Plane

v67 adds a browser-side production-style operations layer for Paper/Shadow research:

- watchdog / heartbeat;
- restart recovery snapshot;
- local Paper/Shadow state reconciliation;
- per-channel duplicate-signal protection;
- incident log;
- health alarms;
- manual pause/resume;
- Paper flatten-and-pause control.

Operational hard failures block new Paper/Shadow entries. They do not change the underlying LONG/SHORT directional engine.

Paper and Shadow deduplication are intentionally scoped separately. The same setup may therefore be tracked once in Paper and once in Shadow for comparative research.

## 4. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final gates include:

```text
V67_SYNTAX_PASS 180 executable JS/MJS surfaces + JSON manifests
V67_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V67_RUNTIME_PASS ...
V67_VERDICT_EXPLAINER_PASS ...
V67_PROFIT_READINESS_PASS ...
V67_REPLAY_RUNTIME_PASS ...
V67_PAPER_RUNTIME_PASS ...
V67_UI_PARITY_PASS ids=1408 base_ids=1382 functions=949 base_functions=922 lost_ids=0 lost_functions=0 dom_refs=1168
V67_EDGE_INHERITED_PASS ...
V67_GOVERNANCE_RUNTIME_PASS ...
V67_UNIVERSE_RUNTIME_PASS ...
V67_PROVIDER_HEALTH_PASS ...
V67_LIVE_EXECUTION_PASS ...
V67_BREADTH_RUNTIME_PASS ...
V67_DECISION_OS_PASS ...
V67_CALIBRATION_RUNTIME_PASS ...
V67_OPERATIONS_RUNTIME_PASS fp=1 cooldown=COOLDOWN_DUPLICATE active=ACTIVE_DUPLICATE reconcile=2 normal=100 degraded=80 hard=SAFE_MODE
V67_STATIC_AUDIT_PASS 20 operations-control + inherited edge/decision invariants
V67_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## 5. First production validation

1. Confirm badge **`v67 · PRODUCTION TRADING OPERATIONS PRO · AUDITED`**.
2. Hard reload/reopen the installed PWA so `crypto-radar-v67` replaces the previous cache.
3. Open **Health → Production Trading Operations** and confirm watchdog status, score and heartbeat update.
4. Run a normal Crypto or Nasdaq analysis and verify **Operations v67** appears in Master Verdict / Decision Center.
5. Add one Paper setup; attempt the same Paper setup again and confirm the duplicate guard blocks it.
6. Add the same setup to Shadow Live and confirm Paper does not incorrectly block the separate Shadow channel.
7. Use manual pause and confirm both new Paper and new Shadow entries are blocked while existing research state remains visible.
8. Resume operations and confirm the block clears if no other hard operational issue exists.
9. Trigger **Reconcile** and verify duplicate local IDs/fingerprints are reported accurately.
10. Reload the application with active Paper/Shadow simulations and inspect Recovery status / incident log.
11. Verify Provider Health degradation and inherited Kill Switch state are reflected in Operations status.
12. Use **Flatten Paper + Pause** only on Paper simulations and confirm no live-order route is called.
13. Open Local Data and confirm `Operations v67` snapshots increment.
14. Generate a research bundle and confirm `operationsV67` and `opsIncidentsV67` are included.
15. Re-run Profit Readiness, Live Readiness, Market Breadth, Decision OS and Edge Validation to confirm inherited behavior remains intact.

## 6. Operational limitations

The v67 watchdog runs in the browser/PWA. Browser tab suspension, device sleep, process termination, network loss and platform timer throttling can delay it. Therefore it should not be represented as a broker/exchange-grade always-on daemon.

Restart recovery reconciles stored Paper/Shadow simulation state; it cannot infer exchange-side fills that were never observed. There is still no real-money order-placement route in v67.

## 7. Validation boundary

The packaged audit covers static analysis, deterministic runtime fixtures, mocked security/provider gates, exact v66→v67 UI/function parity and the dedicated operations fixture. It does not claim live Cloudflare uptime, provider entitlement/quota, broker/exchange matching-engine continuity or future profitability were proven from the build environment.
