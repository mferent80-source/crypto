// Proba v100.123 (07.10, el: „fa idei” pe ideile de după v100.122):
// (2) apăsarea lungă pe banda botului arată TOT rândul (pe telefon cad „piața”, „azi”, „grid”, iar „lichidare” iese tăiată);
// (3) bara de alegere a monedei din paginile vechi (Engine, MTF…) ocupa ~280 px pe telefon ⇒ pliată pe un rând
//     („PON · 4h · Auto · Binance ▾” + „Analizează piața”), se desface la apăsare; PC neschimbat.
// Ideea (1) - banda pe UN rând cu LIVE + versiunea - NU s-a făcut: măsurat la 390 px, banda ar avea 205 px pentru 418 de text
// ⇒ „total” (banii) ieșea tăiat; v74.6 a cerut banii la vedere.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.123 · Telefonul: tot rândul botului la apăsare lungă, bara paginilor vechi pliată · proba\n");

const css = citeste("public", "app.css"), app = citeste("public", "app.js"), html = citeste("public", "index.html");
function functia(nume) {
  const i = app.indexOf("function " + nume + "("); assert.ok(i >= 0, nume + "() lipsește din app.js");
  let ad = 0, j = app.indexOf("{", i);
  for (; j < app.length; j++) { if (app[j] === "{") ad++; else if (app[j] === "}" && --ad === 0) break; }
  return app.slice(i, j + 1);
}
function reguli(text) {
  const out = []; let media = "", adanc = 0, i = 0, start = 0;
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");
  while (i < text.length) {
    const c = text[i];
    if (c === "{") {
      const sel = text.slice(start, i).trim();
      if (sel.startsWith("@media")) { media = sel; adanc = 1; start = i + 1; }
      else if (sel.startsWith("@")) { let a = 0, j = i; for (; j < text.length; j++) { if (text[j] === "{") a++; else if (text[j] === "}" && --a === 0) break; } i = j; start = j + 1; }
      else { const j = text.indexOf("}", i); out.push({ sel: sel.split(",").map((s) => s.trim()), corp: text.slice(i + 1, j), media }); i = j; start = j + 1; }
    } else if (c === "}") { if (adanc) { adanc = 0; media = ""; } start = i + 1; }
    i++;
  }
  return out;
}
const R = reguli(css);
const maxW = (r) => { const m = /max-width:\s*(\d+)px/.exec(r.media); return m ? +m[1] : null; };
const peTelefon = (selector, prop, val) => R.some((r) => r.sel.includes(selector) && maxW(r) >= 390 && maxW(r) <= 980 && !/min-width/.test(r.media)
  && new RegExp("(^|;)\\s*" + prop + "\\s*:\\s*" + val + "\\s*(!important)?\\s*(;|$)").test(r.corp));
const sus = (selector, prop, val) => R.some((r) => r.sel.includes(selector) && r.media === "" && new RegExp("(^|;)\\s*" + prop + "\\s*:\\s*" + val).test(r.corp));

// elemente de probă pentru bara paginilor vechi
function cls() { const s = new Set(); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c), toggle: (c) => (s.has(c) ? (s.delete(c), false) : (s.add(c), true)) }; }
function sel(text) { return { tagName: "SELECT", selectedIndex: 0, options: [{ text }] }; }
function bara() {
  const toolbar = { classList: cls() };
  const buton = { textContent: "", atr: {}, setAttribute(k, v) { this.atr[k] = v; }, closest: () => toolbar };
  const el = { symbol: { tagName: "INPUT", value: "pon " }, tf: sel("4h"), mode: sel("Auto"), analysisSource: sel("Binance · stable"), tbarRezumat: buton };
  const ctx = { $: (id) => el[id] || null, document: { querySelector: (q) => (q === ".toolbar" ? toolbar : null) } };
  vm.runInNewContext(functia("tbarRezumat") + functia("tbarActualizeaza") + functia("tbarComuta") + ";this.rez=tbarRezumat;this.act=tbarActualizeaza;this.com=tbarComuta;", ctx);
  return { ctx, toolbar, buton, el };
}

await test("(3a) rezumatul barei: moneda, intervalul, modul, sursa - pe un rând", () => {
  const b = bara(); assert.equal(b.ctx.rez(), "PON · 4h · Auto · Binance");
  b.el.symbol.value = ""; assert.equal(b.ctx.rez(), "— · 4h · Auto · Binance", "fără monedă scrie „—”");
});
await test("(3b) apăsarea pe rezumat desface / strânge bara; săgeata și aria-expanded urmează", () => {
  const b = bara(); b.ctx.act(); assert.match(b.buton.textContent, /▾$/); assert.equal(b.buton.atr["aria-expanded"], "false");
  b.ctx.com(); assert.ok(b.toolbar.classList.contains("deschisa")); assert.match(b.buton.textContent, /▴$/); assert.equal(b.buton.atr["aria-expanded"], "true");
  b.ctx.com(); assert.ok(!b.toolbar.classList.contains("deschisa"));
});
await test("(3c) pe telefon bara strânsă ascunde selectoarele și favoritele; pe PC rezumatul nu apare; butonul e în bară", () => {
  assert.ok(peTelefon(".toolbar:not(.deschisa)>.controls", "display", "none"), "selectoarele rămân pe telefon");
  assert.ok(peTelefon(".toolbar:not(.deschisa)>.scroll", "display", "none"), "favoritele rămân pe telefon");
  assert.ok(peTelefon(".tbarRezumat", "display", "block"), "rezumatul nu apare pe telefon");
  assert.ok(sus(".tbarRezumat", "display", "none"), "pe PC rezumatul trebuie ascuns");
  const t = html.slice(html.indexOf('<div class="toolbar">'), html.indexOf('<div class="heroStrip">'));
  assert.match(t, /id="tbarRezumat"[^>]*data-action-click="tbarComuta\(\)"|data-action-click="tbarComuta\(\)"[^>]*id="tbarRezumat"/);
  assert.match(t, /id="status"/, "starea analizei rămâne în bară (la vedere și strânsă)");
  assert.ok(!R.some((r) => r.sel.includes(".toolbar:not(.deschisa)>.status") && /display\s*:\s*none/.test(r.corp)), "starea analizei nu se ascunde");
});

