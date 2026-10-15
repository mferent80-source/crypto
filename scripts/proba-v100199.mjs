// Probele v100.199 (15.10.2026, el: „de ce nu citește piața la deschidere și nu o măsoară” ⇒ „repară”).
// Fără parola aplicației pe dispozitiv, serverul refuză tot (401 AUTH_REQUIRED), iar „Piața azi” scria „FĂRĂ DATE · Clasamentul
// pieței n-a venit încă. Îl face colectorul de acasă o dată pe oră” — fals: colectorul mergea, lipsea parola.
//  1. acFaraParola recunoaște refuzul de parolă pe oricare cerere de bază (aceeași regulă ca Tabloul: eroareDeParola din app.js)
//  2. o altă eroare (rețea, 500) sau datele venite NU înseamnă „fără parolă”
//  3. cardurile Crypto și Nasdaq spun „FĂRĂ PAROLĂ”, ce ai de făcut și butonul spre Setări (mergiLaParola)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.199 · piața fără parolă, spus pe față · proba\n");

const app = citeste("public", "app.js");
const regula = (app.match(/function eroareDeParola\(mesaj,status\)\{[^}]*\}/) || [])[0];
const cx = { setInterval: () => 0, console, document: { hidden: false, addEventListener: () => {} }, window: { addEventListener: () => {} } };
vm.createContext(cx);
vm.runInContext(regula + "\n" + citeste("public", "lib", "acasa-ecran.js"), cx);

await test("regula de parolă e chiar cea din app.js (aceeași cu Tabloul)", () => {
  assert.ok(regula && /AUTH_\(REQUIRED\|INVALID\|RATE_LIMITED\)/.test(regula), "eroareDeParola lipsește din app.js");
  assert.equal(typeof cx.acFaraParola, "function");
});
await test("refuzul de parolă pe oricare cerere de bază ⇒ fără parolă", () => {
  for (const k of ["clasamentErr", "piataErr", "tickersErr", "ndxErr", "sugestiiErr"]) assert.equal(cx.acFaraParola({ [k]: "AUTH_REQUIRED" }), true, k);
  assert.equal(cx.acFaraParola({ clasamentErr: "AUTH_INVALID · parola a fost respinsă de server" }), true);
});
await test("altă eroare sau date venite ⇒ NU „fără parolă” (cardurile rămân cele de până acum)", () => {
  assert.equal(cx.acFaraParola({}), false);
  assert.equal(cx.acFaraParola({ clasamentErr: "TypeError: Failed to fetch", piataErr: "HTTP 500" }), false);
  assert.equal(cx.acFaraParola({ clasamentErr: null, piataErr: null }), false);
  assert.equal(cx.acFaraParola(null), false);
});
await test("cardurile Crypto și Nasdaq: „FĂRĂ PAROLĂ”, ce ai de făcut, butonul spre Setări", () => {
  assert.equal(cx.AC_FARA_PAROLA.eticheta, "FĂRĂ PAROLĂ");
  assert.match(cx.AC_FARA_PAROLA.text, /Setări → API Security Session/);
  assert.match(cx.AC_BUTON_PAROLA, /data-action-click="mergiLaParola\(\)"/);
  assert.match(app, /mergiLaParola\(\)\{/, "mergiLaParola există în app.js");
  const f = citeste("public", "lib", "acasa-ecran.js"), des = f.slice(f.indexOf("function acasaDeseneaza"), f.indexOf("// 2a. pulsul crypto"));
  assert.match(des, /if \(faraParola\) v = AC_FARA_PAROLA;/);
  assert.match(des, /acasaVerd\(\$\("acVremeCrypto"\), "Crypto", v, faraParola \? AC_BUTON_PAROLA/);
  assert.match(des, /var vb = faraParola \? AC_FARA_PAROLA : Acasa\.vremeBursa/);
});

await test("versiunile: v100.199, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 199);   /* v100.200: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.198\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100198 && npm run test:v100199/);
});

console.log(`\nV100199 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute`);
process.exit(picate ? 1 : 0);
