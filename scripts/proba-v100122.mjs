// Proba v100.122 (07.10, el: „fă” pe ideile de după v100.121 „paginile noi pe telefon”):
// (1) cardul „Instalează Crypto Radar” acoperea conținutul pe fiecare pagină ⇒ cel mult o dată pe zi, se ascunde singur după 15 s;
// (2) banda de sus lipită avea 139-156 px pe telefon (moneda analizei vechi + 4h/AUTO/BINANCE, banda botului pe 2-3 rânduri, WS) ⇒
//     pe telefon: banda botului pe UN rând (cad singure „piața”, „azi”, „grid”, ca pe PC), fără dublurile analizei vechi și WS;
// (3) proba de ecran pe TOATE paginile din meniu la 390 px (scripts/proba-ecran-telefon.mjs, npm run test:ecran-telefon);
// (4) găsit de (3): pagina „Local data” arunca TypeError - rândurile localLiveV68/V69 scoase demult din pagină, codul încă le scria.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.122 · Telefonul: cardul de instalare, banda de sus, proba pe toate paginile · proba\n");

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
// regula se aplică la 390 px și NU pe PC (doar într-un @media max-width între 390 și 980)
const peTelefon = (selector, prop, val) => R.some((r) => r.sel.includes(selector) && maxW(r) >= 390 && maxW(r) <= 980 && !/min-width/.test(r.media)
  && new RegExp("(^|;)\\s*" + prop + "\\s*:\\s*" + val + "\\s*(!important)?\\s*(;|$)").test(r.corp));
const sus = (selector, prop, val) => R.some((r) => r.sel.includes(selector) && r.media === "" && new RegExp("(^|;)\\s*" + prop + "\\s*:\\s*" + val).test(r.corp));

// cardul de instalare: funcțiile REALE din app.js, cu ceas și stocare de probă
function cardul(zi, stoc) {
  const clase = new Set(), ceasuri = [];
  const ctx = {
    window: { matchMedia: () => ({ matches: false }), navigator: {} }, navigator: {},
    localStorage: { getItem: (k) => (k in stoc ? stoc[k] : null), setItem: (k, v) => { stoc[k] = String(v); }, removeItem: (k) => { delete stoc[k]; } },
    $: (id) => (id === "pwaInstallCard" ? { classList: { add: (c) => clase.add(c), remove: (c) => clase.delete(c) } } : null),
    setTimeout: (f, ms) => { ceasuri.push({ f, ms }); return ceasuri.length; },
    Date: class extends Date { constructor(...a) { super(...(a.length ? a : [zi])); } static now() { return new Date(zi).getTime(); } },
  };
  vm.runInNewContext(functia("isStandalonePwa") + functia("showPwaInstall") + ";this.arata=showPwaInstall;", ctx);
  return { arata: () => ctx.arata(), clase, ceasuri };
}

await test("(1a) cardul „Instalează” apare o dată pe zi; a doua oară în aceeași zi nu, a doua zi da", () => {
  const stoc = {};
  let c = cardul("2026-10-07T08:00:00", stoc); c.arata(); assert.ok(c.clase.has("on"), "prima dată apare");
  c = cardul("2026-10-07T21:00:00", stoc); c.arata(); assert.ok(!c.clase.has("on"), "a doua oară în aceeași zi NU");
  c = cardul("2026-10-08T07:00:00", stoc); c.arata(); assert.ok(c.clase.has("on"), "a doua zi iar");
});
await test("(1b) se ascunde singur după 15 s; închis cu × nu mai apare deloc (ca înainte)", () => {
  const c = cardul("2026-10-07T08:00:00", {}); c.arata();
  const t = c.ceasuri.find((x) => x.ms === 15000); assert.ok(t, "lipsește ascunderea după 15 s"); t.f(); assert.ok(!c.clase.has("on"));
  const d = cardul("2026-10-09T08:00:00", { pwaInstallDismissed: "1" }); d.arata(); assert.ok(!d.clase.has("on"));
});

await test("(2) pe telefon banda de sus pe un rând: banda botului fără rupere, fără moneda analizei vechi și WS; PC neschimbat", () => {
  assert.ok(peTelefon(".botStrip", "white-space", "nowrap"), "banda botului se rupe pe rânduri la 390 px");
  assert.ok(peTelefon(".topLeft", "display", "none"), "moneda analizei vechi + 4h/AUTO/BINANCE încă pe telefon");
  assert.ok(peTelefon("#wsStatus", "display", "none"), "WS încă pe telefon");
  assert.ok(sus(".botStrip", "white-space", "nowrap"), "pe PC banda rămâne pe un rând (v100.6)");
  assert.ok(!R.some((r) => r.media === "" && r.sel.includes(".topLeft") && /display\s*:\s*none/.test(r.corp)), "pe PC moneda rămâne");
  // ce cade când nu încape: tot mecanismul de la v100.6 (piața, azi, grid), numele / prețul / totalul rămân
  assert.match(functia("tbActualizeazaBanda"), /\["piata","zi","grid"\]\.forEach/);
});

await test("(3) proba de ecran pe toate paginile din meniu, la 390 px, separat de npm test (cere serverul)", () => {
  const p = JSON.parse(citeste("package.json")).scripts;
  assert.equal(p["test:ecran-telefon"], "node scripts/proba-ecran-telefon.mjs"); assert.ok(!/test:ecran-telefon/.test(p.test), "NU în npm test (cere serverul pe 8788)");
  const s = citeste("scripts", "proba-ecran-telefon.mjs");
  assert.match(s, /data-nav="\(\[a-z0-9\]\+\)"/, "lista paginilor citită din meniu, nu scrisă de mână"); assert.match(s, /BANDA_MAX = 100/); assert.match(s, /scrollWidth/); assert.match(s, /exceptionThrown/);
});

await test("(4) „Local data” nu mai aruncă: fiecare rând scris există în pagină sau scrierea e păzită", () => {
  const f = functia("refreshLocalDataPanel"), ids = [...f.matchAll(/\["[a-z_0-9]+","(local[A-Za-z0-9]+)"\]/g)].map((x) => x[1]);
  assert.ok(ids.length > 20, String(ids.length));
  const lipsa = ids.filter((id) => !html.includes(`id="${id}"`));
  assert.ok(lipsa.length === 0 || /for\(const \[t,id\] of pairs\)if\(\$\(id\)\)/.test(f), "lipsesc din pagină " + lipsa.join(", ") + " și scrierea nu e păzită");
});

await test("(E) versiunea de la v100.122 în sus (colectorul neatins, v101.82)", () => {
  assert.match(html, /content="v100\.1(2[2-9]|[3-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(2[2-9]|[3-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(2[2-9]|[3-9]\d)</);   // v100.123: lărgit
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(2[2-9]|[3-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(2[2-9]|[3-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(2[2-9]|[3-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(2[2-9]|[3-9]\d)$/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.82";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
