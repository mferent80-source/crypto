# L2 — arborii și rețeaua pe acțiuni (T212) + ideile 2–3: planul de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, regula lui: lucrez direct). Registrul stă la coada
> acestui fișier (secțiunea „Registru”) și în memorie după fiecare sarcină. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a doua și a treia părere (🧠 rețeaua, 🌳 arborii) pe acțiunile T212 — pozițiile, poarta și ideile de cumpărare — cu aceeași
verificare walk-forward și același prag „dovedită” ca pe boți; plus bugetul antrenorului de noapte (ideea 2) și legenda benzii (ideea 3).

**Architecture:** barele zilnice (2 ani, Yahoo prin ruta `/api/t212?action=preturi&interval=1d`) și perechile închise ale lui se strâng
noaptea de colector în `data/retea/zile/<ticker>.json` și `data/retea/trade-uri.json`; `retea/date-t212.mjs` face rândurile pe cele cinci
ținte T212 (`stop1-t212`, `sare1-t212`, `cursa5-t212`, `directie-t212`, `rezultat-t212`) cu trăsăturile zilnice din `Retea.trasaturiZilnice`
(aceeași funcție pentru istoric și pentru „acum”); amândoi antrenorii (`antreneaza.mjs`, `antreneaza-arbori.mjs`) le iau prin `randuri(t)`;
pagina T212 calculează în browser `Retea.pentruActiune` / `Arbori.pentruActiune` pe barele pe care le are deja și desenează sub-blocul
cu `reteaHtml` (rândurile 🎲 ale `Probabilitati.randActiune` primesc `cod`); ideile primesc cifrele de la colector (el are barele).

**Tech Stack:** JS curat (ESM în `retea/`, `scripts/`; ES5 în `public/lib`), TF.js wasm doar în antrenorul rețelei, Cloudflare Pages
Functions (KV `ISTORIC`), probe `scripts/proba-v10094.mjs` în lanțul `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-04-gradient-boosting-design.md` (secțiunile „Țintele, exact”, „Trăsăturile”, „Datele pe acțiuni”,
„Verificarea”, „Ce vede el”, „Livrările” → L2). Ideile 2–3 din raportul v100.93 (mărginite, aprobate prin „fa idei”).

## Global Constraints

- Versiunea paginii v100.94 (BUILD_INFO.json, `functions/_shared/versiune.js`, `public/sw.js` → `crypto-radar-v100-94`, `public/index.html` ×4,
  `package.json` 100.94.0); colectorul `VERSIUNE_COLECTOR = "v101.64"`; `Retea.VERSIUNE` rămâne `r1` și `Arbori.VERSIUNE` `a1` (țintele noi
  sunt chei noi în `modele`, nu schimbă trăsăturile celor vechi; hash-ul codului se schimbă oricum ⇒ lunile se rejudecă, ca la orice livrare).
- `npm test && git commit` — commit DOAR cu `grep -q "^exit=0$"` pe ieșirea suitei; un singur `git push` la final; fără `git pull` în `crypto`;
  nimic din `data/` în git; rădăcina fără dependențe npm; pagina fără biblioteci; `python` e stub ⇒ node.
- Hiperparametrii arborilor rămân `HIPER_ARBORI` (fixați); ai rețelei `HIPER`. Nimic nu se caută pe lunile judecate. Nicio trăsătură nouă pe
  crypto; pe acțiuni cele 14 din spec, tăiate la ±10.
- Trăsăturile zilnice la ziua t dau EXACT același rezultat cu și fără barele de după t (proba o verifică).
- Textele românești cu diacritice; gărzile STRICT fără abateri (`node scripts/garda-texte.mjs`); rândurile ≤ 160; „de” prin `cate`; cifrele
  prin TextRo; `public/lib/*.js` ES5, fără `//` lipit la mijlocul rândului; editările cu script (ancore unice, EOL păstrat).
- Fiecare test văzut ROȘU înainte de cod; proba nouă `scripts/proba-v10094.mjs` (+ `test:v10094` în lanț); probele vechi rămân verzi sau se
  actualizează cu hotărâre scrisă.
- Lipsa rămâne lipsă: fără bare (sub 250 de zile), fără QQQ, fără stop ⇒ fără cifră; nimic inventat; `Number(null)` nu e 0.

## Review Focus

1. Un ticker cu bare zilnice cu găuri (zile lipsă, split) ⇒ trăsăturile folosesc doar barele existente, etichetele sar peste rândurile cu mai
   puțin de H bare după, nimic nu crapă (Task 2, testul cu găuri).
2. Barele paginii includ ziua în curs (bursa deschisă) ⇒ `pentruActiune` din `Retea`/`Arbori` judecă pe ultima bară ÎNCHISĂ (prin
   `GridCalcul.bareBursa`), nu pe cea în formare (Task 3, testul „ziua în curs”).
3. KV `retea`/`arbori` fără țintele T212 (modelele de ieri) ⇒ pagina T212 arată exact ce arăta ieri, fără sub-bloc, fără excepție (Task 6).
4. Perechile lui cu `cost` 0 sau `rezultat` lipsă ⇒ nu intră în rândurile A; `rata` pe acțiune fără trade-uri = rata globală trasă spre medie
   (Task 2, testul trade-urilor).
5. Bugetul de noapte: rețeaua 45 min + arborii 30 min + strânsul barelor ⇒ totul sub fereastra 02–05; antrenorul oprit la 50 de minute
   lasă modelele de ieri (Task 5, testul deps-urilor).

---

### Task 1: trăsăturile zilnice, intrările pe țintă, țintele T212 în `Retea`, codurile rândurilor 🎲 pe acțiuni

**Files:**
- Modify: `public/lib/retea.js` (după `trasaturiBot`: `indexZi`, `sigmaZi`, `qqqLa`, `trasaturiZilnice`, `intrareActiune`; `TINTE`, `NUME`,
  `TINTA_DE`, exporturile), `public/lib/probabilitati.js` (`randActiune`: `cod` pe rânduri; `frecventaActiune` exportată)
- Test: `scripts/proba-v10094.mjs` (nou; capul ca în `proba-v10093.mjs`: `B, G, AS, P, R, S`, `incarcaArbori`, `citeste`, `fnApp`, `ACUM`)

**Interfaces:**
- Produces: `Retea.trasaturiZilnice(b, i, qqq, rata)` → `{ x: 14 cifre, s1: volatilitatea zilnică pe 20 de zile, c, stare, t: b[i].t + ZI }`
  sau `null` (i < 250, fără QQQ la zi, s1 = 0); `Retea.intrareActiune(tinta, f, e)` → listă sau `null` (`stop1-t212`/`sare1-t212`: `e = {relS}`;
  `cursa5-t212`: `e = {relT, relS}`; `directie-t212`: `{}`; `rezultat-t212`: `e = {cost, glob, nPe}`); `Retea.TINTE` cu cele 5 ținte T212
  (`bloc` 24/24/168/168/24); `Retea.NUME_T212` = `{ "stop1-t212": "Atinge stopul mâine", "sare1-t212": "Deschiderea sare peste stop",
  "cursa5-t212": "În 5 zile de bursă: ținta înaintea stopului", "directie-t212": "Prețul mai sus peste 5 zile de bursă", "rezultat-t212": "Un
  trade ca ăsta iese pe plus" }` (în `NUME`); `TINTA_DE`: `stop1 → stop1-t212`, `sare1 → sare1-t212`, `cursa5 → cursa5-t212`, `directie5 →
  directie-t212`; `Probabilitati.randActiune` rândurile cu `cod` (`stop1`, `cursa5`, `sare1`); `Probabilitati.frecventaActiune(b, H, ev, bun,
  stare, memo)` = `frecventa` cu configurația acțiunilor.

- [ ] **Step 1: Write the failing tests**

