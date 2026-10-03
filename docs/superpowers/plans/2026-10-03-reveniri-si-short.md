# Reveniri (monede + acțiuni) și monede pentru short — planul de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trei liste noi lângă sugestiile de acum — „↩️ Pe revenire (bot long)” și „📉 Pentru short” pe Tablou, „↩️ Pe revenire” la acțiuni în Trading 212 — fiecare cu istoricul ei pe față (față de „o zi oarecare”) și urmărită zilnic, plus al doilea rând în „💡 Ce aș cumpăra azi” pe Acasă.

**Architecture:** Un modul pur nou, `public/lib/reveniri.js` (regulile fixate în spec, istoricul, eticheta, urmărirea), folosit la fel de pagină, colector și probe. Monedele: starea de revenire se calculează în tura clasamentului din barele de 4h deja aduse; istoricul și urmărirea lor într-o tură nouă de o dată pe zi (`tura-sugestii.mjs` → `istoric-bot?action=sugestii`). Acțiunile: în tura ideilor, din barele zilnice deja aduse (`t212?action=idei`). Nicio cerere nouă la Pionex / Yahoo.

**Tech Stack:** JavaScript (ES5 în `public/lib`, ESM în colector și probe), Node 24, Cloudflare Pages Functions (wrangler local, KV `ISTORIC`), probele proiectului (`node scripts/proba-*.mjs`, fără framework).

**Spec:** `docs/superpowers/specs/2026-10-03-reveniri-si-short-design.md` (`15c6df5`)

## Global Constraints

- Regulile sunt **exact** cele din spec, fixate — nu se reglează după rezultate:
  - monede pe revenire (4h): cădere ≥ 25% de la maximul pe 30 de zile (180 de bare); prețul ≥ 8% peste minimul pe 10 zile (60 de bare); minimul cu cel puțin 2 zile înainte; prețul peste media închiderilor pe 3 zile (18 bare); doar bare închise;
  - monede pentru short: `stare === "candidat"` și `dir === "short"`;
  - acțiuni pe revenire (zilnic, doar long): cădere ≥ 20% de la maximul pe 60 de zile; prețul ≥ 8% peste minimul pe 20 de zile; minimul cu cel puțin 3 zile de bursă înainte; prețul peste media pe 5 zile; stopul = minimul pe 20 de zile × 0,99; ținta = maximul pe 60 de zile.
- Plafoane: monede pe revenire ≤ 5 (după volum), short ≤ 5 (după `scor`), acțiuni ≤ 10 (după cădere); notările zilei ≤ 20 pe trimitere; istoricul notărilor 150 de zile.
- Eticheta: „mai bine” dacă pe plus ≥ +3 puncte față de reper **și** media peste reper; „mai slab” dacă ≥ 3 puncte sub **și** media sub; altfel „cam la fel”; „puține” sub 100 de cazuri sau sub 20 de săptămâni distincte.
- Ieșirea istoricului: monede 7 zile (după timp, barele pot avea goluri), acțiuni 10 zile de bursă (după index); cel mult un caz pe serie la 7 zile (monede) / 14 zile calendaristice (acțiuni).
- Urmărirea: monede ≥ 7 zile, comision 0,1%, prețul din tickerele Pionex PERP (`close`); acțiuni ≥ 14 zile calendaristice, comision 0,3%, prețurile turei ideilor (pe `ticker`); la short câștigul = −randamentul.
- Nu se schimbă: poarta ideilor, `restul`, urmărirea ideilor (primele 5), clasamentul (`stare`, `scor`, `dir`), semaforul, verdictul, alertele, Discordul, rețeaua.
- Texte: română cu diacritice; frazele pentru pagină trec garda (`deCe`: ≤ 160 de caractere, o singură frază, cel mult un „;”); grup STRICT nou `sugestii`.
- Versiunea: pagina **v100.85** (BUILD_INFO, `functions/_shared/versiune.js`, `package.json` 100.85.0, `sw.js` `crypto-radar-v100-85`, 4 locuri în `index.html`), colectorul **v101.58**.
- Lanțul de livrare: `npm test && git commit && git push` — niciodată `;`. Nimic din `data/` în git (repo public). Scripturile cu backslash se scriu prin Write/Edit, nu prin Bash; niciun comentariu `//` lipit la mijlocul unui rând.

## Review Focus

1. Bara de 4h în curs de la Pionex (ultima din `klines`) nu trebuie să intre în regulă — revenirea se judecă doar pe bare închise (Task 1, testul „barele de după acum nu schimbă verdictul”).
2. Un clasament vechi (fără `revenire`, de dinainte de livrare) sau KV gol: listele noi spun „Aștept clasamentul…” / „Acum nicio monedă…”, nu aruncă (Task 7, testul stărilor goale).
3. O monedă delistată (fără ticker) sau un preț lipsă în urmărire: notarea e sărită, nu dă `NaN` (Task 2, testul urmăririi).
4. O acțiune cu mai puțin de 60 de bare (listată de curând) sau o monedă cu mai puțin de 180 de bare de 4h: nu intră în listă, nicio cifră (Task 1).
5. Istoricul cu 0 cazuri în grup (regula n-a apărut niciodată): fraza spune „niciun caz încă”, nu „NaN%” (Task 2, testul frazelor).

---

### Task 1: `reveniri.js` — regulile pe bare închise

**Files:**
- Create: `public/lib/reveniri.js`
- Create (test): `scripts/proba-v10085.mjs`

**Interfaces:**
- Produces: `Reveniri.REGULI` (`{ moneda, actiune }`), `Reveniri.ultimaInchisa(b, durataMs, acum) -> index`, `Reveniri.judeca(b, j, regula) -> {cadere, deLaMin, zileDeLaMin, pesteMedie, revine, max, min} | null`, `Reveniri.monedaPeRevenire(b4h, acum) -> {cadere, deLaMin, zileDeLaMin, revine} | null`, `Reveniri.actiunePeRevenire(bareZi) -> {cadere, deLaMin, zileDeLaMin, revine, pret, stop, tinta} | null`. Barele: `{t, o, h, l, c}`, `t` în ms (începutul barei).

- [ ] **Step 1: Write the failing test**

`scripts/proba-v10085.mjs`:

```js
// Proba v100.85 (03.10, el: reveniri + short) - public/lib/reveniri.js: regulile (pe bare ÎNCHISE), istoricul față de „o zi oarecare”,
// eticheta, frazele, urmărirea; idei.js: listele de monede. Regulile sunt cele FIXATE în specul 2026-10-03-reveniri-si-short-design.md.
//   node scripts/proba-v10085.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
let R0 = null; const R = () => R0 || (R0 = new Function(`${lib("reveniri.js")}; return Reveniri;`)());
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 · reveniri.js (regulile, istoricul, urmărirea) + idei.js (listele de monede)");

const H4 = 4 * 3600000, ZI = 864e5, T0 = Date.UTC(2026, 0, 1);
// n bare de durată d; închiderea dată de f(i), maximul/minimul ±0,2% în jurul ei
const bare = (n, f, d = H4) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * d, o: c, h: c * 1.002, l: c * 0.998, c }; });
// moneda: 100 (0–149), cade liniar la 60 (150–179), stă la 60 (180–249), urcă la 66 (250–299)
const revine = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : i < 250 ? 60 : 60 + 6 * (i - 249) / 50);
const cutit = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : 60 - 2 * Math.max(0, i - 249) / 50);
const proaspat = (i) => (i === 296 ? 59 : revine(i));
const subMedie = (i) => (i < 250 ? revine(i) : i <= 285 ? 60 + 10 * (i - 249) / 36 : 70 - 5 * (i - 285) / 14);
// acțiunea: 100 (0–39), cade la 65 (40–59), stă la 65 (60–80), urcă la 72 (81–99)
const revA = (i) => (i < 40 ? 100 : i < 60 ? 100 - 35 * (i - 39) / 20 : i <= 80 ? 65 : 65 + 7 * (i - 80) / 19);

await test("(1) monedă: cădere 34% de la maximul pe 30 de zile, +10% de la minimul de acum ~10 zile, peste media pe 3 zile ⇒ revine", () => {
  const b = bare(300, revine), v = R().monedaPeRevenire(b, b[299].t + H4);
  assert.deepEqual(v, { cadere: 0.3413, deLaMin: 0.1022, zileDeLaMin: 9.8, revine: true });
});
await test("(1) monedă: cădere fără revenire (încă scade) / minim proaspăt (sub 2 zile) / sub media pe 3 zile ⇒ nu revine", () => {
  for (const [nume, f] of [["cuțit", cutit], ["minim proaspăt", proaspat], ["sub medie", subMedie]]) {
    const b = bare(300, f), v = R().monedaPeRevenire(b, b[299].t + H4); assert.ok(v, nume); assert.equal(v.revine, false, nume);
  }
  const p = R().monedaPeRevenire(bare(300, proaspat), bare(300, proaspat)[299].t + H4); assert.ok(p.deLaMin >= 0.08 && p.zileDeLaMin < 2, "doar vechimea minimului o oprește");
});
await test("(1) monedă: doar bare ÎNCHISE - bara în curs și barele de după `acum` nu schimbă verdictul; înainte să se închidă bara 299 se judecă 298", () => {
  const b = bare(300, revine), acum = b[299].t + H4, a = R().monedaPeRevenire(b, acum);
  const cuViitor = b.concat(bare(20, () => 10).map((x, k) => ({ ...x, t: b[299].t + (k + 1) * H4 })));
  assert.deepEqual(R().monedaPeRevenire(cuViitor, acum), a);
  assert.deepEqual(R().monedaPeRevenire(b, acum - 1), R().monedaPeRevenire(b.slice(0, 299), acum));
});
await test("(1) monedă: sub 180 de bare de 4h ⇒ nimic (nicio cifră inventată); listă goală / nu e listă ⇒ nimic", () => {
  const b = bare(179, revine); assert.equal(R().monedaPeRevenire(b, b[178].t + H4), null);
  assert.equal(R().monedaPeRevenire([], Date.now()), null); assert.equal(R().monedaPeRevenire(null, Date.now()), null);
});
await test("(1) acțiune: cădere 27% de la maximul pe 60 de zile, +11% de la minimul de acum 19 zile ⇒ revine, cu stopul sub minim și ținta la maxim", () => {
  const v = R().actiunePeRevenire(bare(100, revA, ZI));
  assert.deepEqual(v, { cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, revine: true, pret: 72, stop: 64.22, tinta: 98.45 });
});
await test("(1) acțiune: sub 60 de bare ⇒ nimic; fără cădere ⇒ nu revine", () => {
  assert.equal(R().actiunePeRevenire(bare(59, revA, ZI)), null);
  assert.equal(R().actiunePeRevenire(bare(100, () => 100, ZI)).revine, false);
});
await test("(1) regulile sunt cele din spec (fixate)", () => {
  assert.deepEqual(R().REGULI.moneda, { cadere: 0.25, revenire: 0.08, barePeZi: 6, maxZile: 30, minZile: 10, vechimeZile: 2, medieZile: 3, orizontZile: 7 });
  assert.deepEqual(R().REGULI.actiune, { cadere: 0.2, revenire: 0.08, barePeZi: 1, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 });
});

console.log("\n" + (pica ? "V100.85 PICA · " + pica + " din " + (ok + pica) : "V100.85 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085.mjs`
Expected: FAIL — fiecare test cu `ENOENT ... reveniri.js`; ultima linie `V100.85 PICA · 7 din 7`.

- [ ] **Step 3: Write minimal implementation**

`public/lib/reveniri.js`:

```js
// Reveniri și monede pentru short (v100.85, 03.10, el: „la fiecare câte un modul de revers cu coinuri care au scăzut puternic și acum
// sunt pe revenire, la fel și la stocks, plus la coinuri și opțiunea de coinuri în short direcționat”). Modul pur: pagina, colectorul și
// probele îl folosesc la fel. Regulile sunt cele probate pe 03.10 și FIXATE în spec (2026-10-03-reveniri-si-short-design.md) - nu se
// reglează după ce se văd rezultatele. Totul pe bare ÎNCHISE; un filtru, nu o predicție: istoricul se arată lângă fiecare listă.
var Reveniri = (function () {
  "use strict";
  var ORA = 3600000, H4 = 4 * ORA, ZI = 24 * ORA;
  var REGULI = {
    moneda: { cadere: 0.25, revenire: 0.08, barePeZi: 6, maxZile: 30, minZile: 10, vechimeZile: 2, medieZile: 3, orizontZile: 7 },
    actiune: { cadere: 0.2, revenire: 0.08, barePeZi: 1, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 }
  };
  var r4 = function (x) { return x === null || x === undefined || !isFinite(x) ? null : Math.round(x * 10000) / 10000; };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  // ultima bară ÎNCHISĂ la `acum` (bara de durată d se închide la t + d)
  function ultimaInchisa(b, d, acum) { var j = b.length - 1; while (j >= 0 && b[j].t + d > acum) j--; return j; }
  // regula pe barele b[0..j] (j = ultima bară închisă); r = REGULI.moneda sau REGULI.actiune
  function judeca(b, j, r) {
    var nMax = r.maxZile * r.barePeZi, nMin = r.minZile * r.barePeZi, nMed = r.medieZile * r.barePeZi;
    if (!Array.isArray(b) || j < nMax - 1 || j >= b.length) return null;
    var c = b[j].c, mx = -Infinity, mn = Infinity, iMin = j, s = 0, k;
    for (k = j - nMax + 1; k <= j; k++) if (b[k].h > mx) mx = b[k].h;
    for (k = j - nMin + 1; k <= j; k++) if (b[k].l < mn) { mn = b[k].l; iMin = k; }
    for (k = j - nMed + 1; k <= j; k++) s += b[k].c;
    if (!(c > 0) || !(mx > 0) || !(mn > 0)) return null;
    var cadere = 1 - c / mx, deLaMin = c / mn - 1, zile = (j - iMin) / r.barePeZi, peste = c > s / nMed;
    return { cadere: r4(cadere), deLaMin: r4(deLaMin), zileDeLaMin: Math.round(zile * 10) / 10, pesteMedie: peste, max: mx, min: mn,
      revine: cadere >= r.cadere && deLaMin >= r.revenire && zile >= r.vechimeZile && peste };
  }
  // clasamentul: barele de 4h de la Pionex au la coadă bara în curs - se judecă doar cele închise
  function monedaPeRevenire(b4h, acum) {
    if (!Array.isArray(b4h) || !b4h.length) return null;
    var v = judeca(b4h, ultimaInchisa(b4h, H4, acum === undefined ? Date.now() : acum), REGULI.moneda);
    return v ? { cadere: v.cadere, deLaMin: v.deLaMin, zileDeLaMin: v.zileDeLaMin, revine: v.revine } : null;
  }
  // tura ideilor: la 8:00 ora României toate barele zilnice sunt închise
  function actiunePeRevenire(bz) {
    if (!Array.isArray(bz) || !bz.length) return null;
    var v = judeca(bz, bz.length - 1, REGULI.actiune); if (!v) return null;
    return { cadere: v.cadere, deLaMin: v.deLaMin, zileDeLaMin: v.zileDeLaMin, revine: v.revine, pret: bz[bz.length - 1].c, stop: r2(v.min * 0.99), tinta: r2(v.max) };
  }
  return { REGULI: REGULI, ultimaInchisa: ultimaInchisa, judeca: judeca, monedaPeRevenire: monedaPeRevenire, actiunePeRevenire: actiunePeRevenire };
})();
if (typeof globalThis !== "undefined") globalThis.Reveniri = Reveniri;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085.mjs`
Expected: PASS — `V100.85 PASS · 7/7`. Dacă `(1) acțiune …` diferă doar la a 4-a zecimală, rotunjirea e greșită (r4 pe valorile nerotunjite), nu fixtura.

