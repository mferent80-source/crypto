# Pachetul 1 — Profilul monedei + planul potrivit monedei (I-475) — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sfaturile de margine și de stop și planul pe minus se judecă după cât se mișcă FIECARE monedă (6 luni de bare de 1 h), cu sursa pragului scrisă lângă sfat.

**Architecture:** un modul pur nou `public/lib/profil-moneda.js` (distribuția mișcării pe 12 h și 24 h, ca 21 de cuantile) · colectorul aduce noaptea barele de 1 h pe disc și pune profilul în KV `profil:<SIMBOL>` · Tabloul, poarta și colectorul citesc profilul și îl dau mai departe ca praguri gata socotite (`SemnaleBot` nu depinde de modulul nou) · fără profil (pagina publicată, monedă nouă) totul rămâne pe pragurile fixe de azi și o spune.

**Tech Stack:** JS ES5 în `public/lib` (încărcat și în browser, și în colector prin `new Function`), Node ESM pentru colector și probe, Cloudflare Pages Functions + KV local `ISTORIC`.

**Spec:** `docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md` (secțiunile „Principiile” și „Pachetul 1”).

## Abateri de la spec (spuse dinainte)

- „Cât de des iese din grid”, „cât țin liniștile” și „viteza unei mișcări mari” din lista profilului sunt PROBABILITĂȚI (depind de grid și de starea de acum) ⇒ intră în planul pachetului 2, care citește aceleași bare de 1 h de pe disc.
- KV `ore:<SIMBOL>` nu se scrie: pagina nu are nevoie de bare, doar de profil (KV `profil:<SIMBOL>`); pachetul 2 îl adaugă dacă îl cere.

## Global Constraints

- Doar ce se știa atunci: profilul folosește doar barele ÎNCHEIATE (`GridCalcul.bare` scoate bara în formare; `calculeaza` mai taie tot ce e după `acum − 1 h`).
- Frecvență, nu predicție; lângă orice prag din profil se scrie sursa („profilul CRV: 183 de zile de bare de 1 h”).
- Lichidarea 8/15% și regulile planului lui NU se ating; poarta avertizează, nu blochează.
- Fără profil ⇒ comportamentul de azi, neschimbat (pragul fix 10% din interval, stopul fișei), cu sursa „prag fix”.
- Pauză 1,6 s între cererile de lumânări; serverul lasă 120 de citiri pe minut.
- Versiuni: aplicația `v100.45` (BUILD_INFO version + badge, package.json `100.45.0`, index.html: meta app-version, sideVersiune, antetVersiune, healthAppVersion; `sw.js` CACHE + `/lib/profil-moneda.js` în APP_SHELL; `functions/_shared/versiune.js`), colectorul `v101.26`.
- `npm test && git commit && git push` — niciodată `;` între ele. Fără `git pull` în `crypto` (lansatoarele rulează).
- Scrierea fișierelor: Edit/Write, nu heredoc în Bash (dezescapează backslash-urile).

## Review Focus

1. Grid mai îngust decât mișcarea obișnuită pe 12 h ⇒ prețul ar fi „lângă margine” mereu, pe ambele părți. Se așteaptă ca pragul să fie plafonat la 25% din interval, ca „mută gridul” să nu sune permanent pe gridurile dese (test în Task 4).
2. Monedă cu mai puțin de 30 de zile de bare (listată recent) ⇒ `calculeaza` întoarce `null` și sfatul rămâne pe pragul fix, fără cifre inventate (test în Task 1).
3. Gaură în lumânări (Pionex a sărit ore) ⇒ ferestrele cu gaură nu se numără, nu se socotesc ca o zi întreagă (test în Task 1).
4. Pagina publicată pe Cloudflare (fără KV) ⇒ `action=profil` dă 503 și Tabloul arată exact ce arăta înainte (test în Task 6, prin proba de ecran: niciun câmp pierdut).
5. Botul short ⇒ marginea de pierdere e SUS, stopul propus e peste preț, frecvența se citește pe urcări (test în Task 4 și Task 5).

---

### Task 1: Modulul pur `ProfilMoneda`

**Files:**
- Create: `public/lib/profil-moneda.js`
- Create: `scripts/proba-v10045.mjs`
- Modify: `package.json` (scriptul `test:v10045` + adăugat la capătul lanțului `test`)

**Interfaces:**
- Produces:
  - `ProfilMoneda.calculeaza(bare1h, {acum, simbol, trades}) → profil | null`; `profil = {v:1, simbol, la, deLa, panaLa, zile, z24:{jos:q21, sus:q21, n, nIndep}, z12:{…}, r30:{z24, z12}|null, boti:{n, pePlus, net, oreMediana}|null}`; `q21` = 21 de cuantile (0%, 5%, …, 100%) ale mișcării maxime față de deschiderea ferestrei, ca fracții.
  - `ProfilMoneda.frecventa(q21, dist) → 0..1 | null` (în câte ferestre mișcarea a ajuns cel puțin la `dist`).
  - `ProfilMoneda.prag(profil, "z12"|"z24", "jos"|"sus", 0.75) → fracție | null`.
  - `ProfilMoneda.sursa(profil) → string`.
  - `ProfilMoneda.praguriMargine(profil) → {jos, sus, sursa} | null` (P75 pe 12 h).
  - `ProfilMoneda.pragStop(profil, dir) → {dist, sursa} | null` (P75 pe 24 h, pe partea de pierdere).
  - `ProfilMoneda.planPeMoneda({profil, dir, dist, laDist}) → {frecventa, dist, distPropusa, sumaPropusa, avertizare, maiStrans, sursa, text} | null`.

- [ ] **Step 1: Scrie proba (picând)** — `scripts/proba-v10045.mjs`, cu capul la fel ca `proba-v10044.mjs` (RAD, `lib()`, `test()`):

