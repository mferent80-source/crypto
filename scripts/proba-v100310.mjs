// Proba v100.310 (07.11.2026, el: „ia skilurile de design și refă pagina că e un gol imens și o listă lungă” + „sub grafic”; ales: „Primele 5, restul la un clic”):
//   1. fișa din dreapta (cu graficul) se lipește sub bara de sus cât derulezi: cardul paginii taie cu overflow:clip, nu hidden - hidden făcea
//      din card containerul lipirii, deci fișa pleca odată cu pagina și lăsa sub grafic un gol cât lista (~7.000 px la 1440, măsurat pe VPS);
//   2. fiecare listă arată primele 5 rânduri, restul la un clic („Arată încă N rânduri”), deschiderea ținută minte; rândul ales nu se ascunde;
//      niciun rând nu dispare din pagină (doar se pliază), --n numără doar ce se vede (altfel rândurile goale ale grilei lasă gaură).
//   node scripts/proba-v100310.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as K from "./lib/tura-caderi.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.310 · Sugestii: fișa rămâne lângă tine, listele arată primele 5 · proba\n");

const CSS = citeste("public", "app.css"), APP = citeste("public", "app.js"), SUG = citeste("public", "lib", "sugestii-ecran.js");
const J = (x) => JSON.parse(JSON.stringify(x));
function pagina(ls) {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  if (ls) ctx.localStorage = ls;
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + SUG + "\nthis.sugHtml = sugHtml; this.sugRanduri = sugRanduri; this.sugStare = sugStare; this.sugPuneN = sugPuneN; this.sugDesface = typeof sugDesface === 'function' ? sugDesface : null;", ctx);
  return ctx;
}
const moneda = (i) => ({ s: "C" + i + "_USDT_PERP", b: "C" + i + "USDT", c: 1 + i, cadere: 0.3, vol: 3e7, rang: 40 + i, A: false, oi: -0.05, f72: 0.0001, B: "piata", bs: 0.3, beta: 1.2, C: false });
const cad = (n) => ({ la: Date.parse("2026-11-08T07:30:00Z"), zi: "2026-11-07", nElig: 188, nE: n, nPionex: n, nA: 0, incomplet: false, start: "2026-11-07",
  lista: Array.from({ length: n }, (_, i) => moneda(i + 1)), urmarire: { zile: 0, evenimente: 0, zileIncomplete: 0, grupuri: { E: { n: 0 } }, verdict: null, P: { episoade: 0 } }, istoric: K.ISTORIC });
const ACUM = Date.parse("2026-11-08T08:00:00Z");
// rândurile grupului „cad” din HTML, în ordine: [simbol, pliat?]
const randuriCad = (h) => [...h.matchAll(/<button type="button" class="sugRand([^"]*)" id="sugR-cad:([^"]+)"/g)].map((m) => [m[2], /\bsugPeste\b/.test(m[1])]);
const butonMai = (h, k) => { const m = h.match(new RegExp(`<button type="button" class="sugMaiMult" id="sugMai-${k}" aria-expanded="(true|false)" data-action-click="sugDesface\\('${k}'\\)">([^<]*)</button>`)); return m ? { exp: m[1], text: m[2] } : null; };

