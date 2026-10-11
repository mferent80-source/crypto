# Lățimea pieței pe 150 perp-uri + pânda în Sugestii — planul de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (regula lui Marius, 24.09: lucrez DIRECT, nu lanț de agenți; o revizie cu agent nou la final). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Radarul calculează singur lățimea pieței pe 150 de perp-uri Binance (regim, sus/jos, conturile mari, extreme), o arată ca rând în „Ce spune piața acum” și ca bloc „pânda” în Sugestii, iar PAZNIC poate fi oprit după o comparație de 2–3 zile.

**Architecture:** un modul pur `public/lib/latime.js` (global `Latime`, folosit de pagină, de colector prin `incarca()` și de probe prin vm) ține formulele copiate din `PAZNIC-CRYPTO/decizie.mjs`; o tură nouă a colectorului `scripts/lib/tura-latime.mjs` aduce datele direct de la Binance (bare la 15 min, serii la oră) și scrie o singură cheie în KV-ul LOCAL prin `/api/istoric-bot?action=latime`; pagina citește cheia o dată la 10 min (Tablou) și la deschiderea paginii Sugestii.

**Tech Stack:** Node 22 ESM (colector, probe cu `node:assert/strict` + `node:vm`), Cloudflare Pages Functions rulate local de `wrangler pages dev` pe `:8788` cu KV `ISTORIC` persistat pe disc, pagină vanilla JS (fără bundler), Chrome headless prin CDP pentru poze.

**Spec:** `docs/superpowers/specs/2026-10-11-latimea-pietei-si-panda-design.md` — cu două corecturi aplicate în Task 1 (KV-ul e local, nu Cloudflare ⇒ fără cotă de scrieri; „PC oprit” = tot Radarul oprit; direcția PAZNIC cere și prețul de partea EMA 21).

## Global Constraints

- Versiuni: Radar **v100.150** (`BUILD_INFO.json` `version` + `badge`; `public/index.html` liniile cu `v100.149`: meta `app-version`, badge-ul, antetul `#antetVersiune`, `#healthAppVersion`; `public/sw.js` `CACHE="crypto-radar-v100-150"`), colector **`VERSIUNE_COLECTOR = "v101.93"`** (`scripts/colector.mjs:51`).
- Praguri copiate din `PAZNIC-CRYPTO/decizie.mjs` `PRAGURI` (11.10.2026): `volPctl 90, extPctl 90, adrConsumat 90, fundPctlSus 75, fundPctlJos 25, oiPctl 95, emaRapid 21, emaLent 55, atrLen 14, pctlBare 564, minZileListate 10, nSimboluri 150, paralel 5`; `REGIM_LARG = 65` (`decizie.mjs:2708`); `verdictPiata`: buget epuizat ≥ 60 %, volatilitate extremă ≥ 40 % (`decizie.mjs:2720-2723`).
- Direcția = `decizie.mjs:591-595`: `SUS` când `EMA21 > EMA55 && pret > EMA21`; `JOS` când `EMA21 < EMA55 && pret < EMA21`; altfel `neclara`; sub 100 de bare de 4h ⇒ `neclara` (`permisiune()` cere `b4.length ≥ 100`, `b1d.length ≥ 16`).
- `percentila(sir, v)` = rangul median, `null` sub 30 de valori (`decizie.mjs:389-395`); `ema` (`:397`), `atrSerie` (`:405`) copiate la literă.
- Texte: română cu diacritice, virgula zecimală, minusul „−”, **o singură zecimală** la rezultate, fără cuvântul „predicție”; titlul rândului ≤ 60 de semne.
- Comentarii: niciodată `//` lipit după cod la mijlocul rândului (`scripts/garda-comentarii.mjs` pică suita).
- Git: `npm test && git push` (niciodată `;`); commit-uri convenționale `feat(radar): v100.150 …`; push doar după revizie (Task 9). Memorie după fiecare task (`project_paznic_in_radar_11_10.md`).
- Nimic din PAZNIC nu se oprește în planul ăsta; oprirea e decizia lui după comparație (I-587).

## Review Focus

1. **Monedă nouă (sub 100 de bare de 4h) sau cu serie lipsă** ⇒ `dir = "neclara"`, nu intră în `sus`/`jos`, se numără în `neclar`/`lipsa`; `incomplet` la > 20 % lipsă ⇒ text „pe N din 150”. (Task 1: `latimea` cu rânduri `null`; Task 3: moneda cu `klines` picat.)
2. **Universul gol** (Binance schimbă un nume de câmp) ⇒ tura se oprește cu `eroare` în jurnal și în KV, NU cade pe „orice *USDT”. (Task 3.)
3. **Bot neutru / fără bot / regim AMESTECAT** ⇒ rândul e `info`; `atentie` DOAR la LARG contra direcției botului, buget ≥ 60 %, vol ≥ 40 %. (Task 1 `textCitire`.)
4. **Valoare veche** (colectorul oprit, serverul merge) ⇒ „veche, de la HH:MM” cu clasa `vechi` la > 45 min; lipsă ⇒ „aștept lățimea pieței (vine o dată la 15 minute)”. (Task 1, Task 4.)
5. **POST răuvoitor sau stricat** (sym cu caractere ciudate, 500 de monede, texte libere, numere infinite) ⇒ 400 / 413, nimic scris. (Task 2.)

---

### Task 1: modulul pur `Latime` + corecturile din spec

**Files:**
- Create: `public/lib/latime.js`
- Create: `scripts/proba-v100150.mjs` (partea A; părțile B–D se adaugă în Task 2, 4, 5)
- Modify: `docs/superpowers/specs/2026-10-11-latimea-pietei-si-panda-design.md` (§1 „Publicarea”, §2a, §6)

**Interfaces (produce):**
```js
Latime.PRAGURI                                   // obiectul de mai sus + REGIM_LARG: 65
Latime.percentila(sir, v) -> 0..100 | null
Latime.ema(vals, len) -> number[]; Latime.atrSerie(bare, len) -> number[]
Latime.directia(inchideri, P) -> { dir: "SUS"|"JOS"|"neclara", eR, eL }
Latime.zileDir(inchideri, P) -> number            // bare consecutive cu același semn EMA21−EMA55, ÷ 6, floor
Latime.masuraMoneda(i, P) -> rand | null          // i = { sym, pret, b4, b1d, frAcum, fundIst, oiSerie, mari, mici, taker }
   rand = { sym, pret, dir, zileDir, volPctl, extPctl, adrUsed, frAcum, fundPctl, oiChg, oiPctl, lMari, lMici, diverg, deltaPctl }
Latime.latimea(randuri, P) -> { n, sus, jos, neclar, lipsa, bugetEpuizat, volExtrem, oiExtrem, fundExtrem, mariLong }
Latime.regimPietei(L) -> { cod: "LARG-SUS"|"LARG-JOS"|"AMESTECAT"|"NECUNOSCUT", pctSus, pctJos }
Latime.regimDeCand(istoric, acum) -> { ore, text }   // istoric = [{ la, cod }], text „de 3 zile” / „de 7 ore” / „de sub o oră”
Latime.textCitire(latime, bot, acum) -> { ce, stare, text, link: "sugestii", vechi }   // latime = { acum:{la,n,lipsa,incomplet,regim,lat}, istoric }
Latime.filtreaza(monede, filtru, botiSimboluri) -> monede[]   // filtru: toate|boti|contra|extreme|sus|jos
Latime.esteBotContra(dirBot, cod) -> boolean       // long + LARG-JOS, short + LARG-SUS
```

- [ ] **Step 1: scrie proba care pică (partea A)** — `scripts/proba-v100150.mjs`:

