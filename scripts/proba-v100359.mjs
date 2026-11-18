// Proba v100.359 (18.11.2026, el: „mai departe?” ⇒ propunerile ⇒ „continuă” = 1–4):
//   (1) raportul de duminică (Discord + pagina): „Greșeala cea mai scumpă” aduna rezultatul boților cu ea (unele definite prin rezultat) ⇒
//       „ce s-a întâmplat” descriptiv; greșeala doar DOVEDITĂ (JurnalDovezi.greseli pe toată istoria, față de boții fără ea din aceeași zi);
//       regula săptămânii fără „doar pe 🟢” (nu bate o blocare la întâmplare, p 0,23); colectorul v101.196 îi dă greșelile;
//   (2) O singură listă și pe Acțiuni (rândul + fișa + notița, ordinea, CSV, „Arată încă”), statistica fără „Toate trade-urile” pe Acțiuni;
//   (3) arhiva boților o dată pentru Acasă + Jurnal (aceeași „la”, cererea în zbor împărțită); contrafactualul cu versiune („neschimbat”);
//   (4) −15% al stopului care urcă = plasă de siguranță, nu „măsurat pe trade-urile tale”.
//   node scripts/proba-v100359.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const A = citeste("public", "app.js"), H = citeste("public", "index.html"), TE = lib("t212-ecran.js"), COL = citeste("scripts", "colector.mjs");
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const inc = src.slice(i - 6, i) === "async " ? i - 6 : i; let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(inc, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.359 · raportul cinstit · lista Acțiuni · rețeaua · plasa stopului\n");

const ctx = { console, Date, Math, JSON, TextRo: globalThis.TextRo }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["grid-calcul.js", "jurnal-trade.js", "grid-proba.js", "probabilitati.js", "semnale-bot.js", "jurnal-dovezi.js"]) { try { vm.runInContext(lib(f), ctx); } catch (e) { /* unele cer alte module - Obiceiuri le primește ca argumente */ } }
const ZI = 86400000, ACUM = Date.UTC(2026, 10, 16, 18);
const bot = (i, o) => Object.assign({ id: "b" + i, moneda: "M" + (i % 4), dir: "long", levier: 2, investit: 100, pus: 100, pornit: ACUM - 3 * ZI - i * 3600000, inchis: ACUM - 2 * ZI, durataOre: 5, jos: 1, sus: 1.2, pretInit: 1.1, grileN: 10, rezultat: -1, grile: 1, pozitie: -2, comisioane: -0.1, funding: 0, net: -1.1, greseli: [] }, o || {});
const Obi = () => { const s = lib("obiceiuri.js"); return new Function("GridCalcul", "GridProba", "JurnalTrade", "Probabilitati", "SemnaleBot", s + "; return Obiceiuri;")(ctx.GridCalcul, ctx.GridProba, ctx.JurnalTrade, ctx.Probabilitati, ctx.SemnaleBot); };

