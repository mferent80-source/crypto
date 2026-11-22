// Proba v100.376 (21.11.2026, el: „deci nu mai facem nimic vizual? e bine așa?” ⇒ cele trei cusururi rămase ⇒ „livrează și fă-le”):
//   A  I-920: rândurile celor 4 cifre stau în blocul „Detaliile cifrelor” la orice lățime; sub 1181 px banda (doar cifrele) urcă sub verdict, iar rândul
//      de cost merge și el în bloc, după rândurile „din grid”; nimic dublat, nimic pierdut, nicio mutație la desenele care nu schimbă nimic;
//   B  I-918: sub 1181 px rândurile fără semn din lista „Ce spune piața acum” se strâng sub un buton numărat; starea ține minte;
//   C  I-917: capul pe două coloane când cutia lui are loc (interogare de container);
//   D  ramele graficului se dau la o parte și la 641–1180 px (capitolele din v100.375 erau incomplete acolo); doar așezare; versiunea.
//   E  („FA IDEI”) I-916 cuprinsul capitolelor sub 1181 px; I-919 starea de azi în titlul fiecărui capitol, citită de pe ecran;
//   F  („arată și zero botului chiar dacă nu e în grid”) zero-ul pe poziția de acum, arătat când din preț, în grid, botul nu mai ajunge pe zero.
//   H  („pune și «atinge TP» la fel cum faci cu margine și cu stop”) take-profit-ul în cap: banii de acolo și șansa de a-l atinge, din Monte Carlo;
//   G  („FA IDEI”, a doua oară) „Pe zero, din grile” lângă el; zero-ul pe poziția de acum și pe Drum; cuprinsul lipit sub bara de sus pe calculator.
//   node scripts/proba-v100376.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.376 · Tabloul botului: cifrele sub verdict și pe telefon, rândurile fără semn strânse, capul pe două coloane, tableta · proba\n");

