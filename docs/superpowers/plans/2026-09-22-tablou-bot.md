# Tabloul botului — plan de implementare

> **Pentru cine execută:** folosește `superpowers:subagent-driven-development`
> (recomandat) sau `superpowers:executing-plans`. Pașii au căsuțe (`- [ ]`).

**Scopul:** un ecran care pune botul de grid Pionex în centru și dă un singur
verdict despre ce trebuie făcut acum, cu cifra care l-a declanșat la vedere.

**Arhitectura:** un modul pur, fără DOM și fără rețea (`public/lib/tablou-bot.js`),
care primește cifre și întoarce măsuri și verdict. Legarea (WebSocket Binance,
polling la serverul local, randare) stă în `app.js`. Motoarele existente nu se
ating.

**Unelte:** JavaScript simplu, fără framework. Probe cu `node:assert/strict` și
ajutorul `test()` din `scripts/*.mjs`. Chrome prin CDP pentru proba de ecran.

**Spec:** `docs/superpowers/specs/2026-09-22-tablou-bot-design.md` — se citește
împreună cu planul.

## Constrângeri peste tot

- **Read-only.** Nicio rută care scrie la Pionex. Nicio pornire sau oprire automată.
- **Română fără diacritice în cod și comentarii**; cu diacritice în textul de pe ecran.
- `public/index.html` are terminații **LF**; `public/app.js` are **CRLF**. Orice
  patch ia terminația din fișier.
- Fișierele noi de sub `public/` intră în `APP_SHELL` din `public/sw.js`.
- CSP e `script-src 'self'`: fără scripturi inline, fără `onclick=`. Butoanele
  folosesc `data-action-click="numeFunctie(argumente)"`.
- Fiecare gardă se măsoară **prin stricare** înainte de a fi crezută.
- `npm test` trebuie să rămână verde la fiecare commit.
- Modulul pur **nu** are voie să cheme `fetch`, să atingă `document` sau `window`
  în afara liniei finale de export.

---

### Task 1: Modulul pur — traducerea simbolului și cele șapte măsuri

**Fișiere:**
- Creează: `public/lib/tablou-bot.js`
- Creează: `scripts/tablou-bot-v73.mjs`
- Modifică: `package.json` (adaugă `test:tablou`, îl pune în lanțul `test`)
- Modifică: `public/sw.js` (adaugă `/lib/tablou-bot.js` în `APP_SHELL`)

**Interfețe produse:**
```
simboluri(base, quote) -> {pionex: string, binance: string}
masoara({bot, klinePerp, pretSpot, istoric, acum}) -> masuri
```
`masuri` are câmpurile: `pozitieInterval`, `ritmPerechi`, `eficienta`,
`amplitudine`, `lichidare`, `basis`, `comision` — fiecare
`{valoare, stare, prag}` — plus `varstaBotMin`, `lumanari`, `istoricMin`.
`stare` e una din `"bine" | "margine" | "afara" | "rau" | "nu-se-poate"`.

- [ ] **Pasul 1: Scrie proba care pică**

În `scripts/tablou-bot-v73.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = fs.readFileSync(new URL("../public/lib/tablou-bot.js", import.meta.url), "utf8");
const T = new Function(`${SRC}; return TabloBot;`)();

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  return Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

console.log("\nV73 · tabloul botului · proba");

await test("traduce simbolul botului pentru ambele burse", () => {
  const s = T.simboluri("COTI.PERP", "USDT");
  assert.equal(s.pionex, "COTI_USDT_PERP");
  assert.equal(s.binance, "COTIUSDT");
});

await test("un simbol fara .PERP ramane pereche simpla", () => {
  const s = T.simboluri("COTI", "USDT");
  assert.equal(s.pionex, "COTI_USDT");
  assert.equal(s.binance, "COTIUSDT");
});

console.log(`\nV73_TABLOU ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
```

- [ ] **Pasul 2: Rulează și vezi că pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: crapă cu `Cannot find module` sau `TabloBot is not defined` — fișierul
`public/lib/tablou-bot.js` nu există încă.

- [ ] **Pasul 3: Scrie minimul care trece**

`public/lib/tablou-bot.js`:

```js
// Modul PUR: primeste cifre, intoarce masuri si verdict.
// Fara DOM, fara retea, fara localStorage - ca sa poata fi probat in Node.
var TabloBot = (function () {
  // "COTI.PERP" + "USDT" -> Pionex "COTI_USDT_PERP", Binance "COTIUSDT"
  function simboluri(base, quote) {
    var b = String(base || ""), q = String(quote || "USDT");
    var perp = b.slice(-5) === ".PERP";
    var moneda = perp ? b.slice(0, -5) : b;
    return {
      pionex: perp ? moneda + "_" + q + "_PERP" : moneda + "_" + q,
      binance: (moneda + q).toUpperCase(),
    };
  }
  return { simboluri: simboluri };
})();
if (typeof globalThis !== "undefined") globalThis.TabloBot = TabloBot;
```

- [ ] **Pasul 4: Rulează și vezi că trece**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS · 2/2`

- [ ] **Pasul 5: Leagă proba în npm și fișierul în service worker**

În `package.json`, adaugă `"test:tablou": "node scripts/tablou-bot-v73.mjs"` și
pune ` && npm run test:tablou` la coada lui `"test"`.

În `public/sw.js`, adaugă `"/lib/tablou-bot.js"` în `APP_SHELL`.

Rulează: `npm test` — toate suitele trec.

- [ ] **Pasul 6: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs package.json public/sw.js
git commit -m "Tabloul botului: modulul pur si traducerea simbolului"
```

- [ ] **Pasul 7: Scrie probele pentru cele sapte masuri**

Adaugă în `scripts/tablou-bot-v73.mjs`, înainte de linia finală. Botul de probă
copiază cifrele reale de pe 22.09:

```js
const BOT = {
  strategyId: "2377", base: "COTI.PERP", quote: "USDT",
  createTime: Date.now() - 5 * 3600000,
  buOrderData: {
    status: "running", bottom: "0.0153", top: "0.0158", row: 25,
    trend: "long", leverage: 5, position: "20628",
    gridProfit: "2.30", totalFee: "-0.45", totalRealizedProfit: "1.00",
    exchangeOrderPairedCount: 42,
    estimateLiquidationPriceDown: "0.0124", estimateLiquidationPriceUp: "0",
    riskStatus: "TRADING", marginStatus: "NORMAL",
  },
};
// 48 de lumanari care oscileaza: zigzag curat, eficienta aproape de zero
const ZIGZAG = Array.from({ length: 48 }, (_, i) => ({ close: i % 2 ? 0.0156 : 0.0154 }));
// 48 de lumanari care urca drept: eficienta 1
const TREND = Array.from({ length: 48 }, (_, i) => ({ close: 0.0150 + i * 0.00002 }));
const ISTORIC = Array.from({ length: 400 }, (_, i) => ({
  t: Date.now() - (400 - i) * 60000, perechi: i, pretPerp: 0.0155, pretSpot: 0.0155,
}));
const INTRARI = { bot: BOT, klinePerp: ZIGZAG, pretSpot: 0.0155, istoric: ISTORIC, acum: Date.now() };

