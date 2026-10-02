# Sfaturile concise — pachetul 3: alertele și Discord — plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Pașii au căsuțe `- [ ]`.

**Goal:** textele alertelor (Discord, pagina alerts, „Ce ai de făcut acum”, sfatul „pericol”) scrise după regulile specului: titlul = faptul + cifra ≤ 60; mesajul = 2 rânduri (faptul cu cifra · „👉 Aș …”); rapoartele (fișa de închidere, mediul boților, raportul de duminică) cu rânduri concise.

**De ce fără aprobarea planului:** el (02.10): „FA TOT” — execuție inline pe loc.

**Architecture:** (1) garda generează TOATE alertele, pe ramuri (fixturi), înainte de rescriere — inventarul „înainte”; mesajele compuse în colector trec întâi NESCHIMBATE într-un modul pur (`scripts/lib/mesaje-colector.mjs`), ca garda să le poată genera; (2) rescrierea, modul cu modul, cu garda pe grupul `alerte` trecut pe STRICT la final; (3) o regulă = o voce: acțiunea de pe rândul 2 al alertei e aceeași cu a semaforului / sfatului pentru același fapt.

**Spec:** `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` (pachetul 3; regula 8 — Discord: titlul ≤ 60, mesajul ≤ 2 rânduri, faptul cu cifra + acțiunea).

## Global Constraints
- Titlul alertei ≤ 60, fără majuscule de strigat („DEPĂȘITĂ”, „CU”, „STINS”, „IEȘI” — valorile Pionex rămân cum vin), fără „s-a apropiat”, „a ajuns să”, fără „!”.
- Mesajul alertei: rândul 1 = faptul cu cifra (o frază, ≤ 160); rândul 2 (dacă are acțiune) = „👉 ” + o acțiune la persoana I (≤ 110). Virgulă zecimală la procente și sume; prețurile cu zecimalele lor (sub 0,01: 4 cifre semnificative).
- Vocabular unic: „stopul” (nu „opritorul”), „închide botul”, „adaugă marjă”, „pornește unul nou din fișă”, „marginea de jos / de sus”, „planul”.
- Rapoartele (pe mai multe rânduri): fiecare rând ≤ 160, o frază, aceleași reguli de cifre și vocabular.
- NU se schimbă: pragurile, nivelurile, cheile, ritmul de repetare, ce alertă pleacă pe Discord și ce rămâne în Radar.
- Cuvinte de care depinde codul, păstrate: „n-are plan” (filtrul din „Ce ai de făcut acum”), „nu mai poate citi” / „citește din nou” (alerta rezolvată a colectorului), „lichidarea la”, „a ieșit din grid”, „mișcare mare … contra botului” (unirea rândurilor).
- Sfatul „pericol” ia din alertă doar faptul (rândul 1); acțiunea lui rămâne a semaforului.
- Nicio informație nu se pierde: inventar înainte → după, fiecare rând cu informația lui; avertizările generale („nu o prognoză”, „nu un semnal dovedit”) se scurtează la marcajul lor, nu dispar acolo unde poartă o informație proprie (pragul de 2× ATR e o ipoteză).

## Review Focus
1. Unirea rândurilor din „Ce ai de făcut acum” cu titlurile NOI generate de `Alerte.reguli` (lichidarea, prețul ieșit din grid, mișcarea contra / neutră) — un rând, nu două.
2. Sfatul „pericol” (titlul și textul din alertă): fără acțiunea dublată, garda strictă pe el.
3. Mesajele vechi din coada Discord / istoricul KV (texte vechi) — afișarea nu se strică.
4. Alertele cu date lipsă (prețul de lichidare null, planul fără prag, stopul în procente) — fără „null”, „?”, „undefined”.
5. Monedele sub 0,01 și prețurile BTC în titluri — ≤ 60.

---

### Task 1: garda pe toate alertele + mesajele colectorului într-un modul pur (texte neschimbate) + inventarul „înainte”
**Files:** Create `scripts/lib/mesaje-colector.mjs`, `scripts/lib/garda-alerte.mjs`; Modify `scripts/colector.mjs` (cheamă modulul), `scripts/garda-texte.mjs` (grupul `alerte`: toate ramurile, tipurile „alertaTitlu” / „alertaMesaj” / „raport”); Test: `scripts/proba-v10066.mjs`; Inventar: `docs/superpowers/inventar-sfaturi/3-alerte-inainte.md`.
- [ ] Testele (ROȘU): modulul `mesaje-colector.mjs` există și colectorul nu mai scrie mesajele pe loc; garda generează ≥ 70 de texte în grupul `alerte`, din toate funcțiile (`reguli` pe fiecare cheie, `grila`, `podeaUrca`, `preturi`, `raportBoti`, `miscareNeobisnuita`, `schimbareVreme`, `fisaInchidere`, `alerteSimboluri`, `alerteSLTP`, `avertizariPornire`, mesajele colectorului); textele mesajelor mutate sunt IDENTICE cu cele de dinainte.
- [ ] Mutarea + generatorul; inventarul „înainte” (raport: câte abateri).

### Task 2: `Alerte.reguli` — titlurile și mesajele pe 2 rânduri, o singură voce cu semaforul
**Files:** `public/lib/alerte.js`, `public/lib/sfaturi.js` (pericol: textul = faptul)
- [ ] Testele: garda strictă pe `reguli`; unirea în „Ce ai de făcut acum” cu alertele generate (lichidarea 6% și 12,4%, prețul ieșit din grid, mișcarea contra și neutră) = un rând; sfatul „pericol” fără „👉”.
- [ ] Rescrierea.

### Task 3: restul `alerte.js` — grila, stopul care urcă, prețurile, mediul boților, mișcarea neobișnuită, vremea pieței; `pret()` cu 4 cifre semnificative sub 0,01

### Task 4: mesajele colectorului, avertizarea la pornire, alertele simbolurilor și SL/TP

### Task 5: fișa de închidere (`TabloExtra.fisaInchidere`)

### Task 6: garda `alerte` pe STRICT, inventarul „după”, v100.66 / colector v101.45, poze, push, revizia Opus
