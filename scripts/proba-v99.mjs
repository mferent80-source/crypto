// Probele v99: Tabloul mai explicit + gridul des (cererea lui din 28.09, dupa auditul sever):
//   „la 7 fa totul mai explicit, sugestii concrete pe miscari live - sa mut stopul, sa pun griduri; gridurile sunt calculate
//    foarte rare si putine, le atinge foarte rar; cu grid de 0,30% am facut mai multi bani in piata laterala decat cu 3%"
//   1. pasul minim al gridului 0,30% (net 0,20% dupa comisionul dus-intors de 0,10%) si 4 candidati de pas, nu 3
//   2. fisa are mereu VARIANTA DEASA (pasul minim, la latimea aleasa), cu trecerile pe zi din proba, si spune ce PROPUNE:
//      deasa cand piata e linistita si proba n-o respinge (mediana pe istoric si pe zilele nevazute >= 0, fara lichidari)
//   3. semaforul FARA fisa nu mai zice „TINE - nimic nu cere o miscare" (starea de asteptare aratata ca verdict), ci „socotesc"
//   4. mutaGridul propune setarea PROPUSA (deasa cand e cazul); gridMaiDes: botul e mult mai rar decat propunerea, in liniste
//   5. acumConcret: stopul (unde e, unde l-as pune, cu pretul), gridul (al lui vs propus, treceri/zi, pozitia in interval),
//      miscarea live (x fata de obisnuit) - cu cifre, nu cu „ce as face" general
//   6. poza: nivelul „asteapta" al botului nu ajunge pe pagina alerts ca nivel (null = fara verdict)
// Fara retea. Rulare: node scripts/proba-v99.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { construiestePoza } from "./lib/poza.mjs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = ["../public/lib/grid-calcul.js", "../public/lib/grid-proba.js", "../public/lib/tablou-extra.js", "../public/lib/semnale-bot.js"].map(citeste).join("\n");
const M = new Function(`${SRC}; return { GC: GridCalcul, GP: GridProba, TE: TabloExtra, S: SemnaleBot };`)();
const { GC, GP, TE, S } = M;

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const Q = 15 * 60000, ORA = 3600000, T0 = 1_780_000_000_000;
function bareDin(inch, marja = 0.001) { return inch.map((c, i) => { const o = i ? inch[i - 1] : c; return { t: T0 + i * Q, o, h: Math.max(o, c) * (1 + marja), l: Math.min(o, c) * (1 - marja), c }; }); }
// zgomot repetabil
function zgomot(n, samanta = 11) { let s = samanta; const out = []; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; out.push(s / 2147483647 - 0.5); } return out; }
// 31 de zile de 15 min: lateral (val de ±1,5% cu perioada de 16 h + zgomot 0,1%) si trend (+0,04% pe bara + zgomot)
const N = 31 * 96, z = zgomot(N);
const lateral = bareDin(Array.from({ length: N }, (_, i) => 1 + 0.015 * Math.sin((2 * Math.PI * i) / 64) + 0.002 * z[i]), 0.0015);
const trend = bareDin(Array.from({ length: N }, (_, i) => Math.pow(1.0004, i) * (1 + 0.002 * z[i])), 0.0015);
function fisaPe(b15) { return GP.fisa({ simbol: "AAA_USDT_PERP", pret: b15[b15.length - 1].c, b15, b4h: GC.agrega(b15, 4 * ORA), b1d: GC.agrega(b15, 24 * ORA).slice(0, -1), suma: 100, H: 2, dir: null, levier: null, minNotional: null }); }
const bot = (o) => Object.assign({ id: "2386", baza: "JTO.PERP", quote: "USDT", directie: "long", levier: 5, investit: 98.14, profitTotal: -10.12, pretCurent: 0.5831, gridJos: 0.5722, gridSus: 0.6572,
  distantaLichidarePct: 19.09, opritorPierdere: null, opritorPierdereActiv: false, brut: { buOrderData: { row: 6, gridType: "geometric" } } }, o || {});
