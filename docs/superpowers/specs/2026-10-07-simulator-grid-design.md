# Simulator grid — pagina „Simulator grid” (Radar v100.134) — design

**Data:** 07.10.2026 · **Cererea lui:** „vreau să finisăm și să modelăm app după placul meu, începem cu Monte Carlo. Acolo vreau să-mi dai posibilitatea să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig etc.” · Hotărâte în discuție: valorile intră **și din codul GRID-FISA, și de mână** (câmpuri ca în indicator); rezultatele: **șansa de câștig + cât, șansa planului, pe mai multe durate, riscurile pe nume**, „clar și răspicat: pierde sau câștigă, atâtea șanse să pierzi și atâtea să câștigi”; **bot nou și botul care rulează**; **pagină proprie** („Simulator grid”); drumul **A** (un motor, două moduri, botul care rulează reluat pe barele reale); gridul aritmetic în simulator: **da**; funding: câmp cu 0,03% pe zi implicit.

## 1. Pagina

Id `gridsim`, în meniu sub „Grid: ce setez?” (`data-nav="gridsim"`, icon ⚄, text „Simulator grid”). De sus în jos:

1. **Antet:** „🎰 Simulator grid” · moneda · prețul de acum · vechimea datelor.
2. **Setarea** (`t212Panou`):
   - comutator **Bot nou / Botul meu care rulează**; la „Botul meu”, `<select>` cu boții activi din Pionex (eticheta ca în Monte Carlo: „short 3× · 0,3700–0,4200 · 50,12 USDT”); alegerea umple toate câmpurile, inclusiv TP-ul și „Pornit la”;
   - **Codul din fișă:** câmp text + „Ia din cod” — rândul pentru GRID-FISA (9–20 câmpuri) umple câmpurile; erorile se spun pe nume, ca în Pine; sub câmpuri, „Codul pentru TradingView” (setările de acum → cod), cu „Copiază”;
   - câmpurile, ca în indicator: **Moneda** (coin Pionex), **Direcția** (long / short / neutru), **Jos**, **Sus**, **Linii** (ca în Pionex; lângă: „= N intervale”), **Levier**, **Stop**, **TP**, **Suma USDT**, **Tip** (geometric / aritmetic), **Planul tău:** ies la −X USDT · încasez la +Y USDT, **Funding pe zi %** (0,03 implicit), **Pornit la** (doar „Botul meu”, din Pionex, needitabil);
   - schimbarea direcției mută stopul și TP-ul pe partea lor (long: stop sub, TP deasupra; short: invers; neutru: TP stins). Un stop / TP de partea greșită a prețului e spus pe față și nu intră în simulare (regula `mcsTpValid`, extinsă la stop);
   - butonul **Simulează** (Enter în orice câmp = Simulează).
3. **VERDICT** pe orizontul ales (implicit 7 zile): rând mare „**CÂȘTIGĂ în 62% din drumuri · PIERDE în 38%**” (± marja: `1,96·√(p(1−p)/n)`, scrisă „±4 puncte”), sub el „de obicei +1,8 USDT · cele mai proaste 5%: −9,2 · cele mai bune 5%: +8,3”, histograma rezultatelor (`mcsHist`, 5% / mijloc / 95% marcate), apoi „👉 Ce aș face eu” (§3).
4. **Pe durate (aceleași drumuri):** tabel cu rândurile 1 / 3 / 7 / 14 zile: câștigă % · de obicei · 5% sub · 5% peste · planul (+Y înainte de −X) % · „în” (mediana zilelor până la plan, când e atins) · lichidare · stop · TP. Clic pe rând = orizontul verdictului.
5. **Riscurile pe nume** (orizontul ales): lichidare · stop atins · TP atins · iese din grid măcar o dată · grile încasate (medie) · pierderea maximă pe drum (de obicei / cea mai rea 5%) · prețul de zero (doar „Botul meu”, din `TabloExtra.dacaInchizi`) · funding plătit (medie).
6. **Botul meu, de la pornire** (doar modul 2): „reluat pe barele reale de la <pornit> până acum: <estimat> USDT; Pionex spune <profitNet> (umplerile sunt estimate pe bare, nu pe ordinele reale)” · poziția · planul deja atins? · apoi „de aici încolo, pe orizontul ales: câștigă %, de obicei, planul %”.
7. **Subsol de cinste:** „trecutul reluat de N ori, nu o predicție · fără tendința perioadei · umplerile estimate pe bare · aceeași cifră la aceeași dată (sămânță fixă)”.
8. **Telefon (390 px):** o coloană, câmpurile câte două pe rând, tabelul derulează lateral (`rlTab`), capul tabelului rămâne (regula `#mcsPagina .t212Tab` se aplică și aici), fără scroll lateral al paginii. Pagina intră automat în `test:ecran-telefon` (citește meniul).

