# Rețeaua neuronală — livrarea 1 (boții: Tablou și fișa) — planul de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O rețea neuronală TensorFlow.js antrenată acasă, noaptea, pe boții crypto. E verificată walk-forward față de 🎲 și de formula simplă și apare ca a doua părere 🧠 pe Tablou și pe fișă, inclusiv la poarta de pornire.

**Architecture:**
- `public/lib/retea.js` e un modul pur, comun colectorului, fișei (în browser) și antrenorului. Conține trăsăturile, intrările pe țintă, trecerea înainte fără TensorFlow, pragul „dovedită” și rândurile 🧠.
- `retea/` e singurul loc cu TensorFlow.js (pe WebAssembly), cu `package.json` propriu: datele, verificarea, modelul și programul de noapte.
- Colectorul pornește antrenorul într-un proces separat, urcă modelele în KV (`retea`) și pune `rez.retea` în pachetul 🎲 al fiecărui bot.

**Tech Stack:**
- modulele paginii: JavaScript cu IIFE;
- Node 24 ESM;
- `@tensorflow/tfjs` 4.22.0 + `@tensorflow/tfjs-backend-wasm` 4.22.0;
- Cloudflare Pages Functions (KV `ISTORIC`), rulate local cu `wrangler pages dev`.

**Spec:** `docs/superpowers/specs/2026-10-02-retea-neuronala-design.md` (`58f4a27`).

## Global Constraints

**Ce nu se atinge și unde stă TensorFlow:**
- Nu se schimbă semaforul, verdictul fișei, poarta, Consilierul, alertele, nivelurile și 🎲. Rețeaua nu are pondere în nicio decizie și nu trimite alerte.
- Rădăcina proiectului rămâne fără dependențe npm. TensorFlow.js stă doar în `retea/` (`@tensorflow/tfjs` 4.22.0 + `@tensorflow/tfjs-backend-wasm` 4.22.0). Nici pagina publică, nici colectorul nu-l încarcă.

**Datele:**
- Fără privire în viitor: trăsăturile la momentul t vin doar din barele închise (`b.t + ORA <= t`). Aceeași funcție (`Retea.trasaturiBare`) servește și istoria, și „acum”.
- Istoria barelor: ~400 de zile în `data/retea/ore/`. Profilul monedei rămâne pe cele 185 de zile din `data/istoric-1h/`, neatins.
- Repo-ul e public: modelele, datele și verificările stau în `data/` (ignorat) și în KV, niciodată în git.

**Rețeaua și antrenarea:**
- Hiperparametri fixați:
  - straturile: intrări → 16 relu (L2 1e-3) → dropout 0,2 → 8 relu → 1 sigmoid, cu L2 1e-3 pe toate straturile;
  - antrenarea: Adam 1e-3, loturi de 256, cel mult 60 de epoci, oprire timpurie pe ultimii 20% (în ordinea timpului), răbdare 5;
  - 5 semințe; bias-ul ieșirii = logit(rata de bază);
  - `Math.random` primește sămânță în procesul antrenorului; dropout-ul nu primește sămânță fixă.
- Formula simplă (regresia logistică) folosește aceleași trăsături, fără strat ascuns, și e antrenată la fel.
- Bugetul e de 30 de minute pe noapte. Colectorul oprește antrenorul după 35. Lunile judecate se păstrează pe disc.

**Verificarea și eticheta „dovedită”:**
- Cele patru condiții:
  1. ≥ 100 de cazuri independente;
  2. marginea de jos a IC 95% peste 0, **și** față de reper (cel mai greu dintre 🎲, rata ta, 50%), **și** față de formula simplă;
  3. scorul pe ultimele 3 luni ≥ 0 față de reper;
  4. log-loss-ul nu mai rău decât al reperului și al formulei.
- Intervalul se socotește prin bootstrap pe două trepte: lunile, apoi monedele (boții) din ele, cu 1.000 de reeșantionări.
- Blocurile independente: 24 h → zile; 72 h → 3 zile; 7 zile → săptămâni; liniștea → 2 zile; rezultatul tău → zilele de pornire.

**Textele și livrarea:**
- Textele: ≤ 160 de caractere pe rând, cifrele prin `TextRo`, „de” prin `cate`. Garda textelor primește un grup nou, STRICT, `retea`.
- Versiunile: pagina v100.80 (BUILD_INFO, `functions/_shared/versiune.js`, `package.json`, `public/sw.js` CACHE, `public/index.html` în 4 locuri), colectorul v101.56.
- Livrarea: `npm test && git commit && git push`, niciodată cu `;`.
- Pe PC-ul lui: `python` nu, se folosește `node`. Scripturile cu backslash se scriu cu Write/Edit, nu prin Bash. Niciun `//` lipit la mijlocul rândului într-o înlocuire. Fără `git pull` în `crypto`.

## Review Focus

1. **Modelul lipsă, de altă versiune sau fără verificare** (prima noapte, KV gol, codul trăsăturilor schimbat):
   - niciun rând 🧠 cu cifre false („NaN%”, „0%”);
   - colectorul nu scrie `rez.retea`;
   - pagina nu crapă.

   Testele: Task 1 (`verdict` → null la altă versiune), Task 7 (`pentruBot` → null fără modele), Task 8 (`reteaHtml` → "" fără modele).
2. **Moneda sub 30 de zile de bare, BTC lipsă sau bare cu gaură:** rândul nu are cifră, nicio cifră nu se inventează.

   Testele: Task 1 (null sub 720 de bare, BTC → 0) și Task 3 (fereastra cu gaură nu dă rând).
3. **Antrenorul care pică sau e oprit la 35 de minute:**
   - modelul de ieri rămâne, și pe disc, și în KV;
   - jurnalul spune ce s-a întâmplat;
   - colectorul merge mai departe.

   Testul: Task 7.
4. **Botul short** (lichidarea SUS, ținta JOS): semnele distanțelor sunt ca la 🎲. Codul „lichidare” apare doar de partea botului.

   Testul: Task 7.
5. **Pagina publicată (fără KV) și fișa fără bare:** sub-blocul 🧠 lipsește, iar restul Tabloului și al fișei rămâne neschimbat.

   Testele: Task 8 și Task 9.

---

## Harta fișierelor

| fișier | rol |
|---|---|
| `public/lib/retea.js` (nou) | trăsăturile, intrările pe țintă, `prezice`, `decide`, `verdict`, `pentruBot`, `pentruPornire`, rândurile 🧠 (`randuri`, `antet`, `subsol`, `textPornire`) |
| `retea/package.json` (nou) | dependențele TensorFlow.js, fixate |
| `retea/model.mjs` (nou) | TF.js pe WebAssembly: `porneste`, `construieste`, `exporta`, `antreneaza`, `HIPER` |
| `retea/date.mjs` (nou) | încărcarea modulelor, barele (400 + 185 de zile), rândurile pe țintă, reperul 🎲 la momentul rândului, rândurile „rezultatul tău” |
| `retea/verifica.mjs` (nou) | lunile de test, împărțirea cu pauză, normalizarea, Brier / log-loss, bootstrap pe două trepte, blocurile, `judecaLuna`, `modelFinal` |
| `retea/antreneaza.mjs` (nou) | programul de noapte: modelele finale, lunile lipsă (cache), `data/retea/modele.json` |
| `scripts/lib/tura-retea.mjs` (nou) | colectorul: istoria de 400 de zile, `boti.json`, antrenorul pornit, modelele urcate |
| `scripts/lib/tura-probabilitati.mjs` | `rez.retea` lângă 🎲 |
| `scripts/colector.mjs` | `Retea` încărcat, `turaReteaColector`, modelele de pe disc, BTC-ul pentru „acum”, rezultatul la pornire |
| `functions/api/istoric-bot.js` | `action=retea` (GET / POST) |
| `public/app.js` | `reteaAdu`, `reteaHtml` (Tablou), sub-blocul din fișă, rândul de la poartă |
| `public/index.html`, `public/sw.js` | `retea.js` încărcat și pus în cache |
| `scripts/lib/garda-retea.mjs` (nou) + `scripts/garda-texte.mjs` | grupul STRICT `retea` |
| `scripts/proba-v10080*.mjs` (noi) | probele; legate în `npm test` |

---

### Task 1: `public/lib/retea.js` — trăsăturile, intrările, trecerea înainte, pragul „dovedită”

**Files:**
- Create: `public/lib/retea.js`
- Create: `scripts/lib/bare-proba.mjs` (generatorul de bare al probelor rețelei, comun)
- Create: `scripts/proba-v10080.mjs`
- Modify: `package.json` (scriptul `test:v10080` + lanțul `test`)

**Interfaces:**
- Consumes: `Probabilitati.stareLa(b, i)`, `Probabilitati.pregateste(bare, acum)` (din `public/lib/probabilitati.js`); `TextRo.num`, `TextRo.cate`.
- Produces:
  - `Retea.VERSIUNE = "r1"`;
  - `Retea.TRASATURI` (17 nume);
  - `Retea.TINTE = { "atinge-24": {bloc: 24}, "atinge-72": {bloc: 72}, "atinge-168": {bloc: 168}, cursa: {bloc: 168}, liniste: {bloc: 48}, directie: {bloc: 24}, rezultat: {bloc: 24} }`;
  - `Retea.indexLa(b, t) -> number`;
  - `Retea.trasaturiBare(b, i, btc, stare?) -> {x: number[17], s1, c, stare, t} | null`;
  - `Retea.intrare(tinta, f, e) -> number[] | null`;
  - `Retea.trasaturiBot(t, b, btc, ist, stare?) -> {x: number[26], glob, rata, n} | null`;
  - `Retea.prezice(model, x) -> number | null`;
  - `Retea.decide(v) -> {dovedita, motiv}`;
  - `Retea.verdict(model, acum) -> {dovedita, motiv, nIndep, bloc, vechi} | null`.

- [ ] **Step 1: Scrie proba (roșie)** — întâi generatorul comun de bare, `scripts/lib/bare-proba.mjs`:

```js
// barele de 1 h ale probelor rețelei: mers aleator cu sămânță (o.p0, o.vol, o.t0, o.seed) - forma GridCalcul.bare ({t, o, h, l, c})
const ORA = 3600000;
export function bare(n, o = {}) {
  let s = o.seed || 1; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out = []; let c = o.p0 || 100; const t0 = o.t0 || Date.UTC(2025, 8, 1);
  for (let i = 0; i < n; i++) { const o1 = c; c = o1 * (1 + (rnd() - 0.5) * 2 * (o.vol || 0.01)); out.push({ t: t0 + i * ORA, o: o1, h: Math.max(o1, c) * (1 + rnd() * 0.003), l: Math.min(o1, c) * (1 - rnd() * 0.003), c }); }
  return out;
}
```

apoi `scripts/proba-v10080.mjs`:

```js
// Proba v100.80 - rețeaua neuronală, livrarea 1 (specul docs/superpowers/specs/2026-10-02-retea-neuronala-design.md): modulul pur
// public/lib/retea.js - trăsăturile fără privire în viitor, intrările pe țintă, trecerea înainte, pragul „dovedită”.
//   node scripts/proba-v10080.mjs
import "./lib/text-ro-global.mjs";   // TextRo înaintea modulelor
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const ActiuniSemnale = new Function("GridCalcul", lib("actiuni-semnale.js") + "; return ActiuniSemnale;")(GridCalcul);
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", lib("probabilitati.js") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);
const Retea = new Function("Probabilitati", lib("retea.js") + "; return Retea;")(Probabilitati);
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const ORA = 3600000;

console.log("Proba v100.80 · rețeaua: trăsăturile, intrările, trecerea înainte, pragul");
const b = bare(2000, { seed: 7 }), btc = bare(2000, { seed: 11, p0: 60000 });

await test("(1) trăsăturile la bara i nu văd nimic de după: aceleași cu și fără barele (și BTC-ul) de după i; null sub 30 de zile (720 de bare)", () => {
  const cu = Retea.trasaturiBare(b, 1500, btc), fara = Retea.trasaturiBare(b.slice(0, 1501), 1500, btc.slice(0, 1501));
  assert.ok(cu && cu.x.length === Retea.TRASATURI.length && Retea.TRASATURI.length === 17, JSON.stringify(cu && cu.x));
  assert.deepEqual(fara.x, cu.x);
  assert.equal(cu.t, b[1500].t + ORA, "momentul deciziei = închiderea barei i");
  assert.equal(Retea.trasaturiBare(b, 719, btc), null);
  const viitor = btc.concat(bare(50, { seed: 3, t0: btc[btc.length - 1].t + ORA, p0: 1 }));
  assert.deepEqual(Retea.trasaturiBare(b, 1500, viitor).x, cu.x);
});

await test("(1) fără BTC (fișa fără Pionex): trăsăturile BTC sunt 0, restul rămân aceleași", () => {
  const cu = Retea.trasaturiBare(b, 1500, btc), f0 = Retea.trasaturiBare(b, 1500, null);
  assert.deepEqual(f0.x.slice(0, 15), cu.x.slice(0, 15)); assert.deepEqual(f0.x.slice(15), [0, 0]);
});

await test("(1) trăsăturile sunt tăiate la ±10 (o urcare bruscă după liniște nu strică rețeaua); o serie fără mișcare -> null, nu NaN", () => {
  const plat = Array.from({ length: 900 }, (_, i) => ({ t: Date.UTC(2025, 0, 1) + i * ORA, o: 100, h: 100.0001, l: 99.9999, c: 100 * (1 + (i % 2 ? 1e-6 : -1e-6)) }));
  let pret = 100;   // urcarea alternează 3% și 1% (pași egali ar da volatilitate zero -> null)
  const urca = plat.concat(Array.from({ length: 30 }, (_, k) => { const o1 = pret; pret = o1 * (k % 2 ? 1.01 : 1.03); return { t: plat[899].t + (k + 1) * ORA, o: o1, h: pret, l: o1, c: pret }; }));
  const f = Retea.trasaturiBare(urca, urca.length - 1, null);
  assert.ok(f.x.every((v) => v >= -10 && v <= 10), JSON.stringify(f.x));
  assert.ok(f.x.some((v) => Math.abs(v) === 10), "nicio trăsătură tăiată: " + JSON.stringify(f.x));
  const mort = Array.from({ length: 900 }, (_, i) => ({ t: Date.UTC(2025, 0, 1) + i * ORA, o: 100, h: 100, l: 100, c: 100 }));
  assert.equal(Retea.trasaturiBare(mort, 899, null), null);
});

await test("(1) intrarea pe țintă: atinge (distanța, în volatilități, semnul), cursa, liniștea, direcția; fără distanță -> null", () => {
  const f = Retea.trasaturiBare(b, 1500, btc);
  const a = Retea.intrare("atinge-24", f, { rel: -0.03, H: 24 });
  assert.equal(a.length, 20); assert.equal(a[17], -0.03); assert.equal(a[19], -1);
  assert.ok(Math.abs(a[18] - Math.min(10, 0.03 / (f.s1 * Math.sqrt(24)))) < 1e-12, String(a[18]));
  assert.equal(Retea.intrare("atinge-72", f, { rel: 0, H: 72 }), null);
  assert.equal(Retea.intrare("cursa", f, { relT: 0.05, relS: -0.03 }).length, 21);
  assert.equal(Retea.intrare("liniste", f, { H: 48 }).length, 18);
  assert.deepEqual(Retea.intrare("directie", f, {}), f.x);
  assert.equal(Retea.intrare("necunoscuta", f, {}), null);
});

await test("(1) rezultatul tău: rata ta doar din boții închiși ÎNAINTE de pornire, trasă spre medie (k = 10); piața la pornire = trăsăturile barei de dinainte", () => {
  const por = b[1500].t + ORA + 1800000, t = { moneda: "AAVE", dir: "long", levier: 5, jos: 90, sus: 110, pasNet: 0.004, pus: 50, pornit: por };
  const ist = [{ moneda: "AAVE", net: 2, inchis: por - 86400000 }, { moneda: "AAVE", net: -1, inchis: por - ORA }, { moneda: "X", net: 3, inchis: por - 2 * ORA }, { moneda: "AAVE", net: 5, inchis: por + ORA }];
  const r = Retea.trasaturiBot(t, b, btc, ist);
  assert.equal(r.n, 3); assert.ok(Math.abs(r.glob - 2 / 3) < 1e-12, String(r.glob));
  assert.ok(Math.abs(r.rata - (1 + 10 * (2 / 3)) / (2 + 10)) < 1e-12, String(r.rata));
  assert.equal(r.x.length, 26); assert.equal(r.x[7], r.rata);
  assert.deepEqual(r.x.slice(9), Retea.trasaturiBare(b, Retea.indexLa(b, por), btc).x);
  assert.equal(Retea.indexLa(b, por), 1500);
  assert.equal(Retea.trasaturiBot({ ...t, sus: 80 }, b, btc, ist), null, "gridul întors -> null");
});

await test("(1) trecerea înainte = socoteala de mână (normalizarea, relu, sigmoid, media ansamblului); intrare greșită -> null", () => {
  const m = { versiune: Retea.VERSIUNE, norm: { m: [1, 0], s: [2, 0] }, ansamblu: [
    [{ W: [[1, -1], [0.5, 2]], b: [0, 0.1], act: "relu" }, { W: [[1], [-1]], b: [0.2], act: "sigmoid" }],
    [{ W: [[0.3], [0.3]], b: [-0.1], act: "sigmoid" }]] };
  const sig = (v) => 1 / (1 + Math.exp(-v));
  // z = [(3−1)/2, (4−0)/1] = [1, 4]; membrul 1: relu([1+2, −1+8+0,1]) = [3; 7,1] -> sig(3 − 7,1 + 0,2); membrul 2: sig(0,3 + 1,2 − 0,1)
  assert.ok(Math.abs(Retea.prezice(m, [3, 4]) - (sig(-3.9) + sig(1.4)) / 2) < 1e-12);
  assert.equal(Retea.prezice(m, [3]), null); assert.equal(Retea.prezice(null, [3, 4]), null); assert.equal(Retea.prezice(m, [3, NaN]), null);
});

await test("(1) pragul „dovedită”: toate patru; motivele în ordine (în lucru, prea puține cazuri, reperul, formula simplă, ultimele 3 luni, log-loss)", () => {
  const v = { luni: 11, luniGata: 11, nIndep: 300, reper: "🎲", brier: 0.17, brierReper: 0.18, brierLog: 0.175, ic: [0.01, 0.09], icLog: [0.005, 0.04], bss3: 0.02, logloss: 0.5, loglossReper: 0.52, loglossLog: 0.51 };
  assert.deepEqual(Retea.decide(v), { dovedita: true, motiv: null });
  assert.equal(Retea.decide({ ...v, luniGata: 6 }).motiv, "verificarea în lucru: 6 din 11 luni");
  assert.equal(Retea.decide({ ...v, nIndep: 48 }).motiv, "prea puține cazuri: 48 din 100");
  assert.equal(Retea.decide({ ...v, ic: [-0.01, 0.05] }).motiv, "nu bate 🎲 (Brier 0,170 față de 0,180)");
  assert.equal(Retea.decide({ ...v, icLog: [-0.002, 0.03] }).motiv, "nu face mai mult decât o formulă simplă");
  assert.equal(Retea.decide({ ...v, bss3: -0.01 }).motiv, "pică pe ultimele 3 luni");
  assert.equal(Retea.decide({ ...v, bss3: null }).motiv, "pică pe ultimele 3 luni");
  assert.equal(Retea.decide({ ...v, logloss: 0.515 }).motiv, "log-loss mai rău decât formula simplă");
  assert.equal(Retea.decide({ ...v, logloss: 0.53, loglossLog: 0.54 }).motiv, "log-loss mai rău decât 🎲");
  assert.equal(Retea.decide(null).motiv, "neverificată încă");
});

await test("(1) verdictul pe model: vechimea peste 2 zile se spune; altă versiune a trăsăturilor -> null (modelul vechi nu se folosește)", () => {
  const v = { luni: 11, luniGata: 11, nIndep: 300, reper: "🎲", brier: 0.17, brierReper: 0.18, brierLog: 0.175, ic: [0.01, 0.09], icLog: [0.005, 0.04], bss3: 0.02, logloss: 0.5, loglossReper: 0.52, loglossLog: 0.51 };
  const mod = { tinta: "atinge-72", versiune: Retea.VERSIUNE, la: Date.UTC(2026, 9, 1), verificare: v };
  const azi = Retea.verdict(mod, Date.UTC(2026, 9, 2));
  assert.deepEqual(azi, { dovedita: true, motiv: null, nIndep: 300, bloc: 72, vechi: null });
  assert.equal(Retea.verdict(mod, Date.UTC(2026, 9, 4, 1)).vechi, 3);
  assert.equal(Retea.verdict({ ...mod, versiune: "r0" }, Date.UTC(2026, 9, 2)), null);
  assert.equal(Retea.verdict(null, Date.now()), null);
  assert.equal(Retea.verdict({ ...mod, verificare: null }, Date.UTC(2026, 9, 2)).motiv, "neverificată încă");
});

console.log("\n" + (pica ? "V100.80 PICA · " + pica + " din " + (ok + pica) : "V100.80 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080.mjs`
Expected: eroare la încărcare (`ENOENT … public/lib/retea.js`). Fișierul nu există încă.

- [ ] **Step 3: Scrie `public/lib/retea.js`** (cu Write; are regex-uri cu backslash):

