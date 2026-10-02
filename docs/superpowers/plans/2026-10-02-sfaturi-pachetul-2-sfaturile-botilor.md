# Sfaturile concise — pachetul 2: sfaturile boților — planul de implementare

> **Pentru agenți:** SUB-SKILL OBLIGATORIU: superpowers:subagent-driven-development (recomandat) sau superpowers:executing-plans, sarcină cu sarcină. Pașii au căsuțe (`- [ ]`).

**Scopul:** sfaturile boților din afara Consilierului (`sfaturi.js`, „Ce ai de făcut acum”, avertismentele serverului, rezumatul direcției, panoul planului) devin scurte și profesioniste, după aceleași reguli ca pachetul 1 — titlul ≤ 60 cu cifra, „Ce aș face eu” ≤ 110 la persoana I, „de ce” într-o frază ≤ 160, sursa separat, cifrele cu virgulă — iar garda le verifică pe sfaturile REALE (ideea 2) și Consilierul nu mai repetă titlul verdictului vechi (ideea 3).

**Arhitectura:** garda textelor (`scripts/garda-texte.mjs`) generează întâi TOT pachetul cu modulele adevărate — `Sfaturi.intrare` + `Sfaturi.sfaturi` pe boții lui, cu `buOrderData` Pionex și lumânări de 4 h, Consilierul hrănit cu ele, „Ce ai de făcut acum”, rezumatul direcției și avertismentele serverului (mutate neschimbate într-o funcție pură) — și raportează abaterile; apoi fiecare sarcină rescrie o familie de texte și trece grupul ei pe „strict”. Logica, pragurile, codurile, tonurile și ordinea nu se ating.

**Tehnologii:** JavaScript ES5 în pagină (module `var X = (function(){…})()` + `globalThis.X`), Cloudflare Pages Functions (ES modules) pentru server, Node 24 pentru probe și colector; fără dependențe noi.

**Specul:** `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` (pachetul 2) · pachetul 1: `docs/superpowers/plans/2026-10-02-sfaturi-pachetul-1-consilier-boti.md`.

**Anexa (codul exact, validat):** `docs/superpowers/plans/2026-10-02-sfaturi-pachetul-2/` — fișierele noi întregi și listele de înlocuiri „vechi → nou”, aplicate cu `ed.mjs` (fiecare „vechi” trebuie să apară exact o dată, altfel nu scrie nimic). Validată pe o copie curată a repo-ului: la fiecare sarcină secțiunea nouă a probei pică întâi, apoi trece, iar `npm test` e verde.

---

## Ce vezi tu, înainte → după (texte reale, din situațiile gărzii)