```js
// Proba v100.150 / colector v101.93 (11.10, el: „un tool, nu 10”): lățimea pieței pe 150 perp-uri (I-583), pânda în Sugestii (I-584),
// „SUS de N zile” (I-585), monedele boților CU / CONTRA (I-586). Formulele = PAZNIC-CRYPTO/decizie.mjs (percentila :389, ema :397,
// atrSerie :405, directia :591, permisiune :598, latimea :1641, regimPietei :2710, verdictPiata :2718).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.150 · lățimea pieței pe 150 perp-uri, pânda în Sugestii · proba\n");

const sandbox = (fisiere, extra) => { const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }, extra || {}); vm.createContext(ctx); for (const f of fisiere) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f }); return ctx; };
const L = sandbox(["latime.js"]).Latime;
const P = L.PRAGURI;
const ACUM = Date.UTC(2026, 9, 11, 8, 0, 0), H4 = 4 * 3600000, ZI = 86400000;

// bare de 4h: preț după o funcție, maximul/minimul ± 1 %
const bare4 = (n, f) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * H4, o: f(i), h: f(i) * 1.01, l: f(i) * 0.99, c: f(i) }));
const bare1d = (n, f) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * ZI, o: f(i), h: f(i) + 2, l: f(i) - 2, c: f(i) }));
const serie = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const intrari = (o) => Object.assign({
  sym: "BTCUSDT", pret: 100, b4: bare4(600, (i) => 100 + i * 0.05), b1d: bare1d(30, () => 100),
  frAcum: 0.0001, fundIst: serie(500, (i) => 0.0001 * (i % 10) / 10), oiSerie: serie(500, () => 1000),
  mari: serie(200, () => ({ longAccount: 0.62 })), mici: serie(200, () => ({ longAccount: 0.45 })), taker: serie(500, (i) => ({ buySellRatio: 0.9 + (i % 5) * 0.05 })),
}, o || {});

await test("PRAGURI = cele din PAZNIC (11.10.2026)", () => {
  assert.deepEqual([P.volPctl, P.extPctl, P.adrConsumat, P.fundPctlSus, P.fundPctlJos, P.oiPctl, P.emaRapid, P.emaLent, P.atrLen, P.pctlBare, P.minZileListate, P.nSimboluri, P.paralel, P.REGIM_LARG], [90, 90, 90, 75, 25, 95, 21, 55, 14, 564, 10, 150, 5, 65]);
});
await test("percentila: rangul median, null sub 30 de valori", () => {
  assert.equal(L.percentila(serie(100, (i) => i), 90), 90); assert.equal(L.percentila(serie(100, (i) => i), 200), 100);
  assert.equal(L.percentila(serie(10, (i) => i), 5), null); assert.equal(L.percentila(serie(100, () => 7), 7), 50);
});
await test("directia: SUS cere EMA21 > EMA55 ȘI prețul peste EMA21; JOS invers; altfel neclară; sub 100 bare neclară", () => {
  assert.equal(L.directia(serie(600, (i) => 100 + i), P).dir, "SUS");
  assert.equal(L.directia(serie(600, (i) => 700 - i), P).dir, "JOS");
  const urcaApoiCade = serie(600, (i) => i < 590 ? 100 + i : 690 - (i - 590) * 3);   // EMA21 încă peste EMA55, prețul sub EMA21
  assert.equal(L.directia(urcaApoiCade, P).dir, "neclara");
  assert.equal(L.directia(serie(99, (i) => 100 + i), P).dir, "neclara");
});
await test("zileDir: bare consecutive cu același semn EMA21−EMA55, împărțite la 6", () => {
  assert.equal(L.zileDir(serie(600, (i) => 100 + i), P), 99);   // tot istoricul (599 bare utile ÷ 6)
  const cotitura = serie(600, (i) => i < 540 ? 700 - i : 160 + (i - 540) * 4);   // ultimele 60 de bare urcă
  const z = L.zileDir(cotitura, P); assert.ok(z >= 5 && z <= 9, "cotitură de ~60 bare ⇒ 5–9 zile, nu " + z);
});
await test("masuraMoneda: percentilele pe fereastra de 564, bugetul zilei, poziționarea, delta; sub 100 bare ⇒ null", () => {
  const r = L.masuraMoneda(intrari(), P);
  assert.equal(r.sym, "BTCUSDT"); assert.equal(r.dir, "SUS"); assert.ok(r.volPctl >= 0 && r.volPctl <= 100);
  assert.equal(r.lMari, 62); assert.equal(r.lMici, 45); assert.equal(r.diverg, 17);
  assert.equal(r.adrUsed, 100, "range azi 4 ÷ media 4 = 100 %");
  assert.ok(r.fundPctl !== null && r.oiPctl !== null && r.deltaPctl !== null);
  assert.equal(L.masuraMoneda(intrari({ b4: bare4(90, () => 100) }), P), null);
  assert.equal(L.masuraMoneda(intrari({ b1d: bare1d(10, () => 100) }), P), null);
  const faraSerii = L.masuraMoneda(intrari({ fundIst: null, oiSerie: null, mari: null, mici: null, taker: null }), P);
  assert.equal(faraSerii.dir, "SUS"); assert.equal(faraSerii.fundPctl, null); assert.equal(faraSerii.lMari, null, "seria lipsă nu omoară rândul");
});
await test("latimea: numără pe praguri; rândurile null = lipsă; neclarele nu sunt nici sus, nici jos", () => {
  const rand = (o) => Object.assign({ sym: "X", dir: "SUS", adrUsed: 10, volPctl: 10, oiPctl: 10, fundPctl: 50, lMari: 40 }, o);
  const Lx = L.latimea([rand(), rand({ dir: "JOS", lMari: 70 }), rand({ dir: "neclara", adrUsed: 95, volPctl: 95, oiPctl: 99, fundPctl: 80 }), null, rand({ fundPctl: 10 })], P);
  assert.deepEqual(Lx, { n: 5, sus: 2, jos: 1, neclar: 1, lipsa: 1, bugetEpuizat: 1, volExtrem: 1, oiExtrem: 1, fundExtrem: 2, mariLong: 1 });
});
await test("regimPietei: LARG-SUS la ≥ 65 % sus, LARG-JOS la ≥ 65 % jos, altfel AMESTECAT; fără n ⇒ NECUNOSCUT", () => {
  assert.equal(L.regimPietei({ n: 150, sus: 136, jos: 9 }).cod, "LARG-SUS");
  assert.equal(L.regimPietei({ n: 100, sus: 20, jos: 65 }).cod, "LARG-JOS");
  assert.equal(L.regimPietei({ n: 100, sus: 50, jos: 40 }).cod, "AMESTECAT");
  assert.equal(L.regimPietei({ n: 0, sus: 0, jos: 0 }).cod, "NECUNOSCUT");
  assert.equal(Math.round(L.regimPietei({ n: 150, sus: 136, jos: 9 }).pctSus * 10) / 10, 90.7);
});
await test("regimDeCand: de când ține codul de acum, din istoric", () => {
  const ist = [{ la: ACUM - 5 * ZI, cod: "AMESTECAT" }, { la: ACUM - 3 * ZI, cod: "LARG-SUS" }, { la: ACUM - ZI, cod: "LARG-SUS" }, { la: ACUM - 900000, cod: "LARG-SUS" }];
  assert.equal(L.regimDeCand(ist, ACUM).text, "de 3 zile");
  assert.equal(L.regimDeCand([{ la: ACUM - 7 * 3600000, cod: "LARG-SUS" }], ACUM).text, "de 7 ore");
  assert.equal(L.regimDeCand([{ la: ACUM - 600000, cod: "LARG-SUS" }], ACUM).text, "de sub o oră");
  assert.equal(L.regimDeCand([], ACUM).text, "");
});
const latimeKv = (o) => Object.assign({ acum: { la: ACUM - 7 * 60000, n: 150, lipsa: 0, incomplet: false, regim: { cod: "LARG-SUS", pctSus: 90.7, pctJos: 6 }, lat: { n: 150, sus: 136, jos: 9, neclar: 5, lipsa: 0, bugetEpuizat: 16, volExtrem: 31, oiExtrem: 16, fundExtrem: 59, mariLong: 145 } }, istoric: [{ la: ACUM - 3 * ZI, cod: "LARG-SUS" }, { la: ACUM - 7 * 60000, cod: "LARG-SUS" }] }, o || {});
await test("textCitire: textul rândului, o zecimală nu e nevoie, vechimea; info implicit", () => {
  const r = L.textCitire(latimeKv(), { directie: "neutru" }, ACUM);
  assert.equal(r.ce, "Lățimea pieței (150 perp-uri)"); assert.equal(r.stare, "info"); assert.equal(r.link, "sugestii"); assert.equal(r.vechi, false);
  assert.equal(r.text, "larg SUS de 3 zile · 136 sus · 9 jos · conturile mari long pe 145 din 150 · funding extrem 59 · OI extrem 16 · acum 7 min");
});
await test("textCitire: atenție la LARG contra botului, la buget epuizat ≥ 60 %, la volatilitate extremă ≥ 40 %; neutru rămâne info", () => {
  assert.equal(L.textCitire(latimeKv(), { directie: "short" }, ACUM).stare, "atentie");
  assert.match(L.textCitire(latimeKv(), { directie: "short" }, ACUM).text, /riscul e corelat, nu diversificat/);
  assert.equal(L.textCitire(latimeKv(), { directie: "long" }, ACUM).stare, "info");
  assert.equal(L.textCitire(latimeKv({ acum: Object.assign(latimeKv().acum, { lat: Object.assign({}, latimeKv().acum.lat, { bugetEpuizat: 95 }) }) }), { directie: "long" }, ACUM).stare, "atentie");
  assert.equal(L.textCitire(latimeKv({ acum: Object.assign(latimeKv().acum, { lat: Object.assign({}, latimeKv().acum.lat, { volExtrem: 70 }) }) }), { directie: "neutru" }, ACUM).stare, "atentie");
  assert.equal(L.esteBotContra("long", "LARG-JOS"), true); assert.equal(L.esteBotContra("short", "LARG-SUS"), true); assert.equal(L.esteBotContra("neutru", "LARG-SUS"), false); assert.equal(L.esteBotContra("long", "AMESTECAT"), false);
});
await test("textCitire: incomplet ⇒ „pe N din 150”; veche > 45 min ⇒ „veche, de la HH:MM” + vechi; lipsă ⇒ aștept", () => {
  const inc = latimeKv({ acum: Object.assign(latimeKv().acum, { lipsa: 19, incomplet: true, n: 150 }) });
  assert.match(L.textCitire(inc, null, ACUM).text, /pe 131 din 150/);
  const veche = L.textCitire(latimeKv({ acum: Object.assign(latimeKv().acum, { la: ACUM - 50 * 60000 }) }), null, ACUM);
  assert.equal(veche.vechi, true); assert.match(veche.text, /veche, de la \d\d:\d\d/);
  const lipsa = L.textCitire(null, null, ACUM); assert.equal(lipsa.stare, "info"); assert.equal(lipsa.text, "aștept lățimea pieței (vine o dată la 15 minute)"); assert.equal(lipsa.link, null);
});
await test("filtreaza: toate / boți / contra mulțimii (|diverg| ≥ 15) / extreme / sus / jos; boții primii", () => {
  const m = [{ sym: "AAAUSDT", dir: "SUS", diverg: 2, volPctl: 10, oiPctl: 10, fundPctl: 50 }, { sym: "BBBUSDT", dir: "JOS", diverg: 20, volPctl: 10, oiPctl: 10, fundPctl: 50 }, { sym: "CCCUSDT", dir: "SUS", diverg: -16, volPctl: 95, oiPctl: 10, fundPctl: 50 }, { sym: "DDDUSDT", dir: "neclara", diverg: 0, volPctl: 10, oiPctl: 10, fundPctl: 20 }];
  assert.deepEqual(L.filtreaza(m, "toate", ["CCC"]).map((x) => x.sym), ["CCCUSDT", "AAAUSDT", "BBBUSDT", "DDDUSDT"]);
  assert.deepEqual(L.filtreaza(m, "boti", ["CCC"]).map((x) => x.sym), ["CCCUSDT"]);
  assert.deepEqual(L.filtreaza(m, "contra", []).map((x) => x.sym), ["BBBUSDT", "CCCUSDT"]);
  assert.deepEqual(L.filtreaza(m, "extreme", []).map((x) => x.sym), ["CCCUSDT", "DDDUSDT"]);
  assert.deepEqual(L.filtreaza(m, "sus", []).map((x) => x.sym), ["AAAUSDT", "CCCUSDT"]); assert.deepEqual(L.filtreaza(m, "jos", []).map((x) => x.sym), ["BBBUSDT"]);
});
await test("textele: diacritice, virgula zecimală, fără „predicție”", () => {
  const src = citeste("public", "lib", "latime.js");
  assert.doesNotMatch(src, /predic[țt]ie/i); assert.match(src, /lățimea/i);
});

console.log(`\n${teste - picate}/${teste} verzi\n`); if (picate) process.exit(1);
```

- [ ] **Step 2: rulează proba, trebuie să pice** — `node scripts/proba-v100150.mjs` ⇒ „Cannot read properties of undefined” la `L.PRAGURI` (fișierul `latime.js` lipsește ⇒ `citeste` aruncă ENOENT). Orice altceva decât un eșec clar ⇒ oprește-te, proba e greșită.

- [ ] **Step 3: scrie `public/lib/latime.js`** (global `var Latime`, fără `export`, stil ca `busola.js`):