- [ ] **Step 5: Commit**

```bash
git add public/lib/reveniri.js scripts/proba-v10085.mjs
git commit -F <mesaj>   # „feat(reveniri): regulile pe bare închise (monede 4h, acțiuni zilnic) - fixate din spec (v100.85, sarcina 1)” + liniile Co-Authored-By / Claude-Session
```

### Task 2: `reveniri.js` — istoricul, eticheta, frazele, urmărirea

**Files:**
- Modify: `public/lib/reveniri.js` (adaugă funcțiile și exporturile)
- Modify (test): `scripts/proba-v10085.mjs` (testele `(2)` înaintea liniei finale)

**Interfaces:**
- Consumes: `judeca`, `ultimaInchisa`, `REGULI` (Task 1).
- Produces: `Reveniri.puncte(b, {r, dupaTimp?, start?, G?, short?}) -> [{t, f, revine, short?}]`; `Reveniri.dovada(serii, cheie, {pauzaZile, short?}) -> {n, saptamani, pePlus, medie, mediana, baza:{n,pePlus,medie}, eticheta, putine} | null`; `Reveniri.eticheta(grup, baza) -> "mai bine"|"mai slab"|"cam la fel"|null`; `Reveniri.dovadaBoti(boti, bareDe, G) -> {revenire:{n,pePlus,mediana,reper}, short:{n,pePlus,mediana,reper}}`; `Reveniri.textDovada(d, "monede"|"short"|"actiuni") -> string`; `Reveniri.textBoti(bt, "monede"|"short") -> string`; `Reveniri.TEXT_SUPRAVIETUITORI`; `Reveniri.urmarire(istoric, preturi, acum, {zile, cost, short?, cheie?}) -> {n, pePlus, medie, text}`.

- [ ] **Step 1: Write the failing test**

În `scripts/proba-v10085.mjs`, înaintea liniei `console.log("\n" + (pica ? "V100.85 PICA`:

```js
const pt = (zi, f, x) => ({ t: T0 + zi * ZI, f, ...x });
await test("(2) puncte: unul pe zi, de la fereastra clasamentului (500 de bare); ieșirea la 7 zile după TIMP; `revine` = regula la acel punct", () => {
  const b = bare(700, (i) => (i < 600 ? revine(i % 300) : 66 + (i - 600) * 0.05)), p = R().puncte(b, { r: R().REGULI.moneda, dupaTimp: true, start: 499 });
  assert.equal(p[0].t, b[499].t); assert.equal(p[1].t - p[0].t, ZI);
  for (const x of p) {
    const j = b.findIndex((y) => y.t === x.t), k = b.findIndex((y) => y.t >= x.t + 7 * ZI);
    assert.ok(k > j, "ieșirea e după punct"); assert.equal(x.f, b[k].c / b[j].c - 1); assert.equal(x.revine, R().judeca(b, j, R().REGULI.moneda).revine);
  }
  assert.ok(p[p.length - 1].t + 7 * ZI <= b[b.length - 1].t, "niciun punct fără ieșire");
});
await test("(2) puncte acțiuni: ieșirea la 10 zile de bursă (după index), de la bara 59", () => {
  const b = bare(120, revA, ZI), p = R().puncte(b, { r: R().REGULI.actiune });
  assert.equal(p[0].t, b[59].t); assert.equal(p.length, 120 - 10 - 59); assert.equal(p[0].f, b[69].c / b[59].c - 1);
});
await test("(2) dovada: grupul (cel mult un caz pe serie la 7 zile) față de reperul pe aceleași puncte; eticheta și „puține”", () => {
  const A = Array.from({ length: 20 }, (_, z) => pt(z, z === 0 ? 0.05 : z === 3 ? 0.9 : z === 10 ? -0.02 : 0.01, { revine: z === 0 || z === 3 || z === 10 }));
  const d = R().dovada([A], "revine", { pauzaZile: 7 });
  assert.deepEqual(d, { n: 2, saptamani: 2, pePlus: 0.5, medie: 0.015, mediana: 0.05, baza: { n: 20, pePlus: 0.95, medie: 0.055 }, eticheta: "mai slab", putine: true });
  assert.equal(R().dovada([], "revine", {}), null, "fără puncte, fără istoric");
  const zero = R().dovada([A.map((x) => ({ ...x, revine: false }))], "revine", { pauzaZile: 7 }); assert.equal(zero.n, 0); assert.equal(zero.eticheta, null);
});
await test("(2) eticheta: +3 puncte și media peste ⇒ mai bine; −3 și media sub ⇒ mai slab; altfel cam la fel", () => {
  const E = R().eticheta, b = { pePlus: 0.5, medie: 0.01 };
  assert.equal(E({ pePlus: 0.53, medie: 0.02 }, b), "mai bine"); assert.equal(E({ pePlus: 0.52, medie: 0.02 }, b), "cam la fel");
  assert.equal(E({ pePlus: 0.47, medie: 0.0 }, b), "mai slab"); assert.equal(E({ pePlus: 0.47, medie: 0.02 }, b), "cam la fel");
  assert.equal(E({ pePlus: 0.6, medie: 0.005 }, b), "cam la fel"); assert.equal(E({ n: 0, pePlus: null, medie: null }, b), null);
});
await test("(2) dovada la short: câștigul = scăderea prețului (și la reper); 100+ cazuri pe 20+ săptămâni ⇒ nu „puține”", () => {
  const S = [pt(0, -0.02, { short: true }), pt(1, 0.01, { short: false })], d = R().dovada([S], "short", { pauzaZile: 7, short: true });
  assert.equal(d.pePlus, 1); assert.equal(d.medie, 0.02); assert.equal(d.baza.medie, 0.005);
  const multe = Array.from({ length: 5 }, (_, s) => Array.from({ length: 150 }, (_, z) => pt(z, 0.01, { revine: z % 7 === 0 })));
  const m = R().dovada(multe, "revine", { pauzaZile: 7 }); assert.ok(m.n >= 100 && m.saptamani >= 20, m.n + " / " + m.saptamani); assert.equal(m.putine, false);
});
await test("(2) boții lui: după starea monedei LA PORNIRE (bare închise înainte); short pe monede cu direcția short față de toți boții short", () => {
  const jos = (i) => 100 * Math.pow(0.997, i), bA = bare(300, revine), bB = bare(300, cutit), bS = bare(600, jos);
  const ferS = bS.slice(100, 600), dirS = G.directie(ferS, G.agrega(ferS, ZI)).dir;
  assert.equal(dirS, "short", "precondiția probei: seria de short trebuie să fie în jos pentru GridCalcul.directie");
  const bareDe = (s) => ({ AAA: bA, BBB: bB, SSS: bS }[s] || null);
  const boti = [{ simbol: "AAA", dir: "long", pornit: bA[299].t + H4, net: 5 }, { simbol: "BBB", dir: "long", pornit: bB[299].t + H4, net: -2 },
    { simbol: "SSS", dir: "short", pornit: bS[599].t + H4, net: 3 }, { simbol: "BBB", dir: "short", pornit: bB[299].t + H4, net: -1 }, { simbol: "ZZZ", dir: "long", pornit: 1, net: 9 }];
  const r = R().dovadaBoti(boti, bareDe, G);
  assert.deepEqual(r.revenire, { n: 1, pePlus: 1, mediana: 5, reper: { n: 4, pePlus: 0.5, mediana: 3 } });
  assert.equal(r.short.reper.n, 2); assert.equal(r.short.n, G.directie(bB.slice(0, 300), G.agrega(bB.slice(0, 300), ZI)).dir === "short" ? 2 : 1);
});
await test("(2) frazele: o singură frază sub 160 de caractere, cu reperul și eticheta; fără istoric / fără cazuri; boții lui", () => {
  const T = R().textDovada, B = R().textBoti;
  const slab = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false };
  assert.equal(T(slab, "monede"), "După o cădere ca asta: 42% pe plus în 7 zile, −1,2% în medie; o zi oarecare: 45%, +1,0% — mai slab (407 cazuri).");
  assert.equal(T({ ...slab, n: 66, putine: true }, "monede"), "După o cădere ca asta: 42% pe plus în 7 zile, −1,2% în medie; o zi oarecare: 45%, +1,0% — mai slab (66 de cazuri, puține).");
  assert.equal(T({ n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false }, "actiuni"),
    "După o cădere ca asta: 59% pe plus în 10 zile de bursă, +2,6% în medie; o zi oarecare: 54%, +1,3% — mai bine (393 de cazuri).");
  assert.equal(T({ n: 512, saptamani: 46, pePlus: 0.55, medie: -0.003, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel", putine: false }, "short"),
    "Ca short, pe monedele liniștite cu direcția short: 55% pe plus în 7 zile, −0,3% în medie; o zi oarecare: 55%, −1,0% — cam la fel (512 cazuri).");
  assert.equal(T(null, "monede"), "Istoricul se socotește azi de la 8:00.");
  assert.equal(T({ ...slab, n: 0, pePlus: null, medie: null, eticheta: null }, "monede"), "După o cădere ca asta: niciun caz încă în istoric; o zi oarecare: 45% pe plus în 7 zile.");
  assert.equal(B({ n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } }, "monede"), "Boții tăi porniți așa: 53% pe plus din 66, față de 59% la toți boții tăi.");
  assert.equal(B({ n: 83, pePlus: 0.49, mediana: -0.15, reper: { n: 374, pePlus: 0.56, mediana: 1.3 } }, "short"), "Boții tăi short pe monede cu direcția short: 49% pe plus din 83, față de 56% la toți boții tăi short.");
  assert.equal(B({ n: 0, pePlus: null, mediana: null, reper: { n: 832, pePlus: 0.59 } }, "short"), "N-ai pornit încă boți short pe monede cu direcția short.");
  assert.equal(B({ n: 0, pePlus: null, mediana: null, reper: null }, "monede"), "N-ai pornit încă boți așa."); assert.equal(B(null, "monede"), "");
  for (const t of [T(slab, "short"), T({ ...slab, n: 66, putine: true }, "short"), R().TEXT_SUPRAVIETUITORI]) assert.ok(t.length <= 160 && !/[.?]\s+[A-ZĂÂÎȘȚ]/.test(t), t);
});
await test("(2) urmărirea: doar notările destul de vechi, prețul lipsă sărit, comisionul scăzut, short cu semnul întors, pe `ticker` la acțiuni", () => {
  const U = R().urmarire, acum = Date.UTC(2026, 9, 20, 12);
  const ist = [{ zi: "2026-10-01", simbol: "A", pret: 1, lista: "revenire" }, { zi: "2026-10-02", simbol: "B", pret: 2, lista: "revenire" }, { zi: "2026-10-19", simbol: "A", pret: 1 }, { zi: "2026-10-01", simbol: "X", pret: 5 }];
  const u = U(ist, { A: 1.1, B: 1.8 }, acum, { zile: 7, cost: 0.001 });
  assert.equal(u.n, 2); assert.equal(u.pePlus, 1); assert.ok(Math.abs(u.medie - ((0.1 - 0.001) + (-0.1 - 0.001)) / 2) < 1e-12);
  assert.equal(u.text, "Din 2 sugestii de cel puțin 7 zile: 1 pe plus, −0,1% în medie de la prețul sugestiei, după comision (puține — mai așteaptă).");
  const s = U([{ zi: "2026-10-01", simbol: "B", pret: 2 }], { B: 1.8 }, acum, { zile: 7, cost: 0.001, short: true }); assert.equal(s.pePlus, 1); assert.ok(Math.abs(s.medie - (0.1 - 0.001)) < 1e-12);
  const t = U([{ zi: "2026-09-01", ticker: "AAPL_US_EQ", simbol: "AAPL", pret: 100 }], { AAPL_US_EQ: 110 }, acum, { zile: 14, cost: 0.003, cheie: "ticker" }); assert.equal(t.n, 1);
  assert.equal(U([], {}, acum, { zile: 7 }).text, "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită.");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085.mjs`
Expected: FAIL la testele `(2)` cu `R(...).puncte is not a function` (și celelalte funcții lipsă); testele `(1)` trec.

- [ ] **Step 3: Write minimal implementation**

În `public/lib/reveniri.js`, după funcția `actiunePeRevenire` și înainte de `return {`, adaugă:

```js
  // „7 zile”, „66 de cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var P = function (x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };
  var PC = function (x) { return Math.round(x * 100) + "%"; };
  var TEXT_SUPRAVIETUITORI = "Doar acțiunile care sunt azi în listă: cifra iese mai bună decât a fost în realitate.";
  function stat(l) {
    var n = l.length, s = 0, plus = 0; l.forEach(function (x) { s += x; if (x > 0) plus++; });
    var v = l.slice().sort(function (x, y) { return x - y; });
    return { n: n, pePlus: n ? plus / n : null, medie: n ? s / n : null, mediana: n ? v[Math.floor(n / 2)] : null };
  }
  // punctele de judecată ale unei serii, pentru istoric: unul pe zi, ieșirea peste orizont. o = { r: REGULI.*, dupaTimp (monede: ieșirea
  // la t + orizont, barele pot avea goluri), start (indexul minim: monede 499 = fereastra clasamentului), G + short (liniște + direcția short) }
  function puncte(b, o) {
    var r = o.r, out = [], nMax = r.maxZile * r.barePeZi, j0 = Math.max(nMax - 1, o.start || 0), k = 0;
    if (!Array.isArray(b)) return out;
    for (var j = j0; j < b.length; j += r.barePeZi) {
      var iesire;
      if (o.dupaTimp) { var tinta = b[j].t + r.orizontZile * ZI; while (k < b.length && b[k].t < tinta) k++; if (k >= b.length) break; iesire = b[k].c; }
      else { if (j + r.orizontZile >= b.length) break; iesire = b[j + r.orizontZile].c; }
      var v = judeca(b, j, r); if (!v) continue;
      var p = { t: b[j].t, f: iesire / b[j].c - 1, revine: v.revine };
      if (o.short && o.G) { var fer = b.slice(Math.max(0, j - 499), j + 1), reg = o.G.regimPeBare(fer, 1, 6); p.short = !!(reg && !reg.miscare && o.G.directie(fer, o.G.agrega(fer, ZI)).dir === "short"); }
      out.push(p);
    }
    return out;
  }
  // „mai bine” / „mai slab” cer AMÂNDOUĂ: ≥ 3 puncte la „pe plus” și media în același sens
  function eticheta(a, b) {
    if (!a || !b || !a.n && a.n !== undefined || a.pePlus === null || a.pePlus === undefined || b.pePlus === null) return null;
    return a.pePlus - b.pePlus >= 0.03 - 1e-9 && a.medie > b.medie ? "mai bine" : b.pePlus - a.pePlus >= 0.03 - 1e-9 && a.medie < b.medie ? "mai slab" : "cam la fel";
  }
  // grupul (punctele cu regula „da”, cel mult unul pe serie la `pauzaZile`) față de reper (toate punctele, pe aceleași serii); o.short: câștigul = −randamentul
  function dovada(serii, cheie, o) {
    o = o || {}; var semn = o.short ? -1 : 1, pauza = (o.pauzaZile || 7) * ZI, grup = [], baza = [], sapt = {};
    (serii || []).forEach(function (l) {
      var ultim = -Infinity;
      (l || []).forEach(function (p) {
        if (!p || !isFinite(p.f)) return;
        var g = semn * p.f; baza.push(g);
        if (p[cheie] === true && p.t - ultim >= pauza) { ultim = p.t; grup.push(g); sapt[Math.floor(p.t / (7 * ZI))] = 1; }
      });
    });
    var a = stat(grup), b = stat(baza), sp = Object.keys(sapt).length;
    if (!b.n) return null;
    return { n: a.n, saptamani: sp, pePlus: r4(a.pePlus), medie: r4(a.medie), mediana: r4(a.mediana), baza: { n: b.n, pePlus: r4(b.pePlus), medie: r4(b.medie) },
      eticheta: a.n ? eticheta(a, b) : null, putine: a.n < 100 || sp < 20 };
  }
  // boții LUI închiși, după starea monedei LA PORNIRE: pe revenire față de toți; short pe monede cu direcția short față de toți boții short.
  // bareDe(simbol) -> bare de 4h; G = GridCalcul (direcția clasamentului)
  function dovadaBoti(boti, bareDe, G) {
    var rev = [], toti = [], ss = [], totiS = [], nMax = REGULI.moneda.maxZile * REGULI.moneda.barePeZi;
    (Array.isArray(boti) ? boti : []).forEach(function (x) {
      if (!x || !x.simbol || !isFinite(x.pornit) || !isFinite(x.net)) return;
      var b = bareDe(x.simbol); if (!Array.isArray(b) || b.length < nMax) return;
      var j = ultimaInchisa(b, H4, x.pornit), v = judeca(b, j, REGULI.moneda); if (!v) return;
      toti.push(x.net); if (v.revine) rev.push(x.net);
      if (String(x.dir || "").toLowerCase() === "short") {
        totiS.push(x.net);
        if (G) { var fer = b.slice(Math.max(0, j - 499), j + 1); if (G.directie(fer, G.agrega(fer, ZI)).dir === "short") ss.push(x.net); }
      }
    });
    var s = function (l) { var t = stat(l); return { n: t.n, pePlus: r4(t.pePlus), mediana: t.mediana === null ? null : r2(t.mediana) }; };
    return { revenire: Object.assign(s(rev), { reper: s(toti) }), short: Object.assign(s(ss), { reper: s(totiS) }) };
  }
  var ORIZ = { monede: "7 zile", short: "7 zile", actiuni: "10 zile de bursă" };
  function textDovada(d, cum) {
    if (!d || !d.baza || d.n === null || d.n === undefined) return "Istoricul se socotește azi de la 8:00.";
    var cap = cum === "short" ? "Ca short, pe monedele liniștite cu direcția short: " : "După o cădere ca asta: ", oz = ORIZ[cum] || "7 zile";
    if (!d.n) return cap + "niciun caz încă în istoric; o zi oarecare: " + PC(d.baza.pePlus) + " pe plus în " + oz + ".";
    return cap + PC(d.pePlus) + " pe plus în " + oz + ", " + P(d.medie) + " în medie; o zi oarecare: " + PC(d.baza.pePlus) + ", " + P(d.baza.medie)
      + (d.eticheta ? " — " + d.eticheta : "") + " (" + cate(d.n, "caz", "cazuri") + (d.putine ? ", puține" : "") + ").";
  }
  function textBoti(bt, cum) {
    if (!bt) return "";
    if (!bt.n) return cum === "short" ? "N-ai pornit încă boți short pe monede cu direcția short." : "N-ai pornit încă boți așa.";
    return (cum === "short" ? "Boții tăi short pe monede cu direcția short" : "Boții tăi porniți așa") + ": " + PC(bt.pePlus) + " pe plus din " + bt.n
      + (bt.reper && bt.reper.n ? ", față de " + PC(bt.reper.pePlus) + " la toți boții tăi" + (cum === "short" ? " short" : "") : "") + ".";
  }
  // notările [{zi, simbol|ticker, pret}] + prețurile de acum: cât au făcut de la prețul sugestiei (cele de cel puțin o.zile), după comision
  function urmarire(ist, preturi, acum, o) {
    o = o || {}; var zile = o.zile || 7, cost = o.cost || 0, semn = o.short ? -1 : 1, ch = o.cheie || "simbol", t = acum === undefined ? Date.now() : acum;
    var l = (Array.isArray(ist) ? ist : []).filter(function (x) { return x && x.pret > 0 && preturi && preturi[x[ch]] > 0 && t - Date.parse(x.zi + "T12:00:00Z") >= zile * ZI; });
    var r = l.map(function (x) { return semn * (preturi[x[ch]] / x.pret - 1) - cost; }), p = 0, s = 0;
    r.forEach(function (v) { s += v; if (v > 0) p++; });
    var u = { n: r.length, pePlus: p, medie: r.length ? s / r.length : null };
    u.text = !u.n ? "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită." : "Din " + cate(u.n, "sugestie", "sugestii") + " de cel puțin " + cate(zile, "zi", "zile") + ": " + p + " pe plus, " + P(u.medie) + " în medie de la prețul sugestiei, după comision" + (u.n < 30 ? " (puține — mai așteaptă)" : "") + ".";
    return u;
  }
```

și înlocuiește linia `return { REGULI: REGULI, ultimaInchisa: …, actiunePeRevenire: actiunePeRevenire };` cu:

```js
  return { REGULI: REGULI, TEXT_SUPRAVIETUITORI: TEXT_SUPRAVIETUITORI, ultimaInchisa: ultimaInchisa, judeca: judeca, monedaPeRevenire: monedaPeRevenire, actiunePeRevenire: actiunePeRevenire,
    puncte: puncte, eticheta: eticheta, dovada: dovada, dovadaBoti: dovadaBoti, textDovada: textDovada, textBoti: textBoti, urmarire: urmarire };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085.mjs`
Expected: PASS — `V100.85 PASS · 15/15`. Dacă precondiția „seria de short trebuie să fie în jos” pică, `GridCalcul.directie` vrea o pantă mai mare: schimbă `0.997` în `0.995` (doar fixtura), nu regula.

- [ ] **Step 5: Commit**

```bash
git add public/lib/reveniri.js scripts/proba-v10085.mjs
git commit -F <mesaj>   # „feat(reveniri): istoricul față de o zi oarecare, eticheta, frazele și urmărirea (sarcina 2)”
```

### Task 3: `idei.js` — listele de monede (pe revenire, pentru short)

**Files:**
- Modify: `public/lib/idei.js` (două funcții noi + exportul)
- Modify (test): `scripts/proba-v10085.mjs`

**Interfaces:**
- Consumes: clasamentul `{monede:[{simbol, volum, stare, dir, tarie, scor, latime, profitGrila, traversariZi, revenire:{cadere, deLaMin, zileDeLaMin, revine}}]}`; trades `[{moneda, rezultat}]` (`contTot.inchise`).
- Produces: `Idei.reveniriBoti(cl, trades, n) -> [{moneda, istoric:{n,pePlus,total}, ...moneda din clasament}]` (doar `revenire.revine === true`, după `volum`, ≤ n, implicit 5); `Idei.shortBoti(cl, trades, n)` (doar `stare === "candidat" && dir === "short"`, după `scor`, ≤ n).

- [ ] **Step 1: Write the failing test**

În `scripts/proba-v10085.mjs`, sus, după linia cu `R0`:

```js
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
```

și înaintea liniei finale:

```js
const CL = { la: 5, monede: [
  { simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 9, revenire: { cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, revine: true } },
  { simbol: "BBB_USDT_PERP", volum: 30, stare: "candidat", dir: "neutru", scor: 5, revenire: { cadere: 0.28, deLaMin: 0.09, zileDeLaMin: 3, revine: true } },
  { simbol: "CCC_USDT_PERP", volum: 20, stare: "candidat", dir: "short", scor: 2, revenire: { cadere: 0.1, deLaMin: 0.02, zileDeLaMin: 1, revine: false } },
  { simbol: "DDD_USDT_PERP", volum: 50, stare: "candidat", dir: "short", scor: 7, revenire: null },
  { simbol: "EEE_USDT_PERP", volum: 60, stare: "evita", dir: "short", scor: 8 } ] };
await test("(3) pe revenire: doar `revenire.revine`, cele mai lichide întâi, cu istoricul lui pe monedă; clasament vechi (fără `revenire`) ⇒ nimic", () => {
  const l = ID.reveniriBoti(CL, [{ moneda: "AAA", rezultat: 2 }, { moneda: "AAA", rezultat: -1 }], 5);
  assert.deepEqual(l.map((x) => x.moneda), ["BBB", "AAA"]); assert.deepEqual(l[1].istoric, { n: 2, pePlus: 1, total: 1 }); assert.equal(l[0].revenire.cadere, 0.28);
  assert.deepEqual(ID.reveniriBoti({ monede: [{ simbol: "X_USDT_PERP", stare: "candidat" }] }, [], 5), []); assert.deepEqual(ID.reveniriBoti(null, [], 5), []);
  assert.equal(ID.reveniriBoti(CL, [], 1).length, 1);
});
await test("(3) pentru short: liniștite (candidat) cu direcția short, după scor; „evită” nu intră", () => {
  assert.deepEqual(ID.shortBoti(CL, [], 5).map((x) => x.moneda), ["DDD", "CCC"]); assert.deepEqual(ID.shortBoti(null, [], 5), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085.mjs`
Expected: FAIL la `(3)` cu `ID.reveniriBoti is not a function` / `ID.shortBoti is not a function`.

- [ ] **Step 3: Write minimal implementation**

În `public/lib/idei.js`, după funcția `ideiBoti` (se termină cu `.map(function (x) { var mo = …; return Object.assign({ moneda: mo, istoric: stat(…) }, x); });\n  }`), adaugă:

```js
  // v100.85 (reveniri + short, 03.10): din același clasament, cu istoricul LUI pe monedă (aceeași formă ca ideiBoti)
  function cuIstoric(tr) { return function (x) { var mo = String(x.simbol || "").replace(/_USDT_PERP$/, "").replace(/_USDT$/, ""); return Object.assign({ moneda: mo, istoric: stat(tr.filter(function (t) { return t && t.moneda === mo; })) }, x); }; }
  function reveniriBoti(cl, trades, n) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], tr = Array.isArray(trades) ? trades : [];
    return m.filter(function (x) { return x && x.revenire && x.revenire.revine === true; }).sort(function (a, b) { return (b.volum || 0) - (a.volum || 0); }).slice(0, n || 5).map(cuIstoric(tr));
  }
  function shortBoti(cl, trades, n) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], tr = Array.isArray(trades) ? trades : [];
    return m.filter(function (x) { return x && x.stare === "candidat" && x.dir === "short"; }).sort(function (a, b) { return (b.scor || 0) - (a.scor || 0); }).slice(0, n || 5).map(cuIstoric(tr));
  }
```

și în `return { judecaActiune: judecaActiune, alegeActiuni: alegeActiuni, ideiBoti: ideiBoti, urmarire: urmarire };` adaugă `reveniriBoti: reveniriBoti, shortBoti: shortBoti`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085.mjs`
Expected: PASS — `V100.85 PASS · 17/17`.

- [ ] **Step 5: Commit**

```bash
git add public/lib/idei.js scripts/proba-v10085.mjs
git commit -F <mesaj>   # „feat(idei): listele de monede pe revenire și pentru short (sarcina 3)”
```

### Task 4: clasamentul cu `revenire` (colector + ruta)

**Files:**
- Modify: `scripts/lib/tura-clasament.mjs` (push-ul monedei)
- Modify: `functions/api/istoric-bot.js` (curățarea clasamentului)
- Modify: `scripts/colector.mjs` (încarcă `Reveniri`, îl dă turei)
- Create (test): `scripts/proba-v10085-colector.mjs`

**Interfaces:**
- Consumes: `Reveniri.monedaPeRevenire(b4h, acum)` (Task 1).
- Produces: fiecare monedă din `clasament.monede` are `revenire: {cadere, deLaMin, zileDeLaMin, revine} | null` (după server: numere sau `null`, `revine` strict boolean). Colectorul are global `Reveniri` (încărcat cu `incarca("reveniri.js", "Reveniri")`).

- [ ] **Step 1: Write the failing test**

`scripts/proba-v10085-colector.mjs`:

```js
// Proba v100.85 (colectorul + serverul) - reveniri + short: clasamentul cu `revenire`, ruta lui; tura ideilor cu acțiunile pe revenire,
// istoricul și urmărirea lor (t212?action=idei); tura sugestiilor de monede (istoric-bot?action=sugestii). Server fals, KV fals.
//   node scripts/proba-v10085-colector.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { turaClasament } from "./lib/tura-clasament.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GC = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(G);
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 (colectorul) · clasamentul cu revenire, acțiunile pe revenire, sugestiile de monede, rutele");

