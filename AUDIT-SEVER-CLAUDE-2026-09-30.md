# AUDIT SEVER din toate unghiurile — Crypto Radar v100.38 · 30.09.2026

Cerere: „fă un audit la crypto app din toate unghiurile, adună toți agenții și dă-mi la final rezultate și idei”.
Metoda: 9 agenți (câte un unghi) → câte un verificator adversarial per unghi (a încercat să răstoarne fiecare 🔴/🟡) → un pass de consistență între module (inclusiv pagina `alerts` din suită) → un agent de idei. 20 de agenți, 1.164 de probe/citiri, ~61 min. **Doar citire: niciun fișier din cod atins, nimic repornit, nimic trimis pe Discord.** Starea la audit: `main` = `d423f81` = origin, serverul 8788 și colectorul (PID 14972) porniți, tunelul cloudflared oprit.

Unghiurile: matematica gridului · banii și declarația · colectorul și alertele · securitate și server · codul paginii · semnalele și verdictul botului · drumul omului în Chrome real (1920 și 390) · teste, gărzi și igienă · arhitectură și reziliență.

**Cifre după verificare și după scoaterea dublurilor: 3 🔴 critice · 25 🟡 serioase · ~60 🔵 sugestii.** (12 constatări au fost coborâte de verificatori, niciuna n-a fost infirmată de tot.)

## 🔴 CRITICE (confirmate de verificator)

1. **Raportul de duminică socotește doar ultimii 10 boți, nu săptămâna.** `scripts/colector.mjs:814` cere `limit=100`, dar Pionex dă pagini de 10. Pe 27.09 raportul a spus „10 boți, −18,39 USDT”; săptămâna reală din arhivă: **26 de boți, +24,51 brut / +8,48 USDT net**. Deci ți-a spus pierdere într-o săptămână pe plus, cu „greșeala cea mai scumpă” și „regula săptămânii” trase din eșantion. Același plafon de 10 la „Dacă ascultai de Radar” (`colector.mjs:459`). Reparația: arhiva `botiInchisi`, deja folosită în altă parte.
2. **Acasă spune „Semafoare: nimic roșu” când 2 poziții T212 sunt pe IEȘI, iar contul T212 rămâne înghețat deși scrie „actualizat”.** Semaforul e numărat din DOM-ul paginii T212 (`lib/acasa-ecran.js:256`), deci e 0 până deschizi T212; contul se aduce o singură dată (`t212-ecran.js:647`). Probat în Chrome real: pe Acasă „nimic roșu”, după un clic pe T212 „2 de ieșit”; și banda de sus de pe Tablou scria „✓ nimic roșu” verde.
3. **Declarația Unică arată dividendele 0,00 lei dacă intri direct în Jurnal → Acțiuni** (real: +18,84 lei în 2025, +32,10 lei în 2026). Dividendele se aduc doar când deschizi ecranul T212 (`t212-ecran.js:32`, `:424`, `:541`). Aceeași cifră de 0 pleacă în „Copiază pentru contabil” și în CSV. Sume mici, dar e o cifră fiscală afișată ca zero sigur.

## 🟡 SERIOASE (unice, după verificare)

**Gridul și semnalele**
4. **v100.38 („Pionex numără liniile”) n-a ajuns peste tot.** Alerta Discord „mută gridul” spune 5 grile, Tabloul 6 (`lib/alerte.js:189` — a și plecat pe 30.09 14:02 la CRV); la fel Scan (`scan-ecran.js:230`), Tablou „Pe ce aș porni” (`app.js:5673`), jurnalul gridurilor (`app.js:5187`), Scenariul „dacă prețul ajunge la X” (`scenariu.js:21,34,43`, până la 14 % greșeală pe total), „Din grile / din direcție” la boții spot (`app.js:5528` → `grid-umpleri.js:60`). Garda `proba-v10038.mjs:81` e un regex care trece și pe codul stricat.
5. **Comisionul pe umplerile de grilă e socotit 0,05 %, Pionex ia 0,02 % (maker).** Dovedit pe umplerile reale ale boților CRV 2393/2394; 0,05 % e doar la pornire/închidere. Fișa respinge setări bune: la pasul de 0,30 % netul real e ~0,26 %, nu 0,20 % (`grid-calcul.js:13`, folosit în 7 locuri).
6. **„Costurile mănâncă grilele” e fals la orice bot nou:** taxa de deschidere (plătită o dată) e împărțită la vârsta botului ⇒ ATENȚIE galben de la secunda 27 (`tablou-extra.js:62-70`).
7. **Semaforul sare IEȘI ↔ ATENȚIE la câteva minute** — planul pe minus nu rămâne „atins”, pragurile n-au histerezis (`semnale-bot.js:231`).
8. **Idei T212: tabelul arată stopul −15 %, dar proba și „Biletul” (câte bucăți) folosesc k×ATR.** La COKE: riști 3 % din cont, nu 1 %; risc 15 % pentru țintă 9 % (`idei.js:26`). Același simbol are două SL-uri pe două ecrane (Radar vs `alerts`/Discord).
9. **Ținta poziției T212 „fuge”:** e socotită din prețul de ACUM + 2×risc ⇒ alerta „a atins ținta sugerată” nu poate pleca niciodată (`actiuni-semnale.js:239`).
10. **Maximul de după cumpărare include ziua cumpărării** în colector (`colector.mjs:580`), proba o exclude ⇒ trail-ul de 15 % poate porni de la un maxim de dinaintea cumpărării.
11. **Grid propus SHORT: „setările de copiat” n-au rând de stop-loss** (`app.js:5715`).
12. **„Crypto” include acțiuni și mărfuri tokenizate** — 17 din primele 60 pe hartă, în regimul crypto și în „de ocolit pentru grid” (`grid-clasament.js:64`).
13. **„Ce ai de făcut acum” pune sus un IEȘI vechi de 2 ore**, deși scrie „cele mai noi sus” (`app.js:5877`).

**Banii**
14. **„Față de ieri dimineață” la boți compară totalurile unor boți diferiți:** −3,23 USDT într-o zi în care LIGHTER s-a închis pe −59 (`acasa.js:208`).
15. **Jurnalul crypto judecă pe rezultatul brut, statistica de deasupra e netă** (`jurnal-trade.js:93`); același bot închis are cifre diferite în alerta „închis” și în Jurnal.
16. **CSV-ul pentru contabil: `cost_lei` + `încasat_lei` nu se leagă cu rezultatul la multe vânzări T212** (`t212.js:121,163`).
17. **„Dacă ascultai de Radar”** vede doar prima pagină Pionex și cere lumânări pe tickerul greșit (PUMPFUN/LIGHTER_USDT_PERP) — eșuează din oră în oră (`tura-contrafactual.mjs:10`).

**Alertele și lanțul lor**
18. **O alertă refuzată de Discord e trecută ca trimisă, fără reîncercare** (`colector.mjs:153` `return inKv || ok`). Un webhook mort = tăcere totală.
19. **Când Pionex nu dă lista boților, poza urcă boții vechi cu ora „acum”** (`colector.mjs:624`) ⇒ pagina `alerts` și paznicul văd drept vii lichidarea și poziția înghețate.
20. **Serverul 8788 moare ⇒ colectorul iese tăcut; până la ~55 min fără nicio alertă** (`colector.mjs:272`; comentariile spun „5 minute”). Pe 29.09 au fost 42 de minute așa.
21. **T212 cade (cheie expirată/401) ⇒ alertele de stop pe cele 7 poziții se opresc în liniște**, doar jurnal (`colector.mjs:501`).
22. **Crumb-ul Yahoo nu se reîmprospătează la 401** ⇒ insiderii/rezultatele/analiștii mor până la 24 h (`yahoo-extra.mjs:15,23`).

**Pagina, securitatea, igiena**
23. **Nicio cerere din pagină n-are timeout** — o cerere agățată îngheață pentru totdeauna reîmprospătarea Acasei, Scan, Grid (`app.js:3186-3187`).
24. **`APP_API_TOKEN` are 10 caractere, cu tipar de cuvânt, și e aceeași pe site-ul PUBLIC `crypto-wuy.pages.dev`, care are cheile Pionex** (`functions/_shared/auth.js:28`). Cheile sunt doar-citire, dar dau poziția și istoria contului.
25. **Copiile KV (arhiva celor ~2.256 de boți, planurile, alertele) stau doar pe C:** (`scripts/lib/copie.mjs:7`). Discul moare ⇒ istoria Pionex adunată se pierde.

## Ce ține (verificat, pe scurt)
Doar-citire garantat (zero rute de ordine) · formula de lichidare = Pionex (0,3192 vs 0,3189) · verdictul gridului chiar spune „NU PORNI” · procentul „azi” = Binance/Pionex · pragurile de lichidare, „% în grid”, ponderea, profitul pe grilă — aceeași funcție peste tot · reparațiile din auditul 28.09 țin · `npm test` verde local · depozitul public fără secrete în istoric.

## Ce NU s-a probat
- Telefonul real și tunelul: doar emulare 390×844. Pagina `alerts` cu poza reală: cheia de citire nu e pe disc, s-a văzut doar starea „fără cheie” (poza s-a citit direct din KV cu tokenul wrangler).
- Rata 0,02 % maker e dovedită pe 2 boți CRV; lumânări de 15M pe 31 de zile doar pentru CRV (restul expiraseră din cache, n-am cerut altele ca să nu încărcăm Pionex).
- `/api/t212?action=dividende` nechemat direct (limita T212) — critica 3 e dovedită în Chrome pe drumul omului, nu pe API.
- Butoanele din interiorul celor 47 de ecrane: s-au apăsat meniul, Acasă, Tablou, Jurnal, Declarația; nu toate formularele.
- Probele de ecran (`proba-ecran-*.mjs`) nu s-au rulat (ar fi lovit Pionex/T212).
- Worker-ul paznic: fără `wrangler tail`; fereastra de ~55 min socotită din cod + jurnalul din 29.09, nu provocată.
- Permisiunile reale ale cheii Pionex (legată de IP?) și dacă producția are frâna la parole greșite între izolate.


## IDEI (agentul de idei, pe baza constatărilor confirmate)

**TOP 10 idei pentru CRYPTO RADAR, ordonate după impactul pe bani** (v100.38, d423f81)

Ce am verificat în cod ca să nu propun ce există deja:
- Frâna de pierderi există doar pe hârtie (`paperCircuitBreaker`, app.js:939).
- Poarta de pornire are 6 verificări: verde, reintrare, levier, monedă, contra-trend, plan (obiceiuri.js). Nu verifică cât ai pierdut pe cont.
- `avertizariPornire` (tura-pornire.mjs) anunță doar „monedă unde pierzi”. Nu se uită la stopul botului.
- Alerta „plan-stop” (alerte.js:106–130) pleacă doar dacă există un plan pe minus.
- `grid-calcul.js:13` are un singur comision, 0,0005.
- `grid-proba.js` nu are funding.
- `grid-plan.js` nu are prag de rentabilitate.
- `backlog.md` nu are nicio idee pe Crypto Radar, deci nimic nu se dublează.

**Înainte de idei, 4 reparații care sunt bani direct** (efort S, sunt constatări, nu idei):
- Dividendele din Declarație ies 0 dacă intri direct în Jurnal → Acțiuni (t212-ecran.js:32/541).
- Raportul de duminică vede doar ultimii 10 boți (colector.mjs:814). Pe 27.09 a spus −18,39 în loc de +24,51.
- Alerta Discord „mută gridul” scrie intervalele drept „grile” (alerte.js:189): 5 pe Discord, 6 în Tablou.
- Alerta „costurile depășesc grilele” e falsă la orice bot tânăr (tablou-extra.js:62–70).

---

**1. Frâna contului pentru boții reali, pe zi și pe săptămână** — efort M, risc mic
- **Problema:** în 2026 ai −5.169,75 USDT pe 1.770 de boți. Boții închiși în prima oră au făcut −2.065 USDT (1.469 de boți). LIGHTER a luat −59 la 2 noaptea. Nimic nu spune „ajunge pe azi”: frâna există doar pentru hârtie, iar poarta nu are un rând despre pierderile contului.
- **Ce ar face:** însumează pe zi (ora României) netul boților închiși azi plus pierderea celor deschiși, din arhivă și din poză.
  - Pragurile le pune omul, de exemplu −20 USDT pe zi, −60 pe săptămână, sau 3 închideri pe minus la rând.
  - Peste prag vine o alertă critică o singură dată („gata pe azi: −23,4 USDT, 4 boți”), iar poarta primește un rând roșu „frâna contului”.
  - Avertizează, nu blochează (pragul e un privilegiu). Din arhivă se poate arăta cât ar fi economisit regula pe 2026.
- **Risc:** pragul e ipoteză. Se arată cu contrafactualul pe arhivă, nu ca adevăr.

**2. Costurile adevărate: comision de grilă 0,02 %, taxa de intrare separată, funding în probă** — efort S–M, risc mic
- **Problema:**
  - Simulatorul pune 0,05 % pe fiecare umplere (grid-calcul.js:13). Pionex ia 0,02 % pe grile; 0,05 % se plătește doar la pornire, închidere și stop. La gridul tău de 0,30 % netul real e ~0,26 %, nu 0,20 %, deci fișa respinge setări bune.
  - „Costurile mănâncă grilele” împarte comisionul de deschidere la zile. Orice bot nou iese ATENȚIE din secunda 27.
  - Funding-ul lipsește din probă.
- **Ce ar face:**
  - `C.COMISION_MAKER` 0,0002 și `C.COMISION_TAKER` 0,0005.
  - În `grileVsCosturi`: „taxa de intrare (o dată)” separat de „comisioane din grile + funding pe 24 h”. Doar a doua cifră intră în semafor.
  - Proba scade rata medie de funding din `piata:funding` (e deja în KV).
- **Risc:** se schimbă verdictele fișei. Laboratorul și clasamentul se refac pe noile costuri înainte de livrare.

**3. Pragul de rentabilitate al planului → „NU PORNI” explicit** — efort S, risc mic
- **Problema:** un plan de +2,6 / −7,5 USDT are nevoie de peste 74 % ținte ca să nu piardă. Laboratorul arată CRV cu 132 de ținte la 88 de stopuri (60 %) și media −0,33 USDT pe pornire. Ecranul „Gridul după planul tău” nu spune că planul e pe minus din aritmetică.
- **Ce ar face:** calculează rata necesară = minus / (plus + minus), cu comisioane, lângă rata din laborator.
  - Dacă rata din laborator e sub cea necesară sau media pe pornire e negativă: 🔴 „planul ăsta pierde pe CRV: ai nevoie de 74 %, istoria dă 60 %”.
  - Plus un rând „ce plan ar ieși pe zero” (de exemplu +4 / −5).
- **Risc:** laboratorul e in-sample. Se spune așa pe ecran.

**4. „Grile” = linii Pionex dintr-o singură funcție, cu gardă** — efort S, risc mic
- **Problema:** v100.38 n-a ajuns în mai multe locuri, deci omul poate scrie în Pionex un grid cu o linie mai puțin decât propune fișa:
  - alerta Discord „mută gridul”;
  - Scan (scan-ecran.js:230);
  - Tablou „Pe ce aș porni” (app.js:5673);
  - Scenariu (scenariu.js:21/34/43);
  - GridUmpleri (app.js:5528): profitul unui bot spot iese împărțit 2,25 din grile / 2,68 din direcție, în loc de 4,93 / 0;
  - jurnalul trade-urilor, la `levierSigur` (jurnal-trade.js:73).
- **Ce ar face:** `GridCalcul.liniiPionex(N)` și `GridCalcul.intervale(row)`, folosite peste tot. O probă care pică pe orice citire `.row` / `.grile` afișată în afara unei liste albe comentate. Garda regex de acum (proba-v10038.mjs:81) trece și pe codul stricat, deci se înlocuiește cu o probă de execuție pe botul CRV real (8 linii).
- **Risc:** mic, dacă proba e de execuție și nu de text.

**5. Verdict cu memorie + criticele o singură dată, cu „am înțeles”, + canal Discord „urgent”** — efort M, risc mediu
- **Problema:**
  - Semaforul a sărit IEȘI↔ATENȚIE de 5 ori în 20 de minute (semnale-bot.js:231, fără histerezis).
  - JTO a primit 18 critice într-o zi pentru același plan atins.
  - Pe 28.09 au plecat 185 de mesaje Discord, iar alerta paznicului se îneacă printre „pereche încheiată”.
  - Când totul țipă, omul nu mai citește. Așa se pierde exact alerta care contează noaptea.
- **Ce ar face:**
  - Planul pe minus atins rămâne IEȘI, cu ora, până la „am înțeles” sau închiderea botului.
  - Mută și mișcarea primesc histerezis, ca în alerte.js.
  - Criticele pe o condiție neschimbată nu se repetă până nu se agravează.
  - „Pereche încheiată” se strânge într-un rezumat pe oră.
  - Un webhook separat „🔴 urgent” (critice + paznic), cu notificare sonoră pe telefon.
- **Risc:** o confirmare greșită ascunde o agravare. De aceea „se repetă doar dacă se agravează”.

**6. Lanțul alertelor păzit cap-coadă** — efort M, risc mic
- **Problema:**
  - Pe 29.09 au fost 42 de minute fără nicio alertă: serverul 8788 a căzut, iar colectorul a ieșit tăcut.
  - O alertă refuzată de Discord e trecută ca trimisă (colector.mjs:152).
  - Poza ștampilează boții vechi cu „acum” (colector.mjs:624), deci paznicul vede „viu” date înghețate.
  - O cădere T212 oprește în liniște alertele de stop pe cele 7 poziții.
  - Health e „OK” cu colectorul mort.
- **Ce ar face:**
  - O coadă pe disc (`data/de-trimis.json`) care respectă Retry-After.
  - Poza poartă `botiLa`, `t212La`, `serverOk` și eșecurile Discord la rând. Paznicul spune „botul nu s-a mai citit de 12 min”, nu doar „colectorul tace”.
  - `TACE_MS` scade de la 30 la 10 min când lichidarea e sub 15 %.
  - Un rând „Lanțul alertelor” pe Tablou și pe alerts.
  - O pază Windows pentru Radar, după modelul „CIMINI Gestiune Guard”.
- **Risc:** o pază care repornește prea des. Pune o limită și scrie în jurnal cine a repornit.

**7. Cifrele de rezultat dintr-o singură sursă, NET, pe id de bot** — efort M, risc mic
- **Problema:** omul decide pe cifre greșite:
  - raportul de duminică (10 boți în loc de 26);
  - contrafactualul și GridJurnal văd doar prima pagină Pionex;
  - „față de ieri dimineață” spune −3,23 într-o zi cu LIGHTER închis pe −59 (acasa.js:208);
  - jurnalul crypto e ÎNAINTE de comisioane, iar statistica și Declarația sunt NET.
- **Ce ar face:**
  - Toate citesc arhiva `botiInchisi`: raportul, contrafactualul, `ultimulPlan`, GridJurnal.
  - O poză zilnică pe id de bot dă un „Ziua ta” corect: închise azi + schimbarea celor deschise.
  - Jurnalul trece pe NET, cu brutul în paranteză.
- **Risc:** mic. Arhiva e deja completă, în forma 3.

**8. Stopul verificat în primul minut, la ORICE bot nou, și la acțiuni** — efort S, risc mic
- **Problema:** alerta „n-ai stop activ” pleacă doar dacă ai un plan pe minus. `avertizariPornire` nu se uită la opritor. Botul CRV e păzit de Pionex (0,3847), dar un bot pornit în grabă, fără plan, nu primește nicio alertă de lipsă de stop.
- **Ce ar face:**
  - În `avertizariPornire`: dacă opritorul lipsește sau e stins, alertă critică „bot nou fără stop — pierderea maximă ≈ marja X USDT”.
  - Dacă stopul costă peste 2× pierderea tipică pe monedă, alertă „stopul te costă ~60, planurile tale au −15”. Exact cazul LIGHTER.
  - La acțiuni: coloana „stop pus în T212? da/nu”, citită doar-citire, ca T212 să păzească și cu PC-ul oprit.
- **Risc:** `stopLossEnabled=false` poate minți. Se folosește regula deja știută (preț pus = opritor activ).

**9. Ideile T212 cu un singur plan de ieșire + R:R** — efort S, risc mic
- **Problema:** tabelul de idei arată stopul la −15 % (idei.js:26). Proba și „Biletul” (mărimea poziției) folosesc k×ATR. La COKE riscul real e 3 % din cont în loc de 1 %, cu risc 15 % și țintă 9 %.
- **Ce ar face:** același stop în tabel, în bilet, în `marime()` și în probă. Un rând „R:R = câștig/risc” și 🔴 când R:R e sub 1.
- **Risc:** se schimbă mărimea propusă. Se spune asta pe ecran.

**10. Calibrarea simulatorului pe arhiva celor ~2.200 de boți** — efort L, risc mic (doar citire, noaptea)
- **Problema:**
  - Verdictul verde se sprijină pe ~5 ferestre independente și pe mediana in-sample a celei mai bune celule din 12.
  - Perechile deduse din lumânări de 15M nu bat cu Pionex pe botul viu.
  - Fișa afișează o setare, dar verdictul vine din proba alteia (grid-proba.js:181).
  - Nu există nicio cifră care să spună cât greșește proba.
- **Ce ar face:**
  - Noaptea, câte o cerere pe bot, cu pauză: lumânările perioadei lui, simularea, apoi comparația cu `gridProfit` și `totalRealizedProfit`.
  - Iese o „eroare medie a probei”, afișată lângă fiecare verdict.
  - Tot pe arhivă, contrafactualul pe 2.203 boți, nu pe 19.
  - Proba primește cantitatea fixă pe grilă ca Pionex și regula „linia de lângă preț n-are ordin”.
- **Risc:** consumă ritmul Pionex. Doar noaptea, pe rând, cu reluare de unde a rămas.

---

**De scos sau simplificat**

- **A. Cele ~35 de ecrane vechi, în engleză** (paper, ML, calibration, decisioncore, localdata, v54–v71) intră într-un grup pliat „Laborator (vechi)”, încărcat la cerere. Ele arată doar „—” până apeși „Analizează piața”.
  - Bara de jos pe telefon devine Acasă · Tablou · T212 · Grid · Mai mult.
  - Paleta Ctrl+K primește cele 5 ecrane zilnice.
  - Dispar și suprafața pentru buguri ca favoritele stricate care opresc toată pornirea (app.js:3764), și `trainTemporalModel`, nechemată.
- **B. Verdictele dublate:**
  - `TabloBot.verdict` e calculat la fiecare citire, dar ascuns, cu alte praguri: se scoate.
  - Rămâne un singur „trend” pe Tablou. Azi fișa zice „long, tare” și „Direcția pieței” zice „lateral”.
  - „p-zero” se reformulează: pleacă doar după o oră de viață și o treaptă sub zero. Altfel îndeamnă la închidere la 30 de secunde după pornire, exact obiceiul care a costat −2.065 USDT.
- **C. Probele:**
  - Se șterg cele 22 de scripturi v54–v57 nechemate (3 crapă). Testele pentru research-worker se păstrează.
  - Cele 58 de `npm run` legate cu `&&` devin un runner unic care descoperă singur `proba-*.mjs`, rulează pe 4 fire și dă un rezumat.
  - Se dezamorsează cele 6 „bombe de versiune” (proba-v10025/26/27/29/32/33).
  - Se scot dependențele de `C:\Users\Cimin` din teste.

**Ce N-am probat**
- Nicio cifră nouă de profit n-am măsurat-o eu. Cifrele (−5.169,75; −2.065; 60 % ținte; COKE 3 %; 42 de minute tăcere; 185 de mesaje) vin din constatările auditorilor.
- N-am socotit cât ar fi economisit frâna contului (ideea 1) pe arhivă.
- N-am verificat în Pionex tariful 0,02 % / 0,05 % pentru contul lui. Mă sprijin pe constatarea „datele Pionex arată exact 0,02 %”.
- N-am deschis Chrome și n-am apăsat nimic. N-am citit KV-ul și n-am făcut nicio cerere la Pionex sau T212.
- Backlog-ul `premarket_scanner/docs/ideas/backlog.md` l-am căutat doar după cuvinte-cheie (4.816 linii, codificare stricată pe diacritice). E posibil să-mi fi scăpat o idee formulată altfel.

Fișiere citite: `C:\Users\Cimin\crypto\public\lib\grid-calcul.js`, `tablou-extra.js`, `semnale-bot.js`, `obiceiuri.js`, `alerte.js`, `C:\Users\Cimin\crypto\scripts\colector.mjs`, `scripts\lib\tura-pornire.mjs`, `paznic\worker.mjs`, `C:\Users\Cimin\premarket_scanner\docs\ideas\backlog.md`.

---

# ANEXĂ — toate constatările, pe unghi, cu verdictul verificatorului

## Matematica gridului

Am auditat matematica gridului din CRYPTO RADAR la v100.38 (d423f81): grid-calcul, grid-proba, grid-plan, grid-clasament, grid-laborator, grid-umpleri, grid-jurnal, scenariu, fișa „Grid: ce setez acum?” din app.js, alertele și turele colectorului. Am lucrat pe date reale: botul CRV activ (2394), cei 3 boți CRV închiși din KV-ul local, 31 de zile de lumânări CRV de 15M din cache-ul serverului, clasamentul, laboratorul și contrafactualul din KV.

Ce ține:
- Regula „Pionex numără liniile” e corectă peste tot unde se citește `row` al unui bot: pasul, profitul pe grilă, amplitudinea, totalCuGridLa, codTVBot, gridDiferitDeBot.
- Formula de lichidare dă 0,3192, iar Pionex arată 0,3189 pentru botul viu.
- Verdictul chiar poate spune „NU PORNI”: acum pe CRV spune „nu” în toate cele trei direcții, și la fel în multe cazuri din contrafactual.

Ce a rămas în urmă:
- Alerta de pe Discord „mută gridul” trimite N intervale ca „grile”, cu o grilă mai puțin decât în Tablou.
- Scenariu.js numără tot pe convenția veche (row = intervale) și tratează orice grid ca aritmetic.
- Simulatorul pune comision de taker (0,05%) pe fiecare umplere de grilă. Datele Pionex arată exact 0,02%.
- Fișa afișează o setare (lățime și pas socotite pe tot istoricul), dar verdictul, mediana și „cât investesc?” vin din proba altei setări (socotită pe primele 2/3).

### 🟡 Alerta Discord „mută gridul” dă numărul de INTERVALE ca „grile” (cu o grilă mai puțin decât trebuie pus în Pionex)
`public/lib/alerte.js:189 (sursa: public/lib/semnale-bot.js:39)` · lentila: trading/grid – v100.38 incomplet

v100.38 a mutat fișa, Tabloul și codul TV pe N+1 linii, dar textul alertei „s-muta” (Discord + Radar) a rămas pe `setare.grile` = N intervale. Omul primește pe telefon „…, 5 grile, 5×”, iar în Tablou aceeași propunere arată „6 geometric”. Dacă scrie în Pionex numărul din alertă, gridul iese cu o linie mai puțin, cu alt pas și cu alte linii.

**Dovada:** node cu modulele reale: fișa CRV pe lumânările din cache + SemnaleBot.mutaGridul pe botul viu 2394 (preț 0,386) → `setare.grile (în alerta Discord, alerte.js:189) = 5 | Tablou (app.js:5718) arată 6 | codul TV trimite 6`. Alerta chiar s-a trimis: data/colector.log linia 3605, „2026-09-30T14:02:29 discord atentie CRV: mută gridul — prețul stă la marginea de jos…”. Commitul d423f81 nu atinge alerte.js (git show --stat).

**Reparația propusă:** În alerte.js:189: `(sm.muta.setare.grile + 1) + " grile (linii Pionex)"`, sau păstrează în mutaGridul atât `intervale` cât și `liniiPionex` și afișează doar numărul de linii. O probă care cere ca numărul din alertă să fie egal cu cel din Tablou.

verificator: **confirmat** — Se ține. În public/lib/alerte.js:189 textul pune `sm.muta.setare.grile + " grile"`. Valoarea vine din semnale-bot.js:39 (`grile: s.grile`), iar s.grile e numărul de INTERVALE al fișei. Orice alt loc care afișează aceeași setare adună +1: app.js:5718 (`(s.grile+1)+" geometric"`, cu nota „v100.38: in Pionex = linii”), semnale-bot.js:58, 96, 98 și 146, tablou-extra.js:48 și 430. Am căutat toate aparițiile `.grile` în public/lib, scripts și paznic: alerte.js:189 e singurul text pentru om rămas pe N. `git show --stat d423f81` confirmă că alerte.js nu e în commit. data/colector.log arată că alerta chiar a plecat: „2026-09-30T14:02:29.261Z discord atentie CRV: mută gridul — prețul stă la marginea de jos a gridului (9,2% din interval)”. Același număr ajunge și pe pagina alerts. Rămâne „serios”, nu „critic”: mesajul trimite omul la Tablou („Setările de copiat sunt în Tablou”), iar acolo numărul e corect. Neprobat de mine: cifra exactă 5 față de 6 pe botul 2394 (n-am rulat fișa).

### 🟡 Scenariu.js („ce se întâmplă dacă prețul ajunge la X”) socotește tot row = intervale și orice grid ca aritmetic
`public/lib/scenariu.js:21, 34, 43` · lentila: trading/grid – v100.38 incomplet

`pas = (sus − jos)/row` și bucla `for i = 0..row` dau row+1 niveluri aritmetice. Pionex are row linii (row−1 intervale), iar botul viu e geometric. Scenariul pune astfel alt număr de loturi între preț și X. Totalul „la jos” și prețul de golire se afișează în Tablou (app.js:5839) și intră în Sfaturi (app.js:5853).

**Dovada:** Botul viu 2394 (row 20, geometric, perVolume 32,9, citit o dată din /api/bot-orders): la 399 de prețuri între jos și sus, Scenariu.la(jos) pune alt număr de loturi decât liniile Pionex (GraficBot.liniiPionex) la 125 dintre ele (31%). Cel mai mare ecart al totalului la jos: −1,112 USDT (poziție 1185,3 față de 1152,4). Pe gridul CRV cu 8 linii al botului 2393 (0,3755–0,423, 83,5/lot): 173 din 399 de prețuri (43%), cel mai mare ecart −2,253 USDT pe un total real de −15,591 (14%). La prețul de acum (0,391) ecartul e 0, pentru că ambele au 3 niveluri până jos.

**Reparația propusă:** Nivelurile Scenariului să vină din GraficBot.liniiPionex(jos, sus, row, gridType === "geometric") (row−1 intervale, geometric când e cazul). Bucla `la()` să meargă pe liniile acelea, nu pe `jos + i*pas`. O probă cu botul 2394: poziția la jos = 19 × 32,9.

verificator: **confirmat** — Codul confirmă. scenariu.js:34 face `pas = (sus − jos)/randuri`, iar bucla de la :42 merge `for i = 0..n` și dă row+1 niveluri aritmetice. Commitul d423f81 (v100.38) a stabilit însă, cu dovadă, că row citit din Pionex = LINII, deci row−1 intervale. Scenariu.js nu e în acel commit și nu citește gridType (botul 2394 e geometric). Pe botul 2393 (KV botiInchisi: 0,3755–0,423, row 8, geometric), Scenariul pune 9 niveluri la pas 0,005938; Pionex are 8 linii geometrice la ×1,01717. Nicio gardă nu compensează. Rezultatul intră în Tablou (app.js:5839) și în Sfaturi (app.js:5853). Nota afișată spune „(20 niveluri)”, dar modelul folosește 21. Atenuări: comentariul modulului (scenariu.js:4–9) și nota din Tablou îl declară „Aproximare”, iar lângă el apare estimarea de lichidare a Pionex. Ecartul raportat e mic în valoare absolută: ~1–2 USDT pe boți de ~50 USDT, dar până la 14% din totalul „la jos”. Rămâne o abatere nedeclarată de la regula dovedită. Neprobat de mine: ecartele exacte −1,112 și −2,253 USDT, pentru că n-am cerut /api/bot-orders.

### 🟡 Comisionul pe umplerile de grilă e socotit 0,05% (taker); Pionex ia 0,02% (maker). Doar pornirea și închiderea sunt 0,05%
`public/lib/grid-calcul.js:13 (folosit la grid-proba.js:18,29; grid-calcul.js:203; tablou-extra.js:28; jurnal-trade.js:33)` · lentila: trading/grid – comisioane

C.COMISION = 0,0005 se aplică la fiecare umplere în simulator (grid-proba.js:18, 29) și în „pas net pe grilă” (grid-calcul.js:203, grid-plan.js:45, grid-clasament.js:38, tablou-extra.js:28, jurnal-trade.js:33, semnale-bot.js:91). Datele Pionex arată taker 0,05% doar pe cumpărarea de la pornire și 0,02% pe ordinele limită ale grilelor. Rezultatul e o părtinire pesimistă sistematică, cea mai mare la gridurile dese (regula lui): la pas 0,30% netul afișat e 0,20%, cel real ~0,26%. Proba subestimează gridul des, iar „comisionul mănâncă X% din pas” e umflat.

**Dovada:** KV ist:2394: primul comision −0,07923816 = 395,4 × 0,4008 × 0,0005 (exact taker la pornire). Umplerile de grilă de după: comision 0,02052466 pe volum 102,6233 = 0,000200 (exact 0,02%). Botul 2393: 83,5×(0,4089−0,4019) − gridProfit 0,56932 = 0,01518 pe volum 67,70 = 0,0224%. Pe fișa CRV (e7_fee.cjs), doar cu 0,02% pe umplerile de grilă: gridul des long trece de la mediana 1,43% la 2,97% (antren) și de la 1,49% la 2,78% (test); neutru des de la −2,93% la −2,09%.

**Reparația propusă:** Două constante: COMISION_TAKER 0,0005 (pornire, închidere, stop) și COMISION_MAKER 0,0002 (umpleri de grilă). În simuleaza: umple() pe maker, pornirea și inchide() pe taker. profitGrila = g − 2×maker. De verificat pe încă 2–3 boți închiși înainte de a schimba pragurile.

verificator: **confirmat** — Reprodus pe KV-ul local, doar citire (.wrangler/state/v3/kv/ISTORIC, ist:2394 și ist:2393).
• Botul 2394, pornirea: comisionul −0,07923816 = 395,4 × 0,4008 × 0,0005 (taker).
• 2394, vânzările de grilă: +0,002558962, +0,002575412 și +0,002591862 = 32,9 × {0,3889; 0,3914; 0,3939} × 0,0002. Treptele sunt egale (~0,64%), deci maker 0,02%.
• 2394, cumpărările: salturi de ~0,0052 = 32,9 × (0,3963 + 0,3937) × 0,0002, adică două umpleri alăturate în aceeași poză de 2 minute, tot 0,02%.
• Botul 2393: pornirea −0,050062 = 3 loturi × 83,5 × 0,3997 × 0,0005; vânzarea de grilă +0,006827 = 83,5 × 0,40887 × 0,0002.
grid-calcul.js:13 are `COMISION: 0.0005 // pe umplere`, iar comentariul de la PAS_MIN („net 0,20% după ~0,10% dus-întors”) arată că presupunerea e 0,05% pe fiecare umplere. Nicio gardă nu separă maker de taker. Părtinirea e pesimistă, deci pe partea sigură, dar e sistematică. Cea mai mare e la gridul des (regula lui): pasul net 0,20% față de ~0,26% real. Asta schimbă verdictul și mediana fișei, pe care omul decide. Neprobat de mine: medianele din e7_fee.cjs (1,43→2,97% etc.).

### 🔵 Fișa afișează o setare, dar verdictul, mediana, perechile/zi și „Cât investesc?” vin din proba ALTEI setări
`public/lib/grid-proba.js:181 (față de 112–115)` · lentila: trading/grid – proba vs setarea afișată

proba() alege lățimea și pasul din percentilele PRIMELOR 2/3 din istoric (latV/pasV) și le simulează. fisa() construiește însă setarea afișată cu `G.latimi(o.b15)`/`G.pasi(o.b15)` pe TOT istoricul, la aceiași indici wi/pi. Textul „pe istoric, setarea asta…” (grid-calcul.js:334–336), „cea mai proastă fereastră” din „Cât investesc?” (app.js:4983) și gridul des propus vorbesc despre altă setare decât cea de copiat în Pionex.

