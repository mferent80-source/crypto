// Proba v100.366 (19.11.2026, el: „mai departe?” ⇒ „Ideile T212 cinstite” ⇒ „Spun cinstit + avertisment”): măsurat pe ideile reale de pe viu
// (25.09–19.11): la 20 de zile −22,3 % față de Nasdaq-100 −2,9 % în aceleași zile, 0 din 28 de zile peste piață, un singur episod (cipuri / hardware).
//  U - Idei.urmarireZi: fiecare zi de idee față de universul din ACEEAȘI zi, la 20 de zile de bursă (intrarea = ultima închidere ÎNAINTE de zi),
//      media pe zile, intervalul pe blocuri de 28 de zile, sub 4 blocuri = „un episod”; concentrarea pe nume; textul
//  C - colectorul o socotește pe barele aduse deja pentru idei (Nasdaq-100 = reperul) și o trimite; ruta o păstrează curățată
//  P - pagina T212: avertismentul roșu (pe viu, sau cifrele măsurate 19.11 până la prima tură), graficul pe zile, concentrarea; rândul ideii fără
//      „+Z % în medie”; socoteala veche păstrată, spusă ca atare
//   node scripts/proba-v100366.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
vm.runInThisContext(citeste("public", "lib", "idei.js"), { filename: "idei.js" });
const I = globalThis.Idei, ZI = 86400000, T0 = Date.UTC(2026, 8, 1, 20);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.366 · ideile T212 cinstite\n");

// 60 de tickere de univers, 2 „idei” care pierd câte 0,5 % pe zi față de univers; 120 de zile de bursă
const zi = (k) => new Date(T0 + k * ZI).toISOString().slice(0, 10);
function lume(pierdere) {
  const bare = {};
  for (let u = 0; u < 60; u++) bare["U" + u + "_US_EQ"] = Array.from({ length: 120 }, (_, k) => ({ t: T0 + k * ZI, c: 100 * (1 + 0.001 * k) * (1 + 0.01 * Math.sin(k / 3 + u)) }));
  for (const s of ["A", "B"]) bare[s + "_US_EQ"] = Array.from({ length: 120 }, (_, k) => ({ t: T0 + k * ZI, c: 100 * (1 + 0.001 * k) * Math.pow(1 - pierdere, k) }));
  const ist = []; for (let k = 5; k < 90; k++) ist.push({ zi: zi(k), ticker: k % 3 ? "A_US_EQ" : "B_US_EQ", simbol: k % 3 ? "A" : "B", pret: bare[(k % 3 ? "A" : "B") + "_US_EQ"][k - 1].c });
  return { bare, ist, univ: Object.keys(bare).filter((t) => t[0] === "U") };
}
await test("U urmarireZi: ideile care pierd față de univers ⇒ exces negativ pe 20 de zile, pe fiecare zi; intrarea = închiderea de dinainte de zi", () => {
  const L = lume(0.005), u = I.urmarireZi(L.ist, (t) => L.bare[t], L.univ, { h: 20 });
  assert.equal(u.h, 20); assert.ok(u.zile >= 60, String(u.zile)); assert.ok(u.medie < -0.08 && u.medie > -0.12, String(u.medie));
  assert.ok(u.ideiMedie < u.univMedie); assert.equal(u.pePlus, 0); assert.ok(u.blocuri >= 3); assert.ok(u.lo != null && u.hi < 0);
  assert.equal(u.deLa, zi(5)); assert.ok(Array.isArray(u.serie) && u.serie.length === u.zile && u.serie.every((x) => x.t > 0 && Number.isFinite(x.dif) && x.n >= 1));
  assert.deepEqual(u.top.map((x) => x.s), ["A", "B"]); assert.ok(u.top[0].n > u.top[1].n);
});
await test("U urmarireZi: fără diferență față de univers ⇒ ~0; sub 4 blocuri ⇒ „un-episod” (cifrele rămân, verdictul nu se dă); fără idei judecabile ⇒ zile 0", () => {
  const L = lume(0), u = I.urmarireZi(L.ist, (t) => L.bare[t], L.univ, { h: 20 }); assert.ok(Math.abs(u.medie) < 0.02, String(u.medie));
  const scurt = lume(0.005); scurt.ist = scurt.ist.slice(0, 20); const v = I.urmarireZi(scurt.ist, (t) => scurt.bare[t], scurt.univ, { h: 20 });
  assert.ok(v.blocuri < 4, String(v.blocuri)); assert.equal(v.verdict, "un-episod"); assert.ok(v.medie < 0);
  const g = I.urmarireZi([{ zi: zi(118), ticker: "A_US_EQ", pret: 1 }], (t) => L.bare[t], L.univ, { h: 20 }); assert.equal(g.zile, 0); assert.equal(g.medie, null);
});
await test("U textUrmarireZi: spune de când, orizontul, ideile față de reper, câte zile peste, câte blocuri; „un singur episod” cinstit; procente cu spațiu", () => {
  const L = lume(0.005); L.ist = L.ist.slice(0, 20); const t = I.textUrmarireZi(I.urmarireZi(L.ist, (x) => L.bare[x], L.univ, { h: 20 }));
  assert.match(t, /Pe viu, din 06\.09/); assert.match(t, /la 20 de zile de bursă/); assert.match(t, /Nasdaq-100/); assert.match(t, /în 0 din \d+ (de )?zile de bursă/); assert.match(t, /un singur episod/); assert.doesNotMatch(t, /\d%/);
});

