// Proba v100.52 (01.10, el: actiunile T212 - „adaptat… partea de sfaturi, probabilități, măsurători”; pachetul 1: profilul actiunii,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-1-profilul-actiunii.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.52 · Actiunile T212: profilul actiunii · proba\n");

// ---- pasul 1: adaptorul pentru actiuni ----
await test("profilul actiunii: 1 si 5 zile de bursa, saritura separat, evenimentele scoase din distributii", () => {
  const bare = []; let c = 100;
  for (let i = 0; i < 300; i++) { const gap = i === 150 ? 0.82 : i % 40 === 0 ? 0.97 : 1; const o = c * gap, h = o * 1.012, l = o * 0.985; c = o * (1 + 0.004 * Math.sin(i)); bare.push({ t: Date.UTC(2025, 0, 1) + i * 864e5, o, h, l, c }); }
  const p = PM.calculeaza(bare, { piata: "actiuni", simbol: "INTC_US_EQ", acum: bare[299].t + 864e5 });
  assert.ok(p, "lipseste profilul"); assert.equal(p.piata, "actiuni"); assert.equal(p.z1.jos.length, 21); assert.equal(p.z5.jos.length, 21); assert.ok(p.z5.nIndep >= 50, String(p.z5.nIndep));
  assert.ok(p.evenimente.n >= 1 && p.evenimente.max >= 0.17, JSON.stringify(p.evenimente)); assert.ok(p.z1.jos[20] < 0.1, "saritura de 18% nu intra in ziua obisnuita: " + p.z1.jos[20]);
  assert.ok(p.sar.jos[20] >= 0.02 && p.sar.n > 200, JSON.stringify(p.sar.jos.slice(-3)) + " n=" + p.sar.n);
  const s = PM.pragStopActiune(p); assert.ok(s && s.dist > 0 && s.dist < 0.1, JSON.stringify(s)); assert.match(s.sursa, /INTC.*zile de bursă/);
  assert.equal(PM.calculeaza(bare.slice(0, 100), { piata: "actiuni" }), null, "sub 120 de zile");
});
await test("crypto neschimbat: fara piata -> forma de azi (z24/z12, fara z5)", () => {
  const b = Array.from({ length: 24 * 40 }, (_, i) => ({ t: i * 36e5, o: 1, h: 1.01, l: 0.99, c: 1 }));
  const p = PM.calculeaza(b, { simbol: "CRV_USDT_PERP", acum: 24 * 41 * 36e5 }); assert.ok(p && p.z24 && p.z12 && !p.z5 && !p.piata);
});
await test("split (|saritura| > 40%) nu intra in nicio distributie", () => {
  const bare = Array.from({ length: 200 }, (_, i) => { const k = i < 100 ? 1 : 0.5; return { t: i * 864e5, o: 100 * k, h: 101 * k, l: 99 * k, c: 100 * k }; });
  const p = PM.calculeaza(bare, { piata: "actiuni", simbol: "X_US_EQ", acum: 201 * 864e5 }); assert.ok(p && p.sar.jos[20] < 0.4 && p.z5.jos[20] < 0.4, p ? JSON.stringify(p.sar.jos.slice(-2)) : "null");
});

// ---- pasul 2: ruta si profilurile noaptea ----
await test("ruta profil: primeste si intoarce forma actiunii (z1/z5/sar/evenimente); forma crypto merge ca inainte", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const q = Array.from({ length: 21 }, (_, k) => k / 200), d = { jos: q, sus: q, n: 300, nIndep: 60 };
  const prof = { v: 1, piata: "actiuni", simbol: "INTC_US_EQ", la: 1, deLa: 0, panaLa: 1, zile: 300, z1: d, z5: d, sar: { jos: q, n: 290 }, evenimente: { n: 6, zile: [1, 2], mediana: 0.05, max: 0.18 } };
  const r = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "INTC_US_EQ", profil: prof }), env }); assert.equal(r.status, 200, await r.clone().text());
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=profil&simbol=INTC_US_EQ"), env })).json();
  assert.equal(g.profil.piata, "actiuni"); assert.equal(g.profil.z5.jos.length, 21); assert.equal(g.profil.evenimente.n, 6); assert.equal(g.profil.sar.n, 290);
  const cr = { v: 1, simbol: "CRV_USDT_PERP", la: 1, zile: 180, z24: d, z12: d };
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "CRV_USDT_PERP", profil: cr }), env })).status, 200, "crypto ca inainte");
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /async function turaProfilActiuni/); assert.match(col, /piata: "actiuni"/); assert.match(col, /turaProfilActiuni\(\)/);
});

