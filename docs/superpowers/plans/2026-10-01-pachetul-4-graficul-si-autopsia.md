# Pachetul 4 — Graficul și autopsia (I-476, I-470, I-477, I-478) — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** pe graficul botului se vede ziua obișnuită a monedei și stopul de acum vs stopul planului (I-476), zona de valoare pe 7 zile și pivoții confirmați față de grid (I-470, + întrebare nouă în laborator); botul își vede perechile reale față de ce aștepta fișa, iar fișa se corectează pe monedă din boții lui (I-477); raportul de duminică face autopsia celor mai scumpe sfaturi greșite (I-478).

**Architecture:** două module pure noi — `public/lib/valoare.js` (zona de valoare + pivoți confirmați + grid vs zonă) și `public/lib/perechi.js` (estimarea perechilor pe istoricul de dinaintea pornirii, raportul real/estimat, factorul pe monedă) — plus extinderi în module existente: `GraficBot.desen` (straturile `zi`, `val`, liniile Consilierului), `GridLaborator` (întrebarea „valoare”), `Consiliu.alcatuieste` (motivul „perechi”), `SemnaleBot.noteaza` (starea de atunci), `Obiceiuri.autopsie` + `raportDuminica`. Colectorul face estimările (o dată pe bot, pe 15M de dinaintea pornirii) și autopsia; Tabloul și fișa Grid citesc KV.

**Tech Stack:** JS vanilla (module IIFE în `public/lib`, încărcate în colector cu `new Function`), Cloudflare Pages Functions (`functions/api/istoric-bot.js`) cu KV `ISTORIC` local, probe Node `scripts/proba-v10051.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md` — „Pachetul 4”.

## Global Constraints
- Orice cifră „din istoric” e o FRECVENȚĂ cu numărul de cazuri lângă ea; nicio predicție de direcție (spec, „Cum se probează” + regula de onestitate din `sfaturi.js`).
- Pivoții sunt CONFIRMAȚI: un vârf la bara i e pivot doar dacă există k bare închise după el (fără repaint); bara în curs nu intră.
- Factorul de corecție al perechilor apare abia de la 10 boți pe monedă (spec: „de la 10 boți pe monedă”), cu intervalul P25–P75 lângă el; sub 10: „încă N din 10”.
- Autopsia propune o regulă ca IPOTEZĂ; nicio regulă nu se schimbă fără cererea lui (spec).
- Comutatoarele noi („Ziua obișnuită”, „Zona de valoare”) urmează sistemul existent (`.tbIntBtn`, `aria-pressed`, `TB_IND_KEY`), fără culori sau fonturi noi în afara paletei `COL` a graficului.
- Ce NU se schimbă: lichidarea 8/15%, regulile planului lui, poarta, alertele de preț, pagina T212, Scan; cota KV de pe Cloudflare (totul nou în KV-ul local).
- Versiuni: `v100.51 · GRAFICUL ȘI AUTOPSIA` (BUILD_INFO, package.json `100.51.0`, index.html ×4, sw.js `crypto-radar-v100-51`, versiune.js), colector `v101.30`; proba `scripts/proba-v10051.mjs` legată în `npm test` (`test:v10051`).

## Review Focus
1. Moneda fără volum în lumânări (Pionex dă `volume` 0/lipsă) ⇒ zona de valoare cade pe numărul de bare pe preț (TPO) și o spune („după timp, nu după volum”), nu împarte la zero.
2. Bot pornit de mai puțin de 7 zile de istoric 15M disponibil înaintea pornirii ⇒ fără estimare („prea puțin istoric înainte de pornire”), nu o estimare pe 2 zile prezentată ca sigură.
3. Bot tânăr (sub 1 zi) cu 0 perechi ⇒ niciun motiv „perechi” în Consilier (ziua n-a trecut), nu ATENȚIE la pornire.
4. Pivoții de pe ultimele k bare (neconfirmați) nu apar niciodată, chiar dacă bara curentă e cel mai mare vârf.
5. Raportul de duminică fără nicio intrare cu starea notată (jurnalele vechi) ⇒ autopsia spune „starea de atunci: nenotată (sfat dinainte de 01.10)”, nu sare intrarea și nu cade.

---

### Task 1: `valoare.js` — zona de valoare, pivoții confirmați, gridul față de zonă (I-470)

**Files:**
- Create: `public/lib/valoare.js`
- Modify: `public/lib/grid-calcul.js:52-58` (`citeste` păstrează și `v`, volumul; null dacă lipsește)
- Test: `scripts/proba-v10051.mjs` (nou) + `package.json` (`test:v10051` în lanț)

