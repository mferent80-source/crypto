# Sfaturile concise — pachetul 1: baza comună și Consilierul boților — planul de implementare

> **Pentru agenți:** SUB-SKILL OBLIGATORIU: superpowers:subagent-driven-development (recomandat) sau superpowers:executing-plans, sarcină cu sarcină. Pașii au căsuțe (`- [ ]`).

**Scopul:** textele Consilierului boților (semaforul, cartelele „Acum, concret”, Consilierul, mesajul lui pe Discord) devin scurte și profesioniste — titlul ≤ 60 cu cifra, „Ce aș face eu” ≤ 110 la persoana I, „de ce” separat ≤ 160 — fără să se schimbe pragurile, logica, nivelurile sau vreo informație.

**Arhitectura:** un modul nou de cifre (`public/lib/text-ro.js`, `TextRo`) folosit de pagină și de colector; o gardă (`scripts/garda-texte.mjs`) care generează sfaturile REAL, cu modulele adevărate, pe situații din datele lui, și verifică regulile din spec (pachetele terminate pe „strict”). Textele se rescriu în `semnale-bot.js` și `consiliu.js`; fiecare sfat primește un câmp nou `deCe` (explicația), pe care pagina îl arată sub acțiune.

**Tehnologii:** JavaScript ES5 în pagină (module `var X = (function(){…})()` + `globalThis.X`), Node 24 pentru probe și colector, fără dependențe noi.

**Specul:** `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md`

**Anexa (codul exact, validat):** `docs/superpowers/plans/2026-10-02-sfaturi-pachetul-1/` — fișierele noi întregi și listele de înlocuiri „vechi → nou”, aplicate cu `ed.mjs` (fiecare „vechi” trebuie să apară exact o dată, altfel nu scrie nimic; păstrează CRLF-ul). Secvența întreagă (sarcinile 1–6) a fost rulată pe o copie a repo-ului: fiecare sarcină pică întâi (RED), apoi trece (GREEN), cu `npm test` întreg verde după fiecare.

---

## Ce vezi tu, înainte → după (texte reale, din situațiile gărzii)

| Unde | Înainte | După |
|---|---|---|
| Lichidarea, titlul | lichidarea e la 12.4% și se îndepărtează (era 11.2% acum o oră) — 63 de caractere, punct zecimal | **Lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h)** |
| Lichidarea se apropie · Ce aș face eu | N-aș mai lăsa poziția să crească; aș pregăti marja (vezi „Dacă adaug marjă”). | **N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.** · de ce: Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”. |
| Lichidarea depășită | Verifică acum botul în Pionex: poziția poate fi deja lichidată sau pe marginea ei; aș închide ce a rămas. | **Aș închide ce a rămas, după ce verific botul în Pionex.** · de ce: Poziția poate fi deja lichidată sau pe marginea ei. |
| Planul pe minus atins | Ieși acum, cum ai hotărât la rece. | **Aș închide botul acum, cum ai hotărât la rece.** |
| Mută gridul, titlul (205 caractere) | prețul stă la marginea de jos a gridului (0,5% până la ea, 3,3% din interval); în 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (pragul: 2,2%, plafonat …) | **Prețul la 0,5% de marginea de jos (3,3% din interval)** · de ce: În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%, plafonat la 15% din interval). · sursa, sub motiv: profilul CRV: 183 de zile de bare de 1 h |
| Mișcarea e cu botul (485 de caractere) | L-aș lăsa să lucreze, fără bani în plus: pe drum grilele … Aș muta opritorul de pierdere la prețul de zero (28.5000) … Riscul e la întoarcere … | **Aș muta stopul la zero-ul botului (28.5), fără bani în plus.** · de ce: Pe drum grilele de sus încasează și poziția scade; până la marginea de sus (33) mai sunt 10,0%, după ea botul rămâne fără poziție. |
| Ținta de păstrat (452 de caractere) | Aș muta opritorul de pierdere din Pionex la 30.4203 (1,1% de prețul de acum; acolo, închizând, …) … Prețul ăsta se schimbă … | **Aș muta stopul la 30.4203 (1,1% de preț): închis acolo, totalul e +3 USDT după comision.** · de ce: E aproape: o mișcare obișnuită îl poate atinge curând, iar mai departe înseamnă ceva sub țintă. |
| Cartela Stopul (LIGHTER) | Atins, te costă ≈ 63 USDT — planul tău zice −15,7: mută-l la 4.2601 sau în procente, la −15,2% din investiție. | **Aș muta stopul la 4.2601 (în procente: −15,2% din investiție): atins acum, te costă ≈ 63 USDT, nu 15,7.** · de ce: Planul tău zice −15,7 USDT; stopul de la 3.787 stă mult mai departe. |
| Consilierul, titlul (când două motive erau lungi: 274 de caractere) | Lichidarea e la 12.4% și se îndepărtează (era 11.2% acum o oră), iar prețul stă la marginea de jos a gridului (…) | **Lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h)** — al doilea motiv e chiar dedesubt, în „De ce” |
| Consilierul, Ce aș face eu (CRV) | Aș lăsa stopul la 0.38 și aș trece planul la −10 USDT: stopul planului (0.3842) e atât de aproape încât o zi obișnuită … 71% din zile. Cât stă lângă margine, n-aș pune bani în plus. | **Aș lăsa stopul la 0.38 și aș trece planul la −10 USDT; n-aș pune bani în plus cât stă lângă margine.** · de ce: Stopul planului (0.3842) e prea aproape: o zi obișnuită a monedei ajunge acolo în 71% din zile. |
| Discord, Consilierul (titlu 107 / mesaj 469) | CRV: Consilierul — 🟡 Atenție · Stopul te costă mai mult decât planul, iar prețul stă lângă marginea de jos | **CRV · Atenție: stopul costă peste plan** (≤ 60) · 2 rânduri: „👉 acțiunea · 💰 banii” și „De ce: …” |
| Avertizările comune | „O frecvență din trecut, nu o promisiune.” / „O comparație, nu o dovadă.” în fiecare sfat | o singură dată, în **legenda de sub Consilier** |