await test("(3d) bara se leagă la DOMContentLoaded, nu pe loc: `const $` e mai jos în app.js (TDZ) - chemat pe loc oprea TOT app.js", () => {
  const i$ = app.indexOf("const $=id=>document.getElementById(id)"), iBara = app.indexOf("function tbarComuta(");
  assert.ok(i$ > 0 && iBara > 0);
  const dupa = app.slice(iBara, app.indexOf("\n", app.indexOf("\n", iBara) + 1) + 1);
  if (iBara < i$) { assert.doesNotMatch(dupa, /^\(function\(\)\{/m, "IIFE pe loc înainte de `const $`"); assert.match(app.slice(iBara, i$), /addEventListener\("DOMContentLoaded",function\(\)\{const t=document\.querySelector\("\.toolbar"\)/); }
});
await test("(2a) panoul „tot rândul”: câte un rând pe bucată, ȘI cele căzute din bandă (piața, azi, grid)", () => {
  const corp = { kids: [], appendChild(x) { this.kids.push(x); } };
  const mk = () => ({ id: "", className: "", hidden: true, innerHTML: "", style: {}, setAttribute() {}, addEventListener() {} });
  const ctx = { tbBandaParti: [{ k: "nume", t: "PONS short 3×" }, { k: "pret", t: "0.4113 ▼" }, { k: "zi", t: "azi +4,0%", ton: "sus" }, { k: "total", t: "total +0,25 USDT" }, { k: "lich", t: "lichidare 37,9%" }, { k: "grid", t: "grid ↓7,5% ↑7,1%" }, { k: "piata", t: "piața: cu botul" }],
    $: (id) => corp.kids.find((x) => x.id === id) || null, document: { createElement: mk, body: corp, querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 81 }) }), addEventListener() {} },
    escapeHtml: (s) => String(s), setTimeout: () => 1, clearTimeout() {} };
  vm.runInNewContext(functia("bsArataTot") + ";bsArataTot();", ctx);
  const p = corp.kids.find((x) => x.id === "botStripTot"); assert.ok(p, "panoul nu s-a creat"); assert.equal(p.hidden, false);
  for (const t of ["PONS short 3×", "azi +4,0%", "total +0,25 USDT", "lichidare 37,9%", "grid ↓7,5% ↑7,1%", "piața: cu botul"]) assert.ok(p.innerHTML.includes(t), "lipsește " + t);
  assert.equal((p.innerHTML.match(/class="bsTotRand/g) || []).length, 7);
});
await test("(2b) banda ține minte TOATE bucățile înainte să cadă ce nu încape și leagă apăsarea lungă; clicul de după nu mai deschide Tabloul", () => {
  const f = functia("tbActualizeazaBanda");
  assert.ok(f.indexOf("tbBandaParti=r.parti.slice()") > 0 && f.indexOf("tbBandaParti=r.parti.slice()") < f.indexOf('["piata","zi","grid"]'), "bucățile se țin minte ÎNAINTE să cadă ce nu încape");
  assert.match(f, /bsLegaApasareLunga\(el\)/);
  const l = functia("bsLegaApasareLunga");
  assert.match(l, /setTimeout\([^]*bsArataTot\(\)[^]*,550\)/); assert.match(l, /"click",[^]*stopImmediatePropagation\(\)[^]*,true\)/); assert.match(l, /__lung/);
  assert.ok(peTelefon(".botStrip", "-webkit-touch-callout", "none") || sus(".botStrip", "-webkit-touch-callout", "none"), "meniul de text al telefonului la apăsare lungă");
});

await test("(S) proba de ecran pe telefon verifică bara pliată (Engine) și apăsarea lungă (Tablou)", () => {
  const s = citeste("scripts", "proba-ecran-telefon.mjs"); assert.match(s, /BARA_MAX/); assert.match(s, /botStripTot/);
});

await test("(E) versiunea de la v100.123 în sus (colectorul neatins, v101.82)", () => {
  assert.match(html, /content="v100\.1(2[3-9]|[3-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(2[3-9]|[3-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(2[3-9]|[3-9]\d)</);   // v100.124: lărgit
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(2[3-9]|[3-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(2[3-9]|[3-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(2[3-9]|[3-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(2[3-9]|[3-9]\d)$/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.82";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
