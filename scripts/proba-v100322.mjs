// Proba v100.322 (11.11.2026, el: „am pus TP dar Contează acum și pagina botului nu îl vede”):
//   botul STX short 3× are take-profit-ul pus în Pionex la 0.3025 (ruta îl dă: opritorProfitActiv, opritorProfit 0.3025, tip „pret”),
//   dar sfatul „zero” tot cerea „Aș pune take-profit-ul botului la 0.3022” (cu butonul de copiere), „Contează acum” îl lua de acolo,
//   iar graficul desena doar stopul botului (niveluriBot nu avea take-profit-ul). Acum:
//   1. Sfaturi: cu take-profit pus, sfatul „zero” spune că e PUS și câți bani iei acolo (TabloExtra.totalLaTinta), fără „aș pune” / copiere;
//   2. Conteaza: rândul devine „✓ take-profit pus” (verde, ultimul), nu „urmărește”;
//   3. graficul: linia „take-profit-ul tău” (verde, plină) + în legendă + în „Ce e pe grafic”;
//   4. „Dacă prețul ajunge la…”: rândul take-profit-ului.
//   node scripts/proba-v100322.mjs
import "./lib/text-ro-global.mjs";   // garda din proba v10062: o probă care pomenește sfaturi.js încarcă întâi TextRo
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.322 · take-profit-ul pus se vede în pagina botului · proba\n");
const J = (x) => JSON.parse(JSON.stringify(x));
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const inc = (f, n) => new Function(citeste("public", "lib", f) + `; return ${n};`)();
const Sfaturi = inc("sfaturi.js", "Sfaturi");
function modul(...fis) {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo };
  vm.createContext(ctx);
  vm.runInContext(fis.map((f) => citeste("public", "lib", f)).join("\n") + "\nthis.Conteaza = typeof Conteaza !== 'undefined' ? Conteaza : null; this.GraficBot = typeof GraficBot !== 'undefined' ? GraficBot : null;", ctx);
  return ctx;
}

// botul lui, cum îl dă ruta pe 11.11 (VPS): STX short 3×, prețul 0.3163, take-profit 0.3025 (preț), stopul 0.34 (preț)
const BOT = (o = {}) => Object.assign({ id: "2637", baza: "STX.PERP", directie: "short", levier: 3, activ: true, pretCurent: 0.3163, investit: 72.73, profitTotal: -4.84,
  gridJos: 0.29, gridSus: 0.325, distantaLichidarePct: 40, opritorPierdereActiv: true, opritorPierdere: 0.34, opritorPierdereTip: "pret",
  opritorProfitActiv: true, opritorProfit: 0.3025, opritorProfitTip: "pret", opritorProfitRaport: null }, o);
const ZERO = { pretZero: 0.3022, distantaZeroPct: -0.0446, iei: 67.89 };
const sfat = (b, laTinta) => Sfaturi.sfaturi({ bot: b, scen: null, sanse: {}, rezumat: null, futures: null, funding: null, fisa: null, costuri: null, zero: ZERO, laTinta, geom: null, ritm: null })
  .filter((s) => s.cod === "zero")[0];

