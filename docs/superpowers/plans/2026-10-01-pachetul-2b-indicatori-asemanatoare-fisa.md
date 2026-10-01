# Pachetul 2b — Starea rafinată, indicatorii cu dovadă (I-471), situațiile asemănătoare (I-469), probabilitățile în fișa Grid — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) „situații ca acum” înseamnă regimul ȘI direcția (6 stări, cu cădere în trepte), nu doar „liniște” care acoperea ~78% din trecut; (2) fiecare indicator care e aprins acum (RSI, Bollinger, EMA20/50, ADX pe 4 h) vine cu dovada din trecutul monedei: cu el aprins, marginea pe partea de pierdere a fost atinsă mai des / mai rar / la fel ca de obicei — cu corecție pentru comparații multiple; (3) „În N situații ca asta, boții tăi: median …, X% pe plus, cel mai rău …” pe Tablou și în poartă; (4) aceleași probabilități din 2a și în fișa Grid (gridul propus, înainte să existe botul).

**Architecture:** `Probabilitati.stareLa` dă 6 stări (`liniste|miscare` × `sus|jos|lateral`) și `frecventa` cade în trepte: starea exactă → același regim → toate · modul nou `public/lib/dovada.js` (indicatorii pe barele de 4 h agregate din 1 h, ADX nou; RSI/EMA/Bollinger din `GraficBot`; Wilson cu z Bonferroni) — socotit de colector în tura orară, pus în `rez.indicatori` · modul nou `public/lib/asemanatoare.js` (cazurile din arhivă cu starea de la pornire; vecinii) — cazurile le face colectorul o dată pe noapte → KV `cazuri`; vecinii se aleg în pagină · colectorul pune noaptea barele de 1 h și în KV `ore:<SIMBOL>` → fișa Grid le îmbină cu ultimele 15M și rulează `Probabilitati.pentruBot` pe gridul propus.

**Tech Stack:** JS ES5 în `public/lib` (în colector prin `new Function`), Node ESM, Cloudflare Pages Functions + KV local `ISTORIC`.

**Spec:** `docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md` — „Pachetul 2” (I-471, I-469, „în fișa Grid și în poarta de pornire”) + „asemănător = același regim și aceeași direcție … (trei stări)”.

## Măsurat înainte (date reale, 6 luni de 1 h, porniri la 4 h)

| moneda | liniște-lateral | liniște-sus | liniște-jos | mișcare-sus | mișcare-jos | mișcare-lateral |
|---|---|---|---|---|---|---|
| CRV | 42% | 16% | 20% | 12% | 7% | 3% |
| HBAR | 40% | 14% | 25% | 13% | 6% | 2% |
| LIT | 42% | 19% | 20% | 13% | 3% | 3% |

Direcția: `r24h ≥ 0,5` (mișcarea pe 24 h față de obișnuitul monedei) ⇒ `sus`/`jos` după semn, altfel `lateral`. „Mișcare-lateral” (~3%) e rară ⇒ cade pe „același regim”.

## Global Constraints

- Tot ce e în 2a rămâne: doar barele încheiate; porniri la 4 h; independente = `floor(n×4/H)`; sub 3 independente rândul nu apare; sub 10 „un semn, nu o regulă”; lichidarea nu coboară sub cifra brută.
- **Comparații multiple (backtest-expert §7 „Data Mining Bias”):** la indicatori, intervalul se socotește cu z Bonferroni pentru `m` = câte comparații se arată acum (α = 0,05/m). Un indicator e „cu semn” doar dacă intervalul lui nu-l cuprinde pe „de obicei”. Fără semn ⇒ pliat sub „fără semn”, nu ascuns.
- Indicatorii pe 4 h se socotesc doar din barele de 4 h ÎNCHEIATE la pornirea cazului.
- Situațiile asemănătoare: doar ce se știa la pornirea botului vechi (direcție, levier, lățime, pas, ora, starea pieței din barele de dinainte). Sub 10 vecini: „prea puține”. Rezultatul în % din investiție (sumele diferă), convertit în USDT pe suma botului de acum.
- Fișa Grid: fără bare de 1 h în KV (monedă fără profil / pagina publicată) ⇒ blocul nu apare.
- Versiuni: `v100.47` (BUILD_INFO version + badge „v100.47 · DOVEZILE”, package.json `100.47.0`, index.html meta/sideVersiune/antetVersiune/healthAppVersion, `sw.js` CACHE `crypto-radar-v100-47` + `/lib/dovada.js`, `/lib/asemanatoare.js` în APP_SHELL, `functions/_shared/versiune.js`), colectorul `v101.28`. Proba `scripts/proba-v10047.mjs`.
- Commit local pe pas după `npm test` verde; `npm test && git push` o dată, după revizia finală (agent Opus nou) și reparațiile ei cu test.

## Review Focus

1. Monedă fără bare de 4 h destule (sub ~60 de bare de 4 h ⇒ ADX/EMA50 nule) ⇒ indicatorii nu se arată, fără eroare (test în Task 2).
2. Bot neutru ⇒ dovezile se dau pe ambele margini; situațiile asemănătoare cer aceeași direcție (neutru cu neutru) (test în Task 2 și 3).
3. Arhiva fără boți pe direcția/levierul acesta ⇒ „prea puține situații asemănătoare”, fără cifre (test în Task 3).
4. Fișa pe o monedă fără `ore:` în KV ⇒ blocul lipsește, restul fișei neschimbat (test în Task 4).
5. Mers aleator (fără nicio legătură reală) ⇒ niciun indicator „cu semn” pe mai multe semințe — Bonferroni își face treaba (test în Task 2).

---

### Task 1: Starea rafinată (6 stări) cu cădere în trepte

**Files:** Modify `public/lib/probabilitati.js` (`stareLa`, `frecventa`, `pentruBot`/liniștea, `judeca`/liniștea, `fr`); `public/app.js` (eticheta stării în `tbDeseneazaProb`); Create `scripts/proba-v10047.mjs`; `package.json` (`test:v10047`)

