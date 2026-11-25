// Proba v100.342 („fa idei”, 14.11.2026, a doua oară): cele trei idei propuse la livrarea v100.341.
//   I-880  rândul bilanțului notei spune de când e (ca fapt, nu ca alarmă)
//   I-881  G1: „Candidați de grid” măsurat - primele din clasament față de ceilalți candidați (regulile scrise dinainte, garda pentru blocuri
//          legate, etichete la întâmplare înaintea cifrei, viitorul stricat ⇒ aceleași clase și rezultate); explicația din Scan spune rezultatul
//   I-882  Tabloul fără bot, deschis direct: banda contului, „Piața azi” și „Pe ce aș porni” se desenează (nu rămân benzi goale), iar grila
//          botului nu mai apare cu „—” când rândurile sunt pliate
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { incarcaLib, taie } from "./lib/motor-pagina.mjs";
import { testBlocuri } from "./lib/statistica-blocuri.mjs";
import { G1, primaZi, ziIso, testCuGarda, claseLaZi, rezultatGrid, coinZile, valoriBlocuri, verdictG1, placebo, stricaViitorul } from "./lib/g1-candidati-grid.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.342 · ideile I-880..I-882 · proba\n");
const APP = cuTablou(citeste("public", "app.js")), CSS = citeste("public", "app.css"), fnApp = (nume) => { const s = taie(APP, nume); assert.ok(s, "nu găsesc funcția " + nume + " în app.js"); return s; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ZI = 86400000, H4 = 14400000, M15 = 900000;

// ---------------- I-882: Tabloul fără bot ----------------
await test("(I-882) Tabloul fără bot: desenul listei ajunge la banda contului și fără bot (înainte ieșea devreme ⇒ la deschiderea directă banda contului, „Piața azi” și „Pe ce aș porni” rămâneau goale)", () => {
  const el = {}, chemari = { render: 0, asigura: 0 }; let ceas = Date.UTC(2026, 10, 14, 18, 0); class Ceas extends Date { static now() { return ceas; } }
  const ctx = vm.createContext({ console, Date: Ceas, Math, JSON, Object, Array, Number, String, Intl, isFinite, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s),
    $: (id) => (el[id] = el[id] || { id, innerHTML: "", hidden: false, classList: { toggle() {} } }), tbStare: { routeOk: true, bot: null, boti: [] }, document: { getElementById: (id) => el[id] || null },
    contTot: { inLucru: false }, t212: { cont: null, istoric: null }, contTotRender: () => { chemari.render++; }, contTotAsigura: () => { chemari.asigura++; } });
  vm.runInContext(["tbTextFaraBot", "tbRenderTodo", "tbContTot"].map(fnApp).join("\n"), ctx);
  ctx.tbRenderTodo();
  assert.match(el.tbTodoLista.innerHTML, /Niciun bot/, "textul stării fără bot rămâne");
  assert.equal(chemari.render, 1, "banda contului (și, prin ea, „Piața azi” și „Pe ce aș porni”) se desenează și fără bot");
  assert.equal(chemari.asigura, 1, "contul neadus încă se cere");
  // Trading 212 nu răspunde (contul rămâne neadus): lista se redesenează la câteva secunde, dar cererea pleacă cel mult o dată pe minut
  ceas += 8000; ctx.tbRenderTodo(); ceas += 8000; ctx.tbRenderTodo(); assert.equal(chemari.render, 3); assert.equal(chemari.asigura, 1, "fără frână ar pleca o cerere la fiecare desen");
  ceas += 45000; ctx.tbRenderTodo(); assert.equal(chemari.asigura, 2, "după un minut se reîncearcă");
  ctx.t212.cont = {}; ctx.t212.istoric = {}; ceas += 120000; ctx.tbRenderTodo();
  assert.equal(chemari.render, 5); assert.equal(chemari.asigura, 2, "contul deja adus nu se mai cere");
  // ruta picată (routeOk === false) și clipa de dinaintea primului răspuns (routeOk încă nepus) nu sunt „fără bot”: acolo rămâne ca înainte
  // (altfel cererile de cont ar porni mai devreme la fiecare deschidere a Tabloului)
  ctx.tbStare.routeOk = false; ctx.tbRenderTodo(); ctx.tbStare.routeOk = null; ctx.tbRenderTodo(); delete ctx.tbStare.routeOk; ctx.tbRenderTodo(); assert.equal(chemari.render, 5, "doar starea fără bot adevărată desenează banda de aici");
});
await test("(I-882) Tabloul fără bot, cu rândurile pliate: grila botului („Dacă prețul ajunge la…”, „Banii botului”) rămâne ascunsă - regula stării fără bot stă lângă celelalte ale ei și e mai specifică decât cea a rândurilor pliate", () => {
  const pliat = CSS.indexOf('html.pzDemo #tabloubot .tbGrilaNoua:has(>.tbMain>[data-rand="pliat"]),html.pzDemo #tabloubot .tbGrilaNoua:has(>.tbSideNou>[data-rand="pliat"]){display:block!important');
  const fara = CSS.indexOf('html.pzDemo #tabloubot.tbFaraBot .tbGrilaNoua:is(:has(>.tbMain>[data-rand]),:has(>.tbSideNou>[data-rand]),.tbGrilaNoua){display:none!important}');
  assert.ok(pliat > 0, "premisa: regula rândurilor pliate există"); assert.ok(fara > 0, "regula stării fără bot lipsește");
  // locul: lângă celelalte reguli ale stării fără bot, ÎNAINTEA blocului generat - stratul scris de mână de după el nu are voie să ascundă nimic (garda v100.316)
  assert.ok(fara > CSS.indexOf("#tabloubot.tbFaraBot .tbGraficRand{grid-template-columns") && fara < CSS.indexOf("/* ==== v100.316 TEMA TABLOULUI: GENERAT"), "regula nu stă lângă celelalte reguli ale stării fără bot");
  assert.equal(CSS.split("#tabloubot.tbFaraBot .tbGrilaNoua:is(").length - 1, 1, "o singură dată");
  // aceeași formă de selector ca regula pliată (:has cu o clasă și un atribut) + clasa stării ⇒ o clasă în plus la specificitate; amândouă sunt
  // !important, deci câștigă cea mai specifică. Proba adevărată e în browser: pasul „fără bot” al probei de ecran (rulează înainte de push)
  const PE = citeste("scripts", "proba-ecran-tablou.mjs");
  assert.match(PE, /\(I-882\)/); assert.match(PE, /\[data-cont-tot\]/); assert.match(PE, /tbGrilaNoua/);
});

