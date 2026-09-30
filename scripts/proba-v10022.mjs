// Proba v100.22 (30.09, el: „în pagina istoric trade-uri vreau o statistică a trade-ului pe Pionex și pe Trade 212: ce am
// făcut bine, ce am greșit, cât am pierdut sau câștigat per trade, per total… cu rapoarte, tabele” -> „Sus pe fiecare filă”).
// Modulul StatisticaTrade: acelasi calcul pentru boti Pionex (USDT) si trade-uri Trading 212 (lei). Date INVENTATE: repo-ul
// e public, trade-urile lui reale nu intra aici (cifrele reale se verifica local).
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.22 · statistica trade-urilor · proba\n");

const Z = 86400000, T0 = Date.UTC(2026, 0, 5, 12);   // luni 5 ianuarie 2026, 14:00 ora RO
// 12 trade-uri: rezultate +10 +20 −5 +10 −30 −10 +40 +5 −15 +25 +10 −5 (total +55), pe 3 luni si 3 etichete
const REZ = [10, 20, -5, 10, -30, -10, 40, 5, -15, 25, 10, -5], ET = ["A", "B", "A", "C", "B", "B", "A", "C", "B", "A", "C", "A"];
const TR = REZ.map((r, i) => ({ id: "t" + i, eticheta: ET[i], pornit: T0 + i * 7 * Z, inchis: T0 + i * 7 * Z + (i % 3 === 0 ? 2 : 30) * 3600000, rezultat: r, baza: 100, durataOre: i % 3 === 0 ? 2 : 30, comisioane: 1 }));

await test("cifrele de baza: n, pe plus, rata, total, mediile, raportul, factorul de profit, cat aduce un trade", () => {
  const s = ST.calc(TR, { moneda: "lei" });
  assert.equal(s.n, 12); assert.equal(s.pePlus, 7); assert.equal(s.peMinus, 5);
  assert.equal(s.total, 55);
  assert.ok(Math.abs(s.rataCastig - 7 / 12) < 1e-12);
  assert.ok(Math.abs(s.castigMediu - 120 / 7) < 1e-9); assert.ok(Math.abs(s.pierdereMedie + 13) < 1e-9);
  assert.ok(Math.abs(s.factorProfit - 120 / 65) < 1e-9);
  assert.ok(Math.abs(s.asteptare - 55 / 12) < 1e-9);
  assert.equal(s.celMaiMare.rezultat, 40); assert.equal(s.ceaMaiMare.rezultat, -30);
  assert.equal(s.comisioane, 12);
});

await test("curba banilor si cea mai mare cadere (de la varf la fund, pe ordinea inchiderilor), seriile", () => {
  const s = ST.calc(TR, { moneda: "lei" });
  // cumul: 10 30 25 35 5 −5 35 40 25 50 60 55 -> varf 35 (t3), fund −5 (t5): caderea 40
  assert.deepEqual(s.curba.map((x) => x.cumul), [10, 30, 25, 35, 5, -5, 35, 40, 25, 50, 60, 55]);
  assert.equal(s.drawdown.max, 40);
  assert.equal(s.drawdown.panaLa, TR[5].inchis); assert.equal(s.drawdown.dela, TR[3].inchis);
  assert.equal(s.serii.castiguri, 2); assert.equal(s.serii.pierderi, 2);
});

await test("pe luna (ora Romaniei), pe eticheta, pe durata", () => {
  const s = ST.calc(TR, { moneda: "lei", durate: [["sub 6 h", 0, 6], ["peste 6 h", 6, Infinity]] });
  assert.equal(s.perLuna.length, 3);
  assert.equal(s.perLuna[0].luna, "2026-01"); assert.equal(s.perLuna[0].n, 4); assert.equal(s.perLuna[0].total, 35);
  const A = s.perEticheta.find((x) => x.eticheta === "A");
  assert.equal(A.n, 5); assert.equal(A.total, 65); assert.equal(A.pePlus, 3);   // 10 −5 +40 +25 −5
  assert.equal(s.perEticheta[0].eticheta, "A", "sortat dupa total");
  const d = s.perDurata;
  assert.equal(d[0].n, 4); assert.equal(d[0].total, 10 + 10 + 40 + 25); assert.equal(d[1].n, 8);   // i = 0, 3, 6, 9
});

