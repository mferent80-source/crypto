# Sfaturile concise — 2b: ce a rămas după revizia pachetului 2 — plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Pașii au căsuțe `- [ ]`.

**Goal:** tot ce a rămas deschis după revizia pachetului 2 — cele două probleme vechi (verdele fals „Piața e cu botul”, „stopul la zero” pe minus), ideile 2–4 (intervalul funding-ului, prețurile monedelor mici, fixturi reale în gardă) și minorele amânate (pachetul 2: M3, M4; pachetul 1: M3, M4, M7).

**De ce fără aprobarea planului:** el (02.10), după raportul reviziei: „FA TOT” — execuție inline pe loc.

**Architecture:** reparații mici, fiecare cu testul ei în proba nouă `scripts/proba-v10065.mjs` (văzut ROȘU pe codul de acum), în modulele care produc textul: `consiliu.js`, `sfaturi.js`, `semnale-bot.js`, cele trei copii `fp`/`fmtPret`, `functions/_shared/avertismente.js`, garda.

**Spec:** `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` (regulile de scris, „nicio informație nu se pierde”).

## Global Constraints
- Titlul ≤ 60 · „Ce aș face eu” ≤ 110, o acțiune la persoana I · explicația ≤ 160 · rândurile (avertismentele serverului) ≤ 110.
- Virgulă zecimală la procente și sume (`TextRo`); prețurile cu zecimalele lor.
- Vocabular unic: „închide botul”, „stopul”, „take-profit-ul”, „pornește unul nou din fișă”.
- Verdictul (IEȘI / ATENȚIE / ȚINE) NU se schimbă din aceste reparații.
- `npm test && git commit && git push` — niciodată `;`. Fără `git pull` în `crypto` (doar fast-forward verificat, fără lansatoare atinse).

## Review Focus
1. Consilierul pe piață contra / amestecată / laterală / liniștită — verdictul rămâne același, direcția nu dispare (contra = motivul galben; amestecată = în „Restul”).
2. Botul neutru: semnul poziției nu e sigur (`pnlNerealizatSigur: false`) ⇒ textul funding-ului nu spune „îl plătești / îl încasezi”.
3. Prețuri sub 0,01 și sub 0,000001 în toate textele care pun un preț (fără exponent, fără cifre pierdute).
4. Avertismentele serverului cu sume în mii și prețuri BTC — ≤ 110.
5. Istoria funding-ului cu goluri sau neordonată — intervalul nu iese 0 sau 16 h.

---

### Task 1: (a) Consilierul — motivul verde al pieței spune doar ce e adevărat
**Files:** `public/lib/consiliu.js` (pasul 4) · Test: `scripts/proba-v10065.mjs`
- [ ] Testele (ROȘU pe codul de acum): bot long, piața contra (4 ore și 1 zi coboară) ⇒ niciun motiv „Piața e cu botul”, motivul galben „Piața merge împotriva botului” rămâne, verdictul ca înainte; piața amestecată ⇒ fără „Piața e cu botul”, „Piața dă semnale amestecate” apare în `rest`; piața cu botul ⇒ „Piața e cu botul” + „piața merge cu botul (4 ore urcă, 1 zi urcă)”; liniștită + contra ⇒ „Piața e liniștită”, fără „Trendul, o singură măsură”.
- [ ] Reparația: în pasul 4, sfatul `directie` intră în motivul verde doar dacă tonul lui e `bine` sau piața e laterală; altfel rămâne motivul lui galben (pasul 3) sau intră în „Restul” (amestecată); `folosite.directie/trend` se pun doar când intră.

### Task 2: (b) mișcarea cu botul — stopul la zero doar când zero-ul e de partea care protejează
**Files:** `public/lib/sfaturi.js` (sfatul `miscare-cu`)
- [ ] Testele: long pe plus (zero-ul sub preț) ⇒ „L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea de sus.”; long pe minus (zero-ul peste preț) ⇒ „L-aș lăsa fără bani în plus, cu take-profit-ul la zero-ul botului, și aș urmări marginea de sus.”; short simetric (marginea de jos); fără zero ⇒ „L-aș lăsa fără bani în plus și aș urmări marginea de sus.”
- [ ] Reparația: `x.zero.distantaZeroPct` (stop valid: long cu zero-ul sub preț, short cu zero-ul peste preț).

