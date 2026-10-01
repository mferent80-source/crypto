// Proba v100.47 (01.10, el: „ok” pe planul 2b: docs/superpowers/plans/2026-10-01-pachetul-2b-indicatori-asemanatoare-fisa.md).
// Starea rafinata (regim + directie, 6 stari, cadere in trepte), indicatorii cu dovada (I-471, Bonferroni), situatiile asemanatoare
// pe botii lui (I-469), probabilitatile pe gridul propus din fisa Grid.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const PB = new Function("GridCalcul", `${lib("probabilitati.js")}; return Probabilitati;`)(G);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.47 · Starea rafinata, indicatorii cu dovada, situatiile asemanatoare, fisa Grid (pachetul 2b) · proba\n");

const ORA = 3600000, T0 = Date.UTC(2026, 0, 1);
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mers(ore, sigma, seed) {
  const r = rng(seed), v = []; let c = 100;
  for (let i = 0; i < ore; i++) { const o = c; c = o * Math.exp(sigma * (r() + r() + r() - 1.5) * 2); v.push({ t: T0 + i * ORA, o, h: Math.max(o, c) * (1 + 0.002 * r()), l: Math.min(o, c) * (1 - 0.002 * r()), c }); }
  return v;
}

await test("stare: 6 stari - regimul fisei si directia pe 24 h fata de obisnuit (r24h >= 0,5)", () => {
  assert.ok(typeof PB.stareDinRegim === "function", "lipseste Probabilitati.stareDinRegim");
  assert.equal(PB.stareDinRegim({ miscare: false, r24h: 0.2, s24h: 0.01 }), "liniste-lateral");
  assert.equal(PB.stareDinRegim({ miscare: false, r24h: 0.8, s24h: -0.02 }), "liniste-jos");
  assert.equal(PB.stareDinRegim({ miscare: true, r24h: 2, s24h: 0.05 }), "miscare-sus");
  assert.equal(PB.stareDinRegim({ miscare: true, r24h: 0.3, s24h: 0.001 }), "miscare-lateral");
  const b = mers(120 * 24, 0.006, 11), s = PB.stareLa(b, b.length - 1);
  assert.ok(/^(liniste|miscare)-(sus|jos|lateral)$/.test(s), s); assert.ok(PB.ETICHETE[s]);
});
await test("frecventa cade in trepte: starea exacta (>= 5 independente) -> acelasi regim -> toate", () => {
  const b = mers(160 * 24, 0.006, 4), s = PB.stareLa(b, b.length - 1);
  const f = PB.frecventa(b, 24, PB.atinge(-0.01), "da", s);
  assert.ok(["exact", "regim", "toate"].includes(f.nivel), String(f.nivel)); assert.ok(f.nivel !== "exact" || f.stare === s);
  assert.ok(f.nivel !== "regim" || f.stare === s.split("-")[0]);
  const rar = PB.frecventa(b, 24, PB.atinge(-0.01), "da", "miscare-lateral");
  assert.ok(rar.nivel !== "exact" || rar.nIndep >= 5);
});
await test("liniștea mai ține = orice stare de liniște (oricare directie); textul spune la ce nivel s-a conditionat", () => {
  const b = mers(160 * 24, 0.003, 8), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const r = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.97, sus: p * 1.03 });
  assert.ok(r.stare.startsWith("liniste") ? r.liniste && r.liniste.z1 : r.liniste === null);
  const t = PB.randuri(r, null)[0].text; assert.match(t, /situații ca acum|același regim|porniri la 4 h/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