**Interfaces:**
- Produces: `Valoare.zona(bare, o)` → `{poc, vah, val, n, dupa: "volum"|"timp", acoperire}` sau `null` (sub 24 de bare); `o = {bins: 40, procent: 0.7}`. `Valoare.pivoti(bare, k)` → `[{p, tip: "sus"|"jos", t, atingeri}]`, doar confirmați (au k bare după ei), comasați când sunt la < 0,3% unul de altul. `Valoare.fataDeGrid(zona, jos, sus)` → `{inZona: fracție din grid în [val, vah], pocInGrid: bool, text}`.

- [ ] **Step 1: testele (picând)** — în `scripts/proba-v10051.mjs`:
```js
await test("I-470 zona: 70% din volum in jurul POC; volumul lipsa -> dupa timp (TPO), spus pe fata", () => {
  const bare = []; for (let i = 0; i < 168; i++) { const p = 1 + 0.02 * Math.sin(i / 9); bare.push({ t: i * 3600000, o: p, h: p * 1.003, l: p * 0.997, c: p, v: i % 24 < 12 ? 100 : 10 }); }
  const z = VA.zona(bare, {}); assert.ok(z && z.val < z.poc && z.poc < z.vah && z.dupa === "volum"); assert.ok(z.acoperire >= 0.7 && z.acoperire < 0.8, String(z.acoperire));
  const fara = VA.zona(bare.map((b) => ({ ...b, v: null })), {}); assert.equal(fara.dupa, "timp");
  assert.equal(VA.zona(bare.slice(0, 10), {}), null);
});
await test("I-470 pivotii: doar CONFIRMATI (k bare dupa), varful de pe bara curenta nu intra; apropiati < 0,3% se comaseaza", () => {
  const p = [1, 1.01, 1.03, 1.01, 1, 0.98, 0.97, 0.98, 1, 1.02, 1.0301, 1.02, 1, 0.99, 1.05];
  const bare = p.map((c, i) => ({ t: i, o: c, h: c, l: c, c }));
  const v = VA.pivoti(bare, 2);
  assert.ok(v.some((x) => x.tip === "sus" && Math.abs(x.p - 1.03) < 0.002 && x.atingeri === 2), JSON.stringify(v));
  assert.ok(v.some((x) => x.tip === "jos" && x.p === 0.97)); assert.ok(!v.some((x) => x.p === 1.05), "ultima bara nu e confirmata");
});
await test("I-470 gridul fata de zona: cat din grid sta in zona de valoare si daca POC e in grid", () => {
  const f = VA.fataDeGrid({ poc: 1, vah: 1.02, val: 0.98 }, 0.99, 1.05);
  assert.ok(Math.abs(f.inZona - 0.5) < 1e-9); assert.equal(f.pocInGrid, true); assert.match(f.text, /50% din grid e în zona de valoare/);
});
```
- [ ] **Step 2:** `node scripts/proba-v10051.mjs` → PICĂ („lipsește valoare.js”).
- [ ] **Step 3: implementarea** — `valoare.js` (IIFE `var Valoare = (function(){...})()` + `globalThis.Valoare`):
  - `zona`: bare valide (h ≥ l > 0), sub 24 → null; `bins` (40) între min(l) și max(h); fiecare bară își împarte greutatea (`v` dacă vreo bară are `v > 0`, altfel 1 — `dupa: "timp"`) egal pe binurile atinse de [l, h]; POC = binul maxim; zona se lărgește de la POC spre vecinul cu mai mult (cel de sus la egalitate) până la ≥ 70% din total; `vah`/`val` = marginile binurilor; `acoperire` = fracția atinsă; `poc` = mijlocul binului.
  - `pivoti(bare, k)`: pentru i în [k, n−1−k] (bara n−1 e în curs ⇒ exclusă prin `n − 1 − k`): vârf dacă `h[i]` ≥ toate `h` din [i−k, i+k] și strict > cel puțin unul; adânc analog pe `l`; comasare: sortate după preț, dacă |p − p'| / p < 0,003 și același tip ⇒ o singură intrare cu `p` = media și `atingeri` += 1.
  - `fataDeGrid`: suprapunerea [max(jos, val), min(sus, vah)] / (sus − jos); text „X% din grid e în zona de valoare (VAL–VAH, 7 zile); cel mai tranzacționat preț (POC) e în/afară din grid”.
  - `grid-calcul.js` `citeste`: `v: nr(a ? r[5] : (r.volume != null ? r.volume : r.v))` (null permis; validarea rămâne pe o/h/l/c).
  - Încărcat în `public/index.html` după `grid-calcul.js` și în colector (`incarca("valoare.js", "Valoare")`).
