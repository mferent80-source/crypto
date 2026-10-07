# Pagina alerts în două — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (execuție DIRECTĂ — regula lui: eu scriu, testez, livrez; fără lanț de agenți). Pașii au căsuțe (`- [ ]`).

**Goal:** pagina `alerts` din Trading Tools are două file, „💼 Ce dețin” (T212 + boți + Salt) și „👀 Ce urmăresc”. Fiecare filă are panoul „🔔 Alertele de azi”, iar la Salt poți adăuga poziții manual, cu prețul în EUR sau în USD, și vezi SL/TP sugerat. Totul arată ca demo-ul v3.

**Architecture:** colectorul (acasă) ține jurnalul alertelor zilei și rândurile Salt. Pe amândouă le pune în poza care urcă la worker-ul Paznic. Pagina citește poza (cheia de citire) și desenează filele cu `lib/radar-ecran.js`. Cererile Salt pleacă de pe pagină la worker (`/salt-cereri`). Colectorul le ia de acolo, le aplică pe lista Salt din Radar și confirmă.

**Tech Stack:** Node ESM (colector, probe `node scripts/*.mjs`), Cloudflare Worker (`paznic/worker.mjs`, `wrangler`), pagini statice ES5 (`premarket_scanner`, probe `node --test`), Chrome headless pentru poze.

**Spec:** `crypto/docs/superpowers/specs/2026-10-07-alerts-in-doua-design.md` · **Demo aprobat:** https://claude.ai/artifact/HFTKozK9quw4vDczjTW4fE (v3); sursa e în `scratchpad/demo-alerts-doua/sablon2.html`.

## Global Constraints

- **Versiuni:** colector **v101.86** (citește `VERSIUNE_COLECTOR` ÎNAINTE; dacă altă sesiune a urcat deja, iau următorul număr) · pagina alerts **v144** · suita **tt-v855** (`sw-app.js` `CACHE_VERSION = 'tt-v855-2026-10-07'`).
- **Rândurile tabelelor existente** (`randT212`, `randBot`, `randSimbol`) NU se ating.
- **Rezultatele** au O SINGURĂ zecimală (806,7, nu 806,65). Prețurile rămân cum le scrie `bani()`.
- **Tot textul e în română, cu diacritice.** Fiecare alertă are lângă culoare un text (URGENT/ATENȚIE/INFO) sau un semn (▲▼).
- **Comit DOAR fișierele mele** (`git add <cale>`). În `crypto` lucrează și altă sesiune.
- `npm test && git commit && git push` cu `&&`, NICIODATĂ `;`. Mesajul de commit se dă cu `-F <fișier>`, fiindcă Bash dezescapează backslash-urile.
- **`wrangler deploy`** pe Paznic se face doar după ce am verificat că `triggers.crons` e în `paznic/wrangler.jsonc`. wrangler-ul îl iau din `C:/Users/Cimin/busola/node_modules/.bin/wrangler`.
- **„Toate, cu grilele”:** grilele și perechile încheiate sunt zgomot (`cheie === "grila"` sau titlul conține „pereche încheiată” / „perechi încheiate”).
- **Lista Salt e UNA:** KV-ul Radarului, `t212:salt-pozitii`, scris prin `/api/t212?action=saltPozitii` (care ÎNLOCUIEȘTE toată lista). Formatul: `{isin, simbol, nume, qty, pretMediu, de, plata: "EUR"|"simbol"}`.
- **După o probă cu Chrome**, șterg profilul (`--user-data-dir` în scratchpad, `rm -rf`).

## Review Focus

1. **Grupa alertelor.** Un simbol urmărit pe care îl și deții (MU, WDC, RHM.DE): alertele lui apar o singură dată, la „Ce dețin” (Task 1).
2. **Alerta Salt** are în titlu forma scurtă, „Salt · RHM: …”, nu „RHM.DE”. Trebuie să ajungă la „Ce dețin”, cu sursa „Salt” (Task 1).
3. **Cererea „$ USD”** pentru o acțiune în EUR (RHM.DE) e respinsă cu motivul spus, nu scrisă greșit în listă (Task 3).
4. **Simbolul scris fără ISIN** („nflx”, cu litere mici) se găsește în universul Salt. Unul inexistent e respins cu „nu e în lista Salt” (Task 3).
5. **Poza de la colectorul vechi**, fără `alerte`/`salt`: panourile spun că vin cu colectorul nou, NU „nicio alertă azi” (Task 5 și Task 6).

---

### Task 1: Jurnalul alertelor de azi + gruparea lor (colector, funcții pure)

**Files:**
- Create: `crypto/scripts/lib/alerte-zi.mjs`
- Test: `crypto/scripts/alerte-zi-v10186.mjs`

**Interfaces:**
- **Produces:**
  - `ziRo(t: number) -> "YYYY-MM-DD"`, ziua după ora României;
  - `adaugaInJurnal(j: {zi, lista}|null, a: {t, nivel, titlu, mesaj, bot, cheie}, acum: number) -> {zi, lista}`, care ține doar ziua de azi și cel mult `ALERTE_ZI_MAX = 400`;
  - `eZgomot(a) -> boolean`;
  - `alertePentruPoza(j, {detinute: string[], urmarite: string[], boti: [{id, s}]}, acum) -> [{t, nivel, titlu, mesaj, grup: "det"|"urm", zgomot, sim, src: "bot"|"t212"|"salt"|"urm"|"piata"}]`, cu cele mai noi primele.

- [ ] **Step 1: Scriu proba care pică**

```js
// Proba jurnalului alertelor de azi (v101.86, pagina alerts în două). Fără rețea. Rulare: node scripts/alerte-zi-v10186.mjs
import assert from "node:assert/strict";
import { ziRo, adaugaInJurnal, eZgomot, alertePentruPoza, ALERTE_ZI_MAX } from "./lib/alerte-zi.mjs";
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const T = Date.UTC(2026, 9, 7, 11, 0);   // 14:00 ora României

await test("ziRo: ora României, nu UTC (22:30 UTC = ziua următoare la noi)", () => {
  assert.equal(ziRo(Date.UTC(2026, 9, 7, 21, 30)), "2026-10-08");
  assert.equal(ziRo(T), "2026-10-07");
});
await test("adaugaInJurnal: ziua nouă golește lista; plafonul 400 păstrează cele mai noi", () => {
  let j = adaugaInJurnal(null, { t: T, nivel: "info", titlu: "MU: −1% azi", mesaj: "x", cheie: "t212-pas-MU" }, T);
  assert.equal(j.zi, "2026-10-07"); assert.equal(j.lista.length, 1);
  j = adaugaInJurnal(j, { t: T + 86400000, nivel: "info", titlu: "a doua zi" }, T + 86400000);
  assert.equal(j.lista.length, 1); assert.equal(j.lista[0].titlu, "a doua zi");
  for (let i = 0; i < ALERTE_ZI_MAX + 5; i++) j = adaugaInJurnal(j, { t: T + 86400000 + i, nivel: "info", titlu: "n" + i }, T + 86400000 + i);
  assert.equal(j.lista.length, ALERTE_ZI_MAX); assert.equal(j.lista[j.lista.length - 1].titlu, "n" + (ALERTE_ZI_MAX + 4));
});
await test("eZgomot: grila și perechile încheiate da; rezumatul pe oră nu", () => {
  assert.equal(eZgomot({ cheie: "grila", titlu: "PONS: grilă atinsă — a vândut la ~0.40970" }), true);
  assert.equal(eZgomot({ titlu: "✅ PONS: pereche încheiată +0,02 USDT" }), true);
  assert.equal(eZgomot({ titlu: "✅ PONS: 2 perechi încheiate +0,04 USDT" }), true);
  assert.equal(eZgomot({ cheie: "perechi-ora", titlu: "✅ PONS: 8 perechi în ultima oră, +0,17 USDT din grile" }), false);
});
await test("alertePentruPoza: grupele det/urm, deținutele urmărite trec la det, Salt scurt, piața fără simbol, zgomotul fără mesaj", () => {
  const l = [
    { t: T + 1, nivel: "info", titlu: "MU: −1% azi", mesaj: "m", cheie: "t212-pas-MU-m1" },
    { t: T + 2, nivel: "atentie", titlu: "WKL.AS: +2,8% azi, de 2,1× mișcarea lui obișnuită", mesaj: "m", cheie: "sim-miscare-WKL.AS-2026-10-07" },
    { t: T + 3, nivel: "atentie", titlu: "MU: +3,1% azi, de 2,0× mișcarea lui obișnuită", mesaj: "m", cheie: "sim-miscare-MU-2026-10-07" },
    { t: T + 4, nivel: "critic", titlu: "Salt · RHM: sub stopul care urcă (1.109,08 EUR)", mesaj: "m", cheie: "salt-stop-DE0007030009" },
    { t: T + 5, nivel: "info", titlu: "PONS (short 3×): −1,2% în 32 min", mesaj: "m", bot: "2411", cheie: "bot-pas-2411" },
    { t: T + 6, nivel: "info", titlu: "PONS: grilă atinsă — a vândut la ~0.40970", mesaj: "lung", bot: "2411", cheie: "grila" },
    { t: T + 7, nivel: "critic", titlu: "Crypto: mișcare", mesaj: "m", cheie: "vreme-crypto" }];
  const p = alertePentruPoza({ zi: "2026-10-07", lista: l }, { detinute: ["MU", "RHM.DE", "PONS"], urmarite: ["WKL.AS", "MU"], boti: [{ id: "2411", s: "PONS" }] }, T + 10);
  assert.deepEqual(p.map((a) => a.titlu.slice(0, 6)), ["Crypto", "PONS: ", "PONS (", "Salt ·", "MU: +3", "WKL.AS", "MU: −1"].map((x) => x.slice(0, 6)), "cele mai noi primele");
  const g = (s) => p.find((a) => a.titlu.startsWith(s));
  assert.equal(g("WKL.AS").grup, "urm"); assert.equal(g("WKL.AS").src, "urm"); assert.equal(g("WKL.AS").sim, "WKL.AS");
  assert.equal(g("MU: +3").grup, "det", "MU e urmărit DAR deținut ⇒ o singură dată, la Ce dețin");
  assert.equal(g("Salt ·").grup, "det"); assert.equal(g("Salt ·").src, "salt"); assert.equal(g("Salt ·").sim, "RHM.DE");
  assert.equal(g("PONS (").src, "bot"); assert.equal(g("PONS (").sim, "PONS");
  assert.equal(g("PONS: grilă").zgomot, true); assert.equal(g("PONS: grilă").mesaj, "", "zgomotul fără mesaj (poza mică)");
  assert.equal(g("Crypto").src, "piata"); assert.equal(g("Crypto").sim, ""); assert.equal(g("Crypto").grup, "det");
  assert.equal(g("MU: −1").src, "t212");
});
await test("alertePentruPoza: jurnalul de ieri = listă goală (nu alertele de ieri ca «de azi»)", () => {
  assert.deepEqual(alertePentruPoza({ zi: "2026-10-06", lista: [{ t: T - 86400000, nivel: "info", titlu: "MU: −1% azi" }] }, { detinute: ["MU"], urmarite: [], boti: [] }, T), []);
});
console.log(`\n${teste - picate}/${teste} probe trec`); if (picate) process.exit(1);
```