| Unde | Înainte | După |
|---|---|---|
| „Ce ai de făcut acum”, primul rând (CRV, poza din 02.10) | Până la lichidare (jos, la 0.3382876201448984) mai sunt 10.9%. — și separat, rândul alertei „Lichidarea la 10.9%” | **Lichidarea la 10,9% (0.33829, partea de jos).** — un singur rând, cu „×N în 24 h” |
| „Ce ai de făcut acum”, botul pe minus | Profitul NET e negativ deși gridul câștigă: grid +10.91, comisioane −1.21, restul −11.30 din poziție/finanțare. | **Grilele câștigă (+10,91 USDT), dar poziția și funding-ul (−11,30) și comisioanele (−1,21) duc botul pe minus.** |
| „Ce ai de făcut acum”, fără stop | Botul nu are niciun opritor configurat. | **Botul n-are nici stop, nici țintă în Pionex.** |
| Marginea de jos, titlul | Până la marginea de jos (0.3841) sunt 0.4% | **0,4% până la marginea de jos (0.3841)** |
| Marginea de jos, de ce (161, două fraze) | Acolo botul ar ține cam 200 CRV (acum 160), iar totalul ar fi în jur de −7.10 USDT. În trecutul CRV, prețul a coborât atât într-o zi în 67% din zile (33 din 49). | **~200 CRV la margine (acum 160), total ~−7,10 USDT; coboară atât în 67% din zile (33 din 49).** |
| Lichidarea sub 8%, Ce aș face eu | Aș acționa acum, nu aș aștepta: adaug marjă din Pionex sau închid botul. Sub 8% nu mai e loc de răbdare. | **Aș adăuga marjă sau aș închide botul acum.** (aceeași voce cu semaforul) |
| Trendul contra, de ce (213) | 4h: EMA20 sub EMA50, EMA50 coboară; 1z: …; structura 4h: maxime și minime tot mai jos. Pe scădere un grid long cumpără la fiecare nivel: poziția crește și pierderea pe ea se adâncește. | **4h: EMA20 sub EMA50, EMA50 coboară · 1z: EMA20 sub EMA50, EMA50 coboară · structura 4h: maxime și minime tot mai jos.** (ce face gridul contra trendului — o dată, în legendă) |
| Trendul contra, Ce aș face eu (206) | N-aș adăuga bani botului cât trendul e împotrivă. Dacă se face și „tare” pe 1z, aș lua în calcul să-l opresc aproape de zero (vezi prețul de zero mai jos) și să pornesc unul pe direcția trendului, din fișă. | **N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend.** |
| Mișcarea contra, titlul (72) | Mișcare mare acum împotriva botului (4h 2,4×, 24h 1,2× față de obișnuit) | **Mișcare contra botului: 2,4× obișnuitul (4 h), 1,2× (24 h)** |
| Zero-ul botului, Ce aș face eu (165) | Dacă vrei să ieși fără pierdere, pune în Pionex take-profit-ul botului la 0.4012 (nu stop: prețul de zero e deasupra prețul de acum) și lasă-l să lucreze până acolo. | **Aș pune take-profit-ul botului la 0.4012 ca să ies fără pierdere (nu stop: zero-ul e deasupra prețului).** |
| Liniștea, Ce aș face eu (148) | Liniștea ține rar mult pe moneda asta: n-aș pune mai mulți bani în grid acum; aș încasa ce face și aș fi pregătit să-l opresc la prima mișcare mare. | **N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare.** |
| Ritmul, titlul | Ritmul a scăzut: grilele au adus 0.10 USDT în 24 h, media e 1.20/zi | **Ritmul a scăzut: grilele 0,10 USDT în 24 h, media 1,20/zi** |
| Setarea, titlul | Setarea botului | **Setarea botului: grile prea dese și levier prea mare** |
| Direcția (Tablou și sfatul ei) | Piața merge cu botul (4 ore urcă, 1 zi urcă). Dar în bara de 4 ore de acum prețul scade cu 2.4%. · Piața merge ÎMPOTRIVA botului (…). | **Piața merge cu botul (4 ore urcă, 1 zi urcă); dar în bara de 4 ore de acum prețul scade cu 2,4%.** · „împotriva”, fără majuscule |
| Consilierul, starea Pionex (ideea 3) | titlul „Pionex: marginea contului e MARGIN_CALL” + textul „Pionex raportează marginea contului ca MARGIN_CALL, nu NORMAL.” (același lucru de două ori) | textul: **Pionex o dă altfel decât NORMAL, iar starea bursei bate calculul nostru al lichidării.** |
| Consilierul, lichidarea depășită (ideea 3) | Prețul a trecut deja de pragul de lichidare cu 1.2% (titlul și textul, de două ori) | **Prețul e dincolo de lichidare cu 1,2%** (doar titlul) |
| Panoul planului | Țintă pe plus: +3.00 USDT · ATINSĂ — ieși · 👉 exact ce ți-ai propus — ieși acum, fără să renegociezi. | Țintă pe plus: +3,00 USDT · **atinsă: închide botul** · 👉 **Aș închide botul acum, cum ai hotărât la rece.** |
| Mesajele pe două rânduri în „Ce ai de făcut acum” | „… marginea de jos: −4,6 De ce: din 🔴 Ieși în 🟡 Atenție …” (lipite) | pe două rânduri |
| Avertizările comune | „Nu e o prognoză.”, „nu spune încotro va merge”, „Pe scădere un grid long cumpără la fiecare nivel…” în fiecare sfat | o singură dată, în **legenda de sub Consilier** |

Pe situațiile gărzii (aceleași, înainte și după): „Ce aș face eu” **104 → 62** de caractere în medie (cel mai lung 206 → 107), „de ce” 91 → 84 (213 → 117), titlul 34 → 33 (72 → 58), avertismentele serverului 88 → 75 (129 → 109); textele cu punct zecimal **86 → 3** (cele 3 sunt titlul/textul alertelor din `alerte.js` — pachetul 3); abaterile: sfaturi **145 → 0** (din 360 / 333 de texte), „Ce ai de făcut acum” 3 → 0, Consilierul cu sfaturile reale 11 → 0, serverul 4 → 0. Cifrele rămân ale lui: prețurile cu zecimalele Pionex, logica și pragurile neatinse.

## Constrângeri globale (din spec, cuvânt cu cuvânt)