- [ ] **Step 4:** proba → 3/3; `npm test` verde.
- [ ] **Step 5:** commit `feat(grafic): zona de valoare pe 7 zile + pivotii confirmati + gridul fata de zona (I-470, pachetul 4 pas 1)`.

### Task 2: graficul botului — ziua obișnuită, liniile Consilierului, zona de valoare, comutatoare (I-476 + I-470)

**Files:**
- Modify: `public/lib/grafic-bot.js` (`desen`: straturile `o.zi`, `o.val`, liniile din `o.consLinii`; legenda), `public/app.js` (`tbIndStare` cu `zi`, `val`; `renderTabloGrafic` le dă; aducerea barelor de 1h × 168 pentru zonă, cache 30 min pe simbol; `tbStare.consLinii` scris de Consilier), `public/index.html` (două butoane `tbInd-zi`, `tbInd-val`), `public/app.css` (doar dacă trebuie spațiere)
- Test: `scripts/proba-v10051.mjs`

**Interfaces:**
- Consumes: `Valoare.zona`, `Valoare.pivoti`, `Valoare.fataDeGrid` (Task 1); `ProfilMoneda.prag(p, "z24", parte, 0.5|0.75)` (existent).
- Produces: `GraficBot.desen({..., st: {zi, val, ...}, zi: {p50Jos, p75Jos, p50Sus, p75Sus, sursa}, val: {zona, pivoti}, consLinii: {stopAcum, stopPlan}})` → svg cu `class="gbZi"`, `gbVa`, `gbPoc`, `gbPivot`, `gbStopPlan`; `GraficBot.ziObisnuita(pret, profil)` → `{p50Jos, p75Jos, p50Sus, p75Sus, sursa}` sau null (prețuri absolute).

