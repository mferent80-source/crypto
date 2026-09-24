// Probele v78: Grid - ce setez acum? (public/lib/grid-calcul.js + grid-proba.js)
// Specul: docs/superpowers/specs/2026-09-24-grid-ce-setez-design.md
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = citeste("../public/lib/grid-calcul.js") + "\n" + citeste("../public/lib/grid-proba.js");
const M = new Function(`${SRC}; return { GC: typeof GridCalcul!=="undefined"?GridCalcul:null, GP: typeof GridProba!=="undefined"?GridProba:null };`)();
const GC = M.GC, GP = M.GP;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const Q = 15 * 60000;
// bare crescatoare din preturi de inchidere: o = inchiderea anterioara, h/l cu o marja mica
function bareDin(inch, marja = 0.001, t0 = 1_780_000_000_000) {
  return inch.map((c, i) => { const o = i ? inch[i - 1] : c; return { t: t0 + i * Q, o, h: Math.max(o, c) * (1 + marja), l: Math.min(o, c) * (1 - marja), c }; });
}
// Mers aleator cu samanta fixa, ca proba sa fie repetabila.
function aleator(n, samanta = 7, vol = 0.004) {
  let s = samanta, p = 1; const out = [];
  for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; p *= 1 + ((s / 2147483647) - 0.5) * vol; out.push(p); }
  return out;
}

console.log("\nV78 · grid - ce setez acum · proba\n");

await test("modulul GridCalcul exista", () => assert.ok(GC, "GridCalcul lipseste"));

await test("bare: sorteaza, scoate dublurile si bara in formare, sare peste randuri stricate (nu le face 0)", () => {
  const r = [
    { time: 3000, open: "3", high: "3.1", low: "2.9", close: "3" },
    { time: 1000, open: "1", high: "1.1", low: "0.9", close: "1" },
    { time: 3000, open: "3", high: "3.1", low: "2.9", close: "3" },   // dublura din pagina suprapusa
    { time: 2000, open: "2", high: null, low: "1.9", close: "2" },     // stricat
    { time: 4000, open: "4", high: "4.2", low: "3.9", close: "4.1" }, // in formare
  ];
  assert.deepEqual(GC.bare(r).map((b) => b.t), [1000, 3000]);
  assert.equal(GC.pretCurent(r), 4.1);
  assert.equal(GC.pretCurent([]), null);
});

await test("percentila si mediana", () => {
  assert.equal(GC.mediana([3, 1, 2]), 2);
  assert.equal(GC.mediana([]), null);
  aprox(GC.percentila([0, 10, 20, 30, 40], 0.75), 30, 1e-9);
  aprox(GC.percentila([0, 10], 0.6), 6, 1e-9);
});

await test("nrGrile: jos 90, sus 110, pas 1% -> 20; strunit la 2..150", () => {
  assert.equal(GC.nrGrile(90, 110, 0.01), 20);
  assert.equal(GC.nrGrile(100, 100.1, 0.01), 2);
  assert.equal(GC.nrGrile(10, 1000, 0.0035), 150);
});

await test("pasi: culoarul pasului porneste de la 0,35% si urca pana la 3 x miscarea tipica pe 15M; pe bare linistite ramane 0,35%", () => {
  const vii = bareDin(aleator(500, 9, 0.02), 0.004);         // bare de ~0,8%+ -> pas maxim > minim
  const p = GC.pasi(vii);
  aprox(p[0], 0.0035, 1e-12, "minimul");
  assert.ok(p[2] > 0.0035 && p[1] > p[0] && p[1] < p[2], JSON.stringify(p));
  aprox(p[1], Math.sqrt(p[0] * p[2]), 1e-12, "mijlocul geometric");
  const moarte = bareDin(Array(300).fill(1), 0.0001);          // bare de 0,02% -> nimic sub 0,35%
  assert.deepEqual(GC.pasi(moarte), [0.0035, 0.0035, 0.0035]);
  assert.equal(GC.pasi([]), null);
});

