// Proba v100.243 (22.10, el: „lucrează și la pagina de sugestii în aceleași condiții”):
// pagina nu se mai rescrie întreagă la fiecare răspuns. Cifrele și vârsta se schimbă
// în nodurile existente. Un bloc nou își înlocuiește doar secțiunea. „arată toate” rămâne.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.243 · LOC · proba\n");

function functie(src, nume, pana) {
  const i = src.indexOf("function " + nume + "(");
  assert.ok(i >= 0, "lipsă " + nume);
  return src.slice(i, src.indexOf("function " + pana + "("));
}

await test("vârsta lățimii stă pe un rând; ultima linie din CSS rămâne topLive", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#sugPagina \.sugPandaCap\{[^}]*flex-wrap:nowrap/);
  assert.match(css, /#sugPagina \.sugPandaCap>\.tbSub\{[^}]*white-space:nowrap/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("scheletul sugestiei ignoră cifrele și clasa „arată toate”; un rând nou nu e același schelet", () => {
  const src = functie(citeste("public", "lib", "sugestii-ecran.js"), "sugSchelet", "sugAcelasiNod");
  const sugSchelet = vm.runInNewContext(src + "\nsugSchelet");
  const a = '<section class="rlSec sugTrend"><ol class="sugTrendLista"><li><span class="tbSub">12-1 +1,0%</span></li></ol></section>';
  const b = '<section class="rlSec sugTrend"><ol class="sugTrendLista sugTrendTot"><li><span class="tbSub">12-1 +1,1%</span></li></ol></section>';
  const c = a.replace("</ol>", "<li><span class=\"tbSub\">nou</span></li></ol>");
  assert.equal(sugSchelet(a), sugSchelet(b));
  assert.notEqual(sugSchelet(a), sugSchelet(c));
});

function dom() {
  function element(tag) {
    const el = { nodeType: 1, tagName: String(tag || "div").toUpperCase(), attrs: {}, className: "", childNodes: [], parentNode: null };
    el.getAttribute = (k) => (el.attrs[k] == null ? null : el.attrs[k]);
    el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
    Object.defineProperty(el, "firstElementChild", { get() { return el.childNodes.find((n) => n.nodeType === 1) || null; } });
    Object.defineProperty(el, "children", { get() { return el.childNodes.filter((n) => n.nodeType === 1); } });
    Object.defineProperty(el, "outerHTML", { get() { return serialize(el); } });
    Object.defineProperty(el, "innerHTML", {
      get() { return el.childNodes.map(serialize).join(""); },
      set(h) { el.childNodes = parse(h); el.childNodes.forEach((n) => { n.parentNode = el; }); },
    });
    el.classList = { add(c) { const p = el.className.split(/\s+/).filter(Boolean); if (!p.includes(c)) p.push(c); el.className = p.join(" "); el.attrs.class = el.className; }, contains(c) { return el.className.split(/\s+/).includes(c); } };
    el.querySelector = (sel) => cauta(el, sel);
    return el;
  }
  function text(v) { return { nodeType: 3, nodeValue: v, parentNode: null }; }
  function serialize(n) {
    if (n.nodeType === 3) return n.nodeValue.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const a = Object.entries(n.attrs).map(([k, v]) => " " + k + "=\"" + v + "\"").join("");
    return "<" + n.tagName.toLowerCase() + a + ">" + n.childNodes.map(serialize).join("") + "</" + n.tagName.toLowerCase() + ">";
  }
  function parse(html) {
    const out = [], st = [{ childNodes: out }];
    const re = /<!--[\s\S]*?-->|<\/([A-Za-z0-9]+)>|<([A-Za-z0-9]+)([^>]*)>|([^<]+)/g;
    let m;
    while ((m = re.exec(html))) {
      if (m[1]) { if (st.length > 1) st.pop(); continue; }
      if (m[2]) {
        const el = element(m[2]);
        const ar = /([A-Za-z0-9:-]+)="([^"]*)"/g; let am;
        while ((am = ar.exec(m[3] || ""))) el.setAttribute(am[1], am[2]);
        st[st.length - 1].childNodes.push(el);
        if (!/\/>$/.test(m[0])) st.push(el);
        continue;
      }
      if (m[4]) st[st.length - 1].childNodes.push(text(m[4].replace(/&amp;/g, "&").replace(/&lt;/g, "<")));
    }
    return out;
  }
  function cauta(n, sel) {
    const cls = sel.startsWith(".") ? sel.slice(1) : "";
    for (const c of n.childNodes) {
      if (c.nodeType !== 1) continue;
      if (cls && c.className.split(/\s+/).includes(cls)) return c;
      const g = cauta(c, sel); if (g) return g;
    }
    return null;
  }
  return { createElement: element, parse };
}

await test("la același schelet cifrele se schimbă în același nod; un rând nou nu se scrie pe loc", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const src = fis.slice(fis.indexOf("function sugSchelet("), fis.indexOf("function sugDeseneaza("));
  assert.ok(src.includes("function sugPeLoc("), "sugPeLoc");
  const D = dom();
  const ctx = { document: { createElement: D.createElement } };
  vm.createContext(ctx);
  vm.runInContext(src + "\nthis.sugPeLoc = sugPeLoc;", ctx);
  const a = '<section class="rlSec sugTrend"><ol class="sugTrendLista"><li><span class="tbSub">12-1 +1,0%</span></li></ol></section>';
  const b = '<section class="rlSec sugTrend"><ol class="sugTrendLista"><li><span class="tbSub">12-1 +1,1%</span></li></ol></section>';
  const rad = D.createElement("div");
  rad.innerHTML = a;
  const sect = rad.firstElementChild;
  sect.querySelector(".sugTrendLista").classList.add("sugTrendTot");
  const nod = sect.querySelector(".tbSub").childNodes[0];
  assert.equal(ctx.sugPeLoc(sect, b), true);
  assert.equal(nod.nodeValue, "12-1 +1,1%");
  assert.equal(sect.querySelector(".tbSub").childNodes[0], nod, "același nod");
  assert.equal(sect.querySelector(".sugTrendLista").classList.contains("sugTrendTot"), true);
  const c = a.replace("</ol>", "<li><span class=\"tbSub\">nou</span></li></ol>");
  assert.equal(ctx.sugPeLoc(sect, c), false);
});

await test("desenarea schimbă secțiunea pe loc înainte de innerHTML și ține „arată toate”", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const d = fis.slice(fis.indexOf("function sugDeseneaza("), fis.indexOf("async function sugPorneste("));
  const pe = d.indexOf("sugPeLoc(");
  const html = d.indexOf("el.innerHTML");
  assert.ok(pe > 0 && pe < html, "cifrele pe loc înainte de rescrierea paginii");
  assert.match(d, /outerHTML = parti\[i\]/);
  assert.ok(d.indexOf("sugTineTrend(") > html, "lista deschisă se pune la loc după rescriere");
  const tot = fis.slice(fis.indexOf("function sugTrendTot("), fis.indexOf("function sugHtml("));
  assert.match(tot, /sugStare\.trendTot = true/);
});

await test("versiunea v100.243, insigna LOC, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.243.0");
  assert.equal(P.scripts["test:v100243"], "node scripts/proba-v100243.mjs");
  assert.equal((P.scripts.test.match(/test:v100243/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100242/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100243"], /npm run test:v100243/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.243/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.243 · LOC</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-243/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.243"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.243");
  assert.equal(info.badge, "v100.243 · LOC");
  assert.equal(info.engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
