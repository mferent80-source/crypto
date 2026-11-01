// Proba v100.286 / colector v101.158 (31.10–01.11, el: „vreau să faci pagina dedicată în Radar pe comportament cu tot ce ți-am cerut” ⇒ demo,
// „e ok dar nu văd evaluarea comportamentală, sfaturi, corecții, disciplină” ⇒ demo cu evaluarea ⇒ „continuă”): pagina „Comportament”.
// Colectorul socotește tot (scripts/lib/pagina-comportament.mjs) ⇒ /api/istoric-bot?action=comportament (KV comportament:raport) ⇒ pagina îl
// desenează (public/lib/comportament-ecran.js). Evaluările se țin de acum cu textul de pe Discord; oglinda pe Discord cu punct la mii.
//   node scripts/proba-v100286.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as MC from "./lib/mesaje-colector.mjs";
import * as CO from "./lib/comportament.mjs";
import * as PF from "./lib/profit-real.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const [f, g] of [["grid-calcul.js", "GridCalcul"], ["jurnal-trade.js", "JurnalTrade"], ["obiceiuri.js", "Obiceiuri"]]) if (!globalThis[g]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Obiceiuri: OB } = globalThis;
let PC = {}; try { PC = await import("./lib/pagina-comportament.mjs"); } catch (e) { console.log("  (scripts/lib/pagina-comportament.mjs nu se încarcă: " + e.message + ")"); }
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.286 · PAGINA „COMPORTAMENT” · proba\n");

const ORA = 3600000, MIN = 60000, ZI = 86400000;
// ora României: vara (UTC+3) până la 25.10.2026 04:00, apoi iarna (UTC+2)
const RO = (zi, hh = 12, mm = 0) => Date.parse(zi + "T00:00:00Z") + (hh - (zi < "2026-10-25" ? 3 : 2)) * ORA + mm * MIN;
let idN = 100;
const bot = (pornit, ore, net, x = {}) => Object.assign({ id: String(++idN), moneda: "SOL", dir: "long", pornit, inchis: pornit + ore * ORA, durataOre: ore, rezultat: net, comisioane: 0, funding: 0, net, grile: 0, pozitie: net }, x);
const P3 = { zi: 20, sapt: 60, rand: 3, boti: 3 }, P7 = OB.praguriFrana({ zi: 20, sapt: 60, rand: 3, boti: 7 });

await test("luna oglinzii: în primele 7 zile ale lunii, luna trecută întreagă față de cea dinainte; de pe 8, luna asta până azi față de cea trecută", () => {
  assert.deepEqual(PC.lunaOglinda(RO("2026-11-01", 10)), { a: "2026-10", b: "2026-09", intreaga: true });
  assert.deepEqual(PC.lunaOglinda(RO("2026-11-07", 23, 59)), { a: "2026-10", b: "2026-09", intreaga: true });
  assert.deepEqual(PC.lunaOglinda(RO("2026-11-08", 0, 1)), { a: "2026-11", b: "2026-10", intreaga: false });
  assert.deepEqual(PC.lunaOglinda(RO("2027-01-03")), { a: "2026-12", b: "2026-11", intreaga: true });
  assert.deepEqual(PC.lunaOglinda(RO("2027-01-10")), { a: "2027-01", b: "2026-12", intreaga: false });
});

await test("disciplina la pornire: în regulă = în pragul zilei ȘI cu frâna liberă (zi / 7 zile / la rând); deschișii intră la număr, netul doar pe închiși", () => {
  const d1 = "2026-10-10", d2 = "2026-10-11";
  const l = [bot(RO(d1, 10), 1, 1), bot(RO(d1, 10, 10), 1, 1), bot(RO(d1, 10, 20), 1, 1), bot(RO(d1, 10, 30), 1, 1),   // al 4-lea: peste pragul de 3
    bot(RO(d2, 9), 1, -30), bot(RO(d2, 11), 1, -1)];   // ziua −30 ⇒ al doilea pornit cu frâna trasă (zi)
  const deschise = [{ id: "d-1", activ: true, pornitLa: RO(d2, 13), profitTotal: -0.2 }];   // încă pornit, tot cu frâna trasă
  const r = PC.disciplinaPe(l, deschise, RO(d1, 0), RO("2026-10-12", 0), P3, OB.franaLaPornire);
  assert.deepEqual(r, { n: 7, ok: 4, pct: 57, inchisiOk: 4, netOk: -27, inchisiRau: 2, netRau: 0 });
  assert.deepEqual(PC.disciplinaPe([], [], RO(d1, 0), RO(d2, 0), P3, OB.franaLaPornire), { n: 0, ok: 0, pct: null, inchisiOk: 0, netOk: 0, inchisiRau: 0, netRau: 0 });
});

