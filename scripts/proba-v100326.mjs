// Proba v100.326 (11.11.2026, el: „hai să facem pe rând pagina cu pagina, hai să vedem pagina Trading 212 și să o facem în aceleași condiții ca și pagina
// botului, să o urcăm în meniu sub Tabloul botului”):
//   1. meniul: „Trading 212” imediat sub „Tabloul botului” (grupa Zilnic), niciun buton scos;
//   2. tema Tabloului și pe T212: generatorul (face-tema-tablou.mjs) are două rădăcini - regulile comune sub :is(#tabloubot,#t212), cele ale paginii
//      T212 sub #t212, cele ale Tabloului sub #tabloubot; aceeași scară de litere, aceeași paletă de zi;
//   3. un singur comutator de temă (aceeași alegere ținută minte): clasa tbZi pe ambele pagini, butonul „Temă închisă” și în antetul T212,
//      comutarea redesenează și graficele T212;
//   4. rama (meniul, bara de sus, fâșia cu cifre, fondul) și litera Tabloului și cât e deschisă T212.
//   node scripts/proba-v100326.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { genereaza, selectorSub, blocDin, faraBloc, RADACINI } from "./face-tema-tablou.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html"), APP = citeste("public", "app.js");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
console.log("\nV100.326 · Trading 212 în aceleași condiții ca Tabloul botului · proba\n");

// ───────────── 1. meniul ─────────────
await test("meniul: „Trading 212” imediat sub „Tabloul botului”, în grupa Zilnic; toate cele 59 de butoane rămân, ordinea celorlalte la fel", () => {
  const i = HTML.indexOf('<div class="sideGrup" id="sideZilnic">'), k = HTML.indexOf("</div>", HTML.indexOf('class="sideGrupCap"', i) + 30);
  const urm = HTML.slice(i + 10).search(/<div class="sideGrup[" ]/), g = HTML.slice(i, i + 10 + urm);   // nu „sideGrupCap”
  const nav = [...g.matchAll(/data-action-click="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(nav.slice(0, 3), ["navTo('dash')", "navTo('tabloubot',true)", "deschideT212()"]);
  assert.equal(nav.filter((x) => x === "deschideT212()").length, 1, "o singură dată");
  const a = HTML.slice(HTML.indexOf('<aside class="sideNav">'), HTML.indexOf("</aside>", HTML.indexOf('<aside class="sideNav">')));
  assert.equal((a.match(/class="sideBtn[" ]/g) || []).length, 59);
  assert.ok(k > i);
});