## 2. Motorul

### 2a. `GridProba.simuleaza(b, start, lungime, st, opt)` — trei adăugiri, implicit neschimbat
- `st.tip === "aritmetic"` ⇒ liniile la distanțe egale (`GridCalcul.niveluriArit(jos, sus, N)`); altfel geometric, ca azi. Cifrele vechi (fișa, Monte Carlo, laboratorul) rămân identice.
- `st.fundingZi` (fracție pe zi, ex. 0,0003): la fiecare 32 de bare (8 h la 15M) de la pornire, `fundingZi / 3 × (Ql + Qs) × p` se adună la `fee`; rezultatul raportează `funding` (total plătit). Lipsă / 0 ⇒ nimic.
- `opt && opt.traseu` ⇒ `r.traseu = { net: [], perechi: [], iesiri: [] }`, câte o valoare după fiecare bară procesată: `net` = `real − fee − comisionul de închidere la prețul barei + nerealizatul la închidere` (aceeași formulă ca rezultatul final ⇒ ultimul `net` = `r.net`), `perechi` și `iesiri` cumulate. La lichidare / stop traseul se oprește la bara aceea (ultimul `net` = −1 la lichidare, `r.net` la stop).

### 2b. `public/lib/grid-sim.js` — `GridSim`, modul pur (după grid-calcul, grid-proba, monte-simbol, tablou-extra)
- `dinCod(text)` → `{ st, plan, pornitLa, tpAprox, eroare }`: 9–20 câmpuri despărțite prin „;”, aceeași ordine ca `codTVBot` (dir; jos; sus; linii; levier; stopJos; stopSus; lichJos; lichSus; suma; tip; planMinus; planPlus; planAfaraOre; verdict; generatLa; margJos; margSus; pornitLa; tpAprox). Linii → intervale (`grile = linii − 1`). Stopul / TP-ul după ROL (ca în Pine): long: stopJos = stop, stopSus = TP; short: stopSus = stop; neutru: cel scris = stop, pe partea lui. Erori pe nume: „Câmpul 4 (linii) nu e un număr: „x””, „Direcția …”, „Codul trebuie să aibă între 9 și 20 de câmpuri — are N”.
- `inCod(st, plan)` → rândul pentru GRID-FISA (10–14 câmpuri; fără verdict / generatLa / margini — acelea le dă Tabloul). `dinCod(inCod(st))` = `st`.
- `setariDinBot(b)` → `st` + `pornitLa` + `tip` (din `brut.buOrderData.gridType`) + `tpAprox`; aceeași citire ca `mcsSetariBot` (row − 1, stopul pe partea direcției, TP la long / short).
- `simuleaza(b15, st, o)`: `o = { zile: 14, orizonturi: [1, 3, 7, 14], n: 500, seed: 12, plan: { minus, plus } | null, pornitLa: ms | null, acum }`.
  - Drumurile: `MonteSimbol.drum` pe bucăți de câte o zi (96 de bare), fără tendința perioadei (mijlocul log pe 14 zile scos, ca în `MonteSimbol.grid`), generator mulberry32 cu sămânța fixă.
  - Modul 2 (`pornitLa`): prefixul = barele reale de la prima bară cu `t ≥ pornitLa` până la ultima; botul pornește la deschiderea ei; drumul simulat continuă de la ultima închidere reală. O singură chemare `GridProba.simuleaza` pe drum, cu `traseu`. „Până acum” = traseul la ultima bară reală (identic pe toate drumurile; se ia din primul). Planul se judecă pe tot traseul (ca Pionex, de la pornire); dacă s-a atins deja în prefix, se spune „deja atins pe <data>”.
  - Pe fiecare orizont H (bare = prefix + H × 96, limitat la lungimea traseului): `net` la bară (× suma = USDT), câștigă (`net > 0`) / pierde (`net < 0`) / pe zero, p5 / p50 / p95, histograma, planul: prima bară în care `net × suma ≥ plus` înainte de `≤ −minus` (și invers ⇒ „pierderea planului întâi”), zilele până acolo (mediana pe drumurile care-l ating), lichidare (`r.lichidat` cu `r.bare ≤ bare`), stop / TP (`r.oprit`, `r.iesit` pe partea pierderii / profitului, `r.bare ≤ bare`), ieșit din grid (`iesiri[bare−1] > 0`), grile (`perechi[bare−1]` medie), pierderea maximă pe drum (`min(net[0..bare−1])`: mediana și percentila 5%), funding (medie, din `r.funding` proporțional cu barele — simplificare: funding-ul plătit până la bară = `fundingZi/3 × (Ql+Qs) × p` adunat și el în traseu? NU: se raportează doar la capăt, `r.funding`, pentru orizontul cel mai lung; pe celelalte orizonturi, proporțional cu barele (estimare, spusă)).
  - Marja: `±1,96·√(p(1−p)/n)` în puncte, rotunjită.
  - `scurt`: istoric < 3 × orizont (31 de zile de 15M ⇒ la 14 zile se spune).
  - Rezultatul: `{ n, zileIstoric, scurt, orizonturi: [{ zile, bare, pCastig, pPierde, pZero, marja, p5, p50, p95, hist, plan: { p, pRau, zileMediana, dejaAtins }, pLich, pStop, pTp, pIesire, perechi, maxJos: { p50, p5 }, funding }], acum: { net, usdt, bare, t, perechi } | null, tendintaPeZi }`.
