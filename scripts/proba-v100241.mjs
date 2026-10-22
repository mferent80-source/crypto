// Proba v100.241 (22.10, el: „în ce spune piața acum tot se închide și deschide o fereastră”):
// rândurile citirii se rescriu la prețul viu. Plierea trebuie să fie gata în aceeași clipă,
// nu la tura de 1,5 s — altfel cardul se înalță și coboară, și graficul de lângă sare.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.241 · STĂ · proba\n");

function element(text) {
  const el = {
    textContent: text,
    attrs: {},
    kids: [],
    listeners: [],
    className: "",
    parentNode: null,
  };
  el.classList = {
    has: new Set(),
    add(...c) { c.forEach((x) => el.classList.has.add(x)); },
    remove(...c) { c.forEach((x) => el.classList.has.delete(x)); },
    contains(c) { return el.classList.has.has(c); },
    toggle(c) { if (el.classList.has.has(c)) { el.classList.has.delete(c); return false; } el.classList.has.add(c); return true; },
  };
  el.querySelector = (sel) => {
    const vrea = sel.split(",");
    const gaseste = (n) => {
      if (vrea.some((s) => n.tag === s.trim())) return n;
      for (const k of n.kids) { const g = gaseste(k); if (g) return g; }
      return null;
    };
    return gaseste(el);
  };
  el.setAttribute = (k, v) => { el.attrs[k] = v; };
  el.addEventListener = (tip, f) => { el.listeners.push(f); };
  el.click = () => { el.listeners.slice().forEach((f) => f()); };
  return el;
}

function citire(randuri) {
  const cit = element("");
  cit.tag = "div";
  cit.children = randuri;
  randuri.forEach((r) => { r.parentNode = cit; });
  Object.defineProperty(cit, "innerHTML", {
    set(h) {
      cit._h = h;
      cit.children = randuri.map((r) => element(r.textContent));
      cit.children.forEach((r, i) => { r.tag = randuri[i].tag; r.kids = randuri[i].kids; r.textContent = randuri[i].textContent; });
    },
    get() { return cit._h || ""; },
  });
  return cit;
}

function paznic(cit) {
  const doc = {
    documentElement: { classList: { add() {} } },
    addEventListener() {},
    getElementById: (id) => (id === "tbCitire" ? cit : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    hidden: false,
  };
  const ctx = { document: doc, setInterval() {}, setTimeout() {}, clearTimeout() {}, addEventListener() {}, innerWidth: 1440, localStorage: { getItem: () => null, setItem() {} }, console, __pzPauza: true };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "asezare-paznic.js"), ctx);
  return ctx.AsezarePaznic;
}

await test("după rescriere, rândul lung e pliat în aceeași clipă; rândul cu buton rămâne întreg", () => {
  const randuri = [element("pe scurt"), element("vocile"), element("Monte Carlo"), element("Trendul pe TF-uri: piața stă pe loc de mai multe ore și rândul e lung"), element("Busola")];
  randuri[2].kids = [{ tag: "button" }];
  randuri[4].kids = [{ tag: "a" }];
  const cit = citire(randuri);
  const A = paznic(cit);
  assert.equal(typeof A.pliaza, "function");
  cit.innerHTML = "rescris";
  assert.equal(cit.children[3].classList.contains("pzFold"), false);
  A.pliaza();
  assert.equal(cit.children[0].classList.contains("pzFold"), false);
  assert.equal(cit.children[2].classList.contains("pzFold"), false, "butonul rămâne deschis");
  assert.equal(cit.children[4].classList.contains("pzFold"), false, "linkul rămâne deschis");
  assert.equal(cit.children[3].classList.contains("pzFold"), true);
  cit.children[3].click();
  assert.equal(cit.children[3].classList.contains("pzFold"), false, "un clic deschide");
  cit.innerHTML = "rescris din nou";
  A.pliaza();
  assert.equal(cit.children[3].classList.contains("pzFold"), false, "rândul deschis de om rămâne deschis după rescriere");
});

await test("versiunea v100.241, insigna STĂ, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.241.0");
  assert.equal(P.scripts["test:v100241"], "node scripts/proba-v100241.mjs");
  assert.equal((P.scripts.test.match(/test:v100241/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100240/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100241"], /npm run test:v100241/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.241/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.241 · STĂ</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-241/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.241"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.241");
  assert.equal(info.badge, "v100.241 · STĂ");
  assert.equal(info.engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
  const css = citeste("public", "app.css");
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("scrierea citirii pliază înainte să se întoarcă, nu lasă rândurile înalte până la tura de 1,5 s", () => {
  const app = citeste("public", "app.js");
  const c = app.slice(app.indexOf("function tbDeseneazaCitire("), app.indexOf("function tbVociBilant("));
  const scrie = c.slice(c.indexOf("var scrie=function"));
  const html = scrie.indexOf("el.innerHTML=");
  const pliu = scrie.indexOf("AsezarePaznic.pliaza");
  assert.ok(html > 0 && pliu > html, "pliaza după innerHTML, în scrie");
  assert.ok(pliu < scrie.indexOf("};"), "înăuntrul lui scrie, nu după");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
