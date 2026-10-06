// Proba v100.111 (06.10, el: „ok fă” pe recomandarea mea - I-549, I-550, I-542):
// I-549 fereastra fișei cu stopul în peste jumătate din porniri ⇒ „aș sări peste ea” (NIL: ÎNGUST 77 din 109, pornit totuși)
// I-550 Tabloul spune ce fereastră ai pornit și ce recomanda fișa (din oferta salvată) · I-542 UN tabel „Trendul pe TF-uri” (demo aprobat)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "tablou-extra.js", "directie.js", "grafic-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GraficBot: GB, GridPlan: GP } = globalThis;
const app = citeste("public", "app.js"), html = citeste("public", "index.html"), css = citeste("public", "app.css");
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); return src.slice(i, src.indexOf("\nfunction ", i + 10)); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.111 · I-549 + I-550 + I-542 · proba\n");

// ferestrele NIL de azi (oferta din KV, 06.10) cu proba lor
const PR = (stop, n, o) => Object.assign({ stop, n, tinta: n - stop - 2, inGrid: 2, zile: 30, ferestreZile: 3, oreTipic: 3.75, mediaUsdt: -1.6, ceaMaiProastaUsdt: -4.4, independente: 10 }, o || {});
const NIL = () => { const v = GP.variante({ pret: 0.1003, dir: "long", suma: 43.87, levier: 5, levierSigur: 3, plan: { plus: 2.2, minus: 4.4 }, amp: 0.112, pas: 0.003 }); v.ta.proba = PR(77, 109); v.mea.proba = PR(34, 109, { oreTipic: 20.1 }); return v; };

