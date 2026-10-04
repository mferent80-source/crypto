# v100.96 — reparațiile și ideile raportului v100.95: planul de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, regula lui: lucrez direct). Registrul stă la coada
> acestui fișier (secțiunea „Registru”) și în memorie după fiecare sarcină. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „fa reparatii si idei” pe raportul v100.95 — reparațiile 🔵7 (rândul Busolei spune ce judecă), 🔵10 (tura de noapte numără doar
scrierile reușite), 🔵11 (dimineața nu se scrie bara în curs), 🔵12 (hash-ul codului nu se schimbă la texte) și ideile 1 (Busola exportă
`simboluri` și `asteptare`, rândul le arată), 2 (pragul „dovedită” pe bloc: 40 de săptămâni la 7 zile), 3 (hash normalizat: fără comentarii
și fără conținutul șirurilor), 4 (costul porții plafonat la plaja perechilor lui, altfel mediana, spus în text).

**Architecture:** Radar: `retea/hash-cod.mjs` (normalizare + hash, folosit de amândoi antrenorii); `retea.js`: `minIndep(bloc)` în
`decide` (prin `v.oreBloc`), `plajaCost`/`intrareCumparare` cu `inPlaja`, `textBusola` pe 1–2 rânduri („🧭 Busola, pe marginile gridului
în 24 h: …” + rândul cifrelor); `date-t212.randuriInchise` pentru scrierea de dimineață; `tura-retea` numără `!== false`; ruta și
`din-busola` lasă să treacă `simboluri`/`asteptare`. Busola: `bilantRetea` întoarce și `simboluri`, `asteptare` (cron local, fără deploy).

**Tech Stack:** JS (ESM în `scripts/`, `retea/`; ES5 în `public/lib`), TS în Busola (tsx, probe), proba `scripts/proba-v10096.mjs` în lanț.

**Spec:** raportul final v100.95 (secțiunile „Minore amânate” și „Idei”), revizia Opus a v100.95. Toate mărginite.

## Global Constraints

- Radar v100.96 (BUILD_INFO, versiune.js, sw `crypto-radar-v100-96`, index ×4, package 100.96.0, `test:v10096`), colector `v101.66`;
  Busola `package.json` 1.43.0, commit `feat(busola): 1.43.0 - …`, fără deploy (doar cron-ul local citește `dinRadar.ts`).
- `npm test && git commit` doar cu `grep -q "^exit=0$"`; un singur push pe depozit la final; fără `git pull` în `crypto`; nimic din `data/`.
- Garda textelor curată (raport ≤ 160, o propoziție, TextRo, „−”); `public/lib` ES5; fără `//` la mijlocul rândului.
- Pragul pe bloc: 100 de cazuri independente la 24/48/72 h, 40 la 168 h (bloc săptămânal: cel mult ~45–61 în 430 de zile); IC-ul rămâne garda.
- Colectorul se repornește doar fără antrenori activi (noaptea 02–05 nu se atinge).

## Review Focus

1. Hash normalizat: o schimbare DOAR de text (comentariu, șir) nu schimbă hash-ul; o schimbare de număr/logic îl schimbă; fișierele din hash n-au regex cu ghilimele (gardă).
2. Pragul 40 pe bloc săptămânal: `cursa`/`atinge-168` cu 40–44 de cazuri trec de prima poartă, dar IC-ul decide; textul „din 40”.
3. Costul în afara plajei (sub p5 sau peste p95; cu < 20 perechi: min–max) ⇒ cifra pe mediană și textul „judecat la suma ta obișnuită”; în plajă nimic nou.
4. Bilanțul Busolei vechi (fără `simboluri`/`asteptare`) ⇒ rândurile fără ele, fără NaN; cu ele ⇒ „pe 9 monede”, „7 în așteptare”; ≤ 160 la 5 cifre + 20 de zile.
5. Dimineața, cu bursa deschisă (colector pornit în ședință): bara în curs nu intră în `data/retea/zile`; sâmbăta/duminica toate intră.

---

### Task 1 (🔵10): tura de noapte numără doar scrierile reușite — `scripts/lib/tura-retea.mjs`; proba (1).
### Task 2 (🔵11): `randuriInchise(randuri, acum, G)` în `retea/date-t212.mjs`, folosit în `turaIdeiZi`; proba (2).
### Task 3 (🔵12 + ideea 3): `retea/hash-cod.mjs` (`normalizeazaCod`, `hashCod`) în amândoi antrenorii; proba (3).
### Task 4 (ideea 2): `minIndep(bloc)` în `retea.js` (`decide` prin `v.oreBloc`, `incaLuni`, textul „din 40”); proba (4).
### Task 5 (ideea 4): `plajaCost(ist)`, `intrareCumparare` cu plafon + `inPlaja`, `pentruCumparare` (Retea + Arbori) întorc `inPlaja`, rândul porții „· judecat la suma ta obișnuită”; garda; proba (5).
### Task 6 (🔵7 + ideea 1): Busola `bilantRetea` + `simboluri`/`asteptare` (probe/din-radar.ts); Radar `din-busola`, ruta, `textBusola` pe 1–2 rânduri, garda; probele (6a Busola, 6b Radar).
### Task 7: versiuni, proba (E), lărgirea probei v10095, suita, commit, revizia Opus, pas de reparații, push ×2, repornirea colectorului, pozele, memoria, raportul.

