// Proba v100.333 · Piața azi, ce a mai rămas din auditul din 12.11 (13.11.2026, el: „rezolvă tot ce a mai rămas”; decizia la 🟡5: coordonatorul):
//   🟡5 trendul Nasdaq pe ultima zi ÎNCHISĂ (bara zilei în formare nu mută verdictul; prețul de azi rămâne la vedere), la fel în colector;
//   frâna de după eveniment: aceeași fereastră de 2 ore în colector (Discord) ca pe pagină;
//   🔵 graficele mici în culoarea direcției, „față de ieri” spune când poza e mai veche de o zi, banda frânei arată TOATE motivele,
//      pragurile alese (25% / 50%, 5 zile) scrise la vedere.
//   node scripts/proba-v100333-piata.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.333 · Piața azi: ce a mai rămas din audit · proba\n");

const ORA = 3600000, MIN = 60000, ZI = 86400000;
function lume(o = {}) {
  const ls = new Map(), elemente = o.elemente || {};
  const ctx = { console, Intl, Date, Math, JSON, Number, String, Array, Object, isFinite, RegExp, Error, Promise, AbortSignal, TextRo: globalThis.TextRo,
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } },
    document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, hidden: false, body: { classList: { contains: () => false, toggle() {}, add() {} } } },
    $: (id) => elemente[id] || null, setInterval: () => 0, clearTimeout() {}, setTimeout: () => 0, escapeHtml: esc };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ["grid-calcul.js", "macro.js", "acasa.js", "acasa-ecran.js"].concat(o.inPlus || [])) vm.runInContext(lib(f), ctx, { filename: f });
  ctx.run = (cod) => vm.runInContext(cod, ctx);
  return ctx;
}
const A = lume().Acasa, ACUM = Date.now();
const RAPORT = (o = {}) => ({ cont: Object.assign({ la: ACUM - ORA, valoare: { total: 50000 }, risc: { var95: 1000 } }, o) });
const EV = (t, titlu = "CPI m/m", impact = "High") => ({ date: new Date(t).toISOString(), title: titlu, impact, country: "USD" });

// ───────────── 🟡5 trendul pe ziua închisă ─────────────
// miercuri 11.11.2026: bursa deschisă la 15:00 New York (20:00Z), închisă la 17:00 New York (22:00Z)
const DESCHIS = Date.parse("2026-11-11T20:00:00Z"), INCHIS = Date.parse("2026-11-11T22:00:00Z");
// 260 de zile de urcare (bara de AZI e ultima, la 14:30Z), iar azi indicele pică la jumătate - în ședință bara azi încă se formează
const urcaApoiPica = Array.from({ length: 260 }, (_, i) => ({ t: Date.parse("2026-11-11T14:30:00Z") - (259 - i) * ZI, c: i === 259 ? 0.5 * 100 * Math.pow(1.002, 258) : 100 * Math.pow(1.002, i) }));
await test("🟡5 sensBursa: în ședință bara de azi (în formare) nu mută trendul; după închidere da", () => {
  assert.equal(A.sensBursa(urcaApoiPica, DESCHIS), "sus", "cu bursa deschisă trendul e pe închiderea de ieri");
  assert.equal(A.sensBursa(urcaApoiPica, INCHIS), "lateral", "după închidere ziua de azi e închisă și contează");
});
await test("🟡5 vremeBursa: verdictul pe ziua închisă, iar mișcarea de azi rămâne la vedere în text", () => {
  const d = A.vremeBursa({ qqq: urcaApoiPica, vix: 15, ndx: { n: 100, e50: 70 }, acum: DESCHIS });
  assert.equal(d.nivel, "larga");
  assert.match(d.text, /Azi, cu bursa deschisă: QQQ −50,0%/); assert.match(d.text, /ultima închidere/);   /* revizia Opus v100.333 (🔵3): lunea ultima zi închisă e vineri */
  assert.equal(A.vremeBursa({ qqq: urcaApoiPica, vix: 15, ndx: { n: 100, e50: 70 }, acum: INCHIS }).nivel, "lateral");
  assert.equal(A.vremeBursa({ qqq: urcaApoiPica.slice(0, -1), vix: 15, ndx: { n: 100, e50: 70 }, acum: DESCHIS }).text.indexOf("Azi, cu bursa deschisă"), -1, "fără bara de azi: textul de până acum");
});
await test("🟡5 colectorul (Discord) judecă la fel: vremeBursa primește ora (acum) în tura de vreme și în raportul săptămânii", () => {
  const S = citeste("scripts", "lib", "tura-piata.mjs");
  assert.match(S, /A\.vremeBursa\(\{ qqq, vix, ndx: ndL, ndxVechi: ndV, acum \}\)/);
  assert.match(S, /A\.vremeBursa\(\{ qqq, vix, ndx: A\.largimeNdx\(l\), acum \}\)/);
});

