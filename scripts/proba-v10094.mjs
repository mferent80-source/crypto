// Proba v100.94 / colector v101.64 (04.10, el: „fa idei” pe raportul v100.93; specul docs/superpowers/specs/2026-10-04-gradient-boosting-design.md,
// planul docs/superpowers/plans/2026-10-04-arbori-l2-stocks.md): L2 - a doua (🧠) și a treia părere (🌳) pe acțiunile T212: trăsăturile zilnice,
// rândurile din barele zilnice și din trade-urile lui, amândoi antrenorii pe țintele T212, colectorul (barele strânse noaptea, bugetul), pagina
// T212 (poziții, poartă, idei), garda, versiunile; + ideea 3 (legenda benzii).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
// modulele paginii, încărcate ca în retea/date.mjs (aceeași ordine, aceleași globale)
const B = new Function(`${lib("busola.js")}; return Busola;`)();
globalThis.GridCalcul = globalThis.GridCalcul || new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul, AS = new Function("GridCalcul", `${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(G);
const P = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS); globalThis.Probabilitati = P;
const R = new Function("Probabilitati", `${lib("retea.js")}; return Retea;`)(P); globalThis.Retea = R;
const incarcaArbori = () => new Function("Retea", "Probabilitati", `${lib("arbori.js")}; return Arbori;`)(R, P);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.94 · a doua și a treia părere pe acțiuni (T212)");

const ORA = 3600000, ZI = 864e5, ACUM = Date.UTC(2026, 9, 4, 12, 0);
// bare zilnice sintetice (t la 13:30 UTC, ca Yahoo), mers aleator cu sămânță; QQQ la fel, cu altă sămânță
const bareZi = (n, p0, sem) => { const r = (() => { let a = sem; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })(); const l = []; let c = p0; for (let i = 0; i < n; i++) { const o = c; c = c * (1 + (r() - 0.5) * 0.04); l.push({ t: Date.UTC(2025, 0, 1, 13, 30) + i * ZI, o, h: Math.max(o, c) * 1.01, l: Math.min(o, c) * 0.99, c, v: 1000 }); } return l; };

// ======== Task 1: trăsăturile zilnice, intrările pe țintă, țintele T212, codurile rândurilor 🎲 ========
await test("(1) Retea.trasaturiZilnice: 14 cifre tăiate la ±10 la ziua i, identice cu și fără barele de după i; null sub 250 de zile sau fără QQQ la zi; intrareActiune pe cele 5 ținte; TINTE/NUME/TINTA_DE cu țintele T212", () => {
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5);
  const f = R.trasaturiZilnice(b, 300, q, 0.5); assert.ok(f && f.x.length === 14 && f.x.every((v) => Number.isFinite(v) && Math.abs(v) <= 10), JSON.stringify(f));
  assert.deepEqual(R.trasaturiZilnice(b.slice(0, 301), 300, q.slice(0, 301), 0.5).x, f.x, "barele de după i schimbă trăsăturile");
  assert.equal(f.t, Math.floor(b[300].t / ZI) * ZI + ZI + 1.5 * ORA, "t = bara închisă la 01:30 UTC a zilei următoare (după after-hours)"); assert.ok(f.s1 > 0 && f.c === b[300].c && typeof f.stare === "string", JSON.stringify([f.s1, f.c, f.stare]));
  assert.equal(R.indexZi(b, b[300].t + 8 * ORA), 299, "în timpul ședinței bara zilei nu e închisă"); assert.equal(R.indexZi(b, Math.floor(b[300].t / ZI) * ZI + ZI + 1.5 * ORA), 300, "la 01:30 UTC a doua zi e închisă"); assert.equal(R.indexZi(b, Math.floor(b[300].t / ZI) * ZI + ZI + ORA), 299);
  assert.equal(R.trasaturiZilnice(b, 249, q, 0.5), null); assert.equal(R.trasaturiZilnice(b, 300, null, 0.5), null); assert.equal(R.trasaturiZilnice(b, 300, q.slice(0, 200), 0.5), null, "QQQ fără bară la zi");
  assert.equal(R.intrareActiune("stop1-t212", f, { relS: -0.05 }).length, 17); assert.equal(R.intrareActiune("sare1-t212", f, { relS: -0.05 })[16], -1);
  assert.equal(R.intrareActiune("cursa5-t212", f, { relT: 0.05, relS: -0.03 }).length, 18); assert.equal(R.intrareActiune("directie-t212", f, {}).length, 14);
  assert.equal(R.intrareActiune("rezultat-t212", f, { cost: 500, glob: 0.6, nPe: 3 }).length, 17); assert.equal(R.intrareActiune("stop1-t212", f, { relS: 0 }), null); assert.equal(R.intrareActiune("cursa5-t212", f, { relT: 0.05 }), null);
  for (const t of ["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212", "rezultat-t212"]) assert.ok(R.TINTE[t] && typeof R.NUME[t] === "string" && R.NUME[t].length <= 60, t);
  assert.deepEqual([R.TINTE["stop1-t212"].bloc, R.TINTE["cursa5-t212"].bloc, R.TINTE["directie-t212"].bloc, R.TINTE["rezultat-t212"].bloc], [24, 168, 168, 24]);
  assert.equal(R.TINTA_DE.stop1, "stop1-t212"); assert.equal(R.TINTA_DE.cursa5, "cursa5-t212"); assert.equal(R.TINTA_DE.directie5, "directie-t212"); assert.equal(R.TINTA_DE.sare1, "sare1-t212");
});
await test("(1) Probabilitati.randActiune: rândurile poartă cod (stop1, cursa5, sare1); frecventaActiune e frecventa cu configurația acțiunilor (aceeași cifră ca stop1 din pentruActiune)", () => {
  const b = bareZi(400, 100, 11), pa = P.pentruActiune(b, { pret: b[b.length - 1].c, stop: b[b.length - 1].c * 0.95, tinta: b[b.length - 1].c * 1.05, acum: b[b.length - 1].t + ZI });
  assert.ok(pa && pa.stop1 && pa.cursa5 && pa.cursa5.tinta, JSON.stringify(pa));
  const l = P.randActiune(pa, {}, {}); assert.deepEqual(l.map((x) => x.cod), ["stop1", "cursa5", "sare1"], JSON.stringify(l.map((x) => x.titlu)));
  const bb = b.filter((x) => x.t < b[b.length - 1].t + ZI), st = pa.stare, relS = -0.05, ev = (x, i) => { const niv = x[i].c * (1 + relS); return x[i + 1].o > niv && x[i + 1].l <= niv ? "da" : "nu"; };
  const q = P.frecventaActiune(bb, 1, ev, "da", st, {}); assert.ok(q && Math.abs(q.p - pa.stop1.p) < 1e-12 && q.n === pa.stop1.n, JSON.stringify([q, pa.stop1]));
});

// ======== Task 2: date-t212 - rândurile pe acțiuni ========
await test("(2) date-t212: rândurile pe stop1/sare1/cursa5/directie din bare zilnice sintetice; etichetele de mână (stopul mâine da/nu, săritura, cursa cu ținta și stopul în aceeași zi ⇒ stop); pRef = exact cifra din pentruActiune pe barele de până la t; găurile nu crapă; rezultat-t212 din trade-uri", async () => {
  const D = await import("../retea/date-t212.mjs"); const M = { G, P, R, A: incarcaArbori() };
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5);
  for (const t of ["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212"]) {
    const l = D.randuriActiune(t, "AAA_US_EQ", b, q, [], M, {}); assert.ok(l.length > 100, t + ": " + l.length);
    for (const r of l.slice(0, 20)) { assert.ok(r.y === 0 || r.y === 1); assert.ok(r.tEt > r.t && r.x.length === R.intrareActiune(t, R.trasaturiZilnice(b, r.i, q, 0.5), r.e).length, t + " x"); const p = D.reperActiune(t, b, r, M, {}); assert.ok(p === null || (p >= 0 && p <= 1), t + " reper"); }
    const r0 = l[0], pa = P.pentruActiune(b.slice(0, r0.i + 1), { pret: b[r0.i].c, stop: b[r0.i].c * (1 + (r0.e.relS ?? -0.05)), tinta: b[r0.i].c * (1 + (r0.e.relT ?? 0.05)), acum: b[r0.i].t + ZI });
    if (t === "stop1-t212") assert.equal(D.reperActiune(t, b, r0, M, {}), pa.stop1.p); if (t === "sare1-t212") assert.equal(D.reperActiune(t, b, r0, M, {}), pa.sare1.p); if (t === "cursa5-t212") assert.equal(D.reperActiune(t, b, r0, M, {}), pa.cursa5.tinta.p);
  }
  // etichetele de mână: bara i și ce urmează
  const z = bareZi(300, 100, 3); const i = 280; z[i] = { ...z[i], c: 100 }; z[i + 1] = { ...z[i + 1], o: 99, l: 94, h: 101, c: 100 };
  assert.equal(D.eticheta("stop1-t212", z, i, { relS: -0.05 }), 1, "stop atins mâine (deschide peste, minimul sub)"); assert.equal(D.eticheta("sare1-t212", z, i, { relS: -0.05 }), 0);
  z[i + 1] = { ...z[i + 1], o: 94, l: 93, h: 101, c: 100 }; assert.equal(D.eticheta("stop1-t212", z, i, { relS: -0.05 }), 0, "sare peste stop ⇒ nu „atins în zi”"); assert.equal(D.eticheta("sare1-t212", z, i, { relS: -0.05 }), 1);
  for (let k = 1; k <= 5; k++) z[i + k] = { ...z[i + k], o: 100, h: 100.5, l: 99.5, c: 100 }; z[i + 3] = { ...z[i + 3], h: 106, l: 94 }; assert.equal(D.eticheta("cursa5-t212", z, i, { relT: 0.05, relS: -0.05 }), 0, "ținta și stopul în aceeași zi ⇒ stop");
  z[i + 3] = { ...z[i + 3], h: 106, l: 99 }; assert.equal(D.eticheta("cursa5-t212", z, i, { relT: 0.05, relS: -0.05 }), 1); z[i + 5] = { ...z[i + 5], c: 101 }; assert.equal(D.eticheta("directie-t212", z, i, {}), 1);
  assert.equal(D.eticheta("cursa5-t212", z, z.length - 3, { relT: 0.05, relS: -0.05 }), null, "sub 5 bare după ⇒ fără etichetă");
  // găuri: scot 10 bare din mijloc - rândurile rămân, nimic nu aruncă
  const g = b.slice(0, 320).concat(b.slice(330)); assert.ok(D.randuriActiune("stop1-t212", "AAA_US_EQ", g, q, [], M, {}).length > 50);
  // trade-urile lui: rata pe acțiune trasă spre medie, eticheta = rezultat − 0,3% din cost > 0; cost 0 / rezultat lipsă ⇒ sar
  const tr = [{ ticker: "AAA_US_EQ", pornit: b[300].t + 3 * 3600000, inchis: b[305].t, cost: 500, rezultat: 10 }, { ticker: "AAA_US_EQ", pornit: b[320].t + 3 * 3600000, inchis: b[322].t, cost: 500, rezultat: -2 }, { ticker: "AAA_US_EQ", pornit: b[330].t, inchis: b[331].t, cost: 0, rezultat: 5 }, { ticker: "BBB_US_EQ", pornit: b[330].t, inchis: b[331].t, cost: 100, rezultat: null }];
  const rp = D.rataPe(tr, "AAA_US_EQ", b[330].t); assert.equal(rp.nPe, 2); assert.ok(Math.abs(rp.glob - 0.5) < 1e-9 && Math.abs(rp.rata - (1 + 10 * 0.5) / 12) < 1e-9, JSON.stringify(rp));
  const rt = D.randuriTradeuri(tr, (tk) => (tk === "AAA_US_EQ" ? b : null), q, M); assert.equal(rt.length, 2); assert.deepEqual(rt.map((r) => r.y), [1, 0]); assert.ok(rt[0].x.length === 17 && rt[0].tEt === b[305].t && rt[0].r1 === 0.5, JSON.stringify([rt[0].x.length, rt[0].tEt, rt[0].r1]));
});

// ======== Task 3: pentruActiune / pentruCumparare pe rețea și arbori, randuri pe codurile T212 ========
await test("(3) Retea/Arbori.pentruActiune: aceleași intrări (un singur producător), cifre pe stop1/sare1/cursa5/directie5 cu modele T212 sintetice, bit-exact cu antrenorul; ziua în curs e scoasă; fără stop ⇒ doar directie5; pentruCumparare ca pentruPornire; randuri cu codDirectie/tintaRezultat", async () => {
  const { antreneazaArbori, exportaArbori, preziceArbori } = await import("../retea/arbori.mjs"); const A = incarcaArbori();
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5), o = { acum: b[b.length - 1].t + 2 * ZI, pret: b[b.length - 1].c, stop: b[b.length - 1].c * 0.95, tinta: b[b.length - 1].c * 1.05, ticker: "AAA_US_EQ" };
  const it = R.intrariActiune(b, o, q, []); assert.ok(it, "intrariActiune null"); assert.deepEqual(it.lista.map((x) => x.cod), ["stop1", "sare1", "cursa5", "directie5"]);
  assert.deepEqual(R.intrariActiune(b.concat([{ t: b[b.length - 1].t + ZI, o: 1, h: 1, l: 1, c: 1, v: 1 }]), { ...o, acum: b[b.length - 1].t + ZI + 3600000 }, q, []).f.x, it.f.x, "bara zilei în curs a intrat în trăsături");
  assert.deepEqual(R.intrariActiune(b, { ...o, stop: null }, q, []).lista.map((x) => x.cod), ["directie5"]);
  // modele sintetice pe fiecare țintă: arborii antrenați pe rânduri aleatoare cu nIn potrivit
  const antreneaza = (nIn, N, fn) => { const X = new Float32Array(N * nIn), y = new Float32Array(N); for (let i = 0; i < N; i++) { for (let k = 0; k < nIn; k++) X[i * nIn + k] = fn(i, k); y[i] = X[i * nIn] + X[i * nIn + 1] > 0 ? 1 : 0; } const m = antreneazaArbori(X, y, nIn, { seed: 2, runde: 20 }); return exportaArbori({ baza: m.baza, pas: m.pas, semi: [m.arbori] }); };
  const mA = {}; for (const [t, nIn] of [["stop1-t212", 17], ["sare1-t212", 17], ["cursa5-t212", 18], ["directie-t212", 14]]) mA[t] = { tinta: t, versiune: "a1", la: ACUM, ...antreneaza(nIn, 400, (i, k) => Math.sin(i * (k + 1))) };
  const ra = A.pentruActiune(mA, b, o, q, []); assert.ok(ra && ra.v === "a1" && ["stop1", "sare1", "cursa5", "directie5"].every((c) => Number.isFinite(ra.p[c])), JSON.stringify(ra));
  for (const x of it.lista) assert.ok(Math.abs(preziceArbori(mA[x.tinta], x.x) - ra.p[x.cod]) <= 5e-4, x.cod + " nu e bit-exact cu antrenorul");
  assert.equal(A.pentruActiune({ "atinge-24": mA["stop1-t212"] }, b, o, q, []), null, "fără modele T212 ⇒ null");
  // „un trade ca ăsta”: intrarea la ultima zi închisă dinaintea cumpărării; modelul de după cumpărare nu se folosește
  const t = { ticker: "AAA_US_EQ", pornit: b[380].t + 5 * 3600000, cost: 500 }, ic = R.intrareCumparare(t, b, q, []); assert.ok(ic && ic.x.length === 17 && ic.rata === 0.5 && ic.n === 0, JSON.stringify(ic));
  const mR = { "rezultat-t212": { tinta: "rezultat-t212", versiune: R.VERSIUNE, la: b[300].t, norm: { m: Array(17).fill(0), s: Array(17).fill(1) }, ansamblu: [[{ W: Array.from({ length: 17 }, () => [0]), b: [0.2], act: "sigmoid" }]] } };
  const pc = R.pentruCumparare(mR, t, b, q, []); assert.ok(pc && Math.abs(pc.p - 0.55) < 1e-3 && pc.rata === 0.5, JSON.stringify(pc)); assert.equal(R.pentruCumparare({ "rezultat-t212": { ...mR["rezultat-t212"], la: t.pornit + 1 } }, t, b, q, []), null);
  const mAc = { "rezultat-t212": { tinta: "rezultat-t212", versiune: "a1", la: b[300].t, ...antreneaza(17, 300, (i, k) => Math.cos(i * (k + 1))) } };
  const pcA = A.pentruCumparare(mAc, t, b, q, []); assert.ok(pcA && Number.isFinite(pcA.p) && pcA.rata === 0.5, JSON.stringify(pcA));
  // randuri pe T212: zar = rândurile randActiune (cu cod), direcția pe codul directie5, rezultatul pe ținta rezultat-t212
  const vB = { luni: 9, luniGata: 9, nIndep: 150, reper: "🎲", brier: 0.2, brierReper: 0.21, brierLog: 0.205, ic: [0.01, 0.04], icLog: [0.003, 0.02], bss3: 0.01, logloss: 0.6, loglossReper: 0.61, loglossLog: 0.61 };
  const MOD = (ver) => Object.fromEntries(["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212", "rezultat-t212"].map((tt) => [tt, { tinta: tt, versiune: ver, la: ACUM - 3600000, verificare: vB }]));
  const rt = { la: ACUM, v: R.VERSIUNE, p: { stop1: 0.12, cursa5: 0.4, sare1: 0.03, directie5: 0.52 }, pornire: { p: 0.57, rata: 0.5 } }, rA = { la: ACUM, v: "a1", p: { stop1: 0.15, cursa5: 0.38, sare1: 0.02, directie5: 0.5 }, pornire: { p: 0.6, rata: 0.5 } };
  const zar = [{ cod: "stop1", titlu: "Atinge stopul mâine", p: 0.1 }, { cod: "cursa5", titlu: "În 5 zile de bursă: ținta înaintea stopului", p: 0.42 }, { cod: "sare1", titlu: "Deschiderea sare peste stop", p: 0.02 }];
  const l = R.randuri(MOD(R.VERSIUNE), rt, zar, { acum: ACUM, codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: rt.pornire }, { modele: MOD("a1"), rt: rA });
  assert.deepEqual(l.map((x) => x.cod), ["stop1", "cursa5", "sare1", "directie5", "rezultat-t212"], JSON.stringify(l.map((x) => x.cod))); assert.equal(l[3].titlu, R.NUME["directie-t212"]); assert.equal(l[4].titlu, R.NUME["rezultat-t212"]);
  assert.equal(l[0].text, "🧠 12% · 🌳 15% · 🎲 10%\n🧠 dovedită pe 150 de zile independente · 🌳 dovedită pe 150 de zile independente"); assert.equal(l[3].text.split("\n")[0], "🧠 52% · 🌳 50%"); assert.equal(l[4].text.split("\n")[0], "🧠 57% · 🌳 60% · rata ta: 50%");
  assert.equal(R.randuri(MOD(R.VERSIUNE), { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.5 } }, [{ cod: "iese-jos-24", titlu: "x", p: 0.5 }], { acum: ACUM }).length, 0, "modelele T212 nu răspund pe codurile crypto");
});

// ======== Task 4: amândoi antrenorii pe țintele T212 ========
await test("(4) antrenorul arborilor pe un dosar sintetic cu bare ZILNICE (3 tickere + QQQ, 600 de zile) și 250 de trade-uri: modele-arbori.json are stop1-t212 (verificare completă, reper 🎲) și rezultat-t212; fără dosarul zile/ țintele T212 dau „prea puține rânduri”; antrenorul rețelei pornește pe stop1-t212", async () => {
  const dir = path.join(os.tmpdir(), "t212-proba-" + Date.now()), DR = path.join(dir, "data", "retea"); fs.mkdirSync(path.join(DR, "zile"), { recursive: true }); fs.mkdirSync(path.join(DR, "ore"), { recursive: true });
  const yahoo = (b) => ({ la: Date.now(), randuri: b.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v })) });
  for (const [tk, sem] of [["AAA_US_EQ", 11], ["BBB_US_EQ", 12], ["CCC_US_EQ", 13], ["QQQ_US_EQ", 5]]) fs.writeFileSync(path.join(DR, "zile", tk + ".json"), JSON.stringify(yahoo(bareZi(600, 100, sem))));
  const b = bareZi(600, 100, 11); fs.writeFileSync(path.join(DR, "trade-uri.json"), JSON.stringify(Array.from({ length: 250 }, (_, i) => ({ ticker: "AAA_US_EQ", pornit: b[260 + i].t + 3 * 3600000, inchis: b[262 + i].t, cost: 500, rezultat: i % 3 ? 7 : -4 }))));
  const run = (f, extra) => execFileSync(process.execPath, [path.join(RAD, "retea", f), "--rad", dir, "--buget-min", "4", "--seminte", "1", "--max-randuri", "3000", ...extra], { encoding: "utf8", timeout: 600000 });
  const o1 = run("antreneaza-arbori.mjs", ["--tinta", "stop1-t212"]), m = JSON.parse(fs.readFileSync(path.join(DR, "modele-arbori.json"), "utf8")); assert.ok(m.modele["stop1-t212"] && m.modele["stop1-t212"].verificare && m.modele["stop1-t212"].verificare.reper === "🎲", o1);
  const o2 = run("antreneaza-arbori.mjs", ["--tinta", "rezultat-t212"]), m2 = JSON.parse(fs.readFileSync(path.join(DR, "modele-arbori.json"), "utf8")); assert.ok(m2.modele["rezultat-t212"] && m2.modele["rezultat-t212"].nIn === 17, o2);
  const o3 = run("antreneaza.mjs", ["--tinta", "stop1-t212"]); assert.match(o3, /stop1-t212: modelul de azi pe \d+ rânduri/);
  fs.rmSync(path.join(DR, "zile"), { recursive: true, force: true }); const o4 = run("antreneaza-arbori.mjs", ["--tinta", "cursa5-t212"]); assert.match(o4, /cursa5-t212: prea puține rânduri/);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ======== Task 5: colectorul v101.64 - barele zilnice și trade-urile noaptea, bugetul, cifrele pe idei ========
await test("(5) tura-retea strânge noaptea barele zilnice (buget 40 de tickere, QQQ întâi) și trade-urile înainte de antrenori; un ticker picat nu oprește restul; colectorul v101.64 cu bugetul rețelei 45/50 min; ruta idei păstrează retea/arbori {p, dovedita}; ideile primesc pentruCumparare", async () => {
  const TR = await import("./lib/tura-retea.mjs"); const scrise = {}, jur = [];
  const d = { acum: Date.UTC(2026, 9, 5, 0, 30), stare: {}, forta: true, eNoapte: () => true, ziRo: () => "2026-10-05", simboluri: [], cereKlines: async () => null, pauza: async () => {}, citesteOre: () => [], scrieOre: () => {}, boti: async () => [], scrieBoti: () => {},
    porneste: async () => ({ cod: 1, minute: 0 }), citesteModele: () => null, trimite: async () => true, jurnal: (...a) => jur.push(a.join(" ")), scrieStare: () => {},
    tickereZile: async () => ["AAA_US_EQ", "QQQ_US_EQ", "BBB_US_EQ"], cereZile: async (tk) => { if (tk === "BBB_US_EQ") throw new Error("Yahoo a limitat"); return { randuri: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }] }; }, scrieZile: (tk, r) => { scrise[tk] = r; }, tradeuri: async () => [{ ticker: "AAA_US_EQ" }], scrieTradeuri: (l) => { scrise.trade = l; } };
  await TR.turaRetea(d); assert.deepEqual(Object.keys(scrise), ["QQQ_US_EQ", "AAA_US_EQ", "trade"], JSON.stringify(Object.keys(scrise))); assert.ok(jur.some((l) => /zile: 2 din 3 tickere/.test(l)) && jur.some((l) => /BBB_US_EQ.*Yahoo a limitat/.test(l)), jur.join("\n"));
  const col = citeste("scripts", "colector.mjs"); assert.ok(/VERSIUNE_COLECTOR = "v101\.64"/.test(col), "versiunea colectorului"); assert.ok(col.includes('"antreneaza.mjs"), "--buget-min", "45"') && col.includes("retea: antrenorul oprit după 50 de minute"), "bugetul rețelei 45/50");
  assert.ok(col.includes("tickereZile:") && col.includes("cereZile:") && col.includes("scrieZile:") && col.includes("tradeuri:") && col.includes("scrieTradeuri:"), "deps-urile turei de noapte");
  assert.ok(col.includes("Retea.pentruCumparare(") && col.includes("Arbori.pentruCumparare(") && col.includes("bareIdei"), "ideile fără cifrele 🧠/🌳");
  const ruta = citeste("functions", "api", "t212.js"); assert.ok(ruta.includes("retea: x && x.retea") && ruta.includes("arbori: x && x.arbori"), "ruta idei nu păstrează retea/arbori");
});

// ======== Task 6: pagina T212 - sub-blocul pe poziții și la poartă, cifrele pe idei, legenda (ideea 3) ========
await test("(6) pagina T212: pozițiile și poarta primesc sub-blocul „A doua părere” din reteaHtml cu codDirectie directie5 și tintaRezultat rezultat-t212 (barele paginii, QQQ, perechile lui); ideile arată 🧠/🌳 cu starea; T212 aduce modelele (reteaAdu); legenda benzii în capul sub-blocului (ideea 3) ≤ 160", () => {
  const e = citeste("public", "lib", "t212-ecran.js");
  assert.ok(/^function t212ReteaHtml\(/m.test(e) && e.includes("Retea.pentruActiune(reteaM.m,") && e.includes("Arbori.pentruActiune(reteaM.a,") && /codDirectie:\s*"directie5",\s*tintaRezultat:\s*"rezultat-t212"/.test(e), "t212ReteaHtml");
  assert.ok(e.includes("Retea.pentruCumparare(reteaM.m,") && e.includes("Arbori.pentruCumparare(reteaM.a,"), "poarta fără „un trade ca ăsta”");
  assert.ok((e.match(/t212ReteaHtml\(/g) || []).length >= 3, "nechemat pe poziție și la poartă"); assert.ok(e.includes("bare: bare,"), "poarta nu păstrează barele");
  assert.ok(e.includes("x.retea.p") && e.includes("x.arbori.p"), "ideile fără 🧠/🌳"); assert.ok(/reteaAdu\(function\s*\(\)\s*\{\s*t212Render\(\)/.test(e), "T212 nu aduce modelele");
  const m1 = { directie: { tinta: "directie", versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: null } }, a1 = { directie: { tinta: "directie", versiune: "a1", la: ACUM - 3600000, verificare: null } };
  const an = R.antet(m1, ACUM, a1); assert.ok(/semnul plin = cifra mare, inelul = cealaltă familie/.test(an.sub) && an.sub.length <= 160, an.sub); assert.ok(!/inelul/.test(R.antet(m1, ACUM).sub), "legenda fără arbori");
});

// ======== Task 7: garda pe T212, versiunile v100.94 ========
await test("(7) garda: rândurile 🧠/🌳 de pe acțiuni (stop1, sare1, cursa5, directie5, rezultat-t212 cu „rata pe acțiune”, toate stările 🌳) și rândurile 🌳 T212 din „Cum s-a verificat” sunt în grupul STRICT retea, fără abateri", () => {
  const s = situatii().filter((x) => /^arbori\./.test(x.sursa) && /^acțiuni:/.test(x.sit)); assert.ok(s.length >= 40, "situații pe acțiuni: " + s.length);
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.x.sursa + ": " + q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
  assert.ok(s.some((x) => /rata pe acțiune/.test(x.text)), "reperul „rata pe acțiune” lipsește"); assert.ok(s.some((x) => x.sursa === "arbori.randuri.titlu" && x.text === R.NUME["rezultat-t212"]), "rândul „un trade ca ăsta”");
  assert.ok(s.some((x) => /^🌳 Ținta înaintea stopului în 5 zile: /.test(x.text)), "subsolul T212"); assert.ok(s.some((x) => x.sursa === "arbori.randuri.titlu" && x.text === R.NUME["directie-t212"]), "direcția pe 5 zile");
});
await test("(E) versiunile: pagina v100.94 (BUILD_INFO, versiune.js, sw, index ×4, package.json 100.94.0, lanțul cu v10094), colectorul v101.64", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, "v100.94"); assert.match(bi.badge, /^v100\.94 · /);
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "v100.94";'), "versiune.js");
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-v100-94";'), "sw.js");
  const ix = citeste("public", "index.html"); assert.equal((ix.match(/v100\.94/g) || []).length, 4, "index.html ×4"); assert.ok(!/v100\.93/.test(ix), "index.html mai are v100.93");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, "100.94.0"); assert.ok(/npm run test:arbori && npm run test:v10094( && |")/.test(pk), "lanțul de teste"); assert.ok(JSON.parse(pk).scripts["test:v10094"] === "node scripts/proba-v10094.mjs", "scriptul test:v10094");
  assert.ok(/VERSIUNE_COLECTOR = "v101\.64"/.test(citeste("scripts", "colector.mjs")), "colectorul v101.64");
});

console.log("\n" + (pica ? "V100.94 PICA · " + pica + " din " + (ok + pica) : "V100.94 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
