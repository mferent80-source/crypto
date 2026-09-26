// Proba pentru /api/bot-orders — cititul botilor de grid Pionex.
//
// De ce exista ruta: jurnalul v71 citeste DOAR tranzactii spot. Banii pot sta
// intr-un bot de grid pe perpetue, pe care aplicatia nu-l vedea deloc.
//
// Capcana pe care o pazeste proba cea mai importanta: cand cheia n-are dreptul
// "Bot reading", Pionex raspunde cu HTTP **200** si {"result":false,
// "code":"PERMISSION_DENIED"}. Daca nu ne uitam in corp, ruta ar raporta vesela
// "zero boti" - exact esecul tacut pe care l-am vanat toata ziua.
//
// v74.6: contractul rutei (vezi planul reparatiilor 24.09). Orice cifra de bani
// LIPSA iese `null`, niciodata 0. Fixtura are cifre INVENTATE (repo public),
// dar aceeasi forma ca raspunsul real Pionex, si respecta identitatea dovedita:
//   usdtInvestment + totalRealizedProfit + totalFee + totalFundingFee = marginBalance
//
// Rulare: node scripts/bot-orders-v72.mjs
import assert from "node:assert/strict";

const MOD = "../functions/api/bot-orders.js";
const MOD_CONT = "../functions/api/pionex-account.js";
const TOKEN = "proba-token-1234567890";
const ENV = { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" };
const { reseteazaRitmPionex } = await import("../functions/_shared/pionex.js").catch(() => ({ reseteazaRitmPionex: () => {} }));

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  reseteazaRitmPionex();
  return Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const proaspat = () => `${MOD}?t=${Date.now()}_${Math.random()}`;
const aprox = (a, b, eps = 1e-9) => typeof a === "number" && Math.abs(a - b) < eps;

// Un bot INVENTAT, cu forma raspunsului Pionex (numerele vin ca siruri).
// 200 + (-1.25) + (-0.64) + (-0.06) = 198.05
const BOT = {
  base: "XYZ.PERP", quote: "USDT", status: "open", strategyId: "9001",
  createTime: 1780000000000,
  buOrderData: {
    status: "running", usdtInvestment: "200.00", initUsdtInvestment: "200.00", marginBalance: "198.0500",
    gridProfit: "2.8000", totalRealizedProfit: "-1.2500", totalFee: "-0.6400",
    totalFundingFee: "-0.0600", totalVolume: "5400.00",
    placedExchangeOrderCount: 40, exchangeOrderPairedCount: 12,
    leverage: 5, trend: "long", position: "10000",
    positionOpenPrice: "0.0310", bottom: "0.0280", top: "0.0330",
    estimateLiquidationPriceDown: "0.0240", estimateLiquidationPriceUp: "0",
    riskStatus: "TRADING", marginStatus: "NORMAL",
    profitStop: "0.05", lossStop: "0.02",
    stopProfitEnabled: false, stopLossEnabled: false,
  },
};
const cuDate = (modif, baza = BOT) => ({ ...baza, buOrderData: { ...baza.buOrderData, ...modif } });
const TICKER = (close) => ({ corp: { result: true, data: { tickers: [{ symbol: "XYZ_USDT_PERP", close }] } } });

let cereri = [];
function fetchStub(perRuta) {
  cereri = [];
  globalThis.fetch = async (url) => {
    const u = String(url); cereri.push(u);
    const r = perRuta(u);
    return new Response(typeof r.corp === "string" ? r.corp : JSON.stringify(r.corp),
      { status: r.status ?? 200, headers: { "content-type": "application/json", ...(r.headers || {}) } });
  };
}
const RASPUNS_BUN = (u) => u.includes("/bot/orders")
  ? { corp: { result: true, data: { results: [BOT], nextPageToken: null } } }
  : TICKER("0.0300");
const cuBoti = (boti, pret = "0.0300") => (u) => u.includes("/bot/orders")
  ? { corp: { result: true, data: { results: boti } } } : TICKER(pret);

// Fiecare cerere vine de pe alt IP: altfel limita de 30/min a rutei ar opri proba.
let ip = 0;
async function cheama(qs = "", env = ENV, modul = MOD, token = TOKEN) {
  const { onRequestGet } = await import(modul);
  const cap = { "cf-connecting-ip": `10.72.0.${++ip}` };
  if (token) cap.authorization = `Bearer ${token}`;
  const res = await onRequestGet({
    request: new Request(`https://exemplu.test/api/bot-orders?${qs}`, { headers: cap }), env });
  let corp = null; try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp, headers: res.headers };
}
const unBot = async (boti, pret) => { fetchStub(cuBoti(boti, pret)); return (await cheama("", ENV, proaspat())).corp.bots[0]; };