// ---------------- I-880: de când e bilanțul ----------------
await test("(I-880) rândul bilanțului notei spune de când e, ca fapt: data ultimei trimiteri a colectorului; vechi de peste o săptămână ⇒ „de atunci n-a mai trimis nimic nou”, fără ton de alarmă; fără dată nu inventează una", () => {
  const TvNote = incarcaLib(["text-ro.js", "tv-note.js"], "TvNote"), S = { tv4h: { n: 172, k: 85, zile: 34 }, radar4h: { n: 150, k: 77, zile: 31 }, tv1D: { n: 0, k: 0, zile: 0 }, radar1D: { n: 0, k: 0, zile: 0 } };
  const acum = Date.UTC(2026, 11, 20, 10, 0), ieri = Date.UTC(2026, 11, 19, 15, 6);
  const t = TvNote.bilantText({ la: ieri, zile: 34, serii: S }, acum);
  assert.match(t, /Adus la zi de colector: 19\.12\.2026, 17:06\./, "data și ora Bucureștiului, la capătul rândului: " + t.slice(-90));
  assert.doesNotMatch(t, /de atunci/); assert.match(t, /Numărătoare, nu dovadă/, "restul rândului rămâne");
  const vechi = TvNote.bilantText({ la: acum - 9 * ZI, zile: 34, serii: S }, acum);
  assert.match(vechi, /Adus la zi de colector: 11\.12\.2026, 12:00 \(de atunci n-a mai trimis nimic nou\)\./); assert.doesNotMatch(vechi, /⚠|atenție|oprit/i, "fapt, nu alarmă: fără boți colectorul nu are ce judeca");
  assert.doesNotMatch(TvNote.bilantText({ zile: 34, serii: S }, acum), /Adus la zi/, "fără `la` nu se scrie nicio dată");
  assert.doesNotMatch(TvNote.bilantText({ la: acum + 3 * 3600000, zile: 34, serii: S }, acum), /Adus la zi/, "o dată din viitor nu se arată");
  assert.equal(TvNote.bilantText({ la: ieri, zile: 3, serii: { tv4h: { n: 9, k: 4, zile: 3 }, radar4h: { n: 9, k: 5, zile: 3 } } }, acum), "", "sub 30 de zile rândul nu apare deloc, deci nici data");
  assert.match(fnApp("renderTabloTv"), /TvNote\.bilantText\(tbStare\.notaBilant&&tbStare\.notaBilant\.b,Date\.now\(\)\)/, "pagina dă clipa de acum");
});

