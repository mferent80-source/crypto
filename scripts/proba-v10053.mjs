// Proba v100.53 (01.10, el: actiunile T212 - pachetul 2: probabilitatile pe iesire,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-2-probabilitatile.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;
const PR = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.53 · Actiunile T212: probabilitatile pe iesire · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);

// ---- pasul 1: adaptorul pentru actiuni ----
const zi = (n, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: Date.UTC(2024, 0, 1) + i * 864e5, o: c, h: c * 1.01, l: c * 0.99, c }; });
await test("pentruActiune: atinge stopul mâine, ținta înaintea stopului în 5 zile, săritura separat; cazuri independente si IC", () => {
  are(PR.pentruActiune, "Probabilitati.pentruActiune");
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5)));
  const r = PR.pentruActiune(b, { pret: b[399].c, stop: b[399].c * 0.97, tinta: b[399].c * 1.05, acum: b[399].t + 864e5 });
  assert.ok(r && r.stop1 && r.cursa5 && r.sare1, JSON.stringify(r && Object.keys(r)));
  assert.ok(r.stop1.n > 100 && r.stop1.nIndep === r.stop1.n, "fereastra de 1 zi la pas 1: toate independente " + r.stop1.n + "/" + r.stop1.nIndep);
  assert.ok(r.cursa5.tinta.nIndep <= Math.floor(r.cursa5.tinta.n / 5) + 1, "5 zile: n/5 independente"); assert.ok(r.stare);
  assert.equal(PR.pentruActiune(b.slice(0, 100), { pret: 100, stop: 97, tinta: 105, acum: b[99].t + 864e5 }), null);
});
await test("saritura peste stop se numara in sare1, NU in stop1", () => {
  are(PR.pentruActiune, "Probabilitati.pentruActiune");
  const b = zi(300, () => 100); for (let i = 120; i < 300; i += 10) { b[i] = { ...b[i], o: 95, l: 94.5, h: 96, c: 100 }; }   // deschideri cu -5%
  const r = PR.pentruActiune(b, { pret: 100, stop: 97, tinta: 110, acum: b[299].t + 864e5 });
  assert.ok(r.sare1.k > 0, "sariturile peste stop numarate"); assert.equal(r.stop1.k, 0, "nicio atingere in zi fara saritura");
});
await test("doar ce se stia atunci: o bara din trecut schimbata schimba rezultatul; weekendul nu arunca ferestrele", () => {
  are(PR.pentruActiune, "Probabilitati.pentruActiune");
  const b = zi(300, (i) => 100 + (i % 7)), acum = b[299].t + 864e5;
  const r1 = PR.pentruActiune(b, { pret: 100, stop: 97, tinta: 105, acum });
  const b2 = b.map((x) => ({ ...x })); b2[150] = { ...b2[150], l: 50 };   // o cadere mare in trecut
  const r2 = PR.pentruActiune(b2, { pret: 100, stop: 97, tinta: 105, acum });
  assert.notDeepEqual([r1.stop1, r1.cursa5], [r2.stop1, r2.cursa5], "o bara din trecut schimbata trebuie sa schimbe frecventele");
  const cuGol = b.map((x, i) => ({ ...x, t: x.t + Math.floor(i / 5) * 2 * 864e5 }));   // 2 zile libere la fiecare 5
  assert.ok(PR.pentruActiune(cuGol, { pret: 100, stop: 97, tinta: 105, acum: cuGol[299].t + 864e5 }).stop1.n > 100);
});
await test("stopul deja depasit -> fara probabilitati de stop, cu motivul", () => {
  are(PR.pentruActiune, "Probabilitati.pentruActiune");
  const b = zi(300, (i) => 100 + (i % 7)), r = PR.pentruActiune(b, { pret: 100, stop: 101, tinta: 110, acum: b[299].t + 864e5 });
  assert.equal(r.stop1, null); assert.match(r.motiv, /deja depășit/);
});

