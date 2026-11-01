// Proba v100.288 (01.11, el, după v100.287: „ok, acum arată bine, fă toate paginile așa”): așezarea paginii Comportament pe TOATE paginile.
// Măsurat în Chrome pe 8788 (scratchpad asezare-toate.mjs, 54 de pagini × 7 lățimi, 412–2560): nimic peste lățime, toate umplu ecranul,
// dar în 17 pagini un card rămânea SINGUR pe rând (5 carduri pe 2 coloane, 13 pe 3 / 4, 31 pe 6 - numărul de coloane se schimbă cu lățimea,
// numărul de carduri cu datele), iar în câteva grile cardurile scurte se întindeau în gol cât vecinul.
// (1) public/lib/asezare-randuri.js: un card singur pe rândul lui se întinde pe tot rândul (o clasă, după poziția VĂZUTĂ - merge și cu
// `order`); (2) cardurile cât conținutul lor (`align-items:start`) în grilele de carduri cu înălțimi diferite.
// Revizia Opus 1 (01.11) pe prima variantă: Sugestii pierdea actualizarea pe loc (v100.243–244) din cauza clasei; un select și o pastilă se
// întindeau ca un card; marcajul se pierdea la fiecare redesenare și revenea după 0,6–2 s; o trecere întreagă la 2 s, pornită de prețurile vii.
// Revizia Opus 2: marcajul rămânea când grila scădea sub 3 copii; scrierile identice (Tablou: clasa panoului la 1,5 s) porneau observatorul;
// un `__arCls` vechi ascundea o schimbare; rândurile de listă cu o linie doar sus („Ce spune piața acum”) treceau drept carduri; semnul nu
// vedea ordinea / vizibilitatea venite din afară (clasa din body). Probele de mai jos le păzesc.
//   node scripts/proba-v100288.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.288 · AȘEZAREA TUTUROR PAGINILOR · proba\n");

const LIB = citeste("public", "lib", "asezare-randuri.js");
const GLOBALE = { console, Math, Number, String, Array, Object, JSON, isFinite, parseFloat, Set };
const cutie = { ...GLOBALE };
vm.createContext(cutie);
let libOk = true; try { vm.runInContext(LIB, cutie, { filename: "asezare-randuri.js" }); } catch (e) { libOk = false; console.log("  (asezare-randuri.js nu se încarcă: " + e.message + ")"); }
const A = () => { assert.ok(libOk && cutie.ArRanduri && typeof cutie.ArRanduri.alege === "function", "lipsește ArRanduri.alege"); return cutie.ArRanduri; };
// listele din cutia vm au alt Array ⇒ comparate ca liste obișnuite
const lista = (x) => Array.from(x || []);
// un copil al grilei: rândul (sus, înălțimea), lățimea, opțional dacă e o cutie văzută
const c = (top, h, w, card) => (card === undefined ? { top, bottom: top + h, width: w, height: h } : { top, bottom: top + h, width: w, height: h, card });
const grila = (n, col, w, h = 200) => Array.from({ length: n }, (_, i) => c(Math.floor(i / col) * (h + 10), h, w));
const MARGINI = (o = {}) => Object.assign({}, ...["Top", "Right", "Bottom", "Left"].map((p) => ({ ["border" + p + "Width"]: "0px", ["border" + p + "Color"]: "rgba(0, 0, 0, 0)" })), o);
const STIL_CARD = { display: "block", visibility: "visible", position: "static", backgroundColor: "rgb(17, 24, 39)", backgroundImage: "none", ...MARGINI() };
const STIL_GRILA = (col = 2) => ({ display: "grid", gridTemplateColumns: Array(col).fill("350px").join(" "), flexWrap: "nowrap", flexDirection: "row" });

