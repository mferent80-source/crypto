# Inventar — pachetul 3: alertele și Discord (DUPĂ, v100.68, 02.10)

El (02.10): „FA TOT”. Înainte: `3-alerte-inainte.md` (194 de texte, 100 cu abateri). După: 193 de texte, 0 abateri, garda pe STRICT.

## Forma
- **Titlul** = faptul + cifra, ≤ 60, cu virgulă (`lichidarea la 6,2%`), fără majuscule de strigat (`DEPĂȘITĂ`, `CU`, `STINS`, `IEȘI`, `NU`); valorile Pionex (`MARGIN_CALL`) rămân cum vin.
- **Mesajul** = două rânduri: faptul cu cifra (o frază) · `👉 ` o acțiune la persoana I. „Ce aș face eu:” → rândul `👉`.
- **Rapoartele** (fișa de închidere, mediul boților, raportul de duminică): rânduri ≤ 160, o idee pe rând (lecțiile — câte una pe rând).
- **O singură voce**: acțiunea alertei = a semaforului / sfatului pentru același fapt (lichidarea, prețul ieșit din grid, mișcarea contra, mișcarea cu botul = `SemnaleBot.pasiCuBotul`, starea Pionex = acțiunea Consilierului). Sfatul „pericol” ia din alertă doar faptul (rândul 1).
- **Cuvintele de care depinde codul**, păstrate: „lichidarea la”, „lichidarea estimată … depășită”, „a ieșit din grid”, „mișcare mare … contra botului” (unirea rândurilor din „Ce ai de făcut acum” — testate cu alertele GENERATE), „n-are plan”, „nu mai poate citi” / „citește din nou”.

## Harta informațiilor mutate (nimic pierdut)
| Unde | Înainte | După |
|---|---|---|
| lichidarea depășită | prețul lichidării doar în mesaj, „Verifică botul în Pionex acum.” | prețul de acum și prețul lichidării în rândul 1; acțiunea semaforului (marjă sau închis) |
| lichidarea 8–15% | „Lichidarea s-a apropiat … Sub 15% merită urmărit.” | „Mai sunt 12,4% până la lichidare (…); sub 15% o urmăresc.” + acțiunea semaforului |
| piața pe 4 ore | „E o stare măsurată, nu o prognoză.” | păstrat: „: o stare măsurată, nu o prognoză.” (proba colector-v77) |
| mișcarea mare contra | „Dovedit: NU porni grid nou după mișcare. Dacă îl oprești pe ăsta, îți fixezi pierderea din direcție — hotărăști tu” | rândul 1: „dovedit: un grid pornit după o mișcare iese cel mai rău, iar închis acum îți fixezi pierderea din direcție”; acțiunea = a sfatului („n-aș porni alt grid … pe ăsta l-aș lăsa cât lichidarea e peste 15%”) |
| mișcarea cu botul | „pune opritorul la prețul de zero și urmărește marginea” | acțiunea semaforului (`pasiCuBotul`): stopul la zero doar pe plus și doar dacă nu e deja dincolo |
| planul pe minus / plus / afară | „ieși”, „Aș face-o acum, în Pionex, fără să renegociez cu mine” | „Aș închide botul acum în Pionex, cum ai hotărât la rece.” (vocabularul „închide botul”) |
| fără stop activ | „Planul tău … e doar o alertă: noaptea nu-l execută nimeni” | în acțiune: „…: planul devine ordin, nu doar alertă.” |
| stopul față de plan | titlul de 80+ caractere cu ambele sume | titlul „stopul din Pionex pierde ≈ N USDT (planul: −X)”; unde e stopul și cât costă — rândul 1 |
| gridul față de plan | cifrele în titlu; „câștigul pe grilă scade în aceeași proporție”; „(între minim și maxim)” | cifrele în rândul 1; „câștig pe grilă mai mic” în acțiune; definiția mișcării zilnice — scoasă (e a fișei) |
| ținta din Pionex | „dacă lași botul nesupravegheat (noaptea) … ziua poți face ca până acum” | acțiunea: „Aș pune ținta la … pentru noapte; ziua, la țintă aș muta stopul la podea.” |
| semafor roșu (doar Radar) / mută gridul | „de ce”-ul în mesaj | păstrat pe rândul 1 (revizia pachetului 1, R2); gridul nou intră în acțiune (fără „pe ultimele 30 de zile” — fereastra standard a fișei) |
| BTC contra | „dacă BTC intră în mișcare mare, fii gata să-l oprești” | „…; la o mișcare mare a lui aș închide botul.” |
| pe zero | „Hotărăști tu: îl lași să prindă grilele sau ieși.” | „Aș alege acum: închid botul fără pierdere sau îl las să prindă grilele.” |
| stopul stins | „opritorul … STINS”, „Pornește-l în Pionex acum sau închide botul” | „stopul e stins”, „Aș porni stopul în Pionex acum sau aș închide botul.” |
| sfat tăcut pe Discord | nota la coada mesajului | nota în paranteză pe rândul 1 |
| prețurile | „0.00412” (5 zecimale) | sub 0,1: 5 cifre semnificative („0.0041234”), fără exponent |
| bot nou pe o monedă unde pierzi | „Nu te opresc — doar să știi. Poarta pe LIT: …” | acțiunea: „Aș verifica întâi poarta pe LIT: …” (avertizează, nu oprește) |
| simbolul: mișcare peste 2× ATR | „…ipoteză, nu un semnal dovedit: o dată pe zi per simbol, ca să vezi când…” | „pragul e o ipoteză, nu un semnal dovedit” păstrat; „o dată pe zi per simbol” (ritmul alertei) — scos |
| cumpărare de insider | „E informație, nu îndemn.” | acțiunea: „Aș trece-o pe lista de urmărit, fără să cumpăr doar pentru asta.” |
| intrarea sugerată | „SL / TP”, „Cât cumpăr: …”, „E un reper … decizia e a ta.” | „stop / țintă”; „Aș cumpăra cel mult …; e un reper, nu un semnal.” |
| serverul oprit / T212 căzut | „NU mai vin”, „👉 Pornește din nou …” | fără majuscule; acțiunea la persoana I |
| „alertele sunt legate” | „gata liniștea (oprește gridul)” | „mișcarea mare” (alerta de azi) |
| fișa de închidere | „opritorul de pierdere”, „LICHIDAT”, plan cu punct, lecțiile lipite (255 de caractere), prima oră pe un rând (187) | „stopul de pierdere”, „lichidat”, plan cu virgulă, o lecție pe rând, prima oră pe două rânduri |

