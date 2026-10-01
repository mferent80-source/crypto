# Griduri înguste cu profit rapid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pe monedele sugerate (ideile de boți) și în fișa „Grid: ce setez?” apare o variantă de grid ÎNGUST (6 / 12 / 24 h), aleasă pe istoric fără privit în viitor, propusă doar când a ieșit pe plus după comisioane pe partea de test nevăzută.

**Architecture:** O funcție pură nouă `GridProba.ingust(b15, o)` refolosește simulatorul și scorul de platou existente (aceeași socoteală ca gridul de acum). Colectorul o rulează la 6 h pe ≤5 monede sugerate, cu 60 de zile de 15 minute, și scrie rezultatul în KV-ul local (`ingust:<SIMBOL>`); pagina îl citește, iar pentru o monedă nesugerată fișa îl calculează pe loc pe cele ~31 de zile pe care le are.

**Tech Stack:** JS ES5 în `public/lib/*.js` (pagină + colector), `public/app.js` (fișa), `public/lib/t212-ecran.js` (ideile de boți — `tbIdeiRender`), Pages Function `functions/api/istoric-bot.js`, colector Node + `scripts/lib/tura-*.mjs`, probă `scripts/proba-v10058.mjs` în `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-01-griduri-inguste-design.md`

## Global Constraints

- Același simulator (`GridProba.simuleaza`) și aceleași comisioane: 0,02 % maker pe grile, 0,05 % taker la pornire/închidere/stop; pasul minim 0,30 %.
- Durate H ∈ {6 h, 12 h, 24 h}; lățimi = percentilele 30 / 45 / 60 ale mișcării pe H, calculate DOAR pe antrenare (primele 2/3).
- Propus doar dacă pe test: ≥ 30 ferestre independente, mediana netă > 0, marginea de jos Wilson 95 % a „% pe plus” > 50 %. Altfel `propus: false` cu motivul.
- Doar direcția pieței (long / short / neutru); în mișcare mare ⇒ nimic.
- Gridul de acum, verdictul fișei, alertele, Pionex (doar citire) și cota KV de pe Cloudflare NU se schimbă.
- Versiunea paginii v100.58, colectorul v101.38. `npm test && git commit && git push` — niciodată cu `;`. Fără `git pull` în `crypto`.

## Review Focus

1. **Monedă nouă pe Pionex (puțin istoric)**: sub ~9 zile de 15 minute ⇒ `propus: false`, „prea puțin istoric”, fără eroare. Test în Task 1.
2. **Toate celulele se lichidează / niciuna nu e alesă** (levier mare pe interval îngust): `propus: false` cu motivul, nu crapă. Test în Task 1.
3. **Rezultatul vechi din KV** (colectorul a rulat acum 2 zile, moneda nu mai e sugerată): pagina arată „calculat acum N ore”; peste 12 h ⇒ „vechi”, nu se dă drept proaspăt. Test în Task 3.
4. **Prețul de acum departe de ultimul preț al probei**: setarea se construiește pe prețul de ACUM (`o.pret`), nu pe ultima bară. Test în Task 1.
5. **Fișa pe o monedă nesugerată**: calcul local pe ~31 de zile, cu nota „pe 31 de zile — mai puține ferestre”; de obicei nepropus din lipsă de ferestre — se spune. Test în Task 3.

---

### Task 1: `GridProba.ingust` + `GridProba.rezumatIngust` (pure)

**Files:**
- Modify: `public/lib/grid-proba.js` (înainte de `return { simuleaza: ...` ~255; exportul)
- Create: `scripts/proba-v10058.mjs`; Modify: `package.json` (`test:v10058` + lanțul)

**Interfaces:**
- Produces:
  - `GridProba.ingust(b15, o)` cu `o = {dir: "long"|"short"|"neutru", miscare: bool, pret, suma, levier, doarH?: [zile]}` → `{propus, motiv, dir, H, ore, latime, pas, setare, antren, test: {n, nIndep, mediana, pePlus, ic, celMaiRau, perechiZi}, zile}`; la refuz timpuriu doar `{propus: false, motiv}`.
  - `GridProba.rezumatIngust(ing)` → string scurt pentru idei.

- [ ] **Step 1: Proba (picând)** — `scripts/proba-v10058.mjs`:

```js
// Proba v100.58 (01.10, el: „griduri înguste cu profit rapid pe coinuri sugerate pe direcție”).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); }); }
console.log("\nV100.58 · Griduri înguste · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const M15 = 900000;
// oscilatie curata: perioada 2 h (8 bare), +-1 % in jurul lui 100 -> prețul străbate un interval îngust de multe ori
const osc = (zile, f) => Array.from({ length: zile * 96 }, (_, i) => { const c = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * i / 8)) * (f ? f(i) : 1), o = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * (i - 1) / 8)) * (f ? f(i - 1) : 1); return { t: i * M15, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c }; });
// tendinta in sus puternica, fara oscilatie
const sus = (zile) => Array.from({ length: zile * 96 }, (_, i) => { const o = 100 * 1.0015 ** i, c = 100 * 1.0015 ** (i + 1); return { t: i * M15, o, h: c * 1.0005, l: o * 0.9995, c }; });

await test("oscilatie curata in interval, neutru: gridul ingust e PROPUS, pe plus dupa comisioane, cu >= 30 ferestre independente pe test", () => {
  are(GP.ingust, "GridProba.ingust");
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 });
  assert.equal(r.propus, true, r.motiv);
  assert.ok(r.test.mediana > 0 && r.test.nIndep >= 30 && r.test.ic[0] > 0.5, JSON.stringify(r.test));
  assert.ok([6, 12, 24].includes(r.ore)); assert.ok(r.setare && r.setare.grile >= 2 && r.setare.pas >= 0.0029, JSON.stringify(r.setare));
  assert.ok(r.test.perechiZi > 0);
});
await test("contra tendintei (short pe urcare puternica): NEpropus, cu motiv", () => {
  const r = GP.ingust(sus(40), { dir: "short", pret: 100, suma: 100 });
  assert.equal(r.propus, false); assert.ok(r.motiv && r.motiv.length > 10, r.motiv);
});
await test("fara privit in viitor: schimbarea barelor de TEST nu schimba celula aleasa (H, latime, pas)", () => {
  const b = osc(40), nA = Math.round(b.length * 2 / 3), b2 = b.map((x, i) => i < nA ? x : { ...x, o: x.o * 1.3, h: x.h * 1.3, l: x.l * 1.3, c: x.c * 1.3 });
  const r1 = GP.ingust(b, { dir: "neutru", pret: 100, suma: 100 }), r2 = GP.ingust(b2, { dir: "neutru", pret: 100, suma: 100 });
  assert.deepEqual([r1.ore, r1.latime, r1.pas], [r2.ore, r2.latime, r2.pas]);
});
await test("ferestrele independente: la 12 h = jumatate din ferestrele de test (pornirile sunt la 6 h)", () => {
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100, doarH: [0.5] });
  assert.equal(r.ore, 12); assert.equal(r.test.nIndep, Math.floor(r.test.n * 24 / 48));
});
await test("miscare mare / fara directie / istoric scurt -> nepropus, fara eroare; setarea pe pretul de ACUM", () => {
  assert.match(GP.ingust(osc(40), { dir: "long", miscare: true, pret: 100 }).motiv, /mișcare/);
  assert.equal(GP.ingust(osc(40), { dir: null, pret: 100 }).propus, false);
  assert.match(GP.ingust(osc(5), { dir: "neutru", pret: 100 }).motiv, /prea puțin istoric/);
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 120, suma: 100 });
  assert.ok(r.setare.jos < 120 && r.setare.sus > 120, "construita pe pretul de acum");
});
await test("toate celulele lichidate (levier urias) -> nepropus cu motiv, nu crapa", () => {
  const r = GP.ingust(sus(40), { dir: "short", pret: 100, suma: 100, levier: 100 });
  assert.equal(r.propus, false); assert.ok(typeof r.motiv === "string");
});
await test("rezumatul pentru idei: directie, interval, linii N+1, durata, cifrele de pe test; nepropus -> motivul", () => {
  are(GP.rezumatIngust, "GridProba.rezumatIngust");
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 }), t = GP.rezumatIngust(r);
  assert.match(t, /neutru/i); assert.match(t, new RegExp((r.setare.grile + 1) + " linii")); assert.match(t, new RegExp(r.ore + " h")); assert.match(t, /pe plus/);
  assert.match(GP.rezumatIngust({ propus: false, motiv: "ceva anume" }), /ceva anume/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
```

`package.json`: `"test:v10058": "node scripts/proba-v10058.mjs"` + ` && npm run test:v10058` după `test:v10057`.