- [ ] **Step 1: testele (picând)**:
```js
await test("I-476 ziua obisnuita: banda P50/P75 pe 24 h de la pretul de acum, din profil; fara profil -> null", () => {
  const q = (a) => Array.from({ length: 21 }, (_, k) => a * k / 20);
  const z = GB.ziObisnuita(1, { z24: { jos: q(0.08), sus: q(0.06) }, simbol: "CRV_USDT_PERP", zile: 185 });
  assert.ok(Math.abs(z.p50Jos - 0.96) < 1e-9 && Math.abs(z.p75Jos - 0.94) < 1e-9 && Math.abs(z.p75Sus - 1.045) < 1e-9); assert.match(z.sursa, /185 de zile/);
  assert.equal(GB.ziObisnuita(1, null), null);
});
await test("I-476/I-470 desen: banda zilei, zona de valoare, POC, pivotii si stopul planului apar DOAR cu comutatorul pornit", () => {
  const bare = Array.from({ length: 60 }, (_, i) => ({ t: i * 9e5, o: 1, h: 1.01, l: 0.99, c: 1 + (i % 5) / 500, v: 10 }));
  const baza = { bare, W: 900, niv: [], grila: { jos: 0.95, sus: 1.05, linii: 11 }, zi: { p50Jos: 0.97, p75Jos: 0.95, p50Sus: 1.02, p75Sus: 1.04, sursa: "x" },
    val: { zona: { poc: 1, vah: 1.01, val: 0.99, dupa: "volum" }, pivoti: [{ p: 1.008, tip: "sus", atingeri: 2 }] }, consLinii: { stopAcum: 0.93, stopPlan: 0.945 } };
  const cu = GB.desen({ ...baza, st: { zi: true, val: true } }).svg, fara = GB.desen({ ...baza, st: { zi: false, val: false } }).svg;
  for (const c of ["gbZi", "gbVa", "gbPoc", "gbPivot"]) { assert.match(cu, new RegExp('class="' + c)); assert.ok(!new RegExp('class="' + c).test(fara), c + " fara comutator"); }
  assert.match(cu, /class="gbStopPlan/); assert.match(fara, /class="gbStopPlan/, "stopul planului e linie de Consilier, nu indicator");
});
await test("Tabloul: comutatoarele „Ziua obișnuită” si „Zona de valoare” in sistemul existent (aria-pressed, TB_IND_KEY)", () => {
  const html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(html, /id="tbInd-zi"[^>]*aria-pressed/); assert.match(html, /id="tbInd-val"[^>]*aria-pressed/);
  assert.match(app, /var d=\{bb:true,ema:true,rsi:true,vp:true,zi:true,val:true\}/); assert.match(app, /GraficBot\.ziObisnuita\(/); assert.match(app, /Valoare\.zona\(/);
});
```
- [ ] **Step 2:** proba → PICĂ (lipsesc `ziObisnuita`, clasele, butoanele).
- [ ] **Step 3: implementarea**:
  - `GraficBot.ziObisnuita(pret, p)`: `ProfilMoneda`-free (graficul nu depinde de el): citește `p.z24.jos/sus` (21 de cuantile), interpolează P50 (k=10) și P75 (k=15); prețuri = `pret·(1 − jos)`, `pret·(1 + sus)`; `sursa` = „ziua obișnuită a monedei: N de zile de bare de 1 h”.
  - `desen`: (a) `st.zi && o.zi` ⇒ în dreapta ultimei lumânări (de la `X(n-1)` la `plotW`) două dreptunghiuri `class="gbZi"`: P75 (fill `rgba(240,180,41,.07)`) și P50 (`.13`), etichete „zi obișnuită ½” / „¾” mici în legenda din dreapta; (b) `st.val && o.val` ⇒ `rect class="gbVa"` pe toată lățimea între `val`–`vah` (`rgba(105,167,255,.06)`, contur punctat), `line class="gbPoc"` (`#9fc3ff`, `3 3`), pivoții ca liniuțe scurte `class="gbPivot"` la marginea dreaptă (▲ sus, ▼ jos, cu `atingeri` în `<title>`); (c) `o.consLinii.stopPlan` ⇒ linie `class="gbStopPlan"` (COL.bad, `2 4`) cu eticheta „stopul planului”, lângă linia existentă „stopul tău” (`niv.stop`); dacă diferența e < 0,05% ⇒ o singură etichetă „stopul tău = al planului”. Legenda: „Ziua obișnuită (½ și ¾ din zile)”, „Zona de valoare 70% · 7 zile (după volum|timp)”.
  - `app.js`: `tbIndStare` cu `zi:true,val:true`; `tbSincInd` pe `["bb","ema","rsi","vp","zi","val"]`; `tbValoare` = cache `{simbol, la, zona, pivoti, grid}`: `getJSON("/api/market?type=pionex_klines&symbol=…&interval=60M&limit=168")` → `GraficBot.bare` → `Valoare.zona` + `Valoare.pivoti(bare4h din tbStare.directie.randuri4h, 3)`; `renderTabloGrafic` dă `zi: GraficBot.ziObisnuita(pAcum, tbProfilPt(b))`, `val`, `consLinii: tbStare.consLinii`; în `renderTabloSemafor`, după `conc`: `tbStare.consLinii={stopAcum: b.opritorPierdereActiv?botiNr(b.opritorPierdere):null, stopPlan: (conc.filter(c=>c.cod==="stop")[0]||{}).cifre?.pretPropus ?? null}` (scris în ES5, fără `?.`); sub grafic, în `gbUlt`, rândul „Gridul vs zona de valoare: …” din `Valoare.fataDeGrid`.
  - `index.html`: după `tbInd-vp`: `<button type="button" class="tbIntBtn" id="tbInd-zi" aria-pressed="true" data-action-click="tbComutaInd('zi')">Ziua obișnuită</button><button type="button" class="tbIntBtn" id="tbInd-val" aria-pressed="true" data-action-click="tbComutaInd('val')">Zona de valoare</button>`; scriptul `lib/valoare.js` lângă `grafic-bot.js`.
- [ ] **Step 4:** proba → toate; `npm test`; poze la 1920 și 390 (`scratchpad/ux/poze-*.mjs`) — banda nu acoperă lumânările, etichetele nu se calcă.
- [ ] **Step 5:** commit `feat(grafic): ziua obisnuita a monedei + stopul de acum vs al planului + zona de valoare si pivotii pe graficul botului, cu comutatoare (I-476, I-470)`.

### Task 3: laboratorul — întrebarea „zona de valoare” (I-470, ipoteză)

**Files:**
- Modify: `public/lib/grid-laborator.js` (`ferestre` adaugă `inValoare` și `netVa`; `intrebari` adaugă întrebarea `valoare`), `scripts/colector.mjs` (încărcarea lui `GridLaborator` primește `Valoare`)
- Test: `scripts/proba-v10051.mjs`

**Interfaces:**
- Consumes: `Valoare.zona(bare, o)` (Task 1).
- Produces: rândul ferestrei `{..., inValoare: bool|null, netVa: number|null}`; întrebarea `{id: "valoare", titlu: "Grid ancorat pe zona de valoare (7 zile) vs gridul standard, când prețul e în zonă", eticheteA: "ancorat pe zonă", eticheteB: "standard", ...}`.