const HTML = citeste("public", "index.html"), CSS = citeste("public", "app.css"), APP = citeste("public", "app.js");
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const A0 = "/* v100.376 design: început */", A1 = "/* v100.376 design: sfârșit */";
const BLOC = CSS.slice(CSS.indexOf(A0), CSS.indexOf(A1)), faraComentarii = BLOC.replace(/\/\*[\s\S]*?\*\//g, "");
/* regulile unui bloc CSS, cu @media / @container desfăcute: [{ sel, decl, media }] */
function reguli(css) {
  const out = []; let media = "", i = 0;
  while (i < css.length) {
    const a = css.indexOf("{", i), z = css.indexOf("}", i); if (a < 0) break;
    if (z >= 0 && z < a) { media = ""; i = z + 1; continue; }
    const cap = css.slice(i, a).trim();
    if (cap.startsWith("@")) { media = cap; i = a + 1; continue; }
    const b = css.indexOf("}", a); out.push({ sel: cap.replace(/\s+/g, " "), decl: css.slice(a + 1, b).trim(), media }); i = b + 1;
  }
  return out;
}
const R = reguli(faraComentarii), P = "html.pzDemo #tabloubot#tabloubot#tabloubot.on:not(.tbFaraBot) .tbCadru";
const una = (media, re) => { const r = R.filter((x) => x.media === media && re.test(x.sel)); assert.equal(r.length, 1, media + " " + re + ": " + r.length); return r[0]; };
const ord = (r) => Number(/order:(\d+)!important/.exec(r.decl)[1]);
const B375 = reguli(CSS.slice(CSS.indexOf("/* v100.375 design: început */"), CSS.indexOf("/* v100.375 design: sfârșit */")).replace(/\/\*[\s\S]*?\*\//g, ""));
const ord375 = (id) => Number(/order:(\d+)/.exec(B375.find((x) => x.sel.endsWith(id) && /^order:/.test(x.decl)).decl)[1]);

/* ---------- un DOM mic, cât pentru mutările celor două funcții ---------- */
let mutatii = 0;
class Nod {
  constructor(id) { this.id = id; this.children = []; this.parentNode = null; this.hidden = false; }
  _scoate(c) { if (c.parentNode) { const k = c.parentNode.children.indexOf(c); c.parentNode.children.splice(k, 1); c.parentNode = null; } }
  appendChild(c) { this._scoate(c); this.children.push(c); c.parentNode = this; mutatii++; return c; }
  insertBefore(c, ref) { this._scoate(c); const k = ref ? this.children.indexOf(ref) : -1; if (k < 0) this.children.push(c); else this.children.splice(k, 0, c); c.parentNode = this; mutatii++; return c; }
  get nextSibling() { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) + 1] || null : null; }
  get previousElementSibling() { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) - 1] || null : null; }
}
function paginaCifre() {
  const el = {}, n = (id, par) => { const x = new Nod(id); el[id] = x; if (par) { par.children.push(x); x.parentNode = par; } return x; };
  const kpi = n("tbKpi"), dest = n("tbKpiDetalii"); dest.hidden = true;
  const cel = [0, 1, 2, 3].map((i) => n("cel" + i, kpi)), col = [0, 1, 2, 3].map((i) => n("col" + i, dest));
  col.forEach((c, i) => n("et" + i, c));
  /* cum stau în index.html: toate în celula cifrei lor */
  n("lab0", cel[0]); n("tbKpiTotal", cel[0]); n("tbKpiGrid", cel[0]); n("tbKpiCost", cel[0]); n("tbKpiTotalSub", cel[0]); n("tbKpiTotalViu", cel[0]);
  n("lab1", cel[1]); n("tbKpiLich", cel[1]); n("tbKpiLichSub", cel[1]);
  n("lab2", cel[2]); n("tbKpiPret", cel[2]); n("tbKpiPretSub", cel[2]);
  n("lab3", cel[3]); n("tbKpiPiata", cel[3]); n("tbKpiPiataSub", cel[3]);
  const st = { lat: false, avert: 0 };
  const ctx = vm.createContext({ $: (id) => el[id] || null, matchMedia: () => ({ matches: st.lat }), window: { addEventListener() {} }, tbAvertGazda: () => { st.avert++; } });
  vm.runInContext(/var TB_KPI_DET=\[[^;]+;/.exec(APP)[0] + functie(APP, "tbKpiAsezare"), ctx);
  /* rândurile cheie–valoare le pune stratul de așezare, imediat după proza lor (asezare-paznic.js) */
  const kv = (id) => { const s = el[id], r = new Nod(id + "Kv"); el[id + "Kv"] = r; s.parentNode.insertBefore(r, s.nextSibling); };
  return { el, cel, col, dest, st, ruleaza: () => vm.runInContext("tbKpiAsezare()", ctx), kv, ids: (x) => x.children.map((c) => c.id) };
}

await test("A1 telefon: rândurile fiecărei cifre pleacă din celulă în blocul de sub grafic, pe coloana cifrei; în bandă rămân doar numele și cifra; blocul se arată", () => {
  const p = paginaCifre(); p.ruleaza();
  assert.deepEqual(p.ids(p.cel[0]), ["lab0", "tbKpiTotal"]); assert.deepEqual(p.ids(p.cel[1]), ["lab1", "tbKpiLich"]); assert.deepEqual(p.ids(p.cel[2]), ["lab2", "tbKpiPret"]); assert.deepEqual(p.ids(p.cel[3]), ["lab3", "tbKpiPiata"]);
  assert.deepEqual(p.ids(p.col[0]), ["et0", "tbKpiGrid", "tbKpiCost", "tbKpiTotalSub", "tbKpiTotalViu"], "rândul de cost stă după „din grid”, ca în celulă");
  assert.deepEqual(p.ids(p.col[1]), ["et1", "tbKpiLichSub"]); assert.deepEqual(p.ids(p.col[2]), ["et2", "tbKpiPretSub"]); assert.deepEqual(p.ids(p.col[3]), ["et3", "tbKpiPiataSub"]);
  assert.equal(p.dest.hidden, false, "blocul „Detaliile cifrelor” se vede și sub 1181 px"); assert.equal(p.st.avert, 1);
});

await test("A2 telefon, după ce stratul de așezare pune rândurile cheie–valoare: costul rămâne după rândurile „din grid”; desenele următoare nu mai mută nimic", () => {
  const p = paginaCifre(); p.ruleaza(); p.kv("tbKpiGrid"); p.kv("tbKpiTotalSub"); p.ruleaza();
  assert.deepEqual(p.ids(p.col[0]), ["et0", "tbKpiGrid", "tbKpiGridKv", "tbKpiCost", "tbKpiTotalSub", "tbKpiTotalSubKv", "tbKpiTotalViu"]);
  const m0 = mutatii; p.ruleaza(); p.ruleaza(); p.ruleaza(); assert.equal(mutatii, m0, "trei desene la rând, zero mutări (auditul din 23.10: doar ce s-a schimbat)");
});

await test("A3 calculator: rândurile în bloc (ca din v100.322), costul rămâne în bandă sub „Rezultat total”; la îngustarea și lărgirea ferestrei se reașază, fără dubluri", () => {
  const p = paginaCifre(); p.st.lat = true; p.ruleaza(); p.kv("tbKpiGrid");
  assert.deepEqual(p.ids(p.cel[0]), ["lab0", "tbKpiTotal", "tbKpiCost"]); assert.deepEqual(p.ids(p.col[0]), ["et0", "tbKpiGrid", "tbKpiGridKv", "tbKpiTotalSub", "tbKpiTotalViu"]); assert.equal(p.dest.hidden, false);
  p.st.lat = false; p.ruleaza(); assert.deepEqual(p.ids(p.cel[0]), ["lab0", "tbKpiTotal"]); assert.deepEqual(p.ids(p.col[0]), ["et0", "tbKpiGrid", "tbKpiGridKv", "tbKpiCost", "tbKpiTotalSub", "tbKpiTotalViu"]);
  p.st.lat = true; p.ruleaza(); assert.deepEqual(p.ids(p.cel[0]), ["lab0", "tbKpiTotal", "tbKpiCost"]); assert.deepEqual(p.ids(p.col[0]), ["et0", "tbKpiGrid", "tbKpiGridKv", "tbKpiTotalSub", "tbKpiTotalViu"]);
  const toate = [...p.cel, ...p.col].flatMap((x) => p.ids(x)); assert.equal(new Set(toate).size, toate.length, "niciun nod de două ori"); assert.equal(toate.length, 4 * 2 + 4 + 8, "4 cifre cu numele lor, 4 etichete de coloană, 8 rânduri (din grid + rândurile lui, costul, din investiți, la prețul viu, lichidarea, prețul, piața)");
  const m0 = mutatii; p.ruleaza(); assert.equal(mutatii, m0);
});

await test("A4 așezarea: sub 1181 px banda urcă sub verdict (ordinea 3, înaintea Drumului), blocul rândurilor vine după grafic și „ultimii boți”; pe tabletă 4 cifre pe un rând, pe telefon un grup pe rând", () => {
  const M = "@media (max-width:1180px)";
  assert.equal(ord(una(M, /\.tbCadru>\.tbSus$/)), 3);
  const ct = ord(una(M, /\.tbCadru>#ctAcum:not\(\[hidden\]\)$/)); assert.ok(ct > 5 && ct < 11, "„Contează acum” după Drum (5) și înaintea graficului (11), și când e gol - la 900–1180 px urca deasupra verdictului: " + ct);
  const cap = ord(una(M, /#tbGraficCard>\.tbBlocCap$/)), gr = ord(una(M, /#tbGraficCard>#tbGrafic$/)), ul = ord(una(M, /#tbGraficCard>#pzUltimii$/)), det = una(M, /\.tbCadru>#tbKpiDetalii:not\(\[hidden\]\)$/);
  assert.ok(3 < cap && cap < gr && gr < ul && ul < ord(det) && ord(det) < ord375("#tbCap-decizia"), "cifrele (3) < capul graficului < graficul < ultimii boți < rândurile cifrelor < capitolul Decizia");
  assert.match(det.decl, /display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/); assert.match(det.decl, /grid-column:1 \/ -1!important/);
  assert.match(una("@media (min-width:641px) and (max-width:1180px)", />\.tbSus>#tbKpi$/).decl, /^grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.equal(una("@media (max-width:640px)", />#tbKpiDetalii:not\(\[hidden\]\)$/).decl, "grid-template-columns:minmax(0,1fr)");
  assert.match(CSS, /#tabloubot\.tbFaraBot #tbKpiDetalii\{display:none!important\}/, "pagina „niciun bot” ține blocul ascuns (regula veche)");
  /* toate regulile vechi care se aprind când blocul e vizibil stau în @media de la 1181 px în sus - altfel s-ar aprinde acum și pe telefon */
  const tot = reguli(CSS.replace(/\/\*[\s\S]*?\*\//g, "")).filter((x) => /:has\(>#tbKpiDetalii:not\(\[hidden\]\)\)/.test(x.sel));
  assert.ok(tot.length >= 40, "regulile cu :has(#tbKpiDetalii): " + tot.length); for (const x of tot) assert.match(x.media, /^@media \(min-width:(1181|1700)px\)/, x.sel.slice(0, 90) + " ← " + (x.media || "fără media"));
  assert.match(functie(APP, "tbInaltColoanaGrafic"), /matchMedia\("\(min-width:1181px\)"\)\.matches\)return 0;/, "înălțimea graficului „pe coloane” rămâne doar pe calculator");
});

/* ---------- B: rândurile fără semn ---------- */
function paginaLista(clase, o = {}) {
  const cls = (init) => { const s = new Set(init); return { contains: (c) => s.has(c), toggle: (c, on) => { if (on) s.add(c); else s.delete(c); }, _s: s }; };
  const randuri = clase.map((c) => ({ classList: cls(c.split(" ")) }));
  const m = { classList: cls([]), querySelectorAll: (sel) => { assert.equal(sel, ".tbCitR.info"); return randuri.filter((r) => r.classList.contains("info")); } };
  const atr = { "aria-expanded": "false" }, b = { hidden: true, textContent: "", getAttribute: (k) => atr[k], setAttribute: (k, v) => { atr[k] = v; } };
  const mem = Object.assign({}, o.mem || {}), el = { tbCitireMobil: m, tbCitGri: b, tbMcSus: o.mcSus === undefined ? null : { hidden: !o.mcSus } };
  const ctx = vm.createContext({ $: (id) => el[id] || null, TextRo: globalThis.TextRo, localStorage: o.faraMem ? { getItem() { throw new Error("blocat"); }, setItem() { throw new Error("blocat"); } } : { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } } });
  vm.runInContext(/var TB_CIT_GRI_KEY="[^"]+";/.exec(APP)[0] + ["tbCitGriStare", "tbCitGriPune", "tbCitGriComuta", "tbCitGri"].map((f) => functie(APP, f)).join("\n"), ctx);
  return { m, b, atr, mem, randuri, r: (cod) => vm.runInContext(cod, ctx) };
}
const LISTA = ["tbCitR rau", "tbCitR info", "tbCitR atentie", "tbCitR info vechi", "tbCitR bine", "tbCitR info"];

await test("B1 strâns (starea de pornire): butonul numără rândurile fără semn - doar pe cele „info”; roșiile, galbenele și verzile nu intră în număr", () => {
  const p = paginaLista(LISTA); p.r("tbCitGri()");
  assert.equal(p.b.hidden, false); assert.equal(p.b.textContent, "▸ încă 3 informații fără semn"); assert.equal(p.atr["aria-expanded"], "false"); assert.equal(p.m.classList.contains("tbCitGriDeschis"), false);
  const unu = paginaLista(["tbCitR rau", "tbCitR info"]); unu.r("tbCitGri()"); assert.equal(unu.b.textContent, "▸ încă 1 informație fără semn");
  const multe = paginaLista(Array.from({ length: 21 }, () => "tbCitR info")); multe.r("tbCitGri()"); assert.equal(multe.b.textContent, "▸ încă 21 de informații fără semn", "de la 20, cu „de”");
});

await test("B2 atingerea butonului deschide și ține minte; a doua atingere strânge; fără rânduri gri butonul nu se arată", () => {
  const p = paginaLista(LISTA); p.r("tbCitGri()"); p.r("tbCitGriComuta()");
  assert.equal(p.m.classList.contains("tbCitGriDeschis"), true); assert.equal(p.b.textContent, "▾ fără semn: 3 informații · strânge"); assert.equal(p.atr["aria-expanded"], "true"); assert.deepEqual(p.mem, { tbCitGriDeschisV1: "1" });
  p.r("tbCitGriComuta()"); assert.equal(p.m.classList.contains("tbCitGriDeschis"), false); assert.equal(p.b.textContent, "▸ încă 3 informații fără semn"); assert.deepEqual(p.mem, { tbCitGriDeschisV1: "0" });
  const gol = paginaLista(["tbCitR rau", "tbCitR atentie"]); gol.r("tbCitGri()"); assert.equal(gol.b.hidden, true); assert.equal(gol.b.textContent, "");
  const tinut = paginaLista(LISTA, { mem: { tbCitGriDeschisV1: "1" } }); tinut.r("tbCitGri()"); assert.equal(tinut.m.classList.contains("tbCitGriDeschis"), true, "starea salvată se regăsește la pornire");
  const blocat = paginaLista(LISTA, { faraMem: true }); blocat.r("tbCitGri()"); blocat.r("tbCitGriComuta()"); assert.equal(blocat.m.classList.contains("tbCitGriDeschis"), true, "cu stocarea blocată butonul tot merge, cât ține pagina");
});

await test("B3 rândul Monte Carlo din copia de telefon tace cât cardul lui de sus e vizibil ⇒ nu se numără; fără card, se numără", () => {
  const cuCard = paginaLista(["tbCitR info tbCitMc", "tbCitR info"], { mcSus: true }); cuCard.r("tbCitGri()"); assert.equal(cuCard.b.textContent, "▸ încă 1 informație fără semn");
  const faraCard = paginaLista(["tbCitR info tbCitMc", "tbCitR info"], { mcSus: false }); faraCard.r("tbCitGri()"); assert.equal(faraCard.b.textContent, "▸ încă 2 informații fără semn");
});

await test("B4 legăturile: lista își reface numărul la fiecare desen (și când doar clasele s-au schimbat pe loc); „Deschide tot” / „Strânge tot” schimbă și starea asta; butonul e în pagină, permis", () => {
  assert.match(functie(APP, "tbDeseneazaCitire"), /var scrie=function\(h\)\{scrie0\(h\);tbCitGri\(\)\},scrie0=function\(h\)\{if\(tbStare\.citireH===h\)return;/);
  assert.match(functie(APP, "tbRandToate"), /pzFoldToate\(!!deschis\);if\(typeof tbCitGriPune==="function"\)tbCitGriPune\(!!deschis\)\}$/);
  assert.match(HTML, /<div class="tbCitireMobil" id="tbCitireMobil"><\/div><\/div><button type="button" class="tbCitGri" id="tbCitGri" hidden aria-controls="tbCitireMobil" aria-expanded="false" data-action-click="tbCitGriComuta\(\)"><\/button><section class="tbTodo" id="tbTodo"/, "butonul stă după rama graficului, în afara zonei pe care lista o rescrie");
  assert.match(APP, /ACTIUNI_PERMISE=new Set\("[^"]*\btbCitGriComuta\b/);
  assert.equal((APP.match(/function tbCitGri\(/g) || []).length, 1); assert.equal((APP.match(/function tbCitGriComuta\(/g) || []).length, 1);
});

await test("B5 foaia de stil: sub 1181 px rândurile „info” ale copiei de telefon se ascund cât lista nu e deschisă; butonul stă între listă și „Piața azi”; peste 1180 px nu există", () => {
  const M = "@media (max-width:1180px)";
  assert.equal(una(M, /#tbCitireMobil:not\(\.tbCitGriDeschis\) \.tbCitR\.info$/).decl, "display:none");
  const b = una(M, /#tbCitGri:not\(\[hidden\]\)$/); assert.ok(ord(b) > ord375("#tbCitireMobil") && ord(b) < ord375(">.piataAzi"), "ordinea butonului: " + ord(b));
  assert.match(b.decl, /min-height:44px/, "țintă de atingere de 44 px"); assert.ok(R.some((x) => !x.media && x.sel === "#tabloubot .tbCitGri" && x.decl === "display:none"));
  assert.equal(R.filter((x) => /tbCitR\.info/.test(x.sel)).length, 1, "o singură regulă ascunde rânduri - doar în copia de telefon, nu în cartela de pe calculator");
});

await test("C1 capul pe două coloane când cutia lui are cel puțin 900 px (prinde și 1024 și 1280): banda de cifre sus pe toată lățimea, barele șanselor în stânga, notele în dreapta, prețul sus", () => {
  assert.ok(R.some((x) => !x.media && x.sel === "html.pzDemo #tabloubot #pzVerdict" && x.decl === "container:pzcap / inline-size"));
  const M = "@container pzcap (min-width:900px)", T = "html.pzDemo #tabloubot #pzVerdict .pzVerbTxt.pzMarg";
  assert.match(una(M, /\.pzVerbTxt\.pzMarg$/).decl, /^display:grid;grid-template-columns:minmax\(0,1\.05fr\) minmax\(0,1fr\);column-gap:44px;grid-auto-flow:row dense;/);
  assert.equal(R.find((x) => x.media === M && x.sel === T + ">*").decl, "grid-column:2;min-width:0");
  assert.equal(R.find((x) => x.media === M && x.sel === T + ">:is(b,.pzMargFapt,.pzMargMut,.pzLedger,.pzMargExp,.pzMargBani)").decl, "grid-column:1 / -1");
  assert.equal(R.find((x) => x.media === M && x.sel === T + ">:is(.pzMetru,.pzMargSanse,.pzMargAfara)").decl, "grid-column:1");
  assert.equal(R.find((x) => x.media === M && x.sel === T + ">.pzMetru:not(:has(~.pzMetru))").decl, "grid-row:span 24", "ultima bară ține restul coloanei: notele din dreapta nu lasă goluri în stânga");
  assert.equal(R.filter((x) => x.media === M && /grid-row:span/.test(x.decl)).length, 1);
  assert.equal(R.find((x) => x.media === M && /\.pzVerbRand>\.pzPret$/.test(x.sel)).decl, "align-self:flex-start");
  const Mi = "@container pzcap (min-width:900px) and (max-width:1149px)"; assert.equal(R.find((x) => x.media === Mi && x.sel === T + ">.pzMetru").decl, "grid-template-columns:minmax(0,1fr)", "în cutia îngustă eticheta barelor stă deasupra lor (trei bare pe 60 px nu se citesc)");
  assert.equal(R.find((x) => x.media === Mi && x.sel === T + ">.pzMetru>.pzMetruSursa").decl, "grid-column:1");
  /* marcajul capului rămâne pe un singur nivel: regulile vechi „.pzMarg>p…” țin de copiii direcți */
  const pz = citeste("public", "lib", "asezare-paznic.js"); assert.match(pz, /corpV = '<div class="pzVerbTxt pzMarg"><b>'/); assert.equal(/pzCapDoua|pzCapA|pzCapB/.test(pz), false);
});

await test("D1 tableta (641–1180 px): ramele graficului se dau la o parte ca pe telefon - „Ce ai de făcut acum”, Trendul și lista ajung la capitolele lor", () => {
  const M = "@media (max-width:1180px)", c = R.filter((x) => x.media === M && x.decl === "display:contents!important"); assert.equal(c.length, 1);
  const s = c[0].sel.split(/,\s*(?=html)/); assert.equal(s.length, 3);
  assert.ok(s[0].endsWith(".tbCadru>.tbGraficRand") && s[1].endsWith(".tbCadru>.tbGraficRand>:is(.tbGrStanga,.tbGrCol)") && s[2].endsWith(".tbCadru>.tbGraficRand>.tbGrStanga>#tbGraficCard"));
  assert.match(una(M, /:is\(#tbGraficCard,\.tbGrStanga,\.tbGrCol\)>\*$/).decl, /^grid-column:1 \/ -1!important;grid-row:auto!important/);
  assert.match(CSS, /@media \(max-width:640px\)\{\n  \.pzDemo #tabloubot \.tbCadru>\.tbGraficRand,[^{]+\{display:contents\}/, "regula veche de telefon e la locul ei");
});

await test("D2 doar așezare: nicio culoare scrisă direct, literele pe scara casei, blocul înaintea celui v100.375; regulile de așezare cer bot pornit (pagina „niciun bot” neatinsă)", () => {
  assert.ok(BLOC.length > 2500 && CSS.indexOf(A0) > 0 && CSS.indexOf(A0) < CSS.indexOf("/* v100.375 design: început */"));
  assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(faraComentarii.replace(/#(tabloubot|pz[A-Z]\w*|tb[A-Z]\w*)/g, "")), false, "culoare directă");   /* se scot doar id-urile paginii (#tabloubot, #pz…, #tb…) - un „#d0d7de” rămâne și e prins */
  for (const m of faraComentarii.matchAll(/font-size:([\d.]+)px/g)) assert.ok([12, 13.5, 15, 20, 30].includes(Number(m[1])), "font-size " + m[1]);
  for (const m of faraComentarii.matchAll(/var\((--[\w]+)\)/g)) assert.ok(/^--pz(T0|T1|T2|Li|Info|F1)$/.test(m[1]), m[1]);
  for (const x of R) if (/@media/.test(x.media)) assert.ok(x.sel.split(/,\s*(?=html)/).every((s) => s.startsWith(P)), (x.sel || "").slice(0, 110));
});

/* ---------- E: cuprinsul capitolelor (I-916) și starea de azi din titlul capitolului (I-919) ---------- */
await test("E1 cuprinsul: cinci legături spre capitole, înaintea primului titlu; acțiunea e permisă; duce pagina la titlu, fără animație când omul a cerut mișcare redusă", () => {
  assert.match(HTML, /<nav class="tbCuprins" id="tbCuprins" aria-label="Capitolele paginii"><span>Sari la<\/span>(<button type="button" data-action-click="tbSariLa\('(decizia|risc|bani|piata|jurnal)'\)">[^<]+<\/button>){5}<\/nav><h3 class="tbCap" id="tbCap-decizia">/);
  assert.deepEqual([...HTML.matchAll(/data-action-click="tbSariLa\('([a-z]+)'\)">([^<]+)</g)].map((m) => m[1] + ":" + m[2]), ["decizia:Decizia", "risc:Riscul", "bani:Banii", "piata:Piața", "jurnal:Jurnalul"]);
  assert.match(APP, /ACTIUNI_PERMISE=new Set\("[^"]*\btbSariLa\b/);
  const apel = [], el = { "tbCap-risc": { scrollIntoView: (o) => apel.push(o) } }, st = { redus: false };
  const ctx = vm.createContext({ $: (id) => el[id] || null, matchMedia: (q) => { assert.equal(q, "(prefers-reduced-motion: reduce)"); return { matches: st.redus }; } });
  vm.runInContext(functie(APP, "tbSariLa"), ctx);
  vm.runInContext("tbSariLa('risc')", ctx); st.redus = true; vm.runInContext("tbSariLa('risc'); tbSariLa('nu-exista')", ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(apel)), [{ behavior: "smooth", block: "start" }, { behavior: "auto", block: "start" }]);
});

await test("E2 cuprinsul: sub 1181 px în șir, între „Contează acum” și grafic; de la 1181 px pe rândul antetului, lipit sub bara de sus; pe un rând, cu ținte de atingere; titlul nu intră sub ce e lipit", () => {
  assert.ok(R.some((x) => !x.media && x.sel === "#tabloubot .tbCuprins" && x.decl === "display:none"), "ascuns de la bază (pagina fără bot, modul vechi)");
  assert.match(R.find((x) => !x.media && x.sel === P + ">.tbCuprins").decl, /^display:flex;flex-direction:row;flex-wrap:wrap;/, "pe un rând: regula generală a meniului punea butoanele unul sub altul");
  assert.match(R.find((x) => !x.media && x.sel === P + ">.tbCuprins>button").decl, /width:auto;min-height:44px/);
  const M = "@media (max-width:1180px)", n = una(M, /\.tbCadru>\.tbCuprins$/);
  assert.ok(ord(n) > ord(una(M, /\.tbCadru>#ctAcum:not\(\[hidden\]\)$/)) && ord(n) < ord(una(M, /#tbGraficCard>\.tbBlocCap$/)), "ordinea cuprinsului sub 1181 px: " + ord(n));
  const D = "@media (min-width:1181px)", d = una(D, /\.tbCadru>\.tbCuprins$/);
  assert.match(d.decl, /^grid-row:1!important;align-self:end;position:sticky;top:56px;z-index:20;background:var\(--pzF1\);/, "pe rândul antetului, lipit sub bara de sus (56 px), cu fundalul paginii");
  assert.equal(una(D, /\.tbCadru>\.sectionHead$/).decl, "padding-bottom:54px!important", "antetul îi lasă loc dedesubt, pe același rând al grilei");
  assert.match(CSS, /\.topStatus\{[^}]*position:sticky[^}]*top:0/, "bara de sus e lipită la 0 (de ea ține „top:56px”)");
  assert.equal(R.find((x) => !x.media && x.sel === P + ">.tbCap").decl, "scroll-margin-top:84px"); assert.equal(una(D, /\.tbCadru>\.tbCap$/).decl, "scroll-margin-top:108px");
});

/* un Tablou mic, cât pentru cifrele din titluri */
function paginaTitluri(o = {}) {
  const T = (t) => (t === undefined ? null : { textContent: t, hidden: false });
  const bare = (o.stop || []).map(([et, v]) => ({ querySelector: (s) => T(s === "span" ? et : v) }));
  const kv = o.grid === undefined ? null : { textContent: "din grid" + o.grid, hidden: false, querySelector: () => T(o.grid) };
  const scrieri = [], azi = {}; for (const k of ["decizia", "risc", "bani", "piata", "jurnal"]) { let v = ""; azi[k] = { get textContent() { return v; }, set textContent(x) { v = x; scrieri.push(k); } }; }
  const el = { tbKpiLich: T(o.lich), tbKpiTotal: T(o.total), tbVremea: T(o.vremea), "tbPlSub-alerte": T(o.alerte) };
  for (const k in azi) el["tbCapAzi-" + k] = azi[k];
  el.tabloubot = { querySelectorAll: (s) => (s === "#tbTodo .tbTodoRand" ? Array.from({ length: o.todo || 0 }) : s === '#pzVerdict .pzMetru[aria-label="Atinge stopul"] .pzBara' ? bare : assert.fail("selector neașteptat: " + s)),
    querySelector: (s) => (s === "#tbKpiGridKv .pzKv" ? kv : assert.fail("selector neașteptat: " + s)) };
  const ctx = vm.createContext({ $: (id) => el[id] || null, TextRo: globalThis.TextRo }); vm.runInContext(functie(APP, "tbCapAzi"), ctx);
  return { azi, scrieri, r: () => vm.runInContext("tbCapAzi()", ctx), t: () => Object.fromEntries(Object.keys(azi).map((k) => [k, azi[k].textContent])) };
}
const PLIN = { todo: 6, stop: [["1 h", "sub 0,1%"], ["4 h", "1,0%"], ["24 h", "8,6%"]], lich: "53,9%", total: "−12,6", grid: "+4,5 USDT", vremea: "Vremea monedei: din 6 intervale: 3 contra botului, 3 laterale · TradingView: vinde pe 4 h", alerte: "161 în ultimele 24 h" };

await test("E3 titlul fiecărui capitol poartă starea de azi, citită de pe ecran: lista de făcut, stopul pe 24 h (bara de 24 h, nu ultima), totalul și cât din grid, intervalele, alertele", () => {
  const p = paginaTitluri(PLIN); p.r();
  assert.deepEqual(p.t(), { decizia: "6 lucruri pe listă", risc: "stop atins în 24 h: 8,6%", bani: "−12,6 USDT, din grid +4,5 USDT", piata: "din 6 intervale: 3 contra botului, 3 laterale", jurnal: "alerte: 161 în ultimele 24 h" });
  const n0 = p.scrieri.length; p.r(); p.r(); assert.equal(p.scrieri.length, n0, "la aceleași cifre nu se rescrie nimic");
  const alt = paginaTitluri({ ...PLIN, stop: [["24 h", "~29%"], ["1 h", "0,2%"]], todo: 1, alerte: "niciuna în ultimele 24 h" }); alt.r();
  assert.equal(alt.t().risc, "stop atins în 24 h: ~29%", "bara de 24 h se caută după eticheta ei"); assert.equal(alt.t().decizia, "1 lucru pe listă"); assert.equal(alt.t().jurnal, "alerte: niciuna în ultimele 24 h");
  for (const m of HTML.matchAll(/<h3 class="tbCap" id="tbCap-([a-z]+)">/g)) assert.ok(HTML.includes('<em class="tbCapAzi" id="tbCapAzi-' + m[1] + '"></em></h3>'), "locul cifrei în titlul " + m[1]);
  assert.match(functie(APP, "tbRandAplica"), /\}\);if\(typeof tbCapAzi==="function"\)tbCapAzi\(\)\}$/, "se reface odată cu rezumatele rândurilor");
});

await test("E4 fără sursă titlul nu scrie nimic (nici zero, nici liniuță): fără stop spune lichidarea; fără total, fără Vremea, cu alertele încă neaduse - gol", () => {
  const p = paginaTitluri({ ...PLIN, stop: [], todo: 0, total: "—", vremea: "", alerte: "de la colectorul de pe VPS" }); p.r();
  assert.deepEqual(p.t(), { decizia: "", risc: "până la lichidare 53,9%", bani: "", piata: "", jurnal: "" });
  const gol = paginaTitluri({}); gol.r(); assert.deepEqual(gol.t(), { decizia: "", risc: "", bani: "", piata: "", jurnal: "" });
  const liniuta = paginaTitluri({ lich: "—", total: "—" }); liniuta.r(); assert.deepEqual(liniuta.t(), { decizia: "", risc: "", bani: "", piata: "", jurnal: "" }, "liniuța de pe ecran nu e o cifră");
  const faraGrid = paginaTitluri({ ...PLIN, grid: undefined }); faraGrid.r(); assert.equal(faraGrid.t().bani, "−12,6 USDT");
  assert.ok(R.some((x) => !x.media && x.sel === P + ">.tbCap>.tbCapAzi:empty" && x.decl === "display:none"));
});

/* ---------- F: zero-ul botului arătat și când din preț, în grid, nu se mai atinge (el: „arată și zero botului chiar dacă nu e în grid”) ---------- */
const LIBF = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
function lumeSim() { const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c; for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "monte-simbol.js", "grid-sim.js"]) vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), c, { filename: f }); return c; }
function lumeBot() { const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c; for (const f of ["grid-calcul.js", "tablou-extra.js", "grafic-bot.js"]) vm.runInContext(LIBF(f), c, { filename: f }); return c; }
const COM = 0.0005, COMG = 0.0002;
/* botul auditului din 14.10 (proba v100.196): long 5×, 100 USDT, grid 0,9–1,1 geometric cu 20 de intervale, pornit la P0, ajuns drept la P1 */
function botConstruit(G, o) {
  o = Object.assign({ suma: 100, L: 5, N: 20, jos: 0.9, sus: 1.1, P0: 1.0, P1: 0.93, pierdutInainte: 0 }, o || {});
  const niv = G.niveluri(o.jos, o.sus, o.N), cel = []; for (let k = 0; k < o.N; k++) cel.push({ k, q: o.suma * o.L / o.N / niv[k], tine: false, intr: null });
  let fee = 0, real = 0;
  for (const c of cel) if (niv[c.k + 1] > o.P0) { c.tine = true; c.intr = o.P0; fee += c.q * o.P0 * COM; }
  if (o.P1 > o.P0) { for (const c of cel) if (c.tine && niv[c.k + 1] <= o.P1) { c.tine = false; real += c.q * (niv[c.k + 1] - c.intr); fee += c.q * niv[c.k + 1] * COMG; } }
  else for (const c of cel) if (!c.tine && niv[c.k] >= o.P1 && niv[c.k] < o.P0) { c.tine = true; c.intr = niv[c.k]; fee += c.q * niv[c.k] * COMG; }
  const tin = cel.filter((c) => c.tine), q = tin.reduce((s, c) => s + c.q, 0), pd = tin.reduce((s, c) => s + c.q * c.intr, 0) / q, net = real - fee - o.pierdutInainte;
  return { directie: "long", investit: o.suma, levier: o.L, pozitie: q, pretDeschidere: pd, pretCurent: o.P1, profitNet: net, profitTotal: net + q * (o.P1 - pd), gridJos: o.jos, gridSus: o.sus, distantaLichidarePct: 40,
    brut: { buOrderData: { row: o.N + 1, perVolume: o.suma * o.L / o.N / o.P0, gridType: "geometric" } } };
}

await test("F1 din preț, în grid, botul nu mai ajunge pe zero ⇒ „pretZero” rămâne gol (alertele și sfaturile nu primesc un zero inventat), dar există prețul de zero pe poziția de acum", () => {
  const c = lumeBot(), b = botConstruit(c.GridCalcul, { pierdutInainte: 60 }), z = c.TabloExtra.dacaInchizi(b), q = b.pozitie;
  assert.ok(c.TabloExtra.totalCuGridLa(b, b.gridSus) < 0, "la marginea de sus botul tot pe minus: " + c.TabloExtra.totalCuGridLa(b, b.gridSus));
  assert.equal(z.pretZero, null); assert.equal(z.zeroNeatins, true); assert.equal(z.distantaZeroPct, null);
  const x = z.pretZeroPozitie; assert.ok(x > b.gridSus, "zero-ul pe poziția de acum e dincolo de marginea de sus: " + x);
  /* cu o pierdere mai mică, prețul ăsta ar cădea ÎNĂUNTRUL gridului, unde botul nu e pe zero (gridul a vândut din poziție până acolo): nu se dă */
  const b2 = botConstruit(c.GridCalcul, { pierdutInainte: 12 }), z2 = c.TabloExtra.dacaInchizi(b2), x2 = (b2.pozitie * b2.pretDeschidere - b2.profitNet) / (b2.pozitie * (1 - COM));
  assert.ok(x2 > b2.pretCurent && x2 < b2.gridSus, "formula ar da un preț în grid: " + x2); assert.ok(c.TabloExtra.totalCuGridLa(b2, x2) < -1, "…unde botul e de fapt pe minus: " + c.TabloExtra.totalCuGridLa(b2, x2));
  assert.equal(z2.zeroNeatins, true); assert.equal(z2.pretZeroPozitie, null, "un zero arătat în grid ar fi o capcană pentru un take-profit pus acolo"); assert.equal(z2.pretZero, null);
  assert.ok(Math.abs(b.profitNet + q * (x - b.pretDeschidere) - q * x * COM) < 1e-9, "cu poziția de acum ținută întreagă și închisă la prețul ăsta, totalul e exact zero");
  assert.ok(Math.abs(x - (q * b.pretDeschidere - b.profitNet) / (q * (1 - COM))) < 1e-12, "aceeași formulă ca zero-ul de dinainte de v100.196 (pe poziția de acum)");
});

await test("F2 cât zero-ul se atinge în grid, nimic nu se schimbă: prețul lui cu grilele de pe drum, fără cifra „pe poziția de acum”", () => {
  const c = lumeBot(), b = botConstruit(c.GridCalcul, { P1: 0.97 }), z = c.TabloExtra.dacaInchizi(b);
  assert.ok(z.pretZero > b.pretCurent && z.pretZero <= b.gridSus, "zero în grid: " + z.pretZero); assert.equal(z.pretZeroPozitie, null); assert.notEqual(z.zeroNeatins, true);
  assert.ok(Math.abs(c.TabloExtra.totalCuGridLa(b, z.pretZero)) < 0.05);
});

await test("F3 capul paginii: cifra „Zero-ul, pe poziția de acum” cu distanța ei și cu ce rămâne la margine; fără cifră, rămâne „nu se mai atinge” ca până acum; fraza și rândul din „Dacă muți gridul”", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  const MUTAT = { dir: "long", pret: 58.494, jos: 54, sus: 61, stop: 54, stopActiv: true, laMargine: (parte) => (parte === "jos" ? -35.5 : -12.4), laStop: -35.5, total: -15.2, sanse: {}, pas: 0.006 };
  const cel = (x) => JSON.parse(JSON.stringify(c.CapMargine.placi(c.CapMargine.alcatuieste(x)).find((q) => q.k === "zero")));
  assert.deepEqual(cel({ ...MUTAT, zero: { pret: null, neatins: true, pretPoz: 66.25 } }), { k: "zero", et: "Zero-ul, pe poziția de acum", val: "66.2500", ton: "atentie", sub: "+13,3% de aici, peste grid · la marginea de sus rămâi cu −12,4 USDT" });   /* „peste grid” spune că e dincolo de margine; de ce (gridul închide poziția pe drum) rămâne în legenda graficului și în fraza zero-ului */
  assert.match(c.CapMargine.textZero(c.CapMargine.alcatuieste({ ...MUTAT, zero: { pret: null, neatins: true, pretPoz: 66.25 } })), /Gridul o închide pe drum, deci în gridul ăsta botul nu ajunge pe zero/, "explicația întreagă rămâne în fraza zero-ului");
  assert.deepEqual(cel({ ...MUTAT, zero: { pret: null, neatins: true } }), { k: "zero", et: "Zero-ul botului", val: "nu se mai atinge", sub: "la marginea de sus rămâi cu −12,4 USDT", ton: "atentie" });
  assert.deepEqual(cel({ ...MUTAT, zero: { pret: null, neatins: true, pretPoz: null } }).val, "nu se mai atinge");
  assert.deepEqual(cel({ ...MUTAT, zero: { pret: 60.2, neatins: false, pretPoz: 66.25 } }), { k: "zero", et: "Zero-ul botului", val: "60.2000", sub: "+2,9% de aici" }, "cu zero în grid, cifra „pe poziția de acum” nu se arată");
  assert.equal(c.CapMargine.textZero(c.CapMargine.alcatuieste({ ...MUTAT, zero: { pret: null, neatins: true, pretPoz: 66.25 } })),
    "Zero-ul, pe poziția de acum: 66.2500 (+13,3% de aici), cu poziția ținută întreagă. Gridul o închide pe drum, deci în gridul ăsta botul nu ajunge pe zero: la marginea de sus (61.0000, +4,3%) rămâi cu −12,4 USDT");
  assert.equal(c.CapMargine.textZero(c.CapMargine.alcatuieste({ ...MUTAT, zero: { pret: null, neatins: true } })), "Pe zero botul nu mai ajunge în gridul ăsta: la marginea de sus (61.0000, +4,3%) rămâi cu −12,4 USDT");
  assert.match(APP, /return q\?\{pret:q\.pretZero,neatins:q\.zeroNeatins===true,pretPoz:q\.pretZeroPozitie,grile:tbZeroGrile\(b\)\}:null\}/);
  assert.match(LIBF("cap-margine.js"), /r0\.push\("pe zero nu se mai ajunge în gridul ăsta" \+ \(m\.zeroPoz \? " \(pe poziția de acum zero-ul e la " \+ pret\(m\.zeroPoz\) \+ "\)" : ""\)\);/);
});

await test("F4 graficul: nivelul „zero, pe poziția de acum” doar când zero-ul din grid lipsește, cu altă cheie decât „zero” (fără șansă de atingere lângă el) și cu legenda lui", () => {
  const c = lumeBot(), GB = c.GraficBot, b = { gridJos: 54, gridSus: 61, pretDeschidere: 58.4 };
  const k = (o) => JSON.parse(JSON.stringify(GB.niveluriBot(Object.assign({ bot: b }, o)).filter((x) => /^zero/.test(x.k)).map((x) => [x.k, x.p, x.t])));
  assert.deepEqual(k({ zero: null, zeroPoz: 66.25 }), [["zeroPoz", 66.25, "zero, pe poziția de acum"]]);
  assert.deepEqual(k({ zero: 60.2, zeroPoz: 66.25 }), [["zero", 60.2, "zero-ul botului"]]); assert.deepEqual(k({ zero: null, zeroPoz: null }), []);
  const src = LIBF("grafic-bot.js");
  assert.match(src, /zero: z && z\.pretZero, zeroPoz: z && z\.zeroNeatins \? z\.pretZeroPozitie : null,/);
  assert.match(src, /else if \(are\("zeroPoz"\)\) Lg\.push\('<span><i class="gbDash" style="border-color:' \+ COL\.warn \+ '"><\/i>zero, pe poziția de acum \(gridul închide poziția pe drum: în grid botul nu ajunge pe zero\)<\/span>'\);/);
  assert.equal(/zeroPoz\s*:/.test(src.slice(src.indexOf("var SANSE"), src.indexOf("var SANSE") + 900)), false, "nicio șansă de atingere pentru nivelul ăsta");
});

/* ---------- G („FA IDEI”, a doua oară): „Pe zero, din grile” lângă zero-ul care din preț nu se mai atinge; zero-ul pe Drum; cuprinsul lipit pe calculator ---------- */
await test("G1 „Pe zero, din grile”: aceeași socoteală ca ritmul de recuperare de sub „Rezultat total” (o singură sursă); pe plus sau fără date - nimic; sub o zi de viață - se spune", () => {
  const TE = lumeBot().TabloExtra, st = { g: { netZi: 4.5 } };
  const ctx = vm.createContext({ botiNr: (v) => (v === null || v === undefined || !isFinite(Number(v)) ? null : Number(v)), Date, TabloExtra: { grileVsCosturi: (b, t) => { assert.ok(t > 1.7e12, "cu ora de acum"); if (st.pica) throw new Error("pică"); return st.g; }, ritmRecuperare: TE.ritmRecuperare } });
  vm.runInContext(functie(APP, "tbZeroGrile"), ctx); const Z = (tot) => { ctx.b = { profitTotal: tot }; return JSON.parse(JSON.stringify(vm.runInContext("tbZeroGrile(b)", ctx))); };
  const r = Z(-11.9); assert.equal(r.netZi, 4.5); assert.ok(Math.abs(r.zile - 11.9 / 4.5) < 1e-12, "zile = pierderea / netul pe zi: " + r.zile);
  assert.ok(Math.abs(r.zile - TE.ritmRecuperare(-11.9, 4.5).zile) < 1e-12, "exact cifra rândului de sub „Rezultat total”");
  assert.equal(Z(3.2), null, "pe plus: nimic de recuperat"); assert.equal(Z(0), null); assert.equal(Z(null), null);
  st.g = { netZi: -0.4 }; assert.deepEqual(Z(-11.9), { zile: null, netZi: -0.4 }, "grilele nu acoperă costurile");
  st.g = { preaTanar: true, netZi: null }; assert.deepEqual(Z(-11.9), { tanar: true });
  st.g = null; assert.equal(Z(-11.9), null); st.g = { netZi: 4.5 }; st.pica = true; assert.equal(Z(-11.9), null, "o eroare nu ajunge pe ecran");
  assert.match(functie(APP, "tbDeseneazaKpi"), /rr=gvc\?TabloExtra\.ritmRecuperare\(tot,gvc\.netZi\):null/, "rândul de sub „Rezultat total” folosește aceeași pereche de funcții");
});

await test("G2 capul: după cifra de zero vine „Pe zero, din grile” - zilele cu o zecimală, ritmul pe zi, „dacă prețul stă pe loc”; doar când din preț zero-ul nu se atinge", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  const MUTAT = { dir: "long", pret: 58.494, jos: 54, sus: 61, stop: 54, stopActiv: true, laMargine: (parte) => (parte === "jos" ? -35.5 : -12.4), laStop: -35.5, total: -15.2, sanse: {}, pas: 0.006 };
  const P2 = (zero) => JSON.parse(JSON.stringify(c.CapMargine.placi(c.CapMargine.alcatuieste({ ...MUTAT, zero })))), ult = (zero) => P2(zero).slice(-2);
  const a = ult({ pret: null, neatins: true, pretPoz: 66.25, grile: { zile: 2.644, netZi: 4.5 } });
  assert.deepEqual(a.map((q) => q.k), ["zero", "zeroGrile"], "întâi zero-ul, apoi drumul spre el din grile");
  assert.deepEqual(a[1], { k: "zeroGrile", et: "Pe zero, din grile", val: "~2,6 zile", sub: "la ritmul de azi (+4,5 USDT pe zi), dacă prețul stă pe loc" });
  assert.equal(ult({ pret: null, neatins: true, pretPoz: 66.25, grile: { zile: 14.4, netZi: 1.1 } })[1].val, "~14 zile");
  assert.equal(ult({ pret: null, neatins: true, pretPoz: 66.25, grile: { zile: 21.2, netZi: 0.7 } })[1].val, "~21 de zile", "de la 20, cu „de”");
  assert.deepEqual(ult({ pret: null, neatins: true, pretPoz: 66.25, grile: { tanar: true } })[1], { k: "zeroGrile", et: "Pe zero, din grile", val: "după o zi", sub: "ritmul se socotește după o zi de viață a botului" });
  assert.deepEqual(ult({ pret: null, neatins: true, pretPoz: 66.25, grile: { zile: null, netZi: -0.4 } })[1], { k: "zeroGrile", et: "Pe zero, din grile", val: "nu, la ritmul de azi", sub: "grilele nu acoperă costurile", ton: "atentie" });
  assert.deepEqual(ult({ pret: null, neatins: true, grile: { zile: 2.644, netZi: 4.5 } }).map((q) => q.val), ["nu se mai atinge", "~2,6 zile"], "și fără cifra pe poziția de acum");
  assert.equal(P2({ pret: null, neatins: true, pretPoz: 66.25 }).some((q) => q.k === "zeroGrile"), false, "fără ritm, fără celulă");
  assert.equal(P2({ pret: 60.2, neatins: false, grile: { zile: 2.644, netZi: 4.5 } }).some((q) => q.k === "zeroGrile"), false, "cu zero în grid rămâne doar prețul lui (ritmul e sub „Rezultat total”)");
});

await test("G3 Drumul arată zero-ul botului mereu (el: „arată și zero botului pe drumul botului”): cel din grid, sau cel „pe poziția de acum” când din preț nu se atinge și cade dincolo de grid", () => {
  const lume = lumeBot(), doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: lume.TabloExtra, TextRo: globalThis.TextRo };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(LIBF("asezare-paznic.js"), ctx);
  const adanc = botConstruit(lume.GridCalcul, { pierdutInainte: 60 }), z = lume.TabloExtra.dacaInchizi(adanc);
  const L = JSON.parse(JSON.stringify(ctx.AsezarePaznic.nivele(adanc))), zr = L.filter((x) => /zero/.test(x.n));
  assert.equal(zr.length, 1, L.map((x) => x.n).join(" | ")); assert.equal(zr[0].n, "zero, pe poziția de acum"); assert.ok(Math.abs(zr[0].p - z.pretZeroPozitie) < 1e-12 && zr[0].p > adanc.gridSus, "dincolo de marginea de sus: " + zr[0].p);
  assert.match(zr[0].tit, /gridul o închide pe drum/);
  assert.match(ctx.AsezarePaznic.drumHtml(adanc, false, 1100), /zero, pe poziția de acum/);
  assert.equal(ctx.AsezarePaznic.nivele(botConstruit(lume.GridCalcul, { pierdutInainte: 12 })).some((x) => /zero/.test(x.n)), false, "când cifra ar cădea în grid, drumul nu arată niciun zero");
  const inGrid = botConstruit(lume.GridCalcul, { P1: 0.97 }); assert.ok(lume.TabloExtra.dacaInchizi(inGrid).pretZero > 0);
  const zi = JSON.parse(JSON.stringify(ctx.AsezarePaznic.nivele(inGrid))).filter((x) => /zero/.test(x.n));
  assert.equal(zi.length, 1); assert.equal(zi[0].n, "zero", "în grid se numește simplu „zero”"); assert.ok(Math.abs(zi[0].p - lume.TabloExtra.dacaInchizi(inGrid).pretZero) < 1e-12 && zi[0].p <= inGrid.gridSus);
  assert.match(ctx.AsezarePaznic.drumHtml(inGrid, false, 1100), />zero /);
});

/* ---------- H (el: „pune și «atinge TP» la fel cum faci cu margine și cu stop”): take-profit-ul în cap - banii de acolo și șansa de a-l atinge ---------- */
await test("H1 simularea duce și șansa take-profit-ului pe 1 h / 4 h / 24 h (riscul scurt), iar serverul o păstrează curățată, ca pe cea a stopului", async () => {
  const GS = lumeSim().GridSim, r = GS.riscScurt({ orizonturi: [{ zile: 1 / 24, pStop: 0.01, pLich: 0, pTp: 0.002, p5: -1 }, { zile: 4 / 24, pStop: 0.03, pLich: 0, pTp: 0.011, p5: -2 }, { zile: 1, pStop: 0.09, pLich: 0, pTp: 0.064, p5: -4 }, { zile: 7, pStop: 0.4, pTp: 0.16 }] });
  assert.deepEqual(JSON.parse(JSON.stringify(r)).map((x) => [x.ore, x.pTp]), [[1, 0.002], [4, 0.011], [24, 0.064]]);
  assert.equal(GS.riscScurt({ orizonturi: [{ zile: 1, pStop: 0.2 }] })[0].pTp, null, "fără cifră: null, nu zero");
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "h");
  const Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: Hd, body: JSON.stringify({ la: 7, boti: { "2601": { cat: "zgomot", stare: "atentie", text: "t", la: 1, ultima: 2, scurt: [{ ore: 1, pStop: 0.02, pLich: 0, p5: -1.2, pTp: 0.003 }, { ore: 24, pStop: 0.2, pLich: 0, p5: -4, pTp: "x" }] } } }) }), env });
  const g = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: Hd }), env });
  assert.deepEqual((await g.json()).mcVerdict.boti["2601"].scurt.map((x) => x.pTp), [0.003, null]);
  assert.ok(+(/VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(citeste("scripts", "colector.mjs")) || [])[1] >= 209, "colectorul de la v101.209 scrie și șansa take-profit-ului");
});

await test("H2 capul: celula „La take-profit” cu banii de acolo și bara „Atinge take-profit-ul” pe 1 h / 4 h / 24 h; un take-profit care închide pe minus se spune, în roșu", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  const BOT = { dir: "long", pret: 60, jos: 56, sus: 64, stop: 54, stopActiv: true, laMargine: (parte) => (parte === "jos" ? -19.3 : -9.0), laStop: -24.5, total: -11.4, sanse: {}, pas: 0.006,
    stopScurt: [{ ore: 1, pStop: 0.001, pTp: 0.0002 }, { ore: 4, pStop: 0.008, pTp: 0.012 }, { ore: 24, pStop: 0.09, pTp: 0.064 }] };
  const A = (x) => c.CapMargine.alcatuieste({ ...BOT, ...x }), cel = (x) => JSON.parse(JSON.stringify(c.CapMargine.placi(A(x)).find((q) => q.k === "tp") || null)), bara = (x) => JSON.parse(JSON.stringify(c.CapMargine.metri(A(x)).find((q) => q.k === "tp") || null));
  /* take-profit pus ca PREȚ, peste gridul 56–64: botul ajunge acolo fără poziție, cu −9,0 USDT - închide pe minus și se spune */
  assert.deepEqual(cel({ tp: 71.3332, laTp: -9.0 }), { k: "tp", et: "La take-profit", val: "−9,0 USDT", sub: "71.3332 · +18,9% de aici · peste grid · închide pe minus", ton: "rau" });
  /* botul lui din 21.11: take-profit în PROCENTE (+3% din investiție = +2,8 USDT). Se declanșează la totalul ăsta, nu la un preț; din preț, în grid,
     nu se atinge (peste grid botul rămâne cu −8,9) ⇒ celula arată banii din procent și spune că se atinge doar din grile - nu „−9,0, închide pe minus” */
  assert.deepEqual(cel({ tp: 75.5149, laTp: 2.8332, tpRaport: 0.03, tpDinPret: false }), { k: "tp", et: "La take-profit", val: "+2,8 USDT", sub: "+3,0% din investiție · din preț, în grid, nu se atinge: doar din grile, în timp", ton: "atentie" });
  assert.deepEqual(cel({ tp: 62.5, laTp: 2.8332, tpRaport: 0.03, tpDinPret: true }), { k: "tp", et: "La take-profit", val: "+2,8 USDT", sub: "+3,0% din investiție · pe la 62.5000 (+4,2% de aici)" }, "în procente, atins din preț în grid: prețul la care se întâmplă");
  assert.equal(/închide pe minus|peste grid/.test(cel({ tp: 75.5149, laTp: 2.8332, tpRaport: 0.03, tpDinPret: false }).sub), false);
  assert.deepEqual(cel({ tp: 62.5, laTp: 3.4 }), { k: "tp", et: "La take-profit", val: "+3,4 USDT", sub: "62.5000 · +4,2% de aici" }, "în grid, pe plus: fără roșu, fără „peste grid”");
  assert.deepEqual(cel({ tp: 62.5, laTp: null }), { k: "tp", et: "La take-profit", val: "62.5000", sub: "+4,2% de aici" }, "fără total socotit: prețul");
  assert.equal(cel({}), null, "fără take-profit pus: nicio celulă"); assert.equal(cel({ tp: 0 }), null);
  const P = c.CapMargine.placi(A({ tp: 71.3332, laTp: -9.0 })).map((q) => q.k); assert.ok(P.indexOf("tp") === P.indexOf("stop") + 1, "după stop: " + P.join(", "));
  assert.deepEqual(bara({ tp: 71.3332, laTp: -9.0 }), { k: "tp", et: "Atinge take-profit-ul", sursa: "Monte Carlo pe botul tău · șansa take-profit-ului nu e încă verificată pe boții tăi, ca a stopului",
    bare: [{ et: "1 h", p: 0.0002, text: "sub 0,1%" }, { et: "4 h", p: 0.012, text: "1,2%" }, { et: "24 h", p: 0.064, text: "6,4%" }] });
  assert.equal(bara({}), null, "fără take-profit pus: nicio bară, oricâte cifre ar veni din simulare");
  assert.equal(bara({ tp: 71.3332, stopScurt: [{ ore: 1, pStop: 0.001 }, { ore: 24, pStop: 0.09, pTp: null }] }), null, "simulare veche, fără cifra take-profit-ului: nicio bară (nu zero)");
  assert.equal(c.CapMargine.metri(A({ tp: 71.3332, laTp: -9 })).map((m) => m.k).join(", "), "stop, tp", "barele: stopul, apoi take-profit-ul");
});

