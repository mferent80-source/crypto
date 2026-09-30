// Proba v100.26 (30.09, el: „FA IDEILE” - ideea 3 din trei): „Înainte / după” regulile noi din 30.09 (alerta de stop la plan,
// gridul dupa plan, stopul la o grila) - boti Pionex porniti inainte vs dupa 30.09 05:10 ora Romaniei, pe aceleasi masuri, cu
// verdict doar cand ambele parti au macar 10 trade-uri (regula lui: sub 10 nu se trag concluzii).
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.26 · inainte / dupa regulile din 30.09 · proba\n");
const R = Date.UTC(2026, 8, 30, 2, 10), H = 3600000;
const tr = (rez, dela, o) => rez.map((r, i) => Object.assign({ id: "x" + dela + i, eticheta: "M" + (i % 3), pornit: dela + i * H, inchis: dela + i * H + H, rezultat: r, baza: 100, durataOre: 1 }, o ? o(i) : {}));

await test("REGULI_NOI: 30.09.2026 05:10 ora Romaniei, cu eticheta care spune ce reguli", () => {
  assert.equal(ST.REGULI_NOI.de, R);
  assert.match(ST.REGULI_NOI.et, /30\.09/); assert.match(ST.REGULI_NOI.ce, /stop/i); assert.match(ST.REGULI_NOI.ce, /plan/i);
});

await test("compara: imparte dupa ora PORNIRII (nu a inchiderii) si masoara la fel ambele parti", () => {
  // un bot pornit inainte si inchis dupa ramane „înainte”
  const l = tr([-20, 5, 5, -2, 5], R - 10 * H).concat(tr([3, -1], R + H));
  const c = ST.compara(l, R);
  assert.equal(c.a.n, 5); assert.equal(c.b.n, 2);
  assert.ok(Math.abs(c.a.rata - 0.6) < 1e-9); assert.ok(Math.abs(c.b.rata - 0.5) < 1e-9);
  assert.ok(Math.abs(c.a.peTrade - (-7 / 5)) < 1e-9);
  assert.ok(Math.abs(c.a.pierdereMediePct - (-0.11)) < 1e-9, "(−20 − 2) / 2 / 100");
  assert.ok(Math.abs(c.a.ceaMaiMarePct - (-0.2)) < 1e-9);
  assert.equal(c.a.mari, 1); assert.ok(Math.abs(c.a.mariPondere - 0.2) < 1e-9, "pierderi de peste 10 % din suma pusa");
  assert.equal(c.destul, false);
});

await test("verdict doar cu macar 10 de fiecare parte; directia corecta pe fiecare masura (mai putine pierderi mari = mai bine)", () => {
  const inainte = tr([-30, 5, 5, -25, 5, 5, -2, 5, -40, 5, 5, 5], R - 40 * H);
  const dupa = tr([4, 4, -3, 4, 4, -2, 4, 4, -3, 4, 4], R + H);
  const c = ST.compara(inainte.concat(dupa), R);
  assert.equal(c.destul, true);
  const v = Object.fromEntries(c.randuri.map((r) => [r.cheie, r.verdict]));
  assert.equal(v.rata, "mai-bine"); assert.equal(v.peTrade, "mai-bine"); assert.equal(v.ceaMaiMarePct, "mai-bine"); assert.equal(v.mariPondere, "mai-bine"); assert.equal(v.pierdereMediePct, "mai-bine");
  // si invers
  const c2 = ST.compara(dupa.map((x) => ({ ...x, pornit: x.pornit - 60 * H })).concat(inainte.map((x) => ({ ...x, id: "d" + x.id, pornit: x.pornit + 60 * H }))), R);
  assert.equal(Object.fromEntries(c2.randuri.map((r) => [r.cheie, r.verdict])).mariPondere, "mai-rau");
  // sub 10 de o parte: fara verdict
  const c3 = ST.compara(inainte.concat(dupa.slice(0, 9)), R);
  assert.equal(c3.destul, false); assert.ok(c3.randuri.every((r) => r.verdict === null));
});