- [ ] **Step 2: Rulez proba și văd că pică**

Run: `cd C:/Users/Cimin/crypto && node scripts/alerte-zi-v10186.mjs`
Expected: eroare de import („Cannot find module …/alerte-zi.mjs”).

- [ ] **Step 3: Scriu modulul**

```js
// alerte-zi.mjs (v101.86, el 07.10: „pagina alerts să fie în două”): jurnalul alertelor de AZI (ora României), separat de lista de
// 100 din KV-ul Radarului (acolo grilele împing alertele de dimineață afară), și gruparea lor pentru filele paginii alerts.
export const ALERTE_ZI_MAX = 400;
const nr = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
export function ziRo(t) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t)); }
export function adaugaInJurnal(j, a, acum) {
  const zi = ziRo(acum), l = j && j.zi === zi && Array.isArray(j.lista) ? j.lista.slice() : [];
  l.push({ t: nr(a && a.t) || acum, nivel: String(a && a.nivel || "info"), titlu: String(a && a.titlu || "").slice(0, 200), mesaj: String(a && a.mesaj || "").slice(0, 600),
    bot: a && a.bot ? String(a.bot) : null, cheie: a && a.cheie ? String(a.cheie) : null });
  return { zi, lista: l.slice(-ALERTE_ZI_MAX) };
}
export function eZgomot(a) { return !!a && (a.cheie === "grila" || /perech(e|i) încheiat/i.test(String(a.titlu || ""))); }
const scurt = (s) => String(s || "").toUpperCase().replace(/\.[A-Z]+$/, "");
// simbolul din titlu: „MU: …”, „WKL.AS: …”, „PONS (short 3×): …”, „Salt · RHM: …”
function simDinTitlu(t) { const m = /^(?:\W*Salt\s*·\s*)?\W*([A-Z0-9][A-Z0-9.\-]{0,15})\s*[:(]/.exec(String(t || "")); return m ? m[1] : ""; }
export function alertePentruPoza(j, o, acum) {
  if (!j || j.zi !== ziRo(acum) || !Array.isArray(j.lista)) return [];
  const det = new Set((o && o.detinute || []).map((s) => String(s).toUpperCase())), urm = new Set((o && o.urmarite || []).map((s) => String(s).toUpperCase()));
  const detScurt = new Map(); for (const s of det) detScurt.set(scurt(s), s);
  const boti = new Map((o && o.boti || []).map((b) => [String(b.id), String(b.s || "").toUpperCase()]));
  return j.lista.slice().sort((a, b) => b.t - a.t).map((a) => {
    const k = String(a.cheie || ""), t = String(a.titlu || ""), z = eZgomot(a), cand = simDinTitlu(t);
    let src, sim = "";
    if (a.bot) { src = "bot"; sim = boti.get(String(a.bot)) || cand; }
    else if (/^\W*Salt\s*·/.test(t) || k.startsWith("salt-")) { src = "salt"; sim = detScurt.get(scurt(cand)) || cand; }
    else if (k.startsWith("t212")) { src = "t212"; sim = cand; }
    else if (k.startsWith("sim-") || urm.has(cand)) { src = "urm"; sim = cand; }
    else if (det.has(cand)) { src = "t212"; sim = cand; }
    else src = "piata";
    const grup = src === "urm" && !det.has(sim) ? "urm" : "det";
    if (src === "urm" && grup === "det") src = "t212";   // urmărit DAR deținut: o singură dată, la Ce dețin
    return { t: a.t, nivel: a.nivel, titlu: t, mesaj: z ? "" : String(a.mesaj || ""), grup, zgomot: z, sim, src };
  });
}
```

Notă: la un simbol urmărit și deținut, sursa `t212` e eticheta afișată, fiindcă detaliile vin din poză. Salt deținut tot la „det” ajunge, prin ramura `salt`.

- [ ] **Step 4: Rulez proba și văd că trece**

Run: `node scripts/alerte-zi-v10186.mjs`
Expected: `5/5 probe trec`. Dacă pică ordinea din primul `deepEqual`, potrivesc aserțiunea pe titluri întregi, nu codul.

- [ ] **Step 5: Leg proba de suită**

În `package.json`, scriptul `"test:colector"` primește la coadă ` && node scripts/alerte-zi-v10186.mjs`. Încă nu comit: comit la Task 3, cu colectorul.

---

### Task 2: Rândurile Salt + câmpurile noi în poză (colector, funcții pure)

**Files:**
- Modify: `crypto/scripts/lib/tura-salt-pozitii.mjs` (bucla din `turaSaltPozitii`, întoarce și `randuri`)
- Modify: `crypto/scripts/lib/poza.mjs:336-344` (`construiestePoza` primește `alerte`, `salt`, `saltCereri`)
- Test: `crypto/scripts/alerte-zi-v10186.mjs` (probe noi)

**Interfaces:**
- **Consumes:** `Salt.analizeaza` → `{p: {pret, maxDupaCumparare}, niv: {stopPozitie, tintaPozitie}|null, cons: {nivel, titlu, faCe, motive}}`.
- **Produces:**
  - `turaSaltPozitii(d) -> { rezumat, trimise, randuri: [{isin, simbol, nume, qty, pretMediu, plata, de, moneda, pret, prev, closes30, val, cost, rez, niv, motive, sfat, sugestie: {stop, tinta}|null, max, mediuSimbol}] }`. O poziție fără prețuri apare tot în `randuri`, cu `pret: null` și `motivFara`.
  - `construiestePoza(i)` primește în plus `i.alerte` (array), `i.salt` (`{la, randuri}`|null) și `i.saltCereri` (array). Poza capătă câmpurile `alerte`, `salt`, `saltCereri`. Dacă unul lipsește la intrare, câmpul NU apare în poză, ca pagina să deosebească „colector vechi” de „gol”.

- [ ] **Step 1: Probele care pică** (le adaug în `scripts/alerte-zi-v10186.mjs`, înainte de `console.log` final)

```js
import { construiestePoza } from "./lib/poza.mjs";
import { turaSaltPozitii } from "./lib/tura-salt-pozitii.mjs";
await test("construiestePoza: alerte / salt / saltCereri trec în poză; lipsa lor = câmpul lipsește (colector vechi ≠ gol)", () => {
  const p = construiestePoza({ acum: T, alerte: [{ t: T, titlu: "x", grup: "det" }], salt: { la: T, randuri: [{ isin: "DE0007030009", simbol: "RHM.DE" }] }, saltCereri: [{ id: "a1", stare: "ok" }] });
  assert.equal(p.alerte.length, 1); assert.equal(p.salt.randuri[0].simbol, "RHM.DE"); assert.equal(p.saltCereri[0].stare, "ok");
  const v = construiestePoza({ acum: T });
  assert.equal("alerte" in v, false); assert.equal("salt" in v, false); assert.equal("saltCereri" in v, false);
});
await test("turaSaltPozitii: un rând pe poziție, cu SL/TP din analiză, EUR, plata; fără bare ⇒ rând cu pret null", async () => {
  const bare = Array.from({ length: 130 }, (_, i) => ({ t: T - (130 - i) * 86400000, o: 100, h: 101, l: 99, c: 100 - i * 0.1 }));
  const Salt = { perecheFx: () => null, medieInMonedaSimbolului: (p) => p.pretMediu,
    analizeaza: (p, b) => ({ p: { pret: b[b.length - 1].c, maxDupaCumparare: 101 }, niv: { stopPozitie: 85.85, tintaPozitie: 120 }, cons: { nivel: "iesi", titlu: "Sub stop", faCe: "Ies", motive: ["sub stop"] } }) };
  const r = await turaSaltPozitii({ pozitii: [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall", qty: 2, pretMediu: 120, de: "2026-05-11", plata: "EUR" }, { isin: "US64110L1061", simbol: "NFLX", qty: 1, pretMediu: 80, plata: "EUR" }],
    univers: [{ isin: "DE0007030009", moneda: "EUR" }, { isin: "US64110L1061", moneda: "USD" }], cereBare: async (s) => (s === "RHM.DE" ? bare : []), Salt, deps: {}, stare: {}, trimite: async () => true, acum: T });
  assert.equal(r.randuri.length, 2);
  const a = r.randuri[0];
  assert.equal(a.simbol, "RHM.DE"); assert.equal(a.moneda, "EUR"); assert.equal(a.niv, "iesi"); assert.deepEqual(a.sugestie, { stop: 85.85, tinta: 120 }); assert.equal(a.max, 101);
  assert.equal(a.prev, bare[bare.length - 2].c); assert.equal(a.closes30.length, 30); assert.equal(Math.round(a.rez * 10) / 10, Math.round((a.val - a.cost) * 10) / 10);
  assert.equal(r.randuri[1].pret, null); assert.equal(r.randuri[1].motivFara, "bare");
});
```

- [ ] **Step 2: Rulez și văd că pică**

Run: `node scripts/alerte-zi-v10186.mjs`
Expected: PICA la ambele probe noi (`p.alerte` e undefined, `r.randuri` e undefined).

- [ ] **Step 3: `construiestePoza`** (în `poza.mjs`, în `return`-ul de la linia 341, înainte de `gol:`)

