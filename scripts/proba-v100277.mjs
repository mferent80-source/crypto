// Proba v100.277 / colector v101.151 (30.10, el: „boții tăi - față de ieri pare blocat, aș pune mai multe date acolo, statistici etc.”):
// (1) „Față de ieri dimineață” adaugă boții porniți și închiși DUPĂ poza de ieri (lipseau cu totul - el ține ~8 boți pe zi, de minute);
// (2) „Boții tăi”: ultimul închis când nu e niciunul pornit, ziua de azi, ultimele 7 zile și cele 7 dinainte - pe net, descriptiv;
// (3) lista boților închiși se reîmprospătează la 5 min (înainte o dată pe deschidere); (4) poza de dimineață ține și ora ei.
//   node scripts/proba-v100277.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(lib("acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.277 · BOȚII TĂI · proba\n");
const ae = lib("acasa-ecran.js"), te = lib("t212-ecran.js"), api = citeste("functions", "api", "istoric-bot.js"), tp = citeste("scripts", "lib", "tura-piata.mjs");
const T = (s) => Date.parse(s);

await test("ora 9 a României: vara +3, iarna +2 (din Intl, nu scrisă de mână)", () => {
  assert.equal(AC.ora9Ro("2026-10-24"), T("2026-10-24T06:00:00Z"));
  assert.equal(AC.ora9Ro("2026-10-30"), T("2026-10-30T07:00:00Z"));
  assert.equal(AC.ora9Ro("x"), null);
});

await test("(1) față de ieri: boții închiși după poză intră cu netul întreg; cei închiși înainte de poză sau prezenți în poze nu se dublează", () => {
  const ieri = { zi: "2026-10-29", botiPeId: { "2572": 2.23 }, la: T("2026-10-29T07:05:00Z") };
  const azi = { botiPeId: { "2580": 13.56 } };
  const inchise = [
    { id: "2572", inchis: T("2026-10-29T15:00:00Z"), net: 5 },        // era în poza de ieri ⇒ 5 − 2,23 (ca înainte)
    { id: "2590", inchis: T("2026-10-30T10:00:00Z"), net: 21.8 },     // pornit și închis după poză ⇒ +21,8 (lipsea)
    { id: "2591", inchis: T("2026-10-30T11:00:00Z"), net: -24.8 },    // idem ⇒ −24,8
    { id: "2500", inchis: T("2026-10-29T06:00:00Z"), net: -50 },      // închis ÎNAINTE de poza de ieri ⇒ nu intră
    { id: "2580", inchis: T("2026-10-30T12:00:00Z"), net: 99 },       // e încă în poza de azi (activ) ⇒ nu se dublează
    { id: "2592", net: 7 },                                           // fără ora închiderii ⇒ nu se ghicește
  ];
  const z = AC.ziuaTa(azi, [ieri], "2026-10-30", inchise);
  assert.equal(z.boti, Math.round((13.56 + (5 - 2.23) + 21.8 - 24.8) * 100) / 100);
  assert.equal(z.inchiseDupa, 2);
  // poza veche fără `la`: ora 9 a zilei ei (29.10 ⇒ 07:00 UTC); unul închis la 06:30 UTC nu intră, unul la 07:30 intră
  const ier2 = { zi: "2026-10-29", botiPeId: {} };
  const z2 = AC.ziuaTa({ botiPeId: {} }, [ier2], "2026-10-30", [{ id: "a", inchis: T("2026-10-29T06:30:00Z"), net: -9 }, { id: "b", inchis: T("2026-10-29T07:30:00Z"), net: 4 }]);
  assert.equal(z2.boti, 4); assert.equal(z2.inchiseDupa, 1);
  // fără lista boților închiși: exact ca înainte (proba v10040)
  assert.equal(AC.ziuaTa({ botiPeId: { a: 5 } }, [{ zi: "2026-09-29", botiPeId: { a: 3 } }], "2026-09-30").boti, 2);
  assert.equal(AC.ziuaTa({ botiPeId: { a: 5 } }, [{ zi: "2026-09-29", botiPeId: { a: 3 } }], "2026-09-30").inchiseDupa, 0);
});