await test("ziua de după o zi proastă (≤ −50, pe ziua pornirii): câți boți a doua zi, respectat = cel mult 4; doar zilele de după încheiate; media pe toată istoria", () => {
  const l = [bot(RO("2026-10-20", 10), 1, -30), bot(RO("2026-10-20", 11), 1, -30)];
  for (let i = 0; i < 6; i++) l.push(bot(RO("2026-10-21", 9 + i), 1, 1));
  l.push(bot(RO("2026-10-25", 10), 1, -55), bot(RO("2026-10-26", 10), 1, 1), bot(RO("2026-10-26", 11), 1, 1), bot(RO("2026-10-30", 10), 1, -10));
  l.push(bot(RO("2026-10-31", 10), 1, -70));   // ieri proastă, azi încă în curs ⇒ nu se judecă
  const r = PC.zileDupaProaste(l, RO("2026-11-01", 10), 31);
  assert.deepEqual(r.urm, [6, 2]); assert.equal(r.n, 2); assert.equal(r.respectate, 1);
  const g = [bot(RO("2026-10-10", 10), 1, -60)]; for (let i = 0; i < 4; i++) g.push(bot(RO("2026-10-11", 9 + i), 1, 1));   // a doua zi exact 4 ⇒ respectat
  assert.deepEqual(PC.zileDupaProaste(g, RO("2026-10-20", 10), 31), { zile: ["2026-10-10"], urm: [4], n: 1, respectate: 1 });
  const ist = PC.dupaProastaIstoric(l, RO("2026-11-01", 10));
  assert.equal(ist.n, 2); assert.equal(ist.dupa, 4); assert.equal(ist.altfel, 0.3);   // după 21.10 ⇒ 0, 26.10 ⇒ 0, 30.10 ⇒ 1 (31.10)
});

await test("continuat după N pierderi la rând (în ordinea închiderii, pe ziua României): zilele, boții porniți după a N-a pierdere și netul lor", () => {
  const z = "2026-10-15", l = [bot(RO(z, 9), 1, -1), bot(RO(z, 10), 1, -1), bot(RO(z, 11), 1, -1), bot(RO(z, 12, 30), 1, -5), bot(RO(z, 13), 1, 2)];
  const y = "2026-10-16"; l.push(bot(RO(y, 9), 1, -1), bot(RO(y, 10), 1, 1), bot(RO(y, 11), 1, -1), bot(RO(y, 12), 1, -1), bot(RO(y, 13, 30), 1, 7));   // câștigul rupe șirul: cel mult 2
  assert.deepEqual(PC.continuatDupaRand(l, 3), { zile: 1, boti: 2, net: -3 });
  assert.deepEqual(PC.continuatDupaRand([], 3), { zile: 0, boti: 0, net: 0 });
});

