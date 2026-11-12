// Proba v100.316 (10.11.2026, el: îl deranjează culorile, ordinea, aglomerația, literele ⇒ „Aplică desenul nou în Radar”):
// desenul nou al Tabloului botului = un strat de stil peste DOM-ul existent + tema deschisă generată din foaia veche + paleta de zi a graficului.
// Ce ține proba: generatorul (parserul pe acolade, selectorii, paleta), blocul generat la zi, stratul scris de mână la locul lui,
// tema comutată din buton și ținută minte, graficul pe paleta temei, nimic scos din pagină (doar Monte Carlo o singură dată), versiunile.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";
import { reguli, imparte, fararaComentarii, culoareNoua, selectorSub, genereaza, faraBloc, blocDin, INCEPUT, SFARSIT, PALETA } from "./face-tema-tablou.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), GB = citeste("public", "lib", "grafic-bot.js");

console.log("Proba v100.316 - desenul nou al Tabloului botului");

await test("parserul: comentarii, șiruri cu acolade, @media și @container imbricate, @keyframes sărit", () => {
  const css = fararaComentarii('/* a{b:c} */ .x{color:#141C24;content:"}{"} @media (max-width:640px){.y{font-size:11px} @container (min-width:1px){.z{color:#E6EDF3}}} @keyframes k{from{opacity:0}to{opacity:1}} .w{background:rgba(159,179,196,.16)}');
  const r = reguli(css);
  assert.equal(r.length, 4); assert.equal(r[0].sel, ".x"); assert.ok(r[0].corp.includes('content:"}{"'));
  assert.equal(r[1].at, "@media (max-width:640px)"); assert.equal(r[1].copii.length, 2); assert.equal(r[1].copii[1].copii[0].sel, ".z");
  assert.equal(r[2].at, "@keyframes k"); assert.ok(!r[2].copii); assert.equal(r[3].sel, ".w");
  assert.deepEqual(imparte(".a:is(.b,.c), .d", ","), [".a:is(.b,.c)", ".d"]);
});
await test("paleta: fundalul închis devine alb, textul deschis devine cerneală; galbenul e maroniu ca text și galben ca fond; rgba își ține transparența", () => {
  assert.equal(culoareNoua("background", "#141C24"), "#FFFFFF"); assert.equal(culoareNoua("color", "#e6edf3"), "#0E1A2B");
  assert.equal(culoareNoua("color", "#E9B949"), "#8A5A00"); assert.equal(culoareNoua("border", "1px solid #E9B949"), "1px solid #E0A526");
  assert.equal(culoareNoua("border-top", "1px solid rgba(159,179,196,.16)"), "1px solid rgba(14,26,43,.16)");
  assert.equal(culoareNoua("color", "#123456"), "#123456", "o culoare din afara paletei rămâne");
  for (const [k, v] of Object.entries(PALETA)) assert.match(typeof v === "string" ? v : v.text + v.fond, /^(#[0-9A-F]{6})+$/, k);
});
// v100.326 (el: „pagina Trading 212 … în aceleași condiții ca și pagina botului”): două rădăcini - comunele sub :is(#tabloubot,#t212), T212 sub #t212
await test("selectorii: totul intră sub rădăcina Tabloului (și a paginii T212, v100.326); regulile altor pagini și ale rădăcinii se sar", () => {
  const S = ["scan"], C = ":is(#tabloubot,#t212,#dash).tbZi";   // v100.329: Piața azi e rădăcină, Scan e pagina străină
  assert.equal(selectorSub(".tbBloc", "#tabloubot.tbZi", S), C + " .tbBloc");
  assert.equal(selectorSub("#tabloubot .gbTip", "#tabloubot.tbZi", S), "#tabloubot.tbZi .gbTip");
  assert.equal(selectorSub(".pzDemo #tabloubot .tbCadru>#tbMcSus", "#tabloubot.tbZi", S), ".pzDemo #tabloubot.tbZi .tbCadru>#tbMcSus");
  assert.equal(selectorSub("html.pzDemo .pzCel", "#tabloubot.tbZi", S), "html.pzDemo " + C + " .pzCel");
  assert.equal(selectorSub("#scan .scNiv, .x", "#tabloubot.tbZi", S), C + " .x", "selectorul paginii Scan cade, vecinul lui rămâne");
  assert.equal(selectorSub("#t212 .a", "#tabloubot.tbZi", S), "#t212.tbZi .a"); assert.equal(selectorSub(":root", "#tabloubot.tbZi", S), "");
  assert.equal(selectorSub("#tabloubotX .a", "#tabloubot.tbZi", S), C + " #tabloubotX .a", "alt id care doar începe la fel nu e Tabloul");
});
await test("generatorul: variabilele rădăcinii, scara de litere pe 5 trepte, @media păstrat, doar declarațiile schimbate", () => {
  const g = genereaza(":root{--pzF1:#141C24;--x:4px} .a{color:#E6EDF3;margin:0;font-size:11px} @media (max-width:640px){.a{font-size:17px;background:#141C24}} #scan .b{color:#E6EDF3} .c{font-size:13.5px;color:red}", '<section class="panel" id="scan"></section><section class="panel" id="tabloubot"></section>');
  assert.ok(g.startsWith(INCEPUT) && g.endsWith(SFARSIT));
  // v100.326: rădăcina comună :is(#tabloubot,#t212)
  assert.ok(g.includes(":is(#tabloubot,#t212,#dash).tbZi{--pzF1:#FFFFFF}")); assert.ok(g.includes(":is(#tabloubot,#t212,#dash).tbZi .a{color:#0E1A2B}")); assert.ok(g.includes(":is(#tabloubot,#t212,#dash) .a{font-size:12px}"));
  assert.ok(g.includes("@media (max-width:640px){:is(#tabloubot,#t212,#dash) .a{font-size:20px}}")); assert.ok(g.includes("@media (max-width:640px){:is(#tabloubot,#t212,#dash).tbZi .a{background:#FFFFFF}}"));
  assert.ok(!g.includes(".b{") && !g.includes(".c{") && !g.includes("margin"), "nimic din pagina Scan, nimic neschimbat");
  const o = genereaza(".offlineBanner{background:#E9B949;color:#0E141A} .x{background:#141C24;color:#E6EDF3}", "");
  assert.ok(o.includes(":is(#tabloubot,#t212,#dash).tbZi .offlineBanner{background:#E0A526;color:#0E1A2B}"), "pe fond galben textul rămâne închis: " + o);
  assert.ok(o.includes(":is(#tabloubot,#t212,#dash).tbZi .x{background:#FFFFFF;color:#0E1A2B}"));
});
await test("blocul generat din public/app.css e cel produs acum din restul foii (altfel: node scripts/face-tema-tablou.mjs)", () => {
  assert.equal(CSS.split(INCEPUT).length, 2); assert.equal(CSS.split(SFARSIT).length, 2);
  const NL = CSS.includes("\r\n") ? "\r\n" : "\n";
  assert.equal(blocDin(CSS), genereaza(faraBloc(CSS), HTML).split("\n").join(NL));
  const bloc = blocDin(CSS); assert.ok(bloc.length > 20000, "blocul are " + bloc.length + " caractere"); assert.ok(!/#(sugestii|comportament|scan)\b/.test(bloc), "în bloc nu intră alte pagini (T212 da, din v100.326; Piața azi da, din v100.329)");
  assert.equal((bloc.match(/{/g) || []).length, (bloc.match(/}/g) || []).length, "acolade pereche");
});
await test("stratul scris de mână stă DUPĂ blocul generat și ÎNAINTEA pândei (coada foii rămâne a ei) și ține așezarea: capul paginii, graficul, Monte Carlo o singură dată, telefonul", () => {
  const CAP = "/* v100.316: sfârșitul desenului nou */", strat = CSS.slice(CSS.indexOf(SFARSIT) + SFARSIT.length, CSS.indexOf(CAP) + CAP.length);
  assert.ok(CSS.indexOf(CAP) > CSS.indexOf(SFARSIT)); assert.equal(pandaInainteaCozii(CSS), "", "pânda și blocul v100.224 rămân ultimele");
  assert.deepEqual((strat.match(/border-radius:[^;}]+/g) || []).filter((v) => !v.includes("var(") && !v.includes("%") && parseFloat(v.split(":")[1]) > 5), [], "colțuri de cel mult 5 px (tema PAZNIC)");
  assert.ok(strat.includes("/* v100.316 (el, 10.11.2026") && strat.includes("/* v100.316: sfârșitul desenului nou */"));
  assert.equal((strat.match(/{/g) || []).length, (strat.match(/}/g) || []).length, "acolade pereche");
  for (const s of [
    ".pzDemo #tabloubot .tbCadru>.sectionHead{order:1}", ".pzDemo #tabloubot .tbCadru>#pzVerdict{order:2}", ".pzDemo #tabloubot .tbCadru>.tbSus{order:3}",
    ".pzDemo #tabloubot .tbCadru>#pzDrumCard{order:5}", ".pzDemo #tabloubot .tbCadru>.tbGraficRand{order:8}", ".pzDemo #tabloubot .tbCadru>#tbMcSus{order:34}",
    ".pzDemo #tabloubot .tbCadru>#ctAcum{order:2}", "html.pzDemo #tabloubot.on .tbCadru>#ctAcum{grid-column:5 / -1;grid-row:span 3;", ".pzDemo #tabloubot .tbCadru>.tbSus{order:14}",
    "html.pzDemo #tabloubot *{font-family:inherit!important}", "html.pzDemo #tabloubot{color:var(--pzT0)}",
    "html.pzDemo #tabloubot .tbCadru:has(>#tbMcSus:not([hidden])) #tbCitire .tbCitMc>*{display:none}",
  ]) assert.ok(strat.includes(s), "lipsește: " + s);
  /* v100.317: rândurile pliate nu-și desenează copiii (rămân în pagină) - a doua și ultima ascundere din strat */
  assert.ok(!/display:none/.test(strat.replace(/#tbCitire \.tbCitMc>\*\{display:none\}/, "").replace(/\[data-rand="pliat"\]>\*\{display:none!important\}/, "")), "stratul nu ascunde nimic în afară de dublura Monte Carlo și de copiii rândurilor pliate");
  assert.ok(CSS.includes("#tabloubot .tbCadru:has(>#tbMcSus:not([hidden])) #tbCitireMobil .tbCitMc{display:none}"), "regula veche de pe telefon rămâne");
});
await test("tema: implicit deschisă, butonul o comută și se ține minte; clasa tbZi pe #tabloubot; graficul primește paleta ei", () => {
  assert.ok(HTML.includes('<button type="button" class="actionGhost" id="tbTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă închisă</button>'));   /* v100.317: înaintea lui stau „Deschide tot” / „Strânge tot” */
  assert.ok(HTML.includes('<section class="panel" id="tabloubot">'), "eticheta panoului rămâne cum o citesc probele vechi");
  assert.match(APP, /var ACTIUNI_PERMISE=new Set\("(?:tbRandToate )?tbTemaComuta /);
  const i = APP.indexOf('var TB_TEMA_KEY="tbTema";'), j = APP.indexOf("function tbComutaInd(k){"); assert.ok(i > 0 && j > i);
  const cod = APP.slice(i, j).replace(/if\(typeof window!=="undefined"\)window\.addEventListener\("DOMContentLoaded"[^\n]*/, "");
  const mem = {}, clase = new Set(), buton = { textContent: "", attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }; let temaGrafic = null, desene = 0, vizibil = true;
  // v100.326 (revizia): comutatorul desenează graficul Tabloului doar cât Tabloul se vede (de pe T212 nu)
  const ctx = { localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } }, GraficBot: { tema: (n) => { temaGrafic = n; } }, renderTabloGrafic: () => { desene++; }, tbPanouVizibil: () => vizibil,
    document: { getElementById: (id) => (id === "tabloubot" ? { classList: { toggle: (c, on) => { on ? clase.add(c) : clase.delete(c); } } } : id === "tbTemaBtn" ? buton : null) } };
  vm.createContext(ctx); vm.runInContext(cod + ";this.tbTemaAplica=tbTemaAplica;this.tbTemaComuta=tbTemaComuta;this.tbTemaZi=tbTemaZi", ctx);
  assert.equal(ctx.tbTemaAplica(), true); assert.ok(clase.has("tbZi")); assert.equal(temaGrafic, "zi"); assert.equal(buton.textContent, "Temă închisă"); assert.equal(buton.attrs["aria-pressed"], "false");
  ctx.tbTemaComuta(); assert.equal(mem.tbTema, "noapte"); assert.ok(!clase.has("tbZi")); assert.equal(temaGrafic, "noapte"); assert.equal(buton.textContent, "Temă deschisă"); assert.equal(desene, 1);
  ctx.tbTemaComuta(); assert.equal(mem.tbTema, "zi"); assert.ok(clase.has("tbZi")); assert.equal(desene, 2);
  vizibil = false; ctx.tbTemaComuta(); assert.equal(mem.tbTema, "noapte"); assert.equal(desene, 2, "Tabloul ascuns: tema se schimbă, graficul lui nu se desenează");
  assert.ok(APP.includes("  tbTemaAplica();   /* v100.316: tema e pusă înaintea desenului"), "renderTabloGrafic pune tema înaintea desenului");
});
await test("graficul: tema(\"zi\") schimbă paleta citită la desen, tema(\"noapte\") o pune la loc exact; rândul vechi al paletei rămâne", () => {
  assert.ok(GB.includes('fond: "#0E141A", grila: "#26333F", intrare: "#9FB3C4" };   /* demo tema PAZNIC */'));
  const ctx = { window: {}, TextRo: globalThis.TextRo, console }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(GB, ctx);
  const G = ctx.GraficBot || ctx.window.GraficBot; assert.ok(G && typeof G.tema === "function");
  const noapte = JSON.stringify(G.COL); assert.equal(G.COL.fond, "#0E141A");
  assert.equal(G.tema("zi"), "zi"); assert.equal(G.COL.fond, "#FFFFFF"); assert.equal(G.COL.text, "#16202B"); assert.notEqual(G.COL.good, "#26A96C");
  assert.equal(G.tema("noapte"), "noapte"); assert.equal(JSON.stringify(G.COL), noapte);
  assert.equal(G.tema("altceva"), "noapte", "un nume necunoscut = paleta de noapte");
});
await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json; verificarea temei e în lanțul de teste", () => {
  const B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json")), V = "3(?:1[6-9]|[2-9]\\d)";
  assert.equal((HTML.match(new RegExp("v100\\." + V, "g")) || []).length, 4); assert.equal((HTML.match(/v100\.315/g) || []).length, 0);
  assert.match(citeste("public", "sw.js"), new RegExp('const CACHE="crypto-radar-v100-' + V + '";'));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + V + '"'));
  assert.match(B.version, new RegExp("^v100\\." + V + "$")); assert.ok(B.features.desenNou316); assert.match(P.version, new RegExp("^100\\." + V + "\\."));
  assert.ok(P.scripts.test.includes("npm run test:v100316")); assert.ok(P.scripts["test:v100316"].includes("face-tema-tablou.mjs --check"));
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
