// Proba v100.289 (01.11, el: „Livrează acum” la v100.288, apoi Tabloul și paginile hrănite de Pionex): așezarea, măsurată cu DATELE LUI.
// Sub antetul de probă (serverul nu cheamă Pionex) 15 pagini rămâneau goale (/api/bot-orders, /api/pionex-account, /api/market?type=pionex_*
// cu 503), deci „curat” acolo însemna „gol”. Răspunsurile reale, înregistrate O DATĂ (scratchpad inregistreaza.mjs) și redate la măsurare
// (asezare-toate.mjs --reda), au arătat pe v100.288 LIVE, la 7 lățimi (412–2560):
// - cărți întinse în gol: Tablou „Gridul” / „Mișcarea” (+83 / +128 px, cât „Stopul”), planul gridului „ÎNGUST · 1×” (+111 px la 768),
//   Jurnalul „Ce ai făcut bine” (+212 px, cât „Ce ai greșit”), Futures „Prima futures față de spot” (+71 px la 768 / 1024);
// - Tablou la 768: pagina 771 px - cipul „pe boții tăi, «Ține-l» a avut dreptate 48 din 85 · …” stă pe un rând (golul 761–980 px din
//   regulile care îl lasă să se rupă);
// - „Ce spune piața acum”: un rând pliat rămas singur, cu gol lângă („Trendul pe TF-uri”, „Estimare pe 16 ore” - după ele vine un rând întreg).
// Rămân dinadins: rândurile de tabel din Cont (`.accountRow`, celulele unui rând au aceeași înălțime) și celulele cu o singură linie
// despărțitoare (`#tbKpi`), ca perechea de verdicte de pe Piața azi.
//   node scripts/proba-v100289.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.289 · AȘEZAREA CU DATELE LUI · proba\n");

const CSS = citeste("public", "app.css");
// doar blocul v100.289 (până la blocul următor, dacă vine unul): v100.290 a pus, la cererea lui („fă tot”), și tabelele din Cont și
// rândul de indicatori cât conținutul - decizia „rămân dinadins” de aici a fost schimbată de el, nu pierdută
const bloc = () => { const i = CSS.indexOf("/* v100.289"), j0 = CSS.indexOf("/* v100.272 (ideile auditului 29.10): paleta"), k = CSS.indexOf("/* v100.290"), j = k > i && k < j0 ? k : j0; assert.ok(i > 0 && i < j0, "blocul v100.289 înaintea paletei"); return CSS.slice(i, j); };
const LIB = citeste("public", "lib", "asezare-randuri.js");
const GLOBALE = { console, Math, Number, String, Array, Object, JSON, isFinite, parseFloat, Set };
const lista = (x) => Array.from(x || []);
const c = (top, h, w, card) => (card === undefined ? { top, bottom: top + h, width: w, height: h } : { top, bottom: top + h, width: w, height: h, card });

