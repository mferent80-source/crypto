// Proba v100.285 / colector v101.157 (31.10, el: „ok, fă ideile” - după raportul de profit din v100.284):
// (1) lângă profitul real, cât s-a plătit în comisioane și funding pe fiecare perioadă (boți) / comisioane (Trading 212);
// (2) cei mai buni 3 și cei mai slabi 3 ai săptămânii (boți și trade-uri), în raportul de duminică.
// (Ideea 3, profitul real în Radar, intră în pagina nouă „Comportament” - cerută de el în timpul valului.)
//   node scripts/proba-v100285.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { verifica } from "./garda-texte.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import * as PF from "./lib/profit-real.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["statistica-trade.js", "t212.js"]) if (!globalThis[f === "t212.js" ? "T212" : "StatisticaTrade"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { StatisticaTrade: ST, JurnalTrade: JT } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
const fara = (ab, ce) => assert.deepEqual(ab, [], ce + ": " + ab.join("; "));
console.log("\nV100.285 · PROFITUL REAL: COSTURILE ȘI CEI MAI BUNI / SLABI AI SĂPTĂMÂNII · proba\n");
const ORA = 3600000, DUM = Date.UTC(2026, 10, 1, 18, 30);   // duminică 01.11.2026, 20:30 la București
const pr = (n, net, plus) => ({ n, net, plus });
const exemplu = () => {
  const P = PF.perioade(DUM);
  return { P, p: { saptamana: pr(74, -572.7, 44), luna: pr(0, 0, 0), an: pr(1963, -5902.6, 1119), total: Object.assign(pr(2449, -6741.5, 1372), { de: Date.UTC(2025, 11, 21, 10) }), perioade: P },
    q: { saptamana: pr(3, 106.4, 3), luna: pr(3, 106.4, 3), an: pr(291, 6165.2, 218), total: Object.assign(pr(1082, 4949.1, 617), { de: Date.UTC(2025, 8, 8) }), perioade: P },
    ext: { costP: { saptamana: -40.21, luna: 0, an: -2800.5, total: -3223.4 }, costQ: { saptamana: -1.2, luna: -1.2, an: -50.3, total: -120.8 },
      topP: { buni: [{ eticheta: "PARTI", dir: "short", inchis: Date.UTC(2026, 9, 30, 10), rezultat: 21.8 }, { eticheta: "SOL", dir: "long", inchis: Date.UTC(2026, 9, 28, 10), rezultat: 12.1 }, { eticheta: "BTC (spot)", dir: "spot grid", inchis: Date.UTC(2026, 9, 27, 10), rezultat: 2 }],
        slabi: [{ eticheta: "PARTI", dir: "short", inchis: Date.UTC(2026, 9, 30, 12), rezultat: -24.8 }] },
      topQ: { buni: [{ eticheta: "NXPI", inchis: Date.UTC(2026, 9, 29, 15), rezultat: 80.1 }], slabi: [] } } };
};

