# Pachetul 2a — Probabilitățile din istoric, cu calibrare — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pentru fiecare bot care rulează, Tabloul arată cât de des s-a întâmplat în trecutul monedei, în situații ca acum, ce contează pentru bani: ieșirea din grid (24 h, 3 zile), lichidarea (7 zile), cursa țintă–stop (7 zile), liniștea care mai ține (1–2 zile). Fiecare cifră are numărul de cazuri, câte sunt independente și intervalul de încredere. Fiecare cifră arătată se notează, se verifică după orizontul ei și, când s-au strâns destule cazuri, se afișează corectată, cu avertisment dacă a mințit.

**Architecture:** modul pur nou `public/lib/probabilitati.js` (stările pe barele de 1 h cu regimul fișei, frecvențele condiționate, cursa, jurnalul, calibrarea, textele) · colectorul, o dată pe oră pe bot activ, aduce pagina nouă de bare de 1 h, socotește, pune rezultatul în KV `prob:<bot>`, notează în jurnalul de pe disc la 4 h și judecă ce și-a încheiat orizontul → KV `calibrare` · Tabloul citește cele două chei și desenează secțiunea „🎲 Probabilitățile din istoric” + un rând în Consilier.

**Tech Stack:** JS ES5 în `public/lib` (încărcat cu `new Function("GridCalcul", …)` în colector și probe), Node ESM, Cloudflare Pages Functions + KV local `ISTORIC`.

**Spec:** `docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md` — „Principiile” și „Pachetul 2”.

## Împărțirea pachetului 2 (spusă dinainte)

- **2a (acest plan):** probabilitățile 1–4 din spec + calibrarea, pentru boții care RULEAZĂ.
- **2b (planul următor):** I-471 (indicatorii cu dovadă) și I-469 (situațiile asemănătoare pe boții lui) + probabilitățile în fișa Grid și în poartă (acolo moneda poate să nu aibă bot și nici bare de 1 h aduse; 2b le socotește din barele pe care pagina le are deja).

## Global Constraints

- Doar ce se știa atunci: starea la pornirea `i` se socotește din barele `≤ i` (ultimele 30 de zile); rezultatul, din barele `i+1 … i+H`; doar barele ÎNCHEIATE până la `acum`.
- „Asemănător” = aceeași stare, din regimul FIȘEI aplicat pe barele de 1 h (`GridCalcul.regimPeBare(b, 4, 24)`): `liniste` / `miscare-sus` / `miscare-jos`. Sub 5 cazuri independente în starea de acum ⇒ toate zilele, spus ca atare.
- Pornirile la 4 h una de alta; cazurile independente = `floor(n × 4 / H)` (ferestrele care nu se suprapun); intervalul Wilson se socotește pe ele.
- Bară cu ținta și stopul atinse amândouă ⇒ se numără STOP (pesimist).
- Calibrarea: cutii de 20 de puncte procentuale; de la 20 de cazuri judecate într-o cutie cifra arătată = frecvența observată, cea brută rămâne alături; diferență peste 15 puncte ⇒ avertisment.
- Lichidarea 8/15%, planul lui, poarta: neatinse. Nicio alertă nouă pe Discord în 2a.
- Pauză 1,6 s între cererile de lumânări; o singură pagină nouă de 1 h pe bot pe oră.
- Versiuni: aplicația `v100.46` (aceleași locuri ca la v100.45: BUILD_INFO version + badge „v100.46 · PROBABILITĂȚILE”, package.json `100.46.0`, index.html meta/sideVersiune/antetVersiune/healthAppVersion, `sw.js` CACHE `crypto-radar-v100-46` + `/lib/probabilitati.js` în APP_SHELL, `functions/_shared/versiune.js`), colectorul `v101.27`.
- `npm test && git commit && git push`, commit local pe pas, push o dată la final. Scrierea fișierelor: Edit/Write sau Python cu `assert` pe text, nu heredoc cu backslash.

## Review Focus

1. Monedă cu mai puțin de 31 de zile de bare de 1 h ⇒ nicio stare ⇒ `pentruBot` întoarce `null` și secțiunea spune „puțin istoric”, fără cifre (test în Task 1).
2. Botul neutru ⇒ nu există „partea de pierdere”: se arată ieșirea pe ambele părți, fără cursă și fără lichidare pe o parte (test în Task 1).
3. Ținta planului deja atinsă / stopul dincolo de lichidare / prețuri lipsă ⇒ cursa nu se socotește (null), restul da (test în Task 1).
4. Colectorul oprit câteva zile ⇒ intrările din jurnal se judecă la repornire din barele aduse (nu se pierd, nu se judecă pe bare lipsă: fără bare complete ⇒ rămân nejudecate) (test în Task 2).
5. Pagina publicată (fără KV) ⇒ secțiunea nu apare, Consilierul arată ca înainte (test în Task 5).

---

### Task 1: Modulul `Probabilitati` — stările, frecvențele, cursa

**Files:**
- Create: `public/lib/probabilitati.js`
- Create: `scripts/proba-v10046.mjs`; Modify: `package.json` (`test:v10046` + capătul lanțului `test`)

**Interfaces:**
- Consumes: `GridCalcul.regimPeBare(b, k4, k24)`, `GridCalcul.wilson(k, n)` (exportate? — verifică în `return {` din grid-calcul.js; dacă `regimPeBare` nu e exportat, adaugă-l la export, fără altă schimbare).
- Produces:
  - `Probabilitati.pregateste(bare, acum) → bare` (doar încheiate, sortate);
  - `Probabilitati.stareLa(bare, i) → "liniste"|"miscare-sus"|"miscare-jos"|null`;
  - `Probabilitati.frecventa(bare, H, ev, asteptat, stareAcum, opt) → {p, n, k, nIndep, ic:[lo,hi], orizontOre, conditionat, stare} | null` (`opt.doarConditionat`);
  - `Probabilitati.atinge(rel) → ev`, `Probabilitati.cursa(relT, relS) → ev`;
  - `Probabilitati.pentruBot(bare, o) → rez | null`, `o = {acum, pret, dir, jos, sus, lichidare, tinta, stop}`; `rez = {la, stare, bare, niveluri:{jos,sus,lichidare,tinta,stop}, iese:{jos24,sus24,jos72,sus72}, lichidare7, cursa:{tinta,stop}|null, liniste:{z1,z2}|null}` (fiecare valoare = rezultatul lui `frecventa` sau null).

- [ ] **Step 1: Proba (picând)** — `scripts/proba-v10046.mjs` cu capul de la `proba-v10045.mjs` (RAD, `lib()`, `test()`), plus:

```js
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
let PB = null; try { PB = new Function("GridCalcul", `${lib("probabilitati.js")}; return Probabilitati;`)(G); } catch { PB = null; }
const ORA = 3600000, T0 = Date.UTC(2026, 0, 1);
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// mers aleator fara deriva pe 1 h: in medie, +x inainte de -x in jumatate din cazuri
function mers(ore, sigma, seed) { const r = rng(seed), v = []; let c = 100;
  for (let i = 0; i < ore; i++) { const o = c; c = o * Math.exp(sigma * (r() + r() + r() - 1.5) * 2); v.push({ t: T0 + i * ORA, o, h: Math.max(o, c) * (1 + 0.002 * r()), l: Math.min(o, c) * (1 - 0.002 * r()), c }); }
  return v; }
const plat = (ore) => Array.from({ length: ore }, (_, i) => ({ t: T0 + i * ORA, o: 100, h: 101, l: 99, c: 100 }));

await test("atinge: pret plat 99-101 -> -0,5% atins mereu, -2% niciodata; cazurile independente = n*4/H", () => {
  assert.ok(PB && typeof PB.frecventa === "function", "lipseste Probabilitati.frecventa");
  const b = plat(60 * 24);
  const a = PB.frecventa(b, 24, PB.atinge(-0.005), "da", null), z = PB.frecventa(b, 24, PB.atinge(-0.02), "da", null);
  assert.equal(a.p, 1); assert.equal(z.p, 0); assert.equal(a.nIndep, Math.floor(a.n * 4 / 24)); assert.ok(a.ic[0] > 0.5 && z.ic[1] < 0.5);
});
await test("cursa simetrica pe mers aleator: tinta +3% inaintea stopului -3% in ~jumatate din cazuri (IC o cuprinde pe 0,5)", () => {
  const b = mers(200 * 24, 0.006, 7), t = PB.frecventa(b, 168, PB.cursa(0.03, -0.03), "tinta", null), s = PB.frecventa(b, 168, PB.cursa(0.03, -0.03), "stop", null);
  assert.ok(t.p > 0.3 && t.p < 0.7, "p=" + t.p); assert.ok(t.ic[0] < 0.5 && t.ic[1] > 0.5, t.ic.join("-")); assert.ok(t.p + s.p <= 1 + 1e-9);
});
await test("doar ce se stia atunci: barele de DUPA acum (un crah de 50%) nu schimba nimic", () => {
  const b = mers(120 * 24, 0.006, 3), acum = b[b.length - 1].t + ORA;
  const crah = Array.from({ length: 48 }, (_, i) => ({ t: acum + i * ORA, o: 100, h: 100, l: 50, c: 50 }));
  const o = { acum, pret: b[b.length - 1].c, dir: "long", jos: b[b.length - 1].c * 0.95, sus: b[b.length - 1].c * 1.05, lichidare: b[b.length - 1].c * 0.8, tinta: b[b.length - 1].c * 1.03, stop: b[b.length - 1].c * 0.96 };
  const r1 = PB.pentruBot(PB.pregateste(b, acum), o), r2 = PB.pentruBot(PB.pregateste(b.concat(crah), acum), o);
  assert.ok(r1 && r1.iese.jos24); assert.deepEqual(r2, r1);
  const r3 = PB.pentruBot(b.concat(crah), { ...o, acum: acum + 48 * ORA }); assert.notDeepEqual(r3.iese.jos24, r1.iese.jos24, "testul are dinti");
});
await test("starea: din regimul fisei pe 1 h; conditionat doar cu >= 5 cazuri independente, altfel toate zilele (spus)", () => {
  const b = mers(120 * 24, 0.006, 11), s = PB.stareLa(b, b.length - 1);
  assert.ok(["liniste", "miscare-sus", "miscare-jos"].includes(s), s); assert.equal(PB.stareLa(b, 100), null, "sub 30 de zile de istoric: fara stare");
  const f = PB.frecventa(b, 24, PB.atinge(-0.01), "da", s);
  assert.ok(f.conditionat ? f.stare === s && f.nIndep >= 5 : f.stare === null);
});
await test("pentruBot: putin istoric -> null; neutru -> fara cursa si fara lichidare; tinta deja atinsa -> fara cursa", () => {
  assert.equal(PB.pentruBot(mers(20 * 24, 0.006, 1), { acum: T0 + 21 * 24 * ORA, pret: 100, dir: "long", jos: 95, sus: 105 }), null);
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const n = PB.pentruBot(b, { acum, pret: p, dir: "neutru", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 1.03, stop: p * 0.97 });
  assert.ok(n.iese.jos24 && n.iese.sus24); assert.equal(n.cursa, null); assert.equal(n.lichidare7, null);
  const l = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 0.99, stop: p * 0.96 });
  assert.equal(l.cursa, null, "tinta sub pret la long = deja atinsa"); assert.ok(l.lichidare7);
});
```

(la capăt, ca în celelalte probe: `console.log(\`\n${teste - picate}/${teste} trecute\`); if (picate) process.exit(1);`)

- [ ] **Step 2: Rulează** `node scripts/proba-v10046.mjs` — Expected: toate PICĂ („lipseste Probabilitati.frecventa”).

- [ ] **Step 3: Modulul** — `public/lib/probabilitati.js`:

