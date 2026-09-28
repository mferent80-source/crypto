# SL și TP pe pagina alerts: planul tău sau sugerat, cu bară și dovadă (28.09.2026)

**Cererea lui (28.09, ~20:50):** „pe pagina alerts, dacă un stock nou adăugat nu are stop loss, sugerează unul optim, adaptat și personalizat pentru fiecare stock în parte, și să arate evoluția stock-ului, cât mai are până la SL; la fel sugerează și un TP și arată cât mai are până la el — o bară de progres sau ceva de genul.”
**Hotărât cu el:** la AMÂNDOUĂ (pozițiile Trading 212 și simbolurile urmărite), ideile 1 + 2 + 3. Demo aprobat („da”): https://claude.ai/artifact/GQVS4jd1nbqSoN1tCNJMCz
**Amânate (nu intră aici):** 4 · câte bucăți (1 % risc din cont), 5 · alerte Discord (ultimul sfert spre SL / TP atins / intrarea sugerată), 6 · „Păstrează ca plan”.

## Ce vede el

1. **Trading 212:** coloanele „Stop din plan” și „Țintă” devin o singură coloană, **„SL ← acum → TP”**:
   - bara: SL în stânga, TP în dreapta; punctul = prețul de acum; marca verticală = prețul lui mediu;
   - deasupra: „SL $x” (roșu) și „TP $y” (verde); dedesubt: „−a % până la SL” · „│ prețul tău mediu $m” · „+b % până la TP”;
   - punctul e roșu în ultimul sfert spre SL, verde în ultimul sfert spre TP, altfel alb; zonele de capăt sunt nuanțate (roșu / verde);
   - sub SL: eticheta **SUB STOP** și „sub SL cu a %”; peste TP: **ȚINTĂ ATINSĂ** și „peste TP”;
   - lângă nume: **PLANUL TĂU** (dacă are plan în Radar) sau **SUGERAT** (poziție fără plan).
2. **Simbolurile tale:** două coloane noi: **„SL ← intrare → TP”** (aceeași bară; marca = intrarea sugerată) și **„Pe istoric”** (media pe trade după comision, colorată, + „x % pe plus · n intrări”).
   - trend în jos pe zilnice ⇒ nicio intrare (Radarul așteaptă întoarcerea): bara punctată, eticheta **ORIENTATIV · TREND ÎN JOS**, SL / TP socotite de la prețul de acum.
3. **Dovada** (rândul desfăcut):
   - poziție cu plan: „Ieși la −15 % de la maximul de după cumpărare ($max) → stop azi $s. Regula verificată pe trade-urile tale (25.09): −15 % care urcă a ieșit cu +1.001 lei mai bine decât fără stop.” + „Ce ar fi sugerat Radarul”;
   - sugerat: „Stop la k × volatilitatea zilnică a SIM (≈ −r % de la intrare), ținta la dublu. Pe ultimul an: n intrări, p % pe plus, în medie ±m % pe trade, după comision (ieșire la SL, la TP sau după 20 de zile).”;
   - media negativă ⇒ se spune pe față, cu roșu: „Pe istoricul SIM regula asta a pierdut în medie — stopul rămâne o limită de risc, nu o promisiune.”;
   - simbol urmărit: „Intrarea sugerată: <motivul Radarului>: $i (±x % de acum)” sau „De ce e orientativ”.
4. **Telefon:** bara pe toată lățimea rândului, sub preț; textul din mijloc („│ prețul tău mediu”) se ascunde; „Pe istoric” pe rândul lui.

## De unde vin cifrele — o singură sursă: funcția Radarului

`ActiuniSemnale.niveluri(bare, pret, o)` (`crypto/public/lib/actiuni-semnale.js`), neschimbată:
- volatilitatea = ATR zilnic; `proba` încearcă pe istoric (ultimele ~270 de zile) k ∈ {1,5; 2; 2,5; 3}, ieșire la SL / TP (2k·ATR) / după 20 de zile, comision 0,3 %, și păstrează k cu media cea mai bună;
- distanța d = k·ATR, strunită între 3 % și 15 % din preț; TP = baza + 2d;
- poziție deschisă (`o.pretMediu`, `o.maxDupaCumparare`, `o.minTrail = 0.15`): `stopPozitie` (urcă după maxim, cel puțin −15 %), `tintaPozitie`;
- fără poziție: `intrare` (trend sus: retragere spre EMA 20; lateral: aproape de minimul pe 20 de zile; jos: null), `stop`, `tinta` de la intrare (sau de la preț dacă intrare = null);
- sub 120 de zile de prețuri ⇒ `{nivel:"fara-date", motiv}` ⇒ pagina scrie motivul, fără bară.