console.log("\nV72 · boti de grid Pionex · proba");

await test("ruta exista si intoarce botii", async () => {
  fetchStub(RASPUNS_BUN);
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200, `asteptam 200, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.ok(Array.isArray(r.corp?.bots), "raspunsul nu poarta `bots`");
  assert.equal(r.corp.bots.length, 1, `asteptam 1 bot, am ${r.corp.bots.length}`);
});

// ---- (1) forma raspunsului: ce nu e forma reala e EROARE, nu "zero boti" ----
await test("forma gresita (data.orders) e 502 cu motiv, NU '0 boti'", async () => {
  fetchStub((u) => u.includes("/bot/orders")
    ? { corp: { result: true, data: { orders: [BOT] } } }   // forma GRESITA
    : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 502, `asteptam 502, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.ok(r.corp?.error && r.corp?.motiv, `502 fara {error, motiv}: ${JSON.stringify(r.corp)}`);
});

await test("raspuns fara result:true (dar cu results) e 502", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? { corp: { data: { results: [BOT] } } } : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 502, `asteptam 502, am primit ${r.status}`);
});

await test("corp care nu e JSON, cu HTTP 200, e 502", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? { corp: "<html>mentenanta</html>" } : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 502, `asteptam 502, am primit ${r.status}`);
  assert.ok(r.corp?.motiv, "lipseste motivul");
});

await test("data.results care nu e lista (obiect / text) e 502", async () => {
  for (const results of [{}, "x"]) {
    fetchStub((u) => u.includes("/bot/orders") ? { corp: { result: true, data: { results } } } : RASPUNS_BUN(u));
    const r = await cheama("", ENV, proaspat());
    assert.equal(r.status, 502, `results=${JSON.stringify(results)}: asteptam 502, am primit ${r.status}`);
  }
});

await test("v90: result:true + results:null = zero boti pornit (asa raspunde Pionex cand n-ai niciun bot activ - vazut 25.09, dupa inchiderea lui MET)", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? { corp: { result: true, data: { results: null, nextPageToken: null } } } : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200, "am primit " + r.status); assert.deepEqual(r.corp.bots, []);
});

await test("zero boti e zero boti, nu eroare (result:true + results:[])", async () => {
  fetchStub((u) => u.includes("/bot/orders")
    ? { corp: { result: true, data: { results: [] } } } : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200);
  assert.equal(r.corp.bots.length, 0);
});

// ---- (2) nr(): lipsa e null, "0" e 0 ----
await test("campurile null / \"\" / lipsa / spatii ies null, nu 0", async () => {
  const b = await unBot([cuDate({ marginBalance: null, totalFee: "", totalVolume: "   ", leverage: undefined, gridProfit: "abc" })]);
  assert.equal(b.margine, null, `margine: ${b.margine}`);
  assert.equal(b.comisioane, null, `comisioane: ${b.comisioane}`);
  assert.equal(b.volum, null, `volum din "   ": ${b.volum}`);
  assert.equal(b.levier, null, `levier lipsa: ${b.levier}`);
  assert.equal(b.gridProfitBrut, null, `gridProfit nenumeric: ${b.gridProfitBrut}`);
});

