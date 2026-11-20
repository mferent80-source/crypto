# v100.373 · Tabloul botului: marginea în capul paginii — ce s-a măsurat (20.11.2026)

Cererea lui: „putem să optimizăm pagina botului, la verdicte etc. și idei?” ⇒ audit cu doi revizori (cod, statistică), hotărârile lui
(capul = marginea contra botului; orizonturi de 1 h / 4 h / 24 h; rândul de cost), apoi lucrul. Aici stau cifrele din spatele paginii,
cu scripturile din care ies. Datele: arhiva boților închiși și registrele de pe VPS, citite pe 20.11.2026 (doar citire).

## 1. Banii lui, pe boții închiși (contabilitate, nu prognoză)

2.465 de boți futures închiși, 21.12.2025 – 20.11.2026. Netul = realizat + comisioane + funding (se potrivește cu banii întorși la 94,9 %
din boți, sub 0,5 USDT diferență).

| Ce | Cifra |
|---|---|
| Net | −6.765,5 USDT |
| Grile (după comisionul perechilor) · poziția · comisioane · funding | +4.975,1 · −8.485,2 · −3.075,4 · −180,0 |
| Pe plus | 57,0 % |
| Câștig mediu față de pierdere medie | 8,6 față de 19,0 ⇒ i-ar trebui 68,8 % pe plus |
| Închiși cu prețul trecut de margine, contra botului | 176 (7,1 %): −9.855,0; ceilalți 2.289: +3.089,5 |
| Din cei 176: estimat pierdut DINCOLO de margine (suma × levierul × distanța de după margine, plafonat la pierderea botului) | −4.900,4 (49,7 %); 63 de boți au trecut cu peste 2 % (−4.272,7) |
| Cât ține un bot | mediana 21,3 minute; la 1 h ajung 34,0 %, la 4 h 18,0 %, la 24 h 3,5 %, la 7 zile 15 boți |
| Sub 15 minute | 1.084 de boți (44,0 %): net −2.017,5, din care comisioane −1.174,8 |
| Rezultatul merge cu poziția, nu cu grilele | r = 0,94 (r² 88,8 %); semnul rezultatului = semnul poziției la 94,6 % din boți; abaterea poziției 11,7 % din sumă, a grilelor 2,4 % |

La pornire nimic nu desparte câștigul de pierdere: 12 comparații anunțate dinainte (trendul contra, ADX, starea pieței, lățimea, pasul, ora,
long / short, moneda, repornirea, ce ar fi zis fișa), corectate pentru câte sunt, verificate pe ultima treime de timp — niciuna nu trece
(cel mai mic p 14,9 %, pragul corectat 0,4 %). „Trendul împotriva botului” nu e susținut în niciuna din patru priviri.

Scripturile revizorului statistic (păstrate în afara depozitului, în dosarul sesiunii): `01-banii.py … 09-pe-treimi.py`; verificarea
independentă: `tb-verif-stat.mjs`, `tb-trader.mjs`.

## 2. Cifrele noi din cap: „atinge marginea în 1 h / 4 h / 24 h” — probate pe date nevăzute

Ipoteza și pragul, scrise înainte de rezultat: frecvența din `Probabilitati.pentruBot`, socotită doar pe barele de până la clipa t, spune
cât de des e atins un nivel la x % de preț în următoarele 1 / 4 / 24 de ore. Se poate arăta ca cifră dacă, pe fiecare orizont: (a) Brier sub
cel al ratei de bază; (b) în fiecare cutie cu cel puțin 30 de cazuri, abaterea e de cel mult 10 puncte; (c) cutiile urcă.

Mers înainte pe barele de 1 h ale colectorului (HYPE, SOL, XLM, XMR, DOGE; 67 de clipe la 48 h pe monedă; distanțe 1 %, 1,5 %, 2,5 %, 4 %,
jos și sus): 2.010 cifre judecate. O singură rulare (`scripts/cercetare-v100373-marginea.mjs`).

| Orizont | Atins | Brier (cifra / rata de bază) | Cutiile (zis ⇒ atins) | (a) (b) (c) |
|---|---|---|---|---|
| 1 h | 4,8 % | 4,3 / 4,5 | 2,4 ⇒ 1,9 (520) · 14,5 ⇒ 14,9 (134) · 30,2 ⇒ 12,5 (16: nejudecată) | trece |
| 4 h | 14,3 % | 10,9 / 12,3 | 3,9 ⇒ 2,7 (295) · 17,8 ⇒ 14,6 (158) · 35,5 ⇒ 29,5 (193) · 56,6 ⇒ 33,3 (24: nejudecată) | trece |
| 24 h | 46,3 % | 21,3 / 24,9 | 17,9 ⇒ 19,2 (130) · 37,1 ⇒ 39,2 (194) · 63,3 ⇒ 59,7 (263) · 80,1 ⇒ 72,9 (70) | trece |

