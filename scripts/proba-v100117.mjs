// Proba v100.117 / colector v101.80 (06.10, el: „continuă” ⇒ I-561 Carnetul fișei, „Fișa are dreptate?”, „Istoric + înainte”, „Da, așa”):
// specul docs/superpowers/specs/2026-10-06-carnetul-fisei-design.md, planul docs/superpowers/plans/2026-10-06-carnetul-fisei.md
// (1) re-jocul fără privit în viitor · (2) întrebările cu regula RiscLuna · (3) ofertele înainte · (4) colectorul + serverul · (5) pagina
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "tablou-extra.js", "risc-luna.js", "carnet.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GridCalcul: G, GridPlan: GP, TabloExtra: TE, Carnet: CN } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.117 · Carnetul fișei: fișa are dreptate? · proba\n");

// bare de 15M construite: zile de oscilație (±amp în jurul lui p0), apoi o mișcare dreaptă
const ZI = 86400000, B = 96, T0 = Date.UTC(2026, 6, 1);
function bareOsc(zile, p0, amp, start) { const v = []; for (let i = 0; i < zile * B; i++) { const p = p0 * (1 + amp * Math.sin(i / 7) + amp * 0.5 * Math.sin(i / 53)); v.push({ t: (start || T0) + i * 900000, o: p, h: p * 1.002, l: p * 0.998, c: p, v: 1 }); } return v; }
function adaugaDrum(b, zile, pct) { const u = b[b.length - 1], p0 = u.c; for (let i = 1; i <= zile * B; i++) { const p = p0 * (1 + pct * i / (zile * B)); b.push({ t: u.t + i * 900000, o: p, h: p * 1.001, l: p * 0.999, c: p, v: 1 }); } return b; }
const O = { simbol: "TEST_USDT_PERP", plan: { plus: 3, minus: 15 }, suma: 100, levier: 5, miscareZi: TE.miscareZi };

await test("(1a) re-jocul: o pornire la 30 de zile; urcare dreaptă de 30% ⇒ short-ul iese pe stop, long-ul nu", () => {
  const b = adaugaDrum(bareOsc(30, 100, 0.01), 3, 0.3), c = CN.rejoc(b, O);
  assert.equal(c.length, 2); const L = c.find((x) => x.dir === "long"), S = c.find((x) => x.dir === "short");
  assert.equal(L.t, b[30 * B].t); assert.equal(L.simbol, "TEST_USDT_PERP");
  for (const k of ["ta", "mea"]) { assert.equal(S[k].stop, true, "short " + k); assert.equal(L[k].stop, false, "long " + k); assert.ok(S[k].net < 0); assert.ok(typeof L[k].pStop === "number" && L[k].pStop >= 0 && L[k].pStop <= 1); }
  assert.ok(["ta", "mea"].includes(L.cine)); assert.equal(typeof L.asteapta, "boolean"); assert.equal(typeof L.egale, "boolean");
});
await test("(1b) fără privit în viitor: barele de după pornire stricate (×3) ⇒ alegerea, „aștept”, banda și stopul promis rămân aceleași", () => {
  const b = adaugaDrum(bareOsc(30, 100, 0.01), 3, -0.05), s = 30 * B;
  const b2 = b.map((x, i) => i <= s ? x : { t: x.t, o: x.o * 3, h: x.h * 3, l: x.l * 3, c: x.c * 3, v: 1 });
  const a = CN.rejoc(b, O), z = CN.rejoc(b2, O);
  assert.equal(a.length, z.length);
  a.forEach((x, i) => { const y = z[i]; for (const k of ["t", "dir", "cine", "asteapta", "egale"]) assert.equal(y[k], x[k], k); for (const v of ["ta", "mea"]) { assert.equal(y[v].pStop, x[v].pStop); assert.equal(y[v].jos, x[v].jos); assert.equal(y[v].sus, x[v].sus); } });
  assert.ok(a.some((x, i) => x.ta.net !== z[i].ta.net), "rezultatul se schimbă (simularea e pe barele de după)");
});
await test("(1c) pasul pe zile, fereastra de 3 zile până la capăt; istoric sub 33 de zile ⇒ nimic", () => {
  const b = adaugaDrum(bareOsc(35, 100, 0.01), 3, 0.02);   // 38 de zile ⇒ porniri la 30..35 ⇒ 6 × 2 direcții
  assert.equal(CN.rejoc(b, O).length, 12); assert.equal(CN.rejoc(b, Object.assign({}, O, { pasZile: 2 })).length, 6);
  assert.deepEqual(CN.rejoc(bareOsc(32, 100, 0.01), O), []);
});
await test("(1d) simVarianta = simulatorul fișei pe fereastra ei (stopul = ieșit pe partea pierderii)", () => {
  const b = adaugaDrum(bareOsc(1, 100, 0.002), 3, -0.3);
  const v = { jos: 95, sus: 105, grile: 10, levier: 2, stop: { jos: 94.5, sus: 105.5 } }, r = CN.simVarianta(b, 0, v, "long");
  assert.equal(r.stop, true); assert.ok(r.net < 0); assert.equal(CN.simVarianta(b, 0, v, "short").stop, false);
  assert.equal(CN.simVarianta(b, b.length - 10, v, "long"), null, "fără fereastră întreagă: null");
});

