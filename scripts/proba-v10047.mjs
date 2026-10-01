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

const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
let DV = null; try { DV = new Function("GridCalcul", "GraficBot", "Probabilitati", `${lib("dovada.js")}; return Dovada;`)(G, GB, PB); } catch { DV = null; }
await test("ADX: trend curat -> peste 25; zgomot fara directie -> sub 25; zBonferroni(1) ~ 1,96, (8) ~ 2,73", () => {
  assert.ok(DV && typeof DV.adx === "function", "lipseste Dovada");
  const sus = Array.from({ length: 120 }, (_, i) => ({ t: T0 + i * 4 * ORA, o: 100 + i, h: 101.5 + i, l: 99.8 + i, c: 101 + i }));
  const r = rng(3), zg = Array.from({ length: 120 }, (_, i) => { const c = 100 + (r() - 0.5); return { t: T0 + i * 4 * ORA, o: 100, h: Math.max(100, c) + 0.3, l: Math.min(100, c) - 0.3, c }; });
  assert.ok(DV.adx(sus, 14)[119] > 25, "trend: " + DV.adx(sus, 14)[119]); assert.ok(DV.adx(zg, 14)[119] < 25, "zgomot: " + DV.adx(zg, 14)[119]);
  assert.ok(Math.abs(DV.zBonferroni(1) - 1.96) < 0.01); assert.ok(Math.abs(DV.zBonferroni(8) - 2.734) < 0.02);
});
await test("mers aleator: niciun indicator „cu semn” pe 5 seminte (Bonferroni nu lasa zgomotul sa para dovada)", () => {
  let semne = 0;
  for (const s of [1, 2, 3, 4, 5]) { const b = mers(180 * 24, 0.006, s), p = b[b.length - 1].c, d = DV.peBot(b, { acum: b[b.length - 1].t + ORA, pret: p, dir: "long", jos: p * 0.97, sus: p * 1.03 }); if (d) semne += d.randuri.filter((x) => x.semn).length; }
  assert.ok(semne <= 1, "semne false: " + semne);
});
// ramuri de 30 de zile (planul avea 6: EMA20 trecea sub EMA50 abia spre finalul coborarii si ramanea sub ea in urcarea urmatoare -
// codul spunea corect „mai rar”); la 30 de zile intarzierea mediilor e mica fata de ramura
await test("legatura reala: urcari si coborari de cate 30 de zile - cu EMA20 sub EMA50, marginea de jos e atinsa MAI DES decat de obicei", () => {
  const v = []; let c = 100;
  for (let i = 0; i < 5 * 720 + 240; i++) { const urca = Math.floor(i / 720) % 2 === 0, o = c; c = o * (urca ? 1.001 : 0.999); v.push({ t: T0 + i * ORA, o, h: Math.max(o, c) * 1.0002, l: Math.min(o, c) * 0.9998, c }); }   // se termina la 10 zile in coborare
  const p = v[v.length - 1].c, d = DV.peBot(v, { acum: v[v.length - 1].t + ORA, pret: p, dir: "long", jos: p * 0.98, sus: p * 1.02 });
  const r = d && d.randuri.find((x) => x.cod === "ema-jos" && x.ev === "jos");
  assert.ok(r, "EMA20 sub EMA50 e aprins acum (10 zile in coborare): " + JSON.stringify(d && d.randuri.map((x) => x.cod)));
  assert.equal(r.semn, "mai des", JSON.stringify(r)); assert.match(r.text, /mai des decât de obicei/);
});
await test("putine bare de 4 h -> null; neutru -> dovezi pe ambele margini", () => {
  assert.equal(DV.peBot(mers(20 * 24, 0.006, 1), { acum: T0 + 21 * 24 * ORA, pret: 100, dir: "long", jos: 97, sus: 103 }), null);
  const b = mers(180 * 24, 0.006, 9), p = b[b.length - 1].c, d = DV.peBot(b, { acum: b[b.length - 1].t + ORA, pret: p, dir: "neutru", jos: p * 0.97, sus: p * 1.03 });
  assert.ok(d && d.randuri.some((x) => x.ev === "jos") && d.randuri.some((x) => x.ev === "sus"), JSON.stringify(d && d.randuri.map((x) => x.ev)));
});
await test("pagina + colector: blocul indicatorilor in sectiune (cu semn la vedere, fara semn pliat), scriptul incarcat, colectorul il socoteste", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), sw = fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8");
  const tp = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-probabilitati.mjs"), "utf8"), col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(app, /rez\.indicatori/); assert.match(app, /tbProbFara/); assert.match(html, /<script src="\/lib\/dovada\.js"><\/script>/); assert.match(sw, /"\/lib\/dovada\.js"/);
  assert.match(tp, /Dovada\.peBot\(/); assert.match(col, /dovada\.js/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
