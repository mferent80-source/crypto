// Proba v100.368 (19.11.2026, el: „gata?” ⇒ „pune și bucata aia și gata”): în Tablou, rândul alertelor spune ce știe registrul pe viu
// (cazuri noi cu recomandare, judecate față de piață), nu „prețul a scăzut în X din N după 24 h” (fără sensul botului, fără martor).
//  T - TabloExtra.textRegistruAlerte: fără registru / cu registru fără verdict / cu verdicte; cifrele cu „de” de la 20
//  A - Tabloul aduce registrul și nu mai arată bilanțul vechi
//  V - versiunile
//   node scripts/proba-v100368.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const TE = new Function(`${citeste("public", "lib", "text-ro.js")}; ${citeste("public", "lib", "grid-calcul.js")}; ${citeste("public", "lib", "tablou-extra.js")}; return TabloExtra;`)();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); }); }
console.log("V100.368 · registrul alertelor în Tablou\n");

await test("T fără registru: spune ce s-a măsurat și când pornește registrul", () => {
  const t = TE.textRegistruAlerte(null);
  assert.match(t, /^Au avut dreptate alertele\? Pe 26 de zile măsurate, niciun fel nu s-a dovedit\. /); assert.match(t, /60 de zile sau 30 de cazuri/);
  assert.equal(TE.textRegistruAlerte({ total: 0, feluri: [] }), t);
});
await test("T cu registru: cazurile, data, câte judecate; fără verdict ⇒ „încă niciun verdict”", () => {
  const t = TE.textRegistruAlerte({ total: 23, deLa: new Date(2026, 10, 19, 21).getTime(), feluri: [{ fel: "consilier-iesi", judecate: 1, verdict: "se-aduna" }, { fel: "intrare", judecate: 0, verdict: "se-aduna" }] });
  assert.match(t, /Registrul pe viu: 23 de cazuri din 19\.11, 1 judecat față de piață; încă niciun verdict/);
  assert.match(TE.textRegistruAlerte({ total: 1, deLa: Date.now(), feluri: [] }), /1 caz din/);
});
await test("T cu verdicte: cine a avut dreptate, cine a greșit", () => {
  const t = TE.textRegistruAlerte({ total: 90, deLa: Date.now(), feluri: [{ fel: "consilier-iesi", judecate: 40, verdict: "peste" }, { fel: "intrare", judecate: 35, verdict: "sub" }, { fel: "bec1z", judecate: 31, verdict: "n-am-aflat" }] });
  assert.match(t, /; au avut dreptate: consilier-iesi; au greșit: intrare\.$/); assert.doesNotMatch(t, /încă niciun verdict/);
});
await test("A Tabloul aduce registrul (action=alerteRegistru) și nu mai arată „prețul a scăzut în X din N”", () => {
  const APP = citeste("public", "app.js");
  assert.match(APP, /getJSON\("\/api\/istoric-bot\?action=alerteRegistru"\);tbStare\.alerteRegistru=arg&&arg\.registru\|\|null\}catch\(x3\)\{tbStare\.alerteRegistru=null\}/);
  const i = APP.indexOf("function renderTabloAlerte"), f = APP.slice(i, APP.indexOf("\nfunction ", i + 10));
  assert.match(f, /TabloExtra\.textRegistruAlerte\(tbStare\.alerteRegistru\)/); assert.doesNotMatch(f, /bilantAlerte\(/); assert.match(f, /Alerte › „Au avut dreptate\?”/);
});
await test("V versiunile v100.368 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const H = citeste("public", "index.html");
  assert.equal((H.match(/v100\.368/g) || []).length, 4); assert.match(H, /v100\.368 · REGISTRUL ÎN TABLOU/); assert.doesNotMatch(H, /v100\.367/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-368/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.368"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.368.0"); assert.match(p.scripts.test, /npm run test:v100367 && npm run test:v100368/); assert.equal(p.scripts["test:v100368"], "node scripts/proba-v100368.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.badge, /^v100\.368/); assert.ok(bi.tb368 && bi.al367);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