- **Se schimbă:** DOAR textul sfaturilor (titlu/motiv, „Ce aș face eu”, explicația, mesajele Discord) și felul în care sunt scrise cifrele.
- **Nu se schimbă:** pragurile, logica, nivelurile (IEȘI / ATENȚIE / ȚINE), codurile sfaturilor, ordinea motivelor, ce informație poartă fiecare sfat (cifrele, condițiile, acțiunea). Nicio informație nu se pierde.
- Titlul / motivul = faptul + cifra, **≤ 60 de caractere**. Fără „s-a”, „a ajuns să”, fără umplutură.
- „Ce aș face eu” = **o singură acțiune**, la persoana I („Aș …”, „N-aș …”), **≤ 110 caractere**. Condiția apare doar dacă schimbă acțiunea. Nu repetă titlul.
- Explicația = **o frază, ≤ 160 de caractere**, doar „de ce”. Nu repetă titlul sau acțiunea.
- Avertizările comune se spun **o singură dată**, în legenda panoului; în sfat rămâne doar „(puține cazuri)”.
- Cifrele — un singur modul, `public/lib/text-ro.js` (`TextRo`), în pagină și în colector; prețurile rămân cu zecimalele Pionex.
- Vocabular unic: botul · gridul · grila · intervalul · marginea de jos / de sus · lichidarea · stopul · planul · „închide botul” · „adaugă marjă” · „pornește unul nou din fișă”.
- Ton: fără exclamații, fără „atenție!”, fără majuscule de strigat, fără „vezi … mai jos”.
- Fiecare pachet: inventar înainte → rescriere → gardă + probele vechi aduse la textul nou (fiecare schimbare de test notată) → poze → commit/push.
- Casa: mesajele de commit se scriu într-un fișier cu Write și se dau cu `git commit -F` (Bash dezescapează backslash-urile și execută backtick-urile), cu rândurile de atribuire ale sesiunii · `npm test && git commit && git push` — niciodată cu `;` · fără `git pull` în `crypto` (lansatoarele rulează) · `.dev.vars*` nu se ating · `python` nu · comentariile în listele de înlocuiri pe teste: doar `/* … */` (garda comentariilor).

## Ce acoperă pachetul (și trei abateri de la lista din spec, de aprobat)

Specul numește `sfaturi.js`, `tablou-extra.js` („Ce ai de făcut acum”) și `scenariu.js`. Citind ecranul (poza „Ce ai de făcut acum” pe CRV, 02.10), trei surse de sfaturi ale botului nu erau în niciun pachet:

1. **Avertismentele serverului** (`functions/api/bot-orders.js`) — primele rânduri din „Ce ai de făcut acum” și lista boților: „Până la lichidare (jos, la 0.3382876201448984) mai sunt 10.9%.” (prețul cu 16 zecimale), „Profitul NET e negativ…”, „Botul nu are niciun opritor configurat.” → intră (sarcinile 1 și 5).
2. **Rezumatul direcției** (`public/lib/directie.js`) — textul sfatului „direcția” și al panoului direcției de pe Tablou: „Piața merge ÎMPOTRIVA botului (…)”, a doua frază „Dar în bara de 4 ore … cu 2.3%.” → intră (sarcina 2).
3. **Rândurile cu sfaturi ale Tabloului din `app.js`** — panoul planului („ATINSĂ — ieși”, „exact ce ți-ai propus — ieși acum, fără să renegociezi”) și portofoliul → intră (sarcina 4).

Și ideea 3: **verdictul vechi** (`tablou-bot.js`) e în inventarul „înainte” (cardul lui e ascuns; ajunge pe ecran doar prin Consilier), iar ce ajunge pe ecran se repară în `consiliu.js` (sarcina 3). `tablou-bot.js` nu se schimbă.

`scenariu.js` (texte scurte de stare, fără cifre de reformatat), `comparaCuFisa`, `propunePlan`, `distanteGrid` (deja concise, cu virgulă) au fost citite și rămân. Ce merge în alte pachete: titlul/textul sfatului „pericol” și rândurile din alerte (`alerte.js`, pachetul 3), fișa de închidere (`fisaInchidere` → Discord, pachetul 3), „Istoricul tău pe CRV” (`consilier.js`, pachetul 4), poarta de pornire din fișa Grid (pachetul 5).

**Versiunea colectorului:** specul o mută la pachetele 3 și 5; aici trece la **v101.42**, fiindcă colectorul încarcă `sfaturi.js`, `consiliu.js` și `directie.js` (fără repornire, Discord-ul Consilierului ar trimite textele vechi) — ca la pachetul 1.

## Ce trebuie urmărit la revizie (Review Focus)

