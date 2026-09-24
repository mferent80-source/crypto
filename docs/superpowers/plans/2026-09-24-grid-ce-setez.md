# 🧮 Grid — ce setez acum? (v78.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O fereastră nouă în Crypto Radar care, pentru orice PERP Pionex ales, dă setările de futures grid de copiat în Pionex (direcție, interval, grile, levier, sumă, stop), verdictul „pornește / așteaptă / nu” și proba acelor setări pe ultimele ~30 de zile ale monedei.

**Architecture:** Două module pure, fără DOM și fără rețea (`public/lib/grid-calcul.js` pentru calcul, `public/lib/grid-proba.js` pentru simulator, alegere și fișă), probate în Node ca `lib/directie.js`. `app.js` aduce lumânările prin ruta existentă `/api/market?type=pionex_klines` (i se adaugă `endTime` pentru paginare și `market=PERP` la simboluri) și desenează fișa într-o secțiune nouă `#gridset`.

**Tech Stack:** JS ES5 în `lib/` (tiparul IIFE + `globalThis`), Cloudflare Pages Functions (`functions/api/market.js`), teste Node `node:assert` rulate din `npm test`.

**Spec:** `docs/superpowers/specs/2026-09-24-grid-ce-setez-design.md`

## Global Constraints

- Comision **0,05% pe umplere**; pas minim **0,35%** (net ≥ 0,25% pe grilă).
- Percentilele lățimii: **60 / 75 / 90**, implicit 75. Înclinare maximă **60/40**.
- Grile **2…150**; levier propus **≤ 5×**; lichidarea la **cel puțin o lățime de interval** dincolo de margine.
- Mișcare = raport **> 1,5×** față de mediana pe 30 de zile (4h sau 24h). Verde cere mediana probei **> 0,3%**.
- Stop = **două grile** dincolo de fiecare margine: `jos×(1−2×pas)`, `sus×(1+2×pas)`.
- Orizont **1z / 2z / 3z**, implicit **2z**. Proba: aleg pe primele **2/3** (20 z), raportez pe ultima **1/3** (10 z).
- **Niciodată `0` pentru lipsă** (`Number(null)===0`): lipsa se scrie „fără date”.
- Direcția iese **mereu** (LONG / SHORT / NEUTRU + tărie). Când proba o contrazice, fișa o spune, nu o schimbă.
- Versiunea **v78.0** peste tot (`package.json`, `BUILD_INFO.json`, `sw.js` CACHE, meta + badge-uri); garda `versiune` o verifică.
- Texte pe ecran în română cu diacritice; comentariile din cod fără diacritice, ca în restul `lib/`.

## Review Focus

1. **Moneda scrisă în altă formă** (`met`, `MET.PERP`, `METUSDT`, `MET_USDT_PERP`): toate duc la `MET_USDT_PERP`. Un text gol sau doar `USDT` dă „scrie o monedă”, nu o cerere. Test în Task 4 (`grSimbol`).
2. **Suma scrisă cu virgulă sau goală** (`100,5`, `""`, `0`): `100,5` înseamnă 100,5; gol sau 0 dau „scrie suma”, nu un calcul pe 0. Test în Task 4 (`grNumar`).
3. **Paginile de lumânări care se suprapun** și bara în formare: fără dubluri, fără bara în formare în calcul, prețul de acum luat din bara în formare. Test în Task 2 (`bare`, `pretCurent`).
4. **Monedă listată de curând** (sub 7 zile) sau cu 10–29 de zile: sub minim „prea puține lumânări”, fără cifre inventate. Între 10 și 29 de zile verdictul maxim e 🟡 și fișa spune câte zile are. Test în Task 3.
5. **Suma prea mică pentru minimul pe ordin**: verdictul 🔴 cu suma necesară, nu o setare care nu se poate pune. Test în Task 3.

---

### Task 1: Ruta de piață — `endTime` la lumânări și simboluri PERP

**Files:**
- Modify: `functions/api/market.js` (blocurile `pionex_symbols` și `pionex_klines`, ~r. 65–77)
- Test: `scripts/server-v746.mjs` (după testul 11)

**Interfaces:**
- Produces: `GET /api/market?type=pionex_klines&symbol=S&interval=15M&limit=500&endTime=<ms>` trimite `endTime` la Pionex doar când e număr pozitiv; `GET /api/market?type=pionex_symbols&market=PERP` cere `type=PERP` (implicit rămâne `SPOT`).

- [ ] **Step 1: Testul care pică** — în `scripts/server-v746.mjs`, după testul 11:

```js
// ---- (11b) v78: endTime la lumanari + simboluri PERP ----
await test("11b · klines cu endTime numeric -> trimis la Pionex; endTime=abc -> nu", async () => {
  fetchStub(() => ({ corp: { result: true, data: { klines: [] } } }));
  await cheama("market", "type=pionex_klines&symbol=MET_USDT_PERP&interval=15M&limit=500&endTime=1789388100000", { APP_API_TOKEN: TOKEN });
  assert.ok(cereri[0].url.includes("endTime=1789388100000"), cereri[0].url);
  fetchStub(() => ({ corp: { result: true, data: { klines: [] } } }));
  await cheama("market", "type=pionex_klines&symbol=MET_USDT_PERP&interval=15M&endTime=abc", { APP_API_TOKEN: TOKEN });
  assert.ok(!/endTime/.test(cereri[0].url), cereri[0].url);
});
await test("11c · pionex_symbols&market=PERP -> type=PERP; fara market -> SPOT", async () => {
  fetchStub(() => ({ corp: { result: true, data: { symbols: [] } } }));
  await cheama("market", "type=pionex_symbols&market=PERP", { APP_API_TOKEN: TOKEN });
  assert.ok(cereri[0].url.includes("type=PERP"), cereri[0].url);
  fetchStub(() => ({ corp: { result: true, data: { symbols: [] } } }));
  await cheama("market", "type=pionex_symbols", { APP_API_TOKEN: TOKEN });
  assert.ok(cereri[0].url.includes("type=SPOT"), cereri[0].url);
});
```

- [ ] **Step 2: Rulează** `node scripts/server-v746.mjs`. Aștept: `PICA 11b` și `PICA 11c`.

- [ ] **Step 3: Implementarea** în `functions/api/market.js`:

```js
  if(type==="pionex_symbols"){
    const mk=String(u.searchParams.get("market")||"").toUpperCase()==="PERP"?"PERP":"SPOT";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/common/symbols?type=${mk}`,3600,env))}catch(e){return softFail("Pionex symbols unavailable",e.message,e.status===429?(e.retryAfter||60):null)}
  }
```
și în `pionex_klines`, după `limit`:
```js
    const etRaw=u.searchParams.get("endTime"),et=Math.floor(Number(etRaw));
    const endQ=etRaw&&Number.isFinite(et)&&et>0?`&endTime=${et}`:"";
```
iar URL-ul devine `...&limit=${limit}${endQ}`.

- [ ] **Step 4: Rulează** `node scripts/server-v746.mjs`. Aștept: toate `ok`, inclusiv 11b și 11c.
- [ ] **Step 5: Commit** `v78 (1/6): market - endTime la lumanari, simboluri PERP`

---

### Task 2: `public/lib/grid-calcul.js` — calculul

**Files:**
- Create: `public/lib/grid-calcul.js`
- Create: `scripts/grid-v78.mjs` (partea de calcul; Task 3 adaugă proba)
- Modify: `package.json` (`"test:grid": "node scripts/grid-v78.mjs"` + la coada lui `test`)

**Interfaces (Produces, pe `GridCalcul`):**
- `C` — constantele de mai sus
- `bare(randuri) -> [{t,o,h,l,c}]` crescător, fără dubluri, fără bara în formare
- `pretCurent(randuri) -> number|null`
- `mediana(a)`, `percentila(a, p)` -> `number|null`
- `latimi(b, H) -> number[]` · `pasi(b) -> [min, mijloc, max] | null`
- `plaseaza(pret, lat, dir) -> {jos, sus}` · `nrGrile(jos, sus, pas) -> int` · `niveluri(jos, sus, N) -> number[N+1]`
- `lichidare(niv, pret, dir, L) -> {jos: number|null, sus: number|null}` (marja normalizată la 1)
- `levierSigur(jos, sus, pret, dir, N) -> {levier, sigur, lichidare}`
- `stopuri(jos, sus, pas) -> {jos, sus}`
- `construieste({pret, lat, pas, dir, suma?, levier?}) -> Setare` = `{dir, pret, jos, sus, grile, pas, levier, levierSigur, pesteSigur, lichidare, stop, profitGrila, perOrdin, suma}`
- `directie(b4h, b1d) -> {dir: "long"|"neutru"|"short", tarie: "slab"|"mediu"|"tare"|"fara-date", scor, motive: string[]}`
- `regim(b15) -> {r4h, r24h, miscare} | null` · `pozitie7z(b4h, pret) -> number|null`
- `verdict({regim, stat, zile, pozitie, pesteSigur}) -> {nivel: "porneste"|"asteapta"|"nu"|"fara-date", motive: string[]}`
- `procent(x) -> "1,23%"`

- [ ] **Step 1: Testele care pică** — `scripts/grid-v78.mjs`:

```js
// Probele v78: Grid - ce setez acum? (public/lib/grid-calcul.js + grid-proba.js)
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = citeste("../public/lib/grid-calcul.js") + "\n" + citeste("../public/lib/grid-proba.js");
const M = new Function(`${SRC}; return { GC: typeof GridCalcul!=="undefined"?GridCalcul:null, GP: typeof GridProba!=="undefined"?GridProba:null };`)();
const GC = M.GC, GP = M.GP;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const Q = 15 * 60000;
// bare crescatoare din preturi de inchidere: o = inchiderea anterioara, h/l cu o marja mica
function bareDin(inch, marja = 0.001, t0 = 1_780_000_000_000) {
  return inch.map((c, i) => { const o = i ? inch[i - 1] : c; return { t: t0 + i * Q, o, h: Math.max(o, c) * (1 + marja), l: Math.min(o, c) * (1 - marja), c }; });
}
function aleator(n, samanta = 7, vol = 0.004) {
  let s = samanta, p = 1; const out = [];
  for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; p *= 1 + ((s / 2147483647) - 0.5) * vol; out.push(p); }
  return out;
}

console.log("\nV78 · grid - ce setez acum · proba\n");

await test("modulul GridCalcul exista", () => assert.ok(GC, "GridCalcul lipseste"));