await test("luna dupa ora ROMANIEI: inchis la 00:30 pe 1 februarie (ora RO) = februarie, desi e inca 31 ianuarie UTC", () => {
  const t = Date.UTC(2026, 0, 31, 22, 30), s = ST.calc([{ id: "x", eticheta: "A", pornit: t - Z, inchis: t, rezultat: 5, baza: 100, durataOre: 24 }], { moneda: "lei" });
  assert.equal(s.perLuna[0].luna, "2026-02");
});

await test("distributia pe randament (rezultat / baza) si cele mai mari 5 pierderi cu ponderea lor", () => {
  const s = ST.calc(TR, { moneda: "lei" });
  assert.equal(s.distributie.reduce((a, g) => a + g.n, 0), 12);
  const g = s.distributie.find((x) => x.de === -0.2 && x.pana === -0.1); assert.equal(g.n, 1);   // doar −15% (−30% e sub −20%, −10% e in [−10%, −5%))
  assert.equal(s.top5Pierderi.lista.length, 5);
  assert.ok(Math.abs(s.top5Pierderi.pondere - 1) < 1e-12, "5 pierderi din 5 = 100%");
});

await test("ce ai facut bine / ce ai gresit: din cifre, fiecare cu suma lui; sub 10 trade-uri -> avertisment, nu concluzii", () => {
  const s = ST.calc(TR, { moneda: "lei" });
  assert.ok(s.bine.length >= 2 && s.gresit.length >= 2, JSON.stringify({ b: s.bine, g: s.gresit }));
  assert.ok(s.bine.some((x) => /A/.test(x.text) && x.suma === 65), "cea mai buna eticheta");
  assert.ok(s.gresit.some((x) => /cea mai mare cădere/i.test(x.text) && x.suma === -40));
  const mic = ST.calc(TR.slice(0, 6), { moneda: "USDT" });
  assert.equal(mic.suficient, false);
  assert.match(mic.avertisment, /doar 6 trade-uri/);
  assert.equal(mic.bine.length, 0); assert.equal(mic.gresit.length, 0);
});

await test("pierderea medie mai mare decat castigul mediu -> la gresit, cu cate castiguri mananca o pierdere", () => {
  const l = [30, -60, 30, -60, 30, 30, 30, -60, 30, 30, 30, -60].map((r, i) => ({ id: "p" + i, eticheta: "Z", pornit: T0 + i * Z, inchis: T0 + i * Z + 3600000, rezultat: r, baza: 100, durataOre: 1 }));
  const s = ST.calc(l, { moneda: "lei" });
  assert.ok(s.gresit.some((x) => /pierderea medie/i.test(x.text) && /2,0 câștiguri/.test(x.text)), JSON.stringify(s.gresit));
});

await test("dinPionex / dinT212: formele din JurnalTrade si din T212.perechi devin trade-uri comune", () => {
  const p = ST.dinPionex([{ id: "2390", moneda: "LIGHTER", dir: "long", levier: 5, investit: 103.38, pornit: 1, inchis: 3600001, durataOre: 1, rezultat: -58.52, comisioane: -0.5, greseli: [{ cod: "stop-atins" }] }]);
  assert.deepEqual([p[0].eticheta, p[0].baza, p[0].comisioane, p[0].dir, p[0].levier, p[0].greseli[0]], ["LIGHTER", 103.38, 0.5, "long", 5, "stop-atins"]);
  assert.ok(Math.abs(p[0].rezultat - (-59.02)) < 1e-9, `net = realizat + comisioane (+ funding): ${p[0].rezultat}`);
  const pf = ST.dinPionex([{ id: "x", moneda: "JTO", rezultat: -8.98, comisioane: -1.2, funding: -4.16, investit: 98, pornit: 1, inchis: 2, durataOre: 1 }]);
  assert.ok(Math.abs(pf[0].rezultat - (-14.34)) < 1e-9, `JTO net ${pf[0].rezultat}`);
  const t = ST.dinT212([{ id: "1", simbol: "ISRG", pornit: 1, inchis: 2, durataOre: 107.9, rezultat: 147.91, cost: 3693.24, comisioane: 11.3 }]);
  assert.deepEqual([t[0].eticheta, t[0].baza, t[0].comisioane], ["ISRG", 3693.24, 11.3]);
});

