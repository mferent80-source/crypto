# Acțiunile T212 — Pachetul 2: probabilitățile pe ieșire — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** pe fiecare poziție T212, „cât de des s-a întâmplat” — atinge stopul mâine, ținta înaintea stopului în 5 zile de bursă, deschiderea sare peste stop — condiționat pe starea de acum, cu cazuri independente și interval; calibrat pe cumpărările lui; plus avertismentul „rezultate în N zile”.

**Architecture:** `Probabilitati.frecventa` primește un `cfg` de piață (unitate, istorie, pas, continuitate, starea) — crypto neschimbat; `Probabilitati.pentruActiune(bare, o)` folosește barele zilnice și starea `ActiuniSemnale.stare` (trend sus/lateral/jos × mișcare/liniște). Calibrarea: rejucarea „cf acțiuni” notează la fiecare cumpărare cifra de atunci (doar barele de dinainte) și ce a urmat în 5 zile; `Probabilitati.calibrareActiuni(inchise, cf)` → cutii pe cazuri independente; `corecteaza` existent le aplică. Pagina T212 arată blocul „🎲 Probabilitățile din istoric” în detaliul poziției.

**Tech Stack:** module IIFE în `public/lib` (colectorul le încarcă cu `new Function`), Pages Functions + KV local, probe Node.

**Spec:** `docs/superpowers/specs/2026-10-01-actiuni-t212-creier-design.md` — „Pachetul 2”.

## Global Constraints
- Frecvențe din trecut, cu numărul de cazuri și intervalul Wilson pe ferestre care NU se suprapun; nicio predicție de direcție (spec + trader.md).
- Condiționat pe starea de acum: trendul `ActiuniSemnale.stare` (sus / lateral / jos) × mișcare / liniște; cădere exact → doar trend → toate, fiecare treaptă cu ≥ 5 cazuri independente (ca la crypto).
- Săritura la deschidere peste stop se numără SEPARAT de „atinge stopul în zi” (spec: „trebuie numărată în «săritura», nu în «atinge stopul»”); totalul se spune alături.
- „Rezultate în N zile” (N ≤ 5 zile de bursă): avertisment separat cu săriturile mari ale acțiunii din profil (`evenimente.mediana/max`), nu intră în cifra obișnuită.
- Calibrarea: doar barele de dinaintea fiecărei cumpărări (`t + 8 h ≤ pornit`); un caz pe ticker la cel puțin 5 zile de bursă unul de altul; cutiile pe TOATE acțiunile la un loc; sub 20 de cazuri pe cutie — „necalibrat încă”.
- Crypto neschimbat: probele `v10045…v10052` verzi.
- Versiuni: `v100.53 · PROBABILITĂȚI PE ACȚIUNI` (BUILD_INFO, package.json `100.53.0`, index.html ×4, sw.js `crypto-radar-v100-53`, `functions/_shared/versiune.js`), colector `v101.32`; proba `scripts/proba-v10053.mjs` în `npm test`.

## Review Focus
1. Bara zilei în curs (bursa deschisă) nu intră nici în stare, nici în ferestre (altfel „mâine” s-ar socoti cu o zi neîncheiată).
2. Poziția fără stop valid (stopul ≥ prețul — deja atins) ⇒ fără „atinge stopul”, cu mesajul că stopul e deja depășit.
3. Weekend / sărbătoare între bare ⇒ ferestrele zilnice NU se aruncă pentru „gaură” (la crypto se aruncă; la acțiuni bara următoare e ziua de bursă următoare).
4. Ticker cu sub 120 de zile ⇒ fără probabilități, spus, nimic nu cade.
5. Cumpărări multiple în aceeași zi pe același ticker ⇒ un singur caz în calibrare.

---

### Task 1: `Probabilitati` — adaptorul pentru acțiuni

**Files:**
- Modify: `public/lib/probabilitati.js` (`frecventa(…, opt.cfg)`, `pentruActiune`, `stareActiuneLa`)
- Create: `scripts/proba-v10053.mjs`; Modify: `package.json`

**Interfaces:**
- Produces: `Probabilitati.pentruActiune(bare, { pret, stop, tinta, acum })` → `{ stare, bare, stop1: F|null, sare1: F|null, cursa5: {tinta: F, stop: F}|null, motiv? }` unde `F = {p, n, k, nIndep, ic, nivel, stare}` (forma `frecventa`); `null` sub 120 de zile. `Probabilitati.stareActiuneLa(bare, i)` → `"sus-liniste"|"lateral-miscare"|…` sau null (sub 60 de zile).

