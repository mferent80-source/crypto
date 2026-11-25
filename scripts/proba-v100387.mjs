// Proba v100.387 (I-941, el: „fă tot” după auditul paginii botului — valul 3): unealta scripts/lib/cod-are.mjs pentru probele care verifică apeluri din cod.
//   A  apeluri(): argumentele fiecărui apel, cu paranteze echilibrate, ghilimelele (și parantezele din ele) sărite, numele întreg (nu bucată din alt nume)
//   B  asertApel(): trece cu câmpuri în plus / în altă ordine; PICĂ (și spune ce lipsește) când un câmp cerut lipsește — o probă care nu poate pica n-are rol
//   C  areInLista(): lista din new Set("…") le are pe toate, în orice ordine
//   D  probele mutate pe unealtă (v100139 / 140 / 145 / 316 / 317 / 354) o folosesc și PICĂ pe codul fără câmpul cerut
//   V  versiunea v100.387, proba în lanț după v100.386
// Rulare: node scripts/proba-v100387.mjs
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { apeluri, areApel, asertApel, areInLista } from "./lib/cod-are.mjs";

const citeste = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
console.log("\nv100.387 · probele pe câmpuri, nu pe textul întreg al apelului (I-941) · proba\n");

await test("A  apeluri(): paranteze echilibrate, ghilimelele sărite, numele întreg", () => {
  const src = 'var a=f(1,g(2),"x)y");xf(9);o.f(3,{a:"(",b:[1,2]});f (4)';
  assert.deepEqual(apeluri(src, "f"), ['1,g(2),"x)y"', '3,{a:"(",b:[1,2]}']);
  assert.deepEqual(apeluri("nimic aici", "f"), []);
});

await test("B  asertApel(): câmpuri în plus / altă ordine ⇒ trece; câmp lipsă ⇒ pică și spune care", () => {
  const src = "await tbMcSimuleaza(tbMc.b15,st,{plan:plan,totalPionex:totalPx,pornitLa:pornitLa,n:500});";
  asertApel(src, "tbMcSimuleaza", ["pornitLa:pornitLa", "plan:plan", "n:500"]);
  assert.equal(areApel(src, "tbMcSimuleaza", ["n: 500"]), true, "spațiile nu contează");
  assert.throws(() => asertApel(src, "tbMcSimuleaza", ["n:500", "seed:12"], "x"), /x: tbMcSimuleaza\(…\) n-are: seed:12/);
  assert.throws(() => asertApel(src, "altaFunctie", ["n:500"]), /nu apare deloc/);
});

await test("C  areInLista(): lista din new Set(\"…\") are cuvintele, în orice ordine", () => {
  const src = 'var ACTIUNI_PERMISE=new Set("tbRandToate tbSariLa tbInstantaneu tbTemaComuta");';
  assert.equal(areInLista(src, "ACTIUNI_PERMISE", ["tbTemaComuta", "tbRandToate"]), true);
  assert.equal(areInLista(src, "ACTIUNI_PERMISE", ["tbLipsa"]), false); assert.equal(areInLista("", "ACTIUNI_PERMISE", ["a"]), false);
});

await test("D  probele mutate folosesc unealta și ar PICA pe codul fără câmpul cerut", () => {
  for (const f of ["proba-v100139.mjs", "proba-v100140.mjs", "proba-v100145.mjs", "proba-v100316.mjs", "proba-v100317.mjs", "proba-v100354.mjs"]) assert.match(citeste("./" + f), /from "\.\/lib\/cod-are\.mjs"/, f);
  const APP = cuTablou(citeste("../public/app.js")), i = APP.indexOf("function tbMcPorneste("), p = APP.slice(i, APP.indexOf("\n}\n", i) + 2);
  const cerute = ["tbMc.b15,st,{", "plan:plan", "pornitLa:pornitLa", "stPrefix:pornitLa?st:null", "botRuleaza:!!pornitLa", "pozitiePionex:pornitLa?d.pozitie:null", "n:500", "seed:12", "orizonturi:[1/24,4/24,1,7]", "zile:7"];
  asertApel(p, "tbMcSimuleaza", cerute);
  assert.throws(() => asertApel(p.replace("pozitiePionex:pornitLa?d.pozitie:null,", ""), "tbMcSimuleaza", cerute), /n-are: pozitiePionex/);
});

// ── I-939 (filele) și locul rândurilor fluxului ──
const APPs = cuTablou(citeste("../public/app.js")), CSSs = citeste("../public/app.css");
const fn = (n) => { const i = APPs.search(new RegExp("function " + n + "\\(")); let a = 0, j = APPs.indexOf("{", i); for (; j < APPs.length; j++) { if (APPs[j] === "{") a++; else if (APPs[j] === "}" && --a === 0) break; } return APPs.slice(i, j + 1); };
const tbFile = () => { const i = APPs.indexOf("var TB_FILE="), j = APPs.indexOf("};", i); return APPs.slice(i, j + 2); };

