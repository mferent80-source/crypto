// Proba v100.148 / colector v101.91 (09.10, el: „fă ideile” I-571..I-576):
// I-571 fraza-concluzie: graficul pe 4h, Busola și Monte Carlo spun la fel / se contrazic (Busola.concluzie, pur; în capul citirii);
// I-576 Busola pe 1h și 1z lângă 4h (Busola.alteIntervale, în rândul „Busola”);
// I-575 „BTC și botul tău” pe cartela botului din Acasă (tbBusolaLinie) + rândul de dimineață (Busola.liniaBtc, colectorul);
// I-572 paza boților: alertă la TRECEREA Busolei pe „invers față de botul tău” și la CONTRA cu legătură DA și BTC mișcat ≥ 2% —
//       după 2 rezumate la rând, cel mult una pe bot la 4 h, mesajul netrimis nu mută starea (lib/paza-boti.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as P from "./lib/paza-boti.mjs";
import * as MC from "./lib/mesaje-colector.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), COL = citeste("scripts", "colector.mjs");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}") { a--; if (!a) break; } } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.148 · vocile, Busola pe 1h/1z, BTC pe Acasă și dimineața, paza pe direcție și BTC · proba\n");

const sandbox = () => { const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx); return ctx; };
const B = sandbox().Busola;
const ACUM = Date.UTC(2026, 9, 9, 19, 30, 0), LA = ACUM - 20 * 60000, H4 = 4 * 3600000;
const rez = (o) => Object.assign({ la: LA, versiune: "1.48.0", btc: { h24: -0.023, la: LA },
  monede: { MET: { perp4h: "nu-stiu", directie4h: "inclinat-short", corBtc: 0.72 }, NIL: { perp4h: "liniste", directie4h: "inclinat-long", corBtc: 0.45 },
    ETH: { "1h": "liniste", "4h": "nu-stiu", "1z": "nemasurat", directie4h: "asteapta", corBtc: 0.8 }, XRP: { "4h": "nu-stiu", "1z": "liniste", directie4h: "asteapta", corBtc: 0.1 }, PONS: { perp4h: "miscare" } },
  grid: { interval: "4h", canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0081, oricand: -0.0094, miscare: -0.0113 },
  perp: { la: LA, monede: 138, prag: 200000, sursa: "Pionex PERP 4h", bareMediane: 1910 } }, o || {});

