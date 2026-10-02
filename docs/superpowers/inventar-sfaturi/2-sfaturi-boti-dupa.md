# Inventarul pachetului 2 (sfaturile boților) — după

Specul: `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` · „înainte”: `2-sfaturi-boti-inainte.md` · textele de mai jos (tabelul mare) sunt generate de garda textelor pe situațiile lui, cu modulele adevărate.

## Harta informațiilor

Fiecare informație din „înainte” și unde stă acum. „Legenda” = legenda de sub Consilier (o singură dată, pentru toate sfaturile).

| Sfatul | Informația (înainte) | Unde e acum |
|---|---|---|
| margine | distanța în % și prețul marginii | titlu, cifra întâi, cu virgulă (cum îl rescria Consilierul) |
| margine | câte monede ar ține botul la margine, câte are acum, totalul acolo | text |
| margine | cât de des coboară atât, pe zile și pe săptămâni, cu numărul de cazuri și „puține cazuri” | text |
| margine | „frecvență din lumânările de 4 ore, ferestre care nu se suprapun” | sursa |
| margine | „Nu e o prognoză.” | legenda („vin din trecut și nu sunt promisiuni”) |
| margine | „se întâmplă des pe moneda asta” (de ce, la atenție) | frecvența din text (≥ 20% din zile = atenție) |
| margine | n-aș crește levierul, n-aș pune bani în plus | faCe |
| pericol · lichidarea sub 8% | adaug marjă sau închid botul, acum | faCe = a semaforului („Aș adăuga marjă sau aș închide botul acum.”) |
| pericol · lichidarea sub 8% | „Sub 8% nu mai e loc de răbdare.” | textul alertei („Sub 8% e zona de ieșire.”) + „de ce”-ul semaforului |
| pericol · lichidarea 8–15% | n-aș mai adăuga poziție; sub 8% adaug marjă (sau închid); urmăresc | faCe = a semaforului; „sau închid” = acțiunea de sub 8% |
| pericol · prețul ieșit din grid | aștept o zi; dacă nu revine, opresc și pornesc unul nou din fișă, pe unde stă prețul | faCe („… aș închide botul și aș porni din fișă unul la prețul de acum”) |
| trend | direcția și tăria | titlu (neschimbat) |
| trend | motivele măsurate (EMA20/EMA50, structura) | text (separate cu „ · ”) |
| trend | ce face gridul contra trendului (cumpără la fiecare nivel, pierderea crește) | legenda |
| trend | „măsurat pe bare închise (EMA20/EMA50 + structura pe 4h, EMA pe 1z)” | sursa |
| trend | „nu spune încotro va merge” | legenda |
| trend | n-aș adăuga bani; dacă se întărește, închid lângă zero și pornesc pe trend | faCe = a semaforului |
| trend | „vezi prețul de zero mai jos” | scos (trimitere); zero-ul are sfatul lui |
| mișcarea cu botul | multiplii pe 4 h și 24 h, „față de obișnuit” | titlu („× obișnuitul (4 h) … (24 h)”) |
| mișcarea cu botul | grilele încasează pe drum, poziția scade | text |
| mișcarea cu botul | „riscul e la întoarcere, gridul cumpără înapoi la fiecare grilă” | legenda (din pachetul 1) |
| mișcarea cu botul | dovada pe 40 de monede (59% / 50% / 56%) | sursa |
| mișcarea cu botul | „nimic dovedit, dar nicio pagubă văzută” | legenda („nu sunt promisiuni”) + cifrele din sursă |
| mișcarea cu botul | fără bani în plus, stopul la zero, urmăresc marginea | faCe |
| mișcarea contra | multiplii, „față de obișnuit” | titlu |
| mișcarea contra | „obișnuit” = percentila 75 pe 30 de zile | sursa |
| mișcarea contra | gridul nu face perechi, strânge poziție; le reia la liniște | text |
| mișcarea contra | nu adaug bani; nu pornesc alt grid aici până la liniște; îl las cât lichidarea e peste 15% | faCe |
| liniștea | câte zile | titlu |
| liniștea | k din n perioade, H zile, procentul | text (procentul la întreg: 23,08% → 23%) |
| liniștea | ultimele 30 de zile, intervalul de încredere | sursa (8%–50%) |
| liniștea | ține rar: nu pun bani, încasez, închid la prima mișcare mare / ține: îl las | faCe |
| ritmul | grilele în 24 h, media pe zi | titlu |
| ritmul | tranzacțiile în 24 h față de media pe zi; de ce (zona perechilor / piața înghețată; mișcarea) | text |
| ritmul | dacă rămâne jos încă o zi, închid și pornesc din fișă la prețul de acum / verific lichidarea | faCe |
| costurile | netul pe zi | titlu |
| costurile | grilele în 24 h, comisioanele, funding-ul pe zi | text |
| costurile | levier mai mic / direcția care încasează funding-ul / grile mai rare | faCe |
| setarea | ce e greșit (grile prea dese, levier peste cel sigur) | titlu |
| setarea | câte grile, ce fel, cât lasă pe umplere; levierul și cel sigur | text |
| setarea | nu-l închid pentru asta; la următorul grile geometrice și levierul din fișă (cel mult N×) | faCe |
| zero-ul | prețul de zero și distanța | titlu |
| zero-ul | cât iei închis acum, din cât ai investit | text |
| zero-ul | take-profit (nu stop) la zero, și de ce nu stop | faCe |
| zero-ul | „lasă-l să lucreze până acolo” | spus de take-profit |
| direcția | concluzia | titlu |
| direcția | intervalele (4 ore …, 1 zi …) și nota barei de 4 ore de acum | text (`Directie.rezumat(...).dovezi`) |
| direcția | ce face un grid long pe scădere | legenda |
| direcția | „măsurată pe bare închise; nu spune încotro va merge” | legenda |
| direcția | n-aș adăuga bani până se întoarce pe 4 h | faCe |
| funding-ul | rata la 8 ore și cine o plătește | titlu |
| funding-ul | cât a plătit (primit) botul până acum | text |
| funding-ul | „la socoteala zilei scade câștigul din grile” | text („la rata asta plătești din câștigul grilelor”) |
| funding-ul | rata e de la Binance, Pionex poate avea alta | sursa |
| funding-ul | n-aș ține botul mult pe direcția asta | faCe |
| nimic urgent | totalul botului | text |
| nimic urgent | „nu văd nimic care să ceară o mișcare acum” | titlul („Nimic urgent”) |
| Consilier · verdictul vechi, starea Pionex | starea raportată (MARGIN_CALL / REDUCE_ONLY …) | titlu (neschimbat) |
| Consilier · verdictul vechi, starea Pionex | „nu NORMAL / nu TRADING” | text („Pionex o dă altfel decât NORMAL …”) |
| Consilier · verdictul vechi, starea Pionex | de ce bate calculul nostru (era doar în comentariul codului) | text (nou la vedere) |
| Consilier · verdictul vechi, lichidarea depășită | cu cât a trecut prețul de lichidare | titlu, cu virgulă (era spus de două ori) |
| Legenda | + trendul și direcția pe bare închise, nu prognoză; contra botului gridul adaugă poziție | legenda (o dată) |
| Ce ai de făcut acum · planul lipsă | scrie-l la rece; colectorul te anunță la prag | text, o frază |
| Ce ai de făcut acum · mesajele pe două rânduri | (se lipeau: „−4,6 De ce: …”) | rămân pe două rânduri |
| Ritmul de recuperare | zilele până pe zero, netul pe zi, condiția | același text, virgulă |
| Panoul planului | ținta / pragul, cât mai e, „ieși” | aceleași cifre cu virgulă, „închide botul” |
| Portofoliul | N boți pe aceeași parte = un singur pariu; nu pornesc altul pe partea asta; următorul neutru sau pe partea cealaltă | rândul „de ce” + o acțiune |
| Server · fără stop și țintă | „niciun opritor configurat” | „n-are nici stop, nici țintă în Pionex” |
| Server · prețul în afara gridului | prețul, intervalul, „nu mai câștigă din oscilații” | prețul, sub/peste, intervalul, „nu mai face perechi cât stă afară” |
| Server · lichidarea depășită | prețul, lichidarea estimată, partea, „verifică botul” | toate; lichidarea rotunjită; „aș verifica botul în Pionex” |
| Server · lichidarea sub 15% | partea, prețul lichidării, distanța | toate, cu virgulă și prețul rotunjit (venea cu 16 zecimale) |
| Server · comisioanele peste grile | cât au adus grilele, cât au luat comisioanele | toate, cu virgulă |
| Server · netul pe minus | grilele, comisioanele, restul din poziție/finanțare | toate, cu virgulă („poziția și funding-ul”) |