```js
// Proba v100.45 (01.10, el: „sfaturile să fie adaptate și personalizate pentru fiecare monedă” + specul aprobat
// docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md, pachetul 1).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
let PM = null; try { PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)(); } catch { PM = null; }
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }); }
console.log("\nV100.45 · Profilul monedei + planul potrivit monedei (pachetul 1) · proba\n");
const ORA = 3600000, T0 = Date.UTC(2026, 3, 1);
// bare sintetice de 1 h: in fiecare zi pretul coboara de la 100 la 100*(1-a) in prima jumatate si revine (a = amplitudinea zilei)
function bareZile(amp, zile, gauraLa) {
  const v = [];
  for (let z = 0; z < zile; z++) for (let h = 0; h < 24; h++) {
    const t = T0 + (z * 24 + h) * ORA; if (gauraLa !== undefined && z === gauraLa && h === 5) continue;
    const a = amp[z % amp.length], jos = 100 * (1 - a * Math.min(h, 23 - h) / 11);   // la orele 11 si 12: toata amplitudinea
    v.push({ t, o: 100, h: 100.0001, l: jos, c: 100 });
  }
  return v;
}

await test("calculeaza: 40 de zile cu amplitudini cunoscute -> cuantilele pe 24 h le regasesc; doar barele incheiate", () => {
  assert.ok(PM && typeof PM.calculeaza === "function", "lipseste ProfilMoneda.calculeaza");
  const amp = [0.01, 0.02, 0.03, 0.04];   // in 3 din 4 zile coborarea e cel mult 3%
  const p = PM.calculeaza(bareZile(amp, 40), { acum: T0 + 40 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  assert.ok(p && p.z24 && p.z24.jos.length === 21);
  assert.ok(p.z24.jos[20] <= 0.0401 && p.z24.jos[20] >= 0.039, "maximul = 4%: " + p.z24.jos[20]);
  assert.ok(p.z24.n > 100, "pornire la fiecare 6 h"); assert.equal(p.z24.nIndep, Math.floor(p.z24.n * 6 / 24));
  assert.equal(p.zile, 40);
  const viitor = PM.calculeaza(bareZile(amp, 40), { acum: T0 + 20 * 24 * ORA, simbol: "X" });
  assert.ok(viitor === null || viitor.panaLa < T0 + 20 * 24 * ORA, "barele de dupa acum nu intra");
});

await test("calculeaza: sub 30 de zile -> null (fara cifre inventate)", () => {
  assert.equal(PM.calculeaza(bareZile([0.02], 25), { acum: T0 + 25 * 24 * ORA }), null);
});

await test("calculeaza: o ora lipsa -> ferestrele care o cuprind nu se numara", () => {
  const plin = PM.calculeaza(bareZile([0.02], 40), { acum: T0 + 40 * 24 * ORA }), gaura = PM.calculeaza(bareZile([0.02], 40, 10), { acum: T0 + 40 * 24 * ORA });
  assert.ok(gaura.z24.n < plin.z24.n, gaura.z24.n + " vs " + plin.z24.n);
});

// ferestrele pornesc la 0/6/12/18: 3 din 4 cuprind o singura zi, cea de la 12 cuprinde doua -> pe 16 ferestre: 1%:3, 2%:4, 3%:4, 4%:5
await test("frecventa si prag: pe 1%/2%/3%/4%, o coborare de 2,5% e atinsa in ~9 din 16 ferestre; P75 = 4%", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA });
  const f = PM.frecventa(p.z24.jos, 0.025); assert.ok(f > 0.45 && f < 0.7, "f=" + f);
  assert.equal(PM.frecventa(p.z24.jos, 0.5), 0); assert.equal(PM.frecventa(p.z24.jos, 0), 1);
  const q = PM.prag(p, "z24", "jos", 0.75); assert.ok(q >= 0.039 && q <= 0.0401, "P75=" + q);
});

await test("planPeMoneda: planul atins de o zi obisnuita in peste jumatate din zile -> avertizare + prag propus cu suma, si sursa scrisa", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const r = PM.planPeMoneda({ profil: p, dir: "long", dist: 0.012, laDist: (d) => -1000 * d });
  assert.ok(r.avertizare && r.frecventa > 0.5); assert.ok(r.maiStrans);
  assert.ok(Math.abs(r.sumaPropusa + 1000 * r.distPropusa) < 1e-9);
  assert.match(r.text, /în \d+% din zile/); assert.match(r.text, /1 zi din 4/); assert.match(r.text, /profilul CRV/);
  const s = PM.planPeMoneda({ profil: p, dir: "short", dist: 0.012, laDist: (d) => -1000 * d });
  assert.ok(s.frecventa < 0.05, "short se citeste pe URCARI (aici aproape zero): " + s.frecventa);
  assert.equal(PM.planPeMoneda({ profil: null, dir: "long", dist: 0.01 }), null);
});

await test("praguriMargine / pragStop: P75 pe 12 h si pe 24 h; fara profil -> null", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const m = PM.praguriMargine(p); assert.ok(m.jos > 0 && m.sus >= 0); assert.match(m.sursa, /profilul CRV/);
  const s = PM.pragStop(p, "long"); assert.ok(Math.abs(s.dist - PM.prag(p, "z24", "jos", 0.75)) < 1e-12);
  assert.equal(PM.praguriMargine(null), null); assert.equal(PM.pragStop(p, "neutru"), null);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
```

- [ ] **Step 2: Rulează proba și vezi-o picând**

Run: `node scripts/proba-v10045.mjs`
Expected: `PICA calculeaza: … lipseste ProfilMoneda.calculeaza` (și restul picând), ieșire 1.

- [ ] **Step 3: Scrie modulul** — `public/lib/profil-moneda.js`:

