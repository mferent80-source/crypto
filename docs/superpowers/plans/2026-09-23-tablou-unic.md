# Tabloul unic — plan de implementare (etapa B)

> **Pentru lucrătorii agentici:** SUB-SKILL OBLIGATORIU: folosiți
> superpowers:subagent-driven-development pentru a executa planul sarcină cu
> sarcină. Pașii folosesc casete (`- [ ]`) pentru urmărire.

**Scopul:** Tabloul botului devine singurul ecran la care se uită Marius: ce are
de făcut, cât a câștigat, dacă e în pericol, pe ce dovezi — plus un grafic al
prețului față de grid.

**Arhitectura:** Tot ce se poate calcula fără DOM și fără rețea intră în modulul
pur `public/lib/tablou-bot.js` (probat cu `npm test`). `public/app.js` doar
cheamă și desenează. Benzile noi sunt carduri în `public/index.html`, în ordinea
în care se uită el. Graficul e SVG construit în cod, fără bibliotecă.

**Stiva:** JavaScript simplu (ES5 în modulul pur, ca restul fișierului), SVG
inline, `node --test`-free harness propriu, Chrome prin CDP pentru probele de
ecran.

**Spec:** `docs/superpowers/specs/2026-09-23-tablou-unic-design.md`

## Constrângeri transversale

- Cod și comentarii în **română fără diacritice**; textul afișat pe ecran **cu**
  diacritice.
- **Strict read-only** față de Pionex. Nicio rută nouă care scrie.
- Terminațiile de linie se iau din fișier: `public/app.js` și `public/index.html`
  sunt **CRLF**; `public/lib/tablou-bot.js` și `scripts/*.mjs` sunt **LF**.
- **Lipsa nu se scrie niciodată ca `0`.** `nr(null)` întoarce `0` în acest fișier
  (`Number(null) === 0`) — orice cifră venită din exterior se validează cu
  `x !== null && x > 0` acolo unde zero nu e o valoare legitimă.
- `npm test` verde înainte de fiecare commit.
- Nu se îmbină în `main` fără cuvântul lui Marius.
- Fiecare purtare nouă se măsoară **prin stricare**: se strică o condiție (nu un
  bloc), se rulează proba, se pune la loc.

## Structura fișierelor

| fișier | ce răspunde de |
|---|---|
| `public/lib/tablou-bot.js` | **pur**: `frecvente()` (T1), `geometrieGrafic()` (T2) |
| `public/app.js` | colectorul de fundal (T3), desenarea benzilor (T4–T7) |
| `public/index.html` | cardurile noi (T4–T7) |
| `scripts/tablou-bot-v73.mjs` | probele modulului pur |
| `scripts/proba-ecran-tablou.mjs` | probele de ecran, Chrome real |

---