// ── 1. golul de sub grafic ──
await test("🔑 cardul paginii taie cu overflow:clip (nu hidden): fișa se lipește de ecran, nu de card", () => {
  assert.match(CSS, /#sugPagina\.card\{[^}]*overflow:clip/, "#sugPagina.card{overflow:clip}");
  const i = CSS.search(/#sugPagina\.card\{[^}]*overflow:clip/), j = CSS.search(/\n\.card\{/);
  assert.ok(j >= 0 && i > j, "regula vine DUPĂ .card{…overflow:hidden}, ca s-o bată");
});
await test("🔑 fișa se lipește SUB bara de sus (var(--topbar)) și încape în ecran sub ea", () => {
  const r = CSS.match(/\.sugLista2 #sugFisa\{([^}]*)\}/);
  assert.ok(r, "regula fișei în grilă");
  assert.match(r[1], /position:sticky/);
  assert.match(r[1], /top:calc\(var\(--topbar,56px\) \+ 10px\)/);
  assert.match(r[1], /max-height:calc\(100vh - var\(--topbar,56px\) - 20px\)/);
});

// ── 2. lista: primele 5, restul la un clic ──
await test("🔑 8 rânduri: primele 5 la vedere, 3 pliate (tot în pagină), butonul „▾ Arată încă 3 rânduri”", () => {
  const P = pagina(), h = P.sugHtml({ caderi: cad(8) }, ACUM);
  assert.deepEqual(randuriCad(h), [["C1", false], ["C2", false], ["C3", false], ["C4", false], ["C5", false], ["C6", true], ["C7", true], ["C8", true]]);
  assert.deepEqual(butonMai(h, "cad"), { exp: "false", text: "▾ Arată încă 3 rânduri" });
});
await test("🔑 deschisă: toate 8 la vedere, butonul „▴ Arată doar primele 5”", () => {
  const P = pagina(); P.sugStare.desfacute = { cad: true };
  const h = P.sugHtml({ caderi: cad(8) }, ACUM);
  assert.ok(randuriCad(h).every((r) => !r[1]) && randuriCad(h).length === 8);
  assert.deepEqual(butonMai(h, "cad"), { exp: "true", text: "▴ Arată doar primele 5" });
});
await test("🔑 rândul ALES nu se pliază niciodată (al 8-lea ales ⇒ la vedere, „încă 2 rânduri”); fișa lui e lângă el", () => {
  const P = pagina(); P.sugStare.ales = "cad:C8";
  const h = P.sugHtml({ caderi: cad(8) }, ACUM);
  assert.deepEqual(randuriCad(h).filter((r) => r[1]).map((r) => r[0]), ["C6", "C7"]);
  assert.deepEqual(butonMai(h, "cad"), { exp: "false", text: "▾ Arată încă 2 rânduri" });
  assert.match(h, /id="sugR-cad:C8"[^]*?<\/button><section class="tbBloc sugFisa" id="sugFisa"/, "fișa imediat după rândul ales (pe telefon stă sub el)");
});
await test("5 rânduri sau mai puține ⇒ fără buton, nimic pliat; 6 ⇒ „încă 1 rând”; 6 cu al 6-lea ales ⇒ nimic de pliat, fără buton", () => {
  let h = pagina().sugHtml({ caderi: cad(5) }, ACUM);
  assert.equal(butonMai(h, "cad"), null); assert.ok(randuriCad(h).every((r) => !r[1]));
  h = pagina().sugHtml({ caderi: cad(6) }, ACUM);
  assert.deepEqual(butonMai(h, "cad"), { exp: "false", text: "▾ Arată încă 1 rând" });
  const P = pagina(); P.sugStare.ales = "cad:C6"; h = P.sugHtml({ caderi: cad(6) }, ACUM);
  assert.equal(butonMai(h, "cad"), null, "nu „Arată încă 0 rânduri”"); assert.ok(randuriCad(h).every((r) => !r[1]));
});
await test("🔑 --n (rândurile grilei) numără doar ce se vede: titluri + rânduri nepliate + butoane + „nimic acum”", () => {
  const h = pagina().sugHtml({ caderi: cad(8) }, ACUM);
  const corp = h.slice(h.indexOf('<div class="sugCorp"'));
  const n = Number(corp.match(/--n:(\d+)/)[1]);
  const vazute = (corp.match(/<h4 class="sugGrup"/g) || []).length + randuriCadToate(corp).filter((c) => !/\bsugPeste\b/.test(c)).length
    + (corp.match(/<button type="button" class="sugMaiMult"/g) || []).length + (corp.match(/<p class="sugGol"/g) || []).length;
  assert.equal(n, vazute);
  function randuriCadToate(x) { return [...x.matchAll(/<button type="button" class="sugRand([^"]*)"/g)].map((m) => m[1]); }
});
await test("🔑 sugPuneN după fiecare desen sare peste fișă ȘI peste rândurile pliate", () => {
  const P = pagina(), pus = {};
  const copil = (cls, id) => ({ id: id || "", className: cls, getAttribute: (k) => (k === "class" ? cls : null) });
  const corp = { children: [copil("sugGrup"), copil("sugRand"), copil("tbBloc sugFisa", "sugFisa"), copil("sugRand sugPeste"), copil("sugRand sugPeste"), copil("sugMaiMult")], style: { setProperty: (k, v) => { pus[k] = v; } } };
  assert.equal(P.sugPuneN({ querySelector: () => corp }), 3); assert.equal(pus["--n"], "3");
});
await test("🔑 sugDesface deschide / închide și ține minte (localStorage); fără localStorage (privat) merge la fel", () => {
  const mem = {}, ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  let P = pagina(ls); assert.equal(typeof P.sugDesface, "function", "sugDesface există");
  P.sugDesface("sect"); assert.equal(P.sugStare.desfacute.sect, true);
  assert.deepEqual(J(Object.values(mem).map((v) => JSON.parse(v))), [{ sect: true }]);
  P = pagina(ls); assert.equal(P.sugStare.desfacute.sect, true, "la o pagină nouă rămâne deschisă");
  P.sugDesface("sect"); assert.equal(P.sugStare.desfacute.sect, undefined);
  const stricat = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); } };
  P = pagina(stricat); P.sugDesface("trend"); assert.equal(P.sugStare.desfacute.trend, true);
  P = pagina({ getItem: () => "{nu e json", setItem: () => {} }); assert.deepEqual(J(P.sugStare.desfacute), {});
});
await test("🔑 clicul ajunge: sugDesface e în ACTIUNI_PERMISE; alinierea pe loc sincronizează aria-expanded", () => {
  const m = APP.match(/var ACTIUNI_PERMISE=new Set\("([^"]+)"/);
  assert.ok(m && m[1].split(/\s+/).includes("sugDesface"));
  assert.match(SUG, /var i, k, v, nume = \["href", "data-action-click", "title", "aria-pressed", "aria-expanded"\]/);
});
await test("🔑 clic pe un rând de jos ⇒ pagina NU mai sare sus (ancorarea derulării oprită doar pe listă) și focusul rămâne pe rând", () => {
  // măsurat pe VPS 07.11: clic pe EXR la 4.015 px ⇒ pagina la 430 px (și în v100.309); fără ancorare pe .sugCorp ⇒ rămâne la 4.015
  assert.match(CSS, /\.sugLista2 \.sugCorp\{overflow-anchor:none\}/);
  assert.doesNotMatch(CSS, /(^|\})\s*(html|body)\{[^}]*overflow-anchor:none/, "nu pe toată aplicația");
  const d = SUG.slice(SUG.indexOf("function sugDeseneaza()"), SUG.indexOf("async function sugPorneste"));
  assert.match(d, /document\.activeElement/); assert.match(d, /focus\(\{ preventScroll: true \}\)/);
});
await test("butonul: pliatul se ascunde din CSS, butonul arată ca un rând stins, cu țintă de deget și focus vizibil", () => {
  assert.match(CSS, /\.sugLista2 \.sugRand\.sugPeste\{display:none\}/);
  const b = CSS.match(/\.sugMaiMult\{([^}]*)\}/); assert.ok(b);
  assert.match(b[1], /min-height:44px/); assert.match(b[1], /width:100%/);
  assert.match(CSS, /\.sugMaiMult:focus-visible\{outline:2px solid var\(--accent\)/);
});

console.log(`\n${teste - picate}/${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
process.exit(picate ? 1 : 0);
