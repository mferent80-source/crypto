// Probele auditului din 19.10.2026, felia ECRANULUI (el: „fă tot” pe constatările auditului).
//  1. zecimalele: TextRo.usdt implicit cu O zecimală; rezultatele cu o zecimală și virgulă (USDT, lei, $, %); beta și ρ cu 2, dar cu virgulă;
//     sumele mici (sub 0,1) nu ies „0,0”: TextRo.zecMici dă 2 zecimale sub 0,1 și 3 sub 0,01; funding-ul și OI cu virgulă pe Futures.
//  2. toLocaleString / toLocaleTimeString / toLocaleDateString / Intl cu limba "ro-RO", nu cu limba telefonului.
//  3. Nasdaq în meniul lateral și în modul crypto (fără stockOnly pe buton).
//  4. #pzKpi se vede și pe telefon (2 coloane, font mai mic), nu display:none sub 550 px.
//  5. textele în engleză de pe drumurile zilnice și din Unelte, în română (id-urile rămân).
//  6. „Spot RESTBINANCE FAIL”: eticheta și valoarea din Starea aplicației despărțite.
//  7. asezare-paznic: tura() nu rulează cu fila ascunsă; la revenire, o tură imediat.
//  8. codul mort scos (funcții nechemate, CSS fără țintă); ce păzesc probele vechi „la dubiu rămâne” rămâne.
//  9. ?panel= acceptă doar un element cu clasa panel.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js"), IDX = citeste("public", "index.html"), CSS = citeste("public", "app.css");
const LIB = (f) => citeste("public", "lib", f);
const fnApp = (nume) => { const i = APP.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i, j < 0 ? undefined : j); };
const TR = globalThis.TextRo;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\naudit 19.10 · ecranul: zecimale, limba ro-RO, Nasdaq, fâșia pe telefon, texte în română, cod mort, ?panel= · proba\n");