await test("(I-571) Busola.concluzie: vocile spun la fel / se contrazic, față de botul lui; culoarea doar ca avertizare", () => {
  const laFel = B.concluzie({ bot: "LONG", grafic: "urca", busola: "inclinat-long", mc: "bine" });
  assert.equal(laFel.nivel, "info"); assert.equal(laFel.text, "Graficul pe 4h, Busola și Monte Carlo spun la fel: cu botul tău (long)");
  const contra = B.concluzie({ bot: "LONG", grafic: "coboara", busola: "inclinat-short", mc: "rau" });
  assert.equal(contra.nivel, "atentie"); assert.equal(contra.text, "Graficul pe 4h, Busola și Monte Carlo spun la fel: contra botului tău (long)");
  const mixt = B.concluzie({ bot: "LONG", grafic: "urca", busola: "inclinat-short", mc: "bine" });
  assert.equal(mixt.nivel, "atentie"); assert.equal(mixt.text, "Vocile se contrazic: graficul pe 4h urcă · Busola înclină short (nedovedit) · Monte Carlo aș ține");
  const partial = B.concluzie({ bot: "SHORT", grafic: "coboara", busola: "asteapta", mc: "atentie" });
  assert.equal(partial.nivel, "info"); assert.equal(partial.text, "Graficul pe 4h spune: cu botul tău (short) · Busola așteaptă · Monte Carlo la limită");
  const una = B.concluzie({ bot: "SHORT", grafic: null, busola: "inclinat-long", mc: null });
  assert.equal(una.nivel, "atentie"); assert.equal(una.text, "Busola spune: contra botului tău (short)");
  const lateral = B.concluzie({ bot: "LONG", grafic: "lateral", busola: "asteapta", mc: null });
  assert.equal(lateral.nivel, "info"); assert.equal(lateral.text, "Vocile: graficul pe 4h e lateral · Busola așteaptă", "nicio voce nu ia partea nimănui ⇒ doar listate");
  const neutru = B.concluzie({ bot: "NEUTRAL", grafic: "urca", busola: "inclinat-short", mc: "bine" });
  assert.equal(neutru.nivel, "info"); assert.equal(neutru.text, "Vocile: graficul pe 4h urcă · Busola înclină short (nedovedit) · Monte Carlo aș ține", "botul neutru n-are „cu / contra”");
  assert.equal(B.concluzie({ bot: "LONG", grafic: null, busola: null, mc: null }), null, "nicio voce ⇒ nimic");
  assert.equal(B.concluzie({ bot: "LONG", grafic: null, busola: "nemasurat", mc: "info" }), null, "voci necunoscute ⇒ nimic");
});
await test("(I-571) pagina: tbDeseneazaCitire pune fraza vocilor în capul citirii (tbCitVoci), din semaforul pe 4h, direcția Busolei și Monte Carlo", () => {
  const d = functie(APP, "tbDeseneazaCitire");
  assert.match(d, /Busola\.concluzie\(\{bot:b\.directie,grafic:[^}]*4H[^}]*,busola:[^}]*,mc:[^}]*\}\)/, "vocile din semaforul 4H + randDirectie + tbMcRand");
  assert.match(d, /class="tbCitVoci '\+voci\.nivel\+'">/, "paragraful vocilor, cu starea lui");
  assert.match(citeste("public", "app.css"), /\.tbCitVoci\.atentie/, "galben când se contrazic");
});
await test("(I-576) Busola.alteIntervale: 1h și 1z lângă 4h, doar unde există; pe futures nimic", () => {
  assert.equal(B.alteIntervale(rez(), "ETH_USDT_PERP"), "pe 1h mai calmă · pe 1z nemăsurată");
  assert.equal(B.alteIntervale(rez(), "XRP_USDT_PERP"), "pe 1z mai calmă");
  assert.equal(B.alteIntervale(rez(), "MET_USDT_PERP"), null, "futures: doar 4h");
  assert.equal(B.alteIntervale(rez({ monede: { BTC: { "1h": "miscare", "4h": "nu-stiu", "1z": "nu-stiu" } } }), "BTC_USDT_PERP"), "pe 1h mai agitată · pe 1z nimic neobișnuit");
  assert.equal(B.alteIntervale(null, "ETH"), null);
  assert.match(functie(APP, "tbCitireExtra"), /Busola\.alteIntervale\(rez,tbCheieBusola\(b\)\)/, "rândul „Busola, pe 4h” primește și 1h/1z");
});
await test("(I-575) Busola.liniaBtc (dimineața) + rândul pe cartela botului din Acasă", () => {
  const l = [{ nume: "MET", cheie: "MET_USDT_PERP", directie: "SHORT" }, { nume: "NIL", cheie: "NIL_USDT_PERP", directie: "LONG" }, { nume: "PONS", cheie: "PONS_USDT_PERP", directie: "LONG" }, { nume: "XRP", cheie: "XRP_USDT_PERP", directie: "LONG" }];
  assert.equal(B.liniaBtc(rez(), l, ACUM), "BTC a coborât 2,3% în 24 h · MET short CU (0,7) · NIL long CONTRA (0,5) · PONS long nemăsurat · XRP long independent (0,1)", "și la nemăsurat / independent se vede sensul botului");
  assert.equal(B.liniaBtc(rez({ btc: { h24: 0.001, la: LA } }), l.slice(0, 1), ACUM), "BTC aproape pe loc în 24 h · MET short merge cu BTC: DA (0,7)");
  assert.equal(B.liniaBtc(rez({ btc: { h24: null, la: LA } }), l.slice(0, 1), ACUM), "BTC pe 24 h necunoscut · MET short merge cu BTC: DA (0,7)");
  assert.equal(B.liniaBtc(rez({ btc: undefined }), l, ACUM), null, "rezumat fără btc ⇒ fără rând");
  assert.equal(B.liniaBtc(rez(), [], ACUM), null);
  assert.match(B.liniaBtc(rez({ la: ACUM - 7 * 3600000 }), l.slice(0, 1), ACUM), / · măsurat acum 7 h$/);
  assert.match(functie(APP, "tbBusolaLinie"), /Busola\.randBtc\(/, "cartela botului din Acasă are rândul BTC");
  assert.match(COL, /Busola\.liniaBtc\(/, "colectorul pune rândul în rezumatul de dimineață");
  assert.match(COL, /"₿ BTC și boții tăi: "/, "cu prefixul lui, lângă rândul Busolei");
});
await test("(I-572) paza: alertă la trecerea Busolei pe „invers față de botul tău”, după 2 rezumate la rând, cel mult una la 4 h", () => {
  const bot = { id: "9", baza: "MET.PERP", simbolPionex: "MET_USDT_PERP", directie: "LONG", levier: 3, pornitLa: ACUM - 86400000 };
  const r1 = rez(), d1 = P.pazaDirectie({ Busola: B, rez: r1, bot, inainte: undefined, acum: ACUM });
  assert.equal(d1.tine, true); assert.equal(d1.stare.semn, "inclinat-short"); assert.equal(d1.stare.vazut, 1); assert.equal(d1.mesaj, null, "prima vedere: se ține minte, nu se anunță");
  const d1b = P.pazaDirectie({ Busola: B, rez: r1, bot, inainte: d1.stare, acum: ACUM + 60000 });
  assert.equal(d1b.stare.vazut, 1, "același rezumat ⇒ nu numără de două ori"); assert.equal(d1b.mesaj, null);
  const r2 = rez({ la: LA + H4 }), d2 = P.pazaDirectie({ Busola: B, rez: r2, bot, inainte: d1.stare, acum: ACUM + H4 });
  assert.equal(d2.stare.vazut, 2); assert.ok(d2.mesaj, "al 2-lea rezumat la rând pe invers ⇒ mesaj");
  assert.equal(d2.mesaj.cheie, "busola-directie"); assert.equal(d2.mesaj.nivel, "atentie"); assert.match(d2.mesaj.titlu, /^MET long 3× · Busola: înclină short, invers față de bot/);
  assert.match(d2.mesaj.mesaj, /nedovedit/); assert.equal(d2.stare.anuntat, ACUM + H4);
  const r3 = rez({ la: LA + 2 * H4 }), d3 = P.pazaDirectie({ Busola: B, rez: r3, bot, inainte: d2.stare, acum: ACUM + 2 * H4 });
  assert.equal(d3.mesaj, null, "rămâne invers: nu se repetă (anunțat acum 4 h, pragul e > 4 h)"); assert.equal(d3.stare.anuntat, ACUM + H4);
  const r4 = rez({ la: LA + 4 * H4 }), d4 = P.pazaDirectie({ Busola: B, rez: r4, bot, inainte: d3.stare, acum: ACUM + 4 * H4 + 1 });
  assert.ok(d4.mesaj, "după peste 4 h și tot invers ⇒ din nou (cel mult una la 4 h)");
  const ca = P.pazaDirectie({ Busola: B, rez: rez({ la: LA + 2 * H4, monede: { MET: { perp4h: "nu-stiu", directie4h: "inclinat-long" } } }), bot, inainte: d2.stare, acum: ACUM + 2 * H4 });
  assert.equal(ca.stare.semn, "inclinat-long"); assert.equal(ca.stare.vazut, 1); assert.equal(ca.mesaj, null, "a trecut pe „ca botul”: tăcere, se numără de la 1");
  const sh = P.pazaDirectie({ Busola: B, rez: r2, bot: Object.assign({}, bot, { directie: "SHORT" }), inainte: d1.stare, acum: ACUM + H4 });
  assert.equal(sh.mesaj, null, "botul short pe Busola short = ca botul, nimic");
  assert.equal(P.pazaDirectie({ Busola: B, rez: rez({ la: ACUM - 5 * 3600000 }), bot, inainte: d1.stare, acum: ACUM }).tine, false, "rezumat vechi (> 4,5 h): nu atinge starea");
  assert.equal(P.pazaDirectie({ Busola: B, rez: rez(), bot: Object.assign({}, bot, { baza: "PONS.PERP", simbolPionex: "PONS_USDT_PERP" }), inainte: undefined, acum: ACUM }).tine, false, "fără direcție pe monedă: nimic");
  assert.equal(P.pazaDirectie({ Busola: B, rez: rez(), bot: Object.assign({}, bot, { directie: "NEUTRAL" }), inainte: undefined, acum: ACUM }).tine, false, "botul neutru n-are „invers”");
});
await test("(I-572) paza: alertă la CONTRA cu legătură DA și BTC mișcat ≥ 2%, aceleași reguli (2 rezumate, 4 h)", () => {
  const bot = { id: "9", baza: "MET.PERP", simbolPionex: "MET_USDT_PERP", directie: "LONG", levier: 3 };
  const d1 = P.pazaBtc({ Busola: B, rez: rez(), bot, inainte: undefined, acum: ACUM });   // BTC −2,3%, MET DA 0,72, bot long ⇒ CONTRA
  assert.equal(d1.tine, true); assert.equal(d1.stare.contra, true); assert.equal(d1.stare.vazut, 1); assert.equal(d1.mesaj, null);
  const d2 = P.pazaBtc({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: d1.stare, acum: ACUM + H4 });
  assert.ok(d2.mesaj); assert.equal(d2.mesaj.cheie, "busola-btc"); assert.match(d2.mesaj.titlu, /^MET long 3× · BTC a coborât 2,3% în 24 h, botul tău e CONTRA/);
  assert.match(d2.mesaj.mesaj, /merge cu BTC: DA \(0,7\)/); assert.match(d2.mesaj.mesaj, /nu e o prezicere/);
  const mic = P.pazaBtc({ Busola: B, rez: rez({ btc: { h24: -0.012, la: LA + H4 }, la: LA + H4 }), bot, inainte: d1.stare, acum: ACUM + H4 });
  assert.equal(mic.stare.contra, false); assert.equal(mic.mesaj, null, "BTC −1,2%: sub 2%, nu e trecere");
  const partial = P.pazaBtc({ Busola: B, rez: rez({ la: LA + H4 }), bot: Object.assign({}, bot, { baza: "NIL.PERP", simbolPionex: "NIL_USDT_PERP" }), inainte: { contra: true, vazut: 1, la: LA, anuntat: 0 }, acum: ACUM + H4 });
  assert.equal(partial.stare.contra, false, "legătura PARȚIALĂ nu e CONTRA");
  const cu = P.pazaBtc({ Busola: B, rez: rez({ la: LA + H4 }), bot: Object.assign({}, bot, { directie: "SHORT" }), inainte: d1.stare, acum: ACUM + H4 });
  assert.equal(cu.stare.contra, false); assert.equal(cu.mesaj, null, "botul short pe BTC în cădere e CU");
  assert.equal(P.pazaBtc({ Busola: B, rez: rez({ btc: undefined }), bot, inainte: d1.stare, acum: ACUM }).tine, false, "rezumat fără btc: nu atinge starea");
  const d3 = P.pazaBtc({ Busola: B, rez: rez({ la: LA + 2 * H4 }), bot, inainte: d2.stare, acum: ACUM + 2 * H4 });
  assert.equal(d3.mesaj, null, "nu se repetă în 4 h");
});
await test("(I-572) pazaPas: pasul colectorului trece și prin direcție și BTC; mesajul netrimis nu mută starea; mesajele în colector", async () => {
  const bot = { id: "9", baza: "MET.PERP", simbolPionex: "MET_USDT_PERP", directie: "LONG", levier: 3, pornitLa: ACUM - 86400000 };
  const st = {}, trimise = [];
  let merge = true;
  const pas = (r, acum) => P.pazaPas({ Busola: B, rez: r, bot, st, acum, pret: String, trimite: async (m) => { trimise.push(m.cheie); return merge; }, monede: {} });
  await pas(rez(), ACUM); assert.equal(st._busolaDir.vazut, 1); assert.equal(st._busolaBtc.vazut, 1); assert.equal(trimise.length, 0);
  merge = false; await pas(rez({ la: LA + H4 }), ACUM + H4);
  assert.deepEqual(trimise, ["busola-directie", "busola-btc"], "amândouă încercate"); assert.equal(st._busolaDir.vazut, 1, "netrimis ⇒ starea rămâne (tura următoare reîncearcă)"); assert.equal(st._busolaBtc.vazut, 1);
  merge = true; await pas(rez({ la: LA + H4 }), ACUM + H4 + 60000);
  assert.equal(trimise.length, 4); assert.equal(st._busolaDir.vazut, 2); assert.equal(st._busolaDir.anuntat, ACUM + H4 + 60000); assert.equal(st._busolaBtc.anuntat, ACUM + H4 + 60000);
  assert.equal(typeof MC.busolaDirectie, "function"); assert.equal(typeof MC.busolaBtc, "function");
  assert.match(COL, /VERSIUNE_COLECTOR = "v101\.9[1-9]"/, "colectorul v101.91+");
});
await test("(E) versiunea de la v100.148 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[8-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[8-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[8-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[8-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[8-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[8-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[8-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
