# Consiliere personalizată pe monedă + probabilități din istoric, calibrate — design

**Data:** 01.10.2026 · **Cererea lui:** „da fă toate (I-469…I-479), și da sfaturile să fie adaptate și personalizate pentru fiecare
monedă; vreau să adaug și partea de probabilități bazate pe istoric — știu că e deja, dar vreau să fie mai aprofundată”.
**Hotărârile lui (01.10):** pragurile se adaptează singure din profilul monedei · istoric 6 luni pe 1 oră + 30 de zile pe 15 min ·
o probabilitate prost calibrată se arată cu avertisment ȘI se corectează · ordinea: 1 profil → 2 probabilități → 3 o voce → 4 grafic.

## Ce e azi (punctul de plecare)

- **Praguri fixe** pentru toate monedele: marginea „la 10% din interval” (`SemnaleBot.mutaGridul`), stopul „la 1/8 din lățime”, „mișcare mare =
  1,5× obișnuitul” (aceasta e deja relativă la monedă), lichidarea 8/15% (rămâne fixă — e siguranță, nu context).
- **Probabilitățile de azi** sunt frecvențe pe 30 de zile de 15M (fișa: proba pe ferestre de 2 zile; `GridCalcul.linisteTine`; `Scenariu.sansaAtingere`
  pe 4h; „Estimare pe 16 ore” din indicatori) — fără urmărire: nimeni nu verifică dacă s-au adeverit.
- **Măsurat pe 30.09:** pe CRV stopul planului e atins de o zi obișnuită în ~58% din zile; „Ține-l” 10 din 21 (~−126 USDT).

## Principiile (nenegociabile)

1. **Doar ce se știa atunci.** Orice probabilitate se socotește din bare ÎNCHISE dinaintea momentului; profilul se reface noaptea, nu din viitor.
2. **Frecvență, nu predicție.** „În 38 din 61 de cazuri asemănătoare…”, cu numărul de cazuri și intervalul Wilson. Direcția viitoare nu se promite.
3. **Cazuri independente.** Pornirile se iau la cel puțin 4 h una de alta; numărul afișat e numărul de zile distincte, nu de bare.
4. **Calibrare vizibilă.** Fiecare probabilitate arătată se notează și se judecă după orizontul ei; lângă cifră, cât de bine s-a adeverit tipul ei.
5. **Nimic nu se pierde, nimic nu blochează.** Sfaturile avertizează; lichidarea și planul lui nu tac niciodată.

## Pachetul 1 — Profilul monedei + planul potrivit monedei (I-475)

**Date.** Colectorul, noaptea (02:00–05:00 RO, o monedă la 1,6 s): pentru monedele botilor din ultimele 60 de zile + cei activi (azi 52)
aduce barele de **1 oră pe 6 luni** (prima dată ~9 pagini/monedă, apoi doar ce lipsește) → disc `data/istoric-1h/<SIMBOL>.json`
+ KV `ore:<SIMBOL>` (pentru pagină). Barele de 15M pe 30 de zile rămân cum sunt (fișa).

**Profilul** (`lib/profil-moneda.js`, pur) → KV `profil:<SIMBOL>`, refăcut noaptea:
- mișcarea într-o zi obișnuită: percentilele 50/75/90 ale coborârii maxime și urcării maxime de la deschidere, pe 24 h;
- cât de des iese din grid (pentru lățimea gridului propus / al botului), cât țin liniștile (pe 1h), viteza tipică a unei mișcări mari;
- pe botii lui de pe monedă: n, rata pe plus, netul, cât au ținut, cât de des s-a atins planul (din arhivă + jurnalul de semnale).

**Pragurile din profil** (înlocuiesc numerele fixe; lângă fiecare sfat scrie de unde vine):
- „lângă margine” = distanța până la margine sub mișcarea tipică pe 12 h a monedei (P75), nu „10% din interval”;
- stopul propus = dincolo de P75-ul coborârii pe o zi (sau 1/8 din lățime, care e mai departe) — „o zi obișnuită nu-l atinge în 3 din 4 zile”;
- „mișcarea mare” rămâne relativă (deja e); lichidarea rămâne 8/15%.

**Planul potrivit monedei (I-475):** în „Planul tău” și în poarta de pornire, lângă pragul pe minus: „o zi obișnuită ajunge la stopul ăsta în N%
din zile” + prag propus pentru cel mult 1 zi din 4, cu suma în USDT; avertizare peste 50%.

## Pachetul 2 — Probabilitățile din istoric, aprofundate și calibrate (+ I-471, I-469)

**Modul nou `lib/probabilitati.js`** (pur, pe barele de 1h + 15M), fiecare rezultat = {p, n zile, IC Wilson, orizont, temei}:
1. **Cursa țintă–stop** (cea mai importantă pentru bot): din starea de acum, în câte cazuri asemănătoare a fost atins întâi prețul ȚINTEI planului
   și în câte prețul STOPULUI (sau niciunul în 7 zile). „Asemănător” = același regim (liniște/mișcare) și aceeași direcție pe 4h (trei stări).
   Prețurile țintă/stop sunt cele ale botului (`pretTintaPentru`, `pretOpritorPentru`), deci cifra e pe banii lui.
