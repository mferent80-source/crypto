# Acțiunile T212, pachetul 4 — Intrarea: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poarta („vreau să cumpăr X”) și ideile de cumpărare spun, înainte de cumpărare, ce au dat trade-urile LUI în aceeași stare („în situații ca asta: N cazuri, median, % pe plus, cel mai rău”) plus profilul și probabilitățile acțiunii propuse (stopul propus față de coborârea ei obișnuită, săriturile, atinge stopul mâine, ținta înaintea stopului în 5 zile). Avertizează, nu blochează.

**Architecture:** Cheia stării la cumpărare (`trend|mișcare|maxim`) se calculează cu `ActiuniSemnale.stare` (aceeași funcție ca poarta) și se ține în `t212:cf` pentru fiecare trade (colectorul refăce o dată verdictele vechi). O funcție pură `ActiuniSemnale.situatiiCaAsta` face socoteala pe trade-urile închise. Pagina calculează profilul (`ProfilMoneda.calculeaza`) și probabilitățile (`Probabilitati.pentruActiune`) direct din barele zilnice pe care poarta le aduce deja; ideile primesc cheia stării și două probabilități de la colector.

**Tech Stack:** JS ES5 în `public/lib/*.js` (module pure, încărcate în pagină și în colector prin `new Function`), Cloudflare Pages Functions (`functions/api/t212.js`), colector Node (`scripts/colector.mjs`, `scripts/lib/tura-*.mjs`), probe `scripts/proba-v1005N.mjs` în lanțul `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-01-actiuni-t212-creier-design.md` (secțiunea „Pachetul 4 — Intrarea”)

## Global Constraints

- Doar long; lei/dolari ca azi (rezultatele trade-urilor sunt în lei, prețurile în $).
- Avertizează, nu blochează: verdictul porții (`ActiuniSemnale.poarta`) și filtrul ideilor (`Idei.judecaActiune(...).trece`) NU se schimbă.
- Sub 10 cazuri: „prea puține — un semn, nu o regulă” (ca la crypto).
- Nimic nou în cota KV de pe Cloudflare: totul în KV-ul local (`t212:cf`, `t212:idei` există deja; zero chei noi).
- Fără sector: n-avem sectorul acțiunilor în date (ruling — vezi Review Focus 5).
- Versiunea paginii: v100.55; proba nouă `scripts/proba-v10055.mjs` legată în `npm test`; colectorul v101.35.
- `npm test && git commit && git push` — niciodată cu `;`. Fără `git pull` în `crypto` (lansatoarele rulează).

## Review Focus

1. **Trade-urile vechi fără cheia stării** (cf scris înainte de v100.55): socoteala le sare (nu le numără ca „altă stare”), iar colectorul le refăce O DATĂ — un `sit: null` (fără prețuri) rămâne null, nu se reface la nesfârșit. Test în Task 1 și Task 2.
2. **Acțiune nouă, sub 120 de zile de prețuri** (IPO recent) la poartă: profilul și probabilitățile lipsesc cu o propoziție („prea puține zile”), poarta merge ca azi. Test în Task 3.
3. **Stopul propus deja depășit / fără stop** (trend în jos ⇒ `niv.nivel !== "ok"`): fără rânduri de probabilitate, fără eroare. Test în Task 3.
4. **Cel mai rău caz** e un trade cu cost 0 sau fără cost (umpleri ciudate): nu intră în median/cel mai rău (împărțire la 0). Test în Task 1.
5. **„Același sector”** din spec: nu avem date de sector ⇒ în locul lui „aceeași acțiune, aceeași stare”; textul nu pomenește sectorul. Test în Task 1 (textul).

---

### Task 1: Cheia stării și „în situații ca asta” (module pure)

**Files:**
- Modify: `public/lib/actiuni-semnale.js` (lângă `laCumparare`, ~linia 168; exportul de la final)
- Create: `scripts/proba-v10055.mjs`
- Modify: `package.json` (`test:v10055` + lanțul `test`)

**Interfaces:**
- Produces:
  - `ActiuniSemnale.cheieSituatie(stare) -> "sus|calm|departe" | null` — părți: trend `sus|lateral|jos`; `dupa-miscare` dacă `stare.miscare.mare`, altfel `calm`; `langa-max` dacă `stare.distMax7z !== null && stare.distMax7z > -0.02`, altfel `departe`; `null` dacă trendul e `fara-date`.
  - `ActiuniSemnale.laCumparare(...)` întoarce în plus `sit` (cheia sau `null` la „fara-date”) — mereu prezent.
  - `ActiuniSemnale.situatiiCaAsta(inchise, cf, sit, ticker) -> { sit, eticheta, toate: Grup, actiune: Grup|null }`, `Grup = { n, median, pePlus, celMaiRau: {pct, lei}|null, total, putine }` (pct = rezultat/cost; `pePlus` = proporție 0..1; `putine = n < 10`). Doar trade-urile cu `cf[id].sit === sit` și `cost > 0`. `actiune` = aceeași acțiune ÎN aceeași stare (null fără ticker).
  - `ActiuniSemnale.textSituatie(r) -> string`.

