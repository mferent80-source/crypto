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
| M5 | 14.11.2026 | regimul pentru grid: ADX și lățimea benzilor față de eficiența și drumul următoarelor 24 h; becul „lateral” | 12 | toate NEDOVEDITE (A și C: efect zero; B: ×1,2–1,3, sub prag) — vezi „M5 — rezultatul” |
| M5b | din 14.11.2026, în așteptare | reluarea efectului B (benzi largi ⇒ drum mai lung) pe date noi, pe 1h, pe raportul din interiorul blocului | 1 (nerulat) | regulile scrise; se judecă pe primele 30 de blocuri noi încheiate, nu înainte de mijlocul lui aprilie 2027; prag 0,05 ÷ 70 |
| N1 | din 14.11.2026, în așteptare | jurnalul pe viu: nota TradingView și verdictul Radarului, judecate după 4 bare, pe blocuri de 5 zile | 2 (nerulate) | regulile scrise; pagina arată bilanțul de la 30 de zile, judecata pe primele 36 de blocuri încheiate; prag 0,05 ÷ 70 |

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

---

## M5 — regimul pentru grid (regulile scrise 14.11.2026, ÎNAINTE de orice cifră a lui)

**De ce.** Ideea I-872 cerea, pe lângă faptele deja puse pe pagină (drumul prețului în trepte, ritmul perechilor), un regim spus în vorbele
gridului și „becul tradus pentru grid”. M4 n-a confirmat că becul lateral aduce mai puțină mișcare, așa că regimul nu poate apărea ca sfat
fără o probă a lui. Un grid câștigă din oscilație (drumul prețului) și pierde din înaintarea într-o singură parte (poziția rămasă), deci
întrebarea botului e: după eticheta de acum, următoarele 24 de ore sunt mai mult oscilație sau mai mult înaintare, și cât drum fac?

**Ipotezele (mecanism).**
- (A) Înaintarea are o inerție scurtă pe perp-uri (lichidări în lanț, ordine care urmăresc mișcarea), iar intervalele țin cât cei care vând
  sus și cumpără jos sunt mai mulți: după un ADX mare, eficiența următoarelor 24 h (cât din drum e înaintare) e mai mare decât după un ADX mic.
- (B) Volatilitatea vine în ciorchini (fapt cunoscut): după benzi Bollinger largi, drumul următoarelor 24 h e mai lung decât după benzi strânse.
- (C) Becul „lateral” al paginii (`Directie.analizeaza`) e o etichetă pentru aceeași stare ca ADX-ul mic din (A).

**Clasificatorul (fixat acum, din pragurile de manual; nu se reglează după rezultat).** Pe bare închise, la bara i, doar cu bare ≤ i:
- axa trendului: ADX(14) al paginii (`calc`) ≥ 25 ⇒ „trend”; < 20 ⇒ „lateral”; între ele ⇒ „tranziție”;
- axa volatilității: lățimea benzilor Bollinger (20; 2) împărțită la media lor, ca percentilă în ultimele 100 de bare (cu bara i):
  < 30 ⇒ „joasă”; > 70 ⇒ „ridicată”; altfel „normală”.
Același cod îl folosesc pagina și măsurătoarea (`public/lib/regim-grid.js`).

**Ce se măsoară, pe următoarele 24 de ore** (1h: 24 de bare; 4h: 6 bare; pe închideri):
- eficiența înainte: EF = |c[i+h] − c[i]| ÷ Σ|c[k+1] − c[k]|, k = i … i+h−1 (0 = numai oscilație, 1 = numai înaintare);
- drumul înainte: D = Σ|c[k+1] − c[k]| ÷ c[i], în procente.

**Testele** (fiecare pe 1h și pe 4h, pe fereastra principală și pe cea mai veche ⇒ 12 intervale cu verdict):
- A: media EF după „trend” minus media EF după „lateral” (se așteaptă > 0);
- B: media D după volatilitate „ridicată” împărțită la media D după „joasă” (se așteaptă > 1);
- C: media EF după becul cu direcție minus media EF după becul „lateral” (becul socotit ca în M4; se așteaptă > 0).

