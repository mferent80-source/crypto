// Proba v100.45 (01.10, el: „sfaturile să fie adaptate și personalizate pentru fiecare monedă” + specul aprobat
// docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md, pachetul 1: profilul monedei + planul potrivit monedei).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
let PM = null; try { PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)(); } catch { PM = null; }

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.45 · Profilul monedei + planul potrivit monedei (pachetul 1) · proba\n");

const ORA = 3600000, T0 = Date.UTC(2026, 3, 1);
// bare sintetice de 1 h: in fiecare zi pretul coboara de la 100 la 100*(1-a) spre mijlocul zilei si revine (a = amplitudinea zilei)
function bareZile(amp, zile, gauraLa) {
  const v = [];
  for (let z = 0; z < zile; z++) for (let h = 0; h < 24; h++) {
    const t = T0 + (z * 24 + h) * ORA; if (gauraLa !== undefined && z === gauraLa && h === 5) continue;
    const a = amp[z % amp.length], jos = 100 * (1 - a * Math.min(h, 23 - h) / 11);   // la orele 11 si 12: toata amplitudinea
    v.push({ t, o: 100, h: 100.0001, l: jos, c: 100 });
  }
  return v;
}

await test("calculeaza: 40 de zile cu amplitudini cunoscute -> cuantilele pe 24 h le regasesc; doar barele incheiate", () => {
  assert.ok(PM && typeof PM.calculeaza === "function", "lipseste ProfilMoneda.calculeaza");
  const amp = [0.01, 0.02, 0.03, 0.04];
  const p = PM.calculeaza(bareZile(amp, 40), { acum: T0 + 40 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  assert.ok(p && p.z24 && p.z24.jos.length === 21);
  assert.ok(p.z24.jos[20] <= 0.0401 && p.z24.jos[20] >= 0.039, "maximul = 4%: " + p.z24.jos[20]);
  assert.ok(p.z24.n > 100, "pornire la fiecare 6 h"); assert.equal(p.z24.nIndep, Math.floor(p.z24.n * 6 / 24));
  assert.equal(p.zile, 40);
  const viitor = PM.calculeaza(bareZile(amp, 40), { acum: T0 + 20 * 24 * ORA, simbol: "X" });
  assert.ok(viitor === null || viitor.panaLa < T0 + 20 * 24 * ORA, "barele de dupa acum nu intra");
});

await test("calculeaza: sub 30 de zile -> null (fara cifre inventate)", () => {
  assert.equal(PM.calculeaza(bareZile([0.02], 25), { acum: T0 + 25 * 24 * ORA }), null);
});

await test("calculeaza: o ora lipsa -> ferestrele care o cuprind nu se numara", () => {
  const plin = PM.calculeaza(bareZile([0.02], 40), { acum: T0 + 40 * 24 * ORA }), gaura = PM.calculeaza(bareZile([0.02], 40, 10), { acum: T0 + 40 * 24 * ORA });
  assert.ok(gaura.z24.n <= plin.z24.n - 3, "o bara lipsa scade doar 1 fereastra din numaratoare; ferestrele care o cuprind (4) trebuie sarite: " + gaura.z24.n + " vs " + plin.z24.n);
});

// ferestrele pornesc la 0/6/12/18: 3 din 4 cuprind o singura zi, cea de la 12 cuprinde doua -> pe 16 ferestre: 1%:3, 2%:4, 3%:4, 4%:5
await test("frecventa si prag: pe 1%/2%/3%/4%, o coborare de 2,5% e atinsa in ~9 din 16 ferestre; P75 = 4%", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA });
  const f = PM.frecventa(p.z24.jos, 0.025); assert.ok(f > 0.45 && f < 0.7, "f=" + f);
  assert.equal(PM.frecventa(p.z24.jos, 0.5), 0); assert.equal(PM.frecventa(p.z24.jos, 0), 1);
  const q = PM.prag(p, "z24", "jos", 0.75); assert.ok(q >= 0.039 && q <= 0.0401, "P75=" + q);
});

await test("planPeMoneda: planul atins de o zi obisnuita in peste jumatate din zile -> avertizare + prag propus cu suma, si sursa scrisa", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const r = PM.planPeMoneda({ profil: p, dir: "long", dist: 0.012, laDist: (d) => -1000 * d });
  assert.ok(r.avertizare && r.frecventa > 0.5); assert.ok(r.maiStrans);
  assert.ok(Math.abs(r.sumaPropusa + 1000 * r.distPropusa) < 1e-9);
  assert.match(r.text, /în \d+% din zile/); assert.match(r.text, /1 zi din 4/); assert.match(r.text, /profilul CRV/);
  const s = PM.planPeMoneda({ profil: p, dir: "short", dist: 0.012, laDist: (d) => -1000 * d });
  assert.ok(s.frecventa < 0.05, "short se citeste pe URCARI (aici aproape zero): " + s.frecventa);
  assert.equal(PM.planPeMoneda({ profil: null, dir: "long", dist: 0.01 }), null);
});

await test("praguriMargine / pragStop: P75 pe 12 h si pe 24 h; fara profil -> null", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const m = PM.praguriMargine(p); assert.ok(m.jos > 0 && m.sus >= 0); assert.match(m.sursa, /profilul CRV/);
  const s = PM.pragStop(p, "long"); assert.ok(Math.abs(s.dist - PM.prag(p, "z24", "jos", 0.75)) < 1e-12);
  assert.equal(PM.praguriMargine(null), null); assert.equal(PM.pragStop(p, "neutru"), null);
});

await test("server: profilul se scrie si se citeste in KV „profil:<SIMBOL>”; forma stricata -> 400; simbolul curatat", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.has(k) ? kv.get(k) : null, put: async (k, v) => { kv.set(k, v); }, list: async () => ({ keys: [] }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const r = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "crv_usdt_perp<x>", profil: p }), env });
  assert.equal(r.status, 200, await r.clone().text());
  assert.ok(kv.has("profil:CRV_USDT_PERPX"), [...kv.keys()].join(","));
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=profil&simbol=CRV_USDT_PERPX"), env })).json();
  assert.deepEqual(g.profil.z24.jos, p.z24.jos); assert.equal(g.profil.zile, p.zile);
  const rau = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "CRV_USDT_PERP", profil: { z24: { jos: [1, 2] } } }), env });
  assert.equal(rau.status, 400);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
