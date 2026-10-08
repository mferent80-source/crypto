// Proba v100.142 (08.10, el: „banda de sus și toată linia de sus o vreau centrată - partea din dreapta sus de tot”): grupul din dreapta al
// antetului (banda botului + Alerts + WS + LIVE DATA + versiunea) centrat în spațiul liber, nu lipit de marginea dreaptă; pe telefon banda
// botului cu textul centrat, rândul de cipuri centrat. Așezarea reală (pixeli) o măsoară proba de ecran (CDP) înainte de „gata”.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html"), APP = citeste("public", "app.js");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.142 · antetul: grupul din dreapta centrat · proba\n");

await test("(1) .topRight (banda + cipurile) e centrat în spațiul liber, nu lipit de dreapta; banda rămâne tăiată cu „…” când nu încape", () => {
  const r = CSS.match(/\n\.topRight\{([^}]*)\}/); assert.ok(r, ".topRight există");
  assert.match(r[1], /justify-content:center/); assert.doesNotMatch(r[1], /justify-content:flex-end/);
  assert.match(CSS, /\n\.botStrip\{[^}]*overflow:hidden;text-overflow:ellipsis/, "banda se taie cu „…”, nu împinge cipurile");
});
await test("(2) pe telefon (≤ 760 px) banda botului stă pe rândul ei cu textul CENTRAT, iar cipurile de sub ea rămân în .topRight (centrat)", () => {
  const m = CSS.match(/@media\(max-width:760px\)\{\.botStrip\{([^}]*)\}\.botStrip\.bsRupt\{([^}]*)\}\}/); assert.ok(m, "regula de telefon a benzii există (cu .bsRupt)");
  assert.match(m[1], /order:-1;flex-basis:100%/); assert.match(m[1], /text-align:center/); assert.doesNotMatch(m[1], /text-align:left/);
  // din POZA la 390: banda tăiată la „lichid…” stă lipită de stânga, centrarea nu se vede. Ruperea simplă (white-space:normal) strica regula v100.122
  // (părțile „piața / azi / grid” cad doar când textul dă pe afară - cu ruperea nu mai dădea ⇒ 3 rânduri). Deci: pe un rând (nowrap) cu părțile scoase,
  // iar DOAR dacă nici minimul (nume, preț, total, lichidare) nu încape, clasa bsRupt îl lasă pe două rânduri, centrat
  assert.match(m[1], /white-space:nowrap/); assert.match(m[2], /white-space:normal/);
  const f = APP.match(/function tbActualizeazaBanda\(\)[\s\S]*?\n\}\n/)[0];
  assert.match(f, /\["piata","zi","grid"\]\.forEach\(function\(k\)\{[\s\S]*?\}\);\n[^\n]*\n\s*if\(el\.scrollWidth>el\.clientWidth\+1\)el\.classList\.add\("bsRupt"\);/, "bsRupt se pune DUPĂ ce au căzut părțile, doar dacă tot nu încape");
  assert.match(f, /el\.className="statusChip botStrip "\+r\.clasa;/, "clasa se reface la fiecare actualizare ⇒ bsRupt cade când încape din nou");
});
await test("(E) versiunea de la v100.142 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[2-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[2-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[2-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[2-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[2-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[2-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[2-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