**Dovada.** Unitatea e ziua barei i; bootstrap pe blocuri de 5 zile × 2.000, sămânța 20261113; eșantion la fiecare a 4-a bară; datele:
aceleași 21 de perechi Binance perp, cu `--pana=1794596400000`. Corecția: la **32 de teste** (cele ~20 de până acum, numărate cum a cerut
revizia, plus aceste 12). O afirmație e „dovedită” pe un interval doar dacă marginea de jos corectată trece de 0 (A, C) sau de 1 (B) pe
**ambele** ferestre, principală și veche. Ca să conteze și ca mărime: la A și C diferența estimată ≥ 0,02; la B raportul estimat ≥ 1,2, tot
pe ambele ferestre. O clasă cu sub 500 de eșantioane pe o fereastră ⇒ „prea puține”, nu se judecă.

**Datele nu sunt neatinse.** Fereastra principală a fost folosită la M1–M3 (direcția), cea veche la M4 (becul lateral față de mișcarea
absolută la 4 bare, neconfirmat). M5 pune altă întrebare, dar pe aceleași prețuri: de aceea intră în corecție și se cere pe ambele ferestre.
Bare cu adevărat nevăzute nu există încă (doar cele de după 13.11.2026 19:00 UTC).

**Ce NU e.** Nu e o probă că botul câștigă într-un regim; nu dă nimănui culoare (verde / roșu).

**Hotărârea, scrisă dinainte.**
- A dovedit pe un interval ⇒ rândul „oscilație sau trend” spune regimul pe acel interval și fraza măsurată (eficiența următoarelor 24 h după
  „lateral” față de după „trend”). Nedovedit ⇒ regimul apare doar ca descriere a ultimelor bare, cu „ce urmează: nedovedit”.
- B dovedit ⇒ lângă volatilitate, de câte ori e mai lung drumul următor după benzi largi față de benzi strânse. Nedovedit ⇒ doar percentila.
- C dovedit ⇒ becul „lateral” își păstrează „bun pentru grid”, cu cifra măsurată în explicația lui. Nedovedit ⇒ „bun pentru grid” se scoate
  (rămâne „lateral de N bare”): e o afirmație fără dovadă pe o pagină cu bani reali.
- Oricum ar ieși: fără culoare, și se oprește aici — nu se încearcă alte praguri sau alte orizonturi.

### M5-H0 — mărimea testelor pe serii fără efect (scris 14.11.2026, înaintea rulării pe piață)

Testele A, B și C sunt statistici noi (diferențe și rapoarte de medii pe clase, cu ferestre de 24 h care se suprapun), deci întâi se vede cât
de des „găsesc” ceva unde nu e nimic. Serii sintetice, 21 pe rulare × 2.000 de bare, mulberry32:
- pentru A și C: mers aleator cu volatilitate în ciorchini (log-volatilitatea e un AR(1) cu 0,98), fără nicio inerție a direcției — eficiența
  următoarelor 24 h nu depinde de trecut, deci diferența adevărată e 0;
- pentru B: mers aleator cu volatilitate constantă — lățimea benzilor nu spune nimic despre drumul următor, deci raportul adevărat e 1.
Pe fiecare rulare, exact procedura M5 (aceleași clase, eșantion la a 4-a bară, bootstrap pe blocuri de 5 zile, 500 de trageri), pe 1h.
**Se numără** în câte rulări din 200 intervalul de 95% (necorectat) lasă afară valoarea adevărată. **Poarta:** cel mult 7,5% la fiecare test
(5% nominal, plus zgomotul simulării). Dacă un test trece de 7,5%, verdictul lui din M5 se ia cu blocuri de 10 zile în loc de 5 — o singură
schimbare, scrisă acum — și se spune în rezultat.

*Notă de calcul, pusă înaintea rezultatului:* în simulare ADX-ul vine din implementarea de referință (`scripts/lib/indicatori-referinta.mjs`),
socotit o dată pe serie; e egal cu al paginii în limita a 0,3 (proba E1 din v100.339). Cu motorul paginii (≈ 21 ms pe chemare) cele 200 de
rulări ar fi cerut vreo 8 ore. M5 pe piață rămâne cu `calc`, cum scrie mai sus, și își arată verdictul și cu blocuri de 10 zile, ca regula
porții să nu ceară o a doua rulare.

### M5 — amendament, scris ÎNAINTEA rulării pe piață (14.11.2026, după revizia independentă)

