# Rețeaua neuronală (TensorFlow.js) — a doua părere, verificată, pe Tablou, fișă și Trade 212 (design)

**Data:** 02.10.2026 · **Cerut de el:** „o rețea neuronală (TensorFlow) POȚI INTEGRA ÎN PAGINA BOTULUI ȘI ÎN TRADE 212?” · țintele: **toate trei** („Rezultatul tău”, „Aceleași ținte ca 🎲”, „Direcția prețului”) · designul prezentat în chat și aprobat („Da, scrie specul”).
**Înrudit:** `2026-10-01-consiliere-personalizata-design.md` (🎲 pe boți), `2026-10-01-actiuni-t212-creier-design.md` (🎲 pe acțiuni).
**Schimbat după aprobare (02.10, cu acordul lui, după lecțiile rețelei Busolei):**
1. Formula simplă (regresia logistică pe aceleași trăsături) devine **prag**: „dovedită” numai dacă rețeaua bate și reperul, și formula.
2. Intervalul de încredere se socotește **pe două trepte**: întâi lunile, apoi monedele din ele.
3. TensorFlow.js rulează pe **WebAssembly**. Varianta JavaScript pură e de câteva sute de ori mai lentă: la Busola, 89 s pentru 4.096 de rânduri, față de ~1,1 s pentru 50.000 pe WebAssembly.
4. Pionex dă lumânări de 1 h până la **~400 de zile** în urmă (verificat pe 02.10: 400 de zile merge, 420 nu).

## Ce vrea el (și ce am presupus)

- **El:** o rețea neuronală TensorFlow în pagina botului și în Trade 212, pe toate cele trei ținte.
- **Presupus (nespus):** rețeaua e o **a doua părere afișată**, nu o decizie; nimic din ce există nu se schimbă; antrenarea se face acasă, telefonul doar citește.
- **Datele lui (măsurate):**
  - **crypto (02.10):** 52 de monede × ~4.440 de bare de 1 h (~185 de zile, `data/istoric-1h`); 2.257 de boți închiși în arhivă; 2.156 de cazuri (`Asemanatoare.cazuri`), dintre care 431 cu starea pieței de la pornire;
  - **Trade 212 (01.10):** 1.066 de trade-uri închise; bare zilnice pe 2 ani (Yahoo).
- **Reperele de bătut:**
  - 🎲 — frecvențele din trecut, cu interval de încredere și calibrare (`probabilitati.js`);
  - direcția pe metoda veche — „48,8% — cât dat cu banul” (măsurat în v74.6, `indicatori-bot.js`).

## Cele trei ținte, exact

| | piața | ce prezice | orizontul | reperul de bătut | unde apare |
|---|---|---|---|---|---|
| **A · Rezultatul tău** | crypto | botul se închide pe plus NET (după comisioane și funding) | până la închidere | rata ta de până atunci, pe toți boții închiși înainte de pornire, și rata pe monedă trasă spre medie (k = 10) — se ia **cea mai bună** dintre ele, pe aceleași cazuri | fișa (poarta), Tablou („la pornire, un bot ca ăsta…”) |
| | Trade 212 | trade-ul se închide pe plus după comisionul de conversie | până la vânzare | la fel: rata ta globală și rata pe acțiune, trase spre medie | pagina T212: pozițiile deschise și ideile de cumpărare |
| **B · Aceleași ținte ca 🎲** | crypto | ieșirea din grid în jos/sus în 24 h și 72 h; lichidarea în 7 zile; ținta înaintea stopului în 7 zile; liniștea mai ține 24 h / 48 h (exact evenimentele din `Probabilitati.pentruBot`) | 24 h – 7 zile | 🎲 la momentul cazului (`Probabilitati`, doar cu barele închise până atunci) | Tablou, fișa |
| | Trade 212 | stopul mâine; săritura peste stop la deschidere; ținta înaintea stopului în 5 zile de bursă (din `Probabilitati.pentruActiune`) | 1–5 zile de bursă | 🎲 la momentul cazului | T212 |
| **C · Direcția** | crypto | prețul mai sus peste 24 h | 24 h | 50% și frecvența 🎲 a urcării în starea de acum — cea mai bună dintre ele | Tablou, fișa |
| | Trade 212 | prețul mai sus peste 5 zile de bursă | 5 zile | la fel | T212 |

