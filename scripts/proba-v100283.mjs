// Proba v100.283 / colector v101.155 (31.10, el: „ok, fă” - ideile 1, 2, 6 de după evaluarea boților):
// (1) oglinda lunii: pe 1 ale lunii (de la 9, cel mult până pe 3), în canalul evaluărilor, cele 5 obiceiuri din analiză - zile cu peste prag,
//     porniți cu frâna trasă, ținuți peste 6 h, închiși în minute, lichidați - luna trecută față de cea dinainte (descriptiv: câți, cât, %);
// (2) seara pe scurt: la 22 (o dată pe zi), câți boți închiși azi, câți în regulă, regula încălcată cel mai des, un sfat pentru mâine;
// (6) JurnalTrade.din liniar: „repornit imediat pe aceeași monedă” căutat în boții monedei, sortați după închidere (era: fiecare bot față
//     de toți ceilalți); același bot găsit ca înainte (primul în ordinea arhivei).
//   node scripts/proba-v100283.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifica } from "./garda-texte.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import * as CO from "./lib/comportament.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const { JurnalTrade: JT, Obiceiuri: OB } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
const fara = (ab, ce) => assert.deepEqual(ab, [], ce + ": " + ab.join("; "));
const garda = (m) => { fara(verifica(m.titlu, "alertaTitlu"), "titlul „" + m.titlu + "”"); fara(verifica(m.mesaj, "raport"), "mesajul"); const a = m.mesaj.split("\n").filter((l) => /^👉 /.test(l)); assert.equal(a.length, 1, "un rând „👉 ”"); fara(verifica(a[0].slice(3), "faCe"), "sfatul „" + a[0] + "”"); };
console.log("\nV100.283 · OGLINDA LUNII · SEARA · JURNALUL LINIAR · proba\n");
const ORA = 3600000, ZI = 86400000, MIN = 60000;

// ---------------- (6) JurnalTrade.din liniar ----------------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const brut = (id, moneda, pornit, inchis, rez) => ({ strategyId: id, base: moneda + ".PERP", createTime: pornit, closeTime: inchis,
  buOrderData: { totalRealizedProfit: String(rez), gridProfit: "0.5", totalFee: "-0.2", totalFundingFee: "0", bottom: "1", top: "1.2", row: "10", usdtInvestment: "100", leverage: "3", gridType: "arithmetic", initPrice: "1.1", closedPrice: "1.1", trend: "long" } });