```js
// Probabilitatile din istoric (v100.46, pachetul 2a, 01.10 - el: „partea de probabilități bazate pe istoric ... mai aprofundată”).
// Modul pur, probat in scripts/proba-v10046.mjs. Se incarca DUPA grid-calcul.js. Pe barele de 1 ORA ale monedei (6 luni, colectorul):
// FRECVENTE din trecut, nu predictii. Pornirile la fiecare 4 h, doar cele al caror orizont s-a incheiat; starea la pornire din barele
// de pana atunci (regimul fisei pe 1 h: 4 h si 24 h fata de obisnuitul ultimelor 30 de zile); „ca acum” = aceeasi stare (sub 5 cazuri
// independente: toate zilele, spus). Cazurile independente = ferestrele care nu se suprapun; intervalul Wilson pe ele.
var Probabilitati = (function () {
  "use strict";
  var G = GridCalcul, ORA = 3600000, ISTORIE = 720, PAS = 4, MIN_INDEP = 5;
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function pregateste(bare, acum) {
    var a = nr(acum) || Date.now();
    return (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && x.t + ORA <= a; }).sort(function (x, y) { return x.t - y.t; });
  }
  function stareLa(bare, i) {
    if (!Array.isArray(bare) || i < ISTORIE || i >= bare.length) return null;
    var r = G.regimPeBare(bare.slice(i - ISTORIE, i + 1), 4, 24);
    return !r ? null : r.miscare ? (r.sens === "coboara" ? "miscare-jos" : "miscare-sus") : "liniste";
  }
  function indep(n, H) { return Math.max(1, Math.min(n, Math.floor(n * PAS / H))); }
  // ev(bare, i, H) -> rezultatul ferestrei care incepe la inchiderea barei i (sir); se numara cele egale cu `asteptat`
  function frecventa(bare, H, ev, asteptat, stareAcum, opt) {
    if (!Array.isArray(bare) || !(H > 0)) return null;
    var tot = { n: 0, k: 0 }, sel = { n: 0, k: 0 }, memo = (opt && opt.memo) || {};
    var st = function (i) { if (!(i in memo)) memo[i] = stareLa(bare, i); return memo[i]; };
    for (var i = bare.length - 1 - H; i >= ISTORIE; i -= PAS) {
      if (bare[i + H].t - bare[i].t !== H * ORA) continue;
      var r = ev(bare, i, H, st); if (r === null || r === undefined) continue;
      tot.n++; if (r === asteptat) tot.k++;
      if (stareAcum && st(i) === stareAcum) { sel.n++; if (r === asteptat) sel.k++; }
    }
    var cond = !!stareAcum && sel.n > 0 && indep(sel.n, H) >= MIN_INDEP;
    if (opt && opt.doarConditionat && !cond) return null;
    var x = cond ? sel : tot;
    if (!x.n) return null;
    var ni = indep(x.n, H), ki = Math.round(x.k / x.n * ni);
    return { p: x.k / x.n, n: x.n, k: x.k, nIndep: ni, ic: G.wilson(ki, ni), orizontOre: H, conditionat: cond, stare: cond ? stareAcum : null };
  }
  function atinge(rel) {
    return function (b, i, H) {
      var niv = b[i].c * (1 + rel);
      for (var j = i + 1; j <= i + H; j++) if (rel < 0 ? b[j].l <= niv : b[j].h >= niv) return "da";
      return "nu";
    };
  }
  // cine e atins INTAI: tinta (relT) sau stopul (relS); amandoua in aceeasi bara -> stop (pesimist)
  function cursa(relT, relS) {
    return function (b, i, H) {
      var t = b[i].c * (1 + relT), s = b[i].c * (1 + relS), sus = relT > relS;
      for (var j = i + 1; j <= i + H; j++) {
        var aS = sus ? b[j].l <= s : b[j].h >= s, aT = sus ? b[j].h >= t : b[j].l <= t;
        if (aS) return "stop";
        if (aT) return "tinta";
      }
      return "niciuna";
    };
  }
  function pentruBot(bare, o) {
    o = o || {};
    var b = pregateste(bare, o.acum), p = nr(o.pret), dir = String(o.dir || "").toLowerCase();
    if (b.length < ISTORIE + 24 * 7 || !(p > 0)) return null;
    var stare = stareLa(b, b.length - 1); if (!stare) return null;
    var memo = {}, op = { memo: memo }, rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / p - 1 : null; };
    var jos = rel(o.jos), sus = rel(o.sus), lich = rel(o.lichidare), tinta = rel(o.tinta), stop = rel(o.stop);
    var F = function (H, r) { return r === null || r === 0 ? null : frecventa(b, H, atinge(r), "da", stare, op); };
    var out = { la: nr(o.acum) || Date.now(), stare: stare, bare: b.length, niveluri: { jos: nr(o.jos), sus: nr(o.sus), lichidare: nr(o.lichidare), tinta: nr(o.tinta), stop: nr(o.stop) },
      iese: { jos24: jos !== null && jos < 0 ? F(24, jos) : null, sus24: sus !== null && sus > 0 ? F(24, sus) : null, jos72: jos !== null && jos < 0 ? F(72, jos) : null, sus72: sus !== null && sus > 0 ? F(72, sus) : null },
      lichidare7: null, cursa: null, liniste: null };
    var lung = dir === "long", scurt = dir === "short";
    if ((lung && lich !== null && lich < 0) || (scurt && lich !== null && lich > 0)) out.lichidare7 = F(168, lich);
    var cursaOk = tinta !== null && stop !== null && (lung ? tinta > 0 && stop < 0 : scurt ? tinta < 0 && stop > 0 : false);
    if (cursaOk) { var ev = cursa(tinta, stop); out.cursa = { tinta: frecventa(b, 168, ev, "tinta", stare, op), stop: frecventa(b, 168, ev, "stop", stare, op) }; }
    if (stare === "liniste") {
      var ramane = function (H) { return function (bb, i, h, st) { var s = st(i + h); return s === null ? null : s === "liniste" ? "da" : "nu"; }; };
      out.liniste = { z1: frecventa(b, 24, ramane(24), "da", "liniste", { memo: memo, doarConditionat: true }), z2: frecventa(b, 48, ramane(48), "da", "liniste", { memo: memo, doarConditionat: true }) };
    }
    return out;
  }
  return { pregateste: pregateste, stareLa: stareLa, frecventa: frecventa, atinge: atinge, cursa: cursa, pentruBot: pentruBot, ORA: ORA };
})();
```

(Task 2 adaugă calibrarea și textele în același modul și le pune în `return`.)

- [ ] **Step 4: Rulează** — Expected: `5/5 trecute`. Dacă „cursa simetrică” iese în afara lui 0,3–0,7 pe seed 7, NU schimba intervalul: verifică întâi `cursa` (ordinea stop/țintă și semnele) — pe un mers fără derivă cursa simetrică e ~0,5.
- [ ] **Step 5:** `package.json`: `test:v10046` + `&& npm run test:v10046` la capătul `test`; `npm test` → exit 0; commit local `feat(radar): Probabilitati - frecventele conditionate pe starea fisei, cursa tinta-stop (pachetul 2a, pas 1)`.

---

### Task 2: Jurnalul, judecata, calibrarea și textele (în același modul)

**Files:** Modify `public/lib/probabilitati.js`; Test `scripts/proba-v10046.mjs`

**Interfaces:**
- Produces:
  - `Probabilitati.intrari(rez, {t, bot, simbol}) → [{t, bot, simbol, tip, p, H, ev}]` — `tip` ∈ `iese-jos-24, iese-sus-24, iese-jos-72, iese-sus-72, lichidare-7, cursa-tinta, liniste-24, liniste-48`; `ev` cu prețuri ABSOLUTE: `{fel:"atinge", nivel, sus:bool}` / `{fel:"cursa", tinta, stop}` / `{fel:"liniste"}`.
  - `Probabilitati.judeca(e, bare) → 1 | 0 | null` (null = orizontul nu are încă bare complete).
  - `Probabilitati.calibreaza(intrari) → {<tip>: {cutii:[{n,k}×5]}}` (doar cele judecate, `e.r` 0/1).
  - `Probabilitati.corecteaza(p, tip, cal) → {p, brut, calibrat, n, avertizare, text}`.
  - `Probabilitati.randuri(rez, cal, dir) → [{cod, titlu, p, text, avertizare}]` și `Probabilitati.rand(rez, cal, dir) → string|null` (rândul din Consilier).

