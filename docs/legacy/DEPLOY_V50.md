# v50 · ML ENSEMBLE V2 · Deployment

v50 requires **no new API key, provider, Worker, D1 binding or Cloudflare configuration**.

Deploy it exactly like v49.

## PWA

Service-worker cache:

`crypto-radar-v50`

The `/api/*` network-only rule remains active.

## First validation after deploy

1. Confirm the visible badge:
   `v50 · ML ENSEMBLE V2 · AUDITED`

2. Hard reload or fully reopen the installed PWA.

3. Run a normal analysis.

4. Open **Decision Core**.

5. In **ML Ensemble v2 · Strict OOS Gate**, verify the current dataset fingerprint.

6. If at least 70 resolved outcomes exist, press:
   **Train ensemble v2**

7. Check all three component rows:
   - L2 Logistic
   - Elastic-Net Logistic
   - Boosted Stumps

8. Review:
   - OOS AUC
   - Brier
   - Brier skill
   - Accuracy
   - per-model gate

9. The strict state becomes `USABLE ENSEMBLE` only if all three models and the ensemble pass OOS.

10. Review the current setup:
   - each model probability
   - raw ensemble
   - adjusted probability
   - disagreement
   - TRADE / SKIP

11. Return to Dashboard and verify the Master Verdict has a visible:
   `ML Ensemble v2`
   field.

12. Generate a new Local Data report / Research Bundle if you want the v50 governance state included.

## Important behavior

A new resolved journal observation changes the dataset fingerprint.

The previously trained v50 ensemble then becomes:

`STALE DATASET`

and cannot emit `TRADE` until retrained.

This is intentional and prevents a stored research model from silently remaining production-like after its underlying evidence set changed.

## Scanner

Scanner architecture remains:
- coin universe = Pionex
- technical candles = Binance
- fallback = PIONEX LIVE / SAVED / SNAPSHOT

## No API setup

Nothing new must be configured before testing v50.
