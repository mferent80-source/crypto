# Crypto Radar v13 · AUDITED · DIRECT-DATA

## Root cause confirmed
The Cloudflare Pages Function itself was working. The 403 came from Binance upstream calls made from Cloudflare infrastructure. Binance documents HTTP 403 as a WAF rejection. Cycling Binance hostnames does not solve an IP/WAF rejection when all calls originate from the same Cloudflare execution environment.

## Repair
- Core spot market data no longer passes through Cloudflare Functions.
- Hosted browser calls Binance public market-data endpoints directly over HTTPS/CORS, first `data-api.binance.vision`, then documented API fallbacks.
- Cloudflare Function is retained only for optional Futures data and `/api/market?type=health`.
- A Futures failure cannot break Dashboard, Multi-TF, Scanner, historical analog model, chart, RSI, EMA, MACD, support/resistance, or ticker.
- Ticker has a 24×1h candle fallback.
- RSI brace fix retained.
- Visible build badge: `v13 · AUDITED · DIRECT-DATA`.
- Successful analysis shows `LIVE` in status.

## Verification performed
- Full frontend JavaScript: `node --check` PASS.
- Cloudflare Function JavaScript: `node --check` PASS.
- Structural assertions: no spot klines call uses `/api/market`; direct public Binance endpoint exists; version badge exists.
- Network reachability from the user's browser cannot be executed from this offline build environment; runtime errors are surfaced explicitly rather than hidden.
