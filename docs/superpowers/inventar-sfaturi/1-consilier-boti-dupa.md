# Inventarul „după” — pachetul 1 (Consilierul boților), v100.61

Specul: `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` · inventarul de dinainte: `1-consilier-boti-inainte.md` (aceleași situații, generat cu garda înainte de rescriere).
Garda strictă pe semafor, cartele și Consilier: 0 abateri. Exemplele din tabelul planului au fost verificate pe textele generate de modulele din repo (identice cu copia validată).

## 1. Inventarul: ce informație unde ajunge (nu se pierde nimic)

| Sfatul (înainte) | Informația | După |
|---|---|---|
| Lichidarea depășită | depășită, cu cât (3,4%) | titlu |
| | verifici în Pionex, închizi ce a rămas | acțiune |
| | poate fi deja lichidată / la limită | de ce |
| Lichidarea < 8% | distanța | titlu |
| | marjă sau închizi | acțiune |
| | „sub 8% nu mai e loc de răbdare” | de ce |
| Lichidarea 8–15%, se îndepărtează | distanța, direcția, valoarea de acum 1 h | titlu |
| | nimic de făcut; fără poziție nouă sub 15% | acțiunea slabă (când nu e alta) |
| Lichidarea 8–15%, se apropie / fără istoric | distanța (+ direcția, valoarea de acum 1 h) | titlu |
| | nu mări poziția; marja | acțiune („dacă scade sub 8%, aș adăuga marjă” — forma din spec) |
| | calculatorul „Dacă adaug marjă” | de ce |
| Planul pe minus | pragul | titlu |
| | ieși, cum ai hotărât la rece | acțiune („Aș închide botul…”) |
| Planul pe plus | ținta (cuvântul „ținta” rămâne — `podeaPeBani`) | titlu |
| | încasezi / muți ținta mai sus, conștient | acțiune |
| | piața încă merge cu botul; să nu treacă neobservată | de ce |
| Planul: afară din grid | pragul de ore | titlu |
| | închizi și pornești unul nou din fișă, pe unde e prețul | acțiune |
| Trend contra | direcția, tăria | titlu |
| | fără bani; dacă se întărește, închizi lângă zero și pornești pe trend | acțiune |
| Mișcare mare | multiplul, contra | titlu |
| | fără bani, îl lași cât lichidarea e departe | acțiune |
| Ia profit | momentul, totalul, procentul | titlu (+ `iaProfit.text` întreg pentru Discord) |
| | închizi pe plus, repornești la 🟢 | acțiune |
| | cauza, greșeala nr. 1 din jurnal | de ce |
| Mută gridul (margine) | marginea, distanța, poziția în interval | titlu |
| | frecvența în 12 h, pragul, plafonul / „1 din 4” | de ce |
| | sursa profilului | rândul de sub motiv (`extra`) |
| | închizi și pornești cu setările propuse | acțiune („…din cartela Gridul” — chiar sub Consilier) |
| Mută gridul (afară) | orele afară | titlu („5,3 h”) |
| Costuri | costurile peste grile | titlu (+ cifra nouă: net/zi) |
| | levier mai mic / grile mai rare la următorul | acțiune |
| BTC | BTC în mișcare, moneda încă nu | titlu (+ multiplul) |
| | fără bani până se vede direcția | acțiune („Aș fi pregătit:” — umplutură, scoasă) |
| | altcoinii urmează des BTC | de ce |
| Aglomerare | mulțimea înghesuită pe partea botului | titlu (+ câte semne) |
| | marjă în plus sau o parte închisă | acțiune |
| | funding, OI, long/short, riscul de curățare | de ce |
| Ținta la adăpost | ținta atinsă, la adăpost | titlu |
| | stopul și cât păstrează | acțiune |
| | o întoarcere te scoate cu ≥ ținta; Discord când merită urcat; stopul care urcă | de ce |
| Ținta de păstrat | ținta atinsă — păstreaz-o | titlu |
| | podeaua, distanța, totalul exact după comision | acțiune |
| | aproape / loc de respirație; stopul care urcă; câștigul nu se mai pierde | de ce |
| | „prețul se recalculează la fiecare umplere” | legenda |
| Fără fișă | încă socotesc fișa | titlu |
| | nu mă mișc până e gata | acțiune |
| | ce vine din fișă; lichidarea și planul se văd și fără ea | de ce |
| Mișcarea e cu botul | multiplul | titlu („lucrează pentru tine” = verdictul 🟢 ȚINE, nu se mai repetă) |
| | fără bani; stopul la zero / deja dincolo / după margine încasezi sau pornești din fișă | acțiune (cea care se aplică acum) |
| | grilele încasează, poziția scade; distanța la margine; după ea botul rămâne fără poziție | de ce |
| | „riscul e la întoarcere: gridul cumpără înapoi la fiecare grilă” | legenda |
| Cartela Stopul | acțiunea, prețul, procentul din investiție, costul atins, planul | rândul (act) + de ce |
| | „pe minus, zero-ul nu e un stop” | de ce |
| | sursa stopului propus | rândul ei (`sursa`) + detalii |
| | „În Pionex: botul → Edit → Stop loss price” | detalii (neschimbat) |
| Cartela Gridul | geometria, umplerile, propunerea | rândul; intervalul propus „între X și Y” → detalii + setările de copiat |
| Cartela Mișcarea | multiplul, acțiunea | rândul; detaliile întregi |
| Consilierul, stopul lăsat pe loc | stopul, planul nou | acțiune |
| | prețul planului, frecvența | `explica` (sub acțiune) |
| Consilierul, „n-aș pune bani lângă margine” | — | în aceeași frază dacă încape, altfel `explica` |
| Perechile | real, așteptat | titlu |
| | fereastra, procentul, „corectat după boții tăi”, costurile | de ce |
| | „o frecvență din trecut, nu o promisiune” | legenda |
| Deciziile tale | urmat / neurmat, mediane | text |
| | „o comparație, nu o dovadă” | legenda |
| Discord, Consilierul | moneda, verdictul, titlul (sau motivul de sus pe scurt), acțiunea, banii, de ce s-a schimbat | titlu ≤ 60 + 2 rânduri; titlul întreg rămâne în Radar |
| „Altă voce” | Discord/alerts zice altceva; colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute | același text, mai scurt |