- [ ] **Step 2: Rulează** — `node scripts/proba-v10058.mjs` · Expected: FAIL „lipseste GridProba.ingust”.

- [ ] **Step 3: Implementează** în `grid-proba.js`, înainte de `return { simuleaza: ...`:

```js
  // v100.58 (el, 01.10: „griduri mai înguste, cu profit rapid, pe coinuri sugerate pe direcție”): a doua cautare, ingusta - durata
  // 6/12/24 h, latimile P30/45/60 ale miscarii pe durata (doar pe antrenare), aceiasi pasi; DOAR directia data. Aleasa pe antrenare
  // (platou), raportata pe test; propusa doar cu >= 30 ferestre independente, mediana > 0 si Wilson 95 % „pe plus” > 50 %.
  // Iesirea: stopul sau capatul duratei (simuleaza inchide la final, cu taker) - aceeasi socoteala ca gridul de acum
  var ING = { H: [0.25, 0.5, 1], PERC: [0.30, 0.45, 0.60], MIN_INDEP: 30 };
  function ingust(b15, o) {
    o = o || {};
    if (o.miscare) return { propus: false, motiv: "piața e în mișcare mare — nu porni un grid îngust acum" };
    if (DIRECTII.indexOf(o.dir) < 0) return { propus: false, motiv: "fără direcția pieței pentru monedă" };
    if (!b15 || b15.length < 9 * C.BARE_ZI) return { propus: false, motiv: "prea puțin istoric de 15 minute (sub 9 zile)" };
    var nA = Math.round(b15.length * 2 / 3), A = b15.slice(0, nA), pasV = G.pasi(A);
    if (!pasV) return { propus: false, motiv: "prea puțin istoric de 15 minute (sub 9 zile)" };
    var best = null, Hs = Array.isArray(o.doarH) && o.doarH.length ? o.doarH : ING.H;
    Hs.forEach(function (H) {
      var W = Math.round(H * C.BARE_ZI), lats = G.latimi(A, H);
      if (lats.length < 3) return;
      var latV = ING.PERC.map(function (p) { return G.percentila(lats, p); }), mat = [], cel = [];
      latV.forEach(function (lat) {
        var rA = [], rC = [];
        pasV.forEach(function (pas) {
          var ra = [], rt = [];
          for (var s = 0; s + W <= b15.length; s += C.PAS_FERESTRE) {
            if (s + W <= nA) ra.push(simuleaza(b15, s, W, G.construieste({ pret: b15[s].o, lat: lat, pas: pas, dir: o.dir })));
            else if (s >= nA) rt.push(simuleaza(b15, s, W, G.construieste({ pret: b15[s].o, lat: lat, pas: pas, dir: o.dir })));
          }
          rA.push(statistici(ra)); rC.push({ lat: lat, pas: pas, rt: rt });
        });
        mat.push(rA); cel.push(rC);
      });
      var a = alegePlatou(mat);
      if (a && (!best || a.scor > best.scor)) best = { scor: a.scor, H: H, W: W, c: cel[a.wi][a.pi], antren: mat[a.wi][a.pi] };
    });
    if (!best) return { propus: false, motiv: "pe istoric, toate variantele înguste s-au lichidat sau n-au avut ferestre — rămâi la gridul lat" };
    var rt = best.c.rt, net = rt.map(function (r) { return r.net; }), st = statistici(rt), plus = net.filter(function (v) { return v > 0; }).length;
    var nIndep = Math.floor(rt.length * C.PAS_FERESTRE / best.W), ic = nIndep > 0 ? G.wilson(Math.round(plus / Math.max(1, rt.length) * nIndep), nIndep) : [0, 1];
    var test = { n: rt.length, nIndep: nIndep, mediana: st ? st.mediana : null, pePlus: rt.length ? plus / rt.length : null, ic: ic, celMaiRau: st ? st.ceaMaiProasta : null, perechiZi: st ? st.perechiMedii / best.H : null, lichidari: st ? st.lichidari : 0 };
    var setare = G.construieste({ pret: o.pret > 0 ? o.pret : b15[b15.length - 1].c, lat: best.c.lat, pas: best.c.pas, dir: o.dir, suma: o.suma, levier: o.levier });
    var ore = Math.round(best.H * 24), motiv = "";
    if (nIndep < ING.MIN_INDEP) motiv = "prea puține ferestre independente pe partea de test (" + nIndep + " din " + ING.MIN_INDEP + " la " + ore + " h)";
    else if (test.lichidari > 0) motiv = "pe partea de test s-a lichidat de " + test.lichidari + " ori";
    else if (!(test.mediana > 0)) motiv = "pe ultimele zile (test), după comisioane, n-a ieșit pe plus — rămâi la gridul lat";
    else if (!(ic[0] > 0.5)) motiv = "pe test, ferestrele pe plus nu sunt clar peste jumătate (" + Math.round(test.pePlus * 100) + " %)";
    return { propus: !motiv, motiv: motiv, dir: o.dir, H: best.H, ore: ore, latime: best.c.lat, pas: best.c.pas, setare: setare, antren: best.antren, test: test, zile: Math.round(b15.length / C.BARE_ZI) };
  }
  // un rand pentru ideile de boti
  function rezumatIngust(r) {
    if (!r) return "";
    if (!r.propus) return "⚡ grid îngust: nu — " + (r.motiv || "nedovedit");
    var P = function (x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + " %"; }, D = { long: "long", short: "short", neutru: "neutru" };
    return "⚡ grid îngust " + D[r.dir] + ", " + r.ore + " h: " + (r.latime * 100).toFixed(1).replace(".", ",") + " % lățime, " + (r.setare.grile + 1) + " linii, ~" + Math.round(r.test.perechiZi) + " perechi/zi · pe test: median " + P(r.test.mediana)
      + ", " + Math.round(r.test.pePlus * 100) + " % pe plus, cel mai rău " + P(r.test.celMaiRau) + " (" + r.test.nIndep + " ferestre independente)";
  }
```