```js
    // v101.86 (pagina alerts în două): alertele de azi, pozițiile Salt și răspunsul la cererile Salt - doar când colectorul le are
    ...(Array.isArray(i.alerte) ? { alerte: i.alerte } : {}), ...(i.salt && Array.isArray(i.salt.randuri) ? { salt: { la: nr(i.salt.la), randuri: i.salt.randuri } } : {}),
    ...(Array.isArray(i.saltCereri) ? { saltCereri: i.saltCereri.slice(-20) } : {}),
```

- [ ] **Step 4: `turaSaltPozitii` cu rânduri** (în `tura-salt-pozitii.mjs`)

Lângă `const rez = …` adaug `const randuri = [];`. Funcția `fara(p, de)` primește și rândul gol:

```js
  const fara = (p, de) => { rez.fara++; randuri.push({ isin: p && p.isin, simbol: p && p.simbol, nume: p && p.nume || "", qty: p && p.qty, pretMediu: p && p.pretMediu, plata: p && p.plata, de: p && p.de || null, pret: null, motivFara: de });
    if (d.jurnal) d.jurnal("salt: " + (p && p.simbol) + " fără prețuri (" + de + ") - nu intră în rezumat"); };
```

În buclă, după `rez.val += val; …`:

```js
      const cs = a.cons || {}, r1 = (v) => Math.round(v * 100) / 100;
      randuri.push({ isin: p.isin, simbol: p.simbol, nume: p.nume || "", qty: p.qty, pretMediu: p.pretMediu, plata: p.plata, de: p.de || null, moneda: m || "EUR",
        pret: a.p.pret, prev: b.length > 1 ? b[b.length - 2].c : null, closes30: b.slice(-30).map((x) => x.c), val: r1(val), cost: r1(cost), rez: r1(val - cost),
        niv: cs.nivel || null, motive: Array.isArray(cs.motive) ? cs.motive.slice(0, 4) : [], sfat: String(cs.faCe || cs.titlu || ""),
        sugestie: a.niv && a.niv.stopPozitie > 0 && a.niv.tintaPozitie > 0 ? { stop: a.niv.stopPozitie, tinta: a.niv.tintaPozitie } : null,
        max: a.p.maxDupaCumparare || null, mediuSimbol: pm });
```

Iar `return { rezumat: rez, trimise };` devine `return { rezumat: rez, trimise, randuri };`.

- [ ] **Step 5: Rulez și văd că trece**

Run: `node scripts/alerte-zi-v10186.mjs && node scripts/poza-v98.mjs && node scripts/proba-v100126.mjs`
Expected: toate trec. Probele vechi ale pozei și ale Salt rămân verzi, pentru că câmpurile noi lipsesc când nu sunt date.

---

### Task 3: Cererile Salt + legarea în colector (v101.86)

**Files:**
- Create: `crypto/scripts/lib/salt-cereri.mjs`
- Modify: `crypto/scripts/colector.mjs` (`trimiteAlerta` ~l.230, `turaSaltPozitii` ~l.1162, `turaPoza` ~l.1038, `VERSIUNE_COLECTOR` l.46)
- Test: `crypto/scripts/alerte-zi-v10186.mjs`

**Interfaces:**
- **Produces:** `aplicaCereriSalt(lista, cereri, univers) -> { lista, rezultate: [{id, stare: "ok"|"respins", motiv}] }`, funcție pură.
- **Cererea:** `{id, op: "pune"|"scoate", isin?, simbol?, qty?, pretMediu?, moneda?: "EUR"|"USD", de?}`.
- **Universul:** `[{isin, simbol, nume, moneda}]` din `public/data/salt-univers.json`.

- [ ] **Step 1: Probele care pică**

```js
import { aplicaCereriSalt } from "./lib/salt-cereri.mjs";
const UNIV = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG", moneda: "EUR" }, { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix Inc.", moneda: "USD" }];
await test("aplicaCereriSalt: pune după simbol (litere mici), EUR ⇒ plata EUR, USD la acțiune în USD ⇒ plata simbol, înlocuiește după ISIN, scoate", () => {
  let r = aplicaCereriSalt([], [{ id: "1", op: "pune", simbol: "nflx", qty: 14.43412, pretMediu: 79.84, moneda: "EUR", de: "2026-04-21" }], UNIV);
  assert.deepEqual(r.rezultate, [{ id: "1", stare: "ok", motiv: "NFLX adăugat" }]);
  assert.deepEqual(r.lista[0], { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix Inc.", qty: 14.43412, pretMediu: 79.84, de: "2026-04-21", plata: "EUR" });
  r = aplicaCereriSalt(r.lista, [{ id: "2", op: "pune", isin: "US64110L1061", qty: 15, pretMediu: 89, moneda: "USD" }], UNIV);
  assert.equal(r.lista.length, 1); assert.equal(r.lista[0].qty, 15); assert.equal(r.lista[0].plata, "simbol"); assert.equal(r.rezultate[0].motiv, "NFLX modificat");
  r = aplicaCereriSalt(r.lista, [{ id: "3", op: "scoate", isin: "US64110L1061" }], UNIV);
  assert.equal(r.lista.length, 0); assert.equal(r.rezultate[0].stare, "ok");
});
await test("aplicaCereriSalt: respinge USD la acțiune în EUR, simbol necunoscut, cantitate/preț ≤ 0, scoate ce nu e în listă - lista rămâne neatinsă", () => {
  const l0 = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG", qty: 1.0456, pretMediu: 1349.6, de: "2026-05-11", plata: "EUR" }];
  const r = aplicaCereriSalt(l0, [
    { id: "a", op: "pune", simbol: "RHM.DE", qty: 1, pretMediu: 1000, moneda: "USD" },
    { id: "b", op: "pune", simbol: "XYZQ", qty: 1, pretMediu: 10, moneda: "EUR" },
    { id: "c", op: "pune", simbol: "NFLX", qty: 0, pretMediu: 10, moneda: "EUR" },
    { id: "d", op: "scoate", isin: "US64110L1061" }], UNIV);
  assert.deepEqual(r.lista, l0);
  assert.deepEqual(r.rezultate.map((x) => x.stare), ["respins", "respins", "respins", "respins"]);
  assert.match(r.rezultate[0].motiv, /RHM\.DE se tranzacționează în EUR/); assert.match(r.rezultate[1].motiv, /nu e în lista Salt/);
  assert.match(r.rezultate[2].motiv, /bucăți/); assert.match(r.rezultate[3].motiv, /nu e în pozițiile tale/);
});
```

- [ ] **Step 2: Rulez și văd că pică.** Expected: eroare de import pentru `salt-cereri.mjs`.

- [ ] **Step 3: Scriu modulul**

```js
// salt-cereri.mjs (v101.86, el 07.10: „la dețineri să pot adăuga și manual cu preț în euro și USD, că alea din Salt așa le am”):
// cererile de pe pagina alerts (prin worker-ul Paznic) aplicate pe lista Salt din Radar - una singură, aceeași cu pagina Salt.
const nr = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
export function aplicaCereriSalt(lista, cereri, univers) {
  let l = (Array.isArray(lista) ? lista : []).map((x) => ({ ...x })); const rezultate = [], u = Array.isArray(univers) ? univers : [];
  for (const c of Array.isArray(cereri) ? cereri : []) {
    const id = String(c && c.id || ""), cauta = String(c && (c.isin || c.simbol) || "").trim().toUpperCase();
    const ins = u.find((x) => x.isin === cauta) || u.find((x) => String(x.simbol || "").toUpperCase() === cauta);
    const nu = (motiv) => rezultate.push({ id, stare: "respins", motiv });
    if (c && c.op === "scoate") {
      const isin = ins ? ins.isin : cauta, i = l.findIndex((x) => x.isin === isin);
      if (i < 0) { nu((ins ? ins.simbol : cauta) + " nu e în pozițiile tale Salt"); continue; }
      const s = l[i].simbol; l = l.filter((_, k) => k !== i); rezultate.push({ id, stare: "ok", motiv: s + " scos" }); continue;
    }
    if (!c || c.op !== "pune") { nu("cerere necunoscută"); continue; }
    if (!ins) { nu(cauta + " nu e în lista Salt (caută-l după ISIN)"); continue; }
    const qty = nr(c.qty), pm = nr(c.pretMediu);
    if (!(qty > 0)) { nu("bucățile trebuie să fie mai mari ca zero"); continue; }
    if (!(pm > 0)) { nu("prețul mediu trebuie să fie mai mare ca zero"); continue; }
    const mon = c.moneda === "USD" ? "USD" : "EUR";
    if (mon === "USD" && ins.moneda !== "USD") { nu(ins.simbol + " se tranzacționează în " + (ins.moneda || "EUR") + ", nu în USD: scrie prețul în EUR"); continue; }
    const rand = { isin: ins.isin, simbol: ins.simbol, nume: String(ins.nume || "").slice(0, 80), qty, pretMediu: pm, de: /^\d{4}-\d{2}-\d{2}$/.test(String(c.de || "")) ? c.de : null, plata: mon === "EUR" ? "EUR" : "simbol" };
    const i = l.findIndex((x) => x.isin === ins.isin);
    if (i >= 0) { l[i] = rand; rezultate.push({ id, stare: "ok", motiv: ins.simbol + " modificat" }); } else { l.push(rand); rezultate.push({ id, stare: "ok", motiv: ins.simbol + " adăugat" }); }
  }
  return { lista: l, rezultate };
}
```

Notă: „EUR” la o acțiune în EUR dă tot `plata: "EUR"`, ceea ce e corect: pentru pagina Salt, „EUR” și „simbol” coincid acolo. Câmpul `de` lipsă rămâne `null`, ca la pagina Salt.

- [ ] **Step 4: Rulez și văd că trece.** Run: `node scripts/alerte-zi-v10186.mjs`. Expected: toate probele trec.

- [ ] **Step 5: Leg totul în `colector.mjs`**

