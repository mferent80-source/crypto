# Acțiunile T212, pachetul 5 — Graficul și autopsia: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** În detaliul fiecărei poziții T212 apare graficul acțiunii (bare zilnice) cu ziua obișnuită (1 zi și 5 zile), zona de valoare pe 20 de zile de bursă (cu volumul Yahoo), stopul de acum vs stopul propus și comutatoare ca la boți; în raportul de duminică, partea de acțiuni primește autopsia celor mai scumpe sfaturi greșite ale Consilierului și, doar pe ≥ 10 zile distincte cu Wilson 99% > 50%, o regulă PROPUSĂ (ipoteză).

**Architecture:** Refolosim desenul boților (`GraficBot.desen`, `Valoare.zona/pivoti`) cu trei schimbări mici, compatibile înapoi (etichete parametrizate, a doua bandă „5 zile”, `minBare` la zona de valoare) și două funcții noi pure (`GraficBot.ziObisnuitaActiune`, `GraficBot.niveluriActiune`). Pagina pune un `<div>` în detaliul poziției și îl desenează după randare (lățimea reală). Autopsia e o funcție pură nouă `Consiliu.autopsieActiuni` peste jurnalele Consilierului pe acțiuni (pachetul 3), care acum notează și starea de atunci (`ActiuniSemnale.cheieSituatie`, pachetul 4).

**Tech Stack:** JS ES5 în `public/lib/*.js` (pagină + colector prin `new Function`), colector Node `scripts/colector.mjs`, probe `scripts/proba-v1005N.mjs` în `npm test`, proba de ecran `scripts/proba-ecran-t212.mjs` (Chrome real, în afara `npm test`).

**Spec:** `docs/superpowers/specs/2026-10-01-actiuni-t212-creier-design.md` (secțiunea „Pachetul 5 — Graficul și autopsia”)

## Global Constraints

- Partea crypto NU se schimbă: graficul boților iese identic (aceleași etichete implicite: „zi obișnuită”, „POC 7 z”, „zona de valoare, 7 zile”, „(4 h)”, „stopul planului”); proba v10051 rămâne verde.
- Regula din autopsie e „ipoteză, n-am schimbat nimic” — doar text, nicio schimbare de comportament; ≥ 10 zile distincte, marginea de jos Wilson 99% (z = 2,576) a greșelilor > 50%, cost < 0 (ca la boți).
- Fără culori sau fonturi noi: stilurile existente (`.tbIntBtn`, `.tbInterval`, `.gbZona`, `.gbLeg`, `.tbSub`).
- Nimic nou în cota KV de pe Cloudflare (totul local).
- Versiunea paginii v100.56, colectorul v101.36; proba nouă `scripts/proba-v10056.mjs` în `npm test`.
- `npm test && git commit && git push` — niciodată cu `;`. Fără `git pull` în `crypto`.

## Review Focus

1. **Poziție fără profil încă** (colectorul face profilul noaptea; o acțiune cumpărată azi n-are `profil:<TK>`): graficul apare fără benzile zilei, comutatoarele „Ziua obișnuită / 5 zile” spun în legendă „profilul vine de la colector”, nu crapă. Test în Task 1 (`ziObisnuitaActiune(pret, null)` → null) și Task 2 (sursă: ramura fără profil).
2. **Sub 20 de bare / fără volum** (Twelve Data fără volum, acțiune nouă): zona de valoare pe timp („lumânările n-au volum”) sau lipsă; graficul tot apare de la 10 bare. Test în Task 1.
3. **Detaliul deschis cu clic (fără re-randare)**: graficul se desenează și la `t212Comuta`, nu doar la `t212Render`. Test în Task 2 (sursă).
4. **Jurnale vechi fără stare** (înainte de v100.56): autopsia scrie „starea de atunci: nenotată”, tiparul le sare. Test în Task 3.
5. **Aceeași zi pe mai multe acțiuni** (un IEȘI pe 5 poziții într-o zi de cădere): tiparul numără ZILE distincte, nu intrări. Test în Task 3.

---

### Task 1: Desenul — etichete parametrizate, banda de 5 zile, zona pe 20 de zile, nivelurile acțiunii

**Files:**
- Modify: `public/lib/valoare.js:18-20` (`zona`: `o.minBare`, implicit 24)
- Modify: `public/lib/grafic-bot.js` (`ziObisnuitaActiune`, `niveluriActiune` noi; în `desen`: eticheta benzii, banda `zi5`, eticheta POC/legendă zona/pivoți, eticheta stopului propus; exportul)
- Create: `scripts/proba-v10056.mjs`; Modify: `package.json` (`test:v10056` + lanțul `test`)

