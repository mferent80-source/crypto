# Pachetul „grid” 5 idei (v78.3 … v79) — plan scurt

Cerut 24.09 seara („fă toate”), după ce GRID-FISA v1.1 a mers în TV. Spec-mamă: `../specs/2026-09-24-grid-ce-setez-design.md`.

| # | Ce | Unde | Probă |
|---|---|---|---|
| F1 | ntfy **„X: gata liniștea, oprește gridul”** când moneda unui bot activ intră în MIȘCARE (1,5× p75, iese sub 1,3×) | `lib/grid-calcul.js` `regimPeBare(b,k4,k24)` · `lib/alerte.js` regula `miscare` · `scripts/colector.mjs` (4H, 500 bare, deja aduse pentru direcție) | `grid-v78.mjs`: regimPeBare pe 4H; Alerte.reguli cu ctx.miscare intră/iese cu histerezis |
| F4 | **„Cât investesc?”**: sold + pierdere acceptată % + cea mai proastă fereastră ⇒ suma maximă | `lib/grid-proba.js` `sumaMaxima(sold, pierderePct, ceaMaiProasta)` · fișă: 2 inputuri + rând în „Ce înseamnă în bani” | pur + ecran |
| F2 | **Jurnalul gridurilor**: „Am pornit botul cu setarea asta” ⇒ intrare (fișă + verdict); se leagă de botul Pionex cu același simbol; rezultatul real din bot/istoric; rezumat pe verdict | `lib/grid-jurnal.js` (pur: adauga, leaga, actualizeaza, rezumat) · localStorage `grJurnal` · secțiune în fereastra Grid | pur + ecran |
| F5 | **grile / direcție din umplerile reale** ale botului (Pionex `fills`), FIFO pe perechi; umplere la nivel de grilă = grile, altfel direcție; nerealizat pe ce a rămas | `lib/grid-umpleri.js` `imparte(fills, setareGrid)` · Tabloul botului, blocul „Banii botului” · app.js: paginare `fills` cu `endTime`, cache 10 min | pur (umpleri sintetice) + ecran |
| F3 | **„Pe care monede pornesc grid ACUM?”**: clasament pe top 100 PERP (4H: regim, lățime p75 pe 2z, direcție, pas estimat, ⚠ fără probă), socotit acasă la fiecare oră de colector, pus în KV; fereastra Grid îl arată sus; clic ⇒ fișa | `scripts/colector.mjs` tură orară · `functions/api/istoric-bot.js` action `clasament` · `lib/grid-clasament.js` (pur: scor + sortare, de evitat primele) · app.js | pur + server + ecran |

Reguli: fiecare F cu test scris înainte; `npm test` verde la fiecare commit; versiunea crește o dată la final (v79.0) + `sw.js`; proba de ecran + audit Opus pe tot la sfârșit; push.

## Audit (Opus, 24.09 noaptea) și hotărârile
- 🔴 **F5: `trade/fills` refuză PERP** — VERIFICAT pe contul lui („symbol error”). Umplerile boților futures nu se pot citi prin API-ul de citire ⇒ în Tablou rândul spune asta; modulul rămâne pentru boți spot (mod aritmetic/geometric/auto, dedup, refuz cinstit la trunchiere / fără intrarea de la pornire / umpleri care nu cad pe niveluri; preț lipsă ⇒ nerealizat null).
- 🔴 **F3: scorul era ×N** — împărțit la grile (pe investiție). Rămâne estimare grosieră (traversări din închideri pe 4h), spus în cutie.
- **F1: 2 alerte/zi pe zgomot** — prag 2,0× (iese sub 1,5×), cel mult o dată pe zi pe bot; textul spune ce e dovedit (nu porni grid nou după mișcare) și că oprirea îți fixează pierderea din direcție — nu poruncește.
- **F3 colector: 429 orar** — pauză 1,6 s (≈35/min din 45), `result:false`/fără lumânări = eșec, >20% fără date ⇒ lista NU se urcă; `topDupaVolum` pur, testat.
- clic pe altă monedă cât se calculează ⇒ se reface după (`grStare.reface`).
- F4: cea mai proastă fereastră din alegere ȘI din nevăzute; pierderea 0 nu devine 5.
- fișa: „alege «Geometric» în Pionex (implicit e aritmetic)” — botul lui real e aritmetic, 93 grile.
- Amânate: regimul F1 pe 4H (83 z) ≠ fișa pe 15M (30 z); direcția din clasament fără 1D; KV fără expirare; F2 leagă și boți spot; `turaClasament` fără probă de integrare.