// ---------------- I-549 ----------------
await test("(549a) GridPlan.deSarit: stopul în peste jumătate din porniri (cel puțin 20) ⇒ „aș sări peste ea”, cu cifrele", () => {
  assert.equal(GP.deSarit({ proba: PR(77, 109) }).text, "aș sări peste ea: stopul a venit în 77 din 109 porniri (71%)");
  assert.equal(GP.deSarit({ proba: PR(54, 109) }), null, "sub jumătate: nimic");
  assert.equal(GP.deSarit({ proba: PR(15, 18) }), null, "sub 20 de porniri: prea puține ca să judec");
  assert.equal(GP.deSarit({ proba: null }), null); assert.equal(GP.deSarit(null), null);
});
await test("(549b) fișa: fereastra de sărit poartă eticheta + rândul cu pierderea la stop; copierea din ea avertizează", () => {
  const ctx = { GridPlan: GP, TextRo: globalThis.TextRo, grPret: (x) => String(x) };
  vm.createContext(ctx);
  vm.runInContext(fn(app, "escapeHtml") + "\n" + fn(app, "grRand") + "\n" + fn(app, "grPlanVarHtml"), ctx);
  const h = ctx.grPlanVarHtml(NIL(), null, "", true);
  const [ta, mea] = h.split('<div class="tbBloc grPlanBloc').slice(1);
  assert.match(ta, /<span class="grPlanPill grPlanSari">aș sări peste ea<\/span>/);
  assert.match(ta, /<p class="grPlanSariTx">⚠️ Aș sări peste ea: stopul a venit în 77 din 109 porniri \(71%\)\. Dacă o pornești totuși, la stop pierzi −4,4 USDT\.<\/p>/);
  assert.match(ta, /data-action-click="gridCopiaza\(this\.value,'ta'\)"/); assert.doesNotMatch(ta, /gridCopiaza\(this\.value\)"/);
  assert.doesNotMatch(mea, /grPlanSari/); assert.match(mea, /gridCopiaza\(this\.value\)"/);
  const g = fn(app, "gridCopiaza");
  assert.match(g, /^function gridCopiaza\(v,sari\)/); assert.match(g, /fereastra peste care aș sări/);
});
await test("(549c) amândouă de sărit ⇒ „Ce aș alege eu acum” spune întâi că aș aștepta", () => {
  const ctx = { GridPlan: GP, TextRo: globalThis.TextRo, grPret: (x) => String(x) };
  vm.createContext(ctx);
  vm.runInContext(fn(app, "escapeHtml") + "\n" + fn(app, "grRand") + "\n" + fn(app, "grPlanVarHtml"), ctx);
  const v = NIL(); v.mea.proba = PR(70, 109);
  assert.match(ctx.grPlanVarHtml(v, null, "", true), /<b>Ce aș alege eu acum:<\/b> amândouă au stopul în peste jumătate din porniri: aș aștepta\. Dacă pornești totuși, aș alege (ÎNGUST|LARG) · /);
  assert.doesNotMatch(ctx.grPlanVarHtml(NIL(), null, "", true), /aș aștepta/);
  // revizia (R8): pe Tablou (botul rulează deja, fără butoane) nu „dacă pornești”
  const tb = ctx.grPlanVarHtml(v, null, "", false);
  assert.doesNotMatch(tb, /aș aștepta|Dacă o pornești|Dacă pornești/); assert.match(tb, /⚠️ Aș sări peste ea: stopul a venit în 77 din 109 porniri \(71%\)\. La stop pierzi −4,4 USDT\./);
});
// ---------------- revizia Opus (06.10) ----------------
await test("(R1) recomandarea nu alege fereastra de sărit când cealaltă e bună; amândouă ⇒ „asteapta” (salvat așa și spus pe Tablou)", () => {
  const v = NIL(); v.ta.proba = PR(77, 109, { mediaUsdt: -1.6 }); v.mea.proba = PR(54, 109, { mediaUsdt: -3.0 });   // scenariul reviziei: 71% vs 49,5%
  const r = GP.alege(v.ta, v.mea);
  assert.equal(r.cine, "mea"); assert.ok(!r.asteapta); assert.match(r.text, /^LARG · la ÎNGUST stopul a venit în 77 din 109 porniri \(71%\), aici în 54 din 109 porniri; la stop pierzi /);
  const ctx = { GridPlan: GP, TextRo: globalThis.TextRo, grPret: (x) => String(x) };
  vm.createContext(ctx); vm.runInContext(fn(app, "escapeHtml") + "\n" + fn(app, "grRand") + "\n" + fn(app, "grPlanVarHtml"), ctx);
  const [ta] = ctx.grPlanVarHtml(v, null, "", true).split('<div class="tbBloc grPlanBloc').slice(1);
  assert.doesNotMatch(ta, /grPlanAles|aș alege-o acum/, "conturul „ales” nu stă pe fereastra de sărit");
  const w = NIL(); w.mea.proba = PR(70, 109);
  const a = GP.alege(w.ta, w.mea); assert.equal(a.asteapta, true); assert.equal(a.deCe, "amândouă au stopul în peste jumătate din porniri");
  const u = NIL(); u.mea = null; assert.equal(GP.alege(u.ta, null).deCe, "stopul vine în peste jumătate din porniri");
  assert.match(fn(app, "grFerestreTine"), /rec:rec\?\(rec\.asteapta\?"asteapta":rec\.cine==="mea"\?"larg":"ingust"\):null/);
  assert.match(fn(app, "grRecomandatAcum"), /return rec&&!rec\.asteapta\?/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /rec:o\.rec==="ingust"\|\|o\.rec==="larg"\|\|o\.rec==="asteapta"\?o\.rec:null/);
  assert.equal(GP.textPornit({ k: "ingust", rec: "asteapta", stop: 77, n: 109, oreTipic: 0.3 }, "09:23"),
    "Ai pornit ÎNGUST din fișa de la 09:23, deși fișa zicea să aștepți; în probă stopul a venit în 77 din 109 porniri (71%), ieșirea tipică sub o oră.");
});
await test("(R7) copierea din fereastra de sărit: avertizează o dată pe monedă și fereastră, abia după ce s-a copiat", async () => {
  const toasturi = []; let pica = true;
  const ctx = { grStare: { simbol: "NIL_USDT_PERP", la: 1 }, toast: (t, c) => toasturi.push(c + ": " + t), navigator: { clipboard: { writeText: () => (pica ? Promise.reject(new Error("x")) : Promise.resolve()) } } };
  vm.createContext(ctx); vm.runInContext(fn(app, "gridCopiaza"), ctx);
  ctx.gridCopiaza("0.0965", "ta"); await new Promise((r) => setTimeout(r, 5));
  pica = false; ctx.gridCopiaza("0.0965", "ta"); await new Promise((r) => setTimeout(r, 5));
  ctx.grStare.la = 2; ctx.gridCopiaza("0.1066", "ta"); await new Promise((r) => setTimeout(r, 5));
  ctx.gridCopiaza("0.0894", "mea"); ctx.gridCopiaza("0.12"); await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(toasturi.map((t) => t.split(":")[0]), ["bad", "warn", "good", "warn", "good"], toasturi.join(" | "));
  assert.match(toasturi[1], /atenție, e fereastra peste care aș sări/);
});


// ---------------- I-550 ----------------
await test("(550a) GridPlan.textPornit: ce ai pornit, ce recomanda fișa și proba ferestrei", () => {
  assert.equal(GP.textPornit({ k: "ingust", rec: "larg", stop: 77, n: 109, oreTipic: 3.75 }, "09:23"),
    "Ai pornit ÎNGUST din fișa de la 09:23, deși fișa recomanda LARG; în probă stopul a venit în 77 din 109 porniri (71%), ieșirea tipică după 4 h.");
  assert.equal(GP.textPornit({ k: "larg", rec: "larg", stop: 34, n: 109, oreTipic: 20.1 }, "09:23"),
    "Ai pornit LARG din fișa de la 09:23, cum recomanda fișa; în probă stopul a venit în 34 din 109 porniri (31%), ieșirea tipică după 20 h.");
  assert.equal(GP.textPornit({ k: null, rec: "larg" }, "09:23"), "Gridul botului nu seamănă nici cu ÎNGUST, nici cu LARG din fișa de la 09:23.");
  assert.equal(GP.textPornit(null, "09:23"), null);
  assert.equal(GP.textPornit({ k: "ingust", rec: null, stop: null, n: null }, "09:23"), "Ai pornit ÎNGUST din fișa de la 09:23.");
});
await test("(550b) Tabloul: rândul 📒 în cartela verdictului, din ofertele fișei (aduse și pe Tablou, la 5 min)", () => {
  const t = fn(app, "tbPornitCaText");
  assert.match(t, /GridPlan\.fereastraBotului\(b,grFerestreCitite\(\)\)/); assert.match(t, /GridPlan\.textPornit\(fb,/); assert.match(t, /tbAduFerestre\(\)/);
  assert.match(fn(app, "tbAduFerestre"), /\/api\/istoric-bot\?action=ferestre/); assert.match(fn(app, "tbAduFerestre"), /5\*60000/);
  assert.match(fn(app, "tbDeseneazaSemafor"), /cons\.pornitCa=tbPornitCaText\(b\);/);
  assert.match(fn(app, "tbConsHtml"), /\(c\.pornitCa\?'<p class="tbConsDeCe tbSub">📒 '\+escapeHtml\(c\.pornitCa\)\+'<\/p>':''\)/);
});
await test("(550c) tbPornitCaText rulat: botul PERP pornit după o ofertă ⇒ rândul cu ora (și ziua, dacă nu e azi); spot ⇒ nimic, fără cerere", () => {
  let cereri = 0; const pornit = Date.now() - 2 * 36e5, oferta = { simbol: "NIL_USDT_PERP", t: pornit - 36e5, dir: "long", rec: "larg", ta: { jos: 0.09831, sus: 0.104, levier: 5, stop: 77, n: 109, oreTipic: 3.75 }, mea: { jos: 0.0894, sus: 0.12, levier: 1, stop: 34, n: 109, oreTipic: 20.1 } };
  const ctx = { GridPlan: GP, TextRo: globalThis.TextRo, grFerestreCitite: () => [oferta], tbAduFerestre: () => { cereri++; } };
  vm.createContext(ctx); vm.runInContext(fn(app, "tbPornitCaText"), ctx);
  const bot = { baza: "NIL.PERP", directie: "long", pornitLa: pornit, gridJos: 0.09831, gridSus: 0.104, levier: 5 };
  const d = new Date(oferta.t), hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const azi = d.toDateString() === new Date().toDateString();
  assert.equal(ctx.tbPornitCaText(bot), "Ai pornit ÎNGUST din fișa de la " + (azi ? "" : d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0") + ", ") + hm + ", deși fișa recomanda LARG; în probă stopul a venit în 77 din 109 porniri (71%), ieșirea tipică după 4 h.");
  const vechi = Object.assign({}, bot, { pornitLa: Date.now() - 3 * 864e5 }); oferta.t = vechi.pornitLa - 36e5;
  assert.match(ctx.tbPornitCaText(vechi), /^Ai pornit ÎNGUST din fișa de la \d{1,2}\.\d\d, \d\d:\d\d, /);
  const n = cereri; assert.equal(ctx.tbPornitCaText({ baza: "NIL", directie: "long", pornitLa: pornit }), null); assert.equal(cereri, n, "spot: nicio cerere");
});

// ---------------- I-542 ----------------
const T0 = Date.UTC(2026, 9, 6, 9, 0), ZI = 864e5;
const rows = (n, pas, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { time: T0 - (n - 1 - i) * pas, open: c, high: c * 1.002, low: c * 0.998, close: c, volume: 10 }; });
const SUS = (pas) => rows(200, pas, (i) => 1 + i * 0.002 + (i % 3 ? 0.0015 : -0.002)), JOS = (pas) => rows(200, pas, (i) => 2 - i * 0.002 + (i % 3 ? 0.0015 : -0.002));
await test("(542a) GraficBot.trendTabel: un rând pe bec, cu dovezile lângă el (scorul, cât de des s-a întors, bara de acum)", () => {
  const sem = GB.semafor({ "5M": SUS(3e5), "15M": JOS(9e5) }, "long");
  const rez = [{ tf: "15M", eticheta: "15 min", orizontText: "4 ore", dir: "coboara", vechime: 16, formare: { pct: -0.4 }, schimbare: { valoare: 34, cazuri: 120, ic: { jos: 26, sus: 43 }, spreOpus: 20, stare: "dovedit" } }];
  const ind = [{ tf: "15M", verdict: { t: "↔ 48", c: "neutral", titlu: "neutru, scor 48 din 100" } }];
  const t = GB.trendTabel(sem, rez, ind);
  assert.equal(t.length, 6); assert.deepEqual(t.map((r) => r.tf), ["5M", "15M", "30M", "60M", "4H", "1D"]);
  const a = t[1];
  assert.equal(a.bec.startsWith("coboară de "), true, a.bec); assert.equal(a.fata, "împotriva botului long"); assert.equal(a.sageata, "↓"); assert.equal(a.ton, "rau");
  assert.deepEqual(a.scor, ind[0].verdict); assert.equal(a.intors.text, "s-a schimbat în 34% din 120 de cazuri, după 4 ore"); assert.match(a.intors.titlu, /^Interval de încredere 26-43%, spre direcția opusă 20%, dovedit\. Stare ținută de 16 bare închise\.$/);
  assert.equal(a.bara, -0.4); assert.ok(a.adx > 0 && a.rsi > 0);
  assert.equal(t[0].areCalc, false, "5 min: fără „Direcție” și indicatori"); assert.equal(t[0].intors, null); assert.equal(t[0].scor, null);
  assert.equal(t[0].scorLipsa, "— (nu se socotește pe 5 min)"); assert.equal(t[0].intorsLipsa, "— (nu se socotește pe 5 min)");
  assert.equal(t[2].bec, null); assert.equal(t[2].lipsa, "Pionex n-a dat lumânările la ultima cerere");
});
await test("(R3) cât se aduc „Direcția” și indicatorii: „se aduce…”, nu „nu se socotește”; la eroare, motivul real", () => {
  const sem = GB.semafor({ "5M": SUS(3e5), "15M": JOS(9e5), "60M": SUS(36e5) }, "long"), CALC = ["15M", "60M", "4H", "1D"];
  const t = GB.trendTabel(sem, null, null, CALC);
  assert.equal(t[1].scorLipsa, "se aduce…"); assert.equal(t[1].intorsLipsa, "se aduce…"); assert.equal(t[0].scorLipsa, "— (nu se socotește pe 5 min)");
  const e = GB.trendTabel(sem, [{ tf: "60M", dir: null, stare: "eroare", motiv: "Pionex n-a răspuns (429)" }], [{ tf: "60M", verdict: null, eroare: "doar 40 de bare închise" }], CALC);
  assert.equal(e[3].intorsLipsa, "Pionex n-a răspuns (429)"); assert.equal(e[3].scorLipsa, "doar 40 de bare închise");
  assert.equal(GB.trendSumar(GB.semafor({}, "long", { reincerc: true })).text, "Pionex n-a dat lumânările la ultima cerere · reîncerc în 30 s");
  const amestec = GB.semafor({}, "long"); amestec[0].text = "x"; assert.equal(GB.trendSumar(amestec).text, "lumânările n-au venit pe niciun TF");
});
await test("(R3b) renderTabloTrend rulat: 6 rânduri, „se aduce…” cât lipsește „Direcția”, „Pe boții tăi” sub tabel", () => {
  const el = {}, $ = (id) => (el[id] = el[id] || { innerHTML: "", textContent: "" });
  const bot = { baza: "NIL.PERP", quote: "USDT", directie: "long" }, sem = GB.semafor({ "15M": JOS(9e5) }, "long");
  const ctx = { $, GraficBot: GB, TB_DIR_TF: [{ tf: "15M" }, { tf: "60M" }, { tf: "4H" }, { tf: "1D" }], tbStare: { bot, directie: { simbol: "NIL_USDT_PERP|long", rez: null } },
    tbSemaforTf: () => sem, tbCheieDir: () => "NIL_USDT_PERP|long", TabloBot: { simboluri: () => ({ pionex: "NIL_USDT_PERP" }) }, tbCazuriAdu: () => {}, tbCazuri: { sem: "pe boții tăi nu s-a dovedit că becurile ajută (x)" },
    tbFormateazaSemn: (v, z) => (v < 0 ? "\u2212" + Math.abs(v).toFixed(z) : v.toFixed(z)) };
  vm.createContext(ctx); vm.runInContext(fn(app, "escapeHtml") + "\n" + fn(app, "renderTabloTrend"), ctx);
  ctx.renderTabloTrend();
  const h = el.tbTrend.innerHTML, randuri = h.split("<tbody>")[1].split("</tr>").filter((x) => x.includes("<td"));
  assert.equal(randuri.length, 6); assert.match(randuri[1], /se aduce…/); assert.doesNotMatch(randuri[1], /nu se socotește/); assert.match(randuri[0], /nu se socotește pe 5 min/);
  assert.equal(el.tbTrendBoti.textContent, "Pe boții tăi: nu s-a dovedit că becurile ajută (x)");
});
await test("(R5/R6) „Pe boții tăi” și 📒 se redesenează când sosesc datele", () => {
  assert.match(fn(app, "tbCazuriAdu"), /if\(tbStare\.bot\)\{tbDeseneazaProb\(tbStare\.bot\);renderTabloTrend\(\)\}/);
  assert.match(fn(app, "tbAduFerestre"), /tbDeseneazaSemafor\(tbStare\.bot\)/);
  assert.match(fn(app, "tbPornitCaText"), /\/\\\.PERP\$\/i\.test\(String\(b\.baza\|\|""\)\)/);
});
await test("(542b) GraficBot.trendSumar: rândul unic din „Ce spune graficul acum”", () => {
  const sem = GB.semafor({ "5M": SUS(3e5), "15M": JOS(9e5), "60M": SUS(36e5) }, "long");
  const s = GB.trendSumar(sem);
  assert.equal(s.text, "2 din 6 cu botul sau laterale · 1 împotrivă · 3 fără lumânări — tabelul de sub grafic"); assert.equal(s.stare, "atentie");
  assert.equal(GB.trendSumar(GB.semafor({}, "long", { seAduc: true })).text, "se aduc lumânările…");
  assert.equal(GB.trendSumar(GB.semafor({ "15M": JOS(9e5), "60M": JOS(36e5) }, "long")).stare, "rau");
});
await test("(542c) pagina: cartela „Trendul pe TF-uri” pe toată lățimea ia locul celor două; rezumatele și detaliile rămân", () => {
  assert.doesNotMatch(html, /id="tbIndicatoriCard"|id="tbDirectieCard"|id="tbDirectie"/);
  assert.match(html, /Becul hotărăște \(EMA 20\/50/); assert.match(html, /<summary>Detaliile indicatorilor · ca „Analizează piața”, pe bare închise/);   // revizia (R9, R10)
  assert.doesNotMatch(css, /#tabloubot \.tbCitTf/); assert.match(css, /#t212 \.tbCitTf\{/);   // revizia (R11): CSS-ul rămas fără folosință
  assert.match(citeste("scripts", "proba-ecran-t212.mjs"), /"tbScenarii", "tbTrend", "tbBani"/);   // revizia (R2)
  const i = html.indexOf('id="tbTrendCard"'); assert.ok(i > 0);
  const c = html.slice(i, html.indexOf('id="tbIdei"'));
  for (const id of ["tbDirectieBot", "tbDirectieRezumat", "tbIndicatoriRezumat", "tbTrend", "tbTrendDet", "tbIndicatori", "tbTrendMediu", "tbTrendBoti"]) assert.ok(c.includes('id="' + id + '"'), id);
  assert.match(css, /#tabloubot #tbTrendCard\{grid-column:1\/-1;grid-row:2\}/);
  assert.match(fn(app, "renderTabloTrend"), /GraficBot\.trendTabel\(sem,/); assert.match(fn(app, "renderTabloTrend"), /IndicatoriBot\.celule\(x\.q\)\.verdict/);
  assert.match(fn(app, "renderTabloIndicatori"), /\$\("tbTrendMediu"\)/); assert.match(fn(app, "renderTabloIndicatori"), /el\.innerHTML='<div class="tbIndWrap">/, "mediul botului iese din tabelul pliat (stă sub cartelă)");
  assert.match(fn(app, "renderTabloDirectia"), /renderTabloTrend\(\)/); assert.match(fn(app, "renderTabloIndicatori"), /renderTabloTrend\(\)/);
  assert.match(fn(app, "renderTabloTrend"), /bv=r\.bara!=null\?Math\.round\(r\.bara\*10\)\/10:null;[\s\S]*\(bv>0\?"\+":""\)\+tbFormateazaSemn\(bv,1\)\.replace\("\.",","\)\+'%/, "bara de acum: +0,2%, nu 0.2%; 0,04 ⇒ 0,0%, nu +0,0% (poza pe 8788)");
  const cit = fn(app, "tbDeseneazaCitire"); assert.match(cit, /GraficBot\.trendSumar\(tbSemaforTf\(b\)\)/); assert.doesNotMatch(cit, /tbCitTf/);
});
await test("(542d) becurile se aprind și în tabel pe rând, iar „Pe boții tăi” stă sub tabel", () => {
  const d = fn(app, "tbAduDirectie");
  assert.equal((d.match(/renderTabloGrafic\(\);renderTabloTrend\(\)/g) || []).length, 2, "la fiecare TF venit, graficul ȘI tabelul");
  assert.match(fn(app, "renderTabloTrend"), /tbCazuri\.sem/);
});
await test("(E) versiunea v100.111", () => {
  assert.match(html, /content="v100\.111"/); assert.match(html, /id="antetVersiune">v100\.111/); assert.match(html, /id="healthAppVersion">v100\.111</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.111.0");
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-111";/);
  const sc = JSON.parse(citeste("package.json")).scripts; assert.equal(sc["test:v100111"], "node scripts/proba-v100111.mjs"); assert.match(sc.test, /npm run test:v100111/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
