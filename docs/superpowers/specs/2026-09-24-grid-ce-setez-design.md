# 🧮 Grid — ce setez acum? (design, v78.0)

**Data:** 2026-09-24 · **Cerut de:** Marius · **Stare:** design aprobat în discuție, spec de revizuit

## 1. Ce vrea (cu vorbele lui)

> „un script care calculează în timp real pe coinul live, pe condițiile de piață, pe trend etc
> valorile optime pentru un gridbot Pionex … să mi arate dacă intru acum ce ar trebui să setez în Pionex"

> „chiar dacă e direcțional nu e o problemă, important să iasă și gridul și direcția"

## 2. Hotărârile luate în discuție

| Întrebare | Răspunsul lui |
|---|---|
| Tip de grid | **Futures grid pe PERP** (ca boții lui: `MET.PERP`, `COTI.PERP`) |
| Cum ajunge la fișă | **Alege el moneda** (orice PERP Pionex) |
| Direcție + levier | **Le propune scriptul**; el le poate schimba și fișa se recalculează |
| Orizont | **1–3 zile** ⇒ selector 1z / 2z / 3z, implicit 2z |
| Abordare | **B: calculator + proba pe istoric** (nu pornește boți; cheia rămâne doar-citire) |
| Direcția | **Iese MEREU** (LONG / SHORT / NEUTRU, cu tărie), nu se ascunde după „neutru" |

## 3. Ce NU promite (spus pe față)

- Un set „optim" care garantează profit **nu există**. Busola a măsurat (20.09) gridul pe date
  nevăzute: net **negativ** în medie; singurul lucru dovedit e **„nu porni grid după mișcare"**.
- Fișa dă valori calculate + **dovada pe istoricul monedei** + verdict. Hotărârea rămâne a lui.

## 4. Unde și cum arată

Fereastră nouă în Crypto Radar: **„🧮 Grid — ce setez acum?"**. Intrări: moneda (PERP Pionex),
suma (USDT), orizontul (1z/2z/3z), opțional direcția și levierul (suprascriere). Se recalculează
singură la ~5 min cât e deschisă și la orice schimbare de intrare.

Fișa, de sus în jos:

1. **Verdict mare:** 🟢 PORNEȘTE / 🟡 AȘTEAPTĂ / 🔴 NU PORNI + motivul într-o propoziție.
2. **Direcția:** 📈 LONG / 📉 SHORT / ↔️ NEUTRU + tăria (slab/mediu/tare) + motivul.
   Dacă proba o contrazice, scrie pe față: *„trendul zice LONG, dar pe 30 de zile NEUTRU a ieșit
   mai bine"* — nu schimbă pe tăcute.
3. **Setările de copiat în Pionex**, în ordinea formularului lor: direcție · limita de jos ·
   limita de sus · nr. grile · levier · sumă · stop jos/sus — fiecare cu buton „copiază".
4. **În bani:** profit net pe grilă (% și $) · preț de lichidare + distanța față de marginea
   gridului · minimul pe ordin verificat.
5. **Proba pe istoric:** tabel LONG | NEUTRU | SHORT — median, cea mai proastă fereastră,
   ieșiri din interval, lichidări; ⭐ pe recomandată; rezultatul pe **ultimele 10 zile nevăzute**.
6. **Când îl oprești:** stop-urile + semnalul „gata liniștea" (alertele ntfy existente).

Merge **doar local** (pe Cloudflare Pionex refuză IP-ul — vezi v72); pe `pages.dev` fișa spune
„Pionex nu răspunde de aici — deschide Radarul de acasă", nu cifre goale.

## 5. Cod — trei bucăți

| Fișier | Rol | Rețea |
|---|---|---|
| `public/lib/grid-calcul.js` | interval, grile, direcție, levier, lichidare, verdict | nu |
| `public/lib/grid-proba.js` | simulatorul futures grid pe lumânări + alegerea variantei | nu |
| `public/app.js` (bucată) | aduce lumânările, cache, desenează fișa | da |

Același tipar ca `lib/directie.js` / `lib/scenariu.js` (IIFE, expus pe `window` și `module.exports`
pentru testele Node).

**Datele:** `/api/market?type=pionex_klines` (există). 30 de zile pe `15M` = 2.880 lumânări ⇒
~6 cereri de 500 cu `endTime` (de adăugat în `market.js` dacă lipsește), **una după alta cu
pauză**, puse în cache în memorie + `localStorage` pe (monedă, oră) ca să nu repetăm (429).
4H / 1D pentru trend: aceeași rută.

## 6. Calculul (`grid-calcul.js`)

Orizontul `H` ∈ {1, 2, 3} zile.

1. **Lățimea intervalului:** pe 30 de zile, pentru fiecare fereastră de `H` zile (pas 6h),
   `(max high − min low) / preț`. Lățimea = **percentila 75** (variantele probei: 60 / 75 / 90).
2. **Plasarea:** NEUTRU = centrat pe preț; LONG = 60% deasupra / 40% dedesubt; SHORT = invers
   (înclinare maximă 60/40).
3. **Pasul grilei (geometric):** comision 0,05%/umplere ⇒ ~0,10% pe dus-întors. Pas minim =
   **0,35%** (net ≥ 0,25%). Pasul maxim = legat de mișcarea tipică pe 15M (mediana `high−low` pe
   15M × 3), ca grilele să se umple. Variantele probei: pas mic / mediu / mare în acest culoar.