await test("pe directie si pe levier (Pionex), doar cand trade-urile le au", () => {
  const l = TR.map((t, i) => Object.assign({}, t, { dir: i % 2 ? "long" : "short", levier: i % 4 === 0 ? 3 : 5 }));
  const s = ST.calc(l, { moneda: "USDT" });
  assert.equal(s.perDir.length, 2); assert.equal(s.perLevier.length, 2);
  assert.equal(ST.calc(TR, { moneda: "lei" }).perDir.length, 0);
});

await test("graficele: curba (linie + zero), lunile si distributia in bare cu plus deasupra / minus dedesubt, cu <title> la fiecare", () => {
  const s = ST.calc(TR, { moneda: "lei" });
  const c = ST.svgCurba(s.curba, { moneda: "lei" }), L = ST.svgLuni(s.perLuna, { moneda: "lei" }), D = ST.svgDistributie(s.distributie);
  for (const x of [c, L, D]) { assert.match(x, /^<svg[^>]*viewBox=/); assert.match(x, /role="img"/); }
  assert.match(c, /class="stCurba"/); assert.match(c, /class="stZero"/); assert.equal((c.match(/<title>/g) || []).length, 12);
  assert.equal((L.match(/class="stBara stPlus"/g) || []).length + (L.match(/class="stBara stMinus"/g) || []).length, 3);
  assert.equal((L.match(/<title>/g) || []).length, 3);
  assert.equal(ST.svgCurba([], {}), "");
});

await test("html: cifrele mari, bine / gresit (sau avertismentul), curba, pe luna, unde castigi / pierzi, cat ai tinut, toate trade-urile + CSV", () => {
  const s = ST.calc(TR, { moneda: "lei" }), h = ST.html(s, { titlu: "Trading 212", piata: "actiuni", actiuneOrdine: "jtStatOrdine", actiuneCsv: "jtStatCsv" });
  for (const x of ["Rezultat total", "Pe trade, în medie", "Rata de câștig", "Factor de profit", "Cea mai mare cădere", "Ce ai făcut bine", "Ce ai greșit", "Curba banilor", "Pe lună", "Unde câștigi", "Unde pierzi", "Cât ai ținut", "Toate trade-urile"]) assert.ok(h.includes(x), `lipseste „${x}”`);
  assert.ok(h.includes(`data-action-click="jtStatCsv('actiuni')"`), "butonul CSV"); assert.ok(h.includes(`data-action-click="jtStatOrdine('actiuni','pierderi')"`), "ordinea pierderi");
  const mic = ST.html(ST.calc(TR.slice(0, 6), { moneda: "USDT" }), { titlu: "Pionex" });
  assert.match(mic, /stAvert/); assert.doesNotMatch(mic, /Ce ai făcut bine/);
  assert.match(ST.html(ST.calc(TR, { moneda: "lei" }), { ordine: "pierderi" }), /<tbody><tr><td>[^<]*<\/td><td>B<\/td><td class="bad"><b>−30/, "ordinea: cea mai mare pierdere prima");
  assert.match(ST.html(ST.calc([{ id: "a", eticheta: "<script>", pornit: 1, inchis: 2, rezultat: 1, baza: 1, durataOre: 1 }], {}), {}), /&lt;script&gt;/);
  assert.match(ST.html(ST.calc([], {}), { titlu: "Pionex" }), /niciun trade/i);
});