### Task 1: `frecvente()` — cifrele dovedite din istoric

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js` (funcție nouă + export)
- Probe: `scripts/tablou-bot-v73.mjs`

**Interfețe:**
- Consumă: `nr()` (privat, există), forma istoricului
  `{t, perechi, pretPerp, pretSpot, profitNet, comisioane, gridProfitBrut, investit}`
- Produce: `TabloBot.frecvente(istoric, bot, acum)` →
  ```
  { perechiPeOra:    {valoare, stare, prag},
    netPeZi:         {valoare, stare, prag},
    timpInInterval:  {valoare, stare, prag, acoperire},
    desLaMargine:    {valoare, stare, prag, acoperire} }
  ```
  `stare` ∈ `"dovedit" | "putin" | "nu-se-poate"`. `valoare` e `null` când
  starea e `"nu-se-poate"`. `acoperire` e procent 0–100 sau `null`.

**Praguri (exacte, copiate din spec):**
- rate cumulative: întindere ≥ 2 h → `dovedit`; 1 h ≤ întindere < 2 h → `putin`;
  < 1 h → `nu-se-poate`
- frecvențe de stare: ≥ 60 intrări → `dovedit`; 30–59 → `putin`; < 30 →
  `nu-se-poate`

- [ ] **Pasul 1: Scrie probele care pică**

În `scripts/tablou-bot-v73.mjs`, înainte de `console.log(\`\nV73_TABLOU`:

```js
/* ── T1: frecventele dovedite ─────────────────────────────────────────── */
function istoricFrecvente(minute, optiuni) {
  const o = optiuni || {};
  const pas = o.pasMinute || 1;
  const out = [];
  for (let i = minute; i >= 0; i -= pas) {
    out.push({
      t: ACUM - i * 60000,
      perechi: o.perechiStart != null ? o.perechiStart + (minute - i) * (o.perechiPeMinut || 0) : 0,
      pretPerp: o.pret != null ? o.pret : 0.0155,
      pretSpot: 0.0155,
      profitNet: o.netStart != null ? o.netStart + (minute - i) * (o.netPeMinut || 0) : 0,
      comisioane: 0, gridProfitBrut: 0, investit: 100
    });
  }
  return out;
}

await test("T1: perechi pe ora se socoteste din contorul cumulativ, peste gauri", () => {
  // 3 ore, 0.1 perechi/minut = 6 pe ora. Scoatem ora din mijloc: rata NU se schimba,
  // fiindca `perechi` e un TOTAL de la Pionex - include si ce s-a intamplat cat n-am privit.
  const plin = istoricFrecvente(180, { perechiStart: 0, perechiPeMinut: 0.1 });
  const cuGaura = plin.filter((x) => { const m = (ACUM - x.t) / 60000; return !(m > 60 && m < 120); });
  const a = T.frecvente(plin, BOT, ACUM).perechiPeOra;
  const b = T.frecvente(cuGaura, BOT, ACUM).perechiPeOra;
  assert.equal(a.stare, "dovedit");
  assert.ok(Math.abs(a.valoare - 6) < 0.2, `asteptat ~6 perechi/ora, a dat ${a.valoare}`);
  assert.ok(Math.abs(b.valoare - a.valoare) < 0.2,
    `o gaura NU are voie sa schimbe rata unui contor cumulativ: ${b.valoare} vs ${a.valoare}`);
});

await test("T1: contor cumulativ care SCADE inseamna bot repornit, nu rata negativa", () => {
  const ist = istoricFrecvente(180, { perechiStart: 500, perechiPeMinut: 0.1 });
  ist[ist.length - 1].perechi = 3; // botul a fost repornit: contorul a luat-o de la capat
  const f = T.frecvente(ist, BOT, ACUM).perechiPeOra;
  assert.equal(f.stare, "nu-se-poate", "un contor care scade nu se traduce in rata negativa");
  assert.equal(f.valoare, null);
});

await test("T1: net pe zi din profitNet cumulativ", () => {
  // 0.01 pe minut = 14.4 pe zi
  const ist = istoricFrecvente(180, { netStart: 0, netPeMinut: 0.01 });
  const f = T.frecvente(ist, BOT, ACUM).netPeZi;
  assert.equal(f.stare, "dovedit");
  assert.ok(Math.abs(f.valoare - 14.4) < 0.5, `asteptat ~14.4/zi, a dat ${f.valoare}`);
});

await test("T1: sub o ora de intindere, ratele sunt nu-se-poate; intre 1 si 2 ore, putin", () => {
  const scurt = T.frecvente(istoricFrecvente(45, { perechiPeMinut: 0.1 }), BOT, ACUM);
  assert.equal(scurt.perechiPeOra.stare, "nu-se-poate", "45 de minute nu dovedesc o rata pe ora");
  assert.equal(scurt.perechiPeOra.valoare, null);
  const mediu = T.frecvente(istoricFrecvente(90, { perechiPeMinut: 0.1 }), BOT, ACUM);
  assert.equal(mediu.perechiPeOra.stare, "putin", "90 de minute se pot arata, cu rezerva");
  assert.ok(mediu.perechiPeOra.valoare > 0);
});

await test("T1: timp in interval numara DOAR intrarile observate, si spune acoperirea", () => {
  // 100 de intrari, din care 25 cu pretul iesit din interval (BOT: 0.0153..0.0158)
  const ist = istoricFrecvente(99, { pret: 0.0155 });
  for (let i = 0; i < 25; i++) ist[i].pretPerp = 0.0170;
  const f = T.frecvente(ist, BOT, ACUM).timpInInterval;
  assert.equal(f.stare, "dovedit");
  assert.ok(Math.abs(f.valoare - 75) < 1.5, `asteptat ~75%, a dat ${f.valoare}`);
  assert.ok(f.acoperire > 90, `100 de masuratori pe 100 de minute inseamna acoperire mare, a dat ${f.acoperire}`);
});

await test("T1: acoperirea CADE cand istoricul are gauri, desi procentul ramane", () => {
  const plin = istoricFrecvente(179, { pret: 0.0155 });
  const rar = istoricFrecvente(179, { pret: 0.0155, pasMinute: 3 });
  const a = T.frecvente(plin, BOT, ACUM).timpInInterval;
  const b = T.frecvente(rar, BOT, ACUM).timpInInterval;
  assert.ok(Math.abs(a.valoare - b.valoare) < 1, "procentul in sine nu se schimba");
  assert.ok(b.acoperire < a.acoperire - 40,
    `cu o masuratoare la 3 minute, acoperirea trebuie sa fie mult mai mica: ${b.acoperire} vs ${a.acoperire}`);
});

await test("T1: sub 30 de intrari, frecventele de stare sunt nu-se-poate", () => {
  const f = T.frecvente(istoricFrecvente(20, { pret: 0.0155 }), BOT, ACUM);
  assert.equal(f.timpInInterval.stare, "nu-se-poate");
  assert.equal(f.timpInInterval.valoare, null);
  assert.equal(f.timpInInterval.acoperire, null, "fara date nu se inventeaza nici acoperirea");
});

await test("T1: cat de des la margine foloseste aceleasi praguri ca pozitia (15/85)", () => {
  const ist = istoricFrecvente(99, { pret: 0.0155 });      // mijloc
  for (let i = 0; i < 20; i++) ist[i].pretPerp = 0.01577;  // ~94% din interval
  const f = T.frecvente(ist, BOT, ACUM).desLaMargine;
  assert.equal(f.stare, "dovedit");
  assert.ok(Math.abs(f.valoare - 20) < 1.5, `asteptat ~20%, a dat ${f.valoare}`);
});

await test("T1: fara grid (jos/sus lipsa) frecventele de stare nu se pot socoti", () => {
  const botFaraGrid = { ...BOT, gridJos: null, gridSus: null,
    buOrderData: { ...BOT.buOrderData, bottom: null, top: null } };
  const f = T.frecvente(istoricFrecvente(99, { pret: 0.0155 }), botFaraGrid, ACUM);
  assert.equal(f.timpInInterval.stare, "nu-se-poate");
  assert.equal(f.desLaMargine.stare, "nu-se-poate");
});

await test("T1: istoric gol sau nevalid nu arunca si nu da zerouri", () => {
  for (const intrare of [[], null, undefined, "nu-e-lista"]) {
    const f = T.frecvente(intrare, BOT, ACUM);
    for (const cheie of ["perechiPeOra", "netPeZi", "timpInInterval", "desLaMargine"]) {
      assert.equal(f[cheie].stare, "nu-se-poate", `${cheie} pe ${JSON.stringify(intrare)}`);
      assert.equal(f[cheie].valoare, null, `${cheie} nu are voie sa fie 0 cand lipsesc datele`);
    }
  }
});
```

- [ ] **Pasul 2: Rulează probele și privește-le cum pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: 10 probe `PICA`, cu mesajul `T.frecvente is not a function`.

- [ ] **Pasul 3: Scrie implementarea**

În `public/lib/tablou-bot.js`, înaintea liniei `var ZI = 24 * 3600000, MAXIM = 1440;`:

```js
  // Cifrele sunt de DOUA feluri si gaurile din istoric le ating diferit.
  // (a) ratele din contoare CUMULATIVE (perechi, profitNet) raman valide peste o
  //     gaura: totalul de la Pionex include si ce s-a intamplat cat n-am privit.
  // (b) frecventele de STARE nu: acolo gaura inseamna ca nu stim unde era pretul,
  //     deci intrarile lipsa nu intra in numitor si se raporteaza ACOPERIREA.
  var NU = { valoare: null, stare: "nu-se-poate", prag: null };
  function nuStare() { return { valoare: null, stare: "nu-se-poate", prag: null, acoperire: null }; }

  function rataCumulativa(lista, camp, peZi) {
    if (lista.length < 2) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var p = nr(lista[0][camp]), u = nr(lista[lista.length - 1][camp]);
    var t0 = nr(lista[0].t), t1 = nr(lista[lista.length - 1].t);
    if (p === null || u === null || t0 === null || t1 === null) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    // Un contor care SCADE inseamna bot repornit sau schimbat - nu o rata negativa.
    if (u < p) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var ore = (t1 - t0) / 3600000;
    if (ore < 1) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var pePas = (u - p) / ore * (peZi ? 24 : 1);
    return { valoare: pePas, stare: ore >= 2 ? "dovedit" : "putin", prag: peZi ? 2 : 2 };
  }

  function frecventaStare(lista, potrivit, acum) {
    var n = lista.length;
    if (n < 30) return nuStare();
    var cate = 0;
    for (var i = 0; i < n; i++) if (potrivit(lista[i])) cate++;
    // Acoperirea: cate masuratori avem fata de cate minute acopera istoricul.
    var t0 = nr(lista[0].t);
    var minute = t0 === null ? 0 : Math.max(1, Math.round((acum - t0) / 60000));
    var acoperire = Math.min(100, Math.round(100 * n / minute));
    return { valoare: 100 * cate / n, stare: n >= 60 ? "dovedit" : "putin",
      prag: 60, acoperire: acoperire };
  }

  function frecvente(istoric, bot, acum) {
    var lista = [];
    if (Array.isArray(istoric)) {
      for (var k = 0; k < istoric.length; k++) if (istoric[k] && nr(istoric[k].t) !== null) lista.push(istoric[k]);
    }
    var x = (bot && bot.buOrderData) || {};
    var jos = nr(x.bottom), sus = nr(x.top);
    var areGrid = jos !== null && sus !== null && sus > jos;
    var pozitia = function (h) {
      var pp = nr(h.pretPerp);
      if (pp === null || !areGrid) return null;
      return 100 * (pp - jos) / (sus - jos);
    };
    return {
      perechiPeOra: rataCumulativa(lista, "perechi", false),
      netPeZi: rataCumulativa(lista, "profitNet", true),
      timpInInterval: areGrid ? frecventaStare(lista, function (h) {
        var p = pozitia(h); return p !== null && p >= 0 && p <= 100;
      }, acum) : nuStare(),
      desLaMargine: areGrid ? frecventaStare(lista, function (h) {
        var p = pozitia(h); return p !== null && p >= 0 && p <= 100 && (p < 15 || p > 85);
      }, acum) : nuStare()
    };
  }

```

Și la export, înlocuiește linia de `return`:

```js
  return { simboluri: simboluri, masoara: masoara, modBot: modBot, verdict: trepte,
    istoricAdauga: istoricAdauga, alegeBot: alegeBot, explicaEroarea: explicaEroarea,
    frecvente: frecvente };
```

- [ ] **Pasul 4: Rulează probele și verifică-le verzi**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS`, toate cele 10 probe noi `ok`.

- [ ] **Pasul 5: Măsoară prin stricare**

Strică, una câte una, și confirmă că pică proba ei:
1. `if (u < p) return ...` → `if (false) return ...` ⇒ pică „contor cumulativ care SCADE"
2. `n >= 60 ? "dovedit" : "putin"` → `"dovedit"` ⇒ pică „sub 30 de intrari" (nu) —
   folosește în schimb `if (n < 30)` → `if (n < 3)` ⇒ pică „sub 30 de intrari"
3. `Math.min(100, Math.round(100 * n / minute))` → `100` ⇒ pică „acoperirea CADE"
Pune fiecare la loc înainte de următoarea.

- [ ] **Pasul 6: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "T1: frecvente() - rate cumulative si frecvente de stare, cu acoperire"
```

---

### Task 2: `geometrieGrafic()` — graficul care nu minte

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js`
- Probe: `scripts/tablou-bot-v73.mjs`

**Interfețe:**
- Consumă: istoricul (T1), `bot.buOrderData.{bottom,top}`, `bot.buOrderData.estimateLiquidationPriceDown`
  (numele brut de la Pionex; ruta îl normalizează drept `lichidareJos`, dar aici
  primim botul BRUT, deci se citește câmpul original)
- Produce: `TabloBot.geometrieGrafic(istoric, bot, acum)` →
  ```
  { destul: bool, segmente: [[{x,y}, ...], ...],
    banda: {jos, sus} | null, lichidare: number | null,
    minPret, maxPret, deLa, panaLa }
  ```
  `x` și `y` sunt normalizate 0..1; `y = 0` e jos. Desenarea inversează `y`.

**Reguli (din spec):**
1. întrerupere > 5 minute ⇒ **segment nou**, linia nu se unește peste gol
2. scara verticală **cuprinde întotdeauna** banda gridului, plus 2% margine
3. sub **10 puncte** ⇒ `destul: false`, nu se desenează nimic

- [ ] **Pasul 1: Scrie probele care pică**

```js
/* ── T2: geometria graficului ─────────────────────────────────────────── */
await test("T2: sub 10 puncte nu se deseneaza nimic", () => {
  const g = T.geometrieGrafic(istoricFrecvente(8, { pret: 0.0155 }), BOT, ACUM);
  assert.equal(g.destul, false, "cu 9 puncte nu se deseneaza un grafic");
  assert.deepEqual(g.segmente, [], "fara puncte destule nu se intorc segmente");
});

await test("T2: o gaura mai mare de 5 minute RUPE linia, nu o uneste", () => {
  const plin = istoricFrecvente(119, { pret: 0.0155 });
  const cuGaura = plin.filter((x) => { const m = (ACUM - x.t) / 60000; return !(m > 40 && m < 70); });
  const g = T.geometrieGrafic(cuGaura, BOT, ACUM);
  assert.equal(g.destul, true);
  assert.equal(g.segmente.length, 2, `o gaura de 30 min trebuie sa dea 2 segmente, a dat ${g.segmente.length}`);
  const gPlin = T.geometrieGrafic(plin, BOT, ACUM);
  assert.equal(gPlin.segmente.length, 1, "fara gauri, un singur segment");
});

await test("T2: o pauza de exact 5 minute NU rupe linia; 6 minute o rup", () => {
  const baza = istoricFrecvente(59, { pret: 0.0155 });
  const de5 = baza.filter((x) => { const m = (ACUM - x.t) / 60000; return !(m > 30 && m < 35); });
  const de6 = baza.filter((x) => { const m = (ACUM - x.t) / 60000; return !(m > 30 && m < 36); });
  assert.equal(T.geometrieGrafic(de5, BOT, ACUM).segmente.length, 1, "exact 5 minute e inca o linie");
  assert.equal(T.geometrieGrafic(de6, BOT, ACUM).segmente.length, 2, "6 minute rup linia");
});

await test("T2: scara cuprinde banda gridului chiar daca pretul a fugit departe", () => {
  // BOT are gridul 0.0153..0.0158; punem pretul mult peste
  const ist = istoricFrecvente(59, { pret: 0.0300 });
  const g = T.geometrieGrafic(ist, BOT, ACUM);
  assert.ok(g.minPret <= 0.0153, `scara trebuie sa cuprinda josul gridului, min=${g.minPret}`);
  assert.ok(g.maxPret >= 0.0300, `scara trebuie sa cuprinda si pretul, max=${g.maxPret}`);
  assert.ok(g.banda && g.banda.jos >= 0 && g.banda.sus <= 1, "banda trebuie sa cada in scara");
  assert.ok(g.banda.sus > g.banda.jos, "banda are inaltime");
});

await test("T2: punctele sunt normalizate intre 0 si 1, iar cel mai NOU e la dreapta", () => {
  const g = T.geometrieGrafic(istoricFrecvente(59, { pret: 0.0155 }), BOT, ACUM);
  const toate = g.segmente.flat();
  for (const p of toate) {
    assert.ok(p.x >= 0 && p.x <= 1, `x in afara scarii: ${p.x}`);
    assert.ok(p.y >= 0 && p.y <= 1, `y in afara scarii: ${p.y}`);
  }
  assert.ok(toate[toate.length - 1].x > toate[0].x, "cel mai nou punct sta la dreapta");
});

await test("T2: linia de lichidare apare doar daca intra in scara", () => {
  const ist = istoricFrecvente(59, { pret: 0.0155 });
  const aproape = { ...BOT, buOrderData: { ...BOT.buOrderData, estimateLiquidationPriceDown: "0.0150" } };
  const departe = { ...BOT, buOrderData: { ...BOT.buOrderData, estimateLiquidationPriceDown: "0.0001" } };
  const a = T.geometrieGrafic(ist, aproape, ACUM);
  const d = T.geometrieGrafic(ist, departe, ACUM);
  assert.ok(a.lichidare !== null && a.lichidare >= 0 && a.lichidare <= 1, "lichidarea apropiata se arata");
  assert.equal(d.lichidare, null, "o lichidare in afara scarii nu se deseneaza la marginea de jos");
});

await test("T2: fara grid se deseneaza tot pretul, dar fara banda", () => {
  const fara = { ...BOT, buOrderData: { ...BOT.buOrderData, bottom: null, top: null } };
  const g = T.geometrieGrafic(istoricFrecvente(59, { pret: 0.0155 }), fara, ACUM);
  assert.equal(g.destul, true, "lipsa gridului nu ascunde pretul");
  assert.equal(g.banda, null, "fara grid nu se inventeaza o banda");
});

await test("T2: intrarile fara pretPerp se sar, nu se deseneaza ca zero", () => {
  const ist = istoricFrecvente(59, { pret: 0.0155 });
  for (let i = 10; i < 15; i++) ist[i].pretPerp = null;
  const g = T.geometrieGrafic(ist, BOT, ACUM);
  const toate = g.segmente.flat();
  assert.ok(g.minPret > 0.010, `un pretPerp null nu are voie sa traga scara la zero: min=${g.minPret}`);
  assert.equal(toate.length, ist.length - 5, "cele 5 intrari fara pret nu produc puncte");
});
```

- [ ] **Pasul 2: Rulează probele și privește-le cum pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: 8 probe `PICA` cu `T.geometrieGrafic is not a function`.

- [ ] **Pasul 3: Scrie implementarea**

În `public/lib/tablou-bot.js`, după `frecvente`:

```js
  // Graficul se construieste aici (pur), ca sa poata fi probat fara browser.
  // Regulile care-l impiedica sa minta sunt in spec; fiecare are proba ei.
  var GAURA_GRAFIC_MS = 5 * 60000;
  function geometrieGrafic(istoric, bot, acum) {
    var gol = { destul: false, segmente: [], banda: null, lichidare: null,
      minPret: null, maxPret: null, deLa: null, panaLa: null };
    var puncte = [];
    if (Array.isArray(istoric)) {
      for (var i = 0; i < istoric.length; i++) {
        var h = istoric[i]; if (!h) continue;
        var t = nr(h.t), p = nr(h.pretPerp);
        // Un pretPerp lipsa e null, si nr(null) da 0 - un 0 ar trage scara la zero.
        if (t === null || p === null || !(p > 0)) continue;
        puncte.push({ t: t, p: p });
      }
    }
    if (puncte.length < 10) return gol;
    puncte.sort(function (a, b) { return a.t - b.t; });

    var x = (bot && bot.buOrderData) || {};
    var jos = nr(x.bottom), sus = nr(x.top);
    var areGrid = jos !== null && sus !== null && sus > jos && jos > 0;
    var lich = nr(x.estimateLiquidationPriceDown);

    var minP = puncte[0].p, maxP = puncte[0].p;
    for (var j = 1; j < puncte.length; j++) {
      if (puncte[j].p < minP) minP = puncte[j].p;
      if (puncte[j].p > maxP) maxP = puncte[j].p;
    }
    // Scara cuprinde MEREU banda gridului: altfel un pret fugit departe ar turti
    // banda intr-o dunga si ar parea ca pretul e lipit de ea.
    if (areGrid) { if (jos < minP) minP = jos; if (sus > maxP) maxP = sus; }
    var marja = (maxP - minP) * 0.02 || maxP * 0.01 || 1;
    minP -= marja; maxP += marja;

    var deLa = puncte[0].t, panaLa = puncte[puncte.length - 1].t;
    var lat = panaLa - deLa || 1, inalt = maxP - minP || 1;
    var nx = function (t) { return (t - deLa) / lat; };
    var ny = function (p) { return (p - minP) / inalt; };

    var segmente = [], curent = [];
    for (var k = 0; k < puncte.length; k++) {
      if (k > 0 && puncte[k].t - puncte[k - 1].t > GAURA_GRAFIC_MS) {
        if (curent.length) segmente.push(curent);
        curent = [];
      }
      curent.push({ x: nx(puncte[k].t), y: ny(puncte[k].p) });
    }
    if (curent.length) segmente.push(curent);

    return { destul: true, segmente: segmente,
      banda: areGrid ? { jos: ny(jos), sus: ny(sus) } : null,
      lichidare: (lich !== null && lich > minP && lich < maxP) ? ny(lich) : null,
      minPret: minP, maxPret: maxP, deLa: deLa, panaLa: panaLa };
  }

```

Adaugă la export: `geometrieGrafic: geometrieGrafic`.

- [ ] **Pasul 4: Rulează probele și verifică-le verzi**

Rulează: `node scripts/tablou-bot-v73.mjs` → `V73_TABLOU PASS`.

- [ ] **Pasul 5: Măsoară prin stricare**

1. `puncte[k].t - puncte[k-1].t > GAURA_GRAFIC_MS` → `> GAURA_GRAFIC_MS * 100`
   ⇒ pică „o gaura mai mare de 5 minute RUPE linia"
2. `if (areGrid) { if (jos < minP) ... }` → `if (false) { ... }`
   ⇒ pică „scara cuprinde banda gridului"
3. `if (puncte.length < 10)` → `if (puncte.length < 2)`
   ⇒ pică „sub 10 puncte nu se deseneaza nimic"

- [ ] **Pasul 6: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "T2: geometrieGrafic() - gaurile raman gauri, scara cuprinde banda"
```

---

### Task 3: Colectorul de fundal

**Fișiere:**
- Modifică: `public/app.js` (lângă `tbAduDate`, `opresteTabloBot`, și pornirea aplicației la linia cu `renderApiAuthStatus();`)
- Probe: `scripts/proba-ecran-tablou.mjs`

**Interfețe:**
- Consumă: `tbAduDate()` (există), `tbStare` (există)
- Produce: `tbColectorPornit()`, `tbColectorOprit()` — globale, chemate la pornirea
  aplicației și la `visibilitychange`

**Purtare cerută:**
- pornește o dată cu aplicația, merge pe **orice ecran**
- **8 s** cât panoul `#tabloubot` e vizibil; **60 s** cât nu e
- **fără WebSocket** în fundal (rămâne `pretSpot: null` în istoric)
- **nu scrie în istoric** dacă ruta a picat (purtarea existentă rămâne)
- se oprește când tabul e ascuns (`document.hidden`), repornește la revenire

- [ ] **Pasul 1: Scrie proba de ecran care pică**

În `scripts/proba-ecran-tablou.mjs`, înainte de `} finally {`:

```js
    await test("22. colectorul scrie in istoric si de pe ALT ecran", async () => {
      const id = "9401";
      await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('tabloBotIstoric_v1_')).forEach(k=>localStorage.removeItem(k))`);
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: id, baza: "ADA.PERP" }))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`navTo('dash', true)`);                 // plecam de pe tablou
      await b.ev(`window.__proba.setItemLog = []`);
      await b.ev(`tbColectorTick()`);                     // un tic, fara sa asteptam 60 s
      await asteapta(800);
      const scris = await b.ev(`window.__proba.setItemLog.some(k=>k==='tabloBotIstoric_v1_${id}')`);
      assert.ok(scris, "colectorul trebuie sa adune istoric si cand esti pe alt ecran");
    });

    await test("23. colectorul NU scrie in timpul unei pene de ruta", async () => {
      await b.ev(`window.__proba.setItemLog = []`);
      await seteazaMock(b, "botOrders", { reteaPicata: true });
      await b.ev(`tbColectorTick()`);
      await asteapta(800);
      const scrieri = await b.ev(`window.__proba.setItemLog.filter(k=>k.startsWith('tabloBotIstoric_v1_')).length`);
      assert.equal(scrieri, 0, "o pana de retea nu are voie sa devina dovada in istoric");
    });

    await test("24. in fundal NU se deschide WebSocket - doar cand esti pe tablou", async () => {
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: "9402", baza: "ADA.PERP" }))] }, stare: 200 });
      await b.ev(`navTo('dash', true)`);
      await b.ev(`tbColectorTick()`);
      await asteapta(800);
      const wsInFundal = await b.ev(`!!(tbStare.ws && tbStare.ws.readyState !== 3)`);
      assert.equal(wsInFundal, false, "un WebSocket deschis pe toate ecranele e risipa si tine socketul ocupat");
    });