await test("E  I-939 membrii filelor = intervalele de `order` din app.css (decizia 300–318, riscul 320–338, banii 340–358, piața 360–378, jurnalul 380+)", () => {
  const c = {}; vm.runInNewContext(tbFile() + "; this.F = TB_FILE;", c);
  const R = { decizia: [300, 318], risc: [320, 338], bani: [340, 358], piata: [360, 378], jurnal: [380, 399] };
  for (const [cap, l] of Object.entries(c.F)) for (const sel of l) {
    const id = (/^#([\w-]+)$/.exec(sel) || [])[1]; if (!id || id === "tbFlux" || id === "tbRiscPiata") continue;
    const m = new RegExp("\\.tbCadru #" + id + "\\{order:(\\d+)!important\\}").exec(CSSs); assert.ok(m, id + ": fără order în app.css");
    assert.ok(+m[1] >= R[cap][0] && +m[1] <= R[cap][1], id + " are order " + m[1] + ", dar e pus la „" + cap + "”");
  }
});

await test("F  I-939 tbFilaAplica: „Toate” (implicit) nu ascunde nimic; o filă ascunde celelalte capitole; butoanele rândului devin file; alegerea se ține minte", () => {
  const ls = {};
  const el = (id) => ({ id, a: {}, getAttribute(k) { return k in this.a ? this.a[k] : null; }, setAttribute(k, v) { this.a[k] = String(v); }, removeAttribute(k) { delete this.a[k]; }, hasAttribute(k) { return k in this.a; } });
  const E = {}; ["tbCap-decizia", "tbTodo", "tbCap-risc", "tbConcret", "tbFlux", "tbCap-bani", "tbBaniCard", "tbCap-piata", "tbIdei", "tbCap-jurnal", "tbPl-alerte"].forEach((i) => (E[i] = el(i)));
  const butoane = ["decizia", "risc", "bani"].map((k) => { const b = el("b-" + k); b.a["data-action-click"] = "tbSariLa('" + k + "')"; return b; });
  const span = { textContent: "Sari la", tag: "span", get nextSibling() { return nav.kids[nav.kids.indexOf(this) + 1] || null; } };
  const nav = { kids: [span, ...butoane], querySelector(s) { return s === "span" ? this.kids[0] : s === ".tbFilaToate" ? this.kids.find((k) => k.className === "tbFilaToate") || null : null; }, querySelectorAll() { return this.kids.filter((k) => k.tag !== "span"); }, insertBefore(n, ref) { this.kids.splice(this.kids.indexOf(ref), 0, n); } };
  const doc = { head: { appendChild() {} }, getElementById: (i) => (i === "tbCuprins" ? nav : i === "tbFilaStil" ? doc._st : E[i] || null), querySelectorAll: (s) => { const m = /^#([\w-]+)$/.exec(s); return m && E[m[1]] ? [E[m[1]]] : []; },
    createElement: (t) => (t === "style" ? (doc._st = { id: "tbFilaStil" }) : { tag: t, a: {}, setAttribute(k, v) { this.a[k] = v; }, getAttribute(k) { return this.a[k] || null; } }) };
  const ctx = { document: doc, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; } }, $: (i) => doc.getElementById(i), String, Object };
  vm.createContext(ctx); vm.runInContext(tbFile() + fn("tbFilaAcum") + fn("tbFilaAplica") + fn("tbFilaAlege"), ctx);
  vm.runInContext("tbFilaAplica()", ctx);
  assert.equal(Object.values(E).filter((e) => e.a["data-fila-ascuns"]).length, 0, "„Toate”: nimic ascuns");
  assert.equal(nav.kids[1].textContent, "Toate"); assert.equal(nav.kids[0].textContent, "Arată"); assert.equal(butoane[1].a["data-action-click"], "tbFilaAlege('risc')");
  vm.runInContext("tbFilaAlege('risc')", ctx);
  assert.equal(ls.tbFila, "risc"); assert.ok(!E.tbConcret.a["data-fila-ascuns"] && !E.tbFlux.a["data-fila-ascuns"], "Riscul la vedere, cu fluxul");
  assert.equal(E.tbTodo.a["data-fila-ascuns"], "1"); assert.equal(E.tbBaniCard.a["data-fila-ascuns"], "1"); assert.equal(E["tbPl-alerte"].a["data-fila-ascuns"], "1");
  assert.equal(butoane[1].a["aria-pressed"], "true"); assert.equal(butoane[0].a["aria-pressed"], "false");
  vm.runInContext("tbFilaAlege('toate')", ctx); assert.equal(Object.values(E).filter((e) => e.a["data-fila-ascuns"]).length, 0);
  assert.match(fn("tbSariLa"), /if\(fa!=="toate"&&fa!==k&&TB_FILE\[k\]\)/, "pe „Toate” o legătură spre capitol nu ascunde nimic");
  assert.match(fn("tbCapAzi"), /tbFilaAplica\(\)/, "reaplicată la 4 s (rândurile create din cod)");
  assert.ok(areInLista(APPs, "ACTIUNI_PERMISE", ["tbFilaAlege"]));
});

await test("G  locul rândurilor fluxului: order 323 (!important, după „Stopul, gridul, mișcarea” = 322) și lățimea întreagă — nu la capătul paginii (order 900)", () => {
  assert.match(fn("tbFluxLoc"), /setProperty\("order","323","important"\)/); assert.match(fn("tbFluxLoc"), /setProperty\("grid-column","1 \/ -1","important"\)/);
  assert.match(CSSs, /\.tbCadru #tbConcret\{order:322!important\}/); assert.match(CSSs, /\.tbCadru #tbScenariiCard\{order:324!important\}/);
  assert.equal((fn("tbDeseneazaFlux").match(/tbFluxLoc\((el|er)\)/g) || []).length, 2);
});

await test("V  versiunea v100.387 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.388: „de la 387 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.388) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 387); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 387); assert.ok(bi.li387 && bi.li387.length > 100, "BUILD_INFO.li387");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 387).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 387); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 387);
  assert.match(pk.scripts.test, /npm run test:v100386 && npm run test:v100387/); assert.equal(pk.scripts["test:v100387"], "node scripts/proba-v100387.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