Export: `ingust: ingust, rezumatIngust: rezumatIngust,` adăugat în obiectul `return { simuleaza: ...`.

- [ ] **Step 4: Rulează** — `node scripts/proba-v10058.mjs` · Expected: 7/7. Dacă testul „oscilație” nu dă `propus` din cauza fixture-ului (nu a codului), Ruling în registru + ajustează amplitudinea/perioada fixture-ului (codul nu se schimbă ca să treacă testul). `npm test` verde.

- [ ] **Step 5: Commit** — `npm test && git add public/lib/grid-proba.js scripts/proba-v10058.mjs package.json && git commit -m "feat(grid): gridul ingust - a doua cautare pe 6/12/24 h, aleasa pe antrenare, propusa doar pe test (v100.58)"`

---

### Task 2: Ruta `ingust` + colectorul (60 de zile, ≤5 monede sugerate, la 6 h)

**Files:**
- Modify: `functions/api/istoric-bot.js` (GET ~69 lângă `profil`; POST ~280 lângă `profil`)
- Create: `scripts/lib/tura-ingust.mjs`
- Modify: `scripts/colector.mjs` (import, `turaIngust` cu ritm de 6 h, chemată în bucla turelor lente — lângă `turaLaborator`)
- Test: `scripts/proba-v10058.mjs`

**Interfaces:**
- Consumes: `GridProba.ingust` (Task 1); `Idei.ideiBoti(cl, [], 5)` (existent: candidații din clasament, cu `simbol`, `dir`, `regim`).
- Produces: GET `/api/istoric-bot?action=ingust&simbol=S` → `{simbol, ingust: {...ingust, la, zile} | null}`; POST același `action` cu `{simbol, ingust}`; `turaIngust(d)` → `{monede, propuse}`.

- [ ] **Step 1: Test (picând)**:

```js
await test("ruta ingust: POST + GET pastreaza rezultatul (curatat); colectorul il calculeaza pe <= 5 monede sugerate, 12 pagini, la 6 h", async () => {
  const { pathToFileURL } = await import("node:url");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const ing = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 });
  const p = await mod.onRequestPost({ request: cer("POST", "action=ingust", { simbol: "CRV_USDT_PERP", ingust: { ...ing, la: 5, zile: 40, rau: "<script>" } }), env });
  assert.equal(p.status, 200);
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=ingust&simbol=CRV_USDT_PERP"), env })).json();
  assert.equal(g.ingust.propus, ing.propus); assert.equal(g.ingust.ore, ing.ore); assert.equal(g.ingust.setare.grile, ing.setare.grile); assert.equal(g.ingust.la, 5);
  assert.ok(!("rau" in g.ingust), "doar campurile cunoscute");
  const { turaIngust } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-ingust.mjs")).href);
  const cerute = [], scrise = [];
  const bare = osc(40), klines = bare.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: 1 }));
  const cl = { monede: Array.from({ length: 8 }, (_, i) => ({ simbol: "M" + i + "_USDT_PERP", stare: "candidat", scor: 8 - i, dir: "neutru", regim: { miscare: false }, pret: 100 })) };
  const Idei = { ideiBoti: (c, t, n) => c.monede.slice(0, n).map((x) => ({ ...x, moneda: x.simbol.split("_")[0], istoric: { n: 0 } })) };
  const r = await turaIngust({ clasament: cl, Idei, GridProba: GP, GridCalcul: G, pauza: async () => {}, jurnal: () => {},
    cere: async (simbol, end) => { cerute.push(simbol); return { data: { klines: end ? [] : klines } }; }, trimite: async (u, corp) => { scrise.push(corp); return { ok: true }; } });
  assert.equal(r.monede, 5); assert.equal(scrise.length, 5); assert.ok(scrise[0].ingust && "propus" in scrise[0].ingust);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /INGUST_MS = 6 \* 3600000/); assert.match(col, /turaIngustModul\(/);
});
```

- [ ] **Step 2: Rulează** — Expected: FAIL (ruta întoarce eroare / modulul lipsește).

- [ ] **Step 3: Implementează**
  - `istoric-bot.js`:
    - GET (lângă `profil`): `if(action==="ingust"){const s=simbolKv(u.searchParams.get("simbol"));if(!s)return json({error:"Lipseste simbol"},400);let v=null;try{v=JSON.parse(await env.ISTORIC.get("ingust:"+s)||"null")}catch{v=null}return json({simbol:s,ingust:v})}`
    - POST (lângă `profil`): 
      ```js
      // v100.58: gridul ingust al unei monede sugerate (colectorul, la 6 h) - doar campurile cunoscute
      if(action==="ingust"){
        const s=simbolKv(corp&&corp.simbol),x=corp&&corp.ingust;if(!s||!x||typeof x!=="object")return json({error:"Lipseste simbol sau ingust"},400);
        const st=x.setare&&typeof x.setare==="object"?x.setare:null,t=x.test&&typeof x.test==="object"?x.test:{};
        const out={propus:x.propus===true,motiv:String(x.motiv||"").slice(0,240),dir:["long","short","neutru"].includes(x.dir)?x.dir:null,H:nr(x.H),ore:nr(x.ore),latime:nr(x.latime),pas:nr(x.pas),la:nr(x.la)||Date.now(),zile:nr(x.zile),
          setare:st?{dir:["long","short","neutru"].includes(st.dir)?st.dir:null,pret:nr(st.pret),jos:nr(st.jos),sus:nr(st.sus),grile:nr(st.grile),pas:nr(st.pas),levier:nr(st.levier),levierSigur:nr(st.levierSigur),pesteSigur:st.pesteSigur===true,lichidare:nr(st.lichidare),stop:st.stop&&typeof st.stop==="object"?{jos:nr(st.stop.jos),sus:nr(st.stop.sus)}:null,suma:nr(st.suma)}:null,
          test:{n:nr(t.n),nIndep:nr(t.nIndep),mediana:nr(t.mediana),pePlus:nr(t.pePlus),ic:Array.isArray(t.ic)?t.ic.slice(0,2).map(nr):null,celMaiRau:nr(t.celMaiRau),perechiZi:nr(t.perechiZi),lichidari:nr(t.lichidari)}};
        await env.ISTORIC.put("ingust:"+s,JSON.stringify(out));return json({ok:true});
      }
      ```
  - `scripts/lib/tura-ingust.mjs`:
    ```js
    // v100.58 (el, 01.10): gridul ingust pe monedele sugerate - colectorul, la 6 h. deps: { clasament, Idei, GridProba, GridCalcul,
    // cere(simbol, end) -> klines Pionex 15M (500), trimite(url, corp), pauza(ms), jurnal, pagini? (12 = ~62 de zile), pauzaMs? }
    export async function turaIngust(d) {
      const pagini = d.pagini > 0 ? d.pagini : 12, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs;
      const l = d.Idei.ideiBoti(d.clasament, [], 5);
      let monede = 0, propuse = 0;
      for (const x of l) {
        let r15 = [], end = null;
        try {
          for (let p = 0; p < pagini; p++) {
            const k = await d.cere(x.simbol, end), r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
            if (!r || !r.length) break;
            r15 = r15.concat(r);
            const t = r.map((y) => Number(y && y.time)).filter(Number.isFinite);
            if (r.length < 500 || !t.length) break;
            end = Math.min(...t) - 1; if (pauzaMs) await d.pauza(pauzaMs);
          }
          const b = d.GridCalcul.bare(r15);
          const ing = d.GridProba.ingust(b, { dir: x.dir, miscare: !!(x.regim && x.regim.miscare), pret: b.length ? b[b.length - 1].c : null, suma: 100 });
          await d.trimite("/api/istoric-bot?action=ingust", { simbol: x.simbol, ingust: { ...ing, la: Date.now(), zile: Math.round(b.length / 96) } });
          monede++; if (ing.propus) propuse++;
        } catch (e) { d.jurnal("ingust " + x.simbol, e.message); }
      }
      d.jurnal("ingust: " + monede + " monede sugerate, " + propuse + " cu grid ingust propus");
      return { monede, propuse };
    }
    ```
    (`GridCalcul.bare` sortează și curăță rândurile; `pret` = ultima închidere — pagina reconstruiește setarea pe prețul viu, vezi Task 3.)
  - `colector.mjs`:
    - import: `import { turaIngust as turaIngustModul } from "./lib/tura-ingust.mjs";`
    - lângă `turaLaborator`:
      ```js
      // v101.38 (el, 01.10): gridul ingust pe <= 5 monede sugerate, cu 60 de zile de 15M - la 6 h, niciodata peste clasament/laborator
      const INGUST_MS = 6 * 3600000;
      let ingustLa = Number(ritm.ingust) || 0, ingustInLucru = false;
      async function turaIngust() {
        if (process.env.COLECTOR_FARA_INGUST || ingustInLucru || clasamentInLucru || laboratorInLucru || Date.now() - ingustLa < INGUST_MS) return;
        ingustInLucru = true;
        try {
          const cl = await cere("/api/istoric-bot?action=clasament");
          const r = await turaIngustModul({ clasament: cl && cl.clasament, Idei, GridProba, GridCalcul, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)),
            cere: (simbol, end) => cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=15M&limit=500" + (end ? "&endTime=" + end : "")), trimite });
          ingustLa = Date.now(); tineRitm("ingust", ingustLa);
        } catch (e) { jurnal("ingust ESEC", e.message); ingustLa = Date.now() - INGUST_MS + 30 * 60000; }
        ingustInLucru = false;
      }
      ```
    - chemarea: unde e chemată `turaLaborator()` în bucla turelor (fire-and-forget, ca ea), adaugă `turaIngust().catch((e) => jurnal("ingust", e.message));` (verifică cu grep forma exactă a chemării lui `turaLaborator` și copiaz-o).

