# Audit sever — Tabloul botului, 13.11.2026 (v100.338, `79fa4c6`) și reparațiile din v100.339

Cererea lui Marius: „vreau să faci audit la pagina botului, să verifici acuratețea indicatorilor și semnalelor, TradingView Technicals,
Range, detaliile botului, să vezi dacă pot fi îmbunătățite sau dacă zic prostii; poți să aduci idei noi dacă ai”. După raport: „fă absolut tot”.

**Auditul a fost doar citire** (niciun fișier schimbat, serverul și colectorul neatinse). Reparațiile sunt în v100.339 (colectorul v101.178).
Sumele din cont, pozele și capturile paginii vii nu sunt aici, pentru că depozitul e public.

**Cum s-a lucrat.**
- Pagina vie, la 412 și 1920 px, cu textul luat **doar din elemente care se văd** (după o constatare falsă a mea, retrasă: citisem textul unui
  card ascuns).
- Formulele paginii rulate în node (`scripts/lib/motor-pagina.mjs` taie funcțiile din `public/app.js`, fără nicio copie) și puse lângă o
  implementare scrisă de la zero (`scripts/lib/indicatori-referinta.mjs`).
- Măsurători pe lumânări publice Binance, cu regulile scrise înainte de cifre: `docs/cercetare/2026-11-13-tablou-acuratete.md`.
- La final, o revizie independentă a întregii diferențe, făcută de un revizor care n-a scris codul.

## Ce ține, probat

- **Formulele sunt corecte.** RSI, MACD, ADX / ±DI, Bollinger %B, MFI, Stochastic %K(14, 3) și Stoch RSI dau aceleași cifre ca referința
  independentă (definițiile TradingView / Wilder) — proba `(E1)` din `scripts/proba-v100339-b.mjs`.
- **Banii botului** (total, grile, comisioane, funding, distanța până la lichidare) se potrivesc cu ce dă Pionex.
- **Fără scurgeri din viitor** în estimarea din situații asemănătoare și în măsurători (verificat și de revizor).

## Ce s-a măsurat (lumânări publice, 21 de perechi, dovada pe zile)

| Ce | Rezultat | Ce face pagina cu el |
|---|---|---|
| Direcția arătată de verdict, la 4 bare (1h / 4h) | 47,0% / 48,7% — **nedovedit** | scrie „47–50 din 100: nedovedit”; rezumatul nu mai dă roșu / verde |
| Direcția becului | 49,5% / 49,0% — nedovedit | la fel |
| Direcția notei TradingView (formula ei refăcută, pe bare închise) | 47,7% / 49,4% — nedovedit | „48–49 din 100 (nedovedit)” sub tabel |
| Estimarea din situații asemănătoare | 50,1% / 50,0% — nedovedit | „50 din 100 de cazuri — cât dat cu banul”; ponderea în scor rămâne zero |
| Banda estimării pe mers aleator (ar trebui ~5% în afară) | regula veche 8,3%, cea nouă **5,3%** (5,8% pe altă sămânță) | banda nouă (cuantila Student) |
| Verdictul care se întoarce în cel mult două bare | ~49% din episoade; cu confirmare pe două bare ~20% | verdictul se schimbă abia la a doua bară închisă; bara de acum poartă „⏳” |
| „Bec lateral ⇒ mai puțină mișcare” | **neconfirmat** pe date mai vechi (raport 0,91 și 0,94, intervalul trece de 1) | pagina nu spune nimic despre asta |

Pe scurt: indicatorii descriu corect ce e pe grafic, dar **niciunul nu s-a dovedit că spune încotro merge prețul**. Pagina o spune acum pe față.

## Ce era greșit și s-a reparat

**Semnale greșite (A).**
1. **Monte Carlo orb.** Când reluarea drumului real „oprea” botul pe un stop sau o țintă pe care Pionex nu le atinsese (prag pus după pornire),
   toate drumurile stăteau pe loc: „0% / 0% / pe zero 100%”, iar vocile de sub verdict făceau din asta „Monte Carlo contra botului”. Acum, pe
   botul care rulează, pragurile se socotesc de aici încolo; dacă pragul e depășit și la prețul de acum, rămâne informația „reluarea nu se
   potrivește cu Pionex”, fără procente.
2. **Stopul propus de partea greșită a prețului** când prețul ieșise din grid și fișa monedei nu sosise. Acum stopul se propune doar dincolo de
   prețul de acum; altfel se spune doar faptul.
3. **Stopul la zero pe un plus mic** (bot de câteva minute, zero-ul la sub o grilă): l-ar fi închis la prima oscilație. Acum are aceleași gărzi
   ca ținta la zero: o oră de viață, plus de cel puțin 1% din bani, zero-ul la cel puțin o grilă.