```js
// Profilul monedei (v100.45, pachetul 1, 01.10 - el: „sfaturile să fie adaptate și personalizate pentru fiecare monedă”).
// Modul pur (fara DOM, fara retea), probat in scripts/proba-v10045.mjs. Intrare: barele de 1 ORA ale monedei (6 luni, aduse
// noaptea de colector). Iese: cat se misca moneda intr-o zi (24 h) si intr-o jumatate de zi (12 h) OBISNUITA, ca distributie
// (21 de cuantile ale miscarii maxime fata de deschiderea ferestrei), pe toata perioada si pe ultimele 30 de zile.
// Ferestrele pornesc la fiecare 6 h; nIndep = cate ferestre NU se suprapun (pentru intervalele de incredere din pachetul 2).
// Pragurile sfaturilor (marginea, stopul, planul) se citesc din distributie; langa fiecare sfat se scrie de unde vine pragul.
var ProfilMoneda = (function () {
  "use strict";
  var ORA = 3600000, MIN_ZILE = 30, PAS_ORE = 6;
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // ferestre de `ore` ore fara gauri; in fiecare, cat a coborat / urcat cel mult fata de deschidere (fractie)
  function excursii(bare, ore) {
    var jos = [], sus = [];
    for (var s = 0; s + ore <= bare.length; s += PAS_ORE) {
      if (bare[s + ore - 1].t - bare[s].t !== (ore - 1) * ORA) continue;
      var o = bare[s].o, lo = Infinity, hi = -Infinity;
      for (var i = s; i < s + ore; i++) { if (bare[i].l < lo) lo = bare[i].l; if (bare[i].h > hi) hi = bare[i].h; }
      jos.push(Math.max(0, 1 - lo / o)); sus.push(Math.max(0, hi / o - 1));
    }
    return { jos: jos, sus: sus };
  }
  function cuantile(v) {
    var a = v.slice().sort(function (x, y) { return x - y; }), q = [];
    for (var k = 0; k <= 20; k++) { var p = k / 20 * (a.length - 1), i = Math.floor(p), f = p - i; q.push(i + 1 < a.length ? a[i] + (a[i + 1] - a[i]) * f : a[i]); }
    return q.map(function (x) { return Math.round(x * 1e6) / 1e6; });
  }
  function distributie(bare, ore) {
    var e = excursii(bare, ore);
    if (!e.jos.length) return null;
    return { jos: cuantile(e.jos), sus: cuantile(e.sus), n: e.jos.length, nIndep: Math.floor(e.jos.length * PAS_ORE / ore) };
  }
  function botiPeMoneda(trades) {
    var l = (Array.isArray(trades) ? trades : []).map(function (t) { return { v: nr(t && t.net) !== null ? nr(t.net) : nr(t && t.rezultat), ore: nr(t && t.durataOre) }; }).filter(function (x) { return x.v !== null; });
    if (!l.length) return null;
    var ore = l.map(function (x) { return x.ore; }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
    return { n: l.length, pePlus: l.filter(function (x) { return x.v > 0; }).length, net: Math.round(l.reduce(function (s, x) { return s + x.v; }, 0) * 100) / 100, oreMediana: ore.length ? ore[Math.floor(ore.length / 2)] : null };
  }
  function calculeaza(bare, o) {
    o = o || {};
    var acum = nr(o.acum) || Date.now();
    var b = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && x.t + ORA <= acum; }).sort(function (a, c) { return a.t - c.t; });
    if (b.length < MIN_ZILE * 24) return null;
    var r30 = b.filter(function (x) { return x.t >= acum - 30 * 24 * ORA; });
    return { v: 1, simbol: String(o.simbol || ""), la: acum, deLa: b[0].t, panaLa: b[b.length - 1].t, zile: Math.round((b[b.length - 1].t - b[0].t) / (24 * ORA)),
      z24: distributie(b, 24), z12: distributie(b, 12), r30: r30.length >= 20 * 24 ? { z24: distributie(r30, 24), z12: distributie(r30, 12) } : null, boti: botiPeMoneda(o.trades) };
  }
  // in cate ferestre miscarea a ajuns cel putin la dist (citit pe cuantile, liniar intre ele)
  function frecventa(q, dist) {
    var d = nr(dist);
    if (!Array.isArray(q) || q.length !== 21 || d === null) return null;
    if (d <= q[0]) return 1;
    if (d > q[20]) return 0;
    for (var k = 0; k < 20; k++) if (d <= q[k + 1]) { var w = q[k + 1] - q[k], f = w > 0 ? (d - q[k]) / w : 1; return Math.round((1 - (k + f) / 20) * 1000) / 1000; }
    return 0;
  }
  function prag(p, fer, parte, cu) {
    var q = p && p[fer] && p[fer][parte];
    if (!Array.isArray(q) || q.length !== 21) return null;
    var x = Math.max(0, Math.min(1, nr(cu) === null ? 0.75 : cu)) * 20, i = Math.floor(x);
    return i >= 20 ? q[20] : q[i] + (q[i + 1] - q[i]) * (x - i);
  }
  function moneda(s) { return String(s || "").toUpperCase().replace(/_USDT(_PERP)?$/, "").replace(/\.PERP$/, ""); }
  function sursa(p) { return p ? "profilul " + (moneda(p.simbol) || "monedei") + ": " + p.zile + " de zile de bare de 1 h" : "prag fix (profilul monedei n-a venit încă de la colector)"; }
  function praguriMargine(p) {
    var j = prag(p, "z12", "jos", 0.75), s = prag(p, "z12", "sus", 0.75);
    return j === null || s === null ? null : { jos: j, sus: s, sursa: sursa(p) };
  }
  function pragStop(p, dir) {
    if (dir !== "long" && dir !== "short") return null;
    var d = prag(p, "z24", dir === "long" ? "jos" : "sus", 0.75);
    return d === null ? null : { dist: d, sursa: sursa(p) };
  }
  var PR = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
  // I-475: planul pe minus potrivit monedei. dist = cat trebuie sa mearga pretul impotriva botului ca planul sa fie atins;
  // laDist(d) = totalul botului daca pretul merge d impotriva lui. Prag propus = atins in cel mult 1 zi din 4 (P75 pe 24 h).
  function planPeMoneda(o) {
    var p = o && o.profil, dir = o && o.dir, d = nr(o && o.dist);
    if (!p || (dir !== "long" && dir !== "short") || !(d > 0)) return null;
    var parte = dir === "long" ? "jos" : "sus", f = frecventa(p.z24 && p.z24[parte], d), dp = prag(p, "z24", parte, 0.75);
    if (f === null || dp === null) return null;
    var suma = typeof o.laDist === "function" ? nr(o.laDist(dp)) : null, semn = dir === "long" ? "−" : "+";
    var text = "O zi obișnuită a monedei ajunge la planul tău (" + semn + PR(d) + " de preț) în " + Math.round(f * 100) + "% din zile"
      + (d < dp ? ". Pentru cel mult 1 zi din 4: " + semn + PR(dp) + " de preț" + (suma !== null ? " ≈ " + U(suma) : "") : " — mai rar de 1 zi din 4, planul încape")
      + " (" + sursa(p) + ").";
    return { frecventa: f, dist: d, distPropusa: dp, sumaPropusa: suma, avertizare: f > 0.5, maiStrans: d < dp, sursa: sursa(p), text: text };
  }
  return { calculeaza: calculeaza, frecventa: frecventa, prag: prag, sursa: sursa, moneda: moneda, praguriMargine: praguriMargine, pragStop: pragStop, planPeMoneda: planPeMoneda };
})();
```

- [ ] **Step 4: Rulează proba**

Run: `node scripts/proba-v10045.mjs`
Expected: `6/6 trecute`, ieșire 0. Dacă `frecventa`/`prag` nu cad în intervale, corectează CODUL (nu intervalele din probă): sunt alese din geometria barelor sintetice.

- [ ] **Step 5: Leagă proba în `npm test`** — în `package.json`: `"test:v10045": "node scripts/proba-v10045.mjs"` și `&& npm run test:v10045` la capătul lui `scripts.test`. Rulează `npm run test:v10045`. Fără commit încă (versiunea se urcă o singură dată, în Task 6).

---

### Task 2: Ruta `action=profil` pe serverul de acasă

**Files:**
- Modify: `functions/api/istoric-bot.js` (GET lângă `action==="socoteala"`, linia ~49; POST lângă `action==="socoteala"`, linia ~202)
- Test: `scripts/proba-v10045.mjs`

**Interfaces:**
- Produces: `GET /api/istoric-bot?action=profil&simbol=CRV_USDT_PERP → {simbol, profil|null}`; `POST /api/istoric-bot?action=profil` cu `{simbol, profil}` → `{ok:true}`; KV `profil:<SIMBOL>`. Simbolul se curăță cu `simbolKv` (litere mari, cifre, `_`, cel mult 40).

- [ ] **Step 1: Adaugă testul (picând)** în `proba-v10045.mjs`, înaintea liniei cu `console.log(\`\n${teste - picate}…`:

```js
await test("server: profilul se scrie si se citeste in KV „profil:<SIMBOL>”; forma stricata -> 400; simbolul curatat", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.has(k) ? kv.get(k) : null, put: async (k, v) => { kv.set(k, v); }, list: async () => ({ keys: [] }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const r = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "crv_usdt_perp<x>", profil: p }), env });
  assert.equal(r.status, 200, await r.clone().text());
  assert.ok(kv.has("profil:CRV_USDT_PERPX"));
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=profil&simbol=CRV_USDT_PERPX"), env })).json();
  assert.deepEqual(g.profil.z24.jos, p.z24.jos); assert.equal(g.profil.zile, p.zile);
  const rau = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "CRV_USDT_PERP", profil: { z24: { jos: [1, 2] } } }), env });
  assert.equal(rau.status, 400);
});
```

