// Proba v100.344 · partea 3 (auditul 16.11): urmăriri cinstite.
//   1. „Pe ce aș porni”: o zi al cărei orizont n-a ajuns încă la bara închisă e „încă nu”, nu „fără bare” (08.11 era numărată greșit);
//      sub 8 ferestre textul spune că e prea devreme; notările regulii noi (de la 16.11, după costuri) se judecă separat de cele vechi (după scor).
//   2. Acțiuni pe revenire, US ȘI EU: fiecare semnal intră o dată (pauză 14 zile pe ticker), la DESCHIDEREA de după bara semnalului, iese la
//      închiderea după 10 zile de bursă; față de reperul din aceleași zile (QQQ / EXW1 = Euro Stoxx 50), după 0,3% cost; numărat pe zile.
//      Pe EU lista „revine” nu era scrisă deloc (tura urmărea doar listele scoase pe 01.11).
//   3. Tura de dimineață nu mai calculează listele scoase (urcare, revers, gap: 3 × 2.000 de repetări pe 2 piețe, zilnic).
//   node scripts/proba-v100344-urm.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import { urmarireFixa, alegePorn } from "./lib/tura-sugestii.mjs";
import { urmarireRevine, sugestiiDimineata } from "./lib/tura-sugestii-actiuni.mjs";

let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.344 · urmăriri cinstite · proba\n");
const H = 3600000, ZI = 86400000;

// ── 1. „Pe ce aș porni” ──
const bare1h = (de, n, p0, pas) => Array.from({ length: n }, (_, i) => ({ t: de + i * H, o: p0 + i * pas, h: p0 + i * pas, l: p0 + i * pas, c: p0 + (i + 1) * pas }));
await test("🔑 orizontul neajuns la o bară închisă ⇒ „în așteptare”, nu „nejudecată”", () => {
  const t0 = Date.parse("2026-11-08T06:00:00Z"), b = bare1h(t0 - 10 * H, 7 * 24 + 10, 100, 0.01);   // ultima bară pornește la 06:00 a zilei +7, nu e închisă
  const u = urmarireFixa([{ zi: "2026-11-08", simbol: "A", pret: 100, lista: "porn", dir: "long" }], { zile: 7, bare1h: () => b, toate: ["A"], acum: t0 + 7 * ZI + 54000 });
  assert.equal(u.nejudecate, 0); assert.equal(u.inAsteptare, 1);
});
await test("sub 8 ferestre textul spune că e prea devreme", () => {
  const t0 = Date.parse("2026-11-01T06:00:00Z"), b = bare1h(t0 - 10 * H, 12 * 24, 100, 0.01);
  const u = urmarireFixa([{ zi: "2026-11-01", simbol: "A", pret: 100, lista: "porn", dir: "long" }], { zile: 7, cost: 0.001, bare1h: () => b, toate: ["A"], acum: t0 + 9 * ZI });
  assert.equal(u.ferestre, 1); assert.match(u.text, /prea devreme/);
});
await test("🔑 notările regulii noi (reg 2, de la 16.11) se judecă separat de cele vechi (după scor)", () => {
  const ist = [{ zi: "2026-11-15", simbol: "A", lista: "porn" }, { zi: "2026-11-16", simbol: "B", lista: "porn", reg: 2 }, { zi: "2026-11-16", simbol: "C", lista: "short" }];
  const p = alegePorn(ist);
  assert.deepEqual(p.nou.map((x) => x.simbol), ["B"]); assert.deepEqual(p.vechi.map((x) => x.simbol), ["A"]);
});

