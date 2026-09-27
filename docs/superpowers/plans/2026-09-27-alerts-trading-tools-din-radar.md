# Pagina `alerts` din Trading Tools în designul Radarului — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pagina `alerts` din suita Trading Tools arată, de oriunde, pozițiile deschise din Radar (boți Pionex + Trading 212) și simbolurile lui cu mișcarea reală, insiderii, rezultatele și analiștii, în designul Radarului, fără praguri.

**Architecture:** colectorul de acasă construiește la 5 minute o „poză” (funcție pură `construiestePoza`) și o urcă în worker-ul Paznicului (Cloudflare, KV); pagina o citește cu o cheie de citire, o randează cu module noi (`lib/radar-*.js`) sub bara suitei, și trimite worker-ului lista ei de simboluri, pe care colectorul o îmbogățește (Yahoo, fără cheie). Pragurile dispar din pagină, din stocare și din workflow-ul GitHub.

**Tech Stack:** Node 24 (colector, teste cu `node:assert` în stilul `scripts/paznic-v97.mjs`; suita cu `node --test tools/*.test.mjs`), Cloudflare Worker + KV (`paznic/wrangler.jsonc`, binding `PAZNIC`), HTML/CSS/JS fără framework în ambele proiecte, Chrome headless prin CDP pentru probele de ecran.

**Spec:** `docs/superpowers/specs/2026-09-27-alerts-trading-tools-din-radar-design.md`

## Global Constraints

- Doar pozițiile deschise: boții activi + pozițiile T212 cu `quantity > 0`. Fără Scan, fără alertele de acasă pe pagină.
- Bara suitei (`header.suite-cockpit.al-topbar`, `.desk-tabs`, filele News/Istoric) NU se modifică; tokenii Radarului stau **scoped** sub `body.al-page .rad`, niciodată pe `:root`.
- Praguri: zero pe pagină (nici în rândul desfăcut, nici în „Adaugă”); câmpurile vechi din `tools/alerts.json` se ignoră la citire și nu se mai scriu; `price-alerts.yml` dezactivat.
- Cheia de citire (`CHEIE_CITIRE`) ≠ `PAZNIC_TOKEN`; ambele ≥ 20 de caractere; niciuna în cod, în git sau în memorie.
- CORS doar pentru `https://mferent80-source.github.io` și `http://127.0.0.1|localhost:<port>`.
- Poza: max 512 KB, `la` obligatoriu; câmp lipsă ⇒ „—” pe ecran, niciodată 0.
- Versiuni: Radar **v98.0** (`BUILD_INFO.json`, `package.json`, badge în `public/index.html`, `CACHE` în `public/sw.js`); suită **tt-v826-2026-09-27** (`sw-app.js` → `node tools/sync-suite-version.mjs`), pagina alerts **v116**.
- Git: `npm test && git commit && git push` (niciodată `;`), commit-uri separate per sarcină, push direct pe `main`; după fiecare push, memo.
- `wrangler deploy` în `paznic/` DOAR cu `triggers.crons` prezent în `wrangler.jsonc` (altfel șterge cronul).
- Textele pe ecran în română, cu diacritice; cifrele cu virgulă zecimală; verde/roșu mereu cu semn, săgeată sau text lângă.
- „Gata” = pozele reale la 1920 și 390 lângă pozele demo-ului v4, lista diferențelor goală.

## Review Focus

1. **Poza veche sau lipsă** (worker gol, colector oprit, cheie greșită): pagina trebuie să arate ultima poză din browser cu ștampila ei și chip-ul potrivit, niciodată cifre fără vârstă — Task 3, testul `prospetime`.
2. **Simbol fără date externe** (bursă germană fără Form 4, Yahoo picat, `closes30` sub 6 elemente): rândul se randează cu „—”/„fără Form 4”, nu aruncă și nu scrie NaN — Task 2 `poza-v98` și Task 3 `radar-ecran.test`.
3. **Lista veche de alerte cu praguri** în browser și în `alerts.json`: migrarea păstrează fiecare simbol o singură dată, cu notița, și nu re-creează praguri la sincronizare — Task 3, testul `migrare`.
4. **Bot fără plan / poziție fără plan**: `stop` din plan lipsește ⇒ rândul arată „fără plan”, nu un stop de 0 — Task 2 fixture `t212 fără plan`.
5. **Poză prea mare** (istoric de 30 de poze × mulți boți, top 3 tranzacții × 60 de simboluri): worker-ul refuză cu 413 și colectorul scrie în jurnal, nu moare — Task 1 testul `413`, Task 2 testul de mărime.

---

### Task 1: Worker-ul Paznicului — rutele `/poza` și `/simboluri`, cheia de citire, CORS

**Files:**
- Modify: `crypto/paznic/worker.mjs`
- Create: `crypto/scripts/paznic-poza-v98.mjs`
- Modify: `crypto/package.json` (scriptul `test:colector`)

**Interfaces:**
- Consumes: `env.PAZNIC` (KV), `env.PAZNIC_TOKEN`, `env.CHEIE_CITIRE` (secret nou), `env.DISCORD_WEBHOOK` (neschimbat).
- Produces (folosite de Task 2 și Task 3): `POST /poza` (Bearer PAZNIC_TOKEN, corp = JSON-ul pozei) → `{ok, la, marime}`; `GET /poza` (Bearer CHEIE_CITIRE, opțional `If-None-Match`) → JSON-ul pozei + antet `ETag: "<la>"`, sau 304, sau 404 `{error:"nicio poza inca"}`; `POST /simboluri` (Bearer CHEIE_CITIRE, corp `{simboluri:[{s, nota}]}`) → `{ok, n}`; `GET /simboluri` (Bearer PAZNIC_TOKEN) → `{simboluri:[{s, nota}], la}`; `OPTIONS` pe orice rută → 204 cu CORS. Exporturi pentru teste: `pozaScrie(env, text)`, `pozaCiteste(env, ifNoneMatch)`, `simboluriScrie(env, text)`, `simboluriCiteste(env)`, `origineOk(origine)`.

- [ ] **Step 1: Scrie testul care pică** — `crypto/scripts/paznic-poza-v98.mjs`

```js
// Proba rutelor /poza si /simboluri ale paznicului (v98): tokenul colectorului, cheia de citire, ETag/304, CORS, marimea. Fara retea.
// Rulare: node scripts/paznic-poza-v98.mjs
import assert from "node:assert/strict";
import paznic, { pozaScrie, pozaCiteste, simboluriScrie, simboluriCiteste, origineOk } from "../paznic/worker.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const TOK = "t".repeat(32), CHEIE = "c".repeat(32);
function lume() {
  const kv = new Map();
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, PAZNIC_TOKEN: TOK, CHEIE_CITIRE: CHEIE, DISCORD_WEBHOOK: "" };
  const cere = (cale, m, h = {}, corp) => paznic.fetch(new Request("https://paznic.test" + cale, { method: m, headers: h, body: corp }), env);
  return { env, kv, cere };
}
const POZA = JSON.stringify({ la: 1790530000000, versiune: "v98.0", t212: [], boti: [], simboluri: [] });

await test("POST /poza: fara token 401; cu tokenul colectorului scrie poza si 'la'; JSON stricat 400; fara 'la' 400", async () => {
  const w = lume();
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + CHEIE }, POZA)).status, 401, "cheia de citire NU scrie poza");
  const r = await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, POZA);
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.ok, true); assert.equal(j.la, 1790530000000); assert.equal(j.marime, POZA.length);
  assert.equal(w.kv.get("poza:la"), "1790530000000");
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, "{nu e json")).status, 400);
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, JSON.stringify({ t212: [] }))).status, 400);
});
await test("POST /poza peste 512 KB: 413, nimic scris", async () => {
  const w = lume(), mare = JSON.stringify({ la: 1, umplutura: "x".repeat(512 * 1024) });
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, mare)).status, 413); assert.equal(w.kv.size, 0);
});
await test("GET /poza: fara cheie 401; fara poza 404; cu cheie -> poza + ETag; If-None-Match -> 304", async () => {
  const w = lume();
  assert.equal((await w.cere("/poza", "GET", {})).status, 401);
  assert.equal((await w.cere("/poza", "GET", { authorization: "Bearer " + TOK })).status, 401, "tokenul colectorului NU citeste poza");
  assert.equal((await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE })).status, 404);
  await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, POZA);
  const r = await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE });
  assert.equal(r.status, 200); assert.equal(r.headers.get("etag"), '"1790530000000"'); assert.equal((await r.json()).versiune, "v98.0");
  assert.equal((await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE, "if-none-match": '"1790530000000"' })).status, 304);
});
await test("simboluri: pagina scrie cu cheia (curatate, fara dubluri, max 60), colectorul citeste cu tokenul", async () => {
  const w = lume();
  assert.equal((await w.cere("/simboluri", "POST", { authorization: "Bearer " + TOK }, "{}")).status, 401);
  const l = { simboluri: [{ s: "avgo", nota: "x" }, { s: "AVGO" }, { s: "rhm.de", nota: "Rheinmetall" }, { s: "" }, { s: "1QZ.DE" }] };
  const r = await w.cere("/simboluri", "POST", { authorization: "Bearer " + CHEIE }, JSON.stringify(l));
  assert.equal(r.status, 200); assert.equal((await r.json()).n, 3);
  assert.equal((await w.cere("/simboluri", "GET", { authorization: "Bearer " + CHEIE })).status, 401, "cheia de citire NU citeste lista (nu are de ce)");
  const g = await (await w.cere("/simboluri", "GET", { authorization: "Bearer " + TOK })).json();
  assert.deepEqual(g.simboluri.map((x) => x.s), ["AVGO", "RHM.DE", "1QZ.DE"]); assert.equal(g.simboluri[1].nota, "Rheinmetall");
  const multe = { simboluri: Array.from({ length: 80 }, (_, i) => ({ s: "S" + i })) };
  assert.equal((await (await w.cere("/simboluri", "POST", { authorization: "Bearer " + CHEIE }, JSON.stringify(multe))).json()).n, 60);
});
await test("CORS: originea suitei primeste antetele, alta origine nu; OPTIONS = 204", async () => {
  const w = lume();
  assert.equal(origineOk("https://mferent80-source.github.io"), true); assert.equal(origineOk("http://localhost:8777"), true); assert.equal(origineOk("https://rau.exemplu"), false); assert.equal(origineOk(null), false);
  const o = await w.cere("/poza", "OPTIONS", { origin: "https://mferent80-source.github.io", "access-control-request-method": "GET" });
  assert.equal(o.status, 204); assert.equal(o.headers.get("access-control-allow-origin"), "https://mferent80-source.github.io"); assert.match(o.headers.get("access-control-allow-headers"), /authorization/i);
  await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, POZA);
  const r = await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE, origin: "https://mferent80-source.github.io" });
  assert.equal(r.headers.get("access-control-allow-origin"), "https://mferent80-source.github.io"); assert.equal(r.headers.get("access-control-expose-headers"), "etag");
  const s = await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE, origin: "https://rau.exemplu" });
  assert.equal(s.headers.get("access-control-allow-origin"), null, "alta origine nu primeste CORS (browserul ei nu poate citi)");
});
await test("/bataie merge ca inainte (nu s-a stricat v97)", async () => {
  const w = lume(); const r = await w.cere("/bataie", "POST", { authorization: "Bearer " + TOK }, JSON.stringify({ pid: 1 }));
  assert.equal(r.status, 200); assert.equal(JSON.parse(w.kv.get("stare")).pid, 1);
});
await test("functiile pure: pozaScrie / pozaCiteste / simboluriScrie / simboluriCiteste", async () => {
  const w = lume();
  assert.equal((await pozaScrie(w.env, "{}")).status, 400);
  assert.equal((await pozaScrie(w.env, POZA)).status, 200);
  assert.equal((await pozaCiteste(w.env, null)).status, 200); assert.equal((await pozaCiteste(w.env, '"1790530000000"')).status, 304);
  assert.equal((await simboluriScrie(w.env, JSON.stringify({ simboluri: [{ s: "a" }] }))).corp.n, 1);
  assert.equal((await simboluriCiteste(w.env)).simboluri[0].s, "A");
});

console.log(`PAZNIC_POZA_V98 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
```

- [ ] **Step 2: Rulează testul, trebuie să pice**

Run: `cd C:/Users/Cimin/crypto && node scripts/paznic-poza-v98.mjs`
Expected: eroare de import (`pozaScrie` nu există) sau toate testele PICA.

- [ ] **Step 3: Implementează în `paznic/worker.mjs`**

Înlocuiește `const J = …` și `export default {…}` cu:

```js
const POZA_MAX = 512 * 1024, SIMBOLURI_MAX = 60;
const ORIGINI = [/^https:\/\/mferent80-source\.github\.io$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/];
export function origineOk(o) { return !!o && ORIGINI.some((r) => r.test(String(o))); }
function cors(request) {
  const o = request.headers.get("origin");
  if (!origineOk(o)) return {};
  return { "access-control-allow-origin": o, "access-control-allow-headers": "authorization, content-type, if-none-match", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-expose-headers": "etag", "vary": "origin" };
}
const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...h } });
function autorizat(request, secret) { const s = String(secret || ""); return s.length >= 20 && request.headers.get("authorization") === "Bearer " + s; }

