# Jurnalul măsurătorilor — Tabloul botului, acuratețea semnalelor (din 13.11.2026)

Regula casei: ipoteza și regulile se scriu ÎNAINTE de cifre; fiecare încercare se numără, și cele picate; unitatea de dovadă e ZIUA
(nu moneda, nu bara); „nedovedit” nu e „dovedit că nu”. Datele sunt publice (lumânări Binance perp USDT); nimic din vreun cont.
Scriptul: `scripts/cercetare-v100339-acuratete.mjs` (rulează codul paginii prin `scripts/lib/motor-pagina.mjs`, nu o copie a formulelor).

## Registrul încercărilor

| Nr. | Data | Ce | Teste cu verdict | Rezultat |
|---|---|---|---|---|
| M1 | 13.11.2026 | direcția la 4 bare: verdictul, becul, nota TradingView | 6 | toate nedovedite |
| E1 | 13.11.2026 | explorare: mișcarea după becul „lateral” | 0 | lateral ⇒ mai puțină mișcare (de confirmat) |
| M2 | 13.11.2026 | verdictul stabil (regim cu histerezis + confirmare pe 2 bare) | 2 + stabilitatea | vezi mai jos |
| M3 | 13.11.2026 | estimarea din situații asemănătoare, cu trăsături normalizate | 2 + mărimea | vezi mai jos |
| M3b | 13.11.2026 | banda estimării pe cuantila Student (K3), doar mărimea pe mers aleator | 0 pe piață (mărimea) | K3 5,3% ⇒ regula paginii |
| M4 | 13.11.2026 | confirmarea lui E1 pe date de dinaintea explorării | 2 | vezi mai jos |
| R1 | 14.11.2026 | revizia independentă: mărimea lui K1 / K2 / K3 pe altă sămânță (777) | 0 pe piață | K3 5,8% — vezi „Revizia independentă” |

Corecția pentru câte teste s-au făcut: fiecare măsurătoare își corectează intervalele cu numărul TUTUROR testelor cu verdict de până la ea
inclusiv (M1: 6; M2: 8; M3: 10; M4: 12).

---

## M1 — direcția la 4 bare (regulile scrise 13.11, înainte de rulare)

**Întrebarea.** Când Tabloul arată o direcție, prețul merge în direcția aceea mai des decât la întâmplare? Nu se caută o strategie și nu se
optimizează nimic: se măsoară ce afișează pagina, cu setările ei.

**Semnalele (pe bare închise).** S1 verdictul (`calc(j, "auto").ver`, pe ultimele 499 de bare); S2 becul (`Directie.analizeaza`, orizontul paginii:
1h → 24, 4h → 6; „lateral” nu se numără); S3 nota TradingView „Rezumat” (motorul reprodus, pe bara închisă; > 0,1 cumpără, < −0,1 vinde).

**Date.** 21 de perechi Binance perp (BTC, ETH, ZEC, HYPE, SOL, BNB, NEAR, XRP, DOGE, ENA, WLD, SUI, ADA, UNI, PUMP, INIT, LINK, FIL, BCH, AVAX,
EGLD), 3.000 de bare pe 1h și pe 4h, descărcate 13.11.2026. Încălzire 500 de bare. Semnalul la fiecare a 4-a bară închisă (ferestre de orizont
care nu se suprapun); rezultatul = semnul lui `close[i+4] − close[i]`; mișcarea zero = ratat.

**Dovada.** Rata de nimerire față de 50%, pe zile (UTC): bootstrap pe blocuri de 5 zile, 2.000 de re-eșantionări, generator mulberry32
(sămânța 20261113). 6 teste ⇒ intervalul la 1 − 0,05 / 6. Dovedit = marginea de jos peste 50%; dovedit că strică = marginea de sus sub 50%.

**Rezultatul (o singură rulare).**

| Semnal | 1h: 13.125 judecăți, 105 zile | 4h: 13.112 judecăți, 417 zile |
|---|---|---|
| Verdictul | semnal în 53,7% · nimerire 47,0% [42,8–51,9] | 54,3% · 48,7% [45,3–52,2] |
| Becul | 34,3% · 49,5% [44,8–54,6] | 35,1% · 49,0% [44,8–53,4] |
| Nota TradingView | 87,8% · 47,7% [45,0–50,6] | 88,1% · 49,4% [46,8–52,2] |