```

- [ ] **Pasul 2: Rulează proba și privește-o cum pică**

Rulează (cu serverul pe `:8788`): `npm run test:ecran`
Așteptat: probele 22–24 `PICA` cu `tbColectorTick is not defined`.

- [ ] **Pasul 3: Scrie implementarea**

În `public/app.js`, imediat după funcția `opresteTabloBot()`:

```js
// Colectorul aduna istoric cat timp APLICATIA e deschisa, pe orice ecran -
// altfel ecranul pe care Marius il vrea central e orb cat sta pe alt ecran.
// Cadenta: 8 s cand panoul se vede, 60 s cand nu. Fara WebSocket in fundal:
// pretul spot ramane null in istoric, iar consumatorii sar peste null.
var tbColector=null;
function tbPanouVizibil(){return !!($("tabloubot")&&$("tabloubot").classList.contains("on"))}
function tbColectorTick(){
  // tbAduDate NU scrie in istoric daca ruta a picat - purtarea aia ramane.
  return tbAduDate().then(function(){if(tbPanouVizibil())renderTabloBot()});
}
function tbColectorPornit(){
  if(tbColector)return;
  var pas=tbPanouVizibil()?8000:60000;
  tbColector=setInterval(function(){
    if(document.hidden)return;                       // tab in fundal: nu batem ruta degeaba
    var cerut=tbPanouVizibil()?8000:60000;
    if(cerut!==pas){pas=cerut;tbColectorOprit();tbColectorPornit();return}
    tbColectorTick();
  },pas);
}
function tbColectorOprit(){if(tbColector){clearInterval(tbColector);tbColector=null}}
document.addEventListener("visibilitychange",function(){
  if(document.hidden)tbColectorOprit();else tbColectorPornit();
});
```

La pornirea aplicației, în linia care cheamă `renderApiAuthStatus();`, adaugă
`tbColectorPornit();` imediat după `renderApiAuthStatus();`.

- [ ] **Pasul 4: Rulează proba și verifică verde**

Rulează: `npm run test:ecran` → probele 22–24 `ok`.

- [ ] **Pasul 5: Măsoară prin stricare**

1. În `tbColectorTick`, schimbă `return tbAduDate().then(...)` în
   `if(!tbPanouVizibil())return Promise.resolve();return tbAduDate().then(...)`
   ⇒ pică proba 22.
2. În `tbColectorPornit`, `if(document.hidden)return;` → `if(false)return;`
   nu trebuie să pice nicio probă (nu e păzit) — **notează asta în raport**,
   nu o „repara" inventând o probă care nu măsoară nimic.

- [ ] **Pasul 6: Commit**

```bash
git add public/app.js scripts/proba-ecran-tablou.mjs
git commit -m "T3: colectorul aduna istoric pe orice ecran, 8s/60s, fara WS in fundal"
```

---

### Task 4: Istoricul primește câmpurile de bani

**Fișiere:**
- Modifică: `public/app.js` (unde se compune intrarea de istoric, în `tbAduDate`)
- Probe: `scripts/proba-ecran-tablou.mjs`

**Interfețe:**
- Produce: intrări de istoric cu `profitNet`, `comisioane`, `gridProfitBrut`,
  `investit` — de care depind `frecvente()` (T1) și banda BANII (T5)

- [ ] **Pasul 1: Scrie proba care pică**

```js
    await test("25. istoricul retine si banii, nu doar perechile", async () => {
      const id = "9501";
      await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('tabloBotIstoric_v1_')).forEach(k=>localStorage.removeItem(k))`);
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: id, baza: "ADA.PERP" }))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      await asteapta(500);
      const ultima = await b.ev(`(() => {
        const l = JSON.parse(localStorage.getItem('tabloBotIstoric_v1_${id}') || '[]');
        return l.length ? l[l.length - 1] : null;
      })()`);
      assert.ok(ultima, "ar trebui sa existe o intrare de istoric");
      for (const camp of ["profitNet", "comisioane", "gridProfitBrut", "investit"]) {
        assert.ok(camp in ultima, `istoricul trebuie sa retina ${camp} - fara el nu se pot socoti banii in timp`);
      }
    });
```

- [ ] **Pasul 2: Rulează și privește cum pică**

Rulează: `npm run test:ecran` → proba 25 `PICA` cu
`istoricul trebuie sa retina profitNet`.

- [ ] **Pasul 3: Scrie implementarea**

În `public/app.js`, găsește locul unde se construiește intrarea nouă de istoric în
`tbAduDate` (obiectul care conține `perechi:` și `pretPerp:`) și adaugă în el:

```js
        profitNet:b.profitNet!=null?Number(b.profitNet):null,
        comisioane:b.comisioane!=null?Number(b.comisioane):null,
        gridProfitBrut:b.gridProfitBrut!=null?Number(b.gridProfitBrut):null,
        investit:b.investit!=null?Number(b.investit):null,
```

unde `b` e botul ales (`tbStare.bot`). **Nu folosi `Number(x)||0`** — un `0` ar
minți acolo unde câmpul lipsește; păstrează `null`.

- [ ] **Pasul 4: Rulează și verifică verde**

Rulează: `npm run test:ecran` → proba 25 `ok`.

- [ ] **Pasul 5: Măsoară prin stricare**

Scoate linia `profitNet:` din obiect ⇒ pică proba 25 cu numele câmpului.

- [ ] **Pasul 6: Commit**

```bash
git add public/app.js scripts/proba-ecran-tablou.mjs
git commit -m "T4: istoricul retine profitNet, comisioane, brut si investit"
```

---

### Task 5: Banda BANII

**Fișiere:**
- Modifică: `public/index.html` (card nou după `tbVerdictCard`)
- Modifică: `public/app.js` (desenarea, în `renderTabloBot`)
- Probe: `scripts/proba-ecran-tablou.mjs`

**Interfețe:**
- Consumă: `tbStare.bot` (câmpurile `investit`, `profitNet`, `comisioane`,
  `finantare`, `gridProfitBrut`), `tbStare.boti`, ruta
  `/api/pionex-account?action=balances`
- Produce: `#tbBani`, `#tbBaniProfit`, `#tbBotiLista`, `#tbSolduri`

- [ ] **Pasul 1: Scrie probele care pică**

```js
    await test("26. banda BANII arata profitul NET mai mare decat cifra bruta", async () => {
      await incarcaBotSanatos({ strategyId: "9601", baza: "ADA.PERP" });
      await b.ev(`navTo('tabloubot', true)`);
      await asteapta(400);
      const dim = await b.ev(`(() => {
        const net = document.getElementById('tbBaniProfit');
        const brut = document.querySelector('#tbBani .tbBrut');
        if (!net || !brut) return null;
        return { net: parseFloat(getComputedStyle(net).fontSize), brut: parseFloat(getComputedStyle(brut).fontSize) };
      })()`);
      assert.ok(dim, "banda BANII trebuie sa aiba si profitul net, si cifra bruta");
      assert.ok(dim.net > dim.brut,
        `profitul NET e eroul benzii; cifra bruta pacaleste. net=${dim.net}px brut=${dim.brut}px`);
    });

    await test("27. banda BANII spune ca marja din futures NU se vede", async () => {
      const text = await b.ev(`document.getElementById('tbBani').textContent`);
      assert.match(String(text), /futures/i,
        "omul trebuie sa afle ca nu vede tot contul, altfel crede ca il vede");
    });

    await test("28. cu mai multi boti, se arata TOTI, cu profitul net al fiecaruia", async () => {
      const unu = botBrut({ strategyId: "9701", baza: "ADA.PERP" });
      const doi = botBrut({ strategyId: "9702", baza: "SOL.PERP" });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(unu), botNormalizat(doi)] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`); await b.ev(`renderTabloBot()`);
      await asteapta(300);
      const randuri = await b.ev(`document.querySelectorAll('#tbBotiLista .accountRow').length`);
      assert.equal(randuri, 2, `ar trebui doi boti in lista, sunt ${randuri}`);
    });

    await test("29. un camp de bani LIPSA se scrie cu em-dash, nu cu 0,00", async () => {
      const fara = botNormalizat(botBrut({ strategyId: "9801", baza: "ADA.PERP" }));
      delete fara.profitNet;
      await seteazaMock(b, "botOrders", { corp: { bots: [fara] }, stare: 200 });
      await b.ev(`tbAduDate()`); await b.ev(`renderTabloBot()`);
      await asteapta(300);
      const t = await b.ev(`document.getElementById('tbBaniProfit').textContent`);
      assert.ok(!/^0[.,]00/.test(String(t).trim()),
        `un profit necunoscut scris ca 0,00 se citeste ca "n-am castigat nimic": "${t}"`);
      assert.match(String(t), /—/, "lipsa se scrie cu em-dash");
    });
