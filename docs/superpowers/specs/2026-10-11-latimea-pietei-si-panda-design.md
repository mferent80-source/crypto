# Lățimea pieței pe 150 perp-uri + pânda în Sugestii (Radar v100.150 / colector v101.93) — design

**Data:** 11.10.2026 · **Cererea lui:** „paznic e degeaba?” ⇒ măsurat: ca robot nu ajută (avantaj zero, ±0,06R pe 4.963 trade-uri; hârtia +9,3R din 3 trade-uri, intervalul cuprinde zero; nimeni nu-i citește ieșirea). Apoi: „întâi facem trecerea în Radar așa avem un tool nu 10” → a ales **(a) doar lățimea pieței**, apoi „partea de pândă am putea face o variantă îmbunătățită să o punem în Sugestii”, apoi **A: calculul în colectorul de pe PC** (planul Cloudflare e gratuit: 50 de subcereri pe rulare, lățimea cere sute).

**Principiul:** Radarul **calculează el** lățimea, nu citește fișierul lui PAZNIC — altfel PAZNIC rămâne pornit și tot 10 unelte avem. Cifrele trebuie să bată cu PAZNIC 2–3 zile, apoi PAZNIC se oprește.

## 0. Ce mutăm și ce NU

| mutăm | NU mutăm (măsurat, nu ajută) |
|---|---|
| lățimea pe 150 de perp-uri: regim, sus/jos, conturile mari, extremele de funding / OI / volatilitate / buget | robotul (hârtie, live încuiat), panoul `:8791`, Telegram |
| pânda = tabelul celor 150 de monede cu **faptele** măsurate (direcție, percentile, funding, OI, poziționare, agresiune) | **permisiunea** (filtrul nu selectează nimic, p = 0,23) și **fișa de intrare** (R:R, declanșator) — Carnetul fișei din Radar a spus același lucru |
| aceleași praguri și aceeași fereastră ca în PAZNIC (ca să bată cifrele) | orice dezvoltare pe strategie — direcția e închisă din 13.09 |

Laboratorul PAZNIC (`istoric/`, `merita-*.mjs`) rămâne fișiere pe disc, nu rulează nimic.

## 1. Datele — colectorul, tura nouă `scripts/lib/tura-latime.mjs`

Tiparul e `tura-piata.mjs`: modul cu ritmul lui, primește `{ cere, trimite, jurnal, pauza, … }` din `colector.mjs`, publică în KV prin `/api/istoric-bot`.

**Universul** (o dată pe oră): `fapi/v1/exchangeInfo` + `fapi/v1/ticker/24hr` ⇒ `quoteAsset USDT`, `status TRADING`, `contractType PERPETUAL`, `underlyingType === "COIN"` (fără aur, petrol, indici, acțiuni), listate de ≥ 10 zile (`onboardDate`), primele **150** după `quoteVolume`. Dacă filtrul dă 0 (Binance schimbă un nume de câmp) ⇒ tura **se oprește și spune de ce** în jurnal și în KV (`eroare`), nu cade pe „orice *USDT” — lecția din `PAZNIC-CRYPTO/univers.mjs`.

**Cererile** pleacă **direct de la Binance, din PC** (IP-ul lui; nu prin Pages Functions, ca să nu ardem cota de 100.000 de cereri/zi a planului gratuit). Două ritmuri, ca în `tura-piata` (`RITM`):
- **la 15 min:** `klines 4h limit 564` (fereastra percentilelor `pctlBare = 564`, valoarea PAZNIC — I-401: fereastra e un parametru cu nume) și `klines 1d limit 30` ⇒ 300 de cereri;
- **o dată pe oră** (seriile se schimbă oricum la oră): `fundingRate limit 500`, `openInterestHist 1h limit 500`, `topLongShortPositionRatio 1h limit 200`, `globalLongShortAccountRatio 1h limit 200`, `takerlongshortRatio 1h limit 500` ⇒ 750 de cereri; `premiumIndex` fără simbol (1 cerere) pentru funding-ul de acum;
- media ≈ 490 de cereri la 15 min, greutate Binance sub 1.000/min; **5 în paralel** (ca `paralel: 5` în PAZNIC), pauză de 60 s și jurnal la `429`/`418`; o monedă fără date ⇒ `lipsa`, nu intră în numărători; peste 20% lipsă ⇒ `incomplet: true` și pagina spune „pe N din 150”.

