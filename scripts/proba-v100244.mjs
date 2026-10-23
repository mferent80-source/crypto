// Proba v100.244 (22.10, el: „fa idei și refă pagina de sugestii”):
// grila nu pierde o coloană la o bară de derulare, istoricul stă pe un rând,
// cele 8 blocuri sunt deja în pagină, un rând nou se adaugă fără să se rescrie restul.
// Verdictul stă lângă titlu, ca la Tablou. Nimic din listă nu se aruncă.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.244 · PLIN · proba\n");

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
    el.classList = { contains(c) { return el.className.split(/\s+/).includes(c); } };
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
        el.parentNode = st[st.length - 1].nodeType ? st[st.length - 1] : null;
        if (!/\/>$/.test(m[0])) st.push(el);
        continue;
      }
      if (m[4]) {
        const t = text(m[4]);
        st[st.length - 1].childNodes.push(t);
        t.parentNode = st[st.length - 1].nodeType ? st[st.length - 1] : null;
      }
    }
    return out;
  }
  return { parse };
}

function elem(n) { return n.childNodes.filter((c) => c.nodeType === 1); }
function dupa(n, tag) { return elem(n).find((c) => c.tagName === tag); }
function textNod(n) { return n.childNodes.filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join(""); }

await test("lățimea grilei se ține sub 48 px și nu inventează 1100 când nu se știe", () => {
  const src = functie(citeste("public", "lib", "sugestii-ecran.js"), "sugLatime", "sugAplicLatime");
  const sugLatime = vm.runInNewContext(src + "\nsugLatime");
  assert.equal(sugLatime(900, 912), 912);
  assert.equal(sugLatime(885, 912), 912);
  assert.equal(sugLatime(864, 912), 864);
  assert.equal(sugLatime(0, 0), 0);
  assert.equal(sugLatime(100, 0), 0);
  assert.equal(sugLatime(100, 500), 500);
});

