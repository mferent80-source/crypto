# Arborii (gradient boosting) — a treia părere, lângă 🧠, pe boți și pe acțiuni (design)

Data: 04.10.2026. Cererea lui: „FĂ IDEILE și vreau să-mi faci și un model de GRADIENT BOOSTING în app pentru boți și stocks”.
Hotărârile lui din brainstorming: (1) arborii sunt **a treia părere, lângă 🧠** — nu înlocuiesc rețeaua, nu se contopesc cu ea, nu intră în
nicio decizie; (2) pe acțiuni învață **toate trei familiile de ținte, și 🌳, și 🧠** — pipeline-ul de date T212 e același pentru amândouă.

## Ce vrea el (și ce am presupus)

- **Ce a spus:** un model de gradient boosting în aplicație, pentru boți și pentru acțiuni; cele patru idei din raportul v100.92 (A1–A4).
- **Ce am presupus (și el a confirmat):** aceleași ținte și aceeași verificare cinstită ca rețeaua (luni nevăzute, „dovedită / nedovedită” cu
  motivul la vedere); inferența în pagină în JS curat, fără biblioteci; antrenarea noaptea, într-un proces separat; modelele în KV; nimic
  din date în git (repo public); semaforul, poarta, Consilierul, alertele și rezumatul de dimineață rămân neatinse.
- **Reușita** se vede așa: pe Tablou, pe fișă și pe T212, lângă fiecare țintă, trei cifre — 🧠, 🌳, 🎲 — fiecare cu starea ei, iar în
  subsol cine pe cine a bătut pe lunile nevăzute. El alege în ce se încrede.

## Țintele, exact

| | piața | ce prezice (eticheta = 1) | orizontul | reperul de bătut | cazuri independente | unde apare |
|---|---|---|---|---|---|---|
| **B · ca 🎲** | crypto | `atinge-24`, `atinge-72`, `atinge-168`, `cursa`, `liniste` — exact țintele rețelei (`Retea.TINTE`) | 24 h – 7 zile | 🎲 | ca la rețea (zile / 3 zile / săptămâni / 2 zile) | Tablou, fișa |
| **C · direcția** | crypto | `directie` — închiderea de peste 24 h strict mai mare | 24 h | 🎲 sau 50% (cel mai bun) | zilele | Tablou, fișa |
| **A · rezultatul tău** | crypto | `rezultat` — botul se închide pe plus NET | până la închidere | rata ta / rata pe monedă (cea mai bună) | zilele de pornire | Tablou, poarta fișei |
| **B · ca 🎲** | T212 | `stop1-t212` — stopul e atins mâine (`stop1` din `Probabilitati.pentruActiune`); `sare1-t212` — deschiderea de mâine e sub stop (`sare1`); `cursa5-t212` — ținta înaintea stopului în 5 zile de bursă (`cursa5.tinta`) | 1–5 zile de bursă | 🎲 (`pentruActiune`) la momentul cazului | zilele (1 zi) / săptămânile (5 zile) | T212: pozițiile și ideile |
| **C · direcția** | T212 | `directie-t212` — închiderea de peste 5 zile de bursă strict mai mare | 5 zile | 🎲 (frecvența urcării în starea de acum) sau 50% | săptămânile | T212 |
| **A · rezultatul tău** | T212 | `rezultat-t212` — perechea de trade închisă pe plus după comisioane și conversie (0,3% din valoarea cumpărată, ca la urmărirea revenirilor) | până la vânzare | rata ta / rata pe acțiune (trase spre medie, k = 10) | zilele de cumpărare | T212: pozițiile și ideile |

Precizări: „trasă spre medie” și „cea mai bună dintre ele” sunt cele din specul rețelei (02.10). Nivelurile pe acțiuni sunt relative la închiderea
zilei (`stop / p − 1`, `tinta / p − 1`), ca în `pentruActiune`. Egalitatea la direcție contează „nu”.

## Arhitectura

