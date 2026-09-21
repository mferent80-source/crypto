# v55 · WIDE TERMINAL UI · Deployment

This is the authoritative deployment guide for v55. v55 is a **UI/layout release on top of the v54 hardened engine**. Engine Contract remains **54.1** and the IndexedDB/data schema remains **54** intentionally because no research-data schema was changed.

## 1. Cloudflare Pages

Deploy the repository with:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**

The repository must keep `functions/` at its root.

The PWA cache is `crypto-radar-v55`; `/api/*` remains network-only in the Service Worker.

## 2. Required security secret

Set on the Pages project:

`APP_API_TOKEN`

Use a long random value. Protected routes return 401 when the browser omits/uses the wrong token and 503 when the server secret is not configured.

After opening the app, go to **Settings → Protected API session**, enter the same token and save it. It is stored only in `sessionStorage`; it is not included in backups.

Protected routes remain the same as v54: Pionex proxy paths, stock/provider intelligence, D1 history, monitor control, push subscription writes and Pionex read-only account data. Direct Binance browser analysis remains independent of this token.

## 3. Recommended rate-limit binding

Bind a Cloudflare KV namespace to Pages as:

`API_RATE_LIMIT`

Without it, the app falls back to per-isolate in-memory rate limiting. With it, API abuse control is shared more consistently across isolates.

## 4. Optional provider secrets

Configure only the providers you use:

- `TWELVE_DATA_API_KEY`
- `TRADING_ECONOMICS_API_KEY`
- `WHALE_ALERT_API_KEY`
- `COINGLASS_API_KEY`
- `COINGECKO_API_KEY`
- `PIONEX_API_KEY` + `PIONEX_API_SECRET` — read-only account panel only

Do not put provider secrets in `public/`, GitHub source, localStorage or frontend constants.

## 5. D1 / Push / Monitor

The v54 hardening configuration is unchanged:

- D1 Pages binding: `DB`
- optional shared rate-limit KV: `API_RATE_LIMIT`
- Push KV: `PUSH_SUBSCRIPTIONS`
- monitor Worker secrets: `MONITOR_TOKEN`, VAPID keys and optional stock provider key
- optional `ALLOW_BROWSER_HISTORY_WRITES=1` only when authenticated browser research writes are intended

For a fresh D1 database:

```bash
wrangler d1 execute crypto-radar-history --remote --file=db/schema.sql
```

The scheduled monitor remains separate from Pages. Generate its deploy config with:

```bash
npm run monitor:config
```

then deploy with:

```bash
npm run monitor:deploy
```

## 6. v55 Wide Terminal behavior

Desktop layout now uses the monitor width instead of a centered narrow column.

At desktop widths:

- sidebar contracts to ~205 px, 195 px on larger displays and 188 px on ultrawide displays;
- `main` has no desktop max-width cap;
- the Dashboard uses a 24-column terminal grid;
- at 2200 px+ it expands to a 30-column ultrawide grid;
- chart grows from 430 px to 470/510 px on larger displays;
- Master Verdict, Verdict Center, chart, context, flow, volatility and technical cards are reflowed into parallel columns;
- toolbar controls remain on one row when space allows.

Below 980 px, the proven v54 mobile navigation/layout path is retained.

## 7. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final results:

```text
V55_SYNTAX_PASS ... executable JS/MJS surfaces + JSON manifests
V55_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V55_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V55_STATIC_AUDIT_PASS 48 hardening + wide-ui invariants
V55_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

`npm run deploy` executes the same predeploy test gate before Pages deployment.

## 8. First production validation

After deploy:

1. Confirm badge: **`v55 · WIDE TERMINAL UI · AUDITED`**.
2. Hard reload / reopen the installed PWA to replace the v54 cache.
3. On a desktop monitor, confirm the app fills the space between the sidebar and right viewport edge instead of stopping around 900–1160 px.
4. Confirm Dashboard chart occupies roughly two-thirds of the main row and Market Context the remaining third.
5. Confirm Master Verdict and Verdict Center use the full viewport width.
6. Resize through ~1920 px, ~1440 px, ~1024 px and mobile width. Check there is no horizontal page overflow.
7. Below 980 px confirm the sidebar is hidden and mobile bottom navigation is active.
8. Run BTC Binance analysis and confirm the v54 decision engine behaves unchanged.
9. Change BTC → ETH and Crypto → Stocks; confirm state isolation remains intact.
10. Test protected provider panels after entering `APP_API_TOKEN`.
11. Open Health and confirm app version v55 and Engine Contract **54.1**.
12. Generate a full backup; filename should use `crypto-radar-v55-*` while schema remains 54.

## 9. Validation boundary

The packaged audit is static + deterministic runtime + mocked API/security validation plus layout invariants. It does **not** claim that your production Cloudflare account, provider entitlements, network routes or live exchange responses were tested from this environment. Production visual/network validation remains post-deploy.