// ---------------- (C) colectorul + ruta ----------------
await test("C colectorul: urmarireZi pe barele aduse pentru idei, reperul Nasdaq-100, trimisă cu ideile; colector v101.203", () => {
  const c = citeste("scripts", "colector.mjs"), f = c.slice(c.indexOf("async function turaIdeiZi()"), c.indexOf("async function turaIdeiZi()") + 9000);
  assert.match(f, /let urmZi = null; try \{ const urmZi0 = Idei\.urmarireZi\(id && Array\.isArray\(id\.istoric\) \? id\.istoric : \[\], \(tk\) => bareIdei\.get\(tk\), NDX\.map\(\(x\) => x \+ "_US_EQ"\), \{ h: 20 \}\)/);
  assert.match(f, /urmarire: urm, urmarireZi: urmZi,/); assert.ok(Number((c.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 203, "colector de la v101.203 încolo");
});
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40);
await test("C ruta: action=idei păstrează urmarireZi curățată (cifre, serie ≤ 150, top ≤ 8, text ≤ 400), fără HTML", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, mod = await import(`../functions/api/t212.js?t=${Date.now()}`);
  const u = { h: 20, zile: 28, judecate: 123, medie: -0.194, lo: -0.359, hi: -0.029, blocuri: 2, verdict: "un-episod", pePlus: 0, ideiMedie: -0.223, univMedie: -0.029, deLa: "2026-09-25", panaLa: "2026-10-22",
    serie: Array.from({ length: 200 }, (_, k) => ({ t: T0 + k * ZI, dif: -0.1, n: 3, rau: "<b>" })), top: Array.from({ length: 12 }, (_, k) => ({ s: "S<" + k, n: 12 - k })), text: "<script>x</script> Pe viu" };
  const h = { "cf-connecting-ip": "10.0.8.1", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" };
  const r = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/t212?action=idei", { method: "POST", headers: h, body: JSON.stringify({ la: Date.now(), zi: "2026-11-19", actiuni: [], restul: [], urmarire: { n: 1, pePlus: 0, medie: -0.2, text: "x" }, urmarireZi: u }) }), env });
  assert.equal(r.status, 200, await r.text()); const s = JSON.parse(env.ISTORIC.m.get("t212:idei")).urmarireZi;
  assert.equal(s.medie, -0.194); assert.equal(s.verdict, "un-episod"); assert.equal(s.serie.length, 150); assert.deepEqual(Object.keys(s.serie[0]).sort(), ["dif", "n", "t"]); assert.equal(s.top.length, 8);
  assert.doesNotMatch(JSON.stringify(s), /<|>/); assert.equal(s.deLa, "2026-09-25");
});

// ---------------- (P) pagina T212 ----------------
const t212 = citeste("public", "lib", "t212-ecran.js");
await test("P pagina: avertismentul roșu deasupra ideilor (urmarireZi pe viu sau cifrele măsurate 19.11), graficul pe zile, concentrarea; socoteala veche păstrată ca atare", () => {
  assert.match(t212, /function t212IdeiAvertHtml\(id\)/); assert.match(t212, /T212_IDEI_MASURAT = \{ "la":"19\.11\.2026"/);
  assert.match(t212, /fIdei = t212IdeiAvertHtml\(id\) \+ '<p class="tbSub t212IdeiNota">/); assert.match(t212, /socoteala veche, de la prețul ideii până azi, fără reper/);
  assert.match(t212, /typeof CnGrafice !== "undefined" \? CnGrafice : null/); assert.match(t212, /G\.blocuri\(u\.serie, u, \{ lat: lat, eticheta: "Ideile față de Nasdaq-100/);
  assert.equal(globalThis.Idei.textUrmarireZi({ zile: 0, h: 20 }).includes("prima judecată"), true);
});
await test("P rândul ideii: „pe istoricul ei, în trendul de acum: N % pe plus în 20 de zile (~K cazuri independente, cifră optimistă)” - fără „+Z % în medie”", () => {
  assert.match(t212, /function t212IdeiIstoric\(x\)/); assert.match(t212, /escapeHtml\(t212IdeiIstoric\(x\)\)/); assert.doesNotMatch(t212, /escapeHtml\(\(x\.motive \|\| \[\]\)\[2\] \|\| ""\)/);
});
await test("P desenat (pagina T212 în vm): fără tură nouă ⇒ cifrele măsurate 19.11 + nota; cu urmarireZi pe viu ⇒ ale ei; graficul; rândul ideii fără „în medie”", () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.escapeHtml = (s) => String(s == null ? "" : s).replace(/</g, "&lt;"); ctx.localStorage = { getItem() { return null; }, setItem() {} }; ctx.$ = () => null;
  ctx.ActiuniSemnale = { usd(v) { return "$" + v; }, monedaTicker() { return "USD"; }, pretIn(v) { return "$" + v; } }; ctx.T212 = { simbol(t) { return String(t).replace(/_US_EQ$/, ""); }, perechi() { return { inchise: [] }; } };
  vm.createContext(ctx); for (const f of ["idei.js", "carnet-grafice.js", "macro.js", "salt-ecran.js", "t212-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
  const a = ctx.t212IdeiAvertHtml({ urmarire: { text: "vechi" } });
  assert.match(a, /tbWarn t212IdeiAvert/); assert.match(a, /Pe viu, din 25\.09, la 20 de zile de bursă: ideile −21,7 %, Nasdaq-100 −2,8 %/); assert.match(a, /Măsurat pe 19\.11\.2026/); assert.match(a, /LITE \(12 zile\)/); assert.match(a, /<svg/); assert.doesNotMatch(a, /NaN|undefined/);
  const L = lume(0.005), u = I.urmarireZi(L.ist, (t) => L.bare[t], L.univ, { h: 20 }), b = ctx.t212IdeiAvertHtml({ urmarireZi: u });
  assert.doesNotMatch(b, /Măsurat pe 19\.11\.2026/); assert.match(b, /Pe viu, din 06\.09/); assert.match(b, /<svg/);
  assert.equal(ctx.t212IdeiIstoric({ pePlusProba: 0.899, nProba: 139, motive: ["a", "b", "pe istoricul ei, intrările în starea asta: 90% pe plus, +6,1% în medie (139 de zile)"] }), "pe istoricul ei, în trendul de acum: 90 % pe plus în 20 de zile (~7 cazuri independente, cifră optimistă)");
  assert.doesNotMatch(ctx.t212IdeiIstoric({ motive: ["a", "b", "pe istoricul ei, intrările în starea asta: 90% pe plus, +6,1% în medie (139 de zile)"] }), /în medie/);
});
await test("V versiunile de la v100.366 încolo (v100.367: versiunea curentă o verifică proba ei)", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 366 && nr(citeste("public", "sw.js")) >= 366);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 366); assert.match(p.scripts.test, /npm run test:v100365 && npm run test:v100366/); assert.equal(p.scripts["test:v100366"], "node scripts/proba-v100366.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(nr(bi.badge) >= 366); assert.ok(bi.ti366 && bi.sl365);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