```js
// capul fișierului: ca în proba-v10093.mjs (import test-ro-global, lib(), B/G/AS/P/R/S, incarcaArbori, citeste, fnApp, ACUM = Date.UTC(2026, 9, 4, 12))
const ZI = 864e5;
// bare zilnice sintetice (t la 13:30 UTC ca Yahoo), 400 de zile, mers aleator cu sămânță; QQQ la fel
const bareZi = (n, p0, sem) => { const r = (() => { let a = sem; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })(); const l = []; let c = p0; for (let i = 0; i < n; i++) { const o = c; c = c * (1 + (r() - 0.5) * 0.04); l.push({ t: Date.UTC(2025, 0, 1, 13, 30) + i * ZI, o, h: Math.max(o, c) * 1.01, l: Math.min(o, c) * 0.99, c, v: 1000 }); } return l; };
await test("(1) Retea.trasaturiZilnice: 14 cifre tăiate la ±10 la ziua i, identice cu și fără barele de după i; null sub 250 de zile sau fără QQQ la zi; intrareActiune pe cele 5 ținte; TINTE/NUME/TINTA_DE cu țintele T212", () => {
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5);
  const f = R.trasaturiZilnice(b, 300, q, 0.5); assert.ok(f && f.x.length === 14 && f.x.every((v) => Number.isFinite(v) && Math.abs(v) <= 10), JSON.stringify(f));
  assert.deepEqual(R.trasaturiZilnice(b.slice(0, 301), 300, q.slice(0, 301), 0.5).x, f.x, "barele de după i schimbă trăsăturile");
  assert.equal(f.t, b[300].t + ZI); assert.ok(f.s1 > 0 && f.c === b[300].c && typeof f.stare === "string");
  assert.equal(R.trasaturiZilnice(b, 249, q, 0.5), null); assert.equal(R.trasaturiZilnice(b, 300, null, 0.5), null); assert.equal(R.trasaturiZilnice(b, 300, q.slice(0, 200), 0.5), null, "QQQ fără bară la zi");
  assert.equal(R.intrareActiune("stop1-t212", f, { relS: -0.05 }).length, 17); assert.equal(R.intrareActiune("sare1-t212", f, { relS: -0.05 })[16], -1);
  assert.equal(R.intrareActiune("cursa5-t212", f, { relT: 0.05, relS: -0.03 }).length, 18); assert.equal(R.intrareActiune("directie-t212", f, {}).length, 14);
  assert.equal(R.intrareActiune("rezultat-t212", f, { cost: 500, glob: 0.6, nPe: 3 }).length, 17); assert.equal(R.intrareActiune("stop1-t212", f, { relS: 0 }), null); assert.equal(R.intrareActiune("cursa5-t212", f, { relT: 0.05 }), null);
  for (const t of ["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212", "rezultat-t212"]) assert.ok(R.TINTE[t] && typeof R.NUME[t] === "string" && R.NUME[t].length <= 60, t);
  assert.deepEqual([R.TINTE["stop1-t212"].bloc, R.TINTE["cursa5-t212"].bloc, R.TINTE["directie-t212"].bloc, R.TINTE["rezultat-t212"].bloc], [24, 168, 168, 24]);
  assert.equal(R.TINTA_DE.stop1, "stop1-t212"); assert.equal(R.TINTA_DE.cursa5, "cursa5-t212"); assert.equal(R.TINTA_DE.directie5, "directie-t212"); assert.equal(R.TINTA_DE.sare1, "sare1-t212");
});
await test("(1) Probabilitati.randActiune: rândurile poartă cod (stop1, cursa5, sare1); frecventaActiune e frecventa cu configurația acțiunilor (aceeași cifră ca stop1 din pentruActiune)", () => {
  const b = bareZi(400, 100, 11), pa = P.pentruActiune(b, { pret: b[b.length - 1].c, stop: b[b.length - 1].c * 0.95, tinta: b[b.length - 1].c * 1.05, acum: b[b.length - 1].t + ZI });
  const l = P.randActiune(pa, {}, {}); assert.deepEqual(l.map((x) => x.cod), ["stop1", "cursa5", "sare1"], JSON.stringify(l.map((x) => x.titlu)));
  const bb = b.slice(0, -1), st = pa.stare, relS = -0.05, ev = (x, i) => { const niv = x[i].c * (1 + relS); return x[i + 1].o > niv && x[i + 1].l <= niv ? "da" : "nu"; };
  const q = P.frecventaActiune(bb, 1, ev, "da", st, {}); assert.ok(q && Math.abs(q.p - pa.stop1.p) < 1e-12 && q.n === pa.stop1.n, JSON.stringify([q, pa.stop1]));
});
```

- [ ] **Step 2: Run** — `node scripts/proba-v10094.mjs` → ROȘU: `R.trasaturiZilnice is not a function`, apoi `cod` lipsă.
- [ ] **Step 3: Implement**

`public/lib/retea.js`, după `trasaturiBot` (ES5; `taie`, `nr`, `ZI` există):
```js
  // ---- v100.94 (acțiunile T212): trăsăturile ZILNICE - aceeași funcție pentru istoric (antrenor) și pentru „acum” (pagina) ----
  // ultima bară zilnică ÎNCHISĂ la momentul t: b[i].t + ZI <= t (bara zilei D e închisă abia a doua zi); -1 dacă nu e niciuna
  function indexZi(b, t) { var lo = 0, hi = (Array.isArray(b) ? b.length : 0) - 1, i = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (b[m].t + ZI <= t) { i = m; lo = m + 1; } else hi = m - 1; } return i; }
  function sigmaZi(b, i, n) { var s = 0, s2 = 0; for (var j = i - n + 1; j <= i; j++) { var r = Math.log(b[j].c / b[j - 1].c); s += r; s2 += r * r; } var m = s / n, v = s2 / n - m * m; return v > 0 ? Math.sqrt(v) : 0; }
  function mediaZi(b, i, n) { var s = 0; for (var j = i - n + 1; j <= i; j++) s += b[j].c; return s / n; }
  // QQQ la aceeași zi (ultima bară a lui cu t <= b[i].t): randamentul pe 5 zile în volatilitatea lui pe 20; null fără bară la zi (±1 zi) sau sub 25 de bare
  function qqqLa(q, t) { var j = indexZi(q, t + ZI); if (j < 25 || Math.abs(q[j].t - t) > ZI) return null; var s = sigmaZi(q, j, 20); return s > 0 ? Math.log(q[j].c / q[j - 5].c) / (s * Math.sqrt(5)) : 0; }
  // -> { x: 14 cifre tăiate la ±10, s1 (volatilitatea zilnică pe 20 de zile), c, stare, t (a doua zi la 00:00 UTC după bara i) }; null sub 250 de zile, fără QQQ la zi sau fără mișcare
  function trasaturiZilnice(b, i, qqq, rata) {
    if (!Array.isArray(b) || !(i >= 250) || i >= b.length) return null;
    var c = b[i].c, s20 = sigmaZi(b, i, 20), s250 = sigmaZi(b, i, 250); if (!(c > 0) || !(s20 > 0) || !(s250 > 0)) return null;
    var qq = qqqLa(qqq, b[i].t); if (qq === null) return null;
    var mx = -Infinity; for (var j = i - 249; j <= i; j++) if (b[j].h > mx) mx = b[j].h;
    var r = function (k) { return Math.log(c / b[i - k].c); }, st = Probabilitati.stareActiuneLa(b, i), zi = new Date(b[i].t).getUTCDay(), rt = nr(rata);
    var x = [r(5) / (s20 * Math.sqrt(5)), r(20) / (s20 * Math.sqrt(20)), r(60) / (s20 * Math.sqrt(60)), Math.log(s20), Math.log(s20 / s250), Math.log(mx / c) / s20,
      Math.log(c / mediaZi(b, i, 50)), Math.log(c / mediaZi(b, i, 200)), qq, st && st.indexOf("sus") === 0 ? 1 : st && st.indexOf("jos") === 0 ? -1 : 0, st && /miscare$/.test(st) ? 1 : 0,
      Math.sin(2 * Math.PI * zi / 7), Math.cos(2 * Math.PI * zi / 7), rt === null ? 0.5 : rt].map(taie);
    return { x: x, s1: s20, c: c, stare: st || null, t: b[i].t + ZI };
  }
  // intrările pe țintă T212 = trăsăturile + ce cere ținta (distanțele simple și în volatilități pe orizont, semnul; la rezultat: valoarea cumpărată, rata globală, câte trade-uri pe acțiune)
  function intrareActiune(tinta, f, e) {
    if (!f) return null; e = e || {}; var s5 = f.s1 * Math.sqrt(5);
    if (tinta === "stop1-t212" || tinta === "sare1-t212") { var S = nr(e.relS); if (S === null || S === 0) return null; return f.x.concat([S, taie(Math.abs(S) / f.s1), S > 0 ? 1 : -1]); }
    if (tinta === "cursa5-t212") { var T = nr(e.relT), S2 = nr(e.relS); if (T === null || S2 === null || T === 0 || S2 === 0) return null; return f.x.concat([T, S2, taie(Math.abs(T) / s5), taie(Math.abs(S2) / s5)]); }
    if (tinta === "directie-t212") return f.x.slice();
    if (tinta === "rezultat-t212") { var cost = nr(e.cost), glob = nr(e.glob), nPe = nr(e.nPe); if (cost === null || !(cost > 0) || glob === null || nPe === null) return null; return f.x.concat([Math.log(cost), glob, Math.log(1 + nPe)]); }
    return null;
  }
```
`TINTE` (rândul 11): + `"stop1-t212": { bloc: 24 }, "sare1-t212": { bloc: 24 }, "cursa5-t212": { bloc: 168 }, "directie-t212": { bloc: 168 }, "rezultat-t212": { bloc: 24 }`.
`NUME` (rândul ~155): + cele 5 nume de mai sus (`Retea.NUME` se exportă). `TINTA_DE`: + `stop1: "stop1-t212", sare1: "sare1-t212", cursa5: "cursa5-t212", directie5: "directie-t212"`.
Exporturile: `indexZi: indexZi, trasaturiZilnice: trasaturiZilnice, intrareActiune: intrareActiune, NUME: NUME, TINTA_DE: TINTA_DE`.
`probabilitati.js`: în `randActiune` fiecare `out.push({...})` primește `cod: "stop1"` / `"cursa5"` / `"sare1"` (primul câmp); după `pentruActiune`:
`function frecventaActiune(b, H, ev, bun, stare, memo) { return frecventa(b, H, ev, bun, stare, { memo: memo || {}, cfg: CFG_ACT }); }` + export `frecventaActiune: frecventaActiune, stareActiuneLa: stareActiuneLa` (dacă nu e deja).