// ── 2. revenirea pe acțiuni ──
const zileBursa = (de, n) => { const l = []; let t = de; while (l.length < n) { const w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) l.push(t); t += ZI; } return l; };
const serie = (zile, f) => zile.map((t, i) => ({ t, o: f(i) * 0.99, h: f(i) * 1.01, l: f(i) * 0.98, c: f(i) }));
const Z = zileBursa(Date.UTC(2026, 8, 1, 20), 60);
await test("🔑 intrarea la DESCHIDEREA de după semnal, ieșirea la închiderea după 10 zile de bursă, față de reper, după 0,3%", () => {
  const act = serie(Z, (i) => 100 * (1 + 0.01 * i)), rep = serie(Z, (i) => 50 * (1 + 0.004 * i));
  const ist = [{ zi: "2026-09-02", piata: "us", lista: "revine", ticker: "X_US_EQ", pret: 101, t: Z[1] + 12 * H, tBara: Z[1] }];
  const u = urmarireRevine(ist, { X_US_EQ: act }, { us: rep }, Z[40], { piata: "us" });
  const intra = act[2].o, ies = act[11].c, ri = rep[2].o, re = rep[11].c;
  const asteptat = ies / intra - 1 - (re / ri - 1) - 0.003;
  assert.equal(u.n, 1); assert.equal(u.zile, 1); assert.ok(Math.abs(u.exces - asteptat) < 1e-12, u.exces + " vs " + asteptat);
});
await test("același ticker revine în listă a doua zi ⇒ un singur semnal (pauză 14 zile)", () => {
  const act = serie(Z, (i) => 100 + i), rep = serie(Z, (i) => 50 + i * 0.1);
  const ist = [1, 2, 3].map((k) => ({ zi: "z" + k, piata: "eu", lista: "revine", ticker: "Y", pret: 100, t: Z[k] + 9 * H, tBara: Z[k] }));
  const u = urmarireRevine(ist, { Y: act }, { eu: rep }, Z[50], { piata: "eu" });
  assert.equal(u.n, 1);
});
await test("fără 10 zile de bursă după intrare ⇒ „în așteptare”; fără reper ⇒ fără „față de piață”, spus în text", () => {
  const act = serie(Z, (i) => 100 + i);
  const u = urmarireRevine([{ zi: "a", piata: "us", lista: "revine", ticker: "X", pret: 100, t: Z[55], tBara: Z[55] }], { X: act }, { us: serie(Z, () => 50) }, Z[59] + H, { piata: "us" });
  assert.equal(u.n, 0); assert.equal(u.inAsteptare, 1);
  const v = urmarireRevine([{ zi: "a", piata: "us", lista: "revine", ticker: "X", pret: 100, t: Z[1], tBara: Z[1] }], { X: act }, {}, Z[50], { piata: "us" });
  assert.equal(v.n, 1); assert.equal(v.exces, null); assert.match(v.text, /fără reper/);
});
await test("🔑 tura de dimineață: lista „revine” US și EU intră în istoric; urcare / revers / gap nu se mai calculează", async () => {
  const b = serie(Z, (i) => (i < 30 ? 100 - i * 1.5 : 55 + (i - 30) * 1.2));
  let calcule = 0;
  const SA = { puncte: () => { calcule++; return []; }, azi: () => { calcule++; return null; }, dovada: () => { calcule++; return {}; }, textDovada: () => "", volumMediu: () => { calcule++; return null; }, areSalt: () => false };
  const Rev = { actiunePeRevenire: () => ({ revine: true, cadere: 0.4, pret: 60, deLaMin: 0.1, zileDeLaMin: 4, stop: 50, tinta: 100 }), puncte: () => [], dovada: () => ({}), textDovada: () => "", REGULI: { actiune: {} } };
  const r = await sugestiiDimineata({ SA, Reveniri: Rev, bareUS: new Map([["X_US_EQ", b]]), tickereEU: ["Y.DE"], cereBare: async () => b, acum: Z[59] + 30 * H, istoric: [],
    reveniriUS: [{ ticker: "X_US_EQ", simbol: "X", pret: 60 }], reper: { us: b, eu: b } });
  assert.equal(calcule, 0, "a mai calculat listele scoase");
  assert.ok(r.istoric.some((x) => x.piata === "us" && x.lista === "revine" && x.ticker === "X_US_EQ"));
  assert.ok(r.istoric.some((x) => x.piata === "eu" && x.lista === "revine" && x.ticker === "Y.DE"));
  assert.ok(r.raport.urmarire.us.revine && r.raport.urmarire.eu.revine);
  assert.equal(r.raport.us.urcare, undefined); assert.equal(r.raport.eu.revers, undefined);
});

// ── 4. pagina cere doar ce folosește (auditul: ~400 KB aduși, ~40 KB folosiți) ──
async function citeste(cale, kv) {
  const path = await import("node:path"), { pathToFileURL, fileURLToPath } = await import("node:url");
  const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + Math.random());
  const env = { APP_API_TOKEN: "t-urm", ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async () => {}, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const r = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?" + cale, { headers: { "cf-connecting-ip": "10.0.3.45", authorization: "Bearer t-urm" } }), env });
  return { status: r.status, d: await r.json() };
}
await test("🔑 lățimea cu scurt=1: istoricul doar cât îi trebuie lui „de când” (începutul șirului de acum și ultimul punct)", async () => {
  const ist = Array.from({ length: 2000 }, (_, i) => ({ la: i * 900000, cod: i < 1500 ? "AMESTECAT" : "LARG-SUS", pctSus: 50, pctJos: 40, mariLong: 100 }));
  const kv = new Map([["latime", JSON.stringify({ acum: { la: 1, lat: {} }, istoric: ist })]]);
  const r = await citeste("action=latime&scurt=1", kv);
  assert.equal(r.status, 200); assert.equal(r.d.latime.istoric.length, 2);
  assert.deepEqual(r.d.latime.istoric.map((x) => x.la), [1500 * 900000, 1999 * 900000]);
  const intreg = await citeste("action=latime", kv); assert.equal(intreg.d.latime.istoric.length, 2000, "Tabloul / Piața azi primesc tot, ca înainte");
});
await test("🔑 sugestiile cu porn=1: doar notările „Pe ce aș porni” din ultimele 14 zile (pentru „nou față de ieri”)", async () => {
  const zi = (k) => new Date(Date.now() - k * 86400000).toISOString().slice(0, 10);
  const ist = [].concat(Array.from({ length: 30 }, (_, k) => ({ zi: zi(k), simbol: "A_USDT_PERP", pret: 1, lista: "porn" })), Array.from({ length: 30 }, (_, k) => ({ zi: zi(k), simbol: "B_USDT_PERP", pret: 1, lista: "revenire" })));
  const kv = new Map([["sugestii", JSON.stringify({ la: 1, urmarire: {} })], ["sugestii-istoric", JSON.stringify(ist)]]);
  const r = await citeste("action=sugestii&porn=1", kv);
  assert.ok(r.d.istoric.length > 0 && r.d.istoric.every((x) => x.lista === "porn" && x.zi >= zi(14)), JSON.stringify(r.d.istoric.slice(0, 2)));
  assert.ok(r.d.sugestii);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