```

- [ ] **Pasul 2: Rulează și privește cum pică**

Rulează: `npm run test:ecran` → probele 26–29 `PICA` (`#tbBani` nu există).

- [ ] **Pasul 3: Scrie HTML-ul**

În `public/index.html`, imediat după `</div>` care închide `tbVerdictCard`:

```html
<div class="card full" id="tbBani"><div class="sectionHead"><h3>Banii</h3><span class="stockBadge" id="tbBaniSemn">—</span></div><div class="settingRow"><span>Profit net</span><b id="tbBaniProfit" style="font-size:26px">—</b></div><div class="settingRow"><span>Investit</span><b id="tbBaniInvestit">—</b></div><div class="settingRow"><span>Comisioane plătite</span><b id="tbBaniComision">—</b></div><div class="settingRow"><span>Finanțare</span><b id="tbBaniFinantare">—</b></div><div class="settingRow"><span>Profit brut de grid</span><b class="tbBrut" id="tbBaniBrut" style="font-size:12px">—</b></div><div class="sectionHead"><h3>Toți boții</h3></div><div class="accountRows" id="tbBotiLista"><div class="emptyState">—</div></div><div class="sectionHead"><h3>Solduri spot</h3></div><div class="accountRows" id="tbSolduri"><div class="emptyState">—</div></div><p class="small" id="tbBaniNota">Marja liberă din contul futures nu se vede încă aici — aplicația nu are încă o rută pentru ea.</p></div>
```