// ---------------- I-881: G1, logica măsurătorii (date făcute de mână, fără rețea) ----------------
const L = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js", "grid-proba.js"], "({ G: GridCalcul, GC: GridClasament, GP: GridProba })"), G = L.G, GC = L.GC, GP = L.GP;
const T0 = Date.UTC(2026, 0, 31), ISTORIC = 30, FEREASTRA = 10;
// 8 monede, mers la întâmplare pe lumânări de 15 minute; agitația diferă de la o monedă la alta și ține (σ fix pe monedă); cele de 4 h se adună din ele
function seriiDeProba(samanta, sigme) {
  const rnd = mulberry32(samanta), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }, date = {};
  sigme.forEach((sg, i) => { const b15 = [], b4h = []; let p = 100 * (1 + i);
    for (let t = T0 - ISTORIC * ZI; t < T0 + FEREASTRA * ZI; t += M15) { const o = p, c = o * Math.exp(sg * norm()), h = Math.max(o, c) * (1 + Math.abs(sg * norm()) / 3), l = Math.min(o, c) * (1 - Math.abs(sg * norm()) / 3); b15.push({ t, o, h, l, c }); p = c; }
    for (let k = 0; k + 16 <= b15.length; k += 16) { const f = b15.slice(k, k + 16); b4h.push({ t: f[0].t, o: f[0].o, h: Math.max(...f.map((x) => x.h)), l: Math.min(...f.map((x) => x.l)), c: f[15].c }); }
    const f = []; for (let t = T0 + 8 * 3600000; t <= T0 + FEREASTRA * ZI; t += 8 * 3600000) f.push([t, 0.0001]);   /* funding la 8 ore, în toate zilele ferestrei */
    date["M" + i + "USDT"] = { b4h, b15, f }; });
  return date;
}
const SIGME = [0.0012, 0.0016, 0.002, 0.0026, 0.0032, 0.004, 0.005, 0.006], DATE = seriiDeProba(20261114, SIGME), cuTop = (n, f) => { const v = G1.top; G1.top = n; try { return f(); } finally { G1.top = v; } };

