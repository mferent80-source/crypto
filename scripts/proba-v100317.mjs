// Proba v100.317 (10.11.2026, el: „păi nu o faci ca în demo?”): RÂNDURILE Tabloului botului.
// Secțiunile de sub grafic stau pliate pe o linie (titlul + un rezumat din conținutul lor viu) și se deschid la clic; starea se ține minte.
// Nimic nu se mută și nimic nu se șterge: starea e atributul data-rand pe rădăcina secțiunii, restul îl face foaia de stil.
// Proba rulează codul ADEVĂRAT (tăiat din public/app.js) pe un DOM fals.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html"), APP = citeste("public", "app.js");

// nod fals: destul cât să meargă tbRandRezumat (firstChild / nextSibling / nodeType) și atributele
function text(v) { return { nodeType: 3, nodeValue: v, nextSibling: null }; }
function el(tag, copii = [], extra = {}) {
  const n = { nodeType: 1, tagName: tag, hidden: false, attrs: {}, firstChild: null, nextSibling: null, ...extra,
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; }, setAttribute(k, v) { n.attrs[k] = String(v); n.scrieri = (n.scrieri || 0) + 1; }, hasAttribute(k) { return k in n.attrs; }, removeAttribute(k) { delete n.attrs[k]; },
    getBoundingClientRect() { return { top: 100, height: 300 }; }, closest(q) { return q === "[data-rand]" ? (("data-rand" in n.attrs) ? n : n.parinte ? n.parinte.closest(q) : null) : null; } };
  copii.forEach((c, i) => { if (i === 0) n.firstChild = c; else copii[i - 1].nextSibling = c; c.parinte = n; });
  return n;
}
function lume() {
  const i = APP.indexOf('var TB_RAND_KEY="tbRanduri";'), j = APP.indexOf("function tbComutaInd(k){"); assert.ok(i > 0 && j > i, "nu găsesc codul rândurilor în app.js");
  const cod = APP.slice(i, j).replace(/if\(typeof window!=="undefined"\)window\.addEventListener\("DOMContentLoaded"[^\n]*/, "");
  const mem = {}, noduri = {};
  const ctx = { localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } }, document: { getElementById: (id) => noduri[id] || null, hidden: false } };
  vm.createContext(ctx); vm.runInContext(cod + ";this.F={TB_RANDURI,tbRandStare,tbRandRezumat,tbRandAplica,tbRandComuta,tbRandToate,tbRandClic,tbRandTasta}", ctx);
  for (const id of Object.keys(ctx.F.TB_RANDURI)) noduri[id] = el("SECTION", [el("B", [text(ctx.F.TB_RANDURI[id])]), el("P", [text("  conținut   pentru " + id)])], { id });
  return { F: ctx.F, mem, noduri };
}

console.log("Proba v100.317 - rândurile Tabloului botului");