4. **Nr. grile** = `ln(sus/jos) / ln(1+pas)`, rotunjit; strunit la limitele Pionex (2…150) și la
   minimul pe ordin: `suma × levier / grile ≥ minOrdin`. Dacă nu încape ⇒ „îți trebuie cel puțin X USDT".
5. **Direcția (mereu dată):** scor din trend 4H + 1D (EMA20 vs EMA50 + panta EMA50),
   structură (maxime/minime crescătoare vs descrescătoare pe 4H) și poziția prețului în range-ul
   pe 7 zile. Scor ⇒ LONG / SHORT / NEUTRU + tărie slab/mediu/tare.
6. **Levierul:** cel mai mare `L ≤ 5` la care prețul de lichidare (marjă izolată = suma,
   poziția plină la marginea periculoasă) stă **la cel puțin încă o lățime de interval** dincolo
   de marginea gridului. Suprascris de el peste limită ⇒ fișa roșie.
7. **Regimul „acum":** raport mișcare = `|mișcare 4h| / mediana |mișcare 4h| pe 30z`
   (și la fel pe 24h). **> 1,5 ⇒ MIȘCARE.**
8. **Verdict:**
   - 🔴 NU PORNI: MIȘCARE, **sau** mediana probei pe direcția recomandată < 0, **sau** lichidare în probă.
   - 🟡 AȘTEAPTĂ: liniște dar proba la limită (mediana în [0; 0,3%]) sau prețul în ultimii 10% ai range-ului pe 7z,
     sau mai puțin de 30 de zile de istoric.
   - 🟢 PORNEȘTE: liniște + mediana > 0,3% + 0 lichidări + validarea pe 10 zile nevăzute nu e negativă.
9. **Stop-uri:** `stopJos = jos × (1 − 2×pas)`, `stopSus = sus × (1 + 2×pas)` — două grile
   dincolo de margine, deci mereu **înaintea** lichidării (care stă la o lățime întreagă). Testat.

Toate pragurile (75%, 0,35%, 1,5×, 5×, 0,3%) sunt **constante numite la capul fișierului**.

## 7. Proba (`grid-proba.js`)

**Simulatorul**, pe lumânări 15M, drumul în lumânare: verde O→L→H→C, roșie O→H→L→C.

- Nivelurile geometrice între `jos` și `sus`; cantitatea pe grilă = `suma × L / grile / preț_nivel`.
- **NEUTRU:** pornește fără poziție; ordine de cumpărare sub preț, de vânzare deasupra.
- **LONG:** la pornire cumpără poziția pentru grilele de deasupra prețului; apoi grid obișnuit.
- **SHORT:** oglinda lui LONG.
- Fiecare umplere plătește 0,05%; fiecare dus-întors închis intră în profitul realizat.
- La fiecare punct din drum: **lichidare** (capital = suma + realizat + nerealizat ≤ marja de
  întreținere ⇒ lichidat, pierdere = suma), **stop** (închide tot), **ieșire din interval** (numărată).
- La finalul ferestrei: **net = realizat + valoarea poziției rămase − comisioane** (în %  din sumă).

**Variantele:** 3 direcții × 3 lățimi × 3 pași = **27**, fiecare pe ferestre de `H` zile care
pornesc la fiecare 6h ⇒ fișa scrie și **nr. echivalent de ferestre independente** (`30 / H`).

**Alegerea (anti-noroc):**
- Se alege pe **primele 20 de zile**, se raportează și pe **ultimele 10** (nevăzute).
- Scor = mediana, cu condiția 0 lichidări; câștigă varianta a cărei **medie a vecinilor**
  (lățime ±1, pas ±1) e cea mai bună — platou, nu vârf.
- Direcția recomandată în tabel = cea mai bună după regula de mai sus; dacă diferă de direcția
  din trend ⇒ mesajul de contrazicere din §4.2.

## 8. Când nu se poate

- 429 / fără lumânări ⇒ „fără date, nu calculez" (niciodată `0` pentru lipsă — `Number(null)===0`).
- Istoric < 30 zile ⇒ proba spune pe câte zile a rulat; verdictul maxim 🟡.
- Sumă sub minim ⇒ suma necesară.
- Moneda nu există ca PERP ⇒ mesaj clar.
- Local vs `pages.dev` ⇒ vezi §4.

## 9. Verificare (înainte de „gata")

1. **Teste scrise ÎNAINTE** (`scripts/grid-v78.mjs`, `npm run test:grid`, intră în `npm test`):
   - canal sinusoidal în interval ⇒ NEUTRU câștigă exact suma socotită de mână;
   - trend care iese din interval ⇒ ieșire numărată, net = realizat + poziția rămasă;
   - prăbușire la levier mare ⇒ lichidare;
   - calculul: lățime, pas ≥ 0,35%, grile, levier, lichidare pe cifre cunoscute;
   - lipsa datelor ⇒ „fără date", nu zero.
   Fiecare test văzut **picând** înainte să treacă.
2. **Date reale:** codul chemat pe lumânările reale `MET.PERP` + 2–3 monede; cifrele citite.
3. **Ecran:** Radarul local, fereastra deschisă, butoane apăsate, poză la 1440 și 390 px, consola curată.
4. Badge **v78.0** + `CACHE` nou în `sw.js`; garda de accent grav în HTML; `npm test` întreg verde.

## 10. În afara lui v78.0

- Pornirea botului din Radar (cere cheie cu drept de tranzacționare — respins).
- Clasament „care monede sunt bune de grid acum" (poate veni după, pe același motor).
- Grid spot.