- [ ] **Pasul 4: Scrie desenarea**

În `public/app.js`, în `renderTabloBot`, după blocul care scrie `#tbMod`:

```js
  // Lipsa nu se scrie ca 0: un "0,00" si un "n-am de unde sti" se citesc complet
  // diferit, iar aici e vorba de banii lui.
  function tbBani(v,zecimale){
    var x=(v===null||v===undefined||v==="")?null:Number(v);
    return (x===null||!isFinite(x))?"—":x.toFixed(zecimale==null?2:zecimale);
  }
  if($("tbBaniProfit")){
    var bb=(!eroareActiva&&b)?b:null;
    $("tbBaniProfit").textContent=bb?tbBani(bb.profitNet):"—";
    $("tbBaniInvestit").textContent=bb?tbBani(bb.investit):"—";
    $("tbBaniComision").textContent=bb?tbBani(bb.comisioane):"—";
    $("tbBaniFinantare").textContent=bb?tbBani(bb.finantare):"—";
    $("tbBaniBrut").textContent=bb?("brut "+tbBani(bb.gridProfitBrut)):"—";
    var net=bb&&bb.profitNet!=null?Number(bb.profitNet):null;
    var inv=bb&&bb.investit!=null?Number(bb.investit):null;
    if($("tbBaniSemn"))$("tbBaniSemn").textContent=
      (net!==null&&inv!==null&&inv>0)?(tbFormateazaSemn(100*net/inv,2)+"%"):"—";
    var lista=$("tbBotiLista");
    if(lista){
      var boti=tbStare.boti||[];
      lista.innerHTML=boti.length?boti.map(function(x){
        return '<div class="accountRow"><div class="accountCell">'+escapeHtml(x.simbol||"—")+
          '</div><div class="accountCell">'+(x.activ?"activ":"oprit")+
          '</div><div class="accountCell">'+escapeHtml(tbBani(x.profitNet))+"</div></div>";
      }).join(""):'<div class="emptyState">Niciun bot.</div>';
    }
  }
```