**Dovada:** e6.cjs pe CRV: lățimi probate 11,80/13,16/15,97%, afișate 12,04/13,81/20,84%. La neutru, setarea probată are 8 intervale pe 15,97%, cea afișată 9 intervale pe 20,84%. Gridul des: 53 de intervale probate, 69 afișate. Simulând chiar setarea afișată pe aceleași ferestre: neutru des mediana −2,93% (arătat) față de −0,54% (real al setării); long des 1,43% față de 3,81%. „Cea mai proastă” la neutru e −12,47% față de −13,92%, deci „Cât investesc?” la 1000 USDT/2% dă 160 USDT în loc de 143 (+12% peste cât e sigur).

**Reparația propusă:** O singură sursă: fie setarea afișată folosește latV/pasV din proba (pr.latimi[wi], pr.pasi[pi]), fie după alegere se re-simulează setarea finală (inclusiv cea redusă de minimul pe ordin) și verdictul se ia pe statistica ei. Proba de acceptare: statistica afișată = simularea setării afișate.

verificator: **coborat** — Mecanismul e real. În grid-proba.js:112–115, proba() ia latV și pasV din primele 2/3 ale istoricului. fisa() (:181) recalculează lățimea și pasul pe tot b15, la aceiași indici wi/pi. Apoi verdict() spune „setarea asta” (grid-calcul.js:334–336) despre cifre simulate cu altă lățime. E însă practica standard walk-forward: se validează REGULA (percentila p a lățimii, al k-lea candidat de pas), pe primele 20 de zile se alege și pe ultimele 10 se raportează (specul 2026-09-24, linia 116). Apoi regula se recalculează pe toate datele pentru azi. Pasul des (pasV[0] = PAS_MIN 0,30%) e identic în ambele. Diferă lățimea, deci și numărul de grile. Defectul adevărat e formularea („setarea asta”) și faptul că setarea afișată nu e simulată și ea. Nu e o eroare de calcul. Diferența invocată la „Cât investesc?” (160 față de 143 USDT) stă în zgomotul unei singure ferestre „cea mai proastă”. Neprobat de mine: cifrele din e6.cjs (n-am rulat fișa pe lumânările din cache).

### 🔵 Perechile deduse din lumânări de 15M (drumul O-L-H-C) nu bat cu Pionex pe botul viu, iar „perechi încheiate/zi” la gridul des se sprijină pe același drum
`public/lib/grid-proba.js:65 (și public/lib/grafic-bot.js umpleri)` · lentila: trading/grid – simulare pe istoric

Simulatorul probei (grid-proba.js:65) și reconstituirea de pe grafic (GraficBot.umpleri) presupun drumul O→L→H→C / O→H→L→C în fiecare lumânare de 15M. La pasul de 0,3–0,6% o lumânare obișnuită taie 2–3 linii, deci numărul de perechi depinde aproape numai de această presupunere. Cifra „~55 de perechi pe zi” de la gridul des nu e validată față de Pionex.

**Dovada:** Botul viu 2394 CRV, de la pornire (12:47) până la 16:04: GraficBot.umpleri dă 5 perechi, simulatorul Radarului 6, modelul Pionex 5. Pionex: ordinePerechi = 2 (KV ist:2394: perechea 1 la 15:31, a 2-a la 16:03). Primele perechi deduse (13:45 vânzare la 0,39145, 14:30 și 15:00 la 0,38653) n-au apărut în Pionex. Pe botul închis 2392 modelul dă 1 pereche, iar gridProfit 1,0708 ≈ 2 perechi. Eroarea merge în ambele sensuri.

**Reparația propusă:** Calibrare pe arhiva de ~2.200 de boți închiși din KV (botiInchisi): pentru fiecare bot, perechi reale ≈ gridProfit / profitul unei perechi, față de perechile simulate pe lumânările perioadei lui. Până atunci, „perechi/zi” să fie afișat ca estimare cu marjă și cu notă că nu e verificat pe Pionex.

verificator: **coborat** — Partea verificabilă se confirmă. grid-proba.js:65 folosește drumul fix `x.c >= x.o ? [o,l,h,c] : [o,h,l,c]`. În ist:2394 (KV local), perechile Pionex sunt 1 la 15:31 și 2 la 16:03, deci 2 până la 16:04, cât spune și constatarea. Cifrele de 5–6 perechi ale modelului nu le-am reprodus. Însă presupunerea de drum în interiorul lumânării e limita cunoscută a oricărei simulări pe OHLC, nu un defect de logică. Autorul o expune: legenda graficului „perechi pe grafic: N · Pionex: M” (commit d423f81). Eșantionul e prea mic: doi boți, câteva ore. Ecartul merge în ambele sensuri (2394: model > Pionex; 2392: model 1, gridProfit 1,07 ≈ 2 perechi, când o pereche la 2393 = 0,569), deci nu s-a dovedit o părtinire sistematică. E o cifră nevalidată, bună de etichetat ca „estimată din lumânări de 15M” sau de verificat pe 1M. Nu e fiabilitate stricată. Neprobat de mine: GraficBot.umpleri și simulatorul pe lumânările reale ale lui 2394, și cifra „~55 perechi/zi”.

### 🔵 Simulatorul probei nu aplică regula dovedită în v100.38 (linia cea mai apropiată de prețul de pornire nu are ordin); regula e doar pe grafic
`public/lib/grid-proba.js:21–28` · lentila: trading/grid – model de pornire

GridProba.simuleaza ține la pornire toate celulele cu linia de sus peste preț. Când linia cea mai apropiată e deasupra, Pionex are un lot mai puțin (și o cumpărare imediat dedesubt). La neutru, simulatorul are N−1 ordine față de N la Pionex. Setările probei se construiesc relativ la prețul de pornire, deci ecartul e același în toate ferestrele unei celule: 0 sau exact un lot.

**Dovada:** Resimularea boților CRV închiși (row−1 intervale, evaluat la closedPrice): bot 2391 real +1,412 USDT, simulatorul +2,005, modelul Pionex +1,317. Bot 2393: 2 perechi în simulator, 1 în modelul Pionex, iar gridProfit real 0,569 = 1 pereche. Pe proba fișei CRV efectul e mic: mediana gridului des long 1,428% față de 1,445%, neutru neschimbat. La griduri cu puține intervale (5–8) un lot înseamnă 12–20% din poziție.

**Reparația propusă:** În simuleaza, după bucla de pornire: ki = linia cea mai apropiată de P. La long, dacă niv[ki] > P, eliberează celula ki−1. La short, dacă niv[ki] < P, eliberează celula ki. La neutru, dă ordin și liniei de sus. Proba din proba-v10038 se extinde pe simulator.

### 🔵 Mai multe ecrane scriu încă INTERVALELE ca „grile”, lângă ecrane care scriu liniile Pionex
`public/app.js:5408, 5256, 5673, 5121, 5187; public/lib/scan-ecran.js:230` · lentila: trading/grid – v100.38 incomplet (afișare)

După v100.38 fișa, varianta după plan și propunerea din Tablou arată N+1. Au rămas cu N: rândul „Grid des (0,3 %)” din aceeași fișă („platoul probei alesese X grile”, „X grile · ~… perechi/zi · nepropus”), coloana „Grile · pas” din Clasament și din Scan, „Pe ce aș porni” din Tablou, lista „Hârtie” și tabelul jurnalului de grid. Pentru aceeași monedă, două ecrane dau numere care diferă cu 1.

**Dovada:** grep pe `.grile` în app.js: la 5406 fișa scrie (st.grile+1) și „N+1 linii = N intervale”, dar la 5408, pe rândul imediat următor, `f.deasa.setare.grile+" grile"` și `f.aleasa.setare.grile+" grile la "` fără +1. Clasamentul din KV (30.09 18:11) are BTC 11, ETH 11, SOL 12 „grile”, adică intervale din GridClasament.judeca (nrGrile). scripts/lib/tura-scan.mjs:38 duce aceleași intervale în Scan.

**Reparația propusă:** Un singur helper `grileP(N) = N + 1` folosit la orice afișare de „grile”. Unde se arată intervalele, să scrie explicit „intervale”.

### 🔵 GridUmpleri (boții spot) construiește nivelurile pe row = intervale
`public/app.js:5528 (+ public/lib/grid-umpleri.js:60–61)` · lentila: trading/grid – v100.38 incomplet (cod adormit)

tbRandUmpleri trimite `grile: bu.row`, iar GridUmpleri.imparte face G.niveluri(jos, sus, row), adică row+1 niveluri cu pas prea mic. Umplerile reale n-ar mai cădea pe niveluri (motiv „umplerile nu cad pe nivelurile gridului”) sau s-ar împărți greșit în grile/direcție. Drumul e activ doar la boți spot; ultimul bot spot din arhivă e din 27.04.2026.

**Dovada:** app.js:5528 `grile:Number(bu.row)||0`; grid-umpleri.js:60 `G.niveluri(grid.jos, grid.sus, grid.grile)`. În arhiva KV: 30 de boți spot_grid, ultimul BLESS pe 2026-04-27, row 30.

**Reparația propusă:** `grile: Number(bu.row) - 1` la chemare (sau parametru `linii` în GridUmpleri), la fel ca în TabloExtra.geometrieBot.

### 🔵 Verdictul verde se sprijină pe ~5 ferestre independente nevăzute și pe mediana in-sample a celei mai bune celule din 12
`public/lib/grid-proba.js:112–119, 135 (grid-calcul.js:339–341)` · lentila: trading/grid – supra-ajustare / prag

Pragul MEDIANA_VERDE 0,3% se aplică medianei pe antrenament a celulei alese chiar pe acele date. „Zilele nevăzute” sunt ultimele ~10 zile: 34 de ferestre suprapuse ≈ 5 independente. O mediană negativă pe nevăzut dă doar galben, nu roșu. Nu e un defect de cod: e putere statistică mică, fără interval de încredere la vedere. (Verdictul spune totuși „nu porni”, și des: acum pe CRV în toate direcțiile, și în mare parte din contrafactualul din KV.)

**Dovada:** GridProba.proba pe CRV (31,3 zile): ferestre {antren: 76, test: 34, independente: 15}, iar testul acoperă 10,4 zile. Fișa CRV de acum: „nu” la long/short/neutru (mișcare 1,7×). KV contrafactual: majoritatea „nu”, câteva „porneste” (2378, 2383, 2384).

**Reparația propusă:** Pe fișă, lângă mediane, numărul de ferestre independente și intervalul Wilson al ratei pe plus pe nevăzut. „Pornește” să ceară și marginea de jos a IC peste 50%, sau cel puțin să afișeze „bază slabă” sub 8 ferestre independente.

**Ce a probat:** - Am citit diff-ul d423f81 și toate modulele de grid.
- grep pe `row`, `.grile` și `COMISION` în public/lib, app.js, scripts/lib, colector și radar-ecran/radar-poza din premarket_scanner. Am verificat fiecare loc unde se citește `row` al unui bot: tablou-extra (geometrieBot, profitPeGrila, totalCuGridLa, codTVBot, gridDiferitDeBot), semnale-bot.pasBot, jurnal-trade.pasNet, tablou-bot (amplitudine), grafic-bot. Toate sunt corecte după v100.38.
- Date citite fără să scriu nimic, copiate în scratchpad: KV-ul local (botiInchisi, ist:2394, clasament, laborator, contrafactual) și cache-ul serverului (31 de zile de lumânări CRV_USDT_PERP pe 15M).
- O singură cerere GET /api/bot-orders pe 127.0.0.1:8788, pentru botul viu 2394 (perVolume, row, poziție, estimarea de lichidare).
- Scripturi Node care încarcă modulele reale:
  - resimularea celor 3 boți CRV închiși, pe modelul de acum și pe modelul Pionex, comparată cu totalRealizedProfit/gridProfit;
  - fișa CRV pe 3 direcții, cu cele două modele de pornire și cu comision maker;
  - setarea probată față de cea afișată și sumaMaxima;
  - Scenariu față de liniile Pionex pe 399 de prețuri, pentru 2 geometrii;
  - lichidarea Radarului față de cea Pionex (0,3192 vs 0,3189);
  - umplerile deduse față de ordinePerechi de la Pionex;
  - mutaGridul → textul alertei.
- Comisioanele Pionex le-am scos din istoria comisioanelor botului viu și din perechea botului 2393.

**Ce NU a probat:** - Nu am deschis UI-ul în Chrome și nu am văzut ecranele cu ochii. Afirmațiile despre afișare vin din codul app.js și din ieșirile modulelor.
- Lumânări de 15M pe 31 de zile am avut doar pentru CRV. BTC avea 5 zile, restul expiraseră din cache. N-am cerut altele de la Pionex, ca să nu încarc limita de ritm. Toate cifrele de probă sunt pe o singură monedă.
- Rata maker 0,02% e dovedită doar pe 2 boți CRV.
- Numărul real de perechi pentru 2392 l-am estimat din gridProfit, pentru că arhiva nu are ordinePerechi.
- Modelul Pionex la neutru nu l-am implementat, am doar analiza din cod.
- GridLaborator (verdictele „dovedit/contrazis”) nu l-am recalculat, doar i-am citit rezultatul din KV.
- GridJurnal.calibrare nu l-am exercitat (jurnalul stă în localStorage-ul telefonului/PC-ului).
- GRID-FISA v2.1 din Pine (în afara depozitului) nu l-am verificat.
- Suita npm test și probele proba-v100xx nu le-am rulat.
- Limitele Pionex pentru numărul de grile nu le-am verificat pe API. Arhiva arată row până la 772, deci GRILE_MAX 150 nu e o problemă.

## Banii și raportarea

Am auditat cifrele de bani din CRYPTO RADAR (v100.38, d423f81) pe datele reale: arhiva boților închiși din KV-ul local (2.256 de boți, completă, forma 3), istoricul T212 (2.421 de umpleri, 1.066 de vânzări), cursul BNR 2025–2026 luat prin serverul local, contrafactualul și raportul de duminică din KV. Am rulat modulele paginii (jurnal-trade, t212, statistica-trade, contrafactual) în Node și am refăcut totalurile de mână în Python.
Declarația pe Pionex iese exact: 2025 = 486 de boți, −838,91 USDT / −3.631,48 lei; 2026 = 1.770 de boți, −5.169,75 USDT / −22.886,79 lei. Cursul BNR pentru weekend, sărbători și 1–4 ianuarie se ia corect, iar formatul CSV (;, virgulă zecimală, BOM) e bun.
Rămân totuși cifre greșite pe care omul decide:
- raportul de duminică numără doar ultimii 10 boți (27.09: „10 boți, −18,39”, când de fapt au fost 26 de boți, +8,48 net);
- jurnalul crypto (greșelile, „Dacă ascultai de Radar”, cifra de pe fiecare bot) e ÎNAINTE de comisioane, iar statistica și Declarația sunt NET;
- în CSV-ul contabilului, costul și încasatul (FIFO) nu se leagă cu rezultatul (preț mediu T212) la 26 de rânduri în 2026.
Mai sunt: CSV fără protecție la formule, dividende care devin tăcut 0 la eroare, o arhivă „toată istoria” cu 137 de id-uri lipsă nelămurite și 24% dintre boții futures la care NET-ul nu bate cu banii primiți înapoi.

### 🔴 Raportul de duminică (Discord + pagină) socotește doar ultimii 10 boți, nu săptămâna
`C:\Users\Cimin\crypto\scripts\colector.mjs:814-815` · lentila: bani / raport

turaRaport cere /api/bot-orders?status=finished&limit=100, dar Pionex dă istoria pe pagini de câte 10 (limit e ignorat, cum spune chiar boti-arhiva.js). Raportul săptămânii ia deci doar cei mai noi 10 boți. Săptămânile cu peste 10 boți ies cu alt număr de boți, alt total (și alt semn) și altă „greșeală cea mai scumpă” / „regula săptămânii”, iar raportul pleacă pe Discord.

**Dovada:** Raportul din KV (action=raport, la=1790528431721, 27.09 seara) spune „10 boți închiși, total −18.39 USDT”. Refăcut: suma rezultatelor boților 2376–2385 (cei mai noi 10) = −18,394, adică exact cifra din raport. Pe aceeași fereastră (acum−7 zile) arhiva are 26 de boți (2360–2385): brut +24,51, grile +71,75, poziție −47,23, costuri −16,03, deci NET +8,48 USDT. Raportul a spus pierdere când săptămâna a fost pe plus și a numărat 10 boți în loc de 26.

**Reparația propusă:** În turaRaport, botii să vină ca în jtAduBoti: prima pagină + arhiva /api/istoric-bot?action=botiInchisi (unire pe strategyId), apoi filtrul pe 7 zile. Totalul să fie NET (rezultat + comisioane + funding), cu grile/poziție/costuri alături. Un test cu peste 10 boți în săptămână.

verificator: **confirmat** — Codul confirmă: colector.mjs:814 cere o singură pagină (/api/bot-orders?status=finished&limit=100). bot-orders.js:46 spune chiar el că Pionex dă pagini de câte 10 și ignoră limit. Obiceiuri.raportDuminica (obiceiuri.js:92) filtrează pe 7 zile doar în ce primește. Am refăcut raportul cu modulele paginii (scratchpad/v_c1.cjs) la același moment ca raportul din KV (la=1790528431721). Pe cei mai noi 10 boți (2376–2385) iese exact ce e în KV: „10 boți închiși, total −18.39 USDT, 5 pe plus (50%)”. Pe arhiva completă, săptămâna are 26 de boți, total +24,51 USDT, 20 pe plus (77%), grile +71,75, costuri −16,03, deci NET +8,48 USDT. Raportul trimis pe Discord a spus pierdere când săptămâna a fost pe plus, iar „greșeala cea mai scumpă” iese și ea din alt set (4 boți, −36,16 față de 5 boți, −41,54). Arhiva completă e deja în KV (action=botiInchisi), așa că reparația e la îndemână. Nu există nicio gardă care să anuleze defectul.

### 🟡 Jurnalul crypto judecă pe rezultatul ÎNAINTE de comisioane și funding, iar statistica de deasupra e NET
`C:\Users\Cimin\crypto\public\lib\jurnal-trade.js:93-94 (+ contrafactual.js:44-51, tura-contrafactual.mjs:24, app.js:5361-5379)` · lentila: bani / brut vs net

JurnalTrade.rezumat pune costul fiecărei greșeli din t.rezultat (realizatul Pionex, fără comisioane și funding). Pe același brut merg Contrafactual.rezumat („Dacă ascultai de Radar”, cu rezultat: t.rezultat și în KV), cifra mare de pe fiecare bot din listă, Obiceiuri.reguliPersonale și totalul din raportul de duminică. Blocul Statistica, Declarația și CSV-urile sunt NET, deci pe aceeași pagină același bot are două rezultate. KPI-ul „Rezultat realizat” spune că e înainte de comisioane, dar tabelul de greșeli, „Dacă ascultai de Radar” și raportul nu spun. Tocmai „Grile prea dese” pierde aproape tot costul, pentru că îl fac comisioanele.

**Dovada:** Pe cei 2.203 boți futures reali:
- rezumat brut −2.895,39, net −5.918,43 (comisioane −2.846,31, funding −176,73);
- pe plus: 1.305 brut față de 1.243 net; 71 de boți sunt ≥0 brut și <0 net.
Costul greșelilor, brut → net:
- „grile-prea-dese” −175,33 → −1.488,90;
- „levier-peste-sigur” −717,31 → −2.477,05;
- „reintrare” −1.225,02 → −3.040,53;
- „funding-platit” −799,51 → −1.402,97.
Ordinea din tabel se schimbă: funding trece din fața levierului și a gridului des în spatele lor.
„Dacă ascultai de Radar” (19 judecați): „Dacă porneai doar pe 🟢 (8)” arată +2,34 USDT (verde), iar net e −4,62 USDT; „Ce ai făcut” −11,13 brut față de −27,16 net.

**Reparația propusă:** În JurnalTrade.unul se adaugă net = rezultat + comisioane + funding. Rezumatul greșelilor, Contrafactual.rezumat (și ce scrie colectorul în KV), cifra de pe fiecare bot, reguliPersonale și raportul de duminică folosesc net. Brutul rămâne doar în rândul de detaliu (grile/poziție/comisioane/funding).

verificator: **confirmat** — Am refăcut totul pe arhiva reală (v_c2.cjs), pe cei 2.203 boți futures. Brut −2.895,39, net −5.918,43, comisioane −2.846,31, funding −176,73. Pe plus sunt 1.305 brut față de 1.243 net, iar 71 de boți își schimbă semnul. Costul greșelilor, brut → net: grile-prea-dese −175,33 → −1.488,90; levier −717,31 → −2.477,05; reintrare −1.225,02 → −3.040,53; funding −799,51 → −1.402,97. Ordinea din tabel se schimbă. „Dacă ascultai de Radar” (19 judecați, 8 verzi): doar pe 🟢 dă +2,34 brut și −4,62 net; „ce ai făcut” dă −11,13 brut și −27,16 net. Atenuare: KPI-ul „Rezultat realizat” (app.js:5373) spune explicit „înainte de comisioane și funding”, iar lista arată comisioanele și fundingul pe fiecare bot. Tabelul de greșeli (jurnal-trade.js:94), cireașa (contrafactual.js:44-51, afișată verde „+2,34”) și raportul de duminică nu spun că sunt brute. Omul decide după o cifră verde care, net, e pierdere. Rămâne serios.

### 🔵 La 24% dintre boții futures, NET-ul socotit nu bate cu banii primiți înapoi; explicația din cod nu ține
`C:\Users\Cimin\crypto\public\lib\t212.js:124 (formula NET), comentariul din jurnal-trade.js:39-44` · lentila: bani / Pionex

Codul (v100.23/26) socotește NET = totalRealizedProfit + totalFee + totalFundingFee. Comentariul spune că banii primiți înapoi o confirmă „la cent pe 1784 din 2184 (restul: poziție rămasă la stop)”. Pe arhiva de azi, 517 din 2.187 de boți nu se potrivesc. 440 dintre ei au primit înapoi MAI MULȚI bani decât spune NET-ul, ceea ce o poziție rămasă nu poate explica. Pe total diferența e mică, dar pe un bot semnul se poate întoarce. Declarația, statistica și CSV-ul folosesc NET-ul socotit.

**Dovada:** Pentru fiecare bot am comparat bani primiți − pus (unlockQuoteAmount − (quoteInvestment + extraMargin − profitExited)) cu NET-ul:
- 2025: 153 de boți au primit mai mult (+44,49), 7 mai puțin (−0,37), 314 la cent; NET-ul aplicației −562,99, banii −518,82;
- 2026: 287 mai mult (+167,72), 70 mai puțin (−112,47), 1.356 la cent; NET −3.652,83, banii −3.597,56.
Exemple:
- botul 509 LIGHT (01.01.2026, ținut 110 s): NET +27,05, dar a primit 46,70 pe 55,15 puși, adică −8,45;
- botul 2112 ZKC: +11,82 în plus față de NET;
- botul 2374 COTI: +0,74.
Dintre nepotriviri, 300 n-au nici marjă adăugată, nici profit retras.

**Reparația propusă:** Pe o mână de boți nepotriviți (509, 251, 2374, 2112) se lămurește în Pionex (istoricul botului) care cifră e banii reali. Până atunci, în Jurnal și în Declarație se arată și „banii primiți − pus”, cu semn ⚠️ pe boții unde diferența trece de 0,05 USDT și numărul lor spus pe față. Comentariul cu „1784 din 2184” se corectează.

verificator: **coborat** — Nepotrivirea există: pe arhiva de acum (v_c3.cjs) 522 din 2.187 de boți nu bat la cent (442 cu mai mulți bani, 80 cu mai puțini). Afirmația că „explicația din cod nu ține” e însă infirmată de date (v_c3b.cjs). 484 din cele 522 de nepotriviri au baseAmount ≠ 0, adică o poziție rămasă la închidere. Poziția rămasă e închisă la piață și poate ieși pe plus sau pe minus, deci poate explica foarte bine și „mai mulți bani”; argumentul constatării e greșit. Exemplele: 2374 COTI are baseAmount 5539, 2112 ZKC are 9704, 509 LIGHT are −18. Printre boții fără poziție rămasă sunt doar 38 de nepotriviri, cu suma −1,97 USDT, neglijabilă. Ce rămâne real: Declarația folosește NET-ul socotit în locul banilor primiți (unlockQuoteAmount − pus), deși pentru boții cu poziție rămasă banii sunt cifra adevărată. Diferența e de +55 USDT pe 2026 (−3.652,83 față de −3.597,56), cam 1,5%, și merge spre o pierdere declarată mai mare. Pe un singur bot poate ajunge mare (LIGHT: +27,05 față de −8,45). Reparația e ieftină: banii primiți, când unlockQuoteAmount există.

### 🟡 În CSV-ul contabilului, cost_lei și încasat_lei nu se leagă cu rezultatul la multe vânzări T212
`C:\Users\Cimin\crypto\public\lib\t212.js:121-122, 163 (rândul din csvDeclaratie); sursa în perechi(), 77-81` · lentila: bani / CSV contabil

Coloanele cost_lei și încasat_lei vin din potrivirea FIFO pe loturi. Coloana rezultat vine din realisedProfitLoss al T212 (preț mediu ponderat) minus comisioanele. La vânzările din poziții cumpărate în mai multe tranșe, cele două metode dau cifre diferite. Contabilul vede pe același rând încasat − cost ≠ rezultat, uneori cu semn opus.

**Dovada:** CSV-ul generat de codul aplicației pe istoricul real:
- 2026: 26 din 278 de rânduri au încasat − cost ≠ rezultat; suma diferențelor −182,37 lei;
- 2025: 230 din 788.
Exemple:
- PLTR 2026-03-12: cost 5.467,44, încasat 5.394,47 (adică −72,97), dar rezultat +91,11;
- IDCC 2026-06-11: două rânduri cu ±90,38;
- ALTOOp 04.11.2025: încasat 484,52 față de cost 494,33 (−9,81), rezultat +8,90.

**Reparația propusă:** Pe rândurile cu rezultat oficial, cost_lei se scrie ca încasat − rezultat (costul după prețul mediu, ca T212), sau se adaugă coloana metoda (preț mediu T212 / FIFO) și rezultat_fifo alături. În antet se spune care metodă dă totalul. Metoda legală o confirmă contabilul.

verificator: **confirmat** — Codul confirmă (t212.js:74-78): cost și încasat vin din FIFO pe loturi, iar rezultat = realisedProfitLoss al T212 × parte − comisioane, când există cifra oficială. raportAnual (t212.js:121-122) le pune pe același rând, iar csvDeclaratie (t212.js:163) le scrie. Am refăcut pe istoricul real din KV (GET /api/t212?action=istoric, 2.421 de umpleri, fără nicio cerere la T212; v_c4.mjs). În 2026, 28 din 278 de rânduri au încasat − cost ≠ rezultat, cu suma diferențelor −182,36 lei, 2 dintre ele cu semn opus. Exemple: IDCC 2026-06-11 are 8.174,17 → 8.195,62 (+21,45) cu rezultat −68,93; PLTR 2026-06-05 are o diferență de −69,99 față de −102,88. În 2025, 242 din 788 de rânduri nu se leagă, 23 cu semn opus. Totalul folosește rezultatul oficial, deci cifra finală e coerentă, dar rândurile se contrazic sub ochii contabilului.

### 🔵 CSV-urile nu neutralizează formulele (=, +, -, @); numele semnalului smart copy intră direct
`C:\Users\Cimin\crypto\public\lib\t212.js:147, 159 (+ statistica-trade.js:282, jurnal-trade.js:120)` · lentila: securitate / CSV

q() din csvDeclaratie / csvPionex / StatisticaTrade.csv pune doar ghilimele la ; " și rând nou. Ghilimelele nu opresc Excel să execute o formulă. La smart copy, coloana instrument/eticheta e signalName (numele semnalului copiat, ales de altcineva pe Pionex), trecut cu majuscule, până la 40 de caractere. Un nume ca =HYPERLINK(...) ajunge ca formulă în Excelul contabilului.

**Dovada:** Am rulat scratchpad/inj.cjs pe modulele paginii, cu un bot smart_copy cu signalName =HYPERLINK("http://x.io/?"&A2,"ok"). csvDeclaratie scoate: Pionex;smart copy;2026-09-21;"=HYPERLINK(""HTTP://X.IO/?""&A2,""OK"")";;;;1,50;USDT;;; iar StatisticaTrade.csv la fel, în coloana eticheta. Numele de semnal reale de acum sunt nevinovate (beat, SOLANA, DUSK, XRP…). Riscul stă în sursă, nu în datele de azi.

**Reparația propusă:** În toate trei funcțiile q(): dacă textul începe cu = + - @ TAB sau CR, se pune un apostrof în față; apoi regula de ghilimele de acum. Numerele trec prin n(), nu prin q(), deci nu se strică.

verificator: **coborat** — Codul confirmă: q() din csvPionex/csvDeclaratie (t212.js:147, 159) pune ghilimele doar la ;"\n, iar StatisticaTrade.csv (statistica-trade.js:282) doar la ;",\n. Niciunul nu prefixează =+-@. Eticheta smart copy e String(d.signalName).toUpperCase() (jurnal-trade.js:117). Riscul e totuși mic. Trebuie ca un autor de semnal de pe Pionex să-și pună un nume-formulă, ca Marius să-l copieze, să exporte CSV-ul și ca Excelul să execute la deschidere; HYPERLINK mai cere și un clic, iar DDE e oprit implicit în Excelul modern. Nu am verificat dacă Pionex primește astfel de nume de semnal. Semnalele reale de acum sunt nevinovate (constatarea o spune singură). E întărire defensivă, nu un risc prezent.

### 🟡 Dividendele devin tăcut 0,00 lei în Declarație și în CSV când citirea lor pică
`C:\Users\Cimin\crypto\public\lib\t212-ecran.js:32 (și 541; ruta: functions/api/t212.js:257-266)` · lentila: bani / Declarație

La încărcare, dacă /api/t212?action=dividende pică (429 de la T212, rețea), catch-ul pune doar t212.dividende = null. t212.dividendeItems rămâne nedefinit, raportAnual primește [] și Declarația arată „Dividende încasate în AAAA: +0,00 lei”. Același 0 intră în „Copiază pentru contabil” și în rândul TOTAL al CSV-ului. Lipsa ajunge 0, contra regulii din cod („Lipsa rămâne lipsă, nu 0”). Pe server, o singură pagină picată din cele până la 20 aruncă tot rezultatul, iar sumele nu sunt verificate pe monedă.

**Dovada:** Drumul din cod: catch (e) { t212.dividende = null; }, fără nimic pe dividendeItems. Apoi t212RaportDecl → T212.raportAnual({dividende: t212.dividendeItems || []}), unde t.dividende pleacă de la 0. t212DeclaratieBloc afișează L(t.dividende), iar csvDeclaratie scrie „TOTAL Trading 212 dividende;…;0,00”. N-am chemat ruta de dividende (limita T212), deci n-am văzut o eroare reală.

**Reparația propusă:** În catch se pune t212.dividendeItems = null. raportAnual ține dividende = null când lista lipsește, iar blocul, textul copiat și CSV-ul scriu „dividendele nu s-au putut citi”, nu 0. Pe server se întoarce ce s-a strâns plus incomplet: true în loc de eroare totală, și se verifică moneda (currency) la însumare.

verificator: **confirmat** — Codul confirmă drumul. t212-ecran.js:32 pune în catch doar t212.dividende = null și lasă dividendeItems nedefinit. t212-ecran.js:541 trimite dividendeItems || [], iar raportAnual (t212.js:118) pornește t.dividende de la 0. t212DeclaratieBloc (t212-ecran.js:559) afișează L(t.dividende) fără nicio verificare a lipsei, apoi csvDeclaratie scrie „TOTAL Trading 212 dividende;…0,00”. Nu există gardă și nici mesaj că lipsesc, iar în cod nu am găsit nicio reîncercare. Colectorul are deja probleme de limită T212, deci un eșec e plauzibil. Nici eu n-am chemat ruta de dividende (limita T212), așa că nu am văzut o eroare reală. Atenuare: dacă o încărcare anterioară a reușit, dividendeItems rămâne cel vechi, deci cifra e veche, nu 0. La prima încărcare picată iese însă 0 pe hârtia pentru Declarație.

### 🔵 „Toată istoria Pionex” nu e dovedită: 137 de id-uri de boți lipsesc din arhivă
`C:\Users\Cimin\crypto\scripts\lib\tura-arhiva-boti.mjs:26-33` · lentila: bani / arhiva Pionex

Arhiva e marcată completă, iar Statistica și Declarația spun „toată istoria Pionex”. Id-urile de strategie sunt ale contului, consecutive (1…2393), dar lipsesc 137, în grupuri compacte. Pot fi boți anulați înainte de pornire, fără bani, dar pot fi și boți cu altă stare decât finished, pe care status=finished nu-i dă. Aplicația nu verifică și nu spune.

**Dovada:** arhiva.json (GET action=botiInchisi): 2.256 de boți, id min 1, max 2393, fără dubluri, dar 137 lipsă. Exemple: 610–637 (26 de id-uri, pornite între 07.01 și 18.01.2026; în arhivă 609 e închis pe 07.01, iar 638 pornit pe 18.01), 1342–1389, 1401–1426, 1467–1490 (24), 1665–1678, 1858–1868. După 1868 nu lipsește niciunul. Tot în perioada 07–13.01 e și un gol de 140 de ore fără nicio închidere.

**Reparația propusă:** O singură dată, pe 2–3 id-uri lipsă, se verifică ce a fost botul (în aplicația Pionex sau cu status=canceled pe ruta brut). Dacă au bani, colectorul strânge și acea stare. În nota Statisticii/Declarației se spune „N id-uri fără bot în istoria Pionex”, nu „toată istoria”.

verificator: **coborat** — Golurile se confirmă (v_c2.cjs): arhiva are 2.256 de boți, complet=true, id maxim 2393, 137 de id-uri lipsă. Nu găsesc însă un defect al aplicației. În data/colector.log, trecerea completă a mers 226 de pagini și a strâns 2.253 de boți, adică paginile au fost pline până la capăt, deci Pionex nu a dat acele id-uri pe status=finished. strangeBoti (tura-arhiva-boti.mjs:26-33) urmează cursorul fără să sară pagini. compactBot aruncă doar boții fără createTime sau closeTime. Arhiva conține deja și spot_grid, și smart_copy. Id-urile lipsă pot fi boți anulați fără bani, alte produse sau alte stări; constatarea nu dovedește că sunt boți cu bani. E un caz de „nu s-a dovedit”: merită o notă în pagină (sau o probă pe alte stări), nu un defect serios.

### 🟡 „Dacă ascultai de Radar” vede doar prima pagină Pionex și reîncearcă la nesfârșit monedele cu alt ticker
`C:\Users\Cimin\crypto\scripts\colector.mjs:459 (+ scripts/lib/tura-contrafactual.mjs:10; textul în app.js:5361)` · lentila: bani / contrafactual

turaCf cere doar prima pagină (10 boți), deci din toată istoria au fost judecați 19 boți. Boții închiși în rafale de peste 10 între ture nu mai sunt judecați niciodată. Tura construiește tickerul ca moneda + "_USDT_PERP", așa că PUMPFUN (tickerul Pionex e PUMP_USDT_PERP, v100.13) și LIGHTER pică. Eșecul nu se ține minte, deci bot cu bot se reîncearcă în fiecare oră și ocupă locurile din max 5. Pagina scrie că se socotește „pentru fiecare bot închis (câte 5 pe oră)”.

**Dovada:** cf.json din KV: 19 chei (2372–2393), din 2.203 boți futures. Boții 2388, 2389 (PUMPFUN) și 2390 (LIGHTER) sunt nejudecați. În data/colector.log sunt 91 de rânduri „contrafactual … symbol error” din 29.09 09:56 până în 30.09 15:12, adică la fiecare oră.

**Reparația propusă:** cereBoti să ia arhiva de acasă plus prima pagină. Tickerul să vină din simbolPionex / harta de simboluri, cum face bot-orders. Eșecurile se țin minte cu o numărătoare și o pauză, ca să nu ia locul celorlalți. Textul de pe pagină spune câți sunt judecați din total.