await test("plaseaza: neutru centrat, long 60% deasupra, short 40% deasupra", () => {
  const n = GC.plaseaza(100, 0.1, "neutru"), l = GC.plaseaza(100, 0.1, "long"), s = GC.plaseaza(100, 0.1, "short");
  aprox(n.jos, 95, 1e-9); aprox(n.sus, 105, 1e-9);
  aprox(l.jos, 96, 1e-9); aprox(l.sus, 106, 1e-9);
  aprox(s.jos, 94, 1e-9); aprox(s.sus, 104, 1e-9);
});

await test("lichidare long socotita de mana: 90-110, 2 grile, pret 100, 5x -> ~76,61", () => {
  // niveluri 90 / 99,4987 / 110; celula 0 cumparata la 90, celula 1 (peste pret) la 100
  // q0 = 5/2/90, q1 = 5/2/99,4987; Q = 0,052904; cost = 2,5 + 2,51259 = 5,01259
  // p = (cost - 1) / (Q * 0,99) = 76,61 (verificat in Python)
  const lq = GC.lichidare(GC.niveluri(90, 110, 2), 100, "long", 5);
  aprox(lq.jos, 76.61, 0.02, "lichidarea long");
  assert.equal(lq.sus, null);
});

await test("levierSigur: lichidarea sta la cel putin o latime dincolo de margine; plafon 5x", () => {
  for (const dir of ["long", "neutru", "short"]) {
    const r = GC.levierSigur(95, 105, 100, dir, 20);
    assert.ok(r.levier >= 1 && r.levier <= 5, dir);
    if (r.lichidare.jos !== null) assert.ok(r.lichidare.jos <= 95 - 10, `${dir} jos ${r.lichidare.jos}`);
    if (r.lichidare.sus !== null) assert.ok(r.lichidare.sus >= 105 + 10, `${dir} sus ${r.lichidare.sus}`);
  }
});

await test("construieste: pas >= 0,35%, profit net pe grila >= 0,25%, stop inaintea lichidarii", () => {
  const st = GC.construieste({ pret: 100, lat: 0.08, pas: 0.0035, dir: "long", suma: 100 });
  assert.ok(st.pas >= 0.0035 - 1e-9, `pas ${st.pas}`);
  assert.ok(st.profitGrila >= 0.0025 - 1e-9, `profit ${st.profitGrila}`);
  assert.ok(st.stop.jos < st.jos && st.stop.sus > st.sus);
  assert.ok(st.lichidare.jos === null || st.lichidare.jos < st.stop.jos, "lichidarea inaintea stopului");
  aprox(st.perOrdin, 100 * st.levier / st.grile, 1e-9);
  assert.equal(st.pesteSigur, false);
});

await test("construieste cu levier ales peste cel sigur -> pesteSigur", () => {
  const st = GC.construieste({ pret: 100, lat: 0.3, pas: 0.01, dir: "long", suma: 100, levier: 20 });
  assert.equal(st.levier, 20);
  assert.equal(st.pesteSigur, true);
});

await test("directie: urcare -> long, coborare -> short, oscilatie -> neutru; mereu cu motive", () => {
  const sus = bareDin(Array.from({ length: 120 }, (_, i) => 1 + i * 0.01));
  const jos = bareDin(Array.from({ length: 120 }, (_, i) => 3 - i * 0.01));
  const lat = bareDin(Array.from({ length: 120 }, (_, i) => 2 + 0.05 * Math.sin(i * 0.7)));
  assert.equal(GC.directie(sus, sus).dir, "long");
  assert.equal(GC.directie(jos, jos).dir, "short");
  assert.equal(GC.directie(lat, lat).dir, "neutru");
  assert.equal(GC.directie(sus, sus).tarie, "tare");
  assert.ok(GC.directie(sus, sus).motive.length >= 2);
  assert.equal(GC.directie(sus.slice(0, 20), null).tarie, "fara-date");
});