// ---- pasul 3: varianta de stop „prof” pe trade-urile lui ----
await test("varianta prof: profilul din barele de DINAINTEA cumpararii; alegeTrail - prof doar daca iese >= u15 pe cel putin 30 de trade-uri", () => {
  assert.ok(typeof AS.alegeTrail === "function", "lipseste ActiuniSemnale.alegeTrail");
  const ru = (p, u, j) => ({ judecate: j, real: 0, praguri: { prof: { total: p, dif: p }, u15: { total: u, dif: u }, plan: { total: 0, dif: 0 }, u25: { total: 0, dif: 0 } } });
  assert.equal(AS.alegeTrail(ru(120, 100, 40)).cheie, "prof");
  assert.equal(AS.alegeTrail(ru(90, 100, 40)).cheie, "u15");
  const m = AS.alegeTrail(ru(500, 100, 20)); assert.equal(m.cheie, "u15"); assert.match(m.motiv, /20 din 30/);
  const t = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(t, /cheie: "prof"/); assert.match(t, /pragStopActiune\(/); assert.match(t, /b\.t \+ 8 \* 3600000 <= t\.pornit/);
  // poza 01.10: randul „prof” in tabel ar fi fost socotit pe TOATE trade-urile (neprobat = fara stop) -> in tabel nu intra; sub el, comparatia corecta
  const ecr0 = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.ok(!/k: "prof"/.test(ecr0), "prof nu e rand in tabel"); assert.match(ecr0, /ActiuniSemnale\.alegeTrail\(l, cfm\)/);
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /T212, ActiuniSemnale, ProfilMoneda, pauza/);
});
await test("varianta prof pe un trade: stopul urca la −P75(5 zile) din profilul de dinainte si iese pe bara care il atinge", () => {
  const PMa = PM, bare = []; let c = 100;
  for (let i = 0; i < 400; i++) { const o = c, h = o * 1.01, l = o * 0.99; c = o * (1 + 0.003 * Math.sin(i / 3)); bare.push({ t: Date.UTC(2025, 0, 1) + i * 864e5, o, h, l, c }); }
  const pornit = bare[380].t + 15 * 3600000, inainte = bare.filter((b) => b.t + 8 * 3600000 <= pornit), pp = PMa.calculeaza(inainte, { piata: "actiuni", simbol: "X_US_EQ", acum: pornit });
  const tr = Math.round(PMa.pragStopActiune(pp).dist * 1000) / 10; assert.ok(tr > 0 && tr < 10, String(tr));
  for (let i = 385; i < 400; i++) bare[i] = { ...bare[i], l: bare[i].o * 0.85 };   // cadere dupa cumparare
  const r = AS.cuStopUrcator({ pretCumparare: bare[381].o, pornit, inchis: bare[399].t + 864e5 }, bare, [{ cheie: "prof", trailPct: tr }]);
  assert.ok(r.prof && r.prof.pct < 0 && r.prof.trail === tr, JSON.stringify(r));
});

await test("ruta cf pastreaza varianta prof (altfel tabelul n-o vede si verdictele se refac la nesfarsit); proba goala ramane goala", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/t212?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const v = { a1: { nivel: "cumpara", motive: [], greseli: [], stop: {}, stopU: { plan: null, u15: { pct: -0.1, zi: 5, trail: 15 }, u25: null, prof: { pct: -0.05, zi: 4, trail: 6.2 } } }, a2: { nivel: "fara-date", motive: [], greseli: [], stop: {}, stopU: {} } };
  const r = await mod.onRequestPost({ request: cer("POST", "action=cf", { verdicte: v }), env }); assert.equal(r.status, 200, await r.clone().text());
  const m = JSON.parse(kv.get("t212:cf")); assert.deepEqual(m.a1.stopU.prof, { pct: -0.05, zi: 4, trail: 6.2 }); assert.deepEqual(m.a2.stopU, {});
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8"), /Object\.keys\(gata\[t\.id\]\.stopU \|\| \{\}\)\.length && !\("prof" in gata\[t\.id\]\.stopU\)/, "proba goala nu se reface la nesfarsit");
});