- [ ] **Step 1: testul (picând)**:
```js
await test("I-470 laboratorul: intrebarea „valoare” - acelasi pret, grid ancorat VAL–VAH vs standard, doar cu informatia de la pornire", () => {
  const n = 30 * 96, b = Array.from({ length: n }, (_, i) => { const c = 1 + 0.03 * Math.sin(i / 40) + 0.01 * Math.sin(i / 7); return { t: i * 9e5, o: c, h: c * 1.002, l: c * 0.998, c, v: 50 + (i % 13) }; });
  const rows = LAB.ferestre(b, 2); assert.ok(rows.length && rows.some((r) => r.inValoare === true && typeof r.netVa === "number"));
  const q = LAB.intrebari(rows, 2).filter((x) => x.id === "valoare")[0]; assert.ok(q, "lipseste intrebarea valoare"); assert.match(q.titlu, /zona de valoare/);
  const b2 = b.map((x) => ({ ...x })); b2[n - 1] = { ...b2[n - 1], h: 9, c: 9 };   // o bara din viitor schimbata nu are voie sa schimbe zona ferestrelor de dinainte
  assert.deepEqual(LAB.ferestre(b2, 2).slice(0, 5).map((r) => r.netVa), rows.slice(0, 5).map((r) => r.netVa));
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — `grid-laborator.js` primește `Valoare` (în browser global; în colector parametru nou `new Function("GridCalcul","GridProba","Valoare", …)`): în bucla ferestrelor, `z = Valoare.zona(b.slice(s − 7·BARE_ZI, s), {})`; `inValoare = z ? b[u].c ≥ z.val && b[u].c ≤ z.vah : null`; dacă `inValoare` și `z.vah > z.val`: `stVa = G.construieste({pret: b[s].o, lat, pas, dir: "neutru"})` cu `jos/sus` înlocuite de `z.val/z.vah` și `grile = max(C.GRILE_MIN, floor(ln(vah/val)/ln(1+pas)))`, `netVa = P.simuleaza(b, s, W, stVa).net`. `intrebari`: rândurile cu `inValoare` dublate în `{net: r.netVa, var: "va"}` și `{net: r.net, var: "std"}` (aceeași `parte`) ⇒ `compara(dublate, r => r.var === "va", r => r.var === "std", H)`. Titlul spune că e o ipoteză (verdictul rămâne „n-am aflat” până trec ambele jumătăți).
- [ ] **Step 4:** proba; `npm test` (inclusiv `scripts/grid-v78.mjs` — laboratorul vechi neschimbat).
- [ ] **Step 5:** commit `feat(laborator): intrebarea noua - grid ancorat pe zona de valoare vs standard (I-470, ipoteza)`.

### Task 4: perechile reale vs estimarea fișei, factorul pe monedă, motivul în Consilier (I-477)

**Files:**
- Create: `public/lib/perechi.js`
- Modify: `public/lib/jurnal-trade.js` (`unul`: `perechi: nr(d.exchangeOrderPairedCount)`), `public/lib/consiliu.js` (motivul `perechi` din `x.perechi`; `PRIO` după `costuri`), `functions/api/istoric-bot.js` (rutele `perechiEst` GET/POST, `perechiCorectie` GET/POST), `scripts/colector.mjs` (`turaPerechi` la oră; Consilierul primește `perechi`), `public/app.js` (Consilierul primește `perechi` din KV; fișa Grid arată estimarea corectată)
- Test: `scripts/proba-v10051.mjs`

**Interfaces:**
- Produces: `Perechi.estimare(b15, o)` cu `o = {pornit, jos, sus, linii, dir, levier, pretPornire, H: 2}` → `{peZi, ferestre, zile}` sau `{eroare}` (sub 7 zile de bare înainte de `pornit`); `Perechi.raport(perechi, pornit, acum, est)` → `{real, est, raport, zile}` sau null (sub 1 zi sau `est.peZi` < 0,5); `Perechi.factor(lista)` → `{factor, p25, p75, n}` (mediana raportului pe boții închiși ai monedei, ≥ 10) sau `{lipsa: 10 − n, n}`; `Consiliu.alcatuieste({..., perechi: {real, est, raport}})` adaugă motivul `{cod: "perechi", nivel: "atentie"}` când `raport < 0.5`.

- [ ] **Step 1: testele (picând)**:
```js
await test("I-477 estimarea: gridul botului mutat relativ pe ferestrele de DINAINTEA pornirii; sub 7 zile -> eroare", () => {
  const n = 20 * 96, b = Array.from({ length: n }, (_, i) => { const c = 1 + 0.01 * Math.sin(i / 3); return { t: i * 9e5, o: c, h: c * 1.001, l: c * 0.999, c }; });
  const o = { pornit: b[n - 1].t + 9e5, jos: 0.98, sus: 1.02, linii: 11, dir: "neutru", levier: 2, pretPornire: 1, H: 2 };
  const e = PER.estimare(b, o); assert.ok(e.peZi > 1 && e.zile >= 7, JSON.stringify(e));
  assert.match(PER.estimare(b, { ...o, pornit: b[5 * 96].t }).eroare, /7 zile/);
  assert.equal(PER.estimare(b.concat([{ t: o.pornit + 9e5, o: 5, h: 5, l: 5, c: 5 }]), o).peZi, e.peZi, "barele de dupa pornire nu intra");
});
await test("I-477 raportul real/estimat: sub o zi -> null; factorul pe moneda de la 10 boti, cu P25–P75", () => {
  assert.equal(PER.raport(0, 0, 12 * 3600000, { peZi: 4 }), null);
  const r = PER.raport(6, 0, 3 * 86400000, { peZi: 4 }); assert.equal(r.real, 2); assert.equal(r.raport, 0.5);
  assert.equal(PER.factor(Array.from({ length: 9 }, () => ({ raport: 0.6 }))).lipsa, 1);
  const f = PER.factor([0.2, 0.4, 0.5, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 1.2].map((raport) => ({ raport }))); assert.equal(f.n, 10); assert.ok(Math.abs(f.factor - 0.65) < 1e-9);
});
await test("I-477 Consilierul: sub jumatate din perechile asteptate -> motiv „perechi” (atentie); peste -> nimic", () => {
  const s = { nivel: "tine", cod: "tine", motiv: "nimic", faCe: "", componente: [] };
  const c = CS.alcatuieste({ sm: s, perechi: { real: 1.2, est: 4, raport: 0.3 } }); assert.equal(c.nivel, "atentie"); assert.equal(c.motive[0].cod, "perechi"); assert.match(c.motive[0].titlu, /1,2 perechi pe zi.*4/);
  assert.equal(CS.alcatuieste({ sm: s, perechi: { real: 3, est: 4, raport: 0.75 } }).nivel, "tine");
});
await test("I-477 rutele: estimarile pe bot si corectia pe moneda in KV; colectorul le face (turaPerechi), Tabloul le citeste", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=perechiEst", { est: { "2394": { simbol: "CRV_USDT_PERP", peZi: 4, la: 1 } } }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=perechiEst"), env })).json()).est["2394"].peZi, 4);
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=perechiCorectie", { corectie: { CRV_USDT_PERP: { factor: 0.65, n: 10 } } }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=perechiCorectie"), env })).json()).corectie.CRV_USDT_PERP.factor, 0.65);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(col, /async function turaPerechi/); assert.match(col, /perechi: /); assert.match(app, /action=perechiCorectie/); assert.match(app, /perechi:tbPerechiPt\(b\)/);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea**:
  - `perechi.js` (primește `GridCalcul`, `GridProba`): `estimare` — barele cu `t + 15 min ≤ pornit` din ultimele 30 de zile dinaintea pornirii; sub `7·96` ⇒ `{eroare: "prea puțin istoric înainte de pornire (X zile; trebuie 7 zile)"}`; ferestre de `H·96` bare la fiecare `C.PAS_FERESTRE`; în fiecare, gridul RELATIV: `jos' = o_s·jos/pretPornire`, `sus' = o_s·sus/pretPornire`, `grile = linii − 1`, `dir`, `levier`; `GridProba.simuleaza(b, s, W, st).perechi`; `peZi = medie(perechi)/H`. `raport` — `zile = (acum − pornit)/zi`; `zile < 1 || !(est.peZi ≥ 0.5)` ⇒ null; `real = perechi/zile`. `factor` — rapoarte finite > 0, sub 10 ⇒ `{lipsa, n}`; altfel mediana + P25/P75 (`GridCalcul.percentila`).
  - `consiliu.js`: după sfaturi, `if (x.perechi && nr(x.perechi.raport) !== null && x.perechi.raport < 0.5) cand.push({cod: "perechi", nivel: "atentie", c: "g", titlu: "Gridul încheie " + fz(real) + " perechi pe zi; fișa aștepta " + fz(est), text: "Pe istoricul de dinaintea pornirii, gridul tău ar fi încheiat ~" + fz(est) + " pe zi; acum face " + Math.round(raport·100) + "% din asta.", faCe: "Aș muta gridul pe unde stă prețul acum (setările din fișă) — așa nu-și acoperă costurile pe zi.", scurt: "gridul încheie sub jumătate din perechile așteptate"})`; `PRIO`: `"perechi"` după `"costuri"`; `CHEI.perechi = []`.
  - Rutele (KV `perechi-est` = un obiect `{botId: {simbol, peZi, la, zile, eroare?}}`, cel mult 6.000 de boți, 1 MB; KV `perechi-corectie` = `{SIMBOL: {factor, p25, p75, n, la}}`).
  - Colectorul `turaPerechi` (o dată pe oră, după `turaSocoteala`): pentru boții activi fără estimare ⇒ `Perechi.estimare(GridCalcul.bare(await lumanari15M(s)), {pornit: b.pornitLa, jos/sus/linii din b.brut.buOrderData (bottom/top/row), dir, levier, pretPornire: initPrice})`; boții închiși din ultimele 24 de zile fără estimare, cel mult 15 pe tură (pauză 700 ms), cu `perechi` din `JurnalTrade`; apoi `factor` pe monedă din boții închiși (cu `raport` din `perechi / durata` vs `peZi`) ⇒ POST `perechiCorectie`. În `semnaleBot`: `perechi: Perechi.raport(b.ordinePerechi, b.pornitLa, acum, estPe[b.id])`.
  - Tabloul: `tbPerechiPt(b)` (cache 10 min din `action=perechiEst`) ⇒ `Perechi.raport(...)` în `Consiliu.alcatuieste({..., perechi: tbPerechiPt(b)})`; fișa Grid: lângă „~X perechi încheiate/zi” ⇒ „· corectat după boții tăi pe <monedă>: ~X·factor (×0,65, n=12, P25–P75 0,4–0,9)” sau „· corecția din boții tăi: încă N din 10”.
