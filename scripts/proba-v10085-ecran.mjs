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
function tablou(cl, sg) {
  const ctx = { Reveniri: R, Idei: ID, GridCalcul: G, escapeHtml: esc, TextRo: globalThis.TextRo }; vm.createContext(ctx);
  // v100.89: + tbIstoricBoti (istoricul cu virgulă, comun candidaților și listelor noi) - fără el tbSugestiiCorp aruncă, iar try/catch-ul dă ""
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "tbIstoricRosu") + "\n" + fnDin("t212-ecran.js", "tbIstoricBoti") + "\n" + fnDin("t212-ecran.js", "tbSugestiiHtml") + "\n" + fnDin("t212-ecran.js", "tbSugestiiCorp") + "\n;this.f=tbSugestiiHtml;", ctx);
  return ctx.f(cl, sg, [{ moneda: "AAA", rezultat: 2 }]);
}
await test("(7) Tabloul: „↩️ Pe revenire (bot long)” și „📉 Pentru short”, cu istoricul pe față, rândurile și „Fișa (long/short)”", () => {
  const h = tablou(CL, SG), t = text(h);
  assert.ok(t.includes("↩️ Pe revenire (bot long)") && t.includes("📉 Pentru short"));
  assert.ok(t.includes(R.textDovada(SLAB, "monede")) && t.includes("Boții tăi porniți așa: 53% pe plus din 66, față de 59% la toți boții tăi."), t);
  assert.ok(t.includes("AAA căzută −32% de la maximul pe 30 de zile · +11% de la minim (acum 4 zile)") && t.includes("istoricul tău: 1 bot, 1 pe plus, +2,00 USDT"), t);   /* v100.89 (ideea 2): virgulă zecimală */
  assert.match(h, /data-action-click="gridDeschideMonedaDir\('AAA','long'\)">Fișa \(long\)<\/button>/); assert.match(h, /data-action-click="gridDeschideMonedaDir\('DDD','short'\)">Fișa \(short\)<\/button>/);
  assert.ok(t.includes("DDD interval 12,00% · 0,26% net pe grilă · ~21 treceri pe zi · direcția short (puternic)") && t.includes("n-ai mai avut boți pe ea"), t);
  assert.ok(t.includes("Boții tăi short pe monede cu direcția short: 49% pe plus din 83, față de 56% la toți boții tăi short.") && t.includes("📏 Sugestiile se urmăresc de azi"));
});
await test("(7) revizia (I7): Tabloul înainte de primul clasament cu reveniri (fără `revenire` sau `revenire: null` peste tot) ⇒ „apare la următorul clasament”; clasament nou fără reveniri ⇒ „Acum nicio monedă…”; fără clasament ⇒ „Aștept clasamentul…”", () => {
  const a = text(tablou(null, null)); assert.ok(a.includes("Aștept clasamentul…") && a.includes("Istoricul se socotește azi de la 8:00."), a);
  for (const m of [{ simbol: "X_USDT_PERP", stare: "candidat", dir: "long", scor: 1 }, { simbol: "X_USDT_PERP", stare: "candidat", dir: "long", scor: 1, revenire: null }]) {
    const b = text(tablou({ la: 5, monede: [m, { ...m, simbol: "Y_USDT_PERP" }] }, null));
    assert.ok(b.includes("Starea de revenire apare la următorul clasament (o dată pe oră).") && !b.includes("Acum nicio monedă nu e pe revenire.") && b.includes("Acum nicio monedă liniștită nu are direcția short."), b);
  }
  const c = text(tablou({ la: 5, monede: [{ simbol: "X_USDT_PERP", stare: "candidat", dir: "long", scor: 1, revenire: { cadere: 0.1, deLaMin: 0.01, zileDeLaMin: 1, revine: false } }] }, null));
  assert.ok(c.includes("Acum nicio monedă nu e pe revenire.") && !c.includes("apare la următorul clasament") && c.includes("Acum nicio monedă liniștită nu are direcția short."), c);
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
await test("(7) Tabloul: listele stau SUB nota listei de candidați; sugestiile se aduc odată cu clasamentul (la 10 minute)", () => {
  assert.match(fnDin("t212-ecran.js", "tbIdeiRender"), /proba pe istoricul monedei\.<\/p>' \+ tbSugestiiHtml\(cl, contTot\.sugestii, contTot\.inchise\);/);
  const s = lib("t212-ecran.js");
  assert.match(s, /var contTot = \{.*sugestii: null, sugestiiLa: 0 \};/); assert.match(s, /contTot\.sugestii = await getJSON\("\/api\/istoric-bot\?action=sugestii"\);/);
});
await test("(7) o eroare în date nu strică Tabloul: lista nouă iese goală, candidații rămân", () => {
  assert.equal(tablou({ get monede() { throw new Error("x"); } }, SG), "");
});

function t212Rev(id, cont) {
  const ctx = { Reveniri: R, escapeHtml: esc, TextRo: globalThis.TextRo, t212Usd: (v) => "$" + v, t212Lei: (v) => v + " lei", ActiuniSemnale: AS, t212Fx: () => 0.22, t212Suma: (v) => Math.round(v) + " lei", t212: { cont: cont ? { cash: { total: cont } } : null } }; vm.createContext(ctx);
  // v100.91: + t212Bucati (bucățile, întregi sub 10 $) - fără el t212ReveniriCorp aruncă, iar try/catch-ul dă ""
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "t212Bucati") + "\n" + fnDin("t212-ecran.js", "t212ReveniriHtml") + "\n" + fnDin("t212-ecran.js", "t212ReveniriCorp") + "\n;this.f=t212ReveniriHtml;", ctx);
  return ctx.f(id);
}
const BINE = { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false };
const RV = { ticker: "INTC_US_EQ", simbol: "INTC", pret: 72, cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, stop: 64.22, tinta: 98.45, istoric: { n: 33, pePlus: 24, total: 3401 } };
await test("(8) Trading 212: „↩️ Pe revenire” - istoricul pe față (+ supraviețuitorii), tabelul cu căderea, minimul, stopul, ținta, istoricul lui și CÂT CUMPERI (revizia I1: 1% din cont pe stopul de sub minim, fără „Biletul”); urmărirea", () => {
  const h = t212Rev({ reveniri: [RV], dovadaReveniri: BINE, urmarireReveniri: { n: 2, text: "Din 2 sugestii de cel puțin 14 zile: 1 pe plus, +0,5% în medie de la prețul sugestiei, după comision (puține — mai așteaptă)." } }, 50000), t = text(h);
  assert.ok(t.includes("↩️ Pe revenire") && t.includes(R.textDovada(BINE, "actiuni")) && t.includes(R.TEXT_SUPRAVIETUITORI), t);
  assert.match(h, /<th>Acțiune<\/th><th>Acum<\/th><th>Căderea<\/th><th>De la minim<\/th><th>Stop<\/th><th>Țintă<\/th><th>Istoricul tău<\/th><th>Cât cumperi<\/th>/);
  assert.ok(t.includes("INTC $72 −27% de la maximul pe 60 de zile +11% minimul acum 19 zile de bursă $64.22 sub minim $98.45 maximul 33 de trade-uri, 24 pe plus, 3401 lei"), t);
  const m = AS.marime({ intrare: 72, stop: 64.22, cont: 50000, fx: 0.22 });
  assert.ok(t.includes((+m.bucati.toFixed(3)).toLocaleString("ro-RO") + " buc ≈ " + Math.round(m.suma) + " lei · la stop pierzi ~" + Math.round(m.risc) + " lei (1% din cont)"), t);
  assert.ok(!h.includes("t212BiletPentru") && !t.includes("Biletul ") , "fără „Biletul” - poarta ideilor (trend în sus) i-ar spune NU unei reveniri");
  assert.ok(t.includes("Fără „Biletul”: poarta lui cere trend în sus, deci la o revenire ar spune NU; mărimea de aici e pe stopul de sub minim, cu 1% din cont."), t);
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
  vm.runInContext(fnDin("acasa-ecran.js", "acClasamentSumar") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2Corp") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2Parti") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar") + "\n;this.f=acasaCumpar;this.g=acasaCumpar2;", ctx);   /* v100.92: + Parti */
  return { tot: ctx.f(d), doi: ctx.g(d) };
}
await test("(8) Acasă: al doilea rând din „Ce aș cumpăra azi” - primele nume din fiecare listă, cu eticheta istoricului; liste goale ⇒ „nimic azi”; fără date ⇒ lipsește", () => {
  const d = { idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 23, actiuni: [{ simbol: "SNDK" }], reveniri: [RV, { ...RV, simbol: "MU" }], dovadaReveniri: BINE } }, clasament: CL, sugestii: SG };
  const r = acasa2(d);
  assert.equal(text(r.doi), "↩️ pe revenire: acțiunile INTC, MU (mai bine) · monedele AAA (mai slab) · 📉 short: DDD (cam la fel)");
  /* v100.92 (I-521): cartela pe 3 coloane - rândul al doilea devine coloana „Revenire și short” */
  assert.ok(text(r.tot).startsWith("💡 Ce aș cumpăra azi Acțiuni SNDK 23 din 202 trec de poartă pe 03.10") && text(r.tot).includes("Revenire și short ↩️ acțiunile INTC, MU (mai bine) ↩️ monedele AAA (mai slab) 📉 short: DDD (cam la fel)"), text(r.tot));
  assert.equal(text(acasa2({ idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 0, actiuni: [], reveniri: [] } }, clasament: { la: 5, monede: [] }, sugestii: null }).doi), "↩️ pe revenire: acțiunile nimic azi · monedele nimic azi · 📉 short: nimic azi");
  assert.equal(acasa2({}).doi, "");
  assert.equal(acasa2({ get sugestii() { throw new Error("x"); }, clasament: CL }).doi, "", "o eroare în date nu strică rândul întâi");
});
await test("(8) revizia (I7): Acasă înainte de primul clasament cu reveniri (`revenire: null` peste tot) ⇒ „monedele —”, nu „nimic azi”; shortul rămâne", () => {
  const vechi = { la: 5, monede: [{ simbol: "X_USDT_PERP", stare: "candidat", dir: "short", scor: 1, revenire: null }, { simbol: "Y_USDT_PERP", stare: "evita", dir: "long", scor: 2 }] };
  assert.equal(text(acasa2({ idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 0, actiuni: [] } }, clasament: vechi, sugestii: null }).doi), "↩️ pe revenire: acțiunile — · monedele — · 📉 short: X");
});
await test("(8) Acasă: sugestiile se aduc cu celelalte date ale paginii", () => {
  assert.match(lib("acasa-ecran.js"), /pas\("sugestii", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=sugestii"\); \}\),/);
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
