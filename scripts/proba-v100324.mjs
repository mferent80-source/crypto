// Proba v100.324 (11.11.2026, el: „detaliile indicatorilor când e închis să arate un grafic sau o bară cu direcția sau scorul, vino cu idei”
// ⇒ I-857..I-861 ⇒ „fă toate”): în rândul ÎNCHIS al lui „Detaliile indicatorilor” (cardul Trendul pe TF-uri):
//   I-857 banda celor 4 intervale (15m · 1h · 4h · 1z): săgeata + scorul, și câți din cei 8 indicatori sunt cu botul / neutri / împotrivă;
//   I-858 rigla scorului 0–100 cu pragul ADEVĂRAT al fiecărui interval (calc: 64–67, nu 60/40), pe 1h, 4h, 1z;
//   I-859 sub fiecare căsuță nota TradingView a aceluiași interval, cu „≠” când direcțiile sunt opuse;
//   I-860 „era ↔” pe intervalul al cărui verdict s-a schimbat de la ultima ta privire;
//   I-861 mini-istoria scorului pe 4 ore (ultimele 24 de bare închise), cu pragurile.
// Totul din ce e deja calculat (zero cereri noi); culorile raportate la direcția botului (la short, „coboară” e cu botul).
//   node scripts/proba-v100324.mjs
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
console.log("\nV100.324 · indicatorii în rândul închis (bandă, riglă, TradingView, schimbări, istoria scorului) · proba\n");
const J = (x) => JSON.parse(JSON.stringify(x));
function modul() {
  const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, Date, RegExp, Intl, TextRo: globalThis.TextRo };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "tv-note.js") + "\n" + citeste("public", "lib", "indicatori-bot.js") + "\nthis.IB = IndicatoriBot; this.TV = TvNote;", ctx);
  return ctx;
}
const { IB, TV } = modul();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// urcă: medii ↑, Supertrend ↑, MACD ↑, ADX 30 cu +DI, RSI 60, Bollinger 60%, MFI 55 = 7 „sus”; Stochastic 85 = încins
const Q_SUS = () => ({ ver: "BULLISH", score: 72, prag: 66, ema: true, emaDir: "UP", e20Now: 3, e50Now: 2, e200Now: 1, supertrend: "BULL", macd: true, adx: 30, pdi: 25, mdi: 15, rsi: 60, stoch: 85, bbpos: 60, mfi: 55 });
// coboară: medii ↓ (20 < 50 < 200), Supertrend ↓, MACD ↓, RSI 40, Stochastic 30 = 5 „jos”; ADX 15 (fără trend) și Bollinger 50% neutri; MFI fără volum
const Q_JOS = () => ({ ver: "BEARISH", score: 30, prag: 64, ema: false, emaDir: "DOWN", e20Now: 1, e50Now: 2, e200Now: 3, supertrend: "BEAR", macd: false, adx: 15, pdi: 10, mdi: 20, rsi: 40, stoch: 30, bbpos: 50, mfi: null });
const R = () => [{ eticheta: "15 min", q: Q_SUS() }, { eticheta: "1 oră", q: null }, { eticheta: "4 ore", q: Q_JOS() }, { eticheta: "1 zi", q: Q_SUS() }];