await test("pozitia in interval se socoteste in procente", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.01555 }) });
  assert.ok(Math.abs(m.pozitieInterval.valoare - 50) < 1,
    `pozitia gresita: ${m.pozitieInterval.valoare}`);
  assert.equal(m.pozitieInterval.stare, "bine");
});

await test("pozitia lipita de marginea de sus e raportata ca margine", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.01577 }) });
  assert.equal(m.pozitieInterval.stare, "margine", `stare: ${m.pozitieInterval.stare}`);
});

await test("pretul iesit din interval e raportat ca afara", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0161 }) });
  assert.equal(m.pozitieInterval.stare, "afara");
  assert.ok(m.pozitieInterval.valoare > 100);
});

await test("zigzagul da eficienta mica, trendul o da mare", () => {
  const z = T.masoara({ ...INTRARI, klinePerp: ZIGZAG });
  const t = T.masoara({ ...INTRARI, klinePerp: TREND });
  assert.ok(z.eficienta.valoare < 0.30, `zigzag: ${z.eficienta.valoare}`);
  assert.ok(t.eficienta.valoare > 0.60, `trend: ${t.eficienta.valoare}`);
  assert.equal(t.eficienta.semn, 1, "trendul urca, semnul trebuie sa fie +1");
});

await test("amplitudinea se raporteaza la treapta grilei", () => {
  const m = T.masoara(INTRARI);
  // treapta = (0.0158 - 0.0153) / 25 = 0.00002
  assert.ok(m.amplitudine.valoare > 0, `amplitudine: ${m.amplitudine.valoare}`);
});

await test("fara `row` amplitudinea spune ca nu se poate, nu ghiceste", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, row: undefined } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.amplitudine.stare, "nu-se-poate");
  assert.equal(m.amplitudine.valoare, null);
});

await test("basis-ul e diferenta procentuala perp fata de spot", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0160 }), pretSpot: 0.0155 });
  assert.ok(Math.abs(m.basis.valoare - 3.2258) < 0.01, `basis: ${m.basis.valoare}`);
});

await test("un basis mare dar OBISNUIT nu tipa", () => {
  // istoric in care basis-ul sta de mult la ~3%
  const ist = ISTORIC.map((h) => ({ ...h, pretPerp: 0.01597, pretSpot: 0.0155 }));
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0160 }), pretSpot: 0.0155, istoric: ist });
  assert.equal(m.basis.stare, "bine", "3% e normal aici, n-are ce alarma");
});

await test("basis-ul care SARE peste dublul medianei e raportat rau", () => {
  // istoric linistit la ~0.1%, acum sare la 3.2%
  const ist = ISTORIC.map((h) => ({ ...h, pretPerp: 0.015515, pretSpot: 0.0155 }));
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0160 }), pretSpot: 0.0155, istoric: ist });
  assert.equal(m.basis.stare, "rau", `mediana ${m.basis.mediana}, acum ${m.basis.valoare}`);
});

await test("comisionul se raporteaza la profitul brut din grid", () => {
  const m = T.masoara(INTRARI);
  assert.ok(Math.abs(m.comision.valoare - 0.45 / 2.30) < 1e-6, `comision: ${m.comision.valoare}`);
  assert.equal(m.comision.stare, "bine");
});

await test("comisionul care mananca peste jumatate din grid e rau", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, totalFee: "-1.50" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.stare, "rau");
});

