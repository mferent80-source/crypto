// Proba v100.318 (11.11.2026, el: „ia toate skilurile și optimizează pagina, că mai sunt chestii de îmbunătățit, și fă ideile”).
// Măsurat înainte pe Radarul real (deschis direct pe Tablou, 40 s): 193 de cereri. Cauzele, din lanțul de funcții al fiecărei cereri:
//   (1) banda contului de pe Tablou pornește pagina Trading 212 în fundal, iar desenul paginii ascunse cere graficele pe alte intervale,
//       rejudecă ideile și citește istoria Consilierului pe fiecare rând - nimic din ele nu schimbă banda;
//   (2) aceeași adresă cerută de module diferite la câteva secunde distanță (15 adrese: contul T212 de 2 ori în aceeași secundă,
//       funding de 4 ori, lumânările de 1 h de 3 ori) - getJSON n-avea plasă pentru cererile identice aflate pe drum;
//   (3) I-853: mișcarea mouse-ului pe grafic muta crucea și citea dimensiunea la fiecare eveniment (~8 ms pe pas);
//   (4) I-855: pe telefon becurile semaforului aveau ~20 px de atins, „detalii” 18 px înălțime;
//   (5) rezumatele rândurilor (v100.317) lipeau textul tabelelor: „alt preț Dacă prețul ajunge la Poziția Totalul ar fi 0.3262 +5% 660…”.
// Proba rulează codul ADEVĂRAT (tăiat din fișiere) în vm, cu un DOM / o rețea falsă.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");   /* fișierele sunt CRLF */
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };
const APP = citeste("public", "app.js"), T212 = citeste("public", "lib", "t212-ecran.js"), GB = citeste("public", "lib", "grafic-bot.js"), CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html");
const taie = (src, de, pana) => { const i = src.indexOf(de), j = src.indexOf(pana, i + de.length); assert.ok(i >= 0 && j > i, "nu găsesc bucata „" + de.slice(0, 50) + "”"); return src.slice(i, j); };
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- (2) getJSON: o singură cerere pe drum pentru aceeași adresă, 3 s de prospețime, golit la orice scriere ----
function lumeGet() {
  const cod = taie(APP, "/* v100.318 (I-848): cererile identice", "async function market(path){");
  const apeluri = [], raspuns = { status: 200, corp: '{"a":[1,2,3]}' }; let ceas = 1000000;
  const ctx = { Date: { now: () => ceas }, Map, Promise, JSON, Error, Number, String,
    apiFetch: (url, opt) => { apeluri.push({ url, m: (opt && opt.method) || "GET" }); const r = { ...raspuns }; return new Promise((res) => setTimeout(() => res({ ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.corp }), 5)); } };
  vm.createContext(ctx); vm.runInContext(cod + ";this.getJSON=getJSON;this.getJsonGoleste=getJsonGoleste;this.GET_PROASPAT_MS=GET_PROASPAT_MS;this.marime=function(){return getJsonProaspat?getJsonProaspat.size:0}", ctx);
  return { ctx, apeluri, raspuns, trece: (ms) => { ceas += ms; } };
}

console.log("Proba v100.318 - Tabloul botului, optimizarea");

