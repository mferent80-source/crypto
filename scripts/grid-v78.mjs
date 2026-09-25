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
  // suma 2 la 5x = 10 USDT; cu minim 6 pe ordin nici 2 grile nu incap -> suma necesara
  const f = GP.fisa({ simbol: "T", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 2, H: 2, dir: null, levier: 5, minNotional: 6 });
  assert.equal(f.verdict.nivel, "nu");
  assert.ok(f.sumaMinima > 2, `sumaMinima ${f.sumaMinima}`);
  assert.match(f.verdict.motive[0], /suma/i);
  // cu minim 5 incap exact 2 grile -> se reduc grilele, nu se cere suma (spec 6.4)
  const g = GP.fisa({ simbol: "T", pret: b30[b30.length - 1].c, b15: b30, b4h: b4, b1d: b1, suma: 2, H: 2, dir: null, levier: 5, minNotional: 5 });
  assert.equal(g.sumaMinima, null); assert.equal(g.setare.grile, 2); assert.ok(g.setare.redus);
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


// --- reparatiile dupa revizia finala (24.09) ---
await test("revizie 1: lichidari pe zilele nevazute -> verdict nu, cu motiv", () => {
  const v = GC.verdict({ regim: { r4h: 0.8, r24h: 0.9, miscare: false }, stat: { antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.002, lichidari: 3 } }, zile: 30, pozitie: 0.5 });
  assert.equal(v.nivel, "nu");
  assert.ok(v.motive.some((m) => /nevăzute.*lichidat/.test(m)), v.motive.join(" | "));
});

await test("revizie 8: nici 1x nu e sigur -> motivul spune ca intervalul e prea larg, nu 'levierul ales'", () => {
  const st = GC.construieste({ pret: 1, lat: 1.5, pas: 0.01, dir: "short", suma: 100 });
  assert.equal(st.sigur, false);
  const v = GC.verdict({ regim: { r4h: 0.8, r24h: 0.9, miscare: false }, stat: { antren: { mediana: 0.01, lichidari: 0 }, test: null }, zile: 30, pozitie: 0.5, pesteSigur: st.pesteSigur, nesigur: !st.sigur });
  assert.equal(v.nivel, "nu");
  assert.ok(v.motive.some((m) => /nici la 1×/.test(m)), v.motive.join(" | "));
  assert.ok(!v.motive.some((m) => /levierul ales/.test(m)));
});

await test("revizie 4: moneda cu 4 zile de istoric, orizont 1z -> eroare 'cel putin 7 zile', nu fisa", () => {
  const b4z = b30.slice(-4 * 96);
  const f = GP.fisa({ simbol: "T", pret: b4z[b4z.length - 1].c, b15: b4z, b4h: b4, b1d: b1, suma: 100, H: 1, dir: null, levier: null, minNotional: 1 });
  assert.ok(f.eroare && /7 zile/.test(f.eroare), JSON.stringify(f.eroare));
});

await test("revizie 2+5: cantitatea minima pe ordin (0,0001 BTC) reduce grilele ca sa incapa; daca nici 2 nu incap -> suma necesara", () => {
  const pret = 83671, bb = bareDin(aleator(30 * 96 + 1, 13, 0.003).map((x) => x * pret));
  // suma 5 la 5x = 25 USDT pe ~5 grile = 5 USDT pe ordin < 0,0001 BTC (~8,5 USDT) -> 2 grile
  const f = GP.fisa({ simbol: "BTC_USDT_PERP", pret, b15: bb, b4h: b4, b1d: b1, suma: 5, H: 2, dir: "long", levier: 5, minNotional: 1, minSize: 0.0001 });
  assert.ok(!f.eroare, f.eroare);
  assert.ok(f.setare.perOrdin >= 0.0001 * f.setare.sus - 1e-9, `pe ordin ${f.setare.perOrdin} < ${0.0001 * f.setare.sus}`);
  assert.ok(f.setare.redus && f.setare.redus.de > f.setare.grile, JSON.stringify(f.setare.redus));
  assert.notEqual(f.verdict.motive[0] && /suma/.test(f.verdict.motive[0]), true);
  const g = GP.fisa({ simbol: "BTC_USDT_PERP", pret, b15: bb, b4h: b4, b1d: b1, suma: 2, H: 2, dir: "long", levier: 5, minNotional: 1, minSize: 0.0001 });
  assert.equal(g.verdict.nivel, "nu");
  assert.ok(g.sumaMinima > 2 && /suma/i.test(g.verdict.motive[0]), `${g.sumaMinima} ${g.verdict.motive[0]}`);
});

await test("revizie 11: statisticile poarta iesirile medii din interval (pentru tabel)", () => {
  const p = GP.proba(b30, 2);
  assert.ok(typeof p.pe.neutru.antren.iesiriMedii === "number");
});