await test("fara bot, masurile care cer bot spun asta si nu crapa", () => {
  const m = T.masoara({ ...INTRARI, bot: null });
  for (const camp of ["pozitieInterval", "ritmPerechi", "amplitudine", "lichidare", "comision"]) {
    assert.equal(m[camp].stare, "nu-se-poate", `${camp}: ${m[camp].stare}`);
  }
  assert.ok(Number.isFinite(m.eficienta.valoare), "eficienta se poate socoti si fara bot");
});
```

- [ ] **Pasul 8: Rulează și vezi cum pică fiecare**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: toate cele 10 probe noi pică cu `T.masoara is not a function`.

- [ ] **Pasul 9: Scrie `masoara`**

În `public/lib/tablou-bot.js`, înăuntrul funcției anonime, înainte de `return`:

```js
  function nr(v) { var x = Number(v); return isFinite(x) ? x : null; }
  var NECUNOSCUT = { valoare: null, stare: "nu-se-poate", prag: null };

  // Kaufman: cat din miscarea totala a fost intr-o singura directie.
  // 0 = zigzag curat, 1 = trend curat.
  function eficienta(inchideri) {
    if (!inchideri || inchideri.length < 2) return { valoare: null, semn: 0 };
    var net = inchideri[inchideri.length - 1] - inchideri[0], drum = 0;
    for (var i = 1; i < inchideri.length; i++) drum += Math.abs(inchideri[i] - inchideri[i - 1]);
    if (!drum) return { valoare: 0, semn: 0 };
    return { valoare: Math.abs(net) / drum, semn: net > 0 ? 1 : net < 0 ? -1 : 0 };
  }

  function amplitudineMedie(lumanari, n) {
    if (!lumanari || lumanari.length < 2) return null;
    var felie = lumanari.slice(-n - 1), s = 0, c = 0;
    for (var i = 1; i < felie.length; i++) {
      s += Math.abs(nr(felie[i].close) - nr(felie[i - 1].close)); c++;
    }
    return c ? s / c : null;
  }

  function masoara(intrari) {
    var bot = intrari.bot, x = (bot && bot.buOrderData) || null;
    var lumanari = intrari.klinePerp || [];
    var inchideri = lumanari.map(function (k) { return nr(k.close); }).filter(function (v) { return v !== null; });
    var pretPerp = inchideri.length ? inchideri[inchideri.length - 1] : null;
    var pretSpot = nr(intrari.pretSpot);
    var istoric = intrari.istoric || [];
    var acum = intrari.acum || Date.now();

    var ef = eficienta(inchideri.slice(-48));

    var m = {
      varstaBotMin: bot && bot.createTime ? (acum - nr(bot.createTime)) / 60000 : 0,
      lumanari: inchideri.length,
      istoricMin: istoric.length ? (acum - nr(istoric[0].t)) / 60000 : 0,
      pretPerp: pretPerp,
      pretSpot: pretSpot,
      eficienta: { valoare: ef.valoare, semn: ef.semn, prag: { trend: 0.60, zigzag: 0.30 },
                   stare: ef.valoare === null ? "nu-se-poate" : ef.valoare > 0.60 ? "trend" : ef.valoare < 0.30 ? "zigzag" : "bine" },
      pozitieInterval: NECUNOSCUT, ritmPerechi: NECUNOSCUT, amplitudine: NECUNOSCUT,
      lichidare: NECUNOSCUT, comision: NECUNOSCUT,
      basis: NECUNOSCUT,
    };

    if (pretPerp !== null && pretSpot) {
      var b = 100 * (pretPerp - pretSpot) / pretSpot;
      // "Sarit" inseamna DOUA lucruri deodata: peste 1% in valoare absoluta SI
      // peste dublul medianei ultimelor 24 de masuratori. Fara a doua conditie,
      // un basis care sta linistit la 3% ar tipa incontinuu.
      var vechi = istoric.slice(-24).map(function (h) {
        var pp = nr(h.pretPerp), ps = nr(h.pretSpot);
        return pp && ps ? Math.abs(100 * (pp - ps) / ps) : null;
      }).filter(function (v) { return v !== null; }).sort(function (p, q) { return p - q; });
      var mediana = vechi.length ? vechi[Math.floor(vechi.length / 2)] : null;
      var sarit = Math.abs(b) > 1.0 && mediana !== null && Math.abs(b) > 2 * mediana;
      m.basis = { valoare: b, mediana: mediana, prag: 1.0,
        stare: sarit ? "rau" : "bine" };
    }
    if (!x) return m;

    var jos = nr(x.bottom), sus = nr(x.top);
    if (jos !== null && sus !== null && sus > jos && pretPerp !== null) {
      var p = 100 * (pretPerp - jos) / (sus - jos);
      m.pozitieInterval = {
        valoare: p, prag: { margine: 15, afara: 0 },
        stare: p < 0 || p > 100 ? "afara" : (p < 15 || p > 85) ? "margine" : "bine",
      };
      var linii = nr(x.row);
      if (linii && linii > 0) {
        var treapta = (sus - jos) / linii, amp = amplitudineMedie(lumanari, 14);
        if (amp !== null) m.amplitudine = { valoare: amp / treapta, prag: 1.0,
          stare: amp / treapta < 1.0 ? "rau" : "bine" };
      }
    }

    var lich = nr(x.estimateLiquidationPriceDown);
    if (pretPerp !== null && lich && lich > 0 && pretPerp > lich) {
      var d = 100 * (pretPerp - lich) / pretPerp;
      m.lichidare = { valoare: d, prag: { grav: 8, atentie: 15 },
        stare: d < 8 ? "rau" : d < 15 ? "margine" : "bine" };
    }

    var brut = nr(x.gridProfit), taxe = nr(x.totalFee);
    if (brut !== null && taxe !== null && brut > 0) {
      var r = Math.abs(taxe) / brut;
      m.comision = { valoare: r, prag: 0.50, stare: r > 0.50 ? "rau" : "bine" };
    }
    return m;
  }
```

Adaugă `masoara: masoara` în obiectul întors.

- [ ] **Pasul 10: Rulează și vezi că trec**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS · 12/12`

- [ ] **Pasul 11: Măsoară o gardă prin stricare**

Schimbă în `masoara` pragul `p < 15 || p > 85` în `p < 1 || p > 99`, rulează
proba: trebuie să pice „pozitia lipita de marginea de sus". Pune pragul la loc,
rulează din nou: trece. Dacă nu pică, garda nu e bună — repar-o.

- [ ] **Pasul 12: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "Tabloul botului: cele sapte masuri"
```

---

### Task 2: Ritmul perechilor, din istoric

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js`
- Modifică: `scripts/tablou-bot-v73.mjs`

**Interfețe consumate:** `masoara` din Task 1.
**Interfețe produse:** `masuri.ritmPerechi = {valoare, baza, stare, prag}` —
`valoare` = perechi în ultima oră, `baza` = media pe oră din ultimele 6 ore.

- [ ] **Pasul 1: Scrie probele care pică**

```js
// istoric de 7 ore: 10 perechi pe ora in primele 6, apoi 3 in ultima
function istoricCuRitm(peOra, ultimaOra) {
  var out = [], t0 = Date.now() - 7 * 3600000, perechi = 0;
  for (var min = 0; min < 7 * 60; min++) {
    var rata = min < 6 * 60 ? peOra : ultimaOra;
    if (min % Math.round(60 / rata) === 0) perechi++;
    out.push({ t: t0 + min * 60000, perechi: perechi, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  return out;
}

await test("ritmul compara ultima ora cu media ultimelor sase", () => {
  const m = T.masoara({ ...INTRARI, istoric: istoricCuRitm(10, 10) });
  assert.ok(Math.abs(m.ritmPerechi.valoare / m.ritmPerechi.baza - 1) < 0.35,
    `ritm ${m.ritmPerechi.valoare} fata de baza ${m.ritmPerechi.baza}`);
  assert.equal(m.ritmPerechi.stare, "bine");
});

await test("ritmul cazut sub 40% din baza e raportat rau", () => {
  const m = T.masoara({ ...INTRARI, istoric: istoricCuRitm(12, 3) });
  assert.equal(m.ritmPerechi.stare, "rau", `raport: ${m.ritmPerechi.valoare / m.ritmPerechi.baza}`);
});

await test("fara sase ore de istoric, ritmul spune ca n-are baza", () => {
  const scurt = istoricCuRitm(10, 10).slice(-60);
  const m = T.masoara({ ...INTRARI, istoric: scurt });
  assert.equal(m.ritmPerechi.stare, "nu-se-poate");
});
```

- [ ] **Pasul 2: Rulează și vezi că pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: cele trei probe noi pică — `ritmPerechi.stare` e `"nu-se-poate"` peste tot.

- [ ] **Pasul 3: Scrie socoteala**

În `masoara`, după blocul cu `comision`:

```js
    // Ritmul: perechi in ultima ora fata de media pe ora din ultimele 6.
    // `exchangeOrderPairedCount` e cumulativ, deci se scade intre capete.
    var ORA = 3600000;
    var inUrma = function (ms) {
      var tinta = acum - ms, cel = null;
      for (var i = 0; i < istoric.length; i++) if (nr(istoric[i].t) <= tinta) cel = istoric[i];
      return cel;
    };
    var acum0 = istoric.length ? istoric[istoric.length - 1] : null;
    var acum1 = inUrma(ORA), acum7 = inUrma(7 * ORA);
    if (acum0 && acum1 && acum7) {
      var ultima = nr(acum0.perechi) - nr(acum1.perechi);
      var baza = (nr(acum1.perechi) - nr(acum7.perechi)) / 6;
      m.ritmPerechi = { valoare: ultima, baza: baza, prag: 0.40,
        stare: baza > 0 && ultima / baza < 0.40 ? "rau" : "bine" };
    }
```