const ACUM = T("2026-10-30T18:00:00Z");   // 20:00 ora României
const tr = (id, m, pornit, inchis, net) => ({ id, moneda: m, dir: "long", levier: 3, pornit: T(pornit), inchis: T(inchis), net });
const L = [
  tr("1", "PARTI", "2026-10-30T07:00:00Z", "2026-10-30T07:08:00Z", 21.8),
  tr("2", "PARTI", "2026-10-30T08:00:00Z", "2026-10-30T08:03:00Z", -24.8),
  tr("3", "BEAMX", "2026-10-30T09:00:00Z", "2026-10-30T10:06:00Z", 1.2),
  tr("4", "PARTI", "2026-10-29T21:30:00Z", "2026-10-29T22:10:00Z", 5),     // 30.10 00:10 ora RO ⇒ e „azi”
  tr("5", "ONDO", "2026-10-29T10:00:00Z", "2026-10-29T21:50:00Z", -3),     // 29.10 23:50 ora RO ⇒ ieri
  tr("6", "XMR", "2026-10-20T10:00:00Z", "2026-10-20T12:00:00Z", -54.5),   // în cele 7 dinainte
  tr("7", "XAN", "2026-10-30T18:30:00Z", "2026-10-30T19:00:00Z", 100),     // după „acum” ⇒ nu intră
  { id: "8", moneda: "Z", pornit: T("2026-10-30T09:00:00Z"), inchis: T("2026-10-30T09:01:00Z"), net: null, rezultat: null },   // fără rezultat ⇒ nu intră
];
await test("(2) statisticile: azi după ziua României, 7 zile, cele 7 dinainte, mediana duratei, cel mai bun / slab, ultimul închis", () => {
  const s = AC.botiStatistici(L, ACUM);
  assert.equal(s.azi.n, 4); assert.equal(s.azi.plus, 3); assert.equal(s.azi.minus, 1); assert.equal(s.azi.net, 3.2);
  assert.equal(s.azi.bun.id, "1"); assert.equal(s.azi.slab.id, "2");
  assert.equal(s.azi.durataMin, (8 + 40) / 2, "mediana din 3, 8, 40, 66 min");
  assert.equal(s.sapt.n, 5); assert.equal(s.sapt.net, 0.2);
  assert.equal(s.saptAnt.n, 1); assert.equal(s.saptAnt.net, -54.5);
  assert.equal(s.ultim.id, "3", "ultimul închis până acum, nu cel din viitor");
  const gol = AC.botiStatistici([], ACUM);
  assert.equal(gol.azi.n, 0); assert.strictEqual(gol.azi.durataMin, null); assert.strictEqual(gol.ultim, null);
  assert.equal(AC.durataScurta(3), "3 min"); assert.equal(AC.durataScurta(65), "1,1 h"); assert.equal(AC.durataScurta(777), "13 h"); assert.equal(AC.durataScurta(null), "—");
});

