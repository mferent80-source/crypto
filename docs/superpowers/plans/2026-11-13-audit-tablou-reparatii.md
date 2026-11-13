# Tabloul botului: reparațiile auditului din 13.11 + ideile I-868..I-875 — plan de implementare

> Execuție: direct, în sesiune (regula casei), test întâi pe fiecare sarcină, un singur commit și o singură livrare la final.

**Scop:** Tabloul botului să nu mai spună lucruri greșite (Monte Carlo orb, stop propus dincolo de preț, „Stochastic” care nu e al prețului,
praguri scrise greșit) și să spună ce contează la un grid (mișcarea față de trepte, starea reală a botului), cu fiecare cifră nedovedită
etichetată ca atare.

**Arhitectură:** fără module noi mari. Regulile stau unde sunt deja (`public/lib/*.js`, `calc` din `public/app.js`, `functions/_shared`),
fiecare schimbare are o probă de purtare în `scripts/proba-v100339-*.mjs` (rulează modulul real, nu caută text în sursă). Schimbările de
REGULĂ (verdictul stabil, estimarea din situații asemănătoare, mișcarea față de grid) au ipoteza și regulile scrise înainte de cifre în
`docs/cercetare/2026-11-13-tablou-acuratete.md` și se măsoară cu `scripts/cercetare-v100339-acuratete.mjs`.

**Sursa:** `AUDIT-SEVER-CLAUDE-2026-11-13.md` (constatările) și backlogul de idei I-868..I-875.

## Constrângeri

- Radarul doar citește și avertizează; niciun ordin, nicio scriere la Pionex / Trading 212.
- Rezultatele cu o singură zecimală; ecoul a ce a tastat omul rămâne exact.
- Nimic nu se pierde din pagină: inventarul de structură (titluri, butoane, rânduri) înainte și după, la 412 și 1920.
- Un semnal fără avantaj măsurat nu primește verde / roșu de sfat; poartă „nedovedit”.
- Stopul nu se propune în mijlocul gridului și nici dincolo de prețul de acum.
- Fișierele sunt CRLF pe disc: editări doar cu Edit sau scripturi node cu assert; fără `sed -i`.
- Depozitul e public: fără sume din cont și fără identificatori de boți în cod, probe sau documente.

## Ce trebuie privit la revizie (nu e acoperit de la sine de probe)

1. Botul care rulează, dar pe care reluarea îl oprește: pagina nu are voie să spună „contra botului” și nici „0% / 0% / 100%”.
2. Prețul ieșit din grid cu fișa / profilul monedei nesosite: niciun preț de stop de partea greșită a prețului.
3. Interval fără date (1 zi picat, sub 60 de bare): nicio frază care îl numără ca și cum ar arăta o direcție.
4. Simbol TradingView greșit sau lipsă: „—” cu motivul, niciodată nota altui instrument.
5. Bare plate, volum zero, maxim / minim lipsă: „—”, nu „încins” / „epuizat”.

## Sarcinile (fiecare: proba care pică întâi, apoi reparația, apoi proba verde)

### A. Semnale greșite
- [x] A1 Monte Carlo (I-868): `GridSim.simuleaza(…, { botRuleaza: true })` — când reluarea oprește botul pe stop / țintă și botul rulează,
      pe drumul real rămâne gridul, iar stopul și ținta se aplică de la prima bară simulată (`rez.praguriDeAici = true`). Lichidarea pe drumul
      real rămâne „Reluarea arată…”, cu starea `info` (nu `rau`): fără voce „contra”. Colectorul și pagina trimit `botRuleaza`; verdictele
      „cu pragurile de aici încolo” nu intră la scor. Fișiere: `public/lib/grid-sim.js`, `scripts/lib/tura-monte-carlo-bot.mjs`, `public/app.js`.
- [x] A2 Stopul propus (`public/lib/semnale-bot.js`): dincolo de prețul de acum, altfel doar faptul („prețul e deja dincolo de grid”), fără cifra de bani.
- [x] A3 Stopul la zero pe un plus mic: aceleași gărzi ca ținta la zero (vârstă, câștig, distanță).
- [x] A4 „Și 4 ore, și 1 zi”: doar cu ambele intervale citite; altfel numește intervalul care arată direcția (`public/lib/indicatori-bot.js`).
- [x] A5 Rândul Range Filter din Tablou ca pagina Range Filter: „NU TRECE” doar cu semnal pe bara închisă, „distanța până la filtru”,
      „nedovedit” mereu, ora barei (`public/app.js` `tbRangeFilterRand`).
- [x] A6 Nota TradingView (I-869): lanț `PIONEX:` → Binance cu harta „în mii” → motivul lipsei; prețul verificat față de Pionex; la acțiuni
      fără notă pe simbol găsit „după nume” sau cu bare respinse; două zecimale lângă praguri; cererea nu ține în loc direcția; vârsta de la
      server; tabelul colorat față de bot; legenda bazelor la vedere. Fișiere: `functions/_shared/tv-note.js`, `functions/api/market.js`,
      `public/lib/tv-note.js`, `public/lib/t212-ecran.js`, `public/app.js`.

