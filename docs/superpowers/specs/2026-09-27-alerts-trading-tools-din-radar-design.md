# Pagina `alerts` din Trading Tools, în designul Radarului: pozițiile deschise + simbolurile tale

**Data:** 27.09.2026 · **Cerut de:** Marius · **Stare:** spec de citit înainte de plan

## 1. Ce se construiește (obiectul, hotărât în discuție)

Pagina `alerts` din suita Trading Tools (`premarket_scanner/alerts/index.html`, azi alerts v115 / suită tt-v825) primește **designul Crypto Radar** și arată, automat, de oriunde (PC, telefon, fără tunel):

1. **Pozițiile deschise din Radar**, atât: boții Pionex activi și pozițiile deschise din Trading 212. Nu Scan-ul, nu urmăritele.
2. **Simbolurile tale** (lista de simboluri pe care pagina o avea ca „alerte de preț”), cu **mișcarea reală** (azi, săptămâna, 30 de zile) și, în locul pragurilor, **insiderii pe 60 de zile, rezultatele și analiștii**.

Hotărâri luate de Marius, în ordinea în care au venit:

| Hotărâre | Ce înseamnă |
|---|---|
| „doar pozițiile deschise, atât” | doar boții activi + pozițiile T212 deschise; nimic din Scan |
| opțiunea 1 | conținutul paginii în designul Radarului; **bara suitei rămâne** (Carbon), pagina e întunecată chiar dacă suita e pe tema deschisă |
| varianta 1 | drumul datelor prin **worker-ul Paznicului**; **cheie de citire** pusă o dată în browser |
| „scoate alertele de acasă” | alertele colectorului NU vin pe pagina asta (rămân în Radar și pe Discord) |
| „nu vreau praguri, vreau progresul real zilnic” | rândul unui simbol arată mișcarea reală, fără praguri și fără stări |
| „în loc de prag pune insiders etc, scoate pragurile” | pragurile dispar de tot (și din rândul desfăcut, și din „Adaugă”); intră insiderii, rezultatele, analiștii, short-ul |

**Referința vizuală = demo-ul v4**, aprobat: https://claude.ai/artifact/WTfykxxFUG7TxdirtSKxXj (sursa `demo-alerte-radar.html`, pozele `poza4-1920.png` și la 390 px, în scratchpad-ul sesiunii din 27.09). „Gata” înseamnă poza ecranului real lângă poza demo-ului, la 1920 și la 390, fără diferențe neexplicate.

## 2. Ce NU se strică (funcția veche a paginii)

Rămâne, neatins ca funcție:
- lista de simboluri a paginii (`tools/alerts.json` + browser), cu **simbol** și **notiță**; sincronizarea ei pe GitHub (tokenul, butonul, banner-ul) ca până acum;
- filele **News** și **Istoric** din bara suitei, cu conținutul lor de azi (Istoric rămâne citire a declanșărilor vechi);
- News Desk, digest, quiet hours, notificările browser, sunetul, pauza, meniul ⋯ („din watchlist”, „din pozițiile deschise” adaugă doar simboluri);
- poll-ul de prețuri al paginii (Yahoo prin tt-proxy, Binance direct), watchdog-ul lui, chip-urile de prospețime.

Se scoate, fiindcă pragurile se scot:
- câmpurile de prag din rândul de adăugare (nivel, ±%, direcție, re-arm) și din rândul desfăcut („Editează pragul”);
- coloanele Prag / De la bază / Progres; stările ARMATĂ / APROAPE / BĂTUTĂ;
- **verificarea pragurilor de pe GitHub Actions** (`tools/check-alerts.mjs`, `.github/workflows/price-alerts.yml`): partea de praguri se oprește (workflow-ul dezactivat, fișierul păstrat în istoric). `check-news-watch.mjs` nu e atins. Câmpurile vechi de prag din `alerts.json` sunt ignorate la citire și nu mai sunt scrise.

Nicio pagină din suită în afară de `alerts` nu se schimbă. Modulele comune (`lib/suite-ui.css`, `lib/theme.js`, `lib/price-day.js`, `lib/insider.js`, `lib/earnings.js`) nu se modifică; se adaugă module noi.

## 3. Arhitectura și drumul datelor

