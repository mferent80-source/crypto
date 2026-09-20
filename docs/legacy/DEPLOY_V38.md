# v38 · Deployment Notes

v38 adds no new mandatory external service or API key.

Keep the existing v37 optional infrastructure if you use it:

- D1 binding `DB` for cloud research history.
- Separate scheduled monitor Worker from `wrangler.monitor.toml`.
- `PUSH_SUBSCRIPTIONS` KV + VAPID settings for Web Push.
- `TWELVE_DATA_API_KEY` for US Stocks.
- Pionex read-only account secrets if enabled.

## Upgrade

Deploy the v38 Pages package over the previous app while preserving the existing `functions/`, `db/` and Worker configuration.

The service-worker cache has been bumped to `crypto-radar-v38`.

## First validation

1. Run a 15m or 1h analysis.
2. Open **Structure & Sessions**.
3. Confirm session range/VWAP populate.
4. Confirm Order Blocks / FVG rows render if the history contains qualifying structures.
5. Check Sweep Confirmation.
6. Save new signals so v38 attribution begins accumulating in the journal.
7. Revisit Structure Validation after enough resolved signals exist.

No new Cloudflare secret is required specifically for v38.