// o pagină de probă: elemente cu clase, copii, dreptunghiuri (fix sau după starea lor), ordinea din document și căutarea după "*" / ".clasă"
function pagina() {
  function el(tag, o = {}, copii = []) {
    const e = { nodeType: 1, tagName: tag, cls: o.cls || "", stil: o.stil || STIL_CARD, rectF: o.rect || null, children: [], parentElement: null, ord: 0, atingeri: 0 };
    e.classList = {
      contains: (x) => e.cls.split(/\s+/).includes(x),
      add: (x) => { if (!e.classList.contains(x)) { e.cls = (e.cls + " " + x).trim(); e.atingeri++; } },
      remove: (x) => { if (e.classList.contains(x)) { e.cls = e.cls.split(/\s+/).filter((y) => y !== x).join(" "); e.atingeri++; } },
    };
    e.getAttribute = (k) => (k === "class" ? e.cls : null);
    e.getBoundingClientRect = () => { const r = typeof e.rectF === "function" ? e.rectF(e) : e.rectF; return r ? { left: 0, ...r, bottom: r.top + r.height } : { top: 0, bottom: 0, left: 0, width: 0, height: 0 }; };
    e.querySelectorAll = (sel) => { const out = []; (function w(p) { for (const ch of p.children) { if (sel === "*" || (sel[0] === "." && ch.classList.contains(sel.slice(1)))) out.push(ch); w(ch); } })(e); return out; };
    e.contains = (x) => { for (let y = x; y; y = y.parentElement) if (y === e) return true; return false; };
    e.compareDocumentPosition = (b) => (b.ord > e.ord ? 4 : 2);
    for (const ch of copii) { ch.parentElement = e; e.children.push(ch); }
    return e;
  }
  // ordinea din document (părintele înaintea copiilor)
  function numeroteaza(rad) { let n = 0; (function w(e) { e.ord = n++; for (const ch of e.children) w(ch); })(rad); return rad; }
  return { el, numeroteaza };
}
const ctxPagina = (extra = {}) => { const ctx = { ...GLOBALE, getComputedStyle: (e) => e.stil, ...extra }; vm.createContext(ctx); vm.runInContext(LIB, ctx); return ctx; };