const H4 = 4 * 3600000, ZI = 864e5, T0 = Date.UTC(2026, 0, 1);
const bare = (n, f, d = H4) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * d, o: c, h: c * 1.002, l: c * 0.998, c }; });
const revine = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : i < 250 ? 60 : 60 + 6 * (i - 249) / 50);
const cutit = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : 60 - 2 * Math.max(0, i - 249) / 50);
const kl = (b) => b.map((x) => ({ time: x.t, open: String(x.o), close: String(x.c), high: String(x.h), low: String(x.l), volume: "1" }));
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async () => ({ keys: [] }) }; }
const TOKEN = "token-de-proba-v10085";
async function cheama(fis, metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", fis)).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.85", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/" + fis.replace(/\.js$/, "") + "?" + qs, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}

// ---- (4) clasamentul cu `revenire`
const bA = bare(300, revine), bB = bare(300, cutit), ACUM = bA[299].t + H4;
function depsClasament(cuReveniri) {
  const trimise = [];
  return { trimise, d: { cere: async (u) => (/pionex_tickers/.test(u) ? { data: { tickers: [{ symbol: "AAA_USDT_PERP", amount: "2000000", close: "66" }, { symbol: "BBB_USDT_PERP", amount: "1000000", close: "58" }] } }
    : { data: { klines: kl(/AAA/.test(u) ? bA : bB) } }), trimite: async (u, c) => { trimise.push([u, c]); return { ok: true }; }, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0,
    GridCalcul: G, GridClasament: GC, top: 10, acum: () => ACUM, ...(cuReveniri ? { Reveniri: R } : {}) } };
}
await test("(4) tura clasamentului: fiecare monedă primește `revenire` din aceleași bare de 4h (fără cereri în plus); fără Reveniri - câmpul lipsește", async () => {
  const k = depsClasament(true), r = await turaClasament(k.d);
  const a = r.monede.find((x) => x.simbol === "AAA_USDT_PERP"), b = r.monede.find((x) => x.simbol === "BBB_USDT_PERP");
  assert.deepEqual(a.revenire, { cadere: 0.3413, deLaMin: 0.1022, zileDeLaMin: 9.8, revine: true }); assert.equal(b.revenire.revine, false);
  assert.equal(k.trimise.length, 1); assert.ok(k.trimise[0][1].monede.every((x) => "revenire" in x));
  const v = await turaClasament(depsClasament(false).d); assert.ok(v.monede.every((x) => !("revenire" in x)), "proba veche (colector-v77) nu se schimbă");
});
await test("(4) ruta clasamentului păstrează `revenire` curățat (numere, `revine` strict boolean); câmp stricat ⇒ null", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const monede = [{ simbol: "AAA_USDT_PERP", stare: "candidat", dir: "long", revenire: { cadere: "0.3", deLaMin: 0.1, zileDeLaMin: 4, revine: true, rau: 1 } },
    { simbol: "BBB_USDT_PERP", stare: "candidat", dir: "short", revenire: { cadere: 0.1, revine: "da" } }, { simbol: "CCC_USDT_PERP", stare: "evita", revenire: "x" }];
  assert.equal((await cheama("istoric-bot.js", "POST", "action=clasament", env, { la: 5, monede })).status, 200);
  const c = (await cheama("istoric-bot.js", "GET", "action=clasament", env)).d.clasament;
  assert.deepEqual(c.monede[0].revenire, { cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, revine: true }); assert.deepEqual(c.monede[1].revenire, { cadere: 0.1, deLaMin: null, zileDeLaMin: null, revine: false });
  assert.equal(c.monede[2].revenire, null);
});
await test("(4) colectorul încarcă Reveniri și îl dă turei clasamentului", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /const Reveniri = incarca\("reveniri\.js", "Reveniri"\);/); assert.match(s, /turaClasamentModul\(\{[^)]*GridClasament, Reveniri,/);
});

