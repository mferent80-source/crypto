
## Ce nu generează garda (scris de mână, 02.10)

### Verdictul vechi al Tabloului — `public/lib/tablou-bot.js` (ideea 3 din livrarea pachetului 1)

Cardul verdictului (`#tbVerdictCard`) e ascuns din redesign (`app.css`: `#tabloubot #tbVerdictCard{display:none}`). Textele de mai jos ajung la el doar prin Consilier: `app.js` trimite `{titlu, ceFac}` când nivelul e `OPRESTE`, colectorul ia același lucru din `TabloBot.opreste()`, iar `consiliu.js` (blocul „0) verdictul vechi”) face din ele un motiv „Ieși”.

| Nivel | Când | `titlu` | `ceFac` | Ce ajunge pe ecran (înainte) |
|---|---|---|---|---|
| OPRESTE | `marginStatus` ≠ NORMAL | Ieși | Pionex raportează marginea contului ca X, nu NORMAL. | titlul „Pionex: marginea contului e X” **și** textul = aceeași propoziție (titlul spus de două ori) |
| OPRESTE | `riskStatus` ≠ TRADING | Ieși | Pionex raportează starea de risc ca X, nu TRADING. | titlul „Pionex: starea de risc e X” **și** textul = aceeași propoziție |
| OPRESTE | lichidarea < 8% | Ieși | Mai sunt 4.5% până la lichidare. | nimic în plus când semaforul are lichidarea (același prag); altfel titlul „Lichidarea la 4,5%” |
| OPRESTE | lichidarea depășită | Ieși | Prețul a trecut deja de pragul de lichidare cu 1.2%. | când semaforul n-o are: titlul = textul = „Prețul a trecut deja de pragul de lichidare cu 1.2%” (punct zecimal, spus de două ori) |
| PAZESTE | lichidarea 8–15% | Lichidarea e aproape | Mai sunt 12.4% până acolo. | nu ajunge nicăieri (doar cardul ascuns) |
| alte niveluri (ȚINE, MUTĂ, OPORTUNITATE, NEDOVEDIT…) | — | — | — | nu ajung nicăieri (doar cardul ascuns) |

Pachetul 2 nu schimbă `tablou-bot.js` (textele lui sunt intrări pentru Consilier și cardul ascuns); repară ce ajunge pe ecran, în `consiliu.js` (sarcina 3).

### Tabloul — `public/app.js`, rândurile cu sfaturi din afara Consilierului

| Unde | Text (înainte) |
|---|---|
| Planul tău, fără plan | Niciun plan încă. Scrie-l acum, la rece: e mai ușor decât să hotărăști când prețul fuge. |
| Planul tău, ținta | Țintă pe plus: +3.00 USDT · ATINSĂ — ieși / mai sunt 2.40 USDT |
| Planul tău, pragul pe minus | Ies dacă pierd 7.50 USDT · ATINS — ieși / mai sunt 1.20 USDT |
| Planul tău, prag atins | 👉 Ce aș face eu: exact ce ți-ai propus — ieși acum, fără să renegociezi. |
| Portofoliul (2+ boți) | 👉 Ce aș face eu: 3 boți pe aceeași parte sunt un singur pariu, nu mai multe. N-aș mai porni unul pe partea asta; aș lua următorul neutru sau pe partea cealaltă. |
| Cardul ascuns al sfaturilor | titlu · text · 👉 faCe · `deCe` (rândul mic) |
| „Ce ai de făcut acum” | `<p>` fără rânduri: mesajele pe două rânduri (Discord-ul Consilierului: „👉 … · 💰 …” + „De ce: …”) se lipeau („−4,6 De ce: …”) |

### Ce NU e în pachetul 2 (și unde merge)

| Text | Unde e | Pachetul |
|---|---|---|
| Titlul și textul sfatului „pericol” (lichidare / stare / grid / oprit) | regulile alertelor, `alerte.js` | 3 (în gardă: grupul „alerte”, raport) |
| Rândurile din alertele colectorului din „Ce ai de făcut acum” | `alerte.js` + mesajele colectorului | 3 |
| Fișa de închidere a botului („🔍 CRV închis: …”) | `tablou-extra.js` `fisaInchidere` → Discord + pregătirea următorului bot | 3 (e un mesaj de alertă) |
| „Istoricul tău pe CRV …” (rândurile consilierului de monedă) | `consilier.js` `sfaturiBot` | 4 |
| Poarta de pornire („toate regulile trec — pornește …”) | `app.js` `grPoartaHtml` (fișa Grid) | 5 |
| Comparația bot ↔ fișă, planul propus, distanțele până la margini | `tablou-extra.js` `comparaCuFisa`, `propunePlan`, `distanteGrid` | verificate: deja concise, cu virgulă — rămân |
| „Nu pot calcula fără …”, „sub 10 ferestre în istoric” | `scenariu.js` | verificate: scurte, fără cifre de reformatat — rămân |
| `textBani` | `tablou-extra.js` | nefolosită pe ecran (doar exportată) — rămâne |