function boti(n, seed) {
  const r = mulberry32(seed), l = [], T0 = Date.UTC(2026, 0, 1);
  for (let i = 0; i < n; i++) { const p = T0 + Math.floor(r() * 300 * ZI), d = Math.floor(r() * 3 * ORA) + MIN; l.push(brut("b" + i, "M" + Math.floor(r() * 12), p, p + d, Math.round((r() - 0.55) * 200) / 100)); }
  // repornirile: pe aceeași monedă, la 1–9 min după o închidere; două închideri în fereastră ⇒ contează PRIMA din ordinea arhivei
  for (let k = 0; k < n / 10; k++) { const a = l[Math.floor(r() * l.length)], p = a.closeTime + Math.floor(r() * 9 * MIN) + 1000; l.push(brut("r" + k, a.base.replace(".PERP", ""), p, p + ORA, -1)); }
  return l;
}
// referința: căutarea veche, fiecare bot față de toți (ordinea listei, ca în din)
const naiv = (t, toate) => toate.filter((o) => o !== t && o.moneda === t.moneda && o.inchis <= t.pornit && t.pornit - o.inchis < 10 * MIN)[0];
await test("(6) același „repornit imediat” ca înainte, pe 3.000 de boți cu repornirile dese și ferestre cu două închideri (prima din arhivă)", () => {
  const b = boti(2700, 283), l = JT.din(b), dupaId = new Map(l.map((t) => [t.id, t]));
  const ord = b.map((x) => dupaId.get(String(x.strategyId))).filter(Boolean);   // ordinea în care din le-a primit
  let cu = 0;
  for (const t of ord) {
    const a = naiv(t, ord), g = t.greseli.find((x) => x.cod === "reintrare");
    if (!a) { assert.equal(g, undefined, t.id); continue; }
    cu++; assert.ok(g, "lipsește la " + t.id);
    assert.match(g.text, new RegExp("^Pornit la " + Math.round((t.pornit - a.inchis) / 60000) + " min după ce botul anterior pe " + t.moneda + " s-a închis "), t.id);
  }
  assert.ok(cu > 200, "repornirile din fixtură: " + cu);
  // fereastra cu două închideri: prima din ordinea arhivei, nu cea mai apropiată
  const T = Date.UTC(2026, 5, 1), dbl = JT.din([brut("x2", "Q", T, T + 8 * MIN, 5), brut("x1", "Q", T, T + 3 * MIN, -7), brut("y", "Q", T + 9 * MIN, T + ORA, 1)]);
  assert.match(dbl.find((t) => t.id === "y").greseli.find((x) => x.cod === "reintrare").text, /^Pornit la 1 min după .*\(\+5,0 USDT\)\./, "x2 e primul în arhivă");
});
await test("(6) liniar: 12.000 de boți în cel mult o secundă (înainte: fiecare bot față de toți ⇒ zeci de secunde)", () => {
  const b = boti(11000, 7), t0 = Date.now(); JT.din(b); const dt = Date.now() - t0;
  assert.ok(dt < 1000, dt + " ms");
  assert.doesNotMatch(citeste("public", "lib", "jurnal-trade.js"), /toate\.filter\(function \(o\) \{ return o !== t && o\.moneda === t\.moneda/, "căutarea veche a rămas");
});

await test("(6) marginile, ca înainte: exact 10 min ⇒ nu; sub 10 min ⇒ da; închis chiar la pornire ⇒ da; un bot nu se repornește după el însuși", () => {
  const T = Date.UTC(2026, 5, 2, 10), rep = (b) => JT.din(b).find((t) => t.id === "n").greseli.some((g) => g.cod === "reintrare");
  assert.equal(rep([brut("a", "Q", T - ORA, T - 10 * MIN, 1), brut("n", "Q", T, T + ORA, 1)]), false, "exact 10 min");
  assert.equal(rep([brut("a", "Q", T - ORA, T - 10 * MIN + 1, 1), brut("n", "Q", T, T + ORA, 1)]), true, "o clipă sub 10 min");
  assert.equal(rep([brut("a", "Q", T - ORA, T, 1), brut("n", "Q", T, T + ORA, 1)]), true, "închis în clipa pornirii");
  assert.equal(rep([brut("n", "Q", T, T, 1)]), false, "un bot de durată zero, singur");
  assert.equal(rep([brut("a", "R", T - ORA, T - MIN, 1), brut("n", "Q", T, T + ORA, 1)]), false, "altă monedă");
});

// ---------------- (2) seara pe scurt ----------------
const ACUM = Date.UTC(2026, 9, 31, 20, 30);   // 22:30 la București
await test("(2) seara: boții închiși AZI (ziua României), în regulă / cu reguli încălcate, regula cea mai deasă; nimic azi ⇒ nimic", () => {
  const inreg = [
    { id: "a", inchis: Date.UTC(2026, 9, 31, 8), net: 1.5, rele: [] },
    { id: "b", inchis: Date.UTC(2026, 9, 31, 9), net: -4, rele: ["frana"] },
    { id: "c", inchis: Date.UTC(2026, 9, 31, 10), net: -2, rele: ["frana", "minute"] },
    { id: "d", inchis: Date.UTC(2026, 9, 30, 10), net: -9, rele: ["boti"] },          // ieri
    { id: "e", inchis: Date.UTC(2026, 9, 30, 22, 30), net: -1, rele: ["boti"] },      // 31.10 00:30 la București (UTC+2 după 25.10) = azi
    { id: "g", inchis: Date.UTC(2026, 9, 30, 21, 30), net: -3, rele: ["boti"] },      // 30.10 23:30 la București = ieri
  ];
  const s = CO.searaZilei(inreg, ACUM);
  assert.equal(s.n, 4); assert.deepEqual(s.bune, { n: 1, net: 1.5 }); assert.deepEqual(s.rele, { n: 3, net: -7 });
  assert.equal(s.top, "frana"); assert.deepEqual(s.pe.frana, { n: 2, net: -6 });
  assert.equal(CO.searaZilei(inreg.slice(3, 4), ACUM), null);
  assert.equal(CO.searaDatorata({}, ACUM, 22.5), true); assert.equal(CO.searaDatorata({}, ACUM, 21.9), false);
  assert.equal(CO.searaDatorata({ seara: "2026-10-31" }, ACUM, 23), false, "o dată pe zi");
});
await test("(2) mesajul de seară: titlul, grupele, regula cea mai deasă, sfatul pentru mâine; și ziua fără greșeli; garda textelor", () => {
  const s = CO.searaZilei([{ id: "a", inchis: Date.UTC(2026, 9, 31, 8), net: 1.5, rele: [] }, { id: "b", inchis: Date.UTC(2026, 9, 31, 9), net: -4, rele: ["frana"] }, { id: "c", inchis: Date.UTC(2026, 9, 31, 10), net: -2, rele: ["frana", "minute"] }], ACUM);
  const m = MC.searaPeScurt(s, 7);
  assert.equal(m.titlu, "Seara: 3 boți închiși azi, 1 în regulă");
  assert.match(m.mesaj, /^În regulă: 1 bot \(\+1,5 USDT\) · cu reguli încălcate: 2 boți \(−6,0 USDT\)\.\nCel mai des: 2 boți porniți cu frâna trasă \(−6,0 USDT\)\.\n👉 Aș porni mâine doar cu frâna liberă/);
  garda(m);
  const bun = MC.searaPeScurt(CO.searaZilei([{ id: "a", inchis: Date.UTC(2026, 9, 31, 8), net: 1.5, rele: [] }, { id: "f", inchis: Date.UTC(2026, 9, 31, 9), net: 2, rele: [] }], ACUM), 7);
  assert.equal(bun.titlu, "Seara: 2 boți închiși azi, toți în regulă"); assert.match(bun.mesaj, /cu reguli încălcate: niciunul\./); assert.match(bun.mesaj, /\n👉 Aș păstra ziua de azi ca reper/);
  garda(bun);
  for (const c of ["boti", "banda", "minute", "lichidare"]) garda(MC.searaPeScurt({ zi: "2026-10-31", n: 25, bune: { n: 0, net: 0 }, rele: { n: 25, net: -123.4 }, top: c, pe: { [c]: { n: 25, net: -123.4 } } }, 20));
  assert.match(MC.searaPeScurt({ zi: "2026-10-31", n: 1, bune: { n: 0, net: 0 }, rele: { n: 1, net: -3 }, top: "boti", pe: { boti: { n: 1, net: -3 } } }, 7).titlu, /^Seara: 1 bot închis azi, niciunul în regulă$/);
});

// ---------------- (1) oglinda lunii ----------------
const PR = { zi: 100000, sapt: 1000000, rand: 999, boti: 7 };
// boții unei luni: zile cu 3 boți (+1), zile pline (−2 fiecare), minute (−0,5, închise de el), lungi (8 h, −6), o lichidare (−50)
function luna(an, l, zileMici, zilePline, nPlin, cuRest) {
  const out = []; let id = 0, zi = 1; const b = (d, k, dur, net) => { const p = Date.UTC(an, l, d, 6) + k * ORA; out.push({ id: an + "-" + l + "-" + (id++), moneda: "M", pornit: p, inchis: p + dur, durataOre: dur / ORA, net, rezultat: net, comisioane: -0.1, funding: 0, grile: 0.2 }); };
  for (let i = 0; i < zileMici; i++, zi++) for (let k = 0; k < 3; k++) b(zi, k, 2 * ORA, 1);
  for (let i = 0; i < zilePline; i++, zi++) for (let k = 0; k < nPlin; k++) b(zi, k, 2 * ORA, -2);
  if (cuRest) { for (let k = 0; k < 4; k++) b(zi, k, 5 * MIN, -0.5); zi++; for (let k = 0; k < 2; k++) b(zi, k, 8 * ORA, -6); zi++; b(zi, 0, 3 * ORA, -50); }
  return out;
}
const SEPT = luna(2026, 8, 10, 2, 10, false), OCT = luna(2026, 9, 5, 1, 9, true), TOATE = SEPT.concat(OCT);
const MOTIVE = new Map([[OCT[OCT.length - 1].id, "liquidation"]].concat(OCT.filter((t) => t.durataOre < 0.25).map((t) => [t.id, "user_cancel"])));
await test("(1) oglinda unei luni: boții PORNIȚI în lună, zilele peste prag, frâna (pierderile), ținuți peste 6 h, închiși în minute de el, lichidați", () => {
  const o = CO.oglindaLunii(TOATE, PR, "2026-10", OB.franaLaPornire, MOTIVE);
  assert.equal(o.cheie, "2026-10"); assert.equal(o.n, 15 + 9 + 4 + 2 + 1); assert.equal(o.zile, 5 + 1 + 3);
  assert.equal(o.net, 15 - 18 - 2 - 12 - 50);
  assert.deepEqual(o.zilePeste, { z: 1, net: -18 }); assert.deepEqual(o.minute, { n: 4, net: -2 }); assert.deepEqual(o.lungi, { n: 2, net: -12 });
  assert.deepEqual(o.lichidati, { n: 1, net: -50 }); assert.deepEqual(o.frana, { n: 0, net: 0 });
  const s = CO.oglindaLunii(TOATE, PR, "2026-09", OB.franaLaPornire, MOTIVE);
  assert.equal(s.n, 50); assert.deepEqual(s.zilePeste, { z: 2, net: -40 }); assert.deepEqual(s.minute, { n: 0, net: 0 });
  assert.equal(CO.oglindaLunii(TOATE, PR, "2026-07", OB.franaLaPornire, MOTIVE), null, "luna fără boți");
  // pragul pe zi de 10: în ziua plină, la al 7-lea, al 8-lea și al 9-lea bot, primii 5 / 6 / 7 închiși au dat deja −10 / −12 / −14
  const cuFrana = CO.oglindaLunii(TOATE, { zi: 10, sapt: 1000000, rand: 999, boti: 7 }, "2026-10", OB.franaLaPornire, MOTIVE);
  assert.deepEqual(cuFrana.frana, { n: 3, net: -6 });
});
await test("(1) marginile oglinzii: luna după PORNIRE (30.09 → 01.10 e septembrie); exact 7 boți nu e „peste 7”; închis de stop în minute nu e al lui", () => {
  const b2 = (id, p, dur, net) => ({ id, moneda: "M", pornit: p, inchis: p + dur, durataOre: dur / ORA, net, rezultat: net, comisioane: 0, funding: 0 }), l = [];
  for (let k = 0; k < 7; k++) l.push(b2("s" + k, Date.UTC(2026, 9, 12, 6) + k * ORA, 2 * ORA, 1));
  l.push(b2("stop", Date.UTC(2026, 9, 13, 6), 5 * MIN, -0.5));
  l.push(b2("trece", Date.UTC(2026, 8, 30, 20), 6 * ORA, -4));   // 30.09 23:00 la București, închis pe 01.10
  const o = CO.oglindaLunii(l, PR, "2026-10", OB.franaLaPornire, new Map([["stop", "loss_stop"]]));
  assert.equal(o.n, 8); assert.equal(o.zilePeste.z, 0, "exact 7"); assert.equal(o.minute.n, 0, "stopul l-a închis");
  const s = CO.oglindaLunii(l, PR, "2026-09", OB.franaLaPornire, new Map());
  assert.equal(s && s.n, 1, "pornit în septembrie");
});
await test("(1) când se trimite: pe 1–3 ale lunii, de la 9 (ora României), o dată pe lună; luna trecută față de cea dinainte", () => {
  assert.equal(CO.lunaInainte("2026-11"), "2026-10"); assert.equal(CO.lunaInainte("2027-01"), "2026-12");
  const d1 = Date.UTC(2026, 10, 1, 7, 30);   // 01.11 09:30 RO
  assert.deepEqual(CO.oglindaDatorata({}, d1, 9.5), { a: "2026-10", b: "2026-09" });
  assert.equal(CO.oglindaDatorata({}, d1, 8.5), null, "înainte de 9");
  assert.equal(CO.oglindaDatorata({ oglinda: "2026-10" }, d1, 10), null, "o dată");
  assert.deepEqual(CO.oglindaDatorata({}, Date.UTC(2026, 10, 3, 18), 20), { a: "2026-10", b: "2026-09" }, "colectorul oprit pe 1 ⇒ încă pe 3");
  assert.equal(CO.oglindaDatorata({}, Date.UTC(2026, 10, 4, 10), 12), null, "pe 4 nu mai vine");
});
await test("(1) mesajul oglinzii: lunile pe nume, fiecare obicei cu câți / % / net, ce s-a rărit și ce s-a îndesit, un singur obicei de lucrat; garda textelor", () => {
  const a = CO.oglindaLunii(TOATE, PR, "2026-10", OB.franaLaPornire, MOTIVE), b = CO.oglindaLunii(TOATE, PR, "2026-09", OB.franaLaPornire, MOTIVE);
  const m = MC.oglindaLunii(a, b, 7);
  assert.equal(m.titlu, "Oglinda lunii: octombrie față de septembrie");
  const r = m.mesaj.split("\n");
  assert.equal(r[0], "Octombrie: 31 de boți, net −67,0 USDT în 9 zile cu boți · septembrie: 50 de boți, net −10,0 USDT în 12 zile.");
  assert.ok(r.includes("Zile cu peste 7 boți: 1 din 9 (−18,0 USDT) · septembrie: 2 din 12 (−40,0 USDT)."), m.mesaj);
  assert.ok(r.includes("Închiși în minute: 4 boți, 13% (−2,0 USDT) · septembrie: niciunul."), m.mesaj);
  assert.ok(r.includes("Lichidați: 1 bot (−50,0 USDT) · septembrie: niciunul."), m.mesaj);
  assert.match(m.mesaj, /\nFață de septembrie: mai rar - zilele cu peste 7 boți; mai des - boții ținuți peste 6 h, închiderile în minute, lichidările\.\n/);
  assert.equal(r[r.length - 1], "👉 Aș lucra luna asta la un singur obicei: lichidările (boții lor au dat −50,0 USDT).");
  garda(m);
  const fara0 = MC.oglindaLunii(Object.assign({}, a, { lichidati: { n: 0, net: 0 } }), Object.assign({}, b, { lichidati: { n: 0, net: 0 } }), 7);
  assert.doesNotMatch(fara0.mesaj, /Lichidați/, "fără lichidări în nicio lună ⇒ rândul lipsește");
  const bine = MC.oglindaLunii(Object.assign({}, a, { zilePeste: { z: 0, net: 0 }, frana: { n: 0, net: 0 }, lungi: { n: 0, net: 0 }, minute: { n: 0, net: 0 }, lichidati: { n: 0, net: 0 } }), b, 7);
  assert.match(bine.mesaj, /\n👉 Aș păstra ritmul: niciun obicei n-a dat pe minus luna asta\.$/); garda(bine);
});

// ---------------- legarea + versiunile ----------------
await test("colectorul: seara și oglinda în tura comportamentului, pe canalul evaluărilor, o dată (starea ținută)", () => {
  const s = citeste("scripts", "colector.mjs"), tc = s.slice(s.indexOf("async function turaComportament("), s.indexOf("\n}\n", s.indexOf("async function turaComportament(")));
  assert.match(tc, /Comportament\.searaDatorata\(st, acum, ora\)/); assert.match(tc, /canalEvaluari\.trimite\(MesajeColector\.searaPeScurt\(/); assert.match(tc, /st\.seara = /);
  assert.match(tc, /Comportament\.oglindaDatorata\(st, acum, ora\)/); assert.match(tc, /Comportament\.oglindaLunii\(/); assert.match(tc, /canalEvaluari\.trimite\(MesajeColector\.oglindaLunii\(/); assert.match(tc, /st\.oglinda = /);
  assert.doesNotMatch(s, /trimiteAlerta\(MesajeColector\.(searaPeScurt|oglindaLunii)/);
});
await test("versiunile: v100.283 în aplicație, v101.155 în colector; proba în lanț; v100282 de la v100.282 în sus", () => {
  // v100.284: de la v100.283 / v101.155 în sus (ca probele vechi), nu exact
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 283, String(app));
  assert.match(citeste("BUILD_INFO.json"), new RegExp('"version": "v100\\.' + app + '"'));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 155);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.scripts["test:v100283"], "node scripts/proba-v100283.mjs"); assert.match(p.scripts.test, /npm run test:v100282 && npm run test:v100283/);
  assert.doesNotMatch(citeste("scripts", "proba-v100282.mjs"), /VERSIUNE = "v100\\\.282"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