### B. Indicatorii și textele lor
- [x] B1 Stochastic (I-870): rândul = %K(14, 3) al prețului; Stoch RSI netezit, sub numele lui; scorul rămâne pe intrarea veche.
- [x] B2 Explicația verdictului din `q.prag` + ce intră în scor; parametrii Supertrend scriși.
- [x] B3 Rezumatul „N din 8” pe trei familii (trend / impuls / poziție), fiecare o dată.
- [x] B4 O singură convenție de culoare pe cartelă (față de bot; săgeata = piața) + legendă.
- [x] B5 Sub 200 de bare: „EMA 200” și semnul ei „—”, spus pe ecran.
- [x] B6 Bare plate / volum zero / maxim-minim lipsă ⇒ „—”.
- [x] B7 Scorul lângă prag cu o zecimală și în celule; B8 zone neutre (RSI 45–55, DI, Bollinger „lipit” de la 95% / 5%).
- [x] B9 Graficul mic: punctul colorat după verdictul lui; B10 pe telefon explicația la atingere; B11 „ADX · RSI (cu bara de acum)”.
- [x] B12 Nedovedite fără verde: estimarea își păstrează „nedovedit”, regimul macro față de direcția botului, Busola „mai calmă”, ADX „vremea gridului”.
- [x] B13 Estimarea din situații asemănătoare: trăsături normalizate, vecini la cel puțin un orizont distanță, banda pe episoade, cifra măsurată pe piață.

### C. Detaliile botului
- [x] C1 „Prețul a ieșit din grid”: pe partea câștigului altă frază decât pe partea pierderii; o singură acțiune pe cartelă.
- [x] C2 „Mută gridul” la marginea de pierdere spune cât fixează închiderea.
- [x] C3 Grilele și costurile pe aceeași fereastră; C4 „comision față de grid” fără taxa de intrare, judecat după o zi.
- [x] C5 Sumele mici cu zecimalele lor; poziția cu cifre semnificative.
- [x] C6 Neutru cu stop în procente; C7 neutru: ambele margini; C8 „pierderea maximă” = investiția, la lichidare; „stopul propus”.
- [x] C9 Rândul „Funding” după media pe 7 zile; C10 bot spot fără direcție; C11 „Dacă prețul ajunge la…”: „lichidat” și ținte oglindite la short.
- [x] C12 Sub o zi fără „pe zi” extrapolat; C13 textele mărunte; C14 ora citirii lângă total.
- [x] C15 Rândul de identitate (I-874): de când rulează, perechi, ritm, poziție, levier efectiv.

### D. Reguli noi, cu măsurătoare (jurnalul scris înainte)
- [x] D1 Verdict stabil (I-873): regim cu histerezis, confirmare pe 2 bare închise, „ține de N bare”, componenta care l-a mișcat.
- [ ] D2 (PARȚIAL, vezi „Starea la 14.11”) Mișcarea față de grid (I-872): trepte străbătute, ritmul perechilor, becul tradus pentru grid; cardul vechi ascuns scos.
- [x] D3 „Cât de des nimerește” (I-871) pe cartelă + măsurătoarea reluabilă în repo.
- [x] D4 Jurnalul notei TradingView în colector (I-875).

### E. Încheiere
- [x] E1 Probe: serie de referință pentru formule; generatorul LCG din `proba-ecran-tablou.mjs` înlocuit; probele vechi aduse la zi.
- [x] E2 Suita întreagă; inventarul „nimic pierdut”; pozele la 412 / 768 / 1920 / 2560, zi și noapte.
- [x] E3 Revizie independentă pe diferență; reparat ce găsește.
- [ ] E4 Versiunea v100.339 (badge, BUILD_INFO, cheia SW), raportul de audit, un commit, întrebarea „livrez acum?”, livrarea, paza paginilor.

## Starea la 14.11.2026 (după revizia independentă)

Bifat = făcut și ținut de o probă din `scripts/proba-v100339-{a,b,c,d}.mjs`. Ce NU e întreg, spus pe nume:

- **D2 (I-872), parțial.** Făcute: „drumul prețului, în trepte” (cu cifra amplitudinii păstrată pe același rând, fără starea ei „rău”) și
  ritmul perechilor judecat peste zgomotul lui. Nefăcute: „becul tradus pentru grid” — măsurătoarea M4 n-a confirmat că becul lateral aduce mai
  puțină mișcare, deci pagina nu spune nimic nou despre asta; clasificatorul de regim (ADX + eficiență + percentila Bollinger) nu s-a construit;
  cardul vechi al verdictului (`#tbVerdictCard`) a rămas în pagină, ascuns ca până acum (`display:none` mereu) — codul scrie în el în cinci
  locuri și patru probe îl citesc, iar scoaterea lui n-ar schimba nimic din ce se vede.
- **C4.** În loc de „judecat după o zi” (contrazicea regula veche „taxe care curg fără profit brut = rău”), comisionul se judecă fără taxa de
  intrare estimată. La botul neutru nu se scade nimic (revizia independentă).
- **C14.** S-a adăugat ora citirii lângă total; totalul NU se recalculează la prețul viu (rămâne al citirii).
- **A6.** Simbolurile LSE de două litere cu punct la coadă n-au fost verificate pe TradingView.
- **D4.** Jurnalul colectorului ține nota TradingView și prețul; verdictul Radarului din aceeași clipă nu se notează.
- **Neatins din audit:** jumătatea de treaptă a modelului continuu (🔵 15 din raportul de audit).

**Revizia independentă (E3):** 1 roșu, 6 galbene, 10 albastre — toate reparate, cu probă pusă întâi (taxa de intrare la neutru; Monte Carlo cu
pragul depășit și acum; „0% / 0% / 100%” pe drumuri care stau pe loc; garda simbolului nesigur în banda Trading 212; cererile turei notei
TradingView; „tranzacțiile pe 24 h” = perechi; probele lipsă; textele 🔵 8–16; jurnalul notei în fișierul lui). Observațiile ei de statistică
sunt în `docs/cercetare/2026-11-13-tablou-acuratete.md`, la „Revizia independentă”.