await test("un card singur pe rândul lui (5 pe 2 coloane, 13 pe 3, 7 pe 3, 31 pe 6, și în mijlocul grilei, înaintea unui rând întreg) ⇒ el se întinde; rândurile pline, un singur rând ⇒ nimic", () => {
  const a = A();
  assert.deepEqual(lista(a.alege(grila(5, 2, 350), 716)), [4]);
  assert.deepEqual(lista(a.alege(grila(13, 3, 330), 1015)), [12]);
  assert.deepEqual(lista(a.alege(grila(7, 3, 330), 1015)), [6]);
  assert.deepEqual(lista(a.alege(grila(31, 6, 250), 1580)), [30]);
  // al treilea card stă singur pentru că după el vine un titlu pe tot rândul (titlul nu e card și oricum e lat)
  assert.deepEqual(lista(a.alege([c(0, 200, 350), c(0, 200, 350), c(210, 200, 350), c(420, 40, 716, false), c(470, 200, 350), c(470, 200, 350)], 716)), [2]);
  assert.deepEqual(lista(a.alege(grila(4, 2, 350), 716)), []);
  assert.deepEqual(lista(a.alege(grila(3, 3, 230), 716)), []);
  assert.deepEqual(lista(a.alege([], 716)), []);
  assert.deepEqual(lista(a.alege(grila(5, 2, 350), 0)), []);
});
await test("nu se întind: telefonul (o coloană), ce e deja lat, ce nu e o cutie văzută, plăcuțele mici; câmpurile și pastilele (sub 60 px: selectul din filtrele Scannerului 283×36, pastila Paznicului 331×24)", () => {
  const a = A();
  assert.deepEqual(lista(a.alege(grila(5, 1, 380), 388)), []);
  assert.deepEqual(lista(a.alege([c(0, 200, 300), c(0, 200, 300), c(210, 200, 450)], 716)), []);
  assert.deepEqual(lista(a.alege([c(0, 200, 350), c(0, 200, 350), c(210, 200, 350, false)], 716)), []);
  assert.deepEqual(lista(a.alege([c(0, 80, 200), c(0, 80, 200), c(90, 80, 200)], 716)), []);
  assert.deepEqual(lista(a.alege([c(0, 80, 200), c(0, 80, 200), c(90, 130, 200)], 716)), [2]);   // îngust, dar înalt ⇒ card
  assert.deepEqual(lista(a.alege([c(0, 36, 283), c(0, 36, 283), c(0, 36, 283), c(0, 36, 283), c(46, 36, 283)], 1180)), []);
  assert.deepEqual(lista(a.alege([c(0, 24, 331), c(0, 24, 331), c(34, 24, 331)], 1700)), []);
});
await test("rândurile după poziția VĂZUTĂ: copiii centrați pe verticală stau pe același rând; contează ordinea din `order`; rândurile lipite rămân rânduri; un card înalt pe două rânduri nu lasă un fals singur; copiii ascunși nu contează", () => {
  const a = A();
  assert.deepEqual(lista(a.alege([c(0, 200, 350), c(40, 120, 350), c(210, 200, 350)], 716)), [2]);
  // în pagină: [jos, sus, sus, mijloc, mijloc] - pe ecran rândul de jos e primul copil din pagină
  assert.deepEqual(lista(a.alege([c(420, 200, 350), c(0, 200, 350), c(0, 200, 350), c(210, 200, 350), c(210, 200, 350)], 716)), [0]);
  assert.deepEqual(lista(a.alege([c(0, 200, 350), c(0, 200, 350), c(200, 200, 350), c(200, 200, 350), c(400, 200, 350)], 716)), [4]);
  assert.deepEqual(lista(a.alege([c(0, 410, 350), c(0, 200, 350), c(210, 200, 350)], 716)), []);
  assert.deepEqual(lista(a.alege([null, c(0, 200, 350), c(0, 0, 0), c(0, 200, 350), c(210, 200, 350)], 716)), [4]);
});
await test("cardul se verifică pe stilul lui: o cutie care se vede (fundal sau chenar pe laturi); nu un rând de listă cu o linie doar sus (Tablou: „Ce spune piața acum”), nu câmpurile, nu butoanele, nu ce e ascuns sau așezat deasupra", () => {
  const a = A();
  assert.equal(typeof a.eCard, "function", "lipsește ArRanduri.eCard");
  const st = (o = {}) => ({ ...STIL_CARD, ...o });
  const fara = { backgroundColor: "rgba(0, 0, 0, 0)" }, linie = { borderTopWidth: "1px", borderTopColor: "rgb(38, 50, 70)" };
  assert.equal(a.eCard("DIV", st()), true);
  assert.equal(a.eCard("SECTION", st({ ...fara, ...["Top", "Right", "Bottom", "Left"].reduce((o, p) => ({ ...o, ["border" + p + "Width"]: "1px", ["border" + p + "Color"]: "rgb(38, 50, 70)" }), {}) })), true);
  assert.equal(a.eCard("DIV", st({ ...fara, ...linie })), false, "o linie doar sus = un rând de listă (.tbCitR)");
  assert.equal(a.eCard("DIV", st(fara)), false);
  for (const tag of ["SELECT", "INPUT", "TEXTAREA", "BUTTON"]) assert.equal(a.eCard(tag, st()), false, tag);
  assert.equal(a.eCard("DIV", st({ visibility: "hidden" })), false);
  assert.equal(a.eCard("DIV", st({ position: "absolute" })), false);
  assert.equal(a.eCard("DIV", st({ position: "fixed" })), false);
});
await test("o grilă: marcajul de acum se scoate înainte de socoteală (fără du-te-vino), se pune pe cardul singur, nu pe un select; grila neschimbată nu se mai atinge; marcajul șters de altcineva se pune la loc; rândul umplut, grila sub 3 copii, grila devenită bloc ⇒ marcajul pleacă", () => {
  const ctx = ctxPagina(), { el } = pagina();
  assert.equal(typeof (ctx.ArRanduri && ctx.ArRanduri.aseazaGrila), "function", "lipsește ArRanduri.aseazaGrila");
  // natural = dreptunghiul fără marcaj; întins pe rând = cât grila
  const card = (top, left = 0, tag = "DIV") => el(tag, { cls: "card", rect: (e) => (e.classList.contains("randPlin") ? { top, left: 0, width: 716, height: 200 } : { top, left, width: 350, height: 200 }) });
  const copii = [card(0), card(0, 366), card(210), card(210, 366), card(420)];
  const g = el("DIV", { cls: "settingsGrid", stil: STIL_GRILA(2), rect: { top: 0, width: 716, height: 620 } }, copii);
  copii[4].classList.add("randPlin"); copii[4].atingeri = 0;
  ctx.ArRanduri.aseazaGrila(g);
  assert.equal(copii[4].classList.contains("randPlin"), true, "rămâne întins (socoteala pe așezarea firească, nu pe cea întinsă)");
  const dupaPrima = copii.map((x) => x.atingeri).join(",");
  ctx.ArRanduri.aseazaGrila(g);
  assert.equal(copii.map((x) => x.atingeri).join(","), dupaPrima, "grila neschimbată: nicio clasă atinsă");
  copii[4].cls = "card";   // altcineva rescrie aceeași clasă (pune(id, text, clasa) din app.js) și marcajul se pierde
  ctx.ArRanduri.aseazaGrila(g);
  assert.equal(copii[4].classList.contains("randPlin"), true, "marcajul pierdut se pune la loc");
  // vine al șaselea card: rândul de jos e plin ⇒ marcajul pleacă (socoteala se face fără el)
  const al6 = card(420, 366); al6.parentElement = g; g.children.push(al6);
  ctx.ArRanduri.aseazaGrila(g);
  assert.equal(copii[4].classList.contains("randPlin"), false, "rândul s-a umplut ⇒ nu mai e întins");
  // Sugestii: o secțiune de 3 cartele [A B][C*] pierde pe B ⇒ 2 copii; C nu mai are de ce să fie întinsă (A ar sta singur deasupra)
  const t3 = [card(0), card(0, 366), card(210)], g3 = el("DIV", { cls: "sugGrila", stil: STIL_GRILA(2), rect: { top: 0, width: 716, height: 410 } }, t3);
  ctx.ArRanduri.aseazaGrila(g3);
  assert.equal(t3[2].classList.contains("randPlin"), true);
  g3.children.splice(1, 1);
  ctx.ArRanduri.aseazaGrila(g3);
  assert.equal(t3[2].classList.contains("randPlin"), false, "sub 3 copii ⇒ marcajul jos");
  // grila devenită bloc (alt rând de media query): marcajul jos
  const t4 = [card(0), card(0, 366), card(210)], g4 = el("DIV", { cls: "x", stil: STIL_GRILA(2), rect: { top: 0, width: 716, height: 410 } }, t4);
  ctx.ArRanduri.aseazaGrila(g4); assert.equal(t4[2].classList.contains("randPlin"), true);
  g4.stil = { display: "block" }; ctx.ArRanduri.aseazaGrila(g4);
  assert.equal(t4[2].classList.contains("randPlin"), false, "nu mai e grilă ⇒ marcajul jos");
  // ultimul e un select (cât un card, dar e un câmp): nimic
  const cu = [card(0), card(0, 366), card(210, 0, "SELECT")], g2 = el("DIV", { cls: "y", stil: STIL_GRILA(2), rect: { top: 0, width: 716, height: 410 } }, cu);
  ctx.ArRanduri.aseazaGrila(g2);
  assert.equal(cu[2].classList.contains("randPlin"), false);
  // ordinea schimbată din afara clasei (Setări: data-pz-ord) ⇒ alt card ajunge singur jos: semnul o vede (pozițiile), marcajul se mută
  let ord = 0; const poz = (i) => [[0, 0], [0, 366], [210, 0]][(i + ord) % 3];
  const t5 = [0, 1, 2].map((i) => el("DIV", { cls: "card", rect: (e) => { const [top, left] = poz(i); return e.classList.contains("randPlin") ? { top, left: 0, width: 716, height: 200 } : { top, left, width: 350, height: 200 }; } }));
  const g5 = el("DIV", { cls: "pzSet", stil: STIL_GRILA(2), rect: { top: 0, width: 716, height: 410 } }, t5);
  ctx.ArRanduri.aseazaGrila(g5); assert.equal(t5[2].classList.contains("randPlin"), true);
  ord = 1; ctx.ArRanduri.aseazaGrila(g5);
  assert.equal(t5[1].classList.contains("randPlin"), true, "ordinea nouă: al doilea e acum singur jos");
  assert.equal(t5[2].classList.contains("randPlin"), false);
  // un rând flexibil (fără semn): se socotește la fiecare cerere, cu același rezultat
  const t6 = [card(0), card(0, 366), card(210)], g6 = el("DIV", { cls: "f", stil: { display: "flex", flexWrap: "wrap", flexDirection: "row" }, rect: { top: 0, width: 716, height: 410 } }, t6);
  ctx.ArRanduri.aseazaGrila(g6); ctx.ArRanduri.aseazaGrila(g6);
  assert.equal(t6[2].classList.contains("randPlin"), true);
});
await test("observatorul: o schimbare de elemente în pagina deschisă reface grila atinsă și grilele care sosesc; textul (prețurile vii) nu; altă pagină nu; scrierile identice nu (Tablou: clasa panoului la 1,5 s); clasa mea nu; clasa rescrisă de altcineva da, și cu un `__arCls` vechi; pagina arătată / pliul deschis ⇒ grilele din ele, și cele cu un marcaj rămas pe 2 copii", () => {
  const a = A();
  assert.equal(typeof a.tinte, "function", "lipsește ArRanduri.tinte");
  const { el } = pagina();
  const carduri = [el("DIV"), el("DIV"), el("DIV")], gr = el("DIV", { cls: "settingsGrid" }, carduri), pan = el("SECTION", { cls: "panel on" }, [gr]);
  const ascuns = el("DIV", {}, [el("DIV"), el("DIV"), el("DIV")]); el("SECTION", { cls: "panel" }, [el("DIV", {}, [ascuns])]);
  const text = { nodeType: 3 }, R = (o) => Object.assign({ type: "childList", addedNodes: [], removedNodes: [], attributeName: null, oldValue: null }, o);
  const cls = (target, oldValue) => R({ type: "attributes", attributeName: "class", target, oldValue });
  const t = (l, p = pan) => lista(a.tinte(l, p));
  assert.deepEqual(t([R({ target: carduri[0], addedNodes: [text], removedNodes: [text] })]), [], "doar text");
  assert.ok(t([R({ target: gr, addedNodes: [el("DIV")] })]).includes(gr), "un card adăugat");
  assert.ok(t([R({ target: gr, removedNodes: [el("DIV")] })]).includes(gr), "un card scos");
  const g2 = el("DIV", {}, [el("DIV"), el("DIV"), el("DIV")]), sect = el("DIV", {}, [g2]); sect.parentElement = pan;
  assert.ok(t([R({ target: pan, addedNodes: [sect] })]).includes(g2), "o grilă nouă venită cu o secțiune");
  // altă pagină: nimic, și nici nu se caută prin ce a sosit acolo (scannerul își reîncarcă rândurile și când nu-l vezi)
  const sosit = el("DIV"); let cautari = 0; const qsa = sosit.querySelectorAll; sosit.querySelectorAll = (s) => { cautari++; return qsa(s); };
  assert.deepEqual(t([R({ target: ascuns, addedNodes: [sosit] })]), [], "altă pagină");
  assert.equal(cautari, 0, "nicio căutare pe altă pagină");
  // scris la fel: clasa panoului rescrisă identic (coloana() din asezare-paznic, la 1,5 s), hidden pe ce era ascuns
  assert.deepEqual(t([cls(pan, "panel on")]), [], "clasa rescrisă identic");
  assert.deepEqual(t([R({ type: "attributes", attributeName: "hidden", target: gr, oldValue: null })]), [], "hidden scos de pe ce nu-l avea");
  // marcajul meu: am pus randPlin pe al treilea card
  carduri[2].cls = "card randPlin"; carduri[2].__arCls = "card randPlin";
  assert.deepEqual(t([cls(carduri[2], "card")]), [], "clasa pusă de mine");
  // pune() rescrie clasa fără marcaj ⇒ marcajul s-a pierdut ⇒ grila se reface
  carduri[2].cls = "card";
  assert.ok(t([cls(carduri[2], "card randPlin")]).includes(gr), "marcajul șters de altcineva");
  carduri[2].cls = "card good";
  assert.ok(t([cls(carduri[2], "card")]).includes(gr), "clasa schimbată de altcineva");
  // un `__arCls` vechi: i-am scos marcajul („card”); alt cod pune „card x”, apoi îl readuce la „card” - schimbare reală, nu a mea
  carduri[1].cls = "card"; carduri[1].__arCls = "card";
  assert.ok(t([cls(carduri[1], "card x")]).includes(gr), "__arCls vechi nu ascunde o schimbare");
  assert.ok(t([cls(pan, "panel")]).includes(gr), "pagina arătată");
  const gp = el("DIV", {}, [el("DIV"), el("DIV"), el("DIV")]), pliu = el("DETAILS", {}, [gp]); pliu.parentElement = pan;
  assert.ok(t([R({ type: "attributes", attributeName: "open", target: pliu, oldValue: null })].map((r) => { pliu.getAttribute = (k) => (k === "open" ? "" : null); return r; })).includes(gp), "pliul deschis");
  // o grilă rămasă cu 2 copii, unul încă marcat: și ea intră la refacere când se arată pagina
  const doi = [el("DIV"), el("DIV", { cls: "card randPlin" })], g22 = el("DIV", {}, doi); g22.parentElement = gr;
  gr.children.push(g22);
  assert.ok(t([cls(pan, "panel")]).includes(g22), "grila cu un marcaj rămas pe 2 copii");
  assert.deepEqual(t([R({ target: gr, addedNodes: [el("DIV")] })], null), [], "fără pagină deschisă");
});
await test("o tură a observatorului: grilele se refac de sus în jos (grila mare înaintea celei din cardul ei, oricum ar veni schimbările), iar grilele din cardul întins se refac după el", () => {
  // H stă în cardul C al grilei G; C întins ⇒ H are loc pe un rând; C îngust ⇒ H pe 2 coloane, al treilea ei copil singur
  const facePagina = () => {
    const { el, numeroteaza } = pagina(), s = {};
    const lat = () => (s.C.classList.contains("randPlin") ? 700 : 334);
    s.h = [0, 1, 2].map((i) => el("DIV", { cls: "h", rect: () => (lat() > 600 ? { top: 320, left: i * 233, width: 225, height: 130 } : { top: i < 2 ? 320 : 460, left: (i % 2) * 170, width: 160, height: 130 }) }));
    s.H = el("DIV", { cls: "H", stil: STIL_GRILA(2), rect: () => ({ top: 320, width: lat(), height: 300 }) }, s.h);
    s.A1 = el("DIV", { cls: "card", rect: { top: 0, left: 0, width: 350, height: 300 } }); s.B1 = el("DIV", { cls: "card", rect: { top: 0, left: 366, width: 350, height: 300 } });
    s.C = el("DIV", { cls: "card", rect: (e) => (e.classList.contains("randPlin") ? { top: 310, left: 0, width: 716, height: 300 } : { top: 310, left: 0, width: 350, height: 300 }) }, [s.H]);
    s.G = el("DIV", { cls: "G", stil: STIL_GRILA(2), rect: { top: 0, width: 716, height: 610 } }, [s.A1, s.B1, s.C]);
    s.P = numeroteaza(el("SECTION", { cls: "panel on", stil: { display: "block" }, rect: { top: 0, width: 716, height: 610 } }, [s.G]));
    s.ctx = ctxPagina({ document: { querySelector: (q) => (q === ".panel.on" ? s.P : null) } });
    return s;
  };
  const s = facePagina();
  assert.equal(typeof s.ctx.ArRanduri.laSchimbari, "function", "lipsește ArRanduri.laSchimbari");
  // schimbările vin cu cea din H întâi
  s.ctx.ArRanduri.laSchimbari([{ type: "childList", target: s.H, addedNodes: [s.h[2]], removedNodes: [] }, { type: "childList", target: s.G, addedNodes: [s.C], removedNodes: [] }]);
  assert.equal(s.C.classList.contains("randPlin"), true, "C singur jos ⇒ întins");
  assert.equal(s.h[2].classList.contains("randPlin"), false, "H socotită după C (pe un rând), nu înainte");
  // H fusese așezată cât C era îngust (al treilea ei copil întins); vine o schimbare doar în G ⇒ C se întinde ⇒ H se reface după el
  const t = facePagina();
  t.ctx.ArRanduri.aseazaGrila(t.H); assert.equal(t.h[2].classList.contains("randPlin"), true);
  t.ctx.ArRanduri.laSchimbari([{ type: "childList", target: t.G, addedNodes: [t.B1], removedNodes: [] }]);
  assert.equal(t.C.classList.contains("randPlin"), true);
  assert.equal(t.h[2].classList.contains("randPlin"), false, "grila din cardul întins refăcută după el");
});
await test("Sugestii își schimbă cifrele pe loc și cu un card întins (revizia: `randPlin` stricase actualizarea pe loc din v100.243–244): același nod, aceeași cheie, clasa rămâne", () => {
  const fis = citeste("public", "lib", "sugestii-ecran.js"), D = dom();
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fis.slice(fis.indexOf("function sugClasa("), fis.indexOf("function sugTexte(")) + "\nthis.acelasi = sugAcelasiNod;", ctx);   /* v100.292: + sugClasa / sugOpac (revizia 🔴1) */
  vm.runInContext(fis.slice(fis.indexOf("function sugAlinia("), fis.indexOf("function sugDeseneaza(")) + "\nthis.alinia = sugAlinia;", ctx);
  // pagina are cardul întins, desenul nou nu știe de clasă ⇒ tot același nod (cifrele se schimbă pe loc)
  assert.equal(ctx.acelasi(D.parse('<div class="sugGrila"><div class="sugCartela">A</div><div class="sugCartela">B</div><div class="sugCartela randPlin">C</div></div>')[0],
    D.parse('<div class="sugGrila"><div class="sugCartela">A</div><div class="sugCartela">B</div><div class="sugCartela">C2</div></div>')[0]), true);
  // alinierea: cardul cu titlu (cheia după titlu) și cel fără (cheia după clasă) își păstrează nodul și clasa
  const [g1] = D.parse('<div class="sugGrila"><div class="sugCartela"><b>A</b></div><div class="sugCartela"><b>B</b></div><div class="sugCartela randPlin"><b>C</b> 1</div></div>'), c1 = elem(g1)[2];
  assert.equal(ctx.alinia(g1, D.parse('<div class="sugGrila"><div class="sugCartela"><b>A</b></div><div class="sugCartela"><b>B</b></div><div class="sugCartela"><b>C</b> 2</div></div>')[0]), true);
  assert.equal(elem(g1)[2], c1, "cardul cu titlu își păstrează nodul");
  assert.equal(c1.classList.contains("randPlin"), true, "clasa o scoate doar așezarea");
  const [g2] = D.parse('<div class="sugGrila"><p class="tbSub">x</p><p class="tbSub">y</p><p class="tbSub randPlin">z</p></div>'), p2 = elem(g2)[2];
  assert.equal(ctx.alinia(g2, D.parse('<div class="sugGrila"><p class="tbSub">x</p><p class="tbSub">y</p><p class="tbSub">z2</p></div>')[0]), true);
  assert.equal(elem(g2)[2], p2, "cardul fără titlu își păstrează nodul");
  assert.equal(p2.classList.contains("randPlin"), true);
});
await test("când se reface: la pornire (înaintea primului desen), la lățime nouă (doar lățimea - pe telefon bara de adresă schimbă înălțimea) o trecere după 150 ms, la o schimbare REALĂ a clasei din body (Setări: Crypto / Stocks) înaintea desenului; observatorul pe `main`: elementele și clasa / hidden / style / open cu valoarea veche, nu textul", () => {
  const ev = {}, raf = [], timere = [], obs = []; let treceri = 0, clsBody = "marketModeCrypto";
  const main = {}, body = { getAttribute: (k) => (k === "class" ? clsBody : null) }, fereastra = { innerWidth: 1440, addEventListener: (n, f) => { ev[n] = f; } };
  const doc = { readyState: "complete", hidden: false, body, addEventListener() {}, querySelector: (s) => (s === "main" ? main : s === ".panel.on" ? { querySelectorAll: (q) => { if (q === "*") treceri++; return []; } } : null) };
  class MO { constructor(f) { this.f = f; } observe(n, o) { obs.push({ n, o, f: this.f }); } }
  const ctx = { ...GLOBALE, window: fereastra, document: doc, MutationObserver: MO, getComputedStyle: () => ({}),
    requestAnimationFrame: (f) => { raf.push(f); return raf.length; },
    setTimeout: (f, ms) => { timere.push({ f, ms }); return timere.length; }, clearTimeout: (i) => { if (timere[i - 1]) timere[i - 1].f = null; } };
  vm.createContext(ctx); vm.runInContext(LIB, ctx);
  assert.equal(raf.length, 1, "o trecere înaintea primului desen"); raf.shift()(); assert.equal(treceri, 1);
  const pe = (n) => obs.find((x) => x.n === n);
  const om = pe(main); assert.ok(om, "observatorul pe main");
  assert.equal(om.o.childList, true); assert.equal(om.o.subtree, true); assert.equal(om.o.attributes, true); assert.equal(om.o.attributeOldValue, true, "valoarea veche (scrierile identice se sar)");
  assert.deepEqual(Array.from(om.o.attributeFilter || []).sort(), ["class", "hidden", "open", "style"]); assert.ok(!om.o.characterData, "textul nu");
  ev.resize(); assert.equal(timere.filter((x) => x.f).length, 0, "aceeași lățime ⇒ nimic");
  fereastra.innerWidth = 1024; ev.resize(); fereastra.innerWidth = 1000; ev.resize();
  const vii = timere.filter((x) => x.f); assert.equal(vii.length, 1, "o singură trecere"); assert.equal(vii[0].ms, 150);
  vii[0].f(); assert.equal(treceri, 2);
  const ob = pe(body); assert.ok(ob, "observatorul pe clasa din body");
  assert.equal(ob.o.attributes, true); assert.equal(ob.o.attributeOldValue, true); assert.deepEqual(Array.from(ob.o.attributeFilter || []), ["class"]); assert.ok(!ob.o.subtree, "doar body, nu tot documentul");
  ob.f([{ type: "attributes", target: body, attributeName: "class", oldValue: "marketModeCrypto" }]); assert.equal(raf.length, 0, "clasa din body rescrisă identic ⇒ nimic");
  clsBody = "marketModeStocks"; ob.f([{ type: "attributes", target: body, attributeName: "class", oldValue: "marketModeCrypto" }]);
  assert.equal(raf.length, 1, "Crypto ⇒ Stocks: o trecere înaintea desenului"); raf.shift()(); assert.equal(treceri, 3);
});
await test("legătura: scriptul în pagină și în cache-ul offline; doar o clasă, niciun nod mutat", () => {
  assert.match(citeste("public", "index.html"), /<script src="\/lib\/asezare-randuri\.js"><\/script>/);
  assert.match(citeste("public", "sw.js"), /"\/lib\/asezare-randuri\.js"/);
  assert.match(LIB, /var CLS = "randPlin"/); assert.match(LIB, /classList\.add\(CLS\)/); assert.match(LIB, /classList\.remove\(CLS\)/);
  assert.doesNotMatch(LIB, /appendChild|insertBefore|replaceChild|\.remove\(\);|innerHTML|outerHTML/);
});
await test("stilul: cardul singur pe tot rândul (grilă și rând flexibil); grilele de carduri cât conținutul; totul înaintea paletei (pânda rămâne chiar înaintea cozii)", () => {
  const C = citeste("public", "app.css"), i = C.indexOf("/* v100.288"), j = C.indexOf("/* v100.272 (ideile auditului 29.10): paleta");
  assert.ok(i > 0 && i < j, "blocul v100.288 înaintea paletei");
  const b = C.slice(i, j);
  assert.match(b, /\.panel \.randPlin\{grid-column:1\/-1;flex:1 1 100%\}/);
  for (const s of [".settingsGrid", ".reportSections", ".volHero", ".prHero", ".decisionToolGrid", ".decisionExplainGrid", ".cacheGrid"]) assert.ok(b.includes(s), "align-items:start pe " + s);
  // Piața azi, cu datele reale: Lărgimea crypto +147 px, Lărgimea Nasdaq +128, VIX +100, Calendarul +82 ⇒ cât conținutul; perechea de verdicte
  // (o casetă împărțită în două, înălțime egală dinadins) rămâne neatinsă
  assert.match(b, /#dash \.acPuls,#dash \.acDoua\{align-items:start\}/); assert.doesNotMatch(b, /acVerdicte/);
});
await test("versiunile: v100.288 în aplicație, colectorul neatins (v101.158); proba în lanț; v100287 de la v100.287 în sus", () => {
  // v100.289: de la v100.288 în sus (ca probele vechi), nu exact
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 288, String(app));
  assert.match(citeste("BUILD_INFO.json"), new RegExp('"version": "v100\\.' + app + '"'));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 158);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100." + app + ".0", "versiunea din package.json (syntax-v71 o leagă de cache-ul sw.js)"); assert.equal(p.scripts["test:v100288"], "node scripts/proba-v100288.mjs"); assert.match(p.scripts.test, /npm run test:v100287 && npm run test:v100288/);
  assert.doesNotMatch(citeste("scripts", "proba-v100287.mjs"), /VERSIUNE = "v100\\\.287"\/\)/);
});