await test("\"0\" trimis de Pionex ramane 0", async () => {
  const b = await unBot([cuDate({ totalFundingFee: "0" })]);
  assert.equal(b.finantare, 0, `finantare "0": ${b.finantare}`);
});

await test("rezerva initUsdtInvestment chiar lucreaza cand usdtInvestment e \"\"", async () => {
  const b = await unBot([cuDate({ usdtInvestment: "", initUsdtInvestment: "150" })]);
  assert.equal(b.investit, 150, `investit: ${b.investit} (rezerva moarta: nr("") dadea 0, nu null)`);
});

await test("sumarul cu un termen null devine null si spune ce lipseste", async () => {
  fetchStub(cuBoti([BOT, cuDate({ totalFee: null, marginBalance: "" , totalRealizedProfit: null })]));
  const r = await cheama("", ENV, proaspat());
  const s = r.corp.sumar;
  assert.equal(s.comisioaneTotal, null, `comisioaneTotal: ${s.comisioaneTotal} (un bot n-are comisioane)`);
  assert.equal(s.profitNetTotal, null, `profitNetTotal: ${s.profitNetTotal}`);
  assert.ok(aprox(s.investitTotal, 400), `investitTotal ramane cifra: ${s.investitTotal}`);
  const lipsa = r.corp.probleme?.sumarIncomplet || [];
  assert.ok(lipsa.includes("comisioaneTotal") && lipsa.includes("profitNetTotal"),
    `probleme.sumarIncomplet nu spune ce lipseste: ${JSON.stringify(r.corp.probleme)}`);
  assert.ok(!lipsa.includes("investitTotal"), "investitTotal nu lipseste");
});

await test("sumarul aduna corect peste boti", async () => {
  fetchStub(cuBoti([BOT, BOT]));
  const r = await cheama("", ENV, proaspat());
  const s = r.corp.sumar;
  assert.equal(s.numar, 2);
  assert.ok(aprox(s.investitTotal, 400), `investit total: ${s.investitTotal}`);
  assert.ok(aprox(s.profitNetTotal, -3.9), `profit net total: ${s.profitNetTotal}`);
  assert.ok(!r.corp.probleme?.sumarIncomplet, "sumar complet raportat ca incomplet");
});

// ---- (3) banii din contract ----
await test("profitNet = marginBalance − investit; profitRealizatBrut = totalRealizedProfit", async () => {
  const b = await unBot([BOT]);
  assert.ok(aprox(b.profitNet, -1.95), `profitNet: ${b.profitNet} (asteptam 198.05 − 200 = −1.95)`);
  assert.ok(aprox(b.profitRealizatBrut, -1.25), `profitRealizatBrut: ${b.profitRealizatBrut}`);
  assert.ok(aprox(b.gridProfitBrut, 2.8), `gridProfitBrut: ${b.gridProfitBrut}`);
  // identitatea: net = brut realizat + comisioane + finantare
  assert.ok(aprox(b.profitNet, b.profitRealizatBrut + b.comisioane + b.finantare),
    `identitatea nu tine: ${b.profitNet} ≠ ${b.profitRealizatBrut}+${b.comisioane}+${b.finantare}`);
});

await test("fara marginBalance, profitNet vine din suma celor trei", async () => {
  const b = await unBot([cuDate({ marginBalance: null })]);
  assert.ok(aprox(b.profitNet, -1.95), `profitNet din suma: ${b.profitNet}`);
});

await test("fara marginBalance si fara un termen al sumei, profitNet e null", async () => {
  const b = await unBot([cuDate({ marginBalance: null, totalFundingFee: "" })]);
  assert.equal(b.profitNet, null, `profitNet: ${b.profitNet}`);
});

