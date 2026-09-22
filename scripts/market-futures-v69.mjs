// Proba pentru /api/market?type=futures.
// Cele cinci apeluri catre Binance stateau fiecare intr-un try{...}catch{} cu
// catch GOL. Binance refuza cererile venite de pe Cloudflare (403), valorile se
// intorceau `null`, iar pe ecran apareau casute goale - fara nicio eroare
// nicaieri. Un tablou care tace cand nu stie e mai rau decat unul care spune
// "n-am date".
//
// Rulare: node scripts/market-futures-v69.mjs
import assert from "node:assert/strict";

const MOD = "../functions/api/market.js";
const TOKEN = "proba-token-1234567890";
const ENV = { APP_API_TOKEN: TOKEN };

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

const proaspat = () => `${MOD}?t=${Date.now()}_${Math.random()}`;

async function futures(raspuns, modul) {
  globalThis.fetch = async (url) => {
    const r = typeof raspuns === "function" ? raspuns(String(url)) : raspuns;
    return new Response(r.corp ?? "{}", { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
  const { onRequestGet } = await import(modul || proaspat());
  const request = new Request("https://exemplu.test/api/market?type=futures&symbol=BTCUSDT", {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  const res = await onRequestGet({ request, env: ENV });
  let corp = null;
  try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp };
}

console.log("\nV69 · futures Binance · proba esecului tacut");

await test("cand Binance refuza, raspunsul SPUNE ca a refuzat", async () => {
  const r = await futures({ status: 403, corp: "<html>forbidden</html>" });
  assert.equal(r.status, 200, `asteptam 200 cu date partiale, am primit ${r.status}`);
  assert.ok(r.corp?.probleme, "raspunsul nu poarta `probleme` - esecul e tot tacut");
  const chei = Object.keys(r.corp.probleme);
  assert.ok(chei.length >= 5, `asteptam toate cele 5 apeluri raportate, am ${chei.length}: ${chei.join(",")}`);
  assert.match(String(r.corp.probleme.funding), /403/, `motivul nu spune 403: ${r.corp.probleme.funding}`);
});

await test("valorile raman null, ca sa nu inventeze cifre", async () => {
  const r = await futures({ status: 403, corp: "nope" });
  assert.equal(r.corp.funding, null, "a inventat o valoare pentru funding");
  assert.equal(r.corp.openInterest, null, "a inventat o valoare pentru openInterest");
});

await test("cand Binance raspunde, NU apare nicio problema", async () => {
  const r = await futures((url) => {
    if (/premiumIndex/.test(url)) return { corp: '{"lastFundingRate":"0.0001"}' };
    if (/openInterest\?/.test(url)) return { corp: '{"openInterest":"1234"}' };
    if (/globalLongShortAccountRatio/.test(url)) return { corp: '[{"longShortRatio":"1.5"}]' };
    return { corp: "[]" };
  });
  assert.equal(r.corp.funding, 0.0001, `funding gresit: ${r.corp.funding}`);
  assert.equal(r.corp.openInterest, 1234, `openInterest gresit: ${r.corp.openInterest}`);
  assert.ok(!r.corp.probleme, `a raportat probleme desi totul a mers: ${JSON.stringify(r.corp.probleme)}`);
});

await test("un refuz partial se vede, restul datelor trec mai departe", async () => {
  const r = await futures((url) =>
    /openInterest\?/.test(url) ? { status: 403, corp: "nope" } : { corp: '{"lastFundingRate":"0.0002"}' });
  assert.equal(r.corp.funding, 0.0002, "datele bune s-au pierdut");
  assert.ok(r.corp.probleme?.openInterest, "apelul picat nu apare in probleme");
  assert.ok(!r.corp.probleme?.funding, "apelul reusit apare gresit ca problema");
});

console.log(`\nV69_MARKET_FUTURES ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
