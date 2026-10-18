// Probele v100.212 (18.10.2026, controlul „unde n-am lucrat” pe ecranele Radarului, cerut de el: „poți face toate”, reluat după cădere).
// Bug găsit pe poza de telefon: deschiderea paginii Nasdaq trece aplicația pe acțiuni (setAssetClass("STOCKS"), ținut minte în
// localStorage), iar „Contul Pionex” și „Futures” au clasa .cryptoContextOnly, ascunsă cu display:none!important în modul acțiuni
// ⇒ după o singură vizită pe Nasdaq, cele două pagini din meniu erau GOALE (doar banda veche „AAPL · Engine bias WAIT”).
//  1. fiecare pagină legată de o clasă de active (.cryptoContextOnly / .stockOnly, citite din index.html) își știe clasa
//  2. paginile fără clasă nu schimbă nimic
//  3. navTo alege clasa ÎNAINTE de show(id), oricum ar fi deschisă pagina (meniu, reîncărcare, link)
//  4. numele noi sunt `var` / function (fără TDZ la pornire) și nu există de două ori în app.js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.212 · paginile crypto nu mai rămân goale după Nasdaq · proba\n");

const app = citeste("public", "app.js"), html = citeste("public", "index.html");
const decl = (app.match(/var PAGINI_CLASA=\{[^}]*\};/) || [])[0], fn = (app.match(/function clasaPentruPagina\(id\)\{[^}]*\}/) || [])[0];
const cx = {};
vm.createContext(cx);
if (decl && fn) vm.runInContext(decl + "\n" + fn, cx);
const legate = [...html.matchAll(/<section class="panel ([^"]*)" id="([a-z0-9-]+)"/g)]
  .map((m) => ({ id: m[2], clasa: /\bcryptoContextOnly\b/.test(m[1]) ? "CRYPTO" : /\bstockOnly\b/.test(m[1]) ? "STOCKS" : null }))
  .filter((x) => x.clasa);

await test("PAGINI_CLASA e `var` și clasaPentruPagina există o singură dată în app.js", () => {
  assert.ok(decl, "lipsește `var PAGINI_CLASA={...};` în app.js");
  assert.ok(fn, "lipsește function clasaPentruPagina(id){...} în app.js");
  assert.equal((app.match(/function clasaPentruPagina\(/g) || []).length, 1);
  assert.equal((app.match(/PAGINI_CLASA=/g) || []).length, 1);
});
await test("fiecare pagină .cryptoContextOnly / .stockOnly din index.html își știe clasa", () => {
  assert.ok(legate.length >= 3, "am găsit doar " + legate.length + " pagini legate de o clasă în index.html");
  for (const p of legate) assert.equal(cx.clasaPentruPagina(p.id), p.clasa, p.id);
  assert.equal(cx.clasaPentruPagina("account"), "CRYPTO");
  assert.equal(cx.clasaPentruPagina("deriv"), "CRYPTO");
  assert.equal(cx.clasaPentruPagina("stocks"), "STOCKS");
});
await test("paginile fără clasă (Tablou, Piața azi, Setări, laborator) nu schimbă nimic", () => {
  for (const id of ["dash", "tabloubot", "gridset", "t212", "settings", "health", "cloud", "market", "engine", "", "nu-exista"]) assert.equal(cx.clasaPentruPagina(id), null, id);
});
await test("navTo alege clasa ÎNAINTE de show(id), nu doar la încărcare", () => {
  const corp = (app.match(/function navTo\(id,load=false\)\{[\s\S]*?\n if\(load\)\{/) || [])[0];
  assert.ok(corp, "nu găsesc începutul lui navTo");
  const i = corp.indexOf("clasaPentruPagina(id)"), j = corp.indexOf("show(id)");
  assert.ok(i > 0, "navTo nu cheamă clasaPentruPagina(id) înainte de ramura load");
  assert.ok(i < j, "clasa trebuie aleasă înainte de show(id), altfel pagina apare o clipă goală");
  assert.match(corp, /assetClass\(\)!==\w+\)setAssetClass\(\w+\)/, "schimbă clasa doar când diferă");
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exitCode = 1;