```js
// Rețeaua neuronală (specul docs/superpowers/specs/2026-10-02-retea-neuronala-design.md, livrarea 1 - boții, v100.80): trăsăturile
// (O SINGURĂ funcție pentru istoric și pentru „acum” - antrenarea și folosirea văd aceleași cifre), intrările pe țintă, trecerea
// înainte (fără TensorFlow: greutățile vin din retea/antreneaza.mjs) și pragul „dovedită”. Modul pur: îl folosesc colectorul, fișa
// (în browser) și antrenorul. Se încarcă DUPĂ text-ro.js, grid-calcul.js și probabilitati.js. A doua părere: nu schimbă semaforul,
// verdictul, poarta, alertele sau 🎲.
var Retea = (function () {
  "use strict";
  var ORA = 3600000, ZI = 864e5, ISTORIE = 720, VERSIUNE = "r1", MIN_INDEP = 100, LIM = 10;
  var TRASATURI = ["z1", "z4", "z24", "z168", "volRel", "dMax7", "dMin7", "panta4", "panta24", "miscare", "dirStare", "oraSin", "oraCos", "ziSin", "ziCos", "btcZ24", "btcVolRel"];
  // ținta -> orele blocului independent: zilele (24 h), 3 zile (72 h), săptămânile (7 zile), 2 zile (liniștea 24/48 h)
  var TINTE = { "atinge-24": { bloc: 24 }, "atinge-72": { bloc: 72 }, "atinge-168": { bloc: 168 }, cursa: { bloc: 168 }, liniste: { bloc: 48 }, directie: { bloc: 24 }, rezultat: { bloc: 24 } };
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function taie(v) { return !isFinite(v) ? 0 : v > LIM ? LIM : v < -LIM ? -LIM : v; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function num(v, z) { return typeof TextRo !== "undefined" && TextRo.num ? TextRo.num(v, z) : String(v); }
  // abaterea randamentelor de 1 h (log) pe barele (i − n, i]
  function sigma(b, i, n) { var s = 0, s2 = 0; for (var j = i - n + 1; j <= i; j++) { var r = Math.log(b[j].c / b[j - 1].c); s += r; s2 += r * r; } var m = s / n, v = s2 / n - m * m; return v > 0 ? Math.sqrt(v) : 0; }
  // panta prețului (log) pe ultimele n bare, prin cele mai mici pătrate, pe toată fereastra
  function panta(b, i, n) { var sx = 0, sy = 0, sxx = 0, sxy = 0; for (var k = 0; k < n; k++) { var y = Math.log(b[i - n + 1 + k].c); sx += k; sy += y; sxx += k * k; sxy += k * y; } var d = n * sxx - sx * sx; return d > 0 ? (n * sxy - sx * sy) / d * (n - 1) : 0; }
  // ultima bară ÎNCHEIATĂ la momentul t (b[i].t + ORA <= t); -1 dacă nu e niciuna
  function indexLa(b, t) { var lo = 0, hi = (Array.isArray(b) ? b.length : 0) - 1, i = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (b[m].t + ORA <= t) { i = m; lo = m + 1; } else hi = m - 1; } return i; }
  // BTC la același moment: randamentul pe 24 h și volatilitatea pe 24 h față de 7 zile (ajung 169 de bare - fișa le ia din Pionex)
  function btcLa(btc, t) {
    var j = indexLa(btc, t); if (j < 169) return [0, 0];
    var s24 = sigma(btc, j, 24), s168 = sigma(btc, j, 168);
    return s24 > 0 ? [Math.log(btc[j].c / btc[j - 24].c) / (s24 * Math.sqrt(24)), s168 > 0 ? Math.log(s24 / s168) : 0] : [0, 0];
  }
  // TRĂSĂTURILE la bara închisă i: doar b[0..i] și BTC-ul de până la același moment; stare(i) = starea 🎲 (implicit Probabilitati.stareLa).
  // -> { x: 17 cifre tăiate la ±10, s1 (abaterea orară pe 24 h), c, stare, t (momentul deciziei) }; null sub 30 de zile sau fără mișcare
  function trasaturiBare(b, i, btc, stare) {
    if (!Array.isArray(b) || !(i >= ISTORIE) || i >= b.length) return null;
    var c = b[i].c, s1 = sigma(b, i, 24), s168 = sigma(b, i, 168), s720 = sigma(b, i, 720);
    if (!(c > 0) || !(s1 > 0) || !(s168 > 0)) return null;
    var mx = -Infinity, mn = Infinity; for (var j = i - 167; j <= i; j++) { if (b[j].h > mx) mx = b[j].h; if (b[j].l < mn) mn = b[j].l; }
    var r = function (k) { return Math.log(c / b[i - k].c); }, d24 = s168 * Math.sqrt(24), t = b[i].t + ORA;
    var st = typeof stare === "function" ? stare(i) : Probabilitati.stareLa(b, i), ora = new Date(t).getUTCHours(), zi = new Date(t).getUTCDay(), bt = btcLa(btc, t);
    var x = [r(1) / s1, r(4) / (2 * s1), r(24) / (s1 * Math.sqrt(24)), r(168) / (s168 * Math.sqrt(168)), s720 > 0 ? Math.log(s1 / s720) : 0,
      Math.log(mx / c) / d24, Math.log(c / mn) / d24, panta(b, i, 4) / (2 * s1), panta(b, i, 24) / (s1 * Math.sqrt(24)),
      st && st.indexOf("miscare") === 0 ? 1 : 0, st && /-sus$/.test(st) ? 1 : st && /-jos$/.test(st) ? -1 : 0,
      Math.sin(2 * Math.PI * ora / 24), Math.cos(2 * Math.PI * ora / 24), Math.sin(2 * Math.PI * zi / 7), Math.cos(2 * Math.PI * zi / 7), bt[0], bt[1]].map(taie);
    return { x: x, s1: s1, c: c, stare: st || null, t: t };
  }
  // intrările pe țintă = trăsăturile + ce cere ținta: distanța (simplă și în volatilități pe orizont) și semnul; la cursă, ambele distanțe
  function intrare(tinta, f, e) {
    if (!f) return null; e = e || {}; var sH = function (H) { return f.s1 * Math.sqrt(H); };
    if (/^atinge-\d+$/.test(tinta)) { var rel = nr(e.rel), H = nr(e.H); if (rel === null || rel === 0 || !(H > 0)) return null; return f.x.concat([rel, taie(Math.abs(rel) / sH(H)), rel > 0 ? 1 : -1]); }
    if (tinta === "cursa") { var T = nr(e.relT), S = nr(e.relS); if (T === null || S === null || T === 0 || S === 0) return null; return f.x.concat([T, S, taie(Math.abs(T) / sH(168)), taie(Math.abs(S) / sH(168))]); }
    if (tinta === "liniste") { var h = nr(e.H); if (!(h > 0)) return null; return f.x.concat([h / 48]); }
    if (tinta === "directie") return f.x.slice();
    return null;
  }
  // „Rezultatul tău”: botul (forma JurnalTrade) la pornire - setarea, rata ta de până atunci (DOAR boții închiși înainte de pornire, trasă
  // spre medie cu k = 10) și piața la pornire. Prețul de pornire = închiderea barei de dinainte (la fel la istoric, la botul care rulează
  // și la fișă). -> { x: 9 + 17 cifre, glob, rata, n }; null fără 30 de zile de bare la pornire sau cu gridul stricat
  function trasaturiBot(t, b, btc, ist, stare) {
    var por = nr(t && t.pornit), jos = nr(t && t.jos), sus = nr(t && t.sus);
    if (por === null || jos === null || sus === null || !(sus > jos) || !(jos > 0)) return null;
    var f = trasaturiBare(b, indexLa(b, por), btc, stare); if (!f) return null;
    var inainte = (Array.isArray(ist) ? ist : []).filter(function (x) { return x && nr(x.inchis) !== null && x.inchis <= por && nr(x.net) !== null; });
    var n = inainte.length, glob = n ? inainte.filter(function (x) { return x.net > 0; }).length / n : 0.5;
    var peM = inainte.filter(function (x) { return x.moneda === t.moneda; }), plusM = peM.filter(function (x) { return x.net > 0; }).length;
    var rata = (plusM + 10 * glob) / (peM.length + 10), inv = nr(t.pus) > 0 ? nr(t.pus) : nr(t.investit) > 0 ? nr(t.investit) : 0, pas = nr(t.pasNet);
    var dir = String(t.dir || "").toLowerCase(), lev = nr(t.levier) > 0 ? nr(t.levier) : 1;
    var x = [dir === "long" ? 1 : dir === "short" ? -1 : 0, Math.log(lev), Math.log((sus - jos) / f.c), pas > 0 ? Math.log(pas) : 0, pas > 0 ? 0 : 1,
      Math.min(1, Math.max(0, (f.c - jos) / (sus - jos))), Math.log(1 + inv), rata, Math.log(1 + peM.length)].map(taie);
    return { x: x.concat(f.x), glob: glob, rata: rata, n: n };
  }
  // trecerea înainte: normalizarea modelului, apoi straturile (W[intrare][ieșire], b, act), media ansamblului; null la intrare greșită
  function prezice(model, x) {
    if (!model || !model.norm || !Array.isArray(model.norm.m) || !Array.isArray(model.ansamblu) || !model.ansamblu.length || !Array.isArray(x) || x.length !== model.norm.m.length) return null;
    var z = new Array(x.length);
    for (var k = 0; k < x.length; k++) { var v = nr(x[k]); if (v === null) return null; var s = nr(model.norm.s[k]); z[k] = (v - model.norm.m[k]) / (s > 0 ? s : 1); }
    var sum = 0;
    for (var e = 0; e < model.ansamblu.length; e++) {
      var h = z;
      for (var L = 0; L < model.ansamblu[e].length; L++) {
        var st = model.ansamblu[e][L], out = new Array(st.b.length);
        for (var o = 0; o < out.length; o++) { var a = st.b[o]; for (var q = 0; q < h.length; q++) a += h[q] * st.W[q][o]; out[o] = st.act === "relu" ? (a > 0 ? a : 0) : st.act === "sigmoid" ? 1 / (1 + Math.exp(-a)) : a; }
        h = out;
      }
      sum += h[0];
    }
    var p = sum / model.ansamblu.length; return isFinite(p) ? p : null;
  }
  // pragul „dovedită” (specul): toate patru, față de reper ȘI de formula simplă; altfel motivul, în ordinea în care cade
  function decide(v) {
    if (!v) return { dovedita: false, motiv: "neverificată încă" };
    if (nr(v.luniGata) !== null && nr(v.luni) !== null && v.luniGata < v.luni) return { dovedita: false, motiv: "verificarea în lucru: " + v.luniGata + " din " + cate(v.luni, "lună", "luni") };
    if (!(nr(v.nIndep) >= MIN_INDEP)) return { dovedita: false, motiv: "prea puține cazuri: " + (nr(v.nIndep) || 0) + " din " + MIN_INDEP };
    var rep = v.reper || "🎲";
    if (!(v.ic && v.ic[0] > 0)) return { dovedita: false, motiv: "nu bate " + rep + " (Brier " + num(v.brier, 3) + " față de " + num(v.brierReper, 3) + ")" };
    if (!(v.icLog && v.icLog[0] > 0)) return { dovedita: false, motiv: "nu face mai mult decât o formulă simplă" };
    if (!(nr(v.bss3) !== null && v.bss3 >= 0)) return { dovedita: false, motiv: "pică pe ultimele 3 luni" };
    if (!(v.logloss <= v.loglossReper)) return { dovedita: false, motiv: "log-loss mai rău decât " + rep };
    if (!(v.logloss <= v.loglossLog)) return { dovedita: false, motiv: "log-loss mai rău decât formula simplă" };
    return { dovedita: true, motiv: null };
  }
  // verdictul unui model, pentru pagini: null fără model sau pe altă versiune a trăsăturilor (modelul vechi nu se folosește)
  function verdict(m, acum) {
    if (!m || m.versiune !== VERSIUNE) return null;
    var d = decide(m.verificare || null), v = m.verificare || {}, la = nr(m.la), z = la !== null ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null;
    return { dovedita: d.dovedita, motiv: d.motiv, nIndep: nr(v.nIndep) || 0, bloc: (TINTE[m.tinta] || { bloc: 24 }).bloc, vechi: z !== null && z >= 2 ? z : null };
  }
  return { VERSIUNE: VERSIUNE, TRASATURI: TRASATURI, TINTE: TINTE, ORA: ORA, indexLa: indexLa, trasaturiBare: trasaturiBare, intrare: intrare, trasaturiBot: trasaturiBot, prezice: prezice, decide: decide, verdict: verdict };
})();
if (typeof globalThis !== "undefined") globalThis.Retea = Retea;
```

Note pentru executor:
- Testul `decide({…, logloss: 0.515})` cade pe formula simplă (0,515 > 0,51), nu pe reper (0,515 ≤ 0,52). Ordinea din cod e cea a specului: întâi reperul, apoi formula.
- `x[7]` din `trasaturiBot` e `rata`. Proba o citește.

- [ ] **Step 4: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080.mjs`
Expected: `V100.80 PASS · 8/8`

- [ ] **Step 5: Leagă proba în `npm test`** — în `package.json`, după `"test:v10078": "node scripts/proba-v10078.mjs"` adaugă `"test:v10080": "node scripts/proba-v10080.mjs"`, iar lanțul `test` primește la coadă `&& npm run test:v10080`. Folosește Edit pe textul exact `&& npm run test:v10078",`.

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))" && npm run test:v10080`
Expected: `V100.80 PASS · 8/8`

- [ ] **Step 6: Commit** (lanțul casei, fără `;`):

```bash
npm test > "$SCRATCH/npm-test-80-1.log" 2>&1 && git add public/lib/retea.js scripts/lib/bare-proba.mjs scripts/proba-v10080.mjs package.json && git commit -q -m "feat(retea): modulul pur retea.js — trăsăturile fără privire în viitor, intrările, trecerea înainte, pragul (livrarea 1, task 1)" && echo GATA
```

---

### Task 2: `retea/` — TensorFlow.js pe WebAssembly: modelul, exportul, viteza

**Files:**
- Create: `retea/package.json`, `retea/package-lock.json` (din `npm install`)
- Create: `retea/model.mjs`
- Create: `scripts/proba-v10080-tf.mjs`
- Modify: `package.json` (`test:v10080tf` + lanțul `test`)

**Interfaces:**
- Consumes: `Retea.prezice(model, x)` (Task 1).
- Produces:
  - `HIPER = {ascunse: [16, 8], l2: 1e-3, dropout: 0.2, lr: 1e-3, lot: 256, epoci: 60, rabdare: 5, validare: 0.2, seminte: 5}`;
  - `porneste() -> Promise<"wasm">`;
  - `cuSamanta(seed) -> () => number`;
  - `construieste(nIn, ascunse, rata) -> tf.Sequential`;
  - `exporta(m) -> [{W, b, act}]`;
  - `antreneaza(X: Float32Array, y: Float32Array, nIn, ascunse: number[], seed) -> Promise<{straturi, epoci, pierdere}>`.

- [ ] **Step 1: Scrie proba (roșie)** — `scripts/proba-v10080-tf.mjs`:

```js
// Proba v100.80 (TF) - rețeaua neuronală, livrarea 1: retea/model.mjs - TensorFlow.js pe WebAssembly (nu JS pur: de câteva sute de ori
// mai lent, lecția Busolei), ieșirea pornită de la rata de bază, aceeași predicție ca Retea.prezice pe greutățile exportate, semințele.
//   node scripts/proba-v10080-tf.mjs      (cere `npm --prefix retea install`)
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!fs.existsSync(path.join(RAD, "retea", "node_modules", "@tensorflow", "tfjs-backend-wasm"))) { console.log("✗ lipsește TensorFlow.js: rulează `npm --prefix retea install`"); process.exit(1); }
const MOD = await import(pathToFileURL(path.join(RAD, "retea", "model.mjs")).href), { tf } = MOD;   // o singură copie a TensorFlow (cea din retea/)
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const ActiuniSemnale = new Function("GridCalcul", lib("actiuni-semnale.js") + "; return ActiuniSemnale;")(GridCalcul);
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", lib("probabilitati.js") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);
const Retea = new Function("Probabilitati", lib("retea.js") + "; return Retea;")(Probabilitati);
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
// date sintetice: n rânduri × nIn, y = 1 când x0 + x1 > 0 (cu sămânță)
function date(n, nIn, seed) { const r = MOD.cuSamanta(seed), X = new Float32Array(n * nIn), y = new Float32Array(n); for (let i = 0; i < n; i++) { for (let k = 0; k < nIn; k++) X[i * nIn + k] = r() * 2 - 1; y[i] = X[i * nIn] + X[i * nIn + 1] > 0 ? 1 : 0; } return { X, y }; }

console.log("Proba v100.80 (TF) · TensorFlow.js pe WebAssembly, exportul, semințele");

await test("(2) backend-ul e WebAssembly și o epocă pe 50.000 de rânduri × 20 ține sub 10 s (Busola: ~1,1 s)", async () => {
  assert.equal(await MOD.porneste(), "wasm");
  const { X, y } = date(50000, 20, 1), m = MOD.construieste(20, MOD.HIPER.ascunse, 0.5), tx = tf.tensor2d(X, [50000, 20]), ty = tf.tensor2d(y, [50000, 1]);
  const t0 = Date.now(); await m.fit(tx, ty, { batchSize: 256, epochs: 1, verbose: 0 }); const s = (Date.now() - t0) / 1000;
  console.log("      o epocă: " + s.toFixed(2) + " s"); assert.ok(s < 10, s + " s");
  tx.dispose(); ty.dispose(); m.dispose();
});

await test("(2) ieșirea pornește de la rata de bază: înainte de antrenare, pe intrarea zero, rețeaua zice 30% când rata e 30%", async () => {
  for (const asc of [[16, 8], []]) { const m = MOD.construieste(5, asc, 0.3), p = m.predict(tf.zeros([1, 5])).dataSync()[0]; assert.ok(Math.abs(p - 0.3) < 1e-6, asc + ": " + p); m.dispose(); }
});

await test("(2) Retea.prezice pe greutățile exportate = predicția TensorFlow (diferența < 1e-5), și la rețea, și la formula simplă", async () => {
  const { X, y } = date(3000, 6, 5);
  for (const asc of [[16, 8], []]) {
    const m = MOD.construieste(6, asc, 0.5); await m.fit(tf.tensor2d(X, [3000, 6]), tf.tensor2d(y, [3000, 1]), { batchSize: 256, epochs: 3, verbose: 0 });
    const tfp = m.predict(tf.tensor2d(X.subarray(0, 200 * 6), [200, 6])).dataSync(), model = { versiune: Retea.VERSIUNE, norm: { m: [0, 0, 0, 0, 0, 0], s: [1, 1, 1, 1, 1, 1] }, ansamblu: [MOD.exporta(m)] };
    let max = 0; for (let i = 0; i < 200; i++) max = Math.max(max, Math.abs(Retea.prezice(model, Array.from(X.subarray(i * 6, i * 6 + 6))) - tfp[i]));
    assert.ok(max < 1e-5, asc + ": " + max); assert.equal(model.ansamblu[0].length, asc.length + 1, "straturile exportate (dropout n-are greutăți)");
    m.dispose();
  }
});

await test("(2) aceeași sămânță -> aceleași greutăți (inițializarea, dropout-ul, amestecarea); Math.random se pune la loc; învață ceva", async () => {
  const { X, y } = date(4000, 4, 9), rnd = Math.random;
  const a = await MOD.antreneaza(X, y, 4, MOD.HIPER.ascunse, 42), b = await MOD.antreneaza(X, y, 4, MOD.HIPER.ascunse, 42), c = await MOD.antreneaza(X, y, 4, MOD.HIPER.ascunse, 43);
  assert.equal(Math.random, rnd);
  assert.deepEqual(a.straturi, b.straturi); assert.notDeepEqual(a.straturi, c.straturi);
  assert.ok(a.epoci >= 1 && a.pierdere < 0.5, JSON.stringify({ epoci: a.epoci, pierdere: a.pierdere }));
});

console.log("\n" + (pica ? "V100.80 TF PICA · " + pica + " din " + (ok + pica) : "V100.80 TF PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

Notă pentru executor: proba folosește `tf` exportat de `retea/model.mjs` (`export { tf }`), ca să nu existe două copii ale TensorFlow în proces.

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080-tf.mjs`
Expected: `✗ lipsește TensorFlow.js: rulează npm --prefix retea install` (exit 1).

- [ ] **Step 3: `retea/package.json` + instalarea**

```json
{
  "name": "crypto-radar-retea",
  "private": true,
  "type": "module",
  "description": "Antrenorul rețelei neuronale (TensorFlow.js pe WebAssembly). Rulează doar acasă, noaptea, pornit de colector; rădăcina proiectului rămâne fără dependențe.",
  "dependencies": {
    "@tensorflow/tfjs": "4.22.0",
    "@tensorflow/tfjs-backend-wasm": "4.22.0"
  }
}
```

Run: `npm --prefix retea install && git check-ignore -v retea/node_modules/@tensorflow/tfjs/package.json`
Expected: instalarea se termină fără erori, iar `check-ignore` arată `.gitignore:…:node_modules/` (node_modules e ignorat la orice nivel).

- [ ] **Step 4: Scrie `retea/model.mjs`:**

