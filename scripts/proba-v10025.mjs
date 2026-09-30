// Proba v100.25 (30.09, el: „FA IDEILE” - ideea 2 din trei): colectorul pastreaza TOTI botii inchisi.
// Descoperit la masurare: Pionex da istoria pe PAGINI de cate 10 (limit e ignorat; cursor nextPageToken) - 2253 de boti
// inchisi din 12.2025 pana la 30.09.2026, nu „doar ultimii 10” cum scria pagina (v100.23). Arhiva compacta sta in KV-ul
// de acasa; Jurnalul, statistica si Declaratia Unica o citesc; pe pagina publicata (fara KV) raman pe prima pagina, spus pe fata.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();
const { compactBot, uneste, idArhiva, CAMPURI_ARHIVA } = await import("../functions/_shared/boti-arhiva.js");
const { strangeBoti } = await import("./lib/tura-arhiva-boti.mjs");
const { reseteazaRitmPionex } = await import("../functions/_shared/pionex.js");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++; reseteazaRitmPionex();
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.25 · arhiva botilor inchisi (toata istoria Pionex) · proba\n");

// boti INVENTATI, cu forma bruta Pionex (numerele vin ca siruri) + campuri pe care Jurnalul nu le citeste
const T0 = Date.UTC(2026, 8, 1), H = 3600000;
const bot = (i, o = {}) => ({
  strategyId: "s" + i, buOrderId: "b" + i, base: "M" + (i % 4) + ".PERP", quote: "USDT", buOrderType: "futures_grid", status: "canceled",
  createTime: T0 + i * H, closeTime: T0 + i * H + 1800000, closeNote: null, userId: "nu-trebuie-pastrat", keyId: "nici-asta",
  buOrderData: { totalRealizedProfit: String(i % 3 ? 1.5 : -2.25), gridProfit: "0.8", totalFee: "-0.12", totalFundingFee: "-0.01", usdtInvestment: "100", leverage: "5", trend: "long",
    bottom: "1.0", top: "1.2", row: 10, gridType: "geometric", initPrice: "1.1", closedPrice: "1.12", lossStop: "0.95", nickname: "x", riskRate: "0.1", quoteNeed: "3",
    quoteInvestment: "100", extraMargin: "0", profitExited: "0", unlockQuoteAmount: "101.37" },
  ...o,
});

await test("compactBot: doar campurile citite de Jurnal (fara userId/keyId), id-ul botului, fara boti fara ora; Jurnalul da ACELASI rezultat pe compact si pe brut", () => {
  const b = bot(1), c = compactBot(b);
  assert.equal(c.strategyId, "s1"); assert.equal(c.createTime, b.createTime); assert.equal(c.closeTime, b.closeTime); assert.equal(c.buOrderType, "futures_grid");
  assert.equal(c.userId, undefined); assert.equal(c.keyId, undefined); assert.equal(c.buOrderData.nickname, undefined); assert.equal(c.buOrderData.riskRate, undefined);
  assert.deepEqual(Object.keys(c.buOrderData).sort(), CAMPURI_ARHIVA.slice().sort());
  assert.equal(compactBot({ ...b, closeTime: null }), null); assert.equal(compactBot({ ...b, strategyId: "", buOrderId: "" }), null); assert.equal(compactBot(null), null);
  assert.equal(idArhiva({ buOrderId: "b9" }), "b9"); assert.equal(idArhiva({ strategyId: "a<b>c" }), "abc");
  const brut = Array.from({ length: 30 }, (_, i) => bot(i)), f = (l) => JT.din(l).map((t) => [t.id, t.rezultat, t.pozitie, t.greseli.map((g) => g.cod).join()]);
  assert.deepEqual(f(brut.map(compactBot)), f(brut));
  // pe botii reali (2253, 30.09): 7,95 MB brut -> 1,03 MB compact; pe cel inventat (putine campuri in plus) doar mai mic
  assert.ok(JSON.stringify(compactBot(b)).length < JSON.stringify(b).length);
});

await test("uneste: fara dubluri (cel nou castiga), cel mai nou primul, sanitizeaza tot ce intra", () => {
  const u = uneste([bot(1), bot(2)], [bot(2, { buOrderData: { ...bot(2).buOrderData, totalRealizedProfit: "9" } }), bot(3), { gunoi: 1 }]);
  assert.deepEqual(u.map((x) => x.strategyId), ["s3", "s2", "s1"]);
  assert.equal(u[1].buOrderData.totalRealizedProfit, "9");
});