await test("html: tabelul Înainte / După cu verdictul scris (nu doar culoare) si nota cinstita dupa cati sunt", () => {
  const inainte = tr([-30, 5, 5, -25, 5, 5, -2, 5, -40, 5, 5, 5], R - 40 * H), dupa = tr([4, 4, -3, 4, 4, -2, 4, 4, -3, 4, 4], R + H);
  const s = ST.calc(inainte.concat(dupa), { moneda: "USDT" });
  const h = ST.html(s, { titlu: "Statistica · Pionex", piata: "crypto", comparatie: ST.compara(inainte.concat(dupa), R) });
  assert.match(h, /Înainte \/ după regulile din 30\.09/); assert.match(h, /<th>Înainte<\/th><th>După<\/th>/);
  assert.ok(h.includes('▲<span class="stVerdTxt"> mai bine</span>'), "sageata + textul (pe telefon textul ramane pentru cititorul de ecran)"); assert.match(h, /Pierderi mari/);
  const css = fs.readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
  assert.ok(css.includes(".stCompara .stTabel td:first-child{white-space:normal"), "pe telefon eticheta se rupe, coloana După ramane pe ecran");
  const bloc = h.slice(h.indexOf("stCompara"), h.indexOf("Curba banilor"));
  assert.doesNotMatch(bloc, />-\d/, "minus adevarat (−), ca in restul paginii"); assert.match(bloc, />−\d/);
  // niciunul dupa: se spune, fara verdict
  const h0 = ST.html(ST.calc(inainte, { moneda: "USDT" }), { titlu: "x", piata: "crypto", comparatie: ST.compara(inainte, R) });
  assert.match(h0, /Încă niciun bot pornit după regulile noi nu s-a închis/); assert.doesNotMatch(h0, /▲|▼/);
  // cativa: prea putini
  const h3 = ST.html(ST.calc(inainte.concat(dupa.slice(0, 3)), { moneda: "USDT" }), { titlu: "x", piata: "crypto", comparatie: ST.compara(inainte.concat(dupa.slice(0, 3)), R) });
  assert.match(h3, /Doar 3 boți după regulile noi/); assert.match(h3, /de la 10/);
  // fara comparatie (T212, Tot) -> fara bloc
  assert.doesNotMatch(ST.html(s, { titlu: "x" }), /Înainte \/ după/);
});

await test("pagina: comparatia doar pe fila Pionex, din lista perioadei alese, cu ora regulilor din modul", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const i = app.indexOf("function jtStatDate("), corp = app.slice(i, app.indexOf("\n}", i));
  assert.match(corp, /StatisticaTrade\.compara\(tr,StatisticaTrade\.REGULI_NOI\.de\)/); assert.match(corp, /piata==="crypto"/);
  const j = app.indexOf("function jtStatRender("), r = app.slice(j, app.indexOf("\n}", j));
  assert.match(r, /comparatie:d\.comp/);
});

// ---- suma pusa reala (gasit pe toata istoria: 17 boti „pierdeau” peste 100 % din suma pusa) ----
// Dovada pe botii reali (30.09): banii primiti inapoi = quoteInvestment + extraMargin − profitExited + net, la cent pe 1784 din 2184;
// usdtInvestment e doar suma de PORNIRE (fara marja adaugata pe drum; quoteInvestment creste si cu profitul mutat in investitie).
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const botP = (d) => ({ strategyId: "p" + Math.random().toString(36).slice(2, 8), base: "ABC.PERP", createTime: R - 5 * H, closeTime: R - H,
  buOrderData: Object.assign({ totalRealizedProfit: "-10", gridProfit: "1", totalFee: "-0.5", totalFundingFee: "0", leverage: "5", trend: "long", bottom: "1", top: "2", row: 10, gridType: "arithmetic" }, d) });

await test("JurnalTrade.pus: investitia + marja adaugata − profitul mutat in investitie; fara campuri -> usdtInvestment (ca inainte)", () => {
  const [a, b, c, d] = JT.din([
    botP({ usdtInvestment: "50", quoteInvestment: "50", extraMargin: "57.08" }),                       // marja adaugata pe drum
    botP({ usdtInvestment: "58.51", quoteInvestment: "36.41", extraMargin: "84.6", initExtraMargin: "22.1" }), // marja de la pornire e in extraMargin
    botP({ usdtInvestment: "744.71", quoteInvestment: "1133.23", profitExited: "388.52" }),           // profit mutat in investitie
    botP({ usdtInvestment: "100" }),                                                                   // forma veche
  ]).sort((x, y) => x.investit - y.investit);
  const pe = (inv) => [a, b, c, d].find((t) => t.investit === inv);
  assert.ok(Math.abs(pe(50).pus - 107.08) < 1e-9, pe(50).pus);
  assert.ok(Math.abs(pe(58.51).pus - 121.01) < 1e-9, pe(58.51).pus);
  assert.ok(Math.abs(pe(744.71).pus - 744.71) < 1e-6, pe(744.71).pus);
  assert.equal(pe(100).pus, 100);
});

await test("statistica ia suma pusa reala (baza) - nu mai iese „−215 % din suma pusă” la un bot cu marja adaugata", () => {
  const l = ST.dinPionex(JT.din([botP({ totalRealizedProfit: "-107.3", usdtInvestment: "50", quoteInvestment: "50", extraMargin: "57.08" })]));
  assert.ok(Math.abs(l[0].baza - 107.08) < 1e-9);
  assert.ok(l[0].rezultat / l[0].baza > -1.01);
});

