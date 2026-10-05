// Proba v100.97 (05.10, el: „în crypto unde afișezi «Pionex · 1 bot activ · −1.14 USDT» să afișezi la bot SOLDUL CONTULUI”).
// Pe contul lui (05.10): contul futures manual 0, spot ~0,006 USDT, botul TAKE investit 42,47 cu profit −0,80 ⇒
// aproape toți banii stau în bot. Soldul = conturile (spot USDT+USDC, futures) + ce valorează boții activi (investit + profit).
// Fără conturi (Pionex n-a răspuns) se scrie „în boți”, nu un „sold” fals de mic.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.search(new RegExp("^(async )?function " + nume + "\\(", "m")); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10), k = s.indexOf("\nasync function ", i + 10); const capat = [j, k].filter((x) => x > 0); return s.slice(i, capat.length ? Math.min(...capat) : undefined); };
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.97 · soldul contului Pionex pe rândul de sus");

const sold = new Function(fnDin("t212-ecran.js", "contTotSoldPionex") + "; return contTotSoldPionex;")();
const TAKE = { activ: true, investit: 42.47, profitTotal: -0.7983 };

await test("(1) contul LUI de azi: spot 0,006 + futures 0 + botul (42,47 − 0,80) ⇒ sold ~41,68, cu conturile citite", () => {
  const s = sold([TAKE], { spot: 0.00646, futures: 0 });
  assert.ok(s && s.conturiCitite === true, JSON.stringify(s));
  assert.ok(Math.abs(s.sold - (0.00646 + 0 + 42.47 - 0.7983)) < 1e-9, String(s && s.sold));
  assert.ok(Math.abs(s.inBoti - 41.6717) < 1e-9, String(s.inBoti));
});
await test("(2) doar boții ACTIVI intră; un bot fără `investit` nu strică suma (intră doar ce se știe)", () => {
  const s = sold([TAKE, { activ: false, investit: 100, profitTotal: 5 }, { activ: true, profitTotal: 3 }], { spot: 10, futures: 5 });
  assert.ok(Math.abs(s.sold - (10 + 5 + 42.47 - 0.7983)) < 1e-9, String(s.sold));
  assert.equal(s.botiFaraInvestit, 1);
});
await test("(3) conturile necitite (Pionex n-a răspuns) ⇒ conturiCitite false, suma = doar boții", () => {
  const s = sold([TAKE], null);
  assert.equal(s.conturiCitite, false); assert.ok(Math.abs(s.sold - 41.6717) < 1e-9);
  const s2 = sold([TAKE], { spot: null, futures: 0 });
  assert.equal(s2.conturiCitite, false, "un cont lipsă ⇒ nu e soldul întreg");
});
await test("(4) fără boți și fără conturi ⇒ null (nu „sold 0”)", () => {
  assert.equal(sold([], null), null); assert.equal(sold(null, null), null);
  const s = sold([], { spot: 12.5, futures: 0 }); assert.ok(s && s.sold === 12.5 && s.conturiCitite, "fără boți, cu conturi ⇒ soldul conturilor");
});

const ecran = lib("t212-ecran.js"), render = fnDin("t212-ecran.js", "contTotRender"), asigura = fnDin("t212-ecran.js", "contTotAsigura");
await test("(5) rândul de sus scrie „sold … USDT” (o zecimală) când conturile sunt citite, „în boți …” când nu", () => {
  assert.match(render, /contTotSoldPionex\(/, "contTotRender nu cheamă contTotSoldPionex");
  assert.match(render, /"sold "/); assert.match(render, /"în boți "/);
  assert.match(render, /toFixed\(1\)/, "soldul cu o singură zecimală (regula lui, 03.10)");
  assert.match(render, /t212Suma\(sp\.sold \/ fx\)/, "lei fără „+” la un sold (t212Lei pune semn, ca la profit)");
});
await test("(6) conturile se aduc (futures + balances) cel mult o dată la 5 minute", () => {
  assert.match(asigura, /action=futures/); assert.match(asigura, /action=balances/);
  assert.match(asigura, /5 \* 60000/);
  assert.match(ecran, /contTot\.conturi/);
});
await test("(E) versiunile de la v100.97 în sus (index, sw, BUILD_INFO, versiune.js, package.json, lanțul cu v10097) - versiunea merge înainte (v100.98 a lărgit-o)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.9[7-9]$/, "de la 97 în sus"); const V = bi.version;
  assert.match(citeste("public", "index.html"), new RegExp('content="' + V.replace(".", "\\.") + '" name="app-version"'));
  assert.ok(citeste("public", "sw.js").includes("crypto-radar-" + V.replace(".", "-")));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('"' + V + '"'));
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V.slice(1) + ".0"); assert.ok(/npm run test:v10096 && npm run test:v10097( && |")/.test(pk), "lanțul de teste");
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