```
NOAPTEA (02–05, o dată pe zi; sau steagul data/retea/porneste-acum)                   LA FIECARE TURĂ 🎲 / LA DESEN
colector (tura-retea) ─ ore/, boti.json, zile/<ticker>.json, trade-uri.json ─┬─► retea/antreneaza.mjs        (TF.js, ≤ 30 min)  → modele.json
                                                                             └─► retea/antreneaza-arbori.mjs (JS curat, ≤ 30 min) → modele-arbori.json
   POST action=retea  ──► KV `retea`  (≤ 512 KB)  ──GET──► pagina: Retea.pentruBot / pentruPornire / pentruActiune
   POST action=arbori ──► KV `arbori` (≤ 2 MB)    ──GET──► pagina: Arbori.pentruBot / pentruPornire / pentruActiune
colectorul la tura 🎲: rez.retea (ca azi) + rez.arbori  → POST action=prob (aceeași cheie prob:<bot>)
```

1. **`public/lib/arbori.js`** — modul pur (IIFE, `globalThis.Arbori`), ES5, fără dependențe. Se încarcă DUPĂ `retea.js`, pentru că
   **trăsăturile sunt ale rețelei**: `Retea.trasaturiBare`, `Retea.intrare`, `Retea.trasaturiBot` și, nou, `Retea.trasaturiZilnice` /
   `Retea.intrareActiune`. Arborii n-au trăsături proprii — aceeași cifră intră în amândouă modelele.
   - `prezice(model, x)` — suma arborilor peste scorul de pornire, sigmoid, media semințelor; `null` la intrare greșită;
   - `verdict(model, acum)` — exact `Retea.decide` (același prag „dovedită”), refolosit, nu copiat;
   - `pentruBot(modele, bare, o, btc)`, `pentruPornire(...)`, `pentruActiune(...)` — aceleași intrări ca omologii din `Retea`;
   - `randuri(...)` nu există: rândurile le dă `Retea.randuri`, care primește acum **ambele** familii de modele (`{ retea, arbori }`) și scrie
     „🧠 x% · 🌳 y% · 🎲 z%”.
2. **`retea/arbori.mjs`** — algoritmul (antrenare), ESM, fără dependențe: `antreneazaArbori(X, y, o)` → model; `preziceArbori(model, x)`
   (aceeași aritmetică ca `Arbori.prezice`, proba le compară bit cu bit).
3. **`retea/antreneaza-arbori.mjs`** — orchestratorul, copia structurii lui `antreneaza.mjs`: aceleași rânduri (`date.mjs`, plus `date-t212.mjs`),
   aceeași verificare (`verifica.mjs`, cu `antreneaza`/`prezice` injectate), cache-ul lunilor în `luni-arbori-<țintă>.json`, ieșirea
   `data/retea/modele-arbori.json` (scris o dată, la sfârșit), cheia = `versiune|hiperparametri|hash-ul codului`.
4. **`retea/date-t212.mjs`** — rândurile pe acțiuni (vezi „Datele pe acțiuni”), folosit de amândoi antrenorii.
5. **`scripts/lib/tura-retea.mjs`** — după antrenorul rețelei pornește și antrenorul arborilor (`spawn`, prioritate scăzută, oprit la 35 min),
   citește `modele-arbori.json` și îl urcă la `action=arbori`. Dacă unul pică, celălalt merge mai departe; modelul vechi rămâne.
   Noaptea strânge și datele pe acțiuni: barele zilnice (2 ani, Yahoo prin `/api/t212?action=preturi&interval=1d`, universul ideilor:
   Nasdaq-100 + lista lui + acțiunile pe care a câștigat; o pagină pe zi pe ticker, cu buget) în `data/retea/zile/<ticker>.json`, QQQ la fel,
   și trade-urile închise (`T212.perechi(umpleri).inchise`) în `data/retea/trade-uri.json`.
6. **Serverul:** `functions/api/istoric-bot.js`, `action=arbori` — GET pentru pagini, POST de la colector, cheia KV `arbori`, corpul ≤ 2 MB,
   validat: cel mult 12 modele, fiecare cu `baza` număr, `pas` număr, `arbori` listă de cel mult 3 semințe × 150 de arbori, fiecare arbore
   o listă de noduri `[trăsătură, prag, stânga, dreapta]` sau `[-1, valoare]`.
7. **Paginile:** `reteaAdu` aduce `retea` și `arbori` (două cereri, o dată la 30 de minute); blocul 🧠 devine „A doua părere”;
   T212 primește sub-blocul la poziții și la idei; fișa calculează în browser, ca azi.

