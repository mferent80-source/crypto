// Probele v90: "Idei de cumparare" - actiunile care trec de poarta (+ proba pe istoricul lor pe plus, fara
// rezultate in 10 zile), botii din clasament cu istoricul LUI, urmarirea ideilor, tura din colector si ruta.
// Ideile sunt un FILTRU (departe de situatiile proaste), nu o predictie - ecranul o spune.
import assert from "node:assert/strict";
import fs from "node:fs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const lib = (f) => { const u = new URL("../public/lib/" + f, import.meta.url); return fs.existsSync(u) ? fs.readFileSync(u, "utf8") : ""; };
const I = new Function(lib("grid-calcul.js") + lib("actiuni-semnale.js") + lib("idei.js") + "; return typeof Idei !== 'undefined' ? Idei : null;")();
const ZI = 86400000, ACUM = Date.UTC(2026, 8, 26, 6);
const zilnice = (n, f) => { const b = []; for (let i = 0; i < n; i++) { const c = f(i); b.push({ t: ACUM - (n - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); } return b; };
// o actiune pe trend sus, prinsa intr-o retragere (oscilatia de 2% e in coborare la capat): asa trece de poarta
const buna = zilnice(296, (i) => 100 * Math.pow(1.002, i) * (1 + 0.02 * Math.sin(i / 2)));
const coboara = zilnice(300, (i) => 100 * Math.pow(0.998, i));

console.log("\nV90 · idei de cumparare · proba\n");
await test("modulul exista", () => assert.ok(I, "public/lib/idei.js lipseste"));

await test("actiune: trend sus, fara miscare, proba pe plus -> trece, cu intrare, stop -15% care urca, tinta, motive; trend jos -> nu trece, cu motivul", () => {
  const r = I.judecaActiune(buna, buna.at(-1).c, { acum: ACUM });
  assert.equal(r.trece, true, JSON.stringify(r.motive)); assert.ok(r.intrare > 0 && r.stop < r.intrare && r.tinta > r.intrare);
  ((a, e) => assert.ok(Math.abs(a - e) < 1e-9))(r.stop, r.intrare * 0.85);
  assert.ok(r.motive.length > 0 && r.scor !== null);
  const j = I.judecaActiune(coboara, coboara.at(-1).c, { acum: ACUM }); assert.equal(j.trece, false); assert.match(j.motive.join(" "), /jos/);
  assert.equal(I.judecaActiune(buna.slice(0, 50), 100, { acum: ACUM }).trece, false);
});
await test("actiune: rezultate trimestriale in urmatoarele 10 zile -> nu trece (pretul poate sari), cu data in motiv", () => {
  const r = I.judecaActiune(buna, buna.at(-1).c, { acum: ACUM, rezultate: "2026-09-30" });
  assert.equal(r.trece, false); assert.match(r.motive.join(" "), /30\.09/);
  assert.equal(I.judecaActiune(buna, buna.at(-1).c, { acum: ACUM, rezultate: "2026-11-30" }).trece, true);
});
await test("alegerea: cele care trec, ordonate dupa scor, primele n; istoricul LUI pe fiecare (n, pe plus, total)", () => {
  const l = [{ ticker: "A_US_EQ", r: { trece: true, scor: 0.01 } }, { ticker: "B_US_EQ", r: { trece: false, scor: 0.5 } }, { ticker: "C_US_EQ", r: { trece: true, scor: 0.03 } }];
  const inchise = [{ ticker: "C_US_EQ", rezultat: 10 }, { ticker: "C_US_EQ", rezultat: -3 }];
  const a = I.alegeActiuni(l, 5, inchise);
  assert.deepEqual(a.map((x) => x.ticker), ["C_US_EQ", "A_US_EQ"]); assert.equal(a[0].istoric.n, 2); assert.equal(a[0].istoric.pePlus, 1);
});
await test("boti: candidatii din clasament dupa scor, primii n, cu istoricul LUI pe moneda; cei 'de evitat' nu", () => {
  const cl = { la: ACUM, monede: [{ simbol: "MET_USDT_PERP", stare: "candidat", scor: 3 }, { simbol: "X_USDT_PERP", stare: "evita", scor: 9 }, { simbol: "BTC_USDT_PERP", stare: "candidat", scor: 5 }] };
  const b = I.ideiBoti(cl, [{ moneda: "MET", rezultat: -2 }, { moneda: "MET", rezultat: -1 }], 5);
  assert.deepEqual(b.map((x) => x.moneda), ["BTC", "MET"]); assert.equal(b[1].istoric.n, 2); assert.ok(b[1].istoric.total < 0);
  assert.deepEqual(I.ideiBoti(null, [], 5), []);
});
await test("urmarirea ideilor: cele de cel putin 5 zile, cat au facut de la pretul ideii pana acum, dupa comision; sub 5 zile nu intra", () => {
  const ist = [{ zi: "2026-09-10", ticker: "A_US_EQ", pret: 100 }, { zi: "2026-09-12", ticker: "B_US_EQ", pret: 50 }, { zi: "2026-09-24", ticker: "C_US_EQ", pret: 10 }];
  const u = I.urmarire(ist, { A_US_EQ: 110, B_US_EQ: 45, C_US_EQ: 20 }, ACUM);
  assert.equal(u.n, 2); assert.equal(u.pePlus, 1); ((a, e) => assert.ok(Math.abs(a - e) < 1e-9, a + " vs " + e))(u.medie, ((0.1 - 0.003) + (-0.1 - 0.003)) / 2);
  assert.match(u.text, /2 idei/);
  assert.equal(I.urmarire([], {}, ACUM).n, 0);
});

// ---------------- tura din colector ----------------
await test("tura ideilor: judeca universul, cere data rezultatelor DOAR pentru cele care trec, salveaza primele 5; o actiune fara preturi nu opreste tura", async () => {
  const { turaIdei } = await import("./lib/tura-idei.mjs");
  const cerute = [], rez = [];
  const r = await turaIdei({ tickere: ["BUN_US_EQ", "JOS_US_EQ", "LIPSA_US_EQ"], acum: ACUM, Idei: I, inchise: [], pauza: async () => {}, jurnal: () => {},
    cereBare: async (tk) => { cerute.push(tk); if (tk === "LIPSA_US_EQ") throw new Error("404"); return tk === "BUN_US_EQ" ? buna : coboara; },
    cereRezultate: async (tk) => { rez.push(tk); return null; } });
  assert.deepEqual(cerute, ["BUN_US_EQ", "JOS_US_EQ", "LIPSA_US_EQ"]); assert.deepEqual(rez, ["BUN_US_EQ"]);
  assert.equal(r.judecate, 2); assert.equal(r.trecute, 1); assert.equal(r.actiuni[0].ticker, "BUN_US_EQ"); assert.equal(r.actiuni[0].simbol, "BUN");
  // v90: acelasi simbol de bursa sub doua tickere T212 (SNDK1 = SNDK) -> judecat o data, cu primul (al lui)
  cerute.length = 0;
  const r2 = await turaIdei({ tickere: ["SNDK1_US_EQ", "SNDK_US_EQ"], simbol: (tk) => (tk.startsWith("SNDK") ? "SNDK" : tk.split("_")[0]), acum: ACUM, Idei: I, inchise: [], pauza: async () => {}, jurnal: () => {},
    cereBare: async (tk) => { cerute.push(tk); return buna; }, cereRezultate: async () => null });
  assert.deepEqual(cerute, ["SNDK1_US_EQ"]); assert.equal(r2.actiuni.length, 1); assert.equal(r2.actiuni[0].simbol, "SNDK"); assert.equal(r2.actiuni[0].ticker, "SNDK1_US_EQ");
});

// ---------------- ruta (KV) ----------------
const TOKEN = "proba-token-1234567890";
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
let ip = 0;
async function ruta(met, qs, env, corp) {
  const m = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.90.0." + (++ip % 250), origin: "https://exemplu.test", "content-type": "application/json" };
  const req = new Request(`https://exemplu.test/api/t212?${qs}`, met === "POST" ? { method: "POST", headers: h, body: JSON.stringify(corp) } : { headers: h });
  const res = await (met === "POST" ? m.onRequestPost : m.onRequestGet)({ request: req, env });
  let c = null; try { c = JSON.parse(await res.text()); } catch {}
  return { status: res.status, corp: c };
}
await test("ruta idei: colectorul salveaza ideile (curatate) si istoricul lor (o data pe zi pe simbol); lista lui de simboluri (doar litere/cifre, max 30)", async () => {
  const env = { APP_API_TOKEN: TOKEN, T212_API_KEY: "k", T212_API_SECRET: "s", ISTORIC: kvFals() };
  const act = [{ ticker: "AAPL_US_EQ", simbol: "AAPL", pret: 200, intrare: 198, stop: 168.3, tinta: 230, scor: 0.02, motive: ["trend sus"], istoric: { n: 2, pePlus: 1, total: 10 } }];
  await ruta("POST", "action=idei", env, { la: ACUM, zi: "2026-09-26", actiuni: act, judecate: 120, trecute: 7 });
  await ruta("POST", "action=idei", env, { la: ACUM, zi: "2026-09-26", actiuni: act, judecate: 120, trecute: 7 });
  await ruta("POST", "action=lista", env, { simboluri: ["asts", "MSFT", "<script>", "BRK.B"] });
  const g = await ruta("GET", "action=idei", env);
  assert.equal(g.status, 200); assert.equal(g.corp.idei.actiuni[0].simbol, "AAPL"); assert.equal(g.corp.idei.trecute, 7);
  assert.equal(g.corp.istoric.length, 1, "aceeasi zi + acelasi simbol = o intrare"); assert.equal(g.corp.istoric[0].pret, 200);
  assert.deepEqual(g.corp.lista, ["ASTS", "MSFT", "BRK.B"]);
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