(a) Importuri lângă celelalte din `./lib/`:
```js
import { adaugaInJurnal, alertePentruPoza } from "./lib/alerte-zi.mjs";   // v101.86: pagina alerts în două
import { aplicaCereriSalt } from "./lib/salt-cereri.mjs";
```
(b) Jurnalul, lângă `STARE_FIS`:
```js
const ALERTE_ZI_FIS = path.join(DATA, "alerte-zi.json");
let alerteZi = null; try { alerteZi = JSON.parse(fs.readFileSync(ALERTE_ZI_FIS, "utf8")); } catch {}
function notezAlerta(a) { try { alerteZi = adaugaInJurnal(alerteZi, a, Date.now()); scrieAtomic(ALERTE_ZI_FIS, alerteZi); } catch (e) { jurnal("jurnalul alertelor de azi", e.message); } }
```
`STARE_FIS` și `scrieAtomic` sunt definite după `trimiteAlerta`. Blocul îl pun DUPĂ definiția `scrieAtomic`, iar `trimiteAlerta` îl cheamă doar la rulare, deci ordinea e bună. Verific cu `grep -n "function scrieAtomic"`.

(c) În `trimiteAlerta`, imediat după blocul `try { … inKv = … }`:
```js
  notezAlerta({ t: Date.now(), nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj || "", bot: bot || null, cheie: cheie || null });
```
(d) `turaSaltPozitii`: după `const r = await turaSaltPozitiiModul(…)` adaug `ultimeleSalt = { la: Date.now(), randuri: r.randuri || [] };`. Declarația `let ultimeleSalt = null, saltCereriRez = [];` o pun lângă `let saltPozInLucru`.

(e) `turaPoza`: înainte de `construiestePoza`:
```js
    // v101.86: cererile Salt de pe pagina alerts (worker /salt-cereri) - aplicate pe lista din Radar, apoi confirmate; tura Salt imediat
    try {
      const cr = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/salt-cereri", { headers: { authorization: "Bearer " + PAZNIC_TOKEN }, signal: AbortSignal.timeout(15000) });
      const cer = cr.ok ? ((await cr.json()).cereri || []) : [];
      if (cer.length) {
        const s = await cere("/api/t212?action=salt"), u = JSON.parse(fs.readFileSync(path.join(RAD, "public", "data", "salt-univers.json"), "utf8"));
        const a = aplicaCereriSalt(s && s.pozitii || [], cer, u && u.instrumente || []);
        if (a.rezultate.some((x) => x.stare === "ok")) await trimite("/api/t212?action=saltPozitii", { pozitii: a.lista });
        await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/salt-cereri/ack", { method: "POST", headers: { authorization: "Bearer " + PAZNIC_TOKEN, "content-type": "application/json" }, body: JSON.stringify({ iduri: cer.map((c) => c.id) }), signal: AbortSignal.timeout(15000) });
        saltCereriRez = saltCereriRez.concat(a.rezultate.map((x) => ({ ...x, la: Date.now() }))).slice(-20);
        jurnal("salt: cereri de pe pagina alerts", a.rezultate.map((x) => x.stare + " " + x.motiv).join("; "));
        if (a.rezultate.some((x) => x.stare === "ok")) { saltPozLa = 0; turaSaltPozitii().catch((e) => jurnal("salt poziții", e.message)); }
      }
    } catch (e) { jurnal("salt: cererile", e.message); }
```
Apoi, în apelul `construiestePoza({ … })`, adaug:
```js
      alerte: alertePentruPoza(alerteZi, { detinute: t212.map((x) => x.simbol).concat(boti.map((b) => String(b.baza || b.simbol || "").replace(/\.PERP$/, "").replace(/USDT$/, "")), (ultimeleSalt && ultimeleSalt.randuri || []).map((r) => r.simbol)),
        urmarite: simboluri.map((s) => s.s), boti: boti.map((b) => ({ id: b.id, s: String(b.baza || b.simbol || "").replace(/\.PERP$/, "").replace(/USDT$/, "") })) }, Date.now()),
      salt: ultimeleSalt, saltCereri: saltCereriRez,
```
⚠️ **Înainte să scriu (e), verific câmpurile boților în `botiPentruPoza()`** (`grep -n "function botiPentruPoza" -A12`). Simbolul botului trebuie luat din câmpul din care `botPoza` face `s`. Același nume îl folosesc și în `detinute`. Dacă `botPoza` ia simbolul altfel, folosesc expresia lui.

(f) `VERSIUNE_COLECTOR` devine `"v101.86"`, după ce verific că nu l-a urcat altă sesiune.

- [ ] **Step 6: Probele colectorului**

Run: `node --check scripts/colector.mjs && node scripts/alerte-zi-v10186.mjs && npm run test:colector`
Expected: toate trec. Probele care cer textual o versiune EXACTĂ de colector le trec la „cel puțin”, ca până acum.

- [ ] **Step 7: Commit (încă fără push; push-ul vine la Task 4)**

```bash
git add scripts/lib/alerte-zi.mjs scripts/lib/salt-cereri.mjs scripts/lib/tura-salt-pozitii.mjs scripts/lib/poza.mjs scripts/colector.mjs scripts/alerte-zi-v10186.mjs package.json
git commit -F <scratchpad>/msg-t3.txt   # „feat(colector): v101.86 - alertele de azi + Salt + cererile Salt in poza (pagina alerts in doua)”
```

---

### Task 4: Worker-ul Paznic `/salt-cereri` + publicarea

**Files:**
- Modify: `crypto/paznic/worker.mjs` (constante + funcții + rute)
- Test: `crypto/scripts/paznic-salt-v10186.mjs`; `package.json` `test:colector` primește proba la coadă

**Interfaces:**
- **Produces:**
  - `POST /salt-cereri` (cheia de citire): corpul e `{op, isin?, simbol?, qty?, pretMediu?, moneda?, de?}` și răspunde `{ok, id}`. 400 la `op` greșit sau numere greșite, 429 peste 20 de cereri în așteptare sau peste 100 de scrieri pe zi.
  - `GET /salt-cereri` (`PAZNIC_TOKEN`) răspunde `{cereri: [...]}`.
  - `POST /salt-cereri/ack` (`PAZNIC_TOKEN`) primește `{iduri: [...]}` și răspunde `{ok, ramase}`.
  - KV: cheia `salt-cereri`, cu forma `{cereri, zi, scrieriZi}`.

- [ ] **Step 1: Proba care pică**

```js
// Proba rutelor /salt-cereri ale paznicului (v101.86). Fără rețea. Rulare: node scripts/paznic-salt-v10186.mjs
import assert from "node:assert/strict";
import paznic from "../paznic/worker.mjs";
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const TOK = "t".repeat(32), CHEIE = "c".repeat(32);
function lume() {
  const kv = new Map(), env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, PAZNIC_TOKEN: TOK, CHEIE_CITIRE: CHEIE };
  const cere = (cale, m, h = {}, corp) => paznic.fetch(new Request("https://paznic.test" + cale, { method: m, headers: { "content-type": "application/json", ...h }, body: corp }), env);
  return { kv, cere };
}
const C = (o) => JSON.stringify(o);
await test("POST cu cheia de citire pune cererea; tokenul colectorului o citește și o confirmă; fără cheie 401", async () => {
  const w = lume();
  assert.equal((await w.cere("/salt-cereri", "POST", {}, C({ op: "pune", simbol: "NFLX", qty: 1, pretMediu: 2, moneda: "EUR" }))).status, 401);
  const r = await w.cere("/salt-cereri", "POST", { authorization: "Bearer " + CHEIE }, C({ op: "pune", simbol: "nflx", qty: 14.43412, pretMediu: 79.84, moneda: "EUR", de: "2026-04-21" }));
  assert.equal(r.status, 200); const { id } = await r.json(); assert.ok(id);
  assert.equal((await w.cere("/salt-cereri", "GET", { authorization: "Bearer " + CHEIE })).status, 401, "cheia de citire NU citește cererile");
  const g = await (await w.cere("/salt-cereri", "GET", { authorization: "Bearer " + TOK })).json();
  assert.equal(g.cereri.length, 1); assert.equal(g.cereri[0].simbol, "NFLX"); assert.equal(g.cereri[0].moneda, "EUR"); assert.equal(g.cereri[0].id, id);
  const a = await (await w.cere("/salt-cereri/ack", "POST", { authorization: "Bearer " + TOK }, C({ iduri: [id] }))).json();
  assert.equal(a.ramase, 0);
});
await test("validarea: op necunoscut, cantitate 0, moneda alta = 400; peste 20 în așteptare = 429", async () => {
  const w = lume(), H = { authorization: "Bearer " + CHEIE };
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "sterge-tot" }))).status, 400);
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "pune", simbol: "NFLX", qty: 0, pretMediu: 1, moneda: "EUR" }))).status, 400);
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "pune", simbol: "NFLX", qty: 1, pretMediu: 1, moneda: "GBP" }))).status, 400);
  for (let i = 0; i < 20; i++) assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "scoate", isin: "US64110L1061" }))).status, 200);
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "scoate", isin: "US64110L1061" }))).status, 429);
});
console.log(`\n${teste - picate}/${teste} probe trec`); if (picate) process.exit(1);
```

- [ ] **Step 2: Rulez și văd că pică.** Run: `node scripts/paznic-salt-v10186.mjs`. Expected: PICA, pentru că ruta cade pe răspunsul implicit 200 „serviciu”, deci POST-ul fără cheie nu dă 401.

- [ ] **Step 3: Scriu rutele** (în `worker.mjs`, după `simboluriCiteste`, iar ramura nouă în `fetch` înainte de `return J({ serviciu… })`)