La C, eticheta e mereu „cât dat cu banul” până când ținta e dovedită.

**Precizări:**
- **„Trasă spre medie”:** (plusuri pe monedă + k × rata globală) / (boți pe monedă + k), cu k = 10. Toate trei se socotesc doar din ce se închisese **înainte** de caz.
- **„Cea mai bună dintre ele”:** reperul cu Brier-ul mai mic pe aceleași cazuri de verificare. Bara e pusă cât mai sus pentru rețea, niciodată mai jos.
- **„Mai sus”:** închiderea de peste orizont strict mai mare decât cea de acum. Egalitatea contează „nu”.

## Arhitectura

```
NOAPTEA (02–05, o dată pe zi)                                        LA FIECARE TURĂ 🎲 (o dată pe oră pe bot)
colector (tura-retea) ── data/retea/date-<tinta>.json ──► retea/antreneaza.mjs   colector: rez = Probabilitati.pentruBot(...)
   ▲  KV cazuri + arhiva, data/istoric-1h, barele T212       (proces SEPARAT, TF.js,             rez.retea = Retea.pentruBot(modele, bare, aceleași niveluri)
   │                                                          prioritate scăzută, ≤ 30 min)      → POST action=prob (cheia existentă prob:<bot>)
   │                       data/retea/model-<tinta>.json  ◄───┘
   └── POST action=retea ──► KV `retea` (modelele + verificarea) ──GET──► fișa (prezice în browser) · Tablou · T212
```

1. **`public/lib/retea.js`** — modul pur (IIFE, `globalThis.Retea`), **fără TensorFlow**:
   - `trasaturi…` — o singură funcție pentru istoric și pentru „acum”;
   - `prezice(model, x)` — trecerea înainte: straturi dense, relu, sigmoid, media ansamblului;
   - `verdict(model)` — „dovedită” / „nedovedită” și motivul;
   - `pentruBot(modele, bare, o)` / `pentruActiune(...)` — aceleași intrări ca 🎲;
   - `randuri(...)` — rândurile 🧠 pentru pagini, cu textele prin TextRo.

   Îl folosesc colectorul, fișa (în browser) și antrenorul. Aceleași trăsături peste tot înseamnă că nu există diferență între antrenare și folosire.
2. **`retea/antreneaza.mjs` + `retea/package.json`** — singurul loc cu TensorFlow.js.
   - Pachetele: `@tensorflow/tfjs` 4.22.0 și `@tensorflow/tfjs-backend-wasm` 4.22.0, pe WebAssembly. Nu cer compilare pe Windows. `tfjs-node` nu se instalează pe Node 24 de pe PC-ul lui.
   - `retea/node_modules` stă în `.gitignore`. Rădăcina proiectului rămâne fără dependențe npm.
   - Pagina publică și Functions nu-l încarcă.
   - Intrarea: `data/retea/date-<tinta>.json`. Ieșirea: `data/retea/model-<tinta>.json`.
   - Nu cere nimic din rețea și nu are token.
3. **`scripts/lib/tura-retea.mjs`** (colectorul):
   - **noaptea**, o dată pe zi, în fereastra `eNoapte`:
     - strânge datele: barele de 1 h, cazurile și arhiva, iar la livrarea 2 barele zilnice T212 și trade-urile;
     - pornește antrenorul cu `spawn` (prioritate scăzută, limită de 30 de minute, oprit la depășire);
     - citește modelele și le urcă;
     - dacă antrenorul pică, rămâne modelul vechi și scrie un rând în jurnal.
   - **la tura 🎲:** `rez.retea` se adaugă în payload-ul existent `prob:<bot>`. Nu apare nicio cheie nouă pe bot.
4. **Serverul:** `functions/api/istoric-bot.js`, `action=retea` (GET pentru pagini, POST de la colector), cu cheia KV `retea` și cel mult 500 KB.
5. **Paginile:**
   - Tablou: `tbDeseneazaProb`;
   - fișa: `grProbDeseneaza` și poarta;
   - T212 (livrarea 2): `t212-ecran.js`, lângă `Probabilitati.randActiune`.