## Modelul — hiperparametri fixați dinainte

Gradient boosting pe arbori de regresie, pierderea log-loss (binară), pași Newton pe frunze. **Nimic nu se caută pe lunile judecate.**

- histograme: fiecare trăsătură tăiată în cel mult 64 de cutii, pe cuantilele ferestrei de antrenare (cutiile se salvează în model);
- adâncimea 3 (cel mult 8 frunze), cel mult 150 de runde, pasul (learning rate) 0,08;
- cel puțin 40 de rânduri pe frunză; L2 = 1 pe valoarea frunzei: `valoare = −Σg / (Σh + 1)`; câștigul unei tăieturi = formula standard cu L2,
  tăietura se face doar dacă câștigul > 0;
- subeșantion 0,8 din rânduri și 0,8 din coloane la fiecare rundă (sămânță fixă, generatorul `cuSamanta` din `verifica.mjs`);
- 3 semințe; predicția = media sigmoidelor celor 3;
- scorul de pornire = logit(rata de bază a ferestrei de antrenare) — calibrarea pornește dreaptă (lecția Busolei, ca la rețea);
- oprirea timpurie: ultimii 20% din fereastră (în ordinea timpului) nu intră în antrenare; se oprește când log-loss-ul lor nu scade 10 runde
  la rând; se păstrează numărul de runde cel mai bun;
- aceleași mostre ca rețeaua (una la 4 ore pe monedă, grila de distanțe din `date.mjs`; cel mult 40.000 de rânduri, eșantionate cu sămânță);
- fără standardizare (arborii n-au nevoie); `norm` lipsește din model.
- **Mărimea:** pragurile rotunjite la 4 cifre semnificative; un model ≈ 3 semințe × ≤ 150 de arbori × 15 noduri ≈ 100 KB; 12 modele ≈ 1,2 MB.
  Peste 2 MB nu se urcă nimic (jurnal), nu un model pe jumătate.

**Formula simplă rămâne pragul** (regresia logistică din `verifica.mjs`, la optim): arborii trebuie să facă mai mult decât ea, ca și rețeaua.

## Trăsăturile — aceeași funcție pentru istoric și pentru acum

- **Crypto:** exact cele 17 ale rețelei (`Retea.TRASATURI`) + intrările pe țintă (`Retea.intrare`) + cele 9 ale botului (`Retea.trasaturiBot`).
  Nicio trăsătură nouă — altfel n-am ști dacă diferența 🌳/🧠 vine din model sau din date.
- **Acțiuni (nou, `Retea.trasaturiZilnice(bare, i, qqq, rata)`), din barele zilnice închise înainte de ziua t:**
  randamentele pe 5, 20 și 60 de zile (log, în unități de volatilitate pe 20 de zile), volatilitatea pe 20 de zile și locul ei față de
  ultimele 250 de zile (log), distanța la maximul pe 52 de săptămâni (log, în volatilități), prețul față de MA50 și MA200 (log), QQQ pe 5 zile
  (în volatilitatea lui), starea 🎲 a acțiunii (codată: trend sus/jos/lateral, după/fără mișcare), ziua săptămânii (sin/cos), rata lui de până
  atunci pe acțiune (trasă spre medie) — 14 cifre, tăiate la ±10.
  - pe țintă (`Retea.intrareActiune`): `stop1`/`sare1`: distanța relativă la stop (simplă și în volatilități pe o zi) și semnul; `cursa5`:
    ambele distanțe (țintă, stop) simple și în volatilități pe 5 zile; `directie`: nimic în plus; `rezultat-t212`: + logaritmul valorii
    cumpărate, rata lui globală de până atunci, câte trade-uri a avut înainte pe acțiune (log).
  - **Regula** (proba o verifică): la ziua t funcția dă exact același rezultat cu și fără barele de după t. Ziua t = ultima bară zilnică
    ÎNCHISĂ înainte de momentul cazului (cumpărarea lui / ideea de dimineață).

## Datele pe acțiuni (`retea/date-t212.mjs`)

- **Universul:** tickerele din `data/retea/zile/` (cele strânse noaptea). Istoricul: ≤ 2 ani (Yahoo); prima lună judecată după un an de
  antrenare (specul rețelei), deci la început ~10 luni de verificare.