- [ ] **Step 4: Run** — `✓ (1)` ×2; `node scripts/garda-texte.mjs` PASS; `node scripts/proba-v10080-ecran.mjs`, `proba-v10093.mjs`, `proba-v10055*.mjs` (dacă există, rândurile `randActiune` cu `cod` în plus nu strică `deepEqual` pe titluri) verzi.
- [ ] **Step 5: Commit** — `git commit -m "feat(retea): trăsăturile zilnice T212, intrările pe țintă, țintele T212 în Retea, codurile rândurilor 🎲 pe acțiuni"`.

### Task 2: `retea/date-t212.mjs` — barele zilnice, trade-urile, rândurile pe cele 5 ținte, reperul 🎲

**Files:**
- Create: `retea/date-t212.mjs`
- Test: `scripts/proba-v10094.mjs`

**Interfaces:**
- Consumes: `Retea.trasaturiZilnice`, `Retea.intrareActiune`, `Probabilitati.pentruActiune`, `Probabilitati.frecventaActiune`, `GridCalcul.bareBursa`.
- Produces: `ORIZONT_T212 = { "stop1-t212": 24, "sare1-t212": 24, "cursa5-t212": 168, "directie-t212": 168, "rezultat-t212": 24 }` (ore, pentru
  `optiuniLuni`); `STOPURI = [-0.02, -0.03, -0.05, -0.08, -0.1]`, `CURSE = [[0.03, -0.03], [0.05, -0.03], [0.05, -0.05], [0.08, -0.05], [0.1, -0.05]]`;
  `tickere(rad)` → lista din `data/retea/zile/` (fără QQQ); `citesteZile(rad, ticker, G)` → bare `{t,o,h,l,c,v}` închise (prin `G.bareBursa(randuri, Date.now())`);
  `citesteTradeuri(rad)` → perechile închise (`data/retea/trade-uri.json`, listă) sau `[]`; `rataPe(trades, ticker, pana)` → `{glob, rata, nPe}`
  (perechile închise ÎNAINTE de `pana`, rata pe ticker trasă spre medie cu k = 10); `randuriActiune(tinta, tk, b, qqq, trades, M, memo)` → rânduri
  `{ t, s: tk, i, e, y, x, tEt }`; `reperActiune(tinta, b, r, M, memo)` → p sau null; `randuriTradeuri(trades, zileDe, qqq, M)` → rânduri
  `{ t: pornit, s: ticker, y, x, tEt: inchis, r1: glob, r2: rata }`.

- [ ] **Step 1: Write the failing test**

```js
await test("(2) date-t212: rândurile pe stop1/sare1/cursa5/directie din bare zilnice sintetice; etichetele de mână (stopul mâine da/nu, săritura, cursa cu ținta și stopul în aceeași zi ⇒ stop); pRef = exact cifra din pentruActiune pe barele de până la t; găurile nu crapă; rezultat-t212 din trade-uri", async () => {
  const D = await import("../retea/date-t212.mjs"); const M = { G, P, R, A: incarcaArbori() };
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5);
  for (const t of ["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212"]) {
    const l = D.randuriActiune(t, "AAA_US_EQ", b, q, [], M, {}); assert.ok(l.length > 100, t + ": " + l.length);
    for (const r of l.slice(0, 20)) { assert.ok(r.y === 0 || r.y === 1); assert.ok(r.tEt > r.t && r.x.length === R.intrareActiune(t, R.trasaturiZilnice(b, r.i, q, 0.5), r.e).length); const p = D.reperActiune(t, b, r, M, {}); assert.ok(p === null || (p >= 0 && p <= 1)); }
    const r0 = l[0], pa = P.pentruActiune(b.slice(0, r0.i + 1), { pret: b[r0.i].c, stop: b[r0.i].c * (1 + (r0.e.relS ?? -0.05)), tinta: b[r0.i].c * (1 + (r0.e.relT ?? 0.05)), acum: b[r0.i].t + ZI });
    if (t === "stop1-t212") assert.equal(D.reperActiune(t, b, r0, M, {}), pa.stop1.p); if (t === "sare1-t212") assert.equal(D.reperActiune(t, b, r0, M, {}), pa.sare1.p); if (t === "cursa5-t212") assert.equal(D.reperActiune(t, b, r0, M, {}), pa.cursa5.tinta.p);
  }
  // etichetele de mână: bara i și ce urmează
  const z = bareZi(300, 100, 3); const i = 280; z[i] = { ...z[i], c: 100 }; z[i + 1] = { ...z[i + 1], o: 99, l: 94, h: 101, c: 100 };
  assert.equal(D.eticheta("stop1-t212", z, i, { relS: -0.05 }), 1, "stop atins mâine (deschide peste, minimul sub)"); assert.equal(D.eticheta("sare1-t212", z, i, { relS: -0.05 }), 0);
  z[i + 1] = { ...z[i + 1], o: 94, l: 93, h: 101, c: 100 }; assert.equal(D.eticheta("stop1-t212", z, i, { relS: -0.05 }), 0, "sare peste stop ⇒ nu „atins în zi”"); assert.equal(D.eticheta("sare1-t212", z, i, { relS: -0.05 }), 1);
  for (let k = 1; k <= 5; k++) z[i + k] = { ...z[i + k], o: 100, h: 100.5, l: 99.5, c: 100 }; z[i + 3] = { ...z[i + 3], h: 106, l: 94 }; assert.equal(D.eticheta("cursa5-t212", z, i, { relT: 0.05, relS: -0.05 }), 0, "ținta și stopul în aceeași zi ⇒ stop");
  z[i + 3] = { ...z[i + 3], h: 106, l: 99 }; assert.equal(D.eticheta("cursa5-t212", z, i, { relT: 0.05, relS: -0.05 }), 1); z[i + 5] = { ...z[i + 5], c: 101 }; assert.equal(D.eticheta("directie-t212", z, i, {}), 1);
  assert.equal(D.eticheta("cursa5-t212", z, z.length - 3, { relT: 0.05, relS: -0.05 }), null, "sub 5 bare după ⇒ fără etichetă");
  // găuri: scot 10 bare din mijloc - rândurile rămân, nimic nu aruncă
  const g = b.slice(0, 320).concat(b.slice(330)); assert.ok(D.randuriActiune("stop1-t212", "AAA_US_EQ", g, q, [], M, {}).length > 50);
  // trade-urile lui: rata pe acțiune trasă spre medie, eticheta = rezultat − 0,3% din cost > 0; cost 0 / rezultat lipsă ⇒ sar
  const tr = [{ ticker: "AAA_US_EQ", pornit: b[300].t + 3 * 3600000, inchis: b[305].t, cost: 500, rezultat: 10 }, { ticker: "AAA_US_EQ", pornit: b[320].t + 3 * 3600000, inchis: b[322].t, cost: 500, rezultat: -2 }, { ticker: "AAA_US_EQ", pornit: b[330].t, inchis: b[331].t, cost: 0, rezultat: 5 }, { ticker: "BBB_US_EQ", pornit: b[330].t, inchis: b[331].t, cost: 100, rezultat: null }];
  const rp = D.rataPe(tr, "AAA_US_EQ", b[330].t); assert.equal(rp.nPe, 2); assert.ok(Math.abs(rp.glob - 0.5) < 1e-9 && Math.abs(rp.rata - (1 + 10 * 0.5) / 12) < 1e-9, JSON.stringify(rp));
  const rt = D.randuriTradeuri(tr, (tk) => (tk === "AAA_US_EQ" ? b : null), q, M); assert.equal(rt.length, 2); assert.deepEqual(rt.map((r) => r.y), [1, 0]); assert.ok(rt[0].x.length === 17 && rt[0].tEt === b[305].t && rt[0].r1 === 0.5);
});
```

- [ ] **Step 2: Run** — ROȘU: modulul lipsește.
- [ ] **Step 3: Implement** `retea/date-t212.mjs`

