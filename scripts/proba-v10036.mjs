// Proba v100.36 (30.09, el: „verifică de ce botul trece prin liniile afișate pe GRID-FISA din TV dar pe Pionex nu apare linie închisă,
// e posibil să fie altfel calculate liniile?”). Gasit: botul CRV (0,3755–0,423, 8 grile geometric) a facut exact ce spun liniile LUI
// (o pereche: cumparare la 0,39854, vanzare la 0,40452; 0,41059 neatins). Liniile din TV erau altele: codul FISEI (propunerea: acum
// 0,3822–0,4307, 5 grile) nu e gridul botului - si nu spunea TIPUL, iar GRID-FISA v2.0 il lua atunci din setarea indicatorului
// (daca acolo e „Aritmetic”, liniile ies altfel decat le socoteste fisa, care e GEOMETRICA). Acum codul fisei spune „geometric”.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const pine = fs.existsSync("C:/Users/Cimin/pine-scripts/GRID-FISA/Grid_Fisa_v2_0.pine") ? fs.readFileSync("C:/Users/Cimin/pine-scripts/GRID-FISA/Grid_Fisa_v2_0.pine", "utf8") : null;
const gc = fs.readFileSync(new URL("../public/lib/grid-calcul.js", import.meta.url), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(i, j + 1); }
console.log("\nV100.36 · codul fisei pentru TV spune tipul gridului · proba\n");

await test("fisa isi socoteste grilele GEOMETRIC (niveluri: (sus/jos)^(1/N)) - deci tipul din cod e „geometric”", () => {
  assert.match(functia(gc, "niveluri"), /Math\.pow\(sus \/ jos, 1 \/ N\)/);
});
await test("grCodTV: 11 campuri, ultimul „geometric” (dupa suma), ca GRID-FISA v2.0 sa nu-l ia din setarea indicatorului", () => {
  const ctx = { grZec: () => 4, grFmt: (x, z) => x == null ? null : Number(x).toFixed(z) };
  vm.createContext(ctx); vm.runInContext(functia(app, "grCodTV") + ";this.f=grCodTV;", ctx);
  const c = ctx.f({ dir: "long", jos: 0.38221507, sus: 0.43067739, grile: 5, levier: 5, stop: { jos: 0.373, sus: 0.4411 }, lichidare: { jos: 0.3185 }, suma: 100 }, {});
  const p = c.split(";");
  assert.equal(p.length, 11, c); assert.equal(p[10], "geometric"); assert.equal(p[0], "long"); assert.equal(p[3], "5"); assert.equal(p[9], "100");
});
await test("GRID-FISA v2.0 (pe disc) citeste al 11-lea camp ca tip si deseneaza geometric jos·g^k", () => {
  assert.ok(pine, "Grid_Fisa_v2_0.pine lipseste din pine-scripts/GRID-FISA");
  assert.match(pine, /t == "geometric" or t == "geo"/); assert.match(pine, /jos \* math\.pow\(g, k\)/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