- `verdict(rez, st, plan, oriz)` → textele din §3.
- Prețul de zero: doar în modul 2, `TabloExtra.dacaInchizi(bot)` (poziția reală din Pionex), afișat în „Riscurile pe nume”.

### 2c. `public/lib/grid-sim-ecran.js` — `gsStare`, desenul (HTML pur, probat în vm) și legătura cu pagina
- `gsHtml(st)` (formular + verdict + tabel + riscuri + botul meu + subsol), `gsVerdictHtml`, `gsDurateHtml`, `gsRiscuriHtml`, `gsBotulMeuHtml`.
- Pagina: `gsPorneste()` (din `show()`: desenează; boții din `tbStare.boti` / `contTot.boti`, ca `mcsBoti`), `gsMod(m)`, `gsAlegeBot(i)`, `gsDinCod()`, `gsDirectie()` (mută stopul / TP-ul), `gsSimuleaza()` (aduce 15M prin `mcsAduCoin(sim)` — 6 pagini, cu pauze —, apoi `GridSim.simuleaza` într-un `setTimeout`, cu „calculez…”), `gsOriz(i)` (orizontul verdictului, fără recalcul), `gsCopiazaCod()`.
- Enter în câmpuri = Simulează (`keydown` pe document, ca `mcsTasta`).
- Starea: `{ mod: "nou" | "meu", botIdx, sim, st, plan, fundingZi, pornitLa, date (b15), rez, oriz, inLucru, eroare }`.

## 3. Textele verdictului și „Ce aș face eu”