// poza colectorului: scrisa de acasa cu tokenul, citita de pagina cu cheia de citire
export async function pozaScrie(env, text) {
  if (text.length > POZA_MAX) return { status: 413, corp: { error: "poza prea mare", max: POZA_MAX, marime: text.length } };
  let p; try { p = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  if (!p || typeof p !== "object" || Array.isArray(p) || !(Number(p.la) > 0)) return { status: 400, corp: { error: "lipseste 'la'" } };
  await env.PAZNIC.put("poza", text); await env.PAZNIC.put("poza:la", String(Number(p.la)));
  return { status: 200, corp: { ok: true, la: Number(p.la), marime: text.length } };
}
export async function pozaCiteste(env, ifNoneMatch) {
  const la = await env.PAZNIC.get("poza:la"); if (!la) return { status: 404, corp: { error: "nicio poza inca" } };
  const etag = '"' + la + '"'; if (ifNoneMatch && ifNoneMatch === etag) return { status: 304, etag };
  return { status: 200, text: await env.PAZNIC.get("poza"), etag };
}
// lista de simboluri a paginii, pentru colector (max 60, curatate, fara dubluri)
export async function simboluriScrie(env, text) {
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const l = c && Array.isArray(c.simboluri) ? c.simboluri : null; if (!l) return { status: 400, corp: { error: "lipseste 'simboluri'" } };
  const out = [], vazut = new Set();
  for (const x of l) {
    const s = String(x && x.s || "").toUpperCase().replace(/[^A-Z0-9.\-=^]/g, "").slice(0, 16);
    if (!s || vazut.has(s)) continue; vazut.add(s); out.push({ s, nota: String(x && x.nota || "").slice(0, 80) });
    if (out.length >= SIMBOLURI_MAX) break;
  }
  await env.PAZNIC.put("simboluri", JSON.stringify({ simboluri: out, la: Date.now() }));
  return { status: 200, corp: { ok: true, n: out.length } };
}
export async function simboluriCiteste(env) { let o = null; try { o = JSON.parse(await env.PAZNIC.get("simboluri") || "null"); } catch { o = null; } return o && Array.isArray(o.simboluri) ? o : { simboluri: [], la: null }; }

export default {
  async fetch(request, env) {
    const u = new URL(request.url), h = cors(request), m = request.method;
    if (m === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (u.pathname === "/bataie") {
      if (m !== "POST") return J({ error: "doar POST" }, 405, h);
      if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h);
      let corp = null; try { corp = JSON.parse((await request.text()).slice(0, 2000)); } catch { corp = null; }
      const s = await bataie(env, corp, Date.now());
      return J({ ok: true, la: s.la }, 200, h);
    }
    if (u.pathname === "/poza") {
      if (m === "POST") { if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h); const r = await pozaScrie(env, await request.text()); return J(r.corp, r.status, h); }
      if (m === "GET") {
        if (!autorizat(request, env.CHEIE_CITIRE)) return J({ error: "cheia de citire lipseste sau nu e buna" }, 401, h);
        const r = await pozaCiteste(env, request.headers.get("if-none-match"));
        if (r.status === 304) return new Response(null, { status: 304, headers: { ...h, etag: r.etag } });
        if (r.status !== 200) return J(r.corp, r.status, h);
        return new Response(r.text, { status: 200, headers: { ...h, "content-type": "application/json", "cache-control": "no-store", etag: r.etag } });
      }
      return J({ error: "doar GET sau POST" }, 405, h);
    }
    if (u.pathname === "/simboluri") {
      if (m === "POST") { if (!autorizat(request, env.CHEIE_CITIRE)) return J({ error: "cheia de citire lipseste sau nu e buna" }, 401, h); const r = await simboluriScrie(env, await request.text()); return J(r.corp, r.status, h); }
      if (m === "GET") { if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h); return J(await simboluriCiteste(env), 200, h); }
      return J({ error: "doar GET sau POST" }, 405, h);
    }
    return J({ serviciu: "paznicul colectorului Crypto Radar" }, 200, h);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(verifica(env, Date.now())); }
};
```

Comentariul din capul fișierului primește o linie: `v98: /poza (poza colectorului pentru pagina alerts din Trading Tools) si /simboluri (lista paginii), cheia de citire CHEIE_CITIRE (wrangler secret put).`

- [ ] **Step 4: Rulează testele, trebuie să treacă (și cel vechi)**

Run: `node scripts/paznic-poza-v98.mjs && node scripts/paznic-v97.mjs`
Expected: `PAZNIC_POZA_V98 PASS · 7/7` și `PAZNIC_V97 PASS · 4/4`.

- [ ] **Step 5: Leagă testul în `package.json`** — în `test:colector`, după `node scripts/paznic-v97.mjs` adaugă ` && node scripts/paznic-poza-v98.mjs`.

- [ ] **Step 6: Publică worker-ul + secretul (fără să atingi cronul)**

```bash
cd C:/Users/Cimin/crypto/paznic
node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"   # cheia de citire, o dată; i-o dai lui Marius în chat, NU o scrii nicăieri
npx --yes wrangler@4.137.0 secret put CHEIE_CITIRE      # lipești cheia
grep -c '"crons"' wrangler.jsonc                        # trebuie 1
npx --yes wrangler@4.137.0 deploy
curl -s -X OPTIONS -H "origin: https://mferent80-source.github.io" -i https://<paznic-url>/poza | head -5    # 204 + allow-origin
```

Adresa worker-ului e `PAZNIC_URL` din `.dev.vars` al Radarului (nu o pune în plan/memorie; citește-o cu `grep PAZNIC_URL .dev.vars`).

- [ ] **Step 7: Commit + push**

```bash
cd C:/Users/Cimin/crypto && npm test && git add paznic/worker.mjs scripts/paznic-poza-v98.mjs package.json && git commit -m "v98.0 (1/3): paznicul primeste poza colectorului si lista de simboluri, cheia de citire, CORS pe suita" && git push origin main
```

Apoi memo în `project_crypto_radar.md` (worker publicat, rutele, secretul pus, FĂRĂ valoarea lui).

---

### Task 2: Colectorul — `poza.mjs` (pură), `yahoo-extra.mjs`, `turaPoza`, Radar v98.0

**Files:**
- Create: `crypto/scripts/lib/poza.mjs`
- Create: `crypto/scripts/lib/yahoo-extra.mjs`
- Create: `crypto/scripts/poza-v98.mjs` (test)
- Modify: `crypto/scripts/colector.mjs` (import, `ultimiiBoti`, `pret30`, `turaPoza`, `bucla()`)
- Modify: `crypto/BUILD_INFO.json`, `crypto/package.json` (versiune + `test:colector`), `crypto/public/index.html` (badge), `crypto/public/sw.js` (`CACHE`)

**Interfaces:**
- Consumes: Task 1 (`POST /poza`, `GET /simboluri`); din colector: `cere(cale)`, `trimite(cale, corp)`, `jurnal(...)`, `PAZNIC_URL`, `PAZNIC_TOKEN`, `TabloExtra.dacaInchizi(b, comision)`, `ActiuniSemnale.stare(bare, pret)`, `.semafor(p, st)`, `.niveluri(bare, pret, {pretMediu, maxDupaCumparare, minTrail})`, `T212.simbol(ticker)`, `GridCalcul.bareBursa(randuri, acum)`, `directii[b.id]`, `semnaleUlt[b.id]`.
- Produces: `construiestePoza(intrare)` → obiectul pozei (contract §4 din spec); `insideri(tranzactii, acum)` → `{form4, buys, sells, bp, sp, net, verdict, top, n60}`; `clasifica(text)` → `"buy" | "sell" | null`; `esantion(lista, n)`; `YahooExtra.closes(simbol)` → `{closes30, prev, pret, la}`; `YahooExtra.extra(simbol)` → `{tranzactii, rezultate:{data, eps}, analisti:{tinta, recom, n}, shortFloat}`.

- [ ] **Step 1: Scrie testul care pică** — `crypto/scripts/poza-v98.mjs`

```js
// Proba pozei colectorului (v98): construirea din fixture-uri, regula insiderilor, campurile lipsa, marimea. Fara retea.
// Rulare: node scripts/poza-v98.mjs
import assert from "node:assert/strict";
import { construiestePoza, insideri, clasifica, esantion, costLeiDinLoturi } from "./lib/poza.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const ACUM = Date.UTC(2026, 8, 27, 13, 20);
const ZI = 86400000;
const bare = (n, de) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * ZI, o: de + i, h: de + i + 1, l: de + i - 1, c: de + i * 0.5 }));

