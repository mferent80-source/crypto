// Proba v100.325 (11.11.2026, el: „da, aplică regula simetrică și în tabel, mai mult verifică pagina de spații goale și rezolvă dacă sunt în plus,
// fă și meniul la fel ca pagina botului”):
//   1. mediile EMA SIMETRIC și în tabelul „Detaliile indicatorilor” (IndicatoriBot.celule): 20 > 50 > 200 ↑, 20 < 50 < 200 ↓, restul neutru (↗ / ↘);
//      înainte „20 sub 50” era ↓ și când 50 > 200, iar oglinda lui doar ↗ neutru ⇒ un short câștiga un „jos” pe care un long nu-l primea;
//   2. spațiile goale în plus din Tabloul botului (măsurate pe live la 412…2560);
//   3. meniul ca pagina botului: cât ești pe Tablou, meniul din stânga (și bara de jos pe telefon) ia tema Tabloului.
//   node scripts/proba-v100325.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.325 · mediile simetric în tabel, spațiile goale, meniul ca pagina botului · proba\n");
const J = (x) => JSON.parse(JSON.stringify(x));
const CSS = citeste("public", "app.css");
const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, Date, RegExp, Intl, TextRo: globalThis.TextRo };
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "indicatori-bot.js") + "\nthis.IB = IndicatoriBot;", ctx);
const IB = ctx.IB;
const Q = (e20, e50, e200, o = {}) => Object.assign({ ver: "NEUTRAL", score: 50, prag: 65, ema: e20 > e50 && e50 > e200, emaDir: e20 > e50 ? "UP" : "DOWN", e20Now: e20, e50Now: e50, e200Now: e200 }, o);

// ───────────── 1. mediile simetric în tabel ─────────────
await test("tabelul: 20 > 50 > 200 ↑ (urcare așezată), 20 < 50 < 200 ↓ (coborâre așezată), amestecat ⇒ neutru ↗ / ↘ — în oglindă", () => {
  const e = (q) => J(IB.celule(q).ema);
  assert.deepEqual(e(Q(3, 2, 1)), { t: "↑", c: "good", titlu: "așezat pe urcare: 20 > 50 > 200" });
  assert.deepEqual(e(Q(1, 2, 3)), { t: "↓", c: "bad", titlu: "așezat pe coborâre: 20 < 50 < 200" });
  assert.deepEqual(e(Q(2, 1, 3)), { t: "↗", c: "neutral", titlu: "20 peste 50, dar 50 nu e peste 200" });
  assert.deepEqual(e(Q(1, 2, 0)), { t: "↘", c: "neutral", titlu: "20 sub 50, dar 50 nu e sub 200" }, "înainte: ↓ jos (asimetric)");
});
await test("tabelul: fără mediile ca cifre (calc vechi) tot în oglindă - ↑ doar așezat, ↗ / ↘ neutru (fără 200 nu știm „coborâre așezată”)", () => {
  assert.equal(J(IB.celule({ ver: "NEUTRAL", ema: true, emaDir: "UP" }).ema).t, "↑");
  assert.equal(J(IB.celule({ ver: "NEUTRAL", ema: false, emaDir: "UP" }).ema).t, "↗");
  assert.deepEqual(J(IB.celule({ ver: "NEUTRAL", ema: false, emaDir: "DOWN" }).ema), { t: "↘", c: "neutral", titlu: "20 sub 50" }, "revizia: era ↓ roșu (asimetric)");
});
await test("revizia: 20 = 50 (preț plat) ⇒ ↔ neutru, nu „20 sub 50”; titlul rândului spune și oglinda", () => {
  assert.deepEqual(J(IB.celule(Q(2, 2, 1)).ema), { t: "↔", c: "neutral", titlu: "20 și 50 egale" });
  assert.match(J(IB.RANDURI || []).map((r) => r.k === "ema" ? r.titlu : "").join("") || citeste("public", "lib", "indicatori-bot.js"), /20 sub 50 sub 200 = coborâre așezată/);
});
await test("banda folosește aceeași celulă (o singură regulă, nu două)", () => {
  const SRC = citeste("public", "lib", "indicatori-bot.js");
  assert.doesNotMatch(SRC, /function emaSimetric/, "regula stă într-un singur loc: celule");
  const b = J(IB.banda([{ eticheta: "4 ore", q: Q(1, 2, 0) }], "short"))[0];
  assert.ok(b.familii[0].membri.includes("Medii EMA ↔"), "20 < 50 dar 50 > 200 ⇒ neutru și în bandă (v100.339: în familia „trend”) · " + JSON.stringify(b.familii[0]));
});