- [ ] **Step 4: Rulează** — proba 8/8; `npm test` verde (`node --check scripts/colector.mjs` trece).

- [ ] **Step 5: Commit** — `npm test && git add functions/api/istoric-bot.js scripts/lib/tura-ingust.mjs scripts/colector.mjs scripts/proba-v10058.mjs && git commit -m "feat(grid): colectorul calculeaza gridul ingust pe monedele sugerate (60 de zile, la 6 h) + ruta ingust"`

---

### Task 3: Pagina — rândul în idei și blocul în fișă

**Files:**
- Modify: `public/lib/t212-ecran.js` (`tbIdeiRender` ~339: rândul ⚡ sub fiecare monedă; `tbIngustPt(simbol)` aduce din rută cu cache de 10 min)
- Modify: `public/app.js` (calculul fișei ~4924: `f.ingustLocal`; `renderGrid` ~5458: `h+=grIngustHtml(f)`; funcția nouă `grIngustHtml` lângă `grRand` ~4994; `grIngust` cache)
- Test: `scripts/proba-v10058.mjs`

**Interfaces:**
- Consumes: ruta `ingust` (Task 2), `GridProba.ingust/rezumatIngust` (Task 1), `grRand(et, val, copiat)`, `grPret(p, i)`, `GR_DIR_PIONEX`.
- Produces: `GridProba.varstaIngust(ing, acum)` → `{ore, vechi: ore > 12, text}` (pură, în `grid-proba.js`) pentru eticheta „calculat acum N h / vechi”.

- [ ] **Step 1: Test (picând)**:

```js
await test("pagina: rândul ⚡ în idei, blocul „Varianta îngustă” în fișă (din colector, altfel calcul local pe ~31 de zile), eticheta de vârstă", () => {
  are(GP.varstaIngust, "GridProba.varstaIngust");
  const H = 3600000;
  assert.equal(GP.varstaIngust({ la: 0 }, 2 * H).vechi, false); assert.match(GP.varstaIngust({ la: 0 }, 2 * H).text, /acum 2 h/);
  assert.equal(GP.varstaIngust({ la: 0 }, 13 * H).vechi, true); assert.match(GP.varstaIngust({ la: 0 }, 13 * H).text, /vechi/);
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.match(e, /function tbIngustPt\(/); assert.match(e, /GridProba\.rezumatIngust\(/); assert.match(e, /action=ingust&simbol=/);
  const a = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(a, /function grIngustHtml\(/); assert.match(a, /h\+=grIngustHtml\(f\)/); assert.match(a, /ingustLocal=GridProba\.ingust\(/);
  assert.match(a, /Varianta îngustă/); assert.match(a, /închide-l după/); assert.match(a, /pe 31 de zile — mai puține ferestre/);
});
```

- [ ] **Step 2: Rulează** — Expected: FAIL „lipseste GridProba.varstaIngust”.

- [ ] **Step 3: Implementează**
  - `grid-proba.js` (lângă `rezumatIngust`; în export):
    ```js
    function varstaIngust(r, acum) {
      var la = r && r.la, ore = la > 0 || la === 0 ? Math.max(0, Math.round(((acum || Date.now()) - la) / 3600000)) : null;
      return { ore: ore, vechi: ore !== null && ore > 12, text: ore === null ? "" : ore > 12 ? "calculat acum " + ore + " h — vechi, colectorul îl reface la 6 h" : "calculat acum " + ore + " h" };
    }
    ```
  - `t212-ecran.js`:
    ```js
    // v100.58: gridul ingust al monedelor sugerate (colectorul, la 6 h) - adus o data la 10 min pe moneda
    var tbIngust = {};
    function tbIngustPt(simbol) {
      var c = tbIngust[simbol];
      if (!c || (!c.inLucru && Date.now() - c.la > 10 * 60000)) {
        tbIngust[simbol] = { la: Date.now(), v: c ? c.v : null, inLucru: true };
        getJSON("/api/istoric-bot?action=ingust&simbol=" + encodeURIComponent(simbol)).then(function (d) { tbIngust[simbol] = { la: Date.now(), v: d && d.ingust || null, inLucru: false }; tbIdeiRender(); })
          .catch(function () { tbIngust[simbol].inLucru = false; });
      }
      return tbIngust[simbol] && tbIngust[simbol].v;
    }
    ```
    În `tbIdeiRender`, în rândul fiecărei idei, după textul existent cu istoricul (în același `<div>` cu detaliile), adaugă:
    `+ (function () { var g = typeof GridProba !== "undefined" ? tbIngustPt(x.simbol) : null; if (!g) return ''; var v = GridProba.varstaIngust(g, Date.now()); return '<p class="tbSub' + (g.propus ? '' : ' t212Estompat') + '">' + escapeHtml(GridProba.rezumatIngust(g)) + (v.text ? ' · ' + escapeHtml(v.text) : '') + '</p>'; })()`
    (citește întâi structura rândului din `tbIdeiRender` cu `sed -n 339,360p` și pune paragraful înainte de butonul rândului, în coloana de text).
  - `app.js`:
    - în calculul fișei, după `if(f.eroare){...}else{f.info=info||null;grStare.fisa=f}`: `if(!f.eroare){try{f.ingustLocal=GridProba.ingust(GridCalcul.bare(d.r15),{dir:f.dir,miscare:!!(f.regim&&f.regim.miscare),pret:f.pret,suma:suma,levier:lev?Math.round(lev):null})}catch(e){f.ingustLocal=null}}`
    - cache + funcție (lângă `grRand`):
      ```js
      // v100.58 (el, 01.10): varianta INGUSTA - din colector (60 de zile, monedele sugerate), altfel calculata aici pe ~31 de zile
      var grIngust={};
      function grIngustPt(s){var c=grIngust[s];if(!c||(!c.inLucru&&Date.now()-c.la>10*60000)){grIngust[s]={la:Date.now(),v:c?c.v:null,inLucru:true};getJSON("/api/istoric-bot?action=ingust&simbol="+encodeURIComponent(s)).then(function(d){grIngust[s]={la:Date.now(),v:d&&d.ingust||null,inLucru:false};renderGrid()}).catch(function(){grIngust[s].inLucru=false})}return grIngust[s]&&grIngust[s].v}
      function grIngustHtml(f){
        var g=grIngustPt(f.simbol),loc=!g,r=g||f.ingustLocal;if(!r)return "";
        var i=f.info,v=GridProba.varstaIngust(r,Date.now()),st=r.setare,P=function(x){return (x>=0?"+":"−")+Math.abs(x*100).toFixed(1).replace(".",",")+" %"};
        var h='<div class="tbBloc"><div class="tbBlocCap"><h4>⚡ Varianta îngustă</h4><span class="tbSub">'+escapeHtml(loc?"pe 31 de zile — mai puține ferestre":v.text)+'</span></div>';
        if(!r.propus||!st)return h+'<p class="tbSub">Nu o propun: '+escapeHtml(r.motiv||"nedovedită")+'. Rămâi la setările de mai sus.</p></div>';
        // setarea se reconstruieste pe pretul de ACUM (colectorul a calculat-o pe pretul de atunci)
        var s2=GridCalcul.construieste({pret:f.pret,lat:r.latime,pas:r.pas,dir:r.dir,suma:st.suma||f.setare.suma});
        return h+grRand("Direcție",GR_DIR_PIONEX[r.dir],GR_DIR_PIONEX[r.dir])+grRand("Preț de jos",grPret(s2.jos,i),grPret(s2.jos,i))+grRand("Preț de sus",grPret(s2.sus,i),grPret(s2.sus,i))
          +grRand("Număr de grile",(s2.grile+1)+" linii (Pionex numără liniile) · Geometric",String(s2.grile+1))+grRand("Levier",s2.levierSigur+"× (sigur)",String(s2.levierSigur))
          +(r.dir!=="short"?grRand("Stop-loss jos",grPret(s2.stop.jos,i),grPret(s2.stop.jos,i)):"")+(r.dir!=="long"?grRand("Stop-loss sus",grPret(s2.stop.sus,i),grPret(s2.stop.sus,i)):"")
          +'<p class="tbSub">⏱️ Închide-l după '+r.ore+' h dacă n-a atins stopul — așa a fost probat.</p>'
          +'<p class="tbSub">Pe test ('+r.test.nIndep+' ferestre independente, nevăzute la alegere): median '+P(r.test.mediana)+' din sumă, '+Math.round(r.test.pePlus*100)+' % pe plus, cel mai rău '+P(r.test.celMaiRau)+', ~'+Math.round(r.test.perechiZi)+' perechi/zi. Ce s-a întâmplat, nu o promisiune.</p></div>';
      }
      ```
    - în `renderGrid`, după linia `+'</div></div>'+grTvAvertHtml(f.simbol,st);   // v100.37`: `h+=grIngustHtml(f);   // v100.58`