**Ce s-a întâmplat.** Simularea de mai sus a fost oprită la 180 de rulări din 200: în afara intervalului de 95% au ieșit A 15 (8,3%), B 15
(8,3%), C 12 (6,7%) — peste cele 5% nominale. Un revizor independent a refăcut-o cu 1.000 de rulări: A 9,0% și B 8,6% la 95%, iar la marginea
corectată la 32 de teste **1,9% și 1,6% în loc de 0,16%** (de vreo zece ori prea des). Cauza: prea puține blocuri (12–21), iar marginea
corectată e a treia cea mai mică din 2.000 de trageri. Remediul scris de mine (blocuri de 10 zile) o face mai rău (11% și 3–4%), fiindcă
înjumătățește numărul de blocuri. **Măsurătoarea pe piață n-a pornit: am oprit-o înainte; nicio cifră de piață n-a fost văzută.** Regulile
de mai jos le înlocuiesc pe cele de dovadă de mai sus; clasificatorul, testele A / B / C, datele, ferestrele și oprirea rămân neschimbate.

**Dovada, cea nouă.** Zilele se grupează în blocuri de 5 zile calendaristice la rând (de la prima zi a ferestrei). Pe fiecare bloc, cu toate
perechile la un loc: A = media EF după „trend” minus media EF după „lateral”; B = logaritmul raportului dintre media D după benzi largi și
media D după benzi strânse; C = ca A, pe becul paginii. Un bloc în care una dintre clase are sub 20 de eșantioane se sare. Testul: Student,
într-o singură parte (media blocurilor > 0), cu n − 1 grade de libertate. Pragul verdictului: p ≤ 0,05 ÷ 64 (într-o parte; e același prag
ca „marginea corectată la 32 de teste” de dinainte).

**Mărimea, verificată ÎNAINTEA pieței** (`--ce=m5h0`, rescris): două lumi fără efect, 21 de serii × 3.000 de bare (ca fereastra de 1h) —
serii independente și serii legate (factor comun cu corelația ≈ 0,7 și volatilitate comună) — cel puțin 10.000 de rulări fiecare pentru A și
B. Se numără respingerile la 2,5% într-o parte și la pragul verdictului (nominal 0,078%). **Poarta:** la pragul verdictului, cel mult de două
ori nominalul (0,16%) în ambele lumi. Dacă trece, pragul lui t se ridică la cuantila din simulare (lumea mai rea) la care respingerile ajung
la nominal — calibrare pe ipoteza nulă, ca la K3 — și se spune în rezultat. Testul C e aceeași statistică precum A (aceeași formă, altă
etichetă) și ia pragul lui A; mărimea lui se verifică pe 300 de rulări la 2,5% (becul cere o socoteală lentă pe fiecare eșantion).
În simulare etichetele vin din `RegimGrid.clasificaSerie` (aceleași praguri, socotite pe toată seria deodată; proba cere egalitatea cu
`clasifica` bară cu bară) și din ADX-ul de referință; pe piață rămâne `etichetaM5` (cu `calc`), drumul verificat mecanic de probă.

**Mărimile minime, ridicate** (revizorul: prea joase): A și C: diferența estimată ≥ 0,03; B: raportul estimat ≥ 1,3 — pe ambele ferestre,
ca estimare pe toată fereastra.

**Ce cifră se pune pe pagină** dacă un test e dovedit: efectul mai MIC dintre cele două ferestre.

**Becul „bun pentru grid”** (revizorul: o diferență de eficiență nu arată că gridul câștigă, iar regula „C dovedit ⇒ rămâne «bun pentru
grid»” nu decurge din test). Regula se înăsprește: vorba „bun pentru grid” se scoate **oricum ar ieși C**, iar culoarea becului lateral nu
mai e verde. Dacă C e dovedit, becul lateral spune ce s-a măsurat („de obicei oscilează mai mult decât înaintează”); dacă nu, rămâne
„lateral de N bare”. La fel explicația rândului ADX („sub 20 = fără trend”), fără „bun pentru grid”.

**De știut și după:** la 1h cele două ferestre sunt perioade vecine din aceeași piață (nu două piețe diferite); pe 4h simularea de mărime nu
se face (aceeași procedură, cu de patru ori mai multe blocuri).

