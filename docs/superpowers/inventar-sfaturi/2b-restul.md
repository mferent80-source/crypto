# Inventar — 2b: ce a rămas după revizia pachetului 2 (v100.65, 02.10)

El (02.10), după raportul reviziei: „FA TOT”. Fiecare rând: textul vechi → textul nou și ce informație poartă; nimic din „vechi” nu se pierde (sau e scris unde a mers).

| # | Unde | v100.64 | v100.65 | Informația |
|---|---|---|---|---|
| 1 | Consilierul, motivul verde (piața **contra**) | verde „Piața e cu botul — Trendul, o singură măsură: piața merge împotriva botului (…)” sub motivul galben „Piața merge împotriva botului” | doar motivul galben „Piața merge împotriva botului — 4 ore coboară, 1 zi coboară.” | direcția și dovezile rămân în motivul galben; dispare doar verdele fals. Verdictul neschimbat |
| 2 | Consilierul, motivul verde (piața **amestecată**) | verde „Piața e cu botul — Trendul, o singură măsură: semnale amestecate (…)” | în „Restul”: „Piața dă semnale amestecate — 4 ore urcă, 1 zi coboară.” | aceleași dovezi, sub titlul adevărat. Verdictul neschimbat |
| 3 | Consilierul, piața **liniștită** și contra | „Piața e liniștită — … Trendul, o singură măsură: piața merge împotriva botului (…)” | „Piața e liniștită — …” (liniștea); direcția contra stă în motivul ei galben | nimic pierdut, nimic amestecat |
| 4 | Sfatul „mișcare cu botul”, acțiunea | „L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea de sus.” (mereu) | zero-ul de partea care protejează (long pe plus / short pe plus): la fel · pe minus: „… cu take-profit-ul la zero-ul botului, …” · fără prețul de zero: „L-aș lăsa fără bani în plus și aș urmări marginea de sus.” | pe minus, un stop la zero s-ar fi executat pe loc (clasa v100.40) |
| 5 | Sfatul „funding”, titlul | „Funding-ul: 0,080% la 8 ore, îl plătești” (mereu „8 ore”) | „… la 4 ore, …” când istoria ratelor Binance arată 4 ore; 8 ore fără istorie | intervalul real |
| 6 | Sfatul „funding” la botul **neutru** | „…, îl încasezi” + „la rata asta încasezi peste câștigul grilelor.” | „Funding-ul: 0,080% la 8 ore, îl plătesc long-urile” + „Până acum botul a plătit 0,42 USDT; botul neutru îl plătește cât e net long și îl încasează cât e net short.” (ton info) | semnul poziției la neutru nu e sigur (`pnlNerealizatSigur: false`); „până acum” rămâne |
| 7 | Prețurile sub 0,01 în sfaturi | „0.0041” (4 zecimale fixe) | „0.004123” (4 cifre semnificative) | cifrele care se pierdeau |
| 8 | Prețurile sub 0,000001 (Consilier, semafor, probabilități, valoare, sfaturi) | „1.234e-7” | „0.0000001234” | fără exponent |
| 9 | Consilierul, „n-aș pune bani în plus cât stă lângă margine” | se pierdea când acțiunea avea „N-aș închide …” sau când nu încăpea și „de ce” era ocupat | în acțiune dacă încape (fără al doilea „;”), altfel la sfârșitul lui „de ce” | fraza nu se mai pierde |
| 10 | Titlul Consilierului în pagină | fără plafon (93 de caractere în proba) | ≤ 60 (`taie`, ca pe Discord); motivul întreg e dedesubt | — |
| 11 | Banii stopului cu stopul PE PLUS | „💰 Stopul tău pierde cel mult 2,4 USDT, …” | „💰 Stopul tău închide pe plus (+2,4 USDT), mai bine decât cel propus (−21,0 USDT): l-aș lăsa unde e.” | semnul |
| 12 | Trendul contra, acțiunea (sfat + semafor, o singură voce) | „N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend.” | „N-aș adăuga bani; dacă e „tare” și pe 1 zi, aș închide botul lângă zero și aș porni din fișă unul pe trend.” | condiția măsurabilă de dinainte de v100.62 („Dacă se face și «tare» pe 1z … din fișă”) |
| 13 | Sfatul „liniște”, frecvența | „… în 23% din cazuri (3 din 13).” | „… în 23% din cazuri (3 din 13, puține cazuri).” | marcajul sub 30 de cazuri (pragul scenariului) |
| 14 | Avertismentul serverului, grilele pe plus și botul pe minus | „Grilele câștigă (+2345,67 USDT), dar poziția și funding-ul (−4567,89) și comisioanele (−1234,56) duc botul pe minus.” (116 > 110) | „Grilele +2345,67 USDT; poziția și funding-ul −4567,89, comisioanele −1234,56: botul e pe minus.” (94) | aceleași trei cifre și concluzia |
| 15 | Avertismentul serverului, comisioanele necunoscute | „Grilele câștigă (+3,00 USDT), dar botul e pe minus (comisioanele nu se știu).” | „Grilele câștigă +3,00 USDT, dar botul e pe minus (comisioanele nu se știu).” | la fel, fără paranteze duble |

Garda: lumânările de 4 ore 500 (cât dă Pionex); regula nouă „(k din n) cu n < 30 ⇒ puține cazuri”; situații noi pe server cu prețuri BTC, sume în mii și o monedă sub 0,01.
