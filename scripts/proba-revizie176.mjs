// Proba reparațiilor din revizia Opus a v100.175–176 (13.10.2026): fiecare test reproduce exemplul revizorului și pică pe codul de dinainte.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nrevizia v100.175–176 · proba reparațiilor\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, Set, Map, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["cont-intreg.js", "verdicte.js", "calendar-bursa.js"]) vm.runInContext(citeste("public", "lib", f), ctx);
const C = ctx.ContIntreg, V = ctx.Verdicte, CB = ctx.CalendarBursa, ZI = 86400000;
function mb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// C1 / C1b
await test("C1: short-ul sub banda lui NU devine long (la −30 % câștigă), long-ul peste bandă nu devine short", () => {
  const sh = { pret: 100, notional: -1000, valoare: 1000, dir: "short", levier: 2, investit: 1000, gridJos: 90, gridSus: 110, lichJos: null, lichSus: 150 };
  const r1 = C.pnlBot(sh, -0.30); assert.ok(r1.pnl > 0, "short la −30 %: " + r1.pnl);
  const lg = { pret: 100, notional: 1000, valoare: 1000, dir: "long", levier: 2, investit: 1000, gridJos: 90, gridSus: 110, lichJos: 50, lichSus: null };
  const r2 = C.pnlBot(lg, 0.30); assert.ok(r2.pnl > 0, "long la +30 %: " + r2.pnl);
});
await test("C1b: lângă marginea benzii calibrarea nu explodează (long la 109 din 90–110, −15 %): între static și poziția plină, nelichidat", () => {
  const x = { pret: 109, notional: 400, valoare: 1000, dir: "long", levier: 2, investit: 1000, gridJos: 90, gridSus: 110, lichJos: 60, lichSus: null };
  const r = C.pnlBot(x, -0.15); assert.equal(r.lichidat, false); assert.ok(r.pnl < -60 && r.pnl > -2000 * 0.15 - 1, "pnl " + r.pnl);
});
// I5
await test("I5: lichidarea se vede pe FITILUL din fereastră (închiderea −10 %, minimul −30 % sub lichidare)", () => {
  const bare = [{ t: Date.parse("2025-10-09T00:00:00Z"), c: 100, l: 99, h: 101 }, { t: Date.parse("2025-10-10T00:00:00Z"), c: 90, l: 70, h: 101 }];
  const ex = C.extremFereastra(bare, "2025-10-09", "2025-10-10"); assert.ok(Math.abs(ex.r + 0.10) < 1e-12 && Math.abs(ex.min + 0.30) < 1e-12);
  const bot = { tip: "bot", cheie: "C:X", nume: "X", clasa: "crypto", moneda: "USD", pret: 100, notional: 300, notionalLei: 1300, valoare: 100, dir: "long", levier: 3, investit: 100, gridJos: 85, gridSus: 115, lichJos: 75, lichSus: null };
  const s = C.stres([bot], { crize: [{ cod: "x", nume: "x", de: "2025-10-09", pana: "2025-10-10" }], factori: { BTC: bare }, bareLungi: { "C:X": bare }, leiPe: { USD: 4.4 } });
  assert.equal(s[0].pozitii[0].lichidat, true);
});
// I6 + M1
await test("I6: riscul pe zile de bursă — sâmbăta și duminica (crypto) intră în lunea care urmează; M1: cursul leului pe valoarea botului", () => {
  const z = ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"];   // vineri, sâmbătă, duminică, luni
  const s = {}; z.forEach((d) => { s[d] = 0.01; });
  const e = [{ tip: "bot", cheie: "C:B", nume: "B", clasa: "crypto", moneda: "USD", notionalLei: 1000, valoareLei: 200 }];
  const r = C.pnlIstoric(e, { "C:B": s }, { USD: { "2026-10-12": 0.01 } }, { zile: z });
  assert.deepEqual(Array.from(r.zile.map((x) => x.z)), ["2026-10-09", "2026-10-12"]); assert.ok(Math.abs(r.zile[1].pnl - (30 + 2)) < 1e-9, "luni = 3 zile crypto + cursul pe valoare: " + r.zile[1].pnl);
  assert.equal(r.zileCal.length, 4);
});
// I7, I8, M8
await test("I7: soldul liber Pionex necitit ⇒ contul NU e „complet”; I8: moneda din metadatele T212 bate sufixul (CSPX la Londra în USD)", () => {
  const v = C.valoare({ boti: [{ activ: true, id: "1", baza: "X", pretCurent: 1, pozitie: 1, investit: 100, profitTotal: 0 }], pionexLiber: null, t212Cash: { total: 1 }, salt: [], leiPe: { USD: 4 } });
  assert.equal(v.complet, false); assert.ok(v.lipsa.includes("soldul liber Pionex"));
  assert.equal(C.monedaTicker("CSPXl_EQ"), "GBX"); C.setMonede({ CSPXl_EQ: "USD" }); assert.equal(C.monedaTicker("CSPXl_EQ"), "USD"); C.setMonede({});
  assert.equal(C.monedaTicker("EBSa_AT_EQ".replace("a_AT", "_AT")), "EUR");
});
await test("M8: vânzarea peste ce ai în jurnal (acțiuni transferate fără umplere) nu mai e „câștig întreg” în ziua aceea", () => {
  const z = (i) => new Date(Date.parse("2026-03-02T00:00:00Z") + i * ZI).toISOString().slice(0, 10);
  const u = [{ t: Date.parse(z(0) + "T15:00:00Z"), ticker: "A_US_EQ", side: "BUY", qty: 1, net: 400, pret: 100 }, { t: Date.parse(z(1) + "T15:00:00Z"), ticker: "A_US_EQ", side: "SELL", qty: 11, net: 4400, pret: 100 }];
  const s = C.seriaT212(u, { A_US_EQ: [0, 1, 2].map((i) => ({ t: Date.parse(z(i) + "T13:30:00Z"), c: 100 })) }, { USD: { [z(0)]: 4 } }, { pana: z(2) });
  assert.ok(s.every((x) => Math.abs(x.r) < 1e-9), JSON.stringify(s.map((x) => x.r))); assert.deepEqual(Array.from(s.faraCumparare), ["A_US_EQ"]);
});
// C2
await test("C2: verdicte ZILNICE persistente pe aceleași simboluri (randamente pe 20 de zile care se suprapun), fără efect ⇒ p < 0,05 în cel mult ~8 % din seturi", () => {
  const r = mb(11); let mic = 0, testate = 0;
  for (let s = 0; s < 60; s++) {
    const jurnal = [], bare = {}, T0 = Date.parse("2025-01-02T15:00:00Z");
    for (let k = 0; k < 40; k++) {
      const sym = "S" + k + "_US_EQ", b = []; let p = 100, fav = r() < 0.5;
      for (let i = 0; i < 260; i++) { p *= 1 + (r() - 0.5) * 0.04; b.push({ t: T0 + i * ZI, c: p }); if (r() < 0.05) fav = !fav; if (i < 230) jurnal.push({ s: "poarta-t212", k: sym, n: fav ? "cumpara" : "nu", p, t: T0 + i * ZI + 3600000 }); }
      bare[sym] = b;
    }
    const c = V.calibrare(V.evalueaza(jurnal, bare, {})).find((x) => x.h === 20);
    if (c && c.test.stare === "testat") { testate++; if (c.test.p < 0.05) mic++; }
  }
  assert.ok(testate >= 30, "seturi testate " + testate); assert.ok(mic / testate <= 0.08, "p < 0,05 în " + mic + " din " + testate);
});
await test("I2: registrul — un verdict bun care iese MAI RĂU nu e „dovedit”; un obicei „nedovedit” pe pagina lui nu devine „dovedit” doar din BH", () => {
  const reg = V.registru({ calibrare: [{ sursa: "poarta-t212", nume: "P", h: 20, intrebare: "q", test: { stare: "testat", p: 0.0001, dif: -0.05 } }],
    risc: { boti: { comportament: [{ nume: "O", p: 0.0002, dif: 0.03, stare: "nedovedit" }, { nume: "L", p: 0.0003, dif: -0.04, stare: "dovedit-rau" }] } } });
  assert.equal(reg.find((x) => x.afirmatie === "q").ramane, false); assert.match(reg.find((x) => x.afirmatie === "q").directie, /MAI RĂU/);
  assert.equal(reg.find((x) => x.afirmatie === "O").ramane, false); assert.equal(reg.find((x) => x.afirmatie === "O").treceBh, true); assert.equal(reg.find((x) => x.afirmatie === "L").ramane, true);
});
await test("I1: p-ul bootstrap nu mai poate fi 0 ((k + 1) / (B + 1)) în riscul tău și la boții asemănători", () => {
  assert.match(citeste("public", "lib", "risc-luna.js"), /\+ 1\) \/ \(d\.length \+ 1\)\) : null;   \/\/ \(revizia, I1\)/);
  assert.equal((citeste("public", "lib", "asemanatoare.js").match(/\+ 1\) \/ \(bm\.length \+ 1\)\)/g) || []).length, 2);
});
await test("I3: tickerele europene T212 își păstrează litera mică a bursei (SAPd_EQ), și pe server", () => {
  assert.equal(V.curata({ s: "poarta-t212", k: "SAPd_EQ", n: "nu", p: 1, t: 1 }).k, "SAPd_EQ");
  assert.match(citeste("functions", "api", "istoric-bot.js"), /k=String\(v\.k\|\|""\)\.replace\(\/\[\^A-Za-z0-9\._=\^-\]\/g,""\)/);
});
await test("I4: acasă (fără cf-ray) un CF-Connecting-IP trimis de client nu ocolește limita de parole greșite", async () => {
  const { requireApiAuth } = await import(`../functions/_shared/auth.js?t=${Math.random()}`);
  const env = { APP_API_TOKEN: "proba-token-1234567890" }; let ultima = null;
  for (let i = 0; i < 11; i++) ultima = await requireApiAuth(new Request("http://x/api/a", { headers: { authorization: "Bearer gresit" + i, "cf-connecting-ip": "9.9.9." + i, "x-forwarded-for": "100.64.0.77" } }), env, "rev4");
  assert.equal(ultima.status, 429);
});
await test("M2: calendarul pune Paris / Amsterdam / Milano / Elveția (litera mică T212) pe orele europene, nu pe NYSE", () => {
  assert.equal(CB.bursaSimbol("AIRp_EQ"), "XETRA"); assert.equal(CB.bursaSimbol("ASMLa_EQ"), "XETRA"); assert.equal(CB.bursaSimbol("NOVNs_EQ"), "XETRA"); assert.equal(CB.bursaSimbol("VODl_EQ"), "LSE");
});
await test("M4–M7, M10, M11, M13 în cod: pauza după eșec, valoarea zilei la reușită, loturile de verdicte, cursorul pe pagină, plauzibilitatea crypto, locul releului, semnul corelației", () => {
  const tc = citeste("scripts", "lib", "tura-cont.mjs"), tv = citeste("scripts", "lib", "tura-verdicte.mjs"), tt = citeste("scripts", "lib", "tura-t212.mjs"), pv = citeste("functions", "api", "pret-viu.js"), te = citeste("public", "lib", "t212-ecran.js");
  assert.match(tc, /acum - \(st\.esecLa \|\| 0\) < ORA/); assert.match(tc, /if \(okZ\) st\.ziValoare = z;/); assert.match(tc, /Math\.abs\(bl\[bl\.length - 1\]\.c \/ x\.pret - 1\) > 0\.25/);
  assert.match(tv, /for \(let i = 0; i < noi\.length; i \+= 400\)/); assert.match(tt, /if \(d\.salveazaStare\) d\.salveazaStare\(st\);/);
  assert.ok(pv.indexOf("deschise++;let rezervat=true") > 0 && pv.indexOf("deschise++;let rezervat=true") < pv.indexOf("await fetch(\"https://ws.pionex.com"));
  assert.match(te, /rho \* \(semn\[k\] < 0 \? -1 : 1\) >= 0\.6/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