// --- app.js: ajutatoarele pure ale ferestrei (Review Focus 1 si 2) ---
const APP = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function scoateUna(nume) {
  const i = APP.indexOf("function " + nume + "(");
  if (i < 0) return null;
  let d = 0, j = APP.indexOf("{", i);
  for (let k = j; k < APP.length; k++) { if (APP[k] === "{") d++; else if (APP[k] === "}" && --d === 0) return APP.slice(i, k + 1); }
  return null;
}
// functia ceruta + ajutatoarele pure de care depinde (grZec/grFmt), ca sa ruleze in afara paginii
function scoateFunctia(nume) {
  const f = scoateUna(nume);
  if (!f) return null;
  const aj = ["grZec", "grFmt"].filter((n) => n !== nume && f.includes(n + "(")).map(scoateUna).filter(Boolean);
  return aj.concat([f]).join("\n");
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

await test("v78.1 grCodTV: randul pentru GRID-FISA (Pine) = dir;jos;sus;grile;levier;stopJos;stopSus;lichJos;lichSus, preturi la precizia monedei, lipsa = 0", () => {
  const src = scoateFunctia("grCodTV"); assert.ok(src, "grCodTV lipseste din app.js");
  const f = new Function(`${src}; return grCodTV;`)();
  const st = { dir: "long", jos: 0.311573, sus: 0.369651, grile: 8, levier: 4, stop: { jos: 0.298111, sus: 0.385609 }, lichidare: { jos: 0.246893, sus: null } };
  assert.equal(f(st, { quotePrecision: 4 }), "long;0.3116;0.3697;8;4;0.2981;0.3856;0.2469;0;0", "fara suma -> al 10-lea camp 0");
  const c = f({ dir: "short", jos: 82139.4, sus: 85969.2, grile: 7, levier: 5, stop: { jos: 81066.1, sus: 87092.9 }, lichidare: { jos: null, sus: 101234.5 } }, { quotePrecision: 1 });
  assert.equal(c, "short;82139.4;85969.2;7;5;0;87092.9;0;101234.5;0", "short: stopJos = 0");
  assert.equal(c.split(";").length, 10, "exact 10 campuri");
  assert.equal(f(st, null), "long;0.311573;0.369651;8;4;0.298111;0.385609;0.246893;0;0", "fara info: 6 zecimale sub 1");
});

await test("v78.2 grCodTV: precizia lipsa (null/\"\") NU inseamna 0 zecimale; preturi < 0,0001 pastreaza cifrele; short trimite stopJos=0; suma e al 10-lea camp", () => {
  const src = scoateFunctia("grCodTV"); assert.ok(src, "grCodTV lipseste din app.js");
  const f = new Function(`${src}; return grCodTV;`)();
  const st = { dir: "neutru", jos: 0.311573, sus: 0.369651, grile: 8, levier: 4, suma: 250, stop: { jos: 0.298111, sus: 0.385609 }, lichidare: { jos: 0.246893, sus: null } };
  const fara = f(st, null);
  assert.equal(f(st, { quotePrecision: null }), fara, "null -> ca fara info");
  assert.equal(f(st, { quotePrecision: "" }), fara, "\"\" -> ca fara info");
  assert.ok(!/;0;0\.|^neutru;0;/.test(f(st, { quotePrecision: null })), "nu 0 zecimale");
  assert.ok(fara.endsWith(";250"), fara);
  const mic = f({ dir: "long", jos: 0.00001234, sus: 0.00001300, grile: 5, levier: 2, suma: 50, stop: { jos: 0.00001200, sus: 0.00001350 }, lichidare: { jos: 0.00000900, sus: null } }, null);
  const c = mic.split(";"); assert.equal(c.length, 10, mic);
  assert.ok(Number(c[1]) < Number(c[2]) && Number(c[5]) < Number(c[1]) && Number(c[6]) > Number(c[2]), "ordinea pastrata la preturi mici: " + mic);
  assert.ok(Math.abs(Number(c[1]) - 0.00001234) < 1e-9, "jos pastreaza cifrele: " + c[1]);
  assert.ok(!/e/i.test(mic), "fara notatie stiintifica");
  const sh = f({ dir: "short", jos: 90, sus: 110, grile: 4, levier: 3, suma: 100, stop: { jos: 85, sus: 115 }, lichidare: { jos: null, sus: 140 } }, { quotePrecision: 2 });
  assert.equal(sh, "short;90.00;110.00;4;3;0;115.00;0;140.00;100", "short: stopJos = 0 (fisa nu-l arata)");
});

await test("v78.2 grPret: precizia null/\"\" -> zecimale dupa marime, nu 0", () => {
  const src = scoateFunctia("grPret"); assert.ok(src, "grPret lipseste din app.js");
  const f = new Function(`${src}; return grPret;`)();
  assert.equal(f(0.3348, { quotePrecision: null }), f(0.3348, null));
  assert.notEqual(f(0.3348, { quotePrecision: "" }), "0");
  assert.equal(f(0.3348, { quotePrecision: 4 }), "0.3348");
  assert.equal(f(0.3348, { quotePrecision: 0 }), "0", "0 explicit ramane 0 zecimale");
});

// --- F1: regimul pe orice TF + alerta "gata linistea" ---
await test("F1 regimPeBare: pe bare de 4h (k4=1, k24=6) - liniste -> fals; salt -> adevarat; sub 50 bare -> null", () => {
  const lin = aleator(500, 21, 0.01);
  for (let i = lin.length - 8; i < lin.length; i++) lin[i] = lin[i - 1] * (1 + 0.0005 * (i % 2 ? 1 : -1));   // ultimele 24h+: aproape plat
  const b = bareDin(lin);
  const r = GC.regimPeBare(b, 1, 6);
  assert.ok(r && typeof r.r4h === "number" && typeof r.r24h === "number", JSON.stringify(r));
  assert.equal(r.miscare, false, JSON.stringify(r));
  const inch = lin.slice(); inch[inch.length - 1] = inch[inch.length - 2] * 1.12;   // +12% in ultima bara de 4h
  assert.equal(GC.regimPeBare(bareDin(inch), 1, 6).miscare, true);
  assert.equal(GC.regimPeBare(b.slice(0, 40), 1, 6), null);
  // regim() pe 15M = regimPeBare(b, 16, 96)
  const b15 = bareDin(aleator(30 * 96, 3, 0.004));
  assert.deepEqual(GC.regim(b15), GC.regimPeBare(b15, 16, 96));
});

const ALERTE = fs.readFileSync(new URL("../public/lib/alerte.js", import.meta.url), "utf8");
const AL = new Function(`${ALERTE}; return Alerte;`)();
await test("F1 Alerte: miscare mare (>2x) -> atentie o data, text despre INTRARE (nu porunca de oprire); ramane pana sub 1,5x; se repeta cel mult o data pe zi; 'liniste din nou' dupa 10 min", () => {
  const bot = { id: "b1", baza: "MET.PERP", quote: "USDT", directie: "long", activ: true };
  const T0 = 1_780_000_000_000;
  // 1,8x nu e destul (pe 4h zgomotul trece de 1,5x in ~8% din bare)
  let r0 = AL.evalueaza(bot, { regim: { r4h: 1.8, r24h: 1.1, miscare: true } }, {}, T0);
  assert.equal(r0.mesaje.filter((m) => m.cheie === "miscare").length, 0);
  let r = AL.evalueaza(bot, { regim: { r4h: 2.2, r24h: 1.1, miscare: true } }, {}, T0);
  assert.equal(r.mesaje.filter((m) => m.cheie === "miscare").length, 1);
  const m0 = r.mesaje.find((m) => m.cheie === "miscare");
  assert.match(m0.titlu, /mișcare mare/); assert.match(m0.mesaj, /NU porni grid nou/); assert.ok(!/oprește gridul/.test(m0.titlu));
  // 1,7x: intre praguri -> ramane in alerta, fara mesaj nou; la 3h tot nimic (se repeta doar la 24h)
  r = AL.evalueaza(bot, { regim: { r4h: 1.7, r24h: 1.0, miscare: false } }, r.stare, T0 + 60000);
  assert.equal(r.mesaje.length, 0); assert.equal(r.stare.miscare.nivel, "atentie");
  r = AL.evalueaza(bot, { regim: { r4h: 2.5, r24h: 1.0, miscare: true } }, r.stare, T0 + 4 * 3600000);
  assert.equal(r.mesaje.filter((m) => m.cheie === "miscare").length, 0, "la 4 h nu se repeta");
  r = AL.evalueaza(bot, { regim: { r4h: 2.5, r24h: 1.0, miscare: true } }, r.stare, T0 + 25 * 3600000);
  assert.equal(r.mesaje.filter((m) => m.cheie === "miscare").length, 1, "la 25 h se repeta o data");
  // 1,2x: iese; "a trecut" doar dupa 10 minute stabile
  r = AL.evalueaza(bot, { regim: { r4h: 1.2, r24h: 1.0, miscare: false } }, r.stare, T0 + 120000);
  assert.equal(r.mesaje.length, 0);
  r = AL.evalueaza(bot, { regim: { r4h: 1.2, r24h: 1.0, miscare: false } }, r.stare, T0 + 13 * 60000);
  assert.equal(r.mesaje.filter((m) => m.cheie === "miscare").length, 1);
  assert.equal(r.stare.miscare.nivel, "ok");
  // fara regim (lumanari picate): starea ramane, nimic nou
  const r2 = AL.evalueaza(bot, { regim: null }, r.stare, T0 + 14 * 60000);
  assert.equal(r2.mesaje.length, 0);
});

// --- F4: cat investesc? ---
await test("F4 sumaMaxima: sold 1000, pierdere acceptata 5%, cea mai proasta fereastra -40% -> 125 USDT; fara date -> null; cea mai proasta >= 0 -> null (nu infinit)", () => {
  aprox(GP.sumaMaxima(1000, 5, -0.40), 125, 1e-9);
  aprox(GP.sumaMaxima(486.05, 10, -0.2246), 216.4, 0.1);
  assert.equal(GP.sumaMaxima(1000, 5, null), null);
  assert.equal(GP.sumaMaxima(null, 5, -0.4), null);
  assert.equal(GP.sumaMaxima(1000, 0, -0.4), null);
  assert.equal(GP.sumaMaxima(1000, 5, 0.02), null, "nicio fereastra pe minus -> nu se poate socoti (nu infinit)");
});

// --- F2: jurnalul gridurilor ---
const JUR_SRC = fs.existsSync(new URL("../public/lib/grid-jurnal.js", import.meta.url)) ? fs.readFileSync(new URL("../public/lib/grid-jurnal.js", import.meta.url), "utf8") : "";
const GJ = JUR_SRC ? new Function(`${JUR_SRC}; return GridJurnal;`)() : null;
await test("F2 modulul GridJurnal exista", () => assert.ok(GJ, "grid-jurnal.js lipseste"));
const T0 = 1_790_000_000_000, ORA = 3600000;
function fisaFalsa(over) {
  return Object.assign({ simbol: "MET_USDT_PERP", dir: "long", H: 2, pret: 0.3348,
    setare: { jos: 0.3116, sus: 0.3697, grile: 8, levier: 4, suma: 100 },
    verdict: { nivel: "porneste", motive: [] },
    proba: { pe: { long: { antren: { mediana: 0.102, ceaMaiProasta: -0.40, lichidari: 0 }, test: { mediana: 0.156 } } }, recomandata: "long" } }, over || {});
}
await test("F2 adauga: intrarea poarta fisa (setare, verdict, mediana, cea mai proasta), fara bot legat", () => {
  const l = GJ.adauga([], fisaFalsa(), T0);
  assert.equal(l.length, 1);
  const e = l[0];
  assert.equal(e.simbol, "MET_USDT_PERP"); assert.equal(e.verdict, "porneste"); assert.equal(e.suma, 100);
  aprox(e.mediana, 0.102, 1e-9); aprox(e.ceaMaiProasta, -0.40, 1e-9);
  assert.equal(e.botId, null); assert.equal(e.rezultat, null); assert.ok(e.id && e.t === T0);
  // a doua adaugare pe aceeasi moneda in 10 minute o inlocuieste pe prima (a apasat de doua ori)
  const l2 = GJ.adauga(l, fisaFalsa({ setare: { jos: 0.31, sus: 0.37, grile: 9, levier: 4, suma: 120 } }), T0 + 5 * 60000);
  assert.equal(l2.length, 1); assert.equal(l2[0].suma, 120);
});
await test("F2 leaga: botul cu aceeasi moneda, pornit intre t-6h si t+12h, se leaga o singura data; altul nu", () => {
  const l = GJ.adauga([], fisaFalsa(), T0);
  const boti = [
    { id: "77", baza: "COTI.PERP", quote: "USDT", activ: true, pornitLa: T0 + ORA, investit: 100, profitTotal: 3 },
    { id: "88", baza: "MET.PERP", quote: "USDT", activ: true, pornitLa: T0 + 2 * ORA, investit: 100, profitTotal: 1.5 },
  ];
  const l2 = GJ.actualizeaza(l, boti, T0 + 3 * ORA);
  assert.equal(l2[0].botId, "88");
  assert.equal(l2[0].rezultat, 1.5); assert.equal(l2[0].investit, 100); assert.equal(l2[0].activ, true); assert.equal(l2[0].inchisLa, null);
  // bot pornit cu 2 zile inainte de fisa -> nu e al fisei
  const l3 = GJ.actualizeaza(GJ.adauga([], fisaFalsa(), T0), [{ id: "99", baza: "MET.PERP", activ: true, pornitLa: T0 - 48 * ORA }], T0 + ORA);
  assert.equal(l3[0].botId, null);
  // un bot deja legat de alta intrare nu se leaga a doua oara
  const l4 = GJ.actualizeaza(GJ.adauga(l2, fisaFalsa({ simbol: "MET_USDT_PERP" }), T0 + 4 * ORA), boti, T0 + 5 * ORA);
  assert.equal(l4.filter((e) => e.botId === "88").length, 1);
});
await test("F2 actualizeaza: botul legat dispare din lista -> inchisLa se pune, rezultatul ramane ultimul; botul inactiv din lista -> activ false", () => {
  let l = GJ.actualizeaza(GJ.adauga([], fisaFalsa(), T0), [{ id: "88", baza: "MET.PERP", activ: true, pornitLa: T0 + ORA, investit: 100, profitTotal: 2.2 }], T0 + 2 * ORA);
  l = GJ.actualizeaza(l, [], T0 + 10 * ORA);
  assert.equal(l[0].inchisLa, T0 + 10 * ORA); assert.equal(l[0].rezultat, 2.2); assert.equal(l[0].activ, false);
  l = GJ.actualizeaza(GJ.adauga([], fisaFalsa(), T0), [{ id: "88", baza: "MET.PERP", activ: false, inchisLa: T0 + 9 * ORA, pornitLa: T0 + ORA, investit: 100, profitTotal: -4 }], T0 + 10 * ORA);
  assert.equal(l[0].activ, false); assert.equal(l[0].inchisLa, T0 + 9 * ORA); assert.equal(l[0].rezultat, -4);
  // lista de boti null (citire picata) -> nimic nu se schimba, nimic nu se inchide
  const l5 = GJ.actualizeaza(l, null, T0 + 11 * ORA);
  assert.deepEqual(l5, l);
});
await test("F2 rezumat: pe verdict - cate, cate legate, media rezultatului in % din investit, cate pe plus; intrarile nelegate nu intra in medie", () => {
  let l = GJ.adauga([], fisaFalsa(), T0);
  l = GJ.adauga(l, fisaFalsa({ simbol: "BTC_USDT_PERP", verdict: { nivel: "asteapta" } }), T0 + ORA);
  l = GJ.adauga(l, fisaFalsa({ simbol: "SOL_USDT_PERP" }), T0 + 2 * ORA);
  l = GJ.actualizeaza(l, [
    { id: "1", baza: "MET.PERP", activ: false, pornitLa: T0 + ORA, investit: 100, profitTotal: 10 },
    { id: "2", baza: "SOL.PERP", activ: true, pornitLa: T0 + 3 * ORA, investit: 200, profitTotal: -10 },
  ], T0 + 4 * ORA);
  const r = GJ.rezumat(l);
  assert.equal(r.porneste.n, 2); assert.equal(r.porneste.legate, 2); aprox(r.porneste.mediaPct, (0.10 - 0.05) / 2, 1e-9); assert.equal(r.porneste.pePlus, 1);
  assert.equal(r.asteapta.n, 1); assert.equal(r.asteapta.legate, 0); assert.equal(r.asteapta.mediaPct, null);
  assert.equal(r.total, 3);
});
await test("F2 citeste: JSON stricat sau ne-lista -> lista goala, nu crapa", () => {
  assert.deepEqual(GJ.citeste("{nu e json"), []); assert.deepEqual(GJ.citeste(JSON.stringify({ a: 1 })), []); assert.deepEqual(GJ.citeste(null), []);
  assert.equal(GJ.citeste(JSON.stringify([{ id: "x", t: T0, simbol: "A" }, null, "gunoi"])).length, 1);
});

// --- F5: grile / directie din umplerile reale ---
const UMP_SRC = fs.existsSync(new URL("../public/lib/grid-umpleri.js", import.meta.url)) ? fs.readFileSync(new URL("../public/lib/grid-umpleri.js", import.meta.url), "utf8") : "";
const GU = UMP_SRC ? new Function(`${SRC}; ${UMP_SRC}; return GridUmpleri;`)() : null;
await test("F5 modulul GridUmpleri exista", () => assert.ok(GU, "grid-umpleri.js lipseste"));
const U0 = 1_790_000_000_000;
const ump = (t, side, price, size, fee, feeCoin) => ({ id: String(t), symbol: "MET_USDT_PERP", side, price: String(price), size: String(size), fee: String(fee == null ? 0 : fee), feeCoin: feeCoin || "USDT", timestamp: U0 + t * 60000 });
await test("F5 citeste: umplerile Pionex (size/price/side/fee/timestamp) -> forma interna; randuri stricate sarite; comisionul in moneda de baza -> in USDT", () => {
  const r = GU.citeste([ump(1, "BUY", 100, 2, 0.1), ump(2, "SELL", 104, 2, 0.002, "MET"), { id: "x" }, null, ump(3, "BUY", "abc", 1, 0)]);
  assert.equal(r.length, 2);
  assert.equal(r[0].side, "BUY"); assert.equal(r[0].pret, 100); assert.equal(r[0].cant, 2); assert.equal(r[0].fee, 0.1); assert.equal(r[0].t, U0 + 60000);
  aprox(r[1].fee, 0.002 * 104, 1e-9, "fee in MET -> USDT");
});
await test("F5 imparte: long 90-110 / 4 grile, socotit de mana - grile +12,17, directie realizat +11,55 + nerealizat +12,50, comisioane 0,40", () => {
  // niveluri 90 / 94,630 / 99,499 / 104,618 / 110. q = 2,5 monede pe celula.
  // pornire la 100: cumpara 2 celule (cele de deasupra) la piata 100 (nu e nivel -> directie)
  // apoi grid: cumpara la 94,630 (nivel), vinde la 99,499 -> grile: 2,5 x 4,869 = 12,17
  // apoi urca: vinde la 104,618 o celula de la pornire -> directie realizat: 2,5 x 4,618 = 11,55
  // pret acum 105: ramane 1 celula de la pornire, 2,5 x (105 - 100) = 12,50 nerealizat (directie)
  const grid = { jos: 90, sus: 110, grile: 4, dir: "long", pornitLa: U0 };
  const f = [ump(1, "BUY", 100, 5, 0.1), ump(10, "BUY", 94.630, 2.5, 0.1), ump(20, "SELL", 99.499, 2.5, 0.1), ump(30, "SELL", 104.618, 2.5, 0.1)];
  const r = GU.imparte(GU.citeste(f), grid, 105);
  aprox(r.grile, 12.1725, 0.01, "grile"); aprox(r.directieRealizat, 11.545, 0.01, "directie realizat"); aprox(r.nerealizat, 12.5, 1e-6, "nerealizat");
  aprox(r.comisioane, 0.4, 1e-9); assert.equal(r.umpleri, 4); aprox(r.pozitie.cant, 2.5, 1e-9); aprox(r.pozitie.medie, 100, 1e-9);
  aprox(r.total, 12.1725 + 11.545 + 12.5 - 0.4, 0.02, "total = grile + directie + nerealizat - comisioane");
});
await test("F5 imparte: short e oglinda (vinde la pornire, cumpara inapoi la nivel); umplerile de dinainte de pornire se ignora; fara umpleri -> zerouri cu n=0", () => {
  const grid = { jos: 90, sus: 110, grile: 4, dir: "short", pornitLa: U0 };
  const f = [ump(-5, "BUY", 100, 9, 0.1), ump(1, "SELL", 100, 5, 0.1), ump(10, "SELL", 104.618, 2.5, 0.1), ump(20, "BUY", 99.499, 2.5, 0.1)];
  const r = GU.imparte(GU.citeste(f), grid, 100);
  assert.equal(r.umpleri, 3);
  aprox(r.grile, 2.5 * (104.618 - 99.499), 0.01, "grile short"); aprox(r.directieRealizat, 0, 1e-9); aprox(r.nerealizat, 0, 1e-9); aprox(r.pozitie.cant, -5, 1e-9);
  const g = GU.imparte([], grid, 100);
  assert.equal(g.umpleri, 0); assert.equal(g.grile, 0); assert.equal(g.nerealizat, 0);
});
await test("F5 citeste: aceeasi umplere in doua pagini se tine o data", () => {
  const r = GU.citeste([ump(1, "BUY", 100, 2, 0), ump(1, "BUY", 100, 2, 0), ump(2, "SELL", 101, 2, 0)]);
  assert.equal(r.length, 2);
});
await test("F5 imparte: grid ARITMETIC (ca botul lui real: 0,30-0,40, 93 grile) - umplerile cad pe niveluri si se impart; modul se recunoaste si pe 'auto'", () => {
  const grid = { jos: 0.30, sus: 0.40, grile: 10, dir: "long", pornitLa: U0, mod: "aritmetic" };   // pas 0,01
  const f = [ump(1, "BUY", 0.355, 5, 0), ump(10, "BUY", 0.34, 1, 0), ump(20, "SELL", 0.35, 1, 0), ump(30, "BUY", 0.33, 1, 0), ump(40, "SELL", 0.34, 1, 0), ump(50, "SELL", 0.36, 1, 0)];
  const r = GU.imparte(GU.citeste(f), grid, 0.35);
  assert.equal(r.motiv, null, r.motiv); assert.equal(r.mod, "aritmetic");
  aprox(r.grile, 0.02, 1e-9, "doua perechi de grid a 0,01"); aprox(r.directieRealizat, 0.005, 1e-9, "o celula de la pornire vanduta la 0,36");
  const auto = GU.imparte(GU.citeste(f), Object.assign({}, grid, { mod: "auto" }), 0.35);
  assert.equal(auto.mod, "aritmetic"); aprox(auto.grile, 0.02, 1e-9);
});
await test("F5 imparte: refuza cinstit - istoric trunchiat; long fara intrarea de la pornire; umpleri care nu cad pe niveluri; pret lipsa -> nerealizat null, nu 0", () => {
  const grid = { jos: 90, sus: 110, grile: 4, dir: "long", pornitLa: U0, mod: "geometric" };
  assert.match(GU.imparte(GU.citeste([ump(1, "BUY", 100, 5, 0)]), Object.assign({}, grid, { trunchiat: true }), 100).motiv, /trunchiat/);
  assert.match(GU.imparte(GU.citeste([ump(10, "SELL", 99.499, 2.5, 0), ump(20, "SELL", 104.618, 2.5, 0)]), grid, 100).motiv, /intrarea de la pornire/);
  const stramb = GU.imparte(GU.citeste([ump(1, "BUY", 100, 5, 0), ump(10, "BUY", 97, 1, 0), ump(20, "SELL", 101, 1, 0), ump(30, "BUY", 96, 1, 0), ump(40, "SELL", 102.7, 1, 0)]), grid, 100);
  assert.match(stramb.motiv, /nu cad pe nivelurile/);
  const r = GU.imparte(GU.citeste([ump(1, "BUY", 100, 5, 0)]), grid, null);
  assert.strictEqual(r.nerealizat, null); assert.strictEqual(r.total, null); assert.equal(r.motiv, null);
});
await test("F5 imparte: neutru - o vanzare inchide intai celulele long tinute, restul deschide short", () => {
  const grid = { jos: 90, sus: 110, grile: 4, dir: "neutru", pornitLa: U0 };
  const f = [ump(10, "BUY", 94.630, 2.5, 0), ump(20, "SELL", 99.499, 5, 0)];   // 2,5 inchid long-ul, 2,5 deschid short (dupa primele 2 min = nu e pozitie de pornire)
  const r = GU.imparte(GU.citeste(f), grid, 99);
  aprox(r.grile, 2.5 * (99.499 - 94.630), 1e-6); aprox(r.pozitie.cant, -2.5, 1e-9); aprox(r.nerealizat, 2.5 * (99.499 - 99), 1e-6);
});

// --- F3: clasamentul "pe care monede pornesc grid acum?" ---
const CL_SRC = fs.existsSync(new URL("../public/lib/grid-clasament.js", import.meta.url)) ? fs.readFileSync(new URL("../public/lib/grid-clasament.js", import.meta.url), "utf8") : "";
const GCL = CL_SRC ? new Function(`${SRC}; ${CL_SRC}; return GridClasament;`)() : null;
await test("F3 modulul GridClasament exista", () => assert.ok(GCL, "grid-clasament.js lipseste"));
await test("F3 judeca: pe bare de 4h - regim, latimea p75 pe 2 zile, directia, pasul, verdictul EVITA/CANDIDAT/FARA-DATE", () => {
  const lin = aleator(500, 31, 0.012); for (let i = lin.length - 8; i < lin.length; i++) lin[i] = lin[i - 1] * (1 + 0.0005 * (i % 2 ? 1 : -1));
  const b = bareDin(lin, 0.004);
  const j = GCL.judeca("MET_USDT_PERP", b, 1234567);
  assert.equal(j.simbol, "MET_USDT_PERP"); assert.equal(j.volum, 1234567);
  assert.ok(j.regim && j.regim.miscare === false, JSON.stringify(j.regim));
  assert.ok(j.latime > 0 && j.latime < 1, "latimea " + j.latime);
  assert.ok(["long", "neutru", "short"].includes(j.dir));
  assert.ok(j.grile >= 2 && j.pas >= 0.0035, JSON.stringify({ g: j.grile, p: j.pas }));
  assert.equal(j.stare, "candidat");
  aprox(j.scor, j.profitGrila * j.traversariZi / j.grile, 1e-12, "scorul e pe investitie (impartit la grile)");
  assert.ok(j.scor < 0.02, "un grid nu aduce peste 2%/zi pe investitie in liniste: " + j.scor);
  const salt = lin.slice(); salt[salt.length - 1] = salt[salt.length - 2] * 1.15;
  assert.equal(GCL.judeca("X", bareDin(salt, 0.004), 1).stare, "evita");
  const f = GCL.judeca("Y", b.slice(0, 30), 1);
  assert.equal(f.stare, "fara-date"); assert.equal(f.latime, null);
});
await test("F3 ordoneaza: de EVITAT primele (dupa miscare), apoi candidatii dupa profit pe grila x umpleri/zi estimate, fara-date la coada", () => {
  const c = (simbol, stare, scor, r) => ({ simbol, stare, scor, regim: r ? { r4h: r, r24h: 1 } : null });
  const l = GCL.ordoneaza([c("A", "candidat", 0.5), c("B", "evita", 0, 3.1), c("C", "fara-date", null), c("D", "candidat", 0.9), c("E", "evita", 0, 1.7)]);
  assert.deepEqual(l.map((x) => x.simbol), ["B", "E", "D", "A", "C"]);
});
await test("F3 topDupaVolum: doar _USDT_PERP, dupa amount descrescator, volum lipsa/0 = afara (nu 0), taiat la n", () => {
  const t = [{ symbol: "A_USDT_PERP", amount: "10" }, { symbol: "B_USDT", amount: "99" }, { symbol: "C_USDT_PERP", amount: "30" }, { symbol: "D_USDT_PERP" }, { symbol: "E_USDT_PERP", amount: "0" }, null, { symbol: "F_USDT_PERP", amount: "20" }];
  assert.deepEqual(GCL.topDupaVolum(t, 2).map((x) => x.simbol), ["C_USDT_PERP", "F_USDT_PERP"]);
  assert.equal(GCL.topDupaVolum(t, 10).length, 3);
  assert.deepEqual(GCL.topDupaVolum(null, 5), []);
});
await test("F3 rezumat: cate de evitat / candidati / fara date + ora socotirii", () => {
  const r = GCL.rezumat({ la: 1_790_000_000_000, monede: [{ stare: "evita" }, { stare: "candidat" }, { stare: "candidat" }, { stare: "fara-date" }] });
  assert.equal(r.evita, 1); assert.equal(r.candidati, 2); assert.equal(r.faraDate, 1); assert.equal(r.la, 1_790_000_000_000);
});

// --- v79.1: fara ntfy + cele 5 amanate ---
await test("v79.1 GridCalcul.agrega: 6 bare de 4h -> o bara de 1z (o/h/l/c corecte, aliniate pe zi UTC); ziua in formare la coada se pastreaza", () => {
  const T = 1_790_000_000_000 - (1_790_000_000_000 % 86400000);   // miezul noptii UTC
  const b = [];
  for (let i = 0; i < 14; i++) b.push({ t: T + i * 4 * 3600000, o: 100 + i, h: 110 + i, l: 90 + i, c: 101 + i });
  const z = GC.agrega(b, 86400000);
  assert.equal(z.length, 3, "2 zile intregi + 2 bare din a treia");
  assert.deepEqual([z[0].o, z[0].h, z[0].l, z[0].c, z[0].t], [100, 115, 90, 106, T]);
  assert.deepEqual([z[1].o, z[1].c], [106, 112]);
  assert.deepEqual(GC.agrega([], 86400000), []);
});
await test("v79.1 GridCalcul.imbinaRanduri: randuri Pionex vechi + noi -> fara dubluri, crescator, taiat la n", () => {
  const r = (t) => ({ time: t, open: "1", high: "1", low: "1", close: "1" });
  const v = [r(1), r(2), r(3)], n = [r(3), r(4), r(2)];
  assert.deepEqual(GC.imbinaRanduri(v, n, 10).map((x) => x.time), [1, 2, 3, 4]);
  assert.deepEqual(GC.imbinaRanduri(v, n, 2).map((x) => x.time), [3, 4], "se tin cele mai noi");
  assert.deepEqual(GC.imbinaRanduri(null, n, 10).map((x) => x.time), [2, 3, 4]);
});
await test("v79.1 F2 leaga DOAR boti de acelasi fel: fisa PERP nu se leaga de un bot spot pe aceeasi moneda", () => {
  const l = GJ.adauga([], fisaFalsa(), T0);
  const spot = [{ id: "s1", baza: "MET", quote: "USDT", activ: true, pornitLa: T0 + ORA, investit: 100, profitTotal: 1 }];
  assert.equal(GJ.actualizeaza(l, spot, T0 + 2 * ORA)[0].botId, null);
  const perp = [{ id: "p1", baza: "MET.PERP", quote: "USDT", activ: true, pornitLa: T0 + ORA, investit: 100, profitTotal: 1 }];
  assert.equal(GJ.actualizeaza(l, perp, T0 + 2 * ORA)[0].botId, "p1");
});
await test("v79.1 F3 judeca foloseste si directia pe 1z (agregata din 4h) - motivele au si '1z:'", () => {
  const lin = aleator(500, 31, 0.012); for (let i = lin.length - 8; i < lin.length; i++) lin[i] = lin[i - 1] * (1 + 0.0005 * (i % 2 ? 1 : -1));
  const T = 1_790_000_000_000 - (1_790_000_000_000 % 86400000);
  const b = lin.map((c, i) => { const o = i ? lin[i - 1] : c; return { t: T + i * 4 * 3600000, o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c }; });
  const j = GCL.judeca("X", b, 1);
  assert.ok(Array.isArray(j.motive) && j.motive.some((m) => /^1z:/.test(m)) && !j.motive.some((m) => /prea puține/.test(m)), JSON.stringify(j.motive));
});

// --- v79.3: "linistea de acum, cat mai tine?" - frecventa din perioadele de liniste ale monedei ---
// serie sintetica: blocuri linistite de L bare (zgomot mic) despartite de o bara cu salt de 12%;
// la coada, o liniste de 150 de bare (starea de acum).
// Blocurile linistite sunt DETERMINISTE (deriva constanta de 0,01%/bara => miscarea pe 24 h e
// mereu ~0,96%, adica exact 1x obisnuitul): pe un mers aleator miscarea pe 24 h trece de 1,5x
// in ~8% din bare, in grupuri, si ar rupe perioadele la intamplare - testul ar masura norocul,
// nu logica. Saltul de 12% e singura "miscare".
function serieLiniste(L, blocuri, coada) {
  const out = []; let p = 1;
  for (let b = 0; b < blocuri; b++) { for (let i = 0; i < L; i++) { p *= 1.0001; out.push(p); } p *= 1.12; out.push(p); }
  for (let i = 0; i < coada; i++) { p *= 1.0001; out.push(p); }
  return bareDin(out, 0.0005);
}
// Atentie la date: dupa un salt, miscarea pe 24 h ramane mare 96 de bare; daca barele "dupa salt"
// trec de 25% din serie, percentila 75 devine chiar nivelul saltului si nimic nu mai e "miscare"
// (definitia e "fata de obisnuitul monedei"). De aceea blocurile sunt lungi si coada de 300.
await test("v79.3 linisteTine: perioade lungi (600 bare) -> linistea de acum (300-96 bare) a mai tinut 2 zile in aproape toate cazurile; perioade de 400 -> in niciunul; prea putine perioade -> nesuficient", () => {
  const lung = GC.linisteTine(serieLiniste(600, 5, 300), 2);
  assert.ok(lung && lung.n >= 4, JSON.stringify(lung));
  assert.equal(lung.p, 1, "toate perioadele de 600 au tinut: " + JSON.stringify(lung));
  assert.ok(lung.ic[0] <= lung.p && lung.ic[1] >= lung.p && lung.ic[0] >= 0 && lung.ic[1] <= 1);
  aprox(lung.zileLiniste, (300 - 96) / 96, 0.15, "linistea de acum: 300 de bare de la salt, minus cele 96 in care miscarea pe 24 h e inca mare");
  const scurt = GC.linisteTine(serieLiniste(400, 7, 300), 2);
  assert.ok(scurt && scurt.n >= 4, JSON.stringify(scurt));
  assert.equal(scurt.k, 0); assert.equal(scurt.p, 0);
  const putine = GC.linisteTine(serieLiniste(600, 2, 300), 2);
  assert.equal(putine.suficient, false);
  assert.equal(GC.linisteTine(serieLiniste(600, 5, 300).slice(0, 100), 2), null, "sub 2 zile de istoric -> null");
});
await test("v79.3 linisteTine: daca ACUM e miscare, nu e nimic de intrebat (linisteAcum=false)", () => {
  const b = serieLiniste(500, 4, 5);   // saltul e cu 5 bare in urma -> r4h inca mare
  const r = GC.linisteTine(b, 2);
  assert.equal(r.linisteAcum, false);
});
await test("v79.3 fisa poarta 'liniste' (n, k, p, ic, zileLiniste) pentru orizontul ales", () => {
  const b = serieLiniste(600, 5, 300);
  const f = GP.fisa({ simbol: "T", pret: b[b.length - 1].c, b15: b, b4h: b4, b1d: b1, suma: 100, H: 2, dir: null, levier: null, minNotional: 1 });
  assert.ok(f.liniste && typeof f.liniste.p === "number" && f.liniste.n >= 4, JSON.stringify(f.liniste));
});

// --- v79.4: calibrarea din jurnal (invata din rezultatele LUI, nu din istoric) ---
function jurnalSintetic(n, regula) {
  let l = [];
  for (let i = 0; i < n; i++) {
    const med = 0.001 + (i % 10) * 0.002;            // 0,1% ... 1,9%
    const e = { id: "e" + i, t: T0 + i * ORA, simbol: "M" + i + "_USDT_PERP", verdict: med > 0.003 ? "porneste" : "asteapta", suma: 100, mediana: med, ceaMaiProasta: -0.2, botId: "b" + i, investit: 100, rezultat: regula(med, i), activ: false, inchisLa: T0 + i * ORA + 5 };
    l.push(e);
  }
  return l;
}
await test("v79.4 calibrare: sub 30 de boti inchisi -> nu propune nimic, spune cati mai trebuie", () => {
  const c = GJ.calibrare(jurnalSintetic(12, (m) => (m > 0.01 ? 2 : -2)), 0.003);
  assert.equal(c.suficient, false); assert.equal(c.n, 12); assert.equal(c.lipsa, 18); assert.equal(c.propus, null);
});
await test("v79.4 calibrare: cand doar mediana > 1% a adus bani, pragul propus urca peste 1% si se verifica pe ultima treime (nevazuta)", () => {
  const c = GJ.calibrare(jurnalSintetic(60, (m) => (m > 0.01 ? 3 : -2)), 0.003);
  assert.equal(c.suficient, true);
  assert.ok(c.propus > 0.01 && c.propus < 0.02, "propus " + c.propus);
  assert.ok(c.test && c.test.cuPropus.pePlus > c.test.cuActual.pePlus, JSON.stringify(c.test));
  assert.equal(c.confirmat, true);
});
await test("v79.4 calibrare: cand rezultatul NU depinde de mediana (zgomot) -> nu se confirma nimic, pragul ramane", () => {
  const c = GJ.calibrare(jurnalSintetic(60, (m, i) => ((i * 7919) % 13 < 6 ? 2 : -2)), 0.003);
  assert.equal(c.suficient, true); assert.equal(c.confirmat, false);
});
await test("v79.4 calibrare: pe verdict - cate, % pe plus cu IC Wilson; boti nelegati sau inca activi nu intra", () => {
  const l = jurnalSintetic(40, (m) => (m > 0.003 ? 1 : -1));
  l.push({ id: "x", t: T0, simbol: "X_USDT_PERP", verdict: "porneste", suma: 100, mediana: 0.02, botId: null, rezultat: null, activ: null });
  l.push({ id: "y", t: T0, simbol: "Y_USDT_PERP", verdict: "porneste", suma: 100, mediana: 0.02, botId: "q", rezultat: 5, activ: true, inchisLa: null });
  const c = GJ.calibrare(l, 0.003);
  assert.equal(c.n, 40);
  const p = c.peVerdict.porneste;
  assert.equal(p.n, 32, "mediane > 0,3%: 8 din 10"); assert.equal(p.pePlus, 32); assert.ok(p.ic[0] > 0.85 && p.ic[1] === 1);
});

// --- v79.5: laboratorul de reguli pe grid ---
const LAB_SRC = fs.existsSync(new URL("../public/lib/grid-laborator.js", import.meta.url)) ? fs.readFileSync(new URL("../public/lib/grid-laborator.js", import.meta.url), "utf8") : "";
const GL = LAB_SRC ? new Function(`${SRC}; ${LAB_SRC}; return GridLaborator;`)() : null;
await test("v79.5 modulul GridLaborator exista", () => assert.ok(GL, "grid-laborator.js lipseste"));
await test("v79.5 ferestre: fiecare fereastra are net + conditii stiute LA START (schimbarea barelor de dupa start nu le schimba), parte a/t fara suprapunere", () => {
  const b = bareDin(aleator(30 * 96 + 1, 41, 0.004));
  const r = GL.ferestre(b, 2);
  assert.ok(r.length > 60, "ferestre " + r.length);
  // pe partea NEVAZUTA ("t") pragurile vin doar din primele 2/3 => nimic din viitor. (Pe partea de
  // alegere "a", "obisnuitul" e potrivit pe aceleasi 20 de zile - de aceea verdictul cere acord pe "t".)
  const f = r.filter((x) => x.parte === "t")[3];
  for (const k of ["s", "net", "miscare", "linisteZile", "margine", "parte"]) assert.ok(k in f, k);
  assert.ok(r.every((x) => x.parte === "a" || x.parte === "t"));
  const nA = Math.round(b.length * 2 / 3);
  assert.ok(r.filter((x) => x.parte === "a").every((x) => x.s + 192 <= nA) && r.filter((x) => x.parte === "t").every((x) => x.s >= nA));
  // fara privire in viitor: stric TOT ce vine dupa startul ferestrei f -> conditiile ei raman aceleasi
  const b2 = b.map((x, i) => i >= f.s ? { t: x.t, o: x.o * 3, h: x.h * 3, l: x.l * 3, c: x.c * 3 } : x);
  const g = GL.ferestre(b2, 2).find((x) => x.s === f.s);
  assert.deepEqual([g.miscare, g.linisteZile, g.margine], [f.miscare, f.linisteZile, f.margine]);
});
const rand = (parte, net, cond) => Object.assign({ parte, net, miscare: false, linisteZile: 0, margine: false }, cond);
await test("v79.5 compara: efect real si stabil in ambele parti -> DOVEDIT; semn schimbat -> CONTRAZIS; putine/amestecate -> N-AM AFLAT; n efectiv = ferestre / 8", () => {
  let rows = [];
  for (let i = 0; i < 400; i++) rows.push(rand(i < 260 ? "a" : "t", (i % 10 < 8 ? -0.01 : 0.01), { miscare: true }), rand(i < 260 ? "a" : "t", (i % 10 < 2 ? -0.01 : 0.01), { miscare: false }));
  const c = GL.compara(rows, (x) => x.miscare, (x) => !x.miscare, 2);
  assert.equal(c.verdict, "dovedit"); assert.ok(c.A.pePlus < c.B.pePlus); assert.equal(c.A.nEf, Math.floor(400 / 8));
  const rows2 = rows.map((x) => x.parte === "t" ? Object.assign({}, x, { miscare: !x.miscare }) : x);
  assert.equal(GL.compara(rows2, (x) => x.miscare, (x) => !x.miscare, 2).verdict, "contrazis");
  const putine = rows.slice(0, 30);
  assert.equal(GL.compara(putine, (x) => x.miscare, (x) => !x.miscare, 2).verdict, "n-am-aflat");
});
await test("v79.5 intrebari: 3 intrebari cu titlu, grupe A/B si verdict; pe mers aleator nimic nu iese 'dovedit' din intamplare", () => {
  let rows = [];
  for (const sam of [41, 42, 43, 44]) rows = rows.concat(GL.ferestre(bareDin(aleator(30 * 96 + 1, sam, 0.004)), 2));
  const q = GL.intrebari(rows, 2);
  assert.equal(q.length, 3);
  for (const x of q) { assert.ok(x.id && x.titlu && x.A && x.B && ["dovedit", "contrazis", "n-am-aflat"].includes(x.verdict), JSON.stringify(x).slice(0, 200)); }
  assert.ok(q.every((x) => x.verdict !== "dovedit"), q.map((x) => x.id + ":" + x.verdict).join(" "));
});

// --- v80: Tabloul botului - 5 randuri noi (pe cifrele botului REAL MET din 24.09) ---
const TX_SRC = fs.existsSync(new URL("../public/lib/tablou-extra.js", import.meta.url)) ? fs.readFileSync(new URL("../public/lib/tablou-extra.js", import.meta.url), "utf8") : "";
const TX = TX_SRC ? new Function(`${SRC}; ${TX_SRC}; return TabloExtra;`)() : null;
const ORA_ = 3600000, P0 = 1790185122575;
const botMET = { id: "2382", baza: "MET.PERP", quote: "USDT", activ: true, directie: "long", levier: 5, investit: 88.98, profitNet: -4.8309, profitTotal: -5.4292, pnlNerealizat: -0.5984, comisioane: -0.7086, finantare: -0.0563, gridProfitBrut: 4.0787, pozitie: 702, pretDeschidere: 0.34115, pretCurent: 0.3403, gridJos: 0.3, gridSus: 0.4, pornitLa: P0,
  brut: { buOrderData: { row: 93, gridType: "arithmetic", gridProfit24h: "3.99005464", trx24h: 320, fundingFeePayment: "-0.05626315455384", initPrice: "0.3556" } } };
await test("v80 modulul TabloExtra exista", () => assert.ok(TX, "tablou-extra.js lipseste"));
await test("v80 geometrieBot: MET aritmetic 0,30-0,40 / 93 grile la 0,3403 -> pas 0,001075 = 0,316% brut, ~0,216% net; sub pragul fisei (0,25%) -> 'prea dese'", () => {
  const g = TX.geometrieBot(botMET);
  aprox(g.pasPret, 0.1 / 93, 1e-9); aprox(g.pasPct, (0.1 / 93) / 0.3403, 1e-6); aprox(g.netPct, (0.1 / 93) / 0.3403 - 0.001, 1e-6);
  assert.equal(g.mod, "aritmetic"); assert.equal(g.grile, 93); assert.equal(g.preaDese, true);
  assert.equal(TX.geometrieBot({ gridJos: 0.3, gridSus: 0.4, brut: { buOrderData: {} } }), null, "fara numar de grile -> null");
});
await test("v80 comparaCuFisa: randuri bot vs fisa (interval, grile, pas net, levier, directie, verdict) + semnale concrete", () => {
  const fisa = { dir: "long", verdict: { nivel: "porneste" }, setare: { jos: 0.315, sus: 0.389, grile: 10, levier: 3, levierSigur: 3, pas: 0.0213, profitGrila: 0.0203 } };
  const c = TX.comparaCuFisa(botMET, fisa);
  assert.ok(c.randuri.length >= 6);
  assert.ok(c.semnale.some((x) => /prea dese/.test(x)), c.semnale.join(" | "));
  assert.ok(c.semnale.some((x) => /levier/.test(x)), "5x vs 3x sigur");
  assert.equal(TX.comparaCuFisa(botMET, null).randuri.length, 0);
});
await test("v80 grileVsCosturi: grile 24h +3,99 vs comisioane/zi si funding/zi (din totalul de la pornire / zile)", () => {
  const acum = P0 + 24 * ORA_;
  const r = TX.grileVsCosturi(botMET, acum);
  aprox(r.grile24h, 3.99005464, 1e-6); assert.equal(r.umpleri24h, 320);
  aprox(r.zile, 1, 1e-6); aprox(r.fundingZi, -0.05626, 1e-4); aprox(r.comisionZi, -0.7086, 1e-4);
  aprox(r.netZi, 3.99005464 - 0.7086 - 0.05626, 1e-3);
  assert.equal(r.fundingMananca, false);
  const b2 = JSON.parse(JSON.stringify(botMET)); b2.brut.buOrderData.gridProfit24h = null;
  assert.strictEqual(TX.grileVsCosturi(b2, acum).grile24h, null, "lipsa ramane lipsa");
});
await test("v80 dacaInchizi: iei investit + total - comisionul de inchidere; pretul de zero la long = deschidere - profitNet/pozitie (+comision)", () => {
  const r = TX.dacaInchizi(botMET, 0.0005);
  aprox(r.comisionInchidere, 702 * 0.3403 * 0.0005, 1e-6);
  aprox(r.iei, 88.98 - 5.4292 - 702 * 0.3403 * 0.0005, 1e-4);
  assert.ok(r.pretZero > 0.3478 && r.pretZero < 0.3485, "pret zero " + r.pretZero);
  aprox(r.distantaZeroPct, (r.pretZero - 0.3403) / 0.3403, 1e-9);
  const n = TX.dacaInchizi(Object.assign({}, botMET, { directie: "neutru", pnlNerealizatSigur: false }), 0.0005);
  assert.strictEqual(n.pretZero, null, "la neutru semnul pozitiei e nesigur -> fara pret de zero");
  const sh = TX.dacaInchizi(Object.assign({}, botMET, { directie: "short" }), 0.0005);
  assert.ok(sh.pretZero < 0.34115, "la short pretul de zero e SUB deschidere cand esti pe minus");
});
await test("v80 legaturaJurnal: intrarea din jurnal legata de botul acesta (sau null)", () => {
  const l = [{ id: "a", botId: "999" }, { id: "b", botId: "2382", verdict: "porneste", mediana: 0.1, t: 1 }];
  assert.equal(TX.legaturaJurnal(l, botMET).id, "b");
  assert.equal(TX.legaturaJurnal([], botMET), null);
});

// --- v81: Tabloul - saptamana, marja, planul, vs pozitie, evenimente ---
await test("v81 peZile: istoricul minut cu minut -> pe fiecare zi (ora Romaniei) cat au adus grilele si totalul la sfarsit; prima zi porneste de la prima inregistrare", () => {
  const Z = Date.parse("2026-09-20T00:00:00+03:00"), M = 60000;
  const ist = [];
  for (let z = 0; z < 3; z++) for (let m = 0; m < 1440; m += 60) ist.push({ t: Z + z * 86400000 + m * M, gridProfitBrut: 10 * z + m / 144, profitTotal: -1 * z + m / 1440 });
  const r = TX.peZile(ist, "Europe/Bucharest");
  assert.equal(r.length, 3);
  assert.equal(r[0].zi, "2026-09-20");
  aprox(r[0].grile, 1380 / 144, 1e-9, "prima zi: ultima - prima");
  aprox(r[1].grile, (10 + 1380 / 144) - (0 + 1380 / 144), 1e-9, "a doua: ultima de azi - ultima de ieri");
  aprox(r[2].total, -2 + 1380 / 1440, 1e-9);
  assert.deepEqual(TX.peZile([], "Europe/Bucharest"), []);
  assert.equal(TX.peZile([{ t: Z, gridProfitBrut: null, profitTotal: null }], "Europe/Bucharest")[0].grile, null, "lipsa ramane lipsa");
});
await test("v81 marjaNoua: MET long, lichidare 0,26475, 702 MET, +20 USDT -> 0,26475 - 20/702; short -> in sus; fara pozitie -> null", () => {
  const b = Object.assign({}, botMET, { pretLichidare: 0.26475 });
  const r = TX.marjaNoua(b, 20);
  aprox(r.lichidare, 0.26475 - 20 / 702, 1e-9); aprox(r.distantaPct, (0.3403 - r.lichidare) / 0.3403, 1e-9);
  const s2 = TX.marjaNoua(Object.assign({}, b, { directie: "short", pretLichidare: 0.4 }), 20);
  aprox(s2.lichidare, 0.4 + 20 / 702, 1e-9);
  assert.equal(TX.marjaNoua(Object.assign({}, b, { pozitie: 0 }), 20), null);
  assert.equal(TX.marjaNoua(b, 0), null);
});
await test("v81 vsPozitie: botul (-5,43) vs un long simplu 5x cu 88,98 de la 0,3556 la 0,3403 -> -19,14; gridul a salvat ~13,7", () => {
  const r = TX.vsPozitie(botMET);
  aprox(r.pozitieSimpla, 88.98 * 5 * (0.3403 - 0.3556) / 0.3556, 1e-3);
  aprox(r.diferenta, -5.4292 - r.pozitieSimpla, 1e-3);
  const n = TX.vsPozitie(Object.assign({}, botMET, { directie: "neutru" }));
  assert.equal(n.pozitieSimpla, 0, "la neutru comparatia e cu a nu face nimic");
});
await test("v81 planStare: iesire pe plus / pe minus / afara din grid N ore -> distante si ce s-a atins", () => {
  const plan = { plus: 5, minus: 10, afaraOre: 12 };
  const r = TX.planStare(Object.assign({}, botMET, { profitTotal: -5.43 }), plan, { afaraDe: null }, Date.now());
  aprox(r.plus.lipsa, 5 + 5.43, 1e-9); aprox(r.minus.lipsa, 10 - 5.43, 1e-9); assert.equal(r.atins.length, 0);
  const t = TX.planStare(Object.assign({}, botMET, { profitTotal: -11 }), plan, { afaraDe: Date.now() - 13 * 3600000 }, Date.now());
  assert.deepEqual(t.atins.sort(), ["afara", "minus"]);
  assert.equal(TX.planStare(botMET, null, null, Date.now()), null);
});
await test("v81 evenimente: iesirile din grid din istoric + alertele, in fereastra graficului", () => {
  const T = 1_790_000_000_000;
  const ist = [0.35, 0.36, 0.41, 0.42, 0.39, 0.29, 0.31].map((p, i) => ({ t: T + i * 60000, pretPerp: p }));
  const al = [{ t: T + 2 * 60000, nivel: "atentie", titlu: "MET: a iesit" }, { t: T - 999999, nivel: "info", titlu: "vechi" }];
  const e = TX.evenimente(ist, al, 0.3, 0.4, T, T + 6 * 60000);
  assert.deepEqual(e.map((x) => x.fel), ["iesire-sus", "alerta", "revenire", "iesire-jos", "revenire"]);
  assert.ok(e.every((x) => x.t >= T && x.t <= T + 6 * 60000));
});
await test("v81 Alerte plan: pragul de pe plus atins -> info 'planul tau: ies'; minus -> critic; o singura data", () => {
  const bot = { id: "b1", baza: "MET.PERP", quote: "USDT", directie: "long", activ: true };
  let r = AL.evalueaza(bot, { plan: { atins: ["minus"], plus: null, minus: { prag: 10 } } }, {}, T0);
  const m = r.mesaje.find((x) => x.cheie === "plan"); assert.ok(m); assert.equal(m.nivel, "critic"); assert.match(m.titlu, /planul tău/);
  r = AL.evalueaza(bot, { plan: { atins: ["minus"], minus: { prag: 10 } } }, r.stare, T0 + 60000);
  assert.equal(r.mesaje.filter((x) => x.cheie === "plan").length, 0);
});

await test("v84.1 distanteGrid: MET la 0,3411 in 0,30-0,40 -> 12,05% pana jos, 17,27% pana sus; afara -> cu cat e afara; lipsa -> null", () => {
  const d = TX.distanteGrid(Object.assign({}, botMET, { pretCurent: 0.3411 }));
  aprox(d.josPct, (0.3411 - 0.3) / 0.3411, 1e-9); aprox(d.susPct, (0.4 - 0.3411) / 0.3411, 1e-9); assert.equal(d.inGrid, true);
  assert.match(d.text, /↓ 12,0% până jos · ↑ 17,3% până sus/);
  const sub = TX.distanteGrid(Object.assign({}, botMET, { pretCurent: 0.29 }));
  assert.equal(sub.inGrid, false); assert.match(sub.text, /sub grid cu 3,4%/, "fata de pretul de acum, ca si celelalte distante");
  assert.equal(TX.distanteGrid(Object.assign({}, botMET, { gridJos: null })), null);
});
await test("v84.2 pill-ul pozitiei: 0,3411 in 0,30-0,40 -> 41% in grid, verde; 0,305 -> 5%, rosu; 0,32 -> 20%, galben; afara -> rosu 'sub grid'", () => {
  const d = (p) => TX.distanteGrid(Object.assign({}, botMET, { pretCurent: p }));
  assert.equal(d(0.3411).pill, "41% în grid"); assert.equal(d(0.3411).ton, "bine");
  assert.equal(d(0.305).pill, "5% în grid"); assert.equal(d(0.305).ton, "rau");
  assert.equal(d(0.32).ton, "atentie"); assert.equal(d(0.39).ton, "atentie");
  assert.equal(d(0.29).pill, "sub grid"); assert.equal(d(0.29).ton, "rau");
  assert.equal(d(0.41).pill, "peste grid");
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