// ---- tura colectorului, cu Pionex si serverul inventate ----
function pionexFals(n) { // n boti, cei mai noi primii, cate 10 pe pagina, cursor = indexul de start
  const toti = Array.from({ length: n }, (_, i) => bot(n - 1 - i)), cereri = [];
  return { toti, cereri, pagina: (tok) => { cereri.push(tok); const s = tok ? Number(tok) : 0, r = toti.slice(s, s + 10); return { bots: r, nextPageToken: s + 10 < n ? String(s + 10) : null }; } };
}
function serverFals(arhiva) {
  const trimise = [];
  let a = arhiva || { boti: [], complet: false, la: null };
  return {
    trimise, get arhiva() { return a; },
    // acelasi contract ca serverul real (v100.26: si „forma” arhivei - una veche nu e completa pana nu e refacuta)
    cere: async (p) => { if (p.startsWith("/api/istoric-bot?action=botiInchisi")) return { boti: a.boti, complet: a.complet, forma: a.forma || 1, la: a.la, n: a.boti.length }; throw new Error("cale neasteptata " + p); },
    trimite: async (p, corp) => { assert.equal(p, "/api/istoric-bot?action=botiInchisi"); trimise.push(corp); const complet = (a.forma === 2 && a.complet) || corp.complet === true; a = { boti: uneste(a.boti, corp.boti), complet, forma: complet ? 2 : a.forma || 1, la: Date.now() }; return { ok: true }; },
  };
}
const cereCu = (px, srv) => async (p) => {
  if (p.startsWith("/api/bot-orders?")) { const u = new URLSearchParams(p.split("?")[1]); assert.equal(u.get("status"), "finished"); assert.equal(u.get("brut"), "1"); return px.pagina(u.get("pageToken")); }
  return srv.cere(p);
};

await test("prima tura: TOATA istoria, pagina cu pagina, trimisa pe bucati; arhiva devine completa abia la ultima bucata", async () => {
  const px = pionexFals(95), srv = serverFals(), pauze = [];
  const r = await strangeBoti({ cere: cereCu(px, srv), trimite: srv.trimite, pauza: async (ms) => { pauze.push(ms); }, bucata: 40, pauzaMs: 7 });
  assert.equal(r.noi, 95); assert.equal(r.pagini, 10); assert.equal(r.complet, true); assert.equal(srv.arhiva.boti.length, 95); assert.equal(srv.arhiva.complet, true);
  assert.ok(srv.trimise.length >= 3 && srv.trimise.every((c) => c.boti.length <= 40));
  assert.deepEqual(srv.trimise.map((c) => c.complet), srv.trimise.map((_, i) => i === srv.trimise.length - 1));
  assert.equal(pauze.length, 9); assert.ok(pauze.every((m) => m === 7), "pauza intre pagini (limita rutei si a Pionex)");
});

await test("turele de dupa: doar botii noi - se opreste la prima pagina care are un bot deja stiut", async () => {
  const px = pionexFals(95), srv = serverFals();
  await strangeBoti({ cere: cereCu(px, srv), trimite: srv.trimite, pauza: async () => {} });
  // se inchid inca 3 boti
  const px2 = pionexFals(98); px2.cereri.length = 0;
  const r = await strangeBoti({ cere: cereCu(px2, srv), trimite: srv.trimite, pauza: async () => {} });
  assert.equal(r.noi, 3); assert.equal(r.pagini, 1); assert.equal(srv.arhiva.boti.length, 98);
  const r2 = await strangeBoti({ cere: cereCu(px2, srv), trimite: srv.trimite, pauza: async () => {} });
  assert.equal(r2.noi, 0); assert.equal(r2.pagini, 1);
});

await test("picata la jumatate (Pionex refuza): ce s-a strans pana atunci se trimite, arhiva ramane incompleta, eroarea urca", async () => {
  const px = pionexFals(95), srv = serverFals();
  let k = 0; const cere = async (p) => { if (p.startsWith("/api/bot-orders?") && ++k === 5) throw Object.assign(new Error("Pionex rate limit"), { status: 429 }); return cereCu(px, srv)(p); };
  await assert.rejects(strangeBoti({ cere, trimite: srv.trimite, pauza: async () => {} }), /rate limit/);
  assert.equal(srv.arhiva.boti.length, 40); assert.equal(srv.arhiva.complet, false);
  // tura urmatoare reia si termina (cei 40 stiuti se sar, nu se opreste la ei cat arhiva e incompleta)
  const r = await strangeBoti({ cere: cereCu(px, srv), trimite: srv.trimite, pauza: async () => {} });
  assert.equal(r.noi, 55); assert.equal(srv.arhiva.boti.length, 95); assert.equal(srv.arhiva.complet, true);
});

