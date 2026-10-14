# Audit sever Crypto Radar — 14.10.2026, seara (v100.195, `ac4dc1f`)

Cererea lui Marius: „acum fă audit la toată aplicația crypto și pune la treabă skill-urile vechi și noi pe toate direcțiile”.
**Doar citire: niciun fișier de cod schimbat**, serverul și colectorul neatinse, nimic trimis extern.

**Cum:** șapte auditori Opus în paralel, câte unul pe zonă, fiecare cu cele 9 lentile din `auditing-trading-suite` și cu
skill-urile zonei lui invocate. Pe orice cifră „dovedit / probabilitate / avantaj” s-au aplicat pachetele 10–11. Probele s-au
făcut pe datele reale de pe 8788 (doar GET), pe modulele încărcate în node și pe paginile randate (53 de pagini × 1440 și 390 px).
Consistența între zone (lentila 6) și verificarea fiecărui 🔴 le-a făcut sesiunea principală. Două 🔴 au coborât la 🟡,
fiindcă sunt latente.
Rapoartele detaliate, cu sumele din cont, probele și pozele, sunt păstrate privat pe `E:\Backup-Claude\crypto-audit-2026-10-14\`,
nu aici, pentru că depozitul e public.

## Sumar executiv

| Zona | 🔴 | 🟡 | 🔵 | Verdict pe bani reali |
|---|---|---|---|---|
| Serverul și securitatea (`functions/**`, chei, depozitul public) | 0 | 1 | 12 | **gata** (după 🟡1) |
| Colectorul, alertele, PAZNIC, lansatoarele | 0 | 6 | 12 | **NU** până la 🟡 C3 (alerte oarbe tăcut) |
| Învelișul aplicației (`app.js`, `index.html`, `app.css`, `sw.js`) | 0 | 6 | 15 | gata pe cifrele de bani |
| Logica boților și a gridului | 1 | 5 | 8 | **NU** până la 🔴1 |
| Statistica, verdictele, probabilitățile, rețeaua | 2 | 8 | 9 | **NU** pentru „dovedit” la obiceiuri |
| Acțiunile, Trading 212, piața | 2 | 14 | 13 | **NU** pentru „🟢 CUMPĂR” al Porții |
| Interfața pe viu (53 de pagini × 2 lățimi) | 1 | 13 | 9 | NU pentru „Idei de cumpărare” |
| Consistența între zone (lentila 6) | 0 | 1 | 2 | — |
| **Total** (unele 🟡 apar în două zone, de ex. „LIVE DATA”, banda roșie goală, verdictele Trend nejudecate) | **6** | **~51 unice** | **~80** | |

**Ce ține, probat:**
- **Serverul:** toate cele 17 rute răspund 401 fără token, iar Origin străin primește 403 înainte de scriere. Spre Pionex și T212 pleacă doar GET.
- **Secretele:** zero în toate cele 672 de commituri. CSP-ul e strict, CORS e închis, fără SSRF, iar comparația tokenului e în timp constant.
- **Pagina:** nicio excepție JS pe 53 de pagini, la ambele lățimi. Nicio acțiune moartă: 246 din 246 de funcții există. Cele 1076 de id-uri citite de cod există, intervalele nu se adună, iar proba de telefon trece 55/55.
- **Calculele de bază:** formula lichidării, N+1 linii, long/short și simularea fără umpleri fantomă sunt corecte. Mulberry32 e folosit peste tot în afară de un loc în laborator.
- **Rețeaua și arborii:** walk-forward cu purjare, fără scurgere de viitor la crypto, calibrare bună (ECE 1,0–1,6 puncte).
- **Reparațiile de azi** (coșurile judecate pe zi) țin la verificare: 5,7–6,3 %.

## 🔴 Critice (toate verificate în cod de sesiunea principală)

1. **Stopul „la zero-ul botului” / „podeaua țintei” ignoră grilele cumpărate pe drum** — `public/lib/tablou-extra.js:98` (`dacaInchizi`),
   `:116` (`pretPentruTotal`). Ține poziția de acum fixă. La un long, fiecare treaptă coborâtă cumpără o grilă în plus, deci zero-ul real e mai sus.
   - **Proba**, pe un long construit cu 5×, 100 USDT și grid 0,9–1,1: la „zero”-ul promis, totalul real e **−71,5 USDT**. La „ținta +5” e −15,6…−19,4.
   - **Unde ajunge:** în `semnale-bot.js:122/123/181/284/287/370`, `alerte.js:135` (și pe Discord), `indicatori-bot.js:124` și în colector.
   - **Fix:** ramura de zero și de țintă trece pe `totalCuGridLa` (`:137`) / `pretOpritorPentru` (`:275`), modelul corect din același fișier.
     Auditul din 30.09 îl lăsase 🔵.
2. **Poarta T212 nu vede acțiunea pe care o ai deja** — `public/lib/actiuni-semnale.js:131` (`poarta`), `:312–320` (`marime`), plus
   `public/lib/t212-ecran.js:869`, care scoate acțiunea din propria corelație.
   - **Plafonul de 20 %** e socotit doar pe cumpărarea nouă.
   - **Proba**, pe pozițiile reale: o acțiune deja la 21,1 % din cont primește „🟢 CUMPĂR” și ar urca la 26,1 %, fără niciun rând „ai deja”.
   - **Fix:** `poarta` și `marime` primesc poziția existentă; plafonul se aplică pe total.
3. **Poarta T212 zice „🟢 CUMPĂR” cu rezultatele trimestriale în ≤ 10 zile** — `actiuni-semnale.js:131–144` nu primește data, deși ideile zilei
   exclud exact cazul ăsta (`idei.js:24–25`).
   - **Proba:** cu rezultatele peste 8 zile, pagina promite „la stop pierzi ~1 % din cont”. Un gap de −25 % sare peste stop și duce pierderea la ~1,7 %.
   - **Atenuare parțială:** lista „de făcut” (`t212-ecran.js:307`) avertizează doar pentru acțiunile deținute.
   - **Fix:** data rezultatelor intră în `poarta` (cel puțin „așteaptă”).
4. **Pe grafic, lichidarea în 7 zile apare „0 %”** — `public/lib/grafic-bot.js:336` (`Math.round(p*100)+"%"`), cu sursa în `probabilitati.js:53`.
   - **Proba:** pe 99.288 de rânduri walk-forward, unde scrie „0 %” lichidarea s-a întâmplat în **2,3 %** din cazuri, iar la 0,01–1 % în 3,8 %.
   - **Fix:** „< 1 %” plus marginea de sus a intervalului, nu „0 %”.
5. **„Idei de cumpărare”: coloana „Acum” e prețul de dimineață al colectorului** — `public/lib/t212-ecran.js:386` (antetul), `:374` (`x.pret`).
   Pe aceeași pagină, „Biletul” recalculează pe prețul viu: aceeași acțiune apare cu Acum $987.99 / Stop $839.79 în tabel și cu
   $913.61 / $776.57 pe bilet, adică −7,5 % și alt stop.
   - **Fix:** antetul devine „Dimineața (ora)” sau prețul viu cu stopul recalculat.
6. **Obiceiurile din „Riscul tău” ies „dovedit” fals de 4–5 ori mai des decât promite pagina** — `public/lib/risc-luna.js:65–85` (`verdict`).
   Bootstrap-ul e doar pe monede/acțiuni, fără blocuri de timp.
   - **Proba**, pe seturi fără efect: „dovedit” iese în 4,0–5,0 % față de ~1 %, iar p ≤ 0,05 în 15–18 %. Aceste p intră și în corecția Benjamini–Hochberg.
   - **Fix:** testul pe blocuri de timp există deja în `carnet.js:74` și trebuie dus aici.

## 🟡 Cele mai importante, după impactul pe bani

**Colector și alerte**
- **C3 — Pionex `results:null` lasă lichidarea, stopul și planul nejudecate, fără niciun anunț** (`scripts/colector.mjs:469`, `:488`).
- **C1** — Ziua, paznicul vede poza, nu bucla alertelor: o buclă blocată tot „bate”. Bătaia din `colector.pid` se învechește după 3 minute, iar un lansator poate porni un al doilea colector, cu alerte dublate.
- **C2 — Noaptea, o singură bătaie picată dă alarma critică falsă „colectorul tace”** (`scripts/lib/poza.mjs:170`, `paznic/worker.mjs:7`; reprodusă).
- **S1 (server)** — Zece parole greșite pe minut blochează și parola bună. Pe PC, browserul și colectorul au aceeași cheie de IP, „unknown”, iar colectorul ia 429 drept „nu e cădere” ⇒ alertele se opresc tăcut (`functions/_shared/auth.js:49`).
  - **Fix:** `n>=MAX && !bun`, iar colectorul tratează `AUTH_*` ca o cădere.
- **C6** — 306 respingeri `RATE_LIMITED` în 7 zile, provocate de colectorul însuși. De 5 ori alerta n-a ajuns în Radar și a plecat doar pe Discord (`colector.mjs:262`).

**Boți și grid**
- **B3** — Un stop dincolo de lichidare apare verde, „pus — L-aș lăsa” (`semnale-bot.js:185`). Pierderea arătată la stop e peste marjă.
- **B1 — „CÂȘTIGĂ în P % ±4” la simulator:** ±4 e doar zgomotul celor 500 de drumuri (`grid-sim.js:92`, `:241`).
  - Pe cele două jumătăți ale istoricului: SOL 32 % față de 70 %.
  - „Aș porni” iese în 103 din 108 porniri, iar verdictul nu e verificat după.
- **B2** — Verdictul simulatorului tolerează o lichidare de până la 2 % pe 7 zile, plus „renunță la stop”, contra alertei critice „n-ai stop” (`grid-sim.js:245–247`).
- **B4 — Fișa gridului, proba ÎNGUST/LARG și gridul îngust nu țin cont de funding** (`grid-proba.js:158`, `:325`, `grid-plan.js:67`). La 5×, 2–3 zile de funding înseamnă cât pragul „verde”.
- **B5** — Se alege cea mai bună din 36 de combinații, validată pe ~6 ferestre independente. Trei monede „short” din aceleași 12 zile înseamnă un singur regim, nu trei confirmări.

**Acțiuni și Trading 212**
- **A1–A5 — Poarta T212:**
  - două mărimi diferite pe același ecran;
  - „CUMPĂR” cu media negativă pe istoricul acțiunii;
  - fără regimul pieței;
  - fără banii liberi;
  - fără vârsta datelor: pe bare vechi de 43 de zile tot „cumpără”.
- **A7** — Textul Trend 12 luni „Poarta nu dimensionează pe el până la «probat»” e fals (`sugestii-ecran.js:147`).
- **A8** — Scorul zilei numără Nasdaq 100 de două ori (`scor-zi.js:53–60`).
- **A9/A10 — Scanul, alertele rețetelor și ideile pot folosi bara zilei încă neterminată** (`tura-scan.mjs:59`, `colector.mjs:1162`).
- **A11 — Privire în viitor la acțiunile europene** în „Dacă ascultai de Radar” (`actiuni-semnale.js:105`, 2 din 81 de trade-uri).
- **A12** — Același simbol are alt stop și altă mărime în Scan față de Poartă.
- **A13** — Ponderile adună $ + € + pence. Azi toate pozițiile sunt în $.

**Statistică**
- **St1 (colector C4)** — Verdictele `trend-12-1` și `top-sector` nu se judecă niciodată (verificat pe 8788). `/api/t212?action=preturi&ticker=FFIV` ⇒ „Nu știu simbolul de bursă”; merge doar `SNDK_US_EQ`. 404-ul e ținut minte 20 h (`tura-verdicte.mjs:73`).
  - **C5** — După fiecare repornire, verdictele se retrimit cu ora repornirii.
- **St2** — Registrul Benjamini–Hochberg are doar 12 teste: serverul aruncă `bilant.teste` (`functions/api/istoric-bot.js:324`). Totuși pagina promite „cel mult 5 % descoperiri false”.
- **St3** — Singurul „dovedit” real, „Episod scurt (≤ 5 zile)”, e etichetat după durată, care se știe abia la vânzare. Caseta pierde „legătură, nu cauză”.
- **St latent (fost 🔴)** — Jurnalul verdictelor pe sursele-simbol (Poarta T212/grid): verdictele din aceeași zi merg împreună. La pragul BH, „dovedit” fals iese de 5,6× mai des. Azi e un singur verdict.
- **St latent (fost 🔴)** — `scripts/lib/mc-regim.mjs:20/28`: blocurile sunt monedă×săptămână ⇒ „trece” fals în 16–23 %. Azi are 0 tăieturi. **De reparat înainte de 31.10**, când e programată validarea.
- **St4/St5** — ADX și becurile ies „dovedit” fals 2 % față de 1 %. Calibrarea numără „cazuri independente” pe bot, nu pe monedă×zi.

**Pagina**
- **P1** — Paleta Ctrl+K a pierdut „Jurnal de trade”, „Trading 212” și „Alerte” (`app.js:2709`). Cauza e un comentariu `//` lipit la mijlocul rândului, din v100.181.
- **P2** — Butonul shadow din Edge Validation Pro crapă: `const slip` e reasignat (`app.js:4433`).
- **P3** — „● LIVE DATA” e text fix (`index.html:80`), pe când Health arată „Live feed OFF”.
- **P4** — Pe Tablou stă permanent o bandă roșie goală: `#tbGridLarg` e `hidden`, dar `app.css:2122` pune `display:grid`.
- **P5** — Laboratorul vechi bagă alerte false „Operations SAFE MODE” în centrul de alerte, iar insigna „necitite” nu scade niciodată (`app.js:7625`, `:2963`).
- **P6** — „Risk of ruin” folosește un LCG (`app.js:4426`). Efectul măsurat e mic: 17,35 % față de 17,20 %.
- **UI:**
  - pe telefon, tabelele de idei n-au numele coloanelor (`app.css:1800`, `:1619`, lipsă `data-et`);
  - rezultate cu 2 zecimale și „.” amestecat cu „,” pe același card (`acasa-ecran.js:386`, `app.js:6475`);
  - „ultima zi −1,7 %” scris cu verde (`consilier.js:34`);
  - „100 de alerte în 24 h” vine dintr-o listă tăiată la 100;
  - engleză în meniu („Dashboard”, „Alerts”, „More”…);
  - ținte de apăsare sub 44 px (Alerts 108 din 108);
  - verde și roșu se confundă la daltonism (ΔE 4,3).

**Lentila 6 (consistența între zone)**
- **🟡 — RSI în două feluri.** `acasa.js:91` și `scan.js:10` folosesc Cutler, media simplă pe 14. `app.js:3154` și `grafic-bot.js:51` folosesc Wilder, ca TradingView.
  - **Proba**, pe 2.000 de serii: diferența mediană e 5,0 puncte, iar percentila 90 e 11,8.
  - În 14,3 % din cazuri, zonele 30/70 diferă: una spune „supracumpărat/supravândut” și cealaltă nu.
- **🔵** — Boții de hârtie din Grid (`grHartie`, `app.js:5339`), `signalJournal`, `jtNote` și `grSold` trăiesc doar în browserul fiecărui aparat ⇒ telefonul ≠ monitorul.
- **🔵** — Procentele apar cu „+1,2%” și „+1,2 %”. Există 8 implementări de EMA și 9 de escapare HTML.

## Top priorități (ordinea propusă pentru reparații)

1. 🔴1 stopul „la zero / podeaua țintei” cu grilele pe drum (ajunge pe Discord) · 🟡 B3 stopul dincolo de lichidare arătat verde.
2. 🔴2 + 🔴3 Poarta T212: poziția existentă în plafon + rezultatele trimestriale în verdict; apoi 🟡 A1–A5 (o singură mărime, banii liberi, vârsta datelor, regimul).
3. 🔴4 „0 %” la lichidare pe grafic · 🔴5 „Acum” = prețul de dimineață.
4. 🟡 C3 + S1 + C2: alertele care tac sau mint (Pionex gol, blocarea colectorului, alarma falsă de noapte).
5. 🔴6 obiceiurile pe blocuri de timp; 🟡 registrul BH întreg; `mc-regim` înainte de 31.10; St1 simbolurile verdictelor Trend / top-sector.
6. Restul 🟡 (simulatorul și fișa cu funding și incertitudinea reală, RSI unic, paleta Ctrl+K, pagina), apoi 🔵.

## Ce NU s-a probat

- **Niciun bot activ în Pionex** azi: Tabloul, sfatul, stopul botului și alertele lui pe un bot VIU sunt probate doar pe boți construiți și din cod.
- **Pagina:** nu s-a testat pe un telefon real, pe Safari/iOS sau prin Tailscale real. S-a făcut doar emulare la 390 px.
- **Butoanele care scriu** (salvează, pornește, trimite) n-au fost apăsate.
- **Ce nu s-a putut vedea din aplicație:** permisiunile cheilor din Pionex / T212 (se văd doar în conturi) și pagina publicată pe `pages.dev` (fără cereri externe).
- **Colectorul și workerii:** colectorul nu s-a rulat pe o copie și nu s-a măsurat durata unei ture. Nu s-a verificat starea din Cloudflare: dacă monitorul e publicat și cât din cota KV e folosită.
- **Pe viu:** dacă wrangler / Tailscale suprascriu `CF-Connecting-IP` / `X-Forwarded-For`; proba ar fi blocat colectorul.
- **Statistica:** nu s-a estimat ICC-ul real din arhiva lui (simulările presupun 0,1–0,5). Nu s-a verificat dacă hiperparametrii rețelei au fost aleși după lunile de test, nici cum se compară umplerile simulatorului cu cele reale din Pionex.
- **Fișierul Market Breadth de pe GitHub** nu s-a citit (fără cereri externe).

## Notă pentru probele viitoare

Edge-ul headless pornit cu profil nou în Temp s-a legat singur la contul Microsoft al utilizatorului (sincronizare + extensia Proton Pass).
Scripturile de poze și `scripts/proba-ecran-telefon.mjs` trebuie pornite cu `--disable-sync --disable-extensions`.

## Skill-uri folosite

auditing-trading-suite (cele 9 lentile, verificarea 🔴), dispatching-parallel-agents, trading-code-craft (pwa / trader / design /
automation / crypto-scanner), security-review, crypto-specific-strategy-pitfalls, volatility-modeling, monte-carlo-trade-resampling-and-drawdown-distribution,
lookahead-bias-detection-methodology, backtest-expert, backtest-result-authenticity-audit, statistical-significance-and-deflated-metrics,
overfitting-and-robustness-checks, walk-forward-validation, decision-model-calibration, statistical-power, paper-trading-and-forward-test-protocol,
live-vs-backtest-drift-monitoring, regime-detection-and-adaptation, correlation-analysis, pre-trade-discipline-gate, market-breadth-analyzer,
frontend-design, dataviz (validatorul de paletă rulat), systematic-debugging, verification-before-completion. Lipseau din instalare:
fill-feasibility-and-impossible-fill-detection, execution-and-order-management-realism, position-sizing-and-risk-management (regulile lor generale
aplicate la 🔵 B3–B5 / A1).