await test("bare: sorteaza, scoate dublurile si bara in formare, sare peste randuri stricate (nu le face 0)", () => {
  const r = [
    { time: 3000, open: "3", high: "3.1", low: "2.9", close: "3" },
    { time: 1000, open: "1", high: "1.1", low: "0.9", close: "1" },
    { time: 3000, open: "3", high: "3.1", low: "2.9", close: "3" },   // dublura din pagina suprapusa
    { time: 2000, open: "2", high: null, low: "1.9", close: "2" },     // stricat
    { time: 4000, open: "4", high: "4.2", low: "3.9", close: "4.1" }, // in formare
  ];
  assert.deepEqual(GC.bare(r).map((b) => b.t), [1000, 3000]);
  assert.equal(GC.pretCurent(r), 4.1);
  assert.equal(GC.pretCurent([]), null);
});

await test("percentila si mediana", () => {
  assert.equal(GC.mediana([3, 1, 2]), 2);
  assert.equal(GC.mediana([]), null);
  aprox(GC.percentila([0, 10, 20, 30, 40], 0.75), 30, 1e-9);
  aprox(GC.percentila([0, 10], 0.6), 6, 1e-9);
});

await test("nrGrile: jos 90, sus 110, pas 1% -> 20; strunit la 2..150", () => {
  assert.equal(GC.nrGrile(90, 110, 0.01), 20);
  assert.equal(GC.nrGrile(100, 100.1, 0.01), 2);
  assert.equal(GC.nrGrile(10, 1000, 0.0035), 150);
});

await test("plaseaza: neutru centrat, long 60% deasupra, short 40% deasupra", () => {
  const n = GC.plaseaza(100, 0.1, "neutru"), l = GC.plaseaza(100, 0.1, "long"), s = GC.plaseaza(100, 0.1, "short");
  aprox(n.jos, 95, 1e-9); aprox(n.sus, 105, 1e-9);
  aprox(l.jos, 96, 1e-9); aprox(l.sus, 106, 1e-9);
  aprox(s.jos, 94, 1e-9); aprox(s.sus, 104, 1e-9);
});

await test("lichidare long socotita de mana: 90-110, 2 grile, pret 100, 5x -> ~76,61", () => {
  // niveluri 90 / 99,4987 / 110; celula 0 cumparata la 90, celula 1 (peste pret) la 100
  // q0 = 5/2/90, q1 = 5/2/99,4987; Q = 0,052904; cost = 2,5 + 2,51259 = 5,01259
  // p = (cost - 1) / (Q * 0,99) = 76,61
  const lq = GC.lichidare(GC.niveluri(90, 110, 2), 100, "long", 5);
  aprox(lq.jos, 76.61, 0.02, "lichidarea long");
  assert.equal(lq.sus, null);
});

await test("levierSigur: lichidarea sta la cel putin o latime dincolo de margine; plafon 5x", () => {
  for (const dir of ["long", "neutru", "short"]) {
    const r = GC.levierSigur(95, 105, 100, dir, 20);
    assert.ok(r.levier >= 1 && r.levier <= 5, dir);
    if (r.lichidare.jos !== null) assert.ok(r.lichidare.jos <= 95 - 10, `${dir} jos ${r.lichidare.jos}`);
    if (r.lichidare.sus !== null) assert.ok(r.lichidare.sus >= 105 + 10, `${dir} sus ${r.lichidare.sus}`);
  }
});

await test("construieste: pas >= 0,35%, profit net pe grila >= 0,25%, stop inaintea lichidarii", () => {
  const st = GC.construieste({ pret: 100, lat: 0.08, pas: 0.0035, dir: "long", suma: 100 });
  assert.ok(st.pas >= 0.0035 - 1e-9, `pas ${st.pas}`);
  assert.ok(st.profitGrila >= 0.0025 - 1e-9, `profit ${st.profitGrila}`);
  assert.ok(st.stop.jos < st.jos && st.stop.sus > st.sus);
  assert.ok(st.lichidare.jos === null || st.lichidare.jos < st.stop.jos, "lichidarea inaintea stopului");
  aprox(st.perOrdin, 100 * st.levier / st.grile, 1e-9);
  assert.equal(st.pesteSigur, false);
});

await test("construieste cu levier ales peste cel sigur -> pesteSigur", () => {
  const st = GC.construieste({ pret: 100, lat: 0.3, pas: 0.01, dir: "long", suma: 100, levier: 20 });
  assert.equal(st.levier, 20);
  assert.equal(st.pesteSigur, true);
});

await test("directie: urcare -> long, coborare -> short, oscilatie -> neutru; mereu cu motive", () => {
  const sus = bareDin(Array.from({ length: 120 }, (_, i) => 1 + i * 0.01));
  const jos = bareDin(Array.from({ length: 120 }, (_, i) => 3 - i * 0.01));
  const lat = bareDin(Array.from({ length: 120 }, (_, i) => 2 + 0.05 * Math.sin(i * 0.7)));
  assert.equal(GC.directie(sus, sus).dir, "long");
  assert.equal(GC.directie(jos, jos).dir, "short");
  assert.equal(GC.directie(lat, lat).dir, "neutru");
  assert.equal(GC.directie(sus, sus).tarie, "tare");
  assert.ok(GC.directie(sus, sus).motive.length >= 2);
  assert.equal(GC.directie(sus.slice(0, 20), null).tarie, "fara-date");
});

await test("regim: liniste -> nu e miscare; salt mare in ultimele 4h -> miscare", () => {
  const lin = bareDin(aleator(30 * 96, 3, 0.004));
  assert.equal(GC.regim(lin).miscare, false, JSON.stringify(GC.regim(lin)));
  const inch = aleator(30 * 96, 3, 0.004);
  for (let i = inch.length - 16; i < inch.length; i++) inch[i] = inch[i - 1] * 1.006;   // +10% in 4h
  assert.equal(GC.regim(bareDin(inch)).miscare, true);
  assert.equal(GC.regim(lin.slice(0, 50)), null, "prea putin -> null, nu fals");
});

await test("verdict: miscare -> nu; liniste + proba buna -> porneste; proba la limita -> asteapta; fara date -> fara-date", () => {
  const bun = { antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.004 } };
  const linist = { r4h: 0.8, r24h: 0.9, miscare: false };
  assert.equal(GC.verdict({ regim: { r4h: 2.1, r24h: 1, miscare: true }, stat: bun, zile: 30, pozitie: 0.5 }).nivel, "nu");
  assert.equal(GC.verdict({ regim: linist, stat: bun, zile: 30, pozitie: 0.5 }).nivel, "porneste");
  assert.equal(GC.verdict({ regim: linist, stat: { antren: { mediana: 0.001, lichidari: 0 }, test: { mediana: 0.002 } }, zile: 30, pozitie: 0.5 }).nivel, "asteapta");
  assert.equal(GC.verdict({ regim: linist, stat: { antren: { mediana: -0.01, lichidari: 0 }, test: null }, zile: 30, pozitie: 0.5 }).nivel, "nu");
  assert.equal(GC.verdict({ regim: linist, stat: { antren: { mediana: 0.02, lichidari: 2 }, test: null }, zile: 30, pozitie: 0.5 }).nivel, "nu");
  assert.equal(GC.verdict({ regim: linist, stat: bun, zile: 30, pozitie: 0.97 }).nivel, "asteapta");
  assert.equal(GC.verdict({ regim: linist, stat: bun, zile: 12, pozitie: 0.5 }).nivel, "asteapta");
  assert.equal(GC.verdict({ regim: null, stat: bun, zile: 30, pozitie: 0.5 }).nivel, "fara-date");
});