- [ ] **Step 2: Rulează** `node scripts/proba-v10045.mjs` — Expected: noul test PICĂ (ruta nu există: status ≠ 200).

- [ ] **Step 3: Scrie ruta.** Sus, lângă `idBot`:

```js
const simbolKv=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9_]/g,"").slice(0,40);
// v100.45 (pachetul 1): profilul monedei - 21 de cuantile pe 24 h si 12 h (jos/sus), toate si pe ultimele 30 de zile
const q21=a=>Array.isArray(a)&&a.length===21&&a.every(x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=5)?a.slice():null;
function curataDistributie(d){if(!d||typeof d!=="object")return null;const jos=q21(d.jos),sus=q21(d.sus);return jos&&sus?{jos,sus,n:nr(d.n),nIndep:nr(d.nIndep)}:null}
```

În GET, după linia `action==="socoteala"`:

```js
  if(action==="profil"){const s=simbolKv(u.searchParams.get("simbol"));if(!s)return json({error:"Lipseste simbol"},400);let p=null;try{p=JSON.parse(await env.ISTORIC.get("profil:"+s)||"null")}catch{p=null}return json({simbol:s,profil:p})}
```

În POST, înainte de `if(action==="socoteala"){`:

```js
  // v100.45 (pachetul 1): profilul monedei (colectorul, noaptea) -> KV profil:<SIMBOL>
  if(action==="profil"){
    const s=simbolKv(corp&&corp.simbol),p=corp&&corp.profil;if(!s||!p||typeof p!=="object")return json({error:"Lipseste simbol sau profil"},400);
    const z24=curataDistributie(p.z24),z12=curataDistributie(p.z12);if(!z24||!z12)return json({error:"profil fara distributii valide"},400);
    const r30=p.r30&&typeof p.r30==="object"?{z24:curataDistributie(p.r30.z24),z12:curataDistributie(p.r30.z12)}:null;
    const bo=p.boti&&typeof p.boti==="object"?{n:nr(p.boti.n),pePlus:nr(p.boti.pePlus),net:nr(p.boti.net),oreMediana:nr(p.boti.oreMediana)}:null;
    const out={v:1,simbol:typeof p.simbol==="string"?p.simbol.slice(0,40):s,la:nr(p.la)||Date.now(),deLa:nr(p.deLa),panaLa:nr(p.panaLa),zile:nr(p.zile),z24,z12,r30:r30&&r30.z24&&r30.z12?r30:null,boti:bo};
    await env.ISTORIC.put("profil:"+s,JSON.stringify(out));
    return json({ok:true});
  }
```

- [ ] **Step 4: Rulează** `node scripts/proba-v10045.mjs` — Expected: `7/7 trecute`. Dacă POST-ul dă 403, vezi ce cere `sameOrigin` în `functions/_shared/auth.js` și potrivește antetul `origin` din TEST, nu verificarea din server.

---

### Task 3: Colectorul aduce barele de 1 h și face profilul (noaptea)

**Files:**
- Create: `scripts/lib/tura-profil.mjs`
- Modify: `scripts/colector.mjs` (încarcă `ProfilMoneda`; `simboluriProfil()`; `turaProfil` în `bucla()`; `VERSIUNE_COLECTOR = "v101.26"`; cache `profile` pentru Task 4)
- Test: `scripts/proba-v10045.mjs`

**Interfaces:**
- Consumes: `ProfilMoneda.calculeaza` (Task 1), `POST action=profil` (Task 2), `GridCalcul.imbinaRanduri`, `GridCalcul.bare`, `JurnalTrade.din`, `JurnalTrade.moneda`, `TabloBot.simboluri`, `simbolPerp`, `botiInchisiToti`.
- Produces: `eNoapte(t)`, `aduOre(simbol, vechi, d)`, `turaProfil(d)` (export din `tura-profil.mjs`); fișierele `data/istoric-1h/<SIMBOL>.json`, `data/profil-stare.json`; în colector `profileMoneda` (Map simbol → profil), citit de Task 4.

- [ ] **Step 1: Adaugă testele (picând)** în `proba-v10045.mjs`:

```js
let TP = null; try { TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-profil.mjs")).href); } catch { TP = null; }
const kline = (t) => ({ time: t, open: "100", high: "101", low: "99", close: "100", volume: "1" });
function pionexFals(pana, de) {   // raspunde ca Pionex: cele mai noi 500 de bare de 1 h <= endTime, de la `de` incoace
  const cereri = [];
  return { cereri, cere: async (cale) => {
    cereri.push(cale); const m = /endTime=(\d+)/.exec(cale), end = m ? Number(m[1]) : pana, out = [];
    for (let t = Math.floor(end / ORA) * ORA; t >= de && out.length < 500; t -= ORA) out.push(kline(t));
    return { result: true, data: { klines: out } };
  } };
}
await test("colector: prima data aduce 6 luni pe pagini (cu pauza), a doua oara doar ce lipseste", async () => {
  assert.ok(TP && typeof TP.aduOre === "function", "lipseste scripts/lib/tura-profil.mjs");
  const acum = T0 + 200 * 24 * ORA, p = pionexFals(acum, T0), pauze = [];
  const d = { cere: p.cere, GridCalcul: G, acum, pauza: async (ms) => { pauze.push(ms); } };
  const r = await TP.aduOre("CRV_USDT_PERP", [], d);
  assert.ok(r.length >= 183 * 24 && p.cereri.length >= 9 && p.cereri.length <= 10, r.length + " bare, " + p.cereri.length + " cereri");
  assert.ok(p.cereri.every((c) => /interval=60M/.test(c))); assert.ok(pauze.every((ms) => ms >= 1600));
  const p2 = pionexFals(acum + 5 * ORA, T0);
  const r2 = await TP.aduOre("CRV_USDT_PERP", r, { ...d, cere: p2.cere, acum: acum + 5 * ORA });
  assert.equal(p2.cereri.length, 1, "doar pagina cea noua"); assert.ok(r2.length >= r.length);
});
await test("colector: noaptea (02-05 ora Romaniei) o data pe zi; moneda fara profil se face oricand", async () => {
  const zi = Date.UTC(2026, 9, 1), noapte = zi + 0 * ORA + 30 * 60000, amiaza = zi + 10 * ORA;   // 03:30 si 13:00 ora Romaniei (UTC+3)
  assert.equal(TP.eNoapte(noapte), true); assert.equal(TP.eNoapte(amiaza), false);
  const scrise = [], stare = { facute: {} }, mk = (acum) => ({ GridCalcul: G, ProfilMoneda: PM, acum, pauza: async () => {},
    cere: pionexFals(acum, acum - 60 * 24 * ORA).cere, trimite: async (cale, corp) => { scrise.push(corp.simbol); return { ok: true }; },
    simboluri: async () => [{ simbol: "CRV_USDT_PERP", moneda: "CRV" }], trades: async () => [], citesteBare: () => [], scrieBare: () => {},
    stare, scrieStare: () => {}, jurnal: () => {}, profile: new Map() });
  await TP.turaProfil(mk(amiaza)); assert.deepEqual(scrise, ["CRV_USDT_PERP"], "fara profil: se face si la amiaza");
  await TP.turaProfil(mk(amiaza + ORA)); assert.equal(scrise.length, 1, "are profil: asteapta noaptea");
  await TP.turaProfil(mk(noapte + 24 * ORA)); assert.equal(scrise.length, 2, "noaptea urmatoare: se reface");
  await TP.turaProfil(mk(noapte + 25 * ORA)); assert.equal(scrise.length, 2, "o singura data pe noapte");
});
```

