# Sfaturile concise — pachetul 4: acțiunile T212 — plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Pașii au căsuțe `- [ ]`.

**Goal:** textele sfaturilor pe acțiuni (semaforul poziției, poarta de cumpărare, portofoliul, situațiile asemănătoare, greșelile, alertele planului și frâna, raportul săptămânii, stopul care urcă), ale consilierului (`consilier.js`: piața, sfaturile pe poziție și pe bot, rezumatul de dimineață, socoteala), ale ecranului T212 (`t212-ecran.js`: Consilierul, poarta, ideile, „Ce aș face eu” din jurnal) și rândurile 🎲 (`probabilitati.js`) — după regulile specului.

**De ce fără aprobarea planului:** el (02.10): „FA TOT”.

**Architecture:** ca la pachetul 3 — întâi garda generează textele (grupul nou `actiuni`, `scripts/lib/garda-actiuni.mjs`), inventarul „înainte”, apoi rescrierea modul cu modul; `t212-ecran.js` (HTML, are nevoie de DOM) se verifică prin sursă (fără „Ce aș face eu:” urmat de forme fără „Aș”) și prin proba de ecran T212.

**Spec:** `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` (pachetul 4).

## Global Constraints
- „Ce aș face eu” = o acțiune la persoana I („Aș …”, „N-aș …”, „L-aș / M-aș …”), ≤ 110; explicația o frază ≤ 160; titlul ≤ 60.
- Câmpul `ceAsFace` al semaforului / portofoliului rămâne „👉 Ce aș face eu: …” (eticheta o taie `consiliu.js`, lista „Ce ai de făcut” și poza; pe ecran e convenția din tot softul: eticheta + „Aș …”), iar acțiunea de după etichetă e la persoana I, cu majusculă, ≤ 110.
- Prețurile acțiunilor ca pe pagina T212 (`t212Usd`): „$29.50”; sumele în dolari cu virgulă: „+12,34 $”.
- Consilierul poziției (`Consiliu.alcatuiesteActiune`) intră în pachet (titlul compus ≤ 60 ca la boți, acțiunile la persoana I); legenda (`Consiliu.LEGENDA`) o dată, sub Consilierul poziției.
- Frecvențele: n și k la vedere; „(puține cazuri)” în loc de „un semn, nu o regulă” (avertizarea generală e în legendă); intervalul de încredere și calibrarea rămân; „1 caz”, nu „1 cazuri”.
- Virgulă zecimală la procente și sume; prețurile acțiunilor cu „$” și punct (ca în Trading 212).
- Vocabular: „stopul”, „ținta”, „planul”; fără „NU”, „ACUM” cu majuscule în text (etichetele poarții 🟢/🟡/🔴 rămân).
- NU se schimbă: pragurile (20% plafon, −15% stopul care urcă, 30 de trade-uri, 0,30% conversia), nivelurile, cheile alertelor, ordinea.

## Review Focus
1. Alertele planului pe acțiuni (Discord): titlul ≤ 60, 2 rânduri (faptul · „👉 ” acțiunea), aceeași formă ca la pachetul 3.
2. Rezumatul de dimineață (Discord, pe rânduri): fiecare rând ≤ 160, fără „1 cazuri”.
3. Ecranul T212 la 1920 și 390 (Consilierul pe o poziție IEȘI, poarta, ideile) — fără texte rupte sau dublate.
4. Probele vechi care fixau textele (`actiuni-v85`, `consilier-v89`, `proba-v1005x`, `proba-ecran-t212`) — aduse la textele noi, fiecare schimbare notată.
5. Rândurile 🎲 pe eșantioane mici (n < 10, n < 20) și calibrarea „lichidare-7” (cifra brută păstrată).

### Task 1: garda pe textele acțiunilor + inventarul „înainte”
### Task 2: `actiuni-semnale.js`
### Task 3: `consilier.js`
### Task 4: `probabilitati.js` (rândurile 🎲)
### Task 5: `t212-ecran.js`
### Task 6: garda `actiuni` pe STRICT, inventarul „după”, versiunea, poze, push, revizia Opus