```
[acasă]  colectorul Radarului ──POST /poza (token Paznic, la 5 min)──▶ worker Paznic (Cloudflare) ──KV: poza──▶
                                                                          ▲                                      │
[oriunde] pagina alerts ──POST /simboluri (cheia de citire) ─────────────┘        GET /poza (cheia de citire) ◀──┘
```

### 3.1 Colectorul (`crypto/scripts/colector.mjs`, tură nouă `turaPoza`)

La fiecare 5 minute (și imediat după pornire) construiește **poza** și o trimite la `PAZNIC_URL/poza` cu `Authorization: Bearer PAZNIC_TOKEN`, pe același drum ca bătaia de inimă (v97.0). Dacă worker-ul nu răspunde, jurnal + reîncercare la tura următoare; nu blochează nimic altceva.

Poza se construiește dintr-o funcție pură `construiestePoza({ boti, t212, simboluri, acum })` (fișier nou `scripts/lib/poza.mjs`), testabilă cu fixture-uri, din datele pe care colectorul le are deja:
- boții: lista Pionex + `TabloExtra` / `IndicatoriBot` / `Alerte.grila` (grile, poziție, „iese pe zero”, marginile, planul, semaforul, motivele, sfatul);
- T212: pozițiile + `ActiuniSemnale.niveluri` (stop, țintă, trend), planul din KV (`plan:t212-*`), costul FIFO în lei (`t212CostLei`), ponderea;
- simbolurile tale: lista primită de la worker (`GET /simboluri`, o dată pe tură), pentru fiecare: închiderile zilnice pe 30 de zile (Yahoo, ruta existentă `/api/t212?action=preturi&interval=1d`), insiderii pe 60 de zile, rezultatele, analiștii și short-ul (Yahoo `quoteSummary`, modulele `insiderTransactions`, `calendarEvents`, `financialData`, `defaultKeyStatistics`; crumb luat o dată pe zi). **Dublurile germane** (`1QZ.DE`→COIN, `MIGA.MU`→MSTR, `NFC.F`→NFLX) iau insiderii/rezultatele/analiștii de la compania din SUA; harta stă în `poza.mjs` și se poate extinde. Simbol fără Form 4 ⇒ `form4:false`.
- regula insiderilor = cea din `premarket_scanner/lib/insider.js`, copiată ca funcție pură în `poza.mjs` (P = cumpără; S/D/F/G = vinde; grant/award/conversie = nu se numără; fără cod ⇒ semnul lui `change`). Verdict: `bull` (≥2 cumpărători, net > 0), `bull1` (1 cumpărător, net > 0), `bear` (≥2 vânzări, net < 0, vânzări ≥ cumpărări), altfel `neut`.

Datele externe (Yahoo) se cer cu pauză (0,4 s) și cache pe 6 ore per simbol în KV-ul local (`poza:ext:<SIMBOL>`), ca lista de 9–20 de simboluri să nu coste nimic la 5 minute. Prețurile pozițiilor vin din ce are colectorul la fiecare tură (Pionex, T212 + Yahoo).

### 3.2 Worker-ul Paznicului (`crypto/paznic/worker.mjs`)

Rute noi, pe lângă `/bataie`:

| Rută | Cine | Cheie | Ce face |
|---|---|---|---|
| `POST /poza` | colectorul | `PAZNIC_TOKEN` | scrie `poza` în KV (max 512 KB, JSON valid, câmpul `la` obligatoriu), răspunde `{ok, marime}` |
| `GET /poza` | pagina | `CHEIE_CITIRE` | întoarce poza + `ETag` (= `la`); `304` la `If-None-Match` |
| `POST /simboluri` | pagina | `CHEIE_CITIRE` | scrie lista `{simboluri:[{s, nota}]}` (max 60) în KV `simboluri` |
| `GET /simboluri` | colectorul | `PAZNIC_TOKEN` | citește lista |

CORS: `Access-Control-Allow-Origin` doar pentru originile suitei (domeniul Pages al suitei + `http://localhost:*` pentru probe), `Authorization` permis, `OPTIONS` răspuns. Fără cheie sau cu cheie greșită ⇒ `401 {motiv}`. `CHEIE_CITIRE` e un secret nou al worker-ului (`wrangler secret put`), diferit de `PAZNIC_TOKEN`; Marius îl primește o dată și îl lipește în pagină.

