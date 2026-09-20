# v43 · PIONEX RESILIENCE · Deployment

No new API key or Cloudflare binding is required.

Deploy v43 exactly like v42.

## After deploy
1. Confirm the badge is `v43 · PIONEX RESILIENCE · AUDITED`.
2. Hard reload / reopen the installed PWA so service worker `crypto-radar-v43` becomes active.
3. Open Health:
   - Pionex pacing should show `SAFE · 0.70s`.
   - 429 strikes should normally show `0`.
4. Run Pionex FAST scanner first.
5. If Pionex returns 429, leave the scan open:
   - v43 should show a countdown,
   - preserve completed results,
   - resume automatically after cooldown.

The Binance primary analysis path remains independent and usable during a Pionex cooldown.