await test("(I-881) constantele G1 sunt cele din jurnal: 200 de zile până la 14.11.2026 00:00 UTC, blocuri de 5 zile, pozițiile 1–60, 37 de teste ⇒ 0,05 ÷ 74, minime ×1,2 și 0,05% pe zi; regulile sunt scrise în jurnal înaintea rezultatului", () => {
  assert.equal(G1.pana, Date.UTC(2026, 10, 14)); assert.equal(G1.zile, 200); assert.equal(G1.zilePeBloc, 5); assert.equal(G1.top, 60); assert.equal(G1.teste, 37); assert.equal(G1.alfa, 0.05 / 74);
  assert.equal(G1.minRaport, 1.2); assert.equal(G1.minDiferenta, 0.0005); assert.equal(G1.bare4h, 500); assert.equal(G1.minBare4h, 50); assert.equal(G1.h0Limita, 0.04); assert.equal(ziIso(primaZi()), "2026-04-28");
  // premisele, verificate pe cod (revizia independentă a găsit că le luasem greșit): cele 60 de poziții ale lui G1 sunt lista ferestrei „Grid: ce
  // setez?” (ordonată după scor), NU tăietura rețetei din Scan - acolo `rang` e locul în lista colectorului, care vine în ordinea volumului
  // v100.349 (auditul Grid): pagina arată acum lista din Sugestii (Idei.ideiBotiInfo); G1 rămâne despre ordinea după scor (GridClasament.ordoneaza), cea de până la v100.348
  assert.match(citeste("public", "lib", "grid-clasament.js"), /function ordoneaza\(/); assert.match(APP, /Idei\.ideiBotiInfo\(c,5\)/);
  assert.match(citeste("scripts", "lib", "tura-clasament.mjs"), /const lista = d\.GridClasament\.topDupaVolum\(/); assert.match(citeste("scripts", "lib", "tura-scan.mjs"), /rang: i \+ 1,/, "rang = locul în lista colectorului (după volum)");
  assert.match(citeste("public", "lib", "scan.js"), /x\.rang <= 60/);
  const J = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md"), iR = J.indexOf("## G1 — „Candidați de grid”"), iRez = J.indexOf("### G1 — rezultatul");
  assert.ok(iR > 0, "secțiunea de reguli G1 lipsește din jurnal"); assert.ok(iRez < 0 || iRez > iR, "rezultatul stă după reguli");
  const R = J.slice(iR, iRez > 0 ? iRez : undefined);
  for (const cer of [/ÎNAINTEA oricărei lumânări/, /p ≤ 0,05 ÷ 74 într-o parte/, /pozițiile 1–60/, /1,5 ÷ √n/, /raportul pe bloc cel puțin ×1,2/, /cel puțin 0,05% din sumă pe zi/, /sub 4%/, /Ce nu poate spune G1/, /Ce se scrie pe pagină, hotărât acum/, /Îndreptare scrisă DUPĂ rezultat/]) assert.match(R, cer, "din regulile G1 lipsește " + cer);
  assert.match(J, /\| G1 \| 14\.11\.2026 \|[^\n]*\| 2 \|/, "rândul G1 din registru, cu 2 teste");
});
await test("(I-881) testul cu gardă: nu umflă niciodată t; pe valori care alternează (autocorelație negativă) e chiar testul simplu; pe valori legate între ele îl micșorează mult; sub 5 valori nu judecă", () => {
  const alt = Array.from({ length: 40 }, (_, i) => 0.3 + (i % 2 ? 0.2 : -0.2)), A = testCuGarda(alt), S = testBlocuri(alt);
  assert.ok(A.r1 < -0.9 && !(A.rGarda > 0), "premisa: alternanță ⇒ garda nu se aplică (r = " + A.r1 + ")"); assert.equal(A.tGarda, A.t); assert.ok(Math.abs(A.p - S.p) < 1e-15, "fără gardă e testul simplu");
  const rnd = mulberry32(7), leg = []; let x = 0; for (let i = 0; i < 40; i++) { x = 0.8 * x + (rnd() - 0.5); leg.push(0.25 + x); }
  const B = testCuGarda(leg), SB = testBlocuri(leg); assert.ok(B.r1 > 0.4, "premisa: seria e legată (r = " + B.r1 + ")"); assert.ok(B.tGarda < 0.6 * B.t && B.tGarda > 0, "t cu gardă " + B.tGarda + " față de " + B.t); assert.ok(B.p > 5 * SB.p, "p cu gardă " + B.p + " față de " + SB.p); assert.ok(B.df < 39);
  // garda cunoaște adaosul din reguli: pe valori independente t scade cu √((1 − q) ÷ (1 + q)), q ≈ r corectat + 1,5 ÷ √n
  const ind = Array.from({ length: 40 }, () => 0.2 + (rnd() - 0.5)), I = testCuGarda(ind), q = I.r1 + (1 + 3 * I.r1) / 40 + 1.5 / Math.sqrt(40);
  assert.ok(Math.abs(I.rGarda - q) < 1e-12); assert.ok(q > 0, "premisa"); assert.ok(Math.abs(I.tGarda - I.t * Math.sqrt((1 - q) / (1 + q))) < 1e-12); assert.ok(Math.abs(I.df - (40 * (1 - q) / (1 + q) - 1)) < 1e-9);
  assert.ok(Number.isNaN(testCuGarda([1, 2, 3, 4]).p)); assert.equal(testCuGarda([0.1, 0.1, 0.1, 0.1, 0.1]).p, 0, "fără nicio împrăștiere: media peste zero e sigură");
});
await test("(I-881) clasele unei zile vin numai din lumânările de 4 ore ÎNCHISE până atunci, ordonate ca pe pagină; „primele” = candidații de pe primele poziții, „ceilalți” = restul candidaților; cele de evitat nu intră", () => {
  cuTop(3, () => {
    const t = T0 + 4 * ZI, b4 = {}; for (const s of Object.keys(DATE)) b4[s] = DATE[s].b4h;
    const cl = claseLaZi(GC, b4, t); assert.equal(cl.length, 8);
    cl.forEach((x, i) => { assert.equal(x.poz, i + 1); assert.equal(x.clasa, x.j.stare === "candidat" ? (x.poz <= 3 ? "top" : "rest") : null); });
    const ord = GC.ordoneaza(cl.map((x) => x.j)).map((j) => j.simbol); assert.deepEqual(cl.map((x) => x.simbol), ord, "ordinea e a paginii");
    assert.ok(cl.some((x) => x.clasa === "top") && cl.some((x) => x.clasa === "rest"), "premisa: sunt și primele, și ceilalți");
    // ultima lumânare folosită se închide cel târziu la t; cea care abia începe la t nu intră
    const taiat = {}; for (const s of Object.keys(b4)) taiat[s] = b4[s].filter((x) => x.t + H4 <= t);
    assert.deepEqual(JSON.parse(JSON.stringify(claseLaZi(GC, taiat, t))), JSON.parse(JSON.stringify(cl)), "lumânările de după t nu schimbă nimic");
    const cuUna = {}; for (const s of Object.keys(b4)) cuUna[s] = b4[s].filter((x) => x.t + H4 <= t + H4);
    assert.notDeepEqual(JSON.parse(JSON.stringify(claseLaZi(GC, cuUna, t + H4).map((x) => x.j.pret))), JSON.parse(JSON.stringify(cl.map((x) => x.j.pret))), "premisa: o lumânare în plus chiar schimbă clasamentul (proba e sensibilă)");
    // sub 50 de lumânări închise moneda nu se judecă
    const scurt = Object.assign({}, b4, { M0USDT: b4.M0USDT.filter((x) => x.t + H4 > t - 49 * H4) }); assert.equal(claseLaZi(GC, scurt, t).length, 7);
  });
});
await test("(I-881) gridul rulat e cel al clasamentului (același interval, aceleași grile), fără levier; A = profitul pe grilă × grilele încasate ÷ grile; preț neclintit ⇒ nicio grilă încasată; mai multe treceri ⇒ mai multe grile", () => {
  const j = GC.judeca("XUSDT", DATE.M4USDT.b4h.filter((x) => x.t + H4 <= T0), null), c = G.construieste({ pret: j.pret, lat: j.latime, dir: j.dir, pas: G.C.PAS_MIN, levier: 1 });
  assert.equal(c.grile, j.grile, "aceleași grile ca în clasament"); assert.ok(Math.abs(c.profitGrila - j.profitGrila) < 1e-12);
  const plat = Array.from({ length: 96 }, (_, i) => ({ t: T0 + i * M15, o: j.pret, h: j.pret, l: j.pret, c: j.pret })), r0 = rezultatGrid(G, GP, Object.assign({}, j, { dir: "neutru" }), plat, 0, 96, 0);
  assert.equal(r0.perechi, 0); assert.equal(r0.a, 0); assert.equal(r0.b, 0, "neutru, fără nicio mișcare: nimic cumpărat, nimic plătit");
  const zig = (ori) => Array.from({ length: 96 }, (_, i) => { const sus = i % 2 === 0, a = j.pret * (i < ori * 2 ? (sus ? 1.012 : 0.988) : 1), o = i === 0 ? j.pret : j.pret * (i - 1 < ori * 2 ? ((i - 1) % 2 === 0 ? 1.012 : 0.988) : 1); return { t: T0 + i * M15, o, h: Math.max(o, a), l: Math.min(o, a), c: a }; });
  const r5 = rezultatGrid(G, GP, Object.assign({}, j, { dir: "neutru" }), zig(5), 0, 96, 0), r20 = rezultatGrid(G, GP, Object.assign({}, j, { dir: "neutru" }), zig(20), 0, 96, 0);
  assert.ok(r5.perechi > 0 && r20.perechi > 2 * r5.perechi, "perechi: " + r5.perechi + " apoi " + r20.perechi);
  const cn = G.construieste({ pret: j.pret, lat: j.latime, dir: "neutru", pas: G.C.PAS_MIN, levier: 1 });   /* gridul neutru: alt interval decât al direcției din clasament */
  assert.equal(r20.grile, cn.grile); assert.ok(Math.abs(r20.a - cn.profitGrila * r20.perechi / cn.grile) < 1e-15, "A = " + r20.a); assert.ok(r20.a > 0); assert.equal(r20.lichidat, false);
  // funding-ul zilei intră în rezultatul total, nu în grilele încasate
  const jl = Object.assign({}, j, { dir: "long" }), f0 = rezultatGrid(G, GP, jl, zig(5), 0, 96, 0), f1 = rezultatGrid(G, GP, jl, zig(5), 0, 96, 0.003);
  assert.equal(f1.a, f0.a); assert.ok(f1.b < f0.b, "longul plătește funding-ul pozitiv: " + f1.b + " față de " + f0.b);
});
await test("(I-881) monedele-zi: o zi folosește doar lumânările ei de 15 minute și clasamentul de dinainte; viitorul stricat anume lasă clasele și rezultatele neschimbate, trecutul stricat le schimbă (proba e sensibilă)", () => {
  cuTop(3, () => {
    const tot = coinZile(G, GC, GP, DATE, { deLa: T0, zile: FEREASTRA }); assert.ok(tot.randuri.length >= 60, "monede-zi: " + tot.randuri.length); assert.equal(tot.sarite.faraBare15, 0);
    for (const d of [0, 4, 9]) { const t = T0 + d * ZI, curat = coinZile(G, GC, GP, DATE, { deLa: T0, zile: FEREASTRA, doarZilele: [d] }).randuri;
      assert.deepEqual(curat, tot.randuri.filter((r) => r.zi === ziIso(t)), "ziua " + d + " singură = ziua " + d + " din tot");
      const stricat = coinZile(G, GC, GP, stricaViitorul(DATE, t, t + ZI, mulberry32(d + 1)), { deLa: T0, zile: FEREASTRA, doarZilele: [d] }).randuri;
      assert.deepEqual(stricat, curat, "ziua " + d + ": viitorul stricat a schimbat ceva");
      const trecut = coinZile(G, GC, GP, stricaViitorul(DATE, t - 2 * ZI, t, mulberry32(d + 1)), { deLa: T0, zile: FEREASTRA, doarZilele: [d] }).randuri;
      assert.notDeepEqual(trecut, curat, "ziua " + d + ": stricarea zilei înseși ar fi trebuit să se vadă"); }
    // o zi cu lumânări de 15 minute lipsă nu se rulează și se numără
    const gol = JSON.parse(JSON.stringify(DATE)); gol.M2USDT.b15 = gol.M2USDT.b15.filter((x) => !(x.t >= T0 + 3 * ZI && x.t < T0 + 3 * ZI + 10 * M15));
    const g = coinZile(G, GC, GP, gol, { deLa: T0, zile: FEREASTRA, doarZilele: [3] }); assert.equal(g.sarite.faraBare15, 1); assert.ok(!g.randuri.some((r) => r.simbol === "M2USDT"));
  });
});
await test("(I-881) valorile pe blocuri de 5 zile se numără de la prima zi a ferestrei; A = ln(raportul mediilor), B = diferența; blocul cu prea puține monede-zi se sare", () => {
  const r = []; for (let d = 0; d < 10; d++) for (let i = 0; i < 30; i++) r.push({ zi: ziIso(T0 + d * ZI), simbol: "S" + i, clasa: i < 12 ? "top" : "rest", a: i < 12 ? (d < 5 ? 0.004 : 0.006) : 0.002, b: i < 12 ? 0.001 : -0.001 });
  const va = valoriBlocuri(r, "a", { deLa: T0 }), vb = valoriBlocuri(r, "b", { deLa: T0 });
  assert.equal(va.length, 2); assert.ok(Math.abs(va[0] - Math.log(2)) < 1e-12 && Math.abs(va[1] - Math.log(3)) < 1e-12, "A: " + va); assert.ok(vb.every((x) => Math.abs(x - 0.002) < 1e-15), "B: " + vb);
  // prima zi fără rânduri nu mută marginile blocurilor
  const fara0 = valoriBlocuri(r.filter((x) => x.zi !== ziIso(T0)), "a", { deLa: T0 }); assert.equal(fara0.length, 2); assert.ok(Math.abs(fara0[0] - Math.log(2)) < 1e-12, "primul bloc rămâne zilele 1–5 ale ferestrei (fără ziua lipsă), nu zilele 2–6: " + fara0[0]); assert.ok(Math.abs(fara0[1] - Math.log(3)) < 1e-12);
  const putine = valoriBlocuri(r.filter((x) => x.clasa === "rest" || x.simbol === "S0" || x.zi >= ziIso(T0 + 5 * ZI)), "a", { deLa: T0 }); assert.equal(putine.length, 1, "blocul cu 5 monede-zi „top” (sub 20) se sare");
  assert.equal(valoriBlocuri(r, "a", { deLa: T0, clasaDe: (x) => (x.clasa === "top" ? "rest" : "top") })[0], -va[0], "eticheta poate fi înlocuită (probele cu etichete la întâmplare)");
});
await test("(I-881) verdictele: DOVEDIT doar cu p sub prag ȘI mărimea cel puțin cea minimă; „există, dar mic” sub ea; „pe dos” când întrebarea inversă trece pragul; altfel nedovedit; sub 5 blocuri nemăsurat", () => {
  const cu = (m, z) => Array.from({ length: 40 }, (_, i) => m + (i % 2 ? z : -z));   /* alternanță ⇒ garda nu se aplică, t e cel simplu */
  assert.equal(verdictG1(cu(Math.log(1.5), 0.05), "a").verdict, "DOVEDIT"); assert.ok(Math.abs(verdictG1(cu(Math.log(1.5), 0.05), "a").marime - 1.5) < 1e-9);
  assert.equal(verdictG1(cu(Math.log(1.1), 0.02), "a").verdict, "EXISTĂ, DAR MIC"); assert.equal(verdictG1(cu(-Math.log(1.5), 0.05), "a").verdict, "PE DOS");
  assert.equal(verdictG1(cu(0.01, 0.2), "a").verdict, "NEDOVEDIT"); assert.equal(verdictG1([0.5, 0.5, 0.6, 0.4], "a").verdict, "NEMĂSURAT");
  assert.equal(verdictG1(cu(0.002, 0.0005), "b").verdict, "DOVEDIT"); assert.equal(verdictG1(cu(0.0002, 0.00005), "b").verdict, "EXISTĂ, DAR MIC"); assert.equal(verdictG1(cu(-0.002, 0.0005), "b").verdict, "PE DOS");
  // chiar la prag: un t care dă p puțin peste 0,05 ÷ 74 rămâne nedovedit, oricât de mare ar fi efectul
  const v = cu(Math.log(2), 1.32), V = verdictG1(v, "a"); assert.ok(V.p > G1.alfa && V.p < 0.01, "premisa: p = " + V.p); assert.equal(V.verdict, "NEDOVEDIT");
});
await test("(I-881) etichetele la întâmplare (P1) nu „dovedesc” nimic pe rezultate în care primele chiar sunt altfel; aceeași sămânță dă aceleași cifre; ordinea fixă (P2) ține aceleași monede sus în toate zilele", () => {
  const rnd0 = mulberry32(5), r = []; for (let d = 0; d < 60; d++) for (let i = 0; i < 30; i++) r.push({ zi: ziIso(T0 + d * ZI), simbol: "S" + i, clasa: i < 12 ? "top" : "rest", a: (i < 12 ? 0.006 : 0.003) * (0.5 + rnd0()), b: (rnd0() - 0.5) * 0.02 });
  assert.equal(verdictG1(valoriBlocuri(r, "a", { deLa: T0 }), "a").verdict, "DOVEDIT", "premisa: cu etichetele adevărate efectul se vede");
  const p1 = placebo(r, "zi", 300, mulberry32(11), { deLa: T0 }), p1b = placebo(r, "zi", 300, mulberry32(11), { deLa: T0 });
  assert.deepEqual(p1.a.resp25, p1b.a.resp25); assert.deepEqual(p1.a.t, p1b.a.t, "aceeași sămânță, aceleași cifre");
  assert.ok(p1.a.rata25 < 0.06 && p1.b.rata25 < 0.06, "P1 respinge " + p1.a.rata25 + " / " + p1.b.rata25 + " la 2,5% nominal"); assert.equal(p1.a.respAlfa, 0); assert.ok(p1.a.sd > 0 && p1.a.t.length === 300);
  // P2 ține aceleași monede sus în toate zilele: cu rezultate care țin doar de monedă (fără zgomot), fiecare bloc dă ACEEAȘI valoare (abaterea
  // valorilor pe blocuri e zero); cu etichete amestecate zilnic (P1), pe aceleași rezultate, blocurile diferă
  const fix = []; for (let d = 0; d < 60; d++) for (let i = 0; i < 30; i++) fix.push({ zi: ziIso(T0 + d * ZI), simbol: "S" + i, clasa: i < 12 ? "top" : "rest", a: 0.001 * (1 + i), b: 0.0001 * (i - 15) });
  const q2 = placebo(fix, "fix", 25, mulberry32(3), { deLa: T0 }), q1 = placebo(fix, "zi", 25, mulberry32(3), { deLa: T0 });
  assert.equal(q2.fel, "fix"); assert.ok(q2.a.sd < 1e-12 && q2.b.sd < 1e-15, "P2: aceleași monede sus în fiecare zi ⇒ fiecare bloc dă aceeași valoare (abaterea " + q2.a.sd + ")"); assert.ok(q1.a.sd > 1e-3, "P1: etichetele se schimbă de la o zi la alta (abaterea " + q1.a.sd + ")");
});
await test("(I-881) scriptul refuză cifra adevărată înaintea probelor de dinaintea ei (autenticitate, mărime, putere)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "g1-proba-")); try {
    const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "cercetare-v100342-candidati-grid.mjs"), "--ce=g1", "--cache=" + tmp], { encoding: "utf8", timeout: 60000 });
    assert.equal(r.status, 1, "codul de ieșire: " + r.status + " · " + String(r.stderr).slice(0, 200)); assert.match(r.stdout, /REFUZ: întâi --ce=g1h0/);
    assert.deepEqual(fs.readdirSync(tmp), [], "refuzul nu scrie nimic");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const S = citeste("scripts", "cercetare-v100342-candidati-grid.mjs");
  assert.match(S, /if \(!H\.valid\) \{ console\.log\("REFUZ:/); assert.match(S, /if \(H\.amprenta !== D\.amprenta\)/, "g1h0 făcut pe alte date nu deschide cifra");
  assert.doesNotMatch(S.slice(S.indexOf("function h0()"), S.indexOf("function g1()")), /verdictG1\(/, "pasul de dinaintea cifrei nu socotește verdictul adevărat");
});

await test("(I-881) explicația rețetei din Scan spune ce verifică filtrul (volumul) și ce s-a măsurat (ordinea după scor: nedovedit, cu un test care vedea doar diferențe mari); jurnalul are regulile, rezultatul, E2 fără verdict și îndreptările de după revizie", () => {
  const Scan = incarcaLib(["scan.js"], "Scan"), r = Scan.RETETE.find((x) => x.k === "grid"), J = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md");
  const iReg = J.indexOf("## G1 — „Candidați de grid”"), iRez = J.indexOf("### G1 — rezultatul"), iE2 = J.indexOf("### E2 — de văzut, fără verdict"); assert.ok(iReg > 0 && iRez > iReg && iE2 > iRez, "ordinea în jurnal: reguli, rezultat, E2");
  const iInd = J.indexOf("### G1 — îndreptări după revizia independentă"); assert.ok(iInd > iE2, "îndreptările de după revizie stau la coadă");
  const Rez = J.slice(iRez, iE2), Reg = J.slice(iReg, iRez), Ind = J.slice(iInd);
  assert.doesNotMatch(Rez, /ar\s+fi ieșit aproape sigur și n-a ieșit|A putea vedea sigur/, "afirmația falsă despre putere a fost scoasă din rezultat"); assert.match(Rez, /Amândouă testele au fost, deci, aproape oarbe/); assert.match(Rez, /10 monede-zi au fost lichidări/);
  for (const cer of [/Premisa greșită: G1 n-a măsurat rețeta din Scan/, /Tăietura după volum a rețetei rămâne nemăsurată/, /Puterea era socotită greșit/, /Poarta P1 e prea blândă/, /nu se citește fără o poartă pe etichete statornice/, /Ce rămâne în picioare/]) assert.match(Ind, cer, "din îndreptări lipsește " + cer);
  assert.match(Rez, /\| A — grilele încasate, din sumă pe zi \| 0,468% \| 0,447% \| ×1,05 \|[^\n]*\*\*NEDOVEDIT\*\* \|/); assert.match(Rez, /\| B — rezultatul total, din sumă pe zi \| −0,286% \| −0,646% \| \+0,341% pe zi \|[^\n]*\*\*NEDOVEDIT\*\* \|/);
  // textul paginii = formulele pentru NEDOVEDIT scrise în reguli, înaintea cifrei
  assert.match(Reg, /A NEDOVEDIT: „Că primele încasează mai multe\s+grile decât ceilalți candidați e nedovedit \(măsurat pe 200 de zile\)\.”/); assert.match(Reg, /cu tot cu poziția rămasă deschisă: dovedit \(\+…% pe zi\) \/ diferență prea\s+mică \/ nedovedit \/ pe dos/);
  assert.match(r.e, /dintre primele 60 după volum\. Lista le ordonează după scorul de grid: cât ar aduce un grid pe zi/, "filtrul = volumul; ordinea = scorul");
  assert.match(r.e, /Că ordinea după scor ar conta e nedovedit: măsurat pe 200 de zile \(14\.11\.2026\), cu un grid de o zi fără levier, cele din frunte n-au ieșit dovedit mai bune decât celelalte candidate, nici la grilele încasate, nici la rezultatul de după o zi\. Măsurătoarea vedea doar diferențe mari\. Tăietura după volum(: măsurată pe 400 de zile de lumânări, nedovedit că ar conta| nu e măsurată)/); /* v100.343: G2-V a măsurat-o */
  assert.doesNotMatch(r.e, /dovedit că nu|mai bine decât restul|primele 60 din clasamentul|rămâi cu mai mulți bani|Aceleași ca pe Home/, "nici mai mult decât a ieșit, nici premisa greșită"); assert.match(r.e, /după o mișcare mare/, "singura regulă dovedită rămâne spusă");
  assert.equal(r.t, "🟦 Candidați de grid"); assert.equal(r.sub, "fără mișcare mare", "numele și filtrul nu se schimbă după G1");
  // rândul „În trecut” de sub explicație nu o contrazice: pagina nu reface singură clasamentul, măsurătoarea s-a făcut separat
  const SE = citeste("public", "lib", "scan-ecran.js"); assert.doesNotMatch(SE, /gridul nu se poate măsura în urmă/); assert.match(SE, /pagina nu poate reface singură clasamentul de grid al fiecărei zile[^<]*Măsurătoarea de mai sus s-a făcut separat, o singură dată\./);
  // E2 e descriere: n-are verdict și spune ce NU spune
  const E2 = J.slice(iE2, iInd); assert.match(E2, /restul \(B − A\)\*/); assert.match(E2, /Zece monede-zi sunt lichidări/); assert.match(E2, /Media e trasă în jos de felul în care s-a ales universul/); assert.match(E2, /Nu e un test/); assert.match(E2, /Nu spune că un bot grid pierde bani/); assert.doesNotMatch(E2, /DOVEDIT|VERDICT/); assert.match(J, /\| E2 \| 14\.11\.2026 \|[^\n]*\| 0 \|/);
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
