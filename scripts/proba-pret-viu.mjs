// Probele v100.6 - prețul botului LIVE (el, 28.09: „linia galbenă de sus nu încape și nicăieri nu se arată prețul live
// al botului; integrează-l și sus în bara galbenă și în altă parte”):
//   - public/lib/pret-viu.js (pur): mesajele WebSocket-ului public Pionex (TRADE / PING), „viu” = ceva în ultimul minut,
//     banda de sus pe bucăți, cu prețul imediat după nume
//   - app.js: socketul pe piața EXACTĂ a botului (JTO_USDT_PERP), reconectare, PONG; banda și capul Tabloului arată prețul
//   - CSS: banda nu mai e tăiată la 520 px
// Rulare: node scripts/proba-pret-viu.mjs
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = citeste("../public/lib/pret-viu.js");
const PV = SRC ? new Function(`${SRC}; return PretViu;`)() : null;
const APP = citeste("../public/app.js"), HTML = citeste("../public/index.html"), CSS = citeste("../public/app.css"), SW = citeste("../public/sw.js"), HDR = citeste("../public/_headers");

let teste = 0, picate = 0;
function test(nume, fn) { teste++; try { fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }

const S = "JTO_USDT_PERP", ACUM = 1_790_602_710_000;
const BOT = { baza: "JTO.PERP", directie: "long", levier: 5, profitTotal: -12.04, distantaLichidarePct: 20.5, pretCurent: 0.5702 };
const trade = (p, t, sym = S) => JSON.stringify({ topic: "TRADE", symbol: sym, data: [{ symbol: sym, price: p, size: "1", side: "BUY", timestamp: t }], timestamp: t });

console.log("\nV100.6 · prețul botului live · proba\n");

test("modulul PretViu există", () => assert.ok(PV, "public/lib/pret-viu.js lipsește"));
test("PING → ping (nu e preț)", () => assert.deepEqual(PV.mesaj('{"op":"PING","timestamp":1}', S), { tip: "ping" }));
test("TRADE pe simbolul botului → prețul, textul exact de la Pionex", () => { const m = PV.mesaj(trade("0.5708", ACUM), S); assert.equal(m.tip, "pret"); assert.equal(m.pret, 0.5708); assert.equal(m.text, "0.5708"); assert.equal(m.la, ACUM); });
test("TRADE pe ALT simbol se ignoră (nu minte pe botul tău)", () => assert.equal(PV.mesaj(trade("64000", ACUM, "BTC_USDT_PERP"), S), null));
test("lot cu mai multe tranzacții → cea mai nouă", () => {
  const m = PV.mesaj(JSON.stringify({ topic: "TRADE", symbol: S, data: [{ symbol: S, price: "0.5710", timestamp: ACUM }, { symbol: S, price: "0.5701", timestamp: ACUM - 500 }] }), S);
  assert.equal(m.pret, 0.571);
});
test("gunoi / preț 0 / preț lipsă → null, nu 0", () => { assert.equal(PV.mesaj("nu e json", S), null); assert.equal(PV.mesaj(trade("0", ACUM), S), null); assert.equal(PV.mesaj(trade("", ACUM), S), null); });
test("viu = ceva primit în ultimul minut", () => { assert.equal(PV.eViu({ pret: 0.57, primitLa: ACUM - 59000 }, ACUM), true); assert.equal(PV.eViu({ pret: 0.57, primitLa: ACUM - 61000 }, ACUM), false); assert.equal(PV.eViu(null, ACUM), false); });
test("direcția față de tranzacția de dinainte", () => { assert.equal(PV.directia(0.57, 0.571), "sus"); assert.equal(PV.directia(0.57, 0.569), "jos"); assert.equal(PV.directia(0.57, 0.57), "egal"); assert.equal(PV.directia(null, 0.57), null); });
test("banda: prețul live stă imediat după nume, cu săgeata", () => {
  const r = PV.banda({ bot: BOT, pretViu: { pret: 0.5708, text: "0.5708", primitLa: ACUM - 1000, dir: "sus" }, acum: ACUM, distanteGrid: { inGrid: true, josPct: 0.009, susPct: 0.017 }, piata: { ton: "bine" } });
  assert.deepEqual(r.parti.map((p) => p.k), ["nume", "pret", "total", "lich", "grid", "piata"]);
  assert.equal(r.parti[1].t, "0.5708 \u25b2"); assert.equal(r.parti[1].viu, true);
  assert.equal(r.parti.map((p) => p.t).join(" · "), "JTO long 5× · 0.5708 ▲ · total -12.04 USDT · lichidare 20.5% · grid ↓0.9% ↑1.7% · piața: cu botul");
  assert.equal(r.clasa, "tbWarn");
});
test("banda fără live: prețul din citirea botului, fără săgeată, spus pe față", () => {
  const r = PV.banda({ bot: BOT, pretViu: { pret: 0.5708, text: "0.5708", primitLa: ACUM - 120000, dir: "sus" }, botLa: ACUM - 5000, acum: ACUM });
  assert.equal(r.parti[1].t, "0.5702"); assert.equal(r.parti[1].viu, false); assert.match(r.parti[1].title, /citirea botului/);
});
test("banda fără niciun preț: nu inventează bucata de preț", () => { const r = PV.banda({ bot: { ...BOT, pretCurent: null }, acum: ACUM }); assert.ok(!r.parti.some((p) => p.k === "pret")); });

// legătura în aplicație
test("index.html încarcă lib/pret-viu.js și sw.js îl ține în precache", () => { assert.match(HTML, /<script src="\/lib\/pret-viu\.js/); assert.match(SW, /"\/lib\/pret-viu\.js"/); });
test("CSP NU deschide ws.pionex.com (browserul e refuzat cu 403; merge prin releu, pe 'self')", () => assert.doesNotMatch(HDR, /ws\.pionex\.com/));
test("app.js se leagă la releul de acasă /api/pret-viu și se reconectează", () => {
  assert.match(APP, /\/api\/pret-viu\?simbol="\+encodeURIComponent\(simbol\)/); assert.doesNotMatch(APP, /ws\.pionex\.com/); assert.match(APP, /pvStare\.timeout=setTimeout/);
});
test("banda de sus se compune din PretViu.banda și renunță întâi la „piața”, apoi la „azi”, apoi la „grid” când nu încape", () => {
  assert.match(APP, /PretViu\.banda\(/); assert.match(APP, /botStripPret/); assert.match(APP, /\["piata","zi","grid"\]\.forEach/);
});
test("capul Tabloului are prețul live", () => { assert.match(HTML, /id="tbPretViu"/); assert.match(APP, /tbPretViuVal/); });
test("banda nu mai e tăiată la 520 px", () => { assert.doesNotMatch(CSS, /\.botStrip\{[^}]*max-width:520px/); });

// v100.7 - ideile de după v100.6 (el: „fă ideile”): (1) „Prețul în grid” pe prețul live, (2) linia „acum” live pe grafic,
// (3) mișcarea de azi față de deschiderea zilei (lumânarea 1D Pionex, 00:00 UTC — aceeași regulă ca în colector / pagina alerts)
const GB_SRC = citeste("../public/lib/grafic-bot.js");
const GB = GB_SRC ? new Function(`${GB_SRC}; return GraficBot;`)() : null;
const AZI = Math.floor(ACUM / 86400000) * 86400000;
test("ziDinKlines: deschiderea lumânării de AZI (00:00 UTC), nu a celei de ieri", () => {
  const k = [{ time: AZI - 86400000, open: "0.60" }, { time: AZI, open: "0.5750" }];
  assert.deepEqual(PV.ziDinKlines(k, ACUM), { deschidere: 0.575, t: AZI }); assert.equal(PV.ziDinKlines([{ time: AZI - 86400000, open: "0.6" }], ACUM), null); assert.equal(PV.ziDinKlines(null, ACUM), null);
});
test("procentZi: prețul față de deschiderea zilei; lipsa rămâne null", () => {
  assert.ok(Math.abs(PV.procentZi(0.5693, { deschidere: 0.575 }) - (-0.99130)) < 1e-3); assert.equal(PV.procentZi(0.57, null), null); assert.equal(PV.procentZi(null, { deschidere: 0.5 }), null);
});
test("banda: „azi ±x%” imediat după preț, când știm deschiderea zilei", () => {
  const r = PV.banda({ bot: BOT, pretViu: { pret: 0.5693, text: "0.5693", primitLa: ACUM - 1000, dir: "jos" }, zi: { deschidere: 0.575 }, acum: ACUM });
  assert.deepEqual(r.parti.map((p) => p.k).slice(0, 3), ["nume", "pret", "zi"]); assert.equal(r.parti[2].t, "azi -1.0%"); assert.equal(r.parti[2].ton, "jos");
  assert.ok(!PV.banda({ bot: BOT, acum: ACUM }).parti.some((p) => p.k === "zi"), "fără deschiderea zilei nu inventăm procentul");
});
test("botLaPret: copia botului cu prețul live (pentru „Prețul în grid”), botul original neatins", () => {
  const c = PV.botLaPret(BOT, 0.58); assert.equal(c.pretCurent, 0.58); assert.equal(BOT.pretCurent, 0.5702); assert.equal(PV.botLaPret(BOT, null), BOT);
});
test("graficul: cu pretViu, eticheta „acum” arată prețul live și apare linia live de la ultima lumânare", () => {
  const bare = Array.from({ length: 60 }, (_, i) => ({ t: ACUM - (60 - i) * 300000, o: 0.57, h: 0.572, l: 0.568, c: 0.57, v: 10 }));
  const cu = GB.desen({ bare, W: 900, st: {}, niv: [], alerte: [], pretViu: 0.5693 }), fara = GB.desen({ bare, W: 900, st: {}, niv: [], alerte: [] });
  assert.match(cu.svg, /class="gbViu"/); assert.match(cu.svg, /acum 0\.5693/); assert.doesNotMatch(fara.svg, /class="gbViu"/); assert.match(fara.svg, /acum 0\.5700/);
});
test("app.js: „Prețul în grid”, linia de pe grafic și procentul zilei se hrănesc din prețul live", () => {
  assert.match(APP, /function tbKpiPretDeseneaza\(/); assert.match(APP, /PretViu\.botLaPret\(/); assert.match(APP, /pretViu:/);
  assert.match(APP, /interval=1D&limit=2/); assert.match(APP, /PretViu\.ziDinKlines\(/);
});

// v100.8 - parola adusă de pagina alerts în link (…/#parola=…&ecran=tabloubot): tunelul are adresă nouă la fiecare pornire
test("Radarul ia parola din link, o ține minte, o scoate din bară și deschide ecranul cerut", () => {
  const m = /const ecranDinLegatura=\(function\(\)\{[\s\S]*?\n\}\)\(\);/.exec(APP); assert.ok(m, "lipsește ecranDinLegatura în app.js");
  const ruleaza = (hash, ss = {}) => {
    const ls = {}, st = { url: null };
    const loc = { hash, pathname: "/", search: "" };
    const f = new Function("location", "localStorage", "sessionStorage", "history", "APP_API_TOKEN_SESSION_KEY", m[0] + "; return ecranDinLegatura;");
    const e = f(loc, { setItem: (k, v) => { ls[k] = v; } }, { setItem: (k, v) => { ss[k] = v; }, getItem: (k) => ss[k] ?? null }, { replaceState: (a, b, u) => { st.url = u; } }, "K");
    return { e, ls, st, ss };
  };
  const a = ruleaza("#parola=abc%2Fdef&ecran=tabloubot"); assert.equal(a.ls.K, "abc/def"); assert.equal(a.e, "tabloubot"); assert.equal(a.st.url, "/", "parola nu rămâne în bară");
  assert.equal(ruleaza("", a.ss).e, "tabloubot", "după reîncărcarea făcută de service worker (linkul deja scos din bară) ecranul cerut tot se deschide");
  assert.equal(ruleaza("", { crEcranDinLegatura: JSON.stringify({ e: "tabloubot", t: Date.now() - 120000 }) }).e, null, "peste un minut nu mai trage");
  assert.equal(JSON.stringify(a.ss).includes("abc"), false, "parola NU ajunge în sesiune");
  const b = ruleaza("#ecran=t212"); assert.equal(b.e, "t212"); assert.equal(b.ls.K, undefined);
  const c = ruleaza("#ecran=javascript"); assert.equal(c.e, null, "doar ecranele știute");
  const d = ruleaza(""); assert.equal(d.e, null); assert.equal(d.st.url, null, "fără link nu atinge adresa");
  assert.ok(APP.indexOf("const ecranDinLegatura=") < APP.indexOf("// Boot only after every versioned module"), "parola se pune înainte de primele cereri");
});

test("„Ce ai de făcut acum”: cele mai NOI sus (nu cele vechi); la aceeași oră, cea mai urgentă prima", () => {
  const TE = new Function(`${citeste("../public/lib/grid-calcul.js")}\n${citeste("../public/lib/tablou-extra.js")}; return TabloExtra;`)();
  const H = 3600000, ACU = ACUM;
  const l = TE.ceAiDeFacut({ acum: ACU, dateLa: ACU - 60000, planGol: false, avertismente: [],
    alerte: [{ t: ACU - 5 * H, nivel: "critic", titlu: "JTO: Lichidarea la 2.7%", mesaj: "vechi" }, { t: ACU - 1 * H, nivel: "atentie", titlu: "JTO: Prețul a ieșit din grid", mesaj: "nou" }],
    sfaturi: [{ ton: "atentie", titlu: "Mută gridul", text: "x" }, { ton: "critic", titlu: "Semaforul zice IEȘI", text: "y" }] });
  assert.deepEqual(l.map((x) => x.titlu), ["Semaforul zice IEȘI", "Mută gridul", "Prețul a ieșit din grid", "Lichidarea la 2.7%"]);
  const ore = l.map((x) => x.la); assert.deepEqual(ore, ore.slice().sort((a, b) => b - a));
});

test("„Ce ai de făcut”: din alertele de același fel rămâne mereu CEA MAI NOUĂ (titlul, textul, culoarea ei), cu ×N", () => {
  const TE = new Function(`${citeste("../public/lib/grid-calcul.js")}\n${citeste("../public/lib/tablou-extra.js")}; return TabloExtra;`)();
  const H = 3600000, A = (h, nivel, titlu, mesaj) => ({ t: ACUM - h * H, nivel, titlu: "JTO: " + titlu, mesaj });
  const l = TE.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, planGol: false, sfaturi: [], avertismente: [], alerte: [
    A(5, "critic", "Lichidarea la 2.7%", "sub 8%"), A(1, "atentie", "Lichidarea la 14.8%", "sub 15%"), A(3, "critic", "Lichidarea la 3.2%", "sub 8%"),
    A(4, "critic", "Semaforul zice IEȘI — lichidare e la 4.2%", "x"), A(2, "critic", "Semaforul zice IEȘI — lichidare e la 3.1%", "y"),
    A(2, "atentie", "Prețul e la 0,9% de marginea de sus (0.56500)", "sus"), A(1.5, "atentie", "Prețul e la 0,1% de marginea de jos (0.57220)", "jos")] });
  const lich = l.filter((x) => /^Lichidarea/.test(x.titlu)); assert.equal(lich.length, 1, "un singur rând de lichidare");
  assert.equal(lich[0].titlu, "Lichidarea la 14.8%"); assert.equal(lich[0].c, "g", "culoarea celei noi, nu a celei vechi"); assert.equal(lich[0].n, 3); assert.equal(lich[0].text, "sub 15%");
  const sem = l.filter((x) => /^Semaforul/.test(x.titlu)); assert.equal(sem.length, 1); assert.match(sem[0].titlu, /3\.1%/);
  assert.equal(l.filter((x) => /marginea/.test(x.titlu)).length, 2, "marginea de sus și cea de jos rămân lucruri diferite");
});
test("„Ce ai de făcut”: planul lipsă = UN singur rând (alerta „Botul n-are plan” nu se mai dublează); cu planul pus, alerta veche dispare", () => {
  const TE = new Function(`${citeste("../public/lib/grid-calcul.js")}\n${citeste("../public/lib/tablou-extra.js")}; return TabloExtra;`)();
  const al = [{ t: ACUM - 2 * 3600000, nivel: "atentie", titlu: "JTO: Botul n-are plan", mesaj: "Fără țintă și prag" }, { t: ACUM - 3600000, nivel: "critic", titlu: "JTO: Lichidarea la 7.0%", mesaj: "x" }];
  const cu = TE.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, planGol: true, sfaturi: [], avertismente: [], alerte: al });
  assert.equal(cu.filter((x) => /plan/i.test(x.titlu)).length, 1); assert.equal(cu.find((x) => /plan/i.test(x.titlu)).actiune, "plan", "rămâne rândul cu butonul");
  const fara = TE.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, planGol: false, sfaturi: [], avertismente: [], alerte: al });
  assert.equal(fara.filter((x) => /plan/i.test(x.titlu)).length, 0, "planul e pus: alerta veche nu mai are ce căuta"); assert.ok(fara.some((x) => /Lichidarea/.test(x.titlu)));
});
test("codTVBot: rândul GRID-FISA din botul care rulează (formatul butonului din fișă, 10 câmpuri) + semnătura gridului", () => {
  const TE = new Function(`${citeste("../public/lib/grid-calcul.js")}\n${citeste("../public/lib/tablou-extra.js")}; return TabloExtra;`)();
  const jto = { id: "2386", directie: "long", levier: 5, gridJos: 0.555, gridSus: 0.57, pretCurent: 0.5619, opritorPierdere: 0.5455, opritorPierdereActiv: true, opritorProfit: null, opritorProfitActiv: false,
    lichidareJos: 0.52034, lichidareSus: null, investit: 98.14, brut: { buOrderData: { row: 9, gridType: "arithmetic" } } };
  const c = TE.codTVBot(jto);
  assert.equal(c.cod, "long;0.555;0.57;9;5;0.5455;0;0.52034;0;98.14;aritmetic"); assert.equal(c.cod.split(";").length, 11, "GRID-FISA v2.0: al 11-lea câmp = tipul");
  assert.equal(TE.codTVBot({ ...jto, brut: { buOrderData: { row: 9, gridType: "geometric" } } }).cod.split(";")[10], "geometric");
  assert.equal(TE.codTVBot({ ...jto, brut: { buOrderData: { row: 9 } } }).cod.split(";").length, 10, "tip necunoscut: nu-l inventăm, rămân 10 câmpuri");
  assert.notEqual(TE.codTVBot({ ...jto, brut: { buOrderData: { row: 9, gridType: "geometric" } } }).sig, c.sig, "alt tip = alt grid");
  assert.equal(TE.codTVBot({ ...jto, lichidareJos: 0.51, investit: 120 }).sig, c.sig, "lichidarea și suma se mișcă singure: nu înseamnă alt grid");
  assert.notEqual(TE.codTVBot({ ...jto, gridJos: 0.5722, gridSus: 0.6572, brut: { buOrderData: { row: 18 } } }).sig, c.sig, "alt interval = alt grid");
  assert.equal(TE.codTVBot({ ...jto, opritorPierdereActiv: false }).cod.split(";")[5], "0", "opritorul stins nu se trimite");
  const sh = TE.codTVBot({ ...jto, directie: "short", opritorPierdere: 0.59, opritorProfit: 0.54, opritorProfitActiv: true, lichidareJos: null, lichidareSus: 0.66 }).cod.split(";");
  assert.deepEqual([sh[0], sh[5], sh[6], sh[8]], ["short", "0", "0.59", "0.66"], "la short, ca în fișă: jos 0, stopul de deasupra la sus");
  assert.equal(TE.codTVBot({ ...jto, directie: "no_trend" }).dir, "neutru");
  const ieftin = TE.codTVBot({ ...jto, gridJos: 0.000000123456, gridSus: 0.000000234567, pretCurent: 0.0000002, opritorPierdereActiv: false, lichidareJos: null }).cod.split(";");
  assert.deepEqual([ieftin[1], ieftin[2]], ["0.000000123456", "0.000000234567"], "fără exponent la monedele foarte ieftine");
  // v100.11: dupa ROL, nu dupa partea pretului (auditul GRID-FISA v2.0)
  const f5 = (x) => { const q = TE.codTVBot(x).cod.split(";"); return q[5] + "|" + q[6]; };
  assert.equal(f5({ ...jto, opritorProfit: 0.6878, opritorProfitActiv: true }), "0.5455|0.6878", "long: pierderea jos, profitul (TP) sus");
  assert.equal(f5({ ...jto, pretCurent: 0.53, opritorProfit: 0.6878, opritorProfitActiv: true }), "0.5455|0.6878", "long cu prețul învechit SUB stop: stopul rămâne jos");
  assert.equal(f5({ ...jto, directie: "no_trend", opritorPierdere: 0.54, opritorProfit: 0.60, opritorProfitActiv: true }), "0.54|0", "neutru: TP-ul nu ajunge „stop-loss”, pierderea pe partea ei");
  assert.equal(f5({ ...jto, directie: "no_trend", opritorPierdere: 0.59, opritorProfit: null, opritorProfitActiv: false }), "0|0.59", "neutru cu pierderea deasupra gridului: sus");
  assert.equal(TE.codTVBot({ ...jto, brut: {} }), null, "fără numărul de grile nu inventăm");
  const cp = TE.codTVBot(jto, { plus: 5.2, minus: 14.9, afaraOre: 12 });
  assert.equal(cp.cod, "long;0.555;0.57;9;5;0.5455;0;0.52034;0;98.14;aritmetic;14.9;5.2;12", "planul în câmpurile 12-14"); assert.equal(cp.sig, c.sig, "planul nu e alt grid");
  assert.equal(TE.codTVBot({ ...jto, brut: { buOrderData: { row: 9 } } }, { plus: 5, minus: 0, afaraOre: 0 }).cod.split(";").slice(10).join("|"), "|0|5|0", "tipul necunoscut rămâne gol ca planul să nu alunece");
  assert.equal(TE.codTVBot(jto, { plus: 5, minus: 10, afaraOre: 12, proba: true }).cod.split(";").length, 11, "planul de probă nu intră");
  assert.equal(TE.codTVBot(jto, { plus: 0, minus: 0, afaraOre: 0 }).cod.split(";").length, 11, "plan gol = fără câmpuri de plan");
});
test("Tabloul: banda „Ai schimbat gridul” + butonul permanent din cartela Gridul", () => {
  assert.match(HTML, /id="tbGridNou"/); assert.match(APP, /function tbDeseneazaTvCod\(/); assert.match(APP, /tbDeseneazaTvCod\(\);tbPiataPeBot\(\)/);
  assert.match(APP, /x\.cod==="grid"&&tbTvCod\(\)/); assert.match(CSS, /#tabloubot \.tbGridNou\[hidden\]\{display:none\}/);
});

// v100.12 (ideea 6 „Păstrează ca plan”): linkul din alerts cere si o POZITIE T212 - Radarul o desface, cu planul completat
test("Radarul ia din link și poziția cerută (…&ecran=t212&poz=TICKER), doar la T212, doar un ticker curat; pagina T212 o desface o dată", () => {
  const i = APP.indexOf("const ecranDinLegatura="), j = APP.indexOf("\n", APP.indexOf("const pozDinLegatura="));
  assert.ok(i > 0 && j > i, "lipsește pozDinLegatura în app.js");
  const bucata = APP.slice(i, j);
  const ruleaza = (hash) => {
    const ss = {};
    const f = new Function("location", "localStorage", "sessionStorage", "history", "APP_API_TOKEN_SESSION_KEY", bucata + "; return [ecranDinLegatura, pozDinLegatura];");
    return f({ hash, pathname: "/", search: "" }, { setItem() {} }, { setItem: (k, v) => { ss[k] = v; }, getItem: (k) => ss[k] ?? null }, { replaceState() {} }, "K");
  };
  assert.deepEqual(ruleaza("#parola=x&ecran=t212&poz=AVGO_US_EQ"), ["t212", "AVGO_US_EQ"]);
  assert.deepEqual(ruleaza("#ecran=t212&poz=%3Cscript%3E"), ["t212", null], "doar litere, cifre, _ . -");
  assert.deepEqual(ruleaza("#ecran=tabloubot&poz=AVGO_US_EQ"), ["tabloubot", null], "poziția contează doar la Trading 212");
  assert.deepEqual(ruleaza("#ecran=t212"), ["t212", null]);
  const T = citeste("../public/lib/t212-ecran.js");
  assert.match(T, /typeof pozDinLegatura !== "undefined" && pozDinLegatura && !t212\.pozCerutaGata/); assert.match(T, /t212Deschide\(pozDinLegatura\)/);
});

// releul (functions/api/pret-viu.js), cu fetch / WebSocketPair / Response simulate
class FalsWS { constructor() { this.l = {}; this.trimise = []; this.inchis = false; } accept() { this.acceptat = true; } addEventListener(t, f) { (this.l[t] ||= []).push(f); } send(x) { this.trimise.push(x); } close() { this.inchis = true; } da(t, d) { (this.l[t] || []).forEach((f) => f(d)); } }
const vechi = { fetch: globalThis.fetch, Response: globalThis.Response, WebSocketPair: globalThis.WebSocketPair };
let sus = null, antetSus = null, perechi = [];
globalThis.fetch = async (u, o) => { antetSus = { u, h: o && o.headers }; sus = new FalsWS(); return { status: 101, webSocket: sus }; };
globalThis.WebSocketPair = function () { const p = { 0: new FalsWS(), 1: new FalsWS() }; perechi.push(p); return p; };
globalThis.Response = class { constructor(corp, i) { this.corp = corp; this.status = i.status; this.webSocket = i.webSocket; } };
const cerere = (simbol, antete) => ({ url: "http://127.0.0.1:8788/api/pret-viu?simbol=" + simbol, headers: new Headers(antete) });
const BUN = { upgrade: "websocket", origin: "http://127.0.0.1:8788" };
try {
  const { onRequestGet } = await import(new URL("../functions/api/pret-viu.js", import.meta.url));
  const r426 = await onRequestGet({ request: cerere(S, { origin: BUN.origin }) });
  const r403 = await onRequestGet({ request: cerere(S, { upgrade: "websocket", origin: "https://altcineva.ro" }) });
  const r403b = await onRequestGet({ request: cerere(S, { upgrade: "websocket" }) });
  const r400 = await onRequestGet({ request: cerere("JTO_USDT_PERP%22%7D", BUN) });
  const nrFetch = sus ? 1 : 0;
  const r101 = await onRequestGet({ request: cerere(S, BUN) });
  const catreOm = perechi.at(-1)[1];
  test("releu: fără upgrade → 426; Origin străin sau lipsă → 403; simbol ciudat → 400; niciunul nu sună la Pionex", () => {
    assert.equal(r426.status, 426); assert.equal(r403.status, 403); assert.equal(r403b.status, 403); assert.equal(r400.status, 400); assert.equal(nrFetch, 0);
  });
  test("releu: se leagă la Pionex FĂRĂ Origin și abonează exact simbolul botului", () => {
    assert.equal(r101.status, 101); assert.ok(r101.webSocket); assert.match(antetSus.u, /ws\.pionex\.com\/wsPub/);
    assert.ok(!Object.keys(antetSus.h || {}).some((k) => k.toLowerCase() === "origin")); assert.ok(sus.acceptat && catreOm.acceptat);
    assert.deepEqual(JSON.parse(sus.trimise[0]), { op: "SUBSCRIBE", topic: "TRADE", symbol: S });
  });
  test("releu: răspunde EL la PING (PONG spre Pionex), nu-l trimite paginii", () => {
    sus.da("message", { data: '{"op":"PING","timestamp":1}' });
    assert.equal(JSON.parse(sus.trimise.at(-1)).op, "PONG"); assert.equal(catreOm.trimise.length, 0);
  });
  test("releu: trimite paginii DOAR tranzacțiile simbolului cerut", () => {
    sus.da("message", { data: trade("64000", ACUM, "BTC_USDT_PERP") }); assert.equal(catreOm.trimise.length, 0);
    sus.da("message", { data: trade("0.5708", ACUM) }); assert.equal(catreOm.trimise.length, 1); assert.equal(PV.mesaj(catreOm.trimise[0], S).pret, 0.5708);
  });
  test("releu: cadrele BINARE de la Pionex (așa vin) se decodează: PING primește PONG, prețul ajunge ca text", () => {
    const bin = (x) => new TextEncoder().encode(x).buffer, n0 = sus.trimise.length;
    sus.da("message", { data: bin('{"op":"PING","timestamp":2}') }); assert.equal(sus.trimise.length, n0 + 1); assert.equal(JSON.parse(sus.trimise.at(-1)).op, "PONG");
    sus.da("message", { data: bin(trade("0.5711", ACUM)) }); assert.equal(typeof catreOm.trimise.at(-1), "string"); assert.equal(PV.mesaj(catreOm.trimise.at(-1), S).pret, 0.5711);
  });
  test("releu: Pionex închide → se închide și spre pagină (pagina se reconectează singură)", () => { sus.da("close", {}); assert.ok(catreOm.inchis); });
} catch (e) { test("releul se încarcă", () => { throw e; }); }
finally { Object.assign(globalThis, vechi); }

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}\n`);
process.exit(picate ? 1 : 0);
