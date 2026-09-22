// Proba pentru /api/bot-orders — cititul botilor de grid Pionex.
//
// De ce exista ruta: jurnalul v71 citeste DOAR tranzactii spot. Banii lui Marius
// stau intr-un bot de grid pe COTI.PERP, pe care aplicatia nu-l vedea deloc.
//
// Capcana pe care o pazeste proba cea mai importanta: cand cheia n-are dreptul
// "Bot reading", Pionex raspunde cu HTTP **200** si {"result":false,
// "code":"PERMISSION_DENIED"}. Daca nu ne uitam in corp, ruta ar raporta vesela
// "zero boti" - exact esecul tacut pe care l-am vanat toata ziua.
//
// Rulare: node scripts/bot-orders-v72.mjs
import assert from "node:assert/strict";

const MOD = "../functions/api/bot-orders.js";
const TOKEN = "proba-token-1234567890";
const ENV = { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" };

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  return Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const proaspat = () => `${MOD}?t=${Date.now()}_${Math.random()}`;

// Un bot ca al lui, cu cifrele reale de pe 22.09.
const BOT = {
  base: "COTI.PERP", quote: "USDT", status: "open", strategyId: "2377",
  createTime: 1790086864000,
  buOrderData: {
    status: "running", usdtInvestment: "101.05", marginBalance: "100.3009",
    gridProfit: "1.479976488", totalRealizedProfit: "-0.4288", totalFee: "-0.3203",
    totalFundingFee: "0", totalVolume: "1279.6236",
    placedExchangeOrderCount: 30, exchangeOrderPairedCount: 9,
    leverage: 5, trend: "long", position: "20628",
    positionOpenPrice: "0.0154625442176871", bottom: "0.0153", top: "0.0158",
    estimateLiquidationPriceDown: "0.0124342725143422", estimateLiquidationPriceUp: "0",
    riskStatus: "TRADING", marginStatus: "NORMAL",
    profitStop: "0.03", lossStop: "0.015",
    stopProfitEnabled: false, stopLossEnabled: false,
  },
};

let cereri = [];
function fetchStub(perRuta) {
  cereri = [];
  globalThis.fetch = async (url) => {
    const u = String(url); cereri.push(u);
    const r = perRuta(u);
    return new Response(typeof r.corp === "string" ? r.corp : JSON.stringify(r.corp),
      { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
}
const RASPUNS_BUN = (u) => u.includes("/bot/orders")
  ? { corp: { result: true, data: { results: [BOT], nextPageToken: null } } }
  : { corp: { result: true, data: { tickers: [{ symbol: "COTI_USDT_PERP", close: "0.0155" }] } } };

async function cheama(qs = "", env = ENV, modul = MOD, token = TOKEN) {
  const { onRequestGet } = await import(modul);
  const cap = token ? { authorization: `Bearer ${token}` } : {};
  const res = await onRequestGet({
    request: new Request(`https://exemplu.test/api/bot-orders?${qs}`, { headers: cap }), env });
  let corp = null; try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp };
}

console.log("\nV72 · boti de grid Pionex · proba");

await test("ruta exista si intoarce botii", async () => {
  fetchStub(RASPUNS_BUN);
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200, `asteptam 200, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.ok(Array.isArray(r.corp?.bots), "raspunsul nu poarta `bots`");
  assert.equal(r.corp.bots.length, 1, `asteptam 1 bot, am ${r.corp.bots.length}`);
});

await test("citeste din data.results, nu din data.orders", async () => {
  fetchStub((u) => u.includes("/bot/orders")
    ? { corp: { result: true, data: { orders: [BOT] } } }   // forma GRESITA
    : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.corp.bots.length, 0, "a citit din data.orders, care nu e forma reala a Pionex");
});

await test("PROFITUL RAPORTAT e cel NET, nu cel din grid", async () => {
  fetchStub(RASPUNS_BUN);
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.equal(b.profitNet, -0.4288, `profitNet gresit: ${b.profitNet} (trebuie totalRealizedProfit)`);
  assert.equal(b.gridProfitBrut, 1.479976488, `gridProfitBrut gresit: ${b.gridProfitBrut}`);
  assert.notEqual(b.profitNet, b.gridProfitBrut, "net si brut nu pot fi acelasi camp");
});

await test("cifrele de bani si de risc ajung intregi", async () => {
  fetchStub(RASPUNS_BUN);
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.equal(b.simbol, "COTI.PERP/USDT", `simbol: ${b.simbol}`);
  assert.equal(b.investit, 101.05);
  assert.equal(b.comisioane, -0.3203);
  assert.equal(b.levier, 5);
  assert.equal(b.directie, "long");
  assert.equal(b.gridJos, 0.0153);
  assert.equal(b.gridSus, 0.0158);
  assert.ok(b.pornitLa > 0, "lipseste momentul pornirii");
});

await test("spune CAT MAI E pana la lichidare, in procente", async () => {
  fetchStub(RASPUNS_BUN);
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.equal(b.pretCurent, 0.0155, `pretul curent nu a ajuns: ${b.pretCurent}`);
  assert.ok(Math.abs(b.distantaLichidarePct - 19.78) < 0.1,
    `distanta pana la lichidare gresita: ${b.distantaLichidarePct} (asteptam ~19.78)`);
});

await test("AVERTIZEAZA cand opritoarele sunt setate dar STINSE", async () => {
  fetchStub(RASPUNS_BUN);
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.ok(Array.isArray(b.avertismente), "botul n-are lista de avertismente");
  const a = b.avertismente.join(" | ");
  assert.match(a, /opritor(ul)? pe profit.*stins/i, `nu avertizeaza despre opritorul de profit stins: ${a}`);
  assert.match(a, /opritor(ul)? pe pierdere.*stins/i, `nu avertizeaza despre opritorul de pierdere stins: ${a}`);
  assert.equal(b.opritorProfitActiv, false);
  assert.equal(b.opritorPierdereActiv, false);
});

await test("AVERTIZEAZA cand pretul a iesit din intervalul grid", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u)
    : { corp: { result: true, data: { tickers: [{ symbol: "COTI_USDT_PERP", close: "0.0190" }] } } });
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.match(b.avertismente.join(" | "), /interval|grid/i,
    `pretul 0.0190 e peste 0.0158 si nu avertizeaza: ${b.avertismente.join(" | ")}`);
});

await test("🔑 PERMISSION_DENIED vine cu HTTP 200 si NU are voie sa treaca drept 'zero boti'", async () => {
  fetchStub((u) => u.includes("/bot/orders")
    ? { status: 200, corp: { result: false, code: "PERMISSION_DENIED", message: "have no right" } }
    : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.notEqual(r.status, 200, "a raportat succes desi cheia n-are dreptul - esec tacit");
  assert.match(String(r.corp?.error || ""), /Bot reading|permis|drept/i,
    `mesajul nu spune omului ce sa bifeze: ${JSON.stringify(r.corp)}`);
});

await test("zero boti e zero boti, nu eroare", async () => {
  fetchStub((u) => u.includes("/bot/orders")
    ? { corp: { result: true, data: { results: [] } } } : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200);
  assert.equal(r.corp.bots.length, 0);
});

await test("daca pretul nu se poate lua, botii tot vin - dar se spune", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u) : { status: 503, corp: "gata" });
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200, "a picat toata ruta din cauza pretului");
  assert.equal(r.corp.bots.length, 1, "botii s-au pierdut");
  assert.ok(r.corp.probleme, "nu spune ca pretul lipseste - esec tacit");
});

await test("sumarul aduna corect peste boti", async () => {
  fetchStub((u) => u.includes("/bot/orders")
    ? { corp: { result: true, data: { results: [BOT, BOT] } } } : RASPUNS_BUN(u));
  const s = (await cheama("", ENV, proaspat())).corp.sumar;
  assert.equal(s.numar, 2);
  assert.ok(Math.abs(s.investitTotal - 202.1) < 1e-6, `investit total: ${s.investitTotal}`);
  assert.ok(Math.abs(s.profitNetTotal - -0.8576) < 1e-6, `profit net total: ${s.profitNetTotal}`);
});

await test("ruta cere autentificare", async () => {
  fetchStub(RASPUNS_BUN);
  const r = await cheama("", ENV, proaspat(), null);
  assert.equal(r.status, 401, `fara token asteptam 401, am primit ${r.status}`);
});

await test("fara chei Pionex spune limpede, nu tace", async () => {
  fetchStub(RASPUNS_BUN);
  const r = await cheama("", { APP_API_TOKEN: TOKEN }, proaspat());
  assert.equal(r.status, 503, `asteptam 503, am primit ${r.status}`);
  assert.match(String(r.corp?.error || ""), /PIONEX/i, `mesaj neclar: ${JSON.stringify(r.corp)}`);
});

await test("nicio ruta care SCRIE nu s-a strecurat", async () => {
  // Paza pe REGULA, nu pe forma: cuvantul "create" apare legitim in `createTime`.
  // Ce nu are voie sa existe: metode care schimba ceva si caile de scriere ale
  // API-ului de boti.
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL(MOD, import.meta.url), "utf8"));
  const interzise = [
    [/method\s*:\s*["'](POST|DELETE|PUT|PATCH)["']/i, "o metoda care schimba date"],
    [/futuresGrid\/(create|cancel|pause|resume|reduce|addMargin|adjustParams)/i, "o cale de scriere din API-ul de boti"],
    [/onRequest(Post|Delete|Put|Patch)\b/, "un handler pentru metode care scriu"],
  ];
  for (const [tipar, ce] of interzise) {
    const m = src.match(tipar);
    assert.ok(!m, `bot-orders.js contine ${ce}: "${m && m[0]}" - trebuie sa ramana READ-ONLY`);
  }
  // si, pozitiv: singurul export trebuie sa fie cel de citire
  const exporturi = [...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(exporturi, ["onRequestGet"], `exporturi neasteptate: ${exporturi.join(", ")}`);
});

await test("indemnul de a bifa 'Bot reading' apare DOAR cand lipseste dreptul", async () => {
  const fs = await import("node:fs");
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  // In pagina NU are ce cauta permanent: cine si-a bifat deja dreptul e certat degeaba.
  const panou = html.slice(html.indexOf("botiStare"), html.indexOf("botiRanduri"));
  assert.ok(!/Bot reading/i.test(panou),
    "panoul cere permanent 'Bot reading', chiar si dupa ce dreptul e bifat");
  // Dar la 403 trebuie sa spuna limpede ce sa bifeze.
  fetchStub((u) => u.includes("/bot/orders")
    ? { status: 200, corp: { result: false, code: "PERMISSION_DENIED", message: "have no right" } }
    : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 403);
  assert.match(String(r.corp.error), /Bot reading/,
    `mesajul de la 403 nu mai spune ce sa bifeze: ${r.corp.error}`);
});

await test("fiecare bot poarta si forma bruta de la Pionex", async () => {
  fetchStub(RASPUNS_BUN);
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  // Toate trei campurile, nu doar unul - `brut` redus la {buOrderData,strategyId}
  // tot ar trece o proba care verifica doar astea doua, dar `masoara` ar primi
  // createTime lipsa, varstaBotMin ar iesi 0 si verdictul ar ramane NEDOVEDIT pe veci.
  assert.ok(b.brut && b.brut.buOrderData, "lipseste `brut.buOrderData` - modulul pur n-are din ce masura");
  assert.equal(b.brut.strategyId, "2377", "lipseste sau e gresit `brut.strategyId`");
  assert.equal(b.brut.createTime, 1790086864000, "lipseste sau e gresit `brut.createTime` - varstaBotMin ar iesi mereu 0");
});

console.log(`\nV72_BOT_ORDERS ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