await test("pnlNerealizat, echitate, profitTotal pe un LONG", async () => {
  const b = await unBot([BOT]);
  // 10000 × (0.0300 − 0.0310) = −10
  assert.ok(aprox(b.pnlNerealizat, -10, 1e-6), `pnlNerealizat: ${b.pnlNerealizat}`);
  assert.equal(b.pnlNerealizatSigur, true);
  assert.ok(aprox(b.echitate, 188.05, 1e-6), `echitate: ${b.echitate}`);
  assert.ok(aprox(b.profitTotal, -11.95, 1e-6), `profitTotal: ${b.profitTotal}`);
});

await test("pnlNerealizat pe un SHORT (pozitie negativa, pretul a scazut = castig)", async () => {
  const b = await unBot([cuDate({ trend: "short", position: "-10000", estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "0.0400" })], "0.0290");
  // |−10000| × (0.0290 − 0.0310) × (−1) = +20
  assert.ok(aprox(b.pnlNerealizat, 20, 1e-6), `pnlNerealizat short: ${b.pnlNerealizat}`);
  assert.equal(b.pnlNerealizatSigur, true);
});

await test("la neutru: semnul pozitiei asa cum vine + pnlNerealizatSigur:false", async () => {
  const b = await unBot([cuDate({ trend: "no_trend", position: "-5000" })], "0.0300");
  // −5000 × (0.0300 − 0.0310) = +5
  assert.ok(aprox(b.pnlNerealizat, 5, 1e-6), `pnlNerealizat neutru: ${b.pnlNerealizat}`);
  assert.equal(b.pnlNerealizatSigur, false);
});

await test("fara pret: pnlNerealizat, echitate, profitTotal sunt null (nu 0)", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u) : { status: 503, corp: "gata" });
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.equal(b.pnlNerealizat, null); assert.equal(b.echitate, null); assert.equal(b.profitTotal, null);
});

// ---- runda 1 ----
await test("pretul \"0\" de la ticker e LIPSA peste tot (nu pierdere inventata)", async () => {
  const b = await unBot([BOT], "0");
  assert.equal(b.pretCurent, null, `pretCurent: ${b.pretCurent}`);
  assert.equal(b.pnlNerealizat, null, `pnlNerealizat din pret 0: ${b.pnlNerealizat}`);
  assert.equal(b.echitate, null); assert.equal(b.profitTotal, null);
  assert.equal(b.motivFaraDistanta, "fara-pret");
});

await test("tickere PERP cu forma gresita: motivul ajunge in probleme.preturi", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u) : { corp: { result: true, data: {} } });
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200);
  // Mesajul EXACT: fara garda, for...of pe {} arunca singur un text cu "tickers" si ar pacali o potrivire larga.
  assert.match(String(r.corp.probleme?.preturi || ""), /tickere PERP: forma necunoscuta/, `probleme: ${JSON.stringify(r.corp.probleme)}`);
});

await test("pnlNerealizatSigur: la long fara pret e null, nu false (false = doar neutru)", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u) : { status: 503, corp: "gata" });
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.equal(b.pnlNerealizatSigur, null, `pnlNerealizatSigur: ${b.pnlNerealizatSigur}`);
});

await test("fara positionOpenPrice: pnlNerealizat null", async () => {
  const b = await unBot([cuDate({ positionOpenPrice: "" })]);
  assert.equal(b.pnlNerealizat, null, `pnlNerealizat: ${b.pnlNerealizat}`);
  assert.equal(b.echitate, null);
});

await test("cifrele de bani si de risc ajung intregi", async () => {
  const b = await unBot([BOT]);
  assert.equal(b.simbol, "XYZ.PERP/USDT", `simbol: ${b.simbol}`);
  assert.equal(b.investit, 200);
  assert.equal(b.comisioane, -0.64);
  assert.equal(b.levier, 5);
  assert.equal(b.directie, "long");
  assert.equal(b.gridJos, 0.028);
  assert.equal(b.gridSus, 0.033);
  assert.ok(b.pornitLa > 0, "lipseste momentul pornirii");
});