- [ ] **Pasul 5: Rulează și verifică verde**

Rulează: `npm run test:ecran` → probele 26–29 `ok`.

- [ ] **Pasul 6: Măsoară prin stricare**

1. `font-size:26px` pe `#tbBaniProfit` → `font-size:11px` ⇒ pică proba 26
2. în `tbBani`, `return "—"` → `return "0.00"` ⇒ pică proba 29
3. scoate textul „futures" din `#tbBaniNota` ⇒ pică proba 27

- [ ] **Pasul 7: Commit**

```bash
git add public/index.html public/app.js scripts/proba-ecran-tablou.mjs
git commit -m "T5: banda BANII - profitul net e eroul, toti botii, lipsa nu e zero"
```

---

### Task 6: Soldurile spot în banda BANII

**Fișiere:**
- Modifică: `public/app.js`
- Probe: `scripts/proba-ecran-tablou.mjs`

**Interfețe:**
- Consumă: `/api/pionex-account?action=balances`
- Produce: umple `#tbSolduri`; `tbStare.solduri`

- [ ] **Pasul 1: Scrie proba care pică**

```js
    await test("30. soldurile spot se arata, doar cele nenule, cel mai mare primul", async () => {
      await seteazaMock(b, "cont", { corp: { data: { balances: [
        { coin: "USDT", free: "120.5", frozen: "0" },
        { coin: "ZERO", free: "0", frozen: "0" },
        { coin: "COTI", free: "3000", frozen: "0" }
      ] } }, stare: 200 });
      await b.ev(`tbAduSolduri()`);
      await asteapta(500);
      const randuri = await b.ev(`Array.from(document.querySelectorAll('#tbSolduri .accountRow')).map(r=>r.textContent)`);
      assert.equal(randuri.length, 2, `doar monedele cu sold nenul: ${JSON.stringify(randuri)}`);
      assert.match(String(randuri[0]), /COTI/, "cel mai mare sold sta primul");
    });

    await test("31. daca soldurile nu vin, se scrie de ce - nu raman gol", async () => {
      await seteazaMock(b, "cont", { reteaPicata: true });
      await b.ev(`tbAduSolduri()`);
      await asteapta(500);
      const t = await b.ev(`document.getElementById('tbSolduri').textContent`);
      assert.ok(String(t).trim().length > 2, "un panou gol nu spune daca nu sunt bani sau daca n-am putut citi");
      assert.ok(!/^—$/.test(String(t).trim()), "em-dash singur nu explica nimic");
    });
```

**Notă pentru implementator:** harnașamentul de probe mimează rutele după cheie.
Adaugă în `scripts/proba-ecran-tablou.mjs`, acolo unde sunt interceptate
`botOrders` și `market`, aceeași tratare pentru calea `/api/pionex-account`, sub
cheia `cont`.

- [ ] **Pasul 2: Rulează și privește cum pică**

Rulează: `npm run test:ecran` → probele 30–31 `PICA` cu `tbAduSolduri is not defined`.

- [ ] **Pasul 3: Scrie implementarea**

În `public/app.js`, după `tbAduDate`:

```js
async function tbAduSolduri(){
  var box=$("tbSolduri");if(!box)return;
  try{
    var d=await getJSON("/api/pionex-account?action=balances");
    var lista=(d&&d.data&&d.data.balances)||[];
    var cu=lista.map(function(x){
      var liber=Number(x.free||0),blocat=Number(x.frozen||0);
      return {coin:x.coin,total:(isFinite(liber)?liber:0)+(isFinite(blocat)?blocat:0)};
    }).filter(function(x){return x.total>0}).sort(function(a,b){return b.total-a.total});
    tbStare.solduri=cu;
    box.innerHTML=cu.length?cu.map(function(x){
      return '<div class="accountRow"><div class="accountCell">'+escapeHtml(x.coin||"—")+
        '</div><div class="accountCell">'+escapeHtml(x.total.toFixed(6))+"</div></div>";
    }).join(""):'<div class="emptyState">Niciun sold nenul in contul spot.</div>';
  }catch(e){
    // Un panou gol nu spune daca nu sunt bani sau daca n-am putut citi.
    tbStare.solduri=null;
    box.innerHTML='<div class="emptyState">Nu am putut citi soldurile: '+escapeHtml(e.message||"eroare")+"</div>";
  }
}
```

Cheam-o din `tbColectorTick()`, dar **doar când panoul e vizibil** (soldurile nu
se schimbă des și nu merită o cerere la 60 s în fundal):

```js
function tbColectorTick(){
  return tbAduDate().then(function(){
    if(tbPanouVizibil()){tbAduSolduri();renderTabloBot()}
  });
}
```

