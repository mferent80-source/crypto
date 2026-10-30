// Proba v100.233 (21.10, el: „fa tot”): gura crypto aude abaterea de cantitate,
// reconcilierea își spune marginea, măsura pe zilele salvate, a doua citire din export.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
vm.runInContext(citeste("public", "lib", "cont-intreg.js"), ctx);
const AC = ctx.Acasa, CI = ctx.ContIntreg;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.233 · CITIRE · proba\n");

const acasa = citeste("public", "lib", "acasa.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const cont = citeste("public", "lib", "cont-ecran.js");
const intreg = citeste("public", "lib", "cont-intreg.js");
const act = citeste("public", "lib", "actiuni-semnale.js");
const col = citeste("scripts", "colector.mjs");
const tp = citeste("scripts", "lib", "tura-piata.mjs");
const idx = citeste("public", "index.html");
// v100.259 (audit 23.10): pe Acasă fraza spune că e la T212 și unde se vede; paginile T212 (actiuni-semnale) păstrează fraza veche.
// Fraza veche: "N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont."
const FRAZA = "N-aș da o sumă: jurnalul T212 nu se potrivește cu contul → Contul întreg.";
const lin = () => AC.vreme({ clasament: { evita: 10, candidati: 90, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const ros = () => AC.vreme({ clasament: { evita: 70, candidati: 30, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const sus = (i) => 100 + i * 0.2;
const serie = (f) => Array.from({ length: 260 }, (_, i) => ({ c: f(i) }));
const larga = () => AC.vremeBursa({ qqq: serie(sus), vix: 14, ndx: { e50: 70, n: 100 } });
const ab = (extra) => Object.assign({ raportStare: "ok", raport: { reconciliere: { t212: { abateri: [{ ticker: "AAPL_US_EQ" }] } }, valoare: { total: 100000 }, risc: { var95: 1000 } } }, extra || {});

await test("gura care invită spune fraza de cantitate și la bursă; pauza rămâne prima; roșul nu o ia", () => {
  /* v100.259 (audit 23.10): abaterea de cantitate e a jurnalului T212 ⇒ nu mai frânează cardul Crypto, doar pe Nasdaq (înainte: Crypto spunea FRAZA). */
  assert.match(AC.franaVerb(lin(), ab()).faCe, /^Aș porni/);
  assert.equal(FRAZA.length <= 110, true);
  assert.match(AC.franaVerb(lin(), ab({ fel: "crypto", pauza: true, pauzaN: 3 })).faCe, /alt bot azi/);
  assert.equal(AC.franaVerb(ros(), ab()).faCe, ros().faCe);
  assert.equal(AC.franaVerb(larga(), ab({ fel: "bursa" })).faCe, FRAZA);
  assert.match(AC.franaVerb(larga(), ab({ fel: "bursa" })).faCe, /jurnalul T212 nu se potrivește/);   // v100.259: era /jurnalul nu se potrivește/
  // v100.259: pe Crypto rămân frânele crypto (raportul vechi / lipsă); cantitatea și exportul T212 frânează doar Nasdaq. Era: … .faCe, FRAZA) de două ori
  assert.match(AC.franaVerb(lin(), ab({ raportStare: "vechi", raportOre: 20 })).faCe, /e vechi de 20 de ore/);
  assert.match(AC.franaVerb(lin(), { raportStare: "lipsa", exportNePotrivit: true }).faCe, /raportul pe tot contul lipsește/);
  assert.equal(AC.franaVerb(larga(), ab({ fel: "bursa", raportStare: "vechi", raportOre: 20 })).faCe, FRAZA);
  assert.equal(AC.franaVerb(larga(), { fel: "bursa", raportStare: "lipsa", exportNePotrivit: true }).faCe, FRAZA);
  assert.match(AC.franaVerb(lin(), { fel: "crypto", pauza: true, pauzaN: 4, exportNePotrivit: true }).faCe, /alt bot azi/);
  assert.match(AC.franaVerb(lin(), { raportStare: "ok", raport: { reconciliere: { t212: { abateri: [] } }, valoare: { total: 100000 }, risc: { var95: 1000 } } }).faCe, /^Aș porni/);
  assert.match(act, /N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont\./);
  const fn = acasa.slice(acasa.indexOf("function franaVerb"), acasa.indexOf("function ziBucMs"));
  assert.ok(fn.indexOf("o.pauza === true") < fn.indexOf("!invita") && fn.indexOf("!invita") < fn.indexOf("areAbateriCantitate"));
  assert.match(ae, /acExportNePotrivit\(\)/);
  assert.match(tp, /o\.raport = c/);
  assert.doesNotMatch(col, /exportNePotrivit/);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.(13[2-9]|1[4-9]\d)"/);
});

await test("marginea spune ce s-a verificat și pune fraza de split doar lângă simbolul cu preț nepotrivit", () => {
  const m = CI.margine();
  assert.match(m, /cantitatea din Trading 212/);
  assert.match(m, /arhiva boților din Pionex/);
  assert.match(m, /istoric proaspăt/);
  assert.match(m, /N-am verificat cash-ul, cursul umplerilor, split-ul și dividendul/);
  assert.doesNotMatch(m, /\d[\d.\s]*lei/);
  const sp = "prețurile găsite nu se potrivesc cu ale tale (split sau alt simbol)";
  assert.equal(CI.notaSplit("AAPL_US_EQ", ["AAPL"]), sp);
  assert.equal(CI.notaSplit("MSFT_US_EQ", ["AAPL"]), "");
  assert.equal(CI.notaSplit("AAPL", []), "");
  assert.equal(CI.notaSplit("AAPL", null), "");
  assert.match(act, /prețurile găsite nu se potrivesc cu ale tale \(split sau alt simbol\)/);
  assert.match(cont, /ContIntreg\.margine/);
  assert.match(cont, /ContIntreg\.notaSplit/);
  const rec = CI.reconciliereT212([{ ticker: "AAPL_US_EQ", quantity: 10 }], [{ ticker: "AAPL", qty: 10 }]);
  assert.equal(rec.ok, false);
  assert.match(intreg, /Math\.abs\(dif\) > Math\.max\(1e-6, 0\.001 \* Math\.max\(a, j\)\)/);
});

await test("măsura spune n-am aflat fără zile complete și nu inventează suma", () => {
  const gol = AC.masuraFranei([{ pornit: Date.parse("2026-10-21T12:00:00Z"), baza: 10, rezultat: 1 }], [{ z: "2026-10-21", valoare: 10, pionex: 1, t212: 1, salt: 0, complet: true }]);
  assert.equal(gol.aflat, false);
  assert.match(gol.text, /^N-am aflat: zilele vechi nu au pauza/);
  assert.equal(gol.baza, null);
  const ziua = { z: "2026-10-21", pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
  const pornit = Date.parse("2026-10-21T12:00:00Z");
  const m = AC.masuraFranei([{ id: "b", pornit, baza: 100, rezultat: -4 }], [ziua]);
  assert.equal(m.aflat, true);
  assert.equal(m.schimbate, 1);
  assert.equal(m.baza, 100);
  assert.equal(m.rezultat, -4);
  assert.match(m.text, /Boții porniți în zilele cu frână: 100,0 puși, rezultat −4,0\./);
  assert.doesNotMatch(m.text, /gura|Poza|Cartea|Partea liniștită|100,00/);   /* v100.275: fără vorbele vechi, o zecimală */
  assert.match(m.text, /nu arată că frâna face bani/);
  assert.match(m.text, /Prea puține zile ca să tragem o concluzie/);
  const fara = AC.masuraFranei([{ pornit, rezultat: -4 }], [ziua]);
  assert.equal(fara.baza, null);
  assert.match(fara.text, /Nu știu suma pusă: lipsește la 1 bot\./);
  const faraCarte = AC.masuraFranei(null, [ziua]);
  assert.equal(faraCarte.baza, null);
  assert.match(faraCarte.text, /Nu am lista boților închiși, deci nu știu suma pusă\./);
  const linistita = { z: "2026-10-21", pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
  const zero = AC.masuraFranei([{ pornit, baza: 50, rezultat: 3 }], [linistita]);
  assert.equal(zero.schimbate, 0);
  assert.equal(zero.baza, null);
  const zece = Array.from({ length: 10 }, (_, i) => ({ z: "2026-09-" + String(i + 1).padStart(2, "0"), pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "", raport: { valoare: { total: 1 }, risc: { var95: 0 } } }));
  const destul = AC.masuraFranei([], zece);
  assert.equal(destul.schimbate, 10);
  assert.equal(destul.insuficient, false);
  assert.doesNotMatch(destul.text, /Prea puține zile ca să tragem o concluzie/);
  const ms = acasa.slice(acasa.indexOf("function masuraFranei"), acasa.indexOf("// socoteala alertelor"));
  assert.doesNotMatch(ms, /yahoo|Obiceiuri|franaIstoric|0\.04/);
  assert.match(ae, /radar-frana-zile-v1/);
  assert.match(cont, /Măsura frânei pe cartea închisă/);
});

await test("exportul cunoscut se compară la aceeași margine; antetul necunoscut nu inventează abateri", () => {
  const ist = CI.citesteExport('Action,Ticker,Name,No. of shares\nMarket buy,AAPL,"Apple, Inc.",10\nLimit sell,AAPL,Apple,4\nDeposit,CASH,Cash,1000\nDividend,AAPL,Apple,1\n');
  assert.equal(ist.ok, true);
  assert.equal(ist.cantitati.AAPL, 6);
  assert.equal(ist.cantitati.CASH, undefined);
  const semi = CI.citesteExport("\uFEFFAction;Ticker;No. of shares\nMarket buy;AAPL;1,5\n");
  assert.equal(semi.ok, true);
  assert.equal(semi.cantitati.AAPL, 1.5);
  const poz = CI.citesteExport("Ticker,Quantity\nAAPL,4\nMSFT,2\n");
  assert.equal(poz.ok, true);
  assert.equal(poz.fel, "pozitii");
  const rau = CI.citesteExport("Foo,Bar\n1,2\n");
  assert.equal(rau.ok, false);
  assert.equal(rau.cantitati, null);
  const gol = CI.citesteExport("Action,Ticker,No. of shares\nDeposit,CASH,Cash,5\n");
  assert.equal(gol.ok, false);
  assert.equal(CI.acelasiPrag(1000, 1001), true);
  assert.equal(CI.acelasiPrag(1000, 1002), false);
  const potrivit = CI.treiCitiri([{ ticker: "AAPL_US_EQ", quantity: 10 }], [{ ticker: "AAPL_US_EQ", qty: 3 }], { AAPL: 10 });
  assert.equal(potrivit.nePotrivit, false);
  assert.equal(potrivit.randuri[0].jurnal, 3);
  assert.equal(potrivit.randuri[0].api, 10);
  const diferit = CI.treiCitiri([{ ticker: "AAPL_US_EQ", quantity: 10 }], null, { AAPL: 7 });
  assert.equal(diferit.nePotrivit, true);
  assert.equal(diferit.randuri[0].jurnal, null);
  const dupa = cont.slice(cont.indexOf("async function ciDupaExport"), cont.indexOf("function ciDupaExportDesen"));
  assert.match(dupa, /getJSON\("\/api\/t212\?action=pozitii"\)/);
  assert.match(dupa, /nePotrivit: false/);
  assert.match(dupa, /nePotrivit: cmp\.nePotrivit === true/);
  assert.doesNotMatch(dupa, /POST|"method"/);
  assert.match(cont, /<th>API<\/th><th>Jurnal<\/th><th>Export<\/th>/);
  assert.match(cont, /id="ciExportBtn"/);
  assert.match(cont, /A doua citire din exportul tău lipsește/);
});

await test("versiunea de la v100.233 în sus", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 233);
  assert.equal(P.scripts["test:v100233"], "node scripts/proba-v100233.mjs");
  assert.equal((P.scripts.test.match(/test:v100233/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100232/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100233"], /npm run test:v100233/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(idx, new RegExp('id="sideVersiune"[^>]*>v100\\.' + minor + " · "));
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + minor + '"'));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
  assert.match(info.badge, new RegExp("^v100\\." + minor + " · "));
  assert.equal(info.engineContract, "54.1");
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.(13[2-9]|1[4-9]\d)"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