## Trăsăturile — doar ce se știa ATUNCI

- **Din barele de 1 h închise înainte de momentul t:**
  - randamentul pe 1 h, 4 h, 24 h și 7 zile, în unități de volatilitate;
  - volatilitatea pe 24 h și pe 7 zile, și locul ei față de ultimele 30 de zile;
  - distanța până la maximul și minimul pe 7 zile, în volatilități;
  - panta trendului pe 4 h și pe 1 zi;
  - starea 🎲 (codată);
  - ora și ziua (sinus/cosinus);
  - BTC: randamentul pe 24 h și volatilitatea.
- **Pe țintă:** distanța relativă până la nivel (simplă și în volatilități) și orizontul. La „ținta înaintea stopului”, ambele distanțe.
- **Rezultatul tău (bot):**
  - direcția, levierul, lățimea gridului (%), pasul (%), numărul de grile și investiția (logaritm);
  - locul prețului în grid la pornire;
  - rata ta de până atunci, socotită doar pe boții închiși **înainte** de pornire;
  - câți boți ai avut înainte pe monedă.
- **Trade 212 (zilnice):**
  - randamentele pe 5, 20 și 60 de zile;
  - volatilitatea pe 20 de zile;
  - distanța față de maximul pe 52 de săptămâni;
  - prețul față de mediile pe 50 și 200 de zile;
  - piața (QQQ pe 5 zile);
  - rata ta de până atunci.
- **Regula:** aceeași funcție dă trăsăturile pentru istoric și pentru acum. O probă verifică că la momentul t funcția dă **exact** același rezultat cu și fără barele de după t.

## Antrenarea

- **Rețea mică:** intrările → 16 neuroni (relu, L2 1e-3) → dropout 0,2 → 8 (relu) → 1 (sigmoid).
  - Adam 1e-3, loturi de 256, cel mult 60 de epoci.
  - Oprire timpurie pe ultimii 20% din fereastra de antrenare, în ordinea timpului, cu răbdare 5.
  - 5 semințe; predicția e media lor.
  - Ieșirea pornește de la rata de bază a antrenării: bias-ul ultimului strat e logit(rata). Altfel calibrarea pornește strâmbă (lecția Busolei).
  - Semințele: în procesul antrenorului, `Math.random` e înlocuit cu un generator cu sămânță înaintea fiecărui model, ca inițializarea și dropout-ul să fie reproductibile. Dropout-ul nu primește sămânță fixă: una fixă ar repeta aceeași mască la fiecare lot.
- **Hiperparametrii sunt fixați aici.** Nu se caută pe datele de verificare; dacă s-ar căuta, verificarea ar minți.
- **Standardizarea:** mediile și abaterile vin doar din fereastra de antrenare.
- **Mostrele (crypto):**
  - una la 4 ore pe monedă (ferestrele se suprapun oricum);
  - pe fiecare mostră, distanțele din aceeași grilă cu 🎲: ±1, 2, 3, 5, 8, 12% pentru 24 h și 72 h, ±10–40% pentru lichidare.
- **Formula simplă:** regresia logistică, cu aceleași trăsături, fără strat ascuns, dusă până la **optim** (metoda Newton), cu același L2. E **prag**: rețeaua trebuie să facă mai mult decât ea.
  - *Revizuit la execuție (02.10):* antrenată „la fel” ca rețeaua (pornire aleatoare, 60 de epoci), formula rămânea neconvergentă. Pe zgomot era mai rea decât o constantă, iar rețeaua o bătea pe nedrept pe un adevăr liniar. Proba de onestitate a prins-o. Bara se pune cât mai sus, nu mai jos.

## Verificarea (walk-forward) și eticheta „dovedită”

- **Ferestrele:**
  - antrenez pe tot ce era înainte de luna L, minus o pauză cât orizontul (nicio fereastră nu se suprapune cu luna judecată), și judec luna L;
  - pornesc când antrenarea are cel puțin 60 de zile (crypto), un an (T212) sau 200 de cazuri (rezultatul tău).