await test("H4 Drumul și graficul: lângă take-profit, șansa lui pe 24 h (aceeași cifră ca bara din cap); în procente și neatins din preț, prețul se numește „pe poziția de acum”", () => {
  const lume = lumeBot(), doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const st = { sansa: "24 h: 2,8%" }, ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: lume.TabloExtra, TextRo: globalThis.TextRo, tbTpSansaDrum: () => st.sansa };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(LIBF("asezare-paznic.js"), ctx);
  const adanc = Object.assign(botConstruit(lume.GridCalcul, { pierdutInainte: 12 }), { opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.03, opritorProfit: 1.2 });
  const tp = (b) => JSON.parse(JSON.stringify(ctx.AsezarePaznic.nivele(b))).find((x) => /take-profit/.test(x.n));
  assert.equal(tp(adanc).n, "take-profit, pe poziția de acum"); assert.equal(tp(adanc).sansa, "24 h: 2,8%"); assert.match(tp(adanc).tit, /în procente din investiție: din preț, în grid, nu se atinge/);
  assert.equal(tp(Object.assign({}, adanc, { opritorProfitTip: "pret", opritorProfitRaport: null, opritorProfit: 1.05 })).n, "take-profit", "pus ca preț: rămâne „take-profit”");
  st.sansa = null; assert.equal(tp(adanc).sansa, undefined, "fără cifră din simulare: fără șansă lângă preț");
  /* tbTpSansaDrum: cifra de 24 h din simularea botului de pe ecran, cu garda rândului Monte Carlo */
  const mk = (tbMc) => { const c2 = vm.createContext({ tbMc, TextRo: globalThis.TextRo, isFinite, String, Array }); vm.runInContext(functie(APP, "tbTpSansaDrum"), c2); return (b) => { c2.b = b; return vm.runInContext("tbTpSansaDrum(b)", c2); }; };
  const SC = [{ ore: 1, pStop: 0.001, pTp: 0.0002 }, { ore: 24, pStop: 0.09, pTp: 0.0284 }];
  assert.equal(mk({ botId: "7", rand: { scurt: SC, text: "t" } })({ id: 7 }), "24 h: 2,8%"); assert.equal(mk({ botId: "7", rand: { scurt: [{ ore: 24, pTp: 0.0002 }] } })({ id: "7" }), "24 h: sub 0,1%");
  assert.equal(mk({ botId: "8", rand: { scurt: SC } })({ id: 7 }), null, "simularea altui bot"); assert.equal(mk({ botId: "7", eroare: "x", rand: { scurt: SC } })({ id: 7 }), null, "tura picată");
  assert.equal(mk({ botId: "7", rand: { scurt: SC, text: "«Reluarea arată botul OPRIT»" } })({ id: 7 }), null); assert.equal(mk({ botId: "7", rand: { scurt: [{ ore: 24, pStop: 0.1 }] } })({ id: 7 }), null, "simulare veche, fără pTp");
  const G = LIBF("grafic-bot.js"); assert.match(G, /o\.tpPozitie \? "take-profit, pe poziția de acum" : "take-profit-ul tău"/); assert.match(G, /tpPozitie: !!\(TE && TE\.tpDinPret && TE\.tpDinPret\(b\) === false\),/);
});