```js
// Lățimea pieței pe 150 de perp-uri Binance (v100.150, I-583) + pânda (I-584) - modul PUR: pagina, colectorul (scripts/lib/tura-latime.mjs,
// prin incarca()) și probele (vm) rulează același cod. Formulele și pragurile sunt COPIATE din PAZNIC-CRYPTO/decizie.mjs (11.10.2026):
// percentila :389, ema :397, atrSerie :405, directiaDeFond (ramura ema) :591, permisiune :598, latimea :1641, REGIM_LARG :2708,
// regimPietei :2710, verdictPiata :2718 - ca cifrele să bată cu PAZNIC în comparația de 2-3 zile (I-587). Pragurile sunt IPOTEZE
// (trader.md): cine le mută, le mută cu mâna și le validează pe date de după.
var Latime = (function () {
  var PRAGURI = { volPctl: 90, extPctl: 90, adrConsumat: 90, fundPctlSus: 75, fundPctlJos: 25, oiPctl: 95, emaRapid: 21, emaLent: 55, atrLen: 14, pctlBare: 564, minZileListate: 10, nSimboluri: 150, paralel: 5, REGIM_LARG: 65, bugetEpuizatPct: 60, volExtremPct: 40, vechiMin: 45 };
  var fin = function (x) { return typeof x === "number" && isFinite(x); };
  function percentila(sir, v) {
    var bun = (sir || []).filter(fin); if (bun.length < 30 || !fin(v)) return null;
    var mici = 0, egale = 0; for (var i = 0; i < bun.length; i++) { if (bun[i] < v) mici++; else if (bun[i] === v) egale++; }
    return Math.round(100 * (mici + 0.5 * egale) / bun.length);
  }
  function ema(vals, len) { var k = 2 / (len + 1), e = vals[0], out = [e]; for (var i = 1; i < vals.length; i++) { e = vals[i] * k + e * (1 - k); out.push(e); } return out; }
  function atrSerie(bare, len) {
    var tr = bare.map(function (b, i) { return i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bare[i - 1].c), Math.abs(b.l - bare[i - 1].c)); });
    var out = [], s = 0;
    for (var i = 0; i < tr.length; i++) { s += tr[i]; if (i < len - 1) { out.push(NaN); continue; } if (i === len - 1) { out.push(s / len); continue; } out.push((out[i - 1] * (len - 1) + tr[i]) / len); }
    return out;
  }
  // decizie.mjs:591-595 - SUS cere și prețul peste EMA rapidă (nu doar EMA21 > EMA55), JOS invers; altfel neclară
  function directia(inchideri, P) {
    P = P || PRAGURI; if (!inchideri || inchideri.length < 100) return { dir: "neclara", eR: null, eL: null };
    var eR = ema(inchideri, P.emaRapid), eL = ema(inchideri, P.emaLent), acum = inchideri[inchideri.length - 1], r = eR[eR.length - 1], l = eL[eL.length - 1];
    return { dir: r > l && acum > r ? "SUS" : r < l && acum < r ? "JOS" : "neclara", eR: eR, eL: eL };
  }
  // I-585: câte bare de 4h la rând ține semnul EMA21 − EMA55 (prima bară nu se numără: EMA-urile pornesc egale)
  function zileDir(inchideri, P) {
    P = P || PRAGURI; if (!inchideri || inchideri.length < 2) return 0;
    var eR = ema(inchideri, P.emaRapid), eL = ema(inchideri, P.emaLent), n = inchideri.length, semn = Math.sign(eR[n - 1] - eL[n - 1]), c = 0;
    if (!semn) return 0;
    for (var i = n - 1; i >= 1; i--) { if (Math.sign(eR[i] - eL[i]) !== semn) break; c++; }
    return Math.floor(c / 6);
  }
  // permisiune() :598-660, doar partea de măsurare (fără permisiune, fără fișă)
  function masuraMoneda(d, P) {
    P = P || PRAGURI; var b4 = d && d.b4, b1d = d && d.b1d;
    if (!b4 || b4.length < 100 || !b1d || b1d.length < 16) return null;
    var inchideri = b4.map(function (b) { return b.c; }), atr = atrSerie(b4, P.atrLen), D = directia(inchideri, P), eL = D.eL;
    var fP = Math.max(50, P.pctlBare || b4.length);
    var atrPct = b4.map(function (b, i) { return fin(atr[i]) ? 100 * atr[i] / b.c : NaN; });
    var volPctl = percentila(atrPct.slice(-fP, -1), atrPct[atrPct.length - 1]);
    var extSerie = b4.map(function (b, i) { return fin(atr[i]) && atr[i] > 0 ? Math.abs(b.c - eL[i]) / atr[i] : NaN; });
    var extPctl = percentila(extSerie.slice(-fP, -1), extSerie[extSerie.length - 1]);
    var azi = b1d[b1d.length - 1], adr = b1d.slice(-15, -1).reduce(function (s, b) { return s + (b.h - b.l); }, 0) / 14, rangeAzi = azi.h - azi.l;
    var adrUsed = adr > 0 ? 100 * rangeAzi / adr : null;
    var fundPctl = Array.isArray(d.fundIst) && fin(d.frAcum) ? percentila(d.fundIst, d.frAcum) : null;
    var oiChg = null, oiPctl = null;
    if (Array.isArray(d.oiSerie) && d.oiSerie.length > 60) {
      var oi = d.oiSerie, abateri = oi.map(function (v, i) { if (i < 24) return NaN; var m = 0; for (var k = i - 24; k < i; k++) m += oi[k]; m /= 24; return m > 0 ? 100 * (v - m) / m : NaN; });
      oiChg = abateri[abateri.length - 1]; oiPctl = percentila(abateri.slice(0, -1), oiChg);
    }
    var lMari = null, lMici = null, diverg = null;
    if (Array.isArray(d.mari) && d.mari.length && Array.isArray(d.mici) && d.mici.length) { lMari = Math.round(100 * +d.mari[d.mari.length - 1].longAccount); lMici = Math.round(100 * +d.mici[d.mici.length - 1].longAccount); diverg = lMari - lMici; }
    var deltaPctl = null;
    if (Array.isArray(d.taker) && d.taker.length >= 60) { var rap = d.taker.map(function (x) { return +x.buySellRatio; }); deltaPctl = percentila(rap.slice(0, -1), rap[rap.length - 1]); }
    return { sym: d.sym, pret: fin(d.pret) ? d.pret : inchideri[inchideri.length - 1], dir: D.dir, zileDir: zileDir(inchideri, P), volPctl: volPctl, extPctl: extPctl, adrUsed: adrUsed, frAcum: fin(d.frAcum) ? d.frAcum : null, fundPctl: fundPctl, oiChg: oiChg, oiPctl: oiPctl, lMari: lMari, lMici: lMici, diverg: diverg, deltaPctl: deltaPctl };
  }
  // latimea() :1641 + fundExtrem (pragurile funding-ului din permisiune) + neclar / lipsa
  function latimea(randuri, P) {
    P = P || PRAGURI; var r = randuri || [], c = function (f) { return r.filter(function (x) { return x && f(x); }).length; };
    return { n: r.length, sus: c(function (x) { return x.dir === "SUS"; }), jos: c(function (x) { return x.dir === "JOS"; }), neclar: c(function (x) { return x.dir === "neclara"; }), lipsa: r.filter(function (x) { return !x; }).length,
      bugetEpuizat: c(function (x) { return x.adrUsed != null && x.adrUsed >= P.adrConsumat; }), volExtrem: c(function (x) { return x.volPctl != null && x.volPctl >= P.volPctl; }), oiExtrem: c(function (x) { return x.oiPctl != null && x.oiPctl >= P.oiPctl; }),
      fundExtrem: c(function (x) { return x.fundPctl != null && (x.fundPctl >= P.fundPctlSus || x.fundPctl <= P.fundPctlJos); }), mariLong: c(function (x) { return x.lMari != null && x.lMari > 50; }) };
  }
  function regimPietei(L) {
    if (!L || !L.n) return { cod: "NECUNOSCUT", pctSus: null, pctJos: null };
    var pctSus = 100 * L.sus / L.n, pctJos = 100 * L.jos / L.n;
    return { cod: pctSus >= PRAGURI.REGIM_LARG ? "LARG-SUS" : pctJos >= PRAGURI.REGIM_LARG ? "LARG-JOS" : "AMESTECAT", pctSus: pctSus, pctJos: pctJos };
  }
  function regimDeCand(istoric, acum) {
    var l = (istoric || []).filter(function (x) { return x && fin(x.la) && x.cod; }); if (!l.length) return { ore: null, text: "" };
    var cod = l[l.length - 1].cod, de = l[l.length - 1].la;
    for (var i = l.length - 1; i >= 0 && l[i].cod === cod; i--) de = l[i].la;
    var ore = (acum - de) / 3600000, zile = Math.floor(ore / 24);
    return { ore: ore, text: zile >= 1 ? "de " + TextRo.cate(zile, "zi", "zile") : ore >= 1 ? "de " + TextRo.cate(Math.floor(ore), "oră", "ore") : "de sub o oră" };
  }
  var regimText = { "LARG-SUS": "larg SUS", "LARG-JOS": "larg JOS", "AMESTECAT": "amestecată", "NECUNOSCUT": "necunoscută" };
  function esteBotContra(dirBot, cod) { var d = String(dirBot || "").toLowerCase(); return (d === "long" && cod === "LARG-JOS") || (d === "short" && cod === "LARG-SUS"); }
  var hhmm = function (t) { var d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  // rândul din „Ce spune piața acum” (Tablou) - aceeași funcție dă și antetul blocului din Sugestii
  function textCitire(latime, bot, acum) {
    var ce = "Lățimea pieței (150 perp-uri)", a = latime && latime.acum;
    if (!a || !a.lat || !fin(a.la)) return { ce: ce, stare: "info", text: "aștept lățimea pieței (vine o dată la 15 minute)", link: null, vechi: false };
    var L = a.lat, cod = a.regim && a.regim.cod || "NECUNOSCUT", min = Math.max(0, Math.round((acum - a.la) / 60000)), vechi = min > PRAGURI.vechiMin;
    var de = regimDeCand(latime.istoric, acum).text, nMas = a.n - (a.lipsa || 0);
    var text = regimText[cod] + (de ? " " + de : "") + " · " + L.sus + " sus · " + L.jos + " jos · conturile mari long pe " + L.mariLong + " din " + nMas + " · funding extrem " + L.fundExtrem + " · OI extrem " + L.oiExtrem;
    if (a.incomplet) text += " · pe " + nMas + " din " + a.n;
    text += vechi ? " · veche, de la " + hhmm(a.la) : " · acum " + min + " min";
    var stare = "info", pct = function (k) { return nMas ? 100 * L[k] / nMas : 0; };
    if (esteBotContra(bot && bot.directie, cod)) { stare = "atentie"; text += " · contra botului tău: riscul e corelat, nu diversificat"; }
    else if (pct("bugetEpuizat") >= PRAGURI.bugetEpuizatPct) { stare = "atentie"; text += " · ziua e epuizată pe toată piața"; }
    else if (pct("volExtrem") >= PRAGURI.volExtremPct) { stare = "atentie"; text += " · volatilitate extremă pe piața largă"; }
    return { ce: ce, stare: stare, text: text, link: "sugestii", vechi: vechi };
  }
  function filtreaza(monede, filtru, botiSimboluri) {
    var boti = {}; (botiSimboluri || []).forEach(function (s) { boti[String(s).toUpperCase().replace(/USDT$/, "")] = true; });
    var eBot = function (m) { return !!boti[String(m.sym).replace(/USDT$/, "")]; };
    var l = (monede || []).filter(function (m) {
      if (!m) return false;
      if (filtru === "boti") return eBot(m);
      if (filtru === "contra") return m.diverg != null && Math.abs(m.diverg) >= 15;
      if (filtru === "extreme") return (m.volPctl != null && m.volPctl >= PRAGURI.volPctl) || (m.oiPctl != null && m.oiPctl >= PRAGURI.oiPctl) || (m.fundPctl != null && (m.fundPctl >= PRAGURI.fundPctlSus || m.fundPctl <= PRAGURI.fundPctlJos));
      if (filtru === "sus") return m.dir === "SUS"; if (filtru === "jos") return m.dir === "JOS";
      return true;
    });
    return l.filter(eBot).concat(l.filter(function (m) { return !eBot(m); }));
  }
  return { PRAGURI: PRAGURI, percentila: percentila, ema: ema, atrSerie: atrSerie, directia: directia, zileDir: zileDir, masuraMoneda: masuraMoneda, latimea: latimea, regimPietei: regimPietei, regimDeCand: regimDeCand, regimText: regimText, esteBotContra: esteBotContra, textCitire: textCitire, filtreaza: filtreaza };
})();
```

⚠️ `atrSerie` de mai sus trebuie să dea aceleași cifre ca `decizie.mjs:405-420` — citește funcția întreagă de acolo (sed -n '405,422p') și copiaz-o la literă dacă diferă (PAZNIC: primele `len−1` valori NaN, prima medie simplă, apoi Wilder).

- [ ] **Step 4: rulează proba** — `node scripts/proba-v100150.mjs` ⇒ toate verzi. Dacă `zileDir` sau `masuraMoneda` pică pe cifre, ajustează PROBA numai dacă ai verificat formula cu `decizie.mjs` deschis; nu „potrivi” modulul la probă.

- [ ] **Step 5: corectează specul** (3 locuri, cu Edit): §1 „Publicarea”: KV-ul e **local** (`wrangler pages dev --persist-to`, lansatorul), fără cotă de scrieri; §2a și §6 „PC oprit”: cu PC-ul oprit **tot Radarul e oprit** (serverul e pe PC) — „veche” se arată doar când colectorul e oprit și serverul merge; §1 direcția: `SUS` cere și prețul peste EMA 21.

- [ ] **Step 6: commit** — `git add public/lib/latime.js scripts/proba-v100150.mjs docs/superpowers/specs/2026-10-11-latimea-pietei-si-panda-design.md && git commit -m "feat(radar): Latime - modulul pur al lățimii pieței (I-583, I-585), formulele din PAZNIC; proba v100.150 partea A"` + memo în `project_paznic_in_radar_11_10.md` (Task 1 ✅, hash).

---

### Task 2: funcția KV `action=latime` (GET + POST)

**Files:**
- Modify: `functions/api/istoric-bot.js` (GET după linia 80 `mcVerdict`; POST după blocul `mcVerdict` ~linia 320; limita de mărime în ternarul de la linia 120)
- Modify: `scripts/proba-v100150.mjs` (partea B)

**Interfaces (produce):** (corectură la execuție: simbolurile se validează cu `^[A-Z0-9]{1,20}USDT$` — Binance are și `TUSDT`, `4USDT`, 18 monede cu o singură literă) `GET /api/istoric-bot?action=latime` ⇒ `{ latime: { acum, istoric } | null }`; `POST …?action=latime` corp `{ la, n, lipsa, incomplet, eroare, regim:{cod,pctSus,pctJos}, lat:{…}, monede:[…] }` ⇒ `{ ok:true, monede:N, istoric:M }`; cheia KV `latime` = `{ acum, istoric:[{la, cod, pctSus, pctJos, mariLong}] }`, istoricul tăiat la 30 de zile.

- [ ] **Step 1: proba (partea B)** — adaugă în `scripts/proba-v100150.mjs`, înaintea rândului final cu `teste - picate`:

```js
// ---- B. funcția KV (modulul real, env și Request false) ----
const API = await import("../functions/api/istoric-bot.js");
const kv = () => { const m = new Map(); return { m, get: async (k) => m.has(k) ? m.get(k) : null, put: async (k, v) => { m.set(k, v); }, list: async () => ({ keys: [], list_complete: true }) }; };
const env = (ist) => ({ APP_API_TOKEN: "proba-jeton", ISTORIC: ist });
const cerere = (action, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?action=" + action, { method: corp ? "POST" : "GET", headers: { authorization: "Bearer proba-jeton", origin: "http://127.0.0.1:8788", "x-radar-client": "colector", "content-type": "application/json", "cf-connecting-ip": "127.0.0.1" }, body: corp ? JSON.stringify(corp) : undefined });
const corpBun = (o) => Object.assign({ la: ACUM, n: 150, lipsa: 2, incomplet: false, regim: { cod: "LARG-SUS", pctSus: 90.7, pctJos: 6 }, lat: { n: 150, sus: 136, jos: 9, neclar: 3, lipsa: 2, bugetEpuizat: 16, volExtrem: 31, oiExtrem: 16, fundExtrem: 59, mariLong: 145 }, monede: [{ sym: "BTCUSDT", pret: 112345.6, dir: "SUS", zileDir: 3, volPctl: 60, extPctl: 61, adrUsed: 28, frAcum: 0.0001, fundPctl: 59, oiChg: -2.9, oiPctl: 11, lMari: 65, lMici: 39, diverg: 26, deltaPctl: 78 }] }, o || {});
await test("(B) GET latime fără cheie ⇒ { latime: null }", async () => {
  const r = await API.onRequestGet({ request: cerere("latime"), env: env(kv()) }); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { latime: null });
});
await test("(B) POST latime scrie cheia (acum + istoric), GET o dă înapoi; al doilea POST adaugă în istoric", async () => {
  const ist = kv(); let r = await API.onRequestPost({ request: cerere("latime", corpBun()), env: env(ist) }); assert.equal(r.status, 200, await r.text());
  const g = await (await API.onRequestGet({ request: cerere("latime"), env: env(ist) })).json();
  assert.equal(g.latime.acum.regim.cod, "LARG-SUS"); assert.equal(g.latime.acum.monede[0].sym, "BTCUSDT"); assert.equal(g.latime.istoric.length, 1); assert.deepEqual(g.latime.istoric[0], { la: ACUM, cod: "LARG-SUS", pctSus: 90.7, pctJos: 6, mariLong: 145 });
  await API.onRequestPost({ request: cerere("latime", corpBun({ la: ACUM + 900000 })), env: env(ist) });
  assert.equal((await (await API.onRequestGet({ request: cerere("latime"), env: env(ist) })).json()).latime.istoric.length, 2);
});
await test("(B) istoricul se taie la 30 de zile și nu dublează același `la`", async () => {
  const ist = kv(); await API.onRequestPost({ request: cerere("latime", corpBun({ la: ACUM - 31 * ZI })), env: env(ist) }); await API.onRequestPost({ request: cerere("latime", corpBun()), env: env(ist) }); await API.onRequestPost({ request: cerere("latime", corpBun()), env: env(ist) });
  assert.equal((await (await API.onRequestGet({ request: cerere("latime"), env: env(ist) })).json()).latime.istoric.length, 1);
});
await test("(B) POST stricat ⇒ 400 și nimic scris: fără la, sym cu semne, dir necunoscută, 201 de monede, text în loc de număr", async () => {
  for (const corp of [corpBun({ la: null }), corpBun({ monede: [{ sym: "<script>USDT", dir: "SUS" }] }), corpBun({ monede: [{ sym: "BTCUSDT", dir: "SUS; drop" }] }), corpBun({ monede: Array.from({ length: 201 }, (_, i) => ({ sym: "C" + i + "USDT", dir: "SUS" })) }), corpBun({ lat: Object.assign({}, corpBun().lat, { sus: "multe" }) })]) {
    const ist = kv(); const r = await API.onRequestPost({ request: cerere("latime", corp), env: env(ist) }); assert.equal(r.status, 400, JSON.stringify(corp).slice(0, 80)); assert.equal(ist.m.size, 0);
  }
});
await test("(B) POST prea mare (> 262144 octeți) ⇒ 413", async () => {
  const r = await API.onRequestPost({ request: cerere("latime", corpBun({ monede: Array.from({ length: 200 }, (_, i) => ({ sym: "C" + i + "USDT", dir: "SUS", umplutura: "x".repeat(1500) })) })), env: env(kv()) }); assert.equal(r.status, 413);
});
await test("(B) fără jeton ⇒ 401; cu jeton și alt Origin ⇒ 403", async () => {
  const faraJeton = new Request("http://127.0.0.1:8788/api/istoric-bot?action=latime", { headers: { origin: "http://127.0.0.1:8788" } });
  assert.equal((await API.onRequestGet({ request: faraJeton, env: env(kv()) })).status, 401);
  const altOrigin = new Request("http://127.0.0.1:8788/api/istoric-bot?action=latime", { method: "POST", headers: { authorization: "Bearer proba-jeton", origin: "http://rau.example", "content-type": "application/json" }, body: JSON.stringify(corpBun()) });
  assert.equal((await API.onRequestPost({ request: altOrigin, env: env(kv()) })).status, 403);
});
```

- [ ] **Step 2: rulează** — `node scripts/proba-v100150.mjs` ⇒ partea B pică (GET dă `{error:"Actiune necunoscuta"}` sau 400). Dacă `import()` al funcției pică din cauza `auth.js` (ex. `crypto.subtle` lipsă), notează motivul și treci testele B pe verificare structurală (`API` ca text + regex pe `action==="latime"`), ca în `proba-v100149.mjs`.

- [ ] **Step 3: implementează** în `functions/api/istoric-bot.js`:

GET, după linia `if(action==="mcVerdict"){…}`:
```js
  // v100.150 (I-583): lățimea pieței pe 150 perp-uri - o cheie: { acum, istoric }; o scrie colectorul (tura-latime) la 15 minute
  if(action==="latime"){let r=null;try{r=JSON.parse(await env.ISTORIC.get("latime")||"null")}catch{r=null}return json({latime:r&&r.acum?r:null})}
```
Limita de mărime (ternarul de la linia ~120): adaugă `action==="latime"?262144:` înaintea valorii implicite.
POST, după blocul `mcVerdict`:
```js
  // v100.150 (I-583): lățimea pieței - validată strict (numere finite, simboluri ^[A-Z0-9]{2,20}USDT$, cel mult 200 de monede, dir din listă);
  // istoricul regimului în aceeași cheie (un punct pe tură, 30 de zile) - o singură scriere pe tură
  if(action==="latime"){
    const DIR=["SUS","JOS","neclara"],COD=["LARG-SUS","LARG-JOS","AMESTECAT","NECUNOSCUT"],la=nr(corp&&corp.la),lat=corp&&corp.lat,rg=corp&&corp.regim,mo=corp&&corp.monede;
    const CAMP=["n","sus","jos","neclar","lipsa","bugetEpuizat","volExtrem","oiExtrem","fundExtrem","mariLong"],CM=["pret","zileDir","volPctl","extPctl","adrUsed","frAcum","fundPctl","oiChg","oiPctl","lMari","lMici","diverg","deltaPctl"];
    if(la===null||!lat||typeof lat!=="object"||!rg||!COD.includes(rg.cod)||!Array.isArray(mo)||mo.length>200)return json({error:"Lipseste la / lat / regim sau prea multe monede"},400);
    const L={};for(const k of CAMP){const v=nr(lat[k]);if(v===null&&lat[k]!=null)return json({error:"lat."+k+" nu e numar"},400);L[k]=v}
    const monede=[];for(const x of mo){if(!x||typeof x!=="object"||!/^[A-Z0-9]{2,20}USDT$/.test(String(x.sym||""))||!DIR.includes(x.dir))return json({error:"moneda stricata"},400);const m={sym:x.sym,dir:x.dir};for(const k of CM)m[k]=nr(x[k]);monede.push(m)}
    const acum={la,n:nr(corp.n),lipsa:nr(corp.lipsa)||0,incomplet:corp.incomplet===true,eroare:typeof corp.eroare==="string"?corp.eroare.slice(0,200):null,regim:{cod:rg.cod,pctSus:nr(rg.pctSus),pctJos:nr(rg.pctJos)},lat:L,monede};
    let vechi=null;try{vechi=JSON.parse(await env.ISTORIC.get("latime")||"null")}catch{vechi=null}
    let istoric=vechi&&Array.isArray(vechi.istoric)?vechi.istoric:[];
    if(!istoric.some(p=>p&&p.la===la))istoric.push({la,cod:rg.cod,pctSus:nr(rg.pctSus),pctJos:nr(rg.pctJos),mariLong:L.mariLong});
    const de=la-30*86400000;istoric=istoric.filter(p=>p&&nr(p.la)!==null&&p.la>=de).sort((p,q)=>p.la-q.la).slice(-3000);
    await env.ISTORIC.put("latime",JSON.stringify({acum,istoric}));return json({ok:true,monede:monede.length,istoric:istoric.length})
  }
```

- [ ] **Step 4: rulează** — `node scripts/proba-v100150.mjs` ⇒ A + B verzi. Apoi `npm run test:server` și `npm run test:security` (funcțiile Pages au gărzi proprii) ⇒ verzi.

- [ ] **Step 5: commit** — `git add functions/api/istoric-bot.js scripts/proba-v100150.mjs && git commit -m "feat(radar): KV latime - GET/POST validat, istoricul regimului în aceeași cheie (I-583)"` + memo.

---

### Task 3: tura colectorului `tura-latime.mjs`, rularea „o dată” și legarea în colector

**Files:**
- Create: `scripts/lib/tura-latime.mjs`
- Create: `scripts/proba-v100150-colector.mjs`
- Create: `scripts/tura-latime-o-data.mjs` (rulare manuală: o tură reală, publicată în KV-ul local)
- Modify: `scripts/colector.mjs` (import ~linia 46; `const Latime = incarca("latime.js", "Latime")` lângă linia 166; `turaLatimeColector()` lângă `turaPiataColector()` ~1420 și în bucla de la ~2007; `VERSIUNE_COLECTOR` linia 51 ⇒ `"v101.93"`)
- Modify: `package.json` (`"test:v100150col": "node scripts/proba-v100150-colector.mjs"`)

**Interfaces:**
- Consumes: `Latime.*` (Task 1), `POST /api/istoric-bot?action=latime` (Task 2).
- Produces: `export async function turaLatime(d, st, acum)`, `d = { binance(url) -> json|null, trimite(cale, corp), jurnal(...a), pauza(ms), Latime, botiSimboluri() -> string[] }`; `export function cereBinance({ fetch, pauza, jurnal })` ⇒ funcția `binance(url)` cu 3 încercări, pauză 60 s la 429/418 (o dată), `null` la eșec; `export const RITM = { bare: 15 min, serii: 60 min, univers: 60 min }`; starea `st = { la_bare, la_serii, la_univers, univers: [{sym, onboard}], ultima: { la, n, lipsa } }`; seriile pe monedă într-un `Map` din modul (nu în `st`, 2 MB).

- [ ] **Step 1: proba care pică** — `scripts/proba-v100150-colector.mjs`:

```js
// Proba turei de lățime (colector v101.93): universul (doar cripto, ≥ 10 zile, top 150 după volum), barele la 15 min, seriile la oră,
// o singură publicare pe tură, oprirea pe univers gol (fără „orice *USDT”), pauza la 429, moneda cu bare picate = lipsă. Fără rețea.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { turaLatime, cereBinance, RITM } from "./lib/tura-latime.mjs";
vm.runInThisContext(fs.readFileSync(new URL("../public/lib/text-ro.js", import.meta.url), "utf8"));
vm.runInThisContext(fs.readFileSync(new URL("../public/lib/latime.js", import.meta.url), "utf8"));
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const ACUM = Date.UTC(2026, 9, 11, 8, 0, 0), H4 = 4 * 3600000, ZI = 86400000, MIN = 60000;
const kl = (n, pas, f) => Array.from({ length: n }, (_, i) => [ACUM - (n - i) * pas, f(i), f(i) * 1.01, f(i) * 0.99, f(i), 1, ACUM - (n - i - 1) * pas]);
function lume(o = {}) {
  const cereri = [], trimise = [], jurnal = [];
  const N = o.n ?? 160, simboluri = Array.from({ length: N }, (_, i) => ({ symbol: "C" + i + "USDT", quoteAsset: "USDT", status: "TRADING", contractType: "PERPETUAL", underlyingType: i === 3 ? "INDEX" : "COIN", onboardDate: ACUM - (i === 5 ? 2 : 400) * ZI }));
  const binance = async (url) => {
    cereri.push(url);
    if (o.cade429 && /klines/.test(url) && cereri.filter((u) => /klines/.test(u)).length === 1) return null;
    if (/exchangeInfo/.test(url)) return { symbols: o.universGol ? simboluri.map((s) => ({ ...s, contractType: "ALTCEVA" })) : simboluri };
    if (/ticker\/24hr/.test(url)) return simboluri.map((s, i) => ({ symbol: s.symbol, quoteVolume: String(1e9 - i * 1e6), lastPrice: "100" }));
    if (/premiumIndex/.test(url)) return simboluri.map((s) => ({ symbol: s.symbol, lastFundingRate: "0.0001", markPrice: "100" }));
    if (/klines.*interval=4h/.test(url)) return /C7USDT/.test(url) ? null : kl(564, H4, (i) => 100 + i * 0.05);
    if (/klines.*interval=1d/.test(url)) return kl(30, ZI, () => 100);
    if (/fundingRate/.test(url)) return Array.from({ length: 500 }, (_, i) => ({ fundingRate: String(0.0001 * (i % 10) / 10), fundingTime: ACUM - i * 8 * 3600000 }));
    if (/openInterestHist/.test(url)) return Array.from({ length: 500 }, () => ({ sumOpenInterest: "1000" }));
    if (/topLongShortPositionRatio/.test(url)) return Array.from({ length: 200 }, () => ({ longAccount: "0.62" }));
    if (/globalLongShortAccountRatio/.test(url)) return Array.from({ length: 200 }, () => ({ longAccount: "0.45" }));
    if (/takerlongshortRatio/.test(url)) return Array.from({ length: 500 }, (_, i) => ({ buySellRatio: String(0.9 + (i % 5) * 0.05) }));
    return null;
  };
  const d = { binance, trimite: async (c, corp) => { trimise.push({ c, corp }); return { ok: true }; }, jurnal: (...a) => jurnal.push(a.join(" ")), pauza: async () => {}, Latime: globalThis.Latime, botiSimboluri: () => ["C1"] };
  return { d, cereri, trimise, jurnal, st: {} };
}
await test("universul: USDT + TRADING + PERPETUAL + COIN, listate ≥ 10 zile, primele 150 după volum (C3 indice și C5 nouă ies)", async () => {
  const w = lume(); await turaLatime(w.d, w.st, ACUM);
  assert.equal(w.st.univers.length, 150); assert.ok(!w.st.univers.some((u) => u.sym === "C3USDT" || u.sym === "C5USDT")); assert.equal(w.st.univers[0].sym, "C0USDT");
});
await test("o tură întreagă: bare 4h + 1d pe 150, serii pe 150, premiumIndex o dată, O SINGURĂ publicare cu agregatul; C7 (bare picate) = lipsă", async () => {
  const w = lume(); await turaLatime(w.d, w.st, ACUM);
  assert.equal(w.cereri.filter((u) => /interval=4h/.test(u)).length, 150); assert.equal(w.cereri.filter((u) => /premiumIndex/.test(u)).length, 1); assert.equal(w.cereri.filter((u) => /openInterestHist/.test(u)).length, 150);
  assert.equal(w.trimise.length, 1); const c = w.trimise[0].corp; assert.equal(w.trimise[0].c, "/api/istoric-bot?action=latime");
  assert.equal(c.n, 150); assert.equal(c.lipsa, 1); assert.equal(c.incomplet, false); assert.equal(c.lat.sus, 149); assert.equal(c.regim.cod, "LARG-SUS"); assert.equal(c.monede.length, 149); assert.ok(c.monede.every((m) => m.lMari === 62));
});
await test("ritmurile: la 10 minute nu face nimic; la 15 min doar barele (300 cereri), seriile abia după o oră", async () => {
  const w = lume(); await turaLatime(w.d, w.st, ACUM); const n0 = w.cereri.length;
  await turaLatime(w.d, w.st, ACUM + 10 * MIN); assert.equal(w.cereri.length, n0, "sub 15 min nimic");
  await turaLatime(w.d, w.st, ACUM + 15 * MIN); const n1 = w.cereri.length - n0; assert.ok(n1 >= 300 && n1 <= 302, "doar barele + premiumIndex: " + n1); assert.equal(w.trimise.length, 2);
  await turaLatime(w.d, w.st, ACUM + 61 * MIN); assert.ok(w.cereri.filter((u) => /openInterestHist/.test(u)).length >= 300, "seriile a doua oară după o oră");
});
await test("universul gol ⇒ se oprește și spune de ce (jurnal + KV cu eroare), nu cade pe „orice *USDT”", async () => {
  const w = lume({ universGol: true }); await turaLatime(w.d, w.st, ACUM);
  assert.ok(w.jurnal.some((j) => /univers/i.test(j) && /0/.test(j))); assert.equal(w.cereri.filter((u) => /klines/.test(u)).length, 0);
  assert.equal(w.trimise.length, 1); assert.match(w.trimise[0].corp.eroare, /univers/i); assert.equal(w.trimise[0].corp.regim.cod, "NECUNOSCUT");
});
await test("incomplet: peste 20 % lipsă ⇒ incomplet: true", async () => {
  const w = lume(); const b = w.d.binance; w.d.binance = async (u) => /interval=4h/.test(u) && /C(1|2|3|4|5|6|7|8|9)\dUSDT/.test(u) ? null : b(u);
  await turaLatime(w.d, w.st, ACUM); assert.equal(w.trimise[0].corp.incomplet, true); assert.ok(w.trimise[0].corp.lipsa > 30);
});
await test("cereBinance: 3 încercări, la 429 pauză de 60 s o dată, la eșec null; răspunsul bun e JSON", async () => {
  const pauze = []; let n = 0;
  const f = async () => { n++; return n === 1 ? new Response("", { status: 429 }) : new Response(JSON.stringify({ ok: 1 }), { status: 200 }); };
  const b = cereBinance({ fetch: f, pauza: async (ms) => pauze.push(ms), jurnal: () => {} });
  assert.deepEqual(await b("https://fapi.binance.com/x"), { ok: 1 }); assert.deepEqual(pauze, [60000]);
  const rau = cereBinance({ fetch: async () => new Response("", { status: 500 }), pauza: async () => {}, jurnal: () => {} }); assert.equal(await rau("https://fapi.binance.com/x"), null);
});
assert.deepEqual(RITM, { bare: 15 * MIN, serii: 60 * MIN, univers: 60 * MIN });
console.log(`\n${teste - picate}/${teste} verzi\n`); if (picate) process.exit(1);
```

- [ ] **Step 2: rulează** — `node scripts/proba-v100150-colector.mjs` ⇒ pică la import (`tura-latime.mjs` lipsește).

- [ ] **Step 3: scrie `scripts/lib/tura-latime.mjs`**:

```js
// Tura de lățime a colectorului (v101.93, I-583): cele 150 de perp-uri USDT de pe Binance, doar cripto, cu formulele din Latime
// (public/lib/latime.js = PAZNIC-CRYPTO/decizie.mjs). Cererile pleacă DIRECT la Binance, din PC (nu prin Pages Functions): barele
// de 4h și 1d la 15 minute (300 de cereri), seriile (funding, OI, poziționare, agresiune) o dată pe oră (750), premiumIndex o dată
// (toate monedele). 5 în paralel (PAZNIC: paralel 5). O singură publicare pe tură în KV `latime`. Probat în proba-v100150-colector.mjs.
// d = { binance, trimite, jurnal, pauza, Latime, botiSimboluri }; st = starea ei (colectorul o ține în meta și o scrie pe disc)
const MIN = 60000;
export const RITM = { bare: 15 * MIN, serii: 60 * MIN, univers: 60 * MIN };
const FAPI = "https://fapi.binance.com";
const serii = new Map();   // sym -> { fundIst, oiSerie, mari, mici, taker } - în memorie, nu în st (2 MB)

export function cereBinance({ fetch: f, pauza, jurnal }) {
  const fetchul = f || globalThis.fetch;
  return async function binance(url) {
    let pauzat = false;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetchul(url, { headers: { "User-Agent": "crypto-radar/1.0" } });
        if ((r.status === 429 || r.status === 418) && !pauzat) { pauzat = true; jurnal("latime: Binance " + r.status + ", pauză 60 s"); await pauza(60000); continue; }
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) { if (i === 2) { jurnal("latime: " + url.replace(FAPI, "") + " - " + e.message); return null; } await pauza(700 * (i + 1)); }
    }
    return null;
  };
}
async function inParalel(lista, n, fn) { const out = new Array(lista.length); let k = 0; await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => { while (k < lista.length) { const i = k++; out[i] = await fn(lista[i], i); } })); return out; }
const bara = (k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] });

async function universul(d, P, acum) {
  const info = await d.binance(FAPI + "/fapi/v1/exchangeInfo"), tick = await d.binance(FAPI + "/fapi/v1/ticker/24hr");
  const lista = info && Array.isArray(info.symbols) ? info.symbols : [], minMs = P.minZileListate * 86400000;
  const cripto = new Map(lista.filter((x) => x.quoteAsset === "USDT" && x.status === "TRADING" && x.contractType === "PERPETUAL" && x.underlyingType === "COIN").map((x) => [x.symbol, Number.isFinite(+x.onboardDate) ? +x.onboardDate : null]));
  if (!cripto.size) return { eroare: "universul e gol: " + lista.length + " simboluri de la Binance, 0 trec filtrul (quoteAsset/status/contractType/underlyingType) - s-a schimbat un nume de câmp?" };
  const t = Array.isArray(tick) ? tick.filter((x) => cripto.has(x.symbol) && (cripto.get(x.symbol) === null || acum - cripto.get(x.symbol) >= minMs)) : [];
  t.sort((a, b) => +b.quoteVolume - +a.quoteVolume);
  return { univers: t.slice(0, P.nSimboluri).map((x) => ({ sym: x.symbol, onboard: cripto.get(x.symbol) })) };
}
async function seriile(d, sym) {
  const [istF, oih, mari, mici, taker] = await Promise.all([
    d.binance(`${FAPI}/fapi/v1/fundingRate?symbol=${sym}&limit=500`), d.binance(`${FAPI}/futures/data/openInterestHist?symbol=${sym}&period=1h&limit=500`),
    d.binance(`${FAPI}/futures/data/topLongShortPositionRatio?symbol=${sym}&period=1h&limit=200`), d.binance(`${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=1h&limit=200`),
    d.binance(`${FAPI}/futures/data/takerlongshortRatio?symbol=${sym}&period=1h&limit=500`)]);
  serii.set(sym, { fundIst: Array.isArray(istF) ? istF.map((x) => +x.fundingRate) : null, oiSerie: Array.isArray(oih) && oih.length > 60 ? oih.map((x) => +x.sumOpenInterest) : null, mari: Array.isArray(mari) ? mari : null, mici: Array.isArray(mici) ? mici : null, taker: Array.isArray(taker) ? taker : null });
}
export async function turaLatime(d, st, acum) {
  acum = acum || Date.now(); const P = d.Latime.PRAGURI, la = (k) => st["la_" + k] || 0;
  if (acum - la("bare") < RITM.bare) return st;
  st.la_bare = acum;
  if (!st.univers || acum - la("univers") >= RITM.univers) {
    const u = await universul(d, P, acum);
    if (u.eroare) { st.univers = null; st.la_univers = 0; d.jurnal("latime: " + u.eroare); await d.trimite("/api/istoric-bot?action=latime", { la: acum, n: 0, lipsa: 0, incomplet: true, eroare: u.eroare, regim: { cod: "NECUNOSCUT", pctSus: null, pctJos: null }, lat: d.Latime.latimea([], P), monede: [] }); return st; }
    st.univers = u.univers; st.la_univers = acum;
  }
  const refaSerii = acum - la("serii") >= RITM.serii; if (refaSerii) st.la_serii = acum;
  const prem = await d.binance(FAPI + "/fapi/v1/premiumIndex"), fr = new Map(Array.isArray(prem) ? prem.map((x) => [x.symbol, +x.lastFundingRate]) : []);
  const randuri = await inParalel(st.univers, P.paralel, async ({ sym }) => {
    if (refaSerii || !serii.has(sym)) await seriile(d, sym);
    const b4 = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${sym}&interval=4h&limit=${P.pctlBare}`), b1d = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${sym}&interval=1d&limit=30`);
    if (!Array.isArray(b4) || !Array.isArray(b1d)) return null;
    const s = serii.get(sym) || {};
    return d.Latime.masuraMoneda({ sym, pret: +b4[b4.length - 1][4], b4: b4.map(bara), b1d: b1d.map(bara), frAcum: fr.has(sym) ? fr.get(sym) : null, fundIst: s.fundIst, oiSerie: s.oiSerie, mari: s.mari, mici: s.mici, taker: s.taker }, P);
  });
  const lat = d.Latime.latimea(randuri, P), regim = d.Latime.regimPietei(lat), monede = randuri.filter(Boolean);
  const corp = { la: acum, n: st.univers.length, lipsa: lat.lipsa, incomplet: lat.lipsa > 0.2 * st.univers.length, eroare: null, regim, lat, monede };
  await d.trimite("/api/istoric-bot?action=latime", corp);
  st.ultima = { la: acum, n: corp.n, lipsa: corp.lipsa, cod: regim.cod };
  d.jurnal("latime: " + regim.cod + " · " + lat.sus + " sus · " + lat.jos + " jos · lipsă " + lat.lipsa + (refaSerii ? " · seriile refăcute" : ""));
  return st;
}
```

- [ ] **Step 4: rulează proba** — `node scripts/proba-v100150-colector.mjs` ⇒ verde. Testul „ritmurile” cere ca la 15 min să NU se refacă seriile: `refaSerii` e fals ⇒ `serii.has(sym)` e adevărat din prima tură — bine. Dacă numărul de cereri diferă cu ±2 (premiumIndex), ajustează proba doar după ce ai numărat pe hârtie.