- **Pe aceleași cazuri:** Brier, log-loss și calibrarea în 10 cutii, rețeaua comparată cu reperul ei (🎲, rata ta sau 50%).
- **Cazuri independente:**
  - zilele distincte, pentru 24 h;
  - blocurile de 3 zile, pentru 72 h;
  - săptămânile, pentru 7 zile sau 5 zile de bursă;
  - la rezultatul tău, zilele de pornire sau de cumpărare.
- **Intervalul de încredere:** IC 95% pentru scorul Brier (1 − Brier rețea / Brier reper), prin bootstrap **pe două trepte**: întâi lunile, cu înlocuire, apoi, în fiecare lună aleasă, monedele ei (la rezultatul tău, boții), tot cu înlocuire. Așa, săptămânile în care toată piața se mișcă împreună nu se mai socotesc drept cazuri separate. 1.000 de reeșantionări.
- **„Dovedită”** cere toate patru:
  1. cel puțin 100 de cazuri independente;
  2. marginea de jos a IC 95% peste 0 **și față de reper** (🎲, rata ta sau 50%), **și față de formula simplă**;
  3. pe ultimele 3 luni, luate singure, scorul față de reper cel puțin 0;
  4. log-loss-ul nu mai rău nici decât al reperului, nici decât al formulei simple.
- Altfel e **„nedovedită”**, cu motivul la vedere. Forma motivelor (cifrele de aici sunt doar exemple): „prea puține cazuri: 17 din 100”, „nu bate 🎲: Brier 0,183 față de 0,180”, „nu face mai mult decât o formulă simplă” sau „pică pe ultimele 3 luni”.
- **Se reface în fiecare noapte.** Predicțiile lunilor deja judecate se păstrează pe disc: datele dinaintea lor nu se mai schimbă. Fiecare noapte adaugă doar luna nou încheiată și modelul final. Totul se reface de la zero numai când se schimbă codul trăsăturilor sau al rețelei. Eticheta poate cădea înapoi la „nedovedită”, iar pagina spune asta.
- **Istoria barelor:** Pionex dă lumânări de 1 h până la ~400 de zile în urmă, iar livrarea 1 le aduce într-un depozit separat (`data/retea/ore/`). Profilul monedei rămâne pe cele 185 de zile de azi, ca sfaturile să nu se schimbe. Rezultă mai multe cazuri independente, mai ales la 7 zile.

### Ce aștept, cinstit

- **B la 24 h și 72 h:** cele mai multe cazuri, deci cea mai bună șansă.
- **B la 7 zile:** pe ~400 de zile, dintre care 60 pentru prima antrenare, rămân ~48 de săptămâni, sub pragul de 100. Rămâne „nedovedită” până se strânge istorie.
- **A-bot:** ~431 de cazuri cu stare pe 185 de zile; cu ~400 de zile de lumânări, mai multe. Probabil nedovedită o vreme.
- **Formula simplă ca prag:** la Busola, rețeaua n-a bătut-o. Mă aștept ca și aici cele mai multe ținte să rămână „nedovedite” din acest motiv. Ăsta e un rezultat cinstit, nu un eșec.
- **C:** aproape sigur „cât dat cu banul”.

Rețeaua își spune singură scorul.

## Ce vede el

- **Tablou:**
  - în blocul 🎲 (`#tbProb`), sub rândurile 🎲, un sub-bloc **„🧠 Rețeaua neuronală — a doua părere”**;
  - pe fiecare titlu 🎲, un rând „🧠 x% · 🎲 y%”, cu banda ca la 🎲, și un sub-rând cu starea;
  - în plus, „La pornire, un bot ca ăsta ieșea pe plus” (A) și „Prețul mai sus peste 24 h” (C).
- **Fișa:**
  - același sub-bloc în blocul 🎲 al gridului propus, calculat în browser cu modelele din KV;
  - la poarta de pornire, un rând gri: „🧠 Un bot ca ăsta ar ieși pe plus: x% · rata ta: y% · nedovedită (…)”. Poarta nu se schimbă.
- **T212 (livrarea 2):** același sub-bloc la fiecare poziție, lângă 🎲, și pe ideile de cumpărare („un trade ca ăsta iese pe plus”). Se calculează în browser, ca 🎲 de acolo, cu modelele din KV.
- **Starea:**
  - „nedovedită” (gri) sau „dovedită pe N cazuri”;
  - modelul mai vechi de 2 zile apare ca „🧠 model de acum N zile — antrenarea n-a mers”.
