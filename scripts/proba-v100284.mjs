// Proba v100.284 / colector v101.156 (31.10, el: „tot pe canalul ăsta vreau duminica să-mi trimiți un raport de profitabilitate real,
// săptămânal, lunar, anual și total pe boți și pe Trade 212 separat, dar doar pe boți și acțiuni închise, nu profit estimat sau pierdere,
// ci real”): duminica de la 20, o dată, în canalul evaluărilor - doar ce s-a ÎNCHIS, pe data închiderii, netul REALIZAT (boți: după
// comisioane și funding; Trading 212: trade-urile închise, după comisioane, în lei; fără dividende, fără poziții deschise).
//   node scripts/proba-v100284.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifica } from "./garda-texte.mjs";
import * as MC from "./lib/mesaje-colector.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const PF = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "profit-real.mjs")).href).catch(() => null);
for (const f of ["statistica-trade.js", "t212.js"]) if (!globalThis[f === "t212.js" ? "T212" : "StatisticaTrade"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { StatisticaTrade: ST, JurnalTrade: JT, T212 } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
const fara = (ab, ce) => assert.deepEqual(ab, [], ce + ": " + ab.join("; "));
const arePF = () => assert.ok(PF, "scripts/lib/profit-real.mjs lipsește");
console.log("\nV100.284 · PROFITUL REAL · proba\n");
const ORA = 3600000, ZI = 86400000;
const DUM = Date.UTC(2026, 10, 1, 18, 30);   // duminică 01.11.2026, 20:30 la București (UTC+2)

await test("perioadele, pe ora României: săptămâna de luni 00:00, luna și anul calendaristice, totalul; și în săptămâna schimbării orei", () => {
  arePF();
  const p = PF.perioade(DUM);
  assert.equal(p.saptamana.de, Date.UTC(2026, 9, 25, 22, 0), "luni 26.10 00:00 RO"); assert.equal(p.saptamana.luni, "2026-10-26"); assert.equal(p.saptamana.azi, "2026-11-01");
  assert.equal(p.luna.de, Date.UTC(2026, 9, 31, 22, 0), "01.11 00:00 RO"); assert.equal(p.luna.cheie, "2026-11");
  assert.equal(p.an.de, Date.UTC(2025, 11, 31, 22, 0), "01.01.2026 00:00 RO"); assert.equal(p.an.an, "2026");
  const s = PF.perioade(Date.UTC(2026, 9, 25, 18, 0));   // duminica schimbării orei, 20:00 RO
  assert.equal(s.saptamana.de, Date.UTC(2026, 9, 18, 21, 0), "luni 19.10 00:00 RO (încă ora de vară)");
  assert.equal(PF.perioade(Date.UTC(2026, 10, 2, 8)).saptamana.luni, "2026-11-02", "luni: săptămâna începe azi");
});
await test("netul REALIZAT pe perioade: doar închișii până acum, pe data închiderii; marginile (luni 00:00 intră, duminica trecută nu); totalul cu prima închidere", () => {
  arePF();
  const l = [
    { inchis: Date.UTC(2026, 9, 25, 22, 0), rezultat: 5 },       // luni 26.10 00:00 RO - în săptămână
    { inchis: Date.UTC(2026, 9, 25, 21, 59), rezultat: -3 },     // duminică 25.10 23:59 RO - nu
    { inchis: Date.UTC(2026, 9, 31, 22, 30), rezultat: -2 },     // 01.11 00:30 RO - și în noiembrie
    { inchis: Date.UTC(2026, 0, 5), rezultat: 10 },
    { inchis: Date.UTC(2025, 11, 22), rezultat: -7 },            // 2025
    { inchis: DUM + ORA, rezultat: 100 },                         // după raport - nu
    { inchis: null, rezultat: 50 }, { inchis: Date.UTC(2026, 9, 28), rezultat: null },
    { inchis: Date.UTC(2026, 9, 27, 10), rezultat: 0 },          // închis exact pe zero: se numără, dar nu e „pe plus”
  ];
  const r = PF.profitPe(l, DUM);
  assert.deepEqual(r.saptamana, { n: 3, net: 3, plus: 1 }); assert.deepEqual(r.luna, { n: 1, net: -2, plus: 0 });
  assert.deepEqual(r.an, { n: 5, net: 10, plus: 2 }); assert.deepEqual({ n: r.total.n, net: r.total.net, plus: r.total.plus }, { n: 6, net: 3, plus: 2 });
  assert.equal(r.total.de, Date.UTC(2025, 11, 22));
});
await test("aceleași cifre ca Jurnalul: boții prin StatisticaTrade.dinPionex / dinPionexAlte (net după comisioane și funding), T212 prin dinT212 (după comisioane)", () => {
  arePF();
  const brut = (id, inch, rez, fee, fund) => ({ strategyId: id, base: "SOL.PERP", createTime: inch - ORA, closeTime: inch, buOrderData: { totalRealizedProfit: String(rez), gridProfit: "1", totalFee: String(fee), totalFundingFee: String(fund), bottom: "1", top: "2", row: "10", usdtInvestment: "100", leverage: "3", trend: "long" } });
  const toti = [brut("a", Date.UTC(2026, 9, 27, 10), 5, -0.4, -0.1), brut("b", Date.UTC(2026, 9, 28, 10), -3, -0.3, 0)];
  const boti = ST.dinPionex(JT.din(toti)).concat(ST.dinPionexAlte(JT.alte(toti)));
  const r = PF.profitPe(boti, DUM); assert.equal(r.saptamana.net, Math.round((5 - 0.4 - 0.1 - 3 - 0.3) * 100) / 100);
  const u = [{ id: "c1", ticker: "AAPL_US_EQ", side: "BUY", qty: 1, net: 100, fee: 0.5, pret: 99.5, t: Date.UTC(2026, 9, 20) }, { id: "v1", ticker: "AAPL_US_EQ", side: "SELL", qty: 1, net: 110, fee: 0.5, pret: 110.5, realizat: 11, t: Date.UTC(2026, 9, 27) }];
  const t = PF.profitPe(ST.dinT212(T212.perechi(u).inchise), DUM); assert.equal(t.saptamana.n, 1); assert.equal(t.saptamana.net, 10, "oficial 11 − comisioanele 0,5 + 0,5");
});
await test("mesajul: titlul cu săptămâna, boți și T212 separat, fiecare perioadă cu câți / net / % pe plus, mii cu punct, „doar închise”; garda textelor", () => {
  arePF();
  const p = { saptamana: { n: 68, net: -135.29, plus: 28 }, luna: { n: 0, net: 0, plus: 0 }, an: { n: 2100, net: -5900.12, plus: 1176 }, total: { n: 2449, net: -6651.25, plus: 1372, de: Date.UTC(2025, 11, 21, 10) }, perioade: PF.perioade(DUM) };
  const q = { saptamana: { n: 0, net: 0, plus: 0 }, luna: { n: 2, net: 45.2, plus: 1 }, an: { n: 40, net: 312, plus: 24 }, total: { n: 78, net: 412.5, plus: 45, de: Date.UTC(2025, 2, 12) }, perioade: PF.perioade(DUM) };
  const m = MC.profitReal(p, q, "ok");
  assert.equal(m.titlu, "Profitul real: săptămâna 26.10–01.11"); assert.equal(m.nivel, "info");
  const r = m.mesaj.split("\n");
  assert.equal(r[0], "Doar ce s-a închis: boții și pozițiile încă deschise nu intră, nici pe plus, nici pe minus.");
  assert.ok(r.includes("Boții Pionex, netul după comisioane și funding:"));
  assert.ok(r.includes("• săptămâna 26.10–01.11: 68 de boți, net −135,3 USDT (41% pe plus)"), m.mesaj);
  assert.ok(r.includes("• noiembrie: niciun bot închis"), m.mesaj);
  assert.ok(r.includes("• 2026: 2100 de boți, net −5.900,1 USDT (56% pe plus)"), m.mesaj);
  assert.ok(r.includes("• total, de la 21.12.2025: 2449 de boți, net −6.651,3 USDT (56% pe plus)"), m.mesaj);
  assert.ok(r.includes("Trading 212, trade-urile închise, după comisioane:"));
  assert.ok(r.includes("• săptămâna 26.10–01.11: niciun trade închis"), m.mesaj);
  assert.ok(r.includes("• noiembrie: 2 trade-uri, net +45,2 lei (50% pe plus)"), m.mesaj);
  assert.ok(r.includes("• total, de la 12.03.2025: 78 de trade-uri, net +412,5 lei (58% pe plus)"), m.mesaj);
  assert.doesNotMatch(m.mesaj, /estimat|nerealizat|deschis:/);
  fara(verifica(m.titlu, "alertaTitlu"), "titlul"); fara(verifica(m.mesaj, "raport"), "mesajul");
  assert.match(MC.profitReal(p, null, "lipsa").mesaj, /\n• istoricul Trading 212 n-a venit acum; îl adaug duminica viitoare\.$/);
  assert.match(MC.profitReal(p, null, "nelegat").mesaj, /\n• Trading 212 nu e legat la Radar\.$/);
  fara(verifica(MC.profitReal(p, null, "lipsa").mesaj, "raport"), "fără T212");
});
await test("când: duminica de la 20 (ora României), o dată pe duminică", () => {
  arePF();
  assert.equal(PF.profitDatorat({}, DUM, 20.5), true); assert.equal(PF.profitDatorat({}, DUM, 19.9), false);
  assert.equal(PF.profitDatorat({ profit: "2026-11-01" }, DUM, 21), false); assert.equal(PF.profitDatorat({}, Date.UTC(2026, 10, 2, 18), 20), false, "luni");
});
await test("colectorul: în tura comportamentului, pe canalul evaluărilor; boții din arhivă, T212 din istoricul de acasă (reîncearcă până la 23, apoi pleacă fără)", () => {
  const s = citeste("scripts", "colector.mjs"), tc = s.slice(s.indexOf("async function turaComportament("), s.indexOf("\n}\n", s.indexOf("async function turaComportament(")));
  assert.match(s, /import \* as Profit from "\.\/lib\/profit-real\.mjs"/);
  assert.match(tc, /Profit\.profitDatorat\(st, acum, ora\)/); assert.match(tc, /cere\("\/api\/t212\?action=istoric"\)/);
  assert.match(tc, /StatisticaTrade\.dinPionex\(JurnalTrade\.din\(toti\)\)\.concat\(StatisticaTrade\.dinPionexAlte\(JurnalTrade\.alte\(toti\)\)\)/);
  assert.match(tc, /StatisticaTrade\.dinT212\(T212\.perechi\(h\.umpleri\)\.inchise\)/);
  assert.match(tc, /canalEvaluari\.trimite\(MesajeColector\.profitReal\(/); assert.match(tc, /st\.profit = zi/); assert.match(tc, /ora >= 23/);
  assert.doesNotMatch(s, /trimiteAlerta\(MesajeColector\.profitReal/);
});
await test("versiunile: v100.284 în aplicație, v101.156 în colector; proba în lanț; v100283 de la v100.283 în sus", () => {
  // v100.285: de la v100.284 / v101.156 în sus (ca probele vechi), nu exact
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 284, String(app));
  assert.match(citeste("BUILD_INFO.json"), new RegExp('"version": "v100\\.' + app + '"'));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 156);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.scripts["test:v100284"], "node scripts/proba-v100284.mjs"); assert.match(p.scripts.test, /npm run test:v100283 && npm run test:v100284/);
  assert.doesNotMatch(citeste("scripts", "proba-v100283.mjs"), /VERSIUNE = "v100\\\.283"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
