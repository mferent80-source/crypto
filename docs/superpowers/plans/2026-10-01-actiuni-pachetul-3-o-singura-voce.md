# Acțiunile T212 — Pachetul 3: o singură voce pe poziție — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** pe fiecare poziție T212 un singur verdict — același pe pagina T212, pe pagina alerts și pe Discord — cu „ce aș face eu” în bani, cel mult 3 motive (siguranța întâi, apoi după banii măsurați pe pozițiile lui), „de ce s-a schimbat” și „am făcut / n-am făcut”.

**Architecture:** `ActiuniSemnale.semafor` întoarce în plus `componente [{cod, nivel, motiv}]` (aditiv). `Consiliu.alcatuiesteActiune(x)` adună semaforul, nivelurile (stopul care urcă), probabilitățile (pachetul 2), planul și sfaturile Consilierului acțiunilor într-un verdict de forma Consilierului boților; sortarea motivelor e scoasă într-o funcție comună (`ordoneaza`) folosită de amândouă. Socoteala pe motiv și lei: jurnalul verdictelor pe poziție (KV `semnale-act:<TICKER>`), judecat la 5 zile de bursă pe preț × bucăți × curs → KV `socoteala-actiuni`. Colectorul: Consilierul în poză (forma semaforului, pagina alerts neschimbată), KV `cons:t212-<TICKER>`, alerta la schimbare (`Consiliu.schimbare`, cu regulile anti-dublură); pagina T212: blocul Consilierului în detaliul poziției + decizii judecate la 5 zile.

**Tech Stack:** module IIFE în `public/lib`, colectorul Node, Pages Functions + KV local, probe Node.

**Spec:** `docs/superpowers/specs/2026-10-01-actiuni-t212-creier-design.md` — „Pachetul 3”.

## Global Constraints
- O singură voce: pagina T212, poza (pagina alerts) și Discord iau verdictul din `Consiliu.alcatuiesteActiune` — aceeași funcție, aceleași intrări (spec).
- Siguranța nu se negociază: stopul din planul lui, „−X% de la maxim” din plan și stopul care urcă atins rămân primele; restul de același nivel după banii PE CAZ, doar de la 10 cazuri cu bani (ca la crypto, revizia I4 din 01.10).
- Nimic nu se pierde: tot ce spun azi semaforul și sfaturile Consilierului acțiunilor ajunge într-un motiv sau în „Restul” (pliat).
- Discord: alerta Consilierului la schimbare confirmată 2 ture; doar în Radar când motivul de sus are deja alerta planului activă azi (stop / trail / țintă), când revine la ȚINE sau același nivel < 2 h.
- Banii în lei (cursul din cost / bucăți × preț mediu) și dolari; doar long.
- Crypto neschimbat: probele `v10045…v10053` verzi; `alcatuieste` (boți) dă aceleași motive și aceeași ordine.
- Versiuni: `v100.54 · O SINGURĂ VOCE PE ACȚIUNI` (BUILD_INFO, package.json `100.54.0`, index.html ×4, sw.js `crypto-radar-v100-54`, `functions/_shared/versiune.js`), colector `v101.33`; proba `scripts/proba-v10054.mjs` în `npm test`.

## Review Focus
1. Poziție fără prețuri zilnice (semaforul „fara-date”) ⇒ Consilierul „⏳ socotesc”, fără alertă, poza cu `niv` null (ca azi).
2. Plan cu stopul atins ȘI trend în jos ⇒ un singur motiv de IEȘI în vârf (planul), nu două mesaje pe Discord (alerta planului + Consilierul).
3. Poziție vândută între două ture ⇒ starea `_cons` a tickerului nu mai alertează (nu „din ATENȚIE în …” pe o poziție închisă).
4. Bani: poziție fără `costLei` (istoric incomplet) ⇒ banii doar în dolari, fără lei inventați.
5. Decizia pe o poziție vândută înainte de 5 zile ⇒ se judecă pe prețul de la 5 zile oricum (prețul acțiunii, nu ce a făcut el), spus.

---

### Task 1: `Consiliu.alcatuiesteActiune` + componentele semaforului + sortarea comună

**Files:**
- Modify: `public/lib/actiuni-semnale.js` (`semafor` → `componente`), `public/lib/consiliu.js` (`ordoneaza`, `alcatuiesteActiune`, `pentruPozaActiune`)
- Create: `scripts/proba-v10054.mjs`; Modify: `package.json`

