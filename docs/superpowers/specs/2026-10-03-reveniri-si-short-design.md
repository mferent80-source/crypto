# Reveniri (monede + acțiuni) și monede pentru short — lângă sugestiile de acum, cu istoricul pe față (design)

**Data:** 03.10.2026 · **Cerut de el:** „vreau să adaugi la fiecare și câte un modul de revers cu coinuri care au scăzut puternic și acum sunt pe revenire, la fel și la stocks, plus la coinuri și opțiunea de coinuri în short direcționat. Tot în pagina asta.”
**Hotărât de el (03.10):** (1) listele stau **lângă listele de acum** (nu o pagină nouă, nu tot pe Acasă); (2) **toate trei**, chiar dacă două ies mai slab pe datele lui — **cu istoricul pe față** și urmărite zilnic („pragul e un privilegiu: se avertizează, nu se refuză”). Designul de mai jos l-a aprobat în chat („DA”).
**Înrudit:** v100.82–84 (`restul` ideilor, „💡 Ce aș cumpăra azi” pe Acasă), `idei.js` (ideile de acțiuni și boții candidați), `grid-clasament.js` (clasamentul crypto: `stare`, `dir`, `scor`).

## Ce vrea el (și ce am presupus)

- **El:** câte o listă „pe revenire” (au scăzut puternic, acum revin) la monede și la acțiuni, plus la monede o listă pentru short, toate lângă sugestiile de acum.
- **Presupus (spus în chat, neobiectat):** la monede e vorba de boți grid — „pe revenire” = bot **long**, „pentru short” = bot **short**; la acțiuni doar long (regula lui: crypto long + short, stocks doar long); fiecare listă e un **filtru, nu o predicție**, și vine cu istoricul ei măsurat pe datele lui.
- **Nu schimbă nimic din ce există:** semaforul, verdictul, poarta ideilor, lista „Pe ce aș porni un bot acum”, alertele și Discordul rămân exact cum sunt.

## Ce arată datele lui (măsurat pe 03.10, înainte de cod)

Toate probele: un punct de judecată pe zi, **doar pe barele închise până atunci**, comparat cu „o zi oarecare” (toate punctele de judecată ale aceluiași univers).

| Lista | Universul probei | Rezultat | față de o zi oarecare |
|---|---|---|---|
| Monede pe revenire | 52 de monede (bare de 1 h → 4h, ~185–400 de zile), 47 de săptămâni; 407 intrări (cel mult una pe monedă pe săptămână) | 7 zile: **−1,2%** în medie, mediana −2,1%, **42% pe plus**, cea mai rea cădere medie −11,8% | +1,0% / −1,1%, **45%**, −9,4% ⇒ **mai slab**, la toate pragurile încercate (cădere 20–30%, revenire 5–12%) |
| Boții lui porniți „pe revenire” | 66 de boți (din 832 cu bare de 4h înainte de pornire) | 53% pe plus, mediana +0,32 USDT | toți boții: 59%, +1,23 ⇒ **puține cazuri, mai slab** |
| Monede pentru short (liniștite, direcția „short”) | aceleași 52 de monede, 6.310 puncte | prețul în 7 zile: **+0,3%** în medie, mediana −1,0% | „long”: +2,3% / −1,0% ⇒ direcția are informație (urcă mai puțin) |
| Boții lui short pe monede cu direcția „short” | 83 de boți | **49% pe plus**, mediana −0,15 USDT — **cel mai slab grup** | toți boții short: ~56%; short pe direcția „long”: 59% |
| Acțiuni pe revenire | 99 de acțiuni din Nasdaq-100, ~2 ani zilnic (89 de săptămâni); 393 de intrări | 10 zile de bursă: **+2,6%** în medie, mediana +2,0%, **59% pe plus**, cea mai rea cădere medie −9,0% | +1,3% / +0,6%, **54%**, −5,8% ⇒ **mai bine** (platou la 15–30%); ⚠ „a căzut, încă scade” iese aproape la fel (+2,2%, 58%) și universul are doar membrii de AZI ai indicelui (supraviețuitori) ⇒ cifra e umflată |