```js
// v101.86 (pagina alerts în două): pozițiile Salt adăugate de pe pagină - pagina scrie cererea (cheia de citire), colectorul o ia,
// o aplică pe lista din Radar și o confirmă (tokenul lui). O singură cheie KV; cel mult 20 în așteptare și 100 de scrieri pe zi.
const SALT_CERERI_MAX = 20, SALT_SCRIERI_ZI = 100;
async function saltCereriCiteste(env) { let o = null; try { o = JSON.parse(await env.PAZNIC.get("salt-cereri") || "null"); } catch { o = null; } return o && Array.isArray(o.cereri) ? o : { cereri: [] }; }
export async function saltCerereScrie(env, text, acum = Date.now()) {
  if (String(text || "").length > 2000) return { status: 413, corp: { error: "cerere prea mare" } };
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const op = c && c.op, n = (x) => (typeof x === "number" && Number.isFinite(x) ? x : NaN);
  if (op !== "pune" && op !== "scoate") return { status: 400, corp: { error: "op: pune sau scoate" } };
  const isin = String(c.isin || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12), simbol = String(c.simbol || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 20);
  if (!isin && !simbol) return { status: 400, corp: { error: "lipsește simbolul sau ISIN-ul" } };
  const x = { id: acum.toString(36) + Math.random().toString(36).slice(2, 6), op, isin: isin || null, simbol: simbol || null, la: acum };
  if (op === "pune") {
    if (!(n(c.qty) > 0) || !(n(c.pretMediu) > 0)) return { status: 400, corp: { error: "bucățile și prețul mediu trebuie să fie mai mari ca zero" } };
    if (c.moneda !== "EUR" && c.moneda !== "USD") return { status: 400, corp: { error: "moneda: EUR sau USD" } };
    Object.assign(x, { qty: c.qty, pretMediu: c.pretMediu, moneda: c.moneda, de: /^\d{4}-\d{2}-\d{2}$/.test(String(c.de || "")) ? c.de : null });
  }
  const v = await saltCereriCiteste(env), zi = new Date(acum).toISOString().slice(0, 10), scrieri = v.zi === zi ? (Number(v.scrieriZi) || 0) : 0;
  if (v.cereri.length >= SALT_CERERI_MAX) return { status: 429, corp: { error: "sunt deja " + SALT_CERERI_MAX + " cereri în așteptare: colectorul de acasă nu le-a luat (e pornit?)" } };
  if (scrieri >= SALT_SCRIERI_ZI) return { status: 429, corp: { error: "prea multe cereri azi (" + SALT_SCRIERI_ZI + "); mâine se poate din nou" } };
  await env.PAZNIC.put("salt-cereri", JSON.stringify({ cereri: v.cereri.concat([x]), zi, scrieriZi: scrieri + 1 }));
  return { status: 200, corp: { ok: true, id: x.id } };
}
export async function saltCereriConfirma(env, text) {
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const iduri = new Set(Array.isArray(c && c.iduri) ? c.iduri.map(String) : []), v = await saltCereriCiteste(env), ramase = v.cereri.filter((x) => !iduri.has(String(x.id)));
  if (ramase.length !== v.cereri.length) await env.PAZNIC.put("salt-cereri", JSON.stringify({ ...v, cereri: ramase }));
  return { status: 200, corp: { ok: true, ramase: ramase.length } };
}
```

Rutele, în `fetch`:

```js
    if (u.pathname === "/salt-cereri") {
      if (m === "POST") { if (!autorizat(request, env.CHEIE_CITIRE)) return J({ error: "cheia de citire lipseste sau nu e buna" }, 401, h); const r = await saltCerereScrie(env, await request.text()); return J(r.corp, r.status, h); }
      if (m === "GET") { if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h); const v = await saltCereriCiteste(env); return J({ cereri: v.cereri }, 200, h); }
      return J({ error: "doar GET sau POST" }, 405, h);
    }
    if (u.pathname === "/salt-cereri/ack") {
      if (m !== "POST") return J({ error: "doar POST" }, 405, h);
      if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h);
      const r = await saltCereriConfirma(env, await request.text()); return J(r.corp, r.status, h);
    }
```

- [ ] **Step 4: Rulez și văd că trece.** Run: `node scripts/paznic-salt-v10186.mjs && node scripts/paznic-poza-v98.mjs`. Expected: ambele trec.

- [ ] **Step 5: Suita întreagă, commit, push**

Run: `cd C:/Users/Cimin/crypto && npm test && git add paznic/worker.mjs scripts/paznic-salt-v10186.mjs package.json && git commit -F <msg-t4.txt> && git push origin main`

Dacă `npm test` pică într-o probă pe care n-am atins-o, cum s-a mai întâmplat cu versiunea Busolei, o rulez singură. Arăt că pică și pe `git stash` (fără schimbările mele), apoi spun asta, fără push orb.

- [ ] **Step 6: Public worker-ul**

Run: `grep -n '"crons"' paznic/wrangler.jsonc && cd paznic && C:/Users/Cimin/busola/node_modules/.bin/wrangler deploy --config wrangler.jsonc`
Expected: ieșirea arată `schedule: */10 * * * *`. Proba pe viu e `curl -s -o /dev/null -w "%{http_code}" -X POST <PAZNIC_URL>/salt-cereri`, care trebuie să dea `401`, nu `200`.

---

### Task 5: Pagina — filele + panoul „Alertele de azi” (`lib/radar-ecran.js`)

**Files:**
- Modify: `premarket_scanner/lib/radar-ecran.js` (`randeaza` ~l.360 + funcții noi înainte de `cap`)
- Modify: `premarket_scanner/lib/radar-ui.css` (stilurile panoului, copiate din `sablon2.html`, cu prefixul `body.al-page .rad`)
- Test: `premarket_scanner/tools/radar-ecran.test.mjs`

**Interfaces:**
- **Consumes:** `poza.alerte` din Task 2.
- **Produces:**
  - `RadarEcran.grupeazaAlerte(alerte, grup) -> {toate, imp, peSim: {SIM: {n, crit}}}`;
  - `RadarEcran.panouAlerte(poza, grup, f) -> html`, unde `f = {tot, sim, mai}`;
  - `randeaza(el, poza, o)` cu `o.fila = "det" | "urm"` (implicit `"det"`);
  - starea filtrelor e `RadarEcran.filtre = {det: {tot:false, sim:null, mai:false}, urm: {…}}`;
  - clicurile pe filtre trec prin `leaga()`, la fel ca rândurile (atributele `data-alf`, `data-alg`, `data-als`).

- [ ] **Step 1: Probele care pică** (în `tools/radar-ecran.test.mjs`)

```js
const ALERTE = [
  { t: ACUM - 1000, nivel: 'critic', titlu: 'APLD: −15% de la maxim, pragul din planul tău', mesaj: 'A coborât 15,1%.\n👉 Aș ieși, măcar cu jumătate.', grup: 'det', zgomot: false, sim: 'APLD', src: 't212' },
  { t: ACUM - 2000, nivel: 'info', titlu: 'PONS: grilă atinsă — a vândut la ~0.40970', mesaj: '', grup: 'det', zgomot: true, sim: 'PONS', src: 'bot' },
  { t: ACUM - 3000, nivel: 'atentie', titlu: 'WKL.AS: +2,8% azi, de 2,1× mișcarea lui obișnuită', mesaj: 'Peste 2× ATR.\n👉 M-aș uita la știri.', grup: 'urm', zgomot: false, sim: 'WKL.AS', src: 'urm' }];
test('alerts în două: fila det arată T212 + boți + alertele det; fila urm arată simbolurile + alertele urm', () => {
  const poza = Object.assign(POZA_BAZA(), { alerte: ALERTE });
  const el = { innerHTML: '', addEventListener() {}, dataset: {}, querySelectorAll() { return []; } };
  RadarEcran.randeaza(el, poza, O(poza, { fila: 'det' }));
  assert.match(el.innerHTML, /Alertele de azi/); assert.match(el.innerHTML, /aria-label="Trading 212"/); assert.doesNotMatch(el.innerHTML, /aria-label="Simbolurile tale"/);
  assert.match(el.innerHTML, /APLD: −15%/); assert.doesNotMatch(el.innerHTML, /WKL\.AS: \+2,8%/); assert.doesNotMatch(el.innerHTML, /grilă atinsă/, 'zgomotul ascuns din start');
  assert.match(el.innerHTML, /URGENT/); assert.match(el.innerHTML, /👉 Aș ieși/);
  RadarEcran.randeaza(el, poza, O(poza, { fila: 'urm' }));
  assert.match(el.innerHTML, /aria-label="Simbolurile tale"/); assert.doesNotMatch(el.innerHTML, /aria-label="Trading 212"/); assert.match(el.innerHTML, /WKL\.AS: \+2,8%/);
});
test('alerts în două: „Toate, cu grilele” și filtrul pe simbol', () => {
  const poza = Object.assign(POZA_BAZA(), { alerte: ALERTE });
  RadarEcran.filtre.det = { tot: true, sim: null, mai: false };
  assert.match(RadarEcran.panouAlerte(poza, 'det', RadarEcran.filtre.det), /grilă atinsă/);
  RadarEcran.filtre.det = { tot: true, sim: 'APLD', mai: false };
  const h = RadarEcran.panouAlerte(poza, 'det', RadarEcran.filtre.det);
  assert.match(h, /APLD: −15%/); assert.doesNotMatch(h, /grilă atinsă/);
  RadarEcran.filtre.det = { tot: false, sim: null, mai: false };
});
test('alerts în două: poza fără „alerte” (colector vechi) NU spune „nicio alertă azi”', () => {
  const h = RadarEcran.panouAlerte(POZA_BAZA(), 'det', { tot: false, sim: null, mai: false });
  assert.match(h, /vin cu colectorul nou \(v101\.86\)/); assert.doesNotMatch(h, /Nicio alertă azi/);
});
```

- [ ] **Step 2: Rulez și văd că pică.** Run: `cd C:/Users/Cimin/premarket_scanner && node --test tools/radar-ecran.test.mjs`. Expected: PICA pe cele 3 probe noi (`panouAlerte` nu e funcție, `filtre` e undefined).

- [ ] **Step 3: Scriu codul** (în `radar-ecran.js`, înainte de `function cap(o)`)