- [ ] **Pasul 4: Rulează și vezi că trec**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS · 15/15`

- [ ] **Pasul 5: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "Tabloul botului: ritmul perechilor fata de ultimele sase ore"
```

---

### Task 3: Modul botului — dedus și ales

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js`
- Modifică: `scripts/tablou-bot-v73.mjs`

**Interfețe produse:**
```
modBot(bot, alegeri) -> {mod: "GRID"|"DIRECTIONAL", presupus: boolean}
```
`alegeri` e obiectul `{ [strategyId]: "GRID"|"DIRECTIONAL" }` din `localStorage`.

- [ ] **Pasul 1: Scrie probele care pică**

```js
await test("fara nimic pus, botul e presupus GRID", () => {
  const r = T.modBot(BOT, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("un camp moving* il face DIRECTIONAL, tot presupus", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: "0.017" } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "DIRECTIONAL");
  assert.equal(r.presupus, true);
});

await test("alegerea omului bate deducerea", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: "0.017" } };
  const r = T.modBot(bot, { 2377: "GRID" });
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, false, "cand omul a ales, nu mai e presupunere");
});

await test("fara bot, modul e GRID si nu crapa", () => {
  const r = T.modBot(null, {});
  assert.equal(r.mod, "GRID");
});
```

- [ ] **Pasul 2: Rulează și vezi că pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: cele patru probe pică cu `T.modBot is not a function`.

- [ ] **Pasul 3: Scrie `modBot`**

```js
  var CAMPURI_MISCATOR = ["movingBottom", "movingTop", "movingIndicatorType",
    "movingTrailingUpParam", "movingTrailingDownParam"];

  function modBot(bot, alegeri) {
    var id = bot && bot.strategyId != null ? String(bot.strategyId) : null;
    var ales = id && alegeri && alegeri[id];
    if (ales === "GRID" || ales === "DIRECTIONAL") return { mod: ales, presupus: false };
    var x = (bot && bot.buOrderData) || {};
    for (var i = 0; i < CAMPURI_MISCATOR.length; i++) {
      var v = x[CAMPURI_MISCATOR[i]];
      if (v !== undefined && v !== null && v !== "" && v !== "0") {
        return { mod: "DIRECTIONAL", presupus: true };
      }
    }
    return { mod: "GRID", presupus: true };
  }
```

Adaugă `modBot: modBot` în obiectul întors.

- [ ] **Pasul 4: Rulează și vezi că trec**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS · 19/19`

- [ ] **Pasul 5: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "Tabloul botului: modul dedus din campurile moving*, alegerea omului il bate"
```

---

### Task 4: Verdictul — scara, în modul GRID

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js`
- Modifică: `scripts/tablou-bot-v73.mjs`

**Interfețe produse:**
```
verdict(masuri, mod) -> {nivel, titlu, ceFac, declansator: {masura, valoare, prag}}
```
`nivel` e unul din `"FARA_BOT" | "NEDOVEDIT" | "OPRESTE" | "PAZESTE" |
"REGLEAZA" | "OPORTUNITATE" | "LINISTE"`.

- [ ] **Pasul 1: Scrie probele care pică**

```js
// masuri fabricate: pornim de la "totul bine" si stricam cate una
function masuriBune() {
  return {
    varstaBotMin: 300, lumanari: 60, istoricMin: 400,
    pretPerp: 0.01555, pretSpot: 0.01555,
    pozitieInterval: { valoare: 50, stare: "bine", prag: { margine: 15 } },
    ritmPerechi: { valoare: 10, baza: 10, stare: "bine", prag: 0.40 },
    eficienta: { valoare: 0.2, semn: 1, stare: "zigzag", prag: { trend: 0.60, zigzag: 0.30 } },
    amplitudine: { valoare: 2.0, stare: "bine", prag: 1.0 },
    lichidare: { valoare: 20, stare: "bine", prag: { grav: 8, atentie: 15 } },
    basis: { valoare: 0.1, stare: "bine", prag: 1.0 },
    comision: { valoare: 0.2, stare: "bine", prag: 0.50 },
  };
}

await test("cand totul e bine, verdictul e LINISTE", () => {
  assert.equal(T.verdict(masuriBune(), "GRID").nivel, "LINISTE");
});

await test("botul prea tanar da NEDOVEDIT, nu verde", () => {
  const m = masuriBune(); m.varstaBotMin = 47;
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT");
  assert.match(v.titlu + v.ceFac, /47/, "trebuie sa spuna cate minute are");
});

await test("lichidarea sub 8% da OPRESTE", () => {
  const m = masuriBune(); m.lichidare = { valoare: 6.2, stare: "rau", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.equal(v.declansator.masura, "lichidare");
  assert.equal(v.declansator.valoare, 6.2);
  assert.equal(v.declansator.prag, 8);
});

await test("pretul iesit din interval da PAZESTE in GRID", () => {
  const m = masuriBune(); m.pozitieInterval = { valoare: 104, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "PAZESTE");
});

await test("amplitudinea moarta da REGLEAZA", () => {
  const m = masuriBune(); m.amplitudine = { valoare: 0.7, stare: "rau", prag: 1.0 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "amplitudine");
});

await test("ORDINEA scarii: cea mai grava bate, nu prima gasita", () => {
  const m = masuriBune();
  m.amplitudine = { valoare: 0.7, stare: "rau", prag: 1.0 };            // REGLEAZA
  m.pozitieInterval = { valoare: 104, stare: "afara", prag: { margine: 15 } }; // PAZESTE
  m.lichidare = { valoare: 6, stare: "rau", prag: { grav: 8, atentie: 15 } };  // OPRESTE
  assert.equal(T.verdict(m, "GRID").nivel, "OPRESTE");
});

await test("exact pe prag NU aprinde, un pas peste aprinde", () => {
  const m = masuriBune();
  m.lichidare = { valoare: 8, stare: "margine", prag: { grav: 8, atentie: 15 } };
  assert.notEqual(T.verdict(m, "GRID").nivel, "OPRESTE", "8% fix nu trebuie sa declanseze OPRESTE");
  m.lichidare = { valoare: 7.99, stare: "rau", prag: { grav: 8, atentie: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "OPRESTE");
});

await test("fara bot, verdictul e FARA_BOT si nu inventeaza cifre", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: null, stare: "nu-se-poate", prag: null };
  m.lichidare = { valoare: null, stare: "nu-se-poate", prag: null };
  const v = T.verdict(m, "GRID", { faraBot: true });
  assert.equal(v.nivel, "FARA_BOT");
  assert.equal(v.declansator, null);
});

await test("fiecare verdict poarta cifra si pragul care l-au dat", () => {
  const m = masuriBune(); m.comision = { valoare: 0.7, stare: "rau", prag: 0.50 };
  const v = T.verdict(m, "GRID");
  assert.ok(v.declansator, "lipseste declansatorul");
  assert.equal(v.declansator.masura, "comision");
  assert.equal(v.declansator.prag, 0.50);
});
```