- [ ] **Step 2: Rulează** `node scripts/proba-v10045.mjs` — Expected: cele două teste noi PICĂ („lipseste scripts/lib/tura-profil.mjs”).

- [ ] **Step 3: Scrie `scripts/lib/tura-profil.mjs`:**

```js
// v101.26 (pachetul 1, 01.10): PROFILUL MONEDEI. Noaptea (02:00-05:00 ora Romaniei), o data pe zi: pentru monedele botilor din
// ultimele 60 de zile + cei activi, barele de 1 ORA pe 6 luni (prima data ~9 pagini de 500, apoi doar pagina noua) pe disc,
// profilul (ProfilMoneda.calculeaza) in KV profil:<SIMBOL>. Moneda fara profil (bot nou) nu asteapta noaptea: se face la prima
// tura. Pauza 1,6 s intre cereri (serverul lasa 120 de citiri pe minut).
export const ZILE = 183, PAS_MS = 1600, PAGINA = 500, ORA = 3600000;
const tBara = (r) => Number(Array.isArray(r) ? r[0] : r && r.time);
export function eNoapte(t) {
  const o = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
  return o >= 2 && o < 5;
}
const ziRo = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
export async function aduOre(simbol, vechi, d) {
  const deLa = d.acum - ZILE * 24 * ORA;
  // ce e pe disc se pastreaza doar daca ajunge inapoi pana la 6 luni (altfel o umplere intrerupta ar ramane cu gaura)
  let randuri = Array.isArray(vechi) && vechi.length && tBara(vechi[0]) <= deLa + 24 * ORA ? vechi : [];
  const ultima = randuri.length ? tBara(randuri[randuri.length - 1]) : null;
  let end = null;
  for (let p = 0; p < 12; p++) {
    if (p) await d.pauza(PAS_MS);
    const k = await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=60M&limit=" + PAGINA + (end ? "&endTime=" + end : ""));
    const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r) throw new Error((k && (k.error || k.message)) || "fara lumanari 60M");
    randuri = d.GridCalcul.imbinaRanduri(randuri, r, ZILE * 24 + 48);
    const t = r.map(tBara).filter(Number.isFinite);
    if (!t.length || r.length < PAGINA) break;
    const cea = Math.min(...t);
    if (cea <= deLa || (ultima !== null && cea <= ultima)) break;
    end = cea - 1;
  }
  return randuri;
}
export async function turaProfil(d) {
  const noapte = eNoapte(d.acum), azi = ziRo(d.acum), st = d.stare;
  st.facute = st.facute || {};
  for (const { simbol, moneda } of await d.simboluri()) {
    const f = st.facute[simbol];
    if (f && !(noapte && f.zi !== azi)) { if (f.profil && !d.profile.has(simbol)) d.profile.set(simbol, f.profil); continue; }
    try {
      if (f) await d.pauza(PAS_MS);
      const randuri = await aduOre(simbol, d.citesteBare(simbol), d);
      d.scrieBare(simbol, randuri);
      const trades = (await d.trades()).filter((t) => t.moneda === moneda);
      const profil = d.ProfilMoneda.calculeaza(d.GridCalcul.bare(randuri), { acum: d.acum, simbol, trades });
      if (profil) { await d.trimite("/api/istoric-bot?action=profil", { simbol, profil }); d.profile.set(simbol, profil); }
      st.facute[simbol] = { zi: azi, la: d.acum, profil: profil ? { simbol, zile: profil.zile, z12: profil.z12, z24: profil.z24 } : null };
      d.scrieStare(st);
      d.jurnal("profil", simbol, profil ? profil.zile + " zile, " + randuri.length + " bare" : "prea putine bare (" + randuri.length + ")");
    } catch (e) { d.jurnal("profil ESEC", simbol, e.message); }
  }
}
```

Notă pentru test: ora României pe 01.10 e UTC+3, deci `zi + 0,5 h` UTC = 03:30. Dacă testul cu `noapte + 24 * ORA` cade pe altă oră din cauza ceasului de iarnă (25.10), datele din test rămân în octombrie, înainte de schimbare — corect așa.

- [ ] **Step 4: Rulează** `node scripts/proba-v10045.mjs` — Expected: `9/9 trecute`.

- [ ] **Step 5: Leagă în colector.** În `scripts/colector.mjs`:
  - importul: `import { turaProfil as turaProfilModul } from "./lib/tura-profil.mjs";`
  - după încărcarea `Obiceiuri`: `const ProfilMoneda = incarca("profil-moneda.js", "ProfilMoneda");` și adaugă `ProfilMoneda` în lista din proba de încărcare (`COLECTOR_DOAR_INCARCA`);
  - `const VERSIUNE_COLECTOR = "v101.26";`
  - înainte de `async function bucla()`:

```js
// v101.26 (pachetul 1): profilul monedei - barele de 1 h pe disc (data/istoric-1h), profilul in KV; profileMoneda il tin si aici
// (mutaGridul din tura il cere). Monedele: botii activi + inchisii din ultimele 60 de zile.
const ORE_DIR = path.join(DATA, "istoric-1h"); fs.mkdirSync(ORE_DIR, { recursive: true });
const PROFIL_STARE = path.join(DATA, "profil-stare.json");
let profilStare = {}; try { profilStare = JSON.parse(fs.readFileSync(PROFIL_STARE, "utf8")) || {}; } catch { profilStare = {}; }
const profileMoneda = new Map();
const fisOre = (s) => path.join(ORE_DIR, String(s).replace(/[^A-Z0-9_]/gi, "") + ".json");
async function simboluriProfil() {
  const act = await cere("/api/bot-orders"), m = new Map();
  for (const b of (act && act.bots) || []) { const s = TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex; if (s && /_PERP$/.test(s)) m.set(s, JurnalTrade.moneda(b.baza)); }
  for (const x of (await botiInchisiToti()).filter((x) => Number(x.closeTime) > Date.now() - 60 * 86400000)) {
    const mo = JurnalTrade.moneda(x.base), s = await simbolPerp(mo); if (s && !m.has(s)) m.set(s, mo);
  }
  return [...m].map(([simbol, moneda]) => ({ simbol, moneda }));
}
let profilInLucru = false, profilLa = 0;
async function turaProfil() {
  if (profilInLucru || Date.now() - profilLa < 10 * 60000) return;
  profilInLucru = true; profilLa = Date.now();
  try {
    await turaProfilModul({ GridCalcul, ProfilMoneda, acum: Date.now(), cere, trimite, jurnal, profile: profileMoneda, stare: profilStare,
      pauza: (ms) => new Promise((r) => setTimeout(r, ms)), simboluri: simboluriProfil,
      trades: async () => JurnalTrade.din(await botiInchisiToti()),
      citesteBare: (s) => { try { return JSON.parse(fs.readFileSync(fisOre(s), "utf8")); } catch { return []; } },
      scrieBare: (s, r) => { try { scrieAtomic(fisOre(s), r); } catch (e) { jurnal("bare 1h nescrise", s, e.message); } },
      scrieStare: (st) => { try { scrieAtomic(PROFIL_STARE, st); } catch (e) { jurnal("profil-stare nescris", e.message); } } });
  } catch (e) { jurnal("profil ESEC", e.message); }
  profilInLucru = false;
}
```

  - în `bucla()`, după `turaFrana()…`: `turaProfil().catch((e) => jurnal("profil", e.message));   // v101.26 (pachetul 1)`

  Verifică că `JurnalTrade.moneda` acceptă și `b.baza` (Tabloul) și `x.base` (arhiva) și dă aceeași formă — dacă nu, folosește `JurnalTrade.moneda` pe ambele (cum e scris mai sus). Verifică numele câmpurilor (`baza`, `quote`, `simbolPionex`) în `functions/api/bot-orders.js` lângă `simbol:\`${bot.base}/${bot.quote}\``.

- [ ] **Step 6: Proba de încărcare a colectorului:** `COLECTOR_DOAR_INCARCA=1 node scripts/colector.mjs` — Expected: `INCARCAT true`. Apoi `npm run test:colector` dacă există în `package.json` (proba `colector-v77.mjs`).

---

### Task 4: Pragurile din profil în `SemnaleBot` (marginea și stopul)

**Files:**
- Modify: `public/lib/semnale-bot.js` (`mutaGridul` ~25; `acumConcret` ~78, ramura „pe minus” ~93 și eticheta grid ~159; exportul ~389)
- Modify: `scripts/colector.mjs:268` (dă pragurile din `profileMoneda`)
- Test: `scripts/proba-v10045.mjs`

**Interfaces:**
- Consumes: `ProfilMoneda.praguriMargine` / `pragStop` (Task 1), calculate de chemător (SemnaleBot NU încarcă ProfilMoneda).
- Produces: `SemnaleBot.laMargine(b, pm) → {parte:"jos"|"sus"|null, poz, dist, prag, profil:bool, sursa} | null`; `mutaGridul(b, f, afaraOre, pm)` (al 4-lea parametru opțional, `motiv` cu sursa); `acumConcret(x)` citește `x.pragMargine`, `x.pragStop`; cartela Stopul are `cs.sursaStop`.

- [ ] **Step 1: Adaugă testele (picând):**

```js
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
const fisaF = { setare: { dir: "long", jos: 0.40, sus: 0.50, grile: 20, levier: 3, stop: { jos: 0.395, sus: 0.505 } }, propusa: "rara", treceriZi: 3 };
const botL = (pret, jos = 0.40, sus = 0.50, dir = "long") => ({ pretCurent: pret, gridJos: jos, gridSus: sus, directie: dir, brut: { buOrderData: { row: 21, gridType: "geometric" } } });
await test("marginea din profil: 2,5% pana jos cand moneda coboara 3% in 12 h (P75) -> la margine, cu sursa; 6% pana jos -> nu", () => {
  assert.ok(typeof SB.laMargine === "function", "lipseste SemnaleBot.laMargine");
  const pm = { jos: 0.03, sus: 0.03, sursa: "profilul CRV: 183 de zile de bare de 1 h" };
  const m = SB.mutaGridul(botL(0.41), fisaF, 0, pm);   // 0,41: 2,4% pana jos, 20% din interval (pragul fix n-ar fi sunat)
  assert.ok(m && /marginea de jos/.test(m.motiv) && /profilul CRV/.test(m.motiv), m && m.motiv);
  assert.equal(SB.mutaGridul(botL(0.4255), fisaF, 0, pm), null, "6% pana jos > 3% (P75 pe 12 h): nu e la margine");
  const m2 = SB.mutaGridul(botL(0.4048), fisaF, 0, null);   // fara profil: pragul fix, 4,8% din interval
  assert.ok(m2 && /marginea de jos/.test(m2.motiv) && /prag fix/.test(m2.motiv));
});
await test("marginea din profil e plafonata la 25% din interval: gridul ingust nu sta „la margine” mereu", () => {
  const pm = { jos: 0.08, sus: 0.08, sursa: "profilul X" };
  assert.equal(SB.mutaGridul(botL(0.45), fisaF, 0, pm), null, "pretul la mijloc, interval de 22%: nu e la margine");
  const l = SB.laMargine(botL(0.45), pm); assert.ok(l.prag <= 0.25 * (0.50 - 0.40) / 0.45 + 1e-12);
});
await test("short: marginea de pierdere e SUS; stopul propus din profil e PESTE pret, mai departe decat al fisei", () => {
  const pm = { jos: 0.03, sus: 0.03, sursa: "profilul CRV" };
  const m = SB.mutaGridul(botL(0.49, 0.40, 0.50, "short"), { ...fisaF, setare: { ...fisaF.setare, dir: "short" } }, 0, pm);
  assert.ok(m && /marginea de sus/.test(m.motiv));
  const c = SB.acumConcret({ bot: { ...botL(0.47, 0.40, 0.50, "short"), profitTotal: -3 }, fisa: fisaF, zero: { pretZero: 0.45 }, costuri: {}, pragMargine: pm, pragStop: { dist: 0.12, sursa: "profilul CRV" }, acum: T0 });
  const st = c.find((x) => x.cod === "stop");
  assert.ok(st.pretPropus > 0.505 && Math.abs(st.pretPropus - 0.47 * 1.12) < 1e-9, "dincolo de P75 pe 24 h: " + st.pretPropus);
  assert.match(st.sursaStop, /profilul CRV/);
});
```

- [ ] **Step 2: Rulează** — Expected: cele 3 teste PICĂ (`lipseste SemnaleBot.laMargine`).

- [ ] **Step 3: Implementează** în `semnale-bot.js`, înainte de `mutaGridul`:

```js
  // v100.45 (pachetul 1): „lângă margine” din PROFILUL monedei - distanta pana la margine sub cat se misca moneda in 12 h in 3 din
  // 4 jumatati de zi (P75, pm = ProfilMoneda.praguriMargine, socotit de chemator), plafonat la 25% din interval (gridul ingust ar
  // sta altfel „la margine” mereu). Fara profil: pragul fix de azi, 10% din interval. Intoarce si de unde vine pragul.
  function laMargine(b, pm) {
    var p = nr(b && b.pretCurent), jos = nr(b && b.gridJos), sus = nr(b && b.gridSus);
    if (p === null || jos === null || sus === null || !(sus > jos) || p < jos || p > sus) return null;
    var poz = (p - jos) / (sus - jos), dj = 1 - jos / p, ds = sus / p - 1;
    if (pm && nr(pm.jos) !== null && nr(pm.sus) !== null) {
      var cap = 0.25 * (sus - jos) / p, pj = Math.min(nr(pm.jos), cap), ps = Math.min(nr(pm.sus), cap);
      var parte = dj < pj && (ds >= ps || dj / pj <= ds / ps) ? "jos" : ds < ps ? "sus" : null;
      return { parte: parte, poz: poz, dist: parte === "sus" ? ds : parte === "jos" ? dj : Math.min(dj, ds), prag: parte === "sus" ? ps : pj, profil: true, sursa: pm.sursa || "profilul monedei" };
    }
    return { parte: poz < 0.1 ? "jos" : poz > 0.9 ? "sus" : null, poz: poz, dist: poz < 0.5 ? dj : ds, prag: null, profil: false, sursa: "prag fix: 10% din interval (profilul monedei n-a venit încă)" };
  }
```

În `mutaGridul(b, f, afaraOre, pm)`, înlocuiește blocul `if (p >= jos && p <= sus) { … }`:

```js
    if (p >= jos && p <= sus) {
      var lm = laMargine(b, pm);
      if (lm && lm.parte) motiv = "prețul stă la marginea de " + lm.parte + " a gridului (" + P(lm.dist) + " până la ea, " + P(lm.poz) + " din interval"
        + (lm.profil ? "; moneda se mișcă atât în 12 h în 3 din 4 cazuri — " + lm.sursa : "; " + lm.sursa) + ")";
    }
```

În `acumConcret`, ramura „pe minus”, după calculul lui `protectie`:

```js
        // v100.45 (pachetul 1): stopul dincolo de cat merge moneda impotriva botului intr-o zi, in 3 din 4 zile (x.pragStop din profil),
        // daca asta e mai departe decat protectia fisei; altfel ramane a fisei
        var psD = x.pragStop && nr(x.pragStop.dist), sursaStop = null;
        if (psD !== null && psD > 0 && p !== null) {
          var dinProfil = dir === "short" ? p * (1 + psD) : p * (1 - psD);
          if (protectie === null || (dir === "short" ? dinProfil > protectie : dinProfil < protectie)) { protectie = dinProfil; sursaStop = "dincolo de cât " + (dir === "short" ? "urcă" : "coboară") + " moneda într-o zi, în 3 din 4 zile (" + x.pragStop.sursa + ")"; }
          else sursaStop = "stopul fișei e deja dincolo de o zi obișnuită (" + x.pragStop.sursa + ")";
        }
```

(`var protectie` rămâne declarat ca acum, apoi `pretStop = protectie;` după blocul nou.) La `cs.pretPropus = pretStop;` adaugă `cs.sursaStop = typeof sursaStop === "string" ? sursaStop : null;` și declară `var sursaStop = null;` la începutul funcției (lângă `var pretStop`), scoțând `var` din blocul de mai sus.

Eticheta gridului (`gr0.tag`, ~159): `var lm0 = laMargine(b, x.pragMargine);` și condiția `poz < 0.1 || poz > 0.9` devine `lm0 && lm0.parte`.

Export: adaugă `laMargine: laMargine` în obiectul întors.

- [ ] **Step 4: Rulează** `node scripts/proba-v10045.mjs` — Expected: `12/12 trecute`. Apoi `npm test` întreg: probele vechi pe `mutaGridul` / `acumConcret` fără profil trebuie să treacă NESCHIMBATE (fără `pm`, comportamentul e cel de azi). Dacă una pică din cauza textului motivului („(4,8% din interval)” → „(… până la ea, 4,8% din interval; prag fix …)”), actualizeaz-o cu motivul scris în comentariu, ca la v100.39.

- [ ] **Step 5: Colectorul dă pragurile.** `scripts/colector.mjs:268`: `muta: SemnaleBot.mutaGridul(b, f, afaraOre, ProfilMoneda.praguriMargine(profileMoneda.get(s) || null))` — unde `s` e simbolul PERP din contextul turei (verifică numele variabilei în funcția care conține linia 268; e același `s` cu care se cer lumânările de 4H la linia 225).

---

### Task 5: Planul potrivit monedei (I-475) — Tablou și poarta

**Files:**
- Modify: `public/lib/obiceiuri.js` (`poarta`, ~68: regula `plan-moneda`)
- Modify: `public/app.js` (`gridPoarta` ~5117; randarea planului ~5659)
- Test: `scripts/proba-v10045.mjs`

**Interfaces:**
- Consumes: `ProfilMoneda.planPeMoneda` (Task 1), `GridPlan.pierdere(E, d, u)` (exportat deja), `grPlanMemo.grid.v.ta` (`{d, u, suma, levier}`, calculat de `renderGrid` la app.js:5445), `TabloExtra.totalCuGridLa`, `st.minus.opritorPlan` (`TabloExtra.planStare`).
- Produces: `Obiceiuri.poarta(o)` cu `o.planMoneda` → regula `{cod:"plan-moneda", ok:!avertizare, text}`.

- [ ] **Step 1: Adaugă testul (picând):**

```js
await test("poarta: planul atins de o zi obisnuita in peste jumatate din zile -> regula „plan-moneda” rosie (avertizare, nu blocare)", () => {
  const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
  const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
  const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT);
  const pm = { avertizare: true, text: "O zi obișnuită a monedei ajunge la planul tău (−1,2% de preț) în 70% din zile." };
  const r = OB.poarta({ fisa: { simbol: "CRV_USDT_PERP", verdict: { nivel: "porneste" }, setare: {} }, trades: [], acum: T0, dir: "long", levier: 3, plan: { plus: 5, minus: 10 }, planMoneda: pm });
  const rg = r.reguli.find((x) => x.cod === "plan-moneda");
  assert.ok(rg && rg.ok === false && /70% din zile/.test(rg.text)); assert.equal(r.trecut, false);
  const r2 = OB.poarta({ fisa: { simbol: "CRV_USDT_PERP", verdict: { nivel: "porneste" }, setare: {} }, trades: [], acum: T0, dir: "long", levier: 3, plan: { plus: 5, minus: 10 } });
  assert.ok(!r2.reguli.some((x) => x.cod === "plan-moneda"), "fara profil: regula nu apare");
});
await test("app: Tabloul cere profilul si il da la margine, stop si plan; poarta il foloseste; fara profil nu inventeaza", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8");
  assert.match(app, /action=profil&simbol=/); assert.match(app, /SemnaleBot\.mutaGridul\(b,f,ac\?ac\.afaraOre:0,pmT\)/);
  assert.match(app, /pragMargine:pmT,pragStop:psT/); assert.match(app, /ProfilMoneda\.planPeMoneda\(/); assert.match(app, /planMoneda:/);
  assert.match(html, /<script src="\/lib\/profil-moneda\.js"><\/script>/);
});
```