await test("clasifica: Purchase = buy, Sale/Gift = sell, grant/conversie/gol = null", () => {
  assert.equal(clasifica("Purchase at price 95.00 per share."), "buy");
  assert.equal(clasifica("Sale at price 401.33 per share."), "sell");
  assert.equal(clasifica("Stock Gift at price 0.00 per share."), "sell");
  assert.equal(clasifica("Stock Award(Grant) at price 0.00 per share."), null);
  assert.equal(clasifica("Conversion of Exercise of derivative security at price 18.24"), null);
  assert.equal(clasifica(""), null); assert.equal(clasifica(null), null);
});
await test("insideri: 60 de zile, verdict bull1 / bear / neut, top 3 dupa valoare, fara Form 4", () => {
  const tx = (d, cine, ce, act, val) => ({ startDate: { fmt: d }, filerName: cine, filerRelation: "Officer", transactionText: ce, shares: { raw: act }, value: { raw: val } });
  const i = insideri([tx("2026-08-11", "TAN LIP-BU", "Purchase at price 95.00 per share.", 105263, 9999985), tx("2026-05-01", "VECHI", "Purchase at 1", 5, 5)], ACUM);
  assert.equal(i.form4, true); assert.equal(i.buys, 1); assert.equal(i.sells, 0); assert.equal(i.verdict, "bull1"); assert.equal(i.net, 105263); assert.equal(i.top[0].cine, "Tan Lip-Bu");
  const v = insideri([tx("2026-09-14", "A", "Sale at price 1", 10, 100), tx("2026-09-13", "B", "Sale at price 1", 20, 900), tx("2026-09-12", "C", "Sale at price 1", 30, 500), tx("2026-09-11", "D", "Sale at price 1", 40, 50)], ACUM);
  assert.equal(v.verdict, "bear"); assert.equal(v.sp, 4); assert.deepEqual(v.top.map((t) => t.cine), ["B", "C", "A"]);
  assert.equal(insideri([tx("2026-09-01", "X", "Stock Award(Grant)", 1000, 0)], ACUM).verdict, "neut");
  assert.equal(insideri([], ACUM).form4, false); assert.equal(insideri(null, ACUM).form4, false);
});
await test("esantion: 30 din 1755 puncte, capetele pastrate; lista scurta ramane intreaga", () => {
  const l = Array.from({ length: 1755 }, (_, i) => i);
  const e = esantion(l, 30); assert.equal(e.length, 30); assert.equal(e[0], 0); assert.equal(e[29], 1754);
  assert.deepEqual(esantion([1, 2, 3], 30), [1, 2, 3]); assert.deepEqual(esantion([], 30), []);
});
await test("costLeiDinLoturi: FIFO pe loturile deschise ale tickerului; cantitate nepotrivita > 2% -> null", () => {
  const lot = [{ ticker: "AVGO_US_EQ", qty: 2, costBuc: 1800 }, { ticker: "AVGO_US_EQ", qty: 0.8187, costBuc: 1850 }, { ticker: "APLD_US_EQ", qty: 50, costBuc: 130 }];
  assert.ok(Math.abs(costLeiDinLoturi(lot, "AVGO_US_EQ", 2.8187) - (2 * 1800 + 0.8187 * 1850)) < 0.01);
  assert.equal(costLeiDinLoturi(lot, "AVGO_US_EQ", 5), null); assert.equal(costLeiDinLoturi([], "X", 1), null);
});
await test("construiestePoza: T212 cu plan, fara plan, fara bare; bot cu grile si fara plan; simbol fara Form 4; gol", () => {
  const p = construiestePoza({
    acum: ACUM, versiune: "v98.0", pid: 7, tura: 3,
    t212: [
      { ticker: "AVGO_US_EQ", simbol: "AVGO", qty: 2.8187, pretMediu: 399.96, pret: 352.81, prev: 350.36, ppl: -615, costLei: 5211, bare: bare(60, 340), plan: { trailPct: 15, tinta: 413.47 }, maxDupaCumparare: 412.5, pondere: 0.157, sem: { nivel: "atentie", motive: ["trend în jos"], ceAsFace: "👉 aș ieși" }, niv: { nivel: "ok", stop: 350.63, tinta: 413.47, trend: "jos" } },
      { ticker: "UHS_US_EQ", simbol: "UHS", qty: 3.6, pretMediu: 184.51, pret: 178.86, prev: 176.99, ppl: -94, costLei: null, bare: bare(60, 170), plan: null, maxDupaCumparare: 181.39, pondere: 0.1, sem: { nivel: "tine", motive: [], ceAsFace: "" }, niv: null },
      { ticker: "NOU_US_EQ", simbol: "NOU", qty: 1, pretMediu: 10, pret: 11, prev: null, ppl: 4, costLei: 46, bare: [], plan: null, maxDupaCumparare: null, pondere: 0.01, sem: null, niv: null }
    ],
    boti: [{ id: "2383", baza: "VVV.PERP", directie: "long", levier: 4, investit: 91.9, gridJos: 28.464, gridSus: 33.346, pretCurent: 29.64, distantaLichidarePct: 25.05, ordinePerechi: 0, gridProfitBrut: 0, profitNet: -0.185, comisioane: -0.106, profitTotal: -4.42, plan: null, zero: 30.1548, pret30: [30.4, 29.6, 29.64], semafor: { nivel: "atentie", motive: ["costuri"], ceAsFace: "aș ieși pe zero" } }],
    simboluri: [
      { s: "INTC", nota: "", sursa: null, moneda: "$", pret: 123, prev: 127.39, closes30: [100, 123], extra: { tranzactii: [{ startDate: { fmt: "2026-08-11" }, filerName: "TAN", transactionText: "Purchase at 95", shares: { raw: 5 }, value: { raw: 475 } }], rezultate: { data: "2026-10-22", eps: 0.39 }, analisti: { tinta: 116.37, recom: "buy", n: 43 }, shortFloat: 0.03 } },
      { s: "RHM.DE", nota: "Rheinmetall", sursa: null, moneda: "€", pret: 982.4, prev: 990, closes30: [], extra: { tranzactii: [], rezultate: { data: "2026-11-05", eps: 6.66 }, analisti: { tinta: 1641.29, recom: "strong_buy", n: 20 }, shortFloat: null } },
      { s: "1QZ.DE", nota: "", sursa: "COIN", moneda: "€", pret: 170.12, prev: 172.54, closes30: [150, 170.12], extra: null }
    ]
  });
  assert.equal(p.la, ACUM); assert.equal(p.versiune, "v98.0"); assert.deepEqual(p.colector, { pid: 7, tura: 3 });
  const a = p.t212[0]; assert.equal(a.s, "AVGO"); assert.equal(a.plan.stop, 350.63); assert.equal(a.plan.max, 412.5); assert.equal(a.niv, "atentie"); assert.equal(a.trend, "jos"); assert.ok(Math.abs(a.pctLei - (-615 / 5211)) < 1e-9); assert.equal(a.closes30.length, 30); assert.equal(a.pplLei, -615);
  const u = p.t212[1]; assert.equal(u.plan, null, "fara plan = null, nu stop 0"); assert.equal(u.pctLei, null); assert.ok(Math.abs(u.pctPret - (178.86 / 184.51 - 1)) < 1e-9);
  const n = p.t212[2]; assert.deepEqual(n.closes30, []); assert.equal(n.prev, null); assert.equal(n.niv, null); assert.deepEqual(n.motive, []);
  const b = p.boti[0]; assert.equal(b.s, "VVV"); assert.equal(b.dir, "long"); assert.ok(Math.abs(b.inGrid - (29.64 - 28.464) / (33.346 - 28.464)) < 1e-9); assert.ok(Math.abs(b.pozitie - (-4.42 - 0 - (-0.106))) < 1e-9); assert.equal(b.plan, null); assert.equal(b.zero, 30.1548); assert.deepEqual(b.pret30, [30.4, 29.6, 29.64]);
  const i = p.simboluri[0]; assert.equal(i.insideri.verdict, "bull1"); assert.equal(i.rezultate.zile, 25); assert.equal(i.analisti.recom, "buy");
  const r = p.simboluri[1]; assert.equal(r.insideri.form4, false); assert.equal(r.shortFloat, null); assert.deepEqual(r.closes30, []);
  const q = p.simboluri[2]; assert.equal(q.sursa, "COIN"); assert.equal(q.insideri, null); assert.equal(q.rezultate, null);
  assert.equal(JSON.stringify(p).includes("NaN"), false); assert.equal(JSON.stringify(p).includes("undefined"), false);
  const gol = construiestePoza({ acum: ACUM, versiune: "v98.0", t212: [], boti: [], simboluri: [] });
  assert.deepEqual(gol.gol, { boti: "niciun bot activ", t212: "nicio poziție deschisă" }); assert.equal(p.gol.boti, null);
});
await test("marimea: 12 boti x 30 poze + 60 simboluri x top 3 ramane sub 512 KB", () => {
  const b = Array.from({ length: 12 }, (_, i) => ({ id: String(i), baza: "X" + i + ".PERP", directie: "long", levier: 3, investit: 100, gridJos: 1, gridSus: 2, pretCurent: 1.5, distantaLichidarePct: 20, ordinePerechi: 10, gridProfitBrut: 1, profitNet: 0.5, comisioane: -0.1, profitTotal: 0.4, plan: null, zero: 1.4, pret30: Array.from({ length: 30 }, () => 1.5), semafor: null }));
  const s = Array.from({ length: 60 }, (_, i) => ({ s: "S" + i, nota: "n".repeat(80), sursa: null, moneda: "$", pret: 10, prev: 9, closes30: Array.from({ length: 30 }, () => 10), extra: { tranzactii: Array.from({ length: 40 }, (_, k) => ({ startDate: { fmt: "2026-09-0" + (1 + k % 9) }, filerName: "Nume Lung " + k, filerRelation: "Chief Executive Officer", transactionText: "Sale at price 10", shares: { raw: 1000 }, value: { raw: 10000 } })), rezultate: { data: "2026-10-22", eps: 1 }, analisti: { tinta: 12, recom: "buy", n: 10 }, shortFloat: 0.1 } }));
  const p = construiestePoza({ acum: ACUM, versiune: "v98.0", t212: [], boti: b, simboluri: s });
  assert.ok(JSON.stringify(p).length < 512 * 1024, "sub limita worker-ului");
});