await test("istoricul stă pe un rând; antetul e grilă de 6 ca la Tablou; ultima linie rămâne topLive", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#sugPagina \.sugIstoric,#sugPagina \.sugUrm\{[^}]*white-space:nowrap[^}]*min-height:1\.35em/);
  assert.match(css, /#sugestii\.on\{[^}]*grid-template-columns:repeat\(6/);
  assert.match(css, /#sugestii\.on:has\(>#pzV-sug:not\(\[hidden\]\)\)>\.sectionHead\{[^}]*grid-column:4 \/ -1/);
  assert.match(css, /#sugPagina>\[data-sug="trend"\]\{[^}]*order:50/);
  assert.match(css, /#sugPagina>\[data-sug="eu"\]\{[^}]*order:60/);
  assert.match(css, /@media \(max-width:1000px\)\{[^}]*#sugestii\.on\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("pagina ține cele 8 locuri și fraza de așteptare; pânda rămâne cu același început de marcaj", () => {
  const idx = citeste("public", "index.html");
  const i = idx.indexOf('id="sugPagina"');
  const j = idx.indexOf('id="carnet"');
  assert.ok(i > 0 && j > i);
  const bloc = idx.slice(i, j);
  assert.match(bloc, /Aștept sugestiile/);
  assert.deepEqual([...bloc.matchAll(/data-sug="([^"]+)"/g)].map((m) => m[1]), ["rasp", "panda", "boti", "us", "sect", "trend", "eu", "nota"]);
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  assert.ok(fis.includes('<div class="tbBloc sugPanda">'), "începutul pândei, proba v100.150");
  for (const k of ["rasp", "boti", "us", "sect", "trend", "eu", "nota"]) assert.ok(fis.includes('data-sug="' + k + '"'), k);
});

await test("un rând își păstrează nodul, 🧭 și „arată toate”; rândul nou se adaugă, cel dispărut iese", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const src = fis.slice(fis.indexOf("function sugAlinia("), fis.indexOf("function sugDeseneaza("));
  assert.ok(src.startsWith("function sugAlinia("), "sugAlinia");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src + "\nthis.sugAlinia = sugAlinia;", ctx);
  const D = dom();
  const vechi = '<ol class="sugTrendLista sugTrendTot"><li><button type="button" class="t212BtnLinie">AAA</button> <span class="tbSub">12-1 +1,0%</span> <a class="sugBusola" href="/b/AAA">x</a></li><li><button type="button" class="t212BtnLinie">BBB</button> <span class="tbSub">12-1 +2,0%</span> <a class="sugBusola" href="/b/BBB">x</a></li><li><button type="button" class="t212BtnLinie">CCC</button> <span class="tbSub">12-1 +3,0%</span> <a class="sugBusola" href="/b/CCC">x</a></li></ol>';
  const nou = '<ol class="sugTrendLista"><li><button type="button" class="t212BtnLinie">BBB</button> <span class="tbSub">12-1 +2,5%</span> <a class="sugBusola" href="/b/BBB">x</a></li><li><button type="button" class="t212BtnLinie">AAA</button> <span class="tbSub">12-1 +1,1%</span> <a class="sugBusola" href="/b/AAA">x</a></li><li><button type="button" class="t212BtnLinie">DDD</button> <span class="tbSub">nou</span> <a class="sugBusola" href="/b/DDD">x</a></li></ol>';
  const ol = D.parse(vechi)[0];
  const lis = elem(ol);
  const liA = lis[0], liB = lis[1], liC = lis[2];
  const ancora = dupa(liA, "A");
  const cifra = dupa(liA, "SPAN").childNodes.find((n) => n.nodeType === 3);
  assert.equal(ctx.sugAlinia(ol, D.parse(nou)[0]), true);
  const dupaLis = elem(ol);
  const nume = (li) => textNod(dupa(li, "BUTTON"));
  assert.deepEqual(dupaLis.map(nume), ["BBB", "AAA", "DDD"]);
  assert.equal(dupaLis[0], liB);
  assert.equal(dupaLis[1], liA);
  assert.notEqual(dupaLis[2], liA);
  assert.notEqual(dupaLis[2], liB);
  assert.notEqual(dupaLis[2], liC);
  assert.equal(liC.parentNode, null);
  assert.equal(ancora.parentNode, liA);
  assert.equal(ancora.getAttribute("href"), "/b/AAA");
  assert.equal(cifra.nodeValue, "12-1 +1,1%");
  assert.equal(dupa(liA, "SPAN").childNodes.includes(cifra), true);
  assert.equal(ol.classList.contains("sugTrendTot"), true);
  const cutie = D.parse('<div class="sugCartela"><p class="tbSub">unu</p><p class="tbSub">doi</p></div>')[0];
  const ps = elem(cutie);
  assert.equal(ctx.sugAlinia(cutie, D.parse('<div class="sugCartela"><p class="tbSub">unu schimbat</p><p class="tbSub">doi</p></div>')[0]), true);
  const ps2 = elem(cutie);
  assert.equal(ps2[0], ps[0]);
  assert.equal(ps2[1], ps[1]);
  assert.equal(textNod(ps2[0]), "unu schimbat");
  assert.equal(textNod(ps2[1]), "doi");
  const d = D.parse('<div><p class="tbSub">unu</p></div>')[0];
  assert.equal(ctx.sugAlinia(d, D.parse('<section><p class="tbSub">unu</p></section>')[0]), false);
  assert.equal(textNod(elem(d)[0]), "unu");
});

await test("desenarea nu golește pagina la primul desen și aliniază rândurile înainte de outerHTML", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  const d = fis.slice(fis.indexOf("function sugDeseneaza("), fis.indexOf("async function sugPorneste("));
  const pe = d.indexOf("sugPeLoc(");
  const html = d.indexOf("el.innerHTML");
  const al = d.indexOf("sugAlinia(");
  const ox = d.indexOf("outerHTML = parti[i]");
  assert.ok(pe > 0 && pe < html, "cifrele pe loc înainte de rescrierea paginii");
  assert.ok(al > 0 && al < ox, "rândurile se aliniază înainte de înlocuirea secțiunii");
  assert.match(d, /if \(sugAlinia\(vechi\[i\], nou\[i\]\)\) continue;/);
  assert.match(d, /peLoc = vechi\.length === nou\.length;/);
  assert.doesNotMatch(d, /peLoc = vechi\.length === nou\.length && el\._sugP/);
  assert.match(d, /if \(el\._sugP && el\._sugP\[i\] === parti\[i\]\) continue;/);
  assert.match(d, /else el\.innerHTML = h/);
  assert.ok(d.indexOf("sugTineTrend(") > html, "„arată toate” după rescriere");
  assert.ok(d.indexOf("sugAplicLatime(") > d.indexOf("sugTineTrend("));
  const ap = fis.slice(fis.indexOf("function sugAplicLatime("), fis.indexOf("function sugAlinia("));
  assert.match(ap, /sugLatime\(/);
  assert.match(ap, /\.sugGrila/);
  assert.match(ap, /\.sugSectGrid/);
  assert.match(ap, /gridTemplateColumns/);
});

await test("versiunea de la v100.244 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 244, P.version);   /* v100.245: insigna live nu mai e PLIN */
  assert.equal(P.scripts["test:v100244"], "node scripts/proba-v100244.mjs");
  assert.equal((P.scripts.test.match(/test:v100244/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100243/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100244"], /npm run test:v100244/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  const mv = citeste("scripts", "colector.mjs").match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/);
  assert.ok(mv && Number(mv[1]) >= 136);
  assert.match(citeste("public", "app.css").trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
