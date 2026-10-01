# Acțiunile T212 — Pachetul 1: profilul acțiunii — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** fiecare acțiune deschisă (și din idei) are un profil din 2 ani de bare zilnice — cât coboară/urcă într-o zi și în 5 zile de bursă, săritura la deschidere separat, zilele-eveniment aparte — iar stopul care urcă al poziției ia pragul din profil DOAR dacă pe trade-urile lui iese mai bine decât −15%.

**Architecture:** `ProfilMoneda.calculeaza` primește `piata: "actiuni"` (adaptorul din spec) și întoarce `z1`, `z5`, `sar`, `evenimente`; `pragStopActiune(p)` = P75 al coborârii pe 5 zile. Colectorul face profilurile noaptea (`turaProfilActiuni`) → KV `profil:<TICKER>` (ruta existentă, validare nouă pentru forma acțiunii). În tura „cf acțiuni” (rejucarea trade-urilor lui) intră varianta de stop `prof` — profilul socotit DOAR pe barele de dinaintea cumpărării; `ActiuniSemnale.alegeTrail(ru)` alege între `prof` și `u15` după bani; `niveluri` folosește `o.trailProfil` când a câștigat `prof`.

**Tech Stack:** JS vanilla (module IIFE în `public/lib`, colectorul Node le încarcă cu `new Function`), Pages Functions + KV local, probe Node.

**Spec:** `docs/superpowers/specs/2026-10-01-actiuni-t212-creier-design.md` — „Pachetul 1”.

## Global Constraints
- Același motor: crypto neschimbat — `calculeaza(bare, o)` fără `piata` sau cu `piata: "crypto"` dă exact ce dă azi (probele `v10045…v10051` verzi).
- Acțiunile: doar zilele de bursă (`GridCalcul.bareBursa`), ferestre de 1 și 5 zile de bursă, pornind la fiecare zi; `nIndep` = ferestre care nu se suprapun (`floor(n / zile)`).
- Săritura la deschidere = `max(0, 1 − o_i / c_{i−1})` (în jos), distribuție separată; zilele-eveniment = săriturile STRICT peste percentila 98 a |o_i / c_{i−1} − 1| (cele mai mari ~2%) — ferestrele care le conțin ies din `z1`/`z5` și se arată separat.
- Stopul care urcă (azi `minTrail: 0.15`, măsurat pe trade-urile lui la 25.09: +1.001 lei față de fără stop) se schimbă DOAR dacă varianta `prof` iese ≥ `u15` pe trade-urile judecate, cu cel puțin 30 de trade-uri judecate; altfel rămâne −15% și profilul apare doar ca informație. Sursa scrisă lângă stop.
- Profiluri doar pentru pozițiile deschise + acțiunile din idei; noaptea (după închiderea bursei SUA, 23:00–07:00 ora României), o dată pe zi pe ticker; pauză 1,2 s între cereri.
- Versiuni: `v100.52 · PROFILUL ACȚIUNII` (BUILD_INFO, package.json `100.52.0`, index.html ×4, sw.js `crypto-radar-v100-52`, `functions/_shared/versiune.js`), colector `v101.31`; proba `scripts/proba-v10052.mjs` legată în `npm test`.

## Review Focus
1. Acțiune cu sub 120 de zile de bare (listată de curând) ⇒ fără profil („prea puține zile”), stopul rămâne −15%, nimic nu cade.
2. Lumânări cu goluri (zile fără tranzacționare, split) ⇒ săritura nu se socotește peste gol (doar între zile de bursă consecutive în listă); un split (|săritură| > 40%) nu intră în distribuții.
3. Varianta `prof` socotită cu bare de DUPĂ cumpărare ar trișa ⇒ profilul variantei se face doar din barele cu `t + 8 h ≤ pornit` (ca varianta „plan”).
4. Ticker fără prețuri (404, delistat) în tura de noapte ⇒ sărit și notat, tura merge mai departe.
5. KV `profil:<TICKER>` nu calcă profilurile crypto (`profil:<SIMBOL_PERP>`): cheia acțiunii are `_US_EQ` / `_EQ`; ruta validează forma după `piata`.

---

### Task 1: `ProfilMoneda` — adaptorul pentru acțiuni

**Files:**
- Modify: `public/lib/profil-moneda.js` (`calculeaza`, `sursa`, `moneda`, export `pragStopActiune`)
- Create: `scripts/proba-v10052.mjs`; Modify: `package.json` (`test:v10052` în lanț)