// ---- ruta bot-orders: cursorul Pionex ----
const TOKEN = "proba-token-1234567890";
let ip = 0;
function fetchStub(fn) { const cereri = []; globalThis.fetch = async (url) => { cereri.push(String(url)); const r = fn(String(url)); return new Response(JSON.stringify(r), { status: 200, headers: { "content-type": "application/json" } }); }; return cereri; }
async function botOrders(qs) {
  const m = await import(`../functions/api/bot-orders.js?t=${Date.now()}_${Math.random()}`);
  const r = await m.onRequestGet({ request: new Request("https://exemplu.test/api/bot-orders" + qs, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.25.0." + (++ip) } }), env: { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" } });
  return { status: r.status, corp: JSON.parse(await r.text()) };
}
const nativ = globalThis.fetch;
await test("bot-orders: da mai departe pageToken (doar litere si cifre) si intoarce nextPageToken; brut=1 = botii bruti, fara tickere", async () => {
  try {
    const cereri = fetchStub((u) => u.includes("/bot/orders") ? { result: true, data: { results: [bot(1), bot(2)], nextPageToken: "1a0c7a4704b", previousPageToken: null } } : { result: true, data: { tickers: [], symbols: [] } });
    const r = await botOrders("?status=finished&brut=1&pageToken=1a0cea6b10e");
    assert.equal(r.status, 200); assert.equal(r.corp.nextPageToken, "1a0c7a4704b"); assert.equal(r.corp.bots.length, 2);
    assert.equal(r.corp.bots[0].strategyId, "s1"); assert.ok(r.corp.bots[0].buOrderData, "brut = forma Pionex");
    const pc = cereri.filter((u) => u.includes("/bot/orders"));
    assert.equal(pc.length, 1); assert.match(pc[0], /pageToken=1a0cea6b10e/); assert.match(pc[0], /status=finished/);
    assert.equal(cereri.filter((u) => /tickers|symbols/.test(u)).length, 0, "brut=1 nu cere preturi");
    const r2 = await botOrders("?status=finished&pageToken=" + encodeURIComponent("x&status=running"));
    const pc2 = globalThis.__ultimele = cereri.filter((u) => u.includes("/bot/orders")).slice(-1)[0];
    assert.equal(r2.status, 200); assert.doesNotMatch(pc2, /pageToken/); assert.doesNotMatch(pc2, /running/);
    const r3 = await botOrders("?status=finished");
    assert.equal(r3.corp.nextPageToken, "1a0c7a4704b"); assert.ok(r3.corp.bots[0].brut, "forma obisnuita ramane (normalizat + .brut)");
  } finally { globalThis.fetch = nativ; }
});

// ---- ruta istoric-bot?action=botiInchisi ----
async function istoric() {
  const kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = () => ({ authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.26.0." + (++ip) });
  return {
    kv,
    post: async (corp) => { const r = await m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=botiInchisi", { method: "POST", headers: h(), body: typeof corp === "string" ? corp : JSON.stringify(corp) }), env }); return { status: r.status, corp: JSON.parse(await r.text()) }; },
    get: async (q = "") => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=botiInchisi" + q, { headers: h() }), env })).text()),
  };
}
await test("istoric-bot: POST uneste si compacteaza (fara campuri straine), „completa” nu se mai pierde; GET da toata arhiva; cu ?la= neschimbata -> fara lista", async () => {
  const s = await istoric();
  assert.equal((await s.post({ boti: [bot(1), bot(2)], complet: false })).status, 200);
  assert.equal((await s.post({ boti: [bot(2), bot(3)], complet: true })).status, 200);
  const r = await s.post({ boti: [bot(4)] });
  assert.equal(r.corp.n, 4); assert.equal(r.corp.complet, true);
  const g = await s.get();
  assert.equal(g.n, 4); assert.equal(g.complet, true); assert.deepEqual(g.boti.map((x) => x.strategyId), ["s4", "s3", "s2", "s1"]);
  assert.equal(g.boti[0].userId, undefined); assert.ok(g.la > 0);
  const g2 = await s.get("&la=" + g.la); assert.equal(g2.neschimbat, true); assert.equal(g2.boti, undefined);
  assert.equal((await s.post({ boti: "nu e lista" })).status, 400);
  // o bucata de 400 de boti compacti incape (corpul botilor are voie mai mult decat restul actiunilor)
  assert.equal((await s.post({ boti: Array.from({ length: 400 }, (_, i) => compactBot(bot(100 + i))) })).status, 200);
  assert.equal((await s.get()).n, 404);
});

// ---- colectorul ----
await test("colectorul: tura arhivei porneste din bucla, singura (nu se suprapune), o data la 10 minute, cu versiunea noua", () => {
  const c = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.match(c, /import \{ strangeBoti \} from "\.\/lib\/tura-arhiva-boti\.mjs";/);
  assert.match(c, /async function turaArhivaBoti\(\)/); assert.match(c, /arhivaInLucru/); assert.match(c, /ARHIVA_MS = 10 \* 60000/);
  const b = c.slice(c.indexOf("async function bucla()"));
  assert.match(b, /turaArhivaBoti\(\)\.catch/);
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.(1[3-9]|[2-9]\d)";/, "cel putin v101.13");
});

// ---- pagina ----
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8"), t2 = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8");
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); const inceput = src.slice(i - 6, i) === "async " ? i - 6 : i; let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(inceput, j + 1); }

