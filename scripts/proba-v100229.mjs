// Proba v100.229 (20.10, el: „fa tot”): semnul de pe Piața azi, suma care tace, cartea închisă, rândul de calibrare.
// Pragurile 1 % / 20 % / 55 % și cele 30 de minute rămân. Colectorul rămâne v101.132. 429 obișnuit nu marchează brokerul căzut.
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
vm.runInContext(citeste("public", "lib", "scor-sezon.js"), ctx);
const MC = ctx.Macro, AS = ctx.ActiuniSemnale;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.229 · SEMN · proba\n");

const css = citeste("public", "app.css");
const idx = citeste("public", "index.html");
const t212 = citeste("public", "lib", "t212-ecran.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const ss = citeste("public", "lib", "scor-sezon.js");
const gs = citeste("public", "lib", "grid-sim-ecran.js");
const gv = citeste("public", "lib", "grid-sim.js");
const act = citeste("public", "lib", "actiuni-semnale.js");
const col = citeste("scripts", "colector.mjs");

await test("Piața azi: doar netul e mare, propoziția e 28 px, telefonul alege o piață", () => {
  const cifre = ss.slice(ss.indexOf('var cifre = cel("Win"'), ss.indexOf('+ cel("Seria"'));
  assert.equal((cifre.match(/, true\)/g) || []).length, 1);
  assert.match(cifre, /cel\("Net"/);
  assert.match(css, /#acasa \.scVal\{font-size:15px/);
  assert.match(css, /#acasa \.scVal\.scMare\{font-size:22px/);
  assert.match(css, /#dash \.acVerd \.acFac\{[^}]*font-size:28px/);
  assert.match(css, /@media \(max-width:640px\)\{#dash \.acVerd \.acFac\{font-size:24px\}#acasa \.scVal\{font-size:14px\}#acasa \.scVal\.scMare\{font-size:18px\}\.mcVerdict b\{font-size:24px\}/);
  assert.match(idx, /class="acasa acDoarCrypto" id="acasa"/);
  assert.match(idx, /id="acBtnCrypto"[^>]*data-action-click="acPiataAlege\('crypto'\)"/);
  assert.match(idx, /id="acBtnBursa"[^>]*data-action-click="acPiataAlege\('bursa'\)"/);
  assert.match(ae, /function acPiataAlege\(care\)/);
  assert.match(ae, /function acPiataInit\(\)/);
  assert.match(ae, /acPiataInit\(\);/);
  assert.match(css, /\.acPiataBtn\{display:none\}/);
  assert.match(css, /@media \(max-width:900px\)\{#dash \.acPiataBtn\{display:inline-flex\}#acasa\.acDoarCrypto #acVremeBursa,#acasa\.acDoarCrypto #acScorT212\{display:none\}#acasa\.acDoarBursa #acVremeCrypto,#acasa\.acDoarBursa #acScor\{display:none\}/);
  assert.match(css, /@media \(max-width:900px\)\{#dash \.acCol\{display:contents\}#dash \.acDouaMb #acMacro\{order:1\}#dash \.acDouaMb #acScorZi\{order:2\}#dash \.acDouaMb #acMb\{order:3\}#dash \.acDouaMb #acRegim\{order:4\}/);
  assert.ok(css.trimEnd().endsWith("#topLive{display:none!important}"));
});

await test("poarta: propoziția stă sub verdict, cuvântul de regim e 28 px", () => {
  const rnd = t212.slice(t212.indexOf("function t212RenderPoarta"), t212.indexOf("function t212Jurnal"));
  const iVerd = rnd.indexOf('<div class="t212Verdict');
  const iFac = rnd.indexOf('<p class="t212Fac t212FacPoarta">');
  const iCal = rnd.indexOf("t212LinieCal()");
  const iMot = rnd.indexOf("t212Motive");
  assert.ok(iVerd >= 0 && iVerd < iFac && iFac < iCal && iCal < iMot);
  assert.equal((rnd.match(/class="t212Fac t212FacPoarta"/g) || []).length, 1);
  assert.match(css, /\.t212Fac\.t212FacPoarta\{font-size:20px/);
  assert.match(css, /\.mcVerdict b\{font-size:28px/);
  assert.match(css, /\.mcBara\{[^}]*height:6px/);
});

await test("suma tace la abatere și după 30 de minute fără citire bună; 429 obișnuit rămâne tăcut la colector", () => {
  const iPoz = t212.indexOf("t212.poz = (p && Array.isArray");
  const iBine = t212.indexOf("t212.cititBine = Date.now()");
  const iCatch = t212.indexOf("} catch (e) { t212.eroare = t212Eroare(e); }");
  assert.ok(iPoz < iBine && iBine < iCatch);
  assert.equal((t212.match(/t212\.cititBine = Date\.now\(\)/g) || []).length, 1);
  assert.match(t212, /var limita = 30 \* 60000, bun = t212\.cititBine/);
  assert.equal((t212.match(/30 \* 60000/g) || []).length, 1);
  assert.doesNotMatch(t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212RegimPt")), /10 \* 60000/);
  assert.match(t212, /await t212ContSiCalibrare\(\);/);
  assert.ok(t212.indexOf("await t212ContSiCalibrare();") < t212.indexOf("t212.poarta = { simbol: b.simbol"));
  assert.doesNotMatch(t212, /ciStare\.inLucru/);
  assert.ok((t212.match(/t212FaraSuma\(p\) \? null : t212MarimePoarta\(p\)/g) || []).length >= 3);
  const rec = AS.facPoarta("cumpara", { suma: 1837 }, { faraSuma: "reconciliere" });
  const nec = AS.facPoarta("cumpara", { suma: 1837 }, { faraSuma: "necitit" });
  assert.equal(rec, "N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont.");
  assert.equal(nec, "N-aș da o sumă: brokerul n-a fost citit de 30 de minute.");
  assert.ok(rec.length <= 110 && nec.length <= 110);
  assert.match(nec, /30 de minute/);
  assert.doesNotMatch(rec + nec, /!|vezi|null|NaN|-\d/);
  assert.doesNotMatch(AS.facPoarta("cumpara", { suma: 1837 }, {}), /N-aș da o sumă/);
  assert.match(act, /return \{ cod: "normal", riscPct: 0\.01, motiv: null \}/);
  assert.match(col, /if \(S\.eLimitaDeRitm\(e\)\) return;/);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.132"/);
});

await test("calibrarea macro: puține, măsurat, dovedit doar cu rămâne; cardul cu două argumente rămâne fără rând", () => {
  assert.equal(MC.linieCalibrare(null), "Regimul încă nu e măsurat.");
  assert.equal(MC.linieCalibrare({ calibrare: [{ sursa: "poarta-t212", h: 5, test: { stare: "testat", dif: 0.01 } }] }), "Regimul încă nu e măsurat.");
  const putine = MC.linieCalibrare({
    calibrare: [
      { sursa: "macro", h: 5, test: { stare: "putine", nFav: 4, nRest: 12, dif: 0.01 } },
      { sursa: "macro", h: 20, test: { stare: "testat", dif: -0.005 } }
    ],
    registru: [{ sursa: "Regimul macro · 20 zile de bursă", ramane: false }]
  });
  assert.match(putine, /la 5 zile puține \(4 \/ 12\)/);
  assert.match(putine, /la 20 zile măsurat, nu e dovedit, diferența −0,5%/);
  assert.match(putine, /nu e dovedit/);
  assert.doesNotMatch(putine, /zile dovedit/);
  assert.doesNotMatch(putine, /-\d|!|vezi/);
  const dov = MC.linieCalibrare({
    calibrare: [
      { sursa: "macro", h: 5, test: { stare: "testat", dif: 0.012 } },
      { sursa: "macro", h: 20, test: { stare: "testat", dif: 0.02 } }
    ],
    registru: [
      { sursa: "Regimul macro · 5 zile de bursă", ramane: true },
      { sursa: "Regimul macro · 20 zile de bursă", ramane: false }
    ]
  });
  assert.match(dov, /la 5 zile dovedit, diferența \+1,2%/);
  assert.match(dov, /la 20 zile măsurat, nu e dovedit/);
  assert.match(MC.linieCalibrare({ calibrare: [{ sursa: "macro", h: 5, test: { stare: "putine", nFav: 1, nRest: 2 } }], registru: [] }), /la 20 zile încă nu e măsurat/);
  const r = { scor: 3, partial: false, valide: 5, treapta: { cod: "inclinat", stare: "bine", text: "înclinat spre risc" }, semne: [] };
  assert.equal(MC.htmlCard(r), MC.htmlCard(r, undefined));
  assert.doesNotMatch(MC.htmlCard(r), /mcCal/);
  const h = MC.htmlCard(r, undefined, undefined, null);
  assert.match(h, /class="acEt mcCal"/);
  assert.match(h, /Regimul încă nu e măsurat/);
  assert.ok(h.indexOf("nu semnal de intrare") < h.indexOf('class="mcBara"><span style='));
  assert.match(ae, /pas\("verdicte"/);
  assert.match(ae, /var calReg = d\.verdicte !== undefined \? d\.verdicte : \(d\.verdicteErr \? null : undefined\)/);
});

await test("„Aș porni” spune cartea închisă pe ecran; verdictul din grid-sim rămâne neschimbat", () => {
  assert.match(gs, /function gsCarte\(v, r\)/);
  assert.match(gs, /cartea închisă încă nu e citită/);
  assert.match(gs, /cartea închisă n-are încă niciun bot/);
  assert.match(gs, /cartea închisă e la net /);
  assert.match(gs, /mcsEsc\(gsCarte\(v, r\)\)/);
  assert.doesNotMatch(gv, /cartea închisă/);
  assert.match(gv, /P >= 55 && p50 > 0/);
});

await test("versiunea de la v100.229 în sus și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 229);
  assert.equal(P.scripts["test:v100229"], "node scripts/proba-v100229.mjs");
  assert.equal((P.scripts.test.match(/test:v100229/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100228/g) || []).length, 1);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.132"/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp("VERSIUNE = \"v100\\." + minor + "\""));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