## 2. Textele generate (garda, după)

| Situația | Sursa | Lung. | Text |
|---|---|---|---|
| muta: la margine, cu profil | mutaGridul.motiv | 53 | prețul la 0,5% de marginea de jos (3,3% din interval) |
| muta: la margine, cu profil | mutaGridul.deCe | 109 | În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%, plafonat la 15% din interval). |
| muta: la margine, fara profil | mutaGridul.motiv | 53 | prețul la 0,5% de marginea de jos (3,3% din interval) |
| muta: la margine, fara profil | mutaGridul.deCe | 61 | Prag fix: 10% din interval (profilul monedei n-a venit încă). |
| muta: in afara gridului | mutaGridul.motiv | 35 | prețul e în afara gridului de 5,3 h |
| grid mai des | gridMaiDes.motiv | 139 | gridul tău are 6 grile la 2,8% pas; gridul des de 0,3% (47 grile între 0.5459 și 0.6279) încheia ~18,5 perechi pe zi pe ultimele 30 de zile |
| btc | btcAvertizare.text | 103 | BTC în mișcare (2,1× față de obișnuitul lui), moneda botului încă liniștită; altcoinii urmează des BTC. |
| aglomerare | aglomerare.text | 153 | Mulțimea e înghesuită pe long, ca botul: funding 0,060%/8 h (6× obișnuitul), open interest +20,0%, long/short 2,10; risc de curățare bruscă în sens opus. |
| aglomerare short | aglomerare.text | 133 | Mulțimea e înghesuită pe short, ca botul: funding −0,050%/8 h (5× obișnuitul), long/short 0,50; risc de curățare bruscă în sens opus. |
| ia profit | iaProfit.text | 159 | Totalul e +5,00 USDT (5,1% din investiție), iar a început o mișcare mare: aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău). |
| lichidarea 12,4%, se indeparteaza | semafor.motiv | 54 | lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h) |
| lichidarea 12,4%, se indeparteaza | semafor.lichidare.motiv | 54 | lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h) |
| lichidarea 12,4%, se indeparteaza | semafor.lichidare.faCeSlab | 65 | N-aș face nimic acum, doar n-aș adăuga poziție până trece de 15%. |
| lichidarea 12,4%, se apropie | semafor.motiv | 49 | lichidarea la 12,4% · se apropie (13,6% acum 1 h) |
| lichidarea 12,4%, se apropie | semafor.faCe | 54 | N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea 12,4%, se apropie | semafor.deCe | 64 | Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”. |
| lichidarea 12,4%, se apropie | semafor.lichidare.motiv | 49 | lichidarea la 12,4% · se apropie (13,6% acum 1 h) |
| lichidarea 12,4%, se apropie | semafor.lichidare.faCe | 54 | N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea 12,4%, se apropie | semafor.lichidare.deCe | 64 | Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”. |
| lichidarea 12,4%, fara istoric | semafor.motiv | 19 | lichidarea la 12,4% |
| lichidarea 12,4%, fara istoric | semafor.faCe | 54 | N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea 12,4%, fara istoric | semafor.deCe | 64 | Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”. |
| lichidarea 12,4%, fara istoric | semafor.lichidare.motiv | 19 | lichidarea la 12,4% |
| lichidarea 12,4%, fara istoric | semafor.lichidare.faCe | 54 | N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea 12,4%, fara istoric | semafor.lichidare.deCe | 64 | Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”. |
| lichidarea 6% | semafor.motiv | 18 | lichidarea la 6,0% |
| lichidarea 6% | semafor.faCe | 42 | Aș adăuga marjă sau aș închide botul acum. |
| lichidarea 6% | semafor.deCe | 31 | Sub 8% nu mai e loc de răbdare. |
| lichidarea 6% | semafor.lichidare.motiv | 18 | lichidarea la 6,0% |
| lichidarea 6% | semafor.lichidare.faCe | 42 | Aș adăuga marjă sau aș închide botul acum. |
| lichidarea 6% | semafor.lichidare.deCe | 31 | Sub 8% nu mai e loc de răbdare. |
| lichidarea depasita | semafor.motiv | 38 | lichidarea estimată e depășită cu 3,4% |
| lichidarea depasita | semafor.faCe | 55 | Aș închide ce a rămas, după ce verific botul în Pionex. |
| lichidarea depasita | semafor.deCe | 51 | Poziția poate fi deja lichidată sau pe marginea ei. |
| lichidarea depasita | semafor.lichidare.motiv | 38 | lichidarea estimată e depășită cu 3,4% |
| lichidarea depasita | semafor.lichidare.faCe | 55 | Aș închide ce a rămas, după ce verific botul în Pionex. |
| lichidarea depasita | semafor.lichidare.deCe | 51 | Poziția poate fi deja lichidată sau pe marginea ei. |
| planul: minus atins | semafor.motiv | 38 | planul tău: pragul de −10 USDT e atins |
| planul: minus atins | semafor.faCe | 46 | Aș închide botul acum, cum ai hotărât la rece. |
| planul: minus atins | semafor.plan.motiv | 38 | planul tău: pragul de −10 USDT e atins |
| planul: minus atins | semafor.plan.faCe | 46 | Aș închide botul acum, cum ai hotărât la rece. |
| planul: plus atins, piata contra | semafor.motiv | 37 | planul tău: ținta de +5 USDT e atinsă |
| planul: plus atins, piata contra | semafor.faCe | 48 | Aș închide botul pe plus acum, cum ți-ai propus. |
| planul: plus atins, piata contra | semafor.plan.motiv | 37 | planul tău: ținta de +5 USDT e atinsă |
| planul: plus atins, piata contra | semafor.plan.faCe | 48 | Aș închide botul pe plus acum, cum ți-ai propus. |
| planul: plus atins, piata contra | semafor.miscare.motiv | 54 | mișcare mare împotriva botului (2,1× față de obișnuit) |
| planul: plus atins, piata contra | semafor.miscare.faCe | 58 | N-aș adăuga bani acum; l-aș lăsa cât lichidarea e departe. |
| planul: plus atins, piata cu botul | semafor.motiv | 37 | planul tău: ținta de +5 USDT e atinsă |
| planul: plus atins, piata cu botul | semafor.faCe | 68 | Aș încasa acum sau aș muta ținta mai sus în „Planul tău”, conștient. |
| planul: plus atins, piata cu botul | semafor.deCe | 70 | Piața încă merge cu botul, dar ținta nu trebuie să treacă neobservată. |
| planul: plus atins, piata cu botul | semafor.plan.motiv | 37 | planul tău: ținta de +5 USDT e atinsă |
| planul: plus atins, piata cu botul | semafor.plan.faCe | 68 | Aș încasa acum sau aș muta ținta mai sus în „Planul tău”, conștient. |
| planul: plus atins, piata cu botul | semafor.plan.deCe | 70 | Piața încă merge cu botul, dar ținta nu trebuie să treacă neobservată. |
| planul: afara din grid | semafor.motiv | 49 | planul tău: în afara gridului peste pragul de ore |
| planul: afara din grid | semafor.faCe | 65 | Aș închide botul și aș porni unul nou din fișă, pe unde e prețul. |
| planul: afara din grid | semafor.plan.motiv | 49 | planul tău: în afara gridului peste pragul de ore |
| planul: afara din grid | semafor.plan.faCe | 65 | Aș închide botul și aș porni unul nou din fișă, pe unde e prețul. |
| trend contra | semafor.motiv | 41 | trendul e împotriva botului (short, tare) |
| trend contra | semafor.faCe | 86 | N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend. |
| trend contra | semafor.trend.motiv | 41 | trendul e împotriva botului (short, tare) |
| trend contra | semafor.trend.faCe | 86 | N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend. |
| miscare contra | semafor.motiv | 54 | mișcare mare împotriva botului (2,1× față de obișnuit) |
| miscare contra | semafor.faCe | 58 | N-aș adăuga bani acum; l-aș lăsa cât lichidarea e departe. |
| miscare contra | semafor.miscare.motiv | 54 | mișcare mare împotriva botului (2,1× față de obișnuit) |
| miscare contra | semafor.miscare.faCe | 58 | N-aș adăuga bani acum; l-aș lăsa cât lichidarea e departe. |
| cu botul, pe plus | semafor.motiv | 42 | mișcarea e cu botul: 2,1× față de obișnuit |
| cu botul, pe plus | semafor.faCe | 60 | Aș muta stopul la zero-ul botului (28.5), fără bani în plus. |
| cu botul, pe plus | semafor.deCe | 130 | Pe drum grilele de sus încasează și poziția scade; până la marginea de sus (33) mai sunt 10,0%, după ea botul rămâne fără poziție. |
| cu botul, stopul dincolo de zero | semafor.motiv | 42 | mișcarea e cu botul: 2,1× față de obișnuit |
| cu botul, stopul dincolo de zero | semafor.faCe | 76 | L-aș lăsa să lucreze, fără bani în plus: stopul (29) e deja dincolo de zero. |
| cu botul, stopul dincolo de zero | semafor.deCe | 130 | Pe drum grilele de sus încasează și poziția scade; până la marginea de sus (33) mai sunt 10,0%, după ea botul rămâne fără poziție. |
| cu botul, peste margine | semafor.motiv | 42 | mișcarea e cu botul: 2,1× față de obișnuit |
| cu botul, peste margine | semafor.faCe | 82 | Aș încasa sau aș porni unul nou din fișă: prețul a trecut de marginea de sus (33). |
| cu botul, peste margine | semafor.deCe | 93 | Botul nu mai are poziție și nu mai câștigă; stopul la zero-ul botului (28.5) păstrează ce ai. |
| cu botul, short | semafor.motiv | 42 | mișcarea e cu botul: 2,1× față de obișnuit |
| cu botul, short | semafor.faCe | 58 | Aș muta stopul la zero-ul botului (31), fără bani în plus. |
| cu botul, short | semafor.deCe | 130 | Pe drum grilele de jos încasează și poziția scade; până la marginea de jos (27) mai sunt 10,0%, după ea botul rămâne fără poziție. |
| muta gridul | semafor.motiv | 53 | prețul la 0,5% de marginea de jos (3,3% din interval) |
| muta gridul | semafor.faCe | 71 | Aș muta gridul: închid botul și pornesc cu setările din cartela Gridul. |
| muta gridul | semafor.deCe | 109 | În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%, plafonat la 15% din interval). |
| muta gridul | semafor.muta.motiv | 53 | prețul la 0,5% de marginea de jos (3,3% din interval) |
| muta gridul | semafor.muta.faCe | 71 | Aș muta gridul: închid botul și pornesc cu setările din cartela Gridul. |
| muta gridul | semafor.muta.deCe | 109 | În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%, plafonat la 15% din interval). |
| costuri | semafor.motiv | 51 | costurile pe zi depășesc grilele: −0,30 USDT net/zi |
| costuri | semafor.faCe | 58 | Aș lua levier mai mic sau grile mai rare la următorul bot. |
| costuri | semafor.costuri.motiv | 51 | costurile pe zi depășesc grilele: −0,30 USDT net/zi |
| costuri | semafor.costuri.faCe | 58 | Aș lua levier mai mic sau grile mai rare la următorul bot. |
| btc | semafor.motiv | 54 | BTC în mișcare (2,1× față de obișnuit), moneda încă nu |
| btc | semafor.faCe | 51 | N-aș adăuga bani până nu se vede încotro trage BTC. |
| btc | semafor.deCe | 26 | Altcoinii urmează des BTC. |
| btc | semafor.btc.motiv | 54 | BTC în mișcare (2,1× față de obișnuit), moneda încă nu |
| btc | semafor.btc.faCe | 51 | N-aș adăuga bani până nu se vede încotro trage BTC. |
| btc | semafor.btc.deCe | 26 | Altcoinii urmează des BTC. |
| btc fara multiplu (colector vechi) | semafor.motiv | 30 | BTC în mișcare, moneda încă nu |
| btc fara multiplu (colector vechi) | semafor.faCe | 51 | N-aș adăuga bani până nu se vede încotro trage BTC. |
| btc fara multiplu (colector vechi) | semafor.deCe | 26 | Altcoinii urmează des BTC. |
| btc fara multiplu (colector vechi) | semafor.btc.motiv | 30 | BTC în mișcare, moneda încă nu |
| btc fara multiplu (colector vechi) | semafor.btc.faCe | 51 | N-aș adăuga bani până nu se vede încotro trage BTC. |
| btc fara multiplu (colector vechi) | semafor.btc.deCe | 26 | Altcoinii urmează des BTC. |
| aglomerare | semafor.motiv | 49 | mulțimea e înghesuită pe partea botului (3 semne) |
| aglomerare | semafor.faCe | 58 | Aș strânge riscul: aș adăuga marjă sau aș închide o parte. |
| aglomerare | semafor.deCe | 121 | Semnele: funding 0,060%/8 h (6× obișnuitul), open interest +20,0%, long/short 2,10; risc de curățare bruscă în sens opus. |
| aglomerare | semafor.aglomerare.motiv | 49 | mulțimea e înghesuită pe partea botului (3 semne) |
| aglomerare | semafor.aglomerare.faCe | 58 | Aș strânge riscul: aș adăuga marjă sau aș închide o parte. |
| aglomerare | semafor.aglomerare.deCe | 121 | Semnele: funding 0,060%/8 h (6× obișnuitul), open interest +20,0%, long/short 2,10; risc de curățare bruscă în sens opus. |
| ia profit | semafor.motiv | 48 | moment bun de încasat: totalul +5,00 USDT (5,1%) |
| ia profit | semafor.faCe | 61 | Aș închide botul pe plus și aș reporni când fișa zice iar 🟢. |
| ia profit | semafor.deCe | 111 | A început o mișcare mare: aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău). |
| ia profit | semafor.ia-profit.motiv | 48 | moment bun de încasat: totalul +5,00 USDT (5,1%) |
| ia profit | semafor.ia-profit.faCe | 61 | Aș închide botul pe plus și aș reporni când fișa zice iar 🟢. |
| ia profit | semafor.ia-profit.deCe | 111 | A început o mișcare mare: aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău). |
| fara fisa | semafor.motiv | 26 | încă socotesc fișa monedei |
| fara fisa | semafor.faCe | 31 | Nu m-aș mișca până e gata fișa. |
| fara fisa | semafor.deCe | 92 | Din fișă vin gridul propus, trendul și mișcarea; lichidarea și planul tău se văd și fără ea. |
| nimic de facut | semafor.motiv | 28 | nimic nu cere o mișcare acum |
| nimic de facut | semafor.faCe | 50 | L-aș lăsa să lucreze și m-aș uita din nou diseară. |
| tinta atinsa, de pastrat | semafor.motiv | 41 | ținta ta de +3 USDT e atinsă — păstreaz-o |
| tinta atinsa, de pastrat | semafor.faCe | 88 | Aș muta stopul la 30.4203 (1,1% de preț): închis acolo, totalul e +3 USDT după comision. |
| tinta atinsa, de pastrat | semafor.deCe | 95 | E aproape: o mișcare obișnuită îl poate atinge curând, iar mai departe înseamnă ceva sub țintă. |
| tinta atinsa, de pastrat | semafor.podea.motiv | 41 | ținta ta de +3 USDT e atinsă — păstreaz-o |
| tinta atinsa, de pastrat | semafor.podea.faCe | 88 | Aș muta stopul la 30.4203 (1,1% de preț): închis acolo, totalul e +3 USDT după comision. |
| tinta atinsa, de pastrat | semafor.podea.deCe | 95 | E aproape: o mișcare obișnuită îl poate atinge curând, iar mai departe înseamnă ceva sub țintă. |
| tinta atinsa, de pastrat, poate urca | semafor.motiv | 41 | ținta ta de +3 USDT e atinsă — păstreaz-o |
| tinta atinsa, de pastrat, poate urca | semafor.faCe | 88 | Aș muta stopul la 30.4203 (3,4% de preț): închis acolo, totalul e +3 USDT după comision. |
| tinta atinsa, de pastrat, poate urca | semafor.deCe | 93 | Cu 1,5% loc de respirație, stopul la 31.0275 ar păstra +6,58 USDT (cel de acum: −19,33 USDT). |
| tinta atinsa, de pastrat, poate urca | semafor.podea.motiv | 41 | ținta ta de +3 USDT e atinsă — păstreaz-o |
| tinta atinsa, de pastrat, poate urca | semafor.podea.faCe | 88 | Aș muta stopul la 30.4203 (3,4% de preț): închis acolo, totalul e +3 USDT după comision. |
| tinta atinsa, de pastrat, poate urca | semafor.podea.deCe | 93 | Cu 1,5% loc de respirație, stopul la 31.0275 ar păstra +6,58 USDT (cel de acum: −19,33 USDT). |
| tinta atinsa, la adapost | semafor.motiv | 38 | ținta de +3 USDT, atinsă și la adăpost |
| tinta atinsa, la adapost | semafor.faCe | 73 | L-aș lăsa să lucreze: stopul (30.6) păstrează +4,06 USDT la o întoarcere. |
| tinta atinsa, la adapost | semafor.deCe | 95 | O întoarcere te scoate tot cu cel puțin +3 USDT; îți scriu pe Discord când merită urcat stopul. |
| JTO pe minus, fara stop | cartela.stop.act | 64 | Dacă vrei protecție, aș pune stopul sub gridul de jos, la 0.542. |
| JTO pe minus, fara stop | cartela.stop.deCe | 72 | Pe minus, un stop la zero-ul botului (0.5984, +2,6% de preț) n-are sens. |
| JTO pe minus, fara stop | cartela.stop.text | 179 | Stopul tău: nepus. Zero-ul botului e la 0.5984 (2,6% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 0.542, dar se închide pe minus. |
| JTO pe minus, fara stop | cartela.stop.mic | 19 | fără stop în Pionex |
| JTO pe minus, fara stop | cartela.grid.act | 84 | 6 grile la 2,8% pas · 5 umpleri în 24 h (+0,90 USDT) · propus: 47 grile la 0,3% pas. |
| JTO pe minus, fara stop | cartela.grid.text | 262 | Al tău: 6 grile la 2,8% pas (net 2,8%), 5 umpleri în 24 h (+0,90 USDT). Prețul e la 12,8% din interval: 1,9% până jos, 12,7% până sus. Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| JTO pe minus, fara stop | cartela.grid.mic | 12 | din interval |
| JTO pe minus, fara stop | cartela.miscare.act | 73 | 0,8× pe 24 h: n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare. |
| JTO pe minus, fara stop | cartela.miscare.text | 139 | 0,6× pe 4 h, 0,8× pe 24 h față de obișnuitul monedei. Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot. |
| JTO pe minus, fara stop | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| JTO pe plus, fara stop | cartela.stop.act | 85 | Aș pune stopul la 0.6012 (zero-ul botului, −3,0% de preț): câștigul nu se mai pierde. |
| JTO pe plus, fara stop | cartela.stop.text | 154 | Stopul tău: nepus → l-aș muta la 0.6012 (zero-ul botului, la 3,0% de preț): de acolo câștigul nu se mai pierde. În Pionex: botul → Edit → Stop loss price. |
| JTO pe plus, fara stop | cartela.stop.mic | 19 | fără stop în Pionex |
| JTO pe plus, fara stop | cartela.grid.act | 51 | 6 grile la 2,8% pas · propus: 47 grile la 0,3% pas. |
| JTO pe plus, fara stop | cartela.grid.text | 229 | Al tău: 6 grile la 2,8% pas (net 2,8%). Prețul e la 56,2% din interval: 7,7% până jos, 6,0% până sus. Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| JTO pe plus, fara stop | cartela.grid.mic | 12 | din interval |
| JTO pe plus, fara stop | cartela.miscare.act | 73 | 0,8× pe 24 h: n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare. |
| JTO pe plus, fara stop | cartela.miscare.text | 139 | 0,6× pe 4 h, 0,8× pe 24 h față de obișnuitul monedei. Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot. |
| JTO pe plus, fara stop | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| JTO pe plus, stopul dincolo de zero | cartela.stop.act | 54 | L-aș lăsa: e deja dincolo de zero-ul botului (0.6012). |
| JTO pe plus, stopul dincolo de zero | cartela.stop.deCe | 37 | O întoarcere nu te mai duce pe minus. |
| JTO pe plus, stopul dincolo de zero | cartela.stop.text | 148 | Stopul tău: 0.605, deja dincolo de zero-ul botului (0.6012): o întoarcere nu te mai poate duce pe minus; l-aș lăsa, iar pe măsură ce urcă, îl ridic. |
| JTO pe plus, stopul dincolo de zero | cartela.stop.mic | 21 | activ · −2,4% de preț |
| JTO pe plus, stopul dincolo de zero | cartela.grid.act | 51 | 6 grile la 2,8% pas · propus: 47 grile la 0,3% pas. |
| JTO pe plus, stopul dincolo de zero | cartela.grid.text | 229 | Al tău: 6 grile la 2,8% pas (net 2,8%). Prețul e la 56,2% din interval: 7,7% până jos, 6,0% până sus. Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| JTO pe plus, stopul dincolo de zero | cartela.grid.mic | 12 | din interval |
| JTO pe plus, stopul dincolo de zero | cartela.miscare.act | 73 | 0,8× pe 24 h: n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare. |
| JTO pe plus, stopul dincolo de zero | cartela.miscare.text | 139 | 0,6× pe 4 h, 0,8× pe 24 h față de obișnuitul monedei. Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot. |
| JTO pe plus, stopul dincolo de zero | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| JTO neutru | cartela.stop.act | 85 | Aș pune protecția la o grilă în afara intervalului, pe ambele părți (botul e neutru). |
| JTO neutru | cartela.stop.text | 222 | Stopul tău: nepus. Botul neutru cumpără sub preț și vinde peste, deci zero-ul (0.5984, la 2,6% de preț) e doar reper; ești pe minus: protecția stă la o grilă în afara intervalului, pe ambele părți, dar se închide pe minus. |
| JTO neutru | cartela.stop.mic | 19 | fără stop în Pionex |
| JTO neutru | cartela.grid.act | 51 | 6 grile la 2,8% pas · propus: 47 grile la 0,3% pas. |
| JTO neutru | cartela.grid.text | 230 | Al tău: 6 grile la 2,8% pas (net 2,8%). Prețul e la 12,8% din interval: 1,9% până jos, 12,7% până sus. Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| JTO neutru | cartela.grid.mic | 12 | din interval |
| JTO neutru | cartela.miscare.act | 73 | 0,8× pe 24 h: n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare. |
| JTO neutru | cartela.miscare.text | 139 | 0,6× pe 4 h, 0,8× pe 24 h față de obișnuitul monedei. Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot. |
| JTO neutru | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| JTO sub grid, miscare contra | cartela.stop.act | 64 | Dacă vrei protecție, aș pune stopul sub gridul de jos, la 0.542. |
| JTO sub grid, miscare contra | cartela.stop.deCe | 72 | Pe minus, un stop la zero-ul botului (0.5984, +5,0% de preț) n-are sens. |
| JTO sub grid, miscare contra | cartela.stop.text | 179 | Stopul tău: nepus. Zero-ul botului e la 0.5984 (5,0% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 0.542, dar se închide pe minus. |
| JTO sub grid, miscare contra | cartela.stop.mic | 19 | fără stop în Pionex |
| JTO sub grid, miscare contra | cartela.grid.act | 51 | 6 grile la 2,8% pas · propus: 47 grile la 0,3% pas. |
| JTO sub grid, miscare contra | cartela.grid.text | 242 | Al tău: 6 grile la 2,8% pas (net 2,8%). Prețul e sub gridul de jos cu 0,4% (botul nu mai cumpără; 15,3% până sus). Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| JTO sub grid, miscare contra | cartela.grid.mic | 17 | sub gridul de jos |
| JTO sub grid, miscare contra | cartela.miscare.act | 72 | 2,1× pe 24 h: n-aș adăuga bani; aș urmări lichidarea (19,1% până la ea). |
| JTO sub grid, miscare contra | cartela.miscare.text | 178 | 1,1× pe 4 h, 2,1× pe 24 h față de obișnuitul monedei. Mișcare mare, împotriva botului (n-aș adăuga bani, aș urmări lichidarea); n-aș îndesi gridul acum, ci după ce se liniștește. |
| JTO sub grid, miscare contra | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| JTO stop in grid | cartela.stop.act | 82 | Stopul tău (0.58) stă în grid: o mișcare mică îl atinge și închide botul pe minus. |
| JTO stop in grid | cartela.stop.deCe | 72 | Pe minus, un stop la zero-ul botului (0.5984, +2,6% de preț) n-are sens. |
| JTO stop in grid | cartela.stop.text | 178 | Stopul tău: 0.58. Zero-ul botului e la 0.5984 (2,6% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 0.542, dar se închide pe minus. |
| JTO stop in grid | cartela.stop.mic | 21 | activ · −0,5% de preț |
| JTO stop in grid | cartela.grid.act | 51 | 6 grile la 2,8% pas · propus: 47 grile la 0,3% pas. |
| JTO stop in grid | cartela.grid.text | 230 | Al tău: 6 grile la 2,8% pas (net 2,8%). Prețul e la 12,8% din interval: 1,9% până jos, 12,7% până sus. Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| JTO stop in grid | cartela.grid.mic | 12 | din interval |
| JTO stop in grid | cartela.miscare.act | 73 | 0,8× pe 24 h: n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare. |
| JTO stop in grid | cartela.miscare.text | 139 | 0,6× pe 4 h, 0,8× pe 24 h față de obișnuitul monedei. Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot. |
| JTO stop in grid | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| JTO fara zero | cartela.stop.act | 71 | Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul). |
| JTO fara zero | cartela.stop.text | 90 | Stopul tău: nepus. Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul). |
| JTO fara zero | cartela.stop.mic | 19 | fără stop în Pionex |
| JTO fara zero | cartela.grid.act | 46 | 6 grile la 2,8% pas · propunerea vine cu fișa. |
| JTO fara zero | cartela.grid.text | 152 | Al tău: 6 grile la 2,8% pas (net 2,8%). Prețul e la 12,8% din interval: 1,9% până jos, 12,7% până sus. Propunerea (gridul des sau cel rar) vine cu fișa. |
| JTO fara zero | cartela.grid.mic | 12 | din interval |
| JTO fara zero | cartela.miscare.act | 25 | O socotesc odată cu fișa. |
| JTO fara zero | cartela.miscare.text | 77 | O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei. |
| JTO fara zero | cartela.miscare.mic | 10 | o socotesc |
| LIGHTER stopul peste plan | cartela.stop.act | 103 | Aș muta stopul la 4.2601 (în procente: −15,2% din investiție): atins acum, te costă ≈ 63 USDT, nu 15,7. |
| LIGHTER stopul peste plan | cartela.stop.deCe | 68 | Planul tău zice −15,7 USDT; stopul de la 3.787 stă mult mai departe. |
| LIGHTER stopul peste plan | cartela.stop.text | 180 | Stopul tău: 3.787. Zero-ul botului e la 4.4885 (0,3% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 4.0387, dar se închide pe minus. |
| LIGHTER stopul peste plan | cartela.stop.bani | 143 | 💰 Pierderea maximă: −63,5 USDT cu stopul de acum → −15,7 USDT cu cel propus · ce cedezi: o zi obișnuită a monedei ajunge acolo în 71% din zile |
| LIGHTER stopul peste plan | cartela.stop.mic | 41 | activ · −15,3% de preț · atins ≈ −63 USDT |
| LIGHTER stopul peste plan | cartela.grid.act | 47 | 16 grile la 1,1% pas · propunerea vine cu fișa. |
| LIGHTER stopul peste plan | cartela.grid.text | 152 | Al tău: 16 grile la 1,1% pas (net 1,1%). Prețul e la 51,6% din interval: 8,7% până jos, 8,1% până sus. Propunerea (gridul des sau cel rar) vine cu fișa. |
| LIGHTER stopul peste plan | cartela.grid.mic | 12 | din interval |
| LIGHTER stopul peste plan | cartela.miscare.act | 25 | O socotesc odată cu fișa. |
| LIGHTER stopul peste plan | cartela.miscare.text | 77 | O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei. |
| LIGHTER stopul peste plan | cartela.miscare.mic | 10 | o socotesc |
| LIGHTER fara stop, cu plan | cartela.stop.act | 92 | Aș pune stopul la 4.2601 (în procente: −15,2% din investiție), cât zice planul (−15,7 USDT). |
| LIGHTER fara stop, cu plan | cartela.stop.deCe | 72 | Pe minus, un stop la zero-ul botului (4.4885, +0,3% de preț) n-are sens. |
| LIGHTER fara stop, cu plan | cartela.stop.text | 180 | Stopul tău: nepus. Zero-ul botului e la 4.4885 (0,3% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 4.0387, dar se închide pe minus. |
| LIGHTER fara stop, cu plan | cartela.stop.mic | 19 | fără stop în Pionex |
| LIGHTER fara stop, cu plan | cartela.grid.act | 47 | 16 grile la 1,1% pas · propunerea vine cu fișa. |
| LIGHTER fara stop, cu plan | cartela.grid.text | 152 | Al tău: 16 grile la 1,1% pas (net 1,1%). Prețul e la 51,6% din interval: 8,7% până jos, 8,1% până sus. Propunerea (gridul des sau cel rar) vine cu fișa. |
| LIGHTER fara stop, cu plan | cartela.grid.mic | 12 | din interval |
| LIGHTER fara stop, cu plan | cartela.miscare.act | 25 | O socotesc odată cu fișa. |
| LIGHTER fara stop, cu plan | cartela.miscare.text | 77 | O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei. |
| LIGHTER fara stop, cu plan | cartela.miscare.mic | 10 | o socotesc |
| LIGHTER stopul pe plan | cartela.stop.act | 40 | L-aș lăsa: stopul stă sub gridul de jos. |
| LIGHTER stopul pe plan | cartela.stop.deCe | 72 | Pe minus, un stop la zero-ul botului (4.4885, +0,3% de preț) n-are sens. |
| LIGHTER stopul pe plan | cartela.stop.text | 179 | Stopul tău: 4.05. Zero-ul botului e la 4.4885 (0,3% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 4.0387, dar se închide pe minus. |
| LIGHTER stopul pe plan | cartela.stop.mic | 40 | activ · −9,5% de preț · atins ≈ −36 USDT |
| LIGHTER stopul pe plan | cartela.grid.act | 47 | 16 grile la 1,1% pas · propunerea vine cu fișa. |
| LIGHTER stopul pe plan | cartela.grid.text | 152 | Al tău: 16 grile la 1,1% pas (net 1,1%). Prețul e la 51,6% din interval: 8,7% până jos, 8,1% până sus. Propunerea (gridul des sau cel rar) vine cu fișa. |
| LIGHTER stopul pe plan | cartela.grid.mic | 12 | din interval |
| LIGHTER stopul pe plan | cartela.miscare.act | 25 | O socotesc odată cu fișa. |
| LIGHTER stopul pe plan | cartela.miscare.text | 77 | O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei. |
| LIGHTER stopul pe plan | cartela.miscare.mic | 10 | o socotesc |
| short, stopul din profil | cartela.stop.act | 66 | Dacă vrei protecție, aș pune stopul peste gridul de sus, la 0.632. |
| short, stopul din profil | cartela.stop.deCe | 70 | Pe minus, un stop la zero-ul botului (0.45, −4,3% de preț) n-are sens. |
| short, stopul din profil | cartela.stop.text | 254 | Stopul tău: nepus. Zero-ul botului e la 0.45 (4,3% sub preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi peste gridul de sus, la 0.632, dar se închide pe minus. Stopul propus: stopul fișei e deja dincolo de o zi obișnuită (profilul CRV). |
| short, stopul din profil | cartela.stop.mic | 19 | fără stop în Pionex |
| short, stopul din profil | cartela.stop.sursa | 76 | Stopul propus: stopul fișei e deja dincolo de o zi obișnuită (profilul CRV). |
| short, stopul din profil | cartela.grid.act | 51 | 6 grile la 4,6% pas · propus: 47 grile la 0,3% pas. |
| short, stopul din profil | cartela.grid.text | 230 | Al tău: 6 grile la 4,6% pas (net 4,5%). Prețul e la 70,0% din interval: 14,9% până jos, 6,4% până sus. Propus acum (grid des 0,3%): 47 grile între 0.5459 și 0.6279 la 0,3% pas, ~18,5 perechi încheiate pe zi pe ultimele 30 de zile. |
| short, stopul din profil | cartela.grid.mic | 12 | din interval |
| short, stopul din profil | cartela.miscare.act | 73 | 0,8× pe 24 h: n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare. |
| short, stopul din profil | cartela.miscare.text | 139 | 0,6× pe 4 h, 0,8× pe 24 h față de obișnuitul monedei. Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot. |
| short, stopul din profil | cartela.miscare.mic | 23 | pe 4 h față de obișnuit |
| stopul tau mai strans decat propunerea | cartela.stop.act | 103 | Aș muta stopul la 4.2601 (în procente: −15,2% din investiție): atins acum, te costă ≈ 63 USDT, nu 15,7. |
| stopul tau mai strans decat propunerea | cartela.stop.deCe | 68 | Planul tău zice −15,7 USDT; stopul de la 3.787 stă mult mai departe. |
| stopul tau mai strans decat propunerea | cartela.stop.text | 180 | Stopul tău: 3.787. Zero-ul botului e la 4.4885 (0,3% peste preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi sub gridul de jos, la 4.0387, dar se închide pe minus. |
| stopul tau mai strans decat propunerea | cartela.stop.bani | 98 | 💰 Stopul tău pierde cel mult 10,2 USDT, mai puțin decât cel propus (21,0 USDT): l-aș lăsa unde e. |
| stopul tau mai strans decat propunerea | cartela.stop.mic | 41 | activ · −15,3% de preț · atins ≈ −63 USDT |
| stopul tau mai strans decat propunerea | cartela.grid.act | 47 | 16 grile la 1,1% pas · propunerea vine cu fișa. |
| stopul tau mai strans decat propunerea | cartela.grid.text | 152 | Al tău: 16 grile la 1,1% pas (net 1,1%). Prețul e la 51,6% din interval: 8,7% până jos, 8,1% până sus. Propunerea (gridul des sau cel rar) vine cu fișa. |
| stopul tau mai strans decat propunerea | cartela.grid.mic | 12 | din interval |
| stopul tau mai strans decat propunerea | cartela.miscare.act | 25 | O socotesc odată cu fișa. |
| stopul tau mai strans decat propunerea | cartela.miscare.text | 77 | O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei. |
| stopul tau mai strans decat propunerea | cartela.miscare.mic | 10 | o socotesc |
| LIGHTER: stopul peste plan | consiliu.titlu | 23 | Stopul costă peste plan |
| LIGHTER: stopul peste plan | consiliu.faCe | 55 | Aș lăsa stopul la 3.787 și aș trece planul la −64 USDT. |
| LIGHTER: stopul peste plan | consiliu.explica | 95 | Stopul planului (4.2601) e prea aproape: o zi obișnuită a monedei ajunge acolo în 71% din zile. |
| LIGHTER: stopul peste plan | consiliu.bani | 73 | pierderea maximă: −63,5 USDT cu stopul de acum · −15,7 cu stopul planului |
| LIGHTER: stopul peste plan | consiliu.incredere | 30 | Semaforul singur zicea „ȚINE”. |
| LIGHTER: stopul peste plan | consiliu.motiv1.stop.titlu | 38 | Stopul e peste plan: atins, ≈ −63 USDT |
| LIGHTER: stopul peste plan | consiliu.motiv1.stop.text | 68 | Planul tău zice −15,7 USDT; stopul de la 3.787 stă mult mai departe. |
| lichidarea se indeparteaza + muta gridul | consiliu.titlu | 54 | Lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h) |
| lichidarea se indeparteaza + muta gridul | consiliu.faCe | 71 | Aș muta gridul: închid botul și pornesc cu setările din cartela Gridul. |
| lichidarea se indeparteaza + muta gridul | consiliu.motiv1.lichidare.titlu | 54 | Lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h) |
| lichidarea se indeparteaza + muta gridul | consiliu.motiv2.muta.titlu | 53 | Prețul la 0,5% de marginea de jos (3,3% din interval) |
| lichidarea se indeparteaza + muta gridul | consiliu.motiv2.muta.text | 109 | În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%, plafonat la 15% din interval). |
| lichidarea se indeparteaza + muta gridul | consiliu.motiv2.muta.extra | 40 | profilul CRV: 183 de zile de bare de 1 h |
| lichidarea se apropie + trend contra | consiliu.titlu | 49 | Lichidarea la 12,4% · se apropie (13,6% acum 1 h) |
| lichidarea se apropie + trend contra | consiliu.faCe | 54 | N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea se apropie + trend contra | consiliu.motiv1.lichidare.titlu | 49 | Lichidarea la 12,4% · se apropie (13,6% acum 1 h) |
| lichidarea se apropie + trend contra | consiliu.motiv1.lichidare.text | 64 | Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”. |
| lichidarea se apropie + trend contra | consiliu.motiv2.trend.titlu | 41 | Trendul e împotriva botului (short, tare) |
| gridul incheie putine perechi | consiliu.titlu | 34 | Gridul încheie prea puține perechi |
| gridul incheie putine perechi | consiliu.faCe | 61 | Aș muta gridul pe unde stă prețul acum, cu setările din fișă. |
| gridul incheie putine perechi | consiliu.incredere | 30 | Semaforul singur zicea „ȚINE”. |
| gridul incheie putine perechi | consiliu.motiv1.perechi.titlu | 50 | Gridul încheie 1,2 perechi pe zi; fișa aștepta 4,0 |
| gridul incheie putine perechi | consiliu.motiv1.perechi.text | 155 | Așteptarea vine din cele 30 de zile dinaintea pornirii, corectată după boții tăi pe monedă; în ultimele 30 h a făcut 30% din ea, prea puțin pentru costuri. |
| cu botul (verdict ȚINE cu explicatie) | consiliu.titlu | 42 | Mișcarea e cu botul: 2,1× față de obișnuit |
| cu botul (verdict ȚINE cu explicatie) | consiliu.faCe | 60 | Aș muta stopul la zero-ul botului (28.5), fără bani în plus. |
| cu botul (verdict ȚINE cu explicatie) | consiliu.explica | 130 | Pe drum grilele de sus încasează și poziția scade; până la marginea de sus (33) mai sunt 10,0%, după ea botul rămâne fără poziție. |
| fara fisa | consiliu.titlu | 26 | Încă socotesc fișa monedei |
| fara fisa | consiliu.faCe | 31 | Nu m-aș mișca până e gata fișa. |
| fara fisa | consiliu.explica | 92 | Din fișă vin gridul propus, trendul și mișcarea; lichidarea și planul tău se văd și fără ea. |
| Discord: LIGHTER trece pe atenție | consiliu.schimbare.titlu | 42 | LIGHTER · Atenție: stopul costă peste plan |
| Discord: LIGHTER trece pe atenție | consiliu.schimbare.mesaj | 213 | 👉 Aș lăsa stopul la 3.787 și aș trece planul la −64 USDT. · 💰 pierderea maximă: −63,5 USDT cu stopul de acum · −15,7 cu stopul planului ⏎ De ce: din 🟢 Ține în 🟡 Atenție · + Stopul e peste plan: atins, ≈ −63 USDT |
| Discord: 1000BONK trece pe atenție | consiliu.schimbare.titlu | 43 | 1000BONK · Atenție: stopul costă peste plan |
| Discord: 1000BONK trece pe atenție | consiliu.schimbare.mesaj | 213 | 👉 Aș lăsa stopul la 3.787 și aș trece planul la −64 USDT. · 💰 pierderea maximă: −63,5 USDT cu stopul de acum · −15,7 cu stopul planului ⏎ De ce: din 🟢 Ține în 🟡 Atenție · + Stopul e peste plan: atins, ≈ −63 USDT |
| alta voce | consiliu.altaVoce.t | 159 | Pe Discord și pe pagina alerts: 🟢 Ține; colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute, iar verdictul de aici e cel complet. |
| deciziile tale | consiliu.socotealaDecizii.text | 80 | Când ai urmat Consilierul (14): median 0,0 USDT la 24 h; când nu (26): 0,0 USDT. |

## Discord (de probă, netrimis)

```json
[
 {
  "content": "🟠 LIGHTER · Atenție: stopul costă peste plan",
  "description": "👉 Aș lăsa stopul la 3.787 și aș trece planul la −64 USDT. · 💰 pierderea maximă: −63,5 USDT cu stopul de acum · −15,7 cu stopul planului\nDe ce: din 🟢 Ține în 🟡 Atenție · + Stopul e peste plan: atins, ≈ −63 USDT"
 },
 {
  "content": "🟠 1000BONK · Atenție: stopul costă peste plan",
  "description": "👉 Aș lăsa stopul la 3.787 și aș trece planul la −64 USDT. · 💰 pierderea maximă: −63,5 USDT cu stopul de acum · −15,7 cu stopul planului\nDe ce: din 🟢 Ține în 🟡 Atenție · + Stopul e peste plan: atins, ≈ −63 USDT"
 }
]
```