- [ ] **Pasul 2: Rulează și vezi că pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: cele nouă probe pică cu `T.verdict is not a function`.

- [ ] **Pasul 3: Scrie `verdict`**

```js
  function trepte(m, mod, optiuni) {
    var o = optiuni || {}, d = function (masura, valoare, prag) {
      return { masura: masura, valoare: valoare, prag: prag };
    };
    if (o.faraBot) return { nivel: "FARA_BOT",
      titlu: "Niciun bot pornit",
      ceFac: "Urmaresc simbolul ales de tine. Cifrele care tin de grid nu se pot socoti.",
      declansator: null };

    if (m.varstaBotMin < 120 || m.lumanari < 48 || m.istoricMin < 30) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu stiu inca",
        ceFac: "Botul are " + Math.round(m.varstaBotMin) + " de minute. Ritmul are nevoie de vreo 2 ore ca sa insemne ceva.",
        declansator: d("varstaBot", Math.round(m.varstaBotMin), 120) };
    }

    if (m.lichidare.valoare !== null && m.lichidare.valoare < 8) {
      return { nivel: "OPRESTE", titlu: "Iesi",
        ceFac: "Mai sunt " + m.lichidare.valoare.toFixed(1) + "% pana la lichidare.",
        declansator: d("lichidare", m.lichidare.valoare, 8) };
    }

    var directie = m.eficienta.semn;
    if (mod === "DIRECTIONAL") {
      if (m.eficienta.stare === "trend" && m.directieBot && directie && directie !== m.directieBot) {
        return { nivel: "PAZESTE", titlu: "Trendul s-a intors impotriva ta",
          ceFac: "Miscarea e hotarata, dar in sens invers pozitiei tale.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
      if (m.pozitieInterval.stare === "afara") {
        var inFavoare = (m.pozitieInterval.valoare > 100 && m.directieBot === 1)
          || (m.pozitieInterval.valoare < 0 && m.directieBot === -1);
        if (inFavoare) return { nivel: "OPORTUNITATE", titlu: "A trecut de interval in favoarea ta",
          ceFac: "Cantareste daca iei profitul sau muti grid-ul dupa el.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, 100) };
        return { nivel: "PAZESTE", titlu: "A iesit din interval impotriva ta",
          ceFac: "Pozitia merge in sens invers.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, 0) };
      }
    } else {
      if (m.pozitieInterval.stare === "afara") {
        return { nivel: "PAZESTE", titlu: "Pretul a iesit din interval",
          ceFac: "Nu mai castigi din oscilatie, tii doar o pozitie pe directie.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, 100) };
      }
      if (m.eficienta.stare === "trend" && m.pozitieInterval.stare === "margine") {
        return { nivel: "PAZESTE", titlu: "Trend, cu pretul la margine",
          ceFac: "Grid-ul e pe cale sa ramana in urma.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
    }

    if (m.lichidare.valoare !== null && m.lichidare.valoare < 15) {
      return { nivel: "PAZESTE", titlu: "Lichidarea e aproape",
        ceFac: "Mai sunt " + m.lichidare.valoare.toFixed(1) + "% pana acolo.",
        declansator: d("lichidare", m.lichidare.valoare, 15) };
    }

    if (mod === "DIRECTIONAL" && m.eficienta.stare === "zigzag") {
      return { nivel: "REGLEAZA", titlu: "Piata nu merge nicaieri",
        ceFac: "Platesti comisioane intr-un interval, desi pariezi pe directie.",
        declansator: d("eficienta", m.eficienta.valoare, 0.30) };
    }
    if (m.amplitudine.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Oscilatia a scazut sub o treapta",
        ceFac: "Botul nu mai prinde perechi, dar comisioanele curg.",
        declansator: d("amplitudine", m.amplitudine.valoare, 1.0) };
    }
    if (m.comision.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Comisioanele mananca gridul",
        ceFac: "Peste jumatate din castigul brut se duce pe taxe.",
        declansator: d("comision", m.comision.valoare, 0.50) };
    }
    if (mod !== "DIRECTIONAL" && m.ritmPerechi.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Ritmul a cazut",
        ceFac: m.ritmPerechi.valoare + " perechi in ultima ora, fata de " + Math.round(m.ritmPerechi.baza) + " obisnuit.",
        declansator: d("ritmPerechi", m.ritmPerechi.valoare, m.ritmPerechi.baza * 0.40) };
    }
    if (mod !== "DIRECTIONAL" && m.pozitieInterval.stare === "margine") {
      return { nivel: "REGLEAZA", titlu: "Stai lipit de o margine",
        ceFac: "Cantareste mutarea intervalului.",
        declansator: d("pozitieInterval", m.pozitieInterval.valoare, 85) };
    }
    if (m.basis.stare === "rau") {
      return { nivel: "OPORTUNITATE", titlu: "Perpetua s-a rupt de spot",
        ceFac: "Diferenta e " + m.basis.valoare.toFixed(2) + "%.",
        declansator: d("basis", m.basis.valoare, m.basis.prag) };
    }
    return { nivel: "LINISTE", titlu: "Merge",
      ceFac: "Esti la " + Math.round(m.pozitieInterval.valoare) + "% din interval.",
      declansator: null };
  }
```

Adaugă `verdict: trepte` în obiectul întors.

- [ ] **Pasul 4: Rulează și vezi că trec**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS · 28/28`

- [ ] **Pasul 5: Măsoară ordinea scării prin stricare**

Mută blocul `OPRESTE` sub blocul `REGLEAZA` în `trepte`. Rulează proba: trebuie
să pice „ORDINEA scarii". Pune-l la loc: trece.

- [ ] **Pasul 6: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "Tabloul botului: scara verdictului"
```

---

### Task 5: Oglindirea pentru modul direcțional

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js` (adaugă `directieBot` în `masoara`)
- Modifică: `scripts/tablou-bot-v73.mjs`

**Interfețe produse:** `masuri.directieBot` — `1` pentru `long`, `-1` pentru
`short`, `0` când nu se știe. `verdict` îl citește pentru oglindire.

- [ ] **Pasul 1: Scrie probele care pică**

```js
await test("aceleasi cifre dau verdicte DIFERITE in cele doua moduri", () => {
  const m = masuriBune();
  m.directieBot = 1;
  m.eficienta = { valoare: 0.8, semn: 1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 92, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "PAZESTE", "in GRID, trendul la margine e pericol");
  assert.notEqual(T.verdict(m, "DIRECTIONAL").nivel, "PAZESTE", "in DIRECTIONAL, trendul in favoare nu e pericol");
});