- [ ] **Step 1: Scrie proba (picând)** — `scripts/proba-v10055.mjs`, antetul copiat din `proba-v10054.mjs` (liniile 1–24: `RAD`, `lib`, `G`, `SB`, `AS`, `test`, `are`), apoi:

```js
const Z = 864e5;
const stSus = { trend: { dir: "sus", tarie: "puternic" }, miscare: { mare: false }, distMax7z: -0.05 };
await test("cheia starii: trend|miscare|maxim; fara date -> null", () => {
  are(AS.cheieSituatie, "ActiuniSemnale.cheieSituatie");
  assert.equal(AS.cheieSituatie(stSus), "sus|calm|departe");
  assert.equal(AS.cheieSituatie({ trend: { dir: "lateral" }, miscare: { mare: true }, distMax7z: -0.01 }), "lateral|dupa-miscare|langa-max");
  assert.equal(AS.cheieSituatie({ trend: { dir: "fara-date" } }), null);
  assert.equal(AS.cheieSituatie(null), null);
});
await test("laCumparare intoarce mereu sit (null la fara-date)", () => {
  const t = { ticker: "INTC_US_EQ", pornit: 200 * Z, pretCumparare: 100 };
  assert.ok("sit" in AS.laCumparare(t, [], []));
  assert.equal(AS.laCumparare(t, [], []).sit, null);
  const bare = Array.from({ length: 199 }, (_, i) => ({ t: i * Z, o: 50 + i * 0.25, h: 51 + i * 0.25, l: 49 + i * 0.25, c: 50 + i * 0.25 }));
  const r = AS.laCumparare({ ...t, pretCumparare: bare[198].c }, bare, []);
  assert.match(String(r.sit), /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/, JSON.stringify(r));
});
await test("situatiiCaAsta: doar aceeasi stare, median/pe plus/cel mai rau pe % din cost; costul 0 si cf vechi (fara sit) sar; sub 10 -> putine", () => {
  are(AS.situatiiCaAsta, "ActiuniSemnale.situatiiCaAsta");
  const inch = [], cf = {};
  for (let i = 0; i < 12; i++) { const id = "a" + i; inch.push({ id, ticker: i < 3 ? "INTC_US_EQ" : "AMD_US_EQ", cost: 1000, rezultat: i < 8 ? 50 : -100 }); cf[id] = { sit: "sus|calm|departe" }; }
  inch.push({ id: "alt", ticker: "AMD_US_EQ", cost: 1000, rezultat: -900 }); cf.alt = { sit: "jos|calm|departe" };
  inch.push({ id: "vechi", ticker: "AMD_US_EQ", cost: 1000, rezultat: -800 }); cf.vechi = { nivel: "cumpara" };
  inch.push({ id: "zero", ticker: "AMD_US_EQ", cost: 0, rezultat: -500 }); cf.zero = { sit: "sus|calm|departe" };
  const r = AS.situatiiCaAsta(inch, cf, "sus|calm|departe", "INTC_US_EQ");
  assert.equal(r.toate.n, 12); assert.equal(r.toate.putine, false);
  assert.equal(r.toate.median, 0.05); assert.equal(Math.round(r.toate.pePlus * 100), 67);
  assert.deepEqual(r.toate.celMaiRau, { pct: -0.1, lei: -100 }); assert.equal(r.toate.total, 8 * 50 - 4 * 100);
  assert.equal(r.actiune.n, 3); assert.equal(r.actiune.putine, true);
  const tx = AS.textSituatie(r);
  assert.match(tx, /12 cazuri/); assert.match(tx, /median \+5,0%/); assert.match(tx, /67% pe plus/); assert.match(tx, /cel mai rău −10,0%/);
  assert.match(tx, /INTC.*3.*prea puține/); assert.ok(!/sector/.test(tx), "nu pomeni sectorul: n-avem date");
});
await test("situatiiCaAsta: nicio potrivire / fara sit -> n 0 si text care o spune", () => {
  const r = AS.situatiiCaAsta([], {}, "sus|calm|departe", null);
  assert.equal(r.toate.n, 0); assert.equal(r.actiune, null);
  assert.match(AS.textSituatie(r), /niciun trade/);
  assert.equal(AS.situatiiCaAsta([], {}, null).toate.n, 0);
});
```