Cifrele de pe tot pachetul: virgula zecimală, minusul „−”, fără „NaN” / „null”; prețurile rămân cu zecimalele Pionex.

Pe situațiile gărzii (aceleași, înainte și după): titlul mediu **65 → 42** de caractere (cel mai lung 302 → 54), „Ce aș face eu” **145 → 61** (485 → 88), rândul cartelelor **91 → 60** (207 → 103), titlul Discord **74 → 43**; abaterile de la reguli **105 → 0**. Explicațiile („de ce”) cresc de la 9 la 55 — înainte erau lipite în acțiune.

## Constrângeri globale (din spec, cuvânt cu cuvânt)

- **Se schimbă:** DOAR textul sfaturilor (titlu/motiv, „Ce aș face eu”, explicația, mesajele Discord) și felul în care sunt scrise cifrele.
- **Nu se schimbă:** pragurile, logica, nivelurile (IEȘI / ATENȚIE / ȚINE), codurile sfaturilor, ordinea motivelor, ce informație poartă fiecare sfat (cifrele, condițiile, acțiunea). Nicio informație nu se pierde.
- Titlul / motivul = faptul + cifra, **≤ 60 de caractere**. Fără „s-a”, „a ajuns să”, fără umplutură.
- „Ce aș face eu” = **o singură acțiune**, la persoana I („Aș …”, „N-aș …”), **≤ 110 caractere**. Condiția apare doar dacă schimbă acțiunea. Nu repetă titlul.
- Explicația = **o frază, ≤ 160 de caractere**, doar „de ce”. Nu repetă titlul sau acțiunea.
- Avertizările comune se spun **o singură dată**, în legenda panoului; în sfat rămâne doar „(puține cazuri)”.
- Cifrele — un singur modul, `public/lib/text-ro.js` (`TextRo`): `pct` → „12,4%”, `pctSemn` → „+1,2%” / „−0,8%”, `usdt` → „−8,50 USDT”, `lei` → „1.234 lei”, `ore` → „1 h” / „45 min”. Prețurile rămân cu zecimalele Pionex (`fmtPret` / `grPret`).
- Vocabular unic: botul · gridul · grila · intervalul · marginea de jos / de sus · lichidarea · stopul · planul · „închide botul” · „adaugă marjă” · „pornește unul nou din fișă”.
- Ton: fără exclamații, fără „atenție!”, fără „vezi … mai jos” dacă nu e chiar sub sfat.
- Discord: titlul ≤ 60, mesajul ≤ 2 rânduri; legătura spre Radar rămâne.
- Mesajele de commit se scriu într-un fișier cu Write și se dau cu `git commit -F` (Bash dezescapează backslash-urile și execută backtick-urile); se termină cu rândurile de atribuire ale sesiunii.
- Casa: `npm test && git commit && git push` — niciodată cu `;` · fără `git pull` în `crypto` (lansatoarele rulează) · `.dev.vars*` nu se ating · `python` nu (stub care se blochează) · fișierele cu backslash se scriu cu Write, nu prin heredoc · fără `//` lipit la mijlocul rândului într-o înlocuire (`/* … */`).

## Ce trebuie urmărit la revizie (Review Focus)

1. **„ținta” din motivul planului atins pe plus** — `podeaPeBani` găsește prima „țintă atinsă” după `/ținta/` în motiv; un motiv nou fără cuvântul ăsta ar stinge tăcut rândul „Ținta devine podea, pe banii tăi”. Testul: RF1 (sarcina 3).
2. **Titlul Consilierului din două motive** — cu sfaturile din `sfaturi.js` (pachetul 2, încă nerescrise) „X, iar Y” trece ușor de 60; atunci rămâne primul motiv. Testul: RF2 (sarcina 5).
3. **Cifre lipsă sau stricate** (`null`, `NaN`, `−0`) — nu „NaN%”, „−0,0%”, „null USDT”. Testul: TextRo (sarcina 1) + garda interzice „NaN|undefined|null” în orice text.
4. **Un încărcător uitat** — o probă sau colectorul care evaluează `semnale-bot.js` / `consiliu.js` fără `TextRo` crapă la primul text (`ReferenceError`). Testul: RF4 (sarcina 1) verifică toate probele, pagina, cache-ul offline și colectorul.
5. **Discord cu o monedă lungă și un titlu lung** — titlul tot ≤ 60 (rezerva: motivul de sus pe scurt, apoi tăiat la cuvânt), mesajul pe ≤ 2 rânduri. Testul: RF5 (sarcina 5).

---

## Fișierele

**Noi:** `public/lib/text-ro.js` · `scripts/lib/text-ro-global.mjs` · `scripts/garda-texte.mjs` · `scripts/proba-v10061.mjs` · `docs/superpowers/inventar-sfaturi/1-consilier-boti-inainte.md` și `…-dupa.md` · anexa planului.

