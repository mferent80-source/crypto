# v37 · CLOUD MONITOR & PROFILE · Deployment

v37 keeps the existing Cloudflare Pages app and adds an **optional separate scheduled Worker**.

## 1. Pages deployment

Keep the existing Pages structure:

- `public/`
- `functions/`
- Framework preset: None
- Build command: blank
- Output directory: `public`

Existing optional secrets/bindings from earlier versions still apply.

## 2. Create the D1 history database

Create one D1 database, for example:

`crypto-radar-history`

Initialize it with:

```bash
wrangler d1 execute crypto-radar-history --remote --file=db/schema.sql
```

Bind that same D1 database to the Pages project with binding name:

`DB`

Also place its database ID in `wrangler.monitor.toml`.

### Browser history writes

Scheduled server monitoring writes directly to D1.

Browser-side saving of:
- analysis snapshots,
- client scanner runs,
- signal snapshots

is disabled by default.

If you explicitly want those public research writes, add the Pages environment variable:

`ALLOW_BROWSER_HISTORY_WRITES=1`

Do not enable this if you want the public app to remain read-only toward D1.

## 3. Reuse the PushSubscription KV

The Pages push endpoint and the monitor Worker must use the **same KV namespace** with binding:

`PUSH_SUBSCRIPTIONS`

Put that namespace ID in `wrangler.monitor.toml`.

## 4. Generate VAPID keys

From the project root:

```bash
npm run vapid:generate
```

It prints:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Use the public key on the Pages project and monitor Worker.
Keep the private key only on the monitor Worker.

Set a contact subject such as:

`VAPID_SUBJECT=mailto:you@example.com`

## 5. Configure monitor Worker secrets

Using the monitor config:

```bash
wrangler secret put VAPID_PUBLIC_KEY --config wrangler.monitor.toml
wrangler secret put VAPID_PRIVATE_KEY --config wrangler.monitor.toml
wrangler secret put VAPID_SUBJECT --config wrangler.monitor.toml
wrangler secret put MONITOR_TOKEN --config wrangler.monitor.toml
```

Only if stock scheduled monitoring is enabled:

```bash
wrangler secret put TWELVE_DATA_API_KEY --config wrangler.monitor.toml
```

## 6. Configure `wrangler.monitor.toml`

Replace:

- `REPLACE_WITH_D1_DATABASE_ID`
- `REPLACE_WITH_KV_NAMESPACE_ID`

Defaults are intentionally conservative:

- cron: every 15 minutes
- Crypto monitoring: ON
- Stock monitoring: OFF
- Pionex server scan: top 20
- Push score threshold: 78

The crypto monitor paces Pionex kline calls instead of running them concurrently.

## 7. Deploy the scheduled Worker

```bash
npm run monitor:deploy
```

After deployment note its Workers URL, for example:

`https://crypto-radar-monitor.<your-subdomain>.workers.dev`

## 8. Connect Pages to the monitor

On the Pages project add:

- `MONITOR_WORKER_URL`
- `MONITOR_TOKEN`

`MONITOR_TOKEN` must match the Worker secret.

After confirming the Worker can send Web Push, you may also set on Pages:

`PUSH_SENDER_CONFIGURED=1`

This makes the older Push settings panel report the sender as active. The v37 Cloud Monitor also checks the Worker's own `/health` status.

## 9. Optional scheduled stock monitoring

`wrangler.monitor.toml` defaults to:

`MONITOR_STOCKS = "0"`

Turn it on only if your Twelve Data plan has enough credits.

The default watchlist is deliberately much smaller than the full Nasdaq-100 scanner.

## 10. First validation after deployment

1. Open **Health**.
2. Confirm `D1 history = OK`.
3. Open **Cloud Monitor**.
4. Confirm D1 = READY.
5. Confirm the Worker health is ONLINE after connecting `MONITOR_WORKER_URL`.
6. Use **Run server monitor now** once.
7. Confirm a run appears in Recent Scheduled Runs.
8. Enable PWA push subscription.
9. Confirm the monitor Worker has VAPID + KV configured.
10. Wait for a qualifying alert or temporarily raise/lower the monitor threshold for controlled testing.

## Security notes

- `VAPID_PRIVATE_KEY` is never sent to the browser.
- `MONITOR_TOKEN` is never sent to the browser.
- Twelve Data and Pionex private account secrets remain server-side.
- The monitor does not expose an order-placement endpoint.