### 3.3 Pagina (`premarket_scanner/alerts/index.html` + module noi)

Module noi, ca să nu crească fișierul de 5.000 de rânduri:
- `lib/radar-poza.js`: citirea pozei (cheia din `localStorage.radar_cheie`, `GET /poza` la 5 min și la `visibilitychange`, cache-ul ultimei poze în `localStorage.radar_poza`), trimiterea listei de simboluri (`POST /simboluri` la orice schimbare a listei), prospețimea (`viu` sub 15 min, `tace` 15–60 min, `oprit` peste 60 min);
- `lib/radar-ecran.js`: randarea celor trei secțiuni + sumarul, din poză și din prețurile live ale paginii;
- `lib/radar-ui.css`: tokenii Radarului **scoped** sub `body.al-page .rad` (nu pe `:root`), ca bara suitei și tema comună să rămână neatinse; `.rad` e întunecat indiferent de `data-theme`.

Așezarea (ca în demo v4, de sus în jos): bara suitei (neschimbată) → „📡 Din Radar” (chip poza, chip telefon, cheia de citire) → sumar pe un rând (T212 pe deschise · boți activi · simbolurile tale · colectorul) → **Trading 212** (tabel: semafor, acțiune, acum + ziua, 30 z, rezultat lei + %, stop din plan, țintă, trend, din cont; rândul se desface: motive, sfat, planul, „Deschide în Radar”) → **Boți Pionex** (tabel: bot, acum + % în grid + lichidare, ultimele 30 de poze, total, grile, poziția, prag „iese pe zero” + plan; desfăcut: ce spune Radarul, pragurile; fără bot activ: textul de pregătire) → **Simbolurile tale** (cifre: simboluri · US/Germania · insideri cumpără · insideri vând · rezultate în 30 z · short > 10 % → rând „Adaugă” cu simbol + notiță → tabel: simbol, acum, azi cu bară centrată ±4 %, săptămâna, 30 z, insideri 60 z, rezultate, bursa; desfăcut: top 3 tranzacții ale insiderilor, ținta medie, recomandarea, nr. analiști, short din float, Notiță, Scoate din listă).

Prețul „acum” și „azi”: din poză; dacă poll-ul paginii are o cotație mai proaspătă pentru același simbol (T212 și simbolurile tale, prin tt-proxy), ea are prioritate și rândul arată chip-ul de prospețime al paginii. Boții rămân pe poză (Pionex PERP nu e pe Binance).

Fără cheie: „Din Radar” arată o casetă „Pune cheia de citire” (o dată; se ține în browser); secțiunile T212 și Boți stau pliate cu textul ăsta; „Simbolurile tale” merge cu ce știe pagina (preț, azi, săptămâna, 30 z) și scrie „cere cheia” la insideri/rezultate. Cheie greșită ⇒ „cheia nu e bună” (401). Worker oprit ⇒ ultima poză din browser + chip roșu „Radarul nu răspunde de X min”. Colector oprit ⇒ chip „Radarul tace de X min” (Paznicul anunță oricum pe Discord).

Telefon (sub 640 px): rândurile pe două linii ca în demo, linia pe toată lățimea, coloanele secundare ascunse, nimic nu defilează orizontal.

## 4. Contractul pozei (JSON)