**Interfaces:**
- Produces:
  - `Valoare.zona(bare, {bins, procent, minBare})` — `minBare` implicit 24 (neschimbat pentru boți).
  - `GraficBot.ziObisnuitaActiune(pret, prof, zile) -> {p50Jos, p75Jos, p50Sus, p75Sus, sursa, et} | null` — `zile` 1 (din `prof.z1`) sau 5 (din `prof.z5`); `prof.z1.jos/sus` sunt 21 de cuantile (indicele 10 = P50, 15 = P75); `et` = „zi obișnuită” / „5 zile obișnuite”.
  - `GraficBot.niveluriActiune({pretMediu, stop, tinta}) -> [{k, p, t, c, st, s}]` — `k:"intrare"` („prețul tău mediu”), `k:"stop"` („stopul tău”, doar dacă e dat), `k:"tinta"` („ținta”).
  - `GraficBot.desen(o)` primește în plus: `o.zi.et`, `o.zi5` (+ `st.zi5`), `o.val.et` (scurt, implicit „7 z”), `o.val.etLung` (implicit „7 zile”), `o.val.etPivoti` (implicit „4 h”), `o.consLinii.et` (implicit „stopul planului”), `o.consLinii.etLung` (implicit „stopul planului (Consilierul)”).

- [ ] **Step 1: Proba (picând)** — `scripts/proba-v10056.mjs` cu antetul din `proba-v10055.mjs` (RAD, lib, G, SB, AS, test, are, Z), plus:

```js
const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const VA = new Function(`${lib("valoare.js")}; return Valoare;`)();
const q = (m) => Array.from({ length: 21 }, (_, i) => Math.round(m * i / 10 * 1e6) / 1e6);   // P50 = m, P75 = 1,5 m
const bareZ = (n, cuVol) => Array.from({ length: n }, (_, i) => { const c = 100 + 5 * Math.sin(i / 4); return { t: i * Z, o: c, h: c * 1.01, l: c * 0.99, c, v: cuVol ? 1000 + i : null }; });
await test("ziua obisnuita a actiunii: 1 zi din z1, 5 zile din z5; fara profil -> null", () => {
  are(GB.ziObisnuitaActiune, "GraficBot.ziObisnuitaActiune");
  const pf = { piata: "actiuni", simbol: "INTC_US_EQ", zile: 500, z1: { jos: q(0.02), sus: q(0.03) }, z5: { jos: q(0.05), sus: q(0.06) } };
  const z1 = GB.ziObisnuitaActiune(100, pf, 1), z5 = GB.ziObisnuitaActiune(100, pf, 5);
  const r2 = (x) => Math.round(x * 100) / 100;
  assert.equal(r2(z1.p50Jos), 98); assert.equal(r2(z1.p50Sus), 103); assert.equal(z1.et, "zi obișnuită");
  assert.equal(r2(z5.p50Jos), 95); assert.equal(r2(z5.p75Sus), 109); assert.equal(z5.et, "5 zile obișnuite");
  assert.match(z1.sursa, /500 de zile de bursă/);
  assert.equal(GB.ziObisnuitaActiune(100, null, 1), null);
  assert.equal(GB.ziObisnuitaActiune(100, { z1: { jos: [1], sus: [1] } }, 1), null);
});
await test("zona de valoare pe 20 de zile de bursa: minBare; fara volum -> dupa timp; implicit tot 24 (botii neschimbati)", () => {
  assert.equal(VA.zona(bareZ(20, true), {}), null, "implicit: sub 24 -> null, ca pana acum");
  const z = VA.zona(bareZ(20, true), { minBare: 15, bins: 24 }); assert.ok(z && z.dupa === "volum", JSON.stringify(z));
  assert.equal(VA.zona(bareZ(20, false), { minBare: 15, bins: 24 }).dupa, "timp");
  assert.equal(VA.zona(bareZ(12, true), { minBare: 15 }), null);
});
await test("desen: banda de 5 zile doar cu comutatorul, etichetele actiunii (20 z, zilnic, stopul propus); botii pastreaza etichetele vechi", () => {
  are(GB.niveluriActiune, "GraficBot.niveluriActiune");
  const bare = bareZ(60, true), pf = { zile: 500, z1: { jos: q(0.02), sus: q(0.03) }, z5: { jos: q(0.05), sus: q(0.06) } };
  const niv = GB.niveluriActiune({ pretMediu: 101, stop: 96, tinta: 110 });
  assert.deepEqual(niv.map((x) => x.k), ["tinta", "intrare", "stop"]);
  const baza = { bare, W: 800, niv, zi: GB.ziObisnuitaActiune(100, pf, 1), zi5: GB.ziObisnuitaActiune(100, pf, 5),
    val: { zona: VA.zona(bare.slice(-20), { minBare: 15, bins: 24 }), pivoti: [], et: "20 z", etLung: "20 de zile de bursă", etPivoti: "zilnic" },
    consLinii: { stopAcum: 96, stopPlan: 97, et: "stopul propus", etLung: "stopul propus (din profilul acțiunii)" } };
  const cu = GB.desen({ ...baza, st: { zi: true, zi5: true, val: true } }), fara = GB.desen({ ...baza, st: { zi: true, zi5: false, val: true } });
  assert.match(cu.svg, /class="gbZi5"/); assert.ok(!/class="gbZi5"/.test(fara.svg));
  assert.match(cu.svg, /POC 20 z/); assert.match(cu.legenda, /20 de zile de bursă/); assert.match(cu.svg, /stopul propus/); assert.match(cu.legenda, /5 zile de bursă obișnuite/);
  const bot = GB.desen({ bare, W: 800, niv: [], st: { zi: true, val: true }, zi: GB.ziObisnuita(100, { z24: { jos: q(0.02), sus: q(0.02) }, zile: 185 }),
    val: { zona: VA.zona(bareZ(30, true), {}), pivoti: [] }, consLinii: { stopAcum: 90, stopPlan: 95 } });
  assert.match(bot.svg, />zi obișnuită</); assert.match(bot.svg, /POC 7 z/); assert.match(bot.legenda, /zona de valoare, 7 zile/); assert.match(bot.legenda, /stopul planului \(Consilierul\)/);
});
```