În `package.json`: `"test:v10055": "node scripts/proba-v10055.mjs"` și ` && npm run test:v10055` la capătul lanțului `test` (după `test:v10054`).

- [ ] **Step 2: Rulează, trebuie să pice**

Run: `node scripts/proba-v10055.mjs`
Expected: FAIL „lipseste ActiuniSemnale.cheieSituatie”.

- [ ] **Step 3: Implementează** în `public/lib/actiuni-semnale.js`, înainte de `function laCumparare`:

```js
  // v100.55 (actiunile T212, pachetul 4): starea de la cumparare intr-o cheie - aceeasi stare ca poarta (trend | dupa miscare | langa maxim)
  function cheieSituatie(s) {
    if (!s || !s.trend || !/^(sus|lateral|jos)$/.test(s.trend.dir)) return null;
    return s.trend.dir + "|" + (s.miscare && s.miscare.mare ? "dupa-miscare" : "calm") + "|" + (s.distMax7z !== null && s.distMax7z !== undefined && s.distMax7z > -0.02 ? "langa-max" : "departe");
  }
  var ET_SIT = { sus: "trend în sus", lateral: "trend neclar", jos: "trend în jos", calm: "fără mișcare mare", "dupa-miscare": "după o mișcare mare", departe: "departe de maximul pe 7 zile", "langa-max": "lângă maximul pe 7 zile" };
  function grupSit(l) {
    var pc = l.map(function (t) { return { pct: t.rezultat / t.cost, lei: t.rezultat }; }).sort(function (a, b) { return a.pct - b.pct; }), n = pc.length, tot = 0, plus = 0;
    pc.forEach(function (x) { tot += x.lei; if (x.lei > 0) plus++; });
    return { n: n, median: n ? (n % 2 ? pc[(n - 1) / 2].pct : (pc[n / 2 - 1].pct + pc[n / 2].pct) / 2) : null, pePlus: n ? plus / n : null,
      celMaiRau: n ? { pct: Math.round(pc[0].pct * 10000) / 10000, lei: pc[0].lei } : null, total: Math.round(tot * 100) / 100, putine: n < 10 };
  }
  // „in situatii ca asta, din trade-urile tale”: inchise = T212.perechi().inchise; cf = t212:cf (cf[id].sit); doar costul > 0
  function situatiiCaAsta(inchise, cf, sit, ticker) {
    var c = cf || {}, l = sit ? (Array.isArray(inchise) ? inchise : []).filter(function (t) { return t && t.cost > 0 && isFinite(t.rezultat) && c[t.id] && c[t.id].sit === sit; }) : [];
    return { sit: sit || null, eticheta: sit ? sit.split("|").map(function (k) { return ET_SIT[k] || k; }).join(", ") : "",
      toate: grupSit(l), actiune: ticker ? grupSit(l.filter(function (t) { return t.ticker === ticker; })) : null };
  }
  function textSituatie(r) {
    if (!r || !r.toate || !r.toate.n) return "În situații ca asta" + (r && r.eticheta ? " (" + r.eticheta + ")" : "") + ": niciun trade al tău judecat încă.";
    var g = r.toate, Pc = function (x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };
    var s = "În situații ca asta (" + r.eticheta + "), din trade-urile tale: " + g.n + " cazuri, median " + Pc(g.median) + ", " + Math.round(g.pePlus * 100) + "% pe plus, cel mai rău " + Pc(g.celMaiRau.pct) + (g.putine ? " — prea puține, un semn, nu o regulă" : "") + ".";
    if (r.actiune && r.actiune.n) { var sim = String((r.ticker || "") || "").split("_")[0]; s += " Pe " + (sim || "acțiunea asta") + " în aceeași stare: " + r.actiune.n + (r.actiune.n === 1 ? " caz" : " cazuri") + ", median " + Pc(r.actiune.median) + (r.actiune.putine ? " (prea puține)" : "") + "."; }
    return s;
  }
```

În `situatiiCaAsta` adaugă `ticker: ticker || null` în obiectul întors (textul îl folosește pentru simbol). În `laCumparare`: ramura `b.length < 60` și ramura `!pretPotrivit` întorc și `sit: null`; ultima linie devine `return { nivel: v.nivel, motive: v.motive.slice(0, 4), greseli: g, sit: cheieSituatie(st) };`. La export adaugă `cheieSituatie: cheieSituatie, situatiiCaAsta: situatiiCaAsta, textSituatie: textSituatie`.

