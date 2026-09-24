// Proba pentru /api/provider-health.
// Ruta asta lipsea cu totul: Cloudflare Pages intorcea index.html cu HTTP 200,
// JSON.parse crapa in frontend, iar scorul ramanea fixat la jumatate cu
// "Live Readiness" zidita, fara nicio eroare vizibila.
//
// Rulare: node scripts/provider-health-v69.mjs
import assert from "node:assert/strict";

const MOD = "../functions/api/provider-health.js";
const TOKEN = "proba-token-1234567890";

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

let cereri = [];
function fetchStub(raspuns) {
  cereri = [];
  globalThis.fetch = async (url) => {
    cereri.push(String(url));
    const r = typeof raspuns === "function" ? raspuns(String(url)) : raspuns;
    return new Response(r.corp ?? "{}", { status: r.status ?? 200 });
  };
}

const proaspat = () => `${MOD}?t=${Date.now()}_${Math.random()}`;

async function cheama(qs, env, modul = MOD) {
  const { onRequestGet } = await import(modul);
  const request = new Request(`https://exemplu.test/api/provider-health?${qs}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  const res = await onRequestGet({ request, env });
  let corp = null;
  try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp };
}

const ENV_PLIN = {
  APP_API_TOKEN: TOKEN,
  PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s",
  COINGECKO_API_KEY: "cg", TWELVE_DATA_API_KEY: "td",
  VAPID_PUBLIC_KEY: "vp", VAPID_PRIVATE_KEY: "vs",
  DB: { prepare: () => ({ first: async () => ({ x: 1 }) }) },
  API_RATE_LIMIT: { get: async () => null, put: async () => {} },
};
const ENV_GOL = { APP_API_TOKEN: TOKEN };

console.log("\nV69 · sanatatea furnizorilor · proba");

await test("ruta exista si intoarce lista de furnizori", async () => {
  fetchStub({ status: 200 });
  const r = await cheama("deep=0", ENV_GOL, proaspat());
  assert.equal(r.status, 200, `asteptam 200, am primit ${r.status}`);
  assert.ok(Array.isArray(r.corp?.providers), "raspunsul nu poarta `providers`, cum citeste app.js");
  assert.ok(r.corp.providers.length >= 4, `prea putini furnizori: ${r.corp.providers.length}`);
});

await test("fiecare rand are forma pe care o randeaza tabelul", async () => {
  fetchStub({ status: 200 });
  const r = await cheama("deep=0", ENV_PLIN, proaspat());
  const STARI = new Set(["OK", "CONFIGURED", "DEGRADED", "STALE", "FAIL"]);
  for (const p of r.corp.providers) {
    assert.ok(p.name, `rand fara nume: ${JSON.stringify(p)}`);
    assert.ok(STARI.has(p.state), `stare necunoscuta "${p.state}" la ${p.name}`);
    assert.ok("detail" in p, `rand fara detail: ${p.name}`);
  }
});

// v74.6: fara deep se face O SINGURA cerere - citirea reala a cheii Pionex
// (bot/orders, limit 1). Existenta variabilelor nu mai trece drept "cheie buna".
await test("fara deep se suna DOAR citirea cheii Pionex (bot/orders)", async () => {
  fetchStub({ status: 200 });
  await cheama("deep=0", ENV_PLIN, proaspat());
  assert.equal(cereri.length, 1, `a sunat ${cereri.length} furnizori desi deep=0: ${cereri.join(" | ")}`);
  assert.match(cereri[0], /\/api\/v1\/bot\/orders\?/, `cererea nu e citirea cheii: ${cereri[0]}`);
});

await test("cu deep=1 chiar se probeaza furnizorii", async () => {
  fetchStub({ status: 200 });
  await cheama("deep=1", ENV_PLIN, proaspat());
  assert.ok(cereri.length >= 2, `deep=1 dar s-au facut doar ${cereri.length} probe`);
  assert.ok(cereri.some((u) => /pionex/i.test(u)), "nu s-a probat Pionex");
});

await test("un furnizor care refuza (429) e raportat FAIL, cu motivul la vedere", async () => {
  fetchStub((url) => (/pionex/i.test(url) ? { status: 429, corp: "Too Many Requests" } : { status: 200 }));
  const r = await cheama("deep=1", ENV_PLIN, proaspat());
  const px = r.corp.providers.find((p) => /pionex/i.test(p.name) && /reach|acces/i.test(p.name + p.detail));
  assert.ok(px, `nu gasesc randul de accesibilitate Pionex: ${r.corp.providers.map((x) => x.name).join(" | ")}`);
  assert.equal(px.state, "FAIL", `asteptam FAIL, am primit ${px.state}`);
  assert.match(String(px.detail), /429/, `motivul nu spune 429: ${px.detail}`);
});

await test("cheile lipsa se vad, dar nu sunt date ca obligatorii", async () => {
  fetchStub({ status: 200 });
  const r = await cheama("deep=0", ENV_GOL, proaspat());
  const cg = r.corp.providers.find((p) => /coingecko/i.test(p.name));
  assert.ok(cg, "CoinGecko lipseste din lista");
  assert.equal(cg.required, false, "CoinGecko nu trebuie sa traga scorul in jos: e optional");
  const px = r.corp.providers.find((p) => /pionex/i.test(p.name));
  assert.notEqual(px.state, "OK", "fara chei, Pionex nu poate fi OK");
});

await test("D1 lipsa e raportata, ca sa se vada de ce nu se salveaza nimic", async () => {
  fetchStub({ status: 200 });
  const r = await cheama("deep=0", ENV_GOL, proaspat());
  const db = r.corp.providers.find((p) => /D1|istoric|history/i.test(p.name));
  assert.ok(db, "nu se raporteaza deloc starea bazei D1");
  assert.equal(db.state, "FAIL", `D1 nelegat ar trebui FAIL, e ${db.state}`);
});

await test("ruta cere autentificare, ca toate celelalte", async () => {
  fetchStub({ status: 200 });
  const { onRequestGet } = await import(proaspat());
  const res = await onRequestGet({
    request: new Request("https://exemplu.test/api/provider-health"),
    env: ENV_PLIN,
  });
  assert.equal(res.status, 401, `fara token asteptam 401, am primit ${res.status}`);
});

await test("o proba care crapa nu darama toata ruta", async () => {
  cereri = [];
  globalThis.fetch = async () => { throw Error("retea moarta"); };
  const r = await cheama("deep=1", ENV_PLIN, proaspat());
  assert.equal(r.status, 200, `ruta a picat cu ${r.status} cand furnizorii sunt morti`);
  assert.ok(r.corp.providers.some((p) => p.state === "FAIL"), "nimeni nu e FAIL desi reteaua e moarta");
});

console.log(`\nV69_PROVIDER_HEALTH ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