// ---------------------------------------------------------------- 1. zecimalele
await test("1a TextRo.usdt: implicit O zecimală, cu virgulă; zecimalele cerute explicit rămân", () => {
  for (const [a, b] of [[TR.usdt(8.54), "+8,5 USDT"], [TR.usdt(-10.24), "−10,2 USDT"], [TR.usdt(0), "0,0 USDT"], [TR.usdt(-0.04), "0,0 USDT"],
    [TR.usdt(-0.004, 3), "−0,004 USDT"], [TR.usdt(-10.24, 2), "−10,24 USDT"], [TR.usdt(3, 0), "+3 USDT"], [TR.usdt(null), "—"]]) assert.equal(a, b);
});
await test("1b TextRo.zecMici: 1 zecimală de la 0,1 în sus, 2 sub 0,1, 3 sub 0,01 (o sumă mică nu iese „0,0”)", () => {
  assert.equal(typeof TR.zecMici, "function");
  for (const [x, z] of [[12, 1], [-0.4, 1], [0.1, 1], [0.04, 2], [-0.011, 2], [0.004, 3], [-0.0004, 3], [0, 1], [null, 1], [NaN, 1]]) assert.equal(TR.zecMici(x), z, String(x));
  assert.equal(TR.usdt(-0.04, TR.zecMici(-0.04)), "−0,04 USDT"); assert.equal(TR.usdt(0.8, TR.zecMici(0.8)), "+0,8 USDT");
});
await test("1c app.js: „Dacă îl închizi acum, iei”, „gridul a adus”, „după 24 h”, rezultatul simulării: o zecimală, virgulă", () => {
  assert.ok(!/q\.iei\.toFixed\(2\)/.test(APP), "iei 104.43 USDT");
  assert.ok(!/Math\.abs\(vp\.diferenta\)\.toFixed\(2\)/.test(APP), "gridul a adus x.xx");
  assert.ok(!/Math\.abs\(e\.r\)\.toFixed\(2\)\+" USDT"/.test(APP), "după 24 h: x.xx USDT");
  assert.ok(!/Math\.abs\(r\.usdt\)\.toFixed\(2\)/.test(APP), "rezultatul simulării cu 2 zecimale");
});
await test("1d jurnalul de trade: greșelile cu „−0,5 USDT (0,5% din investiție)”, nu „−0.53 USDT (0,51%)”", () => {
  const SRC = ["grid-calcul.js", "grid-proba.js", "jurnal-trade.js", "contrafactual.js"].map((f) => LIB(f)).join("\n");
  const JT = new Function(SRC + "; return JurnalTrade;")();
  const BOTI = JSON.parse(fs.readFileSync(path.join(RAD, "scripts", "fixturi", "boti-inchisi-2026-09-24.json"), "utf8"));
  const texte = JT.din(BOTI).flatMap((t) => t.greseli.map((g) => g.text));
  assert.ok(texte.some((t) => /USDT/.test(t)), "nicio greșeală cu bani - proba ar fi goală");
  for (const t of texte) {
    assert.ok(!/\d\.\d+ USDT/.test(t), "punct în USDT: " + t);
    assert.ok(!/\d,\d\d USDT/.test(t), "2 zecimale în USDT: " + t);
    const m = t.match(/\(([\d,]+)% din investiție\)/); if (m) assert.match(m[1], /^\d+,\d$/, t);
  }
  // pasul grilei (0,25%) e un parametru, nu un rezultat: rămâne cu 2 zecimale
  assert.ok(texte.some((t) => /lăsau \d+,\d\d% pe umplere/.test(t)), "pasul grilei a pierdut zecimalele");
});
await test("1e T212, Acasă, Sugestii, Statistica: rezultatele cu o zecimală; beta și ρ cu 2, dar cu virgulă; „VIX 18,4”", () => {
  const T = LIB("t212-ecran.js"), A = LIB("acasa-ecran.js"), S = LIB("sugestii-ecran.js"), ST = LIB("statistica-trade.js");
  assert.ok(!/Math\.abs\(usdt\)\.toFixed\(2\)/.test(T), "t212: Pionex +x.xx USDT");
  assert.ok(!/Math\.abs\(e\.r\)\.toFixed\(2\)/.test(T), "t212: acțiunea a mers x.xx");
  assert.ok(!/Math\.abs\(ist\.total\)\.toFixed\(2\)/.test(T), "t212: istoricul total cu 2 zecimale");
  assert.match(T, /t212\.beta\[p\.ticker\]\.toFixed\(2\)\.replace\("\.", ","\)/); assert.match(T, /x\.rho\.toFixed\(2\)\.replace\("\.", ","\)/);
  assert.ok(!/Math\.abs\(tot\)\.toFixed\(2\)/.test(A), "acasă: boții cu 2 zecimale");
  assert.ok(!/vixU\.toFixed\(2\)/.test(A), "acasă: VIX 18.43"); assert.match(A, /vixU\.toFixed\(1\)\.replace\("\.", ","\)/);
  assert.ok(!/Math\.abs\(ist\.medie \* 100\)\.toFixed\(2\)/.test(S), "sugestii: x,xx% pe lună");
  assert.ok(!/k === "factor"\) return v\.toFixed\(2\)/.test(ST), "statistica: factorul cu 2 zecimale");
  assert.ok(!/maximumFractionDigits: Math\.abs\(v\) >= 100 \? 0 : 2/.test(ST), "statistica: banii cu 2 zecimale");
});
await test("1f ritmul de recuperare, costurile pe zi, sfaturile: o zecimală, iar sumele mici nu ies „0,0”", () => {
  for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js"]) vm.runInThisContext(LIB(f), { filename: f });
  const T = globalThis.TabloExtra;
  assert.match(T.ritmRecuperare(-10, 0.8).text, /\(\+0,8 USDT\/zi\)/);
  assert.match(T.ritmRecuperare(-3.2, 7.99).text, /\(\+8,0 USDT\/zi\)/);
  assert.match(T.ritmRecuperare(-1, 0.04).text, /\(\+0,04 USDT\/zi\)/);
  assert.match(LIB("sfaturi.js"), /function usdt\(v\) \{ return v === null \|\| v === undefined \? "—" : TextRo\.usdt\(v, TextRo\.zecMici\(v\)\); \}/);
  assert.match(LIB("semnale-bot.js"), /var U = function \(v\) \{ return TextRo\.usdt\(v, TextRo\.zecMici\(v\)\); \};/);
  for (const f of ["sfaturi.js", "semnale-bot.js"]) assert.ok(!/< 0\.01 \? 3 : 2/.test(LIB(f)), f + ": costurile pe zi cu 2 zecimale");
});
await test("1g Futures: funding-ul, long/short și schimbarea OI cu virgulă, ca OI", () => {
  const f = fnApp("derivatives");
  assert.ok(!/\(fr\*100\)\.toFixed\(4\)\+"%"/.test(f), "funding cu punct");
  assert.ok(!/Number\(ls\)\.toFixed\(2\);/.test(f), "long/short cu punct");
  assert.ok(!/\(deriv\.funding\*100\)\.toFixed\(4\)\+"%"/.test(APP) && !/\$\{\(deriv\.funding\*100\)\.toFixed\(4\)\}%/.test(APP), "funding cu punct în flux / ordine");
  assert.ok(!/\(fs\.avg(?:24|3d)\*100\)\.toFixed\(4\)\+"%"/.test(APP), "funding-ul mediu cu punct");
  assert.ok(!/\$\("oiContext"\)\.textContent=oi==null\?"N\/A":"OI "\+compact\(oi\)\+\(oiTrend!=="N\/A"\?" · "\+oiTrend:""\)/.test(f), "schimbarea OI cu punct");
  const fr = vm.runInNewContext(fnApp("fundingRo") + ";fundingRo");
  assert.equal(fr(0.000004), "0,0004%"); assert.equal(fr(-0.0001234), "−0,0123%"); assert.equal(fr(null), "N/A");
});