`package.json`: `"test:v10056": "node scripts/proba-v10056.mjs"` și ` && npm run test:v10056` după `test:v10055`.

- [ ] **Step 2: Rulează** — `node scripts/proba-v10056.mjs` · Expected: FAIL „lipseste GraficBot.ziObisnuitaActiune”.

- [ ] **Step 3: Implementează**
  - `valoare.js` linia 20: `if (b.length < (nr(o.minBare) > 0 ? nr(o.minBare) : 24)) return null;` (comentariu: `// v100.56: actiunile - zona pe 20 de zile de bursa (bare zilnice)`).
  - `grafic-bot.js`, după `ziObisnuita`:
    ```js
    // v100.56 (actiunile T212, pachetul 5): ziua obisnuita a ACTIUNII - 1 zi (z1) sau 5 zile de bursa (z5), din profilul ei (bare zilnice)
    function ziObisnuitaActiune(pret, p, zile) {
      pret = nr(pret); var z = p && (zile === 5 ? p.z5 : p.z1), j = z && z.jos, s = z && z.sus;
      if (pret === null || !(pret > 0) || !Array.isArray(j) || j.length !== 21 || !Array.isArray(s) || s.length !== 21) return null;
      return { p50Jos: pret * (1 - j[10]), p75Jos: pret * (1 - j[15]), p50Sus: pret * (1 + s[10]), p75Sus: pret * (1 + s[15]), et: zile === 5 ? "5 zile obișnuite" : "zi obișnuită",
        sursa: (zile === 5 ? "5 zile de bursă obișnuite" : "ziua obișnuită") + " a acțiunii: " + (nr(p.zile) !== null ? p.zile + " de zile de bursă" : "profilul") + " (bare zilnice)" };
    }
    // nivelurile pozitiei pe grafic: tinta, pretul tau mediu, stopul tau (doar daca l-ai scris)
    function niveluriActiune(o) {
      var l = [], ad = function (k, p, t, c, st, s) { p = nr(p); if (p !== null && p > 0) l.push({ k: k, p: p, t: t, c: c, st: st, s: s }); };
      ad("tinta", o && o.tinta, "ținta", COL.good, "dash", "țintă");
      ad("intrare", o && o.pretMediu, "prețul tău mediu", COL.intrare, "dash", "mediu");
      ad("stop", o && o.stop, "stopul tău", COL.bad, "solid", "stop");
      return l;
    }
    ```
  - În `desen`:
    - eticheta benzii (linia ~179): `>zi obișnuită<` → `>' + esc(o.zi.et || "zi obișnuită") + '<`.
    - imediat după blocul `if (st.zi && o.zi) { ... }`, banda de 5 zile (doar linii, ca să nu acopere banda zilei):
      ```js
      // v100.56: 5 zile obisnuite (actiuni) - doar liniile P50 (plin) si P75 (punctat), alta nuanta decat ziua
      if (st.zi5 && o.zi5) {
        var zx5 = plotW * (1 - (ingust ? 0.25 : 0.18));
        [["p50Sus", ""], ["p50Jos", ""], ["p75Sus", "2 3"], ["p75Jos", "2 3"]].forEach(function (k) { var v = nr(o.zi5[k[0]]); if (v !== null && v > lo && v < hi) q.push('<line class="gbZi5" x1="' + f1(zx5) + '" x2="' + f1(plotW) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '" stroke="' + COL.info + '" stroke-opacity=".7"' + (k[1] ? ' stroke-dasharray="' + k[1] + '"' : '') + '/>'); });
        var s5 = nr(o.zi5.p50Sus); if (s5 !== null && s5 > lo && s5 < hi) q.push('<text class="gbZi5" x="' + f1(zx5 + 4) + '" y="' + f1(Math.max(11, Y(s5) - 4)) + '" font-size="10" fill="' + COL.info + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="3">5 zile</text>');
      }
      ```
    - POC: `'">POC 7 z '` → `'">POC ' + esc(o.val.et || "7 z") + ' '`.
    - stopul planului (liniile ~230–231): `var etP = cl.et || "stopul planului";` imediat după `var cl = o.consLinii || {}, ...;`, iar cele două `"stopul planului"` din `et.push`/`afara.push` → `etP`.
    - legenda: `stopul planului (Consilierul)` → `' + esc(cl.etLung || "stopul planului (Consilierul)") + '`; `zona de valoare, 7 zile` → `zona de valoare, ' + esc(o.val.etLung || "7 zile") + '`; `confirmați (4 h)` → `confirmați (' + esc(o.val.etPivoti || "4 h") + ')`; după linia legendei `st.zi && o.zi` adaugă `if (st.zi5 && o.zi5) Lg.push('<span><i style="border-color:' + COL.info + '"></i>' + esc(o.zi5.sursa || "5 zile obișnuite") + ': jumătate din săptămâni (plin) / trei sferturi (punctat)</span>');`.
    - În legenda `ziua obișnuită de la prețul de acum ...`, partea fixă rămâne (boți) — sursa vine deja din `o.zi.sursa`.
  - Export: `ziObisnuitaActiune: ziObisnuitaActiune, niveluriActiune: niveluriActiune`.
  - `COL.info` există deja (e culoarea „info” din legendă) — nicio culoare nouă.