await test("H3 legăturile: pagina dă capului prețul take-profit-ului (în procente: socotit live) și totalul de acolo; în cutia lată, doar ULTIMA bară ține restul coloanei", () => {
  const f = functie(APP, "tbCapMargine");
  assert.match(f, /var tpP=null;try\{tpP=b\.opritorProfitActiv\?\(TabloExtra\.pretTpLive\?TabloExtra\.pretTpLive\(/, "doar când take-profit-ul e pus");
  assert.match(f, /tp:tpP,laTp:tpP!==null\?TabloExtra\.totalLaTinta\(b\):null,tpRaport:tpP!==null&&b\.opritorProfitTip==="raport"\?botiNr\(b\.opritorProfitRaport\):null,tpDinPret:tpP!==null&&TabloExtra\.tpDinPret\?TabloExtra\.tpDinPret\(b\):null,/, "totalul de la take-profit = TabloExtra.totalLaTinta (în procente: procentul × investiția; ca preț: cu grilele de pe drum), ca în sfatul lui");
  /* TabloExtra.tpDinPret pe botul auditului: take-profit în procente, pe minus adânc ⇒ din preț nu se atinge; aproape de zero ⇒ se atinge; pus ca preț ⇒ null */
  const lm = lumeBot(), TE = lm.TabloExtra, adanc = Object.assign(botConstruit(lm.GridCalcul, { pierdutInainte: 12 }), { opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.03, opritorProfit: 1.2 });
  assert.equal(TE.tpDinPret(adanc), false); assert.equal(TE.totalLaTinta(adanc), 3, "la declanșare totalul e procentul × investiția: +3 USDT din 100"); assert.ok(TE.totalCuGridLa(adanc, TE.pretTpLive(adanc)) < 0, "…iar la prețul socotit pe poziția de acum botul ar fi de fapt pe minus");
  const usor = Object.assign(botConstruit(lm.GridCalcul, { P1: 0.99 }), { opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.01, opritorProfit: 1.05 });
  assert.equal(TE.tpDinPret(usor), true); assert.ok(Math.abs(TE.totalCuGridLa(usor, TE.pretTpLive(usor)) - 1) < 0.05, "atins din preț: la prețul lui totalul e chiar ținta");
  assert.equal(TE.tpDinPret(Object.assign({}, adanc, { opritorProfitTip: "pret" })), null); assert.equal(TE.tpDinPret(Object.assign({}, adanc, { opritorProfitActiv: false })), null);
  const M = "@container pzcap (min-width:900px)";
  assert.equal(R.find((x) => x.media === M && x.sel === "html.pzDemo #tabloubot #pzVerdict .pzVerbTxt.pzMarg>.pzMetru:not(:has(~.pzMetru))").decl, "grid-row:span 24");
  /* banda cu 7 cifre (cu take-profit și „Pe zero, din grile”): 4 + 3 în cutia lată, 7 pe un rând în cea foarte lată - nu 6 + una singură */
  const L7 = "html.pzDemo #tabloubot #pzVerdict .pzVerbTxt.pzMarg>.pzLedger:has(>.pzLg:nth-child(7))";
  assert.equal(R.find((x) => x.media === M && x.sel === L7).decl, "grid-template-columns:repeat(4,minmax(0,1fr))");
  assert.equal(R.find((x) => x.media === "@container pzcap (min-width:1150px)" && x.sel === L7).decl, "grid-template-columns:repeat(7,minmax(0,1fr))");
  assert.ok(faraComentarii.indexOf("@container pzcap (min-width:1150px)") > faraComentarii.indexOf("@container pzcap (min-width:900px){"), "regula pentru cutia foarte lată vine după cea pentru cutia lată (aceeași greutate: câștigă ultima)");
});

/* ---------- I („fa idei”, a treia oară): sfatul despre take-profit-ul pus, și când din preț botul nu ajunge pe zero ---------- */
await test("I1 take-profit pus, zero neatins din preț: sfatul nu mai tace - în procente spune banii și că din preț nu se atinge; pus ca preț, pe minus, spune că închide pe minus", () => {
  const cs = vm.createContext({ console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo }); vm.runInContext(LIBF("sfaturi.js") + "\nthis.Sfaturi = Sfaturi;", cs);
  /* botul lui din 21.11: HYPE long 3×, 94,44 USDT, total −11,2; take-profit +3% din investiție = +2,8 USDT; din preț, în gridul 56–64, botul nu ajunge nici pe zero */
  const BOT = (o = {}) => Object.assign({ id: "2656", baza: "HYPE.PERP", directie: "long", levier: 3, activ: true, pretCurent: 60.2, investit: 94.44, profitTotal: -11.2, gridJos: 56, gridSus: 64, distantaLichidarePct: 54,
    opritorPierdereActiv: true, opritorPierdere: 54, opritorPierdereTip: "pret", opritorProfitActiv: true, opritorProfit: 74.18, opritorProfitTip: "raport", opritorProfitRaport: 0.03 }, o);
  const sf = (b, x) => JSON.parse(JSON.stringify(cs.Sfaturi.sfaturi(Object.assign({ bot: b, scen: null, sanse: {}, rezumat: null, futures: null, funding: null, fisa: null, costuri: null, zero: { pretZero: null, zeroNeatins: true, iei: 83.2 }, geom: null, ritm: null }, x)).filter((s) => s.cod === "zero")));
  const a = sf(BOT(), { laTinta: 2.8332, tpDinPret: false, tpLive: 74.18 });
  assert.equal(a.length, 1, "un singur sfat despre take-profit"); assert.equal(a[0].tpPus, false, "o stare, nu bani în joc azi: nu urcă în „Contează acum”"); assert.equal(a[0].tpNeatins, true); assert.equal(a[0].ton, "info");
  assert.equal(a[0].titlu, "Take-profit-ul tău e pus la +3,0% din investiție (+2,8 USDT)");
  assert.equal(a[0].text, "Din preț, în gridul ăsta, nu se atinge: dincolo de margine totalul botului nu mai crește. Se poate atinge doar din grile, în timp; închis acum, ai lua 83,2 USDT din 94,44 investiți.");
  assert.equal(a[0].faCe, "", "o stare, nu un îndemn"); assert.equal(/74\.18|închide pe minus/.test(a[0].titlu + a[0].text), false, "prețul socotit pe poziția de acum nu se dă drept țintă");
  const pr = sf(BOT({ opritorProfitTip: "pret", opritorProfitRaport: null, opritorProfit: 71.5 }), { laTinta: -9.0, tpDinPret: null, tpLive: 71.5 });
  assert.equal(pr[0].titlu, "Take-profit-ul tău e pus la 71.5000"); assert.equal(pr[0].ton, "atentie"); assert.equal(pr[0].tpPus, true); assert.match(pr[0].text, /^Când se atinge, ieși cu −9,0 USDT în total; închis acum/); assert.equal(pr[0].faCe, "Take-profit-ul ăsta închide pe minus: l-aș scoate sau l-aș muta.");
  assert.equal(sf(BOT(), { laTinta: null, tpDinPret: false }).length, 0, "fără totalul de la take-profit: nimic inventat");
  assert.equal(sf(BOT({ opritorProfitActiv: false, opritorProfit: null, opritorProfitRaport: null }), { laTinta: null }).length, 0, "fără take-profit și fără zero atins din preț: sfatul tace ca înainte");
  /* cu zero-ul atins din preț rămâne sfatul vechi („zero-ul e la …”) */
  const vechi = JSON.parse(JSON.stringify(cs.Sfaturi.sfaturi({ bot: BOT(), scen: null, sanse: {}, rezumat: null, futures: null, funding: null, fisa: null, costuri: null, zero: { pretZero: 62.9, distantaZeroPct: 0.0449, iei: 83.2 }, laTinta: 2.8332, tpDinPret: true, tpLive: 63.4, geom: null, ritm: null }).filter((s) => s.cod === "zero")));
  assert.equal(vechi.length, 1); assert.match(vechi[0].titlu, /^Take-profit-ul tău e pus la \+3,0% din investiție, acum pe la 63\.4000 \(zero-ul e la 62\.9000\)$/);
  assert.match(LIBF("sfaturi.js"), /tpLive: TE && TE\.pretTpLive \? TE\.pretTpLive\(b\) : null, tpDinPret: TE && TE\.tpDinPret \? TE\.tpDinPret\(b\) : null, acum: acum \};/);
});

await test("I2 „Contează acum”: take-profit-ul care închide pe minus urcă (auriu), cel care iese pe plus e verde; cel în procente care doar nu se atinge din preț NU urcă (o stare)", () => {
  const cc = vm.createContext({ console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo }); vm.runInContext(LIBF("curba-stop.js") + "\n" + LIBF("conteaza.js") + "\nthis.Conteaza = Conteaza;", cc);
  const rand = (s) => JSON.parse(JSON.stringify(cc.Conteaza.alege({ sfaturi: [s], lista: [], sanse: [] })));
  const neat = rand({ cod: "zero", ton: "info", tpPus: false, tpNeatins: true, titlu: "Take-profit-ul tău e pus la +3,0% din investiție (+2,8 USDT)", text: "Din preț, în gridul ăsta, nu se atinge.", faCe: "" });
  assert.equal(neat.length, 0, "„Contează acum” rămâne gol: pagina nu trece pe așezarea pe jumătăți pentru o stare");
  const minus = rand({ cod: "zero", ton: "atentie", tpPus: true, titlu: "Take-profit-ul tău e pus la 71.5000", text: "Când se atinge, ieși cu −9,0 USDT în total.", faCe: "Take-profit-ul ăsta închide pe minus: l-aș scoate sau l-aș muta." });
  assert.equal(minus.length, 1); assert.equal(minus[0].nrSub, "take-profit pus"); assert.equal(minus[0].titlu, "Take-profit-ul tău e pus la 71.5000");
  assert.equal(rand({ cod: "zero", ton: "atentie", tpPus: true, titlu: "Take-profit-ul tău e pus la 71.5000", text: "Când se atinge, ieși cu −9,0 USDT în total.", faCe: "Take-profit-ul ăsta închide pe minus: l-aș scoate sau l-aș muta." })[0].ton, "galben");
  assert.equal(rand({ cod: "zero", ton: "bine", tpPus: true, titlu: "Take-profit-ul tău e pus la 62.0000", text: "Când se atinge, ieși cu +1,5 USDT în total.", faCe: "" })[0].ton, "verde");
});

/* ---------- J („fa idei”, a treia oară): șansa take-profit-ului verificată pe boții lui, în același jurnal ca stopul ---------- */
const MCB = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs")).href);
const ORA = 3600000, TJ = Date.UTC(2026, 10, 22, 9, 0, 0), SCJ = [{ ore: 1, pStop: 0.01, pLich: 0, p5: -1, pTp: 0.004 }, { ore: 4, pStop: 0.03, pLich: 0, p5: -2, pTp: 0.02 }, { ore: 24, pStop: 0.09, pLich: 0, p5: -4, pTp: 0.12 }];

await test("J1 notarea ține șansa take-profit-ului doar la botul cu take-profit pus; fără el (sau cu simulare veche, fără cifră) notarea e cea de dinainte, neatinsă", () => {
  const cu = MCB.noteazaScurt([], { id: 7, scurt: SCJ, total: -11.2, acum: TJ, areStop: true, areTp: true });
  assert.deepEqual(cu.map((e) => [e.ore, e.pTp, e.areTp]), [[1, 0.004, true], [4, 0.02, true], [24, 0.12, true]]);
  const fara = MCB.noteazaScurt([], { id: 7, scurt: SCJ, total: -11.2, acum: TJ, areStop: true, areTp: false });
  assert.equal(fara.length, 3); assert.equal(fara.some((e) => "pTp" in e || "areTp" in e), false, "botul fără take-profit nu intră în scorul lui");
  assert.deepEqual(fara, MCB.noteazaScurt([], { id: 7, scurt: SCJ, total: -11.2, acum: TJ, areStop: true }), "fără areTp: exact notarea de dinainte de v100.376");
  const veche = MCB.noteazaScurt([], { id: 7, scurt: SCJ.map(({ pTp, ...r }) => r), total: -11.2, acum: TJ, areStop: true, areTp: true });
  assert.equal(veche.some((e) => "pTp" in e), false, "simulare fără pTp: nimic inventat"); assert.equal(veche[0].pStop, 0.01);
  const strambe = MCB.noteazaScurt([], { id: 7, scurt: [{ ore: 1, pStop: 0.01, p5: -1, pTp: 1.4 }], total: 0, acum: TJ, areStop: true, areTp: true }); assert.equal("pTp" in strambe[0], false, "o șansă în afara 0–1 nu se notează");
  /* tura colectorului: are take-profit botul cu el pus în Pionex (preț sau procent) */
  const j = MCB.noteazaScurtBoti([], { boti: [{ id: 1, activ: true, profitTotal: -3, opritorPierdere: 54, opritorProfitActiv: true, opritorProfitRaport: 0.03 }, { id: 2, activ: true, profitTotal: 1, opritorPierdere: 54 }],
    stareBoti: { 1: { ultima: TJ, text: "t", scurt: SCJ }, 2: { ultima: TJ, text: "t", scurt: SCJ } }, la: TJ, deLa: TJ - 1000 });
  assert.deepEqual(j.map((e) => [e.id, e.ore, e.areTp === true]), [["1", 1, true], ["1", 4, true], ["1", 24, true], ["2", 1, false], ["2", 4, false], ["2", 24, false]]);
});

await test("J2 judecata: botul încă pornit la capătul ferestrei ⇒ neatins; închis de take-profit în fereastră ⇒ atins; de stop ⇒ neatins; închis de tine ⇒ neatins, cu șansa pe cât a stat deschis", () => {
  const j0 = MCB.noteazaScurt([], { id: 7, scurt: SCJ, total: -11.2, acum: TJ, areStop: true, areTp: true });
  const pornit = MCB.judecaScurt(j0, new Map([["7", -10.9]]), TJ + ORA + 60000).find((e) => e.ore === 1);
  assert.equal(pornit.stare, "judecat"); assert.equal(pornit.tp, 0); assert.equal(pornit.stop, 0);
  const inch = (motiv, dupaOre, ore) => MCB.judecaScurtLaInchidere(j0, "7", { total: 2.8, motiv, inchisLa: TJ + dupaOre * ORA }).find((e) => e.ore === ore);
  const tinta = inch("profit_stop", 2, 4); assert.equal(tinta.stare, "judecat"); assert.equal(tinta.tp, 1, "închis de take-profit (Pionex profit_stop) în fereastra de 4 h"); assert.equal(tinta.stop, 0);
  const stop = inch("loss_stop", 2, 4); assert.equal(stop.tp, 0); assert.equal(stop.stop, 1);
  const tu = inch("user_cancel", 6, 24); assert.equal(tu.tp, 0); assert.equal(tu.pExpTp, 0.03, "0,12 × 6 h din 24 h"); assert.equal(tu.deTine, true);
  const tarziu = inch("profit_stop", 5, 4); assert.equal(tarziu.stare, "expirat", "închis după fereastra de 4 h și după marja de citire: notarea iese din scor (ca la stop)");
  const dupaFer = MCB.judecaScurtLaInchidere(j0, "7", { total: 2.8, motiv: "profit_stop", inchisLa: TJ + ORA + 5 * 60000 }).find((e) => e.ore === 1);
  assert.equal(dupaFer.stare, "judecat"); assert.equal(dupaFer.tp, 0, "take-profit-ul a venit după capătul ferestrei de 1 h: în fereastră nu s-a atins");
  /* notarea fără take-profit nu primește „tp” la judecată */
  const fara = MCB.judecaScurtLaInchidere(MCB.noteazaScurt([], { id: 7, scurt: SCJ, total: 0, acum: TJ, areStop: true }), "7", { total: 1, motiv: "profit_stop", inchisLa: TJ + 2 * ORA }).find((e) => e.ore === 4);
  assert.equal("tp" in fara, false); assert.equal(fara.stop, 0);
});

/* un jurnal judecat, pe zile: fiecare notare cu șansa p și rezultatul x */
const jurnalTp = (zile, peZi, p, f) => { const j = []; for (let z = 0; z < zile; z++) for (let i = 0; i < peZi; i++) j.push({ id: "b" + z + "-" + i, ore: 24, t: TJ + z * 86400000, z: new Date(TJ + z * 86400000).toISOString().slice(0, 10), pStop: 0.05, p5: -1, total: 0, stare: "judecat", stop: 0, sub5: 0, pTp: p, areTp: true, tp: f(z, i) }); return j; };

await test("J3 raportul: sub 30 de judecate sau 10 zile „strânge date”; rata atinsă cât cea prezisă ⇒ „se potrivește”; mult peste ⇒ „prezice prea puțin”; mult sub ⇒ „prea mult”; stopul rămâne neschimbat", () => {
  const R24 = (j) => MCB.raportScurt(j).ore.find((x) => x.ore === 24);
  const putine = R24(jurnalTp(9, 5, 0.2, (z, i) => (i === 0 ? 1 : 0))); assert.equal(putine.nTp, 45); assert.equal(putine.zileTp, 9); assert.equal(putine.verdictTp, "putine", "45 de judecate, dar doar 9 zile");
  const pot = R24(jurnalTp(30, 10, 0.2, (z, i) => (i < 2 ? 1 : 0))); assert.equal(pot.nTp, 300); assert.equal(pot.pTpMed, 0.2); assert.equal(pot.tpRata, 0.2); assert.equal(pot.verdictTp, "potrivit");
  assert.equal(R24(jurnalTp(30, 10, 0.2, (z, i) => (i < 6 ? 1 : 0))).verdictTp, "prea-putin", "prezis 20%, atins 60%");
  assert.equal(R24(jurnalTp(30, 10, 0.5, (z, i) => (i < 1 ? 1 : 0))).verdictTp, "prea-mult", "prezis 50%, atins 10%");
  const vechi = jurnalTp(30, 10, 0.2, () => 0).map(({ pTp, areTp, tp, ...r }) => r), rv = R24(vechi);
  assert.equal(rv.nTp, 0); assert.equal(rv.verdictTp, "putine"); assert.equal(rv.pTpMed, null); assert.equal(rv.n, 300, "notările de dinainte de v100.376 rămân în scorul stopului, nu intră în al take-profit-ului");
  const amestec = jurnalTp(30, 10, 0.2, (z, i) => (i < 2 ? 1 : 0)), fStop = (j) => { const x = R24(j); return [x.n, x.pStopMed, x.stopRata, x.verdictStop, x.nSub5, x.verdictP5]; };
  assert.deepEqual(fStop(amestec), fStop(amestec.map(({ pTp, areTp, tp, ...r }) => r)), "cifrele stopului și ale lui „sub p5” nu se mișcă din cauza câmpurilor take-profit-ului");
  /* închis de tine: șansa prezisă e cea pe cât a stat deschis */
  const tine = jurnalTp(30, 10, 0.4, () => 0).map((e) => Object.assign(e, { pExpTp: 0.02 })); assert.equal(R24(tine).pTpMed, 0.02);
  /* pragul celei de-a treia cifre: intervalul take-profit-ului e mai lat decât al stopului pe aceleași date */
  const acel = jurnalTp(12, 4, 0.2, (z, i) => ((z + i) % 3 === 0 ? 1 : 0)).map((e) => Object.assign(e, { pStop: e.pTp, stop: e.tp })), ra = R24(acel);
  assert.ok(ra.tpDifSus - ra.tpDifJos > ra.stopDifSus - ra.stopDifJos + 1e-6, "interval TP " + (ra.tpDifSus - ra.tpDifJos) + " față de stop " + (ra.stopDifSus - ra.stopDifJos));
  assert.match(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), /const Z_TP = 2\.3939797998185104;/);
});

await test("J4 serverul păstrează verificarea take-profit-ului curățată, iar bara din cap o spune în locul lui „nu e încă verificată” - în cuvintele verdictului, pe orizontul cu cele mai multe judecate", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "j");
  const Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const rand = (ore, x) => Object.assign({ ore, n: 44, zile: 12, pStopMed: 0.07, stopRata: 0.09, stopDifJos: 0, stopDifSus: 0.04, verdictStop: "nedecis", nSub5: 44, sub5Rata: 0.06, sub5Jos: 0.01, sub5Sus: 0.12, verdictP5: "nedecis", tine: 0, necitit: 0, expirat: 0, deschise: 0 }, x);
  await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: Hd, body: JSON.stringify({ la: 7, boti: {}, calibrareScurt: { ore: [rand(1, { nTp: 12, zileTp: 6, pTpMed: 0.01, tpRata: 0, tpDifJos: null, tpDifSus: null, verdictTp: "putine" }), rand(4, { nTp: 31, zileTp: 11, pTpMed: 0.04, tpRata: 0.03, tpDifJos: -0.02, tpDifSus: 0.01, verdictTp: "<b>x</b>" }), rand(24, {})] } }) }), env });
  const c = (await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: Hd }), env })).json()).mcVerdict.calibrareScurt.ore;
  assert.deepEqual(c.map((x) => [x.ore, x.nTp, x.zileTp, x.verdictTp]), [[1, 12, 6, "putine"], [4, 31, 11, null], [24, null, null, null]], "verdictul din afara listei nu trece");
  const cm = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); cm.globalThis = cm; cm.window = cm;
  for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), cm, { filename: f });
  const BOT = { dir: "long", pret: 60, jos: 56, sus: 64, stop: 54, stopActiv: true, laMargine: () => -9, laStop: -24.5, total: -11.4, sanse: {}, pas: 0.006, tp: 74.2, laTp: 2.83, tpRaport: 0.03, tpDinPret: false, stopScurt: [{ ore: 24, pStop: 0.09, pTp: 0.028 }] };
  const sursa = (v) => cm.CapMargine.metri(cm.CapMargine.alcatuieste({ ...BOT, tpVerif: v })).find((m) => m.k === "tp").sursa;
  assert.equal(sursa(null), "Monte Carlo pe botul tău · șansa take-profit-ului nu e încă verificată pe boții tăi, ca a stopului");
  assert.equal(sursa([{ ore: 1, nTp: 0 }, { ore: 24, nTp: null }]), "Monte Carlo pe botul tău · șansa take-profit-ului nu e încă verificată pe boții tăi, ca a stopului", "nicio judecată: tot „nu e încă verificată”");
  assert.equal(sursa([{ ore: 1, nTp: 12, zileTp: 6, verdictTp: "putine" }, { ore: 24, nTp: 5, zileTp: 5, verdictTp: "putine" }]), "Monte Carlo pe botul tău · verificarea pe boții tăi strânge date (12 judecate pe 6 zile, la 1 h; trebuie 30 pe 10 zile)");
  assert.equal(sursa([{ ore: 4, nTp: 31, zileTp: 11, verdictTp: "potrivit" }, { ore: 1, nTp: 12, zileTp: 6, verdictTp: "putine" }]), "Monte Carlo pe botul tău · verificată pe boții tăi: se potrivește (31 de judecate pe 11 zile, la 4 h)");
  assert.match(sursa([{ ore: 24, nTp: 60, zileTp: 20, verdictTp: "prea-putin" }]), /pe boții tăi prezice prea puțin: take-profit-ul se atinge mai des \(60 de judecate pe 20 de zile, la 24 h\)$/);
  assert.match(sursa([{ ore: 24, nTp: 60, zileTp: 20, verdictTp: "prea-mult" }]), /prezice prea mult: take-profit-ul se atinge mai rar/); assert.match(sursa([{ ore: 24, nTp: 60, zileTp: 20, verdictTp: "nedecis" }]), /e încă nedecisă/);
  assert.match(sursa([{ ore: 24, nTp: 60, zileTp: 20, verdictTp: null }]), /strânge date/, "verdict lipsă sau necunoscut: nu se spune „se potrivește”");
  assert.match(functie(APP, "tbCapMargine"), /tpVerif:typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv\.d&&tbMcKv\.d\.calibrareScurt&&Array\.isArray\(tbMcKv\.d\.calibrareScurt\.ore\)\?tbMcKv\.d\.calibrareScurt\.ore:null,/);
  for (const k of ["Întrebarea", "Ce se notează", "Cum se judecă", "Cifra și verdictul", "Simularea sub H0", "Ce NU se face", "Limite cunoscute"]) assert.ok(citeste("docs", "cercetare", "2026-11-21-v100376-sansa-take-profit.md").includes("## " + k), "pre-înregistrarea: " + k);
});