// ---------------------------------------------------------------- 2. limba
await test("2 toLocale… și Intl cu \"ro-RO\": nimic fără limbă și nimic cu undefined", () => {
  for (const [n, s] of [["app.js", APP], ["index.html", IDX], ...fs.readdirSync(path.join(RAD, "public", "lib")).filter((f) => f.endsWith(".js")).map((f) => ["lib/" + f, LIB(f)])]) {
    const m = s.match(/toLocale(?:Date|Time)?String\(\s*(?:\)|undefined)|Intl\.(?:NumberFormat|DateTimeFormat)\(\s*(?:\)|undefined)/g);
    assert.ok(!m, n + ": " + (m || []).join(" · "));
  }
  assert.match(fnApp("money"), /toLocaleString\("ro-RO"/); assert.match(fnApp("num"), /toLocaleString\("ro-RO"/); assert.match(fnApp("compact"), /NumberFormat\("ro-RO"/);
});

// ---------------------------------------------------------------- 3. Nasdaq
await test("3 meniul lateral: Nasdaq se vede și în modul crypto (fără stockOnly pe buton); pagina #stocks rămâne stockOnly", () => {
  const b = IDX.match(/<button class="([^"]*)" data-action-click="openStocksDesk\(\)" data-nav="stocks">/);
  assert.ok(b, "butonul Nasdaq din meniul lateral lipsește"); assert.ok(!/\bstockOnly\b/.test(b[1]), b[1]); assert.match(b[1], /\bsideBtn\b/);
  assert.match(IDX, /<section class="panel stockOnly" id="stocks">/);
  assert.match(APP, /function openStocksDesk\(\)\{setAssetClass\("STOCKS"\);navTo\("stocks",true\)\}/);
});

// ---------------------------------------------------------------- 4. fâșia pe telefon
await test("4 #pzKpi pe telefon: nu se ascunde; 2 coloane, font mai mic, rândurile se rup în loc să fie tăiate", () => {
  assert.ok(!/#pzKpi\{display:none\}/.test(CSS), "#pzKpi ascuns");
  const m = CSS.match(/@media \(max-width:550px\)\{(#pzKpi\{[^}]*\}(?:[^@]*?))\}\n/);
  assert.ok(m, "regula de telefon pentru #pzKpi lipsește"); const r = m[1];
  assert.match(r, /#pzKpi\{[^}]*display:grid[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(r, /\.pzCel\{[^}]*white-space:normal/); assert.match(r, /\.pzCel>b\{[^}]*font-size:1[0-3](?:\.\d)?px/); assert.match(r, /\.pzCel>span\{[^}]*font-size:(?:9|10)(?:\.\d)?px/);
  assert.match(r, /\.pzCel:nth-child\(2n\)\{[^}]*border-right:0/);
});

// ---------------------------------------------------------------- 5. texte în română
await test("5 textele în engleză de pe drumurile zilnice și din Unelte: în română, id-urile rămân", () => {
  for (const s of ["Market Overview</h3><div class=\"dataStatus\"", ">Signal Explanation<", ">Liquidation-Risk Proxy<", "Run analysis to combine all engines.", "Run analysis first", "Not loaded.", "No Pionex fills synchronized yet.",
    "No closed Pionex trades synchronized for this symbol.", "Pionex account is crypto-only.", "Not evaluated.", "No operations incidents.", "<div class=\"label\">Funding rate</div>", "<div class=\"label\">Open Interest</div>",
    "aria-label=\"More navigation\"", "aria-label=\"Scan Dir\"", "aria-label=\"Scan Regime\"", "aria-label=\"Scan Sort\"", "aria-label=\"Set Signal Min\"", "aria-label=\"Set Spot Provider\"", "<div class=\"accountCell\">Free</div>", "<div class=\"accountCell\">Frozen</div>"]) {
    assert.ok(!IDX.includes(s) && !APP.includes(s), "a rămas: " + s);
  }
  assert.ok(!/\$\("acctOrderRows"\)\.innerHTML="Loading…"/.test(APP), "Loading… în Contul Pionex");
  for (const id of ["acctBalanceRows", "acctOrderRows", "v71JournalRows", "v67HealthStatus", "v67IncidentTable", "funding", "oi", "moreDrawer", "scanDir", "scanRegime", "scanSort", "setSignalMin", "setSpotProvider", "masterAction", "explainList"]) assert.ok(IDX.includes('id="' + id + '"'), "id pierdut: " + id);
  assert.match(IDX, /<div class="card"><div class="label">Rata de funding<\/div><div class="value" id="funding">/);
  assert.match(IDX, /<div class="card"><div class="label">Pozițiile deschise \(OI\)<\/div><div class="value" id="oi">/);
});

// ---------------------------------------------------------------- 6. eticheta lipită
await test("6 Starea aplicației: eticheta și valoarea din .healthBox despărțite (nu „Spot RESTBINANCE FAIL”)", () => {
  assert.ok(!/<span class="label">[^<]*<\/span><b id="health/.test(IDX), "eticheta lipită de valoare în HTML");
  assert.match(CSS, /\.healthBox b\{display:block[^}]*\}/);
});

// ---------------------------------------------------------------- 7. tura cu fila ascunsă
await test("7 asezare-paznic: tura() iese cu fila ascunsă; la revenirea filei rulează o tură imediat", () => {
  const s = LIB("asezare-paznic.js"), i = s.indexOf("  function tura() {"), corp = s.slice(i, s.indexOf("\n  }", i));
  assert.match(corp, /^ {2}function tura\(\) \{\n {4}if \(document\.hidden\) return;/);
  assert.match(s, /document\.addEventListener\("visibilitychange", function \(\) \{ if \(!document\.hidden\) tura\(\); \}\);/);
  // pe viu: cu fila ascunsă nu se atinge pagina
  let citiri = 0; const doc = { hidden: true, documentElement: { classList: { add() {} } }, addEventListener() {}, querySelector() { citiri++; return null; }, querySelectorAll() { citiri++; return []; }, getElementById() { citiri++; return null; }, body: { classList: { contains() { return false; }, toggle() {} } } };
  const timere = []; const ctx = { window: {}, document: doc, setInterval: (f) => timere.push(f), setTimeout: (f) => timere.push(f), clearTimeout() {}, addEventListener() {}, localStorage: { getItem() { return null; }, setItem() {} }, console };
  ctx.window = ctx; vm.runInNewContext(s, ctx);
  citiri = 0; timere.forEach((f) => f()); assert.equal(citiri, 0, "tura a citit pagina cu fila ascunsă");
});

// ---------------------------------------------------------------- 8. cod mort
await test("8 codul mort scos: funcțiile nechemate și CSS-ul fără țintă; ce păzesc probele vechi rămâne", () => {
  for (const f of ["tbProbaComuta", "tbProbaCopiaza", "tbProbaPt", "tbMergiLaMotive"]) assert.ok(!APP.includes("function " + f + "("), "a rămas " + f);
  assert.ok(!/tbProbaStop/.test(APP), "a rămas tbProbaStop");
  assert.ok(!LIB("acasa-ecran.js").includes("function acasaCumpar2("), "a rămas acasaCumpar2");
  for (const f of ["acasaCumpar2Corp", "acasaCumpar2Parti", "acasaCumpar"]) assert.ok(LIB("acasa-ecran.js").includes("function " + f + "("), "s-a pierdut " + f);
  for (const c of ["tbCitProba", "tbGraficZona", "tbRandGrafic", "t212Bloc", "newsBox", "riskSpark", "tbLiniePret", "tbLinieLich", "tbLinieIntrare", "tbNivelGrid", "c-chev", "closeBtn", "networkDisabled", "stressWarn", "structureRows", "dataDot", "cloudBad", "pzAlternativa"]) {
    assert.ok(!new RegExp("\\." + c.replace(/-/g, "\\-") + "(?![\\w-])").test(CSS), "CSS fără țintă rămas: ." + c);
  }
  for (const id of ["v68DashState", "v68DecisionState", "v69DashRamp", "v69DecisionRamp"]) assert.ok(!CSS.includes("#" + id), "CSS fără țintă rămas: #" + id);
  for (const c of ["tbGraficSvg", "t212Chev", "fvgRows", "obRows", "intelBox", "liqBox", "stressLoss", "stressGood", "cloudOk", "cloudWarn", "offlineBanner"]) assert.ok(new RegExp("\\." + c + "(?![\\w-])").test(CSS), "s-a pierdut ." + c);
  assert.match(APP, /tbCadentaMs/);
});

// ---------------------------------------------------------------- 9. ?panel=
await test("9 ?panel= deschide doar un element cu clasa panel", () => {
  const f = fnApp("pwaInitDeepLink"), cheme = [];
  const el = (cls) => ({ classList: { contains: (c) => cls.split(" ").includes(c) } });
  const elemente = { gridset: el("panel"), topVersiune: el("topChip"), dash: el("panel") };
  const ruleaza = (cauta) => { cheme.length = 0; vm.runInNewContext(f + ";pwaInitDeepLink()", { document: { getElementById: (id) => elemente[id] || null, body: { classList: { add() {} } } }, location: { search: cauta }, URLSearchParams, localStorage: { getItem: () => null }, setTimeout: (g) => g(), navTo: (p) => cheme.push(p), PAGINA_CURENTA_KEY: "paginaCurenta" }); return cheme.slice(); };
  assert.deepEqual(ruleaza("?panel=gridset"), ["gridset"]);
  assert.deepEqual(ruleaza("?panel=topVersiune"), [], "un id care nu e pagină a fost deschis");
  assert.deepEqual(ruleaza("?panel=nuexista"), []);
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? `, ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
