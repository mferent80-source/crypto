// Proba v100.102 / colector v101.71 (05.10, el: „chestia asta cu planul e cam ambiguă în app” → propunerea aprobată cu „da”):
// „planul” venea din 4 surse (poarta, Scan, botul tău cel mai nou, propunerea mea) și se numea peste tot „planul tău”; capul ÎNGUST/LARG
// repeta sumele în paranteze puse una în alta („… (+2,2 / −6,5 USDT / 12 h, aceleași sume))”); planul botului ACTIV nu se scala pe suma
// fișei (suma se căuta doar printre boții închiși), iar „cât planul” însemna doar pragul de pierdere.
// (1) propunePlan: sursa spusă clar, scalarea spusă · (2) pagina caută suma și printre boții activi · (3) rândul „Planul de ieșire folosit”
// (4) „pragul de pierdere” în loc de „planul” (ferestre, poartă, Alte setări, Tablou, Discord) · (E) versiunile. Depozit PUBLIC ⇒ cifre construite.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.GridProba = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
const GP = new Function(`${lib("grid-plan.js")}; return GridPlan;`)();
const TE = new Function(`${lib("tablou-extra.js")}; return TabloExtra;`)();
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.102 · colector v101.71 · planul spus fără ambiguitate");

await test("(1) propunePlan: planul botului tău, scalat pe suma de aici - sursa și scalarea într-o frază, fără paranteze în paranteze", () => {
  const p = TE.propunePlan({ plus: 2, minus: 6, afaraOre: 12, investit: 40, nume: "ABC" }, 100);
  assert.deepEqual([p.plus, p.minus, p.afaraOre], [5, 15, 12]);
  assert.equal(p.nota, "luat de la botul tău ABC: +2 / −6 USDT pe 40 USDT, scalat la 100 USDT");
  assert.equal(TE.propunePlan({ plus: 2, minus: 6, investit: 100, nume: "ABC" }, 100).nota, "luat de la botul tău ABC, pe aceeași sumă (100 USDT)");
  const n = TE.propunePlan({ plus: 2, minus: 6 }, 100);
  assert.deepEqual([n.plus, n.minus], [2, 6]); assert.equal(n.nota, "luat de la botul tău de dinainte; suma lui n-o știu, deci nescalat: verifică cifrele");
  assert.equal(TE.propunePlan(null, 100).nota, "propunerea mea: +3% / −15% din investiție / 12 h afară din grid", "propunerea mea rămâne (o citește și Discordul)");
});
await test("(2) pagina caută suma botului cel mai nou și printre boții ACTIVI (azi planul era al botului care rulează ⇒ nescalat)", () => {
  const f = fnApp("grPlanUltim");
  assert.match(f, /getJSON\("\/api\/bot-orders"\)/, "nu cere boții activi"); assert.match(f, /getJSON\("\/api\/bot-orders\?status=finished&limit=30"\)/);
});
const ctxHtml = () => { const c = { GridPlan: GP, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), grRand: (a, b) => "<r>" + a + ": " + b + "</r>", grPret: (v) => String(v) }; vm.createContext(c); vm.runInContext(fnApp("grPlanVarHtml") + ";this.f=grPlanVarHtml;", c); return c; };
const VAR = (cum, lev) => ({ dir: "long", cum, jos: 0.9, sus: 1.05, grile: 10, pas: 0.003, levier: lev, d: 0.1, u: 0.05, stop: { jos: 0.899, sus: 1.051 }, lichidare: { jos: lev > 1 ? 0.8 : null, sus: null }, laStop: -6.5, laTinta: 2.2, suma: 100,
  proba: { n: 100, stop: lev > 1 ? 50 : 20, tinta: 40, inGrid: 10, mediaUsdt: -0.5, oreTipic: 3, zile: 30, ferestreZile: 3, independente: 10 } });
