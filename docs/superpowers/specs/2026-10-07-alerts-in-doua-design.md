# Pagina alerts în două: „Ce dețin” / „Ce urmăresc” — design

**Data:** 07.10.2026 · **Cererea lui:** „pagina alerts să fie în două: alerte la boții și stocks pe care îi dețin, și alerte la cei pe care îi urmăresc” → varianta 2 (filele + alertele în fiecare). Pe drum: „vreau să arate fix ca acum liniile”, „la dețineri să pot adăuga și manual cu preț în euro și USD, că alea din Salt așa le am”, „fă și la Salt sugestia de SL și TP la fel ca la restul”. **Demo aprobat („e ok”):** https://claude.ai/artifact/HFTKozK9quw4vDczjTW4fE (versiunea 3).

## Ce se schimbă pe ecran (exact ca demo-ul v3)

1. **Filele de sus** ale paginii `alerts` (Trading Tools): „Preț” se înlocuiește cu **💼 Ce dețin · N 🔔k** și **👀 Ce urmăresc · N 🔔k**. Clopoțelul arată câte alerte importante au venit azi și e roșu dacă printre ele e una URGENTĂ. Filele **News** și **Istoric** rămân neatinse.
2. **Ce dețin**, de sus în jos: cardurile de sumar de acum → **🔔 Alertele de azi** (NOU) → **💼 Trading 212** (neatins) → **🤖 Boți Pionex** (neatins) → **🧂 Salt Bank** (NOU).
3. **Ce urmăresc:** **🔔 Alertele de azi** (NOU, cu regulile alertelor sub listă) → **🎯 Simbolurile tale** (neatins, cu formularul de adăugare de acum).
4. **Rândurile tabelelor existente nu se schimbă deloc.** Le desenează aceleași funcții (`randT212`, `randBot`, `randSimbol`). Nu adaug nicio coloană în ele.
5. **Panoul „Alertele de azi”:**
   - **Butoane:** „Importante · N”, ales din start, și „Toate, cu grilele · N”. Zgomot înseamnă grilele atinse și perechile încheiate.
   - **Rândul „Pe simbol”:** câte un buton pe simbol, cu numărul alertelor lui. E roșu dacă simbolul are o alertă urgentă. Un clic filtrează lista pe simbolul acela, al doilea clic scoate filtrul.
   - **Lista:** cele mai noi alerte primele, câte 6, cu „Arată încă N”.
   - **Un rând de alertă:** dunga nivelului, ora, URGENT/ATENȚIE/INFO, titlul și sursa (T212 / bot / Salt / piața / urmărit), faptul, apoi „👉 …” într-o casetă.
6. **Unde ajunge fiecare alertă:**
   - **„Ce urmăresc”** primește alertele `sim-*` ale simbolurilor urmărite.
   - **Simbolurile pe care le și deții** (pozițiile T212, boții, Salt) își duc alertele la „Ce dețin”, ca să nu apară de două ori.
   - **„Ce dețin”** primește tot restul: T212, boții, Salt, rezumatele, vremea în crypto și mediul boților.
7. **Salt Bank**, rândurile în forma celor T212:
   - **Acțiune:** pastila IEȘI/ATENȚIE/ȚINE de pe pagina Salt, SUGERAT, „buc · mediu · nume”.
   - **Celelalte coloane:** Acum (prețul + „azi”) · 30 de zile · Rezultat în EUR (o zecimală) · **SL ← acum → TP** · Plătit în.
   - **Rândul desfăcut:** motivele de pe pagina Salt, apoi Cumpărat / Valoarea acum / Cost, apoi **Editează** / **Scoate**.
8. **Formularul Salt:** Simbol sau ISIN · Bucăți · Prețul tău mediu · [€ EUR | $ USD] · „Adaugă poziția”. Sub el apare starea cererii:
   - „trimisă, o pune colectorul (~2 min)”;
   - „adăugată” sau „respinsă: <motiv>”.