- [ ] **Step 1: testele (picând)**
```js
const zi = (n, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: Date.UTC(2024, 0, 1) + i * 864e5, o: c, h: c * 1.01, l: c * 0.99, c }; });
await test("pentruActiune: atinge stopul mâine, ținta înaintea stopului în 5 zile, săritura separat; cazuri independente si IC", () => {
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5)));
  const r = PR.pentruActiune(b, { pret: b[399].c, stop: b[399].c * 0.97, tinta: b[399].c * 1.05, acum: b[399].t + 864e5 });
  assert.ok(r && r.stop1 && r.cursa5 && r.sare1, JSON.stringify(r && Object.keys(r)));
  assert.ok(r.stop1.n > 100 && r.stop1.nIndep === r.stop1.n, "fereastra de 1 zi la pas 1: toate independente");
  assert.ok(r.cursa5.tinta.nIndep <= Math.floor(r.cursa5.tinta.n / 5) + 1, "5 zile: n/5 independente"); assert.ok(r.stare);
  assert.equal(PR.pentruActiune(b.slice(0, 100), { pret: 100, stop: 97, tinta: 105, acum: b[99].t + 864e5 }), null);
});
await test("saritura peste stop se numara in sare1, NU in stop1", () => {
  const b = zi(300, () => 100); for (let i = 120; i < 300; i += 10) { b[i] = { ...b[i], o: 95, l: 94.5, h: 96, c: 100 }; }   // deschideri cu -5%
  const r = PR.pentruActiune(b, { pret: 100, stop: 97, tinta: 110, acum: b[299].t + 864e5 });
  assert.ok(r.sare1.k > 0, "sariturile peste stop numarate"); assert.equal(r.stop1.k, 0, "nicio atingere in zi fara saritura");
});
await test("doar ce se stia atunci: o bara din viitor mutata in trecut schimba rezultatul; weekendul nu arunca ferestrele", () => {
  const b = zi(300, (i) => 100 + (i % 7)), acum = b[299].t + 864e5;
  const r1 = PR.pentruActiune(b, { pret: 100, stop: 97, tinta: 105, acum });
  const b2 = b.map((x) => ({ ...x })); b2[150] = { ...b2[150], l: 50 };   // o cadere mare in trecut
  const r2 = PR.pentruActiune(b2, { pret: 100, stop: 97, tinta: 105, acum });
  assert.notDeepEqual([r1.stop1, r1.cursa5], [r2.stop1, r2.cursa5], "o bara din trecut schimbata trebuie sa schimbe frecventele");
  const cuGol = b.map((x, i) => ({ ...x, t: x.t + Math.floor(i / 5) * 2 * 864e5 }));   // 2 zile libere la fiecare 5
  assert.ok(PR.pentruActiune(cuGol, { pret: 100, stop: 97, tinta: 105, acum: cuGol[299].t + 864e5 }).stop1.n > 100);
});
await test("crypto neschimbat: frecventa fara cfg arunca fereastra cu gaura (ca azi)", () => {
  assert.ok(typeof PR.frecventa === "function");
});
```
- [ ] **Step 2:** `node scripts/proba-v10053.mjs` → PICĂ (`pentruActiune` lipsește).
- [ ] **Step 3: implementarea** — `frecventa(bare, H, ev, asteptat, stareAcum, opt)`: `var cfg = opt && opt.cfg || {}`, `ISTORIE_ = cfg.istorie || ISTORIE`, `PAS_ = cfg.pas || PAS`, `stareLa_ = cfg.stareLa || stareLa`, `regim_ = cfg.regimDin || regimDin`, continuitatea doar când `cfg.continuu !== false`; `indep(n, H, pas)`. Ramura crypto rămâne identică (fără `cfg`). `stareActiuneLa(b, i)`: sub 60 de bare ⇒ null; `st = ActiuniSemnale.stare(b.slice(0, i + 1), b[i].c)` (global; în colector parametru nou la `new Function`) ⇒ `trend.dir + "-" + (miscare ? "miscare" : "liniste")`, `fara-date` ⇒ null; regimul = trendul (`split("-")[0]`). `pentruActiune(bare, o)`: bare cu `x.t < acum` (bara zilei în curs scoasă de `bareBursa` înainte), sub 120 ⇒ null; `cfg = {istorie: 60, pas: 1, continuu: false, stareLa: stareActiuneLa, regimDin: trend}`; `relS = stop/pret − 1`, `relT = tinta/pret − 1`; `stop1 = frecventa(b, 1, ev, "da")` cu `ev = (b,i) => b[i+1].o > b[i].c*(1+relS) && b[i+1].l <= b[i].c*(1+relS) ? "da" : "nu"`; `sare1` cu `ev = b[i+1].o <= b[i].c*(1+relS) ? "da" : "nu"`; `cursa5 = {tinta, stop}` cu `cursa(relT, relS)` pe H = 5. Stop ≥ preț ⇒ `stop1 = sare1 = cursa5 = null`, `motiv: "stopul e deja depășit"`. Memo pe stare (O(n) apeluri `stare`).
- [ ] **Step 4:** proba; `npm run test:v10046 && npm run test:v10047` (crypto) verzi; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): probabilitatile pe iesire - stopul maine, tinta inaintea stopului in 5 zile, saritura separat (adaptorul in Probabilitati)`.

### Task 2: calibrarea pe cumpărările lui

**Files:**
- Modify: `scripts/lib/tura-t212.mjs` (la fiecare trade rejucat: `prob = {p, r}`), `functions/api/t212.js` (ruta `cf` păstrează `prob`), `public/lib/probabilitati.js` (`calibrareActiuni`), `scripts/colector.mjs` (dă `Probabilitati` la tura cf), `scripts/proba-v10053.mjs`

**Interfaces:**
- Consumes: `pentruActiune` (Task 1).
- Produces: `cf[id].prob = { p: number, r: 0|1, zi: number }` (p = „ținta înaintea stopului în 5 zile” la cumpărare; r = s-a întâmplat); `Probabilitati.calibrareActiuni(inchise, cf)` → `{ "act-cursa5": {cutii: [5 × {n,k}]} }` (forma `calibreaza`).

- [ ] **Step 1: testele (picând)**
```js
await test("calibrareActiuni: un caz pe ticker la >= 5 zile; cumpararile din aceeasi zi = un caz; cutiile ca la crypto", () => {
  const Z = 864e5, inch = [{ id: "a", ticker: "X", pornit: 0 }, { id: "b", ticker: "X", pornit: 2 * Z }, { id: "c", ticker: "X", pornit: 9 * Z }, { id: "d", ticker: "Y", pornit: 0 }, { id: "e", ticker: "Y", pornit: 3600000 }];
  const cf = { a: { prob: { p: 0.55, r: 1 } }, b: { prob: { p: 0.55, r: 0 } }, c: { prob: { p: 0.45, r: 0 } }, d: { prob: { p: 0.9, r: 1 } }, e: { prob: { p: 0.9, r: 1 } } };
  const cal = PR.calibrareActiuni(inch, cf), c = cal["act-cursa5"].cutii;
  assert.equal(c[2].n, 2, "X: a si c (b e la 2 zile de a)"); assert.equal(c[4].n, 1, "Y: d si e in aceeasi zi = un caz");
});
await test("rejucarea noteaza prob doar cu barele de dinainte si ruta cf o pastreaza", async () => {
  const t = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(t, /pentruActiune\(inainte/); assert.match(t, /prob: /);
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const r = await mod.onRequestPost({ request: new Request("http://127.0.0.1:8788/api/t212?action=cf", { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: JSON.stringify({ verdicte: { a1: { nivel: "cumpara", motive: [], greseli: [], prob: { p: 0.62, r: 1, zi: 5 } } } }) }), env });
  assert.equal(r.status, 200); assert.deepEqual(JSON.parse(kv.get("t212:cf")).a1.prob, { p: 0.62, r: 1, zi: 5 });
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — `tura-t212.mjs`: la fiecare trade cu `inainte.length >= 120`: `nv = niveluri(inainte, t.pretCumparare, {})`, dacă `nv.nivel === "ok"`: `pa = Probabilitati.pentruActiune(inainte, { pret: t.pretCumparare, stop: nv.stop, tinta: nv.tinta, acum: t.pornit })`, `p = pa && pa.cursa5 && pa.cursa5.tinta.p`; `r` = primele 5 bare cu `z > z0` (ziua cumpărării nu intră): ținta atinsă înaintea stopului ⇒ 1, altfel 0 (stop și țintă în aceeași bară ⇒ 0, pesimist); sub 5 bare ⇒ fără `prob`. Refacerea: verdictele cu `stopU` dar fără cheia `prob` (test de prezență, `prob: null` când nu se poate) se refac o dată. Ruta `cf`: `prob = {p ∈ [0,1], r ∈ {0,1}, zi}` sau null. `calibrareActiuni(inchise, cf)`: trade-uri sortate după `pornit`, cheia `ticker`, se ia un caz dacă e la ≥ 5 zile (calendaristice ×7/5 ≈ 7 zile) de ultimul caz al tickerului, apoi aceleași cutii ca `calibreaza`.
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): calibrarea probabilitatilor pe cumpararile tale (rejucarea noteaza cifra de atunci si ce a urmat in 5 zile)`.

### Task 3: pagina T212 — blocul poziției, rezultatele, versiunea, livrarea

**Files:**
- Modify: `public/lib/t212-ecran.js` (blocul „🎲 Probabilitățile din istoric” în detaliul poziției), `public/lib/probabilitati.js` (`randActiune` — textul unui rând), versiunile, `scripts/proba-v10053.mjs`

**Interfaces:**
- Consumes: `pentruActiune` (Task 1), `calibrareActiuni` + `corecteaza` (Task 2), `t212.rezultate[tk].data`, profilul (`t212ProfilPt`, pachetul 1).
- Produces: `Probabilitati.randActiune(rez, cal, o)` → `[{ titlu, p, ic, text }]` (3 rânduri + avertismentul rezultatelor).

- [ ] **Step 1: testul (picând)**
```js
await test("randActiune: trei randuri (stopul maine cu saritura alaturi, tinta inaintea stopului in 5 zile calibrata, saritura) + rezultatele in N zile", () => {
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5))), pret = b[399].c;
  const rez = PR.pentruActiune(b, { pret, stop: pret * 0.97, tinta: pret * 1.05, acum: b[399].t + 864e5 });
  const r = PR.randActiune(rez, {}, { rezultateZile: 3, evenimente: { mediana: 0.06, max: 0.18 } });
  assert.ok(r.length === 4, JSON.stringify(r.map((x) => x.titlu)));
  assert.match(r[0].titlu, /stopul.*mâine/i); assert.match(r[0].text, /din care prin săritură/); assert.match(r[1].text, /necalibrat încă/);
  assert.match(r[3].titlu, /Rezultatele vin în 3 zile/); assert.match(r[3].text, /18%/);
  assert.match(fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), /Probabilitati\.randActiune\(/);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — `randActiune`: rândul 1 „Atinge stopul (−X%) mâine” = `stop1.p + sare1.p` (total), text „k din n zile ca acum · din care prin săritură la deschidere: Y% · IC”; rândul 2 „În 5 zile de bursă: ținta (Z) înaintea stopului” cu `fr(cursa5.tinta, "act-cursa5", cal)` (calibrarea existentă); rândul 3 „Deschiderea sare peste stop” = `sare1`; rândul 4 doar dacă `o.rezultateZile` ∈ [0, 5]: „Rezultatele vin în N zile” + „săriturile mari ale acțiunii: de obicei ~M%, cea mai mare X% — cifrele de mai sus NU le cuprind”. Pagina: în detaliul poziției (sub „Stopul care urcă…”), cu barele `t212.bare[tk]`, stopul `n.stopPozitie`, ținta `plan.tinta || n.tintaPozitie`, calibrarea din `t212.cf` (memo ca `t212TrailAles`), `rezultateZile` din `t212.rezultate[tk].data` (zile calendaristice → de bursă ×5/7), `evenimente` din profilul poziției; stil existent `.tbProbRand` / `.tbSub`. Versiunile; `npm test`; ecran T212 (20) + Tablou + Grid; poze 1920/390 cu blocul; o repornire a colectorului (refacerea `prob`); revizia finală (agent Opus nou); reparațiile cu test; `npm test && git push`; memo.
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): probabilitatile pe pozitie in pagina T212 + rezultatele in N zile + v100.53 (colector v101.32)`.