### M5-H0, a doua: mărimea dovezii pe blocuri (14.11.2026, 10:21–10:44; ÎNAINTEA pieței)

`node scripts/cercetare-v100339-acuratete.mjs --ce=m5h0 --rulari=10000 --lume=indep|legate` (sămânța 20261113; 21 de serii × 3.000 de bare
de 1h, fără efect; testul Student pe blocuri de 5 zile, într-o parte).

| lumea | test | respingeri la 2,5% (nominal 2,50%) | la pragul verdictului, p ≤ 0,05 ÷ 64 (nominal 0,078%) | t la care respingerile ajung la nominal |
|---|---|---|---|---|
| serii independente | A | 1,24% | 0,030% (3 din 10.000) | 3,41 |
| serii independente | B | 2,13% | 0,090% (9 din 10.000) | 3,75 |
| serii legate (factor comun 0,7, volatilitate comună) | A | 0,00% | 0,000% (0 din 10.000) | 1,49 |
| serii legate (factor comun 0,7, volatilitate comună) | B | 0,71% | 0,000% (0 din 10.000) | 2,84 |

**Poarta: trecută** în ambele lumi (cel mult 0,090% față de limita de 0,16%). Pragul verdictului rămâne p ≤ 0,05 ÷ 64, fără calibrare
(`--tprag` nu se folosește).

**De știut:** în lumea legată testul e mult prea prudent (la 2,5% n-a respins niciodată din 10.000; cu seriile legate, toate monedele poartă
aceeași etichetă în același timp, deci blocurile cu ambele clase sunt puține și zgomotoase). Piața adevărată seamănă mai mult cu lumea
legată. Urmarea: un „DOVEDIT” e de crezut; un „NEDOVEDIT” spune puțin (testul are putere mică acolo) — „nu s-a dovedit” nu înseamnă „s-a
dovedit că nu”.

**Regula pentru C, scrisă acum, înainte să văd fie simularea lui, fie piața.** Simularea lui C (becul paginii pe fiecare eșantion; 3 × 100
de rulări, semințele 101, 102, 103, lumea independentă) e încă în lucru. Dacă la 2,5% C respinge de mai mult de două ori nominalul (16 sau
mai multe din 300), verdictul lui C nu se dă: rămâne „nemăsurat corect”, iar pagina nu spune nimic măsurat despre bec. Altfel C se judecă
la fel ca A (p ≤ 0,05 ÷ 64, diferența ≥ 0,03 pe ambele ferestre).

**Ordinea păstrată:** măsurătoarea pe piață pornește acum în fundal, cu ieșirea într-un fișier pe care NU îl citesc până nu se termină
simularea lui C și nu îi scriu aici rezultatul.

#### M5-H0, diagnostic (14.11.2026, 11:05; tot înaintea cifrelor de piață)

De ce e testul prea prudent în lumea legată — 400 de rulări cu altă sămânță (`--samanta=7`), doar ca să văd media lui t și câte blocuri
intră în test (nu schimbă nicio regulă):

| lumea | test | media lui t | mediana | blocuri în test |
|---|---|---|---|---|
| independente | A | −0,33 | −0,29 | 21 |
| independente | B | −0,06 | −0,06 | 21 |
| legate | A | −1,74 | −1,67 | 21 |
| legate | B | −0,62 | −0,67 | 21 |

Nu lipsesc blocurile (intră toate cele 21); **statistica lui A e trasă în jos chiar fără efect**: când volatilitatea vine în ciorchini
comuni tuturor monedelor, după eticheta „trend” eficiența următoarelor 24 de bare iese ceva mai mică decât după „lateral”, deși prețul nu
are nicio inerție. Testul rămâne cum e scris (nu scad din el o abatere luată dintr-o lume simulată: ar depinde de cât de bine seamănă
simularea cu piața). Urmarea, spusă dinainte: pe piață un „NEDOVEDIT” la A sau la C nu arată că efectul lipsește — testul pornește cu un
handicap de vreo 1,7 unități de t; un „DOVEDIT” ar fi cu atât mai de crezut.

#### M5-H0, testul C (14.11.2026, 10:21–11:17; scris înainte de a citi piața)

`--ce=m5h0 --bec --rulari=100 --lume=indep --samanta=101 | 102 | 103` (becul paginii, `Directie.analizeaza`, pe fiecare eșantion):