const fisaStub = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "mediu", motive: [] }, regim: { r4h: 0.6, r24h: 0.8, miscare: false },
  liniste: { linisteAcum: true, suficient: true, p: 0.5, n: 10, k: 5 },
  setare: { jos: 0.5459, sus: 0.6279, grile: 6, pas: 0.0236, levier: 5, dir: "long", stop: { jos: 0.52, sus: 0.66 } }, treceriZi: 1.4,
  deasa: { setare: { jos: 0.5459, sus: 0.6279, grile: 46, pas: 0.00305, levier: 5, dir: "long", stop: { jos: 0.542, sus: 0.632 } }, treceriZi: 18.5, antren: { mediana: 0.012, lichidari: 0, umpleriMedii: 37 }, test: { mediana: 0.004, lichidari: 0 }, respinsa: false, motiv: "" },
  propusa: "deasa" }, o || {});

console.log("\nV99 · Tabloul explicit + gridul des · proba\n");

await test("1. pasul minim e 0,30% si culoarul are 4 candidati, in progresie geometrica de la 0,30% la 3x miscarea tipica; pe bare moarte toti 0,30%", () => {
  assert.equal(GC.C.PAS_MIN, 0.003);
  const vii = bareDin(zgomot(500, 9).reduce((a, x) => (a.push((a.length ? a[a.length - 1] : 1) * (1 + x * 0.02)), a), []), 0.004);
  const p = GC.pasi(vii);
  assert.equal(p.length, 4, JSON.stringify(p)); aprox(p[0], 0.003, 1e-12, "minimul");
  assert.ok(p[0] < p[1] && p[1] < p[2] && p[2] < p[3], JSON.stringify(p));
  aprox(p[1] / p[0], p[2] / p[1], 1e-9, "progresie geometrica"); aprox(p[2] / p[1], p[3] / p[2], 1e-9, "progresie geometrica");
  assert.deepEqual(GC.pasi(bareDin(Array(300).fill(1), 0.0001)), [0.003, 0.003, 0.003, 0.003]);
  const st = GC.construieste({ pret: 100, lat: 0.08, pas: 0.003, dir: "long", suma: 100 });
  assert.ok(st.pas >= 0.003 - 1e-9 && st.profitGrila >= 0.002 - 1e-9, `pas ${st.pas} net ${st.profitGrila}`);
});
await test("2. statistici: umplerile si PERECHILE incheiate medii pe fereastra intra in statistica; 'treceri/zi' = perechi incheiate, nu umpleri (revizie: umplerile de pornire umflau cifra)", () => {
  const s = GP.statistici([{ net: 0.01, iesiri: 0, lichidat: false, oprit: false, umpleri: 12, perechi: 3 }, { net: 0.02, iesiri: 0, lichidat: false, oprit: false, umpleri: 20, perechi: 5 }]);
  assert.equal(s.umpleriMedii, 16); assert.equal(s.perechiMedii, 4);
  assert.equal(GP.treceriPeZi({ umpleriMedii: 40, perechiMedii: 6 }, 2), 3, "pe zi = perechi / H");
  // pret PERFECT constant: long-ul cumpara la pornire grilele de deasupra (umpleri > 0), dar nu INCHEIE nicio pereche -> 0/zi
  const plat = bareDin(Array(3 * 96).fill(1), 0);
  const s0 = GP.simuleaza(plat, 0, 2 * 96, GC.construieste({ pret: 1, lat: 0.03, pas: 0.003, dir: "long", suma: 100 }));
  assert.ok(s0.umpleri > 0, "umplerile de pornire exista: " + s0.umpleri); assert.equal(s0.perechi, 0, "dar nu-s perechi");
  assert.equal(GP.treceriPeZi(GP.statistici([s0, s0]), 2), 0, "pe piata moarta: 0 perechi/zi (inainte: " + (s0.umpleri / 2) + " 'treceri'/zi)");
  const sim = GP.simuleaza(lateral, 0, 2 * 96, GC.construieste({ pret: lateral[0].o, lat: 0.03, pas: 0.003, dir: "long", suma: 100 }));
  assert.ok(sim.perechi > 0 && sim.perechi * 2 <= sim.umpleri, "o pereche = 2 umpleri: " + JSON.stringify({ perechi: sim.perechi, umpleri: sim.umpleri }));
  // in fisa, perechile pe zi nu pot depasi jumatate din umplerile pe zi (si la des, si la ales)
  const f = fisaPe(lateral);
  assert.ok(f.deasa.treceriZi * 2 <= f.deasa.antren.umpleriMedii / f.H + 1e-9, "deasa: perechi " + f.deasa.treceriZi + " vs umpleri/zi " + f.deasa.antren.umpleriMedii / f.H);
  assert.ok(f.treceriZi * 2 <= f.stat.antren.umpleriMedii / f.H + 1e-9, "propusa: perechi vs umpleri");
});
await test("3. fisa pe piata laterala: are varianta DEASA (pas 0,30%, la latimea aleasa) cu treceri/zi din proba, mai multe decat setarea aleasa; propune 'deasa' cand e liniste si proba n-o respinge", () => {
  const f = fisaPe(lateral); assert.ok(!f.eroare, f.eroare);
  assert.ok(f.deasa && f.deasa.setare, "deasa lipseste");
  assert.ok(f.deasa.setare.pas >= 0.003 - 1e-9 && f.deasa.setare.pas < 0.0045, "pasul dens: " + f.deasa.setare.pas);
  assert.equal(f.deasa.setare.jos, f.setare.jos); assert.equal(f.deasa.setare.sus, f.setare.sus);
  assert.ok(typeof f.deasa.treceriZi === "number" && f.deasa.treceriZi > 0, "treceriZi " + f.deasa.treceriZi);
  assert.ok(typeof f.treceriZi === "number", "si setarea aleasa isi spune trecerile");
  assert.ok(f.deasa.setare.grile >= f.setare.grile, "deasa are cel putin atatea grile");
  assert.ok(f.deasa.setare.grile === f.setare.grile || f.deasa.treceriZi > f.treceriZi, `deasa ${f.deasa.treceriZi}/zi vs aleasa ${f.treceriZi}/zi`);
  assert.ok(["deasa", "aleasa"].includes(f.propusa), "propusa: " + f.propusa);
  assert.equal(f.propusa, GP.propune({ regim: f.regim, deasa: f.deasa, setare: f.aleasa ? f.aleasa.setare : f.setare }), "propusa vine din regula pura");
  assert.equal(typeof f.deasa.respinsa, "boolean");
  // revizie: cand fisa PROPUNE gridul des, f.setare E gridul des (o singura sursa pentru jurnal, hartie, poarta, suma, Tablou),
  // verdictul e pe statistica LUI (nu a platoului), iar platoul ramane in f.aleasa; f.stat = statistica setarii de pus
  if (f.propusa === "deasa") {
    assert.equal(f.setare.grile, f.deasa.setare.grile); assert.ok(f.aleasa && f.aleasa.setare && f.aleasa.verdict, "aleasa lipseste");
    assert.ok(f.aleasa.setare.grile < f.setare.grile); assert.deepEqual(f.stat, { antren: f.deasa.antren, test: f.deasa.test });
    assert.deepEqual(f.verdict, GC.verdict({ regim: f.regim, stat: f.stat, zile: f.proba.zile, pozitie: f.pozitie, pesteSigur: f.setare.pesteSigur, nesigur: !f.setare.sigur }));
  } else { assert.equal(f.aleasa, null); assert.deepEqual(f.stat, { antren: f.proba.pe[f.dir].antren, test: f.proba.pe[f.dir].test }); }
  assert.equal(GP.setarePropusa(f), f.setare);
});
await test("3b. propune (regula pura): deasa nerespinsa -> 'deasa' (v100.39, el: „gridul des mereu” - si in miscare, unde verdictul zice oricum NU PORNI); deasa respinsa (mediana < 0 / lichidata / pe zilele nevazute pe minus) -> 'aleasa'; deasa = aleasa -> 'aleasa'", () => {
  const ok = { setare: { grile: 46 }, respinsa: false, antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.002, lichidari: 0 } };
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: ok, setare: { grile: 6 } }), "deasa");
  assert.equal(GP.propune({ regim: { miscare: true }, deasa: ok, setare: { grile: 6 } }), "deasa", "v100.39: gridul des mereu (verdictul in miscare ramane NU PORNI)");
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: { ...ok, respinsa: true }, setare: { grile: 6 } }), "aleasa");
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: ok, setare: { grile: 46 } }), "aleasa", "aceeasi setare: nu e nimic 'mai des'");
  assert.equal(GP.propune({ regim: null, deasa: ok, setare: { grile: 6 } }), "deasa", "v100.39: regimul nu mai decide propunerea");
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: { ...ok, setare: { grile: 46, pesteSigur: true } }, setare: { grile: 6 } }), "aleasa", "levierul pune lichidarea prea aproape la gridul des -> nu");
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: { ...ok, setare: { grile: 46, sigur: false } }, setare: { grile: 6 } }), "aleasa", "nici la 1x nu e sigur -> nu");
  const r = GP.respinge({ antren: { mediana: -0.01, lichidari: 0 }, test: null }); assert.equal(r.respinsa, true); assert.match(r.motiv, /minus|istoric/);
  assert.equal(GP.respinge({ antren: { mediana: 0.01, lichidari: 1 }, test: null }).respinsa, true);
  assert.equal(GP.respinge({ antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: -0.002, lichidari: 0 } }).respinsa, true);
  assert.equal(GP.respinge({ antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.001, lichidari: 0 } }).respinsa, false);
});
await test("3c. fisa pe trend: tot are varianta deasa (cu respinsa/motiv), iar propunerea ramane 'aleasa' cand regimul e in miscare", () => {
  const f = fisaPe(trend); assert.ok(!f.eroare, f.eroare);
  assert.ok(f.deasa && typeof f.deasa.respinsa === "boolean");
  if (f.regim && f.regim.miscare) assert.equal(f.propusa, "aleasa");
});
await test("4. semafor FARA fisa si fara semnale tari -> 'asteapta' (socotesc), nu 'tine - nimic nu cere o miscare'; lichidarea < 8% ramane IESI si fara fisa; cu fisa ramane TINE; 'asteapta' NU intra in socoteala (noteaza il sare)", () => {
  const a = S.semafor({ bot: bot() });
  assert.equal(a.nivel, "asteapta"); assert.equal(a.cod, "fara-fisa"); assert.match(a.motiv, /fișa|socot/i); assert.ok(a.faCe && a.faCe.length > 15);
  assert.deepEqual(S.noteaza([], a, -1.2, T0), [], "revizie: 'asteapta' nu e un semnal de judecat dupa 24 h");
  assert.equal(S.noteaza([{ t: T0 - 1, cod: "tine", nivel: "tine", motiv: "", total: -1, dreptate: null }], a, -1.2, T0).length, 1);
  assert.equal(S.semafor({ bot: bot({ distantaLichidarePct: 6 }) }).nivel, "iesi");
  assert.equal(S.semafor({ bot: bot(), plan: { atins: ["minus"], minus: { prag: 10 } } }).nivel, "iesi");
  assert.equal(S.semafor({ bot: bot(), fisa: fisaStub({ propusa: "aleasa" }) }).nivel, "tine");
});
await test("5. mutaGridul foloseste setarea PROPUSA de fisa (deasa in liniste) si spune ca e deasa + trecerile pe zi; cu propusa 'aleasa' ramane setarea aleasa", () => {
  const m = S.mutaGridul(bot({ pretCurent: 0.575 }), fisaStub(), 0);
  assert.ok(m && /marginea de jos/.test(m.motiv), JSON.stringify(m));
  assert.equal(m.setare.grile, 46); assert.equal(m.des, true); assert.equal(m.treceriZi, 18.5);
  const w = S.mutaGridul(bot({ pretCurent: 0.575 }), fisaStub({ propusa: "aleasa" }), 0);
  assert.equal(w.setare.grile, 6); assert.equal(w.des, false);
});
await test("5b. gridMaiDes: botul cu pas de ~2,4% fata de propunerea de 0,30% in liniste -> propunere cu motiv si cifre; bot deja des -> null; propusa 'aleasa' -> null; fara fisa -> null", () => {
  const g = S.gridMaiDes(bot(), fisaStub());
  assert.ok(g, "trebuia propunere"); assert.equal(g.setare.grile, 46); assert.ok(g.pasBot > 0.02 && g.pasBot < 0.03, "pasul botului " + g.pasBot); aprox(g.pasDes, 0.00305, 1e-9);
  assert.match(g.motiv, /0,3/); assert.match(g.motiv, /perechi/); assert.doesNotMatch(g.motiv, /treceri/); assert.equal(g.treceriZi, 18.5);
  assert.equal(S.gridMaiDes(bot({ brut: { buOrderData: { row: 45, gridType: "geometric" } } }), fisaStub()), null, "botul e deja des");
  assert.equal(S.gridMaiDes(bot(), fisaStub({ propusa: "aleasa" })), null);
  assert.equal(S.gridMaiDes(bot(), null), null);
});
await test("6. acumConcret: stopul, gridul si miscarea, cu cifre - pe plus: stopul la zero-ul botului (pretul, distanta); pe minus: nu sub zero, ci sub gridul de jos; gridul: al lui vs propus, treceri/zi, pozitia in interval; miscarea: x fata de obisnuit", () => {
  const zero = { pretZero: 0.5984 }, costuri = { grile24h: 0.9, umpleri24h: 5, netZi: 0.4 };
  const l = S.acumConcret({ bot: bot(), fisa: fisaStub(), zero, costuri, geom: TE.geometrieBot(bot()), acum: T0 });
  assert.ok(Array.isArray(l) && l.length >= 3, JSON.stringify(l));
  const stop = l.find((x) => x.cod === "stop"), grid = l.find((x) => x.cod === "grid"), mis = l.find((x) => x.cod === "miscare");
  assert.ok(stop && grid && mis, "lipseste un rand: " + l.map((x) => x.cod).join(","));
  // pe minus (-10,12): zero-ul 0,5984 e DEASUPRA pretului 0,5831 -> nu se pune stopul acolo; protectia e sub gridul de jos
  assert.match(stop.text, /0\.5984|0,5984/); assert.match(stop.text, /sub gridul de jos|0\.542|0,542/); assert.match(stop.text, /nepus|nu ai/i);
  assert.match(grid.text, /6 grile/); assert.match(grid.text, /47 grile/);   // v100.38: propunerea de 46 intervale = 47 grile Pionex (linii)
  assert.match(grid.text, /18,5 perechi/); assert.match(grid.text, /din interval/); assert.match(grid.text, /5 umpleri/);
  assert.doesNotMatch(grid.text, /treceri/, "revizie: unitatea e 'perechi incheiate', nu 'treceri' (umpleri)");
  // revizie 🔴: SHORT pe minus -> protectia e PESTE gridul de sus (pierderea shortului vine de sus), nu sub gridul de jos
  const sh = S.acumConcret({ bot: bot({ directie: "short", gridJos: 0.55, gridSus: 0.65, pretCurent: 0.62, profitTotal: -3 }), fisa: fisaStub({ dir: "short", setare: { jos: 0.55, sus: 0.65, grile: 6, pas: 0.028, levier: 5, dir: "short", stop: { jos: 0.52, sus: 0.66 } }, deasa: { ...fisaStub().deasa, setare: { jos: 0.55, sus: 0.65, grile: 46, pas: 0.003, levier: 5, dir: "short", stop: { jos: 0.545, sus: 0.6555 } } } }), zero: { pretZero: 0.6 }, costuri, acum: T0 });
  const ss = sh.find((x) => x.cod === "stop"); assert.match(ss.text, /peste gridul de sus/); assert.match(ss.text, /0\.6555/); assert.doesNotMatch(ss.text, /sub gridul de jos/);
  // revizie 🔵: bot NEUTRU pe plus -> nu „cât ești pe minus"; pe plus zero-ul e reper, nu instructiune de parte
  const ne = S.acumConcret({ bot: bot({ directie: "neutru", profitTotal: 3 }), fisa: fisaStub(), zero: { pretZero: 0.6 }, costuri, acum: T0 });
  const ns = ne.find((x) => x.cod === "stop"); assert.doesNotMatch(ns.text, /cât ești pe minus/); assert.match(ns.text, /neutru|ambele|zero/i);
  assert.match(mis.text, /0,6×|0,8×/); assert.match(mis.text, /liniște/i);
  for (const x of l) assert.ok(x.titlu && x.text && x.text.length > 30, JSON.stringify(x));
  // pe plus, cu stopul lui sub zero: „muta stopul la zero"
  const plus = S.acumConcret({ bot: bot({ profitTotal: 4.2, pretCurent: 0.62, opritorPierdere: 0.5, opritorPierdereActiv: true }), fisa: fisaStub(), zero: { pretZero: 0.6012 }, costuri, geom: TE.geometrieBot(bot()), acum: T0 });
  const s2 = plus.find((x) => x.cod === "stop"); assert.match(s2.text, /0\.6012|0,6012/); assert.match(s2.text, /muta|mută|ridic/i); assert.match(s2.text, /0\.5(0)?\b|0,50/);
  // in miscare: randul de miscare spune „nu adauga"
  const mm = S.acumConcret({ bot: bot(), fisa: fisaStub({ regim: { r4h: 1.9, r24h: 1.1, miscare: true }, propusa: "aleasa" }), zero, costuri, geom: TE.geometrieBot(bot()), acum: T0 });
  assert.match(mm.find((x) => x.cod === "miscare").text, /1,9×/); assert.match(mm.find((x) => x.cod === "miscare").text, /mișcare/i);
  // pretul SUB gridul de jos: nu „-1,6% din interval", ci „sub gridul de jos cu X%"
  const sub = S.acumConcret({ bot: bot({ pretCurent: 0.571 }), fisa: fisaStub(), zero, costuri, geom: TE.geometrieBot(bot()), acum: T0 });
  assert.match(sub.find((x) => x.cod === "grid").text, /sub gridul de jos cu 0,2%/); assert.doesNotMatch(sub.find((x) => x.cod === "grid").text, /-\d,\d% din interval/);   // v100.61: fara majuscule de strigat
  // gridul des NU e propus -> se spune DE CE (proba l-a respins pe istoricul monedei), nu dispare
  const resp = S.acumConcret({ bot: bot(), fisa: fisaStub({ propusa: "aleasa", deasa: { ...fisaStub().deasa, respinsa: true, motiv: "pe istoric a ieșit pe minus (mediana −1,20%)" } }), zero, costuri, geom: TE.geometrieBot(bot()), acum: T0 });
  assert.match(resp.find((x) => x.cod === "grid").text, /nu-l propun acum: pe istoric a ieșit pe minus/);
  // fara fisa: randurile de grid/miscare spun ca asteapta fisa, nu inventeaza cifre
  const ff = S.acumConcret({ bot: bot(), fisa: null, zero, costuri, geom: TE.geometrieBot(bot()), acum: T0 });
  assert.ok(ff.find((x) => x.cod === "stop"), "stopul se poate spune si fara fisa"); assert.match(ff.find((x) => x.cod === "grid").text, /fișa|socot/i);
});
await test("7. poza: botul cu semafor 'asteapta' ajunge in poza cu niv null (pagina alerts nu are un asemenea verdict), motivele raman", () => {
  const p = construiestePoza({ acum: T0, versiune: "v99.0", boti: [{ id: "1", baza: "JTO.PERP", directie: "long", pretCurent: 0.58, gridJos: 0.57, gridSus: 0.65, profitTotal: -1, semafor: { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc fișa", faCe: "aștept" } }], t212: [], simboluri: [] });
  assert.equal(p.boti[0].niv, null); assert.equal(p.boti[0].motive[0], "încă socotesc fișa");
});

console.log(`\nV99 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute\n`);
process.exit(picate ? 1 : 0);