Scripturile probei (în afara repo-ului): `proba-reveniri-crypto.mjs`, `proba-reveniri-botii.mjs`, `proba-reveniri-actiuni.mjs`. Regulile de mai jos sunt **exact cele probate**, fixate acum — nu se reglează după ce se văd rezultatele.

## Cele trei liste, exact

| | Regula (toate pe bare închise) | De unde | Câte, în ce ordine |
|---|---|---|---|
| **↩️ Monede pe revenire** (bot long) | pe barele de 4h ale clasamentului: **cădere ≥ 25%** de la maximul pe 30 de zile (180 de bare) · prețul **≥ 8% peste minimul pe 10 zile** (60 de bare) · minimul s-a închis cu **cel puțin 2 zile** înainte · prețul **peste media închiderilor pe 3 zile** (18 bare) | clasamentul (top 100 PERP, o dată pe oră, 500 de bare de 4h) — **fără cereri în plus** | cel mult **5**, în ordinea volumului (cele mai lichide întâi) |
| **📉 Monede pentru short** | `stare === "candidat"` (liniște — nu „după mișcare”) **și** `dir === "short"` (direcția clasamentului = a fișei) | clasamentul | cel mult **5**, după `scor` (ca „Pe ce aș porni un bot acum”) |
| **↩️ Acțiuni pe revenire** (doar long) | pe barele zilnice: **cădere ≥ 20%** de la maximul pe 60 de zile · prețul **≥ 8% peste minimul pe 20 de zile** · minimul cu **cel puțin 3 zile de bursă** înainte · prețul **peste media pe 5 zile**; **stopul** = minimul pe 20 de zile × 0,99; **ținta** = maximul pe 60 de zile (de unde a căzut) | tura ideilor de la 8:00 (aceleași ~202 acțiuni, aceleași bare — **fără cereri în plus**) | cel mult **10**, după cădere (cea mai mare întâi) |

**Precizări:** o monedă poate fi în mai multe liste (pe revenire, candidată obișnuit, pentru short) — fiecare listă o arată, cu regula ei; listele nu se filtrează una pe alta. De obicei o monedă pe revenire nu are direcția „short”, dar nu e garantat (o revenire lentă poate fi deja „liniște”). O acțiune poate fi și idee (trece de poartă) și pe revenire — rar, pentru că poarta cere trend în sus.

## Istoricul pe față (o frază deasupra fiecărei liste)

**Forma:** „După o cădere ca asta, pe monedele tale: 42% pe plus în 7 zile, −1,2% în medie (407 cazuri, 44 de săptămâni). O zi oarecare: 45%, +1,0% ⇒ **mai slab**.” + o a doua frază cu boții lui, unde există.

- **Monede pe revenire:** pe depozitul de bare de 1 h (`data/retea/ore` + `data/istoric-1h`, agregat 4h), un punct pe zi, ieșirea în **7 zile**; cazurile: cel mult unul pe monedă pe săptămână. + **boții lui** porniți în starea asta (`data/retea/boti.json`): câți, câți pe plus, mediana netă.
- **Monede pentru short:** pe același depozit, monedele liniștite cu direcția „short”: cât a **scăzut** prețul în 7 zile (câștigul unui short = −randamentul); reperul = toate punctele, tot ca short. + **boții lui short** porniți pe monede cu direcția „short” față de toți boții lui short.
- **Acțiuni pe revenire:** pe barele zilnice ale turei (2 ani, toate acțiunile judecate), ieșirea în **10 zile de bursă**; cazurile: cel mult unul pe acțiune la 10 zile de bursă. + ⚠ „doar acțiunile care sunt azi în listă (supraviețuitorii) — cifra e mai bună decât în realitate”.
- **Eticheta:** „mai bine” dacă pe plus e cu **≥ 3 puncte** peste reper **și** media e peste reper; „mai slab” dacă ambele sunt sub (−3 puncte și media sub); altfel „cam la fel”. Sub **100 de cazuri** sau **20 de săptămâni distincte** se adaugă „puține cazuri — un semn, nu o regulă”.
- **Când se socotește:** monedele o dată pe zi, de la 8:00 (depozitul se umple noaptea); acțiunile în tura ideilor de la 8:00. Până la prima socoteală: „istoricul se socotește azi de la 8:00”.