**Modificate:** `public/lib/semnale-bot.js` (LF) · `public/lib/consiliu.js` (CRLF) · `public/app.js` (CRLF, 3 locuri) · `public/app.css` (3 reguli noi) · `public/index.html` (CRLF) · `public/sw.js` · `scripts/colector.mjs` (CRLF) · `package.json` · `BUILD_INFO.json` · `functions/_shared/versiune.js` · 18 probe (un rând de import) · 10 probe cu așteptări de text aduse la textul nou (fiecare notată, sub „Testele vechi”).

**Anexa** (`docs/superpowers/plans/2026-10-02-sfaturi-pachetul-1/`, se pune în repo odată cu planul): `ed.mjs` (editorul), `text-ro.js`, `text-ro-global.mjs`, `garda-texte.mjs`, `proba-v10061.mjs` (pe secțiuni „sarcina N”), `sectiuni.mjs`, `s1-importuri.mjs`, `s3-semafor.mjs`, `s4-cartele.mjs`, `s5-consiliu.mjs`, `pagina.mjs`, `teste-vechi.mjs`, `versiuni.mjs`.

În comenzile de mai jos: `A=docs/superpowers/plans/2026-10-02-sfaturi-pachetul-1` și `ED="node $A/ed.mjs"`, rulate din `C:\Users\Cimin\crypto` (Git Bash).

---

### Sarcina 1: `TextRo` — cifrele într-un singur loc, încărcat peste tot

**Fișiere:** creează `public/lib/text-ro.js`, `scripts/lib/text-ro-global.mjs`, `scripts/proba-v10061.mjs` · modifică `public/index.html`, `public/sw.js`, `scripts/colector.mjs`, 18 probe.

**Interfețe:**
- Produce: `TextRo.num(x, zec=1)` → „12,4” / „−0,8” · `TextRo.pct(x, zec=1)` (x în procente: `pct(12.4)` → „12,4%”) · `TextRo.pctSemn(x, zec=1)` → „+1,2%” · `TextRo.ori(x, zec=1)` → „1,7×” · `TextRo.usdt(x, zec=2)` → „+8,50 USDT” / „−8,50 USDT” / „0,00 USDT” · `TextRo.lei(x, cuSemn)` → „1.234 lei” · `TextRo.ore(ms)` → „45 min” / „1 h” / „5,3 h”. Orice intrare lipsă sau stricată → „—”. `globalThis.TextRo` e setat de fișier.
- Probele: `import "./lib/text-ro-global.mjs";` înaintea primului import face `globalThis.TextRo`.

- [ ] **Pas 1 — testul întâi:** `node $A/sectiuni.mjs 1 scripts/proba-v10061.mjs` (scrie proba cu secțiunea „sarcina 1”: testul TextRo cu 33 de cazuri și RF4 — încărcătoarele).
- [ ] **Pas 2 — vezi-l picând:** `node scripts/proba-v10061.mjs` → eșuează la încărcare (`scripts/lib/text-ro-global.mjs` nu există).
- [ ] **Pas 3 — codul:**
  ```bash
  cp $A/text-ro.js public/lib/ && cp $A/text-ro-global.mjs scripts/lib/
  node $A/s1-importuri.mjs .        # 18 probe: „import "./lib/text-ro-global.mjs";” înaintea lui „import assert …” (CRLF păstrat)
  $ED public/index.html $A/pagina.mjs s1_html      # <script src="/lib/text-ro.js"> înaintea lui grid-calcul.js
  $ED public/sw.js $A/pagina.mjs s1_sw              # "/lib/text-ro.js" în APP_SHELL
  $ED scripts/colector.mjs $A/pagina.mjs s1_colector  # incarca("text-ro.js", "TextRo") înaintea lui Alerte
  ```
  Cele 18 probe: `cu-botul-v963`, `proba-v100`, `proba-v10019`, `proba-v10038`, `proba-v10039`, `proba-v10040`, `proba-v10043`, `proba-v10044`, `proba-v10045`, `proba-v10050`, `proba-v10051`, `proba-v10054`, `proba-v10055`, `proba-v10056`, `proba-v10060`, `proba-v1018`, `proba-v99`, `semnale-v82`.
- [ ] **Pas 4 — trece:** `node scripts/proba-v10061.mjs` → `PASS · 2/2`; `npm test` → verde (nimic nu folosește încă `TextRo`).
- [ ] **Pas 5 — commit:** `npm test && git add public/lib/text-ro.js scripts/lib/text-ro-global.mjs scripts/proba-v10061.mjs public/index.html public/sw.js scripts/colector.mjs && git add -u scripts/ && git commit -F <mesaj>` (`-u` ia cele 18 probe modificate; arborele era curat la început) (mesajul: „feat(texte): TextRo - cifrele sfaturilor intr-un singur loc (virgula, minusul −, unitati), incarcat de pagina, cache, colector si probe”).

### Sarcina 2: garda textelor + inventarul „înainte”

**Fișiere:** creează `scripts/garda-texte.mjs`, `docs/superpowers/inventar-sfaturi/1-consilier-boti-inainte.md` · modifică `scripts/proba-v10061.mjs`, `package.json`.

