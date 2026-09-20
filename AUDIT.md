# v11 · FIXED · TESTED
- Reparată sintaxa RSI din versiunea anterioară.
- Badge vizibil în aplicație: v11 · FIXED · TESTED.
- Ruta Cloudflare Pages Functions este explicită pentru /api/*.
- getJSON detectează separat cazul în care Cloudflare întoarce HTML în loc de JSON.
- JavaScript verificat integral cu `node --check`.
- Structură verificată: public/ + functions/api/market.js.
IMPORTANT: Cloudflare Pages trebuie să construiască proiectul din rădăcina repo-ului, cu Build output directory = public. Directorul functions trebuie să fie la rădăcină, NU în public.
