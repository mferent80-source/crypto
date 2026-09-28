# v71 · Deployment

## Target

Deploy the full application on **Cloudflare Pages**, not GitHub Pages.

- Framework preset: `None`
- Build command: blank
- Output directory: `public`
- Root directory: blank
- Keep `functions/` at repository root

GitHub may be used as the source repository. Standard GitHub Pages cannot execute the private `/api/*` functions required for Pionex account synchronization.

## Required secret

- `APP_API_TOKEN`: long random application access token

## Optional Pionex read-only secrets

- `PIONEX_API_KEY`
- `PIONEX_API_SECRET`

The Pionex key must have **read permission only**. Do not enable trading or withdrawal permission. V71 has no order route, but least-privilege credentials remain mandatory.

## Recommended bindings

- `API_RATE_LIMIT` KV for global API rate limiting
- existing D1/KV bindings used by inherited history, monitor or push modules, where enabled

## Pre-deploy gate

```bash
npm test
```

## Post-deploy validation

1. Confirm the badge `v71 · PIONEX JOURNAL CORRECTNESS & SECURITY HOTFIX · AUDITED`.
2. Hard refresh or reinstall the PWA so cache `crypto-radar-v71` replaces older caches.
3. Enter `APP_API_TOKEN` in the session-only field.
4. Confirm Pionex Account reports `READ ONLY`.
5. Synchronize one coin and verify its symbol appears in the journal note.
6. Switch to another coin and confirm prior fills are not mixed into the new symbol.
7. Verify `RECONCILED` appears only when history is complete and there are no unmatched fills, missing orders or unresolved fees.
8. Verify the site has no `EXECUTE LIVE`, `CLOSE LIVE`, live-order submission or capital-ramp controls.
9. Export the journal and a full research backup.

## Rollback

Keep V70 only as an archive. Do not restore its `functions/api/live-orders.js` into the V71 read-only deployment.
