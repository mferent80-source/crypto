// Proba v100.242 (22.10, el: „fa idei”): cele patru din lista de după v100.241.
// Ceasul rămâne pe un rând. La prețul viu se schimbă cifrele, nu tot HTML-ul
// (și pe telefon, unde citirea stă desfășurată). Drumul nu își schimbă rândurile
// când lățimea se mișcă cât o bară de derulare.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.242 · LIN · proba\n");

await test("ceasul citirii stă pe un rând; ultima linie din CSS rămâne topLive", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#tabloubot \.tbCitCap\{[^}]*flex-wrap:nowrap/);
  assert.match(css, /#tabloubot \.tbCitLive\{[^}]*white-space:nowrap/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("drumul ține lățimea când bara de derulare ia 15 px; lățimea necunoscută nu cade pe 280", () => {
  const paz = citeste("public", "lib", "asezare-paznic.js");
  const i = paz.indexOf("function latimeDrum(");
  assert.ok(i >= 0, "latimeDrum");
  const src = paz.slice(i, paz.indexOf("function drumHtml("));
  const latimeDrum = vm.runInNewContext(src + "\nlatimeDrum");
  assert.equal(latimeDrum(900, 912), 912);
  assert.equal(latimeDrum(885, 912), 912, "bara de derulare");
  assert.notEqual(latimeDrum(800, 912), 912, "o îngustare reală se ia");
  assert.equal(latimeDrum(0, 0), 1100);
  assert.equal(latimeDrum(-28, 0), 1100);
  const drum = paz.slice(paz.indexOf("function drum("), paz.indexOf("function acum("));
  assert.match(drum, /latimeDrum\(el\.clientWidth/);
  assert.doesNotMatch(drum, /clientWidth - 28/);
});

await test("scheletul citirii ignoră cifrele și fraza scurtă; un rând nou nu e același schelet", () => {
  const app = citeste("public", "app.js");
  const i = app.indexOf("function tbCitireSchelet(");
  assert.ok(i >= 0, "tbCitireSchelet");
  const src = app.slice(i, app.indexOf("function tbCitirePeLoc("));
  const tbCitireSchelet = vm.runInNewContext(src + "\ntbCitireSchelet");
  const a = '<p class="tbCitScurt">RSI 45</p><div class="tbCitR info"><span class="tbCitIc">·</span><div><b>Unde e prețul:</b> <span class="tbCitTx">în mijloc · RSI 45</span></div></div>';
  const b = '<p class="tbCitScurt">RSI 46</p><div class="tbCitR info"><span class="tbCitIc">·</span><div><b>Unde e prețul:</b> <span class="tbCitTx">în mijloc · RSI 46</span></div></div>';
  const c = a + '<div class="tbCitR info"><span class="tbCitIc">·</span><div><b>Volumul:</b> <span class="tbCitTx">1,0×</span></div></div>';
  assert.equal(tbCitireSchelet(a), tbCitireSchelet(b));
  assert.notEqual(tbCitireSchelet(a), tbCitireSchelet(c));
});

await test("la același schelet scrierea schimbă cifrele pe loc, înainte de innerHTML, și pe copia de telefon", () => {
  const app = citeste("public", "app.js");
  const c = app.slice(app.indexOf("function tbDeseneazaCitire("), app.indexOf("function tbVociBilant("));
  const scrie = c.slice(c.indexOf("var scrie=function"));
  const pe = scrie.indexOf("tbCitirePeLoc");
  const html = scrie.indexOf("el.innerHTML=");
  assert.ok(pe > 0 && pe < html, "cifrele pe loc înainte de rescriere");
  assert.match(scrie, /loc\.forEach\(function\(el\)\{if\(!tbCitirePeLoc\(el,h\)\)/);
  const pliu = app.slice(app.indexOf("function tbCitirePeLoc("), app.indexOf("function tbDeseneazaCitire("));
  assert.match(pliu, /pzFold/);
  assert.match(pliu, /textContent/);
});

await test("versiunea de la v100.242 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 242, P.version);   /* v100.243: insigna live nu mai e LIN */
  assert.equal(P.scripts["test:v100242"], "node scripts/proba-v100242.mjs");
  assert.equal((P.scripts.test.match(/test:v100242/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100241/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100242"], /npm run test:v100242/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
  assert.match(citeste("public", "app.css").trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