```js
// Rețeaua (specul, „Antrenarea”): TensorFlow.js pe WebAssembly. Rețeaua mică (16 relu → dropout 0,2 → 8 relu → 1 sigmoid) și formula
// simplă (fără strat ascuns) se antrenează LA FEL: Adam 1e-3, loturi de 256, cel mult 60 de epoci, oprire timpurie pe ultimii 20% din
// rânduri (în ordinea timpului), răbdare 5; L2 1e-3 pe toate straturile; ieșirea pornește de la rata de bază (bias = logit(rata) -
// lecția Busolei). Math.random e înlocuit cu un generator cu sămânță cât se lucrează la un model (inițializarea, dropout-ul fără
// sămânță fixă - una fixă ar repeta masca la fiecare lot -, amestecarea loturilor). Greutățile ies în forma citită de Retea.prezice.
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
export { tf };

export const HIPER = Object.freeze({ ascunse: [16, 8], l2: 1e-3, dropout: 0.2, lr: 1e-3, lot: 256, epoci: 60, rabdare: 5, validare: 0.2, seminte: 5 });
let gata = false;
export async function porneste() { if (!gata) { await tf.setBackend("wasm"); await tf.ready(); gata = true; } return tf.getBackend(); }
// mulberry32: aceeași sămânță -> același șir
export function cuSamanta(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function construieste(nIn, ascunse, rata) {
  const m = tf.sequential(), l2 = () => tf.regularizers.l2({ l2: HIPER.l2 });
  ascunse.forEach((u, k) => {
    m.add(tf.layers.dense({ units: u, activation: "relu", kernelRegularizer: l2(), ...(k === 0 ? { inputShape: [nIn] } : {}) }));
    if (k === 0) m.add(tf.layers.dropout({ rate: HIPER.dropout }));
  });
  m.add(tf.layers.dense({ units: 1, activation: "sigmoid", kernelRegularizer: l2(), ...(ascunse.length ? {} : { inputShape: [nIn] }) }));
  const r = Math.min(0.99, Math.max(0.01, rata)), ultim = m.layers[m.layers.length - 1], [W] = ultim.getWeights(), bias = tf.tensor1d([Math.log(r / (1 - r))]);
  ultim.setWeights([W, bias]); bias.dispose();
  m.compile({ optimizer: tf.train.adam(HIPER.lr), loss: "binaryCrossentropy" });
  return m;
}
const p7 = (v) => Number(v.toPrecision(7));
export function exporta(m) {
  return m.layers.filter((L) => L.getWeights().length === 2).map((L) => {
    const [W, b] = L.getWeights(), act = L.getConfig().activation;
    return { W: W.arraySync().map((r) => r.map(p7)), b: b.arraySync().map(p7), act: act === "relu" || act === "sigmoid" ? act : "liniar" };
  });
}
// X: Float32Array (n × nIn, rândurile în ordinea timpului, deja normalizate), y: Float32Array (n) -> { straturi, epoci, pierdere }
export async function antreneaza(X, y, nIn, ascunse, seed) {
  await porneste();
  const vechi = Math.random; Math.random = cuSamanta(seed);
  let m = null, tx = null, ty = null, vx = null, vy = null, best = null;
  try {
    const n = y.length, nv = Math.max(1, Math.floor(n * HIPER.validare)), nt = n - nv;
    let rata = 0; for (let k = 0; k < nt; k++) rata += y[k]; rata /= Math.max(1, nt);
    m = construieste(nIn, ascunse, rata);
    tx = tf.tensor2d(X.subarray(0, nt * nIn), [nt, nIn]); ty = tf.tensor2d(y.subarray(0, nt), [nt, 1]);
    vx = tf.tensor2d(X.subarray(nt * nIn, n * nIn), [nv, nIn]); vy = tf.tensor2d(y.subarray(nt, n), [nv, 1]);
    let cel = Infinity, rabdare = 0, epoci = 0;
    for (let ep = 0; ep < HIPER.epoci; ep++) {
      await m.fit(tx, ty, { batchSize: HIPER.lot, epochs: 1, shuffle: true, verbose: 0 });
      const v = tf.tidy(() => tf.metrics.binaryCrossentropy(vy, m.predict(vx)).mean().dataSync()[0]);
      if (v < cel - 1e-5) { cel = v; rabdare = 0; epoci = ep + 1; if (best) best.forEach((g) => g.dispose()); best = m.getWeights().map((g) => g.clone()); }
      else if (++rabdare >= HIPER.rabdare) break;
    }
    if (best) m.setWeights(best);
    return { straturi: exporta(m), epoci, pierdere: cel };
  } finally {
    Math.random = vechi;
    for (const t of [tx, ty, vx, vy]) if (t) t.dispose();
    if (best) best.forEach((g) => g.dispose());
    if (m) { if (m.optimizer) m.optimizer.dispose(); m.dispose(); }
  }
}
```

- [ ] **Step 5: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080-tf.mjs`
Expected: `V100.80 TF PASS · 4/4`. Rândul „o epocă: X s” arată X sub 10.
Dacă X ≥ 10: oprește-te. Specul cere WebAssembly; verifică `tf.getBackend()` înainte de orice altă schimbare.

- [ ] **Step 6: Leagă proba în `npm test`:**
- adaugă scriptul `"test:v10080tf": "node scripts/proba-v10080-tf.mjs"`;
- adaugă la coada lanțului `&& npm run test:v10080tf`.

Run: `npm run test:v10080tf`
Expected: `V100.80 TF PASS · 4/4`

- [ ] **Step 7: Commit:**

```bash
npm test > "$SCRATCH/npm-test-80-2.log" 2>&1 && git add retea/package.json retea/package-lock.json retea/model.mjs scripts/proba-v10080-tf.mjs package.json && git commit -q -m "feat(retea): antrenorul TF.js pe WebAssembly — modelul, exportul, semințele (livrarea 1, task 2)" && echo GATA
```

---

### Task 3: `retea/date.mjs` — rândurile pe țintă, etichetele doar de după t, reperul 🎲 la momentul rândului

**Files:**
- Create: `retea/date.mjs`
- Create: `scripts/proba-v10080-date.mjs`
- Modify: `package.json` (`test:v10080date` + lanțul)

**Interfaces:**
- Consumes:
  - din Task 1: `Retea.trasaturiBare`, `Retea.intrare`, `Retea.trasaturiBot`, `Retea.TINTE`;
  - din 🎲: `Probabilitati.stareLa(b, i)`, `Probabilitati.atinge(rel)`, `Probabilitati.cursa(relT, relS)` (întoarce `"tinta" | "stop" | "niciuna"`), `Probabilitati.frecventa(bare, H, ev, asteptat, stareAcum, opt)`.
- Produces:
  - `ORA`, `PAS = 4`, `GRILA`, `CURSA`;
  - `ORIZONT = {"atinge-24": 24, "atinge-72": 72, "atinge-168": 168, cursa: 168, liniste: 48, directie: 24}`;
  - `incarcaModulele(radCod) -> {G, P, R}`;
  - `simboluri(rad) -> string[]`;
  - `citesteBare(rad, simbol, G) -> bare[]`;
  - `randuriMoneda(tinta, s, b, btc, M, memo) -> [{t, s, i, e, y, x, tEt}]`;
  - `reperRand(tinta, b, r, M, memo) -> number | null`;
  - `randuriBoti(boti, bareDe, btc, M) -> [{t, s, y, x, tEt, r1, r2}]`.

- [ ] **Step 1: Scrie proba (roșie)** — `scripts/proba-v10080-date.mjs`:

```js
// Proba v100.80 (date) - rețeaua neuronală, livrarea 1: retea/date.mjs - rândurile pe țintă: trăsăturile = Retea.trasaturiBare la i,
// etichetele DOAR din barele de după t (în orizont), fereastra cu gaură nu dă rând, reperul 🎲 = Probabilitati.frecventa pe barele
// de până la t, „rezultatul tău” fără boții închiși după pornire.
//   node scripts/proba-v10080-date.mjs
import "./lib/text-ro-global.mjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const D = await import(pathToFileURL(path.join(RAD, "retea", "date.mjs")).href);
const M = D.incarcaModulele(RAD), { P, R } = M, ORA = 3600000;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.80 (date) · rândurile, etichetele, reperul 🎲");
const b = bare(1400, { seed: 21 }), btc = bare(1400, { seed: 22, p0: 60000 });

await test("(3) rândurile atinge-24: la fiecare 4 h de la bara 720, trăsăturile = Retea.trasaturiBare(b, i), tEt = t + 24 h", () => {
  const r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b, btc, M, {});
  assert.ok(r.length > 100, String(r.length));
  for (const x of r.slice(0, 20)) {
    assert.equal(x.i % 4, 0); assert.ok(x.i >= 720);
    assert.deepEqual(x.x, R.intrare("atinge-24", R.trasaturiBare(b, x.i, btc), x.e));
    assert.equal(x.tEt, x.t + 24 * ORA); assert.equal(x.t, b[x.i].t + ORA);
  }
});

await test("(3) eticheta vine DOAR din barele i+1..i+H: barele de după fereastră nu o schimbă; o bară din fereastră care atinge nivelul o face 1", () => {
  const r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b, btc, M, {}), x = r.find((q) => q.e.rel < 0 && q.y === 0 && q.i + 60 < b.length);
  assert.ok(x, "niciun rând neatins");
  const b2 = b.map((q) => ({ ...q })); for (let k = x.i + 25; k < b2.length; k++) b2[k].l = b2[k].l * 0.5;   // după fereastră: prăbușire
  assert.equal(D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b2, btc, M, {}).find((q) => q.i === x.i).y, 0);
  const b3 = b.map((q) => ({ ...q })); b3[x.i + 24].l = b3[x.i].c * (1 + x.e.rel) * 0.999;               // ultima bară din fereastră
  assert.equal(D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b3, btc, M, {}).find((q) => q.i === x.i).y, 1);
});

await test("(3) fereastra cu gaură (o oră lipsă) nu dă rând - ca la 🎲", () => {
  const cuGaura = b.slice(0, 1000).concat(b.slice(1001));
  const r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", cuGaura, btc, M, {});
  assert.ok(!r.some((q) => q.i < 1000 && q.i + 24 >= 1000), "un rând traversează gaura");
});

await test("(3) cursa, liniștea, direcția: etichetele lor (ținta întâi; starea la i+h; închiderea de peste 24 h mai sus)", () => {
  const memo = {};
  for (const x of D.randuriMoneda("cursa", "AAA_USDT_PERP", b, btc, M, memo).slice(0, 30)) assert.equal(x.y, P.cursa(x.e.relT, x.e.relS)(b, x.i, 168) === "tinta" ? 1 : 0);
  const lin = D.randuriMoneda("liniste", "AAA_USDT_PERP", b, btc, M, memo);
  for (const x of lin.slice(0, 30)) { assert.ok(P.stareLa(b, x.i).indexOf("liniste") === 0); assert.equal(x.y, P.stareLa(b, x.i + x.e.H).indexOf("liniste") === 0 ? 1 : 0); assert.equal(x.tEt, x.t + x.e.H * ORA); }
  for (const x of D.randuriMoneda("directie", "AAA_USDT_PERP", b, btc, M, memo).slice(0, 30)) assert.equal(x.y, b[x.i + 24].c > b[x.i].c ? 1 : 0);
});

await test("(3) reperul 🎲 al unui rând = Probabilitati.frecventa pe barele de până la t (felia), nu pe toate", () => {
  const memo = {}, r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b, btc, M, memo).filter((q) => q.i > 1000)[0];
  const asteptat = P.frecventa(b.slice(0, r.i + 1), 24, P.atinge(r.e.rel), "da", P.stareLa(b, r.i), {});
  assert.equal(D.reperRand("atinge-24", b, r, M, memo), asteptat.p);
  assert.equal(D.reperRand("atinge-24", b.concat(bare(200, { seed: 99, t0: b[b.length - 1].t + ORA, p0: 1 })), r, M, {}), asteptat.p, "barele de după t au schimbat reperul");
});

await test("(3) rezultatul tău: rândul la pornire, y = net > 0, tEt = închiderea; rata ta nu vede boții închiși după pornire", () => {
  const t0 = b[900].t + ORA + 600000, bot = (o) => ({ moneda: "AAA", simbol: "AAA_USDT_PERP", dir: "long", levier: 3, jos: 95, sus: 105, pasNet: 0.003, pus: 40, ...o });
  const boti = [bot({ pornit: t0, inchis: t0 + 5 * ORA, net: 1.2 }), bot({ pornit: t0 + 2 * ORA, inchis: t0 + 30 * ORA, net: -2 }), bot({ pornit: t0 + 40 * ORA, inchis: t0 + 50 * ORA, net: 0.5 })];
  const r = D.randuriBoti(boti, () => b, btc, M);
  assert.equal(r.length, 3); assert.deepEqual(r.map((x) => x.y), [1, 0, 1]); assert.deepEqual(r.map((x) => x.tEt), boti.map((x) => x.inchis));
  assert.equal(r[1].r1, 0.5, "al doilea pornește înainte să se închidă primul: nicio rată știută -> 0,5");
  assert.equal(r[2].r1, 0.5, "al treilea: unul pe plus, unul pe minus închiși înainte");
});