1. **Rândurile „Ce ai de făcut acum” care se înghit unul pe altul** — `acelasi()` unește un avertisment cu o alertă când au cuvinte comune; avertismentul nou „Lichidarea la 10,9% (…)” înghite alertele „Lichidarea la …” (voit: un rând, nu două). Un avertisment care ar înghiți o alertă DIFERITĂ ar ascunde-o. Testul: sarcina 5 („avertismentul lichidării înghite alertele…”) + verificarea pe poza reală (sarcina 6).
2. **Consumatorii unui câmp redenumit** — `deCe` al sfaturilor devine `sursa`; un cititor uitat ar afișa gol. Cititorii găsiți: cardul ascuns din `app.js` și `scenariu-v77`; Consilierul și colectorul nu-l citesc. Testul: sarcina 2 (niciun sfat cu `deCe`, cardul citește `sursa`). La fel încărcătorii: o probă care încarcă `sfaturi.js` sau cheamă `ritmRecuperare` fără `TextRo` crapă la primul text (`scenariu-v77` și `pachet-v87` o făceau, validarea pe copie i-a prins) — testele din sarcinile 2 și 4 caută pe tot dosarul `scripts/`.
3. **Titlul marginii fără „traducătorul” din Consilier** — `titluMargine` iese; o fixtură veche (datele reale din 30.09, `proba-v10044`) sau un colector nerepornit ar arăta forma veche „Până la marginea de jos (…) sunt 1.7%”. Testul: sarcina 3 (titlul și textul sfatului trec neschimbate) + colectorul repornit (sarcina 6).
4. **Lungimi pe date extreme** — mișcare de 10× obișnuitul, moneda cu nume lung (LIGHTER, 1000BONK), frecvențe cu „puține cazuri” pe zile ȘI săptămâni: titlul tot ≤ 60, textul ≤ 160. Testul: sarcina 2 (mișcarea la 10,4×) + garda (LIGHTER, „puține cazuri”).
5. **Avertismentele serverului cu date lipsă** — comisioane necunoscute, lichidare fără preț, distanță `null`: fără „null”/„NaN”/„undefined” în text. Testul: garda, situația „comisioanele necunoscute” (strict la sarcina 5).

---

## Fișierele

**Noi:** `functions/_shared/avertismente.js` · `scripts/proba-v10062.mjs` · `docs/superpowers/inventar-sfaturi/2-sfaturi-boti-inainte.md` și `…-dupa.md` · anexa planului.

**Modificate:** `public/lib/sfaturi.js` (LF) · `public/lib/directie.js` · `public/lib/consiliu.js` (CRLF) · `public/lib/tablou-extra.js` · `public/app.js` (CRLF, 4 locuri) · `public/app.css` (1 regulă) · `functions/api/bot-orders.js` · `scripts/garda-texte.mjs` · `package.json` · 7 probe vechi (`scenariu-v77`, `cu-botul-v963`, `directie-v75`, `proba-v10040`, `proba-v10044`, `pachet-v87`, `bot-orders-v72`) · versiunile: `BUILD_INFO.json`, `functions/_shared/versiune.js`, `public/sw.js`, `public/index.html` (CRLF), `scripts/colector.mjs` (CRLF).

În comenzile de mai jos: `A=docs/superpowers/plans/2026-10-02-sfaturi-pachetul-2` și `ED="node $A/ed.mjs"`, rulate din `C:\Users\Cimin\crypto` (Git Bash).

---

### Sarcina 1: garda pe tot pachetul 2 + avertismentele serverului într-o funcție pură + inventarul „înainte”

**Fișiere:** creează `functions/_shared/avertismente.js`, `scripts/proba-v10062.mjs`, `docs/superpowers/inventar-sfaturi/2-sfaturi-boti-inainte.md` · modifică `functions/api/bot-orders.js`, `scripts/garda-texte.mjs`, `package.json`.