- [ ] **Pasul 4: Rulează și verifică verde**

Rulează: `npm run test:ecran` → probele 30–31 `ok`.

- [ ] **Pasul 5: Măsoară prin stricare**

1. `.filter(function(x){return x.total>0})` → `.filter(function(){return true})`
   ⇒ pică proba 30
2. în `catch`, `box.innerHTML='...'` → `box.innerHTML=''` ⇒ pică proba 31

- [ ] **Pasul 6: Commit**

```bash
git add public/app.js scripts/proba-ecran-tablou.mjs
git commit -m "T6: soldurile spot in banda BANII, cu motivul la vedere cand nu vin"
```

---

### Task 7: Banda DOVADA și direcția nedovedită

**Fișiere:**
- Modifică: `public/index.html` (card nou după cardul „Cele șapte măsuri")
- Modifică: `public/app.js`
- Probe: `scripts/proba-ecran-tablou.mjs`

**Interfețe:**
- Consumă: `TabloBot.frecvente(istoric, bot, acum)` (T1), `m.eficienta`,
  `m.directieBot`
- Produce: `#tbDovada`, `#tbDirectie`

- [ ] **Pasul 1: Scrie probele care pică**

```js
    await test("32. frecventele apar cu ACOPERIREA alaturi, nu doar procentul", async () => {
      await seedIstoricCopt(b, "9901", 120, 0.5);
      await incarcaBotSanatos({ strategyId: "9901", baza: "ADA.PERP" });
      await b.ev(`navTo('tabloubot', true)`);
      await asteapta(400);
      const t = await b.ev(`document.getElementById('tbDovada').textContent`);
      assert.match(String(t), /observat/i,
        `"82%" fara acoperire se citeste ca si cum am fi privit tot timpul: "${String(t).slice(0,200)}"`);
    });

    await test("33. directia e marcata NEDOVEDITA si arata cifra contrara", async () => {
      const t = await b.ev(`document.getElementById('tbDirectie').textContent`);
      assert.match(String(t), /NEDOVEDIT/,
        "un semn de directie nemarcata se citeste ca o prezicere");
      assert.match(String(t), /0,112R|0\.112R/,
        "cifra care contrazice trebuie sa stea LANGA semn, nu ascunsa");
    });

    await test("34. cu istoric scurt, frecventele scriu ca n-au date - nu zero", async () => {
      await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('tabloBotIstoric_v1_')).forEach(k=>localStorage.removeItem(k))`);
      await incarcaBotSanatos({ strategyId: "9902", baza: "ADA.PERP" });
      await b.ev(`renderTabloBot()`);
      await asteapta(300);
      const t = await b.ev(`document.getElementById('tbDovada').textContent`);
      assert.ok(!/\b0%/.test(String(t)),
        `fara istoric, "0%" minte - inseamna "niciodata", nu "nu stiu": "${String(t).slice(0,200)}"`);
    });
```

- [ ] **Pasul 2: Rulează și privește cum pică**

Rulează: `npm run test:ecran` → probele 32–34 `PICA` (`#tbDovada` nu există).

- [ ] **Pasul 3: Scrie HTML-ul**

În `public/index.html`, după cardul care conține `id="tbMasuri"`:

```html
<div class="card full" id="tbDovadaCard"><div class="sectionHead"><h3>Dovada</h3></div><div class="accountRows" id="tbDovada"><div class="emptyState">—</div></div><p class="small" id="tbDirectie">—</p><p class="small">Frecvențele se socotesc cu marginile de acum ale gridului. Dacă ai mutat intervalul recent, ele descriu prețul vechi față de gridul nou.</p></div>
```

- [ ] **Pasul 4: Scrie desenarea**

În `public/app.js`, în `renderTabloBot`, după blocul benzii BANII:

```js
  if($("tbDovada")){
    var f=TabloBot.frecvente(ist,brut,Date.now());
    function tbRandDovada(nume,x,sufix,zecimale){
      var val=x.stare==="nu-se-poate"?"—":
        (Number(x.valoare).toFixed(zecimale==null?1:zecimale)+(sufix||""));
      var spune=x.stare==="nu-se-poate"?"n-am destule măsurători":
        (x.stare==="putin"?"puține măsurători":"dovedit");
      if(x.acoperire!=null&&x.stare!=="nu-se-poate")spune+=" · observat "+x.acoperire+"% din interval";
      return '<div class="accountRow"><div class="accountCell">'+escapeHtml(nume)+
        '</div><div class="accountCell">'+escapeHtml(val)+
        '</div><div class="accountCell">'+escapeHtml(spune)+"</div></div>";
    }
    $("tbDovada").innerHTML=
      tbRandDovada("Timp în interval",f.timpInInterval,"%")+
      tbRandDovada("Cât de des la margine",f.desLaMargine,"%")+
      tbRandDovada("Perechi pe oră",f.perechiPeOra,"")+
      tbRandDovada("Net pe zi (observat)",f.netPeZi,"",2);
    if($("tbDirectie")){
      var sem=m.directieBot>0?"în sus":(m.directieBot<0?"în jos":"neclar");
      $("tbDirectie").textContent="Semn: "+sem+" · NEDOVEDIT — nu s-a dovedit că prezice. "+
        "Prin replay, o direcție căutată a dat −0,112R; pe 119 tranzacții intervalul de încredere cuprinde zero.";
    }
  }
```

- [ ] **Pasul 5: Rulează și verifică verde**

Rulează: `npm run test:ecran` → probele 32–34 `ok`.

- [ ] **Pasul 6: Măsoară prin stricare**

1. scoate `spune+=" · observat "+...` ⇒ pică proba 32
2. scoate `"NEDOVEDIT"` din textul direcției ⇒ pică proba 33
3. în `tbRandDovada`, `x.stare==="nu-se-poate"?"—"` → `Number(x.valoare||0).toFixed(1)+"%"`
   ⇒ pică proba 34

- [ ] **Pasul 7: Commit**

```bash
git add public/index.html public/app.js scripts/proba-ecran-tablou.mjs
git commit -m "T7: banda DOVADA cu acoperire, si directia marcata NEDOVEDITA"
```

---

### Task 8: Graficul