- [ ] **Step 5: leagă în `scripts/colector.mjs`** (4 locuri):
  1. lângă linia 46: `import { turaLatime as turaLatimeModul, cereBinance } from "./lib/tura-latime.mjs";   // v101.93 (I-583): lățimea pieței pe 150 perp-uri`
  2. lângă linia 167: `const Latime = incarca("latime.js", "Latime");   // v101.93 (I-583)` — `latime.js` folosește `TextRo` în `regimDeCand`; `incarca` nu îl dă ⇒ verifică că `TextRo` e deja global în colector (caută `text-ro` în colector.mjs; dacă nu e, încarcă-l cu `incarca("text-ro.js", "TextRo")` înainte și pune-l pe `globalThis.TextRo`).
  3. linia 51: `const VERSIUNE_COLECTOR = "v101.93";`
  4. lângă `turaPiataColector` (~1420):
```js
// v101.93 (I-583): lățimea pieței pe 150 perp-uri Binance - ritmul ei în scripts/lib/tura-latime.mjs (bare la 15 min, serii la oră)
let latimeInLucru = false;
const binanceDirect = cereBinance({ fetch: globalThis.fetch, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), jurnal });
async function turaLatimeColector() {
  if (latimeInLucru || process.env.COLECTOR_FARA_LATIME) return;
  latimeInLucru = true;
  try {
    const m = meta(); m.latime = m.latime || {};
    await turaLatimeModul({ binance: binanceDirect, trimite, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), Latime, botiSimboluri: () => [] }, m.latime, Date.now());
    try { scrieStare(); } catch {}
  } catch (e) { jurnal("latime ESEC", e.message); }
  latimeInLucru = false;
}
```
  și în bucla de la ~2007, după `turaPiataColector()`: `turaLatimeColector().catch((e) => jurnal("latime", e.message));   // v101.93 (I-583)`.
  ⚠️ `st.univers` ajunge în `meta()` (scris pe disc la fiecare tură): 150 × {sym, onboard} ≈ 6 KB — acceptabil.

- [ ] **Step 6: `scripts/tura-latime-o-data.mjs`** (rulare manuală; aceeași tură, publicată în KV-ul local cu jetonul din `.dev.vars`; fără regex cu backslash la citirea jetonului):

```js
// O singură tură de lățime, pe viu (Binance real), publicată în KV-ul local (:8788). Pentru poze, comparația cu PAZNIC și ca să vezi
// cifrele fără să aștepți repornirea colectorului:  node scripts/tura-latime-o-data.mjs [url]
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm"; import { fileURLToPath } from "node:url";
import { turaLatime, cereBinance } from "./lib/tura-latime.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), BAZA = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/+$/, "");
for (const f of ["text-ro.js", "latime.js"]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"));
const jeton = (fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/).find((l) => l.startsWith("APP_API_TOKEN=")) || "").slice(14).trim();
if (!jeton) { console.error("fără APP_API_TOKEN în .dev.vars"); process.exit(1); }
const pauza = (ms) => new Promise((r) => setTimeout(r, ms)), jurnal = (...a) => console.log(new Date().toLocaleTimeString("ro-RO"), ...a);
const trimite = async (cale, corp) => { const r = await fetch(BAZA + cale, { method: "POST", body: JSON.stringify(corp), headers: { "content-type": "application/json", origin: BAZA, authorization: "Bearer " + jeton, "x-radar-client": "colector" } }); if (!r.ok) throw new Error("KV " + r.status + " " + (await r.text()).slice(0, 200)); return r.json(); };
const t0 = Date.now(), st = {};
await turaLatime({ binance: cereBinance({ pauza, jurnal }), trimite, jurnal, pauza, Latime: globalThis.Latime, botiSimboluri: () => [] }, st, Date.now());
console.log("gata în", Math.round((Date.now() - t0) / 1000), "s ·", JSON.stringify(st.ultima));
```
Rulează-l: `node scripts/tura-latime-o-data.mjs` ⇒ scrie durata (așteptat 30–90 s) și `{la, n: 150, lipsa, cod}`; apoi `curl` cu jetonul pe `GET /api/istoric-bot?action=latime` ⇒ `latime.acum.lat.sus` nenul. Notează în memo durata reală și greutatea (dacă apar 429, planul §6 din spec: tura rară la 2 h).

- [ ] **Step 7: probe + commit** — `node scripts/proba-v100150-colector.mjs && npm run test:colector && npm run test:syntax` ⇒ verzi; `git add scripts/lib/tura-latime.mjs scripts/proba-v100150-colector.mjs scripts/tura-latime-o-data.mjs scripts/colector.mjs package.json && git commit -m "feat(radar): colector v101.93 - tura de lățime pe 150 perp-uri Binance, o publicare pe tură (I-583)"` + memo (durata turei reale, cifrele).

---

### Task 4: rândul din „Ce spune piața acum” (Tablou)

**Files:**
- Modify: `public/app.js` — `tbCitireExtra` (~6760: `out` + rândul), `tbDeseneazaCitire` (~6712 `rd()`, ~6722 bucla `c.randuri.forEach`), după `tbVociBilant` (~6740): `tbLatimeKv`
- Modify: `scripts/proba-v100150.mjs` (partea C)

**Interfaces:** consumă `Latime.textCitire(latime, bot, acum)` (Task 1) și `GET action=latime` (Task 2). Produce `tbLatimeDinKv()` (o dată la 10 min, redesenează citirea la sosire) și `rd()` cu `x.linkText` + `x.linkNav` (navigare în aplicație).

- [ ] **Step 1: proba (partea C)** — structurală pe sursă, ca în `proba-v100149.mjs` (funcția `functie(src, n)` copiată de acolo, linia 18):

```js
// ---- C. Tabloul: rândul lățimii în „Ce spune piața acum” ----
const APP = citeste("public", "app.js"), HTML = citeste("public", "index.html");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && !--a) break; } return src.slice(i, j + 1); };
await test("(C) tbCitireExtra dă out.latime din Latime.textCitire(tbLatimeKv.d, b, Date.now())", () => {
  const f = functie(APP, "tbCitireExtra"); assert.match(f, /latime:null/); assert.match(f, /out\.latime=typeof Latime!=="undefined"\?Latime\.textCitire\(tbLatimeKv\.d,b,Date\.now\(\)\):null/);
});
await test("(C) rândul lățimii intră imediat după „Trendul pe TF-uri”, înaintea Indicatorilor", () => {
  const f = functie(APP, "tbDeseneazaCitire"); assert.match(f, /out\.push\(bloc\);if\(ex\.latime\)out\.push\(rd\(ex\.latime\)\);if\(ex\.indicatori&&!ind\)/);
});
await test("(C) rd(): textul legăturii și navigarea în aplicație (pânda ›), clasa vechi", () => {
  const f = functie(APP, "tbDeseneazaCitire");
  assert.match(f, /x\.linkNav\?'<a class="tbMcBtn tbCitLink" href="#" data-action-click="navTo\(\\''\+x\.linkNav\+'\\'\)">'\+escapeHtml\(x\.linkText\|\|"deschide"\)\+'<\/a>':/);
  assert.match(f, /'<div class="tbCitR '\+x\.stare\+\(x\.vechi\?" vechi":""\)\+'">/);
});
await test("(C) tbLatimeDinKv: o dată la 10 minute, redesenează citirea la sosire; chemat din tbCitireExtra", () => {
  const f = functie(APP, "tbLatimeDinKv"); assert.match(f, /10\*60000/); assert.match(f, /action=latime/); assert.match(f, /tbDeseneazaCitire\(tbStare\.citireO,tbStare\.bot\)/);
  assert.match(functie(APP, "tbCitireExtra"), /tbLatimeDinKv\(\)/);
});
await test("(C) index.html încarcă /lib/latime.js înaintea lui busola.js și sugestii-ecran.js; sw.js îl are în APP_SHELL", () => {
  assert.ok(HTML.indexOf('<script src="/lib/latime.js') > 0 && HTML.indexOf('<script src="/lib/latime.js') < HTML.indexOf('<script src="/lib/busola.js'));
  assert.match(citeste("public", "sw.js"), /"\/lib\/latime\.js"/);
});
await test("(C) rândul se desenează cu textul lui Latime (sandbox: rd + textCitire)", () => {
  const ctx = sandbox(["latime.js"], { escapeHtml: (s) => String(s) });
  const IC = { bine: "✓", atentie: "!", rau: "✕", info: "·" }, rdSrc = /var rd=function\(x\)\{return [^\n]*?\};/.exec(functie(APP, "tbDeseneazaCitire"))[0];
  vm.runInContext("var IC=" + JSON.stringify(IC) + ";" + rdSrc + ";", ctx);
  const html = vm.runInContext("rd(Object.assign(Latime.textCitire(" + JSON.stringify(latimeKv()) + ",{directie:'short'}," + ACUM + "),{linkText:'pânda ›',linkNav:'sugestii'}))", ctx);
  assert.match(html, /class="tbCitR atentie"/); assert.match(html, /Lățimea pieței \(150 perp-uri\):/); assert.match(html, /larg SUS de 3 zile · 136 sus/); assert.match(html, /navTo\('sugestii'\)/); assert.match(html, />pânda ›</);
});
```

- [ ] **Step 2: rulează** ⇒ partea C pică (`latime:null` lipsește etc.).

- [ ] **Step 3: implementează în `public/app.js`**:
  - `rd()` (linia ~6712) devine:
```js
var rd=function(x){return '<div class="tbCitR '+x.stare+(x.vechi?" vechi":"")+'"><span class="tbCitIc" aria-hidden="true">'+IC[x.stare]+'</span><div><b>'+escapeHtml(x.ce)+':</b> <span class="tbCitTx">'+escapeHtml(x.text)+'</span>'+(x.link&&!x.linkNav?'<a class="tbMcBtn tbCitLink" href="'+escapeHtml(x.link)+'" target="_blank" rel="noopener">deschide în Busolă</a>':'')+(x.linkNav?'<a class="tbMcBtn tbCitLink" href="#" data-action-click="navTo(\''+x.linkNav+'\')">'+escapeHtml(x.linkText||"deschide")+'</a>':'')+'</div></div>'};   /* v100.149 (I-582): butonul spre Busolă · v100.150 (I-583): legătură în aplicație (pânda) + clasa vechi */
```
  - în `c.randuri.forEach` (linia ~6722): `if(x.tf){if(pus)return;pus=true;out.push(bloc);if(ex.latime)out.push(rd(ex.latime));if(ex.indicatori&&!ind){…` (inserția e exact după `out.push(bloc);`).
  - `tbCitireExtra`: în `out={…}` adaugă `latime:null`; după `var l=d&&d.indicatori…` adaugă:
```js
  /* v100.150 (I-583): lățimea pieței pe 150 perp-uri, din KV (colectorul la 15 min) - Latime.textCitire dă textul, starea și vechimea; „pânda ›” duce în Sugestii */
  tbLatimeDinKv();var lt=typeof Latime!=="undefined"?Latime.textCitire(tbLatimeKv.d,b,Date.now()):null;out.latime=lt?Object.assign(lt,{linkNav:lt.link?"sugestii":null,linkText:"pânda ›",link:null}):null;
```
  ⚠️ proba C cere literal `out.latime=typeof Latime!=="undefined"?Latime.textCitire(tbLatimeKv.d,b,Date.now()):null` — scrie întâi acel rând exact, apoi pe rândul următor `if(out.latime)Object.assign(out.latime,{linkNav:out.latime.link?"sugestii":null,linkText:"pânda ›",link:null});`.
  - după `tbVociBilant` (~6740):
```js
// v100.150 (I-583): lățimea pieței din KV (action=latime), o dată la 10 minute; sosirea redesenează citirea o dată
var tbLatimeKv={la:0,d:null,inLucru:null};
function tbLatimeDinKv(){
  if(Date.now()-tbLatimeKv.la<10*60000||tbLatimeKv.inLucru)return;
  tbLatimeKv.inLucru=getJSON("/api/istoric-bot?action=latime").then(function(r){tbLatimeKv.d=r&&r.latime&&r.latime.acum?r.latime:null},function(){tbLatimeKv.d=tbLatimeKv.d||null}).then(function(){tbLatimeKv.la=Date.now();tbLatimeKv.inLucru=null;if(tbPanouVizibil()&&tbStare.bot&&tbStare.citireO)tbDeseneazaCitire(tbStare.citireO,tbStare.bot)})}
```
  - `public/index.html`: `<script src="/lib/latime.js?v=100.150"></script>` imediat după `/lib/text-ro.js` (copiază forma exactă a celorlalte tag-uri, inclusiv query-ul de versiune dacă îl au); CSS: în `app.css` adaugă `.tbCitR.vechi .tbCitTx{opacity:.75}` lângă regulile `.tbCitR` (caută `.tbCitR.atentie`).
  - `public/sw.js`: `"/lib/latime.js"` în `APP_SHELL` după `"/lib/text-ro.js"` (sau după primul `/lib/`) — versiunea `CACHE` se schimbă în Task 6.