verificator: **confirmat** — Codul confirmă. colector.mjs:459 cere o singură pagină (limit e ignorat de Pionex, bot-orders.js:46). tura-contrafactual.mjs:10 face tickerul ca t.moneda + "_USDT_PERP", fără harta baseCurrency din v100.13. Eșecul doar se scrie în jurnal (linia 28), nu se ține minte, iar deFacut (linia 8) reia aceiași primi 5 boți nejudecați. Date reale: cf din KV are 19 chei (2372–2393, fără 2388–2390), din 2.203 boți futures. În data/colector.log sunt 105 rânduri „contrafactual”, iar cele mai noi (30.09 15:12 și 16:16) spun „PUMPFUN symbol error” / „LIGHTER symbol error” la fiecare oră. Cei 3 boți care pică ocupă 3 din 5 locuri pe tură, iar cireașa se sprijină pe o mostră de 19 boți, deși arhiva completă e în KV. Pagina promite „pentru fiecare bot închis”.

### 🔵 Două vânzări T212 fără cumpărare în istoric lipsesc tăcut din Declarația 2025
`C:\Users\Cimin\crypto\public\lib\t212.js:74, 116-117` · lentila: bani / Declarație

perechi() pune vânzările fără lot de cumpărare în faraCumparare, iar raportAnual nu le vede. Rezultatul lor oficial T212 e totuși cunoscut (realizat), dar nu apare nicăieri în Declarație sau în CSV, și nici nu se spune că lipsesc.

**Dovada:** Pe istoricul real, faraCumparare are două vânzări: PLTR, 1 buc., 05.11.2025, realizat −1,13 lei; HUIl, 210 buc., 06.11.2025, realizat −2,41 lei. Declarația 2025 are 788 de vânzări, fără ele.

**Reparația propusă:** Vânzările fără cumpărare intră în Declarație cu realizat − comisionul vânzării și un semn „cumpărarea nu e în istoric”, sau măcar se numără pe față.

### 🔵 Anul vânzării T212 se ia după UTC, iar al boților Pionex după ora României
`C:\Users\Cimin\crypto\public\lib\t212.js:114` · lentila: bani / Declarație

aniDin() folosește getUTCFullYear pentru vânzările și dividendele T212, dar coloana data din CSV e ziRo (ora României). O vânzare în afara orelor pe 31.12 după 22:00 UTC ar fi numărată în anul vechi, cu data de 1 ianuarie a anului nou pe rând. Boții Pionex folosesc deja ora României.

**Dovada:** Codul: function aniDin(t) { var y = new Date(t).getUTCFullYear(); … }, spre deosebire de ramura boților: var zi = ziRo(x.inchis), y = Number(zi.slice(0, 4)). Pe datele de acum sunt 0 vânzări cu an UTC ≠ an RO, dar 1.494 din 2.421 de umpleri sunt în afara orelor, deci cazul poate apărea.

**Reparația propusă:** aniDin să folosească Number(ziRo(t).slice(0, 4)), ca la Pionex.

### 🔵 CSV-ul Statisticii scrie numerele nerotunjite și uneori cu exponent
`C:\Users\Cimin\crypto\public\lib\statistica-trade.js:283, 288` · lentila: format CSV

n() din StatisticaTrade.csv rotunjește doar când i se dă z. Baza, rezultatul și comisioanele ies cu toate zecimalele din virgulă mobilă, iar numerele mici ies cu exponent.

**Dovada:** Pe arhiva reală (stat.csv), primul rând: 2025-12-21 13:10;FOLKS;…;49,279999999999994;6,320301296727158;0,1283;0,28875576;long;50. Botul 1871 LINK: 0,00136999466;0,0000012217815;0,0009;3,082185e-7.

**Reparația propusă:** n(b, 2), n(rz, 4) și n(x.comisioane, 4), cu toFixed, fără exponent.

### 🔵 „Copiază pentru contabil” folosește minusul tipografic (U+2212), pe care Excelul nu-l ia drept număr
`C:\Users\Cimin\crypto\public\lib\t212.js:135-138` · lentila: format / copiere

Textul copiat folosește L() cu „−” (U+2212). Contabilul care lipește suma în Excel primește text, nu număr negativ. În CSV e folosit corect „-”.

**Dovada:** Textul generat pe 2026: „NET −1208,56 lei”, „NET −5169.75 USDT ≈ −22886,79 lei”, cu U+2212. În același text Pionex în USDT e cu punct zecimal (−5169.75), iar restul cu virgulă.

**Reparația propusă:** În textul pentru contabil, „-” ASCII și virgulă zecimală peste tot (și la USDT).

### 🔵 Jurnalul dă lui levierSigur numărul de LINII ca și cum ar fi intervale (v100.38 n-a ajuns aici)
`C:\Users\Cimin\crypto\public\lib\jurnal-trade.js:73` · lentila: grid / v100.38

pasNet din jurnal folosește deja N − 1, dar levierSigur(…, Math.min(150, t.grileN)) primește row (linii), iar niveluri() îl tratează ca N intervale (N + 1 niveluri).

**Dovada:** grid-calcul.js:155-157: niveluri(jos, sus, N) face N intervale. Am măsurat pe 2.141 de boți reali verdictul „levier peste sigur” cu N și cu N − 1: 0 diferențe. Deci e doar o nepotrivire de sens, fără efect acum.

**Reparația propusă:** Math.min(150, t.grileN - 1), pentru consecvență cu v100.38.

**Ce a probat:** Totul doar în citire. Prin serverul local 127.0.0.1:8788, cu tokenul din .dev.vars, am luat:
- /api/istoric-bot?action=botiInchisi (2.256 de boți, completă, forma 3);
- /api/curs-bnr?an=2025 și an=2026 (187 de zile în 2026, ultima 30.09 = 4,6474);
- /api/t212?action=istoric (2.421 de umpleri);
- action=contrafactual și action=raport.
Toate sunt citiri din KV și cache; la Pionex/T212 nu s-a dus nicio cerere, cu excepția fișierului BNR, dacă nu era deja în memorie.

Am rulat în Node exact modulele paginii (grid-calcul, jurnal-trade, t212, statistica-trade, contrafactual) pe aceste date, iar scripturile sunt în scratchpad: rap.cjs, sapt.cjs, st.cjs, t2.cjs, inj.cjs, lev.cjs, fara.cjs.

Refăcut independent în Python (mana.py), cu fus Europe/Bucharest și cursul BNR „ultima zi ≤ ziua închiderii”, pe 2025 și 2026:
- Pionex 2025: 486 de boți, −838,9138 USDT, −3.631,4771 lei;
- Pionex 2026: 1.770 de boți, −5.169,7493 USDT, −22.886,7899 lei. Identic cu aplicația.

Verificat de mână pe boți:
- 2393 CRV: 1,5531 − 0,114152 = 1,4389 USDT; × 4,6474 = 6,69 lei; banii primiți o confirmă la cent.
- 251 LIGHT: −127,926 USDT la cursul din 24.12.2025 (4,314) = −551,87 lei.
- 915 smart copy: curs din 23.01 pentru 25.01.
- 1 spot: curs din 19.12 pentru 21.12.
- 1–4 ianuarie 2026 iau cursul din 31.12.2025 (fără anul trecut ar fi 83 de boți fără curs).

Am mai verificat:
- identitatea bani primiți = pus + NET pe toți cei 2.187 de boți futures;
- relația usdtInvestment = quoteInvestment + extraMargin (2.144 din 2.203);
- id-urile lipsă din arhivă;
- raportul de duminică, refăcut exact (−18,394);
- „Dacă țineai măcar o oră” (1.481 de trade-uri sub o oră: −2.068,78; 775 peste: −3.939,89);
- rezultatul T212 pe 617 perechi simple (612 la leu);
- concordanța cost/încasat/rezultat pe fiecare rând al CSV-ului;
- sumele rândurilor față de TOTAL (diferențe de cenți);
- BOM-ul și separatorul CSV;
- injecția de formule, cu un bot fabricat;
- efectul liniilor față de intervale pe levierSigur.

**Ce NU a probat:** - N-am deschis pagina în Chrome/CDP: încărcarea ar fi pornit multe cereri T212/Pionex. Cifrele vin din aceleași module rulate în Node, nu din ecranul randat, deci n-am văzut vizual blocul Declarației, butoanele de an sau toast-urile.
- N-am chemat /api/t212?action=dividende (limita T212): nu știu dacă are dividende, în ce monedă vin și dacă suma e netă sau brută. Constatarea cu dividendele e dovedită doar pe drumul din cod.
- N-am verificat ordinea în care Pionex dă paginile de boți închiși (după pornire sau după închidere). Dacă e după pornire, tura incrementală a arhivei („se oprește la prima pagină cu un bot știut”) ar rata un bot vechi închis târziu. Pe datele de acum ordinea după id și cea după închidere coincid, deci n-am putut decide fără cereri noi la Pionex.
- N-am lămurit ce sunt cele 137 de id-uri lipsă, nici cauza celor 517 nepotriviri NET / bani primiți: ar trebui istoricul botului în Pionex.
- N-am verificat regula fiscală: curs zilnic BNR, curs mediu anual (2026 ≈ 4,4644, adică −23.079,98 lei în loc de −22.886,79) sau ziua precedentă, preț mediu ponderat față de FIFO, dacă schimburile crypto→USDT sunt eveniment impozabil. Asta e treaba contabilului.
- N-am testat worker-ul paznic-radar sau pagina alerts din premarket_scanner pe cifrele de bani, nici statistica „Tot, în lei” pe ecran (am citit doar că convertește tot USDT-ul la cursul ultimei tranzacții T212, ceea ce e spus pe față).
- N-am rulat suita de teste a depozitului.

## Colectorul și alertele