await test("cele 10 secțiuni de sub grafic au rând; id-urile lor există în pagină o singură dată și nu sunt pliuri <details>", () => {
  const { F } = lume(); const ids = Object.keys(F.TB_RANDURI);
  assert.deepEqual(ids, ["tbTodo", "tbCitireCard", "tbMcSus", "tbConcret", "tbScenariiCard", "tbBaniCard", "tbGridNou", "tbIdei", "tbSemaforCard", "tbAcumCard"]);
  for (const id of ids) { assert.equal(HTML.split('id="' + id + '"').length, 2, id); assert.ok(!new RegExp('<details[^>]*id="' + id + '"').test(HTML), id + " e deja pliu"); assert.ok(F.TB_RANDURI[id].length > 5); }
});
await test("la pornire totul e pliat: data-rand, titlul, rezumatul din conținut, tabindex 0, aria-expanded false", () => {
  const { F, noduri } = lume(); F.tbRandAplica();
  for (const [id, n] of Object.entries(noduri)) { assert.equal(n.attrs["data-rand"], "pliat", id); assert.equal(n.attrs["data-titlu"], F.TB_RANDURI[id]); assert.equal(n.attrs["aria-expanded"], "false"); assert.equal(n.attrs.tabindex, "0"); assert.equal(n.attrs["data-rezumat"], "conținut pentru " + id); }
  const scrieri = noduri.tbTodo.scrieri; F.tbRandAplica(); assert.equal(noduri.tbTodo.scrieri, scrieri, "a doua trecere fără schimbări nu rescrie atributele (fără restilizări degeaba)");
});
await test("rezumatul: fără titlul repetat, fără semnele de la început, fără butoane / câmpuri / elemente ascunse, tăiat la un cuvânt întreg", () => {
  const { F } = lume();
  const n = el("SECTION", [el("DIV", [text("📺 Gridul de acum, pentru TradingView")]), el("BUTTON", [text("Copiază codul")]), el("P", [text("ascuns")], { hidden: true }), el("INPUT"), el("P", [text(" Copiază rândul   și lipește-l ")])]);
  assert.equal(F.tbRandRezumat(n, "Gridul de acum, pentru TradingView"), "Copiază rândul și lipește-l");
  const lung = el("SECTION", [el("P", [text("cuvânt ".repeat(60))])]), r = F.tbRandRezumat(lung, "Alt titlu");
  assert.ok(r.length <= 150 && r.endsWith("cuvânt…"), r);
  assert.equal(F.tbRandRezumat(el("SECTION", []), "Titlu"), "", "secțiune goală ⇒ rezumat gol (tbRandAplica pune «—»)");
  assert.equal(F.tbRandRezumat(el("SECTION", [el("P", [text("−1,6 USDT azi")])]), "Banii botului"), "−1,6 USDT azi", "semnul minus de la început rămâne");
});
await test("clicul pe un rând pliat îl deschide (oriunde); alegerea se ține minte; rândul deschis nu mai are tabindex", () => {
  const { F, mem, noduri } = lume(); F.tbRandAplica(); const n = noduri.tbBaniCard;
  F.tbRandClic({ target: n, clientY: 250 });
  assert.equal(n.attrs["data-rand"], "deschis"); assert.equal(n.attrs["aria-expanded"], "true"); assert.ok(!("tabindex" in n.attrs)); assert.equal(mem.tbRanduri, '{"tbBaniCard":true}');
  assert.equal(noduri.tbTodo.attrs["data-rand"], "pliat", "vecinii rămân cum erau");
});
await test("un rând deschis se strânge DOAR din fâșia de sus (ținta e rădăcina, primii 30 px); clicul în conținut nu-l închide", () => {
  const { F, mem, noduri } = lume(); F.tbRandComuta("tbBaniCard", true); const n = noduri.tbBaniCard, copil = n.firstChild;
  F.tbRandClic({ target: copil, clientY: 110 }); assert.equal(n.attrs["data-rand"], "deschis", "clic pe un copil, chiar sus");
  F.tbRandClic({ target: n, clientY: 200 }); assert.equal(n.attrs["data-rand"], "deschis", "clic pe rădăcină, dar jos");
  F.tbRandClic({ target: n, clientY: 112 }); assert.equal(n.attrs["data-rand"], "pliat"); assert.equal(mem.tbRanduri, "{}");
  F.tbRandClic({ target: { closest: () => null }, clientY: 0 });   // clic în afara rândurilor: nimic, fără excepție
});
await test("tastatura: Enter și spațiu deschid rândul pliat care are focusul; alte taste și rândurile deschise nu fac nimic", () => {
  const { F, noduri } = lume(); F.tbRandAplica(); const n = noduri.tbIdei; let oprit = 0;
  F.tbRandTasta({ key: "a", target: n, preventDefault() { oprit++; } }); assert.equal(n.attrs["data-rand"], "pliat");
  F.tbRandTasta({ key: "Enter", target: n, preventDefault() { oprit++; } }); assert.equal(n.attrs["data-rand"], "deschis"); assert.equal(oprit, 1);
  F.tbRandTasta({ key: " ", target: noduri.tbTodo, preventDefault() { oprit++; } }); assert.equal(noduri.tbTodo.attrs["data-rand"], "deschis");
  F.tbRandTasta({ key: "Enter", target: n, preventDefault() { oprit++; } }); assert.equal(n.attrs["data-rand"], "deschis", "pe unul deschis Enter nu face nimic"); assert.equal(oprit, 2);
});
await test("„Deschide tot” / „Strânge tot”: toate rândurile deodată, ținute minte; un id necunoscut sau o stare stricată în localStorage nu strică nimic", () => {
  const { F, mem, noduri } = lume();
  F.tbRandToate(true); for (const n of Object.values(noduri)) assert.equal(n.attrs["data-rand"], "deschis"); assert.equal(Object.keys(JSON.parse(mem.tbRanduri)).length, 10);
  F.tbRandToate(false); for (const n of Object.values(noduri)) assert.equal(n.attrs["data-rand"], "pliat"); assert.equal(mem.tbRanduri, "{}");
  F.tbRandComuta("altceva", true); assert.equal(mem.tbRanduri, "{}");
  mem.tbRanduri = "nu e json"; F.tbRandAplica(); assert.equal(noduri.tbTodo.attrs["data-rand"], "pliat"); mem.tbRanduri = "[1]"; F.tbRandAplica(); assert.equal(noduri.tbTodo.attrs["data-rand"], "pliat");
});
await test("foaia de stil: rândul pliat nu-și desenează copiii (rămân în pagină), arată titlul și rezumatul; secțiunile cu [hidden] rămân ascunse; coada foii neatinsă", () => {
  for (const s of [
    'html.pzDemo #tabloubot [data-rand="pliat"]:not([hidden]){display:grid!important;', 'html.pzDemo #tabloubot [data-rand="pliat"]>*{display:none!important}',
    'html.pzDemo #tabloubot [data-rand="pliat"]::before{content:"▸  " attr(data-titlu);', 'html.pzDemo #tabloubot [data-rand="pliat"]::after{content:attr(data-rezumat);',
    'html.pzDemo #tabloubot [data-rand="deschis"]:not([hidden])::before{content:"▾  strânge";', "html.pzDemo #tabloubot{font-variant-emoji:text}",
  ]) assert.ok(CSS.includes(s), "lipsește: " + s);
  assert.ok(!/\[data-rand="pliat"\]\{/.test(CSS) && !/\[data-rand="deschis"\]\{/.test(CSS), "fără :not([hidden]) o secțiune ascunsă ar apărea ca rând gol");
  assert.equal(pandaInainteaCozii(CSS), "");
  assert.ok(CSS.indexOf("/* v100.317 (el, 10.11.2026") > CSS.indexOf("/* ==== v100.316 TEMA TABLOULUI: sfârșit ==== */"));
});
await test("pagina: butoanele „Deschide tot” și „Strânge tot” în antet, acțiunea permisă, codul pornește la DOMContentLoaded și se reîmprospătează doar pe Tablou", () => {
  assert.ok(HTML.includes('id="tbRandDeschide" data-action-click="tbRandToate(true)"') && HTML.includes('id="tbRandStrange" data-action-click="tbRandToate(false)"'));
  assert.match(APP, /var ACTIUNI_PERMISE=new Set\("tbRandToate tbTemaComuta /);
  assert.ok(APP.includes('document.addEventListener("click",tbRandClic);document.addEventListener("keydown",tbRandTasta);setInterval(function(){var p=document.getElementById("tabloubot");if(p&&p.classList.contains("on")&&!document.hidden)tbRandAplica()},4000)'));
});
await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json", () => {
  const B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json")), V = "3(?:1[7-9]|[2-9]\\d)";
  assert.equal((HTML.match(new RegExp("v100\\." + V, "g")) || []).length, 4); assert.equal((HTML.match(/v100\.316/g) || []).length, 0);
  assert.match(citeste("public", "sw.js"), new RegExp('const CACHE="crypto-radar-v100-' + V + '";'));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + V + '"'));
  assert.match(B.version, new RegExp("^v100\\." + V + "$")); assert.ok(B.features.randuri317); assert.match(P.version, new RegExp("^100\\." + V + "\\.")); assert.ok(P.scripts.test.includes("npm run test:v100317"));
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
