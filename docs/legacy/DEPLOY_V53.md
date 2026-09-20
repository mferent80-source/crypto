# v53 · VOLATILITY INTELLIGENCE PRO · Deployment

v53 requires **no new API key or Cloudflare binding**.

Deploy it the same way as v52.

## PWA

Service-worker cache:

`crypto-radar-v53`

The `/api/*` network-only rule remains active.

## First validation after deploy

1. Confirm the visible badge:

   `v53 · VOLATILITY INTELLIGENCE PRO · AUDITED`

2. Hard reload or fully reopen the installed PWA.

3. Run a normal BTC analysis.

4. Open:

   **Volatility Intelligence**

5. Verify:

   - volatility regime
   - breakout/compression alert
   - expansion score
   - compression score
   - Paper risk multiplier
   - ATR% / percentile
   - BB-width percentile
   - RV20 annualized
   - RV20 percentile
   - RV10/RV60 ratio
   - vol-of-vol
   - Parkinson
   - Garman-Klass
   - downside/upside semivolatility
   - squared-return clustering
   - 2σ / 3σ shock count
   - TTM squeeze

6. Verify the **Volatility Cone** has rows for available windows among:

   - 10
   - 20
   - 60
   - 120 bars

7. If Deribit options data is available for the selected crypto:

   verify:

   - ATM IV
   - IV/RV ratio
   - IV term slope
   - volatility premium
   - IV expected move

8. Verify **Expected Move**:

   - RV 1d
   - RV 7d
   - IV 1d
   - IV 7d
   - 1d / 7d realized-vol ranges

9. Verify **Multi-Timeframe Volatility Map** displays:

   - 15m
   - 1h
   - 4h
   - 1d

10. Return to Dashboard.

11. Confirm Master Verdict has:

   `Volatility intelligence`

12. In Verdict Center verify rows:

   - `Volatility Intelligence Pro`
   - `IV / RV volatility premium`

13. Open Local Data & Reports.

14. Verify:

   `Volatility snapshots`

   increases after analyses.

15. Generate a Daily report and verify the volatility summary is present.

## Interpretation

Volatility is intentionally direction-neutral.

`EXTREME` or `BREAKOUT TRANSITION` does not automatically mean SHORT or LONG.

It primarily:
- changes risk awareness,
- reduces adaptive Paper sizing,
- highlights compression/expansion transitions.

## Existing scanner architecture

Unchanged:

- coin universe = Pionex
- technical candles = Binance
- Pionex fallback = LIVE / SAVED / SNAPSHOT

No v53 volatility calculation requires Pionex to be available.