2. **Iese din grid** în 24 h / 3 zile (prin margine de jos / de sus, separat).
3. **Atinge lichidarea** în 7 zile (rar — se spune „0 din 180 de zile” când e cazul).
4. **Liniștea mai ține** 1 / 2 zile (extinde `linisteTine` pe 6 luni de 1h).

**Calibrarea:** fiecare probabilitate arătată pe Tablou (o dată pe oră pe bot, nu la fiecare redesenare) se notează în KV `prob:<bot>`
{t, tip, p, orizont, prețuri}; colectorul o judecă după orizont din barele de 1h. Tabelul de calibrare pe tip (cutii de 20 de puncte
procentuale) → KV `calibrare`. Pe ecran: „când am zis ~60%, s-a întâmplat în 41% din 52 de cazuri”; când cutia are ≥ 20 de cazuri,
cifra afișată e cea **corectată** (frecvența observată în cutie), cu cea brută alături; sub 20 — „necalibrat încă”.

**Indicatorii cu dovadă (I-471):** pentru fiecare stare de indicator pe 4h (RSI peste 70 / sub 30, Bollinger în afara benzii, EMA20 vs EMA50,
ADX peste 25), frecvența ieșirii din grid în 24 h când starea era aceeași, față de rata de bază a monedei; celulele care nu se deosebesc
de rata de bază (IC peste ea) se pliază sub „fără semn”. Marcaj „nedovedit” pentru ce laboratorul n-a confirmat.

**Situații asemănătoare pe boți (I-469):** vecinii din arhiva lui (~2.256): regim, lățime, pas, levier, direcție, ora pornirii, trendul 4h —
doar ce se știa la pornire. „În 38 de situații ca asta: median −1,2 USDT, 61% pe plus, cel mai rău −14”; sub 10 vecini: „prea puține”.

**Unde se văd:** în Consilier (un motiv „Probabilitățile” sau rândul de bani: „ținta planului înaintea stopului: 38 din 61 (62%, IC 49–73%),
calibrat”), în fișa Grid și în poarta de pornire; „Restul” păstrează detaliile.

## Pachetul 3 — O singură voce (I-474, I-473, I-479, I-472)

- **I-474:** colectorul calculează `Consiliu.alcatuieste` la fiecare tură → poza (nivel, titlu, faCe, bani) → pagina alerts (rândul botului) și
  alerta Discord de schimbare de verdict (cu acțiunea și banii). „Ce cedezi” vine din profil (colectorul îl are).
- **I-473:** la fiecare schimbare de verdict, diferența (ce cifră a trecut ce prag) sub verdict și în alertă.
- **I-479:** ordinea motivelor de același nivel după banii măsurați (socoteala ≥ 10 cazuri); lichidarea și planul rămân primele.
- **I-472:** „am făcut / n-am făcut” lângă acțiunea Consilierului (KV `decizii:<bot>`); după 30 de cazuri, rezultatul când a urmat vs când nu.

## Pachetul 4 — Graficul și autopsia (I-476, I-470, I-477, I-478)

- **I-476:** banda zilei obișnuite (P50/P75 din profil) de la prețul de acum + liniile Consilierului (stopul de acum vs al planului), comutator.
- **I-470:** zona de valoare (profilul de volum pe 7 zile, POC + 70%) și suport/rezistență din pivoți CONFIRMAȚI, față de gridul botului;
  intervalul ancorat pe zona de valoare intră în laborator ca întrebare nouă (ipoteză).
- **I-477:** perechile reale pe zi vs estimarea fișei la pornire; sub 50% → motiv în Consilier; raportul real/estimat pe monedă intră în profil
  ca factor de corecție al probei (de la 10 boți pe monedă).
- **I-478:** în raportul de duminică, cele 2–3 cele mai scumpe sfaturi greșite, cu starea de atunci și ce a urmat; tiparul repetat → regulă
  propusă (ipoteză), nicio regulă schimbată fără cererea lui.

## Ce NU se schimbă

Lichidarea 8/15%, regulile planului lui, poarta (avertizează, nu blochează), „Ce ai de făcut acum”, alertele de preț, pagina T212, Scan.
Cotă KV de pe Cloudflare: neatinsă (totul nou stă în KV-ul local, de acasă; poza rămâne o scriere).

## Cum se probează

- Fiecare pachet: probă nouă (`proba-v10045…`) scrisă întâi și văzută picând; fixturi din datele reale (CRV, LIGHTER 29.09, ONG, MARSCOIN).
- Probabilitățile: test „doar ce se știa atunci” (o bară din viitor mutată în trecut trebuie să schimbe rezultatul — dacă nu, proba ar trișa);
  test de independență (pornirile la ≥ 4 h); calibrarea pe date sintetice cu probabilitate cunoscută (iese ~corect).
- Ecran: poze la 1920 și 390, inventar „nimic pierdut”, `npm test`, proba de ecran a Tabloului.
- Colectorul: o singură repornire pe pachet; prima umplere de istoric pe 1h urmărită în jurnal.

## Riscuri spuse dinainte

- **6 luni pot conține regimuri care nu mai seamănă** — de aceea condiționarea pe regim și calibrarea; profilul arată și ultimele 30 de zile separat.
- **Calibrarea are nevoie de timp** (zeci de cazuri pe cutie) — primele săptămâni majoritatea cifrelor vor fi „necalibrat încă”.
- **Pragurile adaptive pot face sfaturile mai rare sau mai dese pe unele monede** — socoteala (I-466) arată dacă au devenit mai bune.
