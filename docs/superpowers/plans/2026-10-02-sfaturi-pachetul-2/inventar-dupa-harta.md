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