await test("getJSON: trei cereri identice pornite deodată ⇒ UNA pe rețea; fiecare primește obiectul ei (nu unul comun, ca o sortare să nu strice vecinul)", async () => {
  const L = lumeGet(); const [a, b, c] = await Promise.all([L.ctx.getJSON("/api/x?y=1"), L.ctx.getJSON("/api/x?y=1"), L.ctx.getJSON("/api/x?y=1")]);
  assert.equal(L.apeluri.length, 1); assert.deepEqual(a, { a: [1, 2, 3] }); assert.notEqual(a, b); a.a.reverse(); assert.deepEqual(b.a, [1, 2, 3]); assert.deepEqual(c.a, [1, 2, 3]);
  await L.ctx.getJSON("/api/x?y=2"); assert.equal(L.apeluri.length, 2, "altă adresă = altă cerere");
});
await test("getJSON: în 3 s după răspuns aceeași adresă vine din plasă; după 3 s pleacă din nou", async () => {
  const L = lumeGet(); await L.ctx.getJSON("/api/x"); L.trece(2900); await L.ctx.getJSON("/api/x"); assert.equal(L.apeluri.length, 1);
  L.trece(200); await L.ctx.getJSON("/api/x"); assert.equal(L.apeluri.length, 2); assert.equal(L.ctx.GET_PROASPAT_MS, 3000);
});
await test("getJSON: un răspuns cu eroare nu se ține minte (următoarea cerere pleacă), iar eroarea are textul și codul ca înainte", async () => {
  const L = lumeGet(); L.raspuns.status = 503; L.raspuns.corp = '{"error":"Pionex","detail":"ocupat","retryAfter":7}';
  await assert.rejects(L.ctx.getJSON("/api/x"), (e) => e.message === "Pionex · ocupat" && e.status === 503 && e.retryAfter === 7);
  L.raspuns.status = 200; L.raspuns.corp = '{"ok":1}'; assert.deepEqual(await L.ctx.getJSON("/api/x"), { ok: 1 }); assert.equal(L.apeluri.length, 2);
  L.raspuns.corp = "<html>"; L.trece(5000); await assert.rejects(L.ctx.getJSON("/api/z"), /Răspuns invalid · HTTP 200/);
});
await test("getJSON: o scriere (getJsonGoleste, chemat de apiFetch la orice metodă care nu e GET) golește plasa ȘI rupe cererea aflată pe drum", async () => {
  const L = lumeGet(); await L.ctx.getJSON("/api/plan"); L.ctx.getJsonGoleste(); await L.ctx.getJSON("/api/plan"); assert.equal(L.apeluri.length, 2, "după scriere se citește din nou");
  L.trece(10000); const pe = L.ctx.getJSON("/api/plan"); L.ctx.getJsonGoleste(); const dupa = L.ctx.getJSON("/api/plan"); await Promise.all([pe, dupa]);
  assert.equal(L.apeluri.length, 4, "cererea pornită după scriere nu se lipește de cea de dinainte"); await L.ctx.getJSON("/api/plan"); assert.equal(L.apeluri.length, 4, "cea de după scriere rămâne în plasă");
  const af = taie(APP, "function apiFetch(url,opt={}){", "\n");
  assert.ok(af.startsWith('function apiFetch(url,opt={}){const scrie=!!(opt&&opt.method&&!/^(GET|HEAD)$/i.test(opt.method));if(scrie&&typeof getJsonGoleste==="function")getJsonGoleste();'), "golită la plecarea scrierii");
  assert.ok(af.includes('.then(r=>{if(scrie&&typeof getJsonGoleste==="function")getJsonGoleste();if(same&&token&&r.status===401)'), "golită și la sosirea răspunsului scrierii (o citire pornită între ele putea aduce cifra veche - revizia 🔵6)");
});
await test("getJSON (revizia 🟡3): refuzul Pionex (HTTP 200 cu result:false) NU se ține minte - reîncercarea pleacă din nou, ca hotărârea serverului din v100.173", async () => {
  const L = lumeGet(); L.raspuns.corp = '{"result":false,"error":"Pionex","detail":"TOO_MANY_REQUESTS","retryAfter":60}';
  await L.ctx.getJSON("/api/market?type=pionex_klines"); await L.ctx.getJSON("/api/market?type=pionex_klines"); assert.equal(L.apeluri.length, 2);
  L.raspuns.corp = '{"result":true,"data":{"klines":[]}}'; await L.ctx.getJSON("/api/m2"); await L.ctx.getJSON("/api/m2"); assert.equal(L.apeluri.length, 3, "răspunsul bun se ține minte");
});
await test("getJSON (revizia 🟡2): intrările mai vechi de 3 s ies din plasă la fiecare intrare nouă - memoria nu crește toată ziua (lumânările de 1 min cer adrese noi la 2 min)", async () => {
  const L = lumeGet(); for (let i = 0; i < 100; i++) { await L.ctx.getJSON("/api/m1?endTime=" + i); L.trece(1000); }
  assert.ok(L.ctx.marime() <= 4, "în plasă: " + L.ctx.marime());
});

