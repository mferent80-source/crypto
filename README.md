# Crypto Radar Web App

Aplicație mobilă cu frontend static și proxy server-side pentru datele Binance.

## Deploy Cloudflare Pages
1. Pune acest folder într-un repository GitHub.
2. În Cloudflare: Workers & Pages → Create → Pages → Import existing Git repository.
3. Build command: `exit 0`
4. Build output directory: `public`
5. Deploy.

Folderul `functions/` trebuie să rămână în rădăcina repository-ului. Endpoint-ul `/api/market` rulează server-side, deci telefonul nu mai apelează direct Binance.

## Local
`npx wrangler pages dev public`

Nu este un sistem de predicție garantată. Procentele istorice sunt frecvențe ale configurațiilor similare din eșantionul analizat.


## v21 · ULTIMATE TERMINAL
Adds WebSocket live ticker, Volume Profile, Anchored VWAP, Risk Manager, order-book depth, market context, signal explanation/lifecycle, PWA support and health diagnostics.


## v22 · PRO DESK
Adds Decision Center, correlation/relative-strength analytics, volatility/squeeze engine, liquidation-risk proxy and paper portfolio.


## v23 · RESEARCH LAB
Adds strategy analytics, confidence calibration, Monte Carlo, scenario analysis, backup/restore and data freshness.


## v25 · FORWARD EDGE
Adds forward-only cohorts, risk guard, shrunk segment reliability, rolling 3-fold OOS, evidence-quality checks and configurable entry expiry.