- [ ] **Step 4: Rulează, trebuie să treacă**

Run: `node scripts/proba-v10055.mjs`
Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
npm test && git add public/lib/actiuni-semnale.js scripts/proba-v10055.mjs package.json && git commit -m "feat(actiuni): pachetul 4 - cheia starii la cumparare si in situatii ca asta (v100.55)"
```

---

### Task 2: Cheia stării ajunge în `t212:cf` (ruta + colectorul o refăce o dată)

**Files:**
- Modify: `functions/api/t212.js` (ramura `act === "cf"`, ~linia 157)
- Modify: `scripts/lib/tura-t212.mjs:81` (condiția de refacere)
- Test: `scripts/proba-v10055.mjs`

**Interfaces:**
- Consumes: `laCumparare(...).sit` (Task 1).
- Produces: `t212:cf[id].sit` = cheia validă sau `null`; prezentă după prima trecere a colectorului.

- [ ] **Step 1: Test (picând)** — adaugă în proba v10055:

```js
await test("ruta cf pastreaza sit (valid sau null - null ramane null, altfel s-ar reface la nesfarsit); colectorul reface O DATA verdictele fara sit", async () => {
  const src = fs.readFileSync(path.join(RAD, "functions", "api", "t212.js"), "utf8");
  assert.match(src, /"sit" in x/, "ruta cf: test de prezenta pentru sit");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  are(mod.__cfPentruProba, "t212.js __cfPentruProba (curatarea unui verdict cf, exportata pentru proba)");
  assert.equal(mod.__cfPentruProba({ nivel: "cumpara", sit: "sus|calm|departe" }).sit, "sus|calm|departe");
  assert.equal(mod.__cfPentruProba({ nivel: "fara-date", sit: null }).sit, null);
  assert.equal(mod.__cfPentruProba({ nivel: "cumpara", sit: "<script>" }).sit, null);
  assert.ok(!("sit" in mod.__cfPentruProba({ nivel: "cumpara" })), "fara sit in corp -> nu inventez unul");
  const tura = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(tura, /!\("sit" in gata\[t\.id\]\)/);
});
```

- [ ] **Step 2: Rulează** — `node scripts/proba-v10055.mjs` · Expected: FAIL pe `"sit" in x`.

- [ ] **Step 3: Implementează**
  - În `functions/api/t212.js`: scoate corpul buclei `Object.keys(v)...forEach` într-o funcție la nivel de modul `function curataCf(x)` care întoarce obiectul `m[id]` (exact codul de azi: nivel, motive, greseli, stopU, prob, stop) și adaugă înainte de `return`:
    ```js
    // v100.55: starea de la cumparare (trend|miscare|maxim); null se pastreaza (fara preturi) - altfel colectorul ar reface la nesfarsit
    if ("sit" in x) o.sit = typeof x.sit === "string" && /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/.test(x.sit) ? x.sit : null;
    ```
    Bucla devine `m[id] = curataCf(x);`. Exportă `export const __cfPentruProba = curataCf;`.
  - În `scripts/lib/tura-t212.mjs:81` adaugă la condiția `if (...)` încă un `|| !("sit" in gata[t.id])`, cu comentariul: `// v100.55: si verdictele fara starea de la cumparare (sit) se refac O DATA - un sit: null ramane null`.

- [ ] **Step 4: Rulează** — `node scripts/proba-v10055.mjs` · Expected: 5/5 PASS; `npm test` verde (proba v10052/v10053 ating aceeași rută — trebuie să rămână verzi).

- [ ] **Step 5: Commit** — `npm test && git add functions/api/t212.js scripts/lib/tura-t212.mjs scripts/proba-v10055.mjs && git commit -m "feat(actiuni): starea de la cumparare in t212:cf, refacuta o data"`

---

### Task 3: Poarta — „în situații ca asta”, profilul și probabilitățile acțiunii propuse

**Files:**
- Modify: `public/lib/profil-moneda.js` (lângă `pragStopActiune`, ~linia 107; exportul)
- Modify: `public/lib/t212-ecran.js` (`t212Poarta` ~411, `t212RenderPoarta`, `t212BiletTu` ~445, randarea `p.prob` ~380)
- Test: `scripts/proba-v10055.mjs`