- [ ] **Step 4:** proba; `npm test`; `COLECTOR_DOAR_INCARCA=1 node scripts/colector.mjs` → `INCARCAT true`.
- [ ] **Step 5:** commit `feat(perechi): perechile reale vs estimarea fisei, factorul pe moneda din botii tai, motiv in Consilier sub 50% (I-477; colector)`.

### Task 5: autopsia sfaturilor greșite în raportul de duminică (I-478)

**Files:**
- Modify: `public/lib/semnale-bot.js` (`noteaza(log, sem, total, acum, extra)` păstrează `extra.stare`), `public/lib/obiceiuri.js` (`autopsie(loguri, acum)`; `raportDuminica` adaugă liniile), `scripts/colector.mjs` (`noteaza` cu `{stare: Probabilitati.stareDinRegim(f && f.regim)}`; `turaSocoteala` păstrează `socotealaLoguri = [{id, moneda, log}]`; `turaRaport` dă `autopsie`)
- Test: `scripts/proba-v10051.mjs`

**Interfaces:**
- Produces: `Obiceiuri.autopsie(loguri, acum)` → `{scumpe: [{moneda, cod, nivel, motiv, t, stare, total, totalDupa, cost}] (≤ 3, cost < 0, judecate în ultimele 7 zile), tipar: {cod, stare, gresite, judecate, cost, text} | null (30 de zile), linii: [string]}`.