**Interfețe:**
- Produce: `export const STRICT` (Set: „semafor”, „cartele”, „consiliu” — se adaugă câte unul, la sarcinile 3–5) · `export const REGULI` · `export const INTERZIS` · `export function verifica(text, tip, frate) → string[]` (abaterile; tip ∈ `titlu`, `faCe`, `rand`, `deCe`, `detalii`, `discordTitlu`, `discordMesaj`; `frate` = titlul aceluiași sfat) · `export function situatii() → [{sit, mod, sursa, tip, text, frate}]` (≈ 45 de situații: CRV cu lichidarea 12,4% care se apropie / se îndepărtează / fără istoric, 6%, depășită; planul plus / minus / afară; trend și mișcare contra; cu botul pe plus / short / peste margine; mută gridul cu și fără profil; costuri, BTC, aglomerare, ia profit; ținta de păstrat / la adăpost / poate urca; cartelele pe JTO, LIGHTER, short cu profil; Consilierul pe LIGHTER, lichidare + mută, perechi, cu botul, fără fișă; Discord cu LIGHTER și 1000BONK).
- CLI: `node scripts/garda-texte.mjs [--tot] [--inventar <fișier>]` — raportul pe module; eșec doar pe abaterile modulelor din `STRICT`; `--inventar` scrie tabelul Markdown + mesajul Discord de probă (`mesajDiscord`, netrimis).
- Regulile verificate: lungimile (titlu ≤ 60, faCe/rând ≤ 110, deCe ≤ 160, Discord ≤ 60 + ≤ 2 rânduri), persoana I la `faCe` (`/^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/`), o frază (nicio „. Majusculă” după ce prețurile sunt mascate, cel mult un „;”), zecimala cu punct înainte de %, ×, h, min, USDT, lei, minusul ASCII, „NaN/undefined/null/Infinity”, „!”, „opritor”, „Oprește botul / Ieși acum / opresc”, „vezi … / mai jos”, „s-a apropiat / a ajuns să”, avertizările comune, „ÎMPOTRIVA / SUB gridul / PESTE gridul”, titlul repetat în explicație sau acțiune.

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 2 scripts/proba-v10061.mjs` (adaugă „garda prinde fiecare abatere” — 11 cazuri rele + 2 bune — și „textele pachetelor STRICTE trec”).
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10061.mjs` → eșuează (`scripts/garda-texte.mjs` nu există).
- [ ] **Pas 3 — codul:** `cp $A/garda-texte.mjs scripts/` (cu `STRICT = new Set([])`) și `$ED package.json $A/pagina.mjs s2_pkg` (`test:garda-texte`, `test:v10061` la coada lui `test`).
- [ ] **Pas 4 — trece + raportul de azi:** `node scripts/proba-v10061.mjs` → `PASS · 4/4`; `node scripts/garda-texte.mjs` → raportul (azi: 238 de texte, 105 cu abateri: semafor 56, cartele 32, consiliu 17) și `PASS` (nimic strict încă).
- [ ] **Pas 5 — inventarul „înainte” (cerut de spec):** `node scripts/garda-texte.mjs --inventar docs/superpowers/inventar-sfaturi/1-consilier-boti-inainte.md`.
- [ ] **Pas 6 — commit:** `npm test && git add scripts/garda-texte.mjs scripts/proba-v10061.mjs package.json docs/superpowers/inventar-sfaturi/1-consilier-boti-inainte.md && git commit -F <mesaj>` („feat(texte): garda textelor - sfaturile generate pe situatiile lui, verificate pe regulile din spec; inventarul de dinainte”).

### Sarcina 3: semaforul boților (`semnale-bot.js`, familia semaforului)

**Fișiere:** modifică `public/lib/semnale-bot.js` (18 înlocuiri, `$A/s3-semafor.mjs`), `scripts/garda-texte.mjs` (STRICT), `scripts/proba-v10061.mjs`, 4 probe vechi.

**Interfețe:**
- Consumă: `TextRo.*` (sarcina 1).
- Produce (câmpuri NOI, logica neatinsă): componentele semaforului și verdictul au `deCe` (explicația, ≤ 160); `mutaGridul(...)` întoarce și `deCe`, `sursa` (sursa profilului sau `null`); `btcAvertizare` întoarce și `r` (multiplul); `aglomerare` întoarce și `semne` (câte) și `dovezi` (lista lor); `iaProfit` întoarce și `total`, `proc`, `deCe` (`text` rămâne întreg — îl trimite Discord); `pasiCuBotul` întoarce `{faCe, deCe}` (era un șir; o folosește doar semaforul).
- Textele noi exacte sunt în `$A/s3-semafor.mjs` (tabelul de sus le arată pe cele principale). Ajutoarele `X`, `P`, `U`, `T`, `distPodea` trec prin `TextRo`; prețurile — prin `fmtPret` (se duce „28.5000”, vine „28.5”).

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 3 scripts/proba-v10061.mjs` (lichidarea pe exemplul din spec, „mută gridul” cu „de ce” + sursă, RF1 „ținta” din plan) și în `scripts/garda-texte.mjs`: `export const STRICT = new Set(["semafor"]);`.
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10061.mjs` → 3 PICĂ (lichidarea, „mută gridul”, garda strictă; RF1 trece și înainte — e o gardă care ține „ținta” în motiv); `node scripts/garda-texte.mjs` → PICĂ, 56 de abateri pe „semafor”.
- [ ] **Pas 3 — codul:** `$ED public/lib/semnale-bot.js $A/s3-semafor.mjs` · `node --check public/lib/semnale-bot.js`.
- [ ] **Pas 4 — trec:** `node scripts/proba-v10061.mjs` → `PASS · 7/7`; `node scripts/garda-texte.mjs` → `STRICT semafor … 0 cu abateri`.
- [ ] **Pas 5 — testele vechi aduse la textul nou** (același fapt, altă formulare — lista exactă e în `$A/teste-vechi.mjs`):
  ```bash
  $ED scripts/cu-botul-v963.mjs $A/teste-vechi.mjs s3_cuBotul   # 7: „lucrează pentru tine” -> „: 2,1× față de obișnuit”; opritorul -> stopul; 28.5000 -> 28.5; distanța la margine și „Cu 1,5% loc de respirație” trec din faCe în deCe; „Încasează acum…” -> „Aș închide botul pe plus acum…”
  $ED scripts/semnale-v82.mjs $A/teste-vechi.mjs s3_semnale    # „+3.00 USDT” -> „+3,00 USDT”
  $ED scripts/proba-v10045.mjs $A/teste-vechi.mjs s3_v10045     # 3: sursa profilului în m.sursa, „Prag fix” și frecvența în m.deCe
  $ED scripts/proba-v10060.mjs $A/teste-vechi.mjs s3_v10060     # 4: „nimic de făcut” -> „N-aș face nimic acum”; „s-a apropiat” -> „se apropie”; „N-aș mai lăsa poziția să crească” -> „N-aș mări poziția”; „lichidarea e la 12” -> „lichidarea la 12,4%”
  ```