**Interfaces:**
- Consumes: `ActiuniSemnale.situatiiCaAsta/textSituatie/cheieSituatie` (Task 1), `t212:cf[id].sit` (Task 2), `Probabilitati.pentruActiune/randActiune`, `t212Calibrare()`.
- Produces:
  - `ProfilMoneda.comparaStopActiune(profil, riscPct) -> { dist, strans, text } | null` — `dist` = `pragStopActiune(profil).dist`; `strans = riscPct < dist`; textul spune coborârea obișnuită pe 5 zile și dacă stopul propus e mai strâns.
  - `ProfilMoneda.textSarituri(profil) -> string | ""` — săriturile mari (evenimente).
  - `t212ProbListaHtml(lista) -> html` (extras din randarea poziției, folosit în poziție și în poartă).
  - `t212.poarta.prof`, `t212.poarta.prob`, `t212.poarta.sit`.

- [ ] **Step 1: Test (picând)**:

```js
const PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)();
const PB = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS);
const bareAct = (n, f) => Array.from({ length: n }, (_, i) => { const c = 100 * (1 + 0.002 * i) * (1 + 0.03 * Math.sin(i / 3)); return { t: i * Z, o: c * (f ? 0.995 : 1), h: c * 1.02, l: c * 0.98, c }; });
await test("profilul la poarta: stopul propus fata de coborarea obisnuita pe 5 zile; saltul mare; sub 120 de zile -> null", () => {
  are(PM.comparaStopActiune, "ProfilMoneda.comparaStopActiune"); are(PM.textSarituri, "ProfilMoneda.textSarituri");
  const pf = PM.calculeaza(bareAct(300), { piata: "actiuni", simbol: "INTC_US_EQ", acum: 400 * Z });
  const d = PM.pragStopActiune(pf).dist;
  const strans = PM.comparaStopActiune(pf, d / 2), larg = PM.comparaStopActiune(pf, d * 2);
  assert.equal(strans.strans, true); assert.match(strans.text, /mai strâns/);
  assert.equal(larg.strans, false); assert.ok(!/mai strâns/.test(larg.text));
  assert.equal(PM.comparaStopActiune(null, 0.05), null);
  assert.equal(PM.calculeaza(bareAct(80), { piata: "actiuni", acum: 400 * Z }), null, "IPO recent: fara profil");
  assert.equal(typeof PM.textSarituri(pf), "string");
});
await test("pagina: poarta arata in situatii ca asta + profilul + probabilitatile; fara stop/niveluri -> fara randuri; randarea comuna cu pozitia", () => {
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.match(e, /function t212ProbListaHtml\(/);
  assert.match(e, /ActiuniSemnale\.situatiiCaAsta\(/);
  assert.match(e, /ProfilMoneda\.comparaStopActiune\(/);
  assert.match(e, /t212\.poarta\.prob = /);
  assert.match(e, /p\.niv && p\.niv\.nivel === "ok"/, "probabilitatile doar cu niveluri calculate");
  assert.ok((e.match(/t212ProbListaHtml\(/g) || []).length >= 3, "definita + folosita la pozitie + la poarta");
});
await test("probabilitatile acțiunii propuse: cu stopul si tinta porții, de la pretul de intrare; stopul peste pret -> motiv, nu cifre", () => {
  const b = bareAct(300), pret = b[299].c;
  const r = PB.randActiune(PB.pentruActiune(b, { pret, stop: pret * 0.95, tinta: pret * 1.1, acum: 400 * Z }), null, {});
  assert.ok(r.some((x) => /stopul mâine/.test(x.titlu)));
  const r2 = PB.randActiune(PB.pentruActiune(b, { pret, stop: pret * 1.01, tinta: pret * 1.1, acum: 400 * Z }), null, {});
  assert.equal(r2.length, 1); assert.equal(r2[0].p, null);
});
```

- [ ] **Step 2: Rulează** — Expected: FAIL „lipseste ProfilMoneda.comparaStopActiune”.