| sămânța | respingeri C la 2,5% | la pragul verdictului |
|---|---|---|
| 101 | 1 din 100 | 0 |
| 102 | 2 din 100 | 0 |
| 103 | 2 din 100 | 0 |

În total **5 din 300 (1,7%; nominal 2,5%)**, sub limita scrisă (16). Testul C se judecă la fel ca A: p ≤ 0,05 ÷ 64 și diferența ≥ 0,03 pe
ambele ferestre. Abia acum deschid rezultatul măsurătorii pe piață.

### M5 — rezultatul (rulat 14.11.2026, 10:45–11:05, o singură dată; citit 11:18, după simularea lui C)

`node scripts/cercetare-v100339-acuratete.mjs --ce=m5 --pana=1794596400000` (lumânările din cache-ul auditului; sămânța nu intră în test:
dovada pe blocuri nu trage la sorți). Pragul: p ≤ 0,05 ÷ 64 = 0,078%, într-o parte; mărimi minime A, C ≥ 0,03 și B ≥ 1,3 pe ambele ferestre.

| interval | fereastra | test | după eticheta „sus” (eșantioane) | după eticheta „jos” (eșantioane) | efectul | blocuri | t | p |
|---|---|---|---|---|---|---|---|---|
| 1h | principală | A · eficiența: trend / lateral | 0,21 (6.096) | 0,21 (4.301) | −0,00 | 21 | −2,09 | 97,5% |
| 1h | veche | A | 0,21 (5.962) | 0,21 (4.309) | 0,00 | 21 | −1,15 | 86,8% |
| 1h | principală | B · drumul: benzi largi / strânse | 16,94% (4.170) | 13,70% (4.182) | ×1,24 | 21 | 3,43 | 0,134% |
| 1h | veche | B | 15,25% (4.068) | 12,48% (4.159) | ×1,22 | 21 | 3,18 | 0,235% |
| 1h | principală | C · eficiența: bec cu direcție / bec lateral | 0,21 (4.465) | 0,21 (8.555) | 0,00 | 21 | −0,80 | 78,2% |
| 1h | veche | C | 0,20 (4.414) | 0,21 (8.606) | −0,01 | 21 | −1,58 | 93,5% |
| 4h | principală | A | 0,41 (6.423) | 0,42 (4.115) | −0,01 | 65 | −2,15 | 98,2% |
| 4h | veche (18 perechi) | A | 0,42 (5.568) | 0,44 (3.484) | −0,02 | 55 | −2,82 | 99,7% |
| 4h | principală | B | 8,38% (3.953) | 6,91% (4.183) | ×1,21 | 50 | 1,80 | 3,889% |
| 4h | veche (18 perechi) | B | 9,63% (3.558) | 7,40% (3.515) | ×1,30 | 51 | 2,56 | 0,681% |
| 4h | principală | C | 0,42 (4.578) | 0,41 (8.514) | 0,01 | 81 | −0,52 | 69,8% |
| 4h | veche (18 perechi) | C | 0,41 (4.036) | 0,43 (7.129) | −0,02 | 76 | −2,51 | 99,3% |

**Verdictul, după regulile scrise:** 1h — A NEDOVEDIT, B NEDOVEDIT, C NEDOVEDIT; 4h — A NEDOVEDIT, B NEDOVEDIT, C NEDOVEDIT.

Verdict M5 pentru pagină: 1h A=NEDOVEDIT B=NEDOVEDIT C=NEDOVEDIT; 4h A=NEDOVEDIT B=NEDOVEDIT C=NEDOVEDIT

(Rândul de mai sus e citit de `scripts/proba-v100340-a.mjs`: ce scrie pagina ca „măsurat” trebuie să fie exact ce e DOVEDIT aici.)

**Ce înseamnă, fără înflorituri.**
- **A și C (lateral ⇒ mai multă oscilație decât înaintare):** nimic. Eficiența următoarelor 24 de ore e aceeași după „trend” și după
  „lateral” (0,21 cu 0,21 pe 1h; 0,41–0,44 pe 4h), iar unde diferă, diferă pe dos și sub pragul minim. Cu handicapul testului (vezi
  diagnosticul), asta nu dovedește că efectul lipsește, dar estimările înseși stau pe zero: n-am pe ce clădi o afirmație.