- [ ] **Step 2: Rulează** — Expected: cele 2 teste noi PICĂ.

- [ ] **Step 3: `Obiceiuri.poarta`**, după rândul frânei (`if (o.frana) R.push(…)`):

```js
    // v100.45 (I-475): planul potrivit monedei - cat de des o zi obisnuita ajunge la stopul planului (din profilul monedei)
    if (o.planMoneda && o.planMoneda.text) R.push({ cod: "plan-moneda", ok: !o.planMoneda.avertizare, text: o.planMoneda.text });
```

- [ ] **Step 4: Tabloul** (`public/app.js`). Lângă `var tbSoc…` / `tbAduSocoteala`:

```js
// v100.45 (pachetul 1): profilul monedei (colectorul il face noaptea din 6 luni de bare de 1 h) - pragurile sfaturilor pe moneda.
// Pe pagina publicata (fara KV) ruta da 503 -> null -> pragurile fixe de azi, spuse ca atare.
var tbProfil={simbol:null,la:0,p:null,inLucru:false};
function tbProfilPt(b){
  var s=b?TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex:null;if(!s)return null;
  if(!tbProfil.inLucru&&(tbProfil.simbol!==s||Date.now()-tbProfil.la>30*60000)){tbProfil.inLucru=true;
    getJSON("/api/istoric-bot?action=profil&simbol="+encodeURIComponent(s)).then(function(d){tbProfil.p=d&&d.profil||null}).catch(function(){tbProfil.p=null}).then(function(){tbProfil.simbol=s;tbProfil.la=Date.now();tbProfil.inLucru=false})}
  return tbProfil.simbol===s?tbProfil.p:null;
}
```

La app.js:5735 (`var muta=SemnaleBot.mutaGridul(...)`), înaintea ei: `var prT=tbProfilPt(b),pmT=ProfilMoneda.praguriMargine(prT),psT=ProfilMoneda.pragStop(prT,String(b.directie||"").toLowerCase());` și chemarea devine `SemnaleBot.mutaGridul(b,f,ac?ac.afaraOre:0,pmT)`. La 5743, în obiectul dat lui `acumConcret`, adaugă `pragMargine:pmT,pragStop:psT,`.

În randarea planului (~5659), după rândul `if(st.minus)h+=…`:

```js
  // v100.45 (I-475): cat de des o zi obisnuita a monedei ajunge la planul pe minus, si pragul atins in cel mult 1 zi din 4
  var prP=tbProfilPt(b),dP=String(b.directie||"").toLowerCase(),pP=botiNr(b.pretCurent);
  if(st.minus&&st.minus.opritorPlan!=null&&pP>0){var pmP=ProfilMoneda.planPeMoneda({profil:prP,dir:dP,dist:Math.abs(st.minus.opritorPlan/pP-1),laDist:function(dd){return TabloExtra.totalCuGridLa(b,dP==="short"?pP*(1+dd):pP*(1-dd))}});
    h+=pmP?'<p class="'+(pmP.avertizare?"tbFac tbWarn":"tbSub")+'">📏 '+escapeHtml(pmP.text)+'</p>':'<p class="tbSub">📏 Cât de des e atins planul pe moneda asta: profilul monedei vine de la colector (noaptea).</p>'}
```

În `gridPoarta()` (~5128), înaintea `grPoartaRez=…`:

```js
  // v100.45 (I-475): planul potrivit monedei - pe banda „cât planul” la levierul tau (varianta TA a gridului dupa plan, deja socotita)
  var prG=null;try{var dPr=await getJSON("/api/istoric-bot?action=profil&simbol="+encodeURIComponent(f.simbol));prG=dPr&&dPr.profil||null}catch(e){prG=null}
  var gvG=grPlanMemo.grid&&grPlanMemo.grid.v,taG=gvG&&gvG.ta&&gvG.plan&&gvG.plan.minus===plan.minus?gvG.ta:null,pmG=null;
  if(prG&&taG&&(f.dir==="long"||f.dir==="short")){var EG=(taG.suma||0)*(taG.levier||1);pmG=ProfilMoneda.planPeMoneda({profil:prG,dir:f.dir,dist:taG.d,laDist:function(dd){return -GridPlan.pierdere(EG,dd,taG.u)}})}
```

și în obiectul dat lui `Obiceiuri.poarta(...)` adaugă `planMoneda:pmG`.

- [ ] **Step 5: `index.html`** — `<script src="/lib/profil-moneda.js"></script>` imediat înainte de `<script src="/lib/semnale-bot.js"></script>` (linia ~2315). `sw.js` — `"/lib/profil-moneda.js"` în `APP_SHELL`, după `"/lib/grid-plan.js"`.

- [ ] **Step 6: Rulează** `node scripts/proba-v10045.mjs` — Expected: `14/14 trecute`.

---

### Task 6: Versiunea, proba întreagă, ecranul, livrarea

**Files:**
- Modify: `BUILD_INFO.json`, `package.json`, `public/index.html`, `public/sw.js`, `functions/_shared/versiune.js`

- [ ] **Step 1: Versiunea v100.45** în toate locurile din „Global Constraints”; badge `"v100.45 · PROFILUL MONEDEI"`; `sw.js` CACHE cu `v100.45` și data `2026-10-01` în formatul existent (citește valoarea de acum întâi).
- [ ] **Step 2:** `npm test` — Expected: tot lanțul trece, ultima linie de la `proba-v10045` = `14/14 trecute`.
- [ ] **Step 3: Proba de ecran a Tabloului** cu serverul pornit: `node scripts/proba-ecran-tablou.mjs` — Expected: 73/73 (sau numărul de acum), nimic pierdut. Apoi o poză CDP pe Tablou la 1920 și la 390 (scripturile din scratchpad `ux/cdp.mjs`) și una pe Grid → „Verifică poarta” cu plan 5/10; mă uit la poze înainte de commit.
- [ ] **Step 4: Commit + push** (mesajul prin fișier, `git commit -F`):

```
feat(radar): profilul monedei - marginea si stopul din 6 luni de bare de 1 h, planul potrivit monedei (v100.45, pachetul 1, I-475)
```

Run: `npm test && git add -A public functions scripts package.json BUILD_INFO.json docs/superpowers/plans && git commit -F <fisier> && git push origin main`

- [ ] **Step 5: Repornirea colectorului (una singură):** oprește PID-ul de acum (citit din `data/colector.pid`), pornește-l cum îl pornește lansatorul și probează că A PORNIT: jurnalul arată `v101.26`, apoi în ~15 min liniile `profil <SIMBOL> … zile` pentru monedele boților activi; `GET action=profil&simbol=<simbolul botului activ>` întoarce profilul. Tabloul după reîncărcare: motivul de margine și cartela Stopul scriu „profilul …”.
- [ ] **Step 6: Memo** în `project_crypto_radar_audit_30_09.md` (ce s-a livrat, hash, colectorul, ce urmează: planul pachetului 2) + rândul din `MEMORY.md`.
