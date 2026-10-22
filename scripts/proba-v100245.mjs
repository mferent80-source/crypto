// Proba v100.245 (22.10, el: „fa idei”): coloanele se măsoară la rotirea ferestrei,
// istoricul tăiat își poartă fraza în title, pânda ține locul, filtrul stă pe acțiune.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.245 · ȚINE · proba\n");

function functie(src, nume, pana) {
  const i = src.indexOf("function " + nume + "(");
  assert.ok(i >= 0, "lipsă " + nume);
  return src.slice(i, src.indexOf("function " + pana + "("));
}

function dom() {
  function element(tag) {
    const el = { nodeType: 1, tagName: String(tag || "div").toUpperCase(), attrs: {}, className: "", childNodes: [], parentNode: null };
    el.getAttribute = (k) => (el.attrs[k] == null ? null : el.attrs[k]);
    el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
    el.removeAttribute = (k) => { delete el.attrs[k]; if (k === "class") el.className = ""; };
    el.appendChild = (n) => {
      if (n.parentNode) {
        const i = n.parentNode.childNodes.indexOf(n);
        if (i >= 0) n.parentNode.childNodes.splice(i, 1);
      }
      n.parentNode = el;
      el.childNodes.push(n);
      return n;
    };
    el.removeChild = (n) => {
      const i = el.childNodes.indexOf(n);
      if (i >= 0) el.childNodes.splice(i, 1);
      if (n.parentNode === el) n.parentNode = null;
      return n;
    };
    return el;
  }
  function text(v) { return { nodeType: 3, nodeValue: v, parentNode: null }; }
  function parse(html) {
    const out = [], st = [{ childNodes: out }];
    const re = /<\/([A-Za-z0-9]+)>|<([A-Za-z0-9]+)([^>]*)>|([^<]+)/g;
    let m;
    while ((m = re.exec(html))) {
      if (m[1]) { if (st.length > 1) st.pop(); continue; }
      if (m[2]) {
        const el = element(m[2]);
        const ar = /([A-Za-z0-9:-]+)="([^"]*)"/g; let am;
        while ((am = ar.exec(m[3] || ""))) el.setAttribute(am[1], am[2]);
        st[st.length - 1].childNodes.push(el);
        el.parentNode = st.length > 1 ? st[st.length - 1] : null;
        if (!/\/>$/.test(m[0])) st.push(el);
        continue;
      }
      if (m[4]) {
        const t = text(m[4]);
        st[st.length - 1].childNodes.push(t);
        t.parentNode = st.length > 1 ? st[st.length - 1] : null;
      }
    }
    return out;
  }
  return { parse };
}

function elem(n) { return n.childNodes.filter((c) => c.nodeType === 1); }
function textNod(n) { return n.childNodes.filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join("").replace(/\s+/g, " ").trim(); }

await test("sub 48 px coloanele stau; de la 48 px în sus se măsoară din nou, și doar dacă fereastra ascultă", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const lat = functie(fis, "sugLatime", "sugAplicLatime");
  const fer = functie(fis, "sugLaFereastra", "sugAscultaFereastra");
  const asc = functie(fis, "sugAscultaFereastra", "sugAlinia");
  assert.match(asc, /typeof addEventListener === "function"/);
  assert.match(asc, /addEventListener\("resize", sugLaFereastra\)/);
  assert.equal((fis.match(/sugAscultaFereastra\(\)/g) || []).length, 2);
  let latime = 900, apeluri = 0;
  const ctx = {
    sugStare: { latimeGrila: 912 },
    sugAplicLatime() { apeluri++; },
    document: { getElementById: () => ({ getBoundingClientRect: () => ({ width: latime }) }) },
  };
  vm.createContext(ctx);
  vm.runInContext(lat + "\n" + fer, ctx);
  ctx.sugLaFereastra();
  assert.equal(apeluri, 0, "900 față de 912 nu măsoară din nou");
  latime = 800;
  ctx.sugLaFereastra();
  assert.equal(apeluri, 1, "800 față de 912 măsoară din nou");
});

await test("istoricul poartă fraza în title; pânda ține 14em; ultima linie rămâne topLive", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const c = fis.slice(fis.indexOf("function sugCartela("), fis.indexOf("function sugUrm("));
  assert.match(c, /<p class="tbSub sugIstoric" title="' \+ sugEsc\(istoric\) \+ '">/);
  assert.match(c, /<p class="tbSub sugUrm" title="' \+ sugEsc\(urm\) \+ '">/);
  const css = citeste("public", "app.css");
  assert.match(css, /#sugPagina>\.sugPanda\{[^}]*min-height:14em/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("filtrul nou intră la mijloc, butonul vechi rămâne pe acțiunea lui, title-ul istoricului se schimbă", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const src = fis.slice(fis.indexOf("function sugAlinia("), fis.indexOf("function sugDeseneaza("));
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src + "\nthis.sugAlinia = sugAlinia;", ctx);
  const D = dom();
  const vechi = '<div class="sugPandaFiltre"><button type="button" class="t212BtnLinie ales" data-action-click="sugPanda(\'toate\')">toate (150)</button><button type="button" class="t212BtnLinie" data-action-click="sugPanda(\'contra\')">contra (20)</button></div>';
  const nou = '<div class="sugPandaFiltre"><button type="button" class="t212BtnLinie" data-action-click="sugPanda(\'toate\')">toate (151)</button><button type="button" class="t212BtnLinie" data-action-click="sugPanda(\'boti\')">monedele boților mei (1)</button><button type="button" class="t212BtnLinie ales" data-action-click="sugPanda(\'contra\')">contra (20)</button></div>';
  const cutie = D.parse(vechi)[0];
  const butoane = elem(cutie);
  const toate = butoane[0], contra = butoane[1];
  assert.equal(ctx.sugAlinia(cutie, D.parse(nou)[0]), true);
  const dupa = elem(cutie);
  assert.equal(dupa.length, 3);
  assert.equal(dupa[0], toate);
  assert.equal(dupa[2], contra);
  assert.notEqual(dupa[1], toate);
  assert.notEqual(dupa[1], contra);
  assert.equal(textNod(dupa[0]), "toate (151)");
  assert.equal(dupa[0].getAttribute("data-action-click"), "sugPanda('toate')");
  assert.equal(dupa[0].className.includes("ales"), false);
  assert.equal(dupa[2].className.includes("ales"), true);
  assert.equal(dupa[1].getAttribute("data-action-click"), "sugPanda('boti')");
  const p = D.parse('<p class="tbSub sugIstoric" title="fraza veche">fraza veche</p>')[0];
  assert.equal(ctx.sugAlinia(p, D.parse('<p class="tbSub sugIstoric" title="fraza noua intreaga">fraza noua intreaga</p>')[0]), true);
  assert.equal(p.getAttribute("title"), "fraza noua intreaga");
  assert.equal(textNod(p), "fraza noua intreaga");
});

await test("versiunea de la v100.245 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 245, P.version);   /* v100.246: insigna live nu mai e ȚINE */
  assert.equal(P.scripts["test:v100245"], "node scripts/proba-v100245.mjs");
  assert.equal((P.scripts.test.match(/test:v100245/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100244/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100245"], /npm run test:v100245/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
  assert.match(citeste("public", "app.css").trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
