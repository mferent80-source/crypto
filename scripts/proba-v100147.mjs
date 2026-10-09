// Proba v100.147 (09.10, el: „integrează mai mult busola și verdictul din ea în pagina botului din crypto, la ce spune piața acum” ⇒ toate trei):
// (1) „Direcția, după Busola” - verdictul ei de direcție pe 4h (înclinată spre long / short / așteaptă) față de botul lui și de graficul de acum;
// (2) „Cifra Busolei” - „73 din 100 ies din canalul … în următoarele 2 zile · de obicei 66”, cu nota ei;
// (3) „BTC și botul tău” - BTC pe 24 h, cât de strâns merge moneda cu BTC (corelația 30 de zile), CU / CONTRA pentru botul lui.
// Toate din rezumatul Busolei 1.47.0 (verdict4h, directie4h și pe futures, corBtc, btc.h24); ce lipsește e spus, nu inventat.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}") { a--; if (!a) break; } } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.147 · Busola în „Ce spune piața acum”: direcția, cifra verdictului, BTC și botul tău · proba\n");

const sandbox = () => { const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx); return ctx; };
const ACUM = Date.UTC(2026, 9, 9, 19, 30, 0), LA = ACUM - 20 * 60000;
const rez = () => ({ la: LA, versiune: "1.47.0", btc: { h24: 0.0183, la: LA },
  monede: { MET: { perp4h: "nu-stiu", directie4h: "inclinat-short", corBtc: 0.72, fisa4h: { jos: 0.3982, sus: 0.6414, linii: 17 } },
    BTC: { "4h": "nu-stiu", directie4h: "inclinat-long", corBtc: 1, verdict4h: { cate: 73, ce: "ating ținta înaintea stopului, pe long", deObicei: 61, nota: "minim 56 ca să nu pierzi" } },
    ETH: { "4h": "liniste", directie4h: "asteapta", corBtc: 0.45, verdict4h: { cate: 41, ce: "stau în canalul 3.000–3.200 în următoarele 2 zile", deObicei: 44, nota: "tot iese mai des decât stă" } },
    XRP: { "4h": "nu-stiu", directie4h: "asteapta", corBtc: 0.12, verdict4h: { cate: 66, ce: "ies din canalul 1,27–1,49 în următoarele 2 zile", deObicei: 66 } },
    PONS: { perp4h: "miscare" } },
  grid: { interval: "4h", canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0081, oricand: -0.0094, miscare: -0.0113, futures: { canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0082, oricand: -0.0095, miscare: -0.0114 }, canal4h: "+4,2/−3,9 ATR", fisa4hLa: LA },
  perp: { la: LA, monede: 138, prag: 200000, sursa: "Pionex PERP 4h", bareMediane: 1910 } });