**Modulul pur `scripts/lib/latime.mjs`** (fără rețea; probat în vm; aceleași formule ca `PAZNIC-CRYPTO/decizie.mjs`, copiate cu referință la linie, nu reinventate):
- `percentila(serie, x)` = rangul median (I-401);
- `masuraMoneda(intrari, P)` ⇒ `{ sym, pret, dir, zileDir, volPctl, extPctl, adrUsed, frAcum, fundPctl, oiChg, oiPctl, lMari, lMici, diverg, deltaPctl }`:
  - `dir` SUS / JOS / neclară (`directiaDeFond`, felul `ema`, `decizie.mjs:591-595`): **SUS** când EMA 21 > EMA 55 **și prețul e peste EMA 21**; **JOS** când EMA 21 < EMA 55 și prețul e sub EMA 21; altfel neclară; sub 100 de bare ⇒ neclară;
  - `zileDir` = câte bare de 4h la rând ține relația EMA 21 / EMA 55 ÷ 6 — **nou față de PAZNIC** (persistența direcției, I-585);
  - `volPctl` = percentila lui ATR(14)/preț × 100 față de ultimele 563 de bare; `extPctl` = percentila lui |c − EMA 55| / ATR;
  - `adrUsed` = range-ul de azi ÷ media range-urilor ultimelor 14 zile închise × 100;
  - `fundPctl` = percentila funding-ului de acum față de istoricul de 500; `oiChg` = abaterea OI față de media ultimelor 24 h (%), `oiPctl` = percentila ei;
  - `lMari`, `lMici` = % conturi long (poziții mari / conturi global), `diverg = lMari − lMici`; `deltaPctl` = percentila raportului taker buy/sell;
- `latimea(randuri, P)` ⇒ `{ n, sus, jos, neclar, lipsa, bugetEpuizat (adrUsed ≥ 90), volExtrem (volPctl ≥ 90), oiExtrem (oiPctl ≥ 95), fundExtrem (fundPctl ≥ 75 sau ≤ 25), mariLong (lMari > 50) }`;
- `regimPietei(L)` ⇒ `LARG-SUS` la ≥ 65% sus, `LARG-JOS` la ≥ 65% jos, altfel `AMESTECAT` (`REGIM_LARG = 65`);
- `regimDeCand(istoric)` ⇒ de câte ore / zile ține regimul de acum (din punctele păstrate).
- Pragurile `P` (volPctl 90, extPctl 90, adrConsumat 90, fundPctlSus 75, fundPctlJos 25, oiPctl 95, emaRapid 21, emaLent 55, atrLen 14, pctlBare 564, minZileListate 10, n 150) stau într-un singur obiect cu comentariul „copiate din PAZNIC-CRYPTO/decizie.mjs PRAGURI, 11.10.2026”. Sunt **ipoteze** (trader.md), nu adevăruri; schimbarea lor se validează pe date de după.

**Publicarea:** o singură scriere pe tură, `trimite("/api/istoric-bot?action=latime", { la, n, lipsa, incomplet, eroare, regim: { cod, pctSus, pctJos }, lat, monede: [...] })`. KV: cheia `latime` = `{ acum: <tot ce a venit>, istoric: [{ la, cod, pctSus, pctJos, mariLong }] }` — istoricul e **în aceeași cheie** (un punct la 15 min, 30 de zile, ≈ 2.900 puncte). **Corectură (11.10, la plan): KV-ul `ISTORIC` e LOCAL**, pe PC-ul lui (`PORNESTE-CRYPTO-RADAR.bat` pornește `wrangler pages dev` pe `:8788` cu `--persist-to`; pe Cloudflare istoricul nu există ⇒ 503) ⇒ nu există cotă de scrieri de păzit. Mărimea ≈ 40 KB + 120 KB, sub 256 KB (funcția refuză cu 413 peste).