- [ ] **Step 3: Implementează**
  - `public/lib/profil-moneda.js`, după `pragStopActiune`:
    ```js
    // v100.55 (actiuni, pachetul 4): stopul propus la poarta fata de coborarea obisnuita a actiunii pe 5 zile (3 din 4 saptamani raman deasupra)
    function comparaStopActiune(p, riscPct) {
      var ps = pragStopActiune(p); if (!ps || !(riscPct > 0)) return null;
      var Pc = function (x) { return Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }, strans = riscPct < ps.dist;
      return { dist: ps.dist, strans: strans, text: "Coborârea obișnuită a acțiunii pe 5 zile: −" + Pc(ps.dist) + " (3 din 4 săptămâni rămân deasupra; " + ps.sursa + "). Stopul propus e la −" + Pc(riscPct)
        + (strans ? " — mai strâns decât coborârea obișnuită: te poate scoate pe o mișcare normală." : " — în afara coborârii obișnuite.") };
    }
    function textSarituri(p) {
      var e = p && p.evenimente; if (!e || !e.n || e.mediana === null) return "";
      return "Săriturile mari la deschidere (de obicei la rezultate): " + e.n + " în ultimele " + p.zile + " zile de bursă, de obicei ~" + Math.round(e.mediana * 100) + "%, cea mai mare " + Math.round(e.max * 100) + "% — stopul nu te apără de ele.";
    }
    ```
    Export: `comparaStopActiune: comparaStopActiune, textSarituri: textSarituri`.
  - `public/lib/t212-ecran.js`:
    - Extrage din randarea poziției (linia ~380) funcția:
      ```js
      // v100.55: randurile de probabilitate (pozitia si poarta, aceeasi forma)
      function t212ProbListaHtml(l) {
        if (!l || !l.length || typeof tbProbRandHtml !== "function") return "";
        return l.map(function (x) { return x.p === null ? '<p class="tbSub' + (x.avertizare ? ' tbWarn' : '') + '"><b>' + escapeHtml(x.titlu) + '</b>' + (x.text ? ' — ' + escapeHtml(x.text) : '') + '</p>' : tbProbRandHtml(x); }).join("");
      }
      ```
      iar în poziție: `p.prob.map(...).join("")` → `t212ProbListaHtml(p.prob)`.
    - În `t212Poarta`, după ce vin rezultatele (`t212.poarta.rezultate`), adaugă:
      ```js
      // v100.55 (pachetul 4): profilul si probabilitatile actiunii propuse, din barele aduse deja (merge si pe o actiune noua pentru tine)
      var P = t212.poarta, n4 = P.niv, baza4 = n4 && n4.nivel === "ok" ? (n4.intrare ? n4.intrare.pret : st.pret) : null;
      P.prof = typeof ProfilMoneda !== "undefined" ? ProfilMoneda.calculeaza(bare, { piata: "actiuni", simbol: tk, acum: Date.now() }) : null;
      var zc4 = P.rezultate ? Math.ceil((Date.parse(P.rezultate + "T12:00:00Z") - Date.now()) / 86400000) : null;
      t212.poarta.prob = typeof Probabilitati !== "undefined" && p4ok(P) ? Probabilitati.randActiune(Probabilitati.pentruActiune(bare, { pret: baza4, stop: n4.stop, tinta: n4.tinta, acum: Date.now() }), t212Calibrare(), { rezultateZile: zc4 !== null && zc4 >= 0 ? Math.round(zc4 * 5 / 7) : null, evenimente: P.prof && P.prof.evenimente }) : [];
      P.sit = j ? ActiuniSemnale.situatiiCaAsta(j.p.inchise, t212.cf || {}, ActiuniSemnale.cheieSituatie(st), tk) : null;
      ```
      cu `function p4ok(p) { return !!(p.niv && p.niv.nivel === "ok" && p.niv.stop > 0); }` la nivel de fișier (lângă `t212PreturiPoarta`).
    - Funcție nouă, chemată în `t212RenderPoarta` imediat după `t212PreturiPoarta(p)`:
      ```js
      // v100.55: profilul + probabilitatile actiunii propuse (avertizeaza, nu schimba verdictul portii)
      function t212ProfilPoarta(p) {
        var n = p.niv, h = "", baza = n && n.nivel === "ok" ? (n.intrare ? n.intrare.pret : p.st.pret) : null;
        var cmp = p.prof && baza && n.stop > 0 && typeof ProfilMoneda !== "undefined" ? ProfilMoneda.comparaStopActiune(p.prof, 1 - n.stop / baza) : null, sr = p.prof && typeof ProfilMoneda !== "undefined" ? ProfilMoneda.textSarituri(p.prof) : "";
        if (!p.prof) h += '<p class="tbSub">📐 Profilul acțiunii: prea puține zile de prețuri (sub 120) — fără coborârea obișnuită și fără probabilități.</p>';
        if (cmp) h += '<p class="' + (cmp.strans ? "tbWarn" : "tbSub") + '">📐 ' + escapeHtml(cmp.text) + '</p>';
        if (sr) h += '<p class="tbSub">⚡ ' + escapeHtml(sr) + '</p>';
        if (p.prob && p.prob.length) h += '<div class="t212Prob"><p class="tbSub"><b>🎲 Probabilitățile din istoric</b> · cu stopul și ținta de mai sus, cât de des s-a întâmplat pe acțiunea asta în zile ca acum — nu o prognoză</p>' + t212ProbListaHtml(p.prob) + '</div>';
        return h ? '<div class="t212ProfilPoarta">' + h + '</div>' : "";
      }
      ```
    - În `t212BiletTu`, imediat după `<h5>🧾 Ce spune istoricul tău</h5>`: `(p.sit ? '<p class="' + (p.sit.toate.n >= 10 && p.sit.toate.median < 0 ? "tbWarn" : "tbSub") + '">📊 ' + escapeHtml(ActiuniSemnale.textSituatie(p.sit)) + '</p>' : '')`.

