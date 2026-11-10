// Proba v100.315 (10.11.2026, el: „pe chart când dau click să nu mai apară popup cu datele alea”): pe graficul din Tabloul botului
// eticheta cu datele lumânării (.gbTip: deschidere / maxim / minim / RSI / EMA / „dacă închizi la”) nu se mai arată - nici la clic,
// nici la trecerea mouse-ului, nici la focus pe un punct de alertă. Crucea și prețul din scară rămân (design.md, secțiunea 5).
//
// Rulează legăturile ADEVĂRATE din renderTabloGrafic (bucata de după desen, tăiată din public/app.js) pe un DOM fals:
// mută pointerul, apasă, atinge cu degetul, dă focus pe un punct - și se uită ce s-a întâmplat cu eticheta, crucea și prețul din scară.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };

const APP = citeste("public", "app.js");
const iStart = APP.indexOf('var zona=el.querySelector(".gbZona")'), iEnd = APP.indexOf("function renderTabloDovada(){");
assert.ok(iStart > 0 && iEnd > iStart, "nu găsesc legăturile graficului în app.js");
const LEG = APP.slice(iStart, APP.lastIndexOf("}", iEnd));   // corpul, fără acolada care închide renderTabloGrafic

// DOM fals: doar ce ating legăturile
function nod(nume) {
  const n = { nume, hidden: true, innerHTML: "", style: { display: "none" }, attrs: {}, asc: {}, copii: {}, offsetWidth: 180, offsetHeight: 120, textContent: "",
    setAttribute(k, v) { n.attrs[k] = String(v); }, getAttribute(k) { return n.attrs[k]; },
    addEventListener(t, f) { (n.asc[t] = n.asc[t] || []).push(f); },
    trimite(t, e) { (n.asc[t] || []).forEach((f) => f(e)); },
    querySelector(s) { return n.copii[s] || null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600 }; } };
  return n;
}
function scena() {
  const zona = nod("zona"), svg = nod("svg"), tip = nod("tip"), cr = nod("cruce"), crY = nod("cruceY"), crP = nod("crucePret"), el = nod("el");
  crP.copii = { text: nod("text"), rect: nod("rect") };
  svg.copii = { ".gbCruce": cr, ".gbCruceY": crY, ".gbCrucePret": crP };
  zona.copii = { svg, ".gbTip": tip };
  el.copii = { ".gbZona": zona };
  const bare = Array.from({ length: 100 }, (_, i) => ({ t: i * 300000, o: 1, h: 1.1, l: 0.9, c: 1.05, v: 10, k: i }));
  const d = { harta: { W: 1000, plotW: 948, sus: 0, mainH: 400, cw: 9.48, lo: 1, hi: 2, bare, grupuri: [], S: { rsi: [], e20: [], e50: [] }, per: "24h" } };
  let chematTip = 0;
  const GraficBot = { tip() { chematTip++; return "<b>12:00</b>deschidere 1"; }, pretLaY(h, sy) { return sy >= 0 && sy <= h.mainH ? h.lo + (1 - sy / h.mainH) * (h.hi - h.lo) : null; }, fmtP(p) { return p.toFixed(4); } };
  new Function("el", "d", "b", "GraficBot", "tbLaPret", LEG)(el, d, { id: "1" }, GraficBot, () => () => "<b>dacă închizi</b>");
  return { zona, svg, tip, cr, crY, crP, cateTip: () => chematTip };
}
const eticheta = (s) => s.tip.hidden === false || s.tip.innerHTML !== "";

console.log("Proba v100.315 - graficul botului fără etichetă");

