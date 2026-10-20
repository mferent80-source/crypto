// Proba v100.223 (20.10, el: „fa idei”): (1) dimineața primește regimul macro doar dacă macroLa e proaspăt;
// (2) „Aș porni” pe poarta de la v100.196, reluat pe 108 intrări sintetice (căile reale de atunci nu sunt în repo);
// (3) bara zilnică EU cade până la închiderea bursei ei; NYSE rămâne bareBursa; (4) colectorul e legat așa.
// Pragul 55 nu se mută. verdict() nu se atinge.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { regimProaspat, turaIdei } from "./lib/tura-idei.mjs";
import { bareZi } from "./lib/bare-zi.mjs";
import { CalendarBursa } from "./lib/calendar-bursa.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "monte-simbol.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
vm.runInThisContext(citeste("public", "lib", "grid-sim.js"), { filename: "grid-sim.js" });
const GS = globalThis.GridSim, G = globalThis.GridCalcul;
const I = new Function(citeste("public", "lib", "grid-calcul.js") + citeste("public", "lib", "actiuni-semnale.js") + citeste("public", "lib", "idei.js") + "; return Idei;")();
const CB = CalendarBursa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.223 · regim, bară, Aș porni · proba\n");

const ZI = 86400000, ACUM = Date.UTC(2026, 8, 26, 6), ORA2 = 2 * 3600000;
const zilnice = (n, f) => { const b = []; for (let i = 0; i < n; i++) { const c = f(i); b.push({ t: ACUM - (n - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); } return b; };
const buna = zilnice(296, (i) => 100 * Math.pow(1.002, i) * (1 + 0.02 * Math.sin(i / 2)));
const tur = (regim) => turaIdei({ tickere: ["BUN_US_EQ"], acum: ACUM, Idei: I, inchise: [], pauza: async () => {}, jurnal: () => {}, regim,
  cereBare: async () => buna, cereRezultate: async () => "2026-11-30" });

await test("regimProaspat: cod ținut și macroLa ≤ 2 h; lipsa, ștampila veche sau doar la_macro ⇒ null", () => {
  const t0 = Date.UTC(2026, 9, 20, 8);
  assert.deepEqual(regimProaspat({ macroRegim: { cod: "riskoff", scor: -4 }, macroLa: t0 }, t0 + ORA2), { macro: "riskoff" });
  assert.equal(regimProaspat({ macroRegim: { cod: "riskoff" }, macroLa: t0 }, t0 + ORA2 + 1), null);
  assert.equal(regimProaspat({ macroRegim: { cod: "riskoff" }, la_macro: t0 }, t0), null);
  assert.equal(regimProaspat({ macroRegim: { scor: 0 }, macroLa: t0 }, t0), null);
  assert.equal(regimProaspat(null, t0), null);
  assert.equal(regimProaspat({}, t0), null);
});
await test("tura de dimineață: riskoff proaspăt scoate numele; fără regim sau prudent îl lasă (data rezultatelor e departe)", async () => {
  assert.equal((await tur({ macro: "riskoff" })).trecute, 0);
  assert.equal((await tur(null)).trecute, 1);
  assert.equal((await tur(undefined)).trecute, 1);
  assert.equal((await tur({ macro: "prudent" })).trecute, 1);
});

const oz = (o) => Object.assign({ zile: 7, bare: 672, pCastig: 0.7, pPierde: 0.3, pZero: 0, marja: 2, reluare: { n: 20, media: 0, pPlus: 0.4, independente: 3 }, p5: -2, p50: 1.2, p95: 4, pLich: 0, pStop: 0 }, o);
const fa = (o) => GS.verdict({ n: 108, orizonturi: [oz(o)] }, null, null, 0);
await test("„Aș porni” pe poarta actuală: 108 intrări cu media reală ≤ 0 nu spun „Aș porni”; media pe plus încă spune; marginea la 50 e aruncare de ban", () => {
  let porniri = 0;
  for (let i = 0; i < 108; i++) {
    const media = i === 0 ? 0 : -((i % 17) + 1) / 10, p = 0.56 + (i % 30) * 0.01;
    const v = fa({ pCastig: p, pPierde: Math.round((1 - p) * 1000) / 1000, marja: 1 + (i % 3), p50: 0.4 + (i % 5) * 0.2, reluare: { n: 10 + (i % 5), media, pPlus: 0.3, independente: 2 } });
    if (/^Aș porni/.test(v.faCe)) porniri++;
    assert.match(v.faCe, /^(O aruncare de ban|N-aș porni)/, "i=" + i + " " + v.faCe.slice(0, 80));
  }
  assert.equal(porniri, 0, "reluare de regulă, nu cele 108 căi din 14.10");
  const bun = fa({ pCastig: 0.7, marja: 2, p50: 1.2, reluare: { n: 25, media: 0.8, pPlus: 0.6, independente: 4 } });
  assert.match(bun.faCe, /^Aș porni:/); assert.match(bun.sub, /pe istoria reală/);
  assert.match(fa({ pCastig: 0.62, pPierde: 0.38, marja: 12, p50: 1.2, reluare: { n: 25, media: 0.8, pPlus: 0.6, independente: 4 } }).faCe, /^O aruncare de ban:/);
});

const bar = (iso, c) => ({ time: Date.parse(iso), open: c, high: c, low: c, close: c });
const eu = [bar("2026-01-13T08:00:00Z", 1), bar("2026-01-14T08:00:00Z", 2)];
const la = (h) => Date.parse("2026-01-14T" + h + ":00:00Z");
await test("bară EU: Xetra și Londra o scot cât bursa lor e deschisă și o păstrează după închidere; ieri rămâne", () => {
  for (const s of ["SAPd_EQ", "SAP.DE", "VOD.L", "BARCl_EQ"]) {
    assert.deepEqual(bareZi(G, CB, eu, la("10"), s).map((b) => b.c), [1], s + " la 10:00 UTC încă deschisă");
    assert.deepEqual(bareZi(G, CB, eu, la("17"), s).map((b) => b.c), [1, 2], s + " la 17:00 UTC închisă");
  }
  assert.deepEqual(bareZi(G, CB, [bar("2026-01-13T08:00:00Z", 1)], la("10"), "SAP.DE").map((b) => b.c), [1], "bara de ieri rămâne în timpul ședinței");
  assert.deepEqual(G.bareBursa(eu, la("10")).map((b) => b.c), [1, 2], "la 10:00 UTC New York e închis, bareBursa ține bara de azi");
});
await test("NYSE prin bareZi = bareBursa (sâmbătă, vineri 11:00, vineri după închidere, luni cu bara de vineri)", () => {
  const r = [bar("2026-09-24T13:30:00Z", 1), bar("2026-09-25T13:30:00Z", 2)];
  for (const t of ["2026-09-26T12:00:00Z", "2026-09-25T21:30:00Z", "2026-09-25T15:00:00Z", "2026-09-28T15:00:00Z"]) {
    const ms = Date.parse(t);
    assert.deepEqual(bareZi(G, CB, r, ms, "AAPL_US_EQ").map((b) => b.c), G.bareBursa(r, ms).map((b) => b.c), t);
  }
  assert.deepEqual(bareZi(G, CB, null, Date.now(), "AAPL_US_EQ"), []);
  assert.equal(CB.bursaSimbol("1211.HK"), "NYSE");
  assert.deepEqual(bareZi(G, CB, eu, la("10"), "1211.HK").map((b) => b.c), G.bareBursa(eu, la("10")).map((b) => b.c), "Hong Kong rămâne pe ceasul NYSE");
});
await test("colectorul: regimProaspat pe idei, bareTicker pe EU, ideile SUA pe bareBursa, QQQ/piața și EURRON pe bareToate", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /regim: regimProaspat\(m\.piata, Date\.now\(\)\)/);
  assert.match(C, /function bareTicker\(rd, tk, acum\)/);
  assert.match(C, /const b = GridCalcul\.bareBursa\(rd, Date\.now\(\)\)/);
  assert.match(C, /action=piata.{0,180}bareToate/);
  assert.match(C, /sim === "EURRON=X" \? GridCalcul\.bareToate/);
  assert.equal((C.match(/GridCalcul\.bareBursa\(/g) || []).length, 1, "un singur bareBursa rămas: ideile SUA");
  assert.ok(!/action=preturi&interval=1d[^\n]*GridCalcul\.bare\(/.test(C));
  const P = JSON.parse(citeste("package.json"));
  assert.ok(Number(P.version.split(".")[1]) >= 223);
  assert.match(C, /VERSIUNE_COLECTOR = "v101\.(1[3-9]\d|[2-9]\d\d)"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