```js
// Datele pe acțiuni (specul L2, „Datele pe acțiuni”): rândurile pe cele 5 ținte T212 din barele ZILNICE (data/retea/zile/<ticker>.json, 2 ani,
// Yahoo prin colector) și din perechile lui închise (data/retea/trade-uri.json). Trăsăturile cu Retea.trasaturiZilnice (aceeași funcție ca pe
// pagină), etichetele DOAR din barele de după ziua t (definițiile din Probabilitati.pentruActiune), reperul 🎲 = cifra lui pentruActiune pe
// barele de până la t. Folosit de amândoi antrenorii.
import fs from "node:fs";
import path from "node:path";
export const ZI = 864e5, ORIZONT_T212 = { "stop1-t212": 24, "sare1-t212": 24, "cursa5-t212": 168, "directie-t212": 168, "rezultat-t212": 24 };
export const STOPURI = [-0.02, -0.03, -0.05, -0.08, -0.1], CURSE = [[0.03, -0.03], [0.05, -0.03], [0.05, -0.05], [0.08, -0.05], [0.1, -0.05]], QQQ = "QQQ_US_EQ";
const ZILE = (rad) => path.join(rad, "data", "retea", "zile");
export function tickere(rad) { try { return fs.readdirSync(ZILE(rad)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((t) => t !== QQQ).sort(); } catch { return []; } }
export function citesteZile(rad, ticker, G) { try { const j = JSON.parse(fs.readFileSync(path.join(ZILE(rad), ticker + ".json"), "utf8")); return G.bareBursa(Array.isArray(j) ? j : (j && j.randuri) || [], Date.now()); } catch { return []; } }
export function citesteTradeuri(rad) { try { const j = JSON.parse(fs.readFileSync(path.join(rad, "data", "retea", "trade-uri.json"), "utf8")); return Array.isArray(j) ? j : (j && j.inchise) || []; } catch { return []; } }
const nr = (v) => { if (v === null || v === undefined || v === "" || typeof v === "boolean") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const bun = (t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null && nr(t.cost) > 0 && nr(t.rezultat) !== null;
// rata lui de până la `pana` (perechile închise înainte): globală și pe ticker trasă spre medie cu k = 10 (specul rețelei)
export function rataPe(trades, ticker, pana) {
  const l = (Array.isArray(trades) ? trades : []).filter((t) => bun(t) && t.inchis <= pana), n = l.length, glob = n ? l.filter((t) => t.rezultat - 0.003 * t.cost > 0).length / n : 0.5;
  const pe = l.filter((t) => t.ticker === ticker), plus = pe.filter((t) => t.rezultat - 0.003 * t.cost > 0).length;
  return { glob, rata: (plus + 10 * glob) / (pe.length + 10), nPe: pe.length };
}
// eticheta unui rând la bara i din barele de după (definițiile lui pentruActiune): null când nu sunt destule bare după
export function eticheta(tinta, b, i, e) {
  const c = b[i] && b[i].c; if (!(c > 0)) return null;
  if (tinta === "stop1-t212" || tinta === "sare1-t212") { const n1 = b[i + 1]; if (!n1) return null; const niv = c * (1 + e.relS); return tinta === "stop1-t212" ? (n1.o > niv && n1.l <= niv ? 1 : 0) : (n1.o <= niv ? 1 : 0); }
  if (tinta === "cursa5-t212") { if (i + 5 >= b.length) return null; const T = c * (1 + e.relT), S = c * (1 + e.relS); for (let k = 1; k <= 5; k++) { if (b[i + k].l <= S) return 0; if (b[i + k].h >= T) return 1; } return 0; }
  if (tinta === "directie-t212") { if (i + 5 >= b.length) return null; return b[i + 5].c > c ? 1 : 0; }
  return null;
}
// rândurile unei ținte pe un ticker: o mostră pe zi de bursă de la ziua 250, nivelul ales din grilă (același la fiecare rulare, din ticker și i)
export function randuriActiune(tinta, tk, b, qqq, trades, M, memo) {
  const out = [], R = M.R, H = ORIZONT_T212[tinta], zile = H === 168 ? 5 : 1; let sem = 7; for (const ch of tk) sem = (sem * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 250; i + zile < b.length; i++) {
    const rp = memo.rata && memo.rata[i] ? memo.rata[i] : (memo.rata = memo.rata || {}, memo.rata[i] = rataPe(trades, tk, b[i].t + ZI));
    const f = R.trasaturiZilnice(b, i, qqq, rp.rata); if (!f) continue;
    const k = (sem + i) >>> 0; let e;
    if (tinta === "stop1-t212" || tinta === "sare1-t212") e = { relS: STOPURI[k % STOPURI.length] };
    else if (tinta === "cursa5-t212") { const [relT, relS] = CURSE[k % CURSE.length]; e = { relT, relS }; }
    else if (tinta === "directie-t212") e = {};
    else return out;
    const y = eticheta(tinta, b, i, e); if (y === null) continue;
    const x = R.intrareActiune(tinta, f, e); if (!x) continue;
    out.push({ t: f.t, s: tk, i, e, y, x, tEt: b[i + zile].t + ZI });
  }
  return out;
}
// reperul 🎲 al unui rând = exact cifra paginii (pentruActiune) pe barele de până la t; direcția: frecvența urcării pe 5 zile în starea de atunci
export function reperActiune(tinta, b, r, M, memo) {
  const P = M.P, v = b.slice(0, r.i + 1), c = b[r.i].c;
  if (tinta === "directie-t212") { const st = P.stareActiuneLa(b, r.i), q = P.frecventaActiune(v, 5, (bb, k, h) => (bb[k + h].c > bb[k].c ? "da" : "nu"), "da", st, memo); return q && Number.isFinite(q.p) ? q.p : null; }
  const pa = P.pentruActiune(v, { pret: c, stop: c * (1 + r.e.relS), tinta: r.e.relT ? c * (1 + r.e.relT) : null, acum: b[r.i].t + ZI, memo });
  if (!pa) return null;
  const q = tinta === "stop1-t212" ? pa.stop1 : tinta === "sare1-t212" ? pa.sare1 : pa.cursa5 && pa.cursa5.tinta;
  return q && Number.isFinite(q.p) ? q.p : null;
}
// „un trade ca ăsta iese pe plus”: un rând pe pereche închisă, trăsăturile la ultima zi ÎNCHISĂ dinaintea cumpărării, y = rezultat − 0,3% din cost > 0
export function randuriTradeuri(trades, zileDe, qqq, M) {
  const toate = (Array.isArray(trades) ? trades : []).filter(bun).sort((a, b) => a.pornit - b.pornit), out = [];
  for (const t of toate) {
    const b = zileDe(t.ticker); if (!b) continue;
    const i = M.R.indexZi(b, t.pornit); if (i < 250) continue;
    const rp = rataPe(toate, t.ticker, t.pornit), f = M.R.trasaturiZilnice(b, i, qqq, rp.rata); if (!f) continue;
    const x = M.R.intrareActiune("rezultat-t212", f, { cost: t.cost, glob: rp.glob, nPe: rp.nPe }); if (!x) continue;
    out.push({ t: t.pornit, s: t.ticker, y: t.rezultat - 0.003 * t.cost > 0 ? 1 : 0, x, tEt: t.inchis, r1: rp.glob, r2: rp.rata });
  }
  return out;
}
```
(`memo` pentru `pentruActiune` e `o.memo` — obiectul stărilor pe index; `rataPe` memorat în `memo.rata`.)

- [ ] **Step 4: Run** — `✓ (2)`.
- [ ] **Step 5: Commit** — `git commit -m "feat(retea): date-t212 - rândurile pe acțiuni din barele zilnice și din trade-urile lui, reperul 🎲"`.

### Task 3: `Retea.pentruActiune` / `pentruCumparare`, `Arbori.pentruActiune` / `pentruCumparare`, `randuri` pe T212

**Files:**
- Modify: `public/lib/retea.js` (`intrariActiune`, `pentruActiune`, `intrareCumparare`, `pentruCumparare`; `randuri` cu `o.codDirectie` și `o.tintaRezultat`),
  `public/lib/arbori.js` (`pentruActiune`, `pentruCumparare`)
- Test: `scripts/proba-v10094.mjs`

**Interfaces:**
- Produces: `Retea.intrariActiune(bare, o, qqq, ist)` cu `o = { acum, pret, stop, tinta, ticker }` → `{ la, f, lista: [{cod, tinta, x}] }` pe codurile
  `stop1`, `sare1` (cu stop), `cursa5` (cu stop și țintă), `directie5` (mereu); barele prin `GridCalcul.bareBursa` (ziua în curs scoasă);
  `Retea.pentruActiune(modele, bare, o, qqq, ist)` → `{ la, v, p: {cod: p} }` sau null; `Retea.intrareCumparare(t, bare, qqq, ist)` cu
  `t = { ticker, pornit, cost }` → `{ x, glob, rata, n }`; `Retea.pentruCumparare(modele, t, bare, qqq, ist)` → `{ p, rata, n }` (modelul
  `rezultat-t212` antrenat ÎNAINTE de `pornit`, ca la pentruPornire); `Arbori.pentruActiune` / `pentruCumparare` cu aceleași intrări;
  `Retea.randuri(modele, rt, zar, o, arb)` acceptă `o.codDirectie` (`"directie-24"` implicit, `"directie5"` pe T212) și `o.tintaRezultat`
  (`"rezultat"` implicit, `"rezultat-t212"` pe T212, titlul din `NUME`).

- [ ] **Step 1: Write the failing test**