- [ ] **Step 1: Teste (picând)**:

```js
await test("jurnal: intrarile poarta preturi ABSOLUTE; judeca dupa orizont, null pana sunt bare complete", () => {
  assert.ok(typeof PB.intrari === "function", "lipseste Probabilitati.intrari");
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const rez = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 1.03, stop: p * 0.96 });
  const l = PB.intrari(rez, { t: acum, bot: "1", simbol: "X_USDT_PERP" });
  const j = l.find((e) => e.tip === "iese-jos-24"); assert.ok(j && Math.abs(j.ev.nivel - p * 0.95) < 1e-9 && j.ev.sus === false && j.H === 24);
  assert.ok(l.some((e) => e.tip === "cursa-tinta" && e.ev.tinta > p && e.ev.stop < p));
  assert.equal(PB.judeca(j, b), null, "inca n-a trecut orizontul");
  const dupa = Array.from({ length: 30 }, (_, i) => ({ t: acum + i * ORA, o: p, h: p, l: p * 0.94, c: p }));
  assert.equal(PB.judeca(j, b.concat(dupa)), 1);
  const linistit = Array.from({ length: 30 }, (_, i) => ({ t: acum + i * ORA, o: p, h: p * 1.001, l: p * 0.999, c: p }));
  assert.equal(PB.judeca(j, b.concat(linistit)), 0);
  assert.equal(PB.judeca(j, b.concat(linistit.slice(0, 10))), null, "bare incomplete -> nejudecat (colectorul oprit nu inventeaza)");
});
await test("calibrarea: zise 70%, intamplate 40% (25 de cazuri) -> cifra corectata 40% cu avertisment; sub 20 -> necalibrat", () => {
  const r = rng(9), l = Array.from({ length: 25 }, (_, i) => ({ tip: "iese-jos-24", p: 0.7, r: i < 10 ? 1 : 0 }));
  const cal = PB.calibreaza(l), c = PB.corecteaza(0.72, "iese-jos-24", cal);
  assert.equal(c.calibrat, true); assert.equal(c.p, 0.4); assert.equal(c.brut, 0.72); assert.equal(c.avertizare, true); assert.match(c.text, /40% din 25/);
  const c2 = PB.corecteaza(0.3, "iese-jos-24", cal); assert.equal(c2.calibrat, false); assert.match(c2.text, /necalibrat/);
  assert.equal(PB.calibreaza(l.concat([{ tip: "iese-jos-24", p: 0.7, r: null }]))["iese-jos-24"].cutii[3].n, 25, "nejudecatele nu se numara");
});
await test("textele: rand pentru Consilier (cursa daca exista, altfel iesirea pe partea de pierdere) cu n, independente si IC", () => {
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const rez = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 1.03, stop: p * 0.96 });
  const r = PB.rand(rez, null, "long"); assert.match(r, /ținta/); assert.match(r, /din \d+/); assert.match(r, /IC \d+–\d+%/); assert.match(r, /necalibrat/);
  const fara = PB.rand({ ...rez, cursa: null }, null, "long"); assert.match(fara, /marginea de jos/);
  const rr = PB.randuri(rez, null, "long"); assert.ok(rr.length >= 5 && rr.every((x) => x.titlu && x.text));
});
```

- [ ] **Step 2: Rulează** — Expected: cele 3 PICĂ („lipseste Probabilitati.intrari”).
- [ ] **Step 3: Implementează** (înainte de `return` în modul; adaugă numele noi în `return`):