Am auditat colectorul (scripts/colector.mjs v101.19, scripts/lib/*.mjs), alertele (public/lib/alerte.js, canal-discord.mjs, turele piață/scan/t212/idei/dimineață/arhivă/contrafactual) și worker-ul paznic. Dovezile vin din data/colector.log (3.807 linii, 24–30.09), din data/alerte-stare.json, din KV-ul local (doar GET), din arhiva celor 2.256 de boți închiși și din reluarea funcțiilor pe date reale. Reparațiile din 28.09 țin: au fost 0 limitări T212 după 28.09 04:48 UTC (înainte 99), poza pleacă la 2 min (699/zi pe 28.09, sub cota de 1.000 a KV-ului), copiile KV trec integrity_check, iar memoria colectorului e stabilă la 114 MB. Am găsit o cifră greșită pe care omul decide: raportul de duminică numără doar ultimii 10 boți. Pe 27.09 a spus „10 boți, −18,39 USDT, 50 % pe plus”, iar arhiva dă „26 de boți, +24,51 USDT, 77 % pe plus”. Mai sunt 8 probleme serioase: alerta „mută gridul” n-a primit regula v100.38 (liniile Pionex), Yahoo rămâne mort până la repornire după un 401, poza arată boți vechi drept proaspeți, un eșec pe Discord e trecut ca trimis, alertele critice vin dublate în fiecare oră, cheia zilnică e pe ziua UTC (rafală la 03:03 ora României), ritmurile zilnice se pierd la repornire și contrafactualul folosește tickerul greșit. Plus 4 sugestii.

### 🔴 Raportul de duminică vede doar ultimii 10 boți închiși: 27.09 a spus −18,39 USDT în loc de +24,51 USDT
`scripts/colector.mjs:814 (și 459)` · lentila: alerte / cifre pe care decide

turaRaport cere /api/bot-orders?status=finished&limit=100, dar Pionex dă istoria pe pagini de 10 și ignoră limit (comentariul din functions/api/bot-orders.js:46). Raportul săptămânii, cu procentul pe plus, cu greșeala cea mai scumpă și cu „Regula săptămânii”, se face deci pe un eșantion de 10 boți. Arhiva completă (action=botiInchisi, strânsă din 30.09) există și e deja folosită pentru subOOra, dar nu aici. Aceeași limită de 10 afectează și turaCf (colector.mjs:459): dacă se închid peste 10 boți între două ture orare, cei mai vechi nu mai primesc niciodată verdictul „Dacă ascultai”. Raportul următor (04.10) iese la fel de greșit.

**Dovada:** Raportul trimis în KV (GET action=raport): „Săptămâna: 10 boți închiși, total −18.39 USDT, 5 pe plus (50%). Din grile +31.46…”. Am rulat Obiceiuri.raportDuminica pe arhivă (JurnalTrade.din pe 2.256 de boți, acum=1790528431721, același moment): „26 boți închiși, total +24.51 USDT, 20 pe plus (77%). Din grile +71.75 USDT, din poziție −47.23, comisioane și funding −16.03”. Tăiat la cei mai noi 10, reproduce exact raportul trimis (10 boți, −18,39, 5 pe plus, grile +31,46, comisioane −8,17). Pe săptămâni (arhivă): 24 de boți închiși în săptămâna 21.09, 135 în săptămâna 31.08.

**Reparația propusă:** În turaRaport și turaCf, trades să vină din GET /api/istoric-bot?action=botiInchisi (JurnalTrade.din(a.boti)), ca la subOOra. Plus o probă: raportul pe arhivă față de raportul pe 10, pe momentul din 27.09.

### 🟡 „Mută gridul” pe Discord (și în panoul Tabloului) dă numărul de INTERVALE, nu liniile de scris în Pionex
`public/lib/alerte.js:189` · lentila: v100.38 peste tot

v100.38 a stabilit regula: în Pionex se scrie N+1. Tabloul, fișa și propunerea de mutare au primit +1. Mesajul de alertă din alerte.js:189 scrie însă sm.muta.setare.grile, adică N intervale. Același obiect setare apare în Tablou ca „N+1 geometric” (app.js:5718). Pe același grid, Discord și Tablou dau deci numere diferite. Cine copiază de pe telefon pune o linie mai puțin, adică un interval mai puțin și un pas mai mare. Riscul e atenuat de fraza „Setările de copiat sunt în Tablou”. Același rest a rămas și în alte locuri: scan-ecran.js:230 „Grile · pas” arată x.grile din GridClasament (intervale: grid-clasament.js:35–36 folosește 1/grile ca exponent), iar app.js:5408 scrie „platoul probei alesese X grile” și „f.deasa.setare.grile + ' grile'” fără +1.

**Dovada:** Alerta din KV (GET action=alerte), 30.09 14:02:26 UTC, colectorul v101.19 pornit la 12:59:56 UTC, după commitul d423f81 de la 12:59:42 UTC: „CRV: mută gridul — … Gridul propus acum: 0.36989 – 0.41641, 5 grile, 5×”. Pentru aceeași setare, Tabloul (app.js:5718) afișează (s.grile+1) = 6.

**Reparația propusă:** alerte.js:189: (sm.muta.setare.grile + 1) + " linii în Pionex (" + sm.muta.setare.grile + " intervale)". La fel în scan-ecran.js:230 (sau eticheta „intervale”) și în app.js:5408. Proba v10038 să caute și textul alertei.

### 🟡 Crumb-ul Yahoo nu se reîmprospătează la 401: insiderii, rezultatele și analiștii mor până la repornire (cel mult 24 h)
`scripts/lib/yahoo-extra.mjs:15, 23, 50–52` · lentila: fiabilitate surse externe

iaCrumb reia crumb-ul doar dacă lipsește sau a trecut o zi. Când Yahoo îl invalidează, json() aruncă „Yahoo HTTP 401”, iar crumb-ul rămâne cel stricat. Pe măsură ce expiră cache-ul de 6 h, fiecare simbol (și fiecare poziție T212) iese cu extra=null. Pagina alerts spune atunci „vine cu poza următoare” la nesfârșit, iar alerta „cumpărare de insider” rămâne oarbă. În plus, la eroare se aruncă și cache-ul vechi în loc să fie întors marcat ca vechi.

**Dovada:** În data/colector.log: 70 × „Yahoo HTTP 401” între 30.09 06:41 și 07:07 UTC (10–12 simboluri la fiecare poză, inclusiv „poza: extra t212 AVGO/APLD/NWSA/MPC”). S-au oprit la 07:07:35, exact la repornirea colectorului (PID 17752), care a luat alt crumb. Fără repornire, eroarea ar fi ținut până la crumbLa + 24 h.

**Reparația propusă:** În json() (sau în extra()), la 401/403: crumb=null, iaCrumb() și o singură reîncercare. La eroare, întoarce cache-ul vechi cu vârsta lui în loc de null.

### 🟡 Când Pionex nu dă lista boților, poza urcă boții vechi ștampilați „acum”
`scripts/colector.mjs:269–283, 288, 624, 673` · lentila: eroare parțială / poza

tura() iese devreme la eroarea /api/bot-orders, înainte de ultimiiBoti = boti. turaPoza merge oricum și construiește boții din lista veche cu la: Date.now(). Pagina alerts arată „poza de acum 0 min” cu lichidarea, totalul și „% în grid” din ultima citire bună. Un bot închis sau lichidat în timpul căderii apare mai departe ca activ. Pagina nu folosește b.la, iar poza nu are un câmp de eroare pentru boți (cum are t212Eroare). Același lucru la simboluri: dacă /simboluri pică, poza pleacă cu simboluri:[] fără niciun semn.

**Dovada:** Căderi reale în jurnal: 25.09 17:35–17:47 (13 min, 502 „data.results nu e o lista”), 26.09 04:38–04:40 (500), 29.09 12:53 (403). Cod: botiPentruPoza pune „la: Date.now()” (624). premarket_scanner/lib/radar-ecran.js:201,203 afișează lichidarePct, total și inGrid din poză fără vreo vârstă a botului.

**Reparația propusă:** Ține ultimiiBotiLa (ora ultimei citiri bune) și pune-o în botPoza ca „la”. Adaugă în poză botiEroare/botiLa (ca t212Eroare/t212La), iar pagina să arate chip-ul „boții de la HH:MM”. La simboluri, dacă /simboluri pică, păstrează lista trecută.

### 🟡 O alertă picată pe Discord e trecută ca trimisă, fără nicio reîncercare. Un webhook mort înseamnă tăcere totală
`scripts/colector.mjs:146–156 (și tura-scan.mjs:102,106)` · lentila: dedupe / alerte pierdute

trimiteAlerta întoarce inKv || ok. KV-ul e local (wrangler) și nu pică practic niciodată, așa că rezultatul Discord nu contează pentru dedupe. Un 429 (webhook-ul permite ~5 cereri / 2 s), o cădere de internet sau un 5xx pierde definitiv alertele de o singură dată: pereche încheiată, fișa de închidere, „bot nou pe o monedă unde pierzi”, cele o dată pe zi (SL/TP, insider, T212 plan/concentrare) și rețetele din Scan (acolo nici nu se verifică rezultatul). Criticele revin abia după o oră. Dacă webhook-ul e revocat, și paznicul tace: el păzește doar poza.

**Dovada:** Cod: „if (CANAL === "discord") { const ok = await trimiteDiscord(...); return inKv || ok; }”. Jurnal: 0 × „discord EȘEC” în 6 zile (riscul e latent, nu s-a întâmplat încă). Rafale reale: 30.09 00:03:15–00:03:21, 5 mesaje în 6 s; 30.09 11:51:57–58, 3 mesaje într-o secundă.

**Reparația propusă:** Pe canalul discord, „trimis” = Discord 2xx. Mesajele picate intră într-o coadă pe disc (data/discord-coada.json), reîncercată la tura următoare cu pauză de 400 ms între mesaje. Numărul de eșecuri consecutive intră în poză (canalMort), ca pagina alerts și paznicul să-l poată arăta.

### 🟡 Același fapt vine pe două alerte critice, repetate din oră în oră (JTO: 18 critice într-o zi pentru „pierderea a atins pragul”)
`public/lib/alerte.js:84, 187, 12` · lentila: spam / anti-zgomot

Când planul pe minus e atins, pleacă și „planul tău — ieși” (cheia plan, alerte.js:84), și „semaforul zice IEȘI — planul tău: pierderea a atins pragul” (cheia s-iesi, alerte.js:187). Ambele sunt critice, iar criticul se repetă la o oră (REPETA_MS). Codul are deja precedentul „spus o singură dată” (linia 236 amuță plan-stop cât vorbește opritorul), dar nu și aici. Pe lângă asta, marginea gridului a clipit pe 28.09 de 21 de ori (11 × „a ieșit din grid”, 10 × „din nou în grid”). Regula din capul fișierului („altfel omul încetează să le mai citească”) e încălcată tocmai pe canalul critic.

**Dovada:** 28.09, jurnal: 36 de mesaje critice pe Discord. Perechi la 1–3 min distanță, din oră în oră: 03:27/03:30, 04:02/04:02, 05:07/05:09 … 12:11/12:11 („JTO: planul tău — ieși (pierderea a atins 14.9 USDT)” + „JTO: semaforul zice IEȘI — …”). Același tipar pe 30.09 14:23:12.266 / 14:23:12.736 la CRV. Pe 28.09 au plecat 185 de mesaje Discord în total.

**Reparația propusă:** s-iesi să tacă atunci când motivul lui e planul deja anunțat (cheia plan critică), ca la linia 236. Criticul „plan” să se repete la 3 h, nu la 1 h, cât nimic nu se agravează. La „grid”, stabilitatea de ieșire să fie 30 min în loc de 10.

### 🟡 Cheia „o dată pe zi” e pe ziua UTC: rafală zilnică la 03:03 ora României cu informație de ieri, pe bursa închisă
`scripts/lib/poza.mjs:208, 240 (și colector.mjs:504, 506, 515)` · lentila: dedupe / ora

Cheile de dedupe ale alertelor pe acțiuni folosesc new Date().toISOString().slice(0,10): sim-miscare, sltp-*, t212-conc, t212-injos, planurile T212. La 00:00 UTC (03:00 ora României) ziua se schimbă, iar la prima poză totul se retrimite, deși bursa e închisă și sesiunea e aceeași. „AAPL −2,7 % azi” la 03:03 e sesiunea din 29.09, deja anunțată la 19:19 UTC cu −2,3 %. „APLD −15 % de la maxim” vine critic la 03:03 în a treia noapte la rând.

**Dovada:** Jurnal 30.09: 00:03:15 critic „APLD: −15% de la maxim”, 00:03:18 „APLD e 22% din contul Trading 212”, 00:03:20 „AAPL: −2,7% azi, de 2,4× mișcarea lui obișnuită”, 00:03:20 „AVGO: la 1,8% de stopul din planul tău”, 00:03:21 „AAPL: a ajuns la intrarea sugerată ($329.40)”. Aceeași sesiune AAPL fusese anunțată pe 29.09 la 19:19:38 („−2,3% azi” și „intrarea sugerată ($330.52)”). Același critic APLD/AVGO a venit la 00:03 și pe 28 și 29.09.

**Reparația propusă:** La alertele pe acțiuni, cheia să poarte ziua bursei NY (ziNY din poza.mjs, deja scris). Criticele pe o condiție neschimbată să nu pornească în afara orelor de bursă (sau să aștepte ora 9 a României).

### 🟡 Fiecare repornire resetează ritmurile: laboratorul „o dată pe zi” a rulat de 5 ori pe 30.09 (44 de minute de cereri Pionex)
`scripts/colector.mjs:388, 403, 438, 451, 469, 525` · lentila: starea din memorie / limită de ritm

laboratorLa, clasamentLa, arhivaLa, cfLa, t212La și cfActLa trăiesc doar în memorie. După fiecare pornire, laboratorul pornește la 30 min (12 pagini × 20+ monede), clasamentul imediat (100 de cereri), iar lumânările 15M se reiau cu 6 pagini pe fiecare simbol. În zilele cu lansări (13 porniri pe 30.09, 12 pe 28.09) sarcina pe Pionex se înmulțește. RATE_LIMITED a apărut deja pe 24.09 (laborator) și pe 27.09 (clasament).

**Dovada:** Jurnalul „laborator: …”: 30.09 la 02:45, 03:58, 05:38 (492 s), 09:11 (567 s), 09:55 (490 s), 12:52 (554 s), 13:39 (529 s); 5 rulări cu 4.120 de ferestre = 2.632 s. 27.09 și 28.09: câte 7 rulări. Clasament: 29/zi pe 25.09 și 27.09 (așteptat 24). „pornit”: 13 pe 30.09.

**Reparația propusă:** Ține laboratorLa, clasamentLa și cfLa în meta() (alerte-stare.json, scris deja la fiecare tură) și citește-le la pornire. Laboratorul să pornească doar dacă ultima rulare e mai veche de 24 h.

### 🟡 Contrafactualul cere lumânări pe tickerul greșit (PUMPFUN/LIGHTER_USDT_PERP): eșuează din oră în oră și ocupă 3 din 5 locuri
`scripts/lib/tura-contrafactual.mjs:10` · lentila: ture care eșuează în buclă

turaContrafactual construiește simbolul ca t.moneda + "_USDT_PERP". Pentru boții a căror bază diferă de ticker (PUMPFUN.PERP → PUMP_USDT_PERP, LIGHTER → LIT_USDT_PERP, cum s-a reparat în v100.13 în restul colectorului) Pionex răspunde „symbol error”. Eșecul nu intră în gata, așa că se reîncearcă la fiecare oră și la fiecare pornire, și ocupă mereu primele locuri din max=5. Verdictul „Dacă ascultai de Radar” lipsește tocmai la LIGHTER −58,52 USDT. Același tipar e latent și în tura-piata.mjs:120 (socoteala alertelor de mișcare: x.sim + "_USDT_PERP").

**Dovada:** Jurnal: 96 de linii „contrafactual PUMPFUN|LIGHTER symbol error” între 29.09 09:56 și 30.09 (câte 3 pe oră din 30.09 00:22). În arhivă: PUMPFUN 29.09 +7,90 și +9,89, LIGHTER 29.09 −58,52, fără verdict.

**Reparația propusă:** Simbolul din tickerul real: TabloBot.simboluri(baza, quote, simbolPionex).pionex (simbolPionex vine în brut / în arhivă). Un eșec „symbol error” să primească verdictul {nivel:"fara-date"}, ca să nu se ceară la nesfârșit. Aceeași corectură în tura-piata.mjs:120.

### 🔵 COTIUSDT (și ONDOUSDT) din lista paginii alerts dă 2 × Yahoo 404 la fiecare poză, fără cache negativ
`scripts/lib/yahoo-extra.mjs:25–34, 50–59` · lentila: zgomot în jurnal / cereri inutile

closes() și extra() n-au cache negativ pentru 404, spre deosebire de bare(). Un simbol crypto pus în lista de acțiuni costă ~1.440 de cereri Yahoo pe zi și umple jurnalul. Rândul lui pe pagină rămâne gol.

**Dovada:** Lista /simboluri (GET cu PAZNIC_TOKEN): „1QZ.DE, APLD, AVGO, CIEN, COTIUSDT, CSCO, INTC, MIGA.MU, NFC.F, RHM.DE, WDC”, actualizată 30.09 08:25 UTC. Jurnal: 240 × „poza: inchideri COTIUSDT Yahoo HTTP 404” + 240 × „extra”, adică 12,6 % din tot jurnalul. Mai sunt 11+11 la ONDOUSDT.

**Reparația propusă:** La 404, cache negativ de 6 h și în closes()/extra(). Opțional, simbolurile *USDT să fie trimise pe Binance/Pionex sau refuzate la /simboluri cu un mesaj.

### 🔵 Lista de alerte din Radar (plafon 100) ține acum doar ~26 de ore
`functions/api/istoric-bot.js:` · lentila: istoric alerte

Cu ~90 de alerte pe zi (inclusiv „grilă atinsă”, care stă doar în Radar), plafonul de 100 din KV lasă sub o zi și jumătate de istoric. Alertele dintr-o noapte de weekend dispar din Radar până luni.

**Dovada:** GET action=alerte: 100 de alerte, cea mai veche 29.09 14:27:33 UTC, cea mai nouă 30.09 16:03:28 UTC. Componența: 35 atenție, 11 critice, 25 info, 13 perechi, 16 „grilă atinsă”.

**Reparația propusă:** Plafon pe zile (7 zile) în loc de număr, sau „grilă atinsă” ținută într-o listă separată, scurtă.

### 🔵 „Crypto: 🔴 MIȘCARE” (critic) clipește cu AMESTECAT la 1–2 ore
`public/lib/alerte.js:373–384` · lentila: anti-zgomot vreme

schimbareVreme confirmă o schimbare după 2 citiri la 10 min, dar nu are o durată minimă în stare. 26 de mesaje „Crypto:” în 4 zile, dintre care 8 critice.

**Dovada:** Jurnal 30.09: 11:15:47 MIȘCARE (critic), 12:28:30 AMESTECAT, 13:19:57 MIȘCARE (critic), 15:13:52 AMESTECAT. 28.09: 02:13 MIȘCARE → 03:15 LINIȘTE → 04:17 MIȘCARE.

**Reparația propusă:** După un anunț, ieșirea din MIȘCARE să ceară 60 min stabile (3–6 confirmări), sau o singură critică pe 6 h.

### 🔵 alerte-stare.json se scrie direct (neatomic) din 5 ture concurente. Un fișier stricat înseamnă că toate alertele se retrimit
`scripts/colector.mjs:171, 280, 380, 691, 841, 856` · lentila: starea pe disc

writeFileSync(STARE_FIS) e chemat din tura(), turaPoza, turaPiata, turaScan și din eroarea de citire. O pană de curent în timpul scrierii lasă un JSON trunchiat. La pornire, catch-ul dă stareAlerte = {}: se retrimit toate stările non-ok, rezumatul de dimineață, raportul de 3 h și alertele zilnice. În plus, cunoscuti și stările per bot nu se curăță niciodată (13 boți în 6 zile). turaRaport cere semnalele pentru toți cunoscuții.

**Dovada:** Fișierul are acum 12.527 B, cu 13 id-uri de boți, dintre care 12 inactivi în _colector.cunoscuti. Nu există copie de siguranță a lui (data/copii are doar KV-ul).

**Reparația propusă:** Scriere în .tmp + renameSync și o copie .bak la pornire. Stările boților inactivi mai vechi de 7 zile să fie scoase din cunoscuti/stareAlerte.

**Ce a probat:** 1) Jurnalul data/colector.log întreg (3.807 linii, 24.09 11:59 → 30.09 16:03 UTC), analizat cu 4 scripturi Python în scratchpad. Am numărat pe zile pozele, limitările T212, mesajele Discord, pornirile, clasamentul, laboratorul, scanul, ideile, dimineața, copia și contrafactualul, plus golurile din poză (unul singur, de 31 min pe 29.09 09:15, când colectorul a ieșit fiindcă serverul nu răspundea). 2) Lista alertelor: am comparat 40 de tipuri din cod cu jurnalul. N-au apărut niciodată: status, activ, s-aglomerare, m-btc, m-funding, vreme-bursa, corelație, funding-piață, mișcare neobișnuită (piață), frâna T212, sltp-sl/tp. Pentru „mișcare neobișnuită” am reluat funcția pe 500 de lumânări 1h LIT reale: ar fi pornit pe 30.09 la 03:00 (−15,3 % față de un prag de 13,9 %), dar botul LIGHTER era deja închis, deci logica e vie. vremeBursa stă „îngustă” (ndxE50 = 46), deci plauzibil. avertizariPornire pe arhivă: CRV 3/3 pe plus, deci corect că n-a avertizat. 3) KV local, doar GET: action=alerte (100, cea mai veche 29.09 14:27), action=raport, action=botiInchisi (2.256, completă). Raportul de duminică recalculat pe arhivă, față de varianta tăiată la 10. 4) Paznicul: /simboluri citit cu PAZNIC_TOKEN (11 simboluri, inclusiv COTIUSDT), GET /poza fără cheie → 401. Cotă KV: 699 de poze pe 28.09, 641 pe 29.09, 0 bătăi separate. 5) Memoria PID 14972: 113,8 MB, apoi 114,2 MB după 9 min (WS), CPU 40 s în 3 h 11 min. 6) data/alerte-stare.json citit și structurat. 7) Cele 6 copii KV (data/copii) copiate în scratchpad: integrity_check ok, 0 blob-uri lipsă. 8) Reparațiile din 28.09: T212 are 0 × 429 după 28.09 04:48, deci ține. prev la simboluri (prevSimbol) ține. Insider „nou” doar cu stare anterioară și sub 30 de zile ține (niciun insider fals după 27.09). Bătaia separată scoasă cât poza curge ține. Urmele .wrangler au scăzut de la 376 MB la ~15 MB. 9) v100.38: am căutat grile/row în alerte.js, semnale-bot.js, tablou-extra.js, scan-ecran.js, grid-clasament.js și app.js, și am verificat textul real al alertei CRV din KV.

**Ce NU a probat:** Canalul Discord real: am citit jurnalul și KV-ul, nu canalul. Worker-ul paznic pe Cloudflare: fără wrangler tail, deci n-am văzut dacă cronul de 10 min rulează și ce a trimis. Cota KV la nivel de cont: n-am putut citi numărătoarea reală; limita de 1.000/zi e pe cont, iar Busola are și ea un namespace KV (MASURAT), ale cărui scrieri nu le-am numărat. Nicio cerere spre Trading 212, deci turaT212 (scrie în jurnal doar când găsește ordine noi) și frâna „cumpărat în jos” n-au putut fi confirmate că rulează. N-am deschis pagina alerts sau Radarul în browser; efectul pe ecran al boților vechi l-am dedus din cod (radar-ecran.js:201,203). N-am rulat npm test și nici probele scripts/proba-*. Durata unei ture nu se vede în jurnal (nu se scrie), deci suprapunerea turelor am judecat-o din cod și din ritmul pozelor. Memoria: doar 2 măsurători în 9 minute, după 3 h de la pornire; o scurgere lentă pe zile nu e exclusă (cache-urile lumanari15/directii/pret30/ziCache nu se golesc pentru simbolurile vechi). Pierderea liniei de bază pentru insideri la repornire (ultimeleSimboluri) n-am putut-o provoca. n-am verificat alertele ActiuniSemnale.alertePlan (logica lor internă), nici matematica semaforului și a fișei.

## Securitate și server

Am auditat unghiul SECURITATE + funcțiile serverului: 16 rute functions/api, _shared (auth, pionex, poarta), _headers/CSP servit, sw.js, paznic/worker.mjs, workers/radar-monitor.js, lansatoarele .bat, .gitignore, istoria git întreagă (3.334 obiecte, 172 MB) și partea din suită care citește poza (premarket_scanner lib/radar-poza.js, lib/radar-ecran.js). Garanția doar-citire ține: singurele cereri semnate către Pionex sunt GET pe 3 căi fixe, iar T212 e numai GET. Toate rutele cu date răspund 401 fără token, CORS nu deschide nimic pentru alte origini, CSP e strict și se servește. În git nu e nicio valoare reală din .dev.vars. Găsirea principală e nouă (auditurile din 22.09 și 28.09 n-au prins-o): parola APP_API_TOKEN are 10 caractere și forma „4 cifre + cuvânt de 5 litere cu majusculă + 1 simbol”. Exact aceeași parolă e acceptată de site-ul PUBLIC crypto-wuy.pages.dev (v100.38, pornit 24/7, cu PIONEX_API_KEY/SECRET puse ca secrete). Am verificat-o cu o singură cerere de stare, care a răspuns 200. Restul constatărilor sunt de nivel serios/sugestie: cheile ținute pe originea github.io comună cu alte aplicații, cheia „de citire” a paznicului care poate și scrie, releul WebSocket fără token, CSV fără neutralizarea formulelor și un bug la exportul jurnalului (tot fișierul iese pe un singur rând).

### 🟡 APP_API_TOKEN are 10 caractere cu tipar de cuvânt și aceeași valoare deschide site-ul PUBLIC crypto-wuy.pages.dev, care are cheile Pionex
`C:\Users\Cimin\crypto\functions\_shared\auth.js:28-44 (requireApiAuth); PORNESTE-CRYPTO-RADAR.bat:140,151; PORNESTE-SI-PE-TELEFON.bat:144` · lentila: securitate / autentificare

Tokenul din .dev.vars are 10 caractere, cu forma 9999Aaaaas (4 cifre + un cuvânt de 5 litere cu majusculă + un simbol). Asta înseamnă o entropie mică, de tip dicționar, nu 10 caractere aleatoare. Același text e primit de producția Cloudflare Pages (crypto-wuy.pages.dev, v100.38, pe internet 24/7). Acolo sunt setate ca secrete APP_API_TOKEN, PIONEX_API_KEY și PIONEX_API_SECRET. Tot el păzește și tunelul trycloudflare pornit de PORNESTE-SI-PE-TELEFON.bat (care are și cheile T212). Frâna la ghicit e de 10 încercări greșite pe minut pentru fiecare IP. Dacă proiectul Pages nu are KV-ul API_RATE_LIMIT legat, contorul stă doar în memoria fiecărui izolat, deci e și mai slab. Cu mai multe IP-uri, un atac țintit pe câteva milioane de combinații (ani × cuvinte/nume × simboluri) durează zile, nu ani. Depozitul PUBLIC arată adresa și schema de autentificare. Bani nu se pot mișca (codul face numai GET), dar s-ar vedea soldurile, boții, umplerile și ordinele Pionex. Pe tunel s-ar vedea și pozițiile T212. Tot cu tokenul (plus un antet Origin falsificat) se poate scrie în KV-ul de istoric, prin POST pe t212/istoric-bot. Lansatorul acceptă orice token nevid și chiar sfătuiește „pune ORICE text lung”.

**Dovada:** 1) Am citit .dev.vars fără să afișez valorile: APP_API_TOKEN len 10, tipar '9999Aaaaas'; PIONEX_API_KEY 66, PAZNIC_TOKEN 48. 2) `wrangler pages secret list --project-name crypto` → APP_API_TOKEN, PIONEX_API_KEY, PIONEX_API_SECRET pe 'production'. 3) GET https://crypto-wuy.pages.dev/api/market?type=health → {"version":"v100.38"}. 4) O SINGURĂ cerere GET /api/pionex-account?action=status pe producție, cu tokenul local → 200 {"configured":true,"readOnly":true} (ruta nu cheamă Pionex la action=status). 5) Lansatorul verifică doar `IsNullOrWhiteSpace($t)`, fără lungime minimă. 6) `tailscale serve status` → acum doar tailnet only; cloudflared nu rulează în clipa asta.

**Reparația propusă:** Generează un token aleator de ≥32 de caractere, de exemplu `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. Pune-l în .dev.vars și în producție cu `wrangler pages secret put APP_API_TOKEN`, apoi o dată pe telefon și în alerts (🔐). Dacă producția nu e folosită pentru Pionex (hotărârea spune că Pionex refuză IP-urile Cloudflare), șterge cheile de acolo cu `wrangler pages secret delete PIONEX_API_KEY/PIONEX_API_SECRET`: nu aduc nimic, doar suprafață de atac. În requireApiAuth, refuză (503) un APP_API_TOKEN mai scurt de 24 de caractere. Lansatorul să ceară lungimea minimă sau să genereze singur tokenul. Leagă KV-ul API_RATE_LIMIT în proiectul Pages, ca frâna să țină între izolate.

verificator: **confirmat** — Am reprodus faptele, fără să afișez valorile: .dev.vars are APP_API_TOKEN cu lungimea 10 și tiparul 9999Aaaaas (4 cifre, un cuvânt cu majusculă, un simbol), adică entropie de tip dicționar. În auth.js:38-53 frâna e AUTH_FAIL_MAX=10 pe minut pe IP. Contorul stă în localBuckets, adică în memoria fiecărui izolat, iar KV-ul API_RATE_LIMIT e opțional (linia 50). Depozitul nu are wrangler.toml pentru Pages, deci nu pot proba că producția are KV-ul legat. Lansatoarele verifică doar IsNullOrWhiteSpace($t) (PORNESTE-CRYPTO-RADAR.bat:151 și PORNESTE-SI-PE-TELEFON.bat:144). Endpointul de producție cere token (GET /api/provider-health → 401 AUTH_REQUIRED, deci schema e activă). Nimic nu anulează slăbiciunea și nu e printre hotărârile conștiente. Am două nuanțe care îi reduc impactul, dar nu îndeajuns cât să o cobor. (a) Pe producție, datele Pionex nu sunt sigure: provider-health.js:98 notează că de pe Cloudflare Pionex dă 429 cu găleata plină. Ce s-ar vedea efectiv e intermitent. (b) Scrierea în KV prin POST t212 (t212.js:106-110, requireApiAuth + sameOrigin, iar Origin se poate falsifica din afara browserului) merge doar unde ISTORIC e legat, adică acasă sau pe tunel. Pe producție, faraKv întoarce 503. Tunelul trycloudflare are adresă aleatoare și acum nu rulează. Sfatul „pune ORICE text lung” cere totuși un text lung. Rămâne o abatere cu risc: o parolă slabă, pe o adresă publică, cu schema de autentificare vizibilă în depozitul public. Doar citire, fără bani mișcați, deci „serios” și nu „critic”.

### 🔵 Parola Radarului (APP_API_TOKEN) și CHEIE_CITIRE stau în localStorage pe originea github.io, pe care o împart și alte aplicații
`C:\Users\Cimin\premarket_scanner\lib\radar-poza.js:6, 18-23, 30, 50, 64` · lentila: securitate / stocarea cheilor în browser

Pagina alerts ține în localStorage, pe originea https://mferent80-source.github.io, cheia de citire a pozei ('radar_cheie'), parola Radarului ('radar_parola' = APP_API_TOKEN) și poza întreagă ('radar_poza': pozițiile T212 cu bucăți, prețul mediu, costul în lei, boții cu suma investită, radarUrl). Pe aceeași origine stau și alte aplicații ale lui (scanner, Mercato, DatorieTrack, după memorie). Orice XSS în ORICARE dintre ele citește toate trei. Cu parola și cu radarUrl din poză, atacatorul ajunge direct la Radar (tunel sau producție, vezi constatarea de mai sus). În plus, cheia se acceptă și din query string (?cheie=), nu doar după #, deci ajunge în jurnalele serverului GitHub Pages și în istoricul browserului până la replaceState.

**Dovada:** radar-poza.js:6 `var K_CHEIE = 'radar_cheie', K_PAROLA = 'radar_parola', ... K_POZA = 'radar_poza'`; :22-23 parolaRadar()/puneParolaRadar() prin ls() = localStorage; :50 `ls(K_POZA, JSON.stringify(p))`; :64 regex `/[?&#]cheie=([A-Za-z0-9_-]{16,})/` (acceptă și `?`); radar-ecran.js:83-84 parola merge în href `#parola=`. Colectorul urcă poza cu '7 poziții 1 boți 11 simboluri' (data/colector.log, 30.09 16:06).

**Reparația propusă:** Mută alerts pe o origine doar a ei (de exemplu un subdomeniu Cloudflare Pages separat sau un alt user GitHub Pages). Altfel, nu păstra parola Radarului acolo: e suficient linkul fără parolă, fiindcă Radarul o ține minte o dată pe adresa lui fixă ts.net. Acceptă cheia doar după # (scoate `?` din regex). Poza din cache poate sta în sessionStorage, nu în localStorage.

verificator: **coborat** — Codul e cum spune constatarea. radar-poza.js:6 are cheile radar_cheie, radar_parola și radar_poza în localStorage. Liniile 22-23 țin parola, linia 50 poza întreagă. Regex-ul de la linia 64 acceptă și ?cheie= pe lângă #cheie=. Remote-ul e github.com/mferent80-source/premarket_scanner.html, deci originea e comună cu celelalte pagini GitHub ale lui, cum spune și memoria. Riscul e însă doar latent. Constatarea nu arată niciun XSS concret în vreo aplicație de pe aceeași origine, iar un token de SPA ținut în localStorage e o practică obișnuită (chiar Radarul își ține tokenul la fel pe originea lui). Drumul cu ?cheie= e teoretic. Am căutat în crypto/scripts, crypto/paznic, crypto/*.bat și premarket_scanner/alerts și nu am găsit nimic care să genereze linkuri cu cheie=. Omul lipește cheia singur, replaceState o scoate imediat, iar jurnalele GitHub Pages nu sunt la îndemâna unui atacator. Consecința reală („ajunge direct la Radar”) depinde de constatarea 1 și de un XSS care nu e dovedit. Ce se ține: e o întărire de defensivă în adâncime (origine separată sau cheile ținute în sesiune), nu un defect serios.

### 🔵 Cheia „de citire” CHEIE_CITIRE poate și SCRIE lista de simboluri; comparația nu e în timp constant și încercările greșite nu sunt frânate
`C:\Users\Cimin\crypto\paznic\worker.mjs:18, 114, 123` · lentila: securitate / worker paznic-radar

POST /simboluri se autorizează cu CHEIE_CITIRE, deci cine are cheia de citire poate rescrie cele 60 de simboluri pe care colectorul le îmbogățește la fiecare tură (cereri Yahoo), cu o notă liberă de 80 de caractere. Pe ecran nota e escapată. autorizat() folosește `===` pe șiruri și nu are niciun contor pentru încercări greșite, spre deosebire de requireApiAuth din aplicație. Riscul e mic, fiindcă secretul are ≥20 de caractere (verificat în cod), dar e inconsecvent cu restul.

**Dovada:** worker.mjs:18 `return s.length >= 20 && request.headers.get("authorization") === "Bearer " + s;` ; :123 `if (m === "POST") { if (!autorizat(request, env.CHEIE_CITIRE)) ...simboluriScrie`. `wrangler secret list --name paznic-radar` → CHEIE_CITIRE, DISCORD_WEBHOOK, PAZNIC_TOKEN.

**Reparația propusă:** Comparație pe digest SHA-256 cu XOR (ca în auth.js) și un contor de eșecuri pe cf-connecting-ip în KV sau în memorie. Dacă se vrea separare strictă, o cheie distinctă pentru scrierea listei; altfel un comentariu care spune că e intenționat.

### 🔵 /api/pret-viu (releu WebSocket spre Pionex) n-are token, iar singura gardă, Origin, se falsifică ușor în afara browserului
`C:\Users\Cimin\crypto\functions\api\pret-viu.js:15-17` · lentila: securitate / abuz de resurse

Ruta deschide o conexiune WebSocket spre ws.pionex.com pentru fiecare client, cerând doar ca antetul Origin să fie egal cu adresa serverului. Un client care nu e browser (curl, script) pune ce Origin vrea. Pe producția publică crypto-wuy.pages.dev și pe tunel, oricine poate folosi Worker-ul lui ca releu spre Pionex. Datele sunt publice, dar costurile de cereri/CPU cad pe contul Cloudflare al lui și un eventual ban Pionex pe IP cade pe el.

**Dovada:** pret-viu.js:17 `if(!sameOrigin(request))return json({error:"ORIGIN_REFUSED"},403);`, fără requireApiAuth. auth.js sameOrigin = `origin===u.origin`, adică un antet ales de client. Proba locală fără upgrade → 426 WEBSOCKET_REQUIRED. N-am deschis un WS real, ca să nu fac cereri Pionex.

**Reparația propusă:** Cere tokenul și aici. Browserul nu pune antete pe WebSocket, dar tokenul poate merge ca subprotocol (`new WebSocket(url, ['tok.'+token])`), verificat pe server cu requireApiAuth. Alternativ, un bilet scurt obținut dintr-un GET autentificat.

### 🔵 CSV-urile pentru contabil nu neutralizează formulele (=, +, -, @ la începutul celulei)
`C:\Users\Cimin\crypto\public\lib\t212.js:146, 160 (și statistica-trade.js:282)` · lentila: securitate / CSV

q() pune ghilimele doar pentru ; " și linie nouă. Un nume de instrument T212, o monedă sau o etichetă care începe cu = sau @ ar fi executată ca formulă de Excel la deschidere. Sursele sunt T212/Pionex (furnizori de încredere), deci riscul e mic, dar fișierul ajunge la contabil.

**Dovada:** t212.js:160 `var q = function (v) { v = String(v == null ? "" : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };` — nimic pentru /^[=+\-@\t\r]/.

**Reparația propusă:** În q(): `if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;`, înainte de regula cu ghilimele. Nu atinge câmpurile numerice (n()).

### 🔵 Mesajele Discord (colector + paznic) nu au allowed_mentions: {parse: []}
`C:\Users\Cimin\crypto\scripts\lib\canal-discord.mjs:12-21 (și paznic/worker.mjs:59-64)` · lentila: securitate / Discord

Titlurile alertelor intră în `content`, iar textele (inclusiv titlurile de știri din rezumatul de dimineață) intră în embeds. Dacă un text ajunge vreodată să conțină @everyone sau un link markdown [text](url), Discord îl interpretează. Acum titlurile din `content` sunt generate intern, deci riscul e mic. Apărarea costă o linie.

**Dovada:** `grep allowed_mentions` în scripts/, paznic/ și public/lib → 0 rezultate. consilier.js:117 pune `x.titlu` (titlul RSS) în liniile rezumatului, trimise pe Discord prin tura-dimineata.mjs:14.

**Reparația propusă:** Adaugă `allowed_mentions: { parse: [] }` în corpul trimis de mesajDiscord() și de discord() din worker.

### 🔵 „Export CSV” din jurnalul de semnale scrie tot fișierul pe UN rând: separatorul e textul \n, nu o linie nouă
`C:\Users\Cimin\crypto\public\app.js:4044` · lentila: funcționalitate (găsit în drum)

exportJournal() face `rows.join("\\n")`, adică o bară inversă urmată de n. În fișier apar caracterele „\n” între rânduri, iar Excel vede un singur rând. Butonul e în index.html:2209.

**Dovada:** `sed -n 4044p app.js | od -c` → `j o i n ( " \ \ n " )`: doi octeți bară inversă + n în sursă, deci șirul JS e `\n` literal. index.html:2209 `<button data-action-click="exportJournal()">Export CSV</button>`.

**Reparația propusă:** `rows.join("\n")` (o singură bară inversă) și o probă în scripts/ care numără rândurile CSV-ului.

**Ce a probat:** - Garanția doar-citire. _shared/pionex.js:49-58 semnează numai `GET${path}` și trimite numai fetch fără method (adică GET). Singurele trei apeluri au căi fixe: bot-orders.js:27 /api/v1/bot/orders, pionex-account.js:23 (account/balances, uapi/account/detail, trade/openOrders, fills, allOrders) și provider-health.js:39. t212.js cheamă T212 doar cu GET (cash, info, portfolio, history). Nicio rută nu plasează sau anulează ordine.
- Autentificare. Am luat 20 de rute locale pe 127.0.0.1:8788 FĂRĂ token. Toate rutele cu date au dat 401 AUTH_REQUIRED (pionex_*, futures, pionex-account, bot-orders, t212, istoric-bot, history, monitor, curs-bnr, stiri, provider-health). Fără token răspund doar health, push config, intel/external-intel/stocks config (doar booleeni) și /api/nu-exista → 404 NO_ROUTE.
- Token greșit (x-forwarded-for falsificat) → 401 AUTH_INVALID. Am făcut exact 2 încercări greșite în toată auditul, sub pragul de 10/min, ca să nu blochez colectorul. Tokenul bun prin x-app-token trece.
- POST cu token bun: fără Origin → 403. Cu Origin falsificat și acțiune necunoscută → 400, deci nicio scriere în KV.
- CORS: OPTIONS și GET de la https://evil.example n-au primit niciun antet Access-Control-*.
- CSP-ul servit e identic cu _headers: script-src 'self', frame-ancestors 'none', object-src 'none'. sw.js trimite /api/* numai la rețea.
- XSS. Am scanat cu script toate interpolările ${} din innerHTML în app.js + lib/*.js (35 semnalate, toate șiruri interne) și concatenările cu câmpuri externe (nume, titlu, link, simbol). Știrile (t212-ecran.js:376, acasa-ecran.js:232), alertele și sfaturile trec prin escapeHtml, care escapează și ghilimelele. Linkurile RSS sunt filtrate pe server la ^https?://. radarUrl intră în href doar ca http(s), prin URL().origin.
- Secrete. Am căutat valorile REALE din .dev.vars (APP_API_TOKEN, cheile Pionex/T212, webhook-ul, PAZNIC_TOKEN, plus prefixe de 12 caractere) în toate cele 3.334 de obiecte git (172 MB): 0 potriviri. Tiparele (webhook Discord, Bearer, cheie= / parola= în URL, chei private) au dat doar valori de probă. .dev.vars e ignorat și nu apare în istorie. .dev.vars.exemplu are doar valori de umplutură.
- Producția: `wrangler pages project list` și `pages secret list` (numai nume de secrete), `wrangler secret list --name paznic-radar`. health → v100.38. O singură cerere de stare cu tokenul local → 200.
- Rețeaua: wrangler ascultă pe 127.0.0.1:8788 (linia de comandă a proceselor), Tailscale serve e „tailnet only”, funnel e oprit, cloudflared nu rulează acum.

**Ce NU a probat:** - Dacă proiectul Pages de producție are legat KV-ul API_RATE_LIMIT, adică dacă frâna la parole greșite ține între izolate. Legăturile nu apar în wrangler CLI. Nici nu am încercat token greșit pe producție.
- Permisiunile reale ale cheii Pionex (doar citire? legată de un IP?) în Pionex › API Management. Codul face doar GET, dar cheia în sine n-am văzut-o.
- Entropia lui CHEIE_CITIRE și a PAZNIC_TOKEN din Cloudflare (sunt secrete ale worker-ului; codul cere doar ≥20 de caractere). N-am chemat worker-ul paznic-radar deloc.
- XSS-ul din celelalte aplicații de pe originea mferent80-source.github.io (scanner, Mercato, DatorieTrack), de care depinde constatarea 2.
- Releul WebSocket pret-viu cu Origin falsificat. Nu l-am deschis, ca să nu fac cereri Pionex.
- Drumul real pe tunelul trycloudflare (acum e oprit) și pe telefon.
- Dacă workers/radar-monitor.js e publicat. Auditul din 28.09 spunea „nu există”; nu l-am re-verificat.
- Nu am rulat `npm test` (include rute POST în probe) și nu am deschis Chrome.
- Scanarea XSS e euristică (regex pe interpolări și concatenări). N-am citit manual toate cele 220 de innerHTML din app.js.

## Codul paginii

Am auditat codul de pagină al Crypto Radar v100.38 (public/app.js pe secțiuni, index.html, sw.js, research-worker.js și lib/pret-viu, grafic-bot, scan, scan-ecran, acasa, acasa-ecran). Am lucrat pe date reale: 8 probe în Chrome real, pe profil temporar, pe drumul omului (clic pe cele 47 de butoane din meniu, pornire cu pagina ținută minte, reîmprospătări), plus analiză statică pe tot codul.

Ce ține: 0 excepții și 0 NaN/undefined/null/Infinity pe cele 47 de ecrane. Toate cele 201 funcții chemate din data-action există. Versiunea bate peste tot. WebSocket-ul Binance se închide la ieșirea din Tablou, iar intervalele rămân 7–8. Funcțiile moarte au scăzut de la 11 la 1. Reparațiile #7 și #9 din auditul de pe 28.09 țin.

Ce nu ține:
- Pe Acasă și în banda de cont de sus, cifrele sunt greșite: „nimic roșu” când 2 acțiuni sunt pe IEȘI, un cont înghețat la prima citire, iar „față de ieri dimineață” spune −3,23 USDT într-o zi cu LIGHTER închis pe −59.
- Schimbarea v100.38 („Pionex numără liniile”) n-a ajuns în Scan, în alerta „mută gridul” și în 2 calcule.
- O valoare stricată în localStorage omoară toată pornirea.
- Există o cursă confirmată la schimbarea botului.
- O cerere agățată îngheață pentru totdeauna reîmprospătarea de pe Acasă.

### 🔴 Acasă și banda de cont: „nimic roșu” când 2 acțiuni sunt pe IEȘI, iar contul T212 rămâne înghețat deși scrie „actualizat”
`public/lib/acasa-ecran.js:256 (și public/lib/t212-ecran.js:647 contul adus o singură dată, :666 banda de cont)` · lentila: cifră greșită pe ecran / date învechite

Semaforul acțiunilor e numărat din DOM-ul paginii Trading 212 (querySelectorAll("#t212Continut .t212Pill-iesi")). Până deschizi pagina T212, Acasă arată „Semafoare: nimic roșu”, iar banda de cont de sus (vizibilă și pe Tablou) arată „✓ nimic roșu”, cu verde. După o vizită, numărul rămâne cel din momentul vizitei. În plus, contTotAsigura aduce contul doar dacă lipsește (if (!t212.cont)), deci „Contul” și „Pozițiile deschise” de pe Acasă nu se mai reîmprospătează niciodată cât nu deschizi T212. Între timp, antetul Acasei spune „actualizat HH:MM” la fiecare 5 minute. Acasă e pagina de start.

**Dovada:** Proba 1 (Chrome real, pornire pe Acasă, 20 s): acT212 = „Semafoare / nimic roșu”, cu 0 pastile IEȘI în DOM. După clic pe Trading 212 erau 2 pastile IEȘI, iar Acasă a devenit „Semafoare / 2 de ieșit”. Proba 7: pe Tablou, banda arată „Trading 212 · 28.960 lei · deschise −1.885 lei │ ✓ nimic roșu”. Proba 6: pe Acasă am chemat acasaPorneste(true), aceeași funcție ca ceasul de 5 minute. Rezultat: „actualizat 19:34” a devenit „actualizat 19:35”, dar contul a rămas 28.948,94 / ppl −1.895,86, cu t212.cont === același obiect și 0 cereri action=cont. Serverul avea în același moment 28.958,99 / −1.885,81.

**Reparația propusă:** Semaforul să fie socotit din date, nu din DOM: contTotAsigura aduce pozițiile (/api/t212?action=pozitii, deja în cache-ul serverului) și cheamă verdictul pur din lib/t212.js, pe care îl folosește și pagina T212. Contul să se reia când e mai vechi de 60 s (aceeași cadență ca t212Porneste), iar pe Acasă să scrie ora contului, nu ora turei. Cât nu există date, să apară „—”/„aduc…”, niciodată „nimic roșu”.

verificator: **confirmat** — Codul confirmă tot. acasa-ecran.js:256 și t212-ecran.js:666 numără IEȘI doar din DOM-ul paginii T212: querySelectorAll("#t212Continut .t212Pill-iesi"). Pastilele apar numai în t212Render, deci până deschizi pagina T212 numărul e 0 și se afișează verde „nimic roșu” / „✓ nimic roșu”. După ce ai deschis-o, numărul rămâne cel din momentul vizitei. t212-ecran.js:647 face `if (!t212.cont)`, adică contul se aduce o singură dată. Grep pe `t212.cont =` găsește doar două locuri care îl scriu: :23 (t212Porneste, pagina T212) și :647. Nici Acasă, nici tbContTot (app.js:5887, tot `!t212.cont`) nu-l reîmprospătează. Ce atenuează: raportul de dimineață pe Discord (colector.mjs:749, deIesit) listează acțiunile pe IEȘI. Dar pagina de start dă activ un „totul e bine” fals pe un semnal de risc, așa că păstrez critic.

### 🟡 „Față de ieri dimineață” la boți compară totalurile pe viață ale unor boți diferiți: −3,23 USDT într-o zi cu −59 închis
`public/lib/acasa.js:208-213 (afișat în public/lib/acasa-ecran.js:252-253)` · lentila: cifră greșită pe ecran

Acasa.ziuaTa scade din suma profitTotal a boților activi ACUM suma profitTotal a boților activi în poza de ieri dimineață. Dacă un bot s-a închis între timp (pierderea lui dispare din sumă) sau a pornit altul, cifra nu mai înseamnă nimic. Poate chiar arăta verde într-o zi pe pierdere.

**Dovada:** /api/istoric-bot?action=piata, pozele zilnice: 28.09 botiTotal −19,37; 29.09: 0; 30.09: null. Jurnalul data/colector.log: 29.09 23:30 „LIGHTER închis: −59,04 USDT”; 30.09 „CRV închis” +1,30, +2,59, +1,44. Pe Acasă, proba 1: „Boții tăi … CRV long 5× −3.23 USDT … Față de ieri dimineață −3.23 USDT”. Schimbarea reală de ieri dimineață până acum e ≈ −59,04 + 5,33 − 3,23 ≈ −57 USDT.

**Reparația propusă:** Poza zilnică să țină profitul pe id de bot. „Ziua ta” = Σ Δ pe boții prezenți în ambele poze + rezultatul boților închiși de atunci (lista botiInchisi, deja adusă pentru Jurnal) + totalul boților porniți de atunci. Cât nu există asta, rândul să se ascundă când setul de boți diferă.

verificator: **coborat** — Defectul e real. acasa.js:208-213 scade sumele profitTotal ale boților activi azi și ale celor activi în poză (tura-piata.mjs:110 ia în poză tot doar boții activi). Am verificat pe /api/istoric-bot?action=piata: 29.09 botiTotal = 0, 30.09 fără botiTotal. Jurnalul arată că LIGHTER a pornit pe 29.09 pe la 13:30 UTC (închis la 23:30 „după 10 h”) și a închis cu −59,04 USDT. S-au închis și PUMPFUN +9,68 și +7,77. Niciuna dintre ele nu intră în cifra −3,23. Totuși e o linie informativă de rezumat, nu un declanșator de decizie. Fiecare închidere, inclusiv −59 la LIGHTER, a mers separat pe Discord. De aceea cobor la serios.

### 🔵 O singură valoare stricată în localStorage (favoritele) oprește toată aplicația la pornire
`public/app.js:3764 (favs), 3767 (renderLists), 4485 (pornirea)` · lentila: fiabilitate / localStorage fără try-catch

favs() face JSON.parse(localStorage.getItem(...)) fără try și e chemat din renderLists() în codul de pornire de la nivelul fișierului (linia 4485). Excepția oprește restul lui app.js, adică liniile 4486–6550: colectorul Tabloului, prețul live și dispecerul data-action-* de la linia 6437. Nu mai merge niciun buton. Tot aici, localStorage.getItem de la 4485 aruncă și când browserul blochează stocarea site-ului, cu același efect. În app.js sunt 160 de apeluri la storage, dintre care 101 fără try vizibil, și 27 de JSON.parse(localStorage...) (de ex. favs, renderLists, remember, toggleFav).

**Dovada:** Proba 4: localStorage.favs = "{stricat" și reîncărcare. Excepție: „SyntaxError … at favs (app.js:3764) at renderLists (app.js:3767) at app.js:4485”. După 15 s, #acBtc era gol și #favorites era gol. Tabloul afișa „Aștept date … Deschide Setări (parola) … Aștept botul…”, deși parola era pusă și botul CRV rula.

**Reparația propusă:** Un singur ajutor sigur (ca tbCiteste de la 4661: try + valoare implicită) pentru toate citirile JSON din storage, cel puțin pentru cele de la pornire (favs, recent, assetClass, lastCrypto). Blocul de pornire să fie într-un try/catch care arată o bandă „ceva s-a stricat la pornire” și continuă cu dispecerul și colectorul.

verificator: **coborat** — Mecanismul e corect. app.js:3764 face favs(): JSON.parse(localStorage...) fără try și e chemat din renderLists() la pornire (linia 4485 conține `renderLists();`), deci o excepție acolo oprește restul fișierului. Declanșatorul realist însă aproape nu există. Singurul care scrie favs e toggleFav, prin JSON.stringify. Nicio rută de import sau restaurare nu scrie cheia favs (grep pe setItem cu valori neserializate: nimic pe favs). Stocarea blocată ar arunca deja la `localStorage.getItem("assetClass")` pe aceeași linie 4485, iar pentru o aplicație locală, pe browserul lui, scenariul e improbabil. Rămâne o fragilitate de robustețe, nu un risc de fiabilitate probabil.

### 🟡 Numărul de grile e încă arătat ca intervale în Scan, în Tablou („Pe ce aș porni”), în alerta Discord „mută gridul”, la boții de hârtie și în jurnalul gridurilor
`public/lib/scan-ecran.js:230 (Scan „Grile · pas”); public/app.js:5673 (Tablou „Pe ce aș porni”), :5408 („platoul probei alesese N grile”, lângă rândul N+1), :5121 (boți de hârtie), :5187 (jurnalul gridurilor, stochează st.grile = intervale); public/lib/alerte.js:189 (alerta s-muta)` · lentila: v100.38 „Pionex numără liniile” — afișare

După v100.38, pagina Grid și propunerea de mutare din Tablou scriu N+1 (liniile Pionex). Alte locuri arată încă N (intervalele), sub același nume „grile”. Omul copiază cifra în Pionex și obține un interval mai puțin, cu pasul mai mare. Aceeași propunere apare cu cifre diferite: Tablou (app.js:5718, s.grile+1) și Discord (alerte.js:189, s.grile).

**Dovada:** /api/istoric-bot?action=clasament (sursa pentru Scan, via scripts/lib/tura-scan.mjs:38): BTC grile 10, pas 0,0048. Cu lățimea 4,855 %, (1,04855)^(1/10)−1 = 0,48 %, deci 10 = intervale. Scan afișează „10 · 0,48%”, iar 10 scris în Pionex înseamnă 9 intervale (pas 0,53 %). Grep: app.js:5718 are (s.grile+1), alerte.js:189 are „+ sm.muta.setare.grile + " grile"”. În jurnal apare de 3 ori „discord atentie … mută gridul” (ultima: 30.09 14:02 CRV).

**Reparația propusă:** Un singur ajutor, de ex. GridCalcul.liniiPionex(N) = N+1, folosit peste tot unde se AFIȘEAZĂ „grile”: scan-ecran, tbPreg, alerte.js s-muta, platoul, hârtie, jurnal. Plus o gardă în npm test care caută „grile” afișat fără ajutor.

verificator: **confirmat** — Commit-ul v100.38 (git show --stat) nu atinge alerte.js, scan-ecran.js și nici scripts/lib/tura-scan.mjs. alerte.js:189 scrie `sm.muta.setare.grile + " grile"` fără +1, în timp ce Tabloul, la app.js:5718, scrie `(s.grile+1)` cu comentariul „v100.38: în Pionex = linii”. Aceeași propunere iese deci cu două cifre diferite. Pe clasamentul viu, BTC are grile 10, lățime 0,04855 și pas 0,004844 ≈ lățime/10, deci 10 sunt intervale. Scan (scan-ecran.js:230) afișează totuși „10 · 0,48%” sub eticheta „Grile”. La fel și app.js:5673, 5121, 5187 și 5408, fiecare cu `grile + " grile"` fără +1. Scrisă în Pionex, cifra dă un interval mai puțin.

### 🟡 row (linii) e încă folosit ca număr de intervale în „Din grile / din direcție” și în scenariile de preț
`public/app.js:5528 (→ public/lib/grid-umpleri.js:60-61); public/lib/scenariu.js:21, 42-43` · lentila: v100.38 „Pionex numără liniile” — calcule

(1) app.js:5528 dă GridUmpleri grile: Number(bu.row). Modulul face din el niveluri și pas ca și cum ar fi intervale, așa că umplerile reale cad „în afara nivelurilor” și profitul din grile trece la „direcție”. Contează doar la boții spot (la PERP cartela spune că Pionex nu dă umplerile). (2) scenariu.js:21 socotește pas = (sus−jos)/row și merge i ≤ row: row+1 niveluri, aritmetic chiar și la un grid geometric. Asta alimentează „Dacă prețul ajunge la…”, „contul s-ar goli pe la…” și sfaturile de la „jos”.

**Dovada:** Nodul meu cu modulele reale, pe botul CRV din mesajul v100.38 (0,3755–0,423, 8 linii): cu N=8 (cum cheamă app.js), 0,4019 și 0,4089 NU sunt la nivel și imparte() dă grile 0 / direcție 0,5845. Cu N=7 (row−1), ambele sunt la nivel: grile 0,5845 / direcție 0. Proba 3 (Tablou viu, botul CRV de acum: 0,3841–0,4331, row 20, geometric): scenariul „marginea de sus” dă +6,32 USDT cu codul actual și +7,02 cu row−1 (+11 %). Cartela scrie „20 niveluri”.

**Reparația propusă:** La 5528: grile: Number(bu.row)−1. În scenariu.grid: N = row−1, pas pe N, iar la gridType geometric nivelurile geometrice (GraficBot.liniiPionex face deja exact asta, refolosiți-l).

verificator: **confirmat** — app.js:5528 transmite `grile:Number(bu.row)`, iar grid-umpleri.js:60-61 face din el niveluri(jos,sus,grile) și pas^(1/grile), adică îl tratează ca intervale. Am reprodus cu GridCalcul real pe CRV (0,3755–0,423): cu 7 intervale nivelurile sunt …0,4019 0,4088…, deci umplerile 0,4019 și 0,4089 cad pe nivel. Cu 8 (cum cheamă codul) nivelurile sunt …0,3985 0,4045 0,4106…, deci umplerile ies în afara nivelurilor și profitul lor e mutat la „direcție”. La scenariu.js:21 și :42 se face pas = (sus−jos)/row și bucla i ≤ row, adică row+1 niveluri pe o valoare care acum înseamnă linii. Niciun fișier dintre acestea nu e în commit-ul v100.38. Afectează cifre de pe Tablou (împărțirea profitului, „dacă prețul ajunge la…”). E serios, nu critic, pentru că sunt estimări marcate „aproximativ”, iar la PERP împărțirea nu se afișează.

### 🔵 Schimbi botul în timp ce o citire e în zbor: ecranul arată botul nou cu lumânările și WebSocket-ul celui vechi
`public/app.js:4716-4786 (tbAduDate), 4670-4680 (tbAlegeBot)` · lentila: cursă async

tbAduDate n-are gardă de „în lucru” și nici număr de secvență. Citirea A (ceasul de 8 s) e oprită la lumânările botului vechi. Între timp tbAlegeBot pornește citirea B pe botul nou. Când A se întoarce ultima, scrie peste klinePerp și deschide WebSocket-ul spot al botului vechi. Istoricul botului nou poate primi atunci prețul spot al celuilalt (basis otrăvit). Starea greșită se repară abia la tura următoare. Cere cel puțin 2 boți.

**Dovada:** Proba 7b (în pagină: lista de boți falsă cu 2 boți, lumânările CRV întârziate 3 s, fără cereri în plus la Pionex). Jurnal: 0 ms cere lumânări CRV; 613 ms omul alege BTC; 1347 ms klinePerp ← 84229,2 (BTC); 3089 ms „vin lumânări CRV” și klinePerp ← 0,391 cu „bot pe ecran: BTC.PERP”. Starea finală: bot BTC.PERP, ultima închidere 0,391, wsSimbol CRVUSDT.

**Reparația propusă:** Un contor tbSeq++ la fiecare tbAduDate. După fiecare await, dacă seq s-a schimbat sau tbStare.bot.id nu mai e cel de la început, funcția iese fără să scrie (ca liveSocketSeq de la linia 8). Și tbAlegeBot să incrementeze secvența.

verificator: **coborat** — Cursa e reală: tbAduDate (app.js:4716) n-are gardă de „în lucru” și nici număr de secvență, iar s e capturat local. Când citirea veche se întoarce ultima, scrie klinePerp și cheamă tbPorneWs(s.binance) pe simbolul vechi. Partea cu istoricul otrăvit nu se ține însă. tbPorneWs (4825-4832) pune pretSpot=null la orice schimbare de simbol. Singurul loc care scrie în istoric (grep istoricAdauga: doar 4768) e în tbAduDate, după tbPorneWs. Deci la scrierea istoricului pretSpot e null sau aparține simbolului corect. Rămâne o afișare greșită de cel mult o tură (8 s), pe care finderul însuși o descrie ca „se repară la tura următoare”. Cere minim 2 boți și o schimbare de bot exact cât o cerere e în zbor.

### 🟡 Nicio cerere din pagină n-are timeout: o cerere agățată îngheață pentru totdeauna reîmprospătarea Acasei (la fel Scan, Alerts, Grid)
`public/app.js:3187 (getJSON), 3186 (apiFetch); public/lib/acasa-ecran.js:11-57; functions/api/t212.js, functions/api/stiri.js` · lentila: fiabilitate / curse / timeout

getJSON/apiFetch nu folosesc AbortSignal (0 apariții în public/). Ecranele se păzesc cu un flag inLucru, setat înainte de await și șters abia în finally. Dacă o cerere nu se mai întoarce, flagul rămâne true și nicio reîmprospătare nu mai pleacă până la reîncărcarea paginii. Pe server, t212.js (5 fetch) și stiri.js (4 fetch) n-au timeout, iar Acasa așteaptă tocmai rutele astea în Promise.all.

**Dovada:** Proba 8: în pagină, /api/stiri?action=calendar făcut să nu se mai întoarcă, apoi acasaPorneste(true). După 8 s, al doilea acasaPorneste(true) (ce face ceasul): acasa.inLucru = true, 0 cereri noi, „actualizat 19:40” neschimbat. Grep: zero AbortSignal/AbortController în public/. functions/api/t212.js: 5 fetch / 0 signal; stiri.js: 4 / 0.

**Reparația propusă:** getJSON cu signal: AbortSignal.timeout(20000) (opțional mai lung pe rutele lente) și mesaj „n-a răspuns în 20 s”. AbortSignal.timeout și pe fetch-urile din t212.js și stiri.js.

verificator: **confirmat** — Grep: 0 apariții AbortSignal sau AbortController în public/app.js și în public/. getJSON/apiFetch (app.js:3186-3187) nu au semnal de oprire. acasa-ecran.js:11-56 pune acasa.inLucru=true și îl șterge doar în finally, după Promise.all și pașii la rând, iar ceasul de 60 s iese imediat dacă inLucru e true. Pe server, AbortSignal există în bot-orders, market, _shared/pionex etc., dar NU în t212.js (fetch la :34, 45, 63, 74, 224) și nici în stiri.js (:29, 33, 69, 79). Tocmai pe acestea le așteaptă Acasa în Promise.all. Un răspuns agățat de la Yahoo sau faireconomy blochează reîmprospătarea până la reîncărcarea paginii. E fiabilitate slabă, fără bani direct în joc, deci serios.

### 🔵 navTo(id,true) nu desenează 19 ecrane, iar navTo('dash') nu pornește Acasa: revenirea după reîncărcare și linkul din notificare ajung pe ecrane nedesenate
`public/app.js:3006-3068 (navTo), 786-788 (revenirea), public/index.html:53-54` · lentila: drumuri de navigare

navTo are două ramuri disjuncte: încărcarea (load=true) și desenarea (load=false). 19 ecrane (alerts, settings, desk, decisioncore, localdata, paper…) sunt desenate doar în ramura false. Le deschid cu true: revenirea pe pagina ținută minte (pwaInitDeepLink → navTo(ultima,true)), notificarea push (/?panel=alerts), butoanele „Decision Core” și „Local Data” din meniu și paleta Ctrl+K. Invers, „Dashboard” din meniu și bara de jos cheamă navTo('dash') fără încărcare. Impact mic, pentru că majoritatea se desenează și pe alte căi.

**Dovada:** Scriptul meu pe corpul lui navTo: „doar în ramura load=false: alerts, analytics, calibration, decision, decisioncore, desk, edgepro, forward, localdata, montecarlo, opportunity, paper, profitready, researchml, riskmgr, robustness, scenario, settings, validation”. Proba 2: cu revenire pe alerts, după 7 s ecranul arăta „Aduc alertele de acasă… RECENT ALERTS No alerts yet.” (lista vine abia la 8 s, din setTimeout-ul din alerte-ecran.js:61). Cu clic din meniu, lista cu 100 de alerte apare imediat.

**Reparația propusă:** În navTo, desenarea să ruleze mereu, iar încărcarea în plus doar când load e true (nu if/else).

### 🔵 142 de catch-uri goale în app.js; unele ascund o citire eșuată ca „nu există”
`public/app.js:5564` · lentila: catch-uri goale

82 de .catch(()=>{}) și 60 de catch{}/catch(e){}/catch(_){}. Exemplu cu efect pe ecran: în tbAduSaptamana, citirea planului botului (/api/istoric-bot?action=plan) cade tăcut. tbPlan rămâne pe alt bot sau null, deci Tabloul socotește planStare(b, null), adică „fără plan”, iar reîncercarea vine abia după 10 minute (tbSapt.la e setat oricum).

**Dovada:** Grep: `catch(()=>{})` 82, `catch{}` 30, `catch(e){}` 25, `catch(_){}` 5. Citit 5558-5566 și tbDeseneazaSaptPlan (planStare cu tbPlan.botId===b.id ? … : null).

**Reparația propusă:** La citirile care decid ce vede omul (plan, bot, cont), catch-ul să pună o eroare în stare, iar ecranul să spună „nu am putut citi planul”, nu „fără plan”.

### 🔵 trainTemporalModel e definită și nechemată (din cele 11 raportate pe 28.09 au rămas 0; asta e nouă)
`public/app.js:2025` · lentila: funcții moarte

Rămâne doar varianta trainTemporalModelAsync (folosită la 2035 și 2049). Celelalte două candidate găsite de script sunt vii: sampleBlock e chemată prin ...sampleBlock la 448, iar tbCadentaMs e măsurată de proba de ecran.

**Dovada:** Script pe 1.179 de funcții din app.js, cu căutare în app.js, index.html, lib/*.js, sw.js, research-worker.js și scripts/*.mjs: trainTemporalModel are o singură apariție (definiția).

**Reparația propusă:** De șters.

### 🔵 Paleta Ctrl+K n-are cele 5 ecrane zilnice (Tablou, Grid, Jurnal, T212, Alerts); tasta „a” pornește o analiză completă de pe orice ecran
`public/app.js:COMMANDS (înainte de 2705), 6431-6432 (tastele)` · lentila: UX / drumuri

Lista COMMANDS are 16 intrări, toate spre ecrane vechi de cercetare. Lipsesc tabloubot, gridset, jurnaltrade, t212 și alerts. Scurtătura globală „a” cheamă analyze(true) (cereri spre bursă) și când omul e pe Tablou.

**Dovada:** Script: 16 comenzi, 0 spre panouri inexistente; panouri fără comandă: account, alerts, …, gridset, jurnaltrade, t212, tabloubot.

**Reparația propusă:** Adăugați cele 5 ecrane sus în COMMANDS; tasta „a” să meargă doar pe ecranele de analiză.

### 🔵 acasa-ecran: variabila sc refolosită, „azi/mâine” pe ziua UTC, bursa „deschisă” și de sărbători
`public/lib/acasa-ecran.js:122/233, 257, 280-283` · lentila: cod fragil / date

(1) La linia 233, var sc (știrile crypto) redeclară sc de la linia 122 (schimbările față de ieri). Acum merge doar pentru că sc nu mai e folosit după 233; o mutare de rând strică săgețile „față de ieri”. (2) La linia 257, zile() socotește pe ziua UTC: între 00:00 și 03:00 ora României, rezultatele de AZI apar „mâine”. (3) acBursaDeschisa (280) nu știe de sărbătorile și zilele scurte ale bursei din SUA, deci scrie „bursa e deschisă” de Thanksgiving.

**Dovada:** Citit fișierul întreg. Exemplu socotit: 07.10 01:00 București = 06.10 22:00 UTC; azi = 06.10T00:00Z, iar pentru rezultatele APLD din 07.10 zile() = 1, adică „mâine”.

**Reparația propusă:** Redenumiți stiriCr; ziua după Europe/Bucharest (ca fz de la linia 121); o listă scurtă cu sărbătorile NYSE.

**Ce a probat:** Am rulat 8 probe în Chrome real, headless, pe profil temporar, pe serverul local 8788, cu parola din .dev.vars. Toate Chrome-urile au fost închise la final (verificat: niciun proces cu cdp-profil-), iar depozitul a rămas neatins (git status curat, main = d423f81).

1. Proba 1: pornire pe Acasă, apoi clic pe toate cele 47 de butoane din meniul lateral. Rezultat: 0 excepții JS; 0 texte NaN/undefined/null/Infinity/[object Object] în panouri; o singură cerere picată (502 /api/intel?action=news AAPL, furnizor extern). Doar 1 WebSocket rămas deschis (releul pret-viu, cum e gândit); cel Binance al Tabloului s-a închis la ieșire. Intervalele active au stat la 7–8; 195 de cereri /api.
2. Proba 2: revenirea după reîncărcare pe alerts, settings, desk, decisioncore și localdata, comparată cu clicul din meniu; apoi Acasă deschisă după T212.
3. Proba 3: scenariile de preț pe botul CRV viu, cu row față de row−1, citind datele pe care pagina le aduce oricum.
4. Proba 4: favoritele stricate în localStorage.
5. Proba 5: câte desenări pe minut. Pe Tablou: renderTabloBot 16/min (525 ms), pvArata 101/min, /api/bot-orders 8/min, heap 13 MB; pe Acasă: 1 desenare/min.
6. Proba 6: reîmprospătarea contului T212 pe Acasă.
7. Proba 7/7b: cursa la schimbarea botului, simulată în pagină cu o listă falsă de boți.
8. Proba 8: o cerere agățată pe Acasă.

Separat:
- Node cu modulele reale grid-calcul și grid-umpleri pe botul CRV din mesajul v100.38.
- Script static pe tot app.js: funcții moarte (1.179 de funcții, cu chemătorii căutați în app.js, index.html, lib/, sw.js, research-worker.js și scripts/*.mjs).
- Toate cele 201 funcții chemate din data-action-click/change/input există ca globale (dispecerul sare tăcut peste cele lipsă).
- 47 de data-nav, toate cu panou; 0 navTo spre panouri inexistente.
- 0 id-uri cerute cu $() care să lipsească.
- Lista de fișiere din sw.js APP_SHELL = exact cele 32 de scripturi din index.html.
- Versiunea: meta, antet, BUILD_INFO, sw CACHE crypto-radar-v100-38, package 100.38.0, functions/_shared/versiune.js, iar /api/market?type=health dă v100.38.
- Linkurile de știri sunt filtrate pe server (^https?://).
- Am confirmat că reparațiile #7 (SOCOTESC în loc de ȚINE), #9 (zecimalele din alerte), #12 (health v56) și #13 (cele 11 funcții moarte) din 28.09 țin.
- Citit în jurnalul colectorului: LIGHTER −59,04 și închiderile CRV (pentru „față de ieri”).

**Ce NU a probat:** - Telefon: nu l-am probat deloc la această trecere (nici emulare la 390 px, nici telefon real, nici tunelul).
- Butoanele DIN ecrane: am apăsat butoanele de meniu, nu cele din interiorul celor 47 de ecrane (formulare Grid, jurnal, hârtie etc.), în afară de Tablou și Acasă.
- Cursa din Tablou am probat-o doar simulat, cu doi boți falși în pagină. Omul are acum un singur bot activ, deci pe viu nu se poate produce.
- „Din grile / din direcție” nu l-am văzut pe un bot spot real (nu există unul); efectul lui row−1 e socotit în Node pe datele CRV din mesajul commit-ului.
- Blocajul prin cerere agățată e simulat în pagină; nu am văzut o cerere reală T212 sau RSS agățată.
- XSS: n-am trecut prin toate cele ~200 de innerHTML. Am verificat știrile și am observat simboluri interpolate neescapate în data-action-click (app.js:831, 2999, 3767, 4286), dar sursa lor e bursa sau omul însuși, iar CSP-ul oprește scripturile inline, deci nu am raportat.
- Service worker: n-am probat fluxul de actualizare (waiting → SKIP_WAITING → reload) și nici modul offline.
- Memoria pe ore: nu am măsurat; doar 60 s pe ecran.
- Alerta Discord „mută gridul”: n-am văzut un mesaj trimis după v100.38 (ultimul din jurnal e de la 14:02 UTC). Nepotrivirea N față de N+1 e dovedită din cod.
- npm test nu l-am rulat (audit doar-citire; suita e pe poarta de livrare).
- research-worker.js: doar citit, fără probă de antrenare.
- localStorage blocat de browser: dedus din cod (getItem neprins la 4485), neprobat.

## Semnalele și verdictul botului

Am auditat logica verdictelor de trading: semafor, „Acum, concret”, „Ce ai de făcut acum”, sfaturi, direcție, scenariu, alertele Discord, pagina alerts, T212/Idei. Am rulat modulele pure în Node pe date reale: botul CRV activ (2394, long 5×, pornit 30.09 15:47), jurnalul lui de semnale din KV, alertele din KV, 3.000 de lumânări 15M plus 4H/1D/1H/5M și barele zilnice din data/poza-bare.json. Nimic nu a fost scris sau repornit.

Concluzia: verdictul principal afișat acum pe CRV e fals. „ATENȚIE – costurile pe zi depășesc ce aduc grilele” vine din comisionul de deschidere, plătit o singură dată, dar înmulțit ca și cum s-ar plăti zilnic. Orice bot nou pornește așa din secunda 27.

Trecerea la v100.38 („grile” = linii) nu a ajuns peste tot. Mesajul Discord „mută gridul” spune 5 grile, iar Tabloul spune 6 pentru aceeași propunere.

Ideile T212 arată un stop la −15%, deși proba care le susține și mărimea poziției din „Biletul” folosesc alt stop. La COKE, riscul real iese de 3 ori peste regula de 1% din cont.

Semaforul nu are histerezis: a sărit IEȘI↔ATENȚIE de 5 ori în 20 de minute. Tabloul și pagina alerts dau același verdict, pentru că îl calculează același modul pe aceeași fișă. Afirmațiile de tip „nedovedit” (estimarea de 48,8%, „nu e o prognoză”) sunt spuse cinstit.

### 🟡 „Costurile mănâncă grilele” e fals la orice bot tânăr: comisionul de deschidere, plătit o dată, e tratat ca un cost zilnic
`C:\Users\Cimin\crypto\public\lib\tablou-extra.js:62-70 (folosit în semnale-bot.js:243 și sfaturi.js:114)` · lentila: logica verdictului / costuri

grileVsCosturi împarte comisioanele și funding-ul totale la vârsta botului (minim 1/24 zile) și le compară cu gridProfit24h, care nu e scalat. Comisioanele unui bot long sunt aproape în întregime taxa de cumpărare a poziției inițiale (527 CRV ≈ 211 USDT notional → ~0,10 USDT), deci o taxă unică devine „−0,68 USDT pe zi”. Rezultatul e verdictul principal de pe Tablou, 🟡 ATENȚIE „costurile pe zi depășesc ce aduc grilele”, cu sfatul „levier mai mic sau grile mai rare”. Același lucru apare ca rând galben în „Ce ai de făcut acum” și ca sfat. Fiecare bot nou pornește cu acest ATENȚIE, iar semnalul e apoi judecat în „socoteală” ca și cum ar fi avut un sens.

**Dovada:** scratchpad/analiza.mjs pe botul real CRV 2394 (vârsta 3,53 h): costuri = {grile24h: 0,156; zile: 0,147; comisionZi: −0,679; fundingZi: −0,149; netZi: −0,672} → SEMAFOR(Tablou și colector): „atentie | costuri | costurile pe zi depășesc ce aduc grilele”. Jurnalul KV semnale:2394 are ca prim semnal, la 15:47:58 (27 s după pornire, total +0,24): „atentie costuri”. Comisioanele totale ale botului sunt −0,0998, cât taxa de intrare. Cu cifrele de acum, netZi rămâne negativ până la ~0,78 zile de viață, chiar dacă grilele merg normal. cead.mjs: „Ce ai de făcut” arată „Costurile mănâncă grilele: −0.65 USDT pe zi… 👉 Aș rări grilele”.

**Reparația propusă:** Scoate comisionul de deschidere (poziția inițială × preț × COMISION) din comisionZi, sau ia doar comisioanele din ultimele 24 h (diferență în istoricul KV). Nu judeca „costuri” înainte de 24 h de viață (așa cum TabloBot cere 120 de minute pentru ritm). Compară aceleași ferestre: 24 h cu 24 h.

verificator: **coborat** — Se ține logic: tablou-extra.js:62-70 împarte comisioanele totale la zile (minim 1/24), dar gridProfit24h nu e scalat, iar semnale-bot.js:243 și sfaturi.js:114 nu au nicio gardă de vârstă. Am citit jurnalul real semnale:2394 prin /api/istoric-bot?action=semnale: primul semnal e la 15:47:58 „atentie costuri” cu total +0,237, și apare din nou la 18:51 și 19:16. Cifra „−0,6x USDT pe zi” e deci umflată la botul tânăr. Am coborât-o la „serios” pentru că nu pune bani în pericol: sfatul („la următorul bot levier mai mic / grile mai rare”, „aș rări grilele”) nu îndeamnă la o acțiune riscantă pe botul viu. Rămâne însă un ATENȚIE fals, repetat la fiecare bot nou, care intră și în socoteală.

### 🟡 Ideile T212 arată stopul −15%, dar proba și „Biletul” (mărimea poziției) folosesc stopul k×ATR: la COKE riscul real e 3% din cont, nu 1%
`C:\Users\Cimin\crypto\public\lib\idei.js:26 (stop: intrare*(1-TRAIL)); actiuni-semnale.js:218 și 239; t212-ecran.js:217 față de 353` · lentila: SL/TP și mărimea poziției (T212)

Idei.judecaActiune trece o acțiune doar dacă proba (intrare la închidere, stop k×ATR, țintă 2k×ATR, 20 de zile) iese pe plus în medie. Tabelul ideilor afișează însă stop = intrare × 0,85 („−15%, urcă”) și ținta 2k×ATR. Proba nu a măsurat niciodată acest stop. Pe aceeași pagină, „Biletul” calculează stopul n.stop (k×ATR) și numărul de bucăți pentru 1% risc. Cine cumpără cantitatea din bilet și pune stopul din tabelul de idei riscă de câteva ori mai mult. În plus, k e ales ca cel mai bun dintre 4 pe aceleași date pe care se judecă apoi (medie > 0), ceea ce umflă „+X% în medie”.

**Dovada:** scratchpad/idei.mjs + coke.mjs pe data/poza-bare.json (bare reale). COKE: idee TRECE, stop 161,56 (−15,0%), țintă 207,18 (+9,0%), deci riscă 15 ca să câștige 9. Proba care o susține a folosit k=1,5: stop 181,52 (−4,5%), medie +1,2%. Bilet (cont ipotetic 30.000 lei, fx 0,23): 7,26 buc, 6.000 lei, risc 270 lei. La stopul ideii, pierderea e 900 lei = 3,00% din cont. AMD 1,14%, MU 1,19%. perK arată că k e ales în eșantion (ex. INTC 2:1,7% / 3:7,1%).

**Reparația propusă:** Un singur stop pe idee: fie proba rulează cu stopul care urcă −15% (cum face deja cuStopUrcator), fie ideea afișează n.stop. Marime() trebuie chemată cu stopul afișat. Alegerea lui k: pe o fereastră de antrenare și judecată pe zilele de după, sau k fix.

verificator: **coborat** — Confirmat în cod. idei.js:26 are stop = intrare×(1−0,15) și țintă n.tinta (2k×ATR), iar tabelul (t212-ecran.js:217) afișează „−15%, urcă”. Proba (actiuni-semnale.js:201-208) măsoară stopul k×ATR, cu k ales ca cel mai bun dintre 4 pe aceleași date (linia 214), deci în eșantion. Biletul (t212-ecran.js:353-356) calculează însă bucățile cu n.stop și scrie explicit, în același bloc, stopul lui și „la stop pierzi ~X (1% din cont)”. Perechea mărime/stop din bilet e coerentă. Riscul de 3% apare doar dacă omul amestecă stopul din tabel cu cantitatea din bilet. −15% care urcă e regula lui probată pe trade-urile lui (v88). Nepotrivirea tabel–probă–bilet e reală și înșelătoare, dar nu e o cifră greșită în blocul pe care decide mărimea.

### 🟡 Trecerea la „grile = linii” nu a ajuns peste tot: Discord „mută gridul” spune 5 grile, Tabloul 6; scenariul, umplerile și clasamentul numără încă intervale
`C:\Users\Cimin\crypto\public\lib\alerte.js:189; scenariu.js:34 și 41-42; grid-umpleri.js:60-61 (via app.js:5528); grid-clasament.js:35 → tura-scan.mjs:38 → app.js:5673 / scan-ecran.js:230` · lentila: v100.38 (Pionex numără liniile) – consecvență

Setarea fișei are grile = N intervale. Tabloul arată corect N+1 („Număr de grile”, „Propus acum: 6 grile”). Mesajul Discord s-muta lipește însă setare.grile direct, deci 5. Același mesaj apare și în „Ce ai de făcut acum” din Tablou, așa că pe același ecran sunt două numere de grile pentru aceeași propunere. Au rămas pe vechea socoteală și: Scenariu.grid (pas = (sus−jos)/row, iar la() parcurge row+1 niveluri), GridUmpleri (app.js:5528 dă grile = row, iar niveluri(jos, sus, row) face row+1 linii) și clasamentul/Scan (GridClasament.grile = nrGrile, adică intervale, afișat „N grile · pas” în „Pe ce aș porni” și în Scan). Cine tastează în Pionex numărul din Discord sau din Scan obține un interval mai puțin și un pas mai mare decât cel probat.

**Dovada:** scratchpad/muta.mjs pe botul CRV real și fișa lui: Tablou „Număr de grile: 6 geometric”; acumConcret „Propus acum: 6 grile între 0.3728 și 0.4204”; Discord s-muta „0.37275 – 0.42037, 5 grile, 5×”. Alerta reală din KV (30.09 14:02 UTC): „Gridul propus acum: 0.36989 – 0.41641, 5 grile, 5×”. scen.mjs: Scenariu la marginea de jos dă poziția 658,9 CRV față de 625,1 (= (20−1) × 32,9, formula v100.38 din TabloExtra); la −5% totalul e −15,66 față de −15,27.

**Reparația propusă:** O singură funcție de afișare, liniiPionex(setare) = setare.grile + 1, folosită peste tot (alerte, Scan, clasament). În Scenariu și GridUmpleri, intervale = row − 1 și nivelurile geometrice când gridType e geometric. O gardă în probe: orice text cu „grile” din setarea fișei trebuie să fie egal cu N+1.

verificator: **confirmat** — Verificat pe cod. alerte.js:189 lipește sm.muta.setare.grile (intervale) + „grile”. Tabloul (app.js:5718) arată s.grile+1, la fel app.js:5053 și 5406. scenariu.js:21 ia randuri = x.row și socotește pas = (sus−jos)/randuri (linia 34), iar la() parcurge 0..n, adică row+1 niveluri. app.js:5528 dă GridUmpleri grile = bu.row, iar grid-umpleri.js:60-61 face niveluri(jos, sus, grile) și pas = ^(1/grile). grid-clasament.js:35 dă grile = nrGrile (intervale), care ajung prin tura-scan.mjs:38 la scan-ecran.js:230 („Grile · pas”) și la app.js:5673 („N grile · pas”), fără +1. Pe același ecran apar două numere pentru aceeași propunere. Impactul e un interval în minus, nu o pierdere directă, deci rămâne „serios”.

### 🟡 Semaforul sare IEȘI↔ATENȚIE la fiecare 5 minute: planul pe minus nu rămâne „atins”, iar pragurile nu au histerezis
`C:\Users\Cimin\crypto\public\lib\semnale-bot.js:231, 32-33, 240; noteaza 276-283` · lentila: repaint / flip-flop

semafor() judecă totul din starea de acum: planul atins (total ≤ −prag), mutaGridul (poz < 0,1) și mișcarea (> 1,5×) nu au niciun prag de ieșire. Când totalul oscilează în jurul pragului, IEȘI apare și dispare. Un plan „hotărât la rece” încetează să spună IEȘI imediat ce totalul revine cu 0,2 USDT. Alertele Discord au histerezis (10 min stabil, 1,5/2,0 la mișcare), semaforul nu, deci Tabloul și Discord spun lucruri diferite în aceleași minute. Fiecare schimbare mai creează o intrare nouă în „socoteală”, umflând numărul de semnale judecate.

**Dovada:** Jurnalul real KV semnale:2394 (ore RO): 17:23 IEȘI plan (−7,55) → 17:28 ATENȚIE muta (−7,42) → 17:33 IEȘI plan (−7,71) → 17:38 ATENȚIE muta (−6,88) → 17:43 IEȘI plan (−7,71) → 17:48 ATENȚIE mișcare. În total 15 verdicte principale diferite în 3,5 h. Pe Discord a plecat o singură dată (14:23 UTC), deci Tabloul era singurul care „clipea”.

**Reparația propusă:** Planul pe minus devine „atins” și rămâne așa (latch în KV, cu ora) până îl anulează omul sau până se închide botul. Histerezis la muta (intră < 10%, iese > 15%) și la mișcare (intră 1,5×, iese 1,2×), ca în alerte.js. Noteaza să nu înregistreze un semnal care revine în mai puțin de 15 min.

verificator: **confirmat** — planStare (tablou-extra.js:345) pune „minus” în atins doar cât tot ≤ −prag, fără memorie. semafor (semnale-bot.js:231, 240-241) și mutaGridul (32-33) judecă doar starea de acum. noteaza (276-283) adaugă câte o intrare la fiecare schimbare de cod/nivel. Reprodus pe jurnalul real semnale:2394 (15 intrări): 17:23 iesi plan −7,55 → 17:28 atentie muta −7,42 → 17:33 iesi plan −7,71 → 17:38 atentie muta −6,88 → 17:43 iesi plan −7,71 → 17:48 atentie miscare. Clipirea e reală, iar socoteala se umflă.

### 🔵 Sfatul „pune un take-profit / stop la prețul de zero” pune un stop DEASUPRA prețului la un long pe minus, contrar cartelei Stopul de pe același ecran
`C:\Users\Cimin\crypto\public\lib\sfaturi.js:130-134` · lentila: „Ce ai de făcut acum” – sfat contradictoriu

Sfaturi (F) apare când totalul e negativ. La un long pe minus, zero-ul e peste preț, deci un stop-loss acolo e deja „atins” (închide imediat pe minus sau e refuzat). Cartela „Stopul” din „Acum, concret” spune exact invers: „zero-ul botului… acolo un stop n-are sens”. Rândul intră în „Ce ai de făcut acum” (info cu faCe → gri).

**Dovada:** scen.mjs și cead.mjs pe CRV real (preț 0,3918, zero 0,3982): „SFAT info | Botul iese pe zero la 0.3982 (+1.6% de aici) | Dacă vrei să ieși fără pierdere, pune în Pionex un take-profit / stop la 0.3982”. Pe același ecran, acumConcret: „Ești pe minus: zero-ul botului (0.3982) … acolo un stop n-are sens”.

**Reparația propusă:** La long pe minus: „take-profit (nu stop) la zero”; la short oglindit. Cuvântul „stop” să apară doar când zero-ul e de partea pierderii față de preț.

verificator: **coborat** — sfaturi.js:130-134 există și apare doar când totalul < 0. Miezul sfatului e însă corect: la un long pe minus zero-ul e deasupra prețului, iar un take-profit acolo e exact „ieși fără pierdere” (la short e simetric). Greșit e doar „/ stop” din formulare, care se bate cap în cap cu cartela Stopul („acolo un stop n-are sens”). E o problemă de text: ar trebui să spună doar take-profit. Nu e o cifră greșită.

### 🔵 Semaforul ia |distanța| până la lichidare: la lichidarea DEPĂȘITĂ cu peste 15% spune ȚINE, iar între 8 și 15% doar ATENȚIE
`C:\Users\Cimin\crypto\public\lib\semnale-bot.js:227-228` · lentila: lichidare – semn

distantaLichidarePct e cu semn (negativ = depășită, bot-orders.js:107). semafor() folosește Math.abs(dist) < 8 / < 15 și nu citește lichidareDepasita. Alerte.reguli tratează corect cazul (critic „DEPĂȘITĂ”), deci Discord spune critic, iar Tabloul și pagina alerts spun ȚINE sau ATENȚIE.

**Dovada:** scratchpad/lich.mjs pe botul CRV real, cu distantaLichidarePct forțat și lichidareDepasita = true: −3 → semafor „iesi – lichidarea e la 3.0%” (text greșit); −9 → „atentie – lichidarea s-a apropiat la 9.0%”; −20 → „tine – nimic nu cere o mișcare acum”. Alerta Discord e „critic – CRV: lichidarea e DEPĂȘITĂ” în toate trei.

**Reparația propusă:** if (b.lichidareDepasita || dist < 0) → IEȘI cu textul „lichidarea estimată e depășită”; pragurile pe dist cu semn, nu pe Math.abs.

verificator: **coborat** — Codul e cum spune constatarea: semnale-bot.js:227-228 folosește Math.abs(dist) și nu citește lichidareDepasita. functions/api/bot-orders.js:107 dă dist cu semn și lichidareDepasita = p.dist < 0 (testat în scripts/bot-orders-v72.mjs:292-297), iar alerte.js:33 și pret-viu.js:72 tratează corect cazul. În practică, o depășire de 8–20% nu poate exista pe un bot viu, pentru că Pionex l-ar fi lichidat. Cazul realist e o depășire mică (fitil, prețul ultim față de mark), unde |dist| < 8 dă oricum IEȘI, doar cu textul greșit („lichidarea e la 3%”). Discord și banda de preț viu spun corect DEPĂȘITĂ. Defect de consecvență cu probabilitate mică.

### 🔵 „Botul a ajuns pe zero – dacă îl închizi acum ieși fără pierdere” pleacă la câteva secunde sau minute după pornirea fiecărui bot
`C:\Users\Cimin\crypto\public\lib\alerte.js:211-215` · lentila: alerte Discord fără sens la pornire

Regula p-zero se aprinde oricând prețul e peste zero (long), deci și la naștere, când zero-ul e la un tick de preț. Mesajul îndeamnă la închidere chiar în prima oră, deși propriul Obiceiuri.subOOra arată că închiderile din prima oră l-au costat (1.469 de boți, net −2.065 USDT, cu comentariul din cod).

**Dovada:** Alertele reale din KV pe 30.09 (UTC): p-zero la 08:39:52 (botul pornit ~08:32), 09:05:27 (pornit ~09:01), 10:33:23 (pornit ~10:32), 12:48:00 (botul 2394, pornit 12:47:31, adică la 29 s). 5 din 6 p-zero de azi au plecat la pornirea unui bot.

**Reparația propusă:** p-zero doar dacă botul a fost înainte sub zero cu cel puțin o treaptă (ex. total < −0,5% din investiție) și are peste 1 h de viață. Adică „a revenit pe zero”, nu „e pe zero”.

verificator: **coborat** — Reprodus pe KV-ul real (/api/istoric-bot?action=alerte). Pe 30.09, p-zero e PRIMA alertă a botului 2391 (08:39:52), a botului 2393 (10:33:23) și a botului 2394 (12:48:00; primul semnal al botului e la 12:47:58 UTC). alerte.js:210-215 nu are nicio gardă de vârstă, deci zgomotul la naștere e real. Mesajul nu e însă fals și nu îndeamnă la închidere: „Hotărăști tu: îl lași să prindă grilele sau ieși”. E o alertă de nivel atentie, cu reluare la 12 h (alerte.js:14). Zgomot pe Discord care merită o gardă (de ex. bot mai vechi de 1 h), nu un semnal greșit.

### 🔵 Două definiții de „trend” pe același ecran: fișa zice „long, tare”, iar „Direcția pieței” zice „lateral”, în jumătate din cazurile „tari”
`C:\Users\Cimin\crypto\public\lib\grid-calcul.js:235-243 față de directie.js:50-62 (folosite în sfaturi.js:63-72 și 137-143, semnale-bot.js:236-238)` · lentila: direcție – două adevăruri

Semaforul (componenta „trend”), Sfaturi A („Trendul e cu botul (long, tare)… trendul e de partea lui”) și poarta Obiceiuri folosesc GridCalcul.directie (EMA20/50 cu prag 1/4 din amplitudine + structura 4h, scor ±5). Blocul „Direcția pieței”, Sfaturi 5 și alerta Discord „piața pe 4 ore merge împotriva botului” folosesc Directie.analizeaza (EMA20/50 + ER ≥ 0,25 + pantă). Nu se contrazic în sens opus, dar „tare” lângă „lateral” nu spune omului ce să creadă.

**Dovada:** scratchpad/directii.mjs pe CRV real: acum Directie 4H = lateral (ER 0,20), 1D = lateral (ER 0,12); fișa = long/tare, scor 5. Rejucat fără look-ahead pe ultimele 250 de bare de 4h: fișa „tare” în 104 bare, din care Directie „lateral” în 53 (51%). Niciodată în sens opus (0/250). Fișa își schimbă direcție/tărie de 15 ori, Directie de 26 de ori.

**Reparația propusă:** O singură definiție de trend (sau afișate împreună, explicit: „trend EMA: long tare · eficiență: laterală”). „Tare” să ceară și ER ≥ 0,25, ca în Directie.

verificator: **coborat** — Codul confirmă două definiții. grid-calcul.js:235-243 face scor din trendTF 4h + 1z + structură, cu „tare” de la |s| ≥ 4. directie.js:51-62 folosește ER ≥ prag + EMA + pantă, altfel „lateral”. Constatarea recunoaște că nu se contrazic niciodată în sens opus (0/250), iar procentul de 51% nu l-am putut reproduce independent. E confuzie de prezentare (două „trenduri” cu vocabular diferit), nu o cifră greșită și nu un semnal contrar. Cel mult curățenie și UX.

### 🔵 „Socoteala” judecă semnalele care nu spun „ieși” (costuri, BTC, mută gridul) după scăderea totalului în 24 h și le trece „pe bani” ca pe o ieșire
`C:\Users\Cimin\crypto\public\lib\semnale-bot.js:284-311` · lentila: auto-evaluarea semnalelor

judeca(): orice atentie sau iesi „a avut dreptate” dacă totalul scade în 24 h; socoteala() le creditează cu (total atunci − total după), ca și cum ar fi închis. Dar „costuri” spune „la următorul bot…”, „btc” spune „n-aș adăuga bani”, iar „muta” spune „oprește și pornește altul”. Tabelul „Au avut dreptate / Pe bani, urmat” și raportul de duminică („Semnalele: X/Y au avut dreptate”) măsoară deci altceva decât promite fiecare semnal. Pe deasupra, flip-flop-ul (constatarea de mai sus) adaugă intrări aproape identice.

**Dovada:** Jurnalul real semnale:2394: primul semnal e „atentie costuri” la total +0,24 (15:47:58). Totalul de acum e −3,28. Dacă rămâne așa, mâine la 15:48 „costuri” va fi trecut „a avut dreptate” și „pe bani +3,5 USDT”, deși sfatul lui era despre botul următor.

**Reparația propusă:** Judecă doar semnalele care cer o acțiune pe botul curent (iesi, ia-profit, muta ca „oprește”) și fiecare după promisiunea lui. costuri/btc/aglomerare: „informativ, nejudecat”, sau judecat după propria afirmație (costuri: netZi pe următoarele 24 h).

verificator: **coborat** — judeca/socoteala (semnale-bot.js:286-311) tratează orice atentie/iesi ca pe o ieșire, așa că „pe bani” la „costuri” nu măsoară ce promite semnalul. Jurnalul real are „atentie costuri” la +0,237, cu dreptate null deocamdată. Socoteala e totuși agregată PE COD (r[e.cod]), deci omul vede separat rândul „costuri” de rândul „plan”. La „muta” (oprește = ieși) măsura e rezonabilă, iar la „btc” scăderea totalului confirmă prudența. Distorsiunea atinge o statistică de încredere, nu o decizie de bani imediată.

### 🟡 Maximul de după cumpărare include ziua cumpărării, deci și un maxim dinaintea cumpărării; proba (cuStopUrcator) exclude explicit acea zi
`C:\Users\Cimin\crypto\scripts\colector.mjs:580-582 (față de actiuni-semnale.js:301-316 și 53-54)` · lentila: SL care urcă (T212) – look-ahead invers

Colectorul calculează mx din barele cu b.t + 24 h > data primei umpleri, deci include bara zilei de cumpărare. La o cumpărare după închidere sau noaptea (grupa lui cea mai frecventă), bara acelei zile e integral dinainte de cumpărare. Maximul ei ridică referința stopului „−15% de la maxim”, iar alerta de trail, semaforul T212 și nivelul „niv” se aprind mai devreme decât în proba care a justificat regula (−15% care urcă, +1.001 lei). Proba sare anume ziua cumpărării („ziua cumpărării și a vânzării nu intră”).

**Dovada:** Cod: `if (b.t + 86400000 > de) mx = …b.h`. Pe barele reale din data/poza-bare.json, high/close − 1 pe ultimele 120 de zile are mediana 1–4,6% și p90 2,3–10,2% (TE 4,55% / 10,17%, APLD 3,72% / 8,11%, maxim 20,9%). Cu atât se strânge stopul real față de cel probat, dacă a cumpărat la închidere.

**Reparația propusă:** mx doar din barele cu b.t > momentul cumpărării (pentru ziua cumpărării doar dacă a cumpărat înainte de deschidere), exact ca în cuStopUrcator. Altfel proba și regula live nu sunt aceeași regulă.

verificator: **confirmat** — colector.mjs:580-581: `if (b.t + 86400000 > de) mx = … b.h` include bara zilei primei umpleri, cu tot cu maximul ei dinaintea cumpărării. Referința merge apoi în niveluri(... maxDupaCumparare: mx, minTrail: 0.15) (linia 590) și în semafor (actiuni-semnale.js: ref = p.maxDupaCumparare). Proba cuStopUrcator (actiuni-semnale.js:301-316) sare explicit ziua cumpărării (z <= z0 → continue) și pornește cu mx = prețul de intrare. Stopul „−15% de la maxim” se strânge astfel cu amplitudinea zilei de cumpărare față de regula probată, iar alerta de ieșire poate pleca mai devreme. Cifrele de amplitudine sunt ale agentului; mecanismul l-am verificat pe cod.

### 🟡 În Tablou, „setările de copiat” pentru un grid propus SHORT nu au niciun rând de stop-loss
`C:\Users\Cimin\crypto\public\app.js:5715` · lentila: setările de copiat – SHORT fără stop

Blocul propus (muta / grid mai des) afișează „Stop-loss jos” doar când s.dir !== "short". La short nu apare nici „Stop-loss sus”, deși fișa îl are (setare.stop.sus) și fereastra Grid îl arată (app.js:5049). Un short copiat de aici pleacă fără opritor, cu pierderea nelimitată în sus.

**Dovada:** Cod: `(s.stop&&s.dir!=="short"?grRand("Stop-loss jos",…):"")`, fără ramură pentru short. În fereastra Grid, app.js:5049 folosește `stopP=lung?x.stop.jos:x.stop.sus`. Nu am avut un bot short activ ca să văd ecranul.

**Reparația propusă:** Adaugă „Stop-loss sus” = s.stop.sus pentru short (și ambele pentru neutru), ca în fereastra Grid.

verificator: **confirmat** — app.js:5718: `(s.stop&&s.dir!=="short"?grRand("Stop-loss jos",…):"")`, fără ramură pentru short. Setarea propusă are stop.sus (grid-plan.js:44: stop { jos, sus }, „long: jos = stop, sus = tinta”), iar mutaGridul (semnale-bot.js:37) o transmite. Fereastra Grid folosește corect stopP = lung ? stop.jos : stop.sus (app.js:5049). Mesajul Discord s-muta trimite explicit la „Setările de copiat sunt în Tablou”. Pentru un short propus, rândul de opritor lipsește acolo. Nu l-am văzut pe ecran, pentru că nu există un bot short activ.

### 🔵 Același eveniment apare pe 2 rânduri roșii, iar rândul „stopul te costă ≈16 USDT la 0.37000” rămâne lângă cartela vie (0,375, ≈14)
`C:\Users\Cimin\crypto\public\lib\tablou-extra.js:439-490 (ceAiDeFacut); alerte.js:84 și 187` · lentila: „Ce ai de făcut acum” – dubluri și cifre învechite

plan (alerte.js:84) și s-iesi (alerte.js:187) pleacă pe Discord la o secundă distanță cu același conținut și nu se unesc în listă. Alerta plan-stop păstrează 24 h cifrele de la emitere, deși stopul a fost mutat între timp. Când nivelul coboară (critic → atentie), nu se trimite mesaj nou, deci textul vechi rămâne.

**Dovada:** scratchpad/cead.mjs pe CRV real: „r 17:23:12 semaforul zice IEȘI — planul tău: pierderea a atins…” și „r 17:23:11 planul tău — ieși (pierderea a atins 7.5 USDT)”; „r 17:04:30 … pierzi ≈ 16 USDT … Stopul e la 0.37000” x2. Botul are acum opritorPierdere 0,375, iar planStare.minus.laOpritor e −13,52.

**Reparația propusă:** Nu trimite s-iesi când motivul e același cu alerta plan. Rândurile de alertă cu cifre să se reemită (sau să fie marcate „vechi”) când stopul s-a mutat.

### 🔵 TabloBot.verdict (vechiul verdict) e calculat la fiecare citire, dar cartela e ascunsă; are alte praguri (margine 15%, ATR 5m față de treaptă)
`C:\Users\Cimin\crypto\public\lib\tablou-bot.js:201-212 și 462-465; app.css:1509; app.js:6329` · lentila: cod mort cu praguri divergente

#tbVerdictCard are display:none, dar TabloBot.verdict rulează în continuare. Acum ar fi spus REGLEAZĂ „Oscilația a scăzut sub o treaptă” (ATR 14 pe 5m / pasul gridului = 0,71, un prag nedovedit). Există trei praguri de „margine” în paralel: 15% (TabloBot), 10% (mutaGridul) și 10%/25% (distanteGrid). Nu îl vede nimeni acum, dar e un al doilea adevăr care poate reapărea.

**Dovada:** analiza.mjs: TabloBot.verdict pe CRV = {nivel: "REGLEAZA", titlu: "Oscilația a scăzut sub o treaptă", amplitudine 0,71}. Semaforul vizibil: ATENȚIE costuri. CSS: `#tabloubot #tbVerdictCard{display:none}`.

**Reparația propusă:** Scoate calculul (sau păstrează doar ce folosește încă ecranul) și unifică pragul de „margine”.

**Ce a probat:** Totul doar cu citire; scripturile sunt în scratchpad.

- adu.mjs: GET-uri reale pe http://127.0.0.1:8788. Un singur /api/bot-orders (botul CRV 2394), /api/istoric-bot pentru semnale, plan, citește și alerte (KV), și lumânările CRV_USDT_PERP: 15M ×6 pagini, 4H 500, 1D 200, 60M 500, 5M 300.
- analiza.mjs: GridProba.fisa construită ca în Tablou și ca în colector; au ieșit identice (long/tare, setare 5 intervale, regim fără mișcare). Apoi planStare, dacaInchizi, grileVsCosturi, semafor (în ambele variante: ATENȚIE costuri), acumConcret și TabloBot.verdict.
- Jurnalul KV al semnalelor, cu orele RO: 15 verdicte în 3,5 h, IEȘI↔ATENȚIE de 5 ori.
- directii.mjs: Directie față de GridCalcul.directie, acum și rejucat fără look-ahead pe 250 de bare de 4h.
- scen.mjs: Scenariu față de TabloExtra.totalCuGridLa, plus Sfaturi pe datele reale.
- muta.mjs: textul Discord s-muta față de Tablou, plus alerta reală s-muta din KV.
- lich.mjs: semafor cu lichidarea depășită.
- cead.mjs: ceAiDeFacut cu alertele reale.
- idei.mjs și coke.mjs: Idei.judecaActiune, niveluri și marime pe barele reale din data/poza-bare.json; plus măsurarea high/close pe aceleași bare.
- Am recitit AUDIT-SEVER 22.09 și 28.09. Punctul 7 din 28.09 („ȚINE” cât se socotește fișa) e reparat: semafor dă „asteapta” fără fișă, iar noteaza nu îl înregistrează.
- Am verificat că dinPionex + bareInchise scot bara în formare la indicatori și că fișa folosește GridCalcul.bare, deci fără bara în formare.

**Ce NU a probat:** - Nu am deschis Tabloul în Chrome, deci nu am văzut ecranul real. Cifrele vin din aceleași module rulate în Node. Rândul „Stop-loss” lipsă la short e doar din cod: nu era niciun bot short activ.
- Nu am chemat Trading 212: nu am văzut pozițiile reale, initialFillDate sau ideile reale din /api/t212?action=idei. Cazul COKE e pe barele reale, dar cu un cont ipotetic de 30.000 lei și fx 0,23.
- Nu am verificat eu semantica Pionex row = linii; am luat-o ca hotărâre dată.
- Nu am auditat interiorul GridProba (proba pe 30 de zile, „deasa”, verdictul fișei), calc() / historicalProbability din app.js, worker-ul paznic și pagina alerts în browser.
- Nu am măsurat dacă verdictele semaforului ar fi câștigat bani pe istoricul boților închiși: nu am citit jurnalele de semnale ale boților vechi din KV.
- Nu am verificat livrarea efectivă pe Discord, ci doar textele alertelor din KV și ce ar produce modulele.
- Nu am rulat suita de probe a depozitului (scripts/proba-*.mjs).

## Drumul omului pe ecrane

Am auditat UX-ul și drumul omului în Chrome headless real, prin CDP, pe http://127.0.0.1:8788 (v100.38). Am deschis toate cele 47 de ecrane din meniu, la 1920×1080 și la 390×844. Pe telefon am mers pe drumul real: bara de jos și sertarul „More”. Am apăsat aproximativ 330 de butoane pe ecranele principale, am făcut 40 de poze și le-am privit pe toate. Am verificat și pagina alerts a suitei, servită local.

Tehnic, aplicația e curată: nicio excepție JS și nicio eroare de consolă, în afară de știrile GDELT (502, problemă cunoscută). La 390 px nu există derulare laterală a paginii și niciun text „undefined/NaN/null”.

Problemele sunt de conținut și de drum. Cea critică: Declarația Unică arată dividendele 0,00 lei (real: +18,84 lei în 2025 și +32,10 lei în 2026) când omul intră direct în Jurnal → Acțiuni, iar „Copiază pentru contabil” și CSV-ul pleacă tot cu 0.

Serioase:
- „Ce ai de făcut ACUM” pune sus un IEȘI roșu vechi de 2 ore și un stop care nu mai există, deși scrie „cele mai noi sus”.
- „Grid: ce setez?” pe telefon arată doar antetul vechi, gol, iar unealta începe abia la 772 px.
- „Crypto” include cel puțin 17 acțiuni și mărfuri tokenizate din primele 60 de monede.
- Prețurile T212 sub 100 $ apar ca „$26.087”, pe același ecran unde punctul înseamnă mii („28.940 lei”).

### 🔴 Declarația Unică arată dividendele 0,00 lei dacă intri direct în Jurnal → Acțiuni (real: +18,84 lei în 2025, +32,10 lei în 2026)
`C:\Users\Cimin\crypto\public\lib\t212-ecran.js:424 (condiția !t212.istoric), 32 (dividendele, doar în t212Porneste), 541 (dividende: t212.dividendeItems || []), 560 (rândul afișat)` · lentila: UX / drumul omului / cifră fiscală

Dividendele se aduc DOAR în t212Porneste (ecranul Trading 212). Jurnal → „Acțiuni · Trading 212” cheamă t212Porneste numai dacă !t212.istoric. La pornire, istoricul e însă deja încărcat de altă cale (ist:true, div:null), deci dividendele nu se aduc niciodată. Raportul anual primește o listă goală și scrie „0,00 lei”, nu „se încarcă” sau „necitit”. Același raport alimentează „Copiază pentru contabil” și CSV-ul pentru contabil. Sumele sunt mici, dar e o cifră de declarație fiscală afișată ca zero sigur.

**Dovada:** scratchpad\ux\verif4.mjs, Chrome real pe date reale. La pornire: {ist:true, div:null}. Drumul A (Acasă → Jurnal → Acțiuni → 2025/2026): „Dividende încasate în 2025 0,00 lei”, „... în 2026 0,00 lei”. Drumul B (întâi ecranul Trading 212, apoi Jurnal): 47 de dividende, total 50,94, și Declarația arată „2025 +18,84 lei”, „2026 +32,10 lei”. Poze: desk-08-declaratie.png, mob-08-declaratie.png.

**Reparația propusă:** În jtRenderActiuni / t212RaportDecl: dacă t212.dividendeItems === undefined, cheamă separat /api/t212?action=dividende (cu garda lui). Până vine răspunsul, rândul scrie „se încarcă…”, iar Copiază și CSV sunt blocate sau marcate „dividende necitite”. O eroare trebuie să apară ca eroare, nu ca 0,00.

verificator: **confirmat** — Se ține în cod. Dividendele se aduc într-un singur loc: t212-ecran.js:32, în t212Porneste, la action=dividende. contTotAsigura (t212-ecran.js:648) încarcă t212.istoric fără dividende și rulează la pornire, prin pasul „cont” din acasa-ecran.js:21 și scan-ecran.js:22, plus tbContTot din app.js:5887. După asta, jtAlegeFiltru (t212-ecran.js:424) nu mai cheamă t212Porneste, pentru că !t212.istoric e fals. Intrarea în Jurnal (app.js:3016) cheamă doar jtAplicaFiltru, care nu aduce nimic. Mai departe, t212RaportDecl (t212-ecran.js:541) trimite `t212.dividendeItems || []`, iar t212DeclaratieBloc:560 scrie „Dividende încasate în AN 0,00 lei”, fără nicio notă „necitit”. Aceeași cifră intră în r.text („Copiază pentru contabil”, t212.js:136) și în CSV. Nu am găsit nicio gardă care să o anuleze. Este o cifră de declarație fiscală afișată ca zero sigur, deci rămâne critic, chiar dacă suma e mică. Nu am refăcut drumul în Chrome, ca să nu cer din nou date de la T212. Mă bazez pe firul din cod și pe proba celuilalt agent.

### 🟡 „Ce ai de făcut acum” pune sus un IEȘI roșu vechi de 2 ore, deși antetul scrie „cele mai noi sus”
`C:\Users\Cimin\crypto\public\app.js:5877 (l.sort(RO[a.c]-RO[c.c]) după consilierBot); lib/tablou-extra.js:458 (fereastra de 24 h), 490 (sortarea pe oră)` · lentila: UX / verdict fals „acum”

tbRenderTodo adaugă rândurile consilierului, apoi reordonează lista DOAR după culoare (r, g, n, v). Asta strică ordinea pe oră din v100.8, cerută de el: „cele mai noi sus”. Alertele critice rămân roșii 24 h, chiar dacă starea s-a schimbat. Pe ecran, la 19:37: pierderea era −3,78 USDT (sub pragul de 7,5) și cartela de sus spunea ATENȚIE. Totuși, primul rând din „CE AI DE FĂCUT ACUM” era „Semaforul zice IEȘI — pierderea a atins pragul de 7.5 USDT (17:23 · acum 2 h 14 min)”. Al treilea rând spunea „Stopul e la 0.37000 … pierzi ≈ 16 USDT”, dar cartela STOPUL arăta între timp stopul mutat la 0.3847 („pus”, ≈ −8 USDT). Rândurile galbene de la 19:37 stăteau sub cele roșii de la 17:04–17:23.

**Dovada:** verif.mjs, #tbTodoLista la 1920 și 390: ["r | 17:23 · acum 2 h 9 min | Semaforul zice IEȘI…", "r | 17:23 | Planul tău — ieși…", "r | 17:04 | Dacă se atinge stopul din Pionex, pierzi ≈ 16 USDT…", "g | 19:32 · chiar acum | Profitul NET e negativ…", …]. Antetul listei: „cele mai noi sus · fiecare o singură dată”. Rezultat total în același minut: −3.57 / −3.78 USDT. Poze: mob-11-tablou-todo.png, desk-02-tabloubot-b.png.

**Reparația propusă:** După ce se adaugă rândurile consilierului, sortează iar pe oră descrescător (culoarea doar la egalitate de oră). O alertă critică depășită de starea de acum (pierderea sub prag, stopul mutat) trece gri, cu „depășit: acum −3,78”. Separat, două grupuri: „Acum” (din starea curentă) și „Din ultimele 24 h” (pliat).

verificator: **confirmat** — app.js:5877: după ce adaugă rândurile consilierului, codul reordonează toată lista doar după culoare: `l.sort(function(a,c){return RO[a.c]-RO[c.c]})`, cu RO={r:0,g:1,n:2,v:3}. Asta anulează sortarea din tablou-extra.js:490 (v100.8, cerută de el: „cele mai noi sus”, iar la aceeași oră cea mai urgentă). Sortarea e stabilă, așa că ora mai contează doar în interiorul aceleiași culori, iar un roșu de la 17:23 urcă peste un galben de la 19:37. consilierBot (t212-ecran.js:625) întoarce rânduri ori de câte ori există istoric pe monedă, deci ramura se execută des. Faptul că alerta critică rămâne roșie 24 de ore e alegerea lui din v100.9 (rămâne ultima alertă de același fel, cu ora afișată). Nu e defect în sine, dar combinat cu reordonarea duce un IEȘI învechit pe primul rând. Pe tablou-extra nu există test care să prindă pasul adăugat după el, în app.js.

### 🔵 „Grid: ce setez?” deschide pe telefon doar antetul vechi, gol („WAIT”, „—”), iar unealta începe la 772 px
`C:\Users\Cimin\crypto\public\app.js:3120 (show(): lipsește peGrid); app.css:1221, 1698, 1709 (ascunderea există doar pentru peTablou/peT212/peJurnal); app.js:5388 (antetul „calculat la”)` · lentila: UX mobil / ierarhie

show() pune o clasă pe body pentru Tablou, Acasă, Scan, Alerte, T212 și Jurnal, dar nu și pentru gridset. De aceea, pe Grid rămân vizibile bara veche (.toolbar: Crypto/CRV/4h/Auto/Binance/Analizează piața) și .heroStrip (SELECTED MARKET, ENGINE BIAS WAIT, 24H —, MTF —, VOLATILITY —, VOLUME —), plus nota lungă în engleză de la subsol. Pe telefon, unealta de grid începe la y=772, adică sub primul ecran (844 − bara de jos 71). Mai mult, antetul spune „calculat la 19:32 · se reface singur la 5 min”, dar corpul spune „Scrie o monedă”. Câmpul Moneda e gol, deși botul care rulează e CRV.

**Dovada:** verif.mjs pe #gridset. La 390: toolbar h=290 (top 149), hero h=324 (top 438), gridTop=772, grMoneda="", tbSimbol="CRV.PERP/USDT", grStare="calculat la 19:33 · se reface singur la 5 min", grFisa="Scrie o monedă…". La 1920: gridTop=445, nota de la subsol vizibilă (h=94). Poze: mob-03-gridset.png, desk-03-gridset.png.

**Reparația propusă:** Clasă body.peGrid în show() și aceeași regulă CSS ca la peJurnal (plus main>.note). Câmpul Moneda se precompletează cu moneda botului activ, iar antetul „calculat la” apare doar când fișa afișată e chiar cea calculată.

verificator: **coborat** — În cod e real. show() (app.js:3120) pune clasele peTablou/peAcasa/peScan/peAlerte/peT212/peJurnal, dar pentru gridset nu pune nimic. În app.css, .toolbar și .heroStrip se ascund doar sub acele clase (liniile 1221, 1698, 1709, 1768, 1859, 1977), așa că pe Grid rămân vizibile. Nepotrivirea din antet se confirmă și ea. tbAduFisaBot (app.js:5549) completează grStare.la cu fișa botului de pe Tablou, iar renderGrid (app.js:5388) scrie din cauza asta „calculat la … se reface singur la 5 min”. În același timp, câmpul grMoneda rămâne gol, iar corpul spune „Scrie o monedă”. Totuși, nu apare nicio cifră greșită și nu e pusă nicio decizie în pericol: e o problemă de așezare și de coerență pe ecran. De aceea îl cobor la sugestie, dar cu prioritate mare. Pe celelalte ecrane, aceeași ascundere a fost făcută intenționat, la cererea lui („fă la fel toată pagina”). Pozițiile în pixeli (772 px) nu le-am măsurat eu.

### 🟡 „Crypto” include acțiuni și mărfuri tokenizate: cel puțin 17 din primele 60 de pe hartă, în regimul crypto și în „de ocolit pentru grid”
`C:\Users\Cimin\crypto\public\lib\grid-clasament.js:64-69 (topDupaVolum); lib/acasa.js:37 (miscari); lib/acasa-ecran.js:213-216 (harta)` · lentila: conținut / cifră pe care decide

Universul crypto e „toate *_USDT_PERP de pe Pionex după volum”, fără nicio excludere. Pe harta „Crypto · primele 60 după volum” apar SOXLX, XAU, SNDKX, WTI, MSTRX, SPCX, SKHX, XAG, GOOGLX, BRENTOIL, SPYX, NVDAX, QQQX, CRCLX, TSMX, TSLAX, LITEX. „Cine se mișcă · crypto” recomandă „De ocolit pentru grid: …, AAPLX, US, GOOGLX”. Scannerul etichetează GOOGLX drept „CRYPTO”. Același univers intră în verdictul „Crypto: AMESTECAT — BTC e liniștit, dar monedele mici sunt agitate · 33 din 100 în mișcare”. Deci o parte din „monedele mici agitate” sunt Nasdaq, aur și petrol. În plus, cartela scannerului spune „96 monede Pionex” și „33 din 100” în aceeași frază.

**Dovada:** verif.mjs, #acHarta (identic la 1920 și 390): 60 de pătrate, dintre care cele 17 de mai sus. Textul „42 din 60 au urcat azi. De ocolit pentru grid: MOVR, SOON, QNT, AAPLX, US, GOOGLX.” Poze: desk-01-dash-b.png, desk-07-scan.png (GOOGLX cu eticheta CRYPTO).

**Reparația propusă:** O listă de simboluri tokenizate (sufix X pe acțiuni, XAU/XAG/WTI/BRENTOIL/SPYX/QQQX) scoasă din regimul crypto și din lărgime. Pe hartă și în scanner, grup separat „Tokenizate (acțiuni/mărfuri)”. Gridul pe ele rămâne posibil, dar cu eticheta corectă.

verificator: **confirmat** — topDupaVolum (grid-clasament.js:64-69) și Acasa.miscari (acasa.js:37) filtrează doar după /_USDT_PERP$/, fără nicio excludere. Am verificat pe date reale, în blobul KV scanner din 30.09 (data/copii/kv-2026-09-30/ISTORIC/blobs/3c27d8…): din 96 de rânduri, cel puțin 30 nu sunt crypto. Printre ele: SOXLX, SNDKX, WTI, SPCX, MSTRX, XAU, SKHX, XAG, BRENTOIL, NVDAX, CRCLX, TSMX, GOOGLX, QQQX, LITEX, TSLAX, METAX, INTCX, USOX, TQQQX, COINX, SPYX, AMDX, DELLX, HOODX, PLTRX, AVGOX, MRVLX, AAOIX, LLYX, GLWX, plus OPENAI, ANTHROPIC și SMSN. Situația e mai gravă decât s-a raportat. Aceste simboluri intră în regimul „monedele mici agitate” și în harta Crypto. Excluderea lor nu figurează printre hotărârile conștiente. Numărul exact de pe harta randată (17 din 60) nu l-am refăcut.

### 🔵 Prețurile T212 sub 100 $ apar ca „$26.087”, pe același ecran unde punctul înseamnă mii („28.940 lei”)
`C:\Users\Cimin\crypto\public\lib\t212-ecran.js:12 (t212Usd) față de 9 (t212Lei)` · lentila: lizibilitate cifre

t212Usd scrie cu toFixed (punct zecimal, 3 zecimale sub 100 $), iar t212Lei scrie în ro-RO (punct = mii). Pe același ecran, „APLD a coborât sub stopul calculat ($26.087)”, „mediu $29.550” și „$93.150” stau lângă „28.940 lei”, „−10.545 lei” și „−1.029 lei”. Stopul de 26,087 $ se citește ușor ca 26 de mii, iar peste 100 $ formatul se schimbă („$1729.76”, fără separator de mii). Scannerul, în schimb, folosește virgula („0,5041”, „351,23”): trei convenții în aceeași aplicație.

**Dovada:** verif.mjs pe #t212, prețuri de forma $d.ddd: ["$26.087","$29.550","$24.620","$32.006","$34.437","$93.150","$90.100","$80.741","$29.211","$28.870","$25.662","$31.850","$31.219"]; lei cu punct de mii: ["28.940 lei","−1.904 lei","+4.239 lei","−10.545 lei"]. Poze: desk-05-t212.png, mob-05-t212.png.

**Reparația propusă:** t212Usd cu toLocaleString("ro-RO") (virgulă zecimală, punct de mii), la fel ca lei și ca scannerul: „$26,087” sau mai bine „26,09 $”. O singură funcție de formatare pentru toate prețurile.

verificator: **coborat** — În cod e real. t212Usd (t212-ecran.js:12) folosește toFixed(3) între 1 și 100 $ și toFixed(2) de la 100 $ în sus, fără separator de mii. t212Lei (linia 9) folosește ro-RO, unde punctul separă miile. Cifra afișată e însă corectă: e doar o convenție amestecată. Prețul de referință al acțiunii apare pe același rând („mediu $29.550”), deci citirea greșită ca 26 de mii e puțin probabilă pentru un om care își cunoaște pozițiile. Nu e o cifră greșită pe care decide, ci o inconsecvență de format. Merită unificat, dar ca sugestie.

### 🔵 Cartela „Câștigat real, închise +4.239 lei” are o explicație care nu dă 4.239
`C:\Users\Cimin\crypto\public\lib\t212-ecran.js:151` · lentila: cifre care nu se adună

Sub cifră scrie „T212 arată +10.551 (tăiat) · comisioane −6.316 · dividende +50,94”. Omul adună: 10.551 − 6.316 = 4.235, iar cu dividendele 4.286; nici una nu dă 4.239. Cifra vine din jurnalul FIFO (j.r.total), iar explicația din alt calcul (c.result), deci nu se reconciliază.

**Dovada:** verif.mjs/verif4.mjs: "CÂȘTIGAT REAL, ÎNCHISE +4.239 lei T212 arată +10.551 · comisioane −6.316 · dividende +50,94" (la 1920 și 390). Poză: desk-05-t212.png.

**Reparația propusă:** Fie dividendele scoase din rândul explicativ (dacă nu intră în 4.239), fie un rând „diferență +4 lei (rotunjiri / trade-uri fără cumpărare în istoric)”, astfel încât părțile să dea totalul.

### 🔵 Pe telefon, bara de jos duce la ecrane vechi („Signals”, „Market”), iar Tabloul, T212, Gridul și Jurnalul sunt în sertarul „More”
`C:\Users\Cimin\crypto\public\index.html:2269 (mobileBottom), 2275 (moreGrid)` · lentila: navigație mobil

Bara de jos: Home · Scan · Signals · Market · More. Signals (Signal Lab, 546 de caractere, „LONG CONFIDENCE — —”) și Market (Market Overview, în engleză) sunt ecrane din motorul vechi. Ecranele lui zilnice (Tablou bot, Grid, Jurnal, Trading 212) cer două atingeri, prin sertar. În plus, antetul lipit sus are 139 px (CRV/USDT + cipurile 4h/AUTO/BINANCE + bara botului pe 2 rânduri + WS/LIVE DATA/versiune), iar bara de jos 71 px: 210 din 844 px (25 %) sunt ocupați permanent.

**Dovada:** probe.mjs mob: bara de jos=['dash','scan','signals','market'], iar sertarul începe cu ['tabloubot','gridset','jurnaltrade','deschideT212',…]. verif.mjs: {jos:71, sus:139, susPozitie:'sticky'}. Poze: mob-00-pornire.png, mob-02-tabloubot.png.

**Reparația propusă:** Bara de jos: Acasă · Tablou · T212 · Grid · Mai mult. Signals și Market merg în sertar. Pe telefon, cipurile 4h/AUTO/BINANCE/WS/versiune se ascund sau se strâng într-un rând.

### 🔵 Aproximativ 35 din cele 47 de ecrane ale meniului sunt vechi, în engleză, și arată doar „—” până apeși „Analizează piața”
`C:\Users\Cimin\crypto\public\index.html:10-56 (sideMenu)` · lentila: curățenie meniu / limbă

Engine (388 de caractere de text), Volume Profile (203), Risk Manager (204), Scenario (180, „Run analysis first”), Correlation (158), Futures (204), Order Book (210), Strategy Analytics (257) și altele sunt pline de „—”/„N/A”, fără o frază care să spună ce trebuie făcut. Limba e amestecată chiar pe ecranele noi: meniul spune „Dashboard” pentru pagina „Piața azi”, „Alert Center” și „Clear” stau deasupra „Alertelor de acasă”, bara de jos spune „Home”. Nimic nu crapă, dar meniul de 47 de rânduri îngroapă cele 7 ecrane pe care le folosește.

**Dovada:** probe.mjs desk: lungimea textului pe ecran: engine 388, mtf 273, profile 203, riskmgr 204, correlation 158, analytics 257, scenario 180, depth 210, deriv 204. Începuturi: „Quant Engine … ADAPTIVE SIGNAL ENGINE — Confluență — MARKET REGIME —”.

**Reparația propusă:** Grupează ecranele vechi sub un singur „Laborator (motorul vechi)” pliat. Pe fiecare pune o frază goală explicită: „Apasă Analizează piața ca să se umple”. Redenumește în română cele 5 etichete de pe ecranele noi.

### 🔵 Butonul „Clear” de pe Alerte șterge doar alertele vechi din browser, nu pe cele 100 de acasă pe care le vezi
`C:\Users\Cimin\crypto\public\index.html:451; app.js:2967` · lentila: UX / buton înșelător

„Clear” stă în antetul „Alert Center”, chiar deasupra listei „Alertele de acasă”. clearAlerts() șterge doar localStorage „radarAlerts” (motorul vechi) și arată „Alerts cleared”, dar cele 100 de alerte ale colectorului rămân pe ecran. Nu cere nici confirmare.

**Dovada:** Citit în cod: index.html:451 <button … data-action-click="clearAlerts()">Clear</button>; app.js:2967 function clearAlerts(){localStorage.removeItem("radarAlerts");…toast("Alerts cleared")}. În verif.mjs, antetul ecranului e "Alert Center\nClear". Poze: desk-06-alerts.png, mob-06-alerts.png. (Nu l-am apăsat.)

**Reparația propusă:** Mută butonul lângă blocul vechi „Active rule set” și redenumește-l „Golește alertele vechi din browser”, sau scoate-l dacă blocul vechi nu mai e folosit.

### 🔵 Tabelul „Pozițiile” din Trading 212 nu încape la 1920 px: derulare laterală și ultima coloană tăiată
`C:\Users\Cimin\crypto\public\lib\t212-ecran.js:tabelul „Pozițiile” (grTabelWrap)` · lentila: layout desktop

Coloana de conținut e limitată la aproximativ 1180 px, iar tabelul pozițiilor are 1044 px într-un container de 860 px (overflow-x:auto). Ultima coloană (bifa planului) se vede doar pe jumătate, cu bară de derulare sub tabel, chiar pe un monitor Full HD.

**Dovada:** verif.mjs t212TabelLat la 1920: {tw:1044, pw:860, ox:'auto', cap:'Acțiune'}. Poză: desk-05-t212-b.png (bara de derulare sub tabel, coloana ✓ tăiată).

**Reparația propusă:** Pe ecran lat, „Vreau să cumpăr” și „Portofoliul” merg sub tabel sau se îngustează; alternativ, coloana TREND se strânge cu DIN CONT.

### 🔵 Antetul Jurnalului spune „2203 boți închiși” și pe tabul Acțiuni, iar corpul spune „2256 trade-uri (2256 boți)”
`C:\Users\Cimin\crypto\public\lib\jurnal-trade.js:antetul „boți închiși · citit la”` · lentila: etichete

2203 sunt doar boții futures grid; 2256 include cele 30 de spot grid și cele 23 de smart copy. Pe același ecran apar două numere pentru „boți închiși”, iar antetul Pionex rămâne și pe tabul „Acțiuni · Trading 212”.

**Dovada:** verif3.mjs, antetul pe tabul Acțiuni: „📓 Jurnal de trade 2203 boți închiși · citit la 19:36 … 📈 Acțiuni · Trading 212”. Poza desk-04-jurnaltrade.png: „2256 trade-uri închise … toată istoria Pionex (2256 boți) · inclusiv 30 spot grid și 23 smart copy”.

**Reparația propusă:** Antetul arată numărul tabului curent (Pionex 2256 / T212 1066 / Tot) sau scrie „2203 futures grid + 53 alte”.

### 🔵 Cipul „WS” din antet stă mereu gri, lângă „LIVE DATA” verde
`C:\Users\Cimin\crypto\public\app.js:16-33 (wsStatus)` · lentila: indicator fără sens

Cipul arată socketul motorului vechi, care pornește doar după „Analizează piața”. Pe toate cele 47 de ecrane rămâne „● WS” gri, fără LIVE/ERROR/RETRY, deși prețul botului vine live din Pionex. E o culoare fără semnificație care sugerează o conexiune picată.

**Dovada:** Toate pozele (desk-0x, mob-0x): cipul „● WS” gri în antet, pe tot parcursul probei.

**Reparația propusă:** Ascunde cipul până pornește socketul vechi, sau leagă-l de prețul viu al botului (/api/pret-viu).

**Ce a probat:** Toate probele au rulat în Chrome headless real, prin CDP, pe profil temporar. Nu a rămas niciun Chrome deschis și niciun profil pe disc. Scripturile sunt în scratchpad\ux: probe.mjs, butoane.mjs, verif.mjs, verif2.mjs, verif3.mjs, verif4.mjs, suita.mjs.

Siguranța probelor:
- Tokenul din .dev.vars l-am pus în localStorage-ul profilului temporar, înainte de scripturile paginii.
- Un paznic injectat bloca orice cerere non-GET, Discord și sendBeacon, iar alert/confirm/prompt erau stinse. Au fost oprite 3 cereri POST /api/istoric-bot?action=plan (din „Pune planurile la ea” și dintr-un rând al clasamentului). Nimic nu a ajuns pe server.
- Serverul 8788 și colectorul (PID 14972) nu au fost atinse. Serverul temporar pentru suită (python pe 8129) l-am oprit la final.

Ce a ieșit:
1. **Toate cele 47 de ecrane `[data-nav]`, la 1920×1080** (clic pe butonul din meniu): 0 excepții JS, o singură eroare de consolă (/api/intel știri, 502, cunoscut), 0 cereri picate, 0 texte „undefined/NaN/null/[object Object]/Infinity”, 0 elemente peste marginea paginii.
2. **Aceleași 47 de ecrane la 390×844**, pe drumul telefonului (bara de jos și sertarul More): aceleași rezultate, fără derulare laterală. Singurul ecran care nu se poate deschide de pe telefon e „stocks”, care e ascuns oricum în modul crypto.
3. **Cererile /api la deschiderea fiecărui ecran:** T212 face 22 de cereri /api/t212 + 8 știri + 7 planuri; toate sunt acoperite de cache-ul serverului.
4. **Aproximativ 330 de clicuri** pe butoanele Tablou, Grid, Jurnal, T212, Acasă, Scan și Alerte: 0 excepții, 0 dialoguri blocante.
5. **Poze privite una câte una:** 40 de PNG-uri, printre care Acasă, Tablou (sus și jos), Grid, Jurnal Pionex și Acțiuni, Declarație, T212 (sus și jos), Alerte, Scan (desk și mob), Tablou „Ce ai de făcut” pe telefon, pagina alerts a suitei (desk și mob).
6. **Declarația 2025/2026 pe două drumuri:** direct în Jurnal, apoi după ecranul T212.
7. **Lista „Ce ai de făcut acum”** citită din DOM, cu ora și culoarea fiecărui rând.
8. **Pagina alerts a suitei**, servită local fără cheie de citire: 0 excepții, 0 erori, fără derulare laterală la 390, starea „fără cheie” se explică singură.

Notă de transparență: în scratchpad-ul comun am suprascris din greșeală cdp.mjs, fișierul altui agent (folosit de proba1.mjs). L-am refăcut imediat cu API compatibil (porneste/du/ev/exceptii/retea/consola/inchide, window.__p.ws/ivActive/api), iar al meu l-am mutat în scratchpad\ux\.

**Ce NU a probat:** 1. **Un telefon real și tunelul/Tailscale:** am folosit doar emularea la 390×844 cu atingere simulată. Țintele de atingere și gesturile reale nu le-am măsurat.
2. **Pagina alerts a suitei cu poza reală:** nu am cheia de citire a worker-ului (CHEIE_CITIRE e secret pe Cloudflare). Am văzut doar starea „fără cheie”, nu randarea pozițiilor și a boților din poză.
3. **Detectorul de „buton care nu face nimic” nu e concludent.** Graficele live și sondajele de fundal fac prea mult zgomot în contorul de mutații și de cereri. Rezultatele marcate NIMIC s-au dovedit fals-pozitive acolo unde am verificat în cod (de exemplu gridCalculeaza cu moneda goală afișează o eroare). Nu raportez niciun buton mort.
4. **Butoanele pe care nu le-am apăsat, intenționat:** cele care scriu sau șterg (Clear, Salvează, L-am pus, Pornește pe hârtie, Reîncarcă/Reîmprospătează, Instalează), ecranele vechi (în afara celor 7 principale) și Setările.
5. **Starea de pe 28.09 „Tabloul arată ȚINE cât încă socotește”:** nu am putut-o reproduce, pentru că datele erau deja calculate la deschidere.
6. **Corectitudinea matematicii:** nu am verificat grile, v100.38 pe liniile Pionex, FIFO sau cursul BNR. Am comparat doar cifrele între ecrane (T212 4.239 = Jurnal Acțiuni 4.239; Declarația 2025 + 2026 = −1.208,56 + 5.447,50 = 4.238,94 ≈ 4.239).
7. **Cartela de verdict ascunsă #tbVerdictCard** („REGLEAZĂ · amplitudine = 0.7062682215743448×”) calculează un al doilea verdict, diferit de semafor, dar e ascunsă, deci omul n-o vede. N-am raportat-o ca defect de ecran.
8. **Offline, reinstalarea PWA și service worker-ul:** nu le-am probat, pentru că am ocolit intenționat service worker-ul.
9. **Contrastul culorilor:** nu l-am măsurat numeric (WCAG); l-am judecat doar din poze.

## Teste, gărzi și igienă

Am auditat testele, gărzile și igiena de exploatare ale Crypto Radar (d423f81, v100.38). `npm test` e verde: 70 de comenzi node, 4.523 de aserțiuni, 105 s, cod de ieșire 0. Suita e ermetică: fetch-ul e simulat, nu atinge serverul 8788, nu scrie în depozit, iar git status a rămas 0. Doar ~104 aserțiuni (~2–8 %) verifică textul codului în loc de comportament.

Gărzile de sintaxă țin: am stricat colectorul, worker-ul paznicului și o bibliotecă tura-*, iar suita a prins toate trei stricările. Reparațiile auditului din 28.09 care țin de unghiul meu țin și ele: .wrangler a scăzut de la 376 MB la 28 MB, rădăcina e curată, cele 10 funcții moarte au dispărut.

Am găsit însă cinci probleme serioase:
1. Regula v100.38 („row = linii”) NU a ajuns în „Din grile / din direcție”. La un bot spot, profitul se împarte greșit: 2,25 din grile și 2,68 din direcție, în loc de 4,93 din grile și 0 din direcție.
2. Garda v100.38 de pe graficul Tabloului e un regex care se potrivește și pe codul stricat. Am stricat graficul pe copie și toate cele 70 de comenzi au rămas verzi.
3. Șapte aserțiuni sunt moarte, înghițite de comentarii puse la mijlocul liniei. Trei dintre ele le-a omorât chiar commit-ul v100.38.
4. Jurnalul colectorului tace complet dacă un cititor îl ține deschis în momentul rotirii de la 1 MB.
5. Copiile KV-ului stau doar pe C:. Dacă moare discul azi, se pierd istoriile celor 13 boți, cele 18 planuri și alertele.

### 🟡 „Din grile / din direcție” (Tablou, boți spot) tratează încă row ca intervale — regula v100.38 n-a ajuns aici
`C:\Users\Cimin\crypto\public\app.js:5528 (și public/lib/grid-umpleri.js:60-61)` · lentila: gărzi / v100.38 peste tot

tbRandUmpleri trimite grile: Number(bu.row) către GridUmpleri.imparte. Acolo, grid-umpleri.js:60-61 construiește niveluri(jos, sus, grile), adică grile+1 niveluri, cu pasul (sus/jos)^(1/grile)−1. Rezultatul: o linie în plus și pasul greșit. Umplerile aflate exact pe liniile Pionex ajung clasate „în afară de nivel”, iar profitul din grile e trecut la „din direcție”. Drumul e deschis doar pentru boții non-PERP (tbUmpleriPosibile). În arhivă sunt 30 de spot_grid din 2.256 de boți; acum rulează un singur bot, PERP, deci eroarea e latentă. Devine cifră greșită pe ecran când pornește un bot spot. Niciun test nu cheamă tbRandUmpleri sau imparte cu un row real.

**Dovada:** Scratchpad umpleri.mjs: bot spot geometric 1–2, row=5, deci liniile Pionex 1 · 1,1892 · 1,4142 · 1,6818 · 2. Patru umpleri pe aceste linii (BUY 1,4142 → SELL 1,6818, BUY 1,1892 → SELL 1,4142). Ieșire: „app.js azi (grile = row = 5): din grile 2.250, din directie 2.676, la nivel 2, in afara 2” față de „regula v100.38 (grile = row − 1 = 4): din grile 4.926, din directie 0.000, la nivel 4, in afara 0”.

**Reparația propusă:** În app.js:5528: grile: Math.max(0, (Number(bu.row)||0) - 1). Plus o probă care cheamă imparte/tbRandUmpleri cu brut.buOrderData.row real (ex. CRV row 8) și umpleri pe liniile Pionex, cu așteptarea „din direcție = 0”.

verificator: **confirmat** — Se ține în cod. app.js:5528 trimite `grile:Number(bu.row)` direct în GridUmpleri.imparte. grid-umpleri.js:60-61 face G.niveluri(jos,sus,grile), adică grile+1 niveluri, cu pasul (sus/jos)^(1/grile)−1. Commit-ul d423f81 a trecut pe row−1 în TabloExtra, SemnaleBot, JurnalTrade și GraficBot, dar nu și aici (grep `.row` în app.js dă doar liniile 5528, 6104 și 6106). Am reprodus pe modulul real, încărcat în vm (scratchpad verif_umpleri.mjs), cu un grid geometric 1–2 și row=5. Dovada agentului exagerează efectul: exemplul lui cu 2 perechi NU ajunge ca cifră pe ecran. Garda de 70% de la grid-umpleri.js:120 îl oprește cu „umplerile nu cad pe nivelurile gridului (2 din 4): nu pot imparti”. La fel pentru row=11 cu 10 perechi: „7 din 20”, deci refuz, cu row−1 ar fi fost 20/20. Cifra greșită apare doar sub 4 umpleri: o pereche dă „din grile 0,000 / din direcție 0,268” în loc de „0,268 / 0”. La un grid des (row=41, 0,3%, umpleri jos în interval), ambele variante au dat același rezultat. Efectul real pentru un bot spot: rândul refuză de cele mai multe ori să împartă (funcția e stricată) și arată o împărțire greșită la primele umpleri. Totul e latent, pentru că tbUmpleriPosibile exclude PERP și acum rulează doar un bot PERP. Rămâne logică fragilă și o regulă v100.38 nepropagată, deci serios.

### 🟡 Garda v100.38 pe graficul Tabloului e un regex pe text care acceptă și codul stricat
`C:\Users\Cimin\crypto\scripts\proba-v10038.mjs:81` · lentila: teste care trec din motivul greșit

proba-v10038 verifică graficul cu assert.match(corp, /linii:botiNr\(xo\.row\)/). Regex-ul se potrivește ca subșir și pe „linii:botiNr(xo.row)-1”, adică exact bug-ul reparat în v100.38 (o linie decalată). Niciun alt test din lanț nu execută construcția obiectului grila din app.js.

**Dovada:** Pe o copie a depozitului am înlocuit în public/app.js „linii:botiNr(xo.row),” cu „linii:botiNr(xo.row)-1,” și am rulat toate cele 70 de comenzi din npm test. Rezultat: „70 comenzi, picate 0”. Separat, proba-v10038 a dat 7/7, iar tablou-bot-v73, proba-v100 și grid-v78 au ieșit cu rc=0.

**Reparația propusă:** Pe termen scurt, ancorează regex-ul: /linii:botiNr\(xo\.row\),/. Corect ar fi să muți în lib (ex. GraficBot.grilaDinBot(b)) construcția {jos, sus, linii, geo, p0} și s-o testezi executând-o pe botul CRV (8 linii).

verificator: **confirmat** — Aserțiunea e de fapt la proba-v10038.mjs:79, nu la :81: `assert.match(corp, /linii:botiNr\(xo\.row\)/)`. Am rulat `node -e` cu același regex pe textul „linii:botiNr(xo.row)-1,” și a ieșit `true`. Regex-ul prinde deci exact regresia pe care o reparase v100.38. În plus, `corp` cuprinde și linia 6106 (GraficBot.umpleri), unde apare același subșir, așa că garda trece chiar dacă se strică doar linia 6104. `grep "xo\.row|linii:botiNr" scripts/*.mjs` găsește doar proba-v10038:79, deci niciun alt test nu execută construcția obiectului grila din app.js. Rularea celor 70 de comenzi pe copie n-am refăcut-o, dar mecanismul e dovedit direct. Nu e un defect la rulare: e o gardă care nu păzește o reparație importantă, deci serios la limită.

### 🔵 7 aserțiuni moarte, înghițite de un comentariu `//` pus la mijlocul liniei (3 dintre ele omorâte chiar de commit-ul v100.38)
`C:\Users\Cimin\crypto\scripts\proba-v99.mjs:143 (și proba-v10038.mjs:84, proba-v10025.mjs:195)` · lentila: teste care trec din motivul greșit

Pe trei linii, un comentariu adăugat prin editare a transformat restul liniei în comentariu. proba-v99.mjs:143 nu mai verifică „18,5 perechi”, „din interval” și „5 umpleri”. proba-v10038.mjs:84 nu mai verifică legenda „perechi pe grafic: 1 · Pionex: 1” și „8 linii”, deși titlul testului le promite. proba-v10025.mjs:195 nu mai verifică doesNotMatch „doar ultimii”. Le-am redat pe copie și toate trec azi, deci nu ascund un bug acum. Dar gărzile nu mai păzesc nimic, iar tiparul se repetă (v100.27, v100.38).

**Dovada:** `git show d423f81 -- scripts/proba-v99.mjs`: linia „-… /46 grile/); assert.match(grid.text, /18,5 perechi/)…” a devenit „+… /47 grile/);   // v100.38: … (linii) assert.match(grid.text, /18,5 perechi/)…”. `grep 'assert[^;]*;[ ]*//.*assert'` găsește exact 3 linii. Cu comentariile scoase, pe copie: V99 10/10, v10025 14/14, v10038 7/7. Legenda reală: „…banda și treptele gridului (8 linii)… perechi pe grafic: 1 · Pionex: 1”.

**Reparația propusă:** Mută comentariile pe rânduri proprii. Adaugă în garzi-v746 o gardă care pică pe orice linie din scripts/*.mjs ce se potrivește cu /;\s*\/\/.*\bassert\./.

verificator: **coborat** — Faptele se țin. `grep -nE 'assert[^;]*;[ ]*//.*assert' scripts/*.mjs` dă exact 3 linii: proba-v99.mjs:143 cu 3 aserțiuni moarte (18,5 perechi, din interval, 5 umpleri), proba-v10038.mjs:84 cu 2 (legenda „perechi pe grafic: 1 · Pionex: 1” și „8 linii”) și proba-v10025.mjs:195 cu una (doesNotMatch „doar ultimii”). Numărătoarea „7” nu se potrivește: eu număr 6. Blame-ul arată commit-ul v100.27 d92b996 pentru v10025. Agentul însuși spune că, redate, toate trec azi, deci nu ascund niciun bug acum. E igienă de teste, nu risc la rulare, deci sugestie. Merită totuși o gardă de lint pentru tiparul `; // ... assert`, care s-a repetat.

### 🔵 Jurnalul colectorului tace complet dacă rotirea de la 1 MB eșuează: rename și append stau în același try/catch gol
`C:\Users\Cimin\crypto\scripts\colector.mjs:43` · lentila: igienă de exploatare

jurnal() face renameSync(LOG, LOG+'.vechi') și apoi appendFileSync în același try, cu catch {}. Dacă redenumirea pică (fișierul e ținut deschis fără FILE_SHARE_DELETE de Get-Content -Wait, un editor .NET sau un antivirus), linia nu se mai scrie. Fișierul rămâne peste 1 MB, așa că fiecare linie următoare repetă eșecul: jurnalul e mut, fără niciun semn, cât timp ține cititorul. Jurnalul are 298 KB după 6 zile (~50 KB/zi), deci atinge pragul în ~2 săptămâni. tail -f din Git nu blochează. Nimic din casă nu folosește acum Get-Content -Wait pe jurnal (grep gol), deci riscul depinde de o unealtă externă.

**Dovada:** Scratchpad rot.mjs, o copie fidelă a jurnal(), pe un fișier de 1.000.100 B. Cu un cititor [System.IO.File]::Open(…, 'Read', 'ReadWrite') deschis: „catch: EBUSY” ×5, „pierdute: 5, marime acum: 1000100, .vechi exista: false”. Cu tail.exe -f din Git: „pierdute: 0, .vechi exista: true”.

**Reparația propusă:** Pune rotirea în try-ul ei; append-ul se face oricum (la nevoie, fișierul crește peste prag). Numără eșecurile rotirii și scrie-le o dată în jurnal sau în poză.

verificator: **coborat** — Mecanismul e real. La colector.mjs:43, renameSync și appendFileSync stau în același `try{...}catch{}`, deci dacă rename-ul pică, linia se pierde, iar condiția `size > 1_000_000` rămâne adevărată la fiecare linie. Dar declanșatorul e o unealtă externă care ține fișierul deschis fără FILE_SHARE_DELETE. Agentul recunoaște că în casă nu există nimic de felul ăsta, iar tail -f nu blochează. Jurnalul are acum 300.521 B. Colectorul însuși continuă să lucreze. Sănătatea lui se vede și fără jurnal: pid-ul are bătaie de inimă, iar poza are ora ei. Tăcerea atinge deci doar diagnosticul, nu datele și nici alertele. Risc mic și condiționat, deci sugestie: append-ul trebuie scos din try-ul rename-ului.

### 🟡 Copiile KV-ului stau doar pe același disc (C:\…\crypto\data\copii); istoriile boților, planurile și alertele nu au nicio copie în afara lui C:
`C:\Users\Cimin\crypto\scripts\lib\copie.mjs:7-15 (chemat din colector.mjs:697)` · lentila: ce se pierde dacă moare C:

faCopie scrie zilnic în data/copii, pe același disc cu originalul, și păstrează 14 zile. Casa are deja tiparul corect: sarcina „Paznic Copie Zilnica” copiază PAZNIC-CRYPTO pe E:\PAZNIC-CRYPTO-backup (ultima rulare 30.09 03:30, rezultat 0), dar Crypto Radar nu e inclus. Pe E: nu există nicio copie kv-*. Dacă moare C: azi, codul e salvat (main = origin/main d423f81). Se pierd irecuperabil ist:2382–2394 (13 boți, ~1,6 MB de istorie adunată la 2 min), plan:* (11 boți + 7 poziții T212), alerte, semnale:*, contrafactual. Se pot reface, dar cu multe cereri și cu riscul limitelor de ritm: t212:umpleri, cf, ordine (~840 KB, din T212) și botiInchisi (1,3 MB, 226 de pagini Pionex). .dev.vars (9 chei: APP_API_TOKEN, Pionex, T212, Discord, PAZNIC_*) se reface de mână. Arhiva botiInchisi a apărut pe 30.09 la 07:48, după copia de la 03:00, deci azi nu există în nicio copie.

**Dovada:** kvcheck.py pe copii în scratchpad: „live integrity=ok chei=68”, „kv-2026-09-30 integrity=ok chei=56” (fără botiInchisi), 6/6 copii ok, 0 blob-uri lipsă. `find /e -maxdepth 4 -iname 'kv-2026*'` nu întoarce nimic. Get-ScheduledTask arată „Paznic Copie Zilnica” → porneste-copie-ascuns.vbs → copie-de-siguranta.mjs cu TINTA = „E:\PAZNIC-CRYPTO-backup\zilnic”. Jurnalul: „arhiva boti inchisi: 2253 noi … 07:48”.

**Reparația propusă:** Adaugă o a doua destinație în faCopie (ex. E:\crypto-radar-backup\kv-<zi>, sare dacă E: lipsește) sau include .wrangler\state\v3\kv în copie-de-siguranta.mjs din PAZNIC-CRYPTO. Păstrează separat o copie criptată a .dev.vars sau pune cheile într-un manager de parole.

verificator: **confirmat** — copie.mjs:7-15 și colector.mjs:697 scriu în data/copii pe C:, cu 14 zile păstrate (acum kv-2026-09-28..30 sunt ultimele). Pe E: există PAZNIC-CRYPTO-backup, backup-gestiune, pine-scripts-backup și Backup-Claude. `find /e -maxdepth 4 -iname 'kv-2026*'` nu întoarce nimic. Backup-Claude/_config/watchlist.json acoperă doar fișierele HTML crypto-scanner, nu depozitul crypto și nici .wrangler/state. Nu e o hotărâre conștientă notată. Dacă se strică discul C:, se pierde istoria adunată la 2 minute, care nu se poate reface. Nu sunt bani în pericol direct, dar e o fiabilitate slabă reală, deci serios.

### 🔵 22 de scripturi v54–v57 nechemate (3 crapă); printre ele, singurele teste de comportament pentru research-worker.js, cod încă viu
`C:\Users\Cimin\crypto\scripts:test-v57.mjs, verdict-v57.mjs, readiness-v57.mjs` · lentila: scripturi moarte / acoperire pierdută

audit-, findings-, test-, syntax-v54…57, security-v54…56, verdict-v56/57, readiness-v57 și predeploy-v54 nu sunt referite de nimic în afară de manifestele din docs/arhiva-chatgpt. readiness-v57 crapă („ReferenceError: prExpCi is not defined”), iar audit-v57 și findings-v57 crapă cu ENOENT. În schimb, test-v54/v57 și verdict-v57 trec azi (V57_RUNTIME_PASS worker_logistic=14 stumps=12 cvd=130 mc_deterministic=1). Ele exersează research-worker.js (regresie logistică, stumps, Monte Carlo) și sortarea CVD din external-intel. research-worker.js e încă încărcat de app.js (new Worker("/research-worker.js")) și pus în cache de sw.js, dar în npm test apare doar la syntax/garzi (--check).

**Dovada:** Script clasif.py: 35 de .mjs neatinse de npm test. Pe copie: test-v57 → V57_RUNTIME_PASS; verdict-v57 → V57_VERDICT_EXPLAINER_PASS; readiness-v57 → ReferenceError prExpCi; findings-v57 → ENOENT AUDIT_V57_FINDINGS.json. `grep -l 'logistic|stump|monteCarlo'` pe testele din lanț găsește doar garzi/syntax.

**Reparația propusă:** Leagă test-v57 și verdict-v57 în npm test (câteva secunde). Mută restul v54–v57 în docs/arhiva-chatgpt/scripts sau șterge-le.

### 🔵 Pe o clonă proaspătă npm test pică, iar predeploy blochează `npm run deploy`
`C:\Users\Cimin\crypto\scripts\colector-v77.mjs:276-280 (și proba-v10036.mjs:11, proba-v10038.mjs:87)` · lentila: recuperare după dezastru

colector-v77, testul „colector.mjs SE INCARCA intreg”, pornește colectorul real, iar acesta citește .dev.vars (ENOENT fără el). proba-v10036 și proba-v10038 citesc C:/Users/Cimin/pine-scripts/GRID-FISA/*.pine pe cale absolută, iar pine-scripts nu e depozit git (există o copie pe E:\pine-scripts). După pierderea discului și o clonă de pe GitHub, suita e roșie până se refac manual cheile și dosarul Pine. v10036 păzește încă Grid_Fisa_v2_0.pine, versiunea veche; omul lucrează pe v2.1.

**Dovada:** Pe copia fără .dev.vars: „PICA colector.mjs SE INCARCA intreg … ENOENT … rep\.dev.vars”, „V77_COLECTOR FAIL 31/32”. Cu un .dev.vars fals (APP_API_TOKEN=proba-falsa): „INCARCAT true” și suita verde. `git -C pine-scripts` dă „fatal: not a git repository”.

**Reparația propusă:** Cu COLECTOR_DOAR_INCARCA=1, colectorul să nu ceară .dev.vars. Probele Pine să raporteze „SARIT – lipsește pine-scripts” în loc să pice, sau Pine-ul să intre în depozit.

### 🔵 Bombă de versiune: 6 probe pică la prima trecere a colectorului pe v102
`C:\Users\Cimin\crypto\scripts\proba-v10027.mjs:95 (și v10025:166, v10026:147, v10029:83, v10032:45, v10033:62)` · lentila: gărzi fragile

Probele v10025/26/27/29/32/33 cer ca VERSIUNE_COLECTOR să se potrivească cu /v101\.(1[3-9]|[2-9]\d)/ și variante. La v102.0 sau la v101.100 pică toate, fără nicio legătură cu vreun defect.

**Dovada:** Pe copie, cu colector.mjs pus pe „v102.0”: v10025 rc=1, v10026 rc=1, v10027 rc=1, v10029 rc=1, v10032 rc=1, v10033 rc=1.

**Reparația propusă:** Comparație numerică într-un helper comun: major > 101 || (major == 101 && minor >= N).

### 🔵 `npm test` = 58 de `npm run` legate cu && (se oprește la prima picată, fiecare versiune cere editare manuală); 46 din 105 s sunt lansatoare-viu
`C:\Users\Cimin\crypto\package.json:scripts.test` · lentila: arhitectura suitei

Lanțul arată doar prima probă picată, iar fiecare proba-v100NN nouă trebuie adăugată de mână în două locuri din package.json (azi toate sunt legate, dar se poate uita una). garzi-v746 durează 46,7 s, aproape toate în secțiunea lansatoare-viu (cmd, PowerShell și servere false); fără ea, 0,9 s. Harness-ul test() e copiat în 63 de fișiere. Sunt 142 de încărcări new Function(lib(...)), iar în 25 de fișiere funcțiile se extrag din app.js numărând acoladele, fără să țină cont de acoladele din șiruri sau regex.

**Dovada:** Script timp.py: 70 de comenzi, 107,4 s în total, garzi-v746 46,7 s, market-futures 12,2 s, bot-orders 11,7 s. `node scripts/garzi-v746.mjs --fara=lansatoare-viu`: rc=0 în 895 ms. `grep -l 'async function test(nume'`: 63 de fișiere.

**Reparația propusă:** Un runner scripts/ruleaza-probe.mjs care descoperă scripts/proba-*.mjs și lista fixă, le rulează pe toate și raportează toate picăturile. lansatoare-viu să ruleze doar dacă `git diff --name-only` atinge *.bat, plus mereu în predeploy. Un scripts/lib/proba.mjs comun cu test(), functia() și incarcaLib().

### 🔵 Jurnalul trade-urilor dă row (linii) la levierSigur, care așteaptă intervale; impactul măsurat e neglijabil
`C:\Users\Cimin\crypto\public\lib\jurnal-trade.js:70` · lentila: gărzi / v100.38 peste tot

pasNet a fost trecut corect pe row−1 în v100.38. Linia 70 cheamă însă G.levierSigur(…, Math.min(150, t.grileN)) cu grileN = row, iar niveluri(jos, sus, N) construiește N+1 niveluri. Rezultă o linie în plus la calculul lichidării.

**Dovada:** Script levier.mjs pe arhiva reală botiInchisi (copie a KV-ului viu): „tranzactii cu date: 2156 | levierul sigur difera (row vs row-1): 1 | verdictul «levier peste cel sigur» se schimba: 0” (singurul caz: row=2, sigur 5 față de 4).

**Reparația propusă:** Math.min(150, t.grileN - 1), ca să rămână consecvent cu pasNet.

### 🔵 3 procese `tail -n 0 -f data/colector.log` orfane, rămase de la unelte de monitorizare ale unor sesiuni anterioare
`C:\Users\Cimin\crypto\data\colector.log:` · lentila: procese orfane

PID 5544, 24980 și 16544 au pornit pe 30.09 la 07:21, 07:49 și 08:00. Părinții lor (18632, 2316, 14844) nu mai există. Forma comenzii (tail -n 0 -f) și orele se potrivesc cu o sesiune Claude care urmărea jurnalul, nu cu aplicația. Țin ~6 MB fiecare și NU blochează rotirea jurnalului (tail din msys partajează ștergerea; probat mai sus). Colectorul viu (PID 14972) se potrivește cu data/colector.pid.

**Dovada:** Get-CimInstance Win32_Process: tail.exe 5544 (părinte 18632), 24980 (părinte 2316), 16544 (părinte 14844); pentru fiecare părinte, Get-CimInstance → „NU MAI EXISTA”. colector.pid = „14972 1790785513445”.

**Reparația propusă:** `taskkill /PID 5544 /PID 24980 /PID 16544` (de făcut de el). În sesiunile de lucru, orice Monitor sau tail pornit se oprește la final.

### 🔵 Zgomot în jurnal și cereri inutile: COTIUSDT cerut la Yahoo de 512 ori pe zi, cu 404 de fiecare dată
`C:\Users\Cimin\crypto\data\colector.log:` · lentila: igienă de exploatare

Poza cere la Yahoo „inchideri” și „extra” pentru COTIUSDT, o monedă care nu există acolo, la fiecare tură. Mai apar „contrafactual PUMPFUN symbol error” ×58, LIGHTER ×22 și ONDOUSDT 404 ×22. Umple jurnalul, face ~512 cereri externe inutile pe zi și ascunde liniile care contează.

**Dovada:** Ultimele 24 h (1.444 de linii): „256 poza: inchideri COTIUSDT Yahoo HTTP N”, „256 poza: extra COTIUSDT Yahoo HTTP N”, „58 contrafactual PUMPFUN symbol error”. Poza s-a urcat de 567 de ori, fără goluri de peste 6 min.

**Reparația propusă:** Memorează 404/„symbol error” pe simbol pentru 24 h (în data/poza-ext.json) și scrie în jurnal o singură dată.

### 🔵 Copii vechi de .dev.vars în clar; una are o cheie T212 diferită de cea curentă
`C:\Users\Cimin\crypto\.dev.vars.inainte-de-chei:` · lentila: secrete pe disc

.dev.vars.inainte-de-chei (25.09) și .dev.vars.inainte-de-discord stau lângă .dev.vars. Sunt ignorate corect de git (.dev.vars*), deci nu e o scurgere. Dar .dev.vars.inainte-de-chei are o cheie T212 diferită de cea activă: dacă n-a fost revocată, e o cheie validă în plus lăsată pe disc; dacă a fost revocată, fișierul e gunoi.

**Dovada:** Comparație sha256 pe valori (neafișate): T212_API_KEY acum=47c78c57, inainte-de-chei=3568afed, inainte-de-discord=47c78c57. `git check-ignore -v .dev.vars` → .gitignore:3:.dev.vars*.

**Reparația propusă:** El verifică în T212 dacă cheia veche e revocată, apoi șterge cele două copii.

**Ce a probat:** - `npm test` pe depozitul real: exit 0 în 105 s. Durata fiecărei comenzi, rulată direct: 70 de comenzi, 107 s; garzi-v746 ia 46,7 s, iar fără lansatoare-viu 0,9 s.
- Am numărat aserțiunile din cele 74 de fișiere de test: 4.523 în total, dintre care ~104 assert.match direct pe textul sursei, în 27 de fișiere.
- Proba prin stricare, pe o copie a depozitului din scratchpad:
  - sintaxă stricată în colector.mjs, paznic/worker.mjs și tura-arhiva-boti.mjs: toate prinse (1, 3 și 3 comenzi picate);
  - „linii:botiNr(xo.row)-1” în app.js: 0 din 70 picate;
  - colectorul pus pe v102.0: 6 probe picate;
  - aserțiunile înghițite de comentarii, redate: trec (10/10, 14/14, 7/7).
- Suita nu atinge rețeaua reală, serverul 8788 sau depozitul (fetch simulat; git status 0 înainte și după).
- GridUmpleri.imparte cu row față de row−1, pe umpleri sintetice așezate pe liniile Pionex reale.
- levierSigur cu row față de row−1 pe cele 2.156 de tranzacții reale din arhiva botiInchisi (copie a KV-ului).
- Integritatea KV-ului viu și a celor 6 copii zilnice, pe copii: PRAGMA integrity_check, chei, blob-uri.
- Căutarea copiilor pe E: și G:; sarcina „Paznic Copie Zilnica” și destinația ei.
- Rotirea jurnalului sub un cititor .NET și sub tail din Git, pe o copie fidelă a funcției jurnal().
- Procesele (Win32_Process) și părinții lor; data/colector.pid.
- Lansatoarele .bat: CRLF (`file`, numărare CR/LF), eol=crlf în .gitattributes, `git ls-files --eol`.
- Git: main = origin/main, cele mai mari fișiere urmărite, istoria (303 commit-uri) fără webhook-uri Discord sau topicul ntfy.
- Mărimi: .wrangler 28 MB, data 14 MB, data/copii 12 MB, jurnalul 298 KB din 24.09 (rotire la 1 MB).
- Statistica jurnalului pe 24 h.
- Reparațiile #6, #13 și #15 din auditul din 28.09: țin.
- Cheile din .dev.vars: doar numele și hash-uri, fără valori.

**Ce NU a probat:** - Nu am rulat probele de ecran în Chrome/CDP (proba-ecran-tablou, -grid, -t212, -analiza). Merg pe serverul viu și ar fi făcut cereri la Pionex/T212. Nu știu dacă mai sunt verzi.
- Nu am restaurat efectiv o copie KV într-un wrangler pornit; am verificat doar SQLite-ul și blob-urile.
- „Din grile / din direcție” nu l-am văzut pe ecran la un bot spot real (niciun bot spot activ acum). Am probat doar pe umpleri sintetice așezate pe liniile Pionex.
- Stricarea pe grafic a înlocuit doar prima apariție (desenul, app.js:6104), nu și a doua (umpleri, 6106).
- Nu am rulat lansatoarele reale, nu am oprit sau repornit nimic și nu am omorât procesele tail orfane.
- Nu am verificat dacă istoria T212 (umpleri, cf, ordine) se poate reface integral din API.
- Nu am citit canalul Discord.
- Căutarea de profiluri Chrome rămase în TEMP a expirat la listarea completă; pe tiparele știute (garda-v746-*, tablou-bot-proba*, *profil*) nu a găsit nimic.
- Nu am auditat conținutul docs/ dincolo de mărimi și referințe.
- Am copiat din greșeală .dev.vars în scratchpad; l-am șters imediat, iar la final am șters și copiile KV din scratchpad.

## Arhitectură și reziliență

Am auditat arhitectura și reziliența lanțului Crypto Radar v100.38: sursele (Pionex, T212, Yahoo, Binance, BNR) → serverul wrangler 8788 → colector → KV local, worker-ul paznic-radar, apoi pagina alerts, Discord și telefonul (prin Tailscale). Am lucrat pe viu: jurnalul colectorului pe 6 zile, KV-ul worker-ului citit prin API, Health cerut de acasă și prin Tailscale, sarcinile de pornire din Windows, copiile KV și o probă pe liniile reale din trimiteAlerta.
Concluzie: reparațiile din 28.09 țin (0 limitări T212 pe 29–30.09; ~700 de scrieri KV pe zi; cronul */10 e la locul lui; Health de acasă e cinstit; urmele wrangler au scăzut la 30 MB). Botul CRV are opritorul pornit chiar în Pionex (0,3847), deci lichidarea nu depinde de PC.
Rămân însă șase goluri serioase de reziliență. (1) Când pică serverul, colectorul iese fără să anunțe. Pe 29.09 au fost 42 de minute fără nicio alertă și fără niciun semn. (2) Poza urcă date vechi ale botului ștampilate ca proaspete. (3) O alertă pe care Discord a refuzat-o e trecută ca trimisă. (4) O cădere T212 oprește în liniște alertele de stop pe acțiuni. (5) Pe drumul telefonului (Tailscale), Health minte iar. (6) Health nu are niciun rând despre lanțul de alerte, iar Radarul n-are nicio pornire automată sau pază.

