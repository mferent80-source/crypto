// Probele v100.202 / colector v101.119 (15.10.2026, el: „ce idei mai ai?” ⇒ „începe cu 7 apoi fă restul” — ideile 2, 5, 6).
//  5. „Piața azi” când serverul de acasă NU răspunde (rețea, PC oprit): cardurile spun „FĂRĂ LEGĂTURĂ” (nu „n-a venit încă,
//     îl face colectorul o dată pe oră”); „actualizat” = ora ultimei citiri BUNE, nu a încercării; lipsa parolei rămâne „FĂRĂ PAROLĂ”
//  6. cipul de sus: „fără analiză” în loc de „date: —” (părea o eroare), cu explicația la trecerea mouse-ului
//  2. pentru-busola.json: prețul de acum al fiecărui bot deschis (proba în proba-v10090 (4))
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.202 · piața spune când serverul tace · proba\n");

const app = citeste("public", "app.js");
const regula = (app.match(/function eroareDeParola\(mesaj,status\)\{[^}]*\}/) || [])[0];
const cx = { setInterval: () => 0, console, document: { hidden: false, addEventListener: () => {} }, window: { addEventListener: () => {} } };
vm.createContext(cx);
vm.runInContext(regula + "\n" + citeste("public", "lib", "acasa-ecran.js"), cx);
const cad = { clasamentErr: "TypeError: Failed to fetch", piataErr: "TypeError: Failed to fetch", tickersErr: "HTTP 502" };

await test("serverul nu răspunde (cererile de bază picate, nu pe parolă) ⇒ „fără legătură”", () => {
  assert.equal(cx.acFaraServer(cad), true);
  const v = cx.acFaraServerVerd(cad);
  assert.equal(v.eticheta, "FĂRĂ LEGĂTURĂ"); assert.match(v.titlu, /nu răspunde/); assert.match(v.text, /Failed to fetch/); assert.match(v.text, /reîncerc singur/);
});
await test("lipsa parolei NU e „fără legătură” (are mesajul ei)", () => {
  assert.equal(cx.acFaraServer({ clasamentErr: "AUTH_REQUIRED", piataErr: "AUTH_REQUIRED", tickersErr: "AUTH_REQUIRED" }), false);
});
await test("o singură cerere picată sau nimic picat ⇒ nu „fără legătură”", () => {
  assert.equal(cx.acFaraServer({ clasamentErr: "HTTP 500" }), false);
  assert.equal(cx.acFaraServer({}), false); assert.equal(cx.acFaraServer(null), false);
});
await test("în desen: verdictul „fără legătură” doar fără cifre pe ecran; „actualizat” = ultima citire bună", () => {
  const f = citeste("public", "lib", "acasa-ecran.js");
  assert.match(f, /d\[k \+ "La"\] = Date\.now\(\);/, "ora citirii bune");
  assert.match(f, /else if \(faraServer && !cl\) v = acFaraServerVerd\(d\);/);
  assert.match(f, /faraServer && !ndxL && !qqq \? acFaraServerVerd\(d\)/);
  assert.match(f, /var faraServer = acFaraServer\(d\), bunLa = d\.clasamentLa \|\| 0;/);
  assert.match(f, /serverul de acasă nu răspunde acum/);
  assert.ok(!/actualizat " \+ \(acasa\.la \?/.test(f), "„actualizat” nu mai ia ora încercării");
});
await test("cipul de sus: „fără analiză”, nu „date: —”", () => {
  assert.match(app, /el\.textContent="fără analiză"/); assert.ok(!/el\.textContent="date: —"/.test(app));
  const idx = citeste("public", "index.html"); assert.match(idx, /id="topLive"[^>]*>fără analiză/); assert.ok(!/>date: —/.test(idx));
});
await test("pentru-busola: prețul botului deschis", () => {
  assert.match(citeste("scripts", "lib", "pentru-busola.mjs"), /pret: nr\(b\.pretCurent\)/);
});
await test("versiunile: v100.202, colectorul v101.119, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 202);   /* v100.203: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.201\b/.test(idx));
  assert.ok(Number((/const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(citeste("scripts", "colector.mjs")) || [])[1]) >= 119);   /* v101.120: ≥ */
  assert.match(citeste("package.json"), /npm run test:v100201 && npm run test:v100202/);
});

console.log(`\nV100202 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute`);
process.exit(picate ? 1 : 0);
