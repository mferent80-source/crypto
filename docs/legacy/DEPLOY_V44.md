# v44 · BINANCE FALLBACK · Deployment

No new API key, provider or Cloudflare binding is required.

Deploy it exactly like v43.

## Expected result

### Main Crypto source
If Pionex is unavailable or in cooldown:
- source switches automatically to `BINANCE`;
- Binance is saved as the primary crypto source;
- the same analysis is retried once.

### Crypto Scanner
The scanner badge is now:

`PIONEX COINS · BINANCE DATA`

The universe is still derived only from Pionex. Candle analysis is performed with the existing direct Binance browser path.

The last successful Pionex universe is stored locally, so a temporary Pionex cooldown can still use that saved Pionex coin list.

## Test
1. Confirm `v44 · BINANCE FALLBACK · AUDITED`.
2. Hard reload/reopen the PWA.
3. Select Pionex as primary source and analyze while Pionex is unavailable.
4. Confirm the app changes automatically to Binance and completes the analysis.
5. Run FAST Scanner.
6. Confirm the scanner says `PIONEX COINS · BINANCE DATA`.
7. Select a scanner result and verify Dashboard source remains Binance.
