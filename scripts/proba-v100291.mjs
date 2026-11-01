// Proba v100.291 (el, 01.11: „vreau să trecem la pagina Trading 212: redesign, layout, grafice refăcute că nu merg odată cu prețul,
// îmbunătățiri” + „in modul de prezentare a deținerilor” ⇒ demo pe pânză, „arată bine demo”, „continua”).
// Cauzele găsite pe pagina vie (systematic-debugging):
//   R1 - pozițiile nu se recitesc cât stai pe pagină („citit la” neschimbat după 75 s);
//   R2 - graficul din poziție e pe zile ÎNCHISE, iar cât bursa e deschisă bara zilei e scoasă (GridCalcul.bareBursa) ⇒ prețul e doar o linie;
//   R3 - lumânările 5m…4h se aduc doar pentru semafor și nu se desenează.
// Ce probează:
//   1-2. t212BaraVie: lumânarea în curs din prețul viu (zi + intraday), fără să atingă barele închise din care se calculează;
//   3-5. o singură fișă (t212AlesValid), „Ce ai de făcut cu X” (t212TodoPentru), curba pe 30 de zile (t212SparkHtml);
//   6.   recitirea la 30 s doar când are sens (t212ViuTrebuie);
//   7.   ce ai scris și pliurile deschise rămân după redesenare (t212PastreazaCiteste / Pune);
//   8.   rândul + fișa (t212RandPozitie): capul fișei cu toate etichetele vechi ale tabelului, fișa ÎNAINTE de grafic și detaliu;
//   9.   graficul: butoanele 5m…1z și alegerea lor (t212AlegeTf);
//   10.  pastilele verdictului deschid fișa (AsezarePaznic.voceHtml);
//   11.  așezarea: benzile sus, Pozițiile pe toată lățimea, „Ce ai de făcut acum” lângă Vreau să cumpăr + Portofoliul; lista + fișa de la 900 px;
//   12.  pagina pornește recitirea și scrie „Ce ai de făcut acum” în locul lui; 13. versiunile.
//   node scripts/proba-v100291.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.291 · Trading 212: lista + fișa, graficul cu prețul viu · proba\n");