// ---- (4) lichidarea ----
await test("spune CAT MAI E pana la lichidare, in procente (jos)", async () => {
  const b = await unBot([BOT]);
  assert.equal(b.pretCurent, 0.03, `pretul curent nu a ajuns: ${b.pretCurent}`);
  assert.ok(aprox(b.distantaLichidarePct, 20, 0.01), `distanta: ${b.distantaLichidarePct} (asteptam 20)`);
  assert.equal(b.lichidarePartea, "jos"); assert.equal(b.pretLichidare, 0.024);
  assert.equal(b.lichidareDepasita, false);
});

await test("ambele parti: se ia cea mai APROPIATA", async () => {
  const b = await unBot([cuDate({ estimateLiquidationPriceDown: "0.0200", estimateLiquidationPriceUp: "0.0330" })]);
  // jos: (0.03−0.02)/0.03 = 33.3% · sus: (0.033−0.03)/0.03 = 10%
  assert.equal(b.lichidarePartea, "sus", `partea: ${b.lichidarePartea}`);
  assert.ok(aprox(b.distantaLichidarePct, 10, 0.01), `distanta: ${b.distantaLichidarePct}`);
  assert.equal(b.pretLichidare, 0.033);
});

await test("lichidarea DEPASITA: distanta negativa + avertisment", async () => {
  const b = await unBot([BOT], "0.0230");
  // (0.023 − 0.024)/0.023 = −4.35%
  assert.ok(b.distantaLichidarePct < 0, `distanta trebuie negativa: ${b.distantaLichidarePct}`);
  assert.equal(b.lichidareDepasita, true);
  assert.match(b.avertismente.join(" | "), /lichidarea DEPĂȘITĂ/i, `lipseste avertismentul: ${b.avertismente.join(" | ")}`);
});

await test("sub 15% pe partea corecta: avertisment", async () => {
  const b = await unBot([BOT], "0.0265");
  // (0.0265−0.024)/0.0265 = 9.43%
  assert.ok(aprox(b.distantaLichidarePct, 9.43, 0.01), `distanta: ${b.distantaLichidarePct}`);
  assert.match(b.avertismente.join(" | "), /lichidare.*9\.4/i, `lipseste avertismentul <15%: ${b.avertismente.join(" | ")}`);
});

await test("fara pret: distanta null + motivFaraDistanta 'fara-pret'", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u) : { status: 503, corp: "gata" });
  const b = (await cheama("", ENV, proaspat())).corp.bots[0];
  assert.equal(b.distantaLichidarePct, null);
  assert.equal(b.motivFaraDistanta, "fara-pret");
  assert.equal(b.lichidareDepasita, false);
});

await test("lichidarea \"0\" pe ambele parti inseamna 'nu exista'", async () => {
  const b = await unBot([cuDate({ estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "0" })]);
  assert.equal(b.pretLichidare, null); assert.equal(b.distantaLichidarePct, null); assert.equal(b.lichidarePartea, null);
});

// ---- (5) avertismentul despre comisioane spune ADEVARUL ----
await test("comisioane mici + net negativ: NU da vina pe comisioane, spune cauza", async () => {
  const b = await unBot([BOT]);
  const a = b.avertismente.join(" | ");
  assert.ok(!/comisioanele mănâncă mai mult/.test(a), `acuza comisioanele (0.64 < grid 2.80): ${a}`);
  assert.match(a, /grid \+2\.80.*comisioane −0\.64.*restul −4\.11 din poziție\/finanțare/, `mesajul nou lipseste: ${a}`);
});

await test("comisioane mai mari decat gridul: avertismentul vechi se aprinde", async () => {
  const b = await unBot([cuDate({ gridProfit: "0.5000" })]);
  assert.match(b.avertismente.join(" | "), /comisioanele mănâncă mai mult decât câștigă botul/);
});

