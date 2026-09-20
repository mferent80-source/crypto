# v46 · RESEARCH GOVERNANCE PRO · Deployment

v46 adds **no new API key, provider, database or Cloudflare binding**.

Deploy it the same way as v45.

## PWA
The service-worker cache is now:

`crypto-radar-v46`

The `/api/*` network-only rule remains active.

## First validation after deploy
1. Confirm badge:
   `v46 · RESEARCH GOVERNANCE PRO · AUDITED`
2. Confirm the v45 scanner still shows:
   - PIONEX LIVE,
   - PIONEX SAVED,
   - or PIONEX SNAPSHOT,
   while Binance supplies scanner candles.
3. Open **Research ML**.
4. Leave defaults initially:
   - 4 folds,
   - purge 3,
   - embargo 3,
   - test fraction 0.12,
   - bootstrap 400,
   - block size 5.
5. Press **Run purged OOS**.
6. Review:
   - pooled OOS AUC / Brier / Brier skill,
   - fold expectancy,
   - bootstrap confidence intervals,
   - coefficient stability,
   - Leakage Audit.
7. In Experiment Registry, change one candidate parameter and press **Run candidate**.
8. Re-run identical parameters to verify the second run is labeled `DUPLICATE`.

## Important
`PROMOTED` in Experiment Registry is only a research-governance state. It does not change the base engine, paper sizing logic, or any exchange order.