await test("(1) raportul: „ce s-a întâmplat” descriptiv, fără „Greșeala cea mai scumpă”; fără nimic dovedit ⇒ regula nu inventează („doar pe 🟢” scos)", () => {
  const O = Obi(), tr = [bot(1, { greseli: [{ cod: "stop-atins", titlu: "A ieșit din grid", dataViitoare: "dv stop" }] }), bot(2, { greseli: [{ cod: "reintrare", titlu: "Repornit imediat pe aceeași monedă", dataViitoare: "dv re" }] }), bot(3)];
  const r = O.raportDuminica({ trades: tr, acum: ACUM, greseli: { greseli: [{ cod: "reintrare", titlu: "Repornit imediat pe aceeași monedă", verdict: "nedovedit", dif: -0.9, dataViitoare: "dv re" }] } });
  const t = r.linii.join("\n");
  assert.doesNotMatch(t, /Greșeala cea mai scumpă/); assert.match(t, /Ce s-a întâmplat \(boții cu fiecare, net\): „A ieșit din grid” 1 bot/);
  assert.match(t, /Greșelile, pe toată istoria: niciuna nu iese sigur mai scumpă/); assert.doesNotMatch(t, /doar pe 🟢/);
  assert.match(r.regula, /^Regula săptămânii: Aș ține planul de ieșire scris înainte de pornire; nimic nou nu iese dovedit\.$/);
  for (const l of r.linii) assert.ok(l.length <= 160, l.length + ": " + l);
});
await test("(1) raportul: o greșeală DOVEDITĂ (mai-rau) se numește, cu diferența pe bot, și dă regula; fără o.greseli (apelanții vechi) nu se numește nicio greșeală", () => {
  const O = Obi(), tr = [bot(1, { greseli: [{ cod: "reintrare", titlu: "Repornit imediat pe aceeași monedă", dataViitoare: "Aș lăsa măcar o oră." }] })];
  const r = O.raportDuminica({ trades: tr, acum: ACUM, greseli: { greseli: [{ cod: "levier-peste-sigur", titlu: "Levier peste cel sigur", verdict: "mai-rau", dif: -2.4, dataViitoare: "Aș lua levierul propus de fișă." }, { cod: "reintrare", verdict: "nedovedit", dif: -5 }] } });
  assert.match(r.linii.join("\n"), /Greșeala dovedită \(pe toată istoria, față de boții fără ea din aceeași zi\): „Levier peste cel sigur” — −2,4 USDT pe bot/);
  assert.equal(r.regula, "Regula săptămânii: Aș lua levierul propus de fișă.");
  const v = O.raportDuminica({ trades: tr, acum: ACUM }); assert.doesNotMatch(v.linii.join("\n"), /Greșeal/); assert.match(v.regula, /nimic nou nu iese dovedit/);
});
await test("(1) colectorul v101.196: JurnalDovezi încărcat și greșelile pe toată istoria date raportului; pagina la fel (previzualizarea)", () => {
  assert.match(COL, /const JurnalDovezi = incarca\("jurnal-dovezi\.js", "JurnalDovezi"\);/); assert.match(COL, /grD = JurnalDovezi\.greseli\(trades\)/); assert.match(COL, /autopsie: Obiceiuri\.autopsie\(socotealaLoguri, acum\), greseli: grD \}\)/);
  assert.ok(Number((COL.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 196, "colectorul ≥ v101.196");   // v100.360: versiunea exactă o verifică proba ei
  assert.match(A, /Obiceiuri\.raportDuminica\(\{trades:C\.l,acum:Date\.now\(\),greseli:C\.greseli\}\)/);
});
await test("(2) O singură listă pe Acțiuni: rândul + fișa + notița, ordinea, „Cu notițe”, CSV, „Arată încă”; statistica fără „Toate trade-urile” (doar pe „Tot”)", () => {
  const L = fn(TE, "jtT212ListaHtml") + fn(TE, "jtT212Salveaza");
  assert.match(L, /<details class="jtT"/); assert.match(L, /jtT212Ordine\(/); assert.match(L, /jtStatCsv\(\\'actiuni\\'\)/); assert.match(L, /jtT212Mai\(\)/); assert.match(L, /class="jtNota"/); assert.match(L, /t212Lei\(v, 1\)/);
  assert.match(L, /jtNotaSalveaza\(id, t\.value\)/, "ce ai tastat nu se pierde la redesenare");
  assert.doesNotMatch(TE, /l\.slice\(0, 150\)\.map/, "fără tăietura tăcută la 150");
  assert.match(A, /faraToate:piata!=="tot"/); for (const a of ["jtT212Mai", "jtT212Ordine"]) assert.match(A, new RegExp(" " + a + " "), "lista albă: " + a);
  assert.match(fn(TE, "jtRenderActiuni"), /var box = \$\("jtActiuni"\); jtT212Salveaza\(\);/); assert.match(fn(TE, "jtRenderActiuni"), /<div id="jtListaT212">' \+ jtT212ListaHtml\(\) \+ '<\/div><\/details>'/);
});
await test("(3) arhiva o singură dată: două cereri deodată ⇒ un singur getJSON; a doua oară cu „la” ⇒ „neschimbat” păstrează boții; Acasă și Jurnalul o folosesc", async () => {
  const cereri = []; let rasp = null;
  const c = { cereri, Date, getJSON: (u) => { cereri.push(u); return new Promise((r) => { rasp = r; }); } }; vm.createContext(c);
  vm.runInContext(A.match(/var ARH_BOTI=\{[^\n]*\n/)[0] + fn(A, "arhivaBotiAdu") + ";this.f=arhivaBotiAdu;this.ARH=function(){return ARH_BOTI}", c);
  const p1 = c.f(60000), p2 = c.f(60000); assert.equal(cereri.length, 1, "cererea în zbor e împărțită");
  rasp({ boti: [{ strategyId: "1" }], la: 77, complet: true }); await p1; await p2; assert.equal(c.ARH().boti.length, 1);
  await c.f(60000); assert.equal(cereri.length, 1, "proaspătă ⇒ fără cerere");
  const p3 = c.f(0); assert.equal(cereri.length, 2); assert.match(cereri[1], /&la=77$/); rasp({ neschimbat: true, la: 77, complet: true }); await p3; assert.equal(c.ARH().boti.length, 1, "neschimbat ⇒ boții rămân");
  assert.match(fn(A, "scAduArhiva"), /arhivaBotiAdu\(60000\)/); assert.match(fn(A, "jtAduBoti"), /arhivaBotiAdu\(60000\)/);
});
await test("(3) contrafactualul cu versiune: ruta dă „v”; aceeași „v” ⇒ „neschimbat” (fără date), alta ⇒ datele; pagina o trimite și păstrează ce avea", async () => {
  const TOKEN = "t-359", kv = new Map([["contrafactual", JSON.stringify({ b1: { nivel: "nu" } })]]), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "C");
  const cer = (q) => new Request("https://exemplu.test/api/istoric-bot?action=contrafactual" + (q || ""), { headers: { "cf-connecting-ip": "10.0.3.59", authorization: "Bearer " + TOKEN } });
  const a = await (await mod.onRequestGet({ request: cer(), env })).json(); assert.ok(a.v && a.contrafactual.b1);
  const b = await (await mod.onRequestGet({ request: cer("&v=" + a.v), env })).json(); assert.equal(b.neschimbat, true); assert.ok(!b.contrafactual);
  kv.set("contrafactual", JSON.stringify({ b1: { nivel: "porneste" } }));
  const c = await (await mod.onRequestGet({ request: cer("&v=" + a.v), env })).json(); assert.notEqual(c.v, a.v); assert.equal(c.contrafactual.b1.nivel, "porneste");
  const po = fn(A, "jtPorneste"); assert.match(po, /action=contrafactual"\+\(jtStare\.cfV&&jtStare\.cf\?"&v="/); assert.match(po, /if\(cf\.ok&&cf\.v&&cf\.v\.neschimbat\)\{\}else\{jtStare\.cf=/);
});
await test("(4) −15% al stopului care urcă: „plasă de siguranță, nedovedită”, nu „măsurat pe trade-urile tale”", () => {
  const AS = lib("actiuni-semnale.js"); assert.doesNotMatch(AS, /\(măsurat pe trade-urile tale\)/); assert.equal(AS.split("(plasă de siguranță, nedovedită pe trade-urile tale)").length - 1, 2);
});
await test("V versiunile de la v100.359 încolo (v100.360: versiunea curentă o verifică proba ei); colectorul ≥ v101.196", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 359 && nr(citeste("public", "sw.js")) >= 359 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 359);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 359); assert.match(p.scripts.test, /npm run test:v100358 && npm run test:v100359/);
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(bi.raport359 && bi.jurnal358);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 196);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
