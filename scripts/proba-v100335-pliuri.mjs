// Proba v100.335 · pliurile deschise rămân deschise la redesen (găsit la „nimic pierdut” după v100.333/334, 13.11: pe Tablou, la 412 px,
// „Cum s-a verificat” din cartela 🎲 se închidea singur după ~15 s - cartela își rescrie tot conținutul la fiecare desen. Era și în v100.332).
// puneCuPliuri(el, html): ține minte pliurile deschise după titlul lor (cifrele scoase: „Fără semn · 3” = „Fără semn · 4”), rescrie, le redeschide.
//   node scripts/proba-v100335-pliuri.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.335 · pliurile deschise rămân deschise la redesen · proba\n");

// un element mic, fără browser: innerHTML își face pliurile din <details><summary>…</summary>; open se ține pe obiect, ca în DOM
function element() {
  let pl = [];
  const el = { get innerHTML() { return ""; }, set innerHTML(h) { pl = [...String(h).matchAll(/<details[^>]*>\s*<summary>([^<]*)<\/summary>/g)].map((m) => ({ open: false, sum: null, t: m[1] })); pl.forEach((d) => { d.sum = { textContent: d.t, parentNode: d }; }); },
    querySelectorAll(sel) { if (sel === "details[open]>summary") return pl.filter((d) => d.open).map((d) => d.sum); if (sel === "details>summary") return pl.map((d) => d.sum); return []; }, get pliuri() { return pl; } };
  return el;
}
const ia = () => { assert.ok(/function puneCuPliuri\(/.test(A), "lipsește puneCuPliuri în app.js"); return new Function(fnDin(A, "pliuCheie") + "\n" + fnDin(A, "puneCuPliuri") + "; return puneCuPliuri;")(); };
const H = (n) => '<div><details class="tbProbFara"><summary>Fără semn · ' + n + '</summary><p>x</p></details><details class="tbProbFara"><summary>Cum s-a verificat</summary><p>y</p></details></div>';

await test("1 · „Cum s-a verificat” deschis rămâne deschis după redesen; cel închis rămâne închis", () => {
  const pune = ia(), el = element(); pune(el, H(3)); el.pliuri[1].open = true; pune(el, H(3));
  assert.equal(el.pliuri[1].open, true, "s-a închis la redesen"); assert.equal(el.pliuri[0].open, false, "s-a deschis singur");
});
await test("2 · titlul cu cifre („Fără semn · 3” ⇒ „· 4”) e același pliu: rămâne deschis", () => {
  const pune = ia(), el = element(); pune(el, H(3)); el.pliuri[0].open = true; pune(el, H(4));
  assert.equal(el.pliuri[0].open, true); assert.equal(el.pliuri[1].open, false);
});
await test("3 · cartela 🎲 din Tablou și cea din fișa Grid scriu prin puneCuPliuri (cu gardă typeof, pentru probele care scot funcția singură)", () => {
  for (const f of ["tbDeseneazaProb", "grProbDeseneaza"]) {
    const s = fnDin(A, f); assert.match(s, /typeof puneCuPliuri==="function"\?puneCuPliuri\(el,/, f + " nu folosește puneCuPliuri");
  }
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