## Registru
- Task 1 (🔵10): complete — tura-retea numără `!== false`; proba (1) ROȘU→VERDE. Task 2 (🔵11): complete — date-t212.randuriInchise + turaIdeiZi; proba (2) ROȘU→VERDE. Task 3 (🔵12/ideea 3): complete — retea/hash-cod.mjs (normalizeazaCod, hashCod) în amândoi antrenorii; proba (3) ROȘU→VERDE. Ruling: hash NORMALIZAT în loc de fișier separat de texte — același scop (textele nu rejudecă lunile), fără refactorul loader-elor (~12 fișiere); logica scrisă în șiruri rămâne nevăzută de hash (VERSIUNE și HIPER stau separat în cheie; gardă: fără regex cu ghilimele în fișierele din hash) — cost dacă greșesc: un cache vechi la o schimbare făcută doar într-un șir.
- Task 4 (ideea 2): complete — minIndep(bloc) 40 la 168 h, decide prin v.oreBloc; proba (4) ROȘU→VERDE. Task 5 (ideea 4): complete — plajaCost/costInPlaja/intrareCumparare cu inPlaja (🧠 și 🌳), rândul „judecat la suma ta obișnuită”, garda; proba (5) ROȘU→VERDE. Ruling: plaja = p5–p95 de la 20 de perechi, min–max sub 20; în afara ei mediana (nu plafon la margine) ca cifra să fie pe un cost chiar văzut — cost dacă greșesc: cifra se referă la alt trade decât cel propus, dar textul o spune.
- Task 6 (🔵7 + ideea 1): complete — Busola 1.43.0 (bilantRetea + simboluri/asteptare, probe/din-radar.ts cu 2 ok noi, tsc cron+app ok; fără deploy: doar cron/masoara.ts importă dinRadar.ts); Radar: din-busola/ruta lasă câmpurile, textBusola ÎNTOARCE 1–2 rânduri, subsol le pune primele, garda 14+6 situații ×2; proba (6b) ROȘU→VERDE; proba-v10095 (4a)/(4b) adaptate la forma nouă. Ruling: „(9 din 10)” ⇒ „(9 monede, cere 10)” — garda citește „N din M” sub 20 ca frecvență — cost: zero. Task 8 (el: „nu le văd pe toate, scoate-le în evidență”, a ales rând-rezumat + cartela deschisă): complete — Retea.rezumat, Tablou (sub semafor + 🎲 open), fișă (sub verdict), T212 (rândul poziției, scurt), CSS, garda; proba (7) ROȘU→VERDE. Task 7: versiuni v100.96 „MODELELE LA VEDERE” / v101.66 / Busola 1.43.0, (E) ROȘU→VERDE, proba-v10095 (E) lărgită; garda 1116/0. Suita + probele Busolei pornite.
- Suita 1 (suita-96-1.txt): exit=1 — proba-v10046 pina literal cartela 🎲 pliată (<details … hidden>) ⇒ regex cu „( open)?”; v10046 verde singură. Busola: npm run probe exit=0; npm run lint exit=1 pe src/ui/folosesteMtf.ts (rules-of-hooks) — fișier neatins de mine, preexistent. Suita 2 pornită.
- Pozele v100.96 (poze-96, 1920 + 390): Tabloul arată rândul „Marginea de jos în 24 h: 🧠 21% · 🌳 24% · 🎲 52% · amândouă dovedite · lichidarea în 7 zile: 🧠 1% · 🌳 7%” în cartela semaforului și cartela 🎲 deschisă (open=true); fișa „Marginea de jos în 24 h: 🧠 1% · 🌳 6% · 🎲 13% · amândouă dovedite” direct sub PORNEȘTE; T212 fiecare poziție cu „🧠 47% · 🌳 45% · niciuna dovedită” sub trend; fără NaN, consola curată, 0 px defilare pe telefon. Pe telefon rândul Tabloului stă la coada cartelei semaforului (sub „Ce aș face eu” și „De ce”) ⇒ îl mut sus, sub verdict, ca pe fișă.
- Suita 2 (suita-96-2.txt): exit=0 ⇒ commit local e88b812 (v100.96, 23 de fișiere). Apoi, după poze: rândul Tabloului mutat din coada cartelei semaforului sub eticheta verdictului (tbConsHtml desenează cons.rezumat prin tbRezumatHtml(t)); proba (7) adaptată, 8/8; repoză Tabloul (poze-96b). Necomis încă (intră în commit-ul de după revizie).
- Repoza Tabloului (poze-96b, 1920 + 390): rândul „Marginea de jos în 24 h: 🧠 21% · 🌳 24% · 🎲 52% · amândouă dovedite · lichidarea în 7 zile: 🧠 1% · 🌳 7%” stă acum chiar sub eticheta verdictului și titlu, înaintea lui „Ce aș face eu”, pe amândouă lățimile; cartela 🎲 open=true; fără NaN, consola curată.
- REVIZIA OPUS (04.10 ~20:35, pe a12d12b..e88b812 + arbore): „face ce s-a cerut; 2 🟡 de reparat înainte de push”. 🟡1 rândul Tabloului rămâne cu cifrele altui bot (ieșirile timpurii din tbDeseneazaProb); 🟡2 lichidarea în rând fără starea ei; 🔵3 normalizatorul în 4 treceri lăsa găuri (// cu /*, '"', apostrof în bloc) ⇒ o trecere; 🔵4 hash-ul fără grid-calcul/actiuni-semnale/probabilitati; 🔵5 pe telefon rândul T212 era în coloana trend ascunsă; 🔵6 „0 în așteptare” lângă „trimite acum 2”; 🔵7 gridul neutru doar marginea de jos, fără margine rândul dispărea; 🔵8 specurile spun 100 peste tot. Rulingurile: hash normalizat parțial de acord (garda nu acoperea ordinea), plaja parțial (marginea p5/p95 e și ea reală), „(9 monede, cere 10)” de acord. Regradare: 🟡1, 🟡2 + 🔵5 (cererea lui e vizibilitatea, telefonul e drumul lui), 🔵7 (gridul neutru e des pe fișă) ⇒ pasul de reparații; 🔵3/🔵4 gratuite azi (hash-ul se schimbă oricum la noapte; normalizatorul nou dă EXACT aceeași ieșire pe toate 10 fișierele - verifica-hash-egal.mjs); 🔵6 în aceeași funcție; 🔵8 docs. Toate făcute cu teste ROȘU→VERDE: (R1), (7) extins (lichidarea cu stare, neutru, fără margine, T212 în prima celulă cu „peste 5 zile:”), (3) extins (3 cazuri adversare + fișierele noi + garda fără // sau /* în regex), (6b) („N așteaptă la ea / la Busola”, 0 ⇒ nimic); garda 1148/0. Final: minor (deferred): Twelve Data dă barele la 00:00 UTC ⇒ randuriInchise nu scoate bara în curs (sursă preexistentă; de verificat câmpul sursa al rutei). Final: minor (deferred): pragul 40 - rata de „dovedită” falsă nemăsurată (de simulat fără talent prin verificare()+decide()). Final: Ruling: plaja costului rămâne pe mediană în afara ei (nu marginea p5/p95) - cifra să fie pe un cost chiar văzut des, iar textul o spune — cost: cifra se referă la un trade mai mic/mai mare decât cel propus.
- Pozele după pasul de reparații (poze-96c): Tabloul „Marginea de jos în 24 h: 🧠 28% · 🌳 26% · 🎲 57% · amândouă dovedite · lichidarea în 7 zile: 🧠 1% · 🌳 7% · 🌳 dovedită, 🧠 nu” (🟡2 se vede: lichidarea cu starea ei); fișa pe grid neutru „Marginea de sus în 24 h: …” (🔵7: marginea cu cifra mai mare); T212 1920 fiecare rând „peste 5 zile: 🧠 47% · 🌳 45% · niciuna dovedită” în prima celulă; T212 390 rândul era în DOM dar INVIZIBIL: regula de telefon  îl ascundea ⇒ regulă nouă cu specificitate mai mare (ROȘU→VERDE în (7)); suita 4 + repoza T212 390 pornite.
- Poza T212 390 (poze-96d) după regula de vizibilitate: rândul se vede, dar prima coloană a fișei poziției (grid 1fr auto) se lățea după textul lung și rezultatul (lei) ieșea din card ⇒ pe telefon grid-template-columns minmax(0,1fr) auto + min-width:0 pe blocul simbolului + white-space normal (ROȘU→VERDE în (7)); suita 4 oprită și suita 5 pornită pe codul final; repoza 390 (poze-96e). Nota: rândul registrului dinainte a pierdut selectorul CSS (backtick-ul din Bash l-a executat) - selectorul ascunzător e .t212Tab tr.t212Rand .t212Sim .t212Mic (display none sub 640 px).
- Poza T212 390 finală (poze-96e): rezultatul (lei) se vede întreg, rândul „peste 5 zile: 🧠 47% · 🌳 45% · niciuna dovedită” se împachetează pe 2–3 rânduri în coloana simbolului (lizibil; de spus LUI că pe telefon e împachetat). Suita 5 pe codul final în lucru.