- [ ] **Step 1: testele (picând)**:
```js
await test("I-478 noteaza pastreaza starea de atunci (jurnalele vechi raman fara ea)", () => {
  const l = SB.noteaza([], { nivel: "iesi", cod: "lichidare", motiv: "x" }, -3, 1000, { stare: "liniste-jos" }); assert.equal(l[0].stare, "liniste-jos");
  assert.equal(SB.noteaza([], { nivel: "iesi", cod: "lichidare", motiv: "x" }, -3, 1000).length, 1);
});
await test("I-478 autopsia: cele mai scumpe 3 sfaturi gresite ale saptamanii, cu starea si ce a urmat; tiparul repetat -> regula PROPUSA (ipoteza)", () => {
  const Z = 86400000, acum = 40 * Z, e = (cod, nivel, total, dupa, zi, stare) => ({ t: acum - zi * Z - Z, cod, nivel, motiv: cod + " zice", total, totalDupa: dupa, dreptate: false, judecatLa: acum - zi * Z, stare });
  const log = [e("lichidare", "iesi", -3, 2.5, 1, "liniste-jos"), e("muta", "atentie", 1, 4, 2, "liniste-lateral"), e("tine", "tine", 2, -6, 3), e("muta", "atentie", 0, 1, 4, "liniste-lateral"), e("muta", "atentie", 0, 0.5, 12, "liniste-lateral"), { ...e("btc", "atentie", 0, -1, 2), dreptate: true },
    { ...e("muta", "atentie", 0, -1, 5, "liniste-lateral"), dreptate: true }, { ...e("muta", "atentie", 0, -2, 6, "liniste-lateral"), dreptate: true }];   // muta in liniste-lateral: 3 gresite din 5 (0,6)
  const a = OB.autopsie([{ id: "1", moneda: "CRV", log }], acum);
  assert.deepEqual(a.scumpe.map((x) => x.cod), ["tine", "lichidare", "muta"]); assert.equal(a.scumpe[0].cost, -8);
  assert.match(a.linii.join("\n"), /starea de atunci: nenotată/); assert.match(a.linii.join("\n"), /liniște, coboară încet/);
  assert.ok(a.tipar && a.tipar.cod === "muta" && a.tipar.gresite === 3); assert.match(a.tipar.text, /ipoteză/); assert.match(a.tipar.text, /n-am schimbat nimic/);
  const r = OB.raportDuminica({ trades: [{ inchis: acum - Z, rezultat: 1, net: 1, grile: 1, pozitie: 0, comisioane: 0, funding: 0, greseli: [] }], acum, socoteala: {}, autopsie: a });
  assert.match(r.linii.join("\n"), /Autopsia săptămânii/);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea**:
  - `noteaza`: `var e = {...}; if (extra && extra.stare) e.stare = String(extra.stare); log.push(e)`.
  - `autopsie`: intrările cu `dreptate === false`, `total`/`totalDupa` numerice; `cost = stai(e) ? totalDupa − total : total − totalDupa` (negativ = te-ar fi costat dacă-l urmai; `stai` ca în `SemnaleBot` — „tine”, „podea”, „cu-botul”); `scumpe` = cele din ultimele 7 zile (după `judecatLa || t`), sortate crescător după `cost`, primele 3; linia: „„<motiv>” pe <MONEDĂ> (<zi ora>): starea de atunci: <eticheta din Probabilitati.ETICHETE | nenotată (sfat dinainte de 01.10)>; după: totalul de la X la Y — urmat, te-ar fi costat Z USDT.” `tipar` pe 30 de zile: grupe `cod|stare` (fără stare ⇒ nu intră în tipar), cel puțin 5 judecate și cel puțin 3 greșite cu cost total < 0 și `gresite/judecate ≥ 0,6`; cea cu costul cel mai mare ⇒ text „Regulă propusă (ipoteză, n-am schimbat nimic): «<nume sfat>» în <stare> a greșit de G din J ori (Z USDT) — l-aș trata ca „încă nu știm” în starea asta. Spune-mi dacă vrei regula.” Sub prag ⇒ `tipar: null` și linia „Niciun tipar repetat încă (trebuie ≥ 5 cazuri în aceeași stare).”
  - `raportDuminica`: dacă `o.autopsie` ⇒ `linii.push("Autopsia săptămânii — sfaturile care te-ar fi costat cel mai mult:")` + liniile; altfel nimic.
  - Colectorul: `SemnaleBot.noteaza(log, x.semafor, b.profitTotal, acum, { stare: Probabilitati.stareDinRegim(f && f.regim) })`; `turaSocoteala` ține `socotealaLoguri` (cu `moneda` din `JurnalTrade.moneda`); `turaRaport`: `autopsie: Obiceiuri.autopsie(socotealaLoguri, acum)`; Obiceiuri primește `Probabilitati` pentru etichete (parametru nou la `new Function`, global în browser).
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(raport): autopsia celor mai scumpe sfaturi gresite + tiparul repetat ca regula propusa (I-478; starea de atunci in jurnalul semnalelor)`.

### Task 6: versiunea, ecranul, revizia, livrarea
- [ ] v100.51 · GRAFICUL ȘI AUTOPSIA / colector v101.30 (toate locurile din Global Constraints); `npm test`; proba de ecran Tablou (73) și Grid (18); poze 1920/390 ale graficului cu cele două comutatoare pornite/oprite; o repornire a colectorului și probă pe viu (estimarea CRV în `perechi-est`, `stare` în jurnalul semnalelor după prima notare); revizia finală (agent Opus nou) pe tot pachetul; reparațiile cu test RED→GREEN; `npm test && git push`; memo.