/* ---------- K („fa idei”, a patra oară): rândul take-profit-ului din scenarii, zilele de grile până la take-profit, capul îngust ---------- */
const nrP = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v)) ? null : Number(v));

await test("K1 scenariile: take-profit-ul în procente care din preț nu se atinge e rândul „take-profit, pe poziția de acum” (ca pe Drum și pe grafic), cu nota că se declanșează la un total; pus ca preț rămâne „take-profit-ul”, fără notă", () => {
  const c = lumeBot(), TE = c.TabloExtra, corp = (() => { const i = APP.indexOf("function tbTinteScenariu("); return APP.slice(i, APP.indexOf("\n}", i) + 2); })();
  const ctx = vm.createContext({ botiNr: nrP, tbStare: { scenariuPropriu: null }, TabloExtra: TE, TextRo: globalThis.TextRo, String, Math, isFinite, Number });
  vm.runInContext(corp + "\n" + functie(APP, "tbScenNotaTp") + "\n" + functie(APP, "botiBan") + "\n" + functie(APP, "tbFormateazaSemn") + "\n" + functie(APP, "escapeHtml"), ctx);
  const T = (b) => { ctx.b = b; return JSON.parse(JSON.stringify(vm.runInContext("tbTinteScenariu(b)", ctx))); }, N = (b) => { ctx.b = b; return vm.runInContext("tbScenNotaTp(b)", ctx); };
  /* botul care din preț, în grid, nu mai ajunge pe plus (ca al lui din 21.11), cu take-profit +3% din investiție */
  const proc = Object.assign(botConstruit(c.GridCalcul, { pierdutInainte: 60 }), { opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.03, opritorProfit: 1.31 });
  assert.equal(TE.tpDinPret(proc), false, "din preț, în grid, totalul de +3 USDT nu se atinge");
  const r = T(proc).filter((x) => /take-profit/.test(x.eticheta)); assert.equal(r.length, 1); assert.equal(r[0].eticheta, "take-profit, pe poziția de acum"); assert.ok(r[0].pret > proc.gridSus, "prețul socotit pe poziția de acum, dincolo de grid: " + r[0].pret);
  assert.equal(N(proc), '<p class="tbSub tbScenNota tbScenTp">Take-profit-ul tău e în procente (+3,0% din investiție = +3,0 USDT): se declanșează la un total, nu la un preț. Rândul „take-profit, pe poziția de acum” e prețul socotit de Pionex cu poziția ținută întreagă; gridul o închide pe drum, deci totalul din rând nu e take-profit-ul. Din preț, în gridul ăsta, nu se atinge: doar din grile, în timp.</p>');
  /* în procente, dar atins din preț în grid: rândul e chiar take-profit-ul (totalul de acolo e cel din procent) */
  const atins = Object.assign(botConstruit(c.GridCalcul, {}), { opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.01, opritorProfit: 1.2 });
  assert.equal(TE.tpDinPret(atins), true); assert.equal(T(atins).filter((x) => /take-profit/.test(x.eticheta))[0].eticheta, "take-profit-ul"); assert.equal(N(atins), "");
  /* pus ca preț: neschimbat */
  const pret = Object.assign(botConstruit(c.GridCalcul, { pierdutInainte: 60 }), { opritorProfitActiv: true, opritorProfitTip: "pret", opritorProfit: 1.15 });
  assert.deepEqual(T(pret).filter((x) => /take-profit/.test(x.eticheta)), [{ eticheta: "take-profit-ul", pret: 1.15 }]); assert.equal(N(pret), "");
  assert.equal(N(Object.assign({}, proc, { opritorProfitActiv: false })), ""); assert.equal(T(Object.assign({}, proc, { opritorProfitActiv: false })).some((x) => /take-profit/.test(x.eticheta)), false);
  ctx.TabloExtra = { tpDinPret: () => { throw new Error("pică"); } }; assert.equal(N(proc), "", "o eroare nu ajunge pe ecran");
  assert.match(functie(APP, "renderTabloScenarii"), /\.join\(""\)\+\s*\(typeof tbScenNotaTp==="function"\?tbScenNotaTp\(b\):""\)\+'<p class="tbSub tbScenNota">'/, "nota stă sub rânduri, înaintea notei despre model");
});