```json
{
  "la": 1790530000000, "versiune": "v98.0", "colector": {"pid": 1234, "tura": 5},
  "t212": [{
    "s": "AVGO", "t212": "AVGO_US_EQ", "buc": 2.8187, "mediu": 399.96, "costLei": 5130.2,
    "pret": 352.81, "prev": 350.36, "la": 1790343000000, "closes30": [392.99, "…"],
    "pplLei": -615, "pctLei": -0.118, "pctPret": -0.118,
    "plan": {"trailPct": 15, "tinta": 413.47, "stop": 350.63, "max": 412.5, "stopFix": null},
    "trend": "jos", "pondere": 0.157, "niv": "atentie", "motive": ["…"], "sfat": "…"
  }],
  "boti": [{
    "id": "2383", "s": "VVV", "dir": "long", "lev": 4, "investit": 91.9, "jos": 28.464, "sus": 33.346,
    "pret": 29.64, "inGrid": 0.24, "lichidarePct": 25.05, "total": -4.42, "perechi": 0, "gridBrut": 0,
    "pozitie": -4.31, "comisioane": -0.106, "zero": 30.1548, "plan": {"plus": 3, "minus": 14, "afaraOre": 12},
    "niv": "atentie", "motive": ["…"], "sfat": "…", "pret30": [30.418, "…"], "la": 1790467254879
  }],
  "simboluri": [{
    "s": "INTC", "nota": "", "sursa": null, "moneda": "$", "pret": 123.0, "prev": 127.39, "closes30": ["…"],
    "insideri": {"form4": true, "buys": 1, "sells": 0, "bp": 1, "sp": 0, "net": 105263, "verdict": "bull1",
                 "top": [{"d": "08-11", "cine": "Tan Lip-Bu", "rol": "Chief Executive Officer", "f": "buy", "act": 105263, "val": 9999985}]},
    "rezultate": {"data": "2026-10-22", "zile": 25, "eps": 0.39},
    "analisti": {"tinta": 116.37, "recom": "buy", "n": 43}, "shortFloat": 0.0301
  }],
  "gol": {"boti": "niciun bot activ", "t212": null}
}
```

Câmpurile lipsă se afișează ca „—”, niciodată ca 0. Poza fără `la` e refuzată de worker.

## 5. Probe și gărzi

- **worker**: teste node (`crypto/scripts/paznic-poza-v98.mjs`): `POST /poza` fără token ⇒ 401; cu token ⇒ scris; peste 512 KB ⇒ 413; `GET /poza` fără cheie ⇒ 401, cu cheie ⇒ poza + ETag, `If-None-Match` ⇒ 304; CORS pe originea suitei da, pe altă origine nu; `/simboluri` dus-întors. Rulate pe worker-ul local (`wrangler dev`) și, o dată, pe cel publicat.
- **colector**: `construiestePoza` pe fixture-uri (bot cu grile, bot fără plan, T212 cu stop depășit, simbol fără Form 4, dublură germană) ⇒ câmpurile din contract, fără NaN, fără `undefined`; regula insiderilor pe cazurile din `lib/insider.js`; test „prinde prin stricare” (o regulă schimbată face testul roșu).
- **pagină**: gărzile suitei rămân verzi (`tools/alerts-poll-chain.test.mjs`, `sync-suite-version.mjs --check`), scorul din `tools/inventar.mjs` pentru `alerts` scade față de 161 (nu crește); proba de ecran CDP nouă (`tools/proba-ecran-alerts.mjs`): pagina pornește cu poză de probă (fixture), la 1920 și 390, fără erori JS, fără defilare orizontală, rândurile se desfac, „Adaugă” pune un simbol și îl scoate, fără cheie apare caseta; poze salvate lângă pozele demo-ului.
- **pe viu**, cu Marius: cheia pusă în pagina publicată, poza vine de acasă, un simbol adăugat de pe telefon apare în poza următoare cu insiderii lui.

## 6. Livrarea, în ordine

1. Worker: rutele + secretul `CHEIE_CITIRE` (`wrangler deploy` din `crypto/paznic`, **cu cron-ul păstrat**, vezi capcana `wrangler deploy` fără crons).
2. Colector: `poza.mjs` + `turaPoza`; Radar **v98.0** (badge + `sw.js` cache); repornirea colectorului o face Marius din lansator (procesul din sesiunea mea moare cu ea).
3. Pagina: alerts **v116**, suită **tt-v826** (`sync-suite-version.mjs`), `SW_VER_INLINE`; commit + push pe `main` (auto-push), Pages publică.
4. Workflow-ul `price-alerts.yml` dezactivat în același commit cu pagina.
5. „Gata” = pozele reale lângă demo (1920 + 390) + lista diferențelor goală + memo.

## 7. În afara ariei

Alertele de acasă pe pagina asta · universul Scan · praguri de orice fel · schimbări la celelalte pagini ale suitei · lansatorul pentru telefon (rămâne **următorul** proiect, cum a cerut Marius pe 27.09).