// pagina de probă din v100.244 (doar cât îi trebuie lui sugAcelasiNod / sugAlinia)
function dom() {
  function element(tag) {
    const el = { nodeType: 1, tagName: String(tag || "div").toUpperCase(), attrs: {}, className: "", childNodes: [], parentNode: null };
    el.getAttribute = (k) => (el.attrs[k] == null ? null : el.attrs[k]);
    el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
    el.removeAttribute = (k) => { delete el.attrs[k]; if (k === "class") el.className = ""; };
    el.appendChild = (n) => {
      if (n.parentNode) { const i = n.parentNode.childNodes.indexOf(n); if (i >= 0) n.parentNode.childNodes.splice(i, 1); }
      n.parentNode = el; el.childNodes.push(n); return n;
    };
    el.removeChild = (n) => { const i = el.childNodes.indexOf(n); if (i >= 0) el.childNodes.splice(i, 1); if (n.parentNode === el) n.parentNode = null; return n; };
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
      if (m[4]) { const t = text(m[4]); st[st.length - 1].childNodes.push(t); t.parentNode = st[st.length - 1].nodeType ? st[st.length - 1] : null; }
    }
    return out;
  }
  return { parse };
}
function elem(n) { return n.childNodes.filter((x) => x.nodeType === 1); }

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