Limite: la 4 h cifra zice cu 3–6 puncte prea mult (partea prudentă); la valori mari (peste 50 % la 4 h, peste 25 % la 1 h) sunt prea puține
cazuri ca să se judece; monedele aceleiași clipe se mișcă împreună, deci dovezile sunt mai puține decât numărul de cifre (≈ 130 de zile).
Pe pagină: cifrele de 4 h și de 24 h intră în jurnalul de calibrare al colectorului (`iese-jos-4`, `iese-jos-24`, …) și se judecă după
orizontul lor. Cele de 1 h NU intră: judecata pornește la prima oră întreagă de după notare, iar la un orizont de o oră decalajul e cât
orizontul (pe o simulare a revizorului: promis 8,4 %, judecat 15,2 %) — calibrarea lor ar ieși strâmbă; rămân sprijinite pe proba de mai sus.

Vechimea: proba validează cifra la prețul din clipa socotelii. Colectorul le reface o dată pe oră sau, cel mult la 10 minute, când distanța
până la o margine s-a schimbat cu peste o cincime (`seReface`); între timp, dacă distanța s-a schimbat atât, capul paginii spune că cifrele
sunt depășite („o atinge mai des decât arătau cifrele socotite cu marginea la 1,4 %: acum e la 0,2 %”) în loc să le arate ca valabile.
Pe bare sintetice, între 1,5 % și 0,5 % de margine cifra de 1 h trece de la 0,5 % la 27,8 %.

## 3. Ce NU s-a putut măsura

- „Stopul la margine ar fi salvat bani?”: cei −4.900,4 de dincolo de margine sunt partea care s-ar fi oprit; câți boți au atins marginea
  și s-au întors pe plus nu se știe (arhiva nu ține drumul botului) ⇒ I-898.
- Rândurile brute ale registrului sfaturilor și ale jurnalului Monte Carlo (doar sumarul e păstrat) ⇒ I-898.
- Scorul Monte Carlo pe 7 zile e judecat la închidere (mediana după 1 h): nu confirmă și nu infirmă verdictul ⇒ I-899.

## 4. Comparații făcute

Revizorul statistic: 43 anunțate dinainte + 15 pe drum. Proba cifrelor din cap: o ipoteză, trei orizonturi, o rulare. Analiza de trader
(`tb-trader.mjs`): patru întrebări descriptive, fără test.

## 5. Analiza de trader pe boții închiși (întrebările scrise înainte de rezultat; contabilitate, nu reguli probate)

Aceiași 2.465 de boți. Scripturile sunt în dosarul sesiunii (`tb-trader.mjs`, `tb-stop-margine.mjs`, `tb-farastop.mjs`).

| Întrebarea | Ce a ieșit |
|---|---|
| T1 · De unde vine rezultatul unui bot: poziție sau grile? | Din poziție: r = 0,94 (r² 88,8 %); semnul rezultatului = semnul poziției la 94,6 % din boți; abaterea poziției 11,7 % din sumă, a grilelor 2,4 %. Un „bot grid” de-al lui e, pe bani, o poziție cu levier. |
| T2 · Cât din pierderea celor 176 s-a făcut dincolo de margine? | Estimat −4.900,4 din −9.855,0 (49,7 %); 63 de boți au trecut cu peste 2 % (−4.272,7), 31 cu peste 5 % (−2.805,0); primii 10 fac −2.622,3. |
| T3 · Plata | Câștig mediu 8,6 față de pierdere 19,0. Pierderea medie urcă odată cu durata: 11,2 (sub 15 minute) · 15,5 · 25,7 (1–4 h) · 32,5 (4–24 h) · 63,5 (peste 24 h, unde i-ar trebui 82,1 % pe plus și are 53,5 %). |
| T4 · Mărimea | Sfertul cu expunerea cea mai mare (suma × levierul peste 2.582,5 USDT): 616 boți, −3.466,5 (jumătate din pierdere). |
| T5 · Unde era stopul celor 176 | La 110 stopul se poate citi ca preț: 83 îl aveau chiar la margine (de aceea mediana e la 0,8 % dincolo), 13 la peste 2 % dincolo. 33 n-aveau NICIUN stop: −3.342,0, închiși în mediană la 7,7 % dincolo de margine. |
| T6 · Cu stop față de fără stop, pe toți | Cu stop: 2.094 de boți, −4.113,3, 55,4 % pe plus, cea mai mare pierdere −404,2. Fără stop: 371 de boți, −2.652,2, 66,0 % pe plus, dar cei mai răi 18 fac −3.122,1 (cea mai mare −878,6). Fără stop și ținuți peste 24 h: 38 de boți, −1.853,4 (cu stop, peste 24 h: 48 de boți, −52,2). |
| Costul | Comisioane −3.075,4 = 45,5 % din pierderea netă. La boții de sub 15 minute cu levier peste 20× (357): comisioane −561,3 dintr-un net de −566,5. |

Ce NU spun cifrele: cine pune stop e alt fel de bot (levier, durată, clipa pornirii), iar boții lungi fără stop sunt cei rămași pe minus
și neînchiși — e selecție, nu cauză. „Stopul la margine ar fi salvat X” e un plafon: nu se știe câți boți au atins marginea și s-au întors.