await test("poza a prins (30.09): eticheta maximului nu se suprapune peste „0”; „1 pierdere” la singular; „Unde câștigi” doar pe plus", () => {
  // maximul curbei (+0,78) aproape de zero: fara eticheta lui, ca sa nu se calce cu „0”
  const aproape = ST.svgCurba([{ t: 1, cumul: 0.78, rezultat: 0.78, eticheta: "A" }, { t: 2, cumul: -58.27, rezultat: -59.05, eticheta: "B" }], { moneda: "USDT" });
  assert.doesNotMatch(aproape, />\+0,78</, "eticheta maximului lipit de zero");
  assert.match(aproape, />−58,27</);
  const l = [5, -1, 3, 2, 4, -2, 6, 1, 2, 3].map((r, i) => ({ id: "s" + i, eticheta: i < 8 ? "X" + i : "Y", pornit: i, inchis: i + 1, rezultat: r, baza: 10, durataOre: 1 }));
  const h = ST.html(ST.calc(l, { moneda: "USDT" }), {});
  assert.match(h, /1 pierdere</); assert.doesNotMatch(h, /1 pierderi/);
  const i0 = h.indexOf("Unde câștigi"), i1 = h.indexOf("Unde pierzi"), sectiune = h.slice(i0, i1);
  assert.doesNotMatch(sectiune, /class="bad"/, "„Unde câștigi” are randuri pe minus");
});

await test("CSV: un rand pe trade, antet, zecimale cu VIRGULA (Excel romanesc, v100.23), ghilimele unde trebuie", () => {
  const csv = ST.csv([{ id: "1", eticheta: 'A,"B"', pornit: Date.UTC(2026, 0, 1), inchis: Date.UTC(2026, 0, 2), rezultat: -5.5, baza: 100, durataOre: 24, comisioane: 1 }], "lei");
  const r = csv.trim().split("\n");
  assert.equal(r.length, 2); assert.match(r[0], /^inchis_utc;eticheta;/);
  assert.match(r[1], /"A,""B"""/); assert.match(r[1], /;-5,5;/);
});

await test("pagina: statistica sus pe fiecare fila (Crypto, Actiuni, Tot), scriptul inaintea app.js, in APP_SHELL", () => {
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8"), sw = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8"), t2 = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="jtStatCrypto"') > html.indexOf('id="jtCrypto"'), "jtStatCrypto in fila Crypto");
  assert.ok(html.indexOf('id="jtStatTot"') > 0 && html.indexOf('id="jtStatTot"') < html.indexOf('id="jtActiuni"'), "jtStatTot deasupra filelor");
  const iS = html.indexOf('src="/lib/statistica-trade.js"'), iA = html.indexOf('src="/app.js"');
  assert.ok(iS > 0 && iS < iA, "ordinea scripturilor");
  assert.match(sw, /"\/lib\/statistica-trade\.js"/);
  assert.match(app, /StatisticaTrade\.calc\(/); assert.match(app, /function jtStatHtml\(/);
  assert.ok(t2.includes('jtStatRender("actiuni")'), "fila Actiuni deseneaza statistica T212"); assert.match(t2, /jtStatTot/); assert.ok(t2.includes('id="jtStatActiuni"'), "locul statisticii T212");
  assert.match(app, /function jtStatOrdine\(/); assert.match(app, /function jtStatCsv\(/); assert.match(app, /new Blob\(/);
  // cifra veche de sus (realizatul Pionex, fara comisioane si funding) nu mai contrazice statistica neta de deasupra
  assert.ok(app.includes('cel("Rezultat realizat"'), "eticheta noua"); assert.ok(app.includes("înainte de comisioane și funding"), "explicatia");
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