- [ ] **Step 4: Rulează** — `node scripts/proba-v10055.mjs` · Expected: 8/8 PASS; `npm test` verde (proba de ecran t212 — 20 — rămâne verde).

- [ ] **Step 5: Commit** — `npm test && git add public/lib/profil-moneda.js public/lib/t212-ecran.js scripts/proba-v10055.mjs && git commit -m "feat(actiuni): poarta - in situatii ca asta, profilul si probabilitatile actiunii propuse"`

---

### Task 4: Ideile — cheia stării și probabilitățile, de la colector

**Files:**
- Modify: `public/lib/idei.js` (`judecaActiune`, ~linia 15–33)
- Modify: `scripts/lib/tura-idei.mjs` (pasează `Probabilitati`)
- Modify: `scripts/colector.mjs` (~890, `turaIdeiModul({... Probabilitati })`)
- Modify: `functions/api/t212.js` (ramura `act === "idei"`, ~117: păstrează `sit` și `prob`)
- Modify: `public/lib/t212-ecran.js` (`t212IdeiRender`, ~290)
- Test: `scripts/proba-v10055.mjs`

**Interfaces:**
- Consumes: `cheieSituatie`, `situatiiCaAsta`, `textSituatie` (Task 1); `Probabilitati.pentruActiune`.
- Produces: idee `{..., sit: "sus|calm|departe", prob: { tinta5: p|null, stop1: p|null } | null }` în `t212:idei`.

- [ ] **Step 1: Test (picând)**:

```js
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
await test("ideile: sit si probabilitatile (tinta inaintea stopului in 5 zile, atinge stopul maine) cand vine Probabilitati; fara el, ca azi", () => {
  const b = bareAct(300, true), pret = b[299].c;
  const fara = ID.judecaActiune(b, pret, { acum: 400 * Z });
  const cu = ID.judecaActiune(b, pret, { acum: 400 * Z, Probabilitati: PB });
  assert.equal(cu.trece, fara.trece, "probabilitatile nu schimba filtrul (avertizeaza, nu blocheaza)");
  if (cu.trece) {
    assert.equal(cu.sit, "sus|calm|departe");
    assert.ok(cu.prob && "tinta5" in cu.prob && "stop1" in cu.prob, JSON.stringify(cu.prob));
    assert.ok(!("prob" in fara) || fara.prob === null);
  }
  const src = fs.readFileSync(path.join(RAD, "functions", "api", "t212.js"), "utf8");
  assert.match(src, /sit: .*x\.sit/, "ruta idei pastreaza sit");
  assert.match(src, /tinta5/, "ruta idei pastreaza probabilitatile");
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /turaIdeiModul\(\{[^)]*Probabilitati/);
  assert.match(fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), /t212IdeiSit\(/);
});
```

Dacă `bareAct(300, true)` nu trece de poarta ideilor (trend/„mișcare”), testul verifică doar `cu.trece === fara.trece` și cele trei grep-uri — adaugă atunci un fixture cu trend curat în sus (`c = 100 * 1.003 ** i`, `h = c*1.01`, `l = c*0.99`, `o = c*0.999`) până când `cu.trece === true`, ca ramura `if` să ruleze efectiv (fără `if` gol trecut pe tăcute: adaugă `assert.ok(cu.trece, "fixture-ul trebuie sa treaca de poarta")` după ce găsești fixture-ul bun).

- [ ] **Step 2: Rulează** — Expected: FAIL (fără `sit` / grep-urile).