// ---------------- (2) întrebările ----------------
function cazuriSint(seed, efect) {
  let x = seed >>> 0; const rnd = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const l = [];
  for (let m = 0; m < 20; m++) for (let k = 0; k < 20; k++) {
    const a = (rnd() - 0.5) * 0.1, b2 = (rnd() - 0.5) * 0.1, cine = rnd() < 0.5 ? "ta" : "mea", ast = rnd() < 0.3, ps = rnd();
    const c = { simbol: "M" + m, t: T0 + Math.floor(k * 1.5 * ZI) + m * 3600000, /* 30 de zile (10 blocuri de 3 zile), ca re-jocul real */ dir: rnd() < 0.5 ? "long" : "short", cine, asteapta: ast, egale: false, ta: { net: a, stop: rnd() < ps, pStop: ps }, mea: { net: b2, stop: rnd() < ps, pStop: ps } };
    if (efect) c[cine].net = c[cine === "ta" ? "mea" : "ta"].net + 0.02 + (rnd() - 0.5) * 0.01;
    l.push(c);
  }
  return l;
}
// regula promite ~1% „dovedit” fără efect; bootstrap-ul RiscLuna.verdict dădea 3,5% pe aceleași date (măsurat 06.10) ⇒ verdictul pe monede
await test("(2a) etichete la întâmplare: pe 200 de seminții, „dovedit” în cel mult 2% la alegere și la „aștept” (regula de 1%)", () => {
  let a = 0, s2 = 0; for (let s = 1; s <= 200; s++) { const q = CN.intrebari(cazuriSint(s, false), { reps: 400 }); if (/^dovedit/.test(q.alegere.stare)) a++; if (/^dovedit/.test(q.asteapta.stare)) s2++; }
  assert.ok(a <= 4, "alegere " + a + "/200"); assert.ok(s2 <= 4, "aștept " + s2 + "/200");
});
await test("(2b) alegerea cu +2 pp pe fiecare caz ⇒ „dovedit-bun”, diferența ~2%; egalele și „aștept” nu intră la alegere", () => {
  const l = cazuriSint(7, true); l.push(Object.assign({}, l[0], { egale: true, t: l[0].t + 1 }));
  const q = CN.intrebari(l, { reps: 400 });
  assert.equal(q.alegere.stare, "dovedit-bun"); assert.ok(Math.abs(q.alegere.dif - 0.02) < 0.003, String(q.alegere.dif));
  assert.equal(q.alegere.cu, l.filter((x) => !x.egale && !x.asteapta).length);
});
await test("(2c) calibrarea: 3 coșuri după stopul promis, promis mediu vs venit; sub 30 într-un coș ⇒ puține", () => {
  const l = [];
  for (let i = 0; i < 40; i++) l.push({ simbol: "A", t: i, cine: "ta", egale: false, asteapta: false, ta: { net: 0, stop: i < 8, pStop: 0.2 }, mea: { net: 0, stop: false, pStop: 0.2 } });
  for (let i = 0; i < 10; i++) l.push({ simbol: "B", t: i, cine: "mea", egale: false, asteapta: false, ta: { net: 0, stop: false, pStop: 0.1 }, mea: { net: 0, stop: true, pStop: 0.6 } });
  const c = CN.calibrare(l);
  assert.deepEqual(c.map((x) => x.cos), ["sub 30%", "30–50%", "peste 50%"]);
  assert.equal(c[0].n, 40); assert.ok(Math.abs(c[0].promis - 0.2) < 1e-9); assert.ok(Math.abs(c[0].venit - 0.2) < 1e-9); assert.equal(c[0].putine, false);
  assert.equal(c[1].n, 0); assert.equal(c[2].n, 10); assert.equal(c[2].venit, 1); assert.equal(c[2].putine, true);
});
await test("(2d) textele: alegerea, „aștept”, calibrarea, verdictul fișei, rândul sub fișă, concluzia - fără „undefined/NaN”, rezultatele cu o zecimală", () => {
  const q = CN.intrebari(cazuriSint(7, true), { reps: 400 }), c = CN.calibrare(cazuriSint(7, true));
  const t = [CN.textAlegere(q.alegere), CN.textAsteapta(q.asteapta), ...c.map(CN.textCalibrare), CN.textVerdictFisa({ n: 4, pornit: { n: 3, pePlus: 0.66, medie: 0.012 }, asteptat: { n: 1, pePlus: 0, medie: -0.02 } }), CN.randSubFisa({ la: Date.now(), rejoc: { intrebari: q } }), CN.concluzie(q)];
  for (const x of t) { assert.ok(typeof x === "string" && x.length > 10, String(x)); assert.ok(!/undefined|NaN|null/.test(x), x); assert.ok(!/\d,\d\d%/.test(x), "două zecimale: " + x); }
  assert.match(CN.textAlegere(q.alegere), /dovedit/); assert.equal(CN.randSubFisa(null), null);
});

