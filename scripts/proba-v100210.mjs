// Proba v100.210 (17.10.2026, colaborarea cu Busola, ideea 2): decizia de pornire în fișa de grid — șansa ca prețul să atingă
// lichidarea setării în 24 h (din tabelul Busolei) și ce zic opțiunile pe 4h.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const B = new Function(`${citeste("public", "lib", "busola.js")}; return Busola;`)();
let teste = 0, picate = 0;
function test(nume, f) { teste++; try { f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); } }
console.log("\nv100.210 · Busola în fișa de grid: lichidarea în 24 h și opțiunile · proba\n");
const ACUM = Date.UTC(2026, 9, 17, 12);
const tab = { praguri: [0.02, 0.03, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3], jos: [0.6, 0.45, 0.25, 0.15, 0.08, 0.03, 0.01, 0], sus: [0.55, 0.4, 0.2, 0.1, 0.05, 0.02, 0.005, 0], ferestre: 174 };
const REZ = { la: ACUM, monede: { SOL: { atingere24h: tab, optiuni4h: { semn: -1, inVerdict: true, sfert: "Q3", din: "BTC" } }, XRP: { optiuni4h: { semn: 0, inVerdict: true, sfert: "Q2", din: "BTC" } } } };
test("long, lichidarea la −7% ⇒ ~15% (tabelul în jos)", () => { const d = B.randDecizie(REZ, "SOL_USDT_PERP", ACUM, { pret: 100, lichJos: 93, lichSus: null }); assert.match(d.linii[0].text, /lichidarea setării în 24 h: ~15%/); assert.equal(d.linii[0].nivel, "atentie"); });
test("short, lichidarea la +12,5% ⇒ interpolat între 10% și 15% (≈ 3,5%)", () => { const d = B.randDecizie(REZ, "SOL_USDT_PERP", ACUM, { pret: 100, lichJos: null, lichSus: 112.5 }); assert.match(d.linii[0].text, /~4%|~3%/); });
test("lichidarea dincolo de 30% ⇒ „sub 1%”", () => { const d = B.randDecizie(REZ, "SOL_USDT_PERP", ACUM, { pret: 100, lichJos: 50, lichSus: null }); assert.match(d.linii[0].text, /sub 1%/); });
test("neutru: ambele părți la un loc (cel mult)", () => { const d = B.randDecizie(REZ, "SOL_USDT_PERP", ACUM, { pret: 100, lichJos: 90, lichSus: 110 }); assert.match(d.linii[0].text, /~13%/); });
test("opțiunile: „pe BTC”, PLECAT, intră în verdict când Busola tace", () => { const d = B.randDecizie(REZ, "SOL_USDT_PERP", ACUM, null); assert.equal(d.linii.length, 1); assert.match(d.linii[0].text, /Opțiunile pe BTC \(4h\).*PLECAT.*când ea tace/); });
test("opțiunile fără semn ⇒ niciun rând; monedă necunoscută ⇒ null", () => { assert.equal(B.randDecizie(REZ, "XRP_USDT_PERP", ACUM, null), null); assert.equal(B.randDecizie(REZ, "ZZZ_USDT_PERP", ACUM, {}), null); assert.equal(B.randDecizie(null, "SOL", ACUM, {}), null); });
test("fișa de grid arată rândurile (grBusolaFisaHtml cheamă randDecizie cu lichidarea setării)", () => { const a = citeste("public", "app.js"); assert.match(a, /Busola\.randDecizie\(Busola\.rezumat\(\),f\.simbol,Date\.now\(\),\{pret:f\.pret,lichJos:lq\?lq\.jos:null,lichSus:lq\?lq\.sus:null\}\)/); assert.match(a, /grBusolaDecizie/); });
test("versiunea v100.210 peste tot", () => { const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 210);   /* v100.211: ≥, nu egal */ assert.match(citeste("public", "index.html"), new RegExp("v100\\." + ver)); assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + ver)); assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp("v100\\." + ver)); });
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICATE" : "ok"}`);
process.exit(picate ? 1 : 0);