await test("(2) cardul: azi / 7 zile / 7 dinainte cu o zecimală, ultimul închis, fără zgomot; lista încă neadusă ⇒ „Aduc…”", () => {
  const cod = ae.slice(ae.indexOf("function acUsd("), ae.indexOf("function acasaDeseneaza() {"));
  const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const acCate = (n, sg, pl) => globalThis.TextRo.cate(n, sg, pl);
  const f = new Function("Acasa", "escapeHtml", "acCate", cod + "; return { acBotiStatHtml, acUltimInchis, acUsd };")(AC, esc, acCate);
  const h = f.acBotiStatHtml(L, ACUM).replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
  assert.match(h, /\|Azi\|4 boți închiși · 3 pe plus, 1 pe minus\|\+3,2 USDT\|/);
  assert.match(h, /\|Cel mai bun · cel mai slab\|PARTI \+21,8 · PARTI −24,8\|/);
  assert.match(h, /\|Cât țin de obicei\|24 min\|/);
  assert.match(h, /\|Ultimele 7 zile\|5 boți închiși · 3 pe plus, 2 pe minus\|\+0,2 USDT\|/);
  assert.match(h, /\|Cele 7 zile dinainte \|· 1 bot\|−54,5 USDT\|/);
  assert.match(h, /Ce s-a întâmplat, nu ce urmează; prea puțini boți ca să tragi concluzii\./);
  assert.doesNotMatch(h, /\d,\d\d\b/, "o singură zecimală");
  assert.match(f.acBotiStatHtml(null, ACUM), /Aduc boții închiși…/);
  assert.match(f.acBotiStatHtml([], ACUM), /Niciun bot închis azi\..*Niciun bot închis în 7 zile\./);
  const u = f.acUltimInchis(L[2]).replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
  assert.match(u, /\|Ultimul închis: BEAMX long 3× \|· a ținut 1,1 h · [^|]+\|\+1,2 USDT\|/);
  assert.equal(f.acUsd(0.04), "0,0 USDT"); assert.equal(f.acUsd(-0.04), "0,0 USDT"); assert.equal(f.acUsd(-0), "0,0 USDT"); assert.equal(f.acUsd(-1.86), "−1,9 USDT");
  // legat în card: rândurile de până acum rămân (activii, „Prețul în grid”, „Mediul lui”, „Față de ieri”) + blocurile noi
  assert.match(ae, /hb \+= acBotiStatHtml\(typeof contTot === "undefined" \|\| !contTot\.inchise \? null : contTot\.inchiseOk \? contTot\.inchise : false, Date\.now\(\)\);/);   /* v100.278: picat ≠ zero boți */
  assert.match(ae, /Niciun bot pornit acum\.<\/p>' \+ acUltimInchis\(/);
  assert.match(ae, /<span>Prețul în grid<\/span>/); assert.match(ae, /<span>Mediul lui<\/span>/);
  assert.match(ae, /Față de ieri dimineață' \+ \(zt\.inchiseDupa \?/);
});

await test("(3) boții închiși: reîmprospătați la 5 min; o citire picată păstrează lista avută", () => {
  const b = te.slice(te.indexOf("v100.277 (el: „față de ieri pare blocat”)"), te.indexOf('if (Date.now() - contTot.clasamentLa'));
  assert.match(b, /\(!contTot\.inchise \|\| Date\.now\(\) - \(contTot\.inchiseLa \|\| 0\) > 5 \* 60000\)/);
  assert.match(b, /if \(bi\) \{ contTot\.inchise = JurnalTrade\.din\(bi\);/);   /* v100.278: + inchiseOk */
  assert.match(b, /catch \(e\) \{ if \(!contTot\.inchise\) \{ contTot\.inchise = \[\];/);
  assert.doesNotMatch(te, /if \(!contTot\.inchise && typeof JurnalTrade/);
});

function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [] }) }; }
await test("(4) poza de dimineață: colectorul pune `la`, ruta o păstrează", async () => {
  assert.match(tp, /Object\.assign\(\{ zi: r\.zi, fundingMed: st\.funding \? st\.funding\.mediana : null \}, st\.ult, eu, \{ la: acum \}\)/);
  const TOKEN = "token-de-proba-v100277", env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const la = T("2026-10-30T07:05:00Z");
  const req = new Request("https://exemplu.test/api/istoric-bot?action=piata", { method: "POST", headers: { "cf-connecting-ip": "10.0.2.77", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify({ la, instantaneu: { zi: "2026-10-30", botiTotal: 1, botiPeId: { "2580": 13.56 }, la } }) });
  const r = await m.onRequestPost({ request: req, env });
  assert.equal(r.status, 200);
  const l = JSON.parse(env.ISTORIC.m.get("piata:instantanee"));
  assert.equal(l[0].la, la); assert.deepEqual(l[0].botiPeId, { "2580": 13.56 });
});

// v100.278: de la v100.277 / v101.151 în sus (ca probele vechi), nu exact
await test("versiunile: de la v100.277 în aplicație, de la v101.151 în colector", () => {
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 277, String(app));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 151);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
