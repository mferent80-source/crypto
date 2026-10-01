# Acțiunile Trading 212 — profil, probabilități, o singură voce (design)

**Data:** 01.10.2026 · **Cerut de el:** „adaptat… partea de sfaturi, probabilități, măsurători etc” pe acțiunile T212; „c” (întâi ieșirea, apoi intrarea); „da” pe varianta „același motor cu adaptor pentru acțiuni”; „da” pe design.
**Înrudit:** `2026-10-01-consiliere-personalizata-design.md` (creierul pentru boții crypto, pachetele 1–4, v100.45–v100.51).

## Ce vrea el (și ce am presupus)

- **El:** pe pozițiile T212, același „creier” ca la boți — cifre pe felul FIECĂREI acțiuni, „cât de des s-a întâmplat” cu numărul de cazuri, un singur verdict cu „ce aș face eu” și „de ce”, socotit pe trade-urile lui; întâi IEȘIREA din pozițiile pe care le are, apoi INTRAREA.
- **Presupus (nespus):** doar long; lei/dolari ca acum; alertele de preț, Scan și partea crypto nu se schimbă.
- **Datele lui (măsurate 01.10):** 1.066 trade-uri închise (09.2025–09.2026), 352 de acțiuni (cele mai multe: INTC 33, AMD 29, TSLA 24), 12 poziții deschise, 57% pe plus, durata P25/P50/P75 = 2,2 / 26 / 173 h.
- **Datele pieței:** bare zilnice pe 2 ani (Yahoo; Twelve Data 500 de bare când e cheia), bare de 1 h doar 60 de zile, calendarul rezultatelor prin Twelve Data (`/api/stocks?action=earnings`).

## Arhitectura: același motor, adaptor de piață

Modulele pure ale creierului (`profil-moneda.js`, `probabilitati.js`, `consiliu.js`, autopsia din `obiceiuri.js`) primesc o setare de piață `piata: "crypto" | "actiuni"`:

| | crypto (azi) | acțiuni (nou) |
|---|---|---|
| bare | 1 h (profil), 15M (probă) | zilnice, doar zilele de bursă (`GridCalcul.bareBursa`) |
| ferestre | 12 h / 24 h | 1 zi / 5 zile de bursă (din durata trade-urilor LUI: P50 ≈ 26 h, P75 ≈ 7 zile) |
| săritura | — | săritura la deschidere (deschiderea vs închiderea de ieri) — distribuție SEPARATĂ; zilele de rezultate aparte |
| direcția | long / short / neutru | doar long |
| bani | USDT | lei / dolari (ca pagina T212) |

Probele crypto existente (`proba-v10045…v10051`) păzesc ca adaptorul să nu schimbe nimic pe crypto.

## Pachetele (în ordinea lui: ieșirea întâi)

### Pachetul 1 — Profilul acțiunii (fundația)
- Din 2 ani de bare zilnice: distribuția coborârii și a urcării pe 1 zi și pe 5 zile de bursă (21 de cuantile, ca la monede), plus distribuția săriturii la deschidere (în jos) și numărul de zile.
- Zilele de rezultate: din calendar (unde există), altfel cele mai mari 2% sărituri marcate „eveniment”; ies din distribuția obișnuită și se arată separat.
- Colectorul face profilurile noaptea, după închiderea bursei SUA, doar pentru pozițiile deschise + acțiunile din idei (Yahoo limitează cererile) → KV `profil:<TICKER>`; ruta existentă `action=profil`.
- Primul folos: stopul poziției (azi `minTrail: 0.15` fix în `ActiuniSemnale.niveluri`) devine „dincolo de coborârea obișnuită pe 5 zile (P75)”, cu sursa scrisă lângă el; fără profil — 15% ca acum.

### Pachetul 2 — Probabilitățile, pe ieșire
- Pe fiecare poziție: „atinge stopul înainte de țintă în 1 zi / 5 zile” (ținta = planul lui, altfel maximul de după cumpărare), „atinge stopul în 1 zi”, „deschiderea sare peste stop în Y% din zile” — frecvențe cu numărul de cazuri și intervalul Wilson pe ferestre care NU se suprapun.
- Condiționate pe starea de acum: trendul din `ActiuniSemnale.stare` (sus / lateral / jos) × mișcare / liniște; cădere exact → doar trend → toate, ca la crypto.
- „Rezultate în N zile” (N ≤ 5): avertisment separat cu săriturile de la rezultatele trecute ale acțiunii; nu se amestecă în cifra obișnuită.
- Calibrarea pe trade-urile lui: fiecare cumpărare = un caz (cifra prezisă atunci vs ce s-a întâmplat); cutii de calibrare pe TOATE acțiunile la un loc (pe una singură sunt prea puține — INTC are 33); unde cifra a mințit, o corectez și scriu „corectat după trade-urile tale”.

