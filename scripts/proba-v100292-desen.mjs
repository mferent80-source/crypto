// Proba v100.292-desen (revizia Opus din 01.11 pe copia v100.292: 🔴1 graficul vechi cu etichetele noi, 🔴2 --n de la primul desen, 🟡5 aria-pressed
// și mutarea nodurilor la fiecare desen, 🟡6 cereri paralele / erori ținute în cache): sugDeseneaza pe un DOM FALS (parse + serializare, cât
// folosește alinierea pe loc) - lucruri pe care probele fără DOM (sugHtml proaspăt) nu le văd. DOM-ul fals: după simularea read-only a reviziei.
//   node scripts/proba-v100292-desen.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.292 · desenul pe loc, pe un DOM fals · proba\n");

// DOM-ul fals: elemente cu atribute, copii, innerHTML / outerHTML (parse + serializare), style.setProperty, querySelector pe „.clasă” / „#id”;
// <svg> are className ca în browser (SVGAnimatedString: String(...) dă „[object SVGAnimatedString]”, iar atribuirea e ignorată) - capcana reviziei
function dom() {
  let radacina = null, mutari = 0;
  const dec = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const stil = (s) => { const m = {}; String(s || "").split(";").forEach((p) => { const i = p.indexOf(":"); if (i > 0) m[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }); return m; };
  function element(tag) {
    const el = { nodeType: 1, tagName: String(tag).toUpperCase(), attrs: {}, childNodes: [], parentNode: null };
    Object.defineProperty(el, "className", { get() { const c = el.attrs.class || ""; return el.tagName === "SVG" ? { baseVal: c, toString() { return "[object SVGAnimatedString]"; } } : c; }, set(v) { if (el.tagName !== "SVG") el.attrs.class = String(v); } });
    Object.defineProperty(el, "id", { get() { return el.attrs.id || ""; } });
    el.getAttribute = (k) => (k in el.attrs ? el.attrs[k] : null);
    el.setAttribute = (k, v) => { el.attrs[k] = String(v); };
    el.removeAttribute = (k) => { delete el.attrs[k]; };
    el.appendChild = (n) => { if (n.parentNode) n.parentNode.removeChild(n); el.childNodes.push(n); n.parentNode = el; mutari++; return n; };
    el.removeChild = (n) => { const i = el.childNodes.indexOf(n); if (i >= 0) el.childNodes.splice(i, 1); n.parentNode = null; return n; };
    el.style = { setProperty(k, v) { const m = stil(el.attrs.style); m[k] = String(v); el.attrs.style = Object.entries(m).map(([a, b]) => a + ":" + b).join(";"); }, getPropertyValue(k) { return stil(el.attrs.style)[k] || ""; } };
    el.querySelector = (sel) => cauta(el, sel);
    Object.defineProperty(el, "children", { get() { return el.childNodes.filter((n) => n.nodeType === 1); } });
    Object.defineProperty(el, "firstElementChild", { get() { return el.children[0] || null; } });
    Object.defineProperty(el, "innerHTML", { get() { return el.childNodes.map(ser).join(""); }, set(h) { el.childNodes = parse(h); el.childNodes.forEach((n) => { n.parentNode = el; }); } });
    Object.defineProperty(el, "outerHTML", { get() { return ser(el); }, set(h) { const p = el.parentNode; if (!p) return; const nn = parse(h), i = p.childNodes.indexOf(el); p.childNodes.splice(i, 1, ...nn); nn.forEach((n) => { n.parentNode = p; }); el.parentNode = null; } });
    Object.defineProperty(el, "clientWidth", { get() { return 700; } });
    el.getBoundingClientRect = () => ({ width: 1000 });
    return el;
  }
  function cauta(n, sel) {   // „.clasă” sau „#id”: primul potrivit, în adâncime (fără nodul de pornire)
    for (const c of n.childNodes || []) {
      if (c.nodeType !== 1) continue;
      const ok = sel[0] === "#" ? c.attrs.id === sel.slice(1) : (" " + (c.attrs.class || "") + " ").indexOf(" " + sel.slice(1) + " ") >= 0;
      if (ok) return c;
      const g = cauta(c, sel); if (g) return g;
    }
    return null;
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function ser(n) { if (n.nodeType === 3) return esc(n.nodeValue); return "<" + n.tagName.toLowerCase() + Object.entries(n.attrs).map(([k, v]) => " " + k + '="' + String(v).replace(/"/g, "&quot;") + '"').join("") + ">" + n.childNodes.map(ser).join("") + "</" + n.tagName.toLowerCase() + ">"; }
  function parse(html) {
    const out = [], st = [{ childNodes: out, el: null }];
    const re = /<!--[\s\S]*?-->|<\/([A-Za-z0-9]+)>|<([A-Za-z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g; let m;
    while ((m = re.exec(html))) {
      if (m[1]) { if (st.length > 1) st.pop(); continue; }
      if (m[2]) { const el = element(m[2]); const ar = /([A-Za-z0-9:_-]+)="([^"]*)"/g; let am; while ((am = ar.exec(m[3] || ""))) el.setAttribute(am[1], dec(am[2]));
        const top = st[st.length - 1]; top.childNodes.push(el); el.parentNode = top.el; if (!/\/\s*$/.test(m[3] || "") && !/^(br|img|input|hr|meta|link)$/i.test(m[2])) st.push({ childNodes: el.childNodes, el }); continue; }
      if (m[4]) { const top = st[st.length - 1]; top.childNodes.push({ nodeType: 3, nodeValue: dec(m[4]), parentNode: top.el }); }
    }
    return out;
  }
  const document = { createElement: element, getElementById: (id) => (!radacina ? null : radacina.attrs.id === id ? radacina : cauta(radacina, "#" + id)) };
  return { document, element, ser, setRad: (r) => { radacina = r; }, mutari: () => mutari, zeroMutari: () => { mutari = 0; } };
}

const ACUM = Date.parse("2026-11-02T10:00:00Z"), ZI = 86400000;
const cl = { la: ACUM - 600000, monede: ["HYPE", "CC", "SUI", "ADA", "XRP"].map((s, i) => ({ simbol: s + "_USDT_PERP", stare: "candidat", dir: i % 2 ? "short" : "long", tarie: "mediu", regim: { r4h: 0.01, r24h: 0.01, miscare: false }, volum: 5e6, pret: 1 + i, latime: 0.08, pas: 0.003, grile: 28, profitGrila: 0.0026, traversariZi: 15, scor: 0.01 - i * 0.001 })) };
const idei = { idei: { judecate: 203, reveniri: [{ ticker: "CRBP_US_EQ", simbol: "CRBP", pret: 4.22, cadere: 0.63, deLaMin: 0.09, zileDeLaMin: 4, stop: 3.83, tinta: 11.6 }] } };
const bare = (c) => Array.from({ length: 20 }, (_, i) => ({ time: ACUM - (20 - i) * ZI, open: 1, high: 2, low: 0.5, close: c }));
const D0 = dom(), rad = D0.element("div"); D0.setRad(rad);
// scheletul paginii, cum e în index.html (cele 5 locuri)
rad.innerHTML = '<div class="card full" id="sugPagina"><p class="rlRasp" data-sug="rasp">Aștept sugestiile…</p><div class="tbBloc sugPanda" data-sug="panda"><div class="tbBlocCap sugPandaCap"><h4>Lățimea pieței · 150 perp-uri Binance</h4><span class="tbSub"></span></div><p class="tbSub">Aștept sugestiile…</p></div><div class="sugVerdicte" data-sug="verdicte"></div><section class="rlSec sugLista2" data-sug="lista"><div class="sugPandaCap"><h4>Sugestiile</h4><span class="tbSub">Aștept sugestiile…</span></div></section><p class="tbSub" data-sug="nota">Regulile au fost fixate înainte de cifre și nu se ajustează după istoric.</p></div>';
const ctx = { console, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  Idei: { ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 5) },
  Busola: { adresaBusola: (q) => "https://busola.local/?s=" + q.simbol + "&tf=" + q.tf },
  GraficBot: { desen: (q) => ({ svg: '<svg class="gbSvg" viewBox="0 0 700 300"><path class="gbC" d="M0 ' + q.bare[0].c + '"></path><text x="1" y="2">' + q.bare[0].c + '</text></svg>', legenda: "leg", valori: "" }) },
  getJSON: async (u) => ({ randuri: bare(/SUI/.test(u) ? 333 : /HYPE/.test(u) ? 111 : 222) }),
  navTo() {}, setTimeout, clearTimeout, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, Promise, TextRo: globalThis.TextRo, document: D0.document };
vm.createContext(ctx);
for (const f of ["latime.js", "reveniri.js", "sugestii-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
const pag = D0.document.getElementById("sugPagina"), byId = (id) => D0.document.getElementById(id), corp = () => pag.querySelector(".sugCorp");
const semn = (n) => n.tagName + (n.attrs.id ? "#" + n.attrs.id : n.tagName === "H4" ? ":" + ((n.childNodes[0] && n.childNodes[0].nodeValue) || "").slice(0, 12) : "");
const proaspat = () => { const t = D0.element("div"); t.innerHTML = ctx.sugHtml(ctx.sugStare.d, Date.now()); return t.querySelector(".sugCorp"); };
const col1 = () => corp().children.filter((x) => x.attrs.id !== "sugFisa").length;

await test("1. --n urmează rândurile reale după FIECARE desen (gol → clasament → idei); ordinea din DOM e cea proaspătă; 5 locuri de sus", () => {
  ctx.sugStare.d = {}; ctx.sugDeseneaza();
  assert.equal(pag.children.length, 5); assert.ok(corp(), "lista are .sugCorp");
  assert.equal(corp().style.getPropertyValue("--n"), String(col1()));
  ctx.sugStare.d.clasament = cl; ctx.sugDeseneaza();
  assert.ok(col1() >= 10, "5 rânduri de boți + titlurile + golurile"); assert.equal(corp().style.getPropertyValue("--n"), String(col1()), "--n după al doilea desen (pe loc)");
  ctx.sugStare.d.idei = idei; ctx.sugDeseneaza();
  assert.equal(corp().style.getPropertyValue("--n"), String(col1()), "--n după al treilea desen");
  assert.deepEqual(corp().children.map(semn), proaspat().children.map(semn), "ordinea din DOM = ordinea din HTML-ul proaspăt");
  assert.ok(!corp().children.some((n) => /order:/.test(n.attrs.style || "")), "fără order");
});
await test("2. sugAlege: nodurile rândurilor rămân (aliniate), clasa și aria-pressed urmează alegerea, fișa stă chiar după rândul ales", async () => {
  const hype = byId("sugR-porn:HYPE"), sui = byId("sugR-porn:SUI");
  assert.equal(hype.attrs["aria-pressed"], "true");
  await ctx.sugAlege("porn:SUI");
  assert.equal(byId("sugR-porn:SUI"), sui, "același nod"); assert.equal(sui.attrs.class, "sugRand ales"); assert.equal(sui.attrs["aria-pressed"], "true");
  assert.equal(byId("sugR-porn:HYPE"), hype); assert.equal(hype.attrs.class, "sugRand"); assert.equal(hype.attrs["aria-pressed"], "false");
  const k = corp().children; assert.equal(k[k.indexOf(sui) + 1].attrs.id, "sugFisa");
  assert.equal(corp().style.getPropertyValue("--n"), String(col1()));
});
await test("3. graficul: HYPE → SUI → HYPE, toate în cache: SVG-ul din DOM e al rândului ales (înlocuit întreg, nu „aliniat”), cu clasa gbSvg", async () => {
  await ctx.sugAlege("porn:HYPE"); await ctx.sugAlege("porn:SUI"); await ctx.sugAlege("porn:HYPE");
  const svg = byId("sugGraf").querySelector(".gbSvg"); assert.ok(svg, "svg-ul are clasa gbSvg, nu „[object SVGAnimatedString]”: " + D0.ser(byId("sugGraf")).slice(0, 160));
  assert.equal(svg.children[0].attrs.d, "M0 111"); assert.equal(svg.children[1].childNodes[0].nodeValue, "111");
  await ctx.sugAlege("porn:SUI");
  const s2 = byId("sugGraf").querySelector(".gbSvg"); assert.ok(s2); assert.equal(s2.children[0].attrs.d, "M0 333"); assert.equal(s2.children[1].childNodes[0].nodeValue, "333");
});
await test("4. un desen care schimbă doar texte nu mută niciun nod (focusul rămâne pe rând)", () => {
  ctx.sugStare.d.clasament.monede[2].pret = 3.5;   // SUI, rândul ales: prețul se schimbă în rând și în fișă
  D0.zeroMutari(); ctx.sugDeseneaza();
  assert.equal(D0.mutari(), 0, "appendChild-uri la un desen cu aceeași ordine");
  assert.match(D0.ser(byId("sugR-porn:SUI")), /3,5/);
});
await test("5. sugGraficAdu: trei apeluri paralele pe aceeași cheie = O cerere; graficul bun expiră după 5 minute; eroarea nu rămâne în cache (se cere din nou)", async () => {
  let n = 0, pica = false;
  ctx.getJSON = async () => { n++; await new Promise((r) => setTimeout(r, 10)); if (pica) throw new Error("cade"); return { randuri: bare(222) }; };
  ctx.sugStare.ales = "porn:ADA"; ctx.sugStare.tf = null; ctx.sugDeseneaza(); const r = ctx.sugRandAles(); assert.equal(r.k, "porn:ADA");
  await Promise.all([ctx.sugGraficAdu(r), ctx.sugGraficAdu(r), ctx.sugGraficAdu(r)]); assert.equal(n, 1, "o singură cerere");
  const g = ctx.sugStare.graf["porn:ADA|4h"]; assert.ok(g && g.la > 0 && /gbSvg/.test(g.html), "intrarea din cache: {la, html}");
  g.la -= 6 * 60000; await ctx.sugGraficAdu(r); assert.equal(n, 2, "după 5 minute se aduce din nou");
  pica = true; ctx.sugStare.ales = "porn:XRP"; ctx.sugDeseneaza(); const r2 = ctx.sugRandAles();
  await ctx.sugGraficAdu(r2); assert.equal(n, 3); assert.match(D0.ser(byId("sugGraf")), /N-am putut aduce lumânările: cade/);
  pica = false; await ctx.sugGraficAdu(r2); assert.equal(n, 4, "după eroare se cere din nou"); assert.match(D0.ser(byId("sugGraf")), /gbSvg/);
});
await test("6. 4h → 1z: butoanele intervalului poartă aria-pressed după alegere (pe loc)", async () => {
  const btn = (tf) => { let g = null; (function w(n) { if (n.nodeType === 1) { if ((n.attrs["data-action-click"] || "") === "sugAlegeTf('" + tf + "')") g = n; n.childNodes.forEach(w); } })(byId("sugFisa")); return g; };
  assert.equal(btn("4h").attrs["aria-pressed"], "true");
  await ctx.sugAlegeTf("1z");
  assert.equal(btn("1z").attrs["aria-pressed"], "true"); assert.equal(btn("4h").attrs["aria-pressed"], "false");
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