**Interfaces:**
- Produces: `ProfilMoneda.calculeaza(bare, { piata: "actiuni", simbol, acum })` → `{ v: 1, piata: "actiuni", simbol, la, deLa, panaLa, zile, z1: {jos, sus, n, nIndep}, z5: {…}, sar: {jos: [21 cuantile], n}, evenimente: {n, zile: [t…≤20], mediana, max} }` sau `null` (sub 120 de bare). `ProfilMoneda.pragStopActiune(p)` → `{ dist, sursa }` (P75 din `z5.jos`) sau `null`.

- [ ] **Step 1: testele (picând)**
```js
await test("profilul actiunii: 1 si 5 zile de bursa, saritura separat, evenimentele scoase din distributii", () => {
  const bare = []; let c = 100;
  for (let i = 0; i < 300; i++) { const gap = i === 150 ? 0.82 : i % 40 === 0 ? 0.97 : 1; const o = c * gap, h = o * 1.012, l = o * 0.985; c = o * (1 + 0.004 * Math.sin(i)); bare.push({ t: Date.UTC(2025, 0, 1) + i * 864e5, o, h, l, c }); }
  const p = PM.calculeaza(bare, { piata: "actiuni", simbol: "INTC_US_EQ", acum: bare[299].t + 864e5 });
  assert.equal(p.piata, "actiuni"); assert.equal(p.z1.jos.length, 21); assert.equal(p.z5.jos.length, 21); assert.ok(p.z5.nIndep >= 50);
  assert.ok(p.evenimente.n >= 1 && p.evenimente.max >= 0.17, JSON.stringify(p.evenimente)); assert.ok(p.z1.jos[20] < 0.1, "saritura de 18% nu intra in ziua obisnuita");
  assert.ok(p.sar.jos[20] >= 0.02 && p.sar.n > 200);
  const s = PM.pragStopActiune(p); assert.ok(s.dist > 0 && s.dist < 0.1); assert.match(s.sursa, /INTC.*zile de bursă/);
  assert.equal(PM.calculeaza(bare.slice(0, 100), { piata: "actiuni" }), null, "sub 120 de zile");
});
await test("crypto neschimbat: fara piata -> forma de azi (z24/z12, fara z5)", () => {
  const b = Array.from({ length: 24 * 40 }, (_, i) => ({ t: i * 36e5, o: 1, h: 1.01, l: 0.99, c: 1 }));
  const p = PM.calculeaza(b, { simbol: "CRV_USDT_PERP", acum: 24 * 41 * 36e5 }); assert.ok(p.z24 && p.z12 && !p.z5 && !p.piata);
});
await test("split (|saritura| > 40%) nu intra in nicio distributie", () => {
  const bare = Array.from({ length: 200 }, (_, i) => { const k = i < 100 ? 1 : 0.5; return { t: i * 864e5, o: 100 * k, h: 101 * k, l: 99 * k, c: 100 * k }; });
  const p = PM.calculeaza(bare, { piata: "actiuni", simbol: "X_US_EQ", acum: 201 * 864e5 }); assert.ok(p.sar.jos[20] < 0.4 && p.z5.jos[20] < 0.4, JSON.stringify(p.sar.jos.slice(-2)));
});
```
- [ ] **Step 2:** `node scripts/proba-v10052.mjs` → PICĂ (`piata` lipsește).
- [ ] **Step 3: implementarea** — în `calculeaza`, ramura `o.piata === "actiuni"`: bare valide sortate (aceleași filtre, fără `x.t + ORA <= acum`, ci `x.t < acum`), sub 120 ⇒ null; `gap[i] = o_i / c_{i−1} − 1` pentru i ≥ 1; split = |gap| > 0,4 ⇒ zi exclusă și ferestrele care o conțin sărite; evenimente = |gap| STRICT peste percentila 98 a |gap| (fără split); `ferestre(k)`: pentru fiecare s, fereastra [s, s+k) fără zi-eveniment/split în ea (ziua s se judecă după gap[s]): coborârea max `1 − min(l)/o_s`, urcarea `max(h)/o_s − 1`; `z1 = distributie(1)`, `z5 = distributie(5)` cu `nIndep = floor(n / k)`; `sar.jos = cuantile(max(0, −gap))` pe zilele fără split și fără eveniment, `sar.n`; `evenimente = {n, zile: ultimele 20 de t, mediana, max}` pe |gap|. `sursa(p)` pentru `p.piata === "actiuni"`: „profilul <TICKER>: N zile de bursă (bare zilnice)”; `moneda(s)` scoate și `_US_EQ`/`_EQ`. `pragStopActiune(p) = p && p.piata === "actiuni" ? {dist: prag(p, "z5", "jos", 0.75), sursa} : null`.
- [ ] **Step 4:** proba → 3/3; `npm run test:v10045` verde (crypto neschimbat); `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): profilul actiunii - 1 si 5 zile de bursa, saritura la deschidere separat, evenimentele aparte (adaptorul piata in ProfilMoneda)`.