- **Mostrele B/C:** o mostră pe ticker și pe zi de bursă, cu nivelurile: stop la −2, −3, −5, −8 și −10% (pentru `stop1` și `sare1`);
  perechi țintă/stop pentru `cursa5`: +3/−3, +5/−3, +5/−5, +8/−5, +10/−5 — aceeași grilă pe care o folosește 🎲 pe idei (stopul ideii e sub
  minimul recent, ținta la 1,5–2× risc), ca intervalul învățat să acopere ce cere pagina; în afara grilei nu se dă cifră (ca `Retea.INTERVAL`).
- **Mostrele A:** perechile închise ale lui (`data/retea/trade-uri.json`, azi ~1.066), trăsăturile la ziua de dinaintea cumpărării;
  eticheta = rezultatul net − 0,3% din valoarea cumpărată > 0.
- **Etichetele** se calculează din barele de după, cu aceeași definiție ca `Probabilitati.pentruActiune` (`stop1`: deschiderea de mâine
  peste nivel și minimul de mâine ≤ nivel; `sare1`: deschiderea ≤ nivel; `cursa5`: care din țintă/stop e atins întâi în 5 zile, ținta
  judecată pe maxime și stopul pe minime, în aceeași zi stopul are întâietate — prudent).
- Rândurile poartă `t` (ziua), `tinta`, `x`, `y`, `pRef` (🎲 la momentul cazului, din `pentruActiune` pe barele de până atunci) și tickerul;
  blocurile independente: zilele pentru orizont 1, săptămânile pentru 5 zile, zilele de cumpărare pentru A.

## Verificarea și eticheta „dovedită”

Identică cu a rețelei (`verifica.mjs`, nimic reimplementat): walk-forward pe luni, antrenare pe tot ce era înainte de luna L minus o pauză
cât orizontul, judecată pe luna L; Brier, log-loss, calibrarea în 10 cutii; IC 95% prin bootstrap pe două trepte (lunile, apoi monedele /
tickerele / boții din lună); **„dovedită”** = toate patru: ≥ 100 de cazuri independente; IC-ul scorului Brier peste 0 față de reper ȘI
față de formula simplă; ultimele 3 luni ≥ 0; log-loss-ul nu mai rău decât al reperului și al formulei. Motivele au aceeași formă.

**În plus, 🌳 față de 🧠:** pe lunile judecate de amândoi (același `t`, aceeași monedă, aceleași niveluri), scorul Brier al arborilor față de
rețea, cu IC prin același bootstrap. E informație în subsol („🌳 față de 🧠: +0,012, IC [+0,003; +0,021]”), **nu prag** — „dovedită”
înseamnă „mai bun decât întâmplarea și decât formula”, nu „mai bun decât celălalt model”. Cine e mai bun hotărăște el, cu cifra în față.

## Ce vede el

- **Tablou** (`#tbProb`, sub rândurile 🎲) și **fișa** (blocul 🎲 al gridului propus): sub-blocul se numește **„A doua părere: 🧠 rețeaua ·
  🌳 arborii”**. Pe fiecare titlu 🎲 un rând: „🧠 x% · 🌳 y% · 🎲 z%”, banda ca la 🎲 pe cifra modelului dovedit (dacă e unul singur dovedit)
  sau pe 🧠 (dacă amândouă sau niciunul), și sub-rândul cu starea fiecăruia: „🧠 dovedită pe 274 de zile · 🌳 nedovedită: nu bate 🎲”.
  „La pornire, un bot ca ăsta ieșea pe plus” și „Prețul mai sus peste 24 h” la fel.
- **Poarta fișei:** rândul gri de azi devine „🧠 x% · 🌳 y% · rata ta: z% · …”. Poarta nu se schimbă.
- **T212:** același sub-bloc la fiecare poziție (lângă 🎲: stopul mâine, săritura, ținta înaintea stopului, prețul mai sus peste 5 zile) și pe
  ideile de cumpărare („un trade ca ăsta iese pe plus”), calculat în browser, cu modelele din KV și barele zilnice pe care pagina le are.