**Interfaces:**
- Produces: `Probabilitati.stareLa(bare, i) → "liniste-lateral"|"liniste-sus"|"liniste-jos"|"miscare-sus"|"miscare-jos"|"miscare-lateral"|null`; `Probabilitati.stareDinRegim(r) → aceeași stare din obiectul `GridCalcul.regimPeBare`/`GridCalcul.regim` (pentru fișă); `Probabilitati.ETICHETE[stare] → text`; `frecventa(...)` întoarce în plus `nivel: "exact"|"regim"|"toate"` (și `stare` = starea pe care s-a condiționat: exactă sau regimul).

- [ ] **Step 1: Proba (picând)** — capul ca la `proba-v10046.mjs` (aceleași `mers`, `rng`, `plat`, `test`), plus încărcarea `Probabilitati`:

```js
await test("stare: 6 stari - regimul fisei si directia pe 24 h fata de obisnuit (r24h >= 0,5)", () => {
  assert.equal(PB.stareDinRegim({ miscare: false, r24h: 0.2, s24h: 0.01 }), "liniste-lateral");
  assert.equal(PB.stareDinRegim({ miscare: false, r24h: 0.8, s24h: -0.02 }), "liniste-jos");
  assert.equal(PB.stareDinRegim({ miscare: true, r24h: 2, s24h: 0.05 }), "miscare-sus");
  assert.equal(PB.stareDinRegim({ miscare: true, r24h: 0.3, s24h: 0.001 }), "miscare-lateral");
  const b = mers(120 * 24, 0.006, 11), s = PB.stareLa(b, b.length - 1);
  assert.ok(/^(liniste|miscare)-(sus|jos|lateral)$/.test(s), s); assert.ok(PB.ETICHETE[s]);
});
await test("frecventa cade in trepte: starea exacta (>= 5 independente) -> acelasi regim -> toate", () => {
  const b = mers(160 * 24, 0.006, 4), s = PB.stareLa(b, b.length - 1);
  const f = PB.frecventa(b, 24, PB.atinge(-0.01), "da", s);
  assert.ok(["exact", "regim", "toate"].includes(f.nivel)); assert.ok(f.nivel !== "exact" || f.stare === s);
  assert.ok(f.nivel !== "regim" || f.stare === s.split("-")[0]);
  const rar = PB.frecventa(b, 24, PB.atinge(-0.01), "da", "miscare-lateral");
  assert.ok(rar.nivel !== "exact" || rar.nIndep >= 5);
});
await test("liniștea mai ține = orice stare de liniște (oricare directie); textul spune la ce nivel s-a conditionat", () => {
  const b = mers(160 * 24, 0.003, 8), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const r = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.97, sus: p * 1.03 });
  assert.ok(r.stare.startsWith("liniste") ? r.liniste && r.liniste.z1 : r.liniste === null);
  const t = PB.randuri(r, null)[0].text; assert.match(t, /situații ca acum|același regim|porniri la 4 h/);
});
```

- [ ] **Step 2:** `node scripts/proba-v10047.mjs` — Expected: PICĂ (`stareDinRegim` lipsește).
- [ ] **Step 3: Implementează** în `probabilitati.js`:

```js
  // v100.47 (pachetul 2b): starea = regimul fisei SI directia pe 24 h fata de obisnuitul monedei (r24h >= 0,5 -> dupa semn)
  function stareDinRegim(r) {
    if (!r) return null;
    var dir = nr(r.r24h) !== null && r.r24h >= 0.5 ? (nr(r.s24h) > 0 ? "sus" : "jos") : "lateral";
    return (r.miscare ? "miscare" : "liniste") + "-" + dir;
  }
  var ETICHETE = { "liniste-lateral": "liniște, laterală", "liniste-sus": "liniște, urcă încet", "liniste-jos": "liniște, coboară încet", "miscare-sus": "mișcare în sus", "miscare-jos": "mișcare în jos", "miscare-lateral": "mișcare fără direcție" };
