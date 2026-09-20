# v54 · FULL HARDENING · Deployment

This is the authoritative deployment guide for v54. Older `DEPLOY_V*.md` files under `docs/legacy/` are historical only.

## 1. Cloudflare Pages

Deploy the repository with:

- Framework preset: **None**
- Build command: **blank**
- Output directory: **`public`**
- Root directory: **blank**

The repository must keep `functions/` at its root.

The PWA cache is `crypto-radar-v54`, and `/api/*` remains network-only in the Service Worker.

## 2. Required security secret

Set on the Pages project:

`APP_API_TOKEN`

Use a long random value. Protected routes return 401 when the browser omits/uses the wrong token and 503 when the server secret is not configured.

After opening the app, go to **Settings → Protected API session**, enter the same token and save it. It is stored only in `sessionStorage`; it is not included in v54 backups.

Protected routes include Pionex proxy paths, stock/provider intelligence, D1 history, monitor control, push subscription writes and Pionex read-only account data. Direct Binance browser analysis remains independent of this token.

## 3. Recommended rate-limit binding

Bind a Cloudflare KV namespace to Pages as:

`API_RATE_LIMIT`

Without it, v54 falls back to per-isolate in-memory rate limiting. With it, API abuse control is shared more consistently across isolates.

## 4. Optional provider secrets

Configure only the providers you use:

- `TWELVE_DATA_API_KEY` — U.S. stocks and related stock context
- `TRADING_ECONOMICS_API_KEY` — economic calendar
- `WHALE_ALERT_API_KEY` — attributed whale/exchange flows
- `COINGLASS_API_KEY` — predictive liquidation map / historical CVD
- `COINGECKO_API_KEY` — optional CoinGecko authenticated quota
- `PIONEX_API_KEY` + `PIONEX_API_SECRET` — read-only Pionex account panel

Do not put provider secrets in `public/`, GitHub source, localStorage or frontend constants.

### Pionex account safety

Use an API key with **read-only** permissions. v54 exposes no order-placement endpoint. The account endpoint is protected by `APP_API_TOKEN`.

## 5. D1 history / tenant isolation

Create or reuse a D1 database and bind it to Pages as:

`DB`

### Fresh database

Initialize with:

```bash
wrangler d1 execute crypto-radar-history --remote --file=db/schema.sql
```

### Existing pre-v54 database

Do not delete it. v54's authenticated History endpoint checks the legacy tables and adds the `tenant` columns/indexes when missing. After deployment:

1. configure `APP_API_TOKEN`;
2. enter the token in the app session;
3. open **Cloud Monitor / Local History** or call the protected `GET /api/history?action=status`;
4. verify the History status succeeds before enabling browser writes.

By default, browser D1 writes remain disabled. To allow authenticated same-origin browser research writes, explicitly set:

`ALLOW_BROWSER_HISTORY_WRITES=1`

Leave it unset/0 for a read-mostly deployment.

### Optional tenant pin

`HISTORY_TENANT` can pin one explicit tenant name. Otherwise v54 derives a stable non-reversible tenant identifier from the authenticated app token.

## 6. Push subscriptions

Bind a KV namespace to Pages as:

`PUSH_SUBSCRIPTIONS`

Optional Pages variables/secrets:

- `VAPID_PUBLIC_KEY`
- `PUSH_SENDER_CONFIGURED=1` only after a sender is actually deployed

Push subscribe/unsubscribe writes require `APP_API_TOKEN` and same-origin requests.

Generate VAPID keys with:

```bash
npm run vapid:generate
```

Keep `VAPID_PRIVATE_KEY` on the monitor Worker only.

## 7. Scheduled monitor Worker

The scheduled monitor is separate from Pages. `wrangler.monitor.toml` intentionally contains no hard-coded D1/KV IDs.

Before deploy, export locally:

- `D1_DATABASE_ID`
- `PUSH_KV_NAMESPACE_ID`

Then:

```bash
npm run monitor:config
```

This generates `wrangler.monitor.generated.toml` with validated bindings.

Set Worker secrets:

- `MONITOR_TOKEN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- optional `TWELVE_DATA_API_KEY` when stock monitoring is enabled

Then deploy:

```bash
npm run monitor:deploy
```

On Pages set:

- `MONITOR_WORKER_URL`
- `MONITOR_TOKEN` (same value as Worker)

The public Worker `/health` reveals only `{ok:true}`. The authenticated Pages proxy forwards `MONITOR_TOKEN` to retrieve private health details.

## 8. Pionex rate coordination

When the Pages `DB` binding is present, the Pionex Pages proxy reserves request spacing through shared D1 `monitor_state`. Without D1 it falls back to local-isolate pacing. The scheduled Worker uses the same D1 state family for its own pacing.

## 9. Privacy mode

Settings includes **Session-only research mode**. Enabling it erases persistent research/Paper/model working data and prevents new IndexedDB/research persistence for the active privacy mode. Session data remains only until the tab/session closes.

Persistent normal mode still uses browser storage and should not be treated as encrypted-at-rest storage.

## 10. Required pre-deploy gate

Run:

```bash
npm test
```

Expected final results:

```text
V54_SYNTAX_PASS 21 executable JS/MJS surfaces + JSON manifests
V54_SECURITY_RUNTIME_PASS 19 auth/origin/quota-gate checks
V54_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1 mtf_one=25% same_candle=-1
V54_STATIC_AUDIT_PASS 37 hardening invariants
V54_FINDINGS_MATRIX_PASS total=62 fixed=51 mitigated=11 open=0
```

`npm run deploy` executes the same predeploy test gate before Pages deployment.

## 11. First production validation

After deploy:

1. Confirm badge: **`v54 · FULL HARDENING · AUDITED`**.
2. Hard reload / reopen installed PWA to replace v53 cache.
3. Run BTC Binance analysis without a protected provider and verify base analysis still works.
4. Enter `APP_API_TOKEN` in Settings and verify protected provider panels no longer return 401.
5. Change BTC → ETH and Crypto → Stocks; verify old flow/options/liquidation context does not carry into the new identity.
6. Force a partial MTF failure and verify incomplete MTF cannot show full-confidence agreement.
7. Check Historical CVD ordering/coverage.
8. Check observed liquidation history can retain the intended 7-day window.
9. Verify US stock corporate-action guard on a known discontinuity/split-like series.
10. Verify Cloud History tenant counts and, if enabled, authenticated browser writes.
11. Verify the monitor private health details are visible only through the authenticated Pages path.
12. Verify Pionex account remains read-only.
13. Generate a full local backup and validate its SHA-256 before relying on it.
14. Open Health and confirm Engine Contract **54.1**.

## 12. Validation boundary

The packaged audit is static + deterministic runtime + mocked API/security validation. It does **not** claim that your production Cloudflare account, provider plan entitlements, network routes, quotas or live exchange responses were tested from this environment. Those must be verified after deployment.