## Urmărirea (ca la idei)

- În fiecare zi, de la 8:00, colectorul notează sugestiile zilei — pentru fiecare listă, fiecare simbol cel mult o dată pe zi, cu prețul de atunci.
- Pentru cele mai vechi de **7 zile** (monede) / **14 zile calendaristice ≈ 10 zile de bursă** (acțiuni): cât au făcut de atunci până acum (la short, câștigul = scăderea prețului), după comision (monede 0,1% dus-întors, acțiuni 0,3% conversia). Prețul de acum: la monede din tickerele Pionex PERP (acoperă și monedele ieșite între timp din top 100), la acțiuni din prețurile turei ideilor.
- Rândul de sub fiecare listă: „Din N sugestii de cel puțin 7 zile: X pe plus, Y% în medie de la prețul sugestiei (puține — mai așteaptă).” Fără nicio sugestie destul de veche: „Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită.”
- Istoricul ține 150 de zile, cel mult 2.000 de rânduri pe listă.

## Unde se văd

- **Tabloul → „💡 Pe ce aș porni un bot acum”**, dedesubt, două liste noi, cu rândurile în stilul celor de acum:
  - **„↩️ Pe revenire (bot long)”** — `MONEDĂ` căzută −32% de la maximul pe 30 de zile · +11% de la minim (acum 4 zile) · istoricul tău pe ea · **„Fișa (long)”**;
  - **„📉 Pentru short”** — `MONEDĂ` interval … · … net pe grilă · ~N treceri pe zi · direcția short (tăria) · istoricul tău · **„Fișa (short)”**.
  - „Fișa (long/short)” deschide fișa monedei **cu direcția aleasă** (`gridDirectie`).
  - Stările goale: „Acum nicio monedă nu e pe revenire.” / „Acum nicio monedă liniștită nu are direcția short.” / „Aștept clasamentul…”.
- **Trading 212 → „💡 Idei de cumpărare”**, dedesubt (după „Vezi și celelalte…”): **„↩️ Pe revenire”** — tabel: Acțiune · Acum · Căderea · De la minim · Stop · Țintă · Istoricul tău · **„Biletul”** (cât cumperi la 1% risc, ca la idei). Gol: „Azi nicio acțiune nu e pe revenire.”
- **Acasă → „💡 Ce aș cumpăra azi”**, al doilea rând: „↩️ pe revenire: acțiunile A, B (mai bine) · monedele C, D (mai slab) · 📉 short: E, F (mai slab)” — primele 2–3 nume din fiecare listă și eticheta din istoric; butoanele de acum duc deja la cele două panouri. Listă goală ⇒ „nimic azi”; fără istoric încă ⇒ fără etichetă; fără date ⇒ rândul al doilea lipsește.

## Arhitectura

- **`public/lib/reveniri.js` (nou, pur):** `monedaPeRevenire(b4h)` și `actiunePeRevenire(bareZi)` → `{cadere, deLaMin, zileDeLaMin, pesteMedie, revine}` (+ `stop`, `tinta` la acțiuni); `dovada(puncte)` → `{n, saptamani, pePlus, medie, mediana, baza:{n,pePlus,medie}, eticheta, putine}`; `textDovada(d, cum)` → fraza; `urmarire(istoric, preturi, acum, zile, short)` → `{n, pePlus, medie, text}`. Încărcat de pagină, de colector și de probe (ca `idei.js`).
- **`public/lib/idei.js`:** `reveniriBoti(cl, trades, n)` și `shortBoti(cl, trades, n)` lângă `ideiBoti` (aceeași formă de rând, cu istoricul lui pe monedă).
- **Colectorul:**
  - `tura-clasament.mjs` / `grid-clasament.js`: fiecare monedă primește `revenire` din aceleași bare (fără cereri);
  - `tura-idei.mjs`: pe aceleași bare zilnice — lista `reveniri` (≤ 10), istoricul lor (`dovadaReveniri`) și urmărirea lor;
  - **`scripts/lib/tura-sugestii.mjs` (nou):** o dată pe zi, de la 8:00 — istoricul monedelor (depozitul + boții lui) și urmărirea listelor de monede (notează sugestiile zilei din clasament, socotește urmărirea cu prețurile de acum) → `istoric-bot?action=sugestii`.
