// Proba v100.358 (18.11.2026, el: „în Radar, Jurnal de trade, fă la fel ca în celelalte pagini: audit, layout, design, optimizări, grafice noi,
// statistici; întâi demo, după livrăm” ⇒ auditul sever (2 revizori) ⇒ hotărârile LUI: greșelile + regulile refăcute cinstit, graficele noi,
// așezarea paginilor refăcute, notițele pe server). Aici: pagina (app.js / index.html / app.css / ruta); modulele au probele lor
// (proba-v100358-dovezi.mjs, proba-v100358-t212.mjs).
//   🔴 Pionex picat ⇒ arhiva aruncată, Jurnalul gol ⇒ arhiva rămâne rezervă, eroarea spusă sus, boții vechi păstrați la o reîmprospătare picată;
//   🔴 lista „Fiecare trade” pe BRUT (70 de boți cu semnul greșit) ⇒ O singură listă, pe NET;
//   🟡 scorul din Jurnal lua sezonul doar prin Acasă ⇒ jtPorneste cheamă scAsigura; 🟡 raportul necitit ≠ „primul raport vine duminică”;
//   🟡 două totaluri net sus ⇒ unul, cu împărțirea futures / spot-copy spusă; notițele pe server (aceleași pe telefon și PC).
//   node scripts/proba-v100358.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const A = citeste("public", "app.js"), H = citeste("public", "index.html"), CSS = citeste("public", "app.css");
const fn = (nume) => { const i = A.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = A.indexOf("\nfunction ", i + 10), k = A.indexOf("\nasync function ", i + 10), l = A.indexOf("\nvar ", i + 10); return A.slice(i, Math.min(...[j, k, l].filter((x) => x > 0))); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.358 · Jurnalul de trade ca paginile refăcute\n");

await test("ruta jtNote: unește notițele pe id (câștigă cea scrisă mai târziu), ștearsă = text gol, refuză formele greșite", async () => {
  const TOKEN = "t-358", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "N");
  const cer = (corp, m) => new Request("https://exemplu.test/api/istoric-bot?action=jtNote", { method: m || "POST", headers: { "cf-connecting-ip": "10.0.3.58", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: m === "GET" ? undefined : JSON.stringify(corp) });
  let r = await mod.onRequestGet({ request: cer(null, "GET"), env }); assert.deepEqual((await r.json()).note, {}, "fără nimic ⇒ listă goală");
  r = await mod.onRequestPost({ request: cer({ note: { "123": { t: "de pe telefon", m: 10 }, "t212-9": { t: "acțiune", m: 5 } } }), env }); assert.equal(r.status, 200);
  r = await mod.onRequestPost({ request: cer({ note: { "123": { t: "mai veche, de pe PC", m: 3 }, "456": { t: "", m: 20 } } }), env });
  const j = await r.json(); assert.equal(j.note["123"].t, "de pe telefon", "cea mai nouă rămâne"); assert.equal(j.note["456"].t, "", "ștearsă ține minte m"); assert.equal(j.note["t212-9"].t, "acțiune");
  r = await mod.onRequestPost({ request: cer({ note: { "123": { t: "a doua oară", m: 30 }, "<script>": { t: "x", m: 99 }, "789": { t: 5, m: 1 } } }), env });
  const k = await r.json(); assert.equal(k.note["123"].t, "a doua oară"); assert.ok(!k.note["<script>"], "id ciudat refuzat"); assert.ok(!k.note["789"], "text care nu e șir refuzat");
  r = await mod.onRequestPost({ request: cer({ note: ["rău"] }), env }); assert.equal(r.status, 400);
  r = await mod.onRequestPost({ request: cer({ note: { "1": { t: "x".repeat(5000), m: 40 } } }), env }); assert.equal((await r.json()).note["1"].t.length, 1000, "≤ 1000 de semne");
  assert.match(citeste("functions", "_shared", "plafon-corp.js"), /jtNote: 524288/);
});
await test("🔴1 Pionex picat ⇒ arhiva rămâne (null doar fără amândouă); reîmprospătarea picată păstrează boții; antetul și „Reîncearcă”", () => {
  const ad = fn("jtAduBoti"); assert.match(ad, /if\(!p&&!jtArhiva\.boti\)return null;/); assert.doesNotMatch(ad, /if\(!p\)return null;/); assert.match(ad, /jtStare\.pionexEroare=/);
  const po = fn("jtPorneste"); assert.match(po, /if\(bNoi\)\{jtStare\.boti=bNoi;jtStare\.eroare=null;jtStare\.citit=Date\.now\(\)\}else jtStare\.eroare=/); assert.match(po, /if\(jtStare\.citit\)jtStare\.la=jtStare\.citit;/, "revizia G3: ora datelor, nu a încercării"); assert.doesNotMatch(po, /jtStare\.boti=await jtAduBoti\(\)/);
  assert.match(po, /scAsigura\("pionex",false\)/, "🟡 scorul își ia singur sezonul"); assert.match(po, /jtNoteSync\(\)/);
  assert.match(fn("jtFrazaRender"), /data-action-click="jtReincearca\(\)"/); assert.match(A, / jtReincearca /, "în lista albă");
});
await test("🔴2 O singură listă, pe NET (nu brut); fișa la clic; ordinea, „Cu notițe”, CSV și „Arată încă”; ora României", () => {
  const li = fn("jtListaRender");
  assert.match(li, /var net=function\(t\)\{return t\.net!=null\?t\.net:t\.rezultat\}/); assert.match(li, /jtU\(n\)/); assert.doesNotMatch(li, /U\(t\.rezultat\)\+\(t\.pct/);
  assert.match(li, /<details class="jtT"/); assert.match(li, /jtListaOrdine\(/); assert.match(li, /jtStatCsv\(\\'crypto\\'\)/); assert.match(li, /jtArataMai\(\)/); assert.match(li, /class="jtNota"/);
  assert.match(A, /var JT_TZ="Europe\/Bucharest"/); assert.match(fn("jtData"), /timeZone:JT_TZ/);
  assert.match(A, /faraToate:piata!=="tot"/, "„Toate trade-urile” nu se mai dublează pe Crypto (v100.359: nici pe Acțiuni)");
  assert.match(A, /function jtArataMai\(\)\{jtStare\.arata=\(jtStare\.arata\|\|30\)\+30;if\(jtStare\.boti\)jtListaRender\(jtCalc\(\)\)\}/);
});
await test("🟡 un net sus: tot (futures + spot/copy), cu împărțirea spusă; raportul necitit ≠ „încă n-a venit”", () => {
  const r = fn("jtRender"); assert.match(r, /var tot=r\.net\+C\.alteNet;/); assert.match(r, /spot \/ copy/);
  const rp = fn("jtRapoarteRender"); assert.match(rp, /else if\(R===undefined\)rap\.innerHTML=cap\+'<p class="tbWarn">N-am putut citi raportul de duminică/);
});
await test("notițele: {id:{t,m}} în jtNote2, mutate o dată din jtNote (m=1, pierd în fața serverului), coada nu pierde ce se scrie în timpul trimiterii", () => {
  assert.match(fn("jtNoteToate"), /localStorage\.getItem\("jtNote"\)/); assert.match(fn("jtNoteToate"), /m:1\}/);
  assert.match(fn("jtNoteTrimite"), /jtNoteSrv\.coada=Object\.assign/); assert.match(fn("jtNotaSalveaza"), /m:Date\.now\(\)/);
});
await test("așezarea: tema zi / noapte (RADACINI, tbTemaAplica, tema devreme, buton), fraza + „De unde știu”, rândurile pliate, antetul vechi ascuns", async () => {
  const { RADACINI } = await import(pathToFileURL(path.join(RAD, "scripts", "face-tema-tablou.mjs")).href);
  assert.ok(RADACINI.includes("jurnaltrade"));
  assert.match(A, /"montecarlo","jurnaltrade","comportament","tradezilei"\]\.forEach\(function\(id\)\{var p=document\.getElementById\(id\);if\(p\)p\.classList\.toggle\("tbZi",zi\)\}\)/); assert.match(A, /"mcTemaBtn","jtTemaBtn","coTemaBtn","tzTemaBtn"\]/);
  assert.match(citeste("public", "lib", "tema-devreme.js"), /"montecarlo", "jurnaltrade", "comportament", "tradezilei"\]/);
  assert.match(H, /id="jtTemaBtn"/); assert.match(H, /id="jtFrazaBox"/); assert.match(H, /<script src="\/lib\/scor-sezon\.js"><\/script><script src="\/lib\/jurnal-dovezi\.js"><\/script><script src="\/lib\/jurnal-grafice\.js"><\/script>/);
  assert.match(citeste("public", "sw.js"), /"\/lib\/jurnal-dovezi\.js","\/lib\/jurnal-grafice\.js"/);
  for (const id of ["jtScor", "jtGraficeCard", "jtStatCrypto", "jtCireasaCard", "jtRapoarteCard", "jtReguliCard", "jtGreseliCard"]) { assert.match(A, new RegExp(id + ':"'), "JT_RANDURI " + id); assert.equal(H.split('id="' + id + '"').length, 2, "un singur " + id); }
  assert.match(A, /if\(typeof JT_RANDURI!=="undefined"&&Object\.prototype\.hasOwnProperty\.call\(JT_RANDURI,id\)\)return jtRandComuta\(id,deschis\);/);
  assert.match(CSS, /html\.pzDemo #jurnaltrade \[data-rand="pliat"\]>\*\{display:none!important\}/);
  assert.match(CSS, /html:has\(:is\(#tabloubot,#t212,#dash,#rangefilter,#sugestii,#probe,#gridset,#gridsim,#montecarlo,#jurnaltrade,#comportament,#tradezilei\)\.on\.tbZi\) body\{background:#F2F4F7!important\}/);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /function pagJurnal\(\) \{ antet\("pzV-jt", null, null\); \}/);
  for (const a of ["jtListaOrdine", "jtRaportAlege", "jtRaportFel", "jtReincearca"]) assert.match(A, new RegExp(" " + a + " "), "lista albă: " + a);
});
await test("graficele primesc lățimea reală (o.lat) și se redesenează la rotire; capul fiecărui grafic spune ce arată", () => {
  const g = fn("jtGraficeRender"); assert.match(g, /G\.curbaZile\(C\.zile,\{lat:W\}\)/); assert.match(g, /G\.calendar\(C\.zile,\{lat:W\}\)/); assert.match(g, /G\.stivuitLuna\(C\.luni,\{lat:W\}\)/);
  for (const t of ["Curba pe zile", "Calendarul zilelor", "Câți boți pornești pe zi", "Pareto", "Pe lună: grile, poziție, costuri", "Lățimea intervalului", "Levierul"]) assert.ok(g.includes(t), t);
  assert.match(A, /window\.addEventListener\("resize",function\(\)\{clearTimeout\(jtLatGr\)/);
});
await test("V versiunile de la v100.358 încolo; colectorul ≥ v101.195", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);   // v100.359: versiunea curentă o verifică proba ei
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 358 && nr(citeste("public", "sw.js")) >= 358 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 358);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 358); assert.match(p.scripts.test, /npm run test:v100357 && npm run test:v100358/);
  assert.ok(JSON.parse(citeste("BUILD_INFO.json")).jurnal358);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 195);
});
// ---- probe de COMPORTAMENT (revizia Opus a diff-ului, G7: înainte erau doar pe forma codului) ----
import vm from "node:vm";
const lib = (f) => citeste("public", "lib", f);
function lume(extra) {
  const el = {}, $ = (id) => (el[id] = el[id] || { id, innerHTML: "", textContent: "", clientWidth: 900, querySelector: () => null, querySelectorAll: () => [], insertAdjacentHTML(p, h) { this.innerHTML += h; } });
  const ctx = Object.assign({ console, Date, Math, JSON, Number, String, Object, Array, isFinite, Intl, $, window: { innerWidth: 1440 }, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), jtStare: { boti: [1], raport: null, raportPiata: null }, Obiceiuri: { raportDuminica: () => ({ linii: [] }) } }, extra || {});
  ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ["grid-calcul.js", "jurnal-trade.js", "jurnal-dovezi.js"]) vm.runInContext(lib(f), ctx);
  vm.runInContext('var JT_TZ="Europe/Bucharest";var jtVedere={ordine:"noi",deschise:{},raportFel:"saptamana",raportDe:null};' + ["jtParetoK", "jtU", "jtCls", "jtPct", "jtData", "jtOra", "jtNr", "jtZiRo", "jtRapoarteRender", "jtGraficeRender"].map(fn).join("\n"), ctx);
  return { ctx, el };
}
const ZI = 86400000, T0 = Date.UTC(2026, 8, 1, 9);
const botiProba = Array.from({ length: 120 }, (_, i) => ({ id: "b" + i, moneda: ["AAA", "BBB", "CCC"][i % 3], dir: i % 2 ? "long" : "short", levier: 1 + (i % 5), investit: 100, pus: 100, pornit: T0 + Math.floor(i / 3) * ZI, inchis: T0 + Math.floor(i / 3) * ZI + 3600000, durataOre: 1, jos: 1, sus: 1.1 + (i % 4) * 0.1, pretInit: 1.05, grileN: 10, rezultat: (i % 7) - 3, grile: 1, pozitie: (i % 7) - 4, comisioane: -0.2, funding: 0, net: (i % 7) - 3.2, greseli: [] }));
await test("🔴 R1 rapoartele: perioada aleasă din listă (valoarea vine ca ȘIR) chiar se arată", () => {
  const { ctx, el } = lume(); const per = ctx.JurnalDovezi.perioade(botiProba, "saptamana"); assert.ok(per.length >= 4);
  ctx.jtVedere.raportDe = String(per[3].de);   // ca din <select>: this.value e text
  ctx.jtRapoarteRender({ l: botiProba });
  const h = el.jtRapoarte.innerHTML; assert.ok(h.includes("<th>" + per[3].et + "</th>"), "tabelul e pe perioada aleasă, nu pe prima"); assert.match(h, new RegExp('value="' + per[3].de + '" selected'));
});
await test("🟡 G1 graficele cu bare primesc „puține” și intervalul pe zile (nu doar {et, v, n, zile})", () => {
  const prinse = []; const { ctx } = lume({ JurnalGrafice: { curbaZile: () => "", calendar: () => "", pareto: () => "", stivuitLuna: () => "", bare: (r) => { prinse.push(r); return ""; } } });
  const D = ctx.JurnalDovezi, C = { l: botiProba, zile: D.peZile(botiProba), botiZi: D.botiPeZi(botiProba), pareto: D.pareto(botiProba), luni: D.peLuna(botiProba), latime: D.peLatime(botiProba), levier: D.peLevier(botiProba) };
  ctx.jtGraficeRender(C); assert.equal(prinse.length, 3);
  for (const r of prinse) for (const x of r) { assert.ok("putine" in x, "putine lipsește: " + JSON.stringify(x)); assert.ok("ic" in x, "ic lipsește"); }
  assert.ok(prinse.some((r) => r.some((x) => x.putine === true)), "pe 120 de boți în 40 de zile unele găleți sunt „puține”");
});
console.log(`\n${teste - picate}/${teste} ok`);
process.exit(picate ? 1 : 0);