// ---------------- un scenariu întreg (duminică 01.11.2026, 10:00 la București) ----------------
const ACUM = RO("2026-11-01", 10);
function scenariu() {
  idN = 500;
  const l = [];
  // septembrie: 3 boți, unul −1.277 (punctul la mii), unul lichidat; octombrie: 4 boți, doi în minute
  l.push(bot(RO("2026-09-10", 10), 2, -1277), bot(RO("2026-09-11", 10), 8, 5), bot(RO("2026-09-12", 10), 1, -3, { id: "lic" }));
  l.push(bot(RO("2026-10-05", 10), 0.1, 2), bot(RO("2026-10-05", 11), 0.1, -1), bot(RO("2026-10-06", 10), 7, -20), bot(RO("2026-10-07", 10), 3, 4));
  // ultimele 7 zile: 30.10 −110 (frâna liberă la pornire) apoi +10 (pornit cu ziua și cele 7 zile trase) ⇒ frâna pe 7 zile trasă de atunci;
  // ONDO long închis la un minut înainte de pornirea lui ONDO short
  l.push(bot(RO("2026-10-30", 9), 1, -110), bot(RO("2026-10-30", 11), 1, 10));
  l.push(bot(RO("2026-11-01", 8), 1.5, -1.4, { id: "776", moneda: "ONDO", dir: "long" }));   // închis 09:30
  l.push(bot(RO("2026-10-25", 8), 1, 1));   // duminica de dinainte: în afara ultimelor 7 zile (26.10–01.11)
  // umplutură cu net 0 (o oră, câte unul pe zi): septembrie și octombrie trec de 20 de boți, pragul de la care lunile se compară
  for (let d = 1; d <= 20; d++) l.push(bot(RO("2026-09-" + String(d).padStart(2, "0"), 14), 1, 0));
  for (let d = 8; d <= 20; d++) l.push(bot(RO("2026-10-" + String(d).padStart(2, "0"), 14), 1, 0));
  const deschise = [{ id: "777", activ: true, pornitLa: RO("2026-11-01", 9, 31), baza: "ONDO.PERP", directie: "SHORT", profitTotal: -0.5 }];
  const motive = new Map([["lic", "LIQUIDATION"]]);
  const f = OB.frana({ trades: l, deschise, acum: ACUM, praguri: P7 });
  // instantaneul colectorului de la pornirea lui 777 ținea și pierderea altor boți deschiși atunci (−48,6) ⇒ altceva decât istoria (−101,4)
  const sn777 = Object.assign(CO.instantaneu(OB.franaLaPornire({ id: "777", pornit: RO("2026-11-01", 9, 31) }, l, P7, deschise, true)), { netSapt: -150 });
  const st = { sapt: { zi: "2026-11-01", zile: 9, intrebat: null }, porniri: { "777": { la: ACUM - 20 * MIN, f: sn777 },
    "776": { la: RO("2026-11-01", 8), f: { activa: false, depasit: [], praguri: P7, pornitiAzi: 0, rand: 0, netZi: 0, netSapt: -100 } } } };   // instantaneul nu hotărăște lista (istoria da), doar textul
  const inreg = [
    { id: "776", moneda: "ONDO", dir: "long", pornit: RO("2026-11-01", 8), inchis: RO("2026-11-01", 9, 30), net: -1.4, verdict: "cost", rele: ["frana"], bune: ["boti"], titlu: "ONDO long: greșeala a costat −1,4 USDT", mesaj: "Ținut 1 h 30 min ⇒ net −1,4 USDT.\n❌ Pornit cu frâna trasă: 7 zile −100,0 USDT (pragul −60).\n👉 Aș porni cu 7 zile sub −60 doar dacă pragul mai e al meu; altfel l-aș schimba în Poartă." },
    { id: String(l[8].id), moneda: "SOL", pornit: l[8].pornit, inchis: l[8].inchis, net: 10, verdict: "noroc", rele: ["frana"], bune: ["boti"] },   // vechi: fără text
  ];
  const boti = l.map((t) => ({ inchis: t.inchis, rezultat: t.net, comisioane: -0.1, funding: 0, eticheta: t.moneda, dir: t.dir }));
  const profit = { p: PF.profitPe(boti, ACUM), costP: PF.costuriPe(boti, ACUM), topP: PF.topSapt(boti, ACUM, 3), q: null, costQ: null, topQ: null, stareT212: "nelegat" };
  return { acum: ACUM, P: P7, f, toate: l, deschise, motive, inreg, st, fl: OB.franaLaPornire, dovezi: CO.dovezi(l, 7), istoria: null, profit, banda: { h: 6, n: 120, intoarse: 0.41 }, versiune: "v101.158" };
}
let R = null;
await test("raportul paginii: forma, ora, sfatul săptămânii (frâna pe 7 zile trasă de 9 zile), cardul Azi pe pragurile lui", () => {
  const o = scenariu(); R = PC.raportPagina(o);
  assert.equal(R.forma, 1); assert.equal(R.la, ACUM); assert.equal(R.versiune, "v101.158");
  assert.match(R.sfat, /^Un singur lucru săptămâna asta: frâna\. Cu pragul de −60 pe 7 zile ești peste el de 9 zile/);
  assert.equal(R.azi.activa, true); assert.equal(R.azi.eticheta, "Frâna e trasă");
  assert.equal(R.azi.titlu, "Pe 7 zile ai −101,9 USDT. Pragul tău e −60.");   // −110 +10 −1,4 și pierderea botului încă pornit −0,5
  assert.deepEqual(R.azi.cifre.map((c) => c.v), ["2 din 7", "1 din 3", "−1,9 din −20"]);
  assert.equal(R.azi.nota, "E trasă de 9 zile la rând, așa că nu-ți mai spune nimic nou.");
  assert.equal(R.azi.sfat, "Aș hotărî azi: țin pauza până revine săptămâna sau pun în Poartă un prag pe care îl respect.");
});
await test("disciplina în raport: ultimele 7 zile + luna oglinzii și cele două dinainte (pe 01.11: octombrie, septembrie, august)", () => {
  assert.deepEqual(R.disciplina.randuri.map((x) => x.eticheta), ["Ultimele 7 zile", "Octombrie", "Septembrie", "August"]);
  const z7 = R.disciplina.randuri[0];
  assert.equal(z7.text, "1 din 4 · 25%"); assert.equal(z7.lat, 25);   // 30.10 primul în regulă; al doilea, 776 și 777 cu frâna trasă
  assert.equal(R.disciplina.randuri[3].text, "niciun bot"); assert.equal(R.disciplina.randuri[3].lat, 0);
  assert.match(R.disciplina.nota, /pragul tău de 7 boți pe zi și cu frâna liberă/);
});
await test("corecțiile: 6, în ordinea din demo; 3, 5, 6 sunt recomandări (nu regulile lui din Poartă); stările din datele lui", () => {
  assert.deepEqual(R.corectii.map((c) => c.regula), ["Frâna trasă = pauză, sau un prag nou în Poartă", "Cel mult 7 boți pe zi", "După o zi sub −50, a doua zi cel mult 4 boți",
    "3 pierderi la rând = gata ziua", "Ieși când prețul stă peste 6 h în afara grilei", "Lasă gridul să lucreze, nu-l închide în minute"]);
  assert.deepEqual(R.corectii.map((c) => !!c.recomandare), [false, false, true, false, true, true]);
  assert.equal(R.corectii[0].stare, "trasă de 9 zile"); assert.equal(R.corectii[0].ton, "rau");
  assert.match(R.corectii[0].dece, /^Pe 7 zile ai −101,9 USDT, pragul tău e −60\./);
  assert.equal(R.corectii[1].stare, "respectată"); assert.equal(R.corectii[1].ton, "bun");
  assert.equal(R.corectii[3].stare, "acum 1 din 3"); assert.equal(R.corectii[3].ton, "atentie");
  assert.equal(R.corectii[2].stare, "respectată o dată"); assert.equal(R.corectii[2].ton, "bun");   // 30.10 −100 ⇒ 31.10 niciun bot
  // corecția 5 numără ce spune regula: boții ținuți peste prag cu prețul în afara grilei (evaluările „banda”), luna asta - nu toți boții de peste 6 h
  assert.equal(R.corectii[4].stare, "niciunul luna asta"); assert.equal(R.corectii[4].ton, "bun"); assert.match(R.corectii[4].dece, /după 6 h în afara grilei prețul se mai întoarce doar în 41% din cazuri/);
  const o3 = scenariu(); o3.inreg[0] = Object.assign({}, o3.inreg[0], { rele: ["frana", "banda"] }); o3.dovezi = { minute: { n: 1057, grile: 340.7, comisioane: -1165.1 } };
  const r3 = PC.raportPagina(o3); assert.equal(r3.corectii[4].stare, "1 bot luna asta"); assert.equal(r3.corectii[4].ton, "rau");
  assert.equal(r3.corectii[5].dece, "Pe cei 1.057 de boți închiși sub 15 minute, grilele au prins +340,7 USDT, iar comisioanele au luat 1.165,1 USDT.");
  assert.equal(R.corectii[5].stare, "2 în octombrie"); assert.equal(R.corectii[5].ton, "rau");
});
await test("ce faci bine / ce greșești: din oglindă (octombrie față de septembrie) și din ultimele 7 zile, cu o zecimală și punct la mii", () => {
  assert.ok(R.bine.some((t) => /^Închiderile în minute/.test(t)) === false, "septembrie n-a avut minute: nimic de comparat");
  assert.ok(R.bine.includes("Nicio lichidare în octombrie (în septembrie: 1)."), R.bine.join(" | "));
  assert.ok(R.rau.some((t) => /^Pornești cu frâna trasă: 3 din cei 4 boți din ultimele 7 zile; cei închiși au dat \+8,6 USDT\.$/.test(t)), R.rau.join(" | "));
  assert.ok(R.rau.some((t) => /^Închizi gridul în minute: 2 boți în octombrie \(\+1,0 USDT\)/.test(t)), R.rau.join(" | "));
});
await test("porniți cu frâna trasă: TOȚI boții din ultimele 7 zile porniți cu pierderile peste frână (nu doar cei văzuți de colector), cei mai noi sus; textul văzut la pornire, dacă există", () => {
  assert.equal(R.porniriN, 3); assert.deepEqual(R.porniri.map((p) => p.titlu), ["ONDO short", "ONDO long", "SOL long"]);
  const [p, q, s] = R.porniri;
  assert.equal(p.cand, "azi, 09:31"); assert.equal(p.stare, "încă pornit");
  assert.equal(p.frana, "Frâna trasă la pornire: 7 zile −150,0 USDT (pragul −60).");   // instantaneul colectorului (cu pierderea boților deschiși)
  assert.equal(p.inainte, "Pornit la un minut după ce s-a închis ONDO long (−1,4 USDT).");
  assert.equal(p.sfat, "N-aș mai porni altul azi; pe acesta l-aș lăsa să lucreze, cu stopul pus.");
  assert.equal(q.stare, "închis · −1,4 USDT"); assert.equal(q.frana, "Frâna trasă la pornire: 7 zile −99,0 USDT (pragul −60)."); assert.equal(q.sfat, null);   // din istorie
  assert.equal(s.cand, "30.10, 11:00"); assert.equal(s.frana, "Frâna trasă la pornire: ziua −110,0 USDT (pragul −20), 7 zile −109,0 USDT (pragul −60)."); assert.equal(s.inainte, null);
});
await test("evaluările: cele mai noi sus, cu textul de pe Discord; cea veche fără text e refăcută din arhivă (marcată) sau compactă; verdictele numărate", () => {
  assert.deepEqual(R.evaluari.map((e) => e.id), ["776", String(scenariu().inreg[1].id)]);
  assert.equal(R.evaluari[0].titlu, "ONDO long: greșeala a costat −1,4 USDT"); assert.match(R.evaluari[0].mesaj, /^Ținut 1 h 30 min/); assert.equal(R.evaluari[0].refacut, false);
  assert.equal(R.evaluari[0].cand, "01.11 09:30");
  const v = R.evaluari[1]; assert.equal(v.refacut, true); assert.equal(v.titlu, "SOL long: câștig cu noroc +10,0 USDT"); assert.match(v.mesaj, /❌ Pornit cu frâna trasă: ziua −110,0 USDT/);
  assert.deepEqual(R.verdicte.cost, { n: 1, net: -1.4 }); assert.deepEqual(R.verdicte.noroc, { n: 1, net: 10 }); assert.deepEqual(R.verdicte.bune, { n: 0, net: 0 });
});
await test("regulile, frâna săptămânii, oglinda (−1.277,0 cu punct la mii) și profitul real", () => {
  assert.equal(R.reguli.lunaNume, "noiembrie"); assert.deepEqual(R.reguli.luna, [{ nume: "Pornit cu frâna trasă", cate: "1 bot", net: "−1,4 USDT", ton: "rau" }]);
  assert.equal(R.reguli.noi, "Pe date noi (boți porniți de la 31.10): 1 bot pornit cu frâna trasă, −1,4 USDT.");
  assert.equal(R.franaSapt.zile.length, 7); assert.match(R.franaSapt.zile[6].zi, /^dum 01\.11$/);
  assert.match(R.oglinda.titlu, /^Oglinda lunii: octombrie, față de septembrie$/);
  assert.match(R.oglinda.intro, /Septembrie: 23 de boți, net −1\.275,0 USDT/);
  assert.deepEqual(R.oglinda.randuri.map((x) => x.nume), ["Zile cu peste 7 boți", "Porniți cu frâna trasă", "Ținuți peste 6 h", "Închiși de tine în minute", "Lichidați"]);
  assert.equal(R.oglinda.randuri[4].sens, "mai rar"); assert.equal(R.oglinda.randuri[4].ton, "bun");
  const pb = R.profit.piete[0]; assert.equal(pb.nume, "Boți Pionex · USDT"); assert.equal(pb.randuri.length, 4);
  assert.match(pb.randuri[3].perioada, /^Total, de la 01\.09\.2026$/);   /* prima închidere: umplutura din 01.09 */ assert.match(pb.randuri[3].net, /^−1\.3\d\d,\d USDT$/);
  assert.equal(R.profit.piete[1].nota, "Trading 212 nu e legat la Radar.");
  assert.ok(JSON.stringify(R).length < 524288);
  // o evaluare veche a cărei refacere nu dă aceleași reguli ⇒ compactă, din coduri (fără text inventat)
  const o2 = scenariu(); o2.inreg[1] = Object.assign({}, o2.inreg[1], { rele: ["frana", "minute"] });
  const e2 = PC.raportPagina(o2).evaluari[1];
  assert.equal(e2.refacut, false); assert.equal(e2.titlu, "SOL: câștig cu noroc +10,0 USDT"); assert.match(e2.mesaj, /❌ Pornit cu frâna trasă, închis în minute\./); assert.match(e2.mesaj, /Textul întreg e pe Discord/);
  // și deciziile bune: pe Discord avea și „✅ banda” (orele în afara grilei nu se mai știu) ⇒ compactă, nu un text fără rândul lui
  const o5 = scenariu(); o5.inreg[1] = Object.assign({}, o5.inreg[1], { bune: ["boti", "banda"] });
  const e5 = PC.raportPagina(o5).evaluari[1];
  assert.equal(e5.refacut, false); assert.match(e5.mesaj, /✅ În pragul zilei, închis la timp după ieșirea din grilă\./);
  // și verdictul: arhiva și-a schimbat netul după evaluare (aceleași reguli, alt semn) ⇒ compactă, cu verdictul din jurnal
  const o6 = scenariu(); o6.inreg[1] = Object.assign({}, o6.inreg[1], { verdict: "cost", net: -1 });
  const e6 = PC.raportPagina(o6).evaluari[1];
  assert.equal(e6.refacut, false); assert.equal(e6.titlu, "SOL: greșeala a costat −1,0 USDT");
});