// ───────────── I-857 banda ─────────────
await test("I-857 banda: 4 intervale, cei 8 indicatori numărați față de bot (short: „coboară” e cu botul); încinșii sunt neutri, lipsa nu se numără", () => {
  const b = J(IB.banda(R(), "short"));
  assert.deepEqual(b.map((x) => x.scurt), ["15m", "1h", "4h", "1z"]);
  assert.deepEqual(b.map((x) => x.lung), [false, false, true, true]);
  assert.equal(b[1].lipsa, true);
  const j = b[2];   // 4 ore, coboară, bot short
  assert.equal(j.sageata, "↓"); assert.equal(j.scor, 30); assert.equal(j.prag, 64); assert.equal(j.fata, "cu");
  assert.deepEqual([j.cu, j.neutru, j.contra, j.incinsi, j.total], [5, 2, 0, 0, 7]);
  assert.deepEqual(j.numeCu, ["Medii EMA", "Supertrend", "MACD", "RSI", "Stochastic"]);
  assert.deepEqual(j.numeNeutru, ["ADX", "Bollinger"]);
  const s = b[0];   // 15 min, urcă, bot short ⇒ împotrivă
  assert.equal(s.fata, "contra"); assert.deepEqual([s.cu, s.neutru, s.contra, s.incinsi, s.total], [0, 1, 7, 1, 8]);
  assert.deepEqual(s.numeIncinsi, ["Stochastic"]);
});
await test("I-857 banda: la long se întoarce; la botul fără direcție nu e „cu / împotrivă”, ci sus / jos", () => {
  const l = J(IB.banda(R(), "long"));
  assert.equal(l[0].fata, "cu"); assert.deepEqual([l[0].cu, l[0].contra], [7, 0]);
  assert.equal(l[2].fata, "contra"); assert.deepEqual([l[2].cu, l[2].contra], [0, 5]);
  const n = J(IB.banda(R(), "neutral"));
  assert.equal(n[0].fata, null); assert.equal(n[0].faraDirectie, true); assert.deepEqual([n[0].cu, n[0].contra], [7, 0], "fără direcție: „cu” = sus, „contra” = jos");
});
await test("revizia 11.11: mediile EMA numărate SIMETRIC în bandă — 20 > 50 > 200 sus, 20 < 50 < 200 jos, altfel neutru (tabelul număra „20 sub 50” ca jos și când 50 > 200, iar oglinda lui ca neutru)", () => {
  const pe = (e20, e50, e200, dir) => { const q = Object.assign(Q_SUS(), { ema: e20 > e50 && e50 > e200, emaDir: e20 > e50 ? "UP" : "DOWN", e20Now: e20, e50Now: e50, e200Now: e200 }); const x = J(IB.banda([{ eticheta: "4 ore", q }], dir))[0]; return x.numeCu.includes("Medii EMA") ? "cu" : x.numeContra.includes("Medii EMA") ? "contra" : x.numeNeutru.includes("Medii EMA") ? "neutru" : "?"; };
  assert.equal(pe(1, 2, 0, "short"), "neutru", "20 < 50, dar 50 > 200: nu e coborâre așezată");
  assert.equal(pe(2, 1, 3, "long"), "neutru", "oglinda: 20 > 50, dar 50 < 200");
  assert.equal(pe(1, 2, 3, "short"), "cu"); assert.equal(pe(3, 2, 1, "long"), "cu");
  assert.equal(pe(1, 2, 3, "long"), "contra"); assert.equal(pe(3, 2, 1, "short"), "contra");
});
await test("I-857 desenul benzii: căsuța spune săgeata, scorul și cele trei numere în text (nu doar culoare), cu numele în titlu; escape", () => {
  const b = IB.banda(R(), "short");
  const h = IB.bandaHtml(b, null, null, "short", esc);
  assert.match(h, /^<span class="ibBanda" role="group" aria-label="Indicatorii pe 4 intervale, față de botul tău \(short\)">/);
  assert.match(h, /<span class="ibCel ibLung ibCu" title="4 ore: coboară, scor 30 · cu botul: Medii EMA, Supertrend, MACD, RSI, Stochastic · neutri: ADX, Bollinger"><span class="ibTf">4h<\/span><span class="ibVer">↓ 30<\/span>/);
  assert.match(h, /<span class="ibBara" aria-hidden="true"><i class="ibB ibBCu" style="flex-grow:5"><\/i><i class="ibB ibBNeutru" style="flex-grow:2"><\/i><\/span><span class="ibNr">5 cu · 2 · 0 împ\.<\/span>/);
  // revizia: „la extreme” (RSI 25 e epuizat, nu încins)
  assert.match(h, /<span class="ibCel ibContra" title="15 min: urcă, scor 72 · împotrivă: Medii EMA, Supertrend, MACD, ADX, RSI, Bollinger, MFI \(bani\) · la extreme: Stochastic"><span class="ibTf">15m<\/span><span class="ibVer">↑ 72<\/span>/);
  assert.match(h, /<span class="ibCel ibLipsa" title="1 oră: prea puține bare închise"><span class="ibTf">1h<\/span><span class="ibVer">—<\/span><\/span>/);
  // revizia: căsuța goală spune motivul adevărat când îl are
  assert.match(IB.bandaHtml(IB.banda([{ eticheta: "1 oră", q: null, eroare: "doar 41 de bare închise" }], "short"), null, null, "short", esc), /title="1 oră: doar 41 de bare închise"/);
  // revizia: fără esc dat, textul tot se escapează
  const fara = IB.bandaHtml(IB.banda([{ eticheta: "<b>x</b>", q: Q_SUS() }], "long"), null, null, "long");
  assert.ok(fara.includes("&lt;b&gt;x&lt;/b&gt;") && !fara.includes("<b>x</b>"));
  // revizia: lângă prag scorul cu o zecimală (63,6 nu e „64” cu ↔)
  const lp = J(IB.banda([{ eticheta: "4 ore", q: Object.assign(Q_SUS(), { ver: "NEUTRAL", score: 63.6, prag: 64 }) }], "long"))[0];
  assert.equal(lp.scorTxt, "63,6"); assert.equal(J(IB.banda(R(), "short"))[2].scorTxt, "30");
  assert.match(IB.bandaHtml([lp], null, null, "long", esc), /<span class="ibVer">↔ 63,6<\/span>/);
  assert.match(h, /<i class="ibB ibBIncins" style="flex-grow:1"><\/i>/, "încinsul are bucata lui (aurie), în partea neutră");
  const n = IB.bandaHtml(IB.banda(R(), "neutral"), null, null, "neutral", esc);
  assert.match(n, /aria-label="Indicatorii pe 4 intervale \(botul n-are direcție: sus \/ jos\)"/);
  assert.match(n, /<span class="ibNr">7 sus · 1 · 0 jos<\/span>/);
});