await test("regim: liniste -> nu e miscare; salt mare in ultimele 4h -> miscare", () => {
  const lin = bareDin(aleator(30 * 96, 3, 0.004));
  assert.equal(GC.regim(lin).miscare, false, JSON.stringify(GC.regim(lin)));
  const inch = aleator(30 * 96, 3, 0.004);
  for (let i = inch.length - 16; i < inch.length; i++) inch[i] = inch[i - 1] * 1.006;   // +10% in 4h
  assert.equal(GC.regim(bareDin(inch)).miscare, true);
  assert.equal(GC.regim(lin.slice(0, 50)), null, "prea putin -> null, nu fals");
});

await test("verdict: miscare -> nu; liniste + proba buna -> porneste; proba la limita -> asteapta; fara date -> fara-date", () => {
  const bun = { antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.004 } };
  const linist = { r4h: 0.8, r24h: 0.9, miscare: false };
  assert.equal(GC.verdict({ regim: { r4h: 2.1, r24h: 1, miscare: true }, stat: bun, zile: 30, pozitie: 0.5 }).nivel, "nu");
  assert.equal(GC.verdict({ regim: linist, stat: bun, zile: 30, pozitie: 0.5 }).nivel, "porneste");
  assert.equal(GC.verdict({ regim: linist, stat: { antren: { mediana: 0.001, lichidari: 0 }, test: { mediana: 0.002 } }, zile: 30, pozitie: 0.5 }).nivel, "asteapta");
  assert.equal(GC.verdict({ regim: linist, stat: { antren: { mediana: -0.01, lichidari: 0 }, test: null }, zile: 30, pozitie: 0.5 }).nivel, "nu");
  assert.equal(GC.verdict({ regim: linist, stat: { antren: { mediana: 0.02, lichidari: 2 }, test: null }, zile: 30, pozitie: 0.5 }).nivel, "nu");
  assert.equal(GC.verdict({ regim: linist, stat: bun, zile: 30, pozitie: 0.97 }).nivel, "asteapta");
  assert.equal(GC.verdict({ regim: linist, stat: bun, zile: 12, pozitie: 0.5 }).nivel, "asteapta");
  assert.equal(GC.verdict({ regim: null, stat: bun, zile: 30, pozitie: 0.5 }).nivel, "fara-date");
});

await test("modulul GridProba exista", () => assert.ok(GP, "GridProba lipseste"));

await test("simuleaza: canal neutru socotit de mana - doua cicluri pe celula 1 -> +2,521%", () => {
  // 90-110, 4 grile, levier 1: niveluri 90 / 94,630 / 99,499 / 104,618 / 110 (verificate in Python)
  // neutru la 100: celulele 0 si 1 cumpara la 90 si 94,630; celula 2 contine pretul (inactiva); celula 3 vinde la 110
  // fiecare bara (verde, drum O->L->H->C): 100 -> 94 (cumpara la 94,630) -> 100 (vinde la 99,499)
  // q1 = 1/4/94,630 = 0,00264186; castig = q1 * 4,8687 = 0,0128618; comision = q1*0,0005*(94,630+99,499) = 0,00025643
  // net pe ciclu 0,0126054; doua bare = 0,0252108
  const b = [0, 1].map((i) => ({ t: i * Q, o: 100, h: 100, l: 94, c: 100 }));
  const st = { dir: "neutru", jos: 90, sus: 110, grile: 4, levier: 1 };
  const r = GP.simuleaza(b, 0, 2, st);
  aprox(r.net, 0.0252108, 0.00002, "net");
  assert.equal(r.umpleri, 4);
  assert.equal(r.lichidat, false);
});