Toate șase: **nedovedit**. Cu lățimea intervalelor, un avantaj sub ~3 puncte nu se poate exclude. Limite: Binance, nu Pionex; nota TradingView
pe bara închisă (pagina o arată cu bara în curs); un singur orizont; fără costuri (e o direcție, nu o intrare).

## E1 — explorare, fără verdict (declarată înainte de rulare)

Mișcarea absolută `|close[i+4] / close[i] − 1|` după becul „lateral” față de după becul cu direcție: 1h 1,21% față de 1,35% (raport 0,90
[95%: 0,82–0,99]); 4h 2,45% față de 2,87% (raport 0,85 [0,79–0,92]). Becul pare să spună ceva despre CÂT se mișcă prețul, nu despre încotro.
Fiind explorare pe aceleași date ca M1, nu e dovadă: se confirmă în M4, pe date pe care nu le-a văzut.

---

## M2 — verdictul stabil (regulile scrise 13.11, ÎNAINTE de orice cifră a lui)

**Ipoteza (mecanism, nu tipar).** Pragul verdictului (64 / 66 / 67) și multiplicatorul Supertrend (2,4 / 2,8 / 3,0) se aleg după regimul ULTIMEI
bare (ADX ≥ 27; ATR% peste percentila 80 a monedei). Când ADX-ul oscilează în jurul lui 27 sau ATR-ul în jurul percentilei 80, parametrii sar
de la o bară la alta, iar verdictul se schimbă fără ca prețul să fi făcut ceva nou. Un regim cu histerezis (intră la un prag, iese la altul)
scoate aceste sărituri; o confirmare pe două bare închise scoate verdictele de o singură bară.

**Regula V2 (fixată acum, din mecanism, nu din cifre).**
- Regimul „trend”: intră la ADX ≥ 27 (pragul de azi), iese la ADX < 24. Regimul „agitat”: intră la percentila ATR% ≥ 80 (pragul de azi),
  iese sub 70. „Trend” are întâietate, ca azi. Regimul se hotărăște bară cu bară pe ultimele 60 de bare, pornind de la regula fără memorie.
- Confirmarea (doar la afișare): verdictul arătat pe bara n e `V(n)` dacă `V(n) = V(n−1)`; altfel `V(n−1)` dacă `V(n−1) = V(n−2)`; altfel neutru.
- Pragurile 24 și 70 nu se reglează după rezultat. Dacă V2 iese mai rău la stabilitate decât V1, se renunță la el, nu se caută alte praguri.

**Ce se măsoară.**
1. Stabilitatea, pe ultimele 600 de bare ale fiecărei perechi (1h și 4h), fiecare bară: (a) câte schimbări de verdict sunt făcute DOAR de
   schimbarea parametrilor (cu parametrii barei dinainte, pe aceleași lumânări, verdictul nu s-ar fi schimbat); (b) cât la sută din
   episoadele cu direcție țin cel mult două bare. V1 (azi) față de V2 (histerezis) față de V2 cu confirmare. Fără test statistic: sunt
   numărători ale aceluiași cod pe aceleași bare; se raportează ca atare.
2. Nimerirea direcției la 4 bare pentru V2 cu confirmare, exact ca în M1 (aceleași date, același pas, aceeași dovadă pe zile). Două teste în
   plus (1h, 4h) ⇒ corecția la 8 teste. Scopul nu e să bată 50%: V2 se adoptă pentru stabilitate dacă NU iese „dovedit că strică”.

**Hotărârea, scrisă dinainte.** V2 intră în pagină dacă (a) scade față de V1 pe ambele intervale și nimerirea nu e „dovedit că strică”.
Confirmarea intră la afișare dacă (b) scade. Altfel rămâne V1 și se spune de ce.

## M3 — estimarea din situații asemănătoare (regulile scrise 13.11, ÎNAINTE de cifre)

**Ce e greșit azi (din cod, nu din cifre).** Vecinii se aleg pe șase trăsături în unități diferite; histograma MACD e înmulțită cu 10.000,
celelalte sunt în procente sau fracții, așa că distanța e aproape numai MACD. Vecinii se iau din două în două bare, cu rezultate care se
suprapun (orizont 4), deci „20 de situații” sunt de fapt mai puține episoade, iar banda de zgomot iese prea îngustă.

**Regula K2 (fixată acum).** Fiecare trăsătură se împarte la abaterea ei standard pe fereastra de eșantioane (toate cântăresc la fel, înainte
de ponderile existente 1,2 / 1 / 1 / 1 / 1 / 0,8); vecinii se aleg cei mai apropiați, cu cel puțin un orizont (4 bare) între oricare doi;
`k` rămâne 20; banda de zgomot se socotește pe numărul de vecini aleși.

