// Proba v100.205 (16.10.2026, el: „fă” — punctul 1 după auditul Busolei): direcția Busolei n-a bătut întâmplarea (pe un an, 21.660 de
// momente; când a zis direcția 16.09–16.10, ținta 38–42% față de ~43% cât trebuia) ⇒ în Radar ea rămâne INFORMAȚIE:
//  · rândul „Direcția, după Busola” nu mai e galben când e invers față de bot (textul rămâne) ⇒ alerta „Busola invers față de bot” nu mai pleacă;
//  · în „vocile” Busola se vede, dar NU se numără la „spun la fel / se contrazic” (rămân graficul pe 4h și Monte Carlo);
//  · episodul „vocile contra” rămâne anunțat cât vocile sunt contra sau se contrazic (înainte era legat de Busola ⇒ cu Busola pe
//    „așteaptă”, aproape mereu, mesajul se putea repeta la 4 h).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as P from "./lib/paza-boti.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 500)}`); }); }
console.log("\nv100.205 · direcția Busolei = informație, nu avertizare · proba\n");
const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }); vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx);
const B = ctx.Busola;
const ACUM = Date.UTC(2026, 9, 16, 8, 0, 0), LA = ACUM - 20 * 60000, H4 = 4 * 3600000, H24 = 24 * 3600000;
const rez = (o) => Object.assign({ la: LA, versiune: "1.63.0", btc: { h24: -0.023, la: LA }, monede: { MET: { perp4h: "nu-stiu", directie4h: "inclinat-short", corBtc: 0.72 }, ETH: { "4h": "nu-stiu", directie4h: "asteapta" } },
  grid: { interval: "4h", canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0081, oricand: -0.0094, miscare: -0.0113 },   // fără `grid`, pazaStare nu pornește (proba ar trece din motivul greșit)
  perp: { la: LA, monede: 138, prag: 200000, sursa: "Pionex PERP 4h", bareMediane: 1910 } }, o || {});
const bot = { id: "9", baza: "MET.PERP", simbolPionex: "MET_USDT_PERP", directie: "LONG", levier: 3, pornitLa: ACUM - H24 };

await test("rândul Busolei invers față de bot: textul rămâne, dar NU mai e galben (informație)", () => {
  const r = B.randDirectie(rez(), "MET_USDT_PERP", ACUM, { bot: "LONG", grafic: "urca" });
  assert.equal(r.nivel, "info"); assert.match(r.text, /invers față de botul tău \(long\)/); assert.equal(r.semn, "inclinat-short");
});
await test("alerta „Busola invers față de bot” nu mai pleacă, nici după 2 rezumate la rând", () => {
  const a = P.pazaDirectie({ Busola: B, rez: rez(), bot, inainte: undefined, acum: ACUM });
  const b = P.pazaDirectie({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: a.stare, acum: ACUM + H4 + 1 });
  const c = P.pazaDirectie({ Busola: B, rez: rez({ la: LA + 2 * H4 }), bot, inainte: b.stare, acum: ACUM + 2 * H4 + 2 });
  assert.equal(a.mesaj, null); assert.equal(b.mesaj, null); assert.equal(c.mesaj, null);
});
await test("vocile: Busola se VEDE, dar nu se numără — graficul și Monte Carlo decid „spun la fel”", () => {
  const c = B.concluzie({ bot: "LONG", grafic: "coboara", busola: "inclinat-short", mc: "rau" });
  assert.match(c.text, /^Graficul pe 4h și Monte Carlo spun la fel: contra botului tău \(long\)/); assert.match(c.text, /Busola înclină short \(nedovedit\)/); assert.equal(c.nivel, "atentie");
  const doarB = B.concluzie({ bot: "LONG", grafic: null, busola: "inclinat-short", mc: null });
  assert.equal(doarB.nivel, "info"); assert.ok(!/contra botului/.test(doarB.text), "Busola singură nu mai face „contra botului”");
  const cuB = B.concluzie({ bot: "LONG", grafic: "urca", busola: "inclinat-short", mc: "bine" });
  assert.match(cuB.text, /^Graficul pe 4h și Monte Carlo spun la fel: cu botul tău/, "Busola invers nu mai face „se contrazic”");
});
await test("paza vocilor: mesajul spune doar vocile numărate (2 din 2: graficul și Monte Carlo); Busola nu mai intră la număr", () => {
  const v1 = P.pazaVoci({ Busola: B, rez: rez(), bot, inainte: undefined, acum: ACUM, grafic: "coboara", mc: "rau" });
  const v2 = P.pazaVoci({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: v1.stare, acum: ACUM + H4, grafic: "coboara", mc: "rau" });
  assert.ok(v2.mesaj); assert.match(v2.mesaj.titlu, /· 2 din 2 voci contra: graficul pe 4h și Monte Carlo$/);
  const fB = P.pazaVoci({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: v1.stare, acum: ACUM + H4, grafic: "coboara", mc: null });
  assert.equal(fB.stare.contra, false, "graficul + Busola NU mai e „vocile contra”");
});
await test("episodul „vocile contra” e anunțat O DATĂ cât ține (contra sau se contrazic) — cu Busola pe „așteaptă” nu se mai repetă la 4 h", () => {
  const r0 = rez({ monede: { MET: { perp4h: "nu-stiu", directie4h: "asteapta", corBtc: 0.7 } } });
  let st, n = 0;
  for (let k = 0; k < 8; k++) { const v = P.pazaVoci({ Busola: B, rez: Object.assign({}, r0, { la: LA + k * H4 }), bot, inainte: st, acum: ACUM + k * H4 + 1, grafic: "coboara", mc: k === 3 ? "bine" : "rau" }); if (v.mesaj) n++; st = v.stare; }
  assert.equal(n, 1, `mesaje în 32 h de contra (cu o tură „se contrazic”): ${n}`);
  const gata = P.pazaVoci({ Busola: B, rez: Object.assign({}, r0, { la: LA + 9 * H4 }), bot, inainte: st, acum: ACUM + 9 * H4 + 1, grafic: "urca", mc: "bine" });
  assert.equal(gata.stare.anuntatContra, false, "vocile cu botul ⇒ episodul se închide");
});
await test("versiunile: v100.205, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 205);   /* v100.206: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.204\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100204 && npm run test:v100205/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