- **Ultimul rând al sub-blocului:** pe câte cazuri independente s-a verificat și cu ce rezultat (Brier rețea / reper / formula simplă, IC).
- **Textele:** cel mult 160 de caractere pe rând, cifrele prin TextRo, „de” prin `cate`. Garda textelor primește un grup nou, STRICT, `retea`.
- **Fără rețea** (pagina publicată, KV gol, model lipsă): sub-blocul lipsește și nimic altceva nu se schimbă.

## Ce NU se schimbă

- Semaforul, verdictul fișei, poarta, Consilierul, alertele, nivelurile și 🎲 rămân neatinse. Rețeaua nu are pondere în nicio decizie și nu trimite alerte. Dacă ajunge „dovedită”, ce face mai departe hotărăște el.
- Rădăcina proiectului rămâne fără dependențe npm, iar pagina publică nu încarcă TensorFlow.
- Repo-ul e public: modelele, datele și verificările stau în `data/` (ignorat) și în KV, niciodată în git.

## Livrările

1. **Boții — Tablou și fișa (efort L):**
   - `retea.js`, antrenorul, `tura-retea` și ruta `retea`;
   - țintele A-bot, B crypto și C crypto;
   - rândul de verificare.
2. **Trade 212 (efort M):** barele zilnice și trade-urile, țintele A-T212, B acțiuni și C acțiuni, pe pagina T212.

Fiecare livrare are planul ei, probele văzute întâi roșu, revizia Opus, pozele la 1920 și 390, push-ul și colectorul repornit.

## Cum se probează

- **Fără privire în viitor:** trăsăturile la momentul t ies identic cu și fără barele de după t.
- **Etichetele:** vin doar din barele de după t, în orizont. Cazurile fără orizont complet ies din calcul.
- **Walk-forward:**
  - pauza e cel puțin cât orizontul;
  - standardizarea vine doar din antrenare: o valoare uriașă pusă în test nu mută media.
- **Măsurile** (Brier, log-loss, scorul și IC-ul), pe date sintetice cu răspuns cunoscut:
  - predictorul perfect dă scorul 1;
  - reperul însuși dă 0.
- **Onestitatea** (cea mai importantă probă), pe date sintetice:
  - cu un semnal neliniar plantat (o interacțiune pe care formula liniară n-o vede), rețeaua iese „dovedită”;
  - cu un semnal liniar, rețeaua bate reperul, dar nu și formula simplă, deci iese „nedovedită: nu face mai mult decât o formulă simplă”;
  - pe zgomot pur rămâne „nedovedită”.
- **Trecerea înainte** din `retea.js` dă aceeași predicție ca TF.js pe aceleași greutăți (toleranță 1e-6).
- **Colectorul și antrenorul:**
  - colectorul se încarcă întreg;
  - dacă antrenorul pică, rămâne modelul vechi;
  - limita de 30 de minute oprește procesul.
- **Textele și pozele:** grupul STRICT `retea`, iar pozele Tablou, fișă (și T212 la livrarea 2) la 1920 și 390.

## Riscuri spuse dinainte

- **Puține cazuri independente:** cele mai multe ținte pot rămâne „nedovedite” mult timp. Ăsta e un **rezultat**, nu un eșec.
- **Piața se schimbă:** ce a mers 6 luni poate să nu meargă mâine. De aceea există verificarea pe ultimele 3 luni și refacerea zilnică.
- **Antrenarea poate trece de buget:** pe WebAssembly, o epocă de 50.000 de rânduri ia ~1,1 s.
  - Dacă o noapte tot trece de 30 de minute, lunile rămase se fac în nopțile următoare; pagina spune „verificarea în lucru: 6 din 11 luni”.
  - Dacă nici așa nu ajunge, se rărește eșantionarea (mostre la 8 ore). Verificarea nu se scurtează.
- **Costul de calcul:** noaptea, cel mult 30 de minute pe PC-ul de acasă, cu prioritate scăzută, așa că alertele nu întârzie (colectorul rămâne liber, antrenorul e alt proces).