await test("ziua de azi nu e încă „respectată” (nu s-a terminat): frâna săptămânii o spune „deocamdată”, ce faci bine numără doar zilele încheiate", () => {
  idN = 900;
  const l = [bot(RO("2026-10-30", 9), 1, -110)];   // pierderea trage frâna pe 7 zile; de atunci niciun bot pornit
  const f = OB.frana({ trades: l, deschise: [], acum: ACUM, praguri: P7 });
  const r = PC.raportPagina({ acum: ACUM, P: P7, f, toate: l, deschise: [], motive: new Map(), inreg: [], st: {}, fl: OB.franaLaPornire, dovezi: {}, istoria: null, profit: null, banda: null });
  assert.equal(r.franaSapt.titlu, "Trasă în 3 zile din 7, respectată în 2; azi, deocamdată, da.");
  assert.equal(r.franaSapt.zile[6].net, "încă respectată"); assert.equal(r.franaSapt.zile[5].net, "respectată");
  assert.ok(r.bine.includes("Ai respectat frâna în toate cele 2 zile în care a fost trasă."), r.bine.join(" | "));
});
await test("botul peste frână încă deschis: fără „net 0,0 pe cei închiși”, „singurul bot”, ziua lui „deschis”", () => {
  idN = 920;
  const l = [bot(RO("2026-10-30", 9), 1, -110)], D = [{ id: "x1", activ: true, pornitLa: RO("2026-11-01", 9), profitTotal: 0 }];
  const f = OB.frana({ trades: l, deschise: D, acum: ACUM, praguri: P7 });
  const r = PC.raportPagina({ acum: ACUM, P: P7, f, toate: l, deschise: D, motive: new Map(), inreg: [], st: {}, fl: OB.franaLaPornire, dovezi: {}, istoria: null, profit: null, banda: null });
  assert.equal(r.franaSapt.sub, "1 bot pornit peste ea, încă deschis."); assert.equal(r.franaSapt.zile[6].net, "deschis");
  assert.ok(r.rau.includes("Pornești cu frâna trasă: 1 din cei 2 boți din ultimele 7 zile."), r.rau.join(" | "));   // fără „cei închiși au dat” (e încă deschis)
});
await test("„frâna trasă” pe pagină = pierderile (ca evaluarea, oglinda, disciplina); pragul zilei atins se spune separat, nu de două ori", () => {
  idN = 950;
  const l = []; for (let i = 0; i < 7; i++) l.push(bot(RO("2026-11-01", 7, i * 5), 1, 1));   // 7 boți azi, toți pe plus
  const f = OB.frana({ trades: l, deschise: [], acum: ACUM, praguri: P7 });
  assert.deepEqual(f.depasit.map((d) => d.cod), ["boti"]);
  const r = PC.raportPagina({ acum: ACUM, P: P7, f, toate: l, deschise: [], motive: new Map(), inreg: [], st: {}, fl: OB.franaLaPornire, dovezi: {}, istoria: null, profit: null, banda: null });
  assert.equal(r.azi.eticheta, "Pragul zilei atins"); assert.equal(r.azi.titlu, "7 boți porniți azi. Pragul tău e 7.");
  assert.equal(r.corectii[0].stare, "liberă"); assert.equal(r.franaSapt.titlu, "N-a fost trasă în nicio zi."); assert.equal(r.porniriN, 0);
  assert.ok(!r.rau.some((t) => /^Pornești cu frâna trasă/.test(t)), r.rau.join(" | "));
});
await test("zilele frânei pe 7 zile din starea colectorului doar dacă e la zi (azi sau ieri); altfel „trasă azi”, fără nota zilelor", () => {
  const o = scenariu(); o.st.sapt = { zi: "2026-10-20", zile: 9, intrebat: null };
  const r = PC.raportPagina(o);
  assert.equal(r.corectii[0].stare, "trasă azi"); assert.equal(r.azi.nota, null); assert.equal(r.azi.sfat, "N-aș mai porni boți azi; mâine, cu capul limpede.");
  assert.match(r.sfat, /^Un singur lucru azi: frâna e trasă \(7 zile −101,9 USDT, pragul −60\)/);
});
await test("oglinda pe o lună începută: sub 20 de boți în luna asta ⇒ luna trecută întreagă; „ce faci bine” compară doar luni cu cel puțin 20 de boți", () => {
  const o = scenariu(); o.acum = RO("2026-11-10", 10);
  const r = PC.raportPagina(o);
  assert.equal(r.oglinda.titlu, "Oglinda lunii: octombrie, față de septembrie");
  assert.deepEqual(r.disciplina.randuri.map((x) => x.eticheta), ["Ultimele 7 zile", "Octombrie", "Septembrie", "August"]);
  const ziT = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
  const o2 = scenariu(); o2.toate = o2.toate.filter((t) => !(ziT(t.pornit) >= "2026-09-13" && ziT(t.pornit) <= "2026-09-20"));   // septembrie: 15 boți
  const r2 = PC.raportPagina(o2);
  assert.ok(!r2.bine.some((t) => /^Nicio lichidare|^Ai pornit mai rar|^Mai puține zile|^Închiderile în minute|^Ai ținut mai rar/.test(t)), r2.bine.join(" | "));
});
await test("dublura: un bot deja în arhivă pe care Pionex îl mai dă pornit se numără o dată", () => {
  const d1 = "2026-10-10", l = [bot(RO(d1, 10), 1, 1), bot(RO(d1, 11), 1, 1)];
  assert.equal(PC.disciplinaPe(l, [{ id: l[0].id, activ: true, pornitLa: l[0].pornit }], RO(d1, 0), RO("2026-10-11", 0), P3, OB.franaLaPornire).n, 2);
  const g = [bot(RO("2026-10-10", 10), 1, -60)]; for (let i = 0; i < 4; i++) g.push(bot(RO("2026-10-11", 9 + i), 1, 1));
  assert.deepEqual(PC.zileDupaProaste(g, RO("2026-10-20", 10), 31, [{ id: g[1].id, activ: true, pornitLa: g[1].pornit }]).urm, [4]);
});
await test("oglinda pe Discord: sumele cu punct la mii (−1.277,0 USDT, nu −1277,0)", () => {
  const o = (cheie, net) => ({ cheie, n: 10, net, zile: 5, zilePeste: { z: 1, net: -1300 }, frana: { n: 2, net: -1277 }, lungi: { n: 0, net: 0 }, minute: { n: 0, net: 0 }, lichidati: { n: 0, net: 0 } });
  const m = MC.oglindaLunii(o("2026-10", -1277), o("2026-09", -10), 7).mesaj;
  assert.match(m, /net −1\.277,0 USDT/); assert.doesNotMatch(m, /1277,0/);
});

