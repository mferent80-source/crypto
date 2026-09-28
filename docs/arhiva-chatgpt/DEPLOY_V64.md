# v64 · MARKET BREADTH INTELLIGENCE PRO · Deployment

This is the authoritative deployment guide for v64. v64 retains Engine Contract `54.1`, data schema `54`, v63 Live-Cost/Execution Realism and all earlier security controls.

## 1. Cloudflare Pages

Deploy with:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**

Keep `functions/` at repository root. The PWA cache is `crypto-radar-v64`; `/api/*` remains network-only in the Service Worker.

## 2. Existing protected configuration

Keep the hardened configuration already used by v63:

- `APP_API_TOKEN` for protected Pages APIs;
- optional `API_RATE_LIMIT` KV;
- optional `DB` D1 binding;
- provider credentials only on the server side;
- read-only Pionex private account access if configured;
- monitor/push bindings as previously documented.

No Market Breadth API secret is embedded in the browser.

## 3. Market Breadth behavior

Open **Dashboard → Market Breadth Pro**.

`Refresh` runs the lower-cost Fast breadth path. `Full universe` explicitly requests broader constituent coverage and may generate materially more public/provider requests.

The breadth card reports state, score, participation, trend, volume, momentum, highs/lows, divergence and coverage. Missing or partial constituent history lowers reported coverage rather than being silently counted as neutral.

Market Breadth is a bounded context signal. It does not place orders and does not independently override Master Verdict hard risk/data gates.

## 4. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final outputs include:

```text
V64_SYNTAX_PASS 126 executable JS/MJS surfaces + JSON manifests
V64_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V64_RUNTIME_PASS ...
V64_VERDICT_EXPLAINER_PASS ...
V64_PROFIT_READINESS_PASS ...
V64_REPLAY_RUNTIME_PASS ... future_isolated=1 outcome_changed=1
V64_PAPER_RUNTIME_PASS ...
V64_UI_PARITY_PASS ids=1342 base_ids=1314 functions=861 base_functions=852 lost_ids=0 lost_functions=0 dom_refs=1150
V64_EDGE_INHERITED_PASS ...
V64_GOVERNANCE_RUNTIME_PASS ...
V64_UNIVERSE_RUNTIME_PASS ...
V64_PROVIDER_HEALTH_PASS ...
V64_LIVE_EXECUTION_PASS ...
V64_BREADTH_RUNTIME_PASS state=BULLISH score=76.4 participation=80 proxy=59.5 longAlign=0.50 forwardN=4
V64_STATIC_AUDIT_PASS 27 inherited hardening + market-breadth cross-module invariants
V64_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## 5. First production validation

1. Confirm badge **`v64 · MARKET BREADTH INTELLIGENCE PRO · AUDITED`**.
2. Hard reload/reopen the installed PWA so `crypto-radar-v64` replaces the v63 cache.
3. Run a normal BTC analysis; verify Market Breadth Pro populates and displays coverage.
4. Press **Full universe** only when desired and confirm progress/provider load remains acceptable.
5. Run a Nasdaq analysis; verify breadth is based on stock-universe participation rather than QQQ alone.
6. Confirm Master Verdict displays Market Breadth and that breadth appears as support/opposition context rather than a hard standalone trade trigger.
7. Open Scanner; verify the breadth strip populates and opportunity ranking changes only by the bounded breadth adjustment.
8. Run Historical Scanner and verify historical breadth KPIs are produced from historical scan rows.
9. In Replay, confirm archived breadth shows `N/A` when no breadth snapshot existed at or before the replay timestamp; it must not borrow current breadth.
10. Start/continue Forward Validation and verify performance-by-breadth-regime counts grow only from signals carrying stored breadth context.
11. Resolve Paper/Shadow outcomes and inspect Auto Review for breadth alignment/opposition attribution.
12. Open Local Data and verify `Market breadth v64` snapshot count increases.
13. Generate a research bundle and verify `marketBreadthV64` evidence is included.
14. Re-run Provider Health, Profit Readiness and Live Readiness; Market Breadth must not bypass their hard gates.

## 6. Validation boundary

The packaged audit validates software invariants with static checks, deterministic fixtures and exact v63→v64 parity. It does **not** claim live Cloudflare/provider entitlement, all-constituent historical availability, future breadth predictive power, profitability or real-money execution has been validated from the build environment.
