// Proba v100.85 (ecranele) - reveniri + short: Tabloul (cele două liste, „Fișa (long/short)”, istoricul pe față, urmărirea, stările goale),
// Trading 212 (tabelul „Pe revenire” cu „Biletul”), Acasă (al doilea rând din „Ce aș cumpăra azi”), scripturile încărcate, garda STRICTĂ.
//   node scripts/proba-v10085-ecran.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import { situatii, verifica, STRICT } from "./garda-texte.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
// funcția de nivel 1 din fișier, până la următoarea (comentariile dintre ele se iau și ele - apelul se pune după "\n")
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 (ecranele) · Tabloul, Trading 212, Acasă, garda");

const CL = { la: 5, monede: [
  { simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 9, revenire: { cadere: 0.3213, deLaMin: 0.1102, zileDeLaMin: 4.2, revine: true } },
  { simbol: "DDD_USDT_PERP", volum: 50, stare: "candidat", dir: "short", tarie: "puternic", scor: 7, latime: 0.12, profitGrila: 0.0026, traversariZi: 21, revenire: null } ] };
const SLAB = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false };
const SG = { sugestii: { la: 5, zi: "2026-10-03", dovada: { revenire: { piata: SLAB, boti: { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } } },
  short: { piata: { ...SLAB, pePlus: 0.55, medie: -0.003, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel" }, boti: { n: 83, pePlus: 0.49, mediana: -0.15, reper: { n: 374, pePlus: 0.56, mediana: 1.3 } } } },
  urmarire: { revenire: { n: 0, pePlus: 0, medie: null, text: "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită." }, short: null } }, istoric: [] };
// v100.295 (el, 02.11: „da scoate-le și de pe Tablou”): listele „↩️ Pe revenire (bot long)” / „📉 Pentru short” scoase (fără avantaj dovedit, scoase de pe Sugestii pe 01.11)
await test("(7) v100.295: Tabloul nu mai are „↩️ Pe revenire (bot long)” / „📉 Pentru short”; tbSugestiiHtml / tbSugestiiCorp nu mai există", () => {
  assert.doesNotMatch(lib("t212-ecran.js"), /function tbSugestii(Html|Corp)\(|Pe revenire \(bot long\)|📉 Pentru short/);
});
await test("(7) revizia (I2): „Fișa (long/short)” alege direcția DOAR pentru moneda ei, cu un singur calcul; la altă monedă revine cea de dinainte (și cea aleasă de mână)", () => {
  const apeluri = [], butoane = {}, ctx = { grStare: { dir: null }, gridDeschideMoneda: (m) => apeluri.push(["fisa", m, ctx.grStare.dir]), gridDirectie: (d) => apeluri.push(["dir", d]),
    $: (id) => (butoane[id] = butoane[id] || { setAttribute: (k, v) => { butoane[id][k] = v; } }) };
  vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "gridDeschideMonedaDir") + "\n" + fnApp("gridDirTemporara") + "\n" + fnApp("gridDirButoane") + "\n;this.f=gridDeschideMonedaDir;this.t=gridDirTemporara;", ctx);
  const temp = () => JSON.parse(JSON.stringify(ctx.grStare.dirTemp === undefined ? null : ctx.grStare.dirTemp));
  ctx.f("AAA", "short");
  assert.deepEqual(JSON.parse(JSON.stringify(apeluri)), [["fisa", "AAA", "short"]], "o singură deschidere, cu direcția pusă ÎNAINTE (fără gridDirectie, care recalcula)");
  assert.deepEqual(temp(), { simbol: "AAA", inainte: null }); assert.equal(butoane.grDshort["aria-pressed"], "true"); assert.equal(butoane.grDauto["aria-pressed"], "false");
  ctx.t("AAA_USDT_PERP"); assert.equal(ctx.grStare.dir, "short", "aceeași monedă - rămâne");
  ctx.f("CCC", "long"); assert.deepEqual(temp(), { simbol: "CCC", inainte: null }, "a doua fișă la rând ține minte direcția de dinaintea primei");
  ctx.t("AAAB_USDT_PERP"); assert.equal(ctx.grStare.dir, null, "altă monedă - revine cum era"); assert.equal(temp(), null); assert.equal(butoane.grDauto["aria-pressed"], "true");
  ctx.grStare.dir = "long"; ctx.f("EEE", "short"); ctx.t("FFF_USDT_PERP"); assert.equal(ctx.grStare.dir, "long", "direcția aleasă de mână revine");
  ctx.f("BBB", "neutru"); assert.equal(ctx.grStare.dir, "long"); assert.equal(temp(), null, "altă direcție decât long/short - doar fișa");
  assert.ok(!apeluri.some((x) => x[0] === "dir"), "gridDirectie nu se mai cheamă");
  assert.match(fnApp("gridCalculeaza"), /var simbol=grSimbol\(\$\("grMoneda"\)&&\$\("grMoneda"\)\.value\),[^\n]*\n  gridDirTemporara\(simbol\);/);
  assert.match(fnApp("gridDirectie"), /^function gridDirectie\(d\)\{grStare\.dirTemp=null;/);
});
await test("(7) v100.295: sub nota listei de candidați nu mai e lipit nimic; Tabloul nu mai cere sugestiile (nimic nu le mai citește)", () => {
  assert.match(fnDin("t212-ecran.js", "tbIdeiRender"), /proba pe istoricul monedei\.<\/p>'; if \(box\._contH !== hI\)/);
  assert.doesNotMatch(lib("t212-ecran.js"), /contTot\.sugestii|action=sugestii/);
});

function t212Rev(id, cont) {
  const ctx = { Reveniri: R, escapeHtml: esc, TextRo: globalThis.TextRo, t212Usd: (v) => "$" + v, t212Lei: (v) => v + " lei", ActiuniSemnale: AS, t212Fx: () => 0.22, t212Suma: (v) => Math.round(v) + " lei", t212DejaLei: () => 0, t212: { cont: cont ? { cash: { total: cont } } : null } }; vm.createContext(ctx);
  // v100.91: + t212Bucati (bucățile, întregi sub 10 $) - fără el t212ReveniriCorp aruncă, iar try/catch-ul dă ""
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "t212Bucati") + "\n" + fnDin("t212-ecran.js", "t212PctRisc") + "\n" + fnDin("t212-ecran.js", "t212MarimeCalc") + "\n" + fnDin("t212-ecran.js", "t212RaportCont") + "\n" + fnDin("t212-ecran.js", "t212CitireVeche") + "\n" + fnDin("t212-ecran.js", "t212TextFaraSuma") + "\n" + fnDin("t212-ecran.js", "t212RevRand") + "\n" + fnDin("t212-ecran.js", "t212RevFrana") + "\n" + fnDin("t212-ecran.js", "t212ReveniriHtml") + "\n" + fnDin("t212-ecran.js", "t212ReveniriCorp") + "\n;this.f=t212ReveniriHtml;", ctx);
  return ctx.f(id);
}
const BINE = { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false };
const RV = { ticker: "INTC_US_EQ", simbol: "INTC", pret: 72, cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, stop: 64.22, tinta: 98.45, istoric: { n: 33, pePlus: 24, total: 3401 } };
await test("(8) Trading 212: „↩️ Pe revenire” - istoricul pe față (+ supraviețuitorii), tabelul cu căderea, minimul, stopul, ținta, istoricul lui și CÂT CUMPERI (revizia I1: 1% din cont pe stopul de sub minim, fără „Biletul”); urmărirea", () => {
  const h = t212Rev({ reveniri: [RV], dovadaReveniri: BINE, urmarireReveniri: { n: 2, text: "Din 2 sugestii de cel puțin 14 zile: 1 pe plus, +0,5% în medie de la prețul sugestiei, după comision (puține — mai așteaptă)." } }, 50000), t = text(h);
  assert.ok(t.includes("↩️ Pe revenire") && t.includes(R.textDovada(BINE, "actiuni")) && t.includes(R.TEXT_SUPRAVIETUITORI), t);
  assert.match(h, /<th>Acțiune<\/th><th>La idee<\/th><th>Căderea<\/th><th>De la minim<\/th><th>Stop<\/th><th>Țintă<\/th><th>Istoricul tău<\/th><th>Cât cumperi · la prețul ideii<\/th>/);   /* v100.200: regula Porții (t212MarimeCalc), fără regim = 1 % */
  assert.ok(t.includes("INTC $72 −27% de la maximul pe 60 de zile +11% minimul acum 19 zile de bursă $64.22 sub minim $98.45 maximul 33 de trade-uri, 24 pe plus, 3401 lei"), t);
  assert.ok(t.includes("N-aș da o sumă: n-am o reconciliere pe tot contul."), t);
  assert.ok(!t.includes(" buc ≈ "), t);
  assert.ok(!h.includes("t212BiletPentru") && !t.includes("Biletul ") , "fără „Biletul” - poarta ideilor (trend în sus) i-ar spune NU unei reveniri");
  assert.ok(t.includes("Fără „Biletul”: poarta lui cere trend în sus, deci la o revenire ar spune NU. Nu tipăresc bucăți sau lei."), t);
  assert.ok(t.includes("📏 Din 2 sugestii de cel puțin 14 zile"));
  const f = text(t212Rev({ reveniri: [RV], dovadaReveniri: BINE }));
  assert.ok(f.includes("— citește întâi contul") && !f.includes(" buc ≈ "), "fără cont - nicio mărime inventată: " + f);
});
await test("(8) revizia (I7): înainte de prima tură cu reveniri (ideile de azi făcute de colectorul vechi, fără câmpul `reveniri`) ⇒ „apare la următoarea tură”, nu „Azi nicio acțiune …”", () => {
  const t = text(t212Rev({ actiuni: [], zi: "2026-10-03" }));
  assert.ok(t.includes("Lista apare la următoarea tură a ideilor, de la 8:00.") && !t.includes("Azi nicio acțiune nu e pe revenire."), t);
});
await test("(8) Trading 212: fără acțiuni pe revenire ⇒ „Azi nicio acțiune nu e pe revenire.”; fără istoric ⇒ fraza „se socotește”, fără supraviețuitori; fără idei ⇒ nimic", () => {
  const t = text(t212Rev({ reveniri: [], dovadaReveniri: null })); assert.ok(t.includes("Azi nicio acțiune nu e pe revenire.") && t.includes("Istoricul se socotește azi de la 8:00.") && !t.includes("supraviețuitori") && !t.includes(R.TEXT_SUPRAVIETUITORI), t);
  assert.equal(t212Rev(null), ""); assert.equal(t212Rev({ get reveniri() { throw new Error("x"); } }), "", "o eroare în date nu strică panoul ideilor");
  assert.match(fnDin("t212-ecran.js", "t212IdeiRender"), /tabel\(rest\) \+ '<\/details>';\r?\n  var fRev = t212ReveniriHtml\(id\)/);   /* v100.92 (I-520): revenirea e fila ei */
});
function acasa2(d) {
  const ctx = { escapeHtml: esc, Idei: ID }; vm.createContext(ctx);
  vm.runInContext(fnDin("acasa-ecran.js", "acClasamentSumar") + "\n" + fnDin("acasa-ecran.js", "acSym") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2Parti") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar") + "\n;this.f=acasaCumpar;", ctx);   /* v100.295: acasaCumpar2Corp (nechemat) scos */
  return ctx.f(d);
}
await test("(8) Acasă: coloana „Acțiuni pe revenire” din „Ce aș cumpăra azi” - primele nume cu eticheta istoricului; lista goală ⇒ „nimic azi”; fără tura de la 8:00 ⇒ stare (v100.295: fără monedele pe revenire / short)", () => {
  const d = { idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 23, actiuni: [{ simbol: "SNDK" }], reveniri: [RV, { ...RV, simbol: "MU" }], dovadaReveniri: BINE } }, clasament: CL };
  const t = text(acasa2(d));
  assert.ok(t.includes("Acțiuni pe revenire ↩️ acțiunile INTC, MU (mai bine)"), t);
  assert.ok(!/SNDK|monedele|📉/.test(t), t);
  assert.ok(text(acasa2({ idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 0, actiuni: [], reveniri: [] } }, clasament: { la: 5, monede: [] } })).includes("Acțiuni pe revenire ↩️ acțiunile nimic azi"));
  assert.ok(text(acasa2({})).includes("Acțiuni pe revenire aștept lista"), text(acasa2({})));   /* încă se încarcă */
  assert.equal(typeof acasa2({ get idei() { throw new Error("x"); }, clasament: CL }), "string", "o eroare în date nu strică cartela");
});
// v100.330 (el, 12.11: „sugestii de monede la fel cum sunt sugestii de stocks” ⇒ „da”): monedele pe revenire / short înapoi pe Piața azi,
// cu eticheta istoricului și urmărirea ⇒ pagina cere din nou sugestiile (proba v100330-monede ține coloanele)
await test("(8) v100.330: Piața azi cere din nou sugestiile (eticheta istoricului și urmărirea monedelor)", () => {
  assert.match(lib("acasa-ecran.js"), /pas\("sugestii", function \(\) \{ return (acDinPachet\(pk, "sugestii"\) \|\| )?getJSON\("\/api\/istoric-bot\?action=sugestii&scurt=1"\); \}\)/);   // revizia Opus: fără istoric · v100.336: din pachet, rezerva „scurt”
});
await test("(9) garda: grupul „sugestii” e STRICT și n-are abateri (toate etichetele, puține, fără istoric, boții, supraviețuitorii, urmărirea)", () => {
  assert.ok(STRICT.has("sugestii"));
  const s = situatii().filter((x) => x.mod === "sugestii"); assert.ok(s.length >= 20, String(s.length));
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " ⇐ " + q.x.text).join("\n"));
});
await test("(9) reveniri.js se încarcă pe pagină înaintea lui idei.js și e în cache-ul aplicației", () => {
  const h = citeste("public", "index.html"); assert.ok(h.includes('<script src="/lib/reveniri.js"></script><script src="/lib/idei.js"></script>'));
  assert.ok(citeste("public", "sw.js").includes('"/lib/reveniri.js","/lib/idei.js"'));
});
console.log("\n" + (pica ? "V100.85 ECRAN PICA · " + pica + " din " + (ok + pica) : "V100.85 ECRAN PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