await test("K2 „La take-profit”: când din preț nu se atinge, celula spune în câte zile de grile ajunge botul la totalul take-profit-ului - aceeași socoteală ca „Pe zero, din grile”, până la țintă în loc de zero", () => {
  const st = { g: { netZi: 4.6 }, din: false, tinta: 2.8332 };
  const ctx = vm.createContext({ botiNr: nrP, Date, TabloExtra: { tpDinPret: () => st.din, totalLaTinta: () => st.tinta, grileVsCosturi: (b, t) => { assert.ok(t > 1.7e12); if (st.pica) throw new Error("pică"); return st.g; } } });
  vm.runInContext(functie(APP, "tbTpGrile"), ctx); const G = (tot) => { ctx.b = { profitTotal: tot }; return JSON.parse(JSON.stringify(vm.runInContext("tbTpGrile(b)", ctx))); };
  const r = G(-10.2); assert.equal(r.netZi, 4.6); assert.ok(Math.abs(r.zile - (2.8332 + 10.2) / 4.6) < 1e-12, "zile = (totalul take-profit-ului − totalul de acum) / netul pe zi: " + r.zile);
  assert.ok(Math.abs(G(1.1).zile - (2.8332 - 1.1) / 4.6) < 1e-12, "și de pe plus, cât e sub țintă");
  assert.equal(G(2.9), null, "ținta deja trecută: nimic"); assert.equal(G(null), null);
  st.g = { netZi: -0.4 }; assert.deepEqual(G(-10.2), { zile: null, netZi: -0.4 }, "grilele nu acoperă costurile");
  st.g = { netZi: 0 }; assert.deepEqual(G(-10.2), { zile: null, netZi: 0 });
  st.g = { preaTanar: true, netZi: null }; assert.deepEqual(G(-10.2), { tanar: true });
  st.g = { netZi: null }; assert.equal(G(-10.2), null, "fără ritm socotit: nimic"); st.g = null; assert.equal(G(-10.2), null);
  st.g = { netZi: 4.6 }; st.din = true; assert.equal(G(-10.2), null, "atins din preț: celula spune prețul, nu zilele"); st.din = null; assert.equal(G(-10.2), null, "pus ca preț: nimic");
  st.din = false; st.tinta = null; assert.equal(G(-10.2), null); st.tinta = 2.8332; st.pica = true; assert.equal(G(-10.2), null, "o eroare nu ajunge pe ecran");
  assert.match(functie(APP, "tbCapMargine"), /tpDinPret:tpP!==null&&TabloExtra\.tpDinPret\?TabloExtra\.tpDinPret\(b\):null,tpGrile:tpP!==null\?tbTpGrile\(b\):null,/);
  /* celula */
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  const BOT = { dir: "long", pret: 60, jos: 56, sus: 64, stop: 54, stopActiv: true, laMargine: () => -9, laStop: -24.5, total: -10.2, sanse: {}, pas: 0.006, tp: 75.5149, laTp: 2.8332, tpRaport: 0.03, tpDinPret: false };
  const sub = (x) => c.CapMargine.placi(c.CapMargine.alcatuieste({ ...BOT, ...x })).find((q) => q.k === "tp").sub;
  assert.equal(sub({ tpGrile: { zile: 2.833, netZi: 4.6 } }), "+3,0% din investiție · din preț, în grid, nu se atinge · din grile: ~2,8 zile la ritmul de azi, dacă prețul stă pe loc");
  assert.match(sub({ tpGrile: { zile: 14.4, netZi: 1 } }), /din grile: ~14 zile la ritmul de azi/); assert.match(sub({ tpGrile: { zile: 21.2, netZi: 0.7 } }), /din grile: ~21 de zile la ritmul de azi/, "de la 20, cu „de”");
  assert.equal(sub({ tpGrile: { zile: null, netZi: -0.4 } }), "+3,0% din investiție · din preț, în grid, nu se atinge · nici din grile, la ritmul de azi: nu acoperă costurile");
  assert.equal(sub({ tpGrile: { tanar: true } }), "+3,0% din investiție · din preț, în grid, nu se atinge: doar din grile, în timp (ritmul se socotește după o zi de viață a botului)");
  assert.equal(sub({}), "+3,0% din investiție · din preț, în grid, nu se atinge: doar din grile, în timp", "fără ritm: fraza de până acum");
  assert.equal(sub({ tpGrile: { zile: 0, netZi: 4.6 } }), "+3,0% din investiție · din preț, în grid, nu se atinge: doar din grile, în timp"); assert.equal(sub({ tpGrile: "x" }), "+3,0% din investiție · din preț, în grid, nu se atinge: doar din grile, în timp");
  assert.equal(sub({ tpDinPret: true, tp: 62.5, tpGrile: { zile: 2.8, netZi: 4.6 } }), "+3,0% din investiție · pe la 62.5000 (+4,2% de aici)", "atins din preț: fără zile");
});

