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

## Ce NU s-a făcut

- Clasificatorul de regim pentru grid (ADX + eficiență + percentila Bollinger) și „becul tradus pentru grid”: măsurătoarea n-a confirmat ideea.
- Cardul vechi al verdictului a rămas în pagină, ascuns ca până acum.
- Totalul botului nu se recalculează la prețul viu (s-a adăugat doar ora citirii lângă el).
- Jumătatea de treaptă a modelului continuu; simbolurile LSE de două litere cu punct la coadă.
- Jurnalul colectorului ține nota TradingView și prețul, nu și verdictul Radarului din aceeași clipă.

## Probe

`npm run test:v100339` (`scripts/proba-v100339-a.mjs` … `-d.mjs`), în lanțul `npm test`. Planul, cu bifele și starea celor parțiale:
`docs/superpowers/plans/2026-11-13-audit-tablou-reparatii.md`.
