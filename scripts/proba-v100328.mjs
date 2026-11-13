// Proba v100.328 (11.11.2026, el: „nu poți pune detaliile indicatorilor și în Trading 212 la fel ca la bot?” ⇒ propunerea ⇒ „da, fă așa”):
//   „Detaliile indicatorilor” în fișa deschisă a pozițiilor Trading 212, ca la Tabloul botului - aceleași calcule (calc „Analizează piața” pe bare ÎNCHISE,
//   15 min / 1 oră / 4 ore / 1 zi), direcția long (verde = cu poziția ta), zero cereri în plus (lumânările fișei deschise), fără „Mediul botului”,
//   orizonturile și istoria pe 4 ore în ședințe (la bursă o zi are 2 bare de 4 ore). Pe Tablou nimic nu se schimbă.
//   node scripts/proba-v100328.mjs
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
console.log("\nV100.328 · detaliile indicatorilor și în fișa Trading 212 · proba\n");
const APP = citeste("public", "app.js"), T212 = citeste("public", "lib", "t212-ecran.js"), CSS = citeste("public", "app.css");
// funcția întreagă (scrisă pe mai multe rânduri, se închide cu „}” la început de rând)
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește funcția " + nume); const j = src.indexOf("\n}\n", i); assert.ok(j > i, "funcția " + nume + " nu se închide cu } la început de rând"); return src.slice(i, j + 2); };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, Date, RegExp, Intl, TextRo: globalThis.TextRo, escapeHtml: esc };
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "tv-note.js") + "\n" + citeste("public", "lib", "indicatori-bot.js") + "\nthis.IB = IndicatoriBot; this.TV = TvNote;", ctx);
const IB = ctx.IB;
const Q = (score, ver, prag) => ({ ver, score, prag, ema: false, emaDir: "UP", e20Now: 3, e50Now: 2, e200Now: 1 });
const HP = (up) => ({ up, k: 30, banda: 5, inBanda: false, avg: 1.2 });
const L = () => [{ tf: "15M", eticheta: "15 min", q: Q(70, "BULLISH", 64), hp: HP(55) }, { tf: "60M", eticheta: "1 oră", q: Q(50, "NEUTRAL", 64), hp: HP(48) },
  { tf: "4H", eticheta: "4 ore", q: Q(68, "BULLISH", 64), hp: HP(62) }, { tf: "1D", eticheta: "1 zi", q: Q(30, "BEARISH", 66), hp: HP(41) }];
const IST = (n) => Array.from({ length: n }, (_, i) => ({ s: 40 + i, prag: 64 }));
const BOT = /\bbot(ul|ului|ul tău)?\b/;