await test("K3 capul îngust (cutia de 400–899 px: tableta și așezarea pe jumătăți de lângă „Contează acum”): verbul și prețul pe primul rând, restul pe toată lățimea; banda de 7 cifre pe 4 coloane de la 520 px", () => {
  const M = "@container pzcap (min-width:400px) and (max-width:899px)", V = "html.pzDemo #tabloubot #pzVerdict .pzVerbRand:has(>.pzVerbTxt.pzMarg)";
  assert.equal(R.find((x) => x.media === M && x.sel === V + ">.pzVerb").decl, "order:1;flex:0 0 auto;white-space:nowrap", "ca pe telefon; nu „doar ordine” (garda din proba-v100151 e a secțiunilor paginii)");
  assert.equal(R.find((x) => x.media === M && x.sel === V + ">.pzPret").decl, "order:2;margin-left:auto");
  assert.equal(R.find((x) => x.media === M && x.sel === V + ">.pzVerbTxt.pzMarg").decl, "order:3;flex:1 0 100%;min-width:0");
  assert.equal(R.filter((x) => x.media === M).length, 3, "doar ordinea: nicio culoare, nicio literă schimbată");
  const M4 = "@container pzcap (min-width:520px) and (max-width:899px)";
  assert.deepEqual(R.filter((x) => x.media === M4).map((x) => [x.sel, x.decl]), [["html.pzDemo #tabloubot #pzVerdict .pzVerbTxt.pzMarg>.pzLedger:has(>.pzLg:nth-child(7))", "grid-template-columns:repeat(4,minmax(0,1fr))"]]);
  /* capul care nu e al marginii (fără .pzMarg) rămâne cum era: regulile cer .pzMarg */
  assert.equal(R.some((x) => /^@container pzcap \(min-width:(400|520)px\)/.test(x.media || "") && !/\.pzMarg/.test(x.sel)), false);
});

/* ---------- L („fa idei”, a cincea oară): capul pe două treimi lângă „Contează acum”, „dacă prețul stă pe loc” o singură dată, semnul „+” în scenarii ---------- */
await test("L1 1181–1699 px, „Contează acum” cu rânduri lângă capul marginii: capul și cifrele pe două treimi (4 din 6 coloane), „Contează acum” pe o treime; cifrele pe un rând; butoanele lui se rup în loc să iasă din cutie", () => {
  const M = "@media (min-width:1181px) and (max-width:1699px)", P = "html.pzDemo #tabloubot#tabloubot#tabloubot.on:not(.tbFaraBot) .tbCadru:has(>#tbKpiDetalii:not([hidden])):has(>#pzVerdict .pzVerbTxt.pzMarg):has(>#ctAcum:not([hidden]) :is(.ctRand,.ctConcret))";
  const r = R.filter((x) => x.media === M && x.sel.startsWith(P));
  assert.deepEqual(r.map((x) => [x.sel.slice(P.length), x.decl]), [
    [">:is(#pzVerdict,.tbSus,#tbGridLarg)", "grid-column:1 / 5!important"],
    [">#ctAcum:not([hidden])", "grid-column:5 / -1!important"],
    [">.tbSus>#tbKpi", "grid-template-columns:minmax(0,2.4fr) minmax(max-content,1fr) repeat(2,minmax(min-content,1fr))!important;row-gap:0!important"],   /* „Rezultat total” mai lată: rândurile costului pe un singur rând; celelalte trei nu coboară sub conținutul lor */
    [">.tbSus #tbKpi>.tbKpiCel:nth-child(3)", "border-left:1px solid var(--pzLi);padding-left:18px"],
    [">#ctAcum .ctCopiere>.ctBtn", "flex:0 1 auto;max-width:100%;white-space:normal"]]);
  /* doar cu capul marginii (înalt) și doar cu rânduri: verdictul scund păstrează jumătățile din 11.11, „Contează acum” gol rămâne pe tot rândul */
  assert.equal(R.filter((x) => x.media === M && /grid-column:(1 \/ 5|5 \/ -1)/.test(x.decl)).every((x) => x.sel.includes(":has(>#pzVerdict .pzVerbTxt.pzMarg)") && x.sel.includes(":has(>#ctAcum:not([hidden]) :is(.ctRand,.ctConcret))")), true);
  /* jumătățile vechi rămân în foaie, pentru verdictul scund (probele v100.323 / v100.325 le țin) */
  assert.ok(CSS.includes("html.pzDemo #tabloubot.on:not(.tbFaraBot) .tbCadru:has(>#tbKpiDetalii:not([hidden]))>#ctAcum:not([hidden]){grid-column:4 / -1!important;grid-row:2 / span 3!important}"));
  /* rândul plin din „Contează acum” are clasa pe care se sprijină regula; starea goală nu o are */
  const ct = citeste("public", "lib", "conteaza.js"); assert.match(ct, /var rd = '<div class="ctRand '/); assert.equal(/ctRand/.test(/function gol\(ora\) \{[^\n]+/.exec(ct)[0]), false);
});

await test("L2 „dacă prețul stă pe loc” o singură dată în bandă: cu celula „Pe zero, din grile” alături (ritmul și condiția sunt acolo), celula take-profit-ului spune doar zilele la ritmul de azi; fără ea, spune tot", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  const BOT = { dir: "long", pret: 60, jos: 56, sus: 64, stop: 54, stopActiv: true, laMargine: () => -9, laStop: -24.5, total: -10.2, sanse: {}, pas: 0.006, tp: 75.5149, laTp: 2.8332, tpRaport: 0.03, tpDinPret: false, tpGrile: { zile: 2.833, netZi: 4.6 } };
  const P = (x) => JSON.parse(JSON.stringify(c.CapMargine.placi(c.CapMargine.alcatuieste({ ...BOT, ...x })))), tp = (x) => P(x).find((q) => q.k === "tp").sub;
  const cuZero = { zero: { pret: null, neatins: true, pretPoz: 71.3, grile: { zile: 2.217, netZi: 4.6 } } };
  assert.equal(tp(cuZero), "+3,0% din investiție · din preț, în grid, nu se atinge · din grile: ~2,8 zile la ritmul de azi");
  assert.deepEqual(P(cuZero).find((q) => q.k === "zeroGrile"), { k: "zeroGrile", et: "Pe zero, din grile", val: "~2,2 zile", sub: "la ritmul de azi (+4,6 USDT pe zi), dacă prețul stă pe loc" }, "condiția și ritmul rămân aici");
  const toate = P(cuZero).map((q) => q.sub || "").join(" | "); assert.equal(toate.split("dacă prețul stă pe loc").length - 1, 1, "o singură dată în bandă: " + toate);
  /* fără celula de zile până la zero (zero în grid, sub o zi, grilele nu acoperă costurile): celula take-profit-ului își spune singură condiția */
  assert.equal(tp({}), "+3,0% din investiție · din preț, în grid, nu se atinge · din grile: ~2,8 zile la ritmul de azi, dacă prețul stă pe loc");
  assert.match(tp({ zero: { pret: 61.5, neatins: false, grile: { zile: 2.2, netZi: 4.6 } } }), /, dacă prețul stă pe loc$/, "zero în grid: celula „Pe zero, din grile” nu există");
  assert.match(tp({ zero: { pret: null, neatins: true, pretPoz: 71.3, grile: { tanar: true } } }), /, dacă prețul stă pe loc$/);
  assert.match(tp({ zero: { pret: null, neatins: true, pretPoz: 71.3, grile: { zile: null, netZi: -0.4 } } }), /, dacă prețul stă pe loc$/);
  assert.match(tp({ zero: { pret: null, neatins: true, pretPoz: 71.3 } }), /, dacă prețul stă pe loc$/);
});