- **B (benzi largi ⇒ drum mai lung):** efectul există ca semn (drumul e de 1,2–1,3 ori mai lung după benzi largi, pe toate cele patru
  ferestre), dar nu trece nici pragul corectat (cel mai bun: p = 0,134% față de 0,078%), nici mărimea minimă pe ambele ferestre (1,24 și
  1,22 pe 1h; 1,21 și 1,30 pe 4h, sub 1,3). Rămâne „nedovedit”; nu se mai încearcă alte praguri pe aceleași date.

**Hotărârile, cele scrise dinainte:**
1. `RegimGrid.MASURAT` rămâne gol pe ambele intervale ⇒ pagina arată regimul ca stare de acum și scrie „ce urmează: nedovedit”.
2. Vorba „bun pentru grid” s-a scos și becul lateral nu mai e verde (regula din amendament, oricum ar fi ieșit C). Pe aceeași regulă, piața
   toată laterală nu mai apare „cu botul” (KPI, bandă) și nu mai e motiv verde în Consilier; eticheta becului lateral spune doar „nici cu
   botul, nici împotrivă”.
3. Explicația rândului ADX: „sub 20 = fără trend”, fără laudă.

**Numărul de încercări:** 12 teste (A, B, C × 1h, 4h × două ferestre), o singură procedură pe piață (cea din amendament); procedura dintâi
(bootstrap pe blocuri) n-a atins piața. Simulări fără efect: 180 + 1.000 (revizorul) pe procedura veche; 2 × 10.000 + 3 × 100 + 2 × 400
(diagnostic) pe cea nouă.

## M5b — reluarea efectului B pe date noi (regulile scrise 14.11.2026, înaintea oricărei bare noi)

*(Rescrise în aceeași zi, după o revizie independentă a primei forme, tot înaintea oricărei bare noi. Ce a schimbat revizia: blocurile
trebuie să fie încheiate; pragul numără toate testele de până acum, cum cere regula din capul jurnalului; un singur test, pe 1h; tabelul
de putere refăcut prin simulare, cu tot cu pragul de mărime.)*

**De ce.** Din cele 12 teste ale lui M5, singurul efect cu același semn pe toate ferestrele a fost B: după benzi Bollinger largi drumul
următoarelor 24 de ore e mai lung decât după benzi strânse. N-a trecut pragul. Pe aceleași date nu se mai încearcă nimic; se poate relua o
singură dată, pe date care nu existau când s-au scris regulile.

**Ce au arătat, de fapt, blocurile din M5** (scos din rezultatul rulării, nu rulat din nou). Cifra de pe fereastra întreagă (×1,21–1,30)
amestecă săptămâni agitate cu săptămâni liniștite: într-o săptămână agitată sunt și benzile largi, și drumul lung, oricum. În interiorul
aceluiași bloc de 5 zile raportul e mai mic:

| interval | fereastra | raportul pe bloc (media geometrică) | abaterea log-raportului pe bloc | blocuri valide din cele ale ferestrei | raportul pe fereastra întreagă |
|---|---|---|---|---|---|
| 1h | principală | ×1,18 | 0,222 | 21 din 21 | ×1,24 |
| 1h | veche | ×1,13 | 0,171 | 21 din 21 | ×1,22 |
| 4h | principală | ×1,08 | 0,286 | 50 din 84 | ×1,21 |
| 4h | veche | ×1,11 | 0,284 | 51 din 84 | ×1,30 |

Pe 1h: ×1,18 și ×1,13. Deci mărimea de judecat e raportul PE BLOC (cel pe care îl testează Student), nu cel de pe fereastra întreagă.

**Ipoteza.** În aceeași perioadă de 5 zile, după benzi largi (percentila lățimii > 70) drumul următoarelor 24 de ore e mai lung decât după
benzi strânse (percentila < 30). Mecanismul: volatilitatea ține de la o zi la alta. Nu e un semnal de direcție, e o măsură a cât se mișcă
prețul; de aceea ar putea ține.

**Un singur test, pe 1h.** Pe 4h doar ~60% din blocuri au fost valide (ambele clase cu destule eșantioane), iar abaterea e mai mare:
ar trebui peste un an de date. Nu se judecă.

