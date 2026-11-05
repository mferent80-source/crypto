// Proba v100.303 (05.11.2026, drumul omului pe Radarul VIU după livrarea v100.302): butonul „Analizează” rămânea DEZACTIVAT după prima căutare
// (rfCauta termina cu rfDeseneaza(), care nu atingea butonul din zona căsuței; doar rfDeseneazaCauta îl repornea). Văzut în poza de pe VPS.
//   1. după o căutare reușită, una refuzată și una cu simbol stricat, butonul e iar apăsabil; cât citește, e oprit;
//   2. versiunile v100.303 peste tot.
//   node scripts/proba-v100303.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); });
}
console.log("\nV100.303 · butonul „Analizează” · proba\n");

const D = JSON.parse(citeste("scripts", "proba-date", "rf-btc-1h.json"));
const H = 3600000, dt = Math.floor(Date.now() / H) * H - D.bare[D.bare.length - 1].t;
const p = D.bare.map((b) => ({ time: b.t + dt, open: b.o, high: b.h, low: b.l, close: b.c }));

await test("1. butonul „Analizează” e oprit cât citește și iar apăsabil după: reușită, refuz, simbol stricat", async () => {
  // DOM mic: doar elementele pe care le atinge pagina (zonele + căsuța + butonul)
  const el = {}; const ia = (id) => (el[id] = el[id] || { id, innerHTML: "", value: "", disabled: false });
  ["rfPagina", "rfZonaAntet", "rfZonaFiltre", "rfZonaCautaRez", "rfZonaCorp", "rfCautaIn", "rfCautaBtn"].forEach(ia);
  let vazutOprit = false;
  const getJSON = async (u) => { vazutOprit = vazutOprit || el.rfCautaBtn.disabled === true; if (/WIF/.test(u)) return { result: false, error: "rate", retryAfter: 30 }; return { result: true, data: { klines: p } }; };
  const c = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout, getJSON, document: { getElementById: (id) => el[id] || null } };
  c.window = c; vm.createContext(c);
  for (const f of ["text-ro.js", "grid-calcul.js", "range-filter.js", "range-filter-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c);
  el.rfCautaIn.value = "pepe"; await vm.runInContext("rfCauta()", c);
  assert.ok(vazutOprit, "cât citește, butonul e oprit"); assert.equal(el.rfCautaBtn.disabled, false, "după o căutare reușită butonul e iar apăsabil");
  assert.match(el.rfZonaCautaRez.innerHTML, /aria-label="PEPE"/);
  el.rfCautaIn.value = "wif"; await vm.runInContext("rfCauta()", c);
  assert.equal(el.rfCautaBtn.disabled, false, "după un refuz"); assert.match(el.rfZonaCautaRez.innerHTML, /refuzat/);
  el.rfCautaIn.value = "<b>"; await vm.runInContext("rfCauta()", c);
  assert.equal(el.rfCautaBtn.disabled, false, "după un simbol stricat");
});

await test("2. versiunile v100.303 peste tot; proba în lanțul npm test", () => {
  const Hh = citeste("public", "index.html");
  assert.ok((Hh.match(/v100\.(30[3-9]|3[1-9]\d|[4-9]\d\d)/g) || []).length >= 3); assert.doesNotMatch(Hh, /v100\.302 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(30[3-9]|3[1-9]\d|[4-9]\d\d)"/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(30[3-9]|3[1-9]\d|[4-9]\d\d)"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.match(B.version, /^v100\.(30[3-9]|3[1-9]\d|[4-9]\d\d)$/); assert.ok(B.features.butonCauta303);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 303);
  assert.match(citeste("package.json"), /npm run test:v100302 && npm run test:v100303/);
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