- [ ] **Step 4: Rulează** — `node scripts/proba-v10056.mjs` · Expected: 3/3; `npm test` verde (v10051 — graficul boților — rămâne verde).

- [ ] **Step 5: Commit** — `npm test && git add public/lib/valoare.js public/lib/grafic-bot.js scripts/proba-v10056.mjs package.json && git commit -m "feat(actiuni): pachetul 5 - desenul: ziua si 5 zile ale actiunii, zona pe 20 de zile, etichetele parametrizate (botii neschimbati)"`

---

### Task 2: Graficul în detaliul poziției T212, cu comutatoare

**Files:**
- Modify: `public/lib/t212-ecran.js` (`t212RandPozitie` ~354: `<div class="t212Graf" id="t212Graf-TK">` la capătul detaliului; funcții noi `t212IndStare`, `t212ComutaInd`, `t212GraficHtml`, `t212GraficeDeseneaza`; chemarea în `t212Render` și `t212Comuta`)
- Modify: `public/app.css` (`.t212Graf` — margine sus și lățime 100%, refolosind `.gbZona`/`.gbLeg`)
- Test: `scripts/proba-v10056.mjs`

**Interfaces:**
- Consumes: `GraficBot.desen/ziObisnuitaActiune/niveluriActiune`, `Valoare.zona/pivoti` (Task 1); `t212.bare[tk]` (bare zilnice cu `v`), `t212ProfilPt(tk)`, `p.niv.stopPozitie` (stopul propus), `p.plan`.
- Produces: `t212IndStare() -> {bb, ema, rsi, vp, zi, zi5, val}` (localStorage `t212Ind`, implicit: bb false, ema true, rsi false, vp false, zi true, zi5 true, val true); `t212GraficHtml(p, W) -> {svg, legenda} | null` (sub 10 bare: null).

- [ ] **Step 1: Test (picând)**:

```js
await test("pagina T212: graficul in detaliul pozitiei - comutatoare proprii (t212Ind), 120 de bare zilnice, zona pe 20 de zile, stopul de acum vs propus; desenat si la deschiderea cu clic", () => {
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  const corp = (nume) => { const i = e.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); const j = e.indexOf("\nfunction ", i + 10); return e.slice(i, j < 0 ? e.length : j); };
  for (const f of ["t212IndStare", "t212ComutaInd", "t212GraficHtml", "t212GraficeDeseneaza"]) assert.ok(new RegExp("function " + f + "\\(").test(e), "lipseste " + f);
  assert.ok(/localStorage\.getItem\("t212Ind"\)/.test(e), "starea comutatoarelor separata de boti");
  assert.ok(/slice\(-120\)/.test(e) && /slice\(-20\)/.test(e) && /minBare: 15/.test(e), "120 de bare pe grafic, zona pe ultimele 20");
  assert.ok(/ziObisnuitaActiune\([^)]*, 1\)/.test(e) && /ziObisnuitaActiune\([^)]*, 5\)/.test(e));
  assert.ok(/stopPlan: [^,]*stopPozitie/.test(e), "stopul propus = stopul care urca calculat");
  assert.ok(/id="t212Graf-' \+ tk \+ '"/.test(e), "locul graficului in detaliu");
  assert.ok(/t212GraficeDeseneaza\(\)/.test(corp("t212Comuta")), "desenat si la deschiderea cu clic");
  assert.ok(/t212GraficeDeseneaza\(\)/.test(corp("t212Render")), "desenat la randare");
  assert.ok(/profilul vine de la colector/.test(e), "fara profil: spune de ce lipsesc benzile");
});
```