- [ ] **Step 4: rulează** — `node scripts/proba-v100150.mjs` ⇒ A–C verzi; `npm run test:syntax && npm run test:garda-comentarii && npm run test:tablou` ⇒ verzi.

- [ ] **Step 5: commit** — `git add public/app.js public/app.css public/index.html public/sw.js scripts/proba-v100150.mjs && git commit -m "feat(radar): rândul lățimii pieței în „Ce spune piața acum”, după trendul pe TF-uri (I-583, I-586)"` + memo.

---

### Task 5: blocul „pânda” în Sugestii

**Files:**
- Modify: `public/lib/sugestii-ecran.js` (`sugStare`, `sugHtml`, `sugPorneste`; funcții noi `sugPandaHtml`, `sugPanda`, `sugPandaDesfa`)
- Modify: `public/app.css` (stil minim pentru `.sugPandaFiltre`, celulele pe prag)
- Modify: `scripts/proba-v100150.mjs` (partea D)

**Interfaces:** consumă `Latime.textCitire`, `Latime.filtreaza`, `Latime.regimText`, `GET action=latime`, `data-action-click` (delegarea din app.js:7348 evaluează expresia ⇒ `sugPanda('contra')`, `sugPandaDesfa()`); boții lui din `sugStare.d.clasament.monede[].simbol` (`C_USDT_PERP`) ⇒ `botiSimboluri = clasament.monede.filter(x => x.bot).map(x => x.simbol.split("_")[0])` — verifică în `sugBoti()` ce câmp marchează boții activi (caută `activ`/`bot` în `sugestii-ecran.js:20-57`) și folosește-l pe acela.

- [ ] **Step 1: proba (partea D)**:

```js
// ---- D. Sugestii: blocul pândei ----
const monedeKv = Array.from({ length: 150 }, (_, i) => ({ sym: "C" + i + "USDT", pret: 1.23456, dir: i < 136 ? "SUS" : i < 145 ? "JOS" : "neclara", zileDir: i % 7, volPctl: i % 100, extPctl: 50, adrUsed: 28.4, frAcum: 0.0001, fundPctl: i < 59 ? 80 : 50, oiChg: -2.94, oiPctl: i < 16 ? 97 : 10, lMari: 65, lMici: i < 20 ? 39 : 60, diverg: i < 20 ? 26 : 5, deltaPctl: 78 }));
const dSug = (o) => Object.assign({ latime: latimeKv({ acum: Object.assign(latimeKv().acum, { monede: monedeKv }) }), clasament: { monede: [{ simbol: "C1_USDT_PERP", dir: "long", bot: true }] } }, o || {});   // câmpul care marchează botul = cel găsit în sugBoti() (vezi Interfaces)
const S = sandbox(["text-ro.js", "latime.js", "sugestii-ecran.js"], { escapeHtml: (s) => String(s), getJSON: async () => ({}) });
await test("(D) blocul e PRIMUL în pagină, pliat: regimul, cifrele, fraza de cinste, butonul „arată cele 150”", () => {
  const h = vm.runInContext("sugHtml(" + JSON.stringify(dSug()) + "," + ACUM + ")", S);
  assert.ok(h.indexOf("Lățimea pieței · 150 perp-uri Binance") < h.indexOf("sugCartela"), "blocul înaintea cartelelor");
  assert.match(h, /larg SUS/); assert.match(h, /136 sus/); assert.match(h, /conturile mari long pe 145/); assert.match(h, /Fapte, nu semnal: filtrul de permisiune și fișa de intrare ale lui PAZNIC n-au selectat nimic \(p = 0,23; 78 trade-uri pe hârtie\) și nu sunt aici/);
  assert.match(h, /data-action-click="sugPandaDesfa\(\)"[^>]*>arată cele 150/); assert.doesNotMatch(h, /<table/); assert.doesNotMatch(h, /predic[țt]ie/i);
});
await test("(D) desfăcut: filtrele cu numere, tabelul cu 150 de rânduri, boții primii, o zecimală cu virgulă, celulele pe prag", () => {
  vm.runInContext("sugStare.panda.desfacut=true", S); const h = vm.runInContext("sugHtml(" + JSON.stringify(dSug()) + "," + ACUM + ")", S);
  assert.match(h, /data-action-click="sugPanda\('toate'\)"[^>]*>toate \(150\)/); assert.match(h, /sugPanda\('boti'\)"[^>]*>monedele boților mei \(1\)/); assert.match(h, /sugPanda\('contra'\)"[^>]*>contra mulțimii \(20\)/); assert.match(h, /SUS \(136\)/); assert.match(h, /JOS \(9\)/);
  assert.equal((h.match(/<tr class="sugPandaRand/g) || []).length, 150); assert.ok(h.indexOf("<b>C1</b>") < h.indexOf("<b>C0</b>"), "botul lui C1 e primul");
  assert.match(h, /−2,9/); assert.match(h, /28,4%/); assert.match(h, /class="sugPandaCel prag"[^>]*>97[ <]/); assert.match(h, /SUS <span class="tbSub">de 1 zi<\/span>/); assert.match(h, />CU</);
});
await test("(D) filtrul „contra” lasă 20; „boti” lasă 1; starea filtrului rămâne după redesenare", () => {
  vm.runInContext("sugPanda('contra')", S); let h = vm.runInContext("sugHtml(" + JSON.stringify(dSug()) + "," + ACUM + ")", S); assert.equal((h.match(/<tr class="sugPandaRand/g) || []).length, 20);
  vm.runInContext("sugPanda('boti')", S); h = vm.runInContext("sugHtml(" + JSON.stringify(dSug()) + "," + ACUM + ")", S); assert.equal((h.match(/<tr class="sugPandaRand/g) || []).length, 1);
  vm.runInContext("sugPanda('toate');sugStare.panda.desfacut=false", S);
});
await test("(D) fără lățime în KV ⇒ blocul spune „aștept lățimea pieței”, fără buton; sugPorneste aduce action=latime", () => {
  const h = vm.runInContext("sugHtml(" + JSON.stringify(dSug({ latime: null })) + "," + ACUM + ")", S); assert.match(h, /aștept lățimea pieței \(vine o dată la 15 minute\)/); assert.doesNotMatch(h, /sugPandaDesfa/);
  assert.match(functie(citeste("public", "lib", "sugestii-ecran.js"), "sugPorneste"), /pas\("latime", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=latime"\)\.then\(function \(r\) \{ return r && r\.latime \|\| null; \}\); \}\)/);
});
```

- [ ] **Step 2: rulează** ⇒ D pică.

- [ ] **Step 3: implementează în `public/lib/sugestii-ecran.js`**:
  - `var sugStare = { d: {}, la: 0, inLucru: false, panda: { desfacut: false, filtru: "toate" } };`
  - în `sugPorneste`, în `Promise.all`: `pas("latime", function () { return getJSON("/api/istoric-bot?action=latime").then(function (r) { return r && r.latime || null; }); }),` (prima în listă).
  - în `sugHtml`, înaintea `sugBoti(...)`: `+ sugPandaHtml(d.latime, d.clasament, acum)`.
  - funcțiile noi (după `sugUrm`):
```js
// v100.150 (I-584): pânda - lățimea pieței pe 150 perp-uri (din KV, colectorul la 15 min) ca PRIMUL bloc al paginii: pliat la agregat,
// „arată cele 150” desface tabelul cu filtre. Fapte, nu semnal: permisiunea și fișa de intrare ale lui PAZNIC nu sunt aici (p = 0,23).
function sugZec(x) { return x == null || !isFinite(x) ? "—" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".", ","); }
function sugPc(x) { return x == null || !isFinite(x) ? "—" : String(Math.round(x)); }
function sugBotiSimboluri(cl) { return cl && Array.isArray(cl.monede) ? cl.monede.filter(function (x) { return x && x.bot; }).map(function (x) { return String(x.simbol || "").split("_")[0]; }) : []; }
function sugBotDir(cl, sym) { var b = cl && Array.isArray(cl.monede) ? cl.monede.filter(function (x) { return x && x.bot && String(x.simbol || "").split("_")[0] === sym; })[0] : null; return b ? String(b.dir || "").toLowerCase() : null; }
function sugPandaHtml(l, cl, acum) {
  var t = typeof Latime !== "undefined" ? Latime.textCitire(l, null, acum) : null, a = l && l.acum;
  var cap = '<div class="tbBlocCap sugPandaCap"><h4>Lățimea pieței · 150 perp-uri Binance</h4><span class="tbSub">' + (a ? (t.vechi ? "veche, de la " : "acum ") + t.text.split(" · ").pop().replace(/^(acum|veche, de la) /, "") + " · din colector, la 15 min" : "") + '</span></div>';
  if (!a) return '<div class="tbBloc sugPanda">' + cap + '<p class="tbSub">' + sugEsc(t ? t.text : "aștept lățimea pieței (vine o dată la 15 minute)") + '</p></div>';
  var L = a.lat, nMas = a.n - (a.lipsa || 0), regim = Latime.regimText[a.regim && a.regim.cod] || "necunoscută", deCand = Latime.regimDeCand(l.istoric, acum).text;
  var h = '<div class="tbBloc sugPanda">' + cap
    + '<p class="tbCitScurt">Piața e <b>' + sugEsc(regim) + '</b>' + (deCand ? " " + sugEsc(deCand) : "") + ': ' + L.sus + ' monede sus, ' + L.jos + ' jos. Conturile mari sunt long pe ' + L.mariLong + ' din ' + nMas + '.' + (a.regim && a.regim.cod !== "AMESTECAT" && a.regim.cod !== "NECUNOSCUT" ? ' Riscul e corelat, nu diversificat.' : '') + (a.incomplet ? ' Măsurat pe ' + nMas + ' din ' + a.n + '.' : '') + '</p>'
    + '<p class="tbSub">' + L.fundExtrem + ' în funding extrem · ' + L.oiExtrem + ' în OI extrem · ' + L.volExtrem + ' cu volatilitate extremă · ' + L.bugetEpuizat + ' cu bugetul zilei epuizat</p>'
    + '<p class="tbSub sugPandaCinste">Fapte, nu semnal: filtrul de permisiune și fișa de intrare ale lui PAZNIC n-au selectat nimic (p = 0,23; 78 trade-uri pe hârtie) și nu sunt aici.</p>';
  if (!sugStare.panda.desfacut) return h + '<button type="button" class="t212BtnLinie" data-action-click="sugPandaDesfa()">arată cele ' + a.n + ' ›</button></div>';
  var boti = sugBotiSimboluri(cl), m = a.monede || [], f = sugStare.panda.filtru, cate = function (k) { return Latime.filtreaza(m, k, boti).length; };
  var filtre = [["toate", "toate"], ["boti", "monedele boților mei"], ["contra", "contra mulțimii"], ["extreme", "extreme"], ["sus", "SUS"], ["jos", "JOS"]];
  h += '<div class="sugPandaFiltre">' + filtre.map(function (x) { return '<button type="button" class="t212BtnLinie' + (f === x[0] ? ' ales' : '') + '" data-action-click="sugPanda(\'' + x[0] + '\')">' + sugEsc(x[1]) + ' (' + cate(x[0]) + ')</button>'; }).join("") + '</div>';
  var prag = function (v, p, jos) { return v != null && (jos ? v <= p : v >= p) ? ' prag' : ''; }, P = Latime.PRAGURI;
  h += '<div class="rlTab"><table class="t212Tab sugPandaTab"><thead><tr><th>Monedă</th><th>Direcția 4h</th><th>Vol pctl</th><th>Ext pctl</th><th>Buget zi</th><th>Funding</th><th>OI</th><th>Mari % long</th><th>Mici % long</th><th>Agresiune</th><th>Botul meu</th></tr></thead><tbody>'
    + Latime.filtreaza(m, f, boti).map(function (x) {
      var s = String(x.sym).replace(/USDT$/, ""), db = sugBotDir(cl, s), cu = db ? (db === "neutru" ? "neutru" : x.dir === "neclara" ? "—" : Latime.esteBotContra(db, x.dir === "SUS" ? "LARG-SUS" : "LARG-JOS") ? "CONTRA" : "CU") : null;   /* moneda SUS + bot short = CONTRA; moneda JOS + bot long = CONTRA */
      return '<tr class="sugPandaRand' + (db ? ' bot' : '') + '"><td><b>' + sugEsc(s) + '</b> <span class="tbSub">' + sugEsc(sugZec(x.pret)) + '</span></td>'
        + '<td class="' + (x.dir === "SUS" ? "good" : x.dir === "JOS" ? "bad" : "neutral") + '">' + sugEsc(x.dir === "neclara" ? "neclară" : x.dir) + (x.dir !== "neclara" && x.zileDir != null ? ' <span class="tbSub">de ' + sugCate(x.zileDir, "zi", "zile") + '</span>' : '') + '</td>'
        + '<td class="sugPandaCel' + prag(x.volPctl, P.volPctl) + '">' + sugPc(x.volPctl) + '</td><td class="sugPandaCel' + prag(x.extPctl, P.extPctl) + '">' + sugPc(x.extPctl) + '</td><td class="sugPandaCel' + prag(x.adrUsed, P.adrConsumat) + '">' + (x.adrUsed == null ? "—" : sugZec(x.adrUsed) + "%") + '</td>'
        + '<td class="sugPandaCel' + (prag(x.fundPctl, P.fundPctlSus) || prag(x.fundPctl, P.fundPctlJos, true)) + '">' + sugPc(x.fundPctl) + '</td><td class="sugPandaCel' + prag(x.oiPctl, P.oiPctl) + '">' + sugPc(x.oiPctl) + (x.oiChg != null ? ' <span class="tbSub">' + sugZec(x.oiChg) + '%</span>' : '') + '</td>'
        + '<td>' + sugPc(x.lMari) + '</td><td>' + sugPc(x.lMici) + '</td><td>' + sugPc(x.deltaPctl) + '</td><td class="' + (cu === "CONTRA" ? "bad" : cu === "CU" ? "good" : "tbSub") + '">' + (cu || "—") + '</td></tr>';
    }).join("") + '</tbody></table></div><p class="tbSub">Percentilele sunt față de ultimele 564 de bare de 4h ale fiecărei monede; conturile = Binance (poziții mari / conturi global); agresiunea = cine a fost agresorul (taker). O coloană colorată e un prag atins, nu un sfat.</p></div>';
  return h;
}
function sugPandaDesfa() { sugStare.panda.desfacut = true; sugDeseneaza(); }
function sugPanda(f) { sugStare.panda.filtru = f; sugStare.panda.desfacut = true; sugDeseneaza(); }
```
  ⚠️ „de 1 zi” în probă ⇒ `sugCate(1, "zi", "zile")` trebuie să dea „1 zi” (verifică `TextRo.cate`); `zileDir` 0 ⇒ `de 0 zile` — acceptabil (proba verifică doar i % 7 = 1 pe C1).
  - `public/app.css`: `.sugPandaFiltre{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.sugPandaFiltre .ales{font-weight:800}.sugPandaCel.prag{color:var(--bad,#ff6b6b);font-weight:700}.sugPandaRand.bot td:first-child b{text-decoration:underline dotted}` (culorile din variabilele existente — caută `--bad` în app.css și folosește numele real).