## Textele (generate de gardă)


## Revizia Opus (02.10, v100.63): ce s-a schimbat față de harta de mai sus

Revizia pe tot pachetul a găsit patru locuri unde textele noi pierdeau ceva sau dublau un rând. Tabelul generat de mai jos e deja cel de la v100.63.

| Unde | v100.62 | v100.63 | De ce |
|---|---|---|---|
| „Ce ai de făcut acum”: sfatul cu același subiect ca un rând pus deja | era sărit | ridică rândul la culoarea mai gravă și îi aduce textul și „Aș …” (dacă rândul nu le are) | lichidarea sub 8% ieșea galbenă și fără acțiune când avertismentul serverului ajungea primul (site-ul public mereu, acasă în primele minute ale unei căderi) |
| „Ce ai de făcut acum”: avertismentul care înghite o alertă | lua culoarea, textul și ora alertei | își păstrează culoarea, ora și textul (starea de acum); de la alertă ia doar ×N | sub „Lichidarea la 10,9%” apăreau roșul și „Mai sunt 6.2%” de la 13:00 (regula de la v100.9: starea de acum, nu cea mai gravă din trecut) |
| avertismentul serverului, prețul afară | „Prețul 0.3806 e peste grid (0.37–0.38): …” | „Prețul 0.3806 a ieșit din grid pe sus (0.37–0.38): …” | ca alerta colectorului și sfatul „pericol” („prețul a ieșit din grid”): un rând, nu două |
| sfatul „miscare”, titlul | „Mișcare contra botului: 2,4× obișnuitul (4 h), 1,2× (24 h)” | „Mișcare mare contra botului: 2,4× obișnuitul pe 4 h”; textul începe cu „Pe 24 h e 1,2× obișnuitul; …” | ca alerta („mișcare mare împotriva botului”): un rând, nu două; multiplul pe 24 h trece în text, titlul rămâne ≤ 60 și la 10× |
| sfatul „costuri”, textul | „… comisioanele iau −0,12 și funding-ul −0,60 pe zi.” | „… comisioanele iau 0,12 și funding-ul ia 0,60 pe zi.” · încasat: „funding-ul aduce 0,05” · fără funding: fără bucata cu funding-ul | minusul dublu; funding-ul încasat se citea ca un cost |
| Consilierul, motivul pieței | „Trendul, o singură măsură: 4 ore urcă, 1 zi urcă.” | „Trendul, o singură măsură: piața merge cu botul (4 ore urcă, 1 zi urcă).” | concluzia direcției se pierduse (în Consilier titlul sfatului nu se vede) |

