# Carnetul fișei (I-561) — planul

> Execuție: nativ (eu, în sesiunea asta), apoi o revizie Opus pe tot. Pașii cu `- [ ]`.

**Scopul:** pagina „Carnetul fișei” + rândul de sub fișă răspund „fișa are dreptate?” pe 3 întrebări (alegerea ÎNGUST/LARG, „aș aștepta”, stopul promis) din re-jocul pe istoric și, de acum înainte, din ofertele notate zilnic.
**Arhitectura:** lib pur `public/lib/carnet.js` (re-joc, judecată, întrebări, texte) folosit de colector (laboratorul de noapte) și de pagină (`public/lib/carnet-ecran.js`); raportul pe server în KV `carnet`.
**Specul:** `docs/superpowers/specs/2026-10-06-carnetul-fisei-design.md`
**Versiunea:** v100.117 / colector v101.80.

## Constrângeri globale
- Fereastra = `FEREASTRA_ZILE` (3) zile, istoricul fișei = 30 de zile, bare de 15M (`GridCalcul.C.BARE_ZI` = 96).
- Verdictul = `RiscLuna.verdict` (IC 99% + jumătăți ⇒ dovedit; IC 95% ⇒ la limită; < 30 ⇒ prea puține), `reps` 2000, generatorul mulberry32 (al RiscLuna).
- Texte: garda STRICT (titlu ≤ 60, faCe ≤ 110 persoana I, deCe ≤ 160), numerale cu `TextRo.cate`, rezultatele cu O zecimală.
- Nimic șters: Validation Lab rămâne în „Laborator vechi”; meniul trece la 48 de butoane.
- Măsurat: 8,6 ms / pornire (SOL, 60 de zile) ⇒ ~12 s pe noapte la pas de o zi.

## Ce poate mușca (Review Focus)
1. Privit în viitor la re-joc (fișa primește bare de după `s`) ⇒ proba „stric viitorul”.
2. Perechile întrebării 1 rupte de bootstrap (se reeșantionează monede, perechile rămân în aceeași monedă) ⇒ proba pe permutare.
3. `mea.egalaCuTa` (aceeași variantă) numărată ca alegere ⇒ exclusă, testat.
4. Ofertele vechi din `ferestre` fără `grile` ⇒ numărate „nejudecabile”, nu simulate cu grile ghicite.
5. Raport peste 256 KB ⇒ cazurile nu pleacă pe server, doar sumarele (test pe mărime).

### Task 1 — `Carnet` pur: simularea unei variante + re-jocul
- `simVarianta(b15, s, v, dir)` ⇒ `GridProba.simuleaza(b15, s, W, {dir, jos, sus, grile, levier, stop})` ⇒ `{net, stop:bool, lichidat}` (stopul = ieșit pe partea pierderii, ca în `GridPlan.proba`).
- `rejoc(b15, o)` ⇒ pentru `s` de la 30 de zile, pas `o.pasZile` (1), până la `len − W`; pe `dir` ∈ long/short: `GridPlan.variante({pret: b15[s].o, dir, suma, levier, plan, amp: o.miscareZi(hist), pas: PAS_MIN, b15: hist, zile: 30})`, `GridPlan.alege(ta, mea)`; caz `{simbol, t, dir, cine, asteapta, egale, ta:{net, stop, pStop}, mea:{…}}`.
- Probe: (1a) bare construite (urcare dreaptă ⇒ long fără stop, short cu stop); (1b) stric barele de după `s` ⇒ `cine`, `asteapta`, `pStop` identice; (1c) `egale` când `mea.egalaCuTa`.

### Task 2 — întrebările + calibrarea + textele
- `intrebari(cazuri, o)` ⇒ `{alegere, asteapta}` cu `RiscLuna.verdict` (perechi / CU-FĂRĂ, cheie `simbol`, timp `t`); `calibrare(cazuri)` pe coșuri; `verdictFisa(oferte)` (numărătoare, doar înainte).
- Texte: `textAlegere`, `textAsteapta`, `textCalibrare`, `textVerdictFisa`, `randSubFisa`, `concluzie`.
- Probe: (2a) permutare (etichete amestecate) ⇒ niciodată „dovedit” în 20 de seminții; (2b) efect clar construit ⇒ „dovedit-bun”; (2c) coșurile; (2d) garda textelor grupul `carnet` STRICT.

### Task 3 — ofertele înainte
- `oferte(planMonede, t)` din laborator (long + short, cu `grile`, `stop`, `pStop`); `judecaOferta(of, b15)` după 3 zile; `uneste(vechi, noi, acum)` (120 de zile, fără dubluri `simbol|t|dir|sursa`).
- Fișa (app.js `grFerestreTine`) salvează și `grile` + `stopJos/stopSus` în `ta`/`mea`; ofertele vechi fără `grile` ⇒ `nejudecabil`.
- Probe: (3a) judecată după fereastră, `null` înainte; (3b) oferta veche fără grile; (3c) unirea.

### Task 4 — colectorul + serverul
- `tura-laborator.mjs`: cu `d.Carnet` — re-joc pe fiecare monedă (top + boți), ofertele de azi, judecata celor scadente (bare aduse; monedele ofertelor din afara listei ⇒ 2 pagini); `rez.carnet`.
- `colector.mjs`: `Carnet` încărcat; ofertele în `data/carnet-oferte.json`; ofertele lui din `ferestre`; `Carnet.raport` ⇒ POST `action=carnet`; timpul re-jocului în jurnal.
- `functions/api/istoric-bot.js`: `action=carnet` GET/POST (≤ 256 KB, cere `la`).
- Probe: (4a) serverul; (4b) modulul cu `cere` fals (bare construite) ⇒ cazuri + oferte; (4c) raportul ≤ 256 KB pe 3000 de cazuri.

### Task 5 — pagina + rândul de sub fișă
- `carnet-ecran.js`: `carnetHtml(r)` pur, `carnetPorneste()`; secțiunea `#carnet` în index.html; butonul „Carnetul fișei” în Zilnic (după „Grid: ce setez?”); `navTo('carnet')`.
- Rândul sub fișă (Grid: ce setez?) din `Carnet.randSubFisa(raport)`.
- Probe: (5a) html pe raport gol / plin / vechi; (5b) garzi-v746 ecran-vm cu pagina; (5c) meniul 48, Zilnic 9.

### Task 6 — versiunea, suita, poze, revizie, livrare
- v100.117 / v101.80 peste tot; `npm test` exit 0; poze 1920 + 520; revizie Opus; `npm test && git commit && git push`; colectorul repornit + dovada; memoria.