### Pachetul 3 — O singură voce pe poziție
- `Consiliu.alcatuieste` cu intrările acțiunii: semaforul existent, planul, nivelurile (stopul care urcă), probabilitățile, alertele planului → verdict, „ce aș face eu” cu banii în lei/dolari, cel mult 3 motive, restul pliat.
- Colectorul îl alcătuiește la fiecare tură T212 → poza (pagina alerts), KV `cons:t212-<TICKER>`, alerta la schimbare confirmată 2 ture, cu aceleași reguli contra dublurilor (alerta proprie activă, sfat tăcut, aceeași treaptă în 2 h ⇒ doar în Radar).
- Pagina T212 arată Consilierul poziției + „de ce s-a schimbat” + „am făcut / n-am făcut” (`decizii:t212-<TICKER>`, judecate la 5 zile de bursă).
- Socoteala sfaturilor la acțiuni (azi pe nivel, la 5/10/20 zile) trece pe MOTIV și pe BANI (lei); motivele de același nivel se ordonează după banii pe caz, de la 10 cazuri (siguranța — stopul, planul — rămâne prima).

### Pachetul 4 — Intrarea
- Poarta (`ActiuniSemnale.poarta`) și ideile primesc „în situații ca asta, din trade-urile tale: N cazuri, median X, 68% pe plus, cel mai rău Y” (starea de la cumpărare, aceeași acțiune sau același sector; sub 10 cazuri: „prea puține”), plus profilul și probabilitățile acțiunii propuse (stopul propus, săritura).
- Avertizează, nu blochează (ca poarta de azi).

### Pachetul 5 — Graficul și autopsia
- Pe graficul acțiunii din pagina T212: ziua obișnuită (1 zi și 5 zile), zona de valoare pe 20 de zile de bursă (cu volumul Yahoo), stopul de acum vs stopul propus; comutatoare ca la boți.
- Raportul săptămânal al acțiunilor: autopsia celor mai scumpe sfaturi greșite (starea de atunci, ce a urmat), regula propusă doar pe ≥ 10 zile distincte cu Wilson 99% > 50% — ipoteză, nimic schimbat fără cererea lui.

## Ce NU se schimbă
Sursele de prețuri și cache-urile lor, lei/dolari, doar long, alertele de preț, pagina Scan, toată partea crypto, cota KV de pe Cloudflare (totul nou în KV-ul local).

## Cum se probează
- Fiecare pachet: probă nouă (`proba-v10052…`) scrisă întâi și văzută picând; fixturi din datele lui reale (INTC, AMD, TSLA — trade-uri și bare).
- „Doar ce se știa atunci”: o bară din viitor mutată în trecut trebuie să schimbe rezultatul probei (altfel proba trișează); calibrarea doar cu barele de dinaintea fiecărei cumpărări.
- Independență: ferestrele de 5 zile nu se suprapun; mai multe cumpărări pe aceeași acțiune în aceeași zi = un caz.
- Săritura: un test cu o deschidere care sare peste stop — trebuie numărată în „săritura”, nu în „atinge stopul”.
- Crypto neschimbat: probele `v10045…v10051` verzi după fiecare pas; ecran Tablou + Grid + T212.
- Ecran: poze la 1920 și 390 pe pagina T212; „nimic pierdut” față de pagina de azi.

## Riscuri spuse dinainte
- Pe o singură acțiune sunt puține trade-uri ⇒ calibrarea pe toate la un loc; pe acțiune se arată doar profilul pieței (2 ani de bare).
- Rezultatele companiilor nu se pot prezice — rămân un avertisment, nu o cifră.
- Yahoo poate limita cererile: profiluri doar pentru acțiunile active, noaptea, cu cache.
- 2 ani de bare zilnice pot cuprinde regimuri diferite — de aceea condiționarea pe stare și calibrarea.