Regulile, fixate dinainte (nu după cifre), pe orizontul ales:
1. **Rândul mare:** „CÂȘTIGĂ în P% din drumuri · PIERDE în Q%” (P = net > 0, Q = net < 0; „pe zero” apare doar dacă ≥ 0,5%). Culoarea rândului: verde la P ≥ 55, roșu la P ≤ 45, galben între (zona „aruncare de ban”).
2. **Ce aș face eu**, în ordinea asta (primul care se potrivește):
   - lichidare > 2% ⇒ „**N-aș porni așa**: lichidare în X% din drumuri. Levier mai mic sau grid mai strâns de partea pierderii.”
   - 5% sub < −planMinus (când există plan) ⇒ „**Nu se potrivește cu planul tău**: în cele mai proaste 5% pierzi A USDT, planul tău zice −X. Mută stopul la planul tău sau micșorează suma.”
   - stop atins > 50% ⇒ „**Stopul e în zgomot**: atins în X% din drumuri în H zile. Mai departe sau fără (dacă lichidarea e 0%).”
   - P ≥ 55 și p50 > 0 ⇒ „**Aș porni**: câștigă în P% din drumuri, de obicei +p50 USDT; planul +Y vine înainte de −X în Z%.”
   - P ≤ 45 ⇒ „**N-aș porni**: pierde în Q% din drumuri (de obicei p50 USDT). Pe drumurile fără tendință, setarea asta pierde din comisioane și din poziția rămasă.”
   - altfel (45 < P < 55) ⇒ „**O aruncare de ban**: P% câștigă, Q% pierde. Gridul câștigă din grile, nu din direcție; dacă vrei totuși, suma mică.”
   - Modul 2 adaugă: „De la pornire, botul tău are +A USDT (Pionex) / +B estimat; de aici încolo …” și, dacă planul e deja atins, „planul tău e deja atins: ieși / încasează, cum ți-ai propus”.
3. **Nota de cinste** pe fiecare verdict: „pe istoria monedei reluată, fără tendința perioadei; o criză mai rea decât orice a avut nu apare în drumuri”.
4. **Numere:** rezultatele cu o zecimală (USDT), procentele întregi, prețurile cu `mcsPretTxt`.

## 4. Ce NU intră
- Direcția monedei (trend) nu se prezice și nu se compară long / short pe aceleași drumuri (regula direcțiilor).
- Pionex nu dă ce ține botul pe fiecare grilă: modul 2 e reluarea, nu starea reală (spus pe pagină).
- Fără colector, fără server: totul în pagină (frontend ⇒ fără repornire).
- Funding-ul e un cost fix pe zi, nu rata reală pe 8 h a monedei.

## 5. Probe (RED întâi)
- `scripts/proba-v100134.mjs`: (a) `simuleaza` implicit neschimbat (aceeași cifră ca înainte pe aceleași bare); aritmetic ≠ geometric pe un grid lat, egal la grid îngust; traseul: ultimul `net` = `r.net`, lungimea = barele procesate, la lichidare se oprește; funding-ul scade rezultatul cu cam `rata × expunere × zile`; (b) `dinCod` ↔ `inCod` (dus-întors, 20 de câmpuri din `codTVBot`, erori pe nume, linii → intervale, stopul după rol); `setariDinBot`; (c) `simuleaza` GridSim: forma rezultatului, `pCastig + pPierde + pZero = 1`, orizonturile cresc în bare, planul în ordinea corectă (stricare: un plan uriaș ⇒ 0%), modul 2: „până acum” = `GridProba.simuleaza` pe barele reale, aceleași drumuri la aceeași sămânță; (d) `verdict`: fiecare regulă pe rânduri construite; (e) HTML: formularul, verdictul, tabelul, riscurile, modul 2, direcția mută stopul; (f) pagina: meniu, panel, `show()`, SW, versiunea v100.134.
- `test:ecran-telefon` prinde pagina nouă (meniul). Poze la 1920 / 390 înainte de „gata”.