await test("L3 scenariile: mișcarea în sus are „+” în față (în jos avea deja „−”); zero rămâne fără semn", () => {
  const corp = functie(APP, "renderTabloScenarii");
  assert.match(corp, /\(nume\[x\.eticheta\]\|\|x\.eticheta\)\+' · '\+\(x\.miscare>0\?"\+":""\)\+tbFormateazaSemn\(x\.miscare,1\)\+'%'\)/);
  const el = { innerHTML: "" }, b = { id: 1, pretLichidare: 27.3 };
  const ctx = vm.createContext({ $: () => el, tbStare: { routeOk: true, bot: b, botBrut: {} }, escapeHtml: (s) => String(s), TextRo: globalThis.TextRo, botiNr: nrP, botiBan: (v) => String(v), tbPretScurt: (v) => String(v), tbScenLichidat: () => false, tbTinteScenariu: () => [], tbTotalLa: () => null, tbPozitieLa: () => null,
    Scenariu: { scenarii: () => ({ ok: true, grid: { randuri: 30, q: 0.09, inv: 94 }, pretGolire: 28, randuri: [{ pret: 64, eticheta: "marginea de sus", miscare: 5.31, pozitie: 0, total: -8.7 }, { pret: 56, eticheta: "jos", miscare: -7.72, pozitie: 2.7, total: -19.1 }, { pret: 60.8, eticheta: "prețul tău", miscare: 0, pozitie: 1, total: -10 }, { pret: 63.7, eticheta: "+5%", miscare: 5, pozitie: 0.2, total: -8.7 }] }) } });
  vm.runInContext(functie(APP, "tbFormateazaSemn") + "\n" + corp, ctx); vm.runInContext("renderTabloScenarii()", ctx);
  assert.ok(el.innerHTML.includes("marginea de sus · +5,3%"), el.innerHTML.slice(0, 400)); assert.ok(el.innerHTML.includes("marginea de jos · −7,7%")); assert.ok(el.innerHTML.includes("prețul tău · 0,0%"));
  assert.ok(el.innerHTML.includes('<span class="tbSub">+5%</span>'), "eticheta care e ea însăși un procent rămâne cum era");
});

await test("L4 proba de ecran a Tabloului (Chrome adevărat, rulată de poarta de dinaintea împingerii) ține pasul nou: „Contează acum” cu rânduri pe calculator; pașii vechi citesc rândurile cifrelor din blocul lor", () => {
  const E = citeste("scripts", "proba-ecran-tablou.mjs");
  assert.match(E, /await test\("D12g\. calculator: „Contează acum” cu trei rânduri pline nu iese din cutia ei, nici din ecran; lângă verdictul scund stă pe jumătate, lângă capul marginii pe o treime"/);
  assert.match(E, /async marime\(l, h\) \{ await send\("Emulation\.setDeviceMetricsOverride"/); assert.match(E, /for \(const lat of \[1280, 1440\]\)/);
  assert.match(E, /finally \{\s*await b\.ev\(`if \(window\.__capProba\) \{ tbCapMargine = window\.__capProba; delete window\.__capProba; \} true`\);\s*await b\.marime\(390, 900\);/, "capul adevărat și lățimea de telefon se pun la loc și când pasul pică");
  assert.match(E, /const kpi = \(await textEl\(b, "tbKpi"\)\) \+ " · " \+ \(await textEl\(b, "tbKpiDetalii"\)\);/); assert.match(E, /assert\.match\(String\(baniDet\), \/Până la lichidare/);
  assert.match(citeste("scripts", "inainte-de-push.mjs"), /fisier: "proba-ecran-tablou\.mjs"/, "proba de ecran rămâne în poarta de dinaintea împingerii");
});

/* ---------- M („fa idei”, a șaptea oară): rândul costului sub 1340 px, pasul de ecran la tabletă și calculator, ștampila probelor de ecran ---------- */
await test("M1 pe două treimi, sub 1340 px: calificativul „pornire și închidere” al rândului de cost se ascunde (celula are ~200–290 px); explicația lui rămâne în titlul rândului", () => {
  const M = "@media (min-width:1181px) and (max-width:1339px)", P = "html.pzDemo #tabloubot#tabloubot#tabloubot.on:not(.tbFaraBot) .tbCadru:has(>#tbKpiDetalii:not([hidden])):has(>#pzVerdict .pzVerbTxt.pzMarg):has(>#ctAcum:not([hidden]) :is(.ctRand,.ctConcret))";
  assert.deepEqual(R.filter((x) => x.media === M).map((x) => [x.sel, x.decl]), [[P + ">.tbSus #tbKpiCost .pzKv small", "display:none"]]);
  /* nimic pierdut: titlul rândului spune ce ascunde regula, iar <small> e chiar calificativul */
  assert.match(functie(APP, "tbCostDeseneaza"), /<span title="Comisionul plătit la pornire plus cel de la închidere \(estimat\)\.[^"]*">costul botului <small>pornire și închidere<\/small><\/span>/);
});

await test("M2 ștampila probelor de ecran: fără rulare - „niciodată aici”; după o rulare întreagă - „la zi”; orice fișier de ecran schimbat (sau proba însăși) o învechește; depozite diferite nu-și amestecă ștampilele", async () => {
  const A = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "amprenta-ecran.mjs")).href);
  const os = await import("node:os"), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proba-amprenta-")), rad = path.join(tmp, "depozit"), st = path.join(tmp, "stampile");
  try {
    for (const d of ["public/lib", "scripts", "stampile"]) fs.mkdirSync(path.join(d === "stampile" ? tmp : rad, d), { recursive: true });
    const scrie = (f, t) => fs.writeFileSync(path.join(rad, f), t);
    scrie("public/index.html", "<html>"); scrie("public/app.css", "a{}"); scrie("public/app.js", "var a"); scrie("public/lib/x.js", "var x"); scrie("public/poza.png", "p"); scrie("scripts/proba-ecran-tablou.mjs", "// t"); scrie("scripts/proba-ecran-telefon.mjs", "// f");
    assert.deepEqual(A.fisiereEcran(rad), ["public/app.css", "public/app.js", "public/index.html", "public/lib/x.js"], "pagina, foaia, codul și bibliotecile; nu pozele");
    assert.deepEqual(A.stare(rad, "proba-ecran-tablou.mjs", st), { rulata: false, laZi: false, la: null });
    let t = A.textStare(rad, st); assert.equal(t.ok, false); assert.match(t.text, /^⚠ probele de ecran NU au fost rulate pe fișierele de acum: proba de ecran a Tabloului \(niciodată aici\) ⇒ node scripts\/proba-ecran-tablou\.mjs \(~1 min\) · proba de telefon \(niciodată aici\) ⇒ node scripts\/proba-ecran-telefon\.mjs \(~3 min\) · lanțul nu deschide niciun browser; poarta de împingere le rulează oricum$/);
    const s1 = A.scrieStampila(rad, "proba-ecran-tablou.mjs", { ok: 77 }, st); assert.match(s1.amprenta, /^[0-9a-f]{16}$/); assert.equal(s1.ok, 77);
    assert.equal(A.stare(rad, "proba-ecran-tablou.mjs", st).laZi, true); assert.equal(A.stare(rad, "proba-ecran-telefon.mjs", st).rulata, false, "fiecare probă cu ștampila ei");
    t = A.textStare(rad, st); assert.equal(t.ok, false); assert.equal(/Tabloului/.test(t.text), false, "doar proba rămasă în urmă e numită"); assert.match(t.text, /proba de telefon \(niciodată aici\)/);
    A.scrieStampila(rad, "proba-ecran-telefon.mjs", null, st); t = A.textStare(rad, st); assert.equal(t.ok, true); assert.match(t.text, /^probele de ecran: rulate pe fișierele de acum \(proba de ecran a Tabloului \d\d\.\d\d \d\d:\d\d · proba de telefon \d\d\.\d\d \d\d:\d\d\)$/);
    /* o schimbare în foaie, într-o bibliotecă sau în proba însăși învechește ștampila; o poză nu */
    scrie("public/poza.png", "alta"); assert.equal(A.stare(rad, "proba-ecran-tablou.mjs", st).laZi, true);
    scrie("public/app.css", "a{color:red}"); assert.deepEqual([A.stare(rad, "proba-ecran-tablou.mjs", st).laZi, A.stare(rad, "proba-ecran-tablou.mjs", st).rulata], [false, true]);
    t = A.textStare(rad, st); assert.match(t.text, /proba de ecran a Tabloului \(ultima oară \d\d\.\d\d \d\d:\d\d, pe alte fișiere\)/); assert.match(t.text, /proba de telefon \(ultima oară/);
    scrie("public/app.css", "a{}"); assert.equal(A.stare(rad, "proba-ecran-tablou.mjs", st).laZi, true, "întoarsă la loc: iar la zi");
    scrie("public/lib/x.js", "var y"); assert.equal(A.stare(rad, "proba-ecran-tablou.mjs", st).laZi, false); scrie("public/lib/x.js", "var x");
    scrie("scripts/proba-ecran-tablou.mjs", "// t2"); assert.equal(A.stare(rad, "proba-ecran-tablou.mjs", st).laZi, false, "și proba schimbată trebuie rulată din nou"); assert.equal(A.stare(rad, "proba-ecran-telefon.mjs", st).laZi, true);
    /* alt depozit (altă copie de lucru): altă ștampilă */
    assert.notEqual(A.caleStampila(rad, "proba-ecran-tablou.mjs", st), A.caleStampila(path.join(tmp, "alta-copie"), "proba-ecran-tablou.mjs", st));
    /* ștampilă stricată = nerulată */
    fs.writeFileSync(A.caleStampila(rad, "proba-ecran-telefon.mjs", st), "{"); assert.equal(A.stare(rad, "proba-ecran-telefon.mjs", st).rulata, false);
    /* serverul trebuie să servească fișierele depozitului: altfel proba a măsurat altă copie */
    fs.writeFileSync(path.join(rad, "public", "lib", "asezare-paznic.js"), "var p");
    const srv = (alt) => async (u) => { const n = u.split("/").slice(3).join("/"), b = fs.readFileSync(path.join(rad, "public", n)); return { ok: true, arrayBuffer: async () => (alt === n ? Buffer.from("altceva") : b) }; };
    assert.equal(await A.servesteDepozitul(rad, "http://127.0.0.1:1/", srv(null)), true); assert.equal(await A.servesteDepozitul(rad, "http://127.0.0.1:1/", srv("app.css")), false); assert.equal(await A.servesteDepozitul(rad, "http://127.0.0.1:1/", srv("lib/asezare-paznic.js")), false);
    assert.equal(await A.servesteDepozitul(rad, "http://127.0.0.1:1/", async () => ({ ok: false })), false); assert.equal(await A.servesteDepozitul(rad, "http://127.0.0.1:1/", async () => { throw new Error("jos"); }), false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

await test("M3 legăturile: probele de ecran își scriu ștampila doar la rularea ÎNTREAGĂ, trecută, pe serverul care servește depozitul; lanțul spune starea lor pe ultimul rând, fără să pice; proba Tabloului are pasul de tabletă și calculator", () => {
  const E = citeste("scripts", "proba-ecran-tablou.mjs"), T = citeste("scripts", "proba-ecran-telefon.mjs"), pk = JSON.parse(citeste("package.json"));
  assert.match(E, /if \(picate\) process\.exit\(1\);\s*console\.log\("  ecranul pastreaza purtarile reparate\.\\n"\);\s*\/\*[^*]*\*\/\s*if \(!DOAR\) \{ try \{ if \(await servesteDepozitul\(RAD_E, URL_T\)\) \{ scrieStampila\(RAD_E, "proba-ecran-tablou\.mjs", \{ ok, url: URL_T \}\);/, "după ieșirea pe picare, nu la --doar");
  assert.match(T, /if \(!picate && !process\.argv\[4\]\) \{ try \{ const RAD_E = [^;]+; if \(await servesteDepozitul\(RAD_E, URL_T\)\) \{ scrieStampila\(RAD_E, "proba-ecran-telefon\.mjs", \{ url: URL_T \}\);/, "nu cu pagini alese de mână, nu cu picări");
  assert.ok(T.indexOf("scrieStampila(RAD_E") < T.indexOf("if (picate) process.exit(1);"), "ștampila înaintea ieșirii");
  assert.match(pk.scripts.test, / && node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/, "ultimul rând al lanțului");
  const S = citeste("scripts", "stare-probe-ecran.mjs"); assert.match(S, /process\.exit\(0\);\s*$/); assert.equal(/process\.exit\([1-9]/.test(S), false, "doar spune: poarta de împingere e cea care oprește");
  assert.match(E, /await test\("D12h\. tabletă și calculator \(768 \/ 1024 \/ 1440 \/ 1920\): nimic din Tablou nu iese din ecran, cu toate pliurile deschise; pagina nu curge lateral"/); assert.match(E, /for \(const lat of \[768, 1024, 1440, 1920\]\)/);
  /* amprenta ia chiar fișierele pe care le schimbă lucrul de așezare */
  const lista = [], A0 = citeste("scripts", "lib", "amprenta-ecran.mjs"); assert.match(A0, /\\\.\(html\|css\|js\)\$/); assert.match(A0, /"public\/lib\/" \+ f/); assert.match(A0, /concat\(\["scripts\/" \+ proba\]\)/); void lista;
});

await test("D3 versiunea v100.376 e pusă peste tot și proba e în lanț, după v100.375", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  /* v100.377: „de la 376 încolo” (versiunea merge mai departe) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 376, "package.json: de la 100.376 încolo"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 376); assert.ok(bi.tb376 && bi.tb376.length > 200, "BUILD_INFO.tb376");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 376).length >= 4, true, "index.html: v100.376 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 376, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 376, "versiune.js");
  assert.match(pk.scripts.test, /npm run test:v100375 && npm run test:v100376/); assert.equal(pk.scripts["test:v100376"], "node scripts/proba-v100376.mjs");
});

console.log(`\n${teste - picate} din ${teste} au trecut\n`);
process.exit(picate ? 1 : 0);