4. **„Și 4 ore, și 1 zi arată…”** apărea și când unul dintre ele n-avea date. Acum cere amândouă; intervalul lipsă e numit.
5. **Rândul Range Filter** spunea „NU TRECE” fără semnal pe bara închisă și „stop (filtru)” pentru distanța până la filtru.
6. **Nota TradingView** venea de pe alt instrument decât al botului (Binance în loc de Pionex) și, la monedele „în mii”, de pe alt preț. Acum:
   `PIONEX:` întâi, apoi Binance cu scara contractului, prețul verificat (peste 3% abatere = „alt instrument”, nota nu se arată), motivul
   lipsei scris. Pe Trading 212, simbolul nesigur nu mai primește notă nici în rând, nici în fișă, nici în bandă.

**Indicatorii și textele lor (B).** „Stochastic” era de fapt Stoch RSI (acum e al prețului, ca în TradingView; Stoch RSI are rândul lui);
explicația verdictului cita un prag fix, nu pe cel folosit; banda „N din 8” număra aceiași indicatori de mai multe ori (acum trei familii:
trend, impuls, poziție); culoarea era când „față de bot”, când „piața” (acum una singură, cu legendă); sub 200 de bare „EMA 200” intra în scor;
pe bare plate RSI și MFI ieșeau „încins”; scorul lângă prag se rotunjea peste el; pe telefon explicația unei celule nu se putea deschide.

**Detaliile botului (C).** „Prețul a ieșit din grid” spunea același lucru pe partea câștigului și pe a pierderii; grilele pe 24 h erau puse lângă
comisionul mediu de la pornire („costurile mănâncă grilele” la un bot liniștit); taxa de intrare era numărată drept comision al grilelor;
sumele mici ieșeau „0,0”; poziția era rotunjită la întreg; rândul Funding se colora după ultima rată, nu după media pe 7 zile; „Dacă prețul
ajunge la…” nu era în oglindă la short; în „Cele șapte măsuri”, „amplitudine vs treaptă” ieșea roșu cam o oră din patru cât botul lucra.

**Reguli noi (D).** Verdict stabil (confirmare pe două bare, „ține de N bare”, componenta care l-a mișcat); „drumul prețului, în trepte”;
„cât de des nimerește” pe cartelă; jurnalul notei TradingView cu bara în curs, ținut de colector (doar citește scannerul public).

## Revizia independentă (14.11.2026)

A găsit 1 roșu, 6 galbene și 10 albastre în reparațiile de mai sus. Toate sunt reparate, fiecare cu proba pusă întâi:

- 🔴 Taxa de intrare se scădea și la botul **neutru**, care nu deschide poziție la pornire: un comision de 88% din grile ieșea „6,6% · bine”.
- 🟡 Monte Carlo: cu pragul depășit și la prețul de acum, a doua trecere oprea toate drumurile la prima bară („CÂȘTIGĂ în 100% · stopul atins
  100%” sau „PIERDE în 100%”); cu reluarea lichidată, „0% / 0% / 100%” rămânea pe ecran.
- 🟡 Banda „Detaliile indicatorilor” din fișa Trading 212 lua nota TradingView fără garda simbolului nesigur.
- 🟡 Tura notei TradingView cerea scannerul la fiecare tură când n-avea ce nota; nota unei monede dispărute rămânea „de judecat” la nesfârșit.
  Acum: cel mult o cerere la un sfert de oră, expirare la de două ori orizontul, jurnalul în fișierul lui.
- 🟡 „Tranzacțiile pe 24 h” ale Pionex: verificat pe un bot viu că sunt perechi (raportul față de perechile socotite din grile: 0,99). Comisionul
  zilei era corect; greșit era sfatul de ritm, care le compara cu ordinele închise pe zi.
- 🟡 Probe lipsă: banda estimării, vecinii la un orizont distanță, gărzile stopului la zero una câte una, oglinzile la long. Adăugate.
- 🔵 Texte și margini: rând de acțiune de 132 de caractere; alerta din banda de revenire spunea „sub interval” cu prețul în interval; nota
  TradingView fără preț apărea neverificată fără o vorbă; cifra măsurată pe crypto apărea și pe fișa unei acțiuni; rezumatul fără 4 ore și
  1 zi; randamentul zero numărat „coborâre”; Funding la botul neutru; răspunsul întârziat al notei unei alte monede.

Observațiile de statistică ale reviziei (numărătoarea testelor, histerezisul fără efect măsurabil, reluabilitatea) sunt în jurnalul de cercetare.

## Ce am greșit eu în audit, spus pe față

- Am raportat ca vizibil un card care era ascuns (text citit dintr-un element nedesenat). Retras; de atunci textul se ia doar din ce se vede.
  Jumătate din retragere era însă pripită: aceeași măsură apărea roșie, la vedere, în „Cele șapte măsuri”.
- Am scris că „cam 10% din întoarcerile verdictului” vin din săritura parametrilor. Măsurat: ~1% (zece la sută era din comutările de profil).

## Restul, făcut în v100.340 (14.11.2026, „repară tot și fă ideile”)

Cele cinci rânduri rămase „nefăcute” în v100.339 sunt făcute:

- **Regimul pentru grid, măsurat cinstit (M5).** Clasificatorul (ADX 25 / 20, percentila lățimii benzilor Bollinger 30 / 70) e pe pagină, pe
  1 oră și pe 4 ore, ca stare de acum. Ce urmează după un regim s-a măsurat pe 21 de perechi, cu dovada pe blocuri de 5 zile și cu mărimea
  testului verificată înainte pe 20.000 de serii fără efect: **nedovedit** peste tot. După „lateral” prețul nu oscilează mai mult decât după
  „trend” (eficiența următoarelor 24 de ore: 0,21 cu 0,21); după benzi largi drumul e de 1,2–1,3 ori mai lung, dar sub pragul scris
  dinainte. Pagina scrie „ce urmează: nedovedit”. Cifrele: `docs/cercetare/2026-11-13-tablou-acuratete.md`, „M5 — rezultatul”.
- **„Bun pentru grid” a dispărut.** Becul lateral spune „nici cu botul, nici împotrivă” și e gri. O piață toată laterală nu mai apare „Cu
  botul” (KPI-ul „Piața”, banda prețului viu) și nu mai e motiv verde în Consilier: stă în „Restul”, ca fapt. Verdictul nu se schimbă.
- **Perechile din drumul prețului.** Sub „Cele șapte măsuri”: câte perechi ar fi dat închiderile de 5 minute mergând pe liniile gridului
  botului (aritmetic sau geometric, cu loturile pe care le ține deja). Lângă ultima oră a botului stă ultima oră a drumului; media botului
  pe 24 de ore e spusă ca altă fereastră. La gridul neutru fără preț de pornire cifra nu se dă.
- **Totalul la prețul viu**, lângă ora citirii, când diferă de cel citit.
- **Modelul pe linii.** „Dacă prețul ajunge la…”, prețul de zero și țintele se socotesc pe liniile gridului (cu linia goală de lângă preț),
  nu cu loturile întinse uniform; poziția vine din același model; când poziția nu se potrivește cu liniile, nota spune că e aproximare.
- **Cardul vechi al verdictului** e scos; avertismentele care se văd au rândul lor sub verdict, cu butonul spre parolă când e cazul.
- **Simbolurile de două litere de la Londra** primesc nota TradingView (`LSE:XX.`, cu `LSE:XX` ca rezervă).
- **Jurnalul colectorului** (v101.179) scrie lângă nota TradingView verdictul Radarului din aceeași clipă — cel arătat de pagină, confirmat
  pe două bare, cu al barei alături (4 ore și 1 zi, pe bare proaspete); bilanțul: `npm run raport:nota-tv` (sub 30 de zile spune că e
  prea devreme).

Prima revizie independentă a acestor schimbări a găsit 8 galbene și câteva albastre (unitatea scrisă de două ori la totalul viu; perechile
din drum numărate de până la 4,6 ori prea multe; rândul avertismentelor ajuns la coada paginii; regimul altei monede sub botul nou; și, cea
de fond, procedura statistică dintâi respingea de zece ori prea des pe serii fără efect — oprită înainte să atingă piața și înlocuită).
Toate reparate, cu proba întâi.

A doua revizie independentă, pe reparații: niciun roșu, 6 galbene. Rândul de avertismente cădea sub grafic pe calculator (acum stă în capul
cifrelor acolo, și sub verdict pe telefon și tabletă — măsurat în browser la 1920, 768 și 412); sfatul „Marginea de jos / sus” arăta
poziția din modelul vechi lângă totalul nou (un lot în plus); un sfat de trend mai zicea „lateral e bine pentru un grid”; perechile din
drum se numărau pe linii aritmetice și la gridul geometric, iar gridul neutru fără preț de pornire ieșea ca un long; comparația cu botul
nu era pe aceeași fereastră. Reparate la fel, fiecare cu testul verificat și „pe roșu” (codul stricat anume într-o copie).

## Ce NU s-a făcut

- **Căderea legăturii de administrare de după paza paginilor** (de două ori, câteva minute): cauza n-a fost găsită. Jurnalele serverului nu
  arată nimic în acele minute, iar Radarul a răspuns normal în tot acest timp. De prins la următoarea cădere, cu diagnosticul pornit chiar
  atunci.
- Categoria „Bun pentru grid” din sugestiile scannerului (liniștit, lateral) e aceeași idee nedovedită, în altă pagină; a rămas neatinsă:
  e numele unei categorii cerute anume, de hotărât separat.
- `npm run test:ecran` (`scripts/proba-ecran-tablou.mjs`, în afara lanțului) pică la fel și pe pagina neatinsă: e o probă veche, rămasă
  în urmă; nereparată aici.
- Efectul B (benzi largi ⇒ drum mai lung) nu se mai încearcă pe aceleași date cu alte praguri; s-ar putea relua doar pe date noi.

## Probe

`npm run test:v100339` (`scripts/proba-v100339-a.mjs` … `-d.mjs`) și `npm run test:v100340` (`scripts/proba-v100340-a.mjs`, `-b.mjs`), în lanțul
`npm test`. Planurile, cu bifele: `docs/superpowers/plans/2026-11-13-audit-tablou-reparatii.md` și
`docs/superpowers/plans/2026-11-14-rest-audit-tablou.md`.