```js
await test("(3) Retea/Arbori.pentruActiune: aceleași intrări (un singur producător), cifre pe stop1/sare1/cursa5/directie5 cu modele T212 sintetice, bit-exact cu antrenorul; ziua în curs e scoasă; fără stop ⇒ doar directie5; pentruCumparare ca pentruPornire; randuri cu codDirectie/tintaRezultat", async () => {
  const { antreneazaArbori, exportaArbori } = await import("../retea/arbori.mjs"); const A = incarcaArbori();
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5), o = { acum: b[b.length - 1].t + 2 * ZI, pret: b[b.length - 1].c, stop: b[b.length - 1].c * 0.95, tinta: b[b.length - 1].c * 1.05, ticker: "AAA_US_EQ" };
  const it = R.intrariActiune(b, o, q, []); assert.deepEqual(it.lista.map((x) => x.cod), ["stop1", "sare1", "cursa5", "directie5"]);
  assert.deepEqual(R.intrariActiune(b.concat([{ t: b[b.length - 1].t + ZI, o: 1, h: 1, l: 1, c: 1, v: 1 }]), { ...o, acum: b[b.length - 1].t + ZI + 3600000 }, q, []).f.x, it.f.x, "bara zilei în curs a intrat în trăsături");
  assert.deepEqual(R.intrariActiune(b, { ...o, stop: null }, q, []).lista.map((x) => x.cod), ["directie5"]);
  // modele sintetice pe fiecare țintă: arborii antrenați pe rânduri aleatoare cu nIn potrivit, rețeaua = model cu un strat (prezice e cel vechi)
  const mA = {}; for (const [t, nIn] of [["stop1-t212", 17], ["sare1-t212", 17], ["cursa5-t212", 18], ["directie-t212", 14]]) { const X = Array.from({ length: 400 }, (_, i) => Array.from({ length: nIn }, (__, k) => Math.sin(i * (k + 1)))), y = X.map((x) => (x[0] + x[1] > 0 ? 1 : 0)); const m = antreneazaArbori(X, y, { runde: 20, seminte: 1 }); mA[t] = { tinta: t, versiune: "a1", la: ACUM, ...exportaArbori(m) }; }
  const ra = A.pentruActiune(mA, b, o, q, []); assert.ok(ra && ra.v === "a1" && ["stop1", "sare1", "cursa5", "directie5"].every((c) => Number.isFinite(ra.p[c])), JSON.stringify(ra));
  const { preziceArbori } = await import("../retea/arbori.mjs"); for (const x of it.lista) assert.ok(Math.abs(preziceArbori(mA[x.tinta], x.x) - ra.p[x.cod]) <= 5e-4, x.cod);
  assert.equal(A.pentruActiune({ "atinge-24": mA["stop1-t212"] }, b, o, q, []), null, "fără modele T212 ⇒ null");
  // „un trade ca ăsta”: intrarea la ultima zi închisă dinaintea cumpărării; modelul de după cumpărare nu se folosește
  const t = { ticker: "AAA_US_EQ", pornit: b[380].t + 5 * 3600000, cost: 500 }, ic = R.intrareCumparare(t, b, q, []); assert.ok(ic && ic.x.length === 17 && ic.rata === 0.5 && ic.n === 0);
  const mR = { "rezultat-t212": { tinta: "rezultat-t212", versiune: R.VERSIUNE, la: b[300].t, norm: { m: Array(17).fill(0), s: Array(17).fill(1) }, ansamblu: [[{ W: Array.from({ length: 17 }, () => [0]), b: [0.2], act: "sigmoid" }]] } };
  const pc = R.pentruCumparare(mR, t, b, q, []); assert.ok(pc && Math.abs(pc.p - 0.55) < 1e-3 && pc.rata === 0.5, JSON.stringify(pc)); assert.equal(R.pentruCumparare({ "rezultat-t212": { ...mR["rezultat-t212"], la: t.pornit + 1 } }, t, b, q, []), null);
  const mAc = { "rezultat-t212": { tinta: "rezultat-t212", versiune: "a1", la: b[300].t, ...exportaArbori(antreneazaArbori(Array.from({ length: 300 }, (_, i) => Array.from({ length: 17 }, (__, k) => Math.cos(i * (k + 1)))), Array.from({ length: 300 }, (_, i) => i % 2), { runde: 10, seminte: 1 })) } };
  const pcA = A.pentruCumparare(mAc, t, b, q, []); assert.ok(pcA && Number.isFinite(pcA.p) && pcA.rata === 0.5);
  // randuri pe T212: zar = rândurile randActiune (cu cod), direcția pe codul directie5, rezultatul pe tinta rezultat-t212
  const vB = { luni: 9, luniGata: 9, nIndep: 150, reper: "🎲", brier: 0.2, brierReper: 0.21, brierLog: 0.205, ic: [0.01, 0.04], icLog: [0.003, 0.02], bss3: 0.01, logloss: 0.6, loglossReper: 0.61, loglossLog: 0.61 };
  const MOD = (ver) => Object.fromEntries(["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212", "rezultat-t212"].map((tt) => [tt, { tinta: tt, versiune: ver, la: ACUM - 3600000, verificare: vB }]));
  const rt = { la: ACUM, v: R.VERSIUNE, p: { stop1: 0.12, cursa5: 0.4, sare1: 0.03, directie5: 0.52 }, pornire: { p: 0.57, rata: 0.5 } }, rA = { la: ACUM, v: "a1", p: { stop1: 0.15, cursa5: 0.38, sare1: 0.02, directie5: 0.5 }, pornire: { p: 0.6, rata: 0.5 } };
  const zar = [{ cod: "stop1", titlu: "Atinge stopul mâine", p: 0.1 }, { cod: "cursa5", titlu: "În 5 zile de bursă: ținta înaintea stopului", p: 0.42 }, { cod: "sare1", titlu: "Deschiderea sare peste stop", p: 0.02 }];
  const l = R.randuri(MOD(R.VERSIUNE), rt, zar, { acum: ACUM, codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: rt.pornire }, { modele: MOD("a1"), rt: rA });
  assert.deepEqual(l.map((x) => x.cod), ["stop1", "cursa5", "sare1", "directie5", "rezultat-t212"]); assert.equal(l[3].titlu, R.NUME["directie-t212"]); assert.equal(l[4].titlu, R.NUME["rezultat-t212"]);
  assert.equal(l[0].text, "🧠 12% · 🌳 15% · 🎲 10%\n🧠 dovedită pe 150 de zile independente · 🌳 dovedită pe 150 de zile independente"); assert.equal(l[3].text.split("\n")[0], "🧠 52% · 🌳 50%"); assert.equal(l[4].text.split("\n")[0], "🧠 57% · 🌳 60% · rata ta: 50%");
  assert.equal(R.randuri(MOD(R.VERSIUNE), { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.5 } }, [{ cod: "iese-jos-24", titlu: "x", p: 0.5 }], { acum: ACUM }).length, 0, "modelele T212 nu răspund pe codurile crypto");
});
```

- [ ] **Step 2: Run** — ROȘU (`R.intrariActiune is not a function`).
- [ ] **Step 3: Implement**

`retea.js` (după `intrareActiune`):
```js
  // intrările pe o acțiune (poziție / poartă): o = { acum, pret, stop, tinta, ticker }; barele zilnice ale paginii (ziua în curs scoasă prin GridCalcul.bareBursa);
  // ist = perechile lui închise (rata pe ticker). -> { la, f, lista: [{cod, tinta, x}] }: stop1 + sare1 (cu stop), cursa5 (cu stop și țintă), directie5 (mereu)
  function intrariActiune(bare, o, qqq, ist) {
    o = o || {}; var acum = nr(o.acum) || Date.now(), b = GridCalcul.bareBursa(Array.isArray(bare) ? bare : [], acum), i = indexZi(b, acum), pr = nr(o.pret);
    if (i < 0 || !(pr > 0)) return null;
    var rp = rataPe(ist, o.ticker, acum), f = trasaturiZilnice(b, i, GridCalcul.bareBursa(Array.isArray(qqq) ? qqq : [], acum), rp.rata); if (!f) return null;
    var rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / pr - 1 : null; }, relS = rel(o.stop), relT = rel(o.tinta), lista = [];
    var pune = function (cod, tinta, e) { var x = intrareActiune(tinta, f, e); if (x) lista.push({ cod: cod, tinta: tinta, x: x }); };
    if (relS !== null && relS < 0) { pune("stop1", "stop1-t212", { relS: relS }); pune("sare1", "sare1-t212", { relS: relS }); if (relT !== null && relT > 0) pune("cursa5", "cursa5-t212", { relT: relT, relS: relS }); }
    pune("directie5", "directie-t212", {});
    return { la: acum, f: f, lista: lista };
  }
  function pentruActiune(modele, bare, o, qqq, ist) {
    if (!modele || typeof modele !== "object") return null;
    var it = intrariActiune(bare, o, qqq, ist); if (!it) return null;
    var p = {}, k = 0; it.lista.forEach(function (q) { var m = modele[q.tinta]; if (!m || m.versiune !== VERSIUNE) return; var v = prezice(m, q.x); if (v !== null) { p[q.cod] = Math.round(v * 1000) / 1000; k++; } });
    return k ? { la: it.la, v: VERSIUNE, p: p } : null;
  }
  // rata lui pe o acțiune (perechile închise înainte de `pana`, trasă spre medie cu k = 10) - aceeași regulă ca date-t212.rataPe
  function rataPe(ist, ticker, pana) {
    var l = (Array.isArray(ist) ? ist : []).filter(function (t) { return t && nr(t.inchis) !== null && t.inchis <= pana && nr(t.cost) > 0 && nr(t.rezultat) !== null; }), plusDe = function (t) { return t.rezultat - 0.003 * t.cost > 0; };
    var n = l.length, glob = n ? l.filter(plusDe).length / n : 0.5, pe = l.filter(function (t) { return t.ticker === ticker; }), plus = pe.filter(plusDe).length;
    return { glob: glob, rata: (plus + 10 * glob) / (pe.length + 10), nPe: pe.length };
  }
  // „un trade ca ăsta iese pe plus”: t = { ticker, pornit, cost } la ultima zi ÎNCHISĂ dinaintea cumpărării -> { x, glob, rata, n }
  function intrareCumparare(t, bare, qqq, ist) {
    var por = nr(t && t.pornit), cost = nr(t && t.cost); if (por === null || !(cost > 0)) return null;
    var b = GridCalcul.bareBursa(Array.isArray(bare) ? bare : [], por), i = indexZi(b, por); if (i < 0) return null;
    var rp = rataPe(ist, t.ticker, por), f = trasaturiZilnice(b, i, GridCalcul.bareBursa(Array.isArray(qqq) ? qqq : [], por), rp.rata); if (!f) return null;
    var x = intrareActiune("rezultat-t212", f, { cost: cost, glob: rp.glob, nPe: rp.nPe }); return x ? { x: x, glob: rp.glob, rata: rp.rata, n: rp.nPe } : null;
  }
  function pentruCumparare(modele, t, bare, qqq, ist) {
    var m = modele && modele["rezultat-t212"]; if (!m || m.versiune !== VERSIUNE) return null;
    var por = nr(t && t.pornit); if (por === null || (nr(m.la) !== null && m.la > por)) return null;
    var f = intrareCumparare(t, bare, qqq, ist); if (!f) return null;
    var q = prezice(m, f.x); return q === null ? null : { p: Math.round(q * 1000) / 1000, rata: Math.round(f.rata * 1000) / 1000, n: f.n };
  }
```
`randuri`: `rand("directie-24", NUME.directie, nr(p["directie-24"]), vR("directie"), nr(pa["directie-24"]), vA("directie"), "", true)` devine
`var cD = o.codDirectie || "directie-24", tD = TINTA_DE[cD]; rand(cD, NUME[tD], nr(p[cD]), vR(tD), nr(pa[cD]), vA(tD), "", true);` iar rezultatul:
`var tR = o.tintaRezultat || "rezultat"; … rand(tR, tR === "rezultat" ? "La pornire, un bot ca ăsta ieșea pe plus" : NUME[tR], pz ? pz.p : null, vR(tR), pzA ? pzA.p : null, vA(tR), "rata ta: " + PC(rata), false);`
(`TINTA_DE["directie-24"] = "directie"` există.) Exporturi: `intrariActiune, pentruActiune, intrareCumparare, pentruCumparare, rataPe`.
`arbori.js`: `function pentruActiune(modele, bare, o, qqq, ist) { if (!modele || typeof modele !== "object") return null; var it = Retea.intrariActiune(bare, o, qqq, ist); if (!it) return null; var p = {}, k = 0; it.lista.forEach(function (q) { var m = modele[q.tinta]; if (!m || m.versiune !== VERSIUNE) return; var v = prezice(m, q.x); if (v !== null) { p[q.cod] = Math.round(v * 1000) / 1000; k++; } }); return k ? { la: it.la, v: VERSIUNE, p: p } : null; }` și
`function pentruCumparare(modele, t, bare, qqq, ist) { var m = modele && modele["rezultat-t212"]; if (!m || m.versiune !== VERSIUNE) return null; var por = Retea.nr ? null : null; … }` — ca `pentruPornire` din arbori.js, cu `Retea.intrareCumparare`. Exporturi.

