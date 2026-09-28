# v62 · HISTORICAL UNIVERSE & DATA INTEGRITY PRO · Deployment

This is the authoritative deployment guide for v62.

## 1. Cloudflare Pages

Deploy with:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**

Keep `functions/` at repository root.

PWA cache: `crypto-radar-v62`. `/api/*` remains network-only in the Service Worker.

## 2. Required security configuration

Configure `APP_API_TOKEN` for protected Pages APIs. The new `/api/provider-health` route uses the same protected-session model as the other sensitive server routes.

Recommended existing bindings remain:

- `API_RATE_LIMIT` KV for shared abuse/rate control;
- `DB` D1 for cloud history where enabled;
- `PUSH_SUBSCRIPTIONS` KV if push is enabled;
- monitor-worker bindings/secrets if the monitor worker is deployed.

## 3. Optional provider configuration

Server-side only, as applicable:

- `TWELVE_DATA_API_KEY`
- `TRADING_ECONOMICS_API_KEY`
- `WHALE_ALERT_API_KEY`
- `COINGLASS_API_KEY`
- `COINGECKO_API_KEY`
- read-only `PIONEX_API_KEY` + `PIONEX_API_SECRET`

Never put provider/account secrets in `public/`, frontend constants, source-controlled client code, backups or browser persistent storage.

The Provider Health endpoint reports only whether optional credentials are configured; it does not expose secret values.

## 4. Historical Universe behavior

Nasdaq/US-stock Historical Scanner now resolves its universe at the selected anchor date inside the supported reconstruction window beginning 2025-12-22.

The UI shows:

- universe reconstruction mode;
- anchor date;
- membership events applied;
- residual-bias label.

`RECONSTRUCTED_OFFICIAL` means the applied membership chain is composed from encoded official events. `RECONSTRUCTED_MIXED` means at least one corporate-action reconciliation event was needed. `OUTSIDE_COVERAGE` means the requested anchor predates the embedded reconstruction window and the app will not pretend the current reference list is historically exact.

Crypto Historical Scanner still uses current Pionex membership and continues to disclose that bias.

## 5. Provider Health / Data Integrity

Open **Health → Live Provider Health · Data Integrity Center**.

A normal refresh checks low-cost public provider endpoints and combines those results with local data freshness/alignment/coverage evidence. A deep refresh may additionally probe the Pionex public-symbol endpoint.

Paid/private integrations are displayed only as configured/unconfigured. A green health state is an operational signal, not proof that all paid-provider entitlements or future requests will work.

## 6. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final gates include:

```text
V62_SYNTAX_PASS ...
V62_SECURITY_RUNTIME_PASS ...
V62_RUNTIME_PASS ...
V62_VERDICT_EXPLAINER_PASS ...
V62_PROFIT_READINESS_PASS ...
V62_REPLAY_RUNTIME_PASS ...
V62_PAPER_RUNTIME_PASS ...
V62_UI_PARITY_PASS ... lost_ids=0 lost_functions=0
V62_EDGE_INHERITED_PASS ...
V62_GOVERNANCE_RUNTIME_PASS ...
V62_UNIVERSE_RUNTIME_PASS current=101 ...
V62_PROVIDER_HEALTH_PASS ... auth=1 secrets=0
V62_STATIC_AUDIT_PASS ...
V62_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## 7. First production validation

1. Confirm badge **`v62 · HISTORICAL UNIVERSE & DATA INTEGRITY PRO · AUDITED`**.
2. Hard reload/reopen the installed PWA so `crypto-radar-v62` replaces the previous cache.
3. Enter `APP_API_TOKEN` in the protected API session and open Health.
4. Run Provider Health and verify Binance Spot/Futures, Deribit and mempool.space rows populate without exposing any secret value.
5. If desired, run the deep provider check and verify the Pionex public probe behaves independently of private account credentials.
6. Confirm optional paid providers show configured/unconfigured rather than credential contents.
7. Run a current US-stock analysis and verify normal Master Verdict/Decision Core behavior is unchanged.
8. Open Replay & Historical Scanner, select US Stocks/Nasdaq and choose historical anchors around encoded membership changes; verify the universe mode/date/event count changes appropriately.
9. Verify anchors before 2025-12-22 are explicitly marked outside historical-universe coverage rather than silently treated as exact.
10. Export a Historical Scanner record and confirm `universeMeta`/membership-bias metadata are present.
11. Open Local Data and confirm `Provider health v62` snapshot count increases.
12. Generate a research bundle and confirm provider-health and Nasdaq membership evidence datasets are included.
13. Re-run Profit Readiness, Shadow Live, Paper v3 and Adaptive Governance to confirm inherited behavior remains intact.

## 8. Validation boundary

The packaged audit covers static analysis, deterministic runtime fixtures, mocked protected provider-health calls, historical-universe reconstruction fixtures and exact v61→v62 UI/function parity. It does **not** claim that Cloudflare production bindings, all provider entitlements/quotas, all historical membership data before the coverage window, exchange routing, or real-money execution have been validated from the build environment.