const { compactBot, CAMPURI_ARHIVA, FORMA_ARHIVA } = await import("../functions/_shared/boti-arhiva.js");
const { strangeBoti } = await import("./lib/tura-arhiva-boti.mjs");
await test("arhiva pastreaza campurile sumei puse (si banii primiti inapoi); forma 2", () => {
  for (const k of ["quoteInvestment", "extraMargin", "profitExited", "unlockQuoteAmount"]) assert.ok(CAMPURI_ARHIVA.includes(k), k);
  assert.ok(FORMA_ARHIVA >= 2);
  const c = compactBot(botP({ usdtInvestment: "50", quoteInvestment: "50", extraMargin: "57.08", unlockQuoteAmount: "0" }));
  assert.equal(c.buOrderData.extraMargin, "57.08"); assert.equal(c.buOrderData.unlockQuoteAmount, "0");
});

await test("arhiva de forma veche se reface singura: tura o ia de la capat (retrimite si botii stiuti), completa abia la sfarsit, apoi forma 2", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  let ip = 0; const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.27.0." + (++ip) });
  const cereSrv = async (p) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test" + p, { headers: h() }), env })).text());
  const trimite = async (p, corp) => JSON.parse(await (await m.onRequestPost({ request: new Request("https://exemplu.test" + p, { method: "POST", headers: h(), body: JSON.stringify(corp) }), env })).text());
  const toti = Array.from({ length: 25 }, (_, i) => Object.assign(botP({ usdtInvestment: "10", quoteInvestment: "10", extraMargin: String(i) }), { strategyId: "z" + i, closeTime: R - i * H }));
  // arhiva veche: completa, dar fara campurile noi si fara forma
  kv.set("botiInchisi", JSON.stringify({ la: 5, complet: true, boti: toti.map((b) => ({ strategyId: b.strategyId, base: b.base, createTime: b.createTime, closeTime: b.closeTime, buOrderData: { totalRealizedProfit: "-10" } })) }));
  assert.equal((await cereSrv("/api/istoric-bot?action=botiInchisi")).forma, 1);
  const pagina = (tok) => { const s = tok ? Number(tok) : 0; return { bots: toti.slice(s, s + 10), nextPageToken: s + 10 < toti.length ? String(s + 10) : null }; };
  const cere = async (p) => p.startsWith("/api/bot-orders?") ? pagina(new URLSearchParams(p.split("?")[1]).get("pageToken")) : cereSrv(p);
  const vazute = [];
  const vechiRamase = [];
  const r = await strangeBoti({ cere, trimite: async (p, c) => { vazute.push(c.complet); const g = await cereSrv("/api/istoric-bot?action=botiInchisi"); vazute.push(g.complet); const x = await trimite(p, c); const g2 = await cereSrv("/api/istoric-bot?action=botiInchisi"); vechiRamase.push(g2.boti.filter((b) => b.forma !== FORMA_ARHIVA).length); return x; }, pauza: async () => {}, bucata: 10 });
  // boti vechi, inca neretrimisi, raman pe forma veche (altfel o tura intrerupta i-ar lasa fara campurile noi, „stiuti”)
  assert.deepEqual(vechiRamase, [15, 5, 0]);
  assert.equal(r.noi, 25, "toti retrimisi"); assert.equal(r.pagini, 3);
  const g = await cereSrv("/api/istoric-bot?action=botiInchisi");
  assert.equal(g.forma, FORMA_ARHIVA); assert.equal(g.complet, true); assert.equal(g.n, 25);
  assert.equal(g.boti.find((b) => b.strategyId === "z7").buOrderData.extraMargin, "7", "campurile noi au intrat");
  // cat timp se reface, arhiva NU se da drept completa (dupa prima bucata trimisa)
  // vazute = [steagul bucatii 1, arhiva inainte de 1, steagul bucatii 2, arhiva DUPA bucata 1, ...]
  assert.equal(vazute[1], false, "arhiva veche nu se da drept completa nici inainte de prima bucata"); assert.equal(vazute[3], false);
  // tura urmatoare (forma 2, completa): doar prima pagina
  const r2 = await strangeBoti({ cere, trimite, pauza: async () => {} });
  assert.equal(r2.noi, 0); assert.equal(r2.pagini, 1);
});

await test("colectorul cel putin v101.14 (tura arhivei stie de forma botilor)", () => {
  assert.match(fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8"), /const VERSIUNE_COLECTOR = "v(?:101\.(?:1[4-9]|[2-9]\d|\d{3,})|10[2-9]\.\d+|1[1-9]\d\.\d+)";/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
