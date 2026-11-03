// Proba v100.295 (el, 02.11: „da scoate-le și de pe Acasă, Tablou și Discord” - listele fără avantaj dovedit scoase de pe Sugestii pe 01.11).
// Găsit în cod și în jurnalele colectorului (nu presupus):
//   - Piața azi (fosta Acasă): „Ce aș cumpăra azi” arăta ideile T212 („Idei de cumpărare”), monedele pe revenire și monedele pentru short;
//     „Idei de azi” arăta „Acțiuni pe trend (N din M trec de poartă)” = tot ideile T212;
//   - Tabloul botului: sub „Pe ce aș porni un bot acum”, listele „↩️ Pe revenire (bot long)” și „📉 Pentru short” (tbSugestiiHtml);
//   - Discord: singurul mesaj cu o listă scoasă era „Rezumatul de dimineață” („💡 Idei azi: <ideile T212> · boți: …”).
// Rămân: „Pe ce aș porni un bot”, „Pe revenire” (acțiuni US), „Monede liniștite pentru un bot grid”, butonul „Toate sugestiile”;
// pagina Trading 212 își păstrează ideile (decizia lui din 01.11); jurnalul verdictelor le măsoară în continuare.
// Ce probează:
//   1. acasaCumpar: două coloane - „Boți” și „Acțiuni pe revenire” - fără ideile T212, fără monedele pe revenire / short, fără nota lor;
//      golurile au stare; butonul „Toate sugestiile” rămâne; CSS-ul cartelei pe 2 coloane;
//   2. acIdeiHtml (scoasă din desenul paginii ca să poată fi probată): „Idei de azi” fără „Acțiuni pe trend”, cu monedele liniștite;
//   3. Tabloul: caseta „Pe ce aș porni un bot acum” fără listele scoase; funcțiile lor nu mai există; acasaCumpar2Corp (nechemată) scoasă;
//   4. Consilier.rezumatDimineata (Discord): fără ideile T212; „💡 Pe ce aș porni un bot: …” doar cu boții; colectorul nu mai adună out.idei;
//   5. neatinse: pagina T212 cu ideile ei; calculul listelor în colector (istoricul);
//   6. versiunile v100.295, colectorul v101.161; v100.294 pe „≥”.
//   node scripts/proba-v100295.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.295 · listele scoase și de pe Piața azi, din Tablou și din rezumatul de pe Discord · proba\n");

// ---------------------------------------------------------------- datele (forma rutelor); simbolurile ideilor T212 sunt unice (ZZT1, ZZT2) ca să le pot căuta
const REV = (o) => Object.assign({ cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 5, revine: true }, o || {});
const M = (s, scor, o) => Object.assign({ simbol: s + "_USDT_PERP", volum: 10, stare: "candidat", dir: "long", tarie: "mediu", scor, latime: 0.1, profitGrila: 0.0026, traversariZi: 12, revenire: REV({ revine: false }) }, o || {});
const CL = { la: 5, monede: [M("HYPE", 9), M("XMR", 8), M("LTC", 7), M("AKE", 6, { stare: "evita", revenire: REV() }), M("QQQX", 5, { dir: "short", revenire: REV() })] };
const IDEI = { idei: { zi: "2026-11-02", judecate: 203, trecute: 2, actiuni: [{ simbol: "ZZT1" }, { simbol: "ZZT2" }], reveniri: [{ simbol: "CRBP" }, { simbol: "CWD" }], dovadaReveniri: { eticheta: "cam la fel" } } };
const SUG = { sugestii: { dovada: { revenire: { piata: { eticheta: "cam la fel" } }, short: { piata: { eticheta: "mai slab" } } } } };
// Idei fals: listele scoase întorc ceva (ca să se vadă dacă le mai cheamă cineva)
const ID = { reveniriBoti: () => [{ moneda: "MREV", simbol: "MREV_USDT_PERP" }], shortBoti: () => [{ moneda: "MSHO", simbol: "MSHO_USDT_PERP" }], ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 3) };
function acasa() {
  const ctx = { escapeHtml: esc, Idei: ID }; vm.createContext(ctx);
  vm.runInContext(["acClasamentSumar", "acSym", "acasaCumpar", "acasaCumpar2Parti", "acIdeiHtml"].map((f) => fnDin("acasa-ecran.js", f)).join("\n") + "\n;this.f=acasaCumpar;this.p=acasaCumpar2Parti;this.idei=acIdeiHtml;this.sumar=acClasamentSumar;", ctx);
  return ctx;
}