await test("mouse-ul trecut peste lumânări: eticheta NU apare; crucea și prețul din scară apar", () => {
  const s = scena(); s.zona.trimite("pointermove", { pointerType: "mouse", clientX: 300, clientY: 200 });
  assert.equal(eticheta(s), false, "eticheta s-a arătat la trecerea mouse-ului");
  assert.equal(s.cr.style.display, "", "crucea verticală"); assert.equal(s.crY.style.display, "", "crucea orizontală"); assert.equal(s.crP.style.display, "", "prețul din scară");
  assert.equal(s.crP.copii.text.textContent, "1.5000");
});
await test("CLIC cu mouse-ul pe grafic: eticheta NU apare", () => {
  const s = scena(); s.zona.trimite("pointerdown", { pointerType: "mouse", clientX: 300, clientY: 200, target: { closest: () => null } });
  assert.equal(eticheta(s), false, "eticheta s-a arătat la clic"); assert.equal(s.cr.style.display, "");
});
await test("atingere cu degetul (telefon): eticheta NU apare; crucea rămâne după ce ridici degetul", () => {
  const s = scena(); s.zona.trimite("pointerdown", { pointerType: "touch", clientX: 300, clientY: 200, target: { closest: () => null } });
  assert.equal(eticheta(s), false, "eticheta s-a arătat la atingere");
  s.zona.trimite("pointerleave", {}); assert.equal(s.cr.style.display, "", "crucea trebuie să rămână fixată pe telefon");
});
await test("focus (sau clic) pe un punct de alertă: eticheta NU apare", () => {
  const s = scena(), punct = { querySelector: () => ({ getBoundingClientRect: () => ({ left: 400, top: 420, width: 14, height: 14 }) }) };
  s.svg.trimite("focusin", { target: { closest: (q) => (q === ".gbE" ? punct : null) } });
  assert.equal(eticheta(s), false, "eticheta s-a arătat la focus pe punctul de alertă");
});
await test("textul etichetei nici nu se mai compune (GraficBot.tip nu e chemat la mișcare)", () => {
  const s = scena(); for (let x = 10; x < 900; x += 50) s.zona.trimite("pointermove", { pointerType: "mouse", clientX: x, clientY: 150 });
  assert.equal(s.cateTip(), 0);
});
await test("pointerul iese din lumânări: în scară rămâne doar prețul; afară de tot se stinge crucea", () => {
  const s = scena(); s.zona.trimite("pointermove", { pointerType: "mouse", clientX: 300, clientY: 200 });
  s.zona.trimite("pointermove", { pointerType: "mouse", clientX: 970, clientY: 200 });
  assert.equal(s.cr.style.display, "none", "crucea verticală nu stă în scară"); assert.equal(s.crP.style.display, "", "prețul din scară rămâne");
  s.zona.trimite("pointerleave", {}); assert.equal(s.crP.style.display, "none"); assert.equal(s.crY.style.display, "none");
});
await test("ce NU se pierde: punctele de alertă au <title>, rândul cu ultimele alerte stă sub grafic, biblioteca păstrează tip() pentru probele vechi", () => {
  const G = citeste("public", "lib", "grafic-bot.js");
  assert.match(G, /<g class="gbE" data-g="' \+ ui \+ '" tabindex="0"><title>/); assert.match(G, /tip: tip,/);
  assert.ok(APP.includes("'<div class=\"gbUlt\">'"), "rândul cu ultimele 3 alerte");
  assert.match(APP, /zona\.addEventListener\("pointerdown",function\(e\)\{if\(e\.target&&e\.target\.closest&&e\.target\.closest\("\.gbSem"\)\)return;/);
});
await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json", () => {
  const H = citeste("public", "index.html"), B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json"));
  assert.equal((H.match(/v100\.3(?:1[5-9]|[2-9]\d)/g) || []).length, 4); assert.equal((H.match(/v100\.314/g) || []).length, 0);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-3(?:1[5-9]|[2-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.3(?:1[5-9]|[2-9]\d)"/);
  assert.match(B.version, /^v100\.3(?:1[5-9]|[2-9]\d)$/); assert.ok(B.features.faraEticheta315); assert.match(P.version, /^100\.3(?:1[5-9]|[2-9]\d)\./);
  assert.ok(P.scripts.test.includes("npm run test:v100315"));
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