### Task 2: profilurile noaptea — ruta și colectorul

**Files:**
- Modify: `functions/api/istoric-bot.js` (ruta POST `profil`: forma acțiunii), `scripts/colector.mjs` (`turaProfilActiuni`, stare în `profilStare.actiuni`), `scripts/proba-v10052.mjs`

**Interfaces:**
- Consumes: `ProfilMoneda.calculeaza(bare, {piata:"actiuni"})` (Task 1).
- Produces: KV `profil:<TICKER>` cu forma acțiunii; GET `action=profil&simbol=<TICKER>` o întoarce.

- [ ] **Step 1: testele (picând)**
```js
await test("ruta profil: primeste si intoarce forma actiunii (z1/z5/sar/evenimente); forma crypto merge ca inainte", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const q = Array.from({ length: 21 }, (_, k) => k / 200), d = { jos: q, sus: q, n: 300, nIndep: 60 };
  const prof = { v: 1, piata: "actiuni", simbol: "INTC_US_EQ", la: 1, deLa: 0, panaLa: 1, zile: 300, z1: d, z5: d, sar: { jos: q, n: 290 }, evenimente: { n: 6, zile: [1, 2], mediana: 0.05, max: 0.18 } };
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "INTC_US_EQ", profil: prof }), env })).status, 200);
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=profil&simbol=INTC_US_EQ"), env })).json();
  assert.equal(g.profil.piata, "actiuni"); assert.equal(g.profil.z5.jos.length, 21); assert.equal(g.profil.evenimente.n, 6);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /async function turaProfilActiuni/); assert.match(col, /piata: "actiuni"/); assert.match(col, /action=pozitii/); assert.match(col, /action=idei/);
});
```
- [ ] **Step 2:** → PICĂ (ruta cere `z24`/`z12`).
- [ ] **Step 3: implementarea** — ruta POST `profil`: dacă `p.piata === "actiuni"` ⇒ `z1`, `z5` prin `curataDistributie`, `sar = {jos: cuantile valide (21), n}`, `evenimente = {n, zile ≤ 20 numere, mediana, max}`; altfel ramura crypto de azi. Colectorul: `turaProfilActiuni()` — doar între 23:00 și 07:00 (ora României), o dată pe zi pe ticker (`profilStare.actiuni[tk] = zi`), tickere = `action=pozitii` + `action=idei` (`idei.actiuni[].ticker`), pentru fiecare: `GridCalcul.bareBursa(randuri 1d)` → `ProfilMoneda.calculeaza(b, {piata:"actiuni", simbol: tk})` → POST `action=profil`; 404 ⇒ jurnal și mai departe; pauză 1,2 s; chemată în `bucla` după `turaProfil`.
- [ ] **Step 4:** proba; `COLECTOR_DOAR_INCARCA=1 node scripts/colector.mjs` → `INCARCAT true`; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): profilurile noaptea pentru pozitii + idei (KV profil:<TICKER>, ruta cu forma actiunii; colector)`.

### Task 3: varianta de stop `prof` în rejucarea trade-urilor lui

**Files:**
- Modify: `scripts/lib/tura-t212.mjs` (`turaCfActiuni`: varianta `prof` + refacerea verdictelor fără ea), `scripts/colector.mjs` (dă `ProfilMoneda`), `public/lib/t212-ecran.js` (`T212_VARIANTE_STOP` + `rezumatStop(… ["plan","u15","u25","prof"] …)`), `public/lib/actiuni-semnale.js` (`alegeTrail`), `scripts/proba-v10052.mjs`

**Interfaces:**
- Consumes: `ProfilMoneda.pragStopActiune` (Task 1).
- Produces: `cf[id].stopU.prof` = `{pct, zi, trail}` | null; `ActiuniSemnale.alegeTrail(ru)` → `{ cheie: "prof"|"u15", motiv, judecate, dif }` (ru = `rezumatStop(…, ["plan","u15","u25","prof"], "stopU")`).

- [ ] **Step 1: testele (picând)**
```js
await test("varianta prof: profilul din barele de DINAINTEA cumpararii; alegeTrail - prof doar daca iese >= u15 pe cel putin 30 de trade-uri", () => {
  const ru = (p, u, j) => ({ judecate: j, real: 0, praguri: { prof: { total: p, dif: p }, u15: { total: u, dif: u }, plan: { total: 0, dif: 0 }, u25: { total: 0, dif: 0 } } });
  assert.equal(AS.alegeTrail(ru(120, 100, 40)).cheie, "prof");
  assert.equal(AS.alegeTrail(ru(90, 100, 40)).cheie, "u15");
  const m = AS.alegeTrail(ru(500, 100, 20)); assert.equal(m.cheie, "u15"); assert.match(m.motiv, /20 din 30/);
  const t = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(t, /cheie: "prof"/); assert.match(t, /pragStopActiune\(/); assert.match(t, /b\.t \+ 8 \* 3600000 <= t\.pornit/);
  assert.match(t, /"prof" in \(gata\[t\.id\]\.stopU \|\| \{\}\)/, "verdictele vechi fara prof se refac (o data: null ramane null)");
  assert.match(fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), /k: "prof"/);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — `tura-t212.mjs`: în condiția de refacere se adaugă `|| !("prof" in (gata[t.id].stopU || {}))` (test de PREZENȚĂ: un `prof: null` — acțiune fără profil — nu se reface la nesfârșit); pentru fiecare trade: `pp = d.ProfilMoneda.calculeaza(inainte, { piata: "actiuni", simbol: tk, acum: t.pornit })`, `ps = pp && d.ProfilMoneda.pragStopActiune(pp)`, varianta `{ cheie: "prof", trailPct: ps ? Math.round(ps.dist * 1000) / 10 : null }`. `alegeTrail(ru)`: sub 30 judecate ⇒ `{cheie:"u15", motiv: "profilul se probează pe trade-urile tale: " + j + " din 30"}`; `prof.total >= u15.total` ⇒ `{cheie:"prof", motiv: "pe " + j + " trade-uri ale tale, stopul din profil a ieșit " + L(dif) + " față de −15%"}`; altfel u15 cu motivul invers. `t212-ecran.js`: rândul „urcă după maxim — coborârea obișnuită a acțiunii pe 5 zile (profil, P75)”.
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): stopul din profil probat pe trade-urile tale (varianta prof in „Cât te-ar fi salvat stopul”, alegeTrail)`.

### Task 4: stopul poziției din profil (când a câștigat), versiunea, livrarea

**Files:**
- Modify: `public/lib/actiuni-semnale.js` (`niveluri`: `o.trailProfil`, `o.sursaTrail`), `scripts/colector.mjs` (poza: profilul pozițiilor + câștigătorul din `cf`), `public/lib/t212-ecran.js` / `public/app.js` (pagina T212: aceeași alegere, sursa lângă stop), versiunile, `scripts/proba-v10052.mjs`

**Interfaces:**
- Consumes: `alegeTrail` (Task 3), `pragStopActiune` (Task 1), KV `profil:<TICKER>` (Task 2).
- Produces: `niveluri(bare, pret, {…, trailProfil, sursaTrail})` → `trailPct`, `sursaTrail` în rezultat.

- [ ] **Step 1: testul (picând)**
```js
await test("niveluri: cu trailProfil (cand a castigat prof) stopul pozitiei urca la −P75 pe 5 zile, cu sursa; fara el, −15% ca azi", () => {
  const b = Array.from({ length: 200 }, (_, i) => ({ t: i * 864e5, o: 100 + i * 0.1, h: 101 + i * 0.1, l: 99 + i * 0.1, c: 100 + i * 0.1 }));
  const azi = AS.niveluri(b, 120, { minTrail: 0.15, maxDupaCumparare: 125 }), cu = AS.niveluri(b, 120, { trailProfil: 0.08, sursaTrail: "profilul INTC: 500 zile de bursă", maxDupaCumparare: 125 });
  assert.ok(Math.abs(azi.trailPct - 15) < 0.5, String(azi.trailPct)); assert.ok(Math.abs(cu.trailPct - 8) < 0.5 || cu.trailPct > 8, String(cu.trailPct)); assert.match(cu.sursaTrail, /profilul INTC/);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — `niveluri`: `var tm = o.trailProfil > 0 ? o.trailProfil : o.minTrail` (stopul tot nu coboară sub riscul `d` din ATR), rezultatul primește `sursaTrail: o.trailProfil > 0 ? o.sursaTrail : (o.minTrail > 0 ? "−15% de la maxim (măsurat pe trade-urile tale)" : null)`. Colectorul (poza) și pagina T212: citesc `cf` → `alegeTrail`; dacă `prof`, `trailProfil = pragStopActiune(profil:<TICKER>).dist`. Versiunile (v100.52, colector v101.31). `npm test`, ecran T212 (proba de ecran existentă a paginii T212) + poze 1920/390, o repornire a colectorului, probă pe viu (profilul INTC/AMD în KV după tura de noapte — sau o rulare forțată din scratchpad), revizia finală (agent Opus nou), reparațiile cu test, `npm test && git push`, memo.
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): stopul pozitiei din profil cand a castigat pe trade-urile tale + v100.52 PROFILUL ACȚIUNII (colector v101.31)`.
