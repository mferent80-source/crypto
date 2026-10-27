// Proba v100.261 (27.10, el: „linia vreau sa cumpar intinde f mult pagina in jos lasand un mare gol”).
// Raportul Porții (13 blocuri, ~3000 px în coloana de 310 px) întindea grila Trading 212; sub „Pozițiile” rămânea golul.
// Cu raport pe ecran, de la 1101 px, panoul trece pe toată lățimea sub poziții, Portofoliul urcă lângă ele, blocurile stau pe coloane.
// Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.261 · LAT · proba\n");

const css = citeste("public", "app.css");
const js = citeste("public", "lib", "t212-ecran.js");

await test("clasa t212CuRaport se pune pe grilă doar când Poarta are un raport, nu o eroare", () => {
  const i = js.indexOf("function t212RenderPoarta()");
  assert.ok(i >= 0);
  const corp = js.slice(i, i + 4000);
  // ramura de eroare o scoate, raportul o pune - amândouă prin aceeași funcție, pe grila cea mai apropiată
  assert.ok(js.indexOf("function t212CuRaport(out, da)") >= 0 && js.indexOf("function t212CuRaport(out, da)") < i, "ajutătoarea stă înaintea lui t212RenderPoarta");
  assert.match(js, /function t212CuRaport\(out, da\) \{[^}]*closest\("\.t212Grila"\)[^}]*classList\.toggle\("t212CuRaport", !!da\)/);
  assert.match(corp, /if \(p\.eroare\) \{ t212CuRaport\(out, false\);/);
  assert.match(corp, /t212CuRaport\(out, true\);\n  out\.innerHTML = '<div class="t212Verdict/);
});

await test("de la 1101 px, cu raport: panoul pe toată lățimea sub poziții, Portofoliul lângă poziții, coloana din dreapta desfăcută", () => {
  const i = css.indexOf("@media (min-width:1101px){\n  #t212 .t212Grila.t212CuRaport>.t212Side{display:contents}");
  assert.ok(i >= 0, "blocul v100.261 lipsește");
  const bloc = css.slice(i, css.indexOf("\n}\n", i) + 3);
  assert.match(bloc, /#t212 \.t212Grila\.t212CuRaport>section\[aria-label="Pozițiile"\]\{grid-column:1;grid-row:1\}/);
  assert.match(bloc, /#t212 \.t212Grila\.t212CuRaport \.t212Side>section\[aria-label="Portofoliul"\]\{grid-column:2;grid-row:1\}/);
  assert.match(bloc, /#t212 \.t212Grila\.t212CuRaport \.t212Side>section\[aria-label="Vreau să cumpăr"\]\{grid-column:1 \/ -1;grid-row:2\}/);
  // câmpul simbolului nu se lățește cât ecranul; planul lui stă pe un rând de cinci
  assert.match(bloc, /#t212 \.t212CuRaport \.t212PoartaCorp>\.t212Intrari\{grid-template-columns:minmax\(0,340px\) max-content\}/);
  assert.match(bloc, /#t212 \.t212CuRaport \.t212StopulMeu \.t212Intrari\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)\}/);
});

await test("raportul stă pe trei coloane: verdictul, „Ce aș face eu”, motivele și avertizările de sus rămân pe lățime; blocurile nu se rup, profilul da", () => {
  assert.match(css, /#t212 \.t212CuRaport #t212PoartaRez\{columns:3;column-gap:16px\}/);
  assert.match(css, /#t212 \.t212CuRaport #t212PoartaRez>:not\(\.t212Preturi,\.t212Preturi~\*\)\{column-span:all\}/);
  assert.match(css, /#t212 \.t212CuRaport #t212PoartaRez>\*\{break-inside:avoid;margin-top:0\}/);
  assert.match(css, /#t212 \.t212CuRaport #t212PoartaRez>\.t212ProfilPoarta\{break-inside:auto\}/);
  assert.match(css, /#t212 \.t212CuRaport #t212PoartaRez>\.t212ProfilPoarta>\*\{break-inside:avoid\}/);
});

await test("sub 1101 px nimic nu se schimbă: grila rămâne o coloană, regula veche e în fișier", () => {
  assert.match(css, /@media \(max-width:1100px\)\{\.t212Grila\{grid-template-columns:1fr\}\}/);
  assert.match(css, /\.t212Grila\{display:grid;grid-template-columns:minmax\(0,1fr\) 330px;gap:12px;align-items:start\}/);
  assert.match(css, /\.t212Side\{display:flex;flex-direction:column;gap:12px;min-width:0\}/);
});

await test("versiunea v100.261 · LAT e în toate locurile", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(bi.version, "v100.261"); assert.equal(bi.badge, "v100.261 · LAT");
  assert.ok(bi.features && typeof bi.features.lat261 === "string" && /gol/.test(bi.features.lat261));
  assert.equal(JSON.parse(citeste("package.json")).version, "100.261.0");
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.261"/);
  assert.match(citeste("public", "sw.js"), /^const CACHE="crypto-radar-v100-261";/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.261/g) || []).length, 4, "index.html are 4 locuri cu versiunea");
  assert.ok(!idx.includes("v100.260"));
  assert.match(idx, /v100\.261 · LAT</);
});

console.log(`\n${teste - picate}/${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
process.exit(picate ? 1 : 0);