await test("simuleaza: trend care iese din interval -> stop, iesire numarata, net = pierderea pana la stop", () => {
  const inch = Array.from({ length: 60 }, (_, i) => 100 * (1 - 0.004 * i));   // -24%
  const b = bareDin(inch, 0.0005);
  const st = GC.construieste({ pret: b[0].o, lat: 0.08, pas: 0.005, dir: "long", suma: 1 });
  const r = GP.simuleaza(b, 0, b.length, st);
  assert.equal(r.oprit, true);
  assert.ok(r.iesiri >= 1);
  assert.ok(r.net < 0 && r.net > -1, `net ${r.net}`);
  assert.equal(r.lichidat, false);
});

await test("simuleaza: prabusire la levier mare fara stop -> lichidat, net = -100%", () => {
  const inch = Array.from({ length: 40 }, (_, i) => 100 * (1 - 0.012 * i));   // -47%
  const b = bareDin(inch, 0.0005);
  const st = GC.construieste({ pret: 100, lat: 0.06, pas: 0.005, dir: "long", suma: 1, levier: 10 });
  delete st.stop;
  const r = GP.simuleaza(b, 0, b.length, st);
  assert.equal(r.lichidat, true);
  assert.equal(r.net, -1);
});

await test("alegePlatou: alege platoul, nu varful izolat; sare peste ce a fost lichidat", () => {
  const c = (mediana, lichidari = 0) => ({ mediana, lichidari });
  const mat = [
    [c(-0.02), c(0.05), c(-0.02)],    // varf izolat 5%
    [c(0.01), c(0.012), c(0.011)],     // platou ~1%
    [c(0.01), c(0.011), c(0.3, 1)],    // 30% dar lichidat
  ];
  const a = GP.alegePlatou(mat);
  assert.deepEqual([a.wi, a.pi], [1, 1]);
  assert.equal(GP.alegePlatou([[c(0.1, 1)]]), null);
});

const b30 = bareDin(aleator(30 * 96 + 1, 11, 0.004));
await test("proba: 30 de zile -> 3 directii, ferestre antrenament + nevazute, sub 3 s", () => {
  const t0 = Date.now(), p = GP.proba(b30, 2);
  assert.ok(Date.now() - t0 < 3000, `a durat ${Date.now() - t0} ms`);
  for (const d of ["long", "neutru", "short"]) assert.ok(p.pe[d] && p.pe[d].antren, d);
  assert.ok(p.ferestre.antren > 20 && p.ferestre.test > 10, JSON.stringify(p.ferestre));
  assert.equal(p.ferestre.independente, 15);
  assert.ok(["long", "neutru", "short"].includes(p.recomandata));
});

await test("proba: sub 2 orizonturi + o zi de istoric -> null (nu cifre inventate)", () => {
  assert.equal(GP.proba(b30.slice(0, 4 * 96), 2), null);
});

const b4 = bareDin(aleator(300, 5, 0.01)), b1 = bareDin(aleator(200, 6, 0.02));
await test("contrazice: se spune doar cand recomandata difera SI n-a pierdut pe zilele nevazute", () => {
  const pr = (rec, testMed) => ({ recomandata: rec, pe: { long: {}, neutru: {}, short: { test: testMed === undefined ? null : { mediana: testMed } } } });
  assert.deepEqual(GP.contrazice(pr("short", 0.02), "long"), { fisa: "long", proba: "short" });
  assert.equal(GP.contrazice(pr("short", -0.11), "long"), null, "shortul a pierdut pe nevazute -> nu contrazice");
  assert.deepEqual(GP.contrazice(pr("short"), "long"), { fisa: "long", proba: "short" }, "fara zile nevazute -> se spune");
  assert.equal(GP.contrazice(pr("long", 0.05), "long"), null);
  assert.equal(GP.contrazice({ recomandata: null, pe: {} }, "long"), null);
});