## Drumul datelor

```
Radar (acasă) ── colector ── POST /poza ──▶ worker Paznic (KV „poza”) ──▶ pagina alerts (GET /poza, cheia de citire)
                     ▲                                                          │
                     └── GET /salt-cereri ◀── worker (KV „salt-cereri”) ◀── POST /salt-cereri (formularul Salt)
```

### A. Colectorul (`crypto`, v101.86)

- **Jurnalul alertelor de azi** (`scripts/lib/alerte-zi.mjs`, funcții pure):
  - `trimiteAlerta` pune fiecare alertă în `data/alerte-zi.json`, inclusiv cele „doar în Radar”, adică grilele.
  - Se păstrează doar ziua de azi, după ora României (începe la 00:00), cel mult 400 de alerte.
  - Lista nu depinde de cele 100 din KV-ul Radarului, unde grilele împing afară alertele de dimineață.
- **Poza primește `alerte`:** le construiește funcția pură `alertePentruPoza(jurnal, { detinute, urmarite })` din `poza.mjs`. Fiecare alertă are câmpurile `{t, nivel, titlu, mesaj, grup: "det"|"urm", zgomot, sim, src}`. La alertele-zgomot câmpul `mesaj` rămâne gol, ca poza să rămână mică.
- **Poza primește `salt`**, prin `turaSaltPozitii`, din 15 în 15 minute:
  - Modulul întoarce, pe lângă rezumat, câte un rând pe poziție: `{isin, simbol, nume, qty, pretMediu, plata, de, moneda, pret, prev, closes30, val, cost, rez, niv, motive, sfat, sugestie: {stop, tinta}, max, mediuSimbol}`.
  - SL/TP vine din **aceeași analiză ca pagina Salt** (`Salt.analizeaza` → `a.niv.stopPozitie` / `tintaPozitie`). Prețul mediu e în moneda acțiunii la cursul din ziua cumpărării (`Salt.medieInMonedaSimbolului`).
  - Poza ia ultimul rezultat al turei. O poziție fără prețuri apare cu `pret: null`, iar pagina scrie „fără prețuri”.
- **Cererile Salt** (`aplicaCereriSalt`, funcție pură, plus tura): la fiecare poză, colectorul citește `GET /salt-cereri` și aplică fiecare cerere pe lista din Radar (`/api/t212?action=salt`, apoi `saltPozitii`).
  - **`pune`:** adaugă poziția sau o înlocuiește pe cea cu același ISIN.
    - **ISIN-ul** se caută în universul Salt (`public/data/salt-univers.json`) după ISIN sau după simbol.
    - **„€ EUR”** se scrie `plata: "EUR"`.
    - **„$ USD”** se scrie `plata: "simbol"`, dar numai dacă acțiunea e în USD. Altfel cererea e respinsă cu motivul spus.
  - **`scoate`:** scoate poziția după ISIN.
  - **După aplicare:** colectorul confirmă cererile la worker (`POST /salt-cereri/ack`). Rezultatul `{id, stare: "ok"|"respins", motiv}` intră în poză, în `saltCereri`, ca pagina să-l arate. Tura Salt rulează imediat, ca rândul nou să aibă prețuri fără să aștepte 15 minute.

### B. Worker-ul Paznic (`crypto/paznic/worker.mjs`)

- **`POST /salt-cereri`** (cheia de citire): adaugă o cerere `{id, op, simbol|isin, qty, pretMediu, moneda, de}` cu verificări (`op` ∈ pune/scoate, numere > 0, cel mult 20 de cereri în așteptare).
- **`GET /salt-cereri`** și **`POST /salt-cereri/ack`** (cu `PAZNIC_TOKEN`): colectorul citește cererile și le șterge pe cele aplicate.
- **CORS**, ca la `/simboluri`.
- **Cronul** `*/10` rămâne în `wrangler.jsonc`, verificat ÎNAINTE de `wrangler deploy`.