**Interfețe:**
- Produce: `avertismenteBot(o) → string[]` în `functions/_shared/avertismente.js`, `o = { x: buOrderData, pret, jos, sus, lich: { pretLichidare, lichidarePartea, distantaLichidarePct, lichidareDepasita }, comisioane, gridProfitBrut, profitNet }` — aceleași condiții și aceleași texte ca înainte (mutare).
- Garda: grupuri noi `sfaturi` (Sfaturi.sfaturi real; câmpurile `titlu`/`text`/`faCe`/`sursa`/`deCe`), `alerte` (titlul/textul sfatului „pericol” — vin din `alerte.js`, rămân „raport” până la pachetul 3), `todo` (rândurile proprii din „Ce ai de făcut acum” + `ritmRecuperare`), `consiliu-2` (Consilierul cu sfaturile reale + verdictul vechi), `server` (`avertismenteBot`); `--mod=a,b` la `--inventar`.

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 1 scripts/proba-v10062.mjs` și `$ED package.json $A/pagina.mjs s1_pkg` (proba în `npm test`, după garda comentariilor).
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10062.mjs` → `PICA · 0/3` (modulul `avertismente.js` lipsește; garda: „sfaturi: 0 texte”; `--mod` nu filtrează).
- [ ] **Pas 3 — codul:**
  ```bash
  cp $A/avertismente-v1.js functions/_shared/avertismente.js
  $ED functions/api/bot-orders.js $A/s1-bot-orders.mjs     # importul, ban/semn mutate, blocul avertismentelor -> avertismenteBot({...})
  $ED scripts/garda-texte.mjs $A/s1-garda.mjs              # 10 înlocuiri: modulele, fixturile (cuBrut, K4, REZ, fisaS), situațiile pachetului 2, --mod
  node --check functions/_shared/avertismente.js && node --check functions/api/bot-orders.js
  ```
- [ ] **Pas 4 — trec:** `node scripts/proba-v10062.mjs` → `PASS · 3/3`; `node scripts/bot-orders-v72.mjs` → `PASS · 49/49` (dovada că avertismentele doar s-au mutat); `node scripts/garda-texte.mjs` → `PASS` pe cele stricte și raportul de azi: sfaturi 360 de texte, 145 cu abateri · alerte 6 / 5 · todo 8 / 3 · consiliu-2 24 / 11 · server 8 / 4 (toate „raport”).
- [ ] **Pas 5 — inventarul „înainte”:**
  ```bash
  node scripts/garda-texte.mjs --inventar docs/superpowers/inventar-sfaturi/2-sfaturi-boti-inainte.md --mod=sfaturi,alerte,todo,consiliu-2,server
  cat $A/inventar-inainte-anexa.md >> docs/superpowers/inventar-sfaturi/2-sfaturi-boti-inainte.md   # verdictul vechi (ideea 3), textele din app.js, ce nu e în pachet
  ```
- [ ] **Pas 6 — commit:** `npm test && git add functions/_shared/avertismente.js functions/api/bot-orders.js scripts/garda-texte.mjs scripts/proba-v10062.mjs package.json docs/superpowers/inventar-sfaturi/2-sfaturi-boti-inainte.md && git commit -F <mesaj>` („test(texte): garda pe sfaturile reale ale botilor, „Ce ai de făcut acum” si avertismentele serverului (mutate intr-o functie pura) - pachetul 2, inventarul inainte”).

### Sarcina 2: `sfaturi.js` și rezumatul direcției

**Fișiere:** modifică `public/lib/sfaturi.js` (17 înlocuiri, `$A/s2-sfaturi.mjs`), `public/lib/directie.js` (`$A/s2-directie.mjs`), `public/app.js` (cardul ascuns al sfaturilor), `scripts/garda-texte.mjs` (STRICT + „tot mai jos”), `scripts/proba-v10062.mjs`, 4 probe vechi.

**Interfețe:**
- Consumă: `TextRo.*` (pachetul 1).
- Produce: fiecare sfat = `{ cod, ton, titlu, text, faCe, sursa }` — **`deCe` devine `sursa`** (de unde vin cifrele; la vedere doar în cardul ascuns, ca înainte); `Directie.rezumat(rez, dir)` întoarce și `dovezi` (textul fără concluzie) — sfatul „direcția” îl folosește ca text (concluzia e în titlu).
- Textele noi exacte sunt în `$A/s2-sfaturi.mjs` și `$A/s2-directie.mjs` (tabelul de sus le arată pe cele principale).

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 2 scripts/proba-v10062.mjs` (marginea, o singură voce cu semaforul, zero-ul, funding-ul, ritmul/costurile/setarea/mișcarea la 10×, direcția, liniștea, M7, probele care încarcă `sfaturi.js` fără `TextRo`, cardul ascuns + garda strictă).
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10062.mjs` → `PICA · 3/13` (cele 10 noi; între ele, `scenariu-v77` încarcă `sfaturi.js` fără `TextRo`).
- [ ] **Pas 3 — codul:**
  ```bash
  $ED public/lib/sfaturi.js $A/s2-sfaturi.mjs
  $ED public/lib/directie.js $A/s2-directie.mjs
  $ED public/app.js $A/pagina.mjs s2_app            # cardul ascuns: s.deCe -> s.sursa
  $ED scripts/garda-texte.mjs $A/pagina.mjs s2_garda  # STRICT += "sfaturi"; „tot mai jos” (structura trendului) nu e „vezi mai jos”
  node --check public/lib/sfaturi.js && node --check public/lib/directie.js
  ```