```js
  // ---- jurnalul si calibrarea: fiecare cifra aratata se noteaza (colectorul, la 4 h pe bot) si se judeca dupa orizontul ei ----
  var TIPURI = { "iese-jos-24": ["iese", "jos24"], "iese-sus-24": ["iese", "sus24"], "iese-jos-72": ["iese", "jos72"], "iese-sus-72": ["iese", "sus72"], "lichidare-7": ["lichidare7"], "cursa-tinta": ["cursa", "tinta"], "liniste-24": ["liniste", "z1"], "liniste-48": ["liniste", "z2"] };
  function ia(rez, cale) { var x = rez; for (var i = 0; i < cale.length && x; i++) x = x[cale[i]]; return x && nr(x.p) !== null ? x : null; }
  function intrari(rez, c) {
    if (!rez || !c) return [];
    var nv = rez.niveluri || {}, out = [];
    Object.keys(TIPURI).forEach(function (tip) {
      var x = ia(rez, TIPURI[tip]); if (!x) return;
      var ev = /^iese-jos/.test(tip) ? { fel: "atinge", nivel: nv.jos, sus: false } : /^iese-sus/.test(tip) ? { fel: "atinge", nivel: nv.sus, sus: true }
        : tip === "lichidare-7" ? { fel: "atinge", nivel: nv.lichidare, sus: nv.lichidare > nv.jos } : tip === "cursa-tinta" ? { fel: "cursa", tinta: nv.tinta, stop: nv.stop } : { fel: "liniste" };
      out.push({ t: c.t, bot: String(c.bot), simbol: String(c.simbol), tip: tip, p: Math.round(x.p * 1000) / 1000, H: x.orizontOre, ev: ev });
    });
    return out;
  }
  function judeca(e, bare) {
    if (!e || !Array.isArray(bare)) return null;
    // fereastra incepe la prima ora intreaga de dupa notare (acum-ul colectorului nu cade pe ora fixa)
    var t0 = Math.ceil(e.t / ORA) * ORA, f = bare.filter(function (b) { return b.t >= t0 && b.t < t0 + e.H * ORA; });
    if (f.length < e.H || f[f.length - 1].t !== t0 + (e.H - 1) * ORA) return null;
    var v = e.ev || {};
    if (v.fel === "atinge") return f.some(function (b) { return v.sus ? b.h >= v.nivel : b.l <= v.nivel; }) ? 1 : 0;
    if (v.fel === "cursa") { var sus = v.tinta > v.stop; for (var i = 0; i < f.length; i++) { if (sus ? f[i].l <= v.stop : f[i].h >= v.stop) return 0; if (sus ? f[i].h >= v.tinta : f[i].l <= v.tinta) return 1; } return 0; }
    if (v.fel === "liniste") { var k = -1; for (var j = 0; j < bare.length; j++) if (bare[j].t === t0 + (e.H - 1) * ORA) { k = j; break; } var s = k >= 0 ? stareLa(bare, k) : null; return s === null ? null : s === "liniste" ? 1 : 0; }
    return null;
  }
  function calibreaza(l) {
    var out = {};
    (Array.isArray(l) ? l : []).forEach(function (e) {
      if (!e || (e.r !== 0 && e.r !== 1) || nr(e.p) === null) return;
      var c = out[e.tip] || (out[e.tip] = { cutii: [0, 1, 2, 3, 4].map(function () { return { n: 0, k: 0 }; }) }), i = Math.min(4, Math.floor(e.p * 5));
      c.cutii[i].n++; c.cutii[i].k += e.r;
    });
    return out;
  }
  var PC = function (v) { return Math.round(v * 100) + "%"; };
  function corecteaza(p, tip, cal) {
    var c = cal && cal[tip] && cal[tip].cutii && cal[tip].cutii[Math.min(4, Math.floor(p * 5))];
    if (!c || c.n < 20) return { p: p, brut: p, calibrat: false, n: c ? c.n : 0, avertizare: false, text: "necalibrat încă" + (c && c.n ? " (" + c.n + " judecate)" : "") };
    var q = Math.round(c.k / c.n * 1000) / 1000, mij = Math.min(4, Math.floor(p * 5)) * 20 + 10;
    return { p: q, brut: p, calibrat: true, n: c.n, avertizare: Math.abs(q - p) > 0.15, text: "calibrat: când am zis ~" + mij + "%, s-a întâmplat în " + PC(q) + " din " + c.n + " cazuri" };
  }
  function fr(x, tip, cal, cum) {
    var c = corecteaza(x.p, tip, cal);
    return { p: c.p, avertizare: c.avertizare, text: x.k + " din " + x.n + " " + (x.conditionat ? "situații ca acum" : "zile (toate; situații ca acum: prea puține)") + " (≈ " + x.nIndep + " independente, IC " + Math.round(x.ic[0] * 100) + "–" + Math.round(x.ic[1] * 100) + "%)" + (c.calibrat ? " · " + c.text + (c.avertizare ? " — ⚠ cifra brută era " + PC(c.brut) : "") : " · " + c.text), cum: cum };
  }
  function randuri(rez, cal, dir) {
    if (!rez) return [];
    var out = [], nv = rez.niveluri || {}, f = function (v) { return v === null || v === undefined ? "?" : String(Number(Number(v).toPrecision(5))); }, add = function (cod, titlu, x, tip) { if (x) { var y = fr(x, tip, cal); out.push({ cod: cod, titlu: titlu, p: y.p, avertizare: y.avertizare, text: y.text }); } };
    add("cursa", "Ținta planului (" + f(nv.tinta) + ") înaintea stopului (" + f(nv.stop) + "), în 7 zile", rez.cursa && rez.cursa.tinta, "cursa-tinta");
    add("iese-jos-24", "Atinge marginea de jos (" + f(nv.jos) + ") în 24 h", rez.iese && rez.iese.jos24, "iese-jos-24");
    add("iese-sus-24", "Atinge marginea de sus (" + f(nv.sus) + ") în 24 h", rez.iese && rez.iese.sus24, "iese-sus-24");
    add("iese-jos-72", "Atinge marginea de jos în 3 zile", rez.iese && rez.iese.jos72, "iese-jos-72");
    add("iese-sus-72", "Atinge marginea de sus în 3 zile", rez.iese && rez.iese.sus72, "iese-sus-72");
    add("lichidare", "Atinge lichidarea (" + f(nv.lichidare) + ") în 7 zile", rez.lichidare7, "lichidare-7");
    add("liniste-24", "Liniștea mai ține o zi", rez.liniste && rez.liniste.z1, "liniste-24");
    add("liniste-48", "Liniștea mai ține două zile", rez.liniste && rez.liniste.z2, "liniste-48");
    return out;
  }
  function rand(rez, cal, dir) {
    var l = randuri(rez, cal, dir), r = l.filter(function (x) { return x.cod === "cursa"; })[0] || l.filter(function (x) { return x.cod === (dir === "short" ? "iese-sus-24" : "iese-jos-24"); })[0];
    return r ? "🎲 " + r.titlu.replace(/^Ținta/, "ținta").replace(/^Atinge/, "atinge") + ": " + Math.round(r.p * 100) + "% — " + r.text : null;
  }
```

- [ ] **Step 4: Rulează** — Expected: `8/8 trecute`. `npm test` → exit 0; commit local `feat(radar): Probabilitati - jurnalul, judecata, calibrarea si textele (pachetul 2a, pas 2)`.

---

### Task 3: Rutele `prob` și `calibrare` pe serverul de acasă

**Files:** Modify `functions/api/istoric-bot.js`; Test `scripts/proba-v10046.mjs`

**Interfaces:** `GET action=prob&bot=<id> → {bot, prob}`; `POST action=prob {bot, rez}` (cel mult 16 KB, obiect) → KV `prob:<bot>`; `GET action=calibrare → {calibrare}`; `POST action=calibrare {la, cal}` → KV `calibrare` (cel mult 40 de tipuri, cutii de 5 `{n,k}` numere ≥ 0).

- [ ] **Step 1: Test (picând)** — cu `onRequestPost` / `onRequestGet` și KV fals, ca în `proba-v10045` (R14): scrie `prob` pentru botul `2394`, citește-l înapoi `deepEqual`; scrie `calibrare` cu `{ "iese-jos-24": { cutii: [{n:1,k:0},{n:0,k:0},{n:0,k:0},{n:25,k:10},{n:0,k:0}] } }` și citește-o; `calibrare` cu `cutii` de 4 ⇒ 400; `prob` cu un corp de 20 KB ⇒ 413 sau 400.
- [ ] **Step 2:** Expected: PICĂ („Unsupported action”).
- [ ] **Step 3:** GET, lângă `profil`:

```js
  if(action==="prob"){const bot=idBot(u.searchParams.get("bot"));if(!bot)return json({error:"Lipseste bot"},400);let p=null;try{p=JSON.parse(await env.ISTORIC.get("prob:"+bot)||"null")}catch{p=null}return json({bot,prob:p})}
  if(action==="calibrare"){let c=null;try{c=JSON.parse(await env.ISTORIC.get("calibrare")||"null")}catch{c=null}return json({calibrare:c})}
```

POST, înainte de `profil`:

```js
  // v100.46 (pachetul 2a): probabilitatile botului (colectorul, o data pe ora) si calibrarea lor
  if(action==="prob"){
    const bot=idBot(corp&&corp.bot),rez=corp&&corp.rez;if(!bot||!rez||typeof rez!=="object")return json({error:"Lipseste bot sau rez"},400);
    const s=JSON.stringify(rez);if(s.length>16384)return json({error:"rez prea mare"},413);
    await env.ISTORIC.put("prob:"+bot,s);return json({ok:true});
  }
  if(action==="calibrare"){
    const c=corp&&corp.cal;if(!c||typeof c!=="object")return json({error:"Lipseste cal"},400);
    const out={};for(const k of Object.keys(c).slice(0,40)){const t=String(k).replace(/[^a-z0-9-]/g,"").slice(0,24),x=c[k];
      if(!t||!x||!Array.isArray(x.cutii)||x.cutii.length!==5||!x.cutii.every(q=>q&&nr(q.n)>=0&&nr(q.k)>=0&&nr(q.k)<=nr(q.n)))return json({error:"cutii nevalide: "+t},400);
      out[t]={cutii:x.cutii.map(q=>({n:nr(q.n),k:nr(q.k)}))}}
    await env.ISTORIC.put("calibrare",JSON.stringify({la:nr(corp.la)||Date.now(),cal:out}));return json({ok:true});
  }
```

(GET întoarce obiectul întreg `{la, cal}` sub `calibrare`.)
- [ ] **Step 4:** Expected: `9/9`. `npm test` → exit 0; commit `feat(radar): rutele prob si calibrare (pachetul 2a, pas 3)`.

---

### Task 4: Colectorul — o dată pe oră pe bot, jurnalul și calibrarea

**Files:** Create `scripts/lib/tura-probabilitati.mjs`; Modify `scripts/colector.mjs` (încarcă `Probabilitati`; `turaProbabilitati` în `bucla()`; `VERSIUNE_COLECTOR = "v101.27"`; stare pe disc `data/prob-jurnal.json`); Test `scripts/proba-v10046.mjs`

**Interfaces:**
- Consumes: `aduOre` din `tura-profil.mjs` (Task 3 al pachetului 1), `Probabilitati.*` (Task 1–2), `TabloExtra.pretTintaPentru(b, T)`, `TabloExtra.pretOpritorPentru(b, T)`, câmpurile botului `pretCurent, directie, gridJos, gridSus, lichidareJos, lichidareSus, opritorPierdereActiv, opritorPierdere`.
- Produces: `turaProbabilitati(d)`; `d = {acum, boti, simbolDe(b), planDe(id) async, cere, trimite, citesteBare, scrieBare, GridCalcul, Probabilitati, TabloExtra, stare:{la:{}, jurnal:[]}, scrieStare, pauza, jurnal}`.

- [ ] **Step 1: Test (picând)**:

```js
let TPR = null; try { TPR = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-probabilitati.mjs")).href); } catch { TPR = null; }
await test("colector: o data pe ora pe bot, jurnalul la 4 h, judecata dupa orizont (fara bare -> nejudecat), curatenia la 90 de zile", async () => {
  assert.ok(TPR && typeof TPR.turaProbabilitati === "function", "lipseste scripts/lib/tura-probabilitati.mjs");
  const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
  const b = mers(200 * 24, 0.006, 5), u = b[b.length - 1], acum = u.t + ORA, rand = (x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c });
  let disc = b.map(rand); const scrise = [], stare = { jurnal: [
    { t: acum - 30 * ORA, bot: "9", simbol: "X_USDT_PERP", tip: "iese-jos-24", p: 0.4, H: 24, ev: { fel: "atinge", nivel: 1e9, sus: false } },   // orice bara e sub 1e9 -> atins
    { t: acum - 2 * ORA, bot: "9", simbol: "X_USDT_PERP", tip: "iese-jos-24", p: 0.4, H: 24, ev: { fel: "atinge", nivel: 1e-9, sus: false } },
    { t: acum - 100 * 24 * ORA, bot: "9", simbol: "X_USDT_PERP", tip: "iese-jos-24", p: 0.4, H: 24, ev: { fel: "atinge", nivel: 1e-9, sus: false } }] };
  const bot = { id: "1", baza: "X", directie: "long", pretCurent: u.c, gridJos: u.c * 0.95, gridSus: u.c * 1.05, lichidareJos: u.c * 0.7, opritorPierdereActiv: false, investit: 50, levier: 3, pozitie: 1, profitNet: 0, profitTotal: 0, brut: { buOrderData: { row: 11, gridType: "geometric" } } };
  const mk = (t) => ({ acum: t, boti: [bot], simbolDe: () => "X_USDT_PERP", planDe: async () => ({ plus: 5, minus: 10 }), cere: async () => ({ data: { klines: [] } }),
    trimite: async (cale, corp) => { scrise.push([cale, corp]); return { ok: true }; }, citesteBare: () => disc, scrieBare: (s, r) => { disc = r; },
    GridCalcul: G, Probabilitati: PB, TabloExtra: TE, stare, scrieStare: () => {}, pauza: async () => {}, jurnal: () => {} });
  await TPR.turaProbabilitati(mk(acum));
  const p1 = scrise.find(([c]) => /action=prob$/.test(c)); assert.ok(p1 && p1[1].rez && p1[1].rez.iese && p1[1].rez.iese.jos24, "prob cu iese.jos24");
  assert.ok(scrise.some(([c]) => /action=calibrare/.test(c))); assert.ok(stare.jurnal.some((e) => e.t === acum), "intrarile noi");
  assert.equal(stare.jurnal[0].r, 1, "intrarea de acum 30 h, cu barele ei pe disc, e judecata"); assert.equal(stare.jurnal[1].r, undefined, "orizont neincheiat");
  assert.ok(!stare.jurnal.some((e) => e.t === acum - 100 * 24 * ORA), "peste 90 de zile: sters");
  const n1 = scrise.length, j1 = stare.jurnal.length;
  await TPR.turaProbabilitati(mk(acum + 30 * 60000)); assert.equal(scrise.filter(([c]) => /action=prob$/.test(c)).length, 1, "o data pe ora");
  await TPR.turaProbabilitati(mk(acum + 2 * ORA)); assert.equal(scrise.filter(([c]) => /action=prob$/.test(c)).length, 2); assert.equal(stare.jurnal.length, j1, "jurnalul doar la 4 h");
  await TPR.turaProbabilitati(mk(acum + 4 * ORA)); assert.ok(stare.jurnal.length > j1);
});
```
- [ ] **Step 2:** Expected: PICĂ („lipseste tura-probabilitati.mjs”).
- [ ] **Step 3:** `scripts/lib/tura-probabilitati.mjs`:

```js
// v101.27 (pachetul 2a, 01.10): PROBABILITATILE din istoric pentru botii care ruleaza - o data pe ora pe bot: pagina noua de bare de
// 1 h (aduOre, incremental), Probabilitati.pentruBot cu preturile botului si ale planului -> KV prob:<bot>; la 4 h intrarile in
// jurnalul de pe disc (data/prob-jurnal.json); ce si-a incheiat orizontul se judeca din bare -> calibrarea -> KV calibrare.
import { aduOre } from "./tura-profil.mjs";
const ORA = 3600000, PASTRARE = 90 * 24 * ORA, NOTARE = 4 * ORA;
const nr = (v) => { const x = Number(v); return v === null || v === undefined || v === "" || !Number.isFinite(x) ? null : x; };
export async function turaProbabilitati(d) {
  const st = d.stare; st.la = st.la || {}; st.notat = st.notat || {}; st.jurnal = Array.isArray(st.jurnal) ? st.jurnal : [];
  let facute = 0;
  for (const b of d.boti || []) {
    if (!b || !b.id || d.acum - (st.la[b.id] || 0) < ORA) continue;
    try {
      const simbol = d.simbolDe(b); if (!simbol) continue;
      if (facute++) await d.pauza(1600);
      const randuri = await aduOre(simbol, d.citesteBare(simbol), d); d.scrieBare(simbol, randuri);
      const bare = d.GridCalcul.bare(randuri), plan = await d.planDe(b.id), dir = String(b.directie || "").toLowerCase();
      const tinta = plan && nr(plan.plus) > 0 ? d.TabloExtra.pretTintaPentru(b, nr(plan.plus)) : null;
      const stop = b.opritorPierdereActiv && nr(b.opritorPierdere) > 0 ? nr(b.opritorPierdere) : plan && nr(plan.minus) > 0 ? d.TabloExtra.pretOpritorPentru(b, -nr(plan.minus)) : null;
      const rez = d.Probabilitati.pentruBot(bare, { acum: d.acum, pret: nr(b.pretCurent), dir, jos: nr(b.gridJos), sus: nr(b.gridSus), lichidare: dir === "short" ? nr(b.lichidareSus) : nr(b.lichidareJos), tinta, stop });
      await d.trimite("/api/istoric-bot?action=prob", { bot: b.id, rez: rez || { la: d.acum, gol: "puțin istoric de 1 h pe moneda asta" } });
      st.la[b.id] = d.acum;
      if (rez && d.acum - (st.notat[b.id] || 0) >= NOTARE) { st.jurnal.push(...d.Probabilitati.intrari(rez, { t: d.acum, bot: b.id, simbol })); st.notat[b.id] = d.acum; }
    } catch (e) { d.jurnal("probabilitati ESEC", b.id, e.message); }
  }
  // judecata: ce si-a incheiat orizontul, din barele de pe disc (fara bare complete -> ramane nejudecat)
  const peSimbol = {};
  for (const e of st.jurnal) {
    if (e.r === 0 || e.r === 1 || d.acum < e.t + e.H * ORA) continue;
    const bare = peSimbol[e.simbol] || (peSimbol[e.simbol] = d.GridCalcul.bare(d.citesteBare(e.simbol)));
    const r = d.Probabilitati.judeca(e, bare); if (r === 0 || r === 1) e.r = r;
  }
  st.jurnal = st.jurnal.filter((e) => d.acum - e.t < PASTRARE);
  d.scrieStare(st);
  if (facute) await d.trimite("/api/istoric-bot?action=calibrare", { la: d.acum, cal: d.Probabilitati.calibreaza(st.jurnal) });
}
```

- [ ] **Step 4:** în `scripts/colector.mjs`:
  - `import { turaProbabilitati as turaProbabilitatiModul } from "./lib/tura-probabilitati.mjs";`
  - `const Probabilitati = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "probabilitati.js"), "utf8") + "; return Probabilitati;")(GridCalcul);` + în lista probei de încărcare;
  - `const VERSIUNE_COLECTOR = "v101.27";`
  - lângă `turaProfil`:

```js
// v101.27 (pachetul 2a): probabilitatile botilor activi, o data pe ora pe bot; jurnalul pe disc, calibrarea in KV
const PROB_FIS = path.join(DATA, "prob-jurnal.json");
let probStare = {}; try { probStare = JSON.parse(fs.readFileSync(PROB_FIS, "utf8")) || {}; } catch { probStare = {}; }
let probInLucru = false;
async function turaProbabilitati() {
  if (probInLucru) return; probInLucru = true;
  try {
    const act = await cere("/api/bot-orders");
    await turaProbabilitatiModul({ acum: Date.now(), boti: ((act && act.bots) || []).filter((b) => b && b.activ !== false), GridCalcul, Probabilitati, TabloExtra, cere, trimite, jurnal, stare: probStare,
      simbolDe: (b) => TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex,
      planDe: async (id) => { try { const p = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(id)); return p && p.plan && !p.plan.proba ? p.plan : null; } catch { return null; } },
      citesteBare: (s) => { try { return JSON.parse(fs.readFileSync(fisOre(s), "utf8")); } catch { return []; } },
      scrieBare: (s, r) => { try { scrieAtomic(fisOre(s), r); } catch (e) { jurnal("bare 1h nescrise", s, e.message); } },
      scrieStare: (st) => { try { scrieAtomic(PROB_FIS, st); } catch (e) { jurnal("prob-jurnal nescris", e.message); } },
      pauza: (ms) => new Promise((r) => setTimeout(r, ms)) });
  } catch (e) { jurnal("probabilitati ESEC", e.message); }
  probInLucru = false;
}
```

  - în `bucla()`, după `turaProfil()`: `turaProbabilitati().catch((e) => jurnal("probabilitati", e.message));   // v101.27 (pachetul 2a)`

  `aduOre` cere `d.GridCalcul`, `d.cere`, `d.acum`, `d.pauza` — toate sunt în obiect. Atenție: `aduOre` aruncă barele de pe disc dacă nu ajung la 6 luni ⇒ pentru o monedă fără profil încă (bot pornit azi) face umplerea întreagă — e corect (o dată), nu o repara aici.
- [ ] **Step 5:** `node scripts/proba-v10046.mjs` → `10/10`; `COLECTOR_DOAR_INCARCA=1 node scripts/colector.mjs` → `INCARCAT true`; `npm test` → exit 0; commit `feat(colector): probabilitatile botilor activi o data pe ora, jurnalul si calibrarea (v101.27, pachetul 2a, pas 4)`.

---