// ---- (1) pagina T212 ascunsă ----
function lumeT212(peT212) {
  const cod = taie(T212, "/* v100.318 (I-848): pagina T212 ascunsă", "function t212DecText(tk, c) {");
  const cereri = []; let randari = 0;
  const ctx = { Date, Promise, JSON, t212: {}, t212ConsKv: {}, getJSON: (u) => { cereri.push(u); return Promise.resolve({ cons: { nivel: "tine" }, decizii: [] }); }, t212Render: () => { randari++; },
    document: { getElementById: (id) => (id === "t212" ? { classList: { contains: (c) => c === "on" && peT212 } } : null) } };
  vm.createContext(ctx); vm.runInContext(cod + ";this.t212LaVedere=t212LaVedere;this.t212ConsKvPt=t212ConsKvPt", ctx);
  return { ctx, cereri, randari: () => randari };
}
await test("T212 ascunsă: istoria Consilierului pe rânduri NU se cere; la vedere se cere ca înainte (cons + decizie), o dată la 2 min", async () => {
  const A = lumeT212(false); assert.equal(A.ctx.t212LaVedere(), false); const c = A.ctx.t212ConsKvPt("AAPL_US_EQ"); assert.equal(A.cereri.length, 0); assert.equal(c.cons, null); assert.deepEqual([...c.decizii], []);
  const V = lumeT212(true); V.ctx.t212ConsKvPt("AAPL_US_EQ"); assert.equal(V.cereri.length, 2); assert.match(V.cereri[0], /action=cons&bot=t212-AAPL_US_EQ/); assert.match(V.cereri[1], /action=decizie&bot=t212-AAPL_US_EQ/);
  await asteapta(5); V.ctx.t212ConsKvPt("AAPL_US_EQ"); assert.equal(V.cereri.length, 2, "în 2 min nu se repetă");
});
await test("T212: când nu se știe dacă pagina e la vedere (fără document, fără panoul #t212, fără classList - DOM parțial) ⇒ ca înainte (la vedere); ascunsă DOAR când panoul există și n-are „on”", () => {
  const cod = taie(T212, "/* v100.318 (I-848): pagina T212 ascunsă", "function t212ConsKvPt(tk) {");
  const L = (document) => { const ctx = document === undefined ? {} : { document }; vm.createContext(ctx); vm.runInContext(cod + ";this.f=t212LaVedere", ctx); return ctx.f(); };
  assert.equal(L(undefined), true, "fără document"); assert.equal(L({}), true, "document fără getElementById"); assert.equal(L({ getElementById: () => null }), true, "fără panoul #t212");
  assert.equal(L({ getElementById: () => ({}) }), true, "panou fără classList"); assert.equal(L({ getElementById: () => { throw new Error("x"); } }), true, "eroare ⇒ ca înainte");
  assert.equal(L({ getElementById: () => ({ classList: { contains: () => false } }) }), false, "panoul există, fără „on” ⇒ ascunsă");
  assert.equal(L({ getElementById: () => ({ classList: { contains: (c) => c === "on" } }) }), true);
});
await test("T212 ascunsă: graficele nu se desenează (nici lumânările pe alte intervale), ideile nu se rejudecă; la deschidere se fac", () => {
  assert.match(taie(T212, "function t212GraficeDeseneaza(faraAducere) {", "\n  (t212.pozPregatite"), /\{\n  if \(!t212LaVedere\(\)\) return;   \/\* v100\.318/);
  const p = taie(T212, "async function t212Porneste(forta) {", "// v100.231: filtrul imediat");
  assert.ok(p.includes("if (!forta && t212.la && Date.now() - t212.la < 60000) { t212Render(); if (t212LaVedere()) t212IdeiRejudeca(); return; }"), "deschiderea în primul minut rejudecă ideile");
  assert.ok(p.includes("  if (t212LaVedere()) t212IdeiRejudeca();   /* v100.318"), "la capătul citirii, ideile doar cu pagina la vedere");
  assert.ok(!/\n  t212IdeiRejudeca\(\);\n/.test(p), "chemarea necondiționată a ieșit");
  assert.match(T212, /if \(t212\.ideiRe\) return;/, "rejudecarea rămâne o dată pe citire");
  assert.match(APP, /else if\(id==="t212"\)\{if\(typeof t212Porneste==="function"\)t212Porneste\(false\);/, "deschiderea paginii T212 pornește tot ca înainte");
});
await test("T212: semaforul pozițiilor (deci „N acțiuni de ieșit” din banda contului) își ia datele ca înainte - prețuri, plan, profil, știri, rezultate", () => {
  const p = taie(T212, "async function t212Porneste(forta) {", "// v100.231: filtrul imediat");
  for (const s of ['getJSON("/api/stiri?action=actiune&ticker="', "t212RezultatePt(tk)", 'getJSON("/api/istoric-bot?action=plan&bot="', 'getJSON("/api/t212?action=preturi&interval=1d&ticker="']) assert.ok(p.includes(s), "lipsește: " + s);
  assert.match(T212, /t212\.nrIesi = brute\.length && brute\.every/, "numărul de ieșit se socotește tot în t212Render, din date");
});

// ---- (3) I-853: mișcarea mouse-ului, o dată pe cadru ----
await test("I-853: zece mișcări de mouse într-un cadru ⇒ crucea se mută o dată, la ultima poziție; apăsarea și focusul rămân pe loc", () => {
  const leg = taie(APP, 'var zona=el.querySelector(".gbZona")', "function renderTabloDovada(){"); const LEG = leg.slice(0, leg.lastIndexOf("}"));
  assert.ok(LEG.includes("requestAnimationFrame"), "fără cadru, fiecare eveniment muta crucea");
  const nod = (n) => { const o = { n, style: { display: "none" }, attrs: {}, asc: {}, copii: {}, setAttribute(k, v) { o.attrs[k] = String(v); }, addEventListener(t, f) { (o.asc[t] = o.asc[t] || []).push(f); }, trimite(t, e) { (o.asc[t] || []).forEach((f) => f(e)); }, querySelector(s) { return o.copii[s] || null; }, getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600 }; }, offsetWidth: 100, offsetHeight: 50 }; return o; };
  const zona = nod("zona"), svg = nod("svg"), tip = nod("tip"), cr = nod("cr"), crY = nod("crY"), crP = nod("crP"), el = nod("el"); crP.copii = { text: nod("t"), rect: nod("r") };
  svg.copii = { ".gbCruce": cr, ".gbCruceY": crY, ".gbCrucePret": crP }; zona.copii = { svg, ".gbTip": tip }; el.copii = { ".gbZona": zona };
  let citiri = 0; const gsvg = svg.getBoundingClientRect; svg.getBoundingClientRect = () => { citiri++; return gsvg(); };
  const bare = Array.from({ length: 100 }, (_, i) => ({ t: i, o: 1, h: 1, l: 1, c: 1, v: 1, k: i })), d = { harta: { W: 1000, plotW: 948, sus: 0, mainH: 400, cw: 9.48, lo: 1, hi: 2, bare, grupuri: [], S: { rsi: [], e20: [], e50: [] } } };
  const cadre = []; const raf = (f) => { cadre.push(f); return cadre.length; };
  new Function("el", "d", "b", "GraficBot", "tbLaPret", "requestAnimationFrame", LEG)(el, d, {}, { pretLaY: (h, sy) => h.lo + (1 - sy / h.mainH) * (h.hi - h.lo), fmtP: (p) => p.toFixed(4) }, () => () => "", raf);
  for (let i = 0; i < 10; i++) zona.trimite("pointermove", { pointerType: "mouse", clientX: 100 + i * 30, clientY: 200 });
  assert.equal(citiri, 0, "nimic citit înainte de cadru"); assert.equal(cadre.length, 1, "un singur cadru cerut"); cadre.shift()();
  assert.equal(citiri, 1); assert.equal(cr.attrs.x1, String((Math.floor(370 / 9.48) * 9.48 + 9.48 / 2).toFixed(1)), "crucea la ULTIMA poziție (x 370)");
  zona.trimite("pointermove", { pointerType: "mouse", clientX: 500, clientY: 200 }); assert.equal(cadre.length, 1, "după cadru se poate cere altul");
  zona.trimite("pointerleave", {}); cadre.shift()(); assert.equal(cr.style.display, "none", "un cadru rămas după ieșirea mouse-ului nu mai aprinde crucea");
  zona.trimite("pointerdown", { pointerType: "touch", clientX: 300, clientY: 200, target: { closest: () => null } }); assert.equal(cr.style.display, "", "atingerea mută crucea pe loc");
});