await test("serverul: POST comportament ține raportul (cu „la” și forma 1), GET îl dă înapoi; plafonul 512 KB", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=comportament", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.2", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=comportament", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.2" } }), env: ENV });
  assert.equal((await post({ comportament: { forma: 1 } })).status, 400);
  assert.equal((await post({ comportament: { la: ACUM } })).status, 400);
  assert.equal((await post({ comportament: [1] })).status, 400);
  assert.equal((await post({ comportament: { forma: 1, la: ACUM, sfat: "x" } })).status, 200);
  assert.deepEqual((await (await get()).json()).comportament, { forma: 1, la: ACUM, sfat: "x" });
  const { plafonIstoricBot } = await import("../functions/_shared/plafon-corp.js");
  assert.equal(plafonIstoricBot("comportament"), 524288);
});

// ---------------- pagina ----------------
const cutie = { console, Intl, Date, Math, Number, String, Array, Object, JSON, isFinite, RegExp };
vm.createContext(cutie);
let paginaOk = true; try { vm.runInContext(citeste("public", "lib", "comportament-ecran.js"), cutie, { filename: "comportament-ecran.js" }); } catch (e) { paginaOk = false; console.log("  (comportament-ecran.js nu se încarcă: " + e.message + ")"); }
await test("pagina: fără raport spune de ce; cu raport, toate secțiunile demo-ului, în ordine, cu textul scăpat de HTML", () => {
  assert.ok(paginaOk && typeof cutie.coHtml === "function", "lipsește coHtml");
  assert.match(cutie.coHtml(null, {}), /Colectorul de acasă n-a trimis încă/);
  const r = JSON.parse(JSON.stringify(R)); r.evaluari[0].titlu = "<b>ONDO</b> long";
  const h = cutie.coHtml(r, { filtru: null, deschis: "776", acum: ACUM + 5 * MIN });
  const ordine = ["Evaluarea ta comportamentală", "Disciplina la pornire", "Ce faci bine", "Ce greșești", "Corecțiile", ">Azi<", "Seara de azi", "Porniți cu frâna trasă", "Evaluările boților închiși", "Regulile tale", "Frâna în ultimele 7 zile", "Oglinda lunii", "Profitul real"];
  let i = -1; for (const t of ordine) { const j = h.indexOf(t); assert.ok(j > i, "ordinea: " + t); i = j; }
  assert.ok(h.includes("&lt;b&gt;ONDO&lt;/b&gt; long") && !h.includes("<b>ONDO</b>"));
  assert.equal((h.match(/>recomandare</g) || []).length, 3);
  assert.match(h, /data-action-click="coFiltru\('cost'\)"/); assert.match(h, /data-action-click="coComuta\('776'\)"/); assert.match(h, /aria-expanded="true"/);
  assert.match(h, /data-action-click="coPorneste\(true\)"/); assert.match(h, /data-action-click="navTo\('gridset',true\)"/);
  assert.ok(h.includes("Ținut 1 h 30 min"), "evaluarea deschisă își arată textul");
});
await test("pagina: căsuța unui verdict păstrează doar evaluările lui și o spune; a doua apăsare le arată pe toate", () => {
  const h = cutie.coHtml(R, { filtru: "noroc", deschis: null, acum: ACUM });
  assert.match(h, /Arăt doar „Noroc”: 1 din 2\./); assert.doesNotMatch(h, /coComuta\('776'\)/);
  assert.match(h, /aria-pressed="true"[^>]*data-action-click="coFiltru\('noroc'\)"|data-action-click="coFiltru\('noroc'\)"[^>]*aria-pressed="true"/);
  const t = cutie.coHtml(R, { filtru: null, deschis: null, acum: ACUM });
  assert.match(t, /Toate cele 2, cele mai noi sus/); assert.doesNotMatch(t, /Ținut 1 h 30 min/);
  // la deschidere, cea mai nouă evaluare e desfăcută (ca în demo); raportul mai vechi de 30 de minute o spune
  const d = cutie.coHtml(R, { acum: ACUM + 5 * MIN });
  assert.ok(d.includes("Ținut 1 h 30 min")); assert.doesNotMatch(d, /colectorul pare oprit/);
  assert.match(cutie.coHtml(R, { acum: ACUM + 31 * MIN }), /colectorul pare oprit/);
});
await test("pagina: numerele din KV nu intră nescăpate; o singură evaluare se spune firesc; lista pornirilor spune câți din câți; canalul evaluărilor nelegat se spune", () => {
  const r = JSON.parse(JSON.stringify(R)); r.verdicte.cost.n = "<i>x</i>"; assert.doesNotMatch(cutie.coHtml(r, { acum: ACUM }), /<i>x<\/i>/);
  const r1 = JSON.parse(JSON.stringify(R)); r1.evaluari = r1.evaluari.slice(0, 1); r1.nEvaluari = 1; assert.match(cutie.coHtml(r1, { acum: ACUM }), /O singură evaluare\./);
  const r2 = JSON.parse(JSON.stringify(R)); r2.porniriN = 75; assert.match(cutie.coHtml(r2, { acum: ACUM }), /cele mai noi 3 din 75/);
  // poza lângă demo: 10 porniri lungeau rândul de sus (Azi și Seara goale lângă) ⇒ la vedere cele mai noi 3, restul pliat
  const r4 = JSON.parse(JSON.stringify(R)); r4.porniri = Array.from({ length: 10 }, () => R.porniri[0]); r4.porniriN = 76;
  const h4 = cutie.coHtml(r4, { acum: ACUM }), s4 = h4.slice(h4.indexOf('aria-labelledby="co-h-porn"'), h4.indexOf('aria-labelledby="co-h-ev"'));
  assert.match(s4, /<details class="coMai"><summary>Încă 7<\/summary>/); assert.equal((s4.split("<details")[0].match(/class="coPornit"/g) || []).length, 3);
  const o = scenariu(); o.evaluariLegat = false; const r3 = PC.raportPagina(o);
  assert.equal(r3.evaluariLegat, false); assert.equal(r3.seara.titlu, "Evaluările nu se fac: canalul evaluărilor nu e legat la colector.");
  assert.match(cutie.coHtml(r3, { acum: ACUM }), /canalul evaluărilor nu e legat/);
});
await test("legătura paginii: meniul (după Jurnal de trade), telefonul, paleta, navTo, banda de sus, lista albă, cache-ul, stilul înaintea cozii păzite", () => {
  const H = citeste("public", "index.html"), A = citeste("public", "app.js"), S = citeste("public", "sw.js"), C = citeste("public", "app.css");
  assert.match(H, /data-nav="jurnaltrade"><span class="sideIcon">📓<\/span>Jurnal de trade<\/button>\n<button class="sideBtn" data-action-click="navTo\('comportament',true\)" data-nav="comportament">/);
  assert.match(H, /<section class="panel" id="comportament">[\s\S]{0,400}id="coPagina"/);
  assert.match(H, /moreNav\('jurnaltrade',true\)"><b>📓<\/b>Jurnal de trade<\/button>\n<button class="moreBtn" data-action-click="moreNav\('comportament',true\)">/);
  assert.match(H, /<script src="\/lib\/comportament-ecran\.js"><\/script>/);
  assert.match(A, /const NAV_CU_LOAD=new Set\(\[[^\]]*"comportament"/);
  assert.match(A, /else if\(id==="comportament"\)\{if\(typeof coPorneste==="function"\)coPorneste\(false\)\}/);
  assert.match(A, /\["salt","sugestii","carnet","gridsim","contintreg","montecarlo","rezultate","comportament"\]\.includes\(id\)/);
  assert.match(A, /var PAGINI_ZILNICE=\[[^\]]*"comportament"/);
  assert.match(A, /\["Jurnal de trade","jurnaltrade"\],\["Comportament","comportament"\]/);
  const lista = /\nvar ACTIUNI_PERMISE=new Set\("([^"]*)"/.exec(A)[1].split(" ");
  for (const n of ["coPorneste", "coFiltru", "coComuta"]) assert.ok(lista.includes(n), n);
  assert.match(S, /"\/lib\/comportament-ecran\.js"/);
  const iC = C.indexOf("#comportament"), iCoada = C.lastIndexOf("/* v100.224:");
  assert.ok(iC > 0 && iC < iCoada, "stilul paginii înaintea cozii păzite");
});
await test("colectorul: evaluarea ține titlul, textul și direcția; pornirea ține moneda și direcția; raportul paginii pleacă din tura frânei, și fără canalul evaluărilor", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \* as PaginaComportament from "\.\/lib\/pagina-comportament\.mjs"/);
  assert.match(c, /const mEv = MesajeColector\.evaluareBot\(ev\);\s*\n\s*if \(!\(await canalEvaluari\.trimite\(mEv\)\)\) break;/);
  assert.match(c, /JSON\.stringify\(\{ id: t\.id, moneda: t\.moneda, dir: t\.dir \|\| null, pornit: t\.pornit[^\n]*titlu: mEv\.titlu, mesaj: mEv\.mesaj/);
  assert.match(c, /st\.porniri\[String\(b\.id\)\] = \{ la: acum, f: Comportament\.instantaneu\(fr\), moneda: [^\n]*, dir: /);
  assert.match(c, /async function turaPaginaComportament\(/);
  assert.match(c, /trimite\("\/api\/istoric-bot\?action=comportament", \{ comportament: /);
  assert.match(c, /evaluariLegat: !!canalEvaluari\.legat/);
  const i0 = c.indexOf("async function turaFrana()"), tf = c.slice(i0, c.indexOf("\n}\n", i0));
  assert.ok(i0 > 0 && tf.length > 500, "tura frânei");
  assert.match(tf, /await turaPaginaComportament\(\{ toti, act, praguri, f, cfgOk: !!cfg \}\)/);
});
await test("versiunile: v100.286 în aplicație, v101.158 în colector; proba în lanț; v100285 de la v100.285 în sus", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.286"/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.286"/);
  assert.match(citeste("public", "index.html"), /id="healthAppVersion">v100\.286</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-286/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.158"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.286.0", "versiunea din package.json (syntax-v71 o leagă de cache-ul sw.js)"); assert.equal(p.scripts["test:v100286"], "node scripts/proba-v100286.mjs"); assert.match(p.scripts.test, /npm run test:v100285 && npm run test:v100286/);
  assert.doesNotMatch(citeste("scripts", "proba-v100285.mjs"), /VERSIUNE = "v100\\\.285"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