// ───────────── frâna de după eveniment, în colector ─────────────
const TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-piata.mjs")).href);
await test("frâna evenimentului în colector: încă 2 ore după ora lui (ca pagina), cu „imediat după”; calendarul căzut rămâne necunoscut", () => {
  assert.equal(typeof TP.evenimentFrana, "function", "tura-piata.mjs: lipsește evenimentFrana");
  assert.deepEqual(TP.evenimentFrana(A, { evenimente: [EV(ACUM - 30 * MIN)] }, ACUM), { eveniment: "CPI m/m", evenimentTrecut: true });
  assert.deepEqual(TP.evenimentFrana(A, { evenimente: [EV(ACUM + 30 * MIN)] }, ACUM), { eveniment: "CPI m/m", evenimentTrecut: false });
  assert.deepEqual(TP.evenimentFrana(A, { evenimente: [EV(ACUM - 3 * ORA)] }, ACUM), { eveniment: "", evenimentTrecut: false });
  assert.equal(TP.evenimentFrana(A, { evenimente: [], eroare: "x" }, ACUM), undefined);
  const S = citeste("scripts", "lib", "tura-piata.mjs");
  assert.equal(S.split("evenimentFrana(d.Acasa, ca, acum)").length - 1, 1, "franaAzi o folosește");
  assert.match(A.franaCont({ eveniment: "CPI m/m", evenimentTrecut: true }), /imediat după CPI m\/m/, "aceeași frază ca pagina");
});

// ───────────── 🔵 ─────────────
await test("🔵 graficele mici: verde când seria urcă, roșu când coboară (BTC și Nasdaq nu mai sunt mereu verzi)", () => {
  const c = lume();
  assert.equal(c.acSparkCul([3, 2, 1]), "#E0524A"); assert.equal(c.acSparkCul([1, 2, 3]), "#26A96C"); assert.equal(c.acSparkCul([]), "#9FB3C4");
  const D = lib("acasa-ecran.js");
  assert.match(D, /acSpark\(inch\(d\.btc4h\)\.slice\(-120\), acSparkCul\(inch\(d\.btc4h\)\.slice\(-120\)\)\)/);
  assert.match(D, /acSpark\(serie\(qqq\), acSparkCul\(serie\(qqq\)\)\)/);
});
await test("🔵 „față de ieri”: când poza e mai veche de o zi, săgeata spune de când e", () => {
  const c = lume();
  const sc = c.Acasa.schimbari({ zi: "2026-11-12", fg: 50 }, [{ zi: "2026-11-09", fg: 40 }]);
  assert.equal(sc.zileInUrma, 3); assert.equal(sc.dinZi, "2026-11-09");
  assert.match(c.acIeri(sc, "fg"), /din 09\.11/); assert.match(c.acIeri(sc, "fg"), /față de 09\.11/);
  const ieri = c.Acasa.schimbari({ zi: "2026-11-12", fg: 50 }, [{ zi: "2026-11-11", fg: 40 }]);
  assert.doesNotMatch(c.acIeri(ieri, "fg"), /din /); assert.match(c.acIeri(ieri, "fg"), /față de ieri/);
});
await test("🔵 banda frânei arată TOATE motivele (riscul pe o zi ȘI evenimentul de azi), nu doar primul; Acasa.franaCont (Discord) rămâne cu primul", () => {
  const o = { raportStare: "ok", raport: RAPORT({ risc: { var95: 2500 } }).cont, eveniment: "CPI m/m" };
  const m = A.franaContMotive(o);
  assert.equal(m.length, 2); assert.match(m[0], /reduce expunerea/); assert.match(m[1], /CPI m\/m/);
  assert.equal(A.franaCont(o), m[0]);
  const c = lume();
  c.acasa.d = { contRaport: RAPORT({ risc: { var95: 2500 } }), calendar: { evenimente: [EV(ACUM + ORA)] } };
  const h = text(c.acFranaContHtml(c.acFranaContText(), ""));
  assert.match(h, /reduce expunerea/); assert.match(h, /Și: N-aș porni boți noi și n-aș cumpăra chiar înainte de CPI m\/m/);
});
await test("🔵 pragurile alese, scrise la vedere: 25% / 50% pe verdictul crypto, 5 zile la „față de piață”", () => {
  const v = A.vreme({ clasament: { evita: 30, candidati: 70, faraDate: 0, dir: { long: 10, neutru: 80, short: 10 } }, btc: { miscare: false } });
  assert.match(v.text, /25%.*50%.*alese/);
  const c = lume();
  assert.match(c.acFataPiata({ zile: 3, exces: 0.02, zilePeste: 0.66, ferestre: 1 }), /prea puține zile ca să se vadă ceva \(3; arăt cifrele de la 5 zile judecate, prag ales\)/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