await test("in DIRECTIONAL, zigzagul e cel care da REGLEAZA", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.eficienta = { valoare: 0.15, semn: 1, stare: "zigzag", prag: { trend: 0.60, zigzag: 0.30 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "eficienta");
});

await test("in DIRECTIONAL, iesirea IN FAVOARE e OPORTUNITATE", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: 108, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "OPORTUNITATE");
});

await test("in DIRECTIONAL, iesirea IMPOTRIVA e PAZESTE", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: -5, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "PAZESTE");
});

await test("in DIRECTIONAL, ritmul cazut NU mai declanseaza nimic", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.ritmPerechi = { valoare: 2, baza: 10, stare: "rau", prag: 0.40 };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE");
  assert.equal(T.verdict(m, "GRID").nivel, "REGLEAZA");
});

await test("lichidarea nu se oglindeste: sub 8% e OPRESTE in ambele moduri", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.lichidare = { valoare: 5, stare: "rau", prag: { grav: 8, atentie: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "OPRESTE");
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "OPRESTE");
});

await test("masoara scoate directia botului din `trend`", () => {
  const lung = T.masoara(INTRARI);
  assert.equal(lung.directieBot, 1, "trend: long => +1");
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "short" } };
  assert.equal(T.masoara({ ...INTRARI, bot }).directieBot, -1);
});
```

- [ ] **Pasul 2: Rulează și vezi care pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: pică „masoara scoate directia botului" (`directieBot` e `undefined`) și
cele care depind de el.

- [ ] **Pasul 3: Adaugă `directieBot` în `masoara`**

În `masoara`, imediat după `if (!x) return m;`:

```js
    var tr = String(x.trend || "").toLowerCase();
    m.directieBot = tr === "long" ? 1 : tr === "short" ? -1 : 0;
```

Și pune `directieBot: 0` printre câmpurile puse înainte de `if (!x)`.

- [ ] **Pasul 4: Rulează și vezi că trec**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: `V73_TABLOU PASS · 35/35`

- [ ] **Pasul 5: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "Tabloul botului: oglindirea verdictului pentru modul directional"
```

---

### Task 6: Inelul de istoric

**Fișiere:**
- Modifică: `public/lib/tablou-bot.js`
- Modifică: `scripts/tablou-bot-v73.mjs`

**Interfețe produse:**
```
istoricAdauga(istoric, intrare, acum) -> istoricNou
```
Ține cel mult o intrare pe minut, taie ce e mai vechi de 24 h, maximum 1440.

- [ ] **Pasul 1: Scrie probele care pică**

```js
await test("nu tine mai mult de o intrare pe minut", () => {
  let ist = [];
  const t0 = Date.now();
  for (let i = 0; i < 10; i++) ist = T.istoricAdauga(ist, { t: t0 + i * 5000, perechi: i }, t0 + i * 5000);
  assert.ok(ist.length <= 2, `a tinut ${ist.length} intrari in 45 de secunde`);
});

await test("taie ce e mai vechi de 24 de ore", () => {
  const acum = Date.now();
  const vechi = [{ t: acum - 25 * 3600000, perechi: 0 }, { t: acum - 60000, perechi: 5 }];
  const ist = T.istoricAdauga(vechi, { t: acum, perechi: 6 }, acum);
  assert.ok(ist.every((x) => acum - x.t <= 24 * 3600000), "a ramas o intrare mai veche de 24h");
});

await test("nu trece niciodata de 1440 de intrari", () => {
  const acum = Date.now();
  let ist = Array.from({ length: 1500 }, (_, i) => ({ t: acum - (1500 - i) * 60000, perechi: i }));
  ist = T.istoricAdauga(ist, { t: acum, perechi: 1500 }, acum);
  assert.ok(ist.length <= 1440, `au ramas ${ist.length}`);
});
```

- [ ] **Pasul 2: Rulează și vezi că pică**

Rulează: `node scripts/tablou-bot-v73.mjs`
Așteptat: cele trei probe pică cu `T.istoricAdauga is not a function`.

- [ ] **Pasul 3: Scrie `istoricAdauga`**

```js
  var ZI = 24 * 3600000, MAXIM = 1440;
  function istoricAdauga(istoric, intrare, acum) {
    var out = (istoric || []).slice();
    var ultim = out.length ? out[out.length - 1] : null;
    if (ultim && acum - nr(ultim.t) < 60000) out[out.length - 1] = intrare;
    else out.push(intrare);
    out = out.filter(function (x) { return acum - nr(x.t) <= ZI; });
    if (out.length > MAXIM) out = out.slice(out.length - MAXIM);
    return out;
  }
```

Adaugă `istoricAdauga: istoricAdauga` în obiectul întors.

- [ ] **Pasul 4: Rulează și vezi că trec**

Rulează: `node scripts/tablou-bot-v73.mjs` apoi `npm test`
Așteptat: `V73_TABLOU PASS · 38/38`, toate suitele verzi.

- [ ] **Pasul 5: Commit**

```bash
git add public/lib/tablou-bot.js scripts/tablou-bot-v73.mjs
git commit -m "Tabloul botului: inelul de istoric din localStorage"
```

---

### Task 7: Ecranul — HTML, intrarea în meniu, randarea

**Fișiere:**
- Modifică: `public/index.html` (**LF**) — secțiune nouă + buton în meniu
- Modifică: `public/app.js` (**CRLF**) — `renderTabloBot`, `porneTabloBot`
- Modifică: `public/sw.js` — `/lib/tablou-bot.js` în `APP_SHELL` (dacă nu s-a făcut la Task 1)
- Modifică: `public/index.html` — `<script src="/lib/tablou-bot.js"></script>` înainte de `app.js`

**Interfețe consumate:** `TabloBot.masoara`, `TabloBot.verdict`, `TabloBot.modBot`,
`TabloBot.istoricAdauga`, `TabloBot.simboluri`; rutele `/api/bot-orders` și
`/api/market?type=pionex_klines`.

- [ ] **Pasul 1: Adaugă secțiunea în HTML**

Butonul de meniu, **înaintea** celui cu `data-nav="dash"`:

```html
<button class="sideBtn" data-action-click="navTo('tabloubot',true)" data-nav="tabloubot"><span class="sideIcon">◉</span>Tabloul botului</button>
```

Secțiunea, înaintea lui `<section class="panel" id="dash">`:

```html
<section class="panel" id="tabloubot">
<div class="sectionHead"><h3>Tabloul botului</h3><span class="stockBadge" id="tbSimbol">—</span><span class="stockBadge" id="tbMod">—</span><button class="actionGhost" data-action-click="tbSchimbaModul()">Schimbă modul</button></div>
<div class="card full" id="tbVerdictCard">
<div id="tbNivel" class="neutral">—</div>
<h3 id="tbTitlu">Aștept date</h3>
<p id="tbCeFac" class="fine">—</p>
<p id="tbDeCe" class="fine">—</p>
</div>
<div class="card full">
<div class="sectionHead"><h3>Preț și interval</h3><span class="stockBadge" id="tbPret">—</span></div>
<div id="tbRigla" class="accountRows"></div>
</div>
<div class="card full">
<div class="sectionHead"><h3>Cele șapte măsuri</h3></div>
<div class="accountRows" id="tbMasuri"><div class="emptyState">—</div></div>
</div>
</section>
```

Și, înainte de `<script src="/app.js"`:

```html
<script src="/lib/tablou-bot.js"></script>
```

- [ ] **Pasul 2: Verifică sintaxa și că fișierul se servește**

Rulează: `node scripts/syntax-v71.mjs`
Apoi pornește `PORNESTE-CRYPTO-RADAR.bat`, deschide
`http://127.0.0.1:8788/lib/tablou-bot.js` — trebuie să vezi codul, nu `index.html`.

- [ ] **Pasul 3: Scrie legarea în `app.js`**

Înainte de `async function v71SyncPionexJournal(`:

```js
var TB_ISTORIC="tabloBotIstoric_v1",TB_MOD="tabloBotMod_v1",tbStare={bot:null,klinePerp:[],pretSpot:null,ws:null,ceas:null};
function tbCiteste(cheie){try{return JSON.parse(localStorage.getItem(cheie)||"null")||null}catch(e){return null}}
function tbScrie(cheie,val){try{localStorage.setItem(cheie,JSON.stringify(val))}catch(e){}}
function tbSchimbaModul(){
  var b=tbStare.bot;if(!b)return toast("Niciun bot de comutat","warn");
  var alegeri=tbCiteste(TB_MOD)||{},id=String(b.id),acum=TabloBot.modBot(tbStare.botBrut,alegeri).mod;
  alegeri[id]=acum==="GRID"?"DIRECTIONAL":"GRID";tbScrie(TB_MOD,alegeri);
  toast("Mod: "+alegeri[id],"good");renderTabloBot();
}
async function tbAduDate(){
  try{
    var d=await getJSON("/api/bot-orders");
    tbStare.bot=(d.bots||[])[0]||null;tbStare.botBrut=tbStare.bot?tbStare.bot.brut||null:null;
  }catch(e){tbStare.eroare=e.message}
  if(tbStare.bot){
    var s=TabloBot.simboluri(tbStare.bot.baza,tbStare.bot.quote);
    try{
      var k=await getJSON("/api/market?type=pionex_klines&symbol="+encodeURIComponent(s.pionex)+"&interval=5M&limit=100");
      tbStare.klinePerp=((k.data&&k.data.klines)||[]).slice().reverse();
    }catch(e){}
    tbPorneWs(s.binance);
    var ist=tbCiteste(TB_ISTORIC)||[];
    ist=TabloBot.istoricAdauga(ist,{t:Date.now(),perechi:tbStare.bot.ordinePerechi||0,
      pretPerp:tbStare.bot.pretCurent,pretSpot:tbStare.pretSpot},Date.now());
    tbScrie(TB_ISTORIC,ist);
  }
  renderTabloBot();
}
function tbPorneWs(simbol){
  if(tbStare.ws&&tbStare.wsSimbol===simbol)return;
  try{if(tbStare.ws)tbStare.ws.close()}catch(e){}
  tbStare.wsSimbol=simbol;
  try{
    tbStare.ws=new WebSocket("wss://stream.binance.com/ws/"+simbol.toLowerCase()+"@trade");
    tbStare.ws.onmessage=function(ev){
      try{var d=JSON.parse(ev.data);tbStare.pretSpot=Number(d.p);
        if($("tbPret"))$("tbPret").textContent="spot "+d.p}catch(e){}
    };
  }catch(e){}
}
function renderTabloBot(){
  var ist=tbCiteste(TB_ISTORIC)||[],alegeri=tbCiteste(TB_MOD)||{};
  var faraBot=!tbStare.bot;
  var m=TabloBot.masoara({bot:tbStare.botBrut,klinePerp:tbStare.klinePerp,
    pretSpot:tbStare.pretSpot,istoric:ist,acum:Date.now()});
  var mod=TabloBot.modBot(tbStare.botBrut,alegeri);
  var v=TabloBot.verdict(m,mod.mod,{faraBot:faraBot});
  if($("tbSimbol"))$("tbSimbol").textContent=tbStare.bot?tbStare.bot.simbol:"fără bot";
  if($("tbMod"))$("tbMod").textContent=mod.mod+(mod.presupus?" (presupus)":"");
  if($("tbNivel"))$("tbNivel").textContent=v.nivel;
  if($("tbTitlu"))$("tbTitlu").textContent=v.titlu;
  if($("tbCeFac"))$("tbCeFac").textContent=v.ceFac;
  if($("tbDeCe"))$("tbDeCe").textContent=v.declansator
    ? v.declansator.masura+" = "+v.declansator.valoare+" (prag "+v.declansator.prag+")" : "";
  // Rigla: unde esti intre jos si sus, cu semnul tau pe ea si lichidarea marcata.
  if($("tbRigla")){
    var p=m.pozitieInterval.valoare,b=tbStare.bot;
    if(p==null||!b)$("tbRigla").innerHTML='<div class="emptyState">Fără bot, n-am interval de arătat.</div>';
    else{
      var loc=Math.max(0,Math.min(100,p)),trepte=20,poz=Math.round(loc/100*trepte);
      var bara="";for(var i=0;i<=trepte;i++)bara+=i===poz?"●":"─";
      $("tbRigla").innerHTML='<div class="accountRow"><div class="accountCell">'+
        (b.gridJos!=null?b.gridJos:"—")+'</div><div class="accountCell"><b>'+bara+'</b><br>'+
        Math.round(p)+'% din interval</div><div class="accountCell">'+
        (b.gridSus!=null?b.gridSus:"—")+'</div><div class="accountCell '+
        (m.lichidare.stare==="rau"?"bad":"neutral")+'">'+
        (m.lichidare.valoare!=null?"lichidare la −"+m.lichidare.valoare.toFixed(1)+"%":"—")+
        '</div></div>';
    }
  }
  var randuri=[["poziția în interval",m.pozitieInterval],["ritmul perechilor",m.ritmPerechi],
    ["oscilație sau trend",m.eficienta],["amplitudine vs treaptă",m.amplitudine],
    ["până la lichidare",m.lichidare],["basis perp vs spot",m.basis],["comision vs grid",m.comision]];
  if($("tbMasuri"))$("tbMasuri").innerHTML=randuri.map(function(r){
    var val=r[1]&&r[1].valoare!=null?(+r[1].valoare).toFixed(2):"—";
    var cls=r[1]&&(r[1].stare==="rau"||r[1].stare==="afara")?"bad":r[1]&&r[1].stare==="bine"?"good":"neutral";
    return '<div class="accountRow"><div class="accountCell">'+escapeHtml(r[0])+
      '</div><div class="accountCell '+cls+'">'+val+'</div><div class="accountCell">'+
      escapeHtml(String((r[1]&&r[1].stare)||"—"))+"</div></div>";
  }).join("");
}
function porneTabloBot(){
  if(tbStare.ceas)return;
  tbAduDate();tbStare.ceas=setInterval(tbAduDate,8000);
}
```