```js
  // v144 (el, 07.10: „pagina alerts să fie în două”): panoul „Alertele de azi” pe fiecare filă, din poza.alerte (colector v101.86)
  var NIVT = { critic: 'URGENT', atentie: 'ATENȚIE', info: 'INFO' }, SRCT = { t212: 'T212', bot: 'bot', salt: 'Salt', piata: 'piața', urm: 'urmărit' };
  var filtre = { det: { tot: false, sim: null, mai: false }, urm: { tot: false, sim: null, mai: false } };
  function grupeazaAlerte(alerte, grup) {
    var toate = (alerte || []).filter(function (a) { return a && a.grup === grup; }), imp = toate.filter(function (a) { return !a.zgomot; }), peSim = {};
    imp.forEach(function (a) { if (!a.sim) return; var x = peSim[a.sim] = peSim[a.sim] || { n: 0, crit: 0 }; x.n++; if (a.nivel === 'critic') x.crit++; });
    return { toate: toate, imp: imp, peSim: peSim };
  }
  function oraAl(t) { return nr(t) === null ? '' : new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }).format(new Date(t)); }
  function liAlerta(a) {
    var fapt = [], fa = '', niv = NIVT[a.nivel] ? a.nivel : 'info';
    String(a.mesaj || '').split('\n').forEach(function (r) { r = r.trim(); if (!r) return; if (/^👉/.test(r)) fa = r; else fapt.push(r); });
    return '<li class="' + niv + '"><span class="dunga"></span><span class="ora num">' + oraAl(a.t) + '</span><span class="nv"><span class="niv ' + niv + '">' + NIVT[niv] + '</span></span>'
      + '<div class="tx"><b>' + esc(a.titlu) + '<span class="src">' + (SRCT[a.src] || '') + '</span></b>' + (fapt.length ? '<div class="m">' + esc(fapt.join(' ')) + '</div>' : '') + (fa ? '<div class="fa">' + esc(fa) + '</div>' : '') + '</div></li>';
  }
  function panouAlerte(poza, grup, f) {
    f = f || filtre[grup];
    var h = '<section class="panou alNou" aria-label="Alertele de azi"><div class="panouCap"><h3>🔔 Alertele de azi</h3>';
    if (!poza || !Array.isArray(poza.alerte)) return h + '</div><p class="golAl">Alertele de azi vin cu colectorul nou (v101.86). Până atunci le vezi pe Discord și în Radar.</p></section>';
    var g = grupeazaAlerte(poza.alerte, grup), l = f.tot ? g.toate : g.imp, sims = Object.keys(g.peSim);
    if (f.sim) l = l.filter(function (a) { return a.sim === f.sim; });
    var arata = f.mai ? l : l.slice(0, 6), rest = l.length - arata.length;
    h += '<div class="filtre" role="group" aria-label="Ce alerte arăt"><button type="button" data-alg="' + grup + '" data-alf="imp" aria-pressed="' + !f.tot + '">Importante · ' + g.imp.length + '</button>'
      + (g.toate.length > g.imp.length ? '<button type="button" data-alg="' + grup + '" data-alf="tot" aria-pressed="' + !!f.tot + '">Toate, cu grilele · ' + g.toate.length + '</button>' : '') + '</div></div>';
    if (sims.length > 1) h += '<div class="peSim filtre"><span class="et">Pe simbol</span>' + sims.map(function (x) { return '<button type="button" class="' + (g.peSim[x].crit ? 'crit' : '') + '" data-alg="' + grup + '" data-als="' + esc(x) + '" aria-pressed="' + (f.sim === x) + '">' + esc(x) + ' · ' + g.peSim[x].n + '</button>'; }).join('') + '</div>';
    if (!l.length) h += '<p class="golAl">' + (grup === 'urm' ? 'Nicio alertă azi la simbolurile urmărite.' : 'Nicio alertă azi.') + '</p>';
    else h += '<ul class="al">' + arata.map(liAlerta).join('') + '</ul>' + (rest > 0 ? '<button type="button" class="mai" data-alg="' + grup + '" data-alf="mai">Arată încă ' + rest + '</button>' : '');
    if (grup === 'urm') h += '<div class="reguli"><div class="regula"><b>Mișcare neobișnuită</b>Azi s-a mișcat peste 2× cât se mișcă de obicei (media pe 14 zile). O dată pe zi.</div><div class="regula"><b>Cumpără un insider</b>O cumpărare nouă cu bani, din ultimele 30 de zile. Acțiunile primite gratis nu contează.</div></div>';
    return h + '</section>';
  }
```

În `randeaza`, rândul `var h = cap(o) + …` devine:

```js
    var fila = o.fila === 'urm' ? 'urm' : 'det';
    var h = cap(o) + (fila === 'det' ? sumar(poza, o, st) + panouAlerte(poza, 'det') + panouT212(poza, o) + panouBoti(poza, o) + panouSalt(poza, o) : panouAlerte(poza, 'urm') + panouSimboluri(lista, o, st));
```

`panouSalt` vine la Task 6. Până atunci scriu temporar `function panouSalt() { return ''; }`, iar Task 6 îl înlocuiește.

În `leaga`, primul lucru în ascultătorul de clic:

```js
      var al = t.closest && t.closest('[data-alg]');
      if (al) { var g = al.getAttribute('data-alg'), ff = filtre[g], k = al.getAttribute('data-alf'), sx = al.getAttribute('data-als');
        if (k === 'imp') ff.tot = false; else if (k === 'tot') ff.tot = true; else if (k === 'mai') ff.mai = true; else if (sx) { ff.sim = ff.sim === sx ? null : sx; ff.mai = false; }
        if (typeof CustomEvent !== 'undefined') el.dispatchEvent(new CustomEvent('radar:refa', { bubbles: false })); return; }
```

Exporturile primesc în plus: `grupeazaAlerte: grupeazaAlerte, panouAlerte: panouAlerte, filtre: filtre`.

CSS: copiez blocul „NOU: panoul Alertele de azi” din `scratchpad/demo-alerts-doua/sablon2.html` în `lib/radar-ui.css`, înlocuind `.rad ` cu `body.al-page .rad `. Fără regulile `.reguli .regula.prop`: propunerea nu intră.

- [ ] **Step 4: Rulez și văd că trece.** Run: `node --test tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs`. Expected: toate trec, și cele vechi, fiindcă `fila` implicită e „det”.

⚠️ Probele vechi care caută `Simbolurile tale` în HTML fără `fila` vor pica: simbolurile sunt acum doar pe fila „urm”. Le dau `fila: 'urm'` acolo unde verifică simbolurile. Aserțiunea rămâne aceeași, nu o slăbesc.

---

### Task 6: Pagina — Salt Bank: rânduri, SL/TP, formular (`radar-ecran.js` + `radar-poza.js`)

**Files:**
- Modify: `premarket_scanner/lib/radar-ecran.js` (`panouSalt`, `randSalt`, iar formularul trimite `radar:salt`)
- Modify: `premarket_scanner/lib/radar-poza.js` (`saltCerere`, `saltInAsteptare`)
- Modify: `premarket_scanner/lib/radar-ui.css` (blocul Salt din `sablon2.html`)
- Test: `premarket_scanner/tools/radar-ecran.test.mjs`

**Interfaces:**
- **Consumes:** `poza.salt.randuri` și `poza.saltCereri` (Task 2/3); rutele `POST /salt-cereri` (Task 4); `sltpT212`, `baraSLTP`, `pill`, `spark` (existente).
- **Produces:**
  - `RadarEcran.randSalt(r) -> html`, cu două rânduri, `tr.rand` + `tr.det`;
  - `RadarEcran.panouSalt(poza, o) -> html`, unde `o.saltAsteptare = [{id, simbol, op}]`;
  - evenimentul `radar:salt` pe `#rad`, cu `detail {op, simbol, qty, pretMediu, moneda}`, și `radar:salt-scoate` cu `detail {isin, simbol}`;
  - `RadarPoza.saltCerere(c) -> Promise<{ok, id?, eroare?}>`;
  - `RadarPoza.saltInAsteptare() -> [{id, simbol, op, la}]`, din localStorage, cheia `radar_salt_astept`.

- [ ] **Step 1: Probele care pică**

```js
const SALT_RHM = { isin: 'DE0007030009', simbol: 'RHM.DE', nume: 'Rheinmetall', qty: 1.0456, pretMediu: 1349.6, plata: 'EUR', de: '2026-05-11', moneda: 'EUR', pret: 937.4, prev: 953, closes30: [1050, 937.4],
  val: 980.2, cost: 1411.1, rez: -430.94, niv: 'iesi', motive: ['sub stopul care urcă'], sfat: 'Aș ieși', sugestie: { stop: 1109.08, tinta: 1436.49 }, max: 1304.8, mediuSimbol: 1349.6 };
test('Salt: rândul are pastila, SUGERAT, rezultatul în EUR cu o zecimală, bara SL/TP cu SUB STOP, plătit în EUR', () => {
  const h = RadarEcran.randSalt(SALT_RHM);
  assert.match(h, /pill iesi/); assert.match(h, /SUGERAT/); assert.match(h, /−430,9 €/); assert.match(h, /SL <b>€1109,08<\/b>/); assert.match(h, /SUB STOP/); assert.match(h, /class="platit">EUR/);
});
test('Salt: NFLX plătit în EUR, acțiune în USD - prețul în $, rezultatul în €, „acțiune în USD”', () => {
  const h = RadarEcran.randSalt(Object.assign({}, SALT_RHM, { simbol: 'NFLX', moneda: 'USD', pret: 68.69, prev: 67.5, sugestie: { stop: 80.49, tinta: 100.08 }, rez: -265.7 }));
  assert.match(h, /\$68,69/); assert.match(h, /−265,7 €/); assert.match(h, /acțiune în USD/);
});
test('Salt: fără prețuri ⇒ „fără prețuri”; poza fără „salt” ⇒ „vin cu poza următoare”, formularul rămâne', () => {
  assert.match(RadarEcran.randSalt({ isin: 'X', simbol: 'ABC', qty: 1, pretMediu: 2, plata: 'EUR', pret: null, motivFara: 'bare' }), /fără prețuri/);
  const h = RadarEcran.panouSalt(POZA_BAZA(), { cheie: true });
  assert.match(h, /Pozițiile Salt vin cu poza următoare/); assert.match(h, /id="spForm"/);
});
test('Salt: cererile în așteptare și răspunsul colectorului se văd sub formular', () => {
  const poza = Object.assign(POZA_BAZA(), { salt: { la: ACUM, randuri: [SALT_RHM] }, saltCereri: [{ id: 'z9', stare: 'respins', motiv: 'RHM.DE se tranzacționează în EUR, nu în USD: scrie prețul în EUR' }] });
  const h = RadarEcran.panouSalt(poza, { cheie: true, saltAsteptare: [{ id: 'a1', simbol: 'NFLX', op: 'pune' }, { id: 'z9', simbol: 'RHM.DE', op: 'pune' }] });
  assert.match(h, /NFLX.*în așteptare/); assert.match(h, /respinsă: RHM\.DE se tranzacționează în EUR/);
});
```