// ───────────── 1. Sfaturi ─────────────
await test("Sfaturi: FĂRĂ take-profit, sfatul „zero” rămâne cum era („Aș pune take-profit-ul botului la 0.3022” + copierea)", () => {
  const s = sfat(BOT({ opritorProfitActiv: false, opritorProfit: null }), null);
  assert.ok(s, "sfatul zero lipsește");
  assert.match(s.faCe, /^Aș pune take-profit-ul botului la 0\.3022 ca să ies fără pierdere/);
  assert.deepEqual(J(s.copiaza), [{ ce: "take-profit", pret: "0.3022" }]);
  assert.ok(!s.tpPus);
});
await test("Sfaturi: CU take-profit pus (0.3025, botul lui), sfatul spune că e PUS și câți bani iei acolo — fără „aș pune”, fără copiere", () => {
  const s = sfat(BOT(), -0.21);
  assert.ok(s, "sfatul zero lipsește");
  assert.equal(s.tpPus, true);
  assert.match(s.titlu, /^Take-profit-ul tău e pus la 0\.3025/);
  // o singură frază (garda de text din proba v10062)
  assert.match(s.text, /^Când se atinge, ieși cu −0,2 USDT în total; închis acum, ai lua 67,9 USDT din 72,73 investiți\.$/);   // rezultatul cu o zecimală, investiția la ban
  assert.doesNotMatch(s.titlu + s.text + s.faCe, /Aș pune take-profit/);
  assert.ok(!s.copiaza || !s.copiaza.length, "fără butonul de copiere: e deja pus");
  // ieșirea exact pe zero e la 0.3022: o spune ca informație, nu ca ordin
  assert.match(s.faCe, /0\.3022/);
});
await test("Sfaturi: take-profit dincolo de zero (iese pe plus) ⇒ ton „bine”, „+1,5 USDT”, nimic de făcut", () => {
  const s = sfat(BOT({ opritorProfit: 0.3 }), 1.53);
  assert.equal(s.tpPus, true); assert.equal(s.ton, "bine");
  assert.match(s.text, /\+1,5 USDT/); assert.equal(s.faCe || "", "");
});
await test("Sfaturi.intrare: banii la take-profit vin din TabloExtra.totalLaTinta (aceeași socoteală ca zero-ul)", () => {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo,
    TabloExtra: { totalLaTinta: (b) => (b.opritorProfitActiv ? -0.21 : null), dacaInchizi: () => ZERO, grileVsCosturi: () => null, geometrieBot: () => null } };
  vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "sfaturi.js") + "\nthis.Sfaturi = Sfaturi;", ctx);
  const x = ctx.Sfaturi.intrare({ bot: BOT(), acum: Date.now() });
  assert.equal(x.laTinta, -0.21);
});

// ───────────── 2. Conteaza ─────────────
await test("Conteaza: rândul take-profit-ului pus e „✓ take-profit pus”, verde, după rândurile care cer o hotărâre", () => {
  const { Conteaza } = modul("text-ro.js", "curba-stop.js", "conteaza.js");
  const zero = sfat(BOT(), -0.06);   // cazul lui: practic pe zero ⇒ „bine” ⇒ verde
  const l = J(Conteaza.alege({ sfaturi: [zero, { cod: "margine", ton: "atentie", parte: "sus", titlu: "Marginea de sus (0.3250) e cu 2,9% peste preț", pctJos: 2.9, faCe: "N-aș mări levierul." }], lista: [], sanse: [] }));
  assert.deepEqual(l.map((x) => x.cheie), ["margine", "zero"]);
  assert.equal(l[1].ton, "verde"); assert.equal(l[1].nr, "✓"); assert.equal(l[1].nrSub, "take-profit pus");
  const h = Conteaza.html(l, (s) => String(s));
  assert.match(h, /class="ctRand ctVerde"><div class="ctNr">✓<small>take-profit pus<\/small>/);
  assert.doesNotMatch(text(h), /copiază take-profit/);
  // Acasă nu urcă un rând „pus” (nu cere nimic)
  assert.equal(Conteaza.acasa([l[1]], "STX"), null);
});