### 🟡 Serverul 8788 moare ⇒ până la ~55 min fără nicio alertă; colectorul iese tăcut deși are webhook-ul Discord
`C:\Users\Cimin\crypto\scripts\colector.mjs:272 (+ paznic/worker.mjs:7 TACE_MS=30 min)` · lentila: reziliență / fereastră oarbă

Când wrangler nu mai răspunde, colectorul numără 15 ture și iese cu process.exit(0), fără să trimită nimic pe Discord, deși are webhook-ul în .dev.vars. Până să iasă, continuă să urce poza (vezi constatarea următoare), așa că paznicul socotește tăcerea abia de la ultima poză. Paznicul anunță după 30 de minute de tăcere, iar cronul lui merge din 10 în 10 minute. Cel mai rău caz: T+14 (ultima poză) + 30 + până la 10 = 44–54 de minute fără alertele botului (lichidare, grid, plan, podea) și fără niciun semn. Comentariile spun „se oprește după 5 minute” (colector.mjs:7, lansatorul :208), dar codul are 15.

**Dovada:** data/colector.log, 29.09: 09:03:31 „serverul nu răspunde (1/15)” … 09:17:31 „ies: serverul nu mai răspunde”, apoi 09:45:21 „pornit”. Ultima poză a urcat la 09:15:32, deci golul de poze a fost de 30,7 min (scriptul gaps.py: singurul gol >8 min din 1.836 de poze). Paznicul ar fi anunțat cel mai devreme la 09:50, dar colectorul revenise la 09:45/09:46. Rezultat: 42 de minute fără supraveghere și fără nicio notificare. În jurnal nu apare nicio linie „discord” între 09:03 și 09:45.