```

`stareLa` întoarce `stareDinRegim(G.regimPeBare(...))`. În `frecventa`, trei numărători: `ex` (starea exactă), `rg` (același regim: `st(i).split("-")[0] === stareAcum.split("-")[0]`), `tot`; alege prima cu `indep ≥ MIN_INDEP`; `nivel` și `stare` (exactă sau regimul) în rezultat; `doarConditionat` acceptă `exact` sau `regim`; `conditionat = nivel !== "toate"` (păstrat pentru textele vechi). În `pentruBot`: liniștea se socotește când `stare.indexOf("liniste") === 0`, evenimentul = `st(i+h)` începe cu `liniste`, condiționat pe starea de acum (cu cădere pe regim). În `judeca` (fel `liniste`): `s.indexOf("liniste") === 0`. În `fr`: `nivel === "exact"` ⇒ „situații ca acum”; `"regim"` ⇒ „situații cu același regim (direcția: prea puține)”; `"toate"` ⇒ ca acum. Exportă `stareDinRegim`, `ETICHETE`.

În `app.js` (`tbDeseneazaProb`), harta locală de etichete devine `Probabilitati.ETICHETE[rez.stare]||rez.stare`.
- [ ] **Step 4:** `node scripts/proba-v10047.mjs` → `3/3`; `node scripts/proba-v10046.mjs` → `22/22` (dacă testul „starea” din 2a cere vechile 3 nume, actualizează-l cu motivul scris: „v100.47: 6 stări”); `npm test` → exit 0; commit `feat(radar): starea rafinata - regimul si directia (6 stari, cadere in trepte) (pachetul 2b, pas 1)`.

---

### Task 2: Indicatorii cu dovadă (I-471) — `public/lib/dovada.js`

**Files:** Create `public/lib/dovada.js`; Modify `scripts/lib/tura-probabilitati.mjs` (`rez.indicatori`), `scripts/colector.mjs` (încarcă `GraficBot` și `Dovada`), `public/app.js` (blocul în secțiunea probabilităților), `public/index.html` (`<script src="/lib/dovada.js">` după `probabilitati.js`), `public/sw.js`; Test `scripts/proba-v10047.mjs`

**Interfaces:**
- Consumes: `GridCalcul.agrega(b, ms)`, `GraficBot.rsi(c, n)`, `GraficBot.ema(c, n)`, `GraficBot.bollinger(c, n, m)`, `Probabilitati.pregateste`, `Probabilitati.atinge`, `GridCalcul.wilson`.
- Produces: `Dovada.adx(b4, n) → [null|număr]`; `Dovada.zBonferroni(m) → z`; `Dovada.peBot(bare1h, {acum, pret, dir, jos, sus}) → {la, m, z, randuri:[{cod, et, ev:"jos"|"sus", p, n, k, nIndep, ic, baza, semn:"mai des"|"mai rar"|null, text}]} | null`.

- [ ] **Step 1: Teste (picând)** — încarcă `GraficBot` din `public/lib/grafic-bot.js` (`new Function(src + "; return GraficBot;")()`) și `Dovada` (`new Function("GridCalcul","GraficBot","Probabilitati", src + "; return Dovada;")`):

```js
await test("ADX: trend curat -> peste 25; zgomot fara directie -> sub 25; zBonferroni(1) ~ 1,96, (8) ~ 2,73", () => {
  const sus = Array.from({ length: 120 }, (_, i) => ({ t: T0 + i * 4 * ORA, o: 100 + i, h: 101.5 + i, l: 99.8 + i, c: 101 + i }));
  const r = rng(3), zg = Array.from({ length: 120 }, (_, i) => { const c = 100 + (r() - 0.5); return { t: T0 + i * 4 * ORA, o: 100, h: Math.max(100, c) + 0.3, l: Math.min(100, c) - 0.3, c }; });
  assert.ok(DV.adx(sus, 14)[119] > 25); assert.ok(DV.adx(zg, 14)[119] < 25);
  assert.ok(Math.abs(DV.zBonferroni(1) - 1.96) < 0.01); assert.ok(Math.abs(DV.zBonferroni(8) - 2.734) < 0.02);
});
await test("mers aleator: niciun indicator „cu semn” pe 5 seminte (Bonferroni nu lasa zgomotul sa para dovada)", () => {
  let semne = 0;
  for (const s of [1, 2, 3, 4, 5]) { const b = mers(180 * 24, 0.006, s), p = b[b.length - 1].c, d = DV.peBot(b, { acum: b[b.length - 1].t + ORA, pret: p, dir: "long", jos: p * 0.97, sus: p * 1.03 }); if (d) semne += d.randuri.filter((x) => x.semn).length; }
  assert.ok(semne <= 1, "semne false: " + semne);
});
await test("legatura reala: urcari si coborari de cate 6 zile - cu EMA20 sub EMA50, marginea de jos e atinsa MAI DES decat de obicei", () => {
  const v = []; let c = 100;
  for (let i = 0; i < 240 * 24 + 144 + 120; i++) {   // se termina la 120 h in a 42-a ramura (coborare): EMA20 a trecut sub EMA50 const urca = Math.floor(i / 144) % 2 === 0, o = c; c = o * (urca ? 1.003 : 0.997); v.push({ t: T0 + i * ORA, o, h: Math.max(o, c) * 1.0005, l: Math.min(o, c) * 0.9995, c }); }
  const p = v[v.length - 1].c, d = DV.peBot(v, { acum: v[v.length - 1].t + ORA, pret: p, dir: "long", jos: p * 0.98, sus: p * 1.02 });
  const r = d && d.randuri.find((x) => x.cod === "ema-jos" && x.ev === "jos");
  assert.ok(r, "EMA20 sub EMA50 e aprins acum (5 zile in coborare): " + JSON.stringify(d && d.randuri.map((x) => x.cod)));
  assert.equal(r.semn, "mai des"); assert.match(r.text, /mai des decât de obicei/);
});
await test("putine bare de 4 h -> null; neutru -> dovezi pe ambele margini", () => {
  assert.equal(DV.peBot(mers(20 * 24, 0.006, 1), { acum: T0 + 21 * 24 * ORA, pret: 100, dir: "long", jos: 97, sus: 103 }), null);
  const b = mers(180 * 24, 0.006, 9), p = b[b.length - 1].c, d = DV.peBot(b, { acum: b[b.length - 1].t + ORA, pret: p, dir: "neutru", jos: p * 0.97, sus: p * 1.03 });
  assert.ok(d && d.randuri.some((x) => x.ev === "jos") && d.randuri.some((x) => x.ev === "sus"));
});
```

- [ ] **Step 2:** Expected: PICĂ („lipseste Dovada”).
- [ ] **Step 3: `public/lib/dovada.js`:**

```js
// Indicatorii cu dovada (v100.47, I-471, pachetul 2b). Modul pur, probat in scripts/proba-v10047.mjs. Se incarca DUPA grid-calcul.js,
// grafic-bot.js si probabilitati.js. Pentru fiecare indicator APRINS acum pe barele de 4 h (RSI > 70 / < 30, pretul peste / sub banda
// Bollinger, EMA20 peste / sub EMA50, ADX > 25 / < 20): in trecutul monedei, cu el aprins, cat de des a fost atinsa marginea botului pe
// partea de pierdere (long: jos, short: sus, neutru: amandoua) in 24 h, fata de „de obicei” (toate pornirile). Intervalul Wilson cu z
// Bonferroni pentru m comparatii (backtest-expert: data mining bias) - „cu semn” doar daca nu-l cuprinde pe „de obicei”.
var Dovada = (function () {
  "use strict";
  var G = GridCalcul, GB = GraficBot, PB = Probabilitati, ORA = 3600000, H4 = 4 * ORA, ISTORIE = 720, PAS = 4, H = 24;
  function nr(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function adx(b, n) {
    var o = [], tr = 0, pd = 0, md = 0, dx = [], a = null;
    for (var i = 0; i < b.length; i++) {
      o.push(null); if (i === 0) continue;
      var up = b[i].h - b[i - 1].h, dn = b[i - 1].l - b[i].l, p = up > dn && up > 0 ? up : 0, m = dn > up && dn > 0 ? dn : 0;
      var t = Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c));
      if (i <= n) { tr += t; pd += p; md += m; if (i < n) continue; } else { tr = tr - tr / n + t; pd = pd - pd / n + p; md = md - md / n + m; }
      var pdi = tr > 0 ? 100 * pd / tr : 0, mdi = tr > 0 ? 100 * md / tr : 0, x = pdi + mdi > 0 ? 100 * Math.abs(pdi - mdi) / (pdi + mdi) : 0;
      if (a === null) { dx.push(x); if (dx.length === n) { a = dx.reduce(function (s, y) { return s + y; }, 0) / n; o[i] = a; } }
      else { a = (a * (n - 1) + x) / n; o[i] = a; }
    }
    return o;
  }
  // z pentru coada (alfa/m)/2 - Abramowitz & Stegun 26.2.23 (eroare < 5e-4)
  function zBonferroni(m) {
    var p = 0.05 / Math.max(1, m) / 2, t = Math.sqrt(-2 * Math.log(p));
    return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  }
  function wilsonZ(k, n, z) {
    if (!(n > 0)) return [0, 1];
    var p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, (c - w) / d), Math.min(1, (c + w) / d)];
  }
  var STARI = [
    { cod: "rsi-sus", et: "RSI (4 h) peste 70", f: function (s, j) { return s.rsi[j] === null ? null : s.rsi[j] > 70; } },
    { cod: "rsi-jos", et: "RSI (4 h) sub 30", f: function (s, j) { return s.rsi[j] === null ? null : s.rsi[j] < 30; } },
    { cod: "bb-sus", et: "prețul peste banda Bollinger de sus (4 h)", f: function (s, j) { return s.bb[j] ? s.c[j] > s.bb[j].s : null; } },
    { cod: "bb-jos", et: "prețul sub banda Bollinger de jos (4 h)", f: function (s, j) { return s.bb[j] ? s.c[j] < s.bb[j].j : null; } },
    { cod: "ema-sus", et: "EMA20 peste EMA50 (4 h)", f: function (s, j) { return s.e20[j] === null || s.e50[j] === null ? null : s.e20[j] > s.e50[j]; } },
    { cod: "ema-jos", et: "EMA20 sub EMA50 (4 h)", f: function (s, j) { return s.e20[j] === null || s.e50[j] === null ? null : s.e20[j] < s.e50[j]; } },
    { cod: "adx-trend", et: "ADX (4 h) peste 25 — trend", f: function (s, j) { return s.adx[j] === null ? null : s.adx[j] > 25; } },
    { cod: "adx-fara", et: "ADX (4 h) sub 20 — fără trend", f: function (s, j) { return s.adx[j] === null ? null : s.adx[j] < 20; } }
  ];
  function peBot(bare, o) {
    o = o || {};
    var b = PB.pregateste(bare, o.acum), p = nr(o.pret), dir = String(o.dir || "").toLowerCase();
    if (b.length < ISTORIE + H || !(p > 0)) return null;
    var u = b[b.length - 1].t + ORA, b4 = G.agrega(b, H4).filter(function (x) { return x.t + H4 <= u; });
    if (b4.length < 60) return null;
    var c = b4.map(function (x) { return x.c; }), s = { c: c, rsi: GB.rsi(c, 14), e20: GB.ema(c, 20), e50: GB.ema(c, 50), bb: GB.bollinger(c, 20, 2), adx: adx(b4, 14) };
    // ultima bara de 4 h incheiata la inchiderea barei de 1 h i
    var j4 = function (i) { var lim = b[i].t + ORA, lo = 0, hi = b4.length - 1, r = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (b4[m].t + H4 <= lim) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
    var evs = [], jos = nr(o.jos), sus = nr(o.sus);
    if ((dir === "long" || (dir !== "short")) && jos !== null && jos < p) evs.push({ ev: "jos", rel: jos / p - 1 });
    if ((dir === "short" || (dir !== "long")) && sus !== null && sus > p) evs.push({ ev: "sus", rel: sus / p - 1 });
    var jAcum = b4.length - 1, aprinse = STARI.filter(function (x) { return x.f(s, jAcum) === true; });
    if (!evs.length || !aprinse.length) return { la: nr(o.acum) || Date.now(), m: 0, z: null, randuri: [] };
    var m = evs.length * aprinse.length, z = zBonferroni(m), out = [];
    evs.forEach(function (E) {
      var f = PB.atinge(E.rel), baza = { n: 0, k: 0 }, pe = {};
      aprinse.forEach(function (x) { pe[x.cod] = { n: 0, k: 0 }; });
      for (var i = b.length - 1 - H; i >= ISTORIE; i -= PAS) {
        if (b[i + H].t - b[i].t !== H * ORA) continue;
        var j = j4(i); if (j < 0) continue;
        var r = f(b, i, H) === "da" ? 1 : 0; baza.n++; baza.k += r;
        aprinse.forEach(function (x) { if (x.f(s, j) === true) { pe[x.cod].n++; pe[x.cod].k += r; } });
      }
      if (!baza.n) return;
      var pb = baza.k / baza.n;
      aprinse.forEach(function (x) {
        var q = pe[x.cod]; if (!q.n) return;
        var ni = Math.max(1, Math.min(q.n, Math.floor(q.n * PAS / H))), pp = q.k / q.n, ic = wilsonZ(Math.round(pp * ni), ni, z);
        var semn = ni < 10 ? null : ic[0] > pb ? "mai des" : ic[1] < pb ? "mai rar" : null;
        var marg = E.ev === "jos" ? "marginea de jos" : "marginea de sus";
        out.push({ cod: x.cod, et: x.et, ev: E.ev, p: pp, n: q.n, k: q.k, nIndep: ni, ic: ic, baza: pb, semn: semn,
          text: "Cu " + x.et + ", " + marg + " a fost atinsă în 24 h în " + Math.round(pp * 100) + "% din " + q.n + " porniri (≈ " + ni + " independente), față de " + Math.round(pb * 100) + "% de obicei: "
            + (semn ? semn + " decât de obicei" : ni < 10 ? "prea puține cazuri ca să spună ceva" : "fără semn (diferența intră în zgomot)") + " (interval corectat pentru " + m + " comparații: " + Math.round(ic[0] * 100) + "–" + Math.round(ic[1] * 100) + "%)." });
      });
    });
    return { la: nr(o.acum) || Date.now(), m: m, z: z, randuri: out };
  }
  return { adx: adx, zBonferroni: zBonferroni, wilsonZ: wilsonZ, peBot: peBot, STARI: STARI };
})();
```

- [ ] **Step 4: Colectorul.** În `colector.mjs`: `const GraficBot = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "grafic-bot.js"), "utf8") + "; return GraficBot;")();` și `const Dovada = new Function("GridCalcul", "GraficBot", "Probabilitati", fs.readFileSync(path.join(RAD, "public", "lib", "dovada.js"), "utf8") + "; return Dovada;")(GridCalcul, GraficBot, Probabilitati);` (în lista probei de încărcare; dacă `grafic-bot.js` atinge DOM la încărcare, oprește-te și raportează — nu-l încărca peste DOM). Le dai lui `turaProbabilitatiModul` ca `Dovada`. În `tura-probabilitati.mjs`, după `pentruBot`: `if (rez && d.Dovada) rez.indicatori = d.Dovada.peBot(bare, { acum: d.acum, pret: nr(b.pretCurent), dir, jos: nr(b.gridJos), sus: nr(b.gridSus) });`. Limita de 16 KB a lui `prob` ajunge (≤ 16 rânduri × ~400 B) — verifică pe CRV real după repornire.
- [ ] **Step 5: Pagina.** În `tbDeseneazaProb`, sub rândurile probabilităților: rândurile `rez.indicatori.randuri` cu `semn` (text + bandă cu `ic` și un semn subțire la `baza`), apoi `<details class="tbProbFara"><summary>Fără semn · N</summary>…</details>` cu restul. Antet bloc: „Indicatorii aprinși acum, cu dovada din trecutul monedei”. CSS: `.tbProbBaza{position:absolute;top:-2px;width:1px;height:12px;background:var(--muted)}` în `.tbProbBanda`.
- [ ] **Step 6: Test static** (în `proba-v10047.mjs`): `app.js` conține `rez.indicatori` și `tbProbFara`; `index.html` are `<script src="/lib/dovada.js"></script>`; `sw.js` are `"/lib/dovada.js"`; colectorul are `Dovada.peBot` prin `tura-probabilitati.mjs`. Rulează: `node scripts/proba-v10047.mjs` → `8/8`; `COLECTOR_DOAR_INCARCA=1 node scripts/colector.mjs` → `INCARCAT true`; `npm test` → exit 0; commit `feat(radar): indicatorii cu dovada (I-471) - Bonferroni, pe partea de pierdere (pachetul 2b, pas 2)`.

---

### Task 3: Situațiile asemănătoare pe boții lui (I-469) — `public/lib/asemanatoare.js`

**Files:** Create `public/lib/asemanatoare.js`; Modify `functions/api/istoric-bot.js` (`cazuri` GET/POST, limita 393216 ca la `scan`), `scripts/colector.mjs` (`turaCazuri` noaptea, după profil), `public/app.js` (Tablou + poartă), `public/lib/obiceiuri.js` (`o.asemanatoare` → `sfaturi`), `public/index.html`, `public/sw.js`; Test `scripts/proba-v10047.mjs`

**Interfaces:**
- Consumes: `JurnalTrade.din(arhiva)` (`dir, levier, investit, pornit, jos, sus, pretInit, pasNet, pct, durataOre, moneda`), `Probabilitati.stareLa`, `Probabilitati.stareDinRegim`, barele de 1 h de pe disc.
- Produces: `Asemanatoare.cazuri(trades, bareDe(moneda) → bare1h|null) → [{id, moneda, dir, lev, lat, pas, ora, stare, pct, ore}]`; `Asemanatoare.vecini(cazuri, tinta, o) → {n, pePlus, medianaPct, ceaMaiReaPct, medianaOre, text}`; `tinta = {dir, lev, lat, pas, stare, investit}`; KV `cazuri` = `{la, cazuri}`.

- [ ] **Step 1: Teste (picând):**

```js
await test("cazuri: doar ce se stia la pornire - starea din barele de DINAINTE de pornire; fara bare -> stare null", () => {
  assert.ok(AS && typeof AS.cazuri === "function", "lipseste Asemanatoare.cazuri");
  const b = mers(120 * 24, 0.006, 2), pornit = b[1000].t + 30 * 60000;
  const tr = [{ id: "a", moneda: "X", dir: "long", levier: 3, investit: 50, pornit, jos: 90, sus: 110, pretInit: 100, pasNet: 0.004, pct: -0.02, durataOre: 10 }];
  const c = AS.cazuri(tr, () => b)[0];
  assert.equal(c.stare, PB.stareLa(b.filter((x) => x.t + ORA <= pornit), 999)); assert.ok(Math.abs(c.lat - 0.2) < 1e-9); assert.equal(c.ora, new Date(pornit).getUTCHours());
  assert.equal(AS.cazuri(tr, () => null)[0].stare, null);
});
await test("vecini: aceeasi directie, latime/pas/levier apropiate, aceeasi stare -> median, % pe plus, cel mai rau; sub 10 -> „prea puține”", () => {
  const baza = (i, o) => ({ id: "c" + i, moneda: "X", dir: "long", lev: 3, lat: 0.1, pas: 0.004, ora: 10, stare: "liniste-lateral", pct: (i % 4 === 0 ? -0.05 : 0.02), ore: 12, ...o });
  const cz = Array.from({ length: 30 }, (_, i) => baza(i)).concat(Array.from({ length: 30 }, (_, i) => baza(100 + i, { dir: "short", pct: -0.5 })));
  const v = AS.vecini(cz, { dir: "long", lev: 3, lat: 0.11, pas: 0.0045, stare: "liniste-lateral", investit: 100 });
  assert.equal(v.n, 30); assert.ok(v.pePlus > 0.7 && v.pePlus < 0.8); assert.equal(v.ceaMaiReaPct, -0.05); assert.match(v.text, /30 de situații/); assert.match(v.text, /USDT/);
  const p = AS.vecini(cz.slice(0, 6), { dir: "long", lev: 3, lat: 0.1, pas: 0.004, stare: "liniste-lateral", investit: 100 });
  assert.match(p.text, /prea puține/); assert.equal(p.medianaPct, null);
  assert.match(AS.vecini(cz, { dir: "neutru", lev: 3, lat: 0.1, pas: 0.004, stare: null, investit: 100 }).text, /prea puține/, "neutru cere neutru");
});
await test("server + pagina: cazurile in KV (pana la 384 KB), Tabloul si poarta le folosesc", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const cz = Array.from({ length: 2300 }, (_, i) => ({ id: "c" + i, moneda: "XYZ", dir: "long", lev: 3, lat: 0.1234, pas: 0.0041, ora: 10, stare: "liniste-lateral", pct: -0.0123, ore: 12.5 }));
  const r = await mod.onRequestPost({ request: cer("POST", "action=cazuri", { la: 1, cazuri: cz }), env }); assert.equal(r.status, 200, await r.clone().text());
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=cazuri"), env })).json()).cazuri.cazuri.length, 2300);
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"); assert.match(app, /Asemanatoare\.vecini\(/); assert.match(app, /asemanatoare:/);
});
```

- [ ] **Step 2:** Expected: PICĂ.
- [ ] **Step 3: `public/lib/asemanatoare.js`:**

```js
// Situatiile asemanatoare pe botii lui (v100.47, I-469, pachetul 2b). Modul pur, probat in scripts/proba-v10047.mjs; se incarca DUPA
// probabilitati.js. Din arhiva botilor inchisi: ce se stia la pornire (directie, levier, latimea si pasul gridului, ora, starea pietei din
// barele de DINAINTE) si cum s-a terminat (% din investitie, durata). Vecinii: aceeasi directie, apoi cei mai apropiati pe latime, pas,
// levier si stare. Descriere a trecutului lui, nu promisiune; sub 10 vecini nu spune nimic.
var Asemanatoare = (function () {
  "use strict";
  var PB = Probabilitati, ORA = 3600000, K = 40, MIN = 10;
  function nr(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function cazuri(trades, bareDe) {
    var memo = {}, out = [];
    (Array.isArray(trades) ? trades : []).forEach(function (t) {
      var jos = nr(t.jos), sus = nr(t.sus), p0 = nr(t.pretInit), pct = nr(t.pct), por = nr(t.pornit);
      if (jos === null || sus === null || !(p0 > 0) || !(sus > jos) || pct === null || por === null) return;
      var b = t.moneda in memo ? memo[t.moneda] : (memo[t.moneda] = bareDe(t.moneda) || null), stare = null;
      if (b && b.length) { var lo = 0, hi = b.length - 1, i = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (b[m].t + ORA <= por) { i = m; lo = m + 1; } else hi = m - 1; } if (i >= 0) stare = PB.stareLa(b, i); }
      out.push({ id: String(t.id), moneda: t.moneda, dir: String(t.dir || "").toLowerCase(), lev: nr(t.levier) || 1, lat: (sus - jos) / p0, pas: nr(t.pasNet), ora: new Date(por).getUTCHours(), stare: stare, pct: Math.round(pct * 10000) / 10000, ore: nr(t.durataOre) !== null ? Math.round(t.durataOre * 10) / 10 : null });
    });
    return out;
  }
  function dist(c, t) {
    var d = Math.abs(Math.log(c.lat / t.lat)) / Math.LN2 + Math.abs((nr(c.lev) || 1) - (nr(t.lev) || 1)) / 5;
    d += c.pas > 0 && t.pas > 0 ? Math.abs(Math.log(c.pas / t.pas)) / Math.LN2 : 0.5;
    d += !c.stare || !t.stare ? 0.5 : c.stare === t.stare ? 0 : c.stare.split("-")[0] === t.stare.split("-")[0] ? 0.5 : 1;
    return d;
  }
  function med(l) { var a = l.slice().sort(function (x, y) { return x - y; }); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; }
  var PR = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; };
  function vecini(cz, t, o) {
    var dir = String(t && t.dir || "").toLowerCase();
    var l = (Array.isArray(cz) ? cz : []).filter(function (c) { return c && c.dir === dir && c.lat > 0 && t.lat > 0; })
      .map(function (c) { return { c: c, d: dist(c, t) }; }).filter(function (x) { return x.d <= 2; }).sort(function (a, b) { return a.d - b.d; }).slice(0, K).map(function (x) { return x.c; });
    if (l.length < MIN) return { n: l.length, pePlus: null, medianaPct: null, ceaMaiReaPct: null, medianaOre: null, text: "Prea puține situații asemănătoare în boții tăi (" + l.length + ") ca să spun ceva." };
    var pct = l.map(function (c) { return c.pct; }), ore = l.map(function (c) { return c.ore; }).filter(function (x) { return x !== null; });
    var m = med(pct), rau = Math.min.apply(null, pct), plus = pct.filter(function (x) { return x > 0; }).length / l.length, inv = nr(t.investit), U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
    return { n: l.length, pePlus: plus, medianaPct: m, ceaMaiReaPct: rau, medianaOre: med(ore),
      text: "În " + l.length + " de situații asemănătoare (aceeași direcție, lățime, pas și levier apropiate" + (t.stare ? ", piață la fel" : "") + "), boții tăi: median " + PR(m) + (inv > 0 ? " (" + U(m * inv) + " pe suma asta)" : "") + ", " + Math.round(plus * 100) + "% pe plus, cel mai rău " + PR(rau) + (inv > 0 ? " (" + U(rau * inv) + ")" : "") + (med(ore) !== null ? "; au ținut de obicei ~" + Math.round(med(ore)) + " h" : "") + ". E trecutul tău, nu o promisiune." };
  }
  return { cazuri: cazuri, vecini: vecini };
})();
```

- [ ] **Step 4: Server** — GET `if(action==="cazuri"){let c=null;try{c=JSON.parse(await env.ISTORIC.get("cazuri")||"null")}catch{c=null}return json({cazuri:c})}`; în POST, limita: `action==="scan"||action==="botiInchisi"||action==="cazuri"?393216:65536`; `if(action==="cazuri"){const l=corp&&Array.isArray(corp.cazuri)?corp.cazuri.slice(0,4000):null;if(!l)return json({error:"Lipseste cazuri"},400);await env.ISTORIC.put("cazuri",JSON.stringify({la:nr(corp.la)||Date.now(),cazuri:l}));return json({ok:true,n:l.length})}`.
- [ ] **Step 5: Colectorul** — `const Asemanatoare = new Function("Probabilitati", fs.readFileSync(path.join(RAD, "public", "lib", "asemanatoare.js"), "utf8") + "; return Asemanatoare;")(Probabilitati);` (+ lista probei); `turaCazuri()` o dată pe zi ROMÂNEASCĂ (`profilStare.cazuriZi !== ziua de azi`), după `turaProfil()` în `bucla` (`.then`): `const tr = JurnalTrade.din(await botiInchisiToti()), harta = {}; for (const s of Object.keys(profilStare.facute || {})) harta[JurnalTrade.moneda(s.replace(/_USDT_PERP$/, ""))] = s;` — `bareDe = (m) => harta[m] ? GridCalcul.bare(JSON.parse(fs.readFileSync(fisOre(harta[m]), "utf8"))) : null` (try/catch → null); `trimite("/api/istoric-bot?action=cazuri", { la: Date.now(), cazuri: Asemanatoare.cazuri(tr, bareDe) })`; jurnal „cazuri: N, cu stare: M”. (Notă: harta simbol→monedă e aproximativă pentru tickerii redenumiți — LIT→LIGHTER; acolo starea rămâne null, iar `dist` pune 0,5.)
- [ ] **Step 6: Pagina** — `tbCazuri={la:0,l:null}` adus la 30 min (`action=cazuri`); în `tbDeseneazaProb`, la capăt: `👥 ` + `Asemanatoare.vecini(tbCazuri.l, {dir, lev: b.levier, lat: (gridSus-gridJos)/pretCurent, pas: pasul net al botului (TabloExtra.geometrieBot(b) — verifică numele câmpului; altfel (sus/jos)^(1/(row-1))−1 − 2·0,0002), stare: rez.stare, investit: b.investit}).text`. În `gridPoarta`: `asemanatoare` = vecinii pe `{dir: f.dir, lev, lat: (st.sus-st.jos)/f.pret, pas: st.pas - 2*GridCalcul.C.COMISION_GRILA, stare: Probabilitati.stareDinRegim(f.regim), investit: suma}`; `Obiceiuri.poarta` pune `o.asemanatoare.text` în `sfaturi` (informație, nu regulă). `index.html` + `sw.js`: `asemanatoare.js` după `dovada.js`.
- [ ] **Step 7:** `node scripts/proba-v10047.mjs` → `11/11`; colectorul se încarcă; `npm test` → exit 0; commit `feat(radar): situatiile asemanatoare pe botii lui (I-469) pe Tablou si in poarta (pachetul 2b, pas 3)`.

---

### Task 4: Probabilitățile în fișa Grid (gridul propus)

**Files:** Modify `functions/api/istoric-bot.js` (`ore` GET/POST, limita 524288), `scripts/lib/tura-profil.mjs` (după `scrieBare`, `d.trimiteOre`), `scripts/colector.mjs`, `public/lib/probabilitati.js` (`randuri(rez, cal, o)` cu `o.titluCursa`), `public/app.js` (blocul din fișă + poarta); Test `scripts/proba-v10047.mjs`

**Interfaces:** KV `ore:<SIMBOL>` = `{la, simbol, b:[[t,o,h,l,c],…]}` (prețuri la 6 cifre semnificative); `GET action=ore&simbol=` → `{simbol, ore}`; `Probabilitati.imbina(bare1h, b15, acum) → bare1h` (adaugă orele încheiate din 15M de după ultima bară de 1 h); `Probabilitati.randuri(rez, cal, {titluCursa})`.

- [ ] **Step 1: Teste (picând):**

```js
await test("imbina: orele noi din 15M (doar cele complete) dupa ultima bara de 1 h", () => {
  const b1 = Array.from({ length: 48 }, (_, i) => ({ t: T0 + i * ORA, o: 1, h: 1, l: 1, c: 1 }));
  const b15 = Array.from({ length: 4 * 5 + 2 }, (_, i) => ({ t: T0 + 48 * ORA + i * 15 * 60000, o: 2, h: 3, l: 1, c: 2 }));
  const r = PB.imbina(b1, b15, T0 + 48 * ORA + 22 * 15 * 60000);
  assert.equal(r.length, 48 + 5, "5 ore complete, a 6-a incompleta nu"); assert.equal(r[48].h, 3);
});
await test("randuri: titlul cursei se poate schimba (fisa: „Marginea de câștig înaintea stopului fișei”)", () => {
  const x = { p: 0.6, n: 300, k: 180, nIndep: 12, ic: [0.4, 0.75], orizontOre: 168, nivel: "exact", conditionat: true, stare: "liniste-lateral" };
  assert.match(PB.randuri({ niveluri: {}, cursa: { tinta: x } }, null, { titluCursa: "Marginea de câștig înaintea stopului fișei" })[0].titlu, /^Marginea de câștig/);
});
await test("server: ore:<SIMBOL> pana la 512 KB; pagina: fisa cere ore si arata blocul doar cu bare", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const b = Array.from({ length: 4440 }, (_, i) => [T0 + i * ORA, 0.398123, 0.401234, 0.395432, 0.399876]);
  const r = await mod.onRequestPost({ request: new Request("http://127.0.0.1:8788/api/istoric-bot?action=ore", { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: JSON.stringify({ simbol: "CRV_USDT_PERP", b }) }), env });
  assert.equal(r.status, 200, await r.clone().text()); assert.ok(kv.has("ore:CRV_USDT_PERP"));
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"); assert.match(app, /action=ore&simbol=/); assert.match(app, /id="grProb"/); assert.match(app, /Probabilitati\.imbina\(/);
});
```

- [ ] **Step 2:** Expected: PICĂ.
- [ ] **Step 3: `probabilitati.js`:**

```js
  // v100.47: orele incheiate din 15M de dupa ultima bara de 1 h (fisa: barele de 1 h din KV sunt de azi-noapte)
  function imbina(b1, b15, acum) {
    var a = pregateste(b1, acum), u = a.length ? a[a.length - 1].t : -Infinity, lim = nr(acum) || Date.now(), gr = {};
    (Array.isArray(b15) ? b15 : []).forEach(function (x) {
      if (!x || nr(x.t) === null) return;
      var h = Math.floor(x.t / ORA) * ORA; if (h <= u || h + ORA > lim) return;
      (gr[h] = gr[h] || []).push(x);
    });
    // doar orele COMPLETE (4 bare de 15M)
    var noi = Object.keys(gr).map(Number).sort(function (x, y) { return x - y; }).filter(function (h) { return gr[h].length === 4; }).map(function (h) {
      var g = gr[h].sort(function (x, y) { return x.t - y.t; });
      return { t: h, o: g[0].o, h: Math.max.apply(null, g.map(function (x) { return x.h; })), l: Math.min.apply(null, g.map(function (x) { return x.l; })), c: g[3].c };
    });
    return a.concat(noi);
  }
