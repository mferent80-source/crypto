// Proba v100.230 (20.10, el: „fa idei”): suma tace la orice abatere, regimul nedovedit stă în propoziția de cumpărare, telefonul ține piața de azi.
// Procentul de 1 % rămâne. Colectorul rămâne v101.132. 429 obișnuit nu marchează brokerul căzut.
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
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
vm.runInContext(citeste("public", "lib", "actiuni-semnale.js"), ctx);
const MC = ctx.Macro, AS = ctx.ActiuniSemnale;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.230 · AZI · proba\n");

const t212 = citeste("public", "lib", "t212-ecran.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const act = citeste("public", "lib", "actiuni-semnale.js");
const col = citeste("scripts", "colector.mjs");
const idx = citeste("public", "index.html");

const i0 = ae.indexOf("function acZiAzi");
const i1 = ae.indexOf("function acasaVerd");
const c2 = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl };
c2.window = c2;
vm.createContext(c2);
vm.runInContext(ae.slice(i0, i1), c2);

function rand(h, stare) { return { sursa: "macro", h, test: { stare, dif: 0.01 } }; }
function reg(h, ramane) { return { ramane, sursa: "Regimul macro · " + TextRo.cate(h, "zi", "zile") + " de bursă" }; }   // v100.258: ca verdicte.js („20 de zile”)

await test("orice abatere de cantitate tace suma, pe orice simbol", () => {
  assert.match(t212, /if \(Array\.isArray\(r\.reconciliere\.t212\.abateri\) && r\.reconciliere\.t212\.abateri\.length\) return "reconciliere";/);   // v100.258: forma din v100.254 (t212FaraSuma)
  assert.doesNotMatch(t212, /t212AbatereSimbol|t212SimbolEg/);
  const rec = "N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont.";
  assert.equal(AS.facPoarta("cumpara", { suma: 1837 }, { faraSuma: "reconciliere" }), rec);
  assert.equal(t212.slice(t212.indexOf("function t212TextFaraSuma"), t212.indexOf("async function t212ContSiCalibrare")).includes(rec), true);
  assert.doesNotMatch(rec, /pe simbolul/);
  assert.match(act, /return \{ cod: "normal", riscPct: 0\.01, motiv: null \}/);
});

await test("regimul măsurat și nedovedit intră doar în propoziția de cumpărare", () => {
  assert.equal(MC.regimNedovedit(null), false);
  assert.equal(MC.regimNedovedit({ calibrare: [rand(5, "putine"), rand(20, "putine")], registru: [] }), false);
  assert.equal(MC.regimNedovedit({ calibrare: [rand(5, "testat"), rand(20, "testat")], registru: [reg(5, true), reg(20, true)] }), false);
  assert.equal(MC.regimNedovedit({ calibrare: [rand(5, "testat")], registru: [reg(5, true)] }), false);
  assert.equal(MC.regimNedovedit({ calibrare: [rand(5, "testat"), rand(20, "testat")], registru: [reg(5, true)] }), true);
  const cu = AS.facPoarta("cumpara", { suma: 1837 }, { regimNedovedit: true });
  const fara = AS.facPoarta("cumpara", { suma: 1837 }, {});
  const bani = AS.facPoarta("cumpara", { suma: 1837, pesteLiber: true, liber: 0 }, { regimNedovedit: true });
  const trend = AS.facPoarta("cumpara", null, { faraMarime: "trend12", regimNedovedit: true });
  const rec = AS.facPoarta("cumpara", { suma: 1837 }, { faraSuma: "reconciliere", regimNedovedit: true });
  assert.match(cu, /, iar regimul nu e dovedit\.$/);
  assert.doesNotMatch(fara, /regimul nu e dovedit/);
  assert.equal(AS.facPoarta("nu", null, { regimNedovedit: true }), AS.facPoarta("nu", null));
  assert.equal(AS.facPoarta("asteapta", null, { regimNedovedit: true }), AS.facPoarta("asteapta", null));
  for (const s of [cu, fara, bani, trend, rec]) assert.ok(s.length <= 110, s.length + " " + s);
  assert.match(t212, /function t212RegimNedovedit\(\)/);
  assert.match(t212, /regimNedovedit: t212RegimNedovedit\(\)/);
  assert.doesNotMatch(t212.slice(t212.indexOf("function t212TextFaraSuma"), t212.indexOf("async function t212ContSiCalibrare")), /regimul nu e dovedit/);
});

await test("telefonul ține piața doar în ziua de azi, ora României", () => {
  assert.equal(c2.acPiataDin("bursa", "2026-10-20", "2026-10-20"), "bursa");
  assert.equal(c2.acPiataDin("bursa", "2026-10-19", "2026-10-20"), "crypto");
  assert.equal(c2.acPiataDin("crypto", "2026-10-20", "2026-10-20"), "crypto");
  assert.equal(c2.acPiataDin("bursa", "", "2026-10-20"), "crypto");
  assert.equal(c2.acPiataDin("altceva", "2026-10-20", "2026-10-20"), "crypto");
  assert.equal(c2.acPiataDin("bursa", "2026-10-20", ""), "crypto");
  assert.match(c2.acZiAzi(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(ae, /Europe\/Bucharest/);
  assert.match(ae, /localStorage\.setItem\("acPiataZi", acZiAzi\(\)\)/);
  assert.match(ae, /acPiataDin\(localStorage\.getItem\("acPiata"\), localStorage\.getItem\("acPiataZi"\), acZiAzi\(\)\)/);
  assert.match(ae, /getElementById\("acasa"\)\) acPiataInit\(\)/);
});

await test("versiunea de la v100.230 în sus și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 230);
  assert.equal(P.scripts["test:v100230"], "node scripts/proba-v100230.mjs");
  assert.equal((P.scripts.test.match(/test:v100230/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100229/g) || []).length, 1);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp("VERSIUNE = \"v100\\." + minor + "\""));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
  assert.match(col, /if \(S\.eLimitaDeRitm\(e\)\) return;/);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.(13[2-9]|1[4-9]\d)"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