// v91.1: Pionex trimite stopLossEnabled=false si cand SL/TP SUNT puse si active (dovada: botul VVV, 25.09 -
// aplicatia arata "Luare profit/Limitare pierderi 35,491 / 26,633", API-ul da enabled=false). Pretul pus = opritor pus.
await test("pretul de SL/TP pus = opritor ACTIV, chiar daca Pionex trimite stopLossEnabled=false (nu mai scrie STINS)", async () => {
  const b = await unBot([BOT]);
  assert.ok(Array.isArray(b.avertismente), "botul n-are lista de avertismente");
  const a = b.avertismente.join(" | ");
  assert.doesNotMatch(a, /stins/i, `avertisment fals de opritor STINS: ${a}`);
  assert.equal(b.opritorProfitActiv, true);
  assert.equal(b.opritorPierdereActiv, true);
});
await test("fara pret de SL si TP -> 'niciun opritor' si inactiv", async () => {
  const b = await unBot([cuDate({ lossStop: "", profitStop: "" })]);
  assert.match(b.avertismente.join(" | "), /niciun opritor/i);
  assert.equal(b.opritorPierdereActiv, false);
});

await test("AVERTIZEAZA cand pretul a iesit din intervalul grid", async () => {
  const b = await unBot([BOT], "0.0400");
  assert.match(b.avertismente.join(" | "), /interval|grid/i,
    `pretul 0.0400 e peste 0.0330 si nu avertizeaza: ${b.avertismente.join(" | ")}`);
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

await test("daca pretul nu se poate lua, botii tot vin - dar se spune", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? RASPUNS_BUN(u) : { status: 503, corp: "gata" });
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 200, "a picat toata ruta din cauza pretului");
  assert.equal(r.corp.bots.length, 1, "botii s-au pierdut");
  assert.ok(r.corp.probleme, "nu spune ca pretul lipseste - esec tacit");
});