// ---- pasul 4: stopul pozitiei din profil, cand a castigat pe trade-urile lui ----
await test("niveluri: cu trailProfil (cand a castigat prof) stopul pozitiei urca la −P75 pe 5 zile, cu sursa; fara el, −15% ca azi", () => {
  const b = Array.from({ length: 200 }, (_, i) => ({ t: i * 864e5, o: 100 + i * 0.1, h: 101 + i * 0.1, l: 99 + i * 0.1, c: 100 + i * 0.1 }));
  const azi = AS.niveluri(b, 120, { minTrail: 0.15, maxDupaCumparare: 125 }), cu = AS.niveluri(b, 120, { minTrail: 0.15, trailProfil: 0.08, sursaTrail: "profilul INTC: 500 zile de bursă", maxDupaCumparare: 125 });
  assert.ok(Math.abs(azi.trailPct - 15) < 0.5, String(azi.trailPct)); assert.ok(cu.trailPct >= 7.9 && cu.trailPct < 15, String(cu.trailPct)); assert.match(cu.sursaTrail, /profilul INTC/);
  assert.match(azi.sursaTrail, /−15% de la maxim/);
});
await test("trailPozitie: prof castigat + profil -> trailProfil cu sursa si motivul; altfel −15% cu motivul", () => {
  assert.ok(typeof AS.trailPozitie === "function", "lipseste ActiuniSemnale.trailPozitie");
  const p = AS.trailPozitie({ cheie: "prof", motiv: "pe 40 de trade-uri ale tale, stopul din profil a ieșit +12 lei față de −15%" }, { dist: 0.062, sursa: "profilul INTC: 501 zile de bursă (bare zilnice)" });
  assert.equal(p.trailProfil, 0.062); assert.match(p.sursaTrail, /profilul INTC.*40 de trade-uri/);
  const u = AS.trailPozitie({ cheie: "u15", motiv: "se probează: 12 din 30" }, { dist: 0.062, sursa: "x" }); assert.equal(u.trailProfil, undefined); assert.equal(u.minTrail, 0.15); assert.match(u.sursaTrail, /12 din 30/);
  assert.equal(AS.trailPozitie({ cheie: "prof", motiv: "m" }, null).minTrail, 0.15, "fara profilul actiunii ramane −15%");
  const ecr = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(ecr, /ActiuniSemnale\.trailPozitie\(/); assert.match(ecr, /n\.sursaTrail/); assert.match(col, /ActiuniSemnale\.trailPozitie\(/);
});

// ---- pe viu (poza 01.10): „pe 966 de trade-uri, −15% a ieșit +1.001 lei față de profil” cand „prof” nu era rejucat pe NICIUNUL ----
await test("alegeTrail compara doar pe trade-urile unde „prof” a fost rejucat (aceleasi trade-uri pentru ambele variante)", () => {
  const inchise = Array.from({ length: 40 }, (_, i) => ({ id: "t" + i, cost: 100, rezultat: i % 2 ? 10 : -20 }));
  const fara = Object.fromEntries(inchise.map((t) => [t.id, { nivel: "cumpara", stopU: { plan: null, u15: { pct: -0.05 }, u25: null } }]));
  const a = AS.alegeTrail(inchise, fara); assert.equal(a.cheie, "u15"); assert.match(a.motiv, /0 din 30/, a.motiv);
  const cu = Object.fromEntries(inchise.map((t, i) => [t.id, { nivel: "cumpara", stopU: i < 35 ? { plan: null, u15: { pct: -0.05 }, u25: null, prof: { pct: -0.02 } } : { plan: null, u15: { pct: -0.05 }, u25: null } }]));
  const b = AS.alegeTrail(inchise, cu); assert.equal(b.cheie, "prof", b.motiv); assert.match(b.motiv, /35 de trade-uri|pe 35 /);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
