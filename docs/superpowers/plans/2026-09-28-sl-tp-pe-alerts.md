# SL și TP pe pagina alerts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Execuție aleasă de el (regula lui, 24.09):** DIRECT, eu, în sesiunea asta; o singură revizie la final.

**Goal:** pe pagina alerts, la pozițiile Trading 212 și la simbolurile urmărite: SL și TP (planul lui sau sugerat de Radar), bara SL ← acum → TP și dovada din istoricul acțiunii.

**Architecture:** colectorul de acasă (`crypto`) rulează `ActiuniSemnale.niveluri` (funcția Radarului, neschimbată) și pune rezultatul în poză ca `sugestie`; worker-ul Paznicului o duce neatinsă; pagina (`premarket_scanner`) doar alege plan / sugestie și desenează bara.

**Tech Stack:** Node 24 (ESM, `node:assert`), scripturi de browser fără build (`var`, IIFE), `node --test` în suită, Chrome headless pentru probele de ecran.

**Spec:** `crypto/docs/superpowers/specs/2026-09-28-sl-tp-pe-alerts-design.md` · demo aprobat: https://claude.ai/artifact/GQVS4jd1nbqSoN1tCNJMCz

## Global Constraints

- Nivelurile vin DOAR din `ActiuniSemnale.niveluri(bare, pret, o)` — nicio formulă nouă de stop.
- Planul din Radar are întâietate asupra sugestiei; pagina nu scrie planuri.
- Lipsa rămâne `null`, niciodată `0` (Number(null) === 0 minte).
- Poza rămâne sub 512 KB.
- Dublurile germane (1QZ.DE, MIGA.MU, NFC.F): nivelurile din lumânările simbolului german (€), nu ale companiei din SUA.
- Regula care pierde pe istoric (medie < 0) se spune pe față, cu roșu.
- Versiuni: `VERSIUNE_COLECTOR` = "v101.0"; alerts badge `v129`, `CACHE_VERSION` = `tt-v839-2026-09-28` + `node tools/sync-suite-version.mjs`.
- Scripturi cu backslash / backtick: prin Write sau Edit, nu prin Bash (capcană dovedită de 5 ori azi).
- Commit + push după fiecare sarcină (`npm test && commit && push`, nu `;`).

## Review Focus

1. **Preț sub SL sau peste TP** (APLD azi e sub stop): punctul la capăt, „SUB STOP” / „ȚINTĂ ATINSĂ”, fără procente negative ciudate — pus în Task 4.
2. **SL = TP sau TP lipsă** (plan fără țintă): nicio împărțire la zero, bara nu se desenează dacă lipsește unul — pus în Task 4.
3. **Simbol fără lumânări la Yahoo** (ECHO/SATS, 404): colectorul nu cade, sugestia e `null`, pagina scrie „fără date” — pus în Task 2 și Task 5.
4. **Mai puțin de 120 de zile** (acțiune listată recent): `fara-date` cu motivul, fără bară — pus în Task 1 și Task 5.
5. **Poza veche fără `sugestie`** (colectorul nerepornit încă): pagina arată planul ca înainte, iar la urmărite o coloană goală, fără excepții — pus în Task 4 și Task 5.

---

### Task 1: `sugestiePoza` în poză (colector, pur)

**Files:**
- Modify: `crypto/scripts/lib/poza.mjs` (funcție nouă `sugestiePoza`; `pozitieT212` și `simbolPoza` o folosesc)
- Create: `crypto/scripts/proba-sltp.mjs`
- Modify: `crypto/package.json` (`test:sltp`, `test:poza` = `scripts/poza-v98.mjs`, care NU era în `npm test`; ambele în lanțul `test`)

**Interfaces:**
- Produces: `export function sugestiePoza(n, pret, fel)` — `n` = rezultatul `niveluri`, `fel` = `"pozitie"` | `"urmarit"`; întoarce `null`, `{ nivel: "fara-date", motiv }` sau `{ stop, tinta, riscPct, k, trend, proba: { n, pePlus, medie }, intrare? }` (`intrare` doar la „urmarit”: `{ pret, motiv }` sau `null`).
- Produces (poză): `t212[i].sugestie`, `simboluri[i].sugestie` — din `x.niveluri` primit de `construiestePoza`.

- [ ] **Step 1: Proba care pică** — `scripts/proba-sltp.mjs` (prin Write):