// ---------------- (3) ofertele înainte ----------------
await test("(3a) oferta se judecă după 3 zile pe barele de după ea; înainte ⇒ null; cu banda absolută din ofertă", () => {
  const b = adaugaDrum(bareOsc(1, 100, 0.002), 4, 0.3), t = b[10].t;
  const of = { simbol: "X", t, dir: "short", sursa: "laborator", cine: "ta", asteapta: false, ta: { jos: 97, sus: 103, grile: 8, levier: 2, stop: { jos: 96.5, sus: 103.5 }, pStop: 0.4 }, mea: { jos: 92, sus: 108, grile: 12, levier: 1, stop: { jos: 91.5, sus: 108.5 }, pStop: 0.3 } };
  const j = CN.judecaOferta(of, b); assert.equal(j.ta.stop, true); assert.ok(typeof j.mea.net === "number");
  assert.equal(CN.judecaOferta(of, b.slice(0, 200)), null, "fereastra încă nu s-a încheiat");
});
await test("(3b) oferta veche din fișă fără grile ⇒ „nejudecabil” (nu se ghicesc grilele)", () => {
  const b = adaugaDrum(bareOsc(1, 100, 0.002), 4, 0.01);
  assert.deepEqual(CN.judecaOferta({ simbol: "X", t: b[5].t, dir: "long", sursa: "fisa", ta: { jos: 97, sus: 103, levier: 2, stop: 60, n: 109 }, mea: null }, b), { nejudecabil: true });
});
await test("(3c) ofertele: din planMonede (long + short, cu grile și stopul promis), unite fără dubluri, păstrate 120 de zile", () => {
  const v = (j, s, g) => ({ levier: 3, jos: j, sus: s, grile: g, stop: { jos: j * 0.99, sus: s * 1.01 }, proba: { n: 100, stop: 40, mediaUsdt: 0.5, independente: 9 }, laStop: -10, egalaCuTa: false });
  const pm = [{ simbol: "A_USDT_PERP", pret: 10, L: { ta: v(9.8, 10.2, 8), mea: v(9.5, 10.5, 12) }, S: { ta: v(9.8, 10.2, 8), mea: v(9.5, 10.5, 12) } }];
  const o = CN.oferte(pm, T0); assert.equal(o.length, 2); assert.equal(o[0].sursa, "laborator"); assert.equal(o[0].ta.grile, 8); assert.equal(o[0].ta.pStop, 0.4); assert.ok(["ta", "mea"].includes(o[0].cine));
  const u = CN.uneste([{ simbol: "B", t: T0 - 200 * ZI, dir: "long", sursa: "laborator" }].concat(o), o, T0); assert.equal(u.length, 2);
});
await test("(3d) oferta fișei (KV ferestre) ⇒ forma carnetului: „stop” rămâne numărul probei, prețurile stopului vin din stopJos/stopSus; fără ele ⇒ nejudecabil", () => {
  const nou = { simbol: "ZAMA_USDT_PERP", t: T0, dir: "long", verdict: "porneste", rec: "larg", cine: "mea", egale: false,
    ta: { jos: 0.0803, sus: 0.0849, levier: 5, stop: 60, n: 109, oreTipic: 4.25, grile: 9, stopJos: 0.0800, stopSus: 0.0852 }, mea: { jos: 0.0738, sus: 0.0975, levier: 1, stop: 32, n: 109, oreTipic: 32.25, grile: 20, stopJos: 0.0735, stopSus: 0.0978 } };
  const o = CN.dinFisa(nou);
  assert.deepEqual(o.ta, { jos: 0.0803, sus: 0.0849, grile: 9, levier: 5, stop: { jos: 0.0800, sus: 0.0852 }, pStop: 60 / 109 });
  assert.equal(o.cine, "mea"); assert.equal(o.sursa, "fisa"); assert.equal(o.verdict, "porneste"); assert.equal(o.asteapta, false);
  const vechi = CN.dinFisa({ simbol: "ZAMA_USDT_PERP", t: T0, dir: "long", verdict: "porneste", rec: "larg", ta: { jos: 0.0803, sus: 0.0849, levier: 5, stop: 60, n: 109 }, mea: null });
  assert.equal(vechi.cine, "mea"); assert.deepEqual(CN.judecaOferta(vechi, adaugaDrum(bareOsc(1, 0.08, 0.002), 4, 0.01)), { nejudecabil: true });
  assert.equal(CN.dinFisa({ simbol: "X", t: T0, dir: "neutru" }), null); assert.equal(CN.dinFisa({ simbol: "X", t: T0, dir: "long", rec: "asteapta", ta: nou.ta }).asteapta, true);
});
await test("(3e) fișa salvează în ofertă și grilele, prețurile stopului și alegerea (cine / egale), fără să schimbe „stop” (numărul probei)", () => {
  const a = citeste("public", "app.js"), f = a.slice(a.indexOf("function grFerestreTine("), a.indexOf("\nfunction ", a.indexOf("function grFerestreTine(") + 10));
  assert.match(f, /stop:p\?p\.stop:null,n:p\?p\.n:null,oreTipic:p\?p\.oreTipic:null,grile:x\.grile,stopJos:x\.stop&&x\.stop\.jos,stopSus:x\.stop&&x\.stop\.sus/);
  assert.match(f, /cine:rec\?rec\.cine:null,egale:!!\(v\.mea&&v\.mea\.egalaCuTa\)/);
  assert.match(citeste("scripts", "colector.mjs"), /\.map\(Carnet\.dinFisa\)/);
});
// ---------------- revizia Opus (C1, C2, I1–I4, M1–M7) ----------------
await test("(R-C1) fișa: oferta nouă intră în listă (l.push(o) nu e înghițit de comentariu)", () => {
  const a = citeste("public", "app.js"), lin = a.split("\n").find((l) => l.includes("egale:!!(v.mea&&v.mea.egalaCuTa)"));
  assert.ok(lin, "rândul ofertei"); assert.ok(lin.split("//")[0].includes("l.push(o);"), "l.push(o) e în comentariu: " + lin.slice(-160));
});
// nul cu factor comun de piață: alegerea și „aștept” urmează un semnal zilnic comun; rezultatul (LARG − ÎNGUST) urmează alt semnal comun, cu ferestre de 3 zile suprapuse
function cazuriFactor(seed) {
  let x = seed >>> 0; const rnd = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return s - 3; }, D = 30, m1 = [], m2 = [], e = []; for (let d = 0; d < D + 2; d++) { m1.push(g()); m2.push(g()); e.push(g()); }
  const l = [];
  for (let c = 0; c < 20; c++) for (let d = 0; d < D; d++) {
    const o = (e[d] + e[d + 1] + e[d + 2]) * 0.01, base = g() * 0.01, cine = m1[d] + g() * 0.3 > 0 ? "ta" : "mea", ast = m2[d] + g() * 0.3 > 0.6;
    const ta = { net: base + g() * 0.005, stop: false, pStop: 0.3 }, mea = { net: base + o + g() * 0.005, stop: false, pStop: 0.3 };
    l.push({ simbol: "M" + c, t: T0 + d * ZI + c * 60000, dir: "long", cine, asteapta: ast, egale: false, ta, mea });
  }
  return l;
}
await test("(R-C2) monedele care se mișcă împreună (factor comun, fără niciun avantaj al fișei): „dovedit” în cel mult 2% (testul pe blocuri de timp)", () => {
  let a = 0, s2 = 0; for (let s = 1; s <= 200; s++) { const q = CN.intrebari(cazuriFactor(s), { reps: 400 }); if (/^dovedit/.test(q.alegere.stare)) a++; if (/^dovedit/.test(q.asteapta.stare)) s2++; }
  assert.ok(a <= 4, "alegere " + a + "/200"); assert.ok(s2 <= 4, "aștept " + s2 + "/200");
  const q = CN.intrebari(cazuriSint(7, true), { reps: 400 }); assert.equal(q.alegere.stare, "dovedit-bun"); assert.ok(q.alegere.blocuri >= 8, String(q.alegere.blocuri));
});
await test("(R-I1/I2) ofertele laboratorului = fișa pe 30 de zile (ca re-jocul), cu levierul sigur al fișei; ora ofertei = după ultima bară a monedei", () => {
  const b = adaugaDrum(bareOsc(40, 100, 0.01), 0.5, 0.001), o = CN.oferteAzi(b, Object.assign({}, O, { simbol: "A_USDT_PERP" }));
  assert.equal(o.length, 2); assert.equal(o[0].t, b[b.length - 1].t + 900000); assert.ok(o.every((x) => x.ta.grile > 0 && x.sursa === "laborator" && x.levierSigur > 0));
  const c = CN.rejoc(adaugaDrum(bareOsc(30, 100, 0.01), 3, 0.01), O); assert.ok(c.every((x) => x.levierSigur > 0 && x.ta.levier <= x.levierSigur), "re-jocul plafonează levierul ca fișa");
  assert.match(citeste("scripts", "lib", "tura-laborator.mjs"), /d\.Carnet\.oferteAzi\(b15,/);
});
await test("(R-I3) fără LARG (sau LARG fără prețurile stopului) ⇒ cazul e „egale”, nu o pereche cu același rezultat", () => {
  const st = { jos: 97, sus: 103, levier: 2, stop: 40, n: 100, grile: 8, stopJos: 96.5, stopSus: 103.5 };
  assert.equal(CN.dinFisa({ simbol: "X", t: T0, dir: "long", rec: "ingust", cine: "ta", egale: false, ta: st, mea: null }).egale, true);
  const of = CN.dinFisa({ simbol: "X", t: T0, dir: "long", rec: "ingust", cine: "ta", egale: false, ta: st, mea: Object.assign({}, st, { stopJos: undefined, stopSus: undefined }) });
  const b = bareOsc(5, 100, 0.005, T0), j = CN.judecaOferta(of, b); assert.equal(j.mea, null);
  const cz = CN.cazuriDinOferte([Object.assign({}, of, { r: j })]); assert.equal(cz[0].egale, true);
});
await test("(R-I4) „prea puține” spune de ce (cazuri sau monede); „aștept” spune diferența pe monede, ca verdictul", () => {
  assert.match(CN.textAlegere({ stare: "prea puține", cu: 412, fara: 412, monede: 4 }), /4 monede/);
  assert.match(CN.textAlegere({ stare: "prea puține", cu: 12, fara: 12, monede: 9 }), /12 cazuri/);
  assert.match(CN.textAsteapta({ stare: "nedovedit", cu: 64, fara: 700, dif: -0.0123, medieCu: 0.01, medieFara: 0.002 }), /−1,2%/);
});
await test("(R-M1) stopul promis numără și lichidările (ca stopul venit)", () => {
  const b = adaugaDrum(bareOsc(1, 100, 0.002), 4, 0.01);
  const pm = [{ simbol: "A", L: { ta: { jos: 99, sus: 101, grile: 4, levier: 2, stop: { jos: 98.5, sus: 101.5 }, proba: { n: 100, stop: 30, lichidari: 10 } }, mea: null }, S: null }];
  assert.equal(CN.oferte(pm, b[0].t)[0].ta.pStop, 0.4);
});
await test("(R-M4) oferta mai veche decât barele aduse sau cu gaură în bare ⇒ nejudecabilă (nu „așteaptă” la nesfârșit)", () => {
  const b = bareOsc(5, 100, 0.005, T0 + 10 * ZI), st = { jos: 97, sus: 103, grile: 8, levier: 2, stop: { jos: 96.5, sus: 103.5 } };
  assert.deepEqual(CN.judecaOferta({ simbol: "X", t: T0, dir: "long", ta: st, mea: null }, b), { nejudecabil: true });
  const g = b.filter((x, i) => i < 50 || i > 60); assert.deepEqual(CN.judecaOferta({ simbol: "X", t: b[55].t, dir: "long", ta: st, mea: null }, g), { nejudecabil: true });
});
await test("(R-M5/M6) raportul are p, monede, blocuri (fără ic gol); după citirea carnetului, Gridul se redesenează (rândul apare fără a doua deschidere)", () => {
  const r = CN.raport({ cazuri: cazuriSint(7, true), oferte: [], acum: T0, reps: 200 }), a = r.rejoc.intrebari.alegere;
  assert.ok("p" in a && "monede" in a && "blocuri" in a); assert.ok(!("ic" in a));
  assert.match(citeste("public", "lib", "carnet-ecran.js"), /renderGrid\(\)/);
});
await test("(R-UI) pagina: fără stare dublă, tabelul nu se întinde, „așteaptă” fără „de”, un singur rând când sunt prea puține judecate, o frază de citire sub tabel", () => {
  if (typeof globalThis.carnetHtml !== "function") vm.runInThisContext(citeste("public", "lib", "carnet-ecran.js"), { filename: "carnet-ecran.js" });
  const cz = cazuriSint(7, true), r = CN.raport({ cazuri: cz, oferte: [], acum: T0, reps: 200 }), h = globalThis.carnetHtml(r, T0 + 3600000);
  assert.equal((h.match(/nedovedit|dovedit/g) || []).filter(Boolean).length <= 3, true);
  assert.doesNotMatch(h, /\d+ de așteaptă/); assert.equal((h.match(/încă nu spune nimic/g) || []).length, 1);
  assert.match(h, /class="tbSub cnCiteste">Cel mai mult se abate: stopul promis/); assert.match(citeste("public", "app.css"), /\.cnTab\{[^}]*width:auto/);
  assert.equal((h.match(/<b class="(good|bad|neutral)">/g) || []).length, 0, "fără cipul dublat");
});
// ---------------- (4) serverul, laboratorul, colectorul ----------------
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix || "")).map((name) => ({ name })) }) }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp, brut) => { const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.5." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp || brut) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: brut || (corp ? JSON.stringify(corp) : undefined) }), env }); return { status: res.status, d: await res.json() }; };
await test("(4a) ruta carnet: colectorul scrie raportul, pagina îl citește; fără „la” sau peste 256 KB ⇒ refuzat", async () => {
  assert.deepEqual((await cheama("GET", "action=carnet")).d, { carnet: null });
  const r = { la: T0, rejoc: { n: 3 } };
  assert.equal((await cheama("POST", "action=carnet", { carnet: r })).status, 200); assert.deepEqual((await cheama("GET", "action=carnet")).d, { carnet: r });
  assert.equal((await cheama("POST", "action=carnet", { carnet: { rejoc: {} } })).status, 400);
  assert.equal((await cheama("POST", "action=carnet", null, JSON.stringify({ carnet: { la: 1, x: "a".repeat(270000) } }))).status, 413);
});
await test("(4a') ruta ferestre păstrează grilele, prețurile stopului și alegerea (altfel ofertele noi rămân nejudecabile)", async () => {
  const o = { simbol: "ZAMA_USDT_PERP", t: T0, dir: "long", verdict: "porneste", rec: "larg", cine: "mea", egale: false,
    ta: { jos: 0.0803, sus: 0.0849, levier: 5, stop: 60, n: 109, oreTipic: 4.25, grile: 9, stopJos: 0.08, stopSus: 0.0852 }, mea: { jos: 0.0738, sus: 0.0975, levier: 1, stop: 32, n: 109, oreTipic: 32.25, grile: 20, stopJos: 0.0735, stopSus: 0.0978 } };
  assert.equal((await cheama("POST", "action=ferestre", { oferta: o })).status, 200);
  const x = (await cheama("GET", "action=ferestre")).d.ferestre.find((y) => y.t === T0);
  assert.equal(x.ta.grile, 9); assert.equal(x.ta.stopJos, 0.08); assert.equal(x.mea.stopSus, 0.0978); assert.equal(x.ta.stop, 60); assert.equal(x.cine, "mea"); assert.equal(x.egale, false);
  assert.deepEqual(CN.dinFisa(x).ta.stop, { jos: 0.08, sus: 0.0852 });
  const bad = Object.assign({}, o, { t: T0 + 1, cine: "altceva", ta: Object.assign({}, o.ta, { grile: -3, stopJos: "x" }) });
  assert.equal((await cheama("POST", "action=ferestre", { oferta: bad })).status, 200);
  const y = (await cheama("GET", "action=ferestre")).d.ferestre.find((z) => z.t === T0 + 1); assert.equal(y.cine, undefined); assert.equal(y.ta.grile, undefined); assert.equal(y.ta.stopJos, undefined);
});
await test("(4b) raportul pe 3000 de cazuri și 3000 de oferte încape sub 256 KB (fără cazurile întregi)", () => {
  const cz = []; for (let s = 1; s <= 8; s++) cazuriSint(s, false).forEach((c) => cz.push(c));
  const of = cz.slice(0, 3000).map((c, i) => Object.assign({ sursa: i % 2 ? "laborator" : "fisa", verdict: i % 2 ? null : "porneste", r: { ta: c.ta, mea: c.mea } }, c));
  const r = CN.raport({ cazuri: cz.slice(0, 3000), oferte: of, acum: T0, reps: 200 });
  assert.ok(JSON.stringify(r).length < 262144, String(JSON.stringify(r).length)); assert.equal(r.rejoc.n, 3000); assert.equal(r.inainte.judecate, 3000); assert.equal(r.inainte.fisa.n, 1500);
});
const tl = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-laborator.mjs")).href);
for (const f of ["grid-laborator.js", "grid-clasament.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
await test("(4c) laboratorul cu Carnet: re-jocul pe fiecare monedă, ofertele de azi (long + short, cu grile), judecă ofertele scadente (și pe o monedă din afara listei)", async () => {
  const ACUM = Date.UTC(2026, 8, 30, 6), N = 65 * B, pagini = {};
  const randuri = (k) => Array.from({ length: N }, (_, i) => { const o = 1 + 0.012 * Math.sin(i / 7) + 0.004 * Math.sin(i / 61 + k), c = 1 + 0.012 * Math.sin((i + 1) / 7) + 0.004 * Math.sin((i + 1) / 61 + k); return { time: ACUM - (N - i) * 900000, open: o, close: c, high: Math.max(o, c), low: Math.min(o, c) }; });
  const cere = async (tip, sim, end) => { if (tip === "tickers") return { data: { tickers: [{ symbol: "LAT_USDT_PERP", amount: "1000" }] } }; pagini[sim] = (pagini[sim] || 0) + 1; const r = randuri(sim.length).filter((x) => !end || x.time <= end); return { data: { klines: r.slice(-500).reverse() } }; };
  const st = { jos: 0.98, sus: 1.02, grile: 8, levier: 2, stop: { jos: 0.975, sus: 1.025 }, pStop: 0.3 };
  const deJ = [{ simbol: "LAT_USDT_PERP", t: ACUM - 10 * ZI, dir: "long", sursa: "fisa", cine: "ta", asteapta: false, egale: true, ta: st, mea: st },
    { simbol: "ALTA_USDT_PERP", t: ACUM - 10 * ZI, dir: "short", sursa: "fisa", cine: "ta", asteapta: false, egale: true, ta: st, mea: st },
    { simbol: "LAT_USDT_PERP", t: ACUM - 1 * ZI, dir: "long", sursa: "laborator", cine: "ta", asteapta: false, egale: true, ta: st, mea: st }];
  const r = await tl.turaLaborator({ cere, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, GridCalcul: G, GridLaborator: globalThis.GridLaborator, GridClasament: globalThis.GridClasament, top: 1, H: 2, pagini: 12, zile: 60,
    GridPlan: GP, plan: { plus: 3, minus: 15 }, suma: 100, levier: 5, miscareZi: TE.miscareZi, Carnet: CN, carnetDeJudecat: deJ, acum: ACUM });
  assert.ok(r.carnet, "rez.carnet"); assert.ok(r.carnet.cazuri.length >= 50, String(r.carnet.cazuri.length)); assert.ok(r.carnet.cazuri.every((c) => c.simbol === "LAT_USDT_PERP"));
  assert.equal(r.carnet.oferteNoi.length, 2); assert.ok(r.carnet.oferteNoi.every((o) => o.ta.grile > 0 && o.sursa === "laborator"));
  assert.ok(deJ[0].r && deJ[0].r.ta, "oferta scadentă judecată"); assert.ok(deJ[1].r && deJ[1].r.ta, "și pe moneda din afara listei"); assert.ok(pagini.ALTA_USDT_PERP >= 1);
  assert.equal(deJ[2].r, undefined, "oferta de ieri: încă nu"); assert.equal(typeof r.carnet.ms, "number");
});
await test("(4d) colectorul: Carnet încărcat după RiscLuna, ofertele în data/carnet-oferte.json, ofertele fișei din ferestre, raportul pe server", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.ok(c.indexOf('incarca("carnet.js", "Carnet")') > c.indexOf('incarca("risc-luna.js", "RiscLuna")'));
  assert.match(c, /Carnet, carnetDeJudecat: /); assert.match(c, /carnet-oferte\.json/); assert.match(c, /\/api\/istoric-bot\?action=carnet/); assert.match(c, /Carnet\.raport\(/);
});
// ---------------- (5) pagina, rândul de sub fișă, meniul ----------------
vm.runInThisContext(citeste("public", "lib", "carnet-ecran.js"), { filename: "carnet-ecran.js" });
const html = citeste("public", "index.html"), app = citeste("public", "app.js");
await test("(5a) carnetHtml: fără raport ⇒ se spune că se face noaptea; cu raport ⇒ cele 3 întrebări, calibrarea pe 3 rânduri, „de acum înainte”, regula; vechi ⇒ vârsta", () => {
  assert.match(globalThis.carnetHtml(null, T0), /noaptea/);
  const cz = cazuriSint(7, true), of = cz.slice(0, 40).map((c, i) => Object.assign({ sursa: "fisa", verdict: i % 2 ? "porneste" : "asteapta", r: { ta: c.ta, mea: c.mea } }, c));
  const r = CN.raport({ cazuri: cz, oferte: of, acum: T0, reps: 200 }), h = globalThis.carnetHtml(r, T0 + 3600000);
  assert.ok(h.includes(CN.textAlegere(r.rejoc.intrebari.alegere).replace(/„/g, "„")), "alegerea"); assert.match(h, /Pe istoric/); assert.match(h, /De acum înainte/);
  assert.equal((h.match(/<tr class="cnCos">/g) || []).length, 3); assert.match(h, /dovedit/); assert.match(h, /Aș urma alegerea fișei/);
  assert.match(globalThis.carnetHtml(r, T0 + 40 * 3600000), /vechi/); assert.doesNotMatch(h, /undefined|NaN/);
});
await test("(5b) pagina: secțiunea #carnet, butonul în Zilnic după „Grid: ce setez?”, scripturile după grid-plan și risc-luna, în cache-ul aplicației; navTo o pornește", () => {
  assert.match(html, /<section class="panel" id="carnet">/); assert.match(html, /id="cnPagina"/);
  const z = html.slice(html.indexOf('id="sideZilnic"'), html.indexOf('id="sideUnelte"'));
  assert.ok(z.indexOf('data-nav="carnet"') > z.indexOf('data-nav="gridset"') && z.indexOf('data-nav="carnet"') < z.indexOf('data-nav="jurnaltrade"'));
  const ic = html.indexOf('src="/lib/carnet.js"'), ie = html.indexOf('src="/lib/carnet-ecran.js"');
  assert.ok(ic > html.indexOf('src="/lib/grid-plan.js"') && ic > html.indexOf('src="/lib/risc-luna.js"') && ie > ic);
  const sw = citeste("public", "sw.js"); assert.match(sw, /"\/lib\/carnet\.js"/); assert.match(sw, /"\/lib\/carnet-ecran\.js"/);
  assert.match(app, /if\(id==="carnet"\)\{if\(typeof carnetPorneste==="function"\)carnetPorneste\(false\)\}/);
  assert.match(html, /moreNav\('carnet',true\)/);
});
await test("(5c) sub „Ce aș alege eu” din fișă: rândul carnetului + butonul spre pagină; Grid pornește citirea carnetului", () => {
  const i = app.indexOf('<p class="grPlanAleg">'), f = app.slice(i, i + 900);
  assert.match(f, /Carnet\.randSubFisa\(carnetStare\.raport\)/); assert.match(f, /navTo\(\\'carnet\\',true\)/);   // în șirul JS apostrofurile sunt escapate
  assert.match(app, /id==="gridset"[^\n]*carnetPorneste\(false\)/);
});
await test("(G) garda textelor: grupul „carnet” (strict) cu textele reale ale Carnetului", () => {
  const g = citeste("scripts", "garda-texte.mjs"); assert.match(g, /import \{ situatiiCarnet \} from "\.\/lib\/garda-carnet\.mjs";/); assert.match(g, /"carnet"\]\);/);
  const s = citeste("scripts", "lib", "garda-carnet.mjs"); for (const f of ["textAlegere", "textAsteapta", "textCalibrare", "textVerdictFisa", "randSubFisa", "concluzie"]) assert.match(s, new RegExp("\\." + f + "\\("), f);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