**Fișiere:**
- Modifică: `public/index.html` (card nou după cardul „Preț și interval")
- Modifică: `public/app.js`
- Probe: `scripts/proba-ecran-tablou.mjs`

**Interfețe:**
- Consumă: `TabloBot.geometrieGrafic(istoric, bot, acum)` (T2)
- Produce: `#tbGrafic` (un `<svg>` construit în cod)

- [ ] **Pasul 1: Scrie probele care pică**

```js
    await test("35. graficul deseneaza banda gridului si linia pretului", async () => {
      await seedIstoricCopt(b, "9A01", 120, 0.5);
      await incarcaBotSanatos({ strategyId: "9A01", baza: "ADA.PERP" });
      await b.ev(`navTo('tabloubot', true)`);
      await asteapta(500);
      const n = await b.ev(`(() => {
        const g = document.getElementById('tbGrafic');
        return { cai: g.querySelectorAll('path').length, banda: g.querySelectorAll('rect.tbBanda').length };
      })()`);
      assert.ok(n.cai >= 1, "ar trebui cel putin o linie de pret");
      assert.equal(n.banda, 1, "banda gridului trebuie desenata o data");
    });

    await test("36. o gaura in istoric da DOUA cai, nu una trasa peste gol", async () => {
      const cai = await b.ev(`(() => {
        const acum = Date.now();
        const l = [];
        for (let i = 120; i >= 0; i--) {
          if (i < 90 && i > 60) continue;           // gaura de 30 de minute
          l.push({ t: acum - i*60000, perechi: 120-i, pretPerp: 0.0155, pretSpot: 0.0155,
                   profitNet: 1, comisioane: 0, gridProfitBrut: 1, investit: 100 });
        }
        tbStare.istoric = l; renderTabloBot();
        return document.getElementById('tbGrafic').querySelectorAll('path.tbLinie').length;
      })()`);
      assert.equal(cai, 2, `o gaura de 30 de minute trebuie sa rupa linia in doua, sunt ${cai}`);
    });

    await test("37. cu prea putine puncte scrie de ce, nu deseneaza o axa goala", async () => {
      const t = await b.ev(`(() => {
        tbStare.istoric = [{ t: Date.now(), perechi: 1, pretPerp: 0.0155, pretSpot: 0.0155 }];
        renderTabloBot();
        return document.getElementById('tbGrafic').textContent;
      })()`);
      assert.match(String(t), /puține|putine/i,
        `un grafic gol care pare un grafic e mai rau decat niciunul: "${t}"`);
    });
```

- [ ] **Pasul 2: Rulează și privește cum pică**

Rulează: `npm run test:ecran` → probele 35–37 `PICA` (`#tbGrafic` nu există).

- [ ] **Pasul 3: Scrie HTML-ul**

În `public/index.html`, după cardul care conține `id="tbRigla"`:

```html
<div class="card full"><div class="sectionHead"><h3>Prețul față de grid, 24 h</h3></div><div id="tbGrafic" style="width:100%;min-height:150px"></div></div>
```

- [ ] **Pasul 4: Scrie desenarea**

În `public/app.js`, în `renderTabloBot`, după banda DOVADA:

```js
  if($("tbGrafic")){
    var g=TabloBot.geometrieGrafic(ist,brut,Date.now());
    if(!g.destul){
      $("tbGrafic").innerHTML='<div class="emptyState">Prea puține măsurători ca să desenez ceva onest. '+
        'Lasă aplicația deschisă.</div>';
    }else{
      var W=600,H=150,sus=function(y){return H-y*H};   // y=0 e jos
      var buc=[];
      if(g.banda)buc.push('<rect class="tbBanda" x="0" y="'+sus(g.banda.sus).toFixed(1)+
        '" width="'+W+'" height="'+((g.banda.sus-g.banda.jos)*H).toFixed(1)+
        '" fill="currentColor" opacity="0.12"></rect>');
      if(g.lichidare!==null)buc.push('<line x1="0" x2="'+W+'" y1="'+sus(g.lichidare).toFixed(1)+
        '" y2="'+sus(g.lichidare).toFixed(1)+'" stroke="currentColor" stroke-width="1" '+
        'stroke-dasharray="4 3" opacity="0.6"></line>');
      for(var si=0;si<g.segmente.length;si++){
        var s=g.segmente[si];if(s.length<2)continue;
        var d="M"+s.map(function(p){return (p.x*W).toFixed(1)+" "+sus(p.y).toFixed(1)}).join(" L");
        buc.push('<path class="tbLinie" d="'+d+'" fill="none" stroke="currentColor" stroke-width="1.6"></path>');
      }
      $("tbGrafic").innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+
        '" preserveAspectRatio="none" role="img" aria-label="Prețul față de intervalul gridului">'+
        buc.join("")+"</svg>";
    }
  }
```

- [ ] **Pasul 5: Rulează și verifică verde**

Rulează: `npm run test:ecran` → probele 35–37 `ok`.

- [ ] **Pasul 6: Măsoară prin stricare**

1. în `geometrieGrafic`, pragul găurii `> GAURA_GRAFIC_MS` → `> GAURA_GRAFIC_MS*100`
   ⇒ pică proba 36
2. `if(!g.destul)` → `if(false)` ⇒ pică proba 37
3. scoate linia care adaugă `rect.tbBanda` ⇒ pică proba 35

- [ ] **Pasul 7: Commit**

```bash
git add public/index.html public/app.js scripts/proba-ecran-tablou.mjs
git commit -m "T8: graficul - banda gridului, linia pretului, gaurile raman gauri"
```

---

### Task 9: Versiunea și proba de ecran întreagă

**Fișiere:**
- Modifică: `package.json`, `public/sw.js`, `public/index.html`, `BUILD_INFO.json`,
  `scripts/proba-ecran-tablou.mjs`

- [ ] **Pasul 1: Urcă versiunea în toate cele cinci locuri**

`package.json` → `"version": "75.0.0"`
`public/sw.js` → `const CACHE="crypto-radar-v75";`
`public/index.html` → badge `>v75 · TABLOUL UNIC<`
`BUILD_INFO.json` → `"version": "v75"`, `"badge": "v75 · TABLOUL UNIC"`,
`"baseRelease": "v74.5 · TABLOUL BOTULUI"`
`scripts/proba-ecran-tablou.mjs` → cele trei locuri care caută `v74.5`

**De ce contează:** `APP_SHELL` se servește cache-first, iar `index.html` e
network-first. Dacă numele cache-ului rămâne în urmă, omul vede badge-ul nou
peste cod vechi. Garda din `scripts/syntax-v71.mjs` pică dacă uiți.

- [ ] **Pasul 2: Rulează tot**

```bash
npm test
npm run test:ecran
```
Așteptat: ambele verzi, `npm run test:ecran` cu cel puțin 37 de scenarii.

- [ ] **Pasul 3: Curăță**

Oprește `wrangler`/`workerd`/Chrome pornite de probe, verifică portul 8788 liber,
șterge dosarele de profil din `%TEMP%`. **Nu atinge** `.dev.vars` (e al lui
Marius), `panou.mjs` și `uvicorn` de pe 8787.

- [ ] **Pasul 4: Commit**

```bash
git add -A
git commit -m "T9: v75 - tabloul unic, versiune urcata in toate cele cinci locuri"
```

---

## Autoverificare a planului

**1. Acoperirea specului:**

| cerință din spec | sarcina |
|---|---|
| B1 colectarea în fundal, 8s/60s, fără WS, pană de rută | T3 |
| B1 câmpuri noi în istoric | T4 |
| B2 banda BANII, profit net erou, toți boții | T5 |
| B2 soldurile spot | T6 |
| B2 nota despre futures | T5 (proba 27) |
| B3 banda PERICOLUL | — **vezi mai jos** |
| B4 frecvențe, rate vs stare, acoperire | T1 + T7 |
| B5 graficul, cele 5 reguli | T2 + T8 |
| B6 direcția marcată NEDOVEDITĂ | T7 |
| Etapa A (futures) | **în afara acestui plan**, începe cu o sondă |

**Gol găsit și tranșat:** banda PERICOLUL (B3) nu are sarcină proprie. Cele trei
cifre ale ei — poziția în interval, distanța până la lichidare, starea marginii —
**sunt deja desenate** în cardul „Preț și interval" și în „Cele șapte măsuri", iar
`OPRESTE` le acoperă pe toate în verdict. Un card nou care le repetă ar fi
duplicare, nu informație. **Hotărâre:** B3 se consideră acoperit de ecranul
existent plus graficul din T8, care adaugă exact ce lipsea — vederea în timp.
Dacă Marius vrea totuși o bandă separată, se adaugă după ce vede ecranul.

**2. Scanare de locuri goale:** niciun „TBD", „TODO" sau pas fără cod.

**3. Consistența numelor:** `frecvente()` și `geometrieGrafic()` se cheamă la fel
în T1/T2 (definire) și T7/T8 (folosire). `tbColectorTick`, `tbColectorPornit`,
`tbColectorOprit`, `tbAduSolduri`, `tbBani` apar cu același nume peste tot.
Câmpurile de istoric adăugate în T4 (`profitNet`, `comisioane`, `gridProfitBrut`,
`investit`) sunt exact cele citite de `frecvente()` în T1.