### C. Pagina `alerts` (`premarket_scanner`, alerts v144 / tt-v855)

- **`lib/radar-ecran.js`:**
  - `randeaza(el, poza, o)` primește `o.fila = "det" | "urm"` și desenează doar secțiunile filei.
  - Funcții noi, pure: `grupeazaAlerte`, `panouAlerte`, `panouSalt`, `randSalt`.
  - Starea filtrelor (importante/toate, simbolul ales, „arată încă”) stă în modul, separat pe fiecare filă.
- **`lib/radar-ui.css`:** stilurile noi (panoul de alerte, rândul „Pe simbol”, formularul Salt, „Plătit în”) sub `body.al-page .rad`.
- **`lib/radar-poza.js`:** `saltCerere(c)` face `POST /salt-cereri`. Cererile trimise stau în `localStorage` până le confirmă poza (prin `saltCereri`).
- **`alerts/index.html`:**
  - butoanele `data-tab="det"` / `data-tab="urm"` în locul lui „Preț”; amândouă arată `#tabPrice` cu `fila` aleasă;
  - fila aleasă e ținută minte;
  - formularul „Adaugă simbol” se mută doar în fila „Ce urmăresc”;
  - versiunile se urcă la v144 / tt-v855, plus `CACHE_VERSION`.

## Ce NU intră

- **„Rezultatele vin mâine”**, alerta nouă la „Ce urmăresc”: n-a zis da, rămâne propunere. Pe pagină apar doar cele două reguli care există.
- **Discord** nu se schimbă: aceleași alerte, ca acum.
- **Pagina Salt din Radar** nu se schimbă. Lista e una singură, pentru că tot din ea citește și pagina Salt.
- **Notificările pe telefon** de la pagina alerts rămân cum sunt.

## Erori și margini

- **Poza fără `alerte`**, de la un colector vechi: panoul scrie „Alertele vin cu colectorul nou (v101.86)”, nu „nicio alertă”.
- **Poza fără `salt`:** panoul Salt scrie „Pozițiile Salt vin cu poza următoare”. Formularul rămâne activ.
- **Cerere respinsă** (ISIN negăsit, USD la o acțiune în EUR, cantitate greșită): motivul se vede sub formular, iar cererea dispare din „în așteptare”.
- **Worker-ul refuză cererea** (cheie greșită sau prea multe cereri): mesajul se vede pe loc, cu codul.
- **Noaptea** (23–08) poza nu pleacă. Cererile așteaptă la worker până dimineață, iar pagina spune asta.

## Probe

- **crypto:**
  - `scripts/alerte-zi-v10186.mjs`: jurnalul (ziua României, plafonul, zgomotul), `alertePentruPoza` (grupele, deținutele urmărite trec la „det”), `aplicaCereriSalt` (pune/înlocuiește/scoate, ISIN din simbol, respingerile).
  - **Rutele worker-ului:** proba de rute de acum, plus `/salt-cereri`.
  - Apoi `npm test` verde (sau spun exact ce pică și de ce).
- **premarket:**
  - `tools/radar-ecran.test.mjs` extins: `grupeazaAlerte`, `randSalt` (SL/TP, EUR), `randeaza` cu `fila`.
  - **Proba de ecran** cu poza REALĂ din KV: pozele la 1920 și 390, lângă demo-ul v3.
- **Pe viu:**
  - poza urcată cu `alerte` și `salt`;
  - pagina publicată se deschide cu ambele file;
  - drumul cererilor Salt îl probez cap-coadă pe o COPIE (worker local + Radarul de probă pe copia KV-ului), nu pe lista lui. Pe viu doar citesc: poza are `salt` cu RHM.DE și NFLX, SL/TP egale cu cele de pe pagina Salt.

## Versiuni

colector **v101.86** · pagina alerts **v144** · suita **tt-v855** · worker-ul Paznic (fără număr propriu, commit `feat(paznic)`).
