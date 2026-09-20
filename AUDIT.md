# v12 · FIXED · TESTED
- Badge actualizat la v12.
- Backend-ul încearcă mai întâi `data-api.binance.vision`, endpoint Binance dedicat datelor publice de piață.
- Păstrează fallback către endpoint-urile Binance API anterioare.
- Ticker 24h are fallback calculat din ultimele 24 lumânări de 1h dacă endpoint-ul ticker este blocat.
- Frontend și backend validate sintactic cu Node.
- Futures rămâne best-effort; dacă Binance Futures blochează infrastructura Cloudflare, câmpurile pot apărea N/A fără să blocheze analiza spot.