// ───────────── 3. graficul ─────────────
const GB = () => modul("grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "grafic-bot.js").GraficBot;
await test("graficul: take-profit-ul pus e o linie „take-profit-ul tău” (verde, plină); stins ⇒ nu", () => {
  const g = GB();
  const n = J(g.niveluriBot({ bot: BOT() })).filter((x) => x.k === "tp")[0];
  assert.ok(n, "nivelul take-profit-ului lipsește");
  assert.equal(n.p, 0.3025); assert.equal(n.t, "take-profit-ul tău"); assert.equal(n.c, g.COL.good); assert.equal(n.st, "solid");
  assert.ok(!J(g.niveluriBot({ bot: BOT({ opritorProfitActiv: false }) })).some((x) => x.k === "tp"));
});
await test("graficul: legenda are „take-profit-ul tău” când linia e pe grafic", () => {
  const src = citeste("public", "lib", "grafic-bot.js");
  assert.match(src, /if \(are\("tp"\)\) Lg\.push\('<span><i style="border-color:' \+ COL\.good \+ '"><\/i>take-profit-ul tău<\/span>'\);/);
  // și pe rândul scurt al modului „Simplu” (poza 2560 din demo: „zero · plan + · plan − · stop”, fără take-profit)
  assert.match(src, /are\("tp"\) \? '<span><i style="border-color:' \+ COL\.good \+ '"><\/i>take-profit<\/span>' : ''/);
});
await test("Sfaturi: zero-ul se mișcă la fiecare umplere ⇒ sub 0,1 USDT de zero (−0,06 la 1920 în demo) e „practic pe zero”, fără „ieșirea exact…”", () => {
  for (const v of [-0.06, 0.004]) {
    const s = sfat(BOT(), v);
    assert.equal(s.ton, "bine", String(v)); assert.equal(s.faCe || "", "", String(v));
    assert.match(s.text, /^Când se atinge, ieși practic pe zero \([−+]0,0\d* USDT\); închis acum/);
  }
  const s = sfat(BOT(), -0.21);   // de la 0,1 USDT în jos, informația rămâne
  assert.equal(s.ton, "info"); assert.equal(s.faCe, "Ieșirea exact fără pierdere e la 0.3022; la take-profit-ul de acum lași 0,2 USDT.");   // fără „+” (demo 1920: „lași +0,06”)
});

// ───────────── 4. „Dacă prețul ajunge la…” ─────────────
await test("scenariile: take-profit-ul pus e un rând („take-profit-ul”), lângă opritor", () => {
  const APP = citeste("public", "app.js");
  const i = APP.indexOf("function tbTinteScenariu("); assert.ok(i > 0);
  const corp = APP.slice(i, APP.indexOf("\n}\n", i) + 2);
  const ctx = { botiNr: (v) => { const x = Number(v); return v === null || v === undefined || v === "" || !Number.isFinite(x) ? null : x; }, tbStare: { scenariuPropriu: null } };
  vm.createContext(ctx); vm.runInContext(corp + "\nthis.f = tbTinteScenariu;", ctx);
  const t = J(ctx.f(BOT()));
  assert.ok(t.some((x) => x.eticheta === "take-profit-ul" && x.pret === 0.3025), JSON.stringify(t));
  assert.ok(!J(ctx.f(BOT({ opritorProfitActiv: false }))).some((x) => x.eticheta === "take-profit-ul"));
});

// ───────────── 5. „Contează acum” îmbogățit (el: „îmbunătățește Contează acum”, ales tot) ─────────────
// (codul s-a scris în demo, înaintea acestor teste; ele fixează ce a aprobat el în demo-ul v5)
const APP = citeste("public", "app.js"), CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html");
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const BRUT = { buOrderData: { bottom: "0.29", top: "0.325", row: "12", perVolume: "60", position: "-690", positionOpenPrice: "0.3109", marginBalance: "70.1", trend: "short", gridType: "arithmetic" } };
function imbogatire(o = {}) {
  const ctx = modul("text-ro.js", "curba-stop.js", "conteaza.js", "scenariu.js");
  vm.runInContext("this.Scenariu = Scenariu;", ctx);
  const mag = Object.assign({}, o.mag || {});
  Object.assign(ctx, { tbStare: { botBrut: BRUT, ctMem: null }, tbStopSansa: () => o.stop || null,
    localStorage: { getItem: (k) => (k in mag ? mag[k] : null), setItem: (k, v) => { mag[k] = String(v); } } });
  vm.runInContext(["tbCtOra", "tbCtUsdt", "tbCtBani", "tbCtCheie", "tbCtMemorie", "tbConteazaImbogateste"].map((n) => functie(APP, n)).join("\n") + "\nthis.f = tbConteazaImbogateste; this.ora = tbCtOra;", ctx);
  return { ctx, mag };
}
const Conteaza0 = () => modul("text-ro.js", "curba-stop.js", "conteaza.js").Conteaza;
const RAND_MARG = () => ({ cheie: "margine", ton: "galben", grav: 3, nr: "52", nrSub: "din 100 · 24 h", titlu: "Marginea de sus (0.3250) e cu 2,7% peste preț", sub: "", faCe: "N-aș mări levierul." });
const RAND_STOP = () => ({ cheie: "stop", ton: "rosu", grav: 1, nr: "~76", nrSub: "din 100 · 24 h", titlu: "Stopul tău (0.3400) e atins într-o zi în ~76 din 100 de cazuri", sub: "", faCe: "Hotărăște acum." });
await test("îmbogățirea: gravitatea (roșu „acționează azi”, auriu „urmărește”, verde „pus”), banii la margine din „Dacă prețul ajunge la…”, butonul potrivit", () => {
  const { ctx } = imbogatire({ stop: { stop: 0.34, mut20: 0.3466, raport: undefined } });
  const tp = Conteaza0().alege({ sfaturi: [sfat(BOT(), -0.06)], lista: [], sanse: [] })[0];
  const l = J(ctx.f(BOT(), [RAND_STOP(), RAND_MARG(), tp]));
  assert.deepEqual(l.map((x) => x.semne[0].text), ["acționează azi", "urmărește", "pus"]);
  assert.match(l[1].bani, /^dacă atinge marginea: [−+]?\d+,\d USDT în total, ca în „Dacă prețul ajunge la…”$/);
  assert.match(l[0].bani, /^dacă se atinge stopul: [−+]?\d+,\d USDT în total/);
  assert.deepEqual(l[0].butoane, [{ text: "copiază stopul propus 0.3466", click: "gridCopiaza(this.value)", value: "0.3466" }]);
  assert.deepEqual(l[1].butoane, [{ text: "deschide în Simulator", click: "gsDeschideBot()" }]);
  assert.ok(!l[2].bani && !l[2].butoane, "rândul „pus” are banii în text, fără buton");
  // stopul în procente din investiție: fără bani la preț și fără „copiază” (prețul e doar cel de acum)
  const { ctx: c2 } = imbogatire({ stop: { stop: 0.34, mut20: 0.3466, raport: -0.1 } });
  const s2 = J(c2.f(BOT(), [RAND_STOP()]))[0];
  assert.ok(!s2.bani && !s2.butoane);
});
await test("ce s-a schimbat de la ultima privire: prima vizită fără semne; a doua: „nou”, „52 → 60”, „de la HH:MM” (față de vizita de DINAINTE, în browserul lui)", () => {
  const { ctx, mag } = imbogatire();
  const prima = J(ctx.f(BOT(), [RAND_MARG()]))[0];
  assert.deepEqual(prima.semne.map((q) => q.cls), ["ctGrav ctGravGalben"], "prima dată nu e nimic de comparat");
  const k = "ctVazut:2637"; assert.ok(mag[k], "ce a văzut se ține în localStorage");
  const v = JSON.parse(mag[k]); const ck = Object.keys(v.r)[0]; v.r[ck].prima = Date.now() - 3 * 3600000; mag[k] = JSON.stringify(v);   // văzut acum 3 ore
  const { ctx: c2 } = imbogatire({ mag });
  const m2 = RAND_MARG(); m2.nr = "60"; m2.titlu = "Marginea de sus (0.3250) e cu 1,9% peste preț";   // cifrele din titlu nu fac rândul „nou”
  const l2 = J(c2.f(BOT(), [m2, RAND_STOP()]));
  const sem = (x) => x.semne.map((q) => q.text);
  assert.deepEqual(sem(l2[0]).slice(1), ["52 → 60", "de la " + c2.ora(Date.now() - 3 * 3600000)]);
  assert.deepEqual(sem(l2[1]).slice(1), ["nou"]);
  // aceeași sesiune, încă o tură: semnele rămân (nu dispar la a doua desenare)
  assert.deepEqual(J(c2.f(BOT(), [m2, RAND_STOP()])).map(sem), l2.map(sem));
});
await test("Conteaza.html: semnele după titlu, banii, butoanele potrivite lângă cele de copiere; Conteaza.gol: „Nimic nu pune bani în joc acum · verificat la HH:MM”", () => {
  const C = Conteaza0(), esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const x = Object.assign(RAND_MARG(), { semne: [{ cls: "ctGrav ctGravGalben", text: "urmărește" }], bani: "dacă atinge marginea: −12,2 USDT în total", butoane: [{ text: "deschide în Simulator", click: "gsDeschideBot()" }] });
  const h = C.html([x], esc);
  assert.match(h, /<b>Marginea de sus \(0\.3250\) e cu 2,7% peste preț<\/b><span class="ctSemne"><em class="ctGrav ctGravGalben">urmărește<\/em><\/span>/);
  assert.match(h, /<span class="ctBani">dacă atinge marginea: −12,2 USDT în total<\/span>/);
  assert.match(h, /<div class="ctCopiere"><button type="button" class="tbBtnLinie ctBtn" data-action-click="gsDeschideBot\(\)">deschide în Simulator<\/button><\/div>/);
  assert.match(C.gol("10:55"), /<p class="ctGol">Nimic nu pune bani în joc acum · verificat la 10:55<\/p>/);
  assert.match(C.gol("10:55"), /class="ctCap"><b>CONTEAZĂ ACUM<\/b>/);
});
await test("pagina: cu bot și sfaturile sosite, dar nimic de pus în joc ⇒ cartela rămâne cu „Nimic nu pune bani în joc acum”; fără bot ⇒ ascunsă", () => {
  const el = { innerHTML: "", hidden: true };
  const ctx = modul("text-ro.js", "curba-stop.js", "conteaza.js");
  Object.assign(ctx, { $: (id) => (id === "ctAcum" ? el : null), escapeHtml: (s) => String(s), tbStare: { bot: BOT(), routeOk: true, sfaturiLista: [], todoLista: [] },
    tbStopSansa: () => null, tbSansePt: () => [], tbRenderTodo: () => {} });
  vm.runInContext(["tbCtOra", "tbConteazaLista", "tbRenderConteaza"].map((n) => functie(APP, n)).join("\n") + "\nthis.r = tbRenderConteaza;", ctx);
  ctx.r(); assert.equal(el.hidden, false); assert.match(el.innerHTML, /Nimic nu pune bani în joc acum · verificat la \d\d:\d\d/);
  ctx.tbStare.bot = null; ctx.r(); assert.equal(el.hidden, true); assert.equal(el.innerHTML, "");
});

// ───────────── 6. așezarea Tabloului pe calculator (el: „sub grafic e mult spațiu gol”, demo v5 aprobat) ─────────────
await test("așezarea: blocul v100.322 e doar pe calculator (≥ 1181 px) și pune fiecare bucată pe rândul ei (nimic ascuns sub alt rând)", () => {
  const i = CSS.indexOf("/* v100.322 · așezarea Tabloului"), j = CSS.indexOf("/* v100.322: sfârșitul așezării Tabloului */");
  assert.ok(i > 0 && j > i, "blocul lipsește"); const B = CSS.slice(i, j);
  assert.match(B, /@media \(min-width:1181px\)\{/);
  // revizia 11.11: fără bot NIMIC de aici (display:contents bătea „display:none” al stării fără bot ⇒ reapăreau graficul gol, trendul, citirea…)
  const P = "html.pzDemo #tabloubot.on:not(.tbFaraBot) .tbCadru:has(>#tbKpiDetalii:not([hidden]))";
  assert.doesNotMatch(B, /html\.pzDemo #tabloubot\.on \.tbCadru:has/, "o regulă de așezare fără :not(.tbFaraBot)");
  assert.ok(B.includes("#tabloubot.tbFaraBot #tbKpiDetalii{display:none!important}"));
  for (const r of [P + ">#ctAcum:not([hidden]){grid-column:5 / -1!important;grid-row:2 / span 4!important;",
    // avertismentul de levier rămâne sus, sub cifre, ca în live (ordinea 4) - nu mai cade sub grafic
    P + ">#tbGridLarg{grid-column:1 / 5!important;grid-row:4!important}",
    P + " #tbGraficCard>.tbBlocCap{grid-column:1 / 5;grid-row:5;", P + " #tbGrafic>.gbZona{grid-column:1 / 5;grid-row:6 / span 7;",
    P + " #tbGrafic>.emptyState{grid-column:1 / 5;grid-row:6}", P + " #tbGrafic>.gbValCap{grid-row:6;", P + " #tbGraficCard>#pzUltimii{grid-row:12;",
    // sub grafic: în ORDINE, fără rânduri fixe (un rând fix rămas liber se umplea prin „dense” cu ce se nimerea - Monte Carlo între Drum și Trend)
    "html.pzDemo #tabloubot.on:not(.tbFaraBot) .tbCadru>#tbKpiDetalii:not([hidden]){grid-column:1 / -1;grid-row:auto;order:20;",
    P + ">#pzDrumCard{grid-column:1 / -1!important;grid-row:auto!important;order:21}", P + " #tbTrendCard{grid-column:1 / -1!important;grid-row:auto!important;order:23;",
    // demo v2 pierduse „Ce spune piața acum” (regula veche #tbCitireCard{grid-column:2;grid-row:1}) ⇒ pe tot rândul, rândul automat, cu !important
    P + " .tbGrStanga>#tbTodo{grid-column:1 / -1!important;grid-row:auto!important;order:24}", P + " .tbGrCol>#tbCitireCard{grid-column:1 / -1!important;grid-row:auto!important;order:25;",
    // „ultimele umpleri” în coloana din dreapta se rup pe rânduri (la 1280 / 1440 un rând nowrap ieșea din pagină: 1.441 / 1.548 px)
    P + " #tbGrafic>.gbUlt span{white-space:normal;overflow:visible;text-overflow:clip;max-width:100%}"])
    assert.ok(B.includes(r), "lipsește: " + r.slice(0, 160));
  assert.doesNotMatch(B, /grid-row:1[3-9]/, "niciun rând fix sub grafic");
  // Monte Carlo rămâne după „Ce spune piața acum” (trimiterea I-850: „scorul și șansele sunt în blocul de mai jos”): ordinea lui din live, 34 > 25
  assert.match(CSS, /\.pzDemo #tabloubot \.tbCadru>#tbMcSus\{order:34\}/);
  // 1181–1699: verdictul + cifrele 2×2 în stânga, Contează acum în dreapta; cele 4 cifre pe un rând doar de la 1700 (sub, regula v100.319 2×2)
  assert.match(B, /@media \(min-width:1181px\) and \(max-width:1699px\)\{\nhtml[^\n]*>#pzVerdict,html[^\n]*>\.tbSus\{grid-column:1 \/ 4!important\}\nhtml[^\n]*>#ctAcum:not\(\[hidden\]\)\{grid-column:4 \/ -1!important;grid-row:2 \/ span 3!important\}/);
  // rândul 4 nu rămâne liber pe toată lățimea (altfel „dense” urca detaliile cifrelor deasupra graficului - poza 1280 / 1440): Contează acum îl acoperă în dreapta
  assert.ok(B.includes(P + ">#tbGridLarg{grid-column:1 / 4!important}"));
  assert.match(B, /@media \(min-width:1700px\)\{\nhtml[^\n]*>\.tbSus>#tbKpi\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important;row-gap:0\}/);
  assert.match(CSS, /@media \(min-width:641px\) and \(max-width:1699px\)\{\nhtml\.pzDemo #tabloubot\.on \.tbCadru>\.tbSus>#tbKpi\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  // „culoarea e pentru stare” (v100.319) și pe rândurile mutate sub grafic
  for (const c of ["good .pzKv:first-child b{color:var(--pzSus)}", "bad .pzKv:first-child b{color:var(--pzJos)}", "tbWarn .pzKv:first-child b{color:var(--pzAur)}"])
    assert.ok(CSS.includes("html.pzDemo #tabloubot :is(#tbKpi,#tbKpiDetalii) .pzKvBloc." + c), c);
  assert.ok(CSS.includes("html.pzDemo #tabloubot :is(#tbKpi,#tbKpiDetalii) .pzKv>b{min-width:0;overflow-wrap:anywhere}"));
  assert.doesNotMatch(CSS, /html\.pzDemo #tabloubot #tbKpi \.pzKv/, "o regulă a cifrelor rămasă doar pe #tbKpi");
  // nimic ascuns în bloc, în afară de: căsuțele goale ale notei unui nivel și detaliile cifrelor în starea FĂRĂ bot (cifrele însele sunt ascunse acolo)
  assert.doesNotMatch(B, /visibility:hidden/);
  assert.deepEqual(B.match(/[^\n{}]*\{display:none[^}]*\}/g).map((r) => r.trim()).sort(),
    ["#tabloubot.tbFaraBot #tbKpiDetalii{display:none!important}", P + " #tbGrafic>.gbValori .gbVS:empty{display:none}"].sort());
});
await test("detaliile cifrelor: 4 coloane sub grafic, în ordinea cifrelor; tbKpiAsezare le mută acolo pe calculator și ÎNAPOI sub cifre pe ecranele înguste", () => {
  assert.match(HTML, /<div class="tbKpiDetalii" id="tbKpiDetalii" hidden aria-label="Detaliile cifrelor"><div class="tbKpiDetCol"><span class="tbEt2">Rezultat total<\/span><\/div><div class="tbKpiDetCol"><span class="tbEt2">Până la lichidare<\/span><\/div><div class="tbKpiDetCol"><span class="tbEt2">Prețul în grid<\/span><\/div><div class="tbKpiDetCol"><span class="tbEt2">Piața față de bot<\/span><\/div><\/div><div class="tbGraficRand">/);
  assert.match(APP, /var TB_KPI_DET=\[\["tbKpiGrid","tbKpiTotalSub"\],\["tbKpiLichSub"\],\["tbKpiPretSub"\],\["tbKpiPiataSub"\]\];/);
  const f = functie(APP, "tbKpiAsezare");
  assert.match(f, /var t=lat\?dest\.children\[i\]:cel\[i\]/, "pe îngust se întorc în cartela cifrei");
  assert.match(f, /dest\.hidden=!lat;/);
  for (const id of ["tbKpiGrid", "tbKpiTotalSub", "tbKpiLichSub", "tbKpiPretSub", "tbKpiPiataSub"]) assert.ok(HTML.includes('id="' + id + '"'), id + " lipsește din pagină");
});
await test("graficul la deschidere: lățimea din cutia lui (și când e „transparentă”), înălțimea după ecran doar pe calculator, prețul niciodată sub 220 px", () => {
  assert.match(functie(APP, "tbLatimeGrafic"), /document\.querySelector\("#tbGraficCard>\.tbBlocCap"\)/, "la primul desen: lățimea capului (aceleași coloane), nu 800");
  assert.doesNotMatch(functie(APP, "tbLatimeGrafic"), /parseFloat\(getComputedStyle\(gr\)\.gridTemplateColumns\)/, "„minmax(…” dădea NaN");
  assert.match(functie(APP, "tbInaltMaxGrafic"), /matchMedia\("\(min-width:1181px\)"\)/);
  const GBs = citeste("public", "lib", "grafic-bot.js");
  assert.match(GBs, /if \(!ingust && o\.inaltMax > 0\) \{/);
  assert.match(GBs, /mainH = Math\.max\(220, Math\.min\(mainH, Math\.round\(o\.inaltMax - restH\(\)\)\)\);/);
});

// ───────────── 7. reparațiile reviziei (11.11, înainte de livrare) ─────────────
await test("revizia: take-profit-ul în PROCENTE se socotește live (TabloExtra.pretTpLive), ca stopul; în preț rămâne prețul lui; stins ⇒ null", () => {
  const ctx = modul("grid-calcul.js", "tablou-extra.js");
  vm.runInContext("this.TE = TabloExtra;", ctx);
  const TE = ctx.TE;
  assert.equal(TE.pretTpLive(BOT()), 0.3025);
  assert.equal(TE.pretTpLive(BOT({ opritorProfitActiv: false })), null);
  // în procente: prețul la care totalul ajunge la r × investit, cu grilele de pe drum ⇒ totalul acolo = r × investit (aceeași cifră ca în sfat)
  const b = BOT({ opritorProfitTip: "raport", opritorProfitRaport: 0.02, opritorProfit: 0.29, profitTotal: -1, profitNet: -1, pozitie: -690, pretDeschidere: 0.3109 });
  const p = TE.pretTpLive(b);
  assert.ok(p > 0, "un preț");
  const t = TE.pretTintaPentru(b, 0.02 * 72.73);
  assert.equal(p, t !== null ? t : 0.29, "prețul socotit, altfel cel dat de server");
  assert.match(citeste("public", "lib", "grafic-bot.js"), /tpLive: TE && TE\.pretTpLive \? TE\.pretTpLive\(b\) : null/);
  assert.match(citeste("public", "lib", "sfaturi.js"), /tpLive: TE && TE\.pretTpLive \? TE\.pretTpLive\(b\) : null/);
});
await test("revizia: take-profit pus care închide SUB zero ⇒ rândul rămâne auriu („urmărește”), nu verde „pus”; pe Acasă rândul verde nu se numără „de văzut”", () => {
  const C = Conteaza0();
  const sub = sfat(BOT(), -0.8);   // lași 0,8 USDT
  assert.equal(sub.ton, "info");
  const r = J(C.alege({ sfaturi: [sub], lista: [], sanse: [] }))[0];
  assert.equal(r.ton, "galben"); assert.equal(r.grav, 5); assert.equal(r.nr, "✓");
  const v = J(C.alege({ sfaturi: [sfat(BOT(), 0.5)], lista: [], sanse: [] }))[0];
  assert.equal(v.ton, "verde");
  const a = C.acasa([RAND_STOP(), v], "STX");
  assert.match(a.text, /^👉 hotărăște în Tablou$/, "„încă 1 de văzut” numai pentru rânduri care cer ceva");
  assert.match(C.acasa([RAND_STOP(), RAND_MARG(), v], "STX").text, /încă 1 de văzut/);
  // titlul în procente: fără paranteze duble
  const rp = sfat(BOT({ opritorProfitTip: "raport", opritorProfitRaport: 0.05 }), -0.21);
  assert.match(rp.titlu, /^Take-profit-ul tău e pus la \+5,0% din investiție, acum pe la 0\.3025 \(zero-ul e la 0\.3022\)$/);
});
await test("revizia: „de la ultima privire” = ultima TA privire (după ≥ 30 min cu pagina ascunsă memoria se reia); în browser se scrie doar ce s-a schimbat", () => {
  const f = functie(APP, "tbCtMemorie");
  assert.match(f, /document\.addEventListener\("visibilitychange"/);
  assert.match(f, /Date\.now\(\)-tbStare\.ctAscunsLa>=1800000\)\{tbStare\.ctMem=null;tbStare\.ctHtml=null\}/);
  const { ctx, mag } = imbogatire();
  let scrieri = 0; const set0 = ctx.localStorage.setItem; ctx.localStorage.setItem = (k, v) => { scrieri++; set0(k, v); };
  ctx.f(BOT(), [RAND_MARG()]); ctx.f(BOT(), [RAND_MARG()]); ctx.f(BOT(), [RAND_MARG()]);
  assert.equal(scrieri, 1, "aceleași rânduri ⇒ o singură scriere");
  const m2 = RAND_MARG(); m2.nr = "61"; ctx.f(BOT(), [m2]); assert.equal(scrieri, 2);
  assert.ok(mag["ctVazut:2637"]);
});
await test("revizia: Drumul botului are și take-profit-ul pus (ca pe grafic)", () => {
  const src = citeste("public", "lib", "asezare-paznic.js");
  assert.match(src, /if \(bl && bl\.opritorProfitActiv\) \{ var TEp = window\.TabloExtra, tp = TEp && TEp\.pretTpLive \? TEp\.pretTpLive\(bl\) : nr\(bl\.opritorProfit\); if \(tp > 0\) add\(tp, "take-profit", "var\(--pzSus\)"/);
});
await test("revizia: tbKpiAsezare scrie `hidden` doar când se schimbă", () => {
  assert.match(functie(APP, "tbKpiAsezare"), /if\(dest\.hidden!==!lat\)dest\.hidden=!lat;/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
