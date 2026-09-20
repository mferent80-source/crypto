# v49 · STRESS & PORTFOLIO V3 · Deployment

v49 requires **no new API key, provider, Worker, D1 binding or Cloudflare setting**.

Deploy it the same way as v48.

## PWA
Service-worker cache:

`crypto-radar-v49`

The `/api/*` network-only rule remains active.

## First test
1. Deploy and hard-reload / reopen the installed PWA.
2. Confirm:
   `v49 · STRESS & PORTFOLIO V3 · AUDITED`
3. Keep at least two filled Paper positions if possible.
4. Open **Portfolio Intelligence v3**.
5. Press **Refresh risk**.
6. Verify:
   - ES 97.5%
   - 20D / 60D rolling VaR/CVaR
   - dynamic correlation
   - diversification decay
   - cluster changes
   - common-factor beta
   - inverse-volatility sizing
   - rolling risk contribution.
7. Press **Run stress suite**.
8. Test the custom scenario:
   - Crypto -10%
   - Stocks -5%
9. Return to Dashboard and verify Master Verdict shows the updated portfolio/stress risk state.
10. Open **Local Data & Reports** and verify Portfolio risk / Stress test counters grow.

## Scanner
The scanner architecture is unchanged:
- universe = Pionex coins,
- technical candles = Binance,
- fallback = PIONEX LIVE / SAVED / SNAPSHOT.

## No API setup
Nothing new must be configured before testing v49.