- [ ] **Step 4: rulează** — `node scripts/proba-v100150.mjs` ⇒ A–D verzi; `npm run test:garda-texte` (dacă pachetul Sugestii e strict, adaugă textul pândei în `scripts/lib/garda-sugestii-act.mjs` după tiparul situațiilor de acolo) ⇒ verde.

- [ ] **Step 5: commit** — `git add public/lib/sugestii-ecran.js public/app.css scripts/proba-v100150.mjs && git commit -m "feat(radar): pânda în Sugestii - lățimea ca prim bloc, tabelul celor 150 cu filtre (I-584, I-585, I-586)"` + memo.

---

### Task 6: versiuni, lanțul de probe, suita întreagă

**Files:**
- Modify: `BUILD_INFO.json` (`version`, `badge`, `releaseType`), `public/index.html` (4 locuri `v100.149` ⇒ `v100.150`; badge-ul: `v100.150 · LĂȚIMEA PIEȚEI PE 150 PERP-URI, PÂNDA`), `public/sw.js` (`CACHE="crypto-radar-v100-150"`), `package.json` (`"test:v100150": "node scripts/proba-v100150.mjs"`, `"test:v100150col": …` și ambele adăugate la capătul lanțului `"test"`)

- [ ] **Step 1: bump-urile** — cu Edit, câte unul; apoi `grep -n "v100.149" public/index.html public/sw.js BUILD_INFO.json` ⇒ 0 rezultate.
- [ ] **Step 2: suita întreagă** — `npm test` (durează câteva minute) ⇒ 0 picate. Orice roșu se repară înainte de a merge mai departe; nu se „sare”.
- [ ] **Step 3: garda comentariilor și a textelor** — `npm run test:garda-comentarii && npm run test:garda-texte` ⇒ verzi.
- [ ] **Step 4: commit** — `git add BUILD_INFO.json public/index.html public/sw.js package.json && git commit -m "chore(radar): v100.150 / colector v101.93 - versiuni, probele v100150 în lanț"` + memo.

---

### Task 7: pozele (regula lui: „gata” = poză lângă planșă) + proba de telefon

**Files:**
- Create (scratchpad, nu în repo): `…\scratchpad\poze-v100150.mjs` — pornește din `macheta-latime.mjs` (Chrome prin CDP, jetonul din `.dev.vars`), FĂRĂ injecție: pagina reală după `node scripts/tura-latime-o-data.mjs` (Task 3 Step 6).

- [ ] **Step 1: date reale în KV** — `node scripts/tura-latime-o-data.mjs` (dacă n-a rulat în ultimele 15 min).
- [ ] **Step 2: pozele** — Tablou `#tbCitire` la 1920 și `#tbCitireMobil` la 390; Sugestii `#sugestii` la 1920 pliat, desfăcut (`sugPandaDesfa()` prin `b.ev`), și la 390 pliat + desfăcut (tabelul trebuie să deruleze lateral, pagina NU). Deschide-le cu Read și judecă: rândul după „Trendul pe TF-uri”, blocul primul, cifrele cu virgulă, nimic tăiat.
- [ ] **Step 3: proba de telefon** — `node scripts/proba-ecran-telefon.mjs http://127.0.0.1:8788/ <dosarPoze> sugestii,tabloubot` ⇒ verde (pagina nu e mai lată decât ecranul). Profilul Chrome șters la final (`stergeProfilul`), verificat cu `ls`.
- [ ] **Step 4: trimite pozele** lui (SendUserFile) + memo cu ce s-a văzut.

---

### Task 8: comparația cu PAZNIC (I-587, criteriul scris înainte)

**Files:**
- Create: `scripts/proba-latime-vs-paznic.mjs`
- Create (scris de script): `data/latime-vs-paznic.jsonl` (verifică întâi că `data/` e în `.gitignore`: `grep -n "^data" .gitignore`; dacă nu, scrie în `scratchpad/`)

- [ ] **Step 1: scriptul**:

```js
// Comparația lățimii Radarului cu PAZNIC (I-587): citește C:\Users\Cimin\PAZNIC-CRYPTO\stare.json și KV-ul local `latime`, la ture
// apropiate (≤ 15 min), și scrie Δ pe agregate + acordul pe direcții. Criteriul, scris ÎNAINTE (spec §3): |Δ| ≤ 3 pe sus / jos /
// mariLong / volExtrem / oiExtrem și acord ≥ 95 % pe direcțiile monedelor comune, 3 zile la rând ⇒ EL oprește Paznic Robot / Paza /
// Panou / Publica. Rulare: node scripts/proba-latime-vs-paznic.mjs   (adaugă un rând în data/latime-vs-paznic.jsonl)
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), BAZA = "http://127.0.0.1:8788";
const jeton = (fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/).find((l) => l.startsWith("APP_API_TOKEN=")) || "").slice(14).trim();
const paznic = JSON.parse(fs.readFileSync("C:/Users/Cimin/PAZNIC-CRYPTO/stare.json", "utf8"));
const r = await (await fetch(BAZA + "/api/istoric-bot?action=latime", { headers: { authorization: "Bearer " + jeton } })).json();
const a = r && r.latime && r.latime.acum; if (!a) { console.log("KV fără lățime - rulează tura-latime-o-data.mjs"); process.exit(1); }
const dt = Math.abs(a.la - Date.parse(paznic.cand)) / 60000;
const L = paznic.latime, d = { sus: a.lat.sus - L.sus, jos: a.lat.jos - L.jos, mariLong: a.lat.mariLong - L.mariLong, volExtrem: a.lat.volExtrem - L.volExtrem, oiExtrem: a.lat.oiExtrem - L.oiExtrem };
const dirRadar = new Map(a.monede.map((m) => [m.sym, m.dir])), comune = Object.keys(paznic.dir).filter((s) => dirRadar.has(s));
const acord = comune.filter((s) => (paznic.dir[s] === "SUS" ? "SUS" : paznic.dir[s] === "JOS" ? "JOS" : "neclara") === dirRadar.get(s)).length;
const rand = { la: a.la, paznicLa: paznic.cand, minuteIntre: Math.round(dt), regimRadar: a.regim.cod, regimPaznic: paznic.regim.cod, delta: d, comune: comune.length, acordPct: comune.length ? Math.round(1000 * acord / comune.length) / 10 : null };
rand.trece = dt <= 15 && Object.values(d).every((x) => Math.abs(x) <= 3) && rand.acordPct !== null && rand.acordPct >= 95;
console.log(JSON.stringify(rand, null, 1));
fs.appendFileSync(path.join(RAD, "data", "latime-vs-paznic.jsonl"), JSON.stringify(rand) + "\n");
const toate = fs.readFileSync(path.join(RAD, "data", "latime-vs-paznic.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const zile = new Set(toate.filter((x) => x.trece).map((x) => new Date(x.la).toISOString().slice(0, 10)));
console.log(zile.size >= 3 ? "\nCRITERIUL TRECE pe " + zile.size + " zile: EL poate opri sarcinile Paznic Robot / Paznic Paza / Paznic Panou / Paznic Publica (Get-ScheduledTask -TaskName 'Paznic *' | Disable-ScheduledTask)." : "\nîncă " + (3 - zile.size) + " zile cu criteriul trecut (azi: " + (rand.trece ? "trece" : "NU trece") + ")");
```

- [ ] **Step 2: prima rulare** — după `tura-latime-o-data.mjs` și o tură PAZNIC apropiată (PAZNIC scanează la :02/:17/:32/:47): `node scripts/proba-latime-vs-paznic.mjs`. Așteptat la prima rulare: Δ mici pe sus/jos, posibil diferențe pe `volExtrem` (fereastra de 564 trebuie să fie identică - dacă Δ > 3 aici, compară `atrSerie` cu `decizie.mjs:405` înainte de orice altceva). Scrie în memo cifrele.
- [ ] **Step 3: commit** — `git add scripts/proba-latime-vs-paznic.mjs && git commit -m "test(radar): comparația lățimii cu PAZNIC, criteriul scris înainte (I-587)"` + memo.

---

### Task 9: revizia, push, predarea

- [ ] **Step 1: revizie de cod cu agent nou** (regula lui: Opus 5.5 / Fable 5.1; `superpowers:requesting-code-review`) pe `git diff eb76da2..HEAD` cu specul și planul în prompt. Reparațiile critice/importante se fac aici, cu probe.
- [ ] **Step 2: suita + push** — `npm test && git push origin main` (hook-ul pre-push rulează proba de telefon pe `public/`; serverul `:8788` e pornit și servește depozitul). Dacă push-ul e respins: `git pull --rebase origin main` apoi din nou `npm test && git push`.
- [ ] **Step 3: verifică pe GitHub** — `git rev-list --count origin/main..main` ⇒ 0; hash-ul în memo.
- [ ] **Step 4: predarea lui** — ⏳ EL: repornește colectorul (`PORNESTE-CRYPTO-RADAR.bat`; cel de acum e v101.92, nu are tura); pagina se reîncarcă singură la v100.150. Ce vede: rândul în Tablou, blocul în Sugestii. Ce urmează: 3 zile `proba-latime-vs-paznic.mjs`, apoi decizia lui pe oprirea PAZNIC (I-587).
- [ ] **Step 5: memorie finală** — `project_paznic_in_radar_11_10.md` (versiuni, hash, durata turei, ce așteaptă la el) + rândul din `MEMORY.md`; backlog I-583..I-586 ⇒ `făcut (v100.150 / colector v101.93, 2026-10-11)` în `premarket_scanner/docs/ideas/backlog.md` + commit + push acolo.