await test("(1) Jurnalul ține funding-ul botului cu semn (dinPionex dă `funding`); costurile pe perioade: −comisioane + funding la boți, −comisioane la T212, spot / copy fără", () => {
  const brut = (id, inch, rez, fee, fund) => ({ strategyId: id, base: "SOL.PERP", createTime: inch - ORA, closeTime: inch, buOrderData: { totalRealizedProfit: String(rez), gridProfit: "1", totalFee: String(fee), totalFundingFee: String(fund), bottom: "1", top: "2", row: "10", usdtInvestment: "100", leverage: "3", trend: "long" } });
  const toti = [brut("a", Date.UTC(2026, 9, 27, 10), 5, -0.4, -0.1), brut("b", Date.UTC(2026, 9, 28, 10), -3, -0.3, 0.05), brut("c", Date.UTC(2026, 8, 10, 10), 2, -1, -0.5)];
  const boti = ST.dinPionex(JT.din(toti));
  assert.equal(boti.find((x) => x.id === "a").funding, -0.1); assert.equal(boti.find((x) => x.id === "b").funding, 0.05);
  assert.equal(typeof PF.costuriPe, "function", "PF.costuriPe lipsește");
  const c = PF.costuriPe(boti.concat([{ inchis: Date.UTC(2026, 9, 29), rezultat: 3, comisioane: null }]), DUM);
  assert.equal(c.saptamana, Math.round((-0.4 - 0.1 - 0.3 + 0.05) * 100) / 100); assert.equal(c.luna, 0);
  assert.equal(c.an, Math.round((-0.4 - 0.1 - 0.3 + 0.05 - 1 - 0.5) * 100) / 100); assert.equal(c.total, c.an);
  assert.equal(PF.costuriPe([{ inchis: Date.UTC(2026, 9, 27), rezultat: 10, comisioane: 1.25 }], DUM).saptamana, -1.25, "T212: comisioanele scad");
  assert.equal(PF.costuriPe([{ inchis: Date.UTC(2026, 9, 27), rezultat: 10, comisioane: -1.25 }], DUM).saptamana, -1.25, "și cu semnul minus în sursă");
  assert.equal(PF.costuriPe([{ inchis: DUM + ORA, rezultat: 10, comisioane: 5 }], DUM).total, 0, "închis după acum nu intră");
  const luni = PF.perioade(DUM).saptamana.de;
  assert.equal(PF.costuriPe([{ inchis: luni, rezultat: 1, comisioane: 2 }], DUM).saptamana, -2, "închis exact luni la 00:00 intră în săptămână");
});
await test("(2) cei mai buni / slabi ai săptămânii: doar săptămâna, pe plus descrescător, pe minus crescător, cel mult 3, zero în niciunul", () => {
  assert.equal(typeof PF.topSapt, "function", "PF.topSapt lipsește");
  const it = (e, z, r) => ({ eticheta: e, inchis: Date.UTC(2026, 9, z, 10), rezultat: r });
  const l = [it("A", 27, 5), it("B", 28, 21.8), it("C", 28, -24.8), it("D", 29, 0), it("E", 30, -7.4), it("F", 30, 12.1), it("G", 31, 1), it("H", 31, -18.4), it("I", 25, 99), it("J", 25, -99), it("K", 26, -1)];
  const t = PF.topSapt(l, DUM, 3);
  assert.deepEqual(t.buni.map((x) => x.eticheta), ["B", "F", "A"]); assert.deepEqual(t.slabi.map((x) => x.eticheta), ["C", "H", "E"]);
  assert.deepEqual(PF.topSapt([it("I", 25, 99), it("J", 25, -99)], DUM, 3), { buni: [], slabi: [] }, "duminica trecută nu intră");
  assert.deepEqual(PF.topSapt([it("K", 26, -1)], DUM, 3).slabi.map((x) => x.eticheta), ["K"], "luni 26.10 intră");
  assert.deepEqual(PF.topSapt([it("D", 29, 0), it("A", 27, 5)], DUM, 3), { buni: [l[0]].map(() => ({ eticheta: "A", inchis: Date.UTC(2026, 9, 27, 10), rezultat: 5 })), slabi: [] }, "zero nu e printre cei mai buni");
  const luni = PF.perioade(DUM).saptamana.de;
  assert.equal(PF.topSapt([{ eticheta: "M", inchis: luni, rezultat: -3 }], DUM, 3).slabi.length, 1, "închis exact luni la 00:00 intră");
});
await test("(1)(2) raportul de duminică: costurile pe fiecare rând, cei mai buni / slabi sub fiecare piață; fără `ext` exact ca în v100.284; garda textelor", () => {
  const { p, q, ext } = exemplu(), m = MC.profitReal(p, q, "ok", ext), r = m.mesaj.split("\n");
  assert.ok(r.includes("• săptămâna 26.10–01.11: 74 de boți, net −572,7 USDT, din care comisioane și funding −40,2 (59% pe plus)"), m.mesaj);
  assert.ok(r.includes("• total, de la 21.12.2025: 2449 de boți, net −6.741,5 USDT, din care comisioane și funding −3.223,4 (56% pe plus)"), m.mesaj);
  assert.ok(r.includes("• noiembrie: niciun bot închis"), "luna fără boți rămâne fără costuri: " + m.mesaj);
  assert.ok(r.includes("Cei mai buni ai săptămânii (USDT): PARTI short +21,8 (30.10) · SOL long +12,1 (28.10) · BTC (spot) +2,0 (27.10)."), m.mesaj);
  assert.ok(r.includes("Cei mai slabi ai săptămânii (USDT): PARTI short −24,8 (30.10)."), m.mesaj);
  assert.ok(r.includes("• săptămâna 26.10–01.11: 3 trade-uri, net +106,4 lei, din care comisioane −1,2 (100% pe plus)"), m.mesaj);
  assert.ok(r.includes("Cei mai buni ai săptămânii (lei): NXPI +80,1 (29.10)."), m.mesaj); assert.ok(r.includes("Cei mai slabi ai săptămânii (lei): niciunul pe minus."), m.mesaj);
  assert.ok(r.indexOf("Cei mai buni ai săptămânii (USDT): PARTI short +21,8 (30.10) · SOL long +12,1 (28.10) · BTC (spot) +2,0 (27.10).") < r.indexOf("Trading 212, trade-urile închise, după comisioane:"), "topul boților stă sub boți");
  assert.ok(m.mesaj.length < 1900, "încape într-un mesaj Discord: " + m.mesaj.length);
  fara(verifica(m.titlu, "alertaTitlu"), "titlul"); fara(verifica(m.mesaj, "raport"), "mesajul");
  const gol = MC.profitReal(p, q, "ok", Object.assign({}, ext, { topQ: { buni: [], slabi: [] } }));
  assert.ok(!/ai săptămânii \(lei\)/.test(gol.mesaj), "fără trade-uri în săptămână, fără rândurile topului: " + gol.mesaj);
  const v = MC.profitReal(p, q, "ok").mesaj.split("\n");
  assert.ok(v.includes("• săptămâna 26.10–01.11: 74 de boți, net −572,7 USDT (59% pe plus)") && !v.some((x) => /ai săptămânii|din care/.test(x)), "fără ext, ca în v100.284");
});
await test("garda de alerte are situația cu costurile și topul", () => {
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /MC\.profitReal\(pb, pt, "ok", \{ costP/);
});
await test("colectorul: raportul de duminică primește costurile și cei mai buni / slabi (aceleași liste ca netul)", () => {
  const s = citeste("scripts", "colector.mjs"), i = s.indexOf("async function turaComportament("), tc = s.slice(i, s.indexOf("\n}\n", i));
  assert.match(tc, /Profit\.costuriPe\(boti, acum\)/); assert.match(tc, /Profit\.topSapt\(boti, acum, 3\)/);
  assert.match(tc, /Profit\.costuriPe\(t212, acum\)/); assert.match(tc, /Profit\.topSapt\(t212, acum, 3\)/);
  assert.match(tc, /MesajeColector\.profitReal\(pb, pt, stare, \{ costP/);
});
await test("versiunile: v100.285 în aplicație, v101.157 în colector; proba în lanț; v100284 de la v100.284 în sus", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.285"/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.285"/);
  assert.match(citeste("public", "index.html"), /id="healthAppVersion">v100\.285</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-285/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.157"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.285.0", "versiunea din package.json (syntax-v71 o leagă de cache-ul sw.js)"); assert.equal(p.scripts["test:v100285"], "node scripts/proba-v100285.mjs"); assert.match(p.scripts.test, /npm run test:v100284 && npm run test:v100285/);
  assert.doesNotMatch(citeste("scripts", "proba-v100284.mjs"), /VERSIUNE = "v100\\\.284"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