await test("pagina: botii inchisi = prima pagina Pionex (cei mai noi) + arhiva de acasa, fara dubluri; Jurnalul si Cont total le iau de acolo", async () => {
  assert.match(functia(app, "jtPorneste"), /jtAduBoti\(\)/); assert.doesNotMatch(functia(app, "jtPorneste"), /bot-orders\?status=finished&limit=100/);
  assert.match(t2, /jtAduBoti\(\)/);
  const ctx = { jtArhiva: { la: null, boti: null, complet: false, sursa: null }, cereri: [] };
  ctx.getJSON = async (u) => { ctx.cereri.push(u); if (u.startsWith("/api/bot-orders")) return { bots: [{ brut: bot(9) }, { brut: bot(8) }] }; if (u.startsWith("/api/istoric-bot?action=botiInchisi")) return { boti: [compactBot(bot(8)), compactBot(bot(7)), compactBot(bot(1))], la: 123, complet: true, n: 3 }; throw new Error(u); };
  vm.createContext(ctx); vm.runInContext(functia(app, "jtAduBoti") + ";this.jtAduBoti=jtAduBoti;", ctx);
  const l = await ctx.jtAduBoti();
  assert.deepEqual(l.map((x) => x.strategyId), ["s9", "s8", "s7", "s1"]);
  assert.equal(l[1].userId, "nu-trebuie-pastrat", "botul de pe prima pagina (proaspat) castiga fata de cel din arhiva");
  assert.equal(ctx.jtArhiva.sursa, "acasa"); assert.equal(ctx.jtArhiva.complet, true); assert.equal(ctx.jtArhiva.la, 123);
  // a doua oara cere arhiva cu ?la= (daca nu s-a schimbat, nu mai vine lista)
  ctx.getJSON = async (u) => { ctx.cereri.push(u); if (u.startsWith("/api/bot-orders")) return { bots: [{ brut: bot(9) }] }; if (u.includes("&la=123")) return { neschimbat: true, la: 123 }; throw new Error(u); };
  assert.equal((await ctx.jtAduBoti()).length, 4);
  // pe pagina publicata (fara KV): 503 -> doar prima pagina, sursa „pagina”
  ctx.jtArhiva = { la: null, boti: null, complet: false, sursa: null };
  ctx.getJSON = async (u) => { if (u.startsWith("/api/bot-orders")) return { bots: [{ brut: bot(9) }] }; throw Object.assign(new Error("ISTORIC_DOAR_ACASA"), { status: 503 }); };
  assert.equal((await ctx.jtAduBoti()).length, 1); assert.equal(ctx.jtArhiva.sursa, "pagina");
});

