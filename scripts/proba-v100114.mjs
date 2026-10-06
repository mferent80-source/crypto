// Proba v100.114 / colector v101.77 (06.10, el: „fă ce ai zis mai sus, dar ZAMA am pornit după ce a propus fișa, nu altfel”):
// (Z) ZAMA: banda = ÎNGUST din fișa de la 12:48 (0.08029–0.08494 vs botul 0.08043–0.08509), dar levierul 3× față de 5× în oferta salvată
//     ⇒ Radarul zicea „nu seamănă nici cu ÎNGUST, nici cu LARG”. Fereastra se recunoaște după BANDĂ (și direcție); levierul diferit se spune.
// (P) T212.perechi: vânzarea și cumpărarea la aceeași oră - întâi cumpărarea (PLTR 05.11.2025), ca RiscLuna.episoade
// (G) garda textelor acoperă și riscul (RiscLuna: probabilitățile, luna proastă, obiceiurile, concluziile)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "t212.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GridPlan: GP, T212 } = globalThis;
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.114 · ZAMA pornit după fișă + T212 la aceeași oră + garda riscului · proba\n");

// datele reale de azi: oferta fișei de la 12:48 (KV ferestre) și botul ZAMA 2407
const OFERTA = { simbol: "ZAMA_USDT_PERP", t: Date.parse("2026-10-06T09:48:03.089Z"), dir: "long", verdict: "porneste", rec: "larg", ultim: Date.parse("2026-10-06T10:19:53.403Z"),
  ta: { jos: 0.0802941973152673, sus: 0.08494410843445142, levier: 5, stop: 60, n: 109, oreTipic: 4.25 }, mea: { jos: 0.07381196738554231, sus: 0.09747976700755151, levier: 1, stop: 32, n: 109, oreTipic: 32.25 } };
const ZAMA = { id: "2407", baza: "ZAMA.PERP", directie: "long", levier: 3, gridJos: 0.08043, gridSus: 0.08509, investit: 44.94, pornitLa: Date.parse("2026-10-06T09:54:30.124Z") };
await test("(Z1) ZAMA: banda ÎNGUST cu alt levier e tot ÎNGUST (levierul nu definește fereastra), cu levierul fișei și al botului", () => {
  const fb = GP.fereastraBotului(ZAMA, [OFERTA]);
  assert.equal(fb.k, "ingust"); assert.equal(fb.levierFisa, 5); assert.equal(fb.levierBot, 3); assert.equal(fb.stop, 60); assert.equal(fb.n, 109);
  assert.equal(GP.recunoaste({ dir: "long", jos: 0.08043, sus: 0.08509, levier: 3 }, { ta: Object.assign({ dir: "long" }, OFERTA.ta), mea: Object.assign({ dir: "long" }, OFERTA.mea) }), "ingust");
  assert.equal(GP.recunoaste({ dir: "short", jos: 0.08043, sus: 0.08509, levier: 3 }, { ta: Object.assign({ dir: "long" }, OFERTA.ta) }), null, "altă direcție rămâne altceva");
  assert.equal(GP.recunoaste({ dir: "long", jos: 0.076, sus: 0.088, levier: 3 }, { ta: OFERTA.ta, mea: OFERTA.mea }), null, "altă bandă rămâne altceva");
});
await test("(Z2) Tabloul și Discord spun că ai pornit ÎNGUST din fișă, cu levierul tău față de al fișei", () => {
  const fb = GP.fereastraBotului(ZAMA, [OFERTA]);
  assert.equal(GP.textPornit(fb, "12:48"), "Ai pornit ÎNGUST din fișa de la 12:48 (levierul 3×, fișa avea 5×), deși fișa recomanda LARG; în probă stopul a venit în 60 din 109 porniri (55%), ieșirea tipică după 4 h.");
  assert.equal(GP.textPornit(Object.assign({}, fb, { levierBot: 5 }), "12:48").indexOf("levierul"), -1, "același levier: nimic în plus");
  const m = MC.pornitCa("ZAMA", fb);
  assert.equal(m.titlu, "ZAMA: pornit ca ÎNGUST din fișă"); assert.match(m.mesaj, /^Seamănă cu ÎNGUST din fișa de la \d\d:\d\d \(levierul 3×, fișa avea 5×\); în probă stopul a venit de 60 de ori din 109 porniri\./);
});
await test("(P) T212.perechi: vânzare și cumpărare la aceeași oră - întâi cumpărarea; nimic nu mai rămâne „fără cumpărare”", () => {
  const U = (id, t, side, qty, pret) => ({ id: String(id), t, side, ticker: "PLTR_US_EQ", simbol: "PLTR", nume: "Palantir", qty, pret, net: qty * pret, fee: 0, moneda: "RON", fx: 1, ext: false, realizat: null });
  // ca la PLTR: în listă vânzarea apare înaintea cumpărării de la aceeași secundă, fără loturi înainte
  const t0 = Date.UTC(2025, 10, 5, 9, 31, 6), u = [U(3, t0, "SELL", 1, 110), U(2, t0, "BUY", 1.4, 105), U(4, t0 + 864e5, "SELL", 0.4, 106)];
  const p = T212.perechi(u);
  assert.equal(p.faraCumparare.length, 0); assert.equal(p.deschise.length, 0); assert.equal(p.inchise.length, 2);
});
await test("(G) garda textelor are grupul „risc” (strict): probabilitățile, luna proastă, toți boții, corelația, obiceiurile, concluziile, pornirea", () => {
  assert.match(citeste("scripts", "garda-texte.mjs"), /import \{ situatiiRisc \} from "\.\/lib\/garda-risc\.mjs";/); assert.match(citeste("scripts", "garda-texte.mjs"), /STRICT = new Set\(\[[^\]]*"risc"[^\]]*\]\);/);   // v100.117: lista continuă („carnet”)
  const g = citeste("scripts", "lib", "garda-risc.mjs"); for (const f of ["textBot", "textActiune", "textMediere", "textLuna", "textTotiBotii", "textCorelatie", "textObicei", "concluzii", "textPornit"]) assert.match(g, new RegExp("\\." + f + "\\("), f);
});
await test("(E) versiunea v100.114 / colector v101.77", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1\d\d"/); assert.match(html, /id="antetVersiune">v100\.1\d\d/); assert.match(html, /id="healthAppVersion">v100\.1\d\d</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1\d\d\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1\d\d";/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(7[7-9]|[89]\d)";/);
  const sc = JSON.parse(citeste("package.json")).scripts; assert.equal(sc["test:v100114"], "node scripts/proba-v100114.mjs"); assert.match(sc.test, /npm run test:v100114/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