- [ ] **Step 2: Rulez și văd că pică.** Run: `node --test tools/radar-ecran.test.mjs`. Expected: PICA, pentru că `randSalt` nu e funcție.

- [ ] **Step 3: Scriu codul** (în `radar-ecran.js`, înlocuind `panouSalt` temporar)

```js
  // v144 (el, 07.10: „la dețineri să pot adăuga și manual cu preț în euro și USD” + „fă și la Salt sugestia de SL și TP la fel ca la restul”):
  // rândurile Salt din poza.salt (colector v101.86, aceeași analiză ca pagina Salt din Radar), în forma rândurilor T212
  function euro1(v) { return nr(v) === null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',') + ' €'; }
  function randSalt(r) {
    var m = r.moneda === 'EUR' ? '€' : '$', fara = nr(r.pret) === null, zi = !fara && nr(r.prev) ? r.pret / r.prev - 1 : null;
    var l30 = !fara && r.closes30 && r.closes30.length > 1 ? r.pret / r.closes30[0] - 1 : null, sx = r.sugestie ? sltpT212({ sugestie: r.sugestie, mediu: r.mediuSimbol }) : null;
    var pm = r.plata === 'EUR' ? '€' : m;
    return '<tr class="rand" tabindex="0" aria-expanded="false" data-s="' + esc(r.simbol) + '">'
      + '<td><div class="sim">' + pill(r.niv) + '<div><b>' + esc(r.simbol) + '</b> ' + (sx ? '<span class="slEt sug">SUGERAT</span>' : '') + '<span class="mic">' + (+Number(r.qty).toFixed(4)) + ' buc · mediu ' + bani(r.pretMediu, pm) + (r.nume ? ' · ' + esc(r.nume) : '') + '</span></div></div></td>'
      + '<td class="c-acum">' + (fara ? '<span class="mic">fără prețuri</span>' : bani(r.pret, m) + (zi === null ? '<span class="mic">—</span>' : '<b class="d24 ' + cls(zi) + '">' + (zi >= 0 ? '▲ ' : '▼ ') + pct(zi) + '</b>') + '<span class="mic">ultima zi</span>') + '</td>'
      + '<td class="c-spark"><span class="sp">' + spark(r.closes30) + '</span><span class="spTxt">' + (l30 === null ? 'fără istoric' : pct(l30) + ' pe 30 z') + '</span></td>'
      + '<td class="c-rez"><b class="' + cls(r.rez) + '">' + euro1(r.rez) + '</b><span class="mic">' + (nr(r.cost) ? pct(r.val / r.cost - 1) + ' în EUR' : '') + '</span></td>'
      + '<td class="c-sltp" data-et="SL / TP">' + (sx && !fara ? baraSLTP(sx, r.pret, m) : '<span class="plan">fără sugestie încă</span><span class="mic">vine cu tura colectorului (15 min)</span>') + '</td>'
      + '<td><span class="platit">' + (r.plata === 'EUR' ? 'EUR' : 'USD') + '</span>' + (r.plata === 'EUR' && r.moneda && r.moneda !== 'EUR' ? '<span class="mic">acțiune în ' + esc(r.moneda) + '</span>' : '') + '</td>'
      + '<td><span class="chev">›</span></td></tr>'
      + '<tr class="det" hidden><td colspan="7"><div class="detGrila"><div><h4>Ce spune pagina Salt</h4>' + (r.motive && r.motive.length ? '<ul class="motive">' + r.motive.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="sub" style="margin:0">' + (fara ? 'Yahoo n-a dat prețuri (' + esc(r.motivFara || '') + ').' : 'nimic de semnalat') + '</p>') + (r.sfat ? '<p class="fac">👉 ' + esc(r.sfat) + '</p>' : '') + '</div>'
      + '<div><div class="kv"><span>Cumpărat</span><b>' + esc(r.de || '—') + '</b><span>Valoarea acum</span><b>' + (nr(r.val) === null ? '—' : r.val.toFixed(1).replace('.', ',') + ' €') + '</b><span>Cost</span><b>' + (nr(r.cost) === null ? '—' : r.cost.toFixed(1).replace('.', ',') + ' €') + '</b>' + (r.max ? '<span>Maximul de după cumpărare</span><b>' + bani(r.max, m) + '</b>' : '') + '</div>'
      + '<div class="detBtns"><button type="button" class="btnLinie" data-fac="salt-editeaza" data-s="' + esc(r.simbol) + '">Editează</button><button type="button" class="btnLinie rau" data-fac="salt-scoate" data-s="' + esc(r.isin) + '">Scoate</button></div></div></div></td></tr>';
  }
  function panouSalt(poza, o) {
    o = o || {}; var s = poza && poza.salt, l = s && Array.isArray(s.randuri) ? s.randuri : null, rez = 0;
    (l || []).forEach(function (r) { if (nr(r.rez) !== null) rez += r.rez; });
    var cereri = {}; (poza && poza.saltCereri || []).forEach(function (c) { cereri[c.id] = c; });
    var ast = (o.saltAsteptare || []).map(function (c) { var r = cereri[c.id]; return '<li>' + esc(c.simbol) + ' · ' + (c.op === 'scoate' ? 'scoatere' : 'adăugare') + ': ' + (r ? (r.stare === 'ok' ? '<b class="good">' + esc(r.motiv) + '</b>' : '<b class="bad">respinsă: ' + esc(r.motiv) + '</b>') : 'în așteptare · o pune colectorul la poza următoare (noaptea, după 08:00)') + '</li>'; }).join('');
    var h = '<section class="panou" aria-label="Salt Bank"><div class="panouCap"><h3>🧂 Salt Bank' + (l ? ' · ' + l.length + ' poziți' + (l.length === 1 ? 'e' : 'i') : '') + '</h3><span class="sub">scrise de tine · aceeași listă ca pagina Salt din Radar' + (l && l.length ? ' · pe ansamblu <b class="' + cls(rez) + '">' + euro1(rez) + '</b>' : '') + '</span></div>'
      + '<form class="adPoz" id="spForm" autocomplete="off"><label>Simbol sau ISIN<input id="spSim" placeholder="NFLX / DE0007030009" maxlength="20" required></label><label>Bucăți<input id="spQty" inputmode="decimal" placeholder="14,43" required></label><label>Prețul tău mediu<input id="spPret" inputmode="decimal" placeholder="79,84" required></label>'
      + '<label>Plătit în<span class="moneda" role="group" aria-label="Moneda prețului"><button type="button" data-moneda="EUR" aria-pressed="' + (o.saltMoneda !== 'USD') + '">€ EUR</button><button type="button" data-moneda="USD" aria-pressed="' + (o.saltMoneda === 'USD') + '">$ USD</button></span></label>'
      + '<button type="submit" class="btn">Adaugă poziția</button><span class="adNota">Prețul îl scrii în moneda în care ai plătit. La o acțiune americană plătită în euro, Radarul o socotește în euro, la cursul din ziua cumpărării.</span>' + (ast ? '<ul class="adNota tx">' + ast + '</ul>' : '') + '</form>';
    if (!l) return h + '<div class="pliat">Pozițiile Salt vin cu poza următoare (colector v101.86).</div></section>';
    if (!l.length) return h + '<div class="gol">Nicio poziție Salt. Adaug-o mai sus sau pe pagina Salt din Radar.</div></section>';
    return h + '<div style="overflow-x:auto"><table class="poz num"><thead><tr><th>Acțiune</th><th>Acum</th><th class="c-spark">30 de zile</th><th>Rezultat</th><th>SL ← acum → TP</th><th>Plătit în</th><th></th></tr></thead><tbody id="radSalt">' + l.map(randSalt).join('') + '</tbody></table></div></section>';
  }
```

În `leaga`, tot în ascultătorul de clic, după blocul `data-alg`:

```js
      var mo = t.closest && t.closest('[data-moneda]');
      if (mo) { mo.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === mo)); }); return; }
```

În ascultătorul `submit`, înainte de `if (!f || f.id !== 'radCheieForm') return;`:

```js
      if (f && f.id === 'spForm') { e.preventDefault(); var q = function (id) { var i = el.querySelector('#' + id); return i ? i.value.trim() : ''; }, numar = function (v) { return parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); };
        var mb = el.querySelector('.moneda [aria-pressed="true"]');
        el.dispatchEvent(new CustomEvent('radar:salt', { detail: { op: 'pune', simbol: q('spSim').toUpperCase(), qty: numar(q('spQty')), pretMediu: numar(q('spPret')), moneda: mb ? mb.getAttribute('data-moneda') : 'EUR' } })); return; }
```

Butoanele `data-fac="salt-scoate"` și `salt-editeaza` trec prin calea `data-fac` existentă și ies ca `radar:salt-scoate` / `radar:salt-editeaza`, cu `detail {s}`. Exporturile primesc `randSalt: randSalt, panouSalt: panouSalt`.

În `radar-poza.js`:

```js
  var K_SALT = 'radar_salt_astept';
  function saltInAsteptare() { try { return JSON.parse(ls(K_SALT) || '[]'); } catch (e) { return []; } }
  // v144: cererile Salt de pe pagina alerts - worker /salt-cereri; rămân „în așteptare” până le confirmă poza (saltCereri), cel mult 2 zile
  async function saltCerere(c) {
    if (proba()) return { ok: true, id: 'proba' };
    if (!cheie()) return { ok: false, eroare: 'pune întâi cheia de citire' };
    try {
      var r = await fetch(url() + '/salt-cereri', { method: 'POST', headers: { authorization: 'Bearer ' + cheie(), 'content-type': 'application/json' }, body: JSON.stringify(c) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) return { ok: false, eroare: (j && j.error) || 'worker: HTTP ' + r.status };
      var l = saltInAsteptare().filter(function (x) { return Date.now() - x.la < 2 * 86400000; }); l.push({ id: j.id, simbol: c.simbol || c.isin, op: c.op, la: Date.now() }); ls(K_SALT, JSON.stringify(l.slice(-20)));
      return { ok: true, id: j.id };
    } catch (e) { return { ok: false, eroare: 'worker-ul nu răspunde (' + (e && e.message || e) + ')' }; }
  }
```