await test("cardurile cât conținutul, cu datele lui: Tablou (Stopul / Gridul / Mișcarea, planul gridului), Jurnalul (Ce ai făcut bine / Ce ai greșit), cifrele din Futures; rândurile de tabel din Cont și celulele cu o linie (#tbKpi) rămân", () => {
  const b = bloc();
  assert.match(b, /#tabloubot \.tbConcret,\.stStat \.stDoua,\.grPlanDoua,#deriv \.grid\{align-items:start\}/);
  assert.doesNotMatch(b, /accountRow|tbKpi/);
});
await test("Tablou la 768: cipul lung se rupe pe rânduri în golul 761–980 px (sub 760 și la 981–1359 se rupea deja) ⇒ pagina nu mai iese din ecran", () => {
  const b = bloc();
  assert.match(b, /@media \(min-width:761px\) and \(max-width:980px\)\{#tabloubot \.tbConsCip\{white-space:normal;max-width:100%\}\}/);
  // regulile vechi rămân cum erau
  assert.match(CSS, /@media\(max-width:760px\)\{#tabloubot \.tbConsCip\{white-space:normal;border-radius:5px;max-width:100%\}\}/);
  assert.match(CSS, /@media \(min-width:981px\) and \(max-width:1359px\)\{[^\n]*#tabloubot \.tbConsCip\{white-space:normal;max-width:100%\}\}/);
});
await test("„Ce spune piața acum”: un rând pliat (34 px, rând de LISTĂ: fără fundal, o linie doar sus) rămas singur se întinde pe tot rândul - doar unde grila cere asta (data-ar-mici pe #tbCitire); în rest pastilele, câmpurile și rândurile de listă rămân neîntinse", () => {
  assert.match(citeste("public", "index.html"), /id="tbCitire" data-ar-mici>/);
  const cutie = { ...GLOBALE }; vm.createContext(cutie); vm.runInContext(LIB, cutie);
  const a = cutie.ArRanduri;
  // 4 rânduri pliate pe primul rând al grilei, al cincilea singur, apoi un rând întreg (cu butoane)
  const randuri = [c(0, 34, 300), c(0, 34, 300), c(0, 34, 300), c(0, 34, 300), c(44, 34, 300), c(88, 60, 1240, false)];
  assert.deepEqual(lista(a.alege(randuri, 1240, true)), [4]);
  assert.deepEqual(lista(a.alege(randuri, 1240)), [], "fără cerere: sub 60 px nu se întinde (pastilele, câmpurile)");
  // aseazaGrila citește cererea de pe grilă
  const ctx = { ...GLOBALE, getComputedStyle: (e) => e.stil }; vm.createContext(ctx); vm.runInContext(LIB, ctx);
  // stilul real al rândului pliat (măsurat pe Tablou la 1440): fundal transparent, o linie de 1 px doar sus
  const STIL = { display: "block", visibility: "visible", position: "static", backgroundColor: "rgba(0, 0, 0, 0)", backgroundImage: "none",
    borderTopWidth: "1px", borderTopColor: "rgba(159, 179, 196, 0.16)", borderRightWidth: "0px", borderRightColor: "rgb(230, 237, 243)", borderBottomWidth: "0px", borderBottomColor: "rgb(230, 237, 243)", borderLeftWidth: "0px", borderLeftColor: "rgb(230, 237, 243)" };
  const el = (r, tag = "DIV") => { const e = { tagName: tag, cls: "tbCitR pzFoldOk pzFold", stil: STIL, children: [] }; e.classList = { contains: (x) => e.cls.split(/\s+/).includes(x), add: (x) => { if (!e.classList.contains(x)) e.cls += " " + x; }, remove: (x) => { e.cls = e.cls.split(/\s+/).filter((y) => y !== x).join(" "); } }; e.getAttribute = (k) => (k === "class" ? e.cls : null); e.getBoundingClientRect = () => ({ left: 0, ...r }); return e; };
  const grila = (cerere, tagSingur = "DIV") => {
    const copii = randuri.slice(0, 5).map((r, i) => el({ ...r, left: (i % 4) * 310 }, i === 4 ? tagSingur : "DIV"));
    const g = { children: copii, stil: { display: "grid", gridTemplateColumns: "300px 300px 300px 300px", flexWrap: "nowrap", flexDirection: "row" }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1240, height: 200 }), getAttribute: (k) => (k === "class" ? "" : k === "data-ar-mici" && cerere ? "" : null), hasAttribute: (k) => k === "data-ar-mici" && cerere };
    ctx.ArRanduri.aseazaGrila(g); return copii;
  };
  assert.equal(grila(true)[4].classList.contains("randPlin"), true, "#tbCitire (data-ar-mici): rândul de listă singur se întinde");
  assert.equal(grila(false)[4].classList.contains("randPlin"), false, "altă grilă: un rând de listă nu e card ⇒ nu");
  assert.equal(grila(true, "SELECT")[4].classList.contains("randPlin"), false, "nici în #tbCitire un câmp");
  assert.equal(a.eCard("DIV", STIL), false, "eCard rămâne cum era: o linie doar sus nu e cutie");
  assert.equal(a.eCard("DIV", STIL, true), true, "cu cererea grilei: rândul de listă trece");
});
await test("„Ce spune piața acum” pe loc (tbCitirePeLoc, în fiecare secundă): rândul întins nu se mai rescrie doar pentru `randPlin` (ca pzFold / pzFoldOk); tonul nou se scrie, iar marcajul rămâne", () => {
  const A = citeste("public", "app.js"), i = A.indexOf("function tbCitirePeLoc("), j = A.indexOf("function tbDeseneazaCitire(");
  assert.ok(i > 0 && j > i, "tbCitirePeLoc");
  // pagina de probă: rândurile din pagină și cele din desenul nou (innerHTML nu se parsează - se dau direct rândurile noi)
  const rand = (cls) => { const r = { scrieri: 0, _c: cls }; Object.defineProperty(r, "className", { get: () => r._c, set: (v) => { r.scrieri++; r._c = v; } }); r.classList = { contains: (x) => r._c.split(/\s+/).includes(x) }; r.querySelector = () => null; return r; };
  let noi = [];
  const ctx = { document: { createElement: () => ({ set innerHTML(h) {}, querySelectorAll: (s) => (s === ".tbCitR" ? noi : []), querySelector: () => null }) } };
  vm.createContext(ctx); vm.runInContext(A.slice(i, j) + "\nthis.peLoc = tbCitirePeLoc;", ctx);
  const r = rand("tbCitR bine pzFoldOk pzFold randPlin"), el = { querySelectorAll: (s) => (s === ".tbCitR" ? [r] : []), querySelector: () => null };
  noi = [rand("tbCitR bine")];
  assert.equal(ctx.peLoc(el, "x"), true);
  assert.equal(r.scrieri, 0, "doar randPlin diferă ⇒ nicio rescriere (înainte: la fiecare secundă, iar marcajul pleca)");
  noi = [rand("tbCitR atentie")];
  assert.equal(ctx.peLoc(el, "x"), true);
  assert.equal(r.scrieri, 1, "tonul nou se scrie");
  assert.deepEqual(r.className.split(/\s+/).sort(), ["atentie", "pzFold", "pzFoldOk", "randPlin", "tbCitR"], "pliul și marcajul rămân");
});
await test("versiunile: v100.289 în aplicație, colectorul neatins (v101.158); proba în lanț; v100288 de la v100.288 în sus", () => {
  // v100.290: de la v100.289 în sus (ca probele vechi), nu exact
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 289, String(app));
  assert.match(citeste("BUILD_INFO.json"), new RegExp('"version": "v100\\.' + app + '"'));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 158);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100." + app + ".0", "versiunea din package.json (syntax-v71 o leagă de cache-ul sw.js)"); assert.equal(p.scripts["test:v100289"], "node scripts/proba-v100289.mjs"); assert.match(p.scripts.test, /npm run test:v100288 && npm run test:v100289/);
  assert.doesNotMatch(citeste("scripts", "proba-v100288.mjs"), /VERSIUNE = "v100\\\.288"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