- [ ] **Pas 4 — trec:** `node scripts/proba-v10062.mjs` → `PICA · 12/13` (rămâne „fiecare probă care încarcă sfaturi.js încarcă TextRo” — `scenariu-v77`, pasul 5); `node scripts/garda-texte.mjs` → `STRICT sfaturi … 0 cu abateri`.
- [ ] **Pas 5 — testele vechi aduse la textul nou** (același fapt, altă formulare — lista exactă în `$A/teste-vechi.mjs`):
  ```bash
  $ED scripts/scenariu-v77.mjs $A/teste-vechi.mjs s2_scenariu77    # 5: proba încarcă TextRo; trendul = măsurătoarea (mecanismul gridului e în legendă); „nu adăuga” -> „N-aș adăuga bani”; 83.30 -> 83,30; deCe -> sursa
  $ED scripts/cu-botul-v963.mjs $A/teste-vechi.mjs s2_cuBotul963   # titlul mișcării cu cifra („Mișcare cu botul: …”, „Mișcare contra botului: …”); „opritorul la prețul de zero” -> „stopul mutat la zero-ul botului”
  $ED scripts/directie-v75.mjs $A/teste-vechi.mjs s2_directie75    # /ÎMPOTRIVA/ -> /^Piața merge împotriva botului \(/
  $ED scripts/proba-v10040.mjs $A/teste-vechi.mjs s2_proba10040    # zero-ul tot TAKE-PROFIT, spus „Aș pune take-profit-ul …”
  ```
- [ ] **Pas 6 — suita:** `node scripts/proba-v10062.mjs` → `PASS · 13/13`; `npm test` → verde.
- [ ] **Pas 7 — commit:** `npm test && git add public/lib/sfaturi.js public/lib/directie.js public/app.js scripts/garda-texte.mjs scripts/proba-v10062.mjs scripts/scenariu-v77.mjs scripts/cu-botul-v963.mjs scripts/directie-v75.mjs scripts/proba-v10040.mjs && git commit -F <mesaj>` („feat(texte): sfaturile botilor concise - titlul cu cifra, de ce intr-o fraza, „Aș …”, sursa separat; rezumatul directiei fara majuscule”).

### Sarcina 3: Consilierul — titlul marginii, verdictul vechi, legenda

**Fișiere:** modifică `public/lib/consiliu.js` (`$A/s3-consiliu.mjs`), `scripts/garda-texte.mjs` (STRICT + fixtura marginii), `scripts/proba-v10062.mjs`, `scripts/proba-v10044.mjs`.

**Interfețe:**
- Consumă: titlul sfatului „margine” în forma nouă (sarcina 2) — `titluMargine` nu mai e nevoie.
- Produce: motivul „opreste” cu text = de ce (starea Pionex) / titlu cu virgulă (lichidarea depășită); `Consiliu.LEGENDA` + „Trendul și direcția se măsoară pe bare închise: arată starea de acum, nu încotro merge prețul; contra botului, gridul adaugă poziție la fiecare grilă și pierderea pe ea crește.”

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 3 scripts/proba-v10062.mjs`.
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10062.mjs` → `PICA · 13/16`.
- [ ] **Pas 3 — codul:** `$ED public/lib/consiliu.js $A/s3-consiliu.mjs` · `$ED scripts/garda-texte.mjs $A/pagina.mjs s3_garda` (STRICT += „consiliu-2”; fixtura scrisă de mână a marginii trece la titlul nou) · `node --check public/lib/consiliu.js`.
- [ ] **Pas 4 — trec:** `node scripts/proba-v10062.mjs` → `PASS · 16/16`; `node scripts/garda-texte.mjs` → `STRICT consiliu-2 … 0 cu abateri`.
- [ ] **Pas 5 — testul vechi:** `$ED scripts/proba-v10044.mjs $A/teste-vechi.mjs s3_proba10044` — fixtura reală din 30.09 păstrează forma veche a titlului (nu se rescriu datele înregistrate); se verifică faptul: titlul și textul sfatului ajung în Consilier.
- [ ] **Pas 6 — suita:** `npm test` → verde.
- [ ] **Pas 7 — commit:** `npm test && git add public/lib/consiliu.js scripts/garda-texte.mjs scripts/proba-v10062.mjs scripts/proba-v10044.mjs && git commit -F <mesaj>` („feat(texte): Consilierul - titlul marginii vine gata din sfat, starea Pionex cu de ce-ul ei (nu titlul de doua ori), legenda cu trendul pe bare inchise”).