**Reparația propusă:** La esecuri ≥ 3 colectorul trimite DIRECT pe Discord (fără KV) un mesaj critic: „Serverul Radarului nu răspunde — alertele botului sunt oprite”. Cât serverul e mort, poza nu mai urcă, ca paznicul să numere de la momentul real. Comentariile trebuie aliniate cu MAX_ESECURI.

### 🟡 Poza ștampilează botul cu `la: Date.now()` ⇒ pagina alerts și paznicul văd „viu” date înghețate (lichidare %, % în grid, poziție)
`C:\Users\Cimin\crypto\scripts\colector.mjs:624 (și 283 ultimiiBoti; C:\Users\Cimin\premarket_scanner\lib\radar-ecran.js:201)` · lentila: date vechi prezentate drept proaspete

botiPentruPoza ia ultimiiBoti (ultima citire BUNĂ /api/bot-orders) și pune la fiecare bot la: Date.now(), nu ora citirii. Serverul trimite totuși `citit` în /api/bot-orders, dar colectorul îl ignoră. Când bot-orders pică: cu serverul mort (până iese colectorul, 15 min) sau cu Pionex care refuză (403/502/504 au status, deci colectorul NU iese și poza continuă la nesfârșit). Poza pleacă la 2 minute cu `la` proaspăt: paznicul zice „bate”, iar pagina alerts zice „poza de acum 0 min”. Rândul botului arată „lichidare la X%” fără nicio vârstă (radar-ecran.js:201 nu citește b.la). Prețul live de la Binance se mișcă lângă o lichidare înghețată. În cazul Pionex vine totuși pe Discord „nu mai poate citi botul” după 10 min, dar pagina nu arată nimic.