console.log("\n" + (pica ? "V100.85 COLECTOR PICA · " + pica + " din " + (ok + pica) : "V100.85 COLECTOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085-colector.mjs`
Expected: FAIL — `(4) tura clasamentului` (`revenire` lipsește: `Cannot read properties of undefined`), `(4) ruta` (`revenire` lipsește din GET: `undefined` ≠ obiect), `(4) colectorul` (regex nepotrivit). `V100.85 COLECTOR PICA · 3 din 3`.

- [ ] **Step 3: Write minimal implementation**

`scripts/lib/tura-clasament.mjs` — înlocuiește:

```js
      monede.push(d.GridClasament.judeca(m.simbol, bare, m.volum));
```

cu:

```js
      const j = d.GridClasament.judeca(m.simbol, bare, m.volum);
      // v101.58 (reveniri + short): starea de revenire din aceleași bare de 4h (doar cele închise) - fără cereri în plus
      if (d.Reveniri) { try { j.revenire = d.Reveniri.monedaPeRevenire(bare, d.acum ? d.acum() : Date.now()); } catch { j.revenire = null; } }
      monede.push(j);
```

`functions/api/istoric-bot.js` — după rândul care începe cu `function curataDistributie(d){`, adaugă:

```js
// v100.85 (reveniri + short): starea de revenire a monedei din clasament - numere sau null, `revine` strict boolean
function curataRevenire(r){return r&&typeof r==="object"?{cadere:nr(r.cadere),deLaMin:nr(r.deLaMin),zileDeLaMin:nr(r.zileDeLaMin),revine:r.revine===true}:null}
```

și în curățarea clasamentului înlocuiește fragmentul:

```js
miscare:!!m.regim.miscare}:null};for(const k of CAMP_NR)o[k]=nr(m[k]);return o.simbol?o:null}).filter(Boolean);
```

cu:

```js
miscare:!!m.regim.miscare}:null,revenire:curataRevenire(m.revenire)};for(const k of CAMP_NR)o[k]=nr(m[k]);return o.simbol?o:null}).filter(Boolean);
```

`scripts/colector.mjs` — după rândul `const Idei = new Function("ActiuniSemnale", …)(ActiuniSemnale);` adaugă:

```js
const Reveniri = incarca("reveniri.js", "Reveniri");   // v101.58 (reveniri + short): regulile, istoricul, urmărirea
```

și în `turaClasament()` înlocuiește `GridCalcul, GridClasament, top: CLASAMENT_TOP` cu `GridCalcul, GridClasament, Reveniri, top: CLASAMENT_TOP`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085-colector.mjs && node scripts/colector-v77.mjs`
Expected: PASS — `V100.85 COLECTOR PASS · 3/3`, iar proba veche a clasamentului trece neschimbată.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/tura-clasament.mjs functions/api/istoric-bot.js scripts/colector.mjs scripts/proba-v10085-colector.mjs
git commit -F <mesaj>   # „feat(reveniri): clasamentul cu starea de revenire a fiecărei monede (colector + ruta) (sarcina 4)”
```

### Task 5: acțiunile pe revenire (tura ideilor + ruta `t212?action=idei`)

**Files:**
- Modify: `scripts/lib/tura-idei.mjs`
- Modify: `functions/api/t212.js` (POST și GET `idei`)
- Modify: `scripts/colector.mjs` (`turaIdeiZi`: dă `Reveniri`, urmărirea, trimite câmpurile noi)
- Modify (test): `scripts/proba-v10085-colector.mjs`

**Interfaces:**
- Consumes: `Reveniri.actiunePeRevenire`, `Reveniri.puncte`, `Reveniri.dovada`, `Reveniri.urmarire`, `Reveniri.REGULI` (Tasks 1–2).
- Produces: `turaIdei(d)` întoarce în plus `reveniri: [{ticker, simbol, pret, cadere, deLaMin, zileDeLaMin, revine, stop, tinta, istoric:{n,pePlus,total}}]` (≤ 10, după `cadere` descrescător) și `dovadaReveniri` (forma `dovada`). KV `t212:idei` are `reveniri`, `dovadaReveniri`, `urmarireReveniri`; KV `t212:reveniri-istoric` = `[{zi, ticker, simbol, pret}]`; GET `idei` întoarce și `istoricReveniri`.

- [ ] **Step 1: Write the failing test**

În `scripts/proba-v10085-colector.mjs`, sus: `import { turaIdei } from "./lib/tura-idei.mjs";`; înaintea liniei finale:

```js
// ---- (5) acțiunile pe revenire
const ZIb = (n, f) => bare(n, f, ZI);
const revA = (i) => (i < 40 ? 100 : i < 60 ? 100 - 35 * (i - 39) / 20 : i <= 80 ? 65 : 65 + 7 * (i - 80) / 19);
const revA2 = (i) => (i < 40 ? 100 : i < 60 ? 100 - 45 * (i - 39) / 20 : i <= 80 ? 55 : 55 + 6 * (i - 80) / 19);
function depsIdei(serii) {
  return { tickere: Object.keys(serii), inchise: [{ ticker: "T1_US_EQ", rezultat: 40 }, { ticker: "T1_US_EQ", rezultat: -10 }], Idei: { judecaActiune: () => ({ trece: false }), alegeActiuni: ID.alegeActiuni },
    pauza: async () => {}, jurnal: () => {}, acum: 0, simbol: (tk) => tk.split("_")[0], cereBare: async (tk) => serii[tk], cereRezultate: async () => null, Reveniri: R };
}
await test("(5) tura ideilor: acțiunile pe revenire (doar „da”), cea mai mare cădere întâi, cu istoricul lui; istoricul regulii pe toate acțiunile judecate", async () => {
  const r = await turaIdei(depsIdei({ "T1_US_EQ": ZIb(100, revA), "T2_US_EQ": ZIb(100, () => 100), "T3_US_EQ": ZIb(100, revA2) }));
  assert.deepEqual(r.reveniri.map((x) => x.simbol), ["T3", "T1"]); assert.deepEqual(r.reveniri[1].istoric, { n: 2, pePlus: 1, total: 30 });
  assert.equal(r.reveniri[1].stop, 64.22); assert.equal(r.reveniri[1].tinta, 98.45); assert.equal(r.reveniri[1].ticker, "T1_US_EQ");
  assert.ok(r.dovadaReveniri && r.dovadaReveniri.baza.n > 0, JSON.stringify(r.dovadaReveniri)); assert.deepEqual(r.actiuni, []); assert.deepEqual(r.restul, []);
  const fara = await turaIdei({ ...depsIdei({ "T1_US_EQ": ZIb(100, revA) }), Reveniri: undefined }); assert.deepEqual(fara.reveniri, []); assert.equal(fara.dovadaReveniri, null);
});
await test("(5) ruta idei: `reveniri` curățate (≤ 10), istoricul și urmărirea lor; notările în `t212:reveniri-istoric`, separat de ideile urmărite", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, rv = (s) => ({ ticker: s + "_US_EQ", simbol: s, pret: 72, cadere: 0.27, deLaMin: 0.11, zileDeLaMin: 19, revine: true, stop: 64.22, tinta: 98.45, istoric: { n: 1, pePlus: 1, total: 5 }, rau: "x" });
  const dv = { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false };
  const p = await cheama("t212.js", "POST", "action=idei", env, { la: 5, zi: "2026-10-03", judecate: 202, trecute: 1, actiuni: [{ ticker: "AAA_US_EQ", simbol: "AAA", pret: 10 }],
    reveniri: Array.from({ length: 12 }, (_, i) => rv("R" + i)), dovadaReveniri: { ...dv, eticheta: "minunat" }, urmarireReveniri: { n: 3, pePlus: 2, medie: 0.01, text: "Din 3 sugestii…" }, ndx: [] });
  assert.equal(p.status, 200, JSON.stringify(p.d));
  const g = (await cheama("t212.js", "GET", "action=idei", env)).d;
  assert.equal(g.idei.reveniri.length, 10); assert.ok(!("rau" in g.idei.reveniri[0]) && !("revine" in g.idei.reveniri[0])); assert.equal(g.idei.reveniri[0].stop, 64.22);
  assert.equal(g.idei.dovadaReveniri.eticheta, null, "eticheta necunoscută ⇒ null"); assert.equal(g.idei.dovadaReveniri.baza.n, 41457); assert.equal(g.idei.urmarireReveniri.n, 3);
  assert.deepEqual(g.istoric.map((x) => x.simbol), ["AAA"], "urmărirea ideilor neschimbată"); assert.equal(g.istoricReveniri.length, 10); assert.equal(g.istoricReveniri[0].ticker, "R0_US_EQ");
});
await test("(5) colectorul: dă Reveniri turei, socotește urmărirea pe `ticker` (14 zile, 0,3%) și trimite cele trei câmpuri", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /turaIdeiModul\(\{ tickere, inchise, Idei, Reveniri,/);
  assert.match(s, /const urmRev = Reveniri\.urmarire\(id && Array\.isArray\(id\.istoricReveniri\) \? id\.istoricReveniri : \[\], r\.preturi, Date\.now\(\), \{ zile: 14, cost: 0\.003, cheie: "ticker" \}\);/);
  assert.match(s, /reveniri: r\.reveniri, dovadaReveniri: r\.dovadaReveniri, urmarireReveniri: urmRev,/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085-colector.mjs`
Expected: FAIL la cele trei teste `(5)` (`r.reveniri` nedefinit; GET fără `reveniri`; regexurile colectorului). Testele `(4)` trec.

- [ ] **Step 3: Write minimal implementation**

`scripts/lib/tura-idei.mjs`:
1. înlocuiește `const l = [], preturi = {}, vazute = new Set(), sim = d.simbol || ((tk) => tk.split("_")[0]), ndx = [];` cu `const l = [], preturi = {}, vazute = new Set(), sim = d.simbol || ((tk) => tk.split("_")[0]), ndx = [], rev = [], serii = [];`
2. după rândul `    l.push({ ticker: tk, simbol: s, r });` adaugă:

```js
    // v101.58 (reveniri): aceleași bare zilnice - acțiunea pe revenire (doar long) și punctele pentru istoricul regulii
    if (d.Reveniri) { try { const rv = d.Reveniri.actiunePeRevenire(bare); if (rv && rv.revine) rev.push({ ticker: tk, simbol: s, ...rv }); serii.push(d.Reveniri.puncte(bare, { r: d.Reveniri.REGULI.actiune })); } catch {} }
```

3. înlocuiește rândul care începe cu `  d.jurnal("idei: " + cate(judecate,` și rândul `  return { judecate, trecute, actiuni, restul, preturi, ndx };` cu:

```js
  // v101.58 (reveniri): cel mult 10, cea mai mare cădere întâi, cu istoricul LUI pe acțiune; istoricul regulii pe toate acțiunile judecate
  const ist = (tk) => { const t = (d.inchise || []).filter((x) => x && x.ticker === tk); return { n: t.length, pePlus: t.filter((x) => x.rezultat > 0).length, total: t.reduce((a, x) => a + (x.rezultat || 0), 0) }; };
  const reveniri = rev.sort((a, b) => b.cadere - a.cadere).slice(0, 10).map((x) => ({ ...x, istoric: ist(x.ticker) }));
  const dovadaReveniri = d.Reveniri ? d.Reveniri.dovada(serii, "revine", { pauzaZile: 14 }) : null;
  d.jurnal("idei: " + cate(judecate, "acțiune judecată", "acțiuni judecate") + ", " + (trecute === 1 ? "una trece" : trecute + " trec") + " de poarta" + (actiuni.length ? ": " + actiuni.map((x) => x.simbol).join(", ") : "") + (reveniri.length ? "; pe revenire: " + reveniri.map((x) => x.simbol).join(", ") : ""));
  return { judecate, trecute, actiuni, restul, reveniri, dovadaReveniri, preturi, ndx };
```

`functions/api/t212.js` (POST `idei`) — după rândul care începe cu `    const rest2 = (Array.isArray(corp && corp.restul)` adaugă:

```js
    // v100.85 (reveniri): acțiunile pe revenire (≤ 10, doar long), istoricul regulii și urmărirea lor - notările separat de ale ideilor
    const curataRev = (x) => ({ ticker: tk(x && x.ticker), simbol: sim(x && x.simbol), pret: nr(x && x.pret), cadere: nr(x && x.cadere), deLaMin: nr(x && x.deLaMin), zileDeLaMin: nr(x && x.zileDeLaMin), stop: nr(x && x.stop), tinta: nr(x && x.tinta),
      istoric: x && x.istoric ? { n: nr(x.istoric.n), pePlus: nr(x.istoric.pePlus), total: nr(x.istoric.total) } : null });
    const rev2 = (Array.isArray(corp && corp.reveniri) ? corp.reveniri : []).slice(0, 10).map(curataRev).filter((x) => x.ticker && x.pret > 0);
    const dvR = corp && corp.dovadaReveniri, dov2 = dvR && typeof dvR === "object" ? { n: nr(dvR.n), saptamani: nr(dvR.saptamani), pePlus: nr(dvR.pePlus), medie: nr(dvR.medie), mediana: nr(dvR.mediana),
      baza: dvR.baza && typeof dvR.baza === "object" ? { n: nr(dvR.baza.n), pePlus: nr(dvR.baza.pePlus), medie: nr(dvR.baza.medie) } : null, eticheta: ["mai bine", "mai slab", "cam la fel"].includes(dvR.eticheta) ? dvR.eticheta : null, putine: dvR.putine === true } : null;
    const uR = corp && corp.urmarireReveniri, urm2 = uR && typeof uR === "object" ? { n: nr(uR.n), pePlus: nr(uR.pePlus), medie: nr(uR.medie), text: txt(uR.text, 300) } : null;
```

în `await env.ISTORIC.put("t212:idei", JSON.stringify({ … actiuni: act2, restul: rest2, urmarire: urm }));` înlocuiește `restul: rest2, urmarire: urm` cu `restul: rest2, reveniri: rev2, dovadaReveniri: dov2, urmarireReveniri: urm2, urmarire: urm`; înaintea rândului `    return json({ ok: true, actiuni: act2.length });` adaugă:

```js
    const istR = await citesteKv(env, "t212:reveniri-istoric", []), lr = Array.isArray(istR) ? istR : [];
    rev2.forEach((x) => { if (!lr.some((y) => y.zi === zi && y.ticker === x.ticker)) lr.push({ zi, ticker: x.ticker, simbol: x.simbol, pret: x.pret }); });
    await env.ISTORIC.put("t212:reveniri-istoric", JSON.stringify(lr.filter((x) => x.zi >= de).slice(-1000)));
```

(GET `idei`) înlocuiește:

```js
      const [idei, istoric, lista] = await Promise.all([citesteKv(env, "t212:idei", null), citesteKv(env, "t212:idei-istoric", []), citesteKv(env, "t212:lista", [])]);
      return json({ idei, istoric: Array.isArray(istoric) ? istoric : [], lista: Array.isArray(lista) ? lista : [] });
```

cu:

```js
      const [idei, istoric, lista, istoricReveniri] = await Promise.all([citesteKv(env, "t212:idei", null), citesteKv(env, "t212:idei-istoric", []), citesteKv(env, "t212:lista", []), citesteKv(env, "t212:reveniri-istoric", [])]);
      return json({ idei, istoric: Array.isArray(istoric) ? istoric : [], lista: Array.isArray(lista) ? lista : [], istoricReveniri: Array.isArray(istoricReveniri) ? istoricReveniri : [] });
```

`scripts/colector.mjs` (`turaIdeiZi`):
1. înlocuiește `const r = await turaIdeiModul({ tickere, inchise, Idei, Probabilitati,` cu `const r = await turaIdeiModul({ tickere, inchise, Idei, Reveniri, Probabilitati,`;
2. după rândul `    const urm = Idei.urmarire(id && Array.isArray(id.istoric) ? id.istoric : [], r.preturi, Date.now());` adaugă:

```js
    // v101.58 (reveniri): urmărirea acțiunilor pe revenire - pe ticker, de la 14 zile calendaristice (~10 de bursă), după comisionul de conversie
    const urmRev = Reveniri.urmarire(id && Array.isArray(id.istoricReveniri) ? id.istoricReveniri : [], r.preturi, Date.now(), { zile: 14, cost: 0.003, cheie: "ticker" });
```

3. în `await trimite("/api/t212?action=idei", { la: Date.now(), zi, actiuni: r.actiuni, restul: r.restul, judecate:` înlocuiește `restul: r.restul, judecate:` cu `restul: r.restul, reveniri: r.reveniri, dovadaReveniri: r.dovadaReveniri, urmarireReveniri: urmRev, judecate:`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085-colector.mjs && node scripts/proba-v10082.mjs && node scripts/idei-v90.mjs`
Expected: PASS — `V100.85 COLECTOR PASS · 6/6`; probele vechi ale ideilor trec neschimbate.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/tura-idei.mjs functions/api/t212.js scripts/colector.mjs scripts/proba-v10085-colector.mjs
git commit -F <mesaj>   # „feat(reveniri): acțiunile pe revenire în tura ideilor, cu istoricul și urmărirea lor (sarcina 5)”
```

### Task 6: tura sugestiilor de monede (`tura-sugestii.mjs` + `istoric-bot?action=sugestii`)

**Files:**
- Create: `scripts/lib/tura-sugestii.mjs`
- Modify: `functions/api/istoric-bot.js` (GET + POST `sugestii`)
- Modify: `scripts/colector.mjs` (importul, `turaSugestiiColector`, bucla)
- Modify (test): `scripts/proba-v10085-colector.mjs`

**Interfaces:**
- Consumes: `Reveniri.puncte/dovada/dovadaBoti/urmarire/REGULI` (Task 2), `Idei.reveniriBoti/shortBoti` (Task 3), clasamentul cu `revenire` (Task 4).
- Produces: `turaSugestii(d) -> {piataRev, piataShort, botiD, urm, noi} | null` (o dată pe zi, de la 8:00); KV `sugestii` = `{la, zi, dovada:{revenire:{piata, boti}, short:{piata, boti}}, urmarire:{revenire, short}}`; KV `sugestii-istoric` = `[{zi, simbol, pret, lista:"revenire"|"short"}]`; GET `istoric-bot?action=sugestii` → `{sugestii, istoric}`.

- [ ] **Step 1: Write the failing test**

În `scripts/proba-v10085-colector.mjs`, sus: `import { turaSugestii } from "./lib/tura-sugestii.mjs";`; înaintea liniei finale:

```js
// ---- (6) tura sugestiilor de monede
const ORA = 3600000;
// 2.400 de bare de 1 h (100 de zile), un val lent: destule pentru fereastra clasamentului (500 de bare de 4h) și ieșirea la 7 zile
const ore = (n, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * ORA, o: c, h: c * 1.003, l: c * 0.997, c }; });
const val = (i) => 100 * (1 + 0.2 * Math.sin(i / 300));
function depsSugestii(o) {
  const trimise = [], st = o.stare || { zi: null };
  const CL = { la: 5, monede: [{ simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 1, revenire: { cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, revine: true } },
    { simbol: "BBB_USDT_PERP", volum: 5, stare: "candidat", dir: "short", scor: 2, revenire: null }] };
  return { trimise, stare: st, d: { acum: Date.UTC(2026, 9, 3, 9), zi: "2026-10-03", ora: o.ora === undefined ? 9 : o.ora, stare: st, Reveniri: R, Idei: ID, G,
    simboluriDepozit: () => ["AAA_USDT_PERP", "BBB_USDT_PERP"], bare1h: () => ore(2400, val),
    boti: async () => [{ simbol: "AAA_USDT_PERP", dir: "long", pornit: T0 + 2000 * ORA, net: 2 }, { simbol: "BBB_USDT_PERP", dir: "short", pornit: T0 + 2000 * ORA, net: -1 }],
    cere: async (u) => (/action=clasament/.test(u) ? { clasament: CL } : /pionex_tickers/.test(u) ? { data: { tickers: [{ symbol: "AAA_USDT_PERP", close: "1.1" }, { symbol: "BBB_USDT_PERP", close: "1.9" }] } }
      : /action=sugestii/.test(u) ? { istoric: [{ zi: "2026-09-20", simbol: "AAA_USDT_PERP", pret: 1, lista: "revenire" }, { zi: "2026-09-20", simbol: "BBB_USDT_PERP", pret: 2, lista: "short" }] } : null),
    trimite: async (u, c) => { trimise.push([u, c]); return { ok: true }; }, jurnal: () => {}, scrieStare: () => {} } };
}
await test("(6) tura sugestiilor: o dată pe zi, de la 8:00; istoricul pieței și al boților lui; urmărirea; notările zilei din clasament, cu prețul din tickere", async () => {
  const devreme = depsSugestii({ ora: 7 }); assert.equal(await turaSugestii(devreme.d), null); assert.equal(devreme.trimise.length, 0);
  const azi = depsSugestii({ stare: { zi: "2026-10-03" } }); assert.equal(await turaSugestii(azi.d), null);
  const k = depsSugestii({}), r = await turaSugestii(k.d);
  assert.equal(k.stare.zi, "2026-10-03"); assert.equal(k.trimise.length, 1); const [u, c] = k.trimise[0];
  assert.equal(u, "/api/istoric-bot?action=sugestii"); assert.equal(c.zi, "2026-10-03");
  assert.ok(c.dovada.revenire.piata && c.dovada.revenire.piata.baza.n > 0 && c.dovada.short.piata && c.dovada.short.piata.baza.n > 0, JSON.stringify(c.dovada).slice(0, 300));
  assert.ok(c.dovada.revenire.boti && c.dovada.revenire.boti.reper.n === 2 && c.dovada.short.boti.reper.n === 1);
  assert.equal(c.urmarire.revenire.n, 1); assert.equal(c.urmarire.revenire.pePlus, 1); assert.equal(c.urmarire.short.n, 1); assert.equal(c.urmarire.short.pePlus, 1);
  assert.deepEqual(c.noi, [{ simbol: "AAA_USDT_PERP", pret: 1.1, lista: "revenire" }, { simbol: "BBB_USDT_PERP", pret: 1.9, lista: "short" }]);
  assert.ok(r && r.noi.length === 2);
});
await test("(6) ruta sugestii: se scrie și se citește înapoi, curățată; notările fără dubluri (zi + simbol + listă), cel mult 20 pe trimitere", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, dv = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false, rau: 1 };
  const corp = { la: 7, zi: "2026-10-03", dovada: { revenire: { piata: dv, boti: { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } } }, short: { piata: { ...dv, eticheta: "bomba" }, boti: null } },
    urmarire: { revenire: { n: 2, pePlus: 1, medie: 0.01, text: "Din 2 sugestii…" }, short: null },
    noi: [{ simbol: "aaa_usdt_perp", pret: 1.1, lista: "revenire" }, { simbol: "AAA_USDT_PERP", pret: 1.1, lista: "revenire" }, { simbol: "BBB_USDT_PERP", pret: 2, lista: "altceva" }, ...Array.from({ length: 30 }, (_, i) => ({ simbol: "X" + i + "_USDT_PERP", pret: 1, lista: "short" }))] };
  assert.equal((await cheama("istoric-bot.js", "POST", "action=sugestii", env, corp)).status, 200);
  const g = (await cheama("istoric-bot.js", "GET", "action=sugestii", env)).d;
  assert.ok(!("rau" in g.sugestii.dovada.revenire.piata)); assert.equal(g.sugestii.dovada.revenire.piata.eticheta, "mai slab"); assert.equal(g.sugestii.dovada.short.piata.eticheta, null);
  assert.equal(g.sugestii.dovada.revenire.boti.reper.n, 832); assert.equal(g.sugestii.dovada.short.boti, null); assert.equal(g.sugestii.urmarire.revenire.n, 2);
  assert.equal(g.istoric.filter((x) => x.simbol === "AAA_USDT_PERP").length, 1, "fără dubluri"); assert.ok(!g.istoric.some((x) => x.lista === "altceva"));
  assert.equal(g.istoric.length, 18, "cel mult 20 de rânduri citite pe trimitere: unul dublură și unul cu lista greșită ies");
  assert.deepEqual((await cheama("istoric-bot.js", "GET", "action=sugestii", { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() })).d, { sugestii: null, istoric: [] });
});
await test("(6) colectorul: tura sugestiilor legată în buclă și colectorul se încarcă întreg", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /import \{ turaSugestii as turaSugestiiModul \} from "\.\/lib\/tura-sugestii\.mjs";/); assert.match(s, /turaSugestiiColector\(\)\.catch\(\(e\) => jurnal\("sugestii", e\.message\)\);/);
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400)); assert.match(r.stdout, /INCARCAT true/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085-colector.mjs`
Expected: FAIL — la import: `Cannot find module …tura-sugestii.mjs` (toată proba cade la încărcare; e roșul așteptat).

- [ ] **Step 3: Write minimal implementation**

`scripts/lib/tura-sugestii.mjs`:

```js
// Sugestiile de monede (v101.58, 03.10, el: reveniri + short direcționat): o dată pe zi, de la 8:00 ora României - istoricul celor două
// liste (piața din depozitul de bare de 1 h, agregat 4h ca la clasament, + boții LUI) și urmărirea lor (notările zilei din clasament,
// prețurile de acum din tickerele Pionex PERP). Un filtru, nu o predicție: istoricul se arată lângă liste, „mai slab” la vedere.
// deps: { acum, zi, ora, stare:{zi}, Reveniri, Idei, G (GridCalcul), simboluriDepozit() -> [simbol], bare1h(simbol) -> [{t,o,h,l,c}],
//         boti() -> [{simbol, dir, pornit, net}], cere(cale), trimite(cale, corp), jurnal(...), scrieStare(st) }
const H4 = 4 * 3600000;
export async function turaSugestii(d) {
  if (d.ora < 8 || d.stare.zi === d.zi) return null;
  d.stare.zi = d.zi; d.scrieStare(d.stare);   // o dată pe zi, chiar dacă pică la mijloc (mâine din nou)
  const R = d.Reveniri, G = d.G, cache = new Map();
  const bare4 = (s) => { if (!cache.has(s)) cache.set(s, G.agrega(d.bare1h(s) || [], H4).filter((x) => x && Number.isFinite(x.c))); return cache.get(s); };
  // 1) istoricul pieței: punctele de pe fiecare monedă din depozit (fereastra clasamentului: 500 de bare de 4h)
  const serii = [];
  for (const s of d.simboluriDepozit()) { const b = bare4(s); if (b.length < 520) continue; serii.push(R.puncte(b, { r: R.REGULI.moneda, dupaTimp: true, start: 499, G, short: true })); }
  const piataRev = R.dovada(serii, "revine", { pauzaZile: 7 }), piataShort = R.dovada(serii, "short", { pauzaZile: 7, short: true });
  // 2) boții lui, după starea monedei la pornire
  const botiD = R.dovadaBoti(await d.boti(), bare4, G);
  // 3) listele de azi (aceleași ca pe Tablou) + urmărirea celor vechi
  const cl = ((await d.cere("/api/istoric-bot?action=clasament")) || {}).clasament || null;
  const rev = d.Idei.reveniriBoti(cl, [], 5), sh = d.Idei.shortBoti(cl, [], 5), preturi = {};
  const tk = await d.cere("/api/market?type=pionex_tickers&market=PERP");
  for (const x of (tk && tk.data && tk.data.tickers) || []) { const p = Number(x && x.close); if (x && x.symbol && p > 0) preturi[String(x.symbol)] = p; }
  const ist = ((await d.cere("/api/istoric-bot?action=sugestii")) || {}).istoric || [];
  const urm = { revenire: R.urmarire(ist.filter((x) => x && x.lista === "revenire"), preturi, d.acum, { zile: 7, cost: 0.001 }),
    short: R.urmarire(ist.filter((x) => x && x.lista === "short"), preturi, d.acum, { zile: 7, cost: 0.001, short: true }) };
  const noi = rev.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "revenire" })).concat(sh.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "short" }))).filter((x) => x.pret > 0);
  await d.trimite("/api/istoric-bot?action=sugestii", { la: d.acum, zi: d.zi, dovada: { revenire: { piata: piataRev, boti: botiD.revenire }, short: { piata: piataShort, boti: botiD.short } }, urmarire: urm, noi });
  d.jurnal("sugestii: " + rev.length + " pe revenire, " + sh.length + " pentru short; istoricul: revenire " + ((piataRev && piataRev.eticheta) || "—") + ", short " + ((piataShort && piataShort.eticheta) || "—"));
  return { piataRev, piataShort, botiD, urm, noi };
}
```

`functions/api/istoric-bot.js` — GET: înaintea rândului `  if(action==="retea"){let r=null;try{r=JSON.parse(await env.ISTORIC.get("retea")||"null")}catch{r=null}return json({retea:r})}` adaugă:

```js
  // v100.85 (reveniri + short): istoricul listelor de monede, urmărirea lor și notările (le scrie tura sugestiilor, o dată pe zi)
  if(action==="sugestii"){let s=null,l=[];try{s=JSON.parse(await env.ISTORIC.get("sugestii")||"null")}catch{s=null}try{l=JSON.parse(await env.ISTORIC.get("sugestii-istoric")||"[]")}catch{l=[]}return json({sugestii:s,istoric:Array.isArray(l)?l:[]})}
```

POST: înaintea rândului `  if(action==="retea"){` (cel din `onRequestPost`, urmat de `const m=corp&&corp.modele`) adaugă:

```js
  if(action==="sugestii"){
    // v100.85 (reveniri + short): istoricul (piața + boții lui), urmărirea și notările zilei - curățate; notările fără dubluri, 150 de zile
    const dv=x=>x&&typeof x==="object"?{n:nr(x.n),saptamani:nr(x.saptamani),pePlus:nr(x.pePlus),medie:nr(x.medie),mediana:nr(x.mediana),baza:x.baza&&typeof x.baza==="object"?{n:nr(x.baza.n),pePlus:nr(x.baza.pePlus),medie:nr(x.baza.medie)}:null,eticheta:["mai bine","mai slab","cam la fel"].includes(x.eticheta)?x.eticheta:null,putine:x.putine===true}:null;
    const bt=x=>x&&typeof x==="object"?{n:nr(x.n),pePlus:nr(x.pePlus),mediana:nr(x.mediana),reper:x.reper&&typeof x.reper==="object"?{n:nr(x.reper.n),pePlus:nr(x.reper.pePlus),mediana:nr(x.reper.mediana)}:null}:null;
    const ur=x=>x&&typeof x==="object"?{n:nr(x.n),pePlus:nr(x.pePlus),medie:nr(x.medie),text:typeof x.text==="string"?x.text.slice(0,300):null}:null;
    const d=corp&&corp.dovada||{},w=corp&&corp.urmarire||{},zi=/^\d{4}-\d{2}-\d{2}$/.test(String(corp&&corp.zi))?corp.zi:new Date().toISOString().slice(0,10);
    await env.ISTORIC.put("sugestii",JSON.stringify({la:nr(corp&&corp.la)||Date.now(),zi,dovada:{revenire:{piata:dv(d.revenire&&d.revenire.piata),boti:bt(d.revenire&&d.revenire.boti)},short:{piata:dv(d.short&&d.short.piata),boti:bt(d.short&&d.short.boti)}},urmarire:{revenire:ur(w.revenire),short:ur(w.short)}}));
    let ist=[];try{ist=JSON.parse(await env.ISTORIC.get("sugestii-istoric")||"[]")}catch{ist=[]}if(!Array.isArray(ist))ist=[];
    for(const x of (Array.isArray(corp&&corp.noi)?corp.noi:[]).slice(0,20)){const s=simbolKv(x&&x.simbol),p=nr(x&&x.pret),l=x&&x.lista==="short"?"short":x&&x.lista==="revenire"?"revenire":null;if(!s||!(p>0)||!l)continue;if(!ist.some(y=>y.zi===zi&&y.simbol===s&&y.lista===l))ist.push({zi,simbol:s,pret:p,lista:l})}
    const de=new Date(Date.now()-150*86400000).toISOString().slice(0,10);
    await env.ISTORIC.put("sugestii-istoric",JSON.stringify(ist.filter(y=>y.zi>=de).slice(-4000)));
    return json({ok:true,istoric:ist.length});
  }
```

`scripts/colector.mjs`:
1. după rândul `import { turaRetea as turaReteaModul } from "./lib/tura-retea.mjs";   // v101.56 (rețeaua neuronală, livrarea 1)` adaugă:

```js
import { turaSugestii as turaSugestiiModul } from "./lib/tura-sugestii.mjs";   // v101.58 (reveniri + short)
```

2. după funcția `async function turaReteaColector() { … }` (se încheie cu `    scrieStare: (st) => { try { scrieAtomic(RETEA_STARE, st); } catch {} } });\n}`) adaugă:

```js
// v101.58 (reveniri + short, 03.10): o dată pe zi, de la 8:00 ora României - istoricul listelor de monede (depozitul de 1 h + boții lui)
// și urmărirea lor; starea (ziua făcută) în data/sugestii-stare.json
const SUG_STARE = path.join(DATA, "sugestii-stare.json");
let sugStare = {}; try { sugStare = JSON.parse(fs.readFileSync(SUG_STARE, "utf8")) || {}; } catch { sugStare = {}; }
let sugInLucru = false;
async function turaSugestiiColector() {
  if (sugInLucru) return;
  sugInLucru = true;
  try {
    const z = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const g = (k) => (z.find((x) => x.type === k) || {}).value;
    await turaSugestiiModul({ acum: Date.now(), zi: g("year") + "-" + g("month") + "-" + g("day"), ora: Number(g("hour")), stare: sugStare, Reveniri, Idei, G: GridCalcul,
      simboluriDepozit: () => { try { return [...new Set(fs.readdirSync(RETEA_ORE).concat(fs.readdirSync(ORE_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")))].filter((s) => s !== "BTC_USDT_PERP"); } catch { return []; } },
      bare1h: (s) => { const m = new Map(); for (const r of citesteJson(reteaFis(s), []).concat(citesteJson(fisOre(s), []))) { const t = Number(r && r.time); if (Number.isFinite(t)) m.set(t, { t, o: +r.open, h: +r.high, l: +r.low, c: +r.close }); } return [...m.values()].sort((a, b) => a.t - b.t); },
      boti: async () => citesteJson(path.join(RETEA_DIR, "boti.json"), []), cere, trimite, jurnal, scrieStare: (st) => { try { scrieAtomic(SUG_STARE, st); } catch {} } });
  } catch (e) { jurnal("sugestii ESEC", e.message); }
  sugInLucru = false;
}
```

3. în `bucla()`, după rândul `  turaReteaColector().catch((e) => jurnal("retea", e.message));   // v101.56 …` adaugă:

```js
  turaSugestiiColector().catch((e) => jurnal("sugestii", e.message));   // v101.58 (reveniri + short): o dată pe zi, de la 8:00
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085-colector.mjs`
Expected: PASS — `V100.85 COLECTOR PASS · 9/9`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/tura-sugestii.mjs functions/api/istoric-bot.js scripts/colector.mjs scripts/proba-v10085-colector.mjs
git commit -F <mesaj>   # „feat(reveniri): tura sugestiilor de monede - istoricul (piața + boții lui) și urmărirea, o dată pe zi (sarcina 6)”
```

### Task 7: Tabloul — „↩️ Pe revenire (bot long)” și „📉 Pentru short”

**Files:**
- Modify: `public/lib/t212-ecran.js` (`contTot` + aducerea `sugestii`; `tbSugestiiHtml`; `tbIdeiRender`; `gridDeschideMonedaDir`)
- Modify: `public/app.css` (stilul listelor)
- Create (test): `scripts/proba-v10085-ecran.mjs`

**Interfaces:**
- Consumes: `Idei.reveniriBoti/shortBoti` (Task 3), `Reveniri.textDovada/textBoti` (Task 2), `contTot.clasament` (cu `revenire`), `contTot.sugestii` = răspunsul GET `istoric-bot?action=sugestii` (Task 6), `gridDeschideMoneda(m)` și `gridDirectie(d)` (existente).
- Produces: `tbSugestiiHtml(cl, sg, inchise) -> string`; `gridDeschideMonedaDir(m, dir)`; `contTot.sugestii`, `contTot.sugestiiLa`.

- [ ] **Step 1: Write the failing test**

`scripts/proba-v10085-ecran.mjs`:

```js
// Proba v100.85 (ecranele) - reveniri + short: Tabloul (cele două liste, „Fișa (long/short)”, istoricul pe față, urmărirea, stările goale),
// Trading 212 (tabelul „Pe revenire” cu „Biletul”), Acasă (al doilea rând din „Ce aș cumpăra azi”), scripturile încărcate, garda STRICTĂ.
//   node scripts/proba-v10085-ecran.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
// funcția de nivel 1 din fișier, până la următoarea (comentariile dintre ele se iau și ele - apelul se pune după "\n")
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 (ecranele) · Tabloul, Trading 212, Acasă, garda");

const CL = { la: 5, monede: [
  { simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 9, revenire: { cadere: 0.3213, deLaMin: 0.1102, zileDeLaMin: 4.2, revine: true } },
  { simbol: "DDD_USDT_PERP", volum: 50, stare: "candidat", dir: "short", tarie: "puternic", scor: 7, latime: 0.12, profitGrila: 0.0026, traversariZi: 21, revenire: null } ] };
const SLAB = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false };
const SG = { sugestii: { la: 5, zi: "2026-10-03", dovada: { revenire: { piata: SLAB, boti: { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } } },
  short: { piata: { ...SLAB, pePlus: 0.55, medie: -0.003, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel" }, boti: { n: 83, pePlus: 0.49, mediana: -0.15, reper: { n: 374, pePlus: 0.56, mediana: 1.3 } } } },
  urmarire: { revenire: { n: 0, pePlus: 0, medie: null, text: "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită." }, short: null } }, istoric: [] };
function tablou(cl, sg) {
  const ctx = { Reveniri: R, Idei: ID, GridCalcul: G, escapeHtml: esc, TextRo: globalThis.TextRo }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "tbSugestiiHtml") + "\n" + fnDin("t212-ecran.js", "tbSugestiiCorp") + "\n;this.f=tbSugestiiHtml;", ctx);
  return ctx.f(cl, sg, [{ moneda: "AAA", rezultat: 2 }]);
}
await test("(7) Tabloul: „↩️ Pe revenire (bot long)” și „📉 Pentru short”, cu istoricul pe față, rândurile și „Fișa (long/short)”", () => {
  const h = tablou(CL, SG), t = text(h);
  assert.ok(t.includes("↩️ Pe revenire (bot long)") && t.includes("📉 Pentru short"));
  assert.ok(t.includes(R.textDovada(SLAB, "monede")) && t.includes("Boții tăi porniți așa: 53% pe plus din 66, față de 59% la toți boții tăi."), t);
  assert.ok(t.includes("AAA căzută −32% de la maximul pe 30 de zile · +11% de la minim (acum 4 zile)") && t.includes("istoricul tău: 1 bot, 1 pe plus, +2.00 USDT"), t);
  assert.match(h, /data-action-click="gridDeschideMonedaDir\('AAA','long'\)">Fișa \(long\)<\/button>/); assert.match(h, /data-action-click="gridDeschideMonedaDir\('DDD','short'\)">Fișa \(short\)<\/button>/);
  assert.ok(t.includes("DDD interval 12,00% · 0,26% net pe grilă · ~21 treceri pe zi · direcția short (puternic)") && t.includes("n-ai mai avut boți pe ea"), t);
  assert.ok(t.includes("Boții tăi short pe monede cu direcția short: 49% pe plus din 83, față de 56% la toți boții tăi short.") && t.includes("📏 Sugestiile se urmăresc de azi"));
});
await test("(7) Tabloul: stările goale - fără clasament („Aștept clasamentul…”), clasament vechi fără `revenire`, fără istoric („se socotește azi de la 8:00”)", () => {
  const a = text(tablou(null, null)); assert.ok(a.includes("Aștept clasamentul…") && a.includes("Istoricul se socotește azi de la 8:00."), a);
  const b = text(tablou({ la: 5, monede: [{ simbol: "X_USDT_PERP", stare: "candidat", dir: "long", scor: 1 }] }, null));
  assert.ok(b.includes("Acum nicio monedă nu e pe revenire.") && b.includes("Acum nicio monedă liniștită nu are direcția short."), b);
});
await test("(7) „Fișa (long/short)” deschide fișa monedei și alege direcția; altă direcție ⇒ doar fișa", () => {
  const apeluri = [], ctx = { gridDeschideMoneda: (m) => apeluri.push(["fisa", m]), gridDirectie: (d) => apeluri.push(["dir", d]) }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "gridDeschideMonedaDir") + "\n;gridDeschideMonedaDir('AAA','short');gridDeschideMonedaDir('BBB','neutru');", ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(apeluri)), [["fisa", "AAA"], ["dir", "short"], ["fisa", "BBB"]]);
});
await test("(7) Tabloul: listele stau SUB nota listei de candidați; sugestiile se aduc odată cu clasamentul (la 10 minute)", () => {
  assert.match(fnDin("t212-ecran.js", "tbIdeiRender"), /proba pe istoricul monedei\.<\/p>' \+ tbSugestiiHtml\(cl, contTot\.sugestii, contTot\.inchise\);/);
  const s = lib("t212-ecran.js");
  assert.match(s, /var contTot = \{.*sugestii: null, sugestiiLa: 0 \};/); assert.match(s, /contTot\.sugestii = await getJSON\("\/api\/istoric-bot\?action=sugestii"\);/);
});
await test("(7) o eroare în date nu strică Tabloul: lista nouă iese goală, candidații rămân", () => {
  assert.equal(tablou({ get monede() { throw new Error("x"); } }, SG), "");
});

console.log("\n" + (pica ? "V100.85 ECRAN PICA · " + pica + " din " + (ok + pica) : "V100.85 ECRAN PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085-ecran.mjs`
Expected: FAIL — `lipsește tbSugestiiHtml în t212-ecran.js`, `lipsește gridDeschideMonedaDir`, regexurile pentru `tbIdeiRender` / `contTot`. `V100.85 ECRAN PICA · 5 din 5`.

- [ ] **Step 3: Write minimal implementation**

`public/lib/t212-ecran.js`:
1. în `var contTot = { boti: null, botiLa: 0, inLucru: false, inchise: null, stiriCrypto: {}, clasament: null, clasamentLa: 0 };` înlocuiește `clasament: null, clasamentLa: 0 };` cu `clasament: null, clasamentLa: 0, sugestii: null, sugestiiLa: 0 };`;
2. după rândul care începe cu `    if (Date.now() - contTot.clasamentLa > 10 * 60000) { try { var cl = await getJSON("/api/istoric-bot?action=clasament");` adaugă rândul:

```js
    if (Date.now() - (contTot.sugestiiLa || 0) > 10 * 60000) { try { contTot.sugestii = await getJSON("/api/istoric-bot?action=sugestii"); contTot.sugestiiLa = Date.now(); } catch (e) {} }   /* v100.85 (reveniri + short) */
```

3. în `tbIdeiRender`, înlocuiește finalul rândului `  box.innerHTML = h + '<p class="tbSub tbTodoGol">Un filtru (liniște, interval, treceri), nu o predicție: laboratorul n-a găsit încă o diferență clară. Fișa îți dă setările și proba pe istoricul monedei.</p>';` — adică `proba pe istoricul monedei.</p>';` — cu `proba pe istoricul monedei.</p>' + tbSugestiiHtml(cl, contTot.sugestii, contTot.inchise);   /* v100.85 (reveniri + short): sub nota listei de candidați */`;
4. înaintea rândului `// v97.3: acelasi drum ca din clasament / Scan: moneda aleasa, calculul ei, pagina dusa la fisa (nu lasata sus)` adaugă:

```js
// v100.85 (reveniri + short, 03.10): sub „Pe ce aș porni un bot acum” - două liste cu istoricul pe față și urmărirea (filtre, nu predicții)
function tbSugestiiHtml(cl, sg, inchise) {
  if (typeof Reveniri === "undefined" || typeof Idei === "undefined" || !Idei.reveniriBoti) return "";
  try { return tbSugestiiCorp(cl, sg, inchise); } catch (e) { return ""; }   /* o eroare în date nu strică lista de candidați de deasupra */
}
function tbSugestiiCorp(cl, sg, inchise) {
  var rev = Idei.reveniriBoti(cl, inchise || [], 5), sh = Idei.shortBoti(cl, inchise || [], 5), s = sg && sg.sugestii, dv = s && s.dovada || {}, u = s && s.urmarire || {};
  var ist = function (x) { return x.istoric.n ? "istoricul tău: " + t212Cate(x.istoric.n, "bot", "boți") + ", " + x.istoric.pePlus + " pe plus, " + (x.istoric.total >= 0 ? "+" : "−") + Math.abs(x.istoric.total).toFixed(2) + " USDT" : "n-ai mai avut boți pe ea"; };
  var dov = function (d, cum) { var b = d && d.boti ? Reveniri.textBoti(d.boti, cum) : ""; return '<p class="tbSub">' + escapeHtml(Reveniri.textDovada(d && d.piata, cum)) + (b ? ' ' + escapeHtml(b) : '') + '</p>'; };
  var urm = function (x) { return x && x.text ? '<p class="tbSub">📏 ' + escapeHtml(x.text) + '</p>' : ''; };
  var dunga = function (d) { return d && d.piata && d.piata.eticheta === "mai slab" ? "g" : "v"; };
  var rand = function (x, det, dir, d) { return '<div class="tbTodoRand"><span class="tbDunga ' + dunga(d) + '"></span><div><b>' + escapeHtml(x.moneda) + '</b> <span class="tbSub">' + escapeHtml(det) + '</span><p>' + escapeHtml(ist(x)) + '</p></div><button type="button" class="tbBtnLinie" data-action-click="gridDeschideMonedaDir(\'' + escapeHtml(x.moneda) + '\',\'' + dir + '\')">Fișa (' + dir + ')</button></div>'; };
  var gol = function (t) { return '<p class="tbSub tbTodoGol">' + (cl ? t : "Aștept clasamentul…") + '</p>'; };
  var h = '<div class="tbSugestii"><h4>↩️ Pe revenire (bot long)</h4>' + dov(dv.revenire, "monede");
  h += rev.length ? rev.map(function (x) { var r = x.revenire; return rand(x, "căzută −" + Math.round(r.cadere * 100) + "% de la maximul pe 30 de zile · +" + Math.round(r.deLaMin * 100) + "% de la minim (acum " + t212Cate(Math.round(r.zileDeLaMin), "zi", "zile") + ")", "long", dv.revenire); }).join("") : gol("Acum nicio monedă nu e pe revenire.");
  h += urm(u.revenire) + '<h4>📉 Pentru short</h4>' + dov(dv.short, "short");
  h += sh.length ? sh.map(function (x) { return rand(x, [x.latime != null ? "interval " + GridCalcul.procent(x.latime) : "", x.profitGrila != null ? GridCalcul.procent(x.profitGrila) + " net pe grilă" : "", x.traversariZi != null ? "~" + Math.round(x.traversariZi) + " treceri pe zi" : "", "direcția short" + (x.tarie && x.tarie !== "fara-date" ? " (" + x.tarie + ")" : "")].filter(Boolean).join(" · "), "short", dv.short); }).join("") : gol("Acum nicio monedă liniștită nu are direcția short.");
  return h + urm(u.short) + '</div>';
}
// v100.85: „Fișa (long/short)” din listele de sugestii - aceeași fișă, cu direcția aleasă (comutatorul fișei; rămâne aleasă, ca atunci când o alegi de mână)
function gridDeschideMonedaDir(m, dir) {
  gridDeschideMoneda(m);
  if (typeof gridDirectie === "function" && (dir === "long" || dir === "short")) gridDirectie(dir);
}
```

`public/app.css` — la sfârșit:

```css
/* v100.85 (03.10): listele „Pe revenire” / „Pentru short” sub candidații Tabloului */
.tbSugestii h4{margin:12px 0 4px}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085-ecran.mjs`
Expected: PASS — `V100.85 ECRAN PASS · 5/5`. (`GridCalcul.procent(0.12)` scrie „12,00%”; dacă scrie altfel, potrivește textul așteptat la forma lui `procent`, nu schimba funcția.)

- [ ] **Step 5: Commit**

```bash
git add public/lib/t212-ecran.js public/app.css scripts/proba-v10085-ecran.mjs
git commit -F <mesaj>   # „feat(reveniri): Tabloul - „Pe revenire (bot long)” și „Pentru short”, cu „Fișa” pe direcție (sarcina 7)”
```

### Task 8: Trading 212 — tabelul „↩️ Pe revenire”; Acasă — al doilea rând

**Files:**
- Modify: `public/lib/t212-ecran.js` (`t212ReveniriHtml`; `t212IdeiRender`)
- Modify: `public/lib/acasa-ecran.js` (`acasaCumpar2`; `acasaCumpar`; pasul `sugestii`)
- Modify: `public/app.css`
- Modify (test): `scripts/proba-v10085-ecran.mjs`

**Interfaces:**
- Consumes: `t212.idei.idei.reveniri / dovadaReveniri / urmarireReveniri` (Task 5), `Reveniri.textDovada`, `Reveniri.TEXT_SUPRAVIETUITORI` (Task 2), `acasa.d.sugestii` (răspunsul GET `istoric-bot?action=sugestii`), `acasa.d.clasament`, `Idei.reveniriBoti/shortBoti`.
- Produces: `t212ReveniriHtml(id) -> string`; `acasaCumpar2(d) -> string` (gol când nu sunt date); pasul `pas("sugestii", …)` în încărcătorul Acasă.

- [ ] **Step 1: Write the failing test**

În `scripts/proba-v10085-ecran.mjs`, înaintea liniei finale:

```js
function t212Rev(id) {
  const ctx = { Reveniri: R, escapeHtml: esc, TextRo: globalThis.TextRo, t212Usd: (v) => "$" + v, t212Lei: (v) => v + " lei" }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "t212ReveniriHtml") + "\n" + fnDin("t212-ecran.js", "t212ReveniriCorp") + "\n;this.f=t212ReveniriHtml;", ctx);
  return ctx.f(id);
}
const BINE = { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false };
const RV = { ticker: "INTC_US_EQ", simbol: "INTC", pret: 72, cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, stop: 64.22, tinta: 98.45, istoric: { n: 33, pePlus: 24, total: 3401 } };
await test("(8) Trading 212: „↩️ Pe revenire” - istoricul pe față (+ supraviețuitorii), tabelul cu căderea, minimul, stopul, ținta, istoricul lui și „Biletul”; urmărirea", () => {
  const h = t212Rev({ reveniri: [RV], dovadaReveniri: BINE, urmarireReveniri: { n: 2, text: "Din 2 sugestii de cel puțin 14 zile: 1 pe plus, +0,5% în medie de la prețul sugestiei, după comision (puține — mai așteaptă)." } }), t = text(h);
  assert.ok(t.includes("↩️ Pe revenire") && t.includes(R.textDovada(BINE, "actiuni")) && t.includes(R.TEXT_SUPRAVIETUITORI), t);
  assert.match(h, /<th>Acțiune<\/th><th>Acum<\/th><th>Căderea<\/th><th>De la minim<\/th><th>Stop<\/th><th>Țintă<\/th><th>Istoricul tău<\/th>/);
  assert.ok(t.includes("INTC $72 −27% de la maximul pe 60 de zile +11% minimul acum 19 zile de bursă $64.22 sub minim $98.45 maximul 33 de trade-uri, 24 pe plus, 3401 lei"), t);
  assert.match(h, /data-action-click="t212BiletPentru\('INTC'\)">Biletul<\/button>/); assert.ok(t.includes("📏 Din 2 sugestii de cel puțin 14 zile"));
});
await test("(8) Trading 212: fără acțiuni pe revenire ⇒ „Azi nicio acțiune nu e pe revenire.”; fără istoric ⇒ fraza „se socotește”, fără supraviețuitori; fără idei ⇒ nimic", () => {
  const t = text(t212Rev({ reveniri: [], dovadaReveniri: null })); assert.ok(t.includes("Azi nicio acțiune nu e pe revenire.") && t.includes("Istoricul se socotește azi de la 8:00.") && !t.includes("supraviețuitori") && !t.includes(R.TEXT_SUPRAVIETUITORI), t);
  assert.equal(t212Rev(null), ""); assert.equal(t212Rev({ get reveniri() { throw new Error("x"); } }), "", "o eroare în date nu strică panoul ideilor");
  assert.match(fnDin("t212-ecran.js", "t212IdeiRender"), /tabel\(rest\) \+ '<\/details>';\r?\n  h \+= t212ReveniriHtml\(id\);/);
});
function acasa2(d) {
  const ctx = { escapeHtml: esc, Idei: ID }; vm.createContext(ctx);
  vm.runInContext(fnDin("acasa-ecran.js", "acClasamentSumar") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2Corp") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar") + "\n;this.f=acasaCumpar;this.g=acasaCumpar2;", ctx);
  return { tot: ctx.f(d), doi: ctx.g(d) };
}
await test("(8) Acasă: al doilea rând din „Ce aș cumpăra azi” - primele nume din fiecare listă, cu eticheta istoricului; liste goale ⇒ „nimic azi”; fără date ⇒ lipsește", () => {
  const d = { idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 23, actiuni: [{ simbol: "SNDK" }], reveniri: [RV, { ...RV, simbol: "MU" }], dovadaReveniri: BINE } }, clasament: CL, sugestii: SG };
  const r = acasa2(d);
  assert.equal(text(r.doi), "↩️ pe revenire: acțiunile INTC, MU (mai bine) · monedele AAA (mai slab) · 📉 short: DDD (cam la fel)");
  assert.ok(text(r.tot).startsWith("💡 Ce aș cumpăra azi: acțiunea SNDK (23 din 202 trec de poartă pe 03.10)") && text(r.tot).endsWith(text(r.doi)), text(r.tot));
  assert.equal(text(acasa2({ idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 0, actiuni: [], reveniri: [] } }, clasament: { la: 5, monede: [] }, sugestii: null }).doi), "↩️ pe revenire: acțiunile nimic azi · monedele nimic azi · 📉 short: nimic azi");
  assert.equal(acasa2({}).doi, "");
  assert.equal(acasa2({ get sugestii() { throw new Error("x"); }, clasament: CL }).doi, "", "o eroare în date nu strică rândul întâi");
});
await test("(8) Acasă: sugestiile se aduc cu celelalte date ale paginii", () => {
  assert.match(lib("acasa-ecran.js"), /pas\("sugestii", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=sugestii"\); \}\),/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085-ecran.mjs`
Expected: FAIL la cele patru teste `(8)` (`lipsește t212ReveniriHtml`, `lipsește acasaCumpar2`, regexurile). Testele `(7)` trec.

- [ ] **Step 3: Write minimal implementation**

`public/lib/t212-ecran.js`:
1. după rândul care începe cu `  if (l.length && rest.length) h += '<details class="t212IdeiRest"><summary>'` adaugă rândul:

```js
  h += t212ReveniriHtml(id);
```

2. înaintea rândului `// v100.82: un rând din tabelul ideilor (primele 5 și, pliate, celelalte) - mutat neschimbat din t212IdeiRender` adaugă:

```js
// v100.85 (reveniri, 03.10): acțiunile care au scăzut puternic și acum revin - doar long; istoricul regulii pe față (+ supraviețuitorii) și urmărirea
function t212ReveniriHtml(id) {
  if (!id || typeof Reveniri === "undefined") return "";
  try { return t212ReveniriCorp(id); } catch (e) { return ""; }   /* o eroare în date nu strică panoul ideilor */
}
function t212ReveniriCorp(id) {
  var l = Array.isArray(id.reveniri) ? id.reveniri : [];
  var h = '<div class="t212Reveniri"><h5>↩️ Pe revenire <span class="t212Estompat">· au scăzut puternic și acum revin (doar long)</span></h5><p class="tbSub">' + escapeHtml(Reveniri.textDovada(id.dovadaReveniri, "actiuni")) + '</p>'
    + (id.dovadaReveniri ? '<p class="tbSub">⚠ ' + escapeHtml(Reveniri.TEXT_SUPRAVIETUITORI) + '</p>' : '');
  if (!l.length) h += '<p class="tbSub t212Gol">Azi nicio acțiune nu e pe revenire.</p>';
  else h += '<div class="t212TabWrap"><table class="t212Tab t212RevTab"><thead><tr><th>Acțiune</th><th>Acum</th><th>Căderea</th><th>De la minim</th><th>Stop</th><th>Țintă</th><th>Istoricul tău</th><th></th></tr></thead><tbody>'
    + l.map(function (x) {
      var ist = x.istoric && x.istoric.n ? t212Cate(x.istoric.n, "trade", "trade-uri") + ", " + x.istoric.pePlus + " pe plus, " + t212Lei(x.istoric.total) : "n-ai mai avut-o";
      return '<tr><td><b>' + escapeHtml(x.simbol) + '</b></td><td>' + t212Usd(x.pret) + '</td><td class="bad">−' + Math.round(x.cadere * 100) + '%<span class="t212Mic">de la maximul pe 60 de zile</span></td><td class="good">+' + Math.round(x.deLaMin * 100) + '%<span class="t212Mic">' + escapeHtml("minimul acum " + t212Cate(Math.round(x.zileDeLaMin), "zi de bursă", "zile de bursă")) + '</span></td><td class="bad">' + t212Usd(x.stop) + '<span class="t212Mic">sub minim</span></td><td class="good">' + t212Usd(x.tinta) + '<span class="t212Mic">maximul</span></td><td><span class="t212Mic' + (x.istoric && x.istoric.total < 0 ? " bad" : "") + '">' + escapeHtml(ist) + '</span></td><td><button type="button" class="t212BtnLinie" data-action-click="t212BiletPentru(\'' + escapeHtml(x.simbol) + '\')">Biletul</button></td></tr>';
    }).join("") + '</tbody></table></div>';
  if (id.urmarireReveniri && id.urmarireReveniri.text) h += '<p class="tbSub">📏 ' + escapeHtml(id.urmarireReveniri.text) + '</p>';
  return h + '</div>';
}
```

`public/lib/acasa-ecran.js`:
1. după rândul `      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); return c && c.clasament || null; }),` adaugă:

```js
      pas("sugestii", function () { return getJSON("/api/istoric-bot?action=sugestii"); }),   // v100.85 (reveniri + short)
```

2. în `acasaCumpar`, înlocuiește finalul `Pe ce aș porni un bot</button></span>';` cu `Pe ce aș porni un bot</button></span>' + (typeof acasaCumpar2 === "function" ? acasaCumpar2(d) : "");`
3. înaintea rândului `// v100.82: butoanele din „Ce aș cumpăra azi” - deschid pagina și aduc panoul sus (fără animație)` adaugă:

```js
// v100.85 (reveniri + short, 03.10): al doilea rând din „Ce aș cumpăra azi” - listele noi, fiecare cu eticheta istoricului ei
function acasaCumpar2(d) {
  try { return acasaCumpar2Corp(d); } catch (e) { return ""; }   /* o eroare în date nu strică rândul întâi */
}
function acasaCumpar2Corp(d) {
  var ii = d && d.idei && d.idei.idei, sg = d && d.sugestii && d.sugestii.sugestii, dv = sg && sg.dovada || {}, I = typeof Idei !== "undefined" && Idei.reveniriBoti ? Idei : null;
  var ra = ii && Array.isArray(ii.reveniri) ? ii.reveniri : null, rm = I && d && d.clasament ? I.reveniriBoti(d.clasament, [], 3) : null, rs = I && d && d.clasament ? I.shortBoti(d.clasament, [], 3) : null;
  if (!ra && !rm && !rs) return "";
  var et = function (x) { return x && x.eticheta ? " (" + x.eticheta + ")" : ""; };
  var nume = function (l, f) { return !l ? "—" : l.length ? l.slice(0, 3).map(f).join(", ") : "nimic azi"; };
  var mo = function (x) { return String(x.simbol || x.moneda || "").replace(/_USDT_PERP$/, ""); }, ac = function (x) { return x.simbol || String(x.ticker || "").split("_")[0]; };
  return '<span class="acCumpar2">↩️ pe revenire: acțiunile <b>' + escapeHtml(nume(ra, ac)) + '</b>' + escapeHtml(ra && ra.length ? et(ii && ii.dovadaReveniri) : "")
    + ' · monedele <b>' + escapeHtml(nume(rm, mo)) + '</b>' + escapeHtml(rm && rm.length ? et(dv.revenire && dv.revenire.piata) : "")
    + ' · 📉 short: <b>' + escapeHtml(nume(rs, mo)) + '</b>' + escapeHtml(rs && rs.length ? et(dv.short && dv.short.piata) : "") + '</span>';
}
```

`public/app.css` — la sfârșit:

```css
.t212Reveniri{padding:8px 12px}.t212Reveniri h5{margin:0 0 6px}
#dash .acCumpar .acCumpar2{display:block;margin-top:6px}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085-ecran.mjs && node scripts/proba-v10082.mjs`
Expected: PASS — `V100.85 ECRAN PASS · 9/9`; `V100.82 PASS · 10/10` (rândul întâi neschimbat).

- [ ] **Step 5: Commit**

```bash
git add public/lib/t212-ecran.js public/lib/acasa-ecran.js public/app.css scripts/proba-v10085-ecran.mjs
git commit -F <mesaj>   # „feat(reveniri): Trading 212 - „Pe revenire” cu „Biletul”; Acasă - al doilea rând din „Ce aș cumpăra azi” (sarcina 8)”
```

### Task 9: garda textelor (grup STRICT „sugestii”) + scripturile încărcate

**Files:**
- Create: `scripts/lib/garda-sugestii.mjs`
- Modify: `scripts/garda-texte.mjs` (modulul încărcat, importul, `STRICT`, apelul)
- Modify: `public/index.html` (scriptul `reveniri.js`), `public/sw.js` (`APP_SHELL`)
- Modify (test): `scripts/proba-v10085-ecran.mjs`

**Interfaces:**
- Consumes: `Reveniri.textDovada/textBoti/urmarire/TEXT_SUPRAVIETUITORI` (Task 2); `situatii`, `verifica`, `STRICT` din `garda-texte.mjs`.
- Produces: `situatiiSugestii(pune)`; grupul STRICT `"sugestii"`.

- [ ] **Step 1: Write the failing test**

În `scripts/proba-v10085-ecran.mjs`, sus: `import { situatii, verifica, STRICT } from "./garda-texte.mjs";`; înaintea liniei finale:

```js
await test("(9) garda: grupul „sugestii” e STRICT și n-are abateri (toate etichetele, puține, fără istoric, boții, supraviețuitorii, urmărirea)", () => {
  assert.ok(STRICT.has("sugestii"));
  const s = situatii().filter((x) => x.mod === "sugestii"); assert.ok(s.length >= 20, String(s.length));
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " ⇐ " + q.x.text).join("\n"));
});
await test("(9) reveniri.js se încarcă pe pagină înaintea lui idei.js și e în cache-ul aplicației", () => {
  const h = citeste("public", "index.html"); assert.ok(h.includes('<script src="/lib/reveniri.js"></script><script src="/lib/idei.js"></script>'));
  assert.ok(citeste("public", "sw.js").includes('"/lib/reveniri.js","/lib/idei.js"'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10085-ecran.mjs`
Expected: FAIL la cele două teste `(9)` (`STRICT.has("sugestii")` fals; scriptul lipsește din pagină).

- [ ] **Step 3: Write minimal implementation**

`scripts/lib/garda-sugestii.mjs`:

```js
// Garda textelor, grupul „sugestii” (v100.85, reveniri + short): frazele cu istoricul (Reveniri.textDovada / textBoti) pe toate formele
// etichetei (mai bine / mai slab / cam la fel), puține cazuri, niciun caz, fără istoric; supraviețuitorii; rândul urmăririi - cu modulul REAL.
export function situatiiSugestii(pune) {
  const R = globalThis.Reveniri;
  const baza = { n: 15119, pePlus: 0.45, medie: 0.01 };
  const D = { "mai bine": { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false },
    "mai slab": { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza, eticheta: "mai slab", putine: false },
    "cam la fel": { n: 512, saptamani: 46, pePlus: 0.55, medie: -0.003, mediana: 0.01, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel", putine: false },
    "puține cazuri": { n: 66, saptamani: 18, pePlus: 0.53, medie: 0.002, mediana: 0.003, baza, eticheta: "mai slab", putine: true },
    "niciun caz": { n: 0, saptamani: 0, pePlus: null, medie: null, mediana: null, baza, eticheta: null, putine: true }, "fără istoric": null };
  for (const [sit, d] of Object.entries(D)) for (const cum of ["monede", "short", "actiuni"]) pune("sugestii: " + cum + " · " + sit, "sugestii", "textDovada", { t: R.textDovada(d, cum) }, [["t", "deCe"]]);
  const B = { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } };
  for (const cum of ["monede", "short"]) {
    pune("sugestii: boții · " + cum, "sugestii", "textBoti", { t: R.textBoti(B, cum) }, [["t", "deCe"]]);
    pune("sugestii: boții · " + cum + " · niciunul", "sugestii", "textBoti", { t: R.textBoti({ n: 0, pePlus: null, mediana: null, reper: B.reper }, cum) }, [["t", "deCe"]]);
  }
  pune("sugestii: supraviețuitorii", "sugestii", "TEXT_SUPRAVIETUITORI", { t: R.TEXT_SUPRAVIETUITORI }, [["t", "deCe"]]);
  const ACUM = Date.UTC(2026, 9, 20, 12), ist = [{ zi: "2026-10-03", simbol: "LIT_USDT_PERP", pret: 1 }, { zi: "2026-10-04", simbol: "PONS_USDT_PERP", pret: 2 }];
  for (const [sit, l] of [["niciuna", []], ["două", ist]]) pune("sugestii: urmărirea · " + sit, "sugestii", "urmarire", R.urmarire(l, { LIT_USDT_PERP: 1.1, PONS_USDT_PERP: 1.9 }, ACUM, { zile: 7, cost: 0.001 }), [["text", "deCe"]]);
  const multe = Array.from({ length: 40 }, (_, i) => ({ zi: "2026-09-0" + (1 + (i % 9)), simbol: "LIT_USDT_PERP", pret: 1 }));
  pune("sugestii: urmărirea · patruzeci", "sugestii", "urmarire", R.urmarire(multe, { LIT_USDT_PERP: 1.05 }, ACUM, { zile: 7, cost: 0.001 }), [["text", "deCe"]]);
}
```

`scripts/garda-texte.mjs`:
1. în lista de module încărcate, înlocuiește `"jurnal-trade.js", "grid-proba.js"]` cu `"jurnal-trade.js", "grid-proba.js", "reveniri.js"]`;
2. după rândul `import { situatiiRetea } from "./lib/garda-retea.mjs";   // v100.80 (rețeaua neuronală)` adaugă `import { situatiiSugestii } from "./lib/garda-sugestii.mjs";   // v100.85 (reveniri + short)`;
3. în `export const STRICT = new Set([… "acasa", "retea"]);` înlocuiește `"acasa", "retea"]);` cu `"acasa", "retea", "sugestii"]);` (comentariul de pe rând rămâne după `;`, neschimbat);
4. după rândul `  situatiiRetea(pune);   // v100.80 (rețeaua neuronală, livrarea 1)` adaugă `  situatiiSugestii(pune);   // v100.85 (reveniri + short)`.

`public/index.html` — înlocuiește `<script src="/lib/idei.js"></script>` cu `<script src="/lib/reveniri.js"></script><script src="/lib/idei.js"></script>`.
`public/sw.js` — înlocuiește `"/lib/idei.js","/lib/t212-ecran.js"` cu `"/lib/reveniri.js","/lib/idei.js","/lib/t212-ecran.js"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/proba-v10085-ecran.mjs && node scripts/garda-texte.mjs`
Expected: PASS — `V100.85 ECRAN PASS · 11/11`; garda: `STRICT sugestii … 0 cu abateri`. Dacă o frază iese peste 160 sau cu două propoziții, se scurtează **fraza** din `reveniri.js` (și testul ei exact din Task 2), nu regula gărzii.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/garda-sugestii.mjs scripts/garda-texte.mjs public/index.html public/sw.js scripts/proba-v10085-ecran.mjs
git commit -F <mesaj>   # „feat(reveniri): garda STRICTĂ „sugestii” + reveniri.js încărcat pe pagină și în cache (sarcina 9)”
```

### Task 10: versiunea, lanțul de teste, livrarea și verificarea pe datele lui

**Files:**
- Modify: `BUILD_INFO.json`, `functions/_shared/versiune.js`, `package.json`, `public/sw.js`, `public/index.html`, `scripts/colector.mjs`

**Interfaces:**
- Consumes: totul de mai sus.
- Produces: v100.85 / colector v101.58 publicate; colectorul repornit; listele văzute pe pagină.

- [ ] **Step 1: Write the failing test**

În `package.json` adaugă intrările (după `"test:v10082": "node scripts/proba-v10082.mjs"`, cu virgulă):

```json
    "test:v10085": "node scripts/proba-v10085.mjs",
    "test:v10085col": "node scripts/proba-v10085-colector.mjs",
    "test:v10085ecr": "node scripts/proba-v10085-ecran.mjs"
```

și în lanțul `"test"` înlocuiește `npm run test:v10082"` cu `npm run test:v10082 && npm run test:v10085 && npm run test:v10085col && npm run test:v10085ecr"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/proba-v10062.mjs`
Expected: PASS (versiunea e încă v100.84 — formatul e bun); `npm test` trece. „Roșul” sarcinii e versiunea veche în insignă — se verifică la Step 4.

- [ ] **Step 3: Write minimal implementation**

Bump (script scris prin Write, ancore exact o dată): `BUILD_INFO.json` `"version": "v100.84"` → `"v100.85"` și insigna → `"v100.85 · REVENIRI + SHORT, CU ISTORICUL PE FAȚĂ"`; `functions/_shared/versiune.js` `"v100.84"` → `"v100.85"`; `package.json` `"version": "100.84.0"` → `"100.85.0"`; `public/sw.js` `crypto-radar-v100-84` → `crypto-radar-v100-85`; `public/index.html` cele 4 locuri (`content="v100.84" name="app-version"`, `>v100.84 · TOATE IDEILE + CE AȘ CUMPĂRA AZI<` → `>v100.85 · REVENIRI + SHORT, CU ISTORICUL PE FAȚĂ<`, `>v100.84 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE<`, `<b id="healthAppVersion">v100.84</b>`); `scripts/colector.mjs` `const VERSIUNE_COLECTOR = "v101.57";` → `"v101.58"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test > <scratchpad>/npm-test-85.log 2>&1; echo EXIT=$?; grep -c PICA <scratchpad>/npm-test-85.log; grep -E "V100.85|STRICT sugestii|V100.62" <scratchpad>/npm-test-85.log`
Expected: `EXIT=0`, `0` picări, `V100.85 PASS · 17/17`, `V100.85 COLECTOR PASS · 9/9`, `V100.85 ECRAN PASS · 11/11`, `STRICT sugestii … 0 cu abateri`, `V100.62 PASS`.

- [ ] **Step 5: Commit, push, repornire, verificare**

```bash
npm test && git add BUILD_INFO.json functions/_shared/versiune.js package.json public/sw.js public/index.html scripts/colector.mjs && git commit -F <mesaj> && git push origin HEAD:main
```

Apoi:
1. Colectorul repornit (procedura obișnuită: PID din `data/colector.pid`, `Start-Process node scripts\colector.mjs` ascuns); în jurnal: „pornit” și, la prima tură după 8:00, `sugestii: N pe revenire, M pentru short; istoricul: …`.
2. Clasamentul: la următoarea tură orară, GET `istoric-bot?action=clasament` are `revenire` pe monede.
3. Acțiunile: lista apare la tura ideilor de mâine, 8:00 (azi tura a rulat deja; nu se forțează a doua oară).
4. Pozele la 1920 și 390: Tabloul (cele două liste), Trading 212 (tabelul sau „Azi nicio acțiune…” până mâine), Acasă (al doilea rând) — cu datele lui; consola curată, fără `undefined` / `NaN` / `null`.
5. Revizia Opus pe toată ramura, o trecere de reparații (fiecare cu testul văzut roșu), apoi push.
6. Memoria (fișa proiectului + indexul), raportul final cu Versionare (`Git: <hash> pushed pe origin/main`), Idei și „ce a adus fiecare skill”.