**Mărimea care contează.** Raportul pe bloc de cel puțin ×1,2. Sub el nu s-ar schimba nicio setare de grid. Pragul e pus acum, înaintea
datelor noi, și e peste ce au arătat blocurile vechi.

**Pragul testului.** Regula din capul jurnalului: se numără toate testele cu verdict de până acum. 32 până la M5 inclusiv, acesta, plus
cele două ale jurnalului notei (mai jos) = 35 ⇒ p ≤ 0,05 ÷ 70 (0,071%), într-o parte.

**Datele.** Aceleași 21 de perechi (lista din script), lumânări Binance perp de 1h. Intră doar eșantioanele a căror bară etichetată se
închide din 14.11.2026 încolo (tăietura = capătul datelor din M5, 13.11.2026 19:00 UTC); eticheta poate privi în urmă peste tăietură,
urmarea (cele 24 de ore) e toată nouă. Blocuri de 5 zile calendaristice de la 14.11.2026, luate la rând și doar **încheiate** (ultima zi
a blocului e în urma celei mai noi zile cu eșantioane); un bloc încheiat în care o clasă are sub 20 de eșantioane se sare.

**Câte blocuri și ce șanse.** 30 de blocuri încheiate (150 de zile). Simulat (100.000 de rulări pe rând, abaterea 0,222, testul și pragul
de mai sus, cu tot cu mărimea minimă):

| raportul adevărat pe bloc | iese semnificativ | iese DOVEDIT (semnificativ și cel puțin ×1,2) |
|---|---|---|
| ×1,00 (niciun efect) | 0,07% | 0,00% |
| ×1,13 (cât a arătat fereastra veche) | 33% | 7% |
| ×1,18 (cât a arătat fereastra principală) | 71% | 34% |
| ×1,20 | 82% | 50% |
| ×1,25 | 96% | 84% |
| ×1,30 | 99,6% | 97,5% |

Adică: dacă efectul adevărat e cât s-a văzut în M5, **șansa de „dovedit” e de 7–34%**; ca să iasă dovedit în patru cazuri din cinci,
efectul adevărat trebuie să fie pe la ×1,25. Reluarea merită doar fiindcă nu costă nimic (scriptul așteaptă singur); cel mai probabil
rezultat e „există, dar prea mic”. Un „nedovedit” de aici nu va însemna că efectul lipsește.

**Verdictul.** Pe PRIMELE 30 de blocuri încheiate și valide de după tăietură — eșantion fix, deci rularea de mai târziu nu e „încă o
privire”. DOVEDIT = p ≤ 0,05 ÷ 70 și raportul pe bloc de cel puțin ×1,2. Altfel NEDOVEDIT, iar ideea se închide: nu se mai reia cu alt prag.

**Ce se schimbă pe pagină.** Dovedit ⇒ rândul de 1 oră din „Regimul pentru grid” spune cifra („după benzi largi drumul următoarelor 24 h a
fost de N ori mai lung decât după benzi strânse”). Nedovedit ⇒ rămâne „nedovedit”.

**Când.** Nu înainte de mijlocul lui aprilie 2027 (30 de blocuri încheiate + ziua care arată că ultimul e întreg). Scriptul refuză până
atunci: `node scripts/cercetare-v100339-acuratete.mjs --ce=m5b --tf=1h` scrie „PREA DEVREME” și câte blocuri sunt. Fără `--pana` nu ține
nimic în cache (o rulare de probă de azi nu poate îngheța datele rulării adevărate). Judecata e în `scripts/lib/m5b-reluare.mjs`, probată
în `scripts/proba-v100341.mjs`.

**Încercări.** A doua măsurătoare a efectului B (prima: M5, nedovedit). Un test nou, pe date noi.

## Jurnalul notei pe viu — regulile judecății (scrise 14.11.2026, înaintea primei cifre)

*(Rescrise în aceeași zi, după revizia independentă, tot înaintea primei cifre. Ce a schimbat revizia: unitatea testului e blocul de 5
zile, nu ziua — urmările notelor vecine se suprapun; zilele se țin separat de jurnal, ca eșantionul să fie chiar fix; pragul numără toate
testele; notele judecate târziu nu intră.)*