await test("vorbele poziției (VORBE_POZITIE): banda, rigla, istoria, predicția și estimarea spun „poziția ta”, nu „botul”; orizonturile în ședințe; botul rămâne cum era", () => {
  const V = IB.VORBE_POZITIE;
  assert.ok(V && V.tau === "poziția ta" && V.pred === "2 ședințe");
  assert.deepEqual(JSON.parse(JSON.stringify(V.orizont)), { "15 min": "1 oră", "1 oră": "4 ore de bursă", "4 ore": "2 ședințe", "1 zi": "4 ședințe" });
  const b = IB.banda(L(), "long");
  const bh = IB.bandaHtml(b, null, null, "long", esc, V);
  assert.match(bh, /aria-label="Indicatorii pe 4 intervale, pe trei familii \(trend, impuls, poziție\), față de poziția ta \(long\)"/); assert.ok(!BOT.test(bh), "banda fără „botul”");
  assert.match(IB.bandaHtml(b, null, null, "long", esc), /față de botul tău \(long\)/, "botul: neschimbat");
  const rg = IB.riglaHtml(b, "long", esc, V);
  assert.ok(rg.includes("verde = cu poziția ta (long: câștigă când urcă)") && !BOT.test(rg), "rigla");
  assert.ok(IB.riglaHtml(b, "long", esc).includes("verde = cu botul tău (long: câștigă când urcă)"), "rigla botului neschimbată");
  const sp = IB.sparkHtml(IST(24), "long", esc, V);
  assert.ok(sp.includes('<span class="ibRcap">Scorul pe 4h, ultimele 24 de bare (≈ 12 ședințe)</span>'), "24 de bare de 4 ore la bursă ≈ 12 ședințe, nu 4 zile");
  assert.ok(sp.includes("verde = cu poziția ta (long: ≥ 64)") && !BOT.test(sp));
  assert.ok(IB.sparkHtml(IST(3), "long", esc, V).includes("(≈ 2 ședințe)") && IB.sparkHtml(IST(2), "long", esc, V).includes("(≈ 1 ședință)"));
  assert.ok(IB.sparkHtml(IST(24), "long", esc).includes("(≈ 4 zile)"), "istoria botului: tot în zile");
  const pr = IB.predictie(L(), "long", V).text;
  assert.match(pr, /^Estimare pe 2 ședințe: urcare în 62% din situațiile asemănătoare \(în medie \+1,2%\) — în favoarea poziției\. /);
  assert.match(IB.predictie(L(), "long").text, /^Estimare pe 16 ore: .* — în favoarea botului\. /, "predicția botului neschimbată");
  assert.match(IB.predictie([], "long", V).text, /^Estimare pe 2 ședințe: n-am destule bare de 4 ore/);
  assert.match(IB.estimare(HP(40), "2 ședințe", V).titlu, /^în 30 de situații asemănătoare din istoricul acțiunii, după 2 ședințe prețul a coborât în 60% din cazuri/);
  assert.match(IB.estimare(HP(40), "16 ore").titlu, /din istoricul monedei, după 16 ore/, "estimarea botului neschimbată");
});

await test("tabelul „Detaliile indicatorilor” scos într-o funcție (tbIndTabelHtml) - Tabloul îl folosește la fel, fișa T212 cu vorbele poziției", () => {
  vm.runInContext(fn(APP, "tbIndTabelHtml") + "\nthis.tab = tbIndTabelHtml;", ctx);
  const bot = ctx.tab(L(), "short"), poz = ctx.tab(L(), "long", { vorbe: IB.VORBE_POZITIE, orizont: IB.VORBE_POZITIE.orizont });
  for (const h of [bot, poz]) {
    assert.ok(h.startsWith('<div class="tbIndWrap"><table class="tbIndTab"><thead><tr><th></th><th>15m</th><th>1h</th><th>4h</th><th>1z</th></tr></thead><tbody>'));
    assert.ok(h.includes('<tr class="tbIndEst"><td title="Estimarea din istoric: situații asemănătoare cu acum și ce a făcut prețul după 4 bare. Nedovedită.">Estimare</td>'));
    // v100.339 (auditul din 13.11): culoarea e față de bot / poziție (cu legendă), iar explicația unei celule se poate atinge (telefon)
    assert.ok(h.includes('<p class="tbSub tbIndNota">Indicatorii arată ce e acum pe grafic; doar rândul „Estimare” privește înainte. ' + (h === bot ? IB.MASURAT_DIRECTIE : IB.MASURAT_DIRECTIE_ACT) + ' Culoarea: verde = ' + (h === bot ? "cu botul (short)" : "cu poziția (long)") + ', roșu = împotrivă; săgeata arată piața. Atinge o celulă (sau ține mouse-ul pe ea) ca să vezi ce înseamnă.</p><p class="tbSub tbIndExplic" hidden></p>'), h.slice(-420));
  }
  assert.ok(bot.includes("Estimare · 4 ore: în 30 de situații asemănătoare din istoricul monedei, după 16 ore") && bot.includes("🔮 Estimare pe 16 ore") && bot.includes("împotriva botului"), "Tabloul: ca înainte");
  assert.ok(poz.includes("Estimare · 4 ore: în 30 de situații asemănătoare din istoricul acțiunii, după 2 ședințe") && poz.includes("Estimare · 1 zi: în 30 de situații asemănătoare din istoricul acțiunii, după 4 ședințe"));
  assert.ok(poz.includes("🔮 Estimare pe 2 ședințe") && !BOT.test(poz), "fișa: fără „botul”");
  const r = fn(APP, "renderTabloIndicatori");
  assert.match(r, /el\.innerHTML=tbIndTabelHtml\(l,b\.directie\)(?:\+tbListeRadarHtml\(b\))?;/, "Tabloul desenează tabelul prin aceeași funcție");   /* v100.331: + blocul „Listele Radarului” după tabel */
  assert.ok(!r.includes("IndicatoriBot.estimare(") && !r.includes("var cel=l.map"), "fără a doua copie a tabelului în Tablou");
});