await test("fisa: completa, cu directie mereu data si setari de copiat", () => {
  const f = GP.fisa({ simbol: "TEST_USDT_PERP", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 100, H: 2, dir: null, levier: null, minNotional: 1 });
  assert.ok(!f.eroare, f.eroare);
  assert.ok(["long", "neutru", "short"].includes(f.dir));
  assert.ok(f.setare.jos < f.pret && f.setare.sus > f.pret, `jos ${f.setare.jos} pret ${f.pret} sus ${f.setare.sus}`);
  assert.ok(["porneste", "asteapta", "nu"].includes(f.verdict.nivel));
  assert.ok(f.setare.grile >= 2 && f.setare.levier >= 1);
});

await test("fisa: directia aleasa de el inlocuieste trendul si se spune ca e manuala", () => {
  const f = GP.fisa({ simbol: "T", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 100, H: 2, dir: "short", levier: null, minNotional: 1 });
  assert.equal(f.dir, "short"); assert.equal(f.manual, true); assert.equal(f.setare.dir, "short");
});

await test("fisa: suma prea mica pentru minimul pe ordin -> verdict nu + suma necesara", () => {
  const f = GP.fisa({ simbol: "T", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 2, H: 2, dir: null, levier: null, minNotional: 5 });
  assert.equal(f.verdict.nivel, "nu");
  assert.ok(f.sumaMinima > 2, `sumaMinima ${f.sumaMinima}`);
  assert.match(f.verdict.motive[0], /suma/i);
});

await test("fisa: fara pret sau fara lumanari -> eroare cu text, nu zero", () => {
  assert.ok(GP.fisa({ simbol: "T", pret: null, b15: b30, b4h: b4, b1d: b1, suma: 100, H: 2 }).eroare);
  assert.ok(GP.fisa({ simbol: "T", pret: 1, b15: [], b4h: b4, b1d: b1, suma: 100, H: 2 }).eroare);
});

await test("fisa: moneda cu 12 zile -> merge, dar verdictul maxim e asteapta si spune cate zile", () => {
  const b12 = b30.slice(-12 * 96);
  const f = GP.fisa({ simbol: "T", pret: b12[b12.length - 1].c, b15: b12, b4h: b4, b1d: b1, suma: 100, H: 2, dir: null, levier: null, minNotional: 1 });
  assert.ok(!f.eroare, f.eroare);
  assert.notEqual(f.verdict.nivel, "porneste");
  assert.ok(f.verdict.motive.some((m) => /12 zile/.test(m)), f.verdict.motive.join(" | "));
});


// --- app.js: ajutatoarele pure ale ferestrei (Review Focus 1 si 2) ---
const APP = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function scoateFunctia(nume) {
  const i = APP.indexOf("function " + nume + "(");
  if (i < 0) return null;
  let d = 0, j = APP.indexOf("{", i);
  for (let k = j; k < APP.length; k++) { if (APP[k] === "{") d++; else if (APP[k] === "}" && --d === 0) return APP.slice(i, k + 1); }
  return null;
}
await test("grSimbol: met / MET.PERP / METUSDT / MET_USDT_PERP -> MET_USDT_PERP; gol sau USDT -> null", () => {
  const src = scoateFunctia("grSimbol"); assert.ok(src, "grSimbol lipseste din app.js");
  const f = new Function(`${src}; return grSimbol;`)();
  for (const t of ["met", " MET.PERP ", "METUSDT", "MET_USDT_PERP", "met-usdt"]) assert.equal(f(t), "MET_USDT_PERP", t);
  assert.equal(f("1000pepe"), "1000PEPE_USDT_PERP");
  for (const t of ["", "  ", "USDT", null, undefined]) assert.equal(f(t), null, String(t));
});
await test("grNumar: 100,5 -> 100.5; gol / 0 / -3 / abc -> null (nu 0)", () => {
  const src = scoateFunctia("grNumar"); assert.ok(src, "grNumar lipseste din app.js");
  const f = new Function(`${src}; return grNumar;`)();
  assert.equal(f("100,5"), 100.5); assert.equal(f(" 250 "), 250);
  for (const t of ["", "0", "-3", "abc", null]) assert.equal(f(t), null, String(t));
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