// --- Task 3 adauga aici probele simulatorului si ale fisei ---

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
```

- [ ] **Step 2: Rulează** `node scripts/grid-v78.mjs`. Aștept: `PICA modulul GridCalcul exista`, iar celelalte pică pe `GC` null.

- [ ] **Step 3: Implementarea** — `public/lib/grid-calcul.js`:

```js
// Grid futures Pionex - calculul setarilor. Modul pur, fara DOM si fara retea,
// probat in scripts/grid-v78.mjs.
// Specul: docs/superpowers/specs/2026-09-24-grid-ce-setez-design.md
//
// Ce NU face: nu promite profit. Busola a masurat gridul pe date nevazute
// (20.09.2026): net negativ in medie; dovedit e doar "nu porni dupa miscare".
// Cifrele de aici sunt calcule pe praguri de pornire; grid-proba.js le
// verifica pe istoricul fiecarei monede.
var GridCalcul = (function () {
  "use strict";

  var C = {
    COMISION: 0.0005,          // pe umplere, Pionex futures
    PAS_MIN: 0.0035,           // net >= 0,25% pe grila dupa ~0,10% dus-intors
    PAS_MAX_MULT: 3,           // pasul maxim = mediana (high-low)/close pe 15M x 3
    PERCENTILE: [0.60, 0.75, 0.90],
    PERC_IMPLICIT: 1,
    INCLINARE: { long: 0.6, neutru: 0.5, short: 0.4 },   // partea de DEASUPRA pretului
    GRILE_MIN: 2, GRILE_MAX: 150,
    LEV_MAX: 5,
    MMR: 0.01,                 // marja de intretinere, prudent
    PRAG_MISCARE: 1.5,
    MEDIANA_VERDE: 0.003,
    MARGINE_RANGE: 0.10,
    BARE_ZI: 96,               // lumanari de 15M intr-o zi
    PAS_FERESTRE: 24,          // o fereastra noua la fiecare 6h
    ZILE_PLINE: 29
  };

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function citeste(r) {
    if (!r) return null;
    var a = Array.isArray(r);
    var b = { t: nr(a ? r[0] : r.time), o: nr(a ? r[1] : r.open), h: nr(a ? r[2] : r.high), l: nr(a ? r[3] : r.low), c: nr(a ? r[4] : r.close) };
    if (b.t === null || !(b.o > 0) || !(b.h > 0) || !(b.l > 0) || !(b.c > 0) || b.h < b.l) return null;
    return b;
  }
  function crescator(x, y) { return x - y; }

  // Lumanari Pionex (orice ordine, din pagini care se pot suprapune) -> crescator,
  // fara dubluri, fara bara in formare (cea mai noua). Un rand stricat se sare, nu devine 0.
  function bare(randuri) {
    if (!Array.isArray(randuri)) return [];
    var vazut = {}, v = [];
    for (var i = 0; i < randuri.length; i++) {
      var b = citeste(randuri[i]);
      if (b && !vazut[b.t]) { vazut[b.t] = 1; v.push(b); }
    }
    v.sort(function (x, y) { return x.t - y.t; });
    v.pop();
    return v;
  }
  // Pretul de acum = inchiderea barei celei mai noi (cea in formare).
  function pretCurent(randuri) {
    if (!Array.isArray(randuri)) return null;
    var cea = null;
    for (var i = 0; i < randuri.length; i++) { var b = citeste(randuri[i]); if (b && (!cea || b.t > cea.t)) cea = b; }
    return cea ? cea.c : null;
  }

  function mediana(a) {
    if (!a || !a.length) return null;
    var s = a.slice().sort(crescator), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function percentila(a, p) {
    if (!a || !a.length) return null;
    var s = a.slice().sort(crescator), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  }
  function procent(x) { return x === null || x === undefined || !isFinite(x) ? "—" : (x * 100).toFixed(2).replace(".", ",") + "%"; }

  // Cat s-a plimbat pretul (max high - min low, raportat la deschidere) in fiecare
  // fereastra de H zile, cu o fereastra noua la fiecare 6h.
  function latimi(b, H) {
    var W = H * C.BARE_ZI, out = [];
    for (var s = 0; s + W <= b.length; s += C.PAS_FERESTRE) {
      var mx = -Infinity, mn = Infinity;
      for (var i = s; i < s + W; i++) { if (b[i].h > mx) mx = b[i].h; if (b[i].l < mn) mn = b[i].l; }
      out.push((mx - mn) / b[s].o);
    }
    return out;
  }
  // Culoarul pasului: de la minimul care lasa profit peste comision pana la
  // pasul pe care pretul inca il atinge (mediana miscarii pe 15M x 3).
  function pasi(b) {
    var r = [];
    for (var i = 0; i < b.length; i++) r.push((b[i].h - b[i].l) / b[i].c);
    var med = mediana(r);
    if (med === null) return null;
    var mx = Math.max(C.PAS_MIN, med * C.PAS_MAX_MULT);
    return [C.PAS_MIN, Math.sqrt(C.PAS_MIN * mx), mx];
  }

  function plaseaza(pret, lat, dir) {
    var f = C.INCLINARE[dir], jos = pret * (1 - lat * (1 - f)), sus = pret * (1 + lat * f);
    if (jos < pret * 0.05) jos = pret * 0.05;
    return { jos: jos, sus: sus };
  }
  function nrGrile(jos, sus, pas) {
    var n = Math.round(Math.log(sus / jos) / Math.log(1 + pas));
    return Math.max(C.GRILE_MIN, Math.min(C.GRILE_MAX, n));
  }
  function niveluri(jos, sus, N) {
    var g = Math.pow(sus / jos, 1 / N), v = [];
    for (var k = 0; k <= N; k++) v.push(jos * Math.pow(g, k));
    v[N] = sus;
    return v;
  }

  // Pretul de lichidare cu pozitia PLINA pe partea periculoasa, marja izolata
  // normalizata la 1 (suma se simplifica). Castigul din grile nu se socoteste
  // (prudent). Long se lichideaza jos, short sus; neutru poate si jos, si sus.
  function lichidare(niv, pret, dir, L) {
    var N = niv.length - 1, Qj = 0, Cj = 0, Qs = 0, Cs = 0;
    for (var k = 0; k < N; k++) {
      var q = L / N / niv[k];
      if (dir === "long") { var e = niv[k + 1] > pret ? pret : niv[k]; Qj += q; Cj += q * e; }
      else if (dir === "short") { var e2 = niv[k] < pret ? pret : niv[k + 1]; Qs += q; Cs += q * e2; }
      else if (niv[k + 1] <= pret) { Qj += q; Cj += q * niv[k]; }
      else if (niv[k] >= pret) { Qs += q; Cs += q * niv[k + 1]; }
    }
    var jos = Qj > 0 ? (Cj - 1) / (Qj * (1 - C.MMR)) : null;
    var sus = Qs > 0 ? (1 + Cs) / (Qs * (1 + C.MMR)) : null;
    return { jos: jos !== null && jos > 0 ? jos : null, sus: sus };
  }
  function levierSigur(jos, sus, pret, dir, N) {
    var lat = sus - jos, niv = niveluri(jos, sus, N);
    for (var L = C.LEV_MAX; L >= 1; L--) {
      var lq = lichidare(niv, pret, dir, L);
      if ((lq.jos === null || lq.jos <= jos - lat) && (lq.sus === null || lq.sus >= sus + lat)) return { levier: L, sigur: true, lichidare: lq };
    }
    return { levier: 1, sigur: false, lichidare: lichidare(niv, pret, dir, 1) };
  }
  // Doua grile dincolo de fiecare margine: mereu inaintea lichidarii sigure
  // (care sta la o latime intreaga, iar latimea are cel putin doua grile).
  function stopuri(jos, sus, pas) { return { jos: jos * (1 - 2 * pas), sus: sus * (1 + 2 * pas) }; }

  function construieste(o) {
    var loc = plaseaza(o.pret, o.lat, o.dir), N = nrGrile(loc.jos, loc.sus, o.pas);
    var g = Math.pow(loc.sus / loc.jos, 1 / N) - 1;
    var sig = levierSigur(loc.jos, loc.sus, o.pret, o.dir, N);
    var L = o.levier > 0 ? o.levier : sig.levier;
    var lq = L === sig.levier ? sig.lichidare : lichidare(niveluri(loc.jos, loc.sus, N), o.pret, o.dir, L);
    var suma = o.suma > 0 ? o.suma : 1;
    return {
      dir: o.dir, pret: o.pret, jos: loc.jos, sus: loc.sus, grile: N, pas: g,
      levier: L, levierSigur: sig.levier, pesteSigur: L > sig.levier || !sig.sigur,
      lichidare: lq, stop: stopuri(loc.jos, loc.sus, g),
      profitGrila: g - 2 * C.COMISION, perOrdin: suma * L / N, suma: suma
    };
  }

  function ema(v, n) {
    var k = 2 / (n + 1), out = new Array(v.length), e = null;
    for (var i = 0; i < v.length; i++) { e = e === null ? v[i] : v[i] * k + e * (1 - k); out[i] = i >= n - 1 ? e : null; }
    return out;
  }
  function trendTF(b, eticheta) {
    if (!b || b.length < 55) return null;
    var c = [];
    for (var i = 0; i < b.length; i++) c.push(b[i].c);
    var e20 = ema(c, 20), e50 = ema(c, 50), n = c.length - 1, s = 0, panta = e50[n] - e50[n - 5];
    if (e20[n] > e50[n]) s++; else if (e20[n] < e50[n]) s--;
    if (panta > 0) s++; else if (panta < 0) s--;
    var text = eticheta + ": EMA20 " + (e20[n] > e50[n] ? "peste" : "sub") + " EMA50, EMA50 " + (panta > 0 ? "urcă" : panta < 0 ? "coboară" : "plată");
    return { scor: s, text: text };
  }
  function structura(b) {
    if (!b || b.length < 24) return null;
    var n = b.length, mxA = -Infinity, mnA = Infinity, mxP = -Infinity, mnP = Infinity;
    for (var i = n - 12; i < n; i++) { mxA = Math.max(mxA, b[i].h); mnA = Math.min(mnA, b[i].l); }
    for (var j = n - 24; j < n - 12; j++) { mxP = Math.max(mxP, b[j].h); mnP = Math.min(mnP, b[j].l); }
    if (mxA > mxP && mnA > mnP) return { scor: 1, text: "structura 4h: maxime și minime tot mai sus" };
    if (mxA < mxP && mnA < mnP) return { scor: -1, text: "structura 4h: maxime și minime tot mai jos" };
    return { scor: 0, text: "structura 4h: fără maxime/minime în aceeași direcție" };
  }
  // Directia iese MEREU (cererea lui, 24.09). Nu e o predictie: e trendul de acum.
  function directie(b4h, b1d) {
    var t4 = trendTF(b4h, "4h"), t1 = trendTF(b1d, "1z"), st = structura(b4h);
    if (!t4) return { dir: "neutru", tarie: "fara-date", scor: null, motive: ["prea puține lumânări de 4h ca să judec trendul"] };
    var s = t4.scor + (t1 ? t1.scor : 0) + (st ? st.scor : 0), motive = [t4.text];
    motive.push(t1 ? t1.text : "1z: prea puține lumânări");
    if (st) motive.push(st.text);
    var a = Math.abs(s);
    return { dir: s >= 2 ? "long" : s <= -2 ? "short" : "neutru", tarie: a >= 4 ? "tare" : a >= 2 ? "mediu" : "slab", scor: s, motive: motive };
  }

  // Miscarea de acum fata de cea obisnuita a monedei (mediana pe tot istoricul dat).
  function regim(b) {
    if (!b || b.length < 2 * C.BARE_ZI + 1) return null;
    function raport(k) {
      var m = [];
      for (var i = k; i < b.length; i++) m.push(Math.abs(b[i].c - b[i - k].c) / b[i - k].c);
      var med = mediana(m);
      return med > 0 ? m[m.length - 1] / med : null;
    }
    var r4 = raport(16), r24 = raport(C.BARE_ZI);
    return { r4h: r4, r24h: r24, miscare: (r4 !== null && r4 > C.PRAG_MISCARE) || (r24 !== null && r24 > C.PRAG_MISCARE) };
  }
  function pozitie7z(b4h, pret) {
    if (!b4h || b4h.length < 42 || !(pret > 0)) return null;
    var mx = -Infinity, mn = Infinity;
    for (var i = b4h.length - 42; i < b4h.length; i++) { mx = Math.max(mx, b4h[i].h); mn = Math.min(mn, b4h[i].l); }
    return mx > mn ? Math.max(0, Math.min(1, (pret - mn) / (mx - mn))) : null;
  }

  function verdict(o) {
    if (!o.regim || !o.stat || !o.stat.antren) return { nivel: "fara-date", motive: ["nu am destule lumânări ca să judec"] };
    var rosu = [], galben = [], a = o.stat.antren, rg = o.regim;
    if (rg.miscare) {
      var r = Math.max(rg.r4h || 0, rg.r24h || 0);
      rosu.push("prețul abia a făcut o mișcare de " + r.toFixed(1).replace(".", ",") + "× față de obișnuit — după mișcare gridul iese cel mai rău");
    }
    if (a.lichidari > 0) rosu.push("pe istoric, setarea asta a fost lichidată de " + a.lichidari + " ori");
    if (a.mediana < 0) rosu.push("pe istoric, setarea asta a ieșit pe minus (mediana " + procent(a.mediana) + ")");
    if (o.pesteSigur) rosu.push("levierul ales pune lichidarea prea aproape de grid");
    if (a.mediana >= 0 && a.mediana < C.MEDIANA_VERDE) galben.push("pe istoric iese la limită (mediana " + procent(a.mediana) + ")");
    if (!o.stat.test) galben.push("n-am avut zile nevăzute pe care s-o verific");
    else if (o.stat.test.mediana < 0) galben.push("pe ultimele zile, nevăzute la alegere, a ieșit pe minus (" + procent(o.stat.test.mediana) + ")");
    if (o.pozitie !== null && o.pozitie !== undefined && (o.pozitie < C.MARGINE_RANGE || o.pozitie > 1 - C.MARGINE_RANGE)) galben.push("prețul stă lângă " + (o.pozitie < C.MARGINE_RANGE ? "minimul" : "maximul") + " ultimelor 7 zile");
    if (o.zile < C.ZILE_PLINE) galben.push("moneda are doar " + Math.floor(o.zile) + " zile de istoric aici");
    return { nivel: rosu.length ? "nu" : galben.length ? "asteapta" : "porneste", motive: rosu.concat(galben) };
  }

  return { C: C, bare: bare, pretCurent: pretCurent, mediana: mediana, percentila: percentila, procent: procent,
    latimi: latimi, pasi: pasi, plaseaza: plaseaza, nrGrile: nrGrile, niveluri: niveluri, lichidare: lichidare,
    levierSigur: levierSigur, stopuri: stopuri, construieste: construieste, ema: ema, directie: directie,
    regim: regim, pozitie7z: pozitie7z, verdict: verdict };
})();
if (typeof globalThis !== "undefined") globalThis.GridCalcul = GridCalcul;
```

- [ ] **Step 4: Rulează** `node scripts/grid-v78.mjs`. Aștept: toate `ok`. Dacă pică lichidarea de mână, **refac socoteala de mână** înainte să ating codul.
- [ ] **Step 5: Stricare de control:** schimb în copie `PAS_MIN` la `0.002` → testul „construieste” trebuie să pice; restaurez și verific cu `git diff` că fișierul e cel bun.
- [ ] **Step 6:** adaug `test:grid` în `package.json` + `&& npm run test:grid` la coada lui `test`. Commit `v78 (2/6): grid-calcul - intervalul, grilele, levierul, directia, verdictul`

---

### Task 3: `public/lib/grid-proba.js` — simulatorul, alegerea și fișa

**Files:**
- Create: `public/lib/grid-proba.js`
- Modify: `scripts/grid-v78.mjs` (probele de mai jos, în locul comentariului `--- Task 3 ...`)

**Interfaces:**
- Consumes: tot `GridCalcul` din Task 2.
- Produces, pe `GridProba`:
  - `simuleaza(b, start, lungime, st) -> {net, realizat, comisioane, iesiri, lichidat, oprit, umpleri}` (net în fracție din sumă; `st.stop` opțional)
  - `statistici(rezultate) -> {n, mediana, ceaMaiProasta, iesiriMedii, lichidari, opriri} | null`
  - `alegePlatou(mat) -> {wi, pi, scor} | null` (`mat[wi][pi] = {mediana, lichidari}`)
  - `proba(b15, H) -> Proba | null` = `{H, zile, ferestre:{antren, test, independente}, latimi, pasi, pe:{long|neutru|short:{wi, pi, antren, test, faraVarianta}}, recomandata}`
  - `fisa({simbol, pret, b15, b4h, b1d, suma, H, dir, levier, minNotional}) -> Fisa | {eroare}` = `{simbol, H, directie, dir, manual, setare, proba, verdict, regim, pozitie, sumaMinima, contra}`

- [ ] **Step 1: Testele care pică** — adăugate în `scripts/grid-v78.mjs`:

```js
await test("modulul GridProba exista", () => assert.ok(GP, "GridProba lipseste"));

await test("simuleaza: canal neutru socotit de mana - doua cicluri pe celula 1 -> +2,521%", () => {
  // 90-110, 4 grile, levier 1: niveluri 90 / 94,630 / 99,499 / 104,618 / 110 (verificate in Python)
  // neutru la 100: celulele 0 si 1 cumpara la 90 si 94,630; celula 2 contine pretul (inactiva); celula 3 vinde la 110
  // fiecare bara (verde, drum O->L->H->C): 100 -> 94 (cumpara la 94,630) -> 100 (vinde la 99,499)
  // q1 = 1/4/94,630 = 0,00264186; castig = q1 * 4,8687 = 0,0128618; comision = q1*0,0005*(94,630+99,499) = 0,00025643
  // net pe ciclu 0,0126054; doua bare = 0,0252108
  const b = [0, 1].map((i) => ({ t: i * Q, o: 100, h: 100, l: 94, c: 100 }));
  const st = { dir: "neutru", jos: 90, sus: 110, grile: 4, levier: 1 };
  const r = GP.simuleaza(b, 0, 2, st);
  aprox(r.net, 0.0252108, 0.00002, "net");
  assert.equal(r.umpleri, 4);
  assert.equal(r.lichidat, false);
});

await test("simuleaza: trend care iese din interval -> stop, iesire numarata, net = pierderea pana la stop", () => {
  const inch = Array.from({ length: 60 }, (_, i) => 100 * (1 - 0.004 * i));   // -24%
  const b = bareDin(inch, 0.0005);
  const st = GC.construieste({ pret: b[0].o, lat: 0.08, pas: 0.005, dir: "long", suma: 1 });
  const r = GP.simuleaza(b, 0, b.length, st);
  assert.equal(r.oprit, true);
  assert.ok(r.iesiri >= 1);
  assert.ok(r.net < 0 && r.net > -1, `net ${r.net}`);
  assert.equal(r.lichidat, false);
});

await test("simuleaza: prabusire la levier mare fara stop -> lichidat, net = -100%", () => {
  const inch = Array.from({ length: 40 }, (_, i) => 100 * (1 - 0.012 * i));   // -47%
  const b = bareDin(inch, 0.0005);
  const st = GC.construieste({ pret: 100, lat: 0.06, pas: 0.005, dir: "long", suma: 1, levier: 10 });
  delete st.stop;
  const r = GP.simuleaza(b, 0, b.length, st);
  assert.equal(r.lichidat, true);
  assert.equal(r.net, -1);
});

await test("alegePlatou: alege platoul, nu varful izolat; sare peste ce a fost lichidat", () => {
  const c = (mediana, lichidari = 0) => ({ mediana, lichidari });
  const mat = [
    [c(-0.02), c(0.05), c(-0.02)],    // varf izolat 5%
    [c(0.01), c(0.012), c(0.011)],     // platou ~1%
    [c(0.01), c(0.011), c(0.3, 1)],    // 30% dar lichidat
  ];
  const a = GP.alegePlatou(mat);
  assert.deepEqual([a.wi, a.pi], [1, 1]);
  assert.equal(GP.alegePlatou([[c(0.1, 1)]]), null);
});

const b30 = bareDin(aleator(30 * 96 + 1, 11, 0.004));
await test("proba: 30 de zile -> 3 directii, ferestre antrenament + nevazute, sub 3 s", () => {
  const t0 = Date.now(), p = GP.proba(b30, 2);
  assert.ok(Date.now() - t0 < 3000, `a durat ${Date.now() - t0} ms`);
  for (const d of ["long", "neutru", "short"]) assert.ok(p.pe[d] && p.pe[d].antren, d);
  assert.ok(p.ferestre.antren > 20 && p.ferestre.test > 10, JSON.stringify(p.ferestre));
  assert.equal(p.ferestre.independente, 15);
  assert.ok(["long", "neutru", "short"].includes(p.recomandata));
});

await test("proba: sub 2 orizonturi + o zi de istoric -> null (nu cifre inventate)", () => {
  assert.equal(GP.proba(b30.slice(0, 4 * 96), 2), null);
});

const b4 = bareDin(aleator(300, 5, 0.01)), b1 = bareDin(aleator(200, 6, 0.02));
await test("fisa: completa, cu directie mereu data si setari de copiat", () => {
  const f = GP.fisa({ simbol: "TEST_USDT_PERP", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 100, H: 2, dir: null, levier: null, minNotional: 1 });
  assert.ok(!f.eroare, f.eroare);
  assert.ok(["long", "neutru", "short"].includes(f.dir));
  assert.ok(f.setare.jos < f.pret && f.setare.sus > f.pret || f.setare.jos < f.setare.pret);
  assert.ok(["porneste", "asteapta", "nu"].includes(f.verdict.nivel));
  assert.ok(f.setare.grile >= 2 && f.setare.levier >= 1);
});

await test("fisa: directia aleasa de el inlocuieste trendul si se spune ca e manuala", () => {
  const f = GP.fisa({ simbol: "T", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 100, H: 2, dir: "short", levier: null, minNotional: 1 });
  assert.equal(f.dir, "short"); assert.equal(f.manual, true); assert.equal(f.setare.dir, "short");
});

await test("fisa: suma prea mica pentru minimul pe ordin -> verdict nu + suma necesara", () => {
  const f = GP.fisa({ simbol: "T", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 2, H: 2, dir: null, levier: null, minNotional: 5 });
  assert.equal(f.verdict.nivel, "nu");
  assert.ok(f.sumaMinima > 2, `sumaMinima ${f.sumaMinima}`);
  assert.match(f.verdict.motive[0], /suma/i);
});

await test("fisa: fara pret sau fara lumanari -> eroare cu text, nu zero", () => {
  assert.ok(GP.fisa({ simbol: "T", pret: null, b15: b30, b4h: b4, b1d: b1, suma: 100, H: 2 }).eroare);
  assert.ok(GP.fisa({ simbol: "T", pret: 1, b15: [], b4h: b4, b1d: b1, suma: 100, H: 2 }).eroare);
});

await test("fisa: moneda cu 12 zile -> merge, dar verdictul maxim e asteapta si spune cate zile", () => {
  const b12 = b30.slice(-12 * 96);
  const f = GP.fisa({ simbol: "T", pret: b12[b12.length - 1].c, b15: b12, b4h: b4, b1d: b1, suma: 100, H: 2, dir: null, levier: null, minNotional: 1 });
  assert.ok(!f.eroare, f.eroare);
  assert.notEqual(f.verdict.nivel, "porneste");
  assert.ok(f.verdict.motive.some((m) => /12 zile/.test(m)), f.verdict.motive.join(" | "));
});
```

- [ ] **Step 2: Rulează** `node scripts/grid-v78.mjs`. Aștept: `PICA modulul GridProba exista` și probele noi picate.

- [ ] **Step 3: Implementarea** — `public/lib/grid-proba.js`:

```js
// Grid futures Pionex - proba pe istoric si fisa. Modul pur, probat in
// scripts/grid-v78.mjs. Se incarca DUPA grid-calcul.js.
//
// Simulatorul face ce face Pionex: LONG cumpara la pornire pozitia pentru
// grilele de deasupra pretului, SHORT e oglinda, NEUTRU porneste fara pozitie
// (cumpara dedesubt, vinde deasupra). Fiecare umplere plateste comisionul.
// La final se socoteste TOT: castigul din grile + ce valoreaza pozitia ramasa -
// minusul pe care cifra mare din Pionex nu il arata.
// Drumul in lumanare: verde O->L->H->C, rosie O->H->L->C.
var GridProba = (function () {
  "use strict";
  var G = GridCalcul, C = G.C, DIRECTII = ["long", "neutru", "short"];

  // primul index k cu niv[k] >= x
  function primulPeste(niv, x) { var lo = 0, hi = niv.length; while (lo < hi) { var m = (lo + hi) >> 1; if (niv[m] >= x) hi = m; else lo = m + 1; } return lo; }

  function simuleaza(b, start, lungime, st) {
    var N = st.grile, niv = G.niveluri(st.jos, st.sus, N), L = st.levier, com = C.COMISION;
    var P = b[start].o, tip = [], tine = [], intr = [], q = [];
    var Ql = 0, Cl = 0, Qs = 0, Cs = 0, real = 0, fee = 0, umpleri = 0, iesiri = 0;
    for (var k = 0; k < N; k++) {
      q[k] = L / N / niv[k]; tine[k] = false;
      if (st.dir === "long") tip[k] = "L";
      else if (st.dir === "short") tip[k] = "S";
      else tip[k] = niv[k + 1] <= P ? "L" : niv[k] >= P ? "S" : null;
      if (st.dir === "long" && niv[k + 1] > P) { tine[k] = true; intr[k] = P; Ql += q[k]; Cl += q[k] * P; fee += q[k] * P * com; umpleri++; }
      if (st.dir === "short" && niv[k] < P) { tine[k] = true; intr[k] = P; Qs += q[k]; Cs += q[k] * P; fee += q[k] * P * com; umpleri++; }
    }
    function umple(k, p) { fee += q[k] * p * com; umpleri++; }
    function misca(a, x) {
      var j;
      if (x < a) {                              // in jos: niveluri k cu x <= niv[k] < a
        for (j = primulPeste(niv, a) - 1; j >= 0 && niv[j] >= x; j--) {
          if (j >= N || !tip[j]) continue;
          if (tip[j] === "L" && !tine[j]) { tine[j] = true; intr[j] = niv[j]; Ql += q[j]; Cl += q[j] * niv[j]; umple(j, niv[j]); }
          else if (tip[j] === "S" && tine[j]) { tine[j] = false; real += q[j] * (intr[j] - niv[j]); Qs -= q[j]; Cs -= q[j] * intr[j]; umple(j, niv[j]); }
        }
      } else if (x > a) {                       // in sus: niveluri j cu a < niv[j] <= x, celula j-1
        for (j = Math.max(1, primulPeste(niv, a)); j <= N && niv[j] <= x; j++) {
          if (niv[j] === a) continue;
          var c = j - 1;
          if (!tip[c]) continue;
          if (tip[c] === "L" && tine[c]) { tine[c] = false; real += q[c] * (niv[j] - intr[c]); Ql -= q[c]; Cl -= q[c] * intr[c]; umple(c, niv[j]); }
          else if (tip[c] === "S" && !tine[c]) { tine[c] = true; intr[c] = niv[j]; Qs += q[c]; Cs += q[c] * niv[j]; umple(c, niv[j]); }
        }
      }
    }
    function capital(p) { return 1 + real - fee + (Ql * p - Cl) + (Cs - Qs * p); }
    function lichidat(p) { return capital(p) <= C.MMR * (Ql + Qs) * p; }
    function rezultat(extra) {
      var r = { net: 0, realizat: real, comisioane: fee, iesiri: iesiri, lichidat: false, oprit: false, umpleri: umpleri };
      for (var e in extra) r[e] = extra[e];
      return r;
    }
    function inchide(p) {
      if (lichidat(p)) return rezultat({ net: -1, lichidat: true });
      real += (Ql * p - Cl) + (Cs - Qs * p); fee += (Ql + Qs) * p * com;
      Ql = Cl = Qs = Cs = 0;
      return rezultat({ net: real - fee, oprit: true });
    }
    var pret = P, inauntru = true, sj = st.stop ? st.stop.jos : -Infinity, ss = st.stop ? st.stop.sus : Infinity;
    var fin = Math.min(b.length, start + lungime);
    for (var i = start; i < fin; i++) {
      var x = b[i], drum = x.c >= x.o ? [x.o, x.l, x.h, x.c] : [x.o, x.h, x.l, x.c];
      for (var d = 0; d < 4; d++) {
        var p = drum[d];
        if (p <= sj) { misca(pret, sj); if (inauntru) iesiri++; return inchide(sj); }
        if (p >= ss) { misca(pret, ss); if (inauntru) iesiri++; return inchide(ss); }
        misca(pret, p); pret = p;
        var acum = p >= st.jos && p <= st.sus;
        if (inauntru && !acum) iesiri++;
        inauntru = acum;
        if (lichidat(p)) return rezultat({ net: -1, lichidat: true });
      }
    }
    var fee2 = (Ql + Qs) * pret * com;   // comisionul de inchidere la final
    return rezultat({ net: real - fee - fee2 + (Ql * pret - Cl) + (Cs - Qs * pret) });
  }

  function statistici(rez) {
    if (!rez || !rez.length) return null;
    var net = [], ies = 0, lich = 0, opr = 0;
    for (var i = 0; i < rez.length; i++) { net.push(rez[i].net); ies += rez[i].iesiri; if (rez[i].lichidat) lich++; if (rez[i].oprit) opr++; }
    return { n: rez.length, mediana: G.mediana(net), ceaMaiProasta: Math.min.apply(null, net), iesiriMedii: ies / rez.length, lichidari: lich, opriri: opr };
  }

  // Platou, nu varf: scorul unei celule = media medianelor ei si a vecinilor
  // (latime +-1, pas +-1). Celulele lichidate nu se aleg (dar raman vecini).
  function alegePlatou(mat) {
    var best = null;
    for (var wi = 0; wi < mat.length; wi++) for (var pi = 0; pi < mat[wi].length; pi++) {
      var c = mat[wi][pi];
      if (!c || c.lichidari > 0 || c.mediana === null) continue;
      var s = 0, n = 0, vec = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
      for (var v = 0; v < vec.length; v++) {
        var r = mat[wi + vec[v][0]], x = r && r[pi + vec[v][1]];
        if (x && x.mediana !== null) { s += x.mediana; n++; }
      }
      var scor = s / n;
      if (!best || scor > best.scor) best = { wi: wi, pi: pi, scor: scor };
    }
    return best;
  }

  function proba(b15, H) {
    var W = H * C.BARE_ZI;
    if (!b15 || b15.length < 2 * W + C.BARE_ZI) return null;
    var nA = Math.round(b15.length * 2 / 3), A = b15.slice(0, nA);
    var lats = G.latimi(A, H), pasV = G.pasi(A);
    if (lats.length < 3 || !pasV) return null;
    var latV = C.PERCENTILE.map(function (p) { return G.percentila(lats, p); });
    var starturi = [], s, nAntren = 0, nTest = 0;
    for (s = 0; s + W <= b15.length; s += C.PAS_FERESTRE) {
      if (s + W <= nA) { starturi.push({ s: s, t: "a" }); nAntren++; }
      else if (s >= nA) { starturi.push({ s: s, t: "t" }); nTest++; }
    }
    var pe = {}, recomandata = null, scorRec = -Infinity;
    DIRECTII.forEach(function (dir) {
      var mat = [];
      for (var wi = 0; wi < latV.length; wi++) {
        mat.push([]);
        for (var pi = 0; pi < pasV.length; pi++) {
          var ra = [], rt = [];
          for (var j = 0; j < starturi.length; j++) {
            var f = starturi[j], st = G.construieste({ pret: b15[f.s].o, lat: latV[wi], pas: pasV[pi], dir: dir });
            (f.t === "a" ? ra : rt).push(simuleaza(b15, f.s, W, st));
          }
          mat[wi].push({ antren: statistici(ra), test: statistici(rt) });
        }
      }
      var ales = alegePlatou(mat.map(function (r) { return r.map(function (x) { return x.antren; }); }));
      if (ales) {
        pe[dir] = { wi: ales.wi, pi: ales.pi, antren: mat[ales.wi][ales.pi].antren, test: mat[ales.wi][ales.pi].test, platou: ales.scor, faraVarianta: false };
        if (ales.scor > scorRec) { scorRec = ales.scor; recomandata = dir; }
      } else {
        var d = C.PERC_IMPLICIT;   // nicio varianta fara lichidare: arat varianta de mijloc, cu lichidarile ei
        pe[dir] = { wi: d, pi: 1, antren: mat[d][1].antren, test: mat[d][1].test, platou: null, faraVarianta: true };
      }
    });
    return { H: H, zile: b15.length / C.BARE_ZI, ferestre: { antren: nAntren, test: nTest, independente: Math.floor(b15.length / W) },
      latimi: latV, pasi: pasV, pe: pe, recomandata: recomandata };
  }

  function fisa(o) {
    if (!(o.pret > 0)) return { eroare: "N-am prețul de acum al monedei." };
    var pr = proba(o.b15, o.H);
    if (!pr) return { eroare: "Prea puține lumânări ca să probez: trebuie cel puțin " + (2 * o.H + 1) + " zile de istoric pe 15 minute." };
    var dT = G.directie(o.b4h, o.b1d), dir = o.dir || dT.dir, ales = pr.pe[dir];
    var lat = G.percentila(G.latimi(o.b15, o.H), C.PERCENTILE[ales.wi]), pas = G.pasi(o.b15)[ales.pi];
    var st = G.construieste({ pret: o.pret, lat: lat, pas: pas, dir: dir, suma: o.suma, levier: o.levier });
    var rg = G.regim(o.b15), poz = G.pozitie7z(o.b4h, o.pret);
    var v = G.verdict({ regim: rg, stat: ales, zile: pr.zile, pozitie: poz, pesteSigur: st.pesteSigur });
    var sumaMinima = o.minNotional > 0 && st.perOrdin < o.minNotional ? o.minNotional * st.grile / st.levier : null;
    if (sumaMinima !== null) {
      v = { nivel: "nu", motive: ["suma e prea mică pentru " + st.grile + " grile: Pionex cere cel puțin " + o.minNotional + " USDT pe ordin, deci îți trebuie cel puțin " + Math.ceil(sumaMinima) + " USDT"].concat(v.motive) };
    }
    return { simbol: o.simbol, pret: o.pret, H: o.H, directie: dT, dir: dir, manual: !!o.dir, setare: st, proba: pr, verdict: v,
      regim: rg, pozitie: poz, sumaMinima: sumaMinima,
      contra: pr.recomandata && pr.recomandata !== dir ? { fisa: dir, proba: pr.recomandata } : null };
  }

  return { simuleaza: simuleaza, statistici: statistici, alegePlatou: alegePlatou, proba: proba, fisa: fisa };
})();
if (typeof globalThis !== "undefined") globalThis.GridProba = GridProba;
```

- [ ] **Step 4: Rulează** `node scripts/grid-v78.mjs`. Aștept: toate `ok`. Canalul socotit de mână trebuie să iasă pe cifra de mână. Dacă nu iese, caut greșeala în simulator, nu umblu la cifră.
- [ ] **Step 5: Stricări de control**, pe copie, fiecare văzută picând și apoi restaurată cu `git diff` curat:
  - (a) scot comisionul din `umple` → canalul pică
  - (b) inversez în `alegePlatou` condiția `lichidari > 0` → platoul pică
  - (c) în `fisa` șterg blocul `sumaMinima` → „suma prea mică” pică
- [ ] **Step 6: Commit** `v78 (3/6): grid-proba - simulatorul futures grid, platoul, fisa`

---

### Task 4: Date reale — chem codul pe lumânările Pionex adevărate

**Files:**
- Create: `scripts/grid-pe-date-reale.mjs` (unealtă de mână, **nu** intră în `npm test`: sună Pionex)

- [ ] **Step 1: Scriptul** aduce direct de la `https://api.pionex.com` (de acasă merge) 6×500 de lumânări 15M cu `endTime`, 300 de 4H și 200 de 1D pentru fiecare monedă din argumente (implicit `MET BTC ETH SOL`), cu pauză de 400 ms între cereri, apoi rulează `GridProba.fisa` și tipărește pe rând: prețul, direcția + motivele, setarea (jos/sus/grile/levier/stop/lichidare), verdictul + motivele, tabelul probei pe cele 3 direcții (mediana antrenament, mediana pe zile nevăzute, cea mai proastă, lichidări) și durata calculului.

```js
// Unealta de mana: GridProba.fisa pe lumanari Pionex REALE (de acasa). Nu intra in npm test.
//   node scripts/grid-pe-date-reale.mjs [MET BTC ...] [--suma=100] [--h=2]
import fs from "node:fs";
const SRC = ["../public/lib/grid-calcul.js", "../public/lib/grid-proba.js"].map((f) => fs.readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
const { GC, GP } = new Function(`${SRC}; return { GC: GridCalcul, GP: GridProba };`)();
const arg = process.argv.slice(2), opt = Object.fromEntries(arg.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const monede = arg.filter((a) => !a.startsWith("--")); if (!monede.length) monede.push("MET", "BTC", "ETH", "SOL");
const suma = Number(opt.suma || 100), H = Number(opt.h || 2), pauza = (ms) => new Promise((r) => setTimeout(r, ms));
async function cere(cale) { const r = await fetch("https://api.pionex.com" + cale); const j = await r.json(); if (!j.result) throw Error(cale + " -> " + (j.message || r.status)); return j.data; }
const simb = (await cere("/api/v1/common/symbols?type=PERP")).symbols;
for (const m of monede) {
  const s = m.toUpperCase() + "_USDT_PERP", info = simb.find((x) => x.symbol === s);
  if (!info) { console.log(`\n${s}: nu exista ca PERP`); continue; }
  let r15 = [], end = null;
  for (let p = 0; p < 6; p++) {
    const k = (await cere(`/api/v1/market/klines?symbol=${s}&interval=15M&limit=500${end ? "&endTime=" + end : ""}`)).klines;
    r15 = r15.concat(k); if (k.length < 500) break; end = Math.min(...k.map((x) => x.time)) - 1; await pauza(400);
  }
  const r4 = (await cere(`/api/v1/market/klines?symbol=${s}&interval=4H&limit=300`)).klines; await pauza(400);
  const r1 = (await cere(`/api/v1/market/klines?symbol=${s}&interval=1D&limit=200`)).klines; await pauza(400);
  const t0 = Date.now();
  const f = GP.fisa({ simbol: s, pret: GC.pretCurent(r15), b15: GC.bare(r15), b4h: GC.bare(r4), b1d: GC.bare(r1), suma, H, dir: null, levier: null, minNotional: Number(info.minNotional) });
  const ms = Date.now() - t0, P = GC.procent;
  console.log(`\n=== ${s} · pret ${f.pret} · ${ms} ms`);
  if (f.eroare) { console.log("  EROARE:", f.eroare); continue; }
  const st = f.setare;
  console.log(`  directie: ${f.dir} (${f.directie.tarie}) - ${f.directie.motive.join("; ")}`);
  console.log(`  setare: jos ${st.jos.toPrecision(5)} · sus ${st.sus.toPrecision(5)} · ${st.grile} grile (pas ${P(st.pas)}, net ${P(st.profitGrila)}) · ${st.levier}x (sigur ${st.levierSigur}x)`);
  console.log(`  stop: ${st.stop.jos.toPrecision(5)} / ${st.stop.sus.toPrecision(5)} · lichidare: ${st.lichidare.jos && st.lichidare.jos.toPrecision(5)} / ${st.lichidare.sus && st.lichidare.sus.toPrecision(5)} · pe ordin ${st.perOrdin.toFixed(2)} USDT`);
  console.log(`  VERDICT: ${f.verdict.nivel} - ${f.verdict.motive.join(" | ") || "liniste + proba pe plus"}`);
  console.log(`  regim: 4h ${f.regim && f.regim.r4h.toFixed(2)}x · 24h ${f.regim && f.regim.r24h.toFixed(2)}x · pozitie 7z ${f.pozitie && f.pozitie.toFixed(2)}`);
  const pr = f.proba;
  console.log(`  proba ${pr.zile.toFixed(1)} zile · ferestre ${pr.ferestre.antren}+${pr.ferestre.test} (~${pr.ferestre.independente} independente) · recomandata ${pr.recomandata}${f.contra ? " (CONTRAZICE fisa)" : ""}`);
  for (const d of ["long", "neutru", "short"]) { const x = pr.pe[d]; console.log(`   ${d.padEnd(7)} antren ${P(x.antren.mediana)} (cea mai proasta ${P(x.antren.ceaMaiProasta)}, lich ${x.antren.lichidari}, stop ${x.antren.opriri}/${x.antren.n}) · nevazut ${x.test ? P(x.test.mediana) : "—"}${x.faraVarianta ? " · NICIO varianta fara lichidare" : ""}`); }
}
```

- [ ] **Step 2: Rulează** `node scripts/grid-pe-date-reale.mjs MET BTC ETH SOL`. **Citesc cifrele**, nu doar că n-a crăpat:
  - prețul e cel din Pionex
  - `jos < preț < sus`
  - pasul ≥ 0,35%
  - lichidarea e dincolo de stop
  - ms < 3000 pe monedă
  - niciun `NaN`/`undefined`/`null` acolo unde trebuie cifră
  - lățimea are sens față de mișcarea monedei (BTC mai îngust decât MET)

  Tot ce arată greșit se repară în Task 2/3, cu test nou.
- [ ] **Step 3: Commit** `v78 (4/6): unealta grid-pe-date-reale + ce a iesit pe MET/BTC/ETH/SOL` (cifrele trec în mesajul commit-ului, din fișier: `git commit -F`)

---

### Task 5: Fereastra din Radar + versiunea v78.0

**Files:**
- Modify: `public/index.html` (secțiunea nouă `#gridset` după `#tabloubot`, butonul din bara laterală după „Tabloul botului”, butonul din meniul „More”, cele două `<script>`, meta + badge-uri `v78.0`)
- Modify: `public/app.js` (blocul `gr*`, ramura în `navTo`)
- Modify: `public/app.css` (clasele `gr*`)
- Modify: `public/sw.js` (`CACHE="crypto-radar-v78-0"`, `APP_SHELL` += `/lib/grid-calcul.js`, `/lib/grid-proba.js`)
- Modify: `package.json` (`"version": "78.0.0"`), `BUILD_INFO.json` (`version`)
- Test: `scripts/grid-v78.mjs` (probele `grSimbol` / `grNumar` ies din `app.js` prin extragere de text, ca la gărzile existente)

**Interfaces:**
- Consumes: `GridCalcul.bare`, `GridCalcul.pretCurent`, `GridProba.fisa`, `getJSON`, `escapeHtml`, `$`, `textEroare`, toast-ul existent din `app.js`.
- Produces (globale, chemate din `data-action-*`): `porneGrid()`, `gridCalculeaza(fortat)`, `gridOrizont(h)`, `gridDirectie(d)`, `gridCopiaza(el)`; ajutătoarele pure `grSimbol(text) -> "X_USDT_PERP"|null`, `grNumar(text) -> number>0|null`.

- [ ] **Step 1: Testele care pică**, pentru Review Focus 1 și 2, adăugate în `scripts/grid-v78.mjs`:

```js
const APP = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function scoateFunctia(nume) {
  const i = APP.indexOf("function " + nume + "(");
  if (i < 0) return null;
  let d = 0, j = APP.indexOf("{", i);
  for (let k = j; k < APP.length; k++) { if (APP[k] === "{") d++; else if (APP[k] === "}" && --d === 0) return APP.slice(i, k + 1); }
  return null;
}
await test("grSimbol: met / MET.PERP / METUSDT / MET_USDT_PERP -> MET_USDT_PERP; gol sau USDT -> null", () => {
  const src = scoateFunctia("grSimbol"); assert.ok(src, "grSimbol lipseste din app.js");
  const f = new Function(`${src}; return grSimbol;`)();
  for (const t of ["met", " MET.PERP ", "METUSDT", "MET_USDT_PERP", "met-usdt"]) assert.equal(f(t), "MET_USDT_PERP", t);
  assert.equal(f("1000pepe"), "1000PEPE_USDT_PERP");
  for (const t of ["", "  ", "USDT", null, undefined]) assert.equal(f(t), null, String(t));
});
await test("grNumar: 100,5 -> 100.5; gol / 0 / -3 / abc -> null (nu 0)", () => {
  const src = scoateFunctia("grNumar"); assert.ok(src, "grNumar lipseste din app.js");
  const f = new Function(`${src}; return grNumar;`)();
  assert.equal(f("100,5"), 100.5); assert.equal(f(" 250 "), 250);
  for (const t of ["", "0", "-3", "abc", null]) assert.equal(f(t), null, String(t));
});
```
Rulează: pică pe „lipsește din app.js”.

- [ ] **Step 2: `index.html`.** Buton lateral după cel al Tabloului:
```html
<button class="sideBtn" data-action-click="navTo('gridset',true)" data-nav="gridset"><span class="sideIcon">▦</span>Grid: ce setez?</button>
```
În meniul More, după „Tablou bot”:
```html
<button class="moreBtn" data-action-click="moreNav('gridset',true)"><b>▦</b>Grid: ce setez?</button>
```
Secțiunea, după `</section>`-ul lui `#tabloubot`:
```html
<section class="panel" id="gridset"><div class="sectionHead"><h3>🧮 Grid: ce setez acum?</h3><span class="tbSub" id="grStare">futures grid Pionex · calcul + probă pe ultimele ~30 de zile</span></div>
<div class="tbBloc grIntrari">
<label class="grCamp"><span class="tbEt2">Moneda (PERP)</span><input id="grMoneda" list="grMonede" autocomplete="off" placeholder="ex. MET" data-action-change="gridCalculeaza()"></label><datalist id="grMonede"></datalist>
<label class="grCamp"><span class="tbEt2">Suma, USDT</span><input id="grSuma" inputmode="decimal" value="100" data-action-change="gridCalculeaza()"></label>
<div class="grCamp"><span class="tbEt2">Cât îl ții</span><div class="tbInterval" role="group" aria-label="Orizontul gridului"><button type="button" class="tbIntBtn" id="grH1" aria-pressed="false" data-action-click="gridOrizont(1)">1 zi</button><button type="button" class="tbIntBtn" id="grH2" aria-pressed="true" data-action-click="gridOrizont(2)">2 zile</button><button type="button" class="tbIntBtn" id="grH3" aria-pressed="false" data-action-click="gridOrizont(3)">3 zile</button></div></div>
<div class="grCamp"><span class="tbEt2">Direcția</span><div class="tbInterval" role="group" aria-label="Direcția gridului"><button type="button" class="tbIntBtn" id="grDauto" aria-pressed="true" data-action-click="gridDirectie('auto')">Din trend</button><button type="button" class="tbIntBtn" id="grDlong" aria-pressed="false" data-action-click="gridDirectie('long')">Long</button><button type="button" class="tbIntBtn" id="grDneutru" aria-pressed="false" data-action-click="gridDirectie('neutru')">Neutru</button><button type="button" class="tbIntBtn" id="grDshort" aria-pressed="false" data-action-click="gridDirectie('short')">Short</button></div></div>
<label class="grCamp"><span class="tbEt2">Levier</span><select id="grLevier" data-action-change="gridCalculeaza()"><option value="">propus</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>8</option><option>10</option></select></label>
<button type="button" class="actionPrimary grCalc" data-action-click="gridCalculeaza('fortat')">Calculează acum</button>
</div>
<div id="grFisa"><div class="emptyState">Scrie o monedă (de exemplu MET) și suma. Fișa se recalculează singură la 5 minute cât stă deschisă.</div></div>
</section>
```
(Clasa butonului principal: cea folosită deja în pagină pentru butoane primare. O verific cu grep înainte și, dacă `actionPrimary` nu există, iau clasa existentă.)
Scripturile, înainte de `app.js`: `<script src="/lib/grid-calcul.js"></script><script src="/lib/grid-proba.js"></script>`.
Versiunea: `<meta content="v78.0" name="app-version"/>`, iar `sideVersiune`, `topVersiune`, `antetVersiune` și `healthAppVersion` trec pe `v78.0 · …`.

- [ ] **Step 3: `app.js`**, bloc nou pus lângă blocul Tabloului, plus ramura `else if(id==="gridset")porneGrid();` în `navTo`:

```js
// v78: 🧮 Grid - ce setez acum? Calculul e in lib/grid-calcul.js + lib/grid-proba.js
// (probate in scripts/grid-v78.mjs); aici doar aduc lumanarile si desenez fisa.
var grStare={H:2,dir:null,simbol:null,date:null,la:0,inLucru:false,eroare:null,fisa:null,monede:null,timer:null};
var GR_REIMPROSPATARE_MS=5*60*1000;
function grSimbol(t){var s=String(t==null?"":t).trim().toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/PERP$/,"").replace(/USDT$/,"");return s?s+"_USDT_PERP":null}
function grNumar(t){var s=String(t==null?"":t).trim().replace(/\s/g,"").replace(",",".");if(!s)return null;var x=Number(s);return Number.isFinite(x)&&x>0?x:null}
function grPanouVizibil(){return !!($("gridset")&&$("gridset").classList.contains("on"))}
async function grAduMonede(){
  if(grStare.monede)return;
  try{
    var d=await getJSON("/api/market?type=pionex_symbols&market=PERP");
    var a=d&&d.data&&Array.isArray(d.data.symbols)?d.data.symbols:[];
    var m={};a.forEach(function(x){if(x&&x.symbol&&x.status==="TRADING")m[x.symbol]=x});
    grStare.monede=m;
    var dl=$("grMonede");if(dl)dl.innerHTML=Object.keys(m).sort().map(function(s){return '<option value="'+escapeHtml(s.replace(/_USDT_PERP$/,""))+'">'}).join("");
  }catch(e){grStare.monede=null}
}
function porneGrid(){
  grAduMonede();
  if(!grStare.timer)grStare.timer=setInterval(function(){if(grPanouVizibil()&&grStare.simbol)gridCalculeaza()},GR_REIMPROSPATARE_MS);
  renderGrid();
}
function grPauza(ms){return new Promise(function(r){setTimeout(r,ms)})}
function grRanduri(k){return k&&k.data&&Array.isArray(k.data.klines)?k.data.klines:null}
async function grAduLumanari(simbol){
  var baza="/api/market?type=pionex_klines&symbol="+encodeURIComponent(simbol);
  var r15=[],end=null;
  for(var p=0;p<6;p++){
    var k=await getJSON(baza+"&interval=15M&limit=500"+(end?"&endTime="+end:""));
    var r=grRanduri(k);
    if(!r){if(p===0)throw Error((k&&(k.error||k.detail))||"Pionex nu a dat lumânări");break}
    r15=r15.concat(r);
    var t=r.map(function(x){return Number(x&&x.time)}).filter(Number.isFinite);
    if(r.length<500||!t.length)break;
    end=Math.min.apply(null,t)-1;
    await grPauza(350);
  }
  var r4=grRanduri(await getJSON(baza+"&interval=4H&limit=300"));await grPauza(350);
  var r1=grRanduri(await getJSON(baza+"&interval=1D&limit=200"));
  return {r15:r15,r4:r4||[],r1:r1||[]};
}
function grTextEroare(e){
  var local=/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  if(!local&&(e&&(e.status===429||e.status===403||/429|unavailable/i.test(String(e.message)))))return "Pionex nu răspunde de aici: pe versiunea publicată refuză cererile. Deschide Radarul de acasă (PORNESTE-CRYPTO-RADAR.bat).";
  return textEroare(e);
}
async function gridCalculeaza(fortat){
  var simbol=grSimbol($("grMoneda")&&$("grMoneda").value),suma=grNumar($("grSuma")&&$("grSuma").value),lev=grNumar($("grLevier")&&$("grLevier").value);
  if(!simbol){grStare.fisa=null;grStare.eroare="Scrie o monedă, de exemplu MET.";renderGrid();return}
  if(!suma){grStare.fisa=null;grStare.eroare="Scrie suma în USDT, de exemplu 100.";renderGrid();return}
  if(grStare.inLucru)return;
  var proaspat=grStare.date&&grStare.simbol===simbol&&Date.now()-grStare.la<GR_REIMPROSPATARE_MS-5000&&!fortat;
  grStare.inLucru=true;grStare.eroare=null;renderGrid();
  try{
    if(!proaspat){grStare.date=await grAduLumanari(simbol);grStare.simbol=simbol;grStare.la=Date.now()}
    var d=grStare.date,info=grStare.monede&&grStare.monede[simbol];
    if(grStare.monede&&!info)throw Error(simbol.replace(/_USDT_PERP$/,"")+" nu există ca PERP pe Pionex.");
    var f=GridProba.fisa({simbol:simbol,pret:GridCalcul.pretCurent(d.r15),b15:GridCalcul.bare(d.r15),b4h:GridCalcul.bare(d.r4),b1d:GridCalcul.bare(d.r1),
      suma:suma,H:grStare.H,dir:grStare.dir,levier:lev?Math.round(lev):null,minNotional:info?Number(info.minNotional):null});
    if(f.eroare){grStare.fisa=null;grStare.eroare=f.eroare}else{f.info=info||null;grStare.fisa=f}
  }catch(e){grStare.fisa=null;grStare.eroare=grTextEroare(e)}
  finally{grStare.inLucru=false}
  renderGrid();
}
function gridOrizont(h){grStare.H=Number(h)||2;[1,2,3].forEach(function(x){var b=$("grH"+x);if(b)b.setAttribute("aria-pressed",String(x===grStare.H))});if(grStare.date)gridCalculeaza()}
function gridDirectie(d){grStare.dir=d==="auto"?null:d;["auto","long","neutru","short"].forEach(function(x){var b=$("grD"+x);if(b)b.setAttribute("aria-pressed",String((grStare.dir||"auto")===x))});if(grStare.date)gridCalculeaza()}
function gridCopiaza(el){
  var v=el&&el.getAttribute("data-val");if(!v)return;
  var gata=function(){toast("Copiat: "+v,"good")};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(gata,function(){toast("Nu am putut copia; scrie de mână: "+v,"bad")});
  else toast("Scrie de mână: "+v,"bad");
}
function grPret(x,info){
  if(x==null||!Number.isFinite(x))return "—";
  var zec=info&&Number.isFinite(Number(info.quotePrecision))?Number(info.quotePrecision):(x>=1000?2:x>=1?4:6);
  return x.toFixed(zec);
}
var GR_DIR={long:"📈 LONG",neutru:"↔️ NEUTRU",short:"📉 SHORT"},GR_DIR_PIONEX={long:"Long",neutru:"Neutral",short:"Short"};
var GR_NIVEL={porneste:["🟢 PORNEȘTE","good"],asteapta:["🟡 AȘTEAPTĂ","tbWarn"],nu:["🔴 NU PORNI","bad"],"fara-date":["⚪ FĂRĂ DATE","mutedInfo"]};
function grRand(et,val,copiat){return '<div class="grRand"><span class="tbEt2">'+escapeHtml(et)+'</span><b>'+escapeHtml(val)+'</b>'+(copiat!=null?'<button type="button" class="actionGhost grCopy" data-val="'+escapeHtml(copiat)+'" data-action-click="gridCopiaza(this)" aria-label="Copiază '+escapeHtml(et)+'">copiază</button>':'<span></span>')+'</div>'}
function renderGrid(){
  var box=$("grFisa"),stare=$("grStare");if(!box)return;
  if(stare)stare.textContent=grStare.inLucru?"calculez… (aduc ~30 de zile de lumânări)":grStare.la?("calculat la "+new Date(grStare.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+" · se reface singur la 5 min"):"futures grid Pionex · calcul + probă pe ultimele ~30 de zile";
  if(grStare.eroare){box.innerHTML='<div class="tbBloc"><p class="bad">'+escapeHtml(grStare.eroare)+'</p></div>';return}
  var f=grStare.fisa;
  if(!f){if(!grStare.inLucru)box.innerHTML='<div class="emptyState">Scrie o monedă (de exemplu MET) și suma. Fișa se recalculează singură la 5 minute cât stă deschisă.</div>';return}
  var st=f.setare,i=f.info,P=GridCalcul.procent,niv=GR_NIVEL[f.verdict.nivel]||GR_NIVEL["fara-date"],mot=f.verdict.motive;
  var h='<div class="grVerdict '+niv[1]+'"><span class="grVEt">'+niv[0]+'</span><div><p class="grVMotiv">'+escapeHtml(mot[0]||"e liniște, iar proba pe istoric a ieșit pe plus, fără lichidări")+'</p>'+(mot.length>1?'<ul class="grLista">'+mot.slice(1).map(function(m){return "<li>"+escapeHtml(m)+"</li>"}).join("")+'</ul>':"")+'</div></div>';
  h+='<div class="tbRand"><div class="tbBloc"><div class="tbBlocCap"><h4>Direcția</h4><span class="tbSub">'+(f.manual?"aleasă de tine":"din trend")+'</span></div><p class="grDir">'+GR_DIR[f.dir]+(f.manual?"":' <span class="tbSub">tăria: '+escapeHtml(f.directie.tarie)+'</span>')+'</p><ul class="grLista">'+f.directie.motive.map(function(m){return "<li>"+escapeHtml(m)+"</li>"}).join("")+'</ul>'
    +(f.contra?'<p class="tbWarn">Trendul zice '+GR_DIR[f.contra.fisa]+', dar pe istoric a ieșit mai bine '+GR_DIR[f.contra.proba]+'. Uită-te la tabelul probei și alege tu.</p>':"")+'</div>';
  h+='<div class="tbBloc"><div class="tbBlocCap"><h4>Setările de pus în Pionex</h4><span class="tbSub">Futures Grid · '+escapeHtml(f.simbol.replace(/_USDT_PERP$/,""))+'/USDT</span></div>'
    +grRand("Direcție",GR_DIR_PIONEX[f.dir],GR_DIR_PIONEX[f.dir])
    +grRand("Preț de jos",grPret(st.jos,i),grPret(st.jos,i))
    +grRand("Preț de sus",grPret(st.sus,i),grPret(st.sus,i))
    +grRand("Număr de grile",st.grile+" (geometric)",String(st.grile))
    +grRand("Levier",st.levier+"×"+(st.pesteSigur?" (peste sigur: "+st.levierSigur+"×)":""),String(st.levier))
    +grRand("Investiție",st.suma+" USDT",String(st.suma))
    +(f.dir!=="short"?grRand("Stop-loss jos",grPret(st.stop.jos,i),grPret(st.stop.jos,i)):"")
    +(f.dir!=="long"?grRand("Stop-loss sus",grPret(st.stop.sus,i),grPret(st.stop.sus,i)):grRand("Take-profit sus (oprire)",grPret(st.stop.sus,i),grPret(st.stop.sus,i)))
    +'</div></div>';
  var lj=st.lichidare.jos,ls=st.lichidare.sus;
  h+='<div class="tbRand"><div class="tbBloc"><div class="tbBlocCap"><h4>Ce înseamnă în bani</h4></div>'
    +grRand("Pasul grilei",P(st.pas))+grRand("Profit pe grilă, după comision",P(st.profitGrila)+" ≈ "+(st.perOrdin*st.profitGrila).toFixed(3)+" USDT")
    +grRand("Pe fiecare ordin",st.perOrdin.toFixed(2)+" USDT"+(i&&i.minNotional?" (minim Pionex "+i.minNotional+")":""))
    +grRand("Lichidare jos",lj!=null?grPret(lj,i)+" · "+P((st.jos-lj)/st.jos)+" sub grid":"nu se lichidează jos")
    +grRand("Lichidare sus",ls!=null?grPret(ls,i)+" · "+P((ls-st.sus)/st.sus)+" peste grid":"nu se lichidează sus")
    +'</div>';
  var pr=f.proba,cel=function(x,k){return x&&x[k]!=null?(k==="lichidari"?String(x[k]):P(x[k])):"—"};
  h+='<div class="tbBloc"><div class="tbBlocCap"><h4>Proba pe ultimele '+Math.floor(pr.zile)+' zile</h4><span class="tbSub">'+pr.ferestre.antren+'+'+pr.ferestre.test+' ferestre de '+pr.H+'z, ~'+pr.ferestre.independente+' independente</span></div><div class="grTabelWrap"><table class="grTabel"><thead><tr><th></th>'
    +["long","neutru","short"].map(function(d){return '<th'+(d===f.dir?' class="grAles"':"")+'>'+GR_DIR[d]+(d===pr.recomandata?" ⭐":"")+'</th>'}).join("")+'</tr></thead><tbody>'
    +[["Mediana (zilele de alegere)","antren","mediana"],["Cea mai proastă fereastră","antren","ceaMaiProasta"],["Lichidări","antren","lichidari"],["Mediana pe zilele nevăzute","test","mediana"]].map(function(r){return '<tr><th>'+r[0]+'</th>'+["long","neutru","short"].map(function(d){return '<td>'+cel(pr.pe[d][r[1]],r[2])+'</td>'}).join("")+'</tr>'}).join("")
    +'</tbody></table></div><p class="tbSub">⭐ = cea mai bună pe istoric (platou, nu vârf). Aleasă pe primele 2/3 din zile, verificată pe ultima 1/3.</p></div></div>';
  var rg=f.regim;
  h+='<div class="tbBloc"><div class="tbBlocCap"><h4>Când îl oprești</h4></div><ul class="grLista">'
    +'<li>Stop-urile de mai sus sunt la două grile dincolo de marginile gridului, înaintea lichidării.</li>'
    +'<li>Când alertele Radarului anunță «gata liniștea», oprește-l: după mișcare gridul iese cel mai rău.</li>'
    +(rg?'<li>Acum: mișcarea pe 4h e '+rg.r4h.toFixed(1).replace(".",",")+'× cea obișnuită, pe 24h '+rg.r24h.toFixed(1).replace(".",",")+'×; peste 1,5× înseamnă mișcare.</li>':"")
    +'</ul><p class="tbSub">Nu e o promisiune: e un calcul și proba lui pe istoricul monedei. Gridul a ieșit în medie pe minus când l-am măsurat pe 30 de monede; ce s-a dovedit e să nu-l pornești după mișcare.</p></div>';
  box.innerHTML=h;
}
```
Înainte de scriere verific cu grep numele reale: `toast(msg,type)` (funcția de la r. ~3005), `textEroare`, `moreNav`, clasele `good`/`bad`/`tbWarn`/`mutedInfo`, și că `v54ActionArg` transformă `this` în element. Dacă diferă un nume, iau numele existent.

- [ ] **Step 4: `app.css`.** Clasele `gr*` folosesc culorile și variabilele deja definite pentru `.tb*` (le verific cu grep):
```css
.grIntrari{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
.grCamp{display:flex;flex-direction:column;gap:4px;min-width:0}
.grCamp input,.grCamp select{min-width:110px}
.grVerdict{display:flex;gap:14px;align-items:flex-start;padding:14px 16px;border-radius:12px;border:1px solid currentColor;margin:12px 0}
.grVEt{font-size:20px;font-weight:900;white-space:nowrap}
.grVMotiv{margin:2px 0 0;font-weight:700;color:var(--text,inherit)}
.grLista{margin:6px 0 0;padding-left:18px}
.grDir{font-size:18px;font-weight:900;margin:4px 0}
.grRand{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.grCopy{padding:2px 8px;font-size:12px}
.grTabelWrap{overflow-x:auto}
.grTabel{width:100%;border-collapse:collapse;font-size:13px}
.grTabel th,.grTabel td{padding:6px 8px;text-align:right;border-bottom:1px solid rgba(255,255,255,.06)}
.grTabel tbody th{text-align:left;font-weight:600}
.grAles{outline:2px solid rgba(120,180,255,.5);outline-offset:-2px}
@media (max-width:600px){.grVerdict{flex-direction:column}.grRand{grid-template-columns:1fr auto}.grRand .grCopy{grid-column:2}}
```

- [ ] **Step 5: `sw.js`**: `CACHE="crypto-radar-v78-0"` + cele două fișiere în `APP_SHELL`. `package.json` `78.0.0`, `BUILD_INFO.json` `78.0` (în forma pe care o are deja).
- [ ] **Step 6: Rulează** `npm test`. Aștept: toate suitele verzi, inclusiv `test:grid` cu `grSimbol`/`grNumar` și garda `versiune` (o singură versiune peste tot).
- [ ] **Step 7: Commit** `v78 (5/6): fereastra Grid - ce setez acum? in Radar + v78.0`

---

### Task 6: Proba pe ecran, pe Radarul local cu date reale, și livrarea

**Files:**
- Create: `scripts/proba-ecran-grid.mjs` (nu intră în `npm test`: are nevoie de server pe `:8788` și de Chrome/Edge)

- [ ] **Step 1: Proba de ecran.** Folosesc lansatorul CDP din `scripts/proba-ecran-tablou.mjs` (`porneste()`: ocolește service worker-ul, profil curat șters în `finally`). Pe `http://127.0.0.1:8788/`, cu date **reale** (fără fetch fals), proba:
  1. `navTo('gridset',true)`; pune `MET` și `100`; apasă „Calculează acum”; așteaptă până la 60 s ca `#grFisa .grVerdict` să apară
  2. verifică: verdictul are una dintre cele 4 etichete; există 3 coloane în `.grTabel thead th` + eticheta; cel puțin 7 butoane `.grCopy`; textul fișei nu conține `NaN`, `undefined`, `null`, `Infinity`; consola n-are erori
  3. apasă `Short`: direcția din „Setările” devine `Short` fără o nouă aducere de lumânări (numără cererile `/api/market` din `Network`)
  4. apasă `3 zile`: titlul probei spune `ferestre de 3z`
  5. scrie `NUEXISTA` → mesaj „nu există ca PERP”; suma `0` → „Scrie suma”
  6. fotografiază la 1440×900 și 390×844 în scratchpad, fără scroll orizontal la 390 (`document.documentElement.scrollWidth <= 390`)
- [ ] **Step 2: Rulează** proba și **mă uit la poze** (cu Read pe PNG). Repar ce se vede strâmb.
- [ ] **Step 3: Gărzile transversale**: `npm test` întreg; `git diff --stat` față de `683cfa4` conține doar fișierele din plan.
- [ ] **Step 4: Revizie finală**: un singur agent Opus pe toată ramura, cu specul și planul în față.
- [ ] **Step 5: Livrarea**: `git push` pe `main` (Pages desfășoară singur). Verific pe fișierele **servite** că `crypto-wuy.pages.dev/lib/grid-proba.js` există și `sw.js` are `v78-0`. Local, Radarul ia codul la repornire sau la reîmprospătare (SW-ul e rețea-întâi pe `lib/`).
- [ ] **Step 6: Memoria**: actualizez `project_grid_ce_setez_v78.md` și `MEMORY.md` cu ce s-a livrat și cifrele de pe MET.