// ---- pasul 2: calibrarea pe cumpararile lui ----
await test("calibrareActiuni: un caz pe ticker la >= 5 zile de bursa; cumpararile din aceeasi zi = un caz; cutiile ca la crypto", () => {
  are(PR.calibrareActiuni, "Probabilitati.calibrareActiuni");
  const Z = 864e5, inch = [{ id: "a", ticker: "X", pornit: 0 }, { id: "b", ticker: "X", pornit: 2 * Z }, { id: "c", ticker: "X", pornit: 9 * Z }, { id: "d", ticker: "Y", pornit: 0 }, { id: "e", ticker: "Y", pornit: 3600000 }];
  const cf = { a: { prob: { p: 0.55, r: 1 } }, b: { prob: { p: 0.55, r: 0 } }, c: { prob: { p: 0.45, r: 0 } }, d: { prob: { p: 0.9, r: 1 } }, e: { prob: { p: 0.9, r: 1 } } };
  const cal = PR.calibrareActiuni(inch, cf), c = cal["act-cursa5"].cutii;
  assert.equal(c[2].n, 2, "X: a si c (b e la 2 zile de a)"); assert.equal(c[4].n, 1, "Y: d si e in aceeasi zi = un caz");
});
await test("rejucarea noteaza prob doar cu barele de dinainte si ruta cf o pastreaza; colectorul da ActiuniSemnale lui Probabilitati", async () => {
  const t = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(t, /probLaCumparare\(inainte/); assert.match(t, /{ prob }/); assert.match(t, /!\("prob" in gata\[t\.id\]\)/);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /new Function\("GridCalcul", "ActiuniSemnale", fs\.readFileSync\(path\.join\(RAD, "public", "lib", "probabilitati\.js"\)/); assert.match(col, /ActiuniSemnale, ProfilMoneda, Probabilitati, pauza/);
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const r = await mod.onRequestPost({ request: new Request("http://127.0.0.1:8788/api/t212?action=cf", { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: JSON.stringify({ verdicte: { a1: { nivel: "cumpara", motive: [], greseli: [], prob: { p: 0.62, r: 1, zi: 5 } }, a2: { nivel: "cumpara", motive: [], greseli: [], prob: null } } }) }), env });
  assert.equal(r.status, 200); const m = JSON.parse(kv.get("t212:cf")); assert.deepEqual(m.a1.prob, { p: 0.62, r: 1, zi: 5 }); assert.ok("prob" in m.a2 && m.a2.prob === null, "prob: null se pastreaza (altfel s-ar reface la nesfarsit)");
});
await test("rezultatul cumpararii (r): primele 5 zile DUPA ziua cumpararii; tinta inaintea stopului -> 1; amandoua in aceeasi zi -> 0", () => {
  are(PR.rezultatCumparare, "Probabilitati.rezultatCumparare");
  const Z = 864e5, b = Array.from({ length: 10 }, (_, i) => ({ t: i * Z, o: 100, h: 101, l: 99, c: 100 }));
  b[2] = { ...b[2], h: 106 }; assert.equal(PR.rezultatCumparare(b, 0.5 * Z, 95, 105), 1);
  const b2 = b.map((x) => ({ ...x })); b2[2] = { ...b2[2], h: 106, l: 94 }; assert.equal(PR.rezultatCumparare(b2, 0.5 * Z, 95, 105), 0, "pesimist");
  const b3 = Array.from({ length: 10 }, (_, i) => ({ t: i * Z, o: 100, h: i === 0 ? 120 : 101, l: 99, c: 100 })); assert.equal(PR.rezultatCumparare(b3, 0.5 * Z, 95, 105), 0, "ziua cumpararii nu intra");
  assert.equal(PR.rezultatCumparare(b.slice(0, 4), 0.5 * Z, 95, 105), null, "sub 5 zile dupa");
});

// ---- pasul 3: randurile pentru pagina T212 ----
await test("randActiune: stopul maine (cu saritura alaturi), tinta inaintea stopului in 5 zile (calibrata), saritura + rezultatele in N zile", () => {
  are(PR.randActiune, "Probabilitati.randActiune");
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5))), pret = b[399].c;
  const rez = PR.pentruActiune(b, { pret, stop: pret * 0.97, tinta: pret * 1.05, acum: b[399].t + 864e5 });
  const r = PR.randActiune(rez, {}, { rezultateZile: 3, evenimente: { mediana: 0.06, max: 0.18 } });
  assert.ok(r.length === 4, JSON.stringify(r.map((x) => x.titlu)));
  assert.match(r[0].titlu, /stopul.*mâine/i); assert.match(r[0].text, /din care prin săritură/); assert.match(r[1].text, /pe cumpărările tale: 0 cazuri judecate/);
  assert.match(r[3].titlu, /Rezultatele vin în 3 zile/); assert.match(r[3].text, /18%/);
  assert.equal(PR.randActiune(rez, {}, { rezultateZile: 12 }).length, 3, "rezultatele departe: fara rand");
  assert.match(PR.randActiune(PR.pentruActiune(b, { pret, stop: pret * 1.01, tinta: pret * 1.05, acum: b[399].t + 864e5 }), {}, {})[0].titlu, /deja depășit/);
  assert.match(fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), /Probabilitati\.randActiune\(/);
});