// ---- (4) I-855: țintele de atins pe telefon ----
await test("I-855: fiecare bec al semaforului are o zonă de atins cât celula lui (dreptunghi transparent, la capătul grupului); pe telefon „detalii” are ≥ 40 px (butoanele Monte Carlo au deja 44)", () => {
  assert.ok(GB.includes("'<rect class=\"gbSemTinta\" x=\"' + f1(sx0 + 4 + i * CS) + '\" y=\"' + sy0 + '\" width=\"' + CS + '\" height=\"' + (HS + 8) + '\" fill=\"#000\" fill-opacity=\"0\"/></g>'"), "dreptunghiul de atins, ultimul în grup");
  assert.match(GB, /qS\.push\('<g class="gbSem" tabindex="0"'/, "începutul grupului rămâne cum îl citesc probele vechi");
  assert.ok(!/\.tbCcDet>summary\{[^}]*display:flex/.test(CSS), "revizia 🟡4: display:flex pe summary scoate triunghiul ▸ în Chromium");
  assert.ok(CSS.includes("@media (max-width:640px){\nhtml.pzDemo #tabloubot .tbCcDet>summary{min-height:40px;box-sizing:border-box;padding-top:10px;padding-bottom:10px}\nhtml.pzDemo #tabloubot button{min-height:40px}\nhtml.pzDemo #tabloubot .tbAntet .actionGhost,html.pzDemo #tabloubot .tbAntet .tbSimBtn,html.pzDemo #tabloubot .tbInterval .tbIntBtn{min-height:40px}\nhtml.pzDemo #tabloubot .tbProbFara>summary{min-height:40px;box-sizing:border-box;padding-top:10px;padding-bottom:10px}\n}"), "„detalii”, butoanele paginii (și cele cu formă din stratul v100.316) de 40 px pe telefon");
  assert.ok(CSS.includes(".tbMcBtn{min-height:44px;display:inline-flex;align-items:center}"), "butoanele Monte Carlo / citire au deja 44 px");
});

// ---- (5) rezumatele rândurilor ----
await test("rezumatul rândului: celulele de tabel și paragrafele se despart cu „ · ”, antetul tabelului și capul cartelei nu intră", () => {
  const i = APP.indexOf('var TB_RAND_KEY="tbRanduri";'), j = APP.indexOf("function tbComutaInd(k){"); const cod = APP.slice(i, j).replace(/if\(typeof window!=="undefined"\)window\.addEventListener\("DOMContentLoaded"[^\n]*/, "");
  const ctx = { localStorage: { getItem: () => null, setItem() {} }, document: { getElementById: () => null } }; vm.createContext(ctx); vm.runInContext(cod + ";this.R=tbRandRezumat", ctx);
  const t = (v) => ({ nodeType: 3, nodeValue: v, nextSibling: null }), e = (tag, copii = [], x = {}) => { const n = { nodeType: 1, tagName: tag, hidden: false, firstChild: null, nextSibling: null, className: "", ...x }; copii.forEach((c, k) => { if (k === 0) n.firstChild = c; else copii[k - 1].nextSibling = c; }); return n; };
  const card = e("DIV", [e("DIV", [e("B", [t("Dacă prețul ajunge la…")]), e("LABEL", [t("alt preț")]), e("INPUT")], { className: "tbBlocCap" }),
    e("TABLE", [e("THEAD", [e("TR", [e("TH", [t("Dacă prețul ajunge la")]), e("TH", [t("Poziția")])])]), e("TBODY", [e("TR", [e("TD", [t("0.3262")]), e("TD", [t("+5%")]), e("TD", [t("−11,9 USDT")])]), e("TR", [e("TD", [t("0.3100")]), e("TD", [t("marginea de sus")])])])])]);
  assert.equal(ctx.R(card, "Dacă prețul ajunge la…"), "0.3262 · +5% · −11,9 USDT · 0.3100 · marginea de sus");
  const bani = e("DIV", [e("DIV", [e("B", [t("Banii botului")]), e("SPAN", [t("USDT")])], { className: "tbBlocCap" }), e("DIV", [e("DIV", [e("SPAN", [t("Investit")]), e("B", [t("72,73 USDT")])]), e("DIV", [e("SPAN", [t("Realizat")]), e("B", [t("−0,1 USDT")])])])]);
  assert.equal(ctx.R(bani, "Banii botului"), "Investit 72,73 USDT · Realizat −0,1 USDT", "eticheta și cifra din același rând rămân împreună");
  assert.equal(ctx.R(e("SECTION", [e("P", [t("👉 Ce aș face eu: nimic")])]), "X"), "Ce aș face eu: nimic");
  const scen = e("DIV", [e("DIV", [e("SPAN", [t("Dacă prețul ajunge la")]), e("SPAN", [t("Poziția")])], { className: "tbScenCap" }), e("DIV", [e("B", [t("0.3341")]), e("SPAN", [t(" +5%")])], { className: "tbScenRand" })]);
  assert.equal(ctx.R(scen, "Dacă prețul ajunge la…"), "0.3341 +5%", "capul de coloane (div-uri, nu tabel) nu intră");
  assert.equal(ctx.R(e("SECTION", [e("DIV", [t("cele mai noi sus")], { className: "tbTodoCap" }), e("DIV", [t("Prețul a ieșit din grid")])]), "Ce ai de făcut acum"), "Prețul a ieșit din grid", "capul listei nu intră");
});

// ---- (6) I-854: „SOCOTESC” ținea 5–13 s la fiecare deschidere: fișa monedei își citea istoria pe 15 min pagină cu pagină (5–6 cereri în șir,
// cu pauză, ca Pionex să nu blocheze IP-ul); memoria ei (grLum15) trăia doar cât pagina. Acum se ține și pe dispozitiv ⇒ redeschiderea cere o pagină.
// Revizia 🟡5: NU în localStorage (cota de ~5 MB e comună cu notele din Jurnal, care s-ar pierde tăcut) ⇒ magazia „meta” a bazei IndexedDB existente.
function lumeFisa(disc, cereri, ACUM, toate, strica) {
  const cod = taie(APP, "/* v100.318 (I-854): istoria pe 15 min", "async function grAduRest(");
  const imbina = (vechi, noi, n) => { const m = {}; [vechi, noi].forEach((a) => (a || []).forEach((r) => { m[Number(r.time)] = r; })); let l = Object.keys(m).map(Number).sort((a, b) => a - b).map((k) => m[k]); if (n > 0 && l.length > n) l = l.slice(l.length - n); return l; };
  const ctx = { Date: { now: () => ACUM }, JSON, Math, Number, Array, Object, Promise, Error, String, localStorage: { getItem() { throw new Error("localStorage nu se mai folosește"); }, setItem() { throw new Error("localStorage nu se mai folosește"); } },
    localDbMetaGet: async (k) => (disc.has(k) ? JSON.parse(JSON.stringify(disc.get(k))) : undefined),
    localDbMetaSet: async (k, v) => { if (strica && strica(k)) return false; if (v === null) disc.delete(k); else disc.set(k, JSON.parse(JSON.stringify(v))); return true; },
    getJSON: async (u) => { cereri.push(u); const m = /endTime=(\d+)/.exec(u), end = m ? +m[1] : Infinity; return { data: { klines: toate.filter((b) => b.time <= end).slice(-500) } }; },
    grLum15: {}, grTimp15: (r) => { const t = Number(Array.isArray(r) ? r[0] : r && r.time); return Number.isFinite(t) ? t : null; }, grRanduri: (k) => (k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null),
    grBareTbMc: () => null, grPauza: () => Promise.resolve(), GridCalcul: { imbinaRanduri: imbina, bare: (r) => r } };
  vm.createContext(ctx); vm.runInContext(cod + ";this.grAdu15=grAdu15;this.disc=GR15_DISC", ctx); return ctx;
}
await test("I-854: prima deschidere citește istoria pe pagini (aici 3); după o reîncărcare a paginii, redeschiderea cere UNA și dă aceleași bare; nimic în localStorage", async () => {
  const ACUM = Date.UTC(2026, 10, 11, 6, 0), Q = 900000, disc = new Map(), cereri = [];
  const toate = Array.from({ length: 1200 }, (_, i) => ({ time: ACUM - (1199 - i) * Q, open: "1", high: "2", low: "0.5", close: String(1 + i / 1000), volume: "10" }));
  const A = lumeFisa(disc, cereri, ACUM, toate); const r1 = await A.grAdu15("STX_USDT_PERP", "/api/market?type=pionex_klines&symbol=STX_USDT_PERP", () => {}); await asteapta(5);
  assert.equal(cereri.length, 3); assert.equal(r1.r15.length, 1200); assert.ok(disc.has(A.disc + "STX_USDT_PERP"), "istoria e în baza de pe dispozitiv");
  cereri.length = 0; const B = lumeFisa(disc, cereri, ACUM, toate);   // pagina reîncărcată: memoria goală, baza plină
  const r2 = await B.grAdu15("STX_USDT_PERP", "/api/market?type=pionex_klines&symbol=STX_USDT_PERP", () => {});
  assert.equal(cereri.length, 1, "o singură pagină"); assert.doesNotMatch(cereri[0], /endTime/); assert.equal(r2.r15.length, 1200);
  assert.deepEqual(JSON.parse(JSON.stringify(r2.r15)), JSON.parse(JSON.stringify(r1.r15)), "aceleași bare, aceleași câmpuri"); assert.deepEqual(JSON.parse(JSON.stringify(r2.istoric15)), JSON.parse(JSON.stringify(r1.istoric15)), "aceeași vârstă a istoriei (aici 12,5 zile ⇒ „nou”)");
  assert.ok(!/localStorage/.test(taie(APP, "/* v100.318 (I-854): istoria pe 15 min", "async function grAduRest(").replace(/\/\*[^]*?\*\//g, "")), "codul nu atinge localStorage");
});
await test("I-854: istoria mai veche de ~5 zile nu se mai leagă ⇒ citire întreagă, ca înainte; cel mult 3 monede ținute; baza indisponibilă nu strică fișa", async () => {
  const ACUM = Date.UTC(2026, 10, 11, 6, 0), Q = 900000, toate = Array.from({ length: 700 }, (_, i) => ({ time: ACUM - (699 - i) * Q, open: "1", high: "1", low: "1", close: "1", volume: "1" }));
  const disc = new Map(), cereri = []; const A = lumeFisa(disc, cereri, ACUM - 6 * 86400000, toate.map((b) => ({ ...b, time: b.time - 6 * 86400000 })));
  await A.grAdu15("STX_USDT_PERP", "/b", () => {}); await asteapta(5); cereri.length = 0;
  const B = lumeFisa(disc, cereri, ACUM, toate); await B.grAdu15("STX_USDT_PERP", "/b", () => {}); await asteapta(5); assert.equal(cereri.length, 2, "6 zile ⇒ toate paginile");
  for (const s of ["A_USDT_PERP", "B_USDT_PERP", "C_USDT_PERP"]) { await lumeFisa(disc, [], ACUM, toate).grAdu15(s, "/b", () => {}); await asteapta(5); }
  assert.equal([...disc.keys()].filter((k) => k.startsWith(B.disc) && !k.endsWith("lista")).length, 3, "cel mult 3 monede"); assert.ok(!disc.has(B.disc + "STX_USDT_PERP"), "cea mai veche a ieșit");
  const C = lumeFisa(new Map(), [], ACUM, toate, () => true); const r = await C.grAdu15("STX_USDT_PERP", "/b", () => {}); await asteapta(5); assert.equal(r.r15.length, 700, "fără bază pe dispozitiv fișa merge ca înainte");
});
await test("lanțul `npm test` încape în cmd.exe: pașii vechi (fără probă care să-i citească) stau în sub-lanțuri test:lant-NN, fiecare bucată sub 6.000 de caractere; desfăcut = aceiași pași, o dată fiecare", () => {
  // 11.11.2026: lanțul ajunsese la 8.168 de caractere ⇒ cmd.exe (limita 8.191, cu ce adaugă npm) a dat „The command line is too long.”
  // și livrarea v100.318 n-a publicat nimic. NU .npmrc cu script-shell=bash: îl citește și `npx`, deci ar fi schimbat felul în care
  // pornește Radarul (npx wrangler dev în PORNESTE-CRYPTO-RADAR.bat și în scripts/vps/porneste-radar.ps1).
  const P = JSON.parse(citeste("package.json"));
  assert.ok(P.scripts.test.length < 6000, "test are " + P.scripts.test.length + " de caractere");
  assert.ok(!fs.existsSync(path.join(RAD, ".npmrc")) || !/script-shell/.test(citeste(".npmrc")), "script-shell în .npmrc ar trece și npx pe alt shell");
  const subl = Object.keys(P.scripts).filter((k) => /^test:lant-\d\d$/.test(k));
  assert.ok(subl.length >= 1, "niciun sub-lanț");
  const desfa = (s) => s.split(" && ").flatMap((p) => { const m = /^npm run (test:lant-\d\d)$/.exec(p); return m ? (assert.ok(P.scripts[m[1]], "lipsește " + m[1]), P.scripts[m[1]].split(" && ")) : [p]; });
  const tot = desfa(P.scripts.test);
  for (const k of subl) { assert.ok(P.scripts[k].length < 6000, k + " are " + P.scripts[k].length); assert.equal(tot.filter((p) => p === "npm run " + k).length, 0); assert.equal((P.scripts.test.match(new RegExp("npm run " + k + "( |$)", "g")) || []).length, 1, k + " o dată în test"); }
  assert.ok(tot.length >= 340, "pași desfăcuți: " + tot.length);
  for (const p of tot) { const m = /^npm run (test:[\w-]+)$/.exec(p); if (m) assert.ok(P.scripts[m[1]], "pas fără script: " + p); }
  assert.equal(new Set(tot).size, tot.length, "un pas apare de două ori");
  for (const n of ["test:syntax", "test:garzi", "test:security", "test:server", "test:v100", "test:v100216", "test:scorsezon", "test:v100318"]) assert.ok(tot.includes("npm run " + n), "lipsește " + n);
});

await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json; coada foii neatinsă", () => {
  const B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json")), V = "3(?:1[89]|[2-9]\\d)";
  assert.equal((HTML.match(new RegExp("v100\\." + V, "g")) || []).length, 4); assert.equal((HTML.match(/v100\.317/g) || []).length, 0);
  assert.match(citeste("public", "sw.js"), new RegExp('const CACHE="crypto-radar-v100-' + V + '";'));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + V + '"'));
  assert.match(B.version, new RegExp("^v100\\." + V + "$")); assert.ok(B.features.optim318); assert.match(P.version, new RegExp("^100\\." + V + "\\.")); assert.ok(P.scripts.test.includes("npm run test:v100318"));
  assert.equal(pandaInainteaCozii(CSS), "");
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