``` `randuri(rez, cal, o)`: titlul cursei = `o && o.titluCursa || "Ținta planului (…) înaintea stopului (…), în 7 zile"`. Export `imbina`.
- [ ] **Step 4: Server** — `ore` GET (`simbolKv`) și POST (limita `action==="ore"?524288:…`; validare: `b` tablou de ≤ 5000 de rânduri a câte 5 numere).
- [ ] **Step 5: Colectorul** — în `tura-profil.mjs`, după `d.scrieBare(simbol, randuri)`: `if (d.trimiteOre) await d.trimiteOre(simbol, randuri);`; în `colector.mjs`, `trimiteOre: (s, r) => trimite("/api/istoric-bot?action=ore", { simbol: s, b: GridCalcul.bare(r).map((x) => [x.t, +x.o.toPrecision(6), +x.h.toPrecision(6), +x.l.toPrecision(6), +x.c.toPrecision(6)]) })`. Prima noapte după repornire le trimite pe toate 52 (o dată).
- [ ] **Step 6: Fișa Grid** — în `renderGrid`, după blocul `grPlanVar`: `h+='<div id="grProb"></div>'`; `grProbAdu(f)`: o dată la 30 min pe simbol `getJSON("/api/istoric-bot?action=ore&simbol=")` (+ calibrarea); când sosesc, `Probabilitati.pentruBot(Probabilitati.imbina(ore.b.map(r=>({t:r[0],o:r[1],h:r[2],l:r[3],c:r[4]})), GridCalcul.bare(grStare.date.r15), Date.now()), {acum, pret: f.pret, dir: f.dir, jos: st.jos, sus: st.sus, lichidare: f.dir==="short"?st.lichidare.sus:st.lichidare.jos, tinta: f.dir==="short"?st.stop.jos:st.stop.sus, stop: f.dir==="short"?st.stop.sus:st.stop.jos})` cu `st` = setarea propusă (`f.propusa==="deasa"&&f.deasa&&f.deasa.setare?f.deasa.setare:f.setare`); desenează în `#grProb` titlul „🎲 Ce s-a întâmplat în trecut, cu gridul propus” + `Probabilitati.randuri(rez, cal, {titluCursa: "Marginea de câștig înaintea stopului fișei, în 7 zile"})` cu aceeași bandă ca pe Tablou (extrage desenarea unui rând într-o funcție comună `tbProbRandHtml(x)` folosită în ambele locuri). Fără `ore` (null / 503) ⇒ `#grProb` gol. În `gridPoarta`: `sansa: Probabilitati.rand(rez, cal, f.dir)` → `Obiceiuri.poarta` o pune în `sfaturi`.
- [ ] **Step 7:** `node scripts/proba-v10047.mjs` → `14/14`; `npm test` → exit 0; commit `feat(grid): probabilitatile din istoric pe gridul propus din fisa si in poarta (pachetul 2b, pas 4)`.

---

### Task 5: Versiunea, ecranul, revizia, livrarea

- [ ] **Step 1:** v100.47 + colector v101.28 în toate locurile; `npm test` → exit 0; `node scripts/proba-ecran-tablou.mjs` → toate ok; `node scripts/proba-ecran-grid.mjs` → toate ok.
- [ ] **Step 2:** commit; repornirea colectorului (o dată); probă că a pornit (`v101.28`, `prob:<bot>` are `indicatori`, KV `cazuri` și `ore:` vin la prima noapte — sau la prima tură pentru monedele fără profil; dacă trebuie văzute acum, rulează o dată `turaCazuri` printr-un script din scratchpad cu aceleași funcții, NU prin repornire repetată).
- [ ] **Step 3:** poze CDP: Tablou (secțiunea cu indicatorii și „👥”) și Grid (fișa cu „🎲”, poarta) la 1920 și 390; mă uit la ele.
- [ ] **Step 4:** revizia finală (agent Opus nou, cu Review Focus + trader.md + backtest-expert); reparațiile cu test RED→GREEN; `npm test && git push origin main`; memo.