await test("barele închise la acțiuni: cu bursa închisă nicio bară nu mai e în formare (bara de 13:30 se închide la 16:00, nu la 17:30); deschisă ⇒ ultima scoasă cât îi curge intervalul", () => {
  vm.runInContext(fn(T212, "t212IndInchise") + "\nthis.inch = t212IndInchise;", ctx);
  const acum = Date.UTC(2026, 10, 11, 20, 0), j = [[acum - 3 * 3600000, "1"], [acum - 3600000, "1"]];   // ultima: acum o oră, pe 4 ore
  assert.equal(ctx.inch(j, 240, acum, false).length, 2, "bursa închisă: toate sunt închise");
  assert.equal(ctx.inch(j, 240, acum, true).length, 1, "bursa deschisă: cea de acum o oră pe 4 ore e în formare");
  assert.equal(ctx.inch(j, 15, acum, true).length, 2, "pe 15 min, bara de acum o oră e închisă");
  assert.equal(ctx.inch(j, 240, acum, null).length, 1, "nu se știe dacă e deschisă ⇒ regula prudentă (ca la bot)");
  assert.equal(ctx.inch([], 15, acum, true).length, 0);
});

await test("istoria pe 4 ore a fișei: stare PE TICKER (nu o strică pe a botului), aceleași 24 de bare, pe bucăți după desen; gata ⇒ fișa se redesenează", () => {
  const src = fn(T212, "t212Istoric4h") + fn(T212, "t212Istoric4hGata");
  assert.ok(!/tbIst4h|renderTabloIndicatori/.test(src), "fără starea / desenul Tabloului");
  const desenate = [];
  vm.runInContext("var t212Ist4h = {};\n" + src + "\nthis.ist = t212Istoric4h; this.gata = t212Istoric4hGata;", Object.assign(ctx, {
    setTimeout: (f) => f(), calc: () => null, t212IndDeseneaza: (tk) => desenate.push(tk),
    IndicatoriBot: Object.assign({}, IB, { istoricScor: (j) => [{ s: j.length, prag: 64 }] }) }));
  const j = Array.from({ length: 70 }, (_, i) => [1000 + i, "1"]);
  ctx.ist(j, "AAA_US_EQ"); ctx.ist(j.slice(0, 65), "BBB_US_EQ");
  assert.deepEqual(Array.from(ctx.gata("AAA_US_EQ"), (x) => x.s), [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);
  assert.equal(ctx.gata("BBB_US_EQ").length, 6); assert.equal(ctx.gata("CCC_US_EQ"), null);
  assert.deepEqual(desenate, ["AAA_US_EQ", "BBB_US_EQ"]);
  ctx.IndicatoriBot = IB;
});

await test("blocul din fișă (t212IndHtml): ca la bot - închis: banda, rigla, istoria; deschis: tabelul; summary-ul de la bot; starea deschis/închis ținută; fără date ⇒ „Aștept lumânările”", () => {
  vm.runInContext(fn(T212, "t212IndHtml") + "\nthis.ih = t212IndHtml;", ctx);
  const CAP = "<summary>Detaliile indicatorilor · ca „Analizează piața”, pe bare închise (medii, Supertrend, MACD, Stochastic, Bollinger, MFI, estimarea și predicția)";
  const gol = ctx.ih("APLD_US_EQ", null, null, null, null, false);
  assert.ok(gol.startsWith('<details class="tbTrendDet t212IndDet" data-tk="APLD_US_EQ">' + CAP + '<span class="tbIndSumar" aria-hidden="true" hidden></span></summary><p class="tbSub">Aștept lumânările'));
  const tvN = { tv: "NASDAQ:APLD", iv: { "15m": { all: 0.6, ma: 0.5, osc: 0.1 }, "1h": { all: -0.6, ma: -0.5, osc: 0 }, "4h": { all: 0, ma: 0, osc: 0 }, "1D": { all: 0.2, ma: 0.3, osc: 0 } } };
  const h = ctx.ih("APLD_US_EQ", L(), IST(24), tvN, null, true);
  assert.ok(h.startsWith('<details class="tbTrendDet t212IndDet" data-tk="APLD_US_EQ" open>' + CAP + '<span class="tbIndSumar" aria-hidden="true"><span class="ibBanda"'), "deschis cum l-ai lăsat");
  assert.ok(h.includes('<span class="ibGrafice"><span class="ibRigle">') && h.includes("(≈ 12 ședințe)") && h.includes("ibTv"), "rigla, istoria în ședințe, nota TradingView în bandă");
  assert.ok(h.includes('</span></summary><div class="tbIndWrap"><table class="tbIndTab">') && h.includes("🔮 Estimare pe 2 ședințe") && h.endsWith("</p></details>"));
  assert.ok(!BOT.test(h), "nicăieri „botul”");
  assert.ok(!ctx.ih("APLD_US_EQ", L(), null, null, null, false).includes("ibSpark"), "fără istorie încă ⇒ doar rigla");
  const l4 = L(); l4[2] = { tf: "4H", eticheta: "4 ore", q: null, hp: null, eroare: "doar 12 bare închise" };
  assert.ok(!ctx.ih("APLD_US_EQ", l4, IST(24), null, null, false).includes("ibSpark"), "4 ore lipsă ⇒ fără istoria lui (ca la bot)");
});

await test("legătura în fișă: blocul stă sub grafic, pe toată lățimea fișei; se umple din lumânările fișei deschise (fără cereri noi), la desenul graficelor; calcul pe interval ținut până se schimbă barele", () => {
  assert.ok(T212.includes(`'<div class="t212Graf" id="t212Graf-' + tk + '"></div><div class="t212IndBloc" id="t212Ind-' + tk + '">' + (des ? t212IndUlt[p.ticker] || "" : "") + '</div><div class="t212DetGrila">'`));
  const g = fn(T212, "t212GraficeDeseneaza");
  assert.match(g, /if \(!faraAducere\) t212AduTf\(p\.ticker\);[^\n]*\n\s*try \{ t212IndDeseneaza\(p\.ticker\); \} catch \(e\) \{\}/, "după aducere, înainte de ieșirile graficului");
  const c = fn(T212, "t212IndCalc");
  assert.ok(c.includes("var pe = t212PeTf(tk)") && c.includes("pe[x.tf]") && c.includes('calc(j, "auto")') && c.includes("historicalProbability(j, 4)") && c.includes("j.length >= 60") && c.includes("j.length >= 260"));
  // v100.332 (auditul 12.11, Y3 / Y4): ședința se ia pe bursa poziției, iar lumânarea în formare la aducere nu devine „închisă” după ceas
  assert.ok(c.includes("t212SedintaPt(tk, acum)") && c.includes("t212IndInchise(j, x.min, acum, des, ad[x.tf])") && c.includes('x.tf === "4H"') && c.includes("t212Istoric4h(j, tk)"));
  assert.ok(!/getJSON|fetch\(/.test(c + fn(T212, "t212IndDeseneaza")), "zero cereri");
  // lumânările: aceleași ca graficul fișei - 15M / 60M / 4H aduse pentru fișa deschisă, 1D din barele zilnice (deja închise, bareBursa)
  assert.ok(T212.includes("function t212PeTf(tk) { var c = t212Tf[tk], pe = Object.assign({}, c && c.pe || {}), z = t212ZiRanduri(tk); if (z.length) pe[\"1D\"] = z; return pe; }"));
  const d = fn(T212, "t212IndDeseneaza");
  assert.ok(d.includes('tbIndSchimbari({ id: "t212:" + tk }, bd, t212VazAcum)') && d.includes("t212.indDeschis[tk]") && d.includes("t212IndUlt[tk] = h") && d.includes("el._h !== h"));
  assert.ok(T212.includes('document.addEventListener("toggle", function (e) {') && T212.includes('d.classList.contains("t212IndDet")'), "deschis / închis ținut pe poziție");
  assert.match(T212, /var T212_IND_TF = \[\{ tf: "15M", eticheta: "15 min", min: 15 \}, \{ tf: "60M", eticheta: "1 oră", min: 60 \}, \{ tf: "4H", eticheta: "4 ore", min: 240 \}, \{ tf: "1D", eticheta: "1 zi", min: 1440 \}\];/);
});

await test("„era ↗” (ce s-a schimbat de la ultima privire) și pe fișă: aceeași funcție a Tabloului, cu cheia poziției și „văzut” = pagina T212 la vedere", () => {
  const s = fn(APP, "tbIndSchimbari");
  assert.ok(s.startsWith("function tbIndSchimbari(b,bd,vaz){") && s.includes("&&(vaz||tbVazAcum)()"));
  assert.ok(APP.includes("sch=tbIndSchimbari(b,bd)"), "Tabloul îl cheamă ca înainte");
  assert.ok(fn(T212, "t212VazAcum").includes("t212LaVedere()"));
});

await test("stilul: regulile benzii, riglei, istoriei, rândului închis și tabelului prind și fișa T212 (:is(#tabloubot,#t212)); tabelul rămâne TABEL în celula fișei; banda 2 × 2 când fișa e îngustă", () => {
  for (const r of [":is(#tabloubot,#t212) .ibBanda{display:grid;", ":is(#tabloubot,#t212) .ibCel{", ":is(#tabloubot,#t212) .tbIndSumar{container-type:inline-size}",
    ":is(#tabloubot,#t212) .ibGrafice{display:grid;", ":is(#tabloubot,#t212) .ibSpG{flex:1 1 0;min-width:120px;height:56px}", ":is(#tabloubot,#t212) :is(.ibSpVal,.ibSpEtP){paint-order:stroke;",
    ":is(#tabloubot,#t212) .tbIndTab td{", ":is(#tabloubot,#t212) .tbIndPred{", ":is(#tabloubot,#t212) .tbTrendDet>summary{cursor:pointer;",
    ":is(#tabloubot,#t212) .tbIndTab{font-size:12px}", ":is(#tabloubot,#t212).tbZi .tbIndTab th{"])
    assert.ok(CSS.includes(r), "lipsește: " + r);
  assert.ok(!/(^|\n|\})#tabloubot \.(ib[A-Z]|tbInd(Tab|Wrap|Pred|Nota|Est|Sumar)|tbTrendDet)[^{]*\{/.test(CSS.replace("@media (min-width:1181px) and (max-width:1699px){\n#tabloubot .ibBanda{", "")), "nicio regulă rămasă doar pe Tablou");
  assert.ok(CSS.includes("@media (min-width:1181px) and (max-width:1699px){\n#tabloubot .ibBanda{grid-template-columns:repeat(2,minmax(0,1fr))}\n}"), "2 × 2 în jumătatea cardului Trend: doar Tabloul");
  const i = CSS.indexOf("/* v100.328 · „Detaliile indicatorilor” și în fișa Trading 212"), B = CSS.slice(i, CSS.indexOf("/* v100.328: sfârșitul detaliilor indicatorilor în T212 */"));
  assert.ok(i > 0 && B.length > 100);
  for (const r of ["#t212 .t212IndBloc{margin:10px 0 4px;min-width:0}", "#t212 .t212Det .tbIndTab{display:table}", "#t212 .t212Det .tbIndTab thead{display:table-header-group}",
    "#t212 .t212Det .tbIndTab tbody{display:table-row-group}", "#t212 .t212Det .tbIndTab tr{display:table-row}",
    "#t212 .t212Det .tbIndTab :is(td,th){display:table-cell;font-size:12px;border-bottom:0;background:transparent}",
    "@container (max-width:560px){#t212 .ibBanda{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none}}",
    // poza copiei la 1920: fișa are 1312 px, tabelul întins pe toată lățimea ținea cifrele departe de nume ⇒ cât banda și cartelele (760)
    "#t212 .t212IndDet>:is(.tbIndWrap,.tbIndPred,.tbIndNota){max-width:760px}"])
    assert.ok(B.includes(r), "lipsește: " + r);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