- [ ] **Step 2: Rulează** — Expected: FAIL „lipseste t212IndStare”.

- [ ] **Step 3: Implementează** în `t212-ecran.js` (lângă `t212ProbListaHtml`):

```js
// v100.56 (actiunile T212, pachetul 5): graficul actiunii in detaliul pozitiei - desenul botilor pe bare zilnice; comutatoarele au starea lor
var T212_IND = [["zi", "Ziua obișnuită", "Cât coboară și cât urcă acțiunea într-o zi obișnuită, de la prețul de acum (profilul ei)"], ["zi5", "5 zile", "Cât se mișcă într-o săptămână de bursă obișnuită"],
  ["val", "Zona de valoare", "Unde s-a tranzacționat 70% din volum în ultimele 20 de zile de bursă + suporturi/rezistențe confirmate"], ["ema", "EMA", "EMA 20 și 50"], ["bb", "Bollinger", "Bollinger 20, 2"], ["vp", "Volum la preț", "Profilul de volum"], ["rsi", "RSI", "RSI 14"]];
function t212IndStare() {
  var d = { bb: false, ema: true, rsi: false, vp: false, zi: true, zi5: true, val: true };
  try { var v = JSON.parse(localStorage.getItem("t212Ind") || "null"); if (v && typeof v === "object") for (var k in d) if (typeof v[k] === "boolean") d[k] = v[k]; } catch (e) {}
  return d;
}
function t212ComutaInd(k) {
  var s = t212IndStare(); if (!Object.prototype.hasOwnProperty.call(s, k)) return; s[k] = !s[k];
  try { localStorage.setItem("t212Ind", JSON.stringify(s)); } catch (e) {}
  t212GraficeDeseneaza();
}
function t212GraficHtml(p, W) {
  var b = (t212.bare[p.ticker] || []).slice(-120); if (b.length < 10 || typeof GraficBot === "undefined") return null;
  var pf = t212ProfilPt(p.ticker), n = p.niv, pl = p.plan || {}, VA = typeof Valoare !== "undefined" ? Valoare : null;
  var stopAcum = pl.stop > 0 ? pl.stop : pl.trailPct > 0 && p.maxDupaCumparare ? p.maxDupaCumparare * (1 - pl.trailPct / 100) : null;
  return GraficBot.desen({ bare: b, W: W, ingust: W < 560, st: t212IndStare(),
    niv: GraficBot.niveluriActiune({ pretMediu: p.pretMediu, stop: stopAcum, tinta: pl.tinta > 0 ? pl.tinta : n ? n.tintaPozitie : null }),
    zi: GraficBot.ziObisnuitaActiune(p.pret, pf, 1), zi5: GraficBot.ziObisnuitaActiune(p.pret, pf, 5),
    val: VA ? { zona: VA.zona(b.slice(-20), { minBare: 15, bins: 24 }), pivoti: VA.pivoti(b, 3), et: "20 z", etLung: "20 de zile de bursă", etPivoti: "zilnic" } : null,
    consLinii: n ? { stopAcum: stopAcum, stopPlan: n.stopPozitie, et: "stopul propus", etLung: "stopul propus (" + (n.sursaTrail ? "din profilul acțiunii" : "−" + n.trailPct.toFixed(1).replace(".", ",") + "% de la maxim") + ")" } : null });
}
function t212GraficeDeseneaza() {
  (t212.pozPregatite || []).forEach(function (p) {
    var el = $("t212Graf-" + p.ticker); if (!el || !t212.deschis[p.ticker]) return;
    var W = Math.round(el.getBoundingClientRect().width || el.clientWidth || 700), d = t212GraficHtml(p, Math.max(300, W)), s = t212IndStare();
    if (!d) { el.innerHTML = '<p class="tbSub">Graficul apare după ce vin prețurile zilnice (cel puțin 10 zile).</p>'; return; }
    var faraProfil = !t212ProfilPt(p.ticker);
    el.innerHTML = '<div class="tbInterval tbGrInd" role="group" aria-label="Indicatorii graficului ' + escapeHtml(p.simbol) + '">' + T212_IND.map(function (x) { return '<button type="button" class="tbIntBtn" aria-pressed="' + !!s[x[0]] + '" title="' + escapeHtml(x[2]) + '" data-action-click="t212ComutaInd(\'' + x[0] + '\')">' + escapeHtml(x[1]) + '</button>'; }).join("") + '</div>'
      + '<div class="gbZona">' + d.svg + '</div>'
      + (faraProfil && (s.zi || s.zi5) ? '<p class="tbSub">Ziua și cele 5 zile obișnuite apar când profilul vine de la colector (îl face noaptea).</p>' : '')
      + '<div class="gbLeg">' + d.legenda + '</div>';
  });
}
```

  - `t212RandPozitie`: la capătul detaliului, `'<div class="t212DetGrila">' + stanga + dreapta + '</div>'` → `'<div class="t212DetGrila">' + stanga + dreapta + '</div><div class="t212Graf" id="t212Graf-' + tk + '"></div>'`.
  - `t212Render`: imediat după `poz.map(t212RandPozitie).join("") + '</tbody></table></div>';` adaugă `t212GraficeDeseneaza();` pe rândul următor (în aceeași ramură `else`).
  - `t212Comuta`: la capăt (după schimbarea `hidden`), `if (t212.deschis[tk]) t212GraficeDeseneaza();`.
  - `app.css`: `.t212Graf{margin-top:12px;width:100%}.t212Graf .tbGrInd{margin-bottom:6px;flex-wrap:wrap}` (cu comentariul `/* v100.56 (actiunile T212, pachetul 5): graficul actiunii in detaliu - stilurile graficului botilor */`).