console.log("\n" + (pica ? "V100.80 DATE PICA · " + pica + " din " + (ok + pica) : "V100.80 DATE PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

Notă pentru executor: al doilea bot din test pornește la `t0 + 2 h`, înainte ca primul să se închidă (`t0 + 5 h`). De aceea `r[1].r1 = 0,5`: nicio rată nu era știută atunci. Al treilea are doi boți închiși înainte (+1,2 și −2), deci rata e tot 0,5.

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080-date.mjs`
Expected: eroare la încărcare (`Cannot find module … retea/date.mjs`).

- [ ] **Step 3: Scrie `retea/date.mjs`:**

```js
// Datele rețelei (specul, „Trăsăturile” + „Antrenarea”): rândurile pe țintă din barele de 1 h (400 de zile, data/retea/ore + 185 de zile,
// data/istoric-1h) și din boții închiși (data/retea/boti.json). Trăsăturile cu Retea.trasaturiBare (aceeași funcție ca la „acum”),
// etichetele DOAR din barele de după t (Probabilitati.atinge / cursa / stareLa), reperul 🎲 cu Probabilitati.frecventa pe barele de
// până la t. Modulele paginii se încarcă aici, din codul proiectului (ca în colector).
import fs from "node:fs";
import path from "node:path";

export const ORA = 3600000, PAS = 4;
// distanțele pe orizont (specul: ±1, 2, 3, 5, 8, 12% pentru 24 h și 72 h, ±10–40% pentru lichidare) și perechile ținta/stop (long și short)
const MARGINI = [-0.12, -0.08, -0.05, -0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12];
export const GRILA = { 24: MARGINI, 72: MARGINI, 168: [-0.4, -0.3, -0.2, -0.15, -0.1, 0.1, 0.15, 0.2, 0.3, 0.4] };
export const CURSA = [[0.02, -0.02], [0.03, -0.03], [0.05, -0.03], [0.05, -0.05], [0.08, -0.05], [-0.02, 0.02], [-0.03, 0.03], [-0.05, 0.03], [-0.05, 0.05], [-0.08, 0.05]];
export const ORIZONT = { "atinge-24": 24, "atinge-72": 72, "atinge-168": 168, cursa: 168, liniste: 48, directie: 24 };

// modulele paginii (aceleași fișiere ca în browser): TextRo în globalThis, apoi GridCalcul, ActiuniSemnale, Probabilitati, Retea
export function incarcaModulele(radCod) {
  const src = (f) => fs.readFileSync(path.join(radCod, "public", "lib", f), "utf8");
  if (!globalThis.TextRo) globalThis.TextRo = new Function(src("text-ro.js") + "; return TextRo;")();
  const G = new Function(src("grid-calcul.js") + "; return GridCalcul;")();
  const AS = new Function("GridCalcul", src("actiuni-semnale.js") + "; return ActiuniSemnale;")(G);
  const P = new Function("GridCalcul", "ActiuniSemnale", src("probabilitati.js") + "; return Probabilitati;")(G, AS);
  const R = new Function("Probabilitati", src("retea.js") + "; return Retea;")(P);
  return { G, P, R };
}
const DIRS = (rad) => [path.join(rad, "data", "retea", "ore"), path.join(rad, "data", "istoric-1h")];
export function simboluri(rad) {
  const s = new Set();
  for (const d of DIRS(rad)) { try { for (const f of fs.readdirSync(d)) if (f.endsWith(".json")) s.add(f.slice(0, -5)); } catch {} }
  return [...s].sort();
}
// barele unei monede: depozitul de 400 de zile unit cu cel de 185 (pe `time`, fără dubluri) -> GridCalcul.bare (ultima, în curs, scoasă)
export function citesteBare(rad, simbol, G) {
  const h = new Map();
  for (const d of DIRS(rad)) { try { for (const r of JSON.parse(fs.readFileSync(path.join(d, simbol + ".json"), "utf8"))) if (r && Number.isFinite(Number(r.time))) h.set(Number(r.time), r); } catch {} }
  return G.bare([...h.values()]);
}
// rândurile unei ținte pe o monedă: la fiecare 4 h, de la bara 720; o combinație (distanța / perechea / orizontul liniștii) pe rând,
// aceeași la fiecare rulare (din numele monedei și din i). memo = stările 🎲 pe index (comun cu reperRand și cu trăsăturile).
export function randuriMoneda(tinta, s, b, btc, M, memo) {
  const out = [], H = ORIZONT[tinta], P = M.P, R = M.R, st = (i) => (i in memo ? memo[i] : (memo[i] = P.stareLa(b, i)));
  let sem = 7; for (const ch of s) sem = (sem * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 720; i + H < b.length; i += PAS) {
    if (b[i + H].t - b[i].t !== H * ORA) continue;   // fereastra cu gaură nu se ia (ca la 🎲)
    const f = R.trasaturiBare(b, i, btc, st); if (!f) continue;
    const k = (sem + i / PAS) >>> 0; let e, y, h = H;
    if (tinta.startsWith("atinge-")) { const g = GRILA[H], rel = g[k % g.length]; e = { rel, H }; y = P.atinge(rel)(b, i, H) === "da" ? 1 : 0; }
    else if (tinta === "cursa") { const [relT, relS] = CURSA[k % CURSA.length]; e = { relT, relS }; y = P.cursa(relT, relS)(b, i, H) === "tinta" ? 1 : 0; }
    else if (tinta === "liniste") { if (!f.stare || f.stare.indexOf("liniste") !== 0) continue; h = k % 2 ? 48 : 24; const s2 = st(i + h); if (s2 === null) continue; e = { H: h }; y = s2.indexOf("liniste") === 0 ? 1 : 0; }
    else if (tinta === "directie") { e = {}; y = b[i + 24].c > b[i].c ? 1 : 0; }
    else return out;
    const x = R.intrare(tinta, f, e); if (!x) continue;
    out.push({ t: f.t, s, i, e, y, x, tEt: f.t + h * ORA });
  }
  return out;
}
// reperul 🎲 al unui rând: frecvența din trecut la momentul lui (doar barele de până la t), exact ca Probabilitati.pentruBot
export function reperRand(tinta, b, r, M, memo) {
  const P = M.P, v = b.slice(0, r.i + 1), st = r.i in memo ? memo[r.i] : (memo[r.i] = P.stareLa(b, r.i));
  let q = null;
  if (tinta.startsWith("atinge-")) q = P.frecventa(v, ORIZONT[tinta], P.atinge(r.e.rel), "da", st, { memo });
  else if (tinta === "cursa") q = P.frecventa(v, 168, P.cursa(r.e.relT, r.e.relS), "tinta", st, { memo });
  else if (tinta === "liniste") q = P.frecventa(v, r.e.H, (bb, k, h, sf) => { const s2 = sf(k + h); return s2 === null ? null : s2.indexOf("liniste") === 0 ? "da" : "nu"; }, "da", st, { memo, doarConditionat: true });
  else if (tinta === "directie") q = P.frecventa(v, 24, (bb, k, h) => (bb[k + h].c > bb[k].c ? "da" : "nu"), "da", st, { memo });
  return q && Number.isFinite(q.p) ? q.p : null;
}
// „rezultatul tău”: un rând pe bot închis (la pornire), y = net > 0, tEt = închiderea (rezultatul se știe abia atunci);
// r1 = rata ta de până atunci, r2 = rata pe monedă trasă spre medie (reperele; verificarea îl ia pe cel mai greu)
export function randuriBoti(boti, bareDe, btc, M) {
  const l = (Array.isArray(boti) ? boti : []).filter((t) => t && Number.isFinite(t.pornit) && Number.isFinite(t.inchis) && Number.isFinite(t.net) && t.simbol).sort((a, b) => a.pornit - b.pornit), out = [];
  for (const t of l) {
    const b = bareDe(t.simbol); if (!b) continue;
    const f = M.R.trasaturiBot(t, b, btc, l); if (!f) continue;
    out.push({ t: t.pornit, s: t.moneda, y: t.net > 0 ? 1 : 0, x: f.x, tEt: t.inchis, r1: f.glob, r2: f.rata });
  }
  return out;
}
```

Notă: `reperRand` cu `{ memo }` dă aceeași stare ca `P.stareLa(felie, k)`. `stareLa` folosește doar barele de până la k, deci felia și seria întreagă au aceeași stare la orice k din felie.

- [ ] **Step 4: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080-date.mjs`
Expected: `V100.80 DATE PASS · 6/6`

- [ ] **Step 5: Leagă proba:**
- adaugă scriptul `"test:v10080date": "node scripts/proba-v10080-date.mjs"`;
- pune `&& npm run test:v10080date` în lanțul `test`, după `test:v10080`.

Run: `npm run test:v10080date && npm run test:v10080`
Expected: ambele PASS.

- [ ] **Step 6: Commit:**

```bash
npm test > "$SCRATCH/npm-test-80-3.log" 2>&1 && git add retea/date.mjs scripts/proba-v10080-date.mjs package.json && git commit -q -m "feat(retea): datele — rândurile pe țintă, etichetele doar de după t, reperul 🎲 la momentul rândului (livrarea 1, task 3)" && echo GATA
```

---

### Task 4: `retea/verifica.mjs` — lunile, pauza, normalizarea, măsurile, bootstrap pe două trepte

**Files:**
- Create: `retea/verifica.mjs`
- Create: `scripts/proba-v10080-verifica.mjs`
- Modify: `package.json` (`test:v10080ver` + lanțul)

**Interfaces:**
- Consumes: rândurile `{t, s, y, x, tEt, i?, e?, r1?, r2?}` (Task 3); `o.antreneaza(X, y, nIn, ascunse, seed)` (forma din Task 2); `o.prezice(model, x)` (`Retea.prezice`, Task 1).
- Produces:
  - lunile: `luna(t) -> "AAAA-LL"`, `inceputLuna(l)`, `lunaUrmatoare(l)`, `luniDeTest(randuri, {minZile?, minCazuri?, asteaptaZile?, acum}) -> string[]`, `impartire(randuri, l) -> {antrenare, test}`;
  - datele de antrenare: `cuSamanta(seed)`, `normalizare(rows) -> {m, s}`, `matrice(rows, norm) -> Float32Array`, `esantion(rows, max, seed)`;
  - antrenarea: `antreneazaAnsamblu(rows, o, cuLogistic) -> {norm, ansamblu, logist, n}`, `judecaLuna(randuri, l, o) -> [{t, s, y, p, pLog, i, e, r1, r2}] | null`, `modelFinal(randuri, o) -> {norm, ansamblu, n}`;
  - măsurile: `brier(l, k)`, `logloss(l, k)`, `bss(l, k, kRef)`, `blocuri(l, oreBloc)`, `bootstrap2(l, k, kRef, n=1000, seed=7) -> [lo, hi]`;
  - `verificare(l, {oreBloc, numeReper: [n1, n2?], luni, luniGata}) -> {n, nIndep, oreBloc, luni, luniGata, reper, brier, brierReper, brierLog, logloss, loglossReper, loglossLog, bss, ic, bssLog, icLog, bss3}`, adică exact forma citită de `Retea.decide`.

- [ ] **Step 1: Scrie proba (roșie)** — `scripts/proba-v10080-verifica.mjs`:

```js
// Proba v100.80 (verificarea) - rețeaua neuronală, livrarea 1: retea/verifica.mjs - măsurile pe cifre știute, bootstrap-ul pe două trepte
// (mai larg când monedele se mișcă împreună într-o lună), blocurile independente, lunile de test, pauza cât orizontul, normalizarea
// doar din antrenare, judecarea unei luni cu un antrenor fals, reperul cel mai greu.
//   node scripts/proba-v10080-verifica.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const V = await import(pathToFileURL(path.join(RAD, "retea", "verifica.mjs")).href);
const ORA = 3600000, ZI = 864e5;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const aprox = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + " ≠ " + b);
console.log("Proba v100.80 (verificarea) · măsurile, bootstrap-ul, lunile, pauza");

await test("(4) Brier, log-loss și scorul față de reper pe cifre știute", () => {
  const l = [{ y: 1, p: 0.8, r1: 0.5 }, { y: 0, p: 0.3, r1: 0.5 }];
  aprox(V.brier(l, "p"), (0.04 + 0.09) / 2); aprox(V.brier(l, "r1"), 0.25);
  aprox(V.bss(l, "p", "r1"), 1 - 0.065 / 0.25); aprox(V.logloss(l, "p"), -(Math.log(0.8) + Math.log(0.7)) / 2);
  assert.equal(V.brier([], "p"), null);
});

await test("(4) bootstrap pe două trepte: același rezultat la aceeași sămânță; mai larg decât pe rânduri când toate monedele dintr-o lună merg la fel", () => {
  const l = [];
  for (let m = 0; m < 6; m++) for (let c = 0; c < 10; c++) for (let k = 0; k < 28; k++) { const bun = m % 2 === 0, y = (m * 7 + c * 3 + k) % 3 === 0 ? 1 : 0; l.push({ t: Date.UTC(2026, m, 1 + k), s: "M" + c, y, p: bun ? (y ? 0.8 : 0.2) : (y ? 0.1 : 0.9), r1: 0.4 }); }
  const a = V.bootstrap2(l, "p", "r1", 500, 3), b = V.bootstrap2(l, "p", "r1", 500, 3);
  assert.deepEqual(a, b);
  const r = (() => { let s = 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(), v = [];
  for (let q = 0; q < 500; q++) { let x = 0, y = 0; for (let z = 0; z < l.length; z++) { const w = l[Math.floor(r() * l.length)]; x += (w.p - w.y) ** 2; y += (w.r1 - w.y) ** 2; } v.push(1 - x / y); }
  v.sort((x, y) => x - y); const lat1 = v[487] - v[12], lat2 = a[1] - a[0];
  assert.ok(lat2 > 3 * lat1, "două trepte " + lat2.toFixed(3) + " vs rânduri " + lat1.toFixed(3));
});

await test("(4) blocurile independente: zilele distincte la 24 h; la 72 h se strâng", () => {
  const l = [0, 5, 30, 50].map((h) => ({ t: Date.UTC(2026, 0, 4) + h * ORA }));
  assert.equal(V.blocuri(l, 24), 3); assert.ok(V.blocuri(l, 72) <= 2);
});

await test("(4) lunile de test: după 60 de zile de istorie, doar lunile întregi încheiate; boții așteaptă 30 de zile după sfârșitul lunii", () => {
  const R = []; for (let t = Date.UTC(2025, 8, 15); t < Date.UTC(2026, 2, 10); t += ZI) R.push({ t, tEt: t + ZI });
  assert.deepEqual(V.luniDeTest(R, { minZile: 60, acum: Date.UTC(2026, 2, 20) }), ["2025-12", "2026-01", "2026-02"]);
  // boții: cu 3 cazuri știute, prima lună bună e octombrie; februarie cade (1 martie + 30 de zile trece de 20 martie)
  assert.deepEqual(V.luniDeTest(R, { minCazuri: 3, asteaptaZile: 30, acum: Date.UTC(2026, 2, 20) }), ["2025-10", "2025-11", "2025-12", "2026-01"]);
});

await test("(4) pauza cât orizontul: un rând de antrenare cu eticheta știută DUPĂ începutul lunii nu intră nici la antrenare, nici la test", () => {
  const start = Date.UTC(2025, 11, 1), R = [{ t: start - 2 * ORA, tEt: start + 22 * ORA, x: [1] }, { t: start - 30 * ORA, tEt: start - 6 * ORA, x: [2] }, { t: start + ORA, tEt: start + 25 * ORA, x: [3] }];
  const { antrenare, test } = V.impartire(R, "2025-12");
  assert.deepEqual(antrenare.map((r) => r.x[0]), [2]); assert.deepEqual(test.map((r) => r.x[0]), [3]);
});

await test("(4) normalizarea doar din antrenare; judecaLuna: 5 rețele + formula simplă (fără strat ascuns), aceleași cazuri pentru amândouă", async () => {
  const R = []; for (let d = 0; d < 120; d++) R.push({ t: Date.UTC(2025, 8, 1) + d * ZI, s: "A", tEt: Date.UTC(2025, 8, 1) + (d + 1) * ZI, y: d % 2, x: [d % 5, 1], r1: 0.5 });
  R[R.length - 1].x = [1e9, 1];   // o valoare uriașă în test
  const apeluri = [], o = { seminte: 5, maxRanduri: 1000, versiune: "r1", prezice: () => 0.5, antreneaza: async (X, y, nIn, asc, seed) => { apeluri.push({ asc, seed, nIn, max: Math.max(...X) }); return { straturi: [{ W: [[0], [0]], b: [0], act: "sigmoid" }] }; } };
  const { antrenare } = V.impartire(R, "2025-12"), a = await V.antreneazaAnsamblu(antrenare, o, true);
  assert.deepEqual(a.norm, V.normalizare(V.esantion(antrenare, 1000, 11)));
  assert.ok(a.norm.m[0] < 5, "media a văzut testul: " + a.norm.m[0]);
  apeluri.length = 0;
  const rows = await V.judecaLuna(R, "2025-12", o);
  assert.equal(apeluri.filter((c) => c.asc.length === 2).length, 5); assert.equal(apeluri.filter((c) => c.asc.length === 0).length, 1);
  assert.ok(rows.length > 20 && rows.every((r) => r.p === 0.5 && r.pLog === 0.5 && r.r1 === 0.5));
});

await test("(4) verificarea: ia reperul cel mai greu (Brier mai mic), scorul pe ultimele 3 luni, cazurile independente pe blocuri", () => {
  const l = []; for (let m = 0; m < 6; m++) for (let d = 0; d < 20; d++) { const y = (m + d) % 2; l.push({ t: Date.UTC(2026, m, 1 + d), s: "A", y, p: y ? 0.7 : 0.3, pLog: y ? 0.6 : 0.4, r1: 0.5, r2: y ? 0.65 : 0.35 }); }
  const v = V.verificare(l, { oreBloc: 24, numeReper: ["rata ta", "rata pe monedă"], luni: 6, luniGata: 6 });
  assert.equal(v.reper, "rata pe monedă"); assert.equal(v.nIndep, 120); assert.equal(v.n, 120);
  assert.ok(v.ic[0] > 0 && v.icLog[0] > 0 && v.bss3 > 0, JSON.stringify(v));
  assert.equal(V.verificare(l, { oreBloc: 24, numeReper: ["🎲"], luni: 6, luniGata: 6 }).reper, "🎲");
});

console.log("\n" + (pica ? "V100.80 VER PICA · " + pica + " din " + (ok + pica) : "V100.80 VER PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080-verifica.mjs`
Expected: `Cannot find module … retea/verifica.mjs`.

- [ ] **Step 3: Scrie `retea/verifica.mjs`:**

```js
// Verificarea (specul, „Verificarea (walk-forward) și eticheta «dovedită»”): lunile de test; antrenarea doar pe rândurile cu eticheta
// știută la începutul lunii (tEt <= începutul ei = pauză cât orizontul); normalizarea doar din antrenare; Brier / log-loss pe ACELEAȘI
// cazuri pentru rețea, reper și formula simplă; IC 95% prin bootstrap pe două trepte (lunile, apoi monedele din ele - săptămânile în care
// toată piața merge la fel nu mai trec drept cazuri separate); blocurile independente. Fără TensorFlow: antrenorul și trecerea înainte
// vin din afară (o.antreneaza, o.prezice).
const ORA = 3600000, ZI = 864e5;
export function luna(t) { const d = new Date(t); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"); }
export function inceputLuna(l) { const [a, m] = l.split("-").map(Number); return Date.UTC(a, m - 1, 1); }
export function lunaUrmatoare(l) { const [a, m] = l.split("-").map(Number); return luna(Date.UTC(a, m, 1)); }
export function cuSamanta(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// lunile întregi încheiate (cu toate etichetele știute până acum), după ce antrenarea are destul: o.minZile de istorie (barele) sau
// o.minCazuri rânduri cu eticheta știută la începutul lunii (boții); o.asteaptaZile după sfârșitul lunii (boții pornit atunci încă deschiși)
export function luniDeTest(randuri, o) {
  if (!randuri.length) return [];
  let t0 = Infinity, t1 = -Infinity; for (const r of randuri) { if (r.t < t0) t0 = r.t; if (r.t > t1) t1 = r.t; }
  const out = [], acum = o.acum || Date.now(), astepta = (o.asteaptaZile || 0) * ZI;
  for (let l = luna(t0); inceputLuna(l) <= t1; l = lunaUrmatoare(l)) {
    const start = inceputLuna(l), fin = inceputLuna(lunaUrmatoare(l));
    if (fin + astepta > acum) break;
    if (o.minZile && start < t0 + o.minZile * ZI) continue;
    if (o.minCazuri) { let k = 0; for (const r of randuri) if (r.tEt <= start) k++; if (k < o.minCazuri) continue; }
    let are = false, toate = true; for (const r of randuri) if (r.t >= start && r.t < fin) { are = true; if (r.tEt > acum) { toate = false; break; } }
    if (are && toate) out.push(l);
  }
  return out;
}
export function impartire(randuri, l) {
  const start = inceputLuna(l), fin = inceputLuna(lunaUrmatoare(l));
  return { antrenare: randuri.filter((r) => r.tEt <= start), test: randuri.filter((r) => r.t >= start && r.t < fin) };
}
const p7 = (v) => Number(v.toPrecision(7));
export function normalizare(rows) {
  const n = rows.length, k = rows[0].x.length, m = new Array(k).fill(0), s = new Array(k).fill(0);
  for (const r of rows) for (let j = 0; j < k; j++) m[j] += r.x[j] / n;
  for (const r of rows) for (let j = 0; j < k; j++) s[j] += (r.x[j] - m[j]) ** 2 / n;
  return { m: m.map(p7), s: s.map((v) => p7(Math.sqrt(v))) };
}
export function matrice(rows, norm) {
  const k = norm.m.length, X = new Float32Array(rows.length * k);
  rows.forEach((r, i) => { for (let j = 0; j < k; j++) X[i * k + j] = (r.x[j] - norm.m[j]) / (norm.s[j] > 0 ? norm.s[j] : 1); });
  return X;
}
// cel mult `max` rânduri, alese cu sămânță, apoi puse înapoi în ordinea timpului (ultimii 20% rămân validarea opririi timpurii)
export function esantion(rows, max, seed) {
  const l = rows.slice().sort((a, b) => a.t - b.t); if (l.length <= max) return l;
  const r = cuSamanta(seed), idx = l.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const q = idx[i]; idx[i] = idx[j]; idx[j] = q; }
  return idx.slice(0, max).sort((a, b) => a - b).map((i) => l[i]);
}
export async function antreneazaAnsamblu(rows, o, cuLogistic) {
  const tr = esantion(rows, o.maxRanduri || 40000, 11), norm = normalizare(tr), nIn = norm.m.length, X = matrice(tr, norm), y = Float32Array.from(tr, (r) => r.y);
  const ansamblu = []; for (let k = 0; k < (o.seminte || 5); k++) ansamblu.push((await o.antreneaza(X, y, nIn, o.ascunse || [16, 8], 1000 + k)).straturi);
  const logist = cuLogistic ? (await o.antreneaza(X, y, nIn, [], 999)).straturi : null;
  return { norm, ansamblu, logist, n: tr.length };
}
// o lună: antrenarea pe ce se știa la începutul ei, apoi rețeaua și formula simplă pe rândurile lunii (aceleași cazuri)
export async function judecaLuna(randuri, l, o) {
  const { antrenare, test } = impartire(randuri, l);
  if (antrenare.length < 50 || !test.length) return null;
  const a = await antreneazaAnsamblu(antrenare, o, true), mNN = { versiune: o.versiune, norm: a.norm, ansamblu: a.ansamblu }, mLog = { versiune: o.versiune, norm: a.norm, ansamblu: [a.logist] };
  return test.map((r) => ({ t: r.t, s: r.s, y: r.y, p: o.prezice(mNN, r.x), pLog: o.prezice(mLog, r.x), i: r.i, e: r.e, r1: r.r1 ?? null, r2: r.r2 ?? null }));
}
// modelul de azi: pe tot ce are eticheta știută
export async function modelFinal(randuri, o) { const a = await antreneazaAnsamblu(randuri, o, false); return { norm: a.norm, ansamblu: a.ansamblu, n: a.n }; }
const PR = (p) => Math.min(1 - 1e-6, Math.max(1e-6, p));
export function brier(l, k) { if (!l.length) return null; let s = 0; for (const x of l) s += (x[k] - x.y) ** 2; return s / l.length; }
export function logloss(l, k) { if (!l.length) return null; let s = 0; for (const x of l) { const p = PR(x[k]); s -= x.y ? Math.log(p) : Math.log(1 - p); } return s / l.length; }
export function bss(l, k, kRef) { const a = brier(l, k), b = brier(l, kRef); return a !== null && b > 0 ? 1 - a / b : null; }
export function blocuri(l, oreBloc) { const s = new Set(); for (const x of l) s.add(Math.floor(x.t / (oreBloc * ORA))); return s.size; }
// IC 95% pentru 1 − Brier(k) / Brier(kRef): lunile cu înlocuire, apoi monedele lunii alese cu înlocuire (sumele de erori pe grupă)
export function bootstrap2(l, k, kRef, n = 1000, seed = 7) {
  const luni = new Map();
  for (const x of l) { const lu = luna(x.t); if (!luni.has(lu)) luni.set(lu, new Map()); const m = luni.get(lu); if (!m.has(x.s)) m.set(x.s, [0, 0]); const g = m.get(x.s); g[0] += (x[k] - x.y) ** 2; g[1] += (x[kRef] - x.y) ** 2; }
  const L = [...luni.values()].map((m) => [...m.values()]), r = cuSamanta(seed), v = [];
  for (let q = 0; q < n; q++) {
    let a = 0, b = 0;
    for (let z = 0; z < L.length; z++) { const gr = L[Math.floor(r() * L.length)]; for (let w = 0; w < gr.length; w++) { const g = gr[Math.floor(r() * gr.length)]; a += g[0]; b += g[1]; } }
    v.push(b > 0 ? 1 - a / b : 0);
  }
  v.sort((x, y) => x - y);
  return [v[Math.floor(0.025 * n)], v[Math.ceil(0.975 * n) - 1]];
}
const r4 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1e4) / 1e4);
// verificarea pe rândurile de test (p = rețeaua, pLog = formula simplă, r1 / r2 = reperele); reperul e cel mai greu dintre ele
export function verificare(l, o) {
  const ok = l.filter((x) => Number.isFinite(x.p) && Number.isFinite(x.pLog) && Number.isFinite(x.r1));
  let kRef = "r1", rep = o.numeReper[0];
  if (o.numeReper[1] && ok.length && ok.every((x) => Number.isFinite(x.r2)) && brier(ok, "r2") < brier(ok, "r1")) { kRef = "r2"; rep = o.numeReper[1]; }
  const ult = new Set([...new Set(ok.map((x) => luna(x.t)))].sort().slice(-3)), l3 = ok.filter((x) => ult.has(luna(x.t)));
  return { n: ok.length, nIndep: blocuri(ok, o.oreBloc), oreBloc: o.oreBloc, luni: o.luni, luniGata: o.luniGata, reper: rep,
    brier: r4(brier(ok, "p")), brierReper: r4(brier(ok, kRef)), brierLog: r4(brier(ok, "pLog")),
    logloss: r4(logloss(ok, "p")), loglossReper: r4(logloss(ok, kRef)), loglossLog: r4(logloss(ok, "pLog")),
    bss: r4(bss(ok, "p", kRef)), ic: ok.length ? bootstrap2(ok, "p", kRef).map(r4) : null,
    bssLog: r4(bss(ok, "p", "pLog")), icLog: ok.length ? bootstrap2(ok, "p", "pLog").map(r4) : null,
    bss3: l3.length ? r4(bss(l3, "p", kRef)) : null };
}
```

- [ ] **Step 4: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080-verifica.mjs`
Expected: `V100.80 VER PASS · 7/7`

- [ ] **Step 5: Leagă proba** (`"test:v10080ver": "node scripts/proba-v10080-verifica.mjs"` + `&& npm run test:v10080ver` în lanț), apoi commit:

```bash
npm test > "$SCRATCH/npm-test-80-4.log" 2>&1 && git add retea/verifica.mjs scripts/proba-v10080-verifica.mjs package.json && git commit -q -m "feat(retea): verificarea walk-forward — pauza cât orizontul, bootstrap pe luni și monede, reperul cel mai greu (livrarea 1, task 4)" && echo GATA
```

---

### Task 5: Onestitatea, cu TensorFlow adevărat — zgomot, semnal liniar, semnal neliniar

**Files:**
- Modify: `scripts/proba-v10080-tf.mjs` (trei teste noi, înaintea rândului de final)

**Interfaces:**
- Consumes: `luniDeTest`, `judecaLuna`, `verificare` (Task 4); `antreneaza` (Task 2); `Retea.prezice`, `Retea.decide` (Task 1).
- Produces: nimic nou. E proba cea mai importantă a specului.

- [ ] **Step 1: Adaugă testele** în `scripts/proba-v10080-tf.mjs`, chiar înainte de `console.log("\n" + (pica ? …`:

```js
// ---- onestitatea (specul): zgomot -> nedovedită; semnal liniar -> bate 🎲, dar nu formula simplă -> nedovedită; neliniar (o interacțiune
// pe care formula nu o vede) -> dovedită. 20 de „monede” × 240 de zile, un rând pe zi; „🎲” = 30% (rata de bază de la zgomot)
const V = await import(pathToFileURL(path.join(RAD, "retea", "verifica.mjs")).href);
function scenariu(fel, seed) {
  const r = MOD.cuSamanta(seed), rows = [], t0 = Date.UTC(2025, 0, 1), n01 = () => { let u = 0; for (let q = 0; q < 6; q++) u += r(); return (u - 3) * Math.SQRT2; };
  for (let z = 0; z < 240; z++) for (let c = 0; c < 20; c++) {
    const x = [n01(), n01(), n01(), n01()], p = fel === "zgomot" ? 0.3 : fel === "liniar" ? 1 / (1 + Math.exp(-(-0.85 + 1.5 * x[0]))) : (x[0] * x[1] > 0 ? 0.85 : 0.1), t = t0 + z * 864e5 + c * 3600000;
    rows.push({ t, s: "M" + c, x, y: r() < p ? 1 : 0, tEt: t + 864e5, r1: 0.3 });
  }
  return rows;
}
async function onestitate(fel) {
  const R = scenariu(fel, 5), luni = V.luniDeTest(R, { minZile: 60, acum: Date.UTC(2026, 0, 1) }), test = [];
  for (const l of luni) for (const x of await V.judecaLuna(R, l, { antreneaza: MOD.antreneaza, prezice: Retea.prezice, seminte: 2, maxRanduri: 3000, versiune: Retea.VERSIUNE })) test.push(x);
  const v = V.verificare(test, { oreBloc: 24, numeReper: ["🎲"], luni: luni.length, luniGata: luni.length }), d = Retea.decide(v);
  console.log("      " + fel + ": " + luni.length + " luni, " + v.nIndep + " zile, Brier " + v.brier + " · 🎲 " + v.brierReper + " · formula " + v.brierLog + " · IC " + JSON.stringify(v.ic) + " / " + JSON.stringify(v.icLog) + " -> " + (d.dovedita ? "DOVEDITĂ" : d.motiv));
  return { v, d };
}
await test("(5) zgomot pur -> nedovedită: nu bate 🎲", async () => { const { d } = await onestitate("zgomot"); assert.equal(d.dovedita, false); assert.match(d.motiv, /^nu bate 🎲/); });
await test("(5) semnal liniar -> bate 🎲, dar nu formula simplă -> nedovedită", async () => { const { v, d } = await onestitate("liniar"); assert.ok(v.ic[0] > 0, "trebuia să bată 🎲: " + JSON.stringify(v.ic)); assert.equal(d.dovedita, false); assert.equal(d.motiv, "nu face mai mult decât o formulă simplă"); });
await test("(5) semnal neliniar (interacțiune) -> dovedită", async () => { const { v, d } = await onestitate("neliniar"); assert.ok(v.nIndep >= 100, String(v.nIndep)); assert.equal(d.dovedita, true, d.motiv); });
```

- [ ] **Step 2: Rulează proba**

Run: `node scripts/proba-v10080-tf.mjs`
Expected: `V100.80 TF PASS · 7/7`, cu cele trei rânduri de cifre afișate (zgomot / liniar / neliniar). Durata e de cel mult ~2 minute.

Testul (5) e scris după ce `verifica.mjs` există deja. Ca să-l vezi ROȘU, strică pe rând două lucruri:
- în `Retea.decide`, comentează condiția `icLog`. Testul „liniar” trebuie să pice cu „dovedită”.
- pune constanta `0.3` în locul lui `p` la neliniar. Testul „neliniar” trebuie să pice.

După fiecare stricare, pune codul la loc și rulează din nou proba: trebuie să revină PASS.

Dacă „liniar” iese uneori dovedit (rețeaua bate formula liniară din întâmplare): **nu** slăbi pragul. Oprește-te și raportează cifrele. Ar însemna că bootstrap-ul e prea îngust, adică exact ce păzește specul.

- [ ] **Step 3: Commit:**

```bash
npm test > "$SCRATCH/npm-test-80-5.log" 2>&1 && git add scripts/proba-v10080-tf.mjs && git commit -q -m "test(retea): onestitatea cu TensorFlow — zgomot și liniar nedovedite, neliniar dovedit (livrarea 1, task 5)" && echo GATA
```

---

### Task 6: `retea/antreneaza.mjs` — programul de noapte (modelele de azi, lunile din cache, bugetul)

**Files:**
- Create: `retea/antreneaza.mjs`
- Create: `scripts/proba-v10080-antrenor.mjs`
- Modify: `package.json` (`test:v10080ant` + lanțul)

**Interfaces:**
- Consumes:
  - din Task 3: `incarcaModulele`, `simboluri`, `citesteBare`, `randuriMoneda`, `reperRand`, `randuriBoti`;
  - din Task 4: `luniDeTest`, `judecaLuna`, `modelFinal`, `verificare`;
  - din Task 2: `antreneaza`, `HIPER`.
- Produces (fișierele colectorului):
  - `data/retea/modele.json = { la, cheie, versiune, modele: { <tinta>: { tinta, versiune, la, n, norm, ansamblu, verificare } } }`;
  - `data/retea/luni-<tinta>.json = { cheie, luni: { "AAAA-LL": [[t, s, y, p, pLog, r1, r2], …] } }`;
  - argumentele `--buget-min`, `--tinta`, `--rad`, `--seminte`, `--max-randuri`.

- [ ] **Step 1: Scrie proba (roșie)** — `scripts/proba-v10080-antrenor.mjs`:

```js
// Proba v100.80 (antrenorul) - retea/antreneaza.mjs pe un dosar de date mic (2 monede + BTC, ~150 de zile): modelul de azi, lunile
// păstrate (a doua rulare le ia din cache), bugetul 0 nu atinge nimic, cheia schimbată reface lunile, ținta fără date nu strică restul.
//   node scripts/proba-v10080-antrenor.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "retea-proba-")), DATA = path.join(TMP, "data", "retea"), ORE = path.join(DATA, "ore");
fs.mkdirSync(ORE, { recursive: true });
const pionex = (l) => l.map((q) => ({ time: q.t, open: String(q.o), close: String(q.c), high: String(q.h), low: String(q.l), volume: "1" }));
const t0 = Date.UTC(2025, 5, 1);
fs.writeFileSync(path.join(ORE, "AAA_USDT_PERP.json"), JSON.stringify(pionex(bare(3600, { seed: 31, t0 }))));
fs.writeFileSync(path.join(ORE, "BBB_USDT_PERP.json"), JSON.stringify(pionex(bare(3600, { seed: 32, t0, p0: 5 }))));
fs.writeFileSync(path.join(ORE, "BTC_USDT_PERP.json"), JSON.stringify(pionex(bare(3600, { seed: 33, t0, p0: 60000 }))));
const ruleaza = (...a) => spawnSync(process.execPath, [path.join(RAD, "retea", "antreneaza.mjs"), "--rad", TMP, "--seminte", "1", "--max-randuri", "1500", ...a], { encoding: "utf8", timeout: 600000 });
const modele = () => JSON.parse(fs.readFileSync(path.join(DATA, "modele.json"), "utf8"));
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.80 (antrenorul) · modelele, lunile, bugetul");

await test("(6) prima rulare: modelul de azi (17 intrări, 1 sămânță) și lunile de verificare scrise; verificarea are forma citită de Retea.decide", () => {
  const r = ruleaza("--tinta", "directie"); assert.equal(r.status, 0, r.stdout + r.stderr);
  const m = modele().modele.directie;
  assert.equal(m.versiune, "r1"); assert.equal(m.norm.m.length, 17); assert.equal(m.ansamblu.length, 1);
  assert.ok(m.verificare && m.verificare.luni >= 2 && m.verificare.luniGata === m.verificare.luni, JSON.stringify(m.verificare));
  for (const k of ["nIndep", "brier", "brierReper", "brierLog", "ic", "icLog", "logloss", "loglossReper", "loglossLog", "reper"]) assert.ok(m.verificare[k] !== undefined, k);
  assert.ok(fs.existsSync(path.join(DATA, "luni-directie.json")));
});

await test("(6) a doua rulare ia lunile din cache (nu le reface)", () => {
  const r = ruleaza("--tinta", "directie"); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /directie: (\d+) luni din cache, 0 noi/, r.stdout);
});

await test("(6) bugetul 0 nu atinge nimic (modelele de ieri rămân)", () => {
  const inainte = fs.statSync(path.join(DATA, "modele.json")).mtimeMs, r = ruleaza("--tinta", "directie", "--buget-min", "0");
  assert.equal(r.status, 0); assert.match(r.stdout, /buget 0/); assert.equal(fs.statSync(path.join(DATA, "modele.json")).mtimeMs, inainte);
});

await test("(6) cheia schimbată (altă versiune a trăsăturilor / a rețelei) reface lunile", () => {
  const f = path.join(DATA, "luni-directie.json"), c = JSON.parse(fs.readFileSync(f, "utf8")); c.cheie = "alta"; fs.writeFileSync(f, JSON.stringify(c));
  const r = ruleaza("--tinta", "directie"); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /directie: 0 luni din cache, \d+ noi/, r.stdout);
});

await test("(6) ținta fără date (rezultatul tău fără boti.json) nu face model și nu șterge modelul altei ținte", () => {
  const r = ruleaza("--tinta", "rezultat"); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /rezultat: prea puține rânduri \(0\)/); assert.ok(modele().modele.directie, "modelul directie a dispărut");
});

fs.rmSync(TMP, { recursive: true, force: true });
console.log("\n" + (pica ? "V100.80 ANTRENOR PICA · " + pica + " din " + (ok + pica) : "V100.80 ANTRENOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080-antrenor.mjs`
Expected: testul 1 pică (`status` ≠ 0: `Cannot find module …antreneaza.mjs`).

- [ ] **Step 3: Scrie `retea/antreneaza.mjs`:**

```js
// Antrenorul de noapte (specul rețelei, livrarea 1): (1) pentru fiecare țintă, modelul de azi (pe tot ce are eticheta știută) - întâi,
// ca cifrele de mâine să nu aștepte verificarea; (2) cu bugetul rămas, lunile de verificare care lipsesc, judecate o dată și păstrate în
// data/retea/luni-<tinta>.json (refăcute doar când se schimbă versiunea trăsăturilor sau hiperparametrii); (3) verificarea pe lunile gata
// și pragul „dovedită” -> data/retea/modele.json (scris o dată, la sfârșit). Nu cere nimic din rețea și nu are token: îl pornește
// colectorul (scripts/lib/tura-retea.mjs), cu prioritate scăzută.
//   node retea/antreneaza.mjs [--buget-min 30] [--tinta directie] [--rad <dosarul cu data/>] [--seminte 5] [--max-randuri 40000]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { incarcaModulele, simboluri, citesteBare, randuriMoneda, reperRand, randuriBoti } from "./date.mjs";
import { luniDeTest, judecaLuna, modelFinal, verificare } from "./verifica.mjs";
import { antreneaza, HIPER } from "./model.mjs";

const COD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARG = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d; };
const RAD = path.resolve(ARG("rad", COD)), DATA = path.join(RAD, "data", "retea");
const BUGET = Number(ARG("buget-min", 30)) * 60000, PANA = Date.now() + BUGET, DOAR = ARG("tinta", null);
const spune = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const scrie = (f, o) => { const tmp = f + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, f); };
const citeste = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

if (!(BUGET > 0)) { spune("buget 0: nimic de antrenat, modelele rămân"); process.exit(0); }
fs.mkdirSync(DATA, { recursive: true });
const M = incarcaModulele(COD), CHEIE = M.R.VERSIUNE + "|" + JSON.stringify(HIPER), acum = Date.now();
const OPT = { antreneaza, prezice: M.R.prezice, versiune: M.R.VERSIUNE, ascunse: HIPER.ascunse, seminte: Number(ARG("seminte", HIPER.seminte)), maxRanduri: Number(ARG("max-randuri", 40000)) };
const vechi = citeste(path.join(DATA, "modele.json")), modele = vechi && vechi.cheie === CHEIE && vechi.modele ? vechi.modele : {};
const btc = citesteBare(RAD, "BTC_USDT_PERP", M.G), bareDe = new Map(), memo = new Map();
for (const s of simboluri(RAD)) { if (s === "BTC_USDT_PERP") continue; const b = citesteBare(RAD, s, M.G); if (b.length > 800) { bareDe.set(s, b); memo.set(s, {}); } }
spune("pornit: " + bareDe.size + " monede, BTC " + btc.length + " bare, buget " + Math.round(BUGET / 60000) + " min");
const tinte = Object.keys(M.R.TINTE).filter((t) => !DOAR || t === DOAR);
function randuri(t) {
  if (t === "rezultat") return randuriBoti(citeste(path.join(DATA, "boti.json")) || [], (s) => bareDe.get(s) || null, btc, M);
  const out = []; for (const [s, b] of bareDe) for (const r of randuriMoneda(t, s, b, btc, M, memo.get(s))) out.push(r);
  return out.sort((a, b) => a.t - b.t);
}
const OPT_LUNI = (t) => (t === "rezultat" ? { minCazuri: 200, asteaptaZile: 30, acum } : { minZile: 60, acum });
const NUME_REPER = (t) => (t === "rezultat" ? ["rata ta", "rata pe monedă"] : t === "directie" ? ["🎲", "50%"] : ["🎲"]);
// (1) modelele de azi
for (const t of tinte) {
  if (Date.now() >= PANA) break;
  const stiute = randuri(t).filter((r) => r.tEt <= acum);
  if (stiute.length < 200) { spune(t + ": prea puține rânduri (" + stiute.length + "), fără model"); continue; }
  const f = await modelFinal(stiute, OPT);
  modele[t] = { tinta: t, versiune: M.R.VERSIUNE, la: Date.now(), n: f.n, norm: f.norm, ansamblu: f.ansamblu, verificare: modele[t] && modele[t].verificare || null };
  spune(t + ": modelul de azi pe " + f.n + " rânduri");
}
// (2) lunile care lipsesc, cât ține bugetul; (3) verificarea pe lunile gata
for (const t of tinte) {
  if (!modele[t]) continue;
  const R = randuri(t), luni = luniDeTest(R, OPT_LUNI(t)), fis = path.join(DATA, "luni-" + t + ".json");
  let cache = citeste(fis); if (!cache || cache.cheie !== CHEIE || !cache.luni) cache = { cheie: CHEIE, luni: {} };
  let noi = 0;
  for (const l of luni) {
    if (cache.luni[l] || Date.now() >= PANA) continue;
    const rows = await judecaLuna(R, l, OPT);
    if (rows && t !== "rezultat") for (const r of rows) { r.r1 = reperRand(t, bareDe.get(r.s), r, M, memo.get(r.s)); r.r2 = t === "directie" ? 0.5 : null; }
    cache.luni[l] = (rows || []).map((r) => [r.t, r.s, r.y, r.p, r.pLog, r.r1, r.r2]); noi++;
    scrie(fis, cache); spune(t + ": luna " + l + " judecată (" + cache.luni[l].length + " rânduri)");
  }
  const gata = luni.filter((l) => cache.luni[l]), test = [];
  for (const l of gata) for (const a of cache.luni[l]) test.push({ t: a[0], s: a[1], y: a[2], p: a[3], pLog: a[4], r1: a[5], r2: a[6] });
  const v = test.length ? verificare(test, { oreBloc: M.R.TINTE[t].bloc, numeReper: NUME_REPER(t), luni: luni.length, luniGata: gata.length }) : null;
  if (v) Object.assign(v, M.R.decide(v));
  modele[t].verificare = v;
  spune(t + ": " + (gata.length - noi) + " luni din cache, " + noi + " noi; " + (v ? (v.dovedita ? "DOVEDITĂ" : "nedovedită: " + v.motiv) : "neverificată încă"));
}
scrie(path.join(DATA, "modele.json"), { la: Date.now(), cheie: CHEIE, versiune: M.R.VERSIUNE, modele });
spune("gata: " + Object.keys(modele).length + " modele");
```

- [ ] **Step 4: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080-antrenor.mjs`
Expected: `V100.80 ANTRENOR PASS · 5/5`

- [ ] **Step 5: Măsoară pe datele LUI, fără să scrie în data/ reale**

Run în fundal, cu jurnalul în scratchpad:

```bash
mkdir -p "$SCRATCH/retea-proba/data/retea" && cp -r data/istoric-1h "$SCRATCH/retea-proba/data/istoric-1h" && node retea/antreneaza.mjs --rad "$SCRATCH/retea-proba" --tinta atinge-24 --buget-min 10 > "$SCRATCH/antrenor-masurat.log" 2>&1; tail -5 "$SCRATCH/antrenor-masurat.log"
```

Expected: „modelul de azi pe N rânduri” și câteva luni judecate în ≤ 10 minute. Notează în ledger durata unei luni.
- **Peste 3 minute pe lună:** `Ruling` în ledger — `--max-randuri 20000` din colector, adică mai puține rânduri de antrenare. Bugetul și verificarea nu se schimbă.
- **Peste 6 minute:** oprește-te și raportează.

- [ ] **Step 6: Leagă proba** (`"test:v10080ant": "node scripts/proba-v10080-antrenor.mjs"` + lanțul), apoi commit:

```bash
npm test > "$SCRATCH/npm-test-80-6.log" 2>&1 && git add retea/antreneaza.mjs scripts/proba-v10080-antrenor.mjs package.json && git commit -q -m "feat(retea): antrenorul de noapte — modelele de azi întâi, lunile păstrate, bugetul (livrarea 1, task 6)" && echo GATA
```

---

### Task 7: Colectorul și serverul — istoria de 400 de zile, antrenorul de noapte, `rez.retea`, ruta `retea`

**Files:**
- Modify: `public/lib/retea.js` (`pentruBot`, `pentruPornire` + exportul)
- Create: `scripts/lib/tura-retea.mjs`
- Modify: `scripts/lib/tura-probabilitati.mjs` (`rez.retea`)
- Modify: `scripts/colector.mjs`: importurile, `Retea`, lista INCARCAT, blocul rețelei, `turaProbabilitati`, `bucla`
- Modify: `functions/api/istoric-bot.js` (`action=retea` GET / POST, limita corpului)
- Create: `scripts/proba-v10080-colector.mjs`
- Modify: `package.json` (`test:v10080col` + lanțul)

**Interfaces:**
- Consumes:
  - din Task 1: `Retea.trasaturiBare`, `intrare`, `trasaturiBot`, `prezice`, `VERSIUNE`;
  - fișierele din Task 6: `data/retea/modele.json`, `boti.json`, `ore/<SIMBOL>.json` (rândurile Pionex `{time, open, close, high, low, volume}`).
- Produces:
  - `Retea.pentruBot(modele, bare, o, btc) -> {la, v, p: {cod: număr}} | null`, unde `o = {acum, pret, dir, jos, sus, lichidare, tinta, stop}`, ca la `Probabilitati.pentruBot`;
  - `Retea.pentruPornire(modele, t, bare, btc, ist) -> {p, rata, n} | null`;
  - `turaRetea(d)` și `aduInapoi(simbol, vechi, d, buget) -> {randuri, complet, pagini}`;
  - KV `retea = {la, versiune, modele}`, adică GET `/api/istoric-bot?action=retea -> {retea}`;
  - `rez.retea = {la, v, p, pornire?}` în `prob:<bot>`;
  - fișierul-steag `data/retea/porneste-acum`: o tură acum, oricând.

- [ ] **Step 1: Scrie proba (roșie)** — `scripts/proba-v10080-colector.mjs`:

```js
// Proba v100.80 (colectorul) - rețeaua neuronală, livrarea 1: Retea.pentruBot / pentruPornire (codurile 🎲, semnele la short, fără
// modele -> nimic), istoria de 400 de zile (paginile, bugetul, „Pionex nu mai are”), tura de noapte (antrenorul care pică lasă modelele de
// ieri), rez.retea în pachetul 🎲, ruta `retea`, colectorul se încarcă întreg.
//   node scripts/proba-v10080-colector.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const ActiuniSemnale = new Function("GridCalcul", lib("actiuni-semnale.js") + "; return ActiuniSemnale;")(GridCalcul);
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", lib("probabilitati.js") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);
const TabloExtra = new Function("GridCalcul", lib("tablou-extra.js") + "; return TabloExtra;")(GridCalcul);
const Retea = new Function("Probabilitati", lib("retea.js") + "; return Retea;")(Probabilitati);
const { aduInapoi, turaRetea } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-retea.mjs")).href);
const { turaProbabilitati } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-probabilitati.mjs")).href);
const ORA = 3600000;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
// un model care zice mereu 50% (W zero, bias 0), cu numărul potrivit de intrări pe țintă
const N_IN = { "atinge-24": 20, "atinge-72": 20, "atinge-168": 20, cursa: 21, liniste: 18, directie: 17, rezultat: 26 };
const model = (t, v) => ({ tinta: t, versiune: v || Retea.VERSIUNE, la: Date.now(), norm: { m: Array(N_IN[t]).fill(0), s: Array(N_IN[t]).fill(1) }, ansamblu: [[{ W: Array.from({ length: N_IN[t] }, () => [0]), b: [0], act: "sigmoid" }]], verificare: null });
const MODELE = Object.fromEntries(Object.keys(N_IN).map((t) => [t, model(t)]));
console.log("Proba v100.80 (colectorul) · pentruBot, istoria, tura de noapte, rez.retea, ruta");
const acum = Date.UTC(2026, 9, 4, 12), b = bare(1400, { seed: 41, t0: acum - 1400 * ORA }), c = b[b.length - 1].c;

await test("(7) pentruBot pe un long: codurile 🎲 (marginile 24/72 h, lichidarea JOS, cursa) + direcția; fără modele -> null; altă versiune -> null", () => {
  const o = { acum, pret: c, dir: "long", jos: c * 0.95, sus: c * 1.05, lichidare: c * 0.7, tinta: c * 1.08, stop: c * 0.92 };
  const r = Retea.pentruBot(MODELE, b, o, null);
  for (const k of ["iese-jos-24", "iese-sus-24", "iese-jos-72", "iese-sus-72", "lichidare", "cursa", "directie-24"]) assert.equal(r.p[k], 0.5, k);
  assert.equal(r.v, Retea.VERSIUNE); assert.equal(r.la, acum);
  assert.equal(Retea.pentruBot(null, b, o, null), null);
  assert.equal(Retea.pentruBot(Object.fromEntries(Object.keys(N_IN).map((t) => [t, model(t, "r0")])), b, o, null), null);
});

await test("(7) pe un short: lichidarea e SUS (apare); o lichidare JOS la short nu dă cod; cursa cu ținta JOS și stopul SUS", () => {
  const sh = Retea.pentruBot(MODELE, b, { acum, pret: c, dir: "short", jos: c * 0.95, sus: c * 1.05, lichidare: c * 1.3, tinta: c * 0.92, stop: c * 1.08 }, null);
  assert.equal(sh.p.lichidare, 0.5); assert.equal(sh.p.cursa, 0.5);
  const rau = Retea.pentruBot(MODELE, b, { acum, pret: c, dir: "short", jos: c * 0.95, sus: c * 1.05, lichidare: c * 0.7 }, null);
  assert.ok(!("lichidare" in rau.p) && !("cursa" in rau.p));
});

await test("(7) pentruPornire: rezultatul tău la pornire (prețul = închiderea barei de dinainte), cu rata ta; fără modelul „rezultat” -> null", () => {
  const t = { moneda: "AAA", dir: "long", levier: 3, jos: c * 0.9, sus: c * 1.1, pasNet: 0.004, pus: 40, pornit: acum - 48 * ORA };
  const r = Retea.pentruPornire(MODELE, t, b, null, [{ moneda: "AAA", net: 1, inchis: acum - 100 * ORA }]);
  assert.deepEqual(r, { p: 0.5, rata: Math.round((1 + 10 * 1) / 11 * 1000) / 1000, n: 1 });
  assert.equal(Retea.pentruPornire({ directie: MODELE.directie }, t, b, null, []), null);
});

// ---- istoria de 400 de zile: o serie Pionex de 450 de zile; Pionex refuză endTime mai vechi de 420 de zile
const SERIE = bare(450 * 24, { seed: 43, t0: acum - 450 * 24 * ORA }).map((q) => ({ time: q.t, open: String(q.o), close: String(q.c), high: String(q.h), low: String(q.l), volume: "1" }));
const pionex = (limitaZile) => async (s, end) => {
  if (end && end < acum - limitaZile * 864e5) return { result: false, code: "MARKET_INVALID_TIME", message: "endTime param error" };
  const pana = end || acum, l = SERIE.filter((r) => r.time <= pana).slice(-500).reverse(); return { result: true, data: { klines: l } };
};
await test("(7) aduInapoi: pornește de la ce e pe disc (185 de zile), aduce paginile mai vechi până la 400 de zile + pagina nouă; bugetul scade", async () => {
  const pe185 = SERIE.slice(-185 * 24), buget = { pagini: 50 };
  const r = await aduInapoi("AAA_USDT_PERP", pe185, { acum, cereKlines: pionex(420), pauza: async () => {} }, buget);
  assert.equal(r.complet, true); assert.ok(r.randuri[0].time <= acum - 400 * 864e5, new Date(r.randuri[0].time).toISOString());
  assert.equal(buget.pagini, 50 - r.pagini); assert.ok(r.pagini >= 11 && r.pagini <= 13, String(r.pagini));
  for (let i = 1; i < r.randuri.length; i++) assert.ok(r.randuri[i].time > r.randuri[i - 1].time, "ordinea / dublurile");
});
await test("(7) aduInapoi: bugetul mic se oprește la jumătate (incomplet); Pionex fără bare mai vechi -> complet; eroarea se spune", async () => {
  const b3 = { pagini: 3 }, r = await aduInapoi("AAA_USDT_PERP", [], { acum, cereKlines: pionex(420), pauza: async () => {} }, b3);
  assert.equal(r.complet, false); assert.equal(b3.pagini, 0);
  const s = await aduInapoi("AAA_USDT_PERP", [], { acum, cereKlines: pionex(30), pauza: async () => {} }, { pagini: 50 });
  assert.equal(s.complet, true, "MARKET_INVALID_TIME = nu mai are");
  await assert.rejects(aduInapoi("AAA_USDT_PERP", [], { acum, cereKlines: async () => ({ result: false, message: "boom" }), pauza: async () => {} }, { pagini: 5 }), /boom/);
});

// ---- tura de noapte
function deps(o = {}) {
  const j = [], urcat = [], scrise = {}, d = { acum, stare: o.stare || {}, forta: !!o.forta, eNoapte: () => !!o.noapte, ziRo: () => "2026-10-04", simboluri: ["AAA_USDT_PERP", "BTC_USDT_PERP"],
    cereKlines: pionex(420), pauza: async () => {}, citesteOre: () => SERIE.slice(-185 * 24), scrieOre: (s, r) => { scrise[s] = r.length; },
    boti: async () => [{ id: "1" }], scrieBoti: () => {}, porneste: async () => ({ cod: o.cod ?? 0, minute: 12 }), citesteModele: () => ({ la: 1, versiune: "r1", modele: { directie: { x: 1 } } }),
    trimite: async (u, corp) => urcat.push({ u, corp }), jurnal: (...a) => j.push(a.join(" ")), scrieStare: () => {} };
  return { d, j, urcat, scrise };
}
await test("(7) tura: ziua fără noapte și fără steag nu face nimic; noaptea - istoria, boții, antrenorul, modelele urcate, o dată pe zi", async () => {
  const z = deps(); assert.equal(await turaRetea(z.d), null); assert.equal(z.urcat.length, 0);
  const n = deps({ noapte: true }); assert.deepEqual(await turaRetea(n.d), { cod: 0 });
  assert.deepEqual(Object.keys(n.scrise).sort(), ["AAA_USDT_PERP", "BTC_USDT_PERP"]);
  assert.equal(n.urcat.length, 1); assert.match(n.urcat[0].u, /action=retea$/); assert.deepEqual(Object.keys(n.urcat[0].corp.modele), ["directie"]);
  assert.equal(await turaRetea(n.d), null, "a doua oară în aceeași zi");
});
await test("(7) antrenorul care pică: nimic urcat, modelele de ieri rămân, jurnalul spune; steagul pornește tura și ziua", async () => {
  const p = deps({ forta: true, cod: 1 }); assert.deepEqual(await turaRetea(p.d), { cod: 1 });
  assert.equal(p.urcat.length, 0); assert.ok(p.j.some((l) => /nimic urcat, modelele de ieri rămân/.test(l)), p.j.join("\n"));
});
await test("(7) monedele complete nu se mai cer (doar BTC, care nu e în istoric-1h, se ține la zi)", async () => {
  const k = deps({ noapte: true, stare: { complete: { AAA_USDT_PERP: true } } }); await turaRetea(k.d);
  assert.deepEqual(Object.keys(k.scrise), ["BTC_USDT_PERP"]);
});

// ---- rez.retea în pachetul 🎲 (tura-probabilitati), cu dependențe false
const RANDURI = b.map((q) => ({ time: q.t, open: String(q.o), close: String(q.c), high: String(q.h), low: String(q.l), volume: "1" }));
async function prob(extra) {
  const trimise = [], bot = { id: "b1", baza: "AAA.PERP", directie: "long", pretCurent: c, gridJos: c * 0.95, gridSus: c * 1.05, lichidareJos: c * 0.7, levier: 3, investit: 50, pornitLa: acum - 240 * ORA, activ: true };
  await turaProbabilitati({ acum, boti: [bot], GridCalcul, Probabilitati, TabloExtra, cere: async () => ({ data: { klines: [] } }), trimite: async (u, corp) => trimise.push(corp), jurnal: () => {}, stare: {},
    simbolDe: () => "AAA_USDT_PERP", planDe: async () => null, citesteBare: () => RANDURI, scrieBare: () => {}, scrieStare: () => {}, pauza: async () => {}, ...extra });
  return trimise.find((x) => x && x.bot === "b1");
}
await test("(7) tura 🎲: cu modele, rez.retea are codurile și rezultatul la pornire; fără modele, nicio cheie retea (pagina publicată, prima noapte)", async () => {
  const cu = await prob({ Retea, modele: MODELE, btc: null, pornireDe: () => ({ p: 0.41, rata: 0.52, n: 431 }) });
  assert.ok(cu && cu.rez.retea && cu.rez.retea.p["iese-jos-24"] === 0.5 && cu.rez.retea.p["directie-24"] === 0.5, JSON.stringify(cu && cu.rez.retea));
  assert.deepEqual(cu.rez.retea.pornire, { p: 0.41, rata: 0.52, n: 431 });
  const fara = await prob({ Retea, modele: null });
  assert.ok(fara && fara.rez && !("retea" in fara.rez), JSON.stringify(fara && fara.rez).slice(0, 200));
});

// ---- ruta `retea` (KV fals)
function kvFals() { const m = new Map(); return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "token-de-proba-v10080";
async function cheama(metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.79", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/istoric-bot?" + qs, { method: metoda, headers: h, body: corp ? (typeof corp === "string" ? corp : JSON.stringify(corp)) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}
await test("(7) ruta retea: se scrie și se citește înapoi; peste 512 KB -> 413; modele nevalide / fără versiune -> 400", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.equal((await cheama("GET", "action=retea", env)).d.retea, null);
  const p = await cheama("POST", "action=retea", env, { la: 5, versiune: "r1", modele: { directie: MODELE.directie } }); assert.equal(p.status, 200, JSON.stringify(p.d));
  const g = (await cheama("GET", "action=retea", env)).d.retea; assert.equal(g.versiune, "r1"); assert.deepEqual(g.modele.directie.norm, MODELE.directie.norm);
  assert.equal((await cheama("POST", "action=retea", env, JSON.stringify({ versiune: "r1", modele: { x: "y".repeat(530000) } }))).status, 413);
  assert.equal((await cheama("POST", "action=retea", env, { versiune: "r1", modele: { d: { norm: { m: [0] }, ansamblu: [1, 2, 3, 4, 5, 6] } } })).status, 400);
  assert.equal((await cheama("POST", "action=retea", env, { modele: { directie: MODELE.directie } })).status, 400);
});

await test("(7) colectorul se încarcă întreg (cu Retea și tura de noapte)", () => {
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400)); assert.match(r.stdout, /INCARCAT true/);
});

console.log("\n" + (pica ? "V100.80 COLECTOR PICA · " + pica + " din " + (ok + pica) : "V100.80 COLECTOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

Note pentru executor:
- `turaProbabilitati` cheamă `aduOre` din `tura-profil.mjs`. Cu `cere` care dă `klines: []`, `aduOre` păstrează ce e pe disc (`RANDURI`).
- Bot-ul are `lichidareJos`, iar planul e `null`. Așa, `tinta` și `stop` rămân `null` și nu apare cursa.
- Testul „fără modele” verifică doar că payload-ul nu are cheia `retea`.

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080-colector.mjs`
Expected: `Cannot find module … tura-retea.mjs`.

- [ ] **Step 3: `public/lib/retea.js`** — adaugă înainte de `return { VERSIUNE: …`:

```js
  // aceleași intrări ca Probabilitati.pentruBot (o = {acum, pret, dir, jos, sus, lichidare, tinta, stop}); modele = {tinta: model}.
  // -> { la, v, p: {cod: probabilitate} } pe codurile rândurilor 🎲 + „directie-24”; null fără modele, fără 30 de zile de bare sau fără nicio cifră
  function pentruBot(modele, bare, o, btc) {
    o = o || {}; if (!modele || typeof modele !== "object") return null;
    var acum = nr(o.acum) || Date.now(), b = Probabilitati.pregateste(bare, acum), f = trasaturiBare(b, b.length - 1, btc ? Probabilitati.pregateste(btc, acum) : null), pr = nr(o.pret);
    if (!f || !(pr > 0)) return null;
    var rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / pr - 1 : null; }, dir = String(o.dir || "").toLowerCase(), p = {}, k = 0;
    var pune = function (cod, tinta, e) { var m = modele[tinta]; if (!m || m.versiune !== VERSIUNE) return; var x = intrare(tinta, f, e), q = x ? prezice(m, x) : null; if (q !== null) { p[cod] = Math.round(q * 1000) / 1000; k++; } };
    var jos = rel(o.jos), sus = rel(o.sus), lich = rel(o.lichidare), tinta = rel(o.tinta), stop = rel(o.stop);
    if (jos !== null && jos < 0) { pune("iese-jos-24", "atinge-24", { rel: jos, H: 24 }); pune("iese-jos-72", "atinge-72", { rel: jos, H: 72 }); }
    if (sus !== null && sus > 0) { pune("iese-sus-24", "atinge-24", { rel: sus, H: 24 }); pune("iese-sus-72", "atinge-72", { rel: sus, H: 72 }); }
    if ((dir === "long" && lich !== null && lich < 0) || (dir === "short" && lich !== null && lich > 0)) pune("lichidare", "atinge-168", { rel: lich, H: 168 });
    var cursaOk = tinta !== null && stop !== null && (dir === "long" ? tinta > 0 && stop < 0 && (lich === null || stop > lich) : dir === "short" ? tinta < 0 && stop > 0 && (lich === null || stop < lich) : false);
    if (cursaOk) pune("cursa", "cursa", { relT: tinta, relS: stop });
    if (f.stare && f.stare.indexOf("liniste") === 0) { pune("liniste-24", "liniste", { H: 24 }); pune("liniste-48", "liniste", { H: 48 }); }
    pune("directie-24", "directie", {});
    return k ? { la: acum, v: VERSIUNE, p: p } : null;
  }
  // „Rezultatul tău” la pornire: botul care rulează (pornit = pornitLa) sau fișa (pornit = acum); ist = boții închiși (forma JurnalTrade)
  function pentruPornire(modele, t, bare, btc, ist) {
    var m = modele && modele.rezultat; if (!m || m.versiune !== VERSIUNE) return null;
    var por = nr(t && t.pornit); if (por === null) return null;
    var f = trasaturiBot(t, Probabilitati.pregateste(bare, por), btc ? Probabilitati.pregateste(btc, por) : null, ist); if (!f) return null;
    var q = prezice(m, f.x); return q === null ? null : { p: Math.round(q * 1000) / 1000, rata: Math.round(f.rata * 1000) / 1000, n: f.n };
  }
```

și în obiectul întors adaugă `pentruBot: pentruBot, pentruPornire: pentruPornire`.

- [ ] **Step 4: Scrie `scripts/lib/tura-retea.mjs`:**

```js
// Rețeaua neuronală în colector (specul rețelei, livrarea 1): noaptea (02–05), o dată pe zi - (1) istoria de ~400 de zile a barelor de 1 h
// în data/retea/ore/ (separat: profilul și sfaturile rămân pe 185 de zile), (2) boții închiși în data/retea/boti.json, (3) antrenorul
// într-un proces SEPARAT (prioritate scăzută, oprit după 35 de minute - colectorul nu încarcă TensorFlow), (4) modelele urcate în KV
// (`retea`). Antrenorul care pică lasă modelul de ieri (pe disc și în KV). d.forta = o tură acum, oricând (steagul porneste-acum).
// deps: { acum, stare, forta, eNoapte(t), ziRo(t), simboluri, cereKlines(simbol, end), pauza(ms), citesteOre(s), scrieOre(s, rânduri),
//         boti() -> [JurnalTrade + simbol], scrieBoti(l), porneste() -> Promise<{cod, minute}>, citesteModele(), trimite, jurnal, scrieStare(st) }
const ORA = 3600000, ZILE = 400, PAGINI = 300;
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const tBara = (r) => Number(r && r.time);
// paginile mai vechi până la ~400 de zile (sau până spune Pionex că nu mai are: MARKET_INVALID_TIME / pagină goală), plus pagina cea
// mai nouă; ce era pe disc rămâne; buget.pagini scade cu fiecare cerere
export async function aduInapoi(simbol, vechi, d, buget) {
  const h = new Map(); let cea = Infinity;
  const pune = (r) => { const t = tBara(r); if (Number.isFinite(t)) { h.set(t, r); if (t < cea) cea = t; } };
  for (const r of Array.isArray(vechi) ? vechi : []) pune(r);
  const ia = async (end) => {
    buget.pagini--; const k = await d.cereKlines(simbol, end), r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r) { if (/INVALID_TIME|endTime/i.test(JSON.stringify(k || {}))) return []; throw new Error((k && (k.error || k.message)) || "fără lumânări 60M"); }
    r.forEach(pune); return r;
  };
  const deLa = d.acum - ZILE * 24 * ORA; let complet = false, pagini = 1;
  await ia(null);
  while (buget.pagini > 0) {
    if (cea <= deLa) { complet = true; break; }
    await d.pauza(1600);
    const inainte = cea, r = await ia(cea - 1); pagini++;
    if (!r.length || cea >= inainte) { complet = true; break; }
  }
  return { randuri: [...h.values()].sort((a, b) => tBara(a) - tBara(b)), complet, pagini };
}
export async function turaRetea(d) {
  const st = d.stare, azi = d.ziRo(d.acum);
  if (st.inLucru) return null;
  if (!d.forta && (!d.eNoapte(d.acum) || st.zi === azi)) return null;
  st.inLucru = true;
  try {
    st.complete = st.complete || {};
    const buget = { pagini: PAGINI };
    for (const s of d.simboluri) {
      if (buget.pagini <= 0) break;
      if (st.complete[s] && s !== "BTC_USDT_PERP") continue;   // BTC nu e în istoric-1h: se ține la zi în fiecare noapte
      try { const r = await aduInapoi(s, d.citesteOre(s), d, buget); d.scrieOre(s, r.randuri); if (r.complet) st.complete[s] = true; }
      catch (e) { d.jurnal("retea: istoria " + s, e.message); }
    }
    try { const l = await d.boti(); d.scrieBoti(l); d.jurnal("retea: " + cate(l.length, "bot închis", "boți închiși") + " pentru rezultatul tău"); } catch (e) { d.jurnal("retea: boții", e.message); }
    const r = await d.porneste();
    d.jurnal("retea: antrenorul a ieșit cu " + r.cod + " după " + cate(r.minute, "minut", "minute"));
    const m = r.cod === 0 ? d.citesteModele() : null;
    if (m && m.modele && Object.keys(m.modele).length) {
      try { await d.trimite("/api/istoric-bot?action=retea", { la: m.la, versiune: m.versiune, modele: m.modele }); d.jurnal("retea: urcate " + cate(Object.keys(m.modele).length, "model", "modele")); }
      catch (e) { d.jurnal("retea: urcarea", e.message); }
    } else d.jurnal("retea: nimic urcat, modelele de ieri rămân");
    st.zi = azi;
    return { cod: r.cod };
  } finally { st.inLucru = false; d.scrieStare(st); }
}
```

- [ ] **Step 5: `scripts/lib/tura-probabilitati.mjs`**. După rândul cu `rez.indicatori = d.Dovada.peBot(…)` și înaintea rândului `await d.trimite("/api/istoric-bot?action=prob", …)`, inserează:

```js
      // v101.56 (rețeaua neuronală, livrarea 1): a doua părere 🧠 - aceleași bare și aceleași niveluri ca 🎲; nimic fără modele
      if (rez && d.Retea && d.modele) {
        try {
          const rt = d.Retea.pentruBot(d.modele, bare, { acum: d.acum, pret: nr(b.pretCurent), dir, jos: nr(b.gridJos), sus: nr(b.gridSus), lichidare: dir === "short" ? nr(b.lichidareSus) : nr(b.lichidareJos), tinta, stop }, d.btc || null);
          if (rt) { const pz = d.pornireDe ? d.pornireDe(b, bare) : null; if (pz) rt.pornire = pz; rez.retea = rt; }
        } catch (e) { d.jurnal("retea ESEC", b.id, e.message); }
      }
```

- [ ] **Step 6: `scripts/colector.mjs`.** Patru editări, fiecare cu Edit pe textul exact:

(a) Importurile:
- `import { execFile } from "node:child_process";` devine `import { execFile, spawn } from "node:child_process";`;
- `import { turaProfil as turaProfilModul } from "./lib/tura-profil.mjs";` devine `import { turaProfil as turaProfilModul, eNoapte } from "./lib/tura-profil.mjs";`;
- după rândul `import { turaProbabilitati as turaProbabilitatiModul } …` adaugă:
  ```js
  import { turaRetea as turaReteaModul } from "./lib/tura-retea.mjs";   // v101.56 (rețeaua neuronală, livrarea 1)
  ```

(b) Modulul. După rândul cu `const Asemanatoare = new Function(…)` adaugă:

```js
const Retea = new Function("Probabilitati", fs.readFileSync(path.join(RAD, "public", "lib", "retea.js"), "utf8") + "; return Retea;")(Probabilitati);   // v101.56 (rețeaua neuronală, livrarea 1)
```

În lista INCARCAT, `…, Valoare, Perechi].every(Boolean)` devine `…, Valoare, Perechi, Retea].every(Boolean)`.

(c) Blocul rețelei, imediat după funcția `turaProbabilitati()` din colector, adică înainte de comentariul `// v101.28 (I-469): cazurile din arhiva …`:

```js
// v101.56 (rețeaua neuronală, livrarea 1): antrenorul de noapte (retea/antreneaza.mjs, proces separat), modelele de pe disc pentru 🧠,
// BTC pentru „acum” (pagina nouă din Pionex + depozitul de 400 de zile), rezultatul tău la pornire (o dată pe bot și pe model)
const RETEA_DIR = path.join(DATA, "retea"), RETEA_ORE = path.join(RETEA_DIR, "ore"), RETEA_STARE = path.join(RETEA_DIR, "stare.json"), RETEA_ACUM = path.join(RETEA_DIR, "porneste-acum");
fs.mkdirSync(RETEA_ORE, { recursive: true });
let reteaStare = {}; try { reteaStare = JSON.parse(fs.readFileSync(RETEA_STARE, "utf8")) || {}; } catch { reteaStare = {}; }
reteaStare.inLucru = false;
const reteaFis = (s) => path.join(RETEA_ORE, String(s).replace(/[^A-Z0-9_]/gi, "") + ".json");
const citesteJson = (f, impl) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return impl; } };
const peDisc = {};
function dinDisc(f) { try { const m = fs.statSync(f).mtimeMs; if (!peDisc[f] || peDisc[f].m !== m) peDisc[f] = { m, v: JSON.parse(fs.readFileSync(f, "utf8")) }; return peDisc[f].v; } catch { return null; } }
function modeleRetea() { const x = dinDisc(path.join(RETEA_DIR, "modele.json")); return x && x.versiune === Retea.VERSIUNE && x.modele && Object.keys(x.modele).length ? x.modele : null; }
let btcViu = { la: 0, b: null };
async function bareBtc() {
  if (btcViu.b && Date.now() - btcViu.la < 50 * 60000) return btcViu.b;
  let viu = []; try { const k = await cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500"); viu = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : []; } catch {}
  btcViu = { la: Date.now(), b: GridCalcul.bare(viu.concat(citesteJson(reteaFis("BTC_USDT_PERP"), []))) };   // pagina vie întâi: bara ei închisă bate bara în curs din depozit
  return btcViu.b;
}
function pornireDe(modele, btc) {
  const cheie = Retea.VERSIUNE + "|" + (modele.rezultat ? modele.rezultat.la : 0);
  return (b, bare) => {
    const cache = reteaStare.pornire || (reteaStare.pornire = {}), c = cache[b.id]; if (c && c.cheie === cheie) return c.r;
    const g = TabloExtra.geometrieBot(b), r = Retea.pentruPornire(modele, { moneda: JurnalTrade.moneda(b.baza), dir: String(b.directie || "").toLowerCase(), levier: b.levier, jos: b.gridJos, sus: b.gridSus, pasNet: g ? g.netPct : null, pus: b.investit, pornit: b.pornitLa }, bare, btc, dinDisc(path.join(RETEA_DIR, "boti.json")) || []);
    cache[b.id] = { cheie, r }; return r;
  };
}
function pornesteAntrenorul() {
  return new Promise((gata) => {
    const t0 = Date.now(), c = spawn(process.execPath, [path.join(RAD, "retea", "antreneaza.mjs"), "--buget-min", "30"], { cwd: RAD, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    try { os.setPriority(c.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
    const rand = (x) => String(x).split(/\r?\n/).filter(Boolean).forEach((l) => jurnal("retea:", l.slice(0, 300)));
    c.stdout.on("data", rand); c.stderr.on("data", rand);
    const ceas = setTimeout(() => { jurnal("retea: antrenorul oprit după 35 de minute"); try { c.kill(); } catch {} }, 35 * 60000);
    c.on("error", (e) => { clearTimeout(ceas); jurnal("retea: antrenorul nu pornește", e.message); gata({ cod: -1, minute: 0 }); });
    c.on("exit", (cod) => { clearTimeout(ceas); gata({ cod: cod === null ? -1 : cod, minute: Math.round((Date.now() - t0) / 60000) }); });
  });
}
async function turaReteaColector() {
  const forta = fs.existsSync(RETEA_ACUM); if (forta) { try { fs.unlinkSync(RETEA_ACUM); } catch {} }
  await turaReteaModul({ acum: Date.now(), stare: reteaStare, forta, eNoapte, ziRo: (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t)),
    simboluri: [...new Set(Object.values(simbolPeMoneda()).concat(["BTC_USDT_PERP"]))],
    cereKlines: (s, end) => cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=60M&limit=500" + (end ? "&endTime=" + end : "")),
    pauza: (ms) => new Promise((r) => setTimeout(r, ms)),
    citesteOre: (s) => citesteJson(reteaFis(s), []).concat(citesteJson(fisOre(s), [])),
    scrieOre: (s, r) => { try { scrieAtomic(reteaFis(s), r); } catch (e) { jurnal("retea: ore nescrise", s, e.message); } },
    boti: async () => { const h = simbolPeMoneda(); return JurnalTrade.din(await botiInchisiToti()).map((t) => ({ id: t.id, moneda: t.moneda, simbol: h[t.moneda] || null, dir: t.dir, levier: t.levier, jos: t.jos, sus: t.sus, pasNet: t.pasNet, pus: t.pus, investit: t.investit, net: t.net, pornit: t.pornit, inchis: t.inchis })).filter((t) => t.simbol); },
    scrieBoti: (l) => scrieAtomic(path.join(RETEA_DIR, "boti.json"), l),
    porneste: pornesteAntrenorul, citesteModele: () => citesteJson(path.join(RETEA_DIR, "modele.json"), null), trimite, jurnal,
    scrieStare: (st) => { try { scrieAtomic(RETEA_STARE, st); } catch {} } });
}
```

(d) În funcția `turaProbabilitati()` din colector:
- după `const act = await cere("/api/bot-orders");` adaugă `const modele = modeleRetea(), btc = modele ? await bareBtc() : null;   // v101.56`;
- în obiectul dat lui `turaProbabilitatiModul`, după `stare: probStare,`, adaugă `Retea, modele, btc, pornireDe: modele ? pornireDe(modele, btc) : null,`.

În `bucla()`, după rândul `turaProbabilitati().catch(…);   // v101.27 (pachetul 2a)`, adaugă:

```js
  turaReteaColector().catch((e) => jurnal("retea", e.message));   // v101.56 (rețeaua neuronală, livrarea 1): noaptea, o dată pe zi
```

Notă: `reteaStare` e scris de `turaRetea` prin `scrieStare` în `finally`, inclusiv cache-ul `pornire`. Rezultatul la pornire nu se mai socotește la fiecare oră.

- [ ] **Step 7: `functions/api/istoric-bot.js`:**
- **GET:** după rândul `if(action==="cazuri"){…return json({cazuri:c})}` adaugă:
  ```js
  if(action==="retea"){let r=null;try{r=JSON.parse(await env.ISTORIC.get("retea")||"null")}catch{r=null}return json({retea:r})}
  ```
- **limita corpului:** în POST, `action==="cazuri"?1048576:` devine `action==="cazuri"?1048576:action==="retea"?524288:`.
- **POST:** înainte de `if(action==="prob"){` adaugă:
  ```js
  // v100.80 (rețeaua neuronală, livrarea 1): modelele de azi-noapte (antrenorul de acasă, prin colector); forma o citește Retea.prezice
  if(action==="retea"){
    const m=corp&&corp.modele,v=corp&&typeof corp.versiune==="string"?corp.versiune.slice(0,16):null;
    if(!m||typeof m!=="object"||!v)return json({error:"Lipseste modele sau versiune"},400);
    const bun=x=>x&&typeof x==="object"&&x.norm&&Array.isArray(x.norm.m)&&x.norm.m.length<=64&&Array.isArray(x.ansamblu)&&x.ansamblu.length>=1&&x.ansamblu.length<=5;
    if(Object.keys(m).length>12||!Object.values(m).every(bun))return json({error:"Modele nevalide"},400);
    await env.ISTORIC.put("retea",JSON.stringify({la:nr(corp.la)||Date.now(),versiune:v,modele:m}));return json({ok:true,n:Object.keys(m).length});
  }
  ```

- [ ] **Step 8: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080-colector.mjs && node scripts/colector-v77.mjs | tail -1`
Expected: `V100.80 COLECTOR PASS · 11/11` și `V77_COLECTOR PASS · 32/32`.

- [ ] **Step 9: Leagă proba** (`"test:v10080col": "node scripts/proba-v10080-colector.mjs"` + lanțul), apoi commit:

```bash
npm test > "$SCRATCH/npm-test-80-7.log" 2>&1 && git add public/lib/retea.js scripts/lib/tura-retea.mjs scripts/lib/tura-probabilitati.mjs scripts/colector.mjs functions/api/istoric-bot.js scripts/proba-v10080-colector.mjs package.json && git commit -q -m "feat(retea): colectorul — istoria de 400 de zile, antrenorul de noapte, rez.retea, ruta retea (livrarea 1, task 7)" && echo GATA
```

---

### Task 8: Tabloul — sub-blocul 🧠, textele lui și garda STRICTĂ `retea`

**Files:**
- Modify: `public/lib/retea.js` (`randuri`, `antet`, `subsol`, `textPornire` + exportul)
- Modify: `public/app.js` (`reteaM`, `reteaAdu`, `reteaHtml`, `tbDeseneazaProb`)
- Modify: `public/app.css` (`.tbRetea`)
- Modify: `public/index.html` (`<script src="/lib/retea.js">`), `public/sw.js` (APP_SHELL)
- Create: `scripts/lib/garda-retea.mjs`
- Modify: `scripts/garda-texte.mjs` (modulul, generatorul, STRICT)
- Create: `scripts/proba-v10080-ecran.mjs`
- Modify: `package.json` (`test:v10080ecr` + lanțul)

**Interfaces:**
- Consumes:
  - din Task 1: `Retea.verdict`, `VERSIUNE`, `TINTE`;
  - din Task 7: `rez.retea = {la, v, p, pornire?}` și GET `action=retea`;
  - pagina: `Probabilitati.randuri(rez, cal, o)` (rândurile 🎲: `{cod, titlu, p, ic, avertizare, text}`), `tbProbRandHtml(x)`.
- Produces:
  - `Retea.randuri(modele, rt, zar, {acum, pornire?}) -> [{cod, titlu, p, ic: null, avertizare: false, text}]`;
  - `Retea.antet(modele, acum) -> {titlu, sub}`;
  - `Retea.subsol(modele) -> string[]`;
  - `Retea.textPornire(pz, vd) -> string`;
  - pagina: `reteaM = {la, m, inLucru}`, `reteaAdu(dupa)`, `reteaHtml(rt, zar, o) -> string`.

- [ ] **Step 1: Scrie proba (roșie)** — `scripts/proba-v10080-ecran.mjs`:

```js
// Proba v100.80 (ecranul) - rețeaua neuronală, livrarea 1: rândurile 🧠 (aceleași titluri ca 🎲, cifra rețelei, 🎲 alături, starea),
// direcția „cât dat cu banul” până e dovedită, rezultatul tău lângă rata ta, capul (modelul vechi), „Cum s-a verificat”; sub-blocul pe
// Tablou (fără modele - nimic), retea.js încărcat și pus în cache, garda STRICTĂ „retea” fără abateri.
//   node scripts/proba-v10080-ecran.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Retea: R } = globalThis;
const app = () => fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
const fn = (nume) => { const s = app(), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const ACUM = Date.UTC(2026, 9, 4, 12), V = { luni: 11, luniGata: 11, nIndep: 312, reper: "🎲", brier: 0.1834, brierReper: 0.1801, brierLog: 0.1822, ic: [-0.0412, 0.0123], icLog: [-0.02, 0.01], bss3: -0.004, logloss: 0.5412, loglossReper: 0.5388, loglossLog: 0.54 };
const MOD = Object.fromEntries(Object.keys(R.TINTE).map((t) => [t, { tinta: t, versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: { ...V, reper: t === "rezultat" ? "rata pe monedă" : V.reper } }]));
const ZAR = [{ cod: "iese-jos-24", titlu: "Atinge marginea de jos (0.3605) în 24 h", p: 0.18 }, { cod: "lichidare", titlu: "Atinge lichidarea (0.2104) în 7 zile", p: 0.02 }];
const RT = { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.21, lichidare: 0.03, "directie-24": 0.51 } };
console.log("Proba v100.80 (ecranul) · rândurile 🧠, Tabloul, garda");

await test("(8) rândurile: titlul 🎲, cifra rețelei, „🎲 18% · nedovedită: nu bate 🎲 (Brier 0,183 față de 0,180)”; direcția; rezultatul tău", () => {
  const l = R.randuri(MOD, RT, ZAR, { acum: ACUM, pornire: { p: 0.41, rata: 0.524, n: 431 } });
  assert.deepEqual(l.map((x) => x.cod), ["iese-jos-24", "lichidare", "directie-24", "rezultat"]);
  assert.equal(l[0].titlu, ZAR[0].titlu); assert.equal(l[0].p, 0.21); assert.equal(l[0].text, "🎲 18% · nedovedită: nu bate 🎲 (Brier 0,183 față de 0,180)");
  assert.equal(l[2].titlu, "Prețul mai sus peste 24 h"); assert.match(l[2].text, /^cât dat cu banul — nedovedită: /);
  assert.equal(l[3].titlu, "La pornire, un bot ca ăsta ieșea pe plus"); assert.equal(l[3].text, "rata ta: 52% · nedovedită: nu bate rata pe monedă (Brier 0,183 față de 0,180)");
  const dov = { ...MOD, "atinge-24": { ...MOD["atinge-24"], verificare: { ...V, brier: 0.17, ic: [0.01, 0.08], icLog: [0.004, 0.03], bss3: 0.02, logloss: 0.52, loglossLog: 0.53 } } };
  assert.equal(R.randuri(dov, RT, ZAR, { acum: ACUM })[0].text, "🎲 18% · dovedită pe 312 zile independente");
});

await test("(8) fără modele, pe altă versiune sau fără cifra rețelei: niciun rând (nu „NaN%”, nu „0%”)", () => {
  assert.deepEqual(R.randuri(null, RT, ZAR, { acum: ACUM }), []);
  assert.deepEqual(R.randuri(MOD, { ...RT, v: "r0" }, ZAR, { acum: ACUM }), []);
  assert.deepEqual(R.randuri(MOD, { la: ACUM, v: R.VERSIUNE, p: {} }, ZAR, { acum: ACUM }), []);
});

await test("(8) capul: modelul mai vechi de 2 zile se spune; „Cum s-a verificat”: un rând pe țintă, cu blocurile ei", () => {
  assert.equal(R.antet(MOD, ACUM).titlu, "🧠 Rețeaua neuronală — a doua părere");
  assert.equal(R.antet(MOD, ACUM + 3 * 864e5).sub, "Model de acum 3 zile — antrenarea n-a mers de atunci.");
  const s = R.subsol(MOD); assert.equal(s.length, 7);
  assert.equal(s[0], "Atinge un nivel în 24 h: 312 zile independente, Brier 0,183 · 🎲 0,180 · formula simplă 0,182 · IC −0,04…0,01.");
  assert.match(s.find((x) => /^Atinge lichidarea/.test(x)), /: 312 săptămâni,/);   // 312: fără „de” (ultimele două cifre 12 < 20)
});

await test("(8) Tabloul: reteaHtml desenează sub-blocul (capul, rândurile, „Cum s-a verificat” pliat); fără modele -> nimic", () => {
  const ctx = { Retea: R, escapeHtml: (x) => String(x), reteaM: { m: MOD }, Date };
  vm.createContext(ctx); vm.runInContext(fn("tbProbRandHtml") + "\n" + fn("reteaHtml") + ";this.f=reteaHtml;", ctx);
  const h = ctx.f(RT, ZAR, { acum: ACUM });
  assert.match(h, /^<div class="tbRetea"><h4 class="tbProbH">🧠 Rețeaua neuronală — a doua părere<\/h4>/);
  assert.match(h, /<details class="tbProbFara"><summary>Cum s-a verificat<\/summary>/); assert.equal((h.match(/class="tbProbRand/g) || []).length, 3);
  ctx.reteaM.m = null; assert.equal(ctx.f(RT, ZAR, { acum: ACUM }), "");
  assert.match(fn("tbDeseneazaProb"), /\+reteaHtml\(rez\.retea,l,\{acum:Date\.now\(\),pornire:rez\.retea&&rez\.retea\.pornire\}\)/);
});

await test("(8) retea.js se încarcă după probabilitati.js și e în cache-ul aplicației", () => {
  assert.match(fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), /<script src="\/lib\/probabilitati\.js"><\/script><script src="\/lib\/retea\.js"><\/script>/);
  assert.match(fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8"), /"\/lib\/probabilitati\.js","\/lib\/retea\.js"/);
});

await test("(8) garda: grupul „retea” e STRICT și n-are abateri (toate formele verdictului, capul, verificarea, rândul de la poartă)", () => {
  assert.ok(STRICT.has("retea"));
  const s = situatii().filter((x) => x.mod === "retea"); assert.ok(s.length >= 60, String(s.length));
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.ab.join("; ") + " — " + q.x.text).join("\n"));
});

console.log("\n" + (pica ? "V100.80 ECRAN PICA · " + pica + " din " + (ok + pica) : "V100.80 ECRAN PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Rulează proba — trebuie să pice**

Run: `node scripts/proba-v10080-ecran.mjs`
Expected: testele pică pe rând: `R.randuri is not a function`, „lipsește reteaHtml”, garda fără `retea`.

- [ ] **Step 3: `public/lib/retea.js`** — adaugă înainte de `return { VERSIUNE: …`:

```js
  // ---- rândurile 🧠 (Tablou, fișă) ----
  var NUME = { "atinge-24": "Atinge un nivel în 24 h", "atinge-72": "Atinge un nivel în 3 zile", "atinge-168": "Atinge lichidarea în 7 zile", cursa: "Ținta înaintea stopului, în 7 zile", liniste: "Liniștea mai ține", directie: "Prețul mai sus peste 24 h", rezultat: "Rezultatul tău" };
  var UNIT = { 24: ["zi independentă", "zile independente"], 48: ["bloc de 2 zile", "blocuri de 2 zile"], 72: ["bloc de 3 zile", "blocuri de 3 zile"], 168: ["săptămână", "săptămâni"] };
  var TINTA_DE = { cursa: "cursa", "iese-jos-24": "atinge-24", "iese-sus-24": "atinge-24", "iese-jos-72": "atinge-72", "iese-sus-72": "atinge-72", lichidare: "atinge-168", "liniste-24": "liniste", "liniste-48": "liniste", "directie-24": "directie" };
  function PC(v) { return Math.round(v * 100) + "%"; }
  function eticheta(vd) { var u = UNIT[vd.bloc] || UNIT[24]; return vd.dovedita ? "dovedită pe " + cate(vd.nIndep, u[0], u[1]) : "nedovedită: " + vd.motiv; }
  // forma tbProbRandHtml ({cod, titlu, p, ic, avertizare, text}): titlul rândului 🎲, cifra rețelei, cifra 🎲 alături și starea;
  // direcția cu „cât dat cu banul” până e dovedită; rezultatul tău lângă rata ta. zar = Probabilitati.randuri(...); o = {acum, pornire}
  function randuri(modele, rt, zar, o) {
    o = o || {}; var out = [], p = rt && rt.p || {}, acum = nr(o.acum) || Date.now();
    if (!modele || !rt || (rt.v && rt.v !== VERSIUNE)) return out;
    (Array.isArray(zar) ? zar : []).forEach(function (z) {
      var q = nr(p[z.cod]), vd = verdict(modele[TINTA_DE[z.cod]], acum); if (q === null || !vd || nr(z.p) === null) return;
      out.push({ cod: z.cod, titlu: z.titlu, p: q, ic: null, avertizare: false, text: "🎲 " + PC(z.p) + " · " + eticheta(vd) });
    });
    var qd = nr(p["directie-24"]), vdd = verdict(modele.directie, acum);
    if (qd !== null && vdd) out.push({ cod: "directie-24", titlu: NUME.directie, p: qd, ic: null, avertizare: false, text: vdd.dovedita ? eticheta(vdd) : "cât dat cu banul — " + eticheta(vdd) });
    var pz = o.pornire, vdr = verdict(modele.rezultat, acum);
    if (pz && nr(pz.p) !== null && nr(pz.rata) !== null && vdr) out.push({ cod: "rezultat", titlu: "La pornire, un bot ca ăsta ieșea pe plus", p: pz.p, ic: null, avertizare: false, text: "rata ta: " + PC(pz.rata) + " · " + eticheta(vdr) });
    return out;
  }
  // capul sub-blocului; modelul mai vechi de 2 zile se spune (antrenarea n-a mers de atunci)
  function antet(modele, acum) {
    var la = 0; Object.keys(modele || {}).forEach(function (k) { var x = nr(modele[k] && modele[k].la); if (x !== null && x > la) la = x; });
    var z = la ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null;
    return { titlu: "🧠 Rețeaua neuronală — a doua părere", sub: z !== null && z >= 2 ? "Model de acum " + cate(z, "zi", "zile") + " — antrenarea n-a mers de atunci." : "Nu schimbă semaforul, verdictul sau alertele; o cifră contează doar când e „dovedită”." };
  }
  // „Cum s-a verificat”: un rând pe țintă - cazurile independente, Brier rețea / reper / formula simplă, IC față de reper
  function subsol(modele) {
    return Object.keys(NUME).filter(function (k) { return modele && modele[k] && modele[k].versiune === VERSIUNE; }).map(function (k) {
      var v = modele[k].verificare, u = UNIT[(TINTE[k] || { bloc: 24 }).bloc] || UNIT[24];
      if (!v) return NUME[k] + ": neverificată încă.";
      return NUME[k] + ": " + cate(v.nIndep, u[0], u[1]) + ", Brier " + num(v.brier, 3) + " · " + (v.reper || "🎲") + " " + num(v.brierReper, 3) + " · formula simplă " + num(v.brierLog, 3) + (v.ic ? " · IC " + num(v.ic[0], 2) + "…" + num(v.ic[1], 2) : "") + ".";
    });
  }
  // rândul gri de la poarta fișei
  function textPornire(pz, vd) { return "Un bot ca ăsta ar ieși pe plus: " + PC(pz.p) + " · rata ta: " + PC(pz.rata) + " · " + eticheta(vd) + "."; }
```

și în obiectul întors adaugă `randuri: randuri, antet: antet, subsol: subsol, textPornire: textPornire`.

- [ ] **Step 4: `public/app.js`** — imediat înainte de `function tbProbRandHtml(x){`, adaugă:

```js
// v100.80 (rețeaua neuronală, livrarea 1): modelele (KV retea, antrenate acasă noaptea), o dată la 30 de minute; fără server -> nimic
var reteaM={la:0,m:null,inLucru:false};
function reteaAdu(dupa){if(typeof Retea==="undefined"||reteaM.inLucru||Date.now()-reteaM.la<30*60000)return;reteaM.inLucru=true;getJSON("/api/istoric-bot?action=retea").then(function(d){reteaM.m=d&&d.retea&&d.retea.versiune===Retea.VERSIUNE?d.retea.modele:null}).catch(function(){reteaM.m=null}).then(function(){reteaM.la=Date.now();reteaM.inLucru=false;if(reteaM.m&&typeof dupa==="function")dupa()})}
// sub-blocul 🧠 sub 🎲 (Tablou și fișă): capul, rândurile (forma tbProbRandHtml), „Cum s-a verificat” pliat; fără modele -> nimic
function reteaHtml(rt,zar,o){var m=reteaM.m;if(typeof Retea==="undefined"||!m||!rt)return "";var l=Retea.randuri(m,rt,zar,o);if(!l.length)return "";var an=Retea.antet(m,o&&o.acum||Date.now());
  return '<div class="tbRetea"><h4 class="tbProbH">'+escapeHtml(an.titlu)+'</h4><p class="tbSub">'+escapeHtml(an.sub)+'</p>'+l.map(tbProbRandHtml).join("")+'<details class="tbProbFara"><summary>Cum s-a verificat</summary>'+Retea.subsol(m).map(function(x){return '<p class="tbSub">'+escapeHtml(x)+'</p>'}).join("")+'</details></div>'}
```

În `tbDeseneazaProb(b)`:
- după `if(!rez){card.hidden=true;return}`, adaugă `reteaAdu(function(){if(tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaProb(tbStare.bot)});`;
- în `el.innerHTML=(l.length?l.map(tbProbRandHtml).join(""):'<p class="tbSub">Nicio cifră de arătat: botul n-are margini sau plan pe care să le socotesc.</p>')`, adaugă imediat după paranteza închisă `+reteaHtml(rez.retea,l,{acum:Date.now(),pornire:rez.retea&&rez.retea.pornire})`, înainte de `+tbIndicatoriHtml(rez)`.

- [ ] **Step 5: `public/app.css`** — la sfârșit:

```css
/* v100.80 (rețeaua neuronală): sub-blocul 🧠 sub 🎲 - despărțit cu o linie punctată, aceleași rânduri ca 🎲 */
.tbRetea{margin-top:12px;padding-top:8px;border-top:1px dashed rgba(148,163,184,.35)}
```

- [ ] **Step 6: `public/index.html` și `public/sw.js`:**
- în `index.html`, `<script src="/lib/probabilitati.js"></script><script src="/lib/dovada.js"></script>` devine `<script src="/lib/probabilitati.js"></script><script src="/lib/retea.js"></script><script src="/lib/dovada.js"></script>`;
- în `sw.js`, `"/lib/probabilitati.js","/lib/dovada.js"` devine `"/lib/probabilitati.js","/lib/retea.js","/lib/dovada.js"`.

- [ ] **Step 7: Garda — `scripts/lib/garda-retea.mjs`:**

```js
// Garda textelor, grupul „retea” (rețeaua neuronală, livrarea 1): rândurile 🧠 (Retea.randuri), capul (Retea.antet), „Cum s-a verificat”
// (Retea.subsol) și rândul de la poartă (Retea.textPornire) - cu modulul REAL, pe toate formele verdictului: dovedită (zile / 3 zile /
// săptămâni / 2 zile), prea puține cazuri, nu bate 🎲 / rata pe monedă / 50%, formula simplă, ultimele 3 luni, log-loss, în lucru,
// neverificată, modelul vechi.
export function situatiiRetea(pune) {
  const R = globalThis.Retea, ACUM = Date.UTC(2026, 9, 4, 12);
  const v0 = { luni: 11, luniGata: 11, nIndep: 312, reper: "🎲", brier: 0.1834, brierReper: 0.1801, brierLog: 0.1822, ic: [-0.0412, 0.0123], icLog: [-0.02, 0.01], bss3: -0.004, logloss: 0.5412, loglossReper: 0.5388, loglossLog: 0.54 };
  const bun = { ic: [0.012, 0.081], icLog: [0.004, 0.03], bss3: 0.02, brier: 0.17, logloss: 0.52, loglossLog: 0.53 };
  const VER = { "dovedită": { ...v0, ...bun }, "nu bate reperul": v0, "prea puține cazuri": { ...v0, nIndep: 48 }, "formula simplă": { ...v0, ic: [0.01, 0.05] },
    "ultimele 3 luni": { ...v0, ...bun, bss3: -0.03 }, "log-loss": { ...v0, ...bun, logloss: 0.55 }, "în lucru": { ...v0, luniGata: 6 }, "neverificată": null };
  const ZAR = [{ cod: "cursa", titlu: "Ținta planului (0.4211) înaintea stopului (0.3518), în 7 zile", p: 0.31 }, { cod: "iese-jos-24", titlu: "Atinge marginea de jos (0.3605) în 24 h", p: 0.18 },
    { cod: "iese-sus-24", titlu: "Atinge marginea de sus (0.4012) în 24 h", p: 0.22 }, { cod: "iese-jos-72", titlu: "Atinge marginea de jos în 3 zile", p: 0.41 }, { cod: "iese-sus-72", titlu: "Atinge marginea de sus în 3 zile", p: 0.38 },
    { cod: "lichidare", titlu: "Atinge lichidarea (0.2104) în 7 zile", p: 0.02 }, { cod: "liniste-24", titlu: "Liniștea mai ține o zi", p: 0.64 }, { cod: "liniste-48", titlu: "Liniștea mai ține două zile", p: 0.47 }];
  const RT = { la: ACUM, v: R.VERSIUNE, p: { cursa: 0.28, "iese-jos-24": 0.21, "iese-sus-24": 0.19, "iese-jos-72": 0.44, "iese-sus-72": 0.35, lichidare: 0.03, "liniste-24": 0.6, "liniste-48": 0.45, "directie-24": 0.51 } };
  for (const [sit, v] of Object.entries(VER)) {
    const modele = {};
    for (const t of Object.keys(R.TINTE)) modele[t] = { tinta: t, versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: v && { ...v, reper: t === "rezultat" ? "rata pe monedă" : t === "directie" ? "50%" : "🎲" } };
    R.randuri(modele, RT, ZAR, { acum: ACUM, pornire: { p: 0.41, rata: 0.524, n: 431 } }).forEach((r) => pune("rețeaua: " + sit + " · " + r.cod, "retea", "randuri", r, [["titlu", "detalii"], ["text", "deCe"]]));
    R.subsol(modele).forEach((l, i) => pune("rețeaua: " + sit + " · verificarea " + (i + 1), "retea", "subsol", { t: l }, [["t", "raport"]]));
    pune("rețeaua: " + sit + " · poarta", "retea", "textPornire", { t: R.textPornire({ p: 0.41, rata: 0.524 }, R.verdict(modele.rezultat, ACUM)) }, [["t", "deCe"]]);
  }
  const m1 = { directie: { tinta: "directie", versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: null } }, m3 = { directie: { ...m1.directie, la: ACUM - 3 * 864e5 } };
  pune("rețeaua: capul", "retea", "antet", R.antet(m1, ACUM), [["titlu", "titlu"], ["sub", "deCe"]]);
  pune("rețeaua: capul, modelul vechi", "retea", "antet", R.antet(m3, ACUM), [["titlu", "titlu"], ["sub", "deCe"]]);
}
```

În `scripts/garda-texte.mjs`:
- **importul:** după `import { situatiiAcasa } from "./lib/garda-acasa.mjs";` adaugă `import { situatiiRetea } from "./lib/garda-retea.mjs";   // v100.80 (rețeaua neuronală)`;
- **modulul încărcat:** în lista de la `for (const f of ["text-ro.js", …`, `"probabilitati.js", ` devine `"probabilitati.js", "retea.js", `;
- **STRICT:** `"acasa"]);` devine `"acasa", "retea"]);`. Comentariul de pe rând primește `; v100.80: + retea (rețeaua neuronală)` la sfârșit, nu la mijloc;
- **generatorul:** după `situatiiAcasa(pune);` adaugă rândul `  situatiiRetea(pune);   // v100.80 (rețeaua neuronală, livrarea 1)`.

- [ ] **Step 8: Rulează proba — trebuie să treacă; apoi garda întreagă**

Run: `node scripts/proba-v10080-ecran.mjs && node scripts/garda-texte.mjs | grep -E "STRICT (retea|acasa)"`
Expected: `V100.80 ECRAN PASS · 6/6` și `STRICT retea … 0 cu abateri`.

Dacă garda găsește abateri, se repară **textul** din `retea.js`, nu regula.

- [ ] **Step 9: Leagă proba** (`"test:v10080ecr": "node scripts/proba-v10080-ecran.mjs"` + lanțul), apoi commit:

```bash
npm test > "$SCRATCH/npm-test-80-8.log" 2>&1 && git add public/lib/retea.js public/app.js public/app.css public/index.html public/sw.js scripts/lib/garda-retea.mjs scripts/garda-texte.mjs scripts/proba-v10080-ecran.mjs package.json && git commit -q -m "feat(retea): Tabloul — sub-blocul 🧠 sub 🎲, textele și garda STRICTĂ retea (livrarea 1, task 8)" && echo GATA
```

---

### Task 9: Fișa — sub-blocul 🧠 pe gridul propus și rândul gri de la poartă

**Files:**
- Modify: `public/app.js` (`grProbDeseneaza`, `grRetea`/`grReteaBtc`, `grReteaPoartaHtml`, `grPoartaHtml`, `gridPoarta`)
- Modify: `scripts/proba-v10080-ecran.mjs` (două teste noi)

**Interfaces:**
- Consumes:
  - din Task 7: `Retea.pentruBot`, `Retea.pentruPornire`;
  - din Task 8: `Retea.verdict`, `Retea.textPornire`, `reteaM`, `reteaAdu`, `reteaHtml`;
  - pagina: `TabloExtra.geometrieBot(b)` (pasul net din `{gridJos, gridSus, pretCurent, brut: {buOrderData: {row, gridType}}}`) și `JurnalTrade.moneda`.
- Produces: `grProb.bare` (barele unite, 1 h + 15M) și `grProb.o` (intrările lui `Probabilitati.pentruBot`); `grPoartaRez.trades` / `grPoartaRez.lev`.

- [ ] **Step 1: Teste noi (roșii)** — în `scripts/proba-v10080-ecran.mjs`, înainte de `console.log("\n" + …`:

```js
await test("(9) fișa: 🧠 pe aceleași bare și niveluri ca 🎲 (grProb.bare / grProb.o), cu BTC din Pionex; rândurile sub cele 🎲", () => {
  const f = fn("grProbDeseneaza");
  assert.match(f, /grProb\.bare=Probabilitati\.imbina\(b1,b15,Date\.now\(\)\)/); assert.match(f, /grProb\.rez=Probabilitati\.pentruBot\(grProb\.bare,grProb\.o\)/);
  assert.match(f, /Retea\.pentruBot\(reteaM\.m,grProb\.bare,grProb\.o,grRetea\.btc\)/); assert.match(f, /zar\.map\(tbProbRandHtml\)\.join\(""\)\+reteaHtml\(rt,zar,\{acum:Date\.now\(\)\}\)/);
});
await test("(9) poarta: rândul gri „🧠 Un bot ca ăsta ar ieși pe plus: …” din istoria ta; fără modele / fără bare -> nimic; poarta neschimbată", () => {
  const ctx = { Retea: R, escapeHtml: (x) => String(x), reteaM: { m: null }, grProb: { bare: null }, grRetea: { btc: null }, grProbSetare: (f) => f.setare, Date,
    TabloExtra: { geometrieBot: () => ({ netPct: 0.004 }) }, JurnalTrade: { moneda: (s) => s } };
  vm.createContext(ctx); vm.runInContext(fn("grReteaPoartaHtml") + ";this.f=grReteaPoartaHtml;", ctx);
  const f = { simbol: "LIT_USDT_PERP", dir: "long", pret: 1, setare: { jos: 0.9, sus: 1.1, grile: 20, suma: 50 } }, p = { trades: [], lev: 3 };
  assert.equal(ctx.f(f, p), "");
  const ret = { rezultat: { tinta: "rezultat", versiune: R.VERSIUNE, la: Date.now(), verificare: null } };
  ctx.reteaM.m = ret; ctx.grProb.bare = []; ctx.Retea = { ...R, pentruPornire: () => ({ p: 0.41, rata: 0.524, n: 431 }) };
  assert.equal(ctx.f(f, p), '<p class="tbSub grRetea">🧠 Un bot ca ăsta ar ieși pe plus: 41% · rata ta: 52% · nedovedită: neverificată încă.</p>');
  assert.match(fn("grPoartaHtml"), /\+grReteaPoartaHtml\(f,p\)/); assert.match(fn("gridPoarta"), /trades:trades,lev:lev/);
});
```

Run: `node scripts/proba-v10080-ecran.mjs`
Expected: cele două teste noi pică (`lipsește grReteaPoartaHtml` / regex-urile din `grProbDeseneaza`).

- [ ] **Step 2: `public/app.js` — `grProbDeseneaza`.** Înlocuiește blocul `if(grProb.cheie!==ch){ … grProb.cheie=ch}` cu:

```js
  if(grProb.cheie!==ch){
    var b1=grProb.ore.map(function(r){return {t:r[0],o:r[1],h:r[2],l:r[3],c:r[4]}}),b15=grStare.date&&grStare.simbol===f.simbol?GridCalcul.bare(grStare.date.r15):[];
    // v100.80 (rețeaua): barele unite și intrările se păstrează - 🧠 le folosește pe ACELEAȘI (fără diferență față de 🎲)
    grProb.bare=Probabilitati.imbina(b1,b15,Date.now());
    grProb.o={acum:Date.now(),pret:f.pret,dir:dir,jos:st.jos,sus:st.sus,lichidare:st.lichidare?(dir==="short"?st.lichidare.sus:st.lichidare.jos):null,tinta:st.stop?(dir==="short"?st.stop.jos:st.stop.sus):null,stop:st.stop?(dir==="short"?st.stop.sus:st.stop.jos):null};
    grProb.rez=Probabilitati.pentruBot(grProb.bare,grProb.o);
    grProb.cheie=ch}
```

Apoi `el.innerHTML='<div class="tbBloc grProbBloc">…'` se rescrie așa: rândurile 🎲 trec printr-o variabilă, iar sub ele apare 🧠. Rândul `+Probabilitati.randuri(rez,grProb.cal,{titluCursa:grTitluCursa(rez)}).map(tbProbRandHtml).join("")` devine `+zar.map(tbProbRandHtml).join("")+reteaHtml(rt,zar,{acum:Date.now()})`. Înaintea lui `el.innerHTML=`, pune:

```js
  // v100.80 (rețeaua neuronală): 🧠 pe gridul propus - în browser, cu modelele din KV și BTC din Pionex
  reteaAdu(function(){if(grStare.fisa)renderGrid()});grReteaBtc();
  var zar=Probabilitati.randuri(rez,grProb.cal,{titluCursa:grTitluCursa(rez)}),rt=reteaM.m&&grProb.bare?Retea.pentruBot(reteaM.m,grProb.bare,grProb.o,grRetea.btc):null;
```

- [ ] **Step 3: `public/app.js`** — după funcția `grProbDeseneaza`, adaugă:

```js
// v100.80 (rețeaua neuronală): BTC pentru trăsăturile 🧠 ale fișei (ultimele 500 de ore din Pionex), o dată la 30 de minute
var grRetea={btc:null,la:0,inLucru:false};
function grReteaBtc(){if(typeof Retea==="undefined"||!reteaM.m||grRetea.inLucru||Date.now()-grRetea.la<30*60000)return;grRetea.inLucru=true;getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500").then(function(k){grRetea.btc=GridCalcul.bare(k&&k.data&&k.data.klines||[])}).catch(function(){grRetea.btc=null}).then(function(){grRetea.la=Date.now();grRetea.inLucru=false;if(grStare.fisa)renderGrid()})}
// la poartă, rândul gri: „un bot ca ăsta ar ieși pe plus” din istoria lui și piața de acum - informație, poarta rămâne a ei
function grReteaPoartaHtml(f,p){var m=reteaM.m,st=grProbSetare(f);if(typeof Retea==="undefined"||!m||!m.rezultat||!st||!grProb.bare||!p)return "";
  var g=TabloExtra.geometrieBot({gridJos:st.jos,gridSus:st.sus,pretCurent:f.pret,brut:{buOrderData:{row:(Number(st.grile)||0)+1,gridType:"arithmetic"}}});
  var pz=Retea.pentruPornire(m,{moneda:JurnalTrade.moneda(String(f.simbol).replace(/_USDT_PERP$/,"")),dir:f.dir,levier:p.lev,jos:st.jos,sus:st.sus,pasNet:g?g.netPct:null,pus:st.suma,pornit:Date.now()},grProb.bare,grRetea.btc,p.trades||[]);
  var vd=pz&&Retea.verdict(m.rezultat,Date.now());if(!pz||!vd)return "";
  return '<p class="tbSub grRetea">🧠 '+escapeHtml(Retea.textPornire(pz,vd))+'</p>'}
```

- [ ] **Step 4: `grPoartaHtml` și `gridPoarta`:**
- în `grPoartaHtml`, înaintea rândului `    // v100.29: sfaturile din istoria lui (inchiderile din prima ora) - informatie, nu regula`, inserează două rânduri:
  ```js
      // v100.80 (rețeaua neuronală): rândul gri 🧠, după regulile porții (poarta nu se schimbă)
      +grReteaPoartaHtml(f,p)
  ```
- în `gridPoarta`, `grPoartaRez={simbol:f.simbol,plan:plan,frana:fr,rez:` devine `grPoartaRez={simbol:f.simbol,plan:plan,frana:fr,trades:trades,lev:lev,rez:`.

- [ ] **Step 5: Rulează proba — trebuie să treacă**

Run: `node scripts/proba-v10080-ecran.mjs && node scripts/proba-v10077.mjs | tail -1`
Expected: `V100.80 ECRAN PASS · 8/8`. Proba v100.77 (poarta) rămâne PASS.

- [ ] **Step 6: Commit:**

```bash
npm test > "$SCRATCH/npm-test-80-9.log" 2>&1 && git add public/app.js scripts/proba-v10080-ecran.mjs && git commit -q -m "feat(retea): fișa — 🧠 pe gridul propus și rândul gri de la poartă (livrarea 1, task 9)" && echo GATA
```

---

### Task 10: Livrarea — versiunea, revizia, pozele, prima antrenare, memoria

**Files:**
- Modify: `BUILD_INFO.json`, `functions/_shared/versiune.js`, `package.json`, `public/sw.js`, `public/index.html` (v100.80), `scripts/colector.mjs` (v101.56)
- Memorie: `project_crypto_radar_audit_30_09.md`, `MEMORY.md`

- [ ] **Step 1: Versiunile** — `$SCRATCH/versiuni-80.mjs`. Fiecare „vechi” trebuie să apară exact o dată; `ed.mjs` refuză altfel.

```js
// rețeaua neuronală, livrarea 1 (boții): v100.80 și colectorul v101.56
export const build = [[`"version": "v100.79",`, `"version": "v100.80",`], [`"badge": "v100.79 · BUSOLA: CANALUL ȘI DOVADA",`, `"badge": "v100.80 · REȚEAUA NEURONALĂ (A DOUA PĂRERE)",`]];
export const versiune = [[`export const VERSIUNE = "v100.79";`, `export const VERSIUNE = "v100.80";`]];
export const pkg = [[`"version": "100.79.0",`, `"version": "100.80.0",`]];
export const sw = [[`const CACHE="crypto-radar-v100-79";`, `const CACHE="crypto-radar-v100-80";`]];
export const html = [[`content="v100.79" name="app-version"`, `content="v100.80" name="app-version"`], [`>v100.79 · BUSOLA: CANALUL ȘI DOVADA<`, `>v100.80 · REȚEAUA NEURONALĂ (A DOUA PĂRERE)<`],
  [`>v100.79 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE<`, `>v100.80 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE<`], [`<b id="healthAppVersion">v100.79</b>`, `<b id="healthAppVersion">v100.80</b>`]];
export const colector = [[`const VERSIUNE_COLECTOR = "v101.55";`, `const VERSIUNE_COLECTOR = "v101.56";`]];
```

Run (cu `E=docs/superpowers/plans/2026-10-02-sfaturi-pachetul-2/ed.mjs`, `V=$SCRATCH/versiuni-80.mjs`):
`node $E BUILD_INFO.json $V build && node $E functions/_shared/versiune.js $V versiune && node $E package.json $V pkg && node $E public/sw.js $V sw && node $E public/index.html $V html && node $E scripts/colector.mjs $V colector`
Expected: șase rânduri `ok …`.

- [ ] **Step 2: Suita întreagă și garda**

Run: `npm test > "$SCRATCH/npm-test-80.log" 2>&1; echo EXIT=$?; grep -E "STRICT|PICA|✗" "$SCRATCH/npm-test-80.log" | head -20`
Expected: `EXIT=0`, toate grupurile STRICT cu „0 cu abateri”, inclusiv `retea`. Niciun `PICA`.

- [ ] **Step 3: Revizia Opus a întregii ramuri** (superpowers:requesting-code-review, un singur agent, model Opus).
- Pachetul: `git diff <BASE>..HEAD` plus fișierele noi. BASE e commitul de dinaintea Task 1, notat în ledger la pornire. Revizorul primește specul, planul și Review Focus de aici.
- Constatările Critice și Importante intră într-o singură trecere de reparații, fiecare cu testul văzut ROȘU, apoi suita.
- Minorele se notează, nereparate.

- [ ] **Step 4: Commit + push** (lanțul casei):

```bash
npm test > "$SCRATCH/npm-test-80-final.log" 2>&1 && git add -u && git add retea/ scripts/ && git commit -q -F "$SCRATCH/commit-80.txt" && git push origin HEAD:main > "$SCRATCH/push-80.log" 2>&1 && echo "LANT=0 $(git rev-parse --short HEAD)"
```

Înainte de `git add retea/ scripts/`, rulează `git status --short`. Nimic din `data/` și niciun `node_modules` nu trebuie să apară.

- [ ] **Step 5: Colectorul repornit și prima antrenare** (steagul):
- repornește colectorul cu procedura casei (PID din `data/colector.pid`, `Start-Process node scripts\colector.mjs -WindowStyle Hidden`);
- verifică „pornit, PID …” în jurnal;
- creează steagul `data/retea/porneste-acum`;
- în ≤ 1 minut, jurnalul trebuie să arate `retea:` (istoria, apoi antrenorul). Așteaptă cu Monitor, nu cu `sleep`, până apare `retea: urcate N modele` sau `nimic urcat`.

Expected: `retea: antrenorul a ieșit cu 0` și `retea: urcate 7 modele`. Prima noapte poate spune „verificarea în lucru: k din n luni”, iar asta e corect.

- [ ] **Step 6: Pozele la 1920 și 390** (script în scratchpad, după `poza-78.mjs`):
- Tabloul pe CRV, blocul 🎲: sub-blocul 🧠 apare, fără defilare orizontală;
- fișa pe LIT: sub-blocul 🧠 sub 🎲 și rândul gri de la poartă, după „Verifică poarta”;
- consola e curată, iar pe ecran nu apare „NaN” / „undefined”.

Pozele se judecă cu ochii: frontend-design pentru așezare, dataviz pentru benzi.

- [ ] **Step 7: Memoria:**
- `project_crypto_radar_audit_30_09.md`: livrarea 1 LIVE, hash-ul, PID-ul, starea primei antrenări (lunile gata, ce țintă e dovedită), minorele;
- `MEMORY.md`: rândul scurt.

Raportul final are „## Versionare” (cu `Git: <hash> pushed pe origin/main`), „## Idei” și „ce a adus fiecare skill”.