### Sarcina 4: „Ce ai de făcut acum”, ritmul de recuperare, panoul planului, portofoliul

**Fișiere:** modifică `public/lib/tablou-extra.js`, `public/app.js`, `public/app.css`, `scripts/garda-texte.mjs`, `scripts/proba-v10062.mjs`, `scripts/pachet-v87.mjs`.

**Interfețe:** fără câmpuri noi; doar texte și o regulă CSS (`#tabloubot .tbTodoRand p{…;white-space:pre-line}` — mesajele pe două rânduri rămân pe două rânduri).

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 4 scripts/proba-v10062.mjs`.
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10062.mjs` → `PICA · 16/20` (între ele: `pachet-v87` cheamă `ritmRecuperare` fără `TextRo`).
- [ ] **Pas 3 — codul:**
  ```bash
  $ED public/lib/tablou-extra.js $A/pagina.mjs s4_extra   # rândul planului lipsă (o frază), ritmul de recuperare cu TextRo
  $ED public/app.js $A/pagina.mjs s4_app                  # panoul planului (virgulă, „închide botul”, acțiunea la persoana I), portofoliul (de ce + o acțiune)
  $ED public/app.css $A/pagina.mjs s4_css                 # white-space:pre-line pe rândurile din „Ce ai de făcut acum”
  $ED scripts/garda-texte.mjs $A/pagina.mjs s4_garda      # STRICT += "todo"
  node --check public/lib/tablou-extra.js && node --check public/app.js
  ```
- [ ] **Pas 4 — trec:** `node scripts/proba-v10062.mjs` → `PASS · 19/20` (rămâne `pachet-v87`, pasul 5); `node scripts/garda-texte.mjs` → `STRICT todo … 0 cu abateri`.
- [ ] **Pas 5 — testul vechi:** `$ED scripts/pachet-v87.mjs $A/teste-vechi.mjs s4_pachet87` (proba încarcă `TextRo`: ritmul de recuperare scrie cifrele prin el) → `node scripts/proba-v10062.mjs` → `PASS · 20/20`; `npm test` → verde.
- [ ] **Pas 6 — commit:** `npm test && git add public/lib/tablou-extra.js public/app.js public/app.css scripts/garda-texte.mjs scripts/proba-v10062.mjs scripts/pachet-v87.mjs && git commit -F <mesaj>` („feat(texte): „Ce ai de făcut acum”, panoul planului si portofoliul concise - virgula, „închide botul”, mesajele pe doua randuri raman pe doua randuri”).

### Sarcina 5: avertismentele serverului

**Fișiere:** modifică `functions/_shared/avertismente.js` (`$A/s5-server.mjs`), `scripts/garda-texte.mjs`, `scripts/proba-v10062.mjs`, `scripts/bot-orders-v72.mjs`.

**Interfețe:** `avertismenteBot(o)` — aceleași condiții; textele noi. Avertismentul lichidării începe ca alerta colectorului („Lichidarea la …”), deci în „Ce ai de făcut acum” o înghite (un rând cu „×N în 24 h”, nu două).

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 5 scripts/proba-v10062.mjs`.
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10062.mjs` → `PICA · 20/22`.
- [ ] **Pas 3 — codul:** `$ED functions/_shared/avertismente.js $A/s5-server.mjs` · `$ED scripts/garda-texte.mjs $A/pagina.mjs s5_garda` (STRICT += „server”) · `node --check functions/_shared/avertismente.js`.
- [ ] **Pas 4 — trec:** `node scripts/proba-v10062.mjs` → `PASS · 22/22`; `node scripts/garda-texte.mjs` → `STRICT server … 0 cu abateri`.
- [ ] **Pas 5 — testul vechi:** `$ED scripts/bot-orders-v72.mjs $A/teste-vechi.mjs s5_botOrders72` (6: „DEPĂȘITĂ” -> „Lichidarea estimată (…) e depășită”; „9.4” -> „9,4%”; „mănâncă mai mult” -> „depășesc câștigul grilelor”; „grid +2.80 … restul −4.11 din poziție/finanțare” -> „Grilele câștigă (+2,80 USDT), dar poziția și funding-ul (−4,11) și comisioanele (−0,64) …”; „niciun opritor” -> „n-are nici stop, nici țintă”).
- [ ] **Pas 6 — suita:** `npm test` → verde.
- [ ] **Pas 7 — commit:** `npm test && git add functions/_shared/avertismente.js scripts/garda-texte.mjs scripts/proba-v10062.mjs scripts/bot-orders-v72.mjs && git commit -F <mesaj>` („feat(texte): avertismentele serverului concise - pretul lichidarii rotunjit (venea cu 16 zecimale), virgula, „stop / țintă”; lichidarea inghite alerta ei in „Ce ai de făcut acum””).