const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.ActiuniSemnale = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
globalThis.T212 = new Function(`${lib("t212.js")}; return T212;`)();
globalThis.GraficBot = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const NUME = ["t212", "t212Tf", "t212Viu", "t212BaraVie", "t212SparkHtml", "t212AlesValid", "t212AlesUrmator", "t212TodoPentru", "t212ViuTrebuie", "t212ViuTic", "t212PastreazaCiteste", "t212PastreazaPune", "t212RandPozitie", "t212GraficeDeseneaza", "t212AlegeTf", "t212PlanSalveaza", "t212ZiNY"];
function incarcaT212(dom = {}, o = {}) {
  const ascult = {}, doc = { addEventListener(t, f) { ascult[t] = f; }, getElementById: (id) => (dom[id] || null), querySelectorAll: () => [], visibilityState: "visible" };
  const f = new Function("escapeHtml", "$", "getJSON", "localStorage", "document", "toast", "apiFetch",
    lib("t212-ecran.js") + "\n;return {" + NUME.map((n) => `${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ") + ", __set: function (n, f) { eval(n + ' = f'); } };");
  const m = f(esc, (id) => dom[id] || null, o.getJSON || (async () => ({})), { getItem: () => null, setItem() {} }, doc, () => {}, o.apiFetch || (async () => ({ ok: true, json: async () => ({}) })));
  m.ascult = ascult; return m;
}
const T = incarcaT212();
const fn = (n) => { assert.equal(typeof T[n], "function", n + " nu există"); return T[n]; };

// ================================================================ 1-2. lumânarea în curs
await test("1. t212BaraVie, pe zi: cu bursa deschisă, ziua de azi se face din prețul viu (deschide la închiderea de ieri); închisă ⇒ barele rămân", () => {
  const f = fn("t212BaraVie"), Z = 86400000;
  const bare = [{ t: Date.parse("2026-10-29T13:30:00Z"), o: 100, h: 102, l: 99, c: 101, v: 1 }, { t: Date.parse("2026-10-30T13:30:00Z"), o: 101, h: 103, l: 100, c: 102, v: 1 }];
  const acum = Date.parse("2026-11-02T15:00:00Z");   // luni, 10:00 la New York
  const r = f(bare, 104.5, Z, acum, true);
  assert.equal(r.length, 3, "se adaugă ziua de azi");
  const z = r[2]; assert.deepEqual([z.o, z.h, z.l, z.c, z.viu], [102, 104.5, 102, 104.5, true]);
  assert.equal(bare.length, 2, "barele închise (din care se calculează stopul și semaforul) NU se ating");
  const cuAzi = bare.concat([{ t: Date.parse("2026-11-02T14:30:00Z"), o: 102.5, h: 103, l: 101.8, c: 102.9, v: 5 }]);
  const r2 = f(cuAzi, 100.9, Z, acum, true);
  assert.equal(r2.length, 3, "bara de azi existentă se actualizează, nu se dublează");
  assert.deepEqual([r2[2].o, r2[2].h, r2[2].l, r2[2].c], [102.5, 103, 100.9, 100.9]);
  assert.equal(cuAzi[2].c, 102.9, "nici bara de azi primită nu se modifică pe loc");
  assert.deepEqual(f(bare, 104.5, Z, acum, false), bare, "bursa închisă ⇒ nimic inventat");
  assert.deepEqual(f(bare, null, Z, acum, true), bare, "fără preț ⇒ nimic inventat");
});
await test("2. t212BaraVie, intraday: în perioada ultimei lumânări o actualizează; după ea începe una nouă, aliniată la lumânările primite", () => {
  const f = fn("t212BaraVie"), m5 = 300000, t0 = Date.parse("2026-11-02T14:30:00Z");
  const bi = [{ t: t0, o: 1, h: 1.2, l: 0.9, c: 1.1, v: 1 }, { t: t0 + m5, o: 1.1, h: 1.3, l: 1, c: 1.2, v: 1 }];
  const a = f(bi, 1.35, m5, t0 + m5 + 60000, true);
  assert.equal(a.length, 2); assert.deepEqual([a[1].h, a[1].c], [1.35, 1.35]);
  const b = f(bi, 1.15, m5, t0 + 3 * m5 + 10000, true);
  assert.equal(b.length, 3); assert.deepEqual([b[2].t, b[2].o, b[2].h, b[2].l, b[2].c], [t0 + 3 * m5, 1.2, 1.2, 1.15, 1.15]);
  assert.equal(bi[1].c, 1.2, "lumânările primite rămân neatinse");
});

// ================================================================ 3-5. fișa
await test("3. o singură fișă: rămâne cea aleasă cât există; altfel cea mai urgentă (prima); fără poziții, niciuna", () => {
  const f = fn("t212AlesValid"), poz = [{ ticker: "APLD_US_EQ" }, { ticker: "MU_US_EQ" }];
  assert.equal(f(poz, "MU_US_EQ"), "MU_US_EQ"); assert.equal(f(poz, "VANDUT_US_EQ"), "APLD_US_EQ"); assert.equal(f(poz, null), "APLD_US_EQ"); assert.equal(f([], "MU_US_EQ"), null);
});
await test("4. „Ce ai de făcut cu X”: rândurile poziției și cele care o numesc printre altele, nu cele generale", () => {
  const f = fn("t212TodoPentru"), todo = [{ tk: "MU_US_EQ", t: "MU sub stop" }, { tks: ["WDC_US_EQ", "MU_US_EQ"], t: "WDC și MU: proba pe minus" }, { t: "general" }, { tk: "WDC_US_EQ", t: "WDC" }];
  assert.deepEqual(f(todo, "MU_US_EQ").map((x) => x.t), ["MU sub stop", "WDC și MU: proba pe minus"]);
  assert.deepEqual(f(todo, "QCOM_US_EQ"), []); assert.deepEqual(f(null, "MU_US_EQ"), []);
});
await test("5. curba pe 30 de zile: ultimele 30 de închideri (+ prețul viu cu bursa deschisă), verde dacă a urcat, nimic sub 2 puncte", () => {
  const f = fn("t212SparkHtml"), b = Array.from({ length: 40 }, (_, i) => ({ t: i, c: 100 - i }));
  const h = f(b, 50, false), pts = (h.match(/points="([^"]+)"/) || [])[1] || "";
  assert.match(h, /^<svg[^>]*class="t212Spark jos"[^>]*aria-hidden="true"/); assert.equal(pts.trim().split(/\s+/).length, 30);
  const v = f(b, 200, true); assert.match(v, /class="t212Spark sus"/, "prețul viu, cu bursa deschisă, intră în curbă"); assert.equal(((v.match(/points="([^"]+)"/) || [])[1] || "").trim().split(/\s+/).length, 31);
  assert.equal(f([{ t: 1, c: 3 }], 3, false), "");
});

// ================================================================ 6-7. prețul viu, fără să strice ce scrii
await test("6. recitirea la 30 s: doar pe pagina T212 deschisă, cu fila la vedere, bursa deschisă, contul citit, nimic în lucru, niciun câmp în scriere", () => {
  const f = fn("t212ViuTrebuie"), ok = { activ: true, vizibil: true, deschisa: true, inLucru: false, areCont: true, eroare: false, la: 0, acum: 100000, scrie: false };
  assert.equal(f(ok), true);
  for (const [k, v] of [["activ", false], ["vizibil", false], ["deschisa", false], ["inLucru", true], ["areCont", false], ["scrie", true], ["eroare", true]]) assert.equal(f({ ...ok, [k]: v }), false, k);
  assert.equal(f({ ...ok, la: 90000 }), false, "citit acum 10 s ⇒ nu încă");
});
await test("7. la redesenare rămân ce ai scris și n-ai salvat, plus pliurile deschise (cheia: fișa + titlul pliului, fără cifre)", () => {
  const cit = fn("t212PastreazaCiteste"), pune = fn("t212PastreazaPune");
  const sm = (t) => ({ textContent: t }), fisa = { id: "t212Det-MU_US_EQ" };
  const i1 = { id: "t212Trail-MU_US_EQ", value: "12", defaultValue: "15" }, i2 = { id: "t212Tinta-MU_US_EQ", value: "1311.36", defaultValue: "1311.36" };
  const d1 = { open: true, closest: () => fisa, querySelector: () => sm("Restul (4) — tot ce mai văd, pliat") };
  i1.selectionStart = 2; i1.selectionEnd = 2;
  const s = cit({ querySelectorAll: (q) => (q === "input[id]" ? [i1, i2] : q === "details[open]" ? [d1] : []), contains: (e) => e === i1 }, i1);
  assert.deepEqual(s.val, { "t212Trail-MU_US_EQ": "12" }); assert.deepEqual(s.pliuri, ["t212Det-MU_US_EQ|Restul (#) — tot ce mai văd, pliat"]);
  assert.deepEqual(s.activ, { id: "t212Trail-MU_US_EQ", a: 2, b: 2 }, "ține minte în ce câmp scriai și unde era cursorul");
  let focus = 0, sel = null; const n1 = { id: "t212Trail-MU_US_EQ", value: "15", defaultValue: "15", focus() { focus++; }, setSelectionRange(a, b) { sel = [a, b]; } }, n2 = { id: "t212Stop-MU_US_EQ", value: "", defaultValue: "" };
  const d2 = { open: false, closest: () => fisa, querySelector: () => sm("Restul (5) — tot ce mai văd, pliat") }, d3 = { open: false, closest: () => fisa, querySelector: () => sm("Cum s-a verificat") };
  pune({ querySelectorAll: (q) => (q === "input[id]" ? [n1, n2] : q === "details" ? [d2, d3] : []) }, s);
  assert.equal(n1.value, "12"); assert.equal(n2.value, ""); assert.equal(d2.open, true); assert.equal(d3.open, false);
  assert.equal(focus, 1, "focusul revine în câmpul în care scriai"); assert.deepEqual(sel, [2, 2], "cu cursorul unde era");
});

// ================================================================ 8. rândul + fișa
const P = { ticker: "MU_US_EQ", simbol: "MU", sem: { nivel: "iesi", motive: ["−18,4% de la maxim"], ceAsFace: "👉 Ce aș face eu: Aș ieși." }, st: { trend: { dir: "lateral", tarie: "slab" }, distMax52: -0.292 },
  plan: { trailPct: 15, tinta: 1311.36, la: Date.parse("2026-10-14T10:00:00Z") }, pret: 889.15, pretMediu: 993.06, qty: 1.293, ppl: -648, pctLei: -0.105, pond: 0.21, niv: null, cons: null, sfaturi: [], maxDupaCumparare: 1089.22 };
const bare30 = Array.from({ length: 60 }, (_, i) => ({ t: Date.parse("2026-08-01T13:30:00Z") + i * 86400000, o: 900 + i, h: 910 + i, l: 890 + i, c: 905 + i, v: 1 }));
await test("8. rândul compact are curba; fișa are capul cu etichetele vechi ale tabelului (Acțiune … Plan), „Ce ai de făcut cu MU”, apoi graficul, apoi detaliul; ascunsă cât nu e aleasă", () => {
  const f = fn("t212RandPozitie");
  T.t212.bare.MU_US_EQ = bare30; T.t212.todo = [{ tk: "MU_US_EQ", c: "r", t: "MU a coborât sub stopul calculat ($925.84)", s: "Aș ieși." }, { t: "general", c: "g", s: "" }];
  T.t212.deschis = {};
  const inchis = f(P), [rand, det] = inchis.split('<tr class="t212Det"');
  assert.match(rand, /<tr class="t212Rand[^"]*" id="t212R-MU_US_EQ"/); assert.match(rand, /<td class="c-spark"><svg[^>]*class="t212Spark/);
  assert.match('<tr class="t212Det"' + det, /^<tr class="t212Det" id="t212Det-MU_US_EQ" hidden>/);
  T.t212.deschis = { MU_US_EQ: true };
  const h = f(P), d = h.slice(h.indexOf('<tr class="t212Det"'));
  assert.doesNotMatch(d.slice(0, 80), /hidden/);
  const cap = d.slice(d.indexOf('class="t212FisaCap"'), d.indexOf('class="t212Graf"'));
  assert.ok(d.indexOf('class="t212FisaCap"') > 0, "capul fișei");
  for (const et of ["Acțiune", "Acum", "Rezultat", "Stop calculat", "Țintă", "Trend", "Din cont", "Plan"]) assert.match(cap, new RegExp('<span class="t212Et">' + et + "</span>"), et);
  assert.match(cap, /\$889\.15/); assert.match(cap, /−648 lei/); assert.match(cap, /21%/); assert.match(cap, /✓ −15% de la max · țintă \$1311\.36/);
  assert.match(cap, /Ce ai de făcut cu MU/); assert.match(cap, /MU a coborât sub stopul calculat/); assert.doesNotMatch(cap, />general</);
  assert.ok(d.indexOf('class="t212Graf"') < d.indexOf('class="t212DetGrila"'), "graficul înaintea detaliului, ca în demo");
});

// ================================================================ 9. graficul: intervalele
await test("9. graficul fișei are butoanele 5m · 15m · 30m · 1h · 4h · 1z (1z apăsat); t212AlegeTf schimbă intervalul, ignoră ce nu e în listă", () => {
  const graf = { innerHTML: "", style: {}, closest: () => null, getBoundingClientRect: () => ({ width: 820 }), clientWidth: 820 };
  const U = incarcaT212({ "t212Graf-MU_US_EQ": graf });
  U.t212.bare.MU_US_EQ = bare30; U.t212.pozPregatite = [P]; U.t212.deschis = { MU_US_EQ: true };
  U.t212Tf.MU_US_EQ = { la: Date.now(), pe: {}, inLucru: false, lipsa: [] };   // ca să nu plece cereri
  U.t212GraficeDeseneaza();
  const g = graf.innerHTML.match(/<div class="tbInterval t212TfGrup"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(g, "grupul de intervale");
  assert.deepEqual([...g[1].matchAll(/>([^<]+)<\/button>/g)].map((m) => m[1]), ["5m", "15m", "30m", "1h", "4h", "1z"]);
  assert.match(g[1], /aria-pressed="true"[^>]*data-action-click="t212AlegeTf\('MU_US_EQ','1z'\)"/);
  assert.match(graf.innerHTML, /<svg/, "1z se desenează din barele zilnice");
  U.t212AlegeTf("MU_US_EQ", "1h"); assert.equal(U.t212.tf.MU_US_EQ, "1h");
  assert.match(graf.innerHTML, /aria-pressed="true"[^>]*data-action-click="t212AlegeTf\('MU_US_EQ','1h'\)"/);
  assert.match(graf.innerHTML, /lumânările de 1 oră/, "fără lumânări încă ⇒ spune că le aduce");
  U.t212AlegeTf("MU_US_EQ", "2h"); assert.equal(U.t212.tf.MU_US_EQ, "1h", "intervalul necunoscut se ignoră");
  const A = citeste("public", "app.js"); assert.match(A.match(/ACTIUNI_PERMISE=new Set\("([^"]+)"/)[1], /(^| )t212AlegeTf( |$)/, "butonul e permis");
  const S = lib("t212-ecran.js"), GB = lib("grafic-bot.js");
  assert.match(S, /ActiuniSemnale\.unitateBare\(GridCalcul\.bareToate\(rw\), p\.pret\)/, "lumânările intraday în unitatea prețului T212 (pence / lire), ca barele zilnice");
  assert.match(S, /oreAxa: !zi/); assert.match(GB, /doarZi = \(o\.actiune && !o\.oreAxa\) \|\| o\.per === "200z"/, "intraday: axa cu ore, nu doar ziua");
});

// ================================================================ 10. pastilele verdictului
await test("10. pastilele verdictului T212 sunt butoane care deschid fișa poziției; celelalte pagini rămân cu pastile simple", () => {
  const AS = lib("asezare-paznic.js");
  const doc = { documentElement: { classList: { add() {} } }, body: { classList: { toggle() {}, contains: () => false } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const ctx = { document: doc, setInterval() {}, setTimeout() {}, clearTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
  const v = ctx.AsezarePaznic.voceHtml;
  assert.equal(typeof v, "function", "voceHtml");
  assert.equal(v({ n: "MU", ton: "jos", tit: "IEȘI", act: "t212Deschide('MU_US_EQ')" }), `<button type="button" class="pzVoce pzVoce-nu" title="IEȘI" data-action-click="t212Deschide('MU_US_EQ')">✗ MU</button>`);
  assert.equal(v({ n: "QCOM", ton: "aur", tit: "ATENȚIE" }), '<span class="pzVoce pzVoce-atentie" title="ATENȚIE">! QCOM</span>');
  assert.match(AS, /primulTodo\("#t212TodoBox \.t212TodoRand"\)/, "primul rând din „Ce ai de făcut acum”, din locul lui nou");
  assert.match(AS, /t212Deschide\('" \+ /, "pagT212 pune acțiunea pe fiecare pastilă");
});

// ================================================================ 11-12. așezarea
await test("11. așezarea ca în demo: benzile sus, verdictul, cifrele, Pozițiile pe toată lățimea, [Ce ai de făcut acum | Vreau să cumpăr + Portofoliul], Ideile; lista + fișa de la 900 px", () => {
  const H = citeste("public", "index.html"), C = citeste("public", "app.css");
  const card = H.slice(H.indexOf('id="t212Card"'), H.indexOf("</aside></div>", H.indexOf('id="t212Card"')) + 14);
  assert.match(card, /id="t212Stare"[^<]*<\/span><span class="t212Chip t212Bursa" id="t212Bursa" hidden><\/span>/, "starea bursei lângă „citit la”");
  assert.ok(card.indexOf('id="t212PozPanou"') > 0 && card.indexOf('id="t212PozPanou"') < card.indexOf('class="t212Grila"'), "Pozițiile înaintea grilei de jos");
  const grila = card.slice(card.indexOf('class="t212Grila"'));
  assert.ok(grila.indexOf('id="t212TodoBox"') > 0 && grila.indexOf('id="t212TodoBox"') < grila.indexOf('class="t212Side"'), "„Ce ai de făcut acum” în stânga grilei de jos");
  assert.match(card, /<h4>Pozițiile<\/h4><span class="tbSub">clic pe un rând pentru detalii și plan<\/span>/, "titlul și îndemnul rămân");
  const ord = (sel) => Number((C.match(new RegExp("\\.pzDemo #t212Card>" + sel.replace(/[.#]/g, (c) => "\\" + c) + "\\{order:(\\d+)\\}")) || [])[1]);
  assert.ok(ord(".contTot") < ord("#pzV-t212") && ord(".piataAzi") < ord("#pzV-t212"), "benzile deasupra verdictului");
  assert.ok(ord("#t212Sus") < ord("#t212PozPanou") && ord("#t212PozPanou") < ord(".t212Grila") && ord(".t212Grila") < ord("#t212Idei"));
  assert.match(C, /#t212Continut\{container-type:inline-size\}/);
  const mare = C.slice(C.indexOf("@container (min-width:900px)"));
  assert.ok(C.indexOf("@container (min-width:900px)") > 0, "lista + fișa de la 900 px");
  assert.match(mare, /#t212Continut tr\.t212Det\{grid-column:2;grid-row:1\/-1/);
  assert.match(C, /#t212Continut tr\.t212Det\[hidden\]\{display:none\}/);
  assert.match(C, /#t212Continut tr\.t212Rand \.t212Modele\{grid-area:mod;display:block/, "„peste 5 zile: 🧠 · 🌳” rămâne la vedere în rând, și pe telefon (revizia 🔵5)");
  assert.doesNotMatch(C, /#t212Continut tr\.t212Rand \.t212Modele\{display:none/);
  assert.match(C, /button\.pzVoce\{width:auto;min-height:0;margin:0;background:transparent;font-weight:400/, "pastila-buton nu ia lățimea și scrisul butoanelor obișnuite (poza 1920)");
  assert.doesNotMatch(C, /button\.pzVoce\{font:inherit/, "scrisul pastilei (mono, 11,5 px) rămâne");
  assert.match(C, /button\.pzVoce:hover\{background:rgba\(255,255,255,\.05\);transform:none;border-color:currentColor\}/, "la hover chenarul nu devine gri (button:hover de bază)");
});
await test("12. pagina pornește recitirea, scrie „Ce ai de făcut acum” în locul lui, ține minte lista pentru fișe și alege o poziție", () => {
  const S = lib("t212-ecran.js");
  const porn = S.slice(S.indexOf("async function t212Porneste"), S.indexOf("function t212IdeiIncaAcum"));
  assert.match(porn, /^\s*t212ViuPorneste\(\);/m, "apelul adevărat, nu un comentariu (capcana: comentariile păcălesc gărzile)");
  const r = S.slice(S.indexOf("function t212Render("), S.indexOf("function t212Bucati"));
  assert.match(r, /\$\("t212TodoBox"\)/); assert.match(r, /t212\.todo = todo/); assert.match(r, /t212AlesUrmator\(poz, /);
  assert.match(r, /t212PastreazaCiteste\(box, document\.activeElement\)/); assert.match(r, /t212PastreazaPune\(box, pastr\)/);
  assert.match(S, /function t212Render\(viu\) \{/); assert.match(r, /t212GraficeDeseneaza\(viu\);/);
  assert.match(r, /if \(!viu\) \{ t212RenderPoarta\(\); t212IdeiRender\(\); \}/, "recitirea nu redesenează Poarta și Ideile (pliul și „Urmăresc și” rămân)");
  assert.match(S, /function t212GraficeDeseneaza\(faraAducere\) \{/); assert.match(S, /if \(!faraAducere\) t212AduTf\(p\.ticker\);/, "la recitire nu se cer lumânări Twelve Data noi");
  assert.match(S, /function t212Deschide\(tk\) \{[\s\S]{0,200}t212Alege\(tk/, "„Vezi X” și legăturile din alte pagini aleg fișa");
});

// ================================================================ 14-17. revizia Opus
await test("14. fișa implicită: până alegi tu, cea mai urgentă - fixată abia când semaforul are toate prețurile; alegerea ta rămâne", () => {
  const f = fn("t212AlesUrmator"), A = [{ ticker: "A" }, { ticker: "B" }], B2 = [{ ticker: "B" }, { ticker: "A" }];
  assert.deepEqual(f(A, { complet: false }), { ales: "A", fix: false }, "înainte de prețuri: prima, nefixată");
  assert.deepEqual(f(B2, { ales: "A", complet: true }), { ales: "B", fix: true }, "ordinea s-a schimbat după prețuri ⇒ cea mai urgentă, acum fixată");
  assert.deepEqual(f(A, { ales: "B", fix: true, complet: true }), { ales: "B", fix: true }, "fixată ⇒ nu sare când se schimbă ordinea la recitire");
  assert.deepEqual(f(B2, { ales: "A", deEl: true, complet: false }), { ales: "A", fix: false }, "aleasă de tine ⇒ rămâne");
  assert.deepEqual(f([{ ticker: "C" }], { ales: "A", deEl: true }), { ales: "C", fix: false }, "vândută ⇒ prima");
});
await test("15. t212ViuTic: citit bine ⇒ „citit” proaspăt și redesenarea ușoară; zi nouă la New York ⇒ citirea întreagă; alt set (și cantitate) ⇒ reîncărcarea, cel mult o dată la 5 min; câmp intrat între timp ⇒ fără redesenare", async () => {
  const poz1 = [{ ticker: "A", quantity: 1 }], poz2 = [{ ticker: "A", quantity: 2 }];
  let raspPoz = poz1; const U = incarcaT212({}, { getJSON: async (u) => (/pozitii/.test(u) ? { pozitii: raspPoz } : /cont/.test(u) ? { cash: { total: 1 } } : {}) });
  const randari = [], porniri = []; let scrieDupa = false, apeluri = 0;
  U.__set("t212Render", (v) => randari.push(v)); U.__set("t212Porneste", (fz) => porniri.push(fz));
  U.__set("t212ViuStare", () => { apeluri++; return { activ: true, vizibil: true, deschisa: true, inLucru: false, areCont: true, eroare: false, la: 0, acum: 1e15, scrie: apeluri > 1 && scrieDupa }; });
  U.t212.poz = poz1; U.t212.cont = { cash: {} }; U.t212.ziCitire = fn("t212ZiNY")(Date.now());
  await U.t212ViuTic();
  assert.deepEqual(randari, [true], "redesenarea ușoară (t212Render(true))"); assert.ok(Date.now() - U.t212.cititBine < 5000, "„citit” proaspăt (Poarta nu mai zice că brokerul e vechi)");
  U.t212.ziCitire = "2026-10-30"; randari.length = 0; await U.t212ViuTic();
  assert.deepEqual(porniri, [true], "zi nouă ⇒ t212Porneste(true), o dată"); assert.deepEqual(randari, []);
  U.t212.ziCitire = fn("t212ZiNY")(Date.now()); porniri.length = 0; raspPoz = poz2; await U.t212ViuTic(); await U.t212ViuTic();
  assert.deepEqual(porniri, [true], "cantitate schimbată ⇒ reîncărcarea, o singură dată în 5 minute");
  raspPoz = poz1; U.t212.poz = poz1; randari.length = 0; apeluri = 0; scrieDupa = true; await U.t212ViuTic();
  assert.deepEqual(randari, [], "a intrat într-un câmp cât se citea ⇒ nu-i iau câmpul de sub degete");
});
await test("16. planul: ce scrii cât se salvează rămâne „nesalvat” (nu-l mătură redesenarea); recitirea stă cât se salvează", async () => {
  globalThis.window = globalThis.window || {};   // t212PlanSalveaza citește window.__proba (ca în pagină)
  const tr = { id: "t212Trail-MU_US_EQ", value: "12", defaultValue: "15" }, ti = { id: "t212Tinta-MU_US_EQ", value: "1311", defaultValue: "1300" };
  let gata; const U = incarcaT212({ "t212Trail-MU_US_EQ": tr, "t212Tinta-MU_US_EQ": ti }, { apiFetch: () => new Promise((r) => { gata = r; }) });
  U.__set("t212Render", () => {}); U.__set("apiFetch", () => new Promise((r) => { gata = r; }));
  const p = U.t212PlanSalveaza("MU_US_EQ"); await new Promise((r) => setTimeout(r, 0));
  assert.equal(U.t212.salvez, true, "cât se salvează, recitirea așteaptă (butoanele nu se refac active)");
  tr.value = "13"; gata({ ok: true, json: async () => ({ plan: { trailPct: 12, tinta: 1311 } }) }); await p;
  assert.equal(ti.defaultValue, "1311", "câmpul trimis neschimbat ⇒ salvat"); assert.equal(tr.defaultValue, "15", "câmpul schimbat cât se salva ⇒ rămâne de păstrat");
  assert.equal(U.t212.salvez, false);
});
await test("17. rândul se deschide și din tastatură: Enter / Space pe rând aleg poziția; pe un buton din rând, nu", () => {
  const U = incarcaT212(); const ales = []; U.__set("t212Comuta", (tk) => ales.push(tk));
  assert.equal(typeof U.ascult.keydown, "function", "ascultătorul de taste");
  const rand = { id: "t212R-MU_US_EQ" }; rand.closest = () => rand; let opr = 0;
  U.ascult.keydown({ key: "Enter", target: rand, preventDefault() { opr++; } }); U.ascult.keydown({ key: " ", target: rand, preventDefault() { opr++; } });
  const buton = { closest: () => rand }; U.ascult.keydown({ key: "Enter", target: buton, preventDefault() { opr++; } }); U.ascult.keydown({ key: "a", target: rand, preventDefault() {} });
  assert.deepEqual(ales, ["MU_US_EQ", "MU_US_EQ"]); assert.equal(opr, 2);
});

// ================================================================ 13. versiunile
await test("13. versiunile v100.291 (aplicația, BUILD_INFO, pagina, cache-ul, package.json)", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.291"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(B.version, "v100.291"); assert.match(B.badge, /v100\.291/);
  const H = citeste("public", "index.html");
  for (const re of [/<meta content="v100\.291" name="app-version"\/>/, /id="sideVersiune"[^>]*>v100\.291/, /id="antetVersiune"[^>]*>v100\.291/, /healthAppVersion[^>]*>v100\.291/]) assert.match(H, re);
  assert.match(citeste("public", "sw.js"), /CACHE="crypto-radar-v100-291"/);
  const pk = JSON.parse(citeste("package.json")); assert.equal(pk.version, "100.291.0"); assert.equal(pk.scripts["test:v100291"], "node scripts/proba-v100291.mjs");
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