- **Modelul vechi** (> 2 zile): „🌳 model de acum N zile — antrenarea n-a mers de atunci”, ca la 🧠.
- **Subsolul** „Cum s-a verificat”: pe câte cazuri, Brier 🧠 / 🌳 / reper / formulă, IC-urile, și rândul 🌳 față de 🧠.
- **Textele:** ≤ 160 de caractere pe rând, cifrele prin TextRo, „de” prin `cate`; grupul STRICT `retea` al gărzii primește rândurile 🌳 și
  rândurile de pe T212.
- **Fără modele** (pagina publicată, KV gol, model lipsă): sub-blocul lipsește și nimic altceva nu se schimbă. Fără arbori dar cu rețea ⇒
  rândul arată doar „🧠 x% · 🎲 z%”, ca azi.

## Ce NU se schimbă

Semaforul, verdictul fișei, poarta, Consilierul, alertele, rezumatul de dimineață, nivelurile și 🎲. Arborii nu au pondere în nicio decizie și
nu trimit alerte. Rădăcina proiectului rămâne fără dependențe npm; pagina nu încarcă nicio bibliotecă. Modelele, datele și verificările stau
în `data/` (ignorat) și în KV, niciodată în git.

## Când pică ceva

- Antrenorul arborilor pică sau depășește 35 de minute ⇒ rămâne `modele-arbori.json` de ieri (și KV-ul vechi), un rând în jurnal; rețeaua nu e
  atinsă (și invers).
- Se schimbă codul / hiperparametrii ⇒ cheia nu mai bate ⇒ lunile se judecă de la zero (ca la rețea).
- Cheile T212 lipsesc sau barele unui ticker nu vin ⇒ țintele de acțiuni se sar / tickerul lipsește din rânduri; nimic inventat.
- KV-ul `arbori` lipsește ⇒ pagina arată doar 🧠; `arbori.js` nu aruncă niciodată în desen (try/catch la desen, ca la rețea).
- Un rând în afara intervalului învățat ⇒ fără cifră (`null`), ca la rețea.

## Livrările

- **L0 — ideile A1–A4 (S, prima):** vezi secțiunea de la coadă. Versiunea v100.93 cu L1.
- **L1 — arborii pe boți (M):** `arbori.mjs`, `arbori.js`, `antreneaza-arbori.mjs`, `tura-retea` (al doilea antrenor + urcarea), ruta
  `arbori`, `Retea.randuri` cu ambele familii, Tablou + fișa + poarta, garda; colectorul v101.63. Versiunea paginii **v100.93**.
- **L2 — acțiunile (M–L):** `date-t212.mjs`, barele zilnice și trade-urile strânse noaptea, `Retea.trasaturiZilnice` / `intrareActiune` /
  `pentruActiune` + `Arbori.pentruActiune`, amândoi antrenorii pe țintele T212, sub-blocul pe T212, garda; colectorul v101.64. **v100.94**.
- Fiecare livrare: probe văzute roșii întâi, revizia Opus, pozele la 1920 și 390, push, colectorul repornit (după antrenorul de noapte, nu
  peste el).

## Cum se probează (toate văzute roșii întâi)

1. **Onestitatea algoritmului** (`scripts/proba-arbori.mjs`, date sintetice cu sămânță, 6.000 de rânduri, 70/30 în timp):
   - adevăr neliniar (eticheta = 1 când `x1 > 0` XOR `x2 > 0`, zgomot 10%) ⇒ log-loss-ul arborilor pe test ≤ al formulei simple − 0,15;
   - adevăr liniar (logit = 1,2·x1 − 0,8·x2) ⇒ log-loss-ul arborilor ≤ al formulei + 0,01;
   - zgomot pur (eticheta independentă de x) ⇒ log-loss-ul arborilor ≤ al constantei + 0,005 (oprirea timpurie nu lasă supra-antrenare);
   - calibrarea: pe adevărul liniar, media prezicerilor în fiecare din 10 cutii la ≤ 0,05 de frecvența reală.
2. **Același număr peste tot:** modelul exportat de antrenor, dat lui `Arbori.prezice` (ES5, încărcat cu `new Function`), dă aceleași
   predicții ca `preziceArbori` din antrenor pe 1.000 de rânduri (diferență ≤ 1e−9).