- [ ] **Step 4: Run** — `✓ (3)`; probele v10093 (10), (R1)–(R4) verzi; garda PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(retea): pentruActiune/pentruCumparare pe rețea și arbori (un singur producător de intrări), randuri pe codurile T212"`.

### Task 4: antrenorii pe țintele T212

**Files:**
- Modify: `retea/antreneaza.mjs`, `retea/antreneaza-arbori.mjs` (`randuri(t)` pe `-t212`, `OPT_LUNI`, `NUME_REPER`, `AMPRENTA` cu tickerele, `COD_HASH` cu `date-t212.mjs`, `reperRand` → `reperActiune`, `r2` pe `directie-t212` = 0,5)
- Test: `scripts/proba-v10094.mjs`

**Interfaces:**
- Consumes: Task 2 (`tickere`, `citesteZile`, `citesteTradeuri`, `randuriActiune`, `reperActiune`, `randuriTradeuri`, `ORIZONT_T212`, `QQQ`).
- Produces: `modele-arbori.json` / `modele.json` cu cheile `stop1-t212` … `rezultat-t212` când există `data/retea/zile/`; fără dosar ⇒ țintele T212
  dau „prea puține rânduri”, nimic altceva nu se schimbă.

- [ ] **Step 1: Write the failing test**