### Task 5: Tabloul — secțiunea „🎲 Probabilitățile din istoric” + rândul din Consilier

**Files:** Modify `public/index.html` (secțiunea nouă înaintea `<details class="tbPl" id="tbPl-plan">`, scriptul `probabilitati.js` după `profil-moneda.js`), `public/sw.js` (APP_SHELL), `public/app.js` (aducerea + desenarea + rândul în `tbConsHtml`), `public/app.css` (`.tbProbRand`, `.tbProbP`); Test `scripts/proba-v10046.mjs`

- [ ] **Step 1: Test (picând)** — static + pur:

```js
await test("Tablou: sectiunea probabilitatilor (ascunsa fara server), adusa din prob + calibrare, randul in Consilier", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), sw = fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8");
  assert.match(html, /<details class="tbPl" id="tbPl-prob" hidden>/); assert.match(html, /<div id="tbProb"><\/div>/);
  assert.match(html, /<script src="\/lib\/probabilitati\.js"><\/script>/); assert.match(sw, /"\/lib\/probabilitati\.js"/);
  assert.match(app, /action=prob&bot=/); assert.match(app, /action=calibrare/); assert.match(app, /Probabilitati\.randuri\(/); assert.match(app, /Probabilitati\.rand\(/);
});
```

- [ ] **Step 2:** Expected: PICĂ.
- [ ] **Step 3: index.html**, înaintea `<details class="tbPl" id="tbPl-plan">`:

```html
<details class="tbPl" id="tbPl-prob" hidden><summary><b>🎲 Probabilitățile din istoric</b><span class="tbSub" id="tbProbSub">cât de des s-a întâmplat, în situații ca acum</span></summary><div id="tbProb"></div></details>
```

și `<script src="/lib/probabilitati.js"></script>` imediat după `<script src="/lib/profil-moneda.js"></script>`. `sw.js`: `"/lib/probabilitati.js"` după `"/lib/profil-moneda.js"`.

- [ ] **Step 4: app.js** — lângă `tbProfilPt`:

```js
// v100.46 (pachetul 2a): probabilitatile botului (colectorul, o data pe ora) + calibrarea lor; fara server (pagina publicata) -> ascuns
var tbProb={botId:null,la:0,rez:null,cal:null,inLucru:false};
function tbProbPt(b){
  if(!b||!b.id)return null;
  if(!tbProb.inLucru&&(tbProb.botId!==b.id||Date.now()-tbProb.la>10*60000)){tbProb.inLucru=true;
    Promise.all([getJSON("/api/istoric-bot?action=prob&bot="+encodeURIComponent(b.id)),getJSON("/api/istoric-bot?action=calibrare").catch(function(){return null})])
      .then(function(r){tbProb.rez=r[0]&&r[0].prob||null;tbProb.cal=r[1]&&r[1].calibrare&&r[1].calibrare.cal||null}).catch(function(){tbProb.rez=null;tbProb.cal=null})
      .then(function(){tbProb.botId=b.id;tbProb.la=Date.now();tbProb.inLucru=false;tbDeseneazaProb(b)})}
  return tbProb.botId===b.id?tbProb:null;
}
function tbDeseneazaProb(b){
  var card=$("tbPl-prob"),el=$("tbProb"),sub=$("tbProbSub");if(!card||!el)return;
  var t=tbProb.botId===b.id?tbProb:null,rez=t&&t.rez;
  if(!rez){card.hidden=true;return}
  card.hidden=false;
  if(rez.gol){el.innerHTML='<p class="tbSub">'+escapeHtml(rez.gol)+' — colectorul aduce barele noaptea.</p>';return}
  var l=Probabilitati.randuri(rez,t.cal,String(b.directie||"").toLowerCase());
  if(sub)sub.textContent="starea de acum: "+({liniste:"liniște","miscare-sus":"mișcare în sus","miscare-jos":"mișcare în jos"}[rez.stare]||rez.stare)+" · "+Math.round(rez.bare/24)+" zile de bare de 1 h";
  el.innerHTML=l.map(function(x){return '<div class="tbProbRand'+(x.avertizare?' tbWarn':'')+'"><span>'+escapeHtml(x.titlu)+'</span><b class="tbProbP">'+Math.round(x.p*100)+'%</b><p class="tbSub">'+escapeHtml(x.text)+'</p></div>'}).join("")
    +'<p class="tbSub">Frecvențe din trecutul monedei, nu predicții. „Independente” = ferestre care nu se suprapun; intervalul de încredere (IC) e socotit pe ele. Fiecare cifră se verifică după ce-i trece orizontul.</p>';
}
```

  — în funcția care desenează Tabloul (unde se cheamă `tbConsHtml(cons)`, lângă linia `var cons=Consiliu.alcatuieste(...)`): `var tp=tbProbPt(b);tbDeseneazaProb(b);` și, în `tbConsHtml`, după paragraful `💰` (`c.bani`), rândul: `(c.sansa?'<p class="tbSub">'+escapeHtml(c.sansa)+'</p>':'')`, cu `cons.sansa=tp&&tp.rez&&!tp.rez.gol?Probabilitati.rand(tp.rez,tp.cal,String(b.directie||"").toLowerCase()):null;` pus imediat după `var cons=Consiliu.alcatuieste(...)`.

- [ ] **Step 5: app.css**: `.tbProbRand{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:6px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.06))}.tbProbRand .tbSub{grid-column:1/-1;margin:0}.tbProbP{font-variant-numeric:tabular-nums}` (verifică numele variabilei de linie folosite în `app.css` pentru `.tbLinie` și folosește-l pe același).
- [ ] **Step 6:** `node scripts/proba-v10046.mjs` → `11/11`; `npm test` → exit 0; commit `feat(tablou): Probabilitatile din istoric pe Tablou + randul in Consilier (pachetul 2a, pas 5)`.

---

### Task 6: Versiunea, ecranul, livrarea

- [ ] **Step 1:** v100.46 în toate locurile (vezi Global Constraints); badge „v100.46 · PROBABILITĂȚILE”.
- [ ] **Step 2:** `npm test` → exit 0; `node scripts/proba-ecran-tablou.mjs` → toate ok.
- [ ] **Step 3:** repornirea colectorului (o dată) și probă că a pornit: în ~2 min `GET action=prob&bot=<botul activ>` are `iese.jos24`; `data/prob-jurnal.json` are intrări.
- [ ] **Step 4:** poze CDP pe Tablou la 1920 și 390 cu secțiunea deschisă; mă uit la ele.
- [ ] **Step 5:** commit versiunea; revizia finală (agent Opus, fresh); reparațiile cu test; `npm test && git push origin main`; memo.