**Interfaces:**
- Produces: `ActiuniSemnale.semafor(p, st).componente = [{cod: "stop-plan"|"trail-plan"|"tinta-plan"|"trend-jos-minus"|"trend-jos"|"miscare-jos"|"fara-plan-minus"|"trend-sus", nivel: "iesi"|"atentie"|"bine", motiv}]`. `Consiliu.alcatuiesteActiune({sem, niv, prob: [randActiune], sfaturi: [sfaturiPozitie], plan, pret, pretMediu, qty, costLei, simbol, socoteala})` → `{nivel, eticheta, titlu, faCe, bani, motive:[{cod, c, titlu, text, cip}], rest}`. `Consiliu.pentruPozaActiune(c)` → `{nivel: "tine"|"atentie"|"iesi"|"fara-date", motive: [titluri], ceAsFace}` (forma semaforului acțiunilor). `Consiliu.ordoneaza(cand, soc, FIX)` — sortarea comună.

- [ ] **Step 1: testele (picând)**
```js
const poz = (o) => ({ ticker: "INTC_US_EQ", simbol: "INTC", qty: 10, pretMediu: 20, pret: 18, costLei: 900, plan: null, maxDupaCumparare: 22, ...o });
const stJos = { trend: { dir: "jos", motive: ["EMA20 sub EMA50"] }, miscare: { mare: false } };
await test("semaforul are componentele cu cod (aditiv): stopul planului si trendul in jos", () => {
  const s = AS.semafor(poz({ plan: { stop: 18.5 } }), stJos);
  assert.deepEqual(s.componente.map((c) => c.cod), ["stop-plan", "trend-jos"]); assert.equal(s.nivel, "iesi"); assert.ok(Array.isArray(s.motive));
});
await test("alcatuiesteActiune: siguranta intai, un singur IESI in varf, banii pana la stop in lei si dolari, sfaturile in motive sau in rest", () => {
  const p = poz({ plan: { stop: 18.5 } }), sem = AS.semafor(p, stJos), niv = { stopPozitie: 18.7, trailPct: 15, stopAtins: true, sursaTrail: "−15% de la maxim" };
  const sf = [{ nivel: "g", sursa: "istoric", titlu: "Istoricul tău pe INTC: 33 trade-uri", text: "", ceAsFace: "N-aș adăuga." }, { nivel: "n", sursa: "piata", titlu: "Piața întreagă e în jos", text: "", ceAsFace: null }];
  const c = CS.alcatuiesteActiune({ sem, niv, sfaturi: sf, plan: p.plan, pret: 18, pretMediu: 20, qty: 10, costLei: 900, simbol: "INTC" });
  assert.equal(c.nivel, "iesi"); assert.equal(c.motive[0].cod, "stop-plan"); assert.match(c.faCe, /ies/i);
  assert.match(c.bani, /\$/); assert.match(c.bani, /lei/);
  assert.ok(c.rest.some((r) => /Piața întreagă/.test(r.titlu)) || c.motive.some((m) => /Piața/.test(m.titlu)), "nimic nu se pierde");
  const pp = CS.pentruPozaActiune(c); assert.equal(pp.nivel, "iesi"); assert.ok(pp.motive.length >= 1 && pp.ceAsFace);
});
await test("fara date -> asteapta; fara costLei -> banii doar in dolari", () => {
  const c0 = CS.alcatuiesteActiune({ sem: { nivel: "fara-date", motive: ["n-am prețuri"], ceAsFace: "x", componente: [] }, pret: 18, pretMediu: 20, qty: 10, simbol: "INTC" });
  assert.equal(c0.nivel, "asteapta"); assert.equal(CS.pentruPozaActiune(c0).nivel, "fara-date");
  const p = poz({ costLei: null }), c = CS.alcatuiesteActiune({ sem: AS.semafor(p, stJos), niv: { stopPozitie: 17, trailPct: 15 }, pret: 18, pretMediu: 20, qty: 10, costLei: null, simbol: "INTC" });
  assert.ok(!/lei/.test(c.bani || ""), c.bani);
});
await test("crypto neschimbat: alcatuieste (boti) trece prin ordoneaza si da ordinea din proba v10050 (muta, costuri, trend)", () => {
  assert.equal(typeof CS.ordoneaza, "function");
  const comp = (cod, motiv) => ({ cod, nivel: "atentie", motiv, faCe: "fa " + cod }), k = [comp("costuri", "costurile"), comp("muta", "mută gridul"), comp("trend", "trendul")];
  const S = { costuri: { judecate: 15, corecte: 7, bani: -20, baniN: 15 }, muta: { judecate: 12, corecte: 6, bani: 30, baniN: 12 } };
  const c = CS.alcatuieste({ sm: { nivel: "atentie", cod: "trend", motiv: "trendul", faCe: "", componente: [k[2], k[0], k[1]] }, socoteala: S });
  assert.deepEqual(c.motive.map((m) => m.cod), ["muta", "costuri", "trend"]);
});
```
- [ ] **Step 2:** `node scripts/proba-v10054.mjs` → PICĂ.
- [ ] **Step 3: implementarea** — `semafor`: la fiecare `iesi.push`/`atentie.push`/`bine.push` se adaugă și `{cod, nivel, motiv}` în `componente` (codurile din Interfaces); returul primește `componente`. `consiliu.js`: sortarea din `alcatuieste` mutată în `ordoneaza(cand, soc, fix)` (aceeași cheie precalculată), `alcatuieste` o cheamă cu `FIX` de azi. `alcatuiesteActiune`: `fara-date` ⇒ `{nivel: "asteapta", eticheta: "⏳ Socotesc", titlu: motivul, faCe: "", motive: [], rest: []}`; candidați din `sem.componente` (iesi → `c:"r"`, atentie → `"g"`, bine → `"v"`), `niv.stopAtins` ⇒ `{cod: "stop-urcator", nivel: "iesi"}` dacă nu e deja `stop-plan`/`trail-plan`; din `prob`: rândul „Atinge stopul mâine” cu `p ≥ 0,25` ⇒ `{cod: "stop-maine", nivel: "atentie"}`, rândul „Rezultatele vin în N zile” ⇒ `{cod: "rezultate", nivel: "atentie"}`; din `sfaturi`: `nivel "g"` ⇒ motiv atenție cu `cod = "sf-" + sursa`, restul ⇒ `rest`; `FIX_ACT = {"stop-plan":1, "trail-plan":1, "stop-urcator":1}`; `ordoneaza(cand, socoteala, FIX_ACT)`; nivelul = cel mai grav; titlul ca la boți; `faCe` = acțiunea motivului de sus (din `sem.ceAsFace` fără „👉 Ce aș face eu: ” sau `ceAsFace` al sfatului); `bani` = „până la stopul care urcă (X $): −Y $ ≈ −Z lei” (curs = `costLei / (qty × pretMediu)`; fără `costLei` ⇒ doar $). `pentruPozaActiune`: `{nivel: c.nivel === "asteapta" ? "fara-date" : c.nivel, motive: titlurile (≤ 6), ceAsFace: "👉 Ce aș face eu: " + c.faCe + (c.bani ? " 💰 " + c.bani : "")}`.
- [ ] **Step 4:** proba; `npm run test:v10050 && npm run test:v10051` (boți) verzi; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): Consilierul pe pozitie - semaforul cu coduri, alcatuiesteActiune, sortarea comuna cu botii`.

### Task 2: socoteala pe motiv și lei

**Files:**
- Modify: `public/lib/consiliu.js` (`noteazaActiune`, `judecaActiune`, `socotealaActiuni`), `functions/api/istoric-bot.js` (rutele `semneAct` GET/POST pe `semnale-act:<TICKER>`, `socotealaAct` GET/POST), `scripts/colector.mjs` (`turaSocotealaActiuni` o dată pe zi), `scripts/proba-v10054.mjs`

**Interfaces:**
- Produces: jurnalul `[{t, coduri: [cod…], nivel, pret, qty, fx, r?, bani?}]`; `Consiliu.socotealaActiuni(jurnale)` → `{cod: {judecate, corecte, bani, baniN, stare, nume}}` (forma `peCod` a botilor, ca `ordoneaza` să o citească).

- [ ] **Step 1: testele (picând)**
```js
await test("socoteala actiunilor: verdictul notat o data pe schimbare, judecat la 5 zile de bursa pe pret × bucati × curs; IESI/ATENTIE au dreptate daca pretul a scazut", () => {
  const Z = 864e5; let j = CS.noteazaActiune([], { nivel: "atentie", motive: [{ cod: "trend-jos" }] }, 100, 10, 4.6, 0);
  j = CS.noteazaActiune(j, { nivel: "atentie", motive: [{ cod: "trend-jos" }] }, 99, 10, 4.6, Z); assert.equal(j.length, 1, "acelasi verdict nu se renoteaza");
  const bare = Array.from({ length: 10 }, (_, i) => ({ t: i * Z, o: 100 - i, h: 101 - i, l: 99 - i, c: 100 - i }));
  j = CS.judecaActiune(j, bare, 9 * Z); assert.equal(j[0].r, 1); assert.ok(Math.abs(j[0].bani - 5 * 10 * 4.6) < 1e-6, String(j[0].bani));
  const s = CS.socotealaActiuni([j]); assert.equal(s["trend-jos"].judecate, 1); assert.ok(s["trend-jos"].bani > 0);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — `noteazaActiune(j, c, pret, qty, fx, acum)`: doar `nivel` iesi/atentie/tine; nu renotează dacă ultima intrare are același nivel și aceleași coduri; păstrează ultimele 200. `judecaActiune(j, bare, acum)`: intrarea fără `r` cu cel puțin 5 bare cu ziua > ziua intrării: `c5` = închiderea a 5-a; IEȘI/ATENȚIE: `r = c5 < pret ? 1 : 0`, `bani = (pret − c5) × qty × fx`; ȚINE: invers. `socotealaActiuni(jurnale)`: pe fiecare cod din `coduri` al intrării judecate: `judecate++`, `corecte += r`, `bani += bani`, `baniN++`; `stare` „necunoscut” sub 10, altfel ca `SemnaleBot.socotealaToti` (Wilson). Rutele: `semneAct` cu `bot` = TICKER (≤ 200 de intrări), `socotealaAct` = obiectul `peCod`. Colectorul: la fiecare poză, `noteazaActiune` pe fiecare poziție (KV); o dată pe zi `turaSocotealaActiuni` (barele zilnice ale tickerelor cu intrări nejudecate) → judecă, scrie înapoi, adună → KV `socoteala-actiuni`; `alcatuiesteActiune` o primește ca `socoteala`.
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): socoteala Consilierului pe motiv si lei (judecata la 5 zile de bursa)`.

### Task 3: colectorul — poza, KV, alerta la schimbare

**Files:**
- Modify: `scripts/colector.mjs` (`pozitiiPentruPoza`: `cons` pe poziție, `sem = Consiliu.pentruPozaActiune(cons)`; `Consiliu.schimbare` cu starea în `stareAlerte["t212-" + ticker]._cons`; POST `action=cons` cu `bot: "t212-" + ticker`; pozițiile vândute își șterg `_cons`), `scripts/proba-v10054.mjs`

**Interfaces:**
- Consumes: `alcatuiesteActiune`, `pentruPozaActiune` (Task 1), `socotealaActiuni` (Task 2), `Consiliu.schimbare` (existent, `opt.activ`).
- Produces: poza `t212[].sem` = forma semaforului din Consilier; KV `cons:t212-<TICKER>`.

- [ ] **Step 1: testele (picând)**
```js
await test("schimbarea pe actiuni: motivul de sus cu alerta planului activa azi -> doar in Radar", () => {
  const T = { nivel: "tine", eticheta: "🟢 Ține", titlu: "x", motive: [] }, I = { nivel: "iesi", eticheta: "🔴 Ieși", titlu: "Stopul din plan", faCe: "ies", motive: [{ cod: "stop-plan", c: "r", titlu: "Stopul din plan" }] };
  let r = CS.schimbare(CS.schimbare(null, T, 0, "INTC").stare, I, 1, "INTC", { activ: { "t212-stop": "critic" } }); r = CS.schimbare(r.stare, I, 2, "INTC", { activ: { "t212-stop": "critic" } });
  assert.ok(r.alerta && r.alerta.doarRadar === true);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /Consiliu\.alcatuiesteActiune\(/); assert.match(col, /Consiliu\.pentruPozaActiune\(/); assert.match(col, /"t212-" \+ x\.ticker/);
});
```
- [ ] **Step 2:** → PICĂ (`CHEI` n-are `stop-plan`).
- [ ] **Step 3: implementarea** — `consiliu.js` `CHEI`: `"stop-plan": ["t212-stop"], "trail-plan": ["t212-trail"], "tinta-plan": ["t212-tinta"]`. Colectorul: în `pozitiiPentruPoza`, după `n`: `prob = Probabilitati.randActiune(Probabilitati.pentruActiune(bare, {pret, stop: n.stopPozitie, tinta}), {}, {})`, `sf = Consilier.sfaturiPozitie(p, {inchise: inchiseT, acum})`, `cons = Consiliu.alcatuiesteActiune({...})`, `sem = Consiliu.pentruPozaActiune(cons)`; `activ` = cheile de azi din starea `turaPlanuri` pentru ticker (`t212-<tk>-stop-<zi>` ⇒ `"t212-stop": "critic"`); `Consiliu.schimbare(st._cons, cons, acum, simbol, {activ, taci: {}})`; alerta ⇒ `trimiteAlerta(...)`; POST `action=cons` cu `bot: "t212-" + x.ticker`. Tickerele care nu mai sunt în poziții ⇒ `delete stareAlerte["t212-" + tk]._cons`.
- [ ] **Step 4:** proba; `COLECTOR_DOAR_INCARCA=1`; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): Consilierul pozitiei in colector - poza, KV cons:t212-<TICKER>, alerta la schimbare fara dubluri (colector)`.

### Task 4: pagina T212 — blocul Consilierului, „de ce”, deciziile; versiunea, livrarea

**Files:**
- Modify: `public/lib/t212-ecran.js` (blocul în detaliul poziției + pastila din Consilier), `functions/api/istoric-bot.js` (decizia acceptă `pret`, `qty`, `fx`), `scripts/colector.mjs` (`turaDecizii` judecă și `t212-*` la 5 zile de bursă pe preț), `public/lib/consiliu.js` (`judecaDecizieActiune`), versiunile, `scripts/proba-v10054.mjs`

**Interfaces:**
- Consumes: Task 1–3.
- Produces: `Consiliu.judecaDecizieActiune(lista, bare, acum)` → lista cu `r = (c5 − pret) × qty × fx` (lei; fără fx ⇒ $), `cum: "la 5 zile de bursă"`.

- [ ] **Step 1: testele (picând)**
```js
await test("decizia pe actiune: judecata la 5 zile de bursa pe pretul actiunii (si daca a vandut intre timp)", () => {
  const Z = 864e5, bare = Array.from({ length: 10 }, (_, i) => ({ t: i * Z, o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i }));
  const r = CS.judecaDecizieActiune([{ t: 0.5 * Z, pret: 100, qty: 2, fx: 4.5, urmat: true, cheie: "x" }], bare, 9 * Z);
  assert.ok(Math.abs(r[0].r - 5 * 2 * 4.5) < 1e-9, String(r[0].r)); assert.match(r[0].cum, /5 zile/);
  const ecr = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.match(ecr, /Consiliu\.alcatuiesteActiune\(/); assert.match(ecr, /t212Decizie\(/); assert.match(ecr, /action=cons&bot=t212-/);
});
```
- [ ] **Step 2:** → PICĂ.
- [ ] **Step 3: implementarea** — pagina: în `t212PregatesteP` `p.cons = Consiliu.alcatuiesteActiune({...})` cu aceleași intrări ca în colector (prob = `p.prob`, sfaturi = `p.sfaturi`, socoteala din `/api/istoric-bot?action=socotealaAct`, cache 10 min); pastila din `p.cons.nivel`; în detaliu, sus: eticheta, titlul, „👉 Ce aș face eu” + 💰, cele 3 motive cu cipul de încredere, „Restul” pliat (sfaturile vechi și „De ce ține” intră aici — nimic pierdut), „🔁 schimbat acum X: …” din KV `cons:t212-<TICKER>` (`Consiliu.altaVoce` când diferă), butoanele „✅ am făcut / ✋ n-am făcut” → POST `action=decizie` cu `bot: "t212-" + ticker`, `cheie = Consiliu.cheieDecizie(cons)`, `pret`, `qty`, `fx`; ruta `decizie` păstrează `pret/qty/fx` (numere). Colectorul `turaDecizii`: id-urile `t212-*` din `deciziiBoti` se judecă cu `judecaDecizieActiune` pe barele zilnice ale tickerului. `frontend-design`: stilurile existente (`.tbCons*`, `.tbDecBtn`), ținte ≥ 44 px pe telefon. Versiunile; `npm test`; ecran T212 (20) + Tablou + Grid; poze 1920/390; repornirea colectorului și probă pe viu (`cons:t212-<TICKER>` în KV, poza cu `sem` din Consilier); revizia finală (agent Opus nou); reparațiile cu test; `npm test && git push`; memo.
- [ ] **Step 4:** proba; `npm test`.
- [ ] **Step 5:** commit `feat(actiuni): Consilierul pe pagina T212 - un verdict, de ce s-a schimbat, am facut / n-am facut + v100.54 (colector v101.33)`.
