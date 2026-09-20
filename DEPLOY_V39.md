# v39 · INTELLIGENCE LAYER · Deployment

v39 does not require a new paid provider to keep Crypto Radar usable.

## Existing configuration retained

Keep any configuration already used by v38:

- `TWELVE_DATA_API_KEY` for US Stocks and stock press releases.
- `PIONEX_API_KEY` / `PIONEX_API_SECRET` for Pionex read-only account access.
- D1 `DB` binding for research history.
- `PUSH_SUBSCRIPTIONS` KV plus VAPID configuration for push.
- separate Cloud Monitor Worker configuration if enabled.

## Optional CoinGecko key

The crypto-global context endpoint can attempt the public CoinGecko API without a key.

For more predictable Demo API access, add the Pages secret:

`COINGECKO_API_KEY`

The key is sent only by `functions/api/intel.js` in the `x-cg-demo-api-key` header and is never exposed to browser JavaScript.

## No key required

The following v39 sources use public endpoints:

- mempool.space BTC network pulse.
- GDELT news/event search.
- Binance public futures liquidation WebSocket.

## First validation after deploy

1. Open **Health** and confirm `Intel API = OK`.
2. Open **Context Intelligence**.
3. Press **Refresh**.
4. In Crypto mode confirm:
   - BTC dominance/global context populates when CoinGecko is reachable.
   - Bitcoin Network Pulse populates.
5. Press **Load latest** in News & Event Radar.
6. Press **Start** in Live Liquidation Tape.
7. Leave it running until public liquidation events arrive.
8. Open **Research ML** only after the signal journal has sufficient resolved cost-aware outcomes.
9. Train the temporal model and inspect OOS AUC/Brier/Brier skill before using the research probability lens.

## Security

- Twelve Data and CoinGecko keys stay server-side.
- No news-provider secret is stored in the browser.
- Binance liquidation stream is public market data and requires no account key.
- v39 adds no order placement endpoint.

## Provider / model caveats

The Context Score, News Risk, ML probability lens and research ensemble are advisory overlays. v39 deliberately does **not** inject them into the validated base signal weights.