- [ ] **Pasul 4: Pornește ceasul la intrarea în secțiune**

Găsește funcția `navTo` din `app.js` și adaugă, acolo unde se aprinde secțiunea:

```js
if(id==="tabloubot")porneTabloBot();
```

- [ ] **Pasul 5: Adaugă `brut` în răspunsul rutei de boți**

În `functions/api/bot-orders.js`, în obiectul întors de `normalizeaza`, adaugă
la final `brut: bot` — modulul pur are nevoie de câmpurile Pionex neatinse
(`buOrderData`, `createTime`, `strategyId`).

Adaugă și proba, în `scripts/bot-orders-v72.mjs`:

```js
await test("fiecare bot poarta si forma bruta de la Pionex", async () => {
  fetchStub(RASPUNS_BUN);
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.ok(b.brut && b.brut.buOrderData, "lipseste `brut` - modulul pur n-are din ce masura");
  assert.equal(b.brut.strategyId, "2377");
});
```

- [ ] **Pasul 6: Rulează tot**

Rulează: `npm test`
Așteptat: toate suitele verzi, inclusiv proba nouă din `bot-orders-v72`.

- [ ] **Pasul 7: Commit**

```bash
git add public/index.html public/app.js public/sw.js functions/api/bot-orders.js scripts/bot-orders-v72.mjs
git commit -m "Tabloul botului: ecranul, intrarea in meniu si legarea datelor"
```

---

### Task 8: Proba de ecran în Chrome real

**Fișiere:**
- Creează: `scripts/proba-ecran-tablou.mjs`

**Interfețe consumate:** pagina servită de `wrangler pages dev` pe `:8788`.

- [ ] **Pasul 1: Scrie proba**

Chrome prin CDP. Trei capcane de ocolit, toate plătite azi: omoară browserul
**înainte** de a șterge profilul, și în `finally`, pe toate drumurile de ieșire;
clip-ul lui `captureScreenshot` e în coordonate de **pagină** (adună `scrollY`);
secțiunea e **ascunsă** până chemi `navTo`.

Miezul, după ce ai conexiunea CDP deschisă (`send` trimite comenzi, `exceptii`
adună `Runtime.exceptionThrown`):

```js
await send("Page.navigate", { url: URL_T }); await sleep(11000);
const apasat = await send("Runtime.evaluate", {
  returnByValue: true, awaitPromise: true,
  expression: `(async()=>{
    if(typeof navTo!=='function')return 'navTo lipseste';
    navTo('tabloubot',true);
    await new Promise(r=>setTimeout(r,10000));
    return 'deschis';
  })()`,
});
const vazut = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(()=>{const t=x=>document.getElementById(x)?.textContent?.trim()||null;
    return {nivel:t('tbNivel'),titlu:t('tbTitlu'),ceFac:t('tbCeFac'),mod:t('tbMod'),
      deCe:t('tbDeCe'),
      masuri:document.querySelectorAll('#tbMasuri .accountRow').length,
      rigla:document.getElementById('tbRigla')?.textContent?.trim()||null}})()`,
});

const NIVELE = ["FARA_BOT","NEDOVEDIT","OPRESTE","PAZESTE","REGLEAZA","OPORTUNITATE","LINISTE"];
const v = vazut.result.value;
assert.equal(apasat.result.value, "deschis");
assert.deepEqual(exceptii, [], `exceptii in pagina: ${exceptii.join(" | ")}`);
assert.ok(NIVELE.includes(v.nivel), `nivel necunoscut sau gol: ${v.nivel}`);
assert.equal(v.masuri, 7, `asteptam 7 masuri, am ${v.masuri}`);
assert.match(String(v.mod), /GRID|DIRECTIONAL/, `mod: ${v.mod}`);
assert.ok(v.titlu && v.titlu !== "—", "titlul verdictului e gol");
assert.ok(v.rigla, "rigla intervalului nu a randat nimic");
console.log(JSON.stringify(v, null, 2));
```

Fără bot în cont, `v.nivel` trebuie să fie `FARA_BOT`, `v.masuri` tot **7**, iar
`v.rigla` să spună „Fără bot" — nu să crape și nu să rămână gol.

- [ ] **Pasul 2: Rulează cu serverul pornit**

Rulează: `PORNESTE-CRYPTO-RADAR.bat`, apoi
`node scripts/proba-ecran-tablou.mjs http://127.0.0.1:8788/ <token> <dosar>`
Așteptat: zero excepții, șapte rânduri, verdict nevid.

- [ ] **Pasul 3: Măsoară proba prin stricare**

Șterge un rând din lista `randuri` din `renderTabloBot`. Proba trebuie să pice
pe „șapte rânduri". Pune-l la loc.

- [ ] **Pasul 4: Ridică versiunea**

`BUILD_INFO.json` → `v73`, badge `v73 · TABLOUL BOTULUI`;
`public/index.html` badge la fel; `public/sw.js` cache `crypto-radar-v73`;
`package.json` → `73.0.0`.

- [ ] **Pasul 5: Rulează tot și livrează**

```bash
npm test
git add -A
git commit -m "Tabloul botului: proba de ecran si v73"
git push origin HEAD
```

- [ ] **Pasul 6: Verifică ce e live**

Așteaptă ca badge-ul de pe `crypto-wuy.pages.dev` să scrie `v73`, apoi deschide
local cu `Ctrl+Shift+R` și uită-te la ecran. „Comis" nu înseamnă „în funcțiune".

---

## Ce rămâne pe dinafară, dinadins

- Praguri învățate din istoric. Mai târziu, cu semafor de dovadă.
- Mai mulți boți deodată: ecranul îl ia pe primul. Când va avea doi, se adaugă un selector.
- Alarme sonore sau notificări. Ecranul spune, omul se uită.