Exporturile din `return { … }` primesc `saltCerere: saltCerere, saltInAsteptare: saltInAsteptare`. CSS-ul: blocul „Salt Bank” din `sablon2.html`, cu prefixul `body.al-page .rad`.

- [ ] **Step 4: Rulez și văd că trece.** Run: `node --test tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs`. Expected: toate trec.

---

### Task 7: `alerts/index.html` — filele, legăturile, versiunile, proba de ecran

**Files:**
- Modify: `premarket_scanner/alerts/index.html` (butoanele filelor ~l.830, `applyDeskTab` ~l.2126, `radRandeaza` ~l.3676, ascultătorii `#rad` ~l.3719, `verBadge` v143→v144, parametrii `?v=` ai `radar-*.js|css`)
- Modify: `premarket_scanner/sw-app.js:2` (`CACHE_VERSION = 'tt-v855-2026-10-07'`)
- Test: `premarket_scanner/tools/alerts-radar.test.mjs` (proba legăturilor) + proba de ecran cu poza reală

- [ ] **Step 1: Proba care pică** (în `tools/alerts-radar.test.mjs`)

```js
test('alerts v144: filele „Ce dețin” / „Ce urmăresc” în locul lui „Preț”, fila ajunge în randeaza, cererile Salt legate', () => {
  const h = src('alerts/index.html');
  assert.match(h, /data-tab="det"[^>]*>💼 Ce dețin/); assert.match(h, /data-tab="urm"[^>]*>👀 Ce urmăresc/); assert.doesNotMatch(h, /data-tab="price"/);
  assert.match(h, /fila: radFila\(\)/); assert.match(h, /addEventListener\('radar:salt'/); assert.match(h, /addEventListener\('radar:salt-scoate'/); assert.match(h, /addEventListener\('radar:refa'/);
  assert.match(h, /id="verBadge">v144</);
  assert.match(src('sw-app.js'), /CACHE_VERSION = 'tt-v855-2026-10-07'/);
});
```

(Dacă `src` nu există în fișierul ăsta, îl iau din `radar-ecran.test.mjs`, aceeași definiție, cu CRLF→LF.)

- [ ] **Step 2: Rulez și văd că pică.** Run: `node --test tools/alerts-radar.test.mjs`. Expected: PICA pe `data-tab="det"`.

- [ ] **Step 3: Schimb pagina**

(a) Butoanele:
```html
    <button type="button" data-tab="det" class="on">💼 Ce dețin <span class="tab-cnt" id="tabCntDet">0</span></button>
    <button type="button" data-tab="urm">👀 Ce urmăresc <span class="tab-cnt" id="tabCntUrm">0</span></button>
```
Dacă `tabCntPrice` e folosit în cod (`grep -n tabCntPrice`), îl înlocuiesc. `tabCntDet` / `tabCntUrm` arată numărul alertelor importante de azi și primesc clasa `crit` când e una urgentă (setat în `radRandeaza`).

(b) `applyDeskTab`:
```js
function applyDeskTab(tab) {
  if (tab === 'price') tab = 'det';   // v144: fila veche ținută minte
  desk = deskSave({ tab: tab || 'det' });
  const t = desk.tab, tabsEl = $('deskTabs');
  const tp = $('tabPrice'), tn = $('tabNews'), th = $('tabHist');
  if (tp) tp.hidden = t !== 'det' && t !== 'urm';
  if (tn) tn.hidden = t !== 'news';
  if (th) th.hidden = t !== 'hist';
  if (tabsEl) tabsEl.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('on', btn.getAttribute('data-tab') === t));
  if (t === 'det' || t === 'urm') radRandeaza();
}
```
Plus `applyDeskChrome`: `applyDeskTab(desk.tab || 'det')`. Și `function radFila() { return desk && desk.tab === 'urm' ? 'urm' : 'det'; }`, pus lângă `radSimboluri`. Toate celelalte locuri care compară `desk.tab === 'price'` (`grep -n "'price'"`) devin `(desk.tab === 'det' || desk.tab === 'urm')`.

(c) În `radRandeaza`, obiectul dat lui `RadarEcran.randeaza` primește `fila: radFila(), saltAsteptare: RadarPoza.saltInAsteptare(), saltMoneda: _radSaltMoneda`. Formularul `#addForm` intră în slot doar pe fila „urm”, altfel stă în `#radPastrator` (cum e deja). Contoarele filelor se pun cu `RadarEcran.grupeazaAlerte((p && p.alerte) || [], 'det').imp.length`, la fel pentru „urm”. Dacă vreuna are `nivel === 'critic'`, primește `classList.add('crit')`.

(d) Ascultătorii:
```js
  $('rad').addEventListener('radar:refa', () => radRandeaza());
  $('rad').addEventListener('radar:salt', async e => { const d = e.detail || {}; if (!d.simbol || !(d.qty > 0) || !(d.pretMediu > 0)) { toast('Scrie simbolul, bucățile și prețul mediu (mai mari ca zero)', 'warn'); return; }
    const r = await RadarPoza.saltCerere(d); toast(r.ok ? `🧂 ${d.simbol}: cererea a plecat · o pune colectorul la poza următoare` : `🧂 ${d.simbol}: ${r.eroare}`, r.ok ? 'info' : 'warn'); radRandeaza(); });
  $('rad').addEventListener('radar:salt-scoate', async e => { const isin = e.detail.s; if (!isin || !confirm('Scot poziția din lista Salt? (și de pe pagina Salt din Radar)')) return; const r = await RadarPoza.saltCerere({ op: 'scoate', isin }); toast(r.ok ? '🧂 Cererea de scoatere a plecat' : '🧂 ' + r.eroare, r.ok ? 'info' : 'warn'); radRandeaza(); });
  $('rad').addEventListener('radar:salt-editeaza', e => { const p = (_radUltima && _radUltima.poza) || RadarPoza.cache(), r = ((p && p.salt && p.salt.randuri) || []).find(x => x.simbol === e.detail.s); if (!r) return;
    $('spSim').value = r.isin; $('spQty').value = String(r.qty).replace('.', ','); $('spPret').value = String(r.pretMediu).replace('.', ','); $('spSim').focus(); });
```
`var _radSaltMoneda = 'EUR';` se declară lângă `_radUltima`. Garda „scrie în formular: nu-i luăm focusul” din `radRandeaza` se extinde la `#spForm` (`const sf = $('spForm'); if (sf && document.activeElement && sf.contains(document.activeElement)) return;`).

(e) Versiunile: `verBadge` devine `v144`. `?v=854` devine `?v=855` la `radar-ui.css`, `radar-poza.js` și `radar-ecran.js`. `sw-app.js` primește `CACHE_VERSION = 'tt-v855-2026-10-07'`. Verific și cârligul de auto-bump (pwa.md §1): citesc valoarea înainte de commit.

- [ ] **Step 4: Rulez probele paginii.** Run: `node --test tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs tools/radar-poza-ore.test.mjs tools/radar-bot-24h.test.mjs`. Expected: toate trec.

- [ ] **Step 5: Proba de ecran cu poza REALĂ**

Copiez poza reală din KV (`wrangler kv key get poza …`, ca la demo) în `scratchpad`. Îi adaug manual câmpurile `alerte` (din `alerte2.json`, trecute prin `alertePentruPoza`, cu un mic `node -e` ce importă `scripts/lib/alerte-zi.mjs`) și `salt` (din `salt-sltp.json` + `salt-cot.json`, în forma rândului din Task 2). Apoi rulez `tools/proba-ecran-alerts.mjs` cu fixture-ul ăsta (variabila de mediu sau argumentul pe care îl acceptă: citesc antetul scriptului). Fac pozele la 1920 și la 390 (iframe), pe ambele file, și le pun LÂNGĂ pozele demo-ului v3. Ce diferă de demo, repar înainte de commit. La final șterg profilul Chrome.

- [ ] **Step 6: Commit + push (premarket)**

```bash
cd C:/Users/Cimin/premarket_scanner && node --test tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs tools/radar-poza-ore.test.mjs tools/radar-bot-24h.test.mjs && git add lib/radar-ecran.js lib/radar-poza.js lib/radar-ui.css alerts/index.html sw-app.js tools/radar-ecran.test.mjs tools/alerts-radar.test.mjs && git commit -F <msg-t7.txt> && git push origin HEAD
```

---

### Task 8: Pe viu — colectorul repornit, poza nouă, pagina publicată

- [ ] **Step 1: Repornesc colectorul.** Detașat, ca pe 05.10. Găsesc PID-ul din `data/colector.pid` și lansatorul cu care rulează (`grep -n colector PORNESTE-*.bat`). Opresc DOAR procesul colectorului și îl pornesc la loc la fel, cu jurnalul în `data/colector.log`. Verific că A PORNIT: PID nou, iar în jurnal apare `poza: urcata` cu versiunea v101.86. ⚠️ Lansatoarele RULEAZĂ ⇒ fără `git pull` în `crypto`.

- [ ] **Step 2: Poza nouă din KV.** Rulez `wrangler kv key get poza`, apoi, cu `python`, verific:
  - `versiune == "v101.86"`;
  - `alerte` e o listă nevidă (în timpul zilei), cu `grup` det/urm;
  - `salt.randuri` are RHM.DE și NFLX, cu `sugestie.stop` egal (±0,01) cu SL-ul de pe pagina Salt din Radar, adică ce dă `Salt.analizeaza` pe aceleași bare;
  - `saltCereri` e `[]`.

- [ ] **Step 3: Pagina publicată.** GitHub Pages servește `tt-v855`. Verific `curl -s https://mferent80-source.github.io/premarket_scanner.html/sw-app.js | head -3` (calea exactă o iau din `git remote -v` / memorie). Nu pot deschide pagina cu cheia lui, așa că proba de ecran de la Task 7 Step 5 e dovada vizuală. Lui îi spun ce să vadă: filele, alertele de azi, Salt cu SL/TP.

- [ ] **Step 4: Memoria + raportul.** Scriu în `project_alerts_in_doua_07_10.md` hash-urile, PID-ul și ce a ieșit, actualizez `MEMORY.md` și pun pozele lângă demo în raport.