console.log(`POZA_V98 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
```

- [ ] **Step 2: Rulează, trebuie să pice** — `node scripts/poza-v98.mjs` ⇒ `Cannot find module './lib/poza.mjs'`.

- [ ] **Step 3: Scrie `crypto/scripts/lib/poza.mjs`** (pur, fără rețea, fără import din colector)

```js
// Poza colectorului (v98): ce vede pagina `alerts` din Trading Tools, de oriunde. Functie PURA: primeste datele deja
// adunate de colector (boti, pozitii T212, simbolurile paginii cu extra-urile de la Yahoo) si intoarce JSON-ul din
// contractul spec-ului (docs/superpowers/specs/2026-09-27-alerts-trading-tools-din-radar-design.md, §4).
const ZI = 86400000, FEREASTRA_INSIDERI = 60 * ZI;
const nr = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const rot = (x, z = 4) => (nr(x) === null ? null : Math.round(x * 10 ** z) / 10 ** z);

// regula suitei (premarket_scanner/lib/insider.js): P = cumparare cu bani; S/D/F/G = vanzare; grant/award/conversie = nu e semnal
export function clasifica(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return null;
  if (t.startsWith("purchase")) return "buy";
  if (t.startsWith("sale") || t.startsWith("stock gift") || t.startsWith("disposition")) return "sell";
  return null;
}
function nume(s) { return String(s || "").toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase()); }
// tranzactiile insiderilor (Yahoo quoteSummary.insiderTransactions.transactions) -> agregatul pe 60 de zile
export function insideri(tranzactii, acum) {
  if (!Array.isArray(tranzactii) || !tranzactii.length) return { form4: false, buys: 0, sells: 0, bp: 0, sp: 0, net: 0, verdict: "neut", top: [], n60: 0 };
  const tx = [];
  for (const x of tranzactii) {
    const d = Date.parse((x && x.startDate && x.startDate.fmt) || ""), f = clasifica(x && x.transactionText);
    if (!Number.isFinite(d) || !f || acum - d > FEREASTRA_INSIDERI || d > acum + ZI) continue;
    tx.push({ d: new Date(d).toISOString().slice(5, 10), cine: nume(x.filerName), rol: String(x.filerRelation || ""), f, act: nr(x.shares && x.shares.raw) || 0, val: nr(x.value && x.value.raw) || 0 });
  }
  const buys = tx.filter((t) => t.f === "buy"), sells = tx.filter((t) => t.f === "sell");
  const bp = new Set(buys.map((t) => t.cine)).size, sp = new Set(sells.map((t) => t.cine)).size;
  const net = buys.reduce((a, t) => a + t.act, 0) - sells.reduce((a, t) => a + t.act, 0);
  let verdict = "neut";
  if (bp >= 2 && net > 0) verdict = "bull"; else if (bp === 1 && net > 0) verdict = "bull1"; else if (sells.length >= 2 && net < 0 && sells.length >= buys.length) verdict = "bear";
  const top = tx.slice().sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 3);
  return { form4: true, buys: buys.length, sells: sells.length, bp, sp, net, verdict, top, n60: tx.length };
}
// n puncte dintr-o lista lunga, cu primul si ultimul pastrate
export function esantion(l, n) {
  if (!Array.isArray(l)) return []; if (l.length <= n) return l.slice();
  return Array.from({ length: n }, (_, i) => l[Math.round((i * (l.length - 1)) / (n - 1))]);
}
// costul in lei al pozitiei = loturile deschise (FIFO) ale tickerului, ca t212CostLei din pagina Radarului
export function costLeiDinLoturi(loturi, ticker, qty) {
  let q = 0, cost = 0;
  for (const l of Array.isArray(loturi) ? loturi : []) if (l && l.ticker === ticker) { q += Number(l.qty) || 0; cost += (Number(l.qty) || 0) * (Number(l.costBuc) || 0); }
  if (!(q > 0) || !(qty > 0) || Math.abs(q - qty) / qty > 0.02) return null;
  return cost * qty / q;
}
function zileDinData(iso, acum) { const d = Date.parse(String(iso || "") + "T00:00:00Z"); return Number.isFinite(d) ? Math.round((d - acum) / ZI) : null; }
function semaforT212(sem, niv) {
  return { niv: sem && sem.nivel && sem.nivel !== "fara-date" ? sem.nivel : null, motive: sem && Array.isArray(sem.motive) ? sem.motive.slice(0, 6) : [], sfat: sem && sem.ceAsFace ? String(sem.ceAsFace) : "", trend: niv && niv.trend ? String(niv.trend) : null };
}
function pozitieT212(x) {
  const pret = nr(x.pret), mediu = nr(x.pretMediu), sem = semaforT212(x.sem, x.niv);
  const plan = x.plan ? { trailPct: nr(x.plan.trailPct), tinta: nr(x.plan.tinta) ?? (x.niv ? nr(x.niv.tinta) : null), stop: x.niv ? nr(x.niv.stop) : null, max: nr(x.maxDupaCumparare), stopFix: nr(x.plan.stop) } : null;
  return { s: String(x.simbol || ""), t212: String(x.ticker || ""), buc: rot(x.qty, 6), mediu: rot(mediu, 4), costLei: rot(x.costLei, 2),
    pret: rot(pret, 4), prev: rot(x.prev, 4), la: nr(x.la), closes30: esantion((x.bare || []).map((b) => rot(b.c, 4)).filter((c) => c !== null).slice(-30), 30),
    pplLei: rot(x.ppl, 2), pctLei: nr(x.ppl) !== null && nr(x.costLei) ? rot(x.ppl / x.costLei, 6) : null, pctPret: pret && mediu ? rot(pret / mediu - 1, 6) : null,
    plan, trend: sem.trend, pondere: rot(x.pondere, 4), niv: sem.niv, motive: sem.motive, sfat: sem.sfat };
}
function botPoza(b) {
  const pret = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus), total = nr(b.profitTotal), brut = nr(b.gridProfitBrut) || 0, com = nr(b.comisioane) || 0;
  const sem = b.semafor || null;
  return { id: String(b.id), s: String(b.baza || "").replace(/\.PERP$/, ""), dir: String(b.directie || "").toLowerCase(), lev: nr(b.levier), investit: rot(b.investit, 2), jos, sus,
    pret: rot(pret, 6), inGrid: pret !== null && jos !== null && sus !== null && sus > jos ? rot((pret - jos) / (sus - jos), 4) : null, lichidarePct: rot(b.distantaLichidarePct, 2),
    total: rot(total, 2), perechi: nr(b.ordinePerechi), gridBrut: rot(brut, 2), pozitie: total !== null ? rot(total - brut - com, 2) : null, comisioane: rot(com, 3),
    zero: rot(b.zero, 6), plan: b.plan ? { plus: nr(b.plan.plus), minus: nr(b.plan.minus), afaraOre: nr(b.plan.afaraOre) } : null,
    niv: sem && sem.nivel ? String(sem.nivel) : null, motive: sem && Array.isArray(sem.motive) ? sem.motive.slice(0, 6) : [], sfat: sem && sem.ceAsFace ? String(sem.ceAsFace) : "",
    pret30: esantion((b.pret30 || []).map((v) => rot(v, 6)).filter((v) => v !== null), 30), la: nr(b.la) };
}
function simbolPoza(x, acum) {
  const e = x.extra || null;
  return { s: String(x.s || ""), nota: String(x.nota || "").slice(0, 80), sursa: x.sursa || null, moneda: x.moneda || "$", pret: rot(x.pret, 4), prev: rot(x.prev, 4),
    closes30: esantion((x.closes30 || []).map((c) => rot(c, 4)).filter((c) => c !== null).slice(-30), 30),
    insideri: e ? insideri(e.tranzactii, acum) : null,
    rezultate: e && e.rezultate && e.rezultate.data ? { data: e.rezultate.data, zile: zileDinData(e.rezultate.data, acum), eps: rot(e.rezultate.eps, 2) } : null,
    analisti: e && e.analisti ? { tinta: rot(e.analisti.tinta, 2), recom: e.analisti.recom || null, n: nr(e.analisti.n) } : null,
    shortFloat: e ? rot(e.shortFloat, 4) : null };
}
export function construiestePoza(i) {
  const acum = nr(i.acum) || Date.now();
  const t212 = (i.t212 || []).filter((x) => x && x.qty > 0).map(pozitieT212), boti = (i.boti || []).filter((b) => b && b.id).map(botPoza);
  return { la: acum, versiune: String(i.versiune || ""), colector: { pid: nr(i.pid), tura: nr(i.tura) }, t212, boti,
    simboluri: (i.simboluri || []).filter((x) => x && x.s).map((x) => simbolPoza(x, acum)),
    gol: { boti: boti.length ? null : "niciun bot activ", t212: t212.length ? null : "nicio poziție deschisă" } };
}
```

- [ ] **Step 4: Rulează testul, trebuie să treacă** — `node scripts/poza-v98.mjs` ⇒ `POZA_V98 PASS · 6/6`. Dacă un test pică pe o rotunjire, repară funcția, nu testul.

- [ ] **Step 5: Scrie `crypto/scripts/lib/yahoo-extra.mjs`** (rețea, fără cheie; crumb + cookie; cache pe fișier)

```js
// Yahoo fara cheie, pentru poza (v98): inchiderile zilnice si "extra" (insideri, rezultate, analisti, short) pe un simbol.
// Crumb-ul si cookie-ul se iau o data pe zi (fc.yahoo.com -> set-cookie; /v1/test/getcrumb). Cache pe disc (data/poza-ext.json):
// extra 6 ore, inchideri 30 de minute — lista are cel mult 60 de simboluri, poza se face la 5 minute.
import fs from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36", accept: "*/*" };
const EXTRA_MS = 6 * 3600000, CLOSES_MS = 30 * 60000;
export function creeazaYahooExtra({ fisier, pauzaMs = 400, f = fetch, acum = () => Date.now(), jurnal = () => {} } = {}) {
  let cache = {}; try { cache = JSON.parse(fs.readFileSync(fisier, "utf8")); } catch { cache = {}; }
  let crumb = null, cookie = "", crumbLa = 0;
  const salveaza = () => { try { fs.writeFileSync(fisier, JSON.stringify(cache)); } catch (e) { jurnal("yahoo-extra: cache nescris", e.message); } };
  const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
  async function iaCrumb() {
    if (crumb && acum() - crumbLa < 86400000) return;
    const r1 = await f("https://fc.yahoo.com", { headers: UA, redirect: "manual", signal: AbortSignal.timeout(15000) }).catch(() => null);
    cookie = r1 && r1.headers ? String(r1.headers.get("set-cookie") || "").split(",").map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ") : "";
    const r2 = await f("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { ...UA, cookie }, signal: AbortSignal.timeout(15000) });
    const t = await r2.text(); if (!r2.ok || !t || t.includes("<")) throw new Error("crumb Yahoo: " + r2.status);
    crumb = t.trim(); crumbLa = acum();
  }
  async function json(u) { const r = await f(u, { headers: { ...UA, cookie }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error("Yahoo HTTP " + r.status); return r.json(); }
  return {
    async closes(simbol) {
      const k = "c:" + simbol, c = cache[k]; if (c && acum() - c.la < CLOSES_MS) return c.v;
      const j = (await json("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(simbol) + "?range=2mo&interval=1d")).chart.result[0];
      const cl = (j.indicators.quote[0].close || []).filter((x) => typeof x === "number"), ts = j.timestamp || [];
      const v = { closes30: cl.slice(-30), pret: cl[cl.length - 1] ?? null, prev: cl[cl.length - 2] ?? null, la: ts.length ? ts[ts.length - 1] * 1000 : null, moneda: j.meta && j.meta.currency === "EUR" ? "€" : "$" };
      cache[k] = { la: acum(), v }; salveaza(); await pauza(pauzaMs); return v;
    },
    async extra(simbol) {
      const k = "e:" + simbol, c = cache[k]; if (c && acum() - c.la < EXTRA_MS) return c.v;
      await iaCrumb();
      const j = (await json("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + encodeURIComponent(simbol) + "?modules=calendarEvents%2CinsiderTransactions%2CdefaultKeyStatistics%2CfinancialData&crumb=" + encodeURIComponent(crumb))).quoteSummary.result[0] || {};
      const ce = (j.calendarEvents || {}).earnings || {}, fd = j.financialData || {}, ks = j.defaultKeyStatistics || {};
      const v = { tranzactii: ((j.insiderTransactions || {}).transactions || []).slice(0, 60),
        rezultate: { data: ((ce.earningsDate || [])[0] || {}).fmt || null, eps: (ce.earningsAverage || {}).raw ?? null },
        analisti: { tinta: (fd.targetMeanPrice || {}).raw ?? null, recom: fd.recommendationKey || null, n: (fd.numberOfAnalystOpinions || {}).raw ?? null },
        shortFloat: (ks.shortPercentOfFloat || {}).raw ?? null };
      cache[k] = { la: acum(), v }; salveaza(); await pauza(pauzaMs); return v;
    }
  };
}
```

- [ ] **Step 6: Adaugă `turaPoza` în `scripts/colector.mjs`**

Lângă importuri: `import { construiestePoza, costLeiDinLoturi } from "./lib/poza.mjs"; import { creeazaYahooExtra } from "./lib/yahoo-extra.mjs";`

În `tura()`, imediat după `const boti = Array.isArray(d && d.bots) ? d.bots : [];` adaugă `ultimiiBoti = boti; for (const b of boti) if (b && b.id) { const r = pret30[b.id] || (pret30[b.id] = []); r.push(Number(b.pretCurent)); if (r.length > 30) r.shift(); }` și declară sus, lângă `let esecuri = 0;`: `let ultimiiBoti = []; const pret30 = {}; let turaNr = 0;` (și `turaNr++` la începutul lui `tura()`).

După `turaPaznic()` adaugă:

```js
// v98: poza pentru pagina alerts din Trading Tools - la 5 minute, prin paznic (POST /poza); lista de simboluri a paginii
// vine tot de acolo (GET /simboluri). Datele externe (Yahoo) au cache pe disc; o poza care nu pleaca se reincearca la tura urmatoare.
const POZA_MS = 5 * 60000, DUBLURI = { "1QZ.DE": "COIN", "MIGA.MU": "MSTR", "NFC.F": "NFLX" };
const yahooExtra = creeazaYahooExtra({ fisier: path.join(DATA, "poza-ext.json"), jurnal });
let pozaLa = 0, pozaInLucru = false;
function cheiePlan(x) { return x && x.plan && !x.plan.proba ? x.plan : null; }
async function pozitiiPentruPoza() {
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) return [];
  const pz = await cere("/api/t212?action=pozitii"), poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0);
  let loturi = []; try { const h = await cere("/api/t212?action=istoric"); loturi = T212.perechi(T212.umpleri(h && h.ordine || [], h && h.umpleri || [])).deschise || []; } catch (e) { jurnal("poza: loturi", e.message); }
  let cash = null; try { cash = (await cere("/api/t212?action=cont")).cash || null; } catch {}
  let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
  const inv = cash && cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
  const out = [];
  for (const x of poz) {
    let bare = [], plan = null;
    try { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.ticker)); bare = GridCalcul.bareBursa(d && d.randuri || [], Date.now()); } catch (e) { jurnal("poza: bare", x.ticker, e.message); }
    try { plan = cheiePlan(await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + x.ticker))); } catch {}
    const de = Date.parse(x.initialFillDate || ""); let mx = null;
    if (Number.isFinite(de)) for (const b of bare) if (b.t + 86400000 > de) mx = mx === null ? b.h : Math.max(mx, b.h);
    if (mx !== null && x.currentPrice > mx) mx = x.currentPrice;
    const p = { ticker: x.ticker, simbol: T212.simbol(x.ticker), qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, plan, maxDupaCumparare: mx };
    const st = bare.length ? ActiuniSemnale.stare(bare, p.pret) : null, sem = ActiuniSemnale.semafor(p, st);
    const n = bare.length ? ActiuniSemnale.niveluri(bare, p.pret, { pretMediu: p.pretMediu, maxDupaCumparare: mx, minTrail: 0.15 }) : null;
    out.push({ ...p, prev: bare.length > 1 ? bare[bare.length - 2].c : null, la: bare.length ? bare[bare.length - 1].t : null, ppl: x.ppl, costLei: costLeiDinLoturi(loturi, x.ticker, x.quantity), bare, sem, niv: n && n.nivel === "ok" ? { stop: n.stop, tinta: n.tinta, trend: n.trend && n.trend.dir || (typeof n.trend === "string" ? n.trend : null) } : null,
      pondere: inv !== null && usd > 0 && cash.total > 0 ? x.quantity * x.currentPrice / usd * inv / cash.total : null });
  }
  return out;
}
async function botiPentruPoza() {
  const out = [];
  for (const b of ultimiiBoti) {
    if (!b || !b.id || b.activ === false) continue;
    let plan = null; try { plan = cheiePlan(await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(b.id))); } catch {}
    let zero = null; try { zero = TabloExtra.dacaInchizi(b, 0.0005).pretZero; } catch {}
    const x = semnaleUlt[b.id]; out.push({ ...b, plan, zero, pret30: pret30[b.id] || [], semafor: x && x.semafor ? x.semafor : null, la: Date.now() });
  }
  return out;
}
async function simboluriPentruPoza() {
  const r = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/simboluri", { headers: { authorization: "Bearer " + PAZNIC_TOKEN }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("paznic /simboluri " + r.status);
  const out = [];
  for (const s of ((await r.json()).simboluri || []).slice(0, 60)) {
    const sursa = DUBLURI[s.s] || null; let c = null, e = null;
    try { c = await yahooExtra.closes(s.s); } catch (err) { jurnal("poza: inchideri", s.s, err.message); }
    try { e = await yahooExtra.extra(sursa || s.s); } catch (err) { jurnal("poza: extra", s.s, err.message); }
    out.push({ s: s.s, nota: s.nota, sursa, moneda: c ? c.moneda : (/\.(DE|MU|F|PA|AS|MI|SW)$/.test(s.s) ? "€" : "$"), pret: c ? c.pret : null, prev: c ? c.prev : null, closes30: c ? c.closes30 : [], extra: e });
  }
  return out;
}
async function turaPoza() {
  if (!PAZNIC_URL || !PAZNIC_TOKEN || pozaInLucru || Date.now() - pozaLa < POZA_MS) return;
  pozaInLucru = true; pozaLa = Date.now();
  try {
    const [t212, boti, simboluri] = await Promise.all([pozitiiPentruPoza().catch((e) => { jurnal("poza: t212", e.message); return []; }), botiPentruPoza(), simboluriPentruPoza().catch((e) => { jurnal("poza: simboluri", e.message); return []; })]);
    const poza = construiestePoza({ acum: Date.now(), versiune: VERSIUNE_COLECTOR, pid: process.pid, tura: turaNr, t212, boti, simboluri }), text = JSON.stringify(poza);
    const r = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/poza", { method: "POST", headers: { authorization: "Bearer " + PAZNIC_TOKEN, "content-type": "application/json" }, body: text, signal: AbortSignal.timeout(20000) });
    if (!r.ok) jurnal("poza: refuzata", r.status, (await r.text()).slice(0, 120)); else jurnal("poza: urcata", Math.round(text.length / 1024) + " KB", t212.length + " poziții", boti.length + " boți", simboluri.length + " simboluri");
  } catch (e) { jurnal("poza: n-a plecat", e.message); pozaLa = Date.now() - POZA_MS + 60000; }
  pozaInLucru = false;
}
```

`VERSIUNE_COLECTOR` = constanta existentă a versiunii din colector (caută `versiune: "v97"` în `turaPaznic` și înlocuiește literalul cu o constantă `const VERSIUNE_COLECTOR = "v98.0";` declarată o singură dată, folosită în ambele locuri). În `bucla()`, după `turaPaznic().catch(() => {});` adaugă `turaPoza().catch((e) => jurnal("poza", e.message));`.

Verificări de formă înainte de a rula (comenzi, nu presupuneri): `grep -n "function perechi\|function umpleri" public/lib/t212.js` — dacă `perechi` nu întoarce `{deschise:[{ticker, qty, costBuc}]}`, adaptezi DOAR linia cu `loturi = …` ca să producă acea formă (funcția `costLeiDinLoturi` rămâne). `grep -n "function semafor" public/lib/semnale-bot.js` — dacă `semafor()` nu întoarce `{nivel, motive, ceAsFace}`, adaptezi `botPoza` în `poza.mjs` și testul lui. `grep -n "dacaInchizi(" scripts/colector.mjs public/lib/*.js | head` — folosește același comision ca apelurile existente.

- [ ] **Step 7: Proba de încărcare + o tură reală** (serverul Radarului trebuie să fie pornit de Marius din lansator; dacă nu e, proba de încărcare tot merge)

Run: `COLECTOR_DOAR_INCARCA=1 node scripts/colector.mjs` ⇒ `INCARCAT …`; apoi, cu serverul pornit: `COLECTOR_O_TURA=1 node scripts/colector.mjs` și `tail -5 data/colector.log` ⇒ o linie `poza: urcata … KB`. Apoi `curl -s -H "authorization: Bearer <CHEIE>" https://<paznic>/poza | head -c 400` ⇒ JSON cu `"la"`.

- [ ] **Step 8: Versiunea v98.0** — `BUILD_INFO.json` și `package.json` (`"version"`), badge-ul din `public/index.html` (`grep -n "v97.7" public/index.html` ⇒ înlocuiește cu `v98.0 · POZA PENTRU TRADING TOOLS`), `public/sw.js` (`CACHE="crypto-radar-v98-0"`), `package.json` → `test:colector` + ` && node scripts/poza-v98.mjs`. Verifică: `grep -rn "97\.7\|97-7" BUILD_INFO.json package.json public/index.html public/sw.js` ⇒ nimic.

- [ ] **Step 9: Commit + push**

```bash
cd C:/Users/Cimin/crypto && npm test && git add scripts/lib/poza.mjs scripts/lib/yahoo-extra.mjs scripts/poza-v98.mjs scripts/colector.mjs BUILD_INFO.json package.json public/index.html public/sw.js && git commit -m "v98.0 (2/3): colectorul urca la 5 minute poza (boti, T212, simbolurile paginii cu insideri/rezultate/analisti) in paznic" && git push origin main
```

Memo după push. Marius repornește colectorul din `PORNESTE-CRYPTO-RADAR.bat` (lansatorul face `git pull`); verifici în `data/colector.log` linia `poza: urcata`.

---

### Task 3: Pagina `alerts` — modulele Radar, migrarea listei, scoaterea pragurilor, versiunea

**Files:**
- Create: `premarket_scanner/lib/radar-ui.css`, `premarket_scanner/lib/radar-poza.js`, `premarket_scanner/lib/radar-ecran.js`
- Create: `premarket_scanner/tools/radar-ecran.test.mjs`, `premarket_scanner/tools/alerts-radar.test.mjs`
- Modify: `premarket_scanner/alerts/index.html`, `premarket_scanner/sw-app.js` (`CACHE_VERSION`, precache), `premarket_scanner/.github/workflows/price-alerts.yml`
- Run: `node tools/sync-suite-version.mjs`

**Interfaces:**
- Consumes: Task 1 (`GET /poza` cu ETag, `POST /simboluri`), poza din Task 2 (contract §4).
- Produces: `RadarPoza` (global): `.cheie()`, `.puneCheie(c)`, `.url()`, `.citeste({fortat})` → `{poza, sursa:"retea"|"cache"|null, eroare, status}`, `.prospetime(poza, acum)` → `{stare:"viu"|"tace"|"oprit"|"lipsa", minute, text}`, `.trimiteSimboluri(lista)`, `.porneste({laSchimbare})`; `RadarEcran` (global, pur + DOM): `.judecaT212(p)`, `.baraAzi(v)`, `.spark(v)`, `.insText(i)`, `.mii(v)`, `.randeaza(el, poza, {simboluri, preturiLive, acum, fara})`; în pagină: `migreazaListaLaSimboluri(priceAlerts)` → `{ [SYM]: [{kind:"watch", note, addedAt}] }`.

- [ ] **Step 1: Testele care pică** — `premarket_scanner/tools/radar-ecran.test.mjs`

```js
// radar-ecran.test.mjs — functiile pure ale sectiunilor "Din Radar" de pe pagina alerts (v116).
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, f), 'utf8');
// modulele sunt scripturi de browser (global var); le incarcam ca in colectorul Radarului
const RadarEcran = new Function(src('lib/radar-ecran.js') + '; return RadarEcran;')();
const RadarPoza = new Function('window', 'localStorage', 'fetch', 'document', src('lib/radar-poza.js') + '; return RadarPoza;')({}, { getItem() { return null; }, setItem() {} }, () => Promise.reject(new Error('fara retea')), { hidden: false, addEventListener() {} });
const ACUM = Date.UTC(2026, 8, 27, 13, 20);

test('judecaT212: stop din plan, depasit / aproape / tine, procent in lei cand exista cost', () => {
  const p = { s: 'AVGO', pret: 352.81, prev: 350.36, mediu: 399.96, pplLei: -615, pctLei: -0.118, pctPret: -0.1179, plan: { trailPct: 15, tinta: 413.47, stop: 350.63, max: 412.5 }, trend: 'jos', niv: 'atentie', closes30: [392.99, 352.81] };
  const j = RadarEcran.judecaT212(p);
  assert.strictEqual(j.stop, 350.63); assert.strictEqual(j.depasit, false); assert.ok(Math.abs(j.dStop - (350.63 / 352.81 - 1)) < 1e-9); assert.strictEqual(j.pct, -0.118); assert.strictEqual(j.pctFel, 'lei');
  const f = RadarEcran.judecaT212({ ...p, plan: null, pctLei: null }); assert.strictEqual(f.stop, null); assert.strictEqual(f.pctFel, 'preț'); assert.strictEqual(f.pct, -0.1179);
  const d = RadarEcran.judecaT212({ ...p, pret: 340 }); assert.strictEqual(d.depasit, true);
});
test('baraAzi: ±4% umple jumatatea; semnul alege partea; 0 = nimic', () => {
  assert.match(RadarEcran.baraAzi(0.04), /left:50%;width:50\.0%/); assert.match(RadarEcran.baraAzi(-0.02), /right:50%;width:25\.0%/); assert.match(RadarEcran.baraAzi(0), /width:0\.0%/); assert.match(RadarEcran.baraAzi(0.1), /width:50\.0%/);
});
test('spark: 2 puncte sau mai multe -> svg cu polyline si punctul de la capat; sub 2 -> gol', () => {
  assert.match(RadarEcran.spark([1, 2, 3]), /<polyline/); assert.match(RadarEcran.spark([1, 2, 3]), /<circle/); assert.strictEqual(RadarEcran.spark([1]), ''); assert.strictEqual(RadarEcran.spark(null), '');
});
test('insText: verdictele si "fara Form 4"; lipsa = cere cheia', () => {
  assert.match(RadarEcran.insText({ form4: false }).t, /fără Form 4/);
  assert.match(RadarEcran.insText({ form4: true, verdict: 'bull1', bp: 1, net: 105263 }).m, /105 k/);
  assert.match(RadarEcran.insText({ form4: true, verdict: 'bear', sells: 10, sp: 7, net: -54130 }).t, /vând/);
  assert.match(RadarEcran.insText(null).t, /cere cheia/);
});
test('mii: 9.999.985 -> 10,0 mil.; 105263 -> 105 k; 500 -> 500', () => {
  assert.strictEqual(RadarEcran.mii(9999985), '10,0 mil.'); assert.strictEqual(RadarEcran.mii(105263), '105 k'); assert.strictEqual(RadarEcran.mii(500), '500');
});
test('prospetime: viu sub 15 min, tace 15-60, oprit peste 60, lipsa fara poza', () => {
  const MIN = 60000;
  assert.strictEqual(RadarPoza.prospetime({ la: ACUM - 3 * MIN }, ACUM).stare, 'viu');
  assert.strictEqual(RadarPoza.prospetime({ la: ACUM - 20 * MIN }, ACUM).stare, 'tace');
  assert.strictEqual(RadarPoza.prospetime({ la: ACUM - 90 * MIN }, ACUM).stare, 'oprit');
  assert.strictEqual(RadarPoza.prospetime(null, ACUM).stare, 'lipsa');
  assert.match(RadarPoza.prospetime({ la: ACUM - 20 * MIN }, ACUM).text, /tace de 20 min/);
});
test('randeaza (DOM minimal): poza goala -> textele de gol; poza cu date -> randuri; fara cheie -> caseta', () => {
  const el = { innerHTML: '' };
  RadarEcran.randeaza(el, { la: ACUM, t212: [], boti: [], simboluri: [], gol: { boti: 'niciun bot activ', t212: 'nicio poziție deschisă' } }, { simboluri: [], preturiLive: {}, acum: ACUM, cheie: true });
  assert.match(el.innerHTML, /niciun bot activ/); assert.match(el.innerHTML, /nicio poziție deschisă/);
  RadarEcran.randeaza(el, null, { simboluri: [{ s: 'AVGO', nota: '' }], preturiLive: { AVGO: { pret: 352.81, prev: 350.36 } }, acum: ACUM, cheie: false });
  assert.match(el.innerHTML, /Pune cheia de citire/); assert.match(el.innerHTML, /AVGO/); assert.match(el.innerHTML, /cere cheia/);
  assert.doesNotMatch(el.innerHTML, /NaN|undefined/);
});
```

și `premarket_scanner/tools/alerts-radar.test.mjs`:

```js
// alerts-radar.test.mjs — pagina alerts (v116): fara praguri, cu modulele Radar legate, versiunile sincronizate.
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'alerts/index.html'), 'utf8'), SW = readFileSync(join(ROOT, 'sw-app.js'), 'utf8');

test('pragurile au disparut din formular si din randuri', () => {
  for (const id of ['inpThr', 'inpKind', 'inpTarget', 'inpStop', 'inpDir', 'btnAdv', 'wrapKind', 'wrapDir']) assert.ok(!HTML.includes('id="' + id + '"'), id + ' trebuie sa dispara');
  assert.ok(!/function rowHtml\(/.test(HTML), 'randul vechi cu prag nu se mai randeaza');
  assert.ok(!/renderAlmostRail\(|renderPulse\(/.test(HTML), 'railul "aproape de prag" si pulsul pragurilor au disparut');
  assert.ok(HTML.includes('id="inpSym"') && HTML.includes('id="inpNote"') && HTML.includes('id="btnAdd"'), 'adaugarea ramane: simbol + notita');
});
test('modulele Radar sunt legate, cu cache-bust pe versiunea suitei', () => {
  const v = (SW.match(/CACHE_VERSION = 'tt-v(\d+)/) || [])[1];
  assert.ok(v, 'CACHE_VERSION in sw-app.js');
  for (const f of ['lib/radar-ui.css', 'lib/radar-poza.js', 'lib/radar-ecran.js']) { assert.ok(HTML.includes('../' + f + '?v=' + v), f + ' legat cu ?v=' + v); assert.ok(SW.includes("'./" + f + "'"), f + ' in precache'); }
  assert.ok(HTML.includes('id="rad"'), 'containerul .rad exista'); assert.ok(HTML.includes('class="rad"'));
});
test('lista se migreaza la simboluri (kind watch) si sincronizarea scrie doar simbol + notita', () => {
  assert.match(HTML, /function migreazaListaLaSimboluri\(/); assert.match(HTML, /kind:\s*'watch'/);
  assert.match(HTML, /function alertToJson[\s\S]{0,600}kind:\s*'watch'/, 'alertToJson scrie kind watch');
  assert.ok(!/level:\s*a\.lvl/.test(HTML.slice(HTML.indexOf('function alertToJson'), HTML.indexOf('function alertToJson') + 800)), 'fara nivel de prag in JSON');
});
test('polling-ul ramane (gardile vechi) dar nu mai evalueaza praguri', () => {
  assert.match(HTML, /function pollPrices\(/); assert.match(HTML, /try\s*\{\s*await pollPrices\(\);\s*\}\s*catch/);
  assert.ok(!/function evaluateAlert\(|function checkTrigger\(|fireAlert\(/.test(HTML), 'evaluarea pragurilor a fost scoasa');
});
test('versiunea paginii e v116 si workflow-ul pragurilor e oprit', () => {
  assert.match(HTML, /id="verBadge">v116</);
  const wf = readFileSync(join(ROOT, '.github/workflows/price-alerts.yml'), 'utf8');
  assert.ok(!/schedule:/.test(wf) && /workflow_dispatch/.test(wf), 'price-alerts.yml: fara cron, doar pornire manuala');
});
```

- [ ] **Step 2: Rulează, trebuie să pice** — `cd C:/Users/Cimin/premarket_scanner && node --test tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs` ⇒ fișiere lipsă / aserțiuni picate.

- [ ] **Step 3: `lib/radar-ui.css`** — tokenii Radarului scoped + tot CSS-ul din demo v4 (`demo-alerte-radar.html`, blocul `/* ---- continutul: designul Radarului ---- */` până la `.toast`, plus media query-urile), cu fiecare selector prefixat `body.al-page .rad ` (și `.rad` cu `color-scheme:dark;background:var(--bg);color:var(--text);font:14px/1.4 system-ui,…;padding:12px clamp(16px,3vw,28px) 24px;border-radius:12px;margin:8px 0 12px`). Tokenii pe `.rad`, nu pe `:root`:

```css
body.al-page .rad{
  --bg:#071018;--panel:#0d1722;--panel2:#111d2a;--panel3:#152233;--line:#213247;--line2:rgba(144,160,182,.14);
  --text:#f5f7fb;--muted:#90a0b6;--accent:#4fd1c5;--good:#55d89b;--bad:#ff6b78;--warn:#f5c451;--none:#6c7a8e;--r:10px;
  color-scheme:dark;background:var(--bg);color:var(--text);font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  padding:12px clamp(16px,3vw,28px) 24px;border-radius:12px;margin:8px 0 12px;display:flex;flex-direction:column;gap:12px
}
```

Regula de prefixare se face cu un script, nu de mână (`node -e` care citește demo-ul, taie blocul de CSS și prefixează fiecare selector din afara `@media`; în `@media` la fel), apoi verifici cu `grep -c "body.al-page .rad" lib/radar-ui.css` (≥ 60) și că nu există niciun selector care începe cu `.` fără prefix (`grep -n "^\.[a-z]" lib/radar-ui.css` ⇒ nimic).

- [ ] **Step 4: `lib/radar-poza.js`**

```js
// radar-poza.js — poza colectorului Crypto Radar, citita din worker-ul Paznicului cu cheia de citire (v116, 27.09.2026).
// Cheia si adresa stau in browser (localStorage); ultima poza se tine in browser ca sa ai ceva pe ecran si cand worker-ul tace.
var RadarPoza = (function () {
  'use strict';
  var K_CHEIE = 'radar_cheie', K_URL = 'radar_url', K_POZA = 'radar_poza', K_ETAG = 'radar_etag';
  var URL_IMPLICIT = 'https://paznic-radar.mferent80.workers.dev';   // se poate schimba din caseta cheii
  var MIN = 60000, TACE = 15 * MIN, OPRIT = 60 * MIN, CITIRE_MS = 5 * MIN;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function cheie() { return ls(K_CHEIE) || ''; }
  function puneCheie(c) { ls(K_CHEIE, String(c || '').trim() || null); }
  function url() { return (ls(K_URL) || URL_IMPLICIT).replace(/\/+$/, ''); }
  function puneUrl(u) { ls(K_URL, String(u || '').trim() || null); }
  function cache() { try { return JSON.parse(ls(K_POZA) || 'null'); } catch (e) { return null; } }
  function prospetime(poza, acum) {
    if (!poza || !(poza.la > 0)) return { stare: 'lipsa', minute: null, text: 'nicio poză încă' };
    var m = Math.max(0, Math.round((acum - poza.la) / MIN));
    if (acum - poza.la < TACE) return { stare: 'viu', minute: m, text: 'poza de acum ' + m + ' min' };
    if (acum - poza.la < OPRIT) return { stare: 'tace', minute: m, text: 'Radarul tace de ' + m + ' min' };
    return { stare: 'oprit', minute: m, text: 'Radarul e oprit de ' + (m < 120 ? m + ' min' : Math.round(m / 60) + ' h') };
  }
  var st = { la: 0, inLucru: false, ultima: null };
  async function citeste(o) {
    o = o || {};
    if (!cheie()) return { poza: cache(), sursa: cache() ? 'cache' : null, eroare: 'fara cheie', status: 0 };
    if (st.inLucru || (!o.fortat && Date.now() - st.la < CITIRE_MS)) return st.ultima || { poza: cache(), sursa: cache() ? 'cache' : null, eroare: null, status: 0 };
    st.inLucru = true;
    try {
      var h = { authorization: 'Bearer ' + cheie() }, et = ls(K_ETAG); if (et && cache()) h['if-none-match'] = et;
      var r = await fetch(url() + '/poza', { headers: h, cache: 'no-store' });
      if (r.status === 304) st.ultima = { poza: cache(), sursa: 'retea', eroare: null, status: 304 };
      else if (r.ok) { var p = await r.json(); ls(K_POZA, JSON.stringify(p)); ls(K_ETAG, r.headers.get('etag') || null); st.ultima = { poza: p, sursa: 'retea', eroare: null, status: 200 }; }
      else st.ultima = { poza: cache(), sursa: cache() ? 'cache' : null, eroare: r.status === 401 ? 'cheia nu e bună' : r.status === 404 ? 'nicio poză încă (colectorul n-a trimis)' : 'worker: HTTP ' + r.status, status: r.status };
    } catch (e) { st.ultima = { poza: cache(), sursa: cache() ? 'cache' : null, eroare: 'Radarul nu răspunde (' + (e && e.message || e) + ')', status: -1 }; }
    st.la = Date.now(); st.inLucru = false; return st.ultima;
  }
  async function trimiteSimboluri(lista) {
    if (!cheie()) return false;
    try { var r = await fetch(url() + '/simboluri', { method: 'POST', headers: { authorization: 'Bearer ' + cheie(), 'content-type': 'application/json' }, body: JSON.stringify({ simboluri: lista }) }); return r.ok; } catch (e) { return false; }
  }
  var timer = null;
  function porneste(o) {   // laSchimbare(rezultat) e chemat dupa fiecare citire
    o = o || {}; var f = function () { if (document.hidden) return; citeste({}).then(function (r) { if (o.laSchimbare) o.laSchimbare(r); }); };
    f(); clearInterval(timer); timer = setInterval(f, MIN);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) citeste({ fortat: true }).then(function (r) { if (o.laSchimbare) o.laSchimbare(r); }); });
  }
  return { cheie: cheie, puneCheie: puneCheie, url: url, puneUrl: puneUrl, citeste: citeste, prospetime: prospetime, trimiteSimboluri: trimiteSimboluri, porneste: porneste, cache: cache };
})();
if (typeof window !== 'undefined') window.RadarPoza = RadarPoza;
```

Adresa implicită a worker-ului: citește-o din `.dev.vars` al Radarului (`PAZNIC_URL`) și pune-o în `URL_IMPLICIT`; e o adresă publică (`*.workers.dev`), nu un secret.

- [ ] **Step 5: `lib/radar-ecran.js`** — funcțiile pure (copiate din demo v4, cu numele de aici) + randarea pe un container; o singură funcție publică de randare, restul pure:

```js
// radar-ecran.js — sectiunile "Din Radar" de pe pagina alerts (v116): pozitiile T212, botii, simbolurile tale. Randare din poza.
var RadarEcran = (function () {
  'use strict';
  var NIV = { iesi: 'IEȘI', atentie: 'ATENȚIE', tine: 'ȚINE' }, RECOM = { strong_buy: 'cumpără hotărât', buy: 'cumpără', hold: 'ține', sell: 'vinde', none: 'fără', underperform: 'sub piață' };
  var LUNI = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sept', 'oct', 'nov', 'dec'];
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nr(x) { return typeof x === 'number' && isFinite(x) ? x : null; }
  function bani(v, m, z) { return nr(v) === null ? '—' : (m || '$') + v.toFixed(z == null ? 2 : z).replace('.', ','); }
  function lei(v) { return nr(v) === null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('ro-RO') + ' lei'; }
  function usdt(v) { return nr(v) === null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2).replace('.', ',') + ' USDT'; }
  function pct(v, z) { return nr(v) === null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(z == null ? 1 : z).replace('.', ',') + '%'; }
  function cls(v) { return nr(v) === null ? '' : v >= 0 ? 'good' : 'bad'; }
  function mii(v) { v = nr(v) || 0; return Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' mil.' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + ' k' : String(Math.round(v)); }
  function dataRo(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? String(+m[3]) + ' ' + LUNI[+m[2] - 1] : '—'; }
  function spark(v, w, h) {
    if (!Array.isArray(v) || v.length < 2) return ''; w = w || 120; h = h || 32;
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), r = (mx - mn) || 1;
    var pts = v.map(function (y, i) { return [(i / (v.length - 1)) * w, h - 3 - (y - mn) / r * (h - 6)]; });
    var d = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), col = v[v.length - 1] >= v[0] ? 'var(--good)' : 'var(--bad)', e = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,' + h + ' ' + d + ' ' + w + ',' + h + '" fill="' + col + '" opacity=".12"/><polyline points="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="2.6" fill="' + col + '"/></svg>';
  }
  function baraAzi(v) { v = nr(v) || 0; var lat = Math.min(50, Math.abs(v) / 0.04 * 50).toFixed(1); return '<span class="azi" aria-hidden="true"><i class="' + (v < 0 ? 'n' : '') + '" style="' + (v < 0 ? 'right:50%' : 'left:50%') + ';width:' + lat + '%"></i></span>'; }
  function judecaT212(p) {
    var pret = nr(p.pret), plan = p.plan || null, stop = plan ? nr(plan.stop) : null;
    var dStop = stop !== null && pret ? stop / pret - 1 : null, depasit = stop !== null && pret !== null && pret < stop;
    var pctLei = nr(p.pctLei), pctPret = nr(p.pctPret);
    return { pret: pret, zi: pret && nr(p.prev) ? pret / p.prev - 1 : null, l30: pret && p.closes30 && p.closes30.length > 1 ? pret / p.closes30[0] - 1 : null, stop: stop, dStop: dStop, depasit: depasit,
      pct: pctLei !== null ? pctLei : pctPret, pctFel: pctLei !== null ? 'lei' : 'preț', tinta: plan ? nr(plan.tinta) : null, max: plan ? nr(plan.max) : null };
  }
  function insText(i) {
    if (!i) return { t: '⚪ cere cheia', c: 'neut', m: 'insiderii vin din poza Radarului' };
    if (!i.form4) return { t: 'fără Form 4', c: 'neut', m: 'bursă germană, fără raportări SEC' };
    if (i.verdict === 'bull') return { t: '🟢 cumpără în grup', c: 'bull', m: i.bp + ' persoane · net +' + mii(i.net) + ' acț.' };
    if (i.verdict === 'bull1') return { t: '🟢 cumpără', c: 'bull1', m: i.bp + ' persoană · +' + mii(i.net) + ' acț.' };
    if (i.verdict === 'bear') return { t: '🔴 vând', c: 'bear', m: i.sells + ' vânzări · ' + i.sp + ' persoane · net −' + mii(-i.net) + ' acț.' };
    return { t: '⚪ liniște', c: 'neut', m: i.n60 ? i.buys + ' cumpărări · ' + i.sells + ' vânzări' : 'nicio tranzacție în 60 z' };
  }
  // ... randT212(p), randBot(b), randSimbol(s, live), sumar(...) = HTML-ul randurilor exact ca in demo v4 (aceleasi clase: .poz .rand .det .pill .sp .azi .insV)
  function randeaza(el, poza, o) {
    // o = { simboluri:[{s, nota}], preturiLive:{SYM:{pret, prev}}, acum, cheie:boolean, prospetime:{stare,text}, eroare }
    // fara cheie: caseta "Pune cheia de citire" + sectiunile T212/Boti pliate + Simbolurile tale cu ce stie pagina (live), insideri = "cere cheia"
    // cu poza: capul (chip prospetime), sumarul pe un rand, T212, Boti (sau textele din poza.gol), Simbolurile tale din poza + preturile live cand sunt mai proaspete
    // ... construieste HTML-ul si il pune in el.innerHTML; ascultatorii (desfacere rand, butoane) se leaga o singura data pe container (delegare)
  }
  return { esc: esc, bani: bani, lei: lei, usdt: usdt, pct: pct, cls: cls, mii: mii, dataRo: dataRo, spark: spark, baraAzi: baraAzi, judecaT212: judecaT212, insText: insText, randeaza: randeaza, NIV: NIV, RECOM: RECOM };
})();
if (typeof window !== 'undefined') window.RadarEcran = RadarEcran;
```

Corpul lui `randeaza` și al funcțiilor `randT212/randBot/randSimbol/sumar` se scrie prin **mutarea** codului din demo v4 (`randeazaT212`, `randeazaBot`, `randeazaPa`) în modul, cu trei schimbări obligatorii: (1) datele vin din poză (câmpurile din contract), nu din constantele demo-ului; (2) orice câmp lipsă trece prin `bani/pct/lei` care dau „—”; (3) simbolurile fără poză (fără cheie) se randează din `o.preturiLive` (pret, prev) cu `insText(null)` și „—” la săptămâna/30 z. Textele rândului desfăcut și butoanele (Deschide în Radar → `http://127.0.0.1:8788/`; Notiță; Scoate din listă) ca în demo; butoanele ridică evenimente `CustomEvent('radar:nota', {detail:{s}})` și `radar:scoate` pe container, pe care pagina le prinde (Step 6).

- [ ] **Step 6: Integrarea în `alerts/index.html`** (în ordinea asta, cu `grep` după fiecare pas)

1. `<head>`: după linia `<link rel="stylesheet" href="../lib/suite-ui.css?v=700">` adaugă `<link rel="stylesheet" href="../lib/radar-ui.css?v=826">`; înainte de `<script>`-ul mare al paginii: `<script src="../lib/radar-poza.js?v=826"></script><script src="../lib/radar-ecran.js?v=826"></script>`.
2. Badge: `<span class="ver-badge" id="verBadge">v115</span>` → `v116`.
3. Containerul: imediat după `<div id="tabPrice" …>` (caută `id="tabPrice"`) pune `<div class="rad" id="rad"><p class="sub">Aduc poza Radarului…</p></div>`.
4. Scoate din `#tabPrice` blocurile vechi: `.al-desk` (`#alDesk` cu KPI-urile și tabelul de desk), `#filterBar` cu chip-urile, `#secCrypto`, `#secStocks`, `#usDayBanner`, railul „aproape” și pulsul (caută `almost-rail`, `pulse`), `#refreshInfoPrice` rămâne. Ține „Adaugă” (`#addForm`) dar redu `add-row` la: `inpSym` + `btnSearch`, `inpNote`, `btnAdd`; șterge `wrapKind/inpKind`, `lblThr/inpThr`, `wrapTarget/inpTarget`, `wrapStop/inpStop`, `wrapDir/inpDir`, `btnAdv`, rândul „Opțiuni (Re-arm / Trailing)” și `btnHint` (textul „Cum funcționează” devine irelevant).
5. JS, stocarea: după `function loadAlerts(){…}` adaugă

```js
// v116: lista e de SIMBOLURI, fara praguri. Orice intrare veche (pct/ref/day/price/anchor) devine o singura intrare 'watch' pe simbol, cu notita pastrata.
function migreazaListaLaSimboluri(o) {
  const out = {};
  Object.keys(o || {}).forEach(sym => {
    const l = Array.isArray(o[sym]) ? o[sym] : [];
    const nota = (l.find(a => a && a.note) || {}).note || '';
    const addedAt = Math.min.apply(null, l.map(a => Number(a && a.addedAt) || Date.now()).concat([Date.now()]));
    out[sym.toUpperCase()] = [{ id: (l[0] && l[0].id) || ('w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), kind: 'watch', note: nota, addedAt }];
  });
  return out;
}
```

și în locul unde `priceAlerts` se inițializează (`let priceAlerts = loadAlerts();` sau echivalent) pune `let priceAlerts = migreazaListaLaSimboluri(loadAlerts()); persistAlerts();`. `alertToJson(sym, a)` întoarce `{ symbol: sym, kind: 'watch', note: a.note || '' }`; la `syncPullGitHub`/hidratarea din `alerts.json` trece rezultatul prin `migreazaListaLaSimboluri`.

6. JS, adăugarea: handler-ul lui `btnAdd` creează `{ id, kind:'watch', note: inpNote.value, addedAt: Date.now() }` pe `inpSym` (după rezolvarea simbolului cum era: `btnSearch`/`resolveSymbol`), fără câmpuri de prag; `batchAddAlerts(syms, factory, label)` primește factory-ul `() => ({ kind:'watch', note:'' })` din meniul ⋯ (ambele intrări: „din watchlist”, „din pozițiile deschise”).
7. JS, poll-ul: în `pollPrices()` rămâne tot ce ia prețuri și scrie `_lastPrice/_lastChange/_lastOkTs`; blocul care evaluează pragurile (după ce prețul e luat; caută `triggerHint`, `HISTORY.unshift`, `sendTelegram(`, `showBrowserNotif(` în interiorul lui `pollPrices`) se scoate; funcțiile rămase fără apelant (`triggerHint`, `rowHtml`, `renderActiveGroup`, `renderPulse`, `renderAlmostRail`, `growthScore`, `proximityScore`, `showSnoozeMenu`, `closeSnoozeMenu`, `bindRowSwipe`, `updateFormMode`, `msUntilNextSessionOpen`) se șterg; `HISTORY`/`SERVER_HIST` rămân doar pentru fila Istoric (citire).
8. JS, randarea: `render()` nu mai construiește listele; după partea de istoric/tab counts cheamă `radRandeaza()`:

```js
let _radUltima = null;
function radSimboluri() { return Object.keys(priceAlerts).sort().map(s => ({ s, nota: ((priceAlerts[s] || [])[0] || {}).note || '' })); }
function radPreturiLive() { const o = {}; Object.keys(_lastPrice).forEach(s => { o[s.toUpperCase()] = { pret: _lastPrice[s], prev: _lastPrice[s] != null && _lastChange[s] != null ? _lastPrice[s] / (1 + _lastChange[s] / 100) : null, la: _lastOkTs[s] || null }; }); return o; }
function radRandeaza(r) {
  if (r) _radUltima = r;
  const p = _radUltima ? _radUltima.poza : RadarPoza.cache(), acum = Date.now();
  RadarEcran.randeaza($('rad'), p, { simboluri: radSimboluri(), preturiLive: radPreturiLive(), acum, cheie: !!RadarPoza.cheie(), prospetime: RadarPoza.prospetime(p, acum), eroare: _radUltima ? _radUltima.eroare : null });
}
$('rad').addEventListener('radar:scoate', e => { delete priceAlerts[e.detail.s]; persistAlerts(); render(); radTrimiteSimboluri(); });
$('rad').addEventListener('radar:nota', e => { const n = window.prompt ? window.prompt('Notiță pentru ' + e.detail.s, ((priceAlerts[e.detail.s] || [])[0] || {}).note || '') : null; if (n === null) return; (priceAlerts[e.detail.s] || [])[0].note = n.slice(0, 80); persistAlerts(); render(); radTrimiteSimboluri(); });
$('rad').addEventListener('radar:cheie', e => { RadarPoza.puneCheie(e.detail.cheie); if (e.detail.url) RadarPoza.puneUrl(e.detail.url); RadarPoza.citeste({ fortat: true }).then(radRandeaza); radTrimiteSimboluri(); });
let _radSimTimer = null;
function radTrimiteSimboluri() { clearTimeout(_radSimTimer); _radSimTimer = setTimeout(() => RadarPoza.trimiteSimboluri(radSimboluri()), 1500); }
RadarPoza.porneste({ laSchimbare: radRandeaza });
radTrimiteSimboluri();
```

`persistAlerts()` cheamă și `radTrimiteSimboluri()` (o singură dată, la sfârșitul ei), ca orice schimbare a listei să ajungă la worker. `prompt()` e permis aici (pagina e pe GitHub Pages, nu într-un artefact).

9. Versiuni: `sw-app.js` → `const CACHE_VERSION = 'tt-v826-2026-09-27';` și în precache, după `'./lib/price-day.js',` adaugă `'./lib/radar-ui.css', './lib/radar-poza.js', './lib/radar-ecran.js',`; apoi `node tools/sync-suite-version.mjs` (propagă `SW_VER_INLINE` și `?v=` în toate paginile) și `node tools/sync-suite-version.mjs --check` ⇒ exit 0.
10. `.github/workflows/price-alerts.yml`: șterge blocul `schedule:` (rămâne `on: workflow_dispatch: {}`), și în comentariul din cap: `# 27.09.2026: pragurile au fost scoase din pagina alerts (v116); rulare doar manuala, pentru news-watch.`

- [ ] **Step 7: Rulează toate testele suitei**

Run: `cd C:/Users/Cimin/premarket_scanner && node --test tools/*.test.mjs`
Expected: toate verzi, inclusiv `alerts-poll-chain.test.mjs` (verifică tiparele care trebuie să rămână: `try { await pollPrices(); } catch`, `POLL_STALE_MS`, `watchdog`, `PollWake.bind`, `_lastOkTs[sym]`, `symStale`, `daySessChip`, `paintPollHeartbeat`, `DATE VECHI`, `_staleBeeped`). Dacă unul pică fiindcă ai șters prea mult, restaurezi exact acea bucată (poll-ul și prospețimea rămân; doar evaluarea pragurilor pleacă).

- [ ] **Step 8: Commit (fără push încă; push-ul se face după probele de ecran din Task 4)**

```bash
git add lib/radar-ui.css lib/radar-poza.js lib/radar-ecran.js tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs alerts/index.html sw-app.js lib/suite-version.js .github/workflows/price-alerts.yml $(git diff --name-only | grep -E "index\.html$") && git commit -m "alerts v116 / tt-v826: pagina in designul Radarului (pozitii T212 + boti din poza, simbolurile tale cu insideri/rezultate/analisti), fara praguri"
```

(`sync-suite-version` atinge toate paginile la `SW_VER_INLINE`; intră toate în commit.)

---

### Task 4: Proba de ecran a paginii + pozele lângă demo + inventarul

**Files:**
- Create: `premarket_scanner/tools/proba-ecran-alerts.mjs`
- Create: `premarket_scanner/tools/fixtures/poza-radar.json` (poza de probă = JSON-ul demo-ului v4: 7 poziții T212, botul VVV, 9 simboluri — scris o dată, din datele reale folosite în demo)

**Interfaces:**
- Consumes: pagina din Task 3; `window.__probaPoza` (injectat înainte de scripturi) pe care `radar-poza.js` îl folosește în locul rețelei când există (adaugă în `citeste()`: `if (window.__probaPoza) return { poza: window.__probaPoza, sursa: 'proba', eroare: null, status: 200 };` și `cheie()` întoarce `'proba'` când `window.__probaPoza` există).
- Produces: `tools/poze/alerts-1920.png`, `tools/poze/alerts-390.png` (neversionate: adaugă `tools/poze/` în `.gitignore`).

- [ ] **Step 1: Scrie proba** — pe modelul `crypto/scripts/proba-ecran-t212.mjs` (Chrome/Edge headless prin CDP, `Page.addScriptToEvaluateOnNewDocument` cu `window.__probaPoza = <fixture>` + SW dezactivat), pagina servită local (`npx --yes serve -l 8777 .` sau `python -m http.server 8777`), la 1920 și 390:

```js
// teste (fiecare = un `test(nume, fn)` ca in proba-ecran-t212):
// 1. pagina se incarca fara erori JS si fara 'NaN'/'undefined' in textul lui #rad
// 2. #rad are 3 sectiuni: Trading 212 (7 randuri), Boti (1 rand EXEMPLU sau textul de gol), Simbolurile tale (9 randuri)
// 3. clic pe randul AVGO -> randul .det de sub el nu mai e hidden; inca un clic -> hidden
// 4. inpSym = 'NVDA', btnAdd -> apare randul NVDA in Simbolurile tale (cu 'cere cheia' sau '—' la insideri) si localStorage.wl_price_alerts contine NVDA cu kind 'watch'
// 5. butonul 'Scoate din lista' pe NVDA -> dispare
// 6. fara __probaPoza si fara cheie (a doua deschidere, Storage curat): #rad contine 'Pune cheia de citire'
// 7. la 390 px: document.documentElement.scrollWidth <= 390 (nimic nu defileaza orizontal); randurile .poz tr.rand au display grid
// 8. bara suitei exista neschimbata: header.suite-cockpit.al-topbar cu .desk-tabs (3 butoane) si #verBadge = 'v116'
// 9. pozele: tools/poze/alerts-1920.png si alerts-390.png (Page.captureScreenshot, captureBeyondViewport)
```

- [ ] **Step 2: Rulează proba** — `node tools/proba-ecran-alerts.mjs` ⇒ `PROBA_ECRAN_ALERTS PASS · 9/9`.

- [ ] **Step 3: Poza lângă demo** — deschide `tools/poze/alerts-1920.png` lângă `poza4-1920.png` (demo v4) și `alerts-390.png` lângă poza demo la 390; scrie lista diferențelor în chat; fiecare diferență se repară în CSS/HTML până lista e goală (sau conține doar bara suitei, care e diferită de demo prin construcție: în demo era reprodusă, aici e cea reală).

- [ ] **Step 4: Inventarul** — `node tools/inventar.mjs http://127.0.0.1:8777 1440` (doar linia `alerts`): scorul trebuie să fie sub 161 (referința din 22.09). Dacă e peste, ce anume l-a urcat se vede în componente (apăsabile fără etichetă, fonturi, culori, înălțime) și se repară.

- [ ] **Step 5: Amend pe commit-ul din Task 3 NU** — faci un commit nou:

```bash
node --test tools/*.test.mjs && git add tools/proba-ecran-alerts.mjs tools/fixtures/poza-radar.json .gitignore lib/radar-poza.js $(git diff --name-only) && git commit -m "alerts v116: proba de ecran (poza de proba, 1920 + 390), retusuri dupa poza langa demo"
```

---

### Task 5: Publicarea și verificarea pe viu

**Files:** niciunul nou; doar comenzi și memo.

- [ ] **Step 1: Push-ul suitei** — `cd C:/Users/Cimin/premarket_scanner && node --test tools/*.test.mjs && git push origin main`; Pages publică (workflow `pages.yml`); verifică pe `https://mferent80-source.github.io/premarket_scanner.html/alerts/` că badge-ul e **v116** și suita **tt-v826** (dacă nu, e SW-ul vechi: `[[feedback_bucla_update_sw]]`; reîncarcă de două ori / Unregister).
- [ ] **Step 2: Cheia** — Marius apasă „Pune cheia de citire” pe pagina publicată și lipește cheia primită la Task 1 (o dată; rămâne în browser). Pe telefon la fel.
- [ ] **Step 3: Poza pe viu** — colectorul repornit de Marius (lansatorul); în `data/colector.log`: `poza: urcata`; pe pagină: chip „poza de acum X min”, 7 poziții T212, „niciun bot activ” (sau botul lui), simbolurile lui cu insideri. Adaugă un simbol de pe telefon ⇒ în ≤ 5 minute apare cu insiderii lui (lista a ajuns la worker, colectorul a luat-o).
- [ ] **Step 4: Poze reale lângă demo** — la 1920 și 390 (`tools/proba-ecran-alerts.mjs` pe adresa publicată, fără `__probaPoza`, cu cheia pusă în profilul de probă); diferențele = zero.
- [ ] **Step 5: Memo** — în `project_crypto_radar.md` și `index_pine.md` (suita): versiunile, rutele, ce s-a scos (praguri, workflow), ce așteaptă la el, lansatorul telefonului = următorul.