- [ ] **Step 3: Implementează**
  - `idei.js`, în `judecaActiune`, la `return { trece: true, ...`: adaugă `sit: AS.cheieSituatie(st), prob: probIdee(b, intrare, n, o)` și funcția:
    ```js
    // v100.55 (actiuni, pachetul 4): cat de des, pe actiunea asta in zile ca acum - ținta înaintea stopului în 5 zile, stopul atins maine; nu schimba filtrul
    function probIdee(b, intrare, n, o) {
      var PB = o && o.Probabilitati; if (!PB || !(intrare > 0) || !(n.stop > 0)) return null;
      var r = PB.pentruActiune(b, { pret: intrare, stop: n.stop, tinta: n.tinta, acum: o.acum || Date.now() }); if (!r || !r.stop1) return null;
      var r3 = function (x) { return Math.round(x * 1000) / 1000; };
      return { tinta5: r.cursa5 && r.cursa5.tinta ? r3(r.cursa5.tinta.p) : null, stop1: r.sare1 ? r3(r.stop1.p + r.sare1.p) : r3(r.stop1.p) };
    }
    ```
  - `tura-idei.mjs`: ambele `d.Idei.judecaActiune(bare, ..., { acum: d.acum, ... })` primesc și `Probabilitati: d.Probabilitati`.
  - `colector.mjs` ~890: `turaIdeiModul({ tickere, inchise, Idei, Probabilitati, jurnal, ...`.
  - `functions/api/t212.js` ramura `idei`, în `act2.map`: adaugă
    `sit: /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/.test(String(x && x.sit)) ? x.sit : null, prob: x && x.prob && typeof x.prob === "object" ? { tinta5: nr(x.prob.tinta5), stop1: nr(x.prob.stop1) } : null,`
  - `t212-ecran.js`:
    ```js
    // v100.55: „in situatii ca asta” pentru idei (toate au trecut de poarta: aceeasi stare) - o linie deasupra tabelului
    function t212IdeiSit(l) {
      var j = t212Jurnal(), sit = l.length && l[0].sit; if (!j || !sit) return "";
      return '<p class="tbSub">📊 ' + escapeHtml(ActiuniSemnale.textSituatie(ActiuniSemnale.situatiiCaAsta(j.p.inchise, t212.cf || {}, sit, null))) + '</p>';
    }
    ```
    chemată în `t212IdeiRender` înainte de tabel (`h += t212IdeiSit(l);` când `l.length`). În coloana „Istoricul tău” a fiecărui rând adaugă sub textul existent: `(x.prob && x.prob.tinta5 !== null ? '<span class="t212Mic">🎲 ținta înaintea stopului în 5 zile: ' + Math.round(x.prob.tinta5 * 100) + '% · stopul mâine: ' + Math.round(x.prob.stop1 * 100) + '%</span>' : '')`.

- [ ] **Step 4: Rulează** — `node scripts/proba-v10055.mjs` · Expected: 9/9 PASS; `npm test` verde (probele `idei-v90`, `consilier-v89` rămân verzi).

- [ ] **Step 5: Commit** — `npm test && git add public/lib/idei.js scripts/lib/tura-idei.mjs scripts/colector.mjs functions/api/t212.js public/lib/t212-ecran.js scripts/proba-v10055.mjs && git commit -m "feat(actiuni): ideile - in situatii ca asta si probabilitatile actiunii"`

---

### Task 5: Versiunea, proba de ecran, livrarea

**Files:**
- Modify: `public/index.html` (badge/versiunea v100.54 → v100.55, `?v=` pe scripturile atinse), `public/sw.js` sau unde stă cheia cache-ului (cum s-a făcut la v100.54 — vezi `git show ddf49e7 --stat`), `scripts/colector.mjs` (versiunea colectorului v101.34 → v101.35)
- Test: proba de ecran T212 (cea cu 20 de verificări)

- [ ] **Step 1:** Repetă exact bump-ul din commit-ul v100.54 (`git show <commitul v100.54> --stat` → aceleași fișiere, numărul +1, titlul „INTRAREA PE ACȚIUNI”).
- [ ] **Step 2:** `npm test` · Expected: tot lanțul verde, inclusiv v10055 (9/9).
- [ ] **Step 3:** Proba pe pagină (wrangler :8788, pagina reală): poarta pe INTC (are istoric) și pe un simbol nou (IPO recent) — poza la 1920 și la 400 px; „📊 În situații ca asta”, „📐” și „🎲” apar; pe simbolul nou apare propoziția „prea puține zile”. Ideile: linia 📊 deasupra tabelului (după prima trecere a colectorului de dimineață — până atunci lipsește, nu crapă).
- [ ] **Step 4:** Repornește colectorul (procesul de fundal: probează că A PORNIT — PID nou + rândul „cf actiuni: N trade-uri judecate” în jurnal, care arată refacerea cu `sit`).
- [ ] **Step 5:** Revizie de la un agent Opus nou pe tot pachetul (planul + spec + Review Focus), reparații RED→GREEN, apoi `npm test && git commit && git push`, memo.
