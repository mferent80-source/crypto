# v48 · LOCAL DATA & AUTO REPORTING · Deployment

v48 requires **no new API key, provider, database binding or Cloudflare configuration**.

Deploy it exactly like v47.

## PWA
Service-worker cache:

`crypto-radar-v48`

The `/api/*` network-only rule remains active.

## First test after deploy
1. Confirm the visible badge:
   `v48 · LOCAL DATA & AUTO REPORTING · AUDITED`
2. Hard reload or fully reopen the installed PWA.
3. Open **Local Data & Reports**.
4. Confirm:
   - IndexedDB = `READY`
   - DB schema = `48`
   - Migration has a timestamp.
5. Run a normal analysis and save a signal.
6. Run Scanner once.
7. Return to **Local Data & Reports** and press **Refresh**.
8. Check that archive counters increase.
9. Generate:
   - Daily,
   - Weekly,
   - Monthly reports.
10. Test **Export HTML**, **Export JSON**, and **Export research bundle**.

## Existing scanner architecture remains
Crypto scanner:
- coin universe = Pionex,
- technical candles = Binance,
- fallback universe = Pionex LIVE / SAVED / SNAPSHOT.

## Ordinary backup vs research bundle
The standard app backup remains compact.

The potentially larger IndexedDB research history is exported separately with **Export research bundle**.

## No API setup
Nothing new needs to be configured in Cloudflare for v48.
