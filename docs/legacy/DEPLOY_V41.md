# v41 · EXECUTION REALISM · Deployment

v41 adds **no new API keys, providers, databases or Cloudflare bindings**.

Deploy it exactly like v40.

## Important PWA change

The service worker cache name is now:

`crypto-radar-v41`

After deploying, reload the app so the new service worker becomes active.

The critical change is that:

`/api/*`

is now network-only and is never read from or written to the PWA Cache Storage.

## Paper Trading migration

Existing v40 paper trades are preserved.

When they are read, v41 fills in missing execution fields as legacy filled positions. New v41 trades use the new PENDING/PARTIAL/FILLED entry lifecycle.

Recommended first test:

1. Open Paper Trading.
2. Set `Entry order = Limit`.
3. Keep `Fill model = Conservative`.
4. Set `Entry expiry = 8 bars`.
5. Run an analysis with an active LONG/SHORT setup.
6. Add the current setup.
7. Confirm the new paper order appears as `PENDING`.
8. On later candle refreshes, verify fills/expiry and the Execution Simulator Events ledger.

## Backup

Export a fresh v41 backup after deployment.

The v41 backup now includes both Crypto and Stock workspace/watchlist state plus the complete paper execution state.