**Ce se măsoară.** (1) Mărimea: pe 2.000 de mersuri aleatoare (mulberry32, sămânța 20261113, 500 de bare), cât de des iese estimarea „în afara
benzii” (colorată) — trebuie să fie în jur de 5%, nu peste 7%. (2) Nimerirea direcției la 4 bare pe datele din M1 (1h și 4h), pe zile, pentru
estimările din afara benzii și pentru toate. Două teste (toate estimările, 1h și 4h) ⇒ corecția la 10 teste.

**Hotărârea, scrisă dinainte.** K2 înlocuiește regula veche dacă mărimea e în regulă (≤ 7%); textul de pe pagină citează nimerirea măsurată
aici pe piață (nu „48,8%”, care era pe mers aleator). Ponderea estimării în scor rămâne zero orice ar ieși.

## M4 — confirmarea lui E1 (regulile scrise 13.11, ÎNAINTE de cifre)

**Ipoteza (mecanism).** Volatilitatea vine în ciorchini: după o perioadă fără direcție și cu mișcare mică urmează, mai des, tot mișcare mică.
Becul „lateral” (preț între medii, fără structură de trend pe orizontul lui) e o măsură a unei astfel de perioade.

**Datele (nevăzute de E1).** Aceleași 21 de perechi, cele 3.000 de bare de DINAINTEA ferestrei folosite în M1 / E1 (pe 1h: ~125 de zile mai
vechi; pe 4h: ~500 de zile mai vechi; perechile care nu existau atunci lipsesc). Aceeași procedură ca în E1: becul la fiecare a 4-a bară,
mișcarea absolută la 4 bare, raportul lateral / direcție, pe zile, bootstrap pe blocuri de 5 zile.

**Dovada.** Două teste (1h, 4h) ⇒ corecția la 12 teste. Confirmat pe un interval = marginea de sus a raportului sub 1.

**Hotărârea, scrisă dinainte.** Dacă se confirmă pe ambele intervale, rândul „drumul prețului” spune lângă becul lateral „de obicei prețul se
mișcă mai puțin după el (măsurat)”, cu raportul. Dacă nu, nu se spune nimic despre asta și E1 rămâne notat ca neconfirmat.

### M4 — rezultatul (rulat 13.11.2026, o singură dată)

| Interval | Perechi | După bec lateral | După bec cu direcție | Raport [95%] | Corectat (12 teste) |
|---|---|---|---|---|---|
| 1h | 21 | 1,11% (8.687) | 1,22% (4.438) | 0,91 [0,83–1,00] | 0,80–1,03 |
| 4h | 18 | 2,81% (7.144) | 2,98% (4.039) | 0,94 [0,87–1,02] | 0,83–1,05 |

**Neconfirmat** pe ambele intervale: aceeași direcție ca în E1 (mai puțină mișcare după „lateral”), dar marginea de sus nu coboară sub 1.
După hotărârea scrisă dinainte, pagina nu spune nimic despre asta. Nu e „dovedit că nu”: efectul, dacă există, e sub ~10%.

### M3 — rezultatul (rulat 13.11.2026, o singură dată)

| | Mers aleator: în afara benzii | Mers aleator: „≥ 70%” | Piață 1h: toate | Piață 4h: toate | Piață 1h: în afara benzii | Piață 4h: în afara benzii |
|---|---|---|---|---|---|---|
| K1 (regula veche) | 8,3% | 16,4% | 49,7% [48,4–51,2] | 50,1% [48,6–51,7] | 49,6% [45,0–55,0] | 50,0% [44,4–54,9] |
| K2 | 7,5% | 12,8% | 50,1% [48,1–52,1] | 50,0% [48,0–52,2] | 52,1% [46,9–57,3] | 51,9% [45,4–58,7] |

Nimerirea: **nedovedit** peste tot (intervalele corectate pentru 10 teste cuprind 50%). Mărimea: K2 e mai bun decât K1 (7,5% față de 8,3%;
„≥ 70%” 12,8% față de 16,4%), dar **nu trece pragul scris dinainte (≤ 7%)**. După regulă, K2 în forma asta NU înlocuiește K1.

### M3b — K3, scris ÎNAINTE de rulare (13.11.2026)