## Contractul pozei (colector → worker → pagina)

**`t212[i].sugestie`** (nou, la FIECARE poziție, ca dovada „ce ar fi sugerat” să existe și când are plan; null când `niveluri` n-a dat „ok”):
`{ stop, tinta, k, riscPct, trend, proba: { n, pePlus, medie } }` — stop / tinta = `stopPozitie` / `tintaPozitie`; riscPct = d / preț.
Planul existent (`t212[i].plan.stop`, `.tinta`, `.max`) rămâne și are întâietate pe pagină.

**`simboluri[i].sugestie`** (nou; null fără date):
`{ intrare: { pret, motiv } | null, stop, tinta, k, riscPct, trend, proba: { n, pePlus, medie } }` sau `{ nivel: "fara-date", motiv }`.
Nivelurile sunt în moneda simbolului listat (dublurile germane: lumânările simbolului german, nu ale companiei din SUA — prețul e în €).

Rotunjiri ca în restul pozei (`rot`); lipsa rămâne `null`, niciodată 0. Mărimea pozei rămâne sub limita worker-ului (512 KB; azi ~15 KB, crește cu ~2 KB).

## Colectorul (`crypto`)

- `scripts/lib/poza.mjs`: `pozitieT212` și `simbolPoza` pun `sugestie` din câmpul `x.niveluri` / `x.sugestie` primit (funcții pure; `sugestiePoza(n, pret)` comună, testată).
- `scripts/colector.mjs`:
  - `pozitiiPentruPoza`: `n` e deja calculat (`ActiuniSemnale.niveluri(bare, p.pret, { pretMediu, maxDupaCumparare: mx, minTrail: 0.15 })`) — se trimite și în poză;
  - `simboluriPentruPoza`: `yahooExtra.bare(s.s)` = lumânări zilnice pe 1 an (`/v8/finance/chart/<sim>?range=1y&interval=1d`, fără crumb), cache 6 h în `data/poza-bare.json` (fișier separat, ca `poza-ext.json` să rămână mic); `ActiuniSemnale.niveluri(bare, pretulDeAcum)`.
- `VERSIUNE_COLECTOR` → v101.0; colectorul se repornește o dată, la final (cu probă că a pornit).

## Pagina (`premarket_scanner`)

- `lib/radar-ecran.js`: funcții pure noi `sltp(p)` (alege planul sau sugestia; întoarce `{ sl, tp, intr, intrEt, sursa: "plan"|"sugerat"|"orientativ", orient }`) și `baraSLTP(o)` (HTML-ul barei; fracția f = (preț − SL) / (TP − SL); scala = [min(SL, preț), max(TP, preț)]); `randT212` și `randSimbol` le folosesc; dovada în rândul desfăcut; `colspan` actualizat.
- `lib/radar-ui.css`: bara (pistă, zone de capăt, marca, punctul, etichetele), `.pill` PLANUL TĂU / SUGERAT / ORIENTATIV, telefon (bara `grid-column:1/-1`); totul sub `body.al-page .rad` (tokenii paginii).
- `[hidden]` bătut de `display` ⇒ se păstrează regula `.rad [hidden]{display:none!important}` (există).
- alerts **v129 / tt-v839**, `sync-suite-version`.

## Ce NU se schimbă

Planurile din Radar (nu se scriu de pe pagină), regula stopului care urcă cu 15 %, coloanele Insideri / Rezultate / Din cont / Trend, „ce are de făcut” de pe rândul poziției, evoluția zilei (v128).

## Probe

- **Colector (fără rețea):** `sugestiePoza` pe bare generate — trend sus / lateral / jos (intrare null), sub 120 de zile (fara-date), poziție cu plan (sugestia există, planul neatins), lipsa ⇒ null nu 0; `yahooExtra.bare` cu `fetch` simulat: cache 6 h, simbol inexistent (404) ⇒ null, fără excepție.
- **Pagina:** `sltp` (plan bate sugestia; urmărit cu intrare / orientativ; fara-date), `baraSLTP` (sub SL ⇒ SUB STOP; peste TP ⇒ ȚINTĂ ATINSĂ; ultimul sfert ⇒ culoarea; SL = TP ⇒ fără împărțire la zero), media negativă spusă pe față; `radar-ecran.test.mjs`, `alerts-radar.test.mjs`, `proba-ecran-alerts.mjs` (fixture cu `sugestie`), suita întreagă.
- **Pe viu:** poza reală după repornirea colectorului (din KV), pagina publicată cu cheia, la 1920 și 390, **lângă poza demo-ului** — zero diferențe neexplicate; cifrele de pe pagină = cele din demo pentru aceleași simboluri (aceeași funcție).
