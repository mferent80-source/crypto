// Proba v100.309 (07.11.2026, el: „ok, repară și Piața azi cu titlul de știre”): proba de telefon pica pe Piața azi la garda convențiilor din
// cauza unui TITLU DE ȘTIRE citat („employment rate slips to 4.1%”): punctul zecimal e al sursei, nu un rezultat al Radarului. Reparația:
// o excepție SCRISĂ în gardă - textul citat dintr-o sursă externă, în limba ei, marcat `data-conv-citat` (ca `data-conv-nume`) - și
// titlurile de știri marcate așa pe Piața azi și pe Trading 212 (aceeași cauză). Restul textului rămâne judecat ca înainte.
//   node scripts/proba-v100309.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { abateri, TEXT_VAZUT_JS } from "./proba-ecran-telefon-conventii.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n").slice(0, 3).join(" | ")}`); }); }
console.log("\nV100.309 · titlurile de știri citate, nu judecate ca rezultate · proba\n");

await test("garda: sare peste textul marcat `data-conv-citat` (ca peste `data-conv-nume`) și excepția e scrisă în capul ei", () => {
  assert.match(TEXT_VAZUT_JS, /\[data-conv-citat\]/);
  assert.match(TEXT_VAZUT_JS, /\[data-conv-ecou\],\[data-conv-nume\]/, "excepțiile vechi rămân");
  assert.match(citeste("scripts", "proba-ecran-telefon-conventii.mjs"), /textul CITAT dintr-o sursă externă[^\n]*`data-conv-citat`/);
});
await test("garda: același text, nemarcat, e prins în continuare (punctul zecimal la un rezultat rămâne abatere)", () => {
  assert.ok(abateri("Inflația e 4.1% azi").some((a) => a.tip === "punct"));
});
await test("Piața azi: titlul fiecărei știri stă într-un `<span data-conv-citat>`; ora rămâne judecată (în afara lui)", () => {
  const src = citeste("public", "lib", "acasa-ecran.js");
  assert.match(src, /class="acStire"[^\n]*<span class="acMut">' \+ escapeHtml\(cand\) \+ '<\/span><span data-conv-citat>' \+ escapeHtml\(x\.titlu\) \+ '<\/span><\/a>'/);
});
await test("Trading 212: t212StiriHtml pune titlul în `<span data-conv-citat>` (aceeași cauză: titluri citate)", () => {
  const ctx = { escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])), console, Date, Math, Intl, Number, String, Array, Object, isFinite, JSON, RegExp };
  vm.createContext(ctx);
  const src = citeste("public", "lib", "t212-ecran.js"), i = src.indexOf("function t212StiriHtml("), j = src.indexOf("\n}\n", i) + 2;
  vm.runInContext(src.slice(i, j) + "\nthis.f = t212StiriHtml;", ctx);
  const h = ctx.f([{ titlu: "CPI rises 4.1% <b>", link: "https://exemplu.test/a", la: Date.parse("2026-11-06T22:32:00Z") }], 3);
  assert.match(h, /<span data-conv-citat>CPI rises 4\.1% &lt;b&gt;<\/span>/, "titlul citat și tot scăpat (escapeHtml)");
});
await test("versiunile: pagina v100.309 (BUILD_INFO, versiune.js, sw, index, package.json, lanțul cu v100309); colectorul neatins (v101.168)", () => {
  // v100.310: „cel puțin v100.309” (fix pe .309 pica la versiunea următoare); versiunea de acum e aceeași peste tot, de 4 ori în index
  const v = JSON.parse(citeste("BUILD_INFO.json")).version, nr = Number((v.match(/^v100\.(\d+)$/) || [])[1]);
  assert.ok(nr >= 309, "BUILD_INFO " + v);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + nr + '"'));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + nr));
  assert.equal((citeste("public", "index.html").match(new RegExp("v100\\." + nr + "(?!\\d)", "g")) || []).length, 4);
  const pk = JSON.parse(citeste("package.json")); assert.equal(pk.version, "100." + nr + ".0"); assert.match(pk.scripts.test, /npm run test:v100309/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(16[89]|1[7-9]\d|[2-9]\d\d)"/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? " — " + picate + " PICATE" : ""}\n`);
process.exit(picate ? 1 : 0);