- [ ] **Step 4: Rulează** — proba 4/4; `npm test` verde.

- [ ] **Step 5: Commit** — `npm test && git add public/lib/t212-ecran.js public/app.css scripts/proba-v10056.mjs && git commit -m "feat(actiuni): graficul actiunii in detaliul pozitiei - ziua si 5 zile, zona pe 20 de zile, stopul de acum vs propus, comutatoare"`

---

### Task 3: Autopsia sfaturilor greșite pe acțiuni în raportul de duminică

**Files:**
- Modify: `public/lib/consiliu.js` (`noteazaActiune(j, c, pret, qty, fx, acum, extra)` păstrează `extra.stare`; `autopsieActiuni(loguri, acum)` nouă; exportul)
- Modify: `scripts/colector.mjs` (~752: `noteazaActiune(..., Date.now(), { stare: ActiuniSemnale.cheieSituatie(st) })`; `turaSocotealaActiuni` ține `jurnaleActLoguri = [{ticker, log}]`; `turaRaport` ~997: adaugă liniile autopsiei după `raportSaptamana`)
- Test: `scripts/proba-v10056.mjs`

**Interfaces:**
- Consumes: jurnalul Consilierului pe acțiuni (pachetul 3): intrări `{t, coduri, nivel, pret, qty, fx, r, bani, inLei, c5, stare?}`; `ActiuniSemnale.cheieSituatie` (pachetul 4).
- Produces: `Consiliu.autopsieActiuni(loguri, acum) -> { scumpe: [{ticker, nivel, coduri, t, stare, pret, c5, cost, inLei}] (≤ 3, r === 0, cost < 0, judecate în ultimele 7 zile), tipar: {cod, stare, gresite, judecate, cost, text} | null, linii: [string] }`.

- [ ] **Step 1: Test (picând)**:

```js
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();
await test("noteazaActiune pastreaza starea de atunci; jurnalele vechi raman fara ea", () => {
  const c = { nivel: "iesi", motive: [{ cod: "trend-jos" }] };
  assert.equal(CS.noteazaActiune([], c, 10, 1, null, 1000, { stare: "jos|calm|departe" })[0].stare, "jos|calm|departe");
  assert.ok(!("stare" in CS.noteazaActiune([], c, 10, 1, null, 1000)[0]));
});
await test("autopsia pe actiuni: cele mai scumpe 3 sfaturi gresite ale saptamanii (starea de atunci, ce a urmat); tiparul pe ZILE distincte, Wilson 99% > 50%, ipoteza", () => {
  are(CS.autopsieActiuni, "Consiliu.autopsieActiuni");
  const acum = 60 * Z, e = (zi, nivel, cod, bani, stare, r = 0) => ({ t: acum - zi * Z, coduri: [cod], nivel, pret: 10, qty: 10, fx: 4.5, r, bani, inLei: true, c5: 11, ...(stare ? { stare } : {}) });
  const intc = [e(2, "iesi", "trend-jos", -45, "jos|calm|departe"), e(3, "tine", "trend-sus", -20), e(4, "atentie", "miscare-jos", -5, "lateral|dupa-miscare|departe"), e(5, "iesi", "trend-jos", 30, "jos|calm|departe", 1)];
  const tip = []; for (let d = 15; d < 27; d++) tip.push(e(d, "iesi", "trend-jos", -10, "sus|calm|departe"));   // 12 zile distincte, toate gresite, in afara saptamanii
  const amd = tip.concat(tip.map((x) => ({ ...x })));   // aceleasi zile pe a doua actiune: tot 12 zile, nu 24
  const a = CS.autopsieActiuni([{ ticker: "INTC_US_EQ", log: intc }, { ticker: "AMD_US_EQ", log: amd }], acum);
  assert.deepEqual(a.scumpe.map((x) => x.cost), [-45, -20, -5]);
  const tx = a.linii.join("\n");
  assert.match(tx, /INTC/); assert.match(tx, /starea de atunci: nenotată/); assert.match(tx, /trend în jos/); assert.match(tx, /45,00 lei/);
  assert.ok(a.tipar, "tiparul trebuie gasit"); assert.equal(a.tipar.judecate, 12, "zile distincte, nu intrari"); assert.equal(a.tipar.gresite, 12);
  assert.match(a.tipar.text, /ipoteză/); assert.match(a.tipar.text, /n-am schimbat nimic/);
  const putin = CS.autopsieActiuni([{ ticker: "X_US_EQ", log: tip.slice(0, 9) }], acum);
  assert.equal(putin.tipar, null, "sub 10 zile: nicio regula"); assert.match(putin.linii.join("\n"), /Niciun tipar repetat sigur/);
  assert.match(CS.autopsieActiuni([], acum).linii.join("\n"), /Niciun sfat greșit judecat/);
});
await test("colectorul: noteaza starea, tine jurnalele pentru raport si pune autopsia in raportul de duminica", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.ok(/noteazaActiune\(j0, ch\.stare\.acum, [^;]*\{ stare: ActiuniSemnale\.cheieSituatie\(st\) \}/.test(col));
  assert.ok(/jurnaleActLoguri/.test(col) && /Consiliu\.autopsieActiuni\(jurnaleActLoguri, acum\)/.test(col));
});
```