```js
await test("(4) antrenorul arborilor pe un dosar sintetic cu bare ZILNICE (3 tickere + QQQ, 600 de zile) și 40 de trade-uri: modele-arbori.json are stop1-t212 (verificare completă, reper 🎲) și rezultat-t212; fără dosarul zile/ țintele T212 lipsesc și cele crypto nu se schimbă; antrenorul rețelei pornește pe stop1-t212", async () => {
  const dir = path.join(os.tmpdir(), "t212-proba-" + Date.now()), DR = path.join(dir, "data", "retea"); fs.mkdirSync(path.join(DR, "zile"), { recursive: true }); fs.mkdirSync(path.join(DR, "ore"), { recursive: true });
  const yahoo = (b) => ({ la: Date.now(), randuri: b.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v })) });
  for (const [tk, sem] of [["AAA_US_EQ", 11], ["BBB_US_EQ", 12], ["CCC_US_EQ", 13], ["QQQ_US_EQ", 5]]) fs.writeFileSync(path.join(DR, "zile", tk + ".json"), JSON.stringify(yahoo(bareZi(600, 100, sem))));
  const b = bareZi(600, 100, 11); fs.writeFileSync(path.join(DR, "trade-uri.json"), JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ ticker: "AAA_US_EQ", pornit: b[260 + i * 8].t + 3 * 3600000, inchis: b[262 + i * 8].t, cost: 500, rezultat: i % 3 ? 7 : -4 }))));
  const run = (f, extra) => execFileSync(process.execPath, [path.join(RAD, "retea", f), "--rad", dir, "--buget-min", "4", "--seminte", "1", "--max-randuri", "3000", ...extra], { encoding: "utf8", timeout: 600000 });
  const o1 = run("antreneaza-arbori.mjs", ["--tinta", "stop1-t212"]), m = JSON.parse(fs.readFileSync(path.join(DR, "modele-arbori.json"), "utf8")); assert.ok(m.modele["stop1-t212"] && m.modele["stop1-t212"].verificare && m.modele["stop1-t212"].verificare.reper === "🎲", o1);
  const o2 = run("antreneaza-arbori.mjs", ["--tinta", "rezultat-t212"]), m2 = JSON.parse(fs.readFileSync(path.join(DR, "modele-arbori.json"), "utf8")); assert.ok(m2.modele["rezultat-t212"] && m2.modele["rezultat-t212"].nIn === 17, o2);
  const o3 = run("antreneaza.mjs", ["--tinta", "stop1-t212"]); assert.match(o3, /stop1-t212: modelul de azi pe \d+ rânduri/);
  fs.rmSync(path.join(DR, "zile"), { recursive: true, force: true }); const o4 = run("antreneaza-arbori.mjs", ["--tinta", "cursa5-t212"]); assert.match(o4, /cursa5-t212: prea puține rânduri/);
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run** — ROȘU (`stop1-t212: prea puține rânduri (0)`).
- [ ] **Step 3: Implement** (în amândoi antrenorii, identic)

```js
import { tickere, citesteZile, citesteTradeuri, randuriActiune, reperActiune, randuriTradeuri, ORIZONT_T212, QQQ } from "./date-t212.mjs";
// … după bareDe/btc:
const qqq = citesteZile(RAD, QQQ, M.G), zileDe = new Map(), memoZi = new Map(), tradeuri = citesteTradeuri(RAD);
for (const tk of tickere(RAD)) { const b = citesteZile(RAD, tk, M.G); if (b.length > 300) { zileDe.set(tk, b); memoZi.set(tk, {}); } }
// AMPRENTA: + [...zileDe.entries()].map(([s, b]) => s + ":" + luna(b[0].t)) în aceeași listă sortată (+ "|QQQ:" + luna)
const E_T212 = (t) => t.endsWith("-t212");
function randuri(t) {
  if (t === "rezultat") return randuriBoti(...);
  if (t === "rezultat-t212") return randuriTradeuri(tradeuri, (tk) => zileDe.get(tk) || null, qqq, M);
  if (E_T212(t)) { const out = []; for (const [tk, b] of zileDe) for (const r of randuriActiune(t, tk, b, qqq, tradeuri, M, memoZi.get(tk))) out.push(r); return out.sort((a, b) => a.t - b.t); }
  …
}
const OPT_LUNI = (t) => optiuniLuni(t.startsWith("rezultat") ? "rezultat" : t, ORIZONT[t] || ORIZONT_T212[t], acum);
const NUME_REPER = (t) => (t.startsWith("rezultat") ? ["rata ta", t === "rezultat" ? "rata pe monedă" : "rata pe acțiune"] : t.startsWith("directie") ? ["🎲", "50%"] : ["🎲"]);
// la judecata lunii: if (rows && !t.startsWith("rezultat")) for (const r of rows) { r.r1 = E_T212(t) ? reperActiune(t, zileDe.get(r.s), r, M, memoZi.get(r.s)) : reperRand(...); r.r2 = t.startsWith("directie") ? 0.5 : null; }
```
`COD_HASH` primește `retea/date-t212.mjs`. `verifica.mjs` nu se atinge (`optiuniLuni` primește „rezultat” pentru amândouă).

- [ ] **Step 4: Run** — `✓ (4)`; proba-v10093 (7) verde; proba-v10080-antrenor verde.
- [ ] **Step 5: Commit** — `git commit -m "feat(retea): amândoi antrenorii pe țintele T212 (zile/, trade-uri.json), reperul 🎲 pe acțiuni"`.

### Task 5: colectorul v101.64 — barele zilnice și trade-urile strânse noaptea, bugetul (ideea 2), cifrele pe idei

**Files:**
- Modify: `scripts/lib/tura-retea.mjs` (înainte de antrenori: `d.tickereZile()`, `d.cereZile(tk)`, `d.scrieZile(tk, randuri)`, `d.tradeuri()`, `d.scrieTradeuri(l)`,
  cu buget `ZILE_PE_NOAPTE = 40` tickere), `scripts/colector.mjs` (deps-urile: tickerele = pozițiile deschise + ideile de azi (actiuni, restul, reveniri) +
  `t212:lista` + tickerele perechilor închise din ultimii 2 ani + QQQ; `cereZile` = `cere("/api/t212?action=preturi&interval=1d&ticker=…")`; `tradeuri` =
  `T212.perechi((await cere("/api/t212?action=istoric")).umpleri).inchise`; `VERSIUNE_COLECTOR = "v101.64"`; `pornesteAntrenorul` cu `--buget-min 45` și
  oprit la 50 de minute (ideea 2); ideile: la `turaSugestii`/ideile zilei, pentru fiecare idee cu bare: `retea: Retea.pentruCumparare(modele, {ticker,
  pornit: acum, cost: 100}, bare, qqq, inchise)` și `arbori: Arbori.pentruCumparare(...)` → `{p}` + verdictul `dovedita`), `functions/api/t212.js`
  (`curata`: `retea: x.retea ? { p: nr(x.retea.p), dovedita: x.retea.dovedita === true } : null`, la fel `arbori`)
- Test: `scripts/proba-v10094.mjs`

- [ ] **Step 1: Write the failing test**

```js
await test("(5) tura-retea strânge noaptea barele zilnice (buget 40 de tickere, QQQ întâi) și trade-urile înainte de antrenori; un ticker picat nu oprește restul; colectorul v101.64 cu bugetul rețelei 45/50 min; ruta idei păstrează retea/arbori {p, dovedita}", async () => {
  const TR = await import("./lib/tura-retea.mjs"); const scrise = {}, jur = [];
  const d = { acum: Date.UTC(2026, 9, 5, 0, 30), stare: {}, forta: true, eNoapte: () => true, ziRo: () => "2026-10-05", simboluri: [], cereKlines: async () => null, pauza: async () => {}, citesteOre: () => [], scrieOre: () => {}, boti: async () => [], scrieBoti: () => {},
    porneste: async () => ({ cod: 1, minute: 0 }), citesteModele: () => null, trimite: async () => true, jurnal: (...a) => jur.push(a.join(" ")), scrieStare: () => {},
    tickereZile: async () => ["QQQ_US_EQ", "AAA_US_EQ", "BBB_US_EQ"], cereZile: async (tk) => { if (tk === "BBB_US_EQ") throw new Error("Yahoo a limitat"); return { randuri: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }] }; }, scrieZile: (tk, r) => { scrise[tk] = r; }, tradeuri: async () => [{ ticker: "AAA_US_EQ" }], scrieTradeuri: (l) => { scrise.trade = l; } };
  await TR.turaRetea(d); assert.deepEqual(Object.keys(scrise).sort(), ["AAA_US_EQ", "QQQ_US_EQ", "trade"]); assert.ok(jur.some((l) => /zile: 2 din 3 tickere/.test(l)) && jur.some((l) => /BBB_US_EQ.*Yahoo a limitat/.test(l)), jur.join("\n"));
  const col = citeste("scripts", "colector.mjs"); assert.ok(/VERSIUNE_COLECTOR = "v101\.64"/.test(col) && col.includes('"--buget-min", "45"') && col.includes("oprit după 50 de minute") && col.includes("tickereZile:") && col.includes("cereZile:") && col.includes("scrieTradeuri:"), "colectorul");
  const ruta = citeste("functions", "api", "t212.js"); assert.ok(ruta.includes("retea: x && x.retea") && ruta.includes("arbori: x && x.arbori"), "ruta idei");
  assert.ok(col.includes("Retea.pentruCumparare(") && col.includes("Arbori.pentruCumparare("), "ideile fără cifre");
});
```

- [ ] **Step 2: Run** — ROȘU (`scrise` gol).
- [ ] **Step 3: Implement** — în `turaRetea`, după boții închiși și înainte de `d.porneste()`:
```js
    // v101.64 (L2): barele zilnice ale acțiunilor (2 ani, o cerere pe ticker, cel mult ZILE_PE_NOAPTE pe noapte, QQQ întâi) + perechile închise
    if (d.tickereZile) {
      try {
        const tk = await d.tickereZile(), lista = ["QQQ_US_EQ"].concat(tk.filter((x) => x !== "QQQ_US_EQ")).slice(0, ZILE_PE_NOAPTE); let ok = 0;
        for (const t of lista) { try { const r = await d.cereZile(t); if (r && Array.isArray(r.randuri) && r.randuri.length) { d.scrieZile(t, r.randuri); ok++; } await d.pauza(1500); } catch (e) { d.jurnal("zile: " + t, e.message); } }
        d.jurnal("zile: " + ok + " din " + cate(lista.length, "ticker", "tickere") + " cu bare zilnice");
        const tr = await d.tradeuri(); d.scrieTradeuri(tr); d.jurnal("zile: " + cate(tr.length, "pereche închisă", "perechi închise") + " pentru rezultatul tău pe acțiuni");
      } catch (e) { d.jurnal("zile", e.message); }
    }