| Situația | Sursa | Lung. | Text |
|---|---|---|---|
| CRV lângă marginea de jos | sfat.margine.titlu | 37 | 0,4% până la marginea de jos (0.3841) |
| CRV lângă marginea de jos | sfat.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49). |
| CRV lângă marginea de jos | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| CRV lângă marginea de jos | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| CRV lângă marginea de jos | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| CRV lângă marginea de jos | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| CRV lângă marginea de jos | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| CRV lângă marginea de jos | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| CRV lângă marginea de jos | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| CRV lângă marginea de jos | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| CRV lângă marginea de jos | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| LIGHTER: trendul contra, tare | sfat.trend.titlu | 41 | Trendul e împotriva botului (short, tare) |
| LIGHTER: trendul contra, tare | sfat.trend.text | 117 | 4h: EMA20 sub EMA50, EMA50 coboară · 1z: EMA20 sub EMA50, EMA50 coboară · structura 4h: maxime și minime tot mai jos. |
| LIGHTER: trendul contra, tare | sfat.trend.faCe | 86 | N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend. |
| LIGHTER: trendul contra, tare | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| LIGHTER: trendul contra, tare | sfat.margine.titlu | 37 | 8,7% până la marginea de jos (4.0850) |
| LIGHTER: trendul contra, tare | sfat.margine.text | 96 | ~320 LIGHTER la margine (acum 160), total ~−123,97 USDT; coboară atât în 0% din zile (0 din 49). |
| LIGHTER: trendul contra, tare | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| LIGHTER: trendul contra, tare | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| LIGHTER: trendul contra, tare | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| LIGHTER: trendul contra, tare | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| LIGHTER: trendul contra, tare | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| LIGHTER: trendul contra, tare | sfat.zero.titlu | 44 | Botul iese pe zero la 4.4885 (+0,3% de aici) |
| LIGHTER: trendul contra, tare | sfat.zero.text | 53 | Închis acum, ai lua 102,51 USDT din 103,38 investiți. |
| LIGHTER: trendul contra, tare | sfat.zero.faCe | 104 | Aș pune take-profit-ul botului la 4.4885 ca să ies fără pierdere (nu stop: zero-ul e deasupra prețului). |
| JTO: mișcare mare contra | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| JTO: mișcare mare contra | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| JTO: mișcare mare contra | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| JTO: mișcare mare contra | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| JTO: mișcare mare contra | sfat.miscare.titlu | 51 | Mișcare mare contra botului: 2,4× obișnuitul pe 4 h |
| JTO: mișcare mare contra | sfat.miscare.text | 113 | Pe 24 h e 1,2× obișnuitul; până se liniștește, gridul nu face perechi, doar strânge poziție pe direcția prețului. |
| JTO: mișcare mare contra | sfat.miscare.faCe | 107 | N-aș adăuga bani și n-aș porni alt grid aici până la liniște; pe ăsta l-aș lăsa cât lichidarea e peste 15%. |
| JTO: mișcare mare contra | sfat.miscare.sursa | 64 | „Obișnuitul” = percentila 75 a mișcărilor monedei pe 30 de zile. |
| JTO: mișcare mare contra | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| JTO: mișcare mare contra | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| JTO: mișcare mare contra | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| VVV: mișcare mare cu botul | sfat.margine.titlu | 39 | 18,8% până la marginea de jos (25.0000) |
| VVV: mișcare mare cu botul | sfat.margine.text | 93 | ~360 VVV la margine (acum 160), total ~−1613,89 USDT; coboară atât în 0% din zile (0 din 49). |
| VVV: mișcare mare cu botul | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| VVV: mișcare mare cu botul | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| VVV: mișcare mare cu botul | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| VVV: mișcare mare cu botul | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| VVV: mișcare mare cu botul | sfat.miscare-cu.titlu | 52 | Mișcare cu botul: 2,4× obișnuitul (4 h), 1,6× (24 h) |
| VVV: mișcare mare cu botul | sfat.miscare-cu.text | 84 | Prețul merge în direcția botului: grilele de sus încasează pe drum și poziția scade. |
| VVV: mișcare mare cu botul | sfat.miscare-cu.faCe | 94 | L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea de sus. |
| VVV: mișcare mare cu botul | sfat.miscare-cu.sursa | 113 | Pe 40 de monede (27.09), după o mișcare cu botul, 59% din ferestre au ieșit pe plus (contra 50%, în liniște 56%). |
| VVV: mișcare mare cu botul | sfat.nimic.titlu | 12 | Nimic urgent |
| VVV: mișcare mare cu botul | sfat.nimic.text | 29 | Totalul botului e +4,20 USDT. |
| VVV: mișcare mare cu botul | sfat.nimic.faCe | 50 | L-aș lăsa să lucreze și m-aș uita din nou diseară. |
| VVV short: mișcare cu botul, trendul contra | sfat.trend.titlu | 41 | Trendul e împotriva botului (long, mediu) |
| VVV short: mișcare cu botul, trendul contra | sfat.trend.text | 34 | 4h: EMA20 peste EMA50, EMA50 urcă. |
| VVV short: mișcare cu botul, trendul contra | sfat.trend.faCe | 86 | N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend. |
| VVV short: mișcare cu botul, trendul contra | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| VVV short: mișcare cu botul, trendul contra | sfat.margine.titlu | 39 | 10,0% până la marginea de jos (27.0000) |
| VVV short: mișcare cu botul, trendul contra | sfat.margine.text | 91 | ~40 VVV la margine (acum 160), total ~+454,34 USDT; coboară atât în 0% din zile (0 din 49). |
| VVV short: mișcare cu botul, trendul contra | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| VVV short: mișcare cu botul, trendul contra | sfat.miscare-cu.titlu | 52 | Mișcare cu botul: 2,1× obișnuitul (4 h), 1,3× (24 h) |
| VVV short: mișcare cu botul, trendul contra | sfat.miscare-cu.text | 84 | Prețul merge în direcția botului: grilele de jos încasează pe drum și poziția scade. |
| VVV short: mișcare cu botul, trendul contra | sfat.miscare-cu.faCe | 94 | L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea de jos. |
| VVV short: mișcare cu botul, trendul contra | sfat.miscare-cu.sursa | 113 | Pe 40 de monede (27.09), după o mișcare cu botul, 59% din ferestre au ieșit pe plus (contra 50%, în liniște 56%). |
| JTO: liniște rară | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| JTO: liniște rară | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| JTO: liniște rară | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| JTO: liniște rară | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| JTO: liniște rară | sfat.liniste.titlu | 19 | Liniște de 1,6 zile |
| JTO: liniște rară | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 20% din cazuri (4 din 20). |
| JTO: liniște rară | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| JTO: liniște rară | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–42%. |
| JTO: liniște rară | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| JTO: liniște rară | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| JTO: liniște rară | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| CRV: ritmul a scăzut | sfat.margine.titlu | 37 | 0,4% până la marginea de jos (0.3841) |
| CRV: ritmul a scăzut | sfat.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49). |
| CRV: ritmul a scăzut | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| CRV: ritmul a scăzut | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| CRV: ritmul a scăzut | sfat.ritm.titlu | 57 | Ritmul a scăzut: grilele 0,10 USDT în 24 h, media 1,20/zi |
| CRV: ritmul a scăzut | sfat.ritm.text | 105 | 2 tranzacții în 24 h față de 14 pe zi: de obicei prețul a ieșit din zona perechilor sau piața a înghețat. |
| CRV: ritmul a scăzut | sfat.ritm.faCe | 95 | Aș închide botul și aș porni din fișă unul la prețul de acum, dacă ritmul rămâne jos încă o zi. |
| CRV: ritmul a scăzut | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| CRV: ritmul a scăzut | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| CRV: ritmul a scăzut | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| CRV: ritmul a scăzut | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| CRV: ritmul a scăzut | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| CRV: ritmul a scăzut | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| CRV: ritmul a scăzut | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| CRV: ritmul a crescut, fără tranzacții | sfat.margine.titlu | 37 | 0,4% până la marginea de jos (0.3841) |
| CRV: ritmul a crescut, fără tranzacții | sfat.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49). |
| CRV: ritmul a crescut, fără tranzacții | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| CRV: ritmul a crescut, fără tranzacții | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| CRV: ritmul a crescut, fără tranzacții | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| CRV: ritmul a crescut, fără tranzacții | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| CRV: ritmul a crescut, fără tranzacții | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| CRV: ritmul a crescut, fără tranzacții | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| CRV: ritmul a crescut, fără tranzacții | sfat.ritm.titlu | 58 | Ritmul a crescut: grilele 3,10 USDT în 24 h, media 1,20/zi |
| CRV: ritmul a crescut, fără tranzacții | sfat.ritm.text | 70 | Piața se mișcă mai mult, bine pentru grile cât prețul stă în interval. |
| CRV: ritmul a crescut, fără tranzacții | sfat.ritm.faCe | 61 | Aș verifica lichidarea: ritmul mare vine des cu mișcare mare. |
| CRV: ritmul a crescut, fără tranzacții | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| CRV: ritmul a crescut, fără tranzacții | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| CRV: ritmul a crescut, fără tranzacții | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| LIGHTER: funding-ul mănâncă grilele | sfat.costuri.titlu | 48 | Costurile mănâncă grilele: −0,42 USDT pe zi, net |
| LIGHTER: funding-ul mănâncă grilele | sfat.costuri.text | 82 | Grilele aduc 0,30 USDT în 24 h; comisioanele iau 0,12 și funding-ul ia 0,60 pe zi. |
| LIGHTER: funding-ul mănâncă grilele | sfat.costuri.faCe | 79 | Aș lua levier mai mic sau direcția care încasează funding-ul, la următorul bot. |
| LIGHTER: funding-ul mănâncă grilele | sfat.margine.titlu | 37 | 8,7% până la marginea de jos (4.0850) |
| LIGHTER: funding-ul mănâncă grilele | sfat.margine.text | 96 | ~320 LIGHTER la margine (acum 160), total ~−123,97 USDT; coboară atât în 0% din zile (0 din 49). |
| LIGHTER: funding-ul mănâncă grilele | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| LIGHTER: funding-ul mănâncă grilele | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| LIGHTER: funding-ul mănâncă grilele | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| LIGHTER: funding-ul mănâncă grilele | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| LIGHTER: funding-ul mănâncă grilele | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| LIGHTER: funding-ul mănâncă grilele | sfat.zero.titlu | 44 | Botul iese pe zero la 4.4885 (+0,3% de aici) |
| LIGHTER: funding-ul mănâncă grilele | sfat.zero.text | 53 | Închis acum, ai lua 102,51 USDT din 103,38 investiți. |
| LIGHTER: funding-ul mănâncă grilele | sfat.zero.faCe | 104 | Aș pune take-profit-ul botului la 4.4885 ca să ies fără pierdere (nu stop: zero-ul e deasupra prețului). |
| LIGHTER: funding-ul mănâncă grilele | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| LIGHTER: funding-ul mănâncă grilele | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| LIGHTER: funding-ul mănâncă grilele | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| JTO: costuri sub un cent pe zi | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| JTO: costuri sub un cent pe zi | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| JTO: costuri sub un cent pe zi | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| JTO: costuri sub un cent pe zi | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| JTO: costuri sub un cent pe zi | sfat.costuri.titlu | 49 | Costurile mănâncă grilele: −0,004 USDT pe zi, net |
| JTO: costuri sub un cent pe zi | sfat.costuri.text | 82 | Grilele aduc 0,01 USDT în 24 h; comisioanele iau 0,00 și funding-ul ia 0,01 pe zi. |
| JTO: costuri sub un cent pe zi | sfat.costuri.faCe | 67 | Aș rări grilele (pas mai mare) ca să rămână mai mult după comision. |
| JTO: costuri sub un cent pe zi | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| JTO: costuri sub un cent pe zi | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| JTO: costuri sub un cent pe zi | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| JTO: costuri sub un cent pe zi | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| JTO: costuri sub un cent pe zi | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| JTO: costuri sub un cent pe zi | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| JTO: costuri sub un cent pe zi | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| JTO: costurile peste grile, funding încasat | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| JTO: costurile peste grile, funding încasat | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| JTO: costurile peste grile, funding încasat | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| JTO: costurile peste grile, funding încasat | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| JTO: costurile peste grile, funding încasat | sfat.costuri.titlu | 48 | Costurile mănâncă grilele: −0,07 USDT pe zi, net |
| JTO: costurile peste grile, funding încasat | sfat.costuri.text | 85 | Grilele aduc 0,05 USDT în 24 h; comisioanele iau 0,17 și funding-ul aduce 0,05 pe zi. |
| JTO: costurile peste grile, funding încasat | sfat.costuri.faCe | 67 | Aș rări grilele (pas mai mare) ca să rămână mai mult după comision. |
| JTO: costurile peste grile, funding încasat | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| JTO: costurile peste grile, funding încasat | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| JTO: costurile peste grile, funding încasat | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| JTO: costurile peste grile, funding încasat | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| JTO: costurile peste grile, funding încasat | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| JTO: costurile peste grile, funding încasat | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| JTO: costurile peste grile, funding încasat | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| JTO: grile dese și levier peste cel sigur | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| JTO: grile dese și levier peste cel sigur | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| JTO: grile dese și levier peste cel sigur | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| JTO: grile dese și levier peste cel sigur | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| JTO: grile dese și levier peste cel sigur | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| JTO: grile dese și levier peste cel sigur | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| JTO: grile dese și levier peste cel sigur | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| JTO: grile dese și levier peste cel sigur | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| JTO: grile dese și levier peste cel sigur | sfat.setare.titlu | 52 | Setarea botului: grile prea dese și levier prea mare |
| JTO: grile dese și levier peste cel sigur | sfat.setare.text | 101 | Grilele (93, aritmetice) lasă 0,12% pe umplere după comision; levierul 8× e peste cel sigur azi (4×). |
| JTO: grile dese și levier peste cel sigur | sfat.setare.faCe | 104 | N-aș închide botul pentru asta; la următorul aș lua grile geometrice și levierul din fișă (cel mult 4×). |
| JTO: grile dese și levier peste cel sigur | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| JTO: grile dese și levier peste cel sigur | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| JTO: grile dese și levier peste cel sigur | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| JTO: doar levierul peste cel sigur | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| JTO: doar levierul peste cel sigur | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| JTO: doar levierul peste cel sigur | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| JTO: doar levierul peste cel sigur | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| JTO: doar levierul peste cel sigur | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| JTO: doar levierul peste cel sigur | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| JTO: doar levierul peste cel sigur | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| JTO: doar levierul peste cel sigur | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| JTO: doar levierul peste cel sigur | sfat.setare.titlu | 33 | Setarea botului: levier prea mare |
| JTO: doar levierul peste cel sigur | sfat.setare.text | 39 | Levierul 8× e peste cel sigur azi (4×). |
| JTO: doar levierul peste cel sigur | sfat.setare.faCe | 104 | N-aș închide botul pentru asta; la următorul aș lua grile geometrice și levierul din fișă (cel mult 4×). |
| JTO: doar levierul peste cel sigur | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| JTO: doar levierul peste cel sigur | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| JTO: doar levierul peste cel sigur | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| CRV pe minus: zero-ul botului | sfat.margine.titlu | 37 | 0,4% până la marginea de jos (0.3841) |
| CRV pe minus: zero-ul botului | sfat.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49). |
| CRV pe minus: zero-ul botului | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| CRV pe minus: zero-ul botului | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| CRV pe minus: zero-ul botului | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| CRV pe minus: zero-ul botului | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| CRV pe minus: zero-ul botului | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| CRV pe minus: zero-ul botului | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| CRV pe minus: zero-ul botului | sfat.zero.titlu | 44 | Botul iese pe zero la 0.4012 (+4,0% de aici) |
| CRV pe minus: zero-ul botului | sfat.zero.text | 51 | Închis acum, ai lua 46,40 USDT din 49,67 investiți. |
| CRV pe minus: zero-ul botului | sfat.zero.faCe | 104 | Aș pune take-profit-ul botului la 0.4012 ca să ies fără pierdere (nu stop: zero-ul e deasupra prețului). |
| CRV pe minus: zero-ul botului | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| CRV pe minus: zero-ul botului | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| CRV pe minus: zero-ul botului | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| VVV short pe minus: zero-ul sub preț | sfat.trend.titlu | 41 | Trendul e împotriva botului (long, mediu) |
| VVV short pe minus: zero-ul sub preț | sfat.trend.faCe | 86 | N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend. |
| VVV short pe minus: zero-ul sub preț | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| VVV short pe minus: zero-ul sub preț | sfat.margine.titlu | 39 | 10,0% până la marginea de jos (27.0000) |
| VVV short pe minus: zero-ul sub preț | sfat.margine.text | 91 | ~40 VVV la margine (acum 160), total ~+454,34 USDT; coboară atât în 0% din zile (0 din 49). |
| VVV short pe minus: zero-ul sub preț | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| VVV short pe minus: zero-ul sub preț | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| VVV short pe minus: zero-ul sub preț | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| VVV short pe minus: zero-ul sub preț | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| VVV short pe minus: zero-ul sub preț | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| VVV short pe minus: zero-ul sub preț | sfat.zero.titlu | 45 | Botul iese pe zero la 29.1000 (−3,0% de aici) |
| VVV short pe minus: zero-ul sub preț | sfat.zero.text | 51 | Închis acum, ai lua 92,60 USDT din 96,60 investiți. |
| VVV short pe minus: zero-ul sub preț | sfat.zero.faCe | 96 | Aș pune take-profit-ul botului la 29.1000 ca să ies fără pierdere (nu stop: zero-ul e sub preț). |
| direcția rea | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| direcția rea | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| direcția rea | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| direcția rea | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| direcția rea | sfat.directie.titlu | 29 | Piața merge împotriva botului |
| direcția rea | sfat.directie.text | 28 | 4 ore coboară, 1 zi coboară. |
| direcția rea | sfat.directie.faCe | 44 | N-aș adăuga bani până nu se întoarce pe 4 h. |
| direcția rea | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| direcția rea | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| direcția rea | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| direcția rea | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| direcția rea | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| direcția rea | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| direcția rea | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| direcția amestecată | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| direcția amestecată | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| direcția amestecată | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| direcția amestecată | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| direcția amestecată | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| direcția amestecată | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| direcția amestecată | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| direcția amestecată | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| direcția amestecată | sfat.directie.titlu | 27 | Piața dă semnale amestecate |
| direcția amestecată | sfat.directie.text | 58 | 4 ore urcă, 1 zi coboară: o parte merge împotriva botului. |
| direcția amestecată | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| direcția amestecată | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| direcția amestecată | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| direcția cu botul, dar bara de 4 ore cade | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| direcția cu botul, dar bara de 4 ore cade | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| direcția cu botul, dar bara de 4 ore cade | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| direcția cu botul, dar bara de 4 ore cade | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| direcția cu botul, dar bara de 4 ore cade | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| direcția cu botul, dar bara de 4 ore cade | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| direcția cu botul, dar bara de 4 ore cade | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| direcția cu botul, dar bara de 4 ore cade | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| direcția cu botul, dar bara de 4 ore cade | sfat.directie.titlu | 27 | Piața dă semnale amestecate |
| direcția cu botul, dar bara de 4 ore cade | sfat.directie.text | 73 | 4 ore urcă, 1 zi urcă; dar în bara de 4 ore de acum prețul scade cu 2,4%. |
| direcția cu botul, dar bara de 4 ore cade | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| direcția cu botul, dar bara de 4 ore cade | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| direcția cu botul, dar bara de 4 ore cade | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| direcția laterală | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| direcția laterală | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| direcția laterală | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| direcția laterală | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| direcția laterală | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| direcția laterală | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| direcția laterală | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| direcția laterală | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| direcția laterală | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| direcția laterală | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| direcția laterală | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| direcția laterală | sfat.directie.titlu | 35 | Piața nu lucrează împotriva botului |
| direcția laterală | sfat.directie.text | 62 | 4 ore e laterală, 1 zi e laterală: regimul potrivit unui grid. |
| direcția rea (Tablou) | directie.rezumat.text | 60 | Piața merge împotriva botului (4 ore coboară, 1 zi coboară). |
| direcția amestecată (Tablou) | directie.rezumat.text | 79 | Semnale amestecate (4 ore urcă, 1 zi coboară): o parte merge împotriva botului. |
| direcția cu botul, bara de 4 ore cade (Tablou) | directie.rezumat.text | 96 | Piața merge cu botul (4 ore urcă, 1 zi urcă); dar în bara de 4 ore de acum prețul scade cu 2,4%. |
| direcția laterală (Tablou) | directie.rezumat.text | 81 | Piața e laterală (4 ore e laterală, 1 zi e laterală): regimul potrivit unui grid. |
| funding plătit, mare | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| funding plătit, mare | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| funding plătit, mare | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| funding plătit, mare | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| funding plătit, mare | sfat.funding.titlu | 40 | Funding-ul: 0,080% la 8 ore, îl plătești |
| funding plătit, mare | sfat.funding.text | 80 | Până acum botul a plătit 0,04 USDT; la rata asta plătești din câștigul grilelor. |
| funding plătit, mare | sfat.funding.faCe | 65 | N-aș ține botul mult pe direcția asta cu funding-ul atât de mare. |
| funding plătit, mare | sfat.funding.sursa | 63 | Rata e de la Binance, pentru orientare; Pionex poate avea alta. |
| funding plătit, mare | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| funding plătit, mare | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| funding plătit, mare | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| funding plătit, mare | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| funding plătit, mare | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| funding plătit, mare | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| funding plătit, mare | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| funding încasat, fără istoric | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| funding încasat, fără istoric | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| funding încasat, fără istoric | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| funding încasat, fără istoric | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| funding încasat, fără istoric | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| funding încasat, fără istoric | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| funding încasat, fără istoric | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| funding încasat, fără istoric | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| funding încasat, fără istoric | sfat.funding.titlu | 41 | Funding-ul: −0,020% la 8 ore, îl încasezi |
| funding încasat, fără istoric | sfat.funding.text | 46 | La rata asta încasezi peste câștigul grilelor. |
| funding încasat, fără istoric | sfat.funding.sursa | 63 | Rata e de la Binance, pentru orientare; Pionex poate avea alta. |
| funding încasat, fără istoric | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| funding încasat, fără istoric | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| funding încasat, fără istoric | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| lichidarea la 5% și prețul sub grid | sfat.pericol.lich.titlu | 18 | lichidarea la 5.0% |
| lichidarea la 5% și prețul sub grid | sfat.pericol.lich.text | 67 | Mai sunt 5.0% până la lichidare (0.35620). Sub 8% e zona de ieșire. |
| lichidarea la 5% și prețul sub grid | sfat.pericol.lich.faCe | 42 | Aș adăuga marjă sau aș închide botul acum. |
| lichidarea la 5% și prețul sub grid | sfat.pericol.grid.titlu | 23 | prețul a ieșit din grid |
| lichidarea la 5% și prețul sub grid | sfat.pericol.grid.text | 94 | Prețul 0.37500 e sub interval (0.38410 - 0.43310). Botul nu mai tranzacționează cât stă afară. |
| lichidarea la 5% și prețul sub grid | sfat.pericol.grid.faCe | 106 | Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum. |
| lichidarea la 5% și prețul sub grid | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| lichidarea la 5% și prețul sub grid | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| lichidarea la 5% și prețul sub grid | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| lichidarea la 5% și prețul sub grid | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| lichidarea la 5% și prețul sub grid | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| lichidarea la 5% și prețul sub grid | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| lichidarea la 5% și prețul sub grid | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| lichidarea la 12% | sfat.pericol.lich.titlu | 19 | lichidarea la 12.0% |
| lichidarea la 12% | sfat.pericol.lich.text | 58 | Lichidarea s-a apropiat (0.34380). Sub 15% merită urmărit. |
| lichidarea la 12% | sfat.pericol.lich.faCe | 54 | N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea la 12% | sfat.margine.titlu | 37 | 1,7% până la marginea de jos (0.3841) |
| lichidarea la 12% | sfat.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,90 USDT; coboară atât în 47% din zile (23 din 49). |
| lichidarea la 12% | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| lichidarea la 12% | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| lichidarea la 12% | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| lichidarea la 12% | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| lichidarea la 12% | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| lichidarea la 12% | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| lichidarea la 12% | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| lichidarea la 12% | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| lichidarea la 12% | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| nimic urgent, fără lumânări de 4 h | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| nimic urgent, fără lumânări de 4 h | sfat.margine.text | 103 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; n-am destul istoric pentru cât de des coboară atât. |
| nimic urgent, fără lumânări de 4 h | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| nimic urgent, fără lumânări de 4 h | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| nimic urgent, fără lumânări de 4 h | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| nimic urgent, fără lumânări de 4 h | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| nimic urgent, fără lumânări de 4 h | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| nimic urgent, fără lumânări de 4 h | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| nimic urgent, fără lumânări de 4 h | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| nimic urgent, fără lumânări de 4 h | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| nimic urgent, fără lumânări de 4 h | sfat.nimic.titlu | 12 | Nimic urgent |
| nimic urgent, fără lumânări de 4 h | sfat.nimic.text | 29 | Totalul botului e +2,00 USDT. |
| nimic urgent, fără lumânări de 4 h | sfat.nimic.faCe | 50 | L-aș lăsa să lucreze și m-aș uita din nou diseară. |
| planul lipsă | todo.plan.titlu | 24 | Nu ai un plan pentru bot |
| planul lipsă | todo.plan.text | 69 | Cu planul scris la rece, colectorul te anunță când se atinge un prag. |
| nimic de făcut | todo.gol.titlu | 12 | Nimic urgent |
| nimic de făcut | todo.gol.text | 42 | Nu văd nimic care să ceară o mișcare acum. |
| recuperare: pe plus | ritmRecuperare.text | 35 | botul e pe plus: nimic de recuperat |
| recuperare: nu se recuperează | ritmRecuperare.text | 64 | la ritmul de azi nu se recuperează: grilele nu acoperă costurile |
| recuperare: sub 10 zile | ritmRecuperare.text | 79 | ~0,4 zile până pe zero la ritmul de azi (+7,99 USDT/zi), dacă prețul stă pe loc |
| recuperare: peste 10 zile | ritmRecuperare.text | 78 | ~13 zile până pe zero la ritmul de azi (+0,80 USDT/zi), dacă prețul stă pe loc |
| (pentru Consilier) CRV lângă margine | sfat.margine.titlu | 37 | 0,4% până la marginea de jos (0.3841) |
| (pentru Consilier) CRV lângă margine | sfat.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49). |
| (pentru Consilier) CRV lângă margine | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| (pentru Consilier) CRV lângă margine | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| (pentru Consilier) CRV lângă margine | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| (pentru Consilier) CRV lângă margine | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| (pentru Consilier) CRV lângă margine | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| (pentru Consilier) CRV lângă margine | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| (pentru Consilier) CRV lângă margine | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| (pentru Consilier) CRV lângă margine | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| (pentru Consilier) CRV lângă margine | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.titlu | 53 | Prețul la 0,4% de marginea de jos (3,5% din interval) |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.motiv1.margine.titlu | 37 | 0,4% până la marginea de jos (0.3841) |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.motiv1.margine.text | 92 | ~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49). |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.motiv1.margine.extra | 208 | Prețul la 0,4% de marginea de jos (3,5% din interval) · În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 1,9%, plafonat la 15% din interval). · profilul CRV: 183 de zile de bare de 1 h |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.motiv2.liniste.titlu | 17 | Piața e liniștită |
| CRV lângă marginea de jos + mută gridul (sfatul real) | consiliu.motiv2.liniste.text | 92 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13).  |
| (pentru Consilier) ritmul + funding-ul | sfat.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| (pentru Consilier) ritmul + funding-ul | sfat.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| (pentru Consilier) ritmul + funding-ul | sfat.margine.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| (pentru Consilier) ritmul + funding-ul | sfat.margine.sursa | 72 | Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere. |
| (pentru Consilier) ritmul + funding-ul | sfat.ritm.titlu | 57 | Ritmul a scăzut: grilele 0,10 USDT în 24 h, media 1,20/zi |
| (pentru Consilier) ritmul + funding-ul | sfat.ritm.text | 105 | 2 tranzacții în 24 h față de 14 pe zi: de obicei prețul a ieșit din zona perechilor sau piața a înghețat. |
| (pentru Consilier) ritmul + funding-ul | sfat.ritm.faCe | 95 | Aș închide botul și aș porni din fișă unul la prețul de acum, dacă ritmul rămâne jos încă o zi. |
| (pentru Consilier) ritmul + funding-ul | sfat.funding.titlu | 40 | Funding-ul: 0,080% la 8 ore, îl plătești |
| (pentru Consilier) ritmul + funding-ul | sfat.funding.text | 80 | Până acum botul a plătit 0,04 USDT; la rata asta plătești din câștigul grilelor. |
| (pentru Consilier) ritmul + funding-ul | sfat.funding.faCe | 65 | N-aș ține botul mult pe direcția asta cu funding-ul atât de mare. |
| (pentru Consilier) ritmul + funding-ul | sfat.funding.sursa | 63 | Rata e de la Binance, pentru orientare; Pionex poate avea alta. |
| (pentru Consilier) ritmul + funding-ul | sfat.liniste.titlu | 19 | Liniște de 0,4 zile |
| (pentru Consilier) ritmul + funding-ul | sfat.liniste.text | 91 | Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13). |
| (pentru Consilier) ritmul + funding-ul | sfat.liniste.faCe | 84 | N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare. |
| (pentru Consilier) ritmul + funding-ul | sfat.liniste.sursa | 50 | Ultimele 30 de zile; interval de încredere 8%–50%. |
| (pentru Consilier) ritmul + funding-ul | sfat.trend.titlu | 32 | Trendul e cu botul (long, mediu) |
| (pentru Consilier) ritmul + funding-ul | sfat.trend.faCe | 21 | L-aș lăsa să lucreze. |
| (pentru Consilier) ritmul + funding-ul | sfat.trend.sursa | 62 | EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise. |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.titlu | 30 | Prețul e lângă marginea de jos |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.faCe | 59 | N-aș mări levierul și n-aș pune bani în plus în botul ăsta. |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.motiv1.margine.titlu | 37 | 1,9% până la marginea de jos (0.5722) |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.motiv1.margine.text | 93 | ~200 JTO la margine (acum 160), total ~−14,35 USDT; coboară atât în 47% din zile (23 din 49). |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.motiv2.ritm.titlu | 57 | Ritmul a scăzut: grilele 0,10 USDT în 24 h, media 1,20/zi |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.motiv2.ritm.text | 105 | 2 tranzacții în 24 h față de 14 pe zi: de obicei prețul a ieșit din zona perechilor sau piața a înghețat. |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.motiv3.funding.titlu | 40 | Funding-ul: 0,080% la 8 ore, îl plătești |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.motiv3.funding.text | 80 | Până acum botul a plătit 0,04 USDT; la rata asta plătești din câștigul grilelor. |
| primul motiv vine din sfaturi (ritmul + funding-ul) | consiliu.rest1.titlu | 17 | Piața e liniștită |
| verdictul vechi: lichidarea depășită | consiliu.titlu | 37 | Prețul e dincolo de lichidare cu 1,2% |
| verdictul vechi: lichidarea depășită | consiliu.faCe | 42 | Aș adăuga marjă sau aș închide botul acum. |
| verdictul vechi: lichidarea depășită | consiliu.motiv1.opreste.titlu | 37 | Prețul e dincolo de lichidare cu 1,2% |
| verdictul vechi: Pionex MARGIN_CALL | consiliu.titlu | 39 | Pionex: marginea contului e MARGIN_CALL |
| verdictul vechi: Pionex MARGIN_CALL | consiliu.faCe | 42 | Aș adăuga marjă sau aș închide botul acum. |
| verdictul vechi: Pionex MARGIN_CALL | consiliu.motiv1.opreste.titlu | 39 | Pionex: marginea contului e MARGIN_CALL |
| verdictul vechi: Pionex MARGIN_CALL | consiliu.motiv1.opreste.text | 86 | Pionex o dă altfel decât NORMAL, iar starea bursei bate calculul nostru al lichidării. |
| CRV: fără stop, peste grid, lichidarea la 10,9%, pe minus deși grilele câștigă | avertisment1.t | 44 | Botul n-are nici stop, nici țintă în Pionex. |
| CRV: fără stop, peste grid, lichidarea la 10,9%, pe minus deși grilele câștigă | avertisment2.t | 91 | Prețul 0.3806 a ieșit din grid pe sus (0.37–0.38): botul nu mai face perechi cât stă afară. |
| CRV: fără stop, peste grid, lichidarea la 10,9%, pe minus deși grilele câștigă | avertisment3.t | 45 | Lichidarea la 10,9% (0.33829, partea de jos). |
| CRV: fără stop, peste grid, lichidarea la 10,9%, pe minus deși grilele câștigă | avertisment4.t | 109 | Grilele câștigă (+10,91 USDT), dar poziția și funding-ul (−11,30) și comisioanele (−1,21) duc botul pe minus. |
| lichidarea depășită, sub grid, comisioanele peste grile | avertisment1.t | 91 | Prețul 0.3301 a ieșit din grid pe jos (0.37–0.38): botul nu mai face perechi cât stă afară. |
| lichidarea depășită, sub grid, comisioanele peste grile | avertisment2.t | 102 | Lichidarea estimată (0.33829, partea de jos) e depășită la prețul 0.3301: aș verifica botul în Pionex. |
| lichidarea depășită, sub grid, comisioanele peste grile | avertisment3.t | 66 | Comisioanele (−2,50 USDT) depășesc câștigul grilelor (+1,20 USDT). |
| comisioanele necunoscute | avertisment1.t | 77 | Grilele câștigă (+3,00 USDT), dar botul e pe minus (comisioanele nu se știu). |

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
