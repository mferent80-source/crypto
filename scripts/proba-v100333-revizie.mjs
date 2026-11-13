// Proba v100.333 · revizia Opus (13.11): 0 🔴, 1 🟡, 10 🔵. Reparate aici, cu testul întâi:
//   🟡1 hover-ul graficului „Listele Radarului”: bara stătea DEASUPRA țintei de hover ⇒ pe bară nicio cifră;
//   🔵1 colectorul: acasa.js fără CalendarBursa ⇒ ziua scurtă de bursă (13:00) judecată altfel pe Discord decât pe pagină;
//   🔵3 lunea, „închiderea de ieri” e vinerea ⇒ „ultima închidere”;  🔵5 funding: „media pe 7 zile” și când rata e veche;
//   🔵6 „Pune planurile” adăuga la fiecare apăsare o teză identică în istoricul tezelor;  🔵7 „păstrează +0,0 USDT” sub 0,05;
//   🔵8 cont T212 în altă monedă: mesajul spunea „nici BNR, nici istoricul T212 n-au venit”.
//   node scripts/proba-v100333-revizie.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.333 · revizia Opus · proba\n");

await test("🟡1 graficul: bara nu prinde mouse-ul (ținta de hover de sub ea primește hover-ul și pe bară)", () => {
  assert.match(citeste("public", "app.css"), /#tabloubot \.lrBar\{fill:var\(--lrBar\);pointer-events:none\}/);
});
await test("🔵1 colectorul: CalendarBursa e global ÎNAINTE de acasa.js (ziua scurtă ca pe pagină)", () => {
  const C = citeste("scripts", "colector.mjs"), i = C.indexOf("globalThis.CalendarBursa = CalendarBursa"), j = C.indexOf('const Acasa = incarca("acasa.js"');
  assert.ok(i > 0 && i < j, "lipsește globalThis.CalendarBursa înainte de incarca(acasa.js)");
  // și chiar judecă la fel: 27.11.2026 (ziua de după Thanksgiving, bursa se închide la 13:00 NY = 18:00Z) la 19:00Z bursa e ÎNCHISĂ
  const CB = new Function(lib("calendar-bursa.js") + "; return CalendarBursa;")();
  const ctx = vm.createContext({ CalendarBursa: CB, TextRo: globalThis.TextRo, Intl, Date, Math }); vm.runInContext(lib("acasa.js"), ctx);
  const A = vm.runInContext("Acasa", ctx);
  assert.equal(typeof A.bursaNYDeschisa, "function", "acasa.js nu expune bursaNYDeschisa");
  assert.equal(A.bursaNYDeschisa(Date.UTC(2026, 10, 27, 19, 0)), false, "ziua scurtă: la 19:00Z bursa e închisă");
});
await test("🔵3 lunea, ultima zi închisă e vineri: textul spune „ultima închidere”, nu „închiderea de ieri”", () => {
  assert.doesNotMatch(lib("acasa.js"), /închiderea de ieri/); assert.match(lib("acasa.js"), /trendul e judecat pe ultima închidere/);
});
await test("🔵5 funding: cu rata veche nu se mai scrie „media pe 7 zile … plătești / încasezi”", () => {
  const ctx = vm.createContext({ TextRo: globalThis.TextRo }); vm.runInContext(fnDin(citeste("public", "app.js"), "tbFundingMediu"), ctx);
  const m = { k: "funding", text: "−0,010% la 8 h", botPlateste: false };
  const viu = vm.runInContext("tbFundingMediu", ctx)([m], { rataZi: 0.0006 }, "long")[0];
  assert.match(viu.text, /media pe 7 zile/, "premisa: cu rata vie, media apare");
  const veche = vm.runInContext("tbFundingMediu", ctx)([m], { rataZi: 0.0006, veche: true }, "long")[0];
  assert.doesNotMatch(veche.text, /media pe 7 zile/);
});
await test("🔵6 serverul: o teză identică cu ultima a aceluiași ticker nu se mai adaugă în istoricul tezelor", () => {
  const R = citeste("functions", "api", "istoric-bot.js"), i = R.indexOf('peCheie("kv:teze:t212"'), linie = R.slice(i, R.indexOf("\n", i));
  assert.match(linie, /const ult=\[\.\.\.l\]\.reverse\(\)\.find\(x=>x&&x\.tk===bot\.slice\(5\)\)/);
  assert.match(linie, /if\(ult&&ult\.teza===\(tz\|\|null\)&&ult\.invalidare===\(inv\|\|null\)&&ult\.orizont===\(plan\.orizont\|\|null\)\)return/);
});
await test("🔵7 stopul care păstrează câștigul: sumele mici nu ies „+0,0 USDT”", () => {
  const src = lib("conteaza.js"); assert.doesNotMatch(src, /usdt1\(s\.mutLaStop\)/); assert.match(src, /stopul păstrează " \+ \(nr\(s\.mutLaStop\) !== null \? usdtMic\(s\.mutLaStop\)/);
  const C = new Function("TextRo", lib("conteaza.js") + "; return Conteaza;")(globalThis.TextRo);
  assert.equal(typeof C.usdtMic, "function"); assert.equal(C.usdtMic(0.03), "+0,03 USDT"); assert.equal(C.usdtMic(2.46), "+2,5 USDT");
});
await test("🔵8 lipsa cursului spune și cazul contului care nu e în lei", () => {
  assert.match(lib("actiuni-semnale.js"), /Lipsește cursul dolar \/ moneda contului \(BNR sau istoricul T212 n-au venit, ori contul nu e în lei\): nu pot socoti câte bucăți\./);
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