## Rămas pentru alte pachete
- Textele de bază care intră în alerte din alte module: `Obiceiuri.istoricMoneda` / `subOOra` / `frana` (pachetul 5 — ex. „net −52.50 USDT” cu punct), `Acasa.fundingPiata` / vremea pieței (pachetul 5), alertele planului pe acțiuni `ActiuniSemnale.alertePlan` și rezumatul de dimineață (pachetul 4).

| Situația | Sursa | Lung. | Text |
|---|---|---|---|
| lichidarea la 5% și prețul sub grid | sfat.pericol.lich.titlu | 18 | lichidarea la 5,0% |
| lichidarea la 5% și prețul sub grid | sfat.pericol.lich.text | 67 | Mai sunt 5,0% până la lichidare (0.35620); sub 8% e zona de ieșire. |
| lichidarea la 5% și prețul sub grid | sfat.pericol.grid.titlu | 30 | prețul a ieșit din grid pe jos |
| lichidarea la 5% și prețul sub grid | sfat.pericol.grid.text | 87 | Prețul 0.37500 e sub interval (0.38410 – 0.43310): botul nu face perechi cât stă afară. |
| lichidarea la 12% | sfat.pericol.lich.titlu | 19 | lichidarea la 12,0% |
| lichidarea la 12% | sfat.pericol.lich.text | 63 | Mai sunt 12,0% până la lichidare (0.34380); sub 15% o urmăresc. |
| lichidarea depășită (CRV) | alerta.lich.critic.titlu | 35 | CRV: lichidarea estimată e depășită |
| lichidarea depășită (CRV) | alerta.lich.critic.mesaj | 147 | Prețul 0.33000 a trecut de lichidarea estimată (0.33829); în Pionex se vede dacă botul mai e deschis. ⏎ 👉 Aș adăuga marjă sau aș închide botul acum. |
| lichidarea la 6,2% (CRV) | alerta.lich.critic.titlu | 23 | CRV: lichidarea la 6,2% |
| lichidarea la 6,2% (CRV) | alerta.lich.critic.mesaj | 113 | Mai sunt 6,2% până la lichidare (0.33829); sub 8% e zona de ieșire. ⏎ 👉 Aș adăuga marjă sau aș închide botul acum. |
| lichidarea la 12,4% (CRV) | alerta.lich.atentie.titlu | 24 | CRV: lichidarea la 12,4% |
| lichidarea la 12,4% (CRV) | alerta.lich.atentie.mesaj | 121 | Mai sunt 12,4% până la lichidare (0.33829); sub 15% o urmăresc. ⏎ 👉 N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea la 12,4% (BTC) | alerta.lich.atentie.titlu | 24 | BTC: lichidarea la 12,4% |
| lichidarea la 12,4% (BTC) | alerta.lich.atentie.mesaj | 122 | Mai sunt 12,4% până la lichidare (45123.67); sub 15% o urmăresc. ⏎ 👉 N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea la 9% (PUMP, sub 0,01) | alerta.lich.atentie.titlu | 24 | PUMP: lichidarea la 9,0% |
| lichidarea la 9% (PUMP, sub 0,01) | alerta.lich.atentie.mesaj | 122 | Mai sunt 9,0% până la lichidare (0.0031234); sub 15% o urmăresc. ⏎ 👉 N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă. |
| lichidarea s-a îndepărtat | alerta.lich.ok.titlu | 41 | CRV: lichidarea e din nou departe (18,3%) |
| lichidarea s-a îndepărtat | alerta.lich.ok.mesaj | 22 | Sub 15% revine alerta. |
| Pionex: marja MARGIN_CALL | alerta.status.critic.titlu | 34 | CRV: Pionex raportează MARGIN_CALL |
| Pionex: marja MARGIN_CALL | alerta.status.critic.mesaj | 132 | Marja: MARGIN_CALL, riscul: TRADING; starea bursei bate calculul nostru al lichidării. ⏎ 👉 Aș adăuga marjă sau aș închide botul acum. |
| Pionex: riscul LIQUIDATING | alerta.status.critic.titlu | 34 | CRV: Pionex raportează LIQUIDATING |
| Pionex: riscul LIQUIDATING | alerta.status.critic.mesaj | 149 | Marja: NORMAL, riscul: LIQUIDATING; starea bursei bate calculul nostru al lichidării. ⏎ 👉 Aș închide botul acum, după ce verific starea lui în Pionex. |
| Pionex: din nou normal | alerta.status.ok.titlu | 36 | CRV: starea Pionex e din nou normală |
| Pionex: din nou normal | alerta.status.ok.mesaj | 29 | Marja NORMAL, riscul TRADING. |
| botul oprit | alerta.activ.atentie.titlu | 25 | CRV: botul nu mai rulează |
| botul oprit | alerta.activ.atentie.mesaj | 67 | Pionex îl arată „paused”. ⏎ 👉 Aș verifica în Pionex de ce s-a oprit. |
| botul rulează din nou | alerta.activ.ok.titlu | 26 | CRV: botul rulează din nou |
| prețul sub grid (CRV) | alerta.grid.atentie.titlu | 35 | CRV: prețul a ieșit din grid pe jos |
| prețul sub grid (CRV) | alerta.grid.atentie.mesaj | 197 | Prețul 0.38010 e sub interval (0.38410 – 0.43310): botul nu face perechi cât stă afară. ⏎ 👉 Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum. |
| prețul peste grid (BTC) | alerta.grid.atentie.titlu | 35 | BTC: prețul a ieșit din grid pe sus |
| prețul peste grid (BTC) | alerta.grid.atentie.mesaj | 202 | Prețul 72345.67 e peste interval (60000.00 – 72000.00): botul nu face perechi cât stă afară. ⏎ 👉 Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum. |
| prețul sub grid (PUMP) | alerta.grid.atentie.titlu | 36 | PUMP: prețul a ieșit din grid pe jos |
| prețul sub grid (PUMP) | alerta.grid.atentie.mesaj | 203 | Prețul 0.0038123 e sub interval (0.0039000 – 0.0048000): botul nu face perechi cât stă afară. ⏎ 👉 Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum. |
| prețul din nou în grid | alerta.grid.ok.titlu | 29 | CRV: prețul e din nou în grid |
| prețul din nou în grid | alerta.grid.ok.mesaj | 15 | Prețul 0.40000. |
| piața pe 4 ore contra (long, coboară) | alerta.directie.atentie.titlu | 43 | CRV: piața pe 4 ore merge împotriva botului |
| piața pe 4 ore contra (long, coboară) | alerta.directie.atentie.mesaj | 140 | Pe barele închise de 4 ore piața coboară, iar botul e long: o stare măsurată, nu o prognoză. ⏎ 👉 N-aș adăuga bani până nu se întoarce pe 4 h. |
| piața pe 4 ore nu mai e contra | alerta.directie.ok.titlu | 50 | CRV: piața pe 4 ore nu mai merge împotriva botului |
| mișcare mare cu botul (long, urcă) | alerta.miscare.info.titlu | 39 | CRV: mișcare mare cu botul, 2,4× pe 4 h |
| mișcare mare cu botul (long, urcă) | alerta.miscare.info.mesaj | 138 | Pe 24 h e 1,3× obișnuitul, în direcția botului: grilele încasează pe drum. ⏎ 👉 Aș muta stopul la zero-ul botului (0.38), fără bani în plus. |
| mișcare mare cu botul, botul pe minus (zero-ul peste preț) | alerta.miscare.info.titlu | 39 | CRV: mișcare mare cu botul, 2,4× pe 4 h |
| mișcare mare cu botul, botul pe minus (zero-ul peste preț) | alerta.miscare.info.mesaj | 118 | Pe 24 h e 1,3× obișnuitul, în direcția botului: grilele încasează pe drum. ⏎ 👉 L-aș lăsa să lucreze, fără bani în plus. |
| mișcare mare contra (long, coboară, 10×) | alerta.miscare.atentie.titlu | 46 | CRV: mișcare mare contra botului, 10,4× pe 4 h |
| mișcare mare contra (long, coboară, 10×) | alerta.miscare.atentie.mesaj | 246 | Pe 24 h e 10,2× obișnuitul; dovedit: un grid pornit după o mișcare iese cel mai rău, iar închis acum îți fixezi pierderea din direcție. ⏎ 👉 N-aș adăuga bani și n-aș porni alt grid aici până la liniște; pe ăsta l-aș lăsa cât lichidarea e peste 15%. |
| mișcare mare, bot neutru | alerta.miscare.atentie.titlu | 30 | CRV: mișcare mare, 2,6× pe 4 h |
| mișcare mare, bot neutru | alerta.miscare.atentie.mesaj | 245 | Pe 24 h e 1,4× obișnuitul; dovedit: un grid pornit după o mișcare iese cel mai rău, iar închis acum îți fixezi pierderea din direcție. ⏎ 👉 N-aș adăuga bani și n-aș porni alt grid aici până la liniște; pe ăsta l-aș lăsa cât lichidarea e peste 15%. |
| liniște din nou | alerta.miscare.ok.titlu | 38 | CRV: liniște din nou (1,1× obișnuitul) |
| planul: pierderea a atins pragul | alerta.plan.critic.titlu | 45 | CRV: planul tău — pragul de −7,6 USDT e atins |
| planul: pierderea a atins pragul | alerta.plan.critic.mesaj | 110 | Ai hotărât dinainte să închizi botul la −7,6 USDT. ⏎ 👉 Aș închide botul acum în Pionex, cum ai hotărât la rece. |
| planul: ținta atinsă, condiții bune, stopul încă nu e la podea | alerta.plan.atentie.titlu | 45 | CRV: ținta de +2,6 USDT e atinsă — păstreaz-o |
| planul: ținta atinsă, condiții bune, stopul încă nu e la podea | alerta.plan.atentie.mesaj | 171 | Condiții bune: la 0.40120 (2,1% de prețul de acum) totalul e exact +2,6 USDT, închizând. ⏎ 👉 Aș muta stopul din Pionex la 0.40120: câștigul rămâne, botul merge mai departe. |
| planul: ținta atinsă și la adăpost | alerta.plan.info.titlu | 36 | CRV: ținta de +2,6 USDT e la adăpost |
| planul: ținta atinsă și la adăpost | alerta.plan.info.mesaj | 91 | Stopul (0.40200) e dincolo de 0.40120, unde totalul e exact ținta; botul merge mai departe. |
| planul: ținta atinsă, condiții proaste | alerta.plan.atentie.titlu | 45 | CRV: planul tău — ținta de +2,6 USDT e atinsă |
| planul: ținta atinsă, condiții proaste | alerta.plan.atentie.mesaj | 80 | Ai atins ținta pe care ți-ai pus-o. ⏎ 👉 Aș încasa acum: aș închide botul pe plus. |
| planul: afară din grid de prea mult | alerta.plan.atentie.titlu | 48 | CRV: planul tău — afară din grid de peste 12 ore |
| planul: afară din grid de prea mult | alerta.plan.atentie.mesaj | 104 | Ai hotărât să nu-l lași afară atât. ⏎ 👉 Aș închide botul și aș porni din fișă unul nou, pe unde e prețul. |
| fără stop activ (stopul setat, dar stins) | alerta.plan-stop.critic.titlu | 50 | CRV: n-ai stop activ în Pionex (planul: −7,6 USDT) |
| fără stop activ (stopul setat, dar stins) | alerta.plan-stop.critic.mesaj | 241 | Stopul e setat la 0.36200, dar e stins; fără el, o cădere bruscă merge până la lichidare (0.33829, −12,3%) și poți pierde toată marja (≈ 50 USDT). ⏎ 👉 Aș pune stopul la 0.36952 (sau −15,3% din investiție): planul devine ordin, nu doar alertă. |
| fără stop în Pionex, planul în procente | alerta.plan-stop.critic.titlu | 50 | CRV: n-ai stop activ în Pionex (planul: −7,6 USDT) |
| fără stop în Pionex, planul în procente | alerta.plan-stop.critic.mesaj | 202 | Fără stop, o cădere bruscă merge până la lichidare (0.33829, −12,3%) și poți pierde toată marja (≈ 50 USDT). ⏎ 👉 Aș pune stopul în procente, la −15,3% din investiție: planul devine ordin, nu doar alertă. |
| stopul din Pionex pierde peste plan (atenție) | alerta.plan-stop.atentie.titlu | 54 | CRV: stopul din Pionex pierde ≈ 10 USDT (planul: −7,6) |
| stopul din Pionex pierde peste plan (atenție) | alerta.plan-stop.atentie.mesaj | 238 | Stopul e la 0.36200 (−6,2%); pe drum gridul mai cumpără și la stop poziția e plină: atins, te costă ≈ 10,2 USDT (21% din investiție). ⏎ 👉 Aș muta stopul în Pionex la 0.36952 (sau −15,3% din investiție): planul devine ordin, nu doar alertă. |
| stopul din Pionex pierde de 2× planul (critic) | alerta.plan-stop.critic.titlu | 54 | CRV: stopul din Pionex pierde ≈ 21 USDT (planul: −7,6) |
| stopul din Pionex pierde de 2× planul (critic) | alerta.plan-stop.critic.mesaj | 239 | Stopul e la 0.33000 (−14,5%); pe drum gridul mai cumpără și la stop poziția e plină: atins, te costă ≈ 21,4 USDT (43% din investiție). ⏎ 👉 Aș muta stopul în Pionex la 0.36952 (sau −15,3% din investiție): planul devine ordin, nu doar alertă. |
| stopul în procente pierde peste plan | alerta.plan-stop.critic.titlu | 54 | CRV: stopul din Pionex pierde ≈ 21 USDT (planul: −7,6) |
| stopul în procente pierde peste plan | alerta.plan-stop.critic.mesaj | 178 | Stopul e în procente, la −42,0% din investiție: atins, te costă ≈ 20,9 USDT (42% din investiție). ⏎ 👉 Aș pune stopul la −15,3% din investiție: planul devine ordin, nu doar alertă. |
| stopul se potrivește din nou cu planul | alerta.plan-stop.ok.titlu | 55 | CRV: stopul din Pionex se potrivește acum cu planul tău |
| stopul se potrivește din nou cu planul | alerta.plan-stop.ok.mesaj | 45 | Atins, te costă ≈ 7,9 USDT; planul zice −7,6. |
| gridul e mai larg decât planul (long) | alerta.grid-plan.atentie.titlu | 51 | CRV: gridul e mai larg decât planul tău (−7,6 USDT) |
| gridul e mai larg decât planul (long) | alerta.grid-plan.atentie.mesaj | 222 | Planul (0.36952, −4,2%) vine înaintea marginii de jos (0.38410, ≈ −14,2 USDT); CRV se mișcă de obicei 6,2% pe zi. ⏎ 👉 Aș lua la botul următor levier 3×: la margine ≈ −5,4 USDT, planul abia la −7,1%, câștig pe grilă mai mic. |
| planul se atinge sub o zi obișnuită | alerta.grid-plan.atentie.titlu | 40 | CRV: planul se atinge sub o zi obișnuită |
| planul se atinge sub o zi obișnuită | alerta.grid-plan.atentie.mesaj | 183 | Planul (−7,6 USDT) se atinge la 0.36952 (−4,2%), iar CRV se mișcă de obicei 6,2% pe zi. ⏎ 👉 Aș strânge gridul sau aș mări planul la botul următor: la levierul de acum gridul nu încape. |
| gridul încape din nou în plan | alerta.grid-plan.ok.titlu | 37 | CRV: gridul încape acum în planul tău |
| fără țintă în Pionex | alerta.plan-tinta.atentie.titlu | 45 | CRV: n-ai țintă în Pionex (planul: +2,6 USDT) |
| fără țintă în Pionex | alerta.plan-tinta.atentie.mesaj | 188 | Planul tău se atinge pe la 0.39364 (+2,0%), iar acolo nu închide nimic singur. ⏎ 👉 Aș pune ținta la 0.39364 (sau +5,2% din investiție) pentru noapte; ziua, la țintă aș muta stopul la podea. |
| ținta din Pionex departe de plan, peste grid | alerta.plan-tinta.atentie.titlu | 52 | CRV: ținta din Pionex e departe de planul tău (+2,6) |
| ținta din Pionex departe de plan, peste grid | alerta.plan-tinta.atentie.mesaj | 221 | Ținta e la 0.45120 (+17,0%), peste gridul de sus, unde botul nu mai are poziție: atinsă, botul are ≈ +5,9 USDT. ⏎ 👉 Aș pune ținta la 0.39364 (sau +5,2% din investiție) pentru noapte; ziua, la țintă aș muta stopul la podea. |
| ținta în procente departe de plan | alerta.plan-tinta.atentie.titlu | 52 | CRV: ținta din Pionex e departe de planul tău (+2,6) |
| ținta în procente departe de plan | alerta.plan-tinta.atentie.mesaj | 187 | Ținta e în procente, la +12,0% din investiție: atinsă, botul are ≈ +6,1 USDT. ⏎ 👉 Aș pune ținta la 0.39364 (sau +5,2% din investiție) pentru noapte; ziua, la țintă aș muta stopul la podea. |
| ținta se potrivește din nou | alerta.plan-tinta.ok.titlu | 54 | CRV: ținta din Pionex se potrivește acum cu planul tău |
| ținta se potrivește din nou | alerta.plan-tinta.ok.mesaj | 48 | Atinsă, botul are ≈ +2,7 USDT; planul zice +2,6. |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-iesi.critic.titlu | 38 | CRV · semafor roșu: lichidarea la 6,2% |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-iesi.critic.mesaj | 70 | Sub 8% e zona de ieșire. ⏎ 👉 Aș adăuga marjă sau aș închide botul acum. |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-ia-profit.atentie.titlu | 27 | CRV: moment bun să încasezi |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-ia-profit.atentie.mesaj | 95 | Botul e pe plus cu +4,20 USDT, iar mișcarea contra a început. ⏎ 👉 Aș închide botul pe plus acum. |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-muta.atentie.titlu | 51 | CRV: mută gridul — prețul stă lângă marginea de jos |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-muta.atentie.mesaj | 153 | De 2 zile prețul e sub mijlocul gridului. ⏎ 👉 Aș muta gridul des (0,3%) la 0.37000 – 0.40000, 7 grile în Pionex, 4×, ~3,4 perechi/zi (setările în Tablou). |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-btc.atentie.titlu | 28 | CRV: BTC a intrat în mișcare |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-btc.atentie.mesaj | 123 | BTC în mișcare (1,9× obișnuitul lui), moneda botului încă liniștită. ⏎ 👉 N-aș adăuga bani până nu se vede încotro trage BTC. |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-aglomerare.atentie.titlu | 44 | CRV: mulțimea e înghesuită pe partea botului |
| semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare | alerta.s-aglomerare.atentie.mesaj | 94 | Funding +0,060% și 2,1 long la 1 short: mulțimea e pe partea botului. ⏎ 👉 N-aș mări botul acum. |
| mediul: BTC contra și funding mare | alerta.m-btc.atentie.titlu | 41 | CRV: BTC pe 4 ore merge împotriva botului |
| mediul: BTC contra și funding mare | alerta.m-btc.atentie.mesaj | 170 | BTC pe 4 ore coboară (−2,1%), iar botul e long; monedele mici îl urmează de obicei. ⏎ 👉 N-aș adăuga bani cât BTC trage împotrivă; la o mișcare mare a lui aș închide botul. |
| mediul: BTC contra și funding mare | alerta.m-funding.atentie.titlu | 54 | CRV: funding-ul e mult peste obicei, pe partea botului |
| mediul: BTC contra și funding mare | alerta.m-funding.atentie.mesaj | 152 | Funding +0,060% la 8 ore, de 4× obișnuitul: mulți stau pe aceeași parte, te costă mai mult și crește riscul unei căderi bruște. ⏎ 👉 N-aș mări botul acum. |
| mediul: din nou normal | alerta.m-btc.ok.titlu | 39 | CRV: BTC nu mai merge împotriva botului |
| mediul: din nou normal | alerta.m-btc.ok.mesaj | 26 | BTC pe 4 ore urcă (+1,2%). |
| mediul: din nou normal | alerta.m-funding.ok.titlu | 35 | CRV: funding-ul a revenit la normal |
| mediul: din nou normal | alerta.m-funding.ok.mesaj | 25 | Funding +0,010% la 8 ore. |
| botul a ajuns pe zero (long) | alerta.p-zero.atentie.titlu | 36 | CRV: botul a ajuns pe zero (0.39250) |
| botul a ajuns pe zero (long) | alerta.p-zero.atentie.mesaj | 155 | Prețul e 0.39260: închis acum, ieși fără pierdere, după comisionul de închidere. ⏎ 👉 Aș alege acum: închid botul fără pierdere sau îl las să prindă grilele. |
| prețul la 0,4% de marginea de jos | alerta.p-margine.atentie.titlu | 50 | CRV: prețul e la 0,4% de marginea de jos (0.38410) |
| prețul la 0,4% de marginea de jos | alerta.p-margine.atentie.mesaj | 126 | Ieșit din grid, botul nu mai face perechi și poziția rămâne plină pe scădere. ⏎ 👉 N-aș pune bani în plus cât stă lângă margine. |
| prețul la 0,5% de marginea de sus (short) | alerta.p-margine.atentie.titlu | 53 | LIGHTER: prețul e la 0,5% de marginea de sus (5.1000) |
| prețul la 0,5% de marginea de sus (short) | alerta.p-margine.atentie.mesaj | 91 | Ieșit din grid, botul nu mai face perechi. ⏎ 👉 N-aș pune bani în plus cât stă lângă margine. |
| stopul stins, lichidarea la 8% | alerta.opritor.critic.titlu | 39 | CRV: stopul e stins, lichidarea la 8,0% |
| stopul stins, lichidarea la 8% | alerta.opritor.critic.mesaj | 99 | Stopul e setat la 0.36200, dar nu e pornit. ⏎ 👉 Aș porni stopul în Pionex acum sau aș închide botul. |
| stopul stins, lichidarea la 17% | alerta.opritor.atentie.titlu | 41 | CRV: stopul e stins (lichidarea la 17,0%) |
| stopul stins, lichidarea la 17% | alerta.opritor.atentie.mesaj | 73 | Stopul e setat la 0.36200, dar nu e pornit. ⏎ 👉 Aș porni stopul în Pionex. |
| sfatul tăcut pe Discord (mută gridul) | alerta.tacut.titlu | 51 | CRV: mută gridul — prețul stă lângă marginea de jos |
| sfatul tăcut pe Discord (mută gridul) | alerta.tacut.mesaj | 205 | De 2 zile prețul e sub mijlocul gridului (tăcut pe Discord: pe boții tăi n-a bătut hazardul). ⏎ 👉 Aș muta gridul des (0,3%) la 0.37000 – 0.40000, 7 grile în Pionex, 4×, ~3,4 perechi/zi (setările în Tablou). |
| o pereche încheiată | grila.pereche.titlu | 35 | ✅ CRV: pereche încheiată +0,04 USDT |
| o pereche încheiată | grila.pereche.mesaj | 73 | Grilele au adus +3,24 USDT de la pornire (41 de perechi); prețul 0.38580. |
| 2 grile atinse, a cumpărat | grila.atinsa.titlu | 44 | CRV: 2 grile atinse — a cumpărat la ~0.38580 |
| 2 grile atinse, a cumpărat | grila.atinsa.mesaj | 93 | Poziția e acum 170; perechea se încheie când prețul ajunge la linia următoare în sens invers. |
| stopul poate urca | podeaUrca.mesaj.titlu | 46 | 🪜 CRV: poți urca stopul — păstrezi +4,10 USDT |
| stopul poate urca | podeaUrca.mesaj.mesaj | 180 | Stopul la 0.41370 (1,5% de preț) îți păstrează +4,10 USDT dacă piața se întoarce, cel de acum (0.40200) +2,80 USDT. ⏎ 👉 Aș muta stopul în Pionex la 0.41370; botul merge mai departe. |
| prețurile nu mai vin | preturi.rea.titlu | 51 | Crypto Radar nu mai primește prețurile de la Pionex |
| prețurile nu mai vin | preturi.rea.mesaj | 202 | De 12 minute (HTTP 503 de la Pionex) graficul, indicatorii, direcția și clasamentul sunt goale, iar alertele de piață nu sunt de încredere. ⏎ 👉 Aș aștepta să treacă singur; dacă ține, aș reporni Radarul. |
| prețurile vin din nou | preturi.dinNou.titlu | 39 | Crypto Radar primește din nou prețurile |
| prețurile vin din nou | preturi.dinNou.mesaj | 67 | Graficul, indicatorii, direcția pieței și clasamentul merg din nou. |
| mediul boților (raport la ore fixe) | raportBoti.mesaj.titlu | 17 | 📊 Mediul boților |
| mediul boților (raport la ore fixe) | raportBoti.mesaj.mesaj | 223 | CRV long 5× · total −3,20 USDT · preț 0.38580 (3% în grid) · lichidare la 30% ⏎    🟡 Mișcarea: 1,9× obișnuitul pe 4 h ⏎    🟢 BTC: pe 4 ore urcă ⏎ BTC long 3× · total +123,40 USDT · preț 64123.45 (34% în grid) · lichidare la 30% |
| mișcare neobișnuită pe o monedă | miscareNeobisnuita.moneda.titlu | 23 | CRV: urcă +7,4% în 24 h |
| mișcare neobișnuită pe o monedă | miscareNeobisnuita.moneda.mesaj | 155 | E 2,4× mișcarea ei obișnuită (3,1% pe 24 h); prețul 0.40120. ⏎ 👉 M-aș uita în Tabloul botului înainte să fac ceva: o mișcare mare nu cere singură o decizie. |
| mișcare neobișnuită pe o acțiune (fără obișnuit) | miscareNeobisnuita.actiune.titlu | 21 | NVDA: scade −6,2% azi |
| mișcare neobișnuită pe o acțiune (fără obișnuit) | miscareNeobisnuita.actiune.mesaj | 125 | Peste pragul de 3%; prețul 118.42. ⏎ 👉 M-aș uita în Trading 212 înainte să fac ceva: o mișcare mare nu cere singură o decizie. |
| vremea pieței: vreme-crypto | schimbareVreme.crypto.titlu | 15 | Crypto: mișcare |
| vremea pieței: vreme-crypto | schimbareVreme.crypto.mesaj | 83 | Crypto a intrat în mișcare: BTC 1,9× obișnuitul pe 4 h. ⏎ 👉 N-aș porni boți noi azi. |
| vremea pieței: vreme-bursa | schimbareVreme.crypto.titlu | 13 | Nasdaq: scade |
| vremea pieței: vreme-bursa | schimbareVreme.crypto.mesaj | 50 | Nasdaq scade: −1,8% azi. ⏎ 👉 Aș aștepta închiderea. |
| vremea pieței: vreme-corelatie | schimbareVreme.corelatie.titlu | 29 | BTC urmează bursa acum (0,62) |
| vremea pieței: vreme-corelatie | schimbareVreme.corelatie.mesaj | 160 | Pe ultimele 30 de zile de bursă BTC se mișcă odată cu Nasdaq: o scădere a bursei trage și crypto. ⏎ 👉 M-aș uita la VIX și la Nasdaq înainte să pornesc boți long. |
| închis pe minus de stop, cu plan | fisaInchidere.minus.titlu | 50 | 🔍 CRV închis: −7,90 USDT (−15,9%) după 30 h 0 min |
| închis pe minus de stop, cu plan | fisaInchidere.minus.mesaj | 431 | De ce: stopul de pierdere (−16,00% din investiție). ⏎ Grilele au adus +3,20 USDT în 41 de perechi; poziția și costurile au dus restul (−11,10 USDT). ⏎ Planul tău: +2,6 / −7,6 USDT → pragul de minus atins. ⏎ Lecția: stopul (−16,00% din investiție, ~3,2% din preț la 5×) era sub o zi obișnuită a CRV (~4,2%): o zi normală îl putea atinge. ⏎ Încă o lecție: grilele au câștigat, dar poziția a pierdut mai mult: greșeala nr. 1 din jurnalul tău. |
| închis pe plus de el, peste țintă | fisaInchidere.plus.titlu | 49 | 🔍 CRV închis: +4,10 USDT (+8,3%) după 30 h 0 min |
| închis pe plus de el, peste țintă | fisaInchidere.plus.mesaj | 251 | De ce: l-ai închis tu. ⏎ Grilele au adus +4,60 USDT în 52 de perechi; poziția și costurile au dus restul (−0,50 USDT). ⏎ Planul tău: +2,6 / −7,6 USDT → ținta atinsă, ai ieșit peste ea. ⏎ Lecția: ai ieșit peste ținta ta: ținerea după țintă a adus +1,50 USDT. |
| lichidat, fără plan | fisaInchidere.lichidat.titlu | 51 | 🔍 CRV închis: −49,10 USDT (−98,9%) după 30 h 0 min |
| lichidat, fără plan | fisaInchidere.lichidat.mesaj | 219 | De ce: lichidat. ⏎ Grilele au adus +1,10 USDT; poziția și costurile au dus restul (−50,20 USDT). ⏎ Planul tău: n-avea plan scris. ⏎ Lecția: grilele au câștigat, dar poziția a pierdut mai mult: greșeala nr. 1 din jurnalul tău. |
| închis în prima oră | fisaInchidere.primaOra.titlu | 45 | 🔍 CRV închis: −0,42 USDT (−0,8%) după 40 min |
| închis în prima oră | fisaInchidere.primaOra.mesaj | 480 | De ce: l-ai închis tu. ⏎ Grilele au adus +0,08 USDT; poziția și costurile au dus restul (−0,50 USDT). ⏎ Planul tău: n-avea plan scris. ⏎ Închis în prima oră (40 min): comisioanele lui −0,31 USDT, 388% din ce au făcut grilele. ⏎ Pe istoria ta: 34 de boți închiși în prima oră, net −21,40 USDT, din care comisioane −12,90 USDT. ⏎ Lecția: a ținut sub 3 ore: gridul n-a apucat să facă perechi. ⏎ Încă o lecție: grilele au câștigat, dar poziția a pierdut mai mult: greșeala nr. 1 din jurnalul tău. |
| simbolul NVDA: miscare | alerteSimboluri.miscare.titlu | 47 | NVDA: +8,0% azi, de 4,0× mișcarea lui obișnuită |
| simbolul NVDA: miscare | alerteSimboluri.miscare.mesaj | 184 | Peste 2× ATR-ul lui (2,0% pe zi, media pe 14 zile); pragul e o ipoteză, nu un semnal dovedit. ⏎ 👉 M-aș uita la știrile lui înainte să fac ceva: o mișcare mare nu cere singură o decizie. |
| simbolul NVDA: insider | alerteSimboluri.insider.titlu | 35 | NVDA: cumpărare de insider, în grup |
| simbolul NVDA: insider | alerteSimboluri.insider.mesaj | 187 | Jensen Huang (CEO) a cumpărat 12 k acțiuni, ~$1,4 mil., pe 29.09; cumpărările cu bani contează, cele primite gratis nu. ⏎ 👉 Aș trece-o pe lista de urmărit, fără să cumpăr doar pentru asta. |
| SL/TP: sltp-aproape | alerteSLTP.aproape.titlu | 47 | AMD: la 1,9% de stopul din planul tău ($138.50) |
| SL/TP: sltp-aproape | alerteSLTP.aproape.mesaj | 136 | Prețul e $141.20, în ultimul sfert al drumului spre stop (ținta $168.00). ⏎ 👉 N-aș adăuga acum; dacă atinge stopul, aș ieși cum am scris. |
| SL/TP: sltp-sl | alerteSLTP.sl.titlu | 37 | INTC: a atins stopul sugerat ($19.60) |
| SL/TP: sltp-sl | alerteSLTP.sl.mesaj | 134 | Prețul e $19.10; poziția n-are plan în Radar, stopul e cel sugerat (−15% de la maxim). ⏎ 👉 Aș ieși sau mi-aș scrie acum planul la rece. |
| SL/TP: sltp-tp | alerteSLTP.tp.titlu | 38 | PLTR: a atins ținta sugerată ($150.00) |
| SL/TP: sltp-tp | alerteSLTP.tp.mesaj | 113 | Prețul e $151.30. ⏎ 👉 Aș lua profit pe o parte și aș pune stopul la prețul de intrare; restul l-aș lăsa să meargă. |
| SL/TP: sltp-intrare | alerteSLTP.intrare.titlu | 44 | MSFT: a ajuns la intrarea sugerată ($401.00) |
| SL/TP: sltp-intrare | alerteSLTP.intrare.mesaj | 205 | Prețul e $402.10 · stop $384.50 · țintă $436.00 · pe istoric +2,1% pe trade (58% pe plus, 41 de intrări). ⏎ 👉 Aș cumpăra cel mult 1,42 buc (~2.610 lei, risc ~98 lei = 1% din cont); e un reper, nu un semnal. |
| bot nou pe o monedă unde pierzi | pornire.mesaj.titlu | 40 | LIGHTER: bot nou pe o monedă unde pierzi |
| bot nou pe o monedă unde pierzi | pornire.mesaj.mesaj | 192 | Pe LIGHTER ai închis 12 boți, net −57,30 USDT; boții închiși în prima oră: 34, net −21,40 USDT. ⏎ 👉 Aș verifica întâi poarta pe LIT: https://mau.tail9144fe.ts.net:8443/#ecran=gridset&moneda=LIT |
| rețetă: AMD a intrat | reteta.intrat.titlu | 40 | 🔔 AMD a intrat în Revenire după scădere |
| rețetă: AMD a intrat | reteta.intrat.mesaj | 94 | Preț $141.2 · azi +2,3% · 7 zile −4,1% · RSI 39; pe Scan, rândul AMD arată graficul și planul. |
| rețetă: AMD a ieșit | reteta.iesit.titlu | 40 | 🔕 AMD a ieșit din Revenire după scădere |
| rețetă: AMD a ieșit | reteta.iesit.mesaj | 39 | Preț $141.2 · azi +2,3% · 7 zile −4,1%. |
| funding-ul pe piață | fundingPiata.mesaj.titlu | 39 | Funding-ul pe piață e mult peste obicei |
| funding-ul pe piață | fundingPiata.mesaj.mesaj | 112 | Funding-ul mediu pe piață e +0,045% la 8 ore, de 3× obișnuitul. ⏎ 👉 N-aș porni boți long noi până nu se descarcă. |
| serverul de acasă nu mai răspunde | colector.serverOprit.titlu | 53 | Crypto Radar oprit: serverul de acasă nu mai răspunde |
| serverul de acasă nu mai răspunde | colector.serverOprit.mesaj | 259 | De ~15 minute serverul Radarului (fereastra neagră, :8788) nu răspunde, deci și colectorul s-a oprit: alertele boților și ale acțiunilor nu mai vin. ⏎ 👉 Aș porni PORNESTE-CRYPTO-RADAR.bat sau PORNESTE-SI-PE-TELEFON.bat; stopurile din Pionex merg și fără Radar. |
| colectorul nu mai poate citi botul | colector.citireRea.titlu | 36 | Crypto Radar nu mai poate citi botul |
| colectorul nu mai poate citi botul | colector.citireRea.mesaj | 74 | De 12 minute (HTTP 502) alertele nu mai sunt de încredere până se rezolvă. |
| colectorul citește din nou | colector.citireDinNou.titlu | 34 | Crypto Radar citește din nou botul |
| colectorul citește din nou | colector.citireDinNou.mesaj | 22 | Alertele merg din nou. |
| botul nu mai apare în Pionex | colector.lipsaPionex.titlu | 32 | CRV nu mai apare în lista Pionex |
| botul nu mai apare în Pionex | colector.lipsaPionex.mesaj | 69 | Poate a fost închis sau lichidat. ⏎ 👉 Aș verifica în aplicația Pionex. |
| botul n-are plan, cu propunere | colector.faraPlan.titlu | 21 | CRV: botul n-are plan |
| botul n-are plan, cu propunere | colector.faraPlan.mesaj | 169 | Propun +2,6 / −7,6 USDT și 12 h afară din grid, după planul tău de la CRV. ⏎ 👉 Aș pune planul propus din Tablou: fără el nu te pot anunța când să încasezi sau să închizi. |
| botul n-are plan, fără propunere | colector.faraPlan.titlu | 21 | CRV: botul n-are plan |
| botul n-are plan, fără propunere | colector.faraPlan.mesaj | 134 | Fără țintă și prag scrise la rece nu te pot anunța când să încasezi sau să închizi botul. ⏎ 👉 Aș scrie planul în Tablou → „Planul tău”. |
| gridul îngust a ajuns la durata probată | colector.ceasIngust.titlu | 33 | CRV: gridul îngust a ajuns la 6 h |
| gridul îngust a ajuns la durata probată | colector.ceasIngust.mesaj | 152 | Așa a fost probat (închiderea era la 14:30): ținut mai mult, nu mai seamănă cu proba. ⏎ 👉 Aș închide botul acum: un interval îngust iese repede din preț. |
| gridul îngust, mesaj întârziat | colector.ceasIngust.titlu | 33 | CRV: gridul îngust a ajuns la 6 h |
| gridul îngust, mesaj întârziat | colector.ceasIngust.mesaj | 201 | Așa a fost probat (închiderea era la 14:30; mesajul vine întârziat, colectorul a fost oprit): ținut mai mult, nu mai seamănă cu proba. ⏎ 👉 Aș închide botul acum: un interval îngust iese repede din preț. |
| Trading 212 nu mai răspunde (cheia) | colector.t212Rau.titlu | 37 | Trading 212 nu mai răspunde de 18 min |
| Trading 212 nu mai răspunde (cheia) | colector.t212Rau.mesaj | 230 | Cheia API pare expirată sau revocată (401): alertele de stop și țintă nu mai vin; stopurile puse în Trading 212 merg și fără Radar. ⏎ 👉 Aș verifica cheia în Trading 212 (Settings → API) și aș pune-o din nou cu PUNE-CHEILE-T212.bat. |
| Trading 212 răspunde din nou | colector.t212DinNou.titlu | 28 | Trading 212 răspunde din nou |
| Trading 212 răspunde din nou | colector.t212DinNou.mesaj | 50 | Alertele de stop și țintă pe acțiuni merg din nou. |
| o acțiune peste 20% din cont | colector.pondereT212.titlu | 33 | NVDA e 24% din contul Trading 212 |
| o acțiune peste 20% din cont | colector.pondereT212.mesaj | 136 | Peste plafonul de 20%: o zi proastă a ei e ziua proastă a contului. ⏎ 👉 N-aș mai adăuga la NVDA; la următoarea creștere aș vinde o parte. |
| perechile pe oră | colector.perechiOra.titlu | 52 | ✅ CRV: 3 perechi în ultima oră, +0,42 USDT din grile |
| perechile pe oră | colector.perechiOra.mesaj | 123 | Fiecare pereche e în Radar (Alerte); pe Discord vine un rezumat pe oră, ca alertele importante să nu se piardă printre ele. |
| frâna contului | colector.frana.titlu | 30 | 🛑 Frâna contului: gata pe azi |
| frâna contului | colector.frana.mesaj | 150 | Azi ai închis 3 boți pe minus, −24,10 USDT, peste pragul de −20. ⏎ 👉 N-aș mai porni boți azi; pragurile se schimbă în Radar → Grid → Poarta de pornire. |
| alertele sunt legate | colector.legat.titlu | 34 | Crypto Radar: alertele sunt legate |
| alertele sunt legate | colector.legat.mesaj | 144 | De aici vin alertele botului: lichidarea aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore contra botului, mișcarea mare. |
| raportul de duminică (titlul) | colector.raport.titlu | 33 | Raportul de duminică (2026-09-27) |
| autopsia acțiunilor (titlul) | colector.autopsie.titlu | 32 | Autopsia acțiunilor (2026-09-27) |
| mesaj întârziat în coada Discord | colector.intarziat.titlu | 42 | CRV: lichidarea la 6,2% (întârziat 34 min) |

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