- [ ] **Step 2: Rulează** — Expected: FAIL (stare lipsă / `autopsieActiuni` lipsă).

- [ ] **Step 3: Implementează**
  - `noteazaActiune(j, c, pret, qty, fx, acum, extra)`: în obiectul împins adaugă după construcție `if (extra && extra.stare) e.stare = String(extra.stare);` (scrie obiectul într-o variabilă `e` întâi, apoi `j.push(e)`).
  - `autopsieActiuni` (în `consiliu.js`, lângă `socotealaActiuni`):
    ```js
    // v100.56 (actiunile T212, pachetul 5): autopsia - cele mai scumpe sfaturi gresite ale saptamanii (ce a urmat in 5 zile de bursa) si tiparul
    // repetat (sfat x stare) ca regula PROPUSA: zile distincte >= 10, marginea de jos Wilson 99% a greselilor > 50%, cost < 0 - ipoteza, nimic schimbat
    var ET_ST = { sus: "trend în sus", lateral: "trend neclar", jos: "trend în jos", calm: "fără mișcare mare", "dupa-miscare": "după o mișcare mare", departe: "departe de maximul pe 7 zile", "langa-max": "lângă maximul pe 7 zile" };
    var NV_ACT = { iesi: "IEȘI", atentie: "ATENȚIE", tine: "ȚINE" };
    function etStare(s) { return s ? String(s).split("|").map(function (k) { return ET_ST[k] || k; }).join(", ") : "nenotată (sfat dinainte de 01.10)"; }
    function autopsieActiuni(loguri, acum) {
      acum = nr(acum) !== null ? nr(acum) : Date.now(); var ZI = 864e5, toate = [];
      (Array.isArray(loguri) ? loguri : []).forEach(function (L) {
        (L && Array.isArray(L.log) ? L.log : []).forEach(function (e) {
          if (!e || (e.r !== 0 && e.r !== 1) || nr(e.bani) === null || nr(e.t) === null) return;
          toate.push({ ticker: L.ticker || "?", nivel: e.nivel, coduri: e.coduri || [], t: e.t, stare: e.stare || null, pret: e.pret, c5: e.c5, cost: e.bani, inLei: !!e.inLei, gresit: e.r === 0 });
        });
      });
      var Ban = function (x) { return Math.abs(x.cost).toFixed(2).replace(".", ",") + (x.inLei ? " lei" : " $"); };
      // un sfat se judeca la 5 zile de bursa (~7 calendaristice) dupa el: „saptamana” = sfaturile din ultimele 14 zile, deja judecate
      var scumpe = toate.filter(function (x) { return x.gresit && x.cost < 0 && x.t > acum - 14 * ZI && x.t <= acum; }).sort(function (a, b) { return a.cost - b.cost; }).slice(0, 3);
      var linii = scumpe.length ? scumpe.map(function (x) {
        return (NV_ACT[x.nivel] || x.nivel) + " pe " + String(x.ticker).split("_")[0] + " (" + new Date(x.t).toISOString().slice(5, 10).split("-").reverse().join(".") + ", motive: " + x.coduri.join(", ") + "): starea de atunci: " + etStare(x.stare)
          + "; în 5 zile de bursă prețul a mers de la $" + x.pret + " la $" + x.c5 + " — urmat, te-ar fi costat " + Ban(x) + ".";
      }) : ["Niciun sfat greșit judecat pe acțiuni săptămâna asta."];
      var gr = {};
      toate.forEach(function (x) {
        if (!x.stare || !(x.t > acum - 30 * ZI && x.t <= acum)) return;
        x.coduri.forEach(function (cod) {
          var k = cod + "|" + x.stare, g = gr[k] || (gr[k] = { cod: cod, stare: x.stare, zile: {}, cost: 0, inLei: x.inLei }), d = Math.floor(x.t / ZI), z = g.zile[d] || (g.zile[d] = { g: 0, b: 0 });
          if (x.gresit) { z.g++; g.cost += x.cost; } else z.b++;
        });
      });
      var wJos = function (k, n, zz) { var p = k / n, a = zz * zz; return (p + a / (2 * n) - zz * Math.sqrt(p * (1 - p) / n + a / (4 * n * n))) / (1 + a / n); };
      var tip = Object.keys(gr).map(function (k) { var g = gr[k], z = Object.keys(g.zile).map(function (d) { return g.zile[d]; }); return { cod: g.cod, stare: g.stare, judecate: z.length, gresite: z.filter(function (q) { return q.g > q.b; }).length, cost: Math.round(g.cost * 100) / 100, inLei: g.inLei }; })
        .filter(function (g) { return g.judecate >= 10 && wJos(g.gresite, g.judecate, 2.576) > 0.5 && g.cost < 0; })
        .sort(function (a, b) { return a.cost - b.cost; })[0] || null;
      if (tip) {
        tip.text = "Regulă propusă pe acțiuni (ipoteză, n-am schimbat nimic): motivul „" + tip.cod + "” în starea „" + etStare(tip.stare) + "” a greșit în " + tip.gresite + " din " + tip.judecate + " zile, în ultimele 30 (" + Ban(tip) + " dacă-l urmai) — l-aș trata ca „încă nu știm” în starea asta. Spune-mi dacă vrei regula.";
        linii.push(tip.text);
      } else linii.push("Niciun tipar repetat sigur încă pe acțiuni (trebuie cel puțin 10 zile judecate ale aceluiași motiv în aceeași stare, cu greșeala clar peste jumătate).");
      return { scumpe: scumpe, tipar: tip, linii: ["Autopsia săptămânii pe acțiuni — sfaturile Consilierului care te-ar fi costat cel mai mult:"].concat(linii) };
    }
    ```
    Export: `autopsieActiuni: autopsieActiuni`.
  - `colector.mjs`:
    - ~752: `Consiliu.noteazaActiune(j0, ch.stare.acum, p.pret, p.qty, fx, Date.now(), { stare: ActiuniSemnale.cheieSituatie(st) })`.
    - lângă `let socotealaAct` (declarația modulului): `let jurnaleActLoguri = [];   // v101.36: jurnalele Consilierului pe actiuni, pentru autopsia din raport`.
    - în `turaSocotealaActiuni`: `jurnale.push(j)` → `jurnale.push(j); logActNou.push({ ticker: tk, log: j });` cu `const logActNou = []` lângă `jurnale = []`, iar după bucla `for`: `jurnaleActLoguri = logActNou;`.
    - `turaRaport`, după linia cu `ActiuniSemnale.raportSaptamana(...)`: `rap.linii = rap.linii.concat(Consiliu.autopsieActiuni(jurnaleActLoguri, acum).linii);` (în același `try`).