await test("nota statisticii spune de unde vin botii: toata istoria / colectorul inca strange / doar prima pagina; si cati spot grid / smart copy raman deoparte", () => {
  const ctx = { jtStat: { toate: { crypto: { tr: new Array(2200) } } }, jtArhiva: { sursa: "acasa", complet: true }, jtStare: { boti: [{ buOrderType: "futures_grid" }, { buOrderType: "spot_grid" }, { buOrderType: "smart_copy" }] } };
  vm.createContext(ctx); vm.runInContext(functia(app, "jtNotaPionex") + functia(app, "jtStatNota") + ";this.n=jtStatNota;", ctx);
  let t = ctx.n("crypto", {}); assert.match(t, /toată istoria Pionex/); assert.match(t, /2 boți spot grid \/ smart copy lăsați deoparte/); assert.doesNotMatch(t, /doar ultimii/);
  ctx.jtArhiva = { sursa: "acasa", complet: false }; t = ctx.n("crypto", {}); assert.match(t, /colectorul încă strânge istoria/);
  ctx.jtArhiva = { sursa: "pagina", complet: false }; t = ctx.n("crypto", {}); assert.match(t, /doar ultimii 2200 boți/); assert.match(t, /de acasă/);
  t = ctx.n("tot", { lpu: 4.65 }); assert.match(t, /4,65 lei/); assert.match(t, /doar ultimii 2200 boți/);
});

await test("lista de boti din Jurnal: pe bucati (cate 30, „Arată încă”), nu 2200 de carduri odata", () => {
  const r = functia(app, "jtRender");
  assert.match(r, /jtStare\.arata/); assert.match(r, /Arată încă/); assert.match(app, /function jtArataMai\(/);
});

await test("Declaratia Unica spune cand Pionex nu e anul intreg (fara arhiva completa)", () => {
  assert.match(functia(t2, "t212DeclaratieBloc"), /t212PionexIncomplet\(\)/); assert.match(functia(t2, "t212CopiazaDeclaratia"), /t212PionexIncomplet\(\)/);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(functia(t2, "t212PionexIncomplet") + ";this.f=t212PionexIncomplet;", ctx);
  assert.match(ctx.f(), /nu e anul întreg/, "fara Jurnal incarcat = necunoscut = se spune");
  ctx.jtArhiva = { sursa: "pagina" }; assert.match(ctx.f(), /doar ultimii boți/);
  ctx.jtArhiva = { sursa: "acasa", complet: false }; assert.match(ctx.f(), /încă strânge/);
  ctx.jtArhiva = { sursa: "acasa", complet: true }; assert.equal(ctx.f(), "");
});

await test("curba banilor pe 2200 de trade-uri: linia intreaga, dar cel mult ~300 de puncte de atins; repede", () => {
  const curba = Array.from({ length: 2200 }, (_, i) => ({ t: T0 + i * H, cumul: Math.sin(i / 50) * 100, rezultat: 1, eticheta: "A" }));
  const t = performance.now(), svg = ST.svgCurba(curba, { moneda: "USDT" }), ms = performance.now() - t;
  const cercuri = (svg.match(/<circle/g) || []).length, puncte = (svg.match(/[ML]\d/g) || []).length;
  assert.equal(puncte, 2200, "linia are toate punctele"); assert.ok(cercuri <= 301 && cercuri >= 200, "cercuri " + cercuri); assert.ok(ms < 150, ms.toFixed(0) + " ms");
  assert.ok(svg.includes(`cx="${(0).toFixed(1)}`) || /<circle[^>]*>/.test(svg));
  const mic = ST.svgCurba(curba.slice(0, 40), { moneda: "USDT" }); assert.equal((mic.match(/<circle/g) || []).length, 40, "sub 300: fiecare trade are punctul lui");
  assert.ok(svg.lastIndexOf("<circle") > svg.lastIndexOf("cumulat") - 400, "ultimul trade are punct");
});

await test("levierul pe toata istoria (29 de valori, 1×…100×) se strange pe trepte; cu putine valori ramane pe fiecare", () => {
  const lev = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 19, 20, 21, 24, 25, 30, 31, 50, 75, 100];
  const l = lev.map((v, i) => ({ id: "l" + i, eticheta: "A", pornit: T0 + i * H, inchis: T0 + i * H + H, rezultat: i % 2 ? 2 : -1, baza: 100, durataOre: 1, dir: "long", levier: v }));
  const s = ST.calc(l, { moneda: "USDT" });
  assert.deepEqual(s.perLevier.map((g) => g.levier), ["1×", "2×", "3×", "4–5×", "6–10×", "11–20×", "21–50×", "peste 50×"]);
  assert.equal(s.perLevier.reduce((a, g) => a + g.n, 0), lev.length, "niciun trade pierdut pe drum");
  assert.equal(s.perLevier.find((g) => g.levier === "6–10×").n, 5);
  const p = ST.calc(l.slice(0, 5), { moneda: "USDT" });
  assert.deepEqual(p.perLevier.map((g) => g.levier), ["1×", "2×", "3×", "4×", "5×"]);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
