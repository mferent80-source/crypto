# Sfaturile concise — pachetul 5: Acasă, rapoartele, fișa — plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Pașii au căsuțe `- [ ]`.

**Goal:** textele de pe Acasă (`public/lib/acasa.js`: vremea, frica/lăcomia, lățimea, legătura BTC–bursă, calendarul, funding-ul pieței, socoteala alertelor, raportul săptămânii pieței), din obiceiuri (`public/lib/obiceiuri.js`: istoricul monedei, prima oră, frâna, raportul de duminică, autopsia, regulile tale, poarta de pornire), din fișă (`public/lib/grid-proba.js`: motivele gridului îngust, verdictul fișei) și textele fișei din `public/app.js` — după regulile specului.

**De ce fără aprobarea planului:** el (02.10): „FA TOT”.

**Architecture:** ca la pachetele 3–4 — garda generează textele cu modulele REALE (grupul nou `acasa`, `scripts/lib/garda-acasa.mjs`; fără texte de bază inventate — lecția reviziei pachetului 3), inventarul „înainte”, rescrierea modul cu modul, probele vechi aduse la textul nou; `app.js` (DOM) se verifică prin sursă și prin poze.

**Spec:** `docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md` (pachetul 5).

## Global Constraints
- „Ce aș face eu” = o acțiune la persoana I, ≤ 110; explicația o frază ≤ 160; titlul ≤ 60; rapoartele (Discord) — rânduri ≤ 160, o idee pe rând.
- Sumele în USDT cu virgulă și minus tipografic (`TextRo.usdt` / aceeași formă): „−52,50 USDT”, nu „−52.50 USDT”.
- Fără majuscule de strigat în text („DOVEDIT”, „NU PORNI”, „LICHIDAT”); etichetele verdictului (🟢/🟡/🔴) rămân etichete.
- „(puține cazuri)” acolo unde e cazul; avertizarea comună o singură dată, în legendă.
- NU se schimbă: pragurile frânei (zi/7 zile/la rând), pragurile gridului îngust, verdictele fișei, ordinea și cheile.

## Review Focus
1. Raportul de duminică și raportul săptămânii pieței (Discord): fiecare rând ≤ 160, „👉 Ce aș face eu” cu o acțiune (nu două lipite), sumele cu virgulă.
2. Istoricul monedei și prima oră (intră și în avertizarea la pornire, pachetul 3) — aceleași cifre, cu virgulă.
3. Fișa gridului pe ecran (1920 și 390): verdictul, motivele, gridul îngust, rândul probei („LICHIDAT” → fără strigat).
4. Probele vechi care fixau textele (`acasa-v92/93/95`, `obiceiuri-*`, `grid-*`, `proba-v1004x`) — aduse la textele noi, fiecare schimbare notată.
5. Textele pe care alte module le parsează (ex. `Obiceiuri.frana().text` — acum colectorul ia obiectul; poarta de pornire, „PORNEȘTE”).

### Task 1: garda „acasa” (producătorii reali) + inventarul „înainte”
### Task 2: `obiceiuri.js`
### Task 3: `acasa.js`
### Task 4: `grid-proba.js`
### Task 5: textele fișei din `app.js`
### Task 6: garda `acasa` pe STRICT, inventarul „după”, versiunea, poze (Acasă, fișa — 1920 + 390), push, revizia Opus