- [ ] **Step 4: Rulează** — proba 7/7; `npm test` verde.

- [ ] **Step 5: Commit** — `npm test && git add public/lib/consiliu.js scripts/colector.mjs scripts/proba-v10056.mjs && git commit -m "feat(actiuni): autopsia sfaturilor gresite pe actiuni in raportul de duminica + starea de atunci in jurnal"`

---

### Task 4: Versiunea, proba de ecran, livrarea

**Files:** `BUILD_INFO.json`, `functions/_shared/versiune.js`, `package.json`, `public/sw.js`, `public/index.html` (cele 4 locuri v100.55 → v100.56, eticheta „GRAFICUL ȘI AUTOPSIA PE ACȚIUNI”), `scripts/colector.mjs` (`VERSIUNE_COLECTOR = "v101.36"`), `scripts/proba-ecran-t212.mjs`.

- [ ] **Step 1:** Bump exact ca la v100.55 (aceleași fișiere și șiruri).
- [ ] **Step 2:** În proba de ecran, în testul „pozitiile”: deschide primul detaliu (`t212Comuta(<primul ticker>)`), așteaptă `#t212Graf-<tk> svg`, verifică textul legendei (`/20 de zile de bursă|zona de valoare/`), apasă comutatorul „5 zile” și verifică că `class="gbZi5"` dispare / apare; poză `grafic-actiune-<pc|telefon>.png`.
- [ ] **Step 3:** `npm test` (verde) + proba de ecran (toate trec) + poza la 1440 și 390 px, privită.
- [ ] **Step 4:** Colectorul repornit (PID nou + rândul „pornit” în `data/colector.log`).
- [ ] **Step 5:** Revizie Opus nouă pe tot pachetul (plan + spec + Review Focus), reparații RED→GREEN, `npm test && git commit && git push`, memo.