**Dovada:** Jurnalul 29.09, cu serverul mort: 09:03:32, 09:05:31, 09:07:31, 09:09:32, 09:11:31, 09:13:36 și 09:15:32 „poza: urcata 22 KB 7 poziții 1 boți 14 simboluri”, fiecare după „poza: istoricul botului 2388 fetch failed”. Șapte poze cu date de bot înghețate au fost prezentate drept proaspete. Pe 29.09 la 12:53:42 a apărut și „bot-orders 403 Pionex bot API: HTTP 403” (un caz cu status, în care colectorul nu iese). grep în radar-ecran.js: b.la nu e folosit nicăieri.

**Reparația propusă:** Pe citirea reușită: ultimiiBotiLa = d.citit || acum. În poză: b.la = ultimiiBotiLa și un câmp botiLa + botiEroare. Pagina alerts să arate „botul citit acum X min” și să-l treacă pe „tace” peste ~5 min. Paznicul poate citi botiLa din poză ca să anunțe „poza curge, dar botul nu se mai citește”.

### 🟡 trimiteAlerta întoarce „trimisă” dacă a intrat doar în KV-ul local ⇒ un refuz Discord (429/5xx/rețea) pierde alerta pe telefon
`C:\Users\Cimin\crypto\scripts\colector.mjs:152-153 (comentariul contrar la 371)` · lentila: alertă pierdută

