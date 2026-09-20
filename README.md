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