### Sarcina 6: versiunile, inventarul „după”, colectorul, pozele, revizia

**Fișiere:** `BUILD_INFO.json`, `functions/_shared/versiune.js`, `package.json`, `public/sw.js`, `public/index.html`, `scripts/colector.mjs`, `docs/superpowers/inventar-sfaturi/2-sfaturi-boti-dupa.md`, `scripts/proba-v10062.mjs`.

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 6 scripts/proba-v10062.mjs` → `node scripts/proba-v10062.mjs` → `PICA · 22/24`.
- [ ] **Pas 2 — versiunile:** `$ED BUILD_INFO.json $A/versiuni.mjs build` · `$ED functions/_shared/versiune.js $A/versiuni.mjs versiune` · `$ED package.json $A/versiuni.mjs pkg` · `$ED public/sw.js $A/versiuni.mjs sw` · `$ED public/index.html $A/versiuni.mjs html` · `$ED scripts/colector.mjs $A/versiuni.mjs colector`.
- [ ] **Pas 3 — inventarul „după”:**
  ```bash
  node scripts/garda-texte.mjs --inventar docs/superpowers/inventar-sfaturi/2-sfaturi-boti-dupa.md --mod=sfaturi,alerte,todo,consiliu-2,server
  cat $A/inventar-dupa-harta.md docs/superpowers/inventar-sfaturi/2-sfaturi-boti-dupa.md > docs/superpowers/inventar-sfaturi/dupa.tmp && mv docs/superpowers/inventar-sfaturi/dupa.tmp docs/superpowers/inventar-sfaturi/2-sfaturi-boti-dupa.md
  ```
- [ ] **Pas 4 — trec:** `node scripts/proba-v10062.mjs` → `PASS · 24/24`; `npm test` → verde; `node scripts/garda-texte.mjs` → `PASS · pachetele stricte (semafor, cartele, consiliu, sfaturi, consiliu-2, todo, server) fără abateri`.
- [ ] **Pas 5 — commit + push:** `npm test && git add -A docs/superpowers/inventar-sfaturi BUILD_INFO.json functions/_shared/versiune.js package.json public/sw.js public/index.html scripts/colector.mjs scripts/proba-v10062.mjs && git commit -F <mesaj> && git push` („chore(versiune): v100.62 / colectorul v101.42 - sfaturile concise, pachetul 2; inventarul dupa cu harta informatiilor”).
- [ ] **Pas 6 — colectorul repornit** (încarcă `sfaturi.js`, `consiliu.js`, `directie.js`): în PowerShell, `cd C:\Users\Cimin\crypto; $id = [int]((Get-Content data\colector.pid) -split ' ')[0]; Stop-Process -Id $id -Confirm:$false; Start-Sleep -Seconds 2; Start-Process -FilePath 'node' -ArgumentList 'scripts\colector.mjs' -WorkingDirectory 'C:\Users\Cimin\crypto' -WindowStyle Hidden; Start-Sleep -Seconds 15; Get-Content data\colector.log -Tail 3` → jurnalul arată `v101.42`, fără erori.
- [ ] **Pas 7 — pozele la lățimea LUI** (pagina locală :8788, datele lui reale): „Ce ai de făcut acum” și Consilierul la 1920 și 390 cu `node $A/poza-todo.mjs <dosar> 1920 390` (Chrome headless pe :8788, tokenul citit din `.dev.vars`, netipărit; scrie și textul listelor), + `proba-ecran-grid` (1440 + 390) și `proba-ecran-t212` (1920) — de judecat pe poză: rândurile se citesc într-o privire, nimic lipit, nimic tăiat, avertismentul lichidării și alertele lui pe un singur rând.
- [ ] **Pas 8 — revizia Opus** pe tot pachetul (regulile din spec + inventarul + Review Focus de mai sus), apoi reparațiile, fiecare cu testul lui roșu → verde.

---

## Ce nu face pachetul 2

- Nu schimbă logica, pragurile, tonurile, ordinea sau ce sfaturi apar — doar textele și cifrele lor.
- Nu atinge textele din alerte (`alerte.js`, Discord-ul alertelor, fișa de închidere) — pachetul 3; nici acțiunile T212 — pachetul 4; nici Acasă / rapoartele / fișa Grid — pachetul 5.
- Nu schimbă `tablou-bot.js` (verdictul vechi) — doar ce ajunge din el pe ecran, prin Consilier.
