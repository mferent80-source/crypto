// Proba v100.28 (30.09, el: „fa idei” - ideea 2 din trei): Pionex in LEI pentru Declaratia Unica - fiecare bot la cursul BNR (USD)
// din ziua inchiderii, dupa ora Romaniei (weekend / sarbatoare -> ultimul curs publicat inainte); USDT socotit ca USD, spus.
// Sursa: fisierul anual BNR curs.bnr.ro/files/xml/years/nbrfxrates<an>.xml (adresa veche www.bnr.ro/files/... da 404 la 30.09.2026).
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const T212 = new Function(`${lib("t212.js")}; return T212;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.28 · Pionex in lei la cursul BNR · proba\n");
const bot = (iso, rez) => ({ inchis: Date.parse(iso), rezultat: rez, comisioane: -0.5, funding: 0 });
const CURS = { "2025-12-31": 4.3417, "2026-01-05": 4.3557, "2026-09-25": 4.62, "2026-09-29": 4.6568 };

await test("fiecare bot la cursul zilei inchiderii; weekend -> vineri; 1-4 ianuarie -> ultimul curs din decembrie", () => {
  const boti = [bot("2026-09-29T10:00:00Z", 10.5), bot("2026-09-27T12:00:00Z", -20.5), bot("2026-01-02T12:00:00Z", 5.5)];
  const r = T212.raportAnual({ inchise: [], dividende: [], boti, an: 2026, cursUsd: CURS });
  assert.equal(r.pionex.n, 3); assert.ok(Math.abs(r.pionex.net - (10 - 21 + 5)) < 1e-9);
  const lei = 10 * 4.6568 + -21 * 4.62 + 5 * 4.3417;
  assert.ok(Math.abs(r.pionex.lei - lei) < 1e-9, r.pionex.lei + " vs " + lei);
  assert.equal(r.pionex.faraCurs, 0);
  assert.match(r.text, /≈ [−-]/); assert.match(r.text, /curs BNR/); assert.match(r.text, /USDT socotit ca USD/);
});

await test("anul si ziua dupa ora ROMANIEI: inchis la 00:30 pe 1 ianuarie (22:30 UTC pe 31 decembrie) tine de anul nou", () => {
  const b = [bot("2025-12-31T22:30:00Z", 3.5)];
  assert.equal(T212.raportAnual({ boti: b, an: 2025, cursUsd: CURS }).pionex.n, 0);
  const r = T212.raportAnual({ boti: b, an: 2026, cursUsd: CURS });
  assert.equal(r.pionex.n, 1); assert.ok(Math.abs(r.pionex.lei - 3 * 4.3417) < 1e-9, "1 ianuarie -> cursul din 31 decembrie");
  assert.ok(r.ani.includes(2026));
});

await test("fara curs pentru o zi (inainte de primul curs cunoscut) -> numarat si spus, nu socotit cu 0", () => {
  const r = T212.raportAnual({ boti: [bot("2025-12-20T12:00:00Z", 1.5), bot("2025-12-31T12:00:00Z", 1.5)], an: 2025, cursUsd: CURS });
  assert.equal(r.pionex.faraCurs, 1); assert.ok(Math.abs(r.pionex.lei - 1 * 4.3417) < 1e-9);
  assert.match(r.text, /1 bot fără curs/);
});

await test("fara cursuri (nu s-au putut aduce) -> ca inainte: doar USDT, lei = null", () => {
  const r = T212.raportAnual({ boti: [bot("2026-09-29T10:00:00Z", 10.5)], an: 2026 });
  assert.equal(r.pionex.lei, null); assert.doesNotMatch(r.text, /≈/);
});

const { cursDinXml } = await import("../functions/api/curs-bnr.js");
const XML = `<?xml version="1.0" encoding="utf-8"?><DataSet xmlns="http://www.bnr.ro/xsd"><Header><Publisher>National Bank of Romania</Publisher></Header><Body><Subject>Reference rates</Subject><OrigCurrency>RON</OrigCurrency>`
  + `<Cube date="2026-09-28"><Rate currency="EUR">5.0791</Rate><Rate currency="HUF" multiplier="100">1.3050</Rate><Rate currency="USD">4.6397</Rate></Cube>`
  + `<Cube date="2026-09-29"><Rate currency="USD">4.6568</Rate></Cube><Cube date="2026-09-30"><Rate currency="EUR">5.08</Rate></Cube></Body></DataSet>`;

await test("cursDinXml: USD pe zile (si multiplicatorul, ex. HUF la 100)", () => {
  assert.deepEqual(cursDinXml(XML, "USD"), { "2026-09-28": 4.6397, "2026-09-29": 4.6568 });
  assert.deepEqual(cursDinXml(XML, "HUF"), { "2026-09-28": 0.01305 });
  assert.deepEqual(cursDinXml("nu e xml", "USD"), {});
});

const TOKEN = "proba-token-1234567890";
let ip = 0;
async function ruta(qs, fetchFals) {
  const nativ = globalThis.fetch, cereri = [];
  globalThis.fetch = async (u) => { cereri.push(String(u)); return fetchFals(String(u)); };
  try {
    const m = await import(`../functions/api/curs-bnr.js?t=${Date.now()}_${Math.random()}`);
    const cere = async (q) => { const r = await m.onRequestGet({ request: new Request("https://exemplu.test/api/curs-bnr" + q, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.28.0." + (++ip) } }), env: { APP_API_TOKEN: TOKEN } }); return { status: r.status, corp: JSON.parse(await r.text()) }; };
    const a = await cere(qs), b = await cere(qs);
    return { a, b, cereri };
  } finally { globalThis.fetch = nativ; }
}
await test("ruta /api/curs-bnr?an=2026: ia fisierul anual de la curs.bnr.ro, da cursul USD pe zile; a doua cerere din memorie", async () => {
  const { a, b, cereri } = await ruta("?an=2026", () => new Response(XML, { status: 200, headers: { "content-type": "text/xml" } }));
  assert.equal(a.status, 200); assert.equal(a.corp.an, 2026); assert.equal(a.corp.moneda, "USD"); assert.deepEqual(a.corp.curs, { "2026-09-28": 4.6397, "2026-09-29": 4.6568 }); assert.equal(a.corp.zile, 2);
  assert.equal(cereri.length, 1, "a doua cerere nu mai merge la BNR"); assert.match(cereri[0], /^https:\/\/curs\.bnr\.ro\/files\/xml\/years\/nbrfxrates2026\.xml$/);
  assert.deepEqual(b.corp.curs, a.corp.curs);
});
await test("ruta: an gresit -> 400; BNR picat -> 502 cu motiv (nu o lista goala)", async () => {
  const { a } = await ruta("?an=abc", () => new Response(XML));
  assert.equal(a.status, 400);
  const { a: c } = await ruta("?an=2024", () => new Response("<html>eroare</html>", { status: 404 }));
  assert.equal(c.status, 502); assert.match(c.corp.error, /BNR/);
});

const t2 = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8");
await test("pagina: Declaratia cere cursurile anului (si ale celui dinainte, pentru 1-4 ianuarie) si arata Pionex si in lei", () => {
  assert.match(t2, /function t212CursPentru\(/); assert.match(t2, /\/api\/curs-bnr\?an=/);
  const i = t2.indexOf("function t212RaportDecl("), corp = t2.slice(i, t2.indexOf("\n}", i));
  assert.match(corp, /cursUsd: t212CursPentru\(an\)/);
  const j = t2.indexOf("function t212DeclaratieBloc("), bloc = t2.slice(j, t2.indexOf("\n}", j));
  assert.match(bloc, /px\.lei/); assert.match(bloc, /cursul BNR/); assert.match(bloc, /Se aduce cursul BNR/); assert.match(bloc, /nu s-a putut aduce/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