// ───────────── I-858 rigla ─────────────
await test("I-858 rigla: pe 1h, 4h, 1z, cu pragul ADEVĂRAT al intervalului (q.prag, nu 60/40); zona care ajută botul e marcată; fără prag ⇒ fără zone inventate", () => {
  const h = IB.riglaHtml(IB.banda(R(), "short"), "short", esc);
  assert.match(h, /^<span class="ibRigle">/);
  // 4 ore: prag 64 ⇒ coboară sub 36, urcă peste 64; botul short ⇒ zona de jos e „bună”
  // revizia: regula e ≥ prag / ≤ 100 − prag ⇒ „până la 36 coboară, de la 64 urcă”
  assert.match(h, /<span class="ibRigla" title="4 ore: scor 30 · până la 36 coboară, de la 64 urcă \(pragul acestui interval\) · zona care ajută botul e marcată"><span class="ibRtf">4h<\/span><span class="ibRbara"><i class="ibZ ibZjos ibZbun" style="width:36%"><\/i><i class="ibZ ibZneutru" style="width:28%"><\/i><i class="ibZ ibZsus ibZrau" style="width:36%"><\/i><b class="ibRsemn" style="left:30%"><\/b><\/span><span class="ibRnr">30<\/span><\/span>/);
  assert.match(h, /<span class="ibRigla" title="1 zi: scor 72 · până la 34 coboară, de la 66 urcă/);
  assert.doesNotMatch(h, /1 oră: scor/, "1 oră fără date ⇒ fără riglă");
  const fp = IB.riglaHtml(IB.banda([{ eticheta: "4 ore", q: Object.assign(Q_JOS(), { prag: undefined }) }], "short"), "short", esc);
  assert.doesNotMatch(fp, /ibZjos/, "fără pragul din calcul nu se desenează zone");
  assert.match(fp, /<b class="ibRsemn" style="left:30%"><\/b>/);
});
await test("I-858: calc întoarce pragul cu care a hotărât verdictul (prag: threshold), ca rigla să nu-l scrie a doua oară", () => {
  const APP = citeste("public", "app.js");
  assert.match(APP, /ver,prag:threshold,breakout:bo/);
  assert.match(APP, /let threshold=p\.signal,ver=score>=threshold\?"BULLISH":score<=100-threshold\?"BEARISH":"NEUTRAL"/);
});

// ───────────── I-859 TradingView ─────────────
await test("I-859 TradingView: nota aceluiași interval sub căsuță (15m, 1h, 4h, 1D), „≠” când direcția e opusă Radarului; fără notă ⇒ nimic", () => {
  const n = { iv: { "15m": { all: -0.62 }, "1h": { all: 0.05 }, "4h": { all: -0.3 }, "1D": { all: -0.2 } } };
  const t = J(IB.tvBanda(n, IB.banda(R(), "short"), TV.clasa));
  assert.deepEqual(t.map((x) => x && x.cod), ["vinde-tare", "neutru", "vinde", "vinde"]);
  assert.deepEqual(t.map((x) => x && x.diferit), [true, false, false, true], "15m: Radar urcă, TV vinde tare ⇒ ≠; 1z: Radar urcă, TV vinde ⇒ ≠");
  const h = IB.bandaHtml(IB.banda(R(), "short"), IB.tvBanda(n, IB.banda(R(), "short"), TV.clasa), null, "short", esc);
  assert.match(h, /<span class="ibTv ibTvCu" title="TradingView 4 ore: vinde \(−0,3\)">TV vinde<\/span>/);
  assert.match(h, /<span class="ibTv ibTvCu" title="TradingView 15 min: vinde tare \(−0,6\)">TV vinde tare<\/span><em class="ibDif" title="Radarul \(bare închise, Pionex\) și TradingView \(bara în curs, Binance\) arată direcții opuse pe 15 min">≠<\/em>/);
  assert.equal(IB.tvBanda(null, IB.banda(R(), "short"), TV.clasa), null);
});

// ───────────── I-860 schimbările ─────────────
await test("I-860: „era ↔” doar pe intervalul al cărui verdict s-a schimbat față de ultima ta privire; prima privire ⇒ nimic", () => {
  const b = IB.banda(R(), "short");
  assert.deepEqual(J(IB.amintire(b)), { "15 min": "↑", "4 ore": "↓", "1 zi": "↑" });
  assert.deepEqual(J(IB.schimbari(null, b)), [null, null, null, null]);
  const s = J(IB.schimbari({ "15 min": "↑", "4 ore": "↔", "1 zi": "↓" }, b));
  assert.deepEqual(s, [null, null, { era: "↔", acum: "↓" }, { era: "↓", acum: "↑" }]);
  const h = IB.bandaHtml(b, null, IB.schimbari({ "4 ore": "↔" }, b), "short", esc);
  assert.match(h, /<span class="ibCel ibLung ibCu ibSchimbat" title="4 ore: coboară, scor 30 · s-a schimbat de la ultima ta privire \(era ↔\) ·/);
  assert.match(h, /<span class="ibEra">era ↔<\/span>/);
});

// ───────────── I-861 istoria scorului ─────────────
await test("I-861 istoricScor: scorul pe ultimele N bare închise, cu calculul dat (ferestre care se termină pe fiecare bară), cele vechi primele", () => {
  const j = Array.from({ length: 100 }, (_, i) => ({ c: i }));
  const fals = (x) => ({ score: x.length, prag: 65 });
  const s = J(IB.istoricScor(j, 5, fals));
  assert.deepEqual(s, [{ s: 96, prag: 65 }, { s: 97, prag: 65 }, { s: 98, prag: 65 }, { s: 99, prag: 65 }, { s: 100, prag: 65 }]);
  assert.equal(IB.istoricScor(j.slice(0, 62), 24, fals).length, 3, "sub 60 de bare calculul nu se face");
  assert.deepEqual(J(IB.istoricScor(j, 3, () => null)), [], "calcul picat ⇒ nimic");
});
await test("I-861 desenul: linia scorului, pragurile ca linii, punctul de acum, titlul spune de unde până unde; botul short ⇒ zona de jos marcată", () => {
  const ist = [{ s: 50, prag: 64 }, { s: 45, prag: 64 }, { s: 38, prag: 64 }];
  const h = IB.sparkHtml(ist, "short", esc);
  assert.match(h, /^<span class="ibSpark" title="Scorul pe 4 ore, ultimele 3 bare închise: de la 50 la 38 · liniile = pragurile \(36 \/ 64\)">/);
  assert.match(h, /<svg viewBox="0 0 120 32" width="120" height="32" aria-hidden="true">/);
  assert.match(h, /<rect class="ibSpBun" x="0" y="20\.48" width="120" height="11\.52"><\/rect>/, "short: zona de sub 36 (coboară) e cea bună");
  assert.match(h, /<line class="ibSpPrag" x1="0" x2="120" y1="11\.52" y2="11\.52"><\/line><line class="ibSpPrag" x1="0" x2="120" y1="20\.48" y2="20\.48"><\/line>/);
  assert.match(h, /<polyline class="ibSpLinie" points="2,16 60,17\.6 118,19\.84"><\/polyline><circle class="ibSpAcum" cx="118" cy="19\.84" r="2\.5"><\/circle>/);
  assert.match(h, /<span class="ibSpEt">4h · 24 bare<\/span>|<span class="ibSpEt">4h · 3 bare<\/span>/);
  assert.equal(IB.sparkHtml([{ s: 50, prag: 64 }], "short", esc), "", "un singur punct nu e o istorie");
});

// ───────────── pagina ─────────────
await test("pagina: rândul închis are locul lui (#tbIndSumar în <summary>, ascuns cititorului de ecran — tabelul rămâne sursa), textul vechi rămâne; renderTabloIndicatori îl umple doar când se schimbă și îl golește fără bot / fără lumânări", () => {
  const HTML = citeste("public", "index.html");
  assert.match(HTML, /<details class="tbTrendDet" id="tbTrendDet"><summary>Detaliile indicatorilor · ca „Analizează piața”, pe bare închise \(medii, Supertrend, MACD, Stochastic, Bollinger, MFI, estimarea și predicția\)<span class="tbIndSumar" id="tbIndSumar" aria-hidden="true" hidden><\/span><\/summary>/);
  const APP = citeste("public", "app.js");
  const i = APP.indexOf("function renderTabloIndicatori("), f = APP.slice(i, APP.indexOf("\nfunction ", i + 10));
  assert.match(f, /IndicatoriBot\.bandaHtml\(bd,tvb,sch,b\.directie,escapeHtml\)\+IndicatoriBot\.riglaHtml\(bd,b\.directie,escapeHtml\)/);
  assert.match(f, /if\(tbStare\.indSumarHtml!==hs\)\{sm\.innerHTML=hs;tbStare\.indSumarHtml=hs\}/);
  assert.equal((f.match(/tbIndSumarGol\(\)/g) || []).length, 2, "fără bot și fără lumânări ⇒ golit");
  // revizia: istoria pe 4 ore doar când 4 ore e în bandă (altfel desenul vechi lângă „—”)
  assert.match(f, /b4=bd\.filter\(function\(x\)\{return x\.eticheta==="4 ore"\}\)\[0\],ist=b4&&!b4\.lipsa\?tbIstoric4hGata\(d\.simbol\):null/);
});
// revizia: 24 de calcule × ~16 ms blocau pagina la fiecare încărcare și schimbare de bot ⇒ istoria se ține pe monedă și pe bară (în afara lui d),
// se socotesc doar barele noi (de obicei una), în bucăți de câte 4, DUPĂ desen, apoi un redesen
const IST = (() => { const APP = citeste("public", "app.js"); const ia = (n) => { const a = APP.indexOf("function " + n + "("); let p = 0, z = APP.indexOf("{", a); for (; z < APP.length; z++) { if (APP[z] === "{") p++; else if (APP[z] === "}" && --p === 0) break; } return APP.slice(a, z + 1); };
  const decl = /var tbIst4h=\{[^;]*\};/.exec(APP); assert.ok(decl, "lipsește var tbIst4h");
  return decl[0] + "\n" + ia("tbIstoric4h") + "\n" + ia("tbIstoric4hGata"); })();
function istoric() {
  const ctx = modul(); let calcule = 0, desene = 0; const amanate = [];
  Object.assign(ctx, { calc: (j) => { calcule++; return { score: j.length % 100, prag: 65 }; }, IndicatoriBot: ctx.IB, setTimeout: (f) => { amanate.push(f); }, renderTabloIndicatori: () => { desene++; } });
  vm.runInContext(IST + "\nthis.ist = tbIstoric4h; this.gata = tbIstoric4hGata;", ctx);
  const ruleaza = () => { while (amanate.length) amanate.shift()(); };
  return { ctx, ruleaza, n: () => calcule, d: () => desene };
}
const BARE = (n, t0 = 0) => Array.from({ length: n }, (_, i) => [t0 + i * 14400000, "1", "1", "1", "1", "1"]);
await test("revizia I-861: istoria pe 4 ore nu se socotește pe loc — după desen, în bucăți; apoi un redesen; gata ⇒ 24 de puncte", () => {
  const { ctx, ruleaza, n, d } = istoric();
  ctx.ist(BARE(200), "STX|short");
  assert.equal(n(), 0, "nimic pe loc (pagina nu se blochează)");
  assert.equal(ctx.gata("STX|short"), null);
  ruleaza();
  assert.equal(n(), 24); assert.equal(d(), 1, "un singur redesen la final");
  const g = J(ctx.gata("STX|short")); assert.equal(g.length, 24); assert.deepEqual(g[23], { s: 0, prag: 65 }, "ultimul punct = fereastra întreagă (200 de bare)");
});
await test("revizia I-861: aceleași bare ⇒ niciun calcul; o bară nouă ⇒ un singur calcul; altă monedă ⇒ de la capăt", () => {
  const { ctx, ruleaza, n } = istoric();
  ctx.ist(BARE(200), "STX|short"); ruleaza(); assert.equal(n(), 24);
  ctx.ist(BARE(200), "STX|short"); ruleaza(); assert.equal(n(), 24, "aceleași bare");
  ctx.ist(BARE(201), "STX|short"); ruleaza(); assert.equal(n(), 25, "o bară nouă ⇒ un calcul");
  assert.equal(J(ctx.gata("STX|short")).length, 24, "tot ultimele 24");
  assert.equal(ctx.gata("BTC|long"), null);
  ctx.ist(BARE(201), "BTC|long"); ruleaza(); assert.equal(n(), 49);
});
await test("revizia I-861: tbCalculeazaIndicatorii cere istoria într-un try SEPARAT (o eroare a ei nu anulează indicatorul de 4 ore)", () => {
  const APP = citeste("public", "app.js");
  const i = APP.indexOf("function tbCalculeazaIndicatorii("), f = APP.slice(i, APP.indexOf("\nfunction ", i + 10));
  assert.match(f, /if\(x\.tf==="4H"&&q\)\{try\{tbIstoric4h\(j,d\.simbol\)\}catch\(e2\)\{\}\}/);
  assert.doesNotMatch(f, /d\.istoric4h/);
});
await test("pagina: „ultima ta privire” la indicatori se ține în browser (indVazut:<bot>) și se reia după ≥ 30 min cu pagina ascunsă, ca la Contează acum", () => {
  const APP = citeste("public", "app.js");
  assert.match(APP, /function tbVazutAscultator\(\)\{if\(tbVazutAscultator\.pus\|\|typeof document==="undefined"\|\|!document\.addEventListener\)return;tbVazutAscultator\.pus=1;document\.addEventListener\("visibilitychange",function\(\)\{if\(document\.hidden\)\{tbStare\.ctAscunsLa=Date\.now\(\);return\}if\(tbStare\.ctAscunsLa&&Date\.now\(\)-tbStare\.ctAscunsLa>=1800000\)\{tbStare\.ctMem=null;tbStare\.ctHtml=null;tbStare\.indMem=null;tbStare\.indSumarHtml=null\}tbStare\.ctAscunsLa=0\}\)\}/);
  assert.match(APP, /function tbIndSchimbari\(b,bd\)\{/);
  assert.match(APP, /"indVazut:"\+b\.id/);
});
await test("revizia: „ultima privire” se scrie doar cât VEZI Tabloul (nu cât ești pe altă pagină) și păstrează intervalele care lipsesc la un desen", () => {
  const APP = citeste("public", "app.js");
  assert.match(APP, /function tbVazAcum\(\)\{return \(typeof tbPanouVizibil!=="function"\|\|tbPanouVizibil\(\)\)&&!\(typeof document!=="undefined"&&document\.hidden\)\}/);
  const i = APP.indexOf("function tbIndSchimbari("), f = APP.slice(i, APP.indexOf("\nfunction ", i + 10));
  assert.match(f, /var tot=Object\.assign\(\{\},o\.stocat\|\|\{\},acum\),sv=JSON\.stringify\(tot\);if\(o\.scris!==sv&&tbVazAcum\(\)\)/);
  const c = APP.indexOf("function tbConteazaImbogateste("), g = APP.slice(c, APP.indexOf("\nfunction ", c + 10));
  assert.match(g, /if\(mem\.o\.scris!==sv&&\(typeof tbVazAcum!=="function"\|\|tbVazAcum\(\)\)\)/, "și la Contează acum");
});
await test("stilul: blocul v100.324 are banda, rigla, nota TV, schimbarea și istoria; mărimile pe scara Tabloului (12 / 13,5); pe telefon și în coloana îngustă banda trece pe 2 × 2; [hidden] chiar ascunde", () => {
  const CSS = citeste("public", "app.css");
  const i = CSS.indexOf("/* v100.324 · indicatorii în rândul închis"), k = CSS.indexOf("/* v100.324: sfârșitul indicatorilor în rândul închis */");
  assert.ok(i > 0 && k > i, "blocul lipsește");
  const B = CSS.slice(i, k);
  for (const c of [".ibBanda{", ".ibCel{", ".ibBCu{background:var(--pzSus)}", ".ibBContra{background:var(--pzJos)}", ".ibBIncins{background:var(--pzAur)}", ".ibRigla{", ".ibZbun{", ".ibZrau{", ".ibRsemn{", ".ibTv{", ".ibDif{", ".ibEra{", ".ibSpark{", ".ibSpLinie{", ".ibSchimbat{"])
    assert.ok(B.includes(c), "lipsește " + c);
  // revizia: în afara scării (11 px, 14 px) stratul generat nu le prindea (stătea înaintea blocului)
  for (const m of B.matchAll(/font-size:([\d.]+)px/g)) assert.ok(["12", "13.5", "15", "20", "30"].includes(m[1]), "mărime în afara scării: " + m[1] + " px");
  // 4 pe rând când e loc; 2 × 2 în jumătatea cardului Trend la 1181–1699 (~446–700 px) și pe telefon (~366 px) — nu 3 + 1
  assert.match(B, /#tabloubot \.ibBanda\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(B, /@media \(min-width:1181px\) and \(max-width:1699px\)\{\n#tabloubot \.ibBanda\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(B, /@media \(max-width:640px\)\{\n#tabloubot \.ibBanda\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(B, /\.ibNr\{[^}]*white-space:normal/); assert.match(B, /\.ibTv\{[^}]*white-space:normal/);
  // singurul „ascuns”: atributul hidden (fără bot / fără lumânări), pe care display:flex îl bătea
  assert.deepEqual(B.match(/[^\n{}]*\{display:none[^}]*\}/g).map((r) => r.trim()), ["#tabloubot .tbIndSumar[hidden]{display:none}"]);
  assert.doesNotMatch(B, /visibility:hidden/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