- [ ] **Step 4: Rulează** — proba 9/9; `npm test` verde.

- [ ] **Step 5: Commit** — `npm test && git add public/lib/grid-proba.js public/lib/t212-ecran.js public/app.js scripts/proba-v10058.mjs && git commit -m "feat(grid): gridul ingust in ideile de boti si in fisa (din colector, altfel local)"`

---

### Task 4: Versiunea, ecranul, rularea pe date reale, revizia, livrarea

- [ ] **Step 1:** Bump: `BUILD_INFO.json` (v100.58 · „GRIDURI ÎNGUSTE”), `functions/_shared/versiune.js`, `package.json` (100.58.0), `public/sw.js` (`crypto-radar-v100-58`), `public/index.html` (cele 4 locuri), `scripts/colector.mjs` (`VERSIUNE_COLECTOR = "v101.38"`).
- [ ] **Step 2:** `npm test` verde; proba de ecran a gridului (`scripts/proba-ecran-grid.mjs`) și a tabloului (`proba-ecran-tablou.mjs`) trec; poze la 1920 și 390 px pe fișă (o monedă sugerată) și pe „Pe ce aș porni un bot acum”, privite.
- [ ] **Step 3:** Rulat o dată pe datele reale: colectorul repornit (PID nou + rândul „ingust: N monede sugerate, M cu grid ingust propus” în `data/colector.log`); ce a ieșit se spune lui, pe monede.
- [ ] **Step 4:** Revizie Opus nouă (plan + spec + Review Focus), reparații RED→GREEN.
- [ ] **Step 5:** `npm test && git commit && git push`, memo.