// ───────────── 2. spațiile goale ─────────────
// măsurat pe live (v100.324, 11.11): sub grafic, în stânga, 319 px goi la 1920×950, 373 la 1440, 407 la 1280 (coloana din dreapta mai lungă decât
// graficul strâns „ca să încapă la deschidere” - și tot nu încăpea, de când Drumul stă deasupra); 64 px goi deasupra „Ce e pe grafic” (pornea un rând
// sub titlul „Prețul”); la 1280 / 1440 „Contează acum” întinsă cu 90–265 px peste conținut.
const SRC_GB = ["grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "grafic-bot.js"].map((f) => citeste("public", "lib", f)).join("\n");
const GB = new Function(`${SRC_GB}; return typeof GraficBot !== "undefined" ? GraficBot : null;`)();
const T0 = 1_790_500_000_000, M5 = 5 * 60000;
function klines(baza, n = 288) {
  const out = [];
  for (let i = 0; i < n; i++) { const c = baza * (1 - 0.087 * (i / (n - 1)) + 0.0065 * Math.sin(i / 5)), o = i ? Number(out[i - 1].close) : c; out.push({ time: T0 + i * M5, open: String(o), close: String(c), high: String(Math.max(o, c) * 1.002), low: String(Math.min(o, c) * 0.998), volume: String(1000 + 500 * Math.abs(Math.sin(i / 7))) }); }
  return out.reverse();
}
const desen = (o) => GB.desen(Object.assign({ bare: GB.bare(klines(0.32)), W: 1100, ingust: false, st: {}, niv: [], grila: {}, per: "24h" }, o)).harta;
await test("graficul: încape la deschidere ⇒ ca înainte; nu încape nici strâns (prețul ar coborî la 220) ⇒ ia cât încape pe UN ecran (o.inaltEcran), nu se mai strânge degeaba", () => {
  const h0 = desen({}), rest = h0.H - h0.mainH;
  assert.equal(h0.mainH, 540, "înălțimea firească la 1100 px");
  assert.equal(desen({ inaltMax: h0.H - 100 }).mainH, 440, "încape la deschidere, strâns: ca în v100.322");
  assert.equal(desen({ inaltMax: rest + 100 }).mainH, 220, "fără o.inaltEcran: exact ca înainte");
  const e = desen({ inaltMax: rest + 100, inaltEcran: h0.H + 300 });
  assert.equal(e.mainH, 540, "nu încape la deschidere ⇒ înălțimea firească, cât încape pe un ecran");
  assert.equal(desen({ inaltMax: rest + 100, inaltEcran: rest + 400 }).mainH, 400, "nici pe un ecran firesc ⇒ cât încape pe ecran");
  assert.equal(desen({ ingust: true, W: 390, inaltMax: rest + 100, inaltEcran: 2000 }).mainH, desen({ ingust: true, W: 390 }).mainH, "pe telefon nimic nu se schimbă");
});
await test("revizia: titlul graficului SUB marginea ecranului (tbInaltMaxGrafic = 0: laptop 1366 × 768, 1280 × 800) ⇒ tot cât încape pe un ecran + umplerea", () => {
  const h0 = desen({}), rest = h0.H - h0.mainH;
  assert.equal(desen({ inaltMax: 0, inaltEcran: h0.H + 300, inaltLoc: h0.H + 150 }).H, h0.H + 150, "înainte: blocul sărit ⇒ H firesc, golul rămânea");
  assert.equal(desen({ inaltMax: 0, inaltEcran: rest + 400 }).mainH, 400);
  assert.equal(desen({ inaltMax: 0 }).H, h0.H, "fără nimic ⇒ exact ca înainte");
});
await test("graficul umple locul de lângă coloana din dreapta (o.inaltLoc), fără să treacă de ecran (pe calculator) și fără să strice potrivirea la deschidere", () => {
  const h0 = desen({}), rest = h0.H - h0.mainH;
  assert.equal(desen({ inaltMax: rest + 100, inaltEcran: h0.H + 300, inaltLoc: h0.H + 150 }).H, h0.H + 150, "coloana din dreapta mai lungă ⇒ graficul crește până la ea");
  assert.equal(desen({ inaltMax: rest + 100, inaltEcran: h0.H + 300, inaltLoc: h0.H + 500 }).H, h0.H + 300, "dar nu peste un ecran");
  assert.equal(desen({ inaltMax: h0.H + 200, inaltLoc: h0.H + 100 }).H, h0.H + 100, "încape la deschidere ⇒ crește până la coloană…");
  assert.equal(desen({ inaltMax: h0.H + 200, inaltLoc: h0.H + 400 }).H, h0.H + 200, "…doar cât încape încă la deschidere");
  assert.equal(desen({ inaltMax: h0.H + 200, inaltLoc: h0.H - 300 }).H, h0.H, "coloana mai scurtă ⇒ graficul nu scade sub înălțimea lui");
});
const APP = citeste("public", "app.js");
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
await test("Tabloul dă graficului locul de pe un ecran și înălțimea coloanei din dreapta (din înălțimile bucăților, nu din poziții) și redesenează O dată când coloana se schimbă", () => {
  const e = functie(APP, "tbInaltEcranGrafic");
  assert.match(e, /matchMedia\("\(min-width:1181px\)"\)/);
  assert.match(e, /document\.querySelector\("\.topStatus"\)/, "bara de sus lipicioasă se scade");
  const c = functie(APP, "tbInaltColoanaGrafic");
  assert.match(c, /#tbGrafic>:is\(\.gbValori,\.gbBilant,\.gbUlt,\.gbValGrid,\.gbLeg\),#tbGraficCard>#pzUltimii/);
  assert.match(c, /#tbKpiDetalii:not\(\[hidden\]\)/, "doar în așezarea pe coloane");
  assert.doesNotMatch(c, /\.bottom/, "pozițiile se lungesc după grafic (rândurile împărțite) ⇒ doar înălțimi");
  const r = functie(APP, "renderTabloGrafic");
  assert.match(r, /oG\.inaltEcran=tbInaltEcranGrafic\(ingust\);oG\.inaltLoc=tbGrafRz\.loc\|\|0;/);
  assert.match(r, /var col=ingust\?0:tbInaltColoanaGrafic\(\);/, "revizia: graficul îngust nu folosește coloana ⇒ fără desen în plus");
  assert.match(c, /document\.querySelector\("html\.pzDemo #tabloubot\.on:not\(\.tbFaraBot\) \.tbCadru"\)/);
  // revizia: „ultimii boți închiși” se umplu DUPĂ desen (~1,5 s) ⇒ graficul se potrivește atunci, într-un singur desen, nu la următorul preț (≥ 5 s)
  const p = functie(APP, "tbPotrivesteGraficul");
  assert.match(p, /tbGrafRz\.loc=col;renderTabloGrafic\(\)/);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /if \(el\._h !== h\) \{ el\.innerHTML = h; el\._h = h; if \(typeof window\.tbPotrivesteGraficul === "function"\) window\.tbPotrivesteGraficul\(\); \}/);
  // pagina copiei la 1280 × 800: „acum 0.3197” se scria în capul graficului DUPĂ măsurare ⇒ capul trecea pe 2 rânduri (46 → 71 px) și graficul ieșea cu 25 px peste ecran
  const iPret = r.indexOf('$("tbGraficPret").textContent="acum "'), iMax = r.indexOf("oG.inaltMax=tbInaltMaxGrafic(ingust)");
  assert.ok(iPret > 0 && iMax > 0 && iPret < iMax, "prețul din capul graficului se scrie ÎNAINTE de măsurarea locului");
  assert.equal(r.split('$("tbGraficPret").textContent=').length - 1, 1, "o singură dată");
  assert.match(r, /if\(col>0&&!tbGrafRz\.reluat&&Math\.abs\(col-\(tbGrafRz\.loc\|\|0\)\)>24\)\{tbGrafRz\.loc=col;tbGrafRz\.reluat=true;try\{renderTabloGrafic\(\)\}finally\{tbGrafRz\.reluat=false\}return\}/);
});
const P = "html.pzDemo #tabloubot.on:not(.tbFaraBot) .tbCadru:has(>#tbKpiDetalii:not([hidden]))";
await test("„Ce e pe grafic” urcă pe rândul titlului „Prețul” (fără cei 64 px goi); graficul și coloana din dreapta pe rândurile 7–12", () => {
  for (const r of [" #tbGrafic>.gbValCap{grid-row:6;align-self:start;margin:6px 0 0;border-top:1px solid var(--pzLi);padding-top:12px}",
    " #tbGrafic>.gbZona{grid-column:1 / 5;grid-row:7 / span 6;align-self:start}", " #tbGrafic>.gbValori{grid-row:7;", " #tbGrafic>.gbBilant{grid-row:8;",
    " #tbGrafic>.gbUlt{grid-row:9;", " #tbGrafic>.gbValGrid{grid-row:10;", " #tbGrafic>.gbLeg{grid-row:11;", " #tbGraficCard>#pzUltimii{grid-row:12;"])
    assert.ok(CSS.includes(P + r), "lipsește: " + r);
  assert.ok(!CSS.includes(P + " #tbGrafic>.gbZona{grid-column:1 / 5;grid-row:7 / span 7;"), "rândul vechi a rămas");
});
await test("graficul mai înalt decât coloana din dreapta: diferența o ia ULTIMUL rând (12, elastic), bucățile din dreapta rămân strânse (poza 1920 de pe copie: ~25 px între ele)", () => {
  assert.ok(CSS.includes(P + "{grid-template-rows:repeat(11,auto) 1fr}"));
  const i = CSS.indexOf(P + "{grid-template-rows:"), m = CSS.lastIndexOf("@media", i), inchis = CSS.lastIndexOf("\n}", i);
  assert.ok(CSS.lastIndexOf("@media (min-width:1181px){", i) === m || inchis > m, "e în așezarea de calculator, nu sub ea");
});
await test("1181–1699 px: „Contează acum” lângă verdict și cifre (rândurile 2–4), Drumul pe toată lățimea (rândul 5) ⇒ cartela nu se mai întinde peste golul ei", () => {
  const i = CSS.indexOf("@media (min-width:1181px) and (max-width:1699px){\n" + P + ">#pzVerdict"), B = CSS.slice(i, CSS.indexOf("\n}", i));
  assert.ok(i > 0);
  assert.ok(B.includes(P + ">#ctAcum:not([hidden]){grid-column:4 / -1!important;grid-row:2 / span 3!important}"));
  assert.ok(B.includes(P + ">#pzDrumCard{grid-column:1 / -1!important}"));
  assert.ok(B.includes(P + ">#tbGridLarg{grid-column:1 / 4!important}"), "rândul 4 tot nu rămâne liber pe toată lățimea (dense)");
});
await test("revizia: niciun rând de sus liber pe toată lățimea când lipsesc avertismentul (4) și / sau Drumul (5) - altfel „dense” urcă detaliile cifrelor deasupra graficului", () => {
  const fara = (id) => ":not(:has(>#" + id + ":not([hidden])))";
  for (const r of [P + fara("tbGridLarg") + ">.tbSus{grid-row:3 / span 2!important}",
    P + fara("tbGridLarg") + fara("pzDrumCard") + ">.tbSus{grid-row:3 / span 3!important}",
    P + fara("pzDrumCard") + ">#tbGridLarg{grid-row:4 / span 2!important}",
    P + " #tbGrafic>.emptyState{grid-column:1 / 5;grid-row:7 / span 6}"])
    assert.ok(CSS.includes(r), "lipsește: " + r.slice(P.length));
});

// ───────────── 3. meniul ca pagina botului ─────────────
const blocMeniu = () => { const i = CSS.indexOf("/* v100.325 · meniul ca pagina botului"), k = CSS.indexOf("/* v100.325: sfârșitul meniului ca pagina botului */"); assert.ok(i > 0 && k > i, "blocul meniului lipsește"); return CSS.slice(i, k); };
await test("meniul: cât ești pe Tablou ia litera Tabloului (IBM Plex Sans), iar pe tema de zi a Tabloului exact culorile paginii (alb, cerneala, albastrul de accent)", () => {
  const B = blocMeniu();
  assert.ok(B.includes('html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on) .sideNav,html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on) .mobileBottom,html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on) :is(.sideBtn,.mobileNavBtn){font-family:"IBM Plex Sans",system-ui,"Segoe UI",sans-serif}'), "revizia: butoanele nu moștenesc litera");
  assert.doesNotMatch(B, /font-weight/, "revizia: butonul paginii deschise rămâne la grosimea celorlalte (750)");
  assert.doesNotMatch(B, /sideFooter/, "revizia: subsolul e mutat în „Starea aplicației” ⇒ regula nu prindea");
  for (const r of ["html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .sideNav{background:#FFFFFF;border-right:1px solid #E0E5EC;color:#0E1A2B}",
    "html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .sideBtn{color:#48586E}", "html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .sideBtn:hover{background:#F5F7FA;border-color:transparent;color:#0E1A2B}",
    "html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .sideBtn.active{background:rgba(36,86,230,.10);border-color:#E0E5EC;color:#0E1A2B}",
    "html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .sideLogo{background:#2456E6;border-color:#C3CCD8;color:#FFFFFF}"])
    assert.ok(B.includes(r), "lipsește: " + r);
  // culorile sunt chiar ale temei de zi a Tabloului (#tabloubot.tbZi), nu altele
  const zi = /:is\(#tabloubot,#t212,#dash,#rangefilter\)\.tbZi\{([^}]*)\}/.exec(CSS)[1];   // v100.326: rădăcina comună
  for (const [v, c] of [["--panel", "#FFFFFF"], ["--line", "#E0E5EC"], ["--text", "#0E1A2B"], ["--muted", "#48586E"], ["--accent", "#2456E6"], ["--pzT2", "#66768B"], ["--pzLi2", "#C3CCD8"]])
    assert.ok(zi.includes(v + ":" + c), v + " ≠ " + c);
});
await test("meniul pe telefon (bara de jos) la fel, iar pe celelalte pagini nimic nu se schimbă; nimic ascuns, niciun buton scos", () => {
  const B = blocMeniu();
  assert.match(B, /@media \(max-width:980px\)\{\nhtml:has\(:is\(#tabloubot,#t212,#dash,#rangefilter\)\.on\.tbZi\) \.mobileBottom\{background:#FFFFFF;border:1px solid #E0E5EC\}/);
  // fiecare regulă e legată de Tabloul deschis
  for (const r of B.split("\n").filter((l) => /\{[^}]*\}/.test(l) && !l.startsWith("@media"))) assert.match(r, /^html:has\(:is\(#tabloubot,#t212,#dash,#rangefilter\)\.on/, "regulă fără legătură cu Tabloul: " + r.slice(0, 80));
  assert.doesNotMatch(B, /display:none|visibility:hidden/);
  const HTML = citeste("public", "index.html"), a = HTML.slice(HTML.indexOf('<aside class="sideNav">'), HTML.indexOf("</aside>", HTML.indexOf('<aside class="sideNav">')));
  assert.equal((a.match(/class="sideBtn[" ]/g) || []).length, 59, "cele 59 de butoane ale meniului (și cele din „Laborator vechi”)");
  assert.equal((a.match(/class="sideGrupCap"/g) || []).length, 3);
  assert.equal((HTML.match(/class="mobileNavBtn/g) || []).length, 5);
});

await test("rama din jurul Tabloului (poza ecranului întreg: meniul alb, dar bara de sus, fâșia cu cifre și fondul rămâneau închise): pe tema de zi a Tabloului ia aceleași culori", () => {
  const B = blocMeniu(), zi = /:is\(#tabloubot,#t212,#dash,#rangefilter\)\.tbZi\{([^}]*)\}/.exec(CSS)[1];
  const pz = zi.split(";").filter((d) => d.startsWith("--pz")).join(";");
  assert.ok(pz.length > 100);
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi){" + pz + "}"), "variabilele --pz* ale fâșiei = exact cele ale Tabloului de zi");
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) body{background:#F2F4F7!important}"), "fondul paginii (body are !important închis)");
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .topStatus{--text:#0E1A2B;--muted:#48586E;--good:#0B8A5F;--bad:#CC3A32;--warn:#8A5A00;background:#FFFFFF!important;border-bottom:1px solid #E0E5EC;color:#0E1A2B}"), "bara de sus: culorile de stare doar în ea");
  for (const [v, c] of [["--text", "#0E1A2B"], ["--muted", "#48586E"], ["--good", "#0B8A5F"], ["--bad", "#CC3A32"], ["--warn", "#8A5A00"]]) assert.ok(zi.includes(v + ":" + c), v);
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .statusChip{border:1px solid #E0E5EC;background:#F5F7FA;color:#48586E}"));
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212,#dash,#rangefilter).on.tbZi) .topStatus button:hover{background:#E9EDF3;border-color:#C3CCD8}"), "„button:hover” închis ar ascunde textul");
  assert.match(B, /html:has\(:is\(#tabloubot,#t212,#dash,#rangefilter\)\.on\.tbZi\) \.botStrip::after\{background:linear-gradient\(#F5F7FA,#F5F7FA\)\}/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