**`functions/api/istoric-bot.js`:** `GET action=latime` ⇒ `{ latime: { acum, istoric } }`; `POST action=latime` validează (numere finite, `sym` pe `^[A-Z0-9]{2,20}USDT$`, cel mult 200 de monede, `dir` din listă, fără texte libere), scrie o dată. Autentificarea existentă (`requireApiAuth`, antetul `x-radar-client: colector`).

## 2. Ecranul

### 2a. „Ce spune piața acum” (Tablou) — un rând nou
- În `tbCitireExtra` ⇒ `out.latime`, pus **după „Trendul pe TF-uri”** și înaintea Indicatorilor (de la general la particular: piața întreagă, apoi moneda).
- Textul: „**Lățimea pieței (150 perp-uri):** larg SUS de 3 zile · 136 sus · 10 jos · conturile mari long pe 145 · funding extrem 16 · OI extrem 16 · acum 7 min”. Cu `incomplet`: „pe 131 din 150”. Fără date: „aștept lățimea pieței (vine o dată la 15 minute)”; colectorul oprit > 45 min ⇒ „veche, de la HH:MM” cu clasa `vechi` (ca Busola).
- Starea rândului: `info`; **`atentie`** când regimul e **LARG contra botului** (bot long și LARG-JOS, bot short și LARG-SUS — „riscul e corelat, nu diversificat”), sau când `bugetEpuizat ≥ 60%` („ziua e epuizată pe toată piața”) sau `volExtrem ≥ 40%` („volatilitate extremă pe piața largă”) — pragurile din `verdictPiata` al PAZNIC; bot neutru ⇒ `info`.
- Legătura „pânda” pe rând ⇒ `show("sugestii")` cu tabul pândei deschis.
- Adus o dată la 10 minute (`tbLatimeKv`, ca `tbVociKv`), sosirea redesenează citirea o dată.
- **NU intră în fraza vocilor** (`Busola.concluzie`): lățimea e despre piață, nu o voce despre moneda botului. Dacă vrem, idee separată, validată pe jurnalul vocilor.

### 2b. Sugestii — tabul „Pânda · 150 perp-uri”
- În `public/lib/sugestii-ecran.js` (`sugHtml` fără DOM, probat în vm) + `app.js sugPorneste` (aduce `action=latime` o dată cu restul). **Primul bloc al paginii, sub antet, înaintea cartelelor** cu liste: piața întreagă întâi, apoi listele pe monede. Blocul e pliat implicit la agregat (regim + cifre); „arată cele 150” îl desface.
- **Antetul tabului:** regimul + agregatul + vechimea, apoi fraza de cinste: „fapte, nu semnal: filtrul de permisiune și fișa de intrare ale lui PAZNIC n-au selectat nimic (p = 0,23; 78 trade-uri pe hârtie) și nu sunt aici”.
- **Filtre** (butoane, starea în `sugStare.panda`, fără recitire): toate · **monedele boților mei** · **contra mulțimii** (|diverg| ≥ 15 puncte) · **extreme** (vol ≥ 90 / OI ≥ 95 / funding ≥ 75 sau ≤ 25) · SUS · JOS. Ordinea: monedele boților sus, apoi ordinea universului (volum).
- **Coloanele:** Monedă (legături Tablou / Busolă, cheia fără „1000”) · Direcția 4h + „de N zile” · Vol pctl · Ext pctl · Buget zi % · Funding (valoare, pctl) · OI (abatere %, pctl) · Conturi mari % long / mici % long (divergența) · Agresiune (delta pctl) · **Botul meu** (direcția botului; CU / CONTRA).
- Culoarea doar pe prag (≥ 90 / ≥ 95 / ≥ 75 / ≤ 25 / CONTRA), nu decor; cifrele cu **o zecimală**, `tabular-nums`; **telefon (390 px):** tabelul derulează lateral (`.rlTab`), capul rămâne — regula paginii Salt; 150 de rânduri se desenează o dată, filtrele ascund.
- Textele în română prin `TextRo` unde există; fără cuvântul „predicție”.