### Task 3: funding-ul — intervalul real și botul neutru
**Files:** `public/lib/sfaturi.js` (`intrare`, sfatul `funding`), `public/app.js` (Tabloul: `e.fundingHist`), `scripts/colector.mjs` (intrarea sfaturilor)
- [ ] Testele: istoria Binance la 4 ore ⇒ „Funding-ul: 0,080% la 4 ore, îl plătești”; fără istorie ⇒ „la 8 ore”; istorie neordonată sau cu un gol ⇒ intervalul cel mai des (nu 0, nu 16); botul neutru, rata pozitivă ⇒ „Funding-ul: 0,080% la 8 ore, îl plătesc long-urile”, ton `info`, textul „… botul neutru îl plătește cât e net long și îl încasează cât e net short.”; sursa: pagina și colectorul trimit `fundingHist` în `Sfaturi.intrare`.
- [ ] Reparația: `intrare` primește `fundingHist` și calculează `fundingOre` (diferența cea mai des întâlnită între `fundingTime`-uri, rotunjită la oră, între 1 și 24); titlul o folosește (8 dacă lipsește); la neutru spune cine plătește rata.

### Task 4: prețurile monedelor mici
**Files:** `public/lib/sfaturi.js` (`pret`), `public/lib/consiliu.js` (`fp`), `public/lib/semnale-bot.js` (`fmtPret`), `public/lib/probabilitati.js` (`fp`), `public/lib/valoare.js` (`fp`)
- [ ] Testele: sfatul „zero” cu prețul de zero 0.004123 ⇒ titlul are „0.004123” (nu „0.0041”); 0.0000001234 ⇒ „0.0000001234” (fără „e-7”) în toate cele 5 formatoare; prețurile peste 0,01 rămân ca înainte („0.3851”, „64123.45”).
- [ ] Reparația: sub 0,01 — 4 cifre semnificative cu `toFixed` (fără exponent); peste — neschimbat.

### Task 5: minorele amânate
**Files:** `public/lib/consiliu.js`, `public/lib/semnale-bot.js`, `public/lib/sfaturi.js`
- [ ] (pachetul 2, M3) „N-aș închide botul pentru asta; …” nu mai e citit drept ieșire: lângă margine primește „n-aș pune bani în plus cât stă lângă margine”.
- [ ] (pachetul 1, M3) fraza „n-aș pune bani în plus …” nu se mai pierde când nu încape și „de ce”-ul e ocupat: merge la sfârșitul lui „de ce”.
- [ ] (pachetul 1, M7) titlul Consilierului din pagină are plafonul de 60 (ca Discord-ul, `taie`).
- [ ] (pachetul 1, M4) `textBaniStop` cu stopul pe plus: „💰 Stopul tău închide pe plus (+2,4 USDT), mai bine decât cel propus (−21,0 USDT): l-aș lăsa unde e.”
- [ ] (pachetul 2, M4) acțiunea trendului contra: „N-aș adăuga bani; dacă se face „tare” și pe 1 zi, aș închide botul lângă zero și aș porni din fișă unul pe trend.” (condiția veche, măsurabilă).

### Task 6: garda pe forme reale (ideea 4, M2)
**Files:** `scripts/garda-texte.mjs`, `functions/_shared/avertismente.js` (dacă trece de 110)
- [ ] Lumânările de 4 ore: 500 (cât dă Pionex), nu 300.
- [ ] Regula nouă: o frecvență „(N din M)” cu M < 30 are „puține cazuri” în același text.
- [ ] Situații noi pe server: BTC (prețuri de 5 cifre, sume în mii) și o monedă sub 0,01 ⇒ fiecare avertisment ≤ 110; ce trece se scurtează (ROȘU în gardă întâi).

### Task 7: versiunea, inventarul, pozele, push-ul
- [ ] v100.65 (BUILD_INFO, versiune.js, package.json, sw.js, index.html ×4) · colectorul v101.44 (încarcă sfaturi.js, consiliu.js, semnale-bot.js) · `test:v10065` în lanțul `npm test`.
- [ ] `docs/superpowers/inventar-sfaturi/2b-restul.md`: fiecare text schimbat, vechi → nou, cu informația lui.
- [ ] `npm test && git commit && git push`; colectorul repornit; probele de ecran; poze 1920 + 390; revizia Opus (în fundal) pe `a54aeaa..HEAD`.
