# v51 · EXTERNAL INTELLIGENCE · Deployment

## Deploy

Deploy the ZIP exactly like v50.

No build framework is required.

PWA service-worker cache:

`crypto-radar-v51`

The existing `/api/*` service-worker network-only rule remains active.

## New optional server-side variables

You can deploy v51 **before** configuring these variables.

### Trading Economics

`TRADING_ECONOMICS_API_KEY`

Enables:
- real US economic calendar
- CPI / labour / GDP / rates / other provider events
- actual / forecast / previous values
- high-impact event blackout gate

Without it:
- the Economic Calendar card displays `CONFIGURE KEY`
- the rest of the app continues working

### CoinGlass

`COINGLASS_API_KEY`

Enables:
- historical Spot taker buy/sell CVD
- predictive liquidation heatmap if the API plan includes that endpoint

Important:
- historical taker buy/sell is available on lower CoinGlass API tiers, with interval limits depending on plan
- the liquidation heatmap endpoint requires a higher plan
- v51 automatically retries historical CVD at 4h if 1h is rejected

### Whale Alert

`WHALE_ALERT_API_KEY`

Enables:
- provider-attributed large transaction data
- exchange inflow / outflow classification

The REST transaction routes used by v51 require REST/Enterprise-compatible Whale Alert access.

If the key/plan cannot access them:
- Coin Metrics network metrics still work
- Whale-flow fields show unavailable
- Master Verdict does not penalize the missing provider

## No key required

### Coin Metrics Community
Used for on-chain network metrics.

### Deribit public API
Used for options intelligence.

## First test after deploy

1. Confirm visible badge:
   `v51 · EXTERNAL INTELLIGENCE · AUDITED`

2. Hard reload / reopen the installed PWA.

3. Run a BTC analysis.

4. Open **Context Intelligence**.

5. Verify **Options Intelligence** loads from Deribit without adding a key.

6. Verify **Real On-Chain** attempts Coin Metrics network metrics.

7. If Trading Economics is not configured:
   - Economic Calendar must show `CONFIGURE KEY`
   - no JavaScript error should occur

8. If CoinGlass is not configured:
   - Predictive Liquidation must show `CONFIGURE KEY`
   - Historical CVD must show `CONFIGURE KEY`

9. After configuring CoinGlass:
   - load Historical CVD
   - verify interval, bars and coverage
   - if the plan rejects 1h, verify automatic 4h fallback
   - test the predictive heatmap separately because it has a higher plan requirement

10. After configuring Trading Economics:
   - verify high-impact events populate
   - confirm event time / actual / forecast / previous
   - confirm Dashboard `Economic calendar` field populates

11. After configuring Whale Alert REST access:
   - verify exchange inflow / outflow
   - inspect returned large-transfer rows

12. Return to Dashboard and verify the five new Master Verdict fields:
   - Economic calendar
   - On-chain
   - Predictive liquidation map
   - Options
   - Historical CVD

13. Open **Local Data & Reports** and confirm `External intel snapshots` increases.

## Security

Keep all three paid-provider keys only in Cloudflare environment variables.

Do not place them in:
- `index.html`
- browser localStorage
- repository files
- JavaScript frontend constants

## Scanner

The existing scanner architecture is unchanged:

- universe = Pionex coins
- technical candles = Binance
- Pionex fallback = LIVE / SAVED / SNAPSHOT

No CoinGlass/Trading Economics/Whale Alert failure is allowed to break the scanner or base analysis.
