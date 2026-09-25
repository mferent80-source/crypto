# Trading 212 (Invest) în „US Stocks” din Crypto Radar — design (v85)

**Data:** 2026-09-25 · **Cerut de:** Marius — *„ce am făcut cu Pionex merge și cu Trade212?”*

## Hotărârile lui
| Întrebare | Răspuns |
|---|---|
| Contul | **Invest** (API-ul T212 e doar pentru Invest / Stocks ISA) |
| Unde | **Crypto Radar → US Stocks** („tot din crypto”) |
| Prețurile acțiunilor | **Amândouă**: Twelve Data când e cheia, Yahoo (fără cheie) ca rezervă |
| Direcție | **doar long** (regula lui pentru acțiuni) |

## Ce NU se mută de la Pionex
Grid, GRID-FISA, grile, lichidare, funding, levier — nu există în Invest.

## Date
- **T212** (doar citire): `https://live.trading212.com/api/v0`, Basic `T212_API_KEY:T212_API_SECRET` din `.dev.vars` (nu pleacă din casă; pe Cloudflare nu se configurează). Pagini cu `nextPagePath`. Căi: sold, portofoliu (pozițiile), istoricul ordinelor — **se probează cu cheia lui înainte de cod** (ca la Pionex: `status=finished` cu litere mici era capcana).
- **Prețuri**: `/api/stocks?action=series` existent (Twelve Data, `TWELVE_DATA_API_KEY`); rezervă nouă Yahoo `query1.finance.yahoo.com/v8/finance/chart/<SIMBOL>` (1d / 1h), aceeași formă `rows`. Simbolurile T212 (`AAPL_US_EQ`) → `AAPL`.
- Rută nouă `functions/api/t212.js` (acțiuni: `cont`, `pozitii`, `ordine`), cu autentificare ca celelalte, poarta de ritm și cache scurt.

## Ce apare (aceleași piese ca la crypto)
1. **Pozițiile T212** în US Stocks: rezultat, distanța până la maximul 52s / 7z, trendul (1z + 1săpt din zilnice), „mișcare mare” (aceeași regulă, pe zilnice), semafor ȚINE / ATENȚIE / IEȘI + „👉 Ce aș face eu”.
2. **Planul pe poziție** (țintă, stop, sau „ies la −X% de la maxim”) — KV `plan:t212:<TICKER>`, colectorul anunță.
3. **Jurnalul de trade**: perechi cumpărare → vânzare (FIFO pe acțiune, din istoricul ordinelor umplute), greșeli automate: cumpărat după mișcare mare, cumpărat lângă maximul pe 7 zile, vândut pe minus în < 2 zile, recumpărat în < 1 zi după vânzare pe minus, ținut pe minus > 20% fără plan. Filtru **Crypto / Acțiuni / Tot** în același Jurnal.
4. **„Dacă ascultai de Radar”** pe cumpărări: fișa refăcută cu lumânările de DINAINTE de cumpărare.
5. **Portofoliul**: concentrare pe acțiune și sector, șocul Nasdaq −10% (beta simplu = 1 dacă lipsește), cât e cash.
6. **Raportul de duminică**: ambele conturi într-unul singur.
7. **Poarta de intrare** pentru acțiuni (trend, mișcare, distanța până la maxim, plan scris, recumpărare imediată).

## Module (pure, testate ca până acum)
- `public/lib/t212.js` — normalizare (poziții, ordine → cumpărări/vânzări), perechi FIFO, `simbol()`.
- `public/lib/actiuni-semnale.js` — regim/trend pe zilnice, semaforul pentru o poziție, greșelile, poarta.
- refolosite: `GridCalcul` (percentile, EMA, Wilson, regim pe bare), `JurnalTrade.rezumat` (adaptat), `Obiceiuri.raportDuminica`, `Contrafactual.rezumat`.

## Când nu se poate
- Fără cheie T212 ⇒ secțiunea spune ce să pună în `.dev.vars`, nu cifre goale.
- Fără Twelve Data și Yahoo picat ⇒ „fără prețuri”, semaforul pe „fără date” (nu 0).
- Piața închisă / weekend ⇒ se spune; „mișcare” doar pe bare zilnice închise.

## Verificare
Probe scrise înainte pe ordine sintetice (cumpărări parțiale, vânzări parțiale, recumpărări) + **o probă pe răspunsul real** al contului lui; ecran PC + telefon; `npm test` verificat explicit; colectorul probat că SE ÎNCARCĂ și că A PORNIT.

## În afara v85
Tranzacționare (API-ul e doar citire aici, și rămâne așa) · CFD · dividende în jurnal (poate după).