- **Serverul:**
  - `istoric-bot.js` `action=clasament`: câmpul nou `revenire` curățat (numere, `revine` boolean);
  - `istoric-bot.js` **`action=sugestii`** (nou, GET/POST): KV `sugestii` = `{la, dovada:{revenire, short}, urmarire:{revenire, short}}` + KV `sugestii-istoric` (notările, ≤ 150 de zile / 2.000 pe listă), curățate ca restul;
  - `t212.js` `action=idei`: `reveniri` (≤ 10, curățate), `dovadaReveniri`, `urmarireReveniri`; notările în `t212:reveniri-istoric` (separat de urmărirea ideilor — aceea rămâne pe primele 5).
- **Pagina:** `t212-ecran.js` (`tbIdeiRender`, `t212IdeiRender`), `acasa-ecran.js` (`acasaCumpar`), `app.js` (ajutorul „Fișa cu direcție”), `app.css` (doar ce lipsește din stilurile de acum).

## Ce NU face

- nu schimbă poarta ideilor, clasamentul (`stare`, `scor`), semaforul, verdictul, alertele, Discordul, rețeaua neuronală;
- nu pune short la acțiuni; nu pune „pe revenire” în „Pe ce aș porni un bot acum” (sunt liste separate);
- nu ascunde listele cu istoric slab — le arată, cu eticheta „mai slab” la vedere (alegerea lui);
- nu face cereri noi la Pionex / Yahoo: totul din barele pe care colectorul le aduce deja.

## Erori și stări goale

- Bare prea puține (monedă nouă, acțiune listată de curând) ⇒ moneda/acțiunea nu intră în listă (nicio cifră inventată).
- Fără depozit sau fără boți ⇒ fraza cu istoricul spune „istoricul se socotește azi de la 8:00” / lipsește fraza cu boții.
- O eroare în calculul listelor nu strică ideile, clasamentul sau pagina (try/catch, ca la rețea).
- Serverul: câmpuri necunoscute aruncate, plafoane (5/5/10 în liste, 2.000 de notări), `restul` și urmărirea ideilor neatinse.

## Probe

- **Regulile (pure):** cădere + revenire ⇒ da; cădere fără revenire ⇒ nu; minim proaspăt (< 2 zile / < 3 zile de bursă) ⇒ nu; sub media scurtă ⇒ nu; **barele de după t nu schimbă verdictul de la t**; prea puține bare ⇒ nimic.
- **Istoricul:** pe serii sintetice cu rezultat cunoscut — reperul și grupul pe aceleași puncte; eticheta „mai bine / mai slab / cam la fel” la praguri; „puține cazuri” sub 100 / 20 de săptămâni; la short, câștigul = scăderea.
- **Urmărirea:** doar notările destul de vechi; comisionul scăzut; short cu semnul întors; textul la 0 și la N.
- **Ruta:** curățarea, plafoanele, `restul` și urmărirea ideilor neschimbate; `sugestii` scrie și citește înapoi.
- **Ecranele:** rândurile, frazele, stările goale, „Fișa (long/short)” cu direcția, „Biletul”; al doilea rând de pe Acasă; garda textelor (grup STRICT nou).
- **Pozele:** Tablou, Trading 212 și Acasă la 1920 și 390 — cu datele lui de azi.

## Livrarea

O singură livrare: **v100.85 / colector v101.58**, plan cu sarcini mici (fiecare cu proba văzută roșu), execuție directă, revizia Opus la final, push, colectorul repornit și verificat pe tura de 8:00 (acțiuni) și pe clasament (monede).