- [ ] **Pas 6 — suita:** `npm test` → verde.
- [ ] **Pas 7 — commit:** `npm test && git add public/lib/semnale-bot.js scripts/garda-texte.mjs scripts/proba-v10061.mjs scripts/cu-botul-v963.mjs scripts/semnale-v82.mjs scripts/proba-v10045.mjs scripts/proba-v10060.mjs && git commit -F <mesaj>` („feat(texte): semaforul botilor concis - titlul cu cifra, o actiune la persoana I, de ce separat (garda: semafor strict)”).

### Sarcina 4: cartelele „Acum, concret” (`semnale-bot.js`) și pagina lor

**Fișiere:** modifică `public/lib/semnale-bot.js` (15 înlocuiri, `$A/s4-cartele.mjs`), `public/app.js` (randarea cartelei), `public/app.css`, `scripts/garda-texte.mjs`, `scripts/proba-v10061.mjs`, 5 probe vechi.

**Interfețe:**
- Produce: cartela Stopul are în plus `deCe` (de ce, ≤ 160), `sursa` („Stopul propus: …”, înainte lipit de acțiune) și `atins` (cât costă stopul atins, număr — îl folosește Consilierul); `act` e un singur rând ≤ 110 (acțiunea la persoana I sau faptul); `text` (detaliile) păstrează tot. Etichetele „pune-l la zero” / „mută-l la zero” devin „de pus la zero” / „de mutat la zero”. Rândul Gridul: „6 grile la 2,8% pas · 5 umpleri în 24 h (+0,90 USDT) · propus: 47 grile la 0,3% pas.” (intervalul propus rămâne în detalii). Rândul de bani: „opritorul” → „stopul”, cu virgula.
- Pagina: sub acțiunea cartelei, `<p class="tbSub tbCcDeCe">` și `<p class="tbSub tbCcSursa">`; CSS `.tbCcDeCe,.tbCcSursa{margin:4px 0 0;font-size:12.5px}`.

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 4 scripts/proba-v10061.mjs` (LIGHTER: acțiunea și costul într-un rând, de ce separat; pagina arată „de ce” și sursa) și `STRICT = new Set(["semafor", "cartele"])`.
- [ ] **Pas 2 — vezi-le picând:** `node scripts/proba-v10061.mjs` → 3 PICĂ (cartela LIGHTER, pagina, garda strictă); garda → PICĂ, 31 de abateri pe „cartele” (32 înainte de sarcina 3; una a reparat-o deja `U` prin `TextRo`).
- [ ] **Pas 3 — codul:**
  ```bash
  $ED public/lib/semnale-bot.js $A/s4-cartele.mjs && node --check public/lib/semnale-bot.js
  $ED public/app.js $A/pagina.mjs s4_app && $ED public/app.css $A/pagina.mjs s4_css && node --check public/app.js
  ```
- [ ] **Pas 4 — trec:** proba v100.61 → `PASS · 9/9`; garda → `STRICT cartele … 0 cu abateri`.
- [ ] **Pas 5 — testele vechi:**
  ```bash
  $ED scripts/proba-v1018.mjs $A/teste-vechi.mjs s4_v1018     # „planul tău zice −15,7” trece din act în deCe
  $ED scripts/proba-v10043.mjs $A/teste-vechi.mjs s4_v10043   # „mută-l la 0.3842” -> „Aș muta stopul la 0.3842”; „cu opritorul de acum” -> „cu stopul de acum”
  $ED scripts/proba-v10045.mjs $A/teste-vechi.mjs s4_v10045   # sursa stopului: din act în st.sursa
  $ED scripts/proba-v99.mjs $A/teste-vechi.mjs s4_v99         # „SUB gridul” -> „sub gridul”
  $ED scripts/proba-v100.mjs $A/teste-vechi.mjs s4_v100       # „pune-l” / „Pune-l la” -> „de pus la zero” / „Aș pune stopul la”
  ```
- [ ] **Pas 6 — suita:** `npm test` → verde.
- [ ] **Pas 7 — commit:** `npm test && git add public/lib/semnale-bot.js public/app.js public/app.css scripts/garda-texte.mjs scripts/proba-v10061.mjs scripts/proba-v1018.mjs scripts/proba-v10043.mjs scripts/proba-v10045.mjs scripts/proba-v99.mjs scripts/proba-v100.mjs && git commit -F <mesaj>` („feat(texte): cartelele Acum, concret - un rand de actiune, de ce si sursa stopului pe randurile lor (garda: cartele strict)”).

### Sarcina 5: Consilierul (`consiliu.js`) și pagina lui

**Fișiere:** modifică `public/lib/consiliu.js` (15 înlocuiri, `$A/s5-consiliu.mjs`), `public/app.js` (`tbConsHtml`), `public/app.css`, `scripts/garda-texte.mjs`, `scripts/proba-v10061.mjs`, 2 probe vechi.

**Interfețe:**
- Consumă: `deCe` / `sursa` ale semaforului (sarcina 3), `deCe` / `atins` ale cartelei Stopul (sarcina 4).
- Produce: `Consiliu.alcatuieste(...)` întoarce în plus `explica` (de ce-ul acțiunii, doar când nu e deja textul unui motiv de dedesubt: verdictul semaforului fără motive, stopul lăsat pe loc) și `motive[i].scurt`; textul unui motiv al semaforului = `deCe`-ul lui, `extra` = sursa profilului. Titlul: două motive doar dacă „X, iar Y” ≤ 60, altfel primul. Motivul Stopului: „Stopul e peste plan: atins, ≈ −63 USDT” / „Botul n-are stop activ în Pionex”, textul = `deCe` (o fixtură veche fără `deCe` → acțiunea). „N-aș pune bani în plus cât stă lângă margine” intră în aceeași frază dacă nu e deja spus și încape (≤ 110), altfel în `explica`. Banii au unitatea („−63,5 USDT cu stopul de acum”). `Consiliu.LEGENDA` (nou): avertizările comune, o dată. Discord (`schimbare`): titlul „MONEDA · Atenție: titlul” ≤ 60 (rezerva: motivul de sus pe scurt, apoi tăiat la cuvânt cu „…”), mesajul „👉 acțiunea · 💰 banii” + „\nDe ce: …”.
- Pagina: `<p class="tbSub tbConsExplica">` sub „Ce aș face eu”; `<p class="tbSub tbConsLeg">` cu `Consiliu.LEGENDA` sub Consilier; CSS `.tbConsExplica{font-size:13px}` și `.tbConsLeg{margin:10px 2px 0;font-size:12px;line-height:1.45}`.

- [ ] **Pas 1 — testele întâi:** `node $A/sectiuni.mjs 5 scripts/proba-v10061.mjs` (LIGHTER: Consilierul cu o acțiune și „de ce”; RF2; RF5; pagina + legenda + pachetul întreg strict) și `STRICT = new Set(["semafor", "cartele", "consiliu"])`.
- [ ] **Pas 2 — vezi-le picând:** proba v100.61 → 5 PICĂ (Consilierul pe LIGHTER, RF2, RF5, pagina + pachetul strict, garda strictă); garda → PICĂ, 8 abateri pe „consiliu” (17 înainte de sarcinile 3–4: restul veneau din textele semaforului).
- [ ] **Pas 3 — codul:**
  ```bash
  $ED public/lib/consiliu.js $A/s5-consiliu.mjs && node --check public/lib/consiliu.js
  $ED public/app.js $A/pagina.mjs s5_app && $ED public/app.css $A/pagina.mjs s5_css && node --check public/app.js
  ```
- [ ] **Pas 4 — trec:** proba v100.61 → `PASS · 13/13`; garda → `PASS · pachetele stricte (semafor, cartele, consiliu) fără abateri`.
- [ ] **Pas 5 — testele vechi:**
  ```bash
  $ED scripts/proba-v10044.mjs $A/teste-vechi.mjs s5_v10044   # titlul CRV: „Stopul costă peste plan, iar prețul e lângă marginea de jos”; „71% din zile” și „(0.3842)” trec în c.explica
  $ED scripts/proba-v10050.mjs $A/teste-vechi.mjs s5_v10050   # Discord: „CRV: Consilierul — 🟡 Atenție” -> „CRV · Atenție: ” (≤ 60); „Ce aș face eu:” -> „👉 ” și ≤ 2 rânduri
  ```
- [ ] **Pas 6 — suita:** `npm test` → verde.
- [ ] **Pas 7 — commit:** `npm test && git add public/lib/consiliu.js public/app.js public/app.css scripts/garda-texte.mjs scripts/proba-v10061.mjs scripts/proba-v10044.mjs scripts/proba-v10050.mjs && git commit -F <mesaj>` („feat(texte): Consilierul concis - titlul ≤ 60, o actiune, de ce separat, legenda comuna, Discord pe 2 randuri (garda: consiliu strict)”).

### Sarcina 6: versiunea, inventarul „după”, verificarea pe ecran, colectorul, revizia, livrarea

**Fișiere:** `BUILD_INFO.json`, `functions/_shared/versiune.js`, `package.json`, `public/sw.js`, `public/index.html`, `scripts/colector.mjs` (versiuni), `scripts/proba-ecran-t212.mjs` (o poză a Tabloului la 1920), `docs/superpowers/inventar-sfaturi/1-consilier-boti-dupa.md`, memoria.

- [ ] **Pas 1 — versiunile** (v100.61 · colectorul v101.41):
  ```bash
  $ED BUILD_INFO.json $A/versiuni.mjs build && $ED functions/_shared/versiune.js $A/versiuni.mjs versiune && $ED package.json $A/versiuni.mjs pkg
  $ED public/sw.js $A/versiuni.mjs sw && $ED public/index.html $A/versiuni.mjs html && $ED scripts/colector.mjs $A/versiuni.mjs colector
  ```
- [ ] **Pas 2 — inventarul „după” + harta informațiilor:** `node scripts/garda-texte.mjs --inventar docs/superpowers/inventar-sfaturi/1-consilier-boti-dupa.md`, apoi în același fișier, deasupra tabelului, harta „informația de înainte → unde e acum” (secțiunea „Inventarul” de mai jos, copiată și verificată pe textele generate).
- [ ] **Pas 3 — suita întreagă:** `npm test` → verde (inclusiv `test:garda-texte` strict și `test:v10061`).
- [ ] **Pas 4 — colectorul repornit** (încarcă `text-ro.js`; fără repornire Discord și pagina alerts rămân pe textele vechi), din PowerShell:
  ```powershell
  cd C:\Users\Cimin\crypto; $id = [int]((Get-Content data\colector.pid) -split ' ')[0]; Stop-Process -Id $id -Confirm:$false; Start-Sleep -Seconds 2; Start-Process -FilePath 'node' -ArgumentList 'scripts\colector.mjs' -WorkingDirectory 'C:\Users\Cimin\crypto' -WindowStyle Hidden; Start-Sleep -Seconds 15; Get-Content data\colector.log -Tail 3
  ```
  Dovada că a PORNIT: PID nou în `data\colector.pid`, jurnalul are rânduri noi după repornire, fără `ReferenceError`, iar poza următoare (pagina alerts) poartă `versiune: v101.41`; după 5 minute, o tură întreagă fără eroare.
- [ ] **Pas 5 — pe ecran:** `$ED scripts/proba-ecran-t212.mjs $A/versiuni.mjs ecran` (în testul „monitor 1920 · Tabloul botului” se adaugă o poză a Consilierului: `tablou-lat.png`, la lățimea LUI). Rulează `node scripts/proba-ecran-grid.mjs` (Tabloul la 1440 și 390) și `node scripts/proba-ecran-t212.mjs` (Tabloul la 1920) — toate verzi; mă uit pe poze: titlul Consilierului, „Ce aș face eu” + „de ce”, legenda, cartela Stopul cu „de ce” și sursa — nimic tăiat, nimic suprapus, la 390 px încape.
- [ ] **Pas 6 — revizia Opus** (subagent Opus, cu specul, planul și diff-ul `git diff <primul commit al pachetului>^..HEAD`): regulile din spec pe toate textele, inventarul (nimic pierdut), logica neatinsă (pragurile, nivelurile, ordinea). Repar ce găsește (fiecare reparație cu testul ei văzut picând), apoi din nou `npm test`.
- [ ] **Pas 7 — livrarea:** `npm test && git add BUILD_INFO.json functions/_shared/versiune.js package.json public/sw.js public/index.html scripts/colector.mjs scripts/proba-ecran-t212.mjs docs/superpowers/inventar-sfaturi/1-consilier-boti-dupa.md && git commit -F <mesaj> && git push` („feat(texte): v100.61 - sfaturile concise, pachetul 1 (Consilierul botilor) · colector v101.41”). Fără `git pull`.
- [ ] **Pas 8 — memoria:** rândul pachetului 1 în `project_crypto_radar_audit_30_09.md`, `index_pine.md`, `MEMORY.md` (commit-urile, ce a rămas pentru pachetele 2–5).

---

## Inventarul: ce informație unde ajunge (nu se pierde nimic)

| Sfatul (înainte) | Informația | După |
|---|---|---|
| Lichidarea depășită | depășită, cu cât (3,4%) | titlu |
| | verifici în Pionex, închizi ce a rămas | acțiune |
| | poate fi deja lichidată / la limită | de ce |
| Lichidarea < 8% | distanța | titlu |
| | marjă sau închizi | acțiune |
| | „sub 8% nu mai e loc de răbdare” | de ce |
| Lichidarea 8–15%, se îndepărtează | distanța, direcția, valoarea de acum 1 h | titlu |
| | nimic de făcut; fără poziție nouă sub 15% | acțiunea slabă (când nu e alta) |
| Lichidarea 8–15%, se apropie / fără istoric | distanța (+ direcția, valoarea de acum 1 h) | titlu |
| | nu mări poziția; marja | acțiune („dacă scade sub 8%, aș adăuga marjă” — forma din spec) |
| | calculatorul „Dacă adaug marjă” | de ce |
| Planul pe minus | pragul | titlu |
| | ieși, cum ai hotărât la rece | acțiune („Aș închide botul…”) |
| Planul pe plus | ținta (cuvântul „ținta” rămâne — `podeaPeBani`) | titlu |
| | încasezi / muți ținta mai sus, conștient | acțiune |
| | piața încă merge cu botul; să nu treacă neobservată | de ce |
| Planul: afară din grid | pragul de ore | titlu |
| | închizi și pornești unul nou din fișă, pe unde e prețul | acțiune |
| Trend contra | direcția, tăria | titlu |
| | fără bani; dacă se întărește, închizi lângă zero și pornești pe trend | acțiune |
| Mișcare mare | multiplul, contra | titlu |
| | fără bani, îl lași cât lichidarea e departe | acțiune |
| Ia profit | momentul, totalul, procentul | titlu (+ `iaProfit.text` întreg pentru Discord) |
| | închizi pe plus, repornești la 🟢 | acțiune |
| | cauza, greșeala nr. 1 din jurnal | de ce |
| Mută gridul (margine) | marginea, distanța, poziția în interval | titlu |
| | frecvența în 12 h, pragul, plafonul / „1 din 4” | de ce |
| | sursa profilului | rândul de sub motiv (`extra`) |
| | închizi și pornești cu setările propuse | acțiune („…din cartela Gridul” — chiar sub Consilier) |
| Mută gridul (afară) | orele afară | titlu („5,3 h”) |
| Costuri | costurile peste grile | titlu (+ cifra nouă: net/zi) |
| | levier mai mic / grile mai rare la următorul | acțiune |
| BTC | BTC în mișcare, moneda încă nu | titlu (+ multiplul) |
| | fără bani până se vede direcția | acțiune („Aș fi pregătit:” — umplutură, scoasă) |
| | altcoinii urmează des BTC | de ce |
| Aglomerare | mulțimea înghesuită pe partea botului | titlu (+ câte semne) |
| | marjă în plus sau o parte închisă | acțiune |
| | funding, OI, long/short, riscul de curățare | de ce |
| Ținta la adăpost | ținta atinsă, la adăpost | titlu |
| | stopul și cât păstrează | acțiune |
| | o întoarcere te scoate cu ≥ ținta; Discord când merită urcat; stopul care urcă | de ce |
| Ținta de păstrat | ținta atinsă — păstreaz-o | titlu |
| | podeaua, distanța, totalul exact după comision | acțiune |
| | aproape / loc de respirație; stopul care urcă; câștigul nu se mai pierde | de ce |
| | „prețul se recalculează la fiecare umplere” | legenda |
| Fără fișă | încă socotesc fișa | titlu |
| | nu mă mișc până e gata | acțiune |
| | ce vine din fișă; lichidarea și planul se văd și fără ea | de ce |
| Mișcarea e cu botul | multiplul | titlu („lucrează pentru tine” = verdictul 🟢 ȚINE, nu se mai repetă) |
| | fără bani; stopul la zero / deja dincolo / după margine încasezi sau pornești din fișă | acțiune (cea care se aplică acum) |
| | grilele încasează, poziția scade; distanța la margine; după ea botul rămâne fără poziție | de ce |
| | „riscul e la întoarcere: gridul cumpără înapoi la fiecare grilă” | legenda |
| Cartela Stopul | acțiunea, prețul, procentul din investiție, costul atins, planul | rândul (act) + de ce |
| | „pe minus, zero-ul nu e un stop” | de ce |
| | sursa stopului propus | rândul ei (`sursa`) + detalii |
| | „În Pionex: botul → Edit → Stop loss price” | detalii (neschimbat) |
| Cartela Gridul | geometria, umplerile, propunerea | rândul; intervalul propus „între X și Y” → detalii + setările de copiat |
| Cartela Mișcarea | multiplul, acțiunea | rândul; detaliile întregi |
| Consilierul, stopul lăsat pe loc | stopul, planul nou | acțiune |
| | prețul planului, frecvența | `explica` (sub acțiune) |
| Consilierul, „n-aș pune bani lângă margine” | — | în aceeași frază dacă încape, altfel `explica` |
| Perechile | real, așteptat | titlu |
| | fereastra, procentul, „corectat după boții tăi”, costurile | de ce |
| | „o frecvență din trecut, nu o promisiune” | legenda |
| Deciziile tale | urmat / neurmat, mediane | text |
| | „o comparație, nu o dovadă” | legenda |
| Discord, Consilierul | moneda, verdictul, titlul (sau motivul de sus pe scurt), acțiunea, banii, de ce s-a schimbat | titlu ≤ 60 + 2 rânduri; titlul întreg rămâne în Radar |
| „Altă voce” | Discord/alerts zice altceva; colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute | același text, mai scurt |

## Ce NU face pachetul 1 (rămâne pentru 2–5)

- `sfaturi.js`, `tablou-extra.js`, `scenariu.js` (pachetul 2): titlul „Până la marginea de jos (0.3841) sunt 1.7%” și textele lui au încă punctul zecimal; Consilierul îl rescrie deja cu virgulă la titlu (`titluMargine`), iar textul îl arată cum vine. Motivul verde „Piața e liniștită…” vine tot de acolo.
- `alerte.js` și mesajele colectorului (pachetul 3): titlurile „s-*” de pe Discord se scurtează deja (iau motivele noi), dar formatul lor rămâne până la pachetul 3.
- Acțiunile T212 (pachetul 4) și Acasă / rapoarte / fișa (pachetul 5) — neatinse; `Consiliu.schimbare` (Discord) e comun, deci și mesajul Consilierului pe o acțiune trece pe noul format (titlu ≤ 60, 2 rânduri).
- **Abatere de la spec, spusă pe față:** colectorul se schimbă deja la pachetul 1 (încarcă `text-ro.js`), deci primește versiunea v101.41 acum, nu abia la pachetul 3.

## Execuția

Ca la planurile de până acum: **native** (eu, sarcină cu sarcină, în ordinea de mai sus), cu revizia Opus pe tot la final (sarcina 6, pasul 6).

Skill-urile chemate la execuție (regula lui): `superpowers:executing-plans` (ordinea și punctele de oprire) · `superpowers:test-driven-development` (fiecare sarcină: proba pică întâi) · `trading-code-craft` (IMPROVE pe Crypto Radar: versiunea dublă, push-ul) · `frontend-design` (cele trei rânduri noi de pe ecran și legenda — judecate pe poză, la 1920 și 390) · `superpowers:verification-before-completion` (suita, garda, colectorul pornit, pozele — înainte de „gata”) · `superpowers:requesting-code-review` (revizia Opus). `backtest-expert` nu intră: pachetul nu atinge nicio statistică, doar textul ei.