**De ce.** Banda e `1,96 × √(0,25 / nEfectiv)`, adică aproximarea normală, cu ~17 vecini efectivi; la atât de puține observații ea e prea
îngustă (de aceea și K1, și K2 ies peste 5% pe zgomot curat). Calibrarea unei benzi pe ipoteza nulă (mers aleator) nu folosește niciun
rezultat de pe piață.

**Regula K3 (fixată acum).** K2 neschimbat, cu banda `t(0,975; nEfectiv − 1) × √(0,25 / nEfectiv)` (cuantila Student în locul lui 1,96,
prin dezvoltarea Cornish–Fisher). Nimic altceva.

**Ce se măsoară.** Doar mărimea pe aceleași 2.000 de mersuri aleatoare (aceeași sămânță). Pragul de acceptare rămâne cel de dinainte: ≤ 7%.
Nimerirea „toate” e identică cu a lui K2 (direcția nu depinde de bandă), deci nu e un test nou pe piață; nimerirea „în afara benzii” a lui K3
nu se citește ca verdict.

**Hotărârea, scrisă dinainte.** Trece ⇒ K3 e regula paginii, iar textul citează 50,1% (1h) și 50,0% (4h). Nu trece ⇒ rămâne K1, fără
culoare pe celulă (estimarea nu are nici bandă calibrată, nici nimerire), și se oprește aici: nu se mai încearcă alte benzi.

### M3b — rezultatul (rulat 13.11.2026, o singură dată)

Pe aceleași 2.000 de mersuri aleatoare: K1 8,3% (165), K2 7,5% (151), **K3 5,3% (106)** în afara benzii. K3 trece pragul (≤ 7%) ⇒ e regula
paginii din v100.339 (`historicalProbability`; `opt.vechi` = K1 și `opt.bandaNormala` = K2 rămân chemabile pentru măsurătoare).
Textul de pe pagină: „măsurată pe piață (13.11.2026, 21 de monede): direcția nimerită în 50 din 100 de cazuri”. Ponderea în scor rămâne zero.

### M2 — rezultatul (rulat 13.11.2026, o singură dată)

Stabilitatea, pe ultimele 600 de bare × 21 de perechi:

| | 1h: schimbări de verdict | 1h: doar din parametri | 1h: episoade ≤ 2 bare | 4h: schimbări | 4h: doar din parametri | 4h: episoade ≤ 2 bare |
|---|---|---|---|---|---|---|
| V1 (regula veche) | 2.351 | 18 (0,8%) | 582 din 1.192 (48,8%) | 2.356 | 24 (1,0%) | 595 din 1.196 (49,7%) |
| V2 (histerezis) | 2.381 | 12 (0,5%) | 588 din 1.207 (48,7%) | 2.362 | 12 (0,5%) | 590 din 1.200 (49,2%) |
| V2 + confirmare pe 2 bare | 1.544 | — | 162 din 785 (20,6%) | 1.486 | — | 149 din 758 (19,7%) |

Nimerirea la 4 bare (corectat pentru 8 teste): V2 47,4% [42,9–51,8] pe 1h și 48,6% [45,1–52,2] pe 4h; V2 cu confirmare 47,0% [43,0–51,4]
și 48,2% [44,5–51,9]. Toate **nedovedit**, niciuna „dovedit că strică”.

**Ce spune.** Săriturile de parametri erau o parte mică din schimbările de verdict (~1%, nu „cam 10%”: zecele la sută din audit era din
comutările de PROFIL, nu din verdicte). Histerezisul le înjumătățește (18 → 12, 24 → 12), dar nu schimbă numărul total de schimbări. Cea care
liniștește cu adevărat verdictul e confirmarea pe două bare: episoadele de cel mult două bare scad de la ~49% la ~20%, iar schimbările cu o treime.

**Hotărârea (după regulile scrise dinainte).** (a) scade pe ambele intervale și nimerirea nu e „dovedit că strică” ⇒ regimul cu histerezis intră
în `calc` (modul „auto”). (b) scade ⇒ confirmarea pe două bare intră la afișare în Tabloul botului (`tbVerdictConfirmat`, `IndicatoriBot.confirma`).
Prețul: verdictul arătat poate întârzia o bară față de scor; de aceea bara de acum, când zice altceva, e marcată cu „⏳”.

---

## Revizia independentă (14.11.2026) — ce a găsit la statistică și ce schimbă

Un revizor care n-a scris nici regulile, nici codul a citit jurnalul și scriptul. Scurgeri din viitor n-a găsit (semnalul e pe bare ≤ i,
rezultatul la i + 4; vecinii estimării au rezultatele în trecut; M4 e pe date strict mai vechi). Ce a obiectat, cu ce am verificat eu după:

1. **Numărătoarea testelor e scurtă.** Registrul numără 12 teste cu verdict; intervale cu verdict au fost de fapt în jur de 20 (M2 are 4, nu 2:
   V2 și V2 cu confirmare, pe 1h și pe 4h; M3 are 8: K1 și K2, „toate” și „în afara benzii”, pe două intervale). Cu 20 intervalele corectate
   se lățesc, deci niciun „nedovedit” nu poate deveni „dovedit” și M4 rămâne „neconfirmat”. **Nicio hotărâre nu se schimbă**; numărul din
   registru rămâne cum a fost scris (nu îl rescriu după), cu observația asta lângă el.
2. **Poarta „nu e dovedit că strică” din M2 e blândă.** Corecția pentru mai multe teste lățește intervalul, deci o face mai ușor de trecut,
   nu mai greu. Necorectat, verdictul cu confirmare pe 1h stă (după socoteala revizorului, din intervalul raportat) cam la [44,1–50,2]: tot
   „nedovedit”, dar la limită. De ținut minte: confirmarea pe două bare e adoptată pentru că **liniștește** verdictul, nu pentru că l-ar face
   mai bun la nimerit — acolo e, în cel mai bun caz, la fel.
3. **Histerezisul regimului nu are un efect măsurabil.** A intrat după litera regulii scrise dinainte (săriturile „doar din parametri” scad pe
   ambele intervale: 18 → 12 și 24 → 12), dar din ~2.350 de schimbări asta e în zgomot, iar totalul schimbărilor a crescut ușor (2.351 → 2.381).
   Revizorul a comparat regula veche cu cea nouă pe 300 de serii aleatoare: verdictul diferă în 2. **Efectul real e al confirmării pe două
   bare** (episoadele de cel mult două bare: ~49% → ~20%). Histerezisul rămâne în cod (nu strică și ține parametrii pe loc), dar comentariul
   lui din `regimProfil` nu mai promite că „liniștește verdictul”.
4. **K3 (banda Student).** Revizorul îl socotește cinstit: e calibrare pe ipoteza nulă, nu pe piață, scrisă înainte de rulare, cu oprire
   declarată. Slăbiciunea: „picarea” lui K2 (7,5% față de pragul de 7%) era ea însăși în zgomot. Verificarea pe altă sămânță, refăcută de mine
   cu `--ce=m3h0 --samanta=777` (2.000 de mersuri aleatoare): K1 7,8% (157), K2 7,8% (155), **K3 5,8% (116)** — aceeași ordine, K3 tot sub 7%.
   Pe sămânța din jurnal, rulată din nou după schimbările de azi din `historicalProbability` (zerourile se împart pe jumătate): 8,3% / 7,5% /
   5,3%, neschimbat. Revizorul a mai încercat un mers cu volatilitate în ciorchini: K3 5,5%, K2 7,9% (cifra lui, nerefăcută de mine).
5. **Reluabilitatea.** Lumânările și ieșirile nu sunt în depozit, iar capătul datelor era clipa rulării. Datele din 13.11: Binance perp,
   21 de perechi; 1h de la 11.07.2026 20:00 la bara care se deschide 13.11.2026 19:00 UTC (cele „vechi”, pentru M4: 08.03.2026 – 11.07.2026);
   4h de la 01.07.2025 la bara de 13.11.2026 16:00 UTC (cele „vechi”: 17.02.2024 – 01.07.2025). Scriptul are acum `--pana=<ms UTC>`: cu
   `--pana=1794596400000` (13.11.2026 19:00 UTC) oricine aduce aceleași bare închise. **O abatere de spus:** lumânările au fost aduse la 19:27
   UTC, iar rulările de după 20:00 UTC au numărat ca închisă ultima bară, prinsă neterminată (una din ~3.000 pe serie). Nu le-am refăcut cu
   `--pana`; o bară pe serie nu poate muta concluziile de mai sus, dar cifrele exacte de la a treia zecimală nu sunt garantate.

**Ce s-a schimbat în cod după revizie (fără nicio măsurătoare nouă pe piață):** randamentul exact zero al unui vecin nu mai e numărat
„coborâre” (se împarte pe jumătate; pe mers aleator nu apare, deci mărimea e aceeași); fraza de pe pagină spune că nota TradingView măsurată
e formula ei refăcută pe bare închise, iar pe fișa unei acțiuni că cifra e a crypto-ului.