În trimiteAlerta: `return inKv || ok`. KV-ul local merge aproape mereu cât rulează colectorul, deci o alertă refuzată de Discord e trecută ca trimisă și starea ei avansează. Comentariul de la :371 („o alertă care n-a plecat … nu se trece ca trimisă, tura următoare o reîncearcă”) e fals pentru canalul Discord. Efecte: criticele (lichidare <8%) se repetă abia după 1 h (REPETA_MS.critic); alertele o dată pe zi se pierd pentru toată ziua: stopurile din planurile T212, SL/TP pe simboluri (st[a.cheie]=true, :688), frâna (:508); grila și podeaua se pierd de tot. Singurul loc unde se mai vede alerta e lista din Radar, nu telefonul.

**Dovada:** Proba scratchpad\proba_trimite.mjs: am extras din fișier corpul REAL al trimiteAlerta și l-am rulat cu KV = {ok:true} și Discord = HTTP 429. Ieșire: „trimiteAlerta intoarce: true (true = alerta trecuta ca TRIMISA)”; jurnal: „discord EȘEC 429 {"message":"You are being rate limited."}”. În jurnalul real Discord n-a picat în 6 zile (0 „discord EȘEC”), deci e un risc latent, nu unul întâmplat.

**Reparația propusă:** Pentru canalul discord: return ok, iar KV-ul rămâne doar oglindă. Sau o coadă de reîncercare pe disc (data/de-trimis.json), golită la tura următoare, cu Retry-After de la Discord.

### 🟡 O cădere T212 (cheie revocată/expirată, 401) oprește în liniște alertele de stop pe cele 7 poziții — nicio alertă „T212 nu mai răspunde”
`C:\Users\Cimin\crypto\scripts\colector.mjs:501 (și 504-520 frâna, doar jurnal)` · lentila: simetrie Pionex ↔ T212

Pentru Pionex există alerte de sănătate: „nu mai poate citi botul” (după 10 min, repetată la 3 h) și „prețuri moarte”. Pentru T212 nu există nimic. turaPlanuriT212 prinde eroarea și doar scrie în jurnal. Planurile tale pe acțiuni (stop, țintă, −15 % de la maxim), frâna și plafonul de 20 % tac, iar pe Discord nu ajunge nimic. Singurul semn e chip-ul „pozițiile de la HH:MM · Trading 212 n-a răspuns” din pagina alerts, dacă o deschizi.

**Dovada:** grep „Trading 212 n|T212 n-a|nu mai poate citi” în colector.mjs, scripts/lib, alerte.js și actiuni-semnale.js: singura alertă de sănătate e cea de la Pionex (colector.mjs:278); pentru T212 e doar textul „gol” din poza.mjs:278. În jurnal, 27–28.09: 41 × „planuri t212 ESEC Trading 212 a limitat cererile” + 5 × „fetch failed”, toate numai în jurnal.

**Reparația propusă:** Aceeași schemă ca la Pionex: m.t212Rau = de când pică. După 15 min (sau la primul 401/403) o alertă critică „Alertele de stop pe acțiuni sunt oprite: T212 …”, repetată la 3 h, plus „merge din nou” la revenire.

### 🟡 Health minte iar pe drumul telefonului (Tailscale): FAIL la D1 (obligatoriu), „CoinGecko refuză de pe Cloudflare”
`C:\Users\Cimin\crypto\functions\api\provider-health.js:68 (și public/app.js:4894)` · lentila: Health cinstit

Reparația #5 din 28.09 recunoaște „acasă” doar după hostname: 127.0.0.1, localhost sau *.trycloudflare.com. Drumul implicit al telefonului e acum Tailscale (v101.6: https://mau.tail9144fe.ts.net:8443), pe care ruta îl ia drept pagina publicată de pe Cloudflare. Același server dă FAIL/DEGRADED fals, cu scor obligatoriu 1 din 2. Aceeași confuzie apare în grTextEroare (app.js:4894): la un 429 venit prin Tailscale, omul citește „pe versiunea publicată refuză cererile. Deschide Radarul de acasă” deși e chiar serverul de acasă.

**Dovada:** GET /api/provider-health cu token pe http://127.0.0.1:8788: PIONEX OK, D1 DEGRADED „nelegat acasă”, COINGECKO OK HTTP 200, Yahoo OK. Aceeași cerere prin https://mau.tail9144fe.ts.net:8443: D1 FAIL „DB nelegat”, COINGECKO DEGRADED „refuza cererile de pe Cloudflare”, ACȚIUNI DEGRADED „pe Cloudflare Yahoo nu se poate proba”. `tailscale serve status` confirmă că :8443 duce la http://127.0.0.1:8788, adică același server.

**Reparația propusă:** `acasa` să includă și /\.ts\.net$/ (sau, mai sigur: acasă = serverul are ISTORIC legat și cheile Pionex, nu hostname-ul). Aceeași regulă să ajungă într-o funcție comună, folosită și de grTextEroare și explicaEroarea.

### 🟡 Health nu arată lanțul de alerte, iar Radarul n-are pornire automată sau pază: colectorul poate fi mort ore întregi cu Health „OK”
`C:\Users\Cimin\crypto\functions\api\provider-health.js:55-118 (lista de rânduri); PORNESTE-CRYPTO-RADAR.bat:209-214` · lentila: Health / single point of failure

/api/provider-health are 6 rânduri (cheia Pionex, D1, KV, VAPID, CoinGecko, Yahoo). Niciunul nu spune dacă merg alertele: vârsta colectorului (colectorLa e deja în KV), poza pe worker, cheia T212, ultimul Discord reușit. Tot lanțul (wrangler + colector) pornește DOAR manual din .bat: sarcinile Windows au „CIMINI Gestiune Guard” și 5 sarcini „Paznic *”, dar niciuna pentru Crypto Radar. Serverul rulează într-o fereastră care, la oprire, scrie „Serverul s-a oprit” și stă în pause. După o repornire a PC-ului sau o cădere wrangler, alertele stau oprite până apeși tu lansatorul. Paznicul Cloudflare te anunță, dar nu repune nimic.

**Dovada:** Răspunsul live: summary {total:6, required:1, ok:1}, fără niciun rând despre colector sau T212. Get-ScheduledTask (fără \Microsoft\): nicio sarcină crypto; în Startup doar Gestiune, Mercato și Paznic-Panou.vbs. Jurnalul: 76 de „pornit, PID” în 6 zile, toate de la lansator.

**Reparația propusă:** (a) Rânduri noi în Health: „Colectorul” (OK <3 min, FAIL >10 min, din config.colectorLa), „Trading 212 · cont” (din cache-ul t212, fără cerere nouă), „Discord · ultima reușită”. (b) O sarcină la logon + o pază la 5 min (ca CIMINI Gestiune Guard) care, dacă /api/market?type=health nu răspunde de 2 ori la rând, pornește lansatorul ascuns.

### 🔵 185 de mesaje pe Discord în 28.09 — alerta critică a paznicului se îneacă printre „pereche încheiată”
`C:\Users\Cimin\crypto\data\colector.log:` · lentila: oboseala alertelor

Pe 28.09 au fost 77 × „JTO: pereche încheiată” + 13 × „N perechi încheiate” (info), 12 × critic „planul tău — ieși” repetat, 11 × „a ieșit din grid”. Un „colectorul tace” critic ar cădea în același flux, dacă paznicul folosește același canal (nu am putut verifica, secretul e în Cloudflare). Ce ai cerut pe 26.09 rămâne hotărârea ta, aici e doar cifra actualizată: 60/zi pe 27.09 → 185 pe 28.09 → 93 pe 29.09.

**Dovada:** Numărătoare pe zi și pe tip din jurnal (uniq -c pe titluri): 28.09: 77/13/12/11/10/7/6/6.

**Reparația propusă:** Un al doilea webhook doar pentru critic și paznic (canal „🔴 urgent” cu notificare), iar „pereche încheiată” strâns într-un rezumat pe oră.

### 🔵 COTIUSDT în lista de simboluri ⇒ 2 cereri Yahoo 404 la fiecare poză (~1.400 de linii de jurnal pe zi)
`C:\Users\Cimin\crypto\scripts\colector.mjs:634-635` · lentila: zgomot / cereri inutile

Un simbol crypto a intrat în lista de acțiuni a paginii alerts. yahooExtra.closes și extra îl cer la fiecare 2 minute și primesc 404. Jurnalul se umple (rotire la 1 MB, o singură copie .vechi), așa că istoricul de incidente se pierde mai repede.

**Dovada:** Coada jurnalului: fiecare „poza: urcata” din 30.09 e precedată de „poza: inchideri COTIUSDT Yahoo HTTP 404” + „poza: extra COTIUSDT Yahoo HTTP 404”. Cheia KV „simboluri” de pe worker conține {"s":"COTIUSDT"}.

**Reparația propusă:** Un cache negativ de 6 h pentru 404 în yahoo-extra.mjs. În pagina alerts: refuză sau mută simbolurile *USDT spre boți.

### 🔵 POST /simboluri scrie în KV cu cheia de CITIRE, fără limită; o cotă epuizată face paznicul să trimită pe Discord la fiecare 10 min
`C:\Users\Cimin\crypto\paznic\worker.mjs:122-123 și 96` · lentila: cota KV a paznicului

Cheia de citire circulă în linkuri #cheie=… și stă în localStorage. Cine o are poate scrie /simboluri în buclă și arde cele 1.000 de scrieri gratuite pe zi (poza folosește deja ~700). După aceea POST /poza pică, paznicul anunță fals „colectorul tace”, iar pagina alerts rămâne pe o poză veche. Tot la cota epuizată, în verifica() scrie() aruncă eroare DUPĂ ce Discord a primit mesajul, deci anuntatLa nu se salvează și mesajul critic se repetă la fiecare cron (10 min) până la resetarea cotei.

**Dovada:** Codul: autorizat(request, env.CHEIE_CITIRE) pe POST /simboluri, fără limită de ritm. Poze pe zi din jurnal: 699 (28.09) și 641 (29.09). În KV: cheile poza, simboluri, stare.

**Reparația propusă:** /simboluri: scrie doar dacă lista s-a schimbat (compară cu ce e în KV) și cel mult o dată la 10 min. În verifica(), scrie() pus în try/catch, cu o cheie de rezervă sau un antet de cache.

### 🔵 Copiile KV (planurile, sursa alertelor de stop) stau doar pe același disc
`C:\Users\Cimin\crypto\scripts\lib\copie.mjs:7-16` · lentila: copii de siguranță

data/copii/kv-* se face zilnic la 03:00 și e integră, dar stă pe același SSD cu originalul. Planurile tale (plan:*) sunt singura sursă pentru alertele „planul tău — ieși” și pentru stopurile T212. O pană de disc le ia pe toate odată.

**Dovada:** copie_arh.py (pe copii în scratchpad): 6 copii 25–30.09, toate `integrity_check ok`, 0 blob-uri lipsă; kv-2026-09-30: 56 de chei, dintre care 15 plan:*. Toate sub C:\Users\Cimin\crypto\data\copii.

**Reparația propusă:** După copie, un export JSON cu planurile (și alte chei mici) urcat criptat în KV-ul paznicului sau într-un dosar Google Drive sincronizat. Sunt câțiva KB pe zi.

**Ce a probat:** LANȚUL, cu ce se întâmplă la fiecare cădere (verificat):
Pionex/T212/Yahoo/Binance/BNR → server wrangler 127.0.0.1:8788 (KV ISTORIC local) → colector (tura la 1 min; poza la 2 min) → KV local (alerte) + Discord (direct) + worker paznic-radar (KV PAZNIC: poza/stare/simboluri, cron */10) → pagina alerts din suită (GitHub Pages, citește /poza cu cheia) · telefonul ajunge la Radar prin Tailscale :8443 (tailnet-only; cloudflared nu mai rulează).
- PC oprit / internet căzut: poza nu mai urcă, paznicul (Cloudflare) anunță pe Discord după 30–40 min și repetă la 6 h. Pagina alerts trece pe „tace” după 15 min și pe „oprit” după 60. Nimic nu repornește lanțul.
- wrangler mort: colectorul urcă în continuare poze cu botul înghețat timp de 15 min, apoi iese tăcut. Paznicul prinde tăcerea după 44–54 min. Caz real: 29.09, 42 min orb.
- colectorul mort cu serverul viu: Tabloul arată „oprit de X min”, paznicul anunță după 30–40 min, Health nu arată nimic.
- cheia Pionex picată: alertă critică pe Discord după 10 min; pagina alerts arată însă botul înghețat drept „viu”.
- cheia T212 picată: niciun Discord; doar chip-ul din pagina alerts.
- worker peste cotă: vezi sugestia cu /simboluri.
- Discord refuză: alerta e trecută ca trimisă.
- tunelul: înlocuit de Tailscale; Health minte pe acest drum.
Probe pe viu: poza pe worker (citită din KV prin API-ul Cloudflare, doar citire) avea 1,1 min, tura 203, colector v101.19, 7 poziții T212, botul CRV long 5x cu lichidarea la 18,71 %, radarUrl = Tailscale. În cheia „stare”, `la` e doar bătaia de la pornire (13:00 UTC), deci nu se mai scrie o bătaie separată cât curge poza: reparația #3 ține. Cronul paznic-radar e „*/10 * * * *” (API /schedules). GET /poza fără cheie ⇒ 401; GET / ⇒ 200. /api/provider-health local vs. prin Tailscale (diferența e în constatări). /api/market?type=health zice v100.38 (reparația #12 ține). /api/bot-orders: CRV are opritorPierdere 0,3847 ACTIV în Pionex, departe deasupra lichidării de 0,3188, deci lichidarea NU depinde de PC-ul de acasă. Jurnalul colectorului 24–30.09 (3.849 de linii): limitări T212 pe zi 26:1, 27:61, 28:37, 29:0, 30:0 (reparația #1 ține); 1.836 de poze, un singur gol >8 min; niciun colector dublu (17 perechi de poze la <90 s, toate la reporniri; 0 mesaje Discord identice la <30 s); 0 eșecuri Discord. Discord pe zi: 4/5/60/185/93/55. .wrangler/state: cache 20 MB + observability 9,6 MB + kv 4,1 MB (față de 376 MB pe 28.09: reparația #6 ține). Lansatoarele opresc cloudflared-ul vechi (#8 ține). Copiile KV: 6 zile, toate integre. Memoria la 19:27 / 19:33 / 19:35 (server repornit la 18:42): workerd 435→639→653 MB și 214→257→270 MB; wrangler node 213→209→209 + 92 + 62 MB; colector 136→146→141 MB. Total acum ~1,43 GB (pe 28.09 era 2,2 GB după o zi întreagă; e prea devreme pentru o concluzie despre scurgeri). Proba trimiteAlerta pe liniile reale, cu Discord picat, întoarce true. Sarcinile Windows și Startup: nicio pornire automată pentru Radar. Nu am pornit Chrome, nu am scris în niciun depozit și nu am oprit niciun proces.

**Ce NU a probat:** 1) Nu am citit poza prin /poza cu cheia de citire (CHEIE_CITIRE nu e pe disc); am citit-o direct din KV prin API-ul Cloudflare, cu tokenul lui wrangler, doar citire. 2) Nu am deschis pagina alerts într-un browser real și nici n-am provocat o poză „veche”. Ce vede omul când botul e înghețat e dedus din cod (radar-ecran.js:201) și din jurnalul 29.09, nu fotografiat. 3) Nu am oprit serverul sau colectorul ca să cronometrez paznicul pe viu; fereastra de 44–54 min e socotită din cod și confirmată doar de incidentul real din 29.09. 4) Nu știu dacă paznicul și colectorul folosesc ACELAȘI canal Discord (secretul paznicului stă în Cloudflare). 5) Nu am verificat cota KV reală din contul Cloudflare (GraphQL); ~700 de scrieri pe zi e socotit din jurnal. 6) Nu am cercetat de ce a murit wrangler pe 29.09 la 09:03 (nu apare în jurnal). 7) Nu am probat de pe un telefon real prin Tailscale; drumul l-am probat de pe PC, care e în tailnet. 8) Nu am verificat Binance, știrile (GDELT) și BNR pe viu, doar codul lor de eroare (BNR răspunde cinstit cu 502). 9) Creșterea memoriei workerd (435→653 MB în 8 min după repornire) n-am urmărit-o ore întregi; cererile altor agenți, care rulau probe în paralel, pot umfla cifra. 10) Nu am rulat npm test.

## Consistență între module

Am făcut o trecere transversală pe consistența cifrelor între Tablou (app.js + lib), colector (poza.mjs, colector.mjs), alertele Discord (KV `alerte`) și pagina alerts (radar-ecran.js). Am lucrat pe date reale: botul CRV 2394 (o singură citire bot-orders), cele 7 poziții T212 (citite prin cache-ul serverului), planurile din KV, arhiva de 2.256 de boți și cursul BNR. Modulele le-am rulat în Node din scratchpad.

Ce bate peste tot:
- procentul „azi”: deschiderea de la 00:00 UTC e 0,3812 la Pionex și 0,3813 la Binance;
- pragurile de lichidare 8/15 %;
- „% în grid”, calculat liniar;
- ponderea în cont;
- maximul de după cumpărare, cu aceeași formulă în 3 locuri;
- stopul poziției, egal cu trail-ul de 15 % din toate cele 7 planuri;
- profitul pe grilă, calculat de aceeași funcție.

Ce am găsit nou:
- ținta poziției T212 „fuge” (se socotește din prețul de acum), deci alerta „a atins ținta sugerată” și ramura „aproape de țintă” a consilierului nu se pot declanșa niciodată;
- același bot închis are trei cifre diferite pe trei ecrane;
- același simbol (MU) are două SL-uri pe două ecrane;
- „Cât cumpăr” e socotit cu două cursuri valutare;
- semaforul colectorului pierde sfatul „mută opritorul la zero”;
- plus câteva diferențe mici de model sau de etichetă.

### 🟡 Ținta poziției „fuge”: tintaPozitie = prețul de ACUM + 2×risc, deci „a atins ținta sugerată” și ramura „aproape de țintă” a consilierului nu se pot atinge niciodată. Pe același rând se văd două ținte.
`C:\Users\Cimin\crypto\public\lib\actiuni-semnale.js:239 (tintaPozitie); consilier.js:62; scripts/lib/poza.mjs:86 și 253; t212-ecran.js:277 față de 270` · lentila: consistență – ținta poziției T212

ActiuniSemnale.niveluri socotește tintaPozitie = r2(pret + 2d) din prețul curent, la fiecare citire, iar d ≥ 3 % din preț. Consecințele: (1) Consilier: condiția p.pret ≥ 0,97 × tintaPozitie cere pret ≥ 0,97 × 1,06 × pret ≈ 1,028 × pret, deci e mereu falsă. „Aș lua jumătate” vine doar din ramura pctLei ≥ 15 %. (2) poza.mjs: la o poziție fără plan, TP-ul sugerat = tintaPozitie, iar alerta sltp-tp (pret ≥ tp) compară prețul cu o țintă făcută din el însuși, deci e moartă. Același TP „mobil” intră și în calculul „ultimul sfert spre SL”. (3) Pe rândul Radar → Trading 212, coloana „Țintă” arată tintaPozitie, iar cipul planului de pe același rând arată ținta planului. Pagina alerts arată ținta planului. Omul vede două ținte pentru aceeași poziție.

**Dovada:** Pe cele 7 poziții reale (scratchpad/tinta.mjs), raportul preț / tintaPozitie iese între 0,77 și 0,91, peste tot sub 0,97. De exemplu: APLD 24,72 / 32,136; MPC 399,46 / 499,88; QCOM 184,05 / 215,17. Pe același rând: APLD are coloana „Țintă” 32,14 și cipul planului „țintă $34,44”; MPC are 499,88 față de 481,72; UHS are 205,24 față de 210,40. În data/alerte-stare.json există cheile sltp-aproape (AVGO ×2) și sltp-intrare (6 simboluri), dar ZERO chei sltp-tp. În colector.log sunt 0 potriviri pentru „ținta sugerată”.

**Reparația propusă:** Ținta poziției trebuie să fie fixă: prețul mediu (sau maximul) + 2d, ori ținta din plan. Nu prețul curent + 2d. Pe rândul T212, coloana „Țintă” ar trebui să arate ținta planului când există, ca pe pagina alerts. Aș adăuga o probă: pentru orice preț, sltp-tp și ramura consilierului trebuie să se poată declanșa.

### 🟡 Același bot închis are rezultate diferite în alerta „🔍 închis” și în Jurnal, iar „Poziția” are 3 definiții
`C:\Users\Cimin\crypto\public\lib\jurnal-trade.js:37 (pct), 50 (pozitie), 56 (textul „Repornit imediat”); tablou-extra.js:257-262 (alerta de închidere); scripts/lib/poza.mjs:118 (pozitie)` · lentila: consistență – profitul unui bot închis

Rădăcina (Jurnalul socotește ÎNAINTE de comisioane) e deja raportată de auditorul „Banii”. Dovada nouă e pe aceiași boți, între ecrane. Alerta de închidere (Discord și Radar) folosește netul, după comisioane și funding. Rândul și greșelile din Jurnal folosesc totalRealizedProfit, adică brutul. „Poziția” se socotește în trei feluri: (1) în alerta de închidere, total − grile, cu comisioane și funding; (2) în Jurnal, rezultat − grile, fără comisioane și fără funding; (3) pe pagina alerts, total − grile − comisioane, cu funding, dar fără comisioane.

**Dovada:** Am comparat alertele din KV (`alerte`) cu JurnalTrade.din pe arhiva KV (scratchpad/bot2390.mjs). LIGHTER 2390: Discord „−59,04 USDT (−57,1 %)”, Jurnal −58,52 (−56,6 %). Poziția: Discord −63,38, Jurnal −62,86, iar formula paginii alerts dă −62,88. CRV 2391: Discord „+1,30 (+2,9 %)”, Jurnal +1,41 (+3,2 %); greșeala „Repornit imediat” din Jurnal citează tot „(+1.41 USDT)”. CRV 2392: Discord „+2,59 (+5,7 %)”, Jurnal +2,70 (+5,9 %).

**Reparația propusă:** O singură funcție „rezultatul botului” care dă NET (realizat + comisioane + funding) și aceeași descompunere în grile, poziție și costuri. Toate ecranele și alertele ar citi din ea. Etichetele ar trebui să spună explicit „net” sau „brut”.

### 🟡 Același simbol are două SL-uri: Radar → Idei arată −15 %, iar pagina alerts și Discord („a ajuns la intrarea sugerată”) arată k×ATR, cu același TP
`C:\Users\Cimin\crypto\public\lib\idei.js:26 (față de scripts/lib/poza.mjs:89-91 și actiuni-semnale.js:239)` · lentila: consistență – stopul de intrare

Continuă constatarea „Semnalele” (COKE), cu o dovadă nouă între suprafețe. idei.js pune stopul la intrare × 0,85, dar ținta rămâne n.tinta (= intrare + 2d). Pentru același simbol, poza (sugestiePoza, fel „urmarit”) dă SL = intrare − d. Omul vede MU în Idei cu un SL și pe pagina alerts cu altul, cu aceeași intrare și același TP. Raportul risc/câștig „1:2” e adevărat doar pe una dintre ele.

**Dovada:** KV t212:idei: MU are intrare 1043,23, stop 886,7455, tinta 1305,48. Pe barele din data/poza-bare.json (MU e pe lista paginii alerts), ActiuniSemnale.niveluri dă intrare 1043,23, SL 912,10, TP 1305,48, d = 131,13 (scratchpad/mu.mjs). La fel la HOOD: Discord „SL $100.06” față de 97,70 după regula Ideilor. La AAPL: 309,05 față de 279,99.

**Reparația propusă:** Ideile ar trebui să folosească același n.stop ca poza (și ca proba, și ca Biletul), sau poza să folosească −15 %. Oricare ar fi regula, trebuie să fie aceeași pe Idei, Bilet, pagina alerts și Discord.

### 🔵 Semaforul socotit de colector (pagina alerts, Discord) nu primește `zero`: pe telefon lipsește sfatul „mută opritorul la prețul de zero”
`C:\Users\Cimin\crypto\scripts\colector.mjs:241-244 (față de public/app.js:5690; semnale-bot.js:203-208 și 269)` · lentila: consistență – semaforul botului Tablou față de colector

Tabloul cheamă SemnaleBot.semafor cu zero: TabloExtra.dacaInchizi(b). Colectorul construiește x fără zero. Pe ramura „cu-botul”, pasiCuBotul(b, dir, x.zero) scrie pasul de protecție doar când primește zero. Nivelul rămâne același, dar sfatul de pe pagina alerts și din Discord pierde singura acțiune concretă de protecție.

**Dovada:** scratchpad/zero.mjs: botul real CRV 2394, cu prețul mutat la 0,405 și mișcarea cu botul. Tabloul dă „…Aș muta opritorul de pierdere la prețul de zero (0.3981), ca o întoarcere să nu transforme câștigul în pierdere…”. Colectorul dă același text FĂRĂ această propoziție. Ambele au nivelul „tine”, codul „cu-botul”.

**Reparația propusă:** În colector.mjs:241 trebuie adăugat `zero: TabloExtra.dacaInchizi(b)` în x, ca în Tablou.

### 🔵 „Cât cumpăr” e socotit cu două cursuri: pagina alerts și Discord folosesc cursul mediu al pozițiilor deschise (4,5955 lei/$), iar Biletul din Radar folosește cursul ultimei umpleri T212 (4,65 lei/$)
`C:\Users\Cimin\crypto\scripts\lib\poza.mjs:74-78 (folosit în colector.mjs:676-677) față de public/lib/t212-ecran.js:73-77, 353, 364` · lentila: consistență – cursul valutar

Poza folosește fxDinPozitii = Σ buc × preț mediu / Σ cost în lei al loturilor deschise, un curs istoric ponderat (unele loturi sunt din august). Biletul și poarta din Radar folosesc t212Fx() = fxRate-ul ultimei umpleri US. Pentru aceeași intrare și același stop ies număr de bucăți și risc real în lei diferite, cu vreo 1,2 %. La cursul de azi, riscul real al variantei de pe telefon trece puțin peste 1 % din cont.

**Dovada:** scratchpad/fx.mjs, pe pozițiile reale, cu contul 29.020,80 lei: fx poza = 0,217604 (4,5955 lei/$), fx pagină = 0,215054 (4,6500 lei/$). HOOD: 4,2669 buc față de 4,2169; QCOM: 4,1961 față de 4,1469; AAPL: 3,1497 față de 3,1127. Discordul din 30.09 a spus „HOOD … Cât cumpăr: 4,28 buc”.

**Reparația propusă:** Un singur curs „de azi” (ultima umplere T212 sau BNR), pus în poză de colector și folosit de ambele părți.

### 🔵 Jurnal → „Toate” convertește toată istoria Pionex la cursul T212 de azi, iar Declarația folosește BNR pe zi: aceiași boți ies cu 5–7 % mai mult în lei
`C:\Users\Cimin\crypto\public\app.js:5314-5316 (lpu = 1/t212Fx), 5334 (nota) față de public/lib/t212.js:116-132` · lentila: consistență – Pionex în lei

Diferența e spusă în notă („cursul ultimei tranzacții Trading 212”), dar e aceeași mărime (rezultatul Pionex în lei), cu două valori pe două ecrane. CSV-ul „trade-uri-tot” pleacă și el la cursul de azi.

**Dovada:** scratchpad/lei.mjs, pe arhiva KV (2.256 de boți) și pe cursul BNR adus prin /api/curs-bnr. În 2026, pe aceiași 1.770 de boți și −5.169,75 USDT: Declarația dă −22.886,79 lei, „Toate” dă −24.039,33 lei (la 4,65). În 2025, pe 486 de boți și −838,91 USDT: −3.631,48 față de −3.900,95 lei.

**Reparația propusă:** „Toate” ar putea folosi același curs BNR pe ziua închiderii ca Declarația (funcția există în T212.raportAnual). Altfel, ar trebui scris lângă total că nu e cifra din Declarație.

### 🔵 Rezumatul de dimineață și „socoteala sfaturilor” judecă pozițiile FĂRĂ plan și fără maximul de după cumpărare, spre deosebire de Tablou și pagina alerts
`C:\Users\Cimin\crypto\scripts\colector.mjs:747` · lentila: consistență – semaforul T212 în rezumatul de dimineață

dateDimineata cheamă ActiuniSemnale.semafor cu plan: null și fără maxDupaCumparare. Regula planului („a scăzut −X % de la maxim”) nu intră în „🔴 De ieșit”. Nici în intrările salvate pentru socoteala sfaturilor, care judecă astfel alt verdict decât cel văzut pe ecran. Azi nivelurile coincid, dar motivul planului lipsește.

**Dovada:** scratchpad/sem.mjs pe cele 7 poziții reale. Nivelul e același peste tot. APLD are pe Tablou și alerts „a scăzut −19,5 % de la maxim — planul tău zicea ieși la −15 %; trend în jos și ești pe minus −16,3 %”, iar dimineața doar „trend în jos și ești pe minus −16,3 %”. Reluarea zilnică pe barele reale de la cumpărare (sem2.mjs) dă 0 zile cu nivel diferit la aceste 7 poziții, deci problema e latentă. Apare la o cădere de 15 % de la maxim cu trendul încă sus.

**Reparația propusă:** Dimineața ar trebui să folosească aceleași intrări ca pozitiiPentruPoza, adică planReal(plan) și maxDupaCumparare.

### 🔵 Rezumatul de dimineață arată minusul în lei (AVGO „−8,7 %”), dar IEȘI-ul e declanșat de minusul în preț (−11,6 %, pragul −10 %)
`C:\Users\Cimin\crypto\public\lib\consilier.js:114 (față de actiuni-semnale.js:50 și 61; colector.mjs:751)` · lentila: consistență – „cât ești pe minus”

Consilier.rezumat scrie pctLei lângă „De ieșit”. Semaforul decide pe pct = preț / preț mediu − 1, în dolari. Omul citește „−8,7 %” la un IEȘI care cere „peste −10 %”. Pe Radar, rândul T212 arată ambele valori, dar Discordul și pagina alerts arată doar procentul în lei.

**Dovada:** KV alerte, 30.09: „🔴 De ieșit: AVGO (−8,7 %)”. Recalculat acum (fx.mjs și sem.mjs): AVGO are pctLei −9,18 %, pctPret −11,62 %, semafor „trend în jos și ești pe minus −11,6 %”. APLD: −14,07 % față de −16,35 %.

**Reparația propusă:** În rezumat ar trebui scris procentul din motivul semaforului (prețul), sau amândouă, „preț −11,6 % · în lei −9,2 %”, ca pe rândul din Radar.

### 🔵 Prețul la care se atinge planul e socotit în două modele: liniile din graficul Tabloului și „podeaua” sunt statice, iar alertele și semaforul țin cont de grilele de pe drum
`C:\Users\Cimin\crypto\public\lib\tablou-extra.js:335 și 340 (podea, opritorPastreaza, statice) față de 342 și 347 (tintaPlan, laOpritor, opritorPlan, cu grile); app.js:6100` · lentila: consistență – prețul la care se atinge planul

Graficul (app.js:6100) și podeaua țintei folosesc pretPentruTotal și totalLaPret, cu poziția de acum și fără grilele cumpărate pe drum. Alertele („planul tău se atinge pe la…”, „−X se atinge la…”) și laOpritor folosesc totalCuGridLa. În aceeași planStare, opritorPastreaza (static) și laOpritor (cu grile) dau totaluri diferite pentru ACELAȘI opritor. Diferența e mică lângă preț, dar crește cu distanța.

**Dovada:** scratchpad/plan2394.mjs pe botul viu CRV 2394 (plan +2,6 / −7,5). Pentru +2,6: graficul pune linia la 0,40301, alerta spune 0,40490. Pentru −7,5: graficul 0,38385, alerta 0,38457. La linia din grafic totalul real, cu grile, e −7,95, nu −7,5. La opritorul Pionex 0,3847: opritorPastreaza = −7,05, laOpritor = −7,42.

**Reparația propusă:** Liniile planului din grafic și podeaua ar trebui să folosească pretOpritorPentru, pretTintaPentru și totalCuGridLa, ca alertele.

### 🔵 „% până jos” se socotește față de marginea de jos pe Acasă și față de preț în Tablou, alerte și pagina alerts
`C:\Users\Cimin\crypto\public\lib\acasa-ecran.js:243 (față de tablou-extra.js:379 și alerte.js:219)` · lentila: consistență – distanța până la marginea gridului

Acasă folosește pr / jo − 1. distanteGrid, alerta p-margine și radar-ecran folosesc (p − jos) / p. Pentru același bot ies cifre ușor diferite, iar pragul de alertă de 1 % e pe a doua.

**Dovada:** CRV 2394 (preț 0,3925, jos 0,3841): Acasă dă „2,2 % până jos” (2,19 %), Tablou „grid ↓2,1 %” (2,14 %).

**Reparația propusă:** Pe Acasă ar trebui folosit TabloExtra.distanteGrid(b).josPct.

**Ce a probat:** Totul s-a făcut doar prin citire. Nimic nu a fost scris în depozite și nu am repornit nimic.

Date citite:
- KV-ul local: l-am copiat (sqlite și bloburi) în scratchpad. Am citit cheile plan:* (18), alerte (100), botiInchisi (2.256, forma 3) și t212:idei.
- O singură citire /api/bot-orders pentru botul viu CRV 2394 (row 20, geometric, 0,3841–0,4331).
- /api/t212 pozitii, cont și istoric (2.421 de umpleri), luate din cache-ul serverului de 30/60 s.
- /api/t212 preturi 1d pentru cele 7 poziții, din cache-ul serverului.
- 1D Pionex, o dată, și 1D Binance futures, o dată, pentru CRV.
- /api/curs-bnr pe 2025 și 2026.
- data/poza-bare.json și data/alerte-stare.json.

Ce am rulat în Node (scratchpad/*.mjs), pe modulele încărcate din public/lib și din scripts/lib/poza.mjs:
- fxDinPozitii față de t212Fx, apoi marime() cu ambele cursuri;
- semafor-ul T212 cu intrările din Tablou/poză și cu intrările rezumatului de dimineață, plus reluarea zilnică pe barele reale;
- niveluri, tintaPozitie, nivDinNiveluri și sugestiePoza pe cele 7 poziții;
- JurnalTrade și StatisticaTrade pe boții 2389–2393, comparați cu alertele „închis” din KV;
- T212.raportAnual (BNR) comparat cu conversia din „Toate”;
- pretPentruTotal, pretTintaPentru, pretOpritorPentru, totalCuGridLa și planStare pe 2394;
- SemnaleBot.semafor cu `zero` și fără `zero`.

Am verificat și ce bate: procentul „azi” (deschiderea 00:00 UTC e 0,3812 la Pionex și 0,3813 la Binance), pragurile de lichidare 8/15 în toate cele 6 locuri, „% în grid” (liniar peste tot), ponderea (aceeași formulă pe pagină și în colector), maxDupaCumparare (aceeași formulă în t212-ecran, colector și tura-t212) și stopPozitie față de planurile cu trail de 15 % (egale la toate 7).

**Ce NU a probat:** - Nu am deschis ecranele în Chrome. Cifrele de pe ecran le-am dedus rulând aceleași funcții pe aceleași date, nu citindu-le din DOM.
- Nu am citit poza urcată la worker-ul paznic, fiindcă CHEIE_CITIRE nu e în .dev.vars. Poza am refăcut-o local cu funcțiile ei.
- Nu am comparat cu aplicația Pionex: profitul pe grilă și lichidarea afișate de Pionex.
- Pentru boți am avut un singur bot viu. Nu am verificat un bot short sau neutru, și nici unul cu marjă adăugată în timp ce rulează.
- Nu am reluat istoric semaforul botului din Tablou față de cel al colectorului (fișa socotită în locuri diferite, la momente diferite).
- Nu am verificat codul GRID-FISA din TradingView (Pine), ci doar ordinea câmpurilor în cele două generatoare (codTVBot și grCodTV). Ordinea bate.
- Nu am verificat procentul pe 24 h (d24, din istoricul KV) față de vreo altă sursă.
- Nu am verificat constatările deja raportate de ceilalți auditori (grile/linii, taxa maker, raportul de duminică, histerezisul și altele), decât acolo unde am adus dovadă nouă.