// ---- revizia finala (Opus, 01.10): I1, I2, I3, I4, M1 ----
await test("I1: cifrele urmeaza pretul de acum (aceleasi bare, acelasi stop, pret mai jos -> atingerea mai probabila; sub stop -> „deja depășit”); memo-ul starilor se refoloseste", () => {
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5))), acum = b[399].t + 864e5, memo = {};
  const sus = PR.pentruActiune(b, { pret: 100, stop: 97, tinta: 120, acum, memo }), jos = PR.pentruActiune(b, { pret: 98, stop: 97, tinta: 120, acum, memo });
  assert.ok(jos.stop1.p + jos.sare1.p > sus.stop1.p + sus.sare1.p, (sus.stop1.p + sus.sare1.p) + " vs " + (jos.stop1.p + jos.sare1.p));
  assert.match(PR.pentruActiune(b, { pret: 96, stop: 97, tinta: 120, acum, memo }).motiv, /deja depășit/);
  assert.ok(Object.keys(memo).length > 100, "starile zilelor tinute in memo-ul dat");
  const ecr = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.match(ecr, /Math\.round\(p\.pret \* 1000\)/, "pretul in cheie"); assert.match(ecr, /t212StareMemo\[p\.ticker\]/);
});
await test("I2 + I4: probLaCumparare - „încă nu” (sub 5 zile dupa) -> undefined, se reface; „niciodata” (sub 120 inainte / pret nepotrivit) -> null", () => {
  are(PR.probLaCumparare, "Probabilitati.probLaCumparare");
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5))), nv = { nivel: "ok", d: 3 };
  const t = { pornit: b[396].t + 15 * 3600000, pretCumparare: b[396].c };
  const ina = b.filter((x) => x.t + 8 * 3600000 <= t.pornit);
  assert.equal(PR.probLaCumparare(ina, b, t, nv, true), undefined, "doar 3 zile dupa: inca nu se poate judeca");
  const t2 = { pornit: b[350].t + 15 * 3600000, pretCumparare: b[350].c }, ina2 = b.filter((x) => x.t + 8 * 3600000 <= t2.pornit);
  const p2 = PR.probLaCumparare(ina2, b, t2, nv, true); assert.ok(p2 && (p2.r === 0 || p2.r === 1) && p2.p >= 0, JSON.stringify(p2));
  assert.equal(PR.probLaCumparare(ina2, b, t2, nv, false), null, "pret nepotrivit (split): niciodata");
  assert.equal(PR.probLaCumparare(ina2.slice(0, 50), b, t2, nv, true), null, "sub 120 de zile inainte: niciodata");
  const tu = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(tu, /probLaCumparare\(/); assert.match(tu, /prob === undefined \? \{\} : \{ prob \}/);
});
await test("I3: cifra actiunii NU se inlocuieste cu media cutiei; calibrarea apare ca nota (ce am zis in medie, ce s-a intamplat, cazuri, saptamani)", () => {
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5))), pret = b[399].c;
  const rez = PR.pentruActiune(b, { pret, stop: pret * 0.97, tinta: pret * 1.05, acum: b[399].t + 864e5 });
  const Z = 864e5, inch = Array.from({ length: 60 }, (_, i) => ({ id: "x" + i, ticker: "T" + (i % 6), pornit: i * 8 * Z }));
  const cf = Object.fromEntries(inch.map((t, i) => [t.id, { prob: { p: 0.05, r: i % 10 === 0 ? 1 : 0 } }]));
  const cal = PR.calibrareActiuni(inch, cf); assert.ok(cal.rezumat && cal.rezumat.n === 60 && cal.rezumat.saptamani > 0, JSON.stringify(cal.rezumat));
  const r = PR.randActiune(rez, cal, {});
  assert.equal(r[1].p, rez.cursa5.tinta.p, "cifra bruta a actiunii ramane"); assert.match(r[1].text, /pe cumpărările tale/); assert.match(r[1].text, /săptămâni/);
});
await test("M1: textul rezultatelor spune adevarul (ferestrele istorice includ si zilele de rezultate)", () => {
  const b = zi(400, (i) => 100 * (1 + 0.03 * Math.sin(i / 5))), pret = b[399].c;
  const r = PR.randActiune(PR.pentruActiune(b, { pret, stop: pret * 0.97, tinta: pret * 1.05, acum: b[399].t + 864e5 }), {}, { rezultateZile: 2, evenimente: { mediana: 0.06, max: 0.18 } });
  const t = r[r.length - 1].text; assert.ok(!/NU cuprind/.test(t)); assert.match(t, /nu țin cont că rezultatele cad/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