await test("(1) Busola.randDirectie: verdictul de direcție pe 4h față de botul lui și de graficul de acum", () => {
  const B = sandbox().Busola, r = rez();
  const contra = B.randDirectie(r, "MET_USDT_PERP", ACUM, { bot: "LONG", grafic: "sus" });
  assert.equal(contra.nivel, "atentie"); assert.equal(contra.semn, "inclinat-short");
  assert.equal(contra.text, "înclinată spre short · botul tău e long, contra verdictului · graficul de acum spune invers (în sus)");
  const la = B.randDirectie(r, "MET_USDT_PERP", ACUM, { bot: "SHORT", grafic: "jos" });
  assert.equal(la.nivel, "bine"); assert.equal(la.text, "înclinată spre short · ca botul tău (short) · graficul de acum spune la fel");
  const neutru = B.randDirectie(r, "BTC_USDT_PERP", ACUM, { bot: "NEUTRAL", grafic: null });
  assert.equal(neutru.nivel, "info"); assert.equal(neutru.text, "înclinată spre long", "bot neutru, fără grafic: doar verdictul");
  const ast = B.randDirectie(r, "ETH_USDT_PERP", ACUM, { bot: "LONG", grafic: "sus" });
  assert.equal(ast.nivel, "info"); assert.equal(ast.text, "așteaptă (nu s-a dovedit o direcție) · graficul de acum spune în sus, Busola nu-l confirmă pe 4h");
  const fara = B.randDirectie(r, "PONS_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(fara.nivel, "nemasurat"); assert.equal(fara.text, "Busola n-a judecat direcția pe moneda asta");
  assert.equal(B.randDirectie(r, "ZZZ_USDT_PERP", ACUM, { bot: "LONG" }).text, "Busola nu urmărește moneda asta");
  assert.equal(B.randDirectie(r, "1000PEPE_USDT_PERP", ACUM, {}).text, "Busola nu urmărește moneda asta", "cheia fără „1000” (ca restul cartelei)");
  const vechi = B.randDirectie(Object.assign(r, { la: ACUM - 7 * 3600000 }), "MET_USDT_PERP", ACUM, { bot: "SHORT" });
  assert.match(vechi.text, / · măsurat acum 7 h$/, "rezumatul vechi își spune vârsta");
  assert.equal(B.randDirectie(null, "MET_USDT_PERP", ACUM, {}), null);
});
await test("(2) Busola.randVerdict: cifra de pe capul Busolei, cu nota ei; lipsă ⇒ null", () => {
  const B = sandbox().Busola, r = rez();
  const b = B.randVerdict(r, "BTC_USDT_PERP", ACUM);
  assert.equal(b.nivel, "info"); assert.equal(b.text, "73 din 100 ating ținta înaintea stopului, pe long · de obicei 61 · minim 56 ca să nu pierzi");
  const e = B.randVerdict(r, "ETH_USDT_PERP", ACUM);
  assert.equal(e.nivel, "atentie", "nota „tot iese mai des decât stă” = cifra singură ar păcăli"); assert.equal(e.text, "41 din 100 stau în canalul 3.000–3.200 în următoarele 2 zile · de obicei 44 · tot iese mai des decât stă");
  assert.equal(B.randVerdict(r, "XRP_USDT_PERP", ACUM).text, "66 din 100 ies din canalul 1,27–1,49 în următoarele 2 zile · de obicei 66 · cât de obicei");
  assert.equal(B.randVerdict(r, "MET_USDT_PERP", ACUM), null, "pe futures Busola n-are cifra (doar pe cele 30 de monede ale ei)");
  assert.equal(B.randVerdict(r, "ZZZ", ACUM), null);
  assert.match(B.randVerdict(Object.assign(r, { la: ACUM - 7 * 3600000 }), "BTC_USDT_PERP", ACUM).text, / · măsurat acum 7 h$/);
});
await test("(3) Busola.randBtc: BTC pe 24 h, cât de strâns merge moneda cu BTC, CU / CONTRA pentru botul lui", () => {
  const B = sandbox().Busola, r = rez();
  const cu = B.randBtc(r, "MET_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(cu.nivel, "bine"); assert.equal(cu.text, "BTC a urcat 1,8% în 24 h · MET merge cu BTC: DA (0,72) · dacă BTC urcă mai departe, botul tău long e CU");
  const contra = B.randBtc(r, "MET_USDT_PERP", ACUM, { bot: "SHORT" });
  assert.equal(contra.nivel, "atentie"); assert.match(contra.text, /dacă BTC urcă mai departe, botul tău short e CONTRA$/);
  const partial = B.randBtc(r, "ETH_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(partial.nivel, "bine"); assert.match(partial.text, /ETH merge cu BTC: PARȚIAL \(0,45\) · dacă BTC urcă mai departe, botul tău long e CU$/);
  const nu = B.randBtc(r, "XRP_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(nu.nivel, "info"); assert.equal(nu.text, "BTC a urcat 1,8% în 24 h · XRP merge cu BTC: NU (0,12), BTC nu-l prea mișcă", "independent de BTC: fără CU / CONTRA");
  const necun = B.randBtc(r, "PONS_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(necun.nivel, "info"); assert.equal(necun.text, "BTC a urcat 1,8% în 24 h · legătura PONS–BTC nemăsurată");
  const jos = B.randBtc(Object.assign(rez(), { btc: { h24: -0.021, la: LA } }), "MET_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(jos.nivel, "atentie"); assert.equal(jos.text, "BTC a coborât 2,1% în 24 h · MET merge cu BTC: DA (0,72) · dacă BTC coboară mai departe, botul tău long e CONTRA");
  const loc = B.randBtc(Object.assign(rez(), { btc: { h24: 0.002, la: LA } }), "MET_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(loc.nivel, "info"); assert.equal(loc.text, "BTC aproape pe loc în 24 h · MET merge cu BTC: DA (0,72) · botul tău long e CU dacă BTC urcă, CONTRA dacă coboară");
  const neutru = B.randBtc(r, "MET_USDT_PERP", ACUM, { bot: "NEUTRAL" });
  assert.equal(neutru.text, "BTC a urcat 1,8% în 24 h · MET merge cu BTC: DA (0,72)", "bot neutru: fără CU / CONTRA");
  const fh = B.randBtc(Object.assign(rez(), { btc: { h24: null, la: LA } }), "MET_USDT_PERP", ACUM, { bot: "LONG" });
  assert.equal(fh.text, "BTC pe 24 h necunoscut · MET merge cu BTC: DA (0,72)", "h24 null = spus, nu 0");
  assert.equal(B.randBtc(Object.assign(rez(), { btc: undefined }), "MET_USDT_PERP", ACUM, { bot: "LONG" }), null, "rezumat vechi (1.46) fără blocul btc ⇒ fără rând");
  assert.match(B.randBtc(Object.assign(rez(), { la: ACUM - 7 * 3600000 }), "MET_USDT_PERP", ACUM, { bot: "LONG" }).text, / · măsurat acum 7 h$/);
});
await test("(4) pagina: tbCitireExtra dă cele trei rânduri noi (direcția din rândul „Direcția” al citirii), tbDeseneazaCitire le pune în ordinea Busolei, în amândouă locurile", () => {
  const ctx = sandbox(); const r = rez(); ctx.Busola.rezumat = () => r;
  ctx.tbStare = { bot: { id: "9", baza: "MET.PERP", quote: "USDT", directie: "LONG", gridJos: 0.46, gridSus: 0.50 }, graficInterval: "5M", directie: null };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbCheieDir = () => "MET_USDT_PERP|LONG"; ctx.tbCheieBusola = () => "MET_USDT_PERP"; ctx.tbPazaKv = { boti: {} };
  vm.runInContext("var TB_PERIOADE=" + APP.match(/var TB_PERIOADE=(\{[^\n]*\});/)[1] + ";\n" + ["tbTf", "tbPretScurt", "tbRotPct", "tbCitireExtra"].map((n) => functie(APP, n)).join("\n"), ctx);
  const c = { randuri: [{ ce: "Direcția", stare: "info", text: "în sus: EMA 20 peste EMA 50, prețul peste amândouă" }] };
  const x = ctx.tbCitireExtra(ctx.tbStare.bot, {}, c);
  assert.equal(x.busolaDirectie.ce, "Direcția, după Busola"); assert.equal(x.busolaDirectie.stare, "atentie"); assert.equal(x.busolaDirectie.text, "înclinată spre short · botul tău e long, contra verdictului · graficul de acum spune invers (în sus)");
  assert.equal(x.busolaVerdict, null, "MET n-are cifră ⇒ fără rând");
  assert.equal(x.busolaBtc.ce, "BTC și botul tău"); assert.equal(x.busolaBtc.stare, "bine"); assert.match(x.busolaBtc.text, /^BTC a urcat 1,8% în 24 h · MET merge cu BTC: DA \(0,72\) · dacă BTC urcă mai departe, botul tău long e CU$/);
  const y = ctx.tbCitireExtra(ctx.tbStare.bot, {});   // fără citire (c lipsă): fără graficul de acum, nimic nu crapă
  assert.equal(y.busolaDirectie.text, "înclinată spre short · botul tău e long, contra verdictului");
  r.monede.MET.directie4h = undefined; const z = ctx.tbCitireExtra(ctx.tbStare.bot, {}, c);
  assert.equal(z.busolaDirectie.stare, "info"); assert.equal(z.busolaDirectie.text, "Busola n-a judecat direcția pe moneda asta", "nemăsurat = spus, pe gri");
  ctx.tbCheieBusola = () => "BTC_USDT_PERP"; const w = ctx.tbCitireExtra(ctx.tbStare.bot, {}, c);
  assert.equal(w.busolaVerdict.ce, "Cifra Busolei"); assert.match(w.busolaVerdict.text, /^73 din 100 ating ținta înaintea stopului, pe long · de obicei 61/);
  const d = functie(APP, "tbDeseneazaCitire");
  assert.match(d, /tbCitireExtra\(b,o,c\)/, "citirea îi dă direcția graficului");
  assert.equal((d.match(/\[ex\.busola,ex\.busolaDirectie,ex\.busolaVerdict,ex\.busolaGrid,ex\.busolaInterval,ex\.busolaBtc\]/g) || []).length, 1, "ordinea Busolei, o singură dată (ajutorul)");
  assert.equal((d.match(/busolaRanduri\(\)/g) || []).length, 2, "chemat în amândouă locurile (după Funding și fără Funding)");
});
await test("(E) versiunea de la v100.147 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[7-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[7-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[7-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[7-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[7-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[7-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[7-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