```js
// Probele SL/TP pe alerts (spec 2026-09-28-sl-tp-pe-alerts): sugestiePoza + poza + yahoo-extra.bare. Fara retea.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { construiestePoza, sugestiePoza } from "./lib/poza.mjs";
const RAD = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const GC = new Function(fs.readFileSync(path.join(RAD, "public/lib/grid-calcul.js"), "utf8") + "; return GridCalcul;")();
const AS = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public/lib/actiuni-semnale.js"), "utf8") + "; return ActiuniSemnale;")(GC);
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const ZI = 86400000, T0 = Date.UTC(2025, 8, 29);
// n zile de lumanari: trend (+ sus, - jos, 0 lateral) + oscilatie ca volatilitatea sa existe
function bare(n, trend, p0 = 100) { const o = []; let p = p0; for (let i = 0; i < n; i++) { p = p * (1 + trend / 1000) + Math.sin(i / 3) * p0 * 0.01; const c = p; o.push({ t: T0 + i * ZI, o: c * 0.995, h: c * 1.012, l: c * 0.988, c, v: 1e6 }); } return o; }
console.log("\nSL/TP pe alerts · proba\n");

await test("sugestiePoza: pozitie -> stopul care urca si tinta de la pret, riscPct, k, proba", () => {
  const b = bare(250, 2), pret = b[b.length - 1].c, n = AS.niveluri(b, pret, { pretMediu: pret * 0.9, maxDupaCumparare: pret, minTrail: 0.15 });
  const s = sugestiePoza(n, pret, "pozitie");
  assert.ok(s.stop < pret && s.tinta > pret, JSON.stringify(s)); assert.ok(s.stop <= pret * 0.85 + 1e-6, "cel putin -15% de la maxim");
  assert.ok([1.5, 2, 2.5, 3].includes(s.k)); assert.ok(s.proba.n > 0 && s.proba.pePlus >= 0 && s.proba.pePlus <= 1); assert.equal("intrare" in s, false);
});
await test("sugestiePoza: urmarit cu trend sus -> intrare sub pret; trend jos -> intrare null (orientativ)", () => {
  const sus = bare(250, 3), ps = sus[sus.length - 1].c, a = sugestiePoza(AS.niveluri(sus, ps, {}), ps, "urmarit");
  assert.ok(a.intrare && a.intrare.pret <= ps && a.intrare.motiv.length > 5, JSON.stringify(a.intrare)); assert.ok(a.stop < a.intrare.pret && a.tinta > a.intrare.pret);
  const jos = bare(250, -3), pj = jos[jos.length - 1].c, z = sugestiePoza(AS.niveluri(jos, pj, {}), pj, "urmarit");
  assert.equal(z.trend, "jos"); assert.equal(z.intrare, null); assert.ok(z.stop < pj && z.tinta > pj, "de la pretul de acum");
});
await test("sugestiePoza: sub 120 de zile -> fara-date cu motivul; nimic -> null", () => {
  const b = bare(60, 1), p = b[b.length - 1].c;
  assert.deepEqual(sugestiePoza(AS.niveluri(b, p, {}), p, "urmarit"), { nivel: "fara-date", motiv: "prea puține zile de prețuri (60 din 120)" });
  assert.equal(sugestiePoza(null, 10, "pozitie"), null); assert.equal(sugestiePoza({ nivel: "ok", stop: null, tinta: 5 }, 10, "urmarit"), null, "fara stop nu inventam");
});
await test("construiestePoza: t212[].sugestie la FIECARE pozitie (si cu plan), simboluri[].sugestie; fara niveluri = null; sub 512 KB", () => {
  const b = bare(250, 2), pret = b[b.length - 1].c, n = AS.niveluri(b, pret, { pretMediu: 90, maxDupaCumparare: pret, minTrail: 0.15 });
  const baza = { qty: 1, pretMediu: 90, pret, prev: pret, ppl: 4, costLei: 46, bare: [], maxDupaCumparare: pret, pondere: 0.1, sem: null, niv: null };
  const p = construiestePoza({ acum: Date.now(), versiune: "v101.0", boti: [], t212: [
    { ...baza, ticker: "AAA_US_EQ", simbol: "AAA", plan: { trailPct: 15, tinta: 130 }, niveluri: n },
    { ...baza, ticker: "BBB_US_EQ", simbol: "BBB", plan: null, niveluri: n },
    { ...baza, ticker: "CCC_US_EQ", simbol: "CCC", plan: null }],
    simboluri: [{ s: "DDD", pret, prev: pret, closes30: [], niveluri: AS.niveluri(b, pret, {}) }, { s: "EEE", pret: 5, closes30: [] }] });
  assert.ok(p.t212[0].sugestie && p.t212[0].plan, "cu plan: si planul, si sugestia (dovada „ce ar fi sugerat”)");
  assert.ok(p.t212[1].sugestie.stop > 0); assert.equal(p.t212[2].sugestie, null);
  assert.ok(p.simboluri[0].sugestie && "intrare" in p.simboluri[0].sugestie); assert.equal(p.simboluri[1].sugestie, null);
  const t = JSON.stringify(p); assert.equal(t.includes("undefined"), false); assert.equal(t.includes("NaN"), false); assert.ok(t.length < 512 * 1024);
});

console.log(`\nSLTP ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exitCode = picate ? 1 : 0;
```

- [ ] **Step 2:** `node scripts/proba-sltp.mjs` → PICĂ („sugestiePoza is not a function” / import lipsă).
- [ ] **Step 3: Implementarea** — în `scripts/lib/poza.mjs`, înainte de `function pozitieT212`:

```js
// v101 (spec 2026-09-28-sl-tp-pe-alerts): SL / TP pentru pagina alerts, din ActiuniSemnale.niveluri (functia Radarului).
// fel "pozitie": stopul care urca (stopPozitie) si tinta de la pret; fel "urmarit": intrarea sugerata (null la trend in jos) + stop/tinta de la ea.
export function sugestiePoza(n, pret, fel) {
  if (!n || typeof n !== "object") return null;
  if (n.nivel === "fara-date") return { nivel: "fara-date", motiv: String(n.motiv || "") };
  if (n.nivel !== "ok") return null;
  const p = nr(pret), pr = n.proba || {}, tr = n.trend && typeof n.trend === "object" ? n.trend.dir : n.trend;
  const baza = { k: nr(n.k), trend: tr ? String(tr) : null, proba: { n: nr(pr.n), pePlus: rot(pr.pePlus, 3), medie: rot(pr.medie, 4) } };
  if (fel === "pozitie") {
    const stop = rot(n.stopPozitie, 4), tinta = rot(n.tintaPozitie, 4);
    if (stop === null || tinta === null) return null;
    return { stop, tinta, riscPct: p && nr(n.d) !== null ? rot(n.d / p, 4) : null, ...baza };
  }
  const stop = rot(n.stop, 4), tinta = rot(n.tinta, 4);
  if (stop === null || tinta === null) return null;
  const intrare = n.intrare && nr(n.intrare.pret) ? { pret: rot(n.intrare.pret, 4), motiv: String(n.intrare.motiv || "") } : null;
  return { intrare, stop, tinta, riscPct: rot(n.riscPct, 4), ...baza };
}
```

   În `pozitieT212(x, acum)`, în obiectul întors, după `sursa: x.sursa || null`: `, sugestie: sugestiePoza(x.niveluri, x.pret, "pozitie")`.
   În `simbolPoza(x, acum)`, după `shortFloat: …`: `, sugestie: sugestiePoza(x.niveluri, x.pret, "urmarit")`.
   `package.json` (prin `node -e` cu `JSON.parse` + assert, NU sed): `"test:sltp": "node scripts/proba-sltp.mjs"`, `"test:poza": "node scripts/poza-v98.mjs"`; în `test`, după `npm run test:pretviu`: ` && npm run test:poza && npm run test:sltp`.
- [ ] **Step 4:** `node scripts/proba-sltp.mjs` → PASS 4/4; `node scripts/poza-v98.mjs` → PASS; `npm test` → exit 0.
- [ ] **Step 5: Commit** `feat(colector): sugestia SL/TP in poza (sugestiePoza, din ActiuniSemnale.niveluri)` + push.

### Task 2: `yahooExtra.bare` — lumânări zilnice pe 1 an, cache 6 h

**Files:**
- Modify: `crypto/scripts/lib/yahoo-extra.mjs`
- Test: `crypto/scripts/proba-sltp.mjs` (teste noi)

**Interfaces:**
- Produces: `creeazaYahooExtra({ …, fisierBare })` → `.bare(simbol)` : `Promise<Array<{t,o,h,l,c,v}> | null>` (null = Yahoo n-are simbolul; aruncă doar la erori de rețea / 5xx).

- [ ] **Step 1: Proba care pică** — adaugă în `proba-sltp.mjs`, înainte de `console.log(\`\nSLTP`:

```js
import { creeazaYahooExtra } from "./lib/yahoo-extra.mjs";
const raspuns = (corp, status = 200) => ({ ok: status < 400, status, json: async () => corp, text: async () => JSON.stringify(corp), headers: { get: () => null } });
const chart1y = (n) => ({ chart: { result: [{ timestamp: Array.from({ length: n }, (_, i) => Math.floor((T0 + i * ZI) / 1000)), meta: { currency: "USD" },
  indicators: { quote: [{ open: Array(n).fill(10), high: Array(n).fill(11), low: Array(n).fill(9), close: Array.from({ length: n }, (_, i) => (i === 3 ? null : 10 + i / 100)), volume: Array(n).fill(5) }] } }] } });
await test("yahooExtra.bare: 1 an OHLC, bara cu null sarita; cache 6 h (a doua cerere nu suna); 404 -> null, fara exceptie", async () => {
  const fisierBare = path.join(os.tmpdir(), "proba-sltp-" + process.pid + ".json"); let apeluri = 0, url = "";
  const y = creeazaYahooExtra({ fisier: path.join(os.tmpdir(), "proba-sltp-e-" + process.pid + ".json"), fisierBare, pauzaMs: 0, f: async (u) => { apeluri++; url = u; return raspuns(chart1y(252)); } });
  const b = await y.bare("AVGO");
  assert.equal(b.length, 251); assert.deepEqual(Object.keys(b[0]).sort(), ["c", "h", "l", "o", "t", "v"]); assert.match(url, /range=1y&interval=1d/);
  await y.bare("AVGO"); assert.equal(apeluri, 1, "din cache");
  const y2 = creeazaYahooExtra({ fisier: path.join(os.tmpdir(), "proba-sltp-e2-" + process.pid + ".json"), fisierBare: fisierBare + "2", pauzaMs: 0, f: async () => raspuns({ chart: { result: null, error: { code: "Not Found" } } }, 404) });
  assert.equal(await y2.bare("SATS"), null);
  for (const f of [fisierBare, fisierBare + "2"]) try { fs.unlinkSync(f); } catch {}
});
```

- [ ] **Step 2:** `node scripts/proba-sltp.mjs` → PICĂ („y.bare is not a function”).
- [ ] **Step 3: Implementarea** (Edit în `yahoo-extra.mjs`):
   - antet: `const EXTRA_MS = 6 * 3600000, CLOSES_MS = 30 * 60000, BARE_MS = 6 * 3600000;`
   - semnătura: `export function creeazaYahooExtra({ fisier, fisierBare = null, pauzaMs = 400, f = fetch, acum = () => Date.now(), jurnal = () => {} } = {}) {`
   - după `let cache = …`: `let cacheBare = {}; if (fisierBare) { try { cacheBare = JSON.parse(fs.readFileSync(fisierBare, "utf8")); } catch { cacheBare = {}; } }`
     `const salveazaBare = () => { if (!fisierBare) return; try { fs.writeFileSync(fisierBare, JSON.stringify(cacheBare)); } catch (e) { jurnal("yahoo-extra: bare nescrise", e.message); } };`
   - metodă nouă, după `closes`:

```js
    // v101 (SL/TP pe alerts): lumanarile zilnice pe 1 an (OHLC) - ActiuniSemnale.niveluri cere cel putin 120 de zile.
    // Fisier separat (poza-bare.json), cache 6 h; 404 = Yahoo n-are simbolul -> null (tinut minte), nu exceptie.
    async bare(simbol) {
      const c = cacheBare[simbol]; if (c && acum() - c.la < BARE_MS) return c.v;
      const r = await f("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(simbol) + "?range=1y&interval=1d", { headers: { ...UA, cookie }, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) { cacheBare[simbol] = { la: acum(), v: null }; salveazaBare(); return null; }
      if (!r.ok) throw new Error("Yahoo HTTP " + r.status);
      const js = await r.json(), j = js && js.chart && js.chart.result && js.chart.result[0];
      if (!j) { cacheBare[simbol] = { la: acum(), v: null }; salveazaBare(); return null; }
      const q = (j.indicators && j.indicators.quote && j.indicators.quote[0]) || {}, ts = j.timestamp || [], v = [];
      ts.forEach((t, i) => { const o = q.open && q.open[i], h = q.high && q.high[i], l = q.low && q.low[i], cl = q.close && q.close[i];
        if (typeof t === "number" && [o, h, l, cl].every((x) => typeof x === "number")) v.push({ t: t * 1000, o, h, l, c: cl, v: (q.volume && q.volume[i]) || 0 }); });
      cacheBare[simbol] = { la: acum(), v }; salveazaBare(); await pauza(pauzaMs); return v;
    },
```

- [ ] **Step 4:** `node scripts/proba-sltp.mjs` → PASS 5/5; `node scripts/proba-v982.mjs` → PASS (closes neatins).
- [ ] **Step 5: Commit** `feat(colector): yahooExtra.bare - lumanari zilnice pe 1 an, cache 6 h (poza-bare.json)` + push.

### Task 3: colectorul trimite nivelurile (pozitii + urmarite), v101.0, repornit

**Files:**
- Modify: `crypto/scripts/colector.mjs` (`creeazaYahooExtra` cu `fisierBare`; `pozitiiPentruPoza` pune `niveluri: n`; `simboluriPentruPoza` cere `bare` și calculează; `VERSIUNE_COLECTOR`)

**Interfaces:**
- Consumes: `sugestiePoza` (Task 1, prin `construiestePoza`), `yahooExtra.bare` (Task 2), `ActiuniSemnale.niveluri` (existent, `colector.mjs:112`).

- [ ] **Step 1:** Edit `colector.mjs`:
   - `const yahooExtra = creeazaYahooExtra({ fisier: path.join(DATA, "poza-ext.json"), fisierBare: path.join(DATA, "poza-bare.json"), jurnal });`
   - în `pozitiiPentruPoza`, în `out.push({ ...p, sursa, extra, …`: adaugă `niveluri: n,` (variabila `n` există deja: `ActiuniSemnale.niveluri(bare, p.pret, { pretMediu, maxDupaCumparare: mx, minTrail: 0.15 })`; e `null` fără bare).
   - în `simboluriPentruPoza`, după `try { e = … }`:

```js
    // v101 (SL/TP pe alerts): nivelurile Radarului din lumanarile simbolului LISTAT (la dublurile germane in €, nu ale companiei din SUA)
    let niveluri = null;
    try { const b = await yahooExtra.bare(s.s), pr = c && c.pret != null ? c.pret : (b && b.length ? b[b.length - 1].c : null); if (b && pr) niveluri = ActiuniSemnale.niveluri(b, pr, {}); } catch (err) { jurnal("poza: bare", s.s, err.message); }
```
     și în `out.push({ s: s.s, …, extra: e` adaugă `, niveluri`.
   - `const VERSIUNE_COLECTOR = "v101.0";`
- [ ] **Step 2:** `node --check scripts/colector.mjs`; `npm test` → exit 0.
- [ ] **Step 3: Commit** `feat(colector): SL/TP sugerat in poza la pozitii si la simbolurile urmarite (v101.0)` + push.
- [ ] **Step 4: Repornire** — PowerShell: `Stop-Process` pe PID-ul din `data/colector.pid`, `Start-Process node scripts\colector.mjs -WorkingDirectory C:\Users\Cimin\crypto -WindowStyle Hidden -PassThru`; probă că A PORNIT (proces viu + „pornit, PID …” în `data/colector.log`).
- [ ] **Step 5: Poza reală** — după prima „poza: urcata” nouă: `kv key get poza` (wrangler din `busola`) ⇒ fiecare `t212[i].sugestie` (ECHO poate fi null dacă T212 n-a dat bare) și `simboluri[i].sugestie` cu aceleași cifre ca demo-ul (`scratchpad/demo-slt/date.json`) ± mișcarea prețului; mărimea pozei.

### Task 4: pagina — SL / TP la Trading 212 (bara, eticheta, dovada)

**Files:**
- Modify: `premarket_scanner/lib/radar-ecran.js` (`sltpT212`, `baraSLTP`, `etSLTP`, `dovadaSLTP`; `randT212` + capul tabelului)
- Modify: `premarket_scanner/lib/radar-ui.css` (bara, etichete, telefon; scoase regulile `c-stop` / `c-tinta` devenite moarte)
- Test: `premarket_scanner/tools/radar-ecran.test.mjs`

**Interfaces:**
- Consumes: `poza.t212[i].plan = { stop, tinta, max, trailPct }`, `poza.t212[i].sugestie` (Task 1), `mediu`, `pret` (existente); helperii paginii `bani(v, m)`, `pct(v, z)`, `nr`, `esc`, `cls`.
- Produces: `RadarEcran.sltpT212(p)` → `{ sl, tp, intr, intrEt, sursa: "plan"|"sugerat", orient:false } | null`; `RadarEcran.baraSLTP(o, pret, moneda)` → HTML (`<div class="bara…">`); `RadarEcran.sltpSimbol(s)` (Task 5).

- [ ] **Step 1: Testele care pică** (Write/append în `radar-ecran.test.mjs`):

```js
// v129 (spec 2026-09-28-sl-tp-pe-alerts): SL / TP pe pagina alerts
test('v129: sltpT212 - planul bate sugestia; fara plan = sugerat; fara nimic = null (poza veche)', () => {
  const sg = { stop: 90, tinta: 130, k: 2, riscPct: 0.1, trend: 'sus', proba: { n: 100, pePlus: 0.55, medie: 0.02 } };
  assert.deepStrictEqual(RadarEcran.sltpT212({ mediu: 100, plan: { stop: 85, tinta: 120 }, sugestie: sg }), { sl: 85, tp: 120, intr: 100, intrEt: 'prețul tău mediu', sursa: 'plan', orient: false });
  assert.strictEqual(RadarEcran.sltpT212({ mediu: 100, plan: null, sugestie: sg }).sursa, 'sugerat');
  assert.strictEqual(RadarEcran.sltpT212({ mediu: 100, plan: { stop: 85, tinta: null }, sugestie: sg }).tp, 130, 'plan fara tinta: tinta sugerata');
  assert.strictEqual(RadarEcran.sltpT212({ mediu: 100, plan: null }), null);
});
test('v129: baraSLTP - procentele, punctul, SUB STOP / ȚINTĂ ATINSĂ, ultimul sfert colorat, fara impartire la zero', () => {
  const o = { sl: 90, tp: 130, intr: 100, intrEt: 'prețul tău mediu' };
  const h = RadarEcran.baraSLTP(o, 110, '$');
  assert.match(h, /SL <b>\$90,00<\/b>/); assert.match(h, /TP <b>\$130,00<\/b>/); assert.match(h, /−18,2% până la SL/); assert.match(h, /\+18,2% până la TP/); assert.match(h, /prețul tău mediu \$100,00/);
  assert.match(RadarEcran.baraSLTP(o, 88, '$'), /SUB STOP/); assert.match(RadarEcran.baraSLTP(o, 88, '$'), /sub SL cu 2,3%/);
  assert.match(RadarEcran.baraSLTP(o, 131, '$'), /ȚINTĂ ATINSĂ/);
  assert.match(RadarEcran.baraSLTP(o, 92, '$'), /class="punct r"/, 'ultimul sfert spre SL = rosu'); assert.match(RadarEcran.baraSLTP(o, 125, '$'), /class="punct v"/);
  assert.strictEqual(RadarEcran.baraSLTP({ sl: 100, tp: 100 }, 100, '$'), '', 'SL = TP: nimic'); assert.strictEqual(RadarEcran.baraSLTP({ sl: 90, tp: null }, 100, '$'), '');
  assert.doesNotMatch(RadarEcran.baraSLTP(o, 110, '$'), /NaN|undefined|Infinity/);
});
test('v129: la T212 coloana „SL ← acum → TP” inlocuieste Stop + Tinta; eticheta PLANUL TĂU / SUGERAT; dovada; regula care pierde spusa pe fata', () => {
  const el = { innerHTML: '', addEventListener() {}, dataset: {} };
  const poza = POZA_BAZA();
  poza.t212[0].sugestie = { stop: 320, tinta: 409, k: 3, riscPct: 0.083, trend: 'jos', proba: { n: 105, pePlus: 0.41, medie: 0.0202 } };
  poza.t212.push(Object.assign(JSON.parse(JSON.stringify(POZ_AVGO)), { s: 'UHS', plan: null, mediu: 184.51, pret: 178.8, sugestie: { stop: 157.15, tinta: 197.47, k: 1.5, riscPct: 0.052, trend: 'lateral', proba: { n: 42, pePlus: 0.262, medie: -0.0241 } } }));
  RadarEcran.randeaza(el, poza, O(poza));
  assert.match(el.innerHTML, /<th>SL ← acum → TP<\/th>/); assert.doesNotMatch(el.innerHTML, /<th>Stop din plan<\/th>|<th>Țintă<\/th>/);
  assert.match(el.innerHTML, /class="slEt plan">PLANUL TĂU/); assert.match(el.innerHTML, /class="slEt sug">SUGERAT/);
  assert.match(el.innerHTML, /Pe istoricul UHS regula asta a pierdut în medie/); assert.match(el.innerHTML, /colspan="9"/);
  const vechi = POZA_BAZA(); delete vechi.t212[0].sugestie; vechi.t212[0].plan = null; RadarEcran.randeaza(el, vechi, O(vechi));
  assert.match(el.innerHTML, /fără plan/, 'poza veche fara sugestie: „fără plan” ca inainte');
});
```

- [ ] **Step 2:** `node --test tools/radar-ecran.test.mjs` → cele 3 noi PICĂ.
- [ ] **Step 3: Implementarea** (fișier de patch prin Write, rulat cu node; ancore verificate cu număr exact):
   - funcțiile pure, înainte de `// ---------- Trading 212 ----------`:

```js
  // v129 (spec 2026-09-28-sl-tp-pe-alerts): SL / TP - planul lui bate sugestia Radarului (poza.t212[].sugestie, colector v101)
  function sltpT212(p) {
    var pl = p && p.plan && nr(p.plan.stop) !== null ? p.plan : null, sg = p && p.sugestie && nr(p.sugestie.stop) !== null && nr(p.sugestie.tinta) !== null ? p.sugestie : null;
    if (pl) return { sl: nr(pl.stop), tp: nr(pl.tinta) !== null ? nr(pl.tinta) : sg ? sg.tinta : null, intr: nr(p.mediu), intrEt: 'prețul tău mediu', sursa: 'plan', orient: false };
    if (sg) return { sl: sg.stop, tp: sg.tinta, intr: nr(p.mediu), intrEt: 'prețul tău mediu', sursa: 'sugerat', orient: false };
    return null;
  }
  function sltpSimbol(s) {
    var g = s && s.sugestie; if (!g || g.nivel || nr(g.stop) === null || nr(g.tinta) === null) return null;
    return { sl: g.stop, tp: g.tinta, intr: g.intrare ? nr(g.intrare.pret) : null, intrEt: 'intrare sugerată', sursa: g.intrare ? 'sugerat' : 'orientativ', orient: !g.intrare };
  }
  var SLET = { plan: 'PLANUL TĂU', sugerat: 'SUGERAT', orientativ: 'ORIENTATIV · TREND ÎN JOS' };
  function etSLTP(o) { return o ? '<span class="slEt ' + (o.sursa === 'plan' ? 'plan' : o.sursa === 'sugerat' ? 'sug' : 'orient') + '">' + SLET[o.sursa] + '</span>' : ''; }
  // bara SL <- acum -> TP: scala [min(SL, pret), max(TP, pret)]; f = (pret - SL) / (TP - SL); punctul r = ultimul sfert spre SL (sau sub), v = spre TP
  function baraSLTP(o, pret, m) {
    var sl = o ? nr(o.sl) : null, tp = o ? nr(o.tp) : null, p = nr(pret);
    if (sl === null || tp === null || p === null || !(tp > sl)) return '';
    var lo = Math.min(sl, p), hi = Math.max(tp, p), span = hi - lo, X = function (v) { return ((v - lo) / span * 100).toFixed(1); };
    var f = (p - sl) / (tp - sl), cul = p <= sl || f < 0.25 ? 'r' : f > 0.75 ? 'v' : 'n', lat = (tp - sl) / span * 100;
    var semn = p <= sl ? '<span class="slAlarma">SUB STOP</span>' : p >= tp ? '<span class="slAlarma v">ȚINTĂ ATINSĂ</span>' : '';
    return '<div class="bara' + (o.orient ? ' orient' : '') + '"><div class="slCap"><span class="slSL">SL <b>' + bani(sl, m) + '</b>' + semn + '</span><span class="slTP">TP <b>' + bani(tp, m) + '</b></span></div>'
      + '<div class="pista"><i class="zSL" style="left:' + X(sl) + '%;width:' + (lat / 4).toFixed(1) + '%"></i><i class="zTP" style="left:' + (X(tp) - lat / 4).toFixed(1) + '%;width:' + (lat / 4).toFixed(1) + '%"></i>'
      + (nr(o.intr) !== null ? '<i class="intr" style="left:' + X(o.intr) + '%"></i>' : '') + '<i class="punct ' + cul + '" style="left:' + X(p) + '%"></i></div>'
      + '<div class="slJos"><span class="bad">' + (p <= sl ? 'sub SL cu ' + pct(sl / p - 1).replace(/^[+−]/, '') : pct(sl / p - 1) + ' până la SL') + '</span>'
      + '<span class="slMij">' + (nr(o.intr) !== null ? '│ ' + esc(o.intrEt) + ' ' + bani(o.intr, m) : '') + '</span>'
      + '<span class="good">' + (p >= tp ? 'peste TP' : pct(tp / p - 1) + ' până la TP') + '</span></div></div>';
  }
  // dovada sugestiei: k x volatilitatea, pe ultimul an n intrari, % pe plus, media dupa comision; media negativa spusa pe fata
  function dovadaSLTP(g, sim) {
    if (!g || !g.proba || nr(g.proba.n) === null) return '';
    var pr = g.proba, rau = nr(pr.medie) !== null && pr.medie < 0;
    return '<p style="margin:0">Stop la <b>' + String(g.k).replace('.', ',') + ' × volatilitatea zilnică</b> a ' + esc(sim) + (nr(g.riscPct) !== null ? ' (≈ ' + pct(-g.riscPct) + ' de la intrare)' : '') + ', ținta la dublu.</p>'
      + '<p style="margin:6px 0 0">Pe ultimul an: <b>' + pr.n + ' intrări</b>, <b>' + Math.round((pr.pePlus || 0) * 100) + ' % pe plus</b>, în medie <b class="' + (rau ? 'bad' : 'good') + '">' + pct(pr.medie) + '</b> pe trade, după comision (ieșire la SL, la TP sau după 20 de zile).'
      + (rau ? ' <b class="bad">Pe istoricul ' + esc(sim) + ' regula asta a pierdut în medie</b> — stopul rămâne o limită de risc, nu o promisiune.' : '') + '</p>';
  }
```
   - în `randT212`: după `o = o || {}; …` adaugă `var sx = sltpT212(p);`; în prima celulă, după `'<b>' + esc(p.s) + '</b>'` adaugă `+ ' ' + etSLTP(sx)`; înlocuiește cele două celule `c-stop` + `c-tinta` cu:
     `+ '<td class="c-sltp" data-et="SL / TP">' + (sx ? baraSLTP(sx, a.pret, '$') : '<span class="plan">fără plan</span><span class="mic">sugestia vine cu poza următoare</span>') + '</td>'`
     (`a.pret` = prețul de acum deja calculat în rând); `colspan="10"` → `colspan="9"` (doar în `randT212`); în rândul desfăcut, după blocul „Planul tău, din Radar”: `+ (p.sugestie && p.sugestie.proba ? '<div><h4>' + (sx && sx.sursa === 'plan' ? 'Ce ar fi sugerat Radarul' : 'De ce acest SL / TP') + '</h4>' + dovadaSLTP(p.sugestie, p.s) + '</div>' : '')`.
   - în capul tabelului T212: `<th>Stop din plan</th><th>Țintă</th>` → `<th>SL ← acum → TP</th>`.
   - în `return { … }` al modulului: `, sltpT212: sltpT212, sltpSimbol: sltpSimbol, baraSLTP: baraSLTP`.
   - CSS (`radar-ui.css`, la final, sub `body.al-page .rad`):

```css
/* v129: SL <- acum -> TP (spec 2026-09-28-sl-tp-pe-alerts; ca in demo GQVS4jd1nbqSoN1tCNJMCz) */
body.al-page .rad td.c-sltp{min-width:300px;width:34%}
body.al-page .rad .bara{position:relative;padding-top:17px;min-width:0}
body.al-page .rad .slCap{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);white-space:nowrap}
body.al-page .rad .slCap .slSL b{color:var(--bad)}body.al-page .rad .slCap .slTP b{color:var(--good)}
body.al-page .rad .slAlarma{margin-left:6px;font-size:10.5px;font-weight:800;color:var(--bad);border:1px solid var(--bad);border-radius:5px;padding:0 5px}
body.al-page .rad .slAlarma.v{color:var(--good);border-color:var(--good)}
body.al-page .rad .pista{position:relative;height:10px;border-radius:6px;background:var(--panel3)}
body.al-page .rad .bara.orient .pista{background:repeating-linear-gradient(90deg,var(--panel3) 0 6px,transparent 6px 10px)}
body.al-page .rad .pista .zSL,body.al-page .rad .pista .zTP{position:absolute;top:0;bottom:0}
body.al-page .rad .pista .zSL{background:rgba(255,107,120,.22);border-radius:6px 0 0 6px}body.al-page .rad .pista .zTP{background:rgba(85,216,155,.2);border-radius:0 6px 6px 0}
body.al-page .rad .pista .intr{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--text);opacity:.55}
body.al-page .rad .pista .punct{position:absolute;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid var(--bg);color:var(--text);background:currentColor;box-shadow:0 0 0 2px currentColor}
body.al-page .rad .pista .punct.r{color:var(--bad)}body.al-page .rad .pista .punct.v{color:var(--good)}
body.al-page .rad .slJos{display:flex;justify-content:space-between;gap:10px;margin-top:6px;font-size:12px;white-space:nowrap}
body.al-page .rad .slJos .slMij{color:var(--muted);font-size:11.5px;overflow:hidden;text-overflow:ellipsis}
body.al-page .rad .slEt{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;border-radius:6px;padding:1px 7px;margin-left:6px;vertical-align:middle}
body.al-page .rad .slEt.plan{color:var(--muted);border:1px solid var(--line);background:rgba(144,160,182,.12)}
body.al-page .rad .slEt.sug{color:var(--accent);border:1px solid rgba(79,209,197,.45);background:rgba(79,209,197,.14)}
body.al-page .rad .slEt.orient{color:var(--muted);border:1px dashed var(--none)}
@media (max-width:640px){body.al-page .rad .poz tr.rand td.c-sltp{grid-column:1/-1;min-width:0;width:auto;margin-top:4px}body.al-page .rad .slJos .slMij{display:none}}
```
     și scoate din regulile de telefon selectorii `td.c-stop`, `td.c-tinta` (devin moarte; verifică cu grep că nu-i mai folosește nimic).
- [ ] **Step 4:** `node --test tools/radar-ecran.test.mjs` → PASS (vechile + 3 noi); `node --test tools/*.test.mjs` → 2 picate (cele știute, proxy).
- [ ] **Step 5: Commit** `feat(alerts): SL <- acum -> TP la Trading 212 (planul tau sau sugerat), cu dovada` + push (fără bump — vine în Task 5).

### Task 5: pagina — simbolurile urmărite, fixture, versiuni, publicare

**Files:**
- Modify: `premarket_scanner/lib/radar-ecran.js` (`randSimbol`, capul tabelului „Simbolurile tale”)
- Modify: `premarket_scanner/lib/radar-ui.css` (`td.c-ist`, telefon)
- Modify: `premarket_scanner/tools/fixtures/poza-radar.json` (`sugestie` din `scratchpad/demo-slt/date.json`)
- Modify: `premarket_scanner/tools/proba-ecran-alerts.mjs` (verificare nouă), `tools/radar-ecran.test.mjs`, `tools/alerts-radar.test.mjs` (badge v129)
- Modify: `alerts/index.html` (badge v129, `?v=839` pe cele 3 module), `sw-app.js` (`tt-v839-2026-09-28`) + `node tools/sync-suite-version.mjs`

**Interfaces:**
- Consumes: `sltpSimbol`, `baraSLTP`, `etSLTP`, `dovadaSLTP` (Task 4); `poza.simboluri[i].sugestie` (Task 1).

- [ ] **Step 1: Testul care pică** (append):

```js
test('v129: Simbolurile tale - „SL ← intrare → TP” + „Pe istoric”; trend in jos = ORIENTATIV; fara-date = motivul; fara sugestie = gol, fara exceptie', () => {
  const el = { innerHTML: '', addEventListener() {}, dataset: {} };
  const poza = POZA_BAZA();
  poza.simboluri = [
    { s: 'INTC', pret: 115.46, prev: 116, closes30: [100, 115.46], sugestie: { intrare: { pret: 112.05, motiv: 'retragere spre media pe 20 de zile (ordin limită), nu după mișcare' }, stop: 94.73, tinta: 146.69, k: 3, riscPct: 0.15, trend: 'sus', proba: { n: 140, pePlus: 0.571, medie: 0.0703 } } },
    { s: 'RHM.DE', moneda: '€', pret: 966.3, prev: 980, closes30: [], sugestie: { intrare: null, stop: 917.3, tinta: 1064.29, k: 1.5, riscPct: 0.051, trend: 'jos', proba: { n: 141, pePlus: 0.248, medie: -0.0255 } } },
    { s: 'NOU', pret: 10, closes30: [], sugestie: { nivel: 'fara-date', motiv: 'prea puține zile de prețuri (60 din 120)' } },
    { s: 'VECHI', pret: 10, closes30: [] }];
  RadarEcran.randeaza(el, poza, O(poza, { simboluri: poza.simboluri.map(function (x) { return { s: x.s }; }) }));
  assert.match(el.innerHTML, /<th>SL ← intrare → TP<\/th><th>Pe istoric<\/th>/);
  assert.match(el.innerHTML, /intrare sugerată \$112,05/); assert.match(el.innerHTML, /class="slEt orient">ORIENTATIV · TREND ÎN JOS/); assert.match(el.innerHTML, /bara orient/);
  assert.match(el.innerHTML, /prea puține zile de prețuri \(60 din 120\)/);
  assert.match(el.innerHTML, /<b class="bad">−2,6%<\/b><span class="mic">25 % pe plus · 141 intrări/, 'pe istoric: rosu cand pierde');
  assert.doesNotMatch(el.innerHTML, /NaN|undefined/);
});
```

- [ ] **Step 2:** `node --test tools/radar-ecran.test.mjs` → testul nou PICĂ.
- [ ] **Step 3: Implementarea** (patch prin Write):
   - în `randSimbol`, după prima linie: `var sx = sltpSimbol(s), g = s.sugestie || null, pr = g && g.proba ? g.proba : null;`
   - după celula `c-spark` (30 de zile), două celule:
     `+ '<td class="c-sltp" data-et="SL / TP">' + (sx ? baraSLTP(sx, j.pret, j.moneda) : '<span class="muted">' + esc(g && g.nivel ? g.motiv : cuCheie ? 'vine cu poza următoare' : 'cere cheia') + '</span>') + '</td>'`
     `+ '<td class="c-ist" data-et="Pe istoric">' + (pr && nr(pr.medie) !== null ? '<b class="' + (pr.medie < 0 ? 'bad' : 'good') + '">' + pct(pr.medie) + '</b><span class="mic">' + Math.round((pr.pePlus || 0) * 100) + ' % pe plus · ' + pr.n + ' intrări</span>' : '<span class="muted">—</span>') + '</td>'`
   - lângă numele simbolului: `+ ' ' + etSLTP(sx)`; `colspan="8"` → `colspan="10"` (doar în `randSimbol`); în rândul desfăcut, primul bloc: `(g && !g.nivel ? '<div><h4>' + (g.intrare ? 'Intrarea sugerată' : 'De ce e orientativ') + '</h4><p style="margin:0">' + (g.intrare ? esc(g.intrare.motiv) + ': <b>' + bani(g.intrare.pret, j.moneda) + '</b> (' + pct(g.intrare.pret / j.pret - 1) + ' de acum).' : 'Trend în jos pe zilnice: la acțiuni cumperi doar long, deci Radarul așteaptă întoarcerea. SL și TP sunt socotite de la prețul de acum, doar ca să vezi distanțele.') + '</p></div><div><h4>De ce acest SL / TP</h4>' + dovadaSLTP(g, s.s) + '</div>' : '')`.
   - capul tabelului: după `<th class="c-spark">30 de zile</th>` → `<th>SL ← intrare → TP</th><th>Pe istoric</th>`.
   - CSS: `body.al-page .rad td.c-ist{text-align:right;white-space:nowrap}` + în `@media (max-width:640px)`: `body.al-page .rad .poz tr.rand td.c-ist{text-align:left}`.
   - fixture: `node` care citește `scratchpad/demo-slt/date.json` și pune `sugestie` pe `t212[]` (din `pozitii[].sug`, cu `stop/tinta/k/riscPct/trend/proba`) și pe `simboluri[]` (din `urmarite[].sug`), potrivite după simbol; assert că fiecare simbol din fixture și-a găsit perechea sau rămâne fără (ECHO).
   - `proba-ecran-alerts.mjs`: verificare nouă — la 1920 și 390: `#radT212 .bara` = numărul pozițiilor cu sugestie/plan, `#radSimboluri .bara` > 0, nimic nu derulează lateral, zero excepții.
   - versiuni: badge `v129`, `?v=839` pe `radar-ui.css` / `radar-poza.js` / `radar-ecran.js`, `CACHE_VERSION = 'tt-v839-2026-09-28'`, `tools/alerts-radar.test.mjs` (`verBadge">v129<`), apoi `node tools/sync-suite-version.mjs` și verificarea că diferențele din afara fișierelor mele sunt DOAR versiuni.
- [ ] **Step 4:** `node --test tools/*.test.mjs` → doar cele 2 proxy știute; `python -m http.server 8777` + `node tools/proba-ecran-alerts.mjs` → PASS; serverul de probă oprit.
- [ ] **Step 5: Commit** `feat(alerts): SL/TP si la simbolurile urmarite, cu „Pe istoric” (v129 / tt-v839)` + push; `gh run watch` pe „Deploy GitHub Pages”; badge-ul live = v129.

### Task 6: verificarea pe viu, lângă demo

- [ ] **Step 1:** pagina publicată, browser curat cu cheia de citire (`scratchpad/alerts-real.mjs`), la 1920 și 390: numărul de bare, etichetele (7 × PLANUL TĂU la T212 azi), SUB STOP la APLD dacă e încă sub stop, zero excepții, fără derulare laterală.
- [ ] **Step 2:** pozele pagini lângă pozele demo-ului (`scratchpad/demo-slt/demo-1920.png`, `demo-390.png`); lista scrisă a diferențelor rămase — zero neexplicate.
- [ ] **Step 3:** cifrele de pe pagină (SL / TP / pe istoric) = cele din poza reală (KV) pentru 3 simboluri.
- [ ] **Step 4:** memoria (`project_pret_live_bot_28_09.md` + `MEMORY.md`), apoi răspunsul pentru el: ce vede, ce a ieșit din cifre, ce a rămas (4, 5, 6).
