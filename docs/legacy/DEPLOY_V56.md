# v56 · VERDICT EXPLAINER · Deployment

This is the authoritative deployment guide for v56. v56 runs on the same hardened **Engine Contract 54.1** and **data schema 54** as v54/v55. No new provider key or database migration is required by the Verdict Explainer itself.

## Cloudflare Pages

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**
- Keep `functions/` at repository root.

PWA cache: `crypto-radar-v56`.

`/api/*` remains network-only in the Service Worker.

## Existing security configuration

Keep the v54/v55 hardened configuration:

- `APP_API_TOKEN` — required for protected Pages routes;
- optional `API_RATE_LIMIT` KV;
- optional provider secrets only for providers you use;
- optional `DB` D1 binding for cloud history/shared Pionex pacing;
- optional `PUSH_SUBSCRIPTIONS` KV;
- monitor Worker configuration as documented in the hardened release.

No API token is embedded in the v56 frontend or backup.

## Pre-deploy gate

Run:

```bash
npm test
```

Expected:

```text
V56_SYNTAX_PASS 32 executable JS/MJS surfaces + JSON manifests
V56_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V56_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V56_VERDICT_EXPLAINER_PASS base=SHORT risk=BLOCAT_·_1 agreement=67% support=2 opposition=1
V56_STATIC_AUDIT_PASS 53 hardening + wide-ui invariants
V56_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

## First production validation

1. Confirm the visible badge: **`v56 · VERDICT EXPLAINER · AUDITED`**.
2. Hard reload or reopen the installed PWA so `crypto-radar-v56` replaces the old cache.
3. Run a BTC analysis.
4. In **Master Verdict · Ce fac acum?**, confirm the new top block shows:
   - Verdict executabil;
   - Bias de bază;
   - Acord direcțional;
   - Prob. calibrată;
   - Consens ponderat;
   - Coverage module;
   - Data quality.
5. Confirm `De ce susține direcția` and `Ce se opune` populate from current modules.
6. Force or observe a `WAIT`; confirm `Ce trebuie să se schimbe` contains explicit unlock conditions instead of only a generic WAIT message.
7. If WAIT has a base LONG/SHORT candidate, confirm the trade map is marked **INACTIV**.
8. When a LONG/SHORT passes all gates, confirm the plan changes to active research/paper context.
9. Confirm the existing full-width v55 desktop layout is retained.
10. Confirm mobile navigation still works below 980 px.
11. Confirm Health shows app version v56 and Engine Contract **54.1**.
12. Re-test protected API routes after entering `APP_API_TOKEN` in Settings.

## Validation boundary

The packaged audit is static + deterministic runtime + mocked API/security validation. It does not claim live Cloudflare/provider/account/device validation from this environment.