**Ce se adună.** Colectorul notează, o dată pe bară de 4 ore, pentru monedele boților porniți: nota TradingView pe 4 ore (cu bara în curs,
așa cum o arată pagina), verdictul Radarului arătat de pagină în aceeași clipă (confirmat pe două bare) și prețul. După 4 bare (16 ore)
notează prețul de atunci. Intră notele de la 14.11.2026 10:45 UTC încolo (de când se notează verdictul arătat, colector v101.179) și doar
cele judecate la timp: cel mult 20 de ore după notă (4 bare și una îngăduită). Dacă se schimbă ce se notează sau cum se judecă, ceasul
pornește de la capăt, cu altă dată de început scrisă aici.

**Cum se numără.** O notă cu direcție (|nota| > 0,1; verdictul BULLISH sau BEARISH) a nimerit dacă prețul de după e de partea ei. Zilele
(UTC, a notei) se țin într-un fișier al lor, separat de jurnal: jurnalul își taie cu timpul zilele vechi, întregi, iar o zi ieșită din
jurnal nu se mai schimbă.

**Ce arată pagina.** Pentru fiecare serie, de la 30 de zile ale ei cu note judecate: un rând în cartela TradingView, ca fapt — partea
notelor care au nimerit, câte note, în câte zile — fără culoare și fără verdict. E pe toate monedele boților, nu pe moneda de pe ecran.

**De ce blocuri, nu zile.** Notele se iau la 4 ore și se judecă după 16: urmările notelor vecine împart același drum al prețului, și peste
miezul nopții. Pe zile, un test fără niciun efect a ieșit „dovedit” de 1,4–1,8 ori mai des decât pragul (revizia independentă: 1,7–2,2%
la un prag de 1,25%). Pe blocuri de 5 zile, simulat (preț la întâmplare, 20.000 de rulări pe lume, patru feluri de note — mereu aceeași
direcție, după impuls, care ține, la întâmplare): respingeri la 2,5% între 2,4% și 2,8%; la pragul verdictului 9–18 din 20.000 (nominal
14). Poarta (cel mult de două ori nominalul) e trecută.

**Judecata, o singură dată pe serie.** Blocuri de 5 zile calendaristice de la 14.11.2026, luate la rând și doar **încheiate** (toate cele
5 zile au trecut și nicio notă din ele nu mai așteaptă judecata); un bloc încheiat cu sub 12 note ale seriei se sare. Se judecă **primele
36 de blocuri** încheiate și valide ale seriei (eșantion fix). Două teste — nota TradingView și verdictul Radarului — fiecare Student
într-o parte pe (partea nimerită a blocului − 50%). Pragul, după regula din capul jurnalului (35 de teste cu verdict, cu M5b): p ≤ 0,05 ÷
70. „Nimerește direcția” = p sub prag și media blocurilor de cel puțin 55%. Altfel „nedovedit”. Colectorul îngheață judecata fiecărei
serii când se împlinește și nu o mai reface; cititorul din linia de comandă citește judecata înghețată.

**Ce șanse are.** Simulat (20.000 de rulări, cu suprapunerea urmărilor): cu 36 de blocuri, o nimerire adevărată de 58% iese dovedită în
38% din cazuri, una de 60% în 66%, una de 65% în 99%. Cu 30 de blocuri: 28%, 53%, 96%. Deci un „nedovedit” va spune doar că nota nu
nimerește cu mult peste 60%; nu că nu nimerește deloc. 36 de blocuri înseamnă cel puțin 180 de zile cu boți porniți.

**Notele pe 1 zi** (judecate după 4 zile, deci suprapuse mult) se numără, dar nu se judecă.

**Față de ce s-a măsurat pe istoric.** Pe motorul refăcut și pe bare închise, direcția a fost nimerită în 47–50 din 100 de cazuri (M1,
13.11.2026). Jurnalul pe viu măsoară altceva — nota adevărată, cu bara în curs — deci o cifră diferită nu e o contradicție; una apropiată de
50% ar întări ce scrie deja pagina („nedovedit”).

**Ce urmează după judecată.** „Nimerește direcția” ⇒ pagina o spune lângă notă, cu cifra. „Nedovedit” ⇒ rămâne cum e azi: informație, nu
intră în verdict. În niciunul din cazuri nota nu intră în verdictul botului fără o măsurătoare separată.
