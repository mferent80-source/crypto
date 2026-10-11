// Proba v100.152 (11.10.2026, el: „vreau să faci toate paginile după modelul tabloul botului” → ales: Zilnic + Unelte, direct):
// (1) verdictul din pastilele pozițiilor (T212 / Salt), după CUVÂNTUL pastilei · (2) verdictul alertelor din TOATĂ lista, pe 24 h (nu „necitit”)
// (3) o singură voce: fără verbe / praguri / afirmații inventate; Grid / Simulator / Scanner / Acasă fără antet nou · (4) ordinea doar din CSS,
// paginile flex FĂRĂ !important; specificitatea fiecărei reguli de ordine · (5) antetele NU intră în containerele rescrise · (6) versiunea.
// Revizia Opus v100.152 (C1, I1–I8) are aici câte o gardă. Inventarul „nimic pierdut” (51 de pagini × 1920/390) rulează în browser, nu aici.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const CSS = citeste("public", "app.css"), AS = citeste("public", "lib", "asezare-paznic.js"), HTML = citeste("public", "index.html");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.152 · toate paginile după modelul Tabloului · proba\n");
const doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
const ctx = { document: doc, setInterval() {}, setTimeout() {}, clearTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
const A = ctx.AsezarePaznic, J = (x) => JSON.parse(JSON.stringify(x));

await test("(1) pozițiile: cuvântul PASTILEI decide (IEȘI > ATENȚIE > AȘTEAPTĂ > ȚINE); AȘTEAPTĂ e verdict, nu „fără date” (revizia I4); fără poziții ⇒ fără antet", () => {
  assert.equal(A.nivelPastila("AȘTEAPTĂ"), "asteapta"); assert.equal(A.nivelPastila(" ieși "), "iesi"); assert.equal(A.nivelPastila("FĂRĂ DATE"), "alt"); assert.equal(A.nivelPastila(""), "alt");
  const r = (sim, nivel) => ({ sim, nivel, pill: nivel });
  const a = J(A.verdictPozitii([r("AVGO", "tine"), r("UHS", "iesi"), r("NVDA", "atentie")], "x"));
  assert.equal(a.verb, "IEȘI"); assert.equal(a.ton, "jos"); assert.equal(a.titlu, "la o poziție: UHS"); assert.deepEqual(a.voci.map((v) => v.ton), ["sus", "jos", "aur"]);
  assert.equal(J(A.verdictPozitii([r("A", "atentie"), r("B", "atentie"), r("C", "tine")], "x")).titlu, "la 2 poziții: A, B");
  const w = J(A.verdictPozitii([r("RHM", "asteapta"), r("NFLX", "tine")], "x")); assert.equal(w.verb, "AȘTEAPTĂ"); assert.equal(w.titlu, "la o poziție: RHM");
  const t = J(A.verdictPozitii([r("A", "tine"), r("B", "tine")], "x")); assert.equal(t.verb, "ȚINE"); assert.equal(t.titlu, "toate cele 2 poziții țin");
  assert.equal(J(A.verdictPozitii(Array.from({ length: 21 }, (_, i) => r("S" + i, "tine")), "x")).titlu, "toate cele 21 de poziții țin", "„de” de la 20 (garda v100.75)");
  assert.equal(J(A.verdictPozitii([r("A", "tine"), r("B", "alt")], "x")).titlu, "1 din 2 țin; restul fără verdict încă");
  assert.equal(J(A.verdictPozitii([r("A", "alt")], "x")).verb, "FĂRĂ DATE"); assert.equal(A.verdictPozitii([], "x"), null);
  assert.match(AS, /randuriPastile\("#saltPozBox tr\.t212Rand"/, "Salt: toate rândurile (și cele fără analiză), nu doar cele cu id");
  assert.match(AS, /randuriPastile\("#t212Continut tr\.t212Rand", function \(tr\) \{ return tx\("\.t212Sim b", tr\)/, "T212: simbolul din rând, nu din id (tickerele LSE)");
});
await test("(2) alertele: din TOATĂ lista (alSt.l), pe ultimele 24 h, după nivelul colectorului - o alertă critică NU poate ieși „nimic nou” verde (revizia C1)", () => {
  const T = Date.UTC(2026, 9, 11, 15, 0), H = 3600000, al = (nivel, oreInUrma, titlu) => ({ nivel, t: T - oreInUrma * H, titlu, cheie: "lich" });
  const drum = (x) => ({ et: "Deschide Tabloul botului" });
  const c = J(A.verdictAlerte([al("info", 1, "i"), al("critic", 2, "ATOM: lichidarea aproape"), al("critic", 0.5, "ATOM: semafor roșu"), al("critic", 30, "ieri")], T, drum));
  assert.equal(c.verb, "CRITICE: 2"); assert.equal(c.ton, "jos"); assert.equal(c.titlu, "cea mai recentă: ATOM: semafor roșu"); assert.equal(c.fac, "→ Deschide Tabloul botului");
  assert.ok(c.voci.every((v) => v.semn === false), "vocile sunt numărători, nu bife ✓ verzi");
  assert.equal(J(A.verdictAlerte([al("atentie", 3, "a")], T, drum)).verb, "DE ATENȚIE: 1");
  assert.equal(J(A.verdictAlerte([al("info", 3, "a")], T, drum)).verb, "DOAR INFORMĂRI"); assert.equal(J(A.verdictAlerte([al("critic", 30, "vechi")], T, drum)).verb, "NICIO ALERTĂ");
  assert.doesNotMatch(AS, /NIMIC NOU/, "„nimic nou” nu mai există (clasa „nou” dispare la deschiderea paginii)");
  assert.match(AS, /try \{ l = alSt\.l; \}/, "lista întreagă, nu rândurile filtrate de pe ecran");
});
await test("(3) o singură voce: fără verbe / praguri / afirmații inventate; vârsta datelor nu iese verde; paginile cu decizie proprie fără antet nou", () => {
  for (const v of ["MAJORITATEA", "PRUDENȚĂ", "DOAR ACASĂ", "PAROLA PUSĂ", "ÎN REGULĂ", "sesiunea aplicației e deschisă", "Radarul merge de pe serverul de acasă", "* 1.5"]) assert.ok(!AS.includes(v), "inventat: " + v);
  assert.equal(A.tonVarsta("12s"), "sus"); assert.equal(A.tonVarsta("5m"), "sus"); assert.equal(A.tonVarsta("20m"), "aur"); assert.equal(A.tonVarsta("14h"), "jos"); assert.equal(A.tonVarsta("—"), "mut");
  assert.match(AS, /antet\("pzV-sug", \$\("sugPagina"\), \{ verb: [^}]*ton: "mut"/, "Sugestii: „fapte, nu semnal” ⇒ fără verde / roșu");
  for (const id of ["pzV-grid", "pzV-gridset", "pzV-gsim", "pzV-scan", "pzV-dash", "pzV-acasa"]) assert.ok(!AS.includes('"' + id + '"'), "antet nou pe o pagină cu decizie proprie: " + id);
  for (const f of ["pagT212", "pagSalt", "pagAlerte", "pagMonteCarlo", "pagCarnet", "pagJurnal", "pagSugestii", "pagMarket", "pagAccount", "pagCloud", "pagSettings", "pagHealth"]) assert.ok(new RegExp("coloana, [^\\]]*\\b" + f + "\\b").test(AS), f + " nu e în tură");
});
await test("(4) ordinea: doar CSS; paginile coloană DOAR active și FĂRĂ !important; FIECARE regulă de ordine bate „>*{order:N}” al containerului ei (specificitatea); faptele nu coboară sub ce le privește", () => {
  const flex = [...CSS.matchAll(/(\.pzDemo #[a-z]+\.on)\{display:flex[^}]*\}/g)].map((m) => m[0]);
  assert.ok(flex.length >= 6); for (const r of flex) assert.doesNotMatch(r, /!important/, r);
  assert.doesNotMatch(CSS, /#(deriv|stocks|account)(\.on)?\{display:[^}]*!important/);
  assert.match(CSS, /\.marketModeStock \.cryptoContextOnly\{display:none!important\}/); assert.match(CSS, /\.marketModeCrypto \.stockOnly\{display:none!important\}/);
  // specificitatea: pentru fiecare container cu „<P>>*{order:N}”, orice regulă de ordine pe „…<C>>” trebuie să înceapă cu același prefix <P>
  const cont = [...CSS.matchAll(/^(\.pzDemo [^{>]+)>\*\{order:\d+/gm)].map((m) => m[1].trim());
  assert.ok(cont.length >= 10, "containere ordonate: " + cont.length);
  const FARA = CSS.replace(/\/\*[\s\S]*?\*\//g, "");   /* fără comentarii: textul lor nu e selector */
  const reguli = [...FARA.matchAll(/(?:^|\})([^{}]+)\{order:-?\d+[;}]/g)].flatMap((m) => m[1].split(",")).map((s) => s.trim());
  for (const P of cont) { const id = P.split(" ").pop(); const copil = new RegExp(id.replace(/[.#]/g, "\\$&") + ">[^\\s>]+$"); for (const s of reguli) if (copil.test(s) && !s.startsWith(P)) assert.fail("regulă de ordine mai slabă decât " + P + ">*: " + s); }
  const ord = (sel) => { const m = CSS.match(new RegExp(sel.replace(/[.#>()+:[\]]/g, "\\$&") + "\\{order:(-?\\d+)")); return m ? +m[1] : null; };
  assert.ok(ord(".pzDemo #scNou>#scExplic") < ord(".pzDemo #scNou>#scLista"), "Scanner: „lista e de urmărit, nu de pornit” înaintea listei (revizia I1)");
  assert.match(CSS, /\.pzDemo #grFisa>\*\{order:65\}/, "Grid: blocurile fără regulă (avertismentul TV, varianta îngustă) lângă setări (revizia I2)");
  assert.match(CSS, /\.pzDemo #jtRezumat>\.emptyState,\.pzDemo #jtRezumat>\.tbBloc\{order:5\}/, "Jurnal: încărcarea / eroarea sus (revizia I3)");
  assert.match(CSS, /@media \(max-width:550px\)\{\.pzVerb\{white-space:normal;overflow-wrap:anywhere\}\}/, "pe telefon verbul lung se rupe (revizia I8)");
  const ultim = CSS.trim().split("\n").pop(); assert.match(ultim, /^@media \(max-width:640px\)\{\.sugPandaTab thead/, "regula pandei rămâne ultima");
});
await test("(5) antetele stau ca FRATE, în afara containerelor rescrise cu innerHTML; fără date ⇒ ascunse", () => {
  const refs = [...AS.matchAll(/antet\("(pzV-[a-z0-9]+)", ([^,]+),/g)].map((m) => [m[1], m[2].trim()]);
  assert.ok(refs.length >= 12, "antete: " + refs.length);
  const INTERZIS = ["#acX", "sugPagina .", "cnPagina .", "gsPagina .", "grFisa .", "jtRezumat", "t212Sus .", "saltPagina .", "alCentru .", "mcsPagina .", "marketOverview"];
  for (const [id, ref] of refs) for (const z of INTERZIS) assert.ok(!ref.includes(z), id + " s-ar pune ÎN " + z + ": " + ref);
  assert.match(AS, /if \(!ref \|\| !ref\.parentNode \|\| !cfg \|\| !cfg\.verb\) \{ if \(el\) \{ el\.hidden = true;/);
  // Cloud / Settings / Health: fâșia de preț + filele se PLIAZĂ (buton, alegerea ținută minte), nu dispar; bara cu simbolul nu e atinsă
  assert.match(AS, /var FARA_MONEDA = \{ cloud: 1, settings: 1, health: 1 \};/); assert.match(AS, /pagHealth, pliazaFasia\]/, "pliazaFasia în tură");
  // revizia a doua I-D: pliatul îl face CSS-ul (:has pe pagina activă), nu tura de 1,5 s ⇒ fără salt la schimbarea paginii
  assert.match(CSS, /body:not\(\.pzFasiaDeschisa\):has\(main>#cloud\.on,main>#settings\.on,main>#health\.on\) main :is\(\.heroStrip,\.tabs\)\{display:none\}/);
  assert.match(CSS, /body:has\(main>#cloud\.on,main>#settings\.on,main>#health\.on\) \.pzFasiaBtn\{display:block\}/);
  assert.doesNotMatch(CSS, /pzFasia[^{]*\.toolbar/, "bara cu simbolul nu se pliază"); assert.doesNotMatch(AS, /pzFasiaPliata/, "JS-ul nu mai ascunde nimic");
  assert.match(AS, /localStorage\.setItem\("pzFasiaDeschisa"/);
  assert.doesNotMatch(AS, /innerHTML\s*=\s*[^;]*\+\s*(?!esc\()[a-zA-Z_.]+\.textContent/, "text din pagină în HTML fără esc()");
});
await test("(7) revizia a doua: Jurnalul pe formatul REAL („+0,00 USDT”), Sugestii doar din cartela „Pe ce aș porni un bot”, vârsta datelor redesenată de pagină, verbele lungi se rup", () => {
  assert.equal(A.valJurnal("+0,00 USDT"), 0); assert.equal(A.valJurnal("−5906,42 USDT"), -5906.42); assert.equal(A.valJurnal("+12,50 USDT"), 12.5); assert.equal(A.valJurnal("—"), null);
  assert.match(AS, /n = valJurnal\(v && v\.textContent\)/); assert.match(AS, /n === 0 \? "CRYPTO: PE ZERO"/);
  assert.match(AS, /\/Pe ce aș porni un bot\/\.test\(tx\("h4", c\)\)/, "Sugestii: cartela după titlu");
  assert.doesNotMatch(AS, /querySelector\("#sugPagina \.sugCartela \.sugLista li"\)/, "prima idee din ORICE cartelă");
  assert.match(AS, /typeof renderFreshness === "function"\) renderFreshness\(\)/, "vârsta datelor redesenată cu funcția paginii (textul îngheța pe 0s)");
  assert.match(CSS, /\.pzAntet \.pzVerb\{white-space:normal;overflow-wrap:anywhere;max-width:62%\}/);
  for (const v of ["\"VERIFICĂ\"", "\"NU MERG: \""]) assert.ok(!AS.includes(v), "verb al stratului: " + v);
});
await test("(6) versiunea: aceeași în BUILD_INFO, index, sw, package.json, versiune.js (≥ v100.152)", () => {
  const V = JSON.parse(citeste("BUILD_INFO.json")).version, m = V.match(/^v100\.(\d+)$/); assert.ok(m && +m[1] >= 152, V);
  assert.ok(HTML.includes(`content="${V}" name="app-version"`)); assert.ok(citeste("public", "sw.js").includes(`const CACHE="crypto-radar-${V.replace(".", "-")}"`));
  assert.equal(JSON.parse(citeste("package.json")).version, V.slice(1) + ".0"); assert.ok(citeste("functions", "_shared", "versiune.js").includes(`VERSIUNE = "${V}"`));
});

console.log(`\n${teste - picate}/${teste} verzi`);
if (picate) process.exit(1);