// ───────────── 2. generatorul cu două rădăcini ─────────────
await test("generatorul: rădăcinile sunt Tabloul și T212; comunele sub :is(#tabloubot,#t212), ale fiecărei pagini sub ea, celelalte pagini se sar", () => {
  assert.deepEqual(RADACINI, ["tabloubot", "t212"]);
  const S = ["dash"];
  assert.equal(selectorSub(".tbBloc", "#tabloubot.tbZi", S), ":is(#tabloubot,#t212).tbZi .tbBloc");
  assert.equal(selectorSub("#tabloubot .gbTip", "#tabloubot.tbZi", S), "#tabloubot.tbZi .gbTip");
  assert.equal(selectorSub("#t212 .t212Pill", "#tabloubot.tbZi", S), "#t212.tbZi .t212Pill");
  assert.equal(selectorSub("#t212Continut tr.t212Rand", "#tabloubot.tbZi", S), ":is(#tabloubot,#t212).tbZi #t212Continut tr.t212Rand", "#t212Continut nu e rădăcina");
  assert.equal(selectorSub("html.pzDemo .pzCel", "#tabloubot", S), "html.pzDemo :is(#tabloubot,#t212) .pzCel");
  assert.equal(selectorSub("#dash .acVerd, .x", "#tabloubot.tbZi", S), ":is(#tabloubot,#t212).tbZi .x");
  const g = genereaza(":root{--pzF1:#141C24} .a{color:#E6EDF3;font-size:11px} #t212 .b{background:#141C24} #tabloubot .c{color:#E6EDF3} #dash .d{color:#E6EDF3}", '<section class="panel" id="dash"></section><section class="panel" id="tabloubot"></section><section class="panel" id="t212"></section>');
  assert.ok(g.includes(":is(#tabloubot,#t212).tbZi{--pzF1:#FFFFFF}"));
  assert.ok(g.includes(":is(#tabloubot,#t212).tbZi .a{color:#0E1A2B}") && g.includes(":is(#tabloubot,#t212) .a{font-size:12px}"));
  assert.ok(g.includes("#t212.tbZi .b{background:#FFFFFF}") && g.includes("#tabloubot.tbZi .c{color:#0E1A2B}"));
  assert.ok(!g.includes(".d{"), "Piața azi rămâne afară");
});
await test("stratul din app.css e cel produs acum și cuprinde și pagina T212 (nicio altă pagină)", () => {
  const NL = CSS.includes("\r\n") ? "\r\n" : "\n", bloc = blocDin(CSS);
  assert.equal(bloc, genereaza(faraBloc(CSS), HTML).split("\n").join(NL));
  assert.ok(/#t212\.tbZi [^{]*\{/.test(bloc), "regulile paginii T212, pe tema de zi");
  assert.ok(!/#(dash|sugestii|comportament)\b/.test(bloc));
});

// ───────────── 3. un singur comutator ─────────────
await test("tema: clasa tbZi pe AMBELE pagini, butoanele din amândouă antetele, comutarea redesenează și graficele T212", () => {
  const a = functie(APP, "tbTemaAplica");
  assert.match(a, /\["tabloubot","t212"\]\.forEach\(function\(id\)\{var p=document\.getElementById\(id\);if\(p\)p\.classList\.toggle\("tbZi",zi\)\}\)/);
  assert.match(a, /\["tbTemaBtn","t212TemaBtn"\]\.forEach/);
  assert.match(functie(APP, "tbTemaComuta"), /t212GraficeDeseneaza\(true\)/);
  assert.ok(HTML.includes('<button type="button" class="t212BtnLinie" id="t212TemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă închisă</button><button type="button" class="t212BtnLinie" data-action-click="t212Porneste(true)">Reîncarcă</button>'));
});

// ───────────── 4. rama și litera ─────────────
await test("rama și litera Tabloului și cât e deschisă T212 (meniul, bara de sus, fâșia, fondul); pe celelalte pagini nimic", () => {
  const i = CSS.indexOf("/* v100.325 · meniul ca pagina botului"), k = CSS.indexOf("/* v100.325: sfârșitul meniului ca pagina botului */"), B = CSS.slice(i, k);
  assert.ok(i > 0 && k > i);
  assert.doesNotMatch(B, /html:has\(#tabloubot\.on/, "fiecare regulă e pe ambele pagini");
  assert.ok(B.includes('html:has(:is(#tabloubot,#t212).on) .sideNav,html:has(:is(#tabloubot,#t212).on) .mobileBottom,html:has(:is(#tabloubot,#t212).on) :is(.sideBtn,.mobileNavBtn){font-family:"IBM Plex Sans"'));
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212).on.tbZi) .sideNav{background:#FFFFFF;"));
  assert.ok(B.includes("html:has(:is(#tabloubot,#t212).on.tbZi) body{background:#F2F4F7!important}"));
  assert.ok(CSS.includes('html.pzDemo #t212{--pzMono:"IBM Plex Sans",system-ui,"Segoe UI",sans-serif;font-family:"IBM Plex Sans",system-ui,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums}'));
  assert.ok(CSS.includes("html.pzDemo #t212 *{font-family:inherit!important}"));
});

// ───────────── 5. fără goluri: lista pozițiilor stă lângă fișă (lipicioasă), „Ce e pe grafic” în dreapta graficului ─────────────
// măsurat pe live (v100.325, 1920 × 950): sub lista pozițiilor ~1.470 px goi (fișa aleasă e lungă), „Ce e pe grafic” sub grafic cu ~700 px albi alături
const ECR = citeste("public", "lib", "t212-ecran.js");
await test("lista și fișele în DOUĂ tabele vecine (rândurile citite la fel: #t212Continut tr.t212Rand / tr.t212Det); pe telefon ordinea rămâne „rând, fișa lui” (order 2i / 2i+1)", () => {
  assert.ok(ECR.includes("var cap212 = '<thead><tr><th>Acțiune</th>") && ECR.includes('<table class="t212Tab t212PozLista">\' + cap212'), "lista cu capul tabelului (revizia: numele t212PozLista)");
  assert.ok(ECR.includes("</tbody></table><table class=\"t212Tab t212Fise\"><tbody>"), "fișele în al doilea tabel");
  assert.match(ECR, /var k = h\.indexOf\('<tr class="t212Det"'\); return k < 0 \? \[h, ""\] : \[h\.slice\(0, k\), h\.slice\(k\)\];/);   // doar pe lat (revizia)
  assert.match(ECR, /r\.style\.order = String\(2 \* i\)/); assert.match(ECR, /d\.style\.order = String\(2 \* i \+ 1\)/);
  assert.equal(ECR.split("poz.map(t212RandPozitie)").length - 1, 2, "revizia: o dată pe îngust (tabelul unic), o dată pe lat (cele două)");
});
const CSS2 = citeste("public", "app.css");
await test("stilul: pe îngust lista + fișe într-o coloană (flex, order); de la 900 px lista lipicioasă în stânga (sub bara de sus, cu derulare proprie dacă e lungă), fișa în dreapta", () => {
  const i = CSS2.indexOf("/* v100.326 · Trading 212 în aceleași condiții"), k = CSS2.indexOf("/* v100.326: sfârșitul paginii Trading 212 */"), B = CSS2.slice(i, k);
  assert.ok(i > 0 && k > i);
  assert.ok(B.includes("#t212Continut .t212TabWrap:has(>.t212PozLista){display:flex;flex-direction:column}"));
  assert.ok(B.includes("@container (min-width:900px){\n#t212Continut .t212TabWrap:has(>.t212PozLista){display:grid;grid-template-columns:330px minmax(0,1fr);grid-template-rows:none;column-gap:12px;align-items:start}"));
  assert.ok(B.includes("#t212Continut .t212PozLista{display:block;grid-column:1;grid-row:1;position:sticky;top:calc(var(--topbar) + 8px);max-height:calc(100vh - var(--topbar) - 16px);overflow-y:auto;overscroll-behavior:contain;padding:3px}"), "padding 3 px: overflow nu taie conturul de focus al rândurilor");
  assert.ok(B.includes("#t212Continut .t212Fise{display:block;grid-column:2;grid-row:1;min-width:0}"));
  assert.ok(B.includes("#t212Continut .t212Fise tr.t212Det{grid-column:auto;grid-row:auto}"));
});
await test("„Ce e pe grafic” în dreapta graficului când fișa e lată (≥ 980 px): graficul se desenează pe lățimea lui de stânga; altfel ca înainte", () => {
  const f = functie(ECR, "t212GraficeDeseneaza");
  assert.match(f, /var lat = el\.clientWidth >= 980;/); assert.match(f, /el\.classList\.toggle\("t212GrafLat", lat\)/);
  assert.match(f, /t212GraficHtml\(p, Math\.max\(300, lat \? W - 356 : W\)\)/);
  const i = CSS2.indexOf("/* v100.326 · Trading 212 în aceleași condiții"), B = CSS2.slice(i, CSS2.indexOf("/* v100.326: sfârșitul paginii Trading 212 */"));
  assert.ok(B.includes("#t212 .t212Graf.t212GrafLat{display:grid;grid-template-columns:minmax(0,1fr) 340px;column-gap:16px;align-items:start}"));
  assert.ok(B.includes("#t212 .t212Graf.t212GrafLat>.gbZona{grid-column:1;grid-row:3 / span 3}"));
  assert.ok(B.includes("#t212 .t212Graf.t212GrafLat>.gbValCap{grid-column:2;grid-row:3;margin-top:0}") && B.includes("#t212 .t212Graf.t212GrafLat>.gbValori{grid-column:2;grid-row:4;width:auto}") && B.includes("#t212 .t212Graf.t212GrafLat>.gbLeg{grid-column:2;grid-row:5;flex-direction:column;align-items:flex-start;gap:4px}"));
  assert.ok(B.includes("#t212 .t212Graf.t212GrafLat>*{grid-column:1 / -1;min-width:0}"), "restul pe toată lățimea, sub");
});

await test("culorile scrise de mână ale Tabloului și pe T212 (pagina copiei la 1440: titlul, simbolurile, prețurile alb pe alb, contrast 1,2): culoarea pe rădăcină, butoanele, câmpurile; ATENȚIE cu text închis pe galben", () => {
  const i = CSS2.indexOf("/* v100.326 · Trading 212 în aceleași condiții"), B = citeste("public", "app.css").slice(i, citeste("public", "app.css").indexOf("/* v100.326: sfârșitul paginii Trading 212 */"));
  for (const r of ["html.pzDemo #t212{color:var(--pzT0)}", "html.pzDemo #t212 .actionGhost,html.pzDemo #t212 .t212BtnLinie{color:var(--pzT0);background:var(--pzF1);border:1px solid var(--pzLi2);border-radius:5px}",
    "html.pzDemo #t212 input,html.pzDemo #t212 select,html.pzDemo #t212 textarea{color:var(--pzT0);background:var(--pzF1);border:1px solid var(--pzLi2);border-radius:5px}", "#t212.tbZi .t212Pill-atentie{color:#0E1A2B}",
    "#t212.tbZi .t212BtnPlin{background:var(--accent);border-color:var(--accent)}", ".t212CapCard .t212CapBtn{display:flex;gap:6px;margin-left:auto;flex:0 0 auto}", ".t212CapCard .t212CapBtn .t212BtnLinie{margin-left:0}",
    "#t212Continut .t212PozLista{scrollbar-width:thin;scrollbar-color:var(--pzLi2) transparent}"])
    assert.ok(B.includes(r), "lipsește: " + r.slice(0, 80));
  // aceleași reguli există pe Tablou (de acolo vin)
  assert.ok(CSS2.includes("html.pzDemo #tabloubot{color:var(--pzT0)}") && CSS2.includes("html.pzDemo #tabloubot .actionGhost,html.pzDemo #tabloubot .t212BtnLinie{color:var(--pzT0)"));
});

// ───────────── 6. reparațiile reviziei (Opus, doar citire) ─────────────
const CSS3 = () => { const s = citeste("public", "app.css"), i = s.indexOf("/* v100.326 · Trading 212 în aceleași condiții"); return s.slice(i, s.indexOf("/* v100.326: sfârșitul paginii Trading 212 */")); };
const ECR2 = () => citeste("public", "lib", "t212-ecran.js");
await test("revizia 🔴1: butonul plin la trecerea mouse-ului / focus păstrează fondul de accent (pe zi „button:hover” alb ștergea textul; pe noapte fondul închis)", () => {
  const B = CSS3();
  assert.ok(B.includes("#t212.tbZi .t212BtnPlin:is(:hover,:focus-visible){background:var(--accent);border-color:var(--accent);color:#FFFFFF}"));
  assert.ok(B.includes("#t212 .t212BtnPlin:is(:hover,:focus-visible){background:var(--accent);border-color:var(--accent)}"));
});
await test("revizia 🔴2: chenarele scoase demult (v85.3) nu reapar pe zi - cartela paginii și „Planul tău” din fișă (stratul generat nu copia anularea fără culoare)", () => {
  const B = CSS3();
  assert.ok(B.includes("#t212.tbZi .t212Card{background:transparent;border:0}"));
  assert.ok(B.includes("#t212.tbZi .t212Preturi{background:transparent;border:0}"), "„.t212Side .t212Preturi” (portofoliul) își păstrează cutia: regula generată e mai tare");
});
await test("revizia 🟡3: butonul apăsat (intervalul, indicatorii, filele) se vede și pe zi - ca pe Tablou", () => {
  assert.ok(CSS3().includes('html.pzDemo #t212 .tbIntBtn[aria-pressed="true"]{background:var(--pzT0);color:var(--pzF1);border-color:var(--pzT0)}'));
});
await test("revizia 🟡4: tabelul listei are nume propriu (t212PozLista) - „.t212Lista” e lista „Urmăresc și” (padding 8 px 12 px)", () => {
  assert.ok(ECR2().includes('<table class="t212Tab t212PozLista">')); assert.doesNotMatch(ECR2(), /t212Tab t212Lista/);
  assert.doesNotMatch(CSS3(), /\.t212Lista\b/);
});
await test("revizia 🟡5: pe îngust UN singur tabel, fișa imediat după rândul ei (Tab-ul și cititorul de ecran merg ca ochiul); cele două tabele doar pe lat", () => {
  const E = ECR2();
  assert.match(E, /if \(t212Ingust\(\)\) box\.innerHTML = '<div class="t212TabWrap" style="--n:' \+ poz\.length \+ '"><table class="t212Tab">' \+ cap212 \+ '<tbody>' \+ poz\.map\(t212RandPozitie\)\.join\(""\)/);
  assert.ok(CSS3().includes("#t212Continut .t212TabWrap:has(>.t212PozLista){display:flex;flex-direction:column}"), "două tabele rămase pe îngust după o micșorare: tot rând-fișă");
  assert.ok(CSS3().includes("#t212Continut .t212TabWrap:has(>.t212PozLista){display:grid;grid-template-columns:330px minmax(0,1fr);grid-template-rows:none;column-gap:12px;align-items:start}"), "așezarea pe lat doar pentru cele două tabele (tabelul unic rămâne pe regulile v100.291)");
});
await test("revizia 🟡6: lista lipicioasă își păstrează derularea la recitirea de 30 s", () => {
  const E = ECR2();
  assert.match(E, /var lst0 = box\.querySelector \? box\.querySelector\("\.t212PozLista"\) : null, stL = lst0 \? lst0\.scrollTop : 0;/);
  assert.match(E, /if \(stL\) \{ var lst1 = box\.querySelector\("\.t212PozLista"\); if \(lst1\) lst1\.scrollTop = stL; \}/);
});
await test("revizia 🟡7: pe noapte câmpurile completate cu prețurile calculate se disting iar (chenarul de informație)", () => {
  assert.ok(CSS3().includes("html.pzDemo #t212 .t212Plan input.calc{border-color:var(--pzInfo)}"));
});
await test("revizia 🟡8: alegi o poziție din lista lipicioasă când ești jos în fișă ⇒ pagina urcă la începutul fișei noi (sub bara de sus)", () => {
  const f = functie(ECR2(), "t212Alege");
  assert.match(f, /if \(d && !t212Ingust\(\) && d\.getBoundingClientRect && typeof window !== "undefined"\) \{ var bara = \(document\.querySelector\("\.topStatus"\) \|\| \{\}\)\.offsetHeight \|\| 0, sus = d\.getBoundingClientRect\(\)\.top; if \(sus < bara\) window\.scrollTo\(0, sus \+ window\.scrollY - bara - 8\); \}/);
});
await test("revizia 🔵10–12: graficul T212 se redesenează la redimensionare (coloana „Ce e pe grafic” urmează lățimea); comutatorul nu desenează Tabloul ascuns; generatorul pune .tbZi pe AMBELE rădăcini", () => {
  assert.match(ECR2(), /var t212RzT = null;\nif \(typeof window !== "undefined" && window\.addEventListener\) window\.addEventListener\("resize", function \(\) \{ clearTimeout\(t212RzT\); t212RzT = setTimeout\(function \(\) \{ try \{ if \(t212LaVedere\(\)\) t212GraficeDeseneaza\(true\); \} catch \(e\) \{\} \}, 200\); \}\);/);
  assert.match(functie(APP, "tbTemaComuta"), /try\{if\(tbPanouVizibil\(\)\)renderTabloGrafic\(\)\}catch\(e\)\{\}/);
  assert.equal(selectorSub("html:has(:is(#tabloubot,#t212).on) .x", "#tabloubot.tbZi", ["dash"]), "html:has(:is(#tabloubot,#t212).tbZi.on) .x");
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