// ================================================================ 1. „Ce aș cumpăra azi”
await test("1. „Ce aș cumpăra azi”: două coloane (Boți, Acțiuni pe revenire), fără ideile T212, fără monedele pe revenire / short și fără nota lor; golurile au stare; „Toate sugestiile” rămâne; CSS pe 2 coloane", () => {
  const c = acasa(), h = c.f({ idei: IDEI, clasament: CL, sugestii: SUG });
  const col = h.split('<div class="acCumparCol">');
  assert.equal(col.length - 1, 2, "două coloane: " + text(h));
  assert.ok(text(col[1]).startsWith("Boți") && col[1].includes("acasaMergiLa('tabloubot','tbIdei')") && /Pe ce aș porni un bot/.test(col[1]) && /HYPE, XMR sau LTC/.test(text(col[1])), text(col[1]));
  assert.ok(text(col[2]).startsWith("Acțiuni pe revenire") && col[2].includes("<b>CRBP, CWD</b>") && col[2].includes("(cam la fel)") && col[2].includes("acasaMergiLa('t212','t212Idei','revenire')"), text(col[2]));
  for (const rau of ["ZZT1", "ZZT2", "Idei de cumpărare", "trec de poartă", "monedele", "MREV", "MSHO", "short", "și pe revenire, și la short", "Revenire și short"]) assert.ok(!h.includes(rau), "nu mai apare: " + rau + " · " + text(h));
  assert.match(h, /💡 <b>Ce aș cumpăra azi<\/b>/); assert.match(h, /navTo\(\\?'sugestii\\?',true\)">💡 Toate sugestiile: boți, acțiuni US și EU<\/button>/);
  const g = c.f({ idei: null, clasament: CL, sugestii: null }), g2 = c.f({ idei: { idei: Object.assign({}, IDEI.idei, { reveniri: [] }) }, clasament: CL, sugestii: null });
  assert.match(text(g.split('<div class="acCumparCol">')[2]), /aștept lista/, "ideile încă nu s-au încărcat: stare, nu gol");
  assert.doesNotMatch(text(g), /8:00/, "cât se încarcă pagina nu spun că tura n-a rulat (poza din 02.11 seara: tura rulase, lista era CRBP, CWD, TE)");
  const g3 = c.f({ idei: { idei: { zi: "2026-11-02", judecate: 203, trecute: 0, actiuni: [] } }, clasament: CL, sugestii: null });
  assert.match(text(g3.split('<div class="acCumparCol">')[2]), /lista apare la tura de la 8:00/, "ideile de la colectorul vechi, fără câmpul reveniri: când apare");
  assert.match(text(g2.split('<div class="acCumparCol">')[2]), /nimic azi/, "lista goală: „nimic azi”");
  assert.deepEqual(JSON.parse(JSON.stringify(c.p({ idei: IDEI, clasament: CL, sugestii: SUG }))), { actiuni: "CRBP, CWD", etA: " (cam la fel)" }, "partea a doua: doar acțiunile pe revenire");
  const css = citeste("public", "app.css");
  assert.match(css, /#dash \.acCumparCol3\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px 18px\}/);
  assert.doesNotMatch(css, /#dash \.acCumparCol3\{display:grid;grid-template-columns:repeat\(3,/);
});

// ================================================================ 2. „Idei de azi”
await test("2. „Idei de azi”: fără „Acțiuni pe trend (… trec de poartă)” (ideile T212); rămân monedele liniștite pentru un bot grid și butonul Grid; desenul paginii o folosește", () => {
  const c = acasa(), cl = c.sumar(CL), h = c.idei({ idei: IDEI, clasament: CL }, cl);
  assert.match(h, /<h4>Idei de azi<\/h4>/); assert.match(h, /Monede liniștite pentru un bot grid:/); assert.match(text(h), /HYPE XMR LTC/); assert.match(h, /navTo\(\\?'gridset\\?',true\)">Deschide Grid<\/button>/);
  for (const rau of ["Acțiuni pe trend", "trec de poartă", "ZZT1", "ZZT2", "nicio acțiune nu trece"]) assert.ok(!h.includes(rau), "nu mai apare: " + rau);
  assert.match(text(c.idei({ idei: IDEI, clasament: null }, null)), /Aștept clasamentul…/, "fără clasament: stare");
  const A = lib("acasa-ecran.js");
  assert.match(A, /\$\("acIdei"\)\.innerHTML = acIdeiHtml\(d, cl\);/, "pagina desenează cartela prin funcția probată");
  assert.doesNotMatch(A, /Acțiuni pe trend/);
});

// ================================================================ 3. Tabloul botului + funcțiile moarte
await test("3. Tabloul: caseta „Pe ce aș porni un bot acum” fără „Pe revenire (bot long)” / „Pentru short”; tbSugestiiHtml / tbSugestiiCorp / acasaCumpar2Corp nu mai există; restul casetei rămâne", () => {
  const T = lib("t212-ecran.js"), A = lib("acasa-ecran.js");
  assert.doesNotMatch(T, /tbSugestii(Html|Corp)/, "nicio urmă a listelor scoase în Tablou");
  assert.doesNotMatch(T, /Pe revenire \(bot long\)|📉 Pentru short/);
  assert.match(T, /<h4>💡 Pe ce aș porni un bot acum<\/h4>/); assert.match(T, /Fișa îți dă setările și proba pe istoricul monedei\.<\/p>';/, "nota casetei rămâne, fără nimic lipit după ea");
  assert.match(T, /function gridDeschideMonedaDir\(m, dir\)/, "fișa cu direcția rămâne (o folosesc Sugestiile)");
  assert.doesNotMatch(A, /function acasaCumpar2Corp\(/);
  assert.doesNotMatch(A, /reveniriBoti|shortBoti/, "Piața azi nu mai cheamă listele de monede scoase");
});

// ================================================================ 4. Discord: rezumatul de dimineață
await test("4. Rezumatul de dimineață (Discord): fără ideile T212; „💡 Pe ce aș porni un bot: …” doar cu boții; fără boți, fără rândul 💡; colectorul nu mai adună out.idei", () => {
  const ctx = { console, Date, Math, JSON, Object, Array, Number, String, isFinite, Intl, TextRo: globalThis.TextRo }; vm.createContext(ctx);
  vm.runInContext(lib("consilier.js") + "\n;this.C = Consilier;", ctx);
  const linii = (o) => ctx.C.rezumatDimineata(Object.assign({ piata: { text: "liniștită" }, deIesit: [], rezultate: [], plafon: [], boti: [], stiri: [] }, o)).linii;
  const a = linii({ idei: ["ZZT1", "ZZT2"], ideiBoti: ["HYPE", "XMR"] });
  assert.ok(a.includes("💡 Pe ce aș porni un bot: HYPE, XMR"), JSON.stringify(a));
  assert.ok(!a.some((l) => /ZZT1|ZZT2|Idei azi/.test(l)), "fără ideile T212: " + JSON.stringify(a));
  const b = linii({ idei: ["ZZT1"], ideiBoti: [] });
  assert.ok(!b.some((l) => /^💡/.test(l)), "fără boți: niciun rând 💡 (ideile T212 nu-l mai aprind) " + JSON.stringify(b));
  const C = citeste("scripts", "colector.mjs");
  assert.doesNotMatch(C, /out\.idei\s*=/, "colectorul nu mai adună ideile T212 pentru dimineață");
  assert.match(C, /out\.reveniriN = /, "acțiunile pe revenire rămân în titlul dimineții"); assert.match(C, /out\.ideiBoti = Idei\.ideiBoti\(/);
});

// ================================================================ 5. neatinse
await test("5. Neatinse: pagina Trading 212 își păstrează ideile (decizia lui din 01.11); colectorul calculează în continuare listele (istoricul)", () => {
  assert.match(citeste("public", "index.html"), /id="t212Idei" aria-label="Idei de cumpărare"/);
  assert.match(lib("t212-ecran.js"), /function t212IdeiRender\(/);
  assert.match(citeste("scripts", "lib", "tura-sugestii.mjs"), /const rev = d\.Idei\.reveniriBoti\(cl, \[\], 5\), sh = d\.Idei\.shortBoti\(cl, \[\], 5\)/);
});

// ================================================================ 7. ce a rămas fără rost după scoatere (găsit la reluare, 02.11 seara)
await test("7. Fără cereri și CSS rămase fără rost: Piața azi și Tabloul nu mai cer /api/istoric-bot?action=sugestii (nimic nu le mai citea); CSS-ul listelor scoase (.tbSugestii, .acCumpar2) scos", () => {
  const A = lib("acasa-ecran.js"), T = lib("t212-ecran.js"), css = citeste("public", "app.css");
  assert.doesNotMatch(A, /pas\("sugestii"/, "Piața azi nu mai cere sugestiile"); assert.doesNotMatch(A, /sugestiiErr/);
  assert.doesNotMatch(T, /contTot\.sugestii|sugestiiLa|sugestii: null/, "Tabloul nu mai cere sugestiile");
  assert.match(T, /var contTot = \{ boti: null, botiLa: 0, inLucru: false, inchise: null, stiriCrypto: \{\}, clasament: null, clasamentLa: 0, conturi: null, conturiLa: 0, salt: null, saltLa: 0 \};/);
  assert.doesNotMatch(css, /\.tbSugestii|\.acCumpar2/, "CSS-ul listelor scoase");
  assert.match(css, /#tabloubot \.tbTodoRand p\.tbWarn\{color:var\(--warn\)\}/, "avertismentul rândurilor Tabloului rămâne (îl folosesc și alte rânduri)");
  assert.match(lib("sugestii-ecran.js"), /istoric-bot\?action=sugestii/, "pagina Sugestii își cere în continuare datele");
});

// ================================================================ 6. versiunile
await test("6. versiunile v100.295 sau mai noi (aplicația, BUILD_INFO, pagina, cache-ul, package.json, lanțul), colectorul v101.161; v100.294 pe „≥”", () => {
  assert.ok(Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]) >= 295, "v100.295 sau mai nouă");
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(Number(B.version.match(/v100\.(\d+)/)[1]) >= 295); assert.ok(B.features.listeScoase295, "cheia v100.295 rămâne"); assert.ok(B.features.sugestii294, "cheia v100.294 rămâne");
  const H = citeste("public", "index.html"); assert.ok(Number(H.match(/id="healthAppVersion">v100\.(\d+)</)[1]) >= 295);
  assert.ok(Number(citeste("public", "sw.js").match(/crypto-radar-v100-(\d+)/)[1]) >= 295);
  const pk = JSON.parse(citeste("package.json")); assert.ok(Number(pk.version.split(".")[1]) >= 295); assert.equal(pk.scripts["test:v100295"], "node scripts/proba-v100295.mjs"); assert.match(pk.scripts.test, /npm run test:v100294 && npm run test:v100295( |$)/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(16[1-9]|[2-9]\d\d)"/);
  assert.doesNotMatch(citeste("scripts", "proba-v100294.mjs"), /VERSIUNE = "v100\\\.294"\/\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
