// Proba v100.57 (01.10, el: „dacă crezi că ajută adaugă” - ideile de actiuni primesc profilul: stopul ideii fata de coborarea obisnuita
// pe 5 zile si sariturile mari la deschidere).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;
const PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); });
}
console.log("\nV100.57 · Ideile de actiuni cu profilul actiunii · proba\n");
const Z = 864e5;
const bareIdee = (n) => Array.from({ length: n }, (_, i) => { const c = 100 * 1.003 ** i * (1 + 0.04 * Math.sin(i * 2 * Math.PI / 5)); return { t: i * Z, o: c * 0.999, h: c * 1.01, l: c * 0.99, c }; });

await test("ideea primeste profilul: coborarea obisnuita pe 5 zile vs stopul ideii, sariturile; fara ProfilMoneda -> null; filtrul NU se schimba", () => {
  const b = bareIdee(250), pret = b[249].c;
  const fara = ID.judecaActiune(b, pret, { acum: 251 * Z }), cu = ID.judecaActiune(b, pret, { acum: 251 * Z, ProfilMoneda: PM, simbol: "X_US_EQ" });
  assert.ok(cu.trece); assert.equal(cu.trece, fara.trece, "avertizeaza, nu blocheaza");
  assert.equal(fara.prof, null);
  assert.ok(cu.prof && cu.prof.dist > 0 && typeof cu.prof.strans === "boolean", JSON.stringify(cu.prof));
  assert.equal(cu.prof.strans, cu.riscPct < cu.prof.dist, "strans = stopul ideii mai aproape decat coborarea obisnuita");
  const r = ID.judecaActiune(b, pret, { acum: 251 * Z, ProfilMoneda: { calculeaza() { throw new Error("bum"); } } });
  assert.ok(r.trece); assert.equal(r.prof, null, "o eroare in profil nu strica ideea");
});
await test("drumul: colectorul da ProfilMoneda ideilor, ruta il pastreaza, pagina il arata pe rand", () => {
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /turaIdeiModul\(\{[^)]*ProfilMoneda/);
  assert.equal((fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-idei.mjs"), "utf8").match(/ProfilMoneda: d\.ProfilMoneda/g) || []).length, 2);
  const r = fs.readFileSync(path.join(RAD, "functions", "api", "t212.js"), "utf8"); assert.match(r, /prof: x && x\.prof && typeof x\.prof === "object"/);
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"); assert.match(e, /coborârea obișnuită pe 5 zile/); assert.match(e, /x\.prof\.strans/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