## 3. Comparația cu PAZNIC și oprirea lui
- `scripts/proba-latime-vs-paznic.mjs` (rulat de mine, manual, 2–3 zile): citește `C:\Users\Cimin\PAZNIC-CRYPTO\stare.json` (`latime`, `regim`, `dir`, `cand`) și KV `latime` (jetonul din `.dev.vars`, citit fără regex cu backslash — capcana din `511fa06`) la ture ≤ 15 min distanță ⇒ raport: Δ pe `sus / jos / mariLong / volExtrem / oiExtrem` și acordul pe direcția fiecărei monede comune.
- **Criteriul scris înainte:** |Δ| ≤ 3 monede pe fiecare agregat și acord ≥ 95% pe direcții, 3 zile la rând. Diferențe așteptate și acceptate: marginea universului (monedele 140–150 se schimbă cu volumul), minutul turei.
- Când criteriul trece, raportul scrie comanda de oprire pentru `Paznic Robot`, `Paznic Paza`, `Paznic Panou`, `Paznic Publica`; **EL** o dă (sau zice „da”), eu nu opresc nimic singur. `Paznic Copie Zilnica` rămâne până hârtia ajunge la 100 de trade-uri (~21.10). Până atunci PAZNIC rulează neatins.

## 4. Probe (TDD) și gărzi
- `scripts/proba-v100150.mjs` (`test:v100150` în `package.json`, intrat în `test`): modulul pur pe serii sintetice (direcția SUS / JOS / neclară, percentila pe serii cunoscute, `adrUsed`, `zileDir`, regimul la 65%, agregatul cu `lipsa`), funcția Pages în vm cu KV fals (GET gol, POST valid / invalid / prea mare), rândul din citire (`atentie` la LARG contra bot, `vechi` la > 45 min, textul cu „pe N din 150”), tabelul pândei (`sugHtml` în vm: 150 rânduri, filtrele, monedele boților sus, fraza de cinste), garda textelor, `garda-comentarii`, `syntax`.
- `scripts/proba-v100150-colector.mjs`: tura cu `cere` fals (fixture din 3 monede), cele două ritmuri, oprirea pe univers gol (fără cădere pe „orice *USDT”), pauza la 429, **o singură publicare pe tură**.
- Poza la 1920 și la 390 pe Sugestii și pe Tablou (judecata după poză, nu după gărzi).
- `npm test && git push` — niciodată `;`.

## 5. Versionare și livrare
- Radar **v100.150** (`BUILD_INFO.json`, `index.html`: meta `app-version`, badge, antet, health), colector **`VERSIUNE_COLECTOR = "v101.93"`**; backlog: I-583 (lățimea), I-584 (pânda), I-585 (persistența direcției), I-586 (monedele boților) făcute; I-587 (oprirea PAZNIC) și I-588 (mutarea în Workers Paid) rămân propuse.
- Revizie de cod cu agent nou (lucru mare) înainte de push; commit `feat(radar): v100.150 / colector v101.93 - lățimea pieței pe 150 perp-uri (I-583) + pânda în Sugestii (I-584)`; push pe `main`.
- ⏳ **EL:** repornește colectorul (`PORNESTE-CRYPTO-RADAR.bat`) — comis ≠ în funcțiune; pagina se reîncarcă singură la versiune nouă.
- Memorie după fiecare etapă (modul pur → funcție → colector → ecran → comparație → oprire).

## 6. Riscuri
- **Binance 429 / ban temporar de IP** ar lovi și PAZNIC (același IP) cât rulează amândouă: 5 în paralel, pauze, 60 s la 429; dacă apar 429 repetate, tura rară se mută la 2 ore.
- **Scrierile KV:** KV-ul e local (corectura de la §1) — fără cotă; o scriere la 15 min.
- **Monede noi** (sub 100 de bare de 4h) ⇒ `neclar`, nu în sus/jos.
- **Universul la margine** diferă de PAZNIC ⇒ comparația tolerează 3.
- **PC oprit ⇒ tot Radarul e oprit** (serverul și KV-ul sunt pe PC; telefonul intră prin cloudflared / Tailscale la PC). „Veche, de la HH:MM” apare doar când serverul merge și colectorul e oprit. Varianta C (I-588, Workers Paid) ar schimba asta.