await test("(3) capul ÎNGUST/LARG: pierderea la stop spusă cu cifra („pragul tău de pierdere”) + un rând „Planul de ieșire folosit” cu cele trei cifre și sursa", () => {
  const pv = { ta: VAR("x", 5), mea: VAR("y", 1), plan: { plus: 2.2, minus: 6.5, afaraOre: 12 }, nota: "luat de la botul tău ABC: +1 / −3 USDT pe 46 USDT, scalat la 100 USDT", amp: 0.1 };
  const h = ctxHtml().f(pv, null, "");
  assert.match(h, /la stop pierzi cel mult −6,5 USDT, pragul tău de pierdere/);
  assert.match(h, /<b>Planul de ieșire folosit:<\/b> ies pe plus la \+2,2 · ies dacă pierd −6,5 · ies dacă stă afară 12 h/);
  assert.match(h, /luat de la botul tău ABC: \+1 \/ −3 USDT pe 46 USDT, scalat la 100 USDT/);
  assert.doesNotMatch(h, /cât planul|\(\s*[^()]*\([^()]*\)\s*\)\)/, "fără „cât planul” și fără paranteze în paranteze");
  assert.doesNotMatch(ctxHtml().f(Object.assign({}, pv, { plan: { plus: 2.2, minus: 6.5 } }), null, ""), /stă afară/, "fără ore ⇒ fără bucata cu orele");
  assert.match(GP.variante.toString(), /afaraOre: nr\(plan\.afaraOre\)/, "orele planului ajung în ferestre");
});
await test("(4) „pragul de pierdere” în loc de „planul”: ferestrele (cum), motivele LARG, poarta, Alte setări, Tablou, Discord", () => {
  const g = lib("grid-plan.js"); assert.doesNotMatch(g, /"[^"\n]*(cât planul|banda planului|levierul din plan)[^"\n]*"/);
  assert.match(g, /"levierul tău, banda cât îți permite pragul de pierdere"/);
  const m = GP.motive({ dir: "long", d: 0.0838, u: 0.0976, levier: 1, proba: { n: 109, stop: 24, inGrid: 26, oreTipic: 28 }, lichidare: { jos: null } }, "mea", 0.111);
  assert.equal(m.da[0], "ține −8,4% / +9,8% fără să iasă (o zi obișnuită e ±11,1%; strânsă ca la stop să nu treci de pragul de pierdere)");
  const po = fnApp("grPoartaGrid"); assert.match(po, /pragul tău de pierdere e −/); assert.doesNotMatch(po, /planul tău e|rămâi în plan|planul −/);
  const rg = fnApp("renderGrid"); assert.match(rg, /Nu ține cont de pragul tău de pierdere:/); assert.doesNotMatch(rg, /Nu ascultă de planul tău|× planul de/);
  const tb = fnApp("tbGridLargRender"); assert.match(tb, /propunerea mea, −15% din sumă: botul n-are plan scris/); assert.match(tb, /pragul de pierdere −/); assert.doesNotMatch(tb, /planul obișnuit|Stopul planului/);
  const d = MC.gridPreaLarg("ABC", { laMargine: 24.9, procent: 0.62, parte: "jos", plan: 6.5, stopPlan: 0.0614, moarte: 22, intervale: 49 });
  assert.match(d.mesaj, /pragul de pierdere −6,5; cu stopul la prag, 22 din 49 de grile n-ar lucra\./); assert.doesNotMatch(d.mesaj, /planul/);
  assert.match(fnApp("grPlanDinScan"), /"luat de la botul tău "\+g\.nume\+" \(din Scan\): \+"/);
});
await test("(5) poza 05.10: LARG încape într-o zi întreagă ⇒ pierde la stop MAI PUȚIN (−8,5) decât ÎNGUST (−15,3): capul spune „cel mult”, alegerea dă ambele pierderi", () => {
  const ta = Object.assign(VAR("x", 5), { laStop: -15.3 }), mea = Object.assign(VAR("y", 1), { laStop: -8.5 });
  ta.proba = Object.assign({}, ta.proba, { stop: 42, n: 109, mediaUsdt: -0.5 }); mea.proba = Object.assign({}, mea.proba, { stop: 15, n: 109, mediaUsdt: 0.7 });
  const a = GP.alege(ta, mea); assert.equal(a.cine, "mea");
  assert.match(a.text, /^LARG · la stop pierzi −8,5 USDT față de −15,3 USDT la ÎNGUST, stopul atins de 15 ori din 109 porniri, față de 42/); assert.doesNotMatch(a.text, /aceeași pierdere/);
  assert.match(GP.alege(VAR("x", 5), VAR("y", 1)).text, /aceeași pierdere la stop \(−6,5 USDT\)/, "egale ⇒ rămâne „aceeași”");
  const h = ctxHtml().f({ ta, mea, plan: { plus: 5.2, minus: 15.3, afaraOre: 12 }, nota: "", amp: 0.1 }, null, "");
  assert.match(h, /la stop pierzi cel mult −15,3 USDT, pragul tău de pierdere/);
});
await test("(E) versiunile v100.102 / colector v101.71", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.1(0[2-9]|[1-9]\d)$/); const V2 = bi.version; assert.ok(bi.badge.startsWith(V2 + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V2 + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V2.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V2.replace(".", "\\.") + "(?!\\d)", "g")) || []).length, 4);
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V2.slice(1) + ".0"); assert.ok(/npm run test:v100101 && npm run test:v100102( && |")/.test(pk));
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(7[1-9]|[89]\d)";/);
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