// ---- (7) aceeasi poarta de ritm ca pionex-account ----
await test("429 de la Pionex: ruta intoarce 429 cu retryAfter (corp + antet)", async () => {
  fetchStub((u) => u.includes("/bot/orders") ? { status: 429, corp: "Too Many Requests", headers: { "retry-after": "9" } } : RASPUNS_BUN(u));
  const r = await cheama("", ENV, proaspat());
  assert.equal(r.status, 429, `asteptam 429, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.equal(r.corp?.retryAfter, 9, `retryAfter: ${JSON.stringify(r.corp)}`);
  assert.equal(r.headers.get("retry-after"), "9", "lipseste antetul retry-after");
});

// v91.5: 26.09 06:49 - o cerere abandonata (telefonul a pierdut legatura) a lasat poarta comuna agatata:
// Cloudflare anuleaza timerele cererii moarte, promisiunea ei nu se mai termina, iar TOATE cererile de dupa
// asteptau la nesfarsit ("Worker's code had hung"). Pagina botului ramanea cu "—" peste tot.
await test("o cerere AGATATA in poarta Pionex nu le blocheaza pe cele de dupa (asteapta cel mult ~10 s)", async () => {
  const { pionexPrivatGet } = await import("../functions/_shared/pionex.js");
  const nativ = globalThis.fetch; let n = 0;
  globalThis.fetch = () => (++n === 1 ? new Promise(() => {}) : Promise.resolve(new Response(JSON.stringify({ result: true, data: {} }), { status: 200 })));
  try {
    pionexPrivatGet(ENV, "/api/v1/bot/orders", {}).catch(() => {});   // cererea care moare si nu se mai termina
    const t0 = Date.now();
    const r = await Promise.race([pionexPrivatGet(ENV, "/api/v1/bot/orders", {}), new Promise((_, nu) => setTimeout(() => nu(Error("a doua cerere a asteptat peste 15 s - poarta e agatata")), 15000))]);
    assert.equal(r.r.status, 200);
    assert.ok(Date.now() - t0 < 15000);
  } finally { globalThis.fetch = nativ; }
});

await test("racirea dupa 429 pe bot-orders opreste si pionex-account (aceeasi cheie)", async () => {
  fetchStub(() => ({ status: 429, corp: "Too Many Requests", headers: { "retry-after": "30" } }));
  await cheama("", ENV, proaspat());
  const dupa = cereri.length;
  const { onRequestGet } = await import(`${MOD_CONT}?t=${Math.random()}`);
  const res = await onRequestGet({ request: new Request("https://exemplu.test/api/pionex-account?action=balances",
    { headers: { authorization: `Bearer ${TOKEN}`, "cf-connecting-ip": "10.72.1.1" } }), env: ENV });
  assert.equal(res.status, 429, `pionex-account n-a vazut racirea: ${res.status}`);
  assert.equal(cereri.length, dupa, "pionex-account a mai sunat Pionex desi cheia era in racire");
});

await test("bot-orders si pionex-account sunt distantate prin ACEEASI poarta", async () => {
  const momente = [];
  globalThis.fetch = async (url) => {
    const u = String(url); if (/bot\/orders|balances/.test(u)) momente.push(Date.now());
    return new Response(JSON.stringify(u.includes("/bot/orders") ? { result: true, data: { results: [] } }
      : u.includes("balances") ? { result: true, data: { balances: [] } } : { result: true, data: { tickers: [] } }), { status: 200 });
  };
  const { onRequestGet: cont } = await import(`${MOD_CONT}?t=${Math.random()}`);
  await Promise.all([
    cheama("", ENV, proaspat()),
    cont({ request: new Request("https://exemplu.test/api/pionex-account?action=balances",
      { headers: { authorization: `Bearer ${TOKEN}`, "cf-connecting-ip": "10.72.1.2" } }), env: ENV }),
  ]);
  assert.equal(momente.length, 2, `asteptam 2 cereri private, am ${momente.length}`);
  const pauza = Math.abs(momente[1] - momente[0]);
  assert.ok(pauza >= 200, `cererile private au plecat in rafala: ${pauza} ms intre ele`);
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
  // API-ului de boti. Se uita si in modulul comun Pionex, pe unde pleaca cererea.
  const fs = await import("node:fs");
  for (const f of [MOD, "../functions/_shared/pionex.js"]) {
    const src = fs.readFileSync(new URL(f, import.meta.url), "utf8");
    const interzise = [
      [/method\s*:\s*["'](POST|DELETE|PUT|PATCH)["']/i, "o metoda care schimba date"],
      [/futuresGrid\/(create|cancel|pause|resume|reduce|addMargin|adjustParams)/i, "o cale de scriere din API-ul de boti"],
      [/onRequest(Post|Delete|Put|Patch)\b/, "un handler pentru metode care scriu"],
      [/\/trade\/order|\/trade\/massOrder/, "o cale de tranzactionare"],
    ];
    for (const [tipar, ce] of interzise) {
      const m = src.match(tipar);
      assert.ok(!m, `${f} contine ${ce}: "${m && m[0]}" - trebuie sa ramana READ-ONLY`);
    }
  }
  const src = fs.readFileSync(new URL(MOD, import.meta.url), "utf8");
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
  const b = await unBot([BOT]);
  // Toate trei campurile, nu doar unul - `brut` redus la {buOrderData,strategyId}
  // tot ar trece o proba care verifica doar astea doua, dar `masoara` ar primi
  // createTime lipsa, varstaBotMin ar iesi 0 si verdictul ar ramane NEDOVEDIT pe veci.
  assert.ok(b.brut && b.brut.buOrderData, "lipseste `brut.buOrderData` - modulul pur n-are din ce masura");
  assert.equal(b.brut.strategyId, "9001", "lipseste sau e gresit `brut.strategyId`");
  assert.equal(b.brut.createTime, 1780000000000, "lipseste sau e gresit `brut.createTime` - varstaBotMin ar iesi mereu 0");
});

console.log(`\nV72_BOT_ORDERS ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
