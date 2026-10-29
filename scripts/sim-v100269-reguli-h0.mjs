// v100.269 (ideile auditului 29.10): simularea de MĂRIME a „Regulilor tale” (ActiuniSemnale.reguliPersonale) sub H0, făcută ÎNAINTE de ecran.
// Jurnale sintetice cu structura lui (scripts/lib/jurnal-sintetic-t212.mjs): ~3 trade-uri pe ședință, orele / costurile lui, ~3 din 4 pe plus,
// FĂRĂ avantaj și fără nicio legătură între grupă și rezultat. Întrebarea: în câte jurnale apare măcar o „regulă”?
//   vechi = pragul de dinainte (≥ 30 de trade-uri, 5 puncte sub medie, total pe minus) - e exact „candidat” (reguli ∪ de urmărit)
//   nou   = trece testul pe ședințe + corecția BH pe toate grupele testate
// Plus: cât de des un test SINGUR dă p ≤ 0,05 (trebuie ~5%) și puterea pe un efect adevărat.
//   node scripts/sim-v100269-reguli-h0.mjs [rulări=400] [R=1000]
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import { jurnalH0 } from "./lib/jurnal-sintetic-t212.mjs";

const lib = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
const AS = new Function(lib("grid-calcul.js") + lib("verdicte.js") + lib("actiuni-semnale.js") + "; return ActiuniSemnale;")();
const RUL = Number(process.argv[2] || 400), R = Number(process.argv[3] || 1000), TZ = "Europe/Bucharest";
const pc = (x) => (x * 100).toFixed(1).replace(".", ",") + "%";
function ruleaza(n, o, eticheta, sem) {
  let vechi = 0, nou = 0, teste = 0, zile = 0, gasit = 0;
  for (let s = 1; s <= RUL; s++) {
    const r = AS.reguliPersonale(jurnalH0(n, sem + s, o), TZ, { R });
    if (r.reguli.length + r.deUrmarit.length) vechi++;   // „candidat” = exact pragul vechi
    if (r.reguli.length) nou++;
    if (o.cauta && r.reguli.some((x) => o.cauta.test(x.grupa))) gasit++;
    zile += r.zile; teste += r.teste;
  }
  console.log(`  ${eticheta.padEnd(46)} ${String(n).padStart(4)} trade-uri · ~${Math.round(zile / RUL)} ședințe · ${(teste / RUL).toFixed(1).replace(".", ",")} grupe testate · ` +
    `cel puțin o „regulă”: vechi ${pc(vechi / RUL)} → nou ${pc(nou / RUL)}` + (o.cauta ? ` · efectul găsit ${pc(gasit / RUL)}` : ""));
}
// mărimea unui test singur: fracția grupelor testate cu p ≤ 0,05 (pe toate, nu doar pe candidați) - reconstruită din registru prin o.R
function marimeTest(n, o, eticheta, sem) {
  let tot = 0, sub = 0;
  const VV = new Function(lib("verdicte.js") + "; return Verdicte;")();
  const orig = VV.registru;
  for (let s = 1; s <= Math.min(RUL, 200); s++) {
    let prinse = null;
    globalThis.Verdicte = { registru: (x) => { prinse = x.alte; return orig(x); } };
    const ASg = new Function(lib("grid-calcul.js") + lib("actiuni-semnale.js") + "; return ActiuniSemnale;")();
    ASg.reguliPersonale(jurnalH0(n, sem + s, o), TZ, { R });
    (prinse || []).forEach((t) => { tot++; if (t.p <= 0.05) sub++; });
  }
  delete globalThis.Verdicte;
  console.log(`  ${eticheta.padEnd(46)} ${String(n).padStart(4)} trade-uri · un test singur p ≤ 0,05 în ${pc(sub / tot)} din ${tot} (ținta ~5%)`);
}
console.log(`\nSimularea de mărime · Regulile tale · ${RUL} de jurnale pe rând, R = ${R}\n`);
console.log("H0 - nicio grupă nu schimbă rezultatul:");
for (const n of [150, 400, 965]) ruleaza(n, {}, "H0, ședința leagă trade-urile (sd 1%)", 100000);
for (const n of [150, 400, 965]) ruleaza(n, { sdZi: 0 }, "H0, trade-uri independente", 200000);
for (const n of [400]) ruleaza(n, { sdZi: 0.03 }, "H0, ședința leagă puternic (sd 3%)", 300000);
console.log("\nMărimea unui test singur:");
for (const n of [150, 400, 965]) marimeTest(n, {}, "H0, ședința leagă trade-urile (sd 1%)", 400000);
marimeTest(400, { sdZi: 0.03 }, "H0, ședința leagă puternic (sd 3%)", 500000);
console.log("\nPuterea - efect adevărat:");
for (const [ef, et] of [[-0.01, "după 18: −1 punct de randament"], [-0.02, "după 18: −2 puncte de randament"]])
  for (const n of [150, 400, 965]) ruleaza(n, { efect: (t, c) => (c.oraRo >= 18 ? ef : 0), cauta: /după 18/ }, et, 600000);
for (const n of [400, 965]) ruleaza(n, { efect: (t, c) => (c.ziSapt === 4 ? -0.02 : 0), cauta: /joi/ }, "joia: −2 puncte de randament", 700000);
console.log("");