3. **Trăsăturile zilnice** la ziua t: identice cu și fără barele de după t; `pRef` din `pentruActiune` pe barele de până la t.
4. **Etichetele pe acțiuni:** cazuri de mână (stop atins mâine da/nu, săritura, cursa cu ținta și stopul în aceeași zi ⇒ stop).
5. **Verificarea:** `antreneaza-arbori.mjs --rad <dosar de probă>` pe un dosar mic cu rânduri sintetice produce `modele-arbori.json` cu
   `verificare` completă și motivele în forma gărzii; cheia schimbată ⇒ lunile se refac.
6. **Ruta:** POST `arbori` refuză un model fără `arbori`/`baza`, > 12 modele, > 2 MB; GET întoarce ce s-a pus.
7. **Pagina** (harness vm pe `Retea.randuri` cu `{ retea, arbori }`): rândul „🧠 x% · 🌳 y% · 🎲 z%”, starea fiecăruia, subsolul cu
   „🌳 față de 🧠”; fără arbori ⇒ rândul de azi; fără niciun model ⇒ nimic.
8. **Garda:** grupul `retea` STRICT fără abateri cu rândurile noi.
9. **Pozele** 1920/390: Tablou, fișă (poarta), T212 (poziții + idei).

## Riscuri spuse dinainte

- `cursa`, `atinge-168` și `rezultat` sunt nedovedite și la rețea din lipsă de cazuri (40 din 100 la cursă); arborii nu vor schimba asta —
  rezultatul cinstit e „nedovedită: prea puține cazuri”.
- Pe acțiuni rândurile sunt corelate între tickere (aceeași zi de bursă): bootstrap-ul pe luni × tickere și blocurile pe săptămâni țin
  cont; tot aștept IC-uri largi în primele luni.
- Supra-antrenarea e riscul propriu al arborilor: adâncime 3, 40 de rânduri pe frunză, subeșantion, oprire timpurie; proba de zgomot pur
  e paznicul.
- Timpul: histogramele fac antrenarea rapidă (zeci de secunde pe țintă); verificarea reface modelul pe fiecare lună, deci ~10 modele pe
  țintă pe noapte; bugetul de 30 de minute se respectă ca la rețea (lunile judecate se păstrează).
- Mărimea JSON-ului (~1,2 MB o dată la 30 de minute): pe PC nimic; pe telefon prin Tailscale se simte abia la prima deschidere.

## Ideile A1–A4 din raportul v100.92 (L0, mărginite)

- **A1 — plierea fișei:** cheia secțiunii = titlul fără cifre (`"Proba pe ultimele N zile"` → `"Proba pe ultimele zile"`), ca redesenul să nu
  o replieze; capul primește `aria-expanded`; Enter și Space pe cap pliază/depliază (ascultător `keydown` delegat pe `#grFisa`);
  săgețile și cursorul intră sub `@media (max-width:600px)`; `--grSus` se remăsoară la `resize`/`orientationchange`.
- **A2 — garda și textele Busolei:** situație STRICT pentru `Busola.comparaInterval` (mai îngust / mai larg / cam la fel, ≤ 110);
  motivul semaforului devine „Busola: după agitație gridul pierde −0,17 pp pe episod” (54 de semne; `NUME_SFAT.busola` la fel);
  `SOC.busola = "busola"` și `PRIO.busola` după `aglomerare` în `consiliu.js`, ca motivul să primească cipul de încredere și locul lui.
- **A3 — `retea` în `pentru-busola.json` (livrarea 2 a contractului):** pe fiecare monedă cu bot deschis, la fiecare tură (o dată pe oră),
  `{ simbol, tinta: "atinge-24", p, dovedita, la }` din `Retea.pentruBot` pe nivelurile gridului botului (ieșirea în jos în 24 h); forma se
  confirmă cu sesiunea Busolei (cimin-eb) înainte să intre în fișier — până atunci câmpul rămâne `[]`.
- **A4 — caseta lipicioasă pe telefon:** sub 600 px, după ce derulezi de ea, caseta ține doar eticheta (o atingere o deschide la loc);
  motivele rămân sub ea, nelipicioase (cum e azi). Măsurat la 390: înălțimea casetei derulate ≤ 60 px.