```
(în test `pauza` e goală). Colectorul: deps + `scrieZile` în `data/retea/zile/<tk>.json` (`scrieAtomic`) + `tradeuri` + bugetul 45/50 + ideile.

- [ ] **Step 4: Run** — `✓ (5)`; proba-v10093 (9) verde; `node --check` pe colector/tura-retea/t212.js.
- [ ] **Step 5: Commit** — `git commit -m "feat(colector): barele zilnice și trade-urile strânse noaptea, bugetul rețelei 45 min, cifrele 🧠/🌳 pe idei (v101.64)"`.

### Task 6: pagina T212 — sub-blocul pe poziții și la poartă, cifrele pe idei, legenda (ideea 3)

**Files:**
- Modify: `public/lib/t212-ecran.js` (`t212ReteaHtml(p, b, prob)`: `rt = Retea.pentruActiune(reteaM.m, b, o, t212.bare.QQQ_US_EQ, inchise)`,
  `ra = Arbori.pentruActiune(reteaM.a, …)`, `reteaHtml(rt, prob, { acum, codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: pentruCumparare pe
  poartă }, ra)`; chemat în randarea poziției după blocul 🎲 și în `t212ProfilPoarta`; ideile: „🧠 41% · 🌳 39%” cu „dovedită”/„nedovedită” lângă 🎲), `public/app.js`
  (`reteaAdu` pornit și de pagina T212), `public/lib/retea.js` (`antet.sub` + „ · semnul plin = cifra mare, inelul = cealaltă familie” când sunt arbori — ideea 3)
- Test: `scripts/proba-v10094.mjs`

- [ ] **Step 1: Write the failing test**

```js
await test("(6) pagina T212: pozițiile și poarta primesc sub-blocul „A doua părere” din reteaHtml cu codDirectie directie5 și tintaRezultat rezultat-t212; ideile arată 🧠/🌳 cu starea; legenda benzii în capul sub-blocului (ideea 3) ≤ 160", () => {
  const e = citeste("public", "lib", "t212-ecran.js"), a = citeste("public", "app.js");
  assert.ok(/^function t212ReteaHtml\(/m.test(e) && e.includes("Retea.pentruActiune(reteaM.m,") && e.includes("Arbori.pentruActiune(reteaM.a,") && e.includes('codDirectie:"directie5",tintaRezultat:"rezultat-t212"'), "t212ReteaHtml");
  assert.ok((e.match(/t212ReteaHtml\(/g) || []).length >= 3, "nechemat pe poziție și la poartă"); assert.ok(e.includes("x.retea&&x.retea.p") || e.includes("x.retea.p"), "ideile fără 🧠");
  assert.ok(a.includes("reteaAdu(") && /t212[A-Za-z]*\([^)]*\)\{[^\n]*reteaAdu\(/.test(a) || e.includes("reteaAdu("), "T212 nu aduce modelele");
  const an = R.antet({ directie: { tinta: "directie", versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: null } }, ACUM, { directie: { tinta: "directie", versiune: "a1", la: ACUM - 3600000, verificare: null } });
  assert.ok(/semnul plin = cifra mare, inelul = cealaltă familie/.test(an.sub) && an.sub.length <= 160, an.sub); assert.ok(!/inelul/.test(R.antet({}, ACUM).sub), "legenda fără arbori");
});
```

- [ ] **Step 2: Run** — ROȘU.
- [ ] **Step 3: Implement** — `t212-ecran.js`:
```js
// v100.94 (L2): a doua părere (🧠 rețeaua) și a treia (🌳 arborii) pe acțiune, din modelele din KV (reteaM) și barele zilnice ale paginii; nimic fără modele T212
function t212ReteaHtml(o, b, prob, cump) {
  if (typeof Retea === "undefined" || typeof reteaHtml !== "function" || !b || b.length < 251) return "";
  try {
    var j = t212Jurnal(), inchise = j ? j.p.inchise : [], q = t212.bare && t212.bare.QQQ_US_EQ ? t212.bare.QQQ_US_EQ : null;
    var rt = reteaM.m ? Retea.pentruActiune(reteaM.m, b, o, q, inchise) : null, ra = null; try { ra = reteaM.a ? Arbori.pentruActiune(reteaM.a, b, o, q, inchise) : null; } catch (e) { ra = null; }
    if (rt && cump) { var pz = Retea.pentruCumparare(reteaM.m, cump, b, q, inchise); if (pz) rt.pornire = pz; } if (ra && cump) { try { var pa = Arbori.pentruCumparare(reteaM.a, cump, b, q, inchise); if (pa) ra.pornire = pa; } catch (e) {} }
    return reteaHtml(rt, prob, { acum: Date.now(), codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: rt && rt.pornire }, ra);
  } catch (e) { return ""; }
}
```
Poziția: după blocul 🎲 (`t212ProbListaHtml(p.prob)`) `+ t212ReteaHtml({ acum: Date.now(), pret: p.pret, stop: n.stopPozitie, tinta: tinta, ticker: p.ticker }, t212.bare[p.ticker], p.prob)`;
poarta (`t212ProfilPoarta`): `+ t212ReteaHtml({ …baza4, stop: sp.stop, tinta: p.niv.tinta, ticker: p.ticker }, t212.poarta.bare, p.prob, { ticker: p.ticker, pornit: Date.now(), cost: 100 })`
(`t212.poarta.bare` = `bare` din `t212Poarta`, păstrat); ideile: lângă `pePlusProba`: `(x.retea&&x.retea.p!=null?' · 🧠 '+P(x.retea.p)+(x.retea.dovedita?'':' (nedovedită)'):'')+(x.arbori&&x.arbori.p!=null?' · 🌳 '+…)`.
`reteaAdu(function(){…})` chemat din randarea T212 (`t212Render`), ca pe Tablou. `retea.js` `antet`: cu `cuA`, `implicit` devine
`"Nu schimbă semaforul, verdictul sau alertele; o cifră contează doar când e „dovedită” · semnul plin = cifra mare, inelul = cealaltă familie."`.

- [ ] **Step 4: Run** — `✓ (6)`; garda PASS (capul nou); probele v10093 verzi.
- [ ] **Step 5: Commit** — `git commit -m "feat(t212): „A doua părere” pe poziții, poartă și idei; legenda benzii"`.

### Task 7: garda, versiunile v100.94, proba (E), revizia, pozele, push, colectorul, noaptea forțată

- [ ] **Step 1: test (7) garda** — în `garda-retea.mjs` situațiile T212: `R.randuri(modele T212 (cele 5 ținte, toate stările), rt T212, zar `randActiune` cu
  cod, { codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire }, { modele, rt })` → `puneRand("acțiuni: " + sit + " · " + r.cod, r)`; test:
  `situatii().filter((x) => /^arbori\.randuri/.test(x.sursa) && /acțiuni:/.test(x.sit)).length >= 40` și 0 abateri; **test (E)**: v100.94 peste tot, `test:v10094`
  în lanț, colectorul v101.64.
- [ ] **Step 2: Run** — ROȘU; implement (`versiuni-94.mjs` ca `versiuni-93.mjs`, badge „v100.94 · A DOUA PĂRERE PE ACȚIUNI”); `package.json` lanțul `… && npm run test:v10094`.
- [ ] **Step 3:** `npm test` → `exit=0` → commit; revizia Opus (promptul ca `revizie-93-prompt.md`, baza `9751c35`, Review Focus de mai sus, rulings din registru);
  UN pas de reparații prin test; `npm test` → `exit=0` → commit → `git push`.
- [ ] **Step 4:** colectorul repornit (v101.64), steagul `data/retea/porneste-acum` ⇒ tura de noapte forțată ziua (barele zilnice + amândoi antrenorii, ~1 h+);
  după „arbori: antrenorul a ieșit” colectorul repornit încă o dată NU e nevoie (același cod); urcarea modelelor o face tura; pozele 1920/390 pe T212
  (poziții cu sub-bloc, poarta pe HYPE? — nu, pe o acțiune cu bare: pozițiile lui / poarta pe ASTS), `poza-94.mjs` (copia lui `poza-93.mjs`); memoria; raportul final.

## Registru
- Pre-flight: interfețele 1→2→3→4 (`trasaturiZilnice`/`intrareActiune` consumate de `date-t212` și de `intrariActiune`; `randuriActiune` rândurile
  `{t,s,i,e,y,x,tEt}` ca la `randuriMoneda` ⇒ `verifica.mjs` nu se atinge; `reperActiune` prin `pentruActiune` = aceeași cifră ca pagina), 3→6
  (`randuri` cu `codDirectie`/`tintaRezultat`), 5→6 (ideile cu `retea`/`arbori` prin rută) consistente. Ruling (plan): ideea 4 (tabela pe Busola) NU
  se construiește — Busola notează și judecă deja predicțiile (`jurnal-retea.json`, `din-radar-bilant.json`, rândurile de dimineață pe Discord), iar
  specul ei cere „nimic în public”; afișarea bilanțului pe Radar e propusă la Idei (cost dacă greșesc: nimic — datele sunt pe disc, oricând).
  Ruling (plan): pe idei cifrele vin de la colector (pagina n-are barele ideilor), nu „calculate în browser” ca în spec (cost: ideile au cifra turei, nu a
  minutului — ideile se refac oricum o dată pe zi). Ruling (plan, ideea 2): bugetul rețelei 30 → 45 min (oprit la 50), arborii rămân 30/35; fereastra
  02–05 ține (cost: dacă rețeaua tot nu încape, mai rămâne o noapte în plus — nu mai rău ca azi).
- Task 1 (trăsăturile zilnice + țintele T212): testele (1) ×2 văzute ROȘII (`trasaturiZilnice` lipsă, rândurile fără `cod`), apoi 2/2; Ruling: numele T212 din `NUME` scurte („Sare peste stop”, „Ținta înaintea stopului în 5 zile”, „Prețul mai sus peste 5 zile”, „Un trade ca ăsta pe plus”) — cu numele din plan rândul 🌳 din „Cum s-a verificat” depășea 160 (164–167) (cost: titlurile rândurilor 🎲 rămân cele vechi, doar subsolul și titlul direcției/rezultatului poartă numele scurt); Ruling: proba-v10080-ecran (8) numără rândurile subsolului din `Retea.TINTE`, nu 7 literal (cost: nimic). Garda 826/0, v10093 17/17, v10080-ecran 10/10; suita în fundal (`suita-L2-1.txt`).
- Task 2 (date-t212): testul (2) văzut ROȘU (modulul lipsea), apoi 3/3 — etichetele de mână, trăsăturile identice cu și fără barele de după, pRef = exact `pentruActiune` pe barele de până la t, găurile nu crapă, trade-urile (cost 0 / rezultat lipsă sar). Fișierele colectorului se citesc în forma rutei (`{la, randuri}` cu rânduri Yahoo) prin `GridCalcul.bareBursa` — `GridCalcul.citeste` NU acceptă bare deja normalizate.
- Task 3 (pentruActiune/pentruCumparare pe rețea și arbori, randuri pe T212): testul (3) văzut ROȘU (`intrariActiune` lipsă), apoi 4/4 (prima rulare a picat din testul meu — `antreneazaArbori(X, y, nIn, o)` ia matricea PLATĂ și dă un singur rând de semințe; corectat în test, codul neatins). Ruling: `intrariActiune` nu cheamă `GridCalcul.bareBursa` (în colector și în antrenori `GridCalcul` nu e global pentru `retea.js`) — ia ultima bară ÎNCHISĂ cu `indexZi(b, acum)` (bara zilei D e închisă abia la D+1 13:30 UTC, `t + ZI`): consecvent cu antrenorul (decizia la `t + ZI`); pe pagină barele vin deja fără cea în formare (`GridCalcul.bare`) (cost: seara, după închidere, cifra folosește ziua de ieri până a doua zi la 13:30 UTC — exact cum a învățat modelul). Garda PASS, v10093 17/17, v10080-ecran 10/10. Ruling: suita + commit-ul pe loturi de sarcini (3+4), nu per sarcină — o suită ține 5 minute (cost: un commit mai gras).
- Task 4 (antrenorii pe T212): testul (4) văzut ROȘU („stop1-t212: prea puține rânduri (0)”), apoi 5/5 — modele-arbori.json cu `stop1-t212` (verificare, reper 🎲) și `rezultat-t212` (nIn 17), antrenorul rețelei pornește pe `stop1-t212`, fără `zile/` țintele T212 dau „prea puține rânduri”. Ruling: proba cu 250 de perechi, nu 40 — modelul de azi cere ≥ 200 de rânduri (cost: nimic); Ruling: amprenta datelor cuprinde și tickerele zilnice (`zi:<ticker>:<luna>`) ⇒ cheia lunilor se schimbă o dată și pe crypto (se rejudecă oricum, hash-ul codului s-a schimbat).
