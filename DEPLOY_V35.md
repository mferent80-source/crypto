# v35 · MULTI-MARKET ENGINE · Cloudflare setup

## Required only for US Stocks
Create a Cloudflare environment secret:

- `TWELVE_DATA_API_KEY`

The key is consumed only by `functions/api/stocks.js`. It is sent from Cloudflare to Twelve Data in the server-side Authorization header and is not written to browser storage or HTML/JavaScript.

## Existing optional v34 configuration
If you already use these features, keep the existing bindings/secrets:

### Pionex read-only account
- `PIONEX_API_KEY`
- `PIONEX_API_SECRET`

Use a Pionex key with reading permission only.

### PWA push subscription storage
- `VAPID_PUBLIC_KEY`
- KV binding: `PUSH_SUBSCRIPTIONS`

Closed-app automatic push delivery still requires the separate server-side sender/market-monitor layer described in v34.

## Cloudflare Pages project
Keep the existing project settings:

- Framework preset: None
- Build command: blank
- Output directory: `public`
- Root directory: blank
- Production branch: `main`

The `functions/` directory must remain next to `public/`.

## First test after deployment
1. Open Health and run the health check.
2. Confirm `US Stocks API` shows `OK`.
3. Switch the top market selector to `US Stocks`.
4. Enter `AAPL`.
5. Choose `1d` first and run Analyze.
6. Open `Nasdaq / US Stocks`.
7. Confirm Provider = READY and the quote/exchange fields populate.
8. Run `Scan Core 30` before trying the full NDX scan.

## Provider credits
Twelve Data batch requests reduce HTTP overhead, but each symbol still consumes provider credits. A 30-symbol daily scanner batch is approximately 30 time-series credits and a 101-security run approximately 101 credits, subject to the provider's current plan rules.

The optional earnings-calendar lookup is intentionally manual and can consume substantially more credits than a normal quote/time-series request.

## If the stock API says NEEDS KEY
The Crypto side of v35 remains usable. Configure `TWELVE_DATA_API_KEY` in Cloudflare and redeploy/restart the Pages deployment before testing US Stocks again.
